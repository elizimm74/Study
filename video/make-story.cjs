// Makes a finished vertical video from a story file.
//   node video/make-story.cjs <story-name>              -> video/out/<story-name>.mp4 (with a generated beat)
//   node video/make-story.cjs <story-name> --preview    -> a few still pictures in video/preview/ (fast check)
// Stories live in video/stories/<name>.json. See docs/content-plan.md for how to write one.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { buildTimeline } = require("./story-core.js");

const name = process.argv[2];
if (!name) {
  console.log("Usage: node video/make-story.cjs <story-name> [--preview]");
  console.log("Stories:", fs.readdirSync(path.join(__dirname, "stories")).map((f) => f.replace(".json", "")).join(", "));
  process.exit(1);
}
const storyFile = path.join(__dirname, "stories", `${name}.json`);
if (!fs.existsSync(storyFile)) throw new Error(`No story called "${name}". Looked for ${storyFile}`);
const story = JSON.parse(fs.readFileSync(storyFile, "utf8"));
const brand = JSON.parse(fs.readFileSync(path.join(__dirname, "brand.json"), "utf8"));
story.brand = { ...brand, ...(story.brand || {}) };
story.fps = Number(process.env.FPS || 30);
const tl = buildTimeline(story);
const out = path.join(__dirname, "out");
fs.mkdirSync(out, { recursive: true });
// Your own photos and clips (video/media/...): check they exist, and cut clips into numbered pictures.
const VIDEO = /\.(mp4|mov|m4v|webm|mkv)$/i;
tl.lines.forEach((line, i) => {
  if (!line.media) return;
  const m = typeof line.media === "string" ? { src: line.media } : line.media;
  const file = path.join(__dirname, m.src);
  if (!fs.existsSync(file)) throw new Error(`Line ${i + 1} uses "${m.src}" but that file doesn't exist. Put it in video/media/ (see video/media/README.md).`);
  if (VIDEO.test(m.src)) {
    const dir = path.join(out, "frames", name, String(i));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const secs = Math.max(0.5, line.end - line.start);
    const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(m.start || 0), "-t", String(secs), "-i", file, "-vf", `fps=${story.fps},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`, "-q:v", "3", path.join(dir, "f%05d.jpg")], { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`ffmpeg couldn't read "${m.src}"`);
    story.lines[i].media = { kind: "frames", dir: `out/frames/${name}/${i}`, count: fs.readdirSync(dir).length };
  } else {
    story.lines[i].media = { kind: "image", src: m.src };
  }
  if (m.credit) story.lines[i].source = m.credit; // shown small on screen (credit the photographer / site)
});
const withStory = path.join(out, `${name}.story.json`);
fs.writeFileSync(withStory, JSON.stringify(story));
console.log(`${name}: ${tl.lines.length} lines, ${tl.duration}s`);

const env = { ...process.env, PAGE: "story.html", W: "1080", H: "1920", FPS: process.env.FPS || "30", STORY: withStory };
if (process.argv.includes("--preview")) {
  const mid = tl.lines.map((l) => ((l.start + l.end) / 2).toFixed(2));
  env.TIMES = [...mid, (tl.bodyEnd + 1.2).toFixed(2)].join(",");
  env.PREVIEW_NAME = name;
  const r = spawnSync("node", [path.join(__dirname, "render.cjs"), "--preview"], { stdio: "inherit", env });
  process.exit(r.status ?? 1);
}

// 1) the beat (timed to this story: it drops where the first line finishes)
const wav = path.join(out, `${name}.wav`);
const drop = story.drop != null ? story.drop : Math.min(3, tl.lines[0].end);
const m = spawnSync("python3", [path.join(__dirname, "music.py"), String(tl.duration), story.style || "hype", String(drop), String(tl.bodyEnd), wav], { stdio: "inherit" });
if (m.status !== 0) throw new Error("music.py failed (needs python3 with numpy)");
// 2) record the pictures and join them with the beat
env.AUDIO = wav;
env.OUT = path.join(out, `${name}.mp4`);
env.ABS_AUDIO = "1";
const r = spawnSync("node", [path.join(__dirname, "render.cjs")], { stdio: "inherit", env });
process.exit(r.status ?? 1);

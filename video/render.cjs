// Records video/launch.html into an .mp4, frame by frame.
//   node video/render.cjs                 -> video/crawler-launch.mp4 (60 frames per second)
//   node video/render.cjs --preview       -> a few still frames in video/preview/ (quick check)
// How: a hidden browser opens the page, we call window.seek(time) for each frame,
// take a picture, and ffmpeg turns the pictures into the video.
// Needs: playwright (already in this project) and ffmpeg on your computer.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Which page to record, and how. Defaults = the launch video. For the vertical edit:
//   PAGE=edit.html W=1080 H=1920 FPS=30 AUDIO=edit-audio.wav OUT=crawler-edit.mp4 node video/render.cjs
const FPS = Number(process.env.FPS || 60);
const W = Number(process.env.W || 1920);
const H = Number(process.env.H || 1080);
const PAGE = process.env.PAGE || "launch.html";
const page_url = "file://" + path.join(__dirname, PAGE);
const audio = process.env.AUDIO ? path.resolve(process.env.AUDIO) : path.join(__dirname, "soundtrack.wav");
const outFile = process.env.OUT ? path.resolve(__dirname, process.env.OUT) : path.join(__dirname, "crawler-launch.mp4");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  // A story video: hand the story to the page before it loads (see make-story.cjs).
  if (process.env.STORY) await page.addInitScript((story) => (window.STORY = story), JSON.parse(fs.readFileSync(process.env.STORY, "utf8")));
  await page.goto(page_url);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  // Make sure every font is really loaded before the first frame.
  await page.evaluate(async () => {
    await Promise.all(["900 40px Archivo", "400 40px Geist", "500 40px Geist", "600 40px Geist", '400 40px "Geist Mono"'].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  });
  // Stop early with a clear message if the page's script has an error.
  if (!(await page.evaluate(() => typeof window.seek === "function"))) throw new Error(PAGE + " has a script error (window.seek is missing). Open it in a browser and check the console.");
  const duration = await page.evaluate(() => window.DURATION);
  const stage = page.locator("#stage");

  if (process.argv.includes("--preview")) {
    const dir = path.join(__dirname, "preview", process.env.PREVIEW_NAME || PAGE.replace(".html", ""));
    fs.mkdirSync(dir, { recursive: true });
    const times = (process.env.TIMES || "").split(",").filter(Boolean).map(Number);
    const list = times.length ? times : Array.from({ length: Math.ceil(duration / 0.5) }, (_, i) => i * 0.5);
    for (const t of list) {
      await page.evaluate((t) => window.seek(t), t);
      await page.evaluate(() => (window.whenReady ? window.whenReady() : null)); // wait for photos / clip frames
      await stage.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(5, "0")}.jpg`), type: "jpeg", quality: 80 });
    }
    console.log(`${list.length} preview frames in ${dir}`);
    await browser.close();
    return;
  }

  // 1) Save every frame as a picture in a temporary folder.
  const total = Math.round(duration * FPS);
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), "crawler-frames-"));
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    await page.evaluate(() => (window.whenReady ? window.whenReady() : null)); // wait for photos / clip frames
    await stage.screenshot({ path: path.join(frames, `f${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 95 });
    if (f % 300 === 0) console.log(`frame ${f}/${total} (${Math.round((Date.now() - started) / 1000)}s)`);
  }
  // 2) ffmpeg turns the pictures (+ the soundtrack, if it exists) into the video.
  const args = ["-y", "-v", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%05d.jpg")];
  if (fs.existsSync(audio)) args.push("-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest");
  args.push("-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile);
  const code = await new Promise((r) => spawn("ffmpeg", args, { stdio: "inherit" }).on("close", r));
  fs.rmSync(frames, { recursive: true, force: true }); // tidy up the pictures
  if (code !== 0) throw new Error("ffmpeg failed");
  await browser.close();
  console.log(`done: ${outFile}`);
})();

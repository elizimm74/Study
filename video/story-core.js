// The timing brain for "story" videos. It works out WHEN every word appears.
// Used by the video page (in the browser) and by make-story.cjs (in Node, to know how long
// the video is before recording it), so the two can never disagree.
//
// A story line looks like:  { "text": "Nobody *buys*.", "visual": "bars" }
//   *word* = emphasized (shown in the accent color)
// Timing: every word takes 1 / wps seconds; sentences end with a short pause.
(function (root) {
  function buildTimeline(story) {
    const wps = story.wps || 3;
    const intro = story.intro != null ? story.intro : 0.35;
    const endCard = story.endCard != null ? story.endCard : 2.8;
    let t = intro;
    const lines = [];
    for (const line of story.lines) {
      const start = t;
      const words = [];
      let inEmph = false;
      for (const tok of line.text.trim().split(/\s+/)) {
        if (tok.startsWith("*")) inEmph = true;
        const clean = tok.replace(/\*/g, "");
        words.push({ w: clean, start: t, emph: inEmph });
        if (/\*[.,!?:;]*$/.test(tok)) inEmph = false;
        t += (1 / wps) * (clean.replace(/[^\w]/g, "").length > 8 ? 1.15 : 1);
        if (/[.!?]$/.test(clean)) t += 0.28;
        else if (/[,:;]$/.test(clean)) t += 0.1;
      }
      t += line.hold != null ? line.hold : 0.35;
      lines.push(Object.assign({}, line, { start: start, end: t, words: words }));
    }
    return { lines: lines, bodyEnd: t, duration: Math.round((t + endCard) * 100) / 100 };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { buildTimeline: buildTimeline };
  else root.buildTimeline = buildTimeline;
})(typeof window !== "undefined" ? window : globalThis);

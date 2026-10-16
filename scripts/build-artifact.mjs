// Inlines the Vite build into one HTML page for publishing as a claude.ai Artifact, with the
// songs as files beside it: together they outgrow one page (16 MB), so each inline song is moved
// to dist/music/<hash>.mp4 and the page fetches it by that relative path (engine.ts songBytes).
// Sound effects are tiny and decoded straight from their data URLs, so they stay inline.
// Publish the page with those files: dist/artifact-files.json maps each published path to its file.
// Usage: npm run build:artifact  →  dist/sway-tower.html + dist/music/*.mp4
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const assets = readdirSync("dist/assets");
const read = (ext) => {
  const file = assets.find((f) => f.endsWith(ext));
  if (!file) throw new Error(`no ${ext} in dist/assets; run vite build first`);
  return readFileSync(`dist/assets/${file}`, "utf8");
};
let js = read(".js");

rmSync("dist/music", { recursive: true, force: true });
mkdirSync("dist/music");
/** Inline audio at least this big is a song (the longest effect is about 20 kB). */
const SONG_BYTES = 256 * 1024;
const files = {};
js = js.replace(/data:(?:audio|video)\/mp4;base64,[A-Za-z0-9+/=]+/g, (url) => {
  const data = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  if (data.length < SONG_BYTES) return url;
  const path = `music/${createHash("sha256").update(data).digest("hex").slice(0, 12)}.mp4`;
  writeFileSync(`dist/${path}`, data);
  files[path] = `dist/${path}`;
  return path;
});
writeFileSync("dist/artifact-files.json", JSON.stringify(files, null, 2));
const css = read(".css");
if (js.includes("</script")) throw new Error("bundle contains </script; cannot inline safely");

const page = `<title>Sway Tower</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#14161f">
<style>
/* Single dark look: the game paints its own night scene on every host theme. */
:root { --bg: #14161f; color-scheme: dark; }
html, body { height: 100%; margin: 0; background: var(--bg); overflow: hidden; overscroll-behavior: none; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
${css}
</style>
<canvas id="game"></canvas>
<script type="module">
${js}
</script>
`;
writeFileSync("dist/sway-tower.html", page);
console.log(`dist/sway-tower.html  ${(page.length / 1024).toFixed(1)} kB, ${Object.keys(files).length} songs in dist/music`);

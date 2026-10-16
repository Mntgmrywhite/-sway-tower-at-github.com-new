// Inlines the Vite build into one HTML page for publishing as a claude.ai Artifact.
// Usage: npm run build:artifact  →  dist/sway-tower.html
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const assets = readdirSync("dist/assets");
const read = (ext) => {
  const file = assets.find((f) => f.endsWith(ext));
  if (!file) throw new Error(`no ${ext} in dist/assets; run vite build first`);
  return readFileSync(`dist/assets/${file}`, "utf8");
};
const js = read(".js");
const css = read(".css");
if (js.includes("</script")) throw new Error("bundle contains </script; cannot inline safely");

const page = `<title>Sway Tower</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#14161f">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Monoton&family=Orbitron:wght@600;700&display=swap">
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
console.log(`dist/sway-tower.html  ${(page.length / 1024).toFixed(1)} kB`);

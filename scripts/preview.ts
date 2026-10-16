// Renders a skin offscreen to PNGs so you can look at it without a browser.
//   npm run snap -- <skinId> [width] [height] [songTime]
// Writes preview/<skin>-<shot>.png for every shot in src/preview/shots.ts (Normal's start, climb,
// high, over; Hard's hard, hardClimb, hardZoom, hardLean, topple, toppled), framed for that screen
// size, and preview/<skin>-bars.png. With a songTime (seconds into the skin's music loop), the
// shots are drawn as if the music were that far in, for scenery that keeps time with it.
// Web fonts aren't available offline, so text uses fallback faces here.
import { mkdirSync, writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { kitFor } from "../src/base/style";
import { shots } from "../src/preview/shots";
import { render } from "../src/render";
import { SKINS } from "../src/skins";

const [id = "neon", wArg = "390", hArg = "844", songArg = "NaN"] = process.argv.slice(2);
const skin = SKINS.find((s) => s.id === id);
if (!skin) {
  console.error(`Unknown skin "${id}". Known: ${SKINS.map((s) => s.id).join(", ")}`);
  process.exit(1);
}
const W = Number(wArg);
const H = Number(hArg);
const DPR = 2;
const songTime = Number(songArg);
mkdirSync("preview", { recursive: true });

for (const shot of shots({ w: W, h: H })) {
  const canvas = createCanvas(W * DPR, H * DPR);
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);
  render(ctx as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, skin, songTime);
  const file = `preview/${skin.id}-${shot.name}.png`;
  writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(file);
}

// Every bar in the cycle, large, so symbols and edges can be inspected.
const barH = 44;
const sheet = createCanvas(W * DPR, (skin.bars.length * (barH + 14) + 20) * DPR);
const sctx = sheet.getContext("2d");
sctx.scale(DPR, DPR);
sctx.fillStyle = skin.style === "neon" ? "#06020c" : "#6a62c8";
sctx.fillRect(0, 0, W, skin.bars.length * (barH + 14) + 20);
skin.bars.forEach((_, i) => {
  const w = i % 3 === 2 ? W * 0.35 : W - 40; // some narrow ones too
  kitFor(skin).bar(sctx as unknown as CanvasRenderingContext2D, 20, 10 + i * (barH + 14), w, barH, i);
});
const sheetFile = `preview/${skin.id}-bars.png`;
writeFileSync(sheetFile, sheet.toBuffer("image/png"));
console.log(sheetFile);

// Draws the iOS app icon and launch image from the game's own Classic art (bars, clouds,
// sandstone, sky), so they match the game.
//   npm run ios:art
// Writes ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024², opaque, as
// the App Store requires) and Splash.imageset/splash.png (2732², shown aspect-fill).
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { drawBar } from "../src/base/blocks";
import { circle, outlined, outlinedText, roundRectPath, type Ctx } from "../src/base/draw";
import { puffs } from "../src/base/world";
import { classic } from "../src/skins/classic";
import { INK, PALETTE, STONE, STONE_LIGHT, STONE_SHADE } from "../src/skins/classic/colors";

const ASSETS = "ios/App/App/Assets.xcassets";
/** The page's own background (index.html), so the launch image hands over to it without a flash. */
const PAGE_BG = "#14161f";

GlobalFonts.registerFromPath("node_modules/@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff", "Luckiest Guy");

/** PNG with no alpha channel (color type 2): App Store icons must be opaque. */
function opaquePng(ctx: SKRSContext2D, w: number, h: number): Buffer {
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw.set([rgba[i]!, rgba[i + 1]!, rgba[i + 2]!], row + 1 + x * 3);
    }
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * The emblem on a 1024 square: Classic sky and clouds, the sandstone keep, and a stack of
 * heraldic bars bending with the sway, the top one sliding in.
 */
function emblem(ctx: Ctx): void {
  const S = 1024;
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);

  // The sun in the corner and cloud piles at the sides.
  ctx.beginPath();
  circle(ctx, 150, 150, 80);
  outlined(ctx, "#ffd23f", 12, "#f2a93b");
  puffs(ctx, PALETTE, [
    { x: 40, y: 760, r: 150 },
    { x: 190, y: 830, r: 120 },
    { x: 990, y: 700, r: 160 },
    { x: 860, y: 820, r: 120 },
  ]);

  // The keep: sandstone with merlons, under the tower.
  const keepTop = 810;
  const kx = 250;
  const kw = 524;
  ctx.beginPath();
  ctx.rect(kx, keepTop, kw, S - keepTop + 20);
  outlined(ctx, STONE, 12, INK);
  ctx.fillStyle = STONE_LIGHT;
  ctx.fillRect(kx + 8, keepTop + 6, kw - 16, 22);
  ctx.fillStyle = STONE_SHADE;
  for (let row = 0; row < 3; row++) {
    const y = keepTop + 70 + row * 64;
    ctx.fillRect(kx + 6, y, kw - 12, 8);
    for (let k = 0; k < 4; k++) ctx.fillRect(kx + 60 + ((row % 2) * 64) + k * 128, y - 56, 8, 56);
  }
  for (let m = 0; m < 5; m++) {
    const mx = kx - 16 + m * ((kw + 32 - 84) / 4);
    ctx.beginPath();
    roundRectPath(ctx, mx, keepTop - 56, 84, 64, 8);
    outlined(ctx, STONE, 12, INK);
  }

  // The tower: bars bend away from the base, like the sway at the top of a tall stack.
  const barH = 100;
  const barW = 420;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const cx = S / 2 + 90 * f * f;
    const cy = keepTop - 64 - barH * (i + 0.5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.07 * f * f);
    drawBar(ctx, -barW / 2, -barH / 2, barW, barH, i, classic);
    ctx.restore();
  }

  // Speed lines behind the top bar: it's still sliding.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  const topY = keepTop - 64 - barH * (n - 0.5);
  for (const [dy, len] of [
    [-26, 120],
    [8, 170],
    [40, 100],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(S / 2 + 90 - barW / 2 - 40 - len, topY + dy);
    ctx.lineTo(S / 2 + 90 - barW / 2 - 40, topY + dy);
    ctx.stroke();
  }
}

// App icon: the emblem, full bleed (iOS rounds the corners).
{
  const S = 1024;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext("2d");
  emblem(ctx as unknown as Ctx);
  const file = `${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`;
  writeFileSync(file, opaquePng(ctx, S, S));
  console.log(file);
}

// Launch image: the emblem as a rounded tile and the title on the page's dark background,
// centered so a phone's aspect-fill crop keeps them.
{
  const S = 2732;
  const tile = 760;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, S, S);
  const x = (S - tile) / 2;
  const y = (S - tile) / 2 - 140;
  ctx.save();
  roundRectPath(ctx as unknown as Ctx, x, y, tile, tile, tile * 0.22);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(tile / 1024, tile / 1024);
  emblem(ctx as unknown as Ctx);
  ctx.restore();
  ctx.font = "150px 'Luckiest Guy'";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  outlinedText(ctx as unknown as Ctx, "SWAY TOWER", S / 2, y + tile + 230, classic.hud.title, INK, 30);
  const file = `${ASSETS}/Splash.imageset/splash.png`;
  writeFileSync(file, opaquePng(ctx, S, S));
  console.log(file);
}

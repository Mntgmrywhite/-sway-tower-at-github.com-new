// Draws the iOS app icon and launch image from the game's own Classic art (Sky Islands: the
// day sky, the sun, clouds, the home island and the bars), so they match the game.
//   npm run ios:art
// Writes ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024², opaque, as
// the App Store requires) and Splash.imageset/splash.png (2732², shown aspect-fill).
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { drawBar } from "../src/base/blocks";
import { ink, outlinedText, roundRectPath, type Ctx } from "../src/base/draw";
import { puffs } from "../src/base/world";
import { classic } from "../src/skins/classic";
import { INK, PALETTE } from "../src/skins/classic/colors";
import { BANDS, CAP_H, GRASS_DROP, TREE_X, UNDER_D, UNDER_HW, cap, plinth, roots, tree, vines } from "../src/skins/classic/island";
import { strata, undersidePath } from "../src/skins/classic/shapes";
import { sun, sunAt } from "../src/skins/classic/sky";
import { toneOf } from "../src/skins/classic/tone";
import type { Scene } from "../src/skins/skin";

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

/** The emblem's square, and where the game's art sits in it. */
const S = 1024;
/** The island's size unit (the game's `u`): its cap is 0.66 u wide. */
const U = 1180;
/** The floor line the base bar stands on (the top of the island's plinth). */
const FLOOR = 630;
/** The bars: wide and tall, so the stack reads at 60 pt. */
const BAR_W = 420;
const BAR_H = 100;
const BARS = 4;
/**
 * Ink on the island. In the game its ink (u * 0.0058) matches the bars'; the emblem's bars are
 * bigger next to the island than the game's, so the island takes their ink weight instead,
 * which also keeps its outline, roots and vines from fading out at 29 pt.
 */
const ISLAND_INK = 10;
/**
 * The sun, top left: center and disc radius (its flat halo reaches 1.42 r). Its halo clears
 * the corner mask and the top bar's speed lines by about 30 px, so they don't merge when small.
 */
const SUN = { x: 160, y: 146, r: 62 };

/** The game's scene, built so the home island stands under the emblem's base bar. */
const scene: Scene = {
  cssW: S,
  cssH: S,
  u: U,
  scale: 1,
  t: 0,
  rise: 0,
  altitude: 0,
  groundY: FLOOR,
  horizonY: FLOOR,
  baseX: (S - BAR_W) / 2,
  baseW: BAR_W,
};

/** The game's day sun (Classic's own colors and shading), centered at (x, y) with radius r. */
function daySun(ctx: Ctx, x: number, y: number, r: number): void {
  const tone = toneOf(scene);
  const s = { ...scene, u: scene.u * (r / sunAt(scene, tone, 0).r) };
  const at = sunAt(s, tone, 0);
  ctx.save();
  ctx.translate(x - at.x, y - at.y);
  sun(ctx, s, tone, 0);
  ctx.restore();
}

/**
 * The game's home island, assembled from its own pieces like `islandBody`, with the bars' ink
 * weight: roots, the striped underside, vines over the lip, the grass cap, the little tree
 * and the stone plinth. No pebbles: they turn to specks on the home screen.
 */
function floatingIsland(ctx: Ctx, s: Scene, lw: number): void {
  const u = s.u;
  const cx = S / 2;
  const grassTop = s.groundY + u * GRASS_DROP;
  const underTop = grassTop + u * CAP_H * 0.7;
  const hw = u * UNDER_HW;
  const d = u * UNDER_D;
  roots(ctx, s, cx, underTop, hw, d, lw);
  undersidePath(ctx, cx, underTop, hw, d);
  ctx.save();
  ctx.clip();
  strata(ctx, cx, underTop, hw, d, BANDS);
  ctx.restore();
  undersidePath(ctx, cx, underTop, hw, d);
  ink(ctx, lw, INK);
  vines(ctx, s, cx, grassTop + u * CAP_H, lw);
  cap(ctx, s, cx, grassTop, lw);
  tree(ctx, s, cx + u * TREE_X, s.groundY + u * (GRASS_DROP + 0.004), lw);
  plinth(ctx, s, cx, lw);
}

/**
 * The emblem on a 1024 square: Classic's day sky with the sun and clouds, the home island
 * floating in it with its striped underside and roots, and a stack of Classic bars on it
 * bending with the sway, the top one sliding in.
 */
function emblem(ctx: Ctx): void {
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);

  daySun(ctx, SUN.x, SUN.y, SUN.r);
  // Clouds piled low at the sides, behind the island.
  puffs(ctx, PALETTE, [
    { x: 20, y: 800, r: 150 },
    { x: 170, y: 880, r: 110 },
    { x: 1010, y: 760, r: 150 },
    { x: 870, y: 870, r: 115 },
  ]);

  floatingIsland(ctx, scene, ISLAND_INK);

  // The tower: bars bend away from the base, like the sway at the top of a tall stack.
  const tail = { x: 0, y: 0 };
  for (let i = 0; i < BARS; i++) {
    const f = i / (BARS - 1);
    const cx = S / 2 + 90 * f * f;
    const cy = FLOOR - BAR_H * (i + 0.5);
    const a = 0.07 * f * f;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    drawBar(ctx, -BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, i, classic);
    ctx.restore();
    // The middle of the bar's left end.
    tail.x = cx - (Math.cos(a) * BAR_W) / 2;
    tail.y = cy - (Math.sin(a) * BAR_W) / 2;
  }

  // Speed lines trailing the top bar's left end: it's still sliding.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  for (const [dy, len] of [
    [-32, 100],
    [0, 150],
    [32, 100],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(tail.x - 40 - len, tail.y + dy);
    ctx.lineTo(tail.x - 40, tail.y + dy);
    ctx.stroke();
  }
}

// App icon: the emblem, full bleed (iOS rounds the corners).
{
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
  const P = 2732;
  const tile = 760;
  const canvas = createCanvas(P, P);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, P, P);
  const x = (P - tile) / 2;
  const y = (P - tile) / 2 - 140;
  ctx.save();
  roundRectPath(ctx as unknown as Ctx, x, y, tile, tile, tile * 0.22);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(tile / S, tile / S);
  emblem(ctx as unknown as Ctx);
  ctx.restore();
  ctx.font = "150px 'Luckiest Guy'";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  outlinedText(ctx as unknown as Ctx, "SWAY TOWER", P / 2, y + tile + 230, classic.hud.title, INK, 30);
  const file = `${ASSETS}/Splash.imageset/splash.png`;
  writeFileSync(file, opaquePng(ctx, P, P));
  console.log(file);
}

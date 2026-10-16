import { alpha, mix, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { BLUE, GREEN, INK, MEADOW, ORANGE, PURPLE, RED, WOOD, YELLOW, type Shades } from "./colors";
import { inkW } from "./fort";
import { heartPath } from "./icons";
import { starPath } from "./sky";
import { block, inkedBlock } from "./shapes";

// The near edge we look over: a wooden shelf with big letter blocks standing on it, A B C on the
// left and 1 2 3 on the right (more, with hearts and stars, on wide screens), inked like
// everything up close. It covers the base band and drops away faster than the tower as the
// camera climbs (parallax 1.6, like the band), so it only frames the start. The middle of the
// shelf stays clear: render.ts writes "tap to drop" there at the start (at 0.9 of the screen
// height), which on a short phone falls right across the row and on a tall one across its foot.
// Each side always fits exactly: whole blocks, evenly spaced.

/** Block size and the smallest gap between blocks, in u (each side stretches the gap to fit). */
const CUBE = 0.092;
const GAP = 0.012;
/** Half the width kept clear in the middle of the shelf, in u ("tap to drop" is about 0.29 u wide). */
const SHELF_CLEAR = 0.17;
/** How far the shelf's top sits below the base band's top edge, in u. */
const SHELF = 0.04;

const COLORS: readonly Shades[] = [RED, YELLOW, BLUE, GREEN, ORANGE, PURPLE];
/** Symbols in their ink, a little darker than the block (like the bars' symbols). */
const SYMBOL = COLORS.map((c) => alpha(mix(INK, c.body, 0.15), 0.72));

type Glyph = (ctx: Ctx, x: number, y: number, s: number) => void;

/** Letters and numbers as strokes, symbols as fills, centered on (x, y), about s tall. */
const A: Glyph = (ctx, x, y, s) => {
  ctx.moveTo(x - s * 0.32, y + s * 0.42);
  ctx.lineTo(x, y - s * 0.42);
  ctx.lineTo(x + s * 0.32, y + s * 0.42);
  ctx.moveTo(x - s * 0.18, y + s * 0.12);
  ctx.lineTo(x + s * 0.18, y + s * 0.12);
};
const B: Glyph = (ctx, x, y, s) => {
  const l = x - s * 0.24;
  ctx.moveTo(l, y + s * 0.42);
  ctx.lineTo(l, y - s * 0.42);
  ctx.lineTo(x + s * 0.06, y - s * 0.42);
  ctx.arc(x + s * 0.06, y - s * 0.21, s * 0.21, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(l, y);
  ctx.moveTo(x + s * 0.08, y);
  ctx.arc(x + s * 0.08, y + s * 0.21, s * 0.21, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(l, y + s * 0.42);
};
const C: Glyph = (ctx, x, y, s) => {
  const a = 0.85;
  ctx.moveTo(x + Math.cos(-a) * s * 0.36, y + Math.sin(-a) * s * 0.42);
  ctx.ellipse(x, y, s * 0.36, s * 0.42, 0, -a, a, true);
};
const ONE: Glyph = (ctx, x, y, s) => {
  ctx.moveTo(x - s * 0.16, y - s * 0.26);
  ctx.lineTo(x + s * 0.04, y - s * 0.42);
  ctx.lineTo(x + s * 0.04, y + s * 0.42);
  ctx.moveTo(x - s * 0.16, y + s * 0.42);
  ctx.lineTo(x + s * 0.24, y + s * 0.42);
};
const TWO: Glyph = (ctx, x, y, s) => {
  ctx.moveTo(x - s * 0.28, y - s * 0.2);
  ctx.arc(x, y - s * 0.16, s * 0.28, Math.PI * 1.1, Math.PI * 0.2);
  ctx.lineTo(x - s * 0.28, y + s * 0.42);
  ctx.lineTo(x + s * 0.3, y + s * 0.42);
};
const THREE: Glyph = (ctx, x, y, s) => {
  ctx.moveTo(x - s * 0.26, y - s * 0.3);
  ctx.arc(x, y - s * 0.2, s * 0.22, Math.PI * 1.15, Math.PI * 0.5);
  ctx.moveTo(x - s * 0.06, y + s * 0.02);
  ctx.arc(x, y + s * 0.2, s * 0.22, -Math.PI * 0.5, Math.PI * 0.85);
};
const HEART: Glyph = (ctx, x, y, s) => heartPath(ctx, x, y, s * 0.95);
const STAR: Glyph = (ctx, x, y, s) => starPath(ctx, x, y + s * 0.04, s * 0.48);

/** The symbols on each side, from the left, and whether each is filled (else stroked). */
const LEFT: readonly (readonly [Glyph, boolean])[] = [
  [A, false],
  [B, false],
  [C, false],
  [HEART, true],
  [STAR, true],
];
const RIGHT: readonly (readonly [Glyph, boolean])[] = [
  [ONE, false],
  [TWO, false],
  [THREE, false],
  [STAR, true],
  [HEART, true],
];

/** The shelf's top edge on screen (it moves with the base band). */
function shelfTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * (0.36 + SHELF);
}

/** The top of the letter blocks: props behind the shelf stay above this. */
export function blocksTop(s: Scene): number {
  return shelfTop(s) - s.u * CUBE;
}

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const shelf = shelfTop(s);
  const top = shelf - u * CUBE;
  if (top - u * 0.01 > s.cssH) return;
  const lw = inkW(s);
  // Behind the blocks: the meadow, over the base band's grass tips.
  ctx.fillStyle = MEADOW;
  ctx.fillRect(0, shelf - u * 0.075, s.cssW, u * 0.08);
  // The shelf: a lit top edge over the wooden front, with a groove or two of grain.
  ctx.fillStyle = WOOD.body;
  ctx.fillRect(0, shelf, s.cssW, s.cssH - shelf);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(0, shelf, s.cssW, u * 0.014);
  ctx.fillStyle = WOOD.shade;
  ctx.beginPath();
  // Plank seams down to the bottom of the screen (three on a phone; more on Hard's zoomed-out view).
  for (let k = 1, y = shelf + u * 0.09; y < s.cssH; k++, y = shelf + u * (0.02 + 0.07 * k)) ctx.rect(0, y, s.cssW, Math.max(1, u * 0.004));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, shelf);
  ctx.lineTo(s.cssW, shelf);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // The blocks: whole and evenly spaced on each side, the middle left clear.
  const c = CUBE * u;
  const side = s.cssW / 2 - SHELF_CLEAR * u;
  const n = Math.max(1, Math.floor((side - GAP * u) / (c + GAP * u)));
  const gap = (side - n * c) / (n + 1);
  const right = s.cssW / 2 + SHELF_CLEAR * u;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < n; i++) {
    letterBlock(ctx, gap + i * (c + gap), top, c, lw, i % COLORS.length, LEFT[i % LEFT.length]!);
    letterBlock(ctx, right + gap + i * (c + gap), top, c, lw, (i + 3) % COLORS.length, RIGHT[i % RIGHT.length]!);
  }
}

/** One letter block, `c` wide, its top-left at (x, top): the block, a raised border on its face, the symbol. */
function letterBlock(ctx: Ctx, x: number, top: number, c: number, lw: number, k: number, symbol: readonly [Glyph, boolean]): void {
  inkedBlock(ctx, x, top, c, c, COLORS[k]!, lw, c * 0.12);
  ctx.beginPath();
  block(ctx, x + c * 0.14, top + c * 0.14, c * 0.62, c * 0.62, c * 0.08);
  ctx.strokeStyle = COLORS[k]!.light;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
  ctx.beginPath();
  symbol[0](ctx, x + c * 0.45, top + c * 0.45, c * 0.42);
  if (symbol[1]) {
    ctx.fillStyle = SYMBOL[k]!;
    ctx.fill();
  } else {
    ctx.strokeStyle = SYMBOL[k]!;
    ctx.lineWidth = Math.max(1.5, c * 0.085);
    ctx.stroke();
  }
}

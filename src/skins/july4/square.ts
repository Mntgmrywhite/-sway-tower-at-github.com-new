import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import {
  BLOOMS,
  DECK,
  GOLD,
  INK,
  LATTICE_BACK,
  LATTICE_DEEP,
  LAWN,
  LAWN_LIGHT,
  LAWN_SHADE,
  LAWN_STRIPE,
  LEAVES,
  LEAVES_LIGHT,
  PAINT,
  PATH,
  PATH_EDGE,
  POT,
  POT_SHADE,
  RAIL,
  RUNNER_LIT,
  STEP,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
} from "./colors";
import { mainLine } from "./land";
import { bands, softOval, wash } from "./paint";
import { breeze } from "./life";
import { dot } from "./shapes";

// The town square the tower stands in: the lawn from Main Street's side (its far edge) down to
// the brick sidewalk in front, soft and lush, mown in gentle stripes that widen toward you, with
// a few lighter patches where the sun lies on it; the white bandstand the bars are stacked on
// (its roof long gone, so you can build it higher): an octagonal deck whose top is the tower's
// floor, pleated fans of red, white and blue bunting hung along its fascia and swaying a little
// in the breeze, a lattice skirt beneath, steps with a red runner down the front between two
// pots of geraniums, and a path across the lawn to the sidewalk. Painted like everything up
// close: soft forms with a lit top and a shaded foot, drawn round with a fine sepia line. The
// barbecue corner and the kids with their sparklers stand on the lawn either side (cast.ts), and
// the parade passes in front (parade.ts). Nothing beside the base block rises above its top (the
// slider's first pass sweeps over the lawn).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The line weight up close: the deck's lip (the tower's floor line). */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** The fine line round everything up close. */
export function keyW(s: Scene): number {
  return Math.max(1, s.u * 0.0032);
}

/** Center line of the tower: under the base block. */
export function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

/** The deck: half width, its angled end faces, the fascia's depth, the lattice skirt's foot. */
export const DECK_HW = 0.26;
const END_FACE = 0.07;
export const FASCIA_H = 0.04;
export const DECK_FOOT = 0.2;
/** The steps down the front, from under the deck to the lawn at the skirt's foot: width, each riser, how many; the path from their foot. */
const STEP_HW = 0.08;
const STEP_H = 0.04;
const STEPS = 4;
export const STEP_FOOT = FASCIA_H + STEPS * STEP_H;
/** The sidewalk's top edge sits this far above the base band's top (u): the lawn and the path end there. */
export const SIDEWALK_UP = 0.04;
/** The path's half width at the steps and at the sidewalk. */
const PATH_HW_TOP = 0.09;
const PATH_HW_BOTTOM = 0.13;

/** The lawn's top edge: Main Street's line, the far side of the square. */
export function lawnTop(s: Scene): number {
  return mainLine(s) + s.u * 0.01;
}

/** The picnic lawn's parallax: it drops away with the base band, LAWN_P times as fast as the tower as the camera climbs. */
export const LAWN_P = 1.6;

/** The sidewalk's top edge: where the lawn ends (it moves with the base band). */
export function sidewalkTop(s: Scene): number {
  return layerGround(s, LAWN_P) + s.u * (0.36 - SIDEWALK_UP);
}

/** How many mowing stripes cross the lawn. */
const STRIPES = 7;

/** Sunny patches on the lawn: X (u from center), depth (u below the lawn's top), size (u). */
const PATCHES = [
  [-0.4, 0.07, 0.07],
  [0.36, 0.1, 0.06],
  [-0.12, 0.05, 0.08],
  [0.16, 0.04, 0.07],
  [-0.38, 0.17, 0.08],
  [0.42, 0.2, 0.07],
] as const;

/**
 * The painter's brush in the grass: short flat strokes, light where the sun catches the blades
 * and dark where they lie in shade, out at the sides of the lawn (the middle behind the tower
 * stays smooth). X (u from center), depth (share of the lawn, further strokes smaller), length (u),
 * light or dark.
 */
const DABS = Array.from({ length: 40 }, (_, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  return {
    X: side * (0.24 + hash(i * 3 + 9100) * 0.36),
    d: hash(i * 3 + 9101) ** 1.4,
    len: 0.018 + hash(i * 3 + 9102) * 0.022,
    light: i % 3 !== 0,
  };
});

/** The lawn: a soft wash from a hazy far green to a lush near one, mown in stripes that widen toward you, sunny patches. */
export function lawn(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = lawnTop(s);
  if (top > s.cssH) return;
  const bottom = Math.min(s.cssH, sidewalkTop(s) + 2);
  if (bottom <= top) return;
  bands(ctx, "lawn", 0, s.cssW, top, top + u * 0.3, [LAWN_LIGHT, LAWN], [0, 1], 4);
  ctx.fillStyle = LAWN;
  ctx.fillRect(0, top + u * 0.3, s.cssW, Math.max(0, bottom - top - u * 0.3));
  // Mowing stripes, every other band of the lawn, widening toward you in perspective.
  ctx.fillStyle = LAWN_STRIPE;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  const n = STRIPES * 2;
  for (let i = 1; i < n; i += 2) {
    const y0 = top + (bottom - top) * (i / n) ** 1.6;
    const y1 = top + (bottom - top) * ((i + 1) / n) ** 1.6;
    if (y1 - y0 >= 1) ctx.rect(0, y0, s.cssW, y1 - y0);
  }
  ctx.fill();
  // Sunny patches: soft lighter ovals, as a painter lays light on grass.
  ctx.fillStyle = LAWN_LIGHT;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  const cx = s.cssW / 2;
  for (const [X, d, r] of PATCHES) {
    const y = top + d * u;
    if (y > bottom - r * u * 0.3) continue;
    softOval(ctx, cx + X * u, y, r * u, r * u * 0.22);
  }
  ctx.fill();
  // Brush strokes in the grass, nearer ones bigger, light ones and dark ones each in one fill.
  for (const light of [true, false]) {
    ctx.fillStyle = light ? LAWN_LIGHT : LAWN_SHADE;
    ctx.globalAlpha = light ? 0.5 : 0.22;
    ctx.beginPath();
    for (const b of DABS) {
      if (b.light !== light) continue;
      const y = top + (bottom - top) * (0.06 + b.d * 0.9);
      const k = 0.45 + 0.55 * b.d;
      softOval(ctx, cx + b.X * u, y, b.len * k * u, u * 0.0032 * k, b.X < 0 ? -0.08 : 0.08);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The concrete path from the steps to the sidewalk, its joints closer together further away. */
export function path(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = centerX(s);
  const top = s.groundY + STEP_FOOT * u;
  const bottom = sidewalkTop(s) + 1;
  if (top > s.cssH) return;
  ctx.beginPath();
  ctx.moveTo(cx - PATH_HW_TOP * u, top);
  ctx.lineTo(cx + PATH_HW_TOP * u, top);
  ctx.lineTo(cx + PATH_HW_BOTTOM * u, bottom);
  ctx.lineTo(cx - PATH_HW_BOTTOM * u, bottom);
  ctx.closePath();
  ctx.fillStyle = PATH;
  ctx.fill();
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.beginPath();
  for (let k = 0.18; k < 1; k += 0.2) {
    const y = top + (bottom - top) * k * k;
    const hw = (PATH_HW_TOP + (PATH_HW_BOTTOM - PATH_HW_TOP) * k * k) * u;
    ctx.moveTo(cx - hw + u * 0.006, y);
    ctx.lineTo(cx + hw - u * 0.006, y);
  }
  ctx.stroke();
}

/** Pots of red geraniums either side of the steps' foot: their place (u out from the center line) and the pots' foot (u under the floor). */
const POT_X = 0.135;
const POT_FOOT = STEP_FOOT + 0.03;

/** A rectangle with a fine line round it: the line laid as a fill under the color (two fills cost less than a fill and a stroke). */
function lined(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, kw: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x - kw / 2, y - kw / 2, w + kw, h + kw);
  ctx.fillStyle = fill;
  ctx.fillRect(x + kw / 2, y + kw / 2, w - kw, h - kw);
}

/** A pleated fan of bunting hung from (x, y), radius r: red, white and blue bands, each rounded by a soft shade at its foot. */
function fanBands(ctx: Ctx, x0: number, dx: number, n: number, y: number, r: number, lift: (i: number) => number): void {
  const inks = [STRIPE_RED, STRIPE_WHITE, STRIPE_BLUE];
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = inks[b]!;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = x0 + dx * i;
      const r0 = r * (1 - b * 0.3);
      const l = lift(i);
      ctx.moveTo(x - r0, y);
      ctx.ellipse(x, y, r0, r0 * (0.85 - l), 0, Math.PI, 0, true);
      ctx.closePath();
    }
    ctx.fill();
  }
}

/** The bandstand's deck: its fascia hung with bunting fans, the lattice skirt, the steps and their runner, the pots of geraniums, its soft shadow on the lawn. */
export function bandstand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const kw = keyW(s);
  const hw = DECK_HW * u;
  const ef = END_FACE * u;
  const fasciaBottom = g + FASCIA_H * u;
  const foot = g + DECK_FOOT * u;

  // The soft shadow the deck throws on the lawn.
  ctx.fillStyle = LAWN_SHADE;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  oval(ctx, cx + u * 0.02, foot + u * 0.008, hw * 1.12, u * 0.03);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The lattice skirt: the cool shade under the deck, cream strips both ways cut to it.
  const lx0 = cx - hw + ef;
  const lx1 = cx + hw - ef;
  ctx.fillStyle = wash(ctx, fasciaBottom, foot, [LATTICE_DEEP, LATTICE_BACK]);
  ctx.fillRect(lx0, fasciaBottom, lx1 - lx0, foot - fasciaBottom);
  // The strips, each a thin band laid as a fill (cheaper than a stroke), both ways in one path.
  ctx.fillStyle = PAINT.body;
  const sw = Math.max(1.5, u * 0.0065) * 0.72;
  ctx.beginPath();
  const pitch = u * 0.05;
  const sh = foot - fasciaBottom;
  for (let x = lx0 - sh + pitch * 0.5; x < lx1; x += pitch) {
    const a0 = Math.max(0, lx0 - x);
    const a1 = Math.min(sh, lx1 - x);
    if (a1 > a0) {
      ctx.moveTo(x + a0 - sw, foot - a0);
      ctx.lineTo(x + a1 - sw, foot - a1);
      ctx.lineTo(x + a1 + sw, foot - a1);
      ctx.lineTo(x + a0 + sw, foot - a0);
      ctx.closePath();
      ctx.moveTo(x + a0 - sw, fasciaBottom + a0);
      ctx.lineTo(x + a1 - sw, fasciaBottom + a1);
      ctx.lineTo(x + a1 + sw, fasciaBottom + a1);
      ctx.lineTo(x + a0 + sw, fasciaBottom + a0);
      ctx.closePath();
    }
  }
  ctx.fill();
  // The end faces, angled away (shaded), the corner posts, the sill board along the foot.
  const endWash = wash(ctx, fasciaBottom, foot, [PAINT.body, PAINT.shade]);
  lined(ctx, cx - hw, fasciaBottom, ef, sh, endWash, kw);
  lined(ctx, lx1, fasciaBottom, ef, sh, endWash, kw);
  for (const x of [cx - hw, lx0 - u * 0.006, lx1 - u * 0.006, cx + hw - u * 0.012]) lined(ctx, x, fasciaBottom, u * 0.012, sh, PAINT.light, kw);
  lined(ctx, cx - hw - u * 0.006, foot - u * 0.012, hw * 2 + u * 0.012, u * 0.016, PAINT.shade, kw);

  // The steps down the front: treads lit, risers shaded, widening a little toward you; a red runner with gold edges.
  for (let i = 0; i < STEPS; i++) {
    const shw = (STEP_HW + i * 0.012) * u;
    lined(ctx, cx - shw, fasciaBottom + i * STEP_H * u, shw * 2, STEP_H * u, STEP.shade, kw);
  }
  ctx.fillStyle = STEP.light;
  ctx.beginPath();
  for (let i = 0; i < STEPS; i++) {
    const shw = (STEP_HW + i * 0.012) * u;
    ctx.rect(cx - shw + kw * 0.5, fasciaBottom + i * STEP_H * u + kw * 0.5, shw * 2 - kw, STEP_H * u * 0.42);
  }
  ctx.fill();
  lined(ctx, cx - u * 0.032, fasciaBottom, u * 0.064, STEPS * STEP_H * u, wash(ctx, fasciaBottom, fasciaBottom + STEPS * STEP_H * u, [RUNNER_LIT, STRIPE_RED]), kw);
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - u * 0.026, fasciaBottom, u * 0.004, STEPS * STEP_H * u);
  ctx.fillRect(cx + u * 0.022, fasciaBottom, u * 0.004, STEPS * STEP_H * u);

  // The pots of geraniums either side of the steps' foot.
  const py = g + POT_FOOT * u;
  ctx.beginPath();
  for (const side of [-1, 1]) oval(ctx, cx + side * POT_X * u, py - u * 0.034, u * 0.023, u * 0.013);
  ctx.fillStyle = LEAVES;
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.fillStyle = LEAVES_LIGHT;
  ctx.beginPath();
  for (const side of [-1, 1]) oval(ctx, cx + side * POT_X * u - u * 0.007, py - u * 0.04, u * 0.01, u * 0.005);
  ctx.fill();
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const px = cx + side * POT_X * u;
    ctx.moveTo(px - u * 0.016, py - u * 0.026);
    ctx.lineTo(px + u * 0.016, py - u * 0.026);
    ctx.lineTo(px + u * 0.012, py);
    ctx.lineTo(px - u * 0.012, py);
    ctx.closePath();
  }
  ctx.fillStyle = wash(ctx, py - u * 0.026, py, [POT, POT_SHADE]);
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.fillStyle = BLOOMS[0];
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const px = cx + side * POT_X * u;
    dot(ctx, px - u * 0.01, py - u * 0.041, u * 0.007);
    dot(ctx, px + u * 0.006, py - u * 0.045, u * 0.007);
    dot(ctx, px + u * 0.014, py - u * 0.036, u * 0.006);
  }
  ctx.fill();

  // The fascia: the deck's edge, its ends angled away (shaded), under a lip of decking.
  lined(ctx, cx - hw, g, hw * 2, FASCIA_H * u, wash(ctx, g, g + FASCIA_H * u, [RAIL.light, RAIL.body]), kw);
  ctx.fillStyle = PAINT.shade;
  ctx.fillRect(cx - hw + kw * 0.5, g, ef - kw * 0.5, FASCIA_H * u - kw * 0.5);
  ctx.fillRect(lx1, g, ef - kw * 0.5, FASCIA_H * u - kw * 0.5);
  ctx.fillStyle = INK;
  ctx.fillRect(lx0 - kw * 0.5, g, kw, FASCIA_H * u);
  ctx.fillRect(lx1 - kw * 0.5, g, kw, FASCIA_H * u);
  // Fans of bunting along the fascia, their pleats lifting a little in the breeze; a fine line round them.
  const fans = 5;
  const span = lx1 - lx0;
  const fr = Math.min((span / fans) * 0.46, u * 0.034);
  const b = breeze(s.t);
  const lift = (i: number) => 0.04 * Math.sin(s.t * 1.7 + i * 1.3) * (0.3 + b) + 0.06 * b;
  ctx.beginPath();
  for (let i = 0; i < fans; i++) {
    const x = lx0 + (span * (i + 0.5)) / fans;
    ctx.moveTo(x - fr, g + u * 0.004);
    ctx.ellipse(x, g + u * 0.004, fr, fr * (0.85 - lift(i)), 0, Math.PI, 0, true);
  }
  ink(ctx, kw * 1.4, INK);
  fanBands(ctx, lx0 + span / fans / 2, span / fans, fans, g + u * 0.004, fr, lift);
  // Gold rosettes where the fans meet.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let i = 0; i <= fans; i++) circle(ctx, lx0 + (span * i) / fans, g + u * 0.007, u * 0.0055);
  ctx.fill();
  // The decking's lip over the fascia: the floor line itself.
  ctx.fillStyle = DECK;
  ctx.fillRect(cx - hw - u * 0.008, g - lw * 0.5, hw * 2 + u * 0.016, lw);
}

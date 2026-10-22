import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BULB_DAY, BULB_ON, GOLD, GREEN, INK, LAMPLIT, LIDS, LIP, LIP_LIT, PEARL, PLUMES, PURPLE, QUEEN_HAIR, QUEEN_HAIR_LIT, ROUGE, SKINS, VIOLET, WHITE, type Shades } from "./colors";
import { feather } from "./folk";
import { floorRest } from "./far";
import { inkW } from "./place";
import { fleurPath, maskEyes, maskPath, sparkle } from "./shapes";
import { lowestBurst } from "./sky";
import { AFTERNOON, level, LOOP_START, smooth, storyLevel, type Tone } from "./tone";

// The night parade's great float, standing out of the clouds: the head of the Carnival Queen, a
// giant papier-mâché sculpture rising out of the cloud floor in the left lane once the sun has
// gone down, as the biggest float of the night comes up the avenue below (the owner's parade
// illustration and the painted mask: a masked lady's float head with a fan of plumes). Her face
// painted warm with rosy cheeks and a red smile, her eyes closed under teal lids behind a purple
// masquerade mask trimmed in gold filigree and green sequins, a jewel at its brow; dark curls; a
// gold crown with five points, pearls and a fleur-de-lis, its band of marquee bulbs chasing round
// by night; a great fan of plumes behind her head in teal, purple, green and gold, trembling; pearl
// drops at her ears and strings of beads on her layered paper ruff, swinging. Her head tilts a
// little to the music now and then, and gold sequins glint on the crown and the mask. She comes
// up out of the clouds at nightfall (as the fireworks start under the masked moon), stands there
// all night, and on each turn of the story's loop sinks back into the clouds before the dawn sun
// rises where she stood. Only height decides how far up she is, so the loop comes round with no
// seam (tone.ts).
//
// She keeps to the left lane, under the fireworks and well under the moon, her ruff in the cloud
// floor (drawn over it after), out of the tower's column with all her motion. Up close in look:
// one ink weight, a lit side and a shaded side, as on the parade's floats.
//
// Units: R, her face's half width; the origin is the middle of her face, y down.

/** Her face's half width (u). */
const R = 0.068;
/** Where she stands across: u left of the screen's center, held to the screen's left side on a wide screen. */
const X = -0.37;
/** Her face's middle stands this far (R) above the line where the cloud floor comes to rest (far.ts) once she is all the way up: her ruff and its beads showing over the floor's puffs. */
const UP = 2.55;

/**
 * Rising at nightfall in the first pass (levels: once the sun has gone, while the cloud floor is
 * still high and hides her; she comes into view as it sinks to rest round her), and sinking in
 * each loop's night hold before the dawn (story levels, tone.ts).
 */
const RISE_FROM = 42.5;
const RISE_TO = 54;
const SINK_FROM = -29;
const SINK_TO = -15;

/** How far she has come up out of the clouds at a level: 0 down in them, 1 all the way up. */
export function queenUp(lvl: number): number {
  const e = storyLevel(lvl);
  if (lvl >= LOOP_START && e < AFTERNOON) return 1 - smooth(SINK_FROM, SINK_TO, e);
  return smooth(RISE_FROM, RISE_TO, e);
}

/** Her face's paint (her curls, lips and pearls are in colors.ts). */
const FACE = SKINS[1]!;

/** The plumes behind her head: [angle from upright (rad), length (R), color]. */
const FAN: readonly (readonly [number, number, Shades])[] = [
  [-0.9, 1.45, PLUMES[1]!],
  [-0.6, 1.75, PURPLE],
  [-0.3, 1.95, GREEN],
  [0, 2.1, GOLD],
  [0.3, 1.95, GREEN],
  [0.6, 1.75, PURPLE],
  [0.9, 1.45, PLUMES[1]!],
];
/** Where the plumes rise from (R above her face's middle). */
const FAN_FOOT = 1.4;
/** The crown: its width (R), where its band's foot sits (R above her face's middle), its points [x, height] (crown widths). */
const CROWN_W = 1.55;
const CROWN_FOOT = 0.98;
const TIPS = [
  [-0.46, 0.6],
  [-0.235, 0.5],
  [0, 0.7],
  [0.235, 0.5],
  [0.46, 0.6],
] as const;
const DIP = 0.36;
/** The marquee bulbs on the crown's band: x (crown widths). */
const BULBS = Array.from({ length: 7 }, (_, i) => -0.39 + (i * 0.78) / 6);
/** The mask: its width (R) and its middle (R below her face's middle). */
const MASK_W = 2.25;
const MASK_Y = -0.08;
/** Where gold sequins glint: [x, y] (R, her frame), and their clocks' offsets. */
const GLINTS = [
  [-0.62, -1.42, 0],
  [0.3, -1.7, 1.7],
  [0.86, -0.42, 3.1],
  [-0.94, -0.3, 4.4],
] as const;

/** Scratch: where she stands and how big, for tests. */
const AT = { x: 0, y: 0, r: 0, up: 0 };

/**
 * Where her face's middle is on screen, her face's half width (px) and how far up she is. She
 * stands on the line where the cloud floor comes to rest: in the first pass the floor is still
 * high as she comes up, and she comes into view as it sinks round her.
 */
export function queenAt(s: Scene): typeof AT {
  const u = s.u;
  const rest = floorRest(s);
  // As big as the lane holds; smaller where the screen is short for its width, to keep under the fireworks.
  AT.r = Math.min(R * u, (rest - lowestBurst(s) - u * 0.01) / (UP - QUEEN_REACH.top));
  AT.up = queenUp(level(s));
  AT.x = Math.min(s.cssW / 2 + X * u, (X + 0.5) * u);
  AT.y = rest - UP * AT.r + (1 - AT.up) * (UP - QUEEN_REACH.top + 0.3) * AT.r + Math.sin(s.t * 0.6 + 1) * u * 0.004;
  return AT;
}

/** Everything she can cover, in R about her face's middle, before her tilt (at most TILT): for tests. */
export const QUEEN_REACH = { left: -1.62, right: 1.62, top: -3.62, bottom: 2.4 } as const;
/** How far her head tilts at most (rad). */
export const TILT = 0.06;

/** Her head's tilt, by her clock: now and then she leans her head to the music, and back. */
function tiltAt(t: number): number {
  const sway = Math.sin(t * 0.5) * 0.025;
  const lean = Math.max(0, Math.sin(t * 0.23 + 0.6)) ** 3 * 0.03;
  return sway - lean;
}

/** One plume's tip, trembling on its own clock (her frame, px). */
function plumeTip(i: number, t: number, r: number): [number, number] {
  const [a0, len] = FAN[i]!;
  const a = a0 + Math.sin(t * 3.7 + i * 1.9) * 0.03 + Math.sin(t * 1.2 + i * 0.7) * 0.025;
  return [Math.sin(a) * len * r, -FAN_FOOT * r - Math.cos(a) * len * r];
}

/** Her face: round at the brow, tapering to the chin. */
function facePath(ctx: Ctx, r: number): void {
  ctx.moveTo(0, -1.22 * r);
  ctx.bezierCurveTo(0.62 * r, -1.22 * r, 1.02 * r, -0.72 * r, 1.0 * r, -0.05 * r);
  ctx.bezierCurveTo(0.98 * r, 0.62 * r, 0.52 * r, 1.28 * r, 0, 1.3 * r);
  ctx.bezierCurveTo(-0.52 * r, 1.28 * r, -0.98 * r, 0.62 * r, -1.0 * r, -0.05 * r);
  ctx.bezierCurveTo(-1.02 * r, -0.72 * r, -0.62 * r, -1.22 * r, 0, -1.22 * r);
  ctx.closePath();
}

/** The crown's outline at (0, y0), `w` wide: five points over a band that curves down at its middle. */
function crownPath(ctx: Ctx, y0: number, w: number): void {
  ctx.moveTo(-0.5 * w, y0);
  ctx.lineTo(-0.535 * w, y0 - DIP * w);
  for (let i = 0; i < TIPS.length; i++) {
    const [x, h] = TIPS[i]!;
    ctx.lineTo(x * w, y0 - h * w);
    if (i < TIPS.length - 1) ctx.lineTo(((x + TIPS[i + 1]![0]) / 2) * w, y0 - DIP * w);
  }
  ctx.lineTo(0.535 * w, y0 - DIP * w);
  ctx.lineTo(0.5 * w, y0);
  ctx.quadraticCurveTo(0, y0 + 0.06 * w, -0.5 * w, y0);
  ctx.closePath();
}

/** The ruff: a scalloped collar of layered paper, `rx` wide and `ry` deep about (0, y), as one subpath. */
function ruffPath(ctx: Ctx, y: number, rx: number, ry: number, n: number): void {
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const px = Math.cos(a) * rx;
    const py = y + Math.sin(a) * ry * 0.35;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const am = Math.PI + ((i - 0.5) / n) * Math.PI;
      ctx.quadraticCurveTo(Math.cos(am) * rx * 1.12, y + Math.sin(am) * ry * 0.35 - ry * 0.28, px, py);
    }
  }
  ctx.lineTo(rx * 0.9, y + ry);
  ctx.lineTo(-rx * 0.9, y + ry);
  ctx.closePath();
}

/**
 * The Carnival Queen, up out of the cloud floor whose top edge is `floor`. Drawn before the
 * cloud floor, which covers her ruff (and all of her while she is down).
 */
export function carnivalQueen(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  const { x, y, r, up } = queenAt(s);
  if (up <= 0.001 || y + QUEEN_REACH.top * r > floor + s.u * 0.06) return;
  const lw = inkW(s) * 0.85;
  const t = s.t;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tiltAt(t));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // The fan of plumes behind her head: one ink, then each feather and its lit vane, then the quills.
  const fy = -FAN_FOOT * r;
  ctx.beginPath();
  for (let i = 0; i < FAN.length; i++) {
    const [tx, ty] = plumeTip(i, t, r);
    feather(ctx, 0, fy, tx, ty, r * 0.2);
  }
  ink(ctx, lw * 2, INK);
  // By pairs from the outside in, so the middle plume stands in front: each pair's feathers in one fill, then their lit vanes in one more.
  for (let p = 0; p <= FAN.length >> 1; p++) {
    const pair = p === FAN.length >> 1 ? [p] : [p, FAN.length - 1 - p];
    const c = FAN[p]![2];
    ctx.fillStyle = c.body;
    ctx.beginPath();
    for (const i of pair) {
      const [tx, ty] = plumeTip(i, t, r);
      feather(ctx, 0, fy, tx, ty, r * 0.2);
    }
    ctx.fill();
    ctx.fillStyle = c.light;
    ctx.beginPath();
    for (const i of pair) {
      const [tx, ty] = plumeTip(i, t, r);
      feather(ctx, tx * 0.25, fy + (ty - fy) * 0.25, tx, ty, r * 0.09);
    }
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.beginPath();
  for (let i = 0; i < FAN.length; i++) {
    const [tx, ty] = plumeTip(i, t, r);
    ctx.moveTo(tx * 0.2, fy + (ty - fy) * 0.2);
    ctx.quadraticCurveTo(tx * 0.55, fy + (ty - fy) * 0.5, tx * 0.88, fy + (ty - fy) * 0.88);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Her curls, behind her face, and her neck.
  ctx.beginPath();
  oval(ctx, 0, -0.32 * r, 1.22 * r, 1.22 * r);
  circle(ctx, -0.98 * r, 0.42 * r, 0.42 * r);
  circle(ctx, 0.98 * r, 0.42 * r, 0.42 * r);
  ctx.rect(-0.34 * r, 0.6 * r, 0.68 * r, 1.3 * r);
  ctx.fillStyle = QUEEN_HAIR;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.rect(-0.34 * r, 0.9 * r, 0.68 * r, 1.0 * r);
  ctx.fillStyle = FACE.shade;
  ctx.fill();
  ctx.fillStyle = QUEEN_HAIR_LIT;
  ctx.beginPath();
  oval(ctx, -0.62 * r, -1.02 * r, 0.32 * r, 0.16 * r, -0.6);
  circle(ctx, -1.06 * r, 0.32 * r, 0.14 * r);
  ctx.fill();
  // The ruff: a gold tier behind a purple one, and strings of beads across it, swinging.
  ctx.beginPath();
  ruffPath(ctx, 1.7 * r, 1.42 * r, 0.7 * r, 9);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  ruffPath(ctx, 1.92 * r, 1.12 * r, 0.6 * r, 7);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  const swing = Math.sin(t * 1.3) * 0.05 * r;
  const strands: readonly (readonly [number, number, Shades])[] = [
    [0.6, 0.5, GREEN],
    [0.82, 0.68, GOLD],
    [1.0, 0.86, VIOLET],
  ];
  for (const [hw, d, c] of strands) {
    ctx.beginPath();
    const n = 11;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const a = Math.PI * k;
      circle(ctx, -hw * r * Math.cos(a) + swing * Math.sin(a), 1.5 * r + d * r * Math.sin(a) * 0.62, 0.075 * r);
    }
    ctx.fillStyle = c.body;
    ctx.fill();
  }
  // Her face: painted warm, lit at the brow on the left, shaded down the right; rosy cheeks.
  ctx.beginPath();
  facePath(ctx, r);
  ctx.fillStyle = FACE.body;
  ctx.fill();
  // The shade: a crescent down her right side, from the brow along her cheek to the chin.
  ctx.fillStyle = FACE.shade;
  ctx.beginPath();
  ctx.moveTo(0.3 * r, -1.18 * r);
  ctx.bezierCurveTo(0.8 * r, -1.0 * r, 1.02 * r, -0.6 * r, 1.0 * r, -0.05 * r);
  ctx.bezierCurveTo(0.98 * r, 0.62 * r, 0.52 * r, 1.28 * r, 0.02 * r, 1.3 * r);
  ctx.bezierCurveTo(0.5 * r, 1.0 * r, 0.8 * r, 0.4 * r, 0.76 * r, -0.2 * r);
  ctx.quadraticCurveTo(0.72 * r, -0.85 * r, 0.3 * r, -1.18 * r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FACE.light;
  ctx.beginPath();
  oval(ctx, -0.45 * r, -0.85 * r, 0.38 * r, 0.2 * r, -0.3);
  ctx.fill();
  ctx.beginPath();
  facePath(ctx, r);
  ink(ctx, lw, INK);
  ctx.fillStyle = ROUGE;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  oval(ctx, -0.56 * r, 0.5 * r, 0.24 * r, 0.15 * r);
  oval(ctx, 0.56 * r, 0.5 * r, 0.24 * r, 0.15 * r);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Curls over her brow and down by her ears.
  ctx.beginPath();
  ctx.moveTo(-0.95 * r, -0.55 * r);
  ctx.quadraticCurveTo(-0.7 * r, -1.25 * r, 0.05 * r, -1.2 * r);
  ctx.quadraticCurveTo(-0.45 * r, -0.98 * r, -0.62 * r, -0.62 * r);
  ctx.quadraticCurveTo(-0.78 * r, -0.4 * r, -0.95 * r, -0.55 * r);
  ctx.closePath();
  ctx.moveTo(0.95 * r, -0.55 * r);
  ctx.quadraticCurveTo(0.72 * r, -1.22 * r, 0.02 * r, -1.2 * r);
  ctx.quadraticCurveTo(0.48 * r, -0.96 * r, 0.64 * r, -0.6 * r);
  ctx.quadraticCurveTo(0.8 * r, -0.38 * r, 0.95 * r, -0.55 * r);
  ctx.closePath();
  ctx.fillStyle = QUEEN_HAIR;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Her eyes closed under painted lids (seen through the mask), the nose, the smile.
  const eyes = [-0.53, 0.53];
  ctx.beginPath();
  for (const ex of eyes) {
    ctx.moveTo((ex - 0.22) * r, -0.04 * r);
    ctx.quadraticCurveTo(ex * r, -0.3 * r, (ex + 0.22) * r, -0.04 * r);
    ctx.quadraticCurveTo(ex * r, 0.1 * r, (ex - 0.22) * r, -0.04 * r);
    ctx.closePath();
  }
  ctx.fillStyle = LIDS.teal;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.75);
  ctx.beginPath();
  for (const ex of eyes) {
    ctx.moveTo((ex - 0.22) * r, -0.04 * r);
    ctx.quadraticCurveTo(ex * r, 0.1 * r, (ex + 0.22) * r, -0.04 * r);
    // Lashes.
    for (const k of [-0.12, 0, 0.12]) {
      ctx.moveTo((ex + k) * r, 0.04 * r);
      ctx.lineTo((ex + k * 1.4) * r, 0.14 * r);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = FACE.shade;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(0.06 * r, 0.3 * r);
  ctx.quadraticCurveTo(0.14 * r, 0.52 * r, 0.02 * r, 0.56 * r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.3 * r, 0.8 * r);
  ctx.quadraticCurveTo(0, 0.74 * r, 0.3 * r, 0.8 * r);
  ctx.quadraticCurveTo(0, 1.08 * r, -0.3 * r, 0.8 * r);
  ctx.closePath();
  ctx.fillStyle = LIP;
  ctx.fill();
  ctx.fillStyle = LIP_LIT;
  ctx.beginPath();
  oval(ctx, 0, 0.9 * r, 0.14 * r, 0.05 * r);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.3 * r, 0.8 * r);
  ctx.quadraticCurveTo(0, 1.08 * r, 0.3 * r, 0.8 * r);
  ink(ctx, lw * 0.6, INK);
  // The mask: purple, its eye holes rimmed in gold, gold filigree scrolling over it, green sequins
  // along its edge, a jewel at its brow.
  const my = MASK_Y * r;
  const mw = MASK_W * r;
  ctx.beginPath();
  maskPath(ctx, 0, my, mw);
  maskEyes(ctx, 0, my, mw);
  ctx.fillStyle = PURPLE.body;
  ctx.fill("evenodd");
  ink(ctx, lw, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.beginPath();
  oval(ctx, -0.62 * mw * 0.5, my - 0.18 * mw * 0.42, 0.16 * mw * 0.5, 0.06 * mw * 0.5, -0.5);
  ctx.fill();
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = Math.max(1, r * 0.055);
  ctx.beginPath();
  maskEyes(ctx, 0, my, mw);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.055);
  ctx.beginPath();
  for (const m of [-1, 1]) {
    // A scroll curling out from the eye toward the temple, and one curling up over the brow.
    ctx.moveTo(m * 0.36 * mw, my - 0.02 * mw);
    ctx.quadraticCurveTo(m * 0.46 * mw, my - 0.16 * mw, m * 0.4 * mw, my - 0.2 * mw);
    ctx.quadraticCurveTo(m * 0.35 * mw, my - 0.16 * mw, m * 0.39 * mw, my - 0.13 * mw);
    ctx.moveTo(m * 0.08 * mw, my - 0.02 * mw);
    ctx.quadraticCurveTo(m * 0.12 * mw, my + 0.1 * mw, m * 0.22 * mw, my + 0.12 * mw);
  }
  ctx.stroke();
  ctx.fillStyle = GREEN.light;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const k = (i + 0.5) / 6;
    circle(ctx, -0.5 * mw + k * 0.32 * mw, my - 0.22 * mw + k * 0.1 * mw, r * 0.045);
    circle(ctx, 0.5 * mw - k * 0.32 * mw, my - 0.22 * mw + k * 0.1 * mw, r * 0.045);
  }
  ctx.fill();
  ctx.beginPath();
  sparkleJewel(ctx, 0, my - 0.06 * mw, r * 0.14);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Gold drops at her ears with a pearl at their foot, swinging.
  ctx.beginPath();
  for (const m of [-1, 1]) {
    const sw = Math.sin(t * 1.6 + m) * 0.07 * r;
    circle(ctx, m * 0.9 * r + sw * 0.5, 0.74 * r, 0.065 * r);
  }
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  for (const m of [-1, 1]) {
    const sw = Math.sin(t * 1.6 + m) * 0.07 * r;
    circle(ctx, m * 0.9 * r + sw, 0.92 * r, 0.09 * r);
  }
  ctx.fillStyle = PEARL;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  // Her crown: gold over a purple band, lit down its left, pearls on the points, the fleur-de-lis
  // on the middle one, and the band's marquee bulbs chasing round by night.
  const cw = CROWN_W * r;
  const cy = -CROWN_FOOT * r;
  ctx.beginPath();
  crownPath(ctx, cy, cw);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(-0.6 * cw, cy - 0.8 * cw, 0.3 * cw, 0.9 * cw);
  ctx.fillStyle = GOLD.shade;
  ctx.fillRect(0.3 * cw, cy - 0.8 * cw, 0.3 * cw, 0.9 * cw);
  ctx.fillStyle = PURPLE.body;
  ctx.beginPath();
  ctx.moveTo(-0.6 * cw, cy - 0.3 * cw);
  ctx.quadraticCurveTo(0, cy - 0.24 * cw, 0.6 * cw, cy - 0.3 * cw);
  ctx.lineTo(0.6 * cw, cy - 0.08 * cw);
  ctx.quadraticCurveTo(0, cy - 0.02 * cw, -0.6 * cw, cy - 0.08 * cw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  crownPath(ctx, cy, cw);
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < TIPS.length; i++) {
    if (i === 2) continue;
    const [px, ph] = TIPS[i]!;
    circle(ctx, px * cw, cy - ph * cw - 0.03 * cw, 0.05 * cw);
  }
  ctx.fillStyle = PEARL;
  ctx.fill();
  ink(ctx, lw * 0.55, INK);
  ctx.beginPath();
  fleurPath(ctx, 0, cy - 0.8 * cw, 0.2 * cw);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.55, INK);
  const chase = Math.floor(t * 4);
  const night = tone.lit > 0.2;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < BULBS.length; i++) {
      const bright = (i + chase) % 3 === 0;
      if ((pass === 1) !== bright) continue;
      const bx = BULBS[i]!;
      circle(ctx, bx * cw, cy - (0.19 - 0.03 * (1 - (bx / 0.5) ** 2)) * cw, 0.034 * cw);
    }
    ctx.fillStyle = pass ? BULB_ON : night ? LAMPLIT : BULB_DAY;
    ctx.fill();
  }
  // Sequins glinting now and then on the crown and the mask.
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  for (const [gx, gy, off] of GLINTS) {
    const g = Math.sin(t * 1.7 + off * 2.3);
    if (g < 0.55) continue;
    sparkle(ctx, gx * r, gy * r, r * 0.16 * (g - 0.55) * 2.2);
  }
  ctx.fill();
  ctx.restore();
}

/** A cut jewel: a diamond with a pointed drop below, as one subpath. */
function sparkleJewel(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x, y + s * 1.1);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
}

import { oval, type Ctx } from "../../base/draw";
import { dot } from "./cast/pen";
import type { Scene } from "../skin";
import { inkW, spot } from "./common";
import {
  BLUE,
  BONE,
  BONE_SHADE,
  EYE_RING,
  GOLD,
  INK,
  MOON_RIM,
  MOSS,
  NIGHT,
  PUMPKIN,
  PURPLE,
  PURPLE_DEEP,
  RED,
  SKIN,
  SKIN_SHADE,
  STITCH,
  STRIPE_BLACK,
  STRIPE_WHITE,
} from "./cast/palette";
import { bump } from "./cast/time";

// Trick-or-treaters in homemade costumes, drawn the Burton way (our own designs): big pale round
// heads with dark-ringed hollow eyes, white catch-lights and tiny mouths, skinny bodies on
// spindly black-and-white striped legs, pointy shoes, and stitched candy bags. A witch with a
// crooked hat whose tip curls into a spiral and a patched dress, a skeleton in a bone-print suit
// with its face painted as a skull, a black cat whose tail curls into a spiral, a pumpkin with
// stitched seams and a stem cap, and a hero in a tattered cape with a stitched star. Four huddle
// on the square left of the tower and the hero stands right of it beside the giant
// jack-o'-lantern, hopping with excitement now and then, bags swinging, the cape and the cat's
// tail flicking in the wind. When a new floor lands on the tower they all glance up at it.
// Ink-outlined, moonlight on their upper-left edges.
//
// Local units: feet at y = 0, the top of the head at about y = -0.98 (hats and ears go higher),
// x to the right, all scaled by the kid's height. Each kid keeps inside the footprint the
// cartoon kids had (the layout around them was made for it).

type Costume = "witch" | "skeleton" | "cat" | "pumpkin" | "hero";

interface Kid {
  costume: Costume;
  /** Field spot: X in u at the tower's depth, z depth. */
  X: number;
  z: number;
  /** Which hand holds the bag (-1 left, 1 right), and a phase for the hop and swing. */
  hand: -1 | 1;
  phase: number;
}

/** Kid height at the tower's depth, in u. */
export const HEIGHT = 0.15;

// A huddle of four on the left (two a step farther back, peeking between the others) and the
// superhero on the right, beside the giant jack-o'-lantern's bed, which stands between the column
// and him. Positions keep every kid between the tower's column and the screen edge, in front of
// the corner shops and above the graves. Listed back to front (they are drawn in this order).
export const KIDS: readonly Kid[] = [
  { costume: "pumpkin", X: -0.4 * (3.48 / 3), z: 3.48, hand: 1, phase: 1.2 },
  { costume: "cat", X: -0.445 * (3.4 / 3), z: 3.4, hand: 1, phase: 0.3 },
  { costume: "hero", X: 0.452 * (3.42 / 3), z: 3.42, hand: -1, phase: 3.3 },
  { costume: "skeleton", X: -0.35 * (3.36 / 3), z: 3.36, hand: 1, phase: 4.0 },
  { costume: "witch", X: -0.3 * (3.3 / 3), z: 3.3, hand: -1, phase: 2.1 },
];

const SHADOW = "rgba(14, 10, 22, 0.32)";
/** Head: center height and radius, in kid heights. */
const HEAD_Y = -0.735;
const HEAD_R = 0.22;

/** Scratch transform for the kid being drawn: local units to the screen. */
const K = { x: 0, y: 0, h: 0, lw: 1 };
const X = (lx: number) => K.x + lx * K.h;
const Y = (ly: number) => K.y + ly * K.h;
/** Where the head looks (local units of the head's radius) and how it is tilted, this frame. */
const LOOK = { x: 0, y: 0, tilt: 0, lift: 0, o: false, c: 1, n: 0 };

function ovalK(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  oval(ctx, X(x), Y(y), rx * K.h, ry * K.h, rot);
}

function fillInk(ctx: Ctx, fill: string, w = K.lw): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
}

function line(ctx: Ctx, color: string, w: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Spindly legs, black-and-white striped (or `a`/`b`), on pointy shoes curling up at the toes. */
function legs(ctx: Ctx, a: string, b: string, shoe: string): void {
  ctx.beginPath();
  ctx.moveTo(X(-0.07), Y(-0.28));
  ctx.lineTo(X(-0.078), Y(-0.04));
  ctx.moveTo(X(0.07), Y(-0.28));
  ctx.lineTo(X(0.078), Y(-0.04));
  line(ctx, a, 0.05 * K.h + K.lw * 0.4);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = -0.08 - i * 0.065;
    ctx.moveTo(X(-0.1), Y(y));
    ctx.lineTo(X(-0.052), Y(y - 0.012));
    ctx.moveTo(X(0.052), Y(y - 0.012));
    ctx.lineTo(X(0.1), Y(y));
  }
  line(ctx, b, Math.max(0.8, 0.024 * K.h));
  // Shoes: a heel, a long pointed toe turned out and up.
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.045), Y(-0.055));
    ctx.quadraticCurveTo(X(sd * 0.15), Y(-0.03), X(sd * 0.2), Y(-0.075));
    ctx.quadraticCurveTo(X(sd * 0.19), Y(0.0), X(sd * 0.05), Y(0.0));
    ctx.closePath();
  }
  ctx.fillStyle = shoe;
  ctx.fill();
}

/** Head transform: the head turns about the neck by LOOK.tilt and lifts by LOOK.lift. */
function hx(lx: number, ly: number): number {
  const dy = ly - (HEAD_Y + HEAD_R);
  return K.x + (lx * LOOK.c - dy * LOOK.n) * K.h;
}
function hy(lx: number, ly: number): number {
  const dy = ly - (HEAD_Y + HEAD_R);
  return K.y + (HEAD_Y + HEAD_R - LOOK.lift + lx * LOOK.n + dy * LOOK.c) * K.h;
}

function hM(ctx: Ctx, x: number, y: number): void {
  ctx.moveTo(hx(x, y), hy(x, y));
}
function hL(ctx: Ctx, x: number, y: number): void {
  ctx.lineTo(hx(x, y), hy(x, y));
}
function hQ(ctx: Ctx, cx: number, cy: number, x: number, y: number): void {
  ctx.quadraticCurveTo(hx(cx, cy), hy(cx, cy), hx(x, y), hy(x, y));
}

/** The big pale head, shaded on its lower right, outlined. */
function head(ctx: Ctx, fill = SKIN, shadeColor = SKIN_SHADE): void {
  const cx = hx(0, HEAD_Y);
  const cy = hy(0, HEAD_Y);
  const r = HEAD_R * K.h;
  // In shade, then lit from the upper left by a circle nudged that way, then outlined.
  ctx.beginPath();
  dot(ctx, cx, cy, r);
  ctx.fillStyle = shadeColor;
  ctx.fill();
  line(ctx, INK, K.lw);
  ctx.beginPath();
  dot(ctx, cx - r * 0.1, cy - r * 0.12, r * 0.86);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Dark-ringed hollow eyes with white catch-lights, looking toward LOOK. `ring` darker for a painted skull. */
function eyes(ctx: Ctx, ring = EYE_RING, big = 1): void {
  const r = HEAD_R;
  ctx.fillStyle = ring;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    const ex = sd * r * 0.4;
    const ey = HEAD_Y - r * 0.02;
    oval(ctx, hx(ex, ey), hy(ex, ey), r * 0.3 * big * K.h, r * 0.36 * big * K.h, LOOK.tilt + sd * 0.25);
  }
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    const ex = sd * r * 0.4 + LOOK.x * r * 0.09;
    const ey = HEAD_Y - r * 0.02 + LOOK.y * r * 0.09;
    dot(ctx, hx(ex, ey), hy(ex, ey), r * 0.19 * K.h);
  }
  ctx.fill();
  ctx.fillStyle = STRIPE_WHITE;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    const ex = sd * r * 0.4 + LOOK.x * r * 0.09 - r * 0.07;
    const ey = HEAD_Y - r * 0.09 + LOOK.y * r * 0.09;
    dot(ctx, hx(ex, ey), hy(ex, ey), Math.max(0.6, r * 0.07 * K.h));
  }
  ctx.fill();
}

/** A tiny mouth: a small dark "o" (surprised, looking up) or a short wavering line. */
function mouth(ctx: Ctx): void {
  const r = HEAD_R;
  const my = HEAD_Y + r * 0.52;
  ctx.beginPath();
  if (LOOK.o) {
    oval(ctx, hx(0, my), hy(0, my), r * 0.07 * K.h, r * 0.09 * K.h);
    ctx.fillStyle = INK;
    ctx.fill();
    return;
  }
  ctx.moveTo(hx(-r * 0.14, my), hy(-r * 0.14, my));
  ctx.quadraticCurveTo(hx(-r * 0.05, my + r * 0.06), hy(-r * 0.05, my + r * 0.06), hx(0.0, my), hy(0, my));
  ctx.quadraticCurveTo(hx(r * 0.06, my - r * 0.05), hy(r * 0.06, my - r * 0.05), hx(r * 0.13, my + r * 0.02), hy(r * 0.13, my + r * 0.02));
  line(ctx, INK, Math.max(0.7, K.lw * 0.55));
}

/** Thin arms from the shoulders to small pale hands. */
function arms(ctx: Ctx, sx: number, sy: number, ax: number, ay: number, bx: number, by: number, sleeve: string, hand = SKIN): void {
  ctx.beginPath();
  ctx.moveTo(X(sx), Y(sy));
  ctx.quadraticCurveTo(X((sx + ax) / 2 + 0.02 * Math.sign(ax)), Y((sy + ay) / 2 + 0.03), X(ax), Y(ay));
  ctx.moveTo(X(-sx), Y(sy));
  ctx.quadraticCurveTo(X((-sx + bx) / 2 + 0.02 * Math.sign(bx)), Y((sy + by) / 2 + 0.03), X(bx), Y(by));
  line(ctx, INK, 0.05 * K.h + K.lw * 1.6);
  line(ctx, sleeve, 0.05 * K.h);
  ctx.beginPath();
  dot(ctx, X(ax), Y(ay), 0.034 * K.h);
  dot(ctx, X(bx), Y(by), 0.034 * K.h);
  ctx.fillStyle = hand;
  ctx.fill();
}

/** A stitched candy bag hanging from the hand at (hx, hy), swung by `swing` radians. */
function bag(ctx: Ctx, kind: "pail" | "sack", fill: string, hxL: number, hyL: number, swing: number): void {
  const len = 0.19;
  const bx = hxL + Math.sin(swing) * len;
  const by = hyL + Math.cos(swing) * len;
  if (kind === "pail") {
    // A jack-o'-lantern pail on a wire handle, its face carved and stitched across.
    ctx.beginPath();
    ctx.moveTo(X(bx - 0.1), Y(by - 0.01));
    ctx.quadraticCurveTo(X(hxL), Y(hyL - 0.05), X(bx + 0.1), Y(by - 0.01));
    line(ctx, INK, Math.max(0.8, K.lw * 0.7));
    ctx.beginPath();
    ovalK(ctx, bx, by + 0.05, 0.12, 0.1);
    fillInk(ctx, PUMPKIN, K.lw * 0.8);
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) {
      ctx.moveTo(X(bx + sd * 0.075), Y(by + 0.04));
      ctx.lineTo(X(bx + sd * 0.02), Y(by + 0.045));
      ctx.lineTo(X(bx + sd * 0.05), Y(by - 0.005));
      ctx.closePath();
    }
    ctx.moveTo(X(bx - 0.07), Y(by + 0.08));
    ctx.lineTo(X(bx - 0.035), Y(by + 0.1));
    ctx.lineTo(X(bx), Y(by + 0.08));
    ctx.lineTo(X(bx + 0.035), Y(by + 0.1));
    ctx.lineTo(X(bx + 0.07), Y(by + 0.08));
    ctx.quadraticCurveTo(X(bx), Y(by + 0.15), X(bx - 0.07), Y(by + 0.08));
    ctx.closePath();
    ctx.fill();
    return;
  }
  // A sack gathered at the hand, bulging, a seam stitched up its side.
  ctx.beginPath();
  ctx.moveTo(X(hxL - 0.025), Y(hyL + 0.02));
  ctx.quadraticCurveTo(X(bx - 0.16), Y(by - 0.03), X(bx - 0.09), Y(by + 0.12));
  ctx.quadraticCurveTo(X(bx), Y(by + 0.165), X(bx + 0.09), Y(by + 0.12));
  ctx.quadraticCurveTo(X(bx + 0.16), Y(by - 0.03), X(hxL + 0.025), Y(hyL + 0.02));
  ctx.closePath();
  fillInk(ctx, fill, K.lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(X(hxL - 0.04), Y(hyL + 0.045));
  ctx.lineTo(X(hxL + 0.04), Y(hyL + 0.045));
  for (let i = 0; i < 2; i++) {
    const y = by + 0.02 + i * 0.05;
    const x = bx + 0.045;
    ctx.moveTo(X(x - 0.018), Y(y - 0.012));
    ctx.lineTo(X(x + 0.018), Y(y + 0.012));
    ctx.moveTo(X(x + 0.018), Y(y - 0.012));
    ctx.lineTo(X(x - 0.018), Y(y + 0.012));
  }
  line(ctx, INK, Math.max(0.7, K.lw * 0.55));
}

// ---------------------------------------------------------------- costumes

function witch(ctx: Ctx, t: number, k: Kid, swing: number): void {
  legs(ctx, STRIPE_WHITE, STRIPE_BLACK, NIGHT);
  // A narrow patched dress flaring to a ragged hem.
  ctx.beginPath();
  ctx.moveTo(X(-0.1), Y(-0.57));
  ctx.lineTo(X(0.1), Y(-0.57));
  ctx.quadraticCurveTo(X(0.14), Y(-0.4), X(0.25), Y(-0.21));
  ctx.lineTo(X(0.19), Y(-0.24));
  ctx.lineTo(X(0.15), Y(-0.17));
  ctx.lineTo(X(0.09), Y(-0.23));
  ctx.lineTo(X(0.02), Y(-0.16));
  ctx.lineTo(X(-0.05), Y(-0.23));
  ctx.lineTo(X(-0.11), Y(-0.17));
  ctx.lineTo(X(-0.17), Y(-0.24));
  ctx.lineTo(X(-0.25), Y(-0.2));
  ctx.quadraticCurveTo(X(-0.14), Y(-0.4), X(-0.1), Y(-0.57));
  ctx.closePath();
  fillInk(ctx, PURPLE);
  // Shade down its far side, and a stitched patch.
  ctx.fillStyle = PURPLE_DEEP;
  ctx.beginPath();
  ctx.moveTo(X(0.05), Y(-0.56));
  ctx.lineTo(X(0.1), Y(-0.56));
  ctx.quadraticCurveTo(X(0.14), Y(-0.4), X(0.24), Y(-0.22));
  ctx.lineTo(X(0.15), Y(-0.19));
  ctx.quadraticCurveTo(X(0.1), Y(-0.38), X(0.05), Y(-0.56));
  ctx.closePath();
  ctx.rect(X(-0.13), Y(-0.36), 0.08 * K.h, 0.08 * K.h);
  ctx.fill();
  const hxL = k.hand * 0.25;
  arms(ctx, k.hand * 0.09, -0.54, hxL, -0.36, -k.hand * 0.23, -0.33, PURPLE);
  bag(ctx, "pail", PUMPKIN, hxL, -0.36, swing);
  // Long black hair, stringy, flaring out from under the hat.
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(hx(sd * 0.16, -0.9), hy(sd * 0.16, -0.9));
    ctx.quadraticCurveTo(hx(sd * 0.3, -0.72), hy(sd * 0.3, -0.72), hx(sd * 0.27, -0.55), hy(sd * 0.27, -0.55));
    ctx.lineTo(hx(sd * 0.22, -0.6), hy(sd * 0.22, -0.6));
    ctx.lineTo(hx(sd * 0.21, -0.53), hy(sd * 0.21, -0.53));
    ctx.quadraticCurveTo(hx(sd * 0.2, -0.7), hy(sd * 0.2, -0.7), hx(sd * 0.1, -0.85), hy(sd * 0.1, -0.85));
    ctx.closePath();
  }
  fillInk(ctx, NIGHT, K.lw * 0.8);
  head(ctx);
  eyes(ctx);
  mouth(ctx);
  // The crooked hat: a cone bent toward the tower, its tip curling into a spiral, a red band.
  const lean = k.X < 0 ? 1 : -1;
  const flop = 0.025 * Math.sin(t * 3 + k.phase);
  hat(ctx, lean, flop);
}

/** The witch's hat, drawn in head space so it turns with her glance. */
function hat(ctx: Ctx, lean: number, flop: number): void {
  const tx = (0.12 + flop) * lean;
  const ty = -1.29;
  ctx.beginPath();
  hM(ctx, -0.16, -0.9);
  hQ(ctx, -0.06 * lean, -1.16, tx, ty);
  // The spiral curl at the tip.
  hQ(ctx, tx + 0.1 * lean, -1.37, tx + 0.15 * lean, -1.32);
  hQ(ctx, tx + 0.17 * lean, -1.25, tx + 0.11 * lean, -1.25);
  hQ(ctx, tx + 0.08 * lean, -1.28, tx + 0.1 * lean, -1.295);
  hQ(ctx, tx + 0.06 * lean, -1.3, tx + 0.03 * lean, -1.22);
  hQ(ctx, 0.1 * lean, -1.1, 0.16, -0.9);
  ctx.closePath();
  fillInk(ctx, NIGHT);
  // Moonlight along its upper-left slope.
  ctx.beginPath();
  hM(ctx, -0.12, -0.95);
  hQ(ctx, -0.04 * lean, -1.14, tx - 0.01 * lean, ty + 0.05);
  line(ctx, MOON_RIM, Math.max(0.7, K.lw * 0.5));
  // Band and a crooked brim.
  ctx.beginPath();
  hM(ctx, -0.16, -0.92);
  hL(ctx, 0.16, -0.92);
  hL(ctx, 0.145, -0.99);
  hL(ctx, -0.14, -0.99);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, hx(0, -0.885), hy(0, -0.885), 0.31 * K.h, 0.055 * K.h, LOOK.tilt - 0.08 * lean);
  fillInk(ctx, NIGHT);
}

function skeleton(ctx: Ctx, _t: number, k: Kid, swing: number): void {
  legs(ctx, STRIPE_BLACK, BONE, NIGHT);
  // A black suit painted with ribs, spine and hips.
  ctx.beginPath();
  ctx.moveTo(X(-0.12), Y(-0.57));
  ctx.lineTo(X(0.12), Y(-0.57));
  ctx.quadraticCurveTo(X(0.15), Y(-0.4), X(0.12), Y(-0.25));
  ctx.lineTo(X(-0.12), Y(-0.25));
  ctx.quadraticCurveTo(X(-0.15), Y(-0.4), X(-0.12), Y(-0.57));
  ctx.closePath();
  fillInk(ctx, STRIPE_BLACK);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(-0.55));
  ctx.lineTo(X(0), Y(-0.31));
  for (let i = 0; i < 3; i++) {
    const y = -0.51 + i * 0.065;
    const w = 0.09 - i * 0.012;
    ctx.moveTo(X(-w), Y(y + 0.025));
    ctx.quadraticCurveTo(X(-w * 0.5), Y(y - 0.02), X(0), Y(y));
    ctx.quadraticCurveTo(X(w * 0.5), Y(y - 0.02), X(w), Y(y + 0.025));
  }
  ctx.moveTo(X(-0.075), Y(-0.27));
  ctx.quadraticCurveTo(X(0), Y(-0.33), X(0.075), Y(-0.27));
  // Thigh bones down the legs.
  ctx.moveTo(X(-0.072), Y(-0.24));
  ctx.lineTo(X(-0.076), Y(-0.15));
  ctx.moveTo(X(0.072), Y(-0.24));
  ctx.lineTo(X(0.076), Y(-0.15));
  line(ctx, BONE, Math.max(0.8, 0.024 * K.h));
  const hxL = k.hand * 0.25;
  arms(ctx, k.hand * 0.1, -0.54, hxL, -0.34, -k.hand * 0.22, -0.32, STRIPE_BLACK, BONE);
  bag(ctx, "sack", STRIPE_WHITE, hxL, -0.34, swing);
  // A black hood, and the face painted as a skull: deep sockets, a nose, a stitched grin.
  ctx.beginPath();
  oval(ctx, hx(0, HEAD_Y + 0.01), hy(0, HEAD_Y + 0.01), (HEAD_R + 0.04) * K.h, (HEAD_R + 0.008) * K.h, LOOK.tilt);
  fillInk(ctx, STRIPE_BLACK);
  head(ctx, BONE, BONE_SHADE);
  eyes(ctx, INK, 1.15);
  const r = HEAD_R;
  ctx.fillStyle = INK;
  ctx.beginPath();
  const nx = 0;
  const ny = HEAD_Y + r * 0.3;
  ctx.moveTo(hx(nx, ny - r * 0.06), hy(nx, ny - r * 0.06));
  ctx.lineTo(hx(nx - r * 0.08, ny + r * 0.1), hy(nx - r * 0.08, ny + r * 0.1));
  ctx.lineTo(hx(nx + r * 0.08, ny + r * 0.1), hy(nx + r * 0.08, ny + r * 0.1));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  const my = HEAD_Y + r * 0.56;
  ctx.moveTo(hx(-r * 0.45, my - r * 0.06), hy(-r * 0.45, my - r * 0.06));
  ctx.quadraticCurveTo(hx(0, my + r * 0.12), hy(0, my + r * 0.12), hx(r * 0.45, my - r * 0.06), hy(r * 0.45, my - r * 0.06));
  for (let i = -2; i <= 2; i++) {
    const x = i * r * 0.17;
    const yy = my + r * 0.04 - Math.abs(i) * r * 0.025;
    ctx.moveTo(hx(x, yy - r * 0.09), hy(x, yy - r * 0.09));
    ctx.lineTo(hx(x, yy + r * 0.09), hy(x, yy + r * 0.09));
  }
  line(ctx, INK, Math.max(0.7, K.lw * 0.55));
}

function cat(ctx: Ctx, t: number, k: Kid, swing: number): void {
  // The tail first, behind: out from the rump and curling up into a spiral, swishing.
  const sw = 0.05 * Math.sin(t * 2.6 + k.phase);
  ctx.beginPath();
  ctx.moveTo(X(0.08), Y(-0.29));
  ctx.bezierCurveTo(X(0.3), Y(-0.28), X(0.4 + sw), Y(-0.45), X(0.37 + sw), Y(-0.6));
  ctx.bezierCurveTo(X(0.35 + sw), Y(-0.7), X(0.26 + sw), Y(-0.71), X(0.25 + sw), Y(-0.64));
  ctx.bezierCurveTo(X(0.24 + sw), Y(-0.58), X(0.31 + sw), Y(-0.58), X(0.31 + sw), Y(-0.63));
  line(ctx, INK, 0.045 * K.h + K.lw * 1.6);
  line(ctx, NIGHT, 0.045 * K.h);
  legs(ctx, STRIPE_BLACK, STRIPE_WHITE, NIGHT);
  ctx.beginPath();
  ctx.moveTo(X(-0.11), Y(-0.57));
  ctx.lineTo(X(0.11), Y(-0.57));
  ctx.quadraticCurveTo(X(0.17), Y(-0.38), X(0.13), Y(-0.25));
  ctx.lineTo(X(-0.13), Y(-0.25));
  ctx.quadraticCurveTo(X(-0.17), Y(-0.38), X(-0.11), Y(-0.57));
  ctx.closePath();
  fillInk(ctx, NIGHT);
  // Moonlight down its left side, and a pale stitched belly patch.
  ctx.beginPath();
  ctx.moveTo(X(-0.095), Y(-0.54));
  ctx.quadraticCurveTo(X(-0.15), Y(-0.38), X(-0.115), Y(-0.28));
  line(ctx, MOON_RIM, Math.max(0.7, K.lw * 0.55));
  const hxL = k.hand * 0.25;
  arms(ctx, k.hand * 0.09, -0.54, hxL, -0.36, -k.hand * 0.22, -0.35, NIGHT);
  bag(ctx, "sack", RED, hxL, -0.36, swing);
  // The hood with tall pointed ears, then the pale face peeking out of it.
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(hx(sd * 0.2, -0.86), hy(sd * 0.2, -0.86));
    ctx.lineTo(hx(sd * 0.2, -1.06), hy(sd * 0.2, -1.06));
    ctx.lineTo(hx(sd * 0.06, -0.93), hy(sd * 0.06, -0.93));
    ctx.closePath();
  }
  oval(ctx, hx(0, HEAD_Y + 0.01), hy(0, HEAD_Y + 0.01), (HEAD_R + 0.035) * K.h, (HEAD_R + 0.01) * K.h, LOOK.tilt);
  fillInk(ctx, NIGHT);
  ctx.fillStyle = PURPLE_DEEP;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(hx(sd * 0.185, -0.9), hy(sd * 0.185, -0.9));
    ctx.lineTo(hx(sd * 0.19, -1.01), hy(sd * 0.19, -1.01));
    ctx.lineTo(hx(sd * 0.1, -0.93), hy(sd * 0.1, -0.93));
    ctx.closePath();
  }
  ctx.fill();
  head(ctx);
  eyes(ctx);
  // A painted nose and whiskers.
  const r = HEAD_R;
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, hx(0, HEAD_Y + r * 0.32), hy(0, HEAD_Y + r * 0.32), r * 0.1 * K.h, r * 0.07 * K.h);
  ctx.fill();
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(hx(sd * r * 0.25, HEAD_Y + r * 0.4), hy(sd * r * 0.25, HEAD_Y + r * 0.4));
    ctx.lineTo(hx(sd * r * 0.85, HEAD_Y + r * 0.3), hy(sd * r * 0.85, HEAD_Y + r * 0.3));
    ctx.moveTo(hx(sd * r * 0.25, HEAD_Y + r * 0.5), hy(sd * r * 0.25, HEAD_Y + r * 0.5));
    ctx.lineTo(hx(sd * r * 0.8, HEAD_Y + r * 0.58), hy(sd * r * 0.8, HEAD_Y + r * 0.58));
  }
  line(ctx, INK, Math.max(0.6, K.lw * 0.4));
  mouth(ctx);
}

function pumpkin(ctx: Ctx, _t: number, k: Kid, swing: number): void {
  legs(ctx, MOSS, STRIPE_BLACK, NIGHT);
  const hxL = k.hand * 0.3;
  // The round pumpkin suit: ribbed, its seams stitched, a grin carved on its belly.
  ctx.beginPath();
  ovalK(ctx, 0, -0.41, 0.26, 0.22);
  fillInk(ctx, PUMPKIN);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    for (let sd = -1; sd <= 1; sd += 2) {
      const y = -0.54 + i * 0.085;
      const x = sd * (0.12 + 0.02 * Math.sin(i * 1.3));
      ctx.moveTo(X(x - 0.025), Y(y));
      ctx.lineTo(X(x + 0.025), Y(y + 0.01));
    }
  }
  line(ctx, STITCH, Math.max(0.6, K.lw * 0.45));
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.15), Y(-0.43));
    ctx.lineTo(X(sd * 0.04), Y(-0.44));
    ctx.lineTo(X(sd * 0.11), Y(-0.51));
    ctx.closePath();
  }
  ctx.moveTo(X(-0.15), Y(-0.36));
  ctx.lineTo(X(-0.09), Y(-0.34));
  ctx.lineTo(X(-0.06), Y(-0.37));
  ctx.lineTo(X(-0.02), Y(-0.33));
  ctx.lineTo(X(0.03), Y(-0.37));
  ctx.lineTo(X(0.07), Y(-0.33));
  ctx.lineTo(X(0.1), Y(-0.37));
  ctx.lineTo(X(0.15), Y(-0.36));
  ctx.quadraticCurveTo(X(0), Y(-0.24), X(-0.15), Y(-0.36));
  ctx.closePath();
  ctx.fill();
  arms(ctx, k.hand * 0.2, -0.5, hxL, -0.34, -k.hand * 0.28, -0.33, MOSS);
  bag(ctx, "sack", PURPLE, hxL, -0.34, swing);
  // A ragged leaf collar, the head, and a stem cap curling at its tip.
  ctx.beginPath();
  ctx.moveTo(X(-0.16), Y(-0.6));
  for (let i = 0; i <= 6; i++) ctx.lineTo(X(-0.16 + i * 0.053), Y(i % 2 ? -0.53 : -0.61));
  ctx.lineTo(X(0.16), Y(-0.63));
  ctx.lineTo(X(-0.16), Y(-0.63));
  ctx.closePath();
  fillInk(ctx, MOSS, K.lw * 0.8);
  head(ctx);
  eyes(ctx);
  mouth(ctx);
  ctx.beginPath();
  ctx.moveTo(hx(-0.21, -0.79), hy(-0.21, -0.79));
  ctx.quadraticCurveTo(hx(-0.2, -0.99), hy(-0.2, -0.99), hx(0, -0.99), hy(0, -0.99));
  ctx.quadraticCurveTo(hx(0.2, -0.99), hy(0.2, -0.99), hx(0.21, -0.79), hy(0.21, -0.79));
  ctx.quadraticCurveTo(hx(0, -0.86), hy(0, -0.86), hx(-0.21, -0.79), hy(-0.21, -0.79));
  ctx.closePath();
  fillInk(ctx, MOSS, K.lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(hx(-0.02, -0.97), hy(-0.02, -0.97));
  ctx.quadraticCurveTo(hx(-0.02, -1.07), hy(-0.02, -1.07), hx(0.07, -1.09), hy(0.07, -1.09));
  ctx.quadraticCurveTo(hx(0.14, -1.1), hy(0.14, -1.1), hx(0.13, -1.05), hy(0.13, -1.05));
  ctx.quadraticCurveTo(hx(0.11, -1.02), hy(0.11, -1.02), hx(0.09, -1.05), hy(0.09, -1.05));
  line(ctx, INK, 0.035 * K.h + K.lw * 1.4);
  line(ctx, MOSS, 0.035 * K.h);
}

/** The cape's trailing edge flapping in the wind. */
function flutter(t: number, phase: number, i: number): number {
  return 0.03 * Math.sin(t * 6 + phase + i * 1.4);
}

function hero(ctx: Ctx, t: number, k: Kid, swing: number): void {
  // A tattered cape behind, streaming out away from the tower, a star stitched on it.
  const f0 = flutter(t, k.phase, 0);
  const f1 = flutter(t, k.phase, 1);
  const f2 = flutter(t, k.phase, 2);
  const f3 = flutter(t, k.phase, 3);
  const d = k.X < 0 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(X(-0.13 * d), Y(-0.6));
  ctx.lineTo(X(0.13 * d), Y(-0.6));
  ctx.quadraticCurveTo(X(0.22 * d), Y(-0.42), X((0.29 + f0) * d), Y(-0.22 + f1));
  ctx.lineTo(X((0.23 + f2) * d), Y(-0.24));
  ctx.lineTo(X((0.2 + f2) * d), Y(-0.15));
  ctx.lineTo(X(0.14 * d), Y(-0.23 + f3));
  ctx.lineTo(X(0.08 * d), Y(-0.16));
  ctx.lineTo(X(0.02 * d), Y(-0.22));
  ctx.lineTo(X(-0.06 * d), Y(-0.17));
  ctx.lineTo(X(-0.15 * d), Y(-0.21));
  ctx.closePath();
  fillInk(ctx, RED);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.022 : 0.05;
    const px = X((0.2 + f0 * 0.5) * d + Math.cos(a) * r);
    const py = Y(-0.36 + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  line(ctx, GOLD, Math.max(0.6, K.lw * 0.5));
  legs(ctx, BLUE, STRIPE_BLACK, RED);
  ctx.beginPath();
  ctx.moveTo(X(-0.11), Y(-0.58));
  ctx.lineTo(X(0.11), Y(-0.58));
  ctx.quadraticCurveTo(X(0.14), Y(-0.4), X(0.12), Y(-0.25));
  ctx.lineTo(X(-0.12), Y(-0.25));
  ctx.quadraticCurveTo(X(-0.14), Y(-0.4), X(-0.11), Y(-0.58));
  ctx.closePath();
  fillInk(ctx, BLUE);
  // A stitched star on the chest, a belt, the cape's collar.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.028 : 0.065;
    const px = X(Math.cos(a) * r);
    const py = Y(-0.44 + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  fillInk(ctx, GOLD, K.lw * 0.55);
  ctx.beginPath();
  ctx.rect(X(-0.125), Y(-0.31), 0.25 * K.h, 0.045 * K.h);
  ctx.fillStyle = STRIPE_BLACK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.15), Y(-0.61));
  ctx.quadraticCurveTo(X(0), Y(-0.53), X(0.15), Y(-0.61));
  ctx.lineTo(X(0.11), Y(-0.55));
  ctx.quadraticCurveTo(X(0), Y(-0.5), X(-0.11), Y(-0.55));
  ctx.closePath();
  fillInk(ctx, RED, K.lw * 0.7);
  // One fist pumped up now and then, the other hand holding the bag.
  const pump = Math.max(0, Math.sin(t * 1.3 + k.phase));
  const fy = -0.7 - pump * 0.2;
  const hxL = k.hand * 0.25;
  arms(ctx, k.hand * 0.1, -0.54, hxL, -0.36, -k.hand * 0.18, fy, BLUE);
  bag(ctx, "sack", BONE, hxL, -0.36, swing);
  head(ctx);
  // Messy dark hair over the brow, then the domino mask with the eyes looking out of it.
  ctx.beginPath();
  ctx.moveTo(hx(-0.21, -0.78), hy(-0.21, -0.78));
  ctx.quadraticCurveTo(hx(-0.2, -1.0), hy(-0.2, -1.0), hx(0.02, -0.99), hy(0.02, -0.99));
  ctx.lineTo(hx(-0.01, -1.01), hy(-0.01, -1.01));
  ctx.quadraticCurveTo(hx(0.12, -1.0), hy(0.12, -1.0), hx(0.15, -0.96), hy(0.15, -0.96));
  ctx.lineTo(hx(0.19, -0.98), hy(0.19, -0.98));
  ctx.quadraticCurveTo(hx(0.24, -0.88), hy(0.24, -0.88), hx(0.21, -0.78), hy(0.21, -0.78));
  ctx.lineTo(hx(0.12, -0.84), hy(0.12, -0.84));
  ctx.lineTo(hx(0.06, -0.8), hy(0.06, -0.8));
  ctx.lineTo(hx(0.0, -0.85), hy(0.0, -0.85));
  ctx.lineTo(hx(-0.08, -0.81), hy(-0.08, -0.81));
  ctx.lineTo(hx(-0.13, -0.85), hy(-0.13, -0.85));
  ctx.closePath();
  fillInk(ctx, NIGHT, K.lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(hx(-0.215, -0.79), hy(-0.215, -0.79));
  ctx.quadraticCurveTo(hx(0, -0.83), hy(0, -0.83), hx(0.215, -0.79), hy(0.215, -0.79));
  ctx.lineTo(hx(0.2, -0.7), hy(0.2, -0.7));
  ctx.quadraticCurveTo(hx(0, -0.73), hy(0, -0.73), hx(-0.2, -0.7), hy(-0.2, -0.7));
  ctx.closePath();
  ctx.fillStyle = STRIPE_BLACK;
  ctx.fill();
  eyes(ctx, STRIPE_BLACK);
  mouth(ctx);
}

const DRAW = { witch, skeleton, cat, pumpkin, hero } as const;

/**
 * Now and then a little hop of excitement (0..1, the bag swings with it): every kid hops every
 * 3.7 s, each at its own `phase`, so all of them have hopped in the opening seconds.
 */
export function hopAt(t: number, phase: number): number {
  const c = Math.sin(t * 1.7 + phase);
  return c > 0.75 ? Math.sin(((c - 0.75) / 0.25) * Math.PI * 0.5) : 0;
}

/** How far the kids are glancing up at a floor that just landed (0..1), `sinceLand` seconds after it. */
export function glanceAt(sinceLand: number): number {
  return bump(0, 0.07, 0.3, 0.45, sinceLand);
}

/**
 * Kid `i` of KIDS at foot spot (x, y), `h` px tall (before the hop), at time t, ink `lw`,
 * glancing up at the tower by `glance` (0..1).
 */
export function kid(ctx: Ctx, i: number, x: number, y: number, h: number, t: number, lw: number, glance: number): void {
  const k = KIDS[i]!;
  const hop = hopAt(t, k.phase);
  K.h = h;
  K.x = x;
  K.y = y - hop * h * 0.07;
  K.lw = lw;
  // Toward the tower: the kids on the left look right, the hero looks left; up, mouths open.
  const toward = k.X < 0 ? 1 : -1;
  LOOK.x = 0.5 * Math.sin(t * 0.7 + k.phase * 2) * (1 - glance) + toward * glance;
  LOOK.y = 0.25 * Math.sin(t * 0.5 + k.phase) * (1 - glance) - glance;
  LOOK.tilt = -toward * 0.07 * glance;
  LOOK.c = Math.cos(LOOK.tilt);
  LOOK.n = Math.sin(LOOK.tilt);
  LOOK.lift = 0;
  LOOK.o = glance > 0.3;
  const swing = 0.22 * Math.sin(t * 2.4 + k.phase) * k.hand + hop * 0.3 * k.hand;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  DRAW[k.costume](ctx, t, k, swing);
}

/** Both groups of trick-or-treaters, back to front. */
export function kids(ctx: Ctx, s: Scene): void {
  const t = s.t;
  // Soft shadows under all of them, in one fill
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  for (const k of KIDS) {
    const p = spot(s, k.X, k.z);
    const h = HEIGHT * s.u * p.k;
    oval(ctx, p.x, p.y, h * 0.24, h * 0.05);
  }
  ctx.fill();
  const glance = s.still ? glanceAt(s.sinceLand ?? Infinity) * 0.5 : glanceAt(s.sinceLand ?? Infinity);
  for (let i = 0; i < KIDS.length; i++) {
    const k = KIDS[i]!;
    const p = spot(s, k.X, k.z);
    const h = HEIGHT * s.u * p.k;
    if (p.y - h * 1.5 > s.cssH) continue;
    kid(ctx, i, p.x, p.y, h, t, inkW(s, p.k), glance);
  }
}

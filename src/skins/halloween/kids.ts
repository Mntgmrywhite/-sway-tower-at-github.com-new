import { circle, ink, inkedLine, mix, outlined, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BLACK_SUIT,
  BLACK_SUIT_LIGHT,
  BONE,
  CAPE,
  CAPE_DARK,
  CARVED,
  CHEEK,
  HERO,
  HERO_LIGHT,
  INK,
  inkW,
  KRAFT,
  LEAF_GREEN,
  ORANGE,
  ORANGE_DARK,
  ORANGE_LIGHT,
  PILLOWCASE,
  PINK,
  SKIN,
  spot,
  STAR_GOLD,
  STEM,
  WITCH,
  WITCH_DARK,
} from "./common";

// Trick-or-treaters in classic homemade costumes, our own chibi designs: a witch, a
// skeleton, a black cat, a pumpkin and a caped superhero, each clutching a candy bag. They
// stand in two little groups on the sidewalk either side of the tower, bouncing with
// excitement now and then, bags swinging, the cape and the cat's tail flicking in the wind.
// Ink-outlined, flat fills, lit from the upper left.
//
// Local units: feet at y = 0, the top of the head at y = -1 (hats and ears go higher), x to
// the right, all scaled by the kid's height.

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
const HEIGHT = 0.15;

// Left group (back to front), then the right group. Positions keep every kid between the
// tower's column and the screen edge, below the houses and above the graves.
const KIDS: readonly Kid[] = [
  { costume: "cat", X: -0.44 * (3.42 / 3), z: 3.42, hand: 1, phase: 0.3 },
  { costume: "skeleton", X: -0.37 * (3.36 / 3), z: 3.36, hand: 1, phase: 4.0 },
  { costume: "witch", X: -0.3 * (3.3 / 3), z: 3.3, hand: -1, phase: 2.1 },
  { costume: "hero", X: 0.445 * (3.42 / 3), z: 3.42, hand: -1, phase: 3.3 },
  { costume: "pumpkin", X: 0.376 * (3.36 / 3), z: 3.36, hand: 1, phase: 1.2 },
];

const SHOE = "#4a3a5e";
const HAIR_RED = "#e2662e";
const HAIR_BROWN = "#7a4a2e";
const PURPLE_BAG = "#7d4fd0";
const TIGHTS_GREEN = mix(LEAF_GREEN, INK, 0.25);
const SHADOW = "rgba(42, 31, 61, 0.28)";

/** Scratch transform for the kid being drawn: local units to the screen. */
const K = { x: 0, y: 0, h: 0, lw: 1 };
const X = (lx: number) => K.x + lx * K.h;
const Y = (ly: number) => K.y + ly * K.h;

function ovalK(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  oval(ctx, X(x), Y(y), rx * K.h, ry * K.h, rot);
}

function legs(ctx: Ctx, color: string, shoe: string): void {
  ctx.beginPath();
  ctx.moveTo(X(-0.085), Y(-0.26));
  ctx.lineTo(X(-0.085), Y(-0.05));
  ctx.moveTo(X(0.085), Y(-0.26));
  ctx.lineTo(X(0.085), Y(-0.05));
  inkedLine(ctx, color, 0.08 * K.h, K.lw * 0.8, INK);
  ctx.beginPath();
  ovalK(ctx, -0.1, -0.035, 0.085, 0.045);
  ovalK(ctx, 0.1, -0.035, 0.085, 0.045);
  outlined(ctx, shoe, K.lw * 0.8, INK);
}

function head(ctx: Ctx, color = SKIN): void {
  ctx.beginPath();
  circle(ctx, X(0), Y(-0.76), 0.2 * K.h);
  outlined(ctx, color, K.lw, INK);
}

/** Dot eyes, rosy cheeks and a grin; `cheeks` off for masks. */
function face(ctx: Ctx, cheeks = true): void {
  if (cheeks) {
    ctx.fillStyle = CHEEK;
    ctx.beginPath();
    ovalK(ctx, -0.12, -0.69, 0.04, 0.025);
    ovalK(ctx, 0.12, -0.69, 0.04, 0.025);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, X(-0.07), Y(-0.75), 0.026 * K.h);
  circle(ctx, X(0.07), Y(-0.75), 0.026 * K.h);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(0), Y(-0.7), 0.06 * K.h, 0.2 * Math.PI, 0.8 * Math.PI);
  ink(ctx, Math.max(0.8, K.lw * 0.6), INK);
}

/** An arm from the shoulder to the hand, as an inked sleeve with a hand on the end. */
function arm(ctx: Ctx, sx: number, sy: number, hx: number, hy: number, sleeve: string, hand = SKIN): void {
  ctx.beginPath();
  ctx.moveTo(X(sx), Y(sy));
  ctx.lineTo(X(hx), Y(hy));
  inkedLine(ctx, sleeve, 0.075 * K.h, K.lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, X(hx), Y(hy), 0.045 * K.h);
  outlined(ctx, hand, K.lw * 0.7, INK);
}

/** Both arms at once (shoulders a and b to hands a and b), one inked path and one for the hands. */
function arms(
  ctx: Ctx,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  hy2: number,
  hx2: number,
  sleeve: string,
  hand = SKIN,
): void {
  ctx.beginPath();
  ctx.moveTo(X(sx), Y(sy));
  ctx.lineTo(X(hx), Y(hy));
  ctx.moveTo(X(-sx), Y(sy));
  ctx.lineTo(X(hx2), Y(hy2));
  inkedLine(ctx, sleeve, 0.075 * K.h, K.lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, X(hx), Y(hy), 0.045 * K.h);
  circle(ctx, X(hx2), Y(hy2), 0.045 * K.h);
  outlined(ctx, hand, K.lw * 0.7, INK);
}

/** The candy bag hanging from the hand at (hx, hy), swung by `swing` radians. */
function bag(ctx: Ctx, kind: "pail" | "sack" | "paper" | "purple", hx: number, hy: number, swing: number): void {
  const L = 0.2;
  const bx = hx + Math.sin(swing) * L;
  const by = hy + Math.cos(swing) * L;
  if (kind === "pail") {
    ctx.beginPath();
    ctx.moveTo(X(hx), Y(hy));
    ctx.lineTo(X(bx - 0.1), Y(by - 0.04));
    ctx.moveTo(X(hx), Y(hy));
    ctx.lineTo(X(bx + 0.1), Y(by - 0.04));
    ink(ctx, Math.max(0.8, K.lw * 0.7), INK);
    ctx.beginPath();
    ovalK(ctx, bx, by + 0.05, 0.13, 0.11);
    outlined(ctx, ORANGE, K.lw * 0.8, INK);
    ctx.fillStyle = ORANGE_LIGHT;
    ctx.beginPath();
    ovalK(ctx, bx - 0.05, by + 0.01, 0.04, 0.025, -0.4);
    ctx.fill();
    ctx.fillStyle = CARVED;
    ctx.beginPath();
    for (let sd = -1; sd <= 1; sd += 2) {
      ctx.moveTo(X(bx + sd * 0.07), Y(by + 0.05));
      ctx.lineTo(X(bx + sd * 0.02), Y(by + 0.05));
      ctx.lineTo(X(bx + sd * 0.045), Y(by + 0.0));
      ctx.closePath();
    }
    ctx.moveTo(X(bx - 0.07), Y(by + 0.08));
    ctx.lineTo(X(bx + 0.07), Y(by + 0.08));
    ctx.quadraticCurveTo(X(bx), Y(by + 0.15), X(bx - 0.07), Y(by + 0.08));
    ctx.closePath();
    ctx.fill();
    return;
  }
  // Sacks: a bulging bag gathered at the hand
  const fill = kind === "sack" ? PILLOWCASE : kind === "paper" ? KRAFT : PURPLE_BAG;
  ctx.beginPath();
  if (kind === "paper") {
    ctx.moveTo(X(hx - 0.09), Y(hy + 0.02));
    ctx.lineTo(X(hx + 0.09), Y(hy + 0.02));
    ctx.lineTo(X(bx + 0.11), Y(by + 0.12));
    ctx.lineTo(X(bx - 0.11), Y(by + 0.12));
    ctx.closePath();
  } else {
    ctx.moveTo(X(hx - 0.03), Y(hy + 0.02));
    ctx.quadraticCurveTo(X(bx - 0.17), Y(by - 0.02), X(bx - 0.1), Y(by + 0.13));
    ctx.quadraticCurveTo(X(bx), Y(by + 0.18), X(bx + 0.1), Y(by + 0.13));
    ctx.quadraticCurveTo(X(bx + 0.17), Y(by - 0.02), X(hx + 0.03), Y(hy + 0.02));
    ctx.closePath();
  }
  outlined(ctx, fill, K.lw * 0.8, INK);
  // A tie or a fold, and a candy poking out
  ctx.beginPath();
  if (kind === "paper") {
    ctx.moveTo(X(hx - 0.09), Y(hy + 0.06));
    ctx.lineTo(X(hx + 0.09), Y(hy + 0.06));
  } else {
    ctx.moveTo(X(hx - 0.045), Y(hy + 0.05));
    ctx.lineTo(X(hx + 0.045), Y(hy + 0.05));
  }
  ink(ctx, Math.max(0.8, K.lw * 0.6), kind === "sack" ? ORANGE_DARK : INK);
}

// ---------------------------------------------------------------- costumes

function witch(ctx: Ctx, t: number, k: Kid, swing: number): void {
  legs(ctx, BLACK_SUIT, SHOE);
  // Stripes on the stockings
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = -0.08 - i * 0.06;
    ctx.moveTo(X(-0.125), Y(y));
    ctx.lineTo(X(-0.045), Y(y));
    ctx.moveTo(X(0.045), Y(y));
    ctx.lineTo(X(0.125), Y(y));
  }
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = Math.max(0.8, 0.022 * K.h);
  ctx.stroke();
  // Dress with a jagged hem
  ctx.beginPath();
  ctx.moveTo(X(-0.13), Y(-0.58));
  ctx.lineTo(X(0.13), Y(-0.58));
  ctx.lineTo(X(0.27), Y(-0.22));
  for (let i = 0; i < 5; i++) ctx.lineTo(X(0.27 - (i + 0.5) * 0.108), Y(i % 2 ? -0.22 : -0.16));
  ctx.lineTo(X(-0.27), Y(-0.22));
  ctx.closePath();
  outlined(ctx, WITCH, K.lw, INK);
  ctx.fillStyle = WITCH_DARK;
  ctx.beginPath();
  ctx.moveTo(X(0.06), Y(-0.56));
  ctx.lineTo(X(0.12), Y(-0.56));
  ctx.lineTo(X(0.25), Y(-0.24));
  ctx.lineTo(X(0.14), Y(-0.22));
  ctx.closePath();
  ctx.fill();
  const hx = k.hand * 0.27;
  arms(ctx, k.hand * 0.12, -0.54, hx, -0.36, -0.34, -k.hand * 0.24, WITCH);
  bag(ctx, "pail", hx, -0.36, swing);
  // Hair under the hat, head, face
  ctx.beginPath();
  ovalK(ctx, -0.17, -0.72, 0.08, 0.14, 0.3);
  ovalK(ctx, 0.17, -0.72, 0.08, 0.14, -0.3);
  outlined(ctx, HAIR_RED, K.lw * 0.8, INK);
  head(ctx);
  face(ctx);
  // Pointy hat, its tip flopping in the wind
  const lean = k.X < 0 ? 1 : -1;
  const flop = 0.04 * Math.sin(t * 3 + k.phase);
  ctx.beginPath();
  ctx.moveTo(X(-0.17), Y(-0.86));
  ctx.quadraticCurveTo(X(-0.06 * lean), Y(-1.12), X((0.05 + flop) * lean), Y(-1.4));
  ctx.quadraticCurveTo(X(0.08 * lean), Y(-1.2), X(0.17), Y(-0.86));
  ctx.closePath();
  outlined(ctx, BLACK_SUIT, K.lw, INK);
  ctx.beginPath();
  ctx.moveTo(X(-0.15), Y(-0.92));
  ctx.lineTo(X(0.15), Y(-0.92));
  ctx.lineTo(X(0.14), Y(-0.98));
  ctx.lineTo(X(-0.13), Y(-0.98));
  ctx.closePath();
  outlined(ctx, ORANGE, K.lw * 0.6, INK);
  ctx.beginPath();
  ovalK(ctx, 0, -0.875, 0.33, 0.06);
  outlined(ctx, BLACK_SUIT, K.lw, INK);
}

function skeleton(ctx: Ctx, _t: number, k: Kid, swing: number): void {
  legs(ctx, BLACK_SUIT, SHOE);
  // Leg bones
  ctx.beginPath();
  ctx.moveTo(X(-0.085), Y(-0.25));
  ctx.lineTo(X(-0.085), Y(-0.07));
  ctx.moveTo(X(0.085), Y(-0.25));
  ctx.lineTo(X(0.085), Y(-0.07));
  ctx.strokeStyle = BONE;
  ctx.lineWidth = Math.max(0.8, 0.025 * K.h);
  ctx.lineCap = "round";
  ctx.stroke();
  // Black suit body with painted ribs, spine and pelvis
  ctx.beginPath();
  ctx.moveTo(X(-0.15), Y(-0.58));
  ctx.lineTo(X(0.15), Y(-0.58));
  ctx.lineTo(X(0.16), Y(-0.24));
  ctx.lineTo(X(-0.16), Y(-0.24));
  ctx.closePath();
  outlined(ctx, BLACK_SUIT, K.lw, INK);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(-0.56));
  ctx.lineTo(X(0), Y(-0.3));
  for (let i = 0; i < 3; i++) {
    const y = -0.52 + i * 0.07;
    const w = 0.1 - i * 0.012;
    ctx.moveTo(X(-w), Y(y + 0.02));
    ctx.quadraticCurveTo(X(0), Y(y - 0.03), X(w), Y(y + 0.02));
  }
  ctx.moveTo(X(-0.08), Y(-0.27));
  ctx.quadraticCurveTo(X(0), Y(-0.33), X(0.08), Y(-0.27));
  ctx.strokeStyle = BONE;
  ctx.lineWidth = Math.max(0.8, 0.026 * K.h);
  ctx.stroke();
  const hx = k.hand * 0.26;
  arms(ctx, k.hand * 0.13, -0.54, hx, -0.34, -0.33, -k.hand * 0.23, BLACK_SUIT, BONE);
  bag(ctx, "sack", hx, -0.34, swing);
  // Skull mask: sockets, nose, a stitched grin
  head(ctx, BONE);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ovalK(ctx, -0.075, -0.78, 0.055, 0.06);
  ovalK(ctx, 0.075, -0.78, 0.055, 0.06);
  ctx.moveTo(X(0), Y(-0.73));
  ctx.lineTo(X(-0.025), Y(-0.69));
  ctx.lineTo(X(0.025), Y(-0.69));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.08), Y(-0.64));
  ctx.lineTo(X(0.08), Y(-0.64));
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(X(i * 0.04), Y(-0.665));
    ctx.lineTo(X(i * 0.04), Y(-0.615));
  }
  ink(ctx, Math.max(0.8, K.lw * 0.55), INK);
}

function cat(ctx: Ctx, t: number, k: Kid, swing: number): void {
  // Tail first, curling up behind, swishing
  const sw = 0.08 * Math.sin(t * 2.6 + k.phase);
  ctx.beginPath();
  ctx.moveTo(X(0.08), Y(-0.28));
  ctx.bezierCurveTo(X(0.42), Y(-0.24), X(0.36 + sw), Y(-0.62), X(0.26 + sw * 1.6), Y(-0.7));
  inkedLine(ctx, BLACK_SUIT, 0.06 * K.h, K.lw * 0.8, INK);
  legs(ctx, BLACK_SUIT, BLACK_SUIT);
  ctx.beginPath();
  ctx.moveTo(X(-0.14), Y(-0.58));
  ctx.lineTo(X(0.14), Y(-0.58));
  ctx.quadraticCurveTo(X(0.2), Y(-0.36), X(0.16), Y(-0.24));
  ctx.lineTo(X(-0.16), Y(-0.24));
  ctx.quadraticCurveTo(X(-0.2), Y(-0.36), X(-0.14), Y(-0.58));
  ctx.closePath();
  outlined(ctx, BLACK_SUIT, K.lw, INK);
  ctx.fillStyle = BLACK_SUIT_LIGHT;
  ctx.beginPath();
  ovalK(ctx, 0, -0.38, 0.08, 0.11);
  ctx.fill();
  const hx = k.hand * 0.26;
  arms(ctx, k.hand * 0.12, -0.54, hx, -0.36, -0.35, -k.hand * 0.23, BLACK_SUIT);
  bag(ctx, "paper", hx, -0.36, swing);
  // Hood with ears, then the face peeking out
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.2), Y(-0.86));
    ctx.lineTo(X(sd * 0.2), Y(-1.08));
    ctx.lineTo(X(sd * 0.05), Y(-0.94));
    ctx.closePath();
  }
  outlined(ctx, BLACK_SUIT, K.lw, INK);
  ctx.fillStyle = PINK;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.17), Y(-0.9));
    ctx.lineTo(X(sd * 0.175), Y(-1.01));
    ctx.lineTo(X(sd * 0.1), Y(-0.93));
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(0), Y(-0.77), 0.215 * K.h);
  outlined(ctx, BLACK_SUIT, K.lw, INK);
  ctx.beginPath();
  circle(ctx, X(0), Y(-0.74), 0.15 * K.h);
  outlined(ctx, SKIN, K.lw * 0.7, INK);
  face(ctx, false);
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ovalK(ctx, 0, -0.705, 0.025, 0.017);
  ctx.fill();
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.06), Y(-0.69));
    ctx.lineTo(X(sd * 0.2), Y(-0.71));
    ctx.moveTo(X(sd * 0.06), Y(-0.67));
    ctx.lineTo(X(sd * 0.19), Y(-0.65));
  }
  ink(ctx, Math.max(0.6, K.lw * 0.45), INK);
}

function pumpkin(ctx: Ctx, _t: number, k: Kid, swing: number): void {
  legs(ctx, TIGHTS_GREEN, SHOE);
  const hx = k.hand * 0.32;
  arm(ctx, -k.hand * 0.2, -0.5, -k.hand * 0.3, -0.33, TIGHTS_GREEN);
  // The round pumpkin suit with ribs and a carved grin
  ctx.beginPath();
  ovalK(ctx, 0, -0.41, 0.27, 0.23);
  outlined(ctx, ORANGE, K.lw, INK);
  ctx.fillStyle = ORANGE_LIGHT;
  ctx.beginPath();
  ovalK(ctx, -0.13, -0.52, 0.07, 0.04, -0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(X(0), Y(-0.41), 0.12 * K.h, 0.225 * K.h, 0, Math.PI * 0.6, Math.PI * 1.4);
  ctx.moveTo(X(0.12 * Math.cos(-Math.PI * 0.4)), Y(-0.41 + 0.225 * Math.sin(-Math.PI * 0.4)));
  ctx.ellipse(X(0), Y(-0.41), 0.12 * K.h, 0.225 * K.h, 0, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = ORANGE_DARK;
  ctx.lineWidth = Math.max(0.8, K.lw * 0.7);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.16), Y(-0.43));
    ctx.lineTo(X(sd * 0.04), Y(-0.43));
    ctx.lineTo(X(sd * 0.1), Y(-0.52));
    ctx.closePath();
  }
  ctx.moveTo(X(-0.15), Y(-0.36));
  ctx.lineTo(X(0.15), Y(-0.36));
  ctx.quadraticCurveTo(X(0), Y(-0.24), X(-0.15), Y(-0.36));
  ctx.closePath();
  ctx.fill();
  arm(ctx, k.hand * 0.2, -0.5, hx, -0.34, TIGHTS_GREEN);
  bag(ctx, "purple", hx, -0.34, swing);
  // Leafy collar, head, and a stem cap
  ctx.beginPath();
  ctx.moveTo(X(-0.17), Y(-0.6));
  for (let i = 0; i <= 6; i++) ctx.lineTo(X(-0.17 + i * 0.057), Y(i % 2 ? -0.52 : -0.6));
  ctx.lineTo(X(0.17), Y(-0.62));
  ctx.lineTo(X(-0.17), Y(-0.62));
  ctx.closePath();
  outlined(ctx, LEAF_GREEN, K.lw * 0.8, INK);
  head(ctx);
  face(ctx);
  ctx.beginPath();
  ctx.moveTo(X(-0.2), Y(-0.8));
  ctx.quadraticCurveTo(X(-0.19), Y(-0.98), X(0), Y(-0.98));
  ctx.quadraticCurveTo(X(0.19), Y(-0.98), X(0.2), Y(-0.8));
  ctx.closePath();
  outlined(ctx, LEAF_GREEN, K.lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(X(-0.02), Y(-0.97));
  ctx.quadraticCurveTo(X(-0.01), Y(-1.1), X(0.08), Y(-1.12));
  inkedLine(ctx, STEM, 0.04 * K.h, K.lw * 0.6, INK);
}

function hero(ctx: Ctx, t: number, k: Kid, swing: number): void {
  // Cape behind, streaming out to the side in the wind
  const f = (i: number) => 0.035 * Math.sin(t * 6 + k.phase + i * 1.4);
  const d = k.hand;
  ctx.beginPath();
  ctx.moveTo(X(-0.13 * d), Y(-0.58));
  ctx.lineTo(X(0.13 * d), Y(-0.58));
  ctx.quadraticCurveTo(X(0.26 * d), Y(-0.38), X((0.34 + f(0)) * d), Y(-0.2 + f(1)));
  ctx.lineTo(X((0.21 + f(2)) * d), Y(-0.16));
  ctx.lineTo(X(0.08 * d), Y(-0.2 + f(3)));
  ctx.lineTo(X(-0.16 * d), Y(-0.2));
  ctx.closePath();
  outlined(ctx, CAPE, K.lw, INK);
  ctx.fillStyle = CAPE_DARK;
  ctx.beginPath();
  ctx.moveTo(X(0.13 * d), Y(-0.56));
  ctx.quadraticCurveTo(X(0.24 * d), Y(-0.38), X((0.31 + f(0)) * d), Y(-0.22 + f(1)));
  ctx.lineTo(X((0.21 + f(2)) * d), Y(-0.18));
  ctx.quadraticCurveTo(X(0.18 * d), Y(-0.36), X(0.1 * d), Y(-0.55));
  ctx.closePath();
  ctx.fill();
  legs(ctx, HERO, CAPE);
  ctx.beginPath();
  ctx.moveTo(X(-0.14), Y(-0.58));
  ctx.lineTo(X(0.14), Y(-0.58));
  ctx.lineTo(X(0.15), Y(-0.24));
  ctx.lineTo(X(-0.15), Y(-0.24));
  ctx.closePath();
  outlined(ctx, HERO, K.lw, INK);
  ctx.fillStyle = HERO_LIGHT;
  ctx.fillRect(X(-0.12), Y(-0.56), 0.05 * K.h, 0.28 * K.h);
  // Belt and a five-point star on the chest
  ctx.beginPath();
  ctx.rect(X(-0.15), Y(-0.31), 0.3 * K.h, 0.05 * K.h);
  outlined(ctx, STAR_GOLD, K.lw * 0.6, INK);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.035 : 0.085;
    const px = X(Math.cos(a) * r);
    const py = Y(-0.45 + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  outlined(ctx, STAR_GOLD, K.lw * 0.6, INK);
  // One fist pumped up now and then, the other hand holding the bag
  const pump = Math.max(0, Math.sin(t * 1.3 + k.phase));
  const fy = -0.72 - pump * 0.22;
  const hx = k.hand * 0.26;
  arms(ctx, k.hand * 0.12, -0.54, hx, -0.36, fy, -k.hand * 0.2, HERO);
  bag(ctx, "sack", hx, -0.36, swing);
  head(ctx);
  // Hair tuft, then a domino mask with eye holes
  ctx.beginPath();
  ctx.moveTo(X(-0.19), Y(-0.82));
  ctx.quadraticCurveTo(X(-0.12), Y(-1.02), X(0.06), Y(-0.98));
  ctx.lineTo(X(0.02), Y(-1.04));
  ctx.quadraticCurveTo(X(0.2), Y(-0.98), X(0.19), Y(-0.82));
  ctx.quadraticCurveTo(X(0), Y(-0.88), X(-0.19), Y(-0.82));
  ctx.closePath();
  outlined(ctx, HAIR_BROWN, K.lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(X(-0.2), Y(-0.79));
  ctx.quadraticCurveTo(X(0), Y(-0.84), X(0.2), Y(-0.79));
  ctx.lineTo(X(0.19), Y(-0.71));
  ctx.quadraticCurveTo(X(0), Y(-0.74), X(-0.19), Y(-0.71));
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, X(-0.07), Y(-0.76), 0.03 * K.h);
  circle(ctx, X(0.07), Y(-0.76), 0.03 * K.h);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(0), Y(-0.69), 0.06 * K.h, 0.2 * Math.PI, 0.8 * Math.PI);
  ink(ctx, Math.max(0.8, K.lw * 0.6), INK);
}

const DRAW = { witch, skeleton, cat, pumpkin, hero } as const;

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
  for (const k of KIDS) {
    const p = spot(s, k.X, k.z);
    K.h = HEIGHT * s.u * p.k;
    if (p.y - K.h * 1.5 > s.cssH) continue;
    // Now and then a little hop of excitement; the bag swings with it.
    const c = Math.sin(t * 1.7 + k.phase);
    const hop = c > 0.75 ? Math.sin(((c - 0.75) / 0.25) * Math.PI * 0.5) : 0;
    K.x = p.x;
    K.y = p.y - hop * K.h * 0.07;
    K.lw = inkW(s, p.k);
    const swing = 0.22 * Math.sin(t * 2.4 + k.phase) * k.hand + hop * 0.3 * k.hand;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    DRAW[k.costume](ctx, t, k, swing);
  }
}

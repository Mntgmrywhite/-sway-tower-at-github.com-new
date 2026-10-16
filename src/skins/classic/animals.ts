import { alpha, circle, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BILL,
  BUNNY,
  BUNNY_SHADE,
  CREAM,
  DEER,
  DEER_SHADE,
  DUCK,
  DUCKLING,
  FOX,
  FOX_SHADE,
  INK,
  OWL,
  OWL_LIGHT,
} from "./colors";

// The forest animals, small and charming: flat bright fills, a lit or pale patch, an ink
// outline. Each is drawn in its own local units (1 = `size` px; feet or waterline at y = 0,
// facing +x, mirrored by `dir`), so the shapes stay simple and read at a few pixels tall.
// Every motion comes from scene time: heads dip, tails swish, ears twitch, rabbits hop.

const DARK = "#3b2a2a";
const NOSE = "#2a1f3d";
const SHADOW = alpha(INK, 0.18);

/** Enter local units at (x, y): returns the line width to pass to `ink` in those units. */
function local(ctx: Ctx, x: number, y: number, size: number, dir: number, lw: number): number {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * size, size);
  return lw / size;
}

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

// ---------------------------------------------------------------- deer

/**
 * A deer at (x, y), `size` px long. Most of the time its head is down at the water (or the
 * grass); now and then it lifts it to look around. A stag has antlers, a fawn has spots.
 */
export function deer(ctx: Ctx, s: Scene, x: number, y: number, size: number, dir: number, stag: boolean, phase: number, lw: number): void {
  const period = 7.5;
  const p = (((s.t + phase) % period) + period) % period;
  // Head up between 4.6 s and 6.6 s of each cycle.
  const up = smooth((p - 4.6) / 0.5) * (1 - smooth((p - 6.2) / 0.5));
  const w = local(ctx, x, y, size, dir, lw);

  // Shadow, then the far legs (a shade darker).
  ctx.beginPath();
  oval(ctx, 0, 0, 0.5, 0.06);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.26, -0.55);
  ctx.lineTo(-0.3, 0);
  ctx.moveTo(0.3, -0.55);
  ctx.lineTo(0.33, 0);
  inkedLine(ctx, DEER_SHADE, 0.07, w, INK);
  ctx.beginPath();
  ctx.moveTo(-0.34, -0.55);
  ctx.quadraticCurveTo(-0.42, -0.3, -0.37, 0);
  ctx.moveTo(0.24, -0.55);
  ctx.lineTo(0.25, 0);
  inkedLine(ctx, DEER, 0.075, w, INK);

  // Neck from the shoulder to the head: up and alert, or stretched down to drink.
  const hx = 0.52 + (0.62 - 0.52) * (1 - up);
  const hy = -1.18 + (1.18 - 0.22) * (1 - up);
  ctx.beginPath();
  ctx.moveTo(0.18, -0.86);
  ctx.quadraticCurveTo(hx - 0.06, (hy - 0.86) / 2 - 0.05 * up, hx - 0.02, hy - 0.04);
  ctx.lineTo(hx + 0.06, hy + 0.08);
  ctx.quadraticCurveTo(hx * 0.6 + 0.12, -0.62 + (hy + 0.62) * 0.4, 0.36, -0.6);
  ctx.closePath();
  // Body
  oval(ctx, 0, -0.72, 0.46, 0.2);
  ctx.fillStyle = DEER;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Pale belly and rump
  ctx.beginPath();
  oval(ctx, 0.02, -0.6, 0.3, 0.06);
  oval(ctx, -0.42, -0.74, 0.07, 0.12);
  ctx.fillStyle = CREAM;
  ctx.fill();
  if (!stag) {
    ctx.beginPath();
    for (const [sx, sy] of FAWN_SPOTS) circle(ctx, sx, sy, 0.035);
    ctx.fillStyle = CREAM;
    ctx.fill();
  }
  // Tail flick
  ctx.beginPath();
  ctx.moveTo(-0.44, -0.84);
  ctx.lineTo(-0.54, -0.9 + Math.sin(s.t * 5 + phase) * 0.03);
  inkedLine(ctx, CREAM, 0.06, w * 0.8, INK);

  // Head: tipped down when drinking.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.9 * (1 - up) + 0.1);
  if (stag) {
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.08);
    ctx.lineTo(-0.1, -0.36);
    ctx.lineTo(-0.2, -0.46);
    ctx.moveTo(-0.08, -0.28);
    ctx.lineTo(0.02, -0.42);
    ctx.moveTo(0.06, -0.07);
    ctx.lineTo(0.06, -0.32);
    ctx.lineTo(0.0, -0.42);
    ctx.moveTo(0.06, -0.24);
    ctx.lineTo(0.15, -0.34);
    inkedLine(ctx, "#f1dcae", 0.045, w * 0.8, INK);
  }
  // Ear, flicking now and then
  const flick = Math.max(0, Math.sin(s.t * 3 + phase * 5)) > 0.97 ? 0.4 : 0;
  ctx.beginPath();
  oval(ctx, -0.12, -0.1, 0.13, 0.055, -0.5 - flick);
  // Head and muzzle
  ctx.moveTo(0.2, 0);
  ctx.ellipse(0.04, 0, 0.16, 0.12, 0, 0, Math.PI * 2);
  oval(ctx, 0.2, 0.05, 0.1, 0.07, 0.3);
  ctx.fillStyle = DEER;
  ink(ctx, w * 2, INK);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, -0.12, -0.1, 0.07, 0.025, -0.5 - flick);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.29, 0.06, 0.035);
  circle(ctx, 0.07, -0.03, 0.03);
  ctx.fillStyle = NOSE;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

const FAWN_SPOTS = [
  [-0.22, -0.8],
  [-0.08, -0.84],
  [0.06, -0.8],
  [0.18, -0.84],
  [-0.15, -0.72],
  [0.02, -0.72],
] as const;

// ---------------------------------------------------------------- ducks

/** A duck gliding at waterline (x, y), `size` px long, its little V wake spreading behind. */
export function duck(ctx: Ctx, s: Scene, x: number, y: number, size: number, dir: number, mother: boolean, i: number, lw: number): void {
  const bob = Math.sin(s.t * 2.2 + i * 1.3) * 0.025;
  const w = local(ctx, x, y, size, dir, lw);

  // Wake: a ring at the waterline and two lines spreading back.
  ctx.beginPath();
  oval(ctx, 0, 0.03, 0.62, 0.11);
  ctx.moveTo(-0.5, 0.02);
  ctx.lineTo(-1.5, -0.08);
  ctx.moveTo(-0.45, 0.07);
  ctx.lineTo(-1.35, 0.22);
  ctx.strokeStyle = alpha("#ffffff", 0.7);
  ctx.lineWidth = w * 0.9;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.translate(0, bob);
  const body = mother ? DUCK : DUCKLING;
  ctx.beginPath();
  // Body sitting on the water, tail tipped up.
  ctx.moveTo(-0.58, -0.36);
  ctx.quadraticCurveTo(-0.5, 0.04, -0.1, 0.03);
  ctx.lineTo(0.28, 0.03);
  ctx.quadraticCurveTo(0.5, -0.02, 0.44, -0.24);
  ctx.quadraticCurveTo(0.1, -0.42, -0.58, -0.36);
  ctx.closePath();
  // Head
  circle(ctx, 0.3, -0.5, mother ? 0.19 : 0.22);
  ctx.fillStyle = body;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Wing
  ctx.beginPath();
  ctx.moveTo(-0.32, -0.25);
  ctx.quadraticCurveTo(-0.05, -0.08, 0.2, -0.2);
  ctx.strokeStyle = mother ? "#c9d6e6" : "#e8b02c";
  ctx.lineWidth = w * 1.2;
  ctx.stroke();
  // Bill and eye
  ctx.beginPath();
  ctx.moveTo(0.44, -0.54);
  ctx.quadraticCurveTo(0.66, -0.56, 0.68, -0.46);
  ctx.quadraticCurveTo(0.56, -0.42, 0.44, -0.44);
  ctx.closePath();
  ctx.fillStyle = BILL;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.beginPath();
  circle(ctx, 0.34, -0.56, 0.045);
  ctx.fillStyle = NOSE;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- rabbits

/** A rabbit at (x, y), `size` px long; `hop` 0..1 lifts it mid-leap, stretched out. */
export function bunny(ctx: Ctx, s: Scene, x: number, y: number, size: number, dir: number, hop: number, lw: number): void {
  // Shadow stays on the ground, shrinking as the rabbit leaps.
  ctx.beginPath();
  oval(ctx, x, y, size * (0.4 - hop * 0.12), size * 0.06);
  ctx.fillStyle = SHADOW;
  ctx.fill();

  const w = local(ctx, x, y - hop * size * 0.45, size, dir, lw);
  const stretch = hop * 0.25;
  // Far ear, behind the head
  const twitch = Math.sin(s.t * 4 + x) > 0.96 ? 0.25 : 0;
  ctx.beginPath();
  oval(ctx, 0.12 - stretch * 0.4, -0.98, 0.075, 0.26, -0.45 - stretch);
  ctx.fillStyle = BUNNY_SHADE;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Body, haunch and head as one shape
  ctx.beginPath();
  oval(ctx, -0.05 - stretch * 0.2, -0.36 - stretch * 0.05, 0.4 + stretch * 0.15, 0.28 - stretch * 0.05, -stretch * 0.4);
  oval(ctx, -0.2, -0.16, 0.24, 0.14);
  circle(ctx, 0.3 + stretch * 0.15, -0.62 + stretch * 0.08, 0.2);
  // Near ear
  oval(ctx, 0.24 - stretch * 0.3, -0.98 + stretch * 0.1, 0.08, 0.28, -0.25 - stretch - twitch);
  // Front paw
  oval(ctx, 0.28 + stretch * 0.3, -0.06, 0.1, 0.05);
  ctx.fillStyle = BUNNY;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Inner ear, cotton tail, eye, nose
  ctx.beginPath();
  oval(ctx, 0.24 - stretch * 0.3, -0.98 + stretch * 0.1, 0.035, 0.18, -0.25 - stretch - twitch);
  ctx.fillStyle = "#ffb6c8";
  ctx.fill();
  ctx.beginPath();
  circle(ctx, -0.47 - stretch * 0.1, -0.4, 0.12);
  ctx.fillStyle = "#ffffff";
  ink(ctx, w * 1.6, INK);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.36 + stretch * 0.15, -0.66 + stretch * 0.08, 0.045);
  ctx.fillStyle = NOSE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.5 + stretch * 0.15, -0.6 + stretch * 0.08, 0.035);
  ctx.fillStyle = "#ff7aa0";
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- fox

/** A fox sitting at (x, y), `size` px tall, its bushy tail swishing and its head turning. */
export function fox(ctx: Ctx, s: Scene, x: number, y: number, size: number, lw: number): void {
  // Looks one way, then the other.
  const dir = Math.sin(s.t * 0.35) > -0.3 ? -1 : 1;
  const w = local(ctx, x, y, size, dir, lw);
  const swish = Math.sin(s.t * 1.6) * 0.12;

  ctx.beginPath();
  oval(ctx, 0, 0, 0.42, 0.06);
  ctx.fillStyle = SHADOW;
  ctx.fill();

  // Tail curling round behind, white tip.
  ctx.beginPath();
  ctx.moveTo(-0.18, -0.12);
  ctx.quadraticCurveTo(-0.62, -0.2 + swish, -0.62 + swish, -0.62);
  ctx.quadraticCurveTo(-0.5, -0.36, -0.12, -0.02);
  ctx.closePath();
  ctx.fillStyle = FOX;
  ink(ctx, w * 2, INK);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, -0.6 + swish, -0.6, 0.07, 0.1, 0.3);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Sitting body: haunch and chest, legs down the front.
  ctx.beginPath();
  ctx.moveTo(-0.28, 0);
  ctx.quadraticCurveTo(-0.34, -0.42, 0.02, -0.68);
  ctx.quadraticCurveTo(0.2, -0.6, 0.2, -0.3);
  ctx.lineTo(0.2, 0);
  ctx.closePath();
  ctx.fillStyle = FOX;
  ink(ctx, w * 2, INK);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.02, -0.62);
  ctx.quadraticCurveTo(0.2, -0.5, 0.17, -0.25);
  ctx.quadraticCurveTo(0.08, -0.35, 0.02, -0.62);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.1, -0.2);
  ctx.lineTo(0.1, 0);
  ctx.moveTo(0.18, -0.2);
  ctx.lineTo(0.18, 0);
  inkedLine(ctx, DARK, 0.06, w * 0.7, INK);

  // Head: ears, cheeks and a pointed snout.
  ctx.save();
  ctx.translate(0.06, -0.72);
  ctx.rotate(Math.sin(s.t * 0.9) * 0.08);
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.06);
  ctx.lineTo(-0.12, -0.3);
  ctx.lineTo(0.0, -0.12);
  ctx.closePath();
  ctx.moveTo(0.0, -0.1);
  ctx.lineTo(0.08, -0.32);
  ctx.lineTo(0.14, -0.08);
  ctx.closePath();
  ctx.moveTo(-0.16, 0);
  ctx.quadraticCurveTo(-0.14, -0.16, 0.04, -0.14);
  ctx.quadraticCurveTo(0.18, -0.1, 0.34, 0.02);
  ctx.quadraticCurveTo(0.16, 0.12, -0.04, 0.1);
  ctx.quadraticCurveTo(-0.16, 0.08, -0.16, 0);
  ctx.closePath();
  ctx.fillStyle = FOX;
  ink(ctx, w * 2, INK);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.02, 0.1);
  ctx.quadraticCurveTo(0.18, 0.06, 0.3, 0.03);
  ctx.quadraticCurveTo(0.14, 0.0, 0.0, 0.04);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.09, -0.08);
  ctx.lineTo(-0.1, -0.22);
  ctx.lineTo(-0.03, -0.11);
  ctx.closePath();
  ctx.fillStyle = FOX_SHADE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.34, 0.02, 0.04);
  circle(ctx, 0.06, -0.04, 0.032);
  ctx.fillStyle = NOSE;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------- owl

/** A round owl perched at (x, y) (its feet), `size` px tall, blinking now and then. */
export function owl(ctx: Ctx, s: Scene, x: number, y: number, size: number, lw: number): void {
  const w = local(ctx, x, y, size, 1, lw);
  const tilt = Math.sin(s.t * 0.6) * 0.12;
  // Body and tufts
  ctx.beginPath();
  ctx.moveTo(-0.32, -0.1);
  ctx.quadraticCurveTo(-0.4, -0.75, -0.28, -0.98);
  ctx.lineTo(-0.2, -0.86);
  ctx.quadraticCurveTo(0, -0.92, 0.2, -0.86);
  ctx.lineTo(0.28, -0.98);
  ctx.quadraticCurveTo(0.4, -0.75, 0.32, -0.1);
  ctx.quadraticCurveTo(0, 0.04, -0.32, -0.1);
  ctx.closePath();
  ctx.fillStyle = OWL;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Pale belly with little chevrons
  ctx.beginPath();
  oval(ctx, 0, -0.3, 0.2, 0.24);
  ctx.fillStyle = OWL_LIGHT;
  ctx.fill();
  ctx.beginPath();
  for (const [cx, cy] of CHEVRONS) {
    ctx.moveTo(cx - 0.05, cy - 0.03);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 0.05, cy - 0.03);
  }
  ctx.strokeStyle = OWL;
  ctx.lineWidth = w * 0.9;
  ctx.stroke();
  // Eyes: big and round, blinking for a moment every few seconds.
  const blink = (s.t % 4.3) < 0.16;
  ctx.save();
  ctx.translate(0, -0.66);
  ctx.rotate(tilt);
  ctx.beginPath();
  circle(ctx, -0.13, 0, 0.13);
  circle(ctx, 0.13, 0, 0.13);
  ctx.fillStyle = blink ? OWL : "#ffffff";
  ctx.fill();
  ink(ctx, w, INK);
  if (!blink) {
    ctx.beginPath();
    circle(ctx, -0.11, 0.01, 0.065);
    circle(ctx, 0.15, 0.01, 0.065);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    circle(ctx, -0.09, -0.02, 0.022);
    circle(ctx, 0.17, -0.02, 0.022);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-0.22, 0.01);
    ctx.lineTo(-0.04, 0.01);
    ctx.moveTo(0.04, 0.01);
    ctx.lineTo(0.22, 0.01);
    ink(ctx, w, INK);
  }
  // Beak
  ctx.beginPath();
  ctx.moveTo(-0.045, 0.08);
  ctx.lineTo(0.045, 0.08);
  ctx.lineTo(0, 0.17);
  ctx.closePath();
  ctx.fillStyle = "#ffb02e";
  ctx.fill();
  ink(ctx, w * 0.7, INK);
  ctx.restore();
  // Feet gripping the branch
  ctx.beginPath();
  for (const fx of FEET) {
    ctx.moveTo(fx - 0.06, -0.02);
    ctx.lineTo(fx - 0.06, 0.04);
    ctx.moveTo(fx + 0.06, -0.02);
    ctx.lineTo(fx + 0.06, 0.04);
    ctx.moveTo(fx, -0.02);
    ctx.lineTo(fx, 0.05);
  }
  ctx.strokeStyle = "#ff9a2e";
  ctx.lineWidth = w * 1.2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

const FEET = [-0.1, 0.1] as const;

const CHEVRONS = [
  [-0.08, -0.38],
  [0.08, -0.38],
  [0, -0.28],
  [-0.08, -0.18],
  [0.08, -0.18],
] as const;

// ---------------------------------------------------------------- squirrel

const SQUIRREL = "#d9782e";
const SQUIRREL_LIGHT = "#ffd9a8";

/** A squirrel at (x, y), `size` px long; `run` 0..1 bounds it along, else it sits up. */
export function squirrel(ctx: Ctx, s: Scene, x: number, y: number, size: number, dir: number, run: number, lw: number): void {
  const bound = run * Math.abs(Math.sin(s.t * 11)) * 0.12;
  const w = local(ctx, x, y - bound * size, size, dir, lw);
  const flick = Math.sin(s.t * (run > 0 ? 9 : 2.5)) * 0.06;
  // Big curled tail behind
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.12);
  ctx.quadraticCurveTo(-0.75, -0.1, -0.62 + flick, -0.62);
  ctx.quadraticCurveTo(-0.5 + flick, -0.98, -0.25 + flick, -0.86);
  ctx.quadraticCurveTo(-0.36, -0.7, -0.36, -0.52);
  ctx.quadraticCurveTo(-0.36, -0.3, -0.08, -0.26);
  ctx.closePath();
  ctx.fillStyle = SQUIRREL;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Body and head: sitting up, or stretched low when running.
  const lean = run;
  ctx.beginPath();
  oval(ctx, 0.02 + lean * 0.08, -0.26 + lean * 0.08, 0.2 + lean * 0.08, 0.24 - lean * 0.08, -0.5 + lean * 0.5);
  circle(ctx, 0.2 + lean * 0.18, -0.52 + lean * 0.2, 0.14);
  oval(ctx, 0.13 + lean * 0.18, -0.66 + lean * 0.2, 0.04, 0.07, -0.3);
  ctx.fillStyle = SQUIRREL;
  ink(ctx, w * 2, INK);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0.1 + lean * 0.1, -0.24 + lean * 0.08, 0.08, 0.14, -0.3);
  ctx.fillStyle = SQUIRREL_LIGHT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.25 + lean * 0.18, -0.55 + lean * 0.2, 0.035);
  circle(ctx, 0.34 + lean * 0.18, -0.5 + lean * 0.2, 0.025);
  ctx.fillStyle = NOSE;
  ctx.fill();
  ctx.restore();
}

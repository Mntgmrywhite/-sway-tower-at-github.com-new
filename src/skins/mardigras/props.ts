import { circle, oval, type Ctx } from "../../base/draw";
import { BEATER, BRASS, DRUM_HEAD, DRUM_SHELL, FLAME, FLAME_CORE, GOLD, INK, IRON, PEARL, POLE, PURPLE, STICK, THREE, WHITE, type Shades } from "./colors";
import { solveFolk, type Folk } from "./folk";
import type { Vec } from "./rig";
import { fleurPath } from "./shapes";

// What the parade carries, drawn in the carrier's own frame (u at full size, facing +x) so it
// turns and scales with them: the brass (a trumpet, a tenor sax, a trombone, a sousaphone), the
// drums, the grand marshal's second-line umbrella and his handkerchief, the flambeaux, a
// dancer's parasol. Each `hold…` puts the instrument where it belongs on the figure (a mouthpiece
// at the lips, a drum on its sling) and the hands on it, so the rig's arms reach to its valves,
// its slide, its sticks; then the painter draws the figure and the instrument together. Brass and
// gold in bright paint with a lit stripe; one ink weight.

/** Scratch: the mouth, and where an instrument sits this frame. */
const MOUTH = { x: 0, y: 0 };
export const SET = { x: 0, y: 0, a: 0, k: 0 };

/** Where a figure's lips are (its own frame), after its rig is solved. */
export function mouthOf(f: Folk): Vec {
  const r = f.rig;
  const b = f.look.b;
  const mx = f.pose.turn * b.headW * 0.42 + b.headW * 0.1;
  const my = b.headH * 0.42;
  const c = Math.cos(r.headA);
  const s = Math.sin(r.headA);
  MOUTH.x = r.head.x + mx * c - my * s;
  MOUTH.y = r.head.y + mx * s + my * c;
  return MOUTH;
}

/** Run `fn` in figure f's frame at (x, y) on screen. */
export function inFrame(ctx: Ctx, f: Folk, x: number, y: number, u: number, fn: (ctx: Ctx) => void): void {
  const k = u * f.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * f.m, k);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  fn(ctx);
  ctx.restore();
}

/** Ink a path and fill it (the ink outside shows as its outline). */
function inked(ctx: Ctx, color: string, w: number): void {
  ctx.lineWidth = w * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
}

/** A bar from (ax, ay) to (bx, by), r thick each side, as its own subpath. */
function bar(ctx: Ctx, ax: number, ay: number, bx: number, by: number, r: number): void {
  const d = Math.hypot(bx - ax, by - ay) || 1e-6;
  const nx = (-(by - ay) / d) * r;
  const ny = ((bx - ax) / d) * r;
  ctx.moveTo(ax - nx, ay - ny);
  ctx.lineTo(bx - nx, by - ny);
  ctx.lineTo(bx + nx, by + ny);
  ctx.lineTo(ax + nx, ay + ny);
  ctx.closePath();
}

/** A tube from (ax, ay) to (bx, by), r thick, on its ink: two fills. */
function tube(ctx: Ctx, ax: number, ay: number, bx: number, by: number, r: number, c: string, w: number): void {
  const d = Math.hypot(bx - ax, by - ay) || 1e-6;
  const ex = ((bx - ax) / d) * w;
  const ey = ((by - ay) / d) * w;
  ctx.beginPath();
  bar(ctx, ax - ex, ay - ey, bx + ex, by + ey, r + w);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  bar(ctx, ax, ay, bx, by, r);
  ctx.fillStyle = c;
  ctx.fill();
}

// ---------------------------------------------------------------- the brass

/** Point the trumpet from the lips, tipped up by `up` (radians), and put both hands on it. Call after the gait has set the pose. */
export function holdTrumpet(f: Folk, up: number): void {
  solveFolk(f);
  const m = mouthOf(f);
  const a = -0.12 - up;
  const c = Math.cos(a);
  const s = Math.sin(a);
  SET.x = m.x;
  SET.y = m.y;
  SET.a = a;
  f.pose.handNX = m.x + c * 0.042 - s * 0.012;
  f.pose.handNY = m.y + s * 0.042 + c * 0.012;
  f.pose.handFX = m.x + c * 0.056 - s * 0.01;
  f.pose.handFY = m.y + s * 0.056 + c * 0.01;
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
  f.pose.mouth = -1;
}

/** The trumpet, from the lips (SET) forward to its flared bell, three valves on top. */
export function trumpet(ctx: Ctx, w: number): void {
  ctx.save();
  ctx.translate(SET.x, SET.y);
  ctx.rotate(SET.a);
  ctx.beginPath();
  ctx.moveTo(0.002, -0.0022);
  ctx.lineTo(0.052, -0.0028);
  ctx.quadraticCurveTo(0.066, -0.004, 0.077, -0.013);
  ctx.lineTo(0.077, 0.013);
  ctx.quadraticCurveTo(0.066, 0.004, 0.052, 0.0028);
  ctx.lineTo(0.002, 0.0022);
  ctx.closePath();
  ctx.rect(0.02, -0.011, 0.005, 0.009);
  ctx.rect(0.028, -0.011, 0.005, 0.009);
  ctx.rect(0.036, -0.011, 0.005, 0.009);
  ctx.moveTo(0.018, 0.003);
  ctx.quadraticCurveTo(0.03, 0.013, 0.044, 0.003);
  ctx.lineTo(0.042, 0.0055);
  ctx.quadraticCurveTo(0.03, 0.009, 0.02, 0.0055);
  ctx.closePath();
  inked(ctx, BRASS.body, w * 0.7);
  ctx.beginPath();
  oval(ctx, 0.077, 0, 0.003, 0.012);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.fillRect(0.006, -0.0018, 0.042, 0.0012);
  ctx.restore();
}

/** Hang the tenor sax from the lips down across the body, the hands on its keys. */
export function holdSax(f: Folk, sway: number): void {
  solveFolk(f);
  const m = mouthOf(f);
  SET.x = m.x;
  SET.y = m.y;
  SET.a = sway;
  const c = Math.cos(sway);
  const s = Math.sin(sway);
  const at = (x: number, y: number, near: boolean) => {
    const px = m.x + x * c - y * s;
    const py = m.y + x * s + y * c;
    if (near) {
      f.pose.handNX = px;
      f.pose.handNY = py;
    } else {
      f.pose.handFX = px;
      f.pose.handFY = py;
    }
  };
  at(0.02, 0.068, true);
  at(0.012, 0.038, false);
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
  f.pose.mouth = -1;
}

/** The tenor sax: the crook from the lips, the body slanting down and forward to the bow, the bell turning up and out. */
export function sax(ctx: Ctx, w: number): void {
  ctx.save();
  ctx.translate(SET.x, SET.y);
  ctx.rotate(SET.a);
  ctx.beginPath();
  ctx.moveTo(0.002, 0.001);
  ctx.quadraticCurveTo(0.012, -0.004, 0.012, 0.012);
  ctx.lineWidth = 0.004 + w * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 0.004;
  ctx.strokeStyle = BRASS.shade;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.008, 0.011);
  ctx.lineTo(0.016, 0.011);
  ctx.lineTo(0.03, 0.078);
  ctx.quadraticCurveTo(0.03, 0.092, 0.039, 0.091);
  ctx.quadraticCurveTo(0.046, 0.09, 0.047, 0.078);
  ctx.lineTo(0.046, 0.066);
  ctx.quadraticCurveTo(0.052, 0.058, 0.062, 0.056);
  ctx.lineTo(0.06, 0.072);
  ctx.quadraticCurveTo(0.055, 0.074, 0.054, 0.08);
  ctx.quadraticCurveTo(0.052, 0.1, 0.037, 0.1);
  ctx.quadraticCurveTo(0.02, 0.099, 0.019, 0.082);
  ctx.closePath();
  inked(ctx, BRASS.body, w * 0.7);
  ctx.beginPath();
  oval(ctx, 0.061, 0.064, 0.003, 0.0085, -0.3);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  // The keys down its body, pearl buttons.
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, 0.017 + i * 0.0035, 0.028 + i * 0.013, 0.0022);
  ctx.fillStyle = PEARL;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.012, 0.016);
  ctx.lineTo(0.023, 0.07);
  ctx.lineWidth = 0.0013;
  ctx.strokeStyle = BRASS.light;
  ctx.stroke();
  ctx.restore();
}

/** Point the trombone from the lips, its slide out by `slide` (0..1): the far hand on the bell section, the near hand on the slide's brace. */
export function holdTrombone(f: Folk, slide: number, up: number): void {
  solveFolk(f);
  const m = mouthOf(f);
  const a = -0.05 - up;
  SET.x = m.x;
  SET.y = m.y;
  SET.a = a;
  SET.k = slide;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const len = 0.05 + slide * 0.035;
  f.pose.handFX = m.x + c * 0.016 - s * 0.01;
  f.pose.handFY = m.y + s * 0.016 + c * 0.01;
  f.pose.handNX = m.x + c * len - s * 0.008;
  f.pose.handNY = m.y + s * len + c * 0.008;
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
  f.pose.mouth = -1;
}

/** The trombone: the bell section along the top to its big bell, the slide out below with its brace. */
export function trombone(ctx: Ctx, w: number): void {
  ctx.save();
  ctx.translate(SET.x, SET.y);
  ctx.rotate(SET.a);
  const len = 0.05 + SET.k * 0.035;
  ctx.beginPath();
  ctx.rect(0.002, -0.0024, 0.072, 0.0048);
  ctx.moveTo(0.072, -0.0024);
  ctx.quadraticCurveTo(0.084, -0.004, 0.096, -0.016);
  ctx.lineTo(0.096, 0.016);
  ctx.quadraticCurveTo(0.084, 0.004, 0.072, 0.0024);
  ctx.closePath();
  ctx.rect(0.004, 0.0056, len, 0.0034);
  ctx.rect(0.004, 0.0108, len, 0.0034);
  ctx.rect(len, 0.004, 0.004, 0.0115);
  ctx.rect(0.02, -0.002, 0.003, 0.013);
  inked(ctx, BRASS.body, w * 0.6);
  ctx.beginPath();
  oval(ctx, 0.096, 0, 0.0035, 0.015);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.fillRect(0.006, -0.0016, 0.062, 0.0011);
  ctx.restore();
}

/** Wrap the sousaphone round the player, its bell up over the head (bobbing by `bob`), the near hand on its valves. */
export function holdSousaphone(f: Folk, bob: number): void {
  solveFolk(f);
  const r = f.rig;
  const b = f.look.b;
  const m = mouthOf(f);
  SET.x = r.pelvis.x + r.up.x * b.spine * 0.42;
  SET.y = r.pelvis.y + r.up.y * b.spine * 0.42;
  SET.a = bob;
  SET.k = m.y;
  f.pose.handNX = SET.x + b.chestW * 1.25;
  f.pose.handNY = SET.y - 0.004;
  f.pose.handFX = SET.x - b.chestW * 0.8;
  f.pose.handFY = SET.y + 0.012;
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
  f.pose.mouth = -1;
}

/** The sousaphone: a brass coil round the chest, the leadpipe to the lips, the neck rising to the big bell over the head. */
export function sousaphone(ctx: Ctx, f: Folk, w: number): void {
  const b = f.look.b;
  const r = f.rig;
  const cx = SET.x + b.chestW * 0.2;
  const cy = SET.y;
  const R = b.chestW * 1.25;
  const m = mouthOf(f);
  // The coil, slung from the far shoulder round the body to the near hip.
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * 0.62, -0.55, 0, Math.PI * 2);
  ctx.lineWidth = 0.008 + w * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 0.008;
  ctx.strokeStyle = BRASS.body;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * 0.62, -0.55, Math.PI * 1.05, Math.PI * 1.55);
  ctx.lineWidth = 0.002;
  ctx.strokeStyle = BRASS.light;
  ctx.stroke();
  // The leadpipe up to the lips, and the valves.
  tube(ctx, cx + R * 0.7, cy - R * 0.4, m.x, m.y, 0.0018, BRASS.shade, w * 0.6);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(cx + R * 0.82 + i * 0.0045, cy - 0.012, 0.0035, 0.012);
  inked(ctx, BRASS.light, w * 0.5);
  // The neck rising behind the head to the bell, which faces us over it.
  const bx = r.head.x - b.headW * 0.35;
  const by = r.head.y - b.headH * 1.45 + SET.a * 0.003;
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.85, cy - R * 0.25);
  ctx.quadraticCurveTo(cx - R * 1.3, by + 0.03, bx - 0.012, by + 0.03);
  ctx.lineWidth = 0.007 + w * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 0.007;
  ctx.strokeStyle = BRASS.body;
  ctx.stroke();
  const BR = b.headW * 1.4;
  ctx.beginPath();
  circle(ctx, bx, by, BR);
  inked(ctx, BRASS.body, w);
  ctx.beginPath();
  circle(ctx, bx, by, BR * 0.68);
  ctx.fillStyle = BRASS.shade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, bx, by, BR * 0.3);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, bx - BR * 0.45, by - BR * 0.55, BR * 0.28, BR * 0.12, -0.6);
  ctx.fillStyle = BRASS.light;
  ctx.fill();
}

// ---------------------------------------------------------------- the drums

/** Sling the snare at the waist and put the sticks in the hands: `hit` is which stick is coming down (0..1 the near, 1..2 the far). */
export function holdSnare(f: Folk, hit: number): void {
  solveFolk(f);
  const r = f.rig;
  const b = f.look.b;
  SET.x = r.pelvis.x + b.hipW * 1.5;
  SET.y = r.pelvis.y - b.spine * 0.22;
  SET.k = hit;
  const n = Math.max(0, Math.sin(hit * Math.PI));
  const fa = Math.max(0, -Math.sin(hit * Math.PI));
  f.pose.handNX = SET.x + 0.004;
  f.pose.handNY = SET.y - 0.026 - n * 0.018;
  f.pose.handFX = SET.x - 0.008;
  f.pose.handFY = SET.y - 0.024 - fa * 0.018;
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
}

/** The snare drum on its sling, the sticks from the hands down to the head. */
export function snare(ctx: Ctx, f: Folk, w: number): void {
  const x = SET.x;
  const y = SET.y;
  const r = f.rig;
  ctx.beginPath();
  ctx.moveTo(r.neck.x - 0.004, r.neck.y + 0.004);
  ctx.lineTo(x - 0.01, y);
  ctx.lineWidth = 0.003;
  ctx.strokeStyle = PURPLE.body;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x - 0.022, y, 0.044, 0.02);
  oval(ctx, x, y + 0.02, 0.022, 0.006);
  oval(ctx, x, y, 0.022, 0.006);
  inked(ctx, DRUM_SHELL.body, w * 0.7);
  ctx.beginPath();
  oval(ctx, x, y, 0.02, 0.0045);
  ctx.fillStyle = DRUM_HEAD;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(x - 0.018 + i * 0.012, y + 0.004);
    ctx.lineTo(x - 0.012 + i * 0.012, y + 0.018);
  }
  ctx.lineWidth = 0.0016;
  ctx.strokeStyle = GOLD.light;
  ctx.stroke();
  // The sticks.
  ctx.beginPath();
  ctx.moveTo(r.wrN.x, r.wrN.y);
  ctx.lineTo(x + 0.006, y - 0.002 - Math.max(0, Math.sin(SET.k * Math.PI)) * 0.006);
  ctx.moveTo(r.wrF.x, r.wrF.y);
  ctx.lineTo(x - 0.004, y - 0.002 - Math.max(0, -Math.sin(SET.k * Math.PI)) * 0.006);
  ctx.lineWidth = 0.0024 + w * 1.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 0.0024;
  ctx.strokeStyle = STICK;
  ctx.stroke();
}

/** Carry the bass drum before the chest, the far hand on its rim and the near hand swinging the beater (`beat` 0..1, 1 on the head). */
export function holdBass(f: Folk, beat: number): void {
  solveFolk(f);
  const r = f.rig;
  const b = f.look.b;
  SET.x = r.pelvis.x + r.up.x * b.spine * 0.5 + b.chestW * 1.9;
  SET.y = r.pelvis.y + r.up.y * b.spine * 0.5;
  SET.k = beat;
  f.pose.handFX = SET.x - 0.012;
  f.pose.handFY = SET.y - 0.038;
  f.pose.handNX = SET.x + 0.012 - beat * 0.004;
  f.pose.handNY = SET.y - 0.03 + beat * 0.022;
  f.pose.elbowN = 1;
  f.pose.elbowF = 1;
}

/** The bass drum, its painted head toward us (a gold fleur-de-lis on purple), and the beater in the near hand. */
export function bassDrum(ctx: Ctx, f: Folk, w: number): void {
  const x = SET.x;
  const y = SET.y;
  const R = 0.04;
  ctx.beginPath();
  circle(ctx, x, y, R);
  inked(ctx, DRUM_SHELL.body, w);
  ctx.beginPath();
  circle(ctx, x, y, R * 0.8);
  ctx.fillStyle = DRUM_HEAD;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, R * 0.55);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ctx.beginPath();
  fleurPath(ctx, x, y, R * 0.7);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    circle(ctx, x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9, 0.0022);
  }
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  const r = f.rig;
  const hx = r.wrN.x;
  const hy = r.wrN.y;
  const tx = hx + 0.002;
  const ty = hy + 0.02;
  tube(ctx, hx, hy, tx, ty, 0.0013, STICK, w * 0.7);
  ctx.beginPath();
  circle(ctx, tx, ty, 0.0055);
  inked(ctx, BEATER, w * 0.7);
}

// ---------------------------------------------------------------- what the second line carries

/** Two ribbons hanging from either side of a rim (±x, y), fluttering, purple and green: one ink under both. */
function ribbons(ctx: Ctx, x: number, y: number, len: number, t: number, phase: number, w: number): void {
  const path = (m: number) => {
    const f1 = Math.sin(t * 7 + phase + m * 1.9);
    const f2 = Math.sin(t * 9.3 + phase * 1.3 + m);
    ctx.moveTo(m * x, y);
    ctx.bezierCurveTo(m * x + f1 * len * 0.25, y + len * 0.35, m * x - f2 * len * 0.25, y + len * 0.7, m * x + f1 * len * 0.2, y + len);
  };
  ctx.beginPath();
  path(-1);
  path(1);
  ctx.lineWidth = len * 0.13 + w * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = len * 0.13;
  ctx.strokeStyle = GOLD.light;
  ctx.stroke();
}

/**
 * A second-line umbrella held up on its pole from the hand at (hx, hy): a domed canopy on its ink
 * in panels of the season's colors that slide round as it turns (`spin`), a gold fringe round its
 * rim, two ribbons streaming from it; the whole tipped by `tip`.
 */
export function umbrella(ctx: Ctx, hx: number, hy: number, R: number, tip: number, spin: number, t: number, phase: number, w: number): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tip);
  const top = -R * 1.35;
  // The pole and the dome on one ink.
  const dome = (g: number) => {
    ctx.moveTo(-R - g, top + g);
    ctx.quadraticCurveTo(-R * 0.95 - g, top - R * 0.85 - g, 0, top - R * 0.92 - g);
    ctx.quadraticCurveTo(R * 0.95 + g, top - R * 0.85 - g, R + g, top + g);
    ctx.closePath();
  };
  ctx.beginPath();
  dome(w);
  ctx.rect(-R * 0.035 - w, top, R * 0.07 + w * 2, R * 1.5 + w);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-R * 0.035, top, R * 0.07, R * 1.5);
  ctx.fillStyle = IRON.light;
  ctx.fill();
  ctx.beginPath();
  dome(0);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  // The panels: wedges of green and gold from the crown to the rim, sliding round as it turns.
  const n = 6;
  const sh = (((spin % (2 / n)) + 2 / n) % (2 / n)) * n;
  for (let c = 1; c < 3; c++) {
    ctx.beginPath();
    for (let i = -1; i < n; i++) {
      if (((i % 3) + 3) % 3 !== c) continue;
      const k0 = Math.max(0, Math.min(1, (i + sh) / n));
      const k1 = Math.max(0, Math.min(1, (i + 1 + sh) / n));
      if (k1 <= k0) continue;
      const x0 = -R + 2 * R * k0;
      const x1 = -R + 2 * R * k1;
      ctx.moveTo(0, top - R * 0.92);
      ctx.lineTo(x0, top - R * (1 - Math.abs(2 * k0 - 1)) * 0.2);
      ctx.lineTo(x1, top - R * (1 - Math.abs(2 * k1 - 1)) * 0.2);
      ctx.closePath();
    }
    ctx.fillStyle = THREE[c]!.body;
    ctx.fill();
  }
  // The gold fringe along the rim, and the finial.
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) circle(ctx, -R + (i * R * 2) / 8, top + R * 0.05, R * 0.075);
  circle(ctx, 0, top - R * 0.97, R * 0.1);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ribbons(ctx, R * 0.95, top + R * 0.08, R * 0.75, t, phase, w);
  ctx.restore();
}

/** A white handkerchief held by a corner at (hx, hy), its free end waving after the hand. */
export function hanky(ctx: Ctx, hx: number, hy: number, s: number, t: number, phase: number, w: number): void {
  const a = Math.sin(t * 8 + phase) * 0.5;
  const b = Math.sin(t * 11 + phase * 1.7) * 0.3;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + s * (0.6 + a * 0.4), hy - s * (0.3 + b * 0.3), hx + s * (1.0 + a * 0.3), hy - s * (0.1 + a * 0.5));
  ctx.quadraticCurveTo(hx + s * (0.8 + b * 0.3), hy + s * (0.45 + a * 0.2), hx + s * (0.35 + b * 0.2), hy + s * (0.9 + a * 0.2));
  ctx.quadraticCurveTo(hx + s * 0.25, hy + s * 0.4, hx, hy);
  ctx.closePath();
  inked(ctx, WHITE, w * 0.7);
}

/**
 * A flambeau: a pole held in both hands with a brass rack of four burning wicks at its head,
 * turned by `spin` about the hands (a carrier twirls it now and then).
 */
export function flambeau(ctx: Ctx, x: number, y: number, len: number, spin: number, t: number, phase: number, w: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const top = -len * 0.62;
  tube(ctx, 0, len * 0.38, 0, top, len * 0.035, POLE, w);
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, top);
  ctx.lineTo(len * 0.12, top);
  ctx.lineTo(len * 0.08, top + len * 0.05);
  ctx.lineTo(-len * 0.08, top + len * 0.05);
  ctx.closePath();
  ctx.rect(-len * 0.13, top - len * 0.03, len * 0.26, len * 0.03);
  inked(ctx, BRASS.body, w * 0.7);
  // Four flames, each leaping on its own, a pale core in each.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const fx = -len * 0.09 + i * len * 0.06;
      const fl = Math.sin(t * (10 + i) + phase + i * 2.1);
      const fg = Math.sin(t * (7.3 + i * 0.7) + phase * 1.7 + i);
      const h = len * (0.16 + fl * 0.03 + (i % 2 ? 0.03 : 0)) * (pass ? 0.55 : 1);
      const wd = len * (pass ? 0.018 : 0.032);
      ctx.moveTo(fx - wd, top - len * 0.03);
      ctx.quadraticCurveTo(fx - wd * 1.2 + fg * len * 0.01, top - h * 0.5, fx + fg * len * 0.02, top - h - len * 0.03);
      ctx.quadraticCurveTo(fx + wd * 1.2 + fl * len * 0.01, top - h * 0.5, fx + wd, top - len * 0.03);
      ctx.closePath();
    }
    if (pass) {
      ctx.fillStyle = FLAME_CORE;
      ctx.fill();
    } else inked(ctx, FLAME, w * 0.6);
  }
  ctx.restore();
}

/** A lace parasol held from the hand at (hx, hy), tipped by `tip`: a scalloped canopy in a color on its ink, its handle, a lit panel, gold trim, ribbons fluttering from its rim. */
export function parasol(ctx: Ctx, hx: number, hy: number, R: number, tip: number, color: Shades, t: number, phase: number, w: number): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tip);
  const top = -R * 1.2;
  const canopy = (g: number) => {
    ctx.moveTo(-R - g, top + g * 0.5);
    ctx.quadraticCurveTo(-R * 0.9 - g, top - R * 0.7 - g, 0, top - R * 0.75 - g);
    ctx.quadraticCurveTo(R * 0.9 + g, top - R * 0.7 - g, R + g, top + g * 0.5);
    for (let i = 4; i > 0; i--) ctx.quadraticCurveTo(-R + (i - 0.5) * R * 0.5, top + R * 0.16 + g, -R + (i - 1) * R * 0.5 - (i === 1 ? g : 0), top + g * 0.5);
    ctx.closePath();
  };
  ctx.beginPath();
  canopy(w);
  bar(ctx, 0, R * 0.1 + w, 0, top, R * 0.035 + w);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  bar(ctx, 0, R * 0.1, 0, top, R * 0.035);
  ctx.fillStyle = GOLD.shade;
  ctx.fill();
  ctx.beginPath();
  canopy(0);
  ctx.fillStyle = color.body;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-R * 0.75, top - R * 0.15);
  ctx.quadraticCurveTo(-R * 0.55, top - R * 0.62, 0, top - R * 0.7);
  ctx.quadraticCurveTo(-R * 0.4, top - R * 0.45, -R * 0.4, top - R * 0.05);
  ctx.closePath();
  for (let i = 0; i < 4; i++) circle(ctx, -R + (i + 0.5) * R * 0.5, top + R * 0.12, R * 0.06);
  ctx.fillStyle = color.light;
  ctx.fill();
  ribbons(ctx, R * 0.85, top + R * 0.05, R * 0.6, t, phase, w);
  ctx.restore();
}

/** The beads' dash: a bead (a dot of a dash with round caps), then a gap; and no dash. */
const BEAD = [0.001, 1];
const NO_DASH: number[] = [];

/** A string of beads hanging in a loop from (x, y), `s` deep, in color c: its string in ink, then its beads as round dots along it. */
export function beadString(ctx: Ctx, x: number, y: number, s: number, c: Shades, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.38, y);
  ctx.bezierCurveTo(x - s * 0.45, y + s * 1.3, x + s * 0.45, y + s * 1.3, x + s * 0.38, y);
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.28 + lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  BEAD[1] = s * 0.34;
  ctx.setLineDash(BEAD);
  ctx.lineWidth = s * 0.28;
  ctx.strokeStyle = c.light;
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
}


import { hash, type Ctx } from "../../../base/draw";
import { beat, envelope, EV, eventAt, glide, lastBeat, pace, phase } from "./clock";
import {
  BONE,
  BOOK,
  CANDLES,
  CAT,
  CHAIR,
  CLOCK,
  COPPER,
  CREAM,
  CURTAIN,
  DOOR,
  DOOR_DARK,
  DOOR_PURPLE,
  FABRIC_FOLD,
  FABRIC_SHADOW,
  FACE_GLOW,
  FLAME,
  FLAME_HOT,
  FRAME,
  GHOST,
  GHOST_BODY,
  GHOST_FACE,
  GILT,
  GOLD,
  GREEN,
  GREEN_DEEP,
  INK,
  JACK,
  LAB,
  PALE,
  PANE_CORE,
  PANE_DARK,
  PANE_LIT,
  PORTRAIT,
  PUMPKIN,
  ROOM_DARK,
  ROOM_GLOW,
  ROOM_WALL,
  SIL,
  SKELETON,
  SPARK,
  SPARK_HALO,
  STEEL,
  WAX,
  WITCH,
  type Kind,
} from "./palette";
import type { Shudder } from "./react";
import { LAY, ROOM_H, ROOM_TOP } from "./windows";

// The one lit room on every floor, seen through its big window between two tied-back curtains:
// a witch stirring her cauldron, a spellbook turning its own pages, a mad lab's Tesla coil, a
// skeleton dancing a jig, an empty rocking chair, a portrait whose eyes follow you, a crooked
// grandfather clock, a figure passing behind drawn curtains, a ghost drifting through a dark room,
// a candelabra dripping wax, a black cat on the sill and a jack-o'-lantern that pulls faces. Lit
// rooms play as shadow puppets (dark figures against lamplight); dark rooms glow with their
// subject. Each keeps its own time, hashed by its floor's level, so floors twelve apart never move
// together; on the ground floor the front door opens a crack now and then instead.
//
// A room never paints outside its pane (no clip: every figure is sized to fit). Coordinates below
// are in floor heights from the stage's center (cx) and the window sill (sill), y down.

const TAU = Math.PI * 2;
/** Shares of the pane's width the two curtains take. */
const CURTAIN_W = 0.17;

// Rotation scratch for the figures that turn (module state: no closures, nothing allocated).
let OX = 0;
let OY = 0;
let RC = 1;
let RS = 0;
let U = 1;
/** Places local coordinates (in heights, about an origin, turned by `a`) on the screen. */
function pivot(ox: number, oy: number, a: number, unit: number): void {
  OX = ox;
  OY = oy;
  RC = Math.cos(a);
  RS = Math.sin(a);
  U = unit;
}
const X = (lx: number, ly: number) => OX + (lx * RC - ly * RS) * U;
const Y = (lx: number, ly: number) => OY + (lx * RS + ly * RC) * U;
function mv(ctx: Ctx, lx: number, ly: number): void {
  ctx.moveTo(X(lx, ly), Y(lx, ly));
}
function ln(ctx: Ctx, lx: number, ly: number): void {
  ctx.lineTo(X(lx, ly), Y(lx, ly));
}
function qd(ctx: Ctx, cx: number, cy: number, lx: number, ly: number): void {
  ctx.quadraticCurveTo(X(cx, cy), Y(cx, cy), X(lx, ly), Y(lx, ly));
}
function dot(ctx: Ctx, lx: number, ly: number, r: number): void {
  const x = X(lx, ly);
  const y = Y(lx, ly);
  ctx.moveTo(x + r * U, y);
  ctx.ellipse(x, y, r * U, r * U, 0, 0, TAU);
}
/** A straight limb from a to b as a thin closed quad (so it fills with the silhouette). */
function limb(ctx: Ctx, ax: number, ay: number, bx: number, by: number, w: number): void {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * w * 0.5;
  const ny = (dx / d) * w * 0.5;
  mv(ctx, ax + nx, ay + ny);
  ln(ctx, bx + nx, by + ny);
  ln(ctx, bx - nx, by - ny);
  ln(ctx, ax - nx, ay - ny);
}

function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

/** The room's pane fill: lamplit, a dark room, its wallpaper, or drawn curtains. */
function paneColor(room: number, dark: boolean): string {
  if (room === PORTRAIT) return ROOM_WALL;
  return dark ? ROOM_DARK : PANE_LIT;
}

/**
 * The room in the floor's big window (laid out in LAY). `mode`: 0 = live, 1 = the slider (still,
 * at its t = 0 pose), 2 = loose (lights out: a dark pane and the curtains).
 */
export function drawRoom(ctx: Ctx, K: Kind, y: number, h: number, level: number, t: number, mode: number, still: boolean, R: Readonly<Shudder>): void {
  const L = LAY;
  if (!L.room) return;
  if (K.room === DOOR) {
    door(ctx, L.rx, y, L.rw, h, level, mode === 0 ? t : 0, mode);
    return;
  }
  const f = 0.05 * h;
  const px = L.rx + f;
  const pw = L.rw - 2 * f;
  const top = y + ROOM_TOP * h;
  const tl = top + L.rl * h + f;
  const tr = top + L.rr * h + f;
  const pb = top + ROOM_H * h - f;
  const ph = pb - Math.max(tl, tr);
  // Pane
  ctx.beginPath();
  ctx.moveTo(px, tl);
  ctx.lineTo(px + pw, tr);
  ctx.lineTo(px + pw, pb);
  ctx.lineTo(px, pb);
  ctx.fillStyle = mode === 2 ? PANE_DARK : K.room === CURTAIN ? PANE_LIT : paneColor(K.room, K.dark);
  ctx.fill();
  if (mode !== 2) {
    const cx = px + pw / 2 + R.jx * h;
    const sill = pb - Math.abs(R.jy) * h;
    if (!K.dark && K.room !== CURTAIN) {
      ctx.beginPath();
      oval(ctx, px + pw / 2, pb - ph * 0.52, pw * 0.3, ph * 0.36);
      ctx.fillStyle = PANE_CORE;
      ctx.fill();
    }
    const tt = mode === 1 ? 0 : t;
    switch (K.room) {
      case JACK:
        jack(ctx, cx, sill, h, level, tt, R);
        break;
      case WITCH:
        witch(ctx, cx, sill, h, level, tt);
        break;
      case BOOK:
        book(ctx, cx, sill, h, level, tt);
        break;
      case LAB:
        lab(ctx, cx, sill, h, level, tt, still || mode === 1);
        break;
      case SKELETON:
        skeleton(ctx, cx, sill, h, level, tt, R);
        break;
      case CHAIR:
        chair(ctx, cx, sill, h, level, tt, R);
        break;
      case PORTRAIT:
        portrait(ctx, cx, sill, h, level, tt);
        break;
      case CLOCK:
        clock(ctx, cx, sill, h, level, tt);
        break;
      case CURTAIN:
        drawn(ctx, px, pw, sill, ph, h, level, tt);
        break;
      case GHOST:
        ghost(ctx, px, pw, sill, h, level, tt);
        break;
      case CANDLES:
        candles(ctx, cx, sill, h, level, tt);
        break;
      case CAT:
        cat(ctx, cx, sill, h, level, tt);
        break;
    }
  }
  if (K.room !== CURTAIN) curtains(ctx, K, px, pw, tl, tr, pb);
  else valance(ctx, K, px, pw, tl, tr, h);
}

/** Two curtains tied back at the sides of the pane, each curling out to the sill. */
function curtains(ctx: Ctx, K: Kind, px: number, pw: number, tl: number, tr: number, pb: number): void {
  const cw = pw * CURTAIN_W;
  const tieY = pb - (pb - Math.max(tl, tr)) * 0.36;
  ctx.beginPath();
  // Left
  ctx.moveTo(px, tl);
  ctx.lineTo(px + cw * 1.15, tl + (tr - tl) * CURTAIN_W * 1.15);
  ctx.lineTo(px + cw * 0.42, tieY);
  ctx.lineTo(px + cw * 0.95, pb);
  ctx.lineTo(px, pb);
  // Right
  const rx = px + pw;
  ctx.moveTo(rx, tr);
  ctx.lineTo(rx - cw * 1.15, tr + (tl - tr) * CURTAIN_W * 1.15);
  ctx.lineTo(rx - cw * 0.42, tieY);
  ctx.lineTo(rx - cw * 0.95, pb);
  ctx.lineTo(rx, pb);
  ctx.fillStyle = K.curtain;
  ctx.fill();
}

/** A scalloped valance over drawn curtains. */
function valance(ctx: Ctx, K: Kind, px: number, pw: number, tl: number, tr: number, h: number): void {
  const n = Math.max(3, Math.round(pw / (0.22 * h)));
  const step = pw / n;
  const d = 0.075 * h;
  ctx.beginPath();
  ctx.moveTo(px, tl);
  ctx.lineTo(px + pw, tr);
  for (let i = n; i > 0; i--) {
    const x1 = px + step * i;
    const x0 = x1 - step;
    const yb = tl + ((tr - tl) * (x0 + step / 2 - px)) / pw + d;
    ctx.quadraticCurveTo(x1 - step / 2, yb + d * 0.6, x0, yb - d * 0.2);
  }
  ctx.fillStyle = K.curtain;
  ctx.fill();
}

// ---------------------------------------------------------------- 0: the jack-o'-lantern

const FACE_DIM = "#f0b84a";
const JACK_GLOW = "#5c3044";

const FACE = { face: 0, blink: false };

/** The jack's face now: 0 grin, 1 "O", 2 wink, 3 toothy; and whether it is mid-blink (reused object). */
export function jackFace(level: number, t: number): Readonly<{ face: number; blink: boolean }> {
  const seed = level * 11 + 2;
  const first = 0.6 + phase(level, 3, 4.5);
  FACE.face = faceOf(seed, lastBeat(t, seed, first, 5.5 * pace(level, 3), 0.95));
  FACE.blink = eventAt(t, seed, first, 5.5 * pace(level, 3), 0.95, 0.12, 0.12) >= 0;
  return FACE;
}

function faceOf(seed: number, k: number): number {
  const a = Math.floor(hash(seed * 2.1 + k * 7.7) * 4);
  const b = Math.floor(hash(seed * 2.1 + (k - 1) * 7.7) * 4);
  return a === b ? (a + 1) % 4 : a;
}

function jack(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number, R: Readonly<Shudder>): void {
  const jf = jackFace(level, t);
  const face = jf.face;
  const blink = jf.blink || R.blink;
  const x = cx + (hash(level * 3.3) - 0.5) * 0.16 * h;
  const y = sill - 0.155 * h;
  const rx = 0.2 * h;
  const ry = 0.145 * h;
  ctx.beginPath();
  oval(ctx, x, y - 0.02 * h, 0.4 * h, 0.21 * h);
  ctx.fillStyle = JACK_GLOW;
  ctx.fill();
  // Body; then its outline, ribs and stem in ink
  ctx.beginPath();
  oval(ctx, x, y, rx, ry);
  ctx.fillStyle = PUMPKIN;
  ctx.fill();
  ctx.moveTo(x - rx * 0.35, y - ry * 0.92);
  ctx.quadraticCurveTo(x - rx * 0.62, y, x - rx * 0.35, y + ry * 0.92);
  ctx.moveTo(x + rx * 0.35, y - ry * 0.92);
  ctx.quadraticCurveTo(x + rx * 0.62, y, x + rx * 0.35, y + ry * 0.92);
  ctx.moveTo(x, y - ry * 0.95);
  ctx.quadraticCurveTo(x + 0.005 * h, y - ry - 0.06 * h, x + 0.05 * h, y - ry - 0.075 * h);
  ctx.lineWidth = Math.max(0.7, 0.035 * h);
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Face, lit from inside (a candle's flicker)
  const fl = Math.sin(t * 23 + level) + Math.sin(t * 37 + level * 2) > 1.1;
  ctx.beginPath();
  const ex = 0.075 * h;
  const ey = y - 0.035 * h;
  const er = 0.035 * h;
  for (let side = -1; side <= 1; side += 2) {
    const exs = x + side * ex;
    if (blink || (face === 2 && side > 0)) {
      // Shut: a thin curved slit
      ctx.moveTo(exs - er, ey);
      ctx.quadraticCurveTo(exs, ey + er * 0.8, exs + er, ey);
      ctx.quadraticCurveTo(exs, ey + er * 0.35, exs - er, ey);
    } else if (face === 1) {
      oval(ctx, exs, ey, er * 0.8, er);
    } else if (face === 3) {
      // Mischievous: slanted triangles
      ctx.moveTo(exs - er, ey - er * 0.9 * -side * 0.4 - er * 0.2);
      ctx.lineTo(exs + er, ey - er * 0.9 * side * 0.4 - er * 0.2);
      ctx.lineTo(exs, ey + er * 0.8);
    } else {
      ctx.moveTo(exs - er, ey + er * 0.6);
      ctx.lineTo(exs + er, ey + er * 0.6);
      ctx.lineTo(exs, ey - er);
    }
  }
  const my = y + 0.05 * h;
  if (face === 1) {
    oval(ctx, x, my, 0.035 * h, 0.04 * h);
  } else if (face === 3) {
    // Zigzag teeth
    const mw = 0.12 * h;
    ctx.moveTo(x - mw, my - 0.02 * h);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x - mw + (i * mw) / 3, my + (i % 2 === 0 ? 0.0 : -0.035) * h);
    ctx.quadraticCurveTo(x, my + 0.07 * h, x - mw, my - 0.02 * h);
  } else {
    // A wide grin with two notches for teeth
    const mw = 0.12 * h;
    ctx.moveTo(x - mw, my - 0.025 * h);
    ctx.lineTo(x - mw * 0.4, my - 0.005 * h);
    ctx.lineTo(x - mw * 0.3, my - 0.03 * h);
    ctx.lineTo(x + mw * 0.3, my - 0.03 * h);
    ctx.lineTo(x + mw * 0.4, my - 0.005 * h);
    ctx.lineTo(x + mw, my - 0.025 * h);
    ctx.quadraticCurveTo(x, my + 0.09 * h, x - mw, my - 0.025 * h);
  }
  ctx.fillStyle = fl ? FACE_DIM : FACE_GLOW;
  ctx.fill();
}

// ---------------------------------------------------------------- 1: the witch's cauldron

function witch(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const ph = phase(level, 4, 1.6);
  const th = ((t + ph) / 1.6) * TAU;
  const wx = (cx - 0.2 * h - (cx - 0.2 * h)) / h; // local origin at the witch's feet
  pivot(cx - 0.2 * h, sill, 0, h);
  const kx = 0.37; // cauldron's center, from the witch
  ctx.beginPath();
  // Robe, hunched
  mv(ctx, -0.13 + wx, 0);
  qd(ctx, -0.13, -0.17, -0.06, -0.265);
  ln(ctx, 0.03, -0.255);
  qd(ctx, 0.07, -0.12, 0.1, 0);
  // Head, hooked nose, pointed chin
  dot(ctx, 0.005, -0.295, 0.045);
  mv(ctx, 0.035, -0.315);
  ln(ctx, 0.095, -0.275);
  ln(ctx, 0.04, -0.29);
  mv(ctx, 0.02, -0.265);
  ln(ctx, 0.06, -0.255);
  ln(ctx, 0.03, -0.285);
  // Hat: brim, then a cone with its tip bent back
  mv(ctx, -0.075, -0.322);
  ln(ctx, 0.085, -0.33);
  ln(ctx, 0.085, -0.345);
  ln(ctx, -0.075, -0.338);
  mv(ctx, -0.045, -0.335);
  qd(ctx, -0.02, -0.4, -0.01, -0.43);
  qd(ctx, -0.05, -0.44, -0.085, -0.425);
  qd(ctx, -0.035, -0.425, 0.045, -0.338);
  // Arm and paddle, stirring round
  const hx = kx - 0.15 + 0.035 * Math.cos(th);
  const hy = -0.26 + 0.012 * Math.sin(th);
  const px = kx + 0.06 * Math.cos(th);
  const py = -0.175 + 0.014 * Math.sin(th);
  limb(ctx, 0.02, -0.235, hx, hy, 0.032);
  limb(ctx, hx - 0.01, hy - 0.025, px, py, 0.02);
  // Cauldron: rim lip, round pot, stubby legs
  mv(ctx, kx - 0.155, -0.19);
  ln(ctx, kx + 0.155, -0.19);
  ln(ctx, kx + 0.155, -0.165);
  ln(ctx, kx - 0.155, -0.165);
  mv(ctx, kx - 0.14, -0.17);
  ctx.bezierCurveTo(X(kx - 0.16, -0.06), Y(kx - 0.16, -0.06), X(kx - 0.08, -0.02), Y(kx - 0.08, -0.02), X(kx, -0.02), Y(kx, -0.02));
  ctx.bezierCurveTo(X(kx + 0.08, -0.02), Y(kx + 0.08, -0.02), X(kx + 0.16, -0.06), Y(kx + 0.16, -0.06), X(kx + 0.14, -0.17), Y(kx + 0.14, -0.17));
  limb(ctx, kx - 0.08, -0.04, kx - 0.1, 0, 0.03);
  limb(ctx, kx + 0.08, -0.04, kx + 0.1, 0, 0.03);
  ctx.fillStyle = SIL;
  ctx.fill();
  // The brew, and bubbles rising off it (a big one blooping now and then)
  ctx.beginPath();
  oval(ctx, X(kx, -0.19), Y(kx, -0.19), 0.13 * h, 0.022 * h);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const p = (t / 0.9 + i / 3 + ph) % 1;
    const bx = kx - 0.07 + i * 0.07 + Math.sin(t * 3 + i * 2) * 0.012;
    dot(ctx, bx, -0.205 - p * 0.13, 0.024 * (1 - 0.45 * p));
  }
  const bl = eventAt(t, level * 13 + 1, 1.5 + phase(level, 5, 4), 7 * pace(level, 5), 0.7, 0.6, 0.6);
  if (bl >= 0) {
    if (bl < 0.35) {
      dot(ctx, kx + 0.02, -0.21 - bl * 0.12, 0.02 + (bl / 0.35) * 0.045);
    } else {
      const q = (bl - 0.35) / 0.25;
      for (let i = -1; i <= 1; i++) dot(ctx, kx + 0.02 + i * 0.1 * q, -0.25 - 0.09 * Math.sin(q * Math.PI) * (1.2 - Math.abs(i) * 0.4), 0.016 * (1 - q * 0.5));
    }
  }
  ctx.fillStyle = GREEN_DEEP;
  ctx.fill();
}

// ---------------------------------------------------------------- 2: the floating spellbook

function book(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const bob = 0.03 * Math.sin(((t + phase(level, 6, 2.4)) / 2.4) * TAU);
  const flip = eventAt(t, level * 7 + 5, 0.4 + phase(level, 7, 2.5), 2.75 * pace(level, 7), 0.45, 0.45, 0.45);
  pivot(cx, sill - 0.24 * h, Math.sin(t * 0.9 + level) * 0.04, h);
  const by = bob;
  ctx.beginPath();
  oval(ctx, cx, sill - 0.22 * h + by * h, 0.34 * h, 0.2 * h);
  ctx.fillStyle = ROOM_GLOW;
  ctx.fill();
  // Cover, open
  ctx.beginPath();
  mv(ctx, -0.27, by + 0.03);
  ln(ctx, 0, by + 0.07);
  ln(ctx, 0.27, by + 0.03);
  ln(ctx, 0.26, by - 0.07);
  ln(ctx, 0, by - 0.035);
  ln(ctx, -0.26, by - 0.07);
  ctx.fillStyle = DOOR_PURPLE;
  ctx.fill();
  // Pages, and one turning over
  ctx.beginPath();
  mv(ctx, 0, by + 0.045);
  qd(ctx, -0.12, by + 0.0, -0.235, by + 0.02);
  ln(ctx, -0.235, by - 0.09);
  qd(ctx, -0.12, by - 0.11, 0, by - 0.065);
  mv(ctx, 0, by + 0.045);
  qd(ctx, 0.12, by + 0.0, 0.235, by + 0.02);
  ln(ctx, 0.235, by - 0.09);
  qd(ctx, 0.12, by - 0.11, 0, by - 0.065);
  if (flip >= 0) {
    const p = flip / 0.45;
    const ex = 0.235 * Math.cos(p * Math.PI);
    const lift = 0.07 * Math.sin(p * Math.PI);
    mv(ctx, 0, by + 0.045);
    qd(ctx, ex * 0.5, by + 0.0 - lift, ex, by + 0.02 - lift);
    ln(ctx, ex, by - 0.09 - lift);
    qd(ctx, ex * 0.5, by - 0.11 - lift, 0, by - 0.065);
  }
  ctx.fillStyle = CREAM;
  ctx.fill();
  // Two sparkles twinkling round it
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const tw = Math.sin(t * 4.2 + i * 2.6 + level);
    if (tw < -0.2) continue;
    const sx = (i === 0 ? -0.31 : 0.3) + Math.sin(t * 0.7 + i) * 0.02;
    const sy = (i === 0 ? -0.1 : -0.15) + Math.cos(t * 0.9 + i) * 0.02;
    const r = 0.05 * (0.4 + 0.6 * tw);
    pivot(cx, sill - 0.24 * h, 0, h);
    mv(ctx, sx, sy - r);
    qd(ctx, sx, sy, sx + r, sy);
    qd(ctx, sx, sy, sx, sy + r);
    qd(ctx, sx, sy, sx - r, sy);
    qd(ctx, sx, sy, sx, sy - r);
  }
  ctx.fillStyle = GOLD;
  ctx.fill();
}

// ---------------------------------------------------------------- 3: the laboratory

const GLASS = "#5a6290";
const FIZZ = "#d8ffcc";

/** Seconds into the Tesla coil's current burst, or -1. */
export function sparkAt(level: number, t: number): number {
  return eventAt(t, level * 5 + 9, 0.8 + phase(level, 8, 3), 4 * pace(level, 8), 0.75, 0.4, 0.4);
}

function lab(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number, calm: boolean): void {
  pivot(cx, sill, 0, h);
  const lx = -0.22;
  const fx = 0.2;
  // A burst arcs from the coil's ball to the flask's neck, flickering every 0.05 s.
  const burst = calm ? -1 : sparkAt(level, t);
  if (burst >= 0) {
    const k = Math.floor(t / 0.05);
    ctx.beginPath();
    mv(ctx, lx + 0.04, -0.35);
    for (let i = 1; i <= 5; i++) {
      const f = i / 6;
      const jx = (hash(k * 13 + i * 7 + level) - 0.5) * 0.08;
      const jy = (hash(k * 17 + i * 3 + level) - 0.5) * 0.1;
      ln(ctx, lx + 0.04 + (fx - lx - 0.04) * f + jx, -0.35 + 0.08 * f - 0.06 * Math.sin(f * Math.PI) + jy);
    }
    ln(ctx, fx, -0.27);
    ctx.strokeStyle = SPARK_HALO;
    ctx.lineWidth = 0.07 * h;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = SPARK;
    ctx.lineWidth = Math.max(0.7, 0.025 * h);
    ctx.stroke();
  }
  // Coil: base, wound column
  ctx.beginPath();
  mv(ctx, lx - 0.08, 0);
  ln(ctx, lx + 0.08, 0);
  ln(ctx, lx + 0.06, -0.06);
  ln(ctx, lx - 0.06, -0.06);
  mv(ctx, lx - 0.035, -0.06);
  ln(ctx, lx + 0.035, -0.06);
  ln(ctx, lx + 0.025, -0.31);
  ln(ctx, lx - 0.025, -0.31);
  ctx.fillStyle = COPPER;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.rect(X(lx - 0.03, -0.1 - i * 0.045), Y(lx, -0.1 - i * 0.045), 0.06 * h, 0.014 * h);
  ctx.fill();
  // Steel: the ball on top, the flask's glass
  ctx.beginPath();
  dot(ctx, lx, -0.345, 0.045);
  dot(ctx, fx, -0.09, 0.085);
  mv(ctx, fx - 0.024, -0.16);
  ln(ctx, fx - 0.024, -0.28);
  ln(ctx, fx + 0.024, -0.28);
  ln(ctx, fx + 0.024, -0.16);
  ctx.fillStyle = burst >= 0 ? STEEL : GLASS;
  ctx.fill();
  // Green brew in the flask, fizzing
  ctx.beginPath();
  mv(ctx, fx - 0.075, -0.06);
  ctx.arc(X(fx, -0.09), Y(fx, -0.09), 0.08 * h, Math.PI - 0.38, 0.38, true);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const p = (t / 0.7 + i * 0.37 + level * 0.13) % 1;
    dot(ctx, fx - 0.03 + i * 0.03, -0.04 - p * 0.24, 0.014 * (1 - p * 0.4));
  }
  ctx.fillStyle = FIZZ;
  ctx.fill();
}

// ---------------------------------------------------------------- 4: the dancing skeleton

/** Seconds into the skeleton's current jig, or -1 (it dances 3–4.5 s, rests 4–10 s). */
export function jigAt(level: number, t: number): number {
  return eventAt(t, level * 3 + 4, 0.5 + phase(level, 9, 4), 11 * pace(level, 9), 0.8, 3, 4.5);
}

function skeleton(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number, R: Readonly<Shudder>): void {
  const jig = jigAt(level, t);
  const on = envelope(jig, EV.dur, 0.25);
  const k = jig >= 0 ? (jig / 0.45) * Math.PI : 0;
  const kick = Math.sin(k) * on;
  const hop = Math.abs(Math.sin(k)) * 0.035 * on + 0.06 * R.jolt * Math.abs(Math.sin(R.since * 12));
  const sway = Math.sin(t * 1.3 + level) * 0.012 * (1 - on);
  const x = (hash(level * 2.9) - 0.5) * 0.18;
  pivot(cx, sill, 0, h);
  const hipX = x + sway;
  const hipY = -0.165 - hop;
  const neckY = -0.315 - hop;
  const lean = kick * 0.025;
  ctx.beginPath();
  // Legs: one kicks out while the other hops
  const lk = Math.max(0, kick);
  const rk = Math.max(0, -kick);
  mv(ctx, hipX - 0.025, hipY);
  ln(ctx, hipX - 0.04 - lk * 0.06, hipY + 0.085 - lk * 0.03);
  ln(ctx, hipX - 0.035 - lk * 0.14, -hop * 0.4 - lk * 0.08);
  ln(ctx, hipX - 0.07 - lk * 0.16, -hop * 0.4 - lk * 0.07);
  mv(ctx, hipX + 0.025, hipY);
  ln(ctx, hipX + 0.04 + rk * 0.06, hipY + 0.085 - rk * 0.03);
  ln(ctx, hipX + 0.035 + rk * 0.14, -hop * 0.4 - rk * 0.08);
  ln(ctx, hipX + 0.07 + rk * 0.16, -hop * 0.4 - rk * 0.07);
  // Pelvis, spine, ribs
  mv(ctx, hipX - 0.04, hipY);
  ln(ctx, hipX + 0.04, hipY);
  mv(ctx, hipX, hipY);
  ln(ctx, hipX + lean, neckY);
  for (let i = 0; i < 3; i++) {
    const ry = neckY + 0.035 + i * 0.03;
    const rw = 0.045 - i * 0.008;
    mv(ctx, hipX + lean - rw, ry + 0.012);
    qd(ctx, hipX + lean, ry - 0.012, hipX + lean + rw, ry + 0.012);
  }
  // Arms: up and waving in the jig, a hand on the hip at rest
  const shY = neckY + 0.02;
  const wave = Math.sin(k * 0.5 + 1) * on;
  for (let side = -1; side <= 1; side += 2) {
    const sx = hipX + lean + side * 0.05;
    const ex = sx + side * (0.05 + on * 0.02);
    const ey = shY + 0.06 * (1 - on) - on * 0.05;
    const hx = side < 0 && on < 0.5 ? hipX - 0.035 : ex + side * on * 0.03 + wave * 0.02;
    const hy = side < 0 && on < 0.5 ? hipY - 0.01 : ey + 0.07 * (1 - on) - on * (0.08 + side * wave * 0.02);
    mv(ctx, sx, shY);
    ln(ctx, ex, ey);
    ln(ctx, hx, hy);
  }
  // The skull, tipping with the music: a ring in the same strokes (its bone fills it)
  const tilt = kick * 0.25;
  const sx = hipX + lean * 1.4;
  const sy = neckY - 0.045;
  const skx = X(sx, sy);
  const sky = Y(sx, sy);
  ctx.moveTo(skx + 0.024 * h, sky);
  ctx.ellipse(skx, sky, 0.024 * h, 0.022 * h, 0, 0, TAU);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.062 * h;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 0.034 * h;
  ctx.stroke();
  // ...and its sockets
  pivot(skx, sky, tilt, h);
  ctx.beginPath();
  dot(ctx, -0.019, -0.004, 0.015);
  dot(ctx, 0.019, -0.004, 0.015);
  ctx.fillStyle = INK;
  ctx.fill();
}

// ---------------------------------------------------------------- 5: the empty rocking chair

/** Seconds into the chair's current spell of rocking, or -1 (rocks 6–11 s, then still 6 s or more). */
export function rockAt(level: number, t: number): number {
  return eventAt(t, level * 5 + 2, 1.6 + phase(level, 10, 5), 21 * pace(level, 10), 1, 6, 11);
}

function chair(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number, R: Readonly<Shudder>): void {
  const r = rockAt(level, t);
  const on = envelope(r, EV.dur, 0.9);
  const a = on * 0.22 * Math.sin(((t + phase(level, 11, 2.2)) / 2.2) * TAU) + R.jolt * 0.2 * Math.sin(R.since * 9);
  const x = cx + (hash(level * 4.1) - 0.5) * 0.2 * h;
  // A crooked picture on the wall behind
  pivot(x + 0.25 * h, sill - 0.33 * h, 0.12, h);
  ctx.beginPath();
  mv(ctx, -0.06, -0.045);
  ln(ctx, 0.06, -0.045);
  ln(ctx, 0.06, 0.045);
  ln(ctx, -0.06, 0.045);
  ctx.closePath();
  mv(ctx, -0.03, -0.045);
  ln(ctx, 0, -0.085);
  ln(ctx, 0.03, -0.045);
  // The chair, rocking on its runners about where they touch the floor
  const lift = Math.abs(a) * 0.15;
  pivot(x - a * 0.17 * h, sill - lift * h * 0.02, a, h);
  mv(ctx, -0.17, -0.03);
  qd(ctx, 0, 0.025, 0.15, -0.035);
  mv(ctx, -0.09, -0.01);
  ln(ctx, -0.09, -0.14);
  mv(ctx, 0.08, -0.01);
  ln(ctx, 0.08, -0.14);
  mv(ctx, -0.12, -0.145);
  ln(ctx, 0.11, -0.145);
  // Tall back, leaning, with a curl at the top
  mv(ctx, -0.11, -0.145);
  ln(ctx, -0.165, -0.38);
  qd(ctx, -0.185, -0.43, -0.14, -0.425);
  qd(ctx, -0.115, -0.415, -0.135, -0.395);
  mv(ctx, -0.075, -0.145);
  ln(ctx, -0.115, -0.37);
  // Arm rest
  mv(ctx, -0.135, -0.25);
  qd(ctx, 0, -0.27, 0.1, -0.235);
  ln(ctx, 0.09, -0.145);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = SIL;
  ctx.lineWidth = 0.032 * h;
  ctx.stroke();
}

// ---------------------------------------------------------------- 6: the portrait

const BACKDROP = "#1c2a33";
const COAT = "#15121d";
const WALLPAPER = "#433060";

const EYES = { look: 0, blink: false };

/** Where a look event points: -1 left, 0 at you, 1 right, never the same twice running. */
function lookOf(seed: number, k: number): number {
  const a = Math.floor(hash(seed * 1.9 + k * 7.3) * 3);
  const b = Math.floor(hash(seed * 1.9 + (k - 1) * 7.3) * 3);
  return (a === b ? (a + 1) % 3 : a) - 1;
}

/**
 * Where the portrait's eyes look (-1 left … 1 right; they dart somewhere new every 3–9 s) and
 * whether they are blinking (every 4–7 s). A reused object.
 */
export function portraitEyes(level: number, t: number): Readonly<{ look: number; blink: boolean }> {
  const seed = level * 7 + 1;
  const first = 0.8 + phase(level, 11, 3);
  const period = 6 * pace(level, 11);
  const k = lastBeat(t, seed, first, period, 1.4);
  const f = Math.min(1, Math.max(0, (t - beat(seed, k, first, period, 1.4)) / 0.25));
  const from = lookOf(seed, k - 1);
  EYES.look = from + (lookOf(seed, k) - from) * f * f * (3 - 2 * f);
  EYES.blink = eventAt(t, level * 7 + 3, 1 + phase(level, 12, 4), 5.5 * pace(level, 12), 0.5, 0.15, 0.15) >= 0;
  return EYES;
}

function portrait(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const x = cx;
  const y = sill - 0.235 * h;
  // Wallpaper stripes
  ctx.fillStyle = WALLPAPER;
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) ctx.rect(x + i * 0.13 * h - 0.022 * h, sill - 0.47 * h, 0.045 * h, 0.47 * h);
  ctx.fill();
  // Gilt oval frame and the dark ground inside
  ctx.beginPath();
  oval(ctx, x, y, 0.2 * h, 0.225 * h);
  ctx.fillStyle = GILT;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x, y, 0.165 * h, 0.19 * h);
  ctx.fillStyle = BACKDROP;
  ctx.fill();
  // The gentleman (drawn a third bigger than the units below): a long pale face...
  pivot(x, y, 0, 1.3 * h);
  ctx.beginPath();
  oval(ctx, x, Y(0, -0.015), 0.062 * 1.3 * h, 0.095 * 1.3 * h);
  ctx.fillStyle = PALE;
  ctx.fill();
  // ...a black coat with a high collar, wild swept hair, and (eyes open) deep dark sockets
  const e = portraitEyes(level, t);
  ctx.beginPath();
  mv(ctx, -0.072, 0.115);
  qd(ctx, -0.062, 0.07, -0.03, 0.068);
  ln(ctx, 0, 0.12);
  ln(ctx, 0.03, 0.068);
  qd(ctx, 0.062, 0.07, 0.072, 0.115);
  qd(ctx, 0.05, 0.142, 0, 0.142);
  qd(ctx, -0.05, 0.142, -0.072, 0.115);
  mv(ctx, -0.07, -0.03);
  qd(ctx, -0.09, -0.12, -0.03, -0.12);
  ln(ctx, -0.05, -0.135);
  ln(ctx, 0.0, -0.118);
  ln(ctx, 0.02, -0.14);
  ln(ctx, 0.04, -0.115);
  ln(ctx, 0.085, -0.13);
  qd(ctx, 0.09, -0.08, 0.07, -0.03);
  qd(ctx, 0.04, -0.09, -0.02, -0.075);
  qd(ctx, -0.06, -0.07, -0.07, -0.03);
  if (!e.blink) {
    dot(ctx, -0.028, -0.025, 0.027);
    dot(ctx, 0.028, -0.025, 0.027);
  }
  ctx.fillStyle = COAT;
  ctx.fill();
  // ...where two glowing eyes follow you about
  if (!e.blink) {
    ctx.beginPath();
    const lx = e.look * 0.013;
    dot(ctx, -0.028 + lx, -0.025, 0.014);
    dot(ctx, 0.028 + lx, -0.025, 0.014);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- 7: the crooked clock

const CLOCK_FACE = "#fff6dc";

function clock(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const lean = (hash(level * 6.1) < 0.5 ? -1 : 1) * 0.07;
  const x = cx + (hash(level * 6.7) - 0.5) * 0.2 * h;
  pivot(x, sill, lean, h);
  // Case: plinth, waist, hood with a crooked spire curling over
  ctx.beginPath();
  mv(ctx, -0.075, 0);
  ln(ctx, 0.075, 0);
  ln(ctx, 0.07, -0.07);
  ln(ctx, 0.05, -0.08);
  ln(ctx, 0.05, -0.27);
  ln(ctx, 0.08, -0.28);
  ln(ctx, 0.08, -0.4);
  qd(ctx, 0.04, -0.42, 0.01, -0.45);
  qd(ctx, -0.03, -0.44, -0.04, -0.415);
  ln(ctx, -0.08, -0.4);
  ln(ctx, -0.08, -0.28);
  ln(ctx, -0.05, -0.27);
  ln(ctx, -0.05, -0.08);
  ln(ctx, -0.07, -0.07);
  ctx.fillStyle = SIL;
  ctx.fill();
  // Face and the pendulum's window
  ctx.beginPath();
  dot(ctx, 0, -0.335, 0.058);
  mv(ctx, -0.028, -0.245);
  ln(ctx, 0.028, -0.245);
  ln(ctx, 0.028, -0.1);
  ln(ctx, -0.028, -0.1);
  ctx.fillStyle = CLOCK_FACE;
  ctx.fill();
  // Hands (the second hand jerks round once a second), the pendulum swinging
  const ph = phase(level, 13, 60);
  const sec = Math.floor(t + ph);
  const sa = (sec / 60) * TAU;
  const ma = ((t + ph) / 3600) * TAU + level;
  const ha = ma / 12 + level * 0.7;
  const pa = 0.3 * Math.sin(((t + phase(level, 14, 1.4)) / 1.4) * TAU);
  ctx.beginPath();
  mv(ctx, 0, -0.335);
  ln(ctx, Math.sin(ha) * 0.03, -0.335 - Math.cos(ha) * 0.03);
  mv(ctx, 0, -0.335);
  ln(ctx, Math.sin(ma) * 0.045, -0.335 - Math.cos(ma) * 0.045);
  mv(ctx, 0, -0.335);
  ln(ctx, Math.sin(sa) * 0.05, -0.335 - Math.cos(sa) * 0.05);
  mv(ctx, 0, -0.24);
  ln(ctx, Math.sin(pa) * 0.1, -0.24 + Math.cos(pa) * 0.1);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.6, 0.018 * h);
  ctx.stroke();
  ctx.beginPath();
  dot(ctx, Math.sin(pa) * 0.11, -0.24 + Math.cos(pa) * 0.11, 0.022);
  ctx.fillStyle = GOLD;
  ctx.fill();
}

// ---------------------------------------------------------------- 8: a figure behind drawn curtains

/** Seconds into the current figure's pass behind the curtains, or -1 (2.5 s, every 6–14 s). */
export function passAt(level: number, t: number): number {
  return eventAt(t, level * 9 + 6, 0.8 + phase(level, 15, 5.5), 10 * pace(level, 15), 1.6, 2.5, 2.5);
}

function drawn(ctx: Ctx, px: number, pw: number, sill: number, ph: number, h: number, level: number, t: number): void {
  // Folds in the fabric
  ctx.beginPath();
  const n = Math.max(3, Math.round(pw / (0.25 * h)));
  for (let i = 1; i < n; i++) {
    const fx = px + (pw * i) / n;
    ctx.moveTo(fx, sill - ph * 0.85);
    ctx.quadraticCurveTo(fx + 0.04 * h, sill - ph * 0.45, fx - 0.01 * h, sill);
  }
  ctx.strokeStyle = FABRIC_FOLD;
  ctx.lineWidth = Math.max(0.6, 0.03 * h);
  ctx.stroke();
  const p = passAt(level, t);
  if (p < 0) return;
  const k = EV.k;
  const who = Math.floor(hash(level * 5.5 + k * 3.1) * 4);
  const dir = hash(level * 2.2 + k * 9.3) < 0.5 ? -1 : 1;
  // In from one side, a pause in the middle (with a gesture), out the other side.
  const walk = p < 0.95 ? (p / 0.95) * 0.5 : p < 1.55 ? 0.5 : 0.5 + ((p - 1.55) / 0.95) * 0.5;
  const act = p >= 0.95 && p < 1.55 ? Math.sin(((p - 0.95) / 0.6) * Math.PI) : 0;
  const margin = 0.15 * h;
  const span = pw - 2 * margin;
  const fx = px + margin + span * (dir > 0 ? walk : 1 - walk);
  const fade = Math.min(1, p / 0.3, (2.5 - p) / 0.3);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * Math.max(0, fade);
  const step = Math.sin(p * 9) * 0.012 * (1 - act);
  pivot(fx, sill, 0, h);
  ctx.beginPath();
  const d = dir;
  if (who === 0) {
    // A tall-hatted gentleman, tipping his hat
    mv(ctx, -0.06, 0);
    ln(ctx, -0.07, -0.2);
    ln(ctx, -0.05, -0.27);
    ln(ctx, 0.05, -0.27);
    ln(ctx, 0.07, -0.2);
    ln(ctx, 0.06, 0);
    dot(ctx, 0, -0.3, 0.04);
    const hl = act * 0.05;
    mv(ctx, -0.05, -0.33 - hl);
    ln(ctx, 0.05, -0.33 - hl);
    ln(ctx, 0.04, -0.44 - hl);
    ln(ctx, -0.04, -0.44 - hl);
    mv(ctx, -0.07, -0.33 - hl);
    ln(ctx, 0.07, -0.33 - hl);
    ln(ctx, 0.07, -0.315 - hl);
    ln(ctx, -0.07, -0.315 - hl);
    limb(ctx, d * 0.05, -0.24, d * (0.08 + act * 0.0), -0.24 - act * 0.13, 0.03);
  } else if (who === 1) {
    // A hunchback carrying a candle
    mv(ctx, -0.08 * d, 0);
    qd(ctx, -0.12 * d, -0.2, -0.04 * d, -0.26);
    qd(ctx, 0.04 * d, -0.24, 0.06 * d, -0.18);
    ln(ctx, 0.06 * d, 0);
    dot(ctx, 0.05 * d, -0.22 + step, 0.035);
    limb(ctx, 0.04 * d, -0.15, 0.12 * d, -0.17 - act * 0.08, 0.03);
    limb(ctx, 0.12 * d, -0.19 - act * 0.08, 0.12 * d, -0.24 - act * 0.08, 0.02);
  } else if (who === 2) {
    // A witch in profile, raising her arms
    mv(ctx, -0.08, 0);
    qd(ctx, -0.06, -0.15, -0.02, -0.25);
    ln(ctx, 0.03, -0.25);
    qd(ctx, 0.06, -0.12, 0.09, 0);
    dot(ctx, 0.005, -0.28, 0.035);
    mv(ctx, 0.03 * d, -0.29);
    ln(ctx, 0.08 * d, -0.27);
    ln(ctx, 0.03 * d, -0.27);
    mv(ctx, -0.075, -0.305);
    ln(ctx, 0.075, -0.305);
    ln(ctx, 0.02, -0.33);
    ln(ctx, -0.03 * d, -0.44);
    ln(ctx, -0.03, -0.33);
    limb(ctx, -0.01, -0.22, -0.08, -0.22 - act * 0.14, 0.025);
    limb(ctx, 0.01, -0.22, 0.08, -0.22 - act * 0.14, 0.025);
  } else {
    // A huge cat's shadow, arching
    const arch = act * 0.05;
    mv(ctx, -0.2, 0);
    qd(ctx, -0.2, -0.2 - arch, 0, -0.2 - arch);
    qd(ctx, 0.14, -0.2 - arch, 0.16, 0);
    dot(ctx, 0.15 * d, -0.24 - arch * 0.5, 0.075);
    mv(ctx, 0.09 * d, -0.29);
    ln(ctx, 0.1 * d, -0.37);
    ln(ctx, 0.14 * d, -0.3);
    mv(ctx, 0.16 * d, -0.3);
    ln(ctx, 0.2 * d, -0.37);
    ln(ctx, 0.21 * d, -0.27);
    limb(ctx, -0.18 * d, -0.05, -0.25 * d, -0.3, 0.035);
  }
  ctx.fillStyle = FABRIC_SHADOW;
  ctx.fill();
  if (who === 1) {
    ctx.beginPath();
    dot(ctx, 0.12 * d, -0.255 - act * 0.08, 0.02);
    ctx.fillStyle = FLAME_HOT;
    ctx.fill();
  }
  ctx.globalAlpha = a0;
}

// ---------------------------------------------------------------- 9: the ghost in the dark room

const SHEET = "#3a2a58";
const GHOST_ALPHA = 0.75;

/** Seconds into the ghost's current drift across the room, or -1 (2.2 s, every 5–12 s). */
export function driftAt(level: number, t: number): number {
  return eventAt(t, level * 4 + 8, 0.9 + phase(level, 16, 5), 8.5 * pace(level, 16), 1.4, 2.2, 2.2);
}

function ghost(ctx: Ctx, px: number, pw: number, sill: number, h: number, level: number, t: number): void {
  // A dust sheet over an armchair, and a clock on the mantel
  const side = hash(level * 3.9) < 0.5 ? -1 : 1;
  const ax = px + pw / 2 + side * 0.22 * h;
  pivot(ax, sill, 0, h);
  ctx.beginPath();
  mv(ctx, -0.13, 0);
  qd(ctx, -0.15, -0.12, -0.1, -0.2);
  qd(ctx, -0.05, -0.26, 0, -0.2);
  qd(ctx, 0.06, -0.15, 0.13, -0.16);
  qd(ctx, 0.15, -0.08, 0.13, 0);
  ctx.fillStyle = SHEET;
  ctx.fill();
  const d = driftAt(level, t);
  if (d < 0) return;
  const k = EV.k;
  const dir = hash(level * 6.6 + k * 2.7) < 0.5 ? -1 : 1;
  const p = d / 2.2;
  const margin = 0.2 * h;
  const gx = px + margin + (pw - 2 * margin) * (dir > 0 ? p : 1 - p);
  const gy = sill - 0.16 * h + Math.sin(d * 5) * 0.02 * h;
  const fade = Math.min(1, d / 0.35, (2.2 - d) / 0.35);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * GHOST_ALPHA * Math.max(0, fade);
  pivot(gx, gy, -dir * 0.12, h * 1.3);
  ctx.beginPath();
  mv(ctx, -0.075, 0.06);
  ln(ctx, -0.075, -0.13);
  ctx.arc(X(0, -0.13), Y(0, -0.13), 0.075 * h * 1.3, Math.PI - dir * 0.12, -dir * 0.12, false);
  ln(ctx, 0.075, 0.06);
  const w = Math.sin(d * 9) * 0.015;
  qd(ctx, 0.06, 0.1 + w, 0.035, 0.07);
  qd(ctx, 0.01, 0.11 - w, -0.015, 0.075);
  qd(ctx, -0.04, 0.11 + w, -0.075, 0.06);
  // Little arms
  mv(ctx, 0.07, -0.08);
  ln(ctx, 0.12, -0.11 + w);
  ln(ctx, 0.075, -0.05);
  mv(ctx, -0.07, -0.08);
  ln(ctx, -0.12, -0.1 - w);
  ln(ctx, -0.075, -0.05);
  ctx.fillStyle = GHOST_BODY;
  ctx.fill();
  ctx.globalAlpha = a0 * Math.max(0, fade);
  ctx.beginPath();
  const ex = dir * 0.012;
  oval(ctx, X(-0.025 + ex, -0.135), Y(-0.025 + ex, -0.135), 0.018 * h, 0.028 * h);
  oval(ctx, X(0.025 + ex, -0.135), Y(0.025 + ex, -0.135), 0.018 * h, 0.028 * h);
  oval(ctx, X(ex, -0.085), Y(ex, -0.085), 0.02 * h, 0.026 * h);
  ctx.fillStyle = GHOST_FACE;
  ctx.fill();
  ctx.globalAlpha = a0;
}

// ---------------------------------------------------------------- 10: the candelabra

const BRASS = "#b8893a";
const CANDLE_GLOW = "#57304a";

function candles(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const x = cx + (hash(level * 7.7) - 0.5) * 0.12 * h;
  pivot(x, sill, 0, h);
  ctx.beginPath();
  // The candlelight breathes with the flames
  const glow = 1 + 0.06 * Math.sin(t * 9.1 + level) * Math.sin(t * 5.3 + level * 0.7);
  oval(ctx, x, sill - 0.3 * h, 0.36 * h * glow, 0.17 * h * glow);
  ctx.fillStyle = CANDLE_GLOW;
  ctx.fill();
  // The candelabra: a foot and stem, two arms curving up to the cups
  ctx.beginPath();
  mv(ctx, -0.07, 0);
  ln(ctx, 0.07, 0);
  ln(ctx, 0.016, -0.06);
  ln(ctx, 0.016, -0.225);
  ln(ctx, -0.016, -0.225);
  ln(ctx, -0.016, -0.06);
  for (let s = -1; s <= 1; s += 2) {
    mv(ctx, 0, -0.115);
    qd(ctx, s * 0.15, -0.12, s * 0.15, -0.22);
    ln(ctx, s * 0.11, -0.22);
    qd(ctx, s * 0.115, -0.16, 0, -0.15);
  }
  ctx.fillStyle = BRASS;
  ctx.fill();
  // Candles of three heights, each with a drip of wax running down now and then
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    const cxl = i * 0.13;
    const top = i === 0 ? -0.36 : i < 0 ? -0.31 : -0.33;
    mv(ctx, cxl - 0.022, -0.22);
    ln(ctx, cxl - 0.022, top);
    ln(ctx, cxl + 0.022, top + 0.006);
    ln(ctx, cxl + 0.022, -0.22);
    const dr = eventAt(t, level * 3 + i + 20, 0.5 + phase(level, 17 + i, 4), 5 * pace(level, 17 + i), 0.75, 1.2, 1.2);
    if (dr >= 0) {
      const q = dr / 1.2;
      const dy = top + 0.01 + q * (-0.22 - top - 0.02) * 0.8;
      const sx = cxl + (i < 0 ? -0.022 : 0.022);
      mv(ctx, sx, top + 0.005);
      ln(ctx, sx, dy);
      oval(ctx, X(sx, dy), Y(sx, dy), 0.012 * h, 0.012 * h);
    }
  }
  ctx.fillStyle = WAX;
  ctx.fill();
  // Flames, flickering out of step
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const top = i === 0 ? -0.36 : i < 0 ? -0.31 : -0.33;
      const fl = 1 + 0.35 * Math.sin(t * (11 + i * 2.3) + level + i) * Math.sin(t * (7.3 - i) + i * 4);
      const lean = 0.02 * Math.sin(t * (5.1 + i) + level * 2 + i);
      const s = pass === 0 ? 1 : 0.5;
      const fx = i * 0.13;
      const fy = top - 0.005;
      mv(ctx, fx - 0.018 * s, fy);
      qd(ctx, fx - 0.02 * s, fy - 0.04 * s * fl, fx + lean, fy - 0.075 * s * fl);
      qd(ctx, fx + 0.02 * s, fy - 0.04 * s * fl, fx + 0.018 * s, fy);
      qd(ctx, fx, fy + 0.012 * s, fx - 0.018 * s, fy);
    }
    ctx.fillStyle = pass === 0 ? FLAME : FLAME_HOT;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- 11: the black cat on the sill

function cat(ctx: Ctx, cx: number, sill: number, h: number, level: number, t: number): void {
  const x = cx + (hash(level * 8.3) < 0.5 ? -0.12 : 0.12) * h;
  const turn = (glide(t, level * 5 + 7, 7, 0.15) - 0.5) * 2;
  const b = eventAt(t, level * 5 + 11, 0.7 + phase(level, 18, 3.5), 4.5 * pace(level, 18), 0.55, 0.15, 0.15);
  const shut = b >= 0 ? Math.sin((b / 0.15) * Math.PI) : 0;
  const swish = Math.sin(((t + phase(level, 19, 1.8)) / 1.8) * TAU);
  pivot(x, sill, 0, h);
  ctx.beginPath();
  // Body sitting, head with ears (turning a little), the tail hanging over the sill and swishing
  mv(ctx, -0.085, 0);
  qd(ctx, -0.1, -0.13, -0.035, -0.19);
  ln(ctx, 0.035, -0.19);
  qd(ctx, 0.1, -0.13, 0.085, 0);
  const hx = turn * 0.02;
  dot(ctx, hx, -0.235, 0.062);
  mv(ctx, hx - 0.058, -0.25);
  ln(ctx, hx - 0.05, -0.33);
  ln(ctx, hx - 0.012, -0.285);
  mv(ctx, hx + 0.058, -0.25);
  ln(ctx, hx + 0.05, -0.33);
  ln(ctx, hx + 0.012, -0.285);
  ctx.fillStyle = SIL;
  ctx.fill();
  ctx.beginPath();
  mv(ctx, 0.06, -0.01);
  qd(ctx, 0.13, -0.005, 0.12 + swish * 0.03, 0.04);
  qd(ctx, 0.1 + swish * 0.09, 0.075, 0.14 + swish * 0.11, 0.065);
  ctx.strokeStyle = SIL;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.04 * h;
  ctx.stroke();
  // Gold eyes with slit pupils, blinking
  ctx.beginPath();
  for (let s = -1; s <= 1; s += 2) oval(ctx, X(hx + s * 0.026 + turn * 0.01, -0.238), Y(hx, -0.238), 0.019 * h, 0.017 * h * (1 - 0.9 * shut));
  ctx.fillStyle = GOLD;
  ctx.fill();
  if (shut < 0.6) {
    ctx.beginPath();
    for (let s = -1; s <= 1; s += 2) oval(ctx, X(hx + s * 0.026 + turn * 0.016, -0.238), Y(hx, -0.238), 0.005 * h, 0.015 * h * (1 - shut));
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the front door (ground floor)

const KNOCKER = "#1a1226";
const STEP = "#8a8298";

/** The front door opens a crack first at 2.5 s, then every 8–15 s, for 1.2 s. */
export const DOOR_FIRST = 2.5;
const DOOR_OPEN = 1.2;

/** How far the front door stands open now (0 shut … 1 ajar). */
export function doorOpen(level: number, t: number): number {
  return envelope(eventAt(t, level * 3 + 31, DOOR_FIRST, 11.5, 1.3, DOOR_OPEN, DOOR_OPEN), DOOR_OPEN, 0.3);
}

function door(ctx: Ctx, x0: number, y: number, w: number, h: number, level: number, t: number, mode: number): void {
  const top = y + 0.2 * h;
  const bot = y + 0.9 * h;
  const r = w / 2;
  // Surround (stone) and the dark doorway
  ctx.beginPath();
  ctx.moveTo(x0, bot);
  ctx.lineTo(x0, top + r);
  ctx.arc(x0 + r, top + r, r, Math.PI, 0);
  ctx.lineTo(x0 + w, bot);
  ctx.closePath();
  ctx.fillStyle = FRAME;
  ctx.fill();
  const f = 0.06 * h;
  const ix = x0 + f;
  const iw = w - 2 * f;
  const ir = iw / 2;
  const itop = top + f;
  // The light inside, seen through the gap as the door swings in
  const open = mode === 2 ? 0 : doorOpen(level, t);
  if (open > 0) {
    ctx.beginPath();
    ctx.moveTo(ix, bot);
    ctx.lineTo(ix, itop + ir);
    ctx.arc(ix + ir, itop + ir, ir, Math.PI, 0);
    ctx.lineTo(ix + iw, bot);
    ctx.closePath();
    ctx.fillStyle = PANE_LIT;
    ctx.fill();
  }
  // The door leaf: hinged on the left, narrowing as it opens
  const lw = iw * (1 - 0.42 * open);
  ctx.beginPath();
  ctx.moveTo(ix, bot);
  ctx.lineTo(ix, itop + ir);
  ctx.arc(ix + ir, itop + ir, ir, Math.PI, Math.PI * 1.5);
  ctx.quadraticCurveTo(ix + lw, itop + ir * (1 - 0.6 * open), ix + lw, itop + ir + 0.02 * h * open);
  ctx.lineTo(ix + lw, bot);
  ctx.closePath();
  ctx.fillStyle = DOOR_PURPLE;
  ctx.fill();
  // Panels and the iron knocker
  ctx.beginPath();
  const pl = ix + lw * 0.2;
  const pr = ix + lw * 0.8;
  ctx.moveTo(pl, itop + ir * 0.9);
  ctx.lineTo(pr, itop + ir * 0.9);
  ctx.lineTo(pr, y + 0.5 * h);
  ctx.lineTo(pl, y + 0.5 * h);
  ctx.closePath();
  ctx.moveTo(pl, y + 0.58 * h);
  ctx.lineTo(pr, y + 0.58 * h);
  ctx.lineTo(pr, bot - 0.06 * h);
  ctx.lineTo(pl, bot - 0.06 * h);
  ctx.closePath();
  ctx.strokeStyle = DOOR_DARK;
  ctx.lineWidth = Math.max(0.6, 0.03 * h);
  ctx.stroke();
  ctx.beginPath();
  const kx = ix + lw * 0.5;
  const ky = y + 0.54 * h;
  oval(ctx, kx, ky + 0.02 * h, 0.045 * h, 0.045 * h);
  oval(ctx, kx, ky - 0.03 * h, 0.022 * h, 0.022 * h);
  ctx.strokeStyle = KNOCKER;
  ctx.lineWidth = Math.max(0.6, 0.022 * h);
  ctx.stroke();
  // A worn stone step
  ctx.beginPath();
  ctx.moveTo(x0 - 0.06 * h, bot);
  ctx.lineTo(x0 + w + 0.06 * h, bot);
  ctx.lineTo(x0 + w + 0.06 * h, bot + 0.06 * h);
  ctx.lineTo(x0 - 0.06 * h, bot + 0.06 * h);
  ctx.closePath();
  ctx.fillStyle = STEP;
  ctx.fill();
}

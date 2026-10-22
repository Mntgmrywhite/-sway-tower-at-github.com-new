import { hash, type Ctx } from "../../../base/draw";
import { eventAt, glide, phase } from "./clock";
import {
  ARCHED,
  DIAMOND,
  DOOR,
  FRAME,
  GOLD,
  INK,
  OVAL,
  PANE_DIM,
  PANE_LIT,
  POINTED,
  PORTHOLE,
  TALL,
  type Kind,
} from "./palette";
import type { Shudder } from "./react";

// The small windows of a floor: crooked panes, each tilted its own way and breathing a little, with
// dark frames, a cross of glazing bars and, on some storeys, shutters (one in five hangs by a single
// hinge). About half are lit. A lit pane flickers now and then and goes out for a few seconds once
// in a while; on one floor in three, two dark panes side by side are eyes that look about and
// blink. Where they go (and where the room and the lantern go) is laid out here for every floor.

/** Pane half-size and frame, in floor heights. */
export const PANE_HW = 0.21;
export const PANE_HH = 0.28;
export const PANE_CY = 0.47;
export const FR = 0.06;
const SHUTTER_W = 0.1;
const SHUTTER_GAP = 0.02;
const OPEN = 0.08;
const BROKEN = -0.32;
/** The room: its frame's width and height, and where its top sits. */
export const ROOM_W = 1.6;
export const ROOM_TOP = 0.17;
export const ROOM_H = 0.6;
/** The front door's place on the ground floor. */
export const DOOR_W = 0.72;
/** A floor must be this wide (in heights) to hold a room. */
export const ROOM_MIN = 2.9;
/** The lantern's hook sits this far in from its end; the lantern needs this much of the end. */
export const LANTERN_IN = 0.42;
const LANTERN_ZONE = 0.76;
/** Windows and room together cover at most this share of the face. */
const COVER = 0.34;
const MAX = 24;

export interface Layout {
  n: number;
  cx: Float64Array;
  tilt: Float64Array;
  lit: Uint8Array;
  /** The room (or the front door): present, and its frame's left edge, width and crooked top. */
  room: boolean;
  rx: number;
  rw: number;
  /** How far the room's top-left and top-right corners sit below ROOM_TOP, in heights. */
  rl: number;
  rr: number;
  /** -1 = the lantern hangs at the left end, 1 = the right, 0 = none. */
  lantern: number;
  /** The pair of panes that are eyes (the first of the two), or -1. */
  eyes: number;
}

export const LAY: Layout = {
  n: 0,
  cx: new Float64Array(MAX),
  tilt: new Float64Array(MAX),
  lit: new Uint8Array(MAX),
  room: false,
  rx: 0,
  rw: 0,
  rl: 0,
  rr: 0,
  lantern: 0,
  eyes: -1,
};

function frameArea(shape: number): number {
  const hw = (shape === TALL ? PANE_HW * 0.74 : PANE_HW) + FR;
  return 4 * hw * (PANE_HH + FR);
}

let budget = 0;

/** Windows evenly along a stretch of centers lo..hi (in heights from x), pitch apart. */
function fillSpan(x: number, h: number, lo: number, hi: number, p: number): void {
  const L = LAY;
  if (hi < lo - 1e-9) return;
  const n = Math.min(Math.floor((hi - lo) / p + 1e-9) + 1, budget, MAX - L.n);
  if (n <= 0) return;
  budget -= n;
  const start = lo + (hi - lo - (n - 1) * p) / 2;
  for (let j = 0; j < n; j++) L.cx[L.n++] = x + (start + j * p) * h;
}

/** Windows left to right (the two sides of a room may have been filled right side first). */
function sortWindows(): void {
  const L = LAY;
  for (let i = 1; i < L.n; i++) {
    const v = L.cx[i]!;
    let j = i - 1;
    while (j >= 0 && L.cx[j]! > v) {
      L.cx[j + 1] = L.cx[j]!;
      j--;
    }
    L.cx[j + 1] = v;
  }
}

/** Lays out a floor of width w (pixels) and height h: windows, room, lantern. */
export function layout(x: number, w: number, h: number, level: number, K: Kind): Layout {
  const L = LAY;
  L.n = 0;
  L.room = false;
  L.lantern = 0;
  L.eyes = -1;
  const W = w / h; // width in floor heights
  if (!(W >= 1)) return L;
  const slot = (K.shape === TALL ? PANE_HW * 0.74 : PANE_HW) + FR + (K.shutters ? SHUTTER_GAP + SHUTTER_W + 0.17 : 0);
  if (K.lantern && W >= 2.4) L.lantern = hash(level * 5.1 + 1) < 0.5 ? -1 : 1;
  const endIn = Math.min(slot + 0.06, Math.max(0.2, (W - 2 * slot) / 2 + slot));
  let a = endIn;
  let b = W - endIn;
  if (L.lantern < 0) a = Math.max(a, LANTERN_ZONE + slot);
  if (L.lantern > 0) b = Math.min(b, W - LANTERN_ZONE - slot);
  const pitch = K.shutters ? 1.45 : 1.3;
  const isDoor = K.room === DOOR;
  // The room: in the left, middle or right of the free stretch (the door always in the middle).
  let r0 = 0;
  let r1 = 0;
  if (isDoor ? W >= 1.6 : W >= ROOM_MIN) {
    const rw = isDoor ? DOOR_W : ROOM_W;
    const lo = Math.max(0.4, L.lantern < 0 ? LANTERN_ZONE : 0.4);
    const hi = W - Math.max(0.4, L.lantern > 0 ? LANTERN_ZONE : 0.4) - rw;
    if (hi >= lo) {
      const third = Math.floor(hash(level * 7.3 + 1) * 3);
      const pick = isDoor ? 0.5 : third === 0 ? 0.12 : third === 1 ? 0.5 : 0.88;
      const rx = isDoor ? (W - rw) / 2 : lo + (hi - lo) * pick;
      L.room = true;
      L.rx = x + rx * h;
      L.rw = rw * h;
      L.rl = (hash(level * 3.7 + 2) - 0.5) * 0.06;
      L.rr = -L.rl;
      r0 = rx - 0.08 - slot;
      r1 = rx + rw + 0.08 + slot;
    }
  }
  // Windows in what is left: one stretch, or two either side of the room (the longer side first,
  // so a tight budget keeps the floor balanced).
  budget = Math.floor((COVER * W - (L.room && !isDoor ? ROOM_W * ROOM_H : 0)) / frameArea(K.shape));
  if (L.room) {
    if (r0 - a >= b - r1) {
      fillSpan(x, h, a, r0, pitch);
      fillSpan(x, h, r1, b, pitch);
    } else {
      fillSpan(x, h, r1, b, pitch);
      fillSpan(x, h, a, r0, pitch);
    }
    sortWindows();
  } else fillSpan(x, h, a, b, pitch);

  // Tilts and lights, hashed by the floor and the window's place from the left.
  for (let i = 0; i < L.n; i++) {
    L.tilt[i] = (hash(level * 31.3 + i * 7.1) - 0.5) * 0.16;
    L.lit[i] = hash(level * 17.9 + i * 3.3 + 0.5) < 0.55 ? 1 : 0;
  }
  // Eyes: on one floor in three, two neighboring panes.
  if (L.n >= 2 && hash(level * 13.7 + 7) < 0.34) {
    const p = Math.floor(hash(level * 23.1 + 2) * (L.n - 1));
    if (L.cx[p + 1]! - L.cx[p]! < pitch * h * 1.2) {
      L.eyes = p;
      L.lit[p] = 0;
      L.lit[p + 1] = 0;
    }
  }
  return L;
}

// ---------------------------------------------------------------- shapes

// Rotation about a center, for the shapes below (module scratch: no closures, no allocation).
let OX = 0;
let OY = 0;
let RC = 1;
let RS = 0;
function frameAt(cx: number, cy: number, a: number): void {
  OX = cx;
  OY = cy;
  RC = Math.cos(a);
  RS = Math.sin(a);
}
const X = (lx: number, ly: number) => OX + lx * RC - ly * RS;
const Y = (lx: number, ly: number) => OY + lx * RS + ly * RC;

/** A pane (or its frame) as a subpath: center, half-size, tilt; `close` it to stroke it. */
export function paneShape(ctx: Ctx, shape: number, cx: number, cy: number, hw: number, hh: number, a: number, close = false): void {
  if (shape === PORTHOLE) {
    const r = Math.min(hw, hh) * 1.12;
    ctx.moveTo(cx + r, cy);
    ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
    if (close) ctx.closePath();
    return;
  }
  frameAt(cx, cy, a);
  if (shape === OVAL) {
    ctx.moveTo(X(hw, 0), Y(hw, 0));
    ctx.ellipse(cx, cy, hw, hh, a, 0, Math.PI * 2);
    if (close) ctx.closePath();
    return;
  }
  if (shape === TALL) hw *= 0.74;
  ctx.moveTo(X(-hw, hh), Y(-hw, hh));
  ctx.lineTo(X(hw, hh), Y(hw, hh));
  if (shape === POINTED) {
    // A lancet arch
    ctx.lineTo(X(hw, -hh * 0.25), Y(hw, -hh * 0.25));
    ctx.quadraticCurveTo(X(hw, -hh * 0.8), Y(hw, -hh * 0.8), X(0, -hh), Y(0, -hh));
    ctx.quadraticCurveTo(X(-hw, -hh * 0.8), Y(-hw, -hh * 0.8), X(-hw, -hh * 0.25), Y(-hw, -hh * 0.25));
  } else if (shape === ARCHED) {
    ctx.lineTo(X(hw, -hh + hw), Y(hw, -hh + hw));
    ctx.arc(X(0, -hh + hw), Y(0, -hh + hw), hw, a, a - Math.PI, true);
  } else {
    ctx.lineTo(X(hw, -hh), Y(hw, -hh));
    ctx.lineTo(X(-hw, -hh), Y(-hw, -hh));
  }
  if (close) ctx.closePath();
}

/** The glazing bars of a lit pane. */
function bars(ctx: Ctx, shape: number, cx: number, cy: number, hw: number, hh: number, a: number): void {
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (shape === TALL) hw *= 0.74;
  if (shape === PORTHOLE) {
    const r = Math.min(hw, hh) * 1.12;
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    return;
  }
  if (shape === DIAMOND) {
    ctx.moveTo(cx - hw * c + hh * s, cy - hw * s - hh * c);
    ctx.lineTo(cx + hw * c - hh * s, cy + hw * s + hh * c);
    ctx.moveTo(cx + hw * c + hh * s, cy + hw * s - hh * c);
    ctx.lineTo(cx - hw * c - hh * s, cy - hw * s + hh * c);
    ctx.moveTo(cx - hw * c, cy - hw * s);
    ctx.lineTo(cx + hw * c, cy + hw * s);
    return;
  }
  // A vertical bar, and a cross bar a little above the middle.
  const top = shape === OVAL ? -hh : shape === POINTED ? -hh * 0.95 : -hh;
  ctx.moveTo(cx - top * s, cy + top * c);
  ctx.lineTo(cx - hh * s, cy + hh * c);
  if (shape === OVAL) return;
  const yb = -hh * 0.15;
  ctx.moveTo(cx - hw * c - yb * s, cy - hw * s + yb * c);
  ctx.lineTo(cx + hw * c - yb * s, cy + hw * s + yb * c);
}

/** One shutter, hanging from its top hinge beside the frame; side -1 = left of the pane. */
function shutter(ctx: Ctx, cx: number, cy: number, hw: number, hh: number, a: number, side: number, swing: number, h: number): void {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hx = side * (hw + SHUTTER_GAP * h);
  const hy = -hh;
  const px = cx + hx * c - hy * s;
  const py = cy + hx * s + hy * c;
  const th = a + swing * -side;
  const cc = Math.cos(th);
  const ss = Math.sin(th);
  const sw = SHUTTER_W * h * side;
  const sh = 2 * hh;
  ctx.moveTo(px, py);
  ctx.lineTo(px + sw * cc, py + sw * ss);
  ctx.lineTo(px + sw * cc - sh * ss, py + sw * ss + sh * cc);
  ctx.lineTo(px - sh * ss, py + sh * cc);
}

// ---------------------------------------------------------------- drawing

/** How a window shows now: 0 dark, 1 lit, 2 flickering dim. */
function lightOf(i: number, level: number, t: number, live: boolean, still: boolean): number {
  if (!LAY.lit[i]) return 0;
  if (!live) return 1;
  const seed = level * 41 + i * 7 + 1;
  // Out for 2–5 s every 20–40 s.
  if (eventAt(t, seed, 4 + hash(seed) * 26, 30, 3.5, 2, 5) >= 0) return 0;
  // A flicker of 0.08–0.2 s every 5–14 s (not with reduce motion: it's a flash).
  if (!still && eventAt(t, seed + 0.5, 1 + hash(seed + 0.3) * 8, 9.5, 1.8, 0.08, 0.2) >= 0) return 2;
  return 1;
}

/** Each window's light this frame (lightOf), worked out once. */
const LIGHT = new Uint8Array(MAX);

/**
 * The frames (with the room's), the panes, the glazing bars and the shutters. `mode`: 0 = live
 * (tower and top), 1 = the slider (steady), 2 = loose (lights out). An unlit pane is simply its
 * dark frame filled in.
 */
export function drawWindows(ctx: Ctx, y: number, h: number, level: number, K: Kind, t: number, mode: number, still: boolean, R: Readonly<Shudder>): void {
  const L = LAY;
  const cy = y + (PANE_CY + R.jy * 0.6) * h;
  const hw = PANE_HW * h;
  const hh = PANE_HH * h;
  const fr = FR * h;
  const live = mode === 0;
  const breathe = 0.012 * Math.sin((t * 2 * Math.PI) / (5 + hash(level * 2.3) * 2) + phase(level, 1, 7));
  const tilt0 = breathe + R.jx * 3;
  let lit = 0;
  let dim = 0;
  for (let i = 0; i < L.n; i++) {
    const v = mode === 2 || R.blink ? 0 : lightOf(i, level, t, live, still);
    LIGHT[i] = v;
    if (v === 1) lit++;
    else if (v === 2) dim++;
  }
  // Shutters
  if (K.shutters) {
    ctx.beginPath();
    for (let i = 0; i < L.n; i++) {
      const a = L.tilt[i]! + tilt0;
      const whw = (K.shape === TALL ? hw * 0.74 : hw) + fr;
      // Both shutters, or one (the other long gone); one in five hangs by a single hinge.
      const one = hash(level * 6.7 + i * 2.9);
      for (let side = -1; side <= 1; side += 2) {
        if (one < 0.5 && (one < 0.25 ? side < 0 : side > 0)) continue;
        const broken = hash(level * 9.1 + i * 4.3 + side) < 0.2 ? BROKEN : 0;
        shutter(ctx, L.cx[i]!, cy, whw, hh + fr * 0.5, a, side, OPEN + broken + R.shake, h);
      }
    }
    ctx.fillStyle = K.shutter;
    ctx.fill();
  }
  // Frames of the unlit windows (an unlit window is all frame), and the room's
  ctx.beginPath();
  for (let i = 0; i < L.n; i++) if (LIGHT[i] === 0) paneShape(ctx, K.shape, L.cx[i]!, cy, hw + fr, hh + fr, L.tilt[i]! + tilt0);
  if (L.room && K.room !== DOOR) {
    const top = y + ROOM_TOP * h;
    ctx.moveTo(L.rx, top + L.rl * h);
    ctx.lineTo(L.rx + L.rw, top + L.rr * h);
    ctx.lineTo(L.rx + L.rw, top + ROOM_H * h);
    ctx.lineTo(L.rx, top + ROOM_H * h);
  }
  ctx.fillStyle = FRAME;
  ctx.fill();
  // Lit panes (and dimmed ones), each one path for its glass, its frame and its glazing bars: the
  // glass filled, then the frame and the bars stroked over it, half a frame's width either side of
  // the path (so the path runs half a frame outside the glass).
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = fr;
  for (let pass = 1; pass <= 2; pass++) {
    if ((pass === 1 ? lit : dim) === 0) continue;
    ctx.beginPath();
    for (let i = 0; i < L.n; i++) {
      if (LIGHT[i] !== pass) continue;
      paneShape(ctx, K.shape, L.cx[i]!, cy, hw + fr / 2, hh + fr / 2, L.tilt[i]! + tilt0, true);
      bars(ctx, K.shape, L.cx[i]!, cy, hw, hh, L.tilt[i]! + tilt0);
    }
    ctx.fillStyle = pass === 1 ? PANE_LIT : PANE_DIM;
    ctx.fill();
    ctx.stroke();
  }
  // Eyes in the dark pair: gold almond eyes with slit pupils that look about and blink.
  if (L.eyes >= 0 && live && !R.blink) eyes(ctx, cy, h, level, t);
}

/** The house looking out of two dark windows. */
function eyes(ctx: Ctx, cy: number, h: number, level: number, t: number): void {
  const L = LAY;
  const seed = level * 19 + 3;
  const look = (glide(t, seed, 3 + hash(seed) * 2.5) - 0.5) * 2;
  const up = (glide(t, seed + 9, 5.3) - 0.5) * 0.05 * h;
  const b = eyesBlink(level, t);
  const open = b >= 0 ? Math.abs(Math.cos((b / EYE_BLINK) * Math.PI)) : 1;
  const rw = 0.16 * h;
  const rh = 0.12 * h * Math.max(0.08, open);
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1 && open < 0.3) break;
    ctx.beginPath();
    for (let j = 0; j < 2; j++) {
      const ex = L.cx[L.eyes + j]!;
      const ey = cy + up;
      // Slanted down toward each other: a sly look
      const a = (j === 0 ? 1 : -1) * 0.18;
      if (pass === 0) almond(ctx, ex, ey, rw, rh, a);
      else almond(ctx, ex + look * 0.07 * h, ey + look * a * 0.07 * h, 0.035 * h, rh * 0.95, 0);
    }
    ctx.fillStyle = pass === 0 ? GOLD : INK;
    ctx.fill();
  }
}

/** A pointed oval (an eye), half-width rw, half-height rh, tilted a. */
function almond(ctx: Ctx, x: number, y: number, rw: number, rh: number, a: number): void {
  frameAt(x, y, a);
  ctx.moveTo(X(-rw, 0), Y(-rw, 0));
  ctx.quadraticCurveTo(X(0, -rh * 2), Y(0, -rh * 2), X(rw, 0), Y(rw, 0));
  ctx.quadraticCurveTo(X(0, rh * 2), Y(0, rh * 2), X(-rw, 0), Y(-rw, 0));
}

const EYE_BLINK = 0.18;

/** Seconds into the eyes' current blink (for tests), or -1. */
export function eyesBlink(level: number, t: number): number {
  const seed = level * 19 + 3;
  return eventAt(t, seed, 1 + hash(seed + 1) * 5, 7.5, 1.4, EYE_BLINK, EYE_BLINK);
}


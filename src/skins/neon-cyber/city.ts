import { circle, hash, mix, type Ctx } from "../../base/draw";
import { tint, tube } from "./tube";
import type { Scene } from "../skin";
import {
  BLUE,
  CYAN,
  HAZE,
  HAZE_WIN,
  MAGENTA,
  NEAR,
  PINK,
  PURPLE,
  RED,
  SLAB,
  SLAB_EDGE,
  WINDOW_COLORS,
} from "./colors";
import { boardSign, holoBillboard, verticalSign } from "./signs";
import { hoverCarFleet, type CarSlot } from "./car";

// The far layer: a rainy megacity standing on the horizon, in three rows of silhouettes.
// Smog-lit haze towers far back (pale, with pinprick windows and red beacons), dark mid towers
// with lit window grids and light strips, vertical glyph signs and a holographic billboard,
// and a low row of street blocks with rooftop clutter right on the horizon. Hover cars glide
// between the back and mid rows. The tallest towers flank the HUD column; the middle, behind
// the tower, stays low and calm.
// Geometry is in u, x from the screen center, heights up from the horizon.

type Roof = "flat" | "crown" | "spire" | "slant" | "antenna" | "tank";
type Lights = "grid" | "strips" | "sparse" | "none";

interface Tower {
  x: number;
  w: number;
  h: number;
  roof: Roof;
  lights: Lights;
}

const ROOFS: Roof[] = ["flat", "crown", "spire", "slant", "antenna", "tank"];

/** The moon hangs over this stretch on the right: towers under it stay below its rim. */
const MOON_SPAN = [0.27, 0.46] as const;
const UNDER_MOON = 0.32;

/** A continuous row of towers from -span to span, taller toward the screen edges. */
function row(seed: number, span: number, minW: number, maxW: number, low: number, high: number, jitter: number): Tower[] {
  const out: Tower[] = [];
  let x = -span;
  for (let i = 0; x < span; i++) {
    const w = minW + hash(seed + i * 3.1) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    const side = Math.min(1, mid / 0.5);
    let h = low + (high - low) * side * side + hash(seed + i * 3.1 + 1) * jitter;
    if (x + w > MOON_SPAN[0] && x < MOON_SPAN[1]) h = Math.min(h, UNDER_MOON - 0.04);
    const roof = ROOFS[Math.floor(hash(seed + i * 3.1 + 2) * ROOFS.length)]!;
    out.push({ x, w, h, roof, lights: "sparse" });
    x += w * (0.82 + hash(seed + i * 3.1 + 3) * 0.3);
  }
  return out;
}

const HAZE_ROW = row(1300, 1.8, 0.05, 0.09, 0.2, 0.52, 0.12);
const LOW_ROW = row(1700, 1.8, 0.05, 0.11, 0.035, 0.07, 0.05);

/** The right-hand vertical sign hangs low: street blocks in front of it stay under its foot. */
const SIGN_FOOT = { x0: 0.43, x1: 0.48, h: 0.065 };
for (const b of LOW_ROW) {
  if (b.x + b.w > SIGN_FOOT.x0 && b.x < SIGN_FOOT.x1) {
    b.h = Math.min(b.h, SIGN_FOOT.h);
    b.roof = "flat";
  }
}

// Hand-placed mid towers across the phone screen; generated ones continue past it for wide
// screens. Drawn in this order (later ones in front).
const MID_HERO: Tower[] = [
  { x: -0.355, w: 0.088, h: 0.42, roof: "slant", lights: "grid" },
  { x: -0.49, w: 0.13, h: 0.62, roof: "crown", lights: "strips" },
  { x: -0.27, w: 0.075, h: 0.27, roof: "antenna", lights: "grid" },
  { x: -0.16, w: 0.1, h: 0.16, roof: "tank", lights: "sparse" },
  { x: -0.045, w: 0.09, h: 0.21, roof: "crown", lights: "sparse" },
  { x: 0.06, w: 0.075, h: 0.12, roof: "flat", lights: "sparse" },
  { x: 0.13, w: 0.085, h: 0.36, roof: "spire", lights: "grid" },
  { x: 0.23, w: 0.11, h: 0.2, roof: "antenna", lights: "strips" },
  { x: 0.355, w: 0.125, h: 0.28, roof: "flat", lights: "grid" },
];
const MID_SIDES = row(1500, 1.8, 0.07, 0.12, 0.3, 0.5, 0.15).filter((b) => b.x > 0.52 || b.x + b.w < -0.52);
for (const b of MID_SIDES) b.lights = hash(b.x * 99) > 0.5 ? "grid" : "strips";
const MID: Tower[] = [...MID_SIDES, ...MID_HERO];

/**
 * Rim light, in px: a silhouette is filled in its edge color, then again in its body color
 * nudged this far down and left, which leaves a lit line along its top and its moon-side
 * (right) edge. Two fills cost much less than stroking every outline.
 */
const RIM = 1;

/** Add a tower's silhouette to the current path. */
function towerPath(ctx: Ctx, b: Tower, cx: number, hy: number, u: number): void {
  const x = cx + b.x * u;
  const w = b.w * u;
  const top = hy - b.h * u;
  const base = hy + 1;
  switch (b.roof) {
    case "slant":
      ctx.moveTo(x, base);
      ctx.lineTo(x, top + w * 0.4);
      ctx.lineTo(x + w, top);
      ctx.lineTo(x + w, base);
      ctx.closePath();
      return;
    case "crown": {
      ctx.rect(x, top, w, base - top);
      const s = u * 0.026;
      ctx.rect(x + w * 0.12, top - s, w * 0.76, s + 1);
      ctx.rect(x + w * 0.28, top - s * 2, w * 0.44, s + 1);
      ctx.rect(x + w * 0.5 - u * 0.003, top - u * 0.11, u * 0.006, u * 0.06);
      return;
    }
    case "spire":
      ctx.rect(x, top, w, base - top);
      ctx.moveTo(x + w * 0.22, top + 1);
      ctx.lineTo(x + w * 0.5, top - u * 0.1);
      ctx.lineTo(x + w * 0.78, top + 1);
      ctx.closePath();
      return;
    case "antenna":
      ctx.rect(x, top, w, base - top);
      ctx.rect(x + w * 0.22, top - u * 0.045, u * 0.005, u * 0.046);
      ctx.rect(x + w * 0.7, top - u * 0.08, u * 0.005, u * 0.081);
      ctx.rect(x + w * 0.62, top - u * 0.018, w * 0.22, u * 0.019);
      return;
    case "tank":
      ctx.rect(x, top, w, base - top);
      ctx.rect(x + w * 0.18, top - u * 0.035, w * 0.3, u * 0.024);
      ctx.rect(x + w * 0.2, top - u * 0.012, u * 0.004, u * 0.013);
      ctx.rect(x + w * 0.46 - u * 0.004, top - u * 0.012, u * 0.004, u * 0.013);
      ctx.rect(x + w * 0.62, top - u * 0.014, w * 0.25, u * 0.015);
      return;
    default:
      ctx.rect(x, top, w, base - top);
  }
}

/** Beacon spot (x in u from center, height in u) on a roof with a mast, or null. */
function beacon(b: Tower): [number, number] | null {
  switch (b.roof) {
    case "spire":
      return [b.x + b.w * 0.5, b.h + 0.1];
    case "crown":
      return [b.x + b.w * 0.5, b.h + 0.11];
    case "antenna":
      return [b.x + b.w * 0.7 + 0.0025, b.h + 0.08];
    default:
      return null;
  }
}

// Lit windows, precomputed: x/y in u (top-left, y up from the horizon), size in u.
interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Some windows switch on and off every few seconds. */
  blink: number;
}

function windows(list: Tower[], seed: number, buckets: Win[][], pick: (r: number) => number): void {
  for (const [bi, b] of list.entries()) {
    const sd = seed + bi * 101;
    if (b.lights === "none") continue;
    if (b.lights === "strips") {
      // Floors of band lighting: long lit runs with gaps.
      const gap = 0.024;
      for (let fy = b.h - 0.03; fy > 0.02; fy -= gap) {
        let fx = 0.012;
        for (let k = 0; fx < b.w - 0.012; k++) {
          const len = 0.015 + hash(sd + fy * 311 + k * 7.7) * 0.04;
          const end = Math.min(b.w - 0.012, fx + len);
          if (hash(sd + fy * 173 + k * 3.3) < 0.55) {
            const c = pick(hash(sd + fy * 57 + k));
            buckets[c]!.push({ x: b.x + fx, y: fy, w: end - fx, h: 0.0055, blink: hash(sd + k + fy * 9) < 0.08 ? hash(sd + k * 5) : -1 });
          }
          fx = end + 0.006 + hash(sd + k * 2.9 + fy) * 0.012;
        }
      }
      continue;
    }
    const odds = b.lights === "grid" ? 0.34 : 0.12;
    const cw = 0.017;
    const rh = 0.021;
    const cols = Math.floor((b.w - 0.016) / cw);
    const x0 = b.x + (b.w - cols * cw) / 2;
    let r = 0;
    for (let fy = b.h - 0.025; fy > 0.02; fy -= rh, r++) {
      for (let c = 0; c < cols; c++) {
        const hsh = hash(sd + r * 31.7 + c * 7.3);
        if (hsh > odds) continue;
        const col = pick(hash(sd + r * 3.7 + c * 13.1));
        buckets[col]!.push({ x: x0 + c * cw + 0.0045, y: fy, w: 0.008, h: 0.0105, blink: hsh < odds * 0.12 ? hash(sd + r + c) : -1 });
      }
    }
  }
}

/** Window color index: mostly cool blue-white, some purple and cyan, a few warm. */
function pickMid(r: number): number {
  return r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.9 ? 2 : 3;
}

const MID_WINS: Win[][] = WINDOW_COLORS.map(() => []);
windows(MID, 5000, MID_WINS, pickMid);
const HAZE_WINS: Win[][] = [[]];
windows(
  HAZE_ROW.map((b) => ({ ...b, lights: "sparse" as const })),
  6000,
  HAZE_WINS,
  () => 0,
);

// Red beacons on the mid towers' masts and on a few of the haze towers.
const BEACONS = [...HAZE_ROW.filter((_, i) => hash(i * 4.7 + 3) < 0.3), ...MID]
  .map(beacon)
  .filter((p): p is [number, number] => p !== null);

function lit(w: Win, t: number): boolean {
  return w.blink < 0 || hash(Math.floor(t / 3 + w.blink * 10) + w.blink * 77) > 0.35;
}

function drawWindows(ctx: Ctx, s: Scene, list: Win[], color: string, a: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + 0.05;
  ctx.beginPath();
  for (const w of list) {
    if (w.x > half || w.x + w.w < -half) continue;
    if (!lit(w, s.t)) continue;
    ctx.rect(cx + w.x * u, s.horizonY - w.y * u, Math.max(1, w.w * u), Math.max(1, w.h * u));
  }
  ctx.fillStyle = tint(color, a);
  ctx.fill();
}

function visible(b: Tower, s: Scene): boolean {
  const half = s.cssW / 2 / s.u;
  return b.x < half && b.x + b.w > -half;
}

/** Neon colors of the street blocks' strips and the signs (signs and strips name them by index). */
export const STRIP_COLORS = [MAGENTA, CYAN, PURPLE, PINK] as const;

/** Small neon strips on some of the low street blocks: x, width and height in u, color. */
export const LOW_STRIPS = LOW_ROW.flatMap((b, i) =>
  hash(i * 5.3 + 1) > 0.45 ? [] : [{ x: b.x + b.w * 0.2, w: b.w * 0.6, h: b.h * 0.55, c: i % 4, color: STRIP_COLORS[i % 4]! }],
);
const LOW_EDGE = mix(NEAR, PURPLE, 0.25);

// Signs and holos on the hero towers, in u. Exported so the street can paint their
// reflections on the wet floor.
export const SIGNS = [
  { kind: "v" as const, x: -0.415, y: 0.58, w: 0.034, h: 0.27, c: 0, seed: 3 },
  { kind: "v" as const, x: SIGN_FOOT.x0 + 0.01, y: 0.25, w: 0.03, h: 0.17, c: 1, seed: 8 },
  { kind: "b" as const, x: -0.345, y: 0.33, w: 0.07, h: 0.024, c: 2, seed: 5 },
  { kind: "b" as const, x: 0.15, y: 0.25, w: 0.06, h: 0.02, c: 3, seed: 11 },
];
export const HOLO = { x: 0.235, y: 0.33, w: 0.15, h: 0.095, color: CYAN, glitch: MAGENTA, seed: 4, ex: 0.285, ey: 0.2 };

// Mid-distance traffic lanes threading the towers: height (u), speed (u/s), direction, size,
// underglow (an index into LANE_GLOWS).
const LANE_GLOWS = [CYAN, MAGENTA, PURPLE, BLUE] as const;
const LANES = [
  { h: 0.09, speed: 0.06, dir: 1, size: 0.05, glow: 0, phase: 0.1 },
  { h: 0.175, speed: 0.045, dir: -1, size: 0.042, glow: 1, phase: 0.55 },
  { h: 0.27, speed: 0.07, dir: 1, size: 0.046, glow: 2, phase: 0.8 },
  { h: 0.4, speed: 0.04, dir: -1, size: 0.036, glow: 3, phase: 0.3 },
];
const CARS_PER_LANE = 2;
/** Scratch slots for this frame's lane cars, reused so nothing is allocated per frame. */
const FLEET: CarSlot[] = Array.from({ length: LANES.length * CARS_PER_LANE }, () => ({ x: 0, y: 0, L: 0, dir: 1, glow: 0 }));

function laneCars(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const span = s.cssW + u * 0.4;
  let n = 0;
  for (let i = 0; i < LANES.length; i++) {
    const l = LANES[i]!;
    const y = s.horizonY - l.h * u + Math.sin(s.t * 1.1 + i) * u * 0.004;
    if (y > s.cssH + u * 0.05 || y < s.cssH * 0.32) continue;
    const L = l.size * u;
    for (let c = 0; c < CARS_PER_LANE; c++) {
      const p = (((l.phase + c / CARS_PER_LANE) * span + s.t * l.speed * u) % span) - u * 0.2;
      const x = l.dir > 0 ? p : s.cssW - p;
      if (x < -L * 2 || x > s.cssW + L * 2) continue;
      const slot = FLEET[n++]!;
      slot.x = x;
      slot.y = y;
      slot.L = L;
      slot.dir = l.dir;
      slot.glow = l.glow;
    }
  }
  hoverCarFleet(ctx, FLEET, n, LANE_GLOWS);
}

export function city(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  if (hy - u * 0.75 > s.cssH) return;

  // Haze row: one flat smog-lit color, pinprick windows, blinking red beacons.
  ctx.beginPath();
  for (const b of HAZE_ROW) if (visible(b, s)) towerPath(ctx, b, cx, hy, u);
  ctx.fillStyle = HAZE;
  ctx.fill();
  drawWindows(ctx, s, HAZE_WINS[0]!, HAZE_WIN, 0.55);

  laneCars(ctx, s);

  // Mid row: dark slabs, each with a faint moonlit rim so overlapping towers separate.
  for (const b of MID) {
    if (!visible(b, s)) continue;
    ctx.beginPath();
    towerPath(ctx, b, cx, hy, u);
    ctx.fillStyle = SLAB_EDGE;
    ctx.fill();
    ctx.beginPath();
    towerPath(ctx, b, cx - RIM, hy + RIM, u);
    ctx.fillStyle = SLAB;
    ctx.fill();
  }
  for (let i = 0; i < MID_WINS.length; i++) drawWindows(ctx, s, MID_WINS[i]!, WINDOW_COLORS[i]!, i === 3 ? 0.7 : 0.62);

  // Light strips up the edges of the two tallest towers.
  ctx.beginPath();
  const mega = MID_HERO[1]!;
  ctx.moveTo(cx + (mega.x + mega.w) * u - 1, hy);
  ctx.lineTo(cx + (mega.x + mega.w) * u - 1, hy - mega.h * u);
  const spire = MID_HERO[6]!;
  ctx.moveTo(cx + spire.x * u + 1, hy);
  ctx.lineTo(cx + spire.x * u + 1, hy - spire.h * u);
  ctx.globalAlpha = 0.55;
  tube(ctx, PURPLE, Math.max(1, u * 0.003), 2.4);
  ctx.globalAlpha = 1;

  // Beacons
  const on = Math.sin(s.t * 2.2) > 0.2;
  ctx.beginPath();
  for (const [bx, bh] of BEACONS) {
    if (Math.abs(bx) > cx / u + 0.02) continue;
    const x = cx + bx * u;
    const y = hy - bh * u;
    // Nothing blinks in the HUD band at the top center.
    if (y < s.cssH * 0.32 && x > s.cssW * 0.2 && x < s.cssW * 0.8) continue;
    circle(ctx, x, y, Math.max(1, u * (on ? 0.0045 : 0.003)));
  }
  ctx.fillStyle = tint(RED, on ? 0.95 : 0.45);
  ctx.fill();

  // Signs
  for (const sg of SIGNS) {
    const x = cx + sg.x * u;
    const y = hy - sg.y * u;
    const color = STRIP_COLORS[sg.c]!;
    if (sg.kind === "v") verticalSign(ctx, x, y, sg.w * u, sg.h * u, color, sg.seed, s.t, 0.85);
    else boardSign(ctx, x, y, sg.w * u, sg.h * u, color, sg.seed, s.t, 0.85);
  }
  holoBillboard(
    ctx,
    cx + HOLO.x * u,
    hy - HOLO.y * u,
    HOLO.w * u,
    HOLO.h * u,
    HOLO.color,
    HOLO.glitch,
    HOLO.seed,
    s.t,
    cx + HOLO.ex * u,
    hy - HOLO.ey * u,
  );

  // Low street blocks right on the horizon, with rooftop clutter and small neon strips.
  ctx.beginPath();
  for (const b of LOW_ROW) if (visible(b, s)) towerPath(ctx, b, cx, hy, u);
  ctx.fillStyle = LOW_EDGE;
  ctx.fill();
  ctx.beginPath();
  for (const b of LOW_ROW) if (visible(b, s)) towerPath(ctx, b, cx - RIM, hy + RIM, u);
  ctx.fillStyle = NEAR;
  ctx.fill();
  ctx.globalAlpha = 0.5;
  for (let c = 0; c < STRIP_COLORS.length; c++) {
    ctx.beginPath();
    for (const st of LOW_STRIPS) {
      if (st.c !== c || Math.abs(st.x + st.w / 2) > cx / u + 0.1) continue;
      ctx.moveTo(cx + st.x * u, hy - st.h * u);
      ctx.lineTo(cx + (st.x + st.w) * u, hy - st.h * u);
    }
    tube(ctx, STRIP_COLORS[c]!, Math.max(1, u * 0.004), 2.2);
  }
  ctx.globalAlpha = 1;
  // Hand the base its default line style back for the floor grid.
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { AMBER, CYAN, MAGENTA, PINK, PURPLE, RED, WINDOW_COLORS } from "./colors";
import { boardSign, holoBillboard, verticalSign } from "./signs";
import { COLUMN } from "./sky";
import type { Tone } from "./tone";
import { tint, tube } from "./tube";

// The megacity, back to front:
// - the far skyline standing on the horizon: pale smog-lit towers with pinprick windows and red
//   beacons;
// - the deep city below the horizon: a carpet of lights in perspective that spreads out under
//   you as you climb;
// - the megacity's towers, standing at their own depth (HERO_Z) on the far edge of the street,
//   so they sink faster than the horizon as you climb: lit faces, vertical glyph signs, a
//   holographic billboard, rooftop gardens and antenna forests on the lower towers, and two
//   giants at the sides.
// A layer of smog hangs at one altitude. From under it, everything above its line vanishes into
// the smog ceiling (the giants have no visible top); from above, the smog is a sea and only
// what rises past its line pokes out: the giants' crowns and antenna forests.
// The tallest towers flank the screen; behind the tower everything is low, dark and still:
// nothing in the tower's column blinks, flickers or moves.
// Geometry is in u, x from the screen center (left edge), heights up from the tower's foot.

type Roof = "flat" | "crown" | "spire" | "slant" | "antennas" | "tank" | "garden" | "mega";
type Lights = "grid" | "strips" | "sparse";

interface Tower {
  x: number;
  w: number;
  h: number;
  roof: Roof;
  lights: Lights;
}

/** Depth of the megacity's towers on the floor (the tower stands at 3): they sink at under half its pace. */
export const HERO_Z = 8;

/** How high the smog layer hangs over the towers' foot, in u at their depth. */
const SMOG_H = 0.66;

/** Screen y the megacity's towers stand on (the far edge of the street). */
export function heroFoot(s: Scene): number {
  return fieldY(s, HERO_Z);
}

/** Screen y of the smog layer at the towers' depth: the ceiling's edge from below, the waterline from above. */
export function smogLine(s: Scene): number {
  return heroFoot(s) - SMOG_H * s.u;
}

// ---------------------------------------------------------------- far skyline

const ROOFS: Roof[] = ["flat", "crown", "spire", "slant", "flat", "tank"];

/** A continuous row of towers from -span to span, taller toward the screen edges. */
function row(seed: number, span: number, minW: number, maxW: number, low: number, high: number, jitter: number): Tower[] {
  const out: Tower[] = [];
  let x = -span;
  for (let i = 0; x < span; i++) {
    const w = minW + hash(seed + i * 3.1) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    const side = Math.min(1, mid / 0.5);
    const h = low + (high - low) * side * side + hash(seed + i * 3.1 + 1) * jitter;
    const roof = ROOFS[Math.floor(hash(seed + i * 3.1 + 2) * ROOFS.length)]!;
    out.push({ x, w, h, roof, lights: "sparse" });
    x += w * (0.82 + hash(seed + i * 3.1 + 3) * 0.3);
  }
  return out;
}

const FAR_ROW = row(1300, 1.8, 0.05, 0.09, 0.2, 0.56, 0.12);

// ---------------------------------------------------------------- the megacity's towers

// Hand-placed across the phone screen, generated past it for wide screens; drawn in this order
// (later ones in front). The giants rise far past the smog; the rest keep their roofs (gardens,
// antennas, tanks) under it. Gardens and antennas sit on side towers, away from the column.
const HERO_HAND: Tower[] = [
  { x: -0.555, w: 0.145, h: 1.42, roof: "mega", lights: "strips" },
  { x: -0.42, w: 0.1, h: 0.46, roof: "garden", lights: "grid" },
  { x: -0.33, w: 0.075, h: 0.3, roof: "slant", lights: "grid" },
  { x: -0.26, w: 0.1, h: 0.19, roof: "tank", lights: "sparse" },
  { x: -0.165, w: 0.085, h: 0.15, roof: "flat", lights: "sparse" },
  { x: -0.08, w: 0.1, h: 0.205, roof: "crown", lights: "sparse" },
  { x: 0.02, w: 0.085, h: 0.16, roof: "flat", lights: "sparse" },
  { x: 0.1, w: 0.11, h: 0.225, roof: "tank", lights: "sparse" },
  { x: 0.205, w: 0.085, h: 0.36, roof: "garden", lights: "grid" },
  { x: 0.28, w: 0.11, h: 0.5, roof: "antennas", lights: "grid" },
  { x: 0.39, w: 0.155, h: 1.3, roof: "mega", lights: "strips" },
];
const HERO_SIDES = row(1500, 1.9, 0.08, 0.13, 0.36, 0.55, 0.1).filter((b) => b.x > 0.55 || b.x + b.w < -0.56);
for (const b of HERO_SIDES) {
  // Past the phone's width (wide screens only), mostly dim, so the sides stay calm.
  const r = hash(b.x * 99);
  b.lights = r < 0.6 ? "sparse" : r < 0.85 ? "grid" : "strips";
  if (b.roof === "spire" || b.roof === "crown") b.roof = hash(b.x * 37) > 0.5 ? "antennas" : "garden";
}
const HERO: Tower[] = [...HERO_SIDES, ...HERO_HAND];
/** Height of a giant's crown (setback and cap), in u: its body stops this far below its top. */
const CROWN = 0.16;

/**
 * Rim light, in px: a silhouette is filled in its edge color, then again in its body color
 * nudged this far down and left, which leaves a lit line along its top and right edge. Two
 * fills cost much less than stroking every outline.
 */
const RIM = 1;

/** Add a tower's silhouette to the current path: x from the screen center, standing on `foot`. */
function towerPath(ctx: Ctx, b: Tower, cx: number, foot: number, u: number): void {
  const x = cx + b.x * u;
  const w = b.w * u;
  const top = foot - b.h * u;
  const base = foot + 1;
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
      const s = u * 0.022;
      ctx.rect(x + w * 0.12, top - s, w * 0.76, s + 1);
      ctx.rect(x + w * 0.28, top - s * 2, w * 0.44, s + 1);
      ctx.rect(x + w * 0.5 - u * 0.003, top - u * 0.09, u * 0.006, u * 0.05);
      return;
    }
    case "spire":
      ctx.rect(x, top, w, base - top);
      ctx.moveTo(x + w * 0.2, top + 1);
      ctx.lineTo(x + w * 0.5, top - u * 0.11);
      ctx.lineTo(x + w * 0.8, top + 1);
      ctx.closePath();
      return;
    case "tank":
      ctx.rect(x, top, w, base - top);
      ctx.rect(x + w * 0.16, top - u * 0.03, w * 0.3, u * 0.02);
      ctx.rect(x + w * 0.18, top - u * 0.011, u * 0.004, u * 0.012);
      ctx.rect(x + w * 0.44 - u * 0.004, top - u * 0.011, u * 0.004, u * 0.012);
      ctx.rect(x + w * 0.62, top - u * 0.013, w * 0.25, u * 0.014);
      return;
    case "garden":
      // A parapet around the roof; the plants are drawn on top of it.
      ctx.rect(x, top, w, base - top);
      ctx.rect(x - u * 0.004, top - u * 0.006, w + u * 0.008, u * 0.007);
      return;
    case "mega": {
      // Body, a setback, and a narrow cap the antenna forest stands on.
      const body = top + CROWN * u;
      ctx.rect(x, body, w, base - body);
      ctx.rect(x + w * 0.14, top + u * 0.06, w * 0.72, u * 0.1 + 1);
      ctx.rect(x + w * 0.3, top, w * 0.4, u * 0.06 + 1);
      return;
    }
    default:
      ctx.rect(x, top, w, base - top);
  }
}

// ---------------------------------------------------------------- windows

/** Lit windows, precomputed: x/y in u (top-left, y up from the foot), size in u. */
interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Some windows switch on and off every few seconds (never in the tower's column): its seed, or -1. */
  blink: number;
}

/** Windows are still inside this half width (u), so nothing changes behind the tower. */
const STILL = COLUMN + 0.02;

function blinks(x: number, w: number): boolean {
  return x + w < -STILL || x > STILL;
}

function windows(list: Tower[], seed: number, buckets: Win[][], pick: (r: number) => number): void {
  for (const [bi, b] of list.entries()) {
    const sd = seed + bi * 101;
    // A giant's body stops under its crown; its setback gets a few lights of its own.
    const h = b.roof === "mega" ? b.h - CROWN : b.h;
    if (b.lights === "strips") {
      // Floors of band lighting: long lit runs with gaps.
      const gap = 0.024;
      for (let fy = h - 0.03; fy > 0.02; fy -= gap) {
        let fx = 0.012;
        for (let k = 0; fx < b.w - 0.012; k++) {
          const len = 0.015 + hash(sd + fy * 311 + k * 7.7) * 0.04;
          const end = Math.min(b.w - 0.012, fx + len);
          if (hash(sd + fy * 173 + k * 3.3) < 0.55) {
            const c = pick(hash(sd + fy * 57 + k));
            const wx = b.x + fx;
            const blink = blinks(wx, end - fx) && hash(sd + k + fy * 9) < 0.08 ? hash(sd + k * 5) : -1;
            buckets[c]!.push({ x: wx, y: fy, w: end - fx, h: 0.0055, blink });
          }
          fx = end + 0.006 + hash(sd + k * 2.9 + fy) * 0.012;
        }
      }
      if (b.roof === "mega") {
        for (let k = 0; k < 3; k++) {
          const wx = b.x + b.w * (0.22 + k * 0.2);
          buckets[pick(hash(sd + k * 13))]!.push({ x: wx, y: b.h - 0.085, w: b.w * 0.12, h: 0.0055, blink: -1 });
        }
      }
      continue;
    }
    const odds = b.lights === "grid" ? 0.34 : 0.11;
    const cw = 0.017;
    const rh = 0.021;
    const cols = Math.floor((b.w - 0.016) / cw);
    const x0 = b.x + (b.w - cols * cw) / 2;
    let r = 0;
    for (let fy = h - 0.025; fy > 0.02; fy -= rh, r++) {
      for (let c = 0; c < cols; c++) {
        const hsh = hash(sd + r * 31.7 + c * 7.3);
        if (hsh > odds) continue;
        const col = pick(hash(sd + r * 3.7 + c * 13.1));
        const wx = x0 + c * cw + 0.0045;
        const blink = blinks(wx, 0.008) && hsh < odds * 0.12 ? hash(sd + r + c) : -1;
        buckets[col]!.push({ x: wx, y: fy, w: 0.008, h: 0.0105, blink });
      }
    }
  }
}

/** Window color index: mostly cool blue-white, some purple and cyan, a few warm. */
function pickHero(r: number): number {
  return r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.9 ? 2 : 3;
}

const HERO_WINS: Win[][] = WINDOW_COLORS.map(() => []);
windows(HERO, 5000, HERO_WINS, pickHero);
const FAR_WINS: Win[][] = [[]];
windows(FAR_ROW, 6000, FAR_WINS, () => 0);
// Sorted by height, so a frame only visits the windows in the rows it shows.
for (const list of [...HERO_WINS, ...FAR_WINS]) list.sort((a, b) => a.y - b.y);

/** Index of the first window at or above height `y` (u) in a list sorted by height. */
function firstAbove(list: Win[], y: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid]!.y < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function lit(w: Win, t: number): boolean {
  return w.blink < 0 || hash(Math.floor(t / 3 + w.blink * 10) + w.blink * 77) > 0.35;
}

/** The megacity's window fills, one per window color. */
const HERO_WIN_FILLS = WINDOW_COLORS.map((c, i) => tint(c, i === 3 ? 0.7 : 0.62));

/** Windows of `list` standing on `foot`, between screen rows y0 and y1, filled with `fill`. */
function drawWindows(ctx: Ctx, s: Scene, list: Win[], foot: number, fill: string, y0: number, y1: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + 0.05;
  const px = Math.max(1, u * 0.0035);
  // Heights (u over the foot) of the rows y1 (bottom) and y0 (top).
  const low = (foot - y1) / u;
  const high = (foot - y0) / u;
  ctx.beginPath();
  for (let i = firstAbove(list, low); i < list.length; i++) {
    const w = list[i]!;
    if (w.y > high) break;
    if (w.x > half || w.x + w.w < -half) continue;
    if (!lit(w, s.t)) continue;
    ctx.rect(cx + w.x * u, foot - w.y * u, Math.max(px, w.w * u), Math.max(px, w.h * u));
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function visible(b: Tower, s: Scene): boolean {
  const half = s.cssW / 2 / s.u;
  return b.x < half && b.x + b.w > -half;
}

// ---------------------------------------------------------------- beacons

/** Beacon spot (x in u from center, height in u) on a roof with a mast, or null. */
function beacon(b: Tower): [number, number] | null {
  switch (b.roof) {
    case "spire":
      return [b.x + b.w * 0.5, b.h + 0.11];
    case "crown":
      return [b.x + b.w * 0.5, b.h + 0.09];
    default:
      return null;
  }
}

const FAR_BEACONS = FAR_ROW.filter((_, i) => hash(i * 4.7 + 3) < 0.35)
  .map(beacon)
  .filter((p): p is [number, number] => p !== null);

/**
 * Red beacons at (x, height) over `foot`, between screen rows y0 and y1: they blink at the
 * sides of the screen and burn steady inside the tower's column.
 */
function beacons(ctx: Ctx, s: Scene, list: readonly (readonly [number, number])[], foot: number, a: number, y0: number, y1: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const on = Math.sin(s.t * 2.2) > 0.2;
  const r = Math.max(1, u * 0.0035);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (const p of list) {
      const bx = p[0];
      const bh = p[1];
      if (Math.abs(bx) > cx / u + 0.02) continue;
      const still = Math.abs(bx) < STILL;
      if (still !== (pass === 0)) continue;
      const y = foot - bh * u;
      if (y < y0 || y > y1) continue;
      circle(ctx, cx + bx * u, y, pass === 1 && on ? r * 1.35 : r);
    }
    ctx.fillStyle = tint(RED, pass === 0 ? 0.6 : on ? 0.95 : 0.4);
    ctx.globalAlpha = a;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- clipping to the smog

/** Clip to the screen rows between y0 and y1 (call inside save/restore). */
function band(ctx: Ctx, s: Scene, y0: number, y1: number): void {
  ctx.beginPath();
  ctx.rect(0, y0, s.cssW, y1 - y0);
  ctx.clip();
}

/** Scratch rows for `shown()`, reused so nothing is allocated per frame. */
const ROWS = { top: 0, bottom: 0 };

/** The rows the city shows in: under the smog line from below it, over it from above. */
function shown(s: Scene, tone: Tone): typeof ROWS {
  const line = smogLine(s);
  ROWS.top = Math.max(0, tone.above ? -s.u : line);
  ROWS.bottom = Math.min(s.cssH, tone.above ? line : s.cssH + 2);
  return ROWS;
}

// ---------------------------------------------------------------- far skyline and deep city

/** The far skyline on the horizon, faded by the smog; from below, its tops are lost in the ceiling. */
export function farSkyline(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  if (hy - u * 0.75 > s.cssH) return;
  const clip = !tone.above;
  const top = clip ? Math.max(0, smogLine(s)) : 0;
  if (clip && top >= hy) return;
  if (clip) {
    ctx.save();
    band(ctx, s, top, s.cssH);
  }
  ctx.beginPath();
  for (const b of FAR_ROW) if (visible(b, s)) towerPath(ctx, b, cx, hy, u);
  ctx.fillStyle = tone.farEdge;
  ctx.fill();
  ctx.beginPath();
  for (const b of FAR_ROW) if (visible(b, s)) towerPath(ctx, b, cx - RIM, hy + RIM, u);
  ctx.fillStyle = tone.far;
  ctx.fill();
  if (clip) ctx.restore();
  drawWindows(ctx, s, FAR_WINS[0]!, hy, tone.farWindows, top, s.cssH);
  beacons(ctx, s, FAR_BEACONS, hy, 0.4 + 0.6 * tone.farLights, top, s.cssH);
}

/** The deep city's lights repeat sideways every this many u (only wide screens see past one span). */
const CITY_SPAN = 1.5;
/** Lights of the deep city: screen x (u), 1/depth (uniform, so they spread evenly down the screen), color. */
const CITY_LIGHTS = Array.from({ length: 150 }, (_, i) => ({
  x: (hash(i + 3000) - 0.5) * CITY_SPAN,
  iz: 1 / 70 + hash(i + 3100) * (1 / HERO_Z - 1 / 70),
  c: Math.floor(hash(i + 3200) * 4),
  big: hash(i + 3300) > 0.85,
}));
const CITY_LIGHT_COLORS = [AMBER, CYAN, MAGENTA, "#c9d6ff"] as const;
const DEEP = "#0a0716";
const DEEP_GLOW = mix(DEEP, PURPLE, 0.35);

/**
 * The city below the horizon, beyond the street: dark blocks pricked with lights in four colors,
 * spreading out under you as you climb. Still everywhere: it is a carpet of lights, not traffic.
 * Under the smog sea once you are above it.
 */
export function deepCity(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.above) return;
  const hy = s.horizonY;
  const foot = heroFoot(s);
  if (hy > s.cssH || foot < hy + 1) return;
  const bottom = Math.min(s.cssH, foot + 2);
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, hy - 1, s.cssW, bottom - hy + 1);
  // A haze of light hanging over the far city, just under the horizon.
  ctx.fillStyle = tint(DEEP_GLOW, 0.8);
  ctx.fillRect(0, hy - 1, s.cssW, Math.min(bottom - hy + 1, s.u * 0.035));
  const u = s.u;
  const cx = s.cssW / 2;
  const span = foot - hy;
  const a = 0.35 + 0.5 * tone.farLights;
  const repeats = Math.ceil((cx / u - CITY_SPAN / 2) / CITY_SPAN);
  for (let c = 0; c < CITY_LIGHT_COLORS.length; c++) {
    ctx.beginPath();
    for (const p of CITY_LIGHTS) {
      if (p.c !== c) continue;
      // Depth z sits at hy + span * (HERO_Z / z) on the screen.
      const y = hy + span * HERO_Z * p.iz;
      if (y > bottom) continue;
      const k = HERO_Z * p.iz;
      const r = Math.max(0.6, u * 0.0035 * k * (p.big ? 1.8 : 1));
      for (let j = -repeats; j <= repeats; j++) ctx.rect(cx + (p.x + j * CITY_SPAN) * u - r, y - r * 0.6, r * 2, r * 1.2);
    }
    ctx.fillStyle = tint(CITY_LIGHT_COLORS[c]!, 0.55);
    ctx.globalAlpha = a;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- signs and holo

/** Neon colors of the strips and signs (signs name them by index). */
export const STRIP_COLORS = [MAGENTA, CYAN, PURPLE, PINK] as const;

// Signs on the side towers, in u (x from center, y = top edge above the foot). Exported so the
// street can paint their reflections on the wet floor. All of them hang under the smog.
export const SIGNS = [
  { kind: "v" as const, x: -0.48, y: 0.56, w: 0.034, h: 0.26, c: 0, seed: 3 },
  { kind: "v" as const, x: 0.43, y: 0.45, w: 0.03, h: 0.2, c: 1, seed: 8 },
  { kind: "b" as const, x: -0.4, y: 0.3, w: 0.064, h: 0.022, c: 2, seed: 5 },
];
/** The holographic billboard on the right-hand antenna tower, its emitter on the tower's face below. */
export const HOLO = { x: 0.285, y: 0.32, w: 0.1, h: 0.075, color: CYAN, glitch: MAGENTA, seed: 4 };

/** Light strips up the giants' inner edges (x in u), from the foot to the base of their crowns. */
const STRIPS = HERO_HAND.filter((b) => b.roof === "mega").map((b) => ({ x: b.x < 0 ? b.x + b.w - 0.002 : b.x + 0.002, h: b.h - CROWN }));

// ---------------------------------------------------------------- rooftops

/** Antenna masts on a roof: x along the roof (0..1), height (u), crossbar, dish. */
const MASTS = [
  { f: 0.1, h: 0.05, bar: 0.6, dish: false },
  { f: 0.25, h: 0.095, bar: 0.7, dish: false },
  { f: 0.38, h: 0.04, bar: 0, dish: true },
  { f: 0.52, h: 0.13, bar: 0.55, dish: false },
  { f: 0.66, h: 0.07, bar: 0.75, dish: false },
  { f: 0.8, h: 0.1, bar: 0.5, dish: false },
  { f: 0.92, h: 0.035, bar: 0, dish: true },
] as const;

/** The roof an antenna forest stands on: the tower itself, or a giant's narrow cap. */
function mastRoof(b: Tower): Tower {
  return b.roof === "mega" ? { x: b.x + b.w * 0.3, w: b.w * 0.4, h: b.h, roof: "antennas", lights: "sparse" } : b;
}
const MAST_ROOFS = HERO.filter((b) => b.roof === "antennas" || b.roof === "mega").map(mastRoof);

/** Beacons: the antenna forests' tallest masts, and spires and crowns; (x, height) in u. */
const HERO_BEACONS: [number, number][] = [];
for (const r of MAST_ROOFS) for (const m of MASTS) if (!m.dish && m.h > 0.06) HERO_BEACONS.push([r.x + r.w * m.f, r.h + m.h]);
for (const b of HERO) {
  const p = beacon(b);
  if (p) HERO_BEACONS.push(p);
}

/** Antenna forests on the roofs: thin masts with crossbars, and small dishes. One stroke for all of them. */
function antennas(ctx: Ctx, s: Scene, cx: number, foot: number, color: string): void {
  const u = s.u;
  ctx.beginPath();
  for (const r of MAST_ROOFS) {
    const x0 = cx + r.x * u;
    const top = foot - r.h * u;
    if (top - u * 0.14 > s.cssH || top < 0) continue;
    for (const m of MASTS) {
      const x = x0 + r.w * u * m.f;
      if (m.dish) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, top - m.h * u * 0.5);
        ctx.moveTo(x - u * 0.011, top - m.h * u * 0.75);
        ctx.quadraticCurveTo(x, top - m.h * u * 0.2, x + u * 0.011, top - m.h * u * 0.75);
        continue;
      }
      ctx.moveTo(x, top);
      ctx.lineTo(x, top - m.h * u);
      if (m.bar > 0) {
        const by = top - m.h * u * m.bar;
        const bw = u * (0.006 + m.h * 0.08);
        ctx.moveTo(x - bw, by);
        ctx.lineTo(x + bw, by);
      }
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "butt";
  ctx.stroke();
}

/** The roof gardens' towers, precomputed. */
const GARDENS = HERO.filter((b) => b.roof === "garden");

/**
 * Plants on every roof garden at once: two small trees and shrubs under a violet grow light,
 * a glass dome, and the grow-light strip along the parapet. Each layer is one path for all of
 * them, so the gardens cost a handful of fills.
 */
function gardens(ctx: Ctx, s: Scene, cx: number, foot: number, leaf: string, dark: string): void {
  const u = s.u;
  const r = u * 0.017;
  const half = cx / u + 0.05;
  for (let pass = 0; pass < 6; pass++) {
    ctx.beginPath();
    for (const b of GARDENS) {
      if (b.x > half || b.x + b.w < -half) continue;
      const x0 = cx + b.x * u;
      const w = b.w * u;
      const top = foot - b.h * u - u * 0.006;
      const t1 = x0 + w * 0.16;
      const t2 = x0 + w * 0.44;
      if (pass === 0) oval(ctx, x0 + w * 0.45, top - u * 0.012, w * 0.55, u * 0.03);
      else if (pass === 1) {
        ctx.moveTo(x0 + w * 0.62, top);
        ctx.arc(x0 + w * 0.8, top, w * 0.18, Math.PI, 0);
      } else if (pass === 2) {
        ctx.rect(t1 - u * 0.002, top - r * 1.6, u * 0.004, r * 1.6);
        ctx.rect(t2 - u * 0.002, top - r * 1.3, u * 0.004, r * 1.3);
        circle(ctx, t1, top - r * 1.9, r);
        circle(ctx, t2, top - r * 1.6, r * 0.85);
        circle(ctx, x0 + w * 0.3, top - r * 0.55, r * 0.6);
        circle(ctx, x0 + w * 0.56, top - r * 0.45, r * 0.5);
      } else if (pass === 3) {
        circle(ctx, t1 - r * 0.15, top - r * 2.15, r * 0.6);
        circle(ctx, t2 - r * 0.12, top - r * 1.82, r * 0.5);
      } else {
        ctx.moveTo(x0 + w * 0.06, top + u * 0.002);
        ctx.lineTo(x0 + w * 0.58, top + u * 0.002);
      }
    }
    if (pass === 0) {
      // Grow light washing up over the plants
      ctx.fillStyle = tint(PURPLE, 0.16);
      ctx.fill();
    } else if (pass === 1) {
      // Glass domes
      ctx.strokeStyle = tint(CYAN, 0.55);
      ctx.lineWidth = Math.max(1, u * 0.003);
      ctx.stroke();
    } else if (pass === 2) {
      // Trunks, crowns and shrubs
      ctx.fillStyle = dark;
      ctx.fill();
    } else if (pass === 3) {
      // Lit treetops
      ctx.fillStyle = leaf;
      ctx.fill();
    } else if (pass === 4) {
      // The grow-light strips along the parapets
      ctx.globalAlpha = 0.8;
      tube(ctx, PURPLE, Math.max(0.8, u * 0.003), 2.4);
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// ---------------------------------------------------------------- the megacity's towers

/** Rooftops: the antenna forests, and (under the smog) the roof gardens. Exported for the layout test. */
export function roofs(ctx: Ctx, s: Scene, tone: Tone): void {
  const cx = s.cssW / 2;
  const foot = heroFoot(s);
  antennas(ctx, s, cx, foot, tone.slabEdge);
  if (!tone.above) gardens(ctx, s, cx, foot, tone.leaf, tone.leafShade);
}

/**
 * The signs and the holographic billboard on the towers' faces, under the smog (all at the
 * sides, so they may flicker). Exported for the layout test.
 */
export function facadeSigns(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.above) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const foot = heroFoot(s);
  const top = Math.max(0, smogLine(s));
  for (const sg of SIGNS) {
    const x = cx + sg.x * u;
    const y = foot - sg.y * u;
    if (y > s.cssH || y < top) continue;
    const color = STRIP_COLORS[sg.c]!;
    if (sg.kind === "v") verticalSign(ctx, x, y, sg.w * u, sg.h * u, color, sg.seed, s.t, 0.85);
    else boardSign(ctx, x, y, sg.w * u, sg.h * u, color, sg.seed, s.t, 0.85);
  }
  const hx = cx + HOLO.x * u;
  const hy = foot - HOLO.y * u;
  if (hy < s.cssH && hy > top) {
    holoBillboard(ctx, hx, hy, HOLO.w * u, HOLO.h * u, HOLO.color, HOLO.glitch, HOLO.seed, s.t, hx + HOLO.w * u * 0.5, hy + HOLO.h * u * 2.1);
  }
}

/**
 * The megacity's towers on the street's far edge, sinking past you as you climb. From under the
 * smog they show below its line (their tops lost in the ceiling); from above, only what pokes
 * out of the sea.
 */
export function heroTowers(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const foot = heroFoot(s);
  const { top, bottom } = shown(s, tone);
  if (bottom <= top) return;
  ctx.save();
  band(ctx, s, top, bottom);

  // Rimmed silhouettes, one tower at a time so overlapping towers separate.
  for (const b of HERO) {
    if (!visible(b, s)) continue;
    if (foot - (b.h + 0.13) * u > bottom || foot < top) continue;
    ctx.beginPath();
    towerPath(ctx, b, cx, foot, u);
    ctx.fillStyle = tone.slabEdge;
    ctx.fill();
    ctx.beginPath();
    towerPath(ctx, b, cx - RIM, foot + RIM, u);
    ctx.fillStyle = tone.slab;
    ctx.fill();
  }
  roofs(ctx, s, tone);
  ctx.restore();

  for (let i = 0; i < HERO_WINS.length; i++) {
    drawWindows(ctx, s, HERO_WINS[i]!, foot, HERO_WIN_FILLS[i]!, top, bottom);
  }
  beacons(ctx, s, HERO_BEACONS, foot, 1, top, bottom);

  // Light strips up the giants' inner edges.
  ctx.beginPath();
  for (const st of STRIPS) {
    const x = cx + st.x * u;
    const y0 = Math.max(top, foot - st.h * u);
    const y1 = Math.min(bottom, foot);
    if (y1 <= y0) continue;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y0);
  }
  ctx.globalAlpha = 0.5;
  tube(ctx, PURPLE, Math.max(1, u * 0.003), 2.4);
  ctx.globalAlpha = 1;

  facadeSigns(ctx, s, tone);
  // Leave the default line style for whatever draws next.
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { landLine, standoutTop } from "./far";
import { diamond } from "./shapes";
import { moonAt, MOON_REACH } from "./sky";
import { fireworksShow, level } from "./tone";

// Fireworks of hearts over Paris by night: rockets go up from behind the rooftops and the
// landmarks standing out of the cloud sea, and burst into hearts, an outer heart of sparks in one
// color with a smaller heart of another inside it, streaking out, drooping a little and twinkling
// as they fade. Only in the side lanes, never in the tower's column (column.test.ts) and never
// over the moon (bursts under it go off below its halo) or the screen's sides; and over what
// stands out of the cloud sea, never behind the lattice tower's top, the wheel or a dome, so each
// heart and each landmark reads whole (column.test.ts; a rocket may rise behind them); only at night
// (tone.ts `fireworksShow`: from when the stars are out after the sunset until the dawn mist rises,
// so never while the sun is in the sky), more of them as the night deepens. Each launcher fires
// on its own rhythm from the scene's clock, and every burst is placed and colored from its
// launcher and its turn by `hash`, so the show is the same every time for the same moment.
// Flat sparks, no glow: they are far away.

const TAU = Math.PI * 2;

/** A heart's outline as `n` points round it, scaled so its half width is 1 (screen y down, centered). */
function heartPoints(n: number): Float32Array {
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    out[i * 2] = Math.sin(t) ** 3;
    out[i * 2 + 1] = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) / 16;
  }
  return out;
}
const OUTER = heartPoints(30);
const INNER = heartPoints(16);
/** The inner heart's size, as a share of the outer's. */
const INNER_K = 0.5;

/** A launcher: which lane (-1 left, 1 right), the upper or lower half of the lane's sky, its rhythm (s) and its offset, and how deep the night must be for it to fire. */
interface Launcher {
  side: -1 | 1;
  upper: boolean;
  period: number;
  phase: number;
  need: number;
  /** Only where the lane is at least this wide (u): the wide screens' extra show. */
  room: number;
}
const LAUNCHERS: readonly Launcher[] = [
  { side: 1, upper: false, period: 3.4, phase: 0.3, need: 0, room: 0 },
  { side: -1, upper: false, period: 3.9, phase: 1.9, need: 0.08, room: 0 },
  { side: 1, upper: true, period: 4.7, phase: 3.1, need: 0.3, room: 0 },
  { side: -1, upper: true, period: 4.3, phase: 0.8, need: 0.45, room: 0 },
  { side: 1, upper: false, period: 5.9, phase: 4.6, need: 0.62, room: 0 },
  { side: -1, upper: false, period: 5.5, phase: 2.6, need: 0.78, room: 0 },
  { side: 1, upper: true, period: 3.7, phase: 1.2, need: 0.2, room: 0.5 },
  { side: -1, upper: true, period: 4.1, phase: 3.5, need: 0.35, room: 0.5 },
  { side: 1, upper: false, period: 4.4, phase: 2.2, need: 0.5, room: 0.7 },
  { side: -1, upper: false, period: 4.9, phase: 0.4, need: 0.7, room: 0.7 },
];

/** A rocket's climb, and a burst's life after it (s). */
const RISE = 0.6;
const BLOOM = 2.1;
/** How far the sparks droop by the end of a burst's life (u), at the heart's top; its point droops up to DROOP_MOST times that. */
const DROOP = 0.035;
const DROOP_MOST = 1.4;
/** A burst's size (u): its outer heart's half width, at the least and as much more as its turn picks. */
const BURST = 0.08;
const BURST_MORE = 0.03;
/** Room kept from the tower's column, the screen's sides and the moon's halo (u). */
const COLUMN = 0.25;
const ROOM = 0.03;
/** The lanes' sky the bursts go off in: from this far down the screen... */
const SKY_TOP = 0.2;
/** ...down to this far above the land's line (u): over the rooftops; and over the lattice tower, the wheel and the landmarks under the burst (`standoutTop`), its sparks drooping included. */
const SKY_LOW = 0.36;

/** The burst's colors: [outer heart, inner heart]. */
const COLORS = [
  ["#ff4f80", "#ffd166"],
  ["#ffd166", "#ff7fb3"],
  ["#ff9ec4", "#fff6ea"],
  ["#7fe8c4", "#ff9ec4"],
  ["#c9a7ff", "#ffd166"],
  ["#fff6ea", "#ff4f80"],
] as const;
const ROCKET = "#ffe3b0";

/** Scratch for one burst's place. */
const AT = { x: 0, y: 0, r: 0, ok: false };

/**
 * Where launcher `l`'s burst of turn `n` goes off: inside its lane's sky, wholly clear of the
 * tower's column, the screen's side, (on the left) under the moon's halo and over whatever stands
 * out of the cloud sea under it; `ok` false if the lane has no room for it.
 */
function burstAt(s: Scene, l: Launcher, n: number, id: number): typeof AT {
  const u = s.u;
  const h = (k: number) => hash(id * 977 + n * 31 + k + 9100);
  const lane = s.cssW / 2 - u * COLUMN;
  const r = Math.min(u * (BURST + BURST_MORE * h(0)), (lane - u * ROOM * 2) / 2);
  AT.r = r;
  AT.ok = r > u * BURST * 0.8 && lane >= u * l.room;
  // Across the lane: its centers from the column's side out to the screen's.
  const inner = u * (COLUMN + ROOM) + r;
  const outer = s.cssW / 2 - u * ROOM - r;
  AT.x = s.cssW / 2 + l.side * (inner + (outer - inner) * h(1));
  // Down the lane's sky: the upper or lower half of it, under the moon's halo if it is over it
  // (on a wide screen the left lane reaches well beyond the moon, and the bursts out there may go
  // off as high as on the right).
  let top = s.cssH * SKY_TOP + r;
  const moon = moonAt(s);
  const halo = moon.r * MOON_REACH;
  if (Math.abs(AT.x - moon.x) < halo + u * ROOM + r) top = Math.max(top, moon.y + halo + u * ROOM + r);
  const over = standoutTop(s, AT.x - r - u * ROOM, AT.x + r + u * ROOM) - u * (ROOM + DROOP * DROOP_MOST);
  const low = Math.min(landLine(s) - u * SKY_LOW, over) - r;
  if (low < top) {
    AT.ok = false;
    return AT;
  }
  const mid = (top + low) / 2;
  const y0 = l.upper ? top : mid;
  const y1 = l.upper ? mid : low;
  AT.y = y0 + (y1 - y0) * h(2);
  return AT;
}

/** 0 below a, 1 above b, eased between. */
function ease(a: number, b: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** One heart of sparks at (x, y), half width r, `k` of the way out, its sparks `size` big; `skip` leaves out some (the twinkle). */
function sparks(ctx: Ctx, pts: Float32Array, x: number, y: number, r: number, droop: number, size: number, skip: (i: number) => boolean): void {
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue;
    const px = pts[i * 2]!;
    const py = pts[i * 2 + 1]!;
    diamond(ctx, x + px * r, y + py * r + droop * (0.6 + 0.4 * (py + 1)), size);
  }
}

/** The fireworks of hearts at this moment, in the side lanes (`bursts`: only the hearts, no rockets, for the tests). */
export function fireworks(ctx: Ctx, s: Scene, bursts = false): void {
  const show = fireworksShow(level(s));
  if (show <= 0) return;
  const u = s.u;
  const a0 = ctx.globalAlpha;
  for (let id = 0; id < LAUNCHERS.length; id++) {
    const l = LAUNCHERS[id]!;
    const strength = ease(l.need, l.need + 0.15, show);
    if (strength <= 0) continue;
    const clock = s.t + l.phase;
    const n = Math.floor(clock / l.period);
    const age = clock - n * l.period;
    if (age >= RISE + BLOOM) continue;
    const at = burstAt(s, l, n, id);
    if (!at.ok) continue;
    const { x, y, r } = at;
    const [outer, inner] = COLORS[Math.floor(hash(id * 977 + n * 31 + 9105) * COLORS.length * 0.999)]!;
    if (age < RISE) {
      if (bursts) continue;
      // The rocket: a spark climbing from behind the rooftops, a fading trail under it.
      const k = 1 - (1 - age / RISE) ** 2;
      const from = landLine(s) - u * 0.1;
      const ry = from + (y - from) * k;
      const sway = Math.sin(age * 9 + id) * u * 0.002;
      ctx.globalAlpha = a0 * strength;
      ctx.strokeStyle = ROCKET;
      ctx.lineWidth = Math.max(0.8, u * 0.0026);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + sway, ry);
      ctx.lineTo(x, Math.min(from, ry + u * 0.07));
      ctx.stroke();
      ctx.fillStyle = ROCKET;
      ctx.beginPath();
      diamond(ctx, x + sway, ry, u * 0.006);
      ctx.fill();
      continue;
    }
    const b = (age - RISE) / BLOOM;
    const out = 1 - (1 - Math.min(1, b / 0.3)) ** 3;
    const fade = 1 - ease(0.45, 1, b);
    const droop = u * DROOP * b * b;
    ctx.globalAlpha = a0 * strength * fade;
    // Short tails behind the sparks while the heart opens.
    if (b < 0.3) {
      ctx.strokeStyle = outer;
      ctx.lineWidth = Math.max(0.7, u * 0.0024);
      ctx.lineCap = "round";
      ctx.beginPath();
      const n2 = OUTER.length / 2;
      const tail = out * (0.7 + b);
      for (let i = 0; i < n2; i++) {
        const px = OUTER[i * 2]!;
        const py = OUTER[i * 2 + 1]!;
        ctx.moveTo(x + px * r * tail, y + py * r * tail);
        ctx.lineTo(x + px * r * out, y + py * r * out + droop);
      }
      ctx.stroke();
    }
    // The twinkle: late in the fade, sparks blink out and back by turns.
    const flick = Math.floor(s.t * 14);
    const twinkle = Math.max(0, (b - 0.5) * 1.4);
    const skip = (i: number) => twinkle > 0 && hash(i * 13 + n * 7 + flick * 3 + id * 101) < twinkle * 0.5;
    ctx.fillStyle = outer;
    ctx.beginPath();
    sparks(ctx, OUTER, x, y, r * out, droop, u * 0.0085 * (1 - b * 0.35), skip);
    ctx.fill();
    const inOut = 1 - (1 - Math.min(1, Math.max(0, b - 0.05) / 0.3)) ** 3;
    ctx.fillStyle = inner;
    ctx.beginPath();
    sparks(ctx, INNER, x, y, r * INNER_K * inOut, droop, u * 0.007 * (1 - b * 0.35), skip);
    ctx.fill();
  }
  ctx.globalAlpha = a0;
}

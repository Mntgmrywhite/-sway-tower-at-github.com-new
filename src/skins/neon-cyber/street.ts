import { alpha, hash, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { heroFoot, HOLO, SIGNS, STRIP_COLORS } from "./city";
import { BASE_BAR, BLUE, CYAN, MAGENTA, PINK, PURPLE, RED, WINDOW_COLORS } from "./colors";
import { actTime, BACK_FROM, gone, jiggleAt, pitch, power, puddleFill, racerX, refill, shakeOff, shieldAt, shiver, spin, spray, travel, wake } from "./peel";
import type { Puddles } from "./peel";
import { canopyAt, noodleStall, parkedCar, puddle, streetLamp, umbrellaWalker, vending, type Canopy } from "./props";
import { REAR, streetRacer, WHEEL_R, WHEEL_X } from "./racer";
import { COLUMN } from "./sky";
import type { Tone } from "./tone";
import { splashes } from "./weather";

// The street the tower stands on: wet asphalt from the foot of the megacity's towers to the
// bottom of the screen, mirroring their signs and windows in shimmering ripples, with puddles,
// splashes, and street life on both sides of the tower's column: a lamp with a pedestrian under a
// glowing umbrella, a steaming noodle stall, and in front, vending machines and a parked hover
// car. Behind the tower everything on the street holds still.
// In front of the tower a street racer waits at the curb by the walker; in the first seconds it
// peels out, soaks the walker (who shields behind the umbrella) and speeds off, then comes back
// round and pulls up at the curb again, to do it all again every 20 s (peel.ts).

/** Scratch point for `spot()`, reused so placing props allocates nothing per frame. */
const P = { x: 0, y: 0, k: 1 };

/** A spot on the floor: X sideways in u at the tower's depth, z depth (3 = the tower's line). */
export function spot(s: Scene, X: number, z: number): typeof P {
  const k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = fieldY(s, z);
  P.k = k;
  return P;
}

/** The asphalt gradient only changes with the screen height (or a new context). */
const cache = { ctx: null as Ctx | null, h: -1, fill: null as CanvasGradient | null };
const ASPHALT_FAR = "#1b1030";
const ASPHALT_NEAR = "#050409";

function asphalt(ctx: Ctx, s: Scene, top: number): void {
  if (cache.ctx !== ctx || cache.h !== s.cssH || !cache.fill) {
    const g = ctx.createLinearGradient(0, s.cssH * 0.5, 0, s.cssH);
    g.addColorStop(0, ASPHALT_FAR);
    g.addColorStop(1, ASPHALT_NEAR);
    cache.ctx = ctx;
    cache.h = s.cssH;
    cache.fill = g;
  }
  ctx.fillStyle = cache.fill;
  ctx.fillRect(0, top, s.cssW, s.cssH - top);
}

/**
 * A reflection on wet asphalt, added to the current path: a column of short horizontal ripples
 * from y0 down to y1, thinning out with distance from the source. `still` ripples hold their
 * shape (behind the tower); the others wobble.
 */
function shimmerPath(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, w: number, seed: number, still = false): void {
  if (y0 > s.cssH) return;
  const bottom = Math.min(y1, s.cssH);
  const step = Math.max(2.5, s.u * 0.008);
  const t = still ? 0 : s.t;
  for (let y = y0, i = 0; y < bottom; y += step, i++) {
    const f = (y - y0) / Math.max(1, y1 - y0);
    if (hash(seed * 3.3 + i) < 0.18 + f * 0.3) continue;
    const half = w * (0.35 + 0.35 * hash(seed + i * 1.7)) * (0.75 + 0.25 * Math.sin(t * 2.6 + i * 1.3 + seed));
    const dx = Math.sin(t * 1.7 + i * 0.9 + seed) * w * 0.12;
    ctx.moveTo(x + dx - half, y);
    ctx.lineTo(x + dx + half, y);
  }
}

function strokeShimmer(ctx: Ctx, s: Scene, style: string): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = Math.max(1, s.u * 0.0035);
  ctx.stroke();
}

/** One reflection, stroked on its own in `style` (a color with its alpha). */
export function shimmer(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, w: number, style: string, seed: number): void {
  ctx.beginPath();
  shimmerPath(ctx, s, x, y0, y1, w, seed);
  strokeShimmer(ctx, s, style);
}

// Reflection tints, made once.
const REFLECT = STRIP_COLORS.map((c) => alpha(c, 0.36));
const HOLO_REFLECT = alpha(HOLO.color, 0.22);
const SHEEN_STYLES = WINDOW_COLORS.map((c) => alpha(c, 0.24));
const MAGENTA_REFLECT = alpha(MAGENTA, 0.3);
const CYAN_REFLECT = alpha(CYAN, 0.3);
const BLUE_REFLECT = alpha(BLUE, 0.35);
const PINK_REFLECT = alpha(PINK, 0.35);
const BASE_REFLECT = alpha(BASE_BAR, 0.35);

/** Sheen dashes of window light under the towers, in the cool window colors only: x (u), depth, length, color. */
const SHEEN_COLORS = 3;
const SHEEN = Array.from({ length: 64 }, (_, i) => ({
  x: (hash(i + 4400) - 0.5) * 1.5,
  depth: hash(i + 4450),
  len: 0.006 + hash(i + 4500) * 0.012,
  c: Math.floor(hash(i + 4550) * SHEEN_COLORS),
}));

/** The megacity's signs, billboard and windows mirrored in the wet street under the towers' foot. */
function reflections(ctx: Ctx, s: Scene, foot: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const still = u * (COLUMN + 0.02);
  for (let c = 0; c < STRIP_COLORS.length; c++) {
    ctx.beginPath();
    for (const sg of SIGNS) {
      if (sg.c !== c) continue;
      const x = cx + (sg.x + sg.w / 2) * u;
      shimmerPath(ctx, s, x, foot + (sg.y - sg.h) * u * 0.8, foot + sg.y * u * 0.85, sg.w * u * 1.6, sg.seed);
    }
    strokeShimmer(ctx, s, REFLECT[c]!);
  }
  ctx.beginPath();
  shimmerPath(ctx, s, cx + (HOLO.x + HOLO.w / 2) * u, foot + (HOLO.y - HOLO.h) * u * 0.8, foot + HOLO.y * u * 0.85, HOLO.w * u * 0.8, HOLO.seed);
  strokeShimmer(ctx, s, HOLO_REFLECT);
  // A wet sheen of window light along the foot of the towers; behind the tower it holds still.
  for (let c = 0; c < SHEEN_COLORS; c++) {
    ctx.beginPath();
    for (const d of SHEEN) {
      if (d.c !== c) continue;
      const y = foot + 2 + d.depth * d.depth * u * 0.14;
      if (y > s.cssH) continue;
      const x0 = cx + d.x * u;
      const half = d.len * u * (0.5 + d.depth * 0.6);
      const x = Math.abs(x0 - cx) < still + half ? x0 : x0 + Math.sin(s.t * 1.9 + d.x * 40) * u * 0.006;
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y);
    }
    ctx.strokeStyle = SHEEN_STYLES[c]!;
    ctx.lineWidth = Math.max(1, u * 0.003);
    ctx.stroke();
  }
}

// Props on the floor, back to front. X is sideways in u at the tower's depth; z = 3 is the
// tower's line. Behind that line everything keeps to the side strips, clear of the tower's
// column; in front of it the props sit in the bottom corners, beside "tap to drop".
// Props that share a side either stand at the same depth (the lamp and the walker under it,
// so they keep their places as the camera climbs) or start clear above/below each other, so
// a nearer prop, sinking faster, only ever moves away from a farther one.
const STALL = { X: 0.455, z: 3.6 };
const LAMP = { X: -0.4545, z: 2.9 };
const WALKER = { X: -0.358, z: 2.9, seed: 1 };
/** The street racer at the curb, in front of the tower's floor line: its rear wheel by the walker. */
const RACER = { X: -0.074, z: 2.05 };
/** The racer's length (U at its depth). */
const RACER_LENGTH = 0.18;
/** The puddle the racer's rear wheel stands in, and the one in the middle of the street it rips through. */
const REAR_PUDDLE = { X: RACER.X - RACER_LENGTH * WHEEL_X, z: RACER.z, rx: 0.035, ry: 0.006, rim: CYAN };
const MID_PUDDLE = { X: 0.03, z: 2.05, rx: 0.075, ry: 0.012, rim: PURPLE };
const PUDDLES = [
  MID_PUDDLE,
  REAR_PUDDLE,
  { X: 0.17, z: 2.75, rx: 0.05, ry: 0.008, rim: BLUE },
  { X: -0.12, z: 4.2, rx: 0.06, ry: 0.006, rim: MAGENTA },
];
const PARKED = { X: 0.2, z: 1.9 };
const VENDING = { X: -0.1825, z: 1.5 };
const FARTHEST = STALL.z;

/** The stall, with its reflection. */
export function stall(ctx: Ctx, s: Scene): void {
  const p = spot(s, STALL.X, STALL.z);
  shimmer(ctx, s, p.x, p.y + 2, p.y + s.u * p.k * 0.09, s.u * p.k * 0.2, MAGENTA_REFLECT, 61);
  noodleStall(ctx, s, p.x, p.y, s.u * p.k);
}

/** The street lamp and its light on the wet floor. */
export function lamp(ctx: Ctx, s: Scene): void {
  const p = spot(s, LAMP.X, LAMP.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x + U * 0.085, p.y + 2, p.y + U * 0.025, U * 0.12, CYAN_REFLECT, 64);
  streetLamp(ctx, p.x, p.y, U, 1, CYAN);
}

/** Scratch canopy for the walker's umbrella. */
const CANOPY: Canopy = { x: 0, y: 0, angle: 0, r: 0, dome: 0 };

/** Where the walker's umbrella is at the scene's time. */
export function walkerCanopy(s: Scene): Canopy {
  const p = spot(s, WALKER.X, WALKER.z);
  return canopyAt(CANOPY, p.x, p.y, s.u * p.k, s.t, WALKER.seed, shieldAt(s.t), jiggleAt(s.t));
}

/** The pedestrian under a glowing umbrella, tipping it down against the racer's spray and shaking it off. */
export function walker(ctx: Ctx, s: Scene): void {
  const p = spot(s, WALKER.X, WALKER.z);
  umbrellaWalker(ctx, p.x, p.y, s.u * p.k, CYAN, s.t, WALKER.seed, shieldAt(s.t), jiggleAt(s.t));
  walkerShake(ctx, s);
}

/** The water the walker shakes off the umbrella after the splash (peel.ts). */
export function walkerShake(ctx: Ctx, s: Scene): void {
  const p = spot(s, WALKER.X, WALKER.z);
  shakeOff(ctx, s, p.x, p.y, s.u * p.k, WALKER.seed, p.y);
}

const RACER_GLOW = alpha(PURPLE, 0.2);
const RACER_REFLECT = alpha(PURPLE, 0.3);
const TAIL_STREAK = alpha(RED, 0.4);
const GLOW_STREAK = alpha(PURPLE, 0.35);
const BEAM = alpha(CYAN, 0.08);

/** Where the racer's rear wheel throws the water from (screen px), parked. */
const SOURCE = { x: 0, y: 0 };
/** The two puddles it splashes through (screen px). */
const PUD: Puddles = { px: 0, py: 0, prx: 0, qx: 0, qy: 0, qrx: 0 };
/** The racer's spot, parked: its middle on the floor (screen px), and its size. */
const SPOT = { x: 0, y: 0, U: 0, L: 0 };

function racerSpot(s: Scene): typeof SPOT {
  const p = spot(s, RACER.X, RACER.z);
  SPOT.x = p.x;
  SPOT.y = p.y;
  SPOT.U = s.u * p.k;
  SPOT.L = SPOT.U * RACER_LENGTH;
  return SPOT;
}

/**
 * The racer itself: parked at the curb, then peeling out and away to the right, and coming back
 * round from the left to pull up at its spot again; its glow and reflection with it.
 */
export function racerCar(ctx: Ctx, s: Scene): void {
  const t = actTime(s.t);
  const { x: x0, y, U, L } = racerSpot(s);
  const x = racerX(s, x0, L, t);
  if (gone(s, x, L)) return;
  // Its glow and reflection on the wet floor, the headlight's pool ahead.
  ctx.beginPath();
  oval(ctx, x, y, L * 0.52, L * 0.06);
  ctx.fillStyle = RACER_GLOW;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x + L * 0.85, y + L * 0.012, L * 0.3, L * 0.035);
  ctx.fillStyle = BEAM;
  ctx.fill();
  shimmer(ctx, s, x, y + 2, y + U * 0.08, L * 0.7, RACER_REFLECT, 66);
  // Speed streaks off its tail once it's flying away.
  const v = t < BACK_FROM ? travel(t + 0.05) - travel(t) : 0;
  if (v > 0.02) {
    const len = Math.min(s.u * 0.4, (v / 0.05) * s.u * 0.12);
    const back = x - REAR * L;
    ctx.beginPath();
    ctx.moveTo(back, y - 0.145 * L);
    ctx.lineTo(back - len, y - 0.145 * L);
    ctx.strokeStyle = TAIL_STREAK;
    ctx.lineWidth = Math.max(1, L * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(back + L * 0.3, y - 0.04 * L);
    ctx.lineTo(back + L * 0.3 - len * 0.8, y - 0.04 * L);
    ctx.moveTo(back + L * 0.2, y - 0.23 * L);
    ctx.lineTo(back + L * 0.2 - len * 0.6, y - 0.23 * L);
    ctx.strokeStyle = GLOW_STREAK;
    ctx.lineWidth = Math.max(1, L * 0.012);
    ctx.stroke();
  }
  streetRacer(ctx, x, y + shiver(t) * L, L, 1, { spin: spin(s, x0, L, t), power: power(t), pitch: pitch(t) });
}

/** The racer's water: the rooster tail onto the walker's umbrella and the splashes off the puddles. */
export function racerWater(ctx: Ctx, s: Scene): void {
  const { x: x0, y, L } = racerSpot(s);
  SOURCE.x = x0 - (WHEEL_X + WHEEL_R * 1.1) * L;
  SOURCE.y = y - WHEEL_R * 0.3 * L;
  const q = spot(s, REAR_PUDDLE.X, REAR_PUDDLE.z);
  PUD.px = q.x;
  PUD.py = q.y;
  PUD.prx = REAR_PUDDLE.rx * s.u * q.k;
  const m = spot(s, MID_PUDDLE.X, MID_PUDDLE.z);
  PUD.qx = m.x;
  PUD.qy = m.y;
  PUD.qrx = MID_PUDDLE.rx * s.u * m.k;
  wake(ctx, s, x0, y, L, PUD);
  const floor = spot(s, WALKER.X, WALKER.z).y;
  spray(ctx, s, SOURCE.x, SOURCE.y, walkerCanopy(s), floor);
}

/**
 * The street racer and its water (peel.ts). Saved and restored around, so the props drawn after
 * it (the parked hover car and its reflection take the caps and joins the walker leaves) look
 * exactly as they did before the racer was added.
 */
export function racer(ctx: Ctx, s: Scene): void {
  ctx.save();
  racerCar(ctx, s);
  racerWater(ctx, s);
  ctx.restore();
}

/** The parked hover car, and its underglow on the wet floor. */
export function parked(ctx: Ctx, s: Scene): void {
  const p = spot(s, PARKED.X, PARKED.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x, p.y + 2, p.y + U * 0.1, U * 0.14, MAGENTA_REFLECT, 65);
  parkedCar(ctx, s, p.x, p.y, U);
}

/** The pair of vending machines. */
export function machines(ctx: Ctx, s: Scene): void {
  const p = spot(s, VENDING.X, VENDING.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x - U * 0.026, p.y + 2, p.y + U * 0.1, U * 0.045, BLUE_REFLECT, 62);
  shimmer(ctx, s, p.x + U * 0.03, p.y + 2, p.y + U * 0.1, U * 0.045, PINK_REFLECT, 63);
  vending(ctx, p.x, p.y, U, BLUE, PINK, s.t);
}

/** Every street prop, back to front (the layout test draws them one by one). */
export const PROPS = [stall, lamp, walker, racer, parked, machines] as const;

/**
 * The wet street floor behind the tower: asphalt from the towers' foot down, their reflections,
 * puddles, the base bar mirrored under the tower and the rain's splashes.
 */
export function streetFloor(ctx: Ctx, s: Scene, tone: Tone): void {
  const foot = heroFoot(s);
  if (foot > s.cssH) return;
  const top = Math.max(0, foot - 1);
  asphalt(ctx, s, top);
  reflections(ctx, s, foot);
  const u = s.u;
  for (const pd of PUDDLES) {
    if (pd === REAR_PUDDLE) {
      rearPuddle(ctx, s);
      continue;
    }
    const p = spot(s, pd.X, pd.z);
    if (p.y - u * 0.05 > s.cssH) continue;
    puddle(ctx, p.x, p.y, pd.rx * u * p.k, pd.ry * u * p.k, pd.rim);
  }
  if (s.baseW > 0) {
    ctx.beginPath();
    shimmerPath(ctx, s, s.baseX + s.baseW / 2, s.groundY + 2, s.groundY + u * 0.2, s.baseW * 0.95, 77);
    strokeShimmer(ctx, s, BASE_REFLECT);
  }
  splashes(ctx, s, tone);
}

/**
 * The puddle under the racer's rear wheel: its wheelspin throws most of it out, and the wet street
 * runs back into it before the racer comes back round (peel.ts).
 */
export function rearPuddle(ctx: Ctx, s: Scene): void {
  const p = spot(s, REAR_PUDDLE.X, REAR_PUDDLE.z);
  const u = s.u;
  if (p.y - u * 0.05 > s.cssH) return;
  const rx = REAR_PUDDLE.rx * u * p.k;
  const ry = REAR_PUDDLE.ry * u * p.k;
  const fill = puddleFill(s.t);
  puddle(ctx, p.x, p.y, rx * fill, ry * Math.sqrt(fill), REAR_PUDDLE.rim);
  refill(ctx, s, p.x, p.y, rx, ry);
}

/** The props on the street, back to front. */
export function streetProps(ctx: Ctx, s: Scene): void {
  if (fieldY(s, FARTHEST) - s.u * 0.4 > s.cssH) return;
  for (const draw of PROPS) draw(ctx, s);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

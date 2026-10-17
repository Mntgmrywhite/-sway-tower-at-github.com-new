import { hash, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { COLUMN } from "./place";
import { blockCloud, LOW_CLOUD, TALL_CLOUD, type CloudShape } from "./shapes";
import { LOOP, type Tone } from "./tone";
import * as toy from "./toys";

// What drifts past as you climb, in a lane down each side of the screen. Each thing is anchored
// at a height in its lane, so it comes down past you as the camera climbs, and only ever moves
// gently in place: nothing crosses the tower's column.
//
// Near lanes (parallax NEAR_P): the left lane is the sun's and the moon's, so only block clouds
// drift down it (they may pass in front of the sun or the moon, as clouds do). The right lane is
// the toys': a loose kite, flights of paper planes, a biplane trailing bunting, a teddy in a
// hot-air balloon, the airship with its windows lit at dusk, a satellite, the rocket that
// launched from the pad, a ringed toy planet, a flying saucer, a toy soldier on a parachute at dawn, and
// party balloons carrying a block away in the morning. Far lanes (FAR_P, behind the near ones): small faded clouds on
// both sides, spreading out on wide screens.
//
// The lanes start above the land (nothing comes down past the castle or the rocket before the
// cloud sea covers them, see place.ts) and then repeat every LOOP levels, in step with the
// story's light (tone.ts), so they go on forever. Each lane's items are listed once, by the level
// they pass the middle of the screen at, from the lane's `from` level; lap k adds k LOOP levels.
// Far away, so faded and flat, with no outline.

export type Kind =
  | "cloud"
  | "kite"
  | "biplane"
  | "hotair"
  | "airship"
  | "satellite"
  | "rocket"
  | "planet"
  | "saucer"
  | "parachute"
  | "balloons"
  | "paper";

export interface Drifter {
  kind: Kind;
  /** Level in the lap (0 at the lane's `from`): it passes the middle of the screen about there. */
  lvl: number;
  /** Center, in u from the screen center (negative is left); far lanes spread out from here on wide screens. */
  x: number;
  /** Size, in u. */
  size: number;
  /** Which side of the screen: +1 right, -1 left. */
  m: number;
  shape: CloudShape;
  phase: number;
}

export interface Lane {
  /** Parallax depth (1 moves with the tower). */
  p: number;
  /** The level its first lap starts at. */
  from: number;
  items: readonly Drifter[];
  /** Far lanes spread their items across the space beside the column on wide screens. */
  spread: boolean;
}

/** Parallax depth of the near lanes and the far lanes. */
export const NEAR_P = 0.7;
export const FAR_P = 0.35;
/**
 * The near lanes start here (levels), above the land: nothing in them comes down past the
 * castle or the rocket before the sea has covered them. The far lanes start lower: they are
 * drawn behind the land (clouds far beyond the castle), and their first lap leaves the title's
 * row clear at the start.
 */
const NEAR_FROM = 40;
const FAR_FROM = 22;

/** One authored entry: what, its level in the lap, and optionally its center (u from the screen center). */
type Spec = readonly [kind: Kind, lvl: number, x?: number];

/** Sizes (u) by kind. */
const SIZE: Record<Kind, number> = {
  cloud: 0.05,
  kite: 0.036,
  biplane: 0.034,
  hotair: 0.037,
  airship: 0.035,
  satellite: 0.034,
  rocket: 0.037,
  planet: 0.035,
  saucer: 0.036,
  parachute: 0.038,
  balloons: 0.036,
  paper: 0.033,
};

function drifter(spec: Spec, side: number, k: number, salt: number, far: boolean): Drifter {
  const [kind, lvl, x] = spec;
  const h = (n: number) => hash(k * 17 + side * 59 + n + salt);
  const cloud = kind === "cloud";
  return {
    kind,
    lvl,
    x: side * (x ?? (far ? h(1) : 0.36 + h(1) * 0.03)),
    size: cloud ? (far ? 0.022 + h(2) * 0.008 : 0.056 + h(2) * 0.016) : SIZE[kind],
    m: side,
    shape: h(5) < 0.55 ? LOW_CLOUD : TALL_CLOUD,
    phase: h(6) * 10,
  };
}

// The near right lane, one lap: toys at the hours they suit. The lap starts at NEAR_FROM (a high
// day; LOOP levels later it is high day again), so: a kite by day, then paper planes, the
// biplane in the afternoon and more paper planes, the hot-air balloon at sunset, the airship at
// dusk, the satellite and the rocket as night falls (the one that launched from the pad, on its
// way out among the stars), the planet and the saucer in the deep night, the parachute at dawn,
// the balloons in the morning and paper planes again. The kite and the first paper planes keep
// above the cloud the rocket flew into on its launch (launch.ts, at the same depth).
const RIGHT: Spec[] = [
  ["kite", 9.3],
  ["paper", 12.5],
  // Nearer the column than the rest: its bunting trails far behind it, toward the screen's side.
  ["biplane", 16, 0.335],
  ["paper", 22.5],
  ["hotair", 29],
  ["airship", 42],
  ["satellite", 55],
  ["rocket", 68],
  ["planet", 81],
  ["saucer", 94],
  ["parachute", 107],
  ["balloons", 120],
  ["paper", 127.5],
];
// The near left lane: block clouds, now low and wide, now tall, in and out a little.
const LEFT: Spec[] = Array.from({ length: 6 }, (_, i) => ["cloud", 6 + i * (LOOP / 6) + (hash(i + 4300) - 0.5) * 5] as const);

// The far lanes: small clouds taking turns either side (none passing the title's row at the start).
const FAR_LEFT: Spec[] = [60, 86, 110, 128].map((l) => ["cloud", l] as const);
const FAR_RIGHT: Spec[] = [21, 66, 95, 120].map((l) => ["cloud", l] as const);
/**
 * Left out of the far right lane: its lowest cloud would hang right behind the rocket's corkscrew
 * of smoke (launch.ts), which has that stretch of sky; every lap leaves it out, so the lanes
 * still repeat. (Left out after the lane is built, so the others keep their looks.)
 */
const FAR_RIGHT_OMIT = 21;

function lane(p: number, from: number, side: number, specs: Spec[], salt: number, spread: boolean, omit = NaN): Lane {
  const items = specs
    .map((sp, k) => drifter(sp, side, k, salt, spread))
    .filter((d) => d.lvl !== omit)
    .sort((a, b) => a.lvl - b.lvl);
  return { p, from, items, spread };
}

/** Far lanes first (drawn behind), then the near lanes. */
export const LANES: readonly Lane[] = [
  lane(FAR_P, FAR_FROM, -1, FAR_LEFT, 5100, true),
  lane(FAR_P, FAR_FROM, 1, FAR_RIGHT, 5200, true, FAR_RIGHT_OMIT),
  lane(NEAR_P, NEAR_FROM, -1, LEFT, 4000, false),
  lane(NEAR_P, NEAR_FROM, 1, RIGHT, 4100, false),
];
export const FAR_LANES = 2;

/** Where an item is this frame: its height (world units) and its center on screen. */
export interface Placed {
  d: Drifter;
  /** Height in its lane, world units (`from` + lap + its level in the lap). */
  at: number;
  /** Which lane (index into LANES). */
  lane: number;
  x: number;
  y: number;
}

const PLACED: Placed = { d: null as unknown as Drifter, at: 0, lane: 0, x: 0, y: 0 };

/** Screen x of an item's center: near lanes at their u offset, far ones spread over the room beside the column. */
export function laneX(s: Scene, l: Lane, d: Drifter): number {
  if (!l.spread) return s.cssW / 2 + d.x * s.u;
  const u = s.u;
  const inner = COLUMN + 0.06;
  const room = Math.max(0, s.cssW / 2 / u - inner - 0.075);
  return s.cssW / 2 + d.m * (inner + Math.abs(d.x) * room) * u;
}

/**
 * Calls `draw` for every item on screen (or close to it), lane by lane, lowest first. The
 * `Placed` it passes is reused: copy it to keep it.
 */
export function eachVisible(s: Scene, draw: (p: Placed) => void, only?: (lane: number) => boolean): void {
  const margin = s.u * 0.35;
  for (let li = 0; li < LANES.length; li++) {
    if (only && !only(li)) continue;
    const l = LANES[li]!;
    const base = layerGround(s, l.p);
    const unit = s.scale * l.p;
    // Heights whose items can touch the screen: y = base - at * unit within the margins.
    const lo = (base - s.cssH - margin) / unit;
    const hi = (base + margin) / unit;
    const start = l.from * BLOCK_HEIGHT;
    const lap = LOOP * BLOCK_HEIGHT;
    const k0 = Math.max(0, Math.floor((lo - start) / lap));
    const k1 = Math.floor((hi - start) / lap);
    for (let k = k0; k <= k1; k++) {
      for (const d of l.items) {
        const at = start + k * lap + d.lvl * BLOCK_HEIGHT;
        if (at < lo || at > hi) continue;
        PLACED.d = d;
        PLACED.at = at;
        PLACED.lane = li;
        PLACED.x = laneX(s, l, d);
        PLACED.y = base - at * unit;
        draw(PLACED);
      }
    }
  }
}

/** Draw one item where it is now. */
export function drawDrifter(ctx: Ctx, s: Scene, tone: Tone, p: Placed): void {
  const { d } = p;
  const u = s.u;
  const far = p.lane < FAR_LANES;
  const sway = Math.sin(s.t * 0.13 + d.phase) * u * (far ? 0.004 : 0.008);
  const bob = Math.sin(s.t * 0.4 + d.phase) * u * (far ? 0.003 : 0.005);
  const x = p.x + sway;
  const y = p.y + bob;
  const k = d.size * u;
  switch (d.kind) {
    case "cloud":
      if (far) blockCloud(ctx, d.shape, x, y, k, tone.farCloudShade, tone.farCloud, tone.farCloudLight);
      else blockCloud(ctx, d.shape, x, y, k, tone.cloudShade, tone.cloud, tone.cloudLight);
      return;
    case "kite":
      toy.kite(ctx, s, tone, x, y, k, d.m, d.phase);
      return;
    case "biplane":
      toy.biplane(ctx, s, tone, x, y, k, d.m, d.phase);
      return;
    case "hotair":
      toy.hotAir(ctx, s, tone, x, y + bob, k);
      return;
    case "airship":
      toy.airship(ctx, s, tone, x, y, k, d.m);
      return;
    case "satellite":
      toy.satellite(ctx, s, tone, x, y, k, d.phase);
      return;
    case "rocket":
      toy.rocket(ctx, s, tone, x, y, k);
      return;
    case "planet":
      toy.planet(ctx, s, tone, x, y, k);
      return;
    case "saucer":
      toy.saucer(ctx, s, tone, x, y, k);
      return;
    case "parachute":
      toy.parachute(ctx, s, tone, x, y, k, d.phase);
      return;
    case "balloons":
      toy.balloons(ctx, tone, x, y + bob * 0.5, k);
      return;
    case "paper":
      toy.paperPlanes(ctx, s, tone, x, y, k, d.m, d.phase);
      return;
  }
}

/** Scratch arguments for `drawOne`, so the per-frame loop allocates no closure. */
const NOW = { ctx: null as Ctx | null, s: null as Scene | null, tone: null as Tone | null };
function drawOne(p: Placed): void {
  drawDrifter(NOW.ctx!, NOW.s!, NOW.tone!, p);
}
const isFar = (lane: number) => lane < FAR_LANES;
const isNear = (lane: number) => lane >= FAR_LANES;

/** The far lanes (behind the land and the sea). */
export function farDrifters(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.tone = tone;
  eachVisible(s, drawOne, isFar);
}

/** The near lanes. */
export function nearDrifters(ctx: Ctx, s: Scene, tone: Tone): void {
  NOW.ctx = ctx;
  NOW.s = s;
  NOW.tone = tone;
  eachVisible(s, drawOne, isNear);
}

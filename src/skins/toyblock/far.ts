import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MEADOW, MEADOW_LIGHT } from "./colors";
import { block } from "./shapes";
import { DAY_HIGH, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: a back row of periwinkle mountains and a front row of
// green hills, all built from stacked rounded slabs like a toy-block landscape. On the left a
// little train runs along an embankment from one tunnel to the next, a lollipop tree on each
// tunnel hill; on the right a block bridge crosses a pool. The right lane's balloons come down
// past the land just before the clouds cover it, so the stretch of hills under them holds no
// props (only plain slabs, which they pass in front of). Then the meadow the fort
// stands on. Above the start a floor of block clouds gathers below you and covers the land:
// from then on its stepped top is the horizon. All of it is faded and flat, with no outline,
// and only the train moves (well clear of the tower's column).
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(18, DAY_HIGH + 1, lvl);
  const below = s.cssH + s.u * 0.2;
  return below + (s.horizonY + s.u * 0.01 - below) * k;
}

/** The land below shows only until the cloud floor covers it (`top` is the floor's top edge). */
export function landShows(s: Scene, top: number): boolean {
  return top > s.horizonY + s.u * 0.02;
}

/** Below this (u under the floor line) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/** Where the sky stops: below this the hills and meadow, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * BACK_BASE + 1 : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- hills

/** One slab of a hill: left and right edge (u), its top (u from the horizon), its height (u). */
type Slab = readonly [x0: number, x1: number, top: number, h: number];

/** A hill of slabs stacked on `base`, bottom first, each `h` tall, stepping in by `widths`. */
function hill(x: number, widths: readonly number[], base: number, h: number, lean = 0): Slab[] {
  return widths.map((w, i) => [x - w / 2 + lean * i, x + w / 2 + lean * i, base - h * (i + 1), h] as const);
}

/** The back row's slab height, base line, and the span its mountains repeat over (u). */
const BACK_STEP = 0.034;
const BACK_BASE = 0.02;
const BACK_SPAN = 1;
const BACK: Slab[] = [
  ...hill(-0.33, [0.36, 0.27, 0.18, 0.1], BACK_BASE, BACK_STEP, 0.012),
  ...hill(0.03, [0.3, 0.2, 0.11], BACK_BASE, BACK_STEP, -0.008),
  ...hill(0.35, [0.4, 0.3, 0.21, 0.13, 0.06], BACK_BASE, BACK_STEP, -0.01),
];

/** The front row: slab height, and its base (the meadow's far edge). */
const STEP = 0.032;
const FRONT_BASE = 0.066;
/** The ground course: a row of low slabs across the whole width, under everything in front. */
const COURSE = FRONT_BASE - STEP;
/** Track level: the top of the embankment. */
const TRACK = COURSE - STEP;
/** The tunnel hills' faces (where the track goes in), and the pool's banks. */
const TUNNEL_A = -0.44;
const TUNNEL_B = -0.3;
/** The pool sits just outside the tower's column, inside the right lane (see drift.ts). */
const POOL = { x0: 0.268, x1: 0.345 } as const;
/** How far the bridge's plank deck reaches past the pool's banks (u). */
const DECK = 0.012;

const FRONT: Slab[] = [
  // The embankment the track runs along.
  [TUNNEL_A - 0.02, TUNNEL_B + 0.02, TRACK, STEP],
  // Tunnel hill A, at the left edge.
  [-0.64, TUNNEL_A, TRACK, STEP],
  [-0.64, TUNNEL_A, TRACK - STEP, STEP],
  [-0.62, TUNNEL_A - 0.008, TRACK - STEP * 2, STEP],
  [-0.6, TUNNEL_A - 0.06, TRACK - STEP * 3, STEP],
  // Tunnel hill B, toward the middle.
  [TUNNEL_B, -0.12, TRACK, STEP],
  [TUNNEL_B, -0.14, TRACK - STEP, STEP],
  [TUNNEL_B + 0.012, -0.17, TRACK - STEP * 2, STEP],
  // A low hill behind the tower, right of tunnel hill B.
  [-0.11, 0.16, COURSE - STEP * 0.8, STEP * 0.8],
  [-0.04, 0.1, COURSE - STEP * 1.6, STEP * 0.8],
  // The banks either side of the pool.
  [0.17, POOL.x0, TRACK, STEP],
  [POOL.x1, 0.64, TRACK, STEP],
  [POOL.x1 + 0.03, 0.64, TRACK - STEP, STEP],
  [POOL.x1 + 0.075, 0.62, TRACK - STEP * 2, STEP],
];

/** Seams between the blocks of a slab: about every SEAM u, offset slab by slab like brickwork. */
const SEAM = 0.085;

/**
 * Fill a row of slabs: the shade (which shows along each slab's bottom), the body, a lit strip
 * along each top, and (optionally) seams between blocks. Three fills.
 */
function slabs(ctx: Ctx, s: Scene, list: readonly Slab[], ox: number, body: string, lit: string, shade: string, seams: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2 + ox;
  const hz = s.horizonY;
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) block(ctx, cx + x0 * u, hz + top * u, (x1 - x0) * u, h * u, h * u * 0.36);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) block(ctx, cx + x0 * u, hz + top * u, (x1 - x0) * u, h * u * 0.76, h * u * 0.32);
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) ctx.rect(cx + x0 * u + h * u * 0.36, hz + top * u + u * 0.003, (x1 - x0 - h * 0.72) * u, u * 0.005);
  if (seams) {
    for (let i = 0; i < list.length; i++) {
      const [x0, x1, top, h] = list[i]!;
      const n = Math.max(1, Math.round((x1 - x0) / SEAM));
      const w = (x1 - x0) / n;
      for (let k = 1; k < n + 1; k++) {
        const x = x0 + w * (k - (i % 2 ? 0.5 : 0));
        if (x < x0 + 0.02 || x > x1 - 0.02) continue;
        ctx.rect(cx + x * u, hz + top * u + u * 0.006, Math.max(1, u * 0.003), h * u * 0.62);
      }
    }
  }
  ctx.fill();
}

function backRow(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  ctx.fillStyle = tone.hillBack;
  ctx.fillRect(0, hz + BACK_BASE * u, s.cssW, bottom - hz - BACK_BASE * u);
  // The back row repeats across wide screens.
  const n = Math.ceil((s.cssW / 2 / u - BACK_SPAN / 2) / BACK_SPAN);
  for (let k = -n; k <= n; k++) slabs(ctx, s, BACK, k * BACK_SPAN * u, tone.hillBack, tone.hillBackLit, tone.hillBackShade, false);
}

/** The ground course: blocks across the whole screen, centered so both sides match. */
function course(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const y = hz + COURSE * u;
  const h = STEP * u;
  ctx.fillStyle = tone.hillFrontShade;
  ctx.fillRect(0, y, s.cssW, bottom - y);
  ctx.fillStyle = tone.hillFront;
  ctx.fillRect(0, y, s.cssW, h * 0.76);
  ctx.fillStyle = tone.hillFrontLit;
  ctx.fillRect(0, y + u * 0.003, s.cssW, u * 0.005);
  ctx.fillStyle = tone.hillFrontShade;
  ctx.beginPath();
  const w = SEAM * 1.4 * u;
  for (let x = s.cssW / 2 - w * Math.ceil(s.cssW / 2 / w) + w * 0.3; x < s.cssW; x += w) ctx.rect(x, y + u * 0.006, Math.max(1, u * 0.003), h * 0.62);
  ctx.fill();
}

function frontRow(ctx: Ctx, s: Scene, tone: Tone): void {
  slabs(ctx, s, FRONT, 0, tone.hillFront, tone.hillFrontLit, tone.hillFrontShade, true);
}

// ---------------------------------------------------------------- the railway

/** The train: engine and two cars, each [length, height, color index] in u; gaps between them. */
const CARS = [
  [0.032, 0.022, 0],
  [0.02, 0.017, 1],
  [0.02, 0.017, 2],
] as const;
const GAP = 0.004;
const TRAIN = CARS.reduce((a, c) => a + c[0], 0) + GAP * (CARS.length - 1);
/** Speed (u per second), and how long it waits in the tunnel between runs (s). */
const TRAIN_SPEED = 0.02;
const TRAIN_WAIT = 7;

/** Where the train's tail is now (u from center), or NaN while it is inside a tunnel. */
export function trainX(t: number): number {
  const from = TUNNEL_A - TRAIN - 0.01;
  const to = TUNNEL_B + 0.01;
  const run = (to - from) / TRAIN_SPEED;
  const k = t % (run + TRAIN_WAIT);
  return k < run ? from + k * TRAIN_SPEED : NaN;
}

function train(ctx: Ctx, s: Scene, tone: Tone): void {
  const tail = trainX(s.t);
  if (Number.isNaN(tail)) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const rail = s.horizonY + TRACK * u;
  const wheel = u * 0.0055;
  const deck = rail - wheel * 1.5;
  let x = cx + tail * u;
  // Cars and engine, back to front (the train runs right).
  for (let i = CARS.length - 1; i >= 0; i--) {
    const [len, h, c] = CARS[i]!;
    const toy = tone.toys[c]!;
    const w = len * u;
    ctx.fillStyle = toy.body;
    ctx.beginPath();
    if (i === 0) {
      // The engine: a cab at the back, a boiler in front, a chimney on the boiler.
      block(ctx, x, deck - h * u, w * 0.42, h * u, u * 0.003);
      block(ctx, x + w * 0.38, deck - h * u * 0.62, w * 0.62, h * u * 0.62, u * 0.004);
      block(ctx, x + w * 0.72, deck - h * u * 0.95, w * 0.14, h * u * 0.36, u * 0.002);
    } else {
      block(ctx, x, deck - h * u, w, h * u, u * 0.003);
    }
    ctx.fill();
    ctx.fillStyle = toy.light;
    ctx.fillRect(x + u * 0.002, deck - h * u + u * 0.002, (i === 0 ? w * 0.42 : w) - u * 0.004, u * 0.004);
    ctx.fillStyle = tone.tunnel;
    ctx.beginPath();
    circle(ctx, x + w * 0.25, deck + wheel * 0.5, wheel);
    circle(ctx, x + w * 0.75, deck + wheel * 0.5, wheel);
    ctx.fill();
    x += w + GAP * u;
  }
}

/** Rails and sleepers along the embankment. */
function track(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const y = s.horizonY + TRACK * u;
  const x0 = cx + TUNNEL_A * u;
  const x1 = cx + TUNNEL_B * u;
  ctx.fillStyle = tone.farWood;
  ctx.beginPath();
  ctx.rect(x0, y - u * 0.004, x1 - x0, u * 0.004);
  for (let x = x0 + u * 0.004; x < x1 - u * 0.006; x += u * 0.014) ctx.rect(x, y - u * 0.005, u * 0.006, u * 0.008);
  ctx.fill();
}

/** Portal size (u). */
const PORTAL_W = 0.05;
const PORTAL_H = 0.054;

/** The tunnel mouths: an arch block in each hill's face, the dark tunnel through it. */
export function portals(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const y = s.horizonY + TRACK * u;
  const w = PORTAL_W * u;
  const h = PORTAL_H * u;
  const ax = cx + TUNNEL_A * u - w + u * 0.006;
  const bx = cx + TUNNEL_B * u - u * 0.006;
  const toy = tone.toys[4];
  ctx.fillStyle = toy.body;
  ctx.beginPath();
  archPath(ctx, ax, y, w, h);
  archPath(ctx, bx, y, w, h);
  ctx.fill();
  ctx.fillStyle = tone.tunnel;
  ctx.beginPath();
  archPath(ctx, ax + w * 0.2, y, w * 0.6, h * 0.72);
  archPath(ctx, bx + w * 0.2, y, w * 0.6, h * 0.72);
  ctx.fill();
}

/** An arch standing on y (left edge x, w wide, h tall) as its own subpath. */
function archPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + r);
  ctx.arc(x + r, y - h + r, r, Math.PI, Math.PI * 2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- the pool and its bridge

export function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x0 = cx + POOL.x0 * u;
  const x1 = cx + POOL.x1 * u;
  const deck = hz + TRACK * u;
  const water = hz + COURSE * u;
  // Water in the gap, down to the ground course, with a lit ripple line.
  ctx.fillStyle = tone.water;
  ctx.fillRect(x0 - 1, water - u * 0.014, x1 - x0 + 2, u * 0.016);
  ctx.fillStyle = tone.waterLit;
  ctx.fillRect(x0 + u * 0.012, water - u * 0.011, (x1 - x0) * 0.35, u * 0.003);
  // The arch block under the deck: a block with a round opening.
  const r = (x1 - x0) * 0.34;
  const mid = (x0 + x1) / 2;
  const toy = tone.toys[0];
  ctx.fillStyle = toy.body;
  ctx.beginPath();
  ctx.moveTo(x0, water);
  ctx.lineTo(x0, deck);
  ctx.lineTo(x1, deck);
  ctx.lineTo(x1, water);
  ctx.lineTo(mid + r, water);
  ctx.arc(mid, water, r, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // The plank deck on top, a little wider than the gap.
  const plank = tone.toys[1];
  ctx.fillStyle = plank.body;
  ctx.beginPath();
  block(ctx, x0 - u * DECK, deck - u * 0.014, x1 - x0 + u * DECK * 2, u * 0.016, u * 0.005);
  ctx.fill();
  ctx.fillStyle = plank.light;
  ctx.fillRect(x0 - u * (DECK - 0.005), deck - u * 0.012, x1 - x0 + u * (DECK - 0.005) * 2, u * 0.004);
}

// ---------------------------------------------------------------- lollipop trees far off

/** Far lollipop trees: x (u), the top they stand on (u from the horizon), canopy size (u). */
const FAR_TREES = [
  { x: -0.455, on: TRACK - STEP * 2, r: 0.017 },
  { x: -0.27, on: TRACK - STEP * 2, r: 0.013 },
] as const;

export function farTrees(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  ctx.fillStyle = tone.farWood;
  ctx.beginPath();
  for (const t of FAR_TREES) ctx.rect(cx + t.x * u - u * 0.002, hz + t.on * u - t.r * u * 2.2, u * 0.004, t.r * u * 2.2);
  ctx.fill();
  ctx.fillStyle = tone.farLeaf;
  ctx.beginPath();
  for (const t of FAR_TREES) circle(ctx, cx + t.x * u, hz + t.on * u - t.r * u * 2.4, t.r * u);
  ctx.fill();
  ctx.fillStyle = tone.farLeafLit;
  ctx.beginPath();
  for (const t of FAR_TREES) circle(ctx, cx + t.x * u - t.r * u * 0.3, hz + t.on * u - t.r * u * 2.75, t.r * u * 0.38);
  ctx.fill();
}

// ---------------------------------------------------------------- meadow

/** The meadow in front of the hills, in two flat bands: lighter far off, deeper near. */
function meadow(ctx: Ctx, s: Scene, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const y0 = hz + FRONT_BASE * u;
  const y1 = hz + 0.14 * u;
  ctx.fillStyle = MEADOW_LIGHT;
  ctx.fillRect(0, y0, s.cssW, Math.max(0, Math.min(bottom, y1) - y0));
  if (bottom > y1) {
    ctx.fillStyle = MEADOW;
    ctx.fillRect(0, y1, s.cssW, bottom - y1);
  }
}

// ---------------------------------------------------------------- the cloud floor

/**
 * Cloud blocks along the floor's top edge, repeating every FLOOR_SPAN of them: width and rise
 * above the floor line (u). A back row stands taller between the front row's blocks.
 */
const FLOOR_SPAN = 8;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({
  w: 0.13 + hash(i + 3200) * 0.09,
  up: 0.035 + hash(i + 3300) * 0.045,
}));
/** Blocks overlap their neighbors a little: each steps on by this fraction of its width. */
const FLOOR_STEP = 0.82;
const FLOOR_W = FLOOR.reduce((a, b) => a + b.w * FLOOR_STEP, 0);
const FLOOR_H = 0.16;

/** One row of the floor's blocks: shade, then body (leaving a shaded lower band), then lit caps. */
function floorRow(ctx: Ctx, s: Scene, tone: Tone, top: number, back: boolean): void {
  const u = s.u;
  const span = FLOOR_W * u;
  // Centered on the screen, so both sides match at any width.
  const start = s.cssW / 2 - span * (Math.ceil(s.cssW / 2 / span) + 0.4);
  const h = FLOOR_H * u;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let x = start, j = 0; x < s.cssW; j++) {
      const b = FLOOR[j % FLOOR_SPAN]!;
      const w = b.w * u;
      const bx = back ? x + w * 0.45 : x;
      const bw = back ? w * 0.7 : w;
      const y = top - b.up * u * (back ? 1.25 : 0.6);
      const r = Math.min(bw, h) * 0.32;
      if (bx + bw > 0) {
        if (pass === 0) block(ctx, bx, y, bw, h, r);
        else if (pass === 1) block(ctx, bx, y, bw - u * 0.008, h * 0.42, r);
        else ctx.rect(bx + r, y + u * 0.006, Math.max(0, bw - r * 2 - u * 0.012), u * 0.007);
      }
      x += w * FLOOR_STEP;
    }
    if (pass === 0 && !back) ctx.rect(0, top + u * 0.1, s.cssW, s.cssH - top);
    ctx.fill();
  }
}

/**
 * The cloud floor: a bank of big rounded cloud blocks in two rows, solid below. It stands
 * still: it runs right behind the tower, where nothing moves.
 */
function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  floorRow(ctx, s, tone, top, true);
  floorRow(ctx, s, tone, top, false);
}

/** Everything on the horizon, back to front. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  if (hz - s.u * 0.2 < s.cssH && landShows(s, top)) {
    const bottom = Math.min(s.cssH, top + s.u * 0.12);
    backRow(ctx, s, tone, bottom);
    train(ctx, s, tone);
    course(ctx, s, tone, bottom);
    frontRow(ctx, s, tone);
    track(ctx, s, tone);
    portals(ctx, s, tone);
    bridge(ctx, s, tone);
    farTrees(ctx, s, tone);
    meadow(ctx, s, bottom);
  }
  if (top < s.cssH + s.u * 0.15) cloudFloor(ctx, s, tone, top);
}

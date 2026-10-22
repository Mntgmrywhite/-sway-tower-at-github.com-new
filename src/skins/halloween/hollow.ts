import { alpha, circle, hash, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { LAMP, mixed, smooth } from "./common";
import { CHARGE_RAISE, horseman } from "./horseman";
import { landBottom } from "./lines";
import { moonAt } from "./sky";
import { toneOf, type Tone } from "./tone";
import { beat } from "./ambient";
import { crooked, drawTree, reach, windAt, type Tree } from "./trees";

// Beyond the town lies Sleepy Hollow, faded by distance and mist: jagged back hills, and the long
// hill under the moon where the Headless Horseman gallops past the moon's face and rides down
// into the old covered bridge at the far end of Main Street, then charges back up the hill and
// away into the mist. Flat silhouettes (no outline), a spindly crooked tree on the crest beyond
// the moon, a broken fence along the road, the bridge's lantern. The hollow lies farther than the
// horizon: as you climb it drops more slowly, all of a piece (the hills, the bridge on its road and
// the banks its piers stand on), and its hills reach down under whatever lies below them (Main
// Street's floor, then the gathered mist: lines.ts landBottom), so no edge of it ever shows.

/** The hill drops this much (a fraction of the climb) as you climb: farther than the horizon. */
const RIDGE_P = 0.06;

// ---------------------------------------------------------------- the hill

/** Scratch geometry for this frame, so the crest function needs no closures. */
const G = { cx: 0, u: 0, hy0: 0, drop: 0, top: 0, mx: 0, mr: 0, mr0: 0 };

/** The bridge, in u from the center: left end, length, deck height above the horizon. */
const BRIDGE_X = 0.0;
const BRIDGE_L = 0.21;
const BRIDGE_DECK = 0.12;

/** The hill runs down from the moon to the covered bridge's portal and ends behind it. */
const DESCENT_START = -0.17;
const DESCENT_END = -0.05;
/** Past the portal its flank drops steeply into the creek under the bridge: this far across per px down. */
const FLANK = 0.28;

/** Screen y of the hill's crest at screen x. */
function crest(x: number): number {
  const X = (x - G.cx) / G.u;
  const H = G.hy0 - G.top;
  const top = H + G.u * (0.01 * Math.sin((X + 0.5) * 10) - 0.03 * (1 - smooth(-0.52, -0.32, X)));
  const deck = BRIDGE_DECK * G.u;
  const h = top + (deck - top) * smooth(DESCENT_START, DESCENT_END, X);
  return G.hy0 - h + G.drop;
}

/** An old split-rail fence along the road on the crest, crooked, a rail down here and there. */
function fence(ctx: Ctx, s: Scene, color: string): void {
  const u = s.u;
  const step = u * 0.034;
  const from = G.cx - u * 0.5 + step * 0.5;
  const to = G.cx + (DESCENT_START + 0.02) * u;
  const ph = u * 0.02;
  ctx.beginPath();
  let i = 0;
  for (let x = from; x < to; x += step, i++) {
    const y = crest(x) + u * 0.002;
    const lean = (hash(i + 70) - 0.5) * u * 0.012;
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - ph * (0.85 + hash(i + 75) * 0.35));
    if (x + step >= to || hash(i + 80) < 0.18) continue;
    const y2 = crest(x + step) + u * 0.002;
    ctx.moveTo(x, y - ph * 0.45);
    ctx.lineTo(x + step, y2 - ph * 0.45);
    if (hash(i + 90) < 0.3) continue;
    ctx.moveTo(x, y - ph * 0.85);
    ctx.lineTo(x + step, y2 - ph * (hash(i + 95) < 0.2 ? 0.3 : 0.85));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, u * 0.0036);
  ctx.lineCap = "round";
  ctx.stroke();
}

function hill(ctx: Ctx, s: Scene, color: string): void {
  const left = -s.u * 0.02 - Math.max(0, s.cssW / 2 - s.u * 0.6);
  const right = G.cx + (BRIDGE_X - 0.03) * G.u;
  const step = s.u * 0.02;
  const bottom = landBottom(s);
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let x = left; x < right; x += step) ctx.lineTo(x, crest(Math.max(x, G.cx - G.u * 0.6)));
  const top = crest(right);
  ctx.lineTo(right, top);
  // The flank, down into the creek under the bridge (the deeper the hollow shows, the farther out).
  ctx.lineTo(right + Math.max(0, bottom - top) * FLANK, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------------------------------------------------------------- the back hills

/** Jagged back hills across the hollow: low in the middle behind the tower, rising at the sides. */
function backHills(ctx: Ctx, s: Scene, color: string): void {
  const u = s.u;
  const base = landBottom(s);
  const top0 = G.hy0 + G.drop;
  const half = s.cssW / 2 / u + 0.05;
  const step = 0.025;
  ctx.beginPath();
  ctx.moveTo(G.cx - half * u, base);
  for (let X = -half; X <= half + step; X += step) {
    const a = Math.abs(X);
    // Low in the middle, but up to the bridge's piers either side of the creek under it.
    const banks = 0.075 * (smooth(-0.1, -0.03, X) * (1 - smooth(0.03, 0.08, X)) + smooth(0.14, 0.2, X) * (1 - smooth(0.24, 0.3, X)));
    const h = 0.035 + banks + 0.11 * smooth(0.12, 0.6, a) + 0.018 * Math.abs(Math.sin(X * 17 + 0.6)) + 0.012 * (hash(Math.round(X / step) + 4900) - 0.5);
    ctx.lineTo(G.cx + X * u, Math.min(base, top0 - h * u));
  }
  ctx.lineTo(G.cx + half * u, base);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------------------------------------------------------------- the Horseman's ride

/**
 * Seconds per loop. His ride starts as a scene starts: out of the mist from the first frame,
 * past the moon's face by ~3.1 s, down the hill and into the covered bridge by ~4.6 s. While the
 * crow takes its two turns round the moon (flight.ts) he is in the bridge; at 9.6 s, as the crow
 * dives away, he bursts back out of its portal, turned round, and charges back up the hill the
 * other way, galloping hard with the pumpkin thrust up high, onto the moon's face only once the
 * crow has left it (~10.2 s), across it (~11.2 s) and into the mist he came from by ~12.4 s.
 * Players watch the first 10 s, then climb past.
 */
export const RIDE_LOOP = 15;
/** His ride out takes this long, and starts this long before the loop does (scene seconds). */
const RIDE_TIME = 5.3;
const RIDE_SHIFT = 0.55;
/** His charge back up the hill: when it starts in the loop, and how long it takes (scene seconds). */
const CHARGE_START = 9.6;
const CHARGE_TIME = 2.8;
/** His ride, in u from the center: out of the mist on the left, past the moon, into the bridge's portal. */
const RIDE_FROM = -0.47;
const RIDE_TO = -0.035;
/** His size unit, in u: about 3 long and 3.3 tall with the pumpkin raised. */
const RIDER_SIZE = 0.046;

/** Scratch result of `riderAt`. */
const R = { x: 0, y: 0, size: 0, tilt: 0, vis: 0, dir: 1, charge: 0 };

function ride(s: Scene): typeof R {
  const c = (((s.t + RIDE_SHIFT) % RIDE_LOOP) + RIDE_LOOP) % RIDE_LOOP;
  const back = c - RIDE_SHIFT - CHARGE_START;
  R.vis = 0;
  let p: number;
  let mist: number;
  if (c < RIDE_TIME) {
    p = c / RIDE_TIME;
    mist = 0.1;
    R.dir = 1;
    R.charge = 0;
  } else if (back >= 0 && back < CHARGE_TIME) {
    p = 1 - back / CHARGE_TIME;
    mist = 0.03;
    R.dir = -1;
    R.charge = 1;
  } else {
    return R;
  }
  R.x = G.cx + (RIDE_FROM + (RIDE_TO - RIDE_FROM) * p) * G.u;
  R.y = crest(R.x) + s.u * 0.003;
  const d = s.u * 0.03;
  R.tilt = Math.max(-0.4, Math.min(0.4, Math.atan2(crest(R.x + d) - crest(R.x - d), 2 * d)));
  R.size = s.u * RIDER_SIZE;
  R.vis = smooth(mist, mist + 0.14, p) * (1 - smooth(0.84, 0.99, p));
  return R;
}

/**
 * Where the Headless Horseman is in this scene (for keeping other things clear of him): ground
 * under his middle, size unit, tilt, his opacity (0 while he is off his ride or the hollow has
 * faded), which way he faces (1 right, -1 left) and whether he is charging (1) back up the hill.
 */
export function riderAt(s: Scene): Readonly<typeof R> {
  if (!geometry(s)) {
    R.vis = 0;
    return R;
  }
  const r = ride(s);
  r.vis *= toneOf(s).hollow;
  return r;
}

/** His drawing's reach in his size unit, from the ground under his middle (facing right, untilted, not charging). */
const RIDER_REACH = { x0: -1.9, x1: 1.45, y0: -3.95, y1: 0.2 };

/** The screen box the Horseman covers this frame, tilt included; null while he is out of sight. */
export function riderBox(s: Scene): { x0: number; y0: number; x1: number; y1: number } | null {
  const r = riderAt(s);
  if (r.vis <= 0.02) return null;
  const c = Math.cos(r.tilt);
  const n = Math.sin(r.tilt);
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const lx of [RIDER_REACH.x0 * r.dir, RIDER_REACH.x1 * r.dir]) {
    for (const ly of [RIDER_REACH.y0 - CHARGE_RAISE * r.charge, RIDER_REACH.y1]) {
      const x = r.x + (lx * c - ly * n) * r.size;
      const y = r.y + (lx * n + ly * c) * r.size;
      box.x0 = Math.min(box.x0, x);
      box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y);
      box.y1 = Math.max(box.y1, y);
    }
  }
  return box;
}

// ---------------------------------------------------------------- covered bridge

/**
 * The old covered bridge at the far end of Main Street, seen from the side and a little from the
 * left, a shade lighter than the hill: a long box with a lattice truss along its side, a roof, the
 * dark arched portal in its gable end where the Horseman's road comes down, a lantern, and stone
 * abutments either side of the creek. The Horseman rides in behind its gable end.
 */
/** The bridge's deck: on the hollow's own line (where the hill's road comes down to it), not the horizon's. */
function deckY(): number {
  return G.hy0 + G.drop + 1 - BRIDGE_DECK * G.u;
}

function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x0 = G.cx + BRIDGE_X * u;
  const x1 = x0 + BRIDGE_L * u;
  const deck = deckY();
  const eave = deck - u * 0.048;
  const fw = u * 0.046;
  const peak = eave - u * 0.03;
  const body = mixed(tone.hill, "#7a3a4a", 0.32);
  const dark = mixed(tone.hill, "#000000", 0.35);
  const lattice = mixed(body, "#e0b090", 0.18);

  // Stone piers at either end, standing on the hillsides.
  ctx.fillStyle = mixed(tone.haze, tone.hill, 0.35);
  ctx.beginPath();
  ctx.moveTo(x1 - u * 0.022, deck);
  ctx.lineTo(x1 + u * 0.008, deck);
  ctx.lineTo(x1 + u * 0.016, deck + u * 0.05);
  ctx.lineTo(x1 - u * 0.03, deck + u * 0.05);
  ctx.closePath();
  ctx.moveTo(x0 - fw * 0.4, deck);
  ctx.lineTo(x0 + u * 0.016, deck);
  ctx.lineTo(x0 + u * 0.024, deck + u * 0.05);
  ctx.lineTo(x0 - fw * 0.55, deck + u * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = body;
  ctx.fillRect(x0, eave, x1 - x0, deck - eave);
  ctx.strokeStyle = lattice;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.beginPath();
  const n = 9;
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step;
    ctx.moveTo(a, deck - u * 0.004);
    ctx.lineTo(a + step, eave + u * 0.006);
    ctx.moveTo(a, eave + u * 0.006);
    ctx.lineTo(a + step, deck - u * 0.004);
  }
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.fillRect(x0 - fw * 0.5, deck - u * 0.004, x1 - x0 + fw * 0.5 + u * 0.01, u * 0.012);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x0 - fw, deck);
  ctx.lineTo(x0, deck);
  ctx.lineTo(x0, eave);
  ctx.lineTo(x0 - fw * 0.5, peak);
  ctx.lineTo(x0 - fw, eave);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mixed(dark, "#000000", 0.4);
  ctx.beginPath();
  const pw = fw * 0.32;
  const pc = x0 - fw * 0.5;
  ctx.moveTo(pc - pw, deck);
  ctx.lineTo(pc - pw, eave + u * 0.002);
  ctx.quadraticCurveTo(pc, eave - u * 0.022, pc + pw, eave + u * 0.002);
  ctx.lineTo(pc + pw, deck);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x0 - fw * 1.1, eave + u * 0.003);
  ctx.lineTo(x0 - fw * 0.5, peak - u * 0.005);
  ctx.lineTo(x1 - fw * 0.5 + u * 0.012, peak - u * 0.005);
  ctx.lineTo(x1 + u * 0.014, eave + u * 0.003);
  ctx.closePath();
  ctx.fill();
  // A lantern hung by the portal
  const lx = x0 + u * 0.014;
  const ly = eave + u * 0.016;
  const flick = 0.85 + 0.15 * Math.sin(s.t * 7) * Math.sin(s.t * 3.1);
  ctx.fillStyle = LANTERN_GLOW;
  ctx.beginPath();
  circle(ctx, lx, ly, u * 0.02 * flick);
  ctx.fill();
  ctx.fillStyle = LAMP;
  ctx.beginPath();
  circle(ctx, lx, ly, u * 0.006);
  ctx.fill();
}
const LANTERN_GLOW = alpha(LAMP, 0.2);

// ---------------------------------------------------------------- trees on the crest

/** A spindly crooked tree on the crest just past the moon, toward the bridge, and one far to the left on wide screens. */
const CREST_TREE: Tree = crooked(12, -0.3, 1.0, 3, 1, 1);
const CREST_REACH = reach(CREST_TREE);
const EDGE_TREE: Tree = crooked(5, 0.2, 0.9, 3);
const CREST_TREE_H = 0.085;
/** Its sway (tree units at its top: about ±0.01u) and its reaching limb's beat: first at REACH_FIRST, then every 18-30 s. */
const SWAY = 0.12;
export const REACH_FIRST = 6.5;
const REACH_EVERY = [18, 30] as const;

/**
 * How far the crest tree's limb is reaching toward the tower now (0..1): it creaks round over 1.5 s,
 * holds 2 s, and pulls back over 1.5 s.
 */
export function reachAt(t: number): number {
  const b = beat(t, REACH_FIRST, REACH_EVERY[0], REACH_EVERY[1], 61);
  const a = b.since;
  if (a >= 5) return 0;
  const e = (x: number) => x * x * (3 - 2 * x);
  return a < 1.5 ? e(a / 1.5) : a < 3.5 ? 1 : e(1 - (a - 3.5) / 1.5);
}

// ---------------------------------------------------------------- layer

/** Set up this frame's hill geometry; false once the hill has sunk below the screen. */
function geometry(s: Scene): boolean {
  const u = s.u;
  G.cx = s.cssW / 2;
  G.u = u;
  G.hy0 = s.horizonY - HORIZON_P * s.rise;
  G.drop = RIDGE_P * s.rise;
  const m = moonAt(s);
  G.mx = m.x;
  G.mr = m.r;
  G.mr0 = m.r0;
  // The crest crosses the moon's lower face, but stays well above the hollow.
  // (Laid out by the moon's start-view spot: as it eases up out of the start view, the hill stays put.)
  G.top = Math.min(m.y0 + m.r0 * 0.36, G.hy0 - u * 0.2);
  return G.top + G.drop - u * 0.2 <= s.cssH;
}

/** Where the crest tree stands (screen x): its leftmost twig clear of the moon's disc. And its height in px. */
function crestTree(s: Scene): { x: number; h: number } {
  const h = s.u * CREST_TREE_H;
  return { x: G.mx + G.mr0 + s.u * 0.012 + SWAY * h - CREST_REACH[0] * h, h };
}

/** The back hills across the hollow (drawn first, behind the mansion's ridge). */
export function hollowBack(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.hollow <= 0.004 || !geometry(s)) return;
  ctx.globalAlpha = tone.hollow;
  backHills(ctx, s, tone.haze);
  ctx.globalAlpha = 1;
}

/**
 * Where the Horseman's road comes down to the covered bridge (screen x, y of the hill's crest at
 * its portal) and the bridge's deck (y), this frame; null once the hollow has sunk out of sight.
 * For tests: the bridge stands on his road at every height.
 */
export function bridgeAt(s: Scene): { portal: number; road: number; deck: number } | null {
  if (!geometry(s)) return null;
  const portal = G.cx + (BRIDGE_X - 0.03) * G.u;
  return { portal, road: crest(portal), deck: deckY() };
}

/** Just the trees on the Horseman's hill (swaying, reaching): for tests. */
export function crestTrees(ctx: Ctx, s: Scene, tone: Tone = toneOf(s)): void {
  if (tone.hollow <= 0.004 || !geometry(s)) return;
  const u = s.u;
  const t = crestTree(s);
  drawTree(ctx, CREST_TREE, t.x, crest(t.x) + u * 0.006, t.h, tone.hill, windAt(s.t, 12, SWAY, reachAt(s.t), 1));
  if (s.cssW / 2 > u * 0.62) {
    const ex = G.cx - u * 0.56;
    drawTree(ctx, EDGE_TREE, ex, crest(ex) + u * 0.006, u * 0.1, tone.hill, windAt(s.t, 5, SWAY, 0, 1));
  }
}

/** Just the Horseman's hill and the fence along its road (the moon rises behind them): for tests. */
export function hillOnly(ctx: Ctx, s: Scene, tone: Tone = toneOf(s)): void {
  if (tone.hollow <= 0.004 || !geometry(s)) return;
  hill(ctx, s, tone.hill);
  fence(ctx, s, tone.hill);
}

/**
 * The near hollow: the Horseman's hill with its tree and fence, the Horseman on it, and the
 * covered bridge. Past the first pass it fades into the mist (tone.ts).
 */
export function hollow(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.hollow <= 0.004 || !geometry(s)) return;
  if (tone.hollow < 1) {
    ctx.save();
    ctx.globalAlpha = tone.hollow;
  }
  const u = s.u;
  hill(ctx, s, tone.hill);
  const t = crestTree(s);
  drawTree(ctx, CREST_TREE, t.x, crest(t.x) + u * 0.006, t.h, tone.hill, windAt(s.t, 12, SWAY, reachAt(s.t), 1));
  if (s.cssW / 2 > u * 0.62) {
    const ex = G.cx - u * 0.56;
    drawTree(ctx, EDGE_TREE, ex, crest(ex) + u * 0.006, u * 0.1, tone.hill, windAt(s.t, 5, SWAY, 0, 1));
  }
  fence(ctx, s, tone.hill);
  const r = ride(s);
  // He fades with his hill (horseman() sets its own opacity): never riding on in the empty sky.
  horseman(ctx, r.x, r.y, r.size, s.t, r.tilt, r.vis * tone.hollow, r.dir, r.charge);
  if (G.hy0 + G.drop - u * 0.2 < s.cssH) bridge(ctx, s, tone);
  if (tone.hollow < 1) ctx.restore();
}

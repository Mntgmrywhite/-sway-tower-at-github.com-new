import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  batBurst,
  batBurstBox,
  batRing,
  batRingBox,
  batTripBox,
  TRIP_BACK,
  TRIP_OUT,
  TRIP_UP,
  batTrip,
  batTripAt,
  blackCat,
  bonebird,
  bonebirdAt,
  bonebirdBox,
  bonebirdV,
  bonebirdVBox,
  BONEBIRD_SIZE,
  boneVAt,
  carriage,
  carriageBox,
  CARRIAGE_LEN,
  catAt,
  catBox,
  CAT_LEN,
  colossus,
  colossusBox,
  curtain,
  curtainAt,
  driftGhost,
  driftGhostAt,
  eyesBox,
  ghost,
  ghostBox,
  GHOST_H,
  glowingEyes,
  graveGhostAt,
  moonShadow,
  moonShadowBox,
  peeker,
  peekerBox,
  PEEKER_SIZE,
  rareAt,
  ringTilt,
  rat,
  ratAt,
  ratBox,
  RAT_LEN,
  raven,
  ravenAt,
  ravenBox,
  RAVEN_SIZE,
  ravenSpot,
  shadowNear,
  skyEel,
  skyEelBox,
  spider,
  spiderAt,
  spiderBox,
  SPIDER_SIZE,
  type Box,
  type CatPose,
  type Rare,
  type RatPose,
  type RavenPose,
} from "./cast/index";
import { SILHOUETTE } from "./cast/palette";
import { bump, smooth } from "./cast/time";
import { inkW } from "./common";
import { SLOT, type Slot } from "./slot";
import { stageAt, type Hideout, type LaneBox, type Pane, type Perch, type Pool, type Road, type Stage } from "./stage";
import { toneOf } from "./tone";

// The cast on the stage. The backdrop (and the foreground, the churchyard, the hill cemetery and
// the graveyard isle) calls `cast` at each of its slots (stage.ts SLOT), back to front, and here
// every performer whose anchor sits in that slot is drawn just where it belongs among the scenery:
//   the raven on its chimney pot (spire tip, gargoyle, dead tree), gliding in from the lane's outer
//   side and flying back off; the black cat walking out along its ridge from behind the turret
//   (the chimney stack, the cottage's gable) to sit and look up at the moon; a spider letting
//   itself down from an eave (a gargoyle's web, an isle's root); a grave ghost rising behind its
//   stone; the rat along the railing; shadows passing behind the lit curtains; the bats' evening
//   trips out of each roost; skeletal birds on boughs and in the cage, and in V-flights across the
//   lanes of the isles; ghosts drifting through the lanes; far off, the colossus striding behind the
//   spires in a lightning flash and the sky-eel swimming through the spirals; the bat ring round the
//   moon; and the rare events where the scene of the moment has a place for them (the bats bursting
//   out of a roost, the great shadow crossing the moon, a skeleton peeking over a rim, the ghostly
//   carriage on its road, glowing eyes in a dark window).
// Each performer keeps its own clock, seeded by its anchor's id (cast/time.ts), so no two keep step.
// A floor landing on the tower startles them (Scene.sinceLand); with reduce motion (Scene.still)
// they keep to their routines. Anchors with vis 0 (off screen, sunk in the mist) are skipped, a
// fading anchor fades its performer, and everything stays in its lane: out of the tower's column,
// below the HUD and inside the screen's edges. Nothing allocates per frame.

/** A bat's half wingspan on a roost's trip and in a burst, in u at the roost's k. */
const TRIP_BAT = 0.06;
const BURST_BAT = 0.05;
/** A burst fans out this narrowly (1: as wide as it can), mostly upward out of the lane. */
const BURST_FAN = 0.45;
/** Ghosts drifting through the lanes and the V-flights of skeletal birds are this big (their k: as near as the lanes' far things). */
const DRIFT_K = 1;
const FLIGHT_K = 0.9;
/** A skeletal bird in the cage is this much smaller than one on a bough (it must fit between the bars). */
const CAGED = 0.8;
/**
 * The raven, the black cat and the ghostly carriage are drawn this much bigger than their anchor's
 * depth alone makes them: they keep to far, small roofs, chimney pots and roads, and at their bare
 * size a phone shows them as specks on a dark roof.
 */
const READ = 1.4;
/** The raven glides in from the lane's outer side this far above its perch (u at its k). */
const RAVEN_FROM = 0.12;
/** The bat ring scatters this long before a great shadow crosses the moon, and gathers again over this long after. */
const RING_LEAD = 0.6;
const RING_TRAIL = 1.0;
/** The sky-eel's swim: across the deep sky in SWIM seconds, out of sight for the rest of each EEL_CYCLE. */
const EEL_CYCLE = 38;
const SWIM = 26;
/** The colossus paces its lane to and fro once in this many seconds. */
const PACE = 140;
/** Performers keep this far (u) inside the screen's edges and the column's margin. */
const EDGE = 0.012;
/** A ghost's reach either side of its tail (its waving arm, squashed by a landing), in units of its height. */
const GHOST_REACH = 0.62;
/** And below this fraction of the screen (the HUD's band). */
const HUD = 0.2;

// ---------------------------------------------------------------- for the tests

/** One performer drawn: what it is, its anchor's id, and the box it covers (px). */
export interface Seen extends Box {
  what: string;
  id: number;
}
/**
 * For the tests: while `on`, every performer drawn is noted here (`what`: raven, cat, spider,
 * ghost, rat, curtain, trip, bird, drift, vflight, colossus, eel, ring, shadow, burst, peek,
 * carriage, eyes). Off in the game: then nothing is noted and nothing allocates.
 */
export const SEEN: { on: boolean; items: Seen[] } = { on: false, items: [] };
function note(what: string, id: number, b: Readonly<Box>): void {
  if (SEEN.on) SEEN.items.push({ what, id, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
}

// ---------------------------------------------------------------- helpers

/** The start of a landing's startle as the cast sees it: none with reduce motion. */
function landed(s: Scene): number {
  return s.still === true ? Infinity : (s.sinceLand ?? Infinity);
}

/** Scratch poses (an anchor's fade times the performer's own opacity). */
const RAVEN: RavenPose = { vis: 0, flying: false, k: 1, lift: 0, caw: 0, preen: 0, hop: 0 };
const RAT: RatPose = { vis: 0, along: 0, run: 0, sniff: 0, freeze: 0 };
const CAT: CatPose = { vis: 0, along: 0, out: true, gait: 0, sit: 0, look: 0, wash: 0, tail: 0, startle: 0 };
/** Scratch boxes for the lanes' two bands (ghosts low, V-flights high). */
const LOW = { x0: 0, y0: 0, x1: 0, y1: 0 };
const HIGH = { x0: 0, y0: 0, x1: 0, y1: 0 };
/** Scratch box of a pane. */
const PANE = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** Whether a box (with a margin) comes near the moon's disc. */
function nearMoon(st: Readonly<Stage>, x0: number, y0: number, x1: number, y1: number, margin: number): boolean {
  const m = st.moon;
  const cx = Math.max(x0, Math.min(m.x, x1));
  const cy = Math.max(y0, Math.min(m.y, y1));
  return Math.hypot(cx - m.x, cy - m.y) < m.r * 1.08 + margin;
}

/** The lane round a point (px): from the screen's edge to the tower's column, below the HUD. Scratch. */
const LANE = { lo: 0, hi: 0, top: 0 };
function laneAt(s: Scene, x: number): typeof LANE {
  const m = s.u * EDGE;
  const c0 = s.baseX - s.u * 0.05;
  const c1 = s.baseX + s.baseW + s.u * 0.05;
  LANE.lo = x >= c1 ? c1 + m : m;
  LANE.hi = x <= c0 ? c0 - m : s.cssW - m;
  LANE.top = s.cssH * HUD;
  return LANE;
}

/**
 * The size and heading that fit a flight out of (x, y) into its lane: `out` and `back` are how
 * far it reaches toward its heading and away from it, `up` how far up, in units of its size. It
 * heads to its own side if that fits as big, else the other way. Scratch.
 */
const FIT = { size: 0, side: 1 as -1 | 1 };
function fit(s: Scene, x: number, y: number, nominal: number, side: -1 | 1, out: number, back: number, up: number): typeof FIT {
  const L = laneAt(s, x);
  const room = (y - L.top - 1) / up;
  const right = Math.min(nominal, room, (L.hi - x) / out, (x - L.lo) / back);
  const left = Math.min(nominal, room, (x - L.lo) / out, (L.hi - x) / back);
  const own = side > 0 ? right : left;
  const other = side > 0 ? left : right;
  FIT.side = other > own * 1.05 ? (side > 0 ? -1 : 1) : side;
  FIT.size = Math.max(0, Math.max(own, other));
  return FIT;
}

// ---------------------------------------------------------------- the regulars

function ravens(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot, land: number): void {
  const P = st.chimneys;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const p = ravenAt(s.t, a.id, land);
    if (p.vis <= 0.01) continue;
    const size = RAVEN_SIZE * READ * s.u * a.k;
    // From the lane's outer side (inside the screen's edge), a little above the perch: lower if that path would cross the moon.
    const fromX = a.side > 0 ? s.cssW - size * 1.3 : size * 1.3;
    let dy = RAVEN_FROM * s.u * a.k;
    for (let j = 0; j < 4 && nearMoon(st, Math.min(fromX, a.x) - size, a.y - dy - size * 1.6 - Math.abs(a.x - fromX) * 0.1, Math.max(fromX, a.x) + size, a.y, s.u * 0.01); j++) dy *= 0.4;
    const at = ravenSpot(p, a.x, a.y, fromX, a.y - dy);
    Object.assign(RAVEN, p);
    RAVEN.vis = p.vis * a.vis;
    raven(ctx, at.x, at.y, size, at.dir, RAVEN, inkW(s, a.k));
    note("raven", a.id, ravenBox(at.x, at.y, size, at.dir, RAVEN));
  }
}

function cats(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot, land: number): void {
  const P = st.ridges;
  // The cat stays in out of the storm.
  const dry = 1 - smooth(0.25, 0.55, st.storm);
  if (dry <= 0.01) return;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const p = catAt(s.t, a.id, land);
    if (p.vis <= 0.01) continue;
    Object.assign(CAT, p);
    const x = a.hx + (a.ex - a.hx) * p.along;
    const y = a.hy + (a.ey - a.hy) * p.along;
    const outward: -1 | 1 = a.ex >= a.hx ? 1 : -1;
    const dir: -1 | 1 = p.out ? outward : outward === 1 ? -1 : 1;
    const size = CAT_LEN * READ * s.u * a.k;
    ctx.globalAlpha = a.vis * dry;
    blackCat(ctx, x, y, size, dir, CAT, st.moon.x, st.moon.y, inkW(s, a.k));
    ctx.globalAlpha = 1;
    note("cat", a.id, catBox(x, y, size, dir, CAT));
  }
}

function spiders(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot, land: number): void {
  const P = st.eaves;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const p = spiderAt(s.t, a.id, land);
    const size = SPIDER_SIZE * s.u * a.k;
    ctx.globalAlpha = a.vis;
    spider(ctx, a.x, a.y, a.room, size, p, inkW(s, a.k));
    ctx.globalAlpha = 1;
    note("spider", a.id, spiderBox(a.x, a.y, a.room, size, p));
  }
}

function graveGhosts(ctx: Ctx, s: Scene, st: Readonly<Stage>, index: number, land: number): void {
  const P = st.stones;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.index !== index) continue;
    const g = graveGhostAt(s.t, a.id, land);
    if (g.vis <= 0.01) continue;
    const dir: -1 | 1 = a.side > 0 ? -1 : 1;
    const h = GHOST_H * s.u * a.k;
    // Behind its stone, nudged in from the screen's edge if its waving arm would reach past it.
    const reach = h * GHOST_REACH + 2;
    const x = Math.max(reach, Math.min(s.cssW - reach, a.x));
    ghost(ctx, x, a.y, h, dir, g.rise, g.bob, g.wave, g.squash, g.vis * a.vis, inkW(s, a.k));
    note("ghost", a.id, ghostBox(x, a.y, h, g.rise, g.bob));
  }
}

/** The open grave behind a ghost's headstone pulls its skeleton part down this long before the ghost comes up, and keeps it down this long after it has sunk. */
const DUCK_LEAD = 0.5;
const DUCK_TRAIL = 0.4;

/**
 * How far up the grave ghost behind headstone `index` (SLOT.stone) is now, or will be in
 * DUCK_LEAD s, or was DUCK_TRAIL s ago, 0..1 (its anchor's fade included). The churchyard holds the open grave behind
 * that stone down meanwhile (graveyard.ts), so a ghost and a skeleton part never cut into each
 * other: the part ducks into its grave as the ghost comes, and pops up again once it has sunk.
 */
export function graveGhostUp(s: Scene, index: number): number {
  const P = stageAt(s).stones;
  const land = landed(s);
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.index !== index) continue;
    const now = graveGhostAt(s.t, a.id, land).rise;
    const soon = graveGhostAt(s.t + DUCK_LEAD, a.id, land).rise;
    const was = graveGhostAt(s.t - DUCK_TRAIL, a.id, land).rise;
    return Math.max(now, soon, was) * a.vis;
  }
  return 0;
}

function rats(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot, land: number): void {
  const P = st.rails;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const p = ratAt(s.t, a.id, land);
    if (p.vis <= 0.01) continue;
    Object.assign(RAT, p);
    RAT.vis = p.vis * a.vis;
    const dir: -1 | 1 = a.ex >= a.hx ? 1 : -1;
    const x = a.hx + (a.ex - a.hx) * p.along;
    const y = a.hy + (a.ey - a.hy) * p.along;
    const size = RAT_LEN * s.u * a.k;
    rat(ctx, x, y, size, dir, RAT, inkW(s, a.k));
    note("rat", a.id, ratBox(x, y, size, dir, RAT));
  }
}

function curtains(ctx: Ctx, s: Scene, P: Pool<Pane>, slot: Slot): void {
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || !a.lit || a.slot !== slot || a.w < 2 || a.h < 2) continue;
    const p = curtainAt(s.t, a.id);
    ctx.globalAlpha = a.vis;
    curtain(ctx, a.x, a.y, a.w, a.h, p);
    ctx.globalAlpha = 1;
    if (p.vis > 0 && SEEN.on) {
      PANE.x0 = a.x;
      PANE.y0 = a.y;
      PANE.x1 = a.x + a.w;
      PANE.y1 = a.y + a.h;
      note("curtain", a.id, PANE);
    }
  }
}

function roosts(ctx: Ctx, s: Scene, P: Pool<Perch>, slot: Slot): void {
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const trip = batTripAt(s.t, a.id);
    if (!trip) continue;
    // Three bats loop the roost and head off and up, as big as the lane has room for.
    const f = fit(s, a.x, a.y, TRIP_BAT * s.u * a.k, a.side, TRIP_OUT, TRIP_BACK, TRIP_UP);
    if (f.size < s.u * 0.004) continue;
    ctx.globalAlpha = a.vis;
    batTrip(ctx, a.x, a.y, f.size, trip.k, f.side, SILHOUETTE);
    ctx.globalAlpha = 1;
    note("trip", a.id, batTripBox(a.x, a.y, f.size, f.side));
  }
}

function boughs(ctx: Ctx, s: Scene, P: Pool<Perch>, slot: Slot, land: number): void {
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const caged = a.id === CAGE_BIRD;
    const size = BONEBIRD_SIZE * s.u * a.k * (caged ? CAGED : 1);
    const dir: -1 | 1 = a.side > 0 ? -1 : 1;
    const p = bonebirdAt(s.t, a.id, land);
    ctx.globalAlpha = a.vis;
    bonebird(ctx, a.x, a.y, size, dir, p, inkW(s, a.k * (caged ? CAGED : 1)));
    ctx.globalAlpha = 1;
    note("bird", a.id, bonebirdBox(a.x, a.y, size, dir, p));
  }
}
/** The skeletal bird in the curio shop's birdcage (stage.ts cageBird). */
const CAGE_BIRD = 1001;

/**
 * Ghosts drifting through the lanes above the start view, two to a lane (one low, one high, each
 * on its own clock); in the spiral sky and the isles the high one gives way to V-flights of
 * skeletal birds.
 */
function lanes(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot): void {
  const P = st.lanes;
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis || a.slot !== slot) continue;
    const split = a.y0 + (a.y1 - a.y0) * 0.42;
    LOW.x0 = a.x0;
    LOW.x1 = a.x1;
    LOW.y0 = split;
    LOW.y1 = a.y1;
    HIGH.x0 = a.x0;
    HIGH.x1 = a.x1;
    HIGH.y0 = a.y0;
    HIGH.y1 = split;
    driftingGhost(ctx, s, a, LOW, a.id);
    // (Coming into the loop's band the high ghost fades out as the V-flights fade in.)
    if (st.loopIn < 1) driftingGhost(ctx, s, a, HIGH, a.id + HIGH_GHOST, 1 - st.loopIn);
    if (st.loopIn > 0) {
      const v = boneVAt(s.t, a.id);
      if (v) {
        ctx.globalAlpha = v.vis * a.vis * st.loopIn;
        const size = Math.min(BONEBIRD_SIZE * s.u * FLIGHT_K, (HIGH.y1 - HIGH.y0) / (1.24 + v.n * 0.55));
        bonebirdV(ctx, HIGH, v.k, v.n, size, v.dir, s.t, inkW(s, FLIGHT_K));
        ctx.globalAlpha = 1;
        note("vflight", a.id, bonebirdVBox(HIGH, v.k, v.n, size, v.dir));
      }
    }
  }
}

/** The high ghost of a lane keeps its own clock: its anchor's id plus this. */
const HIGH_GHOST = 7;

/**
 * A ghost wandering across a band of a lane (on the clock `seed`), fading in and out: each visit a
 * different ghost (the sheet, long-armed, tattered, with a lantern), big or small, and its own way
 * across (rising, wandering up and down, swooping, turning a loop), kept inside the band.
 */
function driftingGhost(ctx: Ctx, s: Scene, a: Readonly<LaneBox>, box: typeof LOW, seed: number, fade = 1): void {
  const d = driftGhostAt(s.t, seed);
  if (d.vis * fade <= 0.01) return;
  const h = Math.min(GHOST_H * s.u * DRIFT_K * d.size, (box.y1 - box.y0) * 0.6);
  const reach = h * 0.62 + 2;
  const x0 = box.x0 + reach;
  const x1 = box.x1 - reach;
  if (x1 <= x0) return;
  const k = d.k;
  let f = d.dir > 0 ? k : 1 - k;
  // Its tail's base keeps between lo (low in the band) and hi (high: its head under the band's top).
  const lo = box.y1 - h * 0.12 - h * 0.06 - 2;
  const hi = Math.min(lo, box.y0 + h * 1.08 + h * 0.06 + 2);
  let y: number;
  switch (d.path) {
    case 1:
      y = (lo + hi) / 2 + ((lo - hi) / 2) * 0.85 * Math.sin(k * Math.PI * 2.5);
      break;
    case 2:
      y = hi + (lo - hi) * Math.sin(k * Math.PI);
      break;
    case 3: {
      // Rising, with a loop turned in the middle of the way.
      const turn = Math.max(0, Math.min(1, (k - 0.35) / 0.35));
      const th = turn * Math.PI * 2;
      const r = Math.min((lo - hi) * 0.3, (x1 - x0) * 0.3);
      f += ((Math.sin(th) * r) / Math.max(1, x1 - x0)) * d.dir;
      y = lo + (hi - lo) * k * 0.8 - r * (1 - Math.cos(th));
      break;
    }
    default:
      y = lo + (hi - lo) * k * 0.8;
  }
  const x = x0 + (x1 - x0) * Math.max(0, Math.min(1, f));
  y = Math.max(hi, Math.min(lo, y));
  driftGhost(ctx, x, y, h, d.dir, d.kind, d.bob, d.vis * a.vis * fade * 0.9, inkW(s, DRIFT_K), s.t);
  note("drift", seed, ghostBox(x, y, h, 1, d.bob));
}

/** Far off: the colossus behind the spires (seen in the lightning, and faintly in the spiral sky), the sky-eel in the spirals. */
function deep(ctx: Ctx, s: Scene, st: Readonly<Stage>): void {
  const P = st.deep;
  const tone = toneOf(s);
  for (let i = 0; i < P.n; i++) {
    const a = P.items[i]!;
    if (!a.vis) continue;
    const w = a.x1 - a.x0;
    if (a.side > 0) {
      const reveal = Math.max(st.flash, 0.25 * tone.spiral) * a.vis;
      if (reveal <= 0.01) continue;
      const h = Math.min((a.y1 - a.y0) * 0.9, w / 0.5);
      const half = h * 0.24;
      const f = 0.5 - 0.5 * Math.cos((s.t / PACE) * Math.PI * 2);
      const x = a.x0 + half + (w - half * 2) * f;
      colossus(ctx, x, a.y1, h, s.t, SILHOUETTE, reveal);
      note("colossus", a.id, colossusBox(x, a.y1, h));
    } else {
      if (tone.spiral <= 0.01) continue;
      const c = s.t / EEL_CYCLE;
      const n = Math.floor(c);
      const swim = (c - n) * EEL_CYCLE;
      if (swim >= SWIM) continue;
      const k = swim / SWIM;
      const len = Math.min(0.4 * s.u * a.k, w * 0.7);
      const dir: -1 | 1 = n % 2 ? -1 : 1;
      const room = w - len * 1.04;
      const x = a.x0 + len * 0.52 + room * (dir > 0 ? k : 1 - k);
      const y = a.y0 + (a.y1 - a.y0) * (0.3 + 0.12 * Math.sin(s.t * 0.21)) + len * 0.2;
      // A dark shadow against the night: faint as the spirals come, full in the thick of them.
      ctx.globalAlpha = Math.min(1, 0.4 + tone.spiral) * smooth(0, 0.15, tone.spiral) * a.vis * smooth(0, 0.12, k) * (1 - smooth(0.88, 1, k));
      skyEel(ctx, x, y, len, s.t, SILHOUETTE, dir);
      ctx.globalAlpha = 1;
      note("eel", a.id, skyEelBox(x, y, len));
    }
  }
}

// ---------------------------------------------------------------- the rare events

/** The first anchor of a pool on screen, searched forward or backward (for variety, by the event's number). */
function pick<T extends { vis: number; slot: Slot }>(P: Pool<T>, seed: number, ok: (a: T) => boolean): T | null {
  const back = seed % 2 === 1;
  for (let j = 0; j < P.n; j++) {
    const a = P.items[back ? P.n - 1 - j : j]!;
    if (a.vis && ok(a)) return a;
  }
  return null;
}
/** Glowing eyes in the dark are this big (u) to read; a dark window must hold them. */
const EYES = 0.045;
/** In the start view they look out of the dark of the alley between the sweet shop and Main Street, this high (u above the floor line). */
const ALLEY_UP = 0.33;
/** Their stable id (as noted for the tests). */
const ALLEY = 2001;
/** The box the eyes cover (noted for the tests). Scratch. */
const LURK = { x0: 0, y0: 0, x1: 0, y1: 0 };
const dark = (a: Pane): boolean => !a.lit && a.w > 2 && a.h > 2;
const any = (): boolean => true;

/** The rare event of the moment, if its place is in this slot. */
function rare(ctx: Ctx, s: Scene, st: Readonly<Stage>, slot: Slot, r: Readonly<Rare>): void {
  switch (r.kind) {
    case "scatter": {
      const a = pick(st.roosts, r.seed, any);
      if (!a || a.slot !== slot) return;
      // The colony bursts out and fans up out of the lane, as big as it has room for.
      const f = fit(s, a.x, a.y, BURST_BAT * s.u * a.k, a.side, 8.8, 1.9, 13.9);
      if (f.size < s.u * 0.004) return;
      ctx.globalAlpha = a.vis;
      batBurst(ctx, a.x, a.y, f.size, r.k, r.seed, f.side, SILHOUETTE, BURST_FAN);
      ctx.globalAlpha = 1;
      note("burst", a.id, batBurstBox(a.x, a.y, f.size, r.k, f.side, BURST_FAN));
      return;
    }
    case "peek": {
      const a: Hideout | null = pick(st.hideouts, r.seed, any);
      if (!a || a.slot !== slot) return;
      const x = (a.x0 + a.x1) / 2;
      const size = PEEKER_SIZE * s.u * a.k;
      ctx.globalAlpha = a.vis;
      peeker(ctx, x, a.rimY, size, r.k, r.seed, inkW(s, a.k), a.side > 0 ? -1 : 1);
      ctx.globalAlpha = 1;
      note("peek", a.id, peekerBox(x, a.rimY, size, r.k));
      return;
    }
    case "carriage": {
      const a: Road | null = pick(st.roads, r.seed, any);
      if (!a || a.slot !== slot) return;
      // Variant 0 rolls right, 1 left: along the road from whichever end that starts at.
      const forward = (r.variant === 0) === a.x1 >= a.x0;
      const f = forward ? r.k : 1 - r.k;
      const g = 1 - f;
      const x = g * g * a.x0 + 2 * g * f * a.xm + f * f * a.x1;
      const y = g * g * a.y0 + 2 * g * f * a.ym + f * f * a.y1;
      const k = a.k + (a.k1 - a.k) * f;
      const size = CARRIAGE_LEN * READ * s.u * k;
      const vis = a.vis * smooth(0, 0.14, r.k) * (1 - smooth(0.86, 1, r.k));
      carriage(ctx, x, y, size, r.variant === 0 ? 1 : -1, s.t, vis, inkW(s, k));
      note("carriage", a.id, carriageBox(x, y, size));
      return;
    }
    case "eyes": {
      // In a dark window big enough to hold them; else, in the start view, out of the dark of the
      // alley between the sweet shop and Main Street; else low in a lane, just above the mist.
      const min = EYES * s.u;
      const a = pick(st.panes, r.seed, (p) => dark(p) && p.w >= min * 0.9 && p.h >= min * 0.4);
      if (a) {
        if (a.slot !== slot) return;
        const size = Math.min(a.w * 0.95, a.h / 0.4);
        const x = a.x + a.w / 2;
        const y = a.y + a.h / 2;
        ctx.globalAlpha = a.vis;
        glowingEyes(ctx, x, y, size, r.k, r.seed, r.variant);
        ctx.globalAlpha = 1;
        note("eyes", a.id, eyesBox(x, y, size));
        return;
      }
      if (st.band === 0) {
        if (slot !== SLOT.behindNear) return;
        const x = s.baseX - s.u * 0.05 - s.u * EDGE - min * 0.55;
        const y = s.groundY - ALLEY_UP * s.u;
        glowingEyes(ctx, x, y, min, r.k, r.seed, r.variant);
        note("eyes", ALLEY, eyesBox(x, y, min));
        return;
      }
      const b = pick(st.lanes, r.seed, (l) => l.x1 - l.x0 > min * 1.6 && l.y1 - l.y0 > min);
      if (!b || b.slot !== slot) return;
      const x = b.x0 + (b.x1 - b.x0) * (0.3 + 0.4 * (r.seed % 3) * 0.5);
      const y = b.y1 - min * 0.4;
      ctx.globalAlpha = b.vis;
      glowingEyes(ctx, x, y, min, r.k, r.seed, r.variant);
      ctx.globalAlpha = 1;
      const e = eyesBox(x, y, min);
      LURK.x0 = e.x0;
      LURK.y0 = e.y0;
      LURK.x1 = e.x1;
      LURK.y1 = e.y1;
      note("eyes", b.id, LURK);
      return;
    }
    case "shadow":
      // Crossing the moon: drawn with the moon's crossers (MOON).
      return;
  }
}

// ---------------------------------------------------------------- the hooks

/** Draw the performers whose anchors sit in this slot (and, for SLOT.stone, at this stone). */
export function cast(ctx: Ctx, s: Scene, slot: Slot, index = 0): void {
  const st = stageAt(s);
  const land = landed(s);
  if (slot === SLOT.stone) {
    graveGhosts(ctx, s, st, index, land);
    return;
  }
  if (slot === SLOT.deep) {
    deep(ctx, s, st);
    return;
  }
  if (slot === SLOT.moon) {
    moonCrossers(ctx, s);
    return;
  }
  roosts(ctx, s, st.roosts, slot);
  curtains(ctx, s, st.panes, slot);
  boughs(ctx, s, st.boughs, slot, land);
  spiders(ctx, s, st, slot, land);
  cats(ctx, s, st, slot, land);
  ravens(ctx, s, st, slot, land);
  rats(ctx, s, st, slot, land);
  lanes(ctx, s, st, slot);
  const r = rareAt(s.t);
  if (r) rare(ctx, s, st, slot, r);
}

/**
 * How far the bat ring is flung out now (0..1): it scatters before a great shadow crosses the
 * moon and gathers after it, and jinks a little when a floor lands on the tower.
 */
export function ringScatter(s: Scene): number {
  const land = landed(s);
  const jink = land < Infinity ? 0.2 * bump(0, 0.08, 0.25, 0.6, land) : 0;
  return Math.max(shadowNear(s.t, RING_LEAD, RING_TRAIL), jink);
}

/**
 * The only things that may cross the moon's face besides the Horseman and the crow: the bat ring
 * (at height) and the rare great shadow.
 */
export function moonCrossers(ctx: Ctx, s: Scene): void {
  ringRound(ctx, s);
  shadowOver(ctx, s);
}

/** The ring of bats round the moon, kept out of the tower's column and inside the screen's edge. */
export function ringRound(ctx: Ctx, s: Scene): void {
  const st = stageAt(s);
  if (st.ring <= 0.01) return;
  const m = st.moon;
  const scatter = ringScatter(s);
  // On a phone the moon is close to the screen's edge: the ring tilts up steeply to fit beside it.
  const lo = s.u * EDGE;
  const tilt = ringTilt(m.r, m.x - lo);
  batRing(ctx, m.x, m.y, m.r, s.t, st.ring, scatter, SILHOUETTE, s.baseX - s.u * 0.05, tilt, lo);
  note("ring", 0, batRingBox(m.x, m.y, m.r, scatter, tilt));
}

/**
 * The great shadow crossing the moon, when one does. It keeps out of the tower's column, except
 * in the start view: the moon's own disc reaches into the column there, high above the base and
 * the slider, and the shadow crosses the whole of it.
 */
export function shadowOver(ctx: Ctx, s: Scene): void {
  const r = rareAt(s.t);
  if (!r || r.kind !== "shadow") return;
  const st = stageAt(s);
  const m = st.moon;
  moonShadow(ctx, m.x, m.y, m.r, r.k, r.variant, s.t, st.band === 0 ? Infinity : s.baseX - s.u * 0.05);
  note("shadow", 0, moonShadowBox(m.x, m.y, m.r, r.k, r.variant));
}

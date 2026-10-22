import type { Scene } from "../skin";
import { smooth, spot } from "./common";
import { bandTop, railTop } from "./front";
import { GHOST_STONES } from "./graveyard";
import { ISLE_AT, isleAt, ISLES } from "./isles";
import { flashAt } from "./lightning";
import { mistTop, restLine } from "./lines";
import { cragRoad, mansionAt } from "./mansion";
import { cagePerch, shopBox, shopPoint, SHOP_SPOTS } from "./shops";
import {
  bellTowerAt,
  CATHEDRAL_BOX,
  cathedralAt,
  chimneyStackAt,
  laneOf,
  NEAR_AT,
  nearSpireAt,
  roofsAt,
  ROOFS_AT,
  STORM_AT,
} from "./skyline";
import { HALO_REACH, moonAt } from "./sky";
import { CHAPEL_SPOTS, LIGHT_SPOTS, OAK_AT, PIECE_AT, pieceAt, piecePoint, PIECES, pieceSpots, SHIP_SPOTS, type PieceKind } from "./drowned";
import { HILL_STONE_INDEX, ISLE_STONE_INDEX, SLOT, type Slot } from "./slot";
import { bandOf, level, STRETCH, toneOf } from "./tone";
import { CEMETERY_AT, cemeteryAt, villageAt } from "./village";

// The stage: where the cast performs, this frame. Every place a creature can be (a chimney for the
// raven, a ridge for the cat, an eave for the spider, a stone for a grave ghost, the railing for the
// rat, a lit window for a shadow behind the curtains or a dark one for glowing eyes, a hideout to
// peek from, a road for the ghostly carriage, a roost for the bats, a bough for a skeletal bird, free
// sky in the lanes for drifting ghosts and V-flights, and the deep sky for the distant creatures)
// is an anchor here, with a stable id (unique in the whole story; a loop's copy keeps it), its size
// factor k (a performer's size is its constant x u x k), its opacity now (0: off screen or faded:
// skip it), the slot it is drawn in (SLOT, below: just where it belongs among the scenery) and its
// lane. The anchors follow the height story (tone.ts): the shops' in the start view and over the
// rooftops, the skyline's, the storm's, the isles' in the loop; all of them are always in their
// pools (vis 0 when out of sight). Everything is computed from the scenery's own geometry, once
// per frame (cached: every slot asks), into reused objects: nothing allocates.

export { SLOT, type Slot } from "./slot";

/** Live items are items[0..n); the arrays are reused scratch (never allocated per frame). */
export interface Pool<T> {
  readonly items: readonly T[];
  readonly n: number;
}
interface Anchor {
  /** Stable across frames and heights, unique in the whole story. */
  id: number;
  /** Size factor: a performer's size in u x s.u x k (1 = the tower's line at the start view). */
  k: number;
  /** 0 = off screen or faded (skip), else its opacity (mist, the hollow's fade). */
  vis: number;
  /** Where to draw it (and, for SLOT.stone, the stone's number). */
  slot: Slot;
  index: number;
  /** Its lane; performers face the tower (-side) at rest. */
  side: -1 | 1;
}
/** Feet / hanging point; room (px): the clear space above it (for `eaves`: the free drop below it). */
export interface Perch extends Anchor {
  x: number;
  y: number;
  room: number;
}
/** A walk from its hiding end (hx, hy: walkers vanish behind it) to its open end (ex, ey). */
export interface Ridge extends Anchor {
  hx: number;
  hy: number;
  ex: number;
  ey: number;
}
/** A window: its top-left corner, size, and whether it is lit (1: shadows pass behind its curtains) or dark (0: eyes may open in it). */
export interface Pane extends Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: number;
}
/** A rim to peek over (x0..x1 at rimY): drawn just BEFORE its occluder (its slot). */
export interface Hideout extends Anchor {
  x0: number;
  x1: number;
  rimY: number;
}
/** A road: a quadratic from (x0, y0) by (xm, ym) to (x1, y1); size factor k at its start, k1 at its end. */
export interface Road extends Anchor {
  x0: number;
  y0: number;
  xm: number;
  ym: number;
  x1: number;
  y1: number;
  k1: number;
}
/** Free sky: clear of the column, the moon's disc and halo, the HUD (y >= 0.2H), the edges and the props. */
export interface LaneBox extends Anchor {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface Stage {
  /** 0 A Main Street, 1 B rooftops, 2 C skyline, 3 D storm, 4 E and the loop's isles. */
  band: 0 | 1 | 2 | 3 | 4;
  /** How far into the loop's band (E) the climb is, easing 0..1 over its first LOOP_IN levels: what comes in there fades in, never pops. */
  loopIn: number;
  moon: { x: number; y: number; r: number };
  /** The bat ring round the moon, the storm, the lightning now (0..1; flash 0 with reduce motion). */
  ring: number;
  storm: number;
  flash: number;
  chimneys: Pool<Perch>;
  ridges: Pool<Ridge>;
  eaves: Pool<Perch>;
  stones: Pool<Perch>;
  rails: Pool<Ridge>;
  panes: Pool<Pane>;
  hideouts: Pool<Hideout>;
  roads: Pool<Road>;
  roosts: Pool<Perch>;
  boughs: Pool<Perch>;
  lanes: Pool<LaneBox>;
  deep: Pool<LaneBox>;
}

/** Levels over which the loop's band comes in (Stage.loopIn). */
const LOOP_IN = 1.5;

/** Parallax p of the named layers (0 fixed, 1 with the tower, > 1 faster): for the parallax test. */
export const LAYERS: Readonly<Record<string, number>> = Object.freeze({
  sky: 0,
  moonClouds: 0,
  storm: 0,
  hollow: 0.06,
  horizon: 0.12,
  farCity: 0.12,
  village: 0.12,
  cemetery: 0.1,
  cathedral: 0.2,
  roofs: 0.2,
  isles: 0.55,
  bellTower: 0.6,
  nearSpire: 0.8,
  chimneyStack: 0.8,
  drowned: 0.22,
  town: 0.79,
  front: 1.6,
  frontFog: 1.25,
});

// ---------------------------------------------------------------- pools

function perch(id: number, slot: Slot, side: -1 | 1, index = 0): Perch {
  return { id, k: 1, vis: 0, slot, index, side, x: 0, y: 0, room: 0 };
}
function ridge(id: number, slot: Slot, side: -1 | 1): Ridge {
  return { id, k: 1, vis: 0, slot, index: 0, side, hx: 0, hy: 0, ex: 0, ey: 0 };
}
function pane(id: number, slot: Slot, side: -1 | 1, lit: number): Pane {
  return { id, k: 1, vis: 0, slot, index: 0, side, x: 0, y: 0, w: 0, h: 0, lit };
}
function hideout(id: number, slot: Slot, side: -1 | 1): Hideout {
  return { id, k: 1, vis: 0, slot, index: 0, side, x0: 0, x1: 0, rimY: 0 };
}
function road(id: number, slot: Slot, side: -1 | 1): Road {
  return { id, k: 1, vis: 0, slot, index: 0, side, x0: 0, y0: 0, xm: 0, ym: 0, x1: 0, y1: 0, k1: 1 };
}
function box(id: number, slot: Slot, side: -1 | 1): LaneBox {
  return { id, k: 1, vis: 0, slot, index: 0, side, x0: 0, y0: 0, x1: 0, y1: 0 };
}
function pool<T>(items: T[]): { items: T[]; n: number } {
  return { items, n: items.length };
}

const S = SLOT;
/** Anchors by name, so the code below reads; every one is also in its pool. */
const A = {
  // Raven perches.
  curioChimney: perch(101, S.near, 1),
  spireVane: perch(111, S.behindNear, 1),
  stackPot: perch(112, S.behindNear, -1),
  roofsChimney: perch(113, S.behindNear, -1),
  bellGargoyleL: perch(121, S.mid, 1),
  bellGargoyleR: perch(122, S.mid, 1),
  chapelCross: perch(141, S.mist, -1),
  lightRail: perch(142, S.mist, -1),
  shipMast: perch(143, S.mist, -1),
  oakFork: perch(144, S.mist, -1),
  gravesTree: perch(131, S.mid, 1),
  cottageTree: perch(132, S.behindNear, -1),
  castleTip: perch(133, S.mid, 1),
  // Cat walks.
  curioRidge: ridge(201, S.near, 1),
  roofsRidge: ridge(211, S.behindNear, -1),
  cottageRidge: ridge(231, S.behindNear, -1),
  // Spider threads.
  sweetEave: perch(301, S.near, -1),
  railWebL: perch(302, S.front, -1),
  railWebR: perch(303, S.front, 1),
  hillTreeL: perch(311, S.hollow, -1),
  hillTreeR: perch(312, S.hollow, -1),
  roofsGargoyle: perch(321, S.behindNear, -1),
  bellWebL: perch(322, S.mid, 1),
  bellWebR: perch(323, S.mid, 1),
  chapelWeb: perch(341, S.mist, -1),
  gravesTip: perch(331, S.mid, 1),
  cottageTip: perch(332, S.behindNear, -1),
  // Grave ghosts' stones (index: the stone's number, the slot's STONE call).
  cross: perch(400, S.stone, -1, 0),
  slab: perch(401, S.stone, 1, 1),
  hill0: perch(402, S.stone, -1, HILL_STONE_INDEX),
  hill1: perch(403, S.stone, -1, HILL_STONE_INDEX + 1),
  hill2: perch(404, S.stone, -1, HILL_STONE_INDEX + 2),
  hill3: perch(405, S.stone, 1, HILL_STONE_INDEX + 3),
  isleStone0: perch(406, S.stone, 1, ISLE_STONE_INDEX),
  isleStone1: perch(407, S.stone, 1, ISLE_STONE_INDEX + 1),
  // The rat's run.
  rail: ridge(501, S.front, 1),
  // Windows.
  sweetGable: pane(601, S.near, -1, 1),
  sweetVent: pane(602, S.near, -1, 0),
  curioDormer: pane(603, S.near, 1, 1),
  roofsWindow: pane(611, S.behindNear, -1, 1),
  roofsAttic: pane(612, S.behindNear, -1, 0),
  cottageWindow: pane(631, S.behindNear, -1, 1),
  hangingWindow: pane(632, S.mid, 1, 1),
  chapelLancet: pane(641, S.mist, -1, 1),
  skyDoor: pane(633, S.mid, 1, 0),
  // Hideouts.
  belvedere: hideout(701, S.near, 1),
  stackHide: hideout(711, S.hollow, -1),
  roofsHide: hideout(712, S.hollow, -1),
  cottageHide: hideout(731, S.hollow, -1),
  shipNest: hideout(741, S.mist, -1),
  // Roads.
  cragRoad: road(801, S.hollow, 1),
  loopBridge: road(831, S.mid, 1),
  // Roosts.
  belfry: perch(901, S.hollow, 1),
  cathedralSpire: perch(911, S.mid, 1),
  bellRoost: perch(921, S.mid, 1),
  castleRoost: perch(931, S.mid, 1),
  chapelBelfry: perch(941, S.mist, -1),
  // Boughs.
  cageBird: perch(1001, S.near, 1),
  hillBoughL: perch(1011, S.hollow, -1),
  hillBoughR: perch(1012, S.hollow, -1),
  roofsCage: perch(1021, S.behindNear, -1),
  oakBough: perch(1051, S.mist, -1),
  gravesBough: perch(1041, S.mid, 1),
  cottageBough: perch(1042, S.behindNear, -1),
  // Free sky.
  laneL: box(1101, S.near, -1),
  laneR: box(1102, S.near, 1),
  deepR: box(1201, S.deep, 1),
  deepL: box(1202, S.deep, -1),
};

/** The hill cemetery's stone anchors, in its stones' order. */
const HILL = [A.hill0, A.hill1, A.hill2, A.hill3] as const;

const STAGE = {
  band: 0 as 0 | 1 | 2 | 3 | 4,
  loopIn: 0,
  moon: { x: 0, y: 0, r: 0 },
  ring: 0,
  storm: 0,
  flash: 0,
  chimneys: pool<Perch>([A.curioChimney, A.spireVane, A.stackPot, A.roofsChimney, A.bellGargoyleL, A.bellGargoyleR, A.chapelCross, A.lightRail, A.shipMast, A.oakFork, A.gravesTree, A.cottageTree, A.castleTip]),
  ridges: pool<Ridge>([A.curioRidge, A.roofsRidge, A.cottageRidge]),
  eaves: pool<Perch>([A.sweetEave, A.railWebL, A.railWebR, A.hillTreeL, A.hillTreeR, A.roofsGargoyle, A.bellWebL, A.bellWebR, A.chapelWeb, A.gravesTip, A.cottageTip]),
  stones: pool<Perch>([A.cross, A.slab, A.hill0, A.hill1, A.hill2, A.hill3, A.isleStone0, A.isleStone1]),
  rails: pool<Ridge>([A.rail]),
  panes: pool<Pane>([A.sweetGable, A.sweetVent, A.curioDormer, A.roofsWindow, A.roofsAttic, A.cottageWindow, A.hangingWindow, A.skyDoor, A.chapelLancet]),
  hideouts: pool<Hideout>([A.belvedere, A.stackHide, A.roofsHide, A.cottageHide, A.shipNest]),
  roads: pool<Road>([A.cragRoad, A.loopBridge]),
  roosts: pool<Perch>([A.belfry, A.cathedralSpire, A.bellRoost, A.castleRoost, A.chapelBelfry]),
  boughs: pool<Perch>([A.cageBird, A.hillBoughL, A.hillBoughR, A.roofsCage, A.oakBough, A.gravesBough, A.cottageBough]),
  lanes: pool<LaneBox>([A.laneL, A.laneR]),
  deep: pool<LaneBox>([A.deepR, A.deepL]),
};

// ---------------------------------------------------------------- setting anchors

function at(a: Perch, x: number, y: number, k: number, vis: number, room: number): void {
  a.x = x;
  a.y = y;
  a.k = k;
  a.vis = vis > 0.01 ? Math.min(1, vis) : 0;
  a.room = room;
}
function walk(a: Ridge, hx: number, hy: number, ex: number, ey: number, k: number, vis: number): void {
  a.hx = hx;
  a.hy = hy;
  a.ex = ex;
  a.ey = ey;
  a.k = k;
  a.vis = vis > 0.01 ? Math.min(1, vis) : 0;
}
function win(a: Pane, x: number, y: number, w: number, h: number, k: number, vis: number): void {
  a.x = x;
  a.y = y;
  a.w = w;
  a.h = h;
  a.k = k;
  a.vis = vis > 0.01 ? Math.min(1, vis) : 0;
}
function hide(a: Hideout, x0: number, x1: number, rimY: number, k: number, vis: number): void {
  a.x0 = x0;
  a.x1 = x1;
  a.rimY = rimY;
  a.k = k;
  a.vis = vis > 0.01 ? Math.min(1, vis) : 0;
}

/** Whether a point is on screen (with a margin, px). */
function onScreen(s: Scene, x: number, y: number, m = 0): boolean {
  return x >= m && x <= s.cssW - m && y >= m && y <= s.cssH - m;
}

/** The start view's anchors: the corner shops, the churchyard, the railing, the mansion's belfry, the crag road. */
function town(s: Scene): void {
  const u = s.u;
  const shown = shopBox(s, 1).y0 < s.cssH;
  // The curio's chimney top (the raven's), its ridge (the cat's), its belvedere (the peeker's), its dormer.
  let p = shopPoint(s, 1, SHOP_SPOTS.chimney.x, SHOP_SPOTS.chimney.y);
  const k = p.k;
  at(A.curioChimney, p.x, p.y, k, shown && onScreen(s, p.x, p.y) ? 1 : 0, 0.04 * u * k);
  p = shopPoint(s, 1, SHOP_SPOTS.ridge.hx, SHOP_SPOTS.ridge.y);
  const hx = p.x;
  const hy = p.y;
  p = shopPoint(s, 1, SHOP_SPOTS.ridge.ex, SHOP_SPOTS.ridge.y);
  walk(A.curioRidge, hx, hy, p.x, p.y, k, shown && hy < s.cssH ? 1 : 0);
  p = shopPoint(s, 1, SHOP_SPOTS.belvedere.x0, SHOP_SPOTS.belvedere.y);
  const bx0 = p.x;
  const by = p.y;
  p = shopPoint(s, 1, SHOP_SPOTS.belvedere.x1, SHOP_SPOTS.belvedere.y);
  hide(A.belvedere, bx0, p.x, (by + p.y) / 2, k, shown && by < s.cssH ? 1 : 0);
  paneOf(s, A.curioDormer, 1, SHOP_SPOTS.dormer, k, shown);
  // The sweet shop's eave (the spider's), its gable window and attic vent.
  const sweetShown = shopBox(s, -1).y0 < s.cssH;
  p = shopPoint(s, -1, SHOP_SPOTS.eave.x, SHOP_SPOTS.eave.y);
  const ks = p.k;
  at(A.sweetEave, p.x, p.y, ks, sweetShown && p.y < s.cssH ? 1 : 0, Math.max(0, p.y + u * 0.08 > s.groundY ? s.groundY - u * 0.14 - p.y : u * 0.08));
  paneOf(s, A.sweetGable, -1, SHOP_SPOTS.gable, ks, sweetShown);
  const v = SHOP_SPOTS.vent;
  p = shopPoint(s, -1, v.x, v.y);
  win(A.sweetVent, p.x - v.r * u * ks * 0.9, p.y - v.r * u * ks * 0.9, v.r * u * ks * 1.8, v.r * u * ks * 1.8, ks, sweetShown && p.y < s.cssH ? 1 : 0);
  // The cage's floor (the skeletal bird's).
  p = cagePerch(s);
  at(A.cageBird, p.x, p.y, p.k, shown && p.y < s.cssH ? 1 : 0, 0.03 * u * p.k);
  // The churchyard's ghost stones.
  for (let i = 0; i < GHOST_STONES.length; i++) {
    const st = GHOST_STONES[i]!;
    const q = spot(s, st.X, st.z);
    const a = i === 0 ? A.cross : A.slab;
    at(a, q.x, q.y - st.h * u * q.k * 0.4, q.k, q.y - st.h * u * q.k < s.cssH ? 1 : 0, 0.034 * u * q.k);
  }
  // The railing: the rat's run from behind the right bale to behind the left; its webs (spiders).
  const band = bandTop(s);
  const ry = railTop(s);
  walk(A.rail, s.cssW / 2 + 0.4 * u, ry, s.cssW / 2 - 0.4 * u, ry, 1.6, band !== null && ry < s.cssH ? 1 : 0);
  at(A.railWebL, s.cssW / 2 - 0.36 * u, ry - u * 0.004, 1.6, band !== null && ry < s.cssH ? 1 : 0, u * 0.03);
  at(A.railWebR, s.cssW / 2 + 0.36 * u, ry - u * 0.004, 1.6, band !== null && ry < s.cssH ? 1 : 0, u * 0.03);
  // The mansion's belfry (bats) and the road up its crag (the ghostly carriage).
  const m = mansionAt(s);
  at(A.belfry, m.belfryX, m.belfryY, 0.4, m.topY < s.cssH ? 1 : 0, 0.04 * u);
  const r = cragRoad(s);
  const R = A.cragRoad;
  R.x0 = r.x0;
  R.y0 = r.y0;
  R.xm = r.xm;
  R.ym = r.ym;
  R.x1 = r.x1;
  R.y1 = r.y1;
  R.k = r.k;
  R.k1 = r.k * 0.85;
  R.vis = r.y0 < s.cssH && r.y1 > 0 ? 1 : 0;
}

/** A shop window's pane on screen (from its corners in shop units), shrunk a hair inside its frame. */
function paneOf(s: Scene, a: Pane, side: -1 | 1, w: { x0: number; y0: number; x1: number; y1: number }, k: number, shown: boolean): void {
  let p = shopPoint(s, side, w.x0, w.y1);
  const ax = p.x;
  const ay = p.y;
  p = shopPoint(s, side, w.x1, w.y0);
  const inset = Math.max(1, s.u * 0.002);
  win(a, Math.min(ax, p.x) + inset, Math.min(ay, p.y) + inset, Math.abs(p.x - ax) - inset * 2, Math.abs(p.y - ay) - inset * 2, k, shown && ay < s.cssH ? 1 : 0);
}

/** Over the rooftops: the hill cemetery's stones and trees. */
function hillside(s: Scene): void {
  const u = s.u;
  cemeteryAt(s);
  const c = CEMETERY_AT;
  for (let i = 0; i < HILL.length; i++) {
    const st = c.stones[i]!;
    at(HILL[i]!, st.x, st.y - st.h * 0.4, c.k, st.shown && onScreen(s, st.x, st.y) ? c.vis : 0, 0.05 * u * c.k);
  }
  const bL = c.boughs[0]!;
  const bR = c.boughs[1]!;
  at(A.hillBoughL, bL.x, bL.y, c.k, bL.shown && onScreen(s, bL.x, bL.y) ? c.vis : 0, 0.03 * u * c.k);
  at(A.hillBoughR, bR.x, bR.y, c.k, bR.shown && onScreen(s, bR.x, bR.y) ? c.vis : 0, 0.03 * u * c.k);
  at(A.hillTreeL, bL.x, bL.y + u * 0.004, c.k, A.hillBoughL.vis, u * 0.04);
  at(A.hillTreeR, bR.x, bR.y + u * 0.004, c.k, A.hillBoughR.vis, u * 0.04);
  villageAt(s, toneOf(s));
}

/** The gothic skyline and the storm: the crooked roofs, the near spire, the chimney stack, the cathedral, the bell tower. */
function skyline(s: Scene): void {
  const u = s.u;
  roofsAt(s);
  const R = ROOFS_AT;
  walk(A.roofsRidge, R.ridge.hx, R.ridge.hy, R.ridge.ex, R.ridge.ey, R.k, R.vis);
  win(A.roofsWindow, R.pane.x, R.pane.y - R.pane.h * 0.8, R.pane.w, R.pane.h * 0.8, R.k, R.vis);
  win(A.roofsAttic, R.dark.x, R.dark.y - R.dark.h, R.dark.w, R.dark.h, R.k, R.vis);
  at(A.roofsChimney, R.chimney.x, R.chimney.y, R.k, R.vis, 0.05 * u * R.k);
  at(A.roofsGargoyle, R.gargoyle.x, R.gargoyle.y, R.k, R.vis, u * 0.06);
  at(A.roofsCage, R.cage.x, R.cage.y + 0.03 * R.k * u, R.k, R.vis, 0.02 * u * R.k);
  hide(A.roofsHide, R.hide.x0, R.hide.x1, R.hide.y, R.k, R.vis);
  nearSpireAt(s);
  const sp = NEAR_AT.spire;
  at(A.spireVane, sp.x, sp.y, sp.k, sp.vis > 0.01 && onScreen(s, sp.x, sp.y) && sp.y > s.cssH * 0.2 ? sp.vis : 0, 0.05 * u * sp.k);
  chimneyStackAt(s);
  const P = NEAR_AT.pots;
  at(A.stackPot, P.x, P.y, P.k, P.vis, 0.05 * u * P.k);
  hide(A.stackHide, P.hx0, P.hx1, P.hy, P.k, P.vis);
  cathedralAt(s);
  const C = CATHEDRAL_BOX;
  at(A.cathedralSpire, C.spireL.x, C.spireL.y + u * 0.02, 0.3, C.vis && C.spireL.y > s.cssH * 0.2 && C.spireL.y < s.cssH ? C.vis : 0, 0.04 * u);
  bellTowerAt(s);
  const B = STORM_AT.bell;
  const bOn = B.vis > 0.01 && B.roostY > s.cssH * 0.2 && B.roostY < s.cssH ? B.vis : 0;
  at(A.bellRoost, B.roostX, B.roostY, B.k, bOn, 0.04 * u);
  at(A.bellGargoyleL, B.gl.x, B.gl.y, B.k, bOn, 0.05 * u * B.k);
  at(A.bellGargoyleR, B.gr.x, B.gr.y, B.k, bOn, 0.05 * u * B.k);
  at(A.bellWebL, B.webL.x, B.webL.y, B.k, bOn, u * 0.05);
  at(A.bellWebR, B.webR.x, B.webR.y, B.k, bOn, u * 0.05);
}

/** The drowned hollow's set pieces (drowned.ts): which of each kind is shown (scratch), -1 for none. */
const SHOWN_PIECE: Record<PieceKind, number> = { chapel: -1, lighthouse: -1, oak: -1, ship: -1 };

/**
 * The drowned hollow's set pieces: the chapel's cross (the raven), its belfry (bats) and the web
 * under its arch (a spider); the lighthouse's gallery rail and the ship's masthead (the raven), its
 * crow's nest (a skeleton peeking); the oak's fork (the raven) and a bough (a skeletal bird). Drawn
 * over the mist floor (SLOT.mist); a spot sunk below where its piece is cut by the mist is out of sight.
 */
function hollowPieces(s: Scene): void {
  const u = s.u;
  SHOWN_PIECE.chapel = SHOWN_PIECE.lighthouse = SHOWN_PIECE.oak = SHOWN_PIECE.ship = -1;
  for (let i = 0; i < PIECES.length; i++) if (pieceAt(s, i) && SHOWN_PIECE[PIECES[i]!.kind] < 0) SHOWN_PIECE[PIECES[i]!.kind] = i;
  const point = (a: Perch, i: number, x: number, y: number, k: number, room: number): void => {
    if (i < 0) {
      a.vis = 0;
      return;
    }
    const P = PIECE_AT[i]!;
    const p = piecePoint(i, x, y);
    at(a, p.x, p.y, k, p.y < P.clip - room * 0.5 ? P.vis : 0, room);
  };
  let i = SHOWN_PIECE.chapel;
  let k = i < 0 ? 1 : (PIECE_AT[i]!.U / u) * 0.5;
  point(A.chapelCross, i, CHAPEL_SPOTS.cross.x, CHAPEL_SPOTS.cross.y, k, 0.05 * u * k);
  point(A.chapelBelfry, i, CHAPEL_SPOTS.belfry.x, CHAPEL_SPOTS.belfry.y, k, 0.04 * u);
  point(A.chapelWeb, i, CHAPEL_SPOTS.web.x, CHAPEL_SPOTS.web.y, k, 0.05 * u);
  if (i >= 0) {
    // The great lancet's lower part, where its curtains hang (a shadow passes behind them).
    const P = PIECE_AT[i]!;
    const L = CHAPEL_SPOTS.lancet;
    const a = piecePoint(i, L.x0, L.y1);
    const ax = a.x;
    const ay = a.y;
    const b = piecePoint(i, L.x1, L.y0);
    const bottom = Math.min(b.y, P.clip - u * 0.01);
    win(A.chapelLancet, ax, ay, b.x - ax, bottom - ay, k, bottom - ay > u * 0.03 ? P.vis : 0);
  } else A.chapelLancet.vis = 0;
  i = SHOWN_PIECE.lighthouse;
  k = i < 0 ? 1 : (PIECE_AT[i]!.U / u) * 0.5;
  point(A.lightRail, i, LIGHT_SPOTS.rail.x, LIGHT_SPOTS.rail.y, k, 0.05 * u * k);
  i = SHOWN_PIECE.ship;
  k = i < 0 ? 1 : (PIECE_AT[i]!.U / u) * 0.5;
  if (i >= 0) pieceSpots(s, i);
  point(A.shipMast, i, SHIP_SPOTS.mast.x, SHIP_SPOTS.mast.y, k, 0.05 * u * k);
  if (i >= 0) {
    const a = piecePoint(i, SHIP_SPOTS.nest.x0, SHIP_SPOTS.nest.y);
    const x0 = a.x;
    const y0 = a.y;
    const b = piecePoint(i, SHIP_SPOTS.nest.x1, SHIP_SPOTS.nest.y);
    hide(A.shipNest, Math.min(x0, b.x), Math.max(x0, b.x), Math.max(y0, b.y), k, PIECE_AT[i]!.vis);
  } else A.shipNest.vis = 0;
  i = SHOWN_PIECE.oak;
  k = i < 0 ? 1 : (PIECE_AT[i]!.U / u) * 0.5;
  if (i >= 0) {
    pieceSpots(s, i);
    const P = PIECE_AT[i]!;
    at(A.oakFork, OAK_AT.fork.x, OAK_AT.fork.y, k, OAK_AT.fork.y < P.clip ? P.vis : 0, 0.05 * u * k);
    at(A.oakBough, OAK_AT.bough.x, OAK_AT.bough.y, k, OAK_AT.bough.y < P.clip ? P.vis : 0, 0.03 * u * k);
  } else A.oakFork.vis = A.oakBough.vis = 0;
}

/**
 * Which isles are on screen this frame (scratch), and whether each holds its kind's anchors: the
 * first of its kind does, and a twin in the same lane (an anchor keeps to its lane). Made on first
 * use (isles.ts and this module import each other).
 */
let SHOWN: Uint8Array | null = null;
let HOLDS: readonly boolean[] = [];

/** Whether another isle holding the same kind's anchors as isle i is on screen (then they are that one's). */
function twinShown(shown: Uint8Array, i: number): boolean {
  for (let j = 0; j < ISLES.length; j++) if (j !== i && shown[j] && HOLDS[j] && ISLES[j]!.kind === ISLES[i]!.kind) return true;
  return false;
}

/**
 * The isles: each isle's spots (they come round with the loop). Isles of one kind in one lane share
 * its anchors (the one on screen holds them); a twin in the other lane has none.
 */
function islands(s: Scene): void {
  const u = s.u;
  if (!SHOWN) {
    SHOWN = new Uint8Array(ISLES.length);
    HOLDS = ISLES.map((it) => it.side === ISLES.find((o) => o.kind === it.kind)!.side);
  }
  const on = SHOWN;
  for (let i = 0; i < ISLES.length; i++) on[i] = isleAt(s, i) ? 1 : 0;
  for (let i = 0; i < ISLES.length; i++) {
    const shown = on[i] === 1;
    if (!HOLDS[i] || (!shown && twinShown(on, i))) continue;
    const I = ISLE_AT[i]!;
    const vis = shown ? I.vis : 0;
    const k = I.k;
    switch (ISLES[i]!.kind) {
      case "cottage":
        walk(A.cottageRidge, I.ridge.hx, I.ridge.hy, I.ridge.ex, I.ridge.ey, k, vis);
        win(A.cottageWindow, I.pane.x, I.pane.y, I.pane.w, I.pane.h, k, vis);
        at(A.cottageTree, I.perch.x, I.perch.y, k, vis, 0.05 * u * k);
        at(A.cottageBough, I.bough.x, I.bough.y, k, vis, 0.03 * u * k);
        at(A.cottageTip, I.tip.x, I.tip.y, k, vis, u * 0.08);
        hide(A.cottageHide, I.ridge.hx, I.ridge.ex, Math.max(I.ridge.hy, I.ridge.ey), k, vis);
        break;
      case "graves":
        at(A.gravesTree, I.perch.x, I.perch.y, k, vis, 0.05 * u * k);
        at(A.gravesBough, I.bough.x, I.bough.y, k, vis, 0.03 * u * k);
        at(A.gravesTip, I.tip.x, I.tip.y, k, vis, u * 0.08);
        at(A.isleStone0, I.stones[0]!.x, I.stones[0]!.y, k, vis, 0.05 * u * k);
        at(A.isleStone1, I.stones[1]!.x, I.stones[1]!.y, k, vis, 0.05 * u * k);
        break;
      case "door":
        win(A.skyDoor, I.pane.x, I.pane.y, I.pane.w, I.pane.h, k, I.pane.on ? vis : 0);
        break;
      case "hanging":
        win(A.hangingWindow, I.pane.x, I.pane.y, I.pane.w, I.pane.h, k, vis);
        break;
      case "bridge": {
        const R = A.loopBridge;
        R.x0 = I.road.x0;
        R.y0 = I.road.y0;
        R.xm = I.road.xm;
        R.ym = I.road.ym;
        R.x1 = I.road.x1;
        R.y1 = I.road.y1;
        R.k = k * 0.5;
        R.k1 = k * 0.5;
        R.vis = vis > 0.01 ? vis : 0;
        break;
      }
      case "castle":
        at(A.castleRoost, I.roost.x, I.roost.y, k, vis && I.roost.y > s.cssH * 0.2 ? vis : 0, 0.04 * u);
        at(A.castleTip, I.perch.x, I.perch.y, k, vis && I.perch.y > s.cssH * 0.2 ? vis : 0, 0.05 * u * k);
        break;
    }
  }
}

/** Scratch: the stretches of a lane taken by scenery this frame (screen y, top and bottom), and how many. */
const TAKEN = new Float64Array(32);
let taken = 0;
function take(top: number, bottom: number, vis: number): void {
  if (vis > 0.01 && taken < TAKEN.length / 2) {
    TAKEN[taken * 2] = top;
    TAKEN[taken * 2 + 1] = bottom;
    taken++;
  }
}

/** The stretches of a lane its scenery takes this frame (into TAKEN), so drifting ghosts keep off them. */
function laneTaken(s: Scene, side: -1 | 1): void {
  taken = 0;
  const u = s.u;
  // Scenery standing out of the mist takes its lane from its top down into the mist.
  const sea = mistTop(s) + u * 0.03;
  for (let i = 0; i < ISLES.length; i++) if (ISLES[i]!.side === side) take(ISLE_AT[i]!.top - u * 0.01, ISLE_AT[i]!.bottom + u * 0.01, ISLE_AT[i]!.vis);
  if (side < 0) {
    for (let i = 0; i < PIECES.length; i++) take(PIECE_AT[i]!.top - u * 0.01, PIECE_AT[i]!.clip + u * 0.03, PIECE_AT[i]!.vis);
    take(ROOFS_AT.vane.y - u * 0.04, sea, ROOFS_AT.vis);
    take(NEAR_AT.pots.y - u * 0.03, sea, NEAR_AT.pots.vis);
  } else {
    take(CATHEDRAL_BOX.y0 - u * 0.01, sea, CATHEDRAL_BOX.vis);
    take(NEAR_AT.spire.y - u * 0.05, sea, NEAR_AT.spire.vis);
    take(STORM_AT.bell.top - u * 0.02, sea, STORM_AT.bell.vis);
    const m = mansionAt(s);
    take(m.topY - u * 0.02, sea, m.topY < s.cssH ? 1 : 0);
  }
}

/** The tallest stretch of [y0, y1] free of the lane's scenery (into GAP): it starts at y0 or where a taken stretch ends. */
const GAP = { y0: 0, y1: 0 };
function freeGap(y0: number, y1: number): typeof GAP {
  GAP.y0 = y0;
  GAP.y1 = y0;
  for (let c = -1; c < taken; c++) {
    const p = c < 0 ? y0 : TAKEN[c * 2 + 1]!;
    if (p < y0 || p >= y1) continue;
    let end = y1;
    let inside = false;
    for (let j = 0; j < taken; j++) {
      const a = TAKEN[j * 2]!;
      const b = TAKEN[j * 2 + 1]!;
      if (a <= p && p < b) inside = true;
      else if (a > p && a < end) end = a;
    }
    if (!inside && end - p > GAP.y1 - GAP.y0) {
      GAP.y0 = p;
      GAP.y1 = end;
    }
  }
  return GAP;
}

/** The free sky in each lane, clear of its scenery (and the deep sky behind the far spires). */
function sky(s: Scene, band: number): void {
  const u = s.u;
  const m = moonAt(s);
  const halo = m.y + m.r * HALO_REACH + u * 0.01;
  const floor = Math.min(mistTop(s), restLine(s)) - u * 0.02;
  const L = laneOf(s, -1);
  const lb = A.laneL;
  lb.x0 = L.x - L.w / 2;
  lb.x1 = L.x + L.w / 2;
  // (Once the mist has gathered, the free sky runs on down over its sea: a ghost may drift low over it.)
  const bottom = band >= 1 && mistTop(s) < s.cssH - u * 0.14 ? s.cssH - u * 0.02 : floor;
  laneTaken(s, -1);
  let g = freeGap(Math.max(halo, s.cssH * 0.2), Math.min(bottom, s.cssH - u * 0.02));
  lb.y0 = g.y0;
  lb.y1 = g.y1;
  lb.k = 0.6;
  lb.vis = band >= 1 && lb.y1 - lb.y0 > u * 0.12 ? 1 : 0;
  // Drawn after the mist when it lies over its sea, before it (among the near things) otherwise.
  lb.slot = lb.y1 > floor + u * 0.02 ? SLOT.mist : SLOT.near;
  const Rl = laneOf(s, 1);
  const rb = A.laneR;
  const mansion = mansionAt(s);
  rb.x0 = Rl.x - Rl.w / 2;
  rb.x1 = Rl.x + Rl.w / 2;
  laneTaken(s, 1);
  g = freeGap(s.cssH * 0.22, bottom);
  rb.y0 = g.y0;
  rb.y1 = g.y1;
  rb.k = 0.6;
  rb.vis = band >= 1 && rb.y1 - rb.y0 > u * 0.12 ? 1 : 0;
  rb.slot = rb.y1 > floor + u * 0.02 ? SLOT.mist : SLOT.near;
  const dr = A.deepR;
  dr.x0 = rb.x0;
  dr.x1 = rb.x1;
  dr.y0 = s.cssH * 0.22;
  dr.y1 = Math.min(floor, mansion.y);
  dr.k = 0.3;
  dr.vis = band >= 3 && dr.y1 - dr.y0 > u * 0.12 ? 1 : 0;
  const dl = A.deepL;
  dl.x0 = lb.x0;
  dl.x1 = lb.x1;
  dl.y0 = Math.max(halo, s.cssH * 0.2);
  dl.y1 = Math.min(floor, s.cssH - u * 0.02);
  dl.k = 0.3;
  dl.vis = band >= 4 && dl.y1 - dl.y0 > u * 0.12 ? STAGE.loopIn : 0;
}

// ---------------------------------------------------------------- the stage

/** The cache's key: the frame it was built for. */
const KEY = { t: NaN, alt: NaN, w: NaN, h: NaN, rise: NaN, ground: NaN, land: NaN, still: false };

/** Where the cast performs this frame (cached for the frame: every slot asks). The result is reused scratch. */
export function stageAt(s: Scene): Readonly<Stage> {
  const land = s.sinceLand ?? Infinity;
  const still = s.still === true;
  if (KEY.t === s.t && KEY.alt === s.altitude && KEY.w === s.cssW && KEY.h === s.cssH && KEY.rise === s.rise && KEY.ground === s.groundY && KEY.land === land && KEY.still === still) return STAGE;
  KEY.t = s.t;
  KEY.alt = s.altitude;
  KEY.w = s.cssW;
  KEY.h = s.cssH;
  KEY.rise = s.rise;
  KEY.ground = s.groundY;
  KEY.land = land;
  KEY.still = still;
  const tone = toneOf(s);
  const lvl = level(s);
  STAGE.band = bandOf(lvl);
  STAGE.loopIn = smooth(STRETCH.E, STRETCH.E + LOOP_IN, lvl);
  const m = moonAt(s, tone);
  STAGE.moon.x = m.x;
  STAGE.moon.y = m.y;
  STAGE.moon.r = m.r;
  STAGE.ring = tone.ring;
  STAGE.storm = tone.storm;
  STAGE.flash = flashAt(s);
  town(s);
  hillside(s);
  skyline(s);
  islands(s);
  hollowPieces(s);
  sky(s, STAGE.band);
  underMist(s);
  inView(s);
  return STAGE;
}

/**
 * Only anchors whose performer has room on screen, below the HUD, are offered: a piece passing by
 * in a lane (an isle coming down from above, the bell tower) may be on screen while a perch on it
 * is not yet.
 */
function inView(s: Scene): void {
  const top = s.cssH * 0.2;
  const W = s.cssW;
  const H = s.cssH;
  for (const p of POINTS) {
    for (let i = 0; i < p.n; i++) {
      const a = p.items[i]!;
      if (!a.vis) continue;
      const eave = p === STAGE.eaves;
      const up = eave ? 0 : a.room * (p === STAGE.stones ? 2.6 : 1.6);
      const down = eave ? a.room : p === STAGE.roosts ? a.room * 0.5 : 0;
      const half = eave ? s.u * 0.012 : a.room;
      if (a.x - half < 1 || a.x + half > W - 1 || a.y - up < top || a.y + down > H - 1) a.vis = 0;
    }
  }
  for (let i = 0; i < STAGE.panes.n; i++) {
    const a = STAGE.panes.items[i]!;
    if (a.vis && (a.x < 1 || a.x + a.w > W - 1 || a.y < top || a.y + a.h > H - 1)) a.vis = 0;
  }
  for (let i = 0; i < STAGE.hideouts.n; i++) {
    const a = STAGE.hideouts.items[i]!;
    if (a.vis && (a.x0 < 1 || a.x1 > W - 1 || a.rimY - s.u * 0.035 * a.k < top || a.rimY > H - 1)) a.vis = 0;
  }
  for (const p of WALKS) {
    for (let i = 0; i < p.n; i++) {
      const a = p.items[i]!;
      const y0 = Math.min(a.hy, a.ey) - s.u * 0.04 * a.k;
      if (a.vis && (Math.min(a.hx, a.ex) < 1 || Math.max(a.hx, a.ex) > W - 1 || y0 < top || Math.max(a.hy, a.ey) > H - 1)) a.vis = 0;
    }
  }
  for (let i = 0; i < STAGE.roads.n; i++) {
    const a = STAGE.roads.items[i]!;
    if (!a.vis) continue;
    // The curve's extremes (sampled), with the carriage's height above it.
    for (let j = 0; j <= 8; j++) {
      const f = j / 8;
      const x = (1 - f) * (1 - f) * a.x0 + 2 * (1 - f) * f * a.xm + f * f * a.x1;
      const y = (1 - f) * (1 - f) * a.y0 + 2 * (1 - f) * f * a.ym + f * f * a.y1;
      if (x < 1 || x > W - 1 || y - s.u * 0.02 * a.k < top || y > H - 1) {
        a.vis = 0;
        break;
      }
    }
  }
}

/** Anchors drawn before the mist floor that it has swallowed are out of sight. */
function underMist(s: Scene): void {
  const top = mistTop(s) + s.u * 0.01;
  if (top > s.cssH) return;
  for (const p of POINTS) for (let i = 0; i < p.n; i++) sink(p.items[i]!, p.items[i]!.y, top);
  for (const p of WALKS) for (let i = 0; i < p.n; i++) sink(p.items[i]!, Math.min(p.items[i]!.hy, p.items[i]!.ey), top);
  for (let i = 0; i < STAGE.panes.n; i++) sink(STAGE.panes.items[i]!, STAGE.panes.items[i]!.y, top);
  for (let i = 0; i < STAGE.hideouts.n; i++) sink(STAGE.hideouts.items[i]!, STAGE.hideouts.items[i]!.rimY, top);
  for (let i = 0; i < STAGE.roads.n; i++) sink(STAGE.roads.items[i]!, Math.min(STAGE.roads.items[i]!.y0, STAGE.roads.items[i]!.y1), top);
}
function sink(a: Anchor, y: number, top: number): void {
  if (a.vis && a.slot !== SLOT.mist && a.slot !== SLOT.front && y > top) a.vis = 0;
}

/** The pools of points and of walks, for passes over them. */
const POINTS = [STAGE.chimneys, STAGE.eaves, STAGE.stones, STAGE.roosts, STAGE.boughs] as const;
const WALKS = [STAGE.ridges, STAGE.rails] as const;

/** Every anchor (for the tests): name -> anchor. */
export const ANCHORS: Readonly<Record<string, Readonly<Perch | Ridge | Pane | Hideout | Road | LaneBox>>> = A;

import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  AWNING_B,
  BRICK,
  BUTTER,
  CAFE_LIT,
  CAKE,
  CREAM,
  DECK_SHADOW,
  DOOR,
  EAVE_SHADOW,
  GOLD,
  GREEN,
  ICING,
  INK,
  IRON,
  LANE_LINE,
  LILAC,
  MINT,
  PANE,
  PANE_DARK,
  PEACH,
  PURPLE,
  ROOF,
  ROSE,
  SHUTTER,
  SIDEWALK,
  SIGN_BLUE,
  STREET,
  STREET_FAR,
  TEAL,
  THREE,
  TIN,
  WHITE,
  WINDOW_LIT,
  WINDOW_SHINE,
  type Shades,
} from "./colors";
import { cafeRegular } from "./onlookers";
import { deckY, GALLERY, inkW, SIDEWALK as SIDEWALK_DOWN, STOREY, streetLevel } from "./place";
import { archPath, block, fleurPath } from "./shapes";
import { banner, beadStrings, beadsOn, bigMask, bunting, buntings, FERNS, frieze, friezeDots, friezePath, hangingFerns, lantern, LANTERN_SPOTS, paperLanterns, postsLit, postsPath, RAILS, railing, railings } from "./trim";
import type { Tone } from "./tone";

export { deckY };

// The street behind the reviewing stand, Bourbon Street on parade day. On the left, the corner
// house: four storeys of red brick (the upper two a little lower, so its roof stays under the
// sun's halo on every screen) behind three tiers of lacy cast-iron galleries: ferns in hanging
// baskets swaying under the top one, paper lanterns rocking on a string under the middle one,
// strings of beads looped over every rail and swinging, purple, green and gold bunting on the
// rails, a long Carnival banner fluttering from the canopy, a big feathered mask hung under it, gas
// lanterns flickering at the door; the family tosses beads from the first gallery (balcony.ts),
// and below it the king-cake stand stands on the sidewalk. On the right, the corner café, two
// storeys: below, a lilac front under a purple-and-cream striped awning with beignets in the
// window and a table out front; above, an iron balcony with ferns, beads, bunting and a big
// green mask; and at the corner a gas lamppost with a street sign, beads on its arm and a masked
// banner. Between them, across the way behind the tower, gas lamps on the far sidewalk and the
// row of low cottages (rows.ts) let the Quarter step back to the cathedral and the river. On
// wider screens the street runs on with more galleried houses. Everything here is near: flat
// fills, a lit edge and a shade, one ink weight, drawn in batches (a fill or a stroke per color
// across all of a house's galleries); everything that moves keeps out of the tower's column. By
// night the windows and the lanterns glow.
//
// Positions are in u from the screen center, heights in u up from the far sidewalk's back edge
// (streetLevel), where the houses stand.

/** A gallery rail's height (u). */
const RAIL_H = 0.034;

/** What a townhouse is made of. */
interface House {
  /** Its left and right edges (u from center). */
  x0: number;
  x1: number;
  storeys: number;
  /** Each floor's height above the sidewalk (u), the roof's last; evenly STOREY apart if left out. */
  floors?: readonly number[];
  wall: Shades;
  trim: Shades;
  /** The storeys (from 1) that carry a gallery; the top one gets a canopy roof if it is the top storey. */
  galleries: readonly number[];
  /** Brick courses on the wall. */
  brick: boolean;
  /** Hung with beads, bunting and ferns (and moving: only where it keeps out of the column). */
  dressed: boolean;
  /** How many bays across. */
  bays: number;
  /** A gable, parapet or hip roof above the top storey (a canopy gallery covers it). */
  roof: "parapet" | "hip" | "canopy";
  /** The gallery strung with paper lanterns instead of hung with ferns, if any. */
  lanterns?: number;
}

/** The galleried corner house on the left. */
const CORNER: House = { ...GALLERY, wall: BRICK, trim: SHUTTER, galleries: [1, 2, 3], brick: true, dressed: true, bays: 3, roof: "canopy", lanterns: 2 };

/** More houses beyond a phone's edges, repeating outward on wider screens (each only where it fits whole): plainer, still galleried. */
const BEYOND: readonly House[] = [
  // The first on the left keeps a step from the corner house, so its gallery never tucks under the corner's.
  { x0: -0.78, x1: -0.51, storeys: 3, wall: ROSE, trim: TEAL, galleries: [1, 2], brick: false, dressed: true, bays: 3, roof: "parapet" },
  { x0: -1.03, x1: -0.78, storeys: 3, wall: BUTTER, trim: SHUTTER, galleries: [1], brick: false, dressed: true, bays: 3, roof: "hip" },
  { x0: 0.52, x1: 0.78, storeys: 2, wall: MINT, trim: DOOR, galleries: [1], brick: false, dressed: true, bays: 3, roof: "hip" },
  { x0: 0.78, x1: 1.04, storeys: 3, wall: PEACH, trim: SHUTTER, galleries: [1, 2], brick: false, dressed: true, bays: 3, roof: "parapet" },
];
/** The row's span (u from center) that BEYOND covers; further out it repeats. */
const BEYOND_SPAN = 1.04;

/** The café on the right: its edges, its two storeys' height (the café below, a balcony above) and its parapet. */
const CAFE_X0 = 0.274;
const CAFE_X1 = 0.416;
const CAFE_H = 0.24;
const PARAPET_H = 0.022;
/** The lamppost at the corner: its center (u), its height above the sidewalk. */
const LAMP_X = 0.476;
const LAMP_H = 0.25;
/** The king-cake stand on the sidewalk below the corner house: its edges. */
const CART_X0 = -0.37;
const CART_X1 = -0.276;
const CART_H = 0.1;
/** The gas lamps on the far sidewalk across from the stand (u from center): still, behind the tower. */
const STREET_LAMPS = [-0.215, 0.215] as const;

/** Night: how lit the windows and lanterns are (0 by day). */
function litOf(tone: Tone | undefined): number {
  return tone ? tone.lit : 0;
}

// ---------------------------------------------------------------- the ground

/** The ground from the row of cottages down: the far ground, the sidewalk the houses stand on, and the roadway in front. */
export function streetGround(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hz = s.horizonY;
  const sl = streetLevel(s);
  if (hz > s.cssH) return;
  // The roadway first, from the houses' feet down; the far ground and the sidewalk over it (each
  // fill runs on under the next, so no seam is left half painted).
  const walk = SIDEWALK_DOWN * u;
  ctx.fillStyle = STREET;
  ctx.fillRect(0, sl, s.cssW, s.cssH - sl + 1);
  ctx.fillStyle = STREET_FAR;
  ctx.fillRect(0, hz - u * 0.02, s.cssW, Math.max(0, sl - hz) + u * 0.03);
  // The far sidewalk: pale flags with a lit back edge and a curb.
  ctx.fillStyle = SIDEWALK.body;
  ctx.fillRect(0, sl, s.cssW, walk);
  ctx.fillStyle = SIDEWALK.light;
  ctx.fillRect(0, sl, s.cssW, Math.max(1, u * 0.004));
  ctx.fillStyle = SIDEWALK.shade;
  ctx.fillRect(0, sl + walk - u * 0.007, s.cssW, u * 0.007);
  ctx.beginPath();
  for (let x = ((s.cssW / 2) % (u * 0.06)) - u * 0.06; x < s.cssW; x += u * 0.06) ctx.rect(x, sl + u * 0.004, Math.max(1, u * 0.002), walk - u * 0.011);
  ctx.fill();
  // The roadway's lane line, faded under the confetti, and confetti and lost beads, in the colors of the season: still.
  ctx.fillStyle = LANE_LINE;
  ctx.fillRect(0, sl + walk + u * 0.004, s.cssW, Math.max(1, u * 0.004));
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.body;
    ctx.beginPath();
    for (let i = c; i < 60; i += 3) {
      const X = ((i * 0.618) % 1) - 0.5;
      const d = 0.012 + ((i * 0.377) % 1) * 0.36;
      const y = sl + walk + d * u;
      if (y > s.cssH) continue;
      const x = s.cssW / 2 + X * (s.cssW / u) * u;
      if (i % 5 === 0) circle(ctx, x, y, u * 0.004);
      else ctx.rect(x - u * 0.005, y, u * 0.01, u * 0.0045);
    }
    ctx.fill();
  }
}

/** The gas lamps on the far sidewalk across the way, behind the tower: still (their flames never flicker there), glowing by night. */
export function streetLamps(ctx: Ctx, s: Scene, tone?: Tone): void {
  const u = s.u;
  const lw = inkW(s);
  const foot = streetLevel(s) + SIDEWALK_DOWN * u * 0.7;
  if (foot - u * 0.2 > s.cssH) return;
  ctx.beginPath();
  for (const X of STREET_LAMPS) {
    const x = s.cssW / 2 + X * u;
    ctx.rect(x - u * 0.0035, foot - u * 0.15, u * 0.007, u * 0.15);
    ctx.rect(x - u * 0.009, foot - u * 0.022, u * 0.018, u * 0.022);
  }
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  for (const X of STREET_LAMPS) lantern(ctx, s.cssW / 2 + X * u, foot - u * 0.19, u * 0.026, litOf(tone), 0, 0, lw, false);
}

// ---------------------------------------------------------------- townhouses

/** The height of floor `f` of a house above the sidewalk (u). */
function floorAt(h: House, f: number): number {
  return h.floors ? h.floors[f]! : f * STOREY;
}

/** Scratch: the posts' xs for a house. */
const POSTS: number[] = [];

/** The places of a house's gallery posts (screen px), one per bay edge, inset a little. */
function postsOf(x0: number, x1: number, bays: number, u: number): number[] {
  POSTS.length = 0;
  for (let i = 0; i <= bays; i++) POSTS.push(x0 + u * 0.008 + ((x1 - x0 - u * 0.016) * i) / bays);
  return POSTS;
}

/** How far above floor `f` a window's top is, and how tall it is (u): most of the storey's height, under its ceiling. */
function winTop(h: House, f: number): number {
  return (floorAt(h, f + 1) - floorAt(h, f)) * 0.7;
}
function winH(h: House, f: number): number {
  return (floorAt(h, f + 1) - floorAt(h, f)) * 0.58;
}

/**
 * The openings of a house's storeys: arched French doors on the ground floor, tall shuttered
 * windows above, one per bay, all of a kind in one pass. Lit warm by night (`lit`).
 */
function openings(ctx: Ctx, u: number, x0: number, x1: number, foot: number, h: House, lit: number, lw: number, from = 0): void {
  const w = x1 - x0;
  const bw = w / h.bays;
  const ow = Math.min(u * 0.028, bw * 0.4);
  const sw = ow * 0.42;
  // Glass: dark by day (the panes' shine on top), warm by night.
  ctx.beginPath();
  for (let f = from; f < h.storeys; f++) {
    for (let i = 0; i < h.bays; i++) {
      const x = x0 + bw * (i + 0.5);
      if (f === 0) archPath(ctx, x - ow / 2, foot, ow, u * 0.088);
      else ctx.rect(x - ow / 2, foot - floorAt(h, f) * u - winTop(h, f) * u, ow, winH(h, f) * u);
    }
  }
  ctx.fillStyle = lit > 0.3 ? WINDOW_LIT : PANE_DARK;
  ctx.fill();
  ctx.fillStyle = lit > 0.3 ? WINDOW_SHINE : PANE;
  ctx.globalAlpha = lit > 0.3 ? 0.8 : 0.85;
  ctx.beginPath();
  for (let f = from; f < h.storeys; f++) {
    for (let i = 0; i < h.bays; i++) {
      const x = x0 + bw * (i + 0.5);
      const top = f === 0 ? foot - u * 0.088 : foot - floorAt(h, f) * u - winTop(h, f) * u;
      ctx.rect(x - ow * 0.38, top + ow * (f === 0 ? 0.5 : 0.12), ow * 0.3, u * (f === 0 ? 0.03 : 0.03));
      ctx.rect(x + ow * 0.08, top + ow * (f === 0 ? 0.5 : 0.12), ow * 0.3, u * (f === 0 ? 0.03 : 0.03));
    }
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // The shutters folded back either side, and their slats.
  ctx.beginPath();
  for (let f = 1; f < h.storeys; f++) {
    for (let i = 0; i < h.bays; i++) {
      const x = x0 + bw * (i + 0.5);
      const top = foot - floorAt(h, f) * u - winTop(h, f) * u;
      ctx.rect(x - ow / 2 - sw, top, sw, winH(h, f) * u);
      ctx.rect(x + ow / 2, top, sw, winH(h, f) * u);
    }
  }
  ctx.fillStyle = h.trim.body;
  ctx.fill();
  ctx.fillStyle = h.trim.shade;
  ctx.beginPath();
  for (let f = 1; f < h.storeys; f++) {
    for (let i = 0; i < h.bays; i++) {
      const x = x0 + bw * (i + 0.5);
      const top = foot - floorAt(h, f) * u - winTop(h, f) * u;
      const wh = winH(h, f) * u;
      for (let k = 1; k < 6; k++) {
        ctx.rect(x - ow / 2 - sw * 0.85, top + (wh * k) / 6, sw * 0.7, Math.max(1, u * 0.0018));
        ctx.rect(x + ow / 2 + sw * 0.15, top + (wh * k) / 6, sw * 0.7, Math.max(1, u * 0.0018));
      }
    }
  }
  ctx.fill();
  // One ink pass round the glass and the shutters.
  ctx.beginPath();
  for (let f = from; f < h.storeys; f++) {
    for (let i = 0; i < h.bays; i++) {
      const x = x0 + bw * (i + 0.5);
      if (f === 0) {
        archPath(ctx, x - ow / 2, foot, ow, u * 0.088);
        continue;
      }
      const top = foot - floorAt(h, f) * u - winTop(h, f) * u;
      const wh = winH(h, f) * u;
      ctx.rect(x - ow / 2 - sw, top, ow + sw * 2, wh);
      ctx.moveTo(x - ow / 2, top);
      ctx.lineTo(x - ow / 2, top + wh);
      ctx.moveTo(x + ow / 2, top);
      ctx.lineTo(x + ow / 2, top + wh);
    }
  }
  ink(ctx, lw * 0.55, INK);
  if (from > 0) return;
  // Cream frames round the ground floor's arches (their keystones).
  ctx.fillStyle = CREAM.body;
  ctx.beginPath();
  for (let i = 0; i < h.bays; i++) {
    const x = x0 + bw * (i + 0.5);
    ctx.rect(x - u * 0.004, foot - u * 0.098, u * 0.008, u * 0.012);
  }
  ctx.fill();
}

/** The upper floors' shuttered windows of a house, from the storey whose floor is at `floor` up (one row), for a front that draws its own ground floor. */
function upperWindows(ctx: Ctx, u: number, x0: number, x1: number, floor: number, h: House, lit: number, lw: number): void {
  openings(ctx, u, x0, x1, floor + floorAt(h, 1) * u, { ...h, storeys: 2 }, lit, lw, 1);
}

/**
 * A townhouse: its wall (brick courses on the corner house), the openings, galleries on its
 * storeys (posts down to the sidewalk, lace friezes, decks, railings), the roof, and, if dressed,
 * the ferns, beads, bunting and lanterns. `onDeck` draws whoever stands on a gallery (its storey
 * and its deck's y), before the railings. `t` drives the dressing's sway (0 for a still house).
 * Drawn in batches, a fill or a stroke per color across all its galleries.
 */
function townhouse(ctx: Ctx, s: Scene, h: House, tone: Tone | undefined, t: number, onDeck?: (ctx: Ctx, f: number, deck: number) => void): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const x0 = cx + h.x0 * u;
  const x1 = cx + h.x1 * u;
  const w = x1 - x0;
  const foot = streetLevel(s);
  const top = foot - floorAt(h, h.storeys) * u;
  if (top - u * 0.1 > s.cssH || x1 < -u * 0.05 || x0 > s.cssW + u * 0.05) return;
  const lit = litOf(tone);
  const canopy = h.roof === "canopy";
  const roofY = canopy ? top - u * 0.012 : top;
  // The wall, lit down its left edge, shaded down its right, brick courses on brick.
  ctx.fillStyle = h.wall.body;
  ctx.fillRect(x0, top, w, foot - top);
  ctx.fillStyle = h.wall.light;
  ctx.fillRect(x0, top, u * 0.01, foot - top);
  ctx.fillStyle = h.wall.shade;
  ctx.fillRect(x1 - u * 0.01, top, u * 0.01, foot - top);
  if (h.brick) {
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    let row = 0;
    for (let y = top + u * 0.016; y < foot - u * 0.004; y += u * 0.016, row++) {
      ctx.rect(x0 + u * 0.01, y, w - u * 0.02, Math.max(1, u * 0.0016));
      if (row % 2) continue;
      for (let x = x0 + u * 0.03; x < x1 - u * 0.02; x += u * 0.077) ctx.rect(x, y - u * 0.016, Math.max(1, u * 0.0016), u * 0.016);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  openings(ctx, u, x0, x1, foot, h, lit, lw);
  // The decks' shadows on the wall, under each gallery and the canopy.
  ctx.fillStyle = DECK_SHADOW;
  ctx.beginPath();
  for (const f of h.galleries) ctx.rect(x0, foot - floorAt(h, f) * u, w, u * 0.022);
  if (canopy) ctx.rect(x0, top, w, u * 0.02);
  ctx.fill();
  // The roof, and the wall's outline with it.
  if (h.roof === "parapet") {
    ctx.fillStyle = CREAM.body;
    ctx.fillRect(x0 - u * 0.006, top - u * 0.024, w + u * 0.012, u * 0.024);
    ctx.fillStyle = h.trim.body;
    ctx.beginPath();
    for (let x = x0 + u * 0.008; x < x1 - u * 0.006; x += u * 0.018) ctx.rect(x, top - u * 0.016, u * 0.009, u * 0.009);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x0 - u * 0.006, top - u * 0.024, w + u * 0.012, u * 0.024);
  } else if (h.roof === "hip") {
    const rh = u * 0.06;
    const dx = (x0 + x1) / 2;
    ctx.fillStyle = ROOF.body;
    ctx.beginPath();
    ctx.moveTo(x0 - u * 0.01, top);
    ctx.lineTo(x0 + w * 0.16, top - rh);
    ctx.lineTo(x1 - w * 0.16, top - rh);
    ctx.lineTo(x1 + u * 0.01, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROOF.light;
    ctx.beginPath();
    ctx.moveTo(x0 + u * 0.002, top - u * 0.004);
    ctx.lineTo(x0 + w * 0.17, top - rh + u * 0.006);
    ctx.lineTo(x0 + w * 0.27, top - rh + u * 0.006);
    ctx.lineTo(x0 + w * 0.12, top - u * 0.004);
    ctx.closePath();
    ctx.fill();
    // A dormer.
    ctx.fillStyle = h.wall.body;
    ctx.fillRect(dx - u * 0.018, top - rh * 0.7, u * 0.036, rh * 0.7);
    ctx.fillStyle = ROOF.shade;
    ctx.beginPath();
    ctx.moveTo(dx - u * 0.024, top - rh * 0.68);
    ctx.lineTo(dx, top - rh * 0.98);
    ctx.lineTo(dx + u * 0.024, top - rh * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lit > 0.3 ? WINDOW_LIT : PANE;
    ctx.fillRect(dx - u * 0.009, top - rh * 0.56, u * 0.018, rh * 0.42);
    ctx.beginPath();
    ctx.moveTo(x0 - u * 0.01, top);
    ctx.lineTo(x0 + w * 0.16, top - rh);
    ctx.lineTo(x1 - w * 0.16, top - rh);
    ctx.lineTo(x1 + u * 0.01, top);
    ctx.closePath();
    ctx.moveTo(dx - u * 0.024, top - rh * 0.68);
    ctx.lineTo(dx, top - rh * 0.98);
    ctx.lineTo(dx + u * 0.024, top - rh * 0.68);
    ctx.rect(dx - u * 0.018, top - rh * 0.68, u * 0.036, rh * 0.68);
  } else {
    // The corner house: a parapet behind the top gallery's canopy, and two chimneys.
    ctx.fillStyle = BRICK.shade;
    ctx.beginPath();
    ctx.rect(x0 + u * 0.012, roofY - u * 0.03, u * 0.016, u * 0.03);
    ctx.rect(x1 - u * 0.03, roofY - u * 0.034, u * 0.016, u * 0.034);
    ctx.fill();
    ctx.fillStyle = CREAM.body;
    ctx.beginPath();
    ctx.rect(x0 + u * 0.009, roofY - u * 0.036, u * 0.022, u * 0.007);
    ctx.rect(x1 - u * 0.033, roofY - u * 0.04, u * 0.022, u * 0.007);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x0 + u * 0.012, roofY - u * 0.03, u * 0.016, u * 0.03);
    ctx.rect(x1 - u * 0.03, roofY - u * 0.034, u * 0.016, u * 0.034);
    ctx.rect(x0 + u * 0.009, roofY - u * 0.036, u * 0.022, u * 0.007);
    ctx.rect(x1 - u * 0.033, roofY - u * 0.04, u * 0.022, u * 0.007);
  }
  ctx.rect(x0, top, w, foot - top);
  ink(ctx, lw, INK);
  // The galleries' iron: posts (to the sidewalk under the first), friezes under the decks and the
  // canopy, the decks; all one fill, their lit edges one more, their outlines one stroke.
  const px = postsOf(x0, x1, h.bays, u);
  const g0 = Math.min(...h.galleries);
  const gTop = canopy ? roofY : foot - floorAt(h, Math.max(...h.galleries) + 1) * u + u * 0.03;
  const deckAt = (f: number) => foot - floorAt(h, f) * u;
  if (canopy) {
    ctx.fillStyle = TIN.body;
    ctx.beginPath();
    ctx.moveTo(x0 - u * 0.006, roofY + u * 0.006);
    ctx.lineTo(x0 - u * 0.002, roofY - u * 0.012);
    ctx.lineTo(x1 + u * 0.002, roofY - u * 0.012);
    ctx.lineTo(x1 + u * 0.006, roofY + u * 0.006);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = TIN.light;
    ctx.fillRect(x0, roofY - u * 0.01, w, u * 0.004);
  }
  ctx.fillStyle = IRON.body;
  ctx.beginPath();
  postsPath(ctx, u, px, gTop, foot);
  if (canopy) friezePath(ctx, u, x0 - u * 0.005, x1 + u * 0.005, roofY + u * 0.006, px);
  for (const f of h.galleries) {
    friezePath(ctx, u, x0 - u * 0.005, x1 + u * 0.005, deckAt(f) + u * 0.006, px);
    ctx.rect(x0 - u * 0.005, deckAt(f) - u * 0.002, w + u * 0.01, u * 0.008);
  }
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.beginPath();
  postsLit(ctx, u, px, gTop, foot, lw);
  if (canopy) friezeDots(ctx, u, x0 - u * 0.005, x1 + u * 0.005, roofY + u * 0.006, px);
  for (const f of h.galleries) friezeDots(ctx, u, x0 - u * 0.005, x1 + u * 0.005, deckAt(f) + u * 0.006, px);
  ctx.fill();
  ctx.fillStyle = CREAM.body;
  ctx.beginPath();
  for (const f of h.galleries) ctx.rect(x0 - u * 0.004, deckAt(f) - u * 0.001, w + u * 0.008, Math.max(1, u * 0.0025));
  ctx.fill();
  ctx.beginPath();
  for (const x of px) ctx.rect(x - u * 0.0031, gTop, u * 0.0062, foot - gTop);
  for (const f of h.galleries) ctx.rect(x0 - u * 0.005, deckAt(f) - u * 0.002, w + u * 0.01, u * 0.008);
  if (canopy) {
    ctx.moveTo(x0 - u * 0.006, roofY + u * 0.006);
    ctx.lineTo(x0 - u * 0.002, roofY - u * 0.012);
    ctx.lineTo(x1 + u * 0.002, roofY - u * 0.012);
    ctx.lineTo(x1 + u * 0.006, roofY + u * 0.006);
    ctx.closePath();
  }
  ink(ctx, lw * 0.6, INK);
  // Ferns hanging in the bays of every gallery but the first (the family's), swaying.
  if (h.dressed) {
    let n = 0;
    for (const f of h.galleries) {
      if ((f === g0 && onDeck) || f === h.lanterns) continue;
      const ceiling = f === h.storeys - 1 && canopy ? roofY + u * 0.012 : foot - floorAt(h, f + 1) * u + u * 0.008;
      for (let i = 0; i < h.bays && n < FERNS.length; i++) {
        const fern = FERNS[n++]!;
        fern.x = (px[i]! + px[i + 1]!) / 2;
        fern.y = ceiling;
        fern.k = u * 0.032;
        fern.a = t ? Math.sin(t * 1.1 + i * 2.3 + f * 1.3 + h.x0 * 7) * 0.07 : 0;
      }
    }
    hangingFerns(ctx, FERNS, n, lw);
    // Paper lanterns on a string across a gallery, under its ceiling, rocking each on its own.
    if (h.lanterns !== undefined && t) {
      const string = foot - floorAt(h, h.lanterns + 1) * u + u * 0.03;
      const xs0 = x0 + u * 0.01;
      const xs1 = x1 - u * 0.01;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, lw * 0.4);
      ctx.beginPath();
      ctx.moveTo(xs0, string);
      ctx.quadraticCurveTo((xs0 + xs1) / 2, string + u * 0.016, xs1, string);
      ctx.stroke();
      const m = 4;
      for (let i = 0; i < m; i++) {
        const l = LANTERN_SPOTS[i]!;
        const f = (i + 0.5) / m;
        l.x = xs0 + (xs1 - xs0) * f;
        l.y = string + u * 0.016 * 2 * f * (1 - f);
        l.k = u * 0.0095;
        l.a = Math.sin(t * 1.7 + i * 2.2) * 0.14;
        l.color = i;
      }
      paperLanterns(ctx, LANTERN_SPOTS, m, lit, lw * 0.6);
    }
  }
  // Whoever stands on the galleries, then the railings, the beads and the bunting on all of them.
  if (onDeck) for (const f of h.galleries) onDeck(ctx, f, deckAt(f));
  let n = 0;
  for (const f of h.galleries) {
    const r = RAILS[n++]!;
    r.x0 = x0 - u * 0.003;
    r.x1 = x1 + u * 0.003;
    r.y = deckAt(f);
    r.first = f;
  }
  railings(ctx, u, RAILS, n, RAIL_H * u, lw);
  if (h.dressed) {
    for (let i = 0; i < n; i++) {
      RAILS[i]!.y -= u * 0.004;
      RAILS[i]!.x0 = x0;
      RAILS[i]!.x1 = x1;
    }
    beadsOn(ctx, u, RAILS, n, lw, t);
    for (let i = 0; i < n; i++) RAILS[i]!.y += u * 0.004;
    buntings(ctx, u, RAILS, n, RAIL_H * u, lw);
    // Gas lanterns on brackets either side of the ground floor's middle bay.
    for (let i = 1; i < h.bays; i++) {
      const x = px[i]!;
      ctx.fillStyle = IRON.body;
      ctx.fillRect(x - u * 0.012, foot - u * 0.09, u * 0.012, Math.max(1, u * 0.003));
      lantern(ctx, x - u * 0.012, foot - u * 0.088, u * 0.018, lit, t, i * 1.7 + h.x0, lw, t !== 0);
    }
  }
}

/**
 * The corner house on the left, its family on the first gallery (`onDeck` draws them before its
 * railing), the big mask under the top gallery's canopy and the banner hung from it.
 */
export function cornerHouse(ctx: Ctx, s: Scene, tone?: Tone, onDeck?: (ctx: Ctx, deck: number) => void): void {
  const u = s.u;
  const lw = inkW(s);
  townhouse(ctx, s, CORNER, tone, s.t, (c, f, deck) => {
    if (f === 1) onDeck?.(c, deck);
  });
  const cx = s.cssW / 2;
  const x0 = cx + CORNER.x0 * u;
  const x1 = cx + CORNER.x1 * u;
  const top = streetLevel(s) - floorAt(CORNER, CORNER.storeys) * u;
  if (top - u * 0.1 > s.cssH) return;
  // The banner from the canopy's right end, its tail fluttering (it stays left of the column).
  banner(ctx, x1 - u * 0.024, top + u * 0.012, u * 0.03, u * 0.14, s.t, 0.6, lw);
  // The big mask on the top gallery's frieze, plumes trembling.
  bigMask(ctx, x0 + (x1 - x0) * 0.4, top + u * 0.048, u * 0.06, PURPLE, s.t, 1.3, lw);
}

/** How far a house's eaves, decks and railings reach out past its walls, with their ink (u). */
const EAVES = 0.014;

/**
 * Galleried houses beyond a phone's edges, as many as a wider screen needs: only those that fit
 * whole, eaves and all. One a side of the screen would slice is left out, and the cottages
 * across the way show in the gap.
 */
export function beyond(ctx: Ctx, s: Scene, tone?: Tone): void {
  const u = s.u;
  const half = s.cssW / 2 / u;
  if (half <= 0.5) return;
  for (let k = 0; ; k++) {
    let near = false;
    for (const h of BEYOND) {
      const off = (h.x0 < 0 ? -1 : 1) * k * (BEYOND_SPAN - 0.5);
      const x0 = h.x0 + off;
      const x1 = h.x1 + off;
      if (x1 < -half || x0 > half) continue;
      near = true;
      if (x0 - EAVES < -half || x1 + EAVES > half) continue;
      townhouse(ctx, s, { ...h, x0, x1 }, tone, s.t);
    }
    if (!near) break;
  }
}

// ---------------------------------------------------------------- the café

/**
 * The corner café on the right, two storeys: below, a lilac front under a purple-and-cream striped
 * awning with a scalloped gold-edged valance and beads looped along it, beignets and a cup in the
 * window, a green door and a little round table out on the sidewalk; above, shuttered French
 * windows behind an iron balcony on lacy brackets, beads and bunting on its rail, ferns hanging
 * from the eave and swaying, a big green mask in the middle; a parapet on top with a round sign,
 * a steaming cup on purple.
 */
export function cafe(ctx: Ctx, s: Scene, tone?: Tone): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const x0 = cx + CAFE_X0 * u;
  const x1 = cx + CAFE_X1 * u;
  const w = x1 - x0;
  const foot = streetLevel(s);
  const top = foot - CAFE_H * u;
  if (top - PARAPET_H * u > s.cssH) return;
  const lit = litOf(tone);
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ctx.fillStyle = LILAC.body;
  ctx.fill();
  ctx.fillStyle = LILAC.light;
  ctx.fillRect(x0, top, u * 0.01, foot - top);
  ctx.fillStyle = LILAC.shade;
  ctx.fillRect(x1 - u * 0.008, top, u * 0.008, foot - top);
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ink(ctx, lw, INK);
  // The parapet with a cream cap, the eave's shadow under it.
  ctx.beginPath();
  ctx.rect(x0 - u * 0.006, top - PARAPET_H * u, w + u * 0.012, PARAPET_H * u);
  ctx.fillStyle = CREAM.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = CREAM.shade;
  ctx.fillRect(x0 - u * 0.004, top - u * 0.007, w + u * 0.008, u * 0.005);
  ctx.fillStyle = EAVE_SHADOW;
  ctx.fillRect(x0, top, w, u * 0.012);
  // The upper floor: three shuttered French windows.
  const up: House = { x0: CAFE_X0, x1: CAFE_X1, storeys: 2, wall: LILAC, trim: TEAL, galleries: [1], brick: false, dressed: true, bays: 3, roof: "parapet" };
  upperWindows(ctx, u, x0, x1, foot - STOREY * u, up, lit, lw);
  // The ground floor: the window with the beignets and the cup, and the door.
  const wx = x0 + w * 0.36;
  const wy = foot - u * 0.025;
  ctx.beginPath();
  ctx.rect(wx - u * 0.045, wy - u * 0.06, u * 0.09, u * 0.06);
  ctx.fillStyle = lit > 0.3 ? CAFE_LIT : PANE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  oval(ctx, wx - u * 0.012, wy - u * 0.012, u * 0.03, u * 0.006);
  ctx.fill();
  ctx.fillStyle = ICING;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) block(ctx, wx - u * 0.036 + i * u * 0.016, wy - u * 0.024, u * 0.014, u * 0.01, u * 0.004);
  block(ctx, wx - u * 0.028, wy - u * 0.032, u * 0.014, u * 0.009, u * 0.004);
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  block(ctx, wx + u * 0.02, wy - u * 0.026, u * 0.016, u * 0.013, u * 0.003);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  archPath(ctx, x1 - w * 0.3, foot, u * 0.034, u * 0.092);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = lit > 0.3 ? CAFE_LIT : PANE;
  ctx.fillRect(x1 - w * 0.3 + u * 0.007, foot - u * 0.074, u * 0.02, u * 0.026);
  // The striped awning: a sloping canopy, purple and cream, with a scalloped valance edged in gold.
  const ay = foot - u * 0.1;
  const ah = u * 0.03;
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 - u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 + u * 0.006, ay + ah);
  ctx.lineTo(x0 - u * 0.006, ay + ah);
  ctx.closePath();
  ctx.fillStyle = AWNING_B;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = PURPLE.body;
  ctx.beginPath();
  const stripe = u * 0.015;
  for (let x = x0 - u * 0.006; x < x1 + u * 0.01; x += stripe * 2) ctx.rect(x, ay - u * 0.02, stripe, ah + u * 0.03);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 - u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 + u * 0.006, ay + ah);
  ctx.lineTo(x0 - u * 0.006, ay + ah);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  // The valance: scallops by turns, purple and cream, a gold edge.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    let i = 0;
    for (let x = x0 - u * 0.006; x < x1 + u * 0.006 - 1; x += stripe, i++) {
      if (i % 2 !== pass) continue;
      ctx.moveTo(x, ay + ah);
      ctx.arc(x + stripe / 2, ay + ah, stripe / 2, Math.PI, 0, true);
    }
    ctx.fillStyle = pass ? AWNING_B : PURPLE.body;
    ctx.fill();
  }
  ctx.beginPath();
  for (let x = x0 - u * 0.006; x < x1 + u * 0.006 - 1; x += stripe) {
    ctx.moveTo(x, ay + ah);
    ctx.arc(x + stripe / 2, ay + ah, stripe / 2, Math.PI, 0, true);
  }
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  // The balcony on the upper floor: lacy brackets under its deck, ferns hanging from the eave
  // over it, swaying, then its railing with beads and bunting, and the big mask in the middle.
  const deck = foot - STOREY * u;
  const px = [x0 + u * 0.01, (x0 + x1) / 2, x1 - u * 0.01];
  ctx.beginPath();
  ctx.rect(x0 - u * 0.012, deck - u * 0.002, w + u * 0.024, u * 0.008);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  frieze(ctx, u, x0 - u * 0.006, x1 + u * 0.006, deck + u * 0.006, px);
  for (let i = 0; i < 2; i++) {
    const fern = FERNS[i]!;
    fern.x = x0 + w * (0.22 + i * 0.56);
    fern.y = top + u * 0.012;
    fern.k = u * 0.03;
    fern.a = Math.sin(s.t * 1.2 + i * 2.6 + 0.8) * 0.07;
  }
  hangingFerns(ctx, FERNS, 2, lw);
  railing(ctx, u, x0 - u * 0.006, x1 + u * 0.005, deck, RAIL_H * u, lw);
  beadStrings(ctx, u, x0 - u * 0.004, x1 + u * 0.004, deck - u * 0.004, lw, 0, s.t + 3);
  bunting(ctx, u, x0 - u * 0.006, x1 + u * 0.004, deck - RAIL_H * u, lw, 1);
  bigMask(ctx, (x0 + x1) / 2, top + u * 0.05, u * 0.05, GREEN, s.t, 2.2, lw);
  // The round sign on the parapet: a steaming cup on purple.
  const sx = (x0 + x1) / 2;
  const sy = top - PARAPET_H * u - u * 0.012;
  ctx.beginPath();
  ctx.rect(sx - u * 0.002, sy, u * 0.004, u * 0.014);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, sx, sy, u * 0.019);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.beginPath();
  circle(ctx, sx, sy, u * 0.015);
  ctx.stroke();
  ctx.beginPath();
  block(ctx, sx - u * 0.007, sy - u * 0.002, u * 0.013, u * 0.009, u * 0.002);
  ctx.fillStyle = ICING;
  ctx.fill();
  ctx.strokeStyle = ICING;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.beginPath();
  circle(ctx, sx + u * 0.008, sy + u * 0.002, u * 0.003);
  ctx.moveTo(sx - u * 0.003, sy - u * 0.005);
  ctx.quadraticCurveTo(sx - u * 0.005, sy - u * 0.009, sx - u * 0.002, sy - u * 0.012);
  ctx.stroke();
  // A round table with two chairs out on the sidewalk, under the awning.
  const tx = x0 + w * 0.56;
  const ty = foot + SIDEWALK_DOWN * u * 0.85;
  ctx.beginPath();
  ctx.rect(tx - u * 0.002, ty - u * 0.02, u * 0.004, u * 0.02);
  ctx.rect(tx - u * 0.03, ty - u * 0.028, u * 0.004, u * 0.028);
  ctx.rect(tx + u * 0.026, ty - u * 0.028, u * 0.004, u * 0.028);
  ctx.rect(tx - u * 0.034, ty - u * 0.016, u * 0.012, u * 0.004);
  ctx.rect(tx + u * 0.022, ty - u * 0.016, u * 0.012, u * 0.004);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx, ty - u * 0.02, u * 0.017, u * 0.005);
  ctx.fillStyle = IRON.light;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // The regular on the right-hand chair.
  cafeRegular(ctx, s, tx + u * 0.03, ty, 0.017, lw);
}

/**
 * The lamppost at the corner: a fluted cast-iron post on a stepped base, a crossbar with a
 * string of beads looped over it and a Carnival banner hanging from its inner end, a street
 * sign, and a gas lantern with a gold fleur-de-lis finial.
 */
export function lamppost(ctx: Ctx, s: Scene, tone?: Tone): void {
  const u = s.u;
  const lw = inkW(s);
  const x = s.cssW / 2 + LAMP_X * u;
  const foot = streetLevel(s) + SIDEWALK_DOWN * u * 0.8;
  const top = foot - LAMP_H * u;
  if (top > s.cssH) return;
  ctx.beginPath();
  ctx.rect(x - u * 0.004, top + u * 0.03, u * 0.008, foot - top - u * 0.03);
  ctx.rect(x - u * 0.011, foot - u * 0.03, u * 0.022, u * 0.03);
  ctx.rect(x - u * 0.015, foot - u * 0.01, u * 0.03, u * 0.01);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = IRON.light;
  ctx.fillRect(x - u * 0.0035, top + u * 0.032, u * 0.002, foot - top - u * 0.065);
  // The street sign, white on blue, partway up.
  const sy = foot - u * 0.13;
  ctx.beginPath();
  block(ctx, x - u * 0.03, sy, u * 0.028, u * 0.012, u * 0.002);
  ctx.fillStyle = SIGN_BLUE;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) ctx.rect(x - u * 0.027 + i * u * 0.0042, sy + u * 0.004, u * 0.0028, u * 0.0045);
  ctx.fill();
  // The crossbar, beads looped over it, and the banner hung from its inner end.
  ctx.beginPath();
  ctx.rect(x - u * 0.036, top + u * 0.055, u * 0.04, u * 0.004);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  banner(ctx, x - u * 0.025, top + u * 0.059, u * 0.022, u * 0.075, s.t, 2.4, lw, "mask");
  beadStrings(ctx, u, x - u * 0.016, x + u * 0.004, top + u * 0.06, lw, 1, s.t, 0.026, 0.02);
  // The lantern and the fleur-de-lis on top.
  lantern(ctx, x, top + u * 0.006, u * 0.026, litOf(tone), s.t, 4.1, lw);
  ctx.beginPath();
  fleurPath(ctx, x, top - u * 0.012, u * 0.022);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
}

/**
 * The king-cake stand on the sidewalk below the corner house: a little cart on two wheels with
 * a purple-and-gold canopy, a king cake (a ring iced in the three colors) on its counter and a
 * fleur-de-lis on its front.
 */
export function cakeCart(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const x0 = cx + CART_X0 * u;
  const x1 = cx + CART_X1 * u;
  const w = x1 - x0;
  const foot = streetLevel(s) + SIDEWALK_DOWN * u * 0.9;
  const top = foot - CART_H * u;
  if (top > s.cssH) return;
  const counter = foot - u * 0.05;
  // Wheels, then the box with the fleur-de-lis.
  ctx.beginPath();
  circle(ctx, x0 + w * 0.25, foot - u * 0.009, u * 0.011);
  circle(ctx, x1 - w * 0.25, foot - u * 0.009, u * 0.011);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  block(ctx, x0 + u * 0.004, counter, w - u * 0.008, u * 0.036, u * 0.004);
  ctx.fillStyle = CREAM.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  fleurPath(ctx, (x0 + x1) / 2, counter + u * 0.018, u * 0.024);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  // The counter top and the cake on it: a ring with purple, green and gold sugar.
  ctx.beginPath();
  block(ctx, x0, counter - u * 0.006, w, u * 0.008, u * 0.002);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  const kx = (x0 + x1) / 2;
  const ky = counter - u * 0.014;
  ctx.beginPath();
  oval(ctx, kx, ky, u * 0.026, u * 0.011);
  ctx.moveTo(kx + u * 0.01, ky);
  ctx.ellipse(kx, ky, u * 0.01, u * 0.004, 0, 0, Math.PI * 2, true);
  ctx.fillStyle = CAKE.body;
  ctx.fill("evenodd");
  ink(ctx, lw * 0.7, INK);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI * 2;
    ctx.fillStyle = THREE[i % 3]!.body;
    ctx.beginPath();
    oval(ctx, kx + Math.cos(a) * u * 0.018, ky + Math.sin(a) * u * 0.007 - u * 0.003, u * 0.006, u * 0.003);
    ctx.fill();
  }
  // Canopy: two poles and a scalloped purple top with gold stripes.
  ctx.beginPath();
  ctx.rect(x0 + u * 0.006, top + u * 0.018, u * 0.004, counter - top - u * 0.024);
  ctx.rect(x1 - u * 0.01, top + u * 0.018, u * 0.004, counter - top - u * 0.024);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 - u * 0.004, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top);
  ctx.lineTo(x1 - w * 0.15, top);
  ctx.lineTo(x1 + u * 0.004, top + u * 0.02);
  ctx.closePath();
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  for (let x = x0; x < x1; x += u * 0.024) ctx.rect(x, top - u * 0.01, u * 0.012, u * 0.04);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0 - u * 0.004, top + u * 0.02);
  ctx.lineTo(x0 + w * 0.15, top);
  ctx.lineTo(x1 - w * 0.15, top);
  ctx.lineTo(x1 + u * 0.004, top + u * 0.02);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (let x = x0 - u * 0.004; x < x1 + u * 0.003; x += u * 0.012) {
    ctx.moveTo(x, top + u * 0.02);
    ctx.arc(x + u * 0.006, top + u * 0.02, u * 0.006, Math.PI, 0, true);
  }
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

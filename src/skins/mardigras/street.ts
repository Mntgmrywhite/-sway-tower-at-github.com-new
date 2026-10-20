import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  AWNING_A,
  AWNING_B,
  BRICK,
  BUTTER,
  CAKE,
  CREAM,
  DOOR,
  FERN,
  GOLD,
  GREEN,
  ICING,
  INK,
  IRON,
  LANTERNS,
  MINT,
  PANE,
  PURPLE,
  ROOF,
  ROSE,
  SHUTTER,
  SIDEWALK,
  STREET,
  STREET_FAR,
  TIN,
  type Shades,
} from "./colors";
import { inkW, SIDEWALK as SIDEWALK_DOWN, streetLevel } from "./place";
import { beadLoop, block, fleurPath, swagPath } from "./shapes";

// The street behind the reviewing stand: a row of the Quarter's galleried townhouses, their
// cast-iron galleries hung with purple, green and gold bunting and strings of beads, ferns on
// the rails and paper lanterns strung across the fronts; on the left a two-storey house whose
// family tosses beads from the gallery (balcony.ts), with a king-cake cart on the sidewalk
// below; straight ahead two tall ones, still, behind the tower; on the right a corner café
// under a striped awning, with a lamppost crowned by a fleur-de-lis at the corner. Everything
// here is near: flat two-tone fills and one ink weight. The row runs on past the screen's
// edges on wider screens with plainer houses.
//
// Positions are in u from the screen center, heights in u up from the far sidewalk's back
// edge (streetLevel), where the houses stand.

/** A storey's height (u), a gallery rail's height, and the gallery posts' width. */
const STOREY = 0.12;
const RAIL_H = 0.034;
const POST_W = 0.006;

/** What a townhouse is made of. */
interface House {
  /** Its left and right edges (u from center). */
  x0: number;
  x1: number;
  storeys: number;
  wall: Shades;
  trim: Shades;
  roof: "parapet" | "hip";
  /** The storeys (from 1) that carry a gallery. */
  galleries: readonly number[];
  /** Hung with bunting, beads, ferns and lanterns. */
  dressed: boolean;
}

/** The left house with the family: its edges, and the gallery's deck (storey 1). */
const LEFT_HOUSE: House = { x0: -0.48, x1: -0.29, storeys: 2, wall: ROSE, trim: SHUTTER, roof: "hip", galleries: [1], dressed: true };
/** The two tall ones behind the tower. */
const CENTER: readonly House[] = [
  { x0: -0.29, x1: -0.01, storeys: 3, wall: CREAM, trim: SHUTTER, roof: "parapet", galleries: [1, 2], dressed: true },
  { x0: -0.01, x1: 0.27, storeys: 3, wall: MINT, trim: DOOR, roof: "hip", galleries: [1, 2], dressed: true },
];
/** Plainer houses beyond a phone's edges, repeating outward on wider screens. */
const BEYOND: readonly House[] = [
  { x0: -0.74, x1: -0.48, storeys: 2, wall: BUTTER, trim: SHUTTER, roof: "parapet", galleries: [1], dressed: false },
  { x0: -1.0, x1: -0.74, storeys: 3, wall: BRICK, trim: DOOR, roof: "hip", galleries: [1, 2], dressed: false },
  { x0: 0.5, x1: 0.76, storeys: 2, wall: ROSE, trim: DOOR, roof: "hip", galleries: [1], dressed: false },
  { x0: 0.76, x1: 1.02, storeys: 3, wall: BUTTER, trim: SHUTTER, roof: "parapet", galleries: [1, 2], dressed: false },
];
/** The row's span (u from center) that BEYOND covers; further out it repeats. */
const BEYOND_SPAN = 1.0;

/** The café on the right: its edges and its height (one storey under a parapet). */
const CAFE_X0 = 0.27;
const CAFE_X1 = 0.44;
const CAFE_H = 0.13;
const PARAPET_H = 0.03;
/** The lamppost at the corner: its center (u), its height above the sidewalk. */
const LAMP_X = 0.475;
const LAMP_H = 0.25;
/** The king-cake cart on the sidewalk below the left house: its edges. */
const CART_X0 = -0.37;
const CART_X1 = -0.275;
const CART_H = 0.1;

/** Screen y of a house's gallery deck on storey `f` (the rail's foot). */
export function deckY(s: Scene, f: number): number {
  return streetLevel(s) - f * STOREY * s.u;
}

// ---------------------------------------------------------------- the ground

/** The ground from the horizon down: the square's far ground, the sidewalk the houses stand on, and the roadway in front. */
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
  // The far sidewalk: a pale strip with a lit back edge and a curb, from the houses' feet to the road.
  ctx.fillStyle = SIDEWALK.body;
  ctx.fillRect(0, sl, s.cssW, walk);
  ctx.fillStyle = SIDEWALK.light;
  ctx.fillRect(0, sl, s.cssW, Math.max(1, u * 0.004));
  ctx.fillStyle = SIDEWALK.shade;
  ctx.fillRect(0, sl + walk - u * 0.006, s.cssW, u * 0.006);
  // Confetti and a few lost bead strings on the road, in the colors of the season: still.
  const colors = [PURPLE.body, GREEN.body, GOLD.body];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = c; i < 42; i += 3) {
      const X = ((i * 0.618) % 1) - 0.5;
      const d = 0.06 + ((i * 0.377) % 1) * 0.3;
      const y = sl + walk + d * u;
      if (y > s.cssH) continue;
      ctx.rect(s.cssW / 2 + X * (s.cssW / u) * u - u * 0.004, y, u * 0.008, u * 0.004);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- townhouses

/** A gallery's iron rail from x0 to x1 with its foot at y: a lacy band of bars and scrolls under a top rail. */
function rail(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number): void {
  const h = RAIL_H * u;
  ctx.fillStyle = IRON.body;
  ctx.fillRect(x0, y - h, x1 - x0, u * 0.005);
  ctx.fillRect(x0, y - u * 0.006, x1 - x0, u * 0.006);
  ctx.beginPath();
  const step = u * 0.016;
  for (let x = x0 + step * 0.5; x < x1; x += step) ctx.rect(x - u * 0.0015, y - h, u * 0.003, h);
  ctx.fill();
  // Scrolls: little rings along the middle of the band.
  ctx.strokeStyle = IRON.body;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.beginPath();
  for (let x = x0 + step; x < x1 - step * 0.5; x += step * 2) circle(ctx, x, y - h * 0.5, u * 0.005);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x0, y - h, x1 - x0, h);
  ink(ctx, lw * 0.7, INK);
}

/** Slim iron posts holding a gallery up: from the rail's foot down to the sidewalk. */
function posts(ctx: Ctx, u: number, x0: number, x1: number, y: number, foot: number, lw: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / (u * 0.09)) + 1);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = x0 + u * 0.012 + ((x1 - x0 - u * 0.024) * i) / (n - 1);
    ctx.rect(x - (POST_W / 2) * u, y, POST_W * u, foot - y);
  }
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

/** Where a house's openings go: for each storey, the sill's y and the openings' height; `n` across. */
type Rows = { sill: number; h: number; door: boolean }[];
const ROWS: Rows = Array.from({ length: 4 }, () => ({ sill: 0, h: 0, door: false }));

/**
 * The tall shuttered openings of a house (French doors below, windows above), `n` across each
 * storey from x0, `ow` wide: all of a kind drawn in one pass (the panes, their shine and bars,
 * the shutters and their slats), so a house costs a handful of fills and strokes, not one per
 * window.
 */
function openings(ctx: Ctx, u: number, x0: number, w: number, n: number, ow: number, rows: Rows, storeys: number, trim: Shades, lw: number): void {
  const sw = ow * 0.45;
  const bar = Math.max(1, u * 0.0022);
  // The dark doorways and the glass.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let f = 0; f < storeys; f++) {
      const r = rows[f]!;
      if (r.door !== (pass === 0)) continue;
      for (let i = 0; i < n; i++) ctx.rect(x0 + (w * (i + 0.5)) / n - ow / 2, r.sill - r.h, ow, r.h);
    }
    ctx.fillStyle = pass === 0 ? "#3a2f52" : PANE;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
  }
  // A transom of glass over each door, a shine on each window, and the bars across the panes.
  ctx.beginPath();
  for (let f = 0; f < storeys; f++) {
    const r = rows[f]!;
    if (!r.door) continue;
    for (let i = 0; i < n; i++) ctx.rect(x0 + (w * (i + 0.5)) / n - ow * 0.4, r.sill - r.h * 0.95, ow * 0.8, r.h * 0.2);
  }
  ctx.fillStyle = PANE;
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let f = 0; f < storeys; f++) {
    const r = rows[f]!;
    if (r.door) continue;
    for (let i = 0; i < n; i++) ctx.rect(x0 + (w * (i + 0.5)) / n - ow * 0.4, r.sill - r.h * 0.9, ow * 0.25, r.h * 0.35);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let f = 0; f < storeys; f++) {
    const r = rows[f]!;
    for (let i = 0; i < n; i++) {
      const x = x0 + (w * (i + 0.5)) / n;
      ctx.rect(x - bar / 2, r.sill - r.h, bar, r.h);
      if (!r.door) ctx.rect(x - ow / 2, r.sill - r.h * 0.5, ow, bar);
    }
  }
  ctx.fill();
  // The shutters either side, and their slats.
  ctx.beginPath();
  for (let f = 0; f < storeys; f++) {
    const r = rows[f]!;
    for (let i = 0; i < n; i++) {
      const x = x0 + (w * (i + 0.5)) / n;
      block(ctx, x - ow / 2 - sw, r.sill - r.h, sw, r.h, u * 0.002);
      block(ctx, x + ow / 2, r.sill - r.h, sw, r.h, u * 0.002);
    }
  }
  ctx.fillStyle = trim.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = trim.shade;
  ctx.beginPath();
  for (let f = 0; f < storeys; f++) {
    const r = rows[f]!;
    for (let i = 0; i < n; i++) {
      const x = x0 + (w * (i + 0.5)) / n;
      for (let k = 1; k < 5; k++) {
        ctx.rect(x - ow / 2 - sw * 0.85, r.sill - r.h + (r.h * k) / 5, sw * 0.7, bar);
        ctx.rect(x + ow / 2 + sw * 0.15, r.sill - r.h + (r.h * k) / 5, sw * 0.7, bar);
      }
    }
  }
  ctx.fill();
}

/** Bunting swags along a rail's top from x0 to x1, in the three colors by turns: one pass per color, one for the ink and one for the rosettes. */
function bunting(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number, first: number): void {
  const colors = [PURPLE, GREEN, GOLD] as const;
  const n = Math.max(2, Math.round((x1 - x0) / (u * 0.07)));
  const span = (x1 - x0) / n;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if ((i + first) % 3 !== c) continue;
      swagPath(ctx, x0 + i * span, x0 + (i + 1) * span, y, u * 0.012);
    }
    ctx.fillStyle = colors[c]!.body;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if ((i + first) % 3 !== c) continue;
      const a = x0 + i * span;
      ctx.moveTo(a + span * 0.15, y + u * 0.003);
      ctx.quadraticCurveTo(a + span * 0.5, y + u * 0.012, a + span * 0.85, y + u * 0.003);
      ctx.quadraticCurveTo(a + span * 0.5, y + u * 0.006, a + span * 0.15, y + u * 0.003);
      ctx.closePath();
    }
    ctx.fillStyle = colors[c]!.light;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) swagPath(ctx, x0 + i * span, x0 + (i + 1) * span, y, u * 0.012);
  ink(ctx, lw * 0.7, INK);
}

/** Strings of beads hung over a rail, dangling below its foot at y, from x0 to x1: one ink pass, then one fill per color. */
function beadStrings(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number, first: number): void {
  const colors = [PURPLE, GOLD, GREEN] as const;
  const step = u * 0.05;
  ctx.beginPath();
  for (let x = x0 + step * 0.7; x < x1 - step * 0.4; x += step) beadLoop(ctx, x, y - u * 0.004, u * 0.011, u * 0.03, u * 0.0036, 8);
  ink(ctx, lw * 0.5, INK);
  // The colors fill the beads over the ink's inner half, so the outline stays thin.
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    let i = first;
    for (let x = x0 + step * 0.7; x < x1 - step * 0.4; x += step, i++) {
      if (i % 3 !== c) continue;
      beadLoop(ctx, x, y - u * 0.004, u * 0.011, u * 0.03, u * 0.0036, 8);
    }
    ctx.fillStyle = colors[c]!.body;
    ctx.fill();
  }
}

/** A fern in a basket on a rail at (x, y the rail's top): fronds spilling down either side. */
function fern(ctx: Ctx, u: number, x: number, y: number, lw: number): void {
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.42;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(a) * u * 0.02, y - u * 0.012 + Math.abs(i) * u * 0.004, x + Math.sin(a) * u * 0.03, y + u * 0.012 + Math.abs(i) * u * 0.005);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.9 + u * 0.004);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = FERN.body;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.stroke();
  ctx.beginPath();
  block(ctx, x - u * 0.014, y - u * 0.006, u * 0.028, u * 0.012, u * 0.003);
  ctx.fillStyle = BRICK.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/** Paper lanterns on a string across a front from x0 to x1 at height y: ovals in the three colors. */
function lanterns(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / (u * 0.055)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + u * 0.012, x1, y);
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * k;
    const ly = y + u * 0.012 * 4 * k * (1 - k) + u * 0.012;
    const c = LANTERNS[i % 3]!;
    ctx.beginPath();
    oval(ctx, x, ly, u * 0.011, u * 0.013);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
    ctx.fillStyle = c.light;
    ctx.beginPath();
    oval(ctx, x - u * 0.003, ly - u * 0.003, u * 0.004, u * 0.006);
    ctx.fill();
  }
}

/**
 * A townhouse: its wall, the openings on each storey (French doors below, shuttered windows
 * above), galleries with iron rails and posts, a roof (a cornice and parapet, or a hipped slate
 * roof with a dormer and chimney), and, if dressed, bunting and beads on the rails, ferns and
 * lanterns. `onDeck` draws whoever stands on the first gallery, before its rail.
 */
function house(ctx: Ctx, s: Scene, h: House, onDeck?: (ctx: Ctx, deck: number) => void): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const x0 = cx + h.x0 * u;
  const x1 = cx + h.x1 * u;
  const w = x1 - x0;
  const foot = streetLevel(s);
  const top = foot - h.storeys * STOREY * u;
  if (top > s.cssH) return;
  // The wall, lit down its left edge.
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ctx.fillStyle = h.wall.body;
  ctx.fill();
  ctx.fillStyle = h.wall.light;
  ctx.fillRect(x0, top, u * 0.012, foot - top);
  ctx.fillStyle = h.wall.shade;
  ctx.fillRect(x1 - u * 0.012, top, u * 0.012, foot - top);
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ink(ctx, lw, INK);
  // Openings: as many per storey as fit, French doors on the ground floor.
  const n = Math.max(1, Math.floor(w / (u * 0.07)));
  for (let f = 0; f < h.storeys; f++) {
    const r = ROWS[f]!;
    r.sill = foot - f * STOREY * u - (f === 0 ? 0 : u * 0.012);
    r.h = f === 0 ? u * 0.085 : u * 0.07;
    r.door = f === 0;
  }
  openings(ctx, u, x0, w, n, u * 0.026, ROWS, h.storeys, h.trim, lw);
  // The roof.
  if (h.roof === "parapet") {
    ctx.beginPath();
    ctx.rect(x0 - u * 0.006, top - u * 0.022, w + u * 0.012, u * 0.022);
    ctx.fillStyle = h.trim.body;
    ctx.fill();
    ink(ctx, lw, INK);
    ctx.fillStyle = h.trim.light;
    ctx.fillRect(x0, top - u * 0.02, w, u * 0.006);
    ctx.fillStyle = h.trim.shade;
    ctx.beginPath();
    for (let x = x0 + u * 0.006; x < x1 - u * 0.004; x += u * 0.016) ctx.rect(x, top - u * 0.012, u * 0.008, u * 0.008);
    ctx.fill();
  } else {
    const rh = u * 0.07;
    ctx.beginPath();
    ctx.moveTo(x0 - u * 0.01, top);
    ctx.lineTo(x0 + w * 0.18, top - rh);
    ctx.lineTo(x1 - w * 0.18, top - rh);
    ctx.lineTo(x1 + u * 0.01, top);
    ctx.closePath();
    ctx.fillStyle = ROOF.body;
    ctx.fill();
    ink(ctx, lw, INK);
    ctx.fillStyle = ROOF.light;
    ctx.beginPath();
    ctx.moveTo(x0 + u * 0.004, top - u * 0.006);
    ctx.lineTo(x0 + w * 0.2, top - rh + u * 0.008);
    ctx.lineTo(x0 + w * 0.3, top - rh + u * 0.008);
    ctx.lineTo(x0 + w * 0.14, top - u * 0.006);
    ctx.closePath();
    ctx.fill();
    // A dormer in the middle and a chimney at the right.
    const dx = (x0 + x1) / 2;
    ctx.beginPath();
    ctx.rect(dx - u * 0.02, top - rh * 0.72, u * 0.04, rh * 0.72);
    ctx.fillStyle = h.wall.body;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
    ctx.beginPath();
    ctx.moveTo(dx - u * 0.026, top - rh * 0.7);
    ctx.lineTo(dx, top - rh * 0.98);
    ctx.lineTo(dx + u * 0.026, top - rh * 0.7);
    ctx.closePath();
    ctx.fillStyle = ROOF.shade;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
    ctx.beginPath();
    ctx.rect(dx - u * 0.01, top - rh * 0.6, u * 0.02, rh * 0.45);
    ctx.fillStyle = PANE;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
    ctx.beginPath();
    ctx.rect(x1 - w * 0.22, top - rh - u * 0.03, u * 0.022, u * 0.04);
    ctx.fillStyle = BRICK.body;
    ctx.fill();
    ink(ctx, lw * 0.8, INK);
  }
  // Galleries: posts below each rail, whoever stands on the first deck, then the rails and their dressing.
  for (const f of h.galleries) {
    const deck = foot - f * STOREY * u;
    posts(ctx, u, x0, x1, deck, f === 1 ? foot : deck + STOREY * u, lw);
  }
  if (onDeck && h.galleries.includes(1)) onDeck(ctx, foot - STOREY * u);
  for (const f of h.galleries) {
    const deck = foot - f * STOREY * u;
    rail(ctx, u, x0 - u * 0.004, x1 + u * 0.004, deck, lw);
    if (!h.dressed) continue;
    beadStrings(ctx, u, x0, x1, deck, lw, f);
    bunting(ctx, u, x0, x1, deck - RAIL_H * u, lw, f);
    fern(ctx, u, x0 + w * 0.2, deck - RAIL_H * u, lw);
    fern(ctx, u, x1 - w * 0.2, deck - RAIL_H * u, lw);
  }
  if (h.dressed && h.storeys > 2) lanterns(ctx, u, x0 + u * 0.01, x1 - u * 0.01, top + STOREY * u * 0.55, lw);
}

/** The left house with its family on the gallery (`onDeck` draws them before the rail). */
export function leftHouse(ctx: Ctx, s: Scene, onDeck?: (ctx: Ctx, deck: number) => void): void {
  house(ctx, s, LEFT_HOUSE, onDeck);
}

/** The two tall townhouses straight ahead, behind the tower: still. */
export function centerBlock(ctx: Ctx, s: Scene): void {
  for (const h of CENTER) house(ctx, s, h);
}

/** Plainer houses beyond a phone's edges, as many as a wider screen needs. */
export function beyond(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const half = s.cssW / 2 / u;
  if (half <= 0.5) return;
  for (let k = 0; ; k++) {
    let any = false;
    for (const h of BEYOND) {
      const off = (h.x0 < 0 ? -1 : 1) * k * (BEYOND_SPAN - 0.48);
      const x0 = h.x0 + off;
      const x1 = h.x1 + off;
      if (x1 < -half - 0.02 || x0 > half + 0.02) continue;
      any = true;
      house(ctx, s, { ...h, x0, x1 });
    }
    if (!any) break;
  }
}

// ---------------------------------------------------------------- the café

/**
 * The corner café on the right: a cream front under a parapet with a round coffee-cup sign,
 * a striped green-and-cream awning over its window and door, a plate of beignets and a cup in
 * the window, and a little round table out on the sidewalk.
 */
export function cafe(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const x0 = cx + CAFE_X0 * u;
  const x1 = cx + CAFE_X1 * u;
  const w = x1 - x0;
  const foot = streetLevel(s);
  const top = foot - CAFE_H * u;
  if (top - PARAPET_H * u > s.cssH) return;
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ctx.fillStyle = BUTTER.body;
  ctx.fill();
  ctx.fillStyle = BUTTER.light;
  ctx.fillRect(x0, top, u * 0.01, foot - top);
  ctx.beginPath();
  ctx.rect(x0, top, w, foot - top);
  ink(ctx, lw, INK);
  // The parapet with a tin cap, and the round sign: a steaming cup.
  ctx.beginPath();
  ctx.rect(x0 - u * 0.006, top - PARAPET_H * u, w + u * 0.012, PARAPET_H * u);
  ctx.fillStyle = TIN.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = TIN.light;
  ctx.fillRect(x0, top - PARAPET_H * u + lw * 0.5, w, u * 0.006);
  const sx = (x0 + x1) / 2;
  const sy = top - PARAPET_H * u * 0.5;
  ctx.beginPath();
  circle(ctx, sx, sy, u * 0.018);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
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
  ctx.moveTo(sx + u * 0.002, sy - u * 0.005);
  ctx.quadraticCurveTo(sx, sy - u * 0.009, sx + u * 0.003, sy - u * 0.012);
  ctx.stroke();
  // The window with the beignets and the cup, and the door.
  const wx = x0 + w * 0.36;
  const wy = foot - u * 0.025;
  ctx.beginPath();
  ctx.rect(wx - u * 0.045, wy - u * 0.06, u * 0.09, u * 0.06);
  ctx.fillStyle = PANE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = ICING;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) block(ctx, wx - u * 0.036 + i * u * 0.016, wy - u * 0.022, u * 0.014, u * 0.01, u * 0.004);
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  block(ctx, wx + u * 0.02, wy - u * 0.026, u * 0.016, u * 0.013, u * 0.003);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  block(ctx, x1 - w * 0.3, foot - u * 0.09, u * 0.032, u * 0.09, u * 0.002);
  ctx.fillStyle = SHUTTER.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = PANE;
  ctx.fillRect(x1 - w * 0.3 + u * 0.006, foot - u * 0.082, u * 0.02, u * 0.03);
  // The striped awning: a sloping canopy with a scalloped valance, green and cream.
  const ay = foot - u * 0.098;
  const ah = u * 0.03;
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 - u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 + u * 0.004, ay + ah);
  ctx.lineTo(x0 - u * 0.004, ay + ah);
  ctx.closePath();
  ctx.fillStyle = AWNING_B;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = AWNING_A;
  ctx.beginPath();
  const stripe = u * 0.016;
  for (let x = x0 - u * 0.004; x < x1 + u * 0.01; x += stripe * 2) ctx.rect(x, ay - u * 0.02, stripe, ah + u * 0.03);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 - u * 0.006, ay - u * 0.012);
  ctx.lineTo(x1 + u * 0.004, ay + ah);
  ctx.lineTo(x0 - u * 0.004, ay + ah);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (let x = x0 - u * 0.004; x < x1 + u * 0.004 - 1; x += stripe) {
    ctx.moveTo(x, ay + ah);
    ctx.arc(x + stripe / 2, ay + ah, stripe / 2, Math.PI, 0, true);
  }
  ctx.fillStyle = AWNING_B;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // A round table with two chairs out on the sidewalk, under the awning.
  const tx = x0 + w * 0.5;
  const ty = foot + SIDEWALK_DOWN * u * 0.85;
  ctx.beginPath();
  ctx.rect(tx - u * 0.002, ty - u * 0.02, u * 0.004, u * 0.02);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx, ty - u * 0.02, u * 0.018, u * 0.005);
  ctx.fillStyle = IRON.light;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/**
 * The lamppost at the corner: a fluted cast-iron post on a stepped base, a crossbar hung with
 * beads, a four-sided lantern head with a gold fleur-de-lis finial.
 */
export function lamppost(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const x = s.cssW / 2 + LAMP_X * u;
  const foot = streetLevel(s) + SIDEWALK_DOWN * u * 0.8;
  const top = foot - LAMP_H * u;
  if (top > s.cssH) return;
  ctx.beginPath();
  ctx.rect(x - u * 0.004, top + u * 0.03, u * 0.008, foot - top - u * 0.03);
  ctx.rect(x - u * 0.012, foot - u * 0.03, u * 0.024, u * 0.03);
  ctx.rect(x - u * 0.016, foot - u * 0.01, u * 0.032, u * 0.01);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = IRON.light;
  ctx.fillRect(x - u * 0.0035, top + u * 0.032, u * 0.002, foot - top - u * 0.065);
  // The crossbar, with a string of beads looped over it.
  ctx.beginPath();
  ctx.rect(x - u * 0.02, top + u * 0.055, u * 0.04, u * 0.004);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  beadLoop(ctx, x - u * 0.013, top + u * 0.06, u * 0.007, u * 0.024, u * 0.003, 7);
  ctx.fillStyle = GREEN.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
  // The lantern: a glass box with a pointed cap and the fleur-de-lis on top.
  ctx.beginPath();
  ctx.moveTo(x - u * 0.013, top + u * 0.03);
  ctx.lineTo(x - u * 0.011, top + u * 0.006);
  ctx.lineTo(x + u * 0.011, top + u * 0.006);
  ctx.lineTo(x + u * 0.013, top + u * 0.03);
  ctx.closePath();
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = IRON.body;
  ctx.fillRect(x - u * 0.001, top + u * 0.006, u * 0.002, u * 0.024);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.015, top + u * 0.006);
  ctx.lineTo(x, top - u * 0.006);
  ctx.lineTo(x + u * 0.015, top + u * 0.006);
  ctx.closePath();
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  fleurPath(ctx, x, top - u * 0.016, u * 0.022);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
}

/**
 * The king-cake stand on the sidewalk below the left house: a little cart on two wheels with
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
  const sugar = [PURPLE.body, GREEN.body, GOLD.body];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI * 2;
    ctx.fillStyle = sugar[i % 3]!;
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

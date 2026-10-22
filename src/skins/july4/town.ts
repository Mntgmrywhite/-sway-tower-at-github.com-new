import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { speck, swagBand } from "./shapes";
import type { Tone } from "./tone";

// The town behind the square, printed in flat layers of atmosphere as a WPA poster builds its
// depth: every row back is one flat ink paler, lit from the left with a flat shadow plane on
// its right, and nothing back here is outlined. Furthest, on the hill behind the town, the water
// tower, its tank painted with the flag (staggered stars on a blue band over red and cream
// stripes). Then two rows of rooftops stepping back from Main Street: gables, mansards and flat
// parapets, chimneys, a hose tower and a cupola, the near row with its windows (lit at dusk).
// Then Main Street itself, the far side of the square: a run of two- and three-story brick,
// ochre, cream, sage and blue storefronts with cornices and false fronts, signboards, sashes,
// striped awnings over the shop windows, and red, cream and blue pleated fans and swags of
// bunting hung across every front; behind the tower the block is printed faint (one pale ink
// with its windows, no bunting), so the column stays calm. And the big round summer trees in
// front of the row, lit on the left. Positions are in u from the screen center, heights in u up
// from the horizon.

/**
 * Main Street stands this far below the horizon (u): the far side of the square, nearer than
 * the hills and the water tower, which stand on the horizon itself.
 */
const TOWN_DROP = 0.09;

/** The line Main Street and its landmarks stand on while the land shows. */
export function townLine(s: Scene): number {
  return s.horizonY + s.u * TOWN_DROP;
}

/**
 * The tallest thing of the town but the landmarks (u above the town's line: the water tower's
 * ball): the cloud floor must cover it before the town stops being drawn (far.ts COVER).
 */
export const TOWN_TOP = 0.335;

// ---------------------------------------------------------------- the water tower

/** The water tower on the hill behind the town (standing on the horizon): center, the tank's half width and height, its feet and the tank's foot (u). */
const WT_X = -0.43;
const WT_HW = 0.034;
const WT_TANK = 0.052;
const WT_FOOT = 0.05;
const WT_LEGS = 0.155;

/** The water tower: four steel legs braced in Xs, a catwalk, the tank lit on the left with the flag painted round it, a conical cap and a ball. */
export function waterTower(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const x = s.cssW / 2 + WT_X * u;
  if (x + WT_HW * 2 * u < 0) return;
  const hw = WT_HW * u;
  const foot = line - WT_FOOT * u;
  const base = line - WT_LEGS * u;
  const top = base - WT_TANK * u;
  // Legs splayed out to the ground, and the bracing between them.
  ctx.strokeStyle = tone.steel;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const k of [-0.85, -0.3, 0.3, 0.85]) {
    ctx.moveTo(x + hw * k, base);
    ctx.lineTo(x + hw * k * 1.45, foot);
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(0.75, u * 0.002);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y0 = base + ((foot - base) * i) / 3;
    const y1 = base + ((foot - base) * (i + 1)) / 3;
    const w0 = hw * 0.85 * (1 + (0.45 * i) / 3);
    const w1 = hw * 0.85 * (1 + (0.45 * (i + 1)) / 3);
    ctx.moveTo(x - w0, y0);
    ctx.lineTo(x + w1, y1);
    ctx.moveTo(x + w0, y0);
    ctx.lineTo(x - w1, y1);
  }
  ctx.stroke();
  // The catwalk under the tank, and its rail.
  ctx.fillStyle = tone.steel;
  ctx.fillRect(x - hw * 1.18, base - u * 0.004, hw * 2.36, u * 0.006);
  ctx.fillRect(x - hw * 1.18, base - u * 0.014, u * 0.0025, u * 0.01);
  ctx.fillRect(x + hw * 1.18 - u * 0.0025, base - u * 0.014, u * 0.0025, u * 0.01);
  ctx.fillRect(x - hw * 1.18, base - u * 0.014, hw * 2.36, u * 0.002);
  // The tank: cream, a blue band of stars round its top, red stripes below, shaded on the right.
  ctx.fillStyle = tone.tank;
  ctx.fillRect(x - hw, top, hw * 0.4 + hw, base - top - u * 0.004);
  ctx.fillStyle = tone.tankDark;
  ctx.fillRect(x + hw * 0.4, top, hw * 0.6, base - top - u * 0.004);
  ctx.fillStyle = tone.farBlue;
  ctx.fillRect(x - hw, top, hw * 2, WT_TANK * u * 0.36);
  ctx.fillStyle = tone.farRed;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) ctx.rect(x - hw, top + WT_TANK * u * (0.48 + i * 0.24), hw * 2, WT_TANK * u * 0.12);
  ctx.fill();
  ctx.fillStyle = tone.farWhite;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) circle(ctx, x - hw * 0.72 + i * hw * 0.36, top + WT_TANK * u * (i % 2 ? 0.24 : 0.12), u * 0.0032);
  ctx.fill();
  // The conical cap, its shaded half, and the ball on top.
  ctx.fillStyle = tone.tankShade;
  ctx.beginPath();
  ctx.moveTo(x - hw * 1.1, top + 1);
  ctx.lineTo(x, top - u * 0.024);
  ctx.lineTo(x + hw * 1.1, top + 1);
  ctx.closePath();
  circle(ctx, x, top - u * 0.026, u * 0.005);
  ctx.fill();
  ctx.fillStyle = tone.capShade;
  ctx.beginPath();
  ctx.moveTo(x, top - u * 0.024);
  ctx.lineTo(x + hw * 1.1, top + 1);
  ctx.lineTo(x, top + 1);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the rooftops behind Main Street

/** One building of a rooftop row: its span (u), wall height, roof kind and rise, and a chimney or tower. */
interface Roof {
  x0: number;
  x1: number;
  h: number;
  kind: "gable" | "flat" | "mansard" | "hip";
  rise: number;
  chimney: number;
  tower: "none" | "hose" | "cupola";
}

/** A hose tower's height over its roof (u). */
const HOSE = 0.05;
/** The rooftops come in two rows, beside the tower's column only (behind it Main Street's quiet block stands alone), to the park on the right. */
const ROW_FROM = 0.205;
const ROW_RIGHT = 0.4;
const ROW_SPAN = 1.6;

function roofRow(seed: number, lo: number, hi: number, wMin: number, wMax: number, towers: boolean): Roof[] {
  const out: Roof[] = [];
  const kinds = ["gable", "flat", "mansard", "hip"] as const;
  for (const side of [-1, 1]) {
    let x = ROW_FROM;
    for (let i = 0; x < (side < 0 ? ROW_SPAN : ROW_RIGHT); i++) {
      const n = seed + i * 7 + (side < 0 ? 0 : 500);
      const w = wMin + hash(n) * (wMax - wMin);
      const x1 = side < 0 ? Math.min(ROW_SPAN, x + w) : Math.min(ROW_RIGHT, x + w);
      const kind = kinds[Math.floor(hash(n + 1) * 4)]!;
      out.push({
        x0: side < 0 ? -x1 : x,
        x1: side < 0 ? -x : x1,
        h: lo + hash(n + 2) * (hi - lo),
        kind,
        rise: kind === "flat" ? 0.014 : 0.026 + hash(n + 3) * 0.022,
        chimney: hash(n + 4) > 0.45 ? 0.2 + hash(n + 5) * 0.6 : -1,
        tower: towers && hash(n + 6) > 0.8 ? (hash(n + 7) > 0.5 ? "hose" : "cupola") : "none",
      });
      x = x1 + 0.003;
    }
  }
  return out;
}

/** The far row (palest, tallest so it shows over the near one) and the near row, whose windows light at dusk. */
const FAR_LO = 0.22;
const BACK_LO = 0.19;
const FAR_ROOFS = roofRow(4100, FAR_LO, 0.26, 0.06, 0.11, false);
const BACK_ROOFS = roofRow(4300, BACK_LO, 0.24, 0.05, 0.09, true);

/**
 * One row's walls and roofs: walls (down to `foot` u above the line, where the row in front
 * of it covers them) and their shadow planes, then the roofs (and towers) in the row's roof
 * ink, then the windows.
 */
function roofs(ctx: Ctx, s: Scene, row: readonly Roof[], line: number, foot: number, wall: string, shade: string, roof: string, windows: string | null): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (const r of row) {
    const x0 = cx + r.x0 * u;
    const x1 = cx + r.x1 * u;
    if (x1 < 0 || x0 > s.cssW) continue;
    ctx.rect(x1 - (x1 - x0) * 0.2, line - r.h * u, (x1 - x0) * 0.2, (r.h - foot) * u + 1);
  }
  ctx.fill();
  ctx.fillStyle = wall;
  ctx.beginPath();
  for (const r of row) {
    const x0 = cx + r.x0 * u;
    const x1 = cx + r.x1 * u;
    if (x1 < 0 || x0 > s.cssW) continue;
    ctx.rect(x0, line - r.h * u, (x1 - x0) * 0.8, (r.h - foot) * u + 1);
    if (r.chimney >= 0) ctx.rect(x0 + (x1 - x0) * r.chimney, line - (r.h + r.rise + 0.02) * u, u * 0.01, (r.rise + 0.02) * u);
    if (r.tower === "hose") ctx.rect((x0 + x1) / 2 - u * 0.011, line - (r.h + HOSE) * u, u * 0.022, HOSE * u);
  }
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  for (const r of row) {
    const x0 = cx + r.x0 * u;
    const x1 = cx + r.x1 * u;
    if (x1 < 0 || x0 > s.cssW) continue;
    const y = line - r.h * u;
    const rise = r.rise * u;
    if (r.kind === "gable") {
      ctx.moveTo(x0 - u * 0.003, y + 1);
      ctx.lineTo((x0 + x1) / 2, y - rise);
      ctx.lineTo(x1 + u * 0.003, y + 1);
      ctx.closePath();
    } else if (r.kind === "hip") {
      ctx.moveTo(x0 - u * 0.003, y + 1);
      ctx.lineTo(x0 + (x1 - x0) * 0.3, y - rise);
      ctx.lineTo(x1 - (x1 - x0) * 0.3, y - rise);
      ctx.lineTo(x1 + u * 0.003, y + 1);
      ctx.closePath();
    } else if (r.kind === "mansard") {
      ctx.moveTo(x0, y + 1);
      ctx.lineTo(x0 + u * 0.008, y - rise);
      ctx.lineTo(x1 - u * 0.008, y - rise);
      ctx.lineTo(x1, y + 1);
      ctx.closePath();
    } else ctx.rect(x0 - u * 0.003, y - rise, x1 - x0 + u * 0.006, u * 0.006);
    if (r.tower === "hose") {
      const hx = (x0 + x1) / 2;
      const ty = line - (r.h + HOSE) * u;
      ctx.moveTo(hx - u * 0.016, ty + 1);
      ctx.lineTo(hx, ty - u * 0.024);
      ctx.lineTo(hx + u * 0.016, ty + 1);
      ctx.closePath();
    } else if (r.tower === "cupola") {
      const hx = (x0 + x1) / 2;
      const ty = y - rise;
      ctx.rect(hx - u * 0.009, ty - u * 0.026, u * 0.018, u * 0.026 + 1);
      ctx.moveTo(hx - u * 0.014, ty - u * 0.025);
      ctx.lineTo(hx, ty - u * 0.046);
      ctx.lineTo(hx + u * 0.014, ty - u * 0.025);
      ctx.closePath();
    }
  }
  ctx.fill();
  if (windows) {
    ctx.fillStyle = windows;
    ctx.beginPath();
    for (const r of row) {
      const x0 = cx + r.x0 * u;
      const x1 = cx + r.x1 * u;
      if (x1 < 0 || x0 > s.cssW) continue;
      const n = Math.max(1, Math.round((x1 - x0) / (u * 0.026)));
      for (let i = 0; i < n; i++) {
        const wx = x0 + ((i + 0.5) * (x1 - x0)) / n - u * 0.005;
        ctx.rect(wx, line - (r.h - 0.02) * u, u * 0.01, u * 0.016);
        ctx.rect(wx, line - (r.h - 0.05) * u, u * 0.01, u * 0.016);
      }
    }
    ctx.fill();
  }
}

/** The two rows of rooftops behind Main Street, the far one first. */
export function rooftops(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  // The far row's walls only down to where the near row covers them; the near row's all the way down (the gaps in Main Street show it).
  roofs(ctx, s, FAR_ROOFS, line, BACK_LO - 0.01, tone.roofFar, tone.roofFarShade, tone.roofFarTop, null);
  roofs(ctx, s, BACK_ROOFS, line, 0, tone.roofBack, tone.roofBackShade, tone.roofBackTop, tone.roofWindow);
}

// ---------------------------------------------------------------- Main Street

/** One storefront: center X (u), half width, height, which wall ink, its awning (or none), its top, and how many floors. */
interface Shop {
  x: number;
  hw: number;
  h: number;
  wall: 0 | 1 | 2 | 3 | 4;
  awning: -1 | 0 | 1 | 2;
  top: "cornice" | "false" | "pediment";
  floors: 2 | 3;
}

/** The center block, behind the tower: a general store, a hardware store and a diner, printed faint. */
const CENTER: readonly Shop[] = [
  { x: -0.075, hw: 0.08, h: 0.19, wall: 2, awning: 0, top: "cornice", floors: 2 },
  { x: 0.04, hw: 0.045, h: 0.22, wall: 0, awning: -1, top: "cornice", floors: 3 },
  { x: 0.135, hw: 0.05, h: 0.15, wall: 1, awning: 1, top: "false", floors: 2 },
];

/** The church's place in the row (landmarks.ts draws it): the run of storefronts starts at its left wall and runs out past the screen's left edge. */
export const CHURCH_X = -0.33;
export const CHURCH_HW = 0.074;
const TOPS = ["cornice", "false", "pediment"] as const;
const LEFT_RUN: readonly Shop[] = Array.from({ length: 16 }, (_, i) => {
  const hw = 0.038 + hash(i + 3400) * 0.02;
  const floors = (hash(i + 3800) > 0.4 ? 3 : 2) as 2 | 3;
  return {
    x: 0,
    hw,
    h: (floors === 3 ? 0.19 : 0.145) + hash(i + 3500) * 0.035,
    wall: ((i + 1) % 5) as 0 | 1 | 2 | 3 | 4,
    awning: (hash(i + 3600) < 0.25 ? -1 : i % 3) as -1 | 0 | 1 | 2,
    top: TOPS[Math.floor(hash(i + 3700) * 3)]!,
    floors,
  };
}).reduce<Shop[]>((row, shop) => {
  const prev = row[row.length - 1];
  const edge = prev ? prev.x - prev.hw : CHURCH_X - CHURCH_HW;
  row.push({ ...shop, x: edge - shop.hw - 0.004 });
  return row;
}, []);

function wallTone(tone: Tone, wall: number): string {
  return wall === 0 ? tone.brick : wall === 1 ? tone.tan : wall === 2 ? tone.cream : wall === 3 ? tone.sage : tone.blueWall;
}

/** Red, white and blue swags along a line from x0, `swags` of them over `w`, sagging `sag`. */
export function bunting(ctx: Ctx, tone: Tone, x0: number, w: number, y: number, swags: number, sag: number): void {
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) swagBand(ctx, x0 + (i * w) / swags, x0 + ((i + 1) * w) / swags, y, sag, band, 3);
    ctx.fill();
  }
}

/** A pleated fan's pleats: the unit directions of their edges, round the lower half. */
const PLEATS = 7;
const PLEAT = Array.from({ length: PLEATS + 1 }, (_, i) => [Math.cos((i / PLEATS) * Math.PI), Math.sin((i / PLEATS) * Math.PI)] as const);

/** The outline of a pleated fan hung from (x, y), `r` across, as its own subpath (for its keyline up close). */
export function fanEdge(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  for (let i = 1; i <= PLEATS; i++) ctx.lineTo(x + PLEAT[i]![0] * r, y + PLEAT[i]![1] * r);
  ctx.closePath();
}

/**
 * A row of `n` pleated fans of bunting, `r` across, hung from (x0 + i * dx, y): a blue rim round
 * the top with a star, red and cream pleats fanning down. A color at a time over the whole row.
 */
export function pleatedFans(ctx: Ctx, x0: number, dx: number, n: number, y: number, r: number, red: string, white: string, blue: string): void {
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? white : red;
    ctx.beginPath();
    for (let f = 0; f < n; f++) {
      const x = x0 + f * dx;
      for (let i = pass; i < PLEATS; i += 2) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + PLEAT[i]![0] * r, y + PLEAT[i]![1] * r);
        ctx.lineTo(x + PLEAT[i + 1]![0] * r, y + PLEAT[i + 1]![1] * r);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
  const ri = r * 0.42;
  ctx.fillStyle = blue;
  ctx.beginPath();
  for (let f = 0; f < n; f++) {
    const x = x0 + f * dx;
    ctx.moveTo(x + ri, y);
    for (let i = 1; i <= PLEATS; i++) ctx.lineTo(x + PLEAT[i]![0] * ri, y + PLEAT[i]![1] * ri);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = white;
  ctx.beginPath();
  for (let f = 0; f < n; f++) speck(ctx, x0 + f * dx, y + r * 0.2, r * 0.08);
  ctx.fill();
}

/**
 * One storefront: the wall with its shadow plane, its top (a cornice with dentils, a stepped
 * false front, or a pediment), rows of sashes under their lintels, a sign board, the shopfront
 * under a striped awning, a pleated fan high on the front and swags along the sill. `quiet`
 * prints it faint, behind the tower: one pale ink for the wall, its windows a step darker, and
 * nothing else.
 */
function shop(ctx: Ctx, s: Scene, tone: Tone, shp: Shop, line: number, quiet: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x0 = cx + (shp.x - shp.hw) * u;
  const w = shp.hw * 2 * u;
  const h = shp.h * u;
  if (x0 + w < -1 || x0 > s.cssW + 1) return;
  const wall = quiet ? tone.quiet : wallTone(tone, shp.wall);
  const roof = line - h;
  // The wall and its top, and (but behind the tower) the shadow plane down its right side.
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.rect(x0, roof, quiet ? w : w * 0.82, h + 1);
  if (shp.top === "false") {
    // A stepped false front: a raised middle over two shoulders.
    ctx.rect(x0 + w * 0.2, roof - u * 0.015, w * 0.6, u * 0.015 + 1);
    ctx.rect(x0 + w * 0.36, roof - u * 0.028, w * 0.28, u * 0.013 + 1);
  } else if (shp.top === "pediment") {
    ctx.moveTo(x0 - u * 0.004, roof + 1);
    ctx.lineTo(x0 + w / 2, roof - u * 0.026);
    ctx.lineTo(x0 + w + u * 0.004, roof + 1);
    ctx.closePath();
  }
  ctx.fill();
  if (!quiet) {
    ctx.fillStyle = tone.wallShade[shp.wall];
    ctx.fillRect(x0 + w * 0.82, roof, w * 0.18, h + 1);
  }
  const window = quiet ? tone.quietWindow : tone.window;
  // The upper floors: a row of tall sashes a floor.
  const n = Math.max(2, Math.round(w / (u * 0.026)));
  const sf = line - u * 0.068;
  const floorH = (sf - u * 0.016 - roof - u * 0.026) / (shp.floors - 1);
  const sashH = Math.min(u * 0.03, floorH * 0.62);
  ctx.fillStyle = window;
  ctx.beginPath();
  for (let f = 0; f < shp.floors - 1; f++) {
    const wy = roof + u * 0.028 + f * floorH;
    for (let i = 0; i < n; i++) ctx.rect(x0 + ((i + 0.5) * w) / n - u * 0.0058, wy, u * 0.0116, sashH);
  }
  // The shopfront: a wide window and the door.
  ctx.rect(x0 + w * 0.1, sf + u * 0.012, w * 0.5, u * 0.046);
  ctx.rect(x0 + w * 0.66, sf + u * 0.008, w * 0.22, u * 0.06);
  ctx.fill();
  if (quiet) return;
  // The trim: the cornice or the false front's cap, lintels and sills at the sashes, the sign board, the shop window's mullions.
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  if (shp.top === "cornice") ctx.rect(x0 - u * 0.005, roof - u * 0.003, w + u * 0.01, u * 0.011);
  else if (shp.top === "false") ctx.rect(x0 + w * 0.36 - u * 0.003, roof - u * 0.031, w * 0.28 + u * 0.006, u * 0.005);
  else ctx.rect(x0 - u * 0.004, roof - u * 0.002, w + u * 0.008, u * 0.005);
  for (let f = 0; f < shp.floors - 1; f++) {
    const wy = roof + u * 0.028 + f * floorH;
    for (let i = 0; i < n; i++) {
      const wx = x0 + ((i + 0.5) * w) / n;
      ctx.rect(wx - u * 0.008, wy - u * 0.005, u * 0.016, u * 0.004);
      ctx.rect(wx - u * 0.007, wy + sashH, u * 0.014, u * 0.0025);
    }
  }
  ctx.rect(x0 + w * 0.07, sf - u * 0.014, w * 0.86, u * 0.015);
  ctx.rect(x0 + w * 0.35 - u * 0.0012, sf + u * 0.012, u * 0.0024, u * 0.046);
  ctx.fill();
  if (shp.top === "cornice") {
    ctx.fillStyle = tone.wallShade[shp.wall];
    ctx.beginPath();
    for (let x = x0; x < x0 + w - u * 0.004; x += u * 0.008) ctx.rect(x, roof + u * 0.008, u * 0.004, u * 0.005);
    ctx.fill();
  }
  // The sign board's lettering: a line of dashes in the awning's ink.
  ctx.fillStyle = shp.awning >= 0 ? tone.awnings[shp.awning as 0 | 1 | 2] : tone.red;
  ctx.beginPath();
  for (let x = x0 + w * 0.15; x < x0 + w * 0.83; x += u * 0.009) ctx.rect(x, sf - u * 0.01, u * 0.005, u * 0.007);
  ctx.fill();
  // An awning in broad stripes over the shopfront.
  if (shp.awning >= 0) {
    const ay = sf + u * 0.006;
    const k = Math.max(3, Math.round(w / (u * 0.014)) | 1);
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.trim : tone.awnings[shp.awning as 0 | 1 | 2];
      ctx.beginPath();
      for (let i = pass; i < k; i += 2) {
        const a = x0 + w * 0.04 + (i * w * 0.92) / k;
        const b = x0 + w * 0.04 + ((i + 1) * w * 0.92) / k;
        ctx.moveTo(a + w * 0.04 * (1 - (2 * i) / k), ay - u * 0.014);
        ctx.lineTo(b + w * 0.04 * (1 - (2 * (i + 1)) / k), ay - u * 0.014);
        ctx.lineTo(b, ay + u * 0.009);
        ctx.lineTo(a, ay + u * 0.009);
        ctx.closePath();
      }
      ctx.fill();
    }
  }
  // A pleated fan high on the front, and swags along the sill of the first floor up.
  pleatedFans(ctx, x0 + w / 2, 0, 1, roof + u * 0.01, Math.min(w * 0.3, u * 0.02), tone.red, tone.white, tone.blue);
  bunting(ctx, tone, x0 + u * 0.002, w - u * 0.004, sf - u * 0.022, Math.max(1, Math.round(w / (u * 0.035))), u * 0.011);
}

/** Main Street: the run to the left of the church, the quiet center block. */
export function townRow(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = townLine(s);
  for (const shp of LEFT_RUN) shop(ctx, s, tone, shp, line, false);
  for (const shp of CENTER) shop(ctx, s, tone, shp, line, true);
}

// ---------------------------------------------------------------- the big trees

/** Big summer trees in front of the row: X, canopy radius, canopy center height (u above the town's line). */
const TREES = [
  [-0.155, 0.06, 0.13],
  [0.165, 0.055, 0.12],
] as const;

/** The big summer trees in front of the row: a trunk, a canopy of lobes, its shaded underside and lit crown. Printed soft, as they stand by the tower's column. */
export function trees(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const line = townLine(s);
  ctx.fillStyle = tone.trunk;
  ctx.beginPath();
  for (const [X, , h] of TREES) ctx.rect(cx + X * u - u * 0.009, line - h * u, u * 0.018, h * u + 1);
  ctx.fill();
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.treeShade : pass === 1 ? tone.tree : tone.treeLit;
    ctx.beginPath();
    for (const [X, r0, h] of TREES) {
      const x = cx + X * u;
      const r = r0 * u;
      const y = line - h * u;
      if (pass === 0) {
        circle(ctx, x, y + r * 0.08, r);
        circle(ctx, x - r * 0.72, y + r * 0.42, r * 0.7);
        circle(ctx, x + r * 0.72, y + r * 0.38, r * 0.72);
      } else if (pass === 1) {
        circle(ctx, x - r * 0.06, y - r * 0.04, r * 0.92);
        circle(ctx, x - r * 0.76, y + r * 0.3, r * 0.6);
      } else circle(ctx, x - r * 0.3, y - r * 0.36, r * 0.48);
    }
    ctx.fill();
  }
}

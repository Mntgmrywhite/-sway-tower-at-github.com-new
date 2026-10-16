import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import type { Tone } from "./tone";
import { rimTube } from "./tube";

// The bank of night cloud that rolls in under you as you climb: it comes up from the bottom of
// the screen while the sun sets and covers the grid up to just under the glowing horizon line;
// later, deep in the night, it rises over the skyline and the wireframe range, so high up there
// is only the starry sky over a sea of cloud. Two rows of puffs, the far one a shade lighter,
// each traced along its top with a thin neon tube (pink at dusk, cyan by night).

/** Puffs along the bank, repeating every SPAN of them: radius (u) and a small rise (u). */
const SPAN = 9;
const PUFFS = Array.from({ length: SPAN }, (_, i) => ({ r: 0.05 + hash(i + 4200) * 0.03, up: hash(i + 4300) * 0.018 }));
const STEP = 0.082;
/** The near row: lower, smaller puffs, half a step over. */
const NEAR_DROP = 0.075;
const NEAR_K = 0.78;
/** Final heights of the bank's top over the horizon (u): just under the line, then over the range. */
const LOW = -0.012;
const HIGH = 0.33;

/** The y of the bank's top (its highest puffs reach a little above it). */
export function deckTop(s: Scene, tone: Tone): number {
  const below = s.cssH + s.u * 0.14;
  const low = s.horizonY - LOW * s.u;
  const high = s.horizonY - HIGH * s.u;
  return below + (low - below) * tone.deck + (high - low) * tone.deckHigh;
}

/** Below this line the bank hides everything: the dips between its puffs never sink lower
 *  (two of the smallest puffs side by side meet just under the top). */
export function deckCover(s: Scene, tone: Tone): number {
  return deckTop(s, tone) + s.u * 0.008;
}

// Scratch: puff centers and radii for the far (A) and near (B) rows (no per-frame allocation).
// Room for screens up to ~20 u wide (a window 12 times wider than tall), so on a very wide
// desktop window the puffs still run all the way across instead of stopping short.
const MAX = 256;
interface Row {
  x: Float64Array;
  y: Float64Array;
  r: Float64Array;
  n: number;
  /** The highest puff center. */
  top: number;
}
const newRow = (): Row => ({ x: new Float64Array(MAX), y: new Float64Array(MAX), r: new Float64Array(MAX), n: 0, top: 0 });
const FAR_ROW = newRow();
const NEAR_ROW = newRow();

/** Lays out one row of puffs across the screen. */
function layout(row: Row, s: Scene, top: number, k: number, shift: number, drift: number): void {
  const u = s.u;
  const step = u * STEP;
  const off = (drift % (step * SPAN)) + shift * step;
  let n = 0;
  row.top = Infinity;
  for (let j = -SPAN; n < MAX; j++) {
    const x = j * step + off;
    if (x < -step * 1.5) continue;
    const p = PUFFS[((j % SPAN) + SPAN) % SPAN]!;
    const r = p.r * u * k;
    const y = top - p.up * u + r * 0.55;
    row.x[n] = x;
    row.y[n] = y;
    row.r[n] = r;
    row.top = Math.min(row.top, y);
    n++;
    if (x > s.cssW + step * 1.5) break;
  }
  row.n = n;
}

/** Angle on puff a of its upper crossing with puff b. */
function crossing(row: Row, a: number, b: number): number {
  const ax = row.x[a]!;
  const ay = row.y[a]!;
  const dx = row.x[b]! - ax;
  const dy = row.y[b]! - ay;
  const d = Math.hypot(dx, dy);
  const r0 = row.r[a]!;
  const r1 = row.r[b]!;
  const along = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - along * along));
  const mx = ax + (along * dx) / d;
  const my = ay + (along * dy) / d;
  // The two crossings are mid ± h·perp; take the upper one (the smaller y).
  const px = -dy / d;
  const py = dx / d;
  const sign = py > 0 ? -1 : 1;
  return Math.atan2(my + sign * h * py - ay, mx + sign * h * px - ax);
}

/** Fill a row's puffs, and solid below them down to `bottom`. */
function fillRow(ctx: Ctx, s: Scene, row: Row, fill: string, bottom: number): void {
  ctx.beginPath();
  for (let i = 0; i < row.n; i++) circle(ctx, row.x[i]!, row.y[i]!, row.r[i]!);
  ctx.rect(0, row.top, s.cssW, bottom - row.top);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The row's upper envelope as a subpath: each puff's arc between its crossings with its neighbors. */
function envelope(ctx: Ctx, row: Row): void {
  for (let i = 1; i < row.n - 1; i++) {
    const a0 = crossing(row, i, i - 1);
    const a1 = crossing(row, i, i + 1);
    const x = row.x[i]!;
    const y = row.y[i]!;
    const r = row.r[i]!;
    if (i === 1) ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
    ctx.arc(x, y, r, a0, a1);
  }
}

export function deck(ctx: Ctx, s: Scene, tone: Tone): void {
  const top = deckTop(s, tone);
  if (top - s.u * 0.1 > s.cssH) return;
  const drift = s.t * s.u * 0.004;
  layout(FAR_ROW, s, top, 1, 0, drift);
  layout(NEAR_ROW, s, top + s.u * NEAR_DROP, NEAR_K, 0.5, -drift * 0.6);
  // The far row only needs filling down to where the near row's solid part begins. The near
  // puffs never reach up to the far row's rim, so both rims go in one tube at the end.
  const nearShows = NEAR_ROW.top - s.u * 0.07 < s.cssH;
  fillRow(ctx, s, FAR_ROW, tone.deckBody, nearShows ? NEAR_ROW.top + 1 : s.cssH + 2);
  if (nearShows) fillRow(ctx, s, NEAR_ROW, tone.deckDeep, s.cssH + 2);
  ctx.beginPath();
  envelope(ctx, FAR_ROW);
  if (nearShows) envelope(ctx, NEAR_ROW);
  rimTube(ctx, tone.deckRim, Math.max(1, s.u * 0.0028));
}

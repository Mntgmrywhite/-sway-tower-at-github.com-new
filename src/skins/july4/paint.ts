import type { Ctx } from "../../base/draw";

// The storybook's brushwork, shared by the layers. Two costs rule how it is painted (the
// canvas's cost follows the length of anti-aliased edge and the number of fills, and a gradient
// costs by the pixel): big soft washes (the sky, the hills' light) are laid as many thin flat
// bands, which read as one smooth wash; gradients only on small things. Round forms (clouds,
// treetops, bushes) are blobs: a set of round lobes whose outline (the union of the lobes) is
// worked out once into a polygon, so a blob costs one fill of its outline, not one of every lobe;
// a blob is painted in three steps, its shaded underside, its body and the lit caps on its top
// lobes, as a gouache painter rounds a form. Paths only where a helper says so (each subpath its
// own, so many share one fill).

/** A vertical gradient from y0 to y1 through the colors given, evenly spaced (or at `at`): for small things only. */
export function wash(ctx: Ctx, y0: number, y1: number, colors: readonly string[], at?: readonly number[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, Math.max(y0 + 0.5, y1));
  const n = colors.length;
  for (let i = 0; i < n; i++) g.addColorStop(at ? at[i]! : n > 1 ? i / (n - 1) : 0, colors[i]!);
  return g;
}

// ---------------------------------------------------------------- banded washes

function rgbOf(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The colors of a banded wash, worked out for one set of stops (reused while the stops are the same). */
interface BandCache {
  key: string;
  colors: string[];
}
const CACHES = new Map<string, BandCache>();

/** `n` band colors through `colors` at `at` (0..1), each band's color the wash's at its middle. */
function bandColors(id: string, colors: readonly string[], at: readonly number[], n: number): string[] {
  const key = colors.join() + at.join() + n;
  let c = CACHES.get(id);
  if (c && c.key === key) return c.colors;
  const rgb = colors.map(rgbOf);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    let j = 0;
    while (j < at.length - 2 && k > at[j + 1]!) j++;
    const f = Math.min(1, Math.max(0, (k - at[j]!) / Math.max(1e-6, at[j + 1]! - at[j]!)));
    const a = rgb[j]!;
    const b = rgb[j + 1]!;
    out.push(`rgb(${Math.round(a[0] + (b[0] - a[0]) * f)}, ${Math.round(a[1] + (b[1] - a[1]) * f)}, ${Math.round(a[2] + (b[2] - a[2]) * f)})`);
  }
  c = { key, colors: out };
  CACHES.set(id, c);
  return out;
}

/**
 * A smooth vertical wash from y0 to y1 across x0..x1, laid as flat bands about `step` px tall
 * (each band a shade between its neighbors, too close to see). `id` names the wash, so its band
 * colors are reused from frame to frame while its stops hold. Stops ease in from y0 to y1; the
 * area above y0 and below y1 is left to the caller.
 */
export function bands(ctx: Ctx, id: string, x0: number, x1: number, y0: number, y1: number, colors: readonly string[], at: readonly number[], step = 5): void {
  const h = y1 - y0;
  if (h <= 0) return;
  const n = Math.max(2, Math.min(200, Math.round(h / step)));
  const cs = bandColors(id, colors, at, n);
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cs[i]!;
    // Each band runs on under the next by two pixels, so their anti-aliased edges never leave a
    // seam of the background showing between them, at any scale the page is drawn at.
    ctx.fillRect(x0, y0 + i * bh, x1 - x0, bh + 2);
  }
}

// ---------------------------------------------------------------- blobs

/** A round lobe: center and radius, in whatever units the caller scales by. */
export type Lobe = readonly [x: number, y: number, r: number];

/** The top and bottom (in the lobes' units) of a set of lobes. */
export function lobeSpan(list: readonly Lobe[]): readonly [top: number, bottom: number] {
  let top = Infinity;
  let bottom = -Infinity;
  for (const [, y, r] of list) {
    top = Math.min(top, y - r);
    bottom = Math.max(bottom, y + r);
  }
  return [top, bottom];
}

/**
 * A blob worked out from its lobes, in their units: the outline of their union (its top edge
 * left to right, then its bottom edge back), the outline of its lit body (the top edge, then a
 * line `belly` of the way down from it, so the underside below is left in shade), and the lit
 * caps on the lobes that make its top. Lobes must overlap one another left to right (no holes,
 * no overhangs).
 */
export interface Blob {
  outline: Float64Array;
  body: Float64Array;
  caps: readonly (readonly [x: number, y: number, rx: number, ry: number])[];
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** The union's top (sign -1) or bottom (+1) edge at x, or NaN where no lobe covers x. */
function envelope(list: readonly Lobe[], x: number, sign: -1 | 1): number {
  let best = NaN;
  for (const [lx, ly, r] of list) {
    const d = r * r - (x - lx) * (x - lx);
    if (d < 0) continue;
    const y = ly + sign * Math.sqrt(d);
    if (Number.isNaN(best) || (sign < 0 ? y < best : y > best)) best = y;
  }
  return best;
}

/**
 * Works out a blob: `n` samples along it (packed tighter toward its ends, where its edge turns
 * steep), the belly line `belly` of the way down from its top (0.6: the lower two fifths shaded),
 * the bottom flattened by `flat` (0 round, 1 cut flat at its lowest lobe's center: a cumulus's
 * flat base).
 */
export function blob(list: readonly Lobe[], belly = 0.62, flat = 0, n = 44): Blob {
  let left = Infinity;
  let right = -Infinity;
  for (const [x, , r] of list) {
    left = Math.min(left, x - r);
    right = Math.max(right, x + r);
  }
  const [top, bottom] = lobeSpan(list);
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) xs.push(left + ((right - left) * (1 - Math.cos((Math.PI * i) / n))) / 2);
  const tops = xs.map((x) => envelope(list, x, -1));
  const base = bottom - (bottom - top) * 0.22 * flat;
  const bottoms = xs.map((x) => Math.min(envelope(list, x, 1), base));
  // Ends where a sample falls in a gap: close the edge onto its neighbor.
  for (let i = 0; i <= n; i++) {
    if (Number.isNaN(tops[i]!)) tops[i] = i > 0 ? tops[i - 1]! : top;
    if (Number.isNaN(bottoms[i]!)) bottoms[i] = i > 0 ? bottoms[i - 1]! : bottom;
    if (bottoms[i]! < tops[i]!) bottoms[i] = tops[i]!;
  }
  const outline = new Float64Array((n + 1) * 4);
  const body = new Float64Array((n + 1) * 4);
  for (let i = 0; i <= n; i++) {
    outline[i * 2] = xs[i]!;
    outline[i * 2 + 1] = tops[i]!;
    body[i * 2] = xs[i]!;
    body[i * 2 + 1] = tops[i]!;
    const j = n - i;
    const o = (n + 1) * 2 + i * 2;
    outline[o] = xs[j]!;
    outline[o + 1] = bottoms[j]!;
    // The belly line: a set share of the way down, rippling a little, so the shade reads as painted.
    const ripple = Math.sin(xs[j]! * 37 + 1.3) * 0.04;
    body[o] = xs[j]!;
    body[o + 1] = tops[j]! + (bottoms[j]! - tops[j]!) * Math.min(1, belly + ripple);
  }
  // Caps on the lobes whose tops are on the outline (within a hair of the top edge there).
  const caps: [number, number, number, number][] = [];
  for (const [lx, ly, r] of list) {
    const cx = lx - r * 0.22;
    const edge = envelope(list, cx, -1);
    const own = ly - Math.sqrt(Math.max(0, r * r - (cx - lx) * (cx - lx)));
    if (Math.abs(own - edge) > r * 0.12) continue;
    caps.push([cx, ly - r * 0.44, r * 0.56, r * 0.34]);
  }
  return { outline, body, caps, top, bottom, left, right };
}

/** Adds a closed polygon of packed (x, y) pairs, placed at (x, y) and scaled by k (mirrored by m), to the current path. */
export function poly(ctx: Ctx, pts: Float64Array, x: number, y: number, k: number, m: 1 | -1 = 1, ky = k): void {
  ctx.moveTo(x + m * pts[0]! * k, y + pts[1]! * ky);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(x + m * pts[i]! * k, y + pts[i + 1]! * ky);
  ctx.closePath();
}

/** The corners of a unit 12-gon: a soft highlight drawn as one costs half what a true ellipse does. */
const GON = Array.from({ length: 12 }, (_, i) => [Math.cos((i * Math.PI) / 6), Math.sin((i * Math.PI) / 6)] as const);

/** A small ellipse as a 12-gon (its own subpath), turned by `rot`: for highlights and dabs, where the corners never show. */
export function softOval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  for (let i = 0; i < 12; i++) {
    const [gx, gy] = GON[i]!;
    const px = gx * rx;
    const py = gy * ry;
    if (i === 0) ctx.moveTo(x + px * c - py * sn, y + px * sn + py * c);
    else ctx.lineTo(x + px * c - py * sn, y + px * sn + py * c);
  }
  ctx.closePath();
}

/** Adds a blob's lit caps (placed and scaled as `poly`) to the current path. */
export function caps(ctx: Ctx, b: Blob, x: number, y: number, k: number, m: 1 | -1 = 1, ky = k): void {
  for (const [cx, cy, rx, ry] of b.caps) softOval(ctx, x + m * cx * k, y + cy * ky, rx * k, ry * ky, m * -0.25);
}

/** The three colors a blob is painted in: its shaded underside, its body, its lit caps. */
export interface BlobInks {
  shade: string;
  body: string;
  light: string;
}

/** Paints one blob at (x, y), k px to its unit (mirrored by m), its caps at `capAlpha`. */
export function paintBlob(ctx: Ctx, b: Blob, x: number, y: number, k: number, inks: BlobInks, m: 1 | -1 = 1, capAlpha = 0.9, ky = k): void {
  ctx.fillStyle = inks.shade;
  ctx.beginPath();
  poly(ctx, b.outline, x, y, k, m, ky);
  ctx.fill();
  ctx.fillStyle = inks.body;
  ctx.beginPath();
  poly(ctx, b.body, x, y, k, m, ky);
  ctx.fill();
  if (capAlpha <= 0) return;
  ctx.fillStyle = inks.light;
  ctx.globalAlpha = capAlpha;
  ctx.beginPath();
  caps(ctx, b, x, y, k, m, ky);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- rows of rounded tops

/** The top edge of a row of lobes (treetops, hedges), sampled every `step` along it: worked out once. */
export interface Ridge {
  from: number;
  step: number;
  tops: Float64Array;
}

/** Works out a row's top edge from `from` to `to` (the lobes' units): where no lobe covers, it lies on 0. */
export function ridge(list: readonly Lobe[], from: number, to: number, step: number): Ridge {
  const n = Math.ceil((to - from) / step) + 1;
  const tops = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = from + i * step;
    const y = envelope(list, x, -1);
    tops[i] = Number.isNaN(y) ? 0 : Math.min(0, y);
  }
  return { from, step, tops };
}

/**
 * Traces a row's top edge over the screen (its units scaled by k about x = cx, standing on
 * `line`), then down to `bottom` and back: one closed subpath, only the stretch on screen.
 */
export function traceRidge(ctx: Ctx, r: Ridge, cx: number, line: number, k: number, bottom: number, x0: number, x1: number): void {
  const n = r.tops.length;
  const i0 = Math.max(0, Math.floor((x0 - cx) / k / r.step - r.from / r.step) - 1);
  const i1 = Math.min(n - 1, Math.ceil((x1 - cx) / k / r.step - r.from / r.step) + 1);
  if (i1 <= i0) return;
  const at = (i: number) => cx + (r.from + i * r.step) * k;
  ctx.moveTo(at(i0), bottom);
  for (let i = i0; i <= i1; i++) ctx.lineTo(at(i), line + r.tops[i]! * k);
  ctx.lineTo(at(i1), bottom);
  ctx.closePath();
}

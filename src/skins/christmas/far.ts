import { circle, hash, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { SMOKE } from "./colors";
import { ORN_LANE } from "./sky";
import { CONE, firPath, firSnowPath, FIR_HALF, LOLLIPOP, puff, STACKED } from "./shapes";
import { FRONT_Z, HILL_ROWS, MID_Z, smooth, toneOf, type Tone } from "./tone";

// London at dusk on the horizon, cut from paper in rows like the far layers of a 1950s Christmas
// card (flat shapes, no outlines, each row a flatter, paler ink than the one in front of it):
//  - behind it all, two ranges of snowy hills climbing high at the sides, so the city lies in a
//    valley, with stylized firs (cones, stacked cones and lollipop trees) on their crests in the
//    side lanes; the near range is cut in two tones, lit from the left;
//  - the back row: a hazy crowd of rooftops and church spires (needles, tiered steeples, cupolas,
//    pinnacled towers), printed flat with a few windows lit;
//  - the middle row: steep gables, stepped gables, mansards with dormers and chimney stacks
//    bristling with pots, snow on every roof, grids of candlelit windows; a great domed
//    cathedral of our own on its left and a church whose bell swings and rings out on its right,
//    at the edges of the tower's column; out in the lanes a clock tower and a column with a
//    gilded urn, both of our own, whose tops peek over the street's gables at the start;
//  - the front row, deeper and larger, with more of its windows lit and smoke from its stacks;
//  - strips of fog drifting across each row's feet, the streets' gas lamps glowing through them
//    from dusk to dawn; as the night deepens more windows are lit out in the lanes.
// Everything rises toward the side lanes and lies low behind the tower, where the fog all but
// hides it, so the column stays quiet. The back row and the hills stand on the horizon, the
// middle and front rows on the field at MID_Z and FRONT_Z, so the rows spread apart as the tower
// climbs. Their colors follow the story's light (tone.ts): plum-navy at dusk with the windows
// lit, deep navy higher up, a faded teal-grey by day. Shapes are in u: x from the screen's center
// line, y up from the row's line.

/** The rows run this far either side of the center line (u): past the widest zoomed-out screen. */
const EDGE = 1.25;

// ---------------------------------------------------------------- frame

/** Draws in u about (x, y): x right, y down; shapes give y up, so they negate it. */
function frame(ctx: Ctx, x: number, y: number, u: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
}

/**
 * A closed polygon from [x, y, x, y, ...] (y up) as its own subpath, always wound clockwise on
 * the screen like rect() and the rows' buildings, so where it overlaps them in one nonzero fill
 * it adds to them rather than cutting a hole.
 */
function poly(ctx: Ctx, p: readonly number[]): void {
  const n = p.length >> 1;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += p[i * 2]! * p[j * 2 + 1]! - p[j * 2]! * p[i * 2 + 1]!;
  }
  // Wound counter-clockwise with y up, it still looks counter-clockwise on the screen (negating y
  // and the screen's downward y cancel out): draw it backwards.
  const back = area > 0;
  for (let k = 0; k < n; k++) {
    const i = back ? n - 1 - k : k;
    if (k === 0) ctx.moveTo(p[i * 2]!, -p[i * 2 + 1]!);
    else ctx.lineTo(p[i * 2]!, -p[i * 2 + 1]!);
  }
  ctx.closePath();
}

/** Rectangle from its bottom-left corner (y up) as its own subpath. */
function box(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.rect(x, -y - h, w, h);
}

/** How far either side of the center line the screen reaches, in u, with a margin. */
function reach(s: Scene): number {
  return s.cssW / 2 / s.u + 0.06;
}

// ---------------------------------------------------------------- the hills behind

const RIDGE_STEP = 0.035;
const RIDGE_N = Math.round((2 * EDGE) / RIDGE_STEP) + 1;
/** Light falls from the left: the near range's shade plane lies this far right and down of its crest (u). */
const SHADE_DX = 0.03;
const SHADE_DY = 0.014;

function farRange(x: number): number {
  const a = Math.abs(x);
  return 0.03 + 0.4 * smooth(0.16, 0.6, a) * (0.88 + 0.12 * Math.sin(x * 6.1 + 0.9)) + 0.008 * Math.sin(x * 21 + 0.4) * smooth(0.1, 0.3, a);
}
function nearRange(x: number): number {
  return 0.024 + 0.28 * smooth(0.18, 0.62, Math.abs(x)) * (0.78 + 0.22 * Math.sin(x * 8.3 + 2.2));
}

/** The two ranges' crests, and the top of the near range's shade plane, every RIDGE_STEP u. */
const RIDGES = (() => {
  const far = new Float64Array(RIDGE_N);
  const near = new Float64Array(RIDGE_N);
  const shade = new Float64Array(RIDGE_N);
  for (let i = 0; i < RIDGE_N; i++) {
    const x = -EDGE + i * RIDGE_STEP;
    far[i] = farRange(x);
    near[i] = nearRange(x);
    shade[i] = Math.min(near[i]!, nearRange(x - SHADE_DX) - SHADE_DY);
  }
  return { far, near, shade };
})();

/**
 * Firs on the ranges' crests out in the lanes: [x, y (u up from the horizon), height, kind] for
 * the far range and the near range. Slots far enough apart that no two touch; some left empty.
 */
const RIDGE_FIRS = (() => {
  const make = (crest: (x: number) => number, from: number, slot: number, hMin: number, hMax: number, seed: number, stacks: boolean): number[] => {
    const out: number[] = [];
    for (const side of [-1, 1]) {
      for (let j = 0; from + j * slot < EDGE; j++) {
        const i = seed + j * 7 + (side > 0 ? 3 : 0);
        if (hash(i) < 0.22) continue;
        const x = side * (from + j * slot + (hash(i + 1) - 0.5) * slot * 0.25);
        const h = hMin + hash(i + 2) * (hMax - hMin);
        const k = hash(i + 3);
        // Planted a little down the slope, so they stand in the snow. Far off they are plain cones
        // and lollipops; stacked cones only on the nearer range.
        out.push(x, crest(x) - h * 0.1, h, k < 0.8 ? (stacks && k >= 0.45 ? STACKED : CONE) : LOLLIPOP);
      }
    }
    return out;
  };
  return { far: make(farRange, 0.25, 0.04, 0.018, 0.032, 300, false), near: make(nearRange, 0.27, 0.048, 0.03, 0.05, 400, true) };
})();

/** A range's crest from the RIDGES table, closed down to `bottom` (u, y up), across the screen. */
function range(ctx: Ctx, crest: Float64Array, w: number, bottom: number): void {
  const i0 = Math.max(0, Math.floor((-w + EDGE) / RIDGE_STEP));
  const i1 = Math.min(RIDGE_N - 1, Math.ceil((w + EDGE) / RIDGE_STEP));
  ctx.moveTo(-EDGE + i0 * RIDGE_STEP, -bottom);
  for (let i = i0; i <= i1; i++) ctx.lineTo(-EDGE + i * RIDGE_STEP, -crest[i]!);
  ctx.lineTo(-EDGE + i1 * RIDGE_STEP, -bottom);
  ctx.closePath();
}

function firs(ctx: Ctx, list: readonly number[], w: number, body: string, snow: string): void {
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i + 3 < list.length; i += 4) {
      const x = list[i]!;
      const h = list[i + 2]!;
      if (Math.abs(x) + h * FIR_HALF > w) continue;
      if (pass) firSnowPath(ctx, x, -list[i + 1]!, h, list[i + 3]!);
      else firPath(ctx, x, -list[i + 1]!, h, list[i + 3]!, false);
    }
    ctx.fillStyle = pass ? snow : body;
    ctx.fill();
  }
}

/**
 * The snowy hills behind the city, in u about the horizon, down to `bottom`: just below the back
 * row's lowest roof, which covers the rest.
 */
function ridges(ctx: Ctx, tone: Tone, w: number, bottom: number): void {
  ctx.beginPath();
  range(ctx, RIDGES.far, w, bottom);
  ctx.fillStyle = tone.ridge;
  ctx.fill();
  firs(ctx, RIDGE_FIRS.far, w, tone.ridgeFir, tone.ridge);
  ctx.beginPath();
  range(ctx, RIDGES.near, w, bottom);
  ctx.fillStyle = tone.ridgeNear;
  ctx.fill();
  ctx.beginPath();
  range(ctx, RIDGES.shade, w, bottom);
  ctx.fillStyle = tone.ridgeShade;
  ctx.fill();
  firs(ctx, RIDGE_FIRS.near, w, tone.ridgeFir, tone.ridgeNear);
}

// ---------------------------------------------------------------- the rows of the city

/** One building of a row, its shapes worked out once (u, y up from the row's line). */
interface House {
  x0: number;
  x1: number;
  /** Its outline from the top of the left wall over the roof to the top of the right wall. */
  roof: number[];
  /** Stacks, pots, dormers: closed polygons in the row's ink. */
  parts: number[][];
  /** Snow on its roofs and ledges: polylines [x, y, x, y, ...]. */
  snow: number[][];
  /** Lit windows: [x, y, w, h, ...]. */
  lit: number[];
  /** Windows lit as the night deepens, out in the lanes: [x, y, w, h, at, ...], lit once the night is past `at` (0..1). */
  late: number[];
  /** Smoking pots: [x, y, seed, ...]. */
  smoke: number[];
}

interface RowSpec {
  seed: number;
  /** Building widths and wall heights (before the lift), u. */
  w: readonly [number, number];
  h: readonly [number, number];
  /** How the walls rise away from the center line (a factor on h). */
  lift: (x: number) => number;
  /** The share of buildings that are churches with a spire (out of the tower's column). */
  spires: number;
  /** Window size and the gap round it (u), and the share lit. */
  win: readonly [number, number, number];
  litShare: number;
  /** The further share lit by deep night (never behind the tower). */
  lateShare: number;
  /** The snow's thickness on the roofs (u), or 0 for none. */
  snow: number;
  /** Whether smoke rises from its pots. */
  smokes: boolean;
}

/**
 * Behind the tower (buildings whose middle is within CALM u of the center line) only this share
 * of the windows a building would have lit are, and no smoke rises, so the column stays calm.
 */
const CALM = 0.2;
const CALM_LIT = 0.3;

/** A window grid on a wall x0..x1 up to h; lit ones go to `lit`, those lit as the night deepens to `late`. */
function windowGrid(lit: number[], late: number[], x0: number, x1: number, h: number, spec: RowSpec, seed: number): void {
  const [ww, wh, gap] = spec.win;
  const calm = Math.abs(x0 + x1) / 2 < CALM;
  const share = spec.litShare * (calm ? CALM_LIT : 1);
  const more = calm ? 0 : spec.lateShare;
  const cols = Math.max(1, Math.floor((x1 - x0 - gap) / (ww + gap)));
  const span = cols * ww + (cols - 1) * gap;
  const left = (x0 + x1 - span) / 2;
  let row = 0;
  for (let y = h - gap * 1.2 - wh; y > gap * 0.6; y -= wh + gap * 1.3, row++) {
    for (let c = 0; c < cols; c++) {
      const v = hash(seed + row * 11 + c * 3);
      if (v <= share) lit.push(left + c * (ww + gap), y, ww, wh);
      else if (v <= share + more) late.push(left + c * (ww + gap), y, ww, wh, (v - share) / more);
    }
  }
}

/** A church: its tower rising from the middle of the building, crowned by one of four steeples. */
function spireHouse(house: House, h: number, spec: RowSpec, r: (k: number) => number): void {
  const { x0, x1, roof, lit } = house;
  const snow = spec.snow > 0 ? house.snow : [];
  const mid = (x0 + x1) / 2;
  const tw = 0.014 + r(10) * 0.008;
  const th = h + 0.035 + r(11) * 0.045;
  const a = mid - tw / 2;
  const b = mid + tw / 2;
  roof.push(a, h, a, th);
  const kind = r(12);
  if (kind < 0.35) {
    // A needle spire.
    roof.push(mid, th + 0.06 + r(13) * 0.05);
  } else if (kind < 0.6) {
    // A tiered steeple: two shrinking stages and a short needle.
    const s1 = tw * 0.36;
    const s2 = tw * 0.22;
    roof.push(a + tw * 0.14, th, a + tw * 0.14, th + 0.018, mid - s1, th + 0.018, mid - s1, th + 0.033, mid - s2, th + 0.033, mid, th + 0.06);
    roof.push(mid + s2, th + 0.033, mid + s1, th + 0.033, mid + s1, th + 0.018, b - tw * 0.14, th + 0.018, b - tw * 0.14, th);
  } else if (kind < 0.82) {
    // A cupola: a dome on the tower, a finial on the dome.
    const r0 = tw * 0.5;
    for (let k = 0; k <= 6; k++) {
      const t = Math.PI - (k / 6) * Math.PI;
      roof.push(mid + Math.cos(t) * r0, th + Math.sin(t) * r0 * 1.15);
      if (k === 3) roof.push(mid - 0.0015, th + r0 * 1.15, mid, th + r0 * 1.15 + 0.014, mid + 0.0015, th + r0 * 1.15);
    }
  } else {
    // A pinnacled tower: four slim pinnacles round a low parapet.
    const p = tw * 0.16;
    roof.push(a, th + 0.02, a + p / 2, th + 0.03, a + p, th + 0.02, a + p, th + 0.008, b - p, th + 0.008, b - p, th + 0.02, b - p / 2, th + 0.03, b, th + 0.02);
  }
  roof.push(b, th, b, h);
  snow.push([x0 - 0.002, h, a, h], [b, h, x1 + 0.002, h]);
  // A lit belfry opening and a window down the tower.
  lit.push(mid - tw * 0.18, th - 0.016, tw * 0.36, 0.01);
  if (spec.litShare > 0.3) lit.push(mid - tw * 0.15, h + 0.008, tw * 0.3, 0.012);
}

/** A row of buildings from -EDGE to EDGE, laid out once. */
function buildRow(spec: RowSpec): House[] {
  const out: House[] = [];
  let x = -EDGE;
  for (let i = 0; x < EDGE; i++) {
    const r = (k: number) => hash(spec.seed + i * 17 + k);
    const w = spec.w[0] + r(0) * (spec.w[1] - spec.w[0]);
    const x1 = x + w;
    const mid = x + w / 2;
    const smokes = spec.smokes && Math.abs(mid) >= CALM;
    const h = (spec.h[0] + r(1) * (spec.h[1] - spec.h[0])) * spec.lift(mid);
    const house: House = { x0: x, x1, roof: [x, h], parts: [], snow: [], lit: [], late: [], smoke: [] };
    const { roof, parts, lit, smoke } = house;
    // The hazy back row is printed flat, without snow on its roofs.
    const snow = spec.snow > 0 ? house.snow : [];
    const kind = r(2);
    const e = spec.snow * 0.5;
    if (spec.spires > 0 && Math.abs(mid) > 0.13 && r(9) < spec.spires) {
      spireHouse(house, h, spec, r);
    } else if (kind < 0.36) {
      // A steep gable, now and then a chimney stack on its slope.
      const rise = w * (0.5 + r(3) * 0.3);
      roof.push(mid, h + rise);
      snow.push([x - e, h - e, mid, h + rise, x1 + e, h - e]);
      if (r(4) > 0.45) {
        const side = r(5) > 0.5 ? 1 : -1;
        const cx = mid + side * w * 0.24;
        const at = h + rise * 0.52;
        const sw = Math.max(0.009, w * 0.16);
        parts.push([cx - sw / 2, at - 0.01, cx + sw / 2, at - 0.01, cx + sw / 2, at + 0.026, cx - sw / 2, at + 0.026]);
        snow.push([cx - sw / 2 - e, at + 0.026, cx + sw / 2 + e, at + 0.026]);
        if (smokes && r(6) > 0.5) smoke.push(cx, at + 0.03, r(7));
      }
      // A little round window in the gable.
      if (r(8) > 0.55 && rise > 0.02) lit.push(mid - spec.win[0] * 0.4, h + rise * 0.3, spec.win[0] * 0.8, spec.win[0] * 0.8);
    } else if (kind < 0.52) {
      // A stepped (crow-stepped) gable.
      const st = w * 0.14;
      const sh = Math.min(0.016, w * 0.22);
      roof.push(x + st, h, x + st, h + sh, x + st * 2, h + sh, x + st * 2, h + sh * 2, mid - st * 0.6, h + sh * 2, mid - st * 0.6, h + sh * 3);
      roof.push(mid + st * 0.6, h + sh * 3, mid + st * 0.6, h + sh * 2, x1 - st * 2, h + sh * 2, x1 - st * 2, h + sh, x1 - st, h + sh, x1 - st, h);
      snow.push([x + st, h + sh, x + st * 2, h + sh], [x + st * 2, h + sh * 2, mid - st * 0.6, h + sh * 2], [mid - st * 0.6, h + sh * 3, mid + st * 0.6, h + sh * 3]);
      snow.push([mid + st * 0.6, h + sh * 2, x1 - st * 2, h + sh * 2], [x1 - st * 2, h + sh, x1 - st, h + sh]);
    } else if (kind < 0.76) {
      // A flat roof behind a parapet, a chimney stack bristling with pots.
      const sx = x + w * (0.2 + r(3) * 0.45);
      const sw = Math.max(0.014, w * 0.3);
      const sh = 0.014 + r(4) * 0.012;
      parts.push([sx, h - 0.002, sx + sw, h - 0.002, sx + sw, h + sh, sx, h + sh]);
      const pots = 2 + Math.floor(r(5) * 3);
      for (let k = 0; k < pots; k++) {
        const px = sx + (sw * (k + 0.5)) / pots;
        parts.push([px - 0.0022, h + sh - 0.001, px + 0.0022, h + sh - 0.001, px + 0.0022, h + sh + 0.008, px - 0.0022, h + sh + 0.008]);
        if (smokes && k === 1 && r(6) > 0.4) smoke.push(px, h + sh + 0.01, r(7));
      }
      snow.push([x - e, h, x1 + e, h], [sx - e * 0.5, h + sh, sx + sw + e * 0.5, h + sh]);
    } else {
      // A mansard with dormers.
      const mh = Math.min(0.032, w * 0.34);
      roof.push(x + w * 0.1, h + mh, x1 - w * 0.1, h + mh);
      snow.push([x - e, h - e, x + w * 0.1, h + mh, x1 - w * 0.1, h + mh, x1 + e, h - e]);
      const n = w > 0.06 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const dx = x + (w * (k + 1)) / (n + 1);
        const dw = Math.min(0.016, w * 0.22);
        const dh = mh * 0.62;
        parts.push([dx - dw / 2, h + mh * 0.15, dx + dw / 2, h + mh * 0.15, dx + dw / 2, h + mh * 0.15 + dh, dx, h + mh * 0.15 + dh + dw * 0.45, dx - dw / 2, h + mh * 0.15 + dh]);
        snow.push([dx - dw / 2 - e * 0.5, h + mh * 0.15 + dh, dx, h + mh * 0.15 + dh + dw * 0.45, dx + dw / 2 + e * 0.5, h + mh * 0.15 + dh]);
        if (r(10 + k) < spec.litShare + 0.15) lit.push(dx - dw * 0.27, h + mh * 0.2, dw * 0.54, dh * 0.62);
      }
    }
    roof.push(x1, h);
    windowGrid(lit, house.late, x + w * 0.08, x1 - w * 0.08, h, spec, spec.seed * 3 + i * 29);
    out.push(house);
    x = x1;
  }
  return out;
}

/** Walls rise toward the side lanes from `low` behind the tower to `low + rise` out in the lanes. */
function lift(low: number, rise: number, from: number, to: number): (x: number) => number {
  return (x) => low + rise * smooth(from, to, Math.abs(x));
}

/** The back row's lowest walls (u) and how far they are lifted behind the tower: below that the row covers the hills behind it everywhere. */
const BACK_H = [0.04, 0.075] as const;
const BACK_LIFT = 0.6;
const BACK_SPEC: RowSpec = { seed: 8000, w: [0.034, 0.07], h: BACK_H, lift: lift(BACK_LIFT, 1.5, 0.1, 0.55), spires: 0.36, win: [0.005, 0.006, 0.012], litShare: 0.18, lateShare: 0.12, snow: 0, smokes: false };
const BACK = buildRow(BACK_SPEC);
const MID_SPEC: RowSpec = { seed: 8600, w: [0.045, 0.08], h: [0.04, 0.07], lift: lift(0.45, 1.45, 0.12, 0.6), spires: 0.08, win: [0.0065, 0.009, 0.008], litShare: 0.42, lateShare: 0.3, snow: 0.004, smokes: false };
const MID = buildRow(MID_SPEC);
const FRONT_SPEC: RowSpec = { seed: 9200, w: [0.055, 0.095], h: [0.045, 0.072], lift: lift(0.32, 1.3, 0.14, 0.62), spires: 0, win: [0.008, 0.011, 0.009], litShare: 0.5, lateShare: 0.28, snow: 0.005, smokes: true };
const FRONT = buildRow(FRONT_SPEC);

/** How far down the hills behind are drawn (u, y up): a little under the back row's lowest roofline. */
const BACK_LOW = BACK_H[0] * BACK_LIFT - 0.008;

/** Windows twinkle off now and then, each on its own: off while this sine dips below OFF. */
const OFF = -0.93;

/** Whether a building shows within half-width w. */
function shows(h: House, w: number): boolean {
  return h.x1 >= -w && h.x0 <= w;
}

/**
 * A row of the city on its line, in u (the frame already set), down to `bottom`, across
 * half-width w: the buildings in its ink, then their lit windows (more of them out in the lanes as
 * the `night` deepens) and the snow on their roofs (`snowW` thick, if any).
 */
function row(ctx: Ctx, s: Scene, list: readonly House[], w: number, bottom: number, ink: string, light: string, snowInk: string, snowW: number, night: number): void {
  ctx.beginPath();
  // The ground under the row in one piece, and on it the row's skyline as one outline (each
  // building's roof running into the next), then the stacks and dormers.
  ctx.rect(-w, 0, w * 2, -bottom);
  let first = true;
  let end = 0;
  for (const h of list) {
    if (!shows(h, w)) continue;
    if (first) ctx.moveTo(h.x0, 0.002);
    first = false;
    for (let i = 0; i + 1 < h.roof.length; i += 2) ctx.lineTo(h.roof[i]!, -h.roof[i + 1]!);
    end = h.x1;
  }
  ctx.lineTo(end, 0.002);
  ctx.closePath();
  for (const h of list) if (shows(h, w)) for (const p of h.parts) poly(ctx, p);
  ctx.fillStyle = ink;
  ctx.fill();

  ctx.beginPath();
  let n = 0;
  for (const h of list) {
    if (!shows(h, w)) continue;
    for (let i = 0; i + 3 < h.lit.length; i += 4, n++) {
      if (Math.sin(s.t * 0.27 + n * 1.7 + h.x0 * 40) < OFF) continue;
      ctx.rect(h.lit[i]!, -h.lit[i + 1]! - h.lit[i + 3]!, h.lit[i + 2]!, h.lit[i + 3]!);
    }
    const late = h.late;
    for (let i = 0; i + 4 < late.length; i += 5) {
      if (late[i + 4]! > night) continue;
      ctx.rect(late[i]!, -late[i + 1]! - late[i + 3]!, late[i + 2]!, late[i + 3]!);
    }
  }
  ctx.fillStyle = light;
  ctx.fill();
  if (snowW <= 0) return;
  // The snow on the roofs: flat slabs, square-ended.
  ctx.beginPath();
  for (const h of list) {
    if (!shows(h, w)) continue;
    for (const p of h.snow) {
      ctx.moveTo(p[0]!, -p[1]!);
      for (let i = 2; i + 1 < p.length; i += 2) ctx.lineTo(p[i]!, -p[i + 1]!);
    }
  }
  ctx.strokeStyle = snowInk;
  ctx.lineWidth = snowW;
  ctx.lineCap = "butt";
  ctx.lineJoin = "bevel";
  ctx.stroke();
}

/** Thin smoke rising from the pots of a row: flat puffs. */
function rowSmoke(ctx: Ctx, s: Scene, list: readonly House[], w: number): void {
  ctx.beginPath();
  for (const h of list) {
    if (!shows(h, w)) continue;
    const sm = h.smoke;
    for (let i = 0; i + 2 < sm.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const p = (s.t * 0.12 + k / 3 + sm[i + 2]!) % 1;
        puff(ctx, sm[i]! + p * 0.025, -sm[i + 1]! - p * 0.04, 0.003 + 0.005 * p);
      }
    }
  }
  ctx.fillStyle = SMOKE;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the streets' gas lamps

/**
 * The city's gas lamps, lit at dusk: a string of small warm points along each near row's street,
 * glowing through the fog at its feet, out in the lanes only. Per row: how far apart (u), how big
 * (u) and how high above the row's line (u).
 */
const LAMP_ROWS = {
  mid: [0.026, 0.0026, 0.004],
  front: [0.032, 0.0034, 0.005],
} as const;
/** Each lamp's place along its row, jittered a little off the even spacing (a fraction of it). */
const LAMP_JITTER = 0.3;

/** The gas lamps along a row's street at screen y, out to half-width w (u), at `lit` (0..1). */
function streetLamps(ctx: Ctx, s: Scene, y: number, w: number, spec: readonly [number, number, number], seed: number, light: string, lit: number): void {
  if (lit <= 0.02) return;
  const [gap, r, up] = spec;
  const u = s.u;
  const cx = s.cssW / 2;
  const py = y - up * u;
  ctx.beginPath();
  for (let i = 1; i * gap < w; i++) {
    for (const side of [-1, 1]) {
      const d = (i + (hash(seed + i * 2 + (side > 0 ? 1 : 0)) - 0.5) * LAMP_JITTER) * gap;
      if (d < CALM) continue;
      puff(ctx, cx + side * d * u, py, r * u);
    }
  }
  ctx.fillStyle = light;
  ctx.globalAlpha = lit;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- fog

/**
 * Strips of fog drifting across the rows' feet, flat rounded bands of the dusk's haze:
 * [height above its row's line (u), thickness (u), length (u), drift (u per second), phase].
 * One lies over the back row, one over the middle row's feet, one over the front row's.
 */
const FOG_STRIPS = [
  [0.035, 0.018, 0.95, 0.008, 0.1],
  [0.012, 0.02, 1.15, -0.006, 0.55],
  [0.006, 0.016, 0.85, 0.01, 0.3],
] as const;

/** Each strip's ends taper over this many half-thicknesses; its top rises in humps this high (half-thicknesses), about FOG_HUMP_W long (u). */
const FOG_TAPER = 3;
const FOG_HUMP_W = 0.07;
const FOG_HUMPS = FOG_STRIPS.map(([, , len], i) => Array.from({ length: Math.max(2, Math.round(len / FOG_HUMP_W)) }, (_, k) => 0.45 + hash(i * 31 + k + 8800) * 0.6));

function fogStrip(ctx: Ctx, s: Scene, tone: Tone, y0: number, i: number): void {
  const [up, thick, len, drift, phase] = FOG_STRIPS[i]!;
  const u = s.u;
  const L = len * u;
  const span = s.cssW + L;
  const x = ((((phase * span + s.t * drift * u) % span) + span) % span) - L;
  const y = y0 - up * u;
  const r = (thick * u) / 2;
  const humps = FOG_HUMPS[i]!;
  const end = r * FOG_TAPER;
  ctx.beginPath();
  // Two pieces a screen apart, so the strip wraps round smoothly. Each a flat-bottomed bank of
  // fog: tapered ends and a top edge of low rounded humps, like a cut-paper cloud ribbon.
  for (const x0 of [x, x - span]) {
    if (x0 > s.cssW || x0 + L < 0) continue;
    const top = y - r;
    ctx.moveTo(x0, y + r);
    ctx.lineTo(x0 + L, y + r);
    ctx.quadraticCurveTo(x0 + L - r, top, x0 + L - end, top);
    const w = (L - end * 2) / humps.length;
    for (let k = 0; k < humps.length; k++) {
      const xa = x0 + L - end - k * w;
      ctx.quadraticCurveTo(xa - w / 2, top - r * humps[k]! * 2, xa - w, top);
    }
    ctx.quadraticCurveTo(x0 + r, top, x0, y + r);
    ctx.closePath();
  }
  ctx.fillStyle = tone.fog;
  ctx.fill();
}

// ---------------------------------------------------------------- the cathedral

const DOME_X = -0.2;

/** The cathedral of our own: a long body with a pediment, west towers, a colonnaded drum, a ribbed dome, a lantern, ball and cross. */
function cathedral(ctx: Ctx, tone: Tone): void {
  // The body, the towers' shafts, the drum and the dome, in the middle row's ink.
  ctx.beginPath();
  box(ctx, -0.118, 0, 0.236, 0.066);
  poly(ctx, [-0.034, 0.066, 0, 0.088, 0.034, 0.066]);
  for (const tx of [-0.118, 0.088]) {
    box(ctx, tx, 0, 0.03, 0.112);
    // A cupola and finial on each tower.
    ctx.moveTo(tx + 0.004, -0.112);
    ctx.ellipse(tx + 0.015, -0.112, 0.011, 0.016, 0, Math.PI, 0);
    ctx.closePath();
    box(ctx, tx + 0.0135, 0.126, 0.003, 0.014);
  }
  box(ctx, -0.06, 0.064, 0.12, 0.058);
  box(ctx, -0.052, 0.12, 0.104, 0.018);
  ctx.moveTo(-0.052, -0.137);
  ctx.ellipse(0, -0.137, 0.052, 0.066, 0, Math.PI, 0);
  ctx.closePath();
  box(ctx, -0.0095, 0.196, 0.019, 0.026);
  ctx.moveTo(-0.011, -0.222);
  ctx.ellipse(0, -0.222, 0.011, 0.012, 0, Math.PI, 0);
  ctx.closePath();
  puff(ctx, 0, -0.238, 0.0045);
  box(ctx, -0.0018, 0.238, 0.0036, 0.024);
  box(ctx, -0.008, 0.252, 0.016, 0.0034);
  ctx.fillStyle = tone.landmark;
  ctx.fill();

  // The shade plane: the right of the body, the towers and the drum, and the dome's right side, ribbed.
  ctx.beginPath();
  box(ctx, 0.04, 0, 0.078, 0.066);
  box(ctx, 0.104, 0, 0.014, 0.112);
  box(ctx, -0.104, 0, 0.014, 0.112);
  box(ctx, 0.03, 0.064, 0.03, 0.058);
  box(ctx, 0.026, 0.12, 0.026, 0.018);
  ctx.moveTo(0.012, -0.137);
  ctx.ellipse(0, -0.137, 0.052, 0.066, 0, 0, -Math.PI / 2 + 0.22, true);
  ctx.quadraticCurveTo(0.026, -0.17, 0.012, -0.137);
  ctx.closePath();
  ctx.fillStyle = tone.landmarkShade;
  ctx.fill();
  // The dome's ribs.
  ctx.beginPath();
  for (const k of [-0.62, -0.28, 0.06]) {
    ctx.moveTo(k * 0.052, -0.137);
    ctx.quadraticCurveTo(k * 0.05, -0.19, 0, -0.203);
  }
  ctx.strokeStyle = tone.landmarkShade;
  ctx.lineWidth = 0.0028;
  ctx.stroke();

  // Lit: the colonnade's gaps, the body's arched windows, the towers' belfries, a rose window.
  ctx.beginPath();
  for (let i = 0; i < 7; i++) box(ctx, -0.049 + i * 0.0155, 0.07, 0.0058, 0.034);
  // Its arched windows, pointed like lancets.
  for (const wx of [-0.086, -0.072, -0.058, 0.046, 0.06, 0.074]) poly(ctx, [wx, 0.014, wx + 0.0065, 0.014, wx + 0.0065, 0.036, wx + 0.00325, 0.041, wx, 0.036]);
  for (const tx of [-0.118, 0.088]) box(ctx, tx + 0.011, 0.084, 0.008, 0.016);
  puff(ctx, 0, -0.074, 0.0055);
  ctx.fillStyle = tone.cityLight;
  ctx.fill();

  // Snow: a scalloped cap on the dome's crown, the ledges, the towers' cupolas, the pediment.
  ctx.beginPath();
  ctx.moveTo(-0.034, -0.18);
  ctx.quadraticCurveTo(0, -0.215, 0.034, -0.18);
  for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(0.034 - k * 0.017 - 0.0085, -0.17, 0.034 - (k + 1) * 0.017, -0.18);
  ctx.closePath();
  box(ctx, -0.063, 0.12, 0.126, 0.0045);
  box(ctx, -0.055, 0.138, 0.11, 0.0042);
  box(ctx, -0.12, 0.064, 0.24, 0.0045);
  for (const tx of [-0.118, 0.088]) {
    ctx.moveTo(tx + 0.006, -0.12);
    ctx.ellipse(tx + 0.015, -0.12, 0.0095, 0.008, 0, Math.PI, 0);
    ctx.closePath();
    box(ctx, tx - 0.002, 0.11, 0.034, 0.004);
  }
  poly(ctx, [-0.038, 0.066, 0, 0.091, 0.038, 0.066, 0.032, 0.066, 0, 0.085, -0.032, 0.066]);
  ctx.fillStyle = tone.citySnow;
  ctx.fill();
}

// ---------------------------------------------------------------- the church and its bell

const STEEPLE_X = 0.215;
const BELL_PERIOD = 7; // seconds per peal cycle; the first peal starts at s.t = 0
const BELL_RING = 3.2; // seconds of each cycle the bell swings

/** 0..1: how hard the bell is swinging at time t (0 between peals). */
export function bellOn(t: number): number {
  const p = ((t % BELL_PERIOD) + BELL_PERIOD) % BELL_PERIOD;
  return p < BELL_RING ? Math.sin((p / BELL_RING) * Math.PI) : 0;
}

/** The bell's angle at time t. */
function bellAngle(t: number): number {
  const p = ((t % BELL_PERIOD) + BELL_PERIOD) % BELL_PERIOD;
  return Math.sin(p * 5.2) * 0.55 * bellOn(t);
}

/**
 * The church: a nave out on the lane side under a snowy roof, and a tiered steeple: a tower with
 * a lit clock, an open belfry with the bell swinging in lamplight, two stages and a needle spire.
 */
function church(ctx: Ctx, s: Scene, tone: Tone, u: number): void {
  // The nave, the tower, the stages and the spire.
  ctx.beginPath();
  box(ctx, 0.02, 0, 0.085, 0.058);
  poly(ctx, [0.016, 0.058, 0.062, 0.094, 0.109, 0.058]);
  box(ctx, -0.026, 0, 0.052, 0.15);
  box(ctx, -0.022, 0.148, 0.01, 0.05);
  box(ctx, 0.012, 0.148, 0.01, 0.05);
  box(ctx, -0.022, 0.188, 0.044, 0.012);
  box(ctx, -0.016, 0.198, 0.032, 0.021);
  box(ctx, -0.011, 0.217, 0.022, 0.018);
  poly(ctx, [-0.008, 0.234, 0, 0.325, 0.008, 0.234]);
  box(ctx, -0.0012, 0.322, 0.0024, 0.02);
  box(ctx, -0.0065, 0.333, 0.013, 0.0024);
  ctx.fillStyle = tone.landmark;
  ctx.fill();
  // The shade plane: the tower's right face, the right of the stages and the spire, the nave's end.
  ctx.beginPath();
  box(ctx, 0.012, 0, 0.014, 0.15);
  box(ctx, 0.008, 0.198, 0.008, 0.021);
  box(ctx, 0.005, 0.217, 0.006, 0.018);
  poly(ctx, [0, 0.234, 0, 0.325, 0.008, 0.234]);
  box(ctx, 0.088, 0, 0.017, 0.058);
  ctx.fillStyle = tone.landmarkShade;
  ctx.fill();

  // Inside the belfry: lamplight with the bell swinging in it; the clock, the lancets, the nave's windows.
  ctx.beginPath();
  box(ctx, -0.012, 0.15, 0.024, 0.038);
  circle(ctx, 0, -0.128, 0.0125);
  box(ctx, -0.005, 0.064, 0.01, 0.024);
  box(ctx, -0.005, 0.024, 0.01, 0.024);
  for (const wx of [0.032, 0.048, 0.064]) box(ctx, wx, 0.016, 0.0068, 0.024);
  box(ctx, -0.003, 0.203, 0.006, 0.01);
  ctx.fillStyle = tone.cityLight;
  ctx.fill();
  const b = 0.0105;
  ctx.save();
  ctx.translate(0, -0.185);
  ctx.rotate(bellAngle(s.t));
  ctx.beginPath();
  // A bell as a flat trapezoid with a rounded crown, and its clapper.
  ctx.moveTo(-b * 0.5, b * 0.35);
  ctx.lineTo(-b * 1.05, b * 2);
  ctx.lineTo(b * 1.05, b * 2);
  ctx.lineTo(b * 0.5, b * 0.35);
  ctx.quadraticCurveTo(0, -b * 0.2, -b * 0.5, b * 0.35);
  ctx.closePath();
  circle(ctx, 0, b * 2.2, b * 0.3);
  ctx.fillStyle = tone.landmarkShade;
  ctx.fill();
  ctx.restore();
  // The clock's hands.
  ctx.beginPath();
  ctx.moveTo(0, -0.128);
  ctx.lineTo(0, -0.137);
  ctx.moveTo(0, -0.128);
  ctx.lineTo(0.006, -0.126);
  ctx.strokeStyle = tone.landmarkShade;
  ctx.lineWidth = Math.max(1, u * 0.0025) / u;
  ctx.lineCap = "round";
  ctx.stroke();

  // Snow on the ledges and the nave's roof.
  ctx.beginPath();
  box(ctx, -0.029, 0.148, 0.058, 0.005);
  box(ctx, -0.025, 0.198, 0.05, 0.0045);
  box(ctx, -0.018, 0.217, 0.036, 0.004);
  box(ctx, -0.013, 0.233, 0.026, 0.004);
  poly(ctx, [0.012, 0.056, 0.062, 0.096, 0.113, 0.056, 0.106, 0.056, 0.062, 0.088, 0.02, 0.056]);
  ctx.fillStyle = tone.citySnow;
  ctx.fill();

  // While it swings, arcs of sound spread from the belfry and fade.
  const on = bellOn(s.t);
  if (on > 0.02) {
    const p = (s.t * 0.9) % 1;
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const q = (p + k * 0.5) % 1;
      const r = 0.03 + q * 0.07;
      ctx.moveTo(Math.cos(-0.5) * r, -0.169 + Math.sin(-0.5) * r);
      ctx.arc(0, -0.169, r, -0.5, 0.5);
      ctx.moveTo(-Math.cos(-0.5) * r, -0.169 + Math.sin(-0.5) * r);
      ctx.arc(0, -0.169, r, Math.PI + 0.5, Math.PI - 0.5, true);
    }
    ctx.strokeStyle = tone.cityLight;
    ctx.globalAlpha = 0.6 * on;
    ctx.lineWidth = Math.max(1.2, u * 0.004) / u;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- landmarks in the lanes

/** Out in the lanes, behind the near houses' gables at the start: a clock tower on the left, a column on the right. */
const CLOCK_X = -0.36;
const COLUMN_X = 0.36;
/** The column's shaft, from its plinth up to the balcony (u). */
const COLUMN_SHAFT = 0.235;

/**
 * A Victorian clock tower of our own: a slim shaft with lit lancets, a clock stage with a cream
 * face and corner pinnacles, a steep pyramid roof with a finial; lit from the left.
 */
function clockTower(ctx: Ctx, tone: Tone): void {
  ctx.beginPath();
  box(ctx, -0.017, 0, 0.034, 0.24);
  box(ctx, -0.022, 0.236, 0.044, 0.046);
  for (const px of [-0.022, 0.016]) poly(ctx, [px, 0.282, px + 0.006, 0.282, px + 0.003, 0.3]);
  poly(ctx, [-0.019, 0.282, 0, 0.345, 0.019, 0.282]);
  box(ctx, -0.0012, 0.343, 0.0024, 0.016);
  ctx.fillStyle = tone.landmark;
  ctx.fill();
  ctx.beginPath();
  box(ctx, 0.007, 0, 0.01, 0.24);
  box(ctx, 0.01, 0.236, 0.012, 0.046);
  poly(ctx, [0, 0.282, 0, 0.345, 0.019, 0.282]);
  ctx.fillStyle = tone.landmarkShade;
  ctx.fill();
  // The clock's face and the lancets down the shaft, lit.
  ctx.beginPath();
  puff(ctx, 0, -0.259, 0.0135);
  for (let i = 0; i < 3; i++) poly(ctx, [-0.004, 0.06 + i * 0.055, 0.004, 0.06 + i * 0.055, 0.004, 0.084 + i * 0.055, 0, 0.09 + i * 0.055, -0.004, 0.084 + i * 0.055]);
  ctx.fillStyle = tone.cityLight;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -0.259);
  ctx.lineTo(0, -0.27);
  ctx.moveTo(0, -0.259);
  ctx.lineTo(0.007, -0.255);
  ctx.strokeStyle = tone.landmarkShade;
  ctx.lineWidth = 0.0024;
  ctx.lineCap = "round";
  ctx.stroke();
  // Snow on the ledges and the roof's foot.
  ctx.beginPath();
  box(ctx, -0.025, 0.234, 0.05, 0.004);
  box(ctx, -0.024, 0.281, 0.048, 0.004);
  ctx.fillStyle = tone.citySnow;
  ctx.fill();
}

/**
 * A memorial column of our own: a plinth, a slim fluted shaft, a balcony at its capital and a
 * gilded urn with flames of gold on top; lit from the left.
 */
function column(ctx: Ctx, tone: Tone): void {
  const top = COLUMN_SHAFT + 0.04;
  ctx.beginPath();
  box(ctx, -0.02, 0, 0.04, 0.032);
  box(ctx, -0.015, 0.032, 0.03, 0.008);
  box(ctx, -0.008, 0.04, 0.016, COLUMN_SHAFT);
  box(ctx, -0.014, top, 0.028, 0.008);
  box(ctx, -0.009, top + 0.008, 0.018, 0.01);
  ctx.fillStyle = tone.landmark;
  ctx.fill();
  ctx.beginPath();
  box(ctx, 0.008, 0, 0.012, 0.032);
  box(ctx, 0.002, 0.04, 0.006, COLUMN_SHAFT);
  ctx.fillStyle = tone.landmarkShade;
  ctx.fill();
  // The urn and its flames, gilded.
  const u0 = top + 0.018;
  ctx.beginPath();
  poly(ctx, [-0.007, u0, 0.007, u0, 0.01, u0 + 0.012, 0.005, u0 + 0.021, -0.005, u0 + 0.021, -0.01, u0 + 0.012]);
  poly(ctx, [-0.008, u0 + 0.021, -0.004, u0 + 0.038, -0.001, u0 + 0.028, 0.002, u0 + 0.047, 0.004, u0 + 0.029, 0.008, u0 + 0.039, 0.007, u0 + 0.021]);
  ctx.fillStyle = tone.cityLight;
  ctx.fill();
  // Snow on the plinth and the balcony.
  ctx.beginPath();
  box(ctx, -0.022, 0.031, 0.044, 0.0045);
  box(ctx, -0.016, top + 0.007, 0.032, 0.004);
  ctx.fillStyle = tone.citySnow;
  ctx.fill();
}

// ---------------------------------------------------------------- the layer

/**
 * How high each part reaches above its line (u), smoke and snow included, so a part the climb has
 * sunk below the screen is not drawn: the hills behind, the middle row with its spires and the
 * church's needle, the front row's gables.
 */
const TOP = { hills: 0.46, mid: 0.37, front: 0.25 } as const;

/**
 * How high the hills behind and the back row rise in the sky's left lane (ORN_LANE, where the
 * ornamental flakes drift down: sky.ts), firs and spires included, in u above the horizon.
 */
const LANE_BACK = (() => {
  const [outer, inner] = [-ORN_LANE[0], -ORN_LANE[1]];
  let top = 0;
  for (let i = 0; i < RIDGE_N; i++) {
    const x = -EDGE + i * RIDGE_STEP;
    if (x >= outer - RIDGE_STEP && x <= inner + RIDGE_STEP) top = Math.max(top, RIDGES.far[i]!, RIDGES.near[i]!);
  }
  for (const list of [RIDGE_FIRS.far, RIDGE_FIRS.near]) {
    for (let i = 0; i + 3 < list.length; i += 4) {
      const x = list[i]!;
      const h = list[i + 2]!;
      if (x + h * FIR_HALF >= outer && x - h * FIR_HALF <= inner) top = Math.max(top, list[i + 1]! + h);
    }
  }
  for (const h of BACK) {
    if (h.x1 < outer || h.x0 > inner) continue;
    for (const pts of [h.roof, ...h.parts]) for (let i = 1; i < pts.length; i += 2) top = Math.max(top, pts[i]!);
  }
  return top;
})();

/**
 * Screen y of the top of the far land in the sky's left lane (the hills, the back row, the
 * middle row with the clock tower, the front row with its smoke), so the ornamental flakes keep
 * clear of it.
 */
export function laneTop(s: Scene): number {
  const u = s.u;
  return Math.min(s.horizonY - u * LANE_BACK, fieldY(s, MID_Z) - u * TOP.mid, fieldY(s, FRONT_Z) - u * TOP.front);
}

/** The hills, the city's three rows with the landmarks in the middle one, and fog across their feet. */
export function far(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  if (hy - s.u * TOP.hills > s.cssH) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const tone = toneOf(s);
  const w = reach(s);
  const midY = fieldY(s, MID_Z);
  const frontY = fieldY(s, FRONT_Z);
  // Each row comes down to the next one's line, but no further than just past the screen's bottom.
  const below = (y: number) => Math.min(y, s.cssH) + 1;
  const hillY = fieldY(s, HILL_ROWS[HILL_ROWS.length - 1]!.z);

  // On the horizon: the hills and the back row, down to the middle row's line.
  frame(ctx, cx, hy, u);
  const toMid = -(below(midY) - hy) / u;
  ridges(ctx, tone, w, BACK_LOW);
  row(ctx, s, BACK, w, toMid, tone.cityBack, tone.cityWindow, tone.citySnow, BACK_SPEC.snow, tone.night);
  ctx.restore();
  fogStrip(ctx, s, tone, hy, 0);

  // The middle row, with the cathedral and the church; fog at its feet.
  if (midY - u * TOP.mid < s.cssH) {
    frame(ctx, cx + CLOCK_X * u, midY, u);
    clockTower(ctx, tone);
    ctx.restore();
    frame(ctx, cx + COLUMN_X * u, midY, u);
    column(ctx, tone);
    ctx.restore();
    frame(ctx, cx + DOME_X * u, midY, u);
    cathedral(ctx, tone);
    ctx.restore();
    frame(ctx, cx + STEEPLE_X * u, midY, u);
    church(ctx, s, tone, u);
    ctx.restore();
    frame(ctx, cx, midY, u);
    row(ctx, s, MID, w, -(below(frontY) - midY) / u, tone.cityMid, tone.cityLight, tone.citySnow, MID_SPEC.snow, tone.night);
    ctx.restore();
    fogStrip(ctx, s, tone, midY, 1);
    streetLamps(ctx, s, midY, w, LAMP_ROWS.mid, 8700, tone.cityLight, tone.lamps);
  }

  // The front row, down to the farthest hills' line; fog at its feet.
  if (frontY - u * TOP.front < s.cssH) {
    frame(ctx, cx, frontY, u);
    row(ctx, s, FRONT, w, -(below(hillY) - frontY) / u, tone.city, tone.cityLight, tone.citySnow, FRONT_SPEC.snow, tone.night);
    rowSmoke(ctx, s, FRONT, w);
    ctx.restore();
    fogStrip(ctx, s, tone, frontY, 2);
    streetLamps(ctx, s, frontY, w, LAMP_ROWS.front, 9300, tone.cityLight, tone.lamps);
  }
}

import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import type { Tone } from "./tone";

// The Atlantic, out on the right, after the owner's photos: past the meadow the land comes down
// to a bay of deep blue sea, running back to the far shore at the holy mountain's foot. Out of it
// rises a headland, its green top dropping in a cliff of dark layered rock, ledges catching the
// light, yellow lichen on them, a sea cave at its foot and the surf breaking white along it, its
// shadow lying in the water below; a hooker with rust-red sails rides at anchor before it, its
// reflection broken in the swell. The water is rippled in rows of little wavy lines, as an
// illuminator draws water, and the sun glints here and there on it. All of it lies out in the
// side lane, right of the tower's column: the bay's shore never comes into it.
//
// Positions are in u from the screen center, depths in u below the horizon (negative is up).

/** The bay's far shore (under the back hills) and how far toward you it runs (covered by the near meadow's brow). */
const SEA_TOP = 0.026;
const SEA_BOTTOM = 0.32;
/** The paler water out toward the far shore reaches this deep. */
const SEA_FAR = 0.046;
/** The shore on the left: where it leaves the far shore, and where it meets the near meadow's brow (X, depth). */
const SHORE_TOP_X = 0.205;
const SHORE_BOT_X = 0.262;

/** The headland: its left end (X), its top's height, its waterline (depth below the horizon). */
const HEAD_X = 0.25;
const WATERLINE = 0.064;
/** The grass cap on its top (u thick). */
const CAP = 0.012;
/** The surf moves only right of this (u from the center): clear of the tower's column. */
const SURF_STILL = 0.275;

/** Its top at X: a green rise, a little higher toward the right. */
export function headTop(X: number): number {
  const k = Math.max(0, Math.min(1, (X - HEAD_X) / 0.2));
  return -0.032 - 0.014 * k * k * (3 - 2 * k) + 0.002 * Math.sin(X * 47);
}

/** The x of the shore at depth d below the horizon. */
function shoreX(s: Scene, d: number): number {
  const k = (d - SEA_TOP) / (SEA_BOTTOM - SEA_TOP);
  return s.cssW / 2 + (SHORE_TOP_X + (SHORE_BOT_X - SHORE_TOP_X) * Math.sqrt(Math.max(0, k))) * s.u;
}

/**
 * The waves: rows of ripples across the bay, each a smooth line of WAVE_HALF little crests and
 * troughs: [depth (u), size of a half-wave (u)] per row, the rows further apart and the ripples
 * bigger toward you. Along a row they repeat every WAVE_PITCH half-waves (from WAVE_X, u from
 * the center, so they line up alike on any width), every other row shifted half a pitch, give
 * or take a little.
 */
const WAVE_HALF = 5;
const WAVE_PITCH = 7.5;
const WAVE_X = 0.27;
const WAVE_ROWS = [0.12, 0.138, 0.158, 0.18, 0.204, 0.23, 0.258].map((d) => [d, 0.005 + d * 0.045] as const);
/** Glints of the sun on the water: [X (fraction across), depth (u)], twinkling in turn. */
const GLINTS = Array.from({ length: 9 }, (_, i) => [hash(i + 7800), SEA_FAR + 0.06 + hash(i + 7810) * 0.17] as const);

/** The sea, from the far shore to under the near meadow's brow, right of the shore: paler far out, deep blue nearer. */
function water(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const right = s.cssW + 1;
  const low = Math.min(bottom, hz + SEA_BOTTOM * u);
  ctx.fillStyle = tone.sea;
  ctx.beginPath();
  ctx.moveTo(shoreX(s, SEA_TOP), hz + SEA_TOP * u);
  for (let d = SEA_TOP + 0.02; d < SEA_BOTTOM; d += 0.02) ctx.lineTo(shoreX(s, d), hz + d * u);
  ctx.lineTo(shoreX(s, SEA_BOTTOM), hz + SEA_BOTTOM * u);
  ctx.lineTo(right, hz + SEA_BOTTOM * u);
  ctx.lineTo(right, hz + SEA_TOP * u);
  ctx.closePath();
  ctx.fill();
  if (low <= hz + SEA_TOP * u) return;
  ctx.fillStyle = tone.seaFar;
  ctx.beginPath();
  ctx.moveTo(shoreX(s, SEA_TOP), hz + SEA_TOP * u);
  ctx.lineTo(shoreX(s, SEA_FAR), hz + SEA_FAR * u);
  ctx.lineTo(right, hz + SEA_FAR * u);
  ctx.lineTo(right, hz + SEA_TOP * u);
  ctx.closePath();
  ctx.fill();
  // Its line along the far shore, a little paler still.
  ctx.fillStyle = tone.seaLine;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(shoreX(s, SEA_TOP), hz + SEA_TOP * u, right, Math.max(1, u * 0.003));
  ctx.globalAlpha = 1;
}

/** The ripples and the sun's glints on the water: across the bay right of the shore. */
function waves(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const hz = s.horizonY;
  const x0 = s.cssW / 2 + SHORE_BOT_X * u + u * 0.012;
  const span = s.cssW - x0 - u * 0.012;
  ctx.beginPath();
  const boat = s.cssW / 2 + BOAT_X * u;
  for (let j = 0; j < WAVE_ROWS.length; j++) {
    const [d, r] = WAVE_ROWS[j]!;
    const k = r * u;
    const half = k * WAVE_HALF * 0.5;
    const y = hz + d * u;
    const near = Math.abs(d - BOAT_D) < 0.03;
    for (let i = 0; ; i++) {
      const x = s.cssW / 2 + WAVE_X * u + (i + (j % 2) * 0.5 + (hash(i * 13 + j + 7720) - 0.5) * 0.3) * WAVE_PITCH * k;
      if (x + half > s.cssW - u * 0.01) break;
      if (x - half < shoreX(s, d) + u * 0.012) continue;
      // None runs behind the hooker's hull.
      if (near && Math.abs(x - boat) < half + BOAT_L * u * 0.7) continue;
      let px = x - half;
      ctx.moveTo(px, y);
      for (let h = 0; h < WAVE_HALF; h++, px += k) ctx.quadraticCurveTo(px + k / 2, y + (h % 2 ? 1 : -1) * k * 0.7, px + k, y);
    }
  }
  ctx.strokeStyle = tone.seaLine;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Glints: each flashes in turn, a little four-point star.
  ctx.fillStyle = tone.surf;
  ctx.beginPath();
  for (let i = 0; i < GLINTS.length; i++) {
    const k = Math.sin(s.t * 1.7 + i * 2.3);
    if (k < 0.55) continue;
    const [f, d] = GLINTS[i]!;
    const x = x0 + f * span;
    const y = hz + d * u;
    const r = u * 0.006 * (k - 0.5) * 2;
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r * 0.18, y - r * 0.18);
    ctx.lineTo(x, y - r);
    ctx.lineTo(x + r * 0.18, y - r * 0.18);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.18, y + r * 0.18);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.18, y + r * 0.18);
    ctx.closePath();
  }
  ctx.fill();
}

/** The shore on the left of the bay: a strip of pale sand and a line of foam along it (still: it runs close to the tower's column). */
function shore(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const hz = s.horizonY;
  ctx.beginPath();
  ctx.moveTo(shoreX(s, SEA_TOP), hz + SEA_TOP * u);
  for (let d = SEA_TOP + 0.02; d < SEA_BOTTOM; d += 0.02) ctx.lineTo(shoreX(s, d), hz + d * u);
  ctx.strokeStyle = tone.sand;
  ctx.lineWidth = Math.max(1.2, u * 0.0055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = tone.surf;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.beginPath();
  for (let d = SEA_TOP + 0.03; d < SEA_BOTTOM; d += 0.02) {
    ctx.moveTo(shoreX(s, d) + 0.009 * u, hz + d * u);
    ctx.lineTo(shoreX(s, d + 0.014) + 0.009 * u, hz + (d + 0.014) * u);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the headland

/** Strata in the cliff, as fractions of the way down its face: each a ledge, lit along its top and shaded under. */
const STRATA = [0.2, 0.36, 0.55, 0.72, 0.86] as const;
/** Lichen on the ledges: [X offset (u past the headland's end), stratum]. */
const LICHEN = Array.from({ length: 10 }, (_, i) => [0.03 + hash(i + 7900) * 0.3, Math.floor(hash(i + 7910) * STRATA.length)] as const);

/** The headland's outline (top, then down its right edge to the waterline and back along it to its end, up the end cliff), as a new path. */
function headPath(ctx: Ctx, s: Scene, right: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const x0 = cx + HEAD_X * u;
  ctx.beginPath();
  ctx.moveTo(x0, hz + headTop(HEAD_X) * u);
  for (let x = x0 + u * 0.02; x < right; x += u * 0.02) ctx.lineTo(x, hz + headTop((x - cx) / u) * u);
  ctx.lineTo(right, hz + headTop((right - cx) / u) * u);
  ctx.lineTo(right, hz + WATERLINE * u);
  ctx.lineTo(x0 - u * 0.012, hz + WATERLINE * u);
  ctx.quadraticCurveTo(x0 - u * 0.016, hz + (WATERLINE - 0.04) * u, x0 - u * 0.002, hz + (headTop(HEAD_X) + 0.01) * u);
  ctx.closePath();
}

/**
 * The headland: the cliff of dark rock (its end, turned to the sun, a shade lighter), its strata
 * (each ledge lit along its top, shaded under), lichen, a sea cave; the green cap along its top
 * in a fine contour; the surf along its foot (it swells and settles), and its shadow in the water.
 */
function headland(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const right = s.cssW + 1;
  const x0 = cx + HEAD_X * u;
  const water = hz + WATERLINE * u;
  // Its shadow in the water: dark ripples under the cliff.
  ctx.fillStyle = tone.cliffShade;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const y = water + u * (0.006 + i * 0.008);
    const inset = u * (0.01 + hash(i + 7950) * 0.03);
    ctx.rect(x0 - u * 0.008 + inset, y, right - x0 - inset, Math.max(1, u * (0.0045 - i * 0.0005)));
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  headPath(ctx, s, right);
  ctx.fillStyle = tone.cliff;
  ctx.fill();
  // The end of the headland, turned to the sun.
  ctx.fillStyle = tone.cliffLit;
  ctx.beginPath();
  ctx.moveTo(x0 - u * 0.012, water);
  ctx.quadraticCurveTo(x0 - u * 0.016, water - u * 0.04, x0 - u * 0.002, hz + (headTop(HEAD_X) + 0.01) * u);
  ctx.lineTo(x0 + u * 0.008, hz + (headTop(HEAD_X) + 0.014) * u);
  ctx.quadraticCurveTo(x0 + u * 0.002, water - u * 0.035, x0 + u * 0.004, water);
  ctx.closePath();
  ctx.fill();
  // The strata: ledges across the face, lit on top, a shadow under each.
  const face = (k: number, X: number) => hz + (headTop(X) + CAP + (WATERLINE - headTop(X) - CAP) * k) * u;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let j = 0; j < STRATA.length; j++) {
      const k = STRATA[j]!;
      let pen = false;
      for (let x = x0 + u * 0.01; x < right; x += u * 0.018) {
        const X = (x - cx) / u;
        const gap = hash(Math.round(x / (u * 0.018)) * 7 + j * 131 + 7960) < 0.16;
        const y = face(k, X) + Math.sin(X * 90 + j) * u * 0.0018 + (pass ? u * 0.0042 : 0);
        if (gap) pen = false;
        else if (pen) ctx.lineTo(x, y);
        else {
          ctx.moveTo(x, y);
          pen = true;
        }
      }
    }
    ctx.strokeStyle = pass ? tone.cliffShade : tone.cliffLit;
    ctx.lineWidth = Math.max(1, u * (pass ? 0.0035 : 0.0028));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  // Joints down the face between the ledges, and the sea cave at its foot.
  ctx.fillStyle = tone.cliffShade;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const X = HEAD_X + 0.02 + hash(i + 7970) * 0.3;
    const j = Math.floor(hash(i + 7980) * (STRATA.length - 1));
    const x = cx + X * u;
    if (x > right) continue;
    const y0 = face(STRATA[j]!, X) + u * 0.004;
    const y1 = face(STRATA[j + 1]!, X);
    ctx.rect(x, y0, Math.max(1, u * 0.0028), y1 - y0);
  }
  const cave = cx + (HEAD_X + 0.085) * u;
  ctx.moveTo(cave - u * 0.016, water);
  ctx.quadraticCurveTo(cave - u * 0.015, water - u * 0.026, cave, water - u * 0.027);
  ctx.quadraticCurveTo(cave + u * 0.015, water - u * 0.026, cave + u * 0.016, water);
  ctx.closePath();
  ctx.fill();
  // Yellow lichen on the ledges.
  ctx.fillStyle = tone.lichen;
  ctx.beginPath();
  for (const [dx, j] of LICHEN) {
    const X = HEAD_X + dx;
    const x = cx + X * u;
    if (x > right - u * 0.01) continue;
    oval(ctx, x, face(STRATA[j]!, X) - u * 0.0025, u * 0.007, u * 0.0022);
  }
  ctx.fill();
  // The green cap along its top, its ragged edge hanging over the cliff, in a fine contour.
  ctx.beginPath();
  ctx.moveTo(x0 - u * 0.004, hz + headTop(HEAD_X) * u);
  for (let x = x0; x < right; x += u * 0.02) ctx.lineTo(x, hz + headTop((x - cx) / u) * u);
  ctx.lineTo(right, hz + headTop((right - cx) / u) * u);
  ctx.lineTo(right, hz + (headTop((right - cx) / u) + CAP) * u);
  let i = 0;
  for (let x = right; x > x0; x -= u * 0.012, i++) {
    const X = (x - cx) / u;
    ctx.lineTo(x, hz + (headTop(X) + CAP * (0.7 + 0.6 * hash(i + 7990))) * u);
  }
  ctx.lineTo(x0 - u * 0.004, hz + (headTop(HEAD_X) + CAP * 0.8) * u);
  ctx.closePath();
  ctx.fillStyle = tone.fields[1];
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 - u * 0.004, hz + headTop(HEAD_X) * u);
  for (let x = x0; x < right; x += u * 0.02) ctx.lineTo(x, hz + headTop((x - cx) / u) * u);
  ctx.lineTo(right, hz + headTop((right - cx) / u) * u);
  ctx.strokeStyle = tone.hillLine;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();
  // The surf: a white band of foam along the foot of the cliff, swelling and settling (but
  // for its end nearest the tower, which stays still).
  const swell = 0.5 + 0.5 * Math.sin(s.t * 1.3);
  const still = cx + SURF_STILL * u;
  ctx.fillStyle = tone.surf;
  ctx.beginPath();
  for (let x = x0 - u * 0.02, k = 0; x < right + u * 0.02; k++) {
    const big = hash(k + 8100);
    const r = u * (0.003 + 0.0055 * big * big + 0.003 * (x < still ? 0.5 : swell) * hash(k + 8110));
    circle(ctx, x, water - r * (0.1 + 0.5 * hash(k + 8120)), r);
    x += r * (1.1 + hash(k + 8130));
  }
  ctx.rect(x0 - u * 0.02, water - u * 0.002, right - x0 + u * 0.02, u * 0.004);
  ctx.fill();
}

// ---------------------------------------------------------------- the hooker

/** A sailing boat of the west, at anchor on the bay: where it rides (X, depth of its waterline) and its size (u). */
const BOAT_X = 0.33;
const BOAT_D = 0.142;
const BOAT_L = 0.05;
/** The strips of its sails' reflection. */
const REFLECTION = 3;

/**
 * A hooker riding at anchor on the bay, rocking gently on the swell: a black tarred hull, a tall
 * mast with its big rust-red gaff mainsail and a jib before it, in a fine dark contour, its
 * reflection broken in the water under it, a line of foam along its waterline.
 */
export function hooker(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + BOAT_X * u;
  const y = s.horizonY + (BOAT_D + 0.002 * Math.sin(s.t * 1.1)) * u;
  const L = BOAT_L * u;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.05 * Math.sin(s.t * 1.1 + 0.8));
  // The sails: the gaff mainsail aft of the mast (its far half in shade), the jib before it.
  const mast = -L * 0.12;
  const top = -L * 1.25;
  ctx.beginPath();
  ctx.moveTo(mast, -L * 0.2);
  ctx.lineTo(mast, top + L * 0.12);
  ctx.lineTo(mast + L * 0.55, top + L * 0.3);
  ctx.lineTo(mast + L * 0.62, -L * 0.22);
  ctx.closePath();
  ctx.fillStyle = tone.sail;
  ctx.fill();
  ctx.fillStyle = tone.sailShade;
  ctx.beginPath();
  ctx.moveTo(mast + L * 0.3, -L * 0.21);
  ctx.lineTo(mast + L * 0.3, top + L * 0.22);
  ctx.lineTo(mast + L * 0.55, top + L * 0.3);
  ctx.lineTo(mast + L * 0.62, -L * 0.22);
  ctx.closePath();
  ctx.moveTo(mast - L * 0.05, -L * 0.24);
  ctx.lineTo(mast - L * 0.05, top + L * 0.2);
  ctx.lineTo(-L * 0.55, -L * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(mast, -L * 0.2);
  ctx.lineTo(mast, top + L * 0.12);
  ctx.lineTo(mast + L * 0.55, top + L * 0.3);
  ctx.lineTo(mast + L * 0.62, -L * 0.22);
  ctx.closePath();
  ctx.moveTo(mast - L * 0.05, -L * 0.24);
  ctx.lineTo(mast - L * 0.05, top + L * 0.2);
  ctx.lineTo(-L * 0.55, -L * 0.2);
  ctx.closePath();
  ctx.strokeStyle = tone.hull;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.lineJoin = "round";
  ctx.stroke();
  // The mast.
  ctx.fillStyle = tone.mast;
  ctx.fillRect(mast - u * 0.0016, top, u * 0.0032, L * 1.1);
  // The hull: a deep black sheer, the bow raised on the left, the transom on the right.
  ctx.beginPath();
  ctx.moveTo(-L * 0.62, -L * 0.3);
  ctx.quadraticCurveTo(-L * 0.1, -L * 0.15, L * 0.6, -L * 0.24);
  ctx.lineTo(L * 0.52, 0);
  ctx.quadraticCurveTo(0, L * 0.06, -L * 0.42, 0);
  ctx.closePath();
  ctx.fillStyle = tone.hull;
  ctx.fill();
  ctx.restore();
  // Its reflection, broken by the swell: the dark hull, then the sails in strips, fainter and
  // narrower further down, each shimmering a little from side to side.
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = tone.hull;
  ctx.fillRect(x - L * 0.45, y + u * 0.0015, L * 0.95, u * 0.004);
  ctx.fillStyle = tone.sail;
  for (let i = 0; i < REFLECTION; i++) {
    ctx.globalAlpha = 0.4 - i * 0.1;
    const w = L * (0.6 - i * 0.13);
    ctx.fillRect(x + L * 0.05 - w / 2 + Math.sin(s.t * 1.7 + i * 2) * u * 0.002, y + u * (0.008 + i * 0.006), w, u * 0.0035);
  }
  ctx.globalAlpha = 1;
  // Foam along its waterline.
  ctx.fillStyle = tone.surf;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x - L * 0.55, y - u * 0.0015, L * 1.15, u * 0.003);
  ctx.globalAlpha = 1;
}

/** The bay and its headland, back to front (the near meadow's brow covers the sea's near edge: far.ts). */
export function coast(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  water(ctx, s, tone, bottom);
  shore(ctx, s, tone);
  waves(ctx, s, tone);
  headland(ctx, s, tone);
  hooker(ctx, s, tone);
}

/** The near meadow's brow meets the bay from here rightward (X, u from the center): rocks and surf along it. */
export const BAY_X = SHORE_BOT_X;

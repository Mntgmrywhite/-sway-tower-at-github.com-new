import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { archPath, block } from "./shapes";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon, in three depths. Furthest, the Alps: a hazy blue
// range all along the horizon, a broad snow-topped massif on the left, the great horn right of
// center (its snowy summit shows over the festival tent's roof) and a lesser peak on the right. In
// front of them the foothills, a dark ridge of pine forest with a few lit tops. Then the
// village and the fair along the horizon at either side of the tent: on the right the
// onion-domed church and a half-timbered house (their windows lit by night); on the left the
// Ferris wheel turning slowly (its bulbs lit by night) and the chain carousel, its chairs
// flying out round the crown as it turns. Both rides stand low enough to keep below the
// massif's ridge behind them, so when the sun sets behind the Alps nothing of the fair ever
// passes in front of it. Below them the festival meadow, lighter far off, with picnic tables on
// the left (benches, folk sat at them under a sunshade) and round hay bales on the right.
// Above the start a floor of mist gathers below you and covers the meadow: from then on its
// puffy top is the horizon, and the peaks, the steeple and the rides stand out of it. Then it
// sinks with them to rest low on the screen, and there it stays for good, a calm sea of cloud
// with the Alps standing out of it, for the sun to set into and rise out of on every turn of
// the story's loop (tone.ts). The village stands a little way down the meadow in front of the
// foothills' foot (VILLAGE_FOOT), low enough that the mist buries the nave and the house whole:
// the lane comes down right over their roofs, and only the steeple, which the lane keeps clear
// of, stands out of the mist. All of it is faded and flat, with no outline, and nothing here
// moves but the rides (out at the left, clear of the tower).
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Once it has covered the land, the mist sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 70;

/**
 * The line the mist lies along once it has gathered, and the mountains stand on: the horizon
 * while the land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  return horizon + (s.cssH - s.u * FLOOR_REST - horizon) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the mist's top edge is: below the screen at the start, at the horizon once you are above it, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(14, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/**
 * The land below shows only until the mist covers it (`top` is the mist's top edge); once it
 * has, it stays covered as the mist sinks to its rest.
 */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < DAY_HIGH && top > s.horizonY + s.u * 0.02;
}

/** The line the far things stand on: the real horizon while the land shows, then the mist's line as it sinks to rest. */
export function farLine(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}

/** Below this (u under the floor's top) the mist is solid. */
const FLOOR_SOLID = 0.06;
/** The far range's base line, u below the far line (the foothills cover it). */
const MOUNT_BASE = 0.03;
/** The foothills' base, u below the far line (the meadow begins there). */
const HILL_BASE = 0.045;

/**
 * Where the sky stops: below this the foothills and meadow, or the mist, cover everything
 * (painted a little past it: fills that only meet at a fractional pixel leave a seam).
 */
export function skyBottom(s: Scene, top: number): number {
  return (landShows(s, top) ? s.horizonY + s.u * HILL_BASE : top + s.u * FLOOR_SOLID) + s.u * 0.02;
}

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled behind the mountains at either side: [X (u from center), height above the horizon (u), radius (u)]. */
const BANK = [
  [-0.74, 0.14, 0.13],
  [-0.61, 0.17, 0.1],
  [0.56, 0.18, 0.1],
  [0.68, 0.12, 0.13],
] as const;

/** Soft white clouds piled along the horizon far out at either side, behind the Alps, in the hour's cloud colors. */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      // On a wider screen the banks keep to its sides.
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
    }
    if (pass === 0) {
      ctx.rect(-1, hz - u * 0.06, Math.max(0, Math.min(cx - u * 0.4, u * 0.1)) + 1, u * 0.12);
      ctx.rect(Math.max(cx + u * 0.4, s.cssW - u * 0.1), hz - u * 0.06, s.cssW, u * 0.12);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the Alps

/** The far range: a low hazy ridge all along the horizon (height above its base, u). */
function rangeHeight(X: number): number {
  return 0.1 + 0.03 * Math.sin(X * 6.3 + 0.7) + 0.018 * Math.sin(X * 13.1 + 2.1) + 0.01 * Math.sin(X * 29 + 0.3);
}

/** A peak: where it stands (u from center), its height and half width (u), the snow line (fraction of its height), the lit face's width (fraction of the half width). */
interface Peak {
  X: number;
  H: number;
  HW: number;
  snow: number;
  /** Sharpness: 1 a straight cone, more a concave horn. */
  horn: number;
  /** A shoulder on the right flank: height fraction, where (fraction of the half width). */
  shoulder: number;
  shoulderAt: number;
}

/** The massif on the left, the great horn right of center (over the tent's roof), the lesser peak on the right. */
const MASSIF: Peak = { X: -0.33, H: 0.3, HW: 0.3, snow: 0.6, horn: 1, shoulder: 0.72, shoulderAt: 0.5 };
export const HORN: Peak = { X: 0.1, H: 0.42, HW: 0.3, snow: 0.56, horn: 1.5, shoulder: 0.5, shoulderAt: 0.62 };
const LESSER: Peak = { X: 0.5, H: 0.26, HW: 0.22, snow: 0.62, horn: 1.2, shoulder: 0, shoulderAt: 0.5 };
const PEAKS = [MASSIF, LESSER, HORN] as const;

/** Height of a peak at X (u above its base). */
function peakHeight(p: Peak, X: number): number {
  const d = (X - p.X) / p.HW;
  const a = Math.abs(d);
  if (a >= 1) return 0;
  const k = 1 - a;
  let h = p.H * Math.pow(k, p.horn) * (1 + 0.025 * Math.sin(X * 47 + p.X * 9));
  if (p.shoulder > 0 && d > 0) {
    // A shoulder on the right flank: the slope flattens into a ledge, then falls on.
    const sh = p.H * p.shoulder * (1 - Math.abs(d - p.shoulderAt) / (1 - p.shoulderAt));
    h = Math.max(h, sh * (1 + 0.03 * Math.sin(X * 60)));
  }
  return h;
}

/** A row of mountains along `height`, filled down to the base. */
function ridge(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, x0: number, x1: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(x0, base + u * 0.02);
  for (let x = x0; ; x += u * 0.01) {
    const X = (Math.min(x, x1) - cx) / u;
    ctx.lineTo(Math.min(x, x1), base - u * height(X));
    if (x >= x1) break;
  }
  ctx.lineTo(x1, base + u * 0.02);
  ctx.closePath();
}

/** Scratch for the peaks' profiles, so drawing one allocates nothing. */
const PROFILE = { p: MASSIF };
function profileHeight(X: number): number {
  return peakHeight(PROFILE.p, X);
}

/** One peak: its rock, the lit face on its left flank, and the snow on its summit with a jagged lower edge. */
function peak(ctx: Ctx, s: Scene, tone: Tone, p: Peak, base: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const l = Math.max(-1, cx + (p.X - p.HW) * u);
  const r = Math.min(s.cssW + 1, cx + (p.X + p.HW) * u);
  if (r <= l) return;
  PROFILE.p = p;
  ctx.fillStyle = tone.rock;
  ridge(ctx, s, base, profileHeight, l, r);
  ctx.fill();
  // The lit face: the left flank up to the summit, then down a line inside the right flank.
  const top = base - p.H * u;
  const px = cx + p.X * u;
  ctx.fillStyle = tone.rockLit;
  ctx.beginPath();
  ctx.moveTo(l, base + 1);
  for (let x = l; x < px; x += u * 0.01) ctx.lineTo(x, base - u * peakHeight(p, (x - cx) / u));
  ctx.lineTo(px, top);
  ctx.lineTo(px + u * 0.02, base - u * p.H * 0.55);
  ctx.quadraticCurveTo(px - u * 0.08, base - u * p.H * 0.25, px - u * p.HW * 0.4, base + 1);
  ctx.closePath();
  ctx.fill();
  // Gullies down the shaded flank.
  ctx.strokeStyle = tone.rock;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const X = p.X + 0.03 + i * 0.05;
    const h = peakHeight(p, X);
    if (h <= 0.05) continue;
    ctx.moveTo(cx + X * u, base - u * (h - 0.02));
    ctx.lineTo(cx + (X + 0.012) * u, base - u * (h - 0.1 - hash(i + 6400 + p.X * 100) * 0.06));
  }
  ctx.stroke();
  // Snow on the summit: along the profile above the snow line, back along a jagged lower edge.
  const line = p.H * p.snow;
  let x0 = px;
  let x1 = px;
  for (let x = px; x > l; x -= u * 0.01) {
    if (peakHeight(p, (x - cx) / u) < line) break;
    x0 = x;
  }
  for (let x = px; x < r; x += u * 0.01) {
    if (peakHeight(p, (x - cx) / u) < line) break;
    x1 = x;
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.snow : tone.snowShade;
    ctx.beginPath();
    const a = pass ? x0 : px - u * 0.004;
    ctx.moveTo(a, base - u * (pass ? line : peakHeight(p, (a - cx) / u)));
    for (let x = a; x < x1; x += u * 0.01) ctx.lineTo(x, base - u * peakHeight(p, (x - cx) / u));
    ctx.lineTo(x1, base - u * line);
    // Fingers of snow reaching down the flank.
    const n = Math.max(2, Math.round((x1 - a) / (u * 0.03)));
    for (let i = n; i >= 0; i--) {
      const x = a + ((x1 - a) * i) / n;
      ctx.lineTo(x, base - u * (line - (i % 2 ? 0.035 : 0.01) * (0.7 + hash(i + 6500) * 0.6)));
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** The Alps: the hazy range, then the three peaks, far to near. */
export function mountains(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const base = hz + MOUNT_BASE * u;
  ctx.fillStyle = tone.peakFar;
  ridge(ctx, s, base, rangeHeight, -1, s.cssW + 1);
  ctx.fill();
  for (const p of PEAKS) peak(ctx, s, tone, p, base);
}

/** Where the great horn's summit is on screen (its tip). */
export function hornTop(s: Scene): { x: number; y: number } {
  HORN_TOP.x = s.cssW / 2 + HORN.X * s.u;
  HORN_TOP.y = farLine(s) + (MOUNT_BASE - HORN.H) * s.u;
  return HORN_TOP;
}
const HORN_TOP = { x: 0, y: 0 };

/** Mist on the mountains at the loop's dawn: a soft band over their lower slopes, just above the cloud sea. */
export function mistBand(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  if (tone.mist <= 0.01) return;
  const u = s.u;
  ctx.fillStyle = tone.mistColor;
  ctx.globalAlpha = 0.55 * tone.mist;
  ctx.beginPath();
  ctx.moveTo(-1, hz + u * 0.06);
  for (let x = -1; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, hz - u * (0.11 + 0.03 * Math.sin(X * 7 + 1) + 0.02 * Math.sin(X * 15.3)));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, hz + u * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.4 * tone.mist;
  ctx.beginPath();
  ctx.moveTo(-1, hz + u * 0.06);
  for (let x = -1; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, hz - u * (0.18 + 0.03 * Math.sin(X * 5.1 + 2.5) + 0.02 * Math.sin(X * 11.3 + 1)));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, hz + u * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- foothills

/** Height of the foothills' ridge at X (u above its base): rolling, wooded. */
function hillHeight(X: number): number {
  return 0.075 + 0.015 * Math.sin(X * 5.2 + 0.4) + 0.008 * Math.sin(X * 12.7 + 2);
}

/** Pine tops along the ridge: every PINE_STEP u, a tip this much higher (u), by hash. */
const PINE_STEP = 0.022;

/**
 * The foothills: a dark ridge of pine forest all along the foot of the Alps, its skyline a
 * sawtooth of pine tops, with lit tops here and there.
 */
export function foothills(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = hz + HILL_BASE * u;
  const step = u * PINE_STEP;
  const n0 = Math.floor((-1 - cx) / step);
  ctx.fillStyle = tone.pine;
  ctx.beginPath();
  ctx.moveTo(-1, base + u * 0.03);
  for (let i = n0; ; i++) {
    const x = cx + i * step;
    const X = i * PINE_STEP;
    const h = hillHeight(X);
    const tip = 0.016 + hash(i + 6600) * 0.014;
    ctx.lineTo(x - step * 0.35, base - u * h);
    ctx.lineTo(x, base - u * (h + tip));
    ctx.lineTo(x + step * 0.35, base - u * h);
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, base + u * 0.03);
  ctx.closePath();
  ctx.fill();
  // Lit tops on every third tree: a bright sliver down the left of its tip.
  ctx.fillStyle = tone.pineLit;
  ctx.beginPath();
  for (let i = n0; ; i++) {
    const x = cx + i * step;
    if (x > s.cssW + 1) break;
    if (i % 3) continue;
    const X = i * PINE_STEP;
    const h = hillHeight(X);
    const tip = 0.016 + hash(i + 6600) * 0.014;
    ctx.moveTo(x, base - u * (h + tip));
    ctx.lineTo(x - step * 0.3, base - u * (h + 0.002));
    ctx.lineTo(x - step * 0.05, base - u * (h + 0.004));
    ctx.closePath();
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the village

/** The church (its tower's center) and the house on the right (u from center). */
export const CHURCH_X = 0.34;
export const HOUSE_X = 0.44;
/**
 * The village's foot: this far down the far meadow (u below the far line), in front of the
 * foothills' foot. Once the mist has settled (its top at the far line + 0.01 u, so 0.05 u above
 * this foot) its puffs reach at most 0.035 u above it over the village, so the nave's roof
 * (0.056 u above the foot) and the house's (0.066 u) end under them, buried whole, and nothing
 * the lane brings down ever passes over them (drift.test.ts checks every height); the steeple
 * stands out of the mist for good, and the lane keeps clear of it.
 */
export const VILLAGE_FOOT = 0.06;

/** Scratch list of windows, reused per frame. */
const WINDOWS: [number, number, number, number][] = Array.from({ length: 6 }, () => [0, 0, 0, 0]);

/** The first `n` scratch windows: little arched openings, dark, lit by night. */
function windows(ctx: Ctx, tone: Tone, n: number, u: number): void {
  ctx.fillStyle = tone.timber;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y, w, h] = WINDOWS[i]!;
    archPath(ctx, x, y, w, h);
  }
  ctx.fill();
  if (tone.windows <= 0.01) return;
  ctx.globalAlpha = tone.windows;
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y, w, h] = WINDOWS[i]!;
    archPath(ctx, x + u * 0.0008, y - u * 0.0008, w - u * 0.0016, h - u * 0.0016);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The nave's size (u): width, wall height, its roof's height, and where it stands right of the tower. */
const NAVE_W = 0.052;
const NAVE_H = 0.032;
const NAVE_ROOF = 0.024;
const NAVE_DX = 0.012;

/** The church's nave, right of the tower: whitewashed walls under a red roof, two arched windows. */
export function nave(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const x = s.cssW / 2 + CHURCH_X * u;
  const foot = hz + u * VILLAGE_FOOT;
  const nw = u * NAVE_W;
  const nh = u * NAVE_H;
  const nx = x + u * NAVE_DX;
  ctx.fillStyle = tone.white;
  ctx.fillRect(nx, foot - nh, nw, nh);
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  ctx.moveTo(nx - u * 0.003, foot - nh);
  ctx.lineTo(nx + nw * 0.5, foot - nh - u * NAVE_ROOF);
  ctx.lineTo(nx + nw + u * 0.003, foot - nh);
  ctx.closePath();
  ctx.fill();
  WINDOWS[0]![0] = nx + nw * 0.3 - u * 0.003;
  WINDOWS[0]![1] = foot - u * 0.01;
  WINDOWS[0]![2] = u * 0.006;
  WINDOWS[0]![3] = u * 0.016;
  WINDOWS[1]![0] = nx + nw * 0.7 - u * 0.003;
  WINDOWS[1]![1] = foot - u * 0.01;
  WINDOWS[1]![2] = u * 0.006;
  WINDOWS[1]![3] = u * 0.016;
  windows(ctx, tone, 2, u);
}

/**
 * The church's steeple: a square tower lit on the left, a clock face, two arched windows, and
 * the green onion dome drawn up into a spike with a cross on top. It stands out of the mist
 * for good once the mist has settled (the nave is buried), so the lane keeps clear of it.
 */
export function steeple(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const x = s.cssW / 2 + CHURCH_X * u;
  const foot = hz + u * VILLAGE_FOOT;
  const tw = u * 0.03;
  const th = u * 0.105;
  ctx.fillStyle = tone.white;
  ctx.fillRect(x - tw / 2, foot - th, tw, th);
  ctx.fillStyle = tone.wall;
  ctx.fillRect(x + tw * 0.1, foot - th, tw * 0.4, th);
  // The onion dome: a bulb swelling over the tower's top, drawn up into a spike.
  const dy = foot - th;
  ctx.fillStyle = tone.dome;
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.6, dy);
  ctx.bezierCurveTo(x - tw * 0.85, dy - u * 0.022, x - tw * 0.45, dy - u * 0.03, x - tw * 0.16, dy - u * 0.036);
  ctx.quadraticCurveTo(x - u * 0.003, dy - u * 0.044, x, dy - u * 0.062);
  ctx.quadraticCurveTo(x + u * 0.003, dy - u * 0.044, x + tw * 0.16, dy - u * 0.036);
  ctx.bezierCurveTo(x + tw * 0.45, dy - u * 0.03, x + tw * 0.85, dy - u * 0.022, x + tw * 0.6, dy);
  ctx.closePath();
  ctx.fill();
  // The cross on its tip.
  ctx.fillRect(x - u * 0.0012, dy - u * 0.074, u * 0.0024, u * 0.014);
  ctx.fillRect(x - u * 0.0045, dy - u * 0.071, u * 0.009, u * 0.0024);
  // The clock: a pale disc with a dark rim.
  ctx.fillStyle = tone.timber;
  ctx.beginPath();
  circle(ctx, x, dy + u * 0.02, u * 0.0075);
  ctx.fill();
  ctx.fillStyle = tone.wall;
  ctx.beginPath();
  circle(ctx, x, dy + u * 0.02, u * 0.0058);
  ctx.fill();
  // Windows: two in the tower.
  WINDOWS[0]![0] = x - u * 0.004;
  WINDOWS[0]![1] = dy + u * 0.05;
  WINDOWS[0]![2] = u * 0.008;
  WINDOWS[0]![3] = u * 0.014;
  WINDOWS[1]![0] = x - u * 0.004;
  WINDOWS[1]![1] = foot - u * 0.012;
  WINDOWS[1]![2] = u * 0.008;
  WINDOWS[1]![3] = u * 0.022;
  windows(ctx, tone, 2, u);
}

/** The village church: its nave, then its steeple in front. */
export function church(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  nave(ctx, s, tone, hz);
  steeple(ctx, s, tone, hz);
}

/** A half-timbered house on the right: its gable end, cream between dark timbers, under a steep red roof. */
export function house(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const x = s.cssW / 2 + HOUSE_X * u;
  const foot = hz + u * VILLAGE_FOOT;
  const w = u * 0.046;
  const h = u * 0.032;
  const top = foot - h;
  const ridge = top - u * 0.03;
  ctx.fillStyle = tone.wall;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, foot);
  ctx.lineTo(x - w / 2, top);
  ctx.lineTo(x, ridge + u * 0.004);
  ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w / 2, foot);
  ctx.closePath();
  ctx.fill();
  // Timbers: the sill and the storey beam, posts, and a pair of braces making a cross.
  ctx.strokeStyle = tone.timber;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top + h * 0.45);
  ctx.lineTo(x + w / 2, top + h * 0.45);
  ctx.moveTo(x - w * 0.5, top);
  ctx.lineTo(x - w * 0.5, foot);
  ctx.moveTo(x + w * 0.5, top);
  ctx.lineTo(x + w * 0.5, foot);
  ctx.moveTo(x - w * 0.4, top + h * 0.45);
  ctx.lineTo(x - w * 0.1, top + h * 0.05);
  ctx.moveTo(x + w * 0.4, top + h * 0.45);
  ctx.lineTo(x + w * 0.1, top + h * 0.05);
  ctx.moveTo(x - w * 0.5, top);
  ctx.lineTo(x, ridge + u * 0.004);
  ctx.lineTo(x + w * 0.5, top);
  ctx.stroke();
  // The roof: a steep gable with deep eaves, lit along its left slope.
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, top + u * 0.004);
  ctx.lineTo(x, ridge - u * 0.004);
  ctx.lineTo(x + w * 0.62, top + u * 0.004);
  ctx.lineTo(x + w * 0.55, top + u * 0.002);
  ctx.lineTo(x, ridge + u * 0.006);
  ctx.lineTo(x - w * 0.55, top + u * 0.002);
  ctx.closePath();
  ctx.fill();
  // A chimney, and a window up in the gable and two below.
  ctx.fillStyle = tone.timber;
  ctx.fillRect(x + w * 0.22, ridge + u * 0.006, u * 0.006, u * 0.012);
  WINDOWS[0]![0] = x - u * 0.003;
  WINDOWS[0]![1] = top + h * 0.38;
  WINDOWS[0]![2] = u * 0.006;
  WINDOWS[0]![3] = u * 0.009;
  WINDOWS[1]![0] = x - w * 0.3 - u * 0.003;
  WINDOWS[1]![1] = foot - u * 0.006;
  WINDOWS[1]![2] = u * 0.006;
  WINDOWS[1]![3] = u * 0.01;
  WINDOWS[2]![0] = x + w * 0.3 - u * 0.003;
  WINDOWS[2]![1] = foot - u * 0.006;
  WINDOWS[2]![2] = u * 0.006;
  WINDOWS[2]![3] = u * 0.01;
  windows(ctx, tone, 3, u);
}

// ---------------------------------------------------------------- the fair

/** The Ferris wheel's center (u from center), its hub's height above the far line and its radius (u). */
export const WHEEL_X = -0.438;
const WHEEL_UP = 0.09;
export const WHEEL_R = 0.048;
const CABINS = 12;
/** The chain carousel's mast (u from center), its crown's height above the far line (u), the crown's radius, how far the chairs fly out. */
export const RIDE_X = -0.35;
export const RIDE_UP = 0.2;
const CROWN_R = 0.04;
const CHAIRS = 8;
const FLY = 0.07;
const CHAIR_DROP = 0.045;

/** Where the wheel's hub is on screen. */
export function wheelAt(s: Scene): { x: number; y: number } {
  WHEEL_AT.x = s.cssW / 2 + WHEEL_X * s.u;
  WHEEL_AT.y = farLine(s) - WHEEL_UP * s.u;
  return WHEEL_AT;
}
const WHEEL_AT = { x: 0, y: 0 };

/** Where the carousel's crown is on screen (the mast's top). */
export function crownAt(s: Scene): { x: number; y: number } {
  CROWN_AT.x = s.cssW / 2 + RIDE_X * s.u;
  CROWN_AT.y = farLine(s) - RIDE_UP * s.u;
  return CROWN_AT;
}
const CROWN_AT = { x: 0, y: 0 };

/** The cabins' colors round the wheel, far off: the village's faded red, green and cream by turns. */
function cabinColor(tone: Tone, i: number): string {
  return i % 3 === 0 ? tone.roof : i % 3 === 1 ? tone.dome : tone.wall;
}

/**
 * The Ferris wheel on the left: an A-frame of painted steel, the rim with its spokes turning
 * slowly, little cabins hanging level from the rim, and by night a ring of bulbs.
 */
export function ferrisWheel(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const { x, y } = wheelAt(s);
  const r = WHEEL_R * u;
  const a0 = s.t * 0.14;
  // The A-frame, lit on the left leg, and the platform.
  ctx.fillStyle = tone.steel;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.04, hz + u * 0.012);
  ctx.lineTo(x - u * 0.005, y);
  ctx.lineTo(x + u * 0.005, y);
  ctx.lineTo(x + u * 0.04, hz + u * 0.012);
  ctx.lineTo(x + u * 0.028, hz + u * 0.012);
  ctx.lineTo(x, y + u * 0.012);
  ctx.lineTo(x - u * 0.028, hz + u * 0.012);
  ctx.closePath();
  ctx.rect(x - u * 0.045, hz + u * 0.006, u * 0.09, u * 0.008);
  ctx.fill();
  ctx.fillStyle = tone.steelLit;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.04, hz + u * 0.012);
  ctx.lineTo(x - u * 0.005, y);
  ctx.lineTo(x - u * 0.002, y + u * 0.006);
  ctx.lineTo(x - u * 0.034, hz + u * 0.012);
  ctx.closePath();
  ctx.fill();
  // The rim and the spokes.
  ctx.strokeStyle = tone.steel;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "round";
  ctx.beginPath();
  circle(ctx, x, y, r);
  circle(ctx, x, y, r * 0.86);
  for (let i = 0; i < CABINS; i++) {
    const a = a0 + (i * Math.PI * 2) / CABINS;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = tone.steelLit;
  ctx.beginPath();
  circle(ctx, x, y, u * 0.008);
  ctx.fill();
  // Cabins hanging from the rim, each its own color.
  const cw = u * 0.013;
  const ch = u * 0.011;
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = cabinColor(tone, c);
    ctx.beginPath();
    for (let i = c; i < CABINS; i += 3) {
      const a = a0 + (i * Math.PI * 2) / CABINS;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      block(ctx, px - cw / 2, py + u * 0.002, cw, ch, u * 0.003);
    }
    ctx.fill();
  }
  ctx.fillStyle = tone.timber;
  ctx.beginPath();
  for (let i = 0; i < CABINS; i++) {
    const a = a0 + (i * Math.PI * 2) / CABINS;
    ctx.rect(x + Math.cos(a) * r - cw * 0.3, y + Math.sin(a) * r + u * 0.0045, cw * 0.6, ch * 0.32);
  }
  ctx.fill();
  // Bulbs round the rim by night.
  if (tone.bulbs > 0.01) {
    ctx.globalAlpha = tone.bulbs;
    ctx.fillStyle = "#ffe18a";
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const a = a0 + (i * Math.PI * 2) / 36;
      circle(ctx, x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, u * 0.0022);
    }
    circle(ctx, x, y, u * 0.004);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Scratch for the chairs' places this frame: angle round the crown, its screen x and y and depth (sin). */
const CHAIR_SIN = new Float64Array(CHAIRS);
const CHAIR_X = new Float64Array(CHAIRS);
const CHAIR_Y = new Float64Array(CHAIRS);
const CHAIR_TOP_X = new Float64Array(CHAIRS);

/** The chairs' colors round the crown, by turns. */
function chairColor(tone: Tone, i: number): string {
  return i % 2 ? tone.roof : tone.dome;
}

/** Chairs behind the mast (sin < 0) or in front, with their chains, as one pass. */
function chairs(ctx: Ctx, tone: Tone, u: number, crownY: number, front: boolean): void {
  ctx.strokeStyle = tone.steel;
  ctx.lineWidth = Math.max(0.8, u * 0.0016);
  ctx.beginPath();
  for (let i = 0; i < CHAIRS; i++) {
    if (CHAIR_SIN[i]! < 0 === front) continue;
    ctx.moveTo(CHAIR_TOP_X[i]!, crownY + u * 0.004 + CHAIR_SIN[i]! * u * 0.004);
    ctx.lineTo(CHAIR_X[i]!, CHAIR_Y[i]!);
  }
  ctx.stroke();
  for (let c = 0; c < 2; c++) {
    ctx.fillStyle = chairColor(tone, c);
    ctx.beginPath();
    for (let i = c; i < CHAIRS; i += 2) {
      if (CHAIR_SIN[i]! < 0 === front) continue;
      const k = 0.85 + CHAIR_SIN[i]! * 0.15;
      block(ctx, CHAIR_X[i]! - u * 0.006 * k, CHAIR_Y[i]!, u * 0.012 * k, u * 0.0085 * k, u * 0.002);
    }
    ctx.fill();
  }
}

/**
 * The chain carousel on the left: a tall mast up to a striped crown, and eight chairs on
 * chains flying out round it as it turns, the ones behind the mast smaller and higher, the
 * ones in front lower and nearer; by night a ring of bulbs round the crown's rim.
 */
export function swingRide(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const { x, y } = crownAt(s);
  const a0 = s.t * 0.75;
  // Where each chair is this frame.
  for (let i = 0; i < CHAIRS; i++) {
    const a = a0 + (i * Math.PI * 2) / CHAIRS;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    CHAIR_SIN[i] = sn;
    CHAIR_TOP_X[i] = x + c * CROWN_R * u * 0.9;
    CHAIR_X[i] = x + c * FLY * u;
    CHAIR_Y[i] = y + u * CHAIR_DROP + sn * u * 0.016;
  }
  // The platform and the mast, lit down its left.
  ctx.fillStyle = tone.steel;
  ctx.beginPath();
  ctx.rect(x - u * 0.028, hz + u * 0.004, u * 0.056, u * 0.01);
  ctx.rect(x - u * 0.006, y, u * 0.012, hz + u * 0.006 - y);
  ctx.fill();
  chairs(ctx, tone, u, y, false);
  ctx.fillStyle = tone.steel;
  ctx.fillRect(x - u * 0.006, y, u * 0.012, hz + u * 0.006 - y);
  ctx.fillStyle = tone.steelLit;
  ctx.fillRect(x - u * 0.005, y, u * 0.004, hz + u * 0.006 - y);
  // The crown: a shallow striped cone with a finial, its rim a band.
  const cr = CROWN_R * u;
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.moveTo(x - cr, y + u * 0.004);
  ctx.lineTo(x, y - u * 0.03);
  ctx.lineTo(x + cr, y + u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  for (let i = -2; i <= 2; i += 2) {
    ctx.moveTo(x, y - u * 0.03);
    ctx.lineTo(x + cr * (i / 4), y + u * 0.004);
    ctx.lineTo(x + cr * ((i + 1) / 4), y + u * 0.004);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.steel;
  ctx.beginPath();
  oval(ctx, x, y + u * 0.004, cr, u * 0.007);
  ctx.fill();
  ctx.fillStyle = tone.steelLit;
  ctx.beginPath();
  circle(ctx, x, y - u * 0.033, u * 0.004);
  ctx.fill();
  if (tone.bulbs > 0.01) {
    ctx.globalAlpha = tone.bulbs;
    ctx.fillStyle = "#ffe18a";
    ctx.beginPath();
    for (let i = 0; i < 9; i++) circle(ctx, x - cr + (i * cr * 2) / 8, y + u * 0.0055, u * 0.0018);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  chairs(ctx, tone, u, y, true);
}

// ---------------------------------------------------------------- the meadow

/** Where the deeper green of the near meadow begins (u above the floor line; its brow rolls a little above that: ground.ts). */
export const NEAR_MEADOW = 0.1;

/**
 * The meadow's far band, lighter, from the foothills' foot down under the near meadow's brow
 * (which moves with the tower, so the band stretches as the camera climbs and the horizon
 * falls behind), with soft mown stripes across it.
 */
export function meadowFar(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  const y0 = hz + HILL_BASE * u;
  ctx.fillStyle = tone.meadowFar;
  ctx.fillRect(0, y0, s.cssW, Math.max(0, Math.min(bottom, s.groundY - u * NEAR_MEADOW) - y0));
  // Soft mown stripes across it.
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = y0 + u * (0.02 + i * 0.032);
    if (y + u * 0.012 > bottom) break;
    ctx.rect(0, y, s.cssW, u * 0.012);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the picnic tables

/** The far picnic tables on the left meadow: X (u from center), depth below the far line (u), and who sits there (cloth indexes, -1 for an empty seat). */
const TABLES: readonly (readonly [number, number, number, number])[] = [
  [-0.46, 0.075, 0, 2],
  [-0.4, 0.092, 1, -1],
  [-0.34, 0.108, 2, 0],
];

/**
 * Picnic tables far off on the left meadow: three long tables on trestles receding up the
 * meadow, benches along them, a few folk sat at them with their plates, and a sunshade.
 */
export function picnicTables(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (const [X, d, a, b] of TABLES) {
    const x = cx + X * u;
    const y = hz + d * u;
    const k = 0.8 + (d - 0.075) * 6;
    const hw = u * 0.026 * k;
    // The folk behind the table: a head and shoulders each, in their cloth.
    for (let i = 0; i < 2; i++) {
      const c = i ? b : a;
      if (c < 0) continue;
      const px = x + (i ? hw * 0.45 : -hw * 0.45);
      ctx.fillStyle = tone.cloth[c]!;
      ctx.beginPath();
      ctx.rect(px - u * 0.0055 * k, y - u * 0.014 * k, u * 0.011 * k, u * 0.012 * k);
      ctx.fill();
      ctx.fillStyle = tone.skinFar;
      ctx.beginPath();
      circle(ctx, px, y - u * 0.017 * k, u * 0.004 * k);
      ctx.fill();
    }
    // The table top with its bench in front, and a couple of white plates on it.
    ctx.fillStyle = tone.wood;
    ctx.beginPath();
    ctx.rect(x - hw, y - u * 0.004 * k, hw * 2, u * 0.005 * k);
    ctx.rect(x - hw * 0.9, y + u * 0.006 * k, hw * 1.8, u * 0.003 * k);
    ctx.rect(x - hw * 0.7, y, u * 0.002, u * 0.008 * k);
    ctx.rect(x + hw * 0.7, y, u * 0.002, u * 0.008 * k);
    ctx.fill();
    ctx.fillStyle = tone.cloth[2];
    ctx.beginPath();
    ctx.rect(x - hw * 0.45 - u * 0.004 * k, y - u * 0.0055 * k, u * 0.008 * k, u * 0.0018 * k);
    ctx.rect(x + hw * 0.45 - u * 0.004 * k, y - u * 0.0055 * k, u * 0.008 * k, u * 0.0018 * k);
    ctx.fill();
  }
  // A sunshade over the far table: a pole and a round canopy in the village's red.
  const sx = cx - 0.46 * u;
  const sy = hz + 0.075 * u;
  ctx.fillStyle = tone.timber;
  ctx.fillRect(sx - u * 0.001, sy - u * 0.036, u * 0.002, u * 0.032);
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  ctx.moveTo(sx - u * 0.03, sy - u * 0.03);
  ctx.quadraticCurveTo(sx, sy - u * 0.05, sx + u * 0.03, sy - u * 0.03);
  ctx.closePath();
  ctx.fill();
}

/** Where the hay bales stand: u from the center, and u down the meadow from the far line (below the house's foot, clear of it). */
export const BALES_X = 0.42;
export const BALES_AT = 0.12;

/** Three round hay bales far off on the right meadow, two on the ground and one on top, seen end on with the roll's spiral. */
export function hayBales(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const x = s.cssW / 2 + BALES_X * u;
  const y = hz + BALES_AT * u;
  const r = u * 0.011;
  ctx.fillStyle = tone.bale;
  ctx.beginPath();
  circle(ctx, x - r * 1.05, y - r, r);
  circle(ctx, x + r * 1.05, y - r, r);
  circle(ctx, x, y - r * 2.7, r);
  ctx.fill();
  ctx.strokeStyle = tone.baleShade;
  ctx.lineWidth = Math.max(0.8, r * 0.22);
  ctx.beginPath();
  for (const [bx, by] of BALES) {
    const cx = x + bx * r;
    const cy = y + by * r;
    ctx.moveTo(cx + r * 0.62, cy);
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 1.5);
    ctx.moveTo(cx + r * 0.28, cy);
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 1.5);
  }
  ctx.stroke();
}
/** The bales' centers, in bale radii from the stack's foot. */
const BALES = [
  [-1.05, -1],
  [1.05, -1],
  [0, -2.7],
] as const;

// ---------------------------------------------------------------- the mist floor

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Soft swells further down the floor, in rows repeating every SWELL_SPAN (u, nearer rows wider): x (fraction of a span), depth under the top (u), size (u). */
const SWELL_SPAN = 0.7;
const SWELL_ROWS = 3;
const SWELLS = Array.from({ length: 6 }, (_, i) => ({ x: hash(i + 6500), d: 0.1 + hash(i + 6510) * 0.12, r: 0.026 + hash(i + 6520) * 0.022 }));

/**
 * The mist floor: a row of cel-shaded puffs along its top, solid below, with soft lit swells
 * further down. It stands still: it runs right behind the tower, where nothing moves. It is
 * drawn after everything on the land, the meadow round the tent included, so as it gathers it
 * covers all of it (only the peaks, the steeple and the rides stand out of it); the stalls in
 * front stay in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = s.cssW / 2 + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cloudLight : tone.cloud;
    ctx.globalAlpha = pass ? 0.75 : 0.7;
    ctx.beginPath();
    for (let row = 0; row < SWELL_ROWS; row++) {
      const grow = 1 + row * 0.4;
      const span = u * SWELL_SPAN * grow;
      const reps = Math.ceil(s.cssW / 2 / span) + 1;
      for (let k = -reps; k < reps; k++) {
        for (const w of SWELLS) {
          const r = w.r * u * grow;
          const y = top + (w.d + row * 0.2 * grow) * u + u * 0.05;
          if (y - r > s.cssH) continue;
          const x = s.cssW / 2 + (k + w.x + row * 0.37) * span;
          const rx = r * (pass ? 1.2 : 2.2);
          const ry = r * (pass ? 0.22 : 0.5);
          const ex = x - (pass ? r * 0.35 : 0);
          const ey = y - (pass ? r * 0.2 : 0);
          ctx.moveTo(ex + rx, ey);
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI, true);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Everything on the far line, back to front (the mist over it is drawn later: `cloudFloor`). */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = farLine(s);
  if (hz - s.u * 0.5 > s.cssH) return;
  cloudBank(ctx, s, tone, hz);
  mountains(ctx, s, tone, hz);
  mistBand(ctx, s, tone, hz);
  foothills(ctx, s, tone, hz);
  if (landShows(s, top)) {
    const bottom = Math.min(s.cssH, top + s.u * 0.12);
    meadowFar(ctx, s, tone, bottom);
    picnicTables(ctx, s, tone, hz);
    hayBales(ctx, s, tone, hz);
  }
  church(ctx, s, tone, hz);
  house(ctx, s, tone, hz);
  ferrisWheel(ctx, s, tone, hz);
  swingRide(ctx, s, tone, hz);
}

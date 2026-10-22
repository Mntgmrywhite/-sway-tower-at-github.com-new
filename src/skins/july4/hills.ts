import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { hillLine, hillScale, horizon0 } from "./land";
import { sunHaloFoot } from "./sky";
import { blob, caps, poly, type Blob, type Lobe } from "./paint";
import { dot, smooth } from "./shapes";
import { level, LOOP_START, storyLevel, type Tone } from "./tone";

// The country on the horizon, painted like the far distance of a hand-painted background or a
// Grant Wood landscape: sculpted round hills one behind another, each paler and bluer further
// back, no lines. Furthest, a long blue-green ridge with a tree line along its crest; then the
// farm hills, round humps of golden wheat and green pasture plowed in contour rows that follow
// their swell, puffball trees along their crests, a red barn with its silo, a white farmhouse and
// a country road where little vintage cars and a decorated hay wagon roll along now and then,
// coming out of one grove and going into another; then the near slopes with their groves. The
// hills dip low behind the tower, so the sky and the green there stay calm, and rise high at the
// sides, where the detail lives; the light comes from the left, so every hump is lit on its left
// flank (with a lit rim along its crest) and shaded on its right. Two kites fly over the farms,
// rising and dipping on the breeze, below the sun. Everything stands on the hill line (land.ts),
// and the sun sets behind the far ridge (sky.ts). Seen from the square the hills rise round the
// town; as you climb they flatten below you (land.ts hillScale), and on a screen wide for its
// height they stand no taller than the room under the day sun (hillsK).
//
// Positions are in u from the screen's center (X), heights in u up from the hill line.

/** 0 at the center, easing to 1 at `w` out, from `from` out. */
function swell(X: number, from: number, w: number): number {
  return smooth(0, 1, Math.min(1, Math.max(0, Math.abs(X) - from) / w));
}

/** The far ridge's height at X: low behind the tower, rolling high at the sides. */
export function ridgeH(X: number): number {
  return 0.05 + 0.2 * swell(X, 0.1, 0.5) + 0.016 * Math.cos(X * 7.3 + 0.6) + 0.01 * Math.cos(X * 15.7 + 2.1);
}

/** The near slopes' height at X. */
function slopeH(X: number): number {
  return 0.012 + 0.07 * swell(X, 0.2, 0.3) + 0.012 * Math.cos(X * 12 + 2.5);
}

/** A farm hill: center X, half width and height (u), its crop (0 wheat, 1 pasture, 2 lit green), whether it is plowed in rows. */
interface Hump {
  X: number;
  w: number;
  h: number;
  crop: 0 | 1 | 2;
  rows: boolean;
}

/** The farm hills, back to front on each side (mirrored and repeated out for wider screens). */
const HUMPS: Hump[] = [];
for (const side of [-1, 1] as const) {
  const near: [number, number, number, 0 | 1 | 2, boolean][] =
    side < 0
      ? [
          [0.66, 0.24, 0.3, 1, false],
          [0.46, 0.2, 0.25, 0, true],
          [0.3, 0.13, 0.12, 2, true],
          [0.92, 0.22, 0.27, 0, true],
          [1.16, 0.24, 0.3, 2, false],
          [1.4, 0.22, 0.26, 0, true],
        ]
      : [
          [0.62, 0.24, 0.3, 0, true],
          [0.42, 0.18, 0.2, 1, false],
          [0.29, 0.12, 0.1, 0, true],
          [0.88, 0.22, 0.27, 2, true],
          [1.12, 0.24, 0.3, 0, false],
          [1.36, 0.22, 0.26, 1, true],
        ];
  for (const [X, w, h, crop, rows] of near) HUMPS.push({ X: side * X, w, h, crop, rows });
}
/** Drawn back to front: the outer and taller first. */
HUMPS.sort((a, b) => Math.abs(b.X) - Math.abs(a.X));

/**
 * The share of their height the hills stand at in the frame being drawn (land.ts hillScale): set
 * by `hills` before it draws, and by `heightsFor` for anything else measuring them.
 */
let K = 1;

/** Sets the hills' heights for this scene (they flatten as you climb). */
function heightsFor(s: Scene): void {
  K = hillsK(s);
}

/** The tallest the hills and their trees stand (u above the hill line) at full height. */
const TALLEST = 0.34;

/**
 * The share of their height the hills stand at in this scene: they flatten as you climb (land.ts
 * hillScale), and on a screen wider for its height (an iPad, a desktop window), where the
 * square's horizon comes up close under the sun, they stand no taller than the room below the
 * day sun's halo, so neither they nor their trees ever cover it while it is up.
 */
export function hillsK(s: Scene): number {
  const room = (hillLine(s) - sunHaloFoot(s) - ROOM_CLEAR * s.u) / (TALLEST * s.u);
  return Math.max(0.2, Math.min(hillScale(s), room));
}
const ROOM_CLEAR = 0.012;

/** The highest the hills and their trees reach on the start screen, before the camera moves (u above its hill line). */
export function startHillsTop(s: Scene): number {
  const room = (horizon0(s) - sunHaloFoot(s) - ROOM_CLEAR * s.u) / (TALLEST * s.u);
  return TALLEST * Math.max(0.2, Math.min(1, room));
}

/** The highest the hills and their trees reach in this scene (u above the hill line). */
export function hillsTop(s: Scene): number {
  return TALLEST * hillsK(s);
}

function humpH(p: Hump, X: number): number {
  const d = (X - p.X) / p.w;
  if (d <= -1 || d >= 1) return 0;
  // A dome: round over its top, easing out at its feet.
  return p.h * K * (1 - d * d) ** 0.75;
}

/** The ridge's and the slopes' heights as they stand now. */
const ridgeNow = (X: number): number => ridgeH(X) * K;
const slopeNow = (X: number): number => slopeH(X) * K;

/** The farm hills' height at X: the highest hump there. */
function farmH(X: number): number {
  let h = 0;
  for (const p of HUMPS) h = Math.max(h, humpH(p, X));
  return h;
}

/** The step along a crest (u) the hills are traced with. */
const STEP = 0.02;

/** Traces a crest `h(X)` above `line` across the screen, then down to `bottom` and closes it. */
function crest(ctx: Ctx, s: Scene, line: number, bottom: number, h: (X: number) => number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + STEP;
  ctx.moveTo(cx - half * u, bottom);
  for (let X = -half; X <= half + STEP * 0.5; X += STEP) ctx.lineTo(cx + X * u, line - h(X) * u);
  ctx.lineTo(cx + half * u, bottom);
  ctx.closePath();
}

/** Traces the band along a crest `h(X)` above `line`, `d` (u) deep. */
function crestBand(ctx: Ctx, s: Scene, line: number, h: (X: number) => number, d: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + STEP;
  for (let X = -half; X <= half + STEP * 0.5; X += STEP) {
    if (X === -half) ctx.moveTo(cx + X * u, line - h(X) * u);
    else ctx.lineTo(cx + X * u, line - h(X) * u);
  }
  for (let X = half; X >= -half - STEP * 0.5; X -= STEP) ctx.lineTo(cx + X * u, line - (h(X) - d) * u);
  ctx.closePath();
}

/** Whether a hump shows on this screen. */
function seen(s: Scene, p: Hump): boolean {
  return Math.abs(p.X) - p.w < s.cssW / 2 / s.u + 0.02;
}

/** A hump's outline: its swell over `line`, down to `bottom`. */
function humpPath(ctx: Ctx, s: Scene, p: Hump, line: number, bottom: number, inset = 0): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const n = 14;
  ctx.moveTo(cx + (p.X - p.w) * u, bottom);
  for (let i = 0; i <= n; i++) {
    const X = p.X - p.w + (2 * p.w * i) / n;
    ctx.lineTo(cx + X * u, line - Math.max(0, humpH(p, X) - inset) * u);
  }
  ctx.lineTo(cx + (p.X + p.w) * u, bottom);
  ctx.closePath();
}

/** The shaded right flank of a hump (the light comes from the left): from its crest down its right side. */
function flankPath(ctx: Ctx, s: Scene, p: Hump, line: number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const n = 8;
  const from = p.X + p.w * 0.12;
  ctx.moveTo(cx + from * u, line - humpH(p, from) * u);
  for (let i = 1; i <= n; i++) {
    const X = from + ((p.X + p.w - from) * i) / n;
    ctx.lineTo(cx + X * u, line - humpH(p, X) * u);
  }
  ctx.lineTo(cx + (p.X + p.w) * u, bottom);
  // The terminator: a soft curve down the hump's face back under its crest.
  ctx.quadraticCurveTo(cx + (p.X + p.w * 0.3) * u, line - p.h * K * 0.35 * u, cx + from * u, line - humpH(p, from) * u);
  ctx.closePath();
}

/** The lit rim along a hump's crest on its sunny left side: a crescent from its left foot over its top, as a painter rounds a hill. */
function rimPath(ctx: Ctx, s: Scene, p: Hump, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const n = 10;
  const X0 = p.X - p.w * 0.85;
  const X1 = p.X + p.w * 0.25;
  for (let i = 0; i <= n; i++) {
    const X = X0 + ((X1 - X0) * i) / n;
    const y = line - humpH(p, X) * u + u * 0.001;
    if (i === 0) ctx.moveTo(cx + X * u, y);
    else ctx.lineTo(cx + X * u, y);
  }
  for (let i = n; i >= 0; i--) {
    const X = X0 + ((X1 - X0) * i) / n;
    const k = Math.sin((i / n) * Math.PI);
    ctx.lineTo(cx + X * u, line - humpH(p, X) * (1 - 0.22 * k) * u);
  }
  ctx.closePath();
}

/** Contour rows across a hump: nested arcs over its dome, as a field plowed round a hill's swell. */
function rows(ctx: Ctx, s: Scene, p: Hump, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const n = 10;
  for (let r = 1; r <= 3; r++) {
    const k = 1 - r * 0.23;
    for (let i = 0; i <= n; i++) {
      const X = p.X - p.w + (2 * p.w * i) / n;
      const y = line - humpH(p, X) * k * u;
      if (i === 0) ctx.moveTo(cx + X * u, y);
      else ctx.lineTo(cx + X * u, y);
    }
  }
}

// ---------------------------------------------------------------- trees

/** A puffball tree: three round lobes on a short trunk, about a unit across (scaled by its size). */
const PUFF: Blob = blob(
  [
    [-0.32, -0.05, 0.42],
    [0.3, -0.02, 0.4],
    [0.0, -0.38, 0.46],
  ],
  0.66,
  0,
  14,
);

/** Rows of puffball trees along the hump crests and the near slopes: X, how many, their size (u), and which line they stand on (0 a hump's crest, 1 the slopes). */
const GROVES: readonly (readonly [X: number, n: number, size: number, on: 0 | 1])[] = [
  [-0.56, 3, 0.03, 0],
  [-0.4, 2, 0.026, 0],
  [-0.86, 3, 0.028, 0],
  [0.5, 3, 0.03, 0],
  [0.68, 2, 0.028, 0],
  [0.88, 3, 0.028, 0],
  [-0.95, 4, 0.03, 1],
  [-0.66, 3, 0.028, 1],
  [-0.44, 3, 0.026, 1],
  [-0.3, 2, 0.022, 1],
  [0.3, 2, 0.022, 1],
  [0.47, 3, 0.026, 1],
  [0.7, 3, 0.028, 1],
  [0.98, 4, 0.03, 1],
];

/** Where a grove's trees stand: screen x, foot y and size (px), each called back. */
function eachTree(s: Scene, line: number, on: 0 | 1, cb: (x: number, y: number, r: number) => void): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + 0.05;
  for (let g = 0; g < GROVES.length; g++) {
    const [X0, n, size, where] = GROVES[g]!;
    if (where !== on || Math.abs(X0) > half) continue;
    for (let i = 0; i < n; i++) {
      const X = X0 + (i - (n - 1) / 2) * size * 1.7;
      const r = size * (0.8 + hash(g * 11 + i + 7100) * 0.4) * u;
      const h = on === 0 ? farmH(X) : slopeNow(X);
      cb(cx + X * u, line - h * u + r * 0.25, r);
    }
  }
}

/** A row of puffball trees: trunks, the crowns' shade, bodies and lit caps (each one fill for the whole row). */
function trees(ctx: Ctx, s: Scene, tone: Tone, line: number, on: 0 | 1): void {
  ctx.fillStyle = tone.trunk;
  ctx.beginPath();
  eachTree(s, line, on, (x, y, r) => ctx.rect(x - r * 0.09, y - r * 0.5, r * 0.18, r * 0.55));
  ctx.fill();
  const inks = [tone.woods[0], tone.woods[1]] as const;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = inks[pass]!;
    ctx.beginPath();
    eachTree(s, line, on, (x, y, r) => poly(ctx, pass ? PUFF.body : PUFF.outline, x, y - r * 0.55, r * 1.25));
    ctx.fill();
  }
  ctx.fillStyle = tone.woods[2];
  ctx.beginPath();
  eachTree(s, line, on, (x, y, r) => caps(ctx, PUFF, x, y - r * 0.55, r * 1.25));
  ctx.fill();
}

// ---------------------------------------------------------------- the barn, the farmhouse and the road

/** The red barn and its silo on the left farm hill, the white farmhouse by it, and the country road. */
const BARN_X = -0.415;
const HOUSE_X = -0.355;
const ROAD_FROM = -0.49;
const ROAD_TO = -0.3;
/** The road lies this far below the farm hills' crest (u). */
const ROAD_D = 0.07;

function barn(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  if (cx + (BARN_X - 0.04) * u < 0) return;
  const x = cx + BARN_X * u;
  const foot = line - (farmH(BARN_X) - 0.03) * u;
  const w = u * 0.036;
  const h = u * 0.024;
  // The silo, a cream cylinder with a domed cap, beside it.
  ctx.fillStyle = tone.silo;
  ctx.beginPath();
  ctx.rect(x + w * 0.58, foot - h * 1.7, u * 0.011, h * 1.7);
  circle(ctx, x + w * 0.58 + u * 0.0055, foot - h * 1.7, u * 0.0055);
  ctx.fill();
  // The barn: a red front with a gambrel roof, its side in shade, the cream trim cross on its door.
  ctx.fillStyle = tone.barnShade;
  ctx.beginPath();
  ctx.rect(x, foot - h, w * 0.5, h);
  ctx.fill();
  ctx.fillStyle = tone.barn;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, foot);
  ctx.lineTo(x - w * 0.5, foot - h);
  ctx.lineTo(x - w * 0.38, foot - h * 1.5);
  ctx.lineTo(x, foot - h * 1.75);
  ctx.lineTo(x + w * 0.38, foot - h * 1.5);
  ctx.lineTo(x + w * 0.5, foot - h);
  ctx.lineTo(x + w * 0.5, foot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.silo;
  ctx.lineWidth = Math.max(0.6, u * 0.0016);
  ctx.beginPath();
  ctx.rect(x - w * 0.18, foot - h * 0.72, w * 0.36, h * 0.72);
  ctx.moveTo(x - w * 0.18, foot - h * 0.72);
  ctx.lineTo(x + w * 0.18, foot);
  ctx.moveTo(x + w * 0.18, foot - h * 0.72);
  ctx.lineTo(x - w * 0.18, foot);
  ctx.moveTo(x - w * 0.5, foot - h);
  ctx.lineTo(x + w * 0.5, foot - h);
  ctx.stroke();
  // The farmhouse: white clapboard under a gray roof, a lit window.
  const hx = cx + HOUSE_X * u;
  const hf = line - (farmH(HOUSE_X) - 0.022) * u;
  const hw = u * 0.022;
  ctx.fillStyle = tone.clapboard;
  ctx.beginPath();
  ctx.rect(hx - hw, hf - hw * 0.8, hw * 2, hw * 0.8);
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(hx - hw * 1.15, hf - hw * 0.78);
  ctx.lineTo(hx - hw * 0.5, hf - hw * 1.4);
  ctx.lineTo(hx + hw * 0.6, hf - hw * 1.4);
  ctx.lineTo(hx + hw * 1.15, hf - hw * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.windowBack;
  ctx.fillRect(hx - hw * 0.6, hf - hw * 0.6, hw * 0.3, hw * 0.3);
  ctx.fillRect(hx + hw * 0.3, hf - hw * 0.6, hw * 0.3, hw * 0.3);
}

/** Where along the road (0 out of the first grove .. 1 into the next) a point is: screen x and y. */
const ON_ROAD = { x: 0, y: 0 };
function roadAt(s: Scene, line: number, p: number): typeof ON_ROAD {
  const X = ROAD_FROM + (ROAD_TO - ROAD_FROM) * p;
  ON_ROAD.x = s.cssW / 2 + X * s.u;
  ON_ROAD.y = line - (farmH(X) - ROAD_D - 0.01 * Math.sin(p * Math.PI)) * s.u;
  return ON_ROAD;
}

/** The vehicles on the country road: one every ROAD_EVERY seconds, the first coming out of the grove at ROAD_AT; how long a trip takes. */
export const ROAD_AT = 1.2;
const ROAD_EVERY = 8;
const TRIP = 6.5;
/** Each turn's vehicle: a red coupe, a cream roadster, a navy sedan, the band wagon with its bunting. */
const RIDES = 4;

function road(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  if (s.cssW / 2 + ROAD_TO * u < 0) return;
  ctx.strokeStyle = tone.roadway;
  ctx.lineWidth = Math.max(1, u * 0.006);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let p = 0; p <= 1.001; p += 0.1) {
    const at = roadAt(s, line, p);
    if (p === 0) ctx.moveTo(at.x, at.y);
    else ctx.lineTo(at.x, at.y);
  }
  ctx.stroke();
  // The vehicle on it now, if any.
  const n = Math.floor((s.t - ROAD_AT) / ROAD_EVERY);
  const k = (s.t - ROAD_AT - n * ROAD_EVERY) / TRIP;
  if (s.t < ROAD_AT || k >= 1) return;
  const at = roadAt(s, line, k);
  const kind = ((n % RIDES) + RIDES) % RIDES;
  const x = at.x;
  const y = at.y - u * 0.002;
  const L = u * 0.018;
  const roll = s.t * 9;
  if (kind === 3) {
    // The band wagon: a little band riding on a load of hay (three heads, a tuba's glint), a red,
    // cream and blue skirt of bunting, a horse in front.
    ctx.fillStyle = tone.bird;
    ctx.beginPath();
    for (let j = 0; j < 3; j++) dot(ctx, x - L * (0.5 - j * 0.32), y - L * (0.92 + 0.06 * Math.sin(s.t * 6 + j * 2)), L * 0.11);
    ctx.fill();
    ctx.fillStyle = tone.gold;
    ctx.beginPath();
    dot(ctx, x + L * 0.08, y - L * 0.88, L * 0.14);
    ctx.fill();
    ctx.fillStyle = tone.wheat;
    ctx.beginPath();
    ctx.ellipse(x - L * 0.2, y - L * 0.55, L * 0.62, L * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tone.red;
    ctx.fillRect(x - L * 0.75, y - L * 0.38, L * 1.1, L * 0.16);
    ctx.fillStyle = tone.white;
    ctx.fillRect(x - L * 0.75, y - L * 0.22, L * 1.1, L * 0.08);
    ctx.fillStyle = tone.blue;
    ctx.fillRect(x - L * 0.75, y - L * 0.14, L * 1.1, L * 0.08);
    ctx.fillStyle = tone.barnShade;
    ctx.beginPath();
    ctx.ellipse(x + L * 0.75, y - L * 0.42, L * 0.32, L * 0.17, 0, 0, Math.PI * 2);
    ctx.moveTo(x + L * 1.02, y - L * 0.56);
    ctx.lineTo(x + L * 1.16, y - L * 0.78);
    ctx.lineTo(x + L * 1.2, y - L * 0.5);
    ctx.closePath();
    ctx.rect(x + L * 0.55, y - L * 0.35, L * 0.06, L * 0.35);
    ctx.rect(x + L * 0.9, y - L * 0.35 + Math.sin(roll) * L * 0.05, L * 0.06, L * 0.35);
    ctx.fill();
  } else {
    // A rounded vintage car: fenders, a cabin with a pale window, whitewall wheels.
    ctx.fillStyle = kind === 0 ? tone.red : kind === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    ctx.moveTo(x - L * 0.75, y - L * 0.12);
    ctx.quadraticCurveTo(x - L * 0.78, y - L * 0.48, x - L * 0.35, y - L * 0.48);
    ctx.quadraticCurveTo(x - L * 0.2, y - L * 0.85, x + L * 0.15, y - L * 0.82);
    ctx.quadraticCurveTo(x + L * 0.4, y - L * 0.52, x + L * 0.62, y - L * 0.46);
    ctx.quadraticCurveTo(x + L * 0.82, y - L * 0.38, x + L * 0.78, y - L * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.glass;
    ctx.beginPath();
    ctx.moveTo(x - L * 0.18, y - L * 0.5);
    ctx.quadraticCurveTo(x - L * 0.08, y - L * 0.74, x + L * 0.12, y - L * 0.72);
    ctx.lineTo(x + L * 0.28, y - L * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.bird;
    ctx.beginPath();
    circle(ctx, x - L * 0.42, y - L * 0.1, L * 0.2);
    circle(ctx, x + L * 0.45, y - L * 0.1, L * 0.2);
    ctx.fill();
  }
}

/** The groves the road comes out of and goes into: they hide each vehicle's coming and going. */
const ROAD_GROVES: readonly Lobe[][] = [0, 1].map((i) => [
  [-0.014, -0.012, 0.017 + i * 0.002],
  [0.01, -0.02, 0.02],
  [0.024, -0.008, 0.015],
  [-0.002, -0.004, 0.016],
]);
const ROAD_GROVE_BLOBS = ROAD_GROVES.map((l) => blob(l, 0.62, 0, 14));

function roadGroves(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const ends = [ROAD_FROM - 0.016, ROAD_TO + 0.01];
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = tone.woods[pass]!;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const X = ends[i]!;
      const b = ROAD_GROVE_BLOBS[i]!;
      const y = line - (farmH(X) - ROAD_D - 0.006) * u;
      if (pass === 0) poly(ctx, b.outline, cx + X * u, y, u);
      else if (pass === 1) poly(ctx, b.body, cx + X * u, y, u);
      else caps(ctx, b, cx + X * u, y, u);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the kites

/** Two kites over the farms: their anchor on the hill (X), where they fly (X, u above the hill line), their colors, their own rhythm. */
const KITES = [
  { anchor: -0.46, X: -0.445, h: 0.3, color: 0, phase: 0 },
  { anchor: 0.58, X: 0.62, h: 0.4, color: 2, phase: 2.3 },
] as const;

/**
 * How far up the kites fly at a level (1 aloft, 0 reeled in to the hill): by day while the sun is
 * high, reeled in before it begins to set (sky.ts), and let out again once it is up after the
 * loop's dawn, so a kite never flies across the sun.
 */
function aloft(lvl: number): number {
  if (lvl < LOOP_START) return 1 - smooth(REEL_FROM, REEL_TO, lvl);
  const e = storyLevel(lvl);
  return smooth(15, 20, e) * (1 - smooth(REEL_FROM, REEL_TO, e));
}
const REEL_FROM = 22;
const REEL_TO = 28;

/** How far below the sun's halo a kite's middle keeps (u): its top point and its bobbing. */
const KITE_CLEAR = 0.035;

/** Where a kite flies now: rising and dipping on the breeze, swaying a little (scratch). */
const KITE_AT = { x: 0, y: 0, tilt: 0 };
function kiteAt(s: Scene, line: number, i: number): typeof KITE_AT {
  const k = KITES[i]!;
  const t = s.t + k.phase;
  const up = aloft(level(s));
  const dip = Math.sin(t * 0.55) * 0.6 + Math.sin(t * 1.37) * 0.4;
  const ax = s.cssW / 2 + k.anchor * s.u;
  const ay = line - farmH(k.anchor) * s.u;
  KITE_AT.x = ax + ((k.X + Math.sin(t * 0.43) * 0.01) * s.u + s.cssW / 2 - ax) * up;
  // Never up into the sun: the kites fly below its halo (and their tails below them).
  const fly = Math.max(line - (k.h + dip * 0.022) * s.u, sunHaloFoot(s) + KITE_CLEAR * s.u);
  KITE_AT.y = ay + (fly - ay) * up;
  KITE_AT.tilt = Math.sin(t * 0.9) * 0.22 + dip * 0.08;
  return KITE_AT;
}

/** The kites: their strings down to the hill, the diamond, a ribbon tail of bows. */
function kites(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  // Reeled in, a kite is down on the hill behind the trees: nothing to draw.
  if (aloft(level(s)) < 0.15) return;
  const u = s.u;
  const cx = s.cssW / 2;
  for (let i = 0; i < KITES.length; i++) {
    const k = KITES[i]!;
    const ax = cx + k.anchor * u;
    if (ax < -u * 0.05 || ax > s.cssW + u * 0.05) continue;
    const { x, y, tilt } = kiteAt(s, line, i);
    const ay = line - (farmH(k.anchor) - 0.006) * u;
    ctx.strokeStyle = tone.bird;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(0.6, u * 0.0012);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(x - (x - ax) * 0.1, y + (ay - y) * 0.75, x, y + u * 0.014);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const h = u * 0.019;
    const w = u * 0.014;
    const c = Math.cos(tilt);
    const sn = Math.sin(tilt);
    const P = (px: number, py: number) => [x + px * c - py * sn, y + px * sn + py * c] as const;
    // The tail first, waving down from its foot.
    ctx.strokeStyle = tone.bird;
    ctx.lineWidth = Math.max(0.6, u * 0.001);
    ctx.beginPath();
    const [fx, fy] = P(0, h);
    ctx.moveTo(fx, fy);
    for (let j = 1; j <= 5; j++) ctx.lineTo(fx + Math.sin(s.t * 3 - j * 1.2 + k.phase) * w * 0.4 * (j / 5), fy + j * h * 0.34);
    ctx.stroke();
    ctx.fillStyle = k.color === 0 ? tone.red : tone.blue;
    ctx.beginPath();
    const corners = [
      [0, -h],
      [w, -h * 0.25],
      [0, h],
      [-w, -h * 0.25],
    ] as const;
    corners.forEach(([px, py], j) => {
      const [qx, qy] = P(px, py);
      if (j === 0) ctx.moveTo(qx, qy);
      else ctx.lineTo(qx, qy);
    });
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.white;
    ctx.beginPath();
    const [ax0, ay0] = P(0, -h);
    const [ax1, ay1] = P(w, -h * 0.25);
    const [ax2, ay2] = P(0, -h * 0.25);
    ctx.moveTo(ax0, ay0);
    ctx.lineTo(ax1, ay1);
    ctx.lineTo(ax2, ay2);
    ctx.closePath();
    for (let j = 2; j <= 4; j += 2) {
      const bx = fx + Math.sin(s.t * 3 - j * 1.2 + k.phase) * w * 0.4 * (j / 5);
      const by = fy + j * h * 0.34;
      ctx.moveTo(bx - w * 0.3, by - w * 0.15);
      ctx.lineTo(bx + w * 0.3, by + w * 0.15);
      ctx.lineTo(bx + w * 0.3, by - w * 0.15);
      ctx.lineTo(bx - w * 0.3, by + w * 0.15);
      ctx.closePath();
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- all of it

/** The far ridge's tree line: little round crowns along its crest, out at the sides. */
function ridgeTrees(ctx: Ctx, s: Scene, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u + 0.02;
  for (let i = 0; ; i++) {
    const d = 0.3 + i * 0.016;
    if (d > half) break;
    for (const side of [-1, 1]) {
      if (hash(i * 3 + (side > 0 ? 1 : 0) + 7300) < 0.35) continue;
      const X = side * d;
      dot(ctx, cx + X * u, line - (ridgeNow(X) - 0.002) * u, u * (0.008 + hash(i + 7400) * 0.006));
    }
  }
}

/**
 * The country: the far ridge, the farm hills with their rows, trees, the barn, the farmhouse
 * and the road, the near slopes and their groves, and the kites, all standing on `line`, filled
 * down to `bottom` (whatever is nearer covers the rest).
 */
export function hills(ctx: Ctx, s: Scene, tone: Tone, line: number, bottom: number): void {
  const u = s.u;
  const foot = Math.min(s.cssH, bottom);
  if (line - 0.4 * u > s.cssH) return;
  heightsFor(s);
  // The far ridge: a pale blue-green, a lit band along its crest, its tree line.
  ctx.fillStyle = tone.ridge;
  ctx.beginPath();
  crest(ctx, s, line, foot, ridgeNow);
  ridgeTrees(ctx, s, line);
  ctx.fill();
  ctx.fillStyle = tone.ridgeLit;
  ctx.beginPath();
  crestBand(ctx, s, line, ridgeNow, 0.014);
  ctx.fill();
  // The farm hills, back to front: each hump its crop's color, its contour rows, its right flank in shade.
  const crops = [tone.wheat, tone.meadow, tone.farmLit];
  const rowInk = [tone.wheatRow, tone.farm, tone.farm];
  for (const p of HUMPS) {
    if (!seen(s, p)) continue;
    ctx.fillStyle = crops[p.crop]!;
    ctx.beginPath();
    humpPath(ctx, s, p, line, foot);
    ctx.fill();
    if (p.rows) {
      ctx.strokeStyle = rowInk[p.crop]!;
      ctx.lineWidth = Math.max(0.8, u * 0.0035);
      ctx.beginPath();
      rows(ctx, s, p, line);
      ctx.stroke();
    }
    ctx.fillStyle = tone.hillShade;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    flankPath(ctx, s, p, line, foot);
    ctx.fill();
    ctx.fillStyle = tone.hillRim;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    rimPath(ctx, s, p, line);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  trees(ctx, s, tone, line, 0);
  barn(ctx, s, tone, line);
  road(ctx, s, tone, line);
  roadGroves(ctx, s, tone, line);
  // The near slopes and their groves.
  ctx.fillStyle = tone.slope;
  ctx.beginPath();
  crest(ctx, s, line, foot, slopeNow);
  ctx.fill();
  ctx.fillStyle = tone.slopeLit;
  ctx.beginPath();
  crestBand(ctx, s, line, slopeNow, 0.01);
  ctx.fill();
  trees(ctx, s, tone, line, 1);
  kites(ctx, s, tone, line);
}

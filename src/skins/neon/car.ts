import { alpha, circle, mix, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, PINK, RED, SHADOW, SHADOW_MID, VIOLET } from "./colors";
import { hotTube, rimTube } from "./tube";

// A chrome wedge coupe of our own design (no real marque), seen from behind as it cruises down
// the right-hand lane of the grid toward the sun at the same speed as us: it holds its place
// while the grid streams past underneath, weaving a touch in its lane. Low and wide: a chrome
// rear panel mirroring the sunset, a full-width taillight bar split by a small chrome chevron,
// a raked cabin with a dark rear window and a cyan glint, a ducktail wing on two struts, and
// the taillights' glow on the floor. Drawn in its own frame (width 1, origin at the ground
// under its middle), so its gradient is built once.

/** Depth on the floor (nearer than the tower's line), lane center (u from the screen center),
 *  and width (u at the tower's depth). */
export const CAR_Z = 1.75;
export const CAR_X = 0.325;
const CAR_W = 0.105;

/** Rear panel, as [x, y] in car widths (y up is negative), clockwise from the bumper's left. */
const PANEL: readonly (readonly [number, number])[] = [
  [-0.33, -0.08],
  [0.33, -0.08],
  [0.36, -0.15],
  [0.5, -0.17],
  [0.5, -0.33],
  [0.46, -0.385],
  [-0.46, -0.385],
  [-0.5, -0.33],
  [-0.5, -0.17],
  [-0.36, -0.15],
];
/** Cabin (roof and pillars) and the rear window inside it. */
const CABIN: readonly (readonly [number, number])[] = [
  [-0.38, -0.39],
  [0.38, -0.39],
  [0.27, -0.585],
  [0.24, -0.6],
  [-0.24, -0.6],
  [-0.27, -0.585],
];
const WINDOW: readonly (readonly [number, number])[] = [
  [-0.31, -0.415],
  [0.31, -0.415],
  [0.225, -0.565],
  [-0.225, -0.565],
];

const CHROME = [
  [0, "#7f9cf0"],
  [0.34, "#e6e0ff"],
  [0.4, "#3a0f4c"],
  [0.72, "#a2348c"],
  [1, "#ff86b8"],
] as const;
const CABIN_FILL = "#2a1d63";
const GLASS = "#120a2c";
const GLINT = alpha(CYAN, 0.6);
const WING = "#3a2f7a";
const PLATE = "#1a0b2e";
const PLATE_RIM = alpha(CYAN, 0.7);
const TAIL = mix(RED, PINK, 0.25);
const SHADE = "rgba(0, 0, 0, 0.55)";
const FLOOR_GLOW = alpha(TAIL, 0.2);
const EXHAUST = mix(SHADOW_MID, "#ff8a2a", 0.35);
const TYRE = mix(SHADOW, VIOLET, 0.12);
const TYRE_RIM = alpha(VIOLET, 0.45);

/** The chrome gradient, in the car's own frame (built once per context). */
const cache = { ctx: null as Ctx | null, chrome: null as CanvasGradient | null };

/** Scratch result of `carAt`. */
const CAR = { x: 0, y: 0, w: 0 };

/** Where the car is now: its middle on the ground (x, y) and its width (px). */
export function carAt(s: Scene): typeof CAR {
  const u = s.u;
  const k = TOWER_DEPTH / CAR_Z;
  CAR.w = CAR_W * u * k;
  CAR.x = s.cssW / 2 + CAR_X * u + Math.sin(s.t * 0.37) * u * 0.006 * k;
  CAR.y = fieldY(s, CAR_Z) + Math.sin(s.t * 3.1) * CAR.w * 0.004;
  return CAR;
}

function poly(ctx: Ctx, pts: readonly (readonly [number, number])[]): void {
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
}

export function drawCar(ctx: Ctx, s: Scene): void {
  const { x, y, w } = carAt(s);
  if (y - w * 0.65 > s.cssH) return;
  if (cache.ctx !== ctx || !cache.chrome) {
    const g = ctx.createLinearGradient(0, -0.385, 0, -0.08);
    for (const [stop, c] of CHROME) g.addColorStop(stop, c);
    cache.ctx = ctx;
    cache.chrome = g;
  }
  const px = 1 / w; // one pixel, in car widths
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);

  // Shadow on the grid, and the taillights' glow spilling onto it.
  ctx.beginPath();
  oval(ctx, 0, 0.005, 0.56, 0.05);
  ctx.fillStyle = SHADE;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0, 0.035, 0.5, 0.045);
  ctx.fillStyle = FLOOR_GLOW;
  ctx.fill();

  // Tyres: dark rubber with a faint violet sheen, so they read on the dark floor.
  ctx.beginPath();
  ctx.rect(-0.48, -0.17, 0.14, 0.17);
  ctx.rect(0.34, -0.17, 0.14, 0.17);
  ctx.fillStyle = TYRE;
  ctx.fill();
  ctx.strokeStyle = TYRE_RIM;
  ctx.lineWidth = Math.max(0.8 * px, 0.008);
  ctx.stroke();

  // Cabin, rear window and its glint.
  ctx.beginPath();
  poly(ctx, CABIN);
  ctx.fillStyle = CABIN_FILL;
  ctx.fill();
  ctx.beginPath();
  poly(ctx, WINDOW);
  ctx.fillStyle = GLASS;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.548);
  ctx.lineTo(0.02, -0.548);
  ctx.strokeStyle = GLINT;
  ctx.lineWidth = Math.max(px, 0.012);
  ctx.lineCap = "round";
  ctx.stroke();

  // Chrome rear panel with a neon edge.
  ctx.beginPath();
  poly(ctx, PANEL);
  ctx.fillStyle = cache.chrome;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.8 * px, 0.008));

  // Ducktail wing on two struts, just over the deck.
  ctx.beginPath();
  ctx.rect(-0.27, -0.44, 0.03, 0.06);
  ctx.rect(0.24, -0.44, 0.03, 0.06);
  ctx.moveTo(-0.48, -0.455);
  ctx.lineTo(0.48, -0.455);
  ctx.lineTo(0.47, -0.43);
  ctx.lineTo(-0.47, -0.43);
  ctx.closePath();
  ctx.fillStyle = WING;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.6 * px, 0.006));

  // Plate and exhausts.
  ctx.beginPath();
  ctx.rect(-0.1, -0.21, 0.2, 0.075);
  ctx.fillStyle = PLATE;
  ctx.fill();
  ctx.strokeStyle = PLATE_RIM;
  ctx.lineWidth = Math.max(0.8 * px, 0.008);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, -0.3, -0.115, 0.024);
  circle(ctx, 0.3, -0.115, 0.024);
  ctx.fillStyle = EXHAUST;
  ctx.fill();

  // The taillight bar, split by a small chrome chevron in the middle.
  ctx.beginPath();
  ctx.moveTo(-0.43, -0.29);
  ctx.lineTo(-0.07, -0.29);
  ctx.moveTo(0.07, -0.29);
  ctx.lineTo(0.43, -0.29);
  hotTube(ctx, TAIL, Math.max(1.2 * px, 0.032), 2.6, 0.6 * px);
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.31);
  ctx.lineTo(0, -0.27);
  ctx.lineTo(0.04, -0.31);
  ctx.strokeStyle = "#e6e0ff";
  ctx.lineWidth = Math.max(px, 0.014);
  ctx.stroke();
  ctx.restore();
}

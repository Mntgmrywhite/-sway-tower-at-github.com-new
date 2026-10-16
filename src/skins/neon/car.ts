import manifest from "../../audio/music/manifest.json";
import { alpha, circle, mix, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, GOLD, ORANGE, PINK, RED, SHADOW, SHADOW_MID, VIOLET } from "./colors";
import { hotTube, rimTube } from "./tube";

// A chrome wedge coupe of our own design (no real marque), seen from behind as it cruises down
// the right-hand lane of the grid toward the sun at the same speed as us: it holds its place
// while the grid streams past underneath, weaving a touch in its lane. Low and wide: a chrome
// rear panel mirroring the sunset, a full-width taillight bar split by a small chrome chevron,
// a raked cabin with a dark rear window and a cyan glint, a ducktail wing on two struts, and
// the taillights' glow on the floor. Drawn in its own frame (width 1, origin at the ground
// under its middle), so its gradient is built once.
//
// It keeps time with the music (Scene.songTime and the Neon song's cues in manifest.json): on
// the song's first drop it floors it, exhausts flaring, and drives off down the grid into the
// distance, shrinking toward the horizon and fading into its haze. It veers a little to the
// right as it goes, toward a point on the horizon right of the tower, so it never passes behind
// the bars. On the lift (the B section's climb, eight bars later) it comes back round: it
// overtakes us from behind, rising into view from below the screen, and eases back into its spot
// in the lane, where it cruises until the next loop's drop. With no music the same cycle runs on
// the scene's clock.

/** Depth on the floor (nearer than the tower's line), lane center (u from the screen center),
 *  and width (u at the tower's depth). */
export const CAR_Z = 1.75;
export const CAR_X = 0.325;
const CAR_W = 0.105;
/** The lane's center as a distance across the floor (u at the tower's depth): CAR_X at CAR_Z. */
const LANE = (CAR_X * CAR_Z) / TOWER_DEPTH;

type Loop = { sr: number; L: number; cues?: { drop?: number; lift?: number } };
const SONG = (manifest as Record<string, Loop | undefined>).neon;
/** The Neon song's loop (seconds), and when in it the car drives off and comes back round. */
export const LOOP_TIME = SONG ? SONG.L / SONG.sr : NaN;
export const DRIVE_OFF = SONG?.cues?.drop ?? NaN;
export const COME_BACK = SONG?.cues?.lift ?? NaN;

/** Driving off: depth gained (accelerating: ACCEL * seconds²), and the depths it fades over. */
const ACCEL = 0.9;
const FADE_FROM = 6;
const FADE_TO = 15;
/** Seconds from the drop until it has faded out for good. */
export const OFF_TIME = Math.sqrt((FADE_TO - CAR_Z) / ACCEL);
/** How far across the floor it drifts per unit of depth while driving off (u): toward the right. */
const VEER = 0.12;
/** Coming back: seconds from out of sight behind us to its spot, the depth it starts at (below
 *  the screen), and how far across the floor it starts (u: nearer the middle than its lane). */
export const BACK_TIME = 3;
const BEHIND_Z = 0.6;
const BEHIND_X = 0.13;
/** Seconds the exhausts flare after the drop. */
const FLARE_TIME = 0.9;

export type CarPhase = "cruise" | "off" | "gone" | "back";

/** Scratch result of `carAt`. */
const CAR = { x: 0, y: 0, w: 0, z: CAR_Z, alpha: 1, flare: 0, phase: "cruise" as CarPhase };

/** Where in its cycle the car is: seconds into the song's loop (or the scene's clock, looped). */
export function cycleTime(s: Scene): number {
  const song = s.songTime ?? NaN;
  const t = Number.isFinite(song) ? song : s.t;
  return ((t % LOOP_TIME) + LOOP_TIME) % LOOP_TIME;
}

function ease(k: number): number {
  const m = 1 - Math.min(1, Math.max(0, k));
  return 1 - m * m * m;
}

/** Where the car is now: its middle on the ground (x, y), its width (px), depth and opacity. */
export function carAt(s: Scene): typeof CAR {
  const u = s.u;
  let z = CAR_Z;
  let across = LANE;
  CAR.alpha = 1;
  CAR.flare = 0;
  CAR.phase = "cruise";
  if (Number.isFinite(LOOP_TIME) && Number.isFinite(DRIVE_OFF) && Number.isFinite(COME_BACK)) {
    const now = cycleTime(s);
    const sinceOff = (((now - DRIVE_OFF) % LOOP_TIME) + LOOP_TIME) % LOOP_TIME;
    const sinceBack = (((now - COME_BACK) % LOOP_TIME) + LOOP_TIME) % LOOP_TIME;
    if (sinceOff < sinceBack) {
      // Gone since the drop: off down the grid, then out of sight.
      if (sinceOff < OFF_TIME) {
        CAR.phase = "off";
        z = CAR_Z + ACCEL * sinceOff * sinceOff;
        across = LANE + VEER * (z - CAR_Z);
        const k = Math.min(1, Math.max(0, (z - FADE_FROM) / (FADE_TO - FADE_FROM)));
        CAR.alpha = 1 - k * k * (3 - 2 * k);
        CAR.flare = Math.max(0, 1 - sinceOff / FLARE_TIME);
      } else {
        CAR.phase = "gone";
        CAR.alpha = 0;
      }
    } else if (sinceBack < BACK_TIME) {
      // Back round from behind us, easing into its spot.
      CAR.phase = "back";
      const k = ease(sinceBack / BACK_TIME);
      z = BEHIND_Z + (CAR_Z - BEHIND_Z) * k;
      across = BEHIND_X + (LANE - BEHIND_X) * k;
    }
  }
  const k = TOWER_DEPTH / z;
  CAR.z = z;
  CAR.w = CAR_W * u * k;
  CAR.x = s.cssW / 2 + across * u * k + Math.sin(s.t * 0.37) * u * 0.006 * k;
  CAR.y = fieldY(s, z) + Math.sin(s.t * 3.1) * CAR.w * 0.004;
  return CAR;
}

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
const EXHAUST = mix(SHADOW_MID, ORANGE, 0.35);
const FLAME = mix(ORANGE, PINK, 0.3);
const FLAME_CORE = mix(GOLD, "#ffffff", 0.4);
const TYRE = mix(SHADOW, VIOLET, 0.12);
const TYRE_RIM = alpha(VIOLET, 0.45);

/** The chrome gradient, in the car's own frame (built once per context). */
const cache = { ctx: null as Ctx | null, chrome: null as CanvasGradient | null };

function poly(ctx: Ctx, pts: readonly (readonly [number, number])[]): void {
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
}

export function drawCar(ctx: Ctx, s: Scene): void {
  const { x, y, w, alpha: fade, flare } = carAt(s);
  if (fade <= 0 || y - w * 0.65 > s.cssH) return;
  if (cache.ctx !== ctx || !cache.chrome) {
    const g = ctx.createLinearGradient(0, -0.385, 0, -0.08);
    for (const [stop, c] of CHROME) g.addColorStop(stop, c);
    cache.ctx = ctx;
    cache.chrome = g;
  }
  const px = 1 / w; // one pixel, in car widths
  ctx.save();
  ctx.globalAlpha = fade;
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
  if (flare > 0) {
    // Flooring it: the exhausts flare, flickering, and die down.
    const f = flare * (0.8 + 0.2 * Math.sin(s.t * 47));
    ctx.beginPath();
    oval(ctx, -0.3, -0.105, 0.055 * f, 0.04 * f);
    oval(ctx, 0.3, -0.105, 0.055 * f, 0.04 * f);
    ctx.fillStyle = FLAME;
    ctx.fill();
    ctx.beginPath();
    oval(ctx, -0.3, -0.11, 0.028 * f, 0.02 * f);
    oval(ctx, 0.3, -0.11, 0.028 * f, 0.02 * f);
    ctx.fillStyle = FLAME_CORE;
    ctx.fill();
  }

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

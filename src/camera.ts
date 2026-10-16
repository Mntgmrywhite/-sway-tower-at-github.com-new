import { BLOCK_HEIGHT, SLIDE_RANGE, WORLD_WIDTH } from "./config";
import { kickAmplitude, swayOffset, type GameState } from "./game";

// The camera: how world units land on the screen, and Hard mode's sideways follow.
//
// Hard mode slices nothing, so a tower can lean far past its base (harmonic stacking) and the
// slider, which runs centered on the top bar, goes with it. The vertical camera only climbs, so in
// Hard the tower layer (bars, slider, falling pieces, flash, PERFECT pop, toppling slab) also pans
// sideways to keep the top and the slider in view. The scenery and the HUD never pan, and while the
// base is on screen the pan fades to 0 so the tower never slides off its plinth. Normal never pans.
// Renderer-only: the game never sees any of this.

/** World units visible horizontally; a little wider than the slider's travel. */
export const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
export const TOP_ANCHOR = 0.38;
/** Until the tower is tall enough, hold the ground this far down the screen. */
export const GROUND_START = 0.7;

/**
 * How fast the sideways camera eases toward its target, per second. A little brisker than the climb
 * (6): a drop can move the slider's run sideways by up to half a bar, and it should follow quickly.
 */
export const PAN_EASE = 8;
/** In the follow, a bar this many levels below the top weighs 1/e as much as the top bar. */
const PAN_FOLLOW_DEPTH = 6;
/**
 * At least this fraction of the slider stays on screen even at the ends of its run. (Its whole run
 * is wider than a phone's view: Normal shows 5/6 of a base-wide slider there.)
 */
const PAN_SLIDER_SHOWN = 2 / 3;
/**
 * Something the camera would like to keep on screen but can't still pulls it, less the further it
 * misses, until it misses by this much, world units. (The slider's whole run misses a phone's view by
 * 20, so it never pulls there.)
 */
const PAN_WANT_RAMP = 2 * BLOCK_HEIGHT;
/** The pan fades in once the base's top edge is this far below the bottom of the screen, world units... */
const PAN_FADE_FROM = BLOCK_HEIGHT / 2;
/** ...and reaches full strength this much further down. */
const PAN_FADE_SPAN = 2 * BLOCK_HEIGHT;

/** Where the world sits on a `cssW` x `cssH` screen this frame (CSS px and world units). */
export interface Frame {
  /** Size unit: the portrait play area's width, px. */
  u: number;
  /** Pixels per world unit. */
  scale: number;
  /** Screen x of world x = 0, px. */
  offsetX: number;
  /** Screen y of `cameraY`, px. */
  anchorPx: number;
  /** World y shown at the anchor (the view's camera, held up while the tower is short). */
  cameraY: number;
  /** World units visible either side of the screen's center line, which shows x = WORLD_WIDTH / 2. */
  halfWidth: number;
  /** World y at the screen's bottom and top edges. */
  bottom: number;
  top: number;
}

/** The screen geometry for a view whose eased camera is at `viewCameraY`. */
export function frameFor(cssW: number, cssH: number, viewCameraY: number): Frame {
  // Portrait-shaped play area, centered; letterboxed on wide screens.
  const u = Math.min(cssW, cssH * 0.6);
  const scale = u / VIEW_WIDTH;
  const offsetX = (cssW - WORLD_WIDTH * scale) / 2;
  const anchorPx = cssH * TOP_ANCHOR;
  // Early on, sit the ground low so the sky gets the room; the follow camera takes over
  // smoothly once the tower is taller than that.
  const cameraY = Math.max(viewCameraY, ((GROUND_START - TOP_ANCHOR) * cssH) / scale);
  return {
    u,
    scale,
    offsetX,
    anchorPx,
    cameraY,
    halfWidth: cssW / (2 * scale),
    bottom: cameraY - (cssH - anchorPx) / scale,
    top: cameraY + anchorPx / scale,
  };
}

/**
 * How far the bar at `level` can sway from its rest position at the current calm, world units: the
 * wave's full swing plus the kick's amplitude (which only dies down from here).
 */
export function swayReach(state: GameState, level: number): number {
  const wave = swayOffset({ ...state, swayAngle: Math.PI / 2, kick: 0 }, level);
  const kick = swayOffset({ ...state, swayAngle: 0, kick: kickAmplitude(state) }, level);
  return Math.abs(wave) + Math.abs(kick);
}

type Span = readonly [number, number];

/** The pans (world units) that keep world x from `lo` to `hi` on screen; empty when it is too wide. */
function fit(frame: Frame, lo: number, hi: number): Span {
  const mid = WORLD_WIDTH / 2;
  return [hi - mid - frame.halfWidth, lo - mid + frame.halfWidth];
}

function meet(a: Span, b: Span): Span | null {
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Narrow `span` to the pans that also keep `want` on screen. A want that can't be met there still
 * pulls the span toward the nearest it can come (its middle, if it is wider than the screen), fully
 * when it only just misses and not at all once it misses by PAN_WANT_RAMP: so the camera never
 * lurches as a want starts or stops fitting (a kick dying down, a bar leaving the screen).
 */
function narrow(span: Span, want: Span): Span {
  const met = meet(span, want);
  if (met) return met;
  const [a, b] = want;
  const goal = a > b ? (a + b) / 2 : b < span[0] ? b : a;
  const p = Math.min(span[1], Math.max(span[0], goal));
  const short = Math.max(0, a - b) + Math.abs(goal - p);
  const k = Math.max(0, 1 - short / PAN_WANT_RAMP);
  return [span[0] + (p - span[0]) * k, span[1] + (p - span[1]) * k];
}

/**
 * Where the sideways camera wants to be while a Hard run is played, world units (the tower layer is
 * drawn this far left). It follows the bars on screen, the top ones weighing most, clamped so these
 * stay on screen, most important first: the top bar wherever its sway can take it and most of the
 * slider at the ends of its run (if even those can't both fit, it centers them); then the slider's
 * whole run and the tower on screen, each as far as it still fits. Uses rest positions, so the
 * camera never sways with the tower. The bar at the bottom edge counts as much as it shows, so a bar
 * leaving the screen never jolts the target. Normal (and any finished run) gets 0.
 */
export function panTarget(state: GameState, frame: Frame): number {
  if (state.mode !== "hard" || state.phase !== "playing") return 0;
  const edge = frame.bottom / BLOCK_HEIGHT;
  const first = Math.max(0, Math.floor(edge));
  const all = targetFrom(state, frame, first);
  // How much of bar `first` shows above the bottom edge (all of it while the base is in view).
  const shows = Math.min(1, first + 1 - edge);
  if (shows >= 1 || first >= state.blocks.length - 1) return all;
  const rest = targetFrom(state, frame, first + 1);
  return rest + (all - rest) * shows;
}

/** panTarget, counting the bars from `first` up as the ones on screen. */
function targetFrom(state: GameState, frame: Frame, first: number): number {
  const blocks = state.blocks;
  const topLevel = blocks.length - 1;
  const top = blocks[topLevel]!;
  // The slider's run is centered on the top bar's rest center.
  const center = top.x + top.w / 2;
  const reach = swayReach(state, topLevel);

  // Follow the bars on screen. No lower bar sways further than the top one, so `reach` covers them all.
  let weight = 0;
  let sum = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = topLevel; i >= first; i--) {
    const b = blocks[i]!;
    const k = Math.exp((i - topLevel) / PAN_FOLLOW_DEPTH);
    weight += k;
    sum += k * (b.x + b.w / 2);
    lo = Math.min(lo, b.x - reach);
    hi = Math.max(hi, b.x + b.w + reach);
  }
  const follow = sum / weight - WORLD_WIDTH / 2;

  const w = state.slider.w;
  const shown = (PAN_SLIDER_SHOWN - 0.5) * w;
  // Both are centered on the top bar's rest center, so where they can't both fit, centering on it
  // is where they just stopped fitting: no jump.
  const must = meet(
    fit(frame, top.x - reach, top.x + top.w + reach),
    fit(frame, center - SLIDE_RANGE - shown, center + SLIDE_RANGE + shown),
  );
  if (!must) return center - WORLD_WIDTH / 2;
  let span = must;
  for (const want of [fit(frame, center - SLIDE_RANGE - w / 2, center + SLIDE_RANGE + w / 2), fit(frame, lo, hi)]) {
    span = narrow(span, want);
  }
  return Math.min(span[1], Math.max(span[0], follow));
}

/**
 * After the run ends the camera holds still, except that a toppling slab's pivot (world x) is
 * brought on screen with `room` world units to spare (or centered, on a screen too narrow for that).
 */
export function holdPan(pan: number, frame: Frame, pivotX: number | null, room: number): number {
  if (pivotX === null) return pan;
  const [lo, hi] = fit(frame, pivotX - room, pivotX + room);
  return lo <= hi ? Math.min(hi, Math.max(lo, pan)) : pivotX - WORLD_WIDTH / 2;
}

/**
 * 0 while the base can be seen (or nearly), rising to 1 as the camera climbs past it: the pan
 * drawn is the eased pan times this, so it never moves the base off its plinth and never jumps.
 */
export function panFade(frame: Frame): number {
  const below = frame.bottom - BLOCK_HEIGHT - PAN_FADE_FROM;
  return Math.min(1, Math.max(0, below / PAN_FADE_SPAN));
}

/** The lowest (view) camera at which panFade is still `fade` (0..1) on a `cssW` x `cssH` screen. */
export function fadeCamera(cssW: number, cssH: number, fade: number): number {
  const f = frameFor(cssW, cssH, 0);
  return BLOCK_HEIGHT + PAN_FADE_FROM + fade * PAN_FADE_SPAN + (cssH - f.anchorPx) / f.scale;
}

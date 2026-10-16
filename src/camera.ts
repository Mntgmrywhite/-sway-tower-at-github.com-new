import { BLOCK_HEIGHT, SLIDE_RANGE, WORLD_WIDTH } from "./config";
import { kickAmplitude, swayOffset, top, type GameState } from "./game";

// The camera: how world units land on the screen, and Hard mode's zoom and sideways follow.
//
// Hard mode slices nothing, so a tower can lean far past its base (harmonic stacking) and the
// slider, which runs centered on the top bar, goes with it; Hard's sway is strong too. So in Hard,
// when the top bar (at the far ends of its sway) or the slider would leave the screen, the whole
// frame zooms out (scenery and tower together, so the tower stays on its plinth), down to ZOOM_MIN,
// and eases back in once there is room again. Zoomed out, the frame is laid out on a virtual screen
// 1/zoom as wide and as tall at the same size unit and scale, and drawn shrunk by the zoom: the top
// of the tower stays where it is on screen (the ground, while it is held low). The HUD never zooms.
//
// Once the base has left the screen, the tower layer (bars, slider, falling pieces, flash, PERFECT
// pop, toppling slab) can also pan sideways to keep the top and the slider in view; the scenery and
// the HUD never pan, and while the base is on screen the pan fades to 0 so the tower never slides
// off its plinth. The camera zooms only as far out as the pan can't cover. Normal never zooms or
// pans. Renderer-only: the game never sees any of this.

/** World units visible horizontally; a little wider than the slider's travel. */
export const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
export const TOP_ANCHOR = 0.38;
/** Until the tower is tall enough, hold the ground this far down the screen. */
export const GROUND_START = 0.7;

/** Hard's camera never zooms out further than this: the whole frame drawn at 60% of its size. */
export const ZOOM_MIN = 0.6;
/**
 * The zoom eases out toward its target over about this long, seconds: briskly, since a drop that
 * leans the tower or kicks its sway takes the top toward the edge within a quarter of a sway...
 */
export const ZOOM_OUT_TIME = 0.25;
/** ...and back in, gently, once the room has been there for ZOOM_HOLD seconds. */
export const ZOOM_IN_TIME = 0.7;
export const ZOOM_HOLD = 0.8;
/** Within a frame's worth of this rate (per second) of its goal, the zoom is there: it arrives instead of creeping. */
const ZOOM_MIN_RATE = 0.01;
/** The zoom's target is found to within this much. */
const ZOOM_PRECISION = 1e-4;

/**
 * How fast the sideways camera eases toward its target, per second. A little brisker than the climb
 * (6): a drop can move the slider's run sideways by up to half a bar, and it should follow quickly.
 */
export const PAN_EASE = 8;
/** In the follow, a bar this many levels below the top weighs 1/e as much as the top bar. */
const PAN_FOLLOW_DEPTH = 6;
/**
 * At least this fraction of the slider stays on screen even at the ends of its run (zooming out if
 * need be): as much as Normal shows of a base-wide slider there, its whole run being a little wider
 * than a phone's view. (On a phone at full zoom, that means centered on the top bar.)
 */
const SLIDER_SHOWN = 5 / 6;
/** The top bar stays this far (world units) inside the screen's side edges at the far ends of its sway. */
const TOP_MARGIN = 1;
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
  /** Size unit: the portrait play area's width, px (the screen's own, whatever the zoom). */
  u: number;
  /** Pixels per world unit (before the zoom). */
  scale: number;
  /** The frame is drawn shrunk by this (1: not zoomed). */
  zoom: number;
  /** The (virtual) screen the frame is laid out on, CSS px: the screen's size / zoom. */
  width: number;
  height: number;
  /** Screen x of world x = 0, px (on the virtual screen). */
  offsetX: number;
  /** Screen y of `cameraY`, px (on the virtual screen). */
  anchorPx: number;
  /** World y shown at the anchor (the view's camera, held up while the tower is short). */
  cameraY: number;
  /** World units visible either side of the screen's center line, which shows x = WORLD_WIDTH / 2. */
  halfWidth: number;
  /** World y at the screen's bottom and top edges. */
  bottom: number;
  top: number;
}

/**
 * The screen geometry for a view whose eased camera is at `viewCameraY`, zoomed out by `zoom` (the
 * frame is laid out on a virtual screen `cssW / zoom` x `cssH / zoom` with the screen's own size unit
 * and scale, then drawn shrunk by `zoom` from the top left: the camera's rules hold on that screen).
 */
export function frameFor(cssW: number, cssH: number, viewCameraY: number, zoom = 1): Frame {
  // Portrait-shaped play area, centered; letterboxed on wide screens.
  const u = Math.min(cssW, cssH * 0.6);
  const scale = u / VIEW_WIDTH;
  const width = cssW / zoom;
  const height = cssH / zoom;
  const offsetX = (width - WORLD_WIDTH * scale) / 2;
  const anchorPx = height * TOP_ANCHOR;
  // Early on, sit the ground low so the sky gets the room; the follow camera takes over
  // smoothly once the tower is taller than that.
  const cameraY = Math.max(viewCameraY, ((GROUND_START - TOP_ANCHOR) * height) / scale);
  return {
    u,
    scale,
    zoom,
    width,
    height,
    offsetX,
    anchorPx,
    cameraY,
    halfWidth: width / (2 * scale),
    bottom: cameraY - (height - anchorPx) / scale,
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

/**
 * How far Hard's camera keeps on screen either side of the top bar's rest center, world units: the
 * top bar at the far ends of its sway (as it swings once a perfect drop's calm has worn off, so the
 * camera never breathes with the calm), TOP_MARGIN inside the edges, and SLIDER_SHOWN of the slider
 * at the ends of its run (which is centered there too).
 */
export function holdReach(state: GameState): number {
  const level = state.blocks.length - 1;
  const t = top(state);
  const reach = swayReach({ ...state, calm: 0 }, level);
  return Math.max(SLIDE_RANGE + (SLIDER_SHOWN - 0.5) * state.slider.w, t.w / 2 + reach + TOP_MARGIN);
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
 * stay on screen, most important first: what holdReach keeps around the top bar (if even that can't
 * fit, it centers it); then the slider's whole run and the tower on screen, each as far as it still
 * fits. Uses rest positions, so the camera never sways with the tower. The bar at the bottom edge
 * counts as much as it shows, so a bar leaving the screen never jolts the target. Normal (and any
 * finished run) gets 0.
 */
export function panTarget(state: GameState, frame: Frame): number {
  if (state.mode !== "hard" || state.phase !== "playing") return 0;
  const edge = frame.bottom / BLOCK_HEIGHT;
  const first = Math.max(0, Math.floor(edge));
  const hold = holdReach(state);
  const all = targetFrom(state, frame, first, hold);
  // How much of bar `first` shows above the bottom edge (all of it while the base is in view).
  const shows = Math.min(1, first + 1 - edge);
  if (shows >= 1 || first >= state.blocks.length - 1) return all;
  const rest = targetFrom(state, frame, first + 1, hold);
  return rest + (all - rest) * shows;
}

/** panTarget, counting the bars from `first` up as the ones on screen. */
function targetFrom(state: GameState, frame: Frame, first: number, hold: number): number {
  const blocks = state.blocks;
  const topLevel = blocks.length - 1;
  const top = blocks[topLevel]!;
  // The slider's run is centered on the top bar's rest center.
  const center = top.x + top.w / 2;
  const reach = swayReach({ ...state, calm: 0 }, topLevel);

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
  const [a, b] = fit(frame, center - hold, center + hold);
  // Centered on the top bar's rest center where it can't fit: where it just stopped fitting, no jump.
  if (a > b) return center - WORLD_WIDTH / 2;
  let span: Span = [a, b];
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

/** The lowest (view) camera at which panFade is still `fade` (0..1) on a `cssW` x `cssH` screen zoomed by `zoom`. */
export function fadeCamera(cssW: number, cssH: number, fade: number, zoom = 1): number {
  const f = frameFor(cssW, cssH, 0, zoom);
  return BLOCK_HEIGHT + PAN_FADE_FROM + fade * PAN_FADE_SPAN + (f.height - f.anchorPx) / f.scale;
}

/**
 * How far (world units) what holdReach keeps around the top bar would stick out past the screen's
 * side edges in this frame, with the pan as it settles here (its target, faded by the base); at or
 * below 0 it all fits.
 */
export function spill(state: GameState, frame: Frame, hold = holdReach(state)): number {
  const t = top(state);
  const fade = panFade(frame);
  const pan = fade > 0 ? panTarget(state, frame) * fade : 0;
  return Math.abs(t.x + t.w / 2 - WORLD_WIDTH / 2 - pan) + hold - frame.halfWidth;
}

/** Zoom search step: fine enough that a short stretch of zooms where it doesn't fit is not skipped. */
const ZOOM_SCAN = 0.01;
/**
 * A spill this small (world units) still fits: it is floating-point rounding, nothing a screen could
 * show. Without it, a fit exactly at the edge (the slider's share filling a phone's view at zoom 1)
 * could round to a spill: the zoom would leave 1 for nothing (a straight tower on a 310 or 336 px
 * wide screen) and, worse, re-arm ZOOM_HOLD every such frame, keeping the view zoomed out longer.
 */
const FIT_SLACK = 1e-9;

/** Where Hard's zoom should head this frame, and whether it must go now (the zoom it has spills). */
export interface ZoomAim {
  zoom: number;
  urgent: boolean;
}

/**
 * Where Hard's zoom heads this frame, from the eased zoom `current`, with the view's camera at
 * `viewCameraY` on a `cssW` x `cssH` screen. Where what holdReach keeps around the top bar fits
 * (spill <= 0) it climbs back in as far as it keeps fitting, never through zooms where it doesn't:
 * zooming out shows more below and can bring the base back into view, which takes the pan away, so
 * a zoom that fits further in may not be reachable without the top leaving the screen on the way.
 * Where it spills, it must move: out to the closest zoom that fits, down to ZOOM_MIN, or failing
 * that the one on the way that spills least. A finished run (and Normal) holds the zoom where it is.
 */
export function zoomTarget(state: GameState, cssW: number, cssH: number, viewCameraY: number, current: number): ZoomAim {
  if (state.mode !== "hard" || state.phase !== "playing") return { zoom: current, urgent: false };
  const hold = holdReach(state);
  const spillAt = (z: number) => spill(state, frameFor(cssW, cssH, viewCameraY, z), hold) - FIT_SLACK;
  /** Where the spill crosses 0 between a zoom that fits and one that doesn't: the fitting side. */
  const edge = (fits: number, not: number) => {
    while (Math.abs(not - fits) > ZOOM_PRECISION) {
      const mid = (fits + not) / 2;
      if (spillAt(mid) <= 0) fits = mid;
      else not = mid;
    }
    return fits;
  };
  const z0 = Math.min(1, Math.max(ZOOM_MIN, current));
  let least = spillAt(z0);
  if (least <= 0) {
    for (let z = z0; z < 1; ) {
      const next = Math.min(1, z + ZOOM_SCAN);
      if (spillAt(next) > 0) return { zoom: edge(z, next), urgent: false };
      z = next;
    }
    return { zoom: 1, urgent: false };
  }
  let best = z0;
  for (let z = z0; z > ZOOM_MIN; ) {
    const next = Math.max(ZOOM_MIN, z - ZOOM_SCAN);
    const s = spillAt(next);
    if (s <= 0) return { zoom: edge(next, z), urgent: true };
    if (s < least) {
      least = s;
      best = next;
    }
    z = next;
  }
  return { zoom: best, urgent: true };
}

/** Hard's zoom state: the eased zoom and its speed, where it is heading, and how long before it may head back in. */
export interface Zoom {
  zoom: number;
  /** Per second. */
  vel: number;
  goal: number;
  /** Seconds left before the goal may rise of its own accord. */
  wait: number;
  /** Heading for a goal it must reach quickly (the zoom it had spilled): eased as briskly as a zoom out. */
  brisk: boolean;
}

/** A zoom at 1, going nowhere. */
export function newZoom(): Zoom {
  return { zoom: 1, vel: 0, goal: 1, wait: 0, brisk: false };
}

/**
 * Ease the zoom one frame of `dt` toward its goal: a critically damped spring (so it starts and
 * stops without a jolt), brisk on the way out or when it must (ZOOM_OUT_TIME) and gentle on the way
 * back in (ZOOM_IN_TIME). It never overshoots the goal, and arrives instead of creeping (ZOOM_MIN_RATE).
 */
export function easeZoom(z: Zoom, dt: number): void {
  const brisk = z.brisk || z.goal < z.zoom;
  const omega = 2 / (brisk ? ZOOM_OUT_TIME : ZOOM_IN_TIME);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = z.zoom - z.goal;
  const pull = (z.vel + omega * change) * dt;
  let vel = (z.vel - omega * pull) * decay;
  let next = z.goal + (change + pull) * decay;
  // Arrive: past the goal, or within a slow frame's step of it, it is there.
  if ((change > 0 && next <= z.goal) || (change < 0 && next >= z.goal) || Math.abs(next - z.goal) <= ZOOM_MIN_RATE * dt) {
    next = z.goal;
    vel = 0;
  }
  z.zoom = next;
  z.vel = vel;
}

/**
 * One frame of Hard's zoom while a run is played. Where the zoom spills it heads for `aim` at once,
 * briskly, and won't head back in until ZOOM_HOLD seconds after it last spilled; otherwise the goal
 * follows `aim` down at once and up only once that hold is over, gently. Then the zoom eases.
 */
export function stepZoom(z: Zoom, aim: ZoomAim, dt: number): void {
  if (aim.urgent) {
    z.goal = aim.zoom;
    z.wait = ZOOM_HOLD;
    z.brisk = true;
  } else if (aim.zoom < z.goal) {
    z.goal = aim.zoom;
  } else if (z.wait > 0) {
    z.wait = Math.max(0, z.wait - dt);
  } else {
    z.goal = aim.zoom;
    z.brisk = false;
  }
  easeZoom(z, dt);
}

import { BLOCK_HEIGHT, LIVES } from "./config";
import { contactSpeed, sliderGap, sliderLift, swayOffset, type Block, type DropResult, type GameState } from "./game";
import { roundRectPath } from "./base/draw";
import { kitFor } from "./base/style";
import { horizonFor } from "./base/world";
import {
  easeZoom,
  frameFor,
  GROUND_START,
  newZoom,
  PAN_EASE,
  panFade,
  panTarget,
  stepZoom,
  zoomTarget,
  type Frame,
  type Zoom,
} from "./camera";
import type { Scene, Skin } from "./skins/skin";
import type { Achievement } from "./achievements";
import { drawMedalStrip } from "./medals";
import { addFalling as pushFalling, FALL_ALPHA, stepFalling, type Falling } from "./fx/falling";
import { addPop, drawPops, stepPops, type Pop } from "./fx/pops";
import { drawTopple, flashAlpha, missSide, shakeOffset, startTopple, stepTopple, toppling, type Topple } from "./fx/topple";

export const GAME_NAME = "Sway Tower";

/** The HUD's top line (the score, or the logo) sits this far down the screen. */
const HUD_TOP = 0.14;
/** The logo's type size, in u (shrunk to fit narrow screens). */
const LOGO_SIZE = 0.13;
/** "tap to play again" sits this far below the game-over card, in u. */
const OVER_TAP_LINE = 0.1;

/** Per-frame choices from main.ts. */
export interface RenderOptions {
  /** The title screen: the scene and the logo only (src/title.ts draws its controls over it). */
  title?: boolean;
  /** The game-over card only: the medals this run earned, shown in a row above the card. */
  newMedals?: readonly Achievement[];
  /** Seconds the game-over card has been up, for the medals' pop-in (default: fully in). */
  cardAge?: number;
  /** The player asked for less motion: the game-over blast doesn't shake the scene. */
  still?: boolean;
}

const CAMERA_EASE = 6; // per second
/** Perfect-drop flash: light bursts along the seam and the block glows in the accent color. */
const FLASH_TIME = 0.5; // seconds
const SEAM_SPREAD = 0.6; // how far the seam light reaches past the block edges, in block widths
/** The screen size the sideways camera frames the tower for until the first frame is drawn, CSS px. */
const DEFAULT_SCREEN = { w: 390, h: 844 };
/**
 * The drawn pan fades in at most this fast, per second: as fast as the climbing camera ever fades it
 * in (a bar's climb at CAMERA_EASE over the fade's span). A zoom sweeps the base past the bottom edge
 * several times faster than that.
 */
const PAN_FADE_RATE = 3;

interface Flash {
  level: number;
  age: number;
}

export interface View {
  cameraY: number; // world y shown at TOP_ANCHOR
  /**
   * Whether the camera zooms out and pans sideways after a leaning tower (src/camera.ts). False in
   * every run: both modes slice, so no tower leans past what a phone shows, and Slide and Drop are
   * framed the same way (Drop's slider lane a bar higher). Kept for a mode that would need it;
   * tests turn it on to keep that machinery honest. While it is off, `panX`, `zoom` and `fade` stay
   * as newView() made them and nothing is drawn zoomed or panned.
   */
  follow: boolean;
  /**
   * The sideways camera, world units: the tower layer is drawn this far left, faded out while the
   * base is on screen (src/camera.ts). Always 0 unless `follow`.
   */
  panX: number;
  /**
   * The zoom (src/camera.ts): the whole frame but the HUD is drawn shrunk by `zoom.zoom` (1: not
   * zoomed), so a leaning or swinging tower top and the slider stay on screen. Always 1 unless `follow`.
   */
  zoom: Zoom;
  /**
   * How much of the pan is drawn (0..1). It follows panFade down at once, so the tower is on its
   * plinth whenever the base shows, but rises at most PAN_FADE_RATE a second: a zoom that sweeps
   * the base off the bottom edge eases the pan in instead of throwing the tower sideways.
   */
  fade: number;
  /** The CSS size the view was last drawn at: the zoom and the sideways camera frame the tower for it. */
  screen: { w: number; h: number };
  falling: Falling[];
  flashes: Flash[];
  /** The PERFECT word over the block that just landed (src/fx/pops.ts). */
  pops: Pop[];
  /** The end of the run: the top of the tower going over and blowing up (src/fx/topple.ts); the card waits for it. */
  topple: Topple | null;
  /** Animation clock for background effects, seconds. */
  t: number;
}

export function newView(): View {
  return {
    cameraY: BLOCK_HEIGHT,
    follow: false,
    panX: 0,
    zoom: newZoom(),
    fade: 0,
    screen: { ...DEFAULT_SCREEN },
    falling: [],
    flashes: [],
    pops: [],
    topple: null,
    t: 0,
  };
}

/** `towerX` is the world x of the tower top's center; pieces tumble away from it (already falling at `vy`, units/sec). */
export function addFalling(view: View, piece: Block, level: number, towerX: number, vy = 0): void {
  pushFalling(view.falling, piece, level, towerX, vy);
}

/**
 * Call after a perfect drop onto `level`: the seam flash and gold tint, and the PERFECT pop.
 * `streak` is the perfect streak including this drop (PERFECT ×n from 2 on).
 */
export function addFlash(view: View, level: number, streak: number): void {
  view.flashes.push({ level, age: 0 });
  addPop(view.pops, level, streak);
}

/**
 * Call when the miss that takes the last life lands (`dir`: the side the missed bar fell to): the top
 * of the tower goes over that way and blows up, and the game-over card waits for it.
 */
export function addTopple(view: View, state: GameState, dir: -1 | 1): void {
  view.topple = startTopple(state, dir);
}

/** True while the tower is still going over and blowing up: the game-over card (and a restart) wait for it. */
export function isToppling(view: View): boolean {
  return toppling(view.topple);
}

/**
 * What the view shows for a bar that met the tower onto `level` (the top bar's center was at world x
 * `towerX`): a perfect flashes and pops, a slice or a miss falls away (in Drop at the speed the bar
 * arrived), and the miss that ends the run sends the top over toward the side it fell to. main.ts
 * and the previews both call it.
 */
export function showLanding(view: View, state: GameState, r: DropResult, level: number, towerX: number): void {
  if (r.kind === "perfect") {
    addFlash(view, level, state.streak);
    return;
  }
  addFalling(view, r.cut, level, towerX, contactSpeed(state.mode));
  if (r.kind === "miss" && state.phase === "over") addTopple(view, state, missSide(r.cut, towerX));
}

/** What happened in a frame of the view that main.ts plays a sound or a haptic for. */
export interface ViewEvents {
  /** The toppling tower blew up this frame: the boom and the heavy haptic. */
  blast: boolean;
}

export function updateView(view: View, state: GameState, dt: number): ViewEvents {
  view.t += dt;
  for (const f of view.flashes) f.age += dt;
  if (view.flashes.some((f) => f.age >= FLASH_TIME)) view.flashes = view.flashes.filter((f) => f.age < FLASH_TIME);
  // The top of the slider's lane: in Drop it runs a bar higher, and the camera keeps it (and the
  // bar falling from it) where Slide's shows.
  const target = (state.blocks.length + 1) * BLOCK_HEIGHT + sliderGap(state.mode);
  if (view.follow) {
    // The zoom first: the pan frames the tower for the zoom it has this frame. Once the run is over
    // it only settles where it was heading.
    const { w, h } = view.screen;
    if (state.phase === "playing") stepZoom(view.zoom, zoomTarget(state, w, h, view.cameraY, view.zoom.zoom), dt);
    else easeZoom(view.zoom, dt);
    stepPan(view, state, dt);
  }
  view.cameraY += (target - view.cameraY) * Math.min(1, CAMERA_EASE * dt);
  if (view.follow) {
    const { w, h } = view.screen;
    view.fade = Math.min(panFade(frameFor(w, h, view.cameraY, view.zoom.zoom)), view.fade + PAN_FADE_RATE * dt);
  }
  view.falling = stepFalling(view.falling, dt, view.cameraY + zoomDrop(view));
  stepPops(view.pops, dt);
  // The blast throws what is still falling along with it.
  const blast = view.topple ? stepTopple(view.topple, dt, view.falling) : false;
  return { blast };
}

/**
 * How much further down (world units) the zoomed screen reaches than an unzoomed one would: falling
 * bars are let go that much lower, so they leave by the bottom edge as they do at zoom 1. 0 unless the view follows.
 */
function zoomDrop(view: View): number {
  const zoom = towerZoom(view);
  if (zoom === 1) return 0;
  const { w, h } = view.screen;
  return frameFor(w, h, view.cameraY, zoom).bottom - frameFor(w, h, view.cameraY).bottom;
}

/** The sideways camera for this frame: it follows the tower while the run is played, then holds still. */
function stepPan(view: View, state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  const { w, h } = view.screen;
  const frame = frameFor(w, h, view.cameraY, view.zoom.zoom);
  view.panX += (panTarget(state, frame) - view.panX) * Math.min(1, PAN_EASE * dt);
}

export function render(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  state: GameState,
  view: View,
  best: number,
  skin: Skin,
  /** Seconds into the current music loop (audio.position()); NaN when silent. */
  songTime = NaN,
  opts: RenderOptions = {},
): void {
  // A zero-size canvas (a hidden tab, a web view not laid out yet) has nothing to draw, and the
  // scale below would divide by zero: the NaNs would throw and stop the frame loop for good.
  if (cssW <= 0 || cssH <= 0) return;
  view.screen.w = cssW;
  view.screen.h = cssH;
  // A following camera can zoom out (never in a run now: View.follow): then the world, the tower and
  // the foreground are laid out on a virtual screen 1/zoom as big (same u and scale) and drawn
  // shrunk by the zoom; the PERFECT pop and the HUD are drawn at the screen's own size.
  const zoom = towerZoom(view);
  const zoomed = zoom !== 1;
  const frame = frameFor(cssW, cssH, view.cameraY, zoom);
  const { u, scale, offsetX, anchorPx, cameraY } = frame;
  const vw = frame.width;
  const vh = frame.height;
  const sx = (x: number) => offsetX + x * scale;
  const sy = (y: number) => anchorPx - (y - cameraY) * scale;
  // The tower layer (bars, slider, falling bars, flash, pop) pans with a following camera's sideways
  // pan; the scenery and the HUD stay put.
  const pan = towerPan(view, frame);
  const tx = pan === 0 ? sx : (x: number) => sx(x - pan);

  const base = state.blocks[0];
  const groundY = sy(0);
  const rise = Math.max(0, groundY - vh * GROUND_START);
  const scene: Scene = {
    cssW: vw,
    cssH: vh,
    u,
    scale,
    t: view.t,
    rise,
    // The story follows the climb, not the zoom: a zoomed frame's camera is held higher early on
    // (its virtual screen is taller), which would move every skin's sky forward while zoomed.
    altitude: zoomed ? frameFor(cssW, cssH, view.cameraY).cameraY : cameraY,
    groundY,
    horizonY: horizonFor(groundY, rise, u),
    baseX: base ? sx(base.x) : 0,
    baseW: base ? base.w * scale : 0,
    songTime,
  };
  const kit = kitFor(skin);
  const h = BLOCK_HEIGHT * scale;
  // The title screen shows the scene and the logo (src/title.ts puts the buttons over it). A run's
  // start shows the name instead of a zero, best, lives and "tap to drop".
  const titleScreen = opts.title === true;
  const ready = !titleScreen && state.phase === "playing" && state.score === 0;
  const hud = hudLayout(cssH, u, state, ready);

  // The blast shakes the scene (not the HUD). Scaled up about the center by just enough that the
  // shaken scene still covers the screen's edges.
  const shake = view.topple && !opts.still ? shakeOffset(view.topple) : null;
  if (shake && shake.amp > 0) {
    const grow = 1 + (2 * shake.amp * u) / Math.min(cssW, cssH);
    ctx.save();
    ctx.translate(cssW / 2 + shake.x * u, cssH / 2 + shake.y * u);
    ctx.scale(grow, grow);
    ctx.translate(-cssW / 2, -cssH / 2);
  }
  if (zoomed) {
    ctx.save();
    ctx.scale(zoom, zoom);
  }
  kit.world(ctx, scene);

  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) =>
    kit.bar(ctx, tx(x), sy((level + 1) * BLOCK_HEIGHT), w * scale, h, level);

  /** A bar off the tower (a falling piece), centered at world (cx, cy). */
  const drawLoose = (cx: number, cy: number, w: number, angle: number, level: number) => {
    const pw = w * scale;
    ctx.save();
    ctx.translate(tx(cx), sy(cy));
    ctx.rotate(angle);
    ctx.globalAlpha = FALL_ALPHA;
    kit.bar(ctx, -pw / 2, -h / 2, pw, h, level);
    ctx.restore();
  };
  /** Whether a loose bar centered at world (cx, cy) can touch the screen at any angle. */
  const onScreen = (cx: number, cy: number, w: number) => {
    const reach = (w * scale) / 2 + h;
    const x = tx(cx);
    const y = sy(cy);
    return x > -reach && x < vw + reach && y > -reach && y < vh + reach;
  };

  // Only draw blocks that can be on screen. The top section of a toppling tower is drawn by its fall.
  const standing = view.topple ? view.topple.level : state.blocks.length;
  const firstVisible = Math.max(0, Math.floor(cameraY / BLOCK_HEIGHT - vh / h - 2));
  for (let i = firstVisible; i < standing; i++) {
    const b = state.blocks[i];
    if (b) drawBlock(b.x + swayOffset(state, i), b.w, i);
  }

  // Perfect-drop flash: accent tint on the block, light along the seam below it.
  for (const f of view.flashes) {
    const b = f.level < standing ? state.blocks[f.level] : undefined;
    if (!b) continue;
    if (f.age >= FLASH_TIME) continue;
    const k = f.age / FLASH_TIME; // 0 → 1
    const fade = 1 - k;
    const x = tx(b.x + swayOffset(state, f.level));
    const y = sy((f.level + 1) * BLOCK_HEIGHT);
    const w = b.w * scale;
    ctx.save();
    // Color change: the block glows in the accent color, then fades back.
    ctx.save();
    roundRectPath(ctx, x, y, w, h, h * kit.radius);
    ctx.clip();
    ctx.globalAlpha = fade * 0.65;
    ctx.fillStyle = skin.hud.accent;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    // Seam: a bright bar between the two blocks that shoots out sideways.
    const reach = w * SEAM_SPREAD * Math.sqrt(k);
    const seamY = y + h;
    const thick = Math.max(2, h * 0.28) * fade;
    const grad = ctx.createLinearGradient(x - reach, 0, x + w + reach, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5 * (reach / (w + reach * 2)) + 0.02, skin.hud.accent);
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(1 - 0.5 * (reach / (w + reach * 2)) - 0.02, skin.hud.accent);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.shadowColor = skin.hud.accent;
    // (Shadows ignore the canvas transform: scaled by the zoom so the glow keeps its size.)
    ctx.shadowBlur = h * 0.8 * fade * zoom;
    ctx.fillRect(x - reach, seamY - thick / 2, w + reach * 2, thick);
    ctx.restore();
  }

  for (const f of view.falling) {
    const cx = f.x + f.w / 2;
    const cy = f.y + BLOCK_HEIGHT / 2;
    if (onScreen(cx, cy, f.w)) drawLoose(cx, cy, f.w, f.angle, f.level);
  }
  if (view.topple) drawTopple({ ctx, kit, scale, h, sx: tx, sy, width: vw, height: vh }, view.topple);

  // The slider is in world space: it does not sway. In Drop it runs a bar above the tower, and a
  // bar let go falls from there straight down onto it (sliderLift closes the gap as it falls).
  if (state.phase === "playing" && !titleScreen) {
    const level = state.blocks.length;
    const s = state.slider;
    kit.bar(ctx, tx(s.x), sy((level + 1) * BLOCK_HEIGHT + sliderLift(state)), s.w * scale, h, level);
  }

  // The PERFECT pop goes over the slider so it always reads. Once the last life is gone the
  // game-over card takes the stage at once, so a pop still in flight would peek out around it.
  // Zoomed out, the pop rides its block where the zoom draws it but keeps its own size.
  if (zoomed) ctx.restore();
  if (state.phase === "playing") {
    const pop = zoomed
      ? { scale: scale * zoom, h: h * zoom, sx: (x: number) => tx(x) * zoom, sy: (y: number) => sy(y) * zoom }
      : { scale, h, sx: tx, sy };
    drawPops({ ctx, kit, skin, state, cssW, u, ...pop, hudBottom: hud.bottom }, view.pops);
  }

  if (zoomed) {
    ctx.save();
    ctx.scale(zoom, zoom);
  }
  kit.front(ctx, scene);
  if (zoomed) ctx.restore();
  if (shake && shake.amp > 0) ctx.restore();
  // The blast's flash lights the whole scene for a moment (the HUD stays on top).
  if (view.topple) kit.blast.flash(ctx, cssW, cssH, flashAlpha(view.topple));

  // HUD: outlined type (plus glow in neon), so it reads over any part of the scene.
  ctx.save();
  ctx.textAlign = "center";
  const top = hud.top;
  const body = kit.body;
  const text = (t: string, x: number, y: number, fill: string, outline: number) =>
    kit.text(ctx, t, x, y, fill, outline);

  // The tower goes over and blows up first; the card comes once it has.
  if (state.phase === "over" && !toppling(view.topple)) {
    drawGameOver(ctx, cssW, cssH, u, state, best, skin, opts);
    ctx.restore();
    return;
  }

  if (titleScreen || ready) {
    // The logo on the title, and the name instead of a zero at the start of a run.
    const size = fitFont(ctx, GAME_NAME, `400 {px}px ${skin.hud.display}`, u * LOGO_SIZE, cssW * 0.88);
    text(GAME_NAME, cssW / 2, top, skin.hud.title, Math.max(3, size * 0.12));
    // Drop's run start says so under the name (Slide's, the default, says nothing).
    if (ready && state.mode === "hard") {
      ctx.font = `700 ${Math.round(u * 0.04)}px ${body}`;
      text("DROP", cssW / 2, top + u * 0.062, skin.hud.accent, u * 0.01);
    }
  } else {
    ctx.font = `700 ${Math.round(u * 0.13)}px ${body}`;
    text(String(state.score), cssW / 2, top, "#ffffff", u * 0.016);
  }
  // The title's own controls show the modes and their bests.
  if (titleScreen) {
    ctx.restore();
    return;
  }
  ctx.font = `600 ${Math.round(u * 0.038)}px ${body}`;
  text(`best ${best}`, cssW / 2, hud.bestY, "#e8e4ff", u * 0.009);

  // Lives
  const r = u * 0.016;
  for (let i = 0; i < LIVES; i++) {
    kit.life(ctx, cssW / 2 + (i - (LIVES - 1) / 2) * r * 3.5, hud.livesY, r, i < state.lives);
  }

  // Perfect counter: total this game, hidden until the first one. (The PERFECT ×N word
  // already celebrates a run, so the HUD stays a single calm line.)
  if (state.perfects > 0) {
    ctx.font = `700 ${Math.round(u * 0.045)}px ${body}`;
    text(`★ ${state.perfects} perfect`, cssW / 2, hud.perfY, skin.hud.accent, u * 0.011);
  }

  // Gone once the first bar is let go (in Drop it is still falling: taps then do nothing).
  if (ready && !state.fall) {
    ctx.font = `600 ${Math.round(u * 0.055)}px ${body}`;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(view.t * 3);
    text("tap to drop", cssW / 2, cssH * 0.9, "#ffffff", u * 0.013);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** How much the frame is shrunk this frame: the eased zoom of a following view (1: not zoomed). Always 1 in a run. */
export function towerZoom(view: View): number {
  return view.follow ? view.zoom.zoom : 1;
}

/**
 * How far left the tower layer is drawn this frame, world units: a following view's eased sideways
 * camera, faded out while the base is on screen (and fading in no faster than PAN_FADE_RATE). 0 in a run.
 */
export function towerPan(view: View, frame: Frame): number {
  if (!view.follow) return 0;
  return view.panX * Math.min(view.fade, panFade(frame));
}

interface HudLayout {
  /** Score (or title) baseline. */
  top: number;
  /** "best N" baseline and the lives' center line. */
  bestY: number;
  livesY: number;
  /** "★ N perfect" baseline. */
  perfY: number;
  /** Lowest HUD pixel this frame: the PERFECT pop stays below it. */
  bottom: number;
}

/** Top-center HUD stack: score, best, lives, perfect counter. Drop's start of a run adds a DROP line. */
function hudLayout(cssH: number, u: number, state: GameState, ready: boolean): HudLayout {
  const top = cssH * HUD_TOP;
  const hardLine = ready && state.mode === "hard" ? u * 0.05 : 0;
  const bestY = top + u * 0.065 + hardLine;
  const livesY = top + u * 0.11 + hardLine;
  const perfY = top + u * 0.18;
  // The lowest line showing: the run, the perfect counter, else the lives.
  let bottom = livesY + u * 0.02;
  if (state.perfects > 0) bottom = perfY + u * 0.012;
  return { top, bestY, livesY, perfY, bottom };
}

function drawGameOver(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  u: number,
  state: GameState,
  best: number,
  skin: Skin,
  opts: RenderOptions,
): void {
  const hud = skin.hud;
  const kit = kitFor(skin);
  ctx.fillStyle = "rgba(4, 2, 10, 0.45)";
  ctx.fillRect(0, 0, cssW, cssH);

  const { x, y, w, h } = overCard(cssW, cssH, u);
  kit.card(ctx, x, y, w, h, u);

  const cx = cssW / 2;
  const text = (t: string, ty: number, fill: string, outline: number) => kit.text(ctx, t, cx, ty, fill, outline);
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(u * 0.09)}px ${hud.display}`;
  text("Game Over", y + h * 0.22, hud.title, u * 0.014);

  ctx.font = `700 ${Math.round(u * 0.15)}px ${kit.body}`;
  text(String(state.score), y + h * 0.54, "#ffffff", u * 0.018);

  const newBest = state.score > 0 && state.score >= best;
  ctx.font = `600 ${Math.round(u * 0.045)}px ${kit.body}`;
  text(newBest ? "New best!" : `best ${best}`, y + h * 0.68, newBest ? hud.accent : "#ffffff", u * 0.01);
  text(`★ ${state.perfects} perfect`, y + h * 0.8, hud.accent, u * 0.01);

  // The medals this run earned, in a row above the card (nothing shows while stacking).
  drawMedalStrip(ctx, {
    medals: opts.newMedals ?? [],
    card: { x, y, w, h },
    u,
    age: opts.cardAge ?? Infinity,
    text: (t, tx, ty, fill, outline) => kit.text(ctx, t, tx, ty, fill, outline),
    font: kit.body,
    accent: hud.accent,
  });

  ctx.font = `600 ${Math.round(u * 0.055)}px ${kit.body}`;
  text("tap to play again", y + h + u * OVER_TAP_LINE, "#ffffff", u * 0.014);
}

/** The game-over card's box, CSS px. */
function overCard(cssW: number, cssH: number, u: number): { x: number; y: number; w: number; h: number } {
  const w = Math.min(cssW - 32, u * 0.82);
  const h = u * 0.62;
  return { x: (cssW - w) / 2, y: cssH * 0.42 - h / 2, w, h };
}

/**
 * Where src/title.ts lays its buttons out to match the canvas (CSS px): `u` is the size unit,
 * `top` is just under the logo's descenders, `menuTop` is under the game-over card's
 * "tap to play again" (the Menu button back to the title).
 */
export function titleLayout(cssW: number, cssH: number): { u: number; top: number; menuTop: number } {
  const { u } = frameFor(cssW, cssH, 0);
  const card = overCard(cssW, cssH, u);
  return {
    u,
    top: cssH * HUD_TOP + u * LOGO_SIZE * 0.4,
    menuTop: card.y + card.h + u * (OVER_TAP_LINE + 0.06),
  };
}

/**
 * Set ctx.font from `template` ("{px}" is replaced by the size) at `size`, shrinking it
 * until `text` fits in `maxWidth`. Returns the size used.
 */
function fitFont(ctx: CanvasRenderingContext2D, text: string, template: string, size: number, maxWidth: number): number {
  let px = Math.round(size);
  ctx.font = template.replace("{px}", String(px));
  const w = ctx.measureText(text).width;
  if (w > maxWidth) {
    px = Math.floor((px * maxWidth) / w);
    ctx.font = template.replace("{px}", String(px));
  }
  return px;
}

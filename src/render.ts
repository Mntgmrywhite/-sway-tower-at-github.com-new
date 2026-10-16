import { BLOCK_HEIGHT, WORLD_WIDTH } from "./config";
import { startLives, swayOffset, type Block, type GameState, type Tip } from "./game";
import { roundRectPath } from "./base/draw";
import { kitFor } from "./base/style";
import { horizonFor } from "./base/world";
import type { Scene, Skin } from "./skins/skin";
import { addFalling as pushFalling, FALL_ALPHA, stepFalling, type Falling } from "./fx/falling";
import { addPop, drawPops, stepPops, type Pop } from "./fx/pops";
import { slabPoses, startTopple, stepTopple, toppling, type Topple } from "./fx/topple";

export const GAME_NAME = "Sway Tower";

/** World units visible horizontally; a little wider than the slider's travel. */
const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
const TOP_ANCHOR = 0.38;
/** Until the tower is tall enough, hold the ground this far down the screen. */
const GROUND_START = 0.7;
const CAMERA_EASE = 6; // per second
/** Perfect-drop flash: light bursts along the seam and the block glows in the accent color. */
const FLASH_TIME = 0.5; // seconds
const SEAM_SPREAD = 0.6; // how far the seam light reaches past the block edges, in block widths
/** While a Hard-mode tower falls, the camera keeps its pivot at most this far below the anchor, world units. */
const TOPPLE_CAMERA_ROOM = 12 * BLOCK_HEIGHT;

interface Flash {
  level: number;
  age: number;
}

export interface View {
  cameraY: number; // world y shown at TOP_ANCHOR
  falling: Falling[];
  flashes: Flash[];
  /** The PERFECT word over the block that just landed (src/fx/pops.ts). */
  pops: Pop[];
  /** Hard mode: the tower tipping over (src/fx/topple.ts); the game-over card waits for it. */
  topple: Topple | null;
  /** Animation clock for background effects, seconds. */
  t: number;
}

export function newView(): View {
  return { cameraY: BLOCK_HEIGHT, falling: [], flashes: [], pops: [], topple: null, t: 0 };
}

/** Call after a drop tipped the tower (Hard mode): the slab above the failing interface falls. */
export function addTopple(view: View, state: GameState, tip: Tip): void {
  view.topple = startTopple(state, tip);
}

/** True while a toppled tower is still falling: the game-over card (and a restart) wait for it. */
export function isToppling(view: View): boolean {
  return toppling(view.topple);
}

/** `towerX` is the world x of the tower top's center; pieces tumble away from it. */
export function addFalling(view: View, piece: Block, level: number, towerX: number): void {
  pushFalling(view.falling, piece, level, towerX);
}

/**
 * Call after a perfect drop onto `level`: the seam flash and gold tint, and the PERFECT pop.
 * `streak` is the perfect streak including this drop (PERFECT ×n from 2 on).
 */
export function addFlash(view: View, level: number, streak: number): void {
  view.flashes.push({ level, age: 0 });
  addPop(view.pops, level, streak);
}

export function updateView(view: View, state: GameState, dt: number): void {
  view.t += dt;
  for (const f of view.flashes) f.age += dt;
  if (view.flashes.some((f) => f.age >= FLASH_TIME)) view.flashes = view.flashes.filter((f) => f.age < FLASH_TIME);
  let target = (state.blocks.length + 1) * BLOCK_HEIGHT;
  // A tower that tips low down: bring the pivot into view.
  if (view.topple) target = Math.min(target, view.topple.py + TOPPLE_CAMERA_ROOM);
  view.cameraY += (target - view.cameraY) * Math.min(1, CAMERA_EASE * dt);
  view.falling = stepFalling(view.falling, dt, view.cameraY);
  // After the falling step, so a bar that peels off this frame starts exactly where the slab had it.
  if (view.topple) stepTopple(view.topple, dt, view.falling);
  stepPops(view.pops, dt);
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
): void {
  // A zero-size canvas (a hidden tab, a web view not laid out yet) has nothing to draw, and the
  // scale below would divide by zero: the NaNs would throw and stop the frame loop for good.
  if (cssW <= 0 || cssH <= 0) return;
  // Portrait-shaped play area, centered; letterboxed on wide screens.
  const u = Math.min(cssW, cssH * 0.6);
  const scale = u / VIEW_WIDTH;
  const offsetX = (cssW - WORLD_WIDTH * scale) / 2;
  const anchorPx = cssH * TOP_ANCHOR;
  // Early on, sit the ground low so the sky gets the room; the follow camera takes over
  // smoothly once the tower is taller than that.
  const cameraY = Math.max(view.cameraY, ((GROUND_START - TOP_ANCHOR) * cssH) / scale);
  const sx = (x: number) => offsetX + x * scale;
  const sy = (y: number) => anchorPx - (y - cameraY) * scale;

  const base = state.blocks[0];
  const groundY = sy(0);
  const rise = Math.max(0, groundY - cssH * GROUND_START);
  const scene: Scene = {
    cssW,
    cssH,
    u,
    scale,
    t: view.t,
    rise,
    altitude: cameraY,
    groundY,
    horizonY: horizonFor(groundY, rise, u),
    baseX: base ? sx(base.x) : 0,
    baseW: base ? base.w * scale : 0,
    songTime,
  };
  const kit = kitFor(skin);
  const h = BLOCK_HEIGHT * scale;
  const titleScreen = state.phase === "playing" && state.score === 0;
  const hud = hudLayout(cssH, u, state, titleScreen);

  kit.world(ctx, scene);

  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) =>
    kit.bar(ctx, sx(x), sy((level + 1) * BLOCK_HEIGHT), w * scale, h, level);

  /** A bar off the tower (falling, or swinging with a toppled slab), centered at world (cx, cy). */
  const drawLoose = (cx: number, cy: number, w: number, angle: number, level: number, alpha: number) => {
    const pw = w * scale;
    ctx.save();
    ctx.translate(sx(cx), sy(cy));
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    kit.bar(ctx, -pw / 2, -h / 2, pw, h, level);
    ctx.restore();
  };
  /**
   * Whether a loose bar centered at world (cx, cy) can touch the screen at any angle. A tall
   * tower that tips from low down sends hundreds of bars falling far above the view; drawing
   * them all would cost frames for seconds behind the game-over card.
   */
  const onScreen = (cx: number, cy: number, w: number) => {
    const reach = (w * scale) / 2 + h;
    const x = sx(cx);
    const y = sy(cy);
    return x > -reach && x < cssW + reach && y > -reach && y < cssH + reach;
  };

  // Only draw blocks that can be on screen. A toppled tower's slab is drawn by its fall instead.
  const standing = state.toppled ? state.toppled.level : state.blocks.length;
  const firstVisible = Math.max(0, Math.floor(cameraY / BLOCK_HEIGHT - cssH / h - 2));
  for (let i = firstVisible; i < standing; i++) {
    const b = state.blocks[i];
    if (b) drawBlock(b.x + swayOffset(state, i), b.w, i);
  }
  if (view.topple) {
    for (const p of slabPoses(view.topple)) if (onScreen(p.cx, p.cy, p.w)) drawLoose(p.cx, p.cy, p.w, p.angle, p.level, 1);
  }

  // Perfect-drop flash: accent tint on the block, light along the seam below it.
  for (const f of view.flashes) {
    const b = f.level < standing ? state.blocks[f.level] : undefined;
    if (!b) continue;
    if (f.age >= FLASH_TIME) continue;
    const k = f.age / FLASH_TIME; // 0 → 1
    const fade = 1 - k;
    const x = sx(b.x + swayOffset(state, f.level));
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
    ctx.shadowBlur = h * 0.8 * fade;
    ctx.fillRect(x - reach, seamY - thick / 2, w + reach * 2, thick);
    ctx.restore();
  }

  for (const f of view.falling) {
    const cx = f.x + f.w / 2;
    const cy = f.y + BLOCK_HEIGHT / 2;
    if (onScreen(cx, cy, f.w)) drawLoose(cx, cy, f.w, f.angle, f.level, f.alpha ?? FALL_ALPHA);
  }

  // The slider is in world space: it does not sway.
  if (state.phase === "playing") drawBlock(state.slider.x, state.slider.w, state.blocks.length);

  // The PERFECT pop goes over the slider so it always reads. Once the last life is gone the
  // game-over card takes the stage at once, so a pop still in flight would peek out around it.
  if (state.phase === "playing") {
    drawPops({ ctx, kit, skin, state, cssW, u, scale, h, sx, sy, hudBottom: hud.bottom }, view.pops);
  }

  kit.front(ctx, scene);

  // HUD: outlined type (plus glow in neon), so it reads over any part of the scene.
  ctx.save();
  ctx.textAlign = "center";
  const top = hud.top;
  const body = kit.body;
  const text = (t: string, x: number, y: number, fill: string, outline: number) =>
    kit.text(ctx, t, x, y, fill, outline);

  // A toppled tower falls first; the card comes once it has gone over.
  if (state.phase === "over" && !toppling(view.topple)) {
    drawGameOver(ctx, cssW, cssH, u, state, best, skin);
    ctx.restore();
    return;
  }

  if (titleScreen) {
    // Start screen: the name instead of a zero.
    const size = fitFont(ctx, GAME_NAME, `400 {px}px ${skin.hud.display}`, u * 0.13, cssW * 0.88);
    text(GAME_NAME, cssW / 2, top, skin.hud.title, Math.max(3, size * 0.12));
    if (state.mode === "hard") {
      ctx.font = `700 ${Math.round(u * 0.04)}px ${body}`;
      text("HARD", cssW / 2, top + u * 0.062, skin.hud.accent, u * 0.01);
    }
  } else {
    ctx.font = `700 ${Math.round(u * 0.13)}px ${body}`;
    text(String(state.score), cssW / 2, top, "#ffffff", u * 0.016);
  }
  ctx.font = `600 ${Math.round(u * 0.038)}px ${body}`;
  text(`best ${best}`, cssW / 2, hud.bestY, "#e8e4ff", u * 0.009);

  // Lives
  const r = u * 0.016;
  const lives = startLives(state.mode);
  for (let i = 0; i < lives; i++) {
    kit.life(ctx, cssW / 2 + (i - (lives - 1) / 2) * r * 3.5, hud.livesY, r, i < state.lives);
  }

  // Perfect counter: total this game, hidden until the first one. (The PERFECT ×N word
  // already celebrates a run, so the HUD stays a single calm line.)
  if (state.perfects > 0) {
    ctx.font = `700 ${Math.round(u * 0.045)}px ${body}`;
    text(`★ ${state.perfects} perfect`, cssW / 2, hud.perfY, skin.hud.accent, u * 0.011);
  }

  if (titleScreen) {
    ctx.font = `600 ${Math.round(u * 0.055)}px ${body}`;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(view.t * 3);
    text("tap to drop", cssW / 2, cssH * 0.9, "#ffffff", u * 0.013);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
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

/** Top-center HUD stack: score, best, lives, perfect counter. Hard's title screen adds a HARD line. */
function hudLayout(cssH: number, u: number, state: GameState, titleScreen: boolean): HudLayout {
  const top = cssH * 0.14;
  const hardLine = titleScreen && state.mode === "hard" ? u * 0.05 : 0;
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
): void {
  const hud = skin.hud;
  const kit = kitFor(skin);
  ctx.fillStyle = "rgba(4, 2, 10, 0.45)";
  ctx.fillRect(0, 0, cssW, cssH);

  const w = Math.min(cssW - 32, u * 0.82);
  const h = u * 0.62;
  const x = (cssW - w) / 2;
  const y = cssH * 0.42 - h / 2;
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

  ctx.font = `600 ${Math.round(u * 0.055)}px ${kit.body}`;
  text("tap to play again", y + h + u * 0.1, "#ffffff", u * 0.014);
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

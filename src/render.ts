import { BLOCK_HEIGHT, LIVES, WORLD_WIDTH } from "./config";
import { stability, swayOffset, type Block, type GameState } from "./game";
import { roundRectPath } from "./base/draw";
import { kitFor } from "./base/style";
import { horizonFor } from "./base/world";
import type { Scene, Skin } from "./skins/skin";
import { addFalling as pushFalling, stepFalling, type Falling } from "./fx/falling";
import { newFx, updateFx, type Fx } from "./fx/fx";
import { fitFont, type Frame } from "./fx/frame";
import {
  drawBanners,
  drawGauge,
  drawHints,
  drawTag,
  drawToppleOverlay,
  drawVignette,
  gaugeVisible,
  tagVisible,
} from "./fx/hud-fx";
import { CARD_FADE, slabPose, TOPPLE_CARD_AT, toppleShake } from "./fx/topple";
import {
  drawArrows,
  drawChips,
  drawCrack,
  drawGlints,
  drawGust,
  drawLock,
  drawPlumb,
  drawPops,
  drawRail,
  drawRing,
  drawSparks,
  drawSweeps,
  drawTint,
  drawWind,
} from "./fx/world-fx";

export { onDrop, onSaved, onWindZone, takeCues, type Cue, type DropInfo } from "./fx/fx";

export const GAME_NAME = "Sway Tower";
/** Length of the topple animation (until the game-over card); restart waits for it. */
export const TOPPLE_ANIM_MS = TOPPLE_CARD_AT * 1000;
/** How fast main's game clock eases into and out of slow motion (timeScale), per second. */
export const SLOWMO_EASE = 10;

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
/** Below this screen height (in u) the HUD packs tighter: short phones, landscape, desktop. */
const COMPACT_HUD = 2.1;

interface Flash {
  level: number;
  age: number;
}

export interface View {
  cameraY: number; // world y shown at TOP_ANCHOR
  falling: Falling[];
  flashes: Flash[];
  /** Animation clock for background effects, seconds. */
  t: number;
  /** Balance telegraphing state (src/fx). */
  fx: Fx;
}

export function newView(): View {
  return { cameraY: BLOCK_HEIGHT, falling: [], flashes: [], t: 0, fx: newFx() };
}

/** `towerX` is the world x of the tower top's center; pieces tumble away from it. */
export function addFalling(view: View, piece: Block, level: number, towerX: number): void {
  pushFalling(view.falling, piece, level, towerX);
}

/** Call after a perfect drop onto `level` (the PERFECT word comes from onDrop). */
export function addFlash(view: View, level: number): void {
  view.flashes.push({ level, age: 0 });
}

export function updateView(view: View, state: GameState, dt: number): void {
  view.t += dt;
  for (const f of view.flashes) f.age += dt;
  if (view.flashes.some((f) => f.age >= FLASH_TIME)) view.flashes = view.flashes.filter((f) => f.age < FLASH_TIME);
  const target = (state.blocks.length + 1) * BLOCK_HEIGHT;
  view.cameraY += (target - view.cameraY) * Math.min(1, CAMERA_EASE * dt);
  view.falling = stepFalling(view.falling, dt, view.cameraY);
  updateFx(view.fx, state, dt, view.falling);
}

export function render(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  state: GameState,
  view: View,
  best: number,
  skin: Skin,
): void {
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
  };
  const kit = kitFor(skin);
  const fx = view.fx;
  const h = BLOCK_HEIGHT * scale;
  const hud = hudLayout(cssH, u, state, fx);
  const frame: Frame = {
    ctx,
    kit,
    skin,
    state,
    fx,
    st: stability(state),
    t: view.t,
    cssW,
    cssH,
    u,
    scale,
    h,
    sx,
    sy,
    hudBottom: hud.bottom,
  };

  // Camera: rolls toward the lean while teetering, shakes on a topple. Zoom just enough that
  // the rotated/shifted scene still covers the screen.
  const [shakeX, shakeY] = toppleShake(fx.topple, u);
  const roll = fx.roll;
  ctx.save();
  if (roll !== 0 || shakeX !== 0 || shakeY !== 0) {
    const aspect = Math.max(cssH / cssW, cssW / cssH);
    const cover =
      Math.cos(Math.abs(roll)) + aspect * Math.sin(Math.abs(roll)) + (2 * Math.hypot(shakeX, shakeY)) / Math.min(cssW, cssH);
    ctx.translate(cssW / 2 + shakeX, cssH / 2 + shakeY);
    ctx.rotate(roll);
    ctx.scale(cover, cover);
    ctx.translate(-cssW / 2, -cssH / 2);
  }

  kit.world(ctx, scene);
  drawWind(frame, "back");
  drawPlumb(frame);

  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) =>
    kit.bar(ctx, sx(x), sy((level + 1) * BLOCK_HEIGHT), w * scale, h, level);

  // Only draw blocks that can be on screen. A toppling slab rotates about its pivot corner
  // and loses bars from the top as they peel off into falling pieces.
  const slab = fx.topple && state.toppled ? slabPose(fx.topple, state) : null;
  const firstVisible = Math.max(0, Math.floor(cameraY / BLOCK_HEIGHT - cssH / h - 2));
  let inSlab = false;
  for (let i = firstVisible; i < state.blocks.length; i++) {
    const b = state.blocks[i];
    if (!b) continue;
    if (slab && i > slab.pivot) {
      if (i > slab.keep) break;
      // The slab's bars all share one pose: set it once.
      if (!inSlab) {
        const px = sx(slab.px);
        const py = sy(slab.py);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(slab.angle);
        ctx.translate(-px, -py);
        inSlab = true;
      }
    }
    drawBlock(b.x + swayOffset(state, i), b.w, i);
  }
  if (inSlab) ctx.restore();
  drawTint(frame);
  drawSweeps(frame);
  drawGlints(frame);

  // Perfect-drop flash: accent tint on the block, light along the seam below it.
  for (const f of view.flashes) {
    const b = state.blocks[f.level];
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
    const w = f.w * scale;
    ctx.save();
    ctx.translate(sx(f.x) + w / 2, sy(f.y) - h / 2);
    ctx.rotate(f.angle);
    ctx.globalAlpha = 0.9;
    kit.bar(ctx, -w / 2, -h / 2, w, h, f.level);
    ctx.restore();
  }

  drawWind(frame, "front");
  drawCrack(frame);
  drawRail(frame);
  drawRing(frame);
  drawLock(frame);
  drawArrows(frame);
  drawGust(frame);
  drawSparks(frame);

  // The slider is in world space: it does not sway.
  if (state.phase === "playing") drawBlock(state.slider.x, state.slider.w, state.blocks.length);

  // Bank chips and word pops go over the slider so they always read. Once the last life is
  // gone the game-over card takes the stage at once, so pops still in flight would peek out
  // around it (a topple clears its own pops before the card).
  drawChips(frame);
  if (state.phase === "playing" || state.toppled) drawPops(frame);

  kit.front(ctx, scene);
  ctx.restore();

  kit.post?.(ctx, scene);
  drawVignette(frame);

  // HUD: outlined type (plus glow in neon), so it reads over any part of the scene.
  ctx.save();
  ctx.textAlign = "center";
  const top = hud.top;
  const body = kit.body;
  const text = (t: string, x: number, y: number, fill: string, outline: number) =>
    kit.text(ctx, t, x, y, fill, outline);

  if (state.phase === "over") {
    // A topple plays its fall first; the card (titled TOPPLED) comes after.
    const card = cardBox(cssH, u, state);
    const cardAt = TOPPLE_CARD_AT;
    const age = state.toppled && fx.topple ? fx.topple.age : Infinity;
    if (age >= cardAt) drawGameOver(ctx, cssW, cssH, u, state, best, skin, Math.min(1, (age - cardAt) / CARD_FADE));
    if (state.toppled) drawToppleOverlay(frame, card.titleY, cardAt);
    if (age < cardAt) {
      ctx.font = `700 ${Math.round(u * 0.13)}px ${body}`;
      text(String(state.score), cssW / 2, top, "#ffffff", u * 0.016);
    }
    ctx.restore();
    return;
  }

  if (state.score === 0) {
    // Start screen: the name instead of a zero.
    const size = fitFont(ctx, GAME_NAME, `400 {px}px ${skin.hud.display}`, u * 0.13, cssW * 0.88);
    text(GAME_NAME, cssW / 2, top, skin.hud.title, Math.max(3, size * 0.12));
  } else {
    ctx.font = `700 ${Math.round(u * 0.13)}px ${body}`;
    text(String(state.score), cssW / 2, top, "#ffffff", u * 0.016);
  }
  ctx.font = `600 ${Math.round(u * 0.038)}px ${body}`;
  text(`best ${best}`, cssW / 2, top + u * 0.065, "#e8e4ff", u * 0.009);

  // Lives
  const r = u * 0.016;
  for (let i = 0; i < LIVES; i++) {
    kit.life(ctx, cssW / 2 + (i - (LIVES - 1) / 2) * r * 3.5, top + u * 0.11, r, i < state.lives);
  }

  // Tilt gauge under the lives, with its tier tag; the perfect counter moves down to make room.
  if (hud.gauge) {
    drawGauge(frame, hud.gaugeY);
    drawTag(frame, hud.tagY);
  }

  // Perfect counter: total this game, plus the current run (on the same line when the HUD
  // is compact). Hidden until the first one.
  if (state.perfects > 0) {
    ctx.font = `700 ${Math.round(u * 0.045)}px ${body}`;
    const run = hud.compact && state.streak >= 2 ? `  ×${state.streak}` : "";
    text(`★ ${state.perfects} perfect${run}`, cssW / 2, hud.perfY, skin.hud.accent, u * 0.011);
    if (state.streak >= 2 && !hud.compact) {
      ctx.font = `600 ${Math.round(u * 0.038)}px ${body}`;
      text(`×${state.streak} in a row`, cssW / 2, hud.perfY + u * 0.052, "#ffffff", u * 0.01);
    }
  }

  if (state.score === 0) {
    ctx.font = `600 ${Math.round(u * 0.055)}px ${body}`;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(view.t * 3);
    text("tap to drop", cssW / 2, cssH * 0.9, "#ffffff", u * 0.013);
    ctx.globalAlpha = 1;
  }
  drawHints(frame);
  drawBanners(frame);
  ctx.restore();
}

interface HudLayout {
  /** Score baseline. */
  top: number;
  gauge: boolean;
  gaugeY: number;
  tagY: number;
  /** "★ N perfect" baseline. */
  perfY: number;
  /** Streak shares the perfect line, and lines sit closer. */
  compact: boolean;
  /** Lowest HUD pixel this frame: pops, wind streaks and the plumb bob stay below it. */
  bottom: number;
}

/** Top-center HUD stack: score, best, lives, tilt gauge, tier tag, perfect counter. */
function hudLayout(cssH: number, u: number, state: GameState, fx: Fx): HudLayout {
  const top = cssH * 0.14;
  const compact = cssH < COMPACT_HUD * u;
  const gauge = gaugeVisible(state);
  const gaugeY = top + u * 0.165;
  const tagY = gaugeY + u * 0.085;
  const perfY = gauge ? gaugeY + u * (compact ? 0.13 : 0.14) : top + u * 0.18;
  let bottom = top + u * 0.13; // lives
  if (gauge) bottom = tagVisible(fx) ? tagY + u * 0.012 : gaugeY + u * 0.05;
  if (state.perfects > 0) bottom = perfY + u * (state.streak >= 2 && !compact ? 0.064 : 0.012);
  return { top, gauge, gaugeY, tagY, perfY, compact, bottom };
}

/** Game-over card geometry (shared with the TOPPLED! slam, which lands on the title). */
function cardBox(cssH: number, u: number, state: GameState): { h: number; y: number; titleY: number } {
  const h = u * (state.toppled ? 0.72 : 0.62);
  const y = cssH * 0.42 - h / 2;
  return { h, y, titleY: y + h * (state.toppled ? 0.2 : 0.22) };
}

function drawGameOver(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  u: number,
  state: GameState,
  best: number,
  skin: Skin,
  fade: number,
): void {
  const hud = skin.hud;
  const kit = kitFor(skin);
  const toppled = state.toppled !== null;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(4, 2, 10, 0.45)";
  ctx.fillRect(0, 0, cssW, cssH);

  const { h, y, titleY } = cardBox(cssH, u, state);
  const w = Math.min(cssW - 32, u * 0.82);
  const x = (cssW - w) / 2;
  kit.card(ctx, x, y, w, h, u);

  const cx = cssW / 2;
  const text = (t: string, ty: number, fill: string, outline: number) => kit.text(ctx, t, cx, ty, fill, outline);
  ctx.textAlign = "center";
  if (toppled) {
    // Height (the score) and the saves this run.
    fitFont(ctx, "TOPPLED", `400 {px}px ${hud.display}`, u * 0.1, w * 0.86);
    text("TOPPLED", titleY, kit.tones.danger, u * 0.014);
    ctx.font = `600 ${Math.round(u * 0.036)}px ${kit.body}`;
    text("height", y + h * 0.33, "#e8e4ff", u * 0.009);
    ctx.font = `700 ${Math.round(u * 0.15)}px ${kit.body}`;
    text(String(state.score), y + h * 0.53, "#ffffff", u * 0.018);
    const newBest = state.score > 0 && state.score >= best;
    ctx.font = `600 ${Math.round(u * 0.045)}px ${kit.body}`;
    text(newBest ? "New best!" : `best ${best}`, y + h * 0.66, newBest ? hud.accent : "#ffffff", u * 0.01);
    text(`★ ${state.perfects} perfect`, y + h * 0.775, hud.accent, u * 0.01);
    const saves = state.saves === 1 ? "1 save" : `${state.saves} saves`;
    text(saves, y + h * 0.89, kit.tones.ok, u * 0.01);
  } else {
    ctx.font = `400 ${Math.round(u * 0.09)}px ${hud.display}`;
    text("Game Over", titleY, hud.title, u * 0.014);

    ctx.font = `700 ${Math.round(u * 0.15)}px ${kit.body}`;
    text(String(state.score), y + h * 0.54, "#ffffff", u * 0.018);

    const newBest = state.score > 0 && state.score >= best;
    ctx.font = `600 ${Math.round(u * 0.045)}px ${kit.body}`;
    text(newBest ? "New best!" : `best ${best}`, y + h * 0.68, newBest ? hud.accent : "#ffffff", u * 0.01);
    text(`★ ${state.perfects} perfect`, y + h * 0.8, hud.accent, u * 0.01);
  }

  ctx.font = `600 ${Math.round(u * 0.055)}px ${kit.body}`;
  text("tap to play again", y + h + u * 0.1, "#ffffff", u * 0.014);
  ctx.restore();
}

import { BLOCK_HEIGHT, LIVES, WORLD_WIDTH } from "./config";
import { swayOffset, type Block, type GameState } from "./game";
import { BAR_RADIUS, drawBar } from "./neon/blocks";
import { neonStroke, neonText, roundRectPath } from "./neon/draw";
import { drawForeground, drawPost, drawWorld, horizonFor } from "./neon/world";
import type { Scene, Skin } from "./skins/skin";

export const GAME_NAME = "Sway Tower";

/** HUD text face for every skin; the skin picks the display face for titles. */
const BODY_FONT = "Orbitron, 'Trebuchet MS', system-ui, sans-serif";

/** World units visible horizontally; a little wider than the slider's travel. */
const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
const TOP_ANCHOR = 0.38;
/** Until the tower is tall enough, hold the ground this far down the screen. */
const GROUND_START = 0.7;
const CAMERA_EASE = 6; // per second
// Cosmetic falling pieces only; slow enough to watch the chop happen.
const GRAVITY = 55; // world units/sec^2
const FALL_DRIFT = 9; // units/sec sideways, away from the tower
const FALL_SPIN = 1.2; // radians/sec
/** Perfect-drop flash: light bursts along the seam and the block glows in the accent color. */
const FLASH_TIME = 0.5; // seconds
/** "PERFECT" text floats up and fades over this long. */
const POP_TIME = 0.9; // seconds
const SEAM_SPREAD = 0.6; // how far the seam light reaches past the block edges, in block widths

interface Flash {
  level: number;
  age: number;
  streak: number;
}

interface Falling extends Block {
  y: number; // world y of the piece's bottom
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  level: number;
}

export interface View {
  cameraY: number; // world y shown at TOP_ANCHOR
  falling: Falling[];
  flashes: Flash[];
  /** Animation clock for background effects, seconds. */
  t: number;
}

export function newView(): View {
  return { cameraY: BLOCK_HEIGHT, falling: [], flashes: [], t: 0 };
}

/** `towerX` is the world x of the tower top's center; pieces tumble away from it. */
export function addFalling(view: View, piece: Block, level: number, towerX: number): void {
  const dir = piece.x + piece.w / 2 < towerX ? -1 : 1;
  view.falling.push({
    ...piece,
    y: level * BLOCK_HEIGHT,
    vx: dir * FALL_DRIFT,
    vy: 0,
    angle: 0,
    spin: dir * FALL_SPIN,
    level,
  });
}

/** Call after a perfect drop onto `level`. */
export function addFlash(view: View, level: number, streak: number): void {
  view.flashes.push({ level, age: 0, streak });
}

export function updateView(view: View, state: GameState, dt: number): void {
  view.t += dt;
  for (const f of view.flashes) f.age += dt;
  view.flashes = view.flashes.filter((f) => f.age < POP_TIME);
  const target = (state.blocks.length + 1) * BLOCK_HEIGHT;
  view.cameraY += (target - view.cameraY) * Math.min(1, CAMERA_EASE * dt);
  for (const f of view.falling) {
    f.vy += GRAVITY * dt;
    f.y -= f.vy * dt;
    f.x += f.vx * dt;
    f.angle += f.spin * dt;
  }
  view.falling = view.falling.filter((f) => f.y > view.cameraY - 300);
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
  drawWorld(ctx, scene, skin);

  const h = BLOCK_HEIGHT * scale;
  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) =>
    drawBar(ctx, sx(x), sy((level + 1) * BLOCK_HEIGHT), w * scale, h, level, skin);

  // Only draw blocks that can be on screen.
  const firstVisible = Math.max(0, Math.floor(cameraY / BLOCK_HEIGHT - cssH / h - 2));
  for (let i = firstVisible; i < state.blocks.length; i++) {
    const b = state.blocks[i];
    if (b) drawBlock(b.x + swayOffset(state, i), b.w, i);
  }

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
    roundRectPath(ctx, x, y, w, h, h * BAR_RADIUS);
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
    drawBar(ctx, -w / 2, -h / 2, w, h, f.level, skin);
    ctx.restore();
  }

  // "PERFECT" pops up beside the placed block.
  for (const f of view.flashes) {
    const b = state.blocks[f.level];
    if (!b) continue;
    const k = f.age / POP_TIME;
    const cx = sx(b.x + b.w / 2 + swayOffset(state, f.level));
    const y = sy((f.level + 1) * BLOCK_HEIGHT) - h * 0.4 - k * h * 2;
    const size = Math.round(u * 0.065 * (1 + 0.25 * Math.min(1, f.streak / 5)));
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `400 ${size}px ${skin.hud.display}`;
    ctx.textAlign = "center";
    const label = f.streak >= 2 ? `PERFECT ×${f.streak}` : "PERFECT";
    neonText(ctx, label, cx, y, skin.hud.accent, skin.hud.accent, Math.max(3, size * 0.12));
    ctx.restore();
  }

  // The slider is in world space: it does not sway.
  if (state.phase === "playing") drawBlock(state.slider.x, state.slider.w, state.blocks.length);

  drawForeground(ctx, scene, skin);
  drawPost(ctx, scene);

  // HUD: neon type with a black outline, so it reads over any part of the scene.
  ctx.save();
  ctx.textAlign = "center";
  const hud = skin.hud;
  const top = cssH * 0.14;
  const text = (t: string, x: number, y: number, fill: string, outline: number) =>
    neonText(ctx, t, x, y, fill, hud.titleGlow, outline);

  if (state.phase === "over") {
    drawGameOver(ctx, cssW, cssH, u, state, best, skin);
    ctx.restore();
    return;
  }

  if (state.score === 0) {
    // Start screen: the name instead of a zero.
    const size = fitFont(ctx, GAME_NAME, `400 {px}px ${hud.display}`, u * 0.13, cssW * 0.88);
    neonText(ctx, GAME_NAME, cssW / 2, top, hud.title, hud.titleGlow, Math.max(3, size * 0.12));
  } else {
    ctx.font = `700 ${Math.round(u * 0.13)}px ${BODY_FONT}`;
    text(String(state.score), cssW / 2, top, "#ffffff", u * 0.016);
  }
  ctx.font = `600 ${Math.round(u * 0.038)}px ${BODY_FONT}`;
  text(`best ${best}`, cssW / 2, top + u * 0.065, "#e8e4ff", u * 0.009);

  // Lives
  const r = u * 0.016;
  for (let i = 0; i < LIVES; i++) {
    ctx.beginPath();
    ctx.arc(cssW / 2 + (i - (LIVES - 1) / 2) * r * 3.5, top + u * 0.11, r, 0, Math.PI * 2);
    if (i < state.lives) {
      ctx.fillStyle = hud.life;
      ctx.fill();
      neonStroke(ctx, hud.life, Math.max(1, u * 0.004), 3);
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = Math.max(1, u * 0.004);
      ctx.stroke();
    }
  }

  // Perfect counter: total this game, plus the current run. Hidden until the first one.
  if (state.perfects > 0) {
    const perfY = top + u * 0.18;
    ctx.font = `700 ${Math.round(u * 0.042)}px ${BODY_FONT}`;
    neonText(ctx, `★ ${state.perfects} perfect`, cssW / 2, perfY, hud.accent, hud.accent, u * 0.01);
    if (state.streak >= 2) {
      ctx.font = `600 ${Math.round(u * 0.036)}px ${BODY_FONT}`;
      text(`×${state.streak} in a row`, cssW / 2, perfY + u * 0.052, "#e8e4ff", u * 0.009);
    }
  }

  if (state.score === 0) {
    ctx.font = `600 ${Math.round(u * 0.05)}px ${BODY_FONT}`;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(view.t * 3);
    text("tap to drop", cssW / 2, cssH * 0.9, "#ffffff", u * 0.012);
  }
  ctx.restore();
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
  ctx.fillStyle = "rgba(4, 2, 10, 0.55)";
  ctx.fillRect(0, 0, cssW, cssH);

  const w = Math.min(cssW - 32, u * 0.82);
  const h = u * 0.62;
  const x = (cssW - w) / 2;
  const y = cssH * 0.42 - h / 2;
  // Dark glass card with a neon border
  roundRectPath(ctx, x, y, w, h, u * 0.03);
  ctx.fillStyle = "rgba(10, 4, 22, 0.92)";
  ctx.fill();
  neonStroke(ctx, hud.titleGlow, Math.max(1.5, u * 0.006), 3.5);

  const cx = cssW / 2;
  const text = (t: string, ty: number, fill: string, glow: string, outline: number) =>
    neonText(ctx, t, cx, ty, fill, glow, outline);
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(u * 0.085)}px ${hud.display}`;
  text("Game Over", y + h * 0.22, hud.title, hud.titleGlow, u * 0.012);

  ctx.font = `700 ${Math.round(u * 0.15)}px ${BODY_FONT}`;
  text(String(state.score), y + h * 0.54, "#ffffff", hud.titleGlow, u * 0.016);

  const newBest = state.score > 0 && state.score >= best;
  ctx.font = `600 ${Math.round(u * 0.042)}px ${BODY_FONT}`;
  text(newBest ? "New best!" : `best ${best}`, y + h * 0.68, newBest ? hud.accent : "#e8e4ff", hud.titleGlow, u * 0.009);
  text(`★ ${state.perfects} perfect`, y + h * 0.8, hud.accent, hud.accent, u * 0.009);

  ctx.font = `600 ${Math.round(u * 0.05)}px ${BODY_FONT}`;
  text("tap to play again", y + h + u * 0.1, "#ffffff", hud.titleGlow, u * 0.012);
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

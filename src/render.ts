import { BLOCK_HEIGHT, LIVES, WORLD_WIDTH, tuning } from "./config";
import { swayOffset, type Block, type GameState } from "./game";
import { classic } from "./themes/classic";
import { halloween } from "./themes/halloween";
import { roundRectPath, type Scene } from "./themes/theme";

/** World units visible horizontally; a little wider than the slider's travel. */
const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
const TOP_ANCHOR = 0.38;
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
): void {
  // Portrait-shaped play area, centered; letterboxed on wide screens.
  const u = Math.min(cssW, cssH * 0.6);
  const scale = u / VIEW_WIDTH;
  const offsetX = (cssW - WORLD_WIDTH * scale) / 2;
  const anchorPx = cssH * TOP_ANCHOR;
  const sx = (x: number) => offsetX + x * scale;
  const sy = (y: number) => anchorPx - (y - view.cameraY) * scale;

  const theme = tuning.halloween ? halloween : classic;
  const base = state.blocks[0];
  const scene: Scene = {
    cssW,
    cssH,
    u,
    scale,
    t: view.t,
    rise: Math.max(0, (view.cameraY - BLOCK_HEIGHT) * scale),
    altitude: view.cameraY,
    groundY: sy(0),
    baseX: base ? sx(base.x) : 0,
    baseW: base ? base.w * scale : 0,
  };
  theme.background(ctx, scene);

  const h = BLOCK_HEIGHT * scale;
  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) =>
    theme.block(ctx, sx(x), sy((level + 1) * BLOCK_HEIGHT), w * scale, h, level);

  // Only draw blocks that can be on screen.
  const firstVisible = Math.max(0, Math.floor(view.cameraY / BLOCK_HEIGHT - cssH / h - 2));
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
    roundRectPath(ctx, x, y, w, h, h * 0.35);
    ctx.clip();
    ctx.globalAlpha = fade * 0.65;
    ctx.fillStyle = theme.hud.streak;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    // Seam: a bright bar between the two blocks that shoots out sideways.
    const reach = w * SEAM_SPREAD * Math.sqrt(k);
    const seamY = y + h;
    const thick = Math.max(2, h * 0.28) * fade;
    const grad = ctx.createLinearGradient(x - reach, 0, x + w + reach, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5 * (reach / (w + reach * 2)) + 0.02, theme.hud.streak);
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(1 - 0.5 * (reach / (w + reach * 2)) - 0.02, theme.hud.streak);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.shadowColor = theme.hud.streak;
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
    theme.block(ctx, -w / 2, -h / 2, w, h, f.level);
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
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.strokeStyle = "rgba(20, 10, 30, 0.85)";
    const label = f.streak >= 2 ? `PERFECT ×${f.streak}` : "PERFECT";
    ctx.strokeText(label, cx, y);
    ctx.fillStyle = theme.hud.streak;
    ctx.fillText(label, cx, y);
    ctx.restore();
  }

  // The slider is in world space: it does not sway.
  if (state.phase === "playing") drawBlock(state.slider.x, state.slider.w, state.blocks.length);

  theme.foreground?.(ctx, scene);

  // HUD, with a soft shadow so it reads over any sky.
  ctx.save();
  ctx.shadowColor = "rgba(10, 5, 20, 0.6)";
  ctx.shadowBlur = Math.round(u * 0.02);
  ctx.fillStyle = theme.hud.score;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(u * 0.14)}px system-ui, sans-serif`;
  ctx.fillText(String(state.score), cssW / 2, cssH * 0.14);
  ctx.font = `500 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
  ctx.fillStyle = theme.hud.muted;
  ctx.fillText(`best ${best}`, cssW / 2, cssH * 0.14 + u * 0.06);

  // Lives
  const r = u * 0.014;
  for (let i = 0; i < LIVES; i++) {
    ctx.beginPath();
    ctx.arc(cssW / 2 + (i - (LIVES - 1) / 2) * r * 3.5, cssH * 0.14 + u * 0.1, r, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? theme.hud.life : theme.hud.lifeLost;
    ctx.fill();
  }

  // Perfect counter: total this game, plus the current run.
  const perfY = cssH * 0.14 + u * 0.17;
  ctx.font = `700 ${Math.round(u * 0.045)}px system-ui, sans-serif`;
  ctx.fillStyle = theme.hud.streak;
  ctx.fillText(`★ ${state.perfects} perfect`, cssW / 2, perfY);
  if (state.streak >= 2) {
    ctx.font = `600 ${Math.round(u * 0.038)}px system-ui, sans-serif`;
    ctx.fillStyle = theme.hud.muted;
    ctx.fillText(`×${state.streak} in a row`, cssW / 2, perfY + u * 0.05);
  }

  const hint =
    state.phase === "over" ? "tap to restart" : state.score === 0 ? "tap to drop" : "";
  if (hint) {
    ctx.font = `600 ${Math.round(u * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = theme.hud.score;
    ctx.fillText(hint, cssW / 2, cssH * 0.9);
  }
  ctx.restore();
}

import { BLOCK_HEIGHT, LIVES, WORLD_WIDTH } from "./config";
import { swayOffset, type Block, type GameState } from "./game";

/** World units visible horizontally; a little wider than the slider's travel. */
const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
const TOP_ANCHOR = 0.38;
const CAMERA_EASE = 6; // per second
// Cosmetic falling pieces only; slow enough to watch the chop happen.
const GRAVITY = 140; // world units/sec^2
const FALL_DRIFT = 14; // units/sec sideways, away from the tower
const FALL_SPIN = 2.2; // radians/sec

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
}

export function newView(): View {
  return { cameraY: BLOCK_HEIGHT, falling: [] };
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

export function updateView(view: View, state: GameState, dt: number): void {
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

function color(level: number, lightness = 60): string {
  return `hsl(${(200 + level * 7) % 360} 70% ${lightness}%)`;
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

  ctx.fillStyle = "#14161f";
  ctx.fillRect(0, 0, cssW, cssH);

  /** Draw a block whose world left edge is `x`. */
  const drawBlock = (x: number, w: number, level: number) => {
    const y = sy((level + 1) * BLOCK_HEIGHT);
    const h = BLOCK_HEIGHT * scale;
    ctx.fillStyle = color(level);
    ctx.fillRect(sx(x), y, w * scale, h);
    ctx.fillStyle = color(level, 72);
    ctx.fillRect(sx(x), y, w * scale, Math.max(2, h * 0.18));
  };

  // Pedestal under the base so the tower doesn't float.
  const base = state.blocks[0];
  if (base) {
    const pedTop = sy(0);
    ctx.fillStyle = "#232636";
    ctx.fillRect(sx(base.x), pedTop, base.w * scale, Math.max(0, cssH - pedTop));
  }

  // Only draw blocks that can be on screen.
  const firstVisible = Math.max(0, Math.floor(view.cameraY / BLOCK_HEIGHT - cssH / (BLOCK_HEIGHT * scale) - 2));
  for (let i = firstVisible; i < state.blocks.length; i++) {
    const b = state.blocks[i];
    if (b) drawBlock(b.x + swayOffset(state, i), b.w, i);
  }

  for (const f of view.falling) {
    const w = f.w * scale;
    const h = BLOCK_HEIGHT * scale;
    ctx.save();
    ctx.translate(sx(f.x) + w / 2, sy(f.y) - h / 2);
    ctx.rotate(f.angle);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color(f.level);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // The slider is in world space: it does not sway.
  if (state.phase === "playing") drawBlock(state.slider.x, state.slider.w, state.blocks.length);

  // HUD
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(u * 0.14)}px system-ui, sans-serif`;
  ctx.fillText(String(state.score), cssW / 2, cssH * 0.14);
  ctx.font = `500 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`best ${best}`, cssW / 2, cssH * 0.14 + u * 0.06);

  // Lives
  const r = u * 0.014;
  for (let i = 0; i < LIVES; i++) {
    ctx.beginPath();
    ctx.arc(cssW / 2 + (i - (LIVES - 1) / 2) * r * 3.5, cssH * 0.14 + u * 0.1, r, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? "#ff6b7a" : "rgba(255,255,255,0.15)";
    ctx.fill();
  }

  if (state.streak >= 2 && state.phase === "playing") {
    ctx.fillStyle = color(state.blocks.length, 75);
    ctx.fillText(`perfect ×${state.streak}`, cssW / 2, cssH * 0.14 + u * 0.16);
  }

  const hint =
    state.phase === "over" ? "tap to restart" : state.score === 0 ? "tap to drop" : "";
  if (hint) {
    ctx.font = `600 ${Math.round(u * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(hint, cssW / 2, cssH * 0.9);
  }
}

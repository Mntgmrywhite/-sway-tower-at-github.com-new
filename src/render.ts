import { BLOCK_HEIGHT, WORLD_WIDTH } from "./config";
import type { Block, GameState } from "./game";

/** World units visible horizontally; a little wider than the slider's travel. */
const VIEW_WIDTH = WORLD_WIDTH * 1.5;
/** Keep the tower top this fraction of the screen down from the top. */
const TOP_ANCHOR = 0.38;
const CAMERA_EASE = 6; // per second
const GRAVITY = 600; // world units/sec^2, cosmetic falling pieces only

interface Falling extends Block {
  y: number; // world y of the piece's bottom
  vy: number;
  level: number;
}

export interface View {
  cameraY: number; // world y shown at TOP_ANCHOR
  falling: Falling[];
}

export function newView(): View {
  return { cameraY: BLOCK_HEIGHT, falling: [] };
}

export function addFalling(view: View, piece: Block, level: number): void {
  view.falling.push({ ...piece, y: level * BLOCK_HEIGHT, vy: 0, level });
}

export function updateView(view: View, state: GameState, dt: number): void {
  const target = (state.blocks.length + 1) * BLOCK_HEIGHT;
  view.cameraY += (target - view.cameraY) * Math.min(1, CAMERA_EASE * dt);
  for (const f of view.falling) {
    f.vy += GRAVITY * dt;
    f.y -= f.vy * dt;
  }
  view.falling = view.falling.filter((f) => f.y > view.cameraY - 400);
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

  const drawBlock = (b: Block, level: number, alpha = 1) => {
    const y = sy((level + 1) * BLOCK_HEIGHT);
    const h = BLOCK_HEIGHT * scale;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color(level);
    ctx.fillRect(sx(b.x), y, b.w * scale, h);
    ctx.fillStyle = color(level, 72);
    ctx.fillRect(sx(b.x), y, b.w * scale, Math.max(2, h * 0.18));
    ctx.globalAlpha = 1;
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
    if (b) drawBlock(b, i);
  }

  for (const f of view.falling) {
    ctx.fillStyle = color(f.level);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(sx(f.x), sy(f.y + BLOCK_HEIGHT), f.w * scale, BLOCK_HEIGHT * scale);
    ctx.globalAlpha = 1;
  }

  if (state.phase === "playing") drawBlock(state.slider, state.blocks.length);

  // HUD
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(u * 0.14)}px system-ui, sans-serif`;
  ctx.fillText(String(state.score), cssW / 2, cssH * 0.14);
  ctx.font = `500 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`best ${best}`, cssW / 2, cssH * 0.14 + u * 0.06);

  if (state.streak >= 2 && state.phase === "playing") {
    ctx.fillStyle = color(state.blocks.length, 75);
    ctx.fillText(`perfect ×${state.streak}`, cssW / 2, cssH * 0.14 + u * 0.11);
  }

  const hint =
    state.phase === "over" ? "tap to restart" : state.score === 0 ? "tap to drop" : "";
  if (hint) {
    ctx.font = `600 ${Math.round(u * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(hint, cssW / 2, cssH * 0.9);
  }
}

import { BLOCK_HEIGHT, tuning } from "../config";
import { swayOffset, type GameState, type Stability } from "../game";
import { mix, type Ctx } from "../base/draw";
import type { StyleKit } from "../base/style";
import type { Skin } from "../skins/skin";
import type { Fx, Tone } from "./fx";

/** Everything an fx drawing pass needs about this frame, in CSS px. */
export interface Frame {
  ctx: Ctx;
  kit: StyleKit;
  skin: Skin;
  state: GameState;
  fx: Fx;
  st: Stability;
  /** View clock, seconds. */
  t: number;
  cssW: number;
  cssH: number;
  /** Size unit (portrait play-area width). */
  u: number;
  /** Pixels per world unit, and one block's height in px. */
  scale: number;
  h: number;
  sx(x: number): number;
  sy(y: number): number;
  /** Screen y just below the HUD stack (score, lives, gauge, tag, perfect counter): keep pops and streaks under it. */
  hudBottom: number;
}

/** The lean telegraphing (plumb line, gauge, rail) is on. */
export const leanUi = () => tuning.swayOn && tuning.leanOn;

/** Heavy-side signal color: amber, blending to red with danger. */
export function heat(f: Frame): string {
  return mix(f.kit.tones.warn, f.kit.tones.danger, f.fx.red);
}

/** Screen x of the block at `level`'s left edge, as drawn (sway and lean included). */
export function blockLeft(f: Frame, level: number): number {
  const b = f.state.blocks[level];
  return b ? f.sx(b.x + swayOffset(f.state, level)) : 0;
}

/** Screen y of the top of the block at `level`. */
export function blockTop(f: Frame, level: number): number {
  return f.sy((level + 1) * BLOCK_HEIGHT);
}

export function toneColor(f: Frame, tone: Tone): string {
  if (tone === "accent") return f.skin.hud.accent;
  if (tone === "white") return "#ffffff";
  return f.kit.tones[tone];
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Overshooting ease-out (0 → 1, peaks a little above 1): for pops that land with a bounce. */
export function easeBack(k: number): number {
  const c = 1.9;
  const x = clamp01(k) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

/** Horizontal arrow path pointing `dir`, centered at (x, y): shaft `len` long, `thick` tall. */
export function arrowPath(ctx: Ctx, x: number, y: number, len: number, thick: number, dir: -1 | 1): void {
  const head = Math.min(len * 0.55, thick * 1.25);
  const shaft = thick * 0.46;
  const x0 = x - (dir * len) / 2;
  const xh = x + (dir * len) / 2 - dir * head;
  const x1 = x + (dir * len) / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y - shaft / 2);
  ctx.lineTo(xh, y - shaft / 2);
  ctx.lineTo(xh, y - thick / 2);
  ctx.lineTo(x1, y);
  ctx.lineTo(xh, y + thick / 2);
  ctx.lineTo(xh, y + shaft / 2);
  ctx.lineTo(x0, y + shaft / 2);
  ctx.closePath();
}

/** A ">" chevron path (open), pointing `dir`, centered at (x, y), `s` tall. */
export function chevronPath(ctx: Ctx, x: number, y: number, s: number, dir: -1 | 1): void {
  ctx.moveTo(x - dir * s * 0.28, y - s / 2);
  ctx.lineTo(x + dir * s * 0.28, y);
  ctx.lineTo(x - dir * s * 0.28, y + s / 2);
}

/** Four-point sparkle as its own subpath. */
export function sparklePath(ctx: Ctx, x: number, y: number, r: number): void {
  const i = r * 0.28;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + i * 0.3, y - i * 0.3, x + r, y);
  ctx.quadraticCurveTo(x + i * 0.3, y + i * 0.3, x, y + r);
  ctx.quadraticCurveTo(x - i * 0.3, y + i * 0.3, x - r, y);
  ctx.quadraticCurveTo(x - i * 0.3, y - i * 0.3, x, y - r);
  ctx.closePath();
}

/** Drawn arrow in text: its width and the gaps around it, in font sizes. */
const ARROW_W = 1.25;
const ARROW_GAP = 0.3;

/** Width of `text` as textWithArrow draws it (ctx.font as set; `size` is its px size). */
export function arrowTextWidth(ctx: Ctx, text: string, size: number): number {
  if (!text.includes("{arrow}")) return ctx.measureText(text).width;
  const [before = "", after = ""] = text.split("{arrow}");
  const gap = size * ARROW_GAP;
  const wb = before ? ctx.measureText(before).width + gap : 0;
  const wa = after ? ctx.measureText(after).width + gap : 0;
  return wb + wa + size * ARROW_W;
}

/**
 * Centered text with a drawn arrow in place of `{arrow}` (fonts don't all have arrow glyphs).
 * Uses ctx.font as set; `size` is the font size in px.
 */
export function textWithArrow(
  f: Frame,
  text: string,
  dir: -1 | 1,
  cx: number,
  y: number,
  fill: string,
  arrowFill: string,
  outline: number,
  size: number,
): void {
  const ctx = f.ctx;
  const [before = "", after = ""] = text.split("{arrow}");
  const gap = size * ARROW_GAP;
  const aw = size * ARROW_W;
  const wb = before ? ctx.measureText(before).width : 0;
  let x = cx - arrowTextWidth(ctx, text, size) / 2;
  ctx.save();
  ctx.textAlign = "left";
  if (before) {
    f.kit.text(ctx, before, x, y, fill, outline);
    x += wb + gap;
  }
  arrowPath(ctx, x + aw / 2, y - size * 0.34, aw, size * 0.62, dir);
  f.kit.plate(ctx, arrowFill, arrowFill, Math.max(1.5, outline * 0.55));
  x += aw + gap;
  if (after) f.kit.text(ctx, after, x, y, fill, outline);
  ctx.restore();
}

/** Set ctx.font from `template` ("{px}" is the size), shrinking it until `text` fits `maxWidth`. Returns the size. */
export function fitFont(ctx: Ctx, text: string, template: string, size: number, maxWidth: number): number {
  let px = Math.round(size);
  ctx.font = template.replace("{px}", String(px));
  const w = ctx.measureText(text).width;
  if (w > maxWidth) {
    px = Math.floor((px * maxWidth) / w);
    ctx.font = template.replace("{px}", String(px));
  }
  return px;
}

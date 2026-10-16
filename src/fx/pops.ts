import { BLOCK_HEIGHT } from "../config";
import { swayOffset, type GameState } from "../game";
import type { Ctx } from "../base/draw";
import type { StyleKit } from "../base/style";
import type { Skin } from "../skins/skin";

// The PERFECT pop: after a perfect drop, "PERFECT" ("PERFECT ×n" on a streak, a little bigger as
// the streak grows) bounces in above the block that just landed, rides its sway, rises and fades.
// Renderer-only; deterministic from the drops and the dt it is fed.

/** Seconds a pop lives. */
const POP_LIFE = 0.9;
/** A new pop cuts the older ones short: they fade out within this long, seconds, so words never stack. */
const POP_HANDOFF = 0.15;
/** Font size of a single PERFECT, in u (the play-area width). */
const POP_SIZE = 0.065;
/** A streak of STREAK_FULL or more perfects pops this much bigger (linear on the way). */
const STREAK_GROW = 0.25;
const STREAK_FULL = 5;
/** The bounce-in takes this long, seconds. */
const POP_IN = 0.16;
/** The fade starts at this fraction of the life. */
const FADE_FROM = 0.6;
/** Start height above the block, and how far the pop rises over its life, in block heights. */
const POP_LIFT = 1.4;
const POP_RISE = 2;
/** Screen margin, px. */
const EDGE = 8;

export interface Pop {
  text: string;
  /** Block it rides on (follows the sway). */
  level: number;
  /** Seconds. */
  age: number;
  life: number;
  /** Font size, in u. */
  size: number;
}

/** Pop PERFECT over the block at `level`; `streak` is the perfect streak including this drop. */
export function addPop(pops: Pop[], level: number, streak: number): void {
  for (const o of pops) o.life = Math.min(o.life, o.age + POP_HANDOFF);
  pops.push({
    text: streak >= 2 ? `PERFECT ×${streak}` : "PERFECT",
    level,
    age: 0,
    life: POP_LIFE,
    size: POP_SIZE * (1 + STREAK_GROW * Math.min(1, streak / STREAK_FULL)),
  });
}

/** Age the pops by `dt` and drop the finished ones, in place. */
export function stepPops(pops: Pop[], dt: number): void {
  let j = 0;
  for (const p of pops) {
    p.age += dt;
    if (p.age < p.life) pops[j++] = p;
  }
  pops.length = j;
}

/** What drawing a pop needs to know about this frame, in CSS px. */
export interface PopFrame {
  ctx: Ctx;
  kit: StyleKit;
  skin: Skin;
  state: GameState;
  cssW: number;
  /** Size unit (portrait play-area width). */
  u: number;
  /** Pixels per world unit, and one block's height in px. */
  scale: number;
  h: number;
  sx(x: number): number;
  sy(y: number): number;
  /** Screen y just below the HUD stack (score, best, lives, perfect counter): pops stay under it. */
  hudBottom: number;
}

/** Each pop, centered over its block (kept on screen) and rising, but never into the HUD. */
export function drawPops(f: PopFrame, pops: readonly Pop[]): void {
  const ctx = f.ctx;
  for (const p of pops) {
    const b = f.state.blocks[p.level];
    if (!b) continue;
    // The rise runs on the full life even when a newer pop cuts this one short (only the fade
    // speeds up), so a pop that is handed off never jumps.
    const k = p.age / p.life;
    const rise = Math.min(1, p.age / POP_LIFE);
    const size = Math.round(f.u * p.size);
    ctx.save();
    ctx.font = `400 ${size}px ${f.skin.hud.display}`;
    ctx.textAlign = "center";
    const w = ctx.measureText(p.text).width;
    const center = f.sx(b.x + b.w / 2 + swayOffset(f.state, p.level));
    const x = Math.max(w / 2 + EDGE, Math.min(f.cssW - w / 2 - EDGE, center));
    const blockTop = f.sy((p.level + 1) * BLOCK_HEIGHT);
    const y = Math.max(blockTop - f.h * (POP_LIFT + rise * POP_RISE), f.hudBottom + size * 0.85);
    const sc = easeBack(p.age / POP_IN);
    ctx.globalAlpha = 1 - Math.max(0, (k - FADE_FROM) / (1 - FADE_FROM)) ** 2;
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    f.kit.text(ctx, p.text, 0, 0, f.skin.hud.accent, Math.max(3, size * 0.13));
    ctx.restore();
  }
}

/** Overshooting ease-out (0 → 1, peaks a little above 1): the pop lands with a bounce. */
function easeBack(k: number): number {
  const c = 1.9;
  const x = Math.max(0, Math.min(1, k)) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

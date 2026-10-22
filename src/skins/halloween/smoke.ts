import { alpha, type Ctx } from "../../base/draw";

// Chimney smoke: a curl of soft puffs leaving a chimney's top one after another, each rising,
// swelling, drifting off with the wind in a lazy S and fading out. Flat, see-through, no outline:
// a puff is three overlapping circles (one, far off), every puff of a chimney in one fill. Pure in time.

/** Smoke colors: a cool moonlit grey-violet, at their strongest. */
export const SMOKE = "#b8b0d8";
const SMOKE_A = [alpha(SMOKE, 0.08), alpha(SMOKE, 0.17), alpha(SMOKE, 0.27)] as const;
/** A plume whose puffs start smaller than this (px) is too far off for lobes: each puff is one circle. */
const TINY = 3.5;

/**
 * Smoke from a chimney top at (x, y): a new puff every `every` seconds, each rising `rise` px over its
 * life while drifting `drift` px sideways (signed) in a lazy S, swelling from `r` px. `fall` 1 makes
 * it fall instead (the hanging house's). Opacity at most `a` (0..1). Allocation-free.
 */
export function smoke(ctx: Ctx, t: number, x: number, y: number, r: number, rise: number, drift: number, every: number, a: number, seed = 0, fall = 0): void {
  const life = every * 4;
  const n = 4;
  for (let level = 0; level < SMOKE_A.length; level++) {
    let any = false;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const age = (((t + seed * 1.7 + i * every) % life) + life) % life;
      const f = age / life;
      // Fade in quickly, out slowly; each puff's opacity picks one of the precomputed steps.
      const k = Math.min(1, Math.min(1, f * 6) * (1 - f) * (1 - f) * 1.45) * a;
      const step = Math.min(SMOKE_A.length - 1, Math.floor((k / 0.3) * SMOKE_A.length));
      if (k < 0.02 || step !== level) continue;
      any = true;
      const dy = (fall ? 1 : -1) * rise * f;
      const curl = Math.sin(f * 5.2 + seed + i * 0.7) * r * 0.9 * f;
      const px = x + drift * f * f + curl;
      const py = y + dy;
      const rr = r * (0.6 + 1.6 * f);
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      // Lobes either side (a far, tiny plume is a puff alone).
      if (r < TINY) continue;
      ctx.moveTo(px + rr * 0.6 + rr * 0.55, py - rr * 0.3);
      ctx.arc(px + rr * 0.6, py - rr * 0.3, rr * 0.55, 0, Math.PI * 2);
      ctx.moveTo(px - rr * 0.5 + rr * 0.5, py + rr * 0.15);
      ctx.arc(px - rr * 0.5, py + rr * 0.15, rr * 0.5, 0, Math.PI * 2);
    }
    if (!any) continue;
    ctx.fillStyle = SMOKE_A[level]!;
    ctx.fill();
  }
}

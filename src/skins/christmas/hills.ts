import { hash, mix, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { HILL_ROWS, toneOf } from "./tone";

// Between the street and the city: rows of snowy hills on the field, cut from flat paper and
// laid one in front of the other like a 1950s card, each a shade apart, the far ones fading
// into the glow. Every row's crest swells at the sides and dips behind the tower, so the middle
// stays an open, quiet valley; stylized firs (tall cones, stacked cones, a few round lollipop
// trees), snow on their tips, stand on the crests in the side lanes only, in soft low-contrast
// tints, spaced so no two ever touch. At the start the rows lie pressed together under the city;
// as the tower climbs they spread apart, the near ones sinking faster than the far (parallax),
// until the land falls away below the screen. The land runs right up to the horizon: where the
// farthest crest dips below it, its snow fills the gap, so nothing of the sky (or a sun or moon
// setting behind the city) shows under the skyline.

/** How far a row's crest stands above its own line, as a fraction of the gap to the row behind: in the middle, and its swell at the sides. */
const CREST_MID = 0.42;
const CREST_SIDE = 0.8;
/** Below this gap (px) to the row behind, a row fades into it, so pressed-together rows never stripe. */
const PRESSED = 3;
const SPREAD = 10;
/** Crest points every this many u. */
const STEP = 0.05;
/** No firs within this many u of the center line. */
const FIR_CLEAR = 0.27;
/** A fir is this tall at most (u), and this fraction of its row's gap. */
const FIR_MAX = 0.1;
const FIR_GAP = 0.75;
/** Half of a fir's widest part, as a fraction of its height (the lollipop's round crown). */
const FIR_HALF = 0.31;
/**
 * Firs stand in slots out from the center line on each side, FIR_SLOT u apart from FIR_FIRST (every
 * other row half a slot further out, so the rows don't line up), out past the widest screen's
 * edge; each a little off its slot, some slots empty. A slot is wider than the widest fir with
 * both jittered toward each other, so no two firs ever touch.
 */
const FIR_FIRST = 0.31;
const FIR_SLOT = 0.085;
const FIR_SLOTS = 9;
const FIR_JITTER = 0.01;

/** Each row's firs: [distance from the center line (u, signed), kind 0 cone, 1 stacked, 2 lollipop, size]. */
const FIRS = HILL_ROWS.map((_, r) => {
  const out: [number, number, number][] = [];
  for (const side of [-1, 1]) {
    for (let j = 0; j < FIR_SLOTS; j++) {
      const i = r * 31 + j * 2 + (side > 0 ? 1 : 0);
      if (hash(i + 9500) < 0.25) continue;
      const d = FIR_FIRST + (j + (r % 2) * 0.5) * FIR_SLOT + (hash(i + 9600) * 2 - 1) * FIR_JITTER;
      const kind = hash(i + 9700);
      out.push([side * d, kind < 0.5 ? 0 : kind < 0.85 ? 1 : 2, 0.7 + hash(i + 9800) * 0.3]);
    }
  }
  return out;
});

/** How far the crest of row r rises above its line at screen x, as a fraction of its gap. */
function crest(r: number, x: number, s: Scene): number {
  const d = (x - s.cssW / 2) / s.u;
  const side = Math.min(1, Math.abs(d) / 0.6);
  return CREST_MID + CREST_SIDE * side * side * (0.6 + 0.4 * Math.sin(d * (5 + r * 0.7) + r * 1.9));
}

/** One fir of height h standing at (x, y) as its own subpath(s). */
function fir(ctx: Ctx, x: number, y: number, h: number, kind: number): void {
  const w = h * 0.42;
  if (kind === 2) {
    // A lollipop tree: a round crown on a thin trunk.
    const r = h * 0.3;
    ctx.rect(x - h * 0.03, y - h * 0.45, h * 0.06, h * 0.45);
    ctx.moveTo(x + r, y - h + r);
    ctx.arc(x, y - h + r, r, 0, Math.PI * 2);
    return;
  }
  ctx.rect(x - h * 0.04, y - h * 0.14, h * 0.08, h * 0.14);
  if (kind === 0) {
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w / 2, y - h * 0.12);
    ctx.lineTo(x - w / 2, y - h * 0.12);
    ctx.closePath();
    return;
  }
  // Stacked cones, each tier a little narrower.
  for (let k = 0; k < 3; k++) {
    const top = y - h + k * h * 0.26;
    const tw = w * (0.62 + k * 0.22);
    ctx.moveTo(x, top);
    ctx.lineTo(x + tw / 2, top + h * 0.4);
    ctx.lineTo(x - tw / 2, top + h * 0.4);
    ctx.closePath();
  }
}

/** The snow on a fir of height h standing at (x, y): a cap over the tip, as its own subpath. */
function firSnow(ctx: Ctx, x: number, y: number, h: number, kind: number): void {
  const w = h * 0.42;
  if (kind === 2) {
    const r = h * 0.3;
    const cy = y - h + r;
    ctx.moveTo(x + Math.cos(-0.75) * r, cy + Math.sin(-0.75) * r);
    ctx.arc(x, cy, r, -0.75, -Math.PI + 0.75, true);
    ctx.closePath();
    return;
  }
  // The top tier's tip: a cone's, or the narrower top cone of a stack.
  const half = kind === 0 ? (w / 2) * (0.3 / 0.88) : w * 0.31 * (0.16 / 0.4);
  const down = kind === 0 ? 0.3 : 0.16;
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + half, y - h + h * down);
  ctx.lineTo(x, y - h + h * down * 0.75);
  ctx.lineTo(x - half, y - h + h * down);
  ctx.closePath();
}

/** The rows of hills, far to near, with their firs. */
export function hills(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const n = HILL_ROWS.length;
  const W = s.cssW;
  const u = s.u;
  const cx = W / 2;
  const step = u * STEP;
  let behind = tone.hills[n - 1]!;
  // The snow from the horizon down to the farthest row's line, under its dipping crest.
  const far = Math.min(fieldY(s, HILL_ROWS[n - 1]!.z), s.cssH);
  if (far > s.horizonY && s.horizonY < s.cssH) {
    ctx.fillStyle = behind;
    ctx.fillRect(0, s.horizonY, W, far - s.horizonY + 1);
  }
  for (let r = n - 1; r >= 0; r--) {
    const line = fieldY(s, HILL_ROWS[r]!.z);
    const back = r + 1 < n ? fieldY(s, HILL_ROWS[r + 1]!.z) : s.horizonY;
    const gap = line - back;
    // The nearest row runs on down to the street (which starts at its line); the others down to the row in front's line.
    const bottom = r > 0 ? fieldY(s, HILL_ROWS[r - 1]!.z) : line + 1;
    const top = line - gap * (CREST_MID + CREST_SIDE);
    const k = Math.min(1, Math.max(0, (gap - PRESSED) / (SPREAD - PRESSED)));
    const color = k >= 1 ? tone.hills[r]! : mix(behind, tone.hills[r]!, k);
    behind = color;
    if (top > s.cssH || bottom < 0) continue;
    const foot = Math.min(bottom, s.cssH) + 1;
    ctx.beginPath();
    ctx.moveTo(-1, foot);
    for (let x = -1; ; x += step) {
      const xx = Math.min(x, W + 1);
      ctx.lineTo(xx, line - gap * crest(r, xx, s));
      if (xx >= W + 1) break;
    }
    ctx.lineTo(W + 1, foot);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Firs on the crest, out in the lanes.
    const h = Math.min(FIR_MAX * u, gap * FIR_GAP);
    if (h * k < 2) continue;
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (const [d, kind, size] of FIRS[r]!) {
        const x = cx + d * u;
        // Out in the lanes, and whole at its full height: never cut by the screen's edge, and the
        // same firs stand there however far the rows have spread.
        if (Math.abs(d) < FIR_CLEAR || Math.abs(x - cx) + FIR_MAX * u * size * FIR_HALF > cx) continue;
        // Planted a little below the crest, so they stand in the snow.
        const y = line - gap * crest(r, x, s) + h * 0.12;
        if (pass) firSnow(ctx, x, y, h * size, kind);
        else fir(ctx, x, y, h * size, kind);
      }
      const ink = pass ? tone.caps[r]! : tone.firs[r]!;
      ctx.fillStyle = k >= 1 ? ink : mix(color, ink, k);
      ctx.fill();
    }
  }
}

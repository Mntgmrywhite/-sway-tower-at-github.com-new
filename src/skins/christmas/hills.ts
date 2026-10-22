import { hash, mix, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { FIR_HALF, firPath, firSnowPath } from "./shapes";
import { FRONT_Z, HILL_ROWS, toneOf } from "./tone";

// Between the street and the city: rows of snowy hills on the field, cut from flat paper and
// laid one in front of the other like a 1950s card, each a shade apart, the far ones fading
// into the glow, each cut in two tones (lit from the left, a crisp shade plane down the far side
// of every swell). Every row's crest swells at the sides and dips behind the tower, so the
// middle stays an open, quiet valley; stylized firs (tall cones, stacked cones, round lollipop
// trees) stand in loose groves on the crests and down the slopes in the side lanes only, in soft
// low-contrast tints, spaced so no two ever touch, and a post-and-rail fence runs along one row.
// At the start the rows lie pressed together under the city; as the tower climbs they spread
// apart, the near ones sinking faster than the far (parallax), until the land falls away below
// the screen. The farthest row's crest rises from the city's front row (far.ts), which comes
// down to its line, so nothing of the sky shows under the skyline.

/** How far a row's crest stands above its own line, as a fraction of the gap to the row behind: in the middle, and its swell at the sides. */
const CREST_MID = 0.42;
const CREST_SIDE = 0.8;
/** Below this gap (px) to the row behind, a row fades into it, so pressed-together rows never stripe. */
const PRESSED = 3;
const SPREAD = 10;
/** Crest points every this many u. */
const STEP = 0.04;
/** Light falls from the left: a row's shade plane starts this far (u) right of its crest, and this far down (a fraction of its gap). */
const SHADE_DX = 0.06;
const SHADE_DY = 0.2;
/** No firs within this many u of the center line. */
const FIR_CLEAR = 0.27;
/** A fir is this tall at most (u), and this fraction of its row's gap. */
const FIR_MAX = 0.09;
const FIR_GAP = 0.72;
/**
 * Firs stand in slots out from the center line on each side, FIR_SLOT u apart from FIR_FIRST,
 * out past the widest screen's edge: on the crest, and a second, smaller grove lower down the
 * slope half a slot over (DOWN of the gap below the crest). Each a little off its slot, some slots
 * empty; a slot is wider than the widest fir with both jittered toward each other, so no two touch.
 */
const FIR_FIRST = 0.3;
const FIR_SLOT = 0.068;
const FIR_SLOTS = 13;
const FIR_JITTER = 0.006;
const DOWN = 0.5;
/** The lower groves stand on the rows up to this one (0 nearest). */
const DOWN_ROWS = 1;
/** The row the fence runs along, its reach out from the center line (u), post spacing and height (fractions of a fir). */
const FENCE_ROW = 2;
const FENCE = [0.28, 0.95] as const;
const POST_SLOT = 0.032;
const POST_H = 0.36;
/** The rails' heights up the posts (fractions of a post). */
const RAILS = [0.8, 0.45] as const;

/** Each row's firs: [distance from the center line (u, signed), down the slope (0 crest, 1 lower), kind, size]. */
const FIRS = HILL_ROWS.map((_, r) => {
  const out: [number, number, number, number][] = [];
  for (const side of [-1, 1]) {
    for (let j = 0; j < FIR_SLOTS; j++) {
      for (let down = 0; down < 2; down++) {
        const i = r * 97 + j * 5 + down * 2 + (side > 0 ? 1 : 0);
        // The lower groves only on the nearer rows, where the slopes are deep enough to hold them.
        if (down && r > DOWN_ROWS) continue;
        if (hash(i + 9500) < (down ? 0.55 : 0.22)) continue;
        const d = FIR_FIRST + (j + (r % 2) * 0.5 + down * 0.5) * FIR_SLOT + (hash(i + 9600) * 2 - 1) * FIR_JITTER;
        const kind = hash(i + 9700);
        out.push([side * d, down, kind < 0.45 ? 0 : kind < 0.8 ? 1 : 2, (down ? 0.55 : 0.7) + hash(i + 9800) * 0.3]);
      }
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

/** The rows of hills, far to near, with their shade planes, firs and the fence. */
export function hills(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const n = HILL_ROWS.length;
  const W = s.cssW;
  const u = s.u;
  const cx = W / 2;
  const step = u * STEP;
  let behind = tone.hills[n - 1]!;
  for (let r = n - 1; r >= 0; r--) {
    const line = fieldY(s, HILL_ROWS[r]!.z);
    // The farthest row's crest rises from the city's front row (far.ts), which comes down to its line.
    const back = fieldY(s, r + 1 < n ? HILL_ROWS[r + 1]!.z : FRONT_Z);
    const gap = line - back;
    // The nearest row runs on down to the street (which starts at its line); the others down to
    // where the row in front's crest is lowest (it covers the rest).
    const front = r > 0 ? fieldY(s, HILL_ROWS[r - 1]!.z) : line;
    const bottom = r > 0 ? front - (front - line) * CREST_MID + 1 : line + 1;
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
    if (k < 1) continue;

    // The shade plane: under the crest where it falls away to the right, a strip below it where it rises.
    const dx = SHADE_DX * u;
    ctx.beginPath();
    ctx.moveTo(-1, foot);
    for (let x = -1; ; x += step) {
      const xx = Math.min(x, W + 1);
      ctx.lineTo(xx, Math.max(line - gap * crest(r, xx, s), line - gap * (crest(r, xx - dx, s) - SHADE_DY)));
      if (xx >= W + 1) break;
    }
    ctx.lineTo(W + 1, foot);
    ctx.closePath();
    ctx.fillStyle = tone.hillShades[r]!;
    ctx.fill();

    const h = Math.min(FIR_MAX * u, gap * FIR_GAP);
    if (h < 2) continue;
    // The fence: slim posts and two rails along the crest, out in the lanes, in one stroke.
    if (r === FENCE_ROW) {
      const ph = h * POST_H;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        for (const rail of RAILS) {
          for (let d = FENCE[0], first = true; d <= FENCE[1]; d += POST_SLOT, first = false) {
            const x = cx + side * d * u;
            const y = line - gap * crest(r, x, s) + ph * (0.25 - rail);
            if (first) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            if (x < 0 || x > W) break;
          }
        }
        for (let d = FENCE[0]; d <= FENCE[1]; d += POST_SLOT) {
          const x = cx + side * d * u;
          const y = line - gap * crest(r, x, s) + ph * 0.25;
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - ph);
          if (x < 0 || x > W) break;
        }
      }
      ctx.strokeStyle = tone.firs[r]!;
      ctx.lineWidth = Math.max(1, ph * 0.14);
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.stroke();
    }

    // Firs in groves on the crest and down the slope, out in the lanes.
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (const [d, down, kind, size] of FIRS[r]!) {
        const x = cx + d * u;
        // Out in the lanes, and whole at its full height: never cut by the screen's edge, and the
        // same firs stand there however far the rows have spread.
        if (Math.abs(d) < FIR_CLEAR || Math.abs(x - cx) + FIR_MAX * u * size * FIR_HALF > cx) continue;
        // Planted a little below the crest (or further down the slope), so they stand in the snow.
        const y = line - gap * crest(r, x, s) + h * 0.12 + down * gap * DOWN;
        if (pass) firSnowPath(ctx, x, y, h * size, kind);
        else firPath(ctx, x, y, h * size, kind);
      }
      ctx.fillStyle = pass ? tone.caps[r]! : tone.firs[r]!;
      ctx.fill();
    }
  }
}

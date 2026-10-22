import { hash, mix, type Ctx } from "../../base/draw";
import { fieldY, layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { mistTop } from "./lines";
import { swirl } from "./sky";
import { smooth } from "./common";
import { level, LOOP_PERIOD, LOOP_START, MIST_GATHER, MIST_SETTLED, type Tone } from "./tone";

// The Sleepy Hollow fog, three ways:
//  - drifting bands lying across the hollow and the far end of Main Street at their own depths
//    (a mid-depth parallax layer: each sinks with its row of the field as you climb, nearer ones
//    faster), flat and see-through with a wavy top that curls over here and there, sliding slowly
//    sideways (each a different way), so the street's far end is lost in them;
//  - the mist floor: as you climb past the rooftops it gathers below you and swallows the town,
//    then sinks to rest low on the screen and stays there for good, a sea of mist with rows of
//    rounded billows out at the sides and a calm flat top behind the tower;
//  - in the loop's mist, long banks of fog that hang at their own heights in the right-hand lane
//    and pass by as you climb (the left lane belongs to the moon: nothing passes over it).

// ---------------------------------------------------------------- drifting bands

/** Bands: depth on the field, thickness (u), drift speed (u/s, signed), opacity, phase. */
const BANDS = [
  { z: 26, h: 0.05, speed: 0.006, a: 0.55, ph: 0.2 },
  { z: 12, h: 0.06, speed: -0.009, a: 0.5, ph: 0.6 },
  { z: 6.4, h: 0.055, speed: 0.012, a: 0.38, ph: 0.1 },
] as const;
/** Wavelength of a band's wavy top (u), and how many waves make one repeat. */
const WAVE = 0.11;

/** One band: a flat strip whose top rolls in waves, curling over at every third crest. */
function band(ctx: Ctx, s: Scene, i: number, color: string, light: string, k0: number): void {
  const b = BANDS[i]!;
  const u = s.u;
  const foot = fieldY(s, b.z) + u * 0.006;
  const k = 3 / b.z;
  const h = b.h * u * Math.max(0.6, Math.min(1.4, k * 2.2));
  if (foot - h * 1.6 > s.cssH || foot < 0) return;
  const wl = WAVE * u;
  const shift = (s.t * b.speed + b.ph) * u;
  const first = Math.floor((-wl * 2 - shift) / wl);
  const last = Math.ceil((s.cssW + wl * 2 - shift) / wl);
  const top = foot - h;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    ctx.moveTo(shift + first * wl, foot + h * 0.6);
    for (let j = first; j <= last; j++) {
      const x = shift + j * wl;
      const crest = top - h * (0.25 + 0.35 * hash(j + i * 977 + 7300)) * (pass ? 0.5 : 1);
      const rest = top + (pass ? h * 0.35 : 0);
      ctx.lineTo(x, rest);
      ctx.quadraticCurveTo(x + wl * 0.25, crest, x + wl * 0.5, rest);
      ctx.quadraticCurveTo(x + wl * 0.75, top + h * 0.3, x + wl, rest);
    }
    ctx.lineTo(shift + (last + 1) * wl, foot + h * 0.6);
    ctx.closePath();
    ctx.fillStyle = pass ? color : light;
    ctx.globalAlpha = b.a * k0 * (pass ? 1 : 0.55);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The fog bands lying at depths `from` to `to` (z), farthest first. */
export function fogBands(ctx: Ctx, s: Scene, tone: Tone, from: number, to: number): void {
  // They sink into the mist floor as it settles (the loop has its own banks).
  const k = tone.fogK * (1 - smooth(MIST_GATHER[1], MIST_SETTLED, level(s)));
  if (k < 0.01) return;
  const light = mix(tone.fog, "#ffffff", 0.18);
  for (let i = 0; i < BANDS.length; i++) {
    const z = BANDS[i]!.z;
    if (z < from || z >= to) continue;
    band(ctx, s, i, tone.fog, light, k);
  }
}

// ---------------------------------------------------------------- the mist floor

/** The billows along the mist floor's top: step (u), and how far they rise out at the sides (u). */
const BILLOW = 0.07;
const RISE = 0.07;

/** One row of billows along `top`: flat across the column, rising into rounded lobes toward the sides. */
function billows(ctx: Ctx, s: Scene, top: number, rise: number, step: number, seed: number, drop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const col = s.baseW / 2 + u * 0.05;
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  ctx.moveTo(-step, s.cssH + 2);
  for (let j = -n; j <= n; j++) {
    const x = cx + j * step;
    const side = Math.max(0, Math.min(1, (Math.abs(x - cx) - col) / (u * 0.25)));
    const r = step * 0.5 * (0.7 + 0.5 * side + 0.25 * hash(Math.abs(j) + seed + (j < 0 ? 0 : 50)) * side);
    const y = top - rise * side * (0.6 + 0.4 * hash(Math.abs(j) + seed + 100)) + drop;
    if (side <= 0) {
      ctx.lineTo(x - step / 2, top + drop);
      ctx.lineTo(x + step / 2, top + drop);
    } else {
      ctx.lineTo(x - step / 2, y + r * 0.2);
      ctx.arc(x, y + r * 0.2, step / 2, Math.PI, 0);
    }
  }
  ctx.lineTo(s.cssW + step, s.cssH + 2);
  ctx.closePath();
}

/**
 * The mist floor from its top (lines.ts) to the screen's bottom: an opaque body, its top a row of
 * rounded billows that rise out in the lanes and lie flat behind the tower, a lit back row above
 * it, a shaded row lower down, and here and there a billow rolling over into a Burton curl.
 */
export function mistFloor(ctx: Ctx, s: Scene, tone: Tone): void {
  const top = mistTop(s);
  if (top - s.u * RISE * 1.5 > s.cssH) return;
  const u = s.u;
  const body = mix(tone.fog, tone.sky[2], 0.35);
  const cap = mix(tone.fog, "#ffffff", 0.16);
  const deep = mix(body, tone.sky[0], 0.3);
  const step = BILLOW * u;
  ctx.beginPath();
  billows(ctx, s, top, RISE * u, step, 7500, 0);
  ctx.fillStyle = cap;
  ctx.fill();
  ctx.beginPath();
  billows(ctx, s, top, RISE * u, step, 7500, step * 0.18);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  billows(ctx, s, top + u * 0.11, RISE * u * 0.6, step * 1.3, 7800, 0);
  ctx.fillStyle = deep;
  ctx.fill();
  // Curls rolling over on the billows out in the lanes.
  const cx = s.cssW / 2;
  const col = s.baseW / 2 + u * 0.05;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const k of [0.3, 0.75]) {
      const x = cx + side * (col + (s.cssW / 2 - col) * k);
      const r = u * 0.022;
      const y = top - RISE * u * 0.55 + r * 0.6;
      if (x - r < 0 || x + r > s.cssW) continue;
      ctx.moveTo(x + side * r, y);
      ctx.arc(x, y, r, side > 0 ? 0 : Math.PI, side > 0 ? -Math.PI * 1.5 : Math.PI * 2.5, side > 0);
      ctx.arc(x - side * r * 0.25, y - r * 0.15, r * 0.45, side > 0 ? Math.PI / 2 : Math.PI / 2, side > 0 ? -Math.PI : Math.PI * 2, side > 0);
    }
  }
  ctx.strokeStyle = cap;
  ctx.lineWidth = Math.max(1.5, u * 0.007);
  ctx.lineCap = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- the loop's banks

/** How fast the banks pass as you climb: nearly with the tower, they hang close by. */
const BANK_P = 0.9;
const BANK_EDGE = 0.014;
const BANK_MAX_W = 0.3;

/** The banks of one loop: where in the loop (fraction), thickness (u). All in the right-hand lane. */
export const BANKS = [
  { at: 0.16, h: 0.06 },
  { at: 0.21, h: 0.05 },
  { at: 0.27, h: 0.058 },
  { at: 0.33, h: 0.052 },
  { at: 0.39, h: 0.056 },
].map((b, i) => ({ ...b, lvl: b.at * LOOP_PERIOD, seed: 31 + i * 7 }));

const B = { x0: 0, x1: 0, y0: 0, y1: 0 };

/** Where bank `i` of loop `k` is on screen. */
export function bankBox(s: Scene, k: number, i: number): typeof B {
  const b = BANKS[i]!;
  const u = s.u;
  const lvl = LOOP_START + k * LOOP_PERIOD + b.lvl;
  const y = layerGround(s, BANK_P) - lvl * BLOCK_HEIGHT * s.scale * BANK_P;
  const h = b.h * u;
  const col1 = s.baseX + s.baseW + u * 0.05;
  const lo = col1 + u * BANK_EDGE;
  const hi = s.cssW - u * BANK_EDGE;
  const w = Math.max(0, Math.min(hi - lo, u * BANK_MAX_W));
  B.x0 = lo + (i % 2 ? Math.max(0, hi - lo - w) * 0.5 : 0);
  B.x1 = B.x0 + w;
  B.y0 = y - h;
  B.y1 = y;
  return B;
}

/** The loop's fog banks within view, while the mist holds. */
export function fogBanks(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.banks < 0.01) return;
  const lvl = level(s);
  if (lvl < LOOP_START - LOOP_PERIOD * 0.25) return;
  const k0 = Math.floor((lvl - LOOP_START) / LOOP_PERIOD);
  ctx.globalAlpha = tone.banks;
  const shade = mix(tone.fog, tone.sky[1], 0.25);
  const light = mix(tone.fog, "#ffffff", 0.22);
  for (let k = Math.max(0, k0 - 1); k <= k0 + 1; k++) {
    for (let i = 0; i < BANKS.length; i++) {
      const box = bankBox(s, k, i);
      if (box.y0 > s.cssH || box.y1 < 0 || box.x1 - box.x0 < s.u * 0.08) continue;
      // A long bank rolling up into a curl at its outer end: shaded underneath, lit along the top.
      const h = box.y1 - box.y0;
      const th = h * 0.42;
      const y = box.y1 - h * 0.62;
      ctx.beginPath();
      swirl(ctx, box.x0, box.x1, y + th * 0.18, th, i % 2 ? 1 : -1, 0);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.beginPath();
      swirl(ctx, box.x0 + th * 0.3, box.x1 - th * 0.15, y, th * 0.8, i % 2 ? 1 : -1, 0);
      ctx.fillStyle = light;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

import { alpha, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CYAN, GOLD, ORANGE, PINK, RED, SHADOW_FAR, SKY_BOTTOM, VIOLET } from "./colors";
import { deckCover } from "./deck";
import { toneOf, type Tone } from "./tone";
import { hotTube, rimTube } from "./tube";

// The far layer: wireframe mountains, then a sunset city skyline standing on the horizon in
// front of them. Two rows of dark violet towers (the back row hazier), a few rooftops trimmed
// with a thin neon tube, lit windows, a needle tower and a spire with blinking beacons. The
// middle stays low so the striped sun reads over it. As the sun sets more windows come on and
// the range's rim cools toward cyan; deep in the night the cloud bank swallows it all, and then
// it is not drawn. Geometry is in u from the screen center, heights up from the horizon.

interface Tower {
  x: number;
  w: number;
  h: number;
  /** 0 flat, 1 setback, 2 antenna */
  roof: 0 | 1 | 2;
  /** Neon roof trim: -1 none, else an index into TRIM. */
  trim: number;
}

const SPAN = 1.7;
/** Half-width of the low middle, where the sun shows. */
const MID = 0.2;

function row(seed: number, minW: number, maxW: number, low: number, high: number, jitter: number, trimChance: number): Tower[] {
  const out: Tower[] = [];
  let x = -SPAN;
  for (let i = 0; x < SPAN; i++) {
    const w = minW + hash(seed + i * 3.7) * (maxW - minW);
    const mid = Math.abs(x + w / 2);
    // Low across the sun, tallest just beside it, easing off toward the far edges.
    const rise = mid < MID ? 0 : Math.min(1, (mid - MID) / 0.12) * (mid > 0.6 ? 0.75 : 1);
    const h = low + (high - low) * rise + hash(seed + i * 3.7 + 1) * jitter * (mid < MID ? 0.3 : 1);
    const r = hash(seed + i * 3.7 + 2);
    const roof = r < 0.6 ? 0 : r < 0.85 ? 1 : 2;
    const trim = hash(seed + i * 3.7 + 3) < trimChance && mid > MID ? Math.floor(hash(seed + i * 5.1) * 3) : -1;
    out.push({ x, w, h, roof: mid < MID ? 0 : roof, trim });
    x += w * (0.96 + hash(seed + i * 3.7 + 4) * 0.08);
  }
  return out;
}

const BACK = row(300, 0.05, 0.09, 0.03, 0.15, 0.05, 0);
const FRONT = row(700, 0.035, 0.07, 0.012, 0.09, 0.05, 0.3);

/** Landmarks: a needle tower left of the sun, a stepped spire right of it. */
const NEEDLE_X = -0.33;
const NEEDLE_H = 0.25;
const SPIRE_X = 0.34;
const SPIRE_H = 0.23;

const TRIM = [PINK, CYAN, VIOLET] as const;
const TRIM_LINE = TRIM.map((c) => alpha(c, 0.75));
const BACK_FILL = mix(SHADOW_FAR, SKY_BOTTOM, 0.22);
const FRONT_FILL = SHADOW_FAR;
const WIN_COLORS = [mix(FRONT_FILL, ORANGE, 0.55), mix(FRONT_FILL, PINK, 0.5), mix(FRONT_FILL, CYAN, 0.5)] as const;
const BACK_WIN = mix(BACK_FILL, GOLD, 0.3);

interface Win {
  x: number;
  y: number;
  c: number;
  seed: number;
  /** Lit once the evening lights reach this far (0..1). */
  on: number;
}

function windows(list: Tower[], seed: number, lit: number): Win[] {
  const out: Win[] = [];
  for (const [bi, b] of list.entries()) {
    if (Math.abs(b.x + b.w / 2) < MID) continue;
    const cols = Math.max(1, Math.floor((b.w - 0.012) / 0.016));
    const rows = Math.max(0, Math.floor((b.h - 0.02) / 0.02));
    const pad = (b.w - cols * 0.016) / 2;
    const c = Math.floor(hash(seed + bi * 7.3) * 3);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const id = seed + bi * 97 + r * 13 + k;
        if (hash(id) > lit) continue;
        out.push({ x: b.x + pad + k * 0.016 + 0.004, y: 0.014 + r * 0.02, c, seed: id, on: hash(id + 0.5) });
      }
    }
  }
  return out;
}

const FRONT_WINS = [0, 1, 2].map((c) => windows(FRONT, 1900, 0.4).filter((w) => w.c === c));
const BACK_WINS = windows(BACK, 2300, 0.26);
/** Share of the windows lit at sunset; the rest come on as night falls. */
const DUSK_LIT = 0.5;

function towers(ctx: Ctx, list: Tower[], cx: number, hy: number, u: number, x0: number, x1: number): void {
  for (const b of list) {
    const left = cx + b.x * u;
    const w = b.w * u;
    if (left > x1 || left + w < x0) continue;
    const top = hy - b.h * u;
    ctx.rect(left, top, w + 0.5, b.h * u + 1);
    if (b.roof === 1) ctx.rect(left + w * 0.2, top - u * 0.018, w * 0.6, u * 0.019);
    else if (b.roof === 2) ctx.rect(left + w * 0.45, top - u * 0.04, Math.max(1, u * 0.004), u * 0.041);
  }
}

function needle(ctx: Ctx, x: number, hy: number, u: number): void {
  const h = NEEDLE_H * u;
  const w = u * 0.012;
  ctx.moveTo(x - w * 1.6, hy);
  ctx.lineTo(x - w * 0.5, hy - h * 0.72);
  ctx.lineTo(x + w * 0.5, hy - h * 0.72);
  ctx.lineTo(x + w * 1.6, hy);
  ctx.closePath();
  // Pod: a flying-saucer deck.
  ctx.moveTo(x - u * 0.03, hy - h * 0.74);
  ctx.lineTo(x - u * 0.016, hy - h * 0.8);
  ctx.lineTo(x + u * 0.016, hy - h * 0.8);
  ctx.lineTo(x + u * 0.03, hy - h * 0.74);
  ctx.lineTo(x + u * 0.012, hy - h * 0.7);
  ctx.lineTo(x - u * 0.012, hy - h * 0.7);
  ctx.closePath();
  ctx.rect(x - u * 0.002, hy - h, u * 0.004, h * 0.21);
}

function spire(ctx: Ctx, x: number, hy: number, u: number): void {
  const h = SPIRE_H * u;
  const w = u * 0.06;
  ctx.moveTo(x - w / 2, hy);
  ctx.lineTo(x - w / 2, hy - h * 0.6);
  ctx.lineTo(x - w * 0.34, hy - h * 0.6);
  ctx.lineTo(x - w * 0.34, hy - h * 0.72);
  ctx.lineTo(x - w * 0.18, hy - h * 0.72);
  ctx.lineTo(x - w * 0.18, hy - h * 0.8);
  ctx.lineTo(x, hy - h);
  ctx.lineTo(x + w * 0.18, hy - h * 0.8);
  ctx.lineTo(x + w * 0.18, hy - h * 0.72);
  ctx.lineTo(x + w * 0.34, hy - h * 0.72);
  ctx.lineTo(x + w * 0.34, hy - h * 0.6);
  ctx.lineTo(x + w / 2, hy - h * 0.6);
  ctx.lineTo(x + w / 2, hy);
  ctx.closePath();
}

/** The range as overlapping peaks [x (u from center), height (u), left slope, right slope]: the
 *  ridge is their upper envelope, so the big peaks get shoulders and uneven flanks (one clean
 *  triangle per peak reads as a pyramid). Low across the sun, tall behind the city at the sides. */
const PEAKS: readonly (readonly [number, number, number, number])[] = [
  [-1.68, 0.16, 1.2, 1.3],
  [-1.47, 0.23, 1.5, 1.1],
  [-1.3, 0.17, 1.2, 1.7],
  [-1.15, 0.26, 1.3, 1.6],
  [-0.98, 0.19, 1.6, 1.2],
  [-0.8, 0.25, 1.1, 1.5],
  [-0.63, 0.2, 1.7, 1.3],
  [-0.5, 0.24, 1.6, 1.4],
  [-0.4, 0.29, 1.2, 1.7],
  [-0.31, 0.16, 1.4, 1.9],
  [-0.19, 0.115, 1.2, 1.0],
  [-0.07, 0.075, 0.9, 1.1],
  [0.05, 0.095, 1.0, 0.8],
  [0.17, 0.07, 0.8, 1.2],
  [0.28, 0.125, 1.3, 1.6],
  [0.37, 0.19, 1.9, 1.4],
  [0.46, 0.3, 1.6, 1.2],
  [0.6, 0.21, 1.4, 1.7],
  [0.74, 0.26, 1.5, 1.2],
  [0.92, 0.18, 1.3, 1.5],
  [1.08, 0.25, 1.6, 1.3],
  [1.27, 0.2, 1.2, 1.6],
  [1.45, 0.24, 1.4, 1.2],
  [1.66, 0.17, 1.3, 1.2],
];
const RIDGE_SPAN = 1.78;
/** Spacing of the ridge samples (u); they are also the columns of the wireframe mesh. */
const RIDGE_STEP = 0.055;

function envelope(x: number): number {
  let h = 0;
  for (const [px, ph, left, right] of PEAKS) {
    const d = x - px;
    h = Math.max(h, ph - (d < 0 ? -d * left : d * right));
  }
  return h;
}

/** Ridge vertices left to right as [x, h]: every peak tip exactly, and samples between them
 *  nicked down a little so the flanks read craggy. */
const RIDGE: readonly (readonly [number, number])[] = (() => {
  const xs = PEAKS.map((p) => p[0]);
  for (let i = 0, x = -RIDGE_SPAN; x <= RIDGE_SPAN + 1e-9; i++, x += RIDGE_STEP) {
    const j = x + (hash(i + 900) - 0.5) * RIDGE_STEP * 0.5;
    if (PEAKS.every((p) => Math.abs(p[0] - j) > RIDGE_STEP * 0.4)) xs.push(j);
  }
  xs.sort((a, b) => a - b);
  return xs.map((x, i) => {
    const tip = PEAKS.some((p) => p[0] === x);
    const h = envelope(x);
    return [x, tip ? h : Math.max(0.01, h - hash(i + 1300) * 0.014)] as const;
  });
})();

/** The mesh's two inner rows, as fractions of the ridge height. They sit straight under the
 *  ridge vertices, so the mesh stays inside the silhouette without a clip. */
const ROWS = [0.68, 0.36] as const;

const RIDGE_FILL = mix(SKY_BOTTOM, "#000000", 0.66);

/** Wireframe mountains: a dark low-poly range with a neon rim and a triangle mesh. */
function ridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  // Only the columns that can be on screen (the range spans wider than any phone).
  const reach = cx / u + 0.15;
  let i0 = 0;
  while (i0 < RIDGE.length - 1 && RIDGE[i0 + 1]![0] < -reach) i0++;
  let i1 = RIDGE.length - 1;
  while (i1 > i0 && RIDGE[i1 - 1]![0] > reach) i1--;

  ctx.beginPath();
  ctx.moveTo(cx + RIDGE[i0]![0] * u, hy);
  for (let i = i0; i <= i1; i++) ctx.lineTo(cx + RIDGE[i]![0] * u, hy - RIDGE[i]![1] * u);
  ctx.lineTo(cx + RIDGE[i1]![0] * u, hy);
  ctx.closePath();
  ctx.fillStyle = RIDGE_FILL;
  ctx.fill();
  // Mesh, one stroke: a zigzag from the ridge down to the first row (the triangles), then the
  // two rows running along the range like terrain contours.
  ctx.beginPath();
  for (let i = i0; i <= i1; i++) {
    const [x, h] = RIDGE[i]!;
    if (i === i0) ctx.moveTo(cx + x * u, hy - h * u);
    else ctx.lineTo(cx + x * u, hy - h * u);
    ctx.lineTo(cx + x * u, hy - h * ROWS[0] * u);
  }
  for (const f of ROWS) {
    for (let i = i0; i <= i1; i++) {
      const [x, h] = RIDGE[i]!;
      if (i === i0) ctx.moveTo(cx + x * u, hy - h * f * u);
      else ctx.lineTo(cx + x * u, hy - h * f * u);
    }
  }
  ctx.lineWidth = 1;
  ctx.lineJoin = "bevel";
  ctx.strokeStyle = tone.ridgeMesh;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + RIDGE[i0]![0] * u, hy - RIDGE[i0]![1] * u);
  for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(cx + RIDGE[i]![0] * u, hy - RIDGE[i]![1] * u);
  rimTube(ctx, tone.ridge, Math.max(1.1, u * 0.0032));
}

/** Tallest point of the far layer over the horizon (u): the highest peak and its rim. */
const FAR_TOP = 0.31;

export function city(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  if (hy - s.u * FAR_TOP > s.cssH) return;
  const tone = toneOf(s);
  // Swallowed by the cloud bank: nothing shows.
  if (deckCover(s, tone) < hy - s.u * FAR_TOP) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const x0 = -u * 0.1;
  const x1 = s.cssW + u * 0.1;
  const lit = DUSK_LIT + (1 - DUSK_LIT) * tone.lights;

  ridge(ctx, s, tone);

  // Back row: hazy violet.
  ctx.beginPath();
  towers(ctx, BACK, cx, hy, u, x0, x1);
  ctx.fillStyle = BACK_FILL;
  ctx.fill();
  ctx.beginPath();
  for (const w of BACK_WINS) {
    const x = cx + w.x * u;
    if (w.on > lit || x < x0 || x > x1 || Math.sin(s.t * 0.4 + w.seed) < -0.5) continue;
    ctx.rect(x, hy - (w.y + 0.01) * u, u * 0.007, u * 0.009);
  }
  ctx.fillStyle = BACK_WIN;
  ctx.fill();

  // Front row and the two landmarks: one dark silhouette.
  ctx.beginPath();
  towers(ctx, FRONT, cx, hy, u, x0, x1);
  needle(ctx, cx + NEEDLE_X * u, hy, u);
  spire(ctx, cx + SPIRE_X * u, hy, u);
  ctx.fillStyle = FRONT_FILL;
  ctx.fill();

  // An index loop: entries() would allocate an iterator and a pair per color every frame.
  for (let c = 0; c < FRONT_WINS.length; c++) {
    ctx.beginPath();
    for (const w of FRONT_WINS[c]!) {
      const x = cx + w.x * u;
      if (w.on > lit || x < x0 || x > x1 || Math.sin(s.t * 0.3 + w.seed * 1.3) < -0.6) continue;
      ctx.rect(x, hy - (w.y + 0.01) * u, u * 0.007, u * 0.009);
    }
    ctx.fillStyle = WIN_COLORS[c]!;
    ctx.fill();
  }

  // Neon roof trims, one path per color.
  const tube = Math.max(1, u * 0.0028);
  for (let c = 0; c < TRIM.length; c++) {
    ctx.beginPath();
    for (const b of FRONT) {
      if (b.trim !== c) continue;
      const left = cx + b.x * u;
      if (left > x1 || left + b.w * u < x0) continue;
      const top = hy - b.h * u;
      ctx.moveTo(left + 1, top + 0.5);
      ctx.lineTo(left + b.w * u - 1, top + 0.5);
    }
    ctx.strokeStyle = TRIM_LINE[c]!;
    ctx.lineWidth = tube;
    ctx.stroke();
  }
  // The needle's pod ring and the spire's crown, in neon.
  const nx = cx + NEEDLE_X * u;
  ctx.beginPath();
  ctx.moveTo(nx - u * 0.03, hy - NEEDLE_H * u * 0.74);
  ctx.lineTo(nx + u * 0.03, hy - NEEDLE_H * u * 0.74);
  hotTube(ctx, CYAN, tube, 2.2);
  const sx = cx + SPIRE_X * u;
  const sh = SPIRE_H * u;
  ctx.beginPath();
  ctx.moveTo(sx - u * 0.0108, hy - sh * 0.8);
  ctx.lineTo(sx, hy - sh);
  ctx.lineTo(sx + u * 0.0108, hy - sh * 0.8);
  hotTube(ctx, PINK, tube, 2.2);

  // Beacons blinking on the needle and the spire.
  const blink = 0.5 + 0.5 * Math.sin(s.t * 3);
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.35 + 0.65 * blink;
  ctx.fillRect(nx - u * 0.003, hy - NEEDLE_H * u - u * 0.004, u * 0.006, u * 0.006);
  ctx.globalAlpha = 1 - 0.65 * blink;
  ctx.fillRect(sx - u * 0.003, hy - sh - u * 0.005, u * 0.006, u * 0.006);
  ctx.globalAlpha = 1;
}

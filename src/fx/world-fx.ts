import { BLOCK_HEIGHT, GUST_WARN, LAST_CHANCE_TIME, tuning } from "../config";
import { gustPush, top, topLevel, windStrength } from "../game";
import { alpha, circle, easeOut, hash, mix, roundRectPath } from "../base/draw";
import { ARROW_TIME, isTipping, LOCK_TIME, railAt, regrowSide, SWEEP_FADE, SWEEP_GROW, type Pop, type Tone } from "./fx";
import {
  arrowPath,
  blockLeft,
  blockTop,
  chevronPath,
  clamp01,
  easeBack,
  heat,
  leanUi,
  sparklePath,
  toneColor,
  type Frame,
} from "./frame";
import { fallPivot, TOPPLE_FLASH } from "./topple";

// Telegraphing drawn in world space (inside the camera transform), around the tower.
// All motion comes from view.t / state, never Math.random, so previews are deterministic.

const playing = (f: Frame) => f.state.phase === "playing";
/** Lock brackets close over this fraction of LOCK_TIME and fade over the last LOCK_FADE of it. */
const LOCK_CLOSE = 0.18;
const LOCK_FADE = 0.4;
/** Lean arrows grow over this fraction of ARROW_TIME and fade over the last ARROW_FADE of it. */
const ARROW_GROW = 0.18;
const ARROW_FADE = 0.4;
/** Screen margin for things clamped on screen, px. */
const EDGE = 8;
/** Gust streaks in front of the tower are this see-through, so the bars still read. */
const STREAK_FRONT_ALPHA = 0.7;
/** Pops beside a block sit this far (block heights) off its edge: clear of brackets and glints. */
const BESIDE_GAP = 0.8;
/** A beside pop shrinks to fit its room, but not below this (u); then it goes on the main line. */
const BESIDE_MIN = 0.036;

/** Dashed plumb line from the base center up past the top: what "upright" looks like. */
export function drawPlumb(f: Frame): void {
  const s = f.state;
  if (!leanUi() || s.score < 1 || (s.phase === "over" && !s.toppled)) return;
  const base = s.blocks[0];
  if (!base) return;
  const ctx = f.ctx;
  const r = Math.max(3, f.h * 0.28);
  const x = f.sx(base.x + base.w / 2);
  const y0 = f.sy(BLOCK_HEIGHT);
  // Four levels above the top, but the bob never sits on the HUD.
  const y1 = Math.max(f.sy((topLevel(s) + 4) * BLOCK_HEIGHT), f.hudBottom + r * 0.4);
  ctx.save();
  ctx.globalAlpha = 0.85 * clamp01(s.score / 2);
  ctx.setLineDash([f.h * 0.5, f.h * 0.42]);
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  f.kit.beam(ctx, "#ffffff", Math.max(1.5, f.u * 0.0055));
  ctx.setLineDash([]);
  // A small plumb bob marks the top of the line.
  ctx.beginPath();
  ctx.moveTo(x, y1 - r * 0.2);
  ctx.quadraticCurveTo(x + r, y1 + r * 0.6, x, y1 + r * 1.5);
  ctx.quadraticCurveTo(x - r, y1 + r * 0.6, x, y1 - r * 0.2);
  ctx.closePath();
  f.kit.plate(ctx, "#ffffff", "#ffffff", Math.max(1.2, f.h * 0.08));
  ctx.restore();
}

/**
 * Wind streaks at the top's height. "back": a light drift behind the tower in windy bands,
 * lanes alternating direction (the next gust's direction isn't known yet). "front": a gust's
 * streaks rushing in from the upwind edge, over the tower so they read on any sky.
 */
export function drawWind(f: Frame, layer: "back" | "front"): void {
  const s = f.state;
  if (!playing(f) || !tuning.swayOn) return;
  const g = s.gust;
  const idle = g.phase === "idle";
  if ((layer === "back") !== idle) return;
  const wind = windStrength(s.score);
  let count: number;
  let peak: number;
  let speed = 1;
  let clock: number;
  if (idle) {
    if (wind <= 0) return;
    count = Math.round(2 + 3 * wind);
    peak = 0.4;
    speed = 0.55;
    clock = f.t;
  } else if (g.phase === "warn") {
    count = 9;
    peak = STREAK_FRONT_ALPHA;
    clock = g.t;
  } else {
    const k = g.amp > 0 ? Math.abs(gustPush(s)) / g.amp : 0;
    count = Math.round(8 + 8 * k);
    peak = STREAK_FRONT_ALPHA * (0.35 + 0.65 * k);
    clock = GUST_WARN + g.t;
  }
  const ctx = f.ctx;
  const n = topLevel(s);
  // Lanes spread about the top; the band moves down if it would reach the HUD.
  const spread = f.u * 0.62;
  const cy = Math.max(blockTop(f, n) + f.h * 0.5, f.hudBottom + f.u * 0.03 + spread * 0.6);
  ctx.save();
  ctx.globalAlpha = peak;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const dir = idle ? (i % 2 === 0 ? 1 : -1) : g.dir;
    const v = f.u * (1.4 + 0.9 * hash(i * 3 + 1)) * speed;
    const len = f.u * (0.08 + 0.1 * hash(i * 3 + 2));
    const lane = cy + (hash(i * 3 + 3) - 0.6) * spread;
    const span = f.cssW + len * 2;
    const period = span / v;
    // Gust streaks are born at the upwind edge after the gust starts; ambient ones loop.
    const born = idle ? -hash(i * 5 + 4) * period : hash(i * 5 + 4) * 0.55;
    if (clock < born) continue;
    const travel = (((clock - born) % period) + period) % period;
    const head = dir > 0 ? -len + travel * v : f.cssW + len - travel * v;
    const tail = head - dir * len;
    ctx.moveTo(tail, lane);
    ctx.lineTo(head, lane);
    // A small curl at the head reads as wind, not rain.
    ctx.quadraticCurveTo(head + dir * len * 0.12, lane - f.u * 0.012, head + dir * len * 0.02, lane - f.u * 0.022);
  }
  f.kit.beam(ctx, f.kit.tones.wind, Math.max(2, f.u * 0.007));
  ctx.restore();
}

/** Side the bank chips sit on: the light side (away from the drift), held while balanced. */
export function chipSide(f: Frame): -1 | 1 {
  return f.fx.driftSide > 0 ? -1 : 1;
}

/**
 * Banked rebuild chips on the light side, stacked down beside the bars under the top (clear of
 * the slider row), captioned REBUILD; they glow READY once a perfect would rebuild.
 */
export function drawChips(f: Frame): void {
  const s = f.state;
  if (!playing(f) || s.banked <= 0) return;
  const ctx = f.ctx;
  const n = topLevel(s);
  const side = chipSide(f);
  const cw = f.h * 1.2;
  const ch = f.h * 0.46;
  const step = ch + 2;
  const gap = f.h * 0.8;
  const count = Math.min(s.banked, 5);
  // Clear of the widest of the bars the stack runs beside.
  let edge = side < 0 ? Infinity : -Infinity;
  for (let i = n; i >= Math.max(0, n - 4); i--) {
    const b = s.blocks[i];
    if (!b) continue;
    const l = blockLeft(f, i);
    edge = side < 0 ? Math.min(edge, l) : Math.max(edge, l + b.w * f.scale);
  }
  const want = side < 0 ? edge - gap - cw : edge + gap;
  const x = Math.max(EDGE, Math.min(f.cssW - EDGE - cw, want));
  const ready = f.st.canRebuild;
  const fill = ready ? f.kit.tones.gold : f.kit.tones.calm;
  const y0 = blockTop(f, n) + f.h + 2;
  const pulse = 0.5 + 0.5 * Math.sin(f.t * 6);
  ctx.save();
  if (ready) {
    roundRectPath(ctx, x - 2, y0 - 2, cw + 4, count * step + 2, ch * 0.5);
    f.kit.halo(ctx, fill, f.h * (0.35 + 0.35 * pulse));
  }
  for (let k = 0; k < count; k++) {
    const y = y0 + k * step;
    roundRectPath(ctx, x, y, cw, ch, ch * 0.45);
    f.kit.plate(ctx, fill, fill, Math.max(1.2, f.h * 0.08));
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(x + cw * 0.18, y + ch * 0.22, cw * 0.4, Math.max(1, ch * 0.16));
  }
  const size = Math.round(f.u * 0.03);
  ctx.font = `700 ${size}px ${f.kit.body}`;
  ctx.textAlign = "center";
  const label = ready ? "READY" : "REBUILD";
  const tw = ctx.measureText(label).width;
  const lx = Math.max(EDGE + tw / 2, Math.min(f.cssW - EDGE - tw / 2, x + cw / 2));
  f.kit.text(ctx, label, lx, y0 + count * step + size * 0.95, fill, Math.max(3, size * 0.2));
  ctx.restore();
}

/** Amber (then red) wash on the topple side of the top bars, strongest at the top. */
export function drawTint(f: Frame): void {
  const s = f.state;
  const side = f.fx.side;
  if (!playing(f) || f.fx.amber < 0.02 || side === 0) return;
  const ctx = f.ctx;
  const n = topLevel(s);
  const color = heat(f);
  for (let i = n; i >= Math.max(1, n - 5); i--) {
    const b = s.blocks[i];
    if (!b) continue;
    const k = f.fx.amber * (1 - (n - i) / 6);
    const x = blockLeft(f, i);
    const w = b.w * f.scale;
    const y = blockTop(f, i);
    ctx.save();
    roundRectPath(ctx, x, y, w, f.h, f.h * f.kit.radius);
    ctx.clip();
    const edge = side > 0 ? x + w : x;
    const g = ctx.createLinearGradient(edge, 0, edge - side * w * 0.6, 0);
    g.addColorStop(0, alpha(color, 0.7 * k));
    g.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, f.h);
    ctx.restore();
  }
}

/** A bright sweep over the strip(s) a rebuild grew back, on the real (logic-width) bar. */
export function drawSweeps(f: Frame): void {
  const ctx = f.ctx;
  for (const sw of f.fx.sweeps) {
    if (sw.age < 0) continue;
    const b = f.state.blocks[sw.level];
    if (!b) continue;
    const k = Math.min(1, sw.age / SWEEP_GROW);
    const x = blockLeft(f, sw.level);
    const w = b.w * f.scale;
    const y = blockTop(f, sw.level);
    ctx.save();
    roundRectPath(ctx, x, y, w, f.h, f.h * f.kit.radius);
    ctx.clip();
    const fade = 1 - clamp01((sw.age - SWEEP_GROW) / SWEEP_FADE);
    for (const [grew, outer, inward] of [
      [sw.left, x, 1],
      [sw.right, x + w, -1],
    ] as const) {
      if (grew <= 0) continue;
      const inner = outer + inward * grew * f.scale;
      ctx.globalAlpha = 0.65 * fade * (1 - k * 0.5);
      ctx.fillStyle = f.kit.tones.gold;
      ctx.fillRect(Math.min(inner, outer), y, Math.abs(outer - inner), f.h);
      // The bright band runs from the old edge out to the new one.
      const bx = inner + (outer - inner) * easeOut(k);
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx - f.h * 0.22, y, f.h * 0.44, f.h);
    }
    ctx.restore();
  }
}

/** Gold glints on the edge the next rebuild will grow: "the next perfect rebuilds". */
export function drawGlints(f: Frame): void {
  if (!playing(f) || !f.st.canRebuild) return;
  const side = regrowSide(f.state);
  if (side === 0) return;
  const ctx = f.ctx;
  const n = topLevel(f.state);
  const b = top(f.state);
  const x = blockLeft(f, n) + (side > 0 ? b.w * f.scale : 0);
  const y = blockTop(f, n);
  const gold = f.kit.tones.gold;
  const w = b.w * f.scale;
  const glow = 0.55 + 0.35 * Math.sin(f.t * 5);
  ctx.save();
  // A gold band inside the edge that will grow...
  ctx.save();
  roundRectPath(ctx, blockLeft(f, n), y, w, f.h, f.h * f.kit.radius);
  ctx.clip();
  const band = Math.min(w * 0.3, f.h * 0.9);
  const g = ctx.createLinearGradient(x, 0, x - side * band, 0);
  g.addColorStop(0, alpha(gold, 0.9 * glow));
  g.addColorStop(1, alpha(gold, 0));
  ctx.fillStyle = g;
  ctx.fillRect(side > 0 ? x - band : x, y, band, f.h);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x, y + f.h * 0.1);
  ctx.lineTo(x, y + f.h * 0.9);
  f.kit.beam(ctx, mix(gold, "#ffffff", 0.3 * glow), Math.max(2, f.h * 0.16));
  // ...and sparkles just outside it.
  for (let i = 0; i < 3; i++) {
    const phase = f.t * 3.4 + i * 2.1;
    const s = Math.sin(phase);
    if (s <= 0.08) continue;
    const cycle = Math.floor(phase / (Math.PI * 2));
    const gx = x + side * f.h * (0.25 + 0.5 * hash(cycle * 3 + i * 17));
    const gy = y + f.h * (0.05 + 0.9 * hash(cycle * 5 + i * 29 + 3));
    ctx.beginPath();
    sparklePath(ctx, gx, gy, f.h * 0.5 * s);
    f.kit.plate(ctx, mix(gold, "#ffffff", 0.5), gold, Math.max(1, f.h * 0.06));
  }
  ctx.restore();
}

/** Rail visibility from the forecast (hidden below 0.45 of the limit). */
const railAlpha = (f: Frame) => clamp01((f.st.forecastRatio - 0.45) / 0.3);

/**
 * The rail on the side the top can topple toward: a vertical laser about 3 blocks tall at
 * column ± limit. The top's center touching it means teeter. Amber in WOBBLY, red and
 * pulsing in DANGER, strobing in TEETER. A diamond on the top block's center shows how far
 * it has to go.
 */
export function drawRail(f: Frame): void {
  if (!playing(f) || !leanUi()) return;
  const a = railAlpha(f);
  if (a <= 0) return;
  const rail = railAt(f.state, f.st, f.fx.side);
  if (!rail) return;
  const ctx = f.ctx;
  const u = f.u;
  const x = f.sx(rail.x);
  const yTop = f.sy((rail.level + 2.6) * BLOCK_HEIGHT);
  const yBot = f.sy((rail.level - 0.6) * BLOCK_HEIGHT);
  const tier = f.fx.tier;
  // Pulse and strobe by color, not alpha, so the laser never goes muddy over the bars.
  let color = heat(f);
  if (tier === "danger") color = mix(color, "#ffffff", 0.45 * (0.5 + 0.5 * Math.cos(f.state.swayAngle * 2)));
  if (tier === "teeter") color = Math.floor(f.t * 14) % 2 ? "#ffffff" : f.kit.tones.danger;
  if (tier === "lastChance") color = Math.floor(f.t * 6) % 2 ? "#ffffff" : f.kit.tones.danger;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = alpha(color, 0.22);
  ctx.fillRect(x - u * 0.022, yTop, u * 0.044, yBot - yTop);
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBot);
  f.kit.beam(ctx, color, Math.max(3, u * 0.011));
  ctx.beginPath();
  ctx.moveTo(x, yTop + 2);
  ctx.lineTo(x, yBot - 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - u * 0.02, yTop);
  ctx.lineTo(x + u * 0.02, yTop);
  ctx.moveTo(x - u * 0.02, yBot);
  ctx.lineTo(x + u * 0.02, yBot);
  f.kit.beam(ctx, color, Math.max(2.5, u * 0.008));

  // Center marker on the top block: the thing that must not reach the rail.
  if (!isTipping(tier)) {
    const n = topLevel(f.state);
    const cx = blockLeft(f, n) + (top(f.state).w * f.scale) / 2;
    const cy = blockTop(f, n);
    const r = f.h * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.1);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r * 1.1);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    f.kit.plate(ctx, color, color, Math.max(1.2, f.h * 0.08));
    // Dotted reach from the center to the rail.
    ctx.setLineDash([f.h * 0.18, f.h * 0.22]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.sign(x - cx) * r * 1.4, cy);
    ctx.lineTo(x, cy);
    ctx.strokeStyle = alpha(color, 0.9);
    ctx.lineWidth = Math.max(1.5, f.h * 0.09);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Crack and sparks at the pivot seam: while teetering, and as the slab breaks off. */
export function drawCrack(f: Frame): void {
  const s = f.state;
  const tf = f.fx.topple;
  let amount: number;
  let side: number;
  let pivot: number;
  if (s.phase === "playing" && isTipping(f.fx.tier)) {
    amount = f.fx.tier === "teeter" ? f.st.teeter01 : 1;
    side = f.fx.side || 1;
    pivot = fallPivot(s);
  } else if (tf && tf.age < TOPPLE_FLASH + 0.35) {
    amount = 1;
    side = tf.dir;
    pivot = tf.pivot;
  } else return;
  const b = s.blocks[pivot];
  if (!b) return;
  const ctx = f.ctx;
  const seam = blockTop(f, pivot);
  const x0 = blockLeft(f, pivot);
  const w = b.w * f.scale;
  const xs = side > 0 ? x0 + w : x0;
  const len = w * (0.25 + 0.45 * amount);
  ctx.save();
  ctx.beginPath();
  for (let j = 0; j <= 6; j++) {
    const px = xs - side * len * (j / 6);
    const py = seam + (j % 2 ? 1 : -1) * f.h * 0.16 * (0.4 + hash(pivot * 11 + j));
    if (j === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  f.kit.beam(ctx, "#ffffff", Math.max(1.5, f.h * 0.11));
  const tick = Math.floor(f.t * 14);
  for (let j = 0; j < 4; j++) {
    const k = tick * 7 + j * 3;
    if (hash(k) < 0.45) continue;
    ctx.beginPath();
    sparklePath(ctx, xs - side * len * hash(k + 1), seam + (hash(k + 2) - 0.5) * f.h * 0.8, f.h * 0.28);
    f.kit.plate(ctx, mix(f.kit.tones.gold, "#ffffff", 0.4), f.kit.tones.gold, Math.max(1, f.h * 0.05));
  }
  ctx.restore();
}

/**
 * TEETER: a ring around the top block fills with teeter (red if armed, amber if not).
 * LAST CHANCE: it empties as a countdown, with the seconds in a badge on the light side.
 * The arc is centered on the ring's light-side point, so what's left always faces the screen
 * center (the heavy top often hangs off the screen edge).
 */
export function drawRing(f: Frame): void {
  const tier = f.fx.tier;
  if (!playing(f) || !isTipping(tier)) return;
  const ctx = f.ctx;
  const n = topLevel(f.state);
  const w = top(f.state).w * f.scale;
  const cx = blockLeft(f, n) + w / 2;
  const cy = blockTop(f, n) + f.h / 2;
  const rx = w / 2 + f.h * 0.8;
  const ry = f.h * 1.1;
  const lw = Math.max(3, f.h * 0.3);
  const t = f.kit.tones;
  const light = f.fx.side > 0 ? -1 : 1;
  const mid = light < 0 ? Math.PI : 0;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = alpha(f.kit.well, 0.5);
  ctx.lineWidth = lw * 1.5;
  ctx.stroke();
  let p: number;
  let color: string;
  if (tier === "teeter") {
    p = f.st.teeter01;
    color = f.st.armed ? t.danger : t.warn;
  } else {
    p = f.fx.lastChance?.left ?? 0;
    color = Math.floor(f.t * 5) % 2 ? t.danger : t.warn;
  }
  if (p > 0.005) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, mid - p * Math.PI, mid + p * Math.PI);
    ctx.lineCap = "round";
    f.kit.beam(ctx, color, lw);
  }
  if (tier === "lastChance") {
    const r = f.h * 0.95;
    const bx = Math.max(r + 6, Math.min(f.cssW - r - 6, cx + light * (rx + r * 1.1)));
    ctx.beginPath();
    circle(ctx, bx, cy, r);
    f.kit.plate(ctx, color, color, Math.max(1.5, f.h * 0.1));
    // Whole seconds left, from the latched countdown (never counts back up).
    const secs = Math.max(1, Math.ceil(p * LAST_CHANCE_TIME));
    const size = Math.round(r * 1.35);
    ctx.font = `700 ${size}px ${f.kit.body}`;
    ctx.textAlign = "center";
    f.kit.text(ctx, String(secs), bx, cy + size * 0.36, "#ffffff", Math.max(3, size * 0.16));
  }
  ctx.restore();
}

/** STEADY: brackets clamp onto the top block. */
export function drawLock(f: Frame): void {
  const lock = f.fx.lock;
  if (!lock) return;
  const b = f.state.blocks[lock.level];
  if (!b) return;
  const ctx = f.ctx;
  const k = lock.age;
  const close = easeOut(Math.min(1, k / (LOCK_CLOSE * LOCK_TIME)));
  const out = f.h * 1.6 * (1 - close) + f.h * 0.3;
  const x = blockLeft(f, lock.level);
  const w = b.w * f.scale;
  const y = blockTop(f, lock.level);
  const lip = f.h * 0.5;
  const y0 = y - f.h * 0.35;
  const y1 = y + f.h * 1.35;
  ctx.save();
  ctx.globalAlpha = clamp01((LOCK_TIME - k) / (LOCK_FADE * LOCK_TIME));
  ctx.beginPath();
  ctx.moveTo(x - out + lip, y0);
  ctx.lineTo(x - out, y0);
  ctx.lineTo(x - out, y1);
  ctx.lineTo(x - out + lip, y1);
  ctx.moveTo(x + w + out - lip, y0);
  ctx.lineTo(x + w + out, y0);
  ctx.lineTo(x + w + out, y1);
  ctx.lineTo(x + w + out - lip, y1);
  f.kit.beam(ctx, f.kit.tones.calm, Math.max(2, f.h * 0.2));
  ctx.restore();
}

/** Lean arrows: pop at the top toward where the lean moved, sized by the change. */
export function drawArrows(f: Frame): void {
  const ctx = f.ctx;
  for (const a of f.fx.arrows) {
    const b = f.state.blocks[a.level];
    if (!b) continue;
    const k = a.age;
    const grow = easeBack(k / (ARROW_GROW * ARROW_TIME));
    const fade = clamp01((ARROW_TIME - k) / (ARROW_FADE * ARROW_TIME));
    const len = f.u * (0.06 + 0.13 * Math.min(1, a.mag / 16)) * Math.max(0, grow);
    if (len <= 1) continue;
    const left = blockLeft(f, a.level);
    const edge = a.dir > 0 ? left + b.w * f.scale : left;
    const want = edge + a.dir * (f.h * 0.45 + len / 2 + k * f.h * 0.8);
    const x = Math.max(len / 2 + 6, Math.min(f.cssW - len / 2 - 6, want));
    const y = blockTop(f, a.level) + f.h / 2;
    const color = a.worse ? heat(f) : f.kit.tones.ok;
    ctx.save();
    ctx.globalAlpha = fade;
    arrowPath(ctx, x, y, len, f.h * 0.85, a.dir);
    f.kit.plate(ctx, color, color, Math.max(1.5, f.h * 0.1));
    ctx.restore();
  }
}

/** Gust telegraph in front of the tower: "GUST" chevrons upwind (warn), flecks off the top (blow). */
export function drawGust(f: Frame): void {
  const s = f.state;
  const g = s.gust;
  if (!playing(f) || g.phase === "idle") return;
  const ctx = f.ctx;
  const n = topLevel(s);
  const b = top(s);
  const left = blockLeft(f, n);
  const cx = left + (b.w * f.scale) / 2;
  const cy = blockTop(f, n) + f.h / 2;
  const dir = g.dir;
  const wind = f.kit.tones.wind;
  ctx.save();
  if (g.phase === "warn") {
    const k = g.t / GUST_WARN;
    const pop = easeBack(g.t / 0.2);
    ctx.globalAlpha = k > 0.85 ? clamp01((1 - k) / 0.15) : 1;
    const size = f.u * 0.055;
    const ax = Math.max(size * 2, Math.min(f.cssW - size * 2, cx - dir * f.u * 0.37));
    ctx.translate(ax, cy);
    ctx.scale(pop, pop);
    // Three chevrons pointing downwind; a highlight runs along them.
    for (let i = 0; i < 3; i++) {
      const lit = Math.floor(g.t * 7) % 3 === i;
      ctx.beginPath();
      chevronPath(ctx, (i - 1) * dir * size * 0.5, size * 0.1, size * 0.8, dir);
      f.kit.beam(ctx, lit ? "#ffffff" : wind, Math.max(2.5, size * 0.16));
    }
    // The word sits clear below the chevrons' stroked tips.
    const fs = Math.round(f.u * 0.042);
    ctx.font = `700 ${fs}px ${f.kit.body}`;
    ctx.textAlign = "center";
    f.kit.text(ctx, "GUST", 0, size * 1.4, "#ffffff", Math.max(3, fs * 0.2));
  } else {
    const k = g.amp > 0 ? Math.abs(gustPush(s)) / g.amp : 0;
    const edge = dir > 0 ? left + b.w * f.scale : left;
    const bars = f.skin.bars;
    const color = bars[n % bars.length]?.color ?? "#ffffff";
    for (let j = 0; j < 6; j++) {
      const p = (((g.t * 1.7 + hash(j * 7 + 1)) % 1) + 1) % 1;
      const px = edge + dir * p * f.u * 0.3;
      const py = blockTop(f, n) + f.h * (0.15 + 0.7 * hash(j * 7 + 2)) + p * p * f.h * 1.4;
      const r = f.h * 0.26 * (1 - p * 0.6);
      ctx.globalAlpha = k * (1 - p);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(dir * p * 5 + j);
      roundRectPath(ctx, -r, -r * 0.6, r * 2, r * 1.2, r * 0.3);
      f.kit.plate(ctx, color, color, Math.max(1, f.h * 0.05));
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Spark tones, and alpha steps: sparks are stroked in one path per (tone, step). */
const SPARK_TONES: readonly Tone[] = ["white", "warn", "danger", "gold", "ok", "calm", "accent"];
const SPARK_STEPS = 4;

/** Particle sparks (rail shatter, the topple break). */
export function drawSparks(f: Frame): void {
  const sparks = f.fx.sparks;
  if (sparks.length === 0) return;
  const ctx = f.ctx;
  const width = Math.max(1.4, 0.55 * f.scale);
  ctx.save();
  for (const tone of SPARK_TONES) {
    for (let q = 0; q < SPARK_STEPS; q++) {
      let any = false;
      ctx.beginPath();
      for (const s of sparks) {
        if (s.tone !== tone) continue;
        const k = s.age / s.life;
        if (Math.min(SPARK_STEPS - 1, Math.floor((1 - k * k) * SPARK_STEPS)) !== q) continue;
        const x = f.sx(s.x);
        const y = f.sy(s.y);
        ctx.moveTo(x, y);
        ctx.lineTo(x - s.vx * f.scale * 0.035, y + s.vy * f.scale * 0.035);
        any = true;
      }
      if (!any) continue;
      ctx.globalAlpha = (q + 1) / SPARK_STEPS;
      f.kit.beam(ctx, toneColor(f, tone), width);
    }
  }
  ctx.restore();
}

/**
 * Which side of its block a line-1 pop prefers: its own side if it has one, else the side
 * without a fresh lean arrow or the rail on it, then the one with more room.
 */
function besideSide(f: Frame, p: Pop, left: number, right: number): -1 | 1 {
  if (p.side !== 0) return p.side;
  const cost = (s: -1 | 1) =>
    (f.fx.arrows.some((a) => a.level === p.level && a.dir === s) ? 2 : 0) +
    (f.fx.side === s && railAlpha(f) > 0 ? 1 : 0);
  const cl = cost(-1);
  const cr = cost(1);
  if (cl !== cr) return cl < cr ? -1 : 1;
  return left >= f.cssW - right ? -1 : 1;
}

/**
 * Word pops riding on a block. Line 0 (PERFECT, HOLD ON!, SAVED!) is centered just above the
 * slider row and rises, but never into the HUD. Line 1 (STEADY, REBUILT, WHOA!) sits beside
 * the block, so the lock ring, sweep and glints it describes stay in view; it shrinks to fit,
 * tries the other side, and only with no room on either goes just under the main line.
 */
export function drawPops(f: Frame): void {
  const ctx = f.ctx;
  for (const p of f.fx.pops) {
    if (p.age < 0) continue;
    const b = f.state.blocks[p.level];
    if (!b) continue;
    const k = p.age / p.life;
    const full = Math.round(f.u * p.size);
    const font = (px: number) => `400 ${px}px ${f.skin.hud.display}`;
    ctx.save();
    ctx.font = font(full);
    ctx.textAlign = "center";
    const fullW = ctx.measureText(p.text).width;
    const left = blockLeft(f, p.level);
    const right = left + b.w * f.scale;
    const top = blockTop(f, p.level);
    let size = full;
    let x = NaN;
    let y = NaN;
    if (p.line === 1) {
      const gap = f.h * BESIDE_GAP;
      const first = besideSide(f, p, left, right);
      for (const side of p.side !== 0 ? [first] : [first, -first as -1 | 1]) {
        const room = side > 0 ? f.cssW - EDGE - right - gap : left - gap - EDGE;
        const fit = fullW > room ? Math.floor((full * room) / fullW) : full;
        if (fit < f.u * BESIDE_MIN) continue;
        size = fit;
        const tw = (fullW * size) / full;
        x = side > 0 ? right + gap + tw / 2 : left - gap - tw / 2;
        y = top + f.h * 0.5 + size * 0.36 - k * f.h * 0.6;
        break;
      }
    }
    if (Number.isNaN(y)) {
      // Main line: above the slider row, rising, kept under the HUD. A line-1 pop with no room
      // beside the block goes one line under it.
      size = full;
      const under = p.line === 1 ? size * 1.1 : 0;
      x = Math.max(fullW / 2 + EDGE, Math.min(f.cssW - fullW / 2 - EDGE, (left + right) / 2));
      y = Math.max(top - f.h * 1.4 - k * f.h * 2, f.hudBottom + size * 0.85) + under;
    }
    ctx.font = font(size);
    const sc = easeBack(p.age / 0.16);
    ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4) ** 2;
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    f.kit.text(ctx, p.text, 0, 0, toneColor(f, p.tone), Math.max(3, size * 0.13));
    ctx.restore();
  }
}

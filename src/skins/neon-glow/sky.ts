import { alpha, circle, hash, mix, neonStroke, roundRectPath, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { dripPath, splatPath } from "./booth";
import { beats, CYAN, GREEN, PINK, pulse, UV, WHITE } from "./common";
import { emitter } from "./far";
import { twinkle } from "./icons";

// Above the party: a mirror ball hanging top-left (clear of the HUD), a blacklight tube
// fixture top-right washing the hall in UV, slow mirror-ball specks drifting across the dark,
// and laser fans sweeping up from the light towers at the sides, flaring on the beat.

const TAU = Math.PI * 2;
const SIDES = [-1, 1] as const;

/** Facets on the ball: latitude, longitude, and a seed for which ones flash on a beat. */
const FACETS = Array.from({ length: 26 }, (_, i) => ({
  lat: (hash(i + 700) - 0.5) * 2.4,
  lon: hash(i + 720) * TAU,
}));

/** Mirror-ball specks scattered over the hall, drifting sideways as the ball turns. */
const SPECKS = Array.from({ length: 22 }, (_, i) => ({
  x: hash(i + 800),
  y: 0.04 + hash(i + 820) * 0.5,
  r: 0.0035 + hash(i + 840) * 0.004,
  speed: 0.012 + hash(i + 860) * 0.01,
  tw: hash(i + 880) * TAU,
}));

const BALL = { x: 0, y: 0, r: 0 };

/** Where the ball hangs: top-left, clear of the HUD (written into BALL, no allocation). */
function ballCenter(s: Scene): { x: number; y: number; r: number } {
  BALL.r = s.u * 0.056;
  BALL.x = s.cssW / 2 - s.u * 0.37;
  BALL.y = s.cssH * 0.262;
  return BALL;
}

/** The mirror ball, hanging top-left: in front of the lasers that sweep past it. */
function mirrorBall(ctx: Ctx, s: Scene): void {
  const { x, y, r } = ballCenter(s);
  const u = s.u;
  const spin = s.t * 0.55;
  const p = pulse(s.t, 4);

  // Cable and cap.
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y - r * 1.08);
  ctx.strokeStyle = "#3a2470";
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();
  roundRectPath(ctx, x - r * 0.16, y - r * 1.16, r * 0.32, r * 0.2, r * 0.05);
  ctx.fillStyle = "#2a1850";
  ctx.fill();

  // Soft UV halo, faint so it never competes with the bars.
  const halo = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 2.6);
  halo.addColorStop(0, alpha(UV, 0.22 + p * 0.08));
  halo.addColorStop(1, alpha(UV, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);

  // Ball body.
  ctx.beginPath();
  circle(ctx, x, y, r);
  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  body.addColorStop(0, "#4a3a7a");
  body.addColorStop(0.55, "#22164a");
  body.addColorStop(1, "#120a2c");
  ctx.fillStyle = body;
  ctx.fill();
  // Facet grid: latitude chords and turning meridians, all inside the disc (no clip needed).
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const dy = Math.sin((i / 4) * (Math.PI / 2)) * r;
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    ctx.moveTo(x - half, y + dy);
    ctx.lineTo(x + half, y + dy);
  }
  for (let k = 0; k < 6; k++) {
    const a = ((k / 6) * Math.PI + spin) % Math.PI;
    const rx = Math.abs(Math.cos(a)) * r;
    ctx.moveTo(x + rx, y);
    ctx.ellipse(x, y, Math.max(0.5, rx), r, 0, 0, TAU);
  }
  ctx.strokeStyle = "rgba(190, 170, 255, 0.28)";
  ctx.lineWidth = Math.max(0.8, u * 0.0018);
  ctx.stroke();

  // Facets catching the light: a different handful flashes on every beat.
  const beat = Math.floor(beats(s.t));
  const f = r * 0.15;
  ctx.beginPath();
  for (let i = 0; i < FACETS.length; i++) {
    const fc = FACETS[i]!;
    const lon = fc.lon + spin;
    if (Math.cos(lon) < 0.15) continue;
    if (hash(beat * 31 + i * 7) < 0.55) continue;
    const fx = x + Math.cos(fc.lat) * Math.sin(lon) * r;
    const fy = y + Math.sin(fc.lat) * r * 0.85;
    ctx.rect(fx - f / 2, fy - f / 2, f, f);
  }
  ctx.fillStyle = alpha(WHITE, 0.55 + p * 0.4);
  ctx.fill();

  ctx.beginPath();
  circle(ctx, x, y, r);
  neonStroke(ctx, "#cdb8ff", Math.max(1, u * 0.0028), 2.4);

  // Glint on the beat.
  const g = r * (0.32 + p * 0.3);
  const gx = x - r * 0.42;
  const gy = y - r * 0.45;
  ctx.beginPath();
  twinkle(ctx, gx, gy, g, 0.6);
  ctx.fillStyle = alpha(WHITE, 0.6 + p * 0.4);
  ctx.fill();
}

/** A blacklight tube fixture hanging top-right, its UV wash spilling down. */
function blacklight(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x0 = s.cssW / 2 + u * 0.315;
  const x1 = s.cssW / 2 + u * 0.47;
  const y = s.cssH * 0.042;
  const h = u * 0.026;
  const flick = 0.85 + 0.15 * Math.sin(s.t * 31) * Math.sin(s.t * 7.3);

  // Wash.
  const wash = ctx.createLinearGradient(0, y, 0, y + u * 0.32);
  wash.addColorStop(0, alpha(UV, 0.16 * flick));
  wash.addColorStop(1, alpha(UV, 0));
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.01, y);
  ctx.lineTo(x1 - u * 0.01, y);
  ctx.lineTo(x1 + u * 0.06, y + u * 0.32);
  ctx.lineTo(x0 - u * 0.06, y + u * 0.32);
  ctx.closePath();
  ctx.fill();

  // Chains.
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.02, 0);
  ctx.lineTo(x0 + u * 0.02, y - h * 0.5);
  ctx.moveTo(x1 - u * 0.02, 0);
  ctx.lineTo(x1 - u * 0.02, y - h * 0.5);
  ctx.strokeStyle = "#3a2470";
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.stroke();

  // Housing, then the glowing tube in front of it.
  roundRectPath(ctx, x0, y - h * 0.5, x1 - x0, h * 0.55, h * 0.2);
  ctx.fillStyle = "#1c0f3a";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + h * 0.4, y + h * 0.15);
  ctx.lineTo(x1 - h * 0.4, y + h * 0.15);
  neonStroke(ctx, mix(UV, "#ffffff", 0.15 * flick), Math.max(1.6, u * 0.0075), 2.6);
}

/** Mirror-ball specks drifting across the hall (dim; they fade out over the HUD). */
function specks(ctx: Ctx, s: Scene): void {
  const top = s.horizonY - s.u * 0.06;
  ctx.beginPath();
  for (const sp of SPECKS) {
    const y = sp.y * s.cssH;
    if (y > top) continue;
    const x = ((sp.x + s.t * sp.speed) % 1) * s.cssW;
    const hud = y < s.cssH * 0.32 && Math.abs(x - s.cssW / 2) < s.u * 0.32;
    if (hud || Math.sin(s.t * 2.2 + sp.tw) < -0.2) continue;
    circle(ctx, x, y, sp.r * s.u);
  }
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Distance along a ray from (ox, oy) in direction (dx, dy) to where it enters a top-anchored rect. */
function rectEntry(ox: number, oy: number, dx: number, dy: number, x0: number, x1: number, y1: number): number {
  let tMin = -Infinity;
  let tMax = Infinity;
  if (Math.abs(dx) < 1e-6) {
    if (ox < x0 || ox > x1) return Infinity;
  } else {
    const a = (x0 - ox) / dx;
    const b = (x1 - ox) / dx;
    tMin = Math.max(tMin, Math.min(a, b));
    tMax = Math.min(tMax, Math.max(a, b));
  }
  if (Math.abs(dy) < 1e-6) {
    if (oy > y1) return Infinity;
  } else {
    const a = -oy / dy;
    const b = (y1 - oy) / dy;
    tMin = Math.max(tMin, Math.min(a, b));
    tMax = Math.min(tMax, Math.max(a, b));
  }
  return tMin < tMax && tMax > 0 ? Math.max(0, tMin) : Infinity;
}

/**
 * Where a beam first runs into the HUD: the top-center zone, or the wide title/score band.
 * Measured in u around the center (on a phone that is 0.2..0.8 and 0.05..0.95 of the width),
 * so on a wide screen the beams still show out at the sides.
 */
function hudEntry(s: Scene, ox: number, oy: number, dx: number, dy: number): number {
  const cx = s.cssW / 2;
  return Math.min(
    rectEntry(ox, oy, dx, dy, cx - s.u * 0.3, cx + s.u * 0.3, s.cssH * 0.32),
    rectEntry(ox, oy, dx, dy, cx - s.u * 0.45, cx + s.u * 0.45, s.cssH * 0.17),
  );
}

/** Add one beam to the current path: a thin wedge spreading from the emitter. */
function wedge(ctx: Ctx, ox: number, oy: number, dx: number, dy: number, len: number, w0: number, w1: number): void {
  const ex = ox + dx * len;
  const ey = oy + dy * len;
  ctx.moveTo(ox - dy * w0, oy + dx * w0);
  ctx.lineTo(ex - dy * w1, ey + dx * w1);
  ctx.lineTo(ex + dy * w1, ey - dx * w1);
  ctx.lineTo(ox + dy * w0, oy - dx * w0);
  ctx.closePath();
}

/** Beams per fan, the angle between them, and how far each fan sweeps (rad from vertical, + = inward). */
const FANS = [
  { beams: 3, spread: 0.13, mid: -0.12, swing: 0.32, rate: 0.9 },
  { beams: 3, spread: 0.08, mid: 1.38, swing: 0.2, rate: 0.6 },
] as const;

/**
 * Laser fans from the two light towers: one sweeping up the walls, one raking low across the
 * hall over the crowd; they trade intensity every musical phrase and flare on the beat. Beams
 * fade with distance and dim out before they could cross the HUD zone.
 */
function lasers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const p = pulse(s.t, 2.5);
  const len = u * 0.85;
  const phrase = 0.5 + 0.5 * Math.sin((beats(s.t) / 16) * Math.PI);
  for (const side of SIDES) {
    const o = emitter(s, side);
    if (o.y > s.cssH + u * 0.1) continue;
    const color = side < 0 ? GREEN : PINK;
    const fade = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, len);
    fade.addColorStop(0, alpha(color, 0.95));
    fade.addColorStop(0.35, alpha(color, 0.42));
    fade.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = fade;
    const w0 = Math.max(0.5, u * 0.0012);
    const w1 = u * 0.0055;
    for (let f = 0; f < FANS.length; f++) {
      const fan = FANS[f]!;
      const level = (0.3 + 0.7 * (f === 0 ? phrase : 1 - phrase)) * (0.7 + p * 0.3);
      const sweep = fan.mid + fan.swing * Math.sin(s.t * fan.rate + (side < 0 ? 0 : 2.1) + f * 1.3);
      // Beams clear of the HUD go out in one batch; the few that near it fade out one by one.
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 0) ctx.beginPath();
        let batched = 0;
        for (let i = 0; i < fan.beams; i++) {
          const a = sweep + (i - (fan.beams - 1) / 2) * fan.spread;
          const dx = -side * Math.sin(a);
          const dy = -Math.cos(a);
          const v = Math.min(1, Math.max(0, (hudEntry(s, o.x, o.y, dx, dy) / len - 0.35) / 0.4));
          if (v < 0.03 || (pass === 0) !== v >= 1) continue;
          if (pass === 1) ctx.beginPath();
          wedge(ctx, o.x, o.y, dx, dy, len, w0, w1);
          if (pass === 1) {
            ctx.globalAlpha = level * v;
            ctx.fill();
          } else batched++;
        }
        if (pass === 0 && batched > 0) {
          ctx.globalAlpha = level;
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Glow paint thrown on the hall's back wall, dripping, out at the sides. H is height above the
 * horizon, in u. The paint is dim but keeps its hue: a pigment darkened toward black, not a
 * see-through wash (dim yellow and green over the violet wall read as olive mud).
 */
const WALL = [
  { X: -0.34, H: 0.3, r: 0.046, color: mix(PINK, "#000000", 0.6), seed: 2 },
  { X: -0.3, H: 0.18, r: 0.022, color: mix(CYAN, "#000000", 0.62), seed: 3 },
  { X: 0.35, H: 0.22, r: 0.044, color: mix(GREEN, "#000000", 0.64), seed: 5 },
  { X: 0.4, H: 0.48, r: 0.026, color: mix(UV, "#000000", 0.45), seed: 6 },
] as const;

/**
 * The back wall of the hall (drawn in place of the base sun): glow paint thrown on it. It
 * stands at the horizon's depth, so it drifts down with the horizon as the camera climbs.
 */
export function wallPaint(ctx: Ctx, s: Scene): void {
  const u = s.u;
  for (const w of WALL) {
    const x = s.cssW / 2 + w.X * u;
    const y = s.horizonY - w.H * u;
    const r = w.r * u;
    if (y - r * 1.5 > s.cssH) continue;
    ctx.beginPath();
    splatPath(ctx, x, y, r, w.seed);
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * r * 0.45 + r * 0.1 * w.seed;
      const run = r * (1.2 + hash(w.seed * 7 + i) * 1.6) * (0.9 + 0.1 * Math.sin(s.t * 0.4 + i + w.seed));
      const dw = r * (0.12 + hash(w.seed * 3 + i) * 0.08);
      dripPath(ctx, x + dx, y, dw * 2, y + run);
    }
    ctx.fillStyle = w.color;
    ctx.fill();
  }
}

/** UV-reactive bubbles drifting up from the crowd. */
const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  x: 0.03 + hash(i + 1000) * 0.94,
  speed: 0.03 + hash(i + 1010) * 0.03,
  r: 0.007 + hash(i + 1020) * 0.009,
  phase: hash(i + 1030),
  color: i % 3,
}));
const BUBBLE_COLORS = [CYAN, PINK, GREEN] as const;

function bubbles(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const span = s.horizonY + u * 0.05;
  if (span <= 0) return;
  for (let c = 0; c < BUBBLE_COLORS.length; c++) {
    ctx.beginPath();
    for (const b of BUBBLES) {
      if (b.color !== c) continue;
      const y = s.horizonY - ((s.t * b.speed + b.phase) % 1) * span;
      const x = b.x * s.cssW + Math.sin(s.t * 1.1 + b.phase * 9) * u * 0.012;
      if (y < s.cssH * 0.34 && Math.abs(x - s.cssW / 2) < u * 0.33) continue;
      circle(ctx, x, y, b.r * u);
    }
    ctx.strokeStyle = BUBBLE_COLORS[c]!;
    ctx.lineWidth = Math.max(1, u * 0.0022);
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Everything in the sky layer, back to front. */
export function partySky(ctx: Ctx, s: Scene): void {
  specks(ctx, s);
  blacklight(ctx, s);
  lasers(ctx, s);
  bubbles(ctx, s);
  mirrorBall(ctx, s);
}

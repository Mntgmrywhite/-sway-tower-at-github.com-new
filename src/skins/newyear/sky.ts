import { alpha, circle, hash, mix, neonStroke, type Ctx } from "../../neon/draw";
import { altitude01 } from "../../neon/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, clamp01, GOLD, MAGENTA, PARTY, TAU, VIOLET } from "./colors";

// Sky for New Year's: a giant mirror ball setting on the horizon where the retro sun would
// be, neon fireworks that come faster the higher you climb, and the odd confetti shower.

/* ---------------------------------------------------------------- mirror ball */

const BALL_ROWS = 16;

/** Scratch lists of tiles (x, y, w, h) by shade, reused every frame. */
const TILE_DARK: number[] = [];
const TILE_LIGHT: number[] = [];
const TILE_FLASH: number[] = [];

function fillTiles(ctx: Ctx, list: number[], gap: number, style: string): void {
  if (!list.length) return;
  ctx.beginPath();
  for (let k = 0; k < list.length; k += 4) {
    ctx.rect(list[k]! + gap / 2, list[k + 1]! + gap / 2, list[k + 2]! - gap, list[k + 3]! - gap);
  }
  ctx.fillStyle = style;
  ctx.fill();
}

/** The mirror ball sits on the horizon like the synthwave sun, spinning slowly. */
export function mirrorBall(ctx: Ctx, s: Scene): void {
  const r = s.u * 0.2;
  const cx = s.cssW / 2;
  const cy = s.horizonY - r * 0.82;
  if (cy - r > s.cssH) return;

  // Halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.4);
  halo.addColorStop(0, alpha(MAGENTA, 0.34));
  halo.addColorStop(0.45, alpha(VIOLET, 0.12));
  halo.addColorStop(1, alpha(VIOLET, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = "#14061f"; // grout between the mirrors
  ctx.fill();
  ctx.clip();

  // Mirror tiles: rows of latitude, columns of longitude scrolling as it spins.
  const spin = s.t * 0.22;
  const gap = Math.max(0.7, r * 0.022);
  const tiles = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  tiles.addColorStop(0, "#fff3c4");
  tiles.addColorStop(0.3, GOLD);
  tiles.addColorStop(0.62, MAGENTA);
  tiles.addColorStop(1, "#4a0f66");
  const flashT = Math.floor(s.t * 5);
  TILE_DARK.length = 0;
  TILE_LIGHT.length = 0;
  TILE_FLASH.length = 0;
  ctx.beginPath();
  for (let i = 0; i < BALL_ROWS; i++) {
    const p0 = -Math.PI / 2 + (i / BALL_ROWS) * Math.PI;
    const p1 = -Math.PI / 2 + ((i + 1) / BALL_ROWS) * Math.PI;
    const y0 = cy + Math.sin(p0) * r;
    const y1 = cy + Math.sin(p1) * r;
    if (y0 > s.horizonY) break; // hidden behind the floor
    const ring = Math.cos((p0 + p1) / 2);
    const cols = Math.max(4, Math.round(BALL_ROWS * 2 * ring));
    const step = TAU / cols;
    const shift = spin % step;
    const base = Math.floor(spin / step);
    for (let j = 0; j <= cols / 2 + 1; j++) {
      const l0 = Math.max(-Math.PI / 2, -Math.PI / 2 + (j - 1) * step + shift);
      const l1 = Math.min(Math.PI / 2, -Math.PI / 2 + j * step + shift);
      if (l1 <= l0) continue;
      const x0 = cx + Math.sin(l0) * r * ring;
      const x1 = cx + Math.sin(l1) * r * ring;
      if (x1 - x0 < gap * 1.5) continue;
      ctx.rect(x0 + gap / 2, y0 + gap / 2, x1 - x0 - gap, y1 - y0 - gap);
      const id = i * 61 + ((((j - base) % cols) + cols) % cols);
      const tone = hash(id * 3.17 + 0.5);
      if (hash(id * 7.3 + flashT * 0.731 + Math.floor(tone * 9)) > 0.9) TILE_FLASH.push(x0, y0, x1 - x0, y1 - y0);
      else if (tone < 0.3) TILE_DARK.push(x0, y0, x1 - x0, y1 - y0);
      else if (tone > 0.8) TILE_LIGHT.push(x0, y0, x1 - x0, y1 - y0);
    }
  }
  ctx.fillStyle = tiles;
  ctx.fill();
  fillTiles(ctx, TILE_DARK, gap, "rgba(30, 0, 50, 0.42)");
  fillTiles(ctx, TILE_LIGHT, gap, "rgba(255, 240, 255, 0.3)");
  fillTiles(ctx, TILE_FLASH, gap, "rgba(255, 255, 255, 0.9)");

  // Sphere shading: lit from the upper left, dark toward the rim.
  const shade = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.2, cy - r * 0.2, r * 1.35);
  shade.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  shade.addColorStop(0.35, "rgba(255, 255, 255, 0)");
  shade.addColorStop(0.8, "rgba(12, 0, 24, 0.45)");
  shade.addColorStop(1, "rgba(12, 0, 24, 0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // Neon rim
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  neonStroke(ctx, mix(GOLD, MAGENTA, 0.45), Math.max(1.4, s.u * 0.005), 3);

  // Reflections: specks of light thrown into the sky, turning with the ball.
  const hudBottom = s.cssH * 0.32;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (const sp of SPECKS) {
      if ((sp.c === 0) !== (pass === 0)) continue;
      const ang = sp.a + spin * 1.6;
      const x = cx + Math.cos(ang) * sp.d * r;
      const y = cy + Math.sin(ang) * sp.d * r * 0.7;
      if (y > s.horizonY - r * 0.1) continue;
      if (y < hudBottom && x > s.cssW * 0.2 && x < s.cssW * 0.8) continue;
      const tw = 0.5 + 0.5 * Math.sin(s.t * 3 + sp.a * 7);
      circle(ctx, x, y, sp.size * r * (0.6 + 0.4 * tw));
    }
    ctx.fillStyle = pass === 0 ? "rgba(255, 246, 220, 0.7)" : alpha(MAGENTA, 0.65);
    ctx.fill();
  }

  // Glints popping on the surface
  ctx.beginPath();
  for (let g = 0; g < 4; g++) {
    const period = 1.3 + g * 0.45;
    const cyc = Math.floor((s.t + g * 0.9) / period);
    const k = ((s.t + g * 0.9) % period) / period;
    if (k > 0.4) continue;
    const env = Math.sin((k / 0.4) * Math.PI);
    const a = hash(cyc * 3 + g * 17) * TAU;
    const d = Math.sqrt(hash(cyc * 5 + g * 11)) * r * 0.75;
    const gx = cx + Math.cos(a) * d;
    const gy = cy - Math.abs(Math.sin(a)) * d; // upper half, above the skyline
    const gl = r * 0.2 * env;
    const gw = gl * 0.16;
    // Four-point star: long vertical, shorter horizontal, pinched waist.
    ctx.moveTo(gx, gy - gl * 1.3);
    ctx.lineTo(gx + gw, gy - gw);
    ctx.lineTo(gx + gl, gy);
    ctx.lineTo(gx + gw, gy + gw);
    ctx.lineTo(gx, gy + gl * 1.3);
    ctx.lineTo(gx - gw, gy + gw);
    ctx.lineTo(gx - gl, gy);
    ctx.lineTo(gx - gw, gy - gw);
    ctx.closePath();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();
}

const SPECKS = Array.from({ length: 26 }, (_, i) => ({
  a: hash(i * 4.1 + 600) * TAU,
  d: 1.2 + hash(i * 4.1 + 601) * 1.1,
  size: 0.016 + hash(i * 4.1 + 602) * 0.018,
  c: i % 3 === 0 ? 1 : 0,
}));

/* ---------------------------------------------------------------- fireworks */

interface Slot {
  period: number;
  offset: number;
  /** altitude01 at which this launcher joins in. */
  need: number;
}

const SLOTS: Slot[] = Array.from({ length: 11 }, (_, i) => {
  const period = 3.1 + hash(i * 5.31 + 1) * 1.6;
  // Golden-ratio stagger so launchers never all rest at once.
  return { period, offset: ((i * 0.618034) % 1) * period + hash(i * 5.31 + 2) * 0.4, need: i < 3 ? -1 : 0.08 + ((i - 3) / 8) * 0.8 };
});

const SPARKS = 28;
/** Unit direction and speed jitter for each spark. */
const SPARK = Array.from({ length: SPARKS }, (_, j) => {
  const a = (j / SPARKS) * TAU + (hash(j + 7) - 0.5) * 0.12;
  return { dx: Math.cos(a), dy: Math.sin(a), sp: 0.82 + hash(j + 41) * 0.3 };
});
/** Spark head positions for the burst being drawn. */
const HEADS = new Float32Array(SPARKS * 2);

const LAUNCH = 0.7; // seconds the rocket climbs
const BLOOM = 2.1; // seconds the burst lasts

function cubicOut(x: number): number {
  const k = 1 - x;
  return 1 - k * k * k;
}

function fireworks(ctx: Ctx, s: Scene): void {
  const a = altitude01(s);
  const hudBottom = s.cssH * 0.32;
  const top = s.cssH * 0.05;
  const bottom = s.horizonY - s.u * 0.26;
  const w = Math.max(1, s.u * 0.0042);

  for (const [i, slot] of SLOTS.entries()) {
    const on = clamp01((a - slot.need) / 0.1);
    if (on <= 0) continue;
    const tt = s.t + slot.offset;
    const cycle = Math.floor(tt / slot.period);
    const local = tt - cycle * slot.period;
    if (local > LAUNCH + BLOOM) continue;
    const seed = i * 101 + cycle * 13;

    // Where it bursts: mostly beside the tower, sometimes above it (never into the title).
    const R0 = s.u * (0.1 + hash(seed + 3) * 0.07 + a * 0.03);
    // Once the tower fills the middle of the screen, keep the show to either side of it.
    const side = hash(seed + 1);
    const mid = 0.2 * (1 - a * 0.6);
    const half = (1 - mid) / 2;
    const fx =
      side < half
        ? 0.04 + (side / half) * 0.26
        : side < half * 2
          ? 0.96 - ((side - half) / half) * 0.26
          : 0.34 + ((side - half * 2) / mid) * 0.32;
    const bx0 = fx * s.cssW;
    const central = bx0 > s.cssW * 0.2 && bx0 < s.cssW * 0.8;
    const lo = central ? Math.max(top, hudBottom + R0 * 0.6) : top + R0 * 0.5;
    const hi = Math.max(lo, bottom - R0 * 0.4);
    let by = lo + hash(seed + 2) * (hi - lo);
    let R = R0;
    let bx = bx0;
    if (!central && by < hudBottom) {
      // Up beside the title: a smaller, more distant burst, nudged toward the edge.
      R *= 0.72;
      bx = bx < s.cssW / 2 ? Math.min(bx, s.cssW * 0.2 - R * 0.55) : Math.max(bx, s.cssW * 0.8 + R * 0.55);
      by = Math.max(by, top + R * 0.6);
    }
    // Dim anything that still reaches into the score/title zone.
    const nx = Math.max(s.cssW * 0.2, Math.min(s.cssW * 0.8, bx));
    const ny = Math.min(hudBottom, by);
    const reach = Math.hypot(bx - nx, by - ny) / R;
    const dim = reach >= 1 ? 1 : 0.3 + 0.7 * reach * reach;

    const ci = Math.floor(hash(seed + 4) * PARTY.length);
    const c1 = PARTY[ci]!;
    const c2 = PARTY[(ci + 2) % PARTY.length]!;
    const style = hash(seed + 5); // < 0.45 peony, < 0.75 willow, else ring

    if (local < LAUNCH) {
      // Rocket: a hot streak climbing from behind the skyline.
      const k = local / LAUNCH;
      const sx = bx + (hash(seed + 6) - 0.5) * s.u * 0.12;
      const e = cubicOut(k);
      const et = cubicOut(Math.max(0, k - 0.045));
      const y0 = s.horizonY;
      const hx = sx + (bx - sx) * e;
      const hy = y0 + (by - y0) * e;
      ctx.globalAlpha = on * dim * 0.9;
      ctx.beginPath();
      ctx.moveTo(sx + (bx - sx) * et, y0 + (by - y0) * et);
      ctx.lineTo(hx, hy);
      neonStroke(ctx, GOLD, w * 0.8, 2.6);
      ctx.beginPath();
      circle(ctx, hx, hy, w * 1.1);
      ctx.fillStyle = CHAMPAGNE;
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    const k = (local - LAUNCH) / BLOOM; // 0 → 1
    const willow = style >= 0.45 && style < 0.75;
    const ring = style >= 0.75;
    const e = cubicOut(Math.min(1, k * 1.15));
    const trail = willow ? 0.42 : ring ? 0.09 : 0.16;
    const kt = Math.max(0, k - trail);
    const et = cubicOut(Math.min(1, kt * 1.15));
    const g = R * (willow ? 0.75 : 0.4);
    const droop = g * k * k;
    const droopT = g * kt * kt;
    const fade = (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4) * on * dim;
    const squash = ring ? 0.55 + hash(seed + 8) * 0.25 : 1;
    const tilt = ring ? (hash(seed + 9) - 0.5) * 0.9 : 0;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);

    // Flash of light at the moment it bursts
    if (k < 0.3) {
      const fr = R * (0.35 + e * 0.75);
      const flash = ctx.createRadialGradient(bx, by, 0, bx, by, fr);
      flash.addColorStop(0, alpha(mix(c1, "#ffffff", 0.5), 0.4));
      flash.addColorStop(1, alpha(c1, 0));
      ctx.globalAlpha = (1 - k / 0.3) * on * dim;
      ctx.fillStyle = flash;
      ctx.fillRect(bx - fr, by - fr, fr * 2, fr * 2);
    }

    // Trails
    ctx.globalAlpha = fade;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const p = SPARK[j]!;
      const sp = ring ? 1 : p.sp;
      const ux = p.dx * sp;
      const uy = p.dy * sp * squash;
      const rx = ux * ct - uy * st;
      const ry = ux * st + uy * ct;
      const hx = bx + rx * R * e;
      const hy = by + ry * R * e + droop;
      HEADS[j * 2] = hx;
      HEADS[j * 2 + 1] = hy;
      ctx.moveTo(bx + rx * R * et, by + ry * R * et + droopT);
      ctx.lineTo(hx, hy);
    }
    const tint = willow ? mix(c1, GOLD, Math.min(1, k * 1.4)) : c1;
    neonStroke(ctx, tint, w, 2.6);

    // Inner two-tone ring on peonies
    if (!willow && !ring && k < 0.8) {
      ctx.beginPath();
      for (let j = 0; j < SPARKS; j += 2) {
        const p = SPARK[j]!;
        const r1 = R * e * 0.5;
        const r0 = R * cubicOut(Math.max(0, kt)) * 0.5;
        ctx.moveTo(bx + p.dx * r0, by + p.dy * r0 + droopT * 0.6);
        ctx.lineTo(bx + p.dx * r1, by + p.dy * r1 + droop * 0.6);
      }
      neonStroke(ctx, c2, w * 0.85, 2.4);
    }

    // Hot heads; late in the burst they crackle on and off.
    const crackle = k > 0.5;
    const tick = Math.floor(s.t * 16);
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      if (crackle && hash(j * 13 + tick + seed) < 0.45) continue;
      circle(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]!, w * (crackle ? 1.1 : 0.85));
    }
    ctx.fillStyle = mix(tint, "#ffffff", 0.7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* ---------------------------------------------------------------- confetti showers */

const SHOWER = 15; // seconds between showers
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  x: hash(i * 3.7 + 11),
  delay: hash(i * 3.7 + 12) * 3.5,
  speed: 0.2 + hash(i * 3.7 + 13) * 0.12, // u per second
  sway: 0.015 + hash(i * 3.7 + 14) * 0.03,
  spin: 3 + hash(i * 3.7 + 15) * 5,
  size: 0.008 + hash(i * 3.7 + 16) * 0.006,
  color: i % PARTY.length,
}));

const STREAMERS = Array.from({ length: 4 }, (_, i) => ({
  x: i % 2 ? 0.88 + hash(i + 70) * 0.08 : 0.04 + hash(i + 70) * 0.08,
  delay: 0.5 + hash(i + 80) * 4,
  speed: 0.16 + hash(i + 90) * 0.06,
  color: PARTY[(i * 2) % PARTY.length]!,
  len: 0.1 + hash(i + 100) * 0.07,
  amp: 0.01 + hash(i + 110) * 0.007,
  loops: 2.4 + hash(i + 120) * 1.4,
}));

function confettiShower(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const floorY = s.horizonY - u * 0.02;
  const hudBottom = s.cssH * 0.32;
  for (let pass = 0; pass < 2; pass++) {
    // pass 0: everything outside the HUD zone at full strength; pass 1: inside it, dimmed.
    for (let c = 0; c < PARTY.length; c++) {
      ctx.beginPath();
      let any = false;
      for (const [i, p] of CONFETTI.entries()) {
        if (p.color !== c) continue;
        const local = (((s.t - p.delay) % SHOWER) + SHOWER) % SHOWER;
        const y = -u * 0.03 + local * p.speed * u;
        if (y > floorY) continue;
        const x = p.x * s.cssW + Math.sin(s.t * 1.7 + i) * p.sway * u;
        const inHud = y < hudBottom && x > s.cssW * 0.2 && x < s.cssW * 0.8;
        if (inHud !== (pass === 1)) continue;
        const flip = Math.cos(s.t * p.spin + i);
        const pw = p.size * u * Math.abs(flip) + 0.6;
        const ph = p.size * u * 0.55;
        ctx.rect(x - pw / 2, y - ph / 2, pw, ph);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = alpha(PARTY[c]!, pass === 0 ? 0.9 : 0.35);
      ctx.fill();
    }
  }

  // A few curly streamers drifting down the sides.
  for (const st of STREAMERS) {
    const local = (((s.t - st.delay) % SHOWER) + SHOWER) % SHOWER;
    const y = -u * 0.2 + local * st.speed * u;
    if (y > floorY - u * 0.15) continue;
    const x = st.x * s.cssW + Math.sin(s.t * 0.9 + st.delay) * u * 0.02;
    const len = u * st.len;
    const amp = u * st.amp;
    ctx.beginPath();
    // A coiled ribbon: a helix seen from the side draws a row of loops.
    for (let k = 0; k <= 28; k++) {
      const f = k / 28;
      const th = f * TAU * st.loops + s.t * 5 + st.delay * 3;
      const px = x + Math.sin(th) * amp * (0.5 + f * 0.6);
      const py = y + f * len + Math.cos(th) * amp * 0.9;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    neonStroke(ctx, st.color, Math.max(1, u * 0.0035), 2.6);
  }
}

/** Everything in the New Year's sky between the mirror ball and the skyline. */
export function newYearSky(ctx: Ctx, s: Scene): void {
  fireworks(ctx, s);
  confettiShower(ctx, s);
}


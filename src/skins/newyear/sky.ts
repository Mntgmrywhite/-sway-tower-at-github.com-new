import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, clamp01, GOLD, GOLD_LIGHT, INK, IVORY, PARTY, ROSE, SILVER, TAU } from "./colors";
import { barbPath, PLUME, PLUME_HALF, plumePath, quillPath } from "./plume";
import { cloudTop, MID_SPAN, skylineTop } from "./skyline";
import { toneOf, type Tone } from "./story";

// The New Year's sky: a pale-gold full moon ringed with flat Deco halos, bright cartoon
// fireworks (fat dots of flat color, no outlines; gold willows for Gatsby) that come faster
// the higher you climb, confetti drifting down, and a few flapper's ostrich plumes see-sawing
// down with it. Past the climb the night goes round (story.ts): a grand finale lighting the sky,
// balloons rising after it, then snow in the small hours, then midnight again. Everything that
// drifts keeps to the side lanes, clear of the tower column, and everything here is drawn
// behind the city and the clouds.

/* ---------------------------------------------------------------- HUD keep-out */

// render.ts puts the score (or the title) on a baseline at cssH * 0.14, with best, lives and
// the perfect counter below it, all inside the top-center zone. Nothing bright goes there.
// On the start screen the title is nearly as wide as the screen, so its row is kept clear
// too until the camera starts to climb.
const HUD_BOTTOM = 0.32; // of cssH
const HUD_X0 = 0.2; // of cssW
const HUD_X1 = 0.8;
const TITLE_Y = 0.14; // of cssH

/** Half-width of the tower column (u) that nothing drifting ever enters. */
export const COLUMN = 0.28;

/**
 * A screen x in the side lanes for `f` in [0, 1): across the left lane for f < 0.5, across the
 * right one for the rest, keeping `reach` px clear of the tower column and the screen's edges.
 */
export function laneX(s: Scene, f: number, reach: number): number {
  const lane = s.cssW / 2 - COLUMN * s.u;
  const k = f < 0.5 ? f * 2 : f * 2 - 1;
  const x = reach + k * Math.max(0, lane - 2 * reach);
  return f < 0.5 ? x : s.cssW - x;
}

/** 1 while the start-screen title row is protected, fading to 0 as the camera climbs. */
function titleOn(s: Scene): number {
  return 1 - clamp01(s.rise / (s.u * 0.3));
}

/* ---------------------------------------------------------------- moon */

/** The moon's smallest and largest radius (u). */
const MOON_R_MIN = 0.068;
const MOON_R_MAX = 0.085;
/** Gap (u) between the title's baseline and the top of the moon at its largest: room for the
 *  title's descenders and outline, so the start-screen title never covers the moon. */
const MOON_DROP = 0.045;
/** Halo radius, as a multiple of the moon's radius. */
const MOON_HALO = 1.62;
const MOON = "#fff0c6";
const CRATER = mix(MOON, CHAMPAGNE, 0.75);
const HALO_IN = alpha(GOLD_LIGHT, 0.13);
const HALO_OUT = alpha(GOLD_LIGHT, 0.07);
/** Craters: offset and radius as fractions of the moon's radius. */
const CRATERS: readonly (readonly [number, number, number])[] = [
  [0.3, 0.1, 0.17],
  [-0.2, 0.42, 0.12],
  [0.46, -0.34, 0.08],
  [-0.4, -0.05, 0.08],
  [-0.05, -0.4, 0.06],
];

function moonR(s: Scene): number {
  return s.u * (MOON_R_MIN + altitude01(s) * (MOON_R_MAX - MOON_R_MIN));
}

/** Left of the HUD columns with a little air before the tilt gauge, never off the screen. */
function moonX(s: Scene, r: number): number {
  return Math.max(r + s.u * 0.02, Math.min(s.cssW * HUD_X0 - r - s.u * 0.03, s.cssW / 2 - s.u * 0.3));
}

/** Just under the title's row (render.ts puts its baseline at cssH * TITLE_Y), so the wide
 *  start-screen title never hides it; the HUD columns beside it stay clear. */
function moonY(s: Scene): number {
  return s.cssH * TITLE_Y + s.u * (MOON_DROP + MOON_R_MAX);
}

/** How high (u over the horizon) anything between screen x0 and x1 may rise and stay clear of
 *  the moon and its halo, or Infinity when the moon is not above that span. */
export function underMoon(s: Scene, x0: number, x1: number): number {
  const r = moonR(s);
  const R = r * MOON_HALO;
  const x = moonX(s, r);
  if (x1 < x - R || x0 > x + R) return Infinity;
  return (s.horizonY - moonY(s) - R) / s.u - 0.015;
}

/* ---------------------------------------------------------------- the sky's glow */

/** Light low in the sky, added onto the navy: the grand finale's bursts lighting the haze a
 *  brighter royal blue, and the small hours' snow light, silvery. Never warm: gold or rose
 *  added onto navy turns it grey or purple. */
const GLOW = "#3768d6";
const SNOW_LIGHT = "#8aa6dc";
const GLOW_ALPHA = 0.42;
const SNOW_ALPHA = 0.3;
/** The glow fades in from this far down the screen (of cssH) to the horizon (the city, the bay
 *  and the terrace cover the rest). */
const GLOW_TOP = 0.42;
const GREF = 100;
let glowCtx: Ctx | null = null;
let glowFill: CanvasGradient | null = null;
let snowFill: CanvasGradient | null = null;

function glowBand(ctx: Ctx, s: Scene, fill: CanvasGradient, a: number): void {
  const y0 = s.cssH * GLOW_TOP;
  const y1 = Math.min(s.cssH, s.horizonY + 2);
  if (y1 <= y0) return;
  ctx.globalAlpha = a;
  ctx.save();
  ctx.translate(0, y0);
  ctx.scale(1, (y1 - y0) / GREF);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, s.cssW, GREF);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function skyGlow(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.glow < 0.01 && tone.silver < 0.01) return;
  if (glowCtx !== ctx) {
    glowCtx = ctx;
    glowFill = ctx.createLinearGradient(0, 0, 0, GREF);
    glowFill.addColorStop(0, alpha(GLOW, 0));
    glowFill.addColorStop(1, GLOW);
    snowFill = ctx.createLinearGradient(0, 0, 0, GREF);
    snowFill.addColorStop(0, alpha(SNOW_LIGHT, 0));
    snowFill.addColorStop(1, SNOW_LIGHT);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (tone.glow >= 0.01) glowBand(ctx, s, glowFill!, tone.glow * GLOW_ALPHA);
  if (tone.silver >= 0.01) glowBand(ctx, s, snowFill!, tone.silver * SNOW_ALPHA);
  ctx.restore();
}

/** The sky's glow, then a full moon in flat pale gold, ringed by two flat Deco halos. */
export function decoMoon(ctx: Ctx, s: Scene): void {
  skyGlow(ctx, s, toneOf(s));
  const r = moonR(s);
  const x = moonX(s, r);
  const y = moonY(s);
  ctx.beginPath();
  circle(ctx, x, y, r * MOON_HALO);
  ctx.fillStyle = HALO_OUT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 1.3);
  ctx.fillStyle = HALO_IN;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = MOON;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, cr] of CRATERS) circle(ctx, x + dx * r, y + dy * r, cr * r);
  ctx.fillStyle = CRATER;
  ctx.fill();
}

/* ---------------------------------------------------------------- fireworks */

interface Launcher {
  period: number;
  offset: number;
  /** The tone's `fireworks` (or, for the finale's launchers, its `finale`) at which this
   *  launcher joins in. */
  need: number;
  finale: boolean;
}

/** Launchers that always fire; the rest join in one by one as the tower climbs. */
const ALWAYS = 5;
const LAUNCHERS: Launcher[] = Array.from({ length: 15 }, (_, i) => {
  const period = 3.3 + hash(i * 5.31 + 1) * 1.8;
  return {
    period,
    // Golden-ratio stagger so launchers never all rest at once; the constant phase puts
    // a few bursts in the air within the first seconds.
    offset: ((i * 0.618034) % 1) * period + hash(i * 5.31 + 2) * 0.4 + 3.75,
    need: i < ALWAYS ? -1 : 0.06 + ((i - ALWAYS) / (14 - ALWAYS)) * 0.8,
    finale: false,
  };
}).concat(
  // The grand finale's launchers: quicker, joining in as it builds.
  Array.from({ length: 6 }, (_, j) => {
    const period = 2.3 + hash(j * 7.7 + 301) * 0.8;
    return { period, offset: ((j * 0.618034 + 0.31) % 1) * period + 1.3, need: 0.05 + j * 0.13, finale: true };
  }),
);

const RISE = 0.75; // seconds the rocket climbs
const BLOOM = 1.9; // seconds the burst lasts
/** How far a burst of radius R reaches above and below its center while it is still visible:
 *  the farthest heads (1.06 R) plus their dot, and below that the droop of their tails, which
 *  is longest on a willow. */
const ABOVE = 1.15;
const BELOW = 1.35;
const BELOW_WILLOW = 1.55;
/** Burst styles by hash(seed + 8): peony below RING_AT, ring below WILLOW_AT, else a gold willow. */
const RING_AT = 0.45;
const WILLOW_AT = 0.68;

const OUTER = 14;
const INNER = 7;
/** Unit directions (x, y) and speed jitter for the outer and inner rings. */
const OUTER_DIRS = Array.from({ length: OUTER }, (_, j) => {
  const a = (j / OUTER) * TAU;
  return [Math.cos(a), Math.sin(a), 0.94 + hash(j + 41) * 0.12] as const;
});
const INNER_DIRS = Array.from({ length: INNER }, (_, j) => {
  const a = ((j + 0.5) / INNER) * TAU;
  return [Math.cos(a), Math.sin(a)] as const;
});
/** Scratch: head positions of the ring being drawn. */
const HEADS = new Float32Array(OUTER * 2);
/** Scratch: where the burst being placed goes. */
const SPOT = { x: 0, y: 0, r: 0 };
/** Trail tints (a step lighter than the heads), the willow's gold trail, and the cel highlight. */
const TRAIL = PARTY.map((c) => mix(c, "#ffffff", 0.35));
const WILLOW_HEAD = GOLD_LIGHT;
const WILLOW_TRAIL = mix(GOLD, "#ffffff", 0.2);
const HIGHLIGHT = alpha("#ffffff", 0.75);

/** Pop flash: an eight-point star, unit radius. */
const FLASH = Array.from({ length: 16 }, (_, i) => {
  const a = -Math.PI / 2 + (i * TAU) / 16;
  const r = i % 2 ? 0.42 : 1;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});

function cubicOut(x: number): number {
  const k = 1 - x;
  return 1 - k * k * k;
}

/** Once the camera follows the tower, the slider row sits here (of cssH); bursts stay off it. */
const SLIDER_ROW = 0.38;

/** The lowest a burst reaching `r` either side of screen x may come down to: above every
 *  rooftop and the cloud bank under it, so neither ever slices it. */
function floorAt(s: Scene, x: number, r: number): number {
  const { cssW: W, u } = s;
  const x0 = x - r;
  const x1 = x + r;
  const side = Math.min(1, Math.max(Math.abs(x0 / W - 0.5), Math.abs(x1 / W - 0.5)) * 2);
  const roof = skylineTop((x0 - W / 2) / u, (x1 - W / 2) / u);
  return Math.min(s.cssH * 0.84, s.horizonY - u * (Math.max(roof, cloudTop(side)) + 0.02));
}

/**
 * Choose where a burst goes: over the short tower early on, up in a corner beside the HUD,
 * or low on either side of the tower. Never in the HUD zone, over the start-screen title,
 * on the moon, below a rooftop, or (once the camera follows the tower) across the slider's row.
 * Returns how visible the burst is: 0 when there is no room this time.
 */
function place(s: Scene, seed: number, grow: number): number {
  const { cssW: W, cssH: H, u } = s;
  const cx = W / 2;
  const hudBottom = H * HUD_BOTTOM;
  // 0 while the tower is short, 1 once the camera follows its top along the slider row.
  const follow = clamp01(s.rise / (u * 0.25));
  const rowTop = hudBottom + (H * SLIDER_ROW - u * 0.1 - hudBottom) * follow;
  const rowBottom = hudBottom + (H * SLIDER_ROW + u * 0.08 - hudBottom) * follow;
  const left = hash(seed + 5) < 0.5;
  const below = hash(seed + 8) >= WILLOW_AT ? BELOW_WILLOW : BELOW;

  // Bursts over the tower fade out as the camera starts to follow it; from then on, that
  // launcher's bursts fade in beside the tower instead, so nothing jumps. They fill the band
  // between the HUD and the rooftops, shrinking (to small, distant bursts) to fit it.
  const overTower = hash(seed + 1) < 0.32;
  if (overTower && follow < 0.5) {
    const show = 1 - follow * 2;
    const reach = MID_SPAN * u;
    const floor = floorAt(s, cx, reach);
    const R = Math.min(u * (0.075 + hash(seed + 3) * 0.03), (floor - hudBottom) / (ABOVE + below));
    if (R < u * 0.035) return 0;
    const y0 = hudBottom + R * ABOVE;
    const y1 = floor - R * below;
    SPOT.x = cx + (hash(seed + 2) - 0.5) * 2 * (reach - R * ABOVE);
    SPOT.y = y0 + hash(seed + 4) * Math.max(0, y1 - y0);
    SPOT.r = R;
    return show;
  }

  // Low beside the tower column, over the rooftops on that side
  const R = u * (0.085 + hash(seed + 3) * 0.04 + grow * 0.02);
  const xMin = R + u * 0.02;
  // Mostly clear of the tower: at most a sliver of the burst slips behind the bars. The grand
  // finale's bigger bursts (grow over 1) stand further out by their extra size, so they slip no
  // further behind the bars than the climb's biggest.
  const xMax = Math.max(xMin, cx - u * 0.25 - R * 0.2 - Math.max(0, grow - 1) * u * 0.02);
  const lx = xMin + hash(seed + 2) * (xMax - xMin);
  const lowX = left ? lx : W - lx;
  const lowY0 = rowBottom + R * ABOVE;
  const lowY1 = floorAt(s, lowX, R * ABOVE) - R * below;
  // Up in a corner beside the HUD: a smaller, more distant burst
  const cR = u * (0.055 + hash(seed + 3) * 0.02);
  const cxMin = cR + u * 0.02;
  const cxMax = W * HUD_X0 - cR - 2;
  const kx = cxMin + hash(seed + 2) * Math.max(0, cxMax - cxMin);
  const cornerX = left ? kx : W - kx;
  const title = H * 0.05 + (H * TITLE_Y + u * 0.04 - H * 0.05) * titleOn(s);
  const cY0 = title + cR * ABOVE;
  // On the left the moon fills the corner under the title's row, so bursts there go above it
  // (once the title has gone).
  const moonTop = H * TITLE_Y + u * (MOON_DROP - MOON_R_MAX * (MOON_HALO - 1) - 0.02);
  const ceiling = left ? moonTop - cR * below : hudBottom;
  const cY1 = Math.min(ceiling, rowTop - cR * below * follow, floorAt(s, cornerX, cR * ABOVE) - cR * below);
  const lowOK = lowY1 >= lowY0;
  const cornerOK = cxMax > cxMin && cY1 >= cY0;
  if (cornerOK && (!lowOK || hash(seed + 6) < 0.4)) {
    SPOT.x = cornerX;
    SPOT.y = cY0 + hash(seed + 4) * (cY1 - cY0);
    SPOT.r = cR;
  } else if (lowOK) {
    SPOT.x = lowX;
    SPOT.y = lowY0 + hash(seed + 4) * (lowY1 - lowY0);
    SPOT.r = R;
  } else {
    return 0;
  }
  return overTower ? clamp01(follow * 2 - 1) : 1;
}

function fireworks(ctx: Ctx, s: Scene, tone: Tone): void {
  // Bursts grow with the climb, and again in the finale.
  const grow = altitude01(s) + tone.finale;
  const u = s.u;
  const launchY = Math.min(s.horizonY, s.cssH + u * 0.05);

  for (let i = 0; i < LAUNCHERS.length; i++) {
    const L = LAUNCHERS[i]!;
    const join = L.finale ? clamp01((tone.finale - L.need) / 0.15) : clamp01((tone.fireworks - L.need) / 0.08);
    if (join <= 0) continue;
    const tt = s.t + L.offset;
    const cycle = Math.floor(tt / L.period);
    const local = tt - cycle * L.period;
    if (local > RISE + BLOOM) continue;
    const seed = i * 101 + cycle * 13;
    const on = join * place(s, seed, grow);
    if (on <= 0) continue;
    const { x: bx, y: by, r: R } = SPOT;
    if (by > launchY - u * 0.05) continue;

    const ci = Math.floor(hash(seed + 7) * PARTY.length);
    const c1 = PARTY[ci]!;
    const c2 = PARTY[(ci + 2) % PARTY.length]!;
    const style = hash(seed + 8);

    if (local < RISE) {
      // Rocket: an ivory head with a dotted gold trail, rising from behind the city.
      const k = local / RISE;
      const sx = bx + (hash(seed + 9) - 0.5) * u * 0.1;
      ctx.globalAlpha = on;
      ctx.beginPath();
      for (let d = 1; d <= 4; d++) {
        const e = cubicOut(Math.max(0, k - d * 0.05));
        circle(ctx, sx + (bx - sx) * e, launchY + (by - launchY) * e, u * (0.0075 - d * 0.0013));
      }
      ctx.fillStyle = GOLD;
      ctx.fill();
      const e = cubicOut(k);
      ctx.beginPath();
      circle(ctx, sx + (bx - sx) * e, launchY + (by - launchY) * e, u * 0.008);
      ctx.fillStyle = IVORY;
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    const k = (local - RISE) / BLOOM; // 0 → 1
    const willow = style >= WILLOW_AT;
    const ring = style >= RING_AT && !willow;
    const e = cubicOut(Math.min(1, k * 1.3));
    const et = cubicOut(Math.min(1, Math.max(0, k - (willow ? 0.32 : 0.12)) * 1.3));
    const droop = R * (willow ? 0.55 : 0.3) * k * k;
    const droopT = R * (willow ? 0.55 : 0.3) * Math.max(0, k - 0.2) ** 2;
    const shrink = k < 0.5 ? 1 : 1 - ((k - 0.5) / 0.5) * 0.8;
    const pr = R * (willow ? 0.06 : ring ? 0.085 : 0.075) * shrink;
    const squash = ring ? 0.55 + hash(seed + 10) * 0.3 : 1;
    const tilt = ring ? (hash(seed + 11) - 0.5) * 0.9 : 0;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    ctx.globalAlpha = on * (k < 0.82 ? 1 : 1 - (k - 0.82) / 0.18);

    // The pop: a flat ivory star at the center
    if (k < 0.14) {
      const fr = R * 0.38 * (1 - k / 0.14);
      ctx.beginPath();
      ctx.moveTo(bx + FLASH[0]![0] * fr, by + FLASH[0]![1] * fr);
      for (let j = 1; j < FLASH.length; j++) ctx.lineTo(bx + FLASH[j]![0] * fr, by + FLASH[j]![1] * fr);
      ctx.closePath();
      ctx.fillStyle = IVORY;
      ctx.fill();
    }

    // Outer ring: head positions, then fat tapered trails behind them
    for (let j = 0; j < OUTER; j++) {
      const [dx, dy, sp] = OUTER_DIRS[j]!;
      const ux = dx * (ring ? 1 : sp);
      const uy = dy * (ring ? 1 : sp) * squash;
      HEADS[j * 2] = bx + (ux * ct - uy * st) * R * e;
      HEADS[j * 2 + 1] = by + (ux * st + uy * ct) * R * e + droop;
    }
    if (!ring) {
      ctx.beginPath();
      for (let j = 0; j < OUTER; j++) {
        const [dx, dy, sp] = OUTER_DIRS[j]!;
        ctx.moveTo(bx + dx * sp * R * et, by + dy * sp * R * et + droopT);
        ctx.lineTo(HEADS[j * 2]!, HEADS[j * 2 + 1]!);
      }
      ctx.lineCap = "round";
      ctx.strokeStyle = willow ? WILLOW_TRAIL : TRAIL[ci]!;
      ctx.lineWidth = pr * (willow ? 1.3 : 1.1);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    ctx.beginPath();
    for (let j = 0; j < OUTER; j++) circle(ctx, HEADS[j * 2]!, HEADS[j * 2 + 1]!, pr);
    ctx.fillStyle = willow ? WILLOW_HEAD : c1;
    ctx.fill();

    // Inner two-tone ring on peonies
    if (!willow && !ring) {
      ctx.beginPath();
      for (const [dx, dy] of INNER_DIRS) circle(ctx, bx + dx * R * e * 0.52, by + dy * R * e * 0.52 + droop * 0.7, pr * 0.85);
      ctx.fillStyle = c2;
      ctx.fill();
    }

    // Cel highlight on each outer head
    if (!willow) {
      ctx.beginPath();
      for (let j = 0; j < OUTER; j++) circle(ctx, HEADS[j * 2]! - pr * 0.3, HEADS[j * 2 + 1]! - pr * 0.3, pr * 0.38);
      ctx.fillStyle = HIGHLIGHT;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------------------------------------------------------------- confetti and feathers */

const CONFETTI = Array.from({ length: 44 }, (_, i) => ({
  x: hash(i * 3.7 + 11),
  phase: hash(i * 3.7 + 12),
  speed: 0.11 + hash(i * 3.7 + 13) * 0.07, // u per second
  sway: 0.012 + hash(i * 3.7 + 14) * 0.02,
  spin: 2.5 + hash(i * 3.7 + 15) * 4,
  turn: hash(i * 3.7 + 16) * TAU,
  size: 0.016 + hash(i * 3.7 + 17) * 0.008,
  color: i % PARTY.length,
}));
/** The confetti's foil backs: antique gold, so a tumbling piece flashes (a grey back read as
 *  ash against the navy). */
const CONFETTI_BACK = mix(GOLD, INK, 0.35);

/** Where a falling piece is: x and y in CSS px, or y > floor when it is out of sight. */
const AT = { x: 0, y: 0, d: 0 };

/** Shared fall for confetti, snow and feathers down the side lanes (`f`: where across them, see
 *  laneX): pieces whose swing (`reach`, u either side) takes them over the HUD columns start
 *  falling below the HUD. */
function fall(s: Scene, f: number, phase: number, speed: number, reach: number): void {
  const { cssW: W, cssH: H, u } = s;
  const r = reach * u;
  const fx = laneX(s, f, r);
  const top = fx + r > W * HUD_X0 && fx - r < W * HUD_X1 ? H * HUD_BOTTOM : -u * 0.06;
  const span = H + u * 0.08 - top;
  AT.d = (((s.t * speed * u + phase * span) % span) + span) % span;
  AT.x = fx;
  AT.y = top + AT.d;
}

/** Add one tumbling confetti piece to the current path, if it is in sight and showing the
 *  wanted face (front, or its back). Returns whether it was added. */
function confettiPiece(ctx: Ctx, s: Scene, i: number, floor: number, back: boolean): boolean {
  const u = s.u;
  const p = CONFETTI[i]!;
  fall(s, p.x, p.phase, p.speed, p.sway + p.size * 0.6);
  const y = AT.y;
  if (y > floor) return false;
  const flip = Math.cos(s.t * p.spin + i);
  if ((flip < 0) !== back) return false;
  const grow = clamp01(AT.d / (u * 0.05));
  const x = AT.x + Math.sin(s.t * 1.3 + i) * p.sway * u;
  const w = p.size * u * grow * Math.max(0.15, Math.abs(flip));
  const h = p.size * u * grow * 0.55;
  const rot = p.turn + s.t * p.spin * 0.25;
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const ax = (ca * w) / 2;
  const ay = (sa * w) / 2;
  const bx = (-sa * h) / 2;
  const by = (ca * h) / 2;
  ctx.moveTo(x - ax - bx, y - ay - by);
  ctx.lineTo(x + ax - bx, y + ay - by);
  ctx.lineTo(x + ax + bx, y + ay + by);
  ctx.lineTo(x - ax + bx, y - ay + by);
  ctx.closePath();
  return true;
}

/** Confetti drifting down the sky, tumbling so each piece flashes its foil back: the fronts in
 *  their party colors, every back in one shared shade (one fill for all of them). */
function confettiFall(ctx: Ctx, s: Scene, tone: Tone): void {
  const floor = Math.min(s.cssH, s.horizonY);
  const count = Math.round(CONFETTI.length * tone.confetti);
  for (let c = 0; c < PARTY.length; c++) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < count; i++) {
      if (CONFETTI[i]!.color === c && confettiPiece(ctx, s, i, floor, false)) any = true;
    }
    if (!any) continue;
    ctx.fillStyle = PARTY[c]!;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < count; i++) confettiPiece(ctx, s, i, floor, true);
  ctx.fillStyle = CONFETTI_BACK;
  ctx.fill();
}

/** How far a plume reaches from where it hangs, as a fraction of its size, at any turn. */
const PLUME_REACH = 0.62;
/** Ostrich plumes: color, its shaded half, and how each one falls and see-saws. */
const PLUME_COLORS = [IVORY, ROSE, GOLD_LIGHT, IVORY, ROSE, CHAMPAGNE] as const;
const PLUMES = PLUME_COLORS.map((color, i) => ({
  color,
  shade: mix(color, "#3d4f80", 0.28),
  x: (i * 0.618034 + 0.13) % 1,
  phase: hash(i * 7.3 + 61),
  speed: 0.045 + hash(i * 7.3 + 62) * 0.02,
  swing: 0.04 + hash(i * 7.3 + 63) * 0.03,
  rate: 0.9 + hash(i * 7.3 + 64) * 0.5,
  size: 0.06 + hash(i * 7.3 + 65) * 0.02,
}));

/** Plumes falling slowly, see-sawing as they go, never in front of the HUD. */
function plumes(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const floor = Math.min(s.cssH, s.horizonY) + u * 0.05;
  const n = Math.round(PLUMES.length * tone.plumes);
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const p = PLUMES[i]!;
    fall(s, p.x, p.phase, p.speed, p.swing + p.size * PLUME_REACH);
    if (AT.y - u * p.size > floor) continue;
    const grow = clamp01(AT.d / (u * 0.08));
    if (grow <= 0) continue;
    const sw = Math.sin(s.t * p.rate + i * 2.1);
    const x = AT.x + sw * p.swing * u;
    const f = p.size * u * grow;
    const rot = sw * 0.7 + 0.25;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    ctx.beginPath();
    plumePath(ctx, PLUME, x, AT.y, f, c, sn);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.beginPath();
    plumePath(ctx, PLUME_HALF, x, AT.y, f, c, sn);
    ctx.fillStyle = p.shade;
    ctx.fill();
    ctx.beginPath();
    barbPath(ctx, x, AT.y, f, c, sn);
    quillPath(ctx, x, AT.y, f, c, sn);
    ctx.strokeStyle = p.shade;
    ctx.lineWidth = Math.max(1, f * 0.05);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

/* ---------------------------------------------------------------- glitter */

/** Little four-point twinkles popping in the clear sky either side of the tower; more join in
 *  as you climb. Each pops at a fresh spot every cycle. */
const GLITTER = Array.from({ length: 16 }, (_, i) => ({
  period: 1.5 + hash(i * 9.1 + 80) * 1.3,
  offset: hash(i * 9.1 + 81) * 5,
  need: 0.1 + (i / 16) * 0.8,
}));

function glitter(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = tone.glitter;
  const { cssW: W, cssH: H, u } = s;
  const top = H * 0.44;
  const floor = Math.min(H * 0.86, s.horizonY - u * 0.42);
  if (floor - top < u * 0.1) return;
  const span = W / 2 - u * 0.3 - u * 0.04;
  if (span <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < GLITTER.length; i++) {
    const g = GLITTER[i]!;
    if (a < g.need) continue;
    const tt = s.t + g.offset;
    const cycle = Math.floor(tt / g.period);
    const p = (tt - cycle * g.period) / g.period;
    if (p > 0.35) continue;
    const seed = i * 37 + cycle * 11;
    const xx = u * 0.04 + hash(seed + 1) * span;
    const x = hash(seed) < 0.5 ? xx : W - xx;
    const y = top + hash(seed + 2) * (floor - top);
    const r = u * (0.012 + hash(seed + 3) * 0.01) * Math.sin((p / 0.35) * Math.PI);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.22, y - r * 0.22);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.22, y + r * 0.22);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.22, y + r * 0.22);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.22, y - r * 0.22);
    ctx.closePath();
  }
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fill();
}

/* ---------------------------------------------------------------- snow */

/** Snowflakes for the small hours: where across the lanes, phase, fall speed (u per second),
 *  sway (u) and its rate, radius (u). */
const SNOW = Array.from({ length: 48 }, (_, i) => ({
  x: hash(i * 5.1 + 401),
  phase: hash(i * 5.1 + 402),
  speed: 0.035 + hash(i * 5.1 + 403) * 0.03,
  sway: 0.006 + hash(i * 5.1 + 404) * 0.01,
  rate: 0.6 + hash(i * 5.1 + 405) * 0.8,
  r: 0.004 + hash(i * 5.1 + 406) * 0.005,
}));
const FLAKE = "#f4f7ff";

function snowfall(ctx: Ctx, s: Scene, tone: Tone): void {
  const n = Math.round(SNOW.length * tone.snow);
  if (n === 0) return;
  const u = s.u;
  const floor = Math.min(s.cssH, s.horizonY);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const f = SNOW[i]!;
    fall(s, f.x, f.phase, f.speed, f.sway + f.r);
    if (AT.y > floor) continue;
    const grow = clamp01(AT.d / (u * 0.05));
    circle(ctx, AT.x + Math.sin(s.t * f.rate + i * 1.3) * f.sway * u, AT.y, Math.max(0.6, f.r * u * grow));
  }
  ctx.fillStyle = FLAKE;
  ctx.fill();
}

/* ---------------------------------------------------------------- balloons */

/** Balloons let go after the finale, rising up the side lanes and dwindling into the night. */
const BALLOON_COLORS = [GOLD, SILVER, IVORY, GOLD_LIGHT, ROSE, CHAMPAGNE] as const;
const BALLOON_SHADES = BALLOON_COLORS.map((c) => mix(c, "#3d4f80", 0.3));
const BALLOONS = Array.from({ length: 12 }, (_, i) => ({
  x: (i * 0.618034 + 0.21) % 1,
  phase: (i * 0.381966 + hash(i * 6.3 + 501) * 0.2) % 1,
  speed: 0.05 + hash(i * 6.3 + 502) * 0.03,
  sway: 0.005 + hash(i * 6.3 + 503) * 0.007,
  rate: 0.7 + hash(i * 6.3 + 504) * 0.6,
  size: 0.026 + hash(i * 6.3 + 505) * 0.01,
  color: i % BALLOON_COLORS.length,
}));
/** Scratch: each balloon's center and radius this frame (r 0 when it is not showing). */
const BALLOON_AT = new Float32Array(BALLOONS.length * 3);
const BALLOON_INK = mix(INK, "#3d4f80", 0.3);
/** A balloon is this much taller than wide; its string hangs this many radii below it. */
const BALLOON_TALL = 1.18;
const STRING = 2.4;

function balloons(ctx: Ctx, s: Scene, tone: Tone): void {
  const n = Math.round(BALLOONS.length * tone.balloons);
  if (n === 0) return;
  const { cssH: H, u } = s;
  // They rise from behind the skyline (or from below the screen, once it has gone) to the HUD's
  // line, shrinking into the distance as they go, so none ever reaches the moon or the HUD.
  const top = H * HUD_BOTTOM;
  const bottom = Math.max(top + u * 0.3, Math.min(H + u * 0.12, s.horizonY - u * 0.12));
  const span = bottom - top;
  for (let i = 0; i < BALLOONS.length; i++) {
    const b = BALLOONS[i]!;
    BALLOON_AT[i * 3 + 2] = 0;
    if (i >= n) continue;
    const d = (((s.t * b.speed * u + b.phase * span) % span) + span) % span;
    const k = d / span;
    const r = b.size * u * (1 - k * k * k);
    if (r < 0.8) continue;
    const reach = b.sway * u + b.size * u * 1.2;
    BALLOON_AT[i * 3] = laneX(s, b.x, reach) + Math.sin(s.t * b.rate + i * 2.3) * b.sway * u;
    BALLOON_AT[i * 3 + 1] = bottom - d;
    BALLOON_AT[i * 3 + 2] = r;
  }
  const lw = Math.max(0.8, u * 0.0022);
  // Strings, one stroke
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = BALLOON_AT[i * 3 + 2]!;
    if (r === 0) continue;
    const x = BALLOON_AT[i * 3]!;
    const y = BALLOON_AT[i * 3 + 1]! + r * BALLOON_TALL;
    const w = Math.sin(s.t * 2 + i) * r * 0.35;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w, y + r * STRING * 0.5, x - w * 0.5, y + r * STRING);
  }
  ctx.strokeStyle = BALLOON_INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // Bodies by color, with their knots
  for (let c = 0; c < BALLOON_COLORS.length; c++) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < n; i++) {
      const r = BALLOON_AT[i * 3 + 2]!;
      if (r === 0 || BALLOONS[i]!.color !== c) continue;
      const x = BALLOON_AT[i * 3]!;
      const y = BALLOON_AT[i * 3 + 1]!;
      oval(ctx, x, y, r, r * BALLOON_TALL);
      ctx.moveTo(x - r * 0.2, y + r * (BALLOON_TALL + 0.18));
      ctx.lineTo(x, y + r * (BALLOON_TALL - 0.05));
      ctx.lineTo(x + r * 0.2, y + r * (BALLOON_TALL + 0.18));
      ctx.closePath();
      any = true;
    }
    if (!any) continue;
    ctx.fillStyle = BALLOON_COLORS[c]!;
    ctx.fill();
    ctx.strokeStyle = BALLOON_INK;
    ctx.lineWidth = lw;
    ctx.stroke();
    // The shaded lower right
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const r = BALLOON_AT[i * 3 + 2]!;
      if (r === 0 || BALLOONS[i]!.color !== c) continue;
      const x = BALLOON_AT[i * 3]!;
      const y = BALLOON_AT[i * 3 + 1]!;
      ctx.moveTo(x + r * 0.95, y);
      ctx.ellipse(x, y, r * 0.95, r * BALLOON_TALL * 0.95, 0, 0, Math.PI * 0.7);
      ctx.quadraticCurveTo(x + r * 0.45, y + r * 0.45, x + r * 0.95, y);
      ctx.closePath();
    }
    ctx.fillStyle = BALLOON_SHADES[c]!;
    ctx.fill();
  }
  // Highlights
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = BALLOON_AT[i * 3 + 2]!;
    if (r < 2) continue;
    oval(ctx, BALLOON_AT[i * 3]! - r * 0.38, BALLOON_AT[i * 3 + 1]! - r * 0.45, r * 0.18, r * 0.3);
  }
  ctx.fillStyle = HIGHLIGHT;
  ctx.fill();
}

/** Everything drifting in the side lanes: glitter, confetti, snow, balloons and plumes. */
export function drifters(ctx: Ctx, s: Scene, tone: Tone): void {
  glitter(ctx, s, tone);
  confettiFall(ctx, s, tone);
  snowfall(ctx, s, tone);
  balloons(ctx, s, tone);
  plumes(ctx, s, tone);
}

/** Everything in the New Year's sky between the moon and the skyline. */
export function newYearSky(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  fireworks(ctx, s, tone);
  drifters(ctx, s, tone);
}

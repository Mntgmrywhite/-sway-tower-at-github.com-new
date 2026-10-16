import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { MID_SPAN, PEAK_LEFT, PEAK_RIGHT, SKYLINE_MID } from "./city";
import { clamp01, CREAM, GOLD, INK, PARTY, PINK, TAU } from "./colors";

// The New Year's sky: a full moon wearing a party hat, bright cartoon fireworks (fat dots of
// flat color, no outlines) that come faster the higher you climb, and confetti drifting down.
// Everything here is drawn behind the city and the clouds, so rockets rise from behind them.

/* ---------------------------------------------------------------- HUD keep-out */

// render.ts puts the score (or the title) on a baseline at cssH * 0.14, with best, lives and
// the perfect counter below it, all inside the top-center zone. Nothing bright goes there.
// On the start screen the title is nearly as wide as the screen, so its row is kept clear
// too until the camera starts to climb.
const HUD_BOTTOM = 0.32; // of cssH
const HUD_X0 = 0.2; // of cssW
const HUD_X1 = 0.8;
const TITLE_Y = 0.14; // of cssH

/** 1 while the start-screen title row is protected, fading to 0 as the camera climbs. */
function titleOn(s: Scene): number {
  return 1 - clamp01(s.rise / (s.u * 0.3));
}

/* ---------------------------------------------------------------- moon */

/** The moon's center height (of cssH) and largest radius (u), for keeping bursts off it. */
const MOON_Y = 0.085;
const MOON_R_MAX = 0.1;
const MOON = "#fff3cf";
const CRATER = mix(MOON, "#c9a6e8", 0.32);
const HAT = PINK;
const HAT_SHADE = mix(PINK, INK, 0.22);
const HAT_STRIPE = GOLD;
/** Where the hat sits on the rim (angle from the moon's center), and how far it is tipped. */
const HAT_AT = -2.25;
const HAT_TIP = -0.18;

/** A full moon in party mode: flat and pale with one soft halo, a striped hat on its head. */
export function partyMoon(ctx: Ctx, s: Scene): void {
  const a = altitude01(s);
  const r = s.u * (0.075 + a * (MOON_R_MAX - 0.075));
  const x = Math.max(r * 1.7, s.cssW / 2 - s.u * 0.34);
  const y = s.cssH * MOON_Y;

  ctx.save();
  ctx.shadowColor = "rgba(255, 240, 205, 0.55)";
  ctx.shadowBlur = r * 0.9;
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = CRATER;
  ctx.beginPath();
  circle(ctx, x + r * 0.32, y + r * 0.08, r * 0.17);
  circle(ctx, x - r * 0.18, y + r * 0.42, r * 0.12);
  circle(ctx, x + r * 0.5, y - r * 0.32, r * 0.08);
  circle(ctx, x - r * 0.42, y + r * 0.02, r * 0.07);
  ctx.fill();

  // The hat: a cone whose brim sits just inside the rim, tipped back off the moon's head.
  const bx = x + Math.cos(HAT_AT) * r * 0.8;
  const by = y + Math.sin(HAT_AT) * r * 0.8;
  const w = r * 0.95;
  const h = r * 1.05;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(HAT_AT + Math.PI / 2 + HAT_TIP);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(0, w * 0.2, -w / 2, 0);
  ctx.fillStyle = HAT;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Shaded right flank, then two gold bands around the cone
  ctx.fillStyle = HAT_SHADE;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, 0.1 * w);
  ctx.lineTo(0, -h);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, w);
  ctx.fill();
  ctx.strokeStyle = HAT_STRIPE;
  ctx.lineWidth = h * 0.12;
  ctx.beginPath();
  ctx.moveTo(-w, -h * 0.2);
  ctx.lineTo(w, -h * 0.02);
  ctx.moveTo(-w, -h * 0.58);
  ctx.lineTo(w, -h * 0.4);
  ctx.stroke();
  ctx.restore();
  // Pom-pom
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  circle(ctx, 0, -h, r * 0.15);
  ctx.fill();
  ctx.restore();
}

/* ---------------------------------------------------------------- fireworks */

interface Launcher {
  period: number;
  offset: number;
  /** altitude01 at which this launcher joins in. */
  need: number;
}

const LAUNCHERS: Launcher[] = Array.from({ length: 11 }, (_, i) => {
  const period = 3.4 + hash(i * 5.31 + 1) * 1.8;
  return {
    period,
    // Golden-ratio stagger so launchers never all rest at once; the constant phase puts
    // a few bursts in the air within the first seconds.
    offset: ((i * 0.618034) % 1) * period + hash(i * 5.31 + 2) * 0.4 + 3.75,
    // Five always fire; the rest join in as the tower climbs.
    need: i < 5 ? -1 : 0.08 + ((i - 5) / 6) * 0.7,
  };
});

const RISE = 0.75; // seconds the rocket climbs
const BLOOM = 1.9; // seconds the burst lasts
/** How far a burst of radius R reaches above and below its center while it is still visible:
 *  the farthest heads (1.06 R) plus their dot, and below that the droop of their tails, which
 *  is longest on a willow. */
const ABOVE = 1.15;
const BELOW = 1.35;
const BELOW_WILLOW = 1.55;
/** Burst styles by hash(seed + 8): peony below RING_AT, ring below WILLOW_AT, else willow. */
const RING_AT = 0.5;
const WILLOW_AT = 0.75;

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
const WILLOW_TRAIL = mix(GOLD, "#ffffff", 0.35);
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

/**
 * Choose where a burst goes: over the short tower early on, up in a corner beside the HUD,
 * or low on either side of the tower. Never in the HUD zone, over the start-screen title,
 * on the moon, or (once the camera follows the tower) across the slider's row.
 * Returns how visible the burst is: 0 when there is no room this time.
 */
function place(s: Scene, seed: number, a: number): number {
  const { cssW: W, cssH: H, u } = s;
  const cx = W / 2;
  const hudBottom = H * HUD_BOTTOM;
  // 0 while the tower is short, 1 once the camera follows its top along the slider row.
  const follow = clamp01(s.rise / (u * 0.25));
  const rowTop = hudBottom + (H * SLIDER_ROW - u * 0.1 - hudBottom) * follow;
  const rowBottom = hudBottom + (H * SLIDER_ROW + u * 0.08 - hudBottom) * follow;
  // Above the cloud bank, which piles up highest at the sides; in the middle, above every
  // rooftop, and at the sides above the landmarks, so no building ever slices a burst.
  const midFloor = Math.min(H * 0.84, s.horizonY - u * (SKYLINE_MID + 0.02));
  const sideFloor = Math.min(H * 0.84, s.horizonY - u * 0.4);
  const left = hash(seed + 5) < 0.5;
  const peak = s.horizonY - u * (left ? PEAK_LEFT : PEAK_RIGHT);
  const below = hash(seed + 8) >= WILLOW_AT ? BELOW_WILLOW : BELOW;

  // Bursts over the tower fade out as the camera starts to follow it; from then on, that
  // launcher's bursts fade in beside the tower instead, so nothing jumps. They fill the band
  // between the HUD and the rooftops, shrinking (to small, distant bursts) to fit it.
  const overTower = hash(seed + 1) < 0.32;
  if (overTower && follow < 0.5) {
    const show = 1 - follow * 2;
    const R = Math.min(u * (0.075 + hash(seed + 3) * 0.03), (midFloor - hudBottom) / (ABOVE + below));
    if (R < u * 0.035) return 0;
    const y0 = hudBottom + R * ABOVE;
    const y1 = midFloor - R * below;
    SPOT.x = cx + (hash(seed + 2) - 0.5) * 2 * (MID_SPAN * u - R * ABOVE);
    SPOT.y = y0 + hash(seed + 4) * Math.max(0, y1 - y0);
    SPOT.r = R;
    return show;
  }

  // Low beside the tower column
  const R = u * (0.085 + hash(seed + 3) * 0.04 + a * 0.02);
  const lowY0 = rowBottom + R * ABOVE;
  const lowY1 = Math.min(sideFloor - R * 0.2, peak - R * below);
  // Up in a corner beside the HUD: a smaller, more distant burst
  const cR = u * (0.055 + hash(seed + 3) * 0.02);
  const cxMin = cR + u * 0.02;
  const cxMax = W * HUD_X0 - cR - 2;
  const title = H * 0.05 + (H * TITLE_Y + u * 0.04 - H * 0.05) * titleOn(s);
  const ceiling = left ? Math.max(title, H * MOON_Y + u * (MOON_R_MAX + 0.02)) : title;
  const cY0 = ceiling + cR * ABOVE;
  const cY1 = Math.min(hudBottom, rowTop - cR * below * follow, peak - cR * below);
  const lowOK = lowY1 >= lowY0;
  const cornerOK = cxMax > cxMin && cY1 >= cY0;
  let x: number;
  if (cornerOK && (!lowOK || hash(seed + 6) < 0.4)) {
    x = cxMin + hash(seed + 2) * (cxMax - cxMin);
    SPOT.y = cY0 + hash(seed + 4) * (cY1 - cY0);
    SPOT.r = cR;
  } else if (lowOK) {
    const xMin = R + u * 0.02;
    // Mostly clear of the tower: at most a sliver of the burst slips behind the bars.
    const xMax = Math.max(xMin, cx - u * 0.25 - R * 0.2);
    x = xMin + hash(seed + 2) * (xMax - xMin);
    SPOT.y = lowY0 + hash(seed + 4) * (lowY1 - lowY0);
    SPOT.r = R;
  } else {
    return 0;
  }
  SPOT.x = left ? x : W - x;
  return overTower ? clamp01(follow * 2 - 1) : 1;
}

function fireworks(ctx: Ctx, s: Scene): void {
  const a = altitude01(s);
  const u = s.u;
  const launchY = Math.min(s.horizonY, s.cssH + u * 0.05);

  for (let i = 0; i < LAUNCHERS.length; i++) {
    const L = LAUNCHERS[i]!;
    const join = clamp01((a - L.need) / 0.1);
    if (join <= 0) continue;
    const tt = s.t + L.offset;
    const cycle = Math.floor(tt / L.period);
    const local = tt - cycle * L.period;
    if (local > RISE + BLOOM) continue;
    const seed = i * 101 + cycle * 13;
    const on = join * place(s, seed, a);
    if (on <= 0) continue;
    const { x: bx, y: by, r: R } = SPOT;
    if (by > launchY - u * 0.05) continue;

    const ci = Math.floor(hash(seed + 7) * PARTY.length);
    const c1 = PARTY[ci]!;
    const c2 = PARTY[(ci + 2) % PARTY.length]!;
    const style = hash(seed + 8);

    if (local < RISE) {
      // Rocket: a cream head with a dotted gold trail, rising from behind the city.
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
      ctx.fillStyle = CREAM;
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
    const pr = R * (willow ? 0.055 : ring ? 0.085 : 0.075) * shrink;
    const squash = ring ? 0.55 + hash(seed + 10) * 0.3 : 1;
    const tilt = ring ? (hash(seed + 11) - 0.5) * 0.9 : 0;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    ctx.globalAlpha = on * (k < 0.82 ? 1 : 1 - (k - 0.82) / 0.18);

    // The pop: a flat cream star at the center
    if (k < 0.14) {
      const fr = R * 0.38 * (1 - k / 0.14);
      ctx.beginPath();
      ctx.moveTo(bx + FLASH[0]![0] * fr, by + FLASH[0]![1] * fr);
      for (let j = 1; j < FLASH.length; j++) ctx.lineTo(bx + FLASH[j]![0] * fr, by + FLASH[j]![1] * fr);
      ctx.closePath();
      ctx.fillStyle = CREAM;
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
    ctx.fillStyle = willow ? CREAM : c1;
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

/* ---------------------------------------------------------------- confetti */

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
const CONFETTI_BACK = PARTY.map((c) => mix(c, INK, 0.3));

/** Confetti drifting down the sky, tumbling so each piece flashes its darker back. */
function confettiFall(ctx: Ctx, s: Scene): void {
  const { cssW: W, cssH: H, u } = s;
  const hudBottom = H * HUD_BOTTOM;
  const floor = Math.min(H, s.horizonY);
  const count = Math.round(28 + 16 * altitude01(s));
  for (let c = 0; c < PARTY.length; c++) {
    for (let side = 0; side < 2; side++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < count; i++) {
        const p = CONFETTI[i]!;
        if (p.color !== c) continue;
        const fx = p.x * W;
        // Pieces over the HUD start falling below it, growing in as they appear.
        const top = fx > W * HUD_X0 && fx < W * HUD_X1 ? hudBottom : -u * 0.03;
        const span = H + u * 0.05 - top;
        const d = (((s.t * p.speed * u + p.phase * span) % span) + span) % span;
        const y = top + d;
        if (y > floor) continue;
        const flip = Math.cos(s.t * p.spin + i);
        if ((flip >= 0) !== (side === 0)) continue;
        const grow = clamp01(d / (u * 0.05));
        const x = fx + Math.sin(s.t * 1.3 + i) * p.sway * u;
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
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = side === 0 ? PARTY[c]! : CONFETTI_BACK[c]!;
      ctx.fill();
    }
  }
}

/** Everything in the New Year's sky between the moon and the skyline. */
export function newYearSky(ctx: Ctx, s: Scene): void {
  fireworks(ctx, s);
  confettiFall(ctx, s);
}

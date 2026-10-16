import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { INK, PALETTE } from "./colors";
import { addLeaf, LEAF_BACKS, LEAF_COLORS } from "./leaves";

// The evening sky: a huge harvest moon rising from behind the farm, cartoon leaves blowing in
// and tumbling down, and now and then a faded V of geese crossing the moon.

/** Bright sky things stay out of the top-center HUD zone: below this, or right of HUD_RIGHT. */
const HUD_BAND = 0.32;
const HUD_RIGHT = 0.8;
/** The moon's visible halo reaches about this far out, in radii; it stays out of the band too. */
const HALO_REACH = 1.2;

// Cel-shaded moon: flat body, a shaded crescent on the lower right, a lit rim, soft seas.
const MOON_BODY = "#ffd47e";
const MOON_SHADE = "#f7ad5c";
const MOON_LIGHT = "#ffeab8";
const MOON_SEA = "#f6bb66";
const MOON_HALO = alpha("#ffe2a6", 0.85);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Rough top of the base cloud bank above the horizon (u) at fraction fx of the width. */
function cloudTop(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.1 + 0.26 * side * side;
}

/** Where the moon is this frame; shared with the geese so they cross its face. */
const moon = { x: 0, y: 0, r: 0 };

/**
 * Huge and low right of the tower at the start, rising out of the farm and the cloud bank.
 * As the camera climbs it slides right and shrinks first, then rises into the top-right corner,
 * so it never enters the HUD zone while it is up there.
 */
function placeMoon(s: Scene): typeof moon {
  // Measured from the start view (rise is 0 until the camera starts to climb).
  const slide = smooth(clamp01(s.rise / (s.u * 0.6)));
  const rise = smooth(clamp01((s.rise - s.u * 0.7) / (s.u * 1.5)));
  moon.r = s.u * (0.24 - 0.155 * slide);
  moon.x = Math.min(s.cssW * (0.66 + 0.24 * slide), s.cssW - moon.r - s.u * 0.015);
  const fx = moon.x / s.cssW;
  // Low: the cloud bank and hills hide its lower part (less of it as it slides toward the
  // corner, where the clouds pile higher). Kept out of the HUD band.
  const low = Math.min(
    s.horizonY - s.u * cloudTop(fx) - moon.r * (0.15 + 0.6 * slide),
    s.cssH * 0.62,
  );
  const below = s.cssH * HUD_BAND + moon.r * HALO_REACH;
  const lowSafe = Math.max(low, below + s.u * 0.01);
  const high = Math.max(s.cssH * 0.12, moon.r + s.u * 0.04);
  moon.y = lowSafe + (high - lowSafe) * rise;
  // While the moon is still left of the HUD's right edge, it may not rise into the band.
  if (moon.x - moon.r < s.cssW * HUD_RIGHT) moon.y = Math.max(moon.y, below);
  return moon;
}

// Seas and craters as fractions of the radius: [x, y, rx, ry, rotation].
const SEAS = [
  [-0.34, -0.3, 0.22, 0.14, 0.5],
  [0.16, -0.48, 0.17, 0.1, -0.25],
  [0.3, -0.08, 0.22, 0.14, 0.6],
  [-0.16, 0.04, 0.15, 0.11, 0.1],
  [-0.5, 0.18, 0.1, 0.08, 0],
] as const;
const CRATERS = [
  [-0.6, -0.12, 0.07],
  [0.52, -0.44, 0.06],
  [-0.06, -0.72, 0.05],
  [0.64, 0.12, 0.05],
  [0.08, 0.38, 0.06],
] as const;

export function harvestMoon(ctx: Ctx, s: Scene): void {
  const { x: cx, y: cy, r } = placeMoon(s);
  if (cy - r > s.cssH) return;

  // The one soft glow in the scene.
  ctx.save();
  ctx.shadowColor = MOON_HALO;
  ctx.shadowBlur = r * 0.7;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.clip();
  // Light, then the body, each offset to the upper left: a shaded crescent is left on the
  // lower right and a thin lit rim on the upper left.
  ctx.fillStyle = MOON_LIGHT;
  ctx.beginPath();
  circle(ctx, cx - r * 0.14, cy - r * 0.12, r * 0.97);
  ctx.fill();
  ctx.fillStyle = MOON_BODY;
  ctx.beginPath();
  circle(ctx, cx - r * 0.06, cy - r * 0.05, r * 0.86);
  ctx.fill();
  ctx.fillStyle = MOON_SEA;
  ctx.beginPath();
  for (const [mx, my, rx, ry, rot] of SEAS) oval(ctx, cx + mx * r, cy + my * r, rx * r, ry * r, rot);
  for (const [mx, my, cr] of CRATERS) circle(ctx, cx + mx * r, cy + my * r, cr * r);
  ctx.fill();
  ctx.restore();
}

// Leaves blown in from the side edges below the title, curling inward on the wind as they
// fall. They stay out of the top-center HUD zone: they only reach the middle further down.

/** Leaves in the air near the ground; more are swept up as the tower climbs into open sky. */
const LEAVES_LOW = 12;
const DRIFT = Array.from({ length: 22 }, (_, i) => {
  const h = (k: number) => hash(i * 17 + k);
  return {
    side: i % 2 ? 1 : -1,
    x0: -0.02 + h(1) * 0.05,
    drift: 0.18 + h(2) * 0.3,
    period: 12 + h(3) * 10,
    off: h(4) * 40,
    size: 0.046 + h(5) * 0.026,
    color: Math.floor(h(6) * LEAF_COLORS.length) % LEAF_COLORS.length,
    oak: h(7) > 0.6,
    sway: 0.012 + h(8) * 0.014,
    swayF: 0.9 + h(9) * 0.8,
    rockF: 1.2 + h(10) * 1.1,
    flipF: 1.4 + h(11) * 1.6,
    spin: h(12) > 0.7 ? (h(13) - 0.5) * 3 : 0,
  };
});

/** Per-leaf state this frame, reused so drawing allocates nothing. */
const LEAF_NOW = DRIFT.map(() => ({ x: 0, y: 0, size: 0, angle: 0, flip: 0, on: false }));

export function driftingLeaves(ctx: Ctx, s: Scene): void {
  const W = s.cssW;
  const count = LEAVES_LOW + Math.round((DRIFT.length - LEAVES_LOW) * altitude01(s));
  const top = s.cssH * 0.19;
  const band = s.cssH * HUD_BAND;
  for (let i = 0; i < DRIFT.length; i++) {
    const d = DRIFT[i]!;
    const n = LEAF_NOW[i]!;
    n.on = false;
    if (i >= count) continue;
    const p = (s.t + d.off) / d.period;
    const k = p - Math.floor(p);
    n.size = d.size * s.u;
    // Fall through the open sky: from below the title to just past the horizon.
    n.y = top + k * (Math.max(s.horizonY, top) + n.size * 2 - top);
    if (n.y - n.size > s.horizonY) continue;
    // Hug the edge beside the HUD, then sweep inward across the sky below it.
    const fx =
      d.x0 + 0.1 * Math.min(1, (n.y - top) / (band - top)) + d.drift * Math.max(0, (n.y - band) / (s.cssH * 0.5));
    n.x = (d.side < 0 ? fx : 1 - fx) * W + Math.sin(s.t * d.swayF + d.off) * d.sway * W;
    n.angle = d.side * 0.5 + Math.sin(s.t * d.rockF + d.off * 3) * 0.75 + s.t * d.spin;
    const f = Math.cos(s.t * d.flipF + d.off);
    n.flip = (f < 0 ? -1 : 1) * (0.25 + 0.75 * Math.abs(f));
    n.on = true;
  }
  const lw = Math.max(1.1, s.u * 0.0032);
  // One fill and one ink pass per color and face (front, or the darker back when flipped).
  for (let c = 0; c < LEAF_COLORS.length; c++) {
    for (let face = 0; face < 2; face++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < DRIFT.length; i++) {
        const n = LEAF_NOW[i]!;
        if (!n.on || DRIFT[i]!.color !== c || (n.flip < 0 ? 1 : 0) !== face) continue;
        addLeaf(ctx, DRIFT[i]!.oak, n.x, n.y, n.size, n.angle, n.flip);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = face ? LEAF_BACKS[c]! : LEAF_COLORS[c]!;
      ctx.fill();
      ink(ctx, lw, INK);
    }
  }
}

// A faded V of geese crossing in front of the moon every so often.
const GEESE_PERIOD = 26; // seconds between flights
const GEESE_FLIGHT = 12; // seconds to cross the screen
const GEESE = 7;
const GOOSE = mix(PALETTE.far, PALETTE.skyTop, 0.3);

export function geese(ctx: Ctx, s: Scene): void {
  const cycle = Math.floor(s.t / GEESE_PERIOD);
  const tt = s.t - cycle * GEESE_PERIOD;
  if (tt > GEESE_FLIGHT) return;
  const k = tt / GEESE_FLIGHT;
  const m = placeMoon(s);
  const dir = hash(cycle * 7 + 3) < 0.6 ? -1 : 1;
  const g = s.u * 0.05; // body length
  const span = s.cssW + g * 14;
  const lx = dir > 0 ? -g * 2 + k * span : s.cssW + g * 2 - k * span;
  const ly = Math.max(
    s.cssH * HUD_BAND + g * 3,
    m.y - m.r * (0.3 + 0.3 * hash(cycle * 5 + 1)) + Math.sin(k * 5) * s.u * 0.008,
  );
  if (ly > s.horizonY - g) return;

  ctx.beginPath();
  for (let j = 0; j < GEESE; j++) {
    const rank = Math.ceil(j / 2);
    const side = j % 2 ? 1 : -1;
    const x = lx - dir * rank * g * 1.05;
    const y = ly + side * rank * g * 0.38 + Math.sin(s.t * 1.3 + j) * g * 0.05;
    const beat = s.t * 7 + j * 1.1;
    goose(ctx, x, y, g, dir, Math.sin(beat), Math.sin(beat - 0.6));
  }
  ctx.fillStyle = GOOSE;
  ctx.fill();
}

/**
 * Goose in flight facing `dir`: body, outstretched neck and head, tail, and two broad swept
 * wings beating up and down (flap -1..1), the far wing a beat behind the near one.
 */
function goose(ctx: Ctx, x: number, y: number, g: number, dir: number, flap: number, far: number): void {
  // Every part winds the same way (clockwise facing right, mirrored facing left), so the
  // nonzero fill covers the overlaps without holes.
  const d = dir * g;
  ctx.moveTo(x + g * 0.27, y);
  ctx.ellipse(x, y, g * 0.27, g * 0.09, 0, 0, Math.PI * 2, dir < 0);
  // Neck and head
  ctx.moveTo(x + d * 0.16, y - g * 0.05);
  ctx.lineTo(x + d * 0.46, y - g * 0.075);
  ctx.lineTo(x + d * 0.56, y - g * 0.09);
  ctx.lineTo(x + d * 0.68, y - g * 0.055);
  ctx.lineTo(x + d * 0.54, y - g * 0.025);
  ctx.lineTo(x + d * 0.44, y - g * 0.03);
  ctx.lineTo(x + d * 0.16, y + g * 0.045);
  ctx.closePath();
  // Tail
  ctx.moveTo(x - d * 0.2, y + g * 0.05);
  ctx.lineTo(x - d * 0.38, y - g * 0.01);
  ctx.lineTo(x - d * 0.2, y - g * 0.04);
  ctx.closePath();
  wing(ctx, x, y, g, d, far, 0.8);
  wing(ctx, x, y, g, d, flap, 1);
}

/** One swept wing; `d` is the facing-signed body length, f the beat (-1 down .. 1 up). */
function wing(ctx: Ctx, x: number, y: number, g: number, d: number, f: number, k: number): void {
  const lift = f * g * 0.5 * k;
  const sweep = d * (0.16 + 0.08 * Math.abs(f)) * k;
  const sx = x + d * 0.12; // shoulder
  const sy = y - g * 0.02;
  const tx = x - sweep; // wingtip
  const ty = y - lift;
  const rx = x - d * 0.16; // root of the trailing edge
  const lx = x + d * 0.02; // leading-edge control
  const ly = y - lift * 0.8;
  const qx = x - sweep * 0.7; // trailing-edge control
  const qy = y - lift * 0.4;
  if (f > 0) {
    ctx.moveTo(rx, y);
    ctx.quadraticCurveTo(qx, qy, tx, ty);
    ctx.quadraticCurveTo(lx, ly, sx, sy);
  } else {
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(lx, ly, tx, ty);
    ctx.quadraticCurveTo(qx, qy, rx, y);
  }
  ctx.closePath();
}

import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { BLUE, CYAN, MAGENTA, MOON, MOON_SHADE, PALETTE, PURPLE, RED } from "./colors";
import { boardSign } from "./signs";
import { tint } from "./tube";

// The sky over the megacity: a small hazy moon veiled by smog, smog banks lit purple from
// below, and air traffic: hover cars gliding along lanes stacked above the skyline, little
// delivery drones, and now and then an airship with a glyph ticker on its flank. Everything
// hangs at fixed heights over the horizon (it sinks with the horizon as you climb), so a tall
// tower climbs up through the traffic. Nothing bright enters the HUD band at the top.

/** Moon radius and center: right of the HUD column, above the low right-hand rooftops. */
export function moonSpot(s: Scene): { x: number; y: number; r: number } {
  const r = s.u * 0.062;
  const start = s.horizonY - HORIZON_P * s.rise; // where the horizon sat at the start
  MOON_SPOT.r = r;
  MOON_SPOT.x = Math.round(s.cssW / 2 + s.u * 0.36);
  // Rounded so the cached halo is reused while the screen size holds.
  MOON_SPOT.y = Math.round(Math.max(s.cssH * 0.13 + r, Math.min(s.cssH * 0.32 + r * 0.3, start - s.u * 0.44)));
  return MOON_SPOT;
}
const MOON_SPOT = { x: 0, y: 0, r: 1 };

const MARIA = [
  { x: -0.28, y: -0.18, rx: 0.3, ry: 0.2, rot: 0.5 },
  { x: 0.22, y: 0.16, rx: 0.26, ry: 0.18, rot: -0.3 },
  { x: -0.12, y: 0.46, rx: 0.2, ry: 0.11, rot: 0.15 },
];
const VEIL = mix(PALETTE.skyMid, "#000000", 0.2);

// One cached halo: the moon only moves when the screen changes size.
const HALO_R = 3.4;
const HALO_AT = { x: NaN, y: NaN, r: NaN };
let halo: CanvasGradient | null = null;

export function hazyMoon(ctx: Ctx, s: Scene): void {
  const { x, y, r } = moonSpot(s);
  if (y - r * HALO_R > s.cssH) return;

  if (!halo || HALO_AT.x !== x || HALO_AT.y !== y || HALO_AT.r !== r) {
    halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * HALO_R);
    halo.addColorStop(0, alpha(mix(MOON, PURPLE, 0.4), 0.16));
    halo.addColorStop(0.45, alpha(PURPLE, 0.05));
    halo.addColorStop(1, alpha(PURPLE, 0));
    HALO_AT.x = x;
    HALO_AT.y = y;
    HALO_AT.r = r;
  }
  // A disc, not a square: the gradient is clear past HALO_R anyway, and this paints less.
  ctx.fillStyle = halo;
  ctx.beginPath();
  circle(ctx, x, y, r * HALO_R);
  ctx.fill();

  // A pale disc seen through smog: low contrast, never the brightest thing.
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
  ctx.fill();

  // Thin veils of smog sliding across its face, seen only against the disc (past its rim
  // they would be dark streaks hanging in the sky).
  ctx.save();
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.clip();
  ctx.fillStyle = VEIL;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const vy = y + r * (i === 0 ? -0.3 : 0.42);
    const vx = x + Math.sin(s.t * 0.05 + i * 2.1) * r * 0.9 + (i === 0 ? -r * 0.5 : r * 0.4);
    oval(ctx, vx, vy, r * (i === 0 ? 1.1 : 1.6), r * (i === 0 ? 0.06 : 0.1));
  }
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.restore();
}

// Smog banks lit from below: long thin bands at heights over the horizon (u), drifting.
const SMOG = Array.from({ length: 16 }, (_, i) => ({
  h: 0.05 + i * 0.16 + hash(i + 700) * 0.08,
  x: hash(i + 710),
  w: 0.7 + hash(i + 720) * 0.7,
  th: 0.007 + hash(i + 730) * 0.012,
  speed: (0.004 + hash(i + 740) * 0.008) * (hash(i + 750) > 0.5 ? 1 : -1),
}));
const SMOG_LIT = mix(PALETTE.skyBottom, PURPLE, 0.3);

function smog(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const span = s.cssW + u * 1.6;
  ctx.fillStyle = SMOG_LIT;
  // Two passes: a wide faint body, then a thinner denser core.
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass === 0 ? 0.1 : 0.14;
    ctx.beginPath();
    for (let i = 0; i < SMOG.length; i++) {
      const b = SMOG[i]!;
      const y = s.horizonY - b.h * u;
      if (y < s.cssH * 0.12 || y > s.cssH + u * 0.05) continue;
      const w = b.w * u * (pass === 0 ? 1 : 0.8);
      const x = ((((b.x * span + s.t * b.speed * u) % span) + span) % span) - u * 0.8;
      oval(ctx, x + b.w * u * 0.5, y, w / 2, b.th * u * (pass === 0 ? 2.2 : 1));
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Traffic lanes: lane k flies at LANE0 + k * LANE_GAP u over the horizon.
const LANE0 = 0.2;
const LANE_GAP = 0.13;
const CARS_PER_LANE = 3;
const HEAD = "#dff4ff";
const HULL = "#15122a";
const GLOWS = [CYAN, MAGENTA, PURPLE] as const;

/** The HUD band: nothing bright flies above this line. */
function hudLine(s: Scene): number {
  return s.cssH * 0.32;
}

/** Scratch range for `laneRange()`, reused so nothing is allocated per frame. */
const RANGE = { min: 0, max: -1 };

/** Indices of the lanes (h0 + k * gap u over the horizon) between the HUD band and the bottom. */
function laneRange(s: Scene, h0: number, gap: number): typeof RANGE {
  const u = s.u;
  RANGE.min = Math.max(0, Math.ceil(((s.horizonY - s.cssH) / u - h0) / gap));
  RANGE.max = Math.floor(((s.horizonY - hudLine(s)) / u - h0) / gap);
  return RANGE;
}

/** Screen x of car `c` in lane `k`, or NaN when that slot is empty. */
function carX(s: Scene, k: number, c: number): number {
  if (hash(k * 13.7 + c * 3.1) < 0.3) return NaN;
  const span = s.cssW + s.u * 0.3;
  const speed = s.u * (0.04 + hash(k * 7.3) * 0.05);
  const x = (((hash(k * 5.9 + c * 11.3) * span + s.t * speed) % span) + span) % span;
  return (hash(k * 2.3) > 0.5 ? x : span - x) - s.u * 0.15;
}

// Unit wedge (facing right), as in car.ts but simpler for the far lanes.
const WEDGE = [
  [-0.5, 0.06],
  [-0.42, -0.1],
  [0.0, -0.2],
  [0.3, -0.16],
  [0.52, 0.02],
  [0.42, 0.12],
  [-0.42, 0.12],
] as const;

/** Far air traffic: dark wedges with a headlight, a tail-light and a neon underglow. */
function traffic(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const { min: kMin, max: kMax } = laneRange(s, LANE0, LANE_GAP);
  if (kMax < kMin) return;
  // Pass 0 hulls, 1-3 underglow per color, 4 headlights, 5 tail-lights.
  for (let pass = 0; pass < 6; pass++) {
    ctx.beginPath();
    for (let k = kMin; k <= kMax; k++) {
      if (pass >= 1 && pass <= 3 && k % 3 !== pass - 1) continue;
      const y0 = s.horizonY - (LANE0 + k * LANE_GAP) * u;
      const dir = hash(k * 2.3) > 0.5 ? 1 : -1;
      const L = u * (0.032 + hash(k * 4.4) * 0.018);
      for (let c = 0; c < CARS_PER_LANE; c++) {
        const x = carX(s, k, c);
        if (Number.isNaN(x)) continue;
        const y = y0 + (c % 2) * u * 0.02 + Math.sin(s.t * 1.3 + k + c) * u * 0.003;
        if (y < hudLine(s)) continue;
        if (pass === 0) {
          for (let i = 0; i < WEDGE.length; i++) {
            const [px, py] = WEDGE[i]!;
            if (i === 0) ctx.moveTo(x + px * L * dir, y + py * L);
            else ctx.lineTo(x + px * L * dir, y + py * L);
          }
          ctx.closePath();
        } else if (pass <= 3) {
          ctx.moveTo(x - 0.34 * L, y + 0.17 * L);
          ctx.lineTo(x + 0.34 * L, y + 0.17 * L);
        } else if (pass === 4) {
          circle(ctx, x + 0.48 * L * dir, y, Math.max(0.8, L * 0.05));
        } else {
          circle(ctx, x - 0.47 * L * dir, y + 0.03 * L, Math.max(0.8, L * 0.05));
        }
      }
    }
    if (pass === 0) {
      ctx.fillStyle = HULL;
      ctx.fill();
    } else if (pass <= 3) {
      ctx.strokeStyle = GLOWS[pass - 1]!;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(1, u * 0.003);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = pass === 4 ? HEAD : RED;
      ctx.fill();
    }
  }
}

// Delivery drones hovering at the sides: heights (u over the horizon) repeat every DRONE_GAP.
const DRONE0 = 0.55;
const DRONE_GAP = 0.45;

function drones(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const { min: kMin, max: kMax } = laneRange(s, DRONE0, DRONE_GAP);
  const blink = Math.sin(s.t * 5) > 0.3;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let k = kMin; k <= kMax; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const x = s.cssW / 2 + side * u * (0.33 + hash(k * 3.9) * 0.1) + Math.sin(s.t * 0.4 + k) * u * 0.02;
      const y = s.horizonY - (DRONE0 + k * DRONE_GAP + hash(k * 6.1) * 0.1) * u + Math.sin(s.t * 1.7 + k * 2) * u * 0.006;
      if (y < hudLine(s) || y > s.cssH) continue;
      const w = u * 0.03;
      if (pass === 0) {
        ctx.rect(x - w * 0.35, y - w * 0.12, w * 0.7, w * 0.3);
        ctx.rect(x - w, y - w * 0.3, w * 0.6, w * 0.1);
        ctx.rect(x + w * 0.4, y - w * 0.3, w * 0.6, w * 0.1);
        ctx.rect(x - w * 0.72, y - w * 0.3, w * 0.08, w * 0.25);
        ctx.rect(x + w * 0.64, y - w * 0.3, w * 0.08, w * 0.25);
      } else {
        circle(ctx, x, y + w * 0.22, Math.max(0.9, w * (blink === (k % 2 === 0) ? 0.16 : 0.09)));
      }
    }
    if (pass === 0) {
      ctx.fillStyle = HULL;
      ctx.fill();
    } else {
      ctx.fillStyle = CYAN;
      ctx.fill();
    }
  }
}

// Airships: one every AIRSHIP_GAP u of height, drifting slowly to and fro.
const AIRSHIP0 = 0.75;
const AIRSHIP_GAP = 1.6;
const SHIP = "#0c0a18";
const SHIP_EDGE = "#2c2552";

function airships(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const { min: kMin, max: kMax } = laneRange(s, AIRSHIP0, AIRSHIP_GAP);
  for (let k = kMin; k <= kMax; k++) {
    const y = s.horizonY - (AIRSHIP0 + k * AIRSHIP_GAP) * u;
    const L = u * 0.36;
    if (y - L * 0.2 < hudLine(s) || y - L * 0.2 > s.cssH) continue;
    // It drifts slowly back and forth on the wind, always whole on screen.
    const dir = k % 2 === 0 ? 1 : -1;
    const reach = Math.max(0, s.cssW / 2 - L * 0.6 - u * 0.02);
    const x = s.cssW / 2 + Math.sin(s.t * 0.025 + hash(k * 8.1) * 6) * reach;
    // Hull, tail fins and gondola
    ctx.beginPath();
    oval(ctx, x, y, L * 0.5, L * 0.12);
    ctx.moveTo(x - dir * L * 0.38, y - L * 0.05);
    ctx.lineTo(x - dir * L * 0.56, y - L * 0.17);
    ctx.lineTo(x - dir * L * 0.5, y);
    ctx.lineTo(x - dir * L * 0.56, y + L * 0.17);
    ctx.lineTo(x - dir * L * 0.38, y + L * 0.05);
    ctx.closePath();
    ctx.rect(x - L * 0.12, y + L * 0.1, L * 0.24, L * 0.05);
    ctx.fillStyle = SHIP;
    ctx.fill();
    ctx.strokeStyle = SHIP_EDGE;
    ctx.lineWidth = Math.max(1, u * 0.002);
    ctx.stroke();
    // A glyph ticker on the flank and running lights
    boardSign(ctx, x - L * 0.22, y - L * 0.045, L * 0.44, L * 0.09, k % 2 === 0 ? MAGENTA : BLUE, 70 + k, s.t, 0.8);
    ctx.beginPath();
    circle(ctx, x + dir * L * 0.49, y, Math.max(1, u * 0.004));
    circle(ctx, x - dir * L * 0.55, y - L * 0.16, Math.max(1, u * 0.004));
    ctx.fillStyle = tint(RED, Math.sin(s.t * 2.4 + k) > 0 ? 0.95 : 0.35);
    ctx.fill();
    // Its belly lights the smog
    ctx.beginPath();
    ctx.moveTo(x - L * 0.06, y + L * 0.15);
    ctx.lineTo(x + L * 0.06, y + L * 0.15);
    ctx.lineTo(x + L * 0.2, y + L * 0.7);
    ctx.lineTo(x - L * 0.2, y + L * 0.7);
    ctx.closePath();
    ctx.fillStyle = tint(CYAN, 0.04);
    ctx.fill();
  }
}

// Two searchlights sweeping slowly up from the city into the smog: (x in u, phase, beam fill).
const BEAMS = [
  { x: -0.36, phase: 0, fill: alpha(BLUE, 0.05) },
  { x: 0.3, phase: 2.4, fill: alpha(PURPLE, 0.05) },
] as const;

/** Faint searchlight beams leaning out to the sides, never into the HUD column. */
function searchlights(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  if (hy - u * 0.2 > s.cssH) return;
  for (const b of BEAMS) {
    const side = b.x < 0 ? -1 : 1;
    const a = side * (0.18 + 0.16 * (0.5 + 0.5 * Math.sin(s.t * 0.23 + b.phase)));
    const x0 = s.cssW / 2 + b.x * u;
    const y0 = hy - u * 0.12;
    const L = u * 0.95;
    const spread = 0.05;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.sin(a - spread) * L, y0 - Math.cos(a - spread) * L);
    ctx.lineTo(x0 + Math.sin(a + spread) * L, y0 - Math.cos(a + spread) * L);
    ctx.closePath();
    ctx.fillStyle = b.fill;
    ctx.fill();
  }
}

export function cyberSky(ctx: Ctx, s: Scene): void {
  searchlights(ctx, s);
  smog(ctx, s);
  airships(ctx, s);
  traffic(ctx, s);
  drones(ctx, s);
}

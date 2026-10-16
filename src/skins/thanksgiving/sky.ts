import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { INK, PALETTE } from "./colors";
import { addLeaf, LEAF_BACKS, LEAF_COLORS } from "./leaves";

// The afternoon sky over the hollow: a low comic-strip sun resting on the clouds at the right
// (it sets as you climb, and a pale moon rises at the left into the dusk), leaves blowing in
// and tumbling down, and now and then a faded V of geese heading south.

/** Bright sky things stay out of the top-center HUD zone: below this, or outside 0.2..0.8 of the width. */
const HUD_BAND = 0.32;
const HUD_RIGHT = 0.8;
const HUD_LEFT = 0.2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

const SUN = "#ffe58e";
const SUN_LIGHT = "#fff6cf";
const SUN_SHADE = "#ffc76a";
const SUN_HALO = alpha("#fff3c4", 0.35);
const RAYS = alpha("#fff0b8", 0.75);
const RAY_N = 12;

/**
 * The sun sits low at the right, just outside the HUD's columns, resting on the cloud pile.
 * It sinks a little faster than the horizon as the camera climbs, so it sets behind the clouds.
 */
export function sun(ctx: Ctx, s: Scene): void {
  const r = s.u * 0.072;
  const x = Math.max(s.cssW * HUD_RIGHT + r, s.cssW - r * 1.64);
  // Where its rays reach into the HUD's columns (short screens), keep it below the HUD band.
  const reach = r * 1.56;
  let y = s.horizonY - s.u * 0.4 + s.rise * 0.2;
  if (x - reach < s.cssW * HUD_RIGHT) y = Math.max(y, s.cssH * HUD_BAND + reach);
  if (y - r * 1.6 > s.cssH) return;

  // A soft flat halo, then short rays turning slowly: a comic-strip sun.
  ctx.fillStyle = SUN_HALO;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.32);
  ctx.fill();
  ctx.beginPath();
  const spin = s.t * 0.08;
  for (let i = 0; i < RAY_N; i++) {
    const a = spin + (i * Math.PI * 2) / RAY_N;
    const r0 = r * 1.18;
    const r1 = i % 2 ? r * 1.42 : reach;
    const w = 0.07;
    ctx.moveTo(x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.lineTo(x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0);
    ctx.closePath();
  }
  ctx.fillStyle = RAYS;
  ctx.fill();

  ctx.fillStyle = SUN_SHADE;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = SUN;
  ctx.beginPath();
  circle(ctx, x - r * 0.06, y - r * 0.07, r * 0.9);
  ctx.fill();
  ctx.fillStyle = SUN_LIGHT;
  ctx.beginPath();
  oval(ctx, x - r * 0.34, y - r * 0.36, r * 0.32, r * 0.2, -0.6);
  ctx.fill();
}

const MOON = "#fff3d2";
const MOON_SEA = "#efdcae";
const MOON_HALO = alpha("#fff0c0", 0.13);

/**
 * A pale moon rises at the left as the camera climbs into the dusk, always left of the HUD
 * columns. Hidden behind the clouds at the start.
 */
export function moon(ctx: Ctx, s: Scene): void {
  const r = s.u * 0.05;
  const x = Math.min(s.cssW * HUD_LEFT - r * 1.5, s.u * 0.1);
  const up = smooth(clamp01(s.rise / (s.u * 2.2)));
  const low = s.horizonY - s.u * 0.12;
  const high = s.cssH * 0.14;
  const y = low + (high - low) * up;
  if (y - r * 1.5 > s.cssH || up <= 0) return;
  ctx.fillStyle = MOON_HALO;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.22);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = MOON_SEA;
  ctx.beginPath();
  circle(ctx, x - r * 0.3, y - r * 0.2, r * 0.22);
  circle(ctx, x + r * 0.28, y + r * 0.3, r * 0.17);
  circle(ctx, x + r * 0.32, y - r * 0.36, r * 0.1);
  ctx.fill();
}

// Leaves blown in from the side edges below the title, curling inward on the wind as they
// fall. They stay out of the top-center HUD zone: they only reach the middle further down.

/** Leaves in the air near the ground; more are swept up as the tower climbs into open sky. */
const LEAVES_LOW = 8;
const DRIFT = Array.from({ length: 18 }, (_, i) => {
  const h = (k: number) => hash(i * 17 + k);
  return {
    side: i % 2 ? 1 : -1,
    x0: -0.02 + h(1) * 0.05,
    drift: 0.18 + h(2) * 0.3,
    period: 12 + h(3) * 10,
    off: h(4) * 40,
    size: 0.04 + h(5) * 0.022,
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
  const lw = Math.max(1.1, s.u * 0.003);
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

// A faded V of geese heading south every so often, across the open sky below the HUD.
const GEESE_PERIOD = 28; // seconds between flights
const GEESE_FLIGHT = 13; // seconds to cross the screen
const GEESE = 7;
const GOOSE = mix(PALETTE.far, "#4a3a6e", 0.35);

export function geese(ctx: Ctx, s: Scene): void {
  const cycle = Math.floor(s.t / GEESE_PERIOD);
  const tt = s.t - cycle * GEESE_PERIOD;
  if (tt > GEESE_FLIGHT) return;
  const k = tt / GEESE_FLIGHT;
  const dir = hash(cycle * 7 + 3) < 0.6 ? -1 : 1;
  const g = s.u * 0.042; // body length
  const span = s.cssW + g * 14;
  const lx = dir > 0 ? -g * 2 + k * span : s.cssW + g * 2 - k * span;
  const lowest = Math.min(s.horizonY - s.u * 0.42, s.cssH * 0.6);
  const ly = Math.max(
    s.cssH * HUD_BAND + g * 2,
    lowest - s.u * 0.12 * hash(cycle * 5 + 1) + Math.sin(k * 5) * s.u * 0.008,
  );
  if (ly > s.horizonY - g * 3) return;

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

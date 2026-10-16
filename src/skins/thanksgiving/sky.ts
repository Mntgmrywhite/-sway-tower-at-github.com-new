import { alpha, circle, hash, mix, neonShape, neonStroke, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { addLeaf, LEAF_COLORS, LEAF_FILLS } from "./leaves";

// Harvest night sky: a huge low harvest moon cut by synthwave bands, leaves blowing in and
// tumbling down across the sky, and now and then a V of geese crossing the moon.

const TAU = Math.PI * 2;

const MOON_TOP = "#ffe9a8";
const MOON_MID = "#ffab3a";
const MOON_LOW = "#ff4f1c";
const MOON_RIM = "#ffc95a";
const MOON_HALO = "#ff8a2a";

/** Bright sky things stay below this fraction of the screen height (title, score, lives). */
const HUD_BAND = 0.33;

/** Where the moon is this frame; shared with the geese so they cross its face. */
const moon = { x: 0, y: 0, r: 0, a: 0 };

/** Huge and low at the start; it climbs, shrinks and pales a little as the tower rises. */
function placeMoon(s: Scene): typeof moon {
  const a = altitude01(s);
  moon.a = a;
  moon.r = s.u * (0.27 - 0.06 * a);
  moon.x = s.cssW * (0.63 + 0.06 * a);
  moon.y = s.horizonY - moon.r * (0.55 + 1.25 * a * a);
  // On short screens, sink it behind the hills rather than rise into the HUD band.
  moon.y = Math.max(moon.y, s.cssH * HUD_BAND + moon.r);
  return moon;
}

// Darker seas and a few crater rings, as fractions of the radius.
const MARIA = [
  [-0.38, -0.32, 0.24, 0.15, 0.5],
  [0.12, -0.5, 0.2, 0.11, -0.25],
  [0.34, -0.12, 0.26, 0.15, 0.6],
  [-0.12, -0.02, 0.17, 0.12, 0.1],
  [-0.55, 0.12, 0.12, 0.09, 0],
] as const;
const CRATERS = [
  [-0.62, -0.08, 0.07],
  [0.5, -0.46, 0.06],
  [-0.08, -0.74, 0.05],
  [0.66, 0.08, 0.05],
  [0.18, -0.24, 0.04],
] as const;

export function harvestMoon(ctx: Ctx, s: Scene): void {
  const m = placeMoon(s);
  const { x: cx, y: cy, r } = m;
  if (cy - r * 2.6 > s.cssH) return;

  // Warm halo
  const H = r * 2.7;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, H);
  halo.addColorStop(0, alpha(MOON_HALO, 0.38));
  halo.addColorStop(0.35, alpha(MOON_HALO, 0.12));
  halo.addColorStop(1, alpha(MOON_HALO, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - H, cy - H, H * 2, H * 2);

  // Everything on the disc is cut by bands that thicken toward the horizon.
  ctx.save();
  const R = r * 1.5;
  const cut = cy - r * 0.08;
  ctx.beginPath();
  ctx.rect(cx - R, cy - R, R * 2, cut - (cy - R));
  let y = cut;
  for (let i = 0; y < cy + r; i++) {
    const gap = r * (0.03 + i * 0.026);
    const band = r * 0.13;
    ctx.rect(cx - R, y + gap, R * 2, band);
    y += gap + band;
  }
  ctx.clip();

  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, mix(MOON_TOP, "#fff6dc", m.a * 0.5));
  g.addColorStop(0.5, mix(MOON_MID, "#ffd27a", m.a * 0.4));
  g.addColorStop(1, MOON_LOW);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  for (const [mx, my, rx, ry, rot] of MARIA) oval(ctx, cx + mx * r, cy + my * r, rx * r, ry * r, rot);
  ctx.fillStyle = alpha("#c2410f", 0.26);
  ctx.fill();

  ctx.beginPath();
  for (const [mx, my, cr] of CRATERS) circle(ctx, cx + mx * r, cy + my * r, cr * r);
  ctx.strokeStyle = alpha("#a8300c", 0.45);
  ctx.lineWidth = Math.max(1, r * 0.014);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  neonStroke(ctx, MOON_RIM, Math.max(1.5, s.u * 0.0055), 3.2);
  ctx.restore();
}

// Leaves blown in from the side edges below the title, curling inward on the wind as they
// fall. They stay out of the top-center HUD band: they only reach the middle further down.

/** Leaves in the air near the ground; more are swept up as the tower climbs into open sky. */
const LEAVES_LOW = 12;
const DRIFT = Array.from({ length: 22 }, (_, i) => {
  const h = (k: number) => hash(i * 17 + k);
  return {
    side: i % 2 ? 1 : -1,
    x0: -0.05 + h(1) * 0.05,
    drift: 0.18 + h(2) * 0.3,
    period: 12 + h(3) * 10,
    off: h(4) * 40,
    size: 0.036 + h(5) * 0.026,
    color: Math.floor(h(6) * LEAF_COLORS.length) % LEAF_COLORS.length,
    oak: h(7) > 0.6,
    sway: 0.012 + h(8) * 0.014,
    swayF: 0.9 + h(9) * 0.8,
    rockF: 1.2 + h(10) * 1.1,
    flipF: 1.4 + h(11) * 1.6,
    spin: h(12) > 0.7 ? (h(13) - 0.5) * 3 : 0,
  };
});

export function driftingLeaves(ctx: Ctx, s: Scene): void {
  const W = s.cssW;
  const width = Math.max(1, s.u * 0.003);
  const count = LEAVES_LOW + Math.round((DRIFT.length - LEAVES_LOW) * altitude01(s));
  for (let c = 0; c < LEAF_COLORS.length; c++) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < count; i++) {
      const d = DRIFT[i]!;
      if (d.color !== c) continue;
      const p = (s.t + d.off) / d.period;
      const k = p - Math.floor(p);
      const size = d.size * s.u;
      // Fall through the open sky: from below the title to just past the horizon.
      const top = s.cssH * 0.19;
      const y = top + k * (Math.max(s.horizonY, top) + size * 2 - top);
      if (y - size > s.horizonY) continue;
      // Hug the edge beside the HUD, then sweep inward across the sky below it.
      const band = s.cssH * 0.32;
      const fx =
        d.x0 + 0.12 * Math.min(1, (y - top) / (band - top)) + d.drift * Math.max(0, (y - band) / (s.cssH * 0.5));
      const x = (d.side < 0 ? fx : 1 - fx) * W + Math.sin(s.t * d.swayF + d.off) * d.sway * W;
      const angle = d.side * 0.5 + Math.sin(s.t * d.rockF + d.off * 3) * 0.75 + s.t * d.spin;
      const f = Math.cos(s.t * d.flipF + d.off);
      addLeaf(ctx, d.oak, x, y, size, angle, (f < 0 ? -1 : 1) * (0.25 + 0.75 * Math.abs(f)));
      any = true;
    }
    if (any) neonShape(ctx, LEAF_FILLS[c]!, LEAF_COLORS[c]!, width);
  }
}

// A V of geese crossing in front of the moon every so often.
const GEESE_PERIOD = 26; // seconds between flights
const GEESE_FLIGHT = 12; // seconds to cross the screen
const GEESE = 9;

export function geese(ctx: Ctx, s: Scene): void {
  const cycle = Math.floor(s.t / GEESE_PERIOD);
  const tt = s.t - cycle * GEESE_PERIOD;
  if (tt > GEESE_FLIGHT) return;
  const k = tt / GEESE_FLIGHT;
  const m = placeMoon(s);
  const dir = hash(cycle * 7 + 3) < 0.6 ? -1 : 1;
  const g = s.u * 0.056; // body length
  const span = s.cssW + g * 14;
  const lx = dir > 0 ? -g * 2 + k * span : s.cssW + g * 2 - k * span;
  const ly = Math.max(
    s.cssH * HUD_BAND + g * 2,
    m.y - m.r * (0.3 + 0.3 * hash(cycle * 5 + 1)) + Math.sin(k * 5) * s.u * 0.008,
  );
  if (ly > s.horizonY) return;

  ctx.beginPath();
  for (let j = 0; j < GEESE; j++) {
    const rank = Math.ceil(j / 2);
    const side = j % 2 ? 1 : -1;
    const x = lx - dir * rank * g * 1.05;
    const y = ly + side * rank * g * 0.38 + Math.sin(s.t * 1.3 + j) * g * 0.05;
    const beat = s.t * 7 + j * 1.1;
    goose(ctx, x, y, g, dir, Math.sin(beat), Math.sin(beat - 0.6));
  }
  // Rim first, then the dark fill over it: only the outer edge of the silhouette glows.
  neonStroke(ctx, "#ffa45a", Math.max(1.2, s.u * 0.0042), 2.6);
  ctx.fillStyle = "#13050c";
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
  ctx.ellipse(x, y, g * 0.27, g * 0.085, 0, 0, TAU, dir < 0);
  // Neck and head
  ctx.moveTo(x + d * 0.16, y - g * 0.05);
  ctx.lineTo(x + d * 0.46, y - g * 0.075);
  ctx.lineTo(x + d * 0.56, y - g * 0.085);
  ctx.lineTo(x + d * 0.66, y - g * 0.055);
  ctx.lineTo(x + d * 0.54, y - g * 0.03);
  ctx.lineTo(x + d * 0.44, y - g * 0.03);
  ctx.lineTo(x + d * 0.16, y + g * 0.04);
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

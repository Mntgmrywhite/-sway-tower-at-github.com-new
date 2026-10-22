import { hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { moonAt, swirl } from "./sky";
import type { Tone } from "./tone";

// The sky's weather, all far away (flat fills, a moonlit edge, no outline), painted before the moon
// so nothing here ever crosses its disc:
//  - cloud ribbons round the moon: long thin bands lying on arcs just outside its halo's inner
//    rings, lit along the edge that faces it, drifting a little round it and back;
//  - storm clouds (the storm over the spires, and the loop's storm): heavy rolls of cloud that pile
//    in from the screen's sides into both lanes, lit along their tops by the moon, and ring it;
//  - the spiral calm: the storm wound up into huge Burton spirals out in the lanes, turning slowly.

// ---------------------------------------------------------------- the ribbons round the moon

/** Ribbons: middle angle (rad, 0 to the right, down positive), half-span (rad), radius and thickness (in moon radii), drift phase. */
const RIBBONS = [
  { a: -0.62, span: 0.62, r: 1.26, th: 0.12, ph: 0.3 },
  { a: 3.75, span: 0.42, r: 1.34, th: 0.1, ph: 2.1 },
  { a: 0.72, span: 0.36, r: 1.2, th: 0.09, ph: 4.2 },
] as const;
const RIB_N = 12;
/** Each ribbon point's thickness profile: thickest in the middle, pinched at both ends. */
const RIB_TH = Float64Array.from({ length: RIB_N + 1 }, (_, i) => Math.pow(Math.sin((i / RIB_N) * Math.PI), 0.7));

/** One ribbon: a crescent band round (cx, cy) from angle a0 to a1, thickest in its middle. */
function ribbonPath(ctx: Ctx, cx: number, cy: number, a0: number, a1: number, r: number, th: number, wob: number): void {
  for (let i = 0; i <= RIB_N; i++) {
    const f = i / RIB_N;
    const a = a0 + (a1 - a0) * f;
    const rr = r + Math.sin(f * 9 + wob) * th * 0.18;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = RIB_N; i >= 0; i--) {
    const f = i / RIB_N;
    const a = a0 + (a1 - a0) * f;
    const t = th * RIB_TH[i]!;
    const rr = r + t + Math.sin(f * 9 + wob) * th * 0.18;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** The ribbons round the moon, at the tone's strength: the body, then its lit inner edge. */
export function ribbons(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.ribbons < 0.02) return;
  const m = moonAt(s, tone);
  ctx.globalAlpha = tone.ribbons;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < RIBBONS.length; i++) {
      const b = RIBBONS[i]!;
      const drift = 0.06 * Math.sin(s.t * 0.012 * 9 + b.ph);
      const a0 = b.a - b.span + drift;
      const a1 = b.a + b.span + drift;
      if (pass === 0) ribbonPath(ctx, m.x, m.y, a0, a1, m.r * b.r, m.r * b.th, b.ph + s.t * 0.15);
      else ribbonPath(ctx, m.x, m.y, a0 + b.span * 0.12, a1 - b.span * 0.12, m.r * b.r - m.r * 0.012, m.r * b.th * 0.32, b.ph + s.t * 0.15);
    }
    ctx.fillStyle = pass === 0 ? tone.swirl : tone.swirlLit;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- storm clouds

/** Puffs of a storm-cloud bank: x (u, from the bank's outer screen edge inward), y (u), radius (u). */
const BANK_R = Array.from({ length: 13 }, (_, i) => ({
  x: 0.02 + (i % 7) * 0.045 + hash(i + 6100) * 0.02,
  y: (i < 7 ? 0 : -0.05) + (hash(i + 6110) - 0.5) * 0.03 - (i % 7) * 0.006,
  r: 0.045 + hash(i + 6120) * 0.03 - (i % 7) * 0.003,
}));
const BANK_L = Array.from({ length: 10 }, (_, i) => ({
  x: 0.02 + (i % 5) * 0.05 + hash(i + 6200) * 0.02,
  y: (i < 5 ? 0 : -0.045) + (hash(i + 6210) - 0.5) * 0.03,
  r: 0.04 + hash(i + 6220) * 0.025,
}));
/** Clouds ringing the moon, behind it: angle round it (rad), distance (moon radii), size (moon radii). */
const RING = Array.from({ length: 9 }, (_, i) => ({
  a: -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9 + (hash(i + 6300) - 0.5) * 0.2,
  d: 1.2 + hash(i + 6310) * 0.18,
  r: 0.24 + hash(i + 6320) * 0.14,
}));

/** Scratch colors per tone (the shade under the puffs). */
let shadeTone: Tone | null = null;
let SHADE = "";
let BODY2 = "";

function puffs(ctx: Ctx, list: readonly { x: number; y: number; r: number }[], ox: number, oy: number, dir: number, u: number, dx: number, dy: number, k: number): void {
  for (const p of list) {
    const r = p.r * u * k;
    const x = ox + dir * p.x * u + dx;
    const y = oy + p.y * u + dy;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

/** One bank of storm cloud: moonlit rims, body, and its darker underside. */
function bank(ctx: Ctx, list: readonly { x: number; y: number; r: number }[], ox: number, oy: number, dir: number, u: number, tone: Tone, light: number): void {
  const off = u * 0.012;
  ctx.beginPath();
  puffs(ctx, list, ox, oy, dir, u, 0, 0, 1);
  ctx.fillStyle = tone.swirlLit;
  ctx.globalAlpha = light;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  puffs(ctx, list, ox, oy, dir, u, -dir * off * 0.6, off, 0.98);
  ctx.fillStyle = BODY2;
  ctx.fill();
  ctx.beginPath();
  puffs(ctx, list, ox, oy, dir, u, -dir * off * 0.2, off * 2.6, 0.9);
  ctx.fillStyle = SHADE;
  ctx.fill();
}

/**
 * The storm: banks of cloud rolling in from both sides of the screen as it gathers (out in the
 * lanes: the right one high, the left one above the moon), and clouds ringing the moon behind it.
 */
export function stormClouds(ctx: Ctx, s: Scene, tone: Tone): void {
  const k = tone.storm;
  if (k < 0.02) return;
  if (shadeTone !== tone) {
    shadeTone = tone;
    SHADE = mix(tone.sky[0], "#000000", 0.25);
    BODY2 = mix(tone.swirl, tone.sky[1], 0.35);
  }
  const u = s.u;
  const m = moonAt(s, tone);
  const roll = (1 - k) * u * 0.3;
  const sway = Math.sin(s.t * 0.11) * u * 0.008;
  ctx.globalAlpha = k;
  // The right lane: two rolls stacked high in the lane.
  bank(ctx, BANK_R, s.cssW + u * 0.03 + roll + sway, s.cssH * 0.27, -1, u, tone, 0.85 * k);
  bank(ctx, BANK_L, s.cssW + u * 0.02 + roll - sway, s.cssH * 0.37, -1, u * 0.9, tone, 0.7 * k);
  // The left lane: a roll above the moon, under the HUD.
  bank(ctx, BANK_L, -u * 0.03 - roll + sway, Math.max(s.cssH * 0.24, m.y - m.r * 1.25), 1, u * 0.85, tone, 0.75 * k);
  // Ringing the moon, behind it.
  ctx.globalAlpha = k;
  ctx.beginPath();
  for (const c of RING) {
    const r = c.r * m.r;
    const x = m.x + Math.cos(c.a + sway / u) * c.d * m.r;
    const y = m.y + Math.sin(c.a + sway / u) * c.d * m.r;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = BODY2;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the spiral calm

/** Huge spirals out in the lanes: side, height (fraction of the screen), size (u), winding, turn rate. */
const SPIRALS = [
  { side: 1, y: 0.4, len: 0.42, th: 0.05, dir: 1, rate: 0.06 },
  { side: -1, y: 0.66, len: 0.36, th: 0.042, dir: -1, rate: -0.05 },
  { side: 1, y: 0.58, len: 0.26, th: 0.03, dir: -1, rate: 0.08 },
] as const;

/**
 * The storm wound up into huge spirals of cloud: each a long tapering band sweeping in from the
 * screen's side and winding into a spiral out in its lane, slowly breathing. The left one keeps
 * below the moon's halo.
 */
export function spirals(ctx: Ctx, s: Scene, tone: Tone): void {
  const k = tone.spiral;
  if (k < 0.02) return;
  const u = s.u;
  const m = moonAt(s, tone);
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  ctx.globalAlpha = k;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < SPIRALS.length; i++) {
      const sp = SPIRALS[i]!;
      let y = sp.y * s.cssH;
      const th = sp.th * u * (pass ? 0.4 : 1);
      if (sp.side < 0) y = Math.max(y, m.y + m.r * 1.6 + th * 4);
      const outer = sp.side < 0 ? -u * 0.06 : s.cssW + u * 0.06;
      const inner = sp.side < 0 ? Math.min(col0 + u * 0.02, outer + sp.len * u) : Math.max(col1 - u * 0.02, outer - sp.len * u);
      if (Math.abs(inner - outer) < u * 0.15) continue;
      const wave = Math.sin(s.t * sp.rate * 6 + i) * th * 0.8;
      // Tail at the screen's side, winding into the spiral toward the tower (its head kept in the lane).
      const head = sp.side < 0 ? inner - u * 0.03 : inner + u * 0.03;
      swirl(ctx, outer, head, y + (pass ? -th * 0.9 : 0), th, sp.dir, wave);
    }
    ctx.fillStyle = pass === 0 ? tone.swirl : tone.swirlLit;
    if (pass) ctx.globalAlpha = k * 0.55;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

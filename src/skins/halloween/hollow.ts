import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { INK, LAMP, PALETTE, RIDGE, smooth } from "./common";
import { horseman } from "./horseman";
import { moonAt } from "./sky";

// Beyond the town lies Sleepy Hollow, faded by distance and mist: a long hill under the moon
// with dead trees on its crest, where the Headless Horseman gallops past the moon's face and
// rides down into the old covered bridge; a giant gnarled tree; and the steeple
// of the old church rising out of the fog on the right. The hill is farther than the horizon
// (it drops more slowly as you climb); everything else stands on horizonY. Bases sink into
// the cloud bank (the mist), which is drawn over this layer.

const FAR = PALETTE.far;
const RIDGE_TREE = mix(RIDGE, FAR, 0.45);
const BARN = mix("#c4503e", FAR, 0.42);
const BARN_SHADE = mix(BARN, INK, 0.28);
const ROOF = mix(FAR, INK, 0.32);
const PORTAL = mix(FAR, INK, 0.62);
const TRIM = mix(BARN, "#ffe6c8", 0.3);
const LANTERN = mix(LAMP, FAR, 0.12);
const LANTERN_GLOW = alpha(LAMP, 0.18);
const WINDOW = mix(FAR, "#ffd27a", 0.55);
const LATTICE = mix(BARN, "#ffd9b0", 0.28);
const STONE_FAR = mix(FAR, "#b8b0d8", 0.25);

/** The hill drops this much (a fraction of the climb) as you climb: farther than the horizon. */
const RIDGE_P = 0.06;

// ---------------------------------------------------------------- gnarled trees

/** Limbs of a tree as flat [x0, y0, kink x, kink y, x1, y1, level] in units of its height, y up. */
function gnarled(seed: number, lean: number, spread: number, depth: number): number[] {
  const out: number[] = [];
  const grow = (x: number, y: number, ang: number, len: number, d: number, sd: number): void => {
    // A kink partway along every limb keeps it crooked.
    const a = Math.max(-1.6, Math.min(1.6, ang));
    const x1 = x + Math.sin(a) * len;
    const y1 = y + Math.cos(a) * len;
    const mx = (x + x1) / 2 + (hash(sd + 11) - 0.5) * len * 0.6;
    const my = (y + y1) / 2 + (hash(sd + 13) - 0.5) * len * 0.2;
    const level = Math.min(3, depth - d - (depth > 4 ? 1 : 0));
    out.push(x, y, mx, my, x1, y1, Math.max(0, level));
    if (d === 0) return;
    const n = d >= 2 ? 2 : 2 + (hash(sd + 3) > 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = n === 2 ? (i === 0 ? -1 : 1) : i - 1;
      const sp = spread * (0.45 + hash(sd * 3 + i) * 0.5);
      const nl = len * (0.6 + hash(sd + i + 9) * 0.22);
      // Limbs droop and curl a little toward their ends.
      const curl = d <= 2 ? (hash(sd + i + 21) - 0.5) * (d <= 1 ? 1.1 : 0.6) : 0;
      grow(x1, y1, a + side * sp + curl + (hash(sd + 5) - 0.5) * 0.3, nl, d - 1, sd * 2 + i + 3);
    }
  };
  grow(0, 0, lean, 0.34, depth, seed);
  return out;
}

const TREE_W = [0.09, 0.05, 0.028, 0.016];

interface Tree {
  segs: number[];
  /** Height in u; trunk flare half-width at the base, in units of the height. */
  h: number;
  flare: number;
}

/** The giant gnarled tree of the hollow, and two dead trees on the hill. */
const BIG: Tree = { segs: gnarled(7, -0.18, 1.0, 4), h: 0.34, flare: 0.08 };
const HILL_A: Tree = { segs: gnarled(3, 0.12, 0.85, 3), h: 0.15, flare: 0.07 };
const HILL_B: Tree = { segs: gnarled(12, -0.2, 0.95, 3), h: 0.19, flare: 0.06 };

function tree(ctx: Ctx, tr: Tree, x: number, base: number, u: number, color: string): void {
  const h = tr.h * u;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let level = 0; level < 4; level++) {
    ctx.beginPath();
    const s = tr.segs;
    for (let i = 0; i < s.length; i += 7) {
      if (s[i + 6] !== level) continue;
      ctx.moveTo(x + s[i]! * h, base - s[i + 1]! * h);
      ctx.lineTo(x + s[i + 2]! * h, base - s[i + 3]! * h);
      ctx.lineTo(x + s[i + 4]! * h, base - s[i + 5]! * h);
    }
    ctx.lineWidth = Math.max(1, TREE_W[level]! * h);
    ctx.stroke();
  }
  // Root flare
  const f = tr.flare * h;
  ctx.beginPath();
  ctx.moveTo(x - f, base + 1);
  ctx.quadraticCurveTo(x - f * 0.3, base - f * 0.4, x - f * 0.25, base - f * 1.6);
  ctx.lineTo(x + f * 0.25, base - f * 1.6);
  ctx.quadraticCurveTo(x + f * 0.3, base - f * 0.4, x + f, base + 1);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the hill

/** Scratch geometry for this frame, so the crest function needs no closures. */
const G = { cx: 0, u: 0, hy0: 0, drop: 0, top: 0, mx: 0 };

/** The bridge, in u from the center: left end, length, deck height above the horizon. */
const BRIDGE_X = 0.0;
const BRIDGE_L = 0.21;
const BRIDGE_DECK = 0.12;

/** The hill runs down from the moon to the covered bridge's portal and ends behind it. */
const DESCENT_START = -0.17;
const DESCENT_END = -0.05;

/** Screen y of the hill's crest at screen x. */
function crest(x: number): number {
  const X = (x - G.cx) / G.u;
  const H = G.hy0 - G.top;
  const top = H + G.u * (0.01 * Math.sin((X + 0.5) * 10) - 0.03 * (1 - smooth(-0.52, -0.32, X)));
  const deck = BRIDGE_DECK * G.u;
  const h = top + (deck - top) * smooth(DESCENT_START, DESCENT_END, X);
  return G.hy0 - h + G.drop;
}

/** An old split-rail fence along the road on the crest, a rail down here and there. */
function fence(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const step = u * 0.036;
  const from = G.cx - u * 0.5 + step * 0.5;
  const to = G.cx + (DESCENT_START + 0.02) * u;
  const ph = u * 0.022;
  ctx.beginPath();
  let i = 0;
  for (let x = from; x < to; x += step, i++) {
    const y = crest(x) + u * 0.002;
    const lean = (hash(i + 70) - 0.5) * u * 0.008;
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - ph);
    if (x + step >= to || hash(i + 80) < 0.18) continue;
    const y2 = crest(x + step) + u * 0.002;
    ctx.moveTo(x, y - ph * 0.45);
    ctx.lineTo(x + step, y2 - ph * 0.45);
    if (hash(i + 90) < 0.3) continue;
    ctx.moveTo(x, y - ph * 0.85);
    ctx.lineTo(x + step, y2 - ph * (hash(i + 95) < 0.2 ? 0.3 : 0.85));
  }
  ctx.strokeStyle = RIDGE_TREE;
  ctx.lineWidth = Math.max(1, u * 0.0038);
  ctx.lineCap = "round";
  ctx.stroke();
}

function hill(ctx: Ctx, s: Scene): void {
  const left = -s.u * 0.02;
  const right = G.cx + (BRIDGE_X - 0.03) * G.u;
  const step = s.u * 0.02;
  ctx.beginPath();
  ctx.moveTo(left, s.horizonY + 1);
  for (let x = left; x < right; x += step) ctx.lineTo(x, crest(x));
  ctx.lineTo(right, crest(right));
  ctx.lineTo(right, s.horizonY + 1);
  ctx.closePath();
  ctx.fillStyle = RIDGE;
  ctx.fill();
}

// ---------------------------------------------------------------- the Horseman's ride

/** Seconds per loop, seconds of it spent riding, and the shift that puts him on the moon at the start. */
const RIDE_LOOP = 10;
const RIDE_TIME = 5.6;
const RIDE_SHIFT = 9.4;
/**
 * His ride, in u from the center: out of the mist on the left, past the moon, down the hill
 * and into the covered bridge's portal (the bridge is drawn over him, so he rides in behind
 * its gable end and fades there rather than on the open hillside).
 */
const RIDE_FROM = -0.47;
const RIDE_TO = -0.035;
/** His size unit, in u: about 3 long and 3.3 tall with the pumpkin raised. */
const RIDER_SIZE = 0.046;

function rider(ctx: Ctx, s: Scene): void {
  const p = ((((s.t + RIDE_SHIFT) % RIDE_LOOP) + RIDE_LOOP) % RIDE_LOOP) / RIDE_TIME;
  if (p >= 1) return;
  const x = G.cx + (RIDE_FROM + (RIDE_TO - RIDE_FROM) * p) * G.u;
  const y = crest(x);
  const d = s.u * 0.03;
  const tilt = Math.max(-0.4, Math.min(0.4, Math.atan2(crest(x + d) - crest(x - d), 2 * d)));
  const vis = smooth(0.1, 0.24, p) * (1 - smooth(0.84, 0.99, p));
  horseman(ctx, x, y + s.u * 0.003, s.u * RIDER_SIZE, s.t, tilt, vis);
}

// ---------------------------------------------------------------- covered bridge

/**
 * The old covered bridge, seen from the side and a little from the left: a long barn-red box
 * with a lattice truss along its side, a shingled roof, the dark arched portal in its gable
 * end where the Horseman's road comes down, a lantern, and stone abutments either side of
 * the open span over the creek.
 */
function bridge(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY + 1;
  const x0 = G.cx + BRIDGE_X * u;
  const x1 = x0 + BRIDGE_L * u;
  const deck = hy - BRIDGE_DECK * u;
  const eave = deck - u * 0.048;
  const fw = u * 0.046; // the gable end, seen at an angle
  const peak = eave - u * 0.03;

  // Abutments: the left one is the hill's foot, the right one a stone pier on the far bank.
  ctx.fillStyle = STONE_FAR;
  ctx.beginPath();
  ctx.moveTo(x1 - u * 0.03, deck);
  ctx.lineTo(x1 + u * 0.01, deck);
  ctx.lineTo(x1 + u * 0.03, hy);
  ctx.lineTo(x1 - u * 0.05, hy);
  ctx.closePath();
  ctx.moveTo(x0 - fw * 0.6, deck);
  ctx.lineTo(x0 + u * 0.02, deck);
  ctx.lineTo(x0 + u * 0.035, hy);
  ctx.lineTo(x0 - fw * 0.9, hy);
  ctx.closePath();
  ctx.fill();
  // Side wall with its lattice truss and a deck beam
  ctx.fillStyle = BARN;
  ctx.fillRect(x0, eave, x1 - x0, deck - eave);
  ctx.strokeStyle = LATTICE;
  ctx.lineWidth = Math.max(0.8, u * 0.0028);
  ctx.beginPath();
  const n = 9;
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step;
    ctx.moveTo(a, deck - u * 0.004);
    ctx.lineTo(a + step, eave + u * 0.006);
    ctx.moveTo(a, eave + u * 0.006);
    ctx.lineTo(a + step, deck - u * 0.004);
  }
  ctx.stroke();
  ctx.fillStyle = BARN_SHADE;
  ctx.fillRect(x0 - fw * 0.5, deck - u * 0.004, x1 - x0 + fw * 0.5 + u * 0.01, u * 0.012);
  // Gable end with its arched portal
  ctx.beginPath();
  ctx.moveTo(x0 - fw, deck);
  ctx.lineTo(x0, deck);
  ctx.lineTo(x0, eave);
  ctx.lineTo(x0 - fw * 0.5, peak);
  ctx.lineTo(x0 - fw, eave);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PORTAL;
  ctx.beginPath();
  const pw = fw * 0.32;
  const pc = x0 - fw * 0.5;
  ctx.moveTo(pc - pw, deck);
  ctx.lineTo(pc - pw, eave + u * 0.002);
  ctx.quadraticCurveTo(pc, eave - u * 0.022, pc + pw, eave + u * 0.002);
  ctx.lineTo(pc + pw, deck);
  ctx.closePath();
  ctx.fill();
  // Roof: the near slope as a long band, its ridge set back by half the gable.
  ctx.fillStyle = ROOF;
  ctx.beginPath();
  ctx.moveTo(x0 - fw * 1.1, eave + u * 0.003);
  ctx.lineTo(x0 - fw * 0.5, peak - u * 0.005);
  ctx.lineTo(x1 - fw * 0.5 + u * 0.012, peak - u * 0.005);
  ctx.lineTo(x1 + u * 0.014, eave + u * 0.003);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0 - fw * 1.05, eave + u * 0.002);
  ctx.lineTo(x0 - fw * 0.5, peak - u * 0.003);
  ctx.lineTo(x0 + fw * 0.05, eave + u * 0.002);
  ctx.stroke();
  // A lantern hung by the portal
  const lx = x0 + u * 0.014;
  const ly = eave + u * 0.016;
  const flick = 0.85 + 0.15 * Math.sin(s.t * 7) * Math.sin(s.t * 3.1);
  ctx.fillStyle = LANTERN_GLOW;
  ctx.beginPath();
  circle(ctx, lx, ly, u * 0.02 * flick);
  ctx.fill();
  ctx.fillStyle = LANTERN;
  ctx.beginPath();
  circle(ctx, lx, ly, u * 0.0065);
  ctx.fill();
}

// ---------------------------------------------------------------- church

const CHURCH_X = 0.36;

function church(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const base = s.horizonY + 1;
  const tx = G.cx + CHURCH_X * u;
  const tw = u * 0.05;
  const tTop = base - u * 0.27;
  const tip = tTop - u * 0.13;
  ctx.fillStyle = FAR;
  ctx.beginPath();
  // Nave to the left of the tower, gable roof
  ctx.moveTo(tx - u * 0.13, base);
  ctx.lineTo(tx - u * 0.13, base - u * 0.13);
  ctx.lineTo(tx - u * 0.075, base - u * 0.18);
  ctx.lineTo(tx - tw / 2, base - u * 0.13);
  // Tower with a little parapet, and the steeple
  ctx.lineTo(tx - tw / 2, tTop);
  ctx.lineTo(tx - tw / 2 - u * 0.006, tTop);
  ctx.lineTo(tx - tw / 2 - u * 0.006, tTop - u * 0.012);
  ctx.lineTo(tx - tw * 0.36, tTop - u * 0.012);
  ctx.lineTo(tx, tip);
  ctx.lineTo(tx + tw * 0.36, tTop - u * 0.012);
  ctx.lineTo(tx + tw / 2 + u * 0.006, tTop - u * 0.012);
  ctx.lineTo(tx + tw / 2 + u * 0.006, tTop);
  ctx.lineTo(tx + tw / 2, tTop);
  ctx.lineTo(tx + tw / 2, base);
  ctx.closePath();
  // Weathervane rod and a crowing arrow
  const bar = Math.max(1, u * 0.004);
  ctx.rect(tx - bar / 2, tip - u * 0.03, bar, u * 0.03);
  ctx.rect(tx - u * 0.012, tip - u * 0.022, u * 0.024, bar);
  ctx.fill();
  // Belfry and nave windows, lit
  ctx.fillStyle = WINDOW;
  ctx.beginPath();
  const bw = u * 0.016;
  const by = tTop + u * 0.03;
  ctx.moveTo(tx - bw / 2, by + u * 0.03);
  ctx.lineTo(tx - bw / 2, by);
  ctx.arc(tx, by, bw / 2, Math.PI, 0);
  ctx.lineTo(tx + bw / 2, by + u * 0.03);
  ctx.closePath();
  ctx.rect(tx - u * 0.11, base - u * 0.1, u * 0.012, u * 0.026);
  ctx.rect(tx - u * 0.075, base - u * 0.1, u * 0.012, u * 0.026);
  ctx.fill();
}

// ---------------------------------------------------------------- layer

export function hollow(ctx: Ctx, s: Scene): void {
  const u = s.u;
  G.cx = s.cssW / 2;
  G.u = u;
  G.hy0 = s.horizonY - HORIZON_P * s.rise;
  G.drop = RIDGE_P * s.rise;
  const m = moonAt(s);
  G.mx = m.x;
  // The crest crosses the moon's lower face, but stays well above the mist.
  G.top = Math.min(m.y + m.r0 * 0.36, G.hy0 - u * 0.2);
  if (G.top + G.drop - u * 0.2 > s.cssH) return;

  hill(ctx, s);
  // Dead trees on the crest, left of the moon and on the shoulder past it
  const ax = G.mx - u * 0.15;
  tree(ctx, HILL_A, ax, crest(ax) + u * 0.006, u, RIDGE_TREE);
  const bx = G.mx + u * 0.19;
  tree(ctx, HILL_B, bx, crest(bx) + u * 0.006, u, RIDGE_TREE);
  fence(ctx, s);
  rider(ctx, s);

  if (s.horizonY - u * 0.45 > s.cssH) return;
  church(ctx, s);
  tree(ctx, BIG, G.cx + u * 0.26, s.horizonY + 1, u, FAR);
  bridge(ctx, s);
}

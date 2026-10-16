import { alpha, circle, emerge, hash, mix, neonStroke, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { AMBER, BONE, boneStroke, CANDLE, floor, GREEN, INK, LAVENDER, ORANGE, rimW } from "./common";

// The graveyard on the neon floor around the tower: weathered tombstones planted in dirt
// mounds, a jack-o'-lantern behind the tower, and skeleton parts clawing up out of the dirt.
// Every prop is placed on the floor grid by depth (see `floor`), so it stays put on the grid
// and slides away with it as the camera climbs.

type Stone = "round" | "slab" | "cross";

const MOUND_TOP = "#2a1236";
const MOUND_BOTTOM = "#0b0410";
const STONE_LIT = "#33224a";
const STONE_DARK = "#0e0718";
const STONE_MID = mix(STONE_LIT, STONE_DARK, 0.45);

// ---------------------------------------------------------------- dirt

const MOUND_LIP = mix(ORANGE, MOUND_TOP, 0.3);
const LUMPS = 12;

/** Trace the lumpy top of a mound from point `from` to `to` (0..LUMPS), left to right. */
function moundTop(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number, from: number, to: number): void {
  for (let i = from; i <= to; i++) {
    const a = Math.PI + (i / LUMPS) * Math.PI;
    const k = 1 + 0.16 * Math.sin(i * 1.9 + seed * 3.1) * Math.sin(a);
    const px = x + Math.cos(a) * rx;
    const py = y + Math.sin(a) * ry * k;
    if (i === from) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

/** A lumpy grave mound: dark earth with a neon lip along its top, and a few dead grass blades. */
function mound(ctx: Ctx, s: Scene, x: number, y: number, rx: number, seed: number): void {
  const ry = rx * 0.3;
  ctx.beginPath();
  moundTop(ctx, x, y, rx, ry, seed, 0, LUMPS);
  ctx.ellipse(x, y, rx, ry * 0.55, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = MOUND_BOTTOM;
  ctx.fill();
  // Loose earth catching the light on top
  ctx.beginPath();
  moundTop(ctx, x, y, rx, ry, seed, 0, LUMPS);
  ctx.ellipse(x, y - ry * 0.1, rx * 0.9, ry * 0.3, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = MOUND_TOP;
  ctx.fill();

  // Neon lip along the top only
  ctx.beginPath();
  moundTop(ctx, x, y, rx, ry, seed, 1, LUMPS - 1);
  neonStroke(ctx, MOUND_LIP, Math.max(0.9, s.u * 0.0026), 3);

  // Dead grass tufts at both ends
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    const bx = x + side * rx * (0.62 + hash(seed + side) * 0.2);
    const by = y - ry * 0.35;
    for (let i = 0; i < 3; i++) {
      const lean = (hash(seed * 5 + i + side) - 0.5) * rx * 0.25;
      const h = rx * (0.16 + hash(seed * 7 + i + side) * 0.16);
      ctx.moveTo(bx + (i - 1) * rx * 0.05, by);
      ctx.lineTo(bx + (i - 1) * rx * 0.06 + lean, by - h);
    }
  }
  ctx.strokeStyle = alpha(GREEN, 0.75);
  ctx.lineWidth = Math.max(0.8, s.u * 0.0024);
  ctx.lineCap = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- tombstones

/** Stone outline in local space: base point at the origin, top at -h, running on below the soil. */
function stonePath(ctx: Ctx, kind: Stone, w: number, h: number, seed: number): void {
  const r = w / 2;
  const sunk = w * 0.12; // runs on under the mound, so a lean never lifts a corner
  ctx.beginPath();
  if (kind === "round") {
    // Rounded top with a chip knocked out of it
    const cy = -h + r;
    const chip = Math.PI * (1.25 + hash(seed + 1) * 0.5);
    const a0 = chip - 0.2;
    const a1 = chip + 0.2;
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, cy);
    ctx.arc(0, cy, r, Math.PI, a0);
    ctx.lineTo(Math.cos(chip) * r * 0.74, cy + Math.sin(chip) * r * 0.74);
    ctx.arc(0, cy, r, a1, Math.PI * 2);
    ctx.lineTo(r, sunk);
  } else if (kind === "slab") {
    // Square shoulders and a pointed cap, one corner broken off
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, -h * 0.74);
    ctx.lineTo(-r * 0.62, -h * 0.82);
    ctx.lineTo(-r * 0.2, -h);
    ctx.lineTo(r * 0.12, -h * 0.97);
    ctx.lineTo(r * 0.3, -h * 0.9);
    ctx.lineTo(r * 0.42, -h * 0.93);
    ctx.lineTo(r * 0.62, -h * 0.82);
    ctx.lineTo(r, -h * 0.74);
    ctx.lineTo(r, sunk);
  } else {
    // Cross
    const pw = w * 0.17;
    const ay = -h * 0.7;
    const ah = w * 0.15;
    ctx.moveTo(-pw, sunk);
    ctx.lineTo(-pw, ay + ah);
    ctx.lineTo(-r, ay + ah);
    ctx.lineTo(-r, ay - ah);
    ctx.lineTo(-pw, ay - ah);
    ctx.lineTo(-pw, -h);
    ctx.lineTo(pw, -h);
    ctx.lineTo(pw, ay - ah);
    ctx.lineTo(r, ay - ah * 0.8);
    ctx.lineTo(r * 0.92, ay + ah);
    ctx.lineTo(pw, ay + ah);
    ctx.lineTo(pw, sunk);
  }
  ctx.closePath();
}

/** A weathered headstone: leaning, chipped, cracked, mossy, with a worn "RIP", planted in a mound. */
function tombstone(ctx: Ctx, s: Scene, x: number, y: number, w: number, h: number, kind: Stone, seed: number): void {
  const tilt = (hash(seed) - 0.5) * 0.2;
  const rim = rimW(s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  stonePath(ctx, kind, w, h, seed);
  // Moonlight comes from the upper left: lit left face, dark right face.
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, STONE_LIT);
  g.addColorStop(0.35, STONE_MID);
  g.addColorStop(1, STONE_DARK);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Moss creeping up from the soil, glowing faintly
  ctx.beginPath();
  for (let i = 0; i < 6; i++) circle(ctx, -w / 2 + (i / 5) * w, -h * 0.16, w * (0.08 + hash(seed + 30 + i) * 0.1));
  for (let i = 0; i < 3; i++) circle(ctx, -w / 2 + hash(seed + 40 + i) * w, -h * (0.3 + hash(seed + 50 + i) * 0.4), w * 0.045);
  ctx.fillStyle = alpha(GREEN, 0.38);
  ctx.fill();
  ctx.restore();

  stonePath(ctx, kind, w, h, seed);
  neonStroke(ctx, LAVENDER, rim, 3);

  // Crack running down from the top edge
  ctx.beginPath();
  let cx = (hash(seed + 2) - 0.5) * w * (kind === "cross" ? 0.15 : 0.45);
  let cy = -h + (kind === "round" ? w * 0.5 - Math.sqrt(Math.max(0, (w * w) / 4 - cx * cx)) : h * 0.08) + 1;
  ctx.moveTo(cx, cy);
  for (let i = 0; i < 4; i++) {
    cx += (hash(seed + 60 + i) - 0.5) * w * 0.28;
    cy += h * 0.1;
    ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, rim * 1.1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = alpha(LAVENDER, 0.45);
  ctx.lineWidth = Math.max(0.6, rim * 0.45);
  ctx.stroke();

  // Worn lettering
  if (kind !== "cross") {
    ctx.font = `700 ${Math.round(w * 0.3)}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = alpha(INK, 0.9);
    ctx.fillText("RIP", w * 0.02, -h * 0.5 + w * 0.02);
    ctx.fillStyle = alpha(LAVENDER, 0.55);
    ctx.fillText("RIP", 0, -h * 0.5);
  }
  ctx.restore();

  mound(ctx, s, x, y + w * 0.06, w * 0.95, seed);
}

// ---------------------------------------------------------------- jack-o'-lantern

/** Carved face as closed subpaths: two eyes, a nose, a jagged grin. */
function face(ctx: Ctx, px: number, py: number, pr: number): void {
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(px + side * pr * 0.58, py - pr * 0.02);
    ctx.lineTo(px + side * pr * 0.16, py - pr * 0.02);
    ctx.lineTo(px + side * pr * 0.4, py - pr * 0.44);
    ctx.closePath();
  }
  ctx.moveTo(px, py + pr * 0.06);
  ctx.lineTo(px - pr * 0.1, py + pr * 0.22);
  ctx.lineTo(px + pr * 0.1, py + pr * 0.22);
  ctx.closePath();
  ctx.moveTo(px - pr * 0.66, py + pr * 0.28);
  const teeth = 6;
  for (let i = 1; i <= teeth; i++) {
    ctx.lineTo(px - pr * 0.66 + (pr * 1.32 * i) / teeth, py + pr * (i % 2 ? 0.46 : 0.3));
  }
  ctx.quadraticCurveTo(px + pr * 0.5, py + pr * 0.72, px, py + pr * 0.72);
  ctx.quadraticCurveTo(px - pr * 0.5, py + pr * 0.72, px - pr * 0.66, py + pr * 0.28);
  ctx.closePath();
}

function jackOLantern(ctx: Ctx, s: Scene, px: number, bottom: number, pr: number): void {
  const t = s.t;
  const py = bottom - pr;
  const flicker = 0.78 + 0.22 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1);
  const rim = rimW(s);

  // Candle glow pooled on the floor
  ctx.save();
  ctx.translate(px, bottom);
  ctx.scale(1, 0.38);
  const pool = ctx.createRadialGradient(0, 0, pr * 0.2, 0, 0, pr * 2.6);
  pool.addColorStop(0, alpha(ORANGE, 0.45 * flicker));
  pool.addColorStop(1, alpha(ORANGE, 0));
  ctx.fillStyle = pool;
  ctx.beginPath();
  circle(ctx, 0, 0, pr * 2.6);
  ctx.fill();
  ctx.restore();

  // Stem
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.12, py - pr * 0.82);
  ctx.quadraticCurveTo(px - pr * 0.08, py - pr * 1.25, px + pr * 0.24, py - pr * 1.36);
  ctx.lineTo(px + pr * 0.14, py - pr * 0.82);
  ctx.closePath();
  ctx.fillStyle = "#12300a";
  ctx.fill();
  neonStroke(ctx, GREEN, rim * 0.8, 3);

  // Body: dark rind, glowing from inside, with neon ribs and rim
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.18, pr);
  const body = ctx.createRadialGradient(px, py + pr * 0.15, pr * 0.1, px, py, pr * 1.2);
  body.addColorStop(0, mix("#c4500c", "#ff8a2a", Math.max(0, flicker - 0.6)));
  body.addColorStop(0.55, "#6a2306");
  body.addColorStop(1, "#250902");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 0.5, pr * 0.97, 0, Math.PI * 0.62, Math.PI * 1.38);
  ctx.moveTo(px + pr * 0.5 * Math.cos(-Math.PI * 0.38), py + pr * 0.97 * Math.sin(-Math.PI * 0.38));
  ctx.ellipse(px, py, pr * 0.5, pr * 0.97, 0, -Math.PI * 0.38, Math.PI * 0.38);
  ctx.strokeStyle = alpha(ORANGE, 0.55);
  ctx.lineWidth = Math.max(1, rim * 0.9);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.18, pr);
  neonStroke(ctx, ORANGE, rim * 1.2, 3.2);

  // Glowing face
  face(ctx, px, py, pr);
  ctx.lineJoin = "round";
  ctx.strokeStyle = alpha(AMBER, 0.35 * flicker);
  ctx.lineWidth = pr * 0.22;
  ctx.stroke();
  ctx.fillStyle = mix(AMBER, CANDLE, flicker);
  ctx.fill();
}

// ---------------------------------------------------------------- skeletons

function edgeW(s: Scene): number {
  return Math.max(0.7, s.u * 0.0021);
}

/** Clip to everything above the dirt line at y, so bones rise out of the ground. */
function aboveGround(ctx: Ctx, x: number, y: number, reach: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - reach * 2, y - reach * 3, reach * 4, reach * 3);
  ctx.clip();
}

/** A bony arm clawing up out of a mound. `up` 0..1 is how far it has come out. */
function skeletonArm(ctx: Ctx, s: Scene, x: number, y: number, len: number, up: number, seed: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const edge = edgeW(s);
  const hand = seed % 2 ? 1 : -1; // which way the fingers curl (the thumb sits on the other side)
  const a = hand * 0.16 + Math.sin(t * 2.2 + seed) * 0.3 * up;
  aboveGround(ctx, x, y, len);
  const reach = len * up;
  const ex = x + Math.sin(a) * reach * 0.5;
  const ey = y - Math.cos(a) * reach * 0.5;
  const ha = a * 1.5;
  const wx = ex + Math.sin(ha) * reach * 0.36;
  const wy = ey - Math.cos(ha) * reach * 0.36;

  // Upper arm and forearm
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(ex, ey);
  ctx.lineTo(wx, wy);
  boneStroke(ctx, Math.max(1.6, len * 0.07), edge, GREEN);

  // Fingers fanned like a claw, three joints each, curling and uncurling; then the thumb.
  const ux = Math.sin(ha);
  const uy = -Math.cos(ha);
  const kx = wx + ux * len * 0.13;
  const ky = wy + uy * len * 0.13;
  const curl = 0.5 + 0.5 * Math.sin(t * 3 + seed * 2);
  ctx.beginPath();
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * len * 0.045;
    let fx = kx - uy * off;
    let fy = ky + ux * off;
    let ang = ha + (f - 1.5) * 0.3;
    const short = f === 0 || f === 3 ? 0.82 : 1;
    ctx.moveTo(fx, fy);
    for (let j = 0; j < 3; j++) {
      const seg = len * (0.1 - j * 0.022) * short;
      fx += Math.sin(ang) * seg;
      fy -= Math.cos(ang) * seg;
      ctx.lineTo(fx, fy);
      ang += hand * (0.2 + curl * 0.5);
    }
  }
  {
    let fx = wx + uy * hand * len * 0.04;
    let fy = wy - ux * hand * len * 0.04;
    let ang = ha - hand * 1.0;
    ctx.moveTo(fx, fy);
    for (let j = 0; j < 2; j++) {
      fx += Math.sin(ang) * len * 0.08;
      fy -= Math.cos(ang) * len * 0.08;
      ctx.lineTo(fx, fy);
      ang += hand * (0.4 + curl * 0.3);
    }
  }
  boneStroke(ctx, Math.max(1, len * 0.036), edge, GREEN);

  // Palm over the finger roots
  ctx.beginPath();
  ctx.moveTo(wx + uy * len * 0.04, wy - ux * len * 0.04);
  ctx.lineTo(kx + uy * len * 0.085, ky - ux * len * 0.085);
  ctx.lineTo(kx - uy * len * 0.085, ky + ux * len * 0.085);
  ctx.lineTo(wx - uy * len * 0.04, wy + ux * len * 0.04);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  neonStroke(ctx, GREEN, edge, 2.5);

  // Elbow and wrist knobs
  ctx.beginPath();
  circle(ctx, ex, ey, len * 0.055);
  circle(ctx, wx, wy, len * 0.05);
  ctx.fillStyle = BONE;
  ctx.fill();
  neonStroke(ctx, GREEN, edge, 2.5);
  ctx.restore();
}

/** A skull pushing up out of the dirt, jaw chattering, eyes glowing. */
function risingSkull(ctx: Ctx, s: Scene, x: number, y: number, size: number, up: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const edge = edgeW(s);
  aboveGround(ctx, x, y, size);
  ctx.translate(x, y + (1 - up) * size * 1.6);
  ctx.rotate(Math.sin(t * 1.3) * 0.15 * up);
  const cy = -size * 0.95;
  const chat = Math.max(0, Math.sin(t * 9)) * size * 0.09;
  // Jaw
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, cy + size * 0.44 + chat);
  ctx.lineTo(size * 0.28, cy + size * 0.44 + chat);
  ctx.lineTo(size * 0.22, cy + size * 0.7 + chat);
  ctx.lineTo(-size * 0.22, cy + size * 0.7 + chat);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  neonStroke(ctx, GREEN, edge, 3);
  // Cranium
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, cy + size * 0.05);
  ctx.arc(0, cy, size * 0.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(size * 0.5, cy + size * 0.35, size * 0.3, cy + size * 0.46);
  ctx.lineTo(-size * 0.3, cy + size * 0.46);
  ctx.quadraticCurveTo(-size * 0.5, cy + size * 0.35, -size * 0.5, cy + size * 0.05);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  neonStroke(ctx, GREEN, edge, 3);
  // Sockets and nose
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, -size * 0.19, cy + size * 0.06, size * 0.13, size * 0.15);
  oval(ctx, size * 0.19, cy + size * 0.06, size * 0.13, size * 0.15);
  ctx.moveTo(0, cy + size * 0.2);
  ctx.lineTo(-size * 0.06, cy + size * 0.33);
  ctx.lineTo(size * 0.06, cy + size * 0.33);
  ctx.closePath();
  ctx.fill();
  // Glowing pupils
  ctx.beginPath();
  circle(ctx, -size * 0.18, cy + size * 0.08, size * 0.07);
  circle(ctx, size * 0.18, cy + size * 0.08, size * 0.07);
  ctx.fillStyle = alpha(GREEN, 0.35);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, -size * 0.18, cy + size * 0.08, size * 0.035);
  circle(ctx, size * 0.18, cy + size * 0.08, size * 0.035);
  ctx.fillStyle = mix(GREEN, "#ffffff", 0.5);
  ctx.fill();
  // Teeth
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * size * 0.09, cy + size * 0.44);
    ctx.lineTo(i * size * 0.09, cy + size * 0.53);
    ctx.moveTo(i * size * 0.08, cy + size * 0.46 + chat);
    ctx.lineTo(i * size * 0.08, cy + size * 0.55 + chat);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, size * 0.03);
  ctx.stroke();
  ctx.restore();
}

// Bony sole, in units of the foot's length: heel at the origin, toes up (-y), big toe at -x.
const SOLE = [
  [-0.08, 0.02, -0.07, -0.12, -0.06, -0.18],
  [-0.05, -0.26, -0.1, -0.31, -0.065, -0.36],
  [-0.025, -0.4, 0.07, -0.39, 0.095, -0.33],
  [0.115, -0.26, 0.075, -0.14, 0.068, -0.08],
  [0.062, 0.0, 0.04, 0.02, 0, 0.02],
] as const;
// Toes: x, y, radius.
const TOES = [
  [-0.052, -0.43, 0.036],
  [-0.002, -0.445, 0.026],
  [0.036, -0.43, 0.023],
  [0.068, -0.405, 0.02],
  [0.094, -0.37, 0.018],
] as const;

/** A pair of bony feet sticking up out of the dirt, soles out, toes wiggling. */
function bonyFeet(ctx: Ctx, s: Scene, x: number, y: number, len: number, up: number): void {
  if (up <= 0.01) return;
  const t = s.t;
  const edge = edgeW(s);
  aboveGround(ctx, x, y, len);
  for (let side = -1; side <= 1; side += 2) {
    const fx = x + side * len * 0.27;
    const lean = side * 0.1 + Math.sin(t * 1.4 + side) * 0.05;
    const ax = fx + Math.sin(lean) * len * 0.4 * up;
    const ay = y - Math.cos(lean) * len * 0.4 * up;
    // Shin
    ctx.beginPath();
    ctx.moveTo(fx, y + 2);
    ctx.lineTo(ax, ay);
    boneStroke(ctx, Math.max(1.8, len * 0.085), edge, GREEN);

    // The foot, tipped outward. Local (lx, ly) -> screen, mirrored so the big toe is inside.
    const r = lean * 1.8;
    const c = Math.cos(r) * len;
    const sn = Math.sin(r) * len;
    const kx = side * 1.75;
    const ky = 1.35;
    const X = (lx: number, ly: number) => ax + lx * kx * c - ly * ky * sn;
    const Y = (lx: number, ly: number) => ay + lx * kx * sn + ly * ky * c;
    ctx.beginPath();
    ctx.moveTo(X(0, 0.02), Y(0, 0.02));
    for (const [c1x, c1y, c2x, c2y, ex, ey] of SOLE) {
      ctx.bezierCurveTo(X(c1x, c1y), Y(c1x, c1y), X(c2x, c2y), Y(c2x, c2y), X(ex, ey), Y(ex, ey));
    }
    ctx.closePath();
    ctx.fillStyle = BONE;
    ctx.fill();
    neonStroke(ctx, GREEN, edge, 2.5);
    // Gaps between the long foot bones
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const tx = -0.03 + i * 0.033;
      ctx.moveTo(X(tx * 0.4, -0.12), Y(tx * 0.4, -0.12));
      ctx.lineTo(X(tx, -0.33 + Math.abs(i - 1) * 0.012), Y(tx, -0.33 + Math.abs(i - 1) * 0.012));
    }
    ctx.strokeStyle = alpha(INK, 0.7);
    ctx.lineWidth = Math.max(0.7, len * 0.012);
    ctx.stroke();
    // Toes, wiggling
    ctx.beginPath();
    for (let i = 0; i < TOES.length; i++) {
      const toe = TOES[i]!;
      const wig = Math.sin(t * 7 + i * 1.1 + side) * 0.018;
      circle(ctx, X(toe[0], toe[1] + wig), Y(toe[0], toe[1] + wig), toe[2] * len * 1.5);
    }
    ctx.fillStyle = BONE;
    ctx.fill();
    neonStroke(ctx, GREEN, edge, 2.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- layout

/** Size multiplier for a prop at floor depth z: closer is bigger, softened so the front row stays modest. */
function grow(z: number): number {
  return (3 / z) ** 0.6;
}

// Every prop, back (big z) to front, so nearer ones overlap farther ones. X is the sideways
// spot at the tower's depth, in u; z = 3 is the tower's line. Props at or behind that line
// keep clear of the tower's column; nearer ones sit on the floor below the tower's base.
// Sizes are in u at the tower's depth; `period`/`offset` drive the rise-and-sink loop.
type Prop =
  | { kind: "stone"; X: number; z: number; w: number; h: number; stone: Stone; seed: number }
  | { kind: "pumpkin"; X: number; z: number; size: number }
  | { kind: "arm" | "skull" | "feet"; X: number; z: number; size: number; period: number; offset: number; seed: number };

const PROPS: readonly Prop[] = [
  { kind: "stone", X: -0.62, z: 4.2, w: 0.06, h: 0.11, stone: "cross", seed: 5 },
  { kind: "pumpkin", X: 0.42, z: 3.7, size: 0.052 },
  { kind: "stone", X: -0.36, z: 3.15, w: 0.085, h: 0.118, stone: "round", seed: 1 },
  { kind: "stone", X: 0.465, z: 3.0, w: 0.072, h: 0.092, stone: "slab", seed: 2 },
  { kind: "arm", X: 0.265, z: 2.3, size: 0.1, period: 7, offset: 1, seed: 2 },
  { kind: "skull", X: -0.214, z: 2.0, size: 0.062, period: 9, offset: 0, seed: 0 },
  { kind: "arm", X: 0.21, z: 1.75, size: 0.085, period: 8.5, offset: 0.2, seed: 1 },
  { kind: "feet", X: -0.06, z: 1.6, size: 0.09, period: 10, offset: 0.5, seed: 0 },
  { kind: "stone", X: -0.205, z: 1.45, w: 0.07, h: 0.085, stone: "round", seed: 3 },
];
const GROW = PROPS.map((p) => grow(p.z));

// Will-o'-wisps drifting low over the graves: floor spot, height above it (u), phase.
const WISPS = [
  { X: -0.44, z: 3.4, h: 0.13, phase: 0 },
  { X: -0.27, z: 2.6, h: 0.09, phase: 2.2 },
  { X: 0.17, z: 2.35, h: 0.035, phase: 1.7 },
  { X: -0.08, z: 2.15, h: 0.05, phase: 3.1 },
  { X: 0.12, z: 1.9, h: 0.06, phase: 4.4 },
  { X: 0.36, z: 1.55, h: 0.08, phase: 5.3 },
].map((w) => ({ ...w, k: grow(w.z) }));
const WISP_PASSES = [
  { scale: 2.8, color: alpha(GREEN, 0.09) },
  { scale: 1.7, color: alpha(GREEN, 0.3) },
  { scale: 1, color: mix(GREEN, "#ffffff", 0.7) },
];

/** The farthest floor row anything stands on: once it has sunk below the screen, so has the rest. */
const FAR_Z = Math.max(...PROPS.map((p) => p.z), ...WISPS.map((w) => w.z));

/** Soft green lights bobbing over the graveyard: a halo, a glow and a hot core, each one batch. */
function wisps(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const t = s.t;
  for (const pass of WISP_PASSES) {
    ctx.beginPath();
    for (const w of WISPS) {
      const p = floor(s, w.X, w.z);
      const x = p.x + Math.sin(t * 0.7 + w.phase) * u * 0.025 * w.k;
      const y = p.y - w.h * u * w.k + Math.sin(t * 1.3 + w.phase * 2) * u * 0.015 * w.k;
      if (y > s.cssH + 20 || y < -20) continue;
      const r = u * 0.0065 * w.k * (0.85 + 0.15 * Math.sin(t * 5 + w.phase * 3));
      circle(ctx, x, y, r * pass.scale);
    }
    ctx.fillStyle = pass.color;
    ctx.fill();
  }
}

export function graveyard(ctx: Ctx, s: Scene): void {
  // The tallest thing on the back row (cross, pumpkin, a wisp) reaches under 0.2u above it.
  if (floor(s, 0, FAR_Z).y - s.u * 0.2 > s.cssH) return;
  const u = s.u;
  const t = s.t;
  for (let i = 0; i < PROPS.length; i++) {
    const prop = PROPS[i]!;
    const k = GROW[i]!;
    const p = floor(s, prop.X, prop.z);
    const x = p.x;
    const y = p.y;
    const tall = (prop.kind === "stone" ? prop.h : prop.size * 2.5) * u * k;
    if (y - tall > s.cssH || y + tall < 0) continue;
    switch (prop.kind) {
      case "stone":
        tombstone(ctx, s, x, y, prop.w * u * k, prop.h * u * k, prop.stone, prop.seed);
        break;
      case "pumpkin":
        jackOLantern(ctx, s, x, y, prop.size * u * k);
        break;
      case "arm": {
        const len = prop.size * u * k;
        skeletonArm(ctx, s, x, y, len, emerge(t, prop.period, prop.offset), prop.seed);
        mound(ctx, s, x, y + 2, len * 0.75, 21 + i);
        break;
      }
      case "skull": {
        const size = prop.size * u * k;
        risingSkull(ctx, s, x, y, size, emerge(t, prop.period, prop.offset));
        mound(ctx, s, x, y + 2, size * 1.45, 21 + i);
        break;
      }
      case "feet": {
        const len = prop.size * u * k;
        bonyFeet(ctx, s, x, y, len, emerge(t, prop.period, prop.offset));
        mound(ctx, s, x, y + 2, len * 0.8, 21 + i);
        break;
      }
    }
  }
  wisps(ctx, s);
}

import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CLOUD, DOOR, FACE, GOLD, INK, IRON, OPENING, RAINBOW, SILL, THATCH, WHITEWASH, WOOL } from "./colors";
import { block } from "./shapes";
import { sparkle } from "./sky";
import { centerX, inkW } from "./tower";

// What stands on the meadow round the round tower, all of it near (flat two-tone fills, one ink
// weight) and none of it rising above the base block's top, so the slider's first pass never
// sweeps over it. On the left a whitewashed cottage under golden thatch, its red half-door
// between two windows, a curl of turf smoke from the chimney. A sheep either side, one of them
// grazing. On the right, at the screen's edge, a rainbow comes down out of a little cloud into
// a black pot heaped with gold, a glint winking on the coins. Two things rise higher, both at
// the screen's edges like Classic's kite: the faint smoke, and the rainbow, whose arc and cloud
// reach up through the slider's first lanes at the right edge, where it turns (the pot stays low).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

// ---------------------------------------------------------------- the cottage

/** The cottage: its center, its foot, the walls' half width and height, the thatch. */
const COTTAGE_X = -0.37;
const COTTAGE_FOOT = 0.135;
const WALL_HW = 0.088;
const WALL_H = 0.06;
const EAVES_HW = 0.104;
const EAVES = 0.052;
const RIDGE_HW = 0.072;
const RIDGE = 0.122;
const CHIMNEY_X = 0.05;
const CHIMNEY_TOP = 0.14;

export function cottage(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + COTTAGE_X * u;
  const foot = s.groundY + COTTAGE_FOOT * u;
  if (foot - u * 0.16 > s.cssH) return;
  const lw = inkW(s);
  // Chimneys at both gable ends, standing on the ridge, each with a dark cap.
  const cw = u * 0.028;
  const ch = (CHIMNEY_TOP - RIDGE + 0.012) * u;
  const ctop = foot - CHIMNEY_TOP * u;
  ctx.beginPath();
  ctx.rect(x - CHIMNEY_X * u - cw / 2, ctop, cw, ch);
  ctx.rect(x + CHIMNEY_X * u - cw / 2, ctop, cw, ch);
  ctx.fillStyle = WHITEWASH.body;
  ctx.fill();
  ctx.fillStyle = WHITEWASH.shade;
  ctx.fillRect(x - CHIMNEY_X * u + cw * 0.18, ctop, cw * 0.32, ch);
  ctx.fillRect(x + CHIMNEY_X * u + cw * 0.18, ctop, cw * 0.32, ch);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.rect(x - CHIMNEY_X * u - cw * 0.62, ctop - u * 0.007, cw * 1.24, u * 0.008);
  ctx.rect(x + CHIMNEY_X * u - cw * 0.62, ctop - u * 0.007, cw * 1.24, u * 0.008);
  ctx.fillStyle = FACE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // Whitewashed walls, shaded under the eaves.
  ctx.beginPath();
  ctx.rect(x - WALL_HW * u, foot - WALL_H * u, WALL_HW * 2 * u, WALL_H * u);
  ctx.fillStyle = WHITEWASH.body;
  ctx.fill();
  ctx.fillStyle = WHITEWASH.shade;
  ctx.fillRect(x - WALL_HW * u, foot - WALL_H * u, WALL_HW * 2 * u, u * 0.012);
  ctx.fillRect(x - WALL_HW * u, foot - u * 0.007, WALL_HW * 2 * u, u * 0.007);
  ink(ctx, lw, INK);
  // Windows either side of the door: dark panes, a white cross bar, a blue sill.
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) ctx.rect(x + m * u * 0.05 - u * 0.014, foot - u * 0.043, u * 0.028, u * 0.025);
  ctx.fillStyle = OPENING;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = WHITEWASH.light;
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    ctx.rect(x + m * u * 0.05 - u * 0.0018, foot - u * 0.043, u * 0.0036, u * 0.025);
    ctx.rect(x + m * u * 0.05 - u * 0.014, foot - u * 0.032, u * 0.028, u * 0.0034);
  }
  ctx.fill();
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) ctx.rect(x + m * u * 0.05 - u * 0.018, foot - u * 0.018, u * 0.036, u * 0.006);
  ctx.fillStyle = SILL;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The red half-door: two leaves, a latch.
  const dw = u * 0.03;
  const dh = u * 0.046;
  ctx.beginPath();
  ctx.rect(x - dw / 2, foot - dh, dw, dh);
  ctx.fillStyle = DOOR.body;
  ctx.fill();
  ctx.fillStyle = DOOR.light;
  ctx.fillRect(x - dw / 2, foot - dh, dw * 0.28, dh);
  ctx.fillStyle = DOOR.shade;
  ctx.fillRect(x - dw / 2, foot - dh * 0.5, dw, Math.max(1, u * 0.003));
  ink(ctx, lw * 0.85, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x + dw * 0.28, foot - dh * 0.38, u * 0.0028);
  ctx.fill();
  thatch(ctx, s, x, foot, lw);
}

/** The thatch: a thick rounded roof over the walls, lit along its top, combed with a few strokes. */
function thatchPath(ctx: Ctx, x: number, foot: number, u: number): void {
  const eaves = foot - EAVES * u;
  const ridge = foot - RIDGE * u;
  const r = u * 0.018;
  ctx.beginPath();
  ctx.moveTo(x - EAVES_HW * u, eaves);
  ctx.quadraticCurveTo(x - EAVES_HW * u - u * 0.004, eaves - u * 0.012, x - (EAVES_HW - 0.01) * u, eaves - u * 0.016);
  ctx.lineTo(x - RIDGE_HW * u, ridge + r);
  ctx.quadraticCurveTo(x - RIDGE_HW * u + u * 0.004, ridge, x - RIDGE_HW * u + r, ridge);
  ctx.lineTo(x + RIDGE_HW * u - r, ridge);
  ctx.quadraticCurveTo(x + RIDGE_HW * u - u * 0.004, ridge, x + RIDGE_HW * u, ridge + r);
  ctx.lineTo(x + (EAVES_HW - 0.01) * u, eaves - u * 0.016);
  ctx.quadraticCurveTo(x + EAVES_HW * u + u * 0.004, eaves - u * 0.012, x + EAVES_HW * u, eaves);
  ctx.quadraticCurveTo(x, eaves + u * 0.01, x - EAVES_HW * u, eaves);
  ctx.closePath();
}

function thatch(ctx: Ctx, s: Scene, x: number, foot: number, lw: number): void {
  const u = s.u;
  const ridge = foot - RIDGE * u;
  const eaves = foot - EAVES * u;
  thatchPath(ctx, x, foot, u);
  ctx.fillStyle = THATCH.body;
  ctx.fill();
  // A lit band along the ridge and a shaded one along the eaves, both inside the outline.
  ctx.fillStyle = THATCH.light;
  ctx.fillRect(x - (RIDGE_HW - 0.012) * u, ridge + lw * 0.4, (RIDGE_HW - 0.012) * 2 * u, u * 0.013);
  ctx.fillStyle = THATCH.shade;
  ctx.beginPath();
  ctx.moveTo(x - EAVES_HW * u, eaves);
  ctx.quadraticCurveTo(x, eaves + u * 0.01, x + EAVES_HW * u, eaves);
  ctx.lineTo(x + (EAVES_HW - 0.007) * u, eaves - u * 0.011);
  ctx.quadraticCurveTo(x, eaves - u * 0.003, x - (EAVES_HW - 0.007) * u, eaves - u * 0.011);
  ctx.closePath();
  ctx.fill();
  // Combed straw: short strokes running down the slope.
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const tx = x + i * u * 0.019;
    ctx.moveTo(tx + i * u * 0.002, ridge + u * 0.024);
    ctx.lineTo(tx + i * u * 0.005, eaves - u * 0.014);
  }
  ctx.strokeStyle = THATCH.shade;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.lineCap = "round";
  ctx.stroke();
  thatchPath(ctx, x, foot, u);
  ink(ctx, lw, INK);
}

/** Puffs of turf smoke rising from the left chimney: x drift and growth over a slow cycle. */
const SMOKE_PUFFS = 3;
const SMOKE_CYCLE = 6;

/** A thin curl of turf smoke from the left chimney: puffs rise, swell and fade, out toward the edge. */
export function smoke(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + (COTTAGE_X - CHIMNEY_X) * u;
  const y = s.groundY + (COTTAGE_FOOT - CHIMNEY_TOP - 0.024) * u;
  if (y - u * 0.12 > s.cssH) return;
  ctx.fillStyle = "#eef0f4";
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const k = (s.t / SMOKE_CYCLE + i / SMOKE_PUFFS) % 1;
    ctx.globalAlpha = 0.75 * Math.sin(k * Math.PI);
    ctx.beginPath();
    circle(ctx, x - k * u * 0.024 + Math.sin(k * 5 + i) * u * 0.004, y - k * u * 0.085, u * (0.007 + k * 0.009));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- sheep

/** The sheep: x (u from center), foot (u below the floor line), facing (+1 right), whether grazing. */
export const SHEEP = [
  [-0.35, 0.3, 1, true],
  [0.335, 0.29, -1, false],
] as const;

/** Where the legs stand, in units of the body's half length. */
const LEGS = [-0.55, -0.25, 0.3, 0.6] as const;

/** Wool puffs over the body: [dx, dy, r] in units of the body's half length. */
const FLEECE = [
  [-0.62, 0.05, 0.42],
  [-0.2, -0.22, 0.5],
  [0.28, -0.2, 0.48],
  [0.66, 0.06, 0.4],
  [0, 0.18, 0.55],
] as const;

/** Scratch pose of each sheep this frame: body center, foot, facing, head center and turn. */
const POSE = SHEEP.map(() => ({ x: 0, cy: 0, foot: 0, m: 1, hx: 0, hy: 0, c: 1, sn: 0, tilt: 0 }));

/** Both sheep, every pass shared: legs, fleece (ink rim, shade, wool, lit caps), ears, heads, eyes, crown tufts. */
export function sheep(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (s.groundY + u * 0.2 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const L = u * 0.034;
  for (let i = 0; i < SHEEP.length; i++) {
    const [sx, sf, m, grazing] = SHEEP[i]!;
    const p = POSE[i]!;
    p.x = cx + sx * u;
    p.foot = s.groundY + sf * u;
    p.cy = p.foot - u * 0.036;
    p.m = m;
    // The head: down in the grass and nodding as it grazes, or up and looking about. It turns
    // round where it joins the neck; the ear and the eye turn with it.
    const nod = grazing ? 0.5 + 0.5 * Math.sin(s.t * 1.1 + i * 2) : 0;
    p.hx = p.x + m * L * (grazing ? 1.02 : 1.08);
    p.hy = grazing ? p.cy + L * (0.42 + 0.12 * nod) : p.cy - L * 0.32 + Math.sin(s.t * 0.5 + i) * L * 0.04;
    p.tilt = grazing ? m * (0.9 + 0.12 * nod) : m * 0.25;
    p.c = Math.cos(p.tilt);
    p.sn = Math.sin(p.tilt);
  }
  ctx.beginPath();
  for (const p of POSE) for (const dx of LEGS) ctx.rect(p.x + dx * L - u * 0.0035, p.cy, u * 0.007, p.foot - p.cy);
  ctx.fillStyle = FACE;
  ctx.fill();
  // The fleece's ink rim is the same puffs a line wider, filled in ink under the wool.
  ctx.beginPath();
  for (const p of POSE) for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + dx * L, p.cy + dy * L, r * L + lw);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  for (const p of POSE) for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + dx * L, p.cy + dy * L, r * L);
  ctx.fillStyle = WOOL.shade;
  ctx.fill();
  ctx.beginPath();
  for (const p of POSE) for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + dx * L - r * L * 0.05, p.cy + dy * L - r * L * 0.16, r * L * 0.86);
  ctx.fillStyle = WOOL.body;
  ctx.fill();
  ctx.beginPath();
  for (const p of POSE) for (const [dx, dy, r] of FLEECE) if (r > 0.45) circle(ctx, p.x + (dx - 0.18) * L, p.cy + (dy - 0.28) * L, r * L * 0.34);
  ctx.fillStyle = WOOL.light;
  ctx.fill();
  ctx.beginPath();
  for (const p of POSE) {
    const ex = -p.m * L * 0.05;
    const ey = -L * 0.36;
    oval(ctx, p.hx + ex * p.c - ey * p.sn, p.hy + ex * p.sn + ey * p.c, L * 0.3, L * 0.12, p.tilt - p.m * 0.5);
  }
  ctx.fillStyle = FACE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (const p of POSE) oval(ctx, p.hx, p.hy, L * 0.3, L * 0.42, p.tilt);
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (const p of POSE) {
    const ix = p.m * L * 0.1;
    const iy = -L * 0.1;
    circle(ctx, p.hx + ix * p.c - iy * p.sn, p.hy + ix * p.sn + iy * p.c, L * 0.075);
  }
  ctx.fill();
  // A tuft of wool on the crown, over where the head joins the body.
  ctx.beginPath();
  for (const p of POSE) circle(ctx, p.x + p.m * L * 0.78, p.cy - L * 0.15, L * 0.3);
  ctx.fillStyle = WOOL.body;
  ctx.fill();
}

// ---------------------------------------------------------------- the rainbow and the pot of gold

/** The rainbow: center of its ellipse (u), outer radii, band width; it ends in the pot. */
const BOW_X = 0.305;
const BOW_Y = 0.117;
const BOW_RX = 0.13;
const BOW_RY = 0.29;
const BOW_BAND = 0.0075;
/** The pot of gold: its center and foot. */
const POT_X = 0.412;
const POT_FOOT = 0.165;
/** The little cloud the rainbow comes out of. */
const PUFF_X = 0.318;
const PUFF_Y = -0.146;
const PUFFS = [
  [-0.03, 0.006, 0.019],
  [-0.008, -0.012, 0.026],
  [0.018, -0.004, 0.023],
  [0.037, 0.007, 0.016],
] as const;

/** The rainbow coming down out of its little cloud; its foot ends in the pot of gold (drawn after it). */
export function rainbowArc(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = centerX(s);
  if (s.groundY + PUFF_Y * u - u * 0.06 > s.cssH) return;
  const lw = inkW(s);
  const x = cx + BOW_X * u;
  const y = s.groundY + BOW_Y * u;
  const rx = BOW_RX * u;
  const ry = BOW_RY * u;
  const bw = BOW_BAND * u;
  const a0 = -Math.PI / 2 - 0.06;
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx - i * bw, ry - i * bw, 0, a0, 0);
    ctx.ellipse(x, y, rx - (i + 1) * bw, ry - (i + 1) * bw, 0, 0, a0, true);
    ctx.closePath();
    ctx.fillStyle = RAINBOW[i]!;
    ctx.fill();
  }
  const n = RAINBOW.length;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, a0, 0);
  ctx.moveTo(x + rx - n * bw, y);
  ctx.ellipse(x, y, rx - n * bw, ry - n * bw, 0, 0, a0, true);
  ink(ctx, lw, INK);
  puff(ctx, s, cx + PUFF_X * u, s.groundY + PUFF_Y * u, lw);
}

/** The pot of gold at the rainbow's foot. */
export function potOfGold(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const foot = s.groundY + POT_FOOT * u;
  if (foot - u * 0.1 > s.cssH) return;
  pot(ctx, s, centerX(s) + POT_X * u, foot, inkW(s));
}

/** The little inked cloud at the rainbow's top end. */
function puff(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  for (const [dx, dy, r] of PUFFS) circle(ctx, x + dx * u, y + dy * u, r * u + lw);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, r] of PUFFS) circle(ctx, x + dx * u, y + dy * u, r * u);
  ctx.fillStyle = CLOUD.shade;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, r] of PUFFS) circle(ctx, x + dx * u - r * u * 0.05, y + dy * u - r * u * 0.16, r * u * 0.88);
  ctx.fillStyle = CLOUD.body;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, r] of PUFFS) if (r > 0.02) circle(ctx, x + dx * u - r * u * 0.3, y + dy * u - r * u * 0.42, r * u * 0.4);
  ctx.fillStyle = CLOUD.light;
  ctx.fill();
}

/** Coins heaped over the pot's rim: [dx, dy] in u from the rim's center. */
const COINS = [
  [-0.022, -0.006],
  [0, -0.013],
  [0.021, -0.005],
  [-0.009, -0.021],
  [0.012, -0.02],
] as const;

/** A black iron pot on three stubby legs, heaped with gold, a glint winking on the coins. */
function pot(ctx: Ctx, s: Scene, x: number, foot: number, lw: number): void {
  const u = s.u;
  const hw = u * 0.036;
  const rim = foot - u * 0.05;
  // Legs.
  ctx.beginPath();
  ctx.rect(x - hw * 0.72, foot - u * 0.012, u * 0.008, u * 0.012);
  ctx.rect(x + hw * 0.72 - u * 0.008, foot - u * 0.012, u * 0.008, u * 0.012);
  ctx.fillStyle = IRON.shade;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The heap of gold above the rim.
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.95, rim);
  ctx.quadraticCurveTo(x - hw * 0.7, rim - u * 0.034, x, rim - u * 0.036);
  ctx.quadraticCurveTo(x + hw * 0.7, rim - u * 0.034, x + hw * 0.95, rim);
  ctx.closePath();
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (const [dx, dy] of COINS) oval(ctx, x + dx * u, rim + dy * u, u * 0.009, u * 0.006);
  ctx.fillStyle = GOLD.light;
  ctx.fill();
  ctx.strokeStyle = GOLD.shade;
  ctx.lineWidth = Math.max(1, lw * 0.5);
  ctx.stroke();
  // The pot: a round iron belly under a thick rim.
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.92, rim + u * 0.006);
  ctx.bezierCurveTo(x - hw * 1.18, rim + u * 0.03, x - hw * 0.8, foot - u * 0.006, x, foot - u * 0.006);
  ctx.bezierCurveTo(x + hw * 0.8, foot - u * 0.006, x + hw * 1.18, rim + u * 0.03, x + hw * 0.92, rim + u * 0.006);
  ctx.closePath();
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = IRON.light;
  ctx.beginPath();
  oval(ctx, x - hw * 0.45, rim + u * 0.02, hw * 0.22, u * 0.008, -0.5);
  ctx.fill();
  ctx.beginPath();
  block(ctx, x - hw, rim - u * 0.002, hw * 2, u * 0.011, u * 0.004);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.fillRect(x - hw + u * 0.004, rim, hw * 2 - u * 0.008, u * 0.003);
  ink(ctx, lw, INK);
  // A glint winking on the gold.
  const wink = Math.max(0, Math.sin(s.t * 1.7));
  if (wink > 0.05) {
    ctx.globalAlpha = wink;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    sparkle(ctx, x + u * 0.012, rim - u * 0.026, u * 0.01 * (0.6 + 0.4 * wink));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Everything on the meadow round the tower (the tower itself is drawn after the cottage, before the sheep). */
export function meadowBack(ctx: Ctx, s: Scene): void {
  smoke(ctx, s);
  cottage(ctx, s);
  rainbowArc(ctx, s);
  potOfGold(ctx, s);
}

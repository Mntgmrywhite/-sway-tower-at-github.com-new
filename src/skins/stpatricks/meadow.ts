import { circle, ink, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { DOOR, FACE, GOLD, INK, IRON, OPENING, RAINBOW, SILL, THATCH, WHITEWASH, WOOD } from "./colors";
import { bowSweep, POT_FOOT, POT_X, potAndLeprechaun } from "./gold";
import { block } from "./shapes";
import { centerX, inkW } from "./tower";

// What stands on the meadow round the round tower, all of it near (flat two-tone fills, one ink
// weight) and none of it rising above the base block's top, so the slider's first pass never
// sweeps over it. On the left, near the wall, a whitewashed cottage under golden thatch, its red
// half-door between two windows, a curl of turf smoke from the chimney (the flock frolics in the
// pasture behind it: pasture.ts). On the right a rainbow stands in a round arch on the grass,
// between the round tower and the screen's edge; it sweeps into being in the first seconds, and
// the leprechaun brings his black pot heaped with gold out from behind the round tower and sets
// it down at its right foot, then keeps watch behind it (gold.ts). In front of them a red
// toadstool with his cobbler's work left on it: a little buckled shoe and his hammer. Only the
// faint smoke rises higher, at the screen's left edge like Classic's kite.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

// ---------------------------------------------------------------- the cottage

/** The cottage: its center, its foot, the walls' half width and height, the thatch. */
const COTTAGE_X = -0.37;
const COTTAGE_FOOT = 0.25;
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

// ---------------------------------------------------------------- the rainbow and the pot of gold

/** The rainbow's bands' width (u). */
const BAND = 0.0085;
/** Half the bands' total width (u). */
const BOW_HALF = (BAND * RAINBOW.length) / 2;
/** The ground line its feet stand on: a little behind the pot's, where the pot's belly is wide enough to hide the right foot (u). */
export const BOW_FOOT = POT_FOOT - 0.02;
/**
 * Its outer radii, across and up (u): as wide as the meadow between the round tower's drum and
 * the pot of gold allows, and a little taller than half that, so its top just clears the floor
 * line well right of the tower's column.
 */
export const BOW_RX = 0.108;
export const BOW_RY = 0.165;
/** Its center: the right foot's bands come down right behind the pot of gold. */
export const BOW_X = POT_X + BOW_HALF - BOW_RX;

/**
 * The rainbow: a round arch of six bands, red outside to violet inside, standing on the meadow
 * right of the round tower. Its left foot stands on the grass, its right comes down behind the
 * pot of gold (drawn after it, the pot hides the bands' ends). It forms in the first seconds:
 * band by band, outside in, each sweeps up from the left foot, over the top and down to the
 * right (gold.ts times it), and the ink follows the outer and inner bands as they go.
 */
export function rainbowArc(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const y = s.groundY + BOW_FOOT * u;
  if (y - BOW_RY * u > s.cssH) return;
  const n = RAINBOW.length;
  const outer = bowSweep(0, s.t);
  if (outer <= 0) return;
  const x = centerX(s) + BOW_X * u;
  const bw = BAND * u;
  const rx = BOW_RX * u;
  const ry = BOW_RY * u;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * bowSweep(i, s.t);
    if (a <= 0) break;
    ctx.beginPath();
    ctx.ellipse(x, y, rx - i * bw, ry - i * bw, 0, Math.PI, Math.PI + a);
    ctx.ellipse(x, y, rx - (i + 1) * bw, ry - (i + 1) * bw, 0, Math.PI + a, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = RAINBOW[i]!;
    ctx.fill();
  }
  // The ink along its outer and inner edges, as far as their bands have come.
  const inner = bowSweep(n - 1, s.t);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * (1 + outer));
  if (inner > 0) {
    ctx.moveTo(x - rx + n * bw, y);
    ctx.ellipse(x, y, rx - n * bw, ry - n * bw, 0, Math.PI, Math.PI * (1 + inner));
  }
  ink(ctx, inkW(s), INK);
}

// ---------------------------------------------------------------- the cobbler's toadstool

/** The toadstool: its center and foot (u). */
const STOOL_X = 0.318;
const STOOL_FOOT = 0.298;
const STOOL_CAP = shadesOf("#ef4b3c");

function shadesOf(c: string): { light: string; body: string; shade: string } {
  return { light: mix(c, "#ffffff", 0.36), body: c, shade: mix(c, "#1a1030", 0.24) };
}

/**
 * A red toadstool spotted white, with the leprechaun's cobbling left on it: a little black
 * shoe with a gold buckle, and his hammer leaning against the stalk.
 */
export function toadstool(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const foot = s.groundY + STOOL_FOOT * u;
  if (foot - u * 0.07 > s.cssH) return;
  const x = centerX(s) + STOOL_X * u;
  const lw = inkW(s);
  // The hammer, leaning on the stalk's left: a wooden haft, an iron head.
  ctx.beginPath();
  ctx.moveTo(x - u * 0.031, foot - u * 0.001);
  ctx.lineTo(x - u * 0.012, foot - u * 0.03);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.0055 + lw;
  ctx.stroke();
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = u * 0.0055;
  ctx.stroke();
  ctx.beginPath();
  block(ctx, x - u * 0.02, foot - u * 0.039, u * 0.017, u * 0.0085, u * 0.002);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The stalk, creamy, a little wider at its foot.
  ctx.beginPath();
  ctx.moveTo(x - u * 0.008, foot - u * 0.03);
  ctx.quadraticCurveTo(x - u * 0.01, foot - u * 0.008, x - u * 0.013, foot);
  ctx.lineTo(x + u * 0.013, foot);
  ctx.quadraticCurveTo(x + u * 0.01, foot - u * 0.008, x + u * 0.008, foot - u * 0.03);
  ctx.closePath();
  ctx.fillStyle = WHITEWASH.body;
  ctx.fill();
  ctx.fillStyle = WHITEWASH.shade;
  ctx.fillRect(x + u * 0.003, foot - u * 0.028, u * 0.006, u * 0.026);
  ink(ctx, lw * 0.85, INK);
  // The cap: a red dome, lit on its crown, its white spots.
  const capY = foot - u * 0.03;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.03, capY + u * 0.002);
  ctx.bezierCurveTo(x - u * 0.03, capY - u * 0.034, x + u * 0.03, capY - u * 0.034, x + u * 0.03, capY + u * 0.002);
  ctx.quadraticCurveTo(x, capY + u * 0.008, x - u * 0.03, capY + u * 0.002);
  ctx.closePath();
  ctx.fillStyle = STOOL_CAP.body;
  ctx.fill();
  ctx.fillStyle = STOOL_CAP.shade;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.03, capY + u * 0.002);
  ctx.quadraticCurveTo(x, capY + u * 0.008, x + u * 0.03, capY + u * 0.002);
  ctx.quadraticCurveTo(x, capY - u * 0.003, x - u * 0.03, capY + u * 0.002);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, x - u * 0.014, capY - u * 0.01, u * 0.0042);
  circle(ctx, x + u * 0.004, capY - u * 0.019, u * 0.0035);
  circle(ctx, x + u * 0.018, capY - u * 0.008, u * 0.0038);
  circle(ctx, x - u * 0.002, capY - u * 0.005, u * 0.0026);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - u * 0.03, capY + u * 0.002);
  ctx.bezierCurveTo(x - u * 0.03, capY - u * 0.034, x + u * 0.03, capY - u * 0.034, x + u * 0.03, capY + u * 0.002);
  ctx.quadraticCurveTo(x, capY + u * 0.008, x - u * 0.03, capY + u * 0.002);
  ink(ctx, lw, INK);
  // On the cap, the little shoe he is mending: black, curled toe, a gold buckle.
  const sx = x + u * 0.001;
  const sy = capY - u * 0.022;
  ctx.beginPath();
  ctx.moveTo(sx - u * 0.012, sy);
  ctx.lineTo(sx - u * 0.011, sy - u * 0.009);
  ctx.quadraticCurveTo(sx - u * 0.004, sy - u * 0.011, sx - u * 0.001, sy - u * 0.006);
  ctx.quadraticCurveTo(sx + u * 0.009, sy - u * 0.006, sx + u * 0.014, sy - u * 0.004);
  ctx.quadraticCurveTo(sx + u * 0.016, sy, sx + u * 0.012, sy + u * 0.001);
  ctx.closePath();
  ctx.fillStyle = "#2b2838";
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  ctx.rect(sx - u * 0.003, sy - u * 0.009, u * 0.0055, u * 0.004);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
}

/** Everything on the meadow round the tower (the tower itself is drawn after them: its drum hides the leprechaun till he comes out with his pot). */
export function meadowBack(ctx: Ctx, s: Scene): void {
  smoke(ctx, s);
  cottage(ctx, s);
  rainbowArc(ctx, s);
  potAndLeprechaun(ctx, s);
  toadstool(ctx, s);
}

import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { usFlag } from "./flag";
import { wash } from "./paint";
import type { Tone } from "./tone";
import { FLOODLIGHT } from "./colors";

// The town's two landmarks, the tallest things in it, standing among the treetops of the
// neighborhood beyond Main Street (the back row, town.ts), so they rise over Main Street at the
// start and stand along the bottom of the sky all the way up. Painted like the far town: soft
// washes from a lit side into shade, no lines; after dark their windows glow, the clock face is
// lit and a floodlight keeps the flag in its colors all night.
//  - The white church on the left: a clapboard front under a slate gable, a round window, a tall
//    arched window and red doors, and its steeple on the right: a square tower, the belfry with
//    its louvers and bell, a little lantern stage, a slate spire with a gilt ball and cross.
//  - The courthouse on the right: a sandstone block with tall windows in its wings, a portico of
//    four white columns under a pediment, bunting fans hung between them; the clock tower over
//    it, a colonnaded drum and a gilt dome flying the flag from its pole, toward the square.
// Positions are in u from the screen center, heights in u up from the line they stand on.

/** The church: its front's center, half width, wall height and gable; the steeple's center, half width, tower and spire. */
const CHURCH_X = -0.36;
const CHURCH_HW = 0.052;
const CHURCH_H = 0.115;
const CHURCH_RISE = 0.06;
/** The top of the church's gable (u above its line). */
export const CHURCH_TOP = CHURCH_H + CHURCH_RISE;
const STEEPLE_X = -0.29;
const STEEPLE_HW = 0.022;
const TOWER_TOP = 0.2;
const BELFRY = 0.06;
/** The spire's tip (its cross reaches higher, to STEEPLE_REACH). */
export const STEEPLE_TOP = 0.405;
export const STEEPLE_REACH = STEEPLE_TOP + 0.028;

/** The courthouse: body, portico, clock tower, drum, dome and the flag. */
const COURT_X = 0.335;
const COURT_HW = 0.072;
export const COURT_H = 0.15;
const CLOCK_HW = 0.03;
const CLOCK_TOP = 0.29;
const DRUM_TOP = 0.335;
export const DOME_TOP = 0.42;
export const POLE_TOP = 0.51;
/** The flag on the dome: its length and depth (u). It flies toward the square, so its canton is by the pole, on the right. */
export const FLAG_W = 0.058;
export const FLAG_H = 0.038;

/** A tall window with a round head, as its own subpath. */
function arched(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w / 2, y + h);
  ctx.lineTo(x - w / 2, y + w / 2);
  ctx.arc(x, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
}

/** The church and its steeple, standing on `line`. */
export function church(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x = cx + CHURCH_X * u;
  const hw = CHURCH_HW * u;
  const eaves = line - CHURCH_H * u;
  const peak = eaves - CHURCH_RISE * u;
  if (line - STEEPLE_REACH * u > s.cssH) return;
  // The front: clapboard in a wash from its lit left into the shade, under its gable.
  ctx.fillStyle = wash(ctx, peak, line, [tone.clapboard, tone.clapboard, tone.clapShade], [0, 0.55, 1]);
  ctx.beginPath();
  ctx.moveTo(x - hw, line + 1);
  ctx.lineTo(x - hw, eaves);
  ctx.lineTo(x, peak);
  ctx.lineTo(x + hw, eaves);
  ctx.lineTo(x + hw, line + 1);
  ctx.closePath();
  ctx.fill();
  // The roof's edge over the gable, slate; the shaded side of the nave behind it.
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = u * 0.006;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - hw - u * 0.004, eaves + u * 0.002);
  ctx.lineTo(x, peak - u * 0.003);
  ctx.lineTo(x + hw + u * 0.004, eaves + u * 0.002);
  ctx.stroke();
  // The round window, the tall arched window and the red doors under a little gable.
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  circle(ctx, x, eaves - CHURCH_RISE * u * 0.32, u * 0.009);
  arched(ctx, x, eaves + u * 0.012, u * 0.016, u * 0.04);
  ctx.fill();
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  arched(ctx, x, line - u * 0.04, u * 0.022, u * 0.04);
  ctx.fill();
  // The steeple: the square tower (lit face, shaded side), the belfry, the lantern, the spire.
  const tx = cx + STEEPLE_X * u;
  const thw = STEEPLE_HW * u;
  const towerTop = line - TOWER_TOP * u;
  const belfryTop = towerTop - BELFRY * u;
  ctx.fillStyle = wash(ctx, belfryTop, line, [tone.clapboard, tone.clapboard, tone.clapShade], [0, 0.6, 1]);
  ctx.beginPath();
  ctx.rect(tx - thw, belfryTop, thw * 2, line - belfryTop + 1);
  ctx.fill();
  ctx.fillStyle = tone.clapShade;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(tx + thw * 0.35, belfryTop, thw * 0.65, line - belfryTop + 1);
  ctx.globalAlpha = 1;
  // Cornices: a lit ledge at the top of each stage.
  ctx.fillStyle = tone.trim;
  ctx.fillRect(tx - thw * 1.15, towerTop - u * 0.003, thw * 2.3, u * 0.006);
  ctx.fillRect(tx - thw * 1.15, belfryTop - u * 0.004, thw * 2.3, u * 0.007);
  // The belfry's arched louver and its bell, a clock-like round window on the tower.
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  arched(ctx, tx, belfryTop + u * 0.012, thw * 1.05, BELFRY * u - u * 0.02);
  circle(ctx, tx, towerTop + u * 0.03, u * 0.008);
  arched(ctx, tx, towerTop + u * 0.06, thw * 0.7, u * 0.05);
  ctx.fill();
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.36, belfryTop + BELFRY * u * 0.72);
  ctx.quadraticCurveTo(tx - thw * 0.3, belfryTop + BELFRY * u * 0.38, tx, belfryTop + BELFRY * u * 0.36);
  ctx.quadraticCurveTo(tx + thw * 0.3, belfryTop + BELFRY * u * 0.38, tx + thw * 0.36, belfryTop + BELFRY * u * 0.72);
  ctx.closePath();
  ctx.fill();
  // The lantern stage: a narrower white drum with its own little arches.
  const lanternTop = belfryTop - u * 0.034;
  ctx.fillStyle = tone.clapboard;
  ctx.fillRect(tx - thw * 0.7, lanternTop, thw * 1.4, belfryTop - lanternTop);
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  arched(ctx, tx - thw * 0.3, lanternTop + u * 0.008, thw * 0.36, u * 0.018);
  arched(ctx, tx + thw * 0.3, lanternTop + u * 0.008, thw * 0.36, u * 0.018);
  ctx.fill();
  // The spire: slate, lit on its left, a gilt ball and a cross on its tip.
  const tip = line - STEEPLE_TOP * u;
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.8, lanternTop + 1);
  ctx.lineTo(tx, tip);
  ctx.lineTo(tx + thw * 0.8, lanternTop + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.slateShade;
  ctx.beginPath();
  ctx.moveTo(tx, tip);
  ctx.lineTo(tx + thw * 0.8, lanternTop + 1);
  ctx.lineTo(tx + thw * 0.1, lanternTop + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  circle(ctx, tx, tip - u * 0.003, u * 0.0042);
  ctx.rect(tx - u * 0.0014, line - STEEPLE_REACH * u, u * 0.0028, u * 0.024);
  ctx.rect(tx - u * 0.0065, line - (STEEPLE_REACH - 0.007) * u, u * 0.013, u * 0.0028);
  ctx.fill();
}

/** Scratch: the top of the courthouse flag's pole (where the flag hangs from). */
const POLE = { x: 0, y: 0 };

/** Where the courthouse flag's pole tops out, standing on `line`. */
export function poleTop(s: Scene, line: number): typeof POLE {
  POLE.x = s.cssW / 2 + COURT_X * s.u;
  POLE.y = line - POLE_TOP * s.u;
  return POLE;
}

/** A pleated fan of bunting hung from (x, y), radius r: three bands, red outermost, as their own subpaths in three fills. */
function fan(ctx: Ctx, tone: Tone, x: number, y: number, r: number): void {
  const bands = [tone.red, tone.white, tone.blue];
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = bands[b]!;
    ctx.beginPath();
    const r0 = r * (1 - b / 3);
    ctx.moveTo(x - r0, y);
    ctx.ellipse(x, y, r0, r0 * 0.8, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
  }
}

/** The courthouse, its clock tower, drum, dome and flag, standing on `line`. */
export function courthouse(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const x = s.cssW / 2 + COURT_X * u;
  if (line - POLE_TOP * u > s.cssH || x - COURT_HW * u > s.cssW) return;
  const hw = COURT_HW * u;
  const top = line - COURT_H * u;
  // The block: sandstone in a wash, its cornice and its base, tall windows in the wings.
  ctx.fillStyle = wash(ctx, top, line, [tone.stoneLit, tone.stone, tone.stoneShade], [0, 0.5, 1]);
  ctx.fillRect(x - hw, top, hw * 2, line - top + 1);
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - hw - u * 0.004, top - u * 0.006, hw * 2 + u * 0.008, u * 0.009);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x - hw, line - u * 0.018, hw * 2, u * 0.018);
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const k of [0.62, 0.86]) {
      arched(ctx, x + side * hw * k, top + u * 0.022, u * 0.011, u * 0.034);
      ctx.rect(x + side * hw * k - u * 0.0055, top + u * 0.074, u * 0.011, u * 0.03);
    }
  }
  ctx.fill();
  // The portico: a pediment over four white columns, bunting fans between them, the steps.
  const phw = hw * 0.46;
  const pTop = top - u * 0.004;
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  ctx.moveTo(x - phw - u * 0.006, pTop + u * 0.004);
  ctx.lineTo(x, pTop - u * 0.03);
  ctx.lineTo(x + phw + u * 0.006, pTop + u * 0.004);
  ctx.closePath();
  ctx.rect(x - phw - u * 0.006, pTop + u * 0.002, phw * 2 + u * 0.012, u * 0.008);
  for (let i = 0; i < 4; i++) ctx.rect(x - phw + (i * phw * 2) / 3 - u * 0.0035, pTop + u * 0.01, u * 0.007, COURT_H * u - u * 0.024);
  ctx.rect(x - phw - u * 0.01, line - u * 0.016, phw * 2 + u * 0.02, u * 0.007);
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(x - phw * 0.7, pTop - u * 0.001);
  ctx.lineTo(x, pTop - u * 0.022);
  ctx.lineTo(x + phw * 0.7, pTop - u * 0.001);
  ctx.closePath();
  for (let i = 0; i < 3; i++) ctx.rect(x - phw + (i * phw * 2) / 3 + u * 0.0035, pTop + u * 0.01, (phw * 2) / 3 - u * 0.007, COURT_H * u - u * 0.026);
  ctx.fill();
  for (let i = 0; i < 3; i++) fan(ctx, tone, x - phw + ((i + 0.5) * phw * 2) / 3, pTop + u * 0.012, (phw / 3) * 0.78);
  // The clock tower: a white square stage with the clock face, a cornice; the colonnaded drum; the gilt dome.
  const chw = CLOCK_HW * u;
  const clockTop = line - CLOCK_TOP * u;
  ctx.fillStyle = wash(ctx, clockTop, top, [tone.stoneLit, tone.stone, tone.stoneShade], [0, 0.6, 1]);
  ctx.fillRect(x - chw, clockTop, chw * 2, top - clockTop + 1);
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - chw - u * 0.004, clockTop - u * 0.005, chw * 2 + u * 0.008, u * 0.008);
  const fy = clockTop + (top - clockTop) * 0.42;
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  circle(ctx, x, fy, chw * 0.78);
  ctx.fill();
  ctx.fillStyle = tone.clock;
  ctx.beginPath();
  circle(ctx, x, fy, chw * 0.64);
  ctx.fill();
  // The hands: ten to two, as clocks in pictures are.
  ctx.strokeStyle = tone.slateShade;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, fy);
  ctx.lineTo(x - chw * 0.38, fy - chw * 0.26);
  ctx.moveTo(x, fy);
  ctx.lineTo(x + chw * 0.3, fy - chw * 0.42);
  ctx.stroke();
  const drumTop = line - DRUM_TOP * u;
  const dhw = chw * 0.86;
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - dhw, drumTop, dhw * 2, clockTop - drumTop);
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(x - dhw + dhw * 0.18 + (i * dhw * 1.64) / 3.4, drumTop + u * 0.008, dhw * 0.24, clockTop - drumTop - u * 0.014);
  ctx.fill();
  const domeR = dhw * 1.05;
  const domeTop = line - DOME_TOP * u;
  ctx.fillStyle = wash(ctx, domeTop, drumTop, [tone.gilt, tone.gilt, tone.giltShade], [0, 0.4, 1]);
  ctx.beginPath();
  ctx.moveTo(x - domeR, drumTop + 1);
  ctx.bezierCurveTo(x - domeR, drumTop - (drumTop - domeTop) * 0.7, x - domeR * 0.3, domeTop, x, domeTop);
  ctx.bezierCurveTo(x + domeR * 0.3, domeTop, x + domeR, drumTop - (drumTop - domeTop) * 0.7, x + domeR, drumTop + 1);
  ctx.closePath();
  ctx.fill();
  // Its ribs, a little lantern, and the pole.
  ctx.strokeStyle = tone.giltShade;
  ctx.lineWidth = Math.max(0.7, u * 0.0016);
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) {
    ctx.moveTo(x + k * domeR, drumTop);
    ctx.quadraticCurveTo(x + k * domeR * 0.9, domeTop + (drumTop - domeTop) * 0.2, x, domeTop);
  }
  ctx.stroke();
  const pole = poleTop(s, line);
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - u * 0.006, domeTop - u * 0.012, u * 0.012, u * 0.013);
  ctx.fillRect(x - u * 0.0017, pole.y, u * 0.0034, domeTop - pole.y);
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  circle(ctx, x, pole.y - u * 0.003, u * 0.0045);
  ctx.fill();
  // After dark the floodlight's beam up the pole, then the flag.
  if (tone.flood > 0.01) {
    ctx.globalAlpha = tone.flood * 0.22;
    ctx.fillStyle = FLOODLIGHT;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.006, domeTop - u * 0.01);
    ctx.lineTo(x - FLAG_W * u * 1.1, pole.y - u * 0.004);
    ctx.lineTo(x + u * 0.008, pole.y - u * 0.004);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  usFlag(ctx, pole.x - u * 0.0017, pole.y + u * 0.002, FLAG_W * u, FLAG_H * u, -1, u * 0.003, s.t * 2.4, {
    red: tone.flagRed,
    white: tone.flagWhite,
    blue: tone.flagBlue,
  });
}

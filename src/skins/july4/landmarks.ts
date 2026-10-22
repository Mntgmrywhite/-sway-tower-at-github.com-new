import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { usFlag } from "./flag";
import { speck, starPath } from "./shapes";
import type { Tone } from "./tone";
import { CHURCH_HW, CHURCH_X, pleatedFans } from "./town";

// The town's two landmarks, the tallest things in it, so they stand out of the cloud sea once it
// has covered the rest (far.ts). Printed like the rest of the far town: flat inks lit from the
// left, a flat shadow plane on the right, no outlines; from dusk they turn to the poster's
// skyline silhouettes, their windows, the belfry and the clock face lit (tone.ts).
//  - The church on Main Street: a white clapboard front with a slate gable, a rose window, two
//    tall arched windows and red doors under a little porch, and the steeple on its right:
//    a square tower, the belfry with its bell, a lantern stage and a slate spire with a gilt
//    ball and cross.
//  - The courthouse on the square's right: a sandstone block on a rusticated base, tall
//    windows either wing, a portico of four columns under a pediment with a gilt star, pleated
//    fans of bunting hung between its columns and a great flag hung down it; the clock tower, a colonnaded drum and a gilt
//    ribbed dome with the flag flying from its pole, toward the square. After dark a floodlight
//    at the dome's foot keeps the flag lit all night, so it always reads as the Stars and Stripes.
// Positions are in u from the screen center, heights in u up from the line they stand on.

/** The church's body height and gable; the steeple's center, half width, tower top, and the spire's tip. */
const CHURCH_H = 0.13;
const CHURCH_RISE = 0.07;
const STEEPLE_X = -0.29;
const STEEPLE_HW = 0.026;
const STEEPLE_TOWER = 0.235;
/** The spire's tip (its cross reaches higher, to STEEPLE_REACH). */
export const STEEPLE_TOP = 0.405;
export const STEEPLE_REACH = STEEPLE_TOP + 0.028;

/** The courthouse: body, portico, tower, dome and the flag. */
const COURT_X = 0.32;
const COURT_HW = 0.06;
const COURT_H = 0.18;
const TOWER_HW = 0.038;
const TOWER_H = 0.33;
const DOME_R = 0.05;
export const DOME_TOP = 0.45;
export const POLE_TOP = 0.535;
/** The flag on the dome: its length and depth (u). It flies toward the square, so its canton is by the pole, on the right. */
export const FLAG_W = 0.058;
export const FLAG_H = 0.038;

/** A gable from x - hw to x + hw at y, peaking `rise` above it, as its own subpath. */
function gable(ctx: Ctx, x: number, hw: number, y: number, rise: number): void {
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x, y - rise);
  ctx.lineTo(x + hw, y);
  ctx.closePath();
}

/** A tall window with a round head, as its own subpath. */
function arched(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w / 2, y + h);
  ctx.lineTo(x - w / 2, y + w / 2);
  ctx.arc(x, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
}

/** The church (standing on `line`): the whole front while the land shows, else only the steeple. */
export function church(ctx: Ctx, s: Scene, tone: Tone, line: number, whole: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x = cx + CHURCH_X * u;
  const hw = CHURCH_HW * u;
  const tx = cx + STEEPLE_X * u;
  const thw = STEEPLE_HW * u;
  if (whole) {
    const eaves = line - CHURCH_H * u;
    const rise = u * CHURCH_RISE;
    const gx = x - u * 0.016;
    const ghw = hw - u * 0.016;
    // The clapboard front and its gable, off center (the steeple stands on the right corner).
    ctx.fillStyle = tone.clapboard;
    ctx.beginPath();
    ctx.rect(x - hw, eaves, hw * 2, CHURCH_H * u + 1);
    gable(ctx, gx, ghw, eaves + 1, rise);
    ctx.fill();
    // The shaded half of the front (the steeple's side), and the clapboards: thin shade lines across the lit half.
    ctx.fillStyle = tone.clapShade;
    ctx.beginPath();
    ctx.moveTo(gx, eaves - rise);
    ctx.lineTo(gx + ghw, eaves);
    ctx.lineTo(x + hw, eaves);
    ctx.lineTo(x + hw, line + 1);
    ctx.lineTo(gx + ghw * 0.5, line + 1);
    ctx.lineTo(gx + ghw * 0.5, eaves - rise * 0.5);
    ctx.closePath();
    for (let y = eaves + u * 0.01; y < line - u * 0.005; y += u * 0.011) ctx.rect(x - hw, y, gx + ghw * 0.5 - x + hw, Math.max(0.6, u * 0.002));
    ctx.fill();
    // The slate rake boards along the gable.
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    gable(ctx, gx, ghw + u * 0.01, eaves + u * 0.003, rise + u * 0.008);
    gable(ctx, gx, ghw - u * 0.002, eaves + u * 0.005, rise - u * 0.005);
    ctx.fill("evenodd");
    // The rose window, two tall arched windows, the red doors under their porch, the steps.
    ctx.fillStyle = tone.trim;
    ctx.beginPath();
    circle(ctx, gx, eaves - rise * 0.36, u * 0.016);
    ctx.fill();
    ctx.fillStyle = tone.window;
    ctx.beginPath();
    circle(ctx, gx, eaves - rise * 0.36, u * 0.011);
    arched(ctx, gx - ghw * 0.62, eaves + u * 0.02, u * 0.018, u * 0.055);
    arched(ctx, gx + ghw * 0.62, eaves + u * 0.02, u * 0.018, u * 0.055);
    ctx.fill();
    ctx.fillStyle = tone.trim;
    ctx.beginPath();
    for (const k of [-0.62, 0.62]) ctx.rect(gx + ghw * k - u * 0.001, eaves + u * 0.022, u * 0.002, u * 0.052);
    ctx.fill();
    ctx.fillStyle = tone.red;
    ctx.beginPath();
    arched(ctx, gx, line - u * 0.056, u * 0.034, u * 0.056);
    ctx.fill();
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    gable(ctx, gx, u * 0.03, line - u * 0.064, u * 0.018);
    ctx.rect(gx - u * 0.001, line - u * 0.055, u * 0.002, u * 0.055);
    ctx.fill();
    ctx.fillStyle = tone.stoneLit;
    ctx.fillRect(gx - u * 0.032, line - u * 0.008, u * 0.064, u * 0.008 + 1);
  }
  // The steeple: the tower lit on the left, a cornice, the belfry with its bell, the lantern, the spire.
  const belfry = line - STEEPLE_TOWER * u;
  const lantern = belfry - u * 0.04;
  ctx.fillStyle = tone.clapboard;
  ctx.fillRect(tx - thw, belfry, thw * 2, line - belfry + 1);
  ctx.fillRect(tx - thw * 0.72, lantern, thw * 1.44, belfry - lantern + 1);
  ctx.fillStyle = tone.clapShade;
  ctx.fillRect(tx + thw * 0.15, belfry, thw * 0.85, line - belfry + 1);
  ctx.fillRect(tx + thw * 0.1, lantern, thw * 0.62, belfry - lantern + 1);
  // Cornices at each stage, and the louvered belfry openings with the bell, the lantern's slits, a round window low down.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.rect(tx - thw - u * 0.005, belfry - u * 0.004, thw * 2 + u * 0.01, u * 0.008);
  ctx.rect(tx - thw - u * 0.004, line - 0.15 * u, thw * 2 + u * 0.008, u * 0.005);
  ctx.rect(tx - thw * 0.72 - u * 0.004, lantern - u * 0.004, thw * 1.44 + u * 0.008, u * 0.006);
  ctx.fill();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  arched(ctx, tx - thw * 0.45, belfry + u * 0.012, thw * 0.55, u * 0.06);
  arched(ctx, tx + thw * 0.45, belfry + u * 0.012, thw * 0.55, u * 0.06);
  ctx.rect(tx - thw * 0.32, lantern + u * 0.01, thw * 0.2, u * 0.022);
  ctx.rect(tx + thw * 0.12, lantern + u * 0.01, thw * 0.2, u * 0.022);
  circle(ctx, tx, line - 0.1 * u, thw * 0.38);
  ctx.fill();
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.34, belfry + u * 0.05);
  ctx.quadraticCurveTo(tx, belfry + u * 0.012, tx + thw * 0.34, belfry + u * 0.05);
  ctx.closePath();
  ctx.fill();
  // The spire, its shaded half, the gilt ball and the cross.
  const spire = lantern - u * 0.004;
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  gable(ctx, tx, thw * 0.82, spire + 1, spire - (line - STEEPLE_TOP * u) + 1);
  ctx.fill();
  ctx.fillStyle = tone.slateShade;
  ctx.beginPath();
  ctx.moveTo(tx, line - STEEPLE_TOP * u);
  ctx.lineTo(tx + thw * 0.82, spire + 1);
  ctx.lineTo(tx, spire + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  circle(ctx, tx, line - (STEEPLE_TOP + 0.002) * u, u * 0.0045);
  ctx.rect(tx - u * 0.0016, line - STEEPLE_REACH * u, u * 0.0032, u * 0.024);
  ctx.rect(tx - u * 0.0065, line - (STEEPLE_TOP + 0.019) * u, u * 0.013, u * 0.0032);
  ctx.fill();
}

/** Scratch for the flag's place (the courthouse flagpole's top), so placing it allocates nothing. */
const POLE = { x: 0, y: 0 };

export function poleTop(s: Scene, line: number): typeof POLE {
  POLE.x = s.cssW / 2 + COURT_X * s.u;
  POLE.y = line - POLE_TOP * s.u;
  return POLE;
}

/** The flag's inks, worked out once per call (scratch, so the frame allocates nothing). */
const INKS = { red: "", white: "", blue: "" };

/** The courthouse (standing on `line`): the whole building while the land shows, else its tower, dome and flag. */
export function courthouse(ctx: Ctx, s: Scene, tone: Tone, line: number, whole: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x = cx + COURT_X * u;
  const hw = COURT_HW * u;
  const thw = TOWER_HW * u;
  if (whole) courthouseBody(ctx, s, tone, line, x, hw);
  // The clock tower: lit left, shaded right, corner pilasters, a cornice, the clock.
  const top = line - TOWER_H * u;
  const from = whole ? line - COURT_H * u : line;
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - thw, top, thw * 2, from - top + 1);
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - thw * 0.7, top + u * 0.02, thw * 1.4, from - top - u * 0.02);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x + thw * 0.2, top, thw * 0.8, from - top + 1);
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (let y = top + u * 0.11; y < from - u * 0.04; y += u * 0.055) arched(ctx, x - thw * 0.15, y, u * 0.015, u * 0.032);
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x - thw - u * 0.006, top, thw * 2 + u * 0.012, u * 0.012);
  // The clock: a cream face on a slate rim, hands at ten past four, a summer afternoon.
  const cy = top + u * 0.062;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.031);
  ctx.fill();
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.025);
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    speck(ctx, x + Math.cos(a) * u * 0.02, cy + Math.sin(a) * u * 0.02, u * (i % 3 ? 0.0011 : 0.002));
  }
  ctx.fill();
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.013, cy + u * 0.007);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.006, cy - u * 0.018);
  ctx.stroke();
  // The drum under the dome: a colonnade of slits between two cornices.
  const dy = line - (DOME_TOP - DOME_R) * u;
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - thw * 0.8, dy, thw * 1.6, top - dy + 1);
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.rect(x + thw * 0.2, dy, thw * 0.6, top - dy + 1);
  for (let i = 0; i < 4; i++) ctx.rect(x - thw * 0.62 + i * thw * 0.36, dy + u * 0.01, thw * 0.14, top - dy - u * 0.016);
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x - thw * 0.92, dy, thw * 1.84, u * 0.006);
  // The gilt dome, its ribs, its shaded half, the lantern and the flagpole.
  const R = DOME_R * u;
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  ctx.moveTo(x - R, dy);
  ctx.arc(x, dy, R, Math.PI, 0);
  ctx.closePath();
  ctx.rect(x - u * 0.008, dy - R - u * 0.016, u * 0.016, u * 0.017);
  ctx.fill();
  ctx.fillStyle = tone.giltShade;
  ctx.beginPath();
  ctx.moveTo(x, dy);
  ctx.arc(x, dy, R, -Math.PI / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.giltShade;
  ctx.lineWidth = Math.max(0.75, u * 0.0025);
  ctx.beginPath();
  for (const k of [-0.62, -0.28]) {
    ctx.moveTo(x + R * k, dy);
    ctx.quadraticCurveTo(x + R * k * 0.9, dy - R * 0.8, x, dy - R);
  }
  ctx.stroke();
  const poleY = line - POLE_TOP * u;
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - u * 0.0022, poleY, u * 0.0044, (POLE_TOP - DOME_TOP) * u + 1);
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  circle(ctx, x, poleY - u * 0.002, u * 0.005);
  ctx.fill();
  // After dark, the floodlight's beam up the pole to the flag.
  if (tone.flood > 0.01) {
    ctx.globalAlpha = tone.flood * 0.22;
    ctx.fillStyle = tone.flagWhite;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.005, dy - R);
    ctx.lineTo(x - FLAG_W * u * 1.05, poleY - u * 0.006);
    ctx.lineTo(x + u * 0.01, poleY - u * 0.006);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  INKS.red = tone.flagRed;
  INKS.white = tone.flagWhite;
  INKS.blue = tone.flagBlue;
  usFlag(ctx, x - u * 0.0022, poleY + u * 0.002, FLAG_W * u, FLAG_H * u, -1, u * 0.003, s.t * 6, INKS);
}

/** The courthouse's block: the rusticated base, the wings' windows, the portico with its fans of bunting, the pediment, the steps. */
function courthouseBody(ctx: Ctx, s: Scene, tone: Tone, line: number, x: number, hw: number): void {
  const u = s.u;
  const roof = line - COURT_H * u;
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - hw, roof, hw * 1.74, COURT_H * u + 1);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x + hw * 0.74, roof, hw * 0.26, COURT_H * u + 1);
  // The rusticated base: joint lines along the ground floor; the balustrade's posts on the roof.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  for (let y = line - u * 0.064; y < line - u * 0.005; y += u * 0.013) ctx.rect(x - hw, y, hw * 2, Math.max(0.6, u * 0.002));
  for (let i = 0; i < 11; i++) ctx.rect(x - hw + (i + 0.5) * ((hw * 2) / 11) - u * 0.002, roof - u * 0.016, u * 0.004, u * 0.016);
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.rect(x - hw - u * 0.005, roof, hw * 2 + u * 0.01, u * 0.01);
  ctx.rect(x - hw - u * 0.003, roof - u * 0.019, hw * 2 + u * 0.006, u * 0.004);
  ctx.rect(x - hw - u * 0.004, line - u * 0.068, hw * 2 + u * 0.008, u * 0.005);
  ctx.fill();
  // The wings' windows: tall sashes upstairs under pediments, shorter below.
  const pw = hw * 0.58;
  const wingW = hw - pw;
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const wx = x + side * (pw + wingW * (0.3 + i * 0.42));
      ctx.rect(wx - u * 0.0065, roof + u * 0.032, u * 0.013, u * 0.044);
      ctx.rect(wx - u * 0.0065, line - u * 0.054, u * 0.013, u * 0.034);
    }
  }
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const wx = x + side * (pw + wingW * (0.3 + i * 0.42));
      gable(ctx, wx, u * 0.01, roof + u * 0.03, u * 0.009);
    }
  }
  ctx.fill();
  // The portico: the doors behind four columns, fans of bunting between their heads, a pediment with a gilt star.
  const colTop = roof + u * 0.02;
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x - pw, colTop, pw * 2, line - colTop);
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  arched(ctx, x, line - u * 0.08, u * 0.03, u * 0.072);
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(x - pw + ((i + 0.5) * pw * 2) / 4 - u * 0.007, colTop, u * 0.014, line - colTop);
  gable(ctx, x, pw + u * 0.013, colTop + 1, u * 0.058);
  ctx.rect(x - pw - u * 0.013, colTop - u * 0.002, pw * 2 + u * 0.026, u * 0.009);
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(x - pw + ((i + 0.5) * pw * 2) / 4 + u * 0.0025, colTop + u * 0.006, u * 0.0045, line - colTop - u * 0.006);
  gable(ctx, x, pw - u * 0.005, colTop - u * 0.003, u * 0.045);
  ctx.fill();
  ctx.fillStyle = tone.gilt;
  ctx.beginPath();
  starPath(ctx, x, colTop - u * 0.019, u * 0.012);
  ctx.fill();
  pleatedFans(ctx, x - pw + (pw * 2) / 4, (pw * 2) / 4, 3, colTop + u * 0.007, u * 0.014, tone.red, tone.white, tone.blue);
  // The great flag hung down the portico for the Fourth, displayed as a flag hangs on a wall: the
  // stripes upright, the union at the top on the left (the flag drawn flying, then turned over
  // its diagonal).
  const fy = colTop + u * 0.024;
  const len = line - u * 0.012 - fy;
  const fw = Math.min(pw * 1.9, len * 0.53);
  INKS.red = tone.red;
  INKS.white = tone.white;
  INKS.blue = tone.blue;
  ctx.save();
  ctx.transform(0, 1, 1, 0, x - fw / 2, fy);
  usFlag(ctx, 0, 0, len, fw, 1, 0, 0, INKS);
  ctx.restore();
  // The steps across the foot of the portico, and the shadow plane down the right wing.
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.rect(x - pw - u * 0.008, line - u * 0.01, pw * 2 + u * 0.016, u * 0.005);
  ctx.rect(x - pw - u * 0.015, line - u * 0.005, pw * 2 + u * 0.03, u * 0.005 + 1);
  ctx.fill();
}

import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { COLUMN } from "./place";
import { archPath } from "./shapes";
import { square } from "./square";
import { DAY_HIGH, level, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: the cathedral's square between it and the street
// (square.ts, all of it below the horizon), the river at the end of the street, its far bank a
// low line of wharf sheds and a crane, a riverboat with twin stacks and a red paddlewheel
// churning away at its stern out on the right, the far street along the levee with a
// streetcar that rolls in from the right to its stop and back out again, our own three-spired
// cathedral on its square straight ahead (its body hidden by the townhouses until you climb,
// its spires over their roofs from the start), a big live oak at the square's corner, and
// gulls wheeling over the river. All of it is faded and flat, with no outline. Only the lane's
// things move (the wheel, the smoke, the streetcar, the gulls): nothing moves behind the tower.
// Above the start a floor of cloud gathers below you and covers the city: from then on its
// puffy top is the horizon, and only the cathedral's spires stand out of it. Then it sinks
// with them to rest low on the screen, and there it stays for good, for the sun to set into
// and rise out of on every turn of the story's loop (tone.ts). By night the flambeaux of the
// parade below light the clouds from beneath at the sides, and at the loop's dawn a mist lies
// over them.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** Once it has covered the city, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 90;

/**
 * The line the cloud floor lies along once it has gathered, and the cathedral stands on: the
 * horizon while the city shows; above the clouds it eases down to its rest low on the screen.
 */
function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  return horizon + (s.cssH - s.u * FLOOR_REST - horizon) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the cloud floor's top edge is: below the screen at the start, at the horizon once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(20, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/** The city below shows only until the cloud floor covers it (`top` is the floor's top edge). */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < DAY_HIGH && top > s.horizonY + s.u * 0.02;
}

/** The line the cathedral stands on: the horizon while the city shows, then the cloud floor's line as it sinks to rest. */
function spireLine(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;
/** The river's top and bottom edges (u above the horizon). */
const RIVER_TOP = 0.1;
const RIVER_BOTTOM = 0.04;

/**
 * Where the sky stops: below this the river and the city, or the cloud floor, cover everything
 * (each fill runs on under the next, so no seam between two fills is ever left half painted).
 */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s, top) ? s.horizonY + s.u * 0.03 : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the cloud bank

/** Puffs of the cloud bank piled at either side behind the cathedral: [X (u from center), height above the line (u), radius (u)]. */
const BANK = [
  [-0.66, 0.15, 0.13],
  [-0.53, 0.2, 0.1],
  [-0.43, 0.14, 0.085],
  [-0.33, 0.11, 0.07],
  [-0.24, 0.07, 0.055],
  [0.2, 0.06, 0.05],
  [0.28, 0.1, 0.065],
  [0.44, 0.2, 0.09],
  [0.55, 0.17, 0.11],
  [0.68, 0.13, 0.13],
] as const;

/** Soft clouds piled along the line at either side, in the hour's cloud colors, a shaded body and lit caps. */
function cloudBank(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = hz - h * u;
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
    }
    if (pass === 0) {
      ctx.rect(-1, hz - u * 0.06, Math.max(0, Math.min(cx - u * 0.24, u * 0.26)) + 1, u * 0.12);
      ctx.rect(Math.max(cx + u * 0.2, s.cssW - u * 0.3), hz - u * 0.06, s.cssW, u * 0.12);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the river and its far bank

/** Wharf sheds along the far bank: [X (u), width, height], and a crane. */
const SHEDS = [
  [-0.62, 0.1, 0.03],
  [-0.5, 0.08, 0.04],
  [-0.4, 0.07, 0.028],
  [-0.3, 0.09, 0.035],
  [-0.18, 0.06, 0.03],
  [-0.1, 0.09, 0.042],
  [0.02, 0.07, 0.03],
  [0.11, 0.1, 0.038],
  [0.24, 0.08, 0.03],
  [0.34, 0.09, 0.045],
  [0.46, 0.07, 0.03],
  [0.56, 0.1, 0.036],
] as const;

/** The far bank: a flat strip with the sheds' gables and a crane along it, then the river down to the levee, with still glints. */
function river(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const top = hz - u * RIVER_TOP;
  // The far bank.
  ctx.fillStyle = tone.farBank;
  ctx.beginPath();
  ctx.rect(-1, top - u * 0.012, s.cssW + 2, u * 0.014);
  for (const [X, w, h] of SHEDS) {
    const x = cx + X * u;
    ctx.moveTo(x - (w / 2) * u, top);
    ctx.lineTo(x - (w / 2) * u, top - h * u);
    ctx.lineTo(x, top - (h + 0.012) * u);
    ctx.lineTo(x + (w / 2) * u, top - h * u);
    ctx.lineTo(x + (w / 2) * u, top);
    ctx.closePath();
  }
  // A crane on the wharf, right of center.
  const kx = cx + u * 0.2;
  ctx.rect(kx - u * 0.003, top - u * 0.09, u * 0.006, u * 0.09);
  ctx.moveTo(kx - u * 0.004, top - u * 0.088);
  ctx.lineTo(kx - u * 0.06, top - u * 0.062);
  ctx.lineTo(kx - u * 0.06, top - u * 0.056);
  ctx.lineTo(kx + u * 0.004, top - u * 0.08);
  ctx.closePath();
  ctx.fill();
  // The river.
  ctx.fillStyle = tone.river;
  ctx.fillRect(0, top, s.cssW, u * (RIVER_TOP - RIVER_BOTTOM) + 1);
  // Still glints along the water, kept off the cathedral's reflection in the middle.
  ctx.fillStyle = tone.riverLit;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const X = (hash(i + 7100) - 0.5) * 1.6;
    if (Math.abs(X) < 0.12) continue;
    const y = top + u * (0.008 + hash(i + 7110) * 0.05);
    const w = u * (0.012 + hash(i + 7120) * 0.03);
    ctx.rect(cx + X * u - w / 2, y, w, Math.max(1, u * 0.0025));
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the riverboat

/** Where the riverboat paddles, out on the right (u from center), its waterline (u above the horizon: out in midstream, clear above the streetcar's roof and pole), and its size unit (u). */
const BOAT_X = 0.325;
const BOAT_UP = RIVER_BOTTOM + 0.034;
const BOAT = 0.09;

/** The riverboat's whistle: a jet of steam at WHISTLE_AT and every WHISTLE_EVERY seconds, for WHISTLE_LEN. */
export const WHISTLE_AT = 3.2;
export const WHISTLE_EVERY = 26;
const WHISTLE_LEN = 1.6;

/** How far into a whistle blast the clock is (0..1), or -1 between them. */
export function whistleAt(t: number): number {
  if (t < WHISTLE_AT) return -1;
  const k = ((t - WHISTLE_AT) % WHISTLE_EVERY) / WHISTLE_LEN;
  return k < 1 ? k : -1;
}

/**
 * A white riverboat seen from the side, steaming upriver in place: a long low hull with a
 * red water line, two decks of railings, a pilot house with a flag, twin stacks with crowns
 * puffing smoke, and at the stern a red paddlewheel turning in a wash of foam.
 */
export function riverboat(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const k = BOAT * u;
  const x = s.cssW / 2 + BOAT_X * u;
  const y = s.horizonY - u * BOAT_UP;
  const bob = Math.sin(s.t * 0.9) * k * 0.01;
  // Smoke from the stacks, drifting back and up (never into the tower's column on the left).
  ctx.fillStyle = tone.smoke;
  for (let st = 0; st < 2; st++) {
    const sx = x + (st ? -0.12 : -0.3) * k;
    const sy = y - k * 0.58;
    for (let i = 0; i < 4; i++) {
      const p = ((s.t * 0.35 + i * 0.25 + st * 0.12) % 1 + 1) % 1;
      ctx.globalAlpha = (1 - p) * 0.75;
      ctx.beginPath();
      circle(ctx, sx + p * k * 0.5 + Math.sin(p * 9 + i) * k * 0.03, sy - p * k * 0.42, k * (0.03 + p * 0.05));
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The hull: a long rounded box, red along the water, and the wash of the wheel.
  ctx.fillStyle = tone.boatTrim;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.62, y + bob);
  ctx.lineTo(x + k * 0.58, y + bob);
  ctx.quadraticCurveTo(x + k * 0.66, y + bob, x + k * 0.62, y + bob - k * 0.06);
  ctx.lineTo(x - k * 0.66, y + bob - k * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.boat;
  ctx.beginPath();
  ctx.rect(x - k * 0.6, y + bob - k * 0.2, k * 1.18, k * 0.15);
  // The lower deck's rail and the upper deck, stepped in; the pilot house on top.
  ctx.rect(x - k * 0.46, y + bob - k * 0.36, k * 0.88, k * 0.14);
  ctx.rect(x - k * 0.1, y + bob - k * 0.48, k * 0.3, k * 0.12);
  ctx.fill();
  // Railings: fine posts along both decks.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  for (let i = 0; i < 11; i++) ctx.rect(x - k * 0.44 + i * k * 0.085, y + bob - k * 0.35, Math.max(1, k * 0.012), k * 0.07);
  for (let i = 0; i < 14; i++) ctx.rect(x - k * 0.58 + i * k * 0.087, y + bob - k * 0.19, Math.max(1, k * 0.012), k * 0.07);
  // Dark windows on the pilot house.
  ctx.rect(x - k * 0.06, y + bob - k * 0.46, k * 0.07, k * 0.05);
  ctx.rect(x + k * 0.05, y + bob - k * 0.46, k * 0.07, k * 0.05);
  ctx.fill();
  // The twin stacks with their crowns.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  for (let st = 0; st < 2; st++) {
    const sx = x + (st ? -0.12 : -0.3) * k;
    ctx.rect(sx - k * 0.035, y + bob - k * 0.6, k * 0.07, k * 0.26);
    ctx.rect(sx - k * 0.05, y + bob - k * 0.64, k * 0.1, k * 0.05);
  }
  ctx.fill();
  // The whistle's jet of steam, when it blows.
  const w = whistleAt(s.t);
  if (w >= 0) {
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = Math.sin(Math.PI * w) * 0.9;
    ctx.beginPath();
    oval(ctx, x + k * 0.26 + w * k * 0.1, y + bob - k * 0.6 - w * k * 0.1, k * (0.04 + w * 0.1), k * (0.03 + w * 0.05), -0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The paddlewheel at the stern, turning: a red drum with paddles, in a wash of foam.
  const wx = x + k * 0.66;
  const wy = y + bob - k * 0.14;
  const wr = k * 0.17;
  ctx.fillStyle = tone.riverLit;
  ctx.beginPath();
  oval(ctx, wx + k * 0.02, y + k * 0.01, k * 0.16, k * 0.04);
  ctx.fill();
  ctx.fillStyle = tone.boatTrim;
  ctx.beginPath();
  circle(ctx, wx, wy, wr);
  ctx.fill();
  ctx.strokeStyle = tone.boat;
  ctx.lineWidth = Math.max(1, k * 0.02);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = s.t * 2.4 + (i * Math.PI) / 3;
    ctx.moveTo(wx + Math.cos(a) * wr * 0.2, wy + Math.sin(a) * wr * 0.2);
    ctx.lineTo(wx + Math.cos(a) * wr * 0.95, wy + Math.sin(a) * wr * 0.95);
  }
  ctx.stroke();
  // A flag on the pilot house.
  ctx.fillStyle = "#7a3fc4";
  ctx.beginPath();
  ctx.moveTo(x + k * 0.06, y + bob - k * 0.6);
  ctx.lineTo(x + k * 0.06 + k * 0.09 * (1 + 0.1 * Math.sin(s.t * 6)), y + bob - k * 0.57);
  ctx.lineTo(x + k * 0.06, y + bob - k * 0.54);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the far street and the streetcar

/** The streetcar's size unit (u) and its stop (u from center): where it waits before heading back out. */
const TRAM = 0.1;
export const TRAM_STOP = 0.33;
/** Its run: it rounds a phone's right edge (TRAM_IN) at TRAM_AT, how fast it rolls (u/s), how long it waits at the stop, and how often it comes. */
export const TRAM_AT = 1.4;
const TRAM_SPEED = 0.06;
const TRAM_WAIT = 2.2;
export const TRAM_EVERY = 30;
/** Where it comes in on a phone: u right of the screen's center, just past the edge. */
const TRAM_IN = 0.56;
/** When it reaches its stop, on every run. */
const TRAM_ARRIVE = TRAM_AT + (TRAM_IN - TRAM_STOP) / TRAM_SPEED;
/** Each way takes half of what the run leaves after the wait: it turns round that far out (TRAM_STOP + TRAM_SPEED * TRAM_LEG), past any phone's edge and behind the next houses on a wider screen. */
const TRAM_LEG = (TRAM_EVERY - TRAM_WAIT) / 2;

/** Scratch result of `tramAt`. */
const TRAM_NOW = { x: 0, shown: false, dir: -1 };

/**
 * Where the streetcar is at time t: its center (u from the screen center), whether it is on
 * its run, and which way it goes (-1 inbound, 1 outbound). It rolls in to its stop, waits,
 * and rolls back out the way it came; it never crosses into the tower's column. On a phone it
 * first comes round the right edge at TRAM_AT; out past the edge it turns round, so a wider
 * screen sees it roll on out and back in, never pop in or out.
 */
export function tramAt(t: number): typeof TRAM_NOW {
  const r = TRAM_NOW;
  // Seconds since it last reached its stop.
  const q = (((t - TRAM_ARRIVE) % TRAM_EVERY) + TRAM_EVERY) % TRAM_EVERY;
  if (q < TRAM_WAIT) {
    r.x = TRAM_STOP;
    r.dir = -1;
  } else if (q < TRAM_WAIT + TRAM_LEG) {
    r.x = TRAM_STOP + (q - TRAM_WAIT) * TRAM_SPEED;
    r.dir = 1;
  } else {
    r.x = TRAM_STOP + (TRAM_EVERY - q) * TRAM_SPEED;
    r.dir = -1;
  }
  // In sight on a phone while it is in from the edge (wider screens see it further out).
  r.shown = r.x < TRAM_IN + 1e-9;
  return r;
}

/** The far street along the levee: its surface and a pair of rails, from the river's edge down to the horizon. */
function farStreet(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const hz = s.horizonY;
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(0, hz - u * RIVER_BOTTOM, s.cssW, u * RIVER_BOTTOM + 1);
  ctx.fillStyle = tone.slate;
  ctx.fillRect(0, hz - u * 0.014, s.cssW, Math.max(1, u * 0.0025));
  ctx.fillRect(0, hz - u * 0.006, s.cssW, Math.max(1, u * 0.0025));
}

/**
 * The streetcar on the far street: an olive-green car with a cream band of windows, a
 * rounded roof and a trolley pole up to the wire, its wheels in a dark skirt, rolling on the
 * right only (out from the right edge to its stop and back).
 */
export function streetcar(ctx: Ctx, s: Scene, tone: Tone): void {
  const now = tramAt(s.t);
  const u = s.u;
  const k = TRAM * u;
  const x = s.cssW / 2 + now.x * u;
  if (x - k * 0.62 > s.cssW) return;
  const y = s.horizonY - u * 0.004;
  // The body: a rounded box over a dark skirt, the windows a cream band with dark panes.
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x - k * 0.6, y - k * 0.1, k * 1.2, k * 0.1);
  ctx.fillStyle = tone.tram;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.62, y - k * 0.1);
  ctx.lineTo(x - k * 0.62, y - k * 0.4);
  ctx.quadraticCurveTo(x - k * 0.62, y - k * 0.5, x - k * 0.5, y - k * 0.5);
  ctx.lineTo(x + k * 0.5, y - k * 0.5);
  ctx.quadraticCurveTo(x + k * 0.62, y - k * 0.5, x + k * 0.62, y - k * 0.4);
  ctx.lineTo(x + k * 0.62, y - k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.tramLit;
  ctx.fillRect(x - k * 0.56, y - k * 0.42, k * 1.12, k * 0.17);
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.stoneShade;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) ctx.rect(x - k * 0.52 + i * k * 0.18, y - k * 0.4, k * 0.12, k * 0.12);
  ctx.fill();
  // The trolley pole, trailing back the way it came, kept low under the riverboat's waterline.
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.beginPath();
  ctx.moveTo(x, y - k * 0.5);
  ctx.lineTo(x - now.dir * k * 0.34, y - k * 0.62);
  ctx.stroke();
  // Wheels under the skirt.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  circle(ctx, x - k * 0.38, y - k * 0.03, k * 0.05);
  circle(ctx, x + k * 0.38, y - k * 0.03, k * 0.05);
  ctx.fill();
}

// ---------------------------------------------------------------- the cathedral and the square

/** The cathedral's center (u from the screen's center), its half width, and its heights (u above its line): the body, the side spires, the center spire. */
const CATHEDRAL_X = 0;
const CATH_HW = 0.17;
const BODY_H = 0.17;
const SIDE_H = 0.33;
const MID_H = 0.44;
/** The live oak at the square's corner: center and the crown's radius (u). */
const OAK_X = 0.448;
const OAK_R = 0.044;

/** Scratch for the spires' places. */
const SPIRE = { x: 0, y: 0 };

/** The tip of the center spire (its cross's foot), for tests of what stands out of the clouds. */
export function spireAt(s: Scene): typeof SPIRE {
  SPIRE.x = s.cssW / 2 + CATHEDRAL_X * s.u;
  SPIRE.y = spireLine(s) - MID_H * s.u;
  return SPIRE;
}

/** One spire: a tower body with a slate steeple on top and a small cross, standing on `base`. */
function spire(ctx: Ctx, s: Scene, tone: Tone, x: number, base: number, w: number, h: number): void {
  const u = s.u;
  const towerH = h * 0.62;
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - w / 2, base - towerH, w, towerH);
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - w / 2, base - towerH, w * 0.4, towerH);
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  archPath(ctx, x - w * 0.14, base - towerH * 0.45, w * 0.28, towerH * 0.28);
  ctx.fill();
  // The steeple, lit on the left, with a little cross on top.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.58, base - towerH);
  ctx.lineTo(x, base - h);
  ctx.lineTo(x + w * 0.58, base - towerH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.58, base - towerH);
  ctx.lineTo(x, base - h);
  ctx.lineTo(x - w * 0.02, base - towerH);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - u * 0.0015, base - h - u * 0.02, u * 0.003, u * 0.02);
  ctx.fillRect(x - u * 0.005, base - h - u * 0.015, u * 0.01, u * 0.003);
}

/**
 * The cathedral: a pale façade with three round-headed doors and a rose window, a slate roof
 * behind, and three spires, the middle one tallest. Our own generic design.
 */
export function cathedral(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + CATHEDRAL_X * u;
  const base = spireLine(s);
  const hw = CATH_HW * u;
  const body = BODY_H * u;
  // The nave's roof behind the façade, and the façade with its lit left half.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.7, base - body);
  ctx.lineTo(x, base - body - u * 0.05);
  ctx.lineTo(x + hw * 0.7, base - body);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - hw, base - body, hw * 2, body);
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - hw, base - body, hw * 0.9, body);
  // A cornice line, the rose window, the three doors.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.rect(x - hw, base - body * 0.55, hw * 2, Math.max(1, u * 0.003));
  circle(ctx, x, base - body * 0.76, u * 0.022);
  archPath(ctx, x - u * 0.016, base, u * 0.032, u * 0.07);
  archPath(ctx, x - hw * 0.62 - u * 0.012, base, u * 0.024, u * 0.055);
  archPath(ctx, x + hw * 0.62 - u * 0.012, base, u * 0.024, u * 0.055);
  ctx.fill();
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.stoneLit;
  ctx.globalAlpha = tone.lit > 0.3 ? 0.5 + tone.lit * 0.5 : 0.8;
  ctx.beginPath();
  circle(ctx, x, base - body * 0.76, u * 0.014);
  ctx.fill();
  ctx.globalAlpha = 1;
  spire(ctx, s, tone, x - hw * 0.72, base, u * 0.052, SIDE_H * u);
  spire(ctx, s, tone, x + hw * 0.72, base, u * 0.052, SIDE_H * u);
  spire(ctx, s, tone, x, base, u * 0.064, MID_H * u);
}

/** A big live oak at the square's corner on the right: a broad, low crown of three lobes over a short thick trunk, flat and faded. */
export function liveOak(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + OAK_X * u;
  const base = s.horizonY;
  const r = OAK_R * u;
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.18, base);
  ctx.lineTo(x - r * 0.12, base - r * 0.9);
  ctx.lineTo(x + r * 0.12, base - r * 0.9);
  ctx.lineTo(x + r * 0.18, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.oak;
  ctx.beginPath();
  circle(ctx, x - r * 0.55, base - r * 1.15, r * 0.5);
  circle(ctx, x + r * 0.55, base - r * 1.2, r * 0.5);
  circle(ctx, x, base - r * 1.55, r * 0.62);
  circle(ctx, x - r * 0.2, base - r * 1.05, r * 0.45);
  circle(ctx, x + r * 0.25, base - r * 1.0, r * 0.42);
  ctx.fill();
}

// ---------------------------------------------------------------- gulls

/** Where the gulls wheel: u right of the screen's center and u above the horizon, and their wingspan (u). */
const GULL_X = 0.375;
const GULL_UP = 0.25;
const GULL = 0.013;

/**
 * Three gulls wheeling over the river in the right lane, each on its own slow loop: far-off
 * "m" strokes in the haze, flapping now and then. They stay over the river while the city
 * shows and fade as the clouds gather.
 */
function gulls(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = 1 - smooth(28, 35, level(s));
  if (a <= 0.01) return;
  const u = s.u;
  const cx = s.cssW / 2 + GULL_X * u;
  const cy = s.horizonY - GULL_UP * u;
  const g = GULL * u;
  ctx.globalAlpha = a;
  ctx.strokeStyle = tone.farBank;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const t = s.t * 0.3 + i * 2.1;
    const x = cx + Math.cos(t) * u * (0.03 + i * 0.012);
    const y = cy + Math.sin(t * 2) * u * 0.012 + i * u * 0.02;
    const flap = Math.sin(s.t * 3 + i * 1.7) * 0.5;
    const tip = y - flap * g * 0.5;
    ctx.moveTo(x - g, tip);
    ctx.quadraticCurveTo(x - g * 0.45, y - g * 0.5, x, y);
    ctx.quadraticCurveTo(x + g * 0.45, y - g * 0.5, x + g, tip);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the cloud floor

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 7200) * 0.035, dy: hash(i + 7300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Soft swells further down the floor, in rows repeating every SWELL_SPAN (u, nearer rows wider). */
const SWELL_SPAN = 0.7;
const SWELL_ROWS = 3;
const SWELLS = Array.from({ length: 6 }, (_, i) => ({ x: hash(i + 7500), d: 0.1 + hash(i + 7510) * 0.12, r: 0.026 + hash(i + 7520) * 0.022 }));
/** The flambeaux's glow under the clouds: spots along the floor's top at the sides, [X (u from center), reach (u)]. */
const GLOWS = [
  [-0.46, 0.09],
  [-0.33, 0.07],
  [0.3, 0.08],
  [0.44, 0.1],
] as const;

/** Which glow (index) lights a floor puff at screen x, or -1: the spots keep to the screen's sides on every width. */
function glowAt(s: Scene, x: number): number {
  const u = s.u;
  for (let i = 0; i < GLOWS.length; i++) {
    const [X, r] = GLOWS[i]!;
    const gx = X < 0 ? Math.min(s.cssW / 2 + X * u, (X + 0.5) * u) : Math.max(s.cssW / 2 + X * u, s.cssW - (0.5 - X) * u);
    if (Math.abs(x - gx) < r * u) return i;
  }
  return -1;
}
/** The dawn mist: bands lying over the floor, [X (u), depth under the top (u), half width (u), half height (u)]. */
const MISTS = [
  [-0.3, 0.03, 0.26, 0.012],
  [0.25, 0.06, 0.3, 0.014],
  [-0.05, 0.11, 0.4, 0.016],
  [0.4, 0.14, 0.22, 0.01],
] as const;

/**
 * The cloud floor: a row of cel-shaded puffs along its top, solid below, with soft lit swells
 * further down. It stands still: it runs right behind the tower, where nothing moves (the
 * flambeaux's flicker keeps to the sides). It is drawn after everything in the city, the
 * stand and the parade included, so as it gathers it covers all of it (only the cathedral's
 * spires stand out of it); the curb in front stays in front.
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = s.cssW / 2 + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.cloudLight : tone.cloud;
    ctx.globalAlpha = pass ? 0.75 : 0.7;
    ctx.beginPath();
    for (let row = 0; row < SWELL_ROWS; row++) {
      const grow = 1 + row * 0.4;
      const span = u * SWELL_SPAN * grow;
      const reps = Math.ceil(s.cssW / 2 / span) + 1;
      for (let k = -reps; k < reps; k++) {
        for (const w of SWELLS) {
          const r = w.r * u * grow;
          const y = top + (w.d + row * 0.2 * grow) * u + u * 0.05;
          if (y - r > s.cssH) continue;
          const x = s.cssW / 2 + (k + w.x + row * 0.37) * span;
          const rx = r * (pass ? 1.2 : 2.2);
          const ry = r * (pass ? 0.22 : 0.5);
          const ex = x - (pass ? r * 0.35 : 0);
          const ey = y - (pass ? r * 0.2 : 0);
          ctx.moveTo(ex + rx, ey);
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI, true);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The flambeaux below: by night the puffs at the sides are lit warm from beneath, their caps
  // flickering with the torches (cel colors, never a see-through wash: orange over violet goes
  // muddy). The column stays still.
  if (tone.flambeau > 0.01) {
    for (let pass = 0; pass < 3; pass++) {
      ctx.fillStyle = pass === 0 ? tone.flamCloud : tone.flamLight;
      if (pass === 2) ctx.fillStyle = "#fff0c8";
      ctx.beginPath();
      for (let j = -half; j <= half; j++) {
        const x = s.cssW / 2 + j * step;
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        if (Math.abs(x - s.cssW / 2) < (COLUMN + p.r) * u) continue;
        const g = glowAt(s, x);
        if (g < 0) continue;
        const r = p.r * u;
        const y = top + p.dy * u + r * 0.35;
        if (pass === 0) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
        else if (pass === 1) circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
        else {
          // The flicker: a bright fleck on the cap, coming and going with the torch.
          const flick = Math.sin(s.t * 7 + g * 2.1) * Math.sin(s.t * 3.3 + j);
          if (flick > 0.2) circle(ctx, x - r * 0.3, y - r * 0.5, r * 0.18 * flick);
        }
      }
      ctx.globalAlpha = tone.flambeau;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // The dawn mist lying over the floor: still, pale bands.
  if (tone.mist > 0.01) {
    ctx.fillStyle = tone.mistColor;
    ctx.globalAlpha = tone.mist * 0.6;
    ctx.beginPath();
    for (const [X, d, hw, hh] of MISTS) oval(ctx, s.cssW / 2 + X * u, top + d * u, hw * u, hh * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Everything on the horizon, back to front (the cloud floor over it is drawn later: `cloudFloor`). */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const hz = s.horizonY;
  const line = spireLine(s);
  const shows = landShows(s, top);
  if (shows && hz - s.u * 0.2 < s.cssH) {
    river(ctx, s, tone);
    riverboat(ctx, s, tone);
    farStreet(ctx, s, tone);
  }
  // The cathedral stands out of the cloud floor once it has covered the city, clouds piled at
  // either side behind it (they gather as the floor does: the afternoon sky over the river is clear).
  if (line - s.u * 0.5 < s.cssH && top - s.u * 0.06 > line - MID_H * s.u) {
    const bank = smooth(30, 38, level(s));
    if (bank > 0) {
      ctx.globalAlpha = bank;
      cloudBank(ctx, s, tone, line);
      ctx.globalAlpha = 1;
    }
    cathedral(ctx, s, tone);
  }
  if (shows && hz - s.u * 0.2 < s.cssH) {
    square(ctx, s, tone);
    liveOak(ctx, s, tone);
    streetcar(ctx, s, tone);
    gulls(ctx, s, tone);
  }
}

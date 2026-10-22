import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, HEADLAMP, PURPLE, STACK, WHITE } from "./colors";
import { COLUMN } from "./place";
import { level, smooth, type Tone } from "./tone";

// The riverfront beyond the Quarter, over its rooftops: all of it far off, so flat, faded toward
// the haze of the hour and never outlined. The river runs the width of the screen above the
// rooftops (we look down on it over the town), taking on the sunset as evening comes; across it
// the far bank, a low line of wharf sheds and cranes, and the long cantilever truss bridge
// striding over the water from the right (our own generic design). On this side, beside the
// cathedral, a tower downtown rises soft and pale (more of them further out on a wide screen: a
// round one, a slab, a stepped one, one with a little pyramid crown), its windows lit by night.
// Along this side of the water runs the riverwalk, a lawn with live oaks in the lanes. Out on
// the water in the right lane a white paddlewheeler churns upriver in place (its red sternwheel
// turning, its tall black stacks with gold crowns puffing smoke, a Carnival pennant flying, and
// now and then its whistle blowing a jet of steam); in front of it, along the riverwalk's edge, a
// red streetcar rolls in from the right to its stop and back out again; and gulls wheel over the
// water. Only the lane's things move (and the river's glints, out in the lanes): nothing moves
// behind the tower.
//
// Positions are in u from the screen center, heights in u above the horizon (up is positive).

/**
 * The riverwalk along this side of the river, over the rooftops: its foot (hidden behind them)
 * and its top, where the river begins and the streetcar's rails run; the river's far edge; the
 * far bank's top. The whole riverfront stands this high so it shows over the café on the right
 * and the cottages behind the tower.
 */
const WALK_FOOT = 0.015;
export const WALK_UP = 0.13;
const RIVER_NEAR = WALK_UP;
const RIVER_FAR = 0.275;
export const BANK_UP = 0.295;
/** The far bank's sheds: [X (u), width, height]. */
const SHEDS = [
  [-0.7, 0.1, 0.022],
  [-0.56, 0.08, 0.03],
  [-0.08, 0.07, 0.02],
  [0.05, 0.1, 0.028],
  [0.2, 0.08, 0.02],
  [0.46, 0.09, 0.03],
  [0.6, 0.1, 0.024],
  [0.75, 0.08, 0.03],
  [0.9, 0.1, 0.022],
] as const;

// ---------------------------------------------------------------- the far shore

/** The bridge: where it leaves the near shore (u right of center), its deck's height, its spans and how high its trusses peak. */
const BRIDGE_X0 = 0.12;
const DECK_UP = 0.325;
/** The two main towers' places (u from center) and how high their trusses peak above the deck. */
const BRIDGE_TOWERS = [0.36, 0.78] as const;
const PEAK = 0.075;
/** The truss panels: how wide each is (u). */
const PANEL = 0.024;

/** The truss's top chord above the deck at x (u): it climbs to a peak over each tower and dips between. */
function chord(x: number): number {
  let h = 0.018;
  for (const tx of BRIDGE_TOWERS) {
    const d = Math.abs(x - tx);
    h = Math.max(h, PEAK * Math.max(0, 1 - d / 0.2) ** 1.3 + 0.018);
  }
  return h;
}

/**
 * The far bank (a strip with its sheds and two cranes) and the bridge: a deck from the near
 * shore out across the river, its truss above it climbing to two peaks over the main piers, a
 * zigzag of diagonals between its chords, piers down into the water.
 */
function farShore(ctx: Ctx, s: Scene, tone: Tone): void {
  const fadeOut = 1 - smooth(27, 34, level(s));
  if (fadeOut <= 0.01) return;
  ctx.globalAlpha = fadeOut;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const bank = hz - u * BANK_UP;
  const half = s.cssW / 2 / u + 0.05;
  ctx.fillStyle = tone.farBank;
  ctx.beginPath();
  ctx.rect(-1, bank, s.cssW + 2, u * (BANK_UP - RIVER_FAR) + 1);
  for (const [X, w, h] of SHEDS) {
    if (Math.abs(X) - w > half) continue;
    const x = cx + X * u;
    ctx.moveTo(x - (w / 2) * u, bank + 1);
    ctx.lineTo(x - (w / 2) * u, bank - h * u);
    ctx.lineTo(x, bank - (h + 0.01) * u);
    ctx.lineTo(x + (w / 2) * u, bank - h * u);
    ctx.lineTo(x + (w / 2) * u, bank + 1);
    ctx.closePath();
  }
  // Two cranes on the wharf.
  for (const X of [-0.62, 0.54]) {
    const kx = cx + X * u;
    ctx.rect(kx - u * 0.003, bank - u * 0.07, u * 0.006, u * 0.07);
    ctx.moveTo(kx - u * 0.004, bank - u * 0.068);
    ctx.lineTo(kx + u * 0.05, bank - u * 0.05);
    ctx.lineTo(kx + u * 0.05, bank - u * 0.045);
    ctx.lineTo(kx + u * 0.004, bank - u * 0.06);
    ctx.closePath();
  }
  ctx.fill();
  // The bridge, from the near shore out past the right edge.
  const deck = hz - u * DECK_UP;
  const x0 = cx + BRIDGE_X0 * u;
  const x1 = s.cssW + u * 0.05;
  const lw = Math.max(1, u * 0.0028);
  ctx.fillStyle = tone.bridge;
  ctx.beginPath();
  ctx.rect(x0, deck, x1 - x0, u * 0.01);
  // Piers: two under each main tower, and a ramp down to the near shore.
  for (const tx of BRIDGE_TOWERS) {
    const px = cx + tx * u;
    if (px - u * 0.02 > s.cssW) continue;
    ctx.rect(px - u * 0.012, deck, u * 0.009, u * (DECK_UP - RIVER_NEAR - 0.07));
    ctx.rect(px + u * 0.004, deck, u * 0.009, u * (DECK_UP - RIVER_NEAR - 0.07));
  }
  ctx.moveTo(x0, deck);
  ctx.lineTo(x0 - u * 0.05, deck + u * 0.05);
  ctx.lineTo(x0 - u * 0.04, deck + u * 0.05);
  ctx.lineTo(x0 + u * 0.01, deck + u * 0.01);
  ctx.closePath();
  ctx.fill();
  // The truss: its top chord, and the diagonals zigzagging between the chords.
  ctx.strokeStyle = tone.bridge;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const X0 = BRIDGE_X0 + 0.02;
  const X1 = (x1 - cx) / u;
  ctx.moveTo(cx + X0 * u, deck);
  for (let X = X0; X <= X1; X += PANEL / 2) ctx.lineTo(cx + X * u, deck - chord(X) * u);
  let up = true;
  for (let X = X0; X <= X1; X += PANEL) {
    const y = deck - chord(X) * u;
    if (up) {
      ctx.moveTo(cx + X * u, deck);
      ctx.lineTo(cx + (X + PANEL) * u, deck - chord(X + PANEL) * u);
    } else {
      ctx.moveTo(cx + X * u, y);
      ctx.lineTo(cx + (X + PANEL) * u, deck);
    }
    ctx.moveTo(cx + X * u, deck);
    ctx.lineTo(cx + X * u, y);
    up = !up;
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * The towers downtown, on this side of the river, left of the cathedral (and further out on a
 * wide screen), clear of where the sun sets: [X (u), half width, height above the horizon, kind].
 */
const TOWERS = [
  [-0.222, 0.022, 0.36, 0],
  [-0.6, 0.03, 0.27, 2],
  [-0.68, 0.026, 0.34, 0],
  [-0.75, 0.028, 0.29, 1],
  [-0.83, 0.022, 0.25, 3],
] as const;

/**
 * The towers downtown: soft pale shafts with simple crowns (a round tower, a slab, a stepped one,
 * one with a little pyramid crown), each lit down its left side, a band of glass under its top,
 * and by night its windows lit in rows.
 */
export function downtown(ctx: Ctx, s: Scene, tone: Tone, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  if (hz - u * 0.42 > s.cssH) return;
  ctx.fillStyle = tone.tower;
  ctx.beginPath();
  for (const [X, hw, h, kind] of TOWERS) {
    const x = cx + X * u;
    if (x + hw * u < 0 || x - hw * u > s.cssW) continue;
    const top = hz - h * u;
    const l = x - hw * u;
    const r = x + hw * u;
    ctx.moveTo(l, hz);
    if (kind === 0) {
      ctx.lineTo(l, top + hw * u * 0.5);
      ctx.quadraticCurveTo(l, top, x, top);
      ctx.quadraticCurveTo(r, top, r, top + hw * u * 0.5);
    } else if (kind === 2) {
      const a = hw * u * 0.3;
      ctx.lineTo(l, top + u * 0.05);
      ctx.lineTo(l + a, top + u * 0.05);
      ctx.lineTo(l + a, top + u * 0.022);
      ctx.lineTo(l + a * 2, top + u * 0.022);
      ctx.lineTo(l + a * 2, top);
      ctx.lineTo(r - a * 2, top);
      ctx.lineTo(r - a * 2, top + u * 0.022);
      ctx.lineTo(r - a, top + u * 0.022);
      ctx.lineTo(r - a, top + u * 0.05);
      ctx.lineTo(r, top + u * 0.05);
    } else if (kind === 3) {
      ctx.lineTo(l, top + u * 0.03);
      ctx.lineTo(x, top);
      ctx.lineTo(r, top + u * 0.03);
    } else {
      ctx.lineTo(l, top);
      ctx.lineTo(r, top);
    }
    ctx.lineTo(r, hz);
    ctx.closePath();
  }
  ctx.fill();
  // Their sunlit sides, the glass band under each top, and lit windows by night.
  ctx.fillStyle = tone.towerLit;
  ctx.beginPath();
  for (const [X, hw, h, kind] of TOWERS) {
    const x = cx + X * u;
    if (x + hw * u < 0 || x - hw * u > s.cssW) continue;
    const top = hz - h * u + (kind === 0 ? hw * u * 0.5 : kind === 2 ? u * 0.05 : kind === 3 ? u * 0.03 : 0);
    ctx.rect(x - hw * u, top, hw * u * 0.55, hz - top);
  }
  ctx.fill();
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.towerLit;
  ctx.globalAlpha = tone.lit > 0.3 ? 0.4 + tone.lit * 0.5 : 0.7;
  ctx.beginPath();
  for (let i = 0; i < TOWERS.length; i++) {
    const [X, hw, h] = TOWERS[i]!;
    const x = cx + X * u;
    if (x + hw * u < 0 || x - hw * u > s.cssW) continue;
    const top = hz - h * u;
    ctx.rect(x - hw * u * 0.8, top + u * 0.062, hw * u * 1.6, u * 0.006);
    if (tone.lit <= 0.3) {
      // By day, ribbons of glass floor over floor down its face.
      for (let wy = top + u * 0.09; wy < hz - u * 0.05; wy += u * 0.022) ctx.rect(x - hw * u * 0.72, wy, hw * u * 1.44, Math.max(1, u * 0.0035));
      continue;
    }
    for (let r = 0; r < 9; r++) {
      const wy = top + u * (0.08 + r * 0.024);
      if (wy > hz - u * 0.06) break;
      for (let c = -1; c <= 1; c++) if (hash(i * 97 + r * 7 + c + 4000) > 0.35) ctx.rect(x + c * hw * u * 0.55 - u * 0.003, wy, u * 0.006, u * 0.008);
    }
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The river: a band of water from the riverwalk to the far bank, with glints shimmering out in the lanes (behind the tower it lies still and plain). */
function river(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const top = hz - u * RIVER_FAR;
  ctx.fillStyle = tone.river;
  ctx.fillRect(0, top, s.cssW, u * (RIVER_FAR - RIVER_NEAR) + 1);
  // The bridge's shadow on the water, and the glints.
  ctx.fillStyle = tone.riverLit;
  const col = COLUMN * u;
  for (let pass = 0; pass < 2; pass++) {
    if (pass) ctx.globalAlpha = 0.45 + 0.4 * Math.sin(s.t * 1.7);
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const X = (hash(i + 7100) - 0.5) * 1.8;
      const x = cx + X * u;
      const lane = Math.abs(x - cx) > col + u * 0.04;
      if (!lane || pass === 0) continue;
      const y = top + u * (0.008 + hash(i + 7110) * (RIVER_FAR - RIVER_NEAR - 0.02));
      const w = u * (0.012 + hash(i + 7120) * 0.03);
      const drift = lane ? Math.sin(s.t * 0.6 + i) * u * 0.006 : 0;
      ctx.rect(x - w / 2 + drift, y, w, Math.max(1, u * 0.0025));
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Live oaks along the riverwalk: [X (u), crown radius (u)]. */
const OAKS = Array.from({ length: 22 }, (_, i) => [-1.6 + i * 0.15 + hash(i + 7600) * 0.05, 0.022 + hash(i + 7610) * 0.012] as const);

/**
 * Palms along the riverwalk's top, in the lanes between the oaks, clear of the riverboat, the
 * bridge's piers and the towers downtown: [X (u), height above the walk (u), lean (u at the crown)].
 */
const PALMS = [
  [-0.44, 0.06, -0.008],
  [0.46, 0.056, 0.007],
  [-0.9, 0.058, 0.006],
  [0.89, 0.062, -0.007],
] as const;
/** A palm's frond length (u), and the angles its fronds leave the crown at (radians, 0 to the right, up negative). */
const FROND = 0.032;
const FRONDS = [-2.95, -2.35, -1.85, -1.3, -0.8, -0.2] as const;
/** The promenade's lamps (u from center), between the trees and clear of the streetcar at its stop; their height above the walk (u). */
const WALK_LAMPS = [-0.29, 0.408, 0.6, 0.74] as const;
const WALK_LAMP_H = 0.048;

/** One palm frond from the crown (cx, cy) at angle a: a long leaf, drooping toward its tip, `w` its half-width (of its length). */
function frond(ctx: Ctx, cx: number, cy: number, a: number, len: number, w: number): void {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  // The tip droops: down by more the further out to the side it reaches.
  const tx = cx + dx * len;
  const ty = cy + dy * len * 0.7 + Math.abs(dx) * len * 0.35;
  const mx = cx + dx * len * 0.55;
  const my = cy + dy * len * 0.55 - len * 0.08;
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(mx - dy * len * w, my + dx * len * w, tx, ty);
  ctx.quadraticCurveTo(mx + dy * len * w, my - dx * len * w, cx, cy);
  ctx.closePath();
}

/**
 * The palms and lamps along the riverwalk's top, flat and faded like the rest of the far shore:
 * the trunks and posts (one fill), the fronds (one), their lit tops (one), the lamps' globes (one).
 * Only those that fit whole on the screen; out in the lanes, so their fronds stir in the breeze.
 */
function walkPalms(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const half = s.cssW / 2 / u;
  const reach = FROND + 0.006;
  const foot = top + u * 0.014;
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  for (const [X, h, lean] of PALMS) {
    if (Math.abs(X) + reach > half) continue;
    const x = cx + X * u;
    const kx = x + lean * u;
    const ky = top - h * u;
    ctx.moveTo(x - u * 0.0042, foot);
    ctx.quadraticCurveTo(x - u * 0.004, (foot + ky) / 2, kx - u * 0.0024, ky);
    ctx.lineTo(kx + u * 0.0024, ky);
    ctx.quadraticCurveTo(x + u * 0.004 + lean * u * 0.6, (foot + ky) / 2, x + u * 0.0042, foot);
    ctx.closePath();
  }
  for (const X of WALK_LAMPS) {
    if (Math.abs(X) + 0.01 > half) continue;
    const x = cx + X * u;
    ctx.rect(x - Math.max(0.5, u * 0.0016), top - WALK_LAMP_H * u, Math.max(1, u * 0.0032), WALK_LAMP_H * u + u * 0.012);
    ctx.rect(x - u * 0.005, top - WALK_LAMP_H * u + u * 0.005, u * 0.01, Math.max(1, u * 0.0022));
  }
  ctx.fill();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.treeLit : tone.tree;
    ctx.beginPath();
    for (let i = 0; i < PALMS.length; i++) {
      const [X, h, lean] = PALMS[i]!;
      if (Math.abs(X) + reach > half) continue;
      const kx = cx + (X + lean) * u;
      const ky = top - h * u;
      const stir = Math.sin(s.t * 0.9 + i * 2.1) * 0.06;
      for (let f = 0; f < FRONDS.length; f++) {
        // The lit pass: just the three upper fronds toward the light (from the left), slimmer, over the others.
        if (pass && (f === 0 || f > 3)) continue;
        const a = FRONDS[f]! + stir * (f % 2 ? 1 : 0.7);
        frond(ctx, kx, ky, a, FROND * u * (pass ? 0.8 : 1), pass ? 0.1 : 0.17);
      }
    }
    ctx.fill();
  }
  // The lamps' globes: pale by day, glowing from dusk.
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.tramLit;
  ctx.beginPath();
  for (const X of WALK_LAMPS) {
    if (Math.abs(X) + 0.01 > half) continue;
    const x = cx + X * u;
    circle(ctx, x - u * 0.0045, top - WALK_LAMP_H * u + u * 0.002, u * 0.0042);
    circle(ctx, x + u * 0.0045, top - WALK_LAMP_H * u + u * 0.002, u * 0.0042);
  }
  ctx.fill();
}

/**
 * The riverwalk along this side of the river: a lawn with a promenade along its top, a row of
 * round live oaks with palms and lamps between them, and in the right lane the streetcar's rails
 * along its edge.
 */
function riverwalk(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  const top = hz - u * WALK_UP;
  ctx.fillStyle = tone.lawn;
  ctx.fillRect(0, top, s.cssW, u * (WALK_UP - WALK_FOOT) + 1);
  ctx.fillStyle = tone.plaza;
  ctx.fillRect(0, top, s.cssW, u * 0.012);
  walkPalms(ctx, s, tone, top);
  const half = s.cssW / 2 / u + 0.05;
  // The oaks' crowns, two tones, standing along the walk.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.treeLit : tone.tree;
    ctx.beginPath();
    for (const [X, r] of OAKS) {
      if (Math.abs(X) > half || Math.abs(X) < COLUMN + r) continue;
      const x = cx + X * u;
      const y = top + u * 0.035;
      if (pass === 0) {
        circle(ctx, x - r * u * 0.6, y, r * u * 0.75);
        circle(ctx, x + r * u * 0.6, y, r * u * 0.75);
        circle(ctx, x, y - r * u * 0.45, r * u * 0.85);
      } else circle(ctx, x - r * u * 0.25, y - r * u * 0.7, r * u * 0.45);
    }
    ctx.fill();
  }
  // The streetcar's rails along the walk's edge in the right lane.
  const x0 = cx + u * 0.2;
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x0, top - u * 0.002, s.cssW - x0, Math.max(1, u * 0.004));
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x0, top + u * 0.006, s.cssW - x0, Math.max(1, u * 0.003));
}

// ---------------------------------------------------------------- the riverboat

/** Where the riverboat paddles, out on the right (u from center), its waterline (u above the horizon: out in midstream, clear above the streetcar's roof and pole), and its size unit (u). */
const BOAT_X = 0.335;
const BOAT_UP = 0.198;
const BOAT = 0.092;

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
 * A white paddlewheeler seen from the side, steaming upriver in place: a long hull with a red
 * waterline, three decks stepping back with rows of windows and white railings, a pilot house
 * on top with a Carnival pennant, two tall black stacks with gold feathered crowns puffing
 * smoke, and at the stern a big red sternwheel turning in a wash of foam. By night its windows
 * glow.
 */
export function riverboat(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const k = BOAT * u;
  const x = s.cssW / 2 + BOAT_X * u;
  const y = s.horizonY - u * BOAT_UP;
  if (y - k > s.cssH) return;
  const bob = Math.sin(s.t * 0.9) * k * 0.012;
  const by = y + bob;
  // Smoke from the stacks, drifting back (right) and up, away from the tower's column.
  ctx.fillStyle = tone.smoke;
  for (let st = 0; st < 2; st++) {
    const sx = x + (st ? -0.2 : -0.36) * k;
    const sy = by - k * 0.78;
    for (let i = 0; i < 4; i++) {
      const p = (((s.t * 0.35 + i * 0.25 + st * 0.12) % 1) + 1) % 1;
      ctx.globalAlpha = (1 - p) * 0.75;
      ctx.beginPath();
      circle(ctx, sx + p * k * 0.55 + Math.sin(p * 9 + i) * k * 0.03, sy - p * k * 0.36, k * (0.03 + p * 0.05));
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The wash of the wheel, and the hull with its red waterline.
  const wx = x + k * 0.66;
  const wy = by - k * 0.15;
  const wr = k * 0.17;
  ctx.fillStyle = tone.riverLit;
  ctx.beginPath();
  oval(ctx, wx + k * 0.04, y + k * 0.012, k * 0.2, k * 0.04);
  ctx.fill();
  ctx.fillStyle = tone.boatTrim;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.66, by - k * 0.07);
  ctx.lineTo(x + k * 0.6, by - k * 0.07);
  ctx.lineTo(x + k * 0.56, by);
  ctx.lineTo(x - k * 0.58, by);
  ctx.closePath();
  ctx.fill();
  // Three decks stepping back, white, and the pilot house.
  ctx.fillStyle = tone.boat;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.7, by - k * 0.21);
  ctx.lineTo(x + k * 0.6, by - k * 0.21);
  ctx.lineTo(x + k * 0.6, by - k * 0.07);
  ctx.lineTo(x - k * 0.66, by - k * 0.07);
  ctx.closePath();
  ctx.rect(x - k * 0.56, by - k * 0.35, k * 1.08, k * 0.14);
  ctx.rect(x - k * 0.32, by - k * 0.47, k * 0.66, k * 0.12);
  ctx.rect(x - k * 0.08, by - k * 0.59, k * 0.26, k * 0.12);
  ctx.fill();
  // The decks' roofs: thin red lines with a little overhang.
  ctx.fillStyle = tone.boatTrim;
  ctx.beginPath();
  ctx.rect(x - k * 0.6, by - k * 0.36, k * 1.16, k * 0.022);
  ctx.rect(x - k * 0.36, by - k * 0.48, k * 0.74, k * 0.02);
  ctx.rect(x - k * 0.11, by - k * 0.61, k * 0.32, k * 0.025);
  ctx.fill();
  // Windows: rows along each deck, dark by day, glowing by night.
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.stoneShade;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) ctx.rect(x - k * 0.62 + i * k * 0.1, by - k * 0.18, k * 0.05, k * 0.06);
  for (let i = 0; i < 10; i++) ctx.rect(x - k * 0.5 + i * k * 0.1, by - k * 0.31, k * 0.05, k * 0.055);
  for (let i = 0; i < 6; i++) ctx.rect(x - k * 0.27 + i * k * 0.1, by - k * 0.44, k * 0.05, k * 0.05);
  ctx.rect(x - k * 0.04, by - k * 0.56, k * 0.07, k * 0.05);
  ctx.rect(x + k * 0.07, by - k * 0.56, k * 0.07, k * 0.05);
  ctx.fill();
  // The two tall stacks, black with gold feathered crowns.
  ctx.fillStyle = STACK;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  for (let st = 0; st < 2; st++) {
    const sx = x + (st ? -0.2 : -0.36) * k;
    ctx.rect(sx - k * 0.03, by - k * 0.78, k * 0.06, k * 0.43);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  for (let st = 0; st < 2; st++) {
    const sx = x + (st ? -0.2 : -0.36) * k;
    const sy = by - k * 0.78;
    for (let j = -2; j <= 2; j++) {
      ctx.moveTo(sx + j * k * 0.018 - k * 0.012, sy + k * 0.02);
      ctx.lineTo(sx + j * k * 0.024, sy - k * 0.035);
      ctx.lineTo(sx + j * k * 0.018 + k * 0.012, sy + k * 0.02);
      ctx.closePath();
    }
  }
  ctx.fill();
  // The whistle's jet of steam, when it blows.
  const w = whistleAt(s.t);
  if (w >= 0) {
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = Math.sin(Math.PI * w) * 0.9;
    ctx.beginPath();
    oval(ctx, x + k * 0.22 + w * k * 0.1, by - k * 0.72 - w * k * 0.1, k * (0.04 + w * 0.1), k * (0.03 + w * 0.05), -0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The sternwheel, turning: a red drum with white spokes and paddles.
  ctx.fillStyle = tone.boatTrim;
  ctx.beginPath();
  circle(ctx, wx, wy, wr);
  ctx.fill();
  ctx.strokeStyle = tone.boat;
  ctx.lineWidth = Math.max(1, k * 0.022);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = s.t * 2.4 + (i * Math.PI) / 3;
    ctx.moveTo(wx + Math.cos(a) * wr * 0.2, wy + Math.sin(a) * wr * 0.2);
    ctx.lineTo(wx + Math.cos(a) * wr * 0.95, wy + Math.sin(a) * wr * 0.95);
  }
  circle(ctx, wx, wy, wr * 0.62);
  ctx.stroke();
  // The flagstaff on the pilot house, with a pennant in purple, green and gold.
  const fx = x + k * 0.05;
  const fy = by - k * 0.61;
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(fx - k * 0.008, fy - k * 0.2, k * 0.016, k * 0.2);
  const flap = Math.sin(s.t * 6) * k * 0.012;
  const colors = [PURPLE.body, GREEN.body, GOLD.body];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i]!;
    ctx.beginPath();
    const y0 = fy - k * 0.2 + i * k * 0.03;
    ctx.moveTo(fx, y0);
    ctx.lineTo(fx + k * (0.18 - i * 0.02), y0 + k * 0.015 + flap * (i + 1) * 0.4);
    ctx.lineTo(fx, y0 + k * 0.03);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the streetcar

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

/**
 * The streetcar on the riverwalk: a red car with a cream band of windows under a rounded roof, a
 * trolley pole up to the wire trailing back the way it came, a headlamp at its front, its
 * wheels in a dark skirt. It rolls on the right only (in from the right edge to its stop and
 * back).
 */
export function streetcar(ctx: Ctx, s: Scene, tone: Tone): void {
  const now = tramAt(s.t);
  const u = s.u;
  const k = TRAM * u;
  const x = s.cssW / 2 + now.x * u;
  if (x - k * 0.62 > s.cssW) return;
  const y = s.horizonY - u * WALK_UP;
  // The body: a rounded box over a dark skirt, the windows a cream band with dark panes.
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x - k * 0.58, y - k * 0.1, k * 1.16, k * 0.1);
  ctx.fillStyle = tone.tram;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.62, y - k * 0.1);
  ctx.lineTo(x - k * 0.62, y - k * 0.4);
  ctx.quadraticCurveTo(x - k * 0.62, y - k * 0.52, x - k * 0.48, y - k * 0.52);
  ctx.lineTo(x + k * 0.48, y - k * 0.52);
  ctx.quadraticCurveTo(x + k * 0.62, y - k * 0.52, x + k * 0.62, y - k * 0.4);
  ctx.lineTo(x + k * 0.62, y - k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.tramLit;
  ctx.fillRect(x - k * 0.56, y - k * 0.42, k * 1.12, k * 0.17);
  ctx.fillRect(x - k * 0.62, y - k * 0.16, k * 1.24, k * 0.025);
  ctx.fillStyle = tone.lit > 0.3 ? tone.glow : tone.stoneShade;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) ctx.rect(x - k * 0.52 + i * k * 0.18, y - k * 0.4, k * 0.12, k * 0.12);
  ctx.fill();
  // The headlamp at the front, the way it is going.
  ctx.fillStyle = HEADLAMP;
  ctx.beginPath();
  circle(ctx, x + now.dir * k * 0.6, y - k * 0.22, k * 0.035);
  ctx.fill();
  // The trolley pole, trailing back the way it came, kept low under the riverboat's waterline.
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.beginPath();
  ctx.moveTo(x, y - k * 0.52);
  ctx.lineTo(x - now.dir * k * 0.34, y - k * 0.64);
  ctx.stroke();
  // Wheels under the skirt.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  circle(ctx, x - k * 0.38, y - k * 0.03, k * 0.05);
  circle(ctx, x + k * 0.38, y - k * 0.03, k * 0.05);
  ctx.fill();
}

// ---------------------------------------------------------------- gulls

/** Where the gulls wheel: u right of the screen's center and u above the horizon, and their wingspan (u). */
const GULL_X = 0.38;
const GULL_UP = 0.43;
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

/** The far shore, the water with the riverboat, the riverwalk and the streetcar on it, and the gulls (the towers downtown, the cathedral and the rooftops stand in front: far.ts). */
export function riverfront(ctx: Ctx, s: Scene, tone: Tone): void {
  if (s.horizonY - s.u * 0.45 > s.cssH) return;
  farShore(ctx, s, tone);
  river(ctx, s, tone);
  riverboat(ctx, s, tone);
  riverwalk(ctx, s, tone);
  streetcar(ctx, s, tone);
  gulls(ctx, s, tone);
}

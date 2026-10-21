import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { headTop } from "./coast";
import { frontTop } from "./fields";
import { archPath } from "./shapes";
import type { Tone } from "./tone";

// What stands on the far hills, all our own designs after the owner's photos. On the left hill's
// crest a turreted stone castle on its green rise, the table mountain behind it: a tall keep
// with a battlemented parapet, a round stair turret at its corner under a tall slate cone, a
// little corbelled turret on the far corner, a lower wing with a chimney, a bawn wall round its
// foot. Below it on the slope a slate-roofed stone farmhouse, and further down a ring of
// dry-stone wall round two corbelled beehive huts. Out on the headland over the bay, an old
// monastic site: a whole round tower under its conical cap and a ringed high cross.
// Far things: lit from the left (where the sun hangs), in the hour's far colors, each drawn with
// a fine contour of its own, never the ink. None of it stands in the tower's column.
//
// Positions are in u from the screen center, depths in u below the horizon (negative is up).

/** A fine contour round far things (u). */
function fine(u: number): number {
  return Math.max(0.8, u * 0.0022);
}

// ---------------------------------------------------------------- the castle

/** The castle: the keep's center, and its parts' sizes (u). */
const CASTLE_X = -0.392;
const KEEP_W = 0.042;
const KEEP_H = 0.074;
const TURRET_W = 0.017;
const TURRET_H = 0.096;
const CONE_H = 0.034;
const WING_W = 0.036;
const WING_H = 0.044;
const WING_RIDGE = 0.062;
const MERLON = 0.0062;

/** The castle's foot: planted a little into the crest it stands on. */
function castleFoot(s: Scene): number {
  return frontTop(s, CASTLE_X) + s.u * 0.006;
}

/** The castle's silhouette (keep, turret with its cone, the corbelled turret, the wing and its roof, the bawn wall), as subpaths. */
function castleShape(ctx: Ctx, s: Scene, foot: number): void {
  const u = s.u;
  const x = s.cssW / 2 + CASTLE_X * u;
  const kl = x - (KEEP_W / 2) * u;
  const kr = x + (KEEP_W / 2) * u;
  const top = foot - KEEP_H * u;
  // The keep, its battlements along the top.
  ctx.moveTo(kl, foot);
  ctx.lineTo(kl, top);
  const n = Math.floor(KEEP_W / MERLON);
  const step = (kr - kl) / n;
  for (let i = 0; i < n; i++) {
    const a = kl + i * step;
    if (i % 2 === 0) {
      ctx.lineTo(a, top - MERLON * u);
      ctx.lineTo(a + step, top - MERLON * u);
    }
    ctx.lineTo(a + step, top);
  }
  ctx.lineTo(kr, foot);
  ctx.closePath();
  // The stair turret on the left corner, under its tall cone with a finial.
  const tl = kl - TURRET_W * 0.55 * u;
  const tr = tl + TURRET_W * u;
  const tt = foot - TURRET_H * u;
  ctx.moveTo(tl, foot);
  ctx.lineTo(tl, tt);
  ctx.lineTo(tl - u * 0.003, tt);
  ctx.lineTo((tl + tr) / 2, tt - CONE_H * u);
  ctx.lineTo(tr + u * 0.003, tt);
  ctx.lineTo(tr, tt);
  ctx.lineTo(tr, foot);
  ctx.closePath();
  ctx.rect((tl + tr) / 2 - u * 0.0009, tt - (CONE_H + 0.009) * u, u * 0.0018, u * 0.01);
  // The little turret corbelled out from the keep's right corner, under its own cone.
  const bl = kr - u * 0.004;
  const bw = u * 0.011;
  const bt = top - u * 0.012;
  ctx.moveTo(bl, top + u * 0.016);
  ctx.lineTo(bl, bt);
  ctx.lineTo(bl - u * 0.002, bt);
  ctx.lineTo(bl + bw / 2, bt - u * 0.017);
  ctx.lineTo(bl + bw + u * 0.002, bt);
  ctx.lineTo(bl + bw, bt);
  ctx.lineTo(bl + bw, top + u * 0.01);
  ctx.quadraticCurveTo(bl + bw * 0.5, top + u * 0.022, bl, top + u * 0.016);
  ctx.closePath();
  // The lower wing on the right, its pitched slate roof and a chimney.
  const wl = kr;
  const wr = kr + WING_W * u;
  ctx.moveTo(wl, foot);
  ctx.lineTo(wl, foot - WING_RIDGE * u);
  ctx.lineTo(wr - u * 0.008, foot - WING_RIDGE * u);
  ctx.lineTo(wr + u * 0.003, foot - WING_H * u);
  ctx.lineTo(wr, foot - WING_H * u);
  ctx.lineTo(wr, foot);
  ctx.closePath();
  ctx.rect(wr - u * 0.014, foot - (WING_RIDGE + 0.012) * u, u * 0.006, u * 0.014);
  // The bawn wall round its foot.
  ctx.rect(tl - u * 0.012, foot - u * 0.011, wr - tl + u * 0.022, u * 0.011);
}

/**
 * The castle: its silhouette in stone, lit on the left of each face, the slate roofs and cones,
 * dark windows (slits in the turret, two tiers in the keep, a pair in the wing) and an arched
 * door in the bawn wall, then a fine contour round it all.
 */
export function castle(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const foot = castleFoot(s);
  const x = s.cssW / 2 + CASTLE_X * u;
  const kl = x - (KEEP_W / 2) * u;
  const kr = x + (KEEP_W / 2) * u;
  const top = foot - KEEP_H * u;
  const tl = kl - TURRET_W * 0.55 * u;
  const tr = tl + TURRET_W * u;
  const tt = foot - TURRET_H * u;
  const wr = kr + WING_W * u;
  ctx.beginPath();
  castleShape(ctx, s, foot);
  ctx.fillStyle = tone.stone;
  ctx.fill();
  // Light and shade: the turret's lit left side, the keep's face lit, its right edge in shade;
  // the wing in the keep's shadow at its left.
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.rect(tl, tt, TURRET_W * 0.4 * u, foot - tt);
  ctx.rect(tr, top, (kr - tr) * 0.55, foot - top);
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.rect(tr - TURRET_W * 0.22 * u, tt, TURRET_W * 0.22 * u, foot - tt);
  ctx.rect(kr - u * 0.006, top, u * 0.006, foot - top);
  ctx.rect(kr, foot - (WING_RIDGE - 0.004) * u, u * 0.008, (WING_RIDGE - 0.004) * u);
  ctx.fill();
  // Slate: the turret's cone (lit on its left), the little turret's cone, the wing's roof.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(tl - u * 0.003, tt);
  ctx.lineTo((tl + tr) / 2, tt - CONE_H * u);
  ctx.lineTo(tr + u * 0.003, tt);
  ctx.closePath();
  const bl = kr - u * 0.004;
  const bw = u * 0.011;
  const bt = top - u * 0.012;
  ctx.moveTo(bl - u * 0.002, bt);
  ctx.lineTo(bl + bw / 2, bt - u * 0.017);
  ctx.lineTo(bl + bw + u * 0.002, bt);
  ctx.closePath();
  ctx.moveTo(kr, foot - WING_RIDGE * u);
  ctx.lineTo(wr - u * 0.008, foot - WING_RIDGE * u);
  ctx.lineTo(wr + u * 0.003, foot - WING_H * u);
  ctx.lineTo(kr, foot - WING_H * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(tl - u * 0.003, tt);
  ctx.lineTo((tl + tr) / 2, tt - CONE_H * u);
  ctx.lineTo((tl + tr) / 2 - u * 0.001, tt);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Windows: slits up the turret, two tiers of arched windows in the keep, a pair in the wing,
  // the arched door in the bawn wall.
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  const tc = (tl + tr) / 2;
  for (const h of [0.03, 0.056, 0.08]) ctx.rect(tc - u * 0.0013, foot - h * u, u * 0.0026, u * 0.008);
  for (const [dx, h] of [
    [-0.009, 0.05],
    [0.004, 0.05],
    [-0.009, 0.03],
    [0.004, 0.03],
  ] as const) {
    archPath(ctx, x + dx * u, foot - h * u, u * 0.0055, u * 0.0095);
  }
  for (const dx of [0.009, 0.022]) ctx.rect(kr + dx * u, foot - 0.034 * u, u * 0.005, u * 0.008);
  archPath(ctx, x - u * 0.004, foot, u * 0.008, u * 0.011);
  ctx.fill();
  // The fine contour.
  ctx.beginPath();
  castleShape(ctx, s, foot);
  ctx.strokeStyle = tone.window;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = fine(u);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the farmhouse and the beehive huts

/** The slate-roofed stone farmhouse on the slope below the castle: its center and foot depth, half width (u). */
const FARM_X = -0.29;
const FARM_D = 0.008;
const FARM_HW = 0.024;
const FARM_H = 0.016;

/** The farmhouse's outline (walls, roof and its two chimneys), as subpaths. */
function farmShape(ctx: Ctx, x: number, y: number, u: number): void {
  const hw = FARM_HW * u;
  const h = FARM_H * u;
  ctx.rect(x - hw, y - h, hw * 2, h);
  ctx.moveTo(x - hw - u * 0.003, y - h);
  ctx.lineTo(x - hw + u * 0.006, y - h - u * 0.013);
  ctx.lineTo(x + hw - u * 0.006, y - h - u * 0.013);
  ctx.lineTo(x + hw + u * 0.003, y - h);
  ctx.closePath();
  for (const m of [-1, 1]) ctx.rect(x + m * (hw - u * 0.009) - u * 0.0028, y - h - u * 0.019, u * 0.0056, u * 0.009);
}

/** The beehive huts: center X, depth of their foot, half width and height (u); the ring wall round them. */
const HUTS = [
  [-0.468, 0.036, 0.0125, 0.021],
  [-0.437, 0.03, 0.011, 0.018],
] as const;
const RING_X = -0.452;
const RING_D = 0.032;
const RING_RX = 0.043;
const RING_RY = 0.011;

/** One beehive hut's dome, as its own subpath. */
function hutPath(ctx: Ctx, x: number, y: number, hw: number, h: number): void {
  ctx.moveTo(x - hw, y);
  ctx.bezierCurveTo(x - hw, y - h * 0.75, x - hw * 0.45, y - h, x, y - h);
  ctx.bezierCurveTo(x + hw * 0.45, y - h, x + hw, y - h * 0.75, x + hw, y);
  ctx.closePath();
}

/** The ring wall's height (u); the dash patterns of the pale stones along its top and the joints across its face (filled per frame), and none. */
const RING_WALL = 0.009;
const RING_STONES = [0, 0];
const RING_JOINTS = [0, 0];
const NO_DASH: number[] = [];

/** The ring wall's back half (behind the huts) or front half, as a band of stone `w` thick, as a new path. */
function ringPath(ctx: Ctx, s: Scene, back: boolean, w: number): void {
  const u = s.u;
  const x = s.cssW / 2 + RING_X * u;
  const y = s.horizonY + RING_D * u;
  ctx.beginPath();
  const a0 = back ? Math.PI : 0;
  ctx.ellipse(x, y, RING_RX * u, RING_RY * u, 0, a0, a0 + Math.PI);
  ctx.ellipse(x, y - w, RING_RX * u, RING_RY * u, 0, a0 + Math.PI, a0, true);
  ctx.closePath();
}

/** The line along the ring wall's back or front half, `dy` below its foot (negative is up), as a new path. */
function ringLine(ctx: Ctx, s: Scene, back: boolean, dy: number): void {
  const u = s.u;
  const x = s.cssW / 2 + RING_X * u;
  const y = s.horizonY + RING_D * u + dy;
  const a0 = back ? Math.PI : 0;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a0) * RING_RX * u, y + Math.sin(a0) * RING_RY * u);
  ctx.ellipse(x, y, RING_RX * u, RING_RY * u, 0, a0, a0 + Math.PI);
}

/**
 * Half of the ring of dry-stone wall: a band of grey stone, its joints dashed across its face,
 * a row of pale stones along its top like the walls on the slopes (fields.ts), and along the
 * near half's foot a fine contour.
 */
function ringWall(ctx: Ctx, s: Scene, tone: Tone, back: boolean): void {
  const u = s.u;
  const w = RING_WALL * u;
  ringPath(ctx, s, back, w);
  ctx.fillStyle = tone.stone;
  ctx.fill();
  ringLine(ctx, s, back, -w * 0.42);
  RING_JOINTS[0] = Math.max(0.6, u * 0.0014);
  RING_JOINTS[1] = u * 0.0055;
  ctx.setLineDash(RING_JOINTS);
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = w * 0.55;
  ctx.lineCap = "butt";
  ctx.stroke();
  ringLine(ctx, s, back, -w);
  RING_STONES[0] = u * 0.0001;
  RING_STONES[1] = u * 0.0075;
  ctx.setLineDash(RING_STONES);
  ctx.strokeStyle = tone.wall;
  ctx.lineWidth = Math.max(1.2, u * 0.0045);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
  if (back) return;
  ringLine(ctx, s, back, 0);
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = fine(u);
  ctx.stroke();
}

/**
 * The farmhouse (whitewashed gable lit on the left, grey stone front, slate roof, a door and
 * two windows) and, down the slope, the ring of dry-stone wall with the two beehive huts in it:
 * corbelled domes of grey stone, lit on the left, their courses drawn round them, a low dark
 * doorway each.
 */
export function farmhouses(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const fx = cx + FARM_X * u;
  const fy = s.horizonY + FARM_D * u;
  ctx.beginPath();
  farmShape(ctx, fx, fy, u);
  ctx.fillStyle = tone.stone;
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(fx - FARM_HW * u, fy - FARM_H * u, u * 0.01, FARM_H * u);
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(fx - FARM_HW * u - u * 0.003, fy - FARM_H * u);
  ctx.lineTo(fx - FARM_HW * u + u * 0.006, fy - FARM_H * u - u * 0.013);
  ctx.lineTo(fx + FARM_HW * u - u * 0.006, fy - FARM_H * u - u * 0.013);
  ctx.lineTo(fx + FARM_HW * u + u * 0.003, fy - FARM_H * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  ctx.rect(fx - u * 0.0025, fy - u * 0.011, u * 0.005, u * 0.011);
  ctx.rect(fx - u * 0.015, fy - u * 0.011, u * 0.0055, u * 0.005);
  ctx.rect(fx + u * 0.0095, fy - u * 0.011, u * 0.0055, u * 0.005);
  ctx.fill();
  ctx.beginPath();
  farmShape(ctx, fx, fy, u);
  ctx.strokeStyle = tone.window;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = fine(u);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The ring wall's far half, the huts, then its near half in front of them.
  ringWall(ctx, s, tone, true);
  ctx.beginPath();
  for (const [X, d, hw, h] of HUTS) hutPath(ctx, cx + X * u, s.horizonY + d * u, hw * u, h * u);
  ctx.fillStyle = tone.stone;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  for (const [X, d, hw, h] of HUTS) circle(ctx, cx + (X - hw * 0.55) * u, s.horizonY + (d - h * 0.45) * u, hw * 0.75 * u);
  ctx.fill();
  ctx.beginPath();
  for (const [X, d, hw, h] of HUTS) {
    for (const k of [0.3, 0.55, 0.78]) {
      const y = s.horizonY + (d - h * k) * u;
      const w = hw * Math.sqrt(1 - k * k * 0.9) * u;
      ctx.moveTo(cx + X * u - w, y);
      ctx.lineTo(cx + X * u + w, y);
    }
  }
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = Math.max(0.6, u * 0.0016);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (const [X, d, hw] of HUTS) archPath(ctx, cx + (X + hw * 0.2) * u, s.horizonY + d * u, hw * 0.55 * u, hw * 0.75 * u);
  ctx.fill();
  ctx.beginPath();
  for (const [X, d, hw, h] of HUTS) hutPath(ctx, cx + X * u, s.horizonY + d * u, hw * u, h * u);
  ctx.strokeStyle = tone.stoneShade;
  ctx.lineWidth = fine(u);
  ctx.stroke();
  ringWall(ctx, s, tone, false);
}

// ---------------------------------------------------------------- the monastic site on the headland

/** The round tower and the high cross on the headland (u from center). */
export const FAR_TOWER_X = 0.287;
export const CROSS_X = 0.338;

/**
 * An old monastic site out on the headland: a slim round tower, tapering a little, its lit side
 * and dark doorway, under a conical cap; and a high cross with its ring, on a stepped base.
 */
export function monastery(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  // The round tower: a tapering drum, lit on the left, a dark doorway halfway up and a window
  // under the cap; the cap a cone over a little eave, a shade darker.
  const x = cx + FAR_TOWER_X * u;
  const foot = s.horizonY + (headTop(FAR_TOWER_X) + 0.007) * u;
  const top = foot - u * 0.104;
  const hb = u * 0.0175;
  const ht = u * 0.014;
  const eave = ht * 1.22;
  const capH = u * 0.036;
  const drum = () => {
    ctx.beginPath();
    ctx.moveTo(x - hb, foot);
    ctx.lineTo(x - ht, top);
    ctx.lineTo(x - eave, top + u * 0.003);
    ctx.lineTo(x - ht * 0.2, top - capH);
    ctx.quadraticCurveTo(x, top - capH - u * 0.003, x + ht * 0.2, top - capH);
    ctx.lineTo(x + eave, top + u * 0.003);
    ctx.lineTo(x + ht, top);
    ctx.lineTo(x + hb, foot);
    ctx.closePath();
  };
  drum();
  ctx.fillStyle = tone.stone;
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.moveTo(x - hb * 0.66, foot);
  ctx.lineTo(x - ht * 0.66, top);
  ctx.lineTo(x - ht * 0.12, top);
  ctx.lineTo(x - hb * 0.12, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - eave, top + u * 0.003);
  ctx.lineTo(x - ht * 0.2, top - capH);
  ctx.quadraticCurveTo(x, top - capH - u * 0.003, x + ht * 0.2, top - capH);
  ctx.lineTo(x + eave, top + u * 0.003);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(x + hb * 0.55, foot);
  ctx.lineTo(x + ht * 0.55, top);
  ctx.lineTo(x + ht, top);
  ctx.lineTo(x + hb, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  archPath(ctx, x - u * 0.0042, top + u * 0.062, u * 0.0084, u * 0.016);
  archPath(ctx, x - u * 0.003, top + u * 0.016, u * 0.006, u * 0.011);
  ctx.fill();
  drum();
  ctx.strokeStyle = tone.window;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = fine(u);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The high cross: a stepped base, the shaft, the arms and the ring round their crossing.
  const kx = cx + CROSS_X * u;
  const kfoot = s.horizonY + (headTop(CROSS_X) + 0.005) * u;
  const shaft = u * 0.0085;
  const kTop = kfoot - u * 0.062;
  const armY = kTop + u * 0.016;
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.rect(kx - u * 0.011, kfoot - u * 0.009, u * 0.022, u * 0.009);
  ctx.rect(kx - shaft / 2, kTop, shaft, kfoot - kTop - u * 0.008);
  ctx.rect(kx - u * 0.019, armY - u * 0.004, u * 0.038, u * 0.0085);
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(kx - shaft / 2, kTop + u * 0.001, shaft * 0.4, kfoot - kTop - u * 0.01);
  ctx.strokeStyle = tone.stone;
  ctx.lineWidth = Math.max(1, u * 0.0034);
  ctx.beginPath();
  circle(ctx, kx, armY, u * 0.0105);
  ctx.stroke();
}

import { hash, oval, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { BEAK, COBBLE, IRON, LAMP, LAMP_CORE, NAVY, PIGEON, PIGEON_LIGHT, PIGEON_NECK, RUT, SNOW, TEAL } from "./colors";
import { glow, inked, INKW, puff, puffOval, snowCap } from "./shapes";

// Street furniture and life on the snowy cobbles, cut from flat paper: cobblestones peeking
// through the snow (thickest along the carriage track), Victorian gas lamps (a slim
// navy post, a ladder bar, an inked mustard lantern in its ring of light), and pigeons pecking
// about in front of the tower, drawn round in ink, that flutter up when the carriage clatters by.

const Y = (v: number) => -v;

// ---------------------------------------------------------------- cobbles

/**
 * Cobbles: [depth z, dx in units at that depth, size] for every stone that shows through the
 * snow, worked out once. Rows grow toward the viewer; stones show along the carriage track,
 * in a worn patch round the tower's foot and here and there elsewhere.
 */
const COBBLES: number[] = (() => {
  const out: number[] = [];
  for (let i = 0, z = 1.52; z < 5; i++, z *= 1.085) {
    const w = 0.034;
    const reach = (0.8 * z) / TOWER_DEPTH;
    const off = i % 2 ? w * 0.55 : 0;
    for (let j = -Math.ceil(reach / (w * 1.1)); j * w * 1.1 < reach; j++) {
      const dx = j * w * 1.1 + off;
      const sx = (dx * TOWER_DEPTH) / z; // screen offset in u
      // Smooth patches where the snow has worn thin, and the carriage track up front.
      const patch = Math.sin(sx * 9.1 + z * 2.3) * 0.5 + Math.sin(sx * 4.3 - z * 4.1 + 1.3) * 0.5;
      const track = z < 1.7 ? 0.5 : 0;
      const keep = Math.max(track, patch > 0.4 ? 0.65 : patch > 0.2 ? 0.2 : 0);
      if (hash(i * 131 + j * 7 + 5000) > keep) continue;
      out.push(z, dx + (hash(i * 17 + j + 5100) - 0.5) * w * 0.2, 0.85 + hash(i * 7 + j * 3 + 5200) * 0.3);
    }
  }
  return out;
})();

/** Half-height of a cobble as a fraction of the row's screen distance from the horizon. */
const ROW_RY = (1 - 1 / 1.085) * 0.42;
/** A cobble is never taller than this fraction of its width. */
const COBBLE_FLAT = 0.62;

/** A rounded stone as its own subpath: four quadratic curves (much cheaper than an ellipse). */
function stone(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x - rx, y - ry, x, y - ry);
  ctx.quadraticCurveTo(x + rx, y - ry, x + rx, y);
  ctx.quadraticCurveTo(x + rx, y + ry, x, y + ry);
  ctx.quadraticCurveTo(x - rx, y + ry, x - rx, y);
  ctx.closePath();
}

/** Cobbles in patches on the snowy street: flat stones in one tint, no highlights. */
export function cobbles(ctx: Ctx, s: Scene): void {
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const depth = s.groundY - hy;
  ctx.beginPath();
  for (let i = 0; i + 2 < COBBLES.length; i += 3) {
    const z = COBBLES[i]!;
    const y = hy + (depth * TOWER_DEPTH) / z;
    if (y > s.cssH + 4) continue;
    const U = (s.u * TOWER_DEPTH) / z;
    const rx = 0.0155 * U * COBBLES[i + 2]!;
    // Rows spread apart as the camera climbs; the stones stay flat rather than stretching.
    const ry = Math.max(0.8, Math.min(rx * COBBLE_FLAT, ((depth * TOWER_DEPTH) / z) * ROW_RY));
    stone(ctx, cx + COBBLES[i + 1]! * U, y, rx, ry);
  }
  ctx.fillStyle = COBBLE;
  ctx.fill();
}

/** Wheel ruts pressed into the snow along the carriage track: depth z of each rut. */
const RUTS = [1.5, 1.6] as const;

export function ruts(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const depth = s.groundY - hy;
  ctx.beginPath();
  for (const z of RUTS) {
    const y = hy + (depth * TOWER_DEPTH) / z;
    if (y > s.cssH) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(s.cssW, y);
  }
  ctx.strokeStyle = RUT;
  ctx.lineWidth = Math.max(1.5, s.u * 0.006);
  ctx.lineCap = "butt";
  ctx.stroke();
}

// ---------------------------------------------------------------- gas lamps

/** Lamps are modelled at full size and drawn at this scale. */
const LAMP_SCALE = 0.85;
/** Height of a lamp's burner above its foot, in units at the lamp's depth. */
export const LAMP_BURNER = 0.342 * LAMP_SCALE;
/** Height of the ladder bar, in units at the lamp's depth. */
export const LADDER_BAR = 0.29 * LAMP_SCALE;

/**
 * A gas lamp post with its foot at screen (x, y), U px per unit: a stepped plinth, a slim post,
 * a ladder bar, and a mustard lantern under a pointed cap, in a ring of light. `flare` (0..1)
 * brightens it as it's lit.
 */
export function gasLamp(ctx: Ctx, x: number, y: number, depthU: number, lwPx: number, t: number, seed: number, flare: number): void {
  const U = depthU * LAMP_SCALE;
  const ink = (lwPx * INKW) / U;
  const flick = 0.9 + 0.1 * Math.sin(t * 8.3 + seed) * Math.sin(t * 3.7 + seed * 2);
  glow(ctx, x, y - 0.342 * U, 0.13 * U, Math.min(1, flick * (0.8 + 0.4 * flare)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(U, U);
  // Post, plinth, collar, the ladder bar and the cap, all one navy silhouette.
  ctx.beginPath();
  ctx.moveTo(-0.017, 0);
  ctx.lineTo(-0.017, Y(0.022));
  ctx.lineTo(-0.009, Y(0.03));
  ctx.lineTo(-0.0045, Y(0.04));
  ctx.lineTo(-0.0045, Y(0.31));
  ctx.lineTo(0.0045, Y(0.31));
  ctx.lineTo(0.0045, Y(0.04));
  ctx.lineTo(0.009, Y(0.03));
  ctx.lineTo(0.017, Y(0.022));
  ctx.lineTo(0.017, 0);
  ctx.closePath();
  ctx.rect(-0.0085, Y(0.168), 0.017, 0.008);
  ctx.rect(-0.024, Y(0.29), 0.048, 0.006);
  puff(ctx, -0.024, Y(0.287), 0.0045);
  puff(ctx, 0.024, Y(0.287), 0.0045);
  ctx.rect(-0.012, Y(0.318), 0.024, 0.008);
  ctx.moveTo(-0.022, Y(0.368));
  ctx.lineTo(0, Y(0.398));
  ctx.lineTo(0.022, Y(0.368));
  ctx.closePath();
  puff(ctx, 0, Y(0.402), 0.0045);
  ctx.fillStyle = IRON;
  ctx.fill();
  // A teal glint down the post.
  ctx.beginPath();
  ctx.rect(-0.002, Y(0.3), 0.0018, 0.255);
  ctx.fillStyle = TEAL;
  ctx.fill();
  // The lantern's glass: a tapered box, glowing, with the flame and a center bar.
  ctx.beginPath();
  ctx.moveTo(-0.011, Y(0.318));
  ctx.lineTo(-0.017, Y(0.368));
  ctx.lineTo(0.017, Y(0.368));
  ctx.lineTo(0.011, Y(0.318));
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();
  inked(ctx, ink);
  ctx.beginPath();
  puffOval(ctx, 0, Y(0.342), 0.006, 0.0105 * flick * (1 + 0.25 * flare));
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-0.0012, Y(0.368), 0.0024, 0.05);
  ctx.fillStyle = IRON;
  ctx.fill();
  // Snow on the cap and the ladder bar
  ctx.beginPath();
  snowCap(ctx, -0.019, 0.019, Y(0.372), 0.007);
  snowCap(ctx, -0.022, 0.022, Y(0.29), 0.0045);
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- pigeons

/** Pigeons: [depth z, dx at that depth, facing (1 left, -1 right), phase]. */
export const PIGEONS = [
  [2.3, -0.07, 1, 0.2],
  [2.2, 0.02, -1, 1.7],
  [2.35, 0.11, 1, 3.1],
  [2.15, 0.15, -1, 4.4],
] as const;

/** The shadows of pigeons on the snow, as subpaths: a flat oval under the bird at screen (x, y), U px per unit. */
export function pigeonShadow(ctx: Ctx, x: number, y: number, U: number): void {
  puffOval(ctx, x, y, 0.012 * U, 0.0025 * U);
}

/**
 * One plump pigeon with its feet at screen (x, y), U px per unit, facing left (dir 1) or right
 * (-1), pecking now and then; `lift` (0..1) flutters it up off the ground. Flat shapes, inked
 * round its silhouette: a slate body and head, a paler wing, a teal collar. (Its shadow on the
 * snow is drawn with the others', by pigeonShadow.)
 */
export function pigeon(ctx: Ctx, x: number, y: number, U: number, lwPx: number, dir: number, t: number, phase: number, lift: number): void {
  const lw = lwPx / U;
  const pk = Math.max(0, Math.sin(t * 2.3 + phase));
  const peck = lift > 0 ? 0 : pk * pk * pk * pk;
  // Kept low enough that even the farthest bird stays under the tower's floor line.
  const hop = lift * 0.012 + (lift > 0 ? Math.abs(Math.sin(t * 9 + phase)) * 0.004 * lift : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(U * dir, U);
  ctx.translate(0, Y(hop));
  // Feet
  if (lift < 0.2) {
    ctx.beginPath();
    ctx.moveTo(-0.003, Y(0.006));
    ctx.lineTo(-0.004, 0);
    ctx.moveTo(0.003, Y(0.006));
    ctx.lineTo(0.003, 0);
    ctx.strokeStyle = BEAK;
    ctx.lineWidth = lw * 0.8;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  // Tail, body and head, dipping forward to peck: one shape, inked under so it reads whole.
  const tilt = peck * 0.35;
  ctx.rotate(-tilt * 0.5);
  const hx = -0.012 - peck * 0.006;
  const hy = 0.021 - peck * 0.014;
  ctx.beginPath();
  ctx.moveTo(0.008, Y(0.013));
  ctx.lineTo(0.024, Y(0.017));
  ctx.lineTo(0.023, Y(0.009));
  ctx.lineTo(0.008, Y(0.007));
  ctx.closePath();
  oval(ctx, 0, Y(0.0115), 0.0135, 0.0085);
  ctx.moveTo(-0.008, Y(0.017));
  ctx.quadraticCurveTo(-0.012, Y(0.02), hx, Y(hy));
  ctx.lineTo(hx + 0.006, Y(hy - 0.006));
  ctx.lineTo(-0.004, Y(0.012));
  ctx.closePath();
  puff(ctx, hx, Y(hy), 0.0055);
  inked(ctx, lw * INKW * 2);
  ctx.fillStyle = PIGEON;
  ctx.fill();
  // The teal collar round its neck.
  ctx.beginPath();
  ctx.moveTo(-0.0075, Y(0.0175));
  ctx.quadraticCurveTo(-0.011, Y(0.0195), hx + 0.002, Y(hy - 0.003));
  ctx.lineTo(hx + 0.0065, Y(hy - 0.0065));
  ctx.lineTo(-0.0035, Y(0.0125));
  ctx.closePath();
  ctx.fillStyle = PIGEON_NECK;
  ctx.fill();
  // Wing: folded, or raised and beating when it flutters
  ctx.beginPath();
  if (lift > 0) {
    const up = 0.012 + Math.sin(t * 22 + phase) * 0.006;
    ctx.moveTo(-0.004, Y(0.016));
    ctx.lineTo(0.012, Y(0.02 + up));
    ctx.lineTo(0.016, Y(0.017 + up * 0.7));
    ctx.lineTo(0.008, Y(0.012));
    ctx.closePath();
  } else {
    puffOval(ctx, 0.005, Y(0.0125), 0.0085, 0.005, -0.15);
  }
  ctx.fillStyle = PIGEON_LIGHT;
  ctx.fill();
  // Beak and eye
  ctx.beginPath();
  ctx.moveTo(hx - 0.004, Y(hy + 0.001));
  ctx.lineTo(hx - 0.0095, Y(hy - 0.0015));
  ctx.lineTo(hx - 0.004, Y(hy - 0.002));
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ctx.beginPath();
  puff(ctx, hx - 0.0015, Y(hy + 0.0012), 0.0014);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.restore();
}

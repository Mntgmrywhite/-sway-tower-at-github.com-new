import { alpha, circle, hash, ink, oval, roundRectPath, type Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import {
  BEAK,
  COBBLE,
  COBBLE_LIGHT,
  INK,
  IRON,
  IRON_LIGHT,
  LAMP,
  LAMP_CORE,
  PIGEON,
  PIGEON_LIGHT,
  PIGEON_NECK,
  SNOW,
  SNOW_DEEP,
} from "./colors";
import { glow, snowCap } from "./shapes";

// Street furniture and life on the snowy cobbles: cobblestones peeking through the snow
// (thickest along the carriage track), Victorian gas lamps with a ladder bar and a glowing
// lantern, and pigeons pecking about in front of the tower that flutter up when the
// carriage clatters by.

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
      const track = z < 1.7 ? 0.6 : 0;
      const keep = Math.max(track, patch > 0.4 ? 0.8 : patch > 0.2 ? 0.25 : 0.02);
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

/** Cobbles in patches on the snowy street: a stone, and a lit top on the nearer, bigger ones. */
export function cobbles(ctx: Ctx, s: Scene): void {
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  const depth = s.groundY - hy;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i + 2 < COBBLES.length; i += 3) {
      const z = COBBLES[i]!;
      if (pass && z > 2.6) continue;
      const y = hy + (depth * TOWER_DEPTH) / z;
      if (y > s.cssH + 4) continue;
      const U = (s.u * TOWER_DEPTH) / z;
      const rx = 0.0155 * U * COBBLES[i + 2]!;
      // Rows spread apart as the camera climbs; the stones stay flat rather than stretching
      // into tall grey pills.
      const ry = Math.max(0.8, Math.min(rx * COBBLE_FLAT, ((depth * TOWER_DEPTH) / z) * ROW_RY));
      const x = cx + COBBLES[i + 1]! * U;
      if (pass) stone(ctx, x - rx * 0.12, y - ry * 0.3, rx * 0.7, ry * 0.5);
      else stone(ctx, x, y, rx, ry);
    }
    ctx.fillStyle = pass ? COBBLE_LIGHT : COBBLE;
    ctx.fill();
  }
}

/** Wheel ruts pressed into the snow along the carriage track: depth z of each rut. */
const RUTS = [1.5, 1.6] as const;
const RUT = alpha(SNOW_DEEP, 0.55);

export function ruts(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const depth = s.groundY - hy;
  const step = s.u * 0.12;
  ctx.beginPath();
  for (const z of RUTS) {
    const y = hy + (depth * TOWER_DEPTH) / z;
    if (y > s.cssH) continue;
    const amp = s.u * 0.003;
    ctx.moveTo(-step, y);
    for (let x = 0, i = 0; x < s.cssW + step; x += step, i++) {
      ctx.quadraticCurveTo(x - step / 2, y + (i % 2 ? amp : -amp), x, y);
    }
  }
  ctx.strokeStyle = RUT;
  ctx.lineWidth = Math.max(1.5, s.u * 0.006);
  ctx.lineCap = "round";
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
 * A gas lamp post with its foot at screen (x, y), U px per unit: fluted plinth, slim post, a
 * ladder bar, and a four-paned lantern glowing warm. `flare` (0..1) brightens it as it's lit.
 */
export function gasLamp(ctx: Ctx, x: number, y: number, depthU: number, lwPx: number, t: number, seed: number, flare: number): void {
  const U = depthU * LAMP_SCALE;
  const lw = lwPx / U;
  const flick = 0.9 + 0.1 * Math.sin(t * 8.3 + seed) * Math.sin(t * 3.7 + seed * 2);
  glow(ctx, x, y - 0.342 * U, 0.14 * U, Math.min(1, flick * (0.85 + 0.4 * flare)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(U, U);
  // Post: plinth, shaft and collar as one inked silhouette
  ctx.beginPath();
  ctx.moveTo(-0.018, 0);
  ctx.lineTo(-0.013, Y(0.03));
  ctx.lineTo(-0.009, Y(0.036));
  ctx.lineTo(-0.0055, Y(0.04));
  ctx.lineTo(-0.0042, Y(0.305));
  ctx.lineTo(-0.008, Y(0.312));
  ctx.lineTo(0.008, Y(0.312));
  ctx.lineTo(0.0042, Y(0.305));
  ctx.lineTo(0.0055, Y(0.04));
  ctx.lineTo(0.009, Y(0.036));
  ctx.lineTo(0.013, Y(0.03));
  ctx.lineTo(0.018, 0);
  ctx.closePath();
  ctx.fillStyle = IRON;
  ctx.fill();
  ink(ctx, lw, INK);
  // Lit flute down the shaft, a collar ring
  ctx.beginPath();
  ctx.rect(-0.002, Y(0.3), 0.0018, 0.255);
  ctx.rect(-0.01, Y(0.024), 0.004, 0.018);
  ctx.fillStyle = IRON_LIGHT;
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, -0.0085, -0.16, 0.017, 0.008, 0.003);
  ctx.fillStyle = IRON;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // Ladder bar with ball ends
  ctx.beginPath();
  ctx.rect(-0.022, Y(0.287), 0.044, 0.005);
  circle(ctx, -0.023, Y(0.2845), 0.0045);
  circle(ctx, 0.023, Y(0.2845), 0.0045);
  ctx.fillStyle = IRON;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // Lantern glass: a tapered box, glowing, with a flame and glazing bars
  ctx.beginPath();
  ctx.moveTo(-0.011, Y(0.315));
  ctx.lineTo(-0.017, Y(0.368));
  ctx.lineTo(0.017, Y(0.368));
  ctx.lineTo(0.011, Y(0.315));
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0, Y(0.342), 0.0058, 0.0105 * flick * (1 + 0.25 * flare));
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.011, Y(0.315));
  ctx.lineTo(-0.017, Y(0.368));
  ctx.lineTo(0.017, Y(0.368));
  ctx.lineTo(0.011, Y(0.315));
  ctx.closePath();
  ctx.moveTo(0, Y(0.315));
  ctx.lineTo(0, Y(0.368));
  ink(ctx, lw * 0.8, INK);
  // Cap: a wide rim, a pyramid roof and a finial
  ctx.beginPath();
  ctx.rect(-0.021, Y(0.374), 0.042, 0.007);
  ctx.moveTo(-0.017, Y(0.374));
  ctx.lineTo(0, Y(0.394));
  ctx.lineTo(0.017, Y(0.374));
  ctx.closePath();
  ctx.rect(-0.012, Y(0.315), 0.024, 0.006);
  ctx.fillStyle = IRON;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, 0, Y(0.398), 0.0042);
  ctx.fillStyle = IRON;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Snow on the cap and the ladder bar
  ctx.beginPath();
  snowCap(ctx, -0.019, 0.019, Y(0.377), 0.007);
  snowCap(ctx, -0.02, 0.02, Y(0.2875), 0.0045);
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

/**
 * One plump pigeon with its feet at screen (x, y), U px per unit, facing left (dir 1) or right
 * (-1), pecking now and then; `lift` (0..1) flutters it up off the ground.
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
  // Shadow on the snow
  ctx.beginPath();
  oval(ctx, 0, 0, 0.012, 0.0025);
  ctx.fillStyle = "rgba(90, 96, 160, 0.2)";
  ctx.fill();
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
  // Tail and body
  const tilt = peck * 0.35;
  ctx.rotate(-tilt * 0.5);
  ctx.beginPath();
  ctx.moveTo(0.008, Y(0.013));
  ctx.lineTo(0.024, Y(0.017));
  ctx.lineTo(0.023, Y(0.009));
  ctx.lineTo(0.008, Y(0.007));
  ctx.closePath();
  oval(ctx, 0, Y(0.0115), 0.0135, 0.0085);
  ctx.fillStyle = PIGEON;
  ctx.fill();
  ink(ctx, lw * 0.75, INK);
  ctx.beginPath();
  oval(ctx, -0.004, Y(0.009), 0.008, 0.005);
  ctx.fillStyle = PIGEON_LIGHT;
  ctx.fill();
  // Wing: folded with two dark bars, or raised and beating when it flutters
  ctx.beginPath();
  if (lift > 0) {
    // Raised wing, beating: a curved feathered blade from the shoulder.
    const up = 0.012 + Math.sin(t * 22 + phase) * 0.006;
    ctx.moveTo(-0.004, Y(0.016));
    ctx.quadraticCurveTo(-0.002, Y(0.018 + up * 1.3), 0.012, Y(0.02 + up));
    ctx.lineTo(0.016, Y(0.017 + up * 0.7));
    ctx.quadraticCurveTo(0.01, Y(0.016), 0.008, Y(0.012));
    ctx.closePath();
  } else {
    oval(ctx, 0.005, Y(0.0125), 0.0085, 0.005, -0.15);
  }
  ctx.fillStyle = PIGEON_LIGHT;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  if (lift === 0) {
    ctx.beginPath();
    ctx.moveTo(0.003, Y(0.014));
    ctx.lineTo(0.006, Y(0.009));
    ctx.moveTo(0.007, Y(0.015));
    ctx.lineTo(0.01, Y(0.01));
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
  }
  // Neck and head, dipping forward to peck
  const hx = -0.012 - peck * 0.006;
  const hy = 0.021 - peck * 0.014;
  ctx.beginPath();
  ctx.moveTo(-0.008, Y(0.017));
  ctx.quadraticCurveTo(-0.012, Y(0.02), hx, Y(hy));
  ctx.lineTo(hx + 0.006, Y(hy - 0.006));
  ctx.lineTo(-0.004, Y(0.012));
  ctx.closePath();
  ctx.fillStyle = PIGEON_NECK;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx, Y(hy), 0.0055);
  ctx.fillStyle = PIGEON;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  ctx.moveTo(hx - 0.004, Y(hy + 0.001));
  ctx.lineTo(hx - 0.0095, Y(hy - 0.0015));
  ctx.lineTo(hx - 0.004, Y(hy - 0.002));
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx - 0.0015, Y(hy + 0.0012), 0.0014);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

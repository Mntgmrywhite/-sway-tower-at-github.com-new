import { alpha, circle, hash, ink, mix, outlined, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, EMERALD, EMERALD_DARK, FAR, GOLD, GOLD_LIGHT, GREEN_LIGHT, INK, IVORY, LACQUER, ROSE, SAPPHIRE } from "./colors";

// Across the bay, out on a grassy point at the left: a château-style mansion with a tower on
// one side (Gatsby's "imitation of some Hôtel de Ville in Normandy") throwing a party — every
// window lit, strings of lights swagged across its front, glitter over the roofs — and a
// little dock running out toward us with the green light at its end, its reflection wavering
// on the water. Mid-distance: flat fills hazed a little toward the city, a light outline.
// Everything here stays left of the tower column, in front of the cloud bank.

/** The point runs in from the left edge between these depths, to just short of the column. */
const POINT_FAR = 16;
const POINT_NEAR = 10;
/** How far (u) the point runs back from its tip: just past the poplar beside the house. */
const POINT_LEN = 0.42;
const MANSION_Z = 12.5;
/** The mansion is drawn larger than its depth alone would make it: a grand house. */
const MANSION_SIZE = 1.45;
/** Mansion center, in u left of the screen center. */
const MANSION_DX = -0.36;
/** The dock: from the point's near edge to its end, as screen offsets (u) and depths. */
const DOCK_ROOT_DX = -0.335;
const DOCK_END_DX = -0.3;
const DOCK_ROOT_Z = POINT_NEAR + 0.3;
const DOCK_END_Z = 6.6;
/** Half the dock's width (world units, like the tower's foot at 0.6). */
const DOCK_HALF = 0.05;

/** Mid-distance colors: flat, a little hazed toward the city, with a light outline. */
const HAZE = FAR;
const LAWN = mix(EMERALD_DARK, HAZE, 0.3);
const LAWN_LIT = mix(EMERALD, HAZE, 0.28);
const SEAWALL = mix(IVORY, HAZE, 0.25);
const TREE = mix(EMERALD_DARK, HAZE, 0.42);
const WALL = mix(IVORY, HAZE, 0.12);
const WALL_SHADE = mix(CHAMPAGNE, HAZE, 0.35);
const ROOF = mix(LACQUER, HAZE, 0.3);
const ROOF_LIT = mix(ROOF, GOLD_LIGHT, 0.2);
const MID_INK = mix(INK, HAZE, 0.25);
const LIT = GOLD_LIGHT;
const LIT_DIM = mix(GOLD, HAZE, 0.25);
const DOOR = "#fff6d8";
const DOCK = mix(CHAMPAGNE, HAZE, 0.12);
const PLANKS = mix(CHAMPAGNE, INK, 0.35);
const POSTS = mix(LACQUER, HAZE, 0.2);
const BULBS = [GOLD_LIGHT, ROSE, GREEN_LIGHT, IVORY, SAPPHIRE] as const;
const GREEN_GLOW_OUT = alpha(GREEN_LIGHT, 0.13);
const GREEN_GLOW_IN = alpha(GREEN_LIGHT, 0.26);
const GREEN_REFLECT = alpha(GREEN_LIGHT, 0.8);
const GREEN_CORE = "#eafff2";

/** Mansion massing: [x0, x1, wall top] for the left wing, the main block and the tower (U). */
const WING = [-0.26, -0.15, 0.12] as const;
const MAIN = [-0.15, 0.13, 0.16] as const;
const TOWER = [0.13, 0.24, 0.27] as const;
/** Mansard roof rise over the main block, and the tower's steep roof and finial. */
const MANSARD = 0.075;
const SPIRE = 0.15;
const FINIAL = 0.035;
/** Windows: (x, y) of each window's bottom-left (U); all the same size. */
const WIN_W = 0.026;
const WIN_H = 0.036;
const MANSION_WINDOWS = (() => {
  const out: number[] = [];
  for (const y of [0.025, 0.09]) {
    for (let i = 0; i < 6; i++) if (!(y < 0.05 && (i === 2 || i === 3))) out.push(MAIN[0] + 0.02 + i * 0.044, y);
    for (let i = 0; i < 2; i++) out.push(WING[0] + 0.02 + i * 0.048, y * 0.85);
  }
  for (const y of [0.03, 0.1, 0.17]) out.push(TOWER[0] + 0.042, y);
  return Float32Array.from(out);
})();
/** Dormers on the mansard: x centers (U). */
const DORMERS = [-0.09, -0.01, 0.07] as const;
/** Lights strung across the front, and how many. */
const STRING_BULBS = 13;

function mansion(ctx: Ctx, s: Scene, x: number, y: number, U: number): void {
  const lw = Math.max(1, s.u * 0.0026);
  // Walls
  ctx.beginPath();
  ctx.rect(x + WING[0] * U, y - WING[2] * U, (WING[1] - WING[0]) * U, WING[2] * U);
  ctx.rect(x + MAIN[0] * U, y - MAIN[2] * U, (MAIN[1] - MAIN[0]) * U, MAIN[2] * U);
  ctx.rect(x + TOWER[0] * U, y - TOWER[2] * U, (TOWER[1] - TOWER[0]) * U, TOWER[2] * U);
  ctx.fillStyle = WALL;
  ctx.fill();
  ink(ctx, lw, MID_INK);
  // Shaded plinth
  ctx.fillStyle = WALL_SHADE;
  ctx.fillRect(x + WING[0] * U, y - 0.018 * U, (TOWER[1] - WING[0]) * U, 0.018 * U);
  // Mansard roof over the main block, a balustrade on the wing, the tower's spire
  ctx.beginPath();
  const mt = y - MAIN[2] * U;
  ctx.moveTo(x + (MAIN[0] - 0.008) * U, mt);
  ctx.lineTo(x + (MAIN[0] + 0.03) * U, mt - MANSARD * U);
  ctx.lineTo(x + (MAIN[1] - 0.03) * U, mt - MANSARD * U);
  ctx.lineTo(x + (MAIN[1] + 0.004) * U, mt);
  ctx.closePath();
  const tt = y - TOWER[2] * U;
  const tm = x + ((TOWER[0] + TOWER[1]) / 2) * U;
  ctx.moveTo(x + (TOWER[0] - 0.008) * U, tt);
  ctx.lineTo(tm, tt - SPIRE * U);
  ctx.lineTo(x + (TOWER[1] + 0.008) * U, tt);
  ctx.closePath();
  ctx.rect(x + (WING[0] - 0.004) * U, y - (WING[2] + 0.014) * U, (WING[1] - WING[0] + 0.004) * U, 0.014 * U);
  ctx.fillStyle = ROOF;
  ctx.fill();
  ink(ctx, lw, MID_INK);
  // Chimneys and the finial
  ctx.beginPath();
  ctx.rect(x + (MAIN[0] + 0.05) * U, mt - (MANSARD + 0.03) * U, 0.02 * U, 0.03 * U);
  ctx.rect(x + (MAIN[1] - 0.07) * U, mt - (MANSARD + 0.03) * U, 0.02 * U, 0.03 * U);
  ctx.fillStyle = ROOF_LIT;
  ctx.fill();
  ink(ctx, lw * 0.8, MID_INK);
  ctx.beginPath();
  ctx.moveTo(tm, tt - SPIRE * U);
  ctx.lineTo(tm, tt - (SPIRE + FINIAL) * U);
  ctx.strokeStyle = MID_INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // A pennant on the finial
  ctx.beginPath();
  const fy = tt - (SPIRE + FINIAL) * U;
  const flap = Math.sin(s.t * 5) * 0.004 * U;
  ctx.moveTo(tm, fy);
  ctx.lineTo(tm + 0.05 * U, fy + 0.008 * U + flap);
  ctx.lineTo(tm, fy + 0.018 * U);
  ctx.closePath();
  ctx.fillStyle = EMERALD;
  ctx.fill();
  // Dormers, lit
  ctx.beginPath();
  for (const dx of DORMERS) {
    const dxp = x + dx * U;
    const dy = mt - MANSARD * 0.25 * U;
    ctx.moveTo(dxp - 0.013 * U, dy);
    ctx.lineTo(dxp - 0.013 * U, dy - 0.03 * U);
    ctx.arc(dxp, dy - 0.03 * U, 0.013 * U, Math.PI, 0);
    ctx.lineTo(dxp + 0.013 * U, dy);
    ctx.closePath();
  }
  ctx.fillStyle = LIT;
  ctx.fill();
  // Windows: every one lit for the party, a few flickering as the dancers pass
  const slot = Math.floor(s.t * 3);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < MANSION_WINDOWS.length; i += 2) {
      const dim = hash(i * 1.37 + slot * 0.71) < 0.18;
      if (dim !== (pass === 1)) continue;
      ctx.rect(x + MANSION_WINDOWS[i]! * U, y - (MANSION_WINDOWS[i + 1]! + WIN_H) * U, WIN_W * U, WIN_H * U);
    }
    ctx.fillStyle = pass ? LIT_DIM : LIT;
    ctx.fill();
  }
  // The front door, open and blazing
  ctx.beginPath();
  const dx0 = x + (MAIN[0] + 0.105) * U;
  ctx.moveTo(dx0, y);
  ctx.lineTo(dx0, y - 0.045 * U);
  ctx.arc(dx0 + 0.035 * U, y - 0.045 * U, 0.035 * U, Math.PI, 0);
  ctx.lineTo(dx0 + 0.07 * U, y);
  ctx.closePath();
  ctx.fillStyle = DOOR;
  ctx.fill();
  ink(ctx, lw * 0.8, MID_INK);

  // Strings of party lights swagged across the front, blinking in turn
  const x0 = x + (WING[0] + 0.005) * U;
  const x1 = x + (TOWER[1] - 0.005) * U;
  const y0 = y - 0.135 * U;
  const y2 = y - 0.155 * U;
  const yc = y0 + 0.08 * U;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, yc, x1, y2);
  ctx.strokeStyle = MID_INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  const blink = Math.floor(s.t * 4);
  const br = Math.max(1, U * 0.0095);
  for (let c = 0; c < BULBS.length; c++) {
    ctx.beginPath();
    for (let i = 1; i < STRING_BULBS; i++) {
      if ((i + blink) % BULBS.length !== c) continue;
      const f = i / STRING_BULBS;
      const bx = (1 - f) * (1 - f) * x0 + 2 * f * (1 - f) * ((x0 + x1) / 2) + f * f * x1;
      const by = (1 - f) * (1 - f) * y0 + 2 * f * (1 - f) * yc + f * f * y2;
      circle(ctx, bx, by + br * 0.6, br);
    }
    ctx.fillStyle = BULBS[c]!;
    ctx.fill();
  }

  // Glitter over the roofs: little four-point twinkles coming and going
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const p = (s.t * 0.7 + i * 0.37) % 1;
    if (p > 0.5) continue;
    const r = U * 0.024 * Math.sin((p / 0.5) * Math.PI);
    const gx = x + (WING[0] + hash(i * 3.3 + Math.floor(s.t * 0.7 + i * 0.37) * 0.17) * (TOWER[1] - WING[0])) * U;
    const gy = y - (0.28 + hash(i * 5.1 + 2) * 0.1) * U;
    ctx.moveTo(gx, gy - r);
    ctx.lineTo(gx + r * 0.25, gy - r * 0.25);
    ctx.lineTo(gx + r, gy);
    ctx.lineTo(gx + r * 0.25, gy + r * 0.25);
    ctx.lineTo(gx, gy + r);
    ctx.lineTo(gx - r * 0.25, gy + r * 0.25);
    ctx.lineTo(gx - r, gy);
    ctx.lineTo(gx - r * 0.25, gy - r * 0.25);
    ctx.closePath();
  }
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fill();
}

/** Screen x along the dock at depth z: it runs from its root toward us, angling a little in. */
function dockX(s: Scene, z: number): number {
  const f = (DOCK_ROOT_Z - z) / (DOCK_ROOT_Z - DOCK_END_Z);
  return s.cssW / 2 + (DOCK_ROOT_DX + (DOCK_END_DX - DOCK_ROOT_DX) * f) * s.u;
}

/** The point with its trees, the mansion, the dock and the green light at its end. `ye` is
 *  the terrace's edge: the light's reflection runs down to it. */
export function estate(ctx: Ctx, s: Scene, ye: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const yF = fieldY(s, POINT_FAR);
  const yN = fieldY(s, POINT_NEAR);
  const tip = cx - u * 0.262;
  const lw = Math.max(1, u * 0.0026);
  const r = (yN - yF) * 0.5;

  // The green light's reflection, a wavering column down to the terrace
  const lx = dockX(s, DOCK_END_Z);
  const ly = fieldY(s, DOCK_END_Z);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const f = i / 7;
    const yy = ly + 2 + (ye - ly) * f;
    if (yy > ye - 2) break;
    const w = u * (0.024 - f * 0.012);
    ctx.rect(lx - w / 2 + Math.sin(s.t * 2.2 + i * 1.7) * u * 0.004, yy, w, Math.max(1.2, u * 0.0045));
  }
  ctx.fillStyle = GREEN_REFLECT;
  ctx.fill();

  // The point: from off the left edge on a phone; on a wide screen it ends in a rounded
  // headland of its own just past the poplar, rather than running on as a thin strip.
  const back = Math.max(-4, tip - u * POINT_LEN);
  const round = back > 0 ? r * 2 : 0;
  ctx.beginPath();
  ctx.moveTo(back + round, yF);
  ctx.lineTo(tip - r * 2, yF);
  ctx.quadraticCurveTo(tip, yF, tip, yF + r);
  ctx.quadraticCurveTo(tip, yN, tip - r * 2, yN);
  ctx.lineTo(back + round, yN);
  if (round > 0) {
    ctx.quadraticCurveTo(back, yN, back, yF + r);
    ctx.quadraticCurveTo(back, yF, back + round, yF);
  }
  ctx.closePath();
  ctx.fillStyle = LAWN;
  ctx.fill();
  ctx.fillStyle = LAWN_LIT;
  ctx.fillRect(back + round, yF, tip - r * 2 - back - round, Math.max(1, r * 0.4));
  // Seawall along its near edge
  ctx.beginPath();
  ctx.moveTo(back + round, yN);
  ctx.lineTo(tip - r * 2, yN);
  ctx.quadraticCurveTo(tip, yN, tip, yF + r);
  ctx.strokeStyle = SEAWALL;
  ctx.lineWidth = Math.max(1.5, u * 0.004);
  ctx.stroke();

  // Poplars and round topiary beside the house
  const U = ((u * TOWER_DEPTH) / MANSION_Z) * MANSION_SIZE;
  const mx = cx + MANSION_DX * u;
  const my = fieldY(s, MANSION_Z);
  ctx.beginPath();
  oval(ctx, mx - 0.3 * U, my - 0.12 * U, 0.028 * U, 0.115 * U);
  circle(ctx, mx + 0.29 * U, my - 0.03 * U, 0.03 * U);
  ctx.fillStyle = TREE;
  ctx.fill();
  ink(ctx, lw * 0.8, MID_INK);

  mansion(ctx, s, mx, my, U);

  // The dock: planks on posts, running out toward us
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const z = DOCK_ROOT_Z - 0.4 - i * ((DOCK_ROOT_Z - 0.4 - DOCK_END_Z) / 3);
    const k = TOWER_DEPTH / z;
    const py = fieldY(s, z);
    const px = dockX(s, z);
    const off = (DOCK_HALF * 0.8 * u) / z;
    ctx.rect(px - off - k * u * 0.003, py - 1, k * u * 0.006, k * u * 0.02);
    ctx.rect(px + off - k * u * 0.003, py - 1, k * u * 0.006, k * u * 0.02);
  }
  ctx.fillStyle = POSTS;
  ctx.fill();
  const y0 = fieldY(s, DOCK_ROOT_Z);
  const x0 = dockX(s, DOCK_ROOT_Z);
  const h0 = (DOCK_HALF * u * TOWER_DEPTH) / DOCK_ROOT_Z;
  const h1 = (DOCK_HALF * u * TOWER_DEPTH) / DOCK_END_Z;
  ctx.beginPath();
  ctx.moveTo(x0 - h0, y0);
  ctx.lineTo(x0 + h0, y0);
  ctx.lineTo(lx + h1, ly);
  ctx.lineTo(lx - h1, ly);
  ctx.closePath();
  outlined(ctx, DOCK, lw, MID_INK);
  // Plank seams across it
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    const z = DOCK_ROOT_Z + (DOCK_END_Z - DOCK_ROOT_Z) * f;
    const py = fieldY(s, z);
    const px = dockX(s, z);
    const hw = (DOCK_HALF * u * TOWER_DEPTH) / z;
    ctx.moveTo(px - hw * 0.85, py);
    ctx.lineTo(px + hw * 0.85, py);
  }
  ctx.strokeStyle = PLANKS;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();

  // The green light on its post, with a soft pulse of flat halos
  const k = TOWER_DEPTH / DOCK_END_Z;
  const top = ly - u * 0.07 * k;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx, top);
  ctx.strokeStyle = MID_INK;
  ctx.lineWidth = Math.max(1.5, u * 0.007 * k);
  ctx.stroke();
  const pulse = 1 + 0.1 * Math.sin(s.t * 1.6);
  const lr = Math.max(3, u * 0.022 * k);
  const gy = top - lr * 0.7;
  ctx.beginPath();
  circle(ctx, lx, gy, lr * 3.1 * pulse);
  ctx.fillStyle = GREEN_GLOW_OUT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, lx, gy, lr * 1.9 * pulse);
  ctx.fillStyle = GREEN_GLOW_IN;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, lx, gy, lr);
  outlined(ctx, GREEN_LIGHT, Math.max(1, lw * 0.9), MID_INK);
  ctx.beginPath();
  circle(ctx, lx - lr * 0.3, gy - lr * 0.3, lr * 0.38);
  ctx.fillStyle = GREEN_CORE;
  ctx.fill();
}

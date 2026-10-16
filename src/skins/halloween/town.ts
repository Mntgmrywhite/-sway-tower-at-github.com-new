import { alpha, circle, ink, mix, outlined, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  CANDLE,
  CARVED,
  INK,
  inkW,
  LAMP,
  LAMP_CORE,
  LAMP_DEEP,
  ORANGE,
  ORANGE_DARK,
  spot,
  STEM,
} from "./common";

// The town: two clapboard houses across the street behind the churchyard, one each side of
// the tower, in the bright cartoon style. Steep front gables, a round attic window, lit
// windows with shutters, a porch on two posts with a glowing door and a porch lamp, and
// jack-o'-lanterns lining the steps and the porch. Everything is ink-outlined, flat-filled,
// lit from the upper left. Each house stands on its own field row and keeps clear of the
// tower's column and the screen edges.
//
// Local units: the house's front is 1 wide, x from -0.5 to 0.5, ground at y = 0, up is -y.

interface House {
  /** Field spot (X in u at the tower's depth, z depth) and front width (u at the tower's depth). */
  X: number;
  z: number;
  w: number;
  siding: string;
  roof: string;
  door: string;
  /** Chimney on the left (-1) or right (1) slope. */
  chimney: -1 | 1;
  seed: number;
  /** Siding lit and in shade, derived once. */
  light: string;
  shade: string;
}

function home(h: Omit<House, "light" | "shade">): House {
  return { ...h, light: mix(h.siding, "#ffffff", 0.2), shade: mix(h.siding, INK, 0.22) };
}

const TRIM = "#f6ead2";
const SHUTTER = "#3c2f63";
const PORCH_FLOOR = "#8a6a8f";
const STEP = "#b39ab8";
const BRICK = "#a8574a";
const PANE_GLOW = alpha(LAMP, 0.28);
const POOL = alpha(CANDLE, 0.3);
const LAMP_POOL = alpha(LAMP, 0.25);

const HOUSES: readonly House[] = [
  home({ X: -1.067, z: 8, w: 0.347, siding: "#5c8fd0", roof: "#46377a", door: "#c9433d", chimney: 1, seed: 1 }),
  home({ X: 1.067, z: 8, w: 0.347, siding: "#a073d8", roof: "#3e3172", door: "#2f8a68", chimney: -1, seed: 2 }),
];

/** Jack-o'-lanterns: x, y (feet), radius, in house units. Either side of the steps, and by the posts. */
const LANTERNS = [
  [-0.28, 0, 0.085],
  [0.28, 0, 0.078],
  [-0.42, -0.14, 0.068],
  [0.42, -0.14, 0.068],
] as const;

/** Scratch transform: local house units to the screen. */
const T = { x: 0, y: 0, w: 0 };
const X = (lx: number) => T.x + lx * T.w;
const Y = (ly: number) => T.y + ly * T.w;

function rect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.rect(X(x0), Y(y0), (x1 - x0) * T.w, (y1 - y0) * T.w);
}

/** Windows per house: center x (times the chimney side), center y, width, height. Two up, one down. */
const WINDOWS = [
  [-0.24, -0.8, 0.18, 0.22],
  [0.24, -0.8, 0.18, 0.22],
  [-0.3, -0.3, 0.15, 0.18],
] as const;

/** All of a house's lit windows, batched: shutters, glow, panes, frames and mullions, sills. */
function windows(ctx: Ctx, lw: number, side: number, t: number, seed: number): void {
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) {
    const cx = wx * side;
    rect(ctx, cx - w / 2 - 0.09, cy - h / 2, cx - w / 2 - 0.01, cy + h / 2);
    rect(ctx, cx + w / 2 + 0.01, cy - h / 2, cx + w / 2 + 0.09, cy + h / 2);
  }
  outlined(ctx, SHUTTER, lw * 0.8, INK);
  const flick = 0.92 + 0.08 * Math.sin(t * 2.3 + seed * 1.7);
  ctx.fillStyle = PANE_GLOW;
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) oval(ctx, X(wx * side), Y(cy), w * T.w * 0.95 * flick, h * T.w * 0.8 * flick);
  ctx.fill();
  ctx.fillStyle = LAMP;
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) rect(ctx, wx * side - w / 2, cy - h / 2, wx * side + w / 2, cy);
  ctx.fill();
  ctx.fillStyle = LAMP_CORE;
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) rect(ctx, wx * side - w / 2, cy, wx * side + w / 2, cy + h / 2);
  ctx.fill();
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) {
    const cx = wx * side;
    rect(ctx, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    ctx.moveTo(X(cx), Y(cy - h / 2));
    ctx.lineTo(X(cx), Y(cy + h / 2));
    ctx.moveTo(X(cx - w / 2), Y(cy));
    ctx.lineTo(X(cx + w / 2), Y(cy));
  }
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (const [wx, cy, w, h] of WINDOWS) rect(ctx, wx * side - w / 2 - 0.04, cy + h / 2, wx * side + w / 2 + 0.04, cy + h / 2 + 0.035);
  outlined(ctx, TRIM, lw * 0.7, INK);
}

/** Small jack-o'-lanterns along the porch, batched: shadows, bodies, shade, outlines, faces, stems. */
function lanterns(ctx: Ctx, lw: number, t: number, seed: number): void {
  const flick = 0.5 + 0.5 * Math.sin(t * 8 + seed) * Math.sin(t * 4.7 + seed * 2);
  ctx.fillStyle = POOL;
  ctx.globalAlpha = 0.75 + 0.25 * flick;
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) oval(ctx, X(lx), Y(ly), r * T.w * 1.9, r * T.w * 0.5);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) oval(ctx, X(lx), Y(ly - r * 0.85), r * T.w * 1.18, r * T.w * 0.92);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) {
    const R = r * T.w;
    ctx.moveTo(X(lx) + R * 1.1, Y(ly - r * 0.85));
    ctx.ellipse(X(lx), Y(ly - r * 0.85), R * 1.1, R * 0.82, 0, 0, Math.PI);
  }
  ctx.fill();
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) oval(ctx, X(lx), Y(ly - r * 0.85), r * T.w * 1.18, r * T.w * 0.92);
  ink(ctx, lw * 0.75, INK);
  // Faces: two triangle eyes and a grin, lit by the candle
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) {
    const px = X(lx);
    const py = Y(ly - r * 0.85);
    const R = r * T.w;
    for (let side = -1; side <= 1; side += 2) {
      ctx.moveTo(px + side * R * 0.62, py);
      ctx.lineTo(px + side * R * 0.14, py);
      ctx.lineTo(px + side * R * 0.4, py - R * 0.46);
      ctx.closePath();
    }
    ctx.moveTo(px - R * 0.62, py + R * 0.24);
    ctx.lineTo(px + R * 0.62, py + R * 0.24);
    ctx.quadraticCurveTo(px, py + R * 0.85, px - R * 0.62, py + R * 0.24);
    ctx.closePath();
  }
  ctx.fillStyle = flick > 0.5 ? LAMP_CORE : CANDLE;
  ctx.fill();
  // Stems
  ctx.beginPath();
  for (const [lx, ly, r] of LANTERNS) {
    const px = X(lx);
    const top = Y(ly - r * 1.72);
    const R = r * T.w;
    ctx.moveTo(px - R * 0.14, top + R * 0.12);
    ctx.lineTo(px - R * 0.1, top - R * 0.3);
    ctx.lineTo(px + R * 0.2, top - R * 0.36);
    ctx.lineTo(px + R * 0.14, top + R * 0.12);
    ctx.closePath();
  }
  outlined(ctx, STEM, lw * 0.6, INK);
}

function house(ctx: Ctx, s: Scene, h: House): void {
  const p = spot(s, h.X, h.z);
  T.x = p.x;
  T.y = p.y;
  T.w = h.w * s.u * p.k;
  if (T.y - T.w * 1.7 > s.cssH) return;
  const lw = inkW(s, p.k);
  const t = s.t;
  const shade = h.shade;
  const light = h.light;

  // Chimney behind the roof
  const cx = h.chimney * 0.27;
  ctx.beginPath();
  rect(ctx, cx - 0.06, -1.56, cx + 0.06, -1.18);
  rect(ctx, cx - 0.08, -1.6, cx + 0.08, -1.53);
  outlined(ctx, BRICK, lw, INK);

  // Walls: lit upper left, shaded under the porch roof
  ctx.beginPath();
  rect(ctx, -0.5, -1.06, 0.5, 0);
  ctx.fillStyle = h.siding;
  ctx.fill();
  ctx.fillStyle = light;
  ctx.fillRect(X(-0.5), Y(-1.06), 0.14 * T.w, 0.56 * T.w);
  ctx.fillStyle = shade;
  ctx.fillRect(X(-0.5), Y(-0.48), T.w, 0.48 * T.w);
  ctx.beginPath();
  rect(ctx, -0.5, -1.06, 0.5, 0);
  ink(ctx, lw, INK);

  // Gable: siding triangle under a thick shingled roof band with cream bargeboards
  ctx.beginPath();
  ctx.moveTo(X(-0.5), Y(-1.04));
  ctx.lineTo(X(0), Y(-1.5));
  ctx.lineTo(X(0.5), Y(-1.04));
  ctx.closePath();
  ctx.fillStyle = h.siding;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.64), Y(-0.98));
  ctx.lineTo(X(0), Y(-1.64));
  ctx.lineTo(X(0.64), Y(-0.98));
  ctx.lineTo(X(0.5), Y(-0.98));
  ctx.lineTo(X(0), Y(-1.46));
  ctx.lineTo(X(-0.5), Y(-0.98));
  ctx.closePath();
  outlined(ctx, h.roof, lw, INK);
  ctx.beginPath();
  ctx.moveTo(X(-0.56), Y(-1.0));
  ctx.lineTo(X(0), Y(-1.52));
  ctx.lineTo(X(0.56), Y(-1.0));
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = Math.max(1, 0.035 * T.w);
  ctx.lineJoin = "round";
  ctx.stroke();

  // Round attic window, glowing orange, with a jack-o'-lantern grinning out of it
  ctx.beginPath();
  circle(ctx, X(0), Y(-1.2), 0.095 * T.w);
  outlined(ctx, LAMP_DEEP, lw * 0.8, INK);
  ctx.beginPath();
  for (let sd = -1; sd <= 1; sd += 2) {
    ctx.moveTo(X(sd * 0.065), Y(-1.21));
    ctx.lineTo(X(sd * 0.015), Y(-1.21));
    ctx.lineTo(X(sd * 0.04), Y(-1.255));
    ctx.closePath();
  }
  ctx.moveTo(X(-0.06), Y(-1.18));
  ctx.lineTo(X(0.06), Y(-1.18));
  ctx.quadraticCurveTo(X(0), Y(-1.12), X(-0.06), Y(-1.18));
  ctx.closePath();
  ctx.fillStyle = CARVED;
  ctx.fill();

  // Lit windows: two upstairs, one beside the door
  const side = h.chimney;
  windows(ctx, lw, side, t, h.seed);

  // Downstairs: a window beside the door, and the door glowing through its glass
  const dx = 0;
  ctx.beginPath();
  rect(ctx, dx - 0.11, -0.46, dx + 0.11, -0.12);
  outlined(ctx, h.door, lw, INK);
  ctx.fillStyle = LAMP;
  ctx.fillRect(X(dx - 0.06), Y(-0.41), 0.12 * T.w, 0.11 * T.w);

  // Porch: floor, two posts, a railing, and a shed roof
  ctx.beginPath();
  rect(ctx, -0.6, -0.14, 0.6, -0.08);
  outlined(ctx, PORCH_FLOOR, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const bx = -0.52 + i * 0.045;
    if (Math.abs(bx - dx) < 0.16) continue;
    ctx.moveTo(X(bx), Y(-0.14));
    ctx.lineTo(X(bx), Y(-0.3));
  }
  for (let i = 0; i < 7; i++) {
    const bx = 0.52 - i * 0.045;
    if (Math.abs(bx - dx) < 0.16) continue;
    ctx.moveTo(X(bx), Y(-0.14));
    ctx.lineTo(X(bx), Y(-0.3));
  }
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = Math.max(0.8, 0.018 * T.w);
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, -0.55, -0.32, dx - 0.16, -0.29);
  rect(ctx, dx + 0.16, -0.32, 0.55, -0.29);
  rect(ctx, -0.56, -0.5, -0.5, -0.14);
  rect(ctx, 0.5, -0.5, 0.56, -0.14);
  outlined(ctx, TRIM, lw * 0.7, INK);
  ctx.beginPath();
  ctx.moveTo(X(-0.66), Y(-0.48));
  ctx.lineTo(X(-0.62), Y(-0.58));
  ctx.lineTo(X(0.62), Y(-0.58));
  ctx.lineTo(X(0.66), Y(-0.48));
  ctx.closePath();
  outlined(ctx, h.roof, lw, INK);
  ctx.beginPath();
  rect(ctx, -0.66, -0.5, 0.66, -0.46);
  outlined(ctx, TRIM, lw * 0.7, INK);

  // Porch lamp by the door, with its pool of light
  const lx = side * 0.21;
  const flick = 0.9 + 0.1 * Math.sin(t * 5 + h.seed);
  ctx.fillStyle = LAMP_POOL;
  ctx.beginPath();
  circle(ctx, X(lx), Y(-0.38), 0.09 * T.w * flick);
  ctx.fill();
  ctx.fillStyle = LAMP_CORE;
  ctx.beginPath();
  oval(ctx, X(lx), Y(-0.38), 0.025 * T.w, 0.035 * T.w);
  ctx.fill();

  // Steps down to the path
  ctx.beginPath();
  rect(ctx, dx - 0.15, -0.08, dx + 0.15, -0.04);
  rect(ctx, dx - 0.18, -0.04, dx + 0.18, 0);
  outlined(ctx, STEP, lw * 0.8, INK);

  lanterns(ctx, lw, t, h.seed);
}

export function town(ctx: Ctx, s: Scene): void {
  for (const h of HOUSES) house(ctx, s, h);
}

import { alpha, circle, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";

// The far layer: faded rolling farm hills, and a farm standing on the horizon behind the cloud
// bank (silo and barn on the left, windmill and farmhouse on the right). Flat silhouettes with
// no outlines, a little darker than the sunset sky, with a few warm lit windows.

const TAU = Math.PI * 2;

const FAR = PALETTE.far;
/** The ridge behind the farm, hazier still. */
const FAR_BACK = mix(FAR, PALETTE.skyBottom, 0.42);
/** Faint lighter details: barn trim, silo bands, plowed rows. */
const TRIM = mix(FAR, "#ffffff", 0.2);
const WINDOW = "#ffd98a";

/** Ridge heights in u at fraction fx of the width: rolling, higher toward the sides. */
function backHill(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.15 + 0.1 * side * side + 0.03 * Math.sin(fx * 8.2 + 0.4) + 0.012 * Math.sin(fx * 19 + 1.3);
}

function frontHill(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.105 + 0.07 * side * side + 0.018 * Math.sin(fx * 11 + 2.1);
}

const HILL_STEPS = 48;

function hillPath(ctx: Ctx, s: Scene, h: (fx: number) => number): void {
  const hy = s.horizonY;
  ctx.beginPath();
  ctx.moveTo(-4, hy + 2);
  for (let i = 0; i <= HILL_STEPS; i++) {
    const fx = i / HILL_STEPS;
    ctx.lineTo(fx * s.cssW, hy - h(fx) * s.u);
  }
  ctx.lineTo(s.cssW + 4, hy + 2);
  ctx.closePath();
}

/** Plowed furrows on the near hills, as fractions of the ridge height. */
const ROWS = [0.82, 0.64, 0.46] as const;

function hills(ctx: Ctx, s: Scene): void {
  hillPath(ctx, s, backHill);
  ctx.fillStyle = FAR_BACK;
  ctx.fill();
  hillPath(ctx, s, frontHill);
  ctx.fillStyle = FAR;
  ctx.fill();

  ctx.beginPath();
  for (const f of ROWS) {
    for (let i = 0; i <= HILL_STEPS; i++) {
      const fx = i / HILL_STEPS;
      const y = s.horizonY - frontHill(fx) * s.u * f;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(fx * s.cssW, y);
    }
  }
  ctx.strokeStyle = alpha(TRIM, 0.45);
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.stroke();
}

/** Gambrel-roofed barn standing on the horizon, centered at bx. */
function barn(ctx: Ctx, s: Scene, bx: number): void {
  const by = s.horizonY;
  const w = s.u * 0.19;
  const h = s.u * 0.25;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.5, by);
  ctx.lineTo(bx - w * 0.5, by - h * 0.55);
  ctx.lineTo(bx - w * 0.57, by - h * 0.53);
  ctx.lineTo(bx - w * 0.4, by - h * 0.85);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(bx + w * 0.4, by - h * 0.85);
  ctx.lineTo(bx + w * 0.57, by - h * 0.53);
  ctx.lineTo(bx + w * 0.5, by - h * 0.55);
  ctx.lineTo(bx + w * 0.5, by);
  ctx.closePath();
  ctx.fillStyle = FAR;
  ctx.fill();

  // Faint trim: eave line and the hay-loft door, with a warm lit window above it.
  const lw = Math.max(1, s.u * 0.004);
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.5, by - h * 0.55);
  ctx.lineTo(bx + w * 0.5, by - h * 0.55);
  ctx.rect(bx - w * 0.13, by - h * 0.5, w * 0.26, h * 0.3);
  ctx.moveTo(bx - w * 0.13, by - h * 0.5);
  ctx.lineTo(bx + w * 0.13, by - h * 0.2);
  ctx.moveTo(bx + w * 0.13, by - h * 0.5);
  ctx.lineTo(bx - w * 0.13, by - h * 0.2);
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = WINDOW;
  ctx.fillRect(bx - w * 0.07, by - h * 0.8, w * 0.14, h * 0.12);
}

/** Tall silo with a domed cap, standing on the horizon. */
function silo(ctx: Ctx, s: Scene, x: number): void {
  const by = s.horizonY;
  const w = s.u * 0.065;
  const h = s.u * 0.34;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, by);
  ctx.lineTo(x - w / 2, by - h);
  ctx.arc(x, by - h, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, by);
  ctx.closePath();
  ctx.rect(x - s.u * 0.003, by - h - w * 0.75, s.u * 0.006, w * 0.3);
  ctx.fillStyle = FAR;
  ctx.fill();

  ctx.beginPath();
  for (let i = 1; i <= 5; i++) {
    const y = by - (h * i) / 6;
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
  }
  ctx.strokeStyle = alpha(TRIM, 0.7);
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.stroke();
  ctx.fillStyle = WINDOW;
  ctx.fillRect(x - w * 0.14, by - h * 0.93, w * 0.28, w * 0.34);
}

/** Farm windmill: a tapering lattice tower and a turning fan wheel with a tail vane. */
function windmill(ctx: Ctx, s: Scene, x: number): void {
  const by = s.horizonY;
  const H = s.u * 0.36;
  const bw = s.u * 0.045;
  const tw = s.u * 0.01;
  const widthAt = (f: number) => bw + (tw - bw) * f;
  const lw = Math.max(1.2, s.u * 0.005);

  ctx.beginPath();
  ctx.moveTo(x - bw, by);
  ctx.lineTo(x - tw, by - H);
  ctx.moveTo(x + bw, by);
  ctx.lineTo(x + tw, by - H);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const f0 = i / n;
    const f1 = (i + 1) / n;
    const y0 = by - H * f0;
    const y1 = by - H * f1;
    ctx.moveTo(x - widthAt(f0), y0);
    ctx.lineTo(x + widthAt(f1), y1);
    ctx.moveTo(x + widthAt(f0), y0);
    ctx.lineTo(x - widthAt(f1), y1);
    ctx.moveTo(x - widthAt(f1), y1);
    ctx.lineTo(x + widthAt(f1), y1);
  }
  ctx.strokeStyle = FAR;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.stroke();

  // Tail vane on a boom, and the fan: wedge blades with sky between them, a hub and a rim.
  const cy = by - H - s.u * 0.006;
  const R = s.u * 0.085;
  ctx.beginPath();
  ctx.moveTo(x + R * 0.9, cy - R * 0.05);
  ctx.lineTo(x + R * 1.5, cy - R * 0.36);
  ctx.lineTo(x + R * 1.5, cy + R * 0.14);
  ctx.lineTo(x + R * 0.9, cy + R * 0.05);
  ctx.closePath();
  const spin = s.t * 1.1;
  const blades = 12;
  for (let b = 0; b < blades; b++) {
    const a = spin + (b * TAU) / blades;
    const da = 0.14;
    const r0 = R * 0.25;
    ctx.moveTo(x + Math.cos(a - da * 0.4) * r0, cy + Math.sin(a - da * 0.4) * r0);
    ctx.lineTo(x + Math.cos(a - da) * R, cy + Math.sin(a - da) * R);
    ctx.lineTo(x + Math.cos(a + da) * R, cy + Math.sin(a + da) * R);
    ctx.lineTo(x + Math.cos(a + da * 0.4) * r0, cy + Math.sin(a + da * 0.4) * r0);
    ctx.closePath();
  }
  circle(ctx, x, cy, R * 0.2);
  ctx.fillStyle = FAR;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, cy, R);
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Small farmhouse with a gable roof, a chimney and lit windows. */
function farmhouse(ctx: Ctx, s: Scene, x: number): void {
  const by = s.horizonY;
  const w = s.u * 0.14;
  const h = s.u * 0.2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, by);
  ctx.lineTo(x - w * 0.5, by - h * 0.58);
  ctx.lineTo(x - w * 0.6, by - h * 0.55);
  ctx.lineTo(x, by - h);
  ctx.lineTo(x + w * 0.6, by - h * 0.55);
  ctx.lineTo(x + w * 0.5, by - h * 0.58);
  ctx.lineTo(x + w * 0.5, by);
  ctx.closePath();
  ctx.rect(x + w * 0.2, by - h * 1.0, w * 0.12, h * 0.3);
  ctx.fillStyle = FAR;
  ctx.fill();
  ctx.fillStyle = WINDOW;
  ctx.fillRect(x - w * 0.3, by - h * 0.48, w * 0.15, h * 0.14);
  ctx.fillRect(x + w * 0.12, by - h * 0.48, w * 0.15, h * 0.14);
  ctx.fillRect(x - w * 0.06, by - h * 0.8, w * 0.12, h * 0.1);
}

export function farm(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.5 > s.cssH) return;
  hills(ctx, s);
  const W = s.cssW;
  // The cloud bank piles high at the sides, so the farm gathers toward the middle to peek over it.
  silo(ctx, s, W * 0.17);
  barn(ctx, s, W * 0.3);
  farmhouse(ctx, s, W * 0.53);
  windmill(ctx, s, W * 0.8);
}

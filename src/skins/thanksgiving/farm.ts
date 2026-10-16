import { alpha, circle, mix, neonShape, neonStroke, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";

// The far layer: rolling farm hills on the horizon, and a farm standing on the horizon line
// (silo and red barn on the left, windmill and farmhouse on the right), all dark silhouettes
// with neon rims and warm lit windows. Nothing here sits in the tower's column.

const TAU = Math.PI * 2;

const HILL_BACK_FILL = "#1e0a1c";
const HILL_BACK_RIM = "#b8467c";
const HILL_FRONT_FILL = "#140509";
const HILL_FRONT_RIM = "#ff7a1f";
const CRIMSON = "#ff3348";
const CREAM = "#ffe2b0";
const GOLD = "#ffc23a";
const AMBER = "#ffa62b";
const WINDOW = "#ffcf5c";
const WINDOW_HOT = mix(WINDOW, "#ffffff", 0.5);
/** Weathered amber for the windmill lattice and tail vane. */
const LATTICE = mix(AMBER, "#5a1a10", 0.25);

/** Hill heights in units of u at fraction fx of the screen width. Low in the middle, where the moon rises. */
function backHill(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.035 + 0.12 * side * side + 0.02 * Math.sin(fx * 9.4 + 0.7) + 0.01 * Math.sin(fx * 23 + 2);
}

function frontHill(fx: number): number {
  const side = Math.abs(fx - 0.55) * 2;
  return 0.016 + 0.045 * side * side + 0.01 * Math.sin(fx * 13 + 2.1);
}

/** Plowed rows on the near hills, as fractions of the ridge height. */
const ROWS = [0.66, 0.36] as const;
const HILL_STEPS = 40;

function hillPath(ctx: Ctx, s: Scene, h: (fx: number) => number): void {
  const hy = s.horizonY;
  ctx.beginPath();
  ctx.moveTo(-4, hy + 1);
  for (let i = 0; i <= HILL_STEPS; i++) {
    const fx = i / HILL_STEPS;
    ctx.lineTo(fx * s.cssW, hy - h(fx) * s.u);
  }
  ctx.lineTo(s.cssW + 4, hy + 1);
  ctx.closePath();
}

function hills(ctx: Ctx, s: Scene): void {
  const lw = Math.max(1, s.u * 0.0032);
  hillPath(ctx, s, backHill);
  neonShape(ctx, HILL_BACK_FILL, HILL_BACK_RIM, lw * 0.9);

  hillPath(ctx, s, frontHill);
  neonShape(ctx, HILL_FRONT_FILL, HILL_FRONT_RIM, lw);

  // Plowed rows following the near ridge, fading toward the horizon.
  ctx.beginPath();
  for (const f of ROWS) {
    for (let i = 0; i <= HILL_STEPS; i++) {
      const fx = i / HILL_STEPS;
      const y = s.horizonY - frontHill(fx) * s.u * f;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(fx * s.cssW, y);
    }
  }
  ctx.strokeStyle = alpha(HILL_FRONT_RIM, 0.32);
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
}

function litWindow(ctx: Ctx, x: number, y: number, w: number, h: number, lw: number): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fillStyle = WINDOW;
  ctx.fill();
  ctx.strokeStyle = alpha(WINDOW, 0.28);
  ctx.lineWidth = lw * 3.5;
  ctx.stroke();
  ctx.strokeStyle = WINDOW_HOT;
  ctx.lineWidth = Math.max(0.6, lw * 0.5);
  ctx.stroke();
}

/** Gambrel-roofed barn standing on the horizon, centered at bx. */
function barn(ctx: Ctx, s: Scene, bx: number, lw: number): void {
  const by = s.horizonY;
  const w = s.u * 0.15;
  const h = s.u * 0.135;
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
  neonShape(ctx, "#240609", CRIMSON, lw);

  // White trim: big door with an X brace, eave line.
  const dw = w * 0.36;
  const dh = h * 0.4;
  ctx.beginPath();
  ctx.rect(bx - dw / 2, by - dh, dw, dh);
  ctx.moveTo(bx - dw / 2, by - dh);
  ctx.lineTo(bx + dw / 2, by);
  ctx.moveTo(bx + dw / 2, by - dh);
  ctx.lineTo(bx - dw / 2, by);
  ctx.moveTo(bx, by - dh);
  ctx.lineTo(bx, by);
  ctx.moveTo(bx - w * 0.5, by - h * 0.55);
  ctx.lineTo(bx + w * 0.5, by - h * 0.55);
  neonStroke(ctx, CREAM, lw * 0.6, 2.4);

  litWindow(ctx, bx - w * 0.08, by - h * 0.8, w * 0.16, h * 0.15, lw);
}

/** Tall silo with a domed cap, standing on the horizon. */
function silo(ctx: Ctx, s: Scene, x: number, lw: number): void {
  const by = s.horizonY;
  const w = s.u * 0.052;
  const h = s.u * 0.19;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, by);
  ctx.lineTo(x - w / 2, by - h);
  ctx.arc(x, by - h, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, by);
  ctx.closePath();
  neonShape(ctx, "#1d1006", GOLD, lw);

  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const y = by - (h * i) / 5;
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
  }
  ctx.moveTo(x, by - h - w / 2);
  ctx.lineTo(x, by - h - w * 0.75);
  ctx.strokeStyle = alpha(GOLD, 0.45);
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  litWindow(ctx, x - w * 0.12, by - h * 0.9, w * 0.24, w * 0.3, lw * 0.7);
}

/** Farm windmill: lattice tower and a turning fan wheel. */
function windmill(ctx: Ctx, s: Scene, x: number, lw: number): void {
  const by = s.horizonY;
  const H = s.u * 0.28;
  const bw = s.u * 0.042;
  const tw = s.u * 0.009;
  const widthAt = (f: number) => bw + (tw - bw) * f;

  ctx.beginPath();
  ctx.moveTo(x - bw, by);
  ctx.lineTo(x - tw, by - H);
  ctx.moveTo(x + bw, by);
  ctx.lineTo(x + tw, by - H);
  const n = 5;
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
  neonStroke(ctx, LATTICE, lw * 0.75, 2.6);

  // Tail vane behind the wheel: a plate on a boom, widening away from the rim it hangs off.
  const cy = by - H - s.u * 0.006;
  const R = s.u * 0.082;
  ctx.beginPath();
  ctx.moveTo(x + R * 1.04, cy - R * 0.05);
  ctx.lineTo(x + R * 1.5, cy - R * 0.3);
  ctx.lineTo(x + R * 1.5, cy + R * 0.12);
  ctx.lineTo(x + R * 1.04, cy + R * 0.05);
  ctx.closePath();
  ctx.moveTo(x + R * 0.9, cy);
  ctx.lineTo(x + R * 1.5, cy - R * 0.09);
  neonShape(ctx, "#1d0c06", LATTICE, lw * 0.7);

  // Fan: blades as thin wedges, so they read as slats with sky between them.
  const spin = s.t * 1.3;
  const blades = 14;
  ctx.beginPath();
  for (let b = 0; b < blades; b++) {
    const a = spin + (b * TAU) / blades;
    const da = 0.13;
    const r0 = R * 0.3;
    ctx.moveTo(x + Math.cos(a - da * 0.4) * r0, cy + Math.sin(a - da * 0.4) * r0);
    ctx.lineTo(x + Math.cos(a - da) * R, cy + Math.sin(a - da) * R);
    ctx.lineTo(x + Math.cos(a + da) * R, cy + Math.sin(a + da) * R);
    ctx.lineTo(x + Math.cos(a + da * 0.4) * r0, cy + Math.sin(a + da * 0.4) * r0);
    ctx.closePath();
  }
  neonShape(ctx, "#2a1206", AMBER, lw * 0.75);
  ctx.beginPath();
  circle(ctx, x, cy, R * 0.18);
  ctx.moveTo(x + R * 1.02, cy);
  ctx.arc(x, cy, R * 1.02, 0, TAU);
  neonStroke(ctx, GOLD, lw * 0.8, 2.6);
}

/** Small farmhouse with a gable roof and lit windows. */
function farmhouse(ctx: Ctx, s: Scene, x: number, lw: number): void {
  const by = s.horizonY;
  const w = s.u * 0.12;
  const h = s.u * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, by);
  ctx.lineTo(x - w * 0.5, by - h * 0.55);
  ctx.lineTo(x - w * 0.58, by - h * 0.52);
  ctx.lineTo(x, by - h);
  ctx.lineTo(x + w * 0.58, by - h * 0.52);
  ctx.lineTo(x + w * 0.5, by - h * 0.55);
  ctx.lineTo(x + w * 0.5, by);
  ctx.closePath();
  // Chimney
  ctx.moveTo(x + w * 0.22, by - h * 0.75);
  ctx.lineTo(x + w * 0.22, by - h * 0.98);
  ctx.lineTo(x + w * 0.32, by - h * 0.98);
  ctx.lineTo(x + w * 0.32, by - h * 0.67);
  neonShape(ctx, "#1b0812", "#ff8a3d", lw);
  litWindow(ctx, x - w * 0.34, by - h * 0.42, w * 0.16, h * 0.18, lw * 0.8);
  litWindow(ctx, x + w * 0.1, by - h * 0.42, w * 0.16, h * 0.18, lw * 0.8);
  litWindow(ctx, x - w * 0.05, by - h * 0.78, w * 0.1, h * 0.12, lw * 0.6);
}

export function farm(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.45 > s.cssH) return;
  const lw = Math.max(1, s.u * 0.0034);
  hills(ctx, s);
  const W = s.cssW;
  silo(ctx, s, W * 0.055, lw);
  barn(ctx, s, W * 0.165, lw);
  farmhouse(ctx, s, W * 0.975, lw);
  windmill(ctx, s, W * 0.855, lw);
}

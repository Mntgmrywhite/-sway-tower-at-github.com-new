import { circle, oval, type Ctx } from "../../neon/draw";
import type { Icon } from "../skin";
import { starPath } from "./shapes";

// Neon line-art symbols for the Christmas bars. Each is centered at (cx, cy) and about
// `s` pixels tall, drawn with the stroke/fill style the bar sets. Bars are short, so the
// shapes stay bold and simple enough to read at ~13px.

export const snowflake: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.5;
  const b = s * 0.27;
  const bl = s * 0.16;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * r, cy + dy * r);
    const bx = cx + dx * b;
    const by = cy + dy * b;
    ctx.moveTo(bx + Math.cos(a - 0.85) * bl, by + Math.sin(a - 0.85) * bl);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + Math.cos(a + 0.85) * bl, by + Math.sin(a + 0.85) * bl);
  }
  ctx.stroke();
};

export const candyCane: Icon = (ctx, cx, cy, s) => {
  const x = cx + s * 0.13;
  const r = s * 0.2;
  const top = cy - s * 0.24;
  ctx.beginPath();
  ctx.moveTo(x, cy + s * 0.5);
  ctx.lineTo(x, top);
  ctx.arc(x - r, top, r, 0, Math.PI, true);
  ctx.lineTo(x - r * 2, top + s * 0.14);
  // A thicker tube, dim underneath with bright stripes on top.
  ctx.save();
  ctx.lineWidth *= 1.6;
  ctx.globalAlpha *= 0.4;
  ctx.stroke();
  ctx.globalAlpha /= 0.4;
  ctx.lineCap = "butt";
  ctx.setLineDash([s * 0.13, s * 0.1]);
  ctx.stroke();
  ctx.restore();
};

export const ornament: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.36;
  const y = cy + s * 0.1;
  ctx.beginPath();
  circle(ctx, cx, y, r);
  ctx.rect(cx - s * 0.1, y - r - s * 0.12, s * 0.2, s * 0.12);
  // Zigzag band
  const a = s * 0.08;
  ctx.moveTo(cx - r * 0.96, y - a);
  for (let i = 1; i <= 6; i++) ctx.lineTo(cx - r * 0.96 + (i * r * 1.92) / 6, y + (i % 2 ? a : -a));
  ctx.stroke();
};

export const tree: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.36, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.36, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.12);
  ctx.lineTo(cx - s * 0.22, cy - s * 0.12);
  ctx.closePath();
  ctx.moveTo(cx, cy + s * 0.28);
  ctx.lineTo(cx, cy + s * 0.48);
  ctx.stroke();
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  starPath(ctx, cx, cy + s * 0.05, s * 0.52, 0.42);
  ctx.stroke();
};

export const gift: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.rect(cx - s * 0.32, cy - s * 0.04, s * 0.64, s * 0.48);
  ctx.rect(cx - s * 0.38, cy - s * 0.18, s * 0.76, s * 0.14);
  ctx.moveTo(cx, cy - s * 0.18);
  ctx.lineTo(cx, cy + s * 0.44);
  oval(ctx, cx - s * 0.14, cy - s * 0.3, s * 0.14, s * 0.08, 0.35);
  oval(ctx, cx + s * 0.14, cy - s * 0.3, s * 0.14, s * 0.08, -0.35);
  ctx.stroke();
};

export const bell: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy + s * 0.26);
  ctx.quadraticCurveTo(cx - s * 0.25, cy + s * 0.16, cx - s * 0.25, cy - s * 0.04);
  ctx.bezierCurveTo(cx - s * 0.25, cy - s * 0.44, cx + s * 0.25, cy - s * 0.44, cx + s * 0.25, cy - s * 0.04);
  ctx.quadraticCurveTo(cx + s * 0.25, cy + s * 0.16, cx + s * 0.4, cy + s * 0.26);
  ctx.closePath();
  ctx.moveTo(cx, cy - s * 0.34);
  ctx.lineTo(cx, cy - s * 0.47);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy + s * 0.38, s * 0.09);
  ctx.fill();
};

/** A holly leaf from its base (bx, by) to its tip (tx, ty), `w` half wide, with a vein. */
function leaf(ctx: Ctx, bx: number, by: number, tx: number, ty: number, w: number): void {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  // Scalloped edges: three points per side, pulled in between.
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + dx * 0.15 + nx * 1.1, by + dy * 0.15 + ny * 1.1, bx + dx * 0.35 + nx * 1.05, by + dy * 0.35 + ny * 1.05);
  ctx.quadraticCurveTo(bx + dx * 0.5 + nx * 0.7, by + dy * 0.5 + ny * 0.7, bx + dx * 0.68 + nx * 0.95, by + dy * 0.68 + ny * 0.95);
  ctx.quadraticCurveTo(bx + dx * 0.85 + nx * 0.5, by + dy * 0.85 + ny * 0.5, tx, ty);
  ctx.quadraticCurveTo(bx + dx * 0.85 - nx * 0.5, by + dy * 0.85 - ny * 0.5, bx + dx * 0.68 - nx * 0.95, by + dy * 0.68 - ny * 0.95);
  ctx.quadraticCurveTo(bx + dx * 0.5 - nx * 0.7, by + dy * 0.5 - ny * 0.7, bx + dx * 0.35 - nx * 1.05, by + dy * 0.35 - ny * 1.05);
  ctx.quadraticCurveTo(bx + dx * 0.15 - nx * 1.1, by + dy * 0.15 - ny * 1.1, bx, by);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + dx * 0.8, by + dy * 0.8);
}

export const holly: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  leaf(ctx, cx - s * 0.06, cy + s * 0.1, cx - s * 0.52, cy - s * 0.12, s * 0.17);
  leaf(ctx, cx + s * 0.06, cy + s * 0.1, cx + s * 0.5, cy - s * 0.3, s * 0.17);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx - s * 0.1, cy + s * 0.2, s * 0.11);
  circle(ctx, cx + s * 0.12, cy + s * 0.22, s * 0.11);
  circle(ctx, cx + s * 0.01, cy + s * 0.39, s * 0.11);
  ctx.fill();
};

export const stocking: Icon = (ctx, cx, cy, s) => {
  const x = cx - s * 0.06;
  ctx.beginPath();
  ctx.rect(x - s * 0.23, cy - s * 0.48, s * 0.46, s * 0.16);
  ctx.moveTo(x - s * 0.17, cy - s * 0.32);
  ctx.lineTo(x - s * 0.17, cy + s * 0.08);
  ctx.quadraticCurveTo(x - s * 0.19, cy + s * 0.46, x + s * 0.12, cy + s * 0.46);
  ctx.lineTo(x + s * 0.26, cy + s * 0.46);
  ctx.quadraticCurveTo(x + s * 0.46, cy + s * 0.44, x + s * 0.44, cy + s * 0.28);
  ctx.quadraticCurveTo(x + s * 0.42, cy + s * 0.13, x + s * 0.22, cy + s * 0.12);
  ctx.lineTo(x + s * 0.17, cy + s * 0.1);
  ctx.lineTo(x + s * 0.17, cy - s * 0.32);
  ctx.stroke();
};

export const gingerbread: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy - s * 0.32, s * 0.15);
  ctx.moveTo(cx - s * 0.09, cy - s * 0.17);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.13);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.01);
  ctx.lineTo(cx - s * 0.14, cy);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.44);
  ctx.lineTo(cx - s * 0.11, cy + s * 0.47);
  ctx.lineTo(cx, cy + s * 0.24);
  ctx.lineTo(cx + s * 0.11, cy + s * 0.47);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.44);
  ctx.lineTo(cx + s * 0.14, cy);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.01);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.13);
  ctx.lineTo(cx + s * 0.09, cy - s * 0.17);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy - s * 0.05, s * 0.055);
  circle(ctx, cx, cy + s * 0.11, s * 0.055);
  ctx.fill();
};

export const wreath: Icon = (ctx, cx, cy, s) => {
  const y = cy - s * 0.05;
  ctx.beginPath();
  circle(ctx, cx, y, s * 0.4);
  circle(ctx, cx, y, s * 0.25);
  ctx.stroke();
  // Berries on the ring and a bow at the bottom
  ctx.beginPath();
  circle(ctx, cx - s * 0.3, y - s * 0.14, s * 0.065);
  circle(ctx, cx + s * 0.25, y - s * 0.24, s * 0.065);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, cx - s * 0.15, y + s * 0.38, s * 0.15, s * 0.09, -0.35);
  oval(ctx, cx + s * 0.15, y + s * 0.38, s * 0.15, s * 0.09, 0.35);
  ctx.moveTo(cx - s * 0.04, y + s * 0.42);
  ctx.lineTo(cx - s * 0.14, y + s * 0.56);
  ctx.moveTo(cx + s * 0.04, y + s * 0.42);
  ctx.lineTo(cx + s * 0.14, y + s * 0.56);
  ctx.stroke();
};

export const mitten: Icon = (ctx, cx, cy, s) => {
  const x = cx + s * 0.02;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, cy + s * 0.24);
  ctx.lineTo(x - s * 0.2, cy + s * 0.02);
  ctx.lineTo(x - s * 0.34, cy - s * 0.06);
  ctx.quadraticCurveTo(x - s * 0.46, cy - s * 0.2, x - s * 0.32, cy - s * 0.26);
  ctx.lineTo(x - s * 0.2, cy - s * 0.14);
  ctx.lineTo(x - s * 0.2, cy - s * 0.24);
  ctx.bezierCurveTo(x - s * 0.2, cy - s * 0.52, x + s * 0.26, cy - s * 0.52, x + s * 0.26, cy - s * 0.24);
  ctx.lineTo(x + s * 0.26, cy + s * 0.24);
  ctx.rect(x - s * 0.25, cy + s * 0.24, s * 0.56, s * 0.22);
  ctx.stroke();
};

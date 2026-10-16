import { circle } from "../base/draw";
import type { Icon } from "./skin";

// Simple geometric symbols shared by the Classic and Neon skins.

const TAU = Math.PI * 2;

export const triangle: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.45, cy + s * 0.38);
  ctx.lineTo(cx - s * 0.45, cy + s * 0.38);
  ctx.closePath();
  ctx.stroke();
};

export const ring: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.4);
  ctx.stroke();
};

export const square: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.rect(cx - s * 0.36, cy - s * 0.36, s * 0.72, s * 0.72);
  ctx.stroke();
};

export const diamond: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.4, cy);
  ctx.lineTo(cx, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.4, cy);
  ctx.closePath();
  ctx.stroke();
};

export const cross: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.35, cy + s * 0.35);
  ctx.moveTo(cx + s * 0.35, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.35);
  ctx.stroke();
};

export const chevron: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const dx of [-0.2, 0.15]) {
    ctx.moveTo(cx + s * (dx - 0.15), cy - s * 0.38);
    ctx.lineTo(cx + s * (dx + 0.15), cy);
    ctx.lineTo(cx + s * (dx - 0.15), cy + s * 0.38);
  }
  ctx.stroke();
};

export const bolt: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.05);
  ctx.lineTo(cx + s * 0.05, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.5);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.08);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.08);
  ctx.closePath();
  ctx.stroke();
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? s * 0.2 : s * 0.48;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
};

export const hexagon: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    const x = cx + Math.cos(a) * s * 0.44;
    const y = cy + Math.sin(a) * s * 0.44;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
};

export const plus: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.42);
  ctx.lineTo(cx, cy + s * 0.42);
  ctx.moveTo(cx - s * 0.42, cy);
  ctx.lineTo(cx + s * 0.42, cy);
  ctx.stroke();
};

export const wave: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const x = cx - s * 0.5 + (i / 16) * s;
    const y = cy + Math.sin((i / 16) * TAU) * s * 0.25;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

export const dots: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const [dx, dy] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ] as const) {
    circle(ctx, cx + dx * s, cy + dy * s, s * 0.09);
  }
  ctx.fill();
};

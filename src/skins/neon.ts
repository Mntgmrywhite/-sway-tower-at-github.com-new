import { circle } from "../neon/draw";
import type { Icon, Skin } from "./skin";

// The base skin: pure 80s neon. Magenta sky, cyan grid, striped sun, wireframe mountains
// (all from the base world), and simple geometric glyphs on the bars.

const TAU = Math.PI * 2;

const triangle: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.45, cy + s * 0.38);
  ctx.lineTo(cx - s * 0.45, cy + s * 0.38);
  ctx.closePath();
  ctx.stroke();
};

const ring: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.4);
  ctx.stroke();
};

const square: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.rect(cx - s * 0.36, cy - s * 0.36, s * 0.72, s * 0.72);
  ctx.stroke();
};

const diamond: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.4, cy);
  ctx.lineTo(cx, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.4, cy);
  ctx.closePath();
  ctx.stroke();
};

const cross: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.35, cy + s * 0.35);
  ctx.moveTo(cx + s * 0.35, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.35);
  ctx.stroke();
};

const chevron: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const dx of [-0.2, 0.15]) {
    ctx.moveTo(cx + s * (dx - 0.15), cy - s * 0.38);
    ctx.lineTo(cx + s * (dx + 0.15), cy);
    ctx.lineTo(cx + s * (dx - 0.15), cy + s * 0.38);
  }
  ctx.stroke();
};

const bolt: Icon = (ctx, cx, cy, s) => {
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

const star: Icon = (ctx, cx, cy, s) => {
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

const hexagon: Icon = (ctx, cx, cy, s) => {
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

const plus: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.42);
  ctx.lineTo(cx, cy + s * 0.42);
  ctx.moveTo(cx - s * 0.42, cy);
  ctx.lineTo(cx + s * 0.42, cy);
  ctx.stroke();
};

const wave: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const x = cx - s * 0.5 + (i / 16) * s;
    const y = cy + Math.sin((i / 16) * TAU) * s * 0.25;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

const dots: Icon = (ctx, cx, cy, s) => {
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

export const neon: Skin = {
  id: "neon",
  name: "Neon",
  palette: {
    skyTop: "#07020f",
    skyMid: "#2a0838",
    skyBottom: "#6a0f5c",
    horizon: "#ff2fa8",
    grid: "#22e3ff",
    floorFar: "#1c0630",
    floorNear: "#05010b",
    sunTop: "#ffe24d",
    sunBottom: "#ff2d8f",
    star: "#ffffff",
  },
  bars: [
    { color: "#ff2fa8", icon: triangle },
    { color: "#22e3ff", icon: ring },
    { color: "#ffe24d", icon: bolt },
    { color: "#9b5cff", icon: diamond },
    { color: "#39ff88", icon: chevron },
    { color: "#ff7a2f", icon: square },
    { color: "#2f7bff", icon: star },
    { color: "#ff3b5c", icon: cross },
    { color: "#e04bff", icon: hexagon },
    { color: "#4dfff0", icon: wave },
    { color: "#c8ff3b", icon: plus },
    { color: "#ff8adf", icon: dots },
  ],
  hud: {
    display: "Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#ffe6fb",
    titleGlow: "#ff2fa8",
    accent: "#ffe24d",
    life: "#ff2fa8",
  },
};

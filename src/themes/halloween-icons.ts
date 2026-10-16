// Neon line icons for the Halloween bars. Each draws one symbol centered at (cx, cy),
// about `s` pixels tall, using the caller's current strokeStyle / fillStyle.
// Built from strokes so they read like neon tubes.

export type Icon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

const TAU = Math.PI * 2;

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export const pumpkin: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.05, s * 0.55, s * 0.42, 0, 0, TAU);
  ctx.moveTo(cx, cy - s * 0.37);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.52);
  // Eyes and grin
  ctx.moveTo(cx - s * 0.32, cy);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.15);
  ctx.lineTo(cx - s * 0.08, cy);
  ctx.moveTo(cx + s * 0.08, cy);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.32, cy);
  ctx.moveTo(cx - s * 0.3, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.28);
  ctx.lineTo(cx, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.18);
  ctx.stroke();
};

export const witchHat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.6, cy + s * 0.38);
  ctx.lineTo(cx + s * 0.6, cy + s * 0.38);
  ctx.moveTo(cx - s * 0.28, cy + s * 0.38);
  ctx.lineTo(cx + s * 0.02, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.48);
  ctx.moveTo(cx + s * 0.28, cy + s * 0.38);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.12);
  ctx.moveTo(cx - s * 0.22, cy + s * 0.22);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.22);
  ctx.stroke();
};

export const candyCorn: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.25, cy, cx + s * 0.38, cy + s * 0.38);
  ctx.quadraticCurveTo(cx, cy + s * 0.5, cx - s * 0.38, cy + s * 0.38);
  ctx.quadraticCurveTo(cx - s * 0.25, cy, cx, cy - s * 0.5);
  ctx.moveTo(cx - s * 0.18, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.08);
  ctx.moveTo(cx - s * 0.3, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.18);
  ctx.stroke();
};

export const ghost: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.36;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.1, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy + s * 0.45);
  for (let i = 1; i <= 4; i++) {
    const x = cx + r - (i * 2 * r) / 4;
    ctx.quadraticCurveTo(x + r / 4, cy + s * 0.25, x, cy + s * 0.45);
  }
  ctx.closePath();
  ctx.stroke();
  dot(ctx, cx - s * 0.13, cy - s * 0.1, s * 0.07);
  dot(ctx, cx + s * 0.13, cy - s * 0.1, s * 0.07);
};

export const bat: Icon = (ctx, cx, cy, s) => {
  const w = s * 0.75;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.12);
  ctx.quadraticCurveTo(cx - w * 0.5, cy - s * 0.4, cx - w, cy - s * 0.15);
  ctx.quadraticCurveTo(cx - w * 0.75, cy + s * 0.05, cx - w * 0.6, cy + s * 0.25);
  ctx.quadraticCurveTo(cx - w * 0.4, cy + s * 0.05, cx - w * 0.25, cy + s * 0.2);
  ctx.quadraticCurveTo(cx - w * 0.1, cy + s * 0.05, cx, cy + s * 0.3);
  ctx.quadraticCurveTo(cx + w * 0.1, cy + s * 0.05, cx + w * 0.25, cy + s * 0.2);
  ctx.quadraticCurveTo(cx + w * 0.4, cy + s * 0.05, cx + w * 0.6, cy + s * 0.25);
  ctx.quadraticCurveTo(cx + w * 0.75, cy + s * 0.05, cx + w, cy - s * 0.15);
  ctx.quadraticCurveTo(cx + w * 0.5, cy - s * 0.4, cx, cy - s * 0.12);
  // Ears
  ctx.moveTo(cx - s * 0.1, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.13, cy - s * 0.32);
  ctx.moveTo(cx + s * 0.1, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.13, cy - s * 0.32);
  ctx.stroke();
};

export const tombstone: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + s * 0.45);
  ctx.lineTo(cx - r, cy - s * 0.15);
  ctx.arc(cx, cy - s * 0.15, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy + s * 0.45);
  ctx.moveTo(cx - s * 0.5, cy + s * 0.45);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.45);
  ctx.moveTo(cx, cy - s * 0.25);
  ctx.lineTo(cx, cy + s * 0.2);
  ctx.moveTo(cx - s * 0.13, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.13, cy - s * 0.08);
  ctx.stroke();
};

export const mummy: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.45;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.moveTo(cx - r * 0.95, cy - r * 0.35);
  ctx.lineTo(cx + r * 0.9, cy - r * 0.6);
  ctx.moveTo(cx - r * 0.95, cy + r * 0.3);
  ctx.lineTo(cx + r * 0.95, cy + r * 0.05);
  ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
  ctx.lineTo(cx + r * 0.75, cy + r * 0.55);
  ctx.stroke();
  dot(ctx, cx - r * 0.35, cy - r * 0.12, s * 0.07);
  dot(ctx, cx + r * 0.3, cy - r * 0.2, s * 0.07);
};

export const moon: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.45;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.3, Math.PI * 1.7);
  ctx.arc(cx + r * 0.45, cy - r * 0.1, r * 0.75, Math.PI * 1.45, Math.PI * 0.6, true);
  ctx.closePath();
  ctx.stroke();
  dot(ctx, cx + s * 0.45, cy - s * 0.3, s * 0.05);
};

export const skull: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.28);
  ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.2, cx - s * 0.45, cy - s * 0.08);
  ctx.arc(cx, cy - s * 0.08, s * 0.45, Math.PI, 0);
  ctx.quadraticCurveTo(cx + s * 0.45, cy + s * 0.2, cx + s * 0.2, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.48);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.05, cy + s * 0.32);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.48);
  ctx.moveTo(cx + s * 0.07, cy + s * 0.32);
  ctx.lineTo(cx + s * 0.07, cy + s * 0.48);
  ctx.stroke();
  dot(ctx, cx - s * 0.17, cy - s * 0.02, s * 0.11);
  dot(ctx, cx + s * 0.17, cy - s * 0.02, s * 0.11);
};

export const fangs: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  // Smile with two fangs, under a widow's-peak brow.
  ctx.moveTo(cx - s * 0.5, cy - s * 0.05);
  ctx.quadraticCurveTo(cx, cy + s * 0.25, cx + s * 0.5, cy - s * 0.05);
  ctx.moveTo(cx - s * 0.22, cy + s * 0.07);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.42);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.11);
  ctx.moveTo(cx + s * 0.08, cy + s * 0.11);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.07);
  ctx.moveTo(cx - s * 0.5, cy - s * 0.45);
  ctx.lineTo(cx, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.45);
  ctx.stroke();
};

export const spider: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.55);
  ctx.lineTo(cx, cy - s * 0.18);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ly = cy - s * 0.08 + i * s * 0.1;
      ctx.moveTo(cx + side * s * 0.1, ly);
      ctx.lineTo(cx + side * s * 0.32, ly - s * 0.14 + i * s * 0.04);
      ctx.lineTo(cx + side * s * 0.48, ly + s * 0.1 + i * s * 0.03);
    }
  }
  ctx.stroke();
  dot(ctx, cx, cy - s * 0.1, s * 0.11);
  dot(ctx, cx, cy + s * 0.15, s * 0.17);
};

export const house: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.05, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.45);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.22, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.45);
  ctx.moveTo(cx - s * 0.08, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.45);
  ctx.stroke();
  ctx.fillRect(cx - s * 0.28, cy + s * 0.02, s * 0.13, s * 0.12);
  ctx.fillRect(cx + s * 0.15, cy + s * 0.02, s * 0.13, s * 0.12);
};

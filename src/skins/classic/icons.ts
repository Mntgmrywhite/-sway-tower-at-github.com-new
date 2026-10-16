import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";

// Symbols for the Sky Islands bars: things of the sky and of the islands, our own simple
// glyphs. Each draws one bold shape centered at (cx, cy), about `s` pixels tall, with the
// caller's ink style. In play `s` is only ~12 px, so they are chunky filled silhouettes with
// an occasional stroked detail; holes are cut with even-odd fills, and every round part is its
// own subpath. Nothing is allocated: these run hundreds of times a frame.

const TAU = Math.PI * 2;

export const sun: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.moveTo(cx + Math.cos(a) * s * 0.33, cy + Math.sin(a) * s * 0.33);
    ctx.lineTo(cx + Math.cos(a) * s * 0.48, cy + Math.sin(a) * s * 0.48);
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.24);
  ctx.fill();
};

export const cloud: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx - s * 0.26, cy + s * 0.06, s * 0.17);
  circle(ctx, cx - s * 0.02, cy - s * 0.08, s * 0.24);
  circle(ctx, cx + s * 0.26, cy + s * 0.04, s * 0.18);
  ctx.rect(cx - s * 0.26, cy + s * 0.04, s * 0.52, s * 0.19);
  ctx.fill();
};

export const kite: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.05, cy - s * 0.48);
  ctx.lineTo(cx + s * 0.26, cy - s * 0.14);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.12);
  ctx.closePath();
  ctx.fill();
  // Tail with a bow.
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.02, cy + s * 0.22);
  ctx.quadraticCurveTo(cx + s * 0.16, cy + s * 0.36, cx + s * 0.04, cy + s * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.09, cy + s * 0.37);
  ctx.lineTo(cx + s * 0.24, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.45);
  ctx.closePath();
  ctx.fill();
};

export const leaf: Icon = (ctx, cx, cy, s) => {
  // A pointed leaf leaning right, the midrib cut out.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.36, cy - s * 0.3, cx + s * 0.34, cy - s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.26, cx - s * 0.3, cy + s * 0.36);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.22);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.22);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.24);
  ctx.closePath();
  ctx.fill("evenodd");
};

export const balloon: Icon = (ctx, cx, cy, s) => {
  // A hot-air balloon: a round envelope tapering to a narrow mouth, a gore cut down its middle,
  // then a clear gap, two thin ropes and a basket wider than the mouth (so it never reads as a
  // light bulb).
  const r = s * 0.31;
  const ey = cy - s * 0.17;
  const mouth = cy + s * 0.15;
  ctx.beginPath();
  ctx.arc(cx, ey, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.quadraticCurveTo(cx + r * 0.5, ey + r * 0.95, cx + s * 0.07, mouth);
  ctx.lineTo(cx - s * 0.07, mouth);
  ctx.quadraticCurveTo(cx - r * 0.5, ey + r * 0.95, cx + Math.cos(Math.PI * 0.8) * r, ey + Math.sin(Math.PI * 0.8) * r);
  ctx.closePath();
  ctx.moveTo(cx, ey - r * 0.8);
  ctx.quadraticCurveTo(cx + r * 0.42, ey + r * 0.2, cx, mouth - s * 0.05);
  ctx.quadraticCurveTo(cx - r * 0.42, ey + r * 0.2, cx, ey - r * 0.8);
  ctx.closePath();
  ctx.rect(cx - s * 0.13, cy + s * 0.31, s * 0.26, s * 0.16);
  ctx.fill("evenodd");
  const lw = ctx.lineWidth;
  ctx.lineWidth = Math.max(0.8, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.06, mouth);
  ctx.lineTo(cx - s * 0.11, cy + s * 0.31);
  ctx.moveTo(cx + s * 0.06, mouth);
  ctx.lineTo(cx + s * 0.11, cy + s * 0.31);
  ctx.stroke();
  ctx.lineWidth = lw;
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const r = i % 2 ? s * 0.21 : s * 0.5;
    const x = cx + Math.cos(a) * r;
    const y = cy + s * 0.04 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
};

export const bird: Icon = (ctx, cx, cy, s) => {
  // Gliding, wings swept up: two curved wings meeting at a small round body.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.22, cx - s * 0.04, cy + s * 0.08);
  ctx.quadraticCurveTo(cx - s * 0.22, cy - s * 0.04, cx - s * 0.5, cy - s * 0.2);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.5, cy - s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.22, cx + s * 0.04, cy + s * 0.08);
  ctx.quadraticCurveTo(cx + s * 0.22, cy - s * 0.04, cx + s * 0.5, cy - s * 0.2);
  ctx.closePath();
  oval(ctx, cx, cy + s * 0.1, s * 0.12, s * 0.1);
  ctx.fill();
};

export const raindrop: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.48);
  ctx.quadraticCurveTo(cx + s * 0.08, cy - s * 0.2, cx + s * 0.25, cy + s * 0.06);
  ctx.arc(cx, cy + s * 0.16, s * 0.27, -Math.PI * 0.12, Math.PI * 1.12);
  ctx.quadraticCurveTo(cx - s * 0.08, cy - s * 0.2, cx, cy - s * 0.48);
  ctx.closePath();
  ctx.fill();
};

export const island: Icon = (ctx, cx, cy, s) => {
  // A floating island: a grassy slab over a sharp rock cone pointing down, one stratum cut
  // across the cone, and a lollipop tree and a bush on top. The cone is a V, not a bowl.
  const t = cy - s * 0.02;
  const b = t + s * 0.13;
  const tip = cy + s * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, t + s * 0.05);
  ctx.quadraticCurveTo(cx - s * 0.5, t, cx - s * 0.44, t);
  ctx.lineTo(cx + s * 0.44, t);
  ctx.quadraticCurveTo(cx + s * 0.5, t, cx + s * 0.5, t + s * 0.05);
  ctx.lineTo(cx + s * 0.5, b);
  ctx.lineTo(cx + s * 0.38, b);
  ctx.lineTo(cx + s * 0.07, tip - s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.03, tip + s * 0.01, cx - s * 0.01, tip - s * 0.02);
  ctx.lineTo(cx - s * 0.38, b);
  ctx.lineTo(cx - s * 0.5, b);
  ctx.closePath();
  ctx.rect(cx - s * 0.21, b + s * 0.1, s * 0.44, s * 0.07);
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.rect(cx - s * 0.2, t - s * 0.16, s * 0.08, s * 0.16);
  circle(ctx, cx - s * 0.16, t - s * 0.3, s * 0.17);
  circle(ctx, cx + s * 0.22, t - s * 0.06, s * 0.11);
  circle(ctx, cx + s * 0.34, t - s * 0.04, s * 0.08);
  ctx.rect(cx + s * 0.13, t - s * 0.05, s * 0.29, s * 0.05);
  ctx.fill();
};

export const feather: Icon = (ctx, cx, cy, s) => {
  // A curved vane with the quill showing below it, a notch in its edge.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.32);
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.2, cx + s * 0.28, cy - s * 0.48);
  ctx.quadraticCurveTo(cx + s * 0.28, cy - s * 0.1, cx + s * 0.1, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.06);
  ctx.quadraticCurveTo(cx + s * 0.02, cy + s * 0.26, cx - s * 0.2, cy + s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.48);
  ctx.stroke();
};

export const moon: Icon = (ctx, cx, cy, s) => {
  // A crescent: the outer arc round the left, the inner edge an ellipse back up.
  const r = s * 0.44;
  const x = cx + s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, cy - r);
  ctx.arc(x, cy, r, -Math.PI / 2, Math.PI / 2, true);
  ctx.ellipse(x, cy, r * 0.3, r, 0, Math.PI / 2, (Math.PI * 3) / 2, false);
  ctx.closePath();
  ctx.fill();
};

/** One band of a rainbow: a half-ellipse ring standing on y, as its own subpath. */
function arch(ctx: Parameters<Icon>[0], x: number, y: number, rx: number, ry: number, w: number): void {
  ctx.moveTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
  ctx.lineTo(x + rx - w, y);
  ctx.ellipse(x, y, rx - w, ry - w, 0, TAU, Math.PI, true);
  ctx.closePath();
}

export const rainbow: Icon = (ctx, cx, cy, s) => {
  // A wide two-band arch with a cloud over its right foot only: lopsided on purpose, so the
  // arch never reads as a pair of headphones.
  const x = cx - s * 0.06;
  const y = cy + s * 0.16;
  ctx.beginPath();
  arch(ctx, x, y, s * 0.46, s * 0.42, s * 0.13);
  arch(ctx, x, y, s * 0.27, s * 0.24, s * 0.11);
  circle(ctx, cx + s * 0.26, y - s * 0.05, s * 0.14);
  circle(ctx, cx + s * 0.42, y + s * 0.02, s * 0.1);
  circle(ctx, cx + s * 0.1, y + s * 0.03, s * 0.1);
  ctx.rect(cx + s * 0.1, y, s * 0.32, s * 0.13);
  ctx.fill();
};

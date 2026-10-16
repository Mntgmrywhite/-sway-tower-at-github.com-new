import { circle, oval } from "../../base/draw";
import type { Icon } from "../skin";

// Glow-party symbols for the Blacklight bars. They are solid shapes (holes cut with reversed
// subpaths) rather than thin outlines, so they stay bold and legible on narrow, small bars.
// Each one is drawn twice by the neon bar (soft glow pass, then the core), so it must start
// its own path and leave the context's styles alone.

const TAU = Math.PI * 2;
const SIDES = [-1, 1] as const;

/** Anticlockwise circle: a hole when filled with the nonzero rule around clockwise shapes. */
function hole(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, TAU, 0, true);
}

function holeOval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, TAU, 0, true);
}

/** A four-point twinkle (concave sides) as its own subpath: r tall, r * squeeze wide. */
export function twinkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, squeeze: number): void {
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * squeeze, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * squeeze, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

/** Polygon from flat [x, y, x, y, ...] offsets in units of s. */
function poly(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, pts: readonly number[]): void {
  ctx.moveTo(cx + pts[0]! * s, cy + pts[1]! * s);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(cx + pts[i]! * s, cy + pts[i + 1]! * s);
  ctx.closePath();
}

export const smiley: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.47;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  ctx.stroke();
  holeOval(ctx, cx - r * 0.34, cy - r * 0.3, r * 0.14, r * 0.23);
  holeOval(ctx, cx + r * 0.34, cy - r * 0.3, r * 0.14, r * 0.23);
  // Grin: a crescent hole, outer arc anticlockwise along the bottom, inner arc back.
  const a0 = Math.PI * 0.16;
  const a1 = Math.PI * 0.84;
  ctx.moveTo(cx + Math.cos(a1) * r * 0.66, cy + Math.sin(a1) * r * 0.66);
  ctx.arc(cx, cy, r * 0.66, a1, a0, true);
  ctx.quadraticCurveTo(cx, cy + r * 0.44, cx + Math.cos(a1) * r * 0.66, cy + Math.sin(a1) * r * 0.66);
  ctx.closePath();
  ctx.fill();
};

const BOLT = [0.17, -0.5, -0.27, 0.07, -0.03, 0.07, -0.17, 0.5, 0.29, -0.11, 0.05, -0.11];

export const lightning: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, cx, cy, s, BOLT);
  ctx.fill();
  ctx.stroke();
};

export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? s * 0.22 : s * 0.52;
    const x = cx + Math.cos(a) * r;
    const y = cy + 0.04 * s + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

export const heart: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.44);
  ctx.bezierCurveTo(cx - s * 0.62, cy + s * 0.02, cx - s * 0.44, cy - s * 0.6, cx, cy - s * 0.22);
  ctx.bezierCurveTo(cx + s * 0.44, cy - s * 0.6, cx + s * 0.62, cy + s * 0.02, cx, cy + s * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

/** Two beamed eighth notes. */
export const musicNote: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  oval(ctx, cx - s * 0.25, cy + s * 0.3, s * 0.17, s * 0.12, -0.4);
  oval(ctx, cx + s * 0.25, cy + s * 0.2, s * 0.17, s * 0.12, -0.4);
  // Stems and the beam.
  poly(ctx, cx, cy, s, [-0.13, 0.28, -0.13, -0.32, -0.04, -0.32, -0.04, 0.28]);
  poly(ctx, cx, cy, s, [0.37, 0.18, 0.37, -0.44, 0.46, -0.44, 0.46, 0.18]);
  poly(ctx, cx, cy, s, [-0.13, -0.2, 0.46, -0.32, 0.46, -0.48, -0.13, -0.36]);
  ctx.fill();
  ctx.stroke();
};

/** A stadium (round-ended tube) of half-width w along unit axis (dx, dy) from t0 to t1 past (bx, by). */
function stadium(ctx: CanvasRenderingContext2D, bx: number, by: number, dx: number, dy: number, w: number, t0: number, t1: number): void {
  const x0 = bx + dx * t0;
  const y0 = by + dy * t0;
  const x1 = bx + dx * t1;
  const y1 = by + dy * t1;
  const a = Math.atan2(dy, dx);
  ctx.moveTo(x0 - dy * w, y0 + dx * w);
  ctx.lineTo(x1 - dy * w, y1 + dx * w);
  ctx.arc(x1, y1, w, a + Math.PI / 2, a - Math.PI / 2, true);
  ctx.lineTo(x0 + dy * w, y0 - dx * w);
  ctx.arc(x0, y0, w, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath();
}

/** A glow stick: a tilted tube with its cap past a thin gap, and two glints of light. */
export const glowStick: Icon = (ctx, cx, cy, s) => {
  const dx = Math.cos(-1.05);
  const dy = Math.sin(-1.05);
  const w = s * 0.12;
  const bx = cx - s * 0.1;
  const by = cy + s * 0.02;
  ctx.beginPath();
  stadium(ctx, bx, by, dx, dy, w, -s * 0.34, s * 0.1);
  stadium(ctx, bx, by, dx, dy, w * 0.8, s * 0.39, s * 0.44);
  ctx.fill();
  ctx.stroke();
  // Glints beside it.
  ctx.beginPath();
  twinkle(ctx, cx + s * 0.3, cy + s * 0.14, s * 0.17, 0.75);
  twinkle(ctx, cx - s * 0.36, cy - s * 0.28, s * 0.12, 0.75);
  ctx.fill();
};

const SPLAT = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * TAU + (i % 2 ? 0.25 : -0.1);
  const far = i % 2 ? 0.3 : 0.24;
  return { x: Math.cos(a) * far, y: Math.sin(a) * far, r: i % 2 ? 0.09 : 0.12 };
});

/** A paint splat: a blob with lobes, a drip running down and loose droplets. */
export const paintSplat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy - s * 0.04, s * 0.26);
  for (const l of SPLAT) circle(ctx, cx + l.x * s, cy - s * 0.04 + l.y * s, l.r * s);
  // Drip down from the bottom.
  ctx.moveTo(cx + s * 0.02, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.38);
  ctx.arc(cx + s * 0.07, cy + s * 0.38, s * 0.05, 0, Math.PI);
  ctx.closePath();
  circle(ctx, cx - s * 0.44, cy - s * 0.3, s * 0.05);
  circle(ctx, cx + s * 0.45, cy - s * 0.34, s * 0.045);
  circle(ctx, cx - s * 0.36, cy + s * 0.34, s * 0.04);
  ctx.fill();
};

export const peace: Icon = (ctx, cx, cy, s) => {
  const r = s * 0.47;
  const ri = r * 0.72;
  const w = r * 0.13;
  ctx.beginPath();
  circle(ctx, cx, cy, r);
  hole(ctx, cx, cy, ri);
  // Spine and the two lower spokes, as clockwise strips reaching into the ring.
  poly(ctx, cx, cy, 1, [-w, -ri - w, w, -ri - w, w, ri + w, -w, ri + w]);
  for (const side of SIDES) {
    const ex = side * (ri + w) * Math.SQRT1_2;
    const ey = (ri + w) * Math.SQRT1_2;
    const len = ri + w;
    const nx = (ey / len) * w;
    const ny = (-ex / len) * w;
    ctx.moveTo(cx + nx, cy + ny);
    ctx.lineTo(cx + ex + nx, cy + ey + ny);
    ctx.lineTo(cx + ex - nx, cy + ey - ny);
    ctx.lineTo(cx - nx, cy - ny);
    ctx.closePath();
  }
  ctx.fill();
};

export const eye: Icon = (ctx, cx, cy, s) => {
  const w = s * 0.52;
  const h = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.quadraticCurveTo(cx, cy - h * 2, cx + w, cy);
  ctx.quadraticCurveTo(cx, cy + h * 2, cx - w, cy);
  ctx.closePath();
  hole(ctx, cx, cy, s * 0.2);
  circle(ctx, cx, cy, s * 0.11);
  ctx.fill();
};

/** A four-point sparkle with a small one beside it. */
export const sparkle: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  twinkle(ctx, cx - s * 0.08, cy + s * 0.04, s * 0.42, 0.78);
  twinkle(ctx, cx + s * 0.32, cy - s * 0.3, s * 0.17, 0.78);
  ctx.fill();
  ctx.stroke();
};

const CROWN = [-0.46, 0.34, -0.46, -0.18, -0.22, 0.06, 0, -0.32, 0.22, 0.06, 0.46, -0.18, 0.46, 0.34];

export const crown: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  poly(ctx, cx, cy + s * 0.04, s, CROWN);
  circle(ctx, cx - s * 0.46, cy - s * 0.22, s * 0.08);
  circle(ctx, cx, cy - s * 0.37, s * 0.08);
  circle(ctx, cx + s * 0.46, cy - s * 0.22, s * 0.08);
  ctx.fill();
  ctx.stroke();
};

/** A bold sine ribbon. */
export const wave: Icon = (ctx, cx, cy, s) => {
  const n = 14;
  const amp = s * 0.2;
  const th = s * 0.1;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = cx - s * 0.5 + (i / n) * s;
    const y = cy - th + Math.sin((i / n) * TAU) * -amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const x = cx - s * 0.5 + (i / n) * s;
    ctx.lineTo(x, cy + th + Math.sin((i / n) * TAU) * -amp);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

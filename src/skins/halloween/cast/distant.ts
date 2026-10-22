import type { Ctx } from "../../../base/draw";

// Shadowy creatures far off in the sky, flat silhouettes in the haze color the caller passes. A
// colossus: a tiny top-hatted body on four impossibly long, spindly stilt legs, striding slowly
// behind the far spires (one stride every 6 s), seen sharply only when lightning flashes behind it
// and faintly in the spiral sky. A sky-eel: a long serpentine shadow with bat-wing fins, forever
// undulating through the far spiral clouds.

/** Seconds per stride. */
const STRIDE = 6;

/**
 * The colossus with its feet on footY at x, `h` px tall (hat to feet), at time t, drawn at opacity
 * `reveal` (the lightning's flash; nothing when it is 0).
 */
export function colossus(ctx: Ctx, x: number, footY: number, h: number, t: number, color: string, reveal: number): void {
  if (reveal <= 0.01) return;
  const ph = (t / STRIDE) * Math.PI * 2;
  const sway = Math.sin(ph) * h * 0.012;
  const bx = x + sway;
  const by = footY - h * 0.8 + Math.abs(Math.cos(ph)) * h * 0.012;
  ctx.save();
  ctx.globalAlpha = Math.min(1, reveal);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Four long legs, two pairs a half stride apart, knees bent high
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const p = ph + i * (Math.PI / 2);
    const hip = bx + (i - 1.5) * h * 0.025;
    const foot = x + (i - 1.5) * h * 0.09 + Math.sin(p) * h * 0.08;
    const lift = Math.max(0, Math.cos(p)) * h * 0.04;
    const kx = (hip + foot) / 2 + (i % 2 ? 1 : -1) * h * 0.06;
    const ky = by + (footY - by) * 0.42 - lift;
    ctx.moveTo(hip, by + h * 0.04);
    ctx.lineTo(kx, ky);
    ctx.lineTo(foot, footY - lift);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.8, h * 0.008);
  ctx.stroke();
  // The little body, long arms hanging, a tall top hat
  ctx.beginPath();
  ctx.ellipse(bx, by, h * 0.05, h * 0.06, 0, 0, Math.PI * 2);
  ctx.moveTo(bx - h * 0.025, by - h * 0.05);
  ctx.lineTo(bx - h * 0.03, by - h * 0.16);
  ctx.lineTo(bx + h * 0.03, by - h * 0.16);
  ctx.lineTo(bx + h * 0.025, by - h * 0.05);
  ctx.closePath();
  ctx.rect(bx - h * 0.05, by - h * 0.17, h * 0.1, h * 0.012);
  ctx.moveTo(bx - h * 0.045, by - h * 0.01);
  ctx.lineTo(bx - h * 0.09 - sway, by + h * 0.18);
  ctx.lineTo(bx - h * 0.08 - sway, by + h * 0.18);
  ctx.lineTo(bx - h * 0.035, by + h * 0.01);
  ctx.closePath();
  ctx.moveTo(bx + h * 0.045, by - h * 0.01);
  ctx.lineTo(bx + h * 0.09 - sway, by + h * 0.18);
  ctx.lineTo(bx + h * 0.08 - sway, by + h * 0.18);
  ctx.lineTo(bx + h * 0.035, by + h * 0.01);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Scratch box for the distant creatures. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The colossus's box (whatever its stride). */
export function colossusBox(x: number, footY: number, h: number): Readonly<typeof BOX> {
  BOX.x0 = x - h * 0.24;
  BOX.x1 = x + h * 0.24;
  BOX.y0 = footY - h * 1.0;
  BOX.y1 = footY + 1;
  return BOX;
}

/** Points along the eel's spine. */
const N = 18;

/** Spine point i of the eel at time t: x, y and its half thickness, in the eel's own units (length 1). */
const SP = { x: 0, y: 0, w: 0 };
function spine(i: number, t: number): typeof SP {
  const f = i / N;
  SP.x = 0.5 - f;
  SP.y = Math.sin(f * Math.PI * 2.4 - t * 1.6) * 0.05 * (0.4 + f);
  SP.w = 0.035 * Math.sin(Math.min(1, f * 1.4 + 0.12) * Math.PI) + 0.004;
  return SP;
}

/**
 * The sky-eel centred at (x, y), `len` px long, swimming toward `dir` and undulating with t: a long
 * tapering body, a blunt head, and a pair of bat-wing fins near its head, slowly beating; all one
 * flat color, a shadow.
 */
export function skyEel(ctx: Ctx, x: number, y: number, len: number, t: number, color: string, dir: -1 | 1 = 1): void {
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const p = spine(i, t);
    const px = x + dir * p.x * len;
    const py = y + (p.y - p.w) * len;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = N; i >= 0; i--) {
    const p = spine(i, t);
    ctx.lineTo(x + dir * p.x * len, y + (p.y + p.w) * len);
  }
  ctx.closePath();
  // Bat-wing fins near the head: a spiky wing above, a smaller one below
  const f = spine(4, t);
  const fx = x + dir * f.x * len;
  const fy = y + f.y * len;
  const beat = Math.sin(t * 2.2) * 0.04;
  ctx.moveTo(fx + dir * len * 0.04, fy - f.w * len);
  ctx.lineTo(fx - dir * len * 0.02, fy - len * (0.13 + beat));
  ctx.lineTo(fx - dir * len * 0.04, fy - len * (0.07 + beat * 0.6));
  ctx.lineTo(fx - dir * len * 0.07, fy - len * (0.11 + beat));
  ctx.lineTo(fx - dir * len * 0.09, fy - len * (0.05 + beat * 0.4));
  ctx.lineTo(fx - dir * len * 0.12, fy - len * (0.07 + beat * 0.6));
  ctx.lineTo(fx - dir * len * 0.1, fy - f.w * len);
  ctx.closePath();
  ctx.moveTo(fx + dir * len * 0.02, fy + f.w * len);
  ctx.lineTo(fx - dir * len * 0.04, fy + len * (0.08 - beat * 0.5));
  ctx.lineTo(fx - dir * len * 0.06, fy + len * 0.05);
  ctx.lineTo(fx - dir * len * 0.09, fy + len * (0.07 - beat * 0.5));
  ctx.lineTo(fx - dir * len * 0.08, fy + f.w * len);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** The eel's box (whatever its undulation). */
export function skyEelBox(x: number, y: number, len: number): Readonly<typeof BOX> {
  BOX.x0 = x - len * 0.52;
  BOX.x1 = x + len * 0.52;
  BOX.y0 = y - len * 0.2;
  BOX.y1 = y + len * 0.16;
  return BOX;
}

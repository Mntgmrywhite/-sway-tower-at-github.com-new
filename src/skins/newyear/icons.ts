import { circle, oval, type Ctx } from "../../neon/draw";
import type { Icon } from "../skin";
import { TAU } from "./colors";

// Neon line-art glyphs for the bars. Each fits a box about `s` tall centered on (cx, cy)
// and only builds paths and strokes/fills them with the style the bar has already set.
// Kept bold and simple: on a phone they are drawn about 13 px tall, a few hundred times a
// frame, so dots are tiny round-capped segments inside the one stroke instead of extra fills.

/** A dot drawn by the stroke itself (the bar strokes with round caps). */
function dot(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.012, y);
}

const BURST_DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = -Math.PI / 2 + (i * TAU) / 8 + 0.2;
  return [Math.cos(a), Math.sin(a), i % 2 === 0] as const;
});

/** Firework: streaking rays with a spark at each tip. */
export const burst: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const [dx, dy, long] of BURST_DIRS) {
    const r1 = s * (long ? 0.32 : 0.26);
    const r2 = s * (long ? 0.44 : 0.37);
    ctx.moveTo(cx + dx * s * 0.12, cy + dy * s * 0.12);
    ctx.lineTo(cx + dx * r1, cy + dy * r1);
    dot(ctx, cx + dx * r2, cy + dy * r2, s);
  }
  ctx.stroke();
};

// Two flutes clinking, in unit space: each flute is tilted toward the other and the paths
// are baked once at load so drawing is plain moveTo/lineTo/quadraticCurveTo calls.
type Cmd = ["M" | "L", number, number] | ["Q", number, number, number, number] | ["Z"];

const FLUTE: Cmd[] = [
  ["M", -0.15, -0.46],
  ["Q", -0.17, 0.02, 0, 0.06],
  ["Q", 0.17, 0.02, 0.15, -0.46],
  ["M", 0, 0.06],
  ["L", 0, 0.38],
  ["M", -0.14, 0.44],
  ["Q", 0, 0.34, 0.14, 0.44],
];
/** The champagne: the bowl below the fill line. */
const LIQUID: Cmd[] = [
  ["M", -0.148, -0.24],
  ["Q", -0.127, 0.03, 0, 0.06],
  ["Q", 0.127, 0.03, 0.148, -0.24],
  ["Z"],
];

/** Rotate by `a`, scale by `k`, then move by (tx, ty): unit-space commands baked once. */
function bakeOne(cmds: Cmd[], a: number, tx: number, ty: number, k = 1): Cmd[] {
  const c = Math.cos(a) * k;
  const sn = Math.sin(a) * k;
  const X = (x: number, y: number) => tx + x * c - y * sn;
  const Y = (x: number, y: number) => ty + x * sn + y * c;
  return cmds.map((cmd): Cmd => {
    if (cmd[0] === "Z") return cmd;
    if (cmd[0] === "Q") return ["Q", X(cmd[1], cmd[2]), Y(cmd[1], cmd[2]), X(cmd[3], cmd[4]), Y(cmd[3], cmd[4])];
    return [cmd[0], X(cmd[1], cmd[2]), Y(cmd[1], cmd[2])];
  });
}

/** Both flutes, each leaning toward the other. */
function bake(cmds: Cmd[]): Cmd[] {
  return [...bakeOne(cmds, 0.22, -0.22, 0.04, 0.95), ...bakeOne(cmds, -0.22, 0.22, 0.04, 0.95)];
}

const CHEERS_LINES = bake(FLUTE);
const CHEERS_FILL = bake(LIQUID);

function trace(ctx: Ctx, cmds: Cmd[], cx: number, cy: number, s: number): void {
  for (const c of cmds) {
    if (c[0] === "M") ctx.moveTo(cx + c[1] * s, cy + c[2] * s);
    else if (c[0] === "L") ctx.lineTo(cx + c[1] * s, cy + c[2] * s);
    else if (c[0] === "Q") ctx.quadraticCurveTo(cx + c[1] * s, cy + c[2] * s, cx + c[3] * s, cy + c[4] * s);
    else ctx.closePath();
  }
}

/** Two flutes clinking, the champagne filled in so it reads at phone size. */
export const cheers: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  trace(ctx, CHEERS_LINES, cx, cy, s);
  dot(ctx, cx, cy - s * 0.5, s); // clink
  ctx.stroke();
  ctx.beginPath();
  trace(ctx, CHEERS_FILL, cx, cy, s);
  ctx.fill();
};

// Five to midnight: the minute hand on the 11, the hour hand just shy of the 12.
const MINUTE_HAND = [Math.cos(-Math.PI / 2 - TAU / 12), Math.sin(-Math.PI / 2 - TAU / 12)] as const;
const HOUR_HAND = [Math.cos(-Math.PI / 2 - TAU / 144), Math.sin(-Math.PI / 2 - TAU / 144)] as const;

/** Clock face at five to midnight. */
export const clock: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  circle(ctx, cx, cy, s * 0.43);
  ctx.moveTo(cx + MINUTE_HAND[0] * s * 0.31, cy + MINUTE_HAND[1] * s * 0.31);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + HOUR_HAND[0] * s * 0.22, cy + HOUR_HAND[1] * s * 0.22);
  dot(ctx, cx + s * 0.33, cy, s);
  dot(ctx, cx - s * 0.33, cy, s);
  dot(ctx, cx, cy + s * 0.33, s);
  ctx.stroke();
};

/** Five-point star. */
export const star: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? s * 0.2 : s * 0.48;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r + s * 0.03;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
};

/** Cone party hat with a pom-pom and a stripe. */
export const partyHat: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.4);
  ctx.lineTo(cx, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.4);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx - s * 0.3, cy + s * 0.4);
  ctx.moveTo(cx - s * 0.16, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.2);
  circle(ctx, cx, cy - s * 0.4, s * 0.085);
  ctx.stroke();
};

/** Balloon on a curly string. */
export const balloon: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  oval(ctx, cx, cy - s * 0.13, s * 0.25, s * 0.31);
  ctx.moveTo(cx - s * 0.06, cy + s * 0.24);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.24);
  ctx.lineTo(cx, cy + s * 0.18);
  ctx.closePath();
  ctx.moveTo(cx, cy + s * 0.24);
  ctx.quadraticCurveTo(cx - s * 0.16, cy + s * 0.36, cx + s * 0.05, cy + s * 0.5);
  // Shine
  ctx.moveTo(cx - s * 0.14, cy - s * 0.24);
  ctx.quadraticCurveTo(cx - s * 0.13, cy - s * 0.33, cx - s * 0.04, cy - s * 0.36);
  ctx.stroke();
};

/** Four-point sparkle with a small twin. */
export const sparkle: Icon = (ctx, cx, cy, s) => {
  const x = cx - s * 0.06;
  const y = cy + s * 0.05;
  const r = s * 0.42;
  const k = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r * 0.8, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r * 0.8, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.closePath();
  const sx = cx + s * 0.34;
  const sy = cy - s * 0.32;
  const sr = s * 0.13;
  ctx.moveTo(sx, sy - sr);
  ctx.lineTo(sx, sy + sr);
  ctx.moveTo(sx - sr, sy);
  ctx.lineTo(sx + sr, sy);
  ctx.stroke();
};

/** Mirror ball on its hanger. */
export const discoBall: Icon = (ctx, cx, cy, s) => {
  const y = cy + s * 0.08;
  const r = s * 0.37;
  ctx.beginPath();
  circle(ctx, cx, y, r);
  // Meridian and two latitude chords
  oval(ctx, cx, y, r * 0.42, r);
  ctx.moveTo(cx - r, y);
  ctx.lineTo(cx + r, y);
  ctx.moveTo(cx - r * 0.8, y - r * 0.6);
  ctx.lineTo(cx + r * 0.8, y - r * 0.6);
  ctx.moveTo(cx - r * 0.8, y + r * 0.6);
  ctx.lineTo(cx + r * 0.8, y + r * 0.6);
  ctx.moveTo(cx, y - r);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.stroke();
};

const HORN_TILT = -0.42;
const HORN_LINES: Cmd[] = bakeOne(
  [
    ["M", -0.5, -0.045],
    ["L", -0.34, -0.06],
    ["L", 0.26, -0.22],
    ["M", -0.5, 0.045],
    ["L", -0.34, 0.06],
    ["L", 0.26, 0.22],
    ["M", -0.1, -0.125],
    ["L", -0.1, 0.125],
    ["M", 0.08, -0.17],
    ["L", 0.08, 0.17],
  ],
  HORN_TILT,
  0,
  0.04,
);
const HORN_BELL_X = 0.27 * Math.cos(HORN_TILT);
const HORN_BELL_Y = 0.04 + 0.27 * Math.sin(HORN_TILT);

/** Party horn: mouthpiece, striped cone, flared bell; tipped upward. */
export const horn: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  trace(ctx, HORN_LINES, cx, cy, s);
  oval(ctx, cx + HORN_BELL_X * s, cy + HORN_BELL_Y * s, s * 0.07, s * 0.23, HORN_TILT);
  ctx.stroke();
};

/** Bow tie. */
export const bowTie: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  for (const d of [-1, 1]) {
    ctx.moveTo(cx + d * s * 0.09, cy - s * 0.08);
    ctx.lineTo(cx + d * s * 0.47, cy - s * 0.27);
    ctx.lineTo(cx + d * s * 0.47, cy + s * 0.27);
    ctx.lineTo(cx + d * s * 0.09, cy + s * 0.08);
  }
  ctx.rect(cx - s * 0.09, cy - s * 0.12, s * 0.18, s * 0.24);
  ctx.stroke();
};

const CONFETTI_BITS: readonly (readonly [number, number, number])[] = [
  [-0.3, -0.28, 0.6],
  [0.12, -0.36, -0.5],
  [0.34, -0.06, 1.2],
  [-0.08, 0.06, -1.0],
  [-0.36, 0.26, 0.1],
  [0.18, 0.32, 0.7],
];

/** Confetti: tumbling dashes and dots. */
export const confetti: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  const l = s * 0.12;
  for (const [x, y, a] of CONFETTI_BITS) {
    const px = cx + x * s;
    const py = cy + y * s;
    ctx.moveTo(px - Math.cos(a) * l, py - Math.sin(a) * l);
    ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
  }
  dot(ctx, cx + s * 0.4, cy + s * 0.34, s);
  dot(ctx, cx - s * 0.02, cy - s * 0.42, s);
  dot(ctx, cx - s * 0.42, cy - s * 0.02, s);
  ctx.stroke();
};

// Crescent: the outer circle minus an offset inner one; arc angles solved once.
const C1 = { x: -0.06, y: 0, r: 0.42 };
const C2 = { x: 0.12, y: -0.1, r: 0.36 };
const CRESCENT = (() => {
  const dx = C2.x - C1.x;
  const dy = C2.y - C1.y;
  const d = Math.hypot(dx, dy);
  const a = (C1.r * C1.r - C2.r * C2.r + d * d) / (2 * d);
  const h = Math.sqrt(C1.r * C1.r - a * a);
  const mx = C1.x + (a * dx) / d;
  const my = C1.y + (a * dy) / d;
  const p = { x: mx - (h * dy) / d, y: my + (h * dx) / d }; // lower right point
  const q = { x: mx + (h * dy) / d, y: my - (h * dx) / d }; // upper point
  return {
    o0: Math.atan2(q.y - C1.y, q.x - C1.x),
    o1: Math.atan2(p.y - C1.y, p.x - C1.x),
    i0: Math.atan2(p.y - C2.y, p.x - C2.x),
    i1: Math.atan2(q.y - C2.y, q.x - C2.x),
  };
})();

/** Crescent moon with a little star. */
export const crescent: Icon = (ctx, cx, cy, s) => {
  ctx.beginPath();
  ctx.arc(cx + C1.x * s, cy + C1.y * s, C1.r * s, CRESCENT.o0, CRESCENT.o1, true);
  ctx.arc(cx + C2.x * s, cy + C2.y * s, C2.r * s, CRESCENT.i0, CRESCENT.i1, false);
  ctx.closePath();
  const sx = cx + s * 0.3;
  const sy = cy + s * 0.12;
  const sr = s * 0.09;
  ctx.moveTo(sx, sy - sr);
  ctx.lineTo(sx, sy + sr);
  ctx.moveTo(sx - sr, sy);
  ctx.lineTo(sx + sr, sy);
  ctx.stroke();
};

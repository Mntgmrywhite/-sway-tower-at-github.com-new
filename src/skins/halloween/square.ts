import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BONE_SHADE, INK, inkW, IRON, MOSS_DARK, ORANGE, ORANGE_DARK, ORANGE_LIGHT, spot, STEM } from "./common";
import { jackOLantern } from "./pumpkin";

// The square's centerpiece, behind the tower on the right: a round flower bed of autumn mums
// ringed by a low chain railing (short iron posts curling at their tops, the chain swagged
// between them), heaped with a pile of pumpkins (orange, ghost-white and striped green), and on
// top of the pile the giant jack-o'-lantern grinning out over the square, taller pile and all than
// the kids beside it (the widest it can stand in the lane between the column and the superhero).

/** The centerpiece's spot (X in u at the tower's depth, z), and the bed's half-width (u at the tower's depth). */
export const CENTERPIECE = { X: 0.322 * (3.85 / 3), z: 3.85, bed: 0.073 };
/** The giant jack-o'-lantern's radius, in u at the tower's depth: taller than the kids, pile and all. */
const JACK_R = 0.064;

/** Pumpkins in the pile: x and y of the bottom (in bed half-widths, y up), radius, kind (0 orange, 1 white, 2 striped). */
const PILE = [
  [-0.66, 0.0, 0.25, 1],
  [0.66, 0.0, 0.24, 2],
  [-0.22, 0.02, 0.28, 0],
  [0.24, 0.0, 0.27, 0],
  [-0.42, 0.4, 0.25, 2],
  [0.42, 0.4, 0.24, 1],
  [0.0, 0.44, 0.27, 0],
] as const;
/** The pile's top, where the jack-o'-lantern sits, in bed half-widths. */
const PILE_TOP = 0.84;

const WHITE_P = "#e9e4d6";
const WHITE_SHADE = "#bdb6a4";
const STRIPED = "#6e8f3a";
const STRIPED_DARK = "#4a6626";
const MUMS = ["#ffb03a", "#e8572e", "#b65ce0", "#ffd65a"] as const;

function pumpkin(ctx: Ctx, x: number, bottom: number, r: number, kind: number, lw: number): void {
  const y = bottom - r * 0.85;
  const fill = kind === 1 ? WHITE_P : kind === 2 ? STRIPED : ORANGE;
  const dark = kind === 1 ? WHITE_SHADE : kind === 2 ? STRIPED_DARK : ORANGE_DARK;
  ctx.beginPath();
  oval(ctx, x, y, r * 1.2, r * 0.88);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.14, r * 0.82, 0, 0.12, Math.PI - 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.42 * Math.cos(Math.PI * 0.6), y + r * 0.86 * Math.sin(Math.PI * 0.6));
  ctx.ellipse(x, y, r * 0.42, r * 0.86, 0, Math.PI * 0.6, Math.PI * 1.4);
  ctx.moveTo(x + r * 0.42 * Math.cos(-Math.PI * 0.4), y + r * 0.86 * Math.sin(-Math.PI * 0.4));
  ctx.ellipse(x, y, r * 0.42, r * 0.86, 0, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = kind === 2 ? "#c9d98a" : dark;
  ctx.lineWidth = Math.max(0.8, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, x, y, r * 1.2, r * 0.88);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.8);
  ctx.lineTo(x - r * 0.06, y - r * 1.1);
  ctx.lineTo(x + r * 0.16, y - r * 1.14);
  ctx.lineTo(x + r * 0.1, y - r * 0.8);
  ctx.closePath();
  ctx.fillStyle = STEM;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** Posts round the bed: angles round the ellipse, the back half (sin < 0) drawn before the pile. */
const POSTS = 9;

function railing(ctx: Ctx, x: number, y: number, rx: number, ry: number, ph: number, back: boolean, lw: number): void {
  const pts: number[] = [];
  for (let i = 0; i <= POSTS; i++) {
    const a = Math.PI + (i / POSTS) * Math.PI * (back ? 1 : -1);
    pts.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry);
  }
  // The chain swags between the posts.
  ctx.beginPath();
  for (let i = 0; i < POSTS; i++) {
    const x0 = pts[i * 2]!;
    const y0 = pts[i * 2 + 1]! - ph * 0.75;
    const x1 = pts[i * 2 + 2]!;
    const y1 = pts[i * 2 + 3]! - ph * 0.75;
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + ph * 0.35, x1, y1);
  }
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1, lw * 0.75);
  ctx.stroke();
  // Posts with a curl on top.
  ctx.beginPath();
  for (let i = 0; i <= POSTS; i++) {
    const px = pts[i * 2]!;
    const py = pts[i * 2 + 1]!;
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - ph);
    ctx.arc(px + ph * 0.18, py - ph, ph * 0.18, Math.PI, Math.PI * 2.6);
  }
  ctx.lineWidth = Math.max(1.2, lw * 1.1);
  ctx.stroke();
}

/** The flower bed with its railing, the pile of pumpkins and the giant jack-o'-lantern on top. */
export function centerpiece(ctx: Ctx, s: Scene): void {
  const { x, y, k } = spot(s, CENTERPIECE.X, CENTERPIECE.z);
  const rx = CENTERPIECE.bed * s.u * k;
  if (y - rx * 3.4 > s.cssH) return;
  const ry = rx * 0.26;
  const lw = inkW(s, k);
  const ph = rx * 0.32;

  // Warm light pooled round the bed.
  ctx.fillStyle = alpha(ORANGE_LIGHT, 0.16);
  ctx.beginPath();
  oval(ctx, x, y + ry * 0.4, rx * 1.7, ry * 1.9);
  ctx.fill();

  railing(ctx, x, y, rx * 1.1, ry * 1.15, ph, true, lw);
  // The bed: a ring of stone kerb round dark soil, mums in four colors.
  ctx.beginPath();
  oval(ctx, x, y, rx, ry);
  ctx.fillStyle = mix(BONE_SHADE, INK, 0.25);
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  oval(ctx, x, y - ry * 0.18, rx * 0.9, ry * 0.72);
  ctx.fillStyle = "#2a1c1e";
  ctx.fill();
  for (let c = 0; c < MUMS.length; c++) {
    ctx.beginPath();
    for (let i = c; i < 22; i += MUMS.length) {
      const a = hash(i + 7100) * Math.PI * 2;
      const d = 0.35 + hash(i + 7200) * 0.55;
      circle(ctx, x + Math.cos(a) * rx * 0.86 * d, y - ry * 0.18 + Math.sin(a) * ry * 0.66 * d, rx * 0.075);
    }
    ctx.fillStyle = MUMS[c]!;
    ctx.fill();
  }
  ctx.fillStyle = MOSS_DARK;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.05 + (i / 9) * 0.9);
    oval(ctx, x + Math.cos(a) * rx * 0.86, y - ry * 0.1 + Math.sin(a) * ry * 0.5, rx * 0.07, rx * 0.035, a);
  }
  ctx.fill();

  // The pile, back to front, then the giant jack-o'-lantern on top.
  for (const [px, py, pr, kind] of PILE) pumpkin(ctx, x + px * rx, y - py * rx - ry * 0.1, pr * rx, kind, lw * 0.85);
  jackOLantern(ctx, s.t, x, y - rx * PILE_TOP, JACK_R * s.u * k, lw, false, true);

  railing(ctx, x, y, rx * 1.1, ry * 1.15, ph, false, lw);
}

/** The centerpiece's screen box (railing to the jack's stem tip and vine). */
export function centerpieceBox(s: Scene): { x0: number; y0: number; x1: number; y1: number } {
  const { x, y, k } = spot(s, CENTERPIECE.X, CENTERPIECE.z);
  const rx = CENTERPIECE.bed * s.u * k;
  const jr = JACK_R * s.u * k;
  const lw = inkW(s, k);
  return {
    x0: x - rx * 1.1 - lw * 2,
    x1: x + Math.max(rx * 1.1 + rx * 0.2, jr * 1.2) + lw * 2,
    y0: y - rx * PILE_TOP - jr * 0.98 - jr * 1.45 - lw,
    y1: y + rx * 0.26 * 1.15 + lw,
  };
}

import { alpha, circle, mix, neonStroke, roundRectPath, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, GOLD, MAGENTA, ORANGE, PINK, SHADOW, SHADOW_MID, VIOLET } from "./colors";

// A roadside video arcade of our own design: a low flat-roofed block, a glass front glowing
// magenta with cabinet silhouettes inside (their screens flicker), a lit doorway, and a rooftop
// marquee with ARCADE in pink neon script framed by chaser bulbs. Planted on the grid at its
// depth; all measurements are u at the tower's depth, scaled by TOWER_DEPTH / z.

export interface ArcadeSpot {
  /** Center x (u from the screen center) and depth on the floor. */
  x: number;
  z: number;
}

/** Building size (u at the tower's depth). */
const ARCADE_W = 0.104;
const ARCADE_H = 0.066;
/** Marquee board above the roof. */
const SIGN_W = 0.108;
const SIGN_H = 0.04;
const SIGN_LIFT = 0.013;
/** Total height including the sign, for layout checks. */
const ARCADE_TOP = ARCADE_H + SIGN_LIFT + SIGN_H;

const SCREENS = [CYAN, GOLD, PINK] as const;
/** Cabinets behind the glass: left edges as fractions of its width (two each side of the door). */
const CABINETS = [0.08, 0.26, 0.61, 0.79] as const;
const DOOR = mix(SHADOW_MID, CYAN, 0.45);
const FRAME = alpha(VIOLET, 0.7);
const TEXT_GLOW = alpha(PINK, 0.3);
const TEXT_FILL = mix(PINK, "#ffffff", 0.35);
const GLASS_TOP = mix(SHADOW_MID, MAGENTA, 0.35);
const GLASS_BOTTOM = mix(SHADOW_MID, PINK, 0.12);
const SPILL = alpha(MAGENTA, 0.16);
const BULB_ON = mix(GOLD, "#ffffff", 0.3);
const BULB_OFF = mix(SHADOW, ORANGE, 0.3);
const BULBS_X = 9;
const BULBS_Y = 2;
/** Bulb positions round the board (fractions of its inset box), in chase order. */
const BULBS: readonly (readonly [number, number])[] = [
  ...Array.from({ length: BULBS_X }, (_, i) => [i / (BULBS_X - 1), 0] as const),
  ...Array.from({ length: BULBS_Y }, (_, i) => [1, (i + 1) / (BULBS_Y + 1)] as const),
  ...Array.from({ length: BULBS_X }, (_, i) => [1 - i / (BULBS_X - 1), 1] as const),
  ...Array.from({ length: BULBS_Y }, (_, i) => [0, 1 - (i + 1) / (BULBS_Y + 1)] as const),
];

/** The marquee font, rebuilt only when its size changes (font strings are slow to parse). */
let fontSize = -1;
let font = "";

export function drawArcade(ctx: Ctx, s: Scene, spot: ArcadeSpot): void {
  const u = s.u;
  const k = TOWER_DEPTH / spot.z;
  const by = fieldY(s, spot.z);
  if (by - ARCADE_TOP * u * k > s.cssH) return;
  const cx = s.cssW / 2 + spot.x * u;
  const W = ARCADE_W * u * k;
  const H = ARCADE_H * u * k;
  const x0 = cx - W / 2;
  const top = by - H;
  const tube = Math.max(1, u * 0.0028 * k);

  // Light spilling from the glass onto the grid in front.
  ctx.beginPath();
  ctx.ellipse(cx, by + H * 0.04, W * 0.54, H * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = SPILL;
  ctx.fill();

  // Body, with a parapet step at the top.
  ctx.beginPath();
  ctx.rect(x0, top, W, H);
  ctx.rect(x0 - W * 0.03, top - H * 0.06, W * 1.06, H * 0.1);
  ctx.fillStyle = SHADOW_MID;
  ctx.fill();

  // Glass front: a magenta glow behind cabinet silhouettes.
  const gx = x0 + W * 0.07;
  const gy = top + H * 0.3;
  const gw = W * 0.86;
  const gh = H * 0.62;
  const glass = ctx.createLinearGradient(0, gy, 0, gy + gh);
  glass.addColorStop(0, GLASS_TOP);
  glass.addColorStop(1, GLASS_BOTTOM);
  ctx.fillStyle = glass;
  ctx.fillRect(gx, gy, gw, gh);

  // Doorway in the middle, lit cyan.
  const dw = W * 0.16;
  const dx = cx - dw / 2;
  ctx.fillStyle = DOOR;
  ctx.fillRect(dx, gy + gh * 0.12, dw, gh * 0.88);

  // Cabinets: two each side of the door, tall boxes with a slanted control deck.
  const cw = gw * 0.13;
  const ch = gh * 0.72;
  ctx.beginPath();
  for (const f of CABINETS) {
    const x = gx + gw * f;
    const y = gy + gh - ch;
    ctx.moveTo(x, gy + gh);
    ctx.lineTo(x, y + ch * 0.12);
    ctx.lineTo(x + cw * 0.15, y);
    ctx.lineTo(x + cw, y);
    ctx.lineTo(x + cw, y + ch * 0.48);
    ctx.lineTo(x + cw * 1.12, y + ch * 0.58);
    ctx.lineTo(x + cw, y + ch * 0.66);
    ctx.lineTo(x + cw, gy + gh);
    ctx.closePath();
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();
  for (let i = 0; i < CABINETS.length; i++) {
    const f = CABINETS[i]!;
    const flick = 0.55 + 0.45 * Math.sin(s.t * (5 + i * 1.7) + i * 2.3) * Math.sin(s.t * 2.1 + i);
    ctx.fillStyle = SCREENS[i % SCREENS.length]!;
    ctx.globalAlpha = 0.45 + 0.4 * flick;
    ctx.fillRect(gx + gw * f + cw * 0.2, gy + gh - ch + ch * 0.14, cw * 0.66, ch * 0.24);
  }
  ctx.globalAlpha = 1;

  // Neon trim: the roofline and the glass frame.
  ctx.beginPath();
  ctx.moveTo(x0 - W * 0.03, top - H * 0.06);
  ctx.lineTo(x0 + W * 1.03, top - H * 0.06);
  neonStroke(ctx, CYAN, tube, 2.2);
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = tube * 0.8;
  ctx.stroke();

  // Marquee board on two posts.
  const sw = SIGN_W * u * k;
  const sh = SIGN_H * u * k;
  const sy = top - H * 0.06 - SIGN_LIFT * u * k - sh;
  const sx = cx - sw / 2;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(cx - sw * 0.3, sy + sh, Math.max(1, sw * 0.03), SIGN_LIFT * u * k);
  ctx.fillRect(cx + sw * 0.27, sy + sh, Math.max(1, sw * 0.03), SIGN_LIFT * u * k);
  roundRectPath(ctx, sx, sy, sw, sh, sh * 0.18);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  neonStroke(ctx, ORANGE, tube * 0.9, 2.2);

  // Chaser bulbs round the board: every third one lit, running.
  const step = Math.floor(s.t * 6);
  const br = Math.max(0.7, u * 0.0028 * k);
  const inset = sh * 0.16;
  for (let pass = 0; pass < 2; pass++) {
    const lit = pass === 0;
    ctx.beginPath();
    for (let n = 0; n < BULBS.length; n++) {
      if (((n + step) % 3 === 0) !== lit) continue;
      const [fx, fy] = BULBS[n]!;
      circle(ctx, sx + inset + (sw - inset * 2) * fx, sy + inset + (sh - inset * 2) * fy, br);
    }
    ctx.fillStyle = lit ? BULB_ON : BULB_OFF;
    ctx.fill();
  }

  // ARCADE in pink neon script.
  const size = sh * 0.5;
  ctx.save();
  const px = Math.round(size * 2) / 2;
  if (px !== fontSize) {
    fontSize = px;
    font = `italic 700 ${px}px Orbitron, 'Trebuchet MS', 'Arial Black', sans-serif`;
  }
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ty = sy + sh * 0.53;
  ctx.lineJoin = "round";
  ctx.strokeStyle = TEXT_GLOW;
  ctx.lineWidth = Math.max(2, size * 0.32);
  ctx.strokeText("ARCADE", cx, ty, sw * 0.74);
  ctx.fillStyle = TEXT_FILL;
  ctx.fillText("ARCADE", cx, ty, sw * 0.74);
  ctx.restore();
}

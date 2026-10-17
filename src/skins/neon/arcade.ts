import { alpha, circle, mix, oval, roundRectPath, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, GOLD, MAGENTA, ORANGE, PINK, SHADOW, SHADOW_MID, VIOLET } from "./colors";
import { arcadeDoorAt } from "./show";
import { hotTube } from "./tube";

// A roadside video arcade of our own design: a low flat-roofed block, a glass front glowing
// magenta with cabinet silhouettes inside (their screens flicker), a glass door in the middle,
// and a rooftop marquee with ARCADE in pink neon script framed by chaser bulbs. Planted on the
// grid at its depth; all measurements are u at the tower's depth, scaled by TOWER_DEPTH / z.
// In the show (show.ts) its door slides open, the light inside spilling out across the floor,
// to let the driver out (driver.ts) and, later, back in.

export interface ArcadeSpot {
  /** Center x (u from the screen center) and depth on the floor. */
  x: number;
  z: number;
}

/** Where it stands: under the left palm, on the side props' line (ground.ts). */
export const ARCADE: ArcadeSpot = { x: -0.34, z: 2 };

/** Building size (u at the tower's depth). */
const ARCADE_W = 0.104;
const ARCADE_H = 0.08;
/** Marquee board above the roof. */
const SIGN_W = 0.108;
const SIGN_H = 0.04;
const SIGN_LIFT = 0.013;
/** Total height including the sign, for layout checks. */
const ARCADE_TOP = ARCADE_H + SIGN_LIFT + SIGN_H;
/** The glass front: its top and height (shares of the building's height). */
const GLASS_Y = 0.17;
const GLASS_H = 0.75;
/** The door: width (share of the building's), from the glass's top down to the floor. */
const DOOR_W = 0.26;

const SCREENS = [CYAN, GOLD, PINK] as const;
/** Cabinets behind the glass: left edges as fractions of its width (two each side of the door). */
const CABINETS = [0.04, 0.18, 0.69, 0.83] as const;
const DOOR_GLASS = mix(SHADOW_MID, CYAN, 0.28);
const DOOR_FRAME = alpha(CYAN, 0.8);
const DOOR_BAR = mix(CYAN, "#ffffff", 0.5);
/** The light inside, seen through the open door and spilling out over the floor. */
const LIGHT = mix(CYAN, "#ffffff", 0.62);
const LIGHT_SPILL = alpha(mix(CYAN, "#ffffff", 0.4), 0.26);
/** How far out in front (depth) the light from the open door reaches, and how much it widens. */
const SPILL_DEPTH = 0.13;
const SPILL_SPREAD = 2.2;
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

/** The glass gradient, in a unit box (built once per context). */
const glassCache = { ctx: null as Ctx | null, fill: null as CanvasGradient | null };

/** The marquee font, rebuilt only when its size changes (font strings are slow to parse). */
let fontSize = -1;
let font = "";

/** The doorway on screen (px): its left edge, top, width and height (its foot on the floor). */
const DOORWAY = { x: 0, y: 0, w: 0, h: 0 };
export function doorway(s: Scene, spot: ArcadeSpot): typeof DOORWAY {
  const k = TOWER_DEPTH / spot.z;
  const W = ARCADE_W * s.u * k;
  const H = ARCADE_H * s.u * k;
  const by = fieldY(s, spot.z);
  DOORWAY.w = W * DOOR_W;
  DOORWAY.x = s.cssW / 2 + spot.x * s.u - DOORWAY.w / 2;
  DOORWAY.y = by - H * (1 - GLASS_Y);
  DOORWAY.h = by - DOORWAY.y;
  return DOORWAY;
}

/** Draws whoever stands in the open doorway (seen against the light, under the door as it slides). */
export type InDoor = (ctx: Ctx, s: Scene) => void;

export function drawArcade(ctx: Ctx, s: Scene, spot: ArcadeSpot, inDoor?: InDoor): void {
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
  oval(ctx, cx, by + H * 0.04, W * 0.54, H * 0.13);
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
  const gy = top + H * GLASS_Y;
  const gw = W * 0.86;
  const gh = H * GLASS_H;
  if (glassCache.ctx !== ctx || !glassCache.fill) {
    const g = ctx.createLinearGradient(0, 0, 0, 1);
    g.addColorStop(0, GLASS_TOP);
    g.addColorStop(1, GLASS_BOTTOM);
    glassCache.ctx = ctx;
    glassCache.fill = g;
  }
  // The gradient is built in a unit box: draw the glass scaled into place.
  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(gw, gh);
  ctx.fillStyle = glassCache.fill;
  ctx.fillRect(0, 0, 1, 1);
  ctx.restore();

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
  hotTube(ctx, CYAN, tube, 2.2);
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = tube * 0.8;
  ctx.stroke();

  // The door, down to the floor: shut, a dark glass panel with a push bar; open, it has slid
  // aside into the wall and the light inside pours out over the floor.
  const dw = W * DOOR_W;
  const dx = cx - dw / 2;
  const open = arcadeDoorAt(s.t);
  if (open > 0) {
    const near = fieldY(s, spot.z - SPILL_DEPTH);
    const spread = (dw / 2) * (1 + (SPILL_SPREAD - 1) * open);
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.05, by);
    ctx.lineTo(dx + dw * 0.95, by);
    ctx.lineTo(cx + spread, near);
    ctx.lineTo(cx - spread, near);
    ctx.closePath();
    ctx.globalAlpha = open;
    ctx.fillStyle = LIGHT_SPILL;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = LIGHT;
    ctx.fillRect(dx, gy, dw, by - gy);
    if (inDoor) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, gy, dw, by - gy);
      ctx.clip();
      inDoor(ctx, s);
      ctx.restore();
    }
  }
  const panel = dw * (1 - open);
  if (panel > 0.2) {
    const px0 = dx + dw - panel;
    ctx.fillStyle = DOOR_GLASS;
    ctx.fillRect(px0, gy, panel, by - gy);
    // The push bar across it, at hand height.
    const bar = by - (by - gy) * 0.48;
    ctx.beginPath();
    ctx.moveTo(px0 + panel * 0.18, bar);
    ctx.lineTo(px0 + panel * 0.82, bar);
    ctx.strokeStyle = DOOR_BAR;
    ctx.lineWidth = Math.max(1, tube * 0.9);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px0, by);
    ctx.lineTo(px0, gy);
    ctx.strokeStyle = DOOR_FRAME;
    ctx.lineWidth = Math.max(0.8, tube * 0.6);
    ctx.stroke();
  }
  // The doorframe.
  ctx.beginPath();
  ctx.moveTo(dx, by);
  ctx.lineTo(dx, gy);
  ctx.lineTo(dx + dw, gy);
  ctx.lineTo(dx + dw, by);
  ctx.strokeStyle = DOOR_FRAME;
  ctx.lineWidth = Math.max(0.8, tube * 0.8);
  ctx.lineCap = "butt";
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
  hotTube(ctx, ORANGE, tube * 0.9, 2.2);

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

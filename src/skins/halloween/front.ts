import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { BONE, INK, IRON, LAMP, LAMP_CORE, LEAVES, ORANGE, ORANGE_DARK, STEM } from "./common";
import { jackOLantern } from "./pumpkin";

// The near edge we look over, in front of the tower: the churchyard's low wrought-iron railing,
// its spear-tipped posts joined by bars that curl into spirals between them (a cobweb strung
// across one bay near each side), over a path of dark flagstones; at the sides, hay bales heaped
// with pumpkins, a carved jack-o'-lantern and a candle lantern each, and leaf piles. It covers the
// base world's band and tiles, and drops away with them as you climb.

/** How far the base band's grass tips reach above its top (u: src/base/world.ts's tiles). */
const GRASS_TIPS = 0.026;
/** The railing's height above the band's top, the post spacing (u). */
const RAIL_H = 0.04;
const POST = 0.07;

const FLAG = "#2a2638";
const FLAG_JOINT = "#171320";
const FLAG_LIGHT = "#363149";
// Straw by night: a dusky ochre, a step lighter where the lantern catches its top (glow is the
// only brightness: the jack-o'-lanterns and the lanterns on the bales outshine it).
const HAY = "#a98340";
const HAY_LIGHT = "#c29a52";
const HAY_DARK = "#735224";

/** The railing along the top: posts with spear tips, two bars, spirals between the posts. */
function railing(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const W = s.cssW;
  const step = POST * u;
  const h = RAIL_H * u;
  const x0 = ((W / 2) % step) - step;
  ctx.beginPath();
  for (let x = x0; x < W + step; x += step) {
    ctx.moveTo(x, top + u * 0.01);
    ctx.lineTo(x, top - h);
  }
  ctx.moveTo(x0, top - h * 0.82);
  ctx.lineTo(W + step, top - h * 0.82);
  ctx.moveTo(x0, top - h * 0.12);
  ctx.lineTo(W + step, top - h * 0.12);
  // Spirals between the posts, curling from the lower bar.
  for (let x = x0; x < W + step; x += step) {
    const cx = x + step / 2;
    const r = h * 0.2;
    ctx.moveTo(cx - r * 1.4, top - h * 0.12);
    ctx.quadraticCurveTo(cx - r * 1.2, top - h * 0.5, cx, top - h * 0.5);
    ctx.arc(cx, top - h * 0.5 + r, r, -Math.PI / 2, Math.PI * 1.1);
    ctx.moveTo(cx + r * 1.4, top - h * 0.82);
    ctx.quadraticCurveTo(cx + r * 1.2, top - h * 0.5, cx + r * 0.2, top - h * 0.48);
  }
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1.2, lw * 0.9);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  // Spear tips.
  ctx.beginPath();
  for (let x = x0; x < W + step; x += step) {
    ctx.moveTo(x - u * 0.007, top - h);
    ctx.lineTo(x, top - h - u * 0.016);
    ctx.lineTo(x + u * 0.008, top - h);
    ctx.closePath();
  }
  ctx.fillStyle = IRON;
  ctx.fill();
}

/** A cobweb strung across a bay of the railing, from post (x0) to post (x1). */
function cobweb(ctx: Ctx, x0: number, x1: number, top: number, h: number, lw: number): void {
  const cx = x0;
  const cy = top - h;
  const R = (x1 - x0) * 0.95;
  ctx.beginPath();
  const spokes = 5;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8);
  }
  for (let ring = 1; ring <= 3; ring++) {
    const r = (R * ring) / 3.2;
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * (Math.PI / 2);
      const a1 = ((i + 1) / spokes) * (Math.PI / 2);
      const am = (a0 + a1) / 2;
      ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.8);
      ctx.quadraticCurveTo(cx + Math.cos(am) * r * 0.8, cy + Math.sin(am) * r * 0.64, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.8);
    }
  }
  ctx.strokeStyle = alpha(BONE, 0.75);
  ctx.lineWidth = Math.max(0.6, lw * 0.35);
  ctx.stroke();
}

/** A hay bale at (x, y) (bottom middle), w wide: straw lines and two binding twines, inked. */
function bale(ctx: Ctx, x: number, y: number, w: number, lw: number): void {
  const h = w * 0.48;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h * 0.86);
  ctx.quadraticCurveTo(x - w / 2, y - h, x - w * 0.44, y - h);
  ctx.lineTo(x + w * 0.44, y - h);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.86);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = HAY;
  ctx.fill();
  ctx.fillStyle = HAY_LIGHT;
  ctx.fillRect(x - w * 0.46, y - h * 0.94, w * 0.92, h * 0.22);
  ctx.fillStyle = HAY_DARK;
  ctx.fillRect(x - w / 2, y - h * 0.18, w, h * 0.18);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const sx = x - w * 0.42 + hash(i + 8100) * w * 0.84;
    const sy = y - h * (0.2 + hash(i + 8200) * 0.6);
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * 0.07, sy - h * 0.04);
  }
  ctx.strokeStyle = HAY_DARK;
  ctx.lineWidth = Math.max(0.8, lw * 0.5);
  ctx.stroke();
  ctx.beginPath();
  for (const f of [-0.22, 0.22]) {
    ctx.moveTo(x + f * w, y);
    ctx.lineTo(x + f * w, y - h);
  }
  ctx.strokeStyle = mix(HAY_DARK, INK, 0.4);
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h * 0.86);
  ctx.quadraticCurveTo(x - w / 2, y - h, x - w * 0.44, y - h);
  ctx.lineTo(x + w * 0.44, y - h);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.86);
  ctx.lineTo(x + w / 2, y);
  ink(ctx, lw, INK);
}

/** A plain pumpkin sitting at (x, y), r round. */
function pumpkin(ctx: Ctx, x: number, y: number, r: number, lw: number): void {
  const cy = y - r * 0.85;
  ctx.beginPath();
  oval(ctx, x, cy, r * 1.2, r * 0.88);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  ctx.ellipse(x, cy, r * 1.14, r * 0.82, 0, 0.12, Math.PI - 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.42 * Math.cos(Math.PI * 0.6), cy + r * 0.86 * Math.sin(Math.PI * 0.6));
  ctx.ellipse(x, cy, r * 0.42, r * 0.86, 0, Math.PI * 0.6, Math.PI * 1.4);
  ctx.strokeStyle = ORANGE_DARK;
  ctx.lineWidth = Math.max(0.8, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, x, cy, r * 1.2, r * 0.88);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, cy - r * 0.8);
  ctx.lineTo(x - r * 0.04, cy - r * 1.12);
  ctx.lineTo(x + r * 0.18, cy - r * 1.16);
  ctx.lineTo(x + r * 0.1, cy - r * 0.8);
  ctx.closePath();
  ctx.fillStyle = STEM;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** A candle lantern on the ground: an iron frame round a glowing pane, a ring on top. */
function lantern(ctx: Ctx, x: number, y: number, h: number, flick: number, lw: number): void {
  ctx.fillStyle = alpha(LAMP, 0.2 + 0.08 * flick);
  ctx.beginPath();
  circle(ctx, x, y - h * 0.5, h * 1.1);
  ctx.fill();
  const w = h * 0.6;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h * 0.85, w, h * 0.75);
  ctx.fillStyle = flick > 0.5 ? LAMP_CORE : LAMP;
  ctx.fill();
  ink(ctx, lw * 0.9, IRON);
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.85);
  ctx.lineTo(x, y - h * 0.1);
  ctx.moveTo(x - w * 0.62, y - h * 0.85);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w * 0.62, y - h * 0.85);
  ctx.closePath();
  ctx.moveTo(x - w * 0.6, y);
  ctx.lineTo(x + w * 0.6, y);
  ink(ctx, lw * 0.9, IRON);
  ctx.beginPath();
  ctx.arc(x, y - h * 1.08, h * 0.1, 0, Math.PI * 2);
  ink(ctx, lw * 0.7, IRON);
}

/** A heap of fallen leaves at (x, y), w wide. */
function leafPile(ctx: Ctx, x: number, y: number, w: number, lw: number, seed: number, t: number): void {
  const h = w * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.45, y - h * 0.9, x - w * 0.15, y - h * 1.1, x + w * 0.05, y - h);
  ctx.bezierCurveTo(x + w * 0.3, y - h * 0.95, x + w * 0.48, y - h * 0.6, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = mix(LEAVES[3], INK, 0.2);
  ctx.fill();
  ink(ctx, lw, INK);
  for (let c = 0; c < LEAVES.length; c++) {
    ctx.beginPath();
    for (let i = c; i < 8; i += LEAVES.length) {
      const f = (i + 0.5) / 8;
      const across = (f - 0.5) * 1.6;
      const lift = i % 3 === 1 ? Math.max(0, Math.sin(t * 1.3 + seed + i)) * h * 0.25 : 0;
      const lx = x + across * w * 0.4;
      const ly = y - h * (0.4 + 0.5 * (1 - across * across)) * (0.85 + hash(i + seed * 40 + 900) * 0.25) - lift;
      const len = w * 0.16;
      const a = (hash(i + seed * 40 + 920) - 0.5) * 2.2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.moveTo(lx + ca * len / 2, ly + sa * len / 2);
      ctx.quadraticCurveTo(lx - sa * len * 0.4, ly + ca * len * 0.4, lx - ca * len / 2, ly - sa * len / 2);
      ctx.quadraticCurveTo(lx + sa * len * 0.4, ly - ca * len * 0.4, lx + ca * len / 2, ly + sa * len / 2);
      ctx.closePath();
    }
    ctx.fillStyle = LEAVES[c]!;
    ctx.fill();
  }
}

/** The near edge: the railing over the flagstone path, hay bales, pumpkins, lanterns, cobwebs and leaf piles. */
export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = layerGround(s, 1.6) + u * 0.36;
  if (top - u * 0.12 > s.cssH) return;
  const W = s.cssW;
  const lw = Math.max(1.2, u * 0.0056);
  const crest = top - u * GRASS_TIPS;

  // The path: dark flagstones from just under the railing to the bottom of the screen.
  ctx.fillStyle = FLAG;
  ctx.fillRect(0, crest, W, s.cssH - crest + 1);
  const fh = u * 0.05;
  const fw = u * 0.11;
  ctx.fillStyle = FLAG_LIGHT;
  ctx.beginPath();
  for (let row = 0, y = top + u * 0.012; y < s.cssH; row++, y += fh) {
    for (let x = ((W / 2) % fw) - fw + (row % 2 ? fw / 2 : 0); x < W; x += fw) ctx.rect(x + u * 0.004, y + u * 0.004, fw - u * 0.008, fh * 0.35);
  }
  ctx.fill();
  ctx.beginPath();
  for (let row = 0, y = top + u * 0.012; y < s.cssH; row++, y += fh) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    for (let x = ((W / 2) % fw) - fw + (row % 2 ? fw / 2 : 0); x < W; x += fw) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + fh);
    }
  }
  ctx.strokeStyle = FLAG_JOINT;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.stroke();
  // Grass along the railing's foot.
  ctx.fillStyle = "#24392c";
  ctx.fillRect(0, crest, W, top + u * 0.012 - crest);

  railing(ctx, s, top, lw);
  const step = POST * u;
  const x0 = ((W / 2) % step) - step;
  // A cobweb in a bay near each side.
  const left = x0 + step * Math.max(1, Math.round((u * 0.06 - x0) / step));
  const right = x0 + step * Math.round((W - u * 0.14 - x0) / step);
  cobweb(ctx, left, left + step, top, RAIL_H * u * 0.82, lw);
  ctx.save();
  ctx.translate(right * 2 + step, 0);
  ctx.scale(-1, 1);
  cobweb(ctx, right, right + step, top, RAIL_H * u * 0.82, lw);
  ctx.restore();

  frontProps(ctx, s);
}

/** The band's top this frame (the railing's foot), or null once it has dropped below the screen. */
export function bandTop(s: Scene): number | null {
  const top = layerGround(s, 1.6) + s.u * 0.36;
  return top - s.u * 0.12 > s.cssH ? null : top;
}

/** The hay bales at the sides, heaped with pumpkins and a jack-o'-lantern, the lanterns and the leaf piles. */
export function frontProps(ctx: Ctx, s: Scene): void {
  const top = bandTop(s);
  if (top === null) return;
  const u = s.u;
  const W = s.cssW;
  const lw = Math.max(1.2, u * 0.0056);
  // Hay bales at the sides, heaped with pumpkins, a jack-o'-lantern and a lantern; leaf piles.
  const flick = 0.5 + 0.5 * Math.sin(s.t * 8) * Math.sin(s.t * 4.7 + 1);
  const bw = Math.min(u * 0.15, W * 0.2);
  const by = top + u * 0.075;
  const lx = u * 0.02 + bw / 2;
  const rx = W - u * 0.02 - bw / 2;
  bale(ctx, lx, by, bw, lw);
  bale(ctx, rx, by, bw, lw);
  const bh = bw * 0.48;
  jackOLantern(ctx, s.t, lx + bw * 0.12, by - bh + u * 0.004, bw * 0.2, lw, false);
  pumpkin(ctx, lx - bw * 0.28, by - bh + u * 0.004, bw * 0.13, lw);
  pumpkin(ctx, rx - bw * 0.18, by - bh + u * 0.004, bw * 0.16, lw);
  jackOLantern(ctx, s.t + 1.3, rx + bw * 0.22, by - bh + u * 0.004, bw * 0.14, lw, false);
  lantern(ctx, lx + bw * 0.62, by + u * 0.006, u * 0.045, flick, lw);
  lantern(ctx, rx - bw * 0.62, by + u * 0.006, u * 0.045, 1 - flick, lw);
  leafPile(ctx, Math.min(W * 0.3, lx + bw * 1.15), by + u * 0.02, u * 0.1, lw, 1, s.t);
  leafPile(ctx, Math.max(W * 0.7, rx - bw * 1.15), by + u * 0.02, u * 0.09, lw, 2, s.t);
}

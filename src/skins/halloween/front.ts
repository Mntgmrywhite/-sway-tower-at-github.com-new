import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";
import { candles, FACE, jackFace, swing, waxDrip } from "./ambient";
import { cast } from "./cast";
import { BONE, FOG, FOG_GHOST, FOG_LIGHT, INK, IRON, LAMP, LAMP_CORE, LEAVES, alphaStep, mixed, ORANGE, ORANGE_DARK, STEM } from "./common";
import { coverTop, nearTop } from "./lines";
import { jackOLantern } from "./pumpkin";
import { HALO_REACH, moonAt } from "./sky";
import { SLOT } from "./slot";
import { LOOP_PERIOD } from "./tone";

// The near edge we look over, in front of the tower: the churchyard's low wrought-iron railing,
// its spear-tipped posts joined by bars that curl into spirals between them (a cobweb strung
// across one bay near each side, its threads stirring in the draught), over a path of dark
// flagstones; at the sides, hay bales heaped with pumpkins, a carved jack-o'-lantern that blinks and
// pulls faces now and then (the left one winks first, at BALE_WINK), candles running with wax, a
// lantern hanging from an iron crook that swings when a floor lands, and leaf piles. The cast's
// FRONT slot comes after the railing (the rat runs along its top bar and ducks behind the bales).
// Over it all, patches of fog drift by at their own speeds, nearer than anything (p FOG_P): low
// over the churchyard at the start, then out in the lanes as you climb. It covers the base world's
// band and tiles, and drops away with them as you climb.

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

/** How far each post leans (its top's offset, in units of the railing's height): crooked, every one its own way (a fixed table). */
const LEAN = Float64Array.from({ length: 32 }, (_, k) => (hash(k * 13 + 8300) - 0.5) * 0.22);

/**
 * The railing along the top, Burton ironwork: crooked posts each leaning its own way, every other
 * one topped by a curl winding into a spiral (the rest by a spear), two bars, and an S-scroll
 * curling between each pair of posts.
 */
function railing(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const W = s.cssW;
  const step = POST * u;
  const h = RAIL_H * u;
  const x0 = ((W / 2) % step) - step;
  ctx.beginPath();
  let k = 0;
  for (let x = x0; x < W + step; x += step, k++) {
    ctx.moveTo(x, top + u * 0.01);
    ctx.lineTo(x + LEAN[k & 31]! * h, top - h);
  }
  ctx.moveTo(x0, top - h * 0.82);
  ctx.lineTo(W + step, top - h * 0.82);
  ctx.moveTo(x0, top - h * 0.12);
  ctx.lineTo(W + step, top - h * 0.12);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(1.2, lw * 0.9);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  // S-scrolls between the posts, and a curl winding round on every other post's top.
  ctx.beginPath();
  const r = h * 0.17;
  const c = u * 0.008;
  k = 0;
  for (let x = x0; x < W + step; x += step, k++) {
    const cx = x + step / 2;
    // (Curls as quadratic curves: much cheaper to build than arcs, and as round at this size.)
    const yl = top - h * 0.47;
    ctx.moveTo(cx - r * 2.2, top - h * 0.12);
    ctx.quadraticCurveTo(cx - r * 2, yl, cx - r * 0.6, yl);
    ctx.quadraticCurveTo(cx + r * 0.45, yl, cx + r * 0.4, yl + r);
    ctx.quadraticCurveTo(cx + r * 0.35, yl + r * 1.9, cx - r * 0.55, yl + r * 1.6);
    ctx.moveTo(cx + r * 2.2, top - h * 0.82);
    ctx.quadraticCurveTo(cx + r * 2, yl, cx + r * 0.6, yl);
    ctx.quadraticCurveTo(cx - r * 0.45, yl, cx - r * 0.4, yl - r);
    ctx.quadraticCurveTo(cx - r * 0.35, yl - r * 1.9, cx + r * 0.55, yl - r * 1.6);
    if (k & 1) {
      const tx = x + LEAN[k & 31]! * h;
      ctx.moveTo(tx, top - h);
      ctx.quadraticCurveTo(tx, top - h - c * 1.5, tx + c, top - h - c * 1.5);
      ctx.quadraticCurveTo(tx + c * 2, top - h - c * 1.4, tx + c * 1.6, top - h - c * 0.5);
      ctx.quadraticCurveTo(tx + c * 1.1, top - h, tx + c * 0.7, top - h - c * 0.6);
    }
  }
  ctx.lineWidth = Math.max(1, lw * 0.75);
  ctx.stroke();
  // Spear tips on the rest.
  ctx.beginPath();
  k = 0;
  for (let x = x0; x < W + step; x += step, k++) {
    if (k & 1) continue;
    const tx = x + LEAN[k & 31]! * h;
    ctx.moveTo(tx - u * 0.007, top - h);
    ctx.lineTo(tx + LEAN[k & 31]! * u * 0.02, top - h - u * 0.018);
    ctx.lineTo(tx + u * 0.008, top - h);
    ctx.closePath();
  }
  ctx.fillStyle = IRON;
  ctx.fill();
}

/** The cobwebs' threads, and the bales' twine. */
const WEB = alpha(BONE, 0.75);
const TWINE = mix(HAY_DARK, INK, 0.4);
const BURLAP = "#8a6c3e";
/** The flagstones' jitter (fractions of a stone's width), a fixed table. */
const JIT = Float64Array.from({ length: 64 }, (_, i) => (hash(i * 7 + 8400) - 0.5) * 0.24);

/** How far a cobweb's thread `i` reaches out now (a factor near 1). */
function stir(t: number, i: number): number {
  return 1 + 0.045 * Math.sin(t * 2.5 + i * 1.3);
}

/** A cobweb strung across a bay of the railing, from post (x0) to post (x1). */
function cobweb(ctx: Ctx, x0: number, x1: number, top: number, h: number, lw: number, t: number): void {
  const cx = x0;
  const cy = top - h;
  const R = (x1 - x0) * 0.95;
  ctx.beginPath();
  const spokes = 5;
  // The threads stir in the draught (0.4 Hz), each a little out of step; the rings belly in and out.
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    const k = stir(t, i);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * 0.8 * k);
  }
  for (let ring = 1; ring <= 3; ring++) {
    const r = (R * ring) / 3.2;
    const sag = 0.8 + 0.06 * Math.sin(t * 2.5 + ring);
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * (Math.PI / 2);
      const a1 = ((i + 1) / spokes) * (Math.PI / 2);
      const am = (a0 + a1) / 2;
      const k0 = 1 + (stir(t, i) - 1) * (ring / 3);
      const k1 = 1 + (stir(t, i + 1) - 1) * (ring / 3);
      ctx.moveTo(cx + Math.cos(a0) * r * k0, cy + Math.sin(a0) * r * 0.8 * k0);
      ctx.quadraticCurveTo(cx + Math.cos(am) * r * sag, cy + Math.sin(am) * r * 0.64 * sag / 0.8, cx + Math.cos(a1) * r * k1, cy + Math.sin(a1) * r * 0.8 * k1);
    }
  }
  ctx.strokeStyle = WEB;
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
  // A burlap patch stitched on, and the twine bands cross-stitched round it (Burton's seams).
  ctx.fillStyle = BURLAP;
  ctx.fillRect(x - w * 0.12, y - h * 0.62, w * 0.2, h * 0.32);
  ctx.beginPath();
  for (const f of [-0.22, 0.22]) {
    ctx.moveTo(x + f * w, y);
    ctx.lineTo(x + f * w, y - h);
  }
  ctx.rect(x - w * 0.12, y - h * 0.62, w * 0.2, h * 0.32);
  for (let i = 0; i < 4; i++) {
    const sy = y - h * (0.18 + i * 0.2);
    for (const f of [-0.22, 0.22]) {
      ctx.moveTo(x + f * w - w * 0.03, sy - h * 0.05);
      ctx.lineTo(x + f * w + w * 0.03, sy + h * 0.05);
      ctx.moveTo(x + f * w - w * 0.03, sy + h * 0.05);
      ctx.lineTo(x + f * w + w * 0.03, sy - h * 0.05);
    }
  }
  ctx.strokeStyle = TWINE;
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

/**
 * A candle lantern hanging from an iron crook planted at (x, y): a post `h` tall curling over at the
 * top toward `dir`, the lantern on its hook swinging by `a` (rad): an iron frame round a glowing
 * pane, a ring on top.
 */
function lantern(ctx: Ctx, x: number, y: number, h: number, flick: number, lw: number, dir: number, a: number): void {
  const post = h * 2.3;
  const hx = x + dir * h * 0.42;
  const hy = y - post + h * 0.12;
  // The crook: a post that curls over, a scroll at its foot.
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.1);
  ctx.lineTo(x, y - post + h * 0.2);
  ctx.quadraticCurveTo(x, y - post - h * 0.02, x + dir * h * 0.22, y - post - h * 0.02);
  ctx.quadraticCurveTo(hx, y - post - h * 0.02, hx, hy - h * 0.02);
  ctx.moveTo(x, y - h * 0.5);
  ctx.quadraticCurveTo(x - dir * h * 0.3, y - h * 0.5, x - dir * h * 0.3, y - h * 0.78);
  ink(ctx, Math.max(1.2, lw * 0.9), IRON);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  const w = h * 0.6;
  const top = h * 0.2;
  ctx.fillStyle = alphaStep(LAMP, 0.2 + 0.08 * flick);
  ctx.beginPath();
  circle(ctx, 0, top + h * 0.45, h * 1.0);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-w / 2, top + h * 0.15, w, h * 0.68);
  ctx.fillStyle = flick > 0.5 ? LAMP_CORE : LAMP;
  ctx.fill();
  ink(ctx, lw * 0.9, IRON);
  ctx.beginPath();
  ctx.moveTo(0, top + h * 0.15);
  ctx.lineTo(0, top + h * 0.83);
  ctx.moveTo(-w * 0.62, top + h * 0.15);
  ctx.lineTo(0, top);
  ctx.lineTo(w * 0.62, top + h * 0.15);
  ctx.closePath();
  ctx.moveTo(-w * 0.6, top + h * 0.85);
  ctx.lineTo(w * 0.6, top + h * 0.85);
  ink(ctx, lw * 0.9, IRON);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(0, h * 0.02);
  ctx.arc(0, h * 0.02 - h * 0.06, h * 0.06, Math.PI / 2, Math.PI * 2.4);
  ink(ctx, lw * 0.7, IRON);
  ctx.restore();
}

/** A heap of fallen leaves at (x, y), w wide. */
function leafPile(ctx: Ctx, x: number, y: number, w: number, lw: number, seed: number, t: number): void {
  const h = w * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.45, y - h * 0.9, x - w * 0.15, y - h * 1.1, x + w * 0.05, y - h);
  ctx.bezierCurveTo(x + w * 0.3, y - h * 0.95, x + w * 0.48, y - h * 0.6, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = mixed(LEAVES[3], INK, 0.2);
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

/** The near edge: the railing over the flagstone path, cobwebs; the cast's FRONT; hay bales, pumpkins, lanterns, candles and leaf piles; the fog. */
export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = nearTop(s);
  if (top - u * 0.12 > s.cssH) return;
  const W = s.cssW;
  const lw = Math.max(1.2, u * 0.0056);
  const crest = coverTop(s);

  // The path: dark flagstones from just under the railing to the bottom of the screen.
  ctx.fillStyle = FLAG;
  ctx.fillRect(0, crest, W, s.cssH - crest + 1);
  // Crooked, hand-cut flagstones: every joint askew, each stone's moonlit top uneven, and here and
  // there a crack curling into a spiral (the jitter is a fixed table: nothing hashed per frame).
  const fh = u * 0.05;
  const fw = u * 0.11;
  ctx.fillStyle = FLAG_LIGHT;
  ctx.beginPath();
  for (let row = 0, y = top + u * 0.012; y < s.cssH; row++, y += fh) {
    let j = 0;
    for (let x = ((W / 2) % fw) - fw + (row % 2 ? fw / 2 : 0); x < W; x += fw, j++) {
      const a = JIT[(row * 31 + j * 7) & 63]! * fw;
      const b = JIT[(row * 31 + j * 7 + 5) & 63]! * fw;
      ctx.rect(x + a + u * 0.005, y + u * 0.004, fw + b - a - u * 0.01, fh * (0.3 + JIT[(row * 13 + j) & 63]! * 0.4));
    }
  }
  ctx.fill();
  ctx.beginPath();
  for (let row = 0, y = top + u * 0.012; y < s.cssH; row++, y += fh) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + fh * 0.06);
    let j = 0;
    for (let x = ((W / 2) % fw) - fw + (row % 2 ? fw / 2 : 0); x < W; x += fw, j++) {
      const a = JIT[(row * 31 + j * 7) & 63]! * fw;
      ctx.moveTo(x + a, y);
      ctx.lineTo(x + a * 0.2, y + fh);
      if (((row * 17 + j * 5) & 15) === 3) {
        // A crack wandering across the stone, curling up at its end.
        const cx = x + fw * 0.5;
        const cy = y + fh * 0.55;
        ctx.moveTo(cx - fw * 0.25, cy + fh * 0.2);
        ctx.quadraticCurveTo(cx - fw * 0.05, cy - fh * 0.1, cx + fw * 0.08, cy);
        ctx.arc(cx + fw * 0.08, cy - fh * 0.12, fh * 0.12, Math.PI / 2, Math.PI * 2.2, true);
      }
    }
  }
  ctx.strokeStyle = FLAG_JOINT;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.stroke();
  // Grass along the railing's foot.
  ctx.fillStyle = "#18262a";
  ctx.fillRect(0, crest, W, top + u * 0.012 - crest);

  railing(ctx, s, top, lw);
  const step = POST * u;
  const x0 = ((W / 2) % step) - step;
  // A cobweb in a bay near each side.
  const left = x0 + step * Math.max(1, Math.round((u * 0.06 - x0) / step));
  const right = x0 + step * Math.round((W - u * 0.14 - x0) / step);
  cobweb(ctx, left, left + step, top, RAIL_H * u * 0.82, lw, s.t);
  ctx.save();
  ctx.translate(right * 2 + step, 0);
  ctx.scale(-1, 1);
  cobweb(ctx, right, right + step, top, RAIL_H * u * 0.82, lw, s.t + 1.7);
  ctx.restore();

  cast(ctx, s, SLOT.front);
  frontProps(ctx, s);
}

/** Everything in front of the tower: the near edge, then the fog drifting over it all. */
export function foreground(ctx: Ctx, s: Scene): void {
  front(ctx, s);
  fogPatches(ctx, s);
}

/** The band's top this frame (the railing's foot), or null once it has dropped below the screen. */
export function bandTop(s: Scene): number | null {
  const top = nearTop(s);
  return top - s.u * 0.12 > s.cssH ? null : top;
}

/** The railing's top bar this frame (screen y), for the rat's run along it. */
export function railTop(s: Scene): number {
  return nearTop(s) - RAIL_H * s.u * 0.82;
}

/** The left bale jack-o'-lantern's first change of face (a wink), and both bales' beats. */
export const BALE_WINK = 9.0;
export const BALE_FACES = [
  { first: BALE_WINK, min: 6, max: 13, seed: 811, face: FACE.wink },
  { first: 12.6, min: 7, max: 15, seed: 812, face: FACE.toothy },
] as const;
/** The candles on the bales: their first drip of wax (the opening's at 4 s). */
export const CANDLE_FIRST = 4.0;
/** Scratch: the candles' x, height and drip, three at a time. */
const CANDLES = new Float64Array(9);

/** The hay bales at the sides, heaped with pumpkins, a jack-o'-lantern, candles and a lantern on a crook; leaf piles. */
export function frontProps(ctx: Ctx, s: Scene): void {
  const top = bandTop(s);
  if (top === null) return;
  const u = s.u;
  const W = s.cssW;
  const lw = Math.max(1.2, u * 0.0056);
  const land = s.sinceLand ?? Infinity;
  const still = s.still === true;
  const flick = 0.5 + 0.5 * Math.sin(s.t * 8) * Math.sin(s.t * 4.7 + 1);
  const bw = Math.min(u * 0.15, W * 0.2);
  const by = top + u * 0.075;
  const lx = u * 0.02 + bw / 2;
  const rx = W - u * 0.02 - bw / 2;
  bale(ctx, lx, by, bw, lw);
  bale(ctx, rx, by, bw, lw);
  const bh = bw * 0.48;
  // The lanterns hang from crooks stuck in the bales' inner ends.
  const lh = u * 0.036;
  lantern(ctx, lx + bw * 0.4, by - bh * 0.4, lh, flick, lw, 1, swing(s.t, 2.1, 0.05, 0.4, land, 0.3, still));
  lantern(ctx, rx - bw * 0.4, by - bh * 0.4, lh, 1 - flick, lw, -1, swing(s.t, 2.4, 0.05, 2.2, land, -0.3, still));
  const flare = land < 0.3 ? 0.2 * (1 - land / 0.3) : 0;
  const a = BALE_FACES[0];
  const fa = jackFace(s.t, a.first, a.min, a.max, a.seed, a.face);
  jackOLantern(ctx, s.t, lx + bw * 0.12, by - bh + u * 0.004, bw * 0.2, lw, false, false, fa.face, still ? 0 : fa.blink, flare, true);
  pumpkin(ctx, lx - bw * 0.28, by - bh + u * 0.004, bw * 0.13, lw);
  pumpkin(ctx, rx - bw * 0.18, by - bh + u * 0.004, bw * 0.16, lw);
  const b = BALE_FACES[1];
  const fb = jackFace(s.t + 0, b.first, b.min, b.max, b.seed, b.face);
  jackOLantern(ctx, s.t + 1.3, rx + bw * 0.22, by - bh + u * 0.004, bw * 0.14, lw, false, false, fb.face, still ? 0 : fb.blink, flare, true);
  // Candles on the bales, wax running down them now and then (all three in one go).
  CANDLES[0] = lx - bw * 0.38;
  CANDLES[1] = u * 0.03;
  CANDLES[2] = waxDrip(s.t, CANDLE_FIRST, 1);
  CANDLES[3] = lx - bw * 0.06;
  CANDLES[4] = u * 0.02;
  CANDLES[5] = waxDrip(s.t, CANDLE_FIRST + 2.3, 2);
  CANDLES[6] = rx - bw * 0.4;
  CANDLES[7] = u * 0.026;
  CANDLES[8] = waxDrip(s.t, CANDLE_FIRST + 5.1, 3);
  candles(ctx, s.t, CANDLES, by - bh + u * 0.003, lw);
  leafPile(ctx, Math.min(W * 0.3, lx + bw * 1.15), by + u * 0.02, u * 0.1, lw, 1, s.t);
  leafPile(ctx, Math.max(W * 0.7, rx - bw * 1.15), by + u * 0.02, u * 0.09, lw, 2, s.t);
}

// ---------------------------------------------------------------- the fog

/** The fog's parallax: nearer than anything, it slides by faster than the tower. */
export const FOG_P = 1.25;
const FOG_P_ = FOG_P;
/** Patches: drift speed (u/s), height above the band's top at the start (u), size (u), opacity, phase. */
const PATCHES = [
  { v: 0.01, y: 0.2, w: 0.56, h: 0.03, a: 0.26, ph: 0.15 },
  { v: -0.018, y: 0.08, w: 0.46, h: 0.026, a: 0.22, ph: 0.62 },
  { v: 0.028, y: -0.06, w: 0.4, h: 0.028, a: 0.18, ph: 0.35 },
] as const;
/**
 * Up the climb, wisps keep passing by in the lanes, one every WISP_GAP of the fog's own fall (u):
 * a whole (even) number of them to a turn of the loop, so the loop repeats them exactly.
 */
const WISPS_PER_LOOP = 14;
const WISP_GAP = (LOOP_PERIOD * BLOCK_HEIGHT * FOG_P_) / (WORLD_WIDTH * 1.5) / WISPS_PER_LOOP;
const FOG_FILL = [alpha(FOG, 1), alpha(FOG_LIGHT, 1), alpha(FOG_GHOST, 1)] as const;

/** One soft wisp of fog: long overlapping lobes thinning toward both ends, its top lit, a ghost-green glint. */
function patch(ctx: Ctx, x: number, y: number, w: number, h: number, a: number, seed: number, t: number): void {
  const n = 5;
  for (let pass = 0; pass < 3; pass++) {
    if (pass === 2 && seed % 2) continue;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (pass === 2 && i !== 2) continue;
      const f = (i + 0.5) / n;
      const lx = x - w / 2 + w * f + Math.sin(t * 0.5 + i * 1.7 + seed) * h * 0.4;
      const r = h * (0.35 + 0.65 * Math.sin(f * Math.PI)) * (0.8 + 0.4 * hash(seed + i)) * (1 + 0.1 * Math.sin(t * 0.7 + i + seed));
      const ly = y - r * 0.3 - (pass === 1 ? h * 0.22 : 0);
      const rx = (w / n) * (pass === 2 ? 0.5 : 1.15) * (pass === 1 ? 0.7 : 1);
      const ry = r * (pass === 2 ? 0.3 : pass === 1 ? 0.45 : 0.75);
      ctx.moveTo(lx + rx, ly);
      ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.globalAlpha = a * (pass === 0 ? 0.8 : pass === 1 ? 0.4 : 0.35);
    ctx.fillStyle = FOG_FILL[pass]!;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Patches of fog drifting by in front of everything at their own speeds: at the start low over the
 * churchyard (below the tower's floor line), each sliding across and round again; as you climb they
 * fall away fast, and wisps keep coming by in the lanes (never across the tower's column).
 */
export function fogPatches(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const W = s.cssW;
  const base = layerGround(s, FOG_P) + u * 0.36;
  for (let i = 0; i < PATCHES.length; i++) {
    const p = PATCHES[i]!;
    const y = base - p.y * u;
    if (y - p.h * u > s.cssH || y < s.groundY + p.h * u * 0.6) continue;
    const span = W + p.w * u;
    const x = ((((p.ph * span + s.t * p.v * u) % span) + span) % span) - p.w * u * 0.5;
    patch(ctx, x, y, p.w * u, p.h * u, p.a, i * 17 + 3, s.t);
  }
  // Up the climb: wisps in the lanes, one every WISP_GAP of their fall, alternating sides.
  if (s.rise <= 0) return;
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  const gap = WISP_GAP * u;
  const fall = s.rise * FOG_P;
  const first = Math.floor((fall - s.cssH - u * 0.6) / gap);
  for (let k = Math.max(1, first); k <= first + Math.ceil((s.cssH + u * 0.8) / gap) + 1; k++) {
    const y = s.groundY + u * 0.2 + fall - k * gap - s.rise;
    if (y < u * 0.05 || y > s.cssH + u * 0.1) continue;
    const side = k % 2 ? -1 : 1;
    const lo = side < 0 ? u * 0.02 : col1 + u * 0.02;
    const hi = side < 0 ? col0 - u * 0.02 : W - u * 0.02;
    const w = Math.min(hi - lo, u * 0.24);
    if (w < u * 0.1) continue;
    // Each wisp's own drift and shape, the same every turn of the loop.
    const j = ((k % WISPS_PER_LOOP) + WISPS_PER_LOOP) % WISPS_PER_LOOP;
    const drift = Math.sin(s.t * (0.08 + 0.03 * hash(j)) + j) * (hi - lo - w) * 0.5;
    const x = (lo + hi) / 2 + drift;
    // Never across the moon (or its halo): the left lane's wisps keep below it.
    if (side < 0) {
      const m = moonAt(s);
      if (y - u * 0.05 < m.y + m.r * HALO_REACH) continue;
    }
    patch(ctx, x, y, w, u * 0.035, 0.2 + 0.08 * hash(j + 5), j * 13, s.t);
  }
}

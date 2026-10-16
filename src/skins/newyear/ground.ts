import { alpha, circle, hash, ink, inkedLine, mix, outlined, outlinedText, oval, roundRectPath, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CREAM, CYAN, GOLD, INK, MAGENTA, PARTY, PINK, RED, SILVER, TAU, VIOLET, YEAR } from "./colors";

// The plaza: paving joints running to the horizon, confetti lying where it fell, and four
// ink-outlined props standing on the field beside the tower: a bulb-lit marquee with the year
// and a stack of gifts on the right; champagne popping out of an ice bucket and a party popper
// on the left. Each prop stands on fieldY(scene, z) and is scaled by TOWER_DEPTH / z; they are
// drawn back to front. All of them stay out of the tower column (center ± 0.25u) above the
// ground line, and the near ones stay well above the stone tiles of the base foreground.

/** Prop spots: x of the prop's anchor from the screen center (u), and depth on the field. */
const MARQUEE = { dx: 0.37, z: 3.4 };
const CHAMPAGNE = { dx: -0.36, z: 2.9 };
const POPPER = { dx: -0.2, z: 1.75 }; // the popper's narrow end; its mouth points left
const GIFTS = { dx: 0.355, z: 1.62 };

const SHADOW = alpha(INK, 0.24);
const DISPLAY = "'Luckiest Guy', 'Arial Black', Impact, sans-serif";
/** Left and right, for things that come in pairs. */
const SIDES = [-1, 1] as const;

/** A prop color with its lit top and shaded bottom, mixed once at load. */
function tones(color: string, light = 0.4, dark = 0.28): { base: string; light: string; dark: string } {
  return { base: color, light: mix(color, "#ffffff", light), dark: mix(color, INK, dark) };
}

/** Ink width for a prop at perspective scale k: a little heavier up close, never hairline. */
function inkFor(u: number, k: number): number {
  return Math.max(1.4, u * 0.0045 * (0.6 + 0.4 * k));
}

/** Soft flat shadow under a prop. */
function shadow(ctx: Ctx, x: number, y: number, rx: number): void {
  ctx.beginPath();
  oval(ctx, x, y, rx, rx * 0.2);
  ctx.fillStyle = SHADOW;
  ctx.fill();
}

/** Clip to the current path and paint a light band on top and a shaded band at the bottom. */
function shade(ctx: Ctx, c: { light: string; dark: string }, x: number, top: number, w: number, h: number, light: number, dark: number): void {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = c.light;
  ctx.fillRect(x, top, w, h * light);
  ctx.fillStyle = c.dark;
  ctx.fillRect(x, top + h * (1 - dark), w, h * dark);
  ctx.restore();
}

/** Five-point star path centered on (x, y). */
function star5(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/* ---------------------------------------------------------------- plaza */

const JOINT = alpha(INK, 0.12);
/** Lateral offsets (u at the tower's line) of the joints that run toward the horizon. */
const JOINTS = Array.from({ length: 24 }, (_, i) => (i - 11.5) * 0.17);
/** Depths of the cross joints. */
const ROWS = [1.3, 1.5, 1.75, 2.05, 2.4, 2.85, 3.4, 4.1, 5, 6.3, 8.2, 11];

/** Confetti lying flat on the plaza: lateral offset (u at the tower's line), depth, tint, turn. */
const FLOOR_BITS = (() => {
  const out: { dx: number; z: number; c: number; cos: number; sin: number; size: number }[] = [];
  for (let i = 0; out.length < 56 && i < 400; i++) {
    const z = 1.35 + Math.pow(hash(i * 2.3 + 3), 1.3) * 5;
    const dx = (hash(i * 2.3 + 2) - 0.5) * 1.3 * (z / TOWER_DEPTH);
    if (Math.abs(dx) < 0.24 && z > 2.6 && z < 3.6) continue; // the tower's footprint stays clean
    const a = hash(i * 2.3 + 4) * TAU;
    out.push({ dx, z, c: i % PARTY.length, cos: Math.cos(a), sin: Math.sin(a), size: 0.008 + hash(i * 2.3 + 5) * 0.005 });
  }
  return out;
})();

function plaza(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const u = s.u;
  const cx = s.cssW / 2;
  const depth = s.groundY - hy;
  const y0 = hy + u * 0.035;
  const yb = s.cssH;
  if (y0 >= yb || depth <= 0) return;

  // Joints: lines converging on the horizon, and cross rows widening toward the viewer.
  ctx.beginPath();
  const near = (yb - hy) / depth;
  const far = (y0 - hy) / depth;
  for (const X of JOINTS) {
    const xb = cx + X * u * near;
    if (xb < -s.cssW || xb > s.cssW * 2) continue;
    ctx.moveTo(cx + X * u * far, y0);
    ctx.lineTo(xb, yb);
  }
  for (const z of ROWS) {
    const y = fieldY(s, z);
    if (y < y0 || y > yb) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(s.cssW, y);
  }
  ctx.strokeStyle = JOINT;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Confetti on the ground
  for (let c = 0; c < PARTY.length; c++) {
    ctx.beginPath();
    for (const b of FLOOR_BITS) {
      if (b.c !== c) continue;
      const y = fieldY(s, b.z);
      if (y > yb + 4 || y < y0) continue;
      const k = TOWER_DEPTH / b.z;
      const x = cx + b.dx * u * k;
      const l = b.size * u * k;
      const w = l * 0.5;
      // Flat on the floor: squash the y axis.
      const ax = b.cos * l;
      const ay = b.sin * l * 0.35;
      const bx = -b.sin * w;
      const by = b.cos * w * 0.35;
      ctx.moveTo(x - ax - bx, y - ay - by);
      ctx.lineTo(x + ax - bx, y + ay - by);
      ctx.lineTo(x + ax + bx, y + ay + by);
      ctx.lineTo(x - ax + bx, y - ay + by);
      ctx.closePath();
    }
    ctx.fillStyle = PARTY[c]!;
    ctx.fill();
  }
}

/* ---------------------------------------------------------------- marquee */

const BOARD = tones("#ef4f86");
const POST_FOOT = mix(SILVER, INK, 0.25);
const PANEL = "#3b2475";
const BULB_ON = "#fff1a8";
const BULB_OFF = "#b77a2a";
/** Bulb centers around the frame, reused every frame (x, y pairs). */
const BULBS: number[] = [];
/** The marquee year's font, rebuilt only when its size changes. */
let yearSize = 0;
let yearFont = "";

function setYearFont(ctx: Ctx, size: number): void {
  if (size !== yearSize) {
    yearSize = size;
    yearFont = `400 ${size}px ${DISPLAY}`;
  }
  ctx.font = yearFont;
}

function marquee(ctx: Ctx, s: Scene, x: number, gy: number, k: number): void {
  const u = s.u * k;
  const lw = inkFor(s.u, k);
  const w = 0.24 * u;
  const h = 0.13 * u;
  const bottom = gy - 0.075 * u;
  const top = bottom - h;
  const left = x - w / 2;
  shadow(ctx, x, gy, w * 0.5);

  // Posts with feet planted on the plaza
  for (const d of SIDES) {
    const px = x + d * w * 0.3;
    roundRectPath(ctx, px - 0.008 * u, bottom - 0.01 * u, 0.016 * u, gy - bottom + 0.004 * u, 0.004 * u);
    outlined(ctx, SILVER, lw, INK);
    roundRectPath(ctx, px - 0.022 * u, gy - 0.012 * u, 0.044 * u, 0.016 * u, 0.006 * u);
    outlined(ctx, POST_FOOT, lw, INK);
  }

  // Frame and inner panel
  roundRectPath(ctx, left, top, w, h, 0.016 * u);
  ctx.fillStyle = BOARD.base;
  ctx.fill();
  shade(ctx, BOARD, left, top, w, h, 0.18, 0.2);
  roundRectPath(ctx, left, top, w, h, 0.016 * u);
  ink(ctx, lw, INK);
  const inset = 0.028 * u;
  roundRectPath(ctx, left + inset, top + inset, w - inset * 2, h - inset * 2, 0.008 * u);
  outlined(ctx, PANEL, lw * 0.8, INK);

  // Chasing bulbs around the frame
  const bi = inset * 0.5;
  const bw = w - bi * 2;
  const bh = h - bi * 2;
  const per = 2 * (bw + bh);
  const n = Math.max(12, Math.round(per / (0.021 * u)));
  BULBS.length = 0;
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per;
    if (d < bw) BULBS.push(left + bi + d, top + bi);
    else if ((d -= bw) < bh) BULBS.push(left + bi + bw, top + bi + d);
    else if ((d -= bh) < bw) BULBS.push(left + bi + bw - d, top + bi + bh);
    else BULBS.push(left + bi, top + bi + bh - (d - bw));
  }
  const chase = Math.floor(s.t * 8);
  const br = Math.max(1.2, 0.0068 * u);
  for (let lit = 0; lit < 2; lit++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (((i + chase) % 3 === 0) === (lit === 1)) continue;
      circle(ctx, BULBS[i * 2]!, BULBS[i * 2 + 1]!, br);
    }
    ctx.fillStyle = lit ? BULB_ON : BULB_OFF;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if ((i + chase) % 3 === 0) continue;
    circle(ctx, BULBS[i * 2]! - br * 0.3, BULBS[i * 2 + 1]! - br * 0.3, br * 0.4);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // The year, shrunk if needed so it stays inside the panel.
  let size = Math.round(0.062 * u);
  ctx.save();
  setYearFont(ctx, size);
  const room = w - inset * 2 - 0.02 * u;
  const tw = ctx.measureText(YEAR).width;
  if (tw > room) {
    size = Math.floor((size * room) / tw);
    setYearFont(ctx, size);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  outlinedText(ctx, YEAR, x, top + h / 2 + size * 0.05, GOLD, INK, Math.max(2, size * 0.16));
  ctx.restore();

  // A gold star on top
  star5(ctx, x, top - 0.012 * u, 0.026 * u);
  outlined(ctx, GOLD, lw * 0.9, INK);
}

/* ---------------------------------------------------------------- champagne */

const BOTTLE = "#2fae6a";
const BOTTLE_LIGHT = "#86e6ac";
const BOTTLE_DARK = "#1d7a49";
const BUCKET = tones("#cfd6ee");
const BUCKET_LIP = mix(BUCKET.base, "#ffffff", 0.45);
const BUCKET_BAND = alpha(INK, 0.45);
/** Heights of the bucket's two bands, as fractions down from the rim. */
const BUCKET_BANDS = [0.38, 0.72] as const;
/** Champagne spray and fizz: pale gold, so it still shows against the pink clouds behind it. */
const SPRAY = mix(GOLD, "#ffffff", 0.45);
const FIZZ = alpha(SPRAY, 0.9);
const ICE = "#c4f1ff";
const CORK = "#e3a964";
const BOTTLE_TILT = -0.24;
const POP_PERIOD = 4.6;
/** The cork pops at the start of each cycle; it is back in the bottle for the last stretch. */
const CORK_BACK = 3.3;
/** Ice cubes poking over the bucket rim: x from the bucket center, height over the rim, turn. */
const ICE_CUBES: readonly (readonly [number, number, number])[] = [
  [-0.04, 0.01, 0.4],
  [0.044, 0.008, -0.3],
  [0.02, 0.004, 0.9],
];
// The spray fans out around the bottle's axis but leans toward the screen's middle: the
// bottle stands near the left edge, and no drop may fly off it.
const DROPS = Array.from({ length: 16 }, (_, i) => ({
  birth: hash(i + 300) * 0.5,
  spread: 0.1 + hash(i + 320) * 0.45,
  speed: 0.3 + hash(i + 340) * 0.3,
  r: 0.004 + hash(i + 360) * 0.004,
}));
/** Foam blobs bubbling out of the mouth right after the pop: offset along/across the mouth. */
const FOAM: readonly (readonly [number, number, number])[] = [
  [0, 0.004, 0.014],
  [-0.012, 0.016, 0.011],
  [0.012, 0.014, 0.012],
  [0, 0.028, 0.012],
];

function bottlePath(ctx: Ctx, u: number): void {
  const bw = 0.03 * u;
  const nw = 0.011 * u;
  ctx.beginPath();
  ctx.moveTo(-bw, 0);
  ctx.lineTo(-bw, -0.15 * u);
  ctx.quadraticCurveTo(-bw, -0.19 * u, -nw, -0.205 * u);
  ctx.lineTo(-nw, -0.262 * u);
  ctx.lineTo(-nw * 1.25, -0.266 * u);
  ctx.lineTo(-nw * 1.25, -0.276 * u);
  ctx.lineTo(nw * 1.25, -0.276 * u);
  ctx.lineTo(nw * 1.25, -0.266 * u);
  ctx.lineTo(nw, -0.262 * u);
  ctx.lineTo(nw, -0.205 * u);
  ctx.quadraticCurveTo(bw, -0.19 * u, bw, -0.15 * u);
  ctx.lineTo(bw, 0);
  ctx.closePath();
}

function cork(ctx: Ctx, u: number, lw: number): void {
  roundRectPath(ctx, -0.012 * u, -0.022 * u, 0.024 * u, 0.022 * u, 0.006 * u);
  outlined(ctx, CORK, lw * 0.8, INK);
}

function champagne(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const u = s.u * k;
  const lw = inkFor(s.u, k);
  const bucketH = 0.1 * u;
  const topW = 0.13 * u;
  const botW = 0.1 * u;
  const p = s.t % POP_PERIOD;
  shadow(ctx, x, y, u * 0.085);

  // Bottle leaning out of the bucket; it shakes just before the cork goes.
  const shake = p > POP_PERIOD - 0.45 ? Math.sin(s.t * 46) * 0.035 : 0;
  const tilt = BOTTLE_TILT + shake;
  const bx = x + u * 0.004;
  const by = y - bucketH * 0.3;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(tilt);
  bottlePath(ctx, u);
  ctx.fillStyle = BOTTLE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = BOTTLE_DARK;
  ctx.fillRect(0.012 * u, -0.3 * u, 0.03 * u, 0.3 * u);
  ctx.fillStyle = BOTTLE_LIGHT;
  ctx.fillRect(-0.021 * u, -0.17 * u, 0.008 * u, 0.15 * u);
  ctx.restore();
  bottlePath(ctx, u);
  ink(ctx, lw, INK);
  // Gold foil on the neck
  ctx.beginPath();
  ctx.moveTo(-0.02 * u, -0.194 * u);
  ctx.lineTo(-0.0115 * u, -0.204 * u);
  ctx.lineTo(-0.0115 * u, -0.262 * u);
  ctx.lineTo(0.0115 * u, -0.262 * u);
  ctx.lineTo(0.0115 * u, -0.204 * u);
  ctx.lineTo(0.02 * u, -0.194 * u);
  ctx.closePath();
  outlined(ctx, GOLD, lw * 0.85, INK);
  // Label with a star
  roundRectPath(ctx, -0.024 * u, -0.138 * u, 0.048 * u, 0.05 * u, 0.006 * u);
  outlined(ctx, CREAM, lw * 0.85, INK);
  star5(ctx, 0, -0.112 * u, 0.015 * u);
  ctx.fillStyle = RED;
  ctx.fill();
  // The cork, back in place before the next pop
  if (p > CORK_BACK) {
    ctx.translate(0, -0.274 * u);
    cork(ctx, u, lw);
  }
  ctx.restore();

  // Mouth of the bottle, in screen space, and the direction it points.
  const L = 0.278 * u;
  const dirX = Math.sin(BOTTLE_TILT);
  const dirY = -Math.cos(BOTTLE_TILT);
  const mx = bx + dirX * L;
  const my = by + dirY * L;

  if (p < 1.2) {
    // Spray right after the pop
    ctx.beginPath();
    let any = false;
    for (const d of DROPS) {
      const age = p - d.birth;
      if (age < 0 || age > 0.7) continue;
      const ca = Math.cos(d.spread);
      const sa = Math.sin(d.spread);
      const vx = (dirX * ca - dirY * sa) * d.speed * u;
      const vy = (dirX * sa + dirY * ca) * d.speed * u;
      circle(ctx, mx + vx * age, my + vy * age + 0.5 * u * age * age, d.r * u * (1 - age));
      any = true;
    }
    if (any) {
      ctx.fillStyle = SPRAY;
      ctx.fill();
    }
    // Foam welling over the lip; its outline thins as it shrinks, so it never ends as ink rings.
    if (p < 0.9) {
      const f = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.75;
      ctx.beginPath();
      for (const [a, b, r] of FOAM) {
        // b along the bottle's axis (out of the mouth), a across it
        circle(ctx, mx + (dirX * b - dirY * a) * u, my + (dirY * b + dirX * a) * u, r * u * f);
      }
      if (f > 0.05) outlined(ctx, "#ffffff", lw * 0.7 * Math.min(1, f * 2), INK);
    }
    // The cork flies up and a little toward the plaza, tumbling, then fades as it falls.
    const cxp = mx + 0.09 * u * p;
    const cyp = my - 0.95 * u * p + 0.85 * u * p * p;
    ctx.save();
    ctx.globalAlpha = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.35;
    ctx.translate(cxp, cyp);
    ctx.rotate(tilt + p * 8);
    ctx.translate(0, 0.011 * u);
    cork(ctx, u, lw);
    ctx.restore();
  } else if (p <= CORK_BACK) {
    // Bubbles fizzing out between pops
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const q = (s.t * 0.7 + i / 5) % 1;
      circle(ctx, mx + Math.sin(s.t * 3 + i * 2) * u * 0.008 + q * u * 0.006, my - q * u * 0.08, u * (0.0035 + 0.002 * (1 - q)));
    }
    ctx.fillStyle = FIZZ;
    ctx.fill();
  }

  // Ice cubes poking over the rim
  for (const [dx, dy, a] of ICE_CUBES) {
    const ix = x + dx * u;
    const iy = y - bucketH - dy * u;
    const r = 0.018 * u;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const t = a + (i * TAU) / 4;
      if (i === 0) ctx.moveTo(ix + Math.cos(t) * r, iy + Math.sin(t) * r);
      else ctx.lineTo(ix + Math.cos(t) * r, iy + Math.sin(t) * r);
    }
    ctx.closePath();
    outlined(ctx, ICE, lw * 0.85, INK);
  }

  // Bucket, with handles on the sides and two bands
  ctx.beginPath();
  for (const d of SIDES) {
    const hx = x + d * (topW / 2 + u * 0.002);
    ctx.moveTo(hx, y - bucketH * 0.86);
    ctx.arc(hx, y - bucketH * 0.7, bucketH * 0.16, -Math.PI / 2, Math.PI / 2, d < 0);
  }
  inkedLine(ctx, SILVER, Math.max(1.5, u * 0.006), lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(x - topW / 2, y - bucketH);
  ctx.lineTo(x + topW / 2, y - bucketH);
  ctx.lineTo(x + botW / 2, y);
  ctx.lineTo(x - botW / 2, y);
  ctx.closePath();
  ctx.fillStyle = BUCKET.base;
  ctx.fill();
  shade(ctx, BUCKET, x - topW / 2, y - bucketH, topW, bucketH, 0.2, 0.3);
  ctx.beginPath();
  ctx.moveTo(x - topW / 2, y - bucketH);
  ctx.lineTo(x + topW / 2, y - bucketH);
  ctx.lineTo(x + botW / 2, y);
  ctx.lineTo(x - botW / 2, y);
  ctx.closePath();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (const f of BUCKET_BANDS) {
    const w = botW + (topW - botW) * (1 - f);
    ctx.moveTo(x - w / 2 + lw, y - bucketH * (1 - f));
    ctx.lineTo(x + w / 2 - lw, y - bucketH * (1 - f));
  }
  ink(ctx, lw * 0.7, BUCKET_BAND);
  // Rolled lip
  roundRectPath(ctx, x - topW / 2 - u * 0.007, y - bucketH - u * 0.009, topW + u * 0.014, u * 0.016, u * 0.008);
  outlined(ctx, BUCKET_LIP, lw, INK);
}

/* ---------------------------------------------------------------- party popper */

const POPPER_PERIOD = 5.3;
/** Streamers fire up and a little to the left: away from the tower, never off the screen. */
const POPPER_AIM = -Math.PI / 2 - 0.3;
const POPPER_BODY = PINK;
const POPPER_SHADE = mix(PINK, INK, 0.25);
const POPPER_MOUTH = "#3a2266";
/** Gold bands around the cone, as fractions of its length from the narrow end. */
const POPPER_BANDS = [0.3, 0.62] as const;
const STRANDS = [GOLD, CYAN, "#9cf06a", MAGENTA].map((color, i) => ({
  spread: (i - 1.5) * 0.19 + (hash(i + 500) - 0.5) * 0.06,
  len: 0.07 + hash(i + 510) * 0.02,
  color,
  curl: 7 + hash(i + 520) * 3,
}));
/** Paper specks: direction off the aim, and how far they fly before they drop (u). */
const SPECKS = Array.from({ length: 10 }, (_, i) => ({
  spread: (hash(i + 540) - 0.5) * 1.0,
  reach: 0.03 + hash(i + 550) * 0.025,
  color: i % 2,
}));
const SPECK_COLORS = [GOLD, CYAN] as const;

/** The popper's cone: narrow end at (x, y), mouth at mx; its lower edge on the plaza. */
function conePath(ctx: Ctx, x: number, y: number, tip: number, mx: number, bell: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - tip * 2);
  ctx.lineTo(mx, y - bell * 2);
  ctx.lineTo(mx, y);
  ctx.closePath();
}

/** A party popper lying on its side: narrow end at (x, y), mouth to the left. */
function popper(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const u = s.u * k;
  const lw = inkFor(s.u, k);
  const len = 0.1 * u;
  const tip = 0.009 * u; // half-height at the narrow end
  const bell = 0.028 * u; // half-height at the mouth
  const mx = x - len;
  const my = y - bell;
  shadow(ctx, x - len * 0.5, y, len * 0.62);

  // Pull-string trailing from the narrow end
  ctx.beginPath();
  ctx.moveTo(x, y - tip);
  ctx.quadraticCurveTo(x + 0.03 * u, y - tip * 0.2, x + 0.026 * u, y - 0.002 * u);
  inkedLine(ctx, CREAM, Math.max(1, u * 0.004), lw * 0.6, INK);
  ctx.beginPath();
  circle(ctx, x + 0.03 * u, y - 0.004 * u, 0.007 * u);
  ink(ctx, Math.max(1.5, u * 0.0045), INK);

  // The cone, shaded underneath, with two gold bands
  conePath(ctx, x, y, tip, mx, bell);
  ctx.fillStyle = POPPER_BODY;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = POPPER_SHADE;
  ctx.fillRect(mx, y - bell * 0.6, len, bell);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (const f of POPPER_BANDS) {
    const bx = x - len * f;
    ctx.moveTo(bx + 0.01 * u, y);
    ctx.lineTo(bx - 0.004 * u, y - bell * 2);
    ctx.lineTo(bx - 0.018 * u, y - bell * 2);
    ctx.lineTo(bx - 0.004 * u, y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
  conePath(ctx, x, y, tip, mx, bell);
  ink(ctx, lw, INK);
  // The open mouth
  ctx.beginPath();
  oval(ctx, mx, my, bell * 0.36, bell);
  outlined(ctx, POPPER_MOUTH, lw, INK);

  // Streamers shoot out of the mouth, curl, droop onto the plaza, then fade.
  const p = (s.t + 2.8) % POPPER_PERIOD;
  if (p >= 2.4) return;
  const grow = Math.min(1, p / 0.35);
  const e = 1 - (1 - grow) * (1 - grow);
  const fall = Math.min(1, p / 1.1);
  ctx.save();
  ctx.globalAlpha = p < 1.7 ? 1 : 1 - (p - 1.7) / 0.7;
  const sw = Math.max(1.5, s.u * 0.0065);
  for (const st of STRANDS) {
    const a = POPPER_AIM + st.spread;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.beginPath();
    for (let j = 0; j <= 12; j++) {
      const f = (j / 12) * e;
      const d = f * st.len * u;
      const wig = Math.sin(f * st.curl + s.t * 4) * u * 0.008 * Math.min(1, f * 3);
      const px = mx + ca * d - sa * wig;
      const py = Math.min(y - sw, my + sa * d + ca * wig + f * f * u * 0.1 * fall);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    inkedLine(ctx, st.color, sw, Math.max(1, lw * 0.45), INK);
  }
  // Paper specks: thrown out, slowed by the air, then fluttering down to the plaza.
  if (p < 1.6) {
    const out = 1 - Math.exp(-p * 7);
    const drop = Math.max(0, p - 0.25);
    for (let c = 0; c < SPECK_COLORS.length; c++) {
      ctx.beginPath();
      for (const sp of SPECKS) {
        if (sp.color !== c) continue;
        const a = POPPER_AIM + sp.spread;
        const d = sp.reach * u * out;
        const px = mx + Math.cos(a) * d;
        const py = Math.min(y - 2, my + Math.sin(a) * d + 0.09 * u * drop * drop);
        ctx.rect(px - u * 0.004, py - u * 0.0025, u * 0.008, u * 0.005);
      }
      ctx.fillStyle = SPECK_COLORS[c]!;
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- gifts */

interface Wrap {
  body: string;
  shade: string;
  lid: string;
  ribbon: string;
  knot: string;
}

function wrap(body: string, ribbon: string): Wrap {
  return { body, shade: mix(body, INK, 0.25), lid: mix(body, "#ffffff", 0.3), ribbon, knot: mix(ribbon, "#ffffff", 0.3) };
}

const BIG_BOX = wrap(CYAN, PINK);
const SMALL_BOX = wrap(GOLD, VIOLET);

/** A gift box with a lid, a ribbon cross, and (on the top box) a bow. */
function giftBox(ctx: Ctx, u: number, lw: number, x: number, bottom: number, w: number, h: number, c: Wrap, bow: boolean): void {
  const lid = h * 0.26;
  const top = bottom - h;
  const over = u * 0.007;
  const rw = Math.max(2, w * 0.16);
  // Box
  ctx.beginPath();
  ctx.rect(x - w / 2, top + lid, w, h - lid);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.fillStyle = c.shade;
  ctx.fillRect(x - w / 2, bottom - (h - lid) * 0.28, w, (h - lid) * 0.28);
  ctx.fillRect(x + w / 2 - w * 0.14, top + lid, w * 0.14, h - lid);
  ctx.fillStyle = c.ribbon;
  ctx.fillRect(x - rw / 2, top + lid, rw, h - lid);
  ctx.beginPath();
  ctx.rect(x - w / 2, top + lid, w, h - lid);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(x - rw / 2, top + lid);
  ctx.lineTo(x - rw / 2, bottom);
  ctx.moveTo(x + rw / 2, top + lid);
  ctx.lineTo(x + rw / 2, bottom);
  ink(ctx, lw * 0.7, INK);
  // Lid
  roundRectPath(ctx, x - w / 2 - over, top, w + over * 2, lid, u * 0.004);
  ctx.fillStyle = c.lid;
  ctx.fill();
  ctx.fillStyle = c.ribbon;
  ctx.fillRect(x - rw / 2, top, rw, lid);
  roundRectPath(ctx, x - w / 2 - over, top, w + over * 2, lid, u * 0.004);
  ink(ctx, lw, INK);
  if (!bow) return;
  // Bow: two loops and a knot
  const bw = Math.min(w * 0.3, u * 0.03);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.bezierCurveTo(x - bw * 1.5, top - bw * 1.3, x - bw * 1.7, top + bw * 0.1, x, top);
  ctx.moveTo(x, top);
  ctx.bezierCurveTo(x + bw * 1.5, top - bw * 1.3, x + bw * 1.7, top + bw * 0.1, x, top);
  outlined(ctx, c.ribbon, lw, INK);
  ctx.beginPath();
  circle(ctx, x, top - bw * 0.12, bw * 0.28);
  outlined(ctx, c.knot, lw * 0.8, INK);
}

function gifts(ctx: Ctx, s: Scene, x: number, y: number, k: number): void {
  const u = s.u * k;
  const lw = inkFor(s.u, k);
  shadow(ctx, x, y, 0.06 * u);
  const h1 = 0.062 * u;
  giftBox(ctx, u, lw, x, y, 0.09 * u, h1, BIG_BOX, false);
  giftBox(ctx, u, lw, x - 0.006 * u, y - h1, 0.062 * u, 0.045 * u, SMALL_BOX, true);
}

/* ---------------------------------------------------------------- layer */

/** Every prop, back to front, with how tall it stands (u at the tower's line). */
const PROPS = [
  { ...MARQUEE, tall: 0.3, draw: marquee },
  { ...CHAMPAGNE, tall: 0.32, draw: champagne },
  { ...POPPER, tall: 0.25, draw: popper },
  { ...GIFTS, tall: 0.15, draw: gifts },
].sort((a, b) => b.z - a.z);

/** The ground layer: plaza, then the props from back to front. */
export function partyPlaza(ctx: Ctx, s: Scene): void {
  if (s.horizonY >= s.cssH) return;
  plaza(ctx, s);
  const cx = s.cssW / 2;
  const u = s.u;
  for (const prop of PROPS) {
    const y = fieldY(s, prop.z);
    const k = TOWER_DEPTH / prop.z;
    if (y - prop.tall * u * k >= s.cssH) continue; // still below the screen
    prop.draw(ctx, s, cx + prop.dx * u, y, k);
  }
}

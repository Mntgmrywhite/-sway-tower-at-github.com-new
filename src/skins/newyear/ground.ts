import { alpha, circle, hash, mix, neonStroke, neonText, oval, roundRectPath, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { CHAMPAGNE, CYAN, GOLD, INK, MAGENTA, PARTY, SILVER, TAU, VIOLET, YEAR } from "./colors";

// Props on the floor beside the tower: champagne popping out of an ice bucket and a party
// popper on the left; a bulb-lit marquee with the year and a stack of party boxes on the
// right; confetti scattered on the grid. Positions are in u from the screen center, so the
// tower column (about ±0.25u) stays clear. Everything rides layerGround(s, 1).

const MARQUEE_FONT = "Orbitron, 'Arial Black', sans-serif";

/** Confetti lying flat on the floor: x from center, depth below the ground line (both in u). */
const FLOOR_BITS = (() => {
  const out: { x: number; z: number; c: number; cos: number; sin: number; size: number }[] = [];
  for (let i = 0; out.length < 54 && i < 400; i++) {
    const side = hash(i * 2.3 + 1) < 0.5 ? -1 : 1;
    const x = side * (0.2 + hash(i * 2.3 + 2) * 0.45);
    const z = -0.02 + Math.pow(hash(i * 2.3 + 3), 1.4) * 0.3;
    if (Math.abs(x) < 0.27 && z < 0.05) continue; // keep the tower's footprint clean
    const a = hash(i * 2.3 + 4) * TAU;
    out.push({ x, z, c: i % PARTY.length, cos: Math.cos(a), sin: Math.sin(a), size: 0.006 + hash(i * 2.3 + 5) * 0.005 });
  }
  return out;
})();

function floorConfetti(ctx: Ctx, s: Scene, gy: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let c = 0; c < PARTY.length; c++) {
    ctx.beginPath();
    for (const b of FLOOR_BITS) {
      if (b.c !== c) continue;
      const y = gy + b.z * u;
      if (y > s.cssH + 4 || y < s.horizonY) continue;
      const persp = 0.8 + b.z * 1.6;
      const x = cx + b.x * u * (1 + b.z * 0.6);
      const l = b.size * u * persp;
      const w = l * 0.45;
      // Flat on the floor: squash the y axis.
      const ax = b.cos * l;
      const ay = b.sin * l * 0.4;
      const bx = -b.sin * w;
      const by = b.cos * w * 0.4;
      ctx.moveTo(x - ax - bx, y - ay - by);
      ctx.lineTo(x + ax - bx, y + ay - by);
      ctx.lineTo(x + ax + bx, y + ay + by);
      ctx.lineTo(x - ax + bx, y - ay + by);
      ctx.closePath();
    }
    ctx.fillStyle = alpha(PARTY[c]!, 0.85);
    ctx.fill();
  }
}

/** Soft colored light pooling on the floor under a prop. */
function pool(ctx: Ctx, x: number, y: number, rx: number, color: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.22, 0, 0, TAU);
  ctx.fillStyle = alpha(color, 0.2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.6, rx * 0.12, 0, 0, TAU);
  ctx.fillStyle = alpha(color, 0.18);
  ctx.fill();
}

/* ---------------------------------------------------------------- champagne */

const BOTTLE_TILT = -0.24;
/**
 * The cork and foam fly out steeper than the bottle leans: the mouth sits near the left edge
 * of the screen, so along the bottle's own axis they would leave the screen at once.
 */
const FIRE_X = Math.sin(BOTTLE_TILT * 0.35);
const FIRE_Y = -Math.cos(BOTTLE_TILT * 0.35);
const POP_PERIOD = 4.6;
/** Ice cubes poking over the bucket rim: x from the bucket center, height over the rim (u), turn. */
const ICE: readonly (readonly [number, number, number])[] = [
  [-0.036, 0.012, 0.4],
  [0.042, 0.01, -0.3],
  [0.016, 0.006, 0.9],
];
const DROPS = Array.from({ length: 20 }, (_, i) => ({
  birth: hash(i + 300) * 0.55,
  spread: (hash(i + 320) - 0.5) * 0.7,
  speed: 0.32 + hash(i + 340) * 0.32,
  r: 0.0035 + hash(i + 360) * 0.004,
}));

function bottlePath(ctx: Ctx, u: number): void {
  const bw = 0.03 * u;
  const nw = 0.011 * u;
  ctx.beginPath();
  ctx.moveTo(-bw, 0);
  ctx.lineTo(-bw, -0.15 * u);
  ctx.quadraticCurveTo(-bw, -0.19 * u, -nw, -0.205 * u);
  ctx.lineTo(-nw, -0.262 * u);
  ctx.lineTo(-nw * 1.2, -0.266 * u);
  ctx.lineTo(-nw * 1.2, -0.276 * u);
  ctx.lineTo(nw * 1.2, -0.276 * u);
  ctx.lineTo(nw * 1.2, -0.266 * u);
  ctx.lineTo(nw, -0.262 * u);
  ctx.lineTo(nw, -0.205 * u);
  ctx.quadraticCurveTo(bw, -0.19 * u, bw, -0.15 * u);
  ctx.lineTo(bw, 0);
  ctx.closePath();
}

function champagne(ctx: Ctx, s: Scene, x: number, y: number): void {
  const u = s.u;
  const bucketH = 0.1 * u;
  const topW = 0.135 * u;
  const botW = 0.105 * u;
  pool(ctx, x, y, u * 0.1, GOLD);

  // Bottle, leaning out of the bucket
  const bx = x + u * 0.004;
  const by = y - bucketH * 0.35;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(BOTTLE_TILT);
  bottlePath(ctx, u);
  ctx.fillStyle = "#04140f";
  ctx.fill();
  neonStroke(ctx, mix(SILVER, CYAN, 0.35), Math.max(1.2, u * 0.0042), 2.8);
  // Gold foil on the neck
  ctx.beginPath();
  ctx.moveTo(-0.019 * u, -0.196 * u);
  ctx.lineTo(-0.011 * u, -0.2 * u);
  ctx.lineTo(-0.011 * u, -0.262 * u);
  ctx.lineTo(0.011 * u, -0.262 * u);
  ctx.lineTo(0.011 * u, -0.2 * u);
  ctx.lineTo(0.019 * u, -0.196 * u);
  ctx.closePath();
  ctx.fillStyle = alpha(GOLD, 0.35);
  ctx.fill();
  neonStroke(ctx, GOLD, Math.max(1, u * 0.0032), 2.4);
  // Label with a star
  ctx.beginPath();
  ctx.rect(-0.022 * u, -0.135 * u, 0.044 * u, 0.045 * u);
  neonStroke(ctx, MAGENTA, Math.max(1, u * 0.003), 2.4);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = (i % 2 ? 0.006 : 0.014) * u;
    const px = Math.cos(a) * r;
    const py = -0.112 * u + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.restore();

  // Mouth of the bottle, in screen space.
  const L = 0.278 * u;
  const mx = bx + Math.sin(BOTTLE_TILT) * L;
  const my = by - Math.cos(BOTTLE_TILT) * L;
  const p = s.t % POP_PERIOD;

  // Foam spray right after the pop
  ctx.beginPath();
  let anyDrop = false;
  for (const d of DROPS) {
    const age = p - d.birth;
    if (age < 0 || age > 0.9) continue;
    const ca = Math.cos(d.spread);
    const sa = Math.sin(d.spread);
    const vx = (FIRE_X * ca - FIRE_Y * sa) * d.speed * u;
    const vy = (FIRE_X * sa + FIRE_Y * ca) * d.speed * u;
    const r = d.r * u * (1 - age * 0.6);
    circle(ctx, mx + vx * age, my + vy * age + 0.55 * u * age * age, r);
    anyDrop = true;
  }
  if (anyDrop) {
    ctx.fillStyle = alpha(CHAMPAGNE, Math.max(0, 0.95 - p));
    ctx.fill();
  }

  // Cork shooting up, tumbling, and falling away off the left edge
  if (p < 1.5) {
    const v = 0.95 * u;
    const cxp = mx + FIRE_X * v * p;
    const cyp = my + FIRE_Y * v * p + 0.65 * u * p * p;
    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.rotate(p * 9);
    roundRectPath(ctx, -0.011 * u, -0.009 * u, 0.022 * u, 0.018 * u, 0.004 * u);
    ctx.fillStyle = "#3a2410";
    ctx.fill();
    neonStroke(ctx, GOLD, Math.max(1, u * 0.003), 2.4);
    ctx.restore();
    // Pop flash at the mouth
    if (p < 0.25) {
      const k = p / 0.25;
      const aim = Math.atan2(FIRE_Y, FIRE_X);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = aim + (i - 2.5) * 0.35;
        const r0 = u * (0.012 + k * 0.02);
        const r1 = u * (0.03 + k * 0.035);
        ctx.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0);
        ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1);
      }
      ctx.globalAlpha = 1 - k;
      neonStroke(ctx, CHAMPAGNE, Math.max(1, u * 0.003), 2.6);
      ctx.globalAlpha = 1;
    }
  } else {
    // Bubbles fizzing out between pops
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const k = (s.t * 0.7 + i / 5) % 1;
      const bxp = mx + Math.sin(s.t * 3 + i * 2) * u * 0.008 - k * u * 0.01;
      const byp = my - k * u * 0.09;
      circle(ctx, bxp, byp, u * (0.003 + 0.002 * (1 - k)));
    }
    ctx.strokeStyle = alpha(CHAMPAGNE, 0.75);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Ice cubes poking over the rim
  ctx.beginPath();
  for (const [dx, dy, a] of ICE) {
    const ix = x + dx * u;
    const iy = y - bucketH - dy * u;
    const r = 0.017 * u;
    for (let i = 0; i < 4; i++) {
      const t = a + (i * TAU) / 4;
      const px = ix + Math.cos(t) * r;
      const py = iy + Math.sin(t) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fillStyle = "#0e2a3c";
  ctx.fill();
  neonStroke(ctx, CYAN, Math.max(1, u * 0.0032), 2.4);

  // Bucket
  ctx.beginPath();
  ctx.moveTo(x - topW / 2, y - bucketH);
  ctx.lineTo(x + topW / 2, y - bucketH);
  ctx.lineTo(x + botW / 2, y);
  ctx.lineTo(x - botW / 2, y);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, SILVER, Math.max(1.3, u * 0.0048), 2.8);
  // Lip, bands and handles
  ctx.beginPath();
  ctx.moveTo(x - topW / 2 - u * 0.006, y - bucketH);
  ctx.lineTo(x + topW / 2 + u * 0.006, y - bucketH);
  for (const f of [0.3, 0.75]) {
    const w = botW + (topW - botW) * (1 - f);
    ctx.moveTo(x - w / 2 + u * 0.006, y - bucketH * (1 - f));
    ctx.lineTo(x + w / 2 - u * 0.006, y - bucketH * (1 - f));
  }
  ctx.strokeStyle = alpha(SILVER, 0.55);
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.stroke();
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const hx = x + d * (topW / 2 + u * 0.004);
    ctx.moveTo(hx, y - bucketH * 0.86);
    ctx.arc(hx, y - bucketH * 0.72, bucketH * 0.14, -Math.PI / 2, Math.PI / 2, d < 0);
  }
  neonStroke(ctx, SILVER, Math.max(1, u * 0.003), 2.4);
}

/* ---------------------------------------------------------------- party popper */

const POPPER_PERIOD = 5.3;
/** Streamers fire up and to the left, away from the tower. */
const POPPER_AIM = Math.PI + 0.45;
/** Paper bands around the cone, as fractions of the way from the narrow end to the mouth. */
const POPPER_BANDS = [0.35, 0.65] as const;
const STRANDS = Array.from({ length: 5 }, (_, i) => ({
  spread: (i - 2) * 0.2 + (hash(i + 500) - 0.5) * 0.12,
  len: 0.13 + hash(i + 510) * 0.06,
  color: PARTY[i % PARTY.length]!,
  curl: 6 + hash(i + 520) * 4,
}));

/** A party popper lying on its side on the floor: narrow end at (x, y), mouth to the left. */
function popper(ctx: Ctx, s: Scene, x: number, y: number): void {
  const u = s.u;
  const len = 0.1 * u;
  const tip = 0.008 * u; // half-height at the narrow end
  const bell = 0.03 * u; // half-height at the mouth
  const mx = x - len;
  const my = y - bell;
  pool(ctx, x - len * 0.45, y, u * 0.075, MAGENTA);

  // The cone's lower edge rests on the floor, so its axis tips up toward the mouth.
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - tip * 2);
  ctx.lineTo(mx, y - bell * 2);
  ctx.lineTo(mx, y);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, MAGENTA, Math.max(1.2, u * 0.004), 2.6);
  ctx.beginPath();
  for (const f of POPPER_BANDS) {
    const bx = x - len * f;
    const h = tip + (bell - tip) * f;
    ctx.moveTo(bx + 0.006 * u, y);
    ctx.lineTo(bx - 0.006 * u, y - h * 2);
  }
  ctx.strokeStyle = alpha(GOLD, 0.85);
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  // The open mouth
  ctx.beginPath();
  oval(ctx, mx, my, bell * 0.32, bell);
  ctx.fillStyle = "#1a0830";
  ctx.fill();
  neonStroke(ctx, mix(MAGENTA, "#ffffff", 0.25), Math.max(1, u * 0.0032), 2.4);

  // Streamers burst out of the mouth, arc over and settle on the floor, then fade.
  const p = (s.t + 2.8) % POPPER_PERIOD;
  if (p >= 2.4) return;
  const grow = Math.min(1, p / 0.45);
  const e = 1 - (1 - grow) * (1 - grow);
  const fall = Math.min(1, p / 0.9);
  ctx.globalAlpha = p < 1.6 ? 1 : 1 - (p - 1.6) / 0.8;
  for (const st of STRANDS) {
    const a = POPPER_AIM + st.spread;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const f = (k / 14) * e;
      const d = f * st.len * u;
      const wig = Math.sin(f * st.curl + s.t * 5) * u * 0.014 * Math.min(1, f * 2);
      const px = mx + ca * d - sa * wig;
      const py = Math.min(y, my + sa * d + ca * wig + f * f * u * 0.16 * fall);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    neonStroke(ctx, st.color, Math.max(1, u * 0.003), 2.4);
  }
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- marquee + boxes */

/** Bulb positions and on/off for the marquee border, reused every frame (x, y, lit). */
const BULB_PTS: number[] = [];
const YEAR_GOLD = mix(GOLD, "#ffffff", 0.3);

function marquee(ctx: Ctx, s: Scene, x: number, gy: number): void {
  const u = s.u;
  const w = 0.2 * u;
  const h = 0.105 * u;
  const bottom = gy - 0.075 * u;
  const top = bottom - h;
  const left = x - w / 2;
  pool(ctx, x, gy + 0.01 * u, w * 0.6, MAGENTA);

  // Posts with feet planted on the floor
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const px = x + d * w * 0.32;
    ctx.rect(px - 0.006 * u, bottom, 0.012 * u, gy - bottom + 0.004 * u);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, VIOLET, Math.max(1, u * 0.0032), 2.4);
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const px = x + d * w * 0.32;
    roundRectPath(ctx, px - 0.02 * u, gy - 0.008 * u, 0.04 * u, 0.016 * u, 0.006 * u);
    ctx.fillStyle = INK;
    ctx.fill();
    neonStroke(ctx, VIOLET, Math.max(1, u * 0.0032), 2.4);
  }

  // Board
  roundRectPath(ctx, left, top, w, h, 0.012 * u);
  ctx.fillStyle = "#0d0420";
  ctx.fill();
  neonStroke(ctx, MAGENTA, Math.max(1.4, u * 0.005), 3);
  roundRectPath(ctx, left + 0.022 * u, top + 0.022 * u, w - 0.044 * u, h - 0.044 * u, 0.006 * u);
  ctx.strokeStyle = alpha(GOLD, 0.45);
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.stroke();

  // Chasing bulbs around the border
  const inset = 0.011 * u;
  const bw = w - inset * 2;
  const bh = h - inset * 2;
  const per = 2 * (bw + bh);
  const n = Math.max(12, Math.round(per / (0.017 * u)));
  const chase = Math.floor(s.t * 9);
  const br = Math.max(1, 0.0042 * u);
  const pts = BULB_PTS;
  pts.length = 0;
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per;
    let bx: number;
    let by: number;
    if (d < bw) {
      bx = left + inset + d;
      by = top + inset;
    } else if ((d -= bw) < bh) {
      bx = left + inset + bw;
      by = top + inset + d;
    } else if ((d -= bh) < bw) {
      bx = left + inset + bw - d;
      by = top + inset + bh;
    } else {
      d -= bw;
      bx = left + inset;
      by = top + inset + bh - d;
    }
    pts.push(bx, by, (i + chase) % 3 === 0 ? 0 : 1);
  }
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 2]) circle(ctx, pts[i]!, pts[i + 1]!, br * 2.2);
  ctx.fillStyle = alpha(GOLD, 0.28);
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 2]) circle(ctx, pts[i]!, pts[i + 1]!, br);
  ctx.fillStyle = CHAMPAGNE;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 3) if (!pts[i + 2]) circle(ctx, pts[i]!, pts[i + 1]!, br * 0.8);
  ctx.fillStyle = alpha(GOLD, 0.35);
  ctx.fill();

  // The year, shrunk if the face is wide so it stays inside the inner frame.
  let size = Math.round(0.056 * u);
  ctx.save();
  ctx.font = `700 ${size}px ${MARQUEE_FONT}`;
  const room = w - 0.07 * u;
  const tw = ctx.measureText(YEAR).width;
  if (tw > room) {
    size = Math.floor((size * room) / tw);
    ctx.font = `700 ${size}px ${MARQUEE_FONT}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(s.t * 4);
  neonText(ctx, YEAR, x, top + h / 2 + size * 0.04, YEAR_GOLD, MAGENTA, Math.max(2, size * 0.12));
  ctx.restore();
}

function box(ctx: Ctx, u: number, x: number, bottom: number, w: number, h: number, rim: string, ribbon: string): void {
  const top = bottom - h;
  // Lid overhang
  const lid = h * 0.22;
  ctx.beginPath();
  ctx.rect(x - w / 2, top + lid, w, h - lid);
  ctx.rect(x - w / 2 - u * 0.006, top, w + u * 0.012, lid);
  ctx.fillStyle = mix(rim, INK, 0.84);
  ctx.fill();
  neonStroke(ctx, rim, Math.max(1.2, u * 0.0042), 2.8);
  // Ribbon cross
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.moveTo(x - w / 2, top + lid + (h - lid) * 0.45);
  ctx.lineTo(x + w / 2, top + lid + (h - lid) * 0.45);
  // Bow
  const bw = Math.min(w * 0.22, u * 0.026);
  ctx.moveTo(x, top);
  ctx.bezierCurveTo(x - bw * 1.4, top - bw * 1.1, x - bw * 1.6, top + bw * 0.2, x, top);
  ctx.bezierCurveTo(x + bw * 1.4, top - bw * 1.1, x + bw * 1.6, top + bw * 0.2, x, top);
  neonStroke(ctx, ribbon, Math.max(1.2, u * 0.0045), 2.6);
}

function partyBoxes(ctx: Ctx, s: Scene, x: number, y: number): void {
  const u = s.u;
  pool(ctx, x, y, u * 0.08, CYAN);
  box(ctx, u, x, y, 0.095 * u, 0.075 * u, CYAN, MAGENTA);
  box(ctx, u, x + 0.012 * u, y - 0.075 * u, 0.065 * u, 0.055 * u, GOLD, VIOLET);
}

/** The ground layer. */
export function partyFloor(ctx: Ctx, s: Scene): void {
  const gy = layerGround(s, 1);
  const u = s.u;
  if (gy - u * 0.45 > s.cssH) return;
  const cx = s.cssW / 2;
  floorConfetti(ctx, s, gy);
  // Back to front so nearer props overlap farther ones.
  marquee(ctx, s, cx + 0.37 * u, gy);
  champagne(ctx, s, cx - 0.37 * u, gy + 0.03 * u);
  partyBoxes(ctx, s, cx + 0.355 * u, gy + 0.2 * u);
  popper(ctx, s, cx - 0.23 * u, gy + 0.22 * u);
}

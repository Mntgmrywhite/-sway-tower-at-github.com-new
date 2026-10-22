import type { Ctx } from "../../base/draw";
import { BOATER, CHEF_PLEAT, CREAM, DRESS_WHITE, GOLD, GREEN, INK, NAVY, POLISH, RED, RED_LIT, type Shades } from "./colors";
import type { Frame } from "./folk";
import { J, type Pose } from "./rig";
import { starPath } from "./shapes";

// Hats and what the townsfolk wear over their clothes, painted on a figure's frame (folk.ts) in
// screen space: the band's shakos with plumes that bob a moment behind the step, the veterans'
// garrison caps, the cook's toque, the fireman's helmet, straw boaters and sun hats with ribbons
// that flutter, ball caps, hair bows; gloves, braid, sashes, epaulettes, medals, aprons. Every
// hat sits on the head's crown, turns with the face and tilts with the head.

/** Fill the current path, then draw the fine line round it. */
export function inked(ctx: Ctx, fill: string, kw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (kw <= 0) return;
  ctx.lineWidth = kw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** The head's crown on the screen: its center, radius, the face's direction and the head's tilt. */
const HEAD = { x: 0, y: 0, r: 0, fd: 1, s: 0, tilt: 0 };
export function crown(F: Frame, P: Pose): typeof HEAD {
  HEAD.x = F.x[J.head]!;
  HEAD.y = F.y[J.head]!;
  HEAD.r = F.headR;
  HEAD.fd = F.fd;
  HEAD.s = F.side;
  HEAD.tilt = P.tilt;
  return HEAD;
}

/** Turns the canvas to the head's tilt about its center: the hat is then drawn upright about (0, 0). */
function onHead(ctx: Ctx, F: Frame, P: Pose, lift = 0, lean = 0): typeof HEAD {
  const h = crown(F, P);
  ctx.save();
  ctx.translate(h.x, h.y - lift);
  ctx.rotate(h.tilt + lean);
  return h;
}

/**
 * A marching band's shako: a tall drum of a hat in its color with a shiny black peak, a gold
 * plate with a star, a cord, and a plume that bobs a moment behind the step (`plume` -1..1) and
 * leans back in the breeze of the march.
 */
export function shako(ctx: Ctx, F: Frame, P: Pose, color: Shades, plume: string, bob: number, tall = 1): void {
  const h = onHead(ctx, F, P);
  const r = h.r;
  const fd = h.fd;
  const kw = F.kw;
  const top = -r * (2.05 * tall);
  const px = -fd * r * 0.2;
  const tipX = px - fd * r * (0.45 + 0.25 * bob);
  const tipY = top - r * (1.25 - 0.18 * bob);
  const plumePath = () => {
    ctx.moveTo(px - r * 0.28, top + r * 0.1);
    ctx.quadraticCurveTo(px - r * 0.42 + (tipX - px) * 0.3, top - r * 0.6, tipX, tipY);
    ctx.quadraticCurveTo(px + r * 0.42 + (tipX - px) * 0.5, top - r * 0.55, px + r * 0.28, top + r * 0.1);
    ctx.closePath();
  };
  const crownPath = () => {
    ctx.moveTo(-r * 0.92, -r * 0.42);
    ctx.lineTo(-r * 1.0, top);
    ctx.quadraticCurveTo(0, top - r * 0.22, r * 1.0, top);
    ctx.lineTo(r * 0.92, -r * 0.42);
    ctx.quadraticCurveTo(0, -r * 0.28, -r * 0.92, -r * 0.42);
    ctx.closePath();
  };
  const peakPath = () => {
    ctx.moveTo(-r * 0.9 + fd * r * 0.2, -r * 0.44);
    ctx.quadraticCurveTo(fd * r * (0.6 + 0.6 * h.s), -r * 0.42, fd * r * (0.95 + 0.55 * h.s), -r * 0.12);
    ctx.quadraticCurveTo(fd * r * 0.5, -r * 0.2, -r * 0.9 + fd * r * 0.2, -r * 0.3);
    ctx.closePath();
  };
  // The plume (behind the crown's top edge), bobbing; the crown, lit on its left; the gold plate and cord; the black peak; one line round them all.
  ctx.beginPath();
  plumePath();
  ctx.fillStyle = plume;
  ctx.fill();
  ctx.beginPath();
  crownPath();
  ctx.fillStyle = color.body;
  ctx.fill();
  ctx.fillStyle = color.light;
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, -r * 0.5);
  ctx.lineTo(-r * 0.84, top + r * 0.12);
  ctx.lineTo(-r * 0.46, top + r * 0.06);
  ctx.lineTo(-r * 0.44, -r * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  starPath(ctx, fd * r * 0.32 * h.s, top * 0.55, r * 0.34);
  ctx.moveTo(-r * 0.92, top * 0.32);
  ctx.quadraticCurveTo(0, top * 0.18, r * 0.92, top * 0.32);
  ctx.lineTo(r * 0.92, top * 0.32 + r * 0.1);
  ctx.quadraticCurveTo(0, top * 0.18 + r * 0.1, -r * 0.92, top * 0.32 + r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  peakPath();
  ctx.fillStyle = POLISH;
  ctx.fill();
  ctx.beginPath();
  plumePath();
  crownPath();
  ctx.lineWidth = kw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** A veteran's garrison cap: a soft folded cap tipped over the right brow, piped in gold. */
export function garrison(ctx: Ctx, F: Frame, P: Pose, color: Shades): void {
  const h = onHead(ctx, F, P, 0, -0.12 * F.dir);
  const r = h.r;
  const kw = F.kw;
  ctx.beginPath();
  ctx.moveTo(-r * 1.02, -r * 0.42);
  ctx.quadraticCurveTo(-r * 0.9, -r * 1.12, -r * 0.1, -r * 1.12);
  ctx.quadraticCurveTo(r * 0.85, -r * 1.12, r * 1.04, -r * 0.5);
  ctx.quadraticCurveTo(0, -r * 0.3, -r * 1.02, -r * 0.42);
  ctx.closePath();
  inked(ctx, color.body, kw);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -r * 0.66);
  ctx.quadraticCurveTo(0, -r * 0.54, r * 0.95, -r * 0.68);
  ctx.lineTo(r * 0.95, -r * 0.6);
  ctx.quadraticCurveTo(0, -r * 0.46, -r * 0.92, -r * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The cook's tall white toque, pleated, a little floppy. */
export function toque(ctx: Ctx, F: Frame, P: Pose, flop: number): void {
  const h = onHead(ctx, F, P);
  const r = h.r;
  const kw = F.kw;
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, -r * 0.5);
  ctx.lineTo(-r * 0.92, -r * 1.2);
  ctx.quadraticCurveTo(-r * 1.5, -r * 1.7, -r * 0.7, -r * 2.2 + flop * r * 0.1);
  ctx.quadraticCurveTo(0, -r * 2.75 + flop * r * 0.15, r * 0.7 + flop * r * 0.15, -r * 2.15);
  ctx.quadraticCurveTo(r * 1.5, -r * 1.65, r * 0.92, -r * 1.2);
  ctx.lineTo(r * 0.86, -r * 0.5);
  ctx.quadraticCurveTo(0, -r * 0.36, -r * 0.86, -r * 0.5);
  ctx.closePath();
  inked(ctx, DRESS_WHITE, kw);
  ctx.strokeStyle = CHEF_PLEAT;
  ctx.lineWidth = Math.max(0.6, kw * 0.7);
  ctx.beginPath();
  for (const k of [-0.4, 0.05, 0.45]) {
    ctx.moveTo(r * k, -r * 1.22);
    ctx.quadraticCurveTo(r * (k + 0.05), -r * 1.7, r * (k * 0.8), -r * 2.15);
  }
  ctx.moveTo(-r * 0.9, -r * 1.18);
  ctx.quadraticCurveTo(0, -r * 1.05, r * 0.9, -r * 1.18);
  ctx.stroke();
  ctx.restore();
}

/** A fireman's helmet: a red dome with a long back brim and a gold shield on its front. */
export function fireHelmet(ctx: Ctx, F: Frame, P: Pose): void {
  const h = onHead(ctx, F, P);
  const r = h.r;
  const fd = h.fd;
  const kw = F.kw;
  ctx.beginPath();
  ctx.moveTo(-r * 1.25 - fd * r * 0.35, -r * 0.3);
  ctx.quadraticCurveTo(-fd * r * 0.3, -r * 0.62, r * 1.2 + fd * r * 0.1, -r * 0.42);
  ctx.quadraticCurveTo(0, -r * 0.4, -r * 1.25 - fd * r * 0.35, -r * 0.3);
  ctx.closePath();
  ctx.moveTo(-r * 0.92, -r * 0.48);
  ctx.quadraticCurveTo(-r * 0.95, -r * 1.42, 0, -r * 1.45);
  ctx.quadraticCurveTo(r * 0.95, -r * 1.42, r * 0.92, -r * 0.48);
  ctx.closePath();
  inked(ctx, RED, kw);
  ctx.fillStyle = RED_LIT;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.6);
  ctx.quadraticCurveTo(-r * 0.6, -r * 1.25, -r * 0.1, -r * 1.3);
  ctx.quadraticCurveTo(-r * 0.36, -r * 1.0, -r * 0.3, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fd * r * 0.55 * h.s, -r * 1.0);
  ctx.lineTo(fd * r * 0.55 * h.s + r * 0.3, -r * 0.82);
  ctx.lineTo(fd * r * 0.55 * h.s, -r * 0.5);
  ctx.lineTo(fd * r * 0.55 * h.s - r * 0.3, -r * 0.82);
  ctx.closePath();
  inked(ctx, GOLD, kw * 0.6);
  ctx.restore();
}

/** A straw boater: a flat crown with a red-white-blue band and a flat brim. */
export function boater(ctx: Ctx, F: Frame, P: Pose, band: string): void {
  const h = onHead(ctx, F, P, 0, -0.05 * F.dir);
  const r = h.r;
  const kw = F.kw;
  ctx.beginPath();
  ctx.moveTo(-r * 1.55, -r * 0.62);
  ctx.quadraticCurveTo(0, -r * 0.9, r * 1.55, -r * 0.62);
  ctx.quadraticCurveTo(0, -r * 0.4, -r * 1.55, -r * 0.62);
  ctx.closePath();
  ctx.moveTo(-r * 0.86, -r * 0.7);
  ctx.lineTo(-r * 0.86, -r * 1.25);
  ctx.quadraticCurveTo(0, -r * 1.38, r * 0.86, -r * 1.25);
  ctx.lineTo(r * 0.86, -r * 0.7);
  ctx.closePath();
  inked(ctx, BOATER, kw);
  ctx.fillStyle = band;
  ctx.fillRect(-r * 0.86, -r * 0.98, r * 1.72, r * 0.24);
  ctx.restore();
}

/** A wide sun hat with a ribbon round the crown whose tails flutter behind (`flutter` -1..1). */
export function sunHat(ctx: Ctx, F: Frame, P: Pose, color: string, ribbon: string, flutter: number): void {
  const h = onHead(ctx, F, P, 0, -0.08 * F.dir);
  const r = h.r;
  const fd = h.fd;
  const kw = F.kw;
  // The ribbon's tails, behind.
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  const bx = -fd * r * 0.8;
  ctx.moveTo(bx, -r * 0.95);
  ctx.quadraticCurveTo(bx - fd * r * 0.7, -r * (0.6 + 0.3 * flutter), bx - fd * r * (1.3 + 0.2 * flutter), -r * (0.2 + 0.35 * flutter));
  ctx.lineTo(bx - fd * r * (1.05 + 0.2 * flutter), -r * (0.05 + 0.3 * flutter));
  ctx.quadraticCurveTo(bx - fd * r * 0.45, -r * 0.5, bx + fd * r * 0.1, -r * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 1.75, -r * 0.48);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.95, 0, -r * 0.9);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.95, r * 1.75, -r * 0.48);
  ctx.quadraticCurveTo(0, -r * 0.38, -r * 1.75, -r * 0.48);
  ctx.closePath();
  ctx.moveTo(-r * 0.85, -r * 0.75);
  ctx.quadraticCurveTo(-r * 0.9, -r * 1.5, 0, -r * 1.5);
  ctx.quadraticCurveTo(r * 0.9, -r * 1.5, r * 0.85, -r * 0.75);
  ctx.closePath();
  inked(ctx, color, kw);
  ctx.fillStyle = ribbon;
  ctx.fillRect(-r * 0.86, -r * 1.02, r * 1.72, r * 0.22);
  ctx.restore();
}

/** A ball cap with its peak toward the face. */
export function ballCap(ctx: Ctx, F: Frame, P: Pose, color: string): void {
  const h = onHead(ctx, F, P);
  const r = h.r;
  const fd = h.fd;
  const kw = F.kw;
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, -r * 0.3);
  ctx.quadraticCurveTo(-r * 1.0, -r * 1.22, 0, -r * 1.2);
  ctx.quadraticCurveTo(r * 1.0, -r * 1.22, r * 1.0, -r * 0.3);
  ctx.closePath();
  ctx.moveTo(fd * r * 0.1, -r * 0.42);
  ctx.quadraticCurveTo(fd * r * (0.9 + 0.5 * h.s), -r * 0.55, fd * r * (1.1 + 0.7 * h.s), -r * 0.3);
  ctx.quadraticCurveTo(fd * r * 0.7, -r * 0.25, fd * r * 0.1, -r * 0.3);
  ctx.closePath();
  inked(ctx, color, kw);
  ctx.restore();
}

/** A hair bow on the crown. */
export function bow(ctx: Ctx, F: Frame, P: Pose, color: string): void {
  const h = onHead(ctx, F, P);
  const r = h.r;
  const kw = F.kw;
  const x = -h.fd * r * 0.35 * h.s;
  const y = -r * 0.98;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - r * 0.55, y - r * 0.45, x - r * 0.6, y + r * 0.05);
  ctx.closePath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + r * 0.55, y - r * 0.45, x + r * 0.6, y + r * 0.05);
  ctx.closePath();
  inked(ctx, color, kw * 0.7);
  ctx.restore();
}

/**
 * Uncle Sam's top hat: a tall cream crown striped red with a navy band of white stars and a wide
 * brim, lifted off the head and tipped when he doffs it (`tip` 0..1), held at (hx, hy) by then.
 */
export function topHat(ctx: Ctx, F: Frame, P: Pose, tip: number, hx: number, hy: number): void {
  const h = crown(F, P);
  const r = h.r;
  const kw = F.kw;
  const x = h.x + (hx - h.x) * tip;
  const y = h.y - r * 0.55 + (hy - (h.y - r * 0.55)) * tip;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(h.tilt + tip * 0.5 * F.dir);
  const H = r * 2.3;
  const w = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w * 1.06, -H);
  ctx.quadraticCurveTo(0, -H - r * 0.2, w * 1.06, -H);
  ctx.lineTo(w, 0);
  ctx.closePath();
  inked(ctx, CREAM, kw);
  ctx.fillStyle = RED;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x0 = -w + w * (0.32 + i * 0.6);
    ctx.rect(x0, -H + kw, w * 0.26, H - r * 0.6);
  }
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillRect(-w + kw * 0.5, -r * 0.62, w * 2 - kw, r * 0.5);
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) starPath(ctx, w * k, -r * 0.37, r * 0.17);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-w * 1.55, -r * 0.05);
  ctx.quadraticCurveTo(0, -r * 0.3, w * 1.55, -r * 0.05);
  ctx.quadraticCurveTo(w * 1.5, r * 0.18, w * 1.2, r * 0.14);
  ctx.quadraticCurveTo(0, r * 0.02, -w * 1.2, r * 0.14);
  ctx.quadraticCurveTo(-w * 1.5, r * 0.18, -w * 1.55, -r * 0.05);
  ctx.closePath();
  inked(ctx, CREAM, kw);
  ctx.restore();
}

// ---------------------------------------------------------------- over the clothes

/** A diagonal sash or cross-belt from the far shoulder to the near hip, `w` px wide: a band as one fill. */
export function sash(ctx: Ctx, F: Frame, color: string, w: number): void {
  const ax = F.x[J.shF]!;
  const ay = F.y[J.shF]!;
  const bx = F.x[J.hipN]!;
  const by = F.y[J.hipN]!;
  const x0 = ax + (bx - ax) * 0.08;
  const y0 = ay + (by - ay) * 0.08;
  const x1 = ax + (bx - ax) * 0.92;
  const y1 = ay + (by - ay) * 0.92;
  const d = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (-(y1 - y0) / d) * w * 0.5;
  const ny = ((x1 - x0) / d) * w * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0 + nx, y0 + ny);
  ctx.lineTo(x1 + nx, y1 + ny);
  ctx.lineTo(x1 - nx, y1 - ny);
  ctx.lineTo(x0 - nx, y0 - ny);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Rows of gold braid across the chest of a band jacket (thin bands, one fill), and gold epaulettes on the shoulders if asked. */
export function braid(ctx: Ctx, F: Frame, color: string, rows: number, shoulders = false): void {
  const cx = F.x[J.chest]!;
  const cy = F.y[J.chest]!;
  const px = F.x[J.pelvis]!;
  const py = F.y[J.pelvis]!;
  const w = Math.abs(F.x[J.shN]! - F.x[J.shF]!) * 0.45 + F.k * 0.004;
  const front = F.fd * F.side * F.k * 0.004;
  const th = Math.max(0.7, F.k * 0.0022);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < rows; i++) {
    const t = 0.2 + i * 0.16;
    const x = cx + (px - cx) * t + front;
    const y = cy + (py - cy) * t;
    ctx.moveTo(x - w, y - th / 2);
    ctx.quadraticCurveTo(x, y + F.k * 0.002 - th / 2, x + w, y - th / 2);
    ctx.lineTo(x + w, y + th / 2);
    ctx.quadraticCurveTo(x, y + F.k * 0.002 + th / 2, x - w, y + th / 2);
    ctx.closePath();
  }
  if (shoulders) {
    for (const j of [J.shF, J.shN]) {
      const x = F.x[j]!;
      const y = F.y[j]! - F.k * 0.001;
      ctx.moveTo(x + F.k * 0.006, y);
      ctx.ellipse(x, y, F.k * 0.006, F.k * 0.0035, 0, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/** A veteran's ribbons and a medal on the chest. */
export function medals(ctx: Ctx, F: Frame): void {
  const cx = F.x[J.chest]! + F.fd * F.side * F.k * 0.004;
  const cy = F.y[J.chest]! + F.k * 0.012;
  const w = F.k * 0.0035;
  const colors = [RED, CREAM, NAVY, GOLD, GREEN, RED];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colors[i]!;
    ctx.fillRect(cx - w * 1.5 + (i % 3) * w, cy + Math.floor(i / 3) * w * 0.7, w, w * 0.65);
  }
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  starPath(ctx, cx - w * 0.2, cy + w * 2.4, w * 0.9);
  ctx.fill();
}

/** An apron over the front of the body, from the chest to the knees, its tie at the waist. */
export function apron(ctx: Ctx, F: Frame, color: string, kw: number): void {
  const cx = F.x[J.chest]!;
  const cy = F.y[J.chest]!;
  const px = F.x[J.pelvis]!;
  const py = F.y[J.pelvis]!;
  const kx = (F.x[J.kneeN]! + F.x[J.kneeF]!) / 2;
  const ky = (F.y[J.kneeN]! + F.y[J.kneeF]!) / 2;
  const front = F.fd * F.side;
  const w = F.k * 0.009;
  const tx = cx + (px - cx) * 0.18 + front * F.k * 0.005;
  const ty = cy + (py - cy) * 0.18;
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.7, ty);
  ctx.lineTo(tx + w * 0.7, ty);
  ctx.quadraticCurveTo(px + front * F.k * 0.012 + w * 0.6, py - F.k * 0.006, kx + front * F.k * 0.008 + w * 1.1, ky + F.k * 0.004);
  ctx.quadraticCurveTo(kx + front * F.k * 0.004, ky + F.k * 0.008, kx + front * F.k * 0.002 - w * 1.1, ky + F.k * 0.004);
  ctx.quadraticCurveTo(px + front * F.k * 0.004 - w * 0.8, py - F.k * 0.006, tx - w * 0.7, ty);
  ctx.closePath();
  inked(ctx, color, kw);
}

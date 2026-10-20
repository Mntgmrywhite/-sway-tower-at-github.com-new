import { circle, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import { CHEEK, INK, type Shades } from "./colors";
import { maskEyes, maskPath } from "./shapes";

// The folks of the street and the parade: our own little figures, drawn in their own frame (u
// units, feet at the origin, y up is negative, facing right, mirrored to face left), with flat
// two-tone fills and one ink weight. A figure is a shirt or coat over trousers (or a skirt),
// stroke arms and legs from the shoulders and hips to wherever a pose puts the hands and feet,
// and a round head with a hat or hair; some wear a half mask with feathers. One figure serves
// the band, the marshal, the riders, the stilt walker, the flambeaux carriers, the family on the
// gallery and the kids at the curb.

/** A figure's pose this frame, in its own frame (feet at 0, 0; y up is negative; facing right). */
export interface Figure {
  /** Facing: +1 right, -1 left. */
  m: number;
  /** Drawn at this fraction of full size (kids are small). */
  size: number;
  /** Leaning about the hips (radians, + forward), and a hop off the ground (u). */
  lean: number;
  lift: number;
  /** Legs: each foot's x offset from under the hips, and how high it is raised (u). */
  footL: number;
  footR: number;
  raiseL: number;
  raiseR: number;
  /** Hands, relative to the figure's origin (u). */
  handLx: number;
  handLy: number;
  handRx: number;
  handRy: number;
  /** The mouth: 0 a smile, 1 open wide (cheering, blowing). */
  mouth: number;
  /** Clothes: the top, the bottom, and the skin and hair. */
  top: Shades;
  bottom: Shades;
  skin: Shades;
  hair: string;
  /** A skirt instead of trousers. */
  skirt: boolean;
  /** Headwear: none, a band cap, a top hat, a jester's hat, or a mask with feathers over the eyes. */
  hat: "none" | "cap" | "topHat" | "jester" | "mask" | "beret";
  /** The hat's (or mask's) color. */
  hatColor: Shades;
}

/** The figure's proportions (u) at full size: hips, shoulders, head center and radius. */
const HIP = -0.08;
const SHOULDER = -0.125;
const HEAD_Y = -0.15;
const HEAD_R = 0.022;
/** A fresh pose standing easy, hands at the sides. */
export function standing(top: Shades, bottom: Shades, skin: Shades, hair: string): Figure {
  return {
    m: 1,
    size: 1,
    lean: 0,
    lift: 0,
    footL: -0.01,
    footR: 0.01,
    raiseL: 0,
    raiseR: 0,
    handLx: -0.03,
    handLy: -0.07,
    handRx: 0.03,
    handRy: -0.07,
    mouth: 0,
    top,
    bottom,
    skin,
    hair,
    skirt: false,
    hat: "none",
    hatColor: top,
  };
}

/** A walking pose at stride phase `p` (radians): legs swing, arms counter-swing, a little bounce. */
export function walk(f: Figure, p: number, stride = 0.028, swing = 0.02): Figure {
  const a = Math.sin(p);
  f.footL = -a * stride;
  f.footR = a * stride;
  f.raiseL = Math.max(0, -Math.cos(p)) * 0.012;
  f.raiseR = Math.max(0, Math.cos(p)) * 0.012;
  f.lift = Math.abs(a) * 0.004;
  f.handLx = -0.028 + a * swing;
  f.handRx = 0.028 - a * swing;
  f.handLy = -0.07 - Math.abs(a) * 0.006;
  f.handRy = -0.07 - Math.abs(a) * 0.006;
  return f;
}

/** A leg from the hip to a foot: a stroke of trouser (or stocking) over ink, then the shoe. */
function leg(ctx: Ctx, w: number, hipX: number, footX: number, raise: number, color: string): void {
  const kneeX = (hipX + footX) / 2 + 0.006 * raise * 40;
  const kneeY = HIP * 0.5 - raise * 0.5;
  const footY = -raise;
  ctx.beginPath();
  ctx.moveTo(hipX, HIP + 0.006);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY - 0.004);
  inkedLine(ctx, color, 0.014, w * 0.55, INK);
  ctx.beginPath();
  oval(ctx, footX + 0.004, footY - 0.003, 0.011, 0.005);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** An arm from the shoulder to a hand: a stroke of sleeve over ink, then the hand. */
function arm(ctx: Ctx, w: number, shoulderX: number, handX: number, handY: number, sleeve: string, skin: string): void {
  const dx = handX - shoulderX;
  const dy = handY - SHOULDER;
  const len = Math.hypot(dx, dy);
  const bend = Math.max(0, 0.04 - len) * 0.6;
  const ex = (shoulderX + handX) / 2 + (dy / Math.max(0.001, len)) * bend;
  const ey = (SHOULDER + handY) / 2 - (dx / Math.max(0.001, len)) * bend;
  ctx.beginPath();
  ctx.moveTo(shoulderX, SHOULDER + 0.004);
  ctx.lineTo(ex, ey);
  ctx.lineTo(handX, handY);
  inkedLine(ctx, sleeve, 0.011, w * 0.55, INK);
  ctx.beginPath();
  circle(ctx, handX, handY, 0.006);
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, w * 0.5, INK);
}

/** The body: a shirt or coat from the shoulders to the hips (or a skirt flaring to the knees). */
function body(ctx: Ctx, f: Figure, w: number): void {
  const c = f.top;
  ctx.beginPath();
  if (f.skirt) {
    ctx.moveTo(-0.022, SHOULDER + 0.004);
    ctx.lineTo(0.022, SHOULDER + 0.004);
    ctx.lineTo(0.02, HIP);
    ctx.lineTo(0.034, HIP + 0.045);
    ctx.lineTo(-0.034, HIP + 0.045);
    ctx.lineTo(-0.02, HIP);
    ctx.closePath();
  } else {
    ctx.moveTo(-0.024, SHOULDER + 0.004);
    ctx.lineTo(0.024, SHOULDER + 0.004);
    ctx.lineTo(0.021, HIP + 0.012);
    ctx.lineTo(-0.021, HIP + 0.012);
    ctx.closePath();
  }
  ctx.fillStyle = c.body;
  ctx.fill();
  ink(ctx, w, INK);
  ctx.fillStyle = c.light;
  ctx.fillRect(-0.016, SHOULDER + 0.01, 0.01, (HIP - SHOULDER) * 0.7);
  if (f.skirt) {
    ctx.fillStyle = f.bottom.body;
    ctx.beginPath();
    ctx.moveTo(-0.02, HIP);
    ctx.lineTo(0.02, HIP);
    ctx.lineTo(0.034, HIP + 0.045);
    ctx.lineTo(-0.034, HIP + 0.045);
    ctx.closePath();
    ctx.fill();
    ink(ctx, w, INK);
  }
}

/** The head: a round face with a cheek and a mouth, hair, and the hat or mask on top. */
function head(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
  ctx.beginPath();
  circle(ctx, 0, y, r);
  ctx.fillStyle = f.skin.body;
  ctx.fill();
  ink(ctx, w, INK);
  // Hair: a cap of hair over the top of the head, unless a hat covers it.
  if (f.hat === "none" || f.hat === "mask") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.98, y - r * 0.15);
    ctx.quadraticCurveTo(-r * 0.6, y - r * 1.25, r * 0.3, y - r * 1.15);
    ctx.quadraticCurveTo(r * 0.9, y - r * 1.05, r * 0.98, y - r * 0.3);
    ctx.quadraticCurveTo(r * 0.5, y - r * 0.5, 0, y - r * 0.58);
    ctx.quadraticCurveTo(-r * 0.5, y - r * 0.5, -r * 0.98, y - r * 0.15);
    ctx.closePath();
    ctx.fillStyle = f.hair;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
  }
  // A rosy cheek, an eye, and the mouth: a smile, or open wide.
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, r * 0.45, y + r * 0.25, r * 0.26, r * 0.18);
  ctx.fill();
  if (f.hat !== "mask") {
    ctx.fillStyle = INK;
    ctx.beginPath();
    circle(ctx, r * 0.42, y - r * 0.12, r * 0.13);
    ctx.fill();
  }
  if (f.mouth < 0.3) {
    ctx.beginPath();
    ctx.moveTo(r * 0.2, y + r * 0.5);
    ctx.quadraticCurveTo(r * 0.5, y + r * 0.75, r * 0.8, y + r * 0.45);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.7;
    ctx.lineCap = "round";
    ctx.stroke();
  } else {
    ctx.beginPath();
    oval(ctx, r * 0.5, y + r * 0.52, r * 0.2, r * (0.12 + 0.2 * f.mouth));
    ctx.fillStyle = "#7a2633";
    ctx.fill();
    ink(ctx, w * 0.6, INK);
  }
  hat(ctx, f, w);
}

/** The headwear. */
function hat(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
  const c = f.hatColor;
  if (f.hat === "cap") {
    // A band cap: a round crown with a short peak forward.
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, y - r * 0.55);
    ctx.lineTo(r * 1.0, y - r * 0.55);
    ctx.lineTo(r * 0.95, y - r * 1.2);
    ctx.quadraticCurveTo(0, y - r * 1.6, -r * 0.95, y - r * 1.2);
    ctx.closePath();
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.8, INK);
    ctx.beginPath();
    ctx.moveTo(r * 0.5, y - r * 0.55);
    ctx.lineTo(r * 1.45, y - r * 0.5);
    ctx.lineTo(r * 1.4, y - r * 0.3);
    ctx.lineTo(r * 0.5, y - r * 0.35);
    ctx.closePath();
    ctx.fillStyle = c.shade;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
    ctx.fillStyle = c.light;
    ctx.fillRect(-r * 0.7, y - r * 1.05, r * 1.3, r * 0.14);
  } else if (f.hat === "topHat") {
    ctx.beginPath();
    ctx.rect(-r * 1.3, y - r * 0.8, r * 2.6, r * 0.22);
    ctx.rect(-r * 0.85, y - r * 2.0, r * 1.7, r * 1.25);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.8, INK);
    ctx.fillStyle = c.light;
    ctx.fillRect(-r * 0.6, y - r * 1.9, r * 0.3, r * 1.0);
    ctx.fillStyle = c.shade;
    ctx.fillRect(-r * 0.85, y - r * 0.95, r * 1.7, r * 0.18);
  } else if (f.hat === "jester") {
    // A three-pointed jester's hat with a bell on each point.
    const tips = [
      [-r * 1.7, y - r * 1.4],
      [0, y - r * 2.3],
      [r * 1.7, y - r * 1.4],
    ] as const;
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, y - r * 0.5);
    ctx.quadraticCurveTo(-r * 1.1, y - r * 1.2, tips[0][0], tips[0][1]);
    ctx.quadraticCurveTo(-r * 0.6, y - r * 1.3, -r * 0.4, y - r * 1.1);
    ctx.quadraticCurveTo(-r * 0.3, y - r * 2.0, tips[1][0], tips[1][1]);
    ctx.quadraticCurveTo(r * 0.3, y - r * 2.0, r * 0.4, y - r * 1.1);
    ctx.quadraticCurveTo(r * 0.6, y - r * 1.3, tips[2][0], tips[2][1]);
    ctx.quadraticCurveTo(r * 1.1, y - r * 1.2, r * 1.0, y - r * 0.5);
    ctx.closePath();
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.8, INK);
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, y - r * 1.1);
    ctx.quadraticCurveTo(-r * 0.2, y - r * 1.9, tips[1][0], tips[1][1]);
    ctx.quadraticCurveTo(r * 0.05, y - r * 1.6, r * 0.1, y - r * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    for (const [tx, ty] of tips) circle(ctx, tx, ty, r * 0.2);
    ctx.fill();
    ink(ctx, w * 0.6, INK);
  } else if (f.hat === "beret") {
    ctx.beginPath();
    oval(ctx, -r * 0.15, y - r * 0.95, r * 1.25, r * 0.5);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.8, INK);
  } else if (f.hat === "mask") {
    // A half mask over the eyes, with two feathers rising from its side.
    ctx.beginPath();
    ctx.moveTo(r * 0.5, y - r * 0.7);
    ctx.quadraticCurveTo(r * 1.2, y - r * 1.9, r * 0.9, y - r * 2.6);
    ctx.quadraticCurveTo(r * 1.1, y - r * 1.7, r * 0.7, y - r * 0.7);
    ctx.closePath();
    ctx.moveTo(r * 0.3, y - r * 0.8);
    ctx.quadraticCurveTo(r * 0.3, y - r * 2.0, -r * 0.2, y - r * 2.5);
    ctx.quadraticCurveTo(r * 0.5, y - r * 1.8, r * 0.5, y - r * 0.8);
    ctx.closePath();
    ctx.fillStyle = "#ff5fa8";
    ctx.fill();
    ink(ctx, w * 0.6, INK);
    ctx.beginPath();
    maskPath(ctx, r * 0.1, y - r * 0.1, r * 2.2);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
    ctx.beginPath();
    maskEyes(ctx, r * 0.1, y - r * 0.1, r * 2.2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

/**
 * Draw a figure with its feet at (x, y) on screen, `u` px per unit, ink width `lw` px: legs,
 * the far arm, the body, the head, then the near arm, so the near arm can hold things in front.
 * Returns nothing; the caller draws what the hands hold after it (the hands' places are in `f`).
 */
export function figure(ctx: Ctx, f: Figure, x: number, y: number, u: number, lw: number): void {
  const k = u * f.size;
  const w = lw / k;
  ctx.save();
  ctx.translate(x, y - f.lift * k);
  ctx.scale(k * f.m, k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const trouser = f.skirt ? f.skin.body : f.bottom.body;
  leg(ctx, w, -0.01, f.footL, f.raiseL, trouser);
  leg(ctx, w, 0.01, f.footR, f.raiseR, trouser);
  ctx.save();
  ctx.translate(0, HIP);
  ctx.rotate(f.lean);
  ctx.translate(0, -HIP);
  arm(ctx, w, -0.018, f.handLx, f.handLy, f.top.shade, f.skin.body);
  body(ctx, f, w);
  head(ctx, f, w);
  arm(ctx, w, 0.018, f.handRx, f.handRy, f.top.body, f.skin.body);
  ctx.restore();
  ctx.restore();
}

/** The screen place of a figure's near (right) hand, for things it holds: scratch result. */
const HAND = { x: 0, y: 0 };
export function nearHand(f: Figure, x: number, y: number, u: number): typeof HAND {
  const k = u * f.size;
  HAND.x = x + f.handRx * k * f.m;
  HAND.y = y - f.lift * k + f.handRy * k;
  return HAND;
}

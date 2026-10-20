import { circle, ink, inkedLine, oval, type Ctx } from "../../base/draw";
import { BONE, CHEEK, FEATHER, GOLD, GREEN, INK, PINK, PURPLE, SILVER, SUN_RAY, type Shades } from "./colors";
import { block, maskEyes, maskPath, sparkle } from "./shapes";

// The folks of the street and the parade: our own little figures, drawn in their own frame (u
// units, feet at the origin, y up is negative, facing right, mirrored to face left), with flat
// two-tone fills and one ink weight. A figure is a shirt or coat over trousers (or a skirt),
// stroke arms and legs from the shoulders and hips to wherever a pose puts the hands and feet,
// and a round head with a hat or hair; many wear a Carnival mask over the eyes (feathered,
// sequined, a jester's harlequin, a sun with its rays, a crescent moon, a cat with its ears). The
// skeleton krewe are the same figure with a grinning skull for a head, a tailcoat open on a
// ribcage and white gloves; a kid in a skeleton suit wears the suit printed with bones and its
// hood, a skull over the whole head. One figure serves the band, the marshal, the riders, the
// skeletons, the stilt walker, the flambeaux carriers, the family on the gallery and the kids
// at the curb.

/** A Carnival mask over the eyes. */
export type Mask = "none" | "feather" | "sequin" | "harlequin" | "sun" | "moon" | "cat";

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
  /** Headwear: none, a band cap, a top hat (with a band), a jester's hat, or a beret. */
  hat: "none" | "cap" | "topHat" | "jester" | "beret";
  /** The hat's color. */
  hatColor: Shades;
  /** The hat tipped this far (radians, + toward the face): a jaunty dance. */
  hatTilt: number;
  /** A mask over the eyes, and its color. */
  mask: Mask;
  maskColor: Shades;
  /** A grinning skull for a head: a skeleton's, or the hood of a kid's skeleton suit. */
  skull: boolean;
  /** The clothes' cut: plain, a tailcoat open on a ribcage, or a skeleton suit printed with bones. */
  suit: "plain" | "tails" | "bones";
  /** White gloves (a little bigger than hands). */
  gloves: boolean;
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
    hatTilt: 0,
    mask: "none",
    maskColor: top,
    skull: false,
    suit: "plain",
    gloves: false,
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

/** A leg from the hip to a foot: a stroke of trouser (or stocking) over ink, a bone printed down it on a skeleton suit, then the shoe. */
function leg(ctx: Ctx, w: number, hipX: number, footX: number, raise: number, color: string, bones: boolean): void {
  const kneeX = (hipX + footX) / 2 + 0.006 * raise * 40;
  const kneeY = HIP * 0.5 - raise * 0.5;
  const footY = -raise;
  ctx.beginPath();
  ctx.moveTo(hipX, HIP + 0.006);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY - 0.004);
  inkedLine(ctx, color, 0.014, w * 0.55, INK);
  if (bones) boneStripe(ctx, hipX, HIP + 0.01, kneeX, kneeY, footX, footY - 0.008);
  ctx.beginPath();
  oval(ctx, footX + 0.004, footY - 0.003, 0.011, 0.005);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The bone printed down a skeleton suit's limb: a pale stroke from the joint to the joint, with a knob at each. */
function boneStripe(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = BONE.body;
  ctx.lineWidth = 0.0045;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x1, y1, 0.0042);
  ctx.fillStyle = BONE.body;
  ctx.fill();
}

/** An arm from the shoulder to a hand: a stroke of sleeve over ink (a bone printed down it on a skeleton suit), then the hand or a white glove. */
function arm(ctx: Ctx, w: number, f: Figure, shoulderX: number, handX: number, handY: number, sleeve: string): void {
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
  if (f.suit === "bones") boneStripe(ctx, shoulderX, SHOULDER + 0.006, ex, ey, handX, handY);
  ctx.beginPath();
  if (f.gloves) {
    // A white glove: a round palm and a thumb, inked as one.
    circle(ctx, handX, handY, 0.0085);
    circle(ctx, handX + 0.006, handY + 0.004, 0.0035);
    ctx.fillStyle = BONE.light;
    ctx.fill();
    ink(ctx, w * 0.55, INK);
    ctx.fill();
  } else {
    circle(ctx, handX, handY, 0.006);
    ctx.fillStyle = f.skin.body;
    ctx.fill();
    ink(ctx, w * 0.5, INK);
  }
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
  if (f.suit === "tails") {
    // The coat's tails, hanging behind to the knees.
    ctx.moveTo(-0.021, HIP + 0.004);
    ctx.lineTo(-0.036, HIP + 0.052);
    ctx.lineTo(-0.022, HIP + 0.05);
    ctx.lineTo(-0.008, HIP + 0.012);
    ctx.closePath();
  }
  ctx.fillStyle = c.body;
  ctx.fill();
  ink(ctx, w, INK);
  if (f.suit !== "plain") {
    ribs(ctx, f, w);
    return;
  }
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

/** The heaviest a rib's line gets, in the figure's own units. */
const RIB_W = 0.0028;

/**
 * A skeleton's chest: a bone-white ribcage (the tailcoat open on it, with lapels and a gold bow
 * tie at the collar; or printed on a skeleton suit), its ribs and breastbone drawn in ink.
 */
function ribs(ctx: Ctx, f: Figure, w: number): void {
  const top = SHOULDER + 0.008;
  const bottom = HIP - 0.002;
  ctx.beginPath();
  ctx.moveTo(-0.012, top);
  ctx.lineTo(0.016, top);
  ctx.quadraticCurveTo(0.02, (top + bottom) / 2, 0.012, bottom);
  ctx.lineTo(-0.008, bottom);
  ctx.quadraticCurveTo(-0.016, (top + bottom) / 2, -0.012, top);
  ctx.closePath();
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ink(ctx, Math.min(w * 0.6, RIB_W * 1.5), INK);
  // Three ribs either side of the breastbone, curving down from it: fine lines, never so heavy
  // on a small figure (a kid in a skeleton suit) that the ink swallows the bone.
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = top + 0.008 + i * 0.0095;
    ctx.moveTo(-0.011, y + 0.003);
    ctx.quadraticCurveTo(-0.004, y - 0.002, 0.002, y);
    ctx.quadraticCurveTo(0.009, y - 0.002, 0.016, y + 0.003);
  }
  ctx.moveTo(0.002, top + 0.004);
  ctx.lineTo(0.002, bottom - 0.006);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.min(w * 0.6, RIB_W);
  ctx.lineCap = "round";
  ctx.stroke();
  if (f.suit !== "tails") return;
  // The lapels, folded back over the ribcage's edges, and the bow tie.
  ctx.beginPath();
  ctx.moveTo(-0.014, top - 0.002);
  ctx.lineTo(-0.004, top - 0.002);
  ctx.lineTo(-0.013, top + 0.03);
  ctx.closePath();
  ctx.moveTo(0.019, top - 0.002);
  ctx.lineTo(0.009, top - 0.002);
  ctx.lineTo(0.019, top + 0.03);
  ctx.closePath();
  ctx.fillStyle = f.top.light;
  ctx.fill();
  ink(ctx, w * 0.6, INK);
  ctx.beginPath();
  ctx.moveTo(0.003, top + 0.001);
  ctx.lineTo(-0.007, top - 0.005);
  ctx.lineTo(-0.007, top + 0.007);
  ctx.closePath();
  ctx.moveTo(0.003, top + 0.001);
  ctx.lineTo(0.013, top - 0.005);
  ctx.lineTo(0.013, top + 0.007);
  ctx.closePath();
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, w * 0.5, INK);
}

/**
 * A grinning cartoon skull, turned three-quarters toward the way the figure faces: a round
 * cranium over a jaw that drops as the grin widens, big dark eye sockets with a glint in each,
 * a little nose and a row of teeth. Friendly, never fierce.
 */
function skull(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
  const drop = f.mouth * r * 0.2;
  ctx.beginPath();
  block(ctx, -r * 0.4, y + r * 0.42 + drop, r * 1.3, r * 0.66, r * 0.3);
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.beginPath();
  circle(ctx, r * 0.05, y - r * 0.1, r * 1.02);
  ctx.fillStyle = BONE.body;
  ctx.fill();
  ink(ctx, w, INK);
  ctx.fillStyle = BONE.light;
  ctx.beginPath();
  oval(ctx, -r * 0.35, y - r * 0.62, r * 0.36, r * 0.2, -0.5);
  ctx.fill();
  // The eye sockets, the near one rounder, each with a glint.
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, -r * 0.08, y - r * 0.08, r * 0.28, r * 0.34);
  oval(ctx, r * 0.6, y - r * 0.08, r * 0.3, r * 0.36);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, -r * 0.02, y - r * 0.18, r * 0.09);
  circle(ctx, r * 0.67, y - r * 0.18, r * 0.1);
  ctx.fill();
  // The nose, and the teeth: a row along the cranium's lower edge, ticked into four.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(r * 0.36, y + r * 0.2);
  ctx.lineTo(r * 0.24, y + r * 0.42);
  ctx.lineTo(r * 0.48, y + r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  block(ctx, -r * 0.18, y + r * 0.56, r * 1.0, r * 0.3 + drop, r * 0.08);
  ctx.fillStyle = BONE.light;
  ctx.fill();
  ink(ctx, w * 0.6, INK);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = -r * 0.18 + (r * i) / 4;
    ctx.moveTo(x, y + r * 0.58);
    ctx.lineTo(x, y + r * 0.84 + drop);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.5;
  ctx.stroke();
}

/** The head: a round face with a cheek and a mouth (or a skull), hair, the mask, and the hat on top. */
function head(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
  maskBehind(ctx, f, w);
  if (f.skull) {
    skull(ctx, f, w);
    maskFront(ctx, f, w);
    hat(ctx, f, w);
    return;
  }
  ctx.beginPath();
  circle(ctx, 0, y, r);
  ctx.fillStyle = f.skin.body;
  ctx.fill();
  ink(ctx, w, INK);
  if (f.hat === "none") hair(ctx, f, w);
  // A rosy cheek, an eye (unless a mask is over it), and the mouth: a smile, or open wide.
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, r * 0.45, y + r * 0.25, r * 0.26, r * 0.18);
  ctx.fill();
  if (f.mask === "none") {
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
  maskFront(ctx, f, w);
  hat(ctx, f, w);
}

/** Hair: a cap of it over the top of the head. */
function hair(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
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

/** The headwear. */
function hat(ctx: Ctx, f: Figure, w: number): void {
  if (f.hat === "none") return;
  const r = HEAD_R;
  const y = HEAD_Y;
  const c = f.hatColor;
  ctx.save();
  if (f.hatTilt !== 0) {
    ctx.translate(0, y - r * 0.6);
    ctx.rotate(f.hatTilt);
    ctx.translate(0, -(y - r * 0.6));
  }
  hatShape(ctx, f, w, r, y, c);
  ctx.restore();
}

function hatShape(ctx: Ctx, f: Figure, w: number, r: number, y: number, c: Shades): void {
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
    // A band round the crown, gold (purple on a gold hat).
    ctx.fillStyle = c === GOLD ? PURPLE.body : GOLD.body;
    ctx.fillRect(-r * 0.85, y - r * 1.12, r * 1.7, r * 0.3);
    ctx.beginPath();
    ctx.rect(-r * 0.85, y - r * 1.12, r * 1.7, r * 0.3);
    ink(ctx, w * 0.5, INK);
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
  }
}

/** The parts of a mask that stand behind the head: the sun's rays, the moon's crescent. */
function maskBehind(ctx: Ctx, f: Figure, w: number): void {
  const r = HEAD_R;
  const y = HEAD_Y;
  if (f.mask === "sun") {
    // A gold sun behind the head, ringed by ten rays, long gold and short orange by turns.
    const cx = r * 0.05;
    const cy = y - r * 0.05;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = k; i < 10; i += 2) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const len = k ? 1.65 : 2.05;
        ctx.moveTo(cx + Math.cos(a - 0.3) * r, cy + Math.sin(a - 0.3) * r);
        ctx.lineTo(cx + Math.cos(a) * r * len, cy + Math.sin(a) * r * len);
        ctx.lineTo(cx + Math.cos(a + 0.3) * r, cy + Math.sin(a + 0.3) * r);
        ctx.closePath();
      }
      ctx.fillStyle = k ? SUN_RAY.body : GOLD.body;
      ctx.fill();
      ink(ctx, w * 0.4, INK);
    }
    ctx.beginPath();
    circle(ctx, cx, cy, r * 1.22);
    ctx.fillStyle = GOLD.light;
    ctx.fill();
    ink(ctx, w * 0.5, INK);
  } else if (f.mask === "moon") {
    // A silver crescent moon curving round the back of the head, from over the brow to the nape.
    ctx.beginPath();
    ctx.moveTo(r * 0.4, y - r * 2.15);
    ctx.quadraticCurveTo(-r * 2.6, y - r * 2.4, -r * 1.3, y + r * 0.6);
    ctx.quadraticCurveTo(-r * 1.2, y - r * 1.0, r * 0.4, y - r * 2.15);
    ctx.closePath();
    ctx.fillStyle = SILVER.body;
    ctx.fill();
    ink(ctx, w * 0.6, INK);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, y - r * 1.95);
    ctx.quadraticCurveTo(-r * 1.9, y - r * 1.9, -r * 1.45, y - r * 0.4);
    ctx.quadraticCurveTo(-r * 1.4, y - r * 1.4, -r * 0.2, y - r * 1.95);
    ctx.closePath();
    ctx.fillStyle = SILVER.light;
    ctx.fill();
  }
}

/**
 * A plume as its own subpath: a leaf from its quill at (bx, by) to a pointed tip at (tx, ty),
 * `wide` across, its curve swept back by `sweep` (head units).
 */
function plume(ctx: Ctx, bx: number, by: number, tx: number, ty: number, wide: number, sweep: number): void {
  const mx = bx + (tx - bx) * 0.55 + sweep;
  const my = by + (ty - by) * 0.55;
  const len = Math.hypot(tx - bx, ty - by);
  const nx = (-(ty - by) / len) * wide;
  const ny = ((tx - bx) / len) * wide;
  ctx.moveTo(bx + nx * 0.3, by + ny * 0.3);
  ctx.quadraticCurveTo(mx + nx * 1.3, my + ny * 1.3, tx, ty);
  ctx.quadraticCurveTo(mx - nx * 1.3, my - ny * 1.3, bx - nx * 0.3, by - ny * 0.3);
  ctx.closePath();
}

/** How high a feathered mask's plumes reach over the head's center (head radii). */
const PLUME_UP = 1.85;

/** The mask over the eyes, and what rises from it: feathers, a plume, a cat's ears. */
function maskFront(ctx: Ctx, f: Figure, w: number): void {
  if (f.mask === "none") return;
  const r = HEAD_R;
  const y = HEAD_Y;
  const c = f.maskColor;
  const mx = r * 0.1;
  const my = y - r * 0.1;
  const mw = r * 2.2;
  if (f.mask === "feather") {
    // A fan of three plumes from the mask's temple, swept back, the middle one gold: a short,
    // full fan, so a grown-up on the gallery keeps it under the eave (PLUME_UP).
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      if (k) plume(ctx, r * 0.45, y - r * 0.8, r * 0.05, y - r * PLUME_UP, r * 0.32, -r * 0.25);
      else {
        plume(ctx, r * 0.25, y - r * 0.8, -r * 0.9, y - r * (PLUME_UP - 0.18), r * 0.3, -r * 0.2);
        plume(ctx, r * 0.65, y - r * 0.75, r * 1.2, y - r * (PLUME_UP - 0.2), r * 0.28, -r * 0.3);
      }
      ctx.fillStyle = k ? GOLD.body : FEATHER.body;
      ctx.fill();
      ink(ctx, w * 0.5, INK);
    }
  } else if (f.mask === "sequin" && f.hat === "none") {
    // A plume curling up and back from the far side (it rises as she leans into a toss, and
    // still clears the eave over the gallery).
    ctx.beginPath();
    plume(ctx, -r * 0.55, y - r * 0.6, -r * 1.5, y - r * 2.2, r * 0.32, -r * 0.1);
    ctx.fillStyle = FEATHER.body;
    ctx.fill();
    ink(ctx, w * 0.5, INK);
  } else if (f.mask === "cat") {
    // A cat's two pointed ears, pink inside, up over the head.
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, y - r * 0.65);
    ctx.lineTo(-r * 0.62, y - r * 1.75);
    ctx.lineTo(-r * 0.05, y - r * 1.0);
    ctx.closePath();
    ctx.moveTo(r * 0.3, y - r * 1.0);
    ctx.lineTo(r * 0.8, y - r * 1.72);
    ctx.lineTo(r * 0.95, y - r * 0.55);
    ctx.closePath();
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, y - r * 0.9);
    ctx.lineTo(-r * 0.56, y - r * 1.45);
    ctx.lineTo(-r * 0.25, y - r * 1.05);
    ctx.closePath();
    ctx.moveTo(r * 0.45, y - r * 1.05);
    ctx.lineTo(r * 0.76, y - r * 1.45);
    ctx.lineTo(r * 0.82, y - r * 0.8);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
  }
  // The mask itself.
  ctx.beginPath();
  maskPath(ctx, mx, my, mw);
  ctx.fillStyle = f.mask === "sun" ? GOLD.body : f.mask === "moon" ? SILVER.body : c.body;
  ctx.fill();
  if (f.mask === "harlequin") {
    // A jester's harlequin: split down the middle, the far half in a second color (bells on its tips below).
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c === GOLD ? GREEN.body : GOLD.body;
    ctx.fillRect(mx - mw, my - mw, mw, mw * 2);
    ctx.restore();
    ctx.beginPath();
    maskPath(ctx, mx, my, mw);
  }
  ink(ctx, w * 0.7, INK);
  if (f.mask === "sun" || f.mask === "moon" || f.mask === "sequin") {
    // A lit rim along the top edge.
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.36, my - mw * 0.12);
    ctx.quadraticCurveTo(mx - mw * 0.15, my - mw * 0.03, mx, my + mw * 0.02);
    ctx.quadraticCurveTo(mx + mw * 0.15, my - mw * 0.03, mx + mw * 0.36, my - mw * 0.12);
    ctx.strokeStyle = f.mask === "sun" ? GOLD.light : f.mask === "moon" ? SILVER.light : c.light;
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
  }
  ctx.beginPath();
  maskEyes(ctx, mx, my, mw);
  ctx.fillStyle = INK;
  ctx.fill();
  if (f.mask === "sequin") {
    // Sequins glinting across it, and a jewel on the bridge.
    ctx.beginPath();
    sparkle(ctx, mx - mw * 0.38, my - mw * 0.1, r * 0.32);
    sparkle(ctx, mx + mw * 0.4, my - mw * 0.12, r * 0.28);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    circle(ctx, mx, my + mw * 0.05, r * 0.17);
    ctx.fillStyle = c === GREEN ? PURPLE.body : GREEN.body;
    ctx.fill();
    ink(ctx, w * 0.4, INK);
  } else if (f.mask === "harlequin") {
    // Little gold bells on the upswept tips.
    ctx.beginPath();
    circle(ctx, mx - mw * 0.5, my - mw * 0.24, r * 0.2);
    circle(ctx, mx + mw * 0.5, my - mw * 0.24, r * 0.2);
    ctx.fillStyle = GOLD.light;
    ctx.fill();
    ink(ctx, w * 0.5, INK);
  } else if (f.mask === "moon") {
    // A little gold star at its outer tip.
    ctx.beginPath();
    sparkle(ctx, mx + mw * 0.52, my - mw * 0.3, r * 0.42);
    ctx.fillStyle = GOLD.body;
    ctx.fill();
    ink(ctx, w * 0.4, INK);
  } else if (f.mask === "cat") {
    // A pink nose under the mask and whiskers out across the cheek.
    ctx.beginPath();
    ctx.moveTo(r * 0.78, y + r * 0.22);
    ctx.lineTo(r * 1.0, y + r * 0.22);
    ctx.lineTo(r * 0.89, y + r * 0.38);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
    ink(ctx, w * 0.4, INK);
    ctx.beginPath();
    ctx.moveTo(r * 0.7, y + r * 0.42);
    ctx.lineTo(r * 1.45, y + r * 0.3);
    ctx.moveTo(r * 0.7, y + r * 0.5);
    ctx.lineTo(r * 1.45, y + r * 0.6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.45;
    ctx.stroke();
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
  const bones = f.suit === "bones";
  leg(ctx, w, -0.01, f.footL, f.raiseL, trouser, bones);
  leg(ctx, w, 0.01, f.footR, f.raiseR, trouser, bones);
  ctx.save();
  ctx.translate(0, HIP);
  ctx.rotate(f.lean);
  ctx.translate(0, -HIP);
  arm(ctx, w, f, -0.018, f.handLx, f.handLy, f.top.shade);
  body(ctx, f, w);
  head(ctx, f, w);
  arm(ctx, w, f, 0.018, f.handRx, f.handRy, f.top.body);
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

import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  APRON,
  APRON_BLUE,
  BRASS,
  CHEEK,
  DIRNDL,
  DIRNDL_BLUE,
  FEATHER,
  HAIR,
  HAIR_FAIR,
  HAT,
  INK,
  LEATHER,
  SHIRT_CHECK,
  SHIRT_CHECK_BLUE,
  SHIRT_WHITE,
  SHOE,
  SKIN,
  STOCKING,
  type Shades,
} from "./colors";
import { block, pill } from "./shapes";
import { centerX, inkW } from "./ground";

// The festival folk, in lederhosen and dirndls: our own little figures, drawn in their own
// frame (u units, feet at the origin, facing right, mirrored to face left), with flat two-tone
// fills and one ink weight. The men wear leather shorts on braces over a checked or white
// shirt, cream stockings and black shoes, and a green alpine hat with a feather; the women a
// dirndl (a dark bodice over a white blouse with puffed sleeves, a wide skirt and an apron),
// their fair hair in braids. Arms and legs are strokes from the shoulders and hips to wherever
// a pose puts the hands and feet, so one figure serves the band, the dancers, the pretzel seller
// and the wagon's driver.
//
// Beside the tent on the left, in front of the bandstand's end, the oompah band strikes up in
// the first second: a tuba player (his cheeks puffing on the beat), an accordion player (the
// bellows going in and out), a trumpeter (the horn swinging up on the beat) and a clarinettist
// (bobbing, the clarinet swinging). After each set they wind down and rest a moment, trumpet and
// clarinet lowered, the bellows closed, then strike up again (every BAND_SET seconds). On the
// right a dancing pair: he does a schuhplattler, the traditional slap dance (slapping his
// thighs, clapping, slapping a raised knee, the sole of his shoe behind him, a stamp and a
// leap), while she twirls, her skirt flaring; then the two of them bow, by the ninth second.
// Then they rest a while, swaying, and go again (every DANCE_ROUND seconds). And the pretzel
// girl crosses in front with her basket (parade.ts times her).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** A figure's pose this frame, in its own frame (feet at 0, 0; y up is negative; facing right). */
export interface Figure {
  woman: boolean;
  /** Facing: +1 right, -1 left. */
  m: number;
  /** Leaning forward about the hips (radians), and a hop off the ground (u). */
  lean: number;
  lift: number;
  /** Legs: the feet's x offsets from under the hips, and how high each is raised (u). */
  footL: number;
  footR: number;
  raiseL: number;
  raiseR: number;
  /** Hands, relative to the figure's origin (u): where each is. */
  handLx: number;
  handLy: number;
  handRx: number;
  handRy: number;
  /** The mouth: 0 a smile, 1 open wide (singing, puffing). */
  mouth: number;
  /** A woman's skirt flares this much wider as she twirls (0..1). */
  flare: number;
  /** The shirt or dirndl colors. */
  cloth: Shades;
  /** The shirt's check color (men), or the apron (women). */
  trim: string;
  /** Hair color. */
  hair: Shades;
  /** Whether a man wears his hat. */
  hat: boolean;
  /** Drawn this much of full size (the band's players are a little smaller than the dancers). */
  size: number;
}

/** A fresh pose standing easy, hands at the sides. */
export function standing(woman: boolean, cloth: Shades, trim: string, hair: Shades): Figure {
  return {
    woman,
    m: 1,
    lean: 0,
    lift: 0,
    footL: -0.009,
    footR: 0.009,
    raiseL: 0,
    raiseR: 0,
    handLx: -0.028,
    handLy: -0.07,
    handRx: 0.028,
    handRy: -0.07,
    mouth: 0,
    flare: 0,
    cloth,
    trim,
    hair,
    hat: true,
    size: 1,
  };
}

/** The figure's proportions (u): hips, shoulders, head center and radius. */
const HIP = -0.075;
const SHOULDER = -0.115;
const HEAD_Y = -0.137;
const HEAD_R = 0.02;
/** How tall a man stands at full size, hat and feather included (u above its feet); a woman is a little shorter. */
export const FIGURE_H = 0.195;
export const WOMAN_H = 0.168;

/** A leg from the hip to a foot: a stroke of stocking over ink, then the shoe. */
function leg(ctx: Ctx, w: number, hipX: number, footX: number, raise: number): void {
  const kneeX = (hipX + footX) / 2 + 0.004 * raise * 4;
  const kneeY = HIP * 0.55 - raise * 0.5;
  ctx.beginPath();
  ctx.moveTo(hipX, HIP + 0.004);
  if (raise > 0.002) ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, -0.006 - raise);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.011 + w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = STOCKING;
  ctx.lineWidth = 0.011;
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, footX + 0.004, -0.004 - raise, 0.011, 0.0045);
  ctx.fillStyle = SHOE;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
}

/** An arm from a shoulder to a hand: a sleeve stroke over ink, then the hand. */
function arm(ctx: Ctx, w: number, x0: number, y0: number, x1: number, y1: number, sleeve: string, puff: boolean): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + 0.004;
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0105 + w;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 0.0105;
  ctx.stroke();
  if (puff) {
    ctx.beginPath();
    circle(ctx, x0 + (x1 - x0) * 0.12, y0 + (y1 - y0) * 0.12, 0.0105);
    ctx.fillStyle = sleeve;
    ctx.fill();
    ink(ctx, w * 0.8, INK);
  }
  ctx.beginPath();
  circle(ctx, x1, y1, 0.0062);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
}

/** The head: face, cheeks, eyes, a smile or an open mouth; hair; a hat with a feather, or braids. */
function head(ctx: Ctx, w: number, p: Figure): void {
  const y = HEAD_Y;
  const r = HEAD_R;
  if (p.woman) {
    // Braids hang either side of the face, from a parting at the crown.
    ctx.beginPath();
    pill(ctx, -r * 1.25, y - r * 0.3, r * 0.55, r * 1.8);
    pill(ctx, r * 0.7, y - r * 0.3, r * 0.55, r * 1.8);
    ctx.fillStyle = p.hair.body;
    ctx.fill();
    ink(ctx, w * 0.7, INK);
  }
  ctx.beginPath();
  circle(ctx, 0, y, r);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.fillStyle = SKIN.light;
  ctx.beginPath();
  oval(ctx, -r * 0.3, y - r * 0.45, r * 0.35, r * 0.25, -0.4);
  ctx.fill();
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, -r * 0.45, y + r * 0.25, r * 0.26, r * 0.18);
  oval(ctx, r * 0.72, y + r * 0.25, r * 0.2, r * 0.16);
  ctx.fill();
  // Eyes, looking ahead; a round nose.
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, r * 0.05, y - r * 0.15, r * 0.13);
  circle(ctx, r * 0.6, y - r * 0.15, r * 0.13);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, r * 0.38, y + r * 0.1, r * 0.17);
  ctx.fillStyle = "#ffae96";
  ctx.fill();
  ink(ctx, w * 0.5, INK);
  // The mouth: a smile, opening wide as it sings or puffs.
  if (p.mouth > 0.2) {
    ctx.beginPath();
    oval(ctx, r * 0.34, y + r * 0.5, r * 0.2, r * (0.1 + 0.22 * p.mouth));
    ctx.fillStyle = INK;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(r * 0.1, y + r * 0.45);
    ctx.quadraticCurveTo(r * 0.38, y + r * 0.72, r * 0.65, y + r * 0.42);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
  }
  // Hair over the crown.
  ctx.beginPath();
  ctx.moveTo(-r * 1.02, y - r * 0.1);
  ctx.quadraticCurveTo(-r * 0.9, y - r * 1.25, r * 0.2, y - r * 1.05);
  ctx.quadraticCurveTo(r * 0.9, y - r * 1.0, r * 1.0, y - r * 0.4);
  ctx.quadraticCurveTo(r * 0.7, y - r * 0.75, r * 0.3, y - r * 0.72);
  ctx.quadraticCurveTo(-r * 0.3, y - r * 0.7, -r * 1.02, y - r * 0.1);
  ctx.closePath();
  ctx.fillStyle = p.hair.body;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
  if (p.woman) {
    // A little flower at the parting.
    ctx.beginPath();
    circle(ctx, -r * 0.5, y - r * 0.95, r * 0.14);
    ctx.fillStyle = "#ff8fc8";
    ctx.fill();
  } else if (p.hat) hat(ctx, w, y - r * 0.78);
}

/** The alpine hat: a brim, a crown with a dent, a cord band and a feather up the right. */
function hat(ctx: Ctx, w: number, brim: number): void {
  const r = HEAD_R;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, brim + 0.003);
  ctx.lineTo(-r * 0.85, brim - 0.02);
  ctx.quadraticCurveTo(-r * 0.3, brim - 0.03, r * 0.1, brim - 0.024);
  ctx.quadraticCurveTo(r * 0.6, brim - 0.03, r * 0.85, brim - 0.02);
  ctx.lineTo(r * 1.05, brim + 0.003);
  ctx.closePath();
  ctx.fillStyle = HAT.body;
  ctx.fill();
  ctx.fillStyle = HAT.light;
  ctx.fillRect(-r * 0.65, brim - 0.017, r * 0.3, 0.013);
  ink(ctx, w * 0.8, INK);
  // The feather, swept up from the band on the right.
  ctx.beginPath();
  ctx.moveTo(r * 0.5, brim - 0.006);
  ctx.quadraticCurveTo(r * 1.0, brim - 0.02, r * 1.2, brim - 0.034);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.006 + w;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = FEATHER;
  ctx.lineWidth = 0.006;
  ctx.stroke();
  ctx.beginPath();
  block(ctx, -r * 1.3, brim - 0.004, r * 2.6, 0.007, 0.003);
  ctx.fillStyle = HAT.shade;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.beginPath();
  ctx.rect(-r * 0.9, brim - 0.012, r * 1.8, 0.005);
  ctx.fillStyle = BRASS.body;
  ctx.fill();
}

/** A man's body: shirt, leather shorts on braces. */
function manBody(ctx: Ctx, w: number, p: Figure): void {
  // The shirt: a torso from the shoulders to the hips, with a check.
  ctx.beginPath();
  ctx.moveTo(-0.021, SHOULDER + 0.004);
  ctx.quadraticCurveTo(-0.024, HIP - 0.012, -0.02, HIP + 0.006);
  ctx.lineTo(0.02, HIP + 0.006);
  ctx.quadraticCurveTo(0.024, HIP - 0.012, 0.021, SHOULDER + 0.004);
  ctx.quadraticCurveTo(0, SHOULDER - 0.004, -0.021, SHOULDER + 0.004);
  ctx.closePath();
  ctx.fillStyle = p.cloth.body;
  ctx.fill();
  ctx.strokeStyle = p.trim;
  ctx.lineWidth = 0.0025;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * 0.0075, SHOULDER + 0.006);
    ctx.lineTo(i * 0.0075, HIP + 0.003);
    ctx.moveTo(-0.018, SHOULDER + 0.008 + (i + 2) * 0.0085);
    ctx.lineTo(0.018, SHOULDER + 0.008 + (i + 2) * 0.0085);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ink(ctx, w, INK);
  // The lederhosen: short leather trousers with a flap, on braces with a crossbar.
  ctx.beginPath();
  ctx.moveTo(-0.021, HIP - 0.008);
  ctx.lineTo(0.021, HIP - 0.008);
  ctx.lineTo(0.023, HIP + 0.03);
  ctx.lineTo(0.003, HIP + 0.03);
  ctx.lineTo(0, HIP + 0.02);
  ctx.lineTo(-0.003, HIP + 0.03);
  ctx.lineTo(-0.023, HIP + 0.03);
  ctx.closePath();
  ctx.fillStyle = LEATHER.body;
  ctx.fill();
  ctx.fillStyle = LEATHER.light;
  ctx.fillRect(-0.016, HIP - 0.004, 0.006, 0.028);
  ink(ctx, w, INK);
  ctx.beginPath();
  ctx.rect(-0.014, SHOULDER + 0.002, 0.006, HIP - SHOULDER - 0.008);
  ctx.rect(0.008, SHOULDER + 0.002, 0.006, HIP - SHOULDER - 0.008);
  ctx.rect(-0.014, SHOULDER + 0.016, 0.028, 0.006);
  ctx.fillStyle = LEATHER.shade;
  ctx.fill();
  ink(ctx, w * 0.6, INK);
  // A brass button on each brace, and the flap's two.
  ctx.fillStyle = BRASS.body;
  ctx.beginPath();
  circle(ctx, -0.011, HIP - 0.002, 0.0022);
  circle(ctx, 0.011, HIP - 0.002, 0.0022);
  circle(ctx, -0.007, HIP + 0.012, 0.0018);
  circle(ctx, 0.007, HIP + 0.012, 0.0018);
  ctx.fill();
}

/** A woman's body: the dirndl's skirt (flaring as she twirls), the apron, the bodice, the blouse. */
function womanBody(ctx: Ctx, w: number, p: Figure): void {
  const hem = -0.016;
  const hw = 0.04 + 0.022 * p.flare;
  // The skirt.
  ctx.beginPath();
  ctx.moveTo(-0.018, HIP - 0.002);
  ctx.lineTo(0.018, HIP - 0.002);
  ctx.quadraticCurveTo(0.028, HIP + 0.02, hw, hem);
  ctx.quadraticCurveTo(0, hem + 0.008 + 0.004 * p.flare, -hw, hem);
  ctx.quadraticCurveTo(-0.028, HIP + 0.02, -0.018, HIP - 0.002);
  ctx.closePath();
  ctx.fillStyle = p.cloth.body;
  ctx.fill();
  ctx.fillStyle = p.cloth.shade;
  ctx.beginPath();
  ctx.moveTo(-hw, hem);
  ctx.quadraticCurveTo(0, hem + 0.008 + 0.004 * p.flare, hw, hem);
  ctx.quadraticCurveTo(0, hem - 0.004, -hw, hem);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.018, HIP - 0.002);
  ctx.lineTo(0.018, HIP - 0.002);
  ctx.quadraticCurveTo(0.028, HIP + 0.02, hw, hem);
  ctx.quadraticCurveTo(0, hem + 0.008 + 0.004 * p.flare, -hw, hem);
  ctx.quadraticCurveTo(-0.028, HIP + 0.02, -0.018, HIP - 0.002);
  ctx.closePath();
  ink(ctx, w, INK);
  // The apron over the front of the skirt.
  const aw = hw * 0.62;
  ctx.beginPath();
  ctx.moveTo(-0.012, HIP + 0.002);
  ctx.lineTo(0.012, HIP + 0.002);
  ctx.quadraticCurveTo(0.018, HIP + 0.02, aw, hem - 0.004);
  ctx.quadraticCurveTo(0, hem + 0.002, -aw, hem - 0.004);
  ctx.quadraticCurveTo(-0.018, HIP + 0.02, -0.012, HIP + 0.002);
  ctx.closePath();
  ctx.fillStyle = p.trim;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  // The bodice, dark, laced, over the white blouse; the blouse's neckline.
  ctx.beginPath();
  ctx.moveTo(-0.019, SHOULDER + 0.006);
  ctx.lineTo(0.019, SHOULDER + 0.006);
  ctx.lineTo(0.019, HIP + 0.002);
  ctx.lineTo(-0.019, HIP + 0.002);
  ctx.closePath();
  ctx.fillStyle = SHIRT_WHITE.body;
  ctx.fill();
  ink(ctx, w, INK);
  ctx.beginPath();
  ctx.moveTo(-0.017, SHOULDER + 0.016);
  ctx.lineTo(0.017, SHOULDER + 0.016);
  ctx.lineTo(0.019, HIP + 0.002);
  ctx.lineTo(-0.019, HIP + 0.002);
  ctx.closePath();
  ctx.fillStyle = p.cloth.shade;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.strokeStyle = BRASS.light;
  ctx.lineWidth = 0.002;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = SHOULDER + 0.02 + i * 0.008;
    ctx.moveTo(-0.006, y);
    ctx.lineTo(0.006, y + 0.005);
    ctx.moveTo(0.006, y);
    ctx.lineTo(-0.006, y + 0.005);
  }
  ctx.stroke();
}

/**
 * A figure at (x, foot) on screen, facing p.m: legs and shoes, the body, the arms to the
 * hands, then the head. Everything from the hips up leans about the hips.
 */
export function figure(ctx: Ctx, u: number, lw: number, x: number, foot: number, p: Figure): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot - p.lift * u);
  ctx.scale(p.m * u * p.size, u * p.size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  leg(ctx, w, -0.008, p.footL, p.raiseL);
  leg(ctx, w, 0.008, p.footR, p.raiseR);
  ctx.translate(0, HIP);
  ctx.rotate(p.lean);
  ctx.translate(0, -HIP);
  if (p.woman) womanBody(ctx, w, p);
  else manBody(ctx, w, p);
  const sleeve = p.woman ? SHIRT_WHITE.body : p.cloth.body;
  arm(ctx, w, -0.018, SHOULDER + 0.008, p.handLx, p.handLy, sleeve, p.woman);
  arm(ctx, w, 0.018, SHOULDER + 0.008, p.handRx, p.handRy, sleeve, p.woman);
  head(ctx, w, p);
  ctx.restore();
}

// ---------------------------------------------------------------- the band

/** The band's line: how far below the floor line the musicians stand (u), and where each stands (u from the tower's center). */
export const FOLK_LINE = 0.148;
export const BAND_X = [-0.463, -0.406, -0.351, -0.297] as const;
/** The band's players are drawn this much of full size, so four fit beside the tent. */
export const BAND_SIZE = 0.86;
/** The oompah beat (per second). */
const BEAT = 2;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** One set of the band (s): it strikes up BAND_STARTS into the set (fading the motion in), winds down at BAND_STOPS and rests until the next set. */
export const BAND_SET = 24;
export const BAND_STARTS = 0.3;
export const BAND_STOPS = 20.5;

/** How hard the band is playing at scene time t (0 at rest between sets, 1 in full swing). */
export function playing(t: number): number {
  const k = ((t % BAND_SET) + BAND_SET) % BAND_SET;
  return ease((k - BAND_STARTS) / 0.8) * (1 - ease((k - BAND_STOPS) / 0.7));
}

const TUBA = standing(false, SHIRT_WHITE, SHIRT_CHECK, HAIR);
const SQUEEZE = standing(false, SHIRT_WHITE, SHIRT_CHECK_BLUE, HAIR_FAIR);
const TRUMPET = standing(false, SHIRT_WHITE, SHIRT_CHECK, HAIR);
const CLARINET = standing(false, SHIRT_WHITE, SHIRT_CHECK_BLUE, HAIR_FAIR);
for (const p of [TUBA, SQUEEZE, TRUMPET, CLARINET]) p.size = BAND_SIZE;

/** The tuba: a big brass body in front of him and the bell curling up over his shoulder. */
function tuba(ctx: Ctx, u: number, lw: number, x: number, foot: number, m: number, beat: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(m * u, u);
  ctx.lineCap = "round";
  // The tubing: a loop from the bell down round the body.
  ctx.beginPath();
  ctx.moveTo(0.012, -0.1);
  ctx.bezierCurveTo(0.05, -0.1, 0.05, -0.05, 0.018, -0.052);
  ctx.bezierCurveTo(-0.01, -0.05, -0.012, -0.08, 0.005, -0.09);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.012 + w;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = 0.012;
  ctx.stroke();
  ctx.strokeStyle = BRASS.light;
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.moveTo(0.014, -0.102);
  ctx.bezierCurveTo(0.046, -0.102, 0.046, -0.06, 0.02, -0.058);
  ctx.stroke();
  // The bell: a flared cone up and back over his shoulder.
  ctx.beginPath();
  ctx.moveTo(0.012, -0.1);
  ctx.quadraticCurveTo(0.0, -0.13, -0.012, -0.142);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.012 + w;
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = 0.012;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.004, -0.136);
  ctx.quadraticCurveTo(-0.018, -0.15, -0.029, -0.172);
  ctx.lineTo(-0.008, -0.174);
  ctx.quadraticCurveTo(-0.007, -0.15, -0.004, -0.136);
  ctx.closePath();
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.beginPath();
  ctx.moveTo(-0.01, -0.152);
  ctx.lineTo(-0.024, -0.17);
  ctx.lineTo(-0.012, -0.172);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.004, -0.136);
  ctx.quadraticCurveTo(-0.018, -0.15, -0.029, -0.172);
  ctx.lineTo(-0.008, -0.174);
  ctx.quadraticCurveTo(-0.007, -0.15, -0.004, -0.136);
  ctx.closePath();
  ink(ctx, w, INK);
  // Three valves on the top, pressed by turns.
  ctx.fillStyle = BRASS.shade;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(0.026 + i * 0.007, -0.112 + (i === Math.floor(beat) % 3 ? 0.003 : 0), 0.004, 0.009);
  ctx.fill();
  ctx.restore();
}

/** The accordion between the hands: two end boxes and the pleated bellows, `open` wide. */
function accordion(ctx: Ctx, u: number, lw: number, x: number, foot: number, m: number, open: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(m * u, u);
  const y = -0.1;
  const half = 0.012 + open * 0.012;
  // The bellows: pleats as alternating stripes.
  ctx.beginPath();
  ctx.rect(-half, y - 0.02, half * 2, 0.04);
  ctx.fillStyle = SHIRT_WHITE.body;
  ctx.fill();
  ctx.fillStyle = DIRNDL.body;
  ctx.beginPath();
  const n = 6;
  for (let i = 0; i < n; i += 2) ctx.rect(-half + ((half * 2) * i) / n, y - 0.02, (half * 2) / n, 0.04);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-half, y - 0.02, half * 2, 0.04);
  ink(ctx, w * 0.8, INK);
  // The end boxes: black, one with a row of buttons, the other with keys.
  ctx.beginPath();
  block(ctx, -half - 0.012, y - 0.024, 0.012, 0.048, 0.002);
  block(ctx, half, y - 0.024, 0.012, 0.048, 0.002);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = SHIRT_WHITE.body;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.rect(half + 0.003, y - 0.02 + i * 0.008, 0.006, 0.005);
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, -half - 0.006, y - 0.015 + i * 0.009, 0.0018);
  ctx.fill();
  ctx.restore();
}

/** The trumpet from the mouth out to the bell, raised by `up`, or lowered to the chest at rest by `low`. */
function trumpet(ctx: Ctx, u: number, lw: number, x: number, foot: number, m: number, up: number, low: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(m * u, u);
  const y = HEAD_Y + 0.007;
  if (low > 0) {
    // Down from the lips and tipped bell-down, about the mouthpiece.
    ctx.translate(0.02, y + low * 0.042);
    ctx.rotate(low * 1.0);
    ctx.translate(-0.02, -y);
  }
  ctx.rotate(-0.1 - up * 0.35);
  ctx.beginPath();
  ctx.moveTo(0.018, y);
  ctx.lineTo(0.05, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.008 + w;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = BRASS.body;
  ctx.lineWidth = 0.008;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.046, y - 0.004);
  ctx.quadraticCurveTo(0.058, y - 0.012, 0.066, y - 0.016);
  ctx.lineTo(0.066, y + 0.016);
  ctx.quadraticCurveTo(0.058, y + 0.012, 0.046, y + 0.004);
  ctx.closePath();
  ctx.fillStyle = BRASS.body;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.fillRect(0.05, y - 0.007, 0.012, 0.004);
  ink(ctx, w, INK);
  ctx.fillStyle = BRASS.shade;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.rect(0.026 + i * 0.006, y - 0.011, 0.003, 0.007);
  ctx.fill();
  ctx.restore();
}

/** The clarinet from the mouth down and forward, swinging by `swing`, or lowered from the lips at rest by `low`. */
function clarinet(ctx: Ctx, u: number, lw: number, x: number, foot: number, m: number, swing: number, low: number): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(m * u, u);
  ctx.translate(0.012, HEAD_Y + 0.012 + low * 0.034);
  ctx.rotate(0.9 + swing * 0.25 + low * 0.45);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0.044, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.007 + w;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.042, -0.004);
  ctx.lineTo(0.05, -0.007);
  ctx.lineTo(0.05, 0.007);
  ctx.lineTo(0.042, 0.004);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = BRASS.light;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, 0.014 + i * 0.009, -0.001, 0.0018);
  ctx.fill();
  ctx.restore();
}

/** The oompah band beside the tent, striking up in the first second and after every rest: each musician's pose for the beat, and his instrument. */
export function band(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  const foot = g + FOLK_LINE * u;
  if (foot - FIGURE_H * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const play = playing(s.t);
  // Lowered between sets, and raised again as they strike up (but held ready for the very first).
  const low = s.t < BAND_STARTS + 0.8 ? 0 : 1 - play;
  const beat = s.t * BEAT;
  const pulse = 0.5 + 0.5 * Math.sin(beat * Math.PI * 2);
  const bob = play * 0.004 * pulse;
  // The tuba player: both hands on the valves, cheeks puffing on the beat.
  const t = TUBA;
  t.lift = bob;
  t.handLx = 0.026;
  t.handLy = -0.108;
  t.handRx = 0.034;
  t.handRy = -0.104;
  t.mouth = play * (0.4 + 0.6 * pulse);
  t.lean = 0.04 * play * pulse;
  const k = u * BAND_SIZE;
  figure(ctx, u, lw, cx + BAND_X[0] * u, foot, t);
  tuba(ctx, k, lw, cx + BAND_X[0] * u, foot - bob * u, 1, beat);
  // The accordion player: hands on the boxes, the bellows going in and out.
  const open = play * (0.5 + 0.5 * Math.sin(beat * Math.PI));
  const a = SQUEEZE;
  a.lift = bob * 0.6;
  const half = 0.012 + open * 0.012;
  a.handLx = -half - 0.006;
  a.handLy = -0.1;
  a.handRx = half + 0.006;
  a.handRy = -0.1;
  a.mouth = 0;
  a.lean = 0.02 * play * Math.sin(beat * Math.PI);
  figure(ctx, u, lw, cx + BAND_X[1] * u, foot, a);
  accordion(ctx, k, lw, cx + BAND_X[1] * u, foot - a.lift * u, 1, open);
  // The trumpeter: the horn swings up on the beat.
  const up = play * ease(1 - ((beat + 0.5) % 2));
  const tr = TRUMPET;
  tr.lift = bob * 0.8;
  tr.handLx = 0.026 - up * 0.006 - low * 0.004;
  tr.handLy = HEAD_Y + 0.012 - up * 0.012 + low * 0.05;
  tr.handRx = 0.04 - up * 0.01 - low * 0.014;
  tr.handRy = HEAD_Y + 0.012 - up * 0.018 + low * 0.062;
  tr.mouth = play * 0.6;
  tr.lean = -0.06 * up;
  figure(ctx, u, lw, cx + BAND_X[2] * u, foot, tr);
  trumpet(ctx, k, lw, cx + BAND_X[2] * u, foot - tr.lift * u, 1, up, low);
  // The clarinettist: bobbing, the clarinet swinging with the tune.
  const swing = play * Math.sin(beat * Math.PI * 0.5);
  const c = CLARINET;
  c.lift = bob * 0.7;
  c.handLx = 0.026 + swing * 0.004 - low * 0.002;
  c.handLy = -0.098 - swing * 0.006 + low * 0.03;
  c.handRx = 0.034 + swing * 0.006 - low * 0.004;
  c.handRy = -0.085 - swing * 0.01 + low * 0.03;
  c.mouth = play * 0.5;
  c.lean = 0.05 * swing;
  figure(ctx, u, lw, cx + BAND_X[3] * u, foot, c);
  clarinet(ctx, k, lw, cx + BAND_X[3] * u, foot - c.lift * u, 1, swing, low);
}

// ---------------------------------------------------------------- the dancers

/** Where the dancing pair stand (u from the tower's center): him, her. */
export const DANCER_X = [0.315, 0.4] as const;
/** One round of the dance (s): a schuhplattler, a leap, the bow, then a rest. */
export const DANCE_ROUND = 16;
/** When the plattler starts, the leap, the bow, and the rest (s into the round). */
const PLATTLER_FROM = 0.8;
const LEAP_AT = 7.2;
export const BOW_AT = 8.2;
const BOW_FOR = 1.1;

/** The dance's beat, a brisk 3/4 (steps per second). */
const STEP = 2.4;

/** What he is doing at `k` seconds into a round (0..1 each): plattling, leaping, bowing; and which slap (0..3) of the pattern. */
export interface Dance {
  plattler: number;
  slap: number;
  /** 0..1 through the current slap. */
  phase: number;
  leap: number;
  bow: number;
}

const DANCE: Dance = { plattler: 0, slap: 0, phase: 0, leap: 0, bow: 0 };

export function dance(t: number): Dance {
  const k = ((t % DANCE_ROUND) + DANCE_ROUND) % DANCE_ROUND;
  const d = DANCE;
  d.plattler = ease((k - PLATTLER_FROM) / 0.5) * (1 - ease((k - LEAP_AT + 0.3) / 0.3));
  const steps = (k - PLATTLER_FROM) * STEP;
  d.slap = ((Math.floor(steps) % 4) + 4) % 4;
  d.phase = steps - Math.floor(steps);
  const q = clamp01((k - LEAP_AT) / 0.7);
  d.leap = q <= 0 || q >= 1 ? 0 : Math.sin(Math.PI * q);
  d.bow = ease((k - BOW_AT) / 0.5) * (1 - ease((k - BOW_AT - BOW_FOR) / 0.5));
  return d;
}

const HIM = standing(false, SHIRT_WHITE, SHIRT_CHECK, HAIR);
const HER = standing(true, DIRNDL, APRON, HAIR_FAIR);
/** The dancers are a touch under full size, so his leap keeps his hat under the base block's top (out of the slider's first lane). */
export const DANCER_SIZE = 0.86;
HIM.size = DANCER_SIZE;
HER.size = DANCER_SIZE;
/** How high he leaps (u). */
export const LEAP = 0.025;

/** The dancing pair on the right: his slap dance and leap, her twirls, their bow. */
export function dancers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  const foot = g + FOLK_LINE * u;
  if (foot - FIGURE_H * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const d = dance(s.t);
  const idle = 1 - Math.max(d.plattler, d.leap, d.bow);
  const sway = Math.sin(s.t * 1.3) * idle;
  // Him: facing her. The slap pattern: thighs, clap, the raised knee, the sole behind.
  const h = HIM;
  h.m = 1;
  const hit = Math.sin(Math.PI * d.phase);
  const p = d.plattler;
  h.lift = p * 0.006 * hit * (d.slap === 2 ? 1 : 0.3) + d.leap * LEAP;
  h.lean = 0.03 * sway + d.bow * 0.75 + (d.slap === 3 ? 0.12 * p : 0);
  h.raiseL = 0;
  h.raiseR = d.slap === 2 ? p * 0.05 * hit : d.slap === 3 ? p * 0.04 * hit : d.leap * 0.02;
  h.footL = -0.011 - d.leap * 0.01;
  h.footR = d.slap === 2 ? 0.02 : d.slap === 3 ? -0.018 : 0.011 + d.leap * 0.01;
  if (d.bow > 0.05) {
    // One hand to his hat, the other swept out behind.
    h.handLx = -0.035;
    h.handLy = -0.09 + d.bow * 0.02;
    h.handRx = 0.012;
    h.handRy = -0.15;
  } else if (d.leap > 0.05) {
    h.handLx = -0.032;
    h.handLy = -0.135;
    h.handRx = 0.032;
    h.handRy = -0.135;
  } else if (p > 0.05) {
    if (d.slap === 0) {
      // Slapping both thighs.
      h.handLx = -0.012 - hit * 0.012;
      h.handLy = -0.06 - (1 - hit) * 0.04;
      h.handRx = 0.012 + hit * 0.012;
      h.handRy = -0.06 - (1 - hit) * 0.04;
    } else if (d.slap === 1) {
      // A clap in front of the chest.
      h.handLx = 0.012 - hit * 0.008;
      h.handLy = -0.1;
      h.handRx = 0.03 - hit * 0.012;
      h.handRy = -0.1;
    } else if (d.slap === 2) {
      // The right hand slaps the raised knee, the left swings up.
      h.handLx = -0.03;
      h.handLy = -0.13;
      h.handRx = 0.02;
      h.handRy = -0.04 - hit * 0.03;
    } else {
      // The right hand reaches back to slap the sole behind him.
      h.handLx = 0.03;
      h.handLy = -0.12;
      h.handRx = -0.022;
      h.handRy = -0.02 - hit * 0.02;
    }
  } else {
    h.handLx = -0.028 + sway * 0.004;
    h.handLy = -0.07;
    h.handRx = 0.028 + sway * 0.004;
    h.handRy = -0.07;
  }
  h.mouth = p > 0.5 && d.slap === 1 ? 0.5 : 0;
  figure(ctx, u, lw, cx + DANCER_X[0] * u, foot, h);
  // Her: twirling while he plattles (her skirt flares, she faces about), a curtsey at the bow.
  const w = HER;
  const twirl = p * (0.5 + 0.5 * Math.sin(s.t * 3.1));
  w.m = p > 0.3 ? (Math.sin(s.t * 3.1) > 0 ? -1 : 1) : -1;
  w.flare = twirl;
  w.lift = p * 0.004 * Math.abs(Math.sin(s.t * 6.2)) + d.leap * 0.01;
  w.lean = d.bow * 0.35 + 0.02 * sway;
  w.footL = -0.009 - twirl * 0.008;
  w.footR = 0.009 + twirl * 0.008;
  w.raiseL = 0;
  w.raiseR = 0;
  if (d.bow > 0.05) {
    // Holding her skirt out for the curtsey.
    w.handLx = -0.04;
    w.handLy = -0.045;
    w.handRx = 0.04;
    w.handRy = -0.045;
  } else if (p > 0.05) {
    w.handLx = -0.03 - twirl * 0.014;
    w.handLy = -0.1 - twirl * 0.03;
    w.handRx = 0.03 + twirl * 0.014;
    w.handRy = -0.1 - twirl * 0.03;
  } else {
    w.handLx = -0.03 + sway * 0.004;
    w.handLy = -0.075;
    w.handRx = 0.03 + sway * 0.004;
    w.handRy = -0.075;
  }
  w.mouth = 0;
  figure(ctx, u, lw, cx + DANCER_X[1] * u, foot, w);
}

/** A dirndl in blue for the pretzel seller, and the wagon's driver's colors, for parade.ts. */
export const WAITRESS = standing(true, DIRNDL_BLUE, APRON_BLUE, HAIR);
WAITRESS.size = 0.92;
export const DRIVER = standing(false, SHIRT_WHITE, SHIRT_CHECK, HAIR);
DRIVER.size = 0.86;
export { HEAD_Y, SHOULDER };

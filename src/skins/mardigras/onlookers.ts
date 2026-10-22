import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, HAIRS, INK, IRON, LIDS, PLUM_SHOES, PURPLE, SHIRTS, SILVER, SKINS, STRAW, THREE, VIOLET, WHITE } from "./colors";
import { draw, folk, toScreen, type Folk } from "./folk";
import { FLOAT_AT, headX, nearestUnit } from "./parade";
import { inFrame, hanky } from "./props";
import { blinkAt, build, dance, glance, now, pick, shoulderY, sit, smooth } from "./rig";

// The onlookers: the street's other folk, papier-mâché figures on their rigs (folk.ts), each
// with its own make, its own costume and its own business, all of it a function of the scene's
// clock. At the near curb, a lady in a feathered mask dances in place, watching the
// parade come and go, waving her handkerchief at it and throwing her arms up as the floats roll
// by; across the clear middle a bead seller in a straw boater offers a string from his pole hung
// with beads, calls out, lifts the pole high now and then and tips his hat. Across the street, at
// the café's sidewalk table, a regular in a moon mask sips his café au lait, turns to watch the
// floats and applauds them. Every act comes first within ten seconds of a tower and comes round again on
// its own rhythm. Positions are in u from the screen's center.

/** The curb's folk: the lady (left of the clear middle, facing the parade coming in) and the bead seller (right of it). */
export const LADY = { x: -0.277, size: 0.72 } as const;
/**
 * The bead seller stands between the reviewing stand's corner (0.235 u, its drape's foot a little
 * above his hat) and the parade ladder (front.ts: its left leg at 0.315 u at the curb), facing the
 * clear middle, the way the parade comes from, his pole planted on the curb just before him: he
 * and his pole, lifted or not, keep clear of both.
 */
export const SELLER = { x: 0.279, size: 0.72, pole: 0.271 } as const;

const LADY_F = folk(
  { b: build({ waistW: 0.016, hipW: 0.021, chestW: 0.024 }), skin: SKINS[2]!, hair: HAIRS[3]!, hairDo: "long", top: PURPLE, bottom: PURPLE, shoes: PLUM_SHOES, skirt: GREEN, frill: GOLD, skirtLen: 0.072, hat: "none", hatColor: VIOLET, mask: "feather", maskColor: VIOLET, lids: LIDS.violet, beads: [GOLD, PURPLE] },
  LADY.size,
  401,
  -1,
);
const SELLER_F = folk(
  { b: build({ belly: 0.006, chestW: 0.026 }), skin: SKINS[1]!, hair: HAIRS[0]!, hairDo: "short", top: SHIRTS[3]!, bottom: GREEN, vest: GOLD, hat: "boater", hatColor: STRAW, hatTrim: PURPLE, mask: "none", maskColor: GOLD, lids: LIDS.green, beads: [PURPLE, GREEN], collar: "bow", collarColor: PURPLE },
  SELLER.size,
  402,
  -1,
);
const REGULAR = folk(
  { b: build({ belly: 0.004 }), skin: SKINS[3]!, hair: HAIRS[4]!, hairDo: "short", top: SHIRTS[0]!, bottom: PURPLE, pattern: "stripes", patternColor: GOLD, hat: "beret", hatColor: PURPLE, mask: "moon", maskColor: SILVER, lids: LIDS.blue },
  0.38,
  404,
  -1,
);

/** Scratch. */
const P = { x: 0, y: 0 };

/** How a watcher turns to follow the parade (its turn, -1 looking back to 1 ahead): toward whichever of it is nearest, else its own glances. */
function watch(f: Folk, t: number, x: number, bias: number): number {
  const near = nearestUnit(t, x, 0.8);
  const lk = glance(t, f.id, bias, 0.6);
  if (Number.isNaN(near)) return lk.turn;
  const toward = Math.sign((near - x) * f.m) * Math.min(1, Math.abs(near - x) * 6);
  return toward * 0.85 + lk.turn * 0.15;
}

/** How close a float is to x at time t (0 far, 1 abreast of it): the crowd cheers the floats. */
export function floatNear(t: number, x: number): number {
  let k = 0;
  for (const at of FLOAT_AT) k = Math.max(k, 1 - smooth(Math.abs(headX(t) - at - x) / 0.3));
  return k;
}

// ---------------------------------------------------------------- at the curb

/**
 * The masked lady at the curb, left of the clear middle (`top` the curb's top): dancing in place
 * to the band, her handkerchief waving overhead, watching the parade; as a float rolls by she
 * throws both arms up and cheers. She faces the way the parade comes from and turns her head after it.
 */
export function curbLady(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const f = LADY_F;
  const p = f.pose;
  const b = f.look.b;
  const x = s.cssW / 2 + LADY.x * u;
  p.t = s.t;
  const cheer = floatNear(s.t, LADY.x);
  dance(p, b, s.t * 1.08 + pick(f.id, 0, 1), 0.7 + cheer * 0.3);
  p.turn = watch(f, s.t, LADY.x, 0.5);
  p.tilt = -0.15 * cheer;
  p.blink = blinkAt(s.t, f.id);
  const sh = shoulderY(p, b);
  const q = s.t * 5.2;
  // The handkerchief up in the near hand, waving; the far hand on her hip, or both up to cheer.
  p.handNX = 0.048 + 0.008 * Math.sin(q) + cheer * 0.004;
  p.handNY = sh - 0.03 - 0.006 * Math.cos(q) - cheer * 0.012;
  p.elbowN = 1;
  p.handFX = -0.02 + cheer * 0.03;
  p.handFY = sh + 0.04 - cheer * 0.085;
  p.elbowF = 1;
  p.mouth = 0.35 + cheer * 0.55;
  p.swing = Math.sin(s.t * 2.16 * Math.PI - 1.2);
  const y = top + u * 0.004;
  draw(ctx, f, x, y, u, lw);
  inFrame(ctx, f, x, y, u, (c) => hanky(c, f.rig.wrN.x, f.rig.wrN.y - 0.004, 0.016, s.t, 1.7, (lw * 0.6) / (u * f.size)));
}

/** When the bead seller lifts his pole high (s), how long it stays up, and how often he does it; when he tips his hat. */
export const LIFT_AT = 3.2;
export const LIFT_EVERY = 9;
const LIFT_LEN = 1.6;
export const TIP_AT = 6.8;
export const TIP_EVERY = 11;

/** How high the bead seller holds his pole at time t (0 standing on the curb, 1 lifted high). */
export function poleLift(t: number): number {
  return now(t, 402, LIFT_EVERY, LIFT_LEN, LIFT_AT);
}

/** How far the bead seller has his hat raised in a tip at time t (0..1). */
export function hatTip(t: number): number {
  return now(t, 402, TIP_EVERY, 1.0, TIP_AT);
}

/** The pole's height (u), and its arms: the top pair's reach either side (u), and how much further each pair down reaches. */
const POLE_H = 0.18;
const POLE_ARM = 0.013;
const POLE_ARM_STEP = 0.003;

/** The bead seller's pole, standing on the curb at x (lifted by `lift` u): a staff with three arms, every arm hung with strings of beads that swing. */
function beadPole(ctx: Ctx, s: Scene, x: number, foot: number, lift: number, lw: number): void {
  const u = s.u;
  const h = u * POLE_H;
  const y0 = foot - lift;
  ctx.beginPath();
  ctx.rect(x - u * 0.0035 - lw * 0.5, y0 - h - lw * 0.5, u * 0.007 + lw, h + lw);
  for (let i = 0; i < 3; i++) {
    const y = y0 - h + u * (0.02 + i * 0.05);
    const reach = u * (POLE_ARM + i * POLE_ARM_STEP);
    ctx.rect(x - reach - lw * 0.5, y - lw * 0.5, reach * 2 + lw, u * 0.004 + lw);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x - u * 0.0035, y0 - h, u * 0.007, h);
  for (let i = 0; i < 3; i++) {
    const y = y0 - h + u * (0.02 + i * 0.05);
    const reach = u * (POLE_ARM + i * POLE_ARM_STEP);
    ctx.rect(x - reach, y, reach * 2, u * 0.004);
  }
  ctx.fillStyle = IRON.light;
  ctx.fill();
  // The strings: a loop from each arm's end, swinging on its own; one ink, a dashed stroke a color.
  const loops = (c: number) => {
    let n = 0;
    for (let i = 0; i < 3; i++) {
      const y = y0 - h + u * (0.022 + i * 0.05);
      const reach = u * (POLE_ARM + i * POLE_ARM_STEP);
      for (const m of [-1, 1]) {
        if (c >= 0 && n++ % 3 !== c) continue;
        const bx = x + m * reach * 0.8;
        const sw = Math.sin(s.t * 2.1 + i * 1.7 + m) * u * 0.006 + lift * 0.1;
        ctx.moveTo(bx - u * 0.008, y);
        ctx.bezierCurveTo(bx - u * 0.008 + sw, y + u * 0.032, bx + u * 0.008 + sw, y + u * 0.032, bx + u * 0.008, y);
      }
    }
  };
  ctx.beginPath();
  loops(-1);
  ctx.lineWidth = u * 0.007 + lw * 0.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  DOT[1] = u * 0.0082;
  ctx.setLineDash(DOT);
  ctx.lineWidth = u * 0.007;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    loops(c);
    ctx.strokeStyle = THREE[c]!.light;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  ctx.beginPath();
  circle(ctx, x, y0 - h - u * 0.006, u * 0.008 + lw * 0.5);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y0 - h - u * 0.006, u * 0.008);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
}
const DOT = [0.001, 1];
const NO_DASH: number[] = [];

/**
 * The bead seller at the curb, right of the clear middle (`top` the curb's top), facing it: his
 * pole of beads in his near hand, standing on the curb before him, a string held up in the other
 * and swung to the crowd as he calls out; every few seconds he lifts the pole high, and now and
 * then he tips his boater. He turns his head to watch the parade come and go. All of it keeps in
 * front of him, clear of the parade ladder at his back.
 */
export function beadSeller(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const f = SELLER_F;
  const p = f.pose;
  const b = f.look.b;
  const x = s.cssW / 2 + SELLER.x * u;
  const y = top + u * 0.004;
  p.t = s.t;
  const lift = poleLift(s.t);
  const tip = hatTip(s.t);
  dance(p, b, s.t * 0.95 + pick(f.id, 0, 1), 0.35);
  p.turn = watch(f, s.t, SELLER.x, 0.4);
  p.tilt = 0.05 * Math.sin(s.t * 1.3);
  p.blink = blinkAt(s.t, f.id);
  const call = Math.max(0, Math.sin(s.t * 3.1));
  p.mouth = 0.2 + call * 0.6 * (1 - tip);
  // The pole in his near hand, gripped at the hip, standing on the curb just before him; lifted, the hand goes up with it to his chest.
  const sh = shoulderY(p, b);
  p.handNX = ((SELLER.pole - SELLER.x) * f.m) / f.size;
  p.handNY = sh + 0.055 - lift * 0.05;
  p.elbowN = 1;
  // The far hand holds a string of beads up before him and swings it to the crowd, or goes up to tip the hat.
  if (tip > 0) {
    p.handFX = 0.004;
    p.handFY = sh - 0.07 - tip * 0.01;
  } else {
    p.handFX = 0.036 + 0.006 * Math.sin(s.t * 3.1);
    p.handFY = sh - 0.008 - 0.012 * call;
  }
  p.elbowF = 1;
  beadPole(ctx, s, s.cssW / 2 + SELLER.pole * u, y, lift * u * 0.05 * f.size, lw);
  draw(ctx, f, x, y, u, lw);
  const h = toScreen(f, f.rig.wrF, x, y, u, P);
  if (tip <= 0) {
    // The string in his hand, swinging.
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.sin(s.t * 3.1 - 0.8) * 0.4);
    stringOf(ctx, u * 0.022, PURPLE.light, lw);
    ctx.restore();
  }
}

/** A string of beads hanging from the origin, `d` deep: its ink, then its beads. */
function stringOf(ctx: Ctx, d: number, c: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(-d * 0.3, 0);
  ctx.bezierCurveTo(-d * 0.35, d * 1.3, d * 0.35, d * 1.3, d * 0.3, 0);
  ctx.lineWidth = d * 0.28 + lw * 0.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  DOT[1] = d * 0.34;
  ctx.setLineDash(DOT);
  ctx.lineWidth = d * 0.28;
  ctx.strokeStyle = c;
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
}

// ---------------------------------------------------------------- across the street

/** When the café regular first sips (s), and how often; and how he applauds the floats. */
export const SIP_AT = 1.8;
export const SIP_EVERY = 5.5;

/** How far the regular has his cup raised to his lips at time t (0..1). */
export function sipAt(t: number): number {
  return now(t, 404, SIP_EVERY, 1.6, SIP_AT);
}

/**
 * The café regular at the sidewalk table, sitting on its right chair facing the table (`x` the
 * chair, `floor` the sidewalk under it, `seat` its seat's height, u): sipping his café au lait,
 * turning to watch the parade, applauding as the floats go by.
 */
export function cafeRegular(ctx: Ctx, s: Scene, x: number, floor: number, seat: number, lw: number): void {
  const u = s.u;
  const f = REGULAR;
  const p = f.pose;
  const b = f.look.b;
  p.t = s.t;
  const sip = sipAt(s.t);
  const clap = floatNear(s.t, 0.38) * (1 - sip);
  sit(p, b, seat / f.size, Math.sin(s.t * 1.6) * 0.3);
  p.lean = 0.06 + 0.04 * Math.sin(s.t * 0.9);
  const lk = glance(s.t, f.id, -0.2, 0.7);
  const near = nearestUnit(s.t, 0.38, 0.8);
  p.turn = Number.isNaN(near) ? lk.turn : -0.8;
  p.turn = p.turn * (1 - sip) + 0.4 * sip;
  p.tilt = lk.tilt - sip * 0.25;
  p.blink = sip > 0.5 ? 0.7 : blinkAt(s.t, f.id);
  p.mouth = sip > 0.3 ? -1 : 0.25 + clap * 0.5;
  const sh = -seat / f.size - b.spine + 0.006;
  const c = Math.sin(s.t * 14) * clap;
  // The cup in the near hand, to the lips in a sip; the far hand on the table; both together to clap.
  p.handNX = 0.03 + sip * 0.004 - clap * 0.012 + c * 0.004;
  p.handNY = sh + 0.04 - sip * 0.05 - clap * 0.01;
  p.elbowN = 1;
  p.handFX = 0.03 - clap * 0.016 - c * 0.004;
  p.handFY = sh + 0.05 - clap * 0.02;
  p.elbowF = 1;
  draw(ctx, f, x, floor, u, lw);
  if (clap < 0.5) {
    const h = toScreen(f, f.rig.wrN, x, floor, u, P);
    const r = u * 0.0042;
    ctx.beginPath();
    ctx.rect(h.x - r - lw * 0.4, h.y - r * 2.2 - lw * 0.4, r * 2 + lw * 0.8, r * 2.2 + lw * 0.8);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.rect(h.x - r, h.y - r * 2.2, r * 2, r * 2.2);
    ctx.fillStyle = WHITE;
    ctx.fill();
  }
}

/** For tests: the onlookers, as last drawn. */
export function onlookerFolk(): readonly Folk[] {
  return [LADY_F, SELLER_F, REGULAR];
}


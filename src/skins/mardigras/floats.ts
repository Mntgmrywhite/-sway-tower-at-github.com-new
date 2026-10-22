import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BONE, GOLD, GREEN, HAIRS, INK, LIDS, PAPIER, PEARL, PURPLE, THREE, VIOLET, WHEEL, type Shades } from "./colors";
import { bigHead, feather, type Look } from "./folk";
import { BONY, ADULT, build, pose } from "./rig";
import { fleurPath, starPath } from "./shapes";

// The parade's two floats, built as carnival sculpture on one chassis: a body that scrolls up into
// a volute at each end, painted in the season's colors with a gold band, strings of beads swagged
// along its top and swinging, a fringed skirt over big gold wheels that turn as it rolls. The
// jester's float carries a giant papier-mâché jester's head at its prow (a painted face with blue
// lids, rosy cheeks and a grin, a three-pointed cap whose points flop with their bells as it nods
// to the band, a ruff of layered paper) and a great jeweled crown at its stern with a fan of
// plumes trembling behind it; the skeleton krewe's float a giant grinning skull in a tall top hat
// at its prow (its jaw keeping time) and a giant white glove waving at its stern, bones crossed on
// its side. The riders stand behind the body's side (the caller draws them through `crew`), seen
// from the waist up. Everything sits on ink: each shape drawn grown in ink, then itself over it.
//
// Sizes are in u; (x, y) is the float's center on the route.

/** A float's half length (u): both are built on the same chassis. */
export const FLOAT_HL = 0.19;
/** The deck's height over the route, the body's height over the deck, and the riders' feet below the body's top (u). */
export const FLOAT_DECK = 0.082;
export const BODY_H = 0.07;
export const RIDER_DOWN = 0.05;
const WHEEL_R = 0.034;

/** Fill the current path in `color`. */
function fill(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
}

/** A shape on its ink: `build` adds its path; drawn grown by (kx, ky) about (cx, cy) in ink, then itself in `color`. */
function painted(ctx: Ctx, color: string, cx: number, cy: number, kx: number, ky: number, build: () => void): void {
  ctx.beginPath();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(kx, ky);
  ctx.translate(-cx, -cy);
  build();
  ctx.restore();
  fill(ctx, INK);
  ctx.beginPath();
  build();
  fill(ctx, color);
}

/** Both wheels at (x0, y) and (x1, y), turned by `a`: a gold rim on its ink, three spoke bars crossing at the hub. */
function wheels(ctx: Ctx, x0: number, x1: number, y: number, r: number, a: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x0, y, r + lw);
  circle(ctx, x1, y, r + lw);
  fill(ctx, INK);
  ctx.beginPath();
  circle(ctx, x0, y, r);
  circle(ctx, x1, y, r);
  fill(ctx, WHEEL.body);
  ctx.beginPath();
  const hw = lw * 0.6;
  for (const x of [x0, x1]) {
    for (let i = 0; i < 3; i++) {
      const t = a + (i * Math.PI) / 3;
      const cx = Math.cos(t) * r * 0.8;
      const cy = Math.sin(t) * r * 0.8;
      const nx = -Math.sin(t) * hw;
      const ny = Math.cos(t) * hw;
      ctx.moveTo(x - cx + nx, y - cy + ny);
      ctx.lineTo(x + cx + nx, y + cy + ny);
      ctx.lineTo(x + cx - nx, y + cy - ny);
      ctx.lineTo(x - cx - nx, y - cy - ny);
      ctx.closePath();
    }
  }
  fill(ctx, WHEEL.shade);
}

/** The chassis at center x, its wheels on the route at y: a skirt hanging from the deck with its pleats and a gold fringe, and the wheels turning as it rolls. */
function chassis(ctx: Ctx, s: Scene, x: number, y: number, lw: number, skirt: Shades): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  const bottom = y - u * 0.018;
  ctx.beginPath();
  ctx.rect(x - hl * 0.96 - lw, deck - lw, hl * 1.92 + lw * 2, bottom - deck + lw * 2);
  fill(ctx, INK);
  ctx.beginPath();
  ctx.rect(x - hl * 0.96, deck, hl * 1.92, bottom - deck);
  fill(ctx, skirt.body);
  ctx.beginPath();
  for (let sx = x - hl * 0.88; sx < x + hl * 0.9; sx += u * 0.034) ctx.rect(sx, deck + u * 0.006, u * 0.009, bottom - deck - u * 0.008);
  fill(ctx, skirt.shade);
  // The fringe along the hem: one zigzag of gold tassels.
  ctx.beginPath();
  const tooth = u * 0.013;
  ctx.moveTo(x - hl * 0.94, bottom - u * 0.004);
  for (let tx = x - hl * 0.94; tx < x + hl * 0.94 - tooth * 0.5; tx += tooth) {
    ctx.lineTo(tx + tooth * 0.5, bottom + u * 0.012);
    ctx.lineTo(tx + tooth, bottom);
  }
  ctx.lineTo(x + hl * 0.94, bottom - u * 0.004);
  ctx.closePath();
  fill(ctx, GOLD.body);
  const turn = (x / u) * (Math.PI * 2) * 0.9;
  wheels(ctx, x - hl * 0.6, x + hl * 0.6, y - WHEEL_R * u, WHEEL_R * u, turn, lw);
}

/** The float's body from the deck up: a long sculpted box that sweeps up at each end into a curling volute. */
function bodyPath(ctx: Ctx, x: number, top: number, deck: number, hl: number): void {
  const h = deck - top;
  ctx.moveTo(x - hl, deck);
  ctx.lineTo(x - hl, top + h * 0.2);
  ctx.bezierCurveTo(x - hl, top - h * 0.5, x - hl * 0.78, top - h * 0.55, x - hl * 0.76, top - h * 0.15);
  ctx.quadraticCurveTo(x - hl * 0.8, top + h * 0.05, x - hl * 0.7, top);
  ctx.lineTo(x + hl * 0.7, top);
  ctx.quadraticCurveTo(x + hl * 0.8, top + h * 0.05, x + hl * 0.76, top - h * 0.15);
  ctx.bezierCurveTo(x + hl * 0.78, top - h * 0.55, x + hl, top - h * 0.5, x + hl, top + h * 0.2);
  ctx.lineTo(x + hl, deck);
  ctx.closePath();
}

/** The body, painted: its color on its ink, a lit top, a shaded foot, a gold band with a running scroll, gold spirals in the volutes. */
function body(ctx: Ctx, x: number, top: number, deck: number, hl: number, u: number, lw: number, c: Shades, band: Shades): void {
  const h = deck - top;
  painted(ctx, c.body, x, (top + deck) / 2, 1 + (lw * 2) / (hl * 2), 1 + (lw * 2) / (h * 1.6), () => bodyPath(ctx, x, top, deck, hl));
  ctx.beginPath();
  ctx.rect(x - hl * 0.68, top + lw, hl * 1.36, h * 0.12);
  fill(ctx, c.light);
  ctx.beginPath();
  ctx.rect(x - hl + lw, deck - h * 0.16, hl * 2 - lw * 2, h * 0.16 - lw * 0.5);
  fill(ctx, c.shade);
  // The band, edged in ink, and a scroll running along it in one wave.
  const by = top + h * 0.48;
  ctx.beginPath();
  ctx.rect(x - hl - lw * 0.5, by - h * 0.13 - lw * 0.6, hl * 2 + lw, h * 0.26 + lw * 1.2);
  fill(ctx, INK);
  ctx.beginPath();
  ctx.rect(x - hl, by - h * 0.13, hl * 2, h * 0.26);
  fill(ctx, band.body);
  // Diamond studs along the band, and a gold boss in each volute.
  ctx.beginPath();
  const step = u * 0.03;
  const d = h * 0.09;
  for (let sx = x - hl * 0.9 + step * 0.5; sx < x + hl * 0.92; sx += step) {
    ctx.moveTo(sx, by - d);
    ctx.lineTo(sx + d * 0.8, by);
    ctx.lineTo(sx, by + d);
    ctx.lineTo(sx - d * 0.8, by);
    ctx.closePath();
  }
  for (const m of [-1, 1]) circle(ctx, x + m * hl * 0.87, top - h * 0.12, h * 0.13);
  fill(ctx, band === GOLD ? PURPLE.light : GOLD.body);
}

/** The swags' dash: a bead (a dot of a dash with round caps), then a gap; and no dash. */
const BEAD = [0.001, 1];
const NO_DASH: number[] = [];

/** Strings of beads swagged along the float's top from x0 to x1, swinging: one ink for all, then the beads in two colors by turns. */
function swags(ctx: Ctx, x0: number, x1: number, y: number, u: number, lw: number, t: number, c0: Shades, c1: Shades): void {
  const n = 4;
  const span = (x1 - x0) / n;
  const r = u * 0.0034;
  const loops = (k: number) => {
    for (let i = 0; i < n; i++) {
      if (k >= 0 && i % 2 !== k) continue;
      const a = x0 + i * span;
      const dx = Math.sin(t * 1.4 + i * 1.9) * u * 0.005;
      ctx.moveTo(a, y);
      ctx.quadraticCurveTo(a + span / 2 + dx, y + u * 0.03, a + span, y);
    }
  };
  ctx.beginPath();
  loops(-1);
  ctx.lineWidth = r * 2 + lw * 0.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  BEAD[1] = r * 2.4;
  ctx.setLineDash(BEAD);
  ctx.lineWidth = r * 2;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    loops(k);
    ctx.strokeStyle = (k ? c1 : c0).light;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
}

/** A ruff of layered paper round a giant head's neck: a scalloped collar on its ink, a gold lit edge. */
function ruff(ctx: Ctx, x: number, y: number, r: number, lw: number, a: Shades): void {
  const n = 8;
  const build = (g: number) => {
    ctx.moveTo(x - r - g, y);
    for (let i = 0; i < n; i++) {
      const x0 = x - r + (i * 2 * r) / n;
      const x1 = x0 + (2 * r) / n;
      const dip = Math.sin((Math.PI * (i + 0.5)) / n) * r * 0.22;
      ctx.quadraticCurveTo((x0 + x1) / 2, y + dip + r * 0.32 + g, x1 + (i === n - 1 ? g : 0), y + dip * 0.6);
    }
    ctx.quadraticCurveTo(x, y - r * 0.32 - g, x - r - g, y);
    ctx.closePath();
  };
  ctx.beginPath();
  build(lw);
  fill(ctx, INK);
  ctx.beginPath();
  build(0);
  fill(ctx, a.body);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, y + r * 0.08);
  ctx.quadraticCurveTo(x, y + r * 0.34, x + r * 0.9, y + r * 0.08);
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = GOLD.light;
  ctx.stroke();
}

/** A fan of plumes rising from (x, y), trembling: on one ink. */
function plumes(ctx: Ctx, x: number, y: number, len: number, lw: number, t: number, phase: number, colors: readonly Shades[]): void {
  const n = colors.length;
  for (let pass = -1; pass < n; pass++) {
    ctx.beginPath();
    for (let i = pass < 0 ? 0 : pass; i < (pass < 0 ? n : pass + 1); i++) {
      const a = -0.6 + (i * 1.2) / Math.max(1, n - 1) + Math.sin(t * 4.5 + phase + i * 1.9) * 0.06;
      const g = pass < 0 ? lw : 0;
      feather(ctx, x, y, x + Math.sin(a) * (len + g), y - Math.cos(a) * (len + g), len * 0.2 + g);
    }
    fill(ctx, pass < 0 ? INK : colors[pass]!.body);
  }
}

/** A gold crown on its cushion at (x, y) (the cushion's center), `w` wide: five points with pearls, a jeweled band, lit on its left; the pearls glint by turns. */
function crown(ctx: Ctx, x: number, y: number, w: number, lw: number, t: number): void {
  const h = w * 0.62;
  const by = y - w * 0.06;
  painted(ctx, GREEN.body, x, y, 1 + (lw * 2) / (w * 1.3), 1 + (lw * 2) / (w * 0.3), () => oval(ctx, x, y, w * 0.66, w * 0.15));
  painted(ctx, GOLD.body, x, by - h / 2, 1 + (lw * 2) / w, 1 + (lw * 2) / h, () => {
    ctx.moveTo(x - w / 2, by);
    ctx.lineTo(x - w / 2, by - h * 0.55);
    for (let i = 0; i < 5; i++) {
      const px = x - w / 2 + (w * (i + 0.5)) / 5;
      const tall = i === 2 ? 1 : i % 2 ? 0.82 : 0.9;
      ctx.lineTo(px - w * 0.06, by - h * 0.5);
      ctx.lineTo(px, by - h * tall);
      ctx.lineTo(px + w * 0.06, by - h * 0.5);
    }
    ctx.lineTo(x + w / 2, by - h * 0.55);
    ctx.lineTo(x + w / 2, by);
    ctx.closePath();
  });
  ctx.beginPath();
  ctx.rect(x - w / 2 + lw * 0.5, by - h * 0.5, w * 0.3, h * 0.48);
  fill(ctx, GOLD.light);
  ctx.beginPath();
  ctx.rect(x - w / 2, by - h * 0.32, w, h * 0.2);
  fill(ctx, PURPLE.body);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const px = x - w / 2 + (w * (i + 0.5)) / 5;
    const tall = i === 2 ? 1 : i % 2 ? 0.82 : 0.9;
    circle(ctx, px, by - h * tall, w * (0.04 + 0.014 * Math.max(0, Math.sin(t * 3 + i * 1.3))));
  }
  for (let i = 0; i < 3; i++) circle(ctx, x - w * 0.25 + i * w * 0.25, by - h * 0.22, w * 0.045);
  fill(ctx, PEARL);
}

// ---------------------------------------------------------------- the jester's float

/** The giant jester's look: a painted cream face, blue lids, a purple-green-gold cap. */
const JESTER: Look = {
  b: build({ headW: 0.03, headH: 0.031 }, ADULT),
  skin: PAPIER,
  hair: HAIRS[4]!,
  hairDo: "bald",
  top: PURPLE,
  bottom: PURPLE,
  hat: "jester",
  hatColor: PURPLE,
  hatTrim: GOLD,
  mask: "none",
  maskColor: GOLD,
  lids: LIDS.blue,
};
const JESTER_POSE = pose(JESTER.b);
const PLUMES_J = [VIOLET, GREEN, GOLD, PURPLE] as const;

/** The jester's float at center x, its wheels on the route at y; `beat` the band's phase (radians); `crew` draws its riders standing at the given y behind its side. */
export function jesterFloat(ctx: Ctx, s: Scene, x: number, y: number, lw: number, beat: number, crew: (standY: number) => void): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  const top = deck - BODY_H * u;
  chassis(ctx, s, x, y, lw, GREEN);
  // Behind the riders: the plumes fanning up behind the crown.
  plumes(ctx, x - hl * 0.7, top + u * 0.004, u * 0.07, lw, s.t, 0.4, PLUMES_J);
  crew(top + RIDER_DOWN * u);
  body(ctx, x, top, deck, hl, u, lw, PURPLE, GOLD);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) starPath(ctx, x + i * u * 0.06, top + BODY_H * u * 0.48, u * 0.009);
  fill(ctx, GREEN.light);
  swags(ctx, x - hl * 0.55, x + hl * 0.45, top + u * 0.004, u, lw, s.t + 1.1, GOLD, GREEN);
  crown(ctx, x - hl * 0.66, top + u * 0.002, u * 0.075, lw, s.t);
  // The giant jester's head at the prow, nodding to the band, its cap's points flopping.
  const nod = Math.sin(beat) * 0.07;
  const R = u * 0.037;
  const hx = x + hl * 0.68;
  const hy = top - R * 0.68;
  ruff(ctx, hx, top - u * 0.006, R * 1.15, lw, PURPLE);
  JESTER_POSE.t = s.t;
  JESTER_POSE.turn = 0.25 + Math.sin(s.t * 0.7) * 0.15;
  JESTER_POSE.mouth = 0.55 + 0.25 * Math.max(0, Math.sin(beat));
  JESTER_POSE.swing = Math.sin(beat - 1.2);
  JESTER_POSE.bob = Math.sin(beat * 2 - 1.1);
  JESTER_POSE.blink = 0;
  bigHead(ctx, JESTER, JESTER_POSE, hx, hy, R, nod, 1, lw, 41);
}

// ---------------------------------------------------------------- the skeleton krewe's float

/** The giant skull's look: a grinning skull in a tall purple top hat. */
const SKULL: Look = {
  b: build({ headW: 0.03, headH: 0.03 }, BONY),
  skin: BONE,
  hair: INK,
  hairDo: "bald",
  top: BONE,
  bottom: BONE,
  hat: "topHat",
  hatColor: PURPLE,
  hatTrim: GOLD,
  mask: "none",
  maskColor: GOLD,
  lids: LIDS.blue,
  skull: true,
};
const SKULL_POSE = pose(SKULL.b);
const KNOBS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

/** Two cartoon bones crossed at (x, y), `len` long with knobs of radius r, on their ink. */
function crossedBones(ctx: Ctx, x: number, y: number, len: number, r: number, lw: number): void {
  const build = (g: number) => {
    for (const a of [0.5, -0.5]) {
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const px = (dx: number, dy: number) => x + dx * c - dy * sn;
      const py = (dx: number, dy: number) => y + dx * sn + dy * c;
      ctx.moveTo(px(-len / 2, -r * 0.5 - g), py(-len / 2, -r * 0.5 - g));
      ctx.lineTo(px(len / 2, -r * 0.5 - g), py(len / 2, -r * 0.5 - g));
      ctx.lineTo(px(len / 2, r * 0.5 + g), py(len / 2, r * 0.5 + g));
      ctx.lineTo(px(-len / 2, r * 0.5 + g), py(-len / 2, r * 0.5 + g));
      ctx.closePath();
      for (const [dx, dy] of KNOBS) circle(ctx, px((dx * len) / 2, dy * r * 0.6), py((dx * len) / 2, dy * r * 0.6), r + g);
    }
  };
  ctx.beginPath();
  build(lw);
  fill(ctx, INK);
  ctx.beginPath();
  build(0);
  fill(ctx, BONE.body);
}

/** A finger: a stick `len` long and `w` wide with a round tip, from its base (x, y) tilted by `a`, as its own subpath. */
function stick(ctx: Ctx, x: number, y: number, len: number, w: number, a: number): void {
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const r = w / 2;
  const tx = x + dx * (len - r);
  const ty = y + dy * (len - r);
  const ang = Math.atan2(dy, dx);
  ctx.moveTo(x + Math.cos(ang - Math.PI / 2) * r, y + Math.sin(ang - Math.PI / 2) * r);
  ctx.lineTo(tx + Math.cos(ang - Math.PI / 2) * r, ty + Math.sin(ang - Math.PI / 2) * r);
  ctx.arc(tx, ty, r, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.lineTo(x + Math.cos(ang + Math.PI / 2) * r, y + Math.sin(ang + Math.PI / 2) * r);
  ctx.closePath();
}

const GLOVE_FINGERS = [0.026, 0.031, 0.03, 0.024];

/** A giant white glove on a cuff striped purple, green and gold, its wrist at (x, y), waving by `wave` radians. */
function bigGlove(ctx: Ctx, x: number, y: number, u: number, lw: number, wave: number): void {
  const cuff = u * 0.018;
  const palmW = u * 0.038;
  const palmH = u * 0.032;
  const top = -cuff - palmH;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wave);
  const hand = (g: number) => {
    ctx.moveTo(-palmW / 2 - g, top + palmH * 0.3);
    ctx.quadraticCurveTo(-palmW / 2 - g, top - u * 0.002 - g, 0, top - g);
    ctx.quadraticCurveTo(palmW / 2 + g, top - u * 0.002 - g, palmW / 2 + g, top + palmH * 0.3);
    ctx.lineTo(palmW / 2 + g, -cuff + u * 0.002);
    ctx.lineTo(-palmW / 2 - g, -cuff + u * 0.002);
    ctx.closePath();
    const fw = u * 0.0095 + g * 2;
    for (let i = 0; i < 4; i++) stick(ctx, -palmW / 2 + u * 0.00475 + (i * (palmW - u * 0.0095)) / 3, top + u * 0.007, GLOVE_FINGERS[i]! * u + g, fw, (i - 1.5) * 0.09);
    stick(ctx, -palmW / 2 + u * 0.003, top + palmH * 0.62, u * 0.019 + g, u * 0.01 + g * 2, -0.95);
  };
  ctx.beginPath();
  hand(lw);
  ctx.rect(-u * 0.023 - lw, -cuff - lw, u * 0.046 + lw * 2, cuff + lw * 2);
  fill(ctx, INK);
  ctx.beginPath();
  hand(0);
  fill(ctx, BONE.light);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(-u * (0.021 + i * 0.001), -cuff + (i * cuff) / 3, u * (0.042 + i * 0.002), cuff / 3);
    fill(ctx, THREE[i]!.body);
  }
  ctx.restore();
}

/** The skeleton krewe's float at center x, its wheels on the route at y; `beat` the band's phase (radians); `crew` draws the dancing skeletons. */
export function bonesFloat(ctx: Ctx, s: Scene, x: number, y: number, lw: number, beat: number, crew: (standY: number) => void): void {
  const u = s.u;
  const hl = FLOAT_HL * u;
  const deck = y - FLOAT_DECK * u;
  const top = deck - BODY_H * u;
  chassis(ctx, s, x, y, lw, PURPLE);
  crew(top + RIDER_DOWN * u);
  body(ctx, x, top, deck, hl, u, lw, GREEN, PURPLE);
  // Bones crossed on the band, and the fleur-de-lis between.
  const by = top + BODY_H * u * 0.48;
  crossedBones(ctx, x - u * 0.085, by, u * 0.04, u * 0.006, lw * 0.7);
  crossedBones(ctx, x + u * 0.085, by, u * 0.04, u * 0.006, lw * 0.7);
  painted(ctx, GOLD.body, x, by, 1 + (lw * 1.4) / (u * 0.03), 1 + (lw * 1.4) / (u * 0.03), () => fleurPath(ctx, x, by, u * 0.03));
  swags(ctx, x - hl * 0.5, x + hl * 0.45, top + u * 0.004, u, lw, s.t + 2.4, PURPLE, GOLD);
  // The giant glove at the stern, waving to the crowd.
  bigGlove(ctx, x - hl * 0.66, top + u * 0.004, u, lw, 0.28 * Math.sin(beat / 2) + 0.05);
  // The giant skull at the prow in its top hat, its jaw keeping time.
  const R = u * 0.034;
  SKULL_POSE.t = s.t;
  SKULL_POSE.turn = 0.3 + Math.sin(s.t * 0.9) * 0.12;
  SKULL_POSE.mouth = 0.4 + 0.6 * Math.max(0, Math.sin(beat));
  SKULL_POSE.swing = Math.sin(beat - 1.2);
  ruff(ctx, x + hl * 0.68, top - u * 0.004, R * 1.1, lw, GOLD);
  bigHead(ctx, SKULL, SKULL_POSE, x + hl * 0.68, top - R * 0.85, R, Math.sin(beat) * 0.08 - 0.06, 1, lw, 43);
}

import { circle, ink, inkedLine, oval, outlined, type Ctx } from "../../base/draw";
import { fieldY, layerGround } from "../../base/world";
import type { Scene } from "../skin";
import {
  BUN,
  CHARCOAL_GLOW,
  CHROME,
  CLOTH_RED,
  CLOTH_WHITE,
  COOLER,
  CREAM,
  DECK,
  FLAG,
  GOLD,
  GRILL,
  HAIR_BLONDE,
  HAIR_BROWN,
  HAIR_DARK,
  INK,
  JAR,
  JEANS,
  KID_SHIRTS,
  LATTICE_BACK,
  LAWN,
  LAWN_NEAR,
  LEAVES,
  LEMONADE,
  MELON_FLESH,
  MELON_RIND,
  MELON_SEED,
  PAINT,
  PATH,
  PATH_EDGE,
  PICKET,
  PIE_CRUST,
  PIE_FILLING,
  POT,
  SAUSAGE,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  SMOKE,
  SPARK,
  STEP,
  STICK,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TABLE,
  TROUSERS,
  UNIFORM,
  type Shades,
} from "./colors";
import { usFlag } from "./flag";
import { block, dot, scallops, smooth, sparkle, speck } from "./shapes";
import type { Tone } from "./tone";
import { fanEdge, pleatedFans, townLine } from "./town";

// The town square the tower stands in: the lawn from Main Street (its far side) down to the
// street in front, mown in stripes, with a clipped hedge and a white picket fence along its far
// edge and two lamp posts hung with flower baskets and a string of pennants; the white bandstand
// the bars are stacked on (its roof long gone, so you can build it higher): an octagonal deck
// whose top is the tower's floor, pleated fans of bunting hung along its fascia, a lattice
// skirt beneath, three steps with a red runner down the front between two pots of geraniums,
// and a concrete path across the lawn to the sidewalk. On the left, the barbecue corner: a
// picnic table under a red-checked cloth with watermelon, a pie, lemonade and a little flag in
// a jar, a cooler, and the cook at his kettle grill, flipping burgers (first at 3 s, then every
// 7: the owner's first-ten-seconds rule), smoke rising. On the right, two kids with sparklers
// and a flag planted in the grass. The parade passes in front of all of it (parade.ts).
// Everything up close is printed with the poster's key plate: flat colors with a lit plane, and
// a thin navy keyline round every shape (the lawn, the hedge and the lamp posts are midground,
// flat and unlined). Nothing beside the base block rises above its top (the slider's first pass
// sweeps over the lawn).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The line weight up close: the deck's lip (the tower's floor line). */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** The keyline round everything up close. */
export function keyW(s: Scene): number {
  return Math.max(1, s.u * 0.0034);
}

/** Center line of the tower: under the base block. */
export function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

/** The deck: half width, its angled end faces, the fascia's depth, the lattice skirt's foot. */
export const DECK_HW = 0.26;
const END_FACE = 0.07;
export const FASCIA_H = 0.04;
export const DECK_FOOT = 0.2;
/** The steps down the front, from under the deck to the lawn at the skirt's foot: width, each riser, how many; the path from their foot. */
const STEP_HW = 0.08;
const STEP_H = 0.04;
const STEPS = 4;
export const STEP_FOOT = FASCIA_H + STEPS * STEP_H;
/** The sidewalk's top edge sits this far above the base band's top (u): the lawn and the path end there. */
export const SIDEWALK_UP = 0.04;
/** The path's half width at the steps and at the sidewalk. */
const PATH_HW_TOP = 0.09;
const PATH_HW_BOTTOM = 0.13;

/** The lawn's top edge: Main Street's line, the far side of the square. */
export function lawnTop(s: Scene): number {
  return townLine(s);
}

/** The sidewalk's top edge: where the lawn ends (it moves with the base band). */
export function sidewalkTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * (0.36 - SIDEWALK_UP);
}

/** The lawn: hazy far at the square's far side, deeper green near, mown in stripes that widen toward you. */
export function lawn(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const top = lawnTop(s);
  if (top > s.cssH) return;
  // Down to the sidewalk: the street in front (front.ts) covers everything below it.
  const bottom = Math.min(s.cssH, sidewalkTop(s) + 2);
  ctx.fillStyle = LAWN;
  ctx.fillRect(0, top, s.cssW, bottom - top);
  ctx.fillStyle = tone.lawnFar;
  ctx.fillRect(0, top, s.cssW, u * 0.03);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, top + u * 0.03, s.cssW, u * 0.03);
  ctx.globalAlpha = 1;
  // Mowing stripes between field rows at depths z and z + 0.5, from the tower's line toward you.
  ctx.fillStyle = LAWN_NEAR;
  ctx.beginPath();
  for (let z = 0.8, i = 0; z < 24; z += 0.5, i++) {
    if (i % 2) continue;
    const y0 = fieldY(s, z + 0.5);
    const y1 = fieldY(s, z);
    if (y0 > bottom) continue;
    if (y1 - y0 < 1) break;
    ctx.rect(0, Math.max(top, y0), s.cssW, Math.min(y1, bottom) - Math.max(top, y0));
  }
  ctx.fill();
}

/** The square's far edge: a clipped hedge, the picket fence in front of it either side of the tower, and two lamp posts hung with flower baskets with a string of pennants between them. */
const POST_X = 0.3;
const POST_H = 0.085;
const POST_FOOT = 0.085;
const HEDGE_GAP = 0.11;
const HEDGE_H = 0.024;
/** The picket fence: how far out from the center it starts (it stops short of the tower's column), its pickets' pitch and height, its foot (u under the lawn's edge). */
const FENCE_FROM = 0.23;
const PICKET_PITCH = 0.013;
const PICKET_H = 0.032;
const FENCE_FOOT = 0.05;

/** The hedge: rounded clumps along the lawn's far edge, darker at the foot, leaving the gap for the path; the picket fence in front of it at the sides. */
export function hedge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = centerX(s);
  const top = lawnTop(s);
  if (top > s.cssH) return;
  const hy = top + u * 0.012;
  const y = hy + HEDGE_H * u * 0.5;
  const left = cx - HEDGE_GAP * u;
  const right = cx + HEDGE_GAP * u;
  ctx.fillStyle = tone.tree;
  ctx.beginPath();
  scallops(ctx, -u * 0.02, left, y, u * 0.028, u * 0.016, HEDGE_H * u * 0.6);
  scallops(ctx, right, s.cssW + u * 0.02, y, u * 0.028, u * 0.016, HEDGE_H * u * 0.6);
  ctx.fill();
  ctx.fillStyle = tone.treeLit;
  ctx.beginPath();
  scallops(ctx, -u * 0.02, left - u * 0.008, y - u * 0.008, u * 0.028, u * 0.009, u * 0.006);
  scallops(ctx, right + u * 0.008, s.cssW + u * 0.02, y - u * 0.008, u * 0.028, u * 0.009, u * 0.006);
  ctx.fill();
  // The picket fence: two rails, then the pointed pickets in front of them.
  const foot = top + FENCE_FOOT * u;
  const ph = PICKET_H * u;
  const pw = PICKET_PITCH * u * 0.55;
  ctx.fillStyle = PICKET.shade;
  ctx.beginPath();
  ctx.rect(-1, foot - ph * 0.75, cx - FENCE_FROM * u + 1, u * 0.004);
  ctx.rect(-1, foot - ph * 0.3, cx - FENCE_FROM * u + 1, u * 0.004);
  ctx.rect(cx + FENCE_FROM * u, foot - ph * 0.75, s.cssW, u * 0.004);
  ctx.rect(cx + FENCE_FROM * u, foot - ph * 0.3, s.cssW, u * 0.004);
  ctx.fill();
  ctx.fillStyle = PICKET.light;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let d = FENCE_FROM * u + pw; ; d += PICKET_PITCH * u) {
      const x = cx + side * d;
      if (x < -pw || x > s.cssW + pw) break;
      ctx.rect(x - pw / 2, foot - ph + pw * 0.5, pw, ph - pw * 0.5);
      ctx.moveTo(x - pw / 2, foot - ph + pw * 0.5);
      ctx.lineTo(x, foot - ph);
      ctx.lineTo(x + pw / 2, foot - ph + pw * 0.5);
      ctx.closePath();
    }
  }
  ctx.fill();
}


/** Two lamp posts on the lawn's far edge, each with a lantern and a basket of red and white flowers, a string of pennants between them. */
export function lampPosts(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = centerX(s);
  const top = lawnTop(s);
  if (top > s.cssH) return;
  const foot = top + u * POST_FOOT;
  for (const side of [-1, 1]) {
    const x = cx + side * POST_X * u;
    ctx.fillStyle = tone.slate;
    ctx.fillRect(x - u * 0.004, foot - POST_H * u, u * 0.008, POST_H * u);
    ctx.fillRect(x - u * 0.012, foot - u * 0.006, u * 0.024, u * 0.006);
    ctx.beginPath();
    ctx.moveTo(x - u * 0.011, foot - POST_H * u);
    ctx.lineTo(x + u * 0.011, foot - POST_H * u);
    ctx.lineTo(x + u * 0.008, foot - (POST_H + 0.024) * u);
    ctx.lineTo(x - u * 0.008, foot - (POST_H + 0.024) * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.window;
    ctx.fillRect(x - u * 0.007, foot - (POST_H + 0.02) * u, u * 0.014, u * 0.016);
    ctx.fillStyle = tone.slate;
    ctx.fillRect(x - side * u * 0.03, foot - u * 0.072, u * 0.03, u * 0.004);
    ctx.fillStyle = tone.trunk;
    ctx.beginPath();
    ctx.moveTo(x - side * u * 0.04, foot - u * 0.062);
    ctx.lineTo(x - side * u * 0.02, foot - u * 0.062);
    ctx.lineTo(x - side * u * 0.025, foot - u * 0.05);
    ctx.lineTo(x - side * u * 0.035, foot - u * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.red;
    ctx.beginPath();
    circle(ctx, x - side * u * 0.025, foot - u * 0.066, u * 0.007);
    circle(ctx, x - side * u * 0.036, foot - u * 0.063, u * 0.006);
    ctx.fill();
    ctx.fillStyle = tone.white;
    ctx.beginPath();
    circle(ctx, x - side * u * 0.031, foot - u * 0.07, u * 0.006);
    ctx.fill();
  }
  // A string of pennants between the lamp posts' lanterns, sagging across the square.
  const y0 = foot - (POST_H + 0.012) * u;
  const x0 = cx - POST_X * u;
  const x1 = cx + POST_X * u;
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, y0 + u * 0.05, x1, y0);
  ctx.stroke();
  const n = 14;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (i % 3 !== band) continue;
      const k = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * k;
      const y = y0 + u * 0.1 * k * (1 - k);
      ctx.moveTo(x - u * 0.009, y);
      ctx.lineTo(x + u * 0.009, y);
      ctx.lineTo(x, y + u * 0.02);
      ctx.closePath();
    }
    ctx.fill();
  }
}

/** The concrete path from the steps to the sidewalk, its joints closer together further away. */
export function path(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = centerX(s);
  const top = s.groundY + STEP_FOOT * u;
  const bottom = sidewalkTop(s) + 1;
  if (top > s.cssH) return;
  const lw = inkW(s);
  ctx.beginPath();
  ctx.moveTo(cx - PATH_HW_TOP * u, top);
  ctx.lineTo(cx + PATH_HW_TOP * u, top);
  ctx.lineTo(cx + PATH_HW_BOTTOM * u, bottom);
  ctx.lineTo(cx - PATH_HW_BOTTOM * u, bottom);
  ctx.closePath();
  ctx.fillStyle = PATH;
  ctx.fill();
  // Joints across it, closer together further away.
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  for (let k = 0.18; k < 1; k += 0.2) {
    const y = top + (bottom - top) * k * k;
    const hw = (PATH_HW_TOP + (PATH_HW_BOTTOM - PATH_HW_TOP) * k * k) * u;
    ctx.moveTo(cx - hw + lw, y);
    ctx.lineTo(cx + hw - lw, y);
  }
  ctx.stroke();
}

/**
 * A rectangle printed with the key plate: a navy rect under the color, inset, so the keyline
 * straddles its edge as a stroke's would (two plain fills cost a fraction of a fill and a stroke).
 */
function keyRect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, kw: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x - kw / 2, y - kw / 2, w + kw, h + kw);
  ctx.fillStyle = fill;
  ctx.fillRect(x + kw / 2, y + kw / 2, w - kw, h - kw);
}

/** Pots of red geraniums either side of the steps' foot: their place (u out from the center line) and the pots' foot (u under the floor). */
const POT_X = 0.135;
const POT_FOOT = STEP_FOOT + 0.03;

/** The bandstand's deck, printed with the key plate: the fascia hung with fans of bunting, the lattice skirt, the steps and their runner, the pots of geraniums, its shadow on the lawn. */
export function bandstand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const kw = keyW(s);
  const hw = DECK_HW * u;
  const ef = END_FACE * u;
  const fasciaBottom = g + FASCIA_H * u;
  const foot = g + DECK_FOOT * u;

  // The shadow the deck throws on the lawn.
  ctx.fillStyle = "rgba(20, 30, 70, 0.2)";
  ctx.beginPath();
  oval(ctx, cx, foot + u * 0.012, hw * 1.12, u * 0.028);
  ctx.fill();

  // The lattice skirt: the navy shadow under the deck between the end faces, cream strips both ways, clipped to it.
  const lx0 = cx - hw + ef;
  const lx1 = cx + hw - ef;
  ctx.fillStyle = LATTICE_BACK;
  ctx.fillRect(lx0, fasciaBottom, lx1 - lx0, foot - fasciaBottom);
  // The strips at 45 degrees both ways, each cut to the skirt (no clip: a clip costs more than the whole lattice).
  ctx.strokeStyle = PAINT.body;
  ctx.lineWidth = Math.max(1.5, u * 0.007);
  ctx.lineCap = "butt";
  ctx.beginPath();
  const pitch = u * 0.054;
  const sh = foot - fasciaBottom;
  for (let x = lx0 - sh + pitch * 0.5; x < lx1; x += pitch) {
    // Rising strip: from (x, foot) to (x + sh, fasciaBottom), cut to lx0..lx1.
    const a0 = Math.max(0, lx0 - x);
    const a1 = Math.min(sh, lx1 - x);
    if (a1 > a0) {
      ctx.moveTo(x + a0, foot - a0);
      ctx.lineTo(x + a1, foot - a1);
      ctx.moveTo(x + a0, fasciaBottom + a0);
      ctx.lineTo(x + a1, fasciaBottom + a1);
    }
  }
  ctx.stroke();
  // The end faces of the skirt, angled away: shaded panels; the posts at the corners; the sill board along its foot.
  const sh2 = foot - fasciaBottom;
  keyRect(ctx, cx - hw, fasciaBottom, ef, sh2, PAINT.shade, kw);
  keyRect(ctx, lx1, fasciaBottom, ef, sh2, PAINT.shade, kw);
  for (const x of [cx - hw, lx0 - u * 0.006, lx1 - u * 0.006, cx + hw - u * 0.012]) keyRect(ctx, x, fasciaBottom, u * 0.012, sh2, PAINT.body, kw);
  keyRect(ctx, cx - hw - u * 0.006, foot - u * 0.012, hw * 2 + u * 0.012, u * 0.016, PAINT.shade, kw);

  // The steps down the front: treads lit, risers shaded, widening a little toward you; a red runner down them.
  for (let i = 0; i < STEPS; i++) {
    const shw = (STEP_HW + i * 0.012) * u;
    keyRect(ctx, cx - shw, fasciaBottom + i * STEP_H * u, shw * 2, STEP_H * u, STEP.shade, kw);
  }
  ctx.fillStyle = STEP.light;
  ctx.beginPath();
  for (let i = 0; i < STEPS; i++) {
    const shw = (STEP_HW + i * 0.012) * u;
    ctx.rect(cx - shw + kw * 0.5, fasciaBottom + i * STEP_H * u + kw * 0.5, shw * 2 - kw, STEP_H * u * 0.4);
  }
  ctx.fill();
  keyRect(ctx, cx - u * 0.032, fasciaBottom, u * 0.064, STEPS * STEP_H * u, STRIPE_RED, kw);
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - u * 0.026, fasciaBottom, u * 0.004, STEPS * STEP_H * u);
  ctx.fillRect(cx + u * 0.022, fasciaBottom, u * 0.004, STEPS * STEP_H * u);

  // The pots of geraniums either side of the steps' foot: keylined pots and leaves, the blooms dotted over them.
  const py = g + POT_FOOT * u;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const px = cx + side * POT_X * u;
    oval(ctx, px, py - u * 0.034, u * 0.022, u * 0.012);
  }
  outlined(ctx, LEAVES, kw, INK);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const px = cx + side * POT_X * u;
    ctx.moveTo(px - u * 0.016, py - u * 0.026);
    ctx.lineTo(px + u * 0.016, py - u * 0.026);
    ctx.lineTo(px + u * 0.012, py);
    ctx.lineTo(px - u * 0.012, py);
    ctx.closePath();
  }
  outlined(ctx, POT, kw, INK);
  ctx.fillStyle = STRIPE_RED;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const px = cx + side * POT_X * u;
    dot(ctx, px - u * 0.01, py - u * 0.04, u * 0.007);
    dot(ctx, px + u * 0.006, py - u * 0.044, u * 0.007);
    dot(ctx, px + u * 0.013, py - u * 0.035, u * 0.006);
  }
  ctx.fill();

  // The fascia: the deck's edge, three faces (the ends angled away, so shaded), under a lip of decking.
  keyRect(ctx, cx - hw, g, hw * 2, FASCIA_H * u, PAINT.body, kw);
  ctx.fillStyle = PAINT.shade;
  ctx.fillRect(cx - hw + kw * 0.5, g, ef - kw * 0.5, FASCIA_H * u - kw * 0.5);
  ctx.fillRect(lx1, g, ef - kw * 0.5, FASCIA_H * u - kw * 0.5);
  ctx.fillStyle = PAINT.light;
  ctx.fillRect(lx0, g, lx1 - lx0, u * 0.008);
  ctx.fillStyle = INK;
  ctx.fillRect(lx0 - kw * 0.5, g, kw, FASCIA_H * u);
  ctx.fillRect(lx1 - kw * 0.5, g, kw, FASCIA_H * u);
  // Fans of bunting hung along the fascia, their tops at its upper edge.
  const fans = 5;
  const fr = Math.min(((lx1 - lx0) / fans) * 0.46, u * 0.034);
  ctx.beginPath();
  for (let i = 0; i < fans; i++) fanEdge(ctx, lx0 + ((lx1 - lx0) * (i + 0.5)) / fans, g + u * 0.004, fr);
  ink(ctx, kw * 1.6, INK);
  pleatedFans(ctx, lx0 + (lx1 - lx0) / fans / 2, (lx1 - lx0) / fans, fans, g + u * 0.004, fr, STRIPE_RED, STRIPE_WHITE, STRIPE_BLUE);
  // The decking's lip over the fascia: the floor line itself.
  ctx.fillStyle = DECK;
  ctx.fillRect(cx - hw - u * 0.008, g - lw * 0.5, hw * 2 + u * 0.016, lw);
}

// ---------------------------------------------------------------- the barbecue corner

/** Where the corner's things stand (u from the center line) and their feet (u below the floor line). */
const TABLE_X = -0.428;
const TABLE_TOP = 0.1;
const TABLE_HW = 0.054;
const COOLER_X = -0.448;
const COOLER_FOOT = 0.238;
const GRILL_X = -0.352;
const GRILL_FOOT = 0.19;
const GRILL_R = 0.03;
const COOK_X = -0.306;
const COOK_FOOT = 0.15;
const COOK_H = 0.142;
/** The cook flips a burger at FLIP_AT, then every FLIP_EVERY seconds; a flip takes FLIP_TIME. */
export const FLIP_AT = 3;
export const FLIP_EVERY = 7;
export const FLIP_TIME = 0.8;

/** How far into a flip the cook is at scene time t: 0 idle, up to 1 as the patty peaks. */
export function flipAt(t: number): number {
  if (t < FLIP_AT) return 0;
  const k = ((t - FLIP_AT) % FLIP_EVERY) / FLIP_TIME;
  return k >= 1 ? 0 : Math.sin(k * Math.PI);
}

/** A round head with a cap of hair and two dot eyes, keylined (a hat is drawn by the caller). */
export function head(ctx: Ctx, x: number, y: number, r: number, skin: Shades, hair: string, kw: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  outlined(ctx, skin.body, kw, INK);
  // The hair: a cap inside the keyline, its fringe swept to one side.
  const hr = r - kw * 0.5;
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(x - hr * 0.995, y - hr * 0.094);
  ctx.arc(x, y, hr, Math.PI * 1.03, Math.PI * 1.97);
  ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.3, x - hr * 0.995, y - hr * 0.094);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  speck(ctx, x - r * 0.35, y + r * 0.12, r * 0.11);
  speck(ctx, x + r * 0.35, y + r * 0.12, r * 0.11);
  ctx.fill();
}

/** A standing figure, keylined: legs, a shirt lit on its left, arms as banded strokes, a head. `armL`/`armR` are the arms' angles (0 hanging, negative raised forward). */
export function person(ctx: Ctx, s: Scene, x: number, foot: number, h: number, shirt: Shades, trousers: Shades, skin: Shades, hair: string, armL: number, armR: number): void {
  const kw = keyW(s);
  const legH = h * 0.32;
  const torsoH = h * 0.36;
  const headR = h * 0.16;
  const torsoW = h * 0.3;
  // Legs, and shoes.
  ctx.beginPath();
  ctx.moveTo(x - torsoW * 0.24, foot - legH);
  ctx.lineTo(x - torsoW * 0.26, foot - h * 0.03);
  ctx.moveTo(x + torsoW * 0.24, foot - legH);
  ctx.lineTo(x + torsoW * 0.26, foot - h * 0.03);
  inkedLine(ctx, trousers.body, torsoW * 0.36, kw * 0.5, INK);
  ctx.fillStyle = INK;
  ctx.fillRect(x - torsoW * 0.44, foot - h * 0.055, torsoW * 0.3, h * 0.055);
  ctx.fillRect(x + torsoW * 0.14, foot - h * 0.055, torsoW * 0.3, h * 0.055);
  // Torso, lit on its left.
  ctx.beginPath();
  block(ctx, x - torsoW / 2, foot - legH - torsoH, torsoW, torsoH + h * 0.03, h * 0.06);
  outlined(ctx, shirt.body, kw, INK);
  ctx.fillStyle = shirt.light;
  ctx.fillRect(x - torsoW / 2 + kw, foot - legH - torsoH + kw + h * 0.02, torsoW * 0.26, torsoH * 0.5);
  // Arms.
  const sy = foot - legH - torsoH + h * 0.06;
  const armLen = h * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - torsoW * 0.42, sy);
  ctx.lineTo(x - torsoW * 0.42 - Math.sin(armL) * armLen, sy + Math.cos(armL) * armLen);
  ctx.moveTo(x + torsoW * 0.42, sy);
  ctx.lineTo(x + torsoW * 0.42 + Math.sin(armR) * armLen, sy + Math.cos(armR) * armLen);
  inkedLine(ctx, skin.body, h * 0.075, kw * 0.5, INK);
  head(ctx, x, foot - legH - torsoH - headR * 0.85, headR, skin, hair, kw);
}

/** The barbecue corner: the cook at his grill and its smoke, and in front of them the picnic table and what is on it, and the cooler. */
export function barbecue(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);
  const kw = keyW(s);
  // The cook and his grill stand behind the table.
  cookAndGrill(ctx, s, cx, g);

  // The picnic table: legs and a bench under a red-and-white checked cloth.
  const tx = cx + TABLE_X * u;
  const ty = g + TABLE_TOP * u;
  const thw = TABLE_HW * u;
  const th = u * 0.034;
  ctx.beginPath();
  ctx.rect(tx - thw * 0.78, ty + th, u * 0.012, u * 0.07);
  ctx.rect(tx + thw * 0.78 - u * 0.012, ty + th, u * 0.012, u * 0.07);
  ctx.rect(tx - thw * 1.08, ty + th + u * 0.034, thw * 2.16, u * 0.014);
  outlined(ctx, TABLE.body, kw, INK);
  ctx.beginPath();
  ctx.rect(tx - thw, ty, thw * 2, th);
  ctx.fillStyle = CLOTH_WHITE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CLOTH_RED;
  ctx.beginPath();
  const sq = u * 0.0114;
  for (let i = 0; i < Math.ceil((thw * 2) / sq); i++) {
    for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.rect(tx - thw + i * sq, ty + j * sq, sq, sq);
  }
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.rect(tx - thw, ty, thw * 2, th);
  ctx.strokeStyle = INK;
  ctx.lineWidth = kw;
  ctx.stroke();
  // On the table: a watermelon half, a pie, a pitcher of lemonade and a little flag in a jar.
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.84, ty);
  ctx.arc(tx - thw * 0.6, ty, thw * 0.24, Math.PI, 0);
  ctx.closePath();
  outlined(ctx, MELON_RIND, kw, INK);
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.78, ty - u * 0.002);
  ctx.arc(tx - thw * 0.6, ty - u * 0.002, thw * 0.18, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = MELON_FLESH;
  ctx.fill();
  ctx.fillStyle = MELON_SEED;
  ctx.beginPath();
  circle(ctx, tx - thw * 0.67, ty - thw * 0.07, u * 0.0022);
  circle(ctx, tx - thw * 0.55, ty - thw * 0.1, u * 0.0022);
  circle(ctx, tx - thw * 0.6, ty - thw * 0.03, u * 0.0022);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx - thw * 0.12, ty - u * 0.008, thw * 0.24, u * 0.012);
  outlined(ctx, PIE_CRUST.body, kw, INK);
  ctx.beginPath();
  oval(ctx, tx - thw * 0.12, ty - u * 0.01, thw * 0.15, u * 0.006);
  ctx.fillStyle = PIE_FILLING;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx + thw * 0.22, ty);
  ctx.lineTo(tx + thw * 0.24, ty - u * 0.032);
  ctx.lineTo(tx + thw * 0.5, ty - u * 0.032);
  ctx.lineTo(tx + thw * 0.52, ty);
  ctx.closePath();
  outlined(ctx, LEMONADE, kw, INK);
  ctx.fillStyle = CREAM;
  ctx.fillRect(tx + thw * 0.27, ty - u * 0.028, thw * 0.06, u * 0.022);
  ctx.beginPath();
  ctx.rect(tx + thw * 0.66, ty - u * 0.018, u * 0.014, u * 0.018);
  outlined(ctx, JAR, kw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(tx + thw * 0.66 + u * 0.007, ty - u * 0.016);
  ctx.lineTo(tx + thw * 0.66 + u * 0.007, ty - u * 0.05);
  inkedLine(ctx, STICK, u * 0.003, kw * 0.4, INK);
  usFlag(ctx, tx + thw * 0.66 + u * 0.007, ty - u * 0.05, u * 0.034, u * 0.022, 1, u * 0.0015, s.t * 5, FLAG);

  // The cooler: a blue box with a white lid, by the table.
  const kx = cx + COOLER_X * u;
  const ky = g + COOLER_FOOT * u;
  ctx.beginPath();
  block(ctx, kx - u * 0.032, ky - u * 0.042, u * 0.064, u * 0.042, u * 0.004);
  outlined(ctx, COOLER.body, kw, INK);
  ctx.fillStyle = COOLER.light;
  ctx.fillRect(kx - u * 0.028, ky - u * 0.03, u * 0.012, u * 0.022);
  ctx.beginPath();
  block(ctx, kx - u * 0.036, ky - u * 0.054, u * 0.072, u * 0.014, u * 0.003);
  outlined(ctx, STRIPE_WHITE, kw, INK);
}

/** The cook behind his kettle grill, flipping a patty now and then, smoke rising. */
function cookAndGrill(ctx: Ctx, s: Scene, cx: number, g: number): void {
  const u = s.u;
  const kw = keyW(s);
  const flip = flipAt(s.t);
  const x = cx + COOK_X * u;
  const foot = g + COOK_FOOT * u;
  const h = u * COOK_H;
  // The cook: a red shirt under a white apron, a white cap, the spatula in his raised left hand (over the grill).
  const a = 2.0 + flip * 0.8;
  person(ctx, s, x, foot, h, UNIFORM, TROUSERS, SKIN_TAN, HAIR_BROWN, a, 0.15);
  ctx.beginPath();
  ctx.rect(x - h * 0.11, foot - h * 0.62, h * 0.22, h * 0.34);
  outlined(ctx, STRIPE_WHITE, kw * 0.8, INK);
  const capY = foot - h * 1.0;
  ctx.beginPath();
  block(ctx, x - h * 0.15, capY - h * 0.1, h * 0.3, h * 0.11, h * 0.04);
  outlined(ctx, STRIPE_WHITE, kw, INK);
  // The spatula from the raised hand, and the patty it tosses.
  const ax = x - h * 0.126 - Math.sin(a) * h * 0.3;
  const ay = foot - h * 0.62 + Math.cos(a) * h * 0.3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - h * 0.1, ay - h * 0.12);
  inkedLine(ctx, CHROME.shade, h * 0.04, kw * 0.5, INK);
  ctx.beginPath();
  block(ctx, ax - h * 0.2, ay - h * 0.2, h * 0.13, h * 0.08, h * 0.02);
  outlined(ctx, CHROME.body, kw, INK);
  if (flip > 0) {
    ctx.beginPath();
    oval(ctx, ax - h * 0.14, ay - h * 0.26 - flip * h * 0.26, h * 0.08, h * 0.04);
    outlined(ctx, SAUSAGE, kw, INK);
  }
  // The grill in front of him: a kettle on three legs, coals glowing in the bowl, buns on the grate.
  const gx = cx + GRILL_X * u;
  const gy = g + GRILL_FOOT * u;
  const r = u * GRILL_R;
  ctx.beginPath();
  ctx.moveTo(gx - r * 0.6, gy - r * 0.9);
  ctx.lineTo(gx - r * 0.85, gy);
  ctx.moveTo(gx + r * 0.6, gy - r * 0.9);
  ctx.lineTo(gx + r * 0.85, gy);
  ctx.moveTo(gx, gy - r * 0.8);
  ctx.lineTo(gx, gy + u * 0.004);
  inkedLine(ctx, GRILL.light, u * 0.006, kw * 0.5, INK);
  ctx.beginPath();
  ctx.moveTo(gx - r, gy - r * 1.6);
  ctx.arc(gx, gy - r * 1.6, r, 0, Math.PI);
  ctx.closePath();
  outlined(ctx, GRILL.body, kw, INK);
  ctx.fillStyle = GRILL.light;
  ctx.beginPath();
  ctx.moveTo(gx - r * 0.7, gy - r * 1.3);
  ctx.quadraticCurveTo(gx - r * 0.6, gy - r * 0.9, gx - r * 0.2, gy - r * 0.8);
  ctx.lineTo(gx - r * 0.3, gy - r * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx, gy - r * 1.6, r, r * 0.28);
  outlined(ctx, GRILL.light, kw, INK);
  ctx.beginPath();
  oval(ctx, gx, gy - r * 1.6, r * 0.8, r * 0.18);
  ctx.fillStyle = CHARCOAL_GLOW;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx - r * 0.3, gy - r * 1.64, r * 0.24, r * 0.1);
  oval(ctx, gx + r * 0.35, gy - r * 1.64, r * 0.24, r * 0.1);
  outlined(ctx, BUN.body, kw * 0.7, INK);
  // Smoke: puffs rising and fading from the grill, drifting a little left.
  ctx.fillStyle = SMOKE;
  for (let i = 0; i < 4; i++) {
    const k = ((s.t * 0.35 + i * 0.25) % 1 + 1) % 1;
    ctx.globalAlpha = 0.7 * (1 - k) * smooth(0, 0.15, k);
    ctx.beginPath();
    circle(ctx, gx - k * u * 0.03 + Math.sin(s.t * 2 + i) * u * 0.004, gy - r * 2 - k * u * 0.1, u * (0.009 + k * 0.012));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the kids with sparklers

const KID_X = [0.32, 0.436] as const;
const KID_FOOT = 0.16;
const KID_H = 0.112;
const FLAG_X = 0.372;

/** The sparkle's rays: angle and length jitter, re-picked every few frames with the clock; their ink. */
const SPARKS = 10;

/** A sparkler's crackle at its tip (x, y): a bright core, a star, rays of changing length. */
export function sparklerTip(ctx: Ctx, s: Scene, x: number, y: number, r: number, seed: number): void {
  const frame = Math.floor(s.t * 24);
  ctx.strokeStyle = SPARK;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < SPARKS; i++) {
    const a = (i / SPARKS) * Math.PI * 2 + Math.sin(frame * 0.7 + seed + i) * 0.3;
    const len = r * (0.5 + 0.5 * Math.abs(Math.sin(frame * 1.3 + seed * 2 + i * 1.7)));
    ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  sparkle(ctx, x, y, r * 0.55);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  circle(ctx, x, y, r * 0.16);
  ctx.fill();
}

/** Two kids on the right lawn waving sparklers (one swings hers in an arc), a flag planted beside them. */
export function sparklerKids(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);
  const kw = keyW(s);
  const foot = g + KID_FOOT * u;
  const h = u * KID_H;
  // The flag on its stick in the grass between them.
  const fx = cx + FLAG_X * u;
  ctx.beginPath();
  ctx.moveTo(fx, foot + u * 0.008);
  ctx.lineTo(fx, foot - u * 0.082);
  inkedLine(ctx, STICK, u * 0.004, kw * 0.5, INK);
  usFlag(ctx, fx, foot - u * 0.082, u * 0.044, u * 0.029, 1, u * 0.002, s.t * 5 + 1, FLAG);
  // The boy holds his sparkler straight up; the girl swings hers side to side.
  const swing = Math.sin(s.t * 2.2) * 0.8;
  const arms = [
    [0.3, -2.6],
    [0.3, -2.2 - swing],
  ] as const;
  const looks = [
    [KID_SHIRTS[1], SKIN_BROWN, HAIR_DARK],
    [KID_SHIRTS[0], SKIN_FAIR, HAIR_BLONDE],
  ] as const;
  for (let i = 0; i < 2; i++) {
    const x = cx + KID_X[i]! * u;
    const [shirt, skin, hair] = looks[i]!;
    const [al, ar] = arms[i]!;
    person(ctx, s, x, foot, h, shirt, JEANS, skin, hair, al, ar);
    // The sparkler from the raised hand: a wire, the crackle at its tip.
    const sx = x + h * 0.126 + Math.sin(ar) * h * 0.3;
    const sy = foot - h * 0.62 + Math.cos(ar) * h * 0.3;
    const dx = Math.sin(ar) * h * 0.28;
    const dy = Math.cos(ar) * h * 0.28;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx, sy + dy);
    inkedLine(ctx, CHROME.shade, u * 0.003, kw * 0.4, INK);
    sparklerTip(ctx, s, sx + dx, sy + dy, u * 0.024, i * 7);
  }
}

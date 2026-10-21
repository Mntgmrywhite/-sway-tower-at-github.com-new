import { circle, oval, type Ctx } from "../../base/draw";
import { fieldY, layerGround } from "../../base/world";
import type { Scene } from "../skin";
import {
  BUN,
  CHARCOAL_GLOW,
  CHROME,
  CREAM,
  CLOTH_RED,
  CLOTH_WHITE,
  COOLER,
  DECK,
  GOLD,
  GRILL,
  HAIR_BROWN,
  HAIR_DARK,
  HAIR_BLONDE,
  INK,
  JEANS,
  KID_SHIRTS,
  LATTICE_BACK,
  LAWN,
  LAWN_NEAR,
  MELON_FLESH,
  MELON_RIND,
  MELON_SEED,
  PAINT,
  PATH,
  PATH_EDGE,
  PIE_CRUST,
  PIE_FILLING,
  SAUSAGE,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  SMOKE,
  STEP,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TABLE,
  TROUSERS,
  UNIFORM,
  type Shades,
} from "./colors";
import { block, line, smooth, sparkle, swagBand } from "./shapes";
import type { Tone } from "./tone";

// The town square the tower stands in: the lawn from the far side of the square (where Main
// Street stands) down to the street in front, mown in stripes; the white bandstand the bars
// are stacked on (its roof long gone, so you can build it higher): an octagonal deck whose top
// is the tower's floor, bunting swagged along its fascia, a lattice skirt beneath, and three
// steps down the front to a concrete path across the lawn to the sidewalk. On the left, the
// barbecue corner: a picnic table under a red-checked cloth with watermelon, a pie and cups, a
// cooler, and the cook at his kettle grill, flipping burgers (first at 3 s, then every 7: the
// owner's first-ten-seconds rule), a wisp of smoke rising. On the right, two kids with sparklers
// and a little flag planted in the grass. The parade passes in front of all of it (parade.ts).
// Everything here is near, printed flat like the rest of the poster: a lit plane, a body and a
// shaded plane per color and no outlines, and nothing beside the base block rises above its top
// (the slider's first pass sweeps over the lawn).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The line weight up close: the deck's lip (the tower's floor line), and the thin strokes of the props. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
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
/** The steps down the front: width, each riser, how many; the path from their foot. */
const STEP_HW = 0.08;
const STEP_H = 0.028;
const STEPS = 3;
export const STEP_FOOT = FASCIA_H + STEPS * STEP_H;
/** The sidewalk's top edge sits this far above the base band's top (u): the lawn and the path end there. */
export const SIDEWALK_UP = 0.04;
/** The path's half width at the steps and at the sidewalk. */
const PATH_HW_TOP = 0.09;
const PATH_HW_BOTTOM = 0.13;

/** The lawn's top edge (the hills' base). */
export function lawnTop(s: Scene): number {
  return s.horizonY + s.u * 0.03;
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
  ctx.fillStyle = LAWN;
  ctx.fillRect(0, top, s.cssW, s.cssH - top);
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
    if (y0 > s.cssH) continue;
    if (y1 - y0 < 1) break;
    ctx.rect(0, Math.max(top, y0), s.cssW, Math.min(y1, s.cssH) - Math.max(top, y0));
  }
  ctx.fill();
}

/** The square's far edge: a clipped hedge either side of the path's far end, and two lamp posts hung with flower baskets with a string of pennants between them. */
const POST_X = 0.3;
const POST_H = 0.085;
const POST_FOOT = 0.085;
const HEDGE_GAP = 0.11;
const HEDGE_H = 0.024;

/** The hedge: rounded clumps along the lawn's far edge, darker at the foot, leaving the gap for the path. */
export function hedge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = centerX(s);
  const top = lawnTop(s);
  if (top > s.cssH) return;
  const hy = top + u * 0.012;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.treeLit : tone.tree;
    ctx.beginPath();
    for (let x = -u * 0.02; x < s.cssW + u * 0.02; x += u * 0.028) {
      if (Math.abs(x - cx) < HEDGE_GAP * u) continue;
      const r = u * (pass ? 0.012 : 0.016);
      circle(ctx, x + (pass ? -u * 0.004 : 0), hy + HEDGE_H * u * 0.5 - (pass ? u * 0.008 : 0), r);
    }
    if (!pass) {
      ctx.rect(-1, hy + HEDGE_H * u * 0.5, cx - HEDGE_GAP * u + 1, HEDGE_H * u * 0.6);
      ctx.rect(cx + HEDGE_GAP * u, hy + HEDGE_H * u * 0.5, s.cssW, HEDGE_H * u * 0.6);
    }
    ctx.fill();
  }
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

/** The bandstand's deck, printed flat: the fascia with its bunting, the lattice skirt, the steps, its shadow on the lawn. */
export function bandstand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
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
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx0, fasciaBottom, lx1 - lx0, foot - fasciaBottom);
  ctx.clip();
  ctx.strokeStyle = PAINT.body;
  ctx.lineWidth = Math.max(1.5, u * 0.007);
  ctx.beginPath();
  const pitch = u * 0.04;
  for (let x = lx0 - (foot - fasciaBottom); x < lx1 + pitch; x += pitch) {
    ctx.moveTo(x, foot);
    ctx.lineTo(x + (foot - fasciaBottom), fasciaBottom);
    ctx.moveTo(x, fasciaBottom);
    ctx.lineTo(x + (foot - fasciaBottom), foot);
  }
  ctx.stroke();
  ctx.restore();
  // The end faces of the skirt, angled away: shaded panels.
  ctx.fillStyle = PAINT.shade;
  ctx.beginPath();
  ctx.rect(cx - hw, fasciaBottom, ef, foot - fasciaBottom);
  ctx.rect(lx1, fasciaBottom, ef, foot - fasciaBottom);
  ctx.fill();
  // The sill board along the skirt's foot.
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, foot - u * 0.012, hw * 2 + u * 0.012, u * 0.016, u * 0.003);
  ctx.fillStyle = PAINT.shade;
  ctx.fill();

  // The steps down the front: treads lit, risers shaded, widening a little toward you.
  for (let i = 0; i < STEPS; i++) {
    const y = fasciaBottom + i * STEP_H * u;
    const shw = (STEP_HW + i * 0.012) * u;
    ctx.beginPath();
    ctx.rect(cx - shw, y, shw * 2, STEP_H * u);
    ctx.fillStyle = STEP.shade;
    ctx.fill();
    ctx.fillStyle = STEP.light;
    ctx.fillRect(cx - shw, y, shw * 2, STEP_H * u * 0.4);
  }

  // The fascia: the deck's edge, three faces (the ends angled away, so shaded), under a lip of decking.
  ctx.beginPath();
  ctx.rect(cx - hw, g, hw * 2, FASCIA_H * u);
  ctx.fillStyle = PAINT.body;
  ctx.fill();
  ctx.fillStyle = PAINT.shade;
  ctx.fillRect(cx - hw, g, ef, FASCIA_H * u);
  ctx.fillRect(lx1, g, ef, FASCIA_H * u);
  ctx.fillStyle = PAINT.light;
  ctx.fillRect(lx0, g, lx1 - lx0, u * 0.008);
  // Bunting swagged along the fascia: red, white and blue pleats hung from its top edge.
  const swags = 5;
  const y = g + u * 0.006;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? STRIPE_RED : band === 1 ? STRIPE_WHITE : STRIPE_BLUE;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) swagBand(ctx, lx0 + ((lx1 - lx0) * i) / swags, lx0 + ((lx1 - lx0) * (i + 1)) / swags, y, u * 0.022, band, 3);
    ctx.fill();
  }
  ctx.fillStyle = STRIPE_BLUE;
  ctx.beginPath();
  for (let i = 0; i <= swags; i++) circle(ctx, lx0 + ((lx1 - lx0) * i) / swags, y, u * 0.006);
  ctx.fill();
  // The decking's lip over the fascia: the floor line itself.
  ctx.fillStyle = DECK;
  ctx.fillRect(cx - hw - u * 0.008, g - lw * 0.5, hw * 2 + u * 0.016, lw);
}

// ---------------------------------------------------------------- the barbecue corner

/** Where the corner's things stand (u from the center line) and their feet (u below the floor line). */
const TABLE_X = -0.425;
const TABLE_TOP = 0.07;
const TABLE_HW = 0.05;
const COOLER_X = -0.44;
const COOLER_FOOT = 0.2;
const GRILL_X = -0.325;
const GRILL_FOOT = 0.15;
const GRILL_R = 0.028;
const COOK_X = -0.295;
const COOK_FOOT = 0.132;
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

/** A round head with a cap of hair and two dot eyes (a hat is drawn by the caller). */
export function head(ctx: Ctx, x: number, y: number, r: number, skin: Shades, hair: string): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = skin.body;
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.1);
  ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x - r * 0.35, y + r * 0.1, r * 0.11);
  circle(ctx, x + r * 0.35, y + r * 0.1, r * 0.11);
  ctx.fill();
}

/** A small standing figure: legs, a shirt lit on its left, arms as flat bands, a head. `armL`/`armR` are the arms' angles (0 hanging, negative raised forward). */
export function person(ctx: Ctx, s: Scene, x: number, foot: number, h: number, shirt: Shades, trousers: Shades, skin: Shades, hair: string, armL: number, armR: number): void {
  const u = s.u;
  const lw = inkW(s) * 0.85;
  const legH = h * 0.32;
  const torsoH = h * 0.36;
  const headR = h * 0.16;
  const torsoW = h * 0.3;
  // Legs
  ctx.beginPath();
  ctx.rect(x - torsoW * 0.45, foot - legH, torsoW * 0.4, legH);
  ctx.rect(x + torsoW * 0.05, foot - legH, torsoW * 0.4, legH);
  ctx.fillStyle = trousers.body;
  ctx.fill();
  // Torso
  ctx.beginPath();
  block(ctx, x - torsoW / 2, foot - legH - torsoH, torsoW, torsoH + u * 0.004, u * 0.008);
  ctx.fillStyle = shirt.body;
  ctx.fill();
  ctx.fillStyle = shirt.light;
  ctx.fillRect(x - torsoW / 2 + lw, foot - legH - torsoH + lw, torsoW * 0.3, torsoH * 0.5);
  // Arms
  const sy = foot - legH - torsoH + h * 0.06;
  const armLen = h * 0.3;
  for (const [side, a] of [
    [-1, armL],
    [1, armR],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + side * torsoW * 0.45, sy);
    ctx.lineTo(x + side * torsoW * 0.45 + Math.sin(a) * armLen * side, sy + Math.cos(a) * armLen);
    line(ctx, skin.body, h * 0.075);
  }
  head(ctx, x, foot - legH - torsoH - headR * 0.9, headR, skin, hair);
}

/** The barbecue corner: the picnic table and what is on it, the cooler, the cook at his grill and its smoke. */
export function barbecue(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);

  // The picnic table: a red-and-white checked cloth over the top, bench and legs under it.
  const tx = cx + TABLE_X * u;
  const ty = g + TABLE_TOP * u;
  const thw = TABLE_HW * u;
  const th = u * 0.03;
  ctx.beginPath();
  ctx.rect(tx - thw * 0.75, ty + th, u * 0.012, u * 0.06);
  ctx.rect(tx + thw * 0.75 - u * 0.012, ty + th, u * 0.012, u * 0.06);
  ctx.rect(tx - thw * 1.05, ty + th + u * 0.03, thw * 2.1, u * 0.014);
  ctx.fillStyle = TABLE.body;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(tx - thw, ty, thw * 2, th);
  ctx.fillStyle = CLOTH_WHITE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CLOTH_RED;
  ctx.beginPath();
  const sq = u * 0.012;
  for (let i = 0; i < Math.ceil((thw * 2) / sq); i++) {
    for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.rect(tx - thw + i * sq, ty + j * sq, sq, sq);
  }
  ctx.fill();
  ctx.restore();
  // On the table: a watermelon half on the left, a pie in the middle, two cups and a hot dog on the right.
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.78, ty);
  ctx.arc(tx - thw * 0.55, ty, thw * 0.23, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = MELON_RIND;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.73, ty - u * 0.002);
  ctx.arc(tx - thw * 0.55, ty - u * 0.002, thw * 0.18, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = MELON_FLESH;
  ctx.fill();
  ctx.fillStyle = MELON_SEED;
  ctx.beginPath();
  circle(ctx, tx - thw * 0.62, ty - thw * 0.07, u * 0.0022);
  circle(ctx, tx - thw * 0.5, ty - thw * 0.1, u * 0.0022);
  circle(ctx, tx - thw * 0.55, ty - thw * 0.03, u * 0.0022);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx - thw * 0.05, ty - u * 0.008, thw * 0.24, u * 0.012);
  ctx.fillStyle = PIE_CRUST.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx - thw * 0.05, ty - u * 0.01, thw * 0.15, u * 0.006);
  ctx.fillStyle = PIE_FILLING;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 2; i++) ctx.rect(tx + thw * (0.45 + i * 0.3) - u * 0.008, ty - u * 0.02, u * 0.016, u * 0.022);
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fill();
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fillRect(tx + thw * 0.45 - u * 0.006, ty - u * 0.017, u * 0.012, u * 0.006);
  ctx.fillRect(tx + thw * 0.75 - u * 0.006, ty - u * 0.017, u * 0.012, u * 0.006);

  // The cooler: a blue box with a white lid, by the table.
  const kx = cx + COOLER_X * u;
  const ky = g + COOLER_FOOT * u;
  ctx.beginPath();
  block(ctx, kx - u * 0.03, ky - u * 0.04, u * 0.06, u * 0.04, u * 0.004);
  ctx.fillStyle = COOLER.body;
  ctx.fill();
  ctx.fillStyle = COOLER.shade;
  ctx.fillRect(kx - u * 0.03, ky - u * 0.012, u * 0.06, u * 0.012);
  ctx.beginPath();
  block(ctx, kx - u * 0.033, ky - u * 0.05, u * 0.066, u * 0.012, u * 0.003);
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fill();

  cookAndGrill(ctx, s, cx, g);
}

/** The cook behind his kettle grill, flipping a patty now and then, smoke rising. */
function cookAndGrill(ctx: Ctx, s: Scene, cx: number, g: number): void {
  const u = s.u;
  const flip = flipAt(s.t);
  const x = cx + COOK_X * u;
  const foot = g + COOK_FOOT * u;
  const h = u * 0.125;
  // The cook: an apron over a red shirt, a white cap, the spatula in his raised left hand (over the grill).
  const a = 2.0 + flip * 0.8;
  person(ctx, s, x, foot, h, UNIFORM, TROUSERS, SKIN_TAN, HAIR_BROWN, a, 0.15);
  ctx.beginPath();
  ctx.rect(x - h * 0.11, foot - h * 0.6, h * 0.22, h * 0.34);
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fill();
  ctx.beginPath();
  block(ctx, x - h * 0.17, foot - h * 1.02 - h * 0.06, h * 0.34, h * 0.1, h * 0.03);
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fill();
  // The spatula from the raised hand, and the patty it tosses.
  const ax = x - h * 0.135 - Math.sin(a) * h * 0.3;
  const ay = foot - h * 0.62 + Math.cos(a) * h * 0.3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - h * 0.12, ay - h * 0.16);
  line(ctx, CHROME.shade, h * 0.05);
  ctx.beginPath();
  block(ctx, ax - h * 0.26, ay - h * 0.26, h * 0.16, h * 0.1, h * 0.02);
  ctx.fillStyle = CHROME.body;
  ctx.fill();
  if (flip > 0) {
    ctx.beginPath();
    oval(ctx, ax - h * 0.18, ay - h * 0.3 - flip * h * 0.35, h * 0.09, h * 0.045);
    ctx.fillStyle = SAUSAGE;
    ctx.fill();
  }
  // The grill in front of him: a kettle on three legs, coals glowing in the bowl, the lid leaning beside.
  const gx = cx + GRILL_X * u;
  const gy = g + GRILL_FOOT * u;
  const r = u * GRILL_R;
  ctx.beginPath();
  ctx.moveTo(gx - r * 0.6, gy - r * 0.9);
  ctx.lineTo(gx - r * 0.8, gy);
  ctx.moveTo(gx + r * 0.6, gy - r * 0.9);
  ctx.lineTo(gx + r * 0.8, gy);
  ctx.moveTo(gx, gy - r * 0.8);
  ctx.lineTo(gx, gy + u * 0.004);
  line(ctx, GRILL.light, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(gx - r, gy - r * 1.6);
  ctx.arc(gx, gy - r * 1.6, r, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = GRILL.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx, gy - r * 1.6, r, r * 0.28);
  ctx.fillStyle = GRILL.light;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx, gy - r * 1.6, r * 0.8, r * 0.18);
  ctx.fillStyle = CHARCOAL_GLOW;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx - r * 0.3, gy - r * 1.62, r * 0.22, r * 0.09);
  oval(ctx, gx + r * 0.35, gy - r * 1.62, r * 0.22, r * 0.09);
  ctx.fillStyle = BUN.body;
  ctx.fill();
  // Smoke: puffs rising and fading from the grill, drifting a little left.
  ctx.fillStyle = SMOKE;
  for (let i = 0; i < 4; i++) {
    const k = ((s.t * 0.35 + i * 0.25) % 1 + 1) % 1;
    ctx.globalAlpha = 0.7 * (1 - k) * smooth(0, 0.15, k);
    ctx.beginPath();
    circle(ctx, gx - k * u * 0.025 + Math.sin(s.t * 2 + i) * u * 0.004, gy - r * 2 - k * u * 0.11, u * (0.008 + k * 0.012));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the kids with sparklers

const KID_X = [0.31, 0.43] as const;
const KID_FOOT = 0.14;
const FLAG_X = 0.37;

/** The sparkle's rays: angle and length jitter, re-picked every few frames with the clock; their ink. */
const SPARKS = 10;
const SPARK = "#fff1c4";

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

/** Two kids on the right lawn waving sparklers (one swings hers in an arc), a little flag planted beside them. */
export function sparklerKids(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);
  const foot = g + KID_FOOT * u;
  const h = u * 0.09;
  // The little flag on its stick in the grass between them.
  const fx = cx + FLAG_X * u;
  ctx.beginPath();
  ctx.moveTo(fx, foot + u * 0.01);
  ctx.lineTo(fx, foot - u * 0.065);
  line(ctx, STRIPE_WHITE, u * 0.004);
  ctx.beginPath();
  ctx.rect(fx, foot - u * 0.065, u * 0.03, u * 0.02);
  ctx.fillStyle = STRIPE_RED;
  ctx.fill();
  ctx.fillStyle = STRIPE_WHITE;
  ctx.fillRect(fx, foot - u * 0.058, u * 0.03, u * 0.004);
  ctx.fillRect(fx, foot - u * 0.05, u * 0.03, u * 0.004);
  ctx.fillStyle = STRIPE_BLUE;
  ctx.fillRect(fx, foot - u * 0.065, u * 0.013, u * 0.011);
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
    const sx = x + h * 0.15 + Math.sin(ar) * h * 0.3;
    const sy = foot - h * 0.62 + Math.cos(ar) * h * 0.3;
    const dx = Math.sin(ar) * h * 0.28;
    const dy = Math.cos(ar) * h * 0.28;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx, sy + dy);
    line(ctx, CHROME.shade, u * 0.003);
    sparklerTip(ctx, s, sx + dx, sy + dy, u * 0.022, i * 7);
  }
}

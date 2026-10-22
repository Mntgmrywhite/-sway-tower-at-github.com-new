import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BUN,
  BUTTER_DRESS,
  CHARCOAL_GLOW,
  CHROME,
  CLOTH_RED,
  CLOTH_WHITE,
  COOK_SHIRT,
  COOLER,
  CREAM,
  DARK_BROWN,
  DENIM,
  FLAG,
  GOLD,
  GRILL,
  HAIR_AUBURN,
  HAIR_BLONDE,
  HAIR_BROWN,
  HAIR_CHESTNUT,
  HAIR_DARK,
  INK,
  JAR,
  JEANS,
  KHAKI,
  KID_SHIRTS,
  LEMONADE,
  MARIGOLD,
  MELON_FLESH,
  MELON_RIND,
  MELON_SEED,
  MINT_DRESS,
  NAVY,
  PIE_CRUST,
  PIE_FILLING,
  RED,
  ROSE_DRESS,
  SAUSAGE,
  SHIRT_WHITE,
  SKIN_BROWN,
  SKIN_FAIR,
  SKIN_TAN,
  SLACKS,
  SMOKE,
  SPARK,
  SPARK_TRAIL,
  STICK,
  STRAW,
  STRIPE_WHITE,
  TABLE,
  shades,
} from "./colors";
import { usFlag } from "./flag";
import { figure, type Frame, type Look } from "./folk";
import { looseAt } from "./front";
import { apron, boater, inked, sunHat, toque } from "./hats";
import { breeze } from "./life";
import { nearestUnit } from "./parade";
import { armTo, blinkAt, build, CHILD, ease, fract, glance, hop, J, pose, scaled, sit, stand, wave, type Build } from "./rig";
import { block, smooth, sparkle } from "./shapes";
import { centerX, keyW } from "./square";

// The townsfolk on the square and the picnic lawn (the parade is parade.ts, the crowd along Main
// Street crowd.ts): the barbecue corner on the left, where the cook flips burgers at his kettle
// grill (first at 3 s, then every 7: the owner's first-ten-seconds rule), watching each patty up
// and down, and between flips waves his spatula at the parade; on the right two kids with
// sparklers, hopping, one writing circles in the air, the other swinging hers in loops that leave
// a trail of light, and when a balloon slips free from the lemonade stand the girl jumps for it
// and watches it go; a flag planted in the grass beside them. On the picnic lawn in front: a
// family (dad in the lawn chair clapping the band, mom on the gingham blanket in her sun hat
// waving a little flag, their little girl bouncing on the blanket waving hers), and the girl who
// keeps the lemonade stand, pouring a glass every few seconds and waving to the passers-by.
//
// Everyone is a storybook figure on the rig (rig.ts, folk.ts), on their own timing. The square's
// cast stands on the lawn beside the bandstand, below the tower's floor line, and nothing rises
// above the base block's top; the picnic's stays below the sidewalk's top, out of the parade.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The scratch pose every figure here is posed in, in turn. */
const P = pose();

/** Resets the face and the loose things before a figure is posed. */
function fresh(t: number, id: number): void {
  P.tilt = 0;
  P.mouth = 0;
  P.puff = 0;
  P.brow = 0;
  P.blink = blinkAt(t, id);
  P.lagX = 0;
  P.lagY = 0;
  P.wind = breeze(t);
}

/** The line round the square's cast (px). */
function lineOf(s: Scene): number {
  return keyW(s) * 0.9;
}

/** A point of a figure's body space on the screen (its ground point at x, y; k px a u; facing dir; seen from `view`). */
function onScreen(x: number, y: number, k: number, dir: 1 | -1, view: number, l: number, f: number, h: number): readonly [number, number] {
  return [x + dir * k * (l * Math.cos(view) + f * Math.sin(view)), y + k * h];
}

/** How excited a spectator is about the parade at screen x: 1 as a unit passes close by, easing off with distance. */
function excitement(s: Scene, x: number): number {
  const d = Math.abs(nearestUnit(s, x, s.t));
  return 1 - smooth(0.12, 0.5, d);
}

// ---------------------------------------------------------------- the barbecue corner

/** Where the corner's things stand (u from the center line) and their feet (u below the floor line). */
const TABLE_X = -0.44;
const TABLE_TOP = 0.1;
const TABLE_HW = 0.05;
const COOLER_X = -0.452;
const COOLER_FOOT = 0.238;
const GRILL_X = -0.357;
const GRILL_FOOT = 0.17;
const GRILL_R = 0.027;
/** The grate stands this many bowl radii over the grill's feet: about the cook's waist. */
const GRILL_UP = 2.6;
const COOK_X = -0.308;
const COOK_FOOT = 0.16;
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

/** Where in its flip the cook is (0..1 through FLIP_TIME), and a little before (the wind-up) and after (the landing): -1 outside. */
function flipPhase(t: number): number {
  if (t < FLIP_AT - 0.35) return -1;
  const k = (((t - FLIP_AT + 0.35) % FLIP_EVERY) + FLIP_EVERY) % FLIP_EVERY;
  return k < FLIP_TIME + 0.75 ? (k - 0.35) / FLIP_TIME : -1;
}

const COOK_BUILD = scaled(build({ belly: 0.0075, waistW: 0.0142, hipW: 0.0148, chestW: 0.0156, depth: 0.0134, head: 0.0162 }), 0.95);
const COOK_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_BROWN, style: "crop", top: shades(COOK_SHIRT, 0.4, 0.28), sleeves: "short", lower: shades(SLACKS, 0.4, 0.3), legs: "trousers", shoes: DARK_BROWN, mustache: true };
const COOK_VIEW = Math.PI * 0.3;

/** The barbecue corner: the cook at his grill and its smoke, and in front of them the picnic table and what is on it, and the cooler. */
export function barbecue(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);
  const kw = keyW(s);
  // The cook stands behind his grill.
  cook(ctx, s, cx, g);
  grill(ctx, s, cx, g, kw);
  // The picnic table: legs and a bench under a red-and-white checked cloth.
  const tx = cx + TABLE_X * u;
  const ty = g + TABLE_TOP * u;
  const thw = TABLE_HW * u;
  const th = u * 0.034;
  ctx.beginPath();
  ctx.rect(tx - thw * 0.78, ty + th, u * 0.012, u * 0.07);
  ctx.rect(tx + thw * 0.78 - u * 0.012, ty + th, u * 0.012, u * 0.07);
  ctx.rect(tx - thw * 1.08, ty + th + u * 0.034, thw * 2.16, u * 0.014);
  inked(ctx, TABLE.body, kw);
  ctx.fillStyle = CLOTH_WHITE;
  ctx.fillRect(tx - thw, ty, thw * 2, th);
  ctx.fillStyle = CLOTH_RED;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  const sq = u * 0.0114;
  const cols = Math.floor((thw * 2) / sq);
  const edge = (thw * 2 - cols * sq) / 2;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.rect(tx - thw + edge + i * sq, ty + j * sq, sq, Math.min(sq, th - j * sq));
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.rect(tx - thw, ty, thw * 2, th);
  ctx.lineWidth = kw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // On the table: a watermelon half, a pie, a pitcher of lemonade and a little flag in a jar.
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.84, ty);
  ctx.arc(tx - thw * 0.6, ty, thw * 0.24, Math.PI, 0);
  ctx.closePath();
  inked(ctx, MELON_RIND, 0);
  ctx.beginPath();
  ctx.moveTo(tx - thw * 0.78, ty - u * 0.002);
  ctx.arc(tx - thw * 0.6, ty - u * 0.002, thw * 0.18, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = MELON_FLESH;
  ctx.fill();
  ctx.fillStyle = MELON_SEED;
  ctx.beginPath();
  for (const [dx, dy] of [
    [-0.07, -0.07],
    [0.05, -0.1],
    [0, -0.03],
  ] as const) ctx.rect(tx - thw * (0.6 - dx) - u * 0.0018, ty + thw * dy - u * 0.0018, u * 0.0036, u * 0.0036);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, tx - thw * 0.12, ty - u * 0.008, thw * 0.24, u * 0.012);
  inked(ctx, PIE_CRUST.body, 0);
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
  inked(ctx, LEMONADE, 0);
  ctx.fillStyle = CREAM;
  ctx.fillRect(tx + thw * 0.27, ty - u * 0.028, thw * 0.06, u * 0.022);
  ctx.beginPath();
  ctx.rect(tx + thw * 0.66, ty - u * 0.018, u * 0.014, u * 0.018);
  inked(ctx, JAR, 0);
  ctx.beginPath();
  ctx.moveTo(tx + thw * 0.66 + u * 0.007, ty - u * 0.016);
  ctx.lineTo(tx + thw * 0.66 + u * 0.007, ty - u * 0.05);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.003 + kw * 0.8;
  ctx.stroke();
  ctx.strokeStyle = STICK;
  ctx.lineWidth = u * 0.003;
  ctx.stroke();
  usFlag(ctx, tx + thw * 0.66 + u * 0.007, ty - u * 0.05, u * 0.034, u * 0.022, 1, u * 0.0015 * (1 + breeze(s.t)), s.t * 5, FLAG);
  // The cooler: a blue box with a white lid, by the table.
  const kx = cx + COOLER_X * u;
  const ky = g + COOLER_FOOT * u;
  ctx.beginPath();
  block(ctx, kx - u * 0.032, ky - u * 0.042, u * 0.064, u * 0.042, u * 0.004);
  inked(ctx, COOLER.body, kw);
  ctx.fillStyle = COOLER.light;
  ctx.fillRect(kx - u * 0.028, ky - u * 0.03, u * 0.012, u * 0.022);
  ctx.beginPath();
  block(ctx, kx - u * 0.036, ky - u * 0.054, u * 0.072, u * 0.014, u * 0.003);
  inked(ctx, STRIPE_WHITE, kw);
}

/** The patty's place over the grill at a flip's phase k (0..1): up off the spatula and turning over, back down onto the grate. */
function pattyAt(gx: number, top: number, u: number, k: number): readonly [number, number, number] {
  const e = Math.max(0, Math.min(1, k));
  const h = 4 * e * (1 - e);
  return [gx + u * 0.004 - e * u * 0.008, top - u * 0.012 - h * u * 0.075, e * Math.PI * 2];
}

/** The cook behind his grill: a pink shirt under a cream apron, his toque; the spatula in his hand over the grill. Now and then he flips a patty high, watching it up and down; between flips he hums, glances about and waves his spatula at the parade. */
function cook(ctx: Ctx, s: Scene, cx: number, g: number): void {
  const u = s.u;
  const t = s.t;
  const b = COOK_BUILD;
  const x = cx + COOK_X * u;
  const foot = g + COOK_FOOT * u;
  const gx = cx + GRILL_X * u;
  const top = g + GRILL_FOOT * u - GRILL_R * u * GRILL_UP;
  fresh(t, 101);
  P.view = COOK_VIEW;
  stand(P, b, t, 0.3, 0.005, 5.2);
  const k = flipPhase(t);
  // The grill's grate in his body space (he faces left: screen x grows to his back).
  const dir = -1 as const;
  const toBody = (sx: number, sy: number) => [0, (dir * (sx - x)) / u / Math.sin(P.view), (sy - foot) / u] as const;
  const cl = P.j[J.chest * 3]!;
  const cy = P.j[J.chest * 3 + 2]!;
  let [, hf, hy] = toBody(gx, top - u * 0.008);
  let wind = 0;
  if (k >= -0.45 && k <= 1.9) {
    // The wind-up: the spatula slides under; the flick: up; the catch: down again as it lands.
    const dip = k < 0 ? ease((k + 0.45) / 0.45) : 1 - ease(k / 0.18);
    const flick = k >= 0 && k < 0.35 ? Math.sin((k / 0.35) * Math.PI) : 0;
    hy += dip * 0.006 - flick * 0.04;
    hf += flick * 0.01;
    wind = flick;
    // He bobs with the flick and follows the patty with his eyes, brows up, an "o" then a grin.
    const [, py] = pattyAt(gx, top, u, k);
    P.face = COOK_VIEW + 0.2;
    P.tilt = dir * (-0.25 * Math.max(0, Math.min(1, (foot - py) / u - 0.08) * 6) * (k > 0 && k < 1 ? 1 : 0));
    P.brow = k > 0 && k < 1 ? 0.9 : 0.3;
    P.mouth = k > 0.2 && k < 0.85 ? 0.55 : k >= 0.85 ? 0.8 : 0.2;
  } else {
    // Between flips: humming at the grill, a glance at the parade now and then, a wave of the spatula when it is near.
    const ex = excitement(s, x);
    P.face = COOK_VIEW + glance(t, 101, -0.15, 0.35) - ex * 0.6;
    P.mouth = 0.15 + ex * 0.5;
    P.brow = ex * 0.5;
    const waveK = ex > 0.6 ? Math.sin(t * 9) * 0.5 + 0.5 : 0;
    hy -= waveK * 0.02 * ex;
    hf -= waveK * 0.006 * ex;
  }
  // The spatula hand over the grill (his far hand: in front of him), the other on his hip.
  armTo(P, b, false, cl + 0.006, hf, hy, 0.4, -0.6, 0.8);
  armTo(P, b, true, P.j[J.hipN * 3]! - 0.01, P.j[J.hipN * 3 + 1]! - 0.002, P.j[J.pelvis * 3 + 2]! - 0.004, -1, -0.3, 0);
  void cy;
  P.j[J.pelvis * 3 + 2] = P.j[J.pelvis * 3 + 2]! + wind * 0.002;
  const kw = lineOf(s);
  figure(ctx, P, b, COOK_LOOK, x, foot, u, dir, kw, { lod: 2, farFront: true }, {
    body: (c, F) => apron(c, F, CREAM, kw),
    hat: (c, F) => toque(c, F, P, Math.sin(t * 2.3) * 0.5 + wind),
    front: (c, F) => spatula(c, F, u, kw, k, gx, top),
  });
}

/** The spatula from the cook's hand, its blade under the patty; the patty, up in the air when it is flipped. */
function spatula(ctx: Ctx, F: Frame, u: number, kw: number, k: number, gx: number, top: number): void {
  const hx = F.x[J.handF]!;
  const hy = F.y[J.handF]!;
  const bx = hx - u * 0.016;
  const by = hy + u * 0.006;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.003 + kw;
  ctx.stroke();
  ctx.strokeStyle = CHROME.shade;
  ctx.lineWidth = u * 0.003;
  ctx.stroke();
  ctx.beginPath();
  block(ctx, bx - u * 0.011, by - u * 0.002, u * 0.012, u * 0.006, u * 0.0015);
  inked(ctx, CHROME.body, kw * 0.8);
  if (k > 0 && k < 1) {
    const [px, py, turn] = pattyAt(gx, top, u, k);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(turn);
    ctx.beginPath();
    oval(ctx, 0, 0, u * 0.0085, u * 0.0042);
    inked(ctx, SAUSAGE, kw * 0.8);
    ctx.restore();
  }
}

/** The kettle grill: three legs, a round bowl, coals glowing, buns and patties on the grate, smoke rising (a puff as a patty lands). */
function grill(ctx: Ctx, s: Scene, cx: number, g: number, kw: number): void {
  const u = s.u;
  const gx = cx + GRILL_X * u;
  const gy = g + GRILL_FOOT * u;
  const r = u * GRILL_R;
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.006 + kw;
  ctx.beginPath();
  ctx.moveTo(gx - r * 0.6, gy - r * 1.8);
  ctx.lineTo(gx - r * 0.9, gy);
  ctx.moveTo(gx + r * 0.6, gy - r * 1.8);
  ctx.lineTo(gx + r * 0.9, gy);
  ctx.moveTo(gx, gy - r * 1.7);
  ctx.lineTo(gx, gy + u * 0.004);
  ctx.stroke();
  ctx.strokeStyle = GRILL.light;
  ctx.lineWidth = u * 0.006;
  ctx.stroke();
  const by = gy - GRILL_UP * r;
  ctx.beginPath();
  ctx.moveTo(gx - r, by);
  ctx.arc(gx, by, r, 0, Math.PI);
  ctx.closePath();
  inked(ctx, GRILL.body, kw);
  ctx.fillStyle = GRILL.light;
  ctx.beginPath();
  ctx.moveTo(gx - r * 0.75, by + r * 0.3);
  ctx.quadraticCurveTo(gx - r * 0.6, by + r * 0.75, gx - r * 0.15, by + r * 0.85);
  ctx.lineTo(gx - r * 0.25, by + r * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  oval(ctx, gx, by, r, r * 0.28);
  inked(ctx, GRILL.light, kw);
  ctx.beginPath();
  oval(ctx, gx, by, r * 0.8, r * 0.18);
  ctx.fillStyle = CHARCOAL_GLOW;
  ctx.fill();
  const k = flipPhase(s.t);
  ctx.beginPath();
  oval(ctx, gx - r * 0.42, by - r * 0.04, r * 0.24, r * 0.1);
  oval(ctx, gx + r * 0.42, by - r * 0.04, r * 0.24, r * 0.1);
  inked(ctx, BUN.body, 0);
  if (k < 0 || k >= 1) {
    ctx.beginPath();
    oval(ctx, gx + u * 0.004, by - u * 0.004, u * 0.0085, u * 0.0042);
    inked(ctx, SAUSAGE, 0);
  }
  // Smoke: puffs rising and fading from the grill, drifting a little left; a bigger one as a patty lands.
  const land = k >= 0.95 && k < 1.6 ? 1 - (k - 0.95) / 0.65 : 0;
  ctx.fillStyle = SMOKE;
  for (let i = 0; i < 4; i++) {
    const q = fract(s.t * 0.35 + i * 0.25);
    ctx.globalAlpha = 0.7 * (1 - q) * smooth(0, 0.15, q);
    ctx.beginPath();
    circle(ctx, gx - q * u * 0.03 + Math.sin(s.t * 2 + i) * u * 0.004 - breeze(s.t) * q * u * 0.02, by - r * 0.4 - q * u * 0.09, u * (0.008 + q * 0.011) * (1 + land * 0.5));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the kids with sparklers

const KID_X = [0.32, 0.436] as const;
const KID_FOOT = 0.16;
const FLAG_X = 0.372;
const KIDS: { build: Build; look: Look; dir: 1 | -1; rate: number; seed: number }[] = [
  {
    build: scaled(build({ head: 0.0148 }, CHILD), 1.0),
    look: { skin: SKIN_BROWN, hair: HAIR_DARK, style: "curls", top: KID_SHIRTS[1], sleeves: "short", lower: JEANS, legs: "shorts", hem: 0.7, shoes: DARK_BROWN },
    dir: 1,
    rate: 1.8,
    seed: 0.2,
  },
  {
    build: scaled(CHILD, 0.97),
    look: { skin: SKIN_FAIR, hair: HAIR_BLONDE, style: "pigtails", ribbon: RED, top: KID_SHIRTS[0], sleeves: "short", lower: shades(DENIM), legs: "skirt", hem: 0.42, shoes: RED },
    dir: -1,
    rate: 2.15,
    seed: 0.65,
  },
];

/** A sparkler's crackle at its tip (x, y): a bright core, a star, rays of changing length. */
export function sparklerTip(ctx: Ctx, s: Scene, x: number, y: number, r: number, seed: number): void {
  const frame = Math.floor(s.t * 24);
  ctx.strokeStyle = SPARK;
  ctx.lineWidth = Math.max(1, s.u * 0.0022);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.sin(frame * 0.7 + seed + i) * 0.35;
    const len = r * (0.45 + 0.55 * Math.abs(Math.sin(frame * 1.3 + seed * 2 + i * 1.7)));
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

/** Where the kid's sparkler hand goes at time t (body space): the boy writes circles up high, the girl swings big loops. */
function sparkHand(i: number, b: Build, cl: number, cf: number, cy: number, t: number): readonly [number, number, number] {
  if (i === 0) {
    const a = t * 2.6 * Math.PI;
    return [cl - 0.004 + Math.cos(a) * 0.006, cf + 0.012 + Math.sin(a) * 0.004, cy - b.upper * 0.9 - 0.006 + Math.sin(a) * 0.006];
  }
  // A figure eight out in front, up and down.
  const a = t * 1.7 * Math.PI;
  return [cl + 0.012, cf + 0.016 + Math.sin(a) * 0.012, cy - 0.004 + Math.sin(a * 2) * 0.012];
}

/** Two kids on the right lawn with sparklers that never burn out, hopping about, a flag planted beside them; the girl jumps for the balloon that slips free. */
export function sparklerKids(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g > s.cssH) return;
  const cx = centerX(s);
  const kw = lineOf(s);
  const foot = g + KID_FOOT * u;
  const t = s.t;
  // The flag on its stick in the grass between them.
  const fx = cx + FLAG_X * u;
  ctx.beginPath();
  ctx.moveTo(fx, foot + u * 0.008);
  ctx.lineTo(fx, foot - u * 0.082);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.004 + kw;
  ctx.stroke();
  ctx.strokeStyle = STICK;
  ctx.lineWidth = u * 0.004;
  ctx.stroke();
  usFlag(ctx, fx, foot - u * 0.082, u * 0.044, u * 0.029, 1, u * 0.002 * (1 + breeze(t)), t * 5 + 1, FLAG);
  // The balloon on its way, if one is: the girl turns to it and jumps for it.
  const ball = looseAt(s);
  for (let i = 0; i < 2; i++) {
    const kid = KIDS[i]!;
    const b = kid.build;
    const x = cx + KID_X[i]! * u;
    fresh(t, 200 + i);
    P.view = Math.PI * 0.26;
    // Spells of hopping with joy, spells of standing and twirling, on each kid's own clock.
    const spell = hash(Math.floor((t + kid.seed * 5) / 3.1) * 7 + i * 13);
    let chase = 0;
    let bx = 0;
    let by = 0;
    if (ball && i === 1) {
      bx = ball.x;
      by = ball.y;
      chase = smooth(0.5, 0.2, (foot - by) / u - 0.1) * smooth(0.25, 0.08, Math.abs(bx - x) / u);
    }
    if (spell > 0.45 || chase > 0.2) hop(P, b, t, kid.rate * (chase > 0.2 ? 1.25 : 1), kid.seed, 0.008 + chase * 0.008, 0.005);
    else stand(P, b, t, kid.seed, 0.005, 3.2);
    const cl = P.j[J.chest * 3]!;
    const cf = P.j[J.chest * 3 + 1]!;
    const cy = P.j[J.chest * 3 + 2]!;
    const [hl, hf, hy] = sparkHand(i, b, cl, cf, cy, t);
    // The sparkler in the near hand; the other hand free (on the girl, reaching for the balloon).
    armTo(P, b, true, hl - 0.01, hf, hy, -0.6, -0.4, 0.4);
    if (chase > 0.05) {
      const [, rf, ry] = [0, (kid.dir * (bx - x)) / u / Math.sin(P.view), (by - foot) / u];
      armTo(P, b, false, cl + 0.012, cf + (Math.max(-0.02, Math.min(0.03, rf)) - cf) * chase, cy - (b.upper + b.fore) * 0.95 * chase + (1 - chase) * 0.02 + ry * 0, 0.6, 0.2, 0.6);
      P.face = P.view + 0.35 * chase;
      P.tilt = kid.dir * -0.5 * chase;
      P.mouth = 0.5 + 0.4 * chase;
      P.brow = chase;
    } else {
      wave(P, b, t, 2.2, spell > 0.8 ? 1 : 0);
      P.face = P.view + 0.1 * Math.sin(t * 1.3 + i);
      P.tilt = kid.dir * -0.12;
      P.mouth = 0.55 + 0.35 * Math.sin(t * 1.7 + i * 2);
      P.brow = 0.5;
    }
    P.lagY = Math.sin((t * kid.rate + kid.seed) * Math.PI * 2 - 1) * 0.003;
    const view = P.view;
    figure(ctx, P, b, kid.look, x, foot, u, kid.dir, kw, { lod: 2, swing: Math.sin(t * kid.rate * Math.PI * 2) }, {
      front: (c, F) => {
        // The sparkler: a wire from the hand, a trail of light behind its tip, the crackle.
        const hx = F.x[J.handN]!;
        const hy2 = F.y[J.handN]!;
        const dx = kid.dir * u * 0.004;
        const tipX = hx + dx;
        const tipY = hy2 - u * 0.028;
        c.beginPath();
        c.moveTo(hx, hy2);
        c.lineTo(tipX, tipY);
        c.strokeStyle = CHROME.shade;
        c.lineWidth = Math.max(1, u * 0.0025);
        c.stroke();
        c.beginPath();
        for (let q = 0; q <= 6; q++) {
          const tq = t - q * 0.04;
          const [ql, qf, qy] = sparkHand(i, b, cl, cf, cy, tq);
          const [sx, sy] = onScreen(x, foot, u, kid.dir, view, ql - 0.01, qf, qy);
          const px = sx + dx - (hx - F.x[J.handN]!);
          const py = sy - u * 0.028;
          if (q === 0) c.moveTo(tipX, tipY);
          else c.lineTo(px, py);
        }
        c.strokeStyle = SPARK_TRAIL;
        c.lineWidth = Math.max(1, u * 0.004);
        c.stroke();
        sparklerTip(c, s, tipX, tipY, u * 0.022, i * 7);
      },
    });
  }
}

// ---------------------------------------------------------------- the picnic family

const DAD_BUILD = scaled(build({ belly: 0.006, waistW: 0.0135, hipW: 0.014, depth: 0.0128 }), 0.94);
const DAD_LOOK: Look = { skin: SKIN_FAIR, hair: HAIR_AUBURN, style: "side", top: shades(SHIRT_WHITE, 0.5, 0.18), sleeves: "short", lower: shades(KHAKI, 0.4, 0.28), legs: "trousers", shoes: DARK_BROWN };
const MOM_BUILD = scaled(build({ bust: 0.0045, waistW: 0.011, hipW: 0.0146, chestW: 0.0142, head: 0.0156 }), 0.94);
const MOM_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_CHESTNUT, style: "bob", top: shades(ROSE_DRESS, 0.45, 0.25), sleeves: "short", lower: shades(ROSE_DRESS, 0.45, 0.25), legs: "dress", hem: 0.75, shoes: RED };
const TOT_BUILD = scaled(CHILD, 0.82);
const TOT_LOOK: Look = { skin: SKIN_TAN, hair: HAIR_CHESTNUT, style: "pigtails", ribbon: MARIGOLD, top: shades(BUTTER_DRESS, 0.4, 0.25), sleeves: "short", lower: shades(BUTTER_DRESS, 0.4, 0.25), legs: "dress", hem: 0.38, shoes: RED };

/** Dad in the striped lawn chair (seat at `seat` px, its middle at x): a straw boater, clapping the band as it passes and cheering, turning his head to follow it. */
export function dadInChair(ctx: Ctx, s: Scene, x: number, foot: number, seatH: number): void {
  const u = s.u;
  const t = s.t;
  const b = DAD_BUILD;
  fresh(t, 301);
  P.view = Math.PI * 0.3;
  sit(P, b, seatH / u, -0.16, 0, 0);
  const ex = excitement(s, x);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  // Clapping: the hands meet before his chest four times a second while the band is near.
  const clap = ex > 0.3 ? Math.abs(Math.sin(t * Math.PI * 4)) : 0.6;
  const apart = 0.004 + clap * 0.012;
  const hy = cy + 0.012 - ex * 0.01;
  armTo(P, b, true, cl - apart, cf + 0.024, hy, -1, -0.6, 0.6);
  armTo(P, b, false, cl + apart, cf + 0.024, hy, 1, -0.6, 0.6);
  P.face = glance(t, 301, -0.3, 0.5) * (1 - ex) + (P.view + 0.45) * ex;
  P.mouth = 0.15 + ex * 0.75 * (0.6 + 0.4 * Math.sin(t * 5));
  P.brow = ex * 0.6;
  figure(ctx, P, b, DAD_LOOK, x, foot, u, 1, lineOf(s), { lod: 2 }, {
    hat: (c, F) => boater(c, F, P, RED),
  });
}

/** Mom on the blanket, her legs folded to the side, her sun hat's ribbon fluttering, waving a little flag at the parade and following it with her eyes; and their little girl bouncing on the blanket beside her, waving hers. */
export function picnicFamily(ctx: Ctx, s: Scene, momX: number, momY: number, totX: number, totY: number): void {
  const u = s.u;
  const t = s.t;
  const kw = lineOf(s);
  // Mom.
  fresh(t, 302);
  const b = MOM_BUILD;
  P.view = Math.PI * 0.32;
  sit(P, b, 0, -0.05, 0.1, 1);
  const ex = excitement(s, momX);
  // Her flag stays up between waves (held lower it would sit across her face).
  const flagK = 0.75 + 0.25 * ex;
  wave(P, b, t, 1.6, flagK);
  // Her other hand on the blanket behind her, leaning on it.
  armTo(P, b, true, P.j[J.pelvis * 3]! - 0.016, P.j[J.pelvis * 3 + 1]! - 0.012, 0, -1, 0.5, -0.4);
  P.face = P.view - 0.1 + glance(t, 302, -0.25, 0.2) * (1 - ex) - ex * 0.35;
  P.tilt = 0.06 - ex * 0.12;
  P.mouth = 0.2 + ex * 0.5;
  P.brow = ex * 0.5;
  figure(ctx, P, b, MOM_LOOK, momX, momY, u, 1, kw, { lod: 2, swing: 0 }, {
    hat: (c, F) => sunHat(c, F, P, STRAW, NAVY, Math.sin(t * 3.1) * 0.5 + breeze(t) * 0.8),
    // Her hand is up beside her head: a longer stick holds her flag up over her hat, clear of her face and of her girl.
    front: (c, F) => handFlag(c, F, u, kw, t, false, 1, 0.056),
  });
  // Their little girl: bounces on her toes, waving her flag over her head, now and then spinning round to her mother.
  fresh(t, 303);
  const tb = TOT_BUILD;
  P.view = Math.PI * 0.2;
  const ex2 = excitement(s, totX);
  hop(P, tb, t, 1.5 + ex2 * 0.6, 0.4, 0.004 + ex2 * 0.006, 0.004);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  const w = Math.sin(t * (3 + ex2 * 2));
  armTo(P, tb, true, cl - 0.012 + w * 0.006, cf + 0.006, cy - (tb.upper + tb.fore) * 0.9, -1, -0.2, 0.3);
  P.face = P.view - 0.2 * ex2 + 0.25 * Math.sin(t * 0.6);
  P.mouth = 0.6 + 0.3 * ex2;
  P.brow = 0.4 + 0.4 * ex2;
  P.lagY = Math.sin((t * 1.6 + 0.4) * Math.PI * 2 - 1) * 0.003;
  figure(ctx, P, tb, TOT_LOOK, totX, totY, u, -1, kw, { lod: 2, swing: w }, {
    front: (c, F) => handFlag(c, F, u, kw, t, true, w > 0 ? 1 : -1),
  });
}

/** A little hand flag on its stick (`stick` u long) in a figure's hand (the near hand or the far one), flying back from the way it is waved. */
function handFlag(ctx: Ctx, F: Frame, u: number, kw: number, t: number, near: boolean, dir: 1 | -1, stick = 0.028): void {
  const hx = F.x[near ? J.handN : J.handF]!;
  const hy = F.y[near ? J.handN : J.handF]!;
  ctx.beginPath();
  ctx.moveTo(hx, hy + u * 0.005);
  ctx.lineTo(hx + u * 0.001, hy - u * stick);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.0022 + kw * 0.6;
  ctx.stroke();
  ctx.strokeStyle = STICK;
  ctx.lineWidth = u * 0.0022;
  ctx.stroke();
  usFlag(ctx, hx + u * 0.001, hy - u * stick, u * 0.032, u * 0.021, dir === 1 ? -1 : 1, u * 0.003, t * 9, FLAG);
}

// ---------------------------------------------------------------- the lemonade girl

const VENDOR_BUILD = scaled(build({ head: 0.0152 }, CHILD), 1.0);
const VENDOR_LOOK: Look = { skin: SKIN_BROWN, hair: HAIR_DARK, style: "pony", ribbon: GOLD, top: shades(MINT_DRESS, 0.4, 0.28), sleeves: "short", lower: shades(MINT_DRESS, 0.4, 0.28), legs: "dress", hem: 0.5, shoes: RED };
/** She pours a glass at POUR_AT and every POUR_EVERY seconds after, for POUR_TIME. */
export const POUR_AT = 2.2;
const POUR_EVERY = 6.5;
const POUR_TIME = 2.0;

/** How far into a pour she is at t (0..1), or -1 between pours. */
export function pourAt(t: number): number {
  if (t < POUR_AT) return -1;
  const k = ((t - POUR_AT) % POUR_EVERY) / POUR_TIME;
  return k < 1 ? k : -1;
}

/**
 * Where the pitcher is and how far it is tipped (radians) during a pour at k (0..1), as offsets
 * from where it rests: lifted (u), slid toward the glass (shares of the stand's half width: its
 * spout comes over the glass beside it, front.ts GLASSES), tipped.
 */
export function pitcherAt(k: number): readonly [lift: number, slide: number, tip: number] {
  if (k < 0) return [0, 0, 0];
  const up = ease(Math.min(1, k / 0.18)) * (1 - ease(Math.max(0, (k - 0.82) / 0.18)));
  const tilt = ease(Math.min(1, Math.max(0, (k - 0.2) / 0.15))) * (1 - ease(Math.max(0, (k - 0.66) / 0.14)));
  return [up * 0.006, up * 0.21, tilt * 0.95];
}

/** Her pouring arm as last drawn (elbow and hand, px), for its hand over the pitcher; whether she is pouring. */
const POURING = { on: false, ex: 0, ey: 0, hx: 0, hy: 0, k: 0 };

/**
 * The girl who keeps the lemonade stand, behind its counter: her head and shoulders over it, a
 * ponytail tied with a gold ribbon. Every few seconds she lifts the pitcher, tips it over a glass
 * and pours (`handle` is where the stand draws its handle, px), and sets it down; between pours
 * she leans on the counter, looks about, and waves and calls out as the parade goes by. Drawn
 * behind the counter; `vendorHand` draws her pouring hand over the pitcher afterwards.
 */
export function vendor(ctx: Ctx, s: Scene, x: number, foot: number, handle: readonly [number, number]): void {
  const u = s.u;
  const t = s.t;
  const b = VENDOR_BUILD;
  fresh(t, 401);
  P.view = Math.PI * 0.06;
  stand(P, b, t, 0.7, 0.004, 4.1, 0.08);
  const k = pourAt(t);
  const ex = excitement(s, x);
  const cl = P.j[J.chest * 3]!;
  const cf = P.j[J.chest * 3 + 1]!;
  const cy = P.j[J.chest * 3 + 2]!;
  const view = P.view;
  if (k >= 0) {
    // Pouring: her hand on the pitcher's handle, her other hand steadying the glass.
    armTo(P, b, true, (handle[0] - x) / u / Math.cos(view), 0.02, (handle[1] - foot) / u, -1, -0.4, 0.4);
    armTo(P, b, false, cl + 0.02, cf + 0.02, cy + 0.024, 1, -0.5, 0.3);
    P.face = view - 0.3;
    P.tilt = 0.22;
    P.mouth = 0.3;
    P.brow = 0.3;
  } else {
    // Leaning on the counter, chin up, a wave and a call when the parade comes by.
    armTo(P, b, true, cl - 0.016, cf + 0.02, cy + 0.03, -1, -0.5, 0.4);
    armTo(P, b, false, cl + 0.016, cf + 0.02, cy + 0.03, 1, -0.5, 0.4);
    wave(P, b, t, 1.8, ex > 0.4 ? 1 : 0);
    P.face = view + glance(t, 401, -0.5, 0.5) * (1 - ex) - ex * 0.3;
    P.mouth = 0.15 + ex * 0.75 * Math.max(0, Math.sin(t * 2.3));
    P.brow = ex * 0.5;
  }
  const F = figure(ctx, P, b, VENDOR_LOOK, x, foot, u, 1, lineOf(s), { lod: 2, legs: false });
  POURING.on = k >= 0;
  POURING.ex = F.x[J.elbowN]!;
  POURING.ey = F.y[J.elbowN]!;
  POURING.hx = F.x[J.handN]!;
  POURING.hy = F.y[J.handN]!;
  POURING.k = u;
}

/** Her pouring hand over the pitcher's handle (the forearm from her elbow), while she pours. */
export function vendorHand(ctx: Ctx, s: Scene): void {
  if (!POURING.on) return;
  const u = s.u;
  const b = VENDOR_BUILD;
  const kw = lineOf(s);
  const dx = POURING.hx - POURING.ex;
  const dy = POURING.hy - POURING.ey;
  const d = Math.hypot(dx, dy) || 1;
  ctx.beginPath();
  ctx.moveTo(POURING.ex + (dx / d) * d * 0.5, POURING.ey + (dy / d) * d * 0.5);
  ctx.lineTo(POURING.hx, POURING.hy);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = b.arm2 * u * 2 + kw * 2;
  ctx.stroke();
  ctx.strokeStyle = VENDOR_LOOK.skin.body;
  ctx.lineWidth = b.arm2 * u * 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(POURING.hx + (dx / d) * b.hand * u * 0.45, POURING.hy + (dy / d) * b.hand * u * 0.45, b.hand * u, 0, Math.PI * 2);
  inked(ctx, VENDOR_LOOK.skin.body, kw);
}

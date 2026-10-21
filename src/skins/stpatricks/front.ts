import { circle, hash, ink, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { GROUND_START } from "../../camera";
import type { Scene } from "../skin";
import { GRASS, INK, JOINT as CUT, KNOTWORK, MEADOW, PATH, ROUNDEL, VERMILION, WALL_GAP, WALL_STONES } from "./colors";
import { bandHeight, plait, plaitBand, ROUNDEL_REACH, roundels, triskelePath } from "./knot";
import { HAT_HIGHEST, hatOnPost, lookout, lookoutBehind } from "./lookout";
import { block } from "./shapes";
import { inkW, shamrocks } from "./tower";

// The near edge we look over: a low dry-stone wall, a course of grey and fawn field stones
// under a cope of stones set on edge, inked like everything up close, shamrocks growing at its
// foot in the grass verge. In the middle the wall stops at two upright gateposts, a ring and a
// triskele cut into each, with a worn path running out through the gap, and on the left post
// sits a tiny green hat: now and then it lifts on the head of the leprechaun crouched behind the
// post (lookout.ts). Along the very bottom runs the page's border: a plaited knotwork band in
// orpiment, verdigris and vermilion on a dark ground, framed with fine rules and ringed along
// its top with red dots, a triskele roundel in its middle, tiling with no seam at any width
// (knot.ts). It all covers the base band and drops away faster than
// the tower as the camera climbs (parallax 1.6, like the band), so it only frames the start.
// The gateway stays clear: render.ts writes "tap to drop" there at the start (at 0.9 of the
// screen height), which on a short phone falls across the wall's top and on a tall one across
// its course; the border keeps below it.

/** How far the wall's top stands above the base band's top edge (u). */
const WALL_UP = 0.03;
/** Half the gateway's width (u; "tap to drop" is about 0.29 u wide), and the gateposts (the leprechaun behind the left one is narrower than it: lookout.ts). */
export const GATE = 0.17;
const POST_W = 0.042;
const POST_UP = 0.022;
/** Stone rows: the cope stones on edge along the top, then courses of field stones. */
const COPE_H = 0.044;
const ROW = 0.05;
/** Field-stone courses under the cope; then the grass verge in front of the wall. */
const COURSES = 1;
const WALL_H = COPE_H + COURSES * ROW;
/** The wall's top below the base band's top edge (u). */
const WALL_DOWN = 0.36 - WALL_UP;
/** The dark joint left round every stone (u): it is the stones' ink line. */
const JOINT = 0.0052;

/** The wall's top edge on screen (it moves with the base band). */
export function wallTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * WALL_DOWN;
}

/** The wall's foot, where the verge begins. */
export function wallFoot(s: Scene): number {
  return wallTop(s) + s.u * WALL_H;
}

/** The top of the gateposts and the hat (risen as high as the leprechaun under it takes it): the highest thing in front. */
export function gateTop(s: Scene): number {
  return wallTop(s) - s.u * (POST_UP + 0.045 + HAT_HIGHEST);
}

/** Scratch result of `leftPost`. */
const LEFT_POST = { x: 0, top: 0 };

/** The left gatepost, which the hat sits on and the leprechaun hides behind: its center and its top. */
export function leftPost(s: Scene): typeof LEFT_POST {
  LEFT_POST.x = s.cssW / 2 - (GATE + POST_W / 2) * s.u;
  LEFT_POST.top = wallTop(s) - POST_UP * s.u;
  return LEFT_POST;
}

// ---------------------------------------------------------------- the border

/** The border's plait (three strands) and its spacing at most and at least (u): where the verge is too short even for the least, there is no border. */
const BORDER = plait(3);
const BORDER_D = 0.024;
const BORDER_MIN_D = 0.006;
/**
 * Its top edge keeps this far below the wall's foot (u), clear of the shamrocks growing there
 * and the gateposts' feet, with its row of dots in between; at the start its foot rests this
 * far above the screen's bottom (u).
 */
const BORDER_GAP = 0.04;
const BORDER_BOTTOM = 0.006;
/** Its roundel's radius, in band heights, at most: smaller where its ring of dots would reach past the screen's bottom. */
const BOSS = 0.62;


/** Scratch: the border's span across the screen, and its roundel's place and turn. */
const BORDER_SPAN = [-2, 0];
const BORDER_BOSS = [0, 0, 0];

/** Scratch result of `border`. */
const BORDER_AT = { top: 0, d: 0 };

/**
 * Where the border runs: at the start it lies along the screen's bottom, below the wall's foot
 * (narrower where the verge is short), and from then on it moves with the wall. `top` is its top
 * edge, `d` its plait's spacing.
 */
export function border(s: Scene): typeof BORDER_AT {
  const u = s.u;
  // The verge between the wall's foot and the screen's bottom at the start (the ground at GROUND_START).
  const verge = s.cssH * (1 - GROUND_START) - (WALL_DOWN + WALL_H) * u;
  const room = verge - (BORDER_GAP + BORDER_BOTTOM) * u;
  const d = Math.min(BORDER_D * u, room / bandHeight(BORDER, 1));
  BORDER_AT.d = d < BORDER_MIN_D * u ? 0 : d;
  BORDER_AT.top = wallFoot(s) + verge - BORDER_BOTTOM * u - bandHeight(BORDER, BORDER_AT.d);
  return BORDER_AT;
}

/** The red dots along the border's top edge, as the Book of Kells outlines its panels: their spacing and size (u). */
const DOT_STEP = 0.014;
const DOT = 0.0042;
const DOT_DASH = [0, 0];
const NO_DASH: number[] = [];

/** The border along the bottom, a row of red dots along its top, its roundel in the middle, under the gateway. */
export function frontBorder(ctx: Ctx, s: Scene): void {
  const { top, d } = border(s);
  if (d === 0 || top > s.cssH) return;
  const u = s.u;
  const h = bandHeight(BORDER, d);
  const cx = s.cssW / 2;
  const rule = Math.max(0.8, u * 0.0024);
  BORDER_SPAN[1] = s.cssW + 2;
  plaitBand(ctx, BORDER, KNOTWORK, cx, BORDER_SPAN, top, d, rule, false);
  // The dots, centered on the screen so both ends match.
  const y = top - rule * 1.5 - u * DOT * 1.4;
  const step = u * DOT_STEP;
  DOT_DASH[1] = step;
  ctx.setLineDash(DOT_DASH);
  ctx.lineDashOffset = 0;
  ctx.beginPath();
  ctx.moveTo(cx - step * Math.ceil(cx / step + 1), y);
  ctx.lineTo(s.cssW + step, y);
  ctx.strokeStyle = VERMILION;
  ctx.lineWidth = u * DOT * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
  BORDER_BOSS[0] = cx;
  BORDER_BOSS[1] = top + h / 2;
  const r = Math.min(h * BOSS, (h / 2 + BORDER_BOTTOM * u * 0.5) / ROUNDEL_REACH);
  roundels(ctx, BORDER_BOSS, r, ROUNDEL, Math.min(inkW(s) * 0.6, r * 0.09));
}

/** Shamrock clumps growing at the wall's foot, in front of its bottom stones: x (u from center), depth fraction, size (u). */
const CLUMPS = [
  [-0.44, 0, 0.036],
  [-0.4, 0, 0.026],
  [-0.27, 0, 0.038],
  [0.27, 0, 0.038],
  [0.31, 0, 0.026],
  [0.44, 0, 0.036],
] as const;

/** Stone tone per stone: one of the three wall tones. */
function toneOf(row: number, i: number, side: number): number {
  return Math.floor(hash(row * 41 + i * 7 + side * 503 + 7000) * 3);
}

type StoneFn = (x: number, y: number, w: number, h: number, t: number) => void;

/**
 * Walk one side's field stones (the courses under the cope), row by row from the gateway
 * outward, calling `draw` for each: its left edge, top, width, height and tone. The cut falls
 * at the screen edge, never at the gate.
 */
function eachStone(s: Scene, side: number, top: number, draw: StoneFn): void {
  const u = s.u;
  const gate = s.cssW / 2 + side * GATE * u;
  const limit = side < 0 ? gate : s.cssW - gate;
  for (let row = 1, y = top + COPE_H * u; row <= COURSES && y < s.cssH; row++, y += ROW * u) {
    let d = 0;
    for (let i = 0; d < limit; i++) {
      let w = (0.07 + hash(row * 31 + i * 3 + side * 211 + 7100) * 0.055) * u;
      if (i === 0 && row % 2 === 0) w *= 0.55;
      draw(side < 0 ? gate - d - w : gate + d, y, w, ROW * u, toneOf(row, i, side));
      d += w;
    }
  }
}

/** Scratch state for the stone passes, so the per-frame walks allocate no closures. */
const PASS = { ctx: null as Ctx | null, tone: -1, r: 0, gap: 0 };

/** One tone's stones (PASS.tone >= 0), or the lit strips along every stone's top (PASS.tone < 0). */
function stonePath(x: number, y: number, w: number, h: number, t: number): void {
  const ctx = PASS.ctx!;
  const g = PASS.gap;
  if (PASS.tone < 0) ctx.rect(x + PASS.r, y + g, Math.max(0, w - PASS.r * 2 - g), h * 0.17);
  else if (t === PASS.tone) block(ctx, x + g / 2, y + g / 2, w - g, h - g, Math.min(PASS.r, w * 0.3));
}

/** How much lower the short cope stones stand than the tall ones (u), and their corners' radius. */
const COPE_HEN = 0.008;
const COPE_CORNER = 0.007;

/** Top of the `i`th cope stone on one side: tall and short stones alternate ("cock and hen"), each a little uneven. */
function copeStoneTop(s: Scene, side: number, i: number, top: number): number {
  return top + s.u * ((i % 2 ? COPE_HEN : 0) + hash(i + side * 97 + 7200) * 0.004);
}

/** What `copePath` traces: the whole strip, the joints between its stones, or a lit band along each stone's top. */
const STRIP = 0;
const JOINTS = 1;
const LIT = 2;

/**
 * The cope along one side's top: slabs set on edge, tall and short by turns, their tops
 * squared off with rounded corners, as one strip (STRIP), the joints between them (JOINTS),
 * or a lit band just under each stone's top (LIT).
 */
function copePath(ctx: Ctx, s: Scene, side: number, top: number, mode: number): void {
  const u = s.u;
  const gate = s.cssW / 2 + side * GATE * u;
  const limit = side < 0 ? gate : s.cssW - gate;
  const bottom = top + COPE_H * u;
  if (mode === STRIP) ctx.moveTo(gate, bottom);
  let d = 0;
  let prev = 0;
  for (let i = 0; d < limit; i++) {
    const w = (0.026 + hash(i * 3 + side * 211 + 7300) * 0.012) * u;
    const x0 = gate + side * d;
    const x1 = gate + side * (d + w);
    const t = copeStoneTop(s, side, i, top);
    const r = Math.min(COPE_CORNER * u, w * 0.35);
    if (mode === STRIP) {
      ctx.lineTo(x0, t + r);
      ctx.quadraticCurveTo(x0, t, x0 + side * r, t);
      ctx.lineTo(x1 - side * r, t);
      ctx.quadraticCurveTo(x1, t, x1, t + r);
    } else if (mode === LIT) {
      ctx.rect(Math.min(x0, x1) + r * 0.6, t + u * 0.004, w - r * 1.2, u * 0.006);
    } else if (i > 0) {
      // From the notch between the two stones' corners down to the courses.
      ctx.moveTo(x0, Math.max(prev, t) + r);
      ctx.lineTo(x0, bottom);
    }
    prev = t;
    d += w;
  }
  if (mode === STRIP) {
    ctx.lineTo(gate + side * d, bottom);
    ctx.closePath();
  }
}

/**
 * The wall either side of the gateway: the cope of stones on edge along its top (one inked
 * strip of humps with its joints), then the courses of field stones in their three tones on
 * the dark joints behind them (the joints are their ink line), a lit strip along each top.
 * Both sides share every pass.
 */
function wall(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const left = s.cssW / 2 - GATE * u;
  const right = s.cssW / 2 + GATE * u;
  const courses = top + COPE_H * u;
  ctx.fillStyle = WALL_GAP;
  ctx.beginPath();
  ctx.rect(0, courses - u * 0.004, left, WALL_H * u - COPE_H * u + u * 0.004);
  ctx.rect(right, courses - u * 0.004, s.cssW - right, WALL_H * u - COPE_H * u + u * 0.004);
  ctx.fill();
  PASS.ctx = ctx;
  PASS.r = u * 0.011;
  PASS.gap = Math.max(1.5, JOINT * u);
  for (let t = 0; t < WALL_STONES.length; t++) {
    PASS.tone = t;
    ctx.beginPath();
    eachStone(s, -1, top, stonePath);
    eachStone(s, 1, top, stonePath);
    ctx.fillStyle = WALL_STONES[t]!.body;
    ctx.fill();
  }
  PASS.tone = -1;
  ctx.beginPath();
  eachStone(s, -1, top, stonePath);
  eachStone(s, 1, top, stonePath);
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.fill();
  PASS.ctx = null;
  // The cope.
  const cope = WALL_STONES[2]!;
  ctx.beginPath();
  copePath(ctx, s, -1, top, STRIP);
  copePath(ctx, s, 1, top, STRIP);
  ctx.fillStyle = cope.body;
  ctx.fill();
  ink(ctx, lw * 0.85, INK);
  // The lit band sits just under each stone's top, clear of the outline.
  ctx.fillStyle = cope.light;
  ctx.beginPath();
  copePath(ctx, s, -1, top, LIT);
  copePath(ctx, s, 1, top, LIT);
  ctx.fill();
  ctx.beginPath();
  copePath(ctx, s, -1, top, JOINTS);
  copePath(ctx, s, 1, top, JOINTS);
  ink(ctx, lw * 0.8, INK);
}

/** The carving on each gatepost's face: a ring with a triskele in it, cut into the stone: its center below the post's top and its radius (u). */
const CARVE_DOWN = 0.05;
const CARVE_R = 0.0135;

/**
 * The two upright gateposts: tall slabs with rounded heads, lit on the left, each with a ring
 * and triskele cut into its face (the cut's lower edge catching the light).
 */
function posts(ctx: Ctx, s: Scene, top: number, bottom: number, lw: number): void {
  const u = s.u;
  const w = POST_W * u;
  const c = WALL_STONES[2]!;
  const x0 = s.cssW / 2 - (GATE + POST_W) * u;
  const x1 = s.cssW / 2 + GATE * u;
  ctx.beginPath();
  block(ctx, x0, top, w, bottom - top, u * 0.012);
  block(ctx, x1, top, w, bottom - top, u * 0.012);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.fillStyle = c.light;
  ctx.fillRect(x0 + u * 0.005, top + u * 0.006, w * 0.22, bottom - top - u * 0.012);
  ctx.fillRect(x1 + u * 0.005, top + u * 0.006, w * 0.22, bottom - top - u * 0.012);
  ctx.fillStyle = c.shade;
  ctx.fillRect(x0 + w * 0.72, top + u * 0.008, w * 0.22, bottom - top - u * 0.014);
  ctx.fillRect(x1 + w * 0.72, top + u * 0.008, w * 0.22, bottom - top - u * 0.014);
  ink(ctx, lw, INK);
  const r = CARVE_R * u;
  const y = top + CARVE_DOWN * u;
  const cut = Math.max(0.8, u * 0.0028);
  for (let pass = 0; pass < 2; pass++) {
    const dy = pass ? 0 : cut * 0.6;
    ctx.beginPath();
    for (const x of [x0 + w / 2, x1 + w / 2]) {
      circle(ctx, x, y + dy, r);
      triskelePath(ctx, x, y + dy, r * 0.72);
    }
    ctx.strokeStyle = pass ? CUT : c.light;
    ctx.lineWidth = cut;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

/** Everything in front: the wall, its gateway and what is about it, then the border along the bottom. */
export function front(ctx: Ctx, s: Scene): void {
  frontWall(ctx, s);
  frontBorder(ctx, s);
}

/** The wall, its gateway, the verge in front with the shamrocks, the hat on its post and the leprechaun under it. */
export function frontWall(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const top = wallTop(s);
  if (gateTop(s) > s.cssH) return;
  const lw = inkW(s);
  const cx = s.cssW / 2;
  const foot = top + WALL_H * u;
  // The meadow along the wall's top (over the base band's grass tips) and on down behind the
  // whole wall, so nothing shows between its stones, and through the gateway.
  ctx.fillStyle = MEADOW;
  ctx.fillRect(0, top - u * 0.014, s.cssW, foot - top + u * 0.014);
  // The grass verge in front of the wall, a shade deeper than the meadow (under the wall it
  // starts higher, so no seam shows along its foot).
  ctx.fillStyle = GRASS.body;
  ctx.fillRect(0, foot - u * 0.004, s.cssW, s.cssH - foot + u * 0.004);
  ctx.fillRect(0, foot - u * 0.02, cx - GATE * u, u * 0.02);
  ctx.fillRect(cx + GATE * u, foot - u * 0.02, s.cssW - cx - GATE * u, u * 0.02);
  // A worn path out through the gateway, widening toward you.
  ctx.fillStyle = PATH;
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.06, top - u * 0.012);
  ctx.lineTo(cx + u * 0.06, top - u * 0.012);
  ctx.quadraticCurveTo(cx + u * 0.1, top + u * 0.06, cx + u * 0.13, s.cssH);
  ctx.lineTo(cx - u * 0.13, s.cssH);
  ctx.quadraticCurveTo(cx - u * 0.1, top + u * 0.06, cx - u * 0.06, top - u * 0.012);
  ctx.closePath();
  ctx.fill();
  // The leprechaun crouched behind the left gatepost (only what rises above its top shows),
  // the wall either side of the gateway, its gateposts, the grass verge in front with
  // shamrocks in it, and the hat on the post (or on his head).
  const pose = lookout(s.t);
  const post = leftPost(s);
  lookoutBehind(ctx, u, post.x, post.top, lw, pose);
  wall(ctx, s, top, lw);
  posts(ctx, s, post.top, foot + u * 0.012, lw);
  shamrocks(ctx, s, cx, foot + u * 0.008, foot + u * 0.008, CLUMPS, lw);
  hatOnPost(ctx, u, post.x, post.top, lw, pose);
}

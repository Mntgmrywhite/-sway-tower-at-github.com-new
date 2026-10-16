import { alpha, circle, hash, ink, inkedLine, mix, oval, roundRectPath, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { owl, squirrel } from "./animals";
import {
  BLOOMS,
  GOLD,
  GOLD_SHADE,
  GRASS,
  GRASS_DARK,
  GRASS_LIGHT,
  HOLE,
  INK,
  inkW,
  JOINT,
  LEAF,
  ROOF,
  ROOF_LIGHT,
  ROOF_SHADE,
  ROYAL,
  ROYAL_SHADE,
  SHUTTER,
  STONE,
  STONE_DEEP,
  STONE_LIGHT,
  STONE_SHADE,
  VINE,
  VINE_DARK,
  VINE_LIGHT,
  WOOD,
  CRIMSON,
} from "./colors";

// The castle the tower stands on: a warm sandstone keep, sun-baked and dressed in greenery.
// Its crenellated top is the platform (merlon tops exactly on the floor line, a little wider
// than the base bar), a row of corbels under it hung with flowering vine swags, then big soft
// sandstone blocks with two shuttered windows and their flower boxes, a royal-blue banner with
// a gold crown, and ivy climbing from below. Lower curtain walls step out to round towers with
// terracotta cone roofs and pennants; flowering bushes grow along the wall foot. A squirrel
// scampers along the wall and an owl sits in a tree in the bailey. Everything here moves with
// the tower (parallax 1) and leaves the view downward.

// Layout in u: x from the screen center, y down from the floor line (groundY).
const PARAPET = 0.24; // half width of the keep's top
const CRENEL = 0.03; // crenel depth
const PARAPET_H = 0.075;
const CORBEL_H = 0.036;
const BODY = 0.205; // half width of the keep's body
const COURSE = 0.052; // masonry course height
const BODY_TOP = PARAPET_H + CORBEL_H;

const WALL_TOP = 0.2; // curtain wall merlon tops
const WALL_CRENEL = 0.024;
/** Bushes along the wall foot: their tops, u below the floor line; the solid hedge band starts this far under them. */
const BUSH_TOP = 0.272;
const HEDGE_BAND = 0.03;

/**
 * Round towers out along the walls: x (u), body top (u below the floor line), radius (u). The
 * near pair keeps its pennants below the floor line, clear of the deer's hooves on the shore.
 */
const TOWERS = [
  [-0.405, 0.178, 0.06],
  [0.405, 0.178, 0.06],
  [-0.96, 0.2, 0.056],
  [0.96, 0.2, 0.056],
  [-1.5, 0.24, 0.052],
  [1.5, 0.24, 0.052],
] as const;
/** Pennant colors, one per tower. */
const FLAGS = [GOLD, ROYAL, ROYAL, GOLD, GOLD, ROYAL] as const;
/** Cone height over the body top, in radii. */
const CONE = 2.3;
/** Pennants stream this way (the wind blows to the left). */
const WIND = -1;

const WALL_STONE = mix(STONE, STONE_SHADE, 0.25);
const WALL_LIGHT = mix(STONE_LIGHT, STONE, 0.35);
const SHADE = alpha("#a0522d", 0.16);
const UNDER = alpha(INK, 0.2);
const SHINGLE = alpha("#7a1f1a", 0.45);
const SIDES = [-1, 1] as const;

// ---------------------------------------------------------------- masonry

/**
 * Staggered sandstone courses filling x0..x1 from yTop down to `stop`: the stone, a few warmer
 * stones, a lit top on each, and every joint drawn in warm brown in one pass (lines, not
 * outlines, so a whole wall costs one stroke and reads soft, not hard-edged). Courses are hashed
 * by `seed` and their index from the top, so the pattern stays put on the wall as it moves.
 */
function masonry(
  ctx: Ctx,
  s: Scene,
  x0: number,
  x1: number,
  yTop: number,
  stop: number,
  courseH: number,
  seed: number,
  stone: string,
  light: string,
  lw: number,
): void {
  if (stop <= yTop) return;
  const u = s.u;
  ctx.fillStyle = stone;
  ctx.fillRect(x0, yTop, x1 - x0, stop - yTop);
  const capH = Math.max(1, courseH * 0.2);
  const inset = u * 0.006;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (let n = 0, y = yTop; y < stop; n++, y += courseH) {
      if (pass === 2) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      let x = x0 - (n % 2) * u * 0.045;
      for (let i = 0; x < x1; i++) {
        const h = hash(seed + n * 37 + i * 7);
        const w = u * (0.085 + h * 0.06);
        const a = Math.max(x0, x);
        const b = Math.min(x1, x + w);
        if (pass === 0 && h > 0.72 && b - a > inset * 2) {
          ctx.rect(a, y, b - a, courseH);
        } else if (pass === 1 && b - a > inset * 3) {
          ctx.rect(a + inset, y + inset * 0.7, (b - a) * 0.66, capH);
        } else if (pass === 2 && x + w < x1 - 1) {
          ctx.moveTo(x + w, y);
          ctx.lineTo(x + w, Math.min(stop, y + courseH));
        }
        x += w;
      }
    }
    if (pass === 0) {
      ctx.fillStyle = SHADE;
      ctx.fill();
    } else if (pass === 1) {
      ctx.fillStyle = light;
      ctx.fill();
    } else {
      ink(ctx, lw, JOINT);
    }
  }
}

/** Rounded rectangle as its own subpath (roundRectPath starts a new path). */
function roundRectSub(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A crenellated top edge from x0 to x1 at y (merlon tops), as part of the current path. */
function merlons(ctx: Ctx, x0: number, x1: number, y: number, depth: number, merlon: number, crenel: number, yBot: number): void {
  const n = Math.max(1, Math.round((x1 - x0 + crenel) / (merlon + crenel)));
  const m = (x1 - x0 - (n - 1) * crenel) / n;
  ctx.moveTo(x0, yBot);
  ctx.lineTo(x0, y);
  for (let i = 0; i < n; i++) {
    const a = x0 + i * (m + crenel);
    ctx.lineTo(a + m, y);
    if (i < n - 1) {
      ctx.lineTo(a + m, y + depth);
      ctx.lineTo(a + m + crenel, y + depth);
      ctx.lineTo(a + m + crenel, y);
    }
  }
  ctx.lineTo(x1, yBot);
  ctx.closePath();
}

/** Rects along the tops of the merlons laid out like `merlons` (lit caps), as part of the current path. */
function merlonCaps(ctx: Ctx, x0: number, x1: number, y: number, merlon: number, crenel: number, h: number): void {
  const n = Math.max(1, Math.round((x1 - x0 + crenel) / (merlon + crenel)));
  const m = (x1 - x0 - (n - 1) * crenel) / n;
  for (let i = 0; i < n; i++) ctx.rect(x0 + i * (m + crenel), y, m, h);
}

// ---------------------------------------------------------------- the keep

function keep(ctx: Ctx, s: Scene, stop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const G = s.groundY;
  const lw = inkW(s);

  // Body: masonry to the bottom, then light from the left and shade on the right.
  const bx0 = cx - BODY * u;
  const bx1 = cx + BODY * u;
  const by = G + BODY_TOP * u;
  masonry(ctx, s, bx0, bx1, by, stop, COURSE * u, 11, STONE, STONE_LIGHT, lw * 0.75);
  ctx.fillStyle = SHADE;
  ctx.fillRect(cx + BODY * u * 0.42, by, BODY * u * 0.58, stop - by);
  // Shadow cast by the overhanging parapet.
  ctx.fillStyle = UNDER;
  ctx.fillRect(bx0, by, bx1 - bx0, u * 0.014);
  ctx.beginPath();
  ctx.moveTo(bx0, stop + 2);
  ctx.lineTo(bx0, by);
  ctx.moveTo(bx1, by);
  ctx.lineTo(bx1, stop + 2);
  ink(ctx, lw * 1.3, INK);

  windows(ctx, s, cx, G + 0.222 * u, lw);
  ivy(ctx, s, cx - 0.188 * u, G, stop, lw);

  // Corbels: a dark band of machicolation holes with stone brackets in front.
  const py = G + PARAPET_H * u;
  ctx.fillStyle = HOLE;
  ctx.fillRect(cx - (PARAPET - 0.012) * u, py - 1, (PARAPET - 0.012) * 2 * u, CORBEL_H * u);
  ctx.beginPath();
  const n = 8;
  const ch = CORBEL_H * u;
  for (let i = 0; i < n; i++) {
    const x = cx - PARAPET * u + ((i + 0.5) / n) * PARAPET * 2 * u;
    const w = u * 0.034;
    roundRectSub(ctx, x - w / 2, py - 1, w, ch * 0.5 + 1, u * 0.003);
    roundRectSub(ctx, x - w * 0.32, py + ch * 0.45, w * 0.64, ch * 0.55, u * 0.005);
  }
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = STONE_SHADE;
  ctx.fill();

  // Parapet: the inner wall seen through the crenels, then the merlons in front.
  const px0 = cx - PARAPET * u;
  const px1 = cx + PARAPET * u;
  ctx.fillStyle = STONE_DEEP;
  ctx.fillRect(px0 + 2, G, px1 - px0 - 4, CRENEL * u + 2);
  ctx.beginPath();
  merlons(ctx, px0, px1, G, CRENEL * u, 0.065 * u, 0.038 * u, py);
  ctx.fillStyle = STONE;
  ctx.fill();
  // Lit merlon caps and ledge, a course joint, a few vertical joints, shade on the right.
  ctx.beginPath();
  merlonCaps(ctx, px0, px1, G, 0.065 * u, 0.038 * u, u * 0.013);
  ctx.rect(px0, G + CRENEL * u, px1 - px0, u * 0.01);
  ctx.fillStyle = STONE_LIGHT;
  ctx.fill();
  ctx.fillStyle = SHADE;
  ctx.fillRect(cx + PARAPET * u * 0.45, G + CRENEL * u, px1 - cx - PARAPET * u * 0.45, (PARAPET_H - CRENEL) * u);
  ctx.beginPath();
  ctx.moveTo(px0, G + PARAPET_H * u * 0.62);
  ctx.lineTo(px1, G + PARAPET_H * u * 0.62);
  for (let i = 0; i < 6; i++) {
    const x = px0 + (i + 0.3 + hash(i + 40) * 0.4) * ((px1 - px0) / 6);
    const top = i % 2 ? G + CRENEL * u : G + PARAPET_H * u * 0.62;
    ctx.moveTo(x, top);
    ctx.lineTo(x, i % 2 ? G + PARAPET_H * u * 0.62 : py);
  }
  ink(ctx, lw * 0.7, JOINT);
  ctx.beginPath();
  merlons(ctx, px0, px1, G, CRENEL * u, 0.065 * u, 0.038 * u, py);
  ink(ctx, lw * 1.3, INK);

  swags(ctx, s, cx, G + (BODY_TOP - 0.004) * u, lw);
  banner(ctx, s, cx, G + (BODY_TOP + 0.008) * u, lw);
}

/** The two windows either side of the banner: x offsets (u from center) and flutter phases. */
const WINDOWS = [
  [-0.135, 0],
  [0.135, 1.7],
] as const;

/**
 * Arched windows with open sky-blue shutters and boxes of bright flowers spilling over, both
 * drawn pass by pass so they share every fill and stroke. Feet (box tops) at y.
 */
function windows(ctx: Ctx, s: Scene, cx: number, y: number, lw: number): void {
  const u = s.u;
  const w = u * 0.042;
  const h = u * 0.066;
  if (y - h > s.cssH) return;
  for (let pass = 0; pass < 9; pass++) {
    ctx.beginPath();
    for (const [dx, phase] of WINDOWS) {
      const x = cx + dx * u;
      const flutter = Math.sin(s.t * 0.8 + phase) * 0.06;
      const lo = x - w / 2 - w * (0.55 + flutter);
      switch (pass) {
        case 0: // shutters and their rails
          ctx.rect(lo, y - h * 0.9, w * (0.55 + flutter), h * 0.9);
          ctx.rect(x + w / 2, y - h * 0.9, w * 0.55, h * 0.9);
          ctx.moveTo(lo, y - h * 0.45);
          ctx.lineTo(x - w / 2, y - h * 0.45);
          ctx.moveTo(x + w / 2, y - h * 0.45);
          ctx.lineTo(x + w / 2 + w * 0.55, y - h * 0.45);
          break;
        case 1: // arch
          ctx.moveTo(x - w / 2, y);
          ctx.lineTo(x - w / 2, y - h + w / 2);
          ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
          ctx.lineTo(x + w / 2, y);
          ctx.closePath();
          break;
        case 2: // leaves trailing under the box
          for (let i = 0; i < 4; i++) {
            const lx = x - w * 0.62 + i * w * 0.42;
            oval(ctx, lx, y + u * 0.02 + (i % 2) * u * 0.006, u * 0.008, u * 0.0055, 1.2 + Math.sin(s.t * 1.5 + i + phase) * 0.2);
          }
          break;
        case 3: // the box
          roundRectSub(ctx, x - w * 0.82, y - u * 0.002, w * 1.64, u * 0.018, u * 0.003);
          break;
        case 4: // leaves in the box
          for (let i = 0; i < 5; i++) oval(ctx, x - w * 0.66 + i * w * 0.33, y - u * 0.004, u * 0.008, u * 0.005, 0.3 * (i - 2));
          break;
        default: // blooms: pass 5 inks them all, 6..8 fill them by color, alternating
          for (let i = 0; i < 5; i++) {
            if (pass > 5 && (i + (phase > 1 ? 1 : 0)) % 3 !== pass - 6) continue;
            circle(ctx, x - w * 0.62 + i * w * 0.31, y - u * 0.009 - (i % 2) * u * 0.003, u * 0.0075);
          }
      }
    }
    switch (pass) {
      case 0:
        ctx.fillStyle = SHUTTER;
        ctx.fill();
        ink(ctx, lw * 0.8, INK);
        break;
      case 1:
        ctx.fillStyle = HOLE;
        ctx.fill();
        ink(ctx, lw, INK);
        break;
      case 2:
        ink(ctx, lw * 1.3, INK);
        ctx.fillStyle = VINE;
        ctx.fill();
        break;
      case 3:
        ctx.fillStyle = WOOD;
        ctx.fill();
        ink(ctx, lw * 0.8, INK);
        break;
      case 4:
        ctx.fillStyle = VINE_DARK;
        ctx.fill();
        break;
      case 5:
        ink(ctx, lw * 1.1, INK);
        break;
      default:
        ctx.fillStyle = BLOOMS[pass - 6]!;
        ctx.fill();
    }
  }
}

/** Ivy climbing the keep's lower left from below the screen, leaves rustling. */
const IVY = Array.from({ length: 22 }, (_, i) => {
  const h = hash(i + 60);
  return {
    y: 0.235 + i * 0.02,
    dx: Math.sin(i * 0.7) * 0.012 + Math.sin(i * 2.3) * 0.005,
    /** 0 = bare stem, 1 = a leaf on one side, 2 = a pair. */
    leaves: h < 0.3 ? 0 : h > 0.82 ? 2 : 1,
    side: i % 2 ? 1 : -1,
    size: 0.0065 + hash(i + 160) * 0.004,
  };
});

function ivy(ctx: Ctx, s: Scene, x: number, G: number, stop: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  let started = false;
  for (let i = IVY.length - 1; i >= 0; i--) {
    const v = IVY[i]!;
    const y = G + v.y * u;
    if (y > stop + u * 0.03 && i > 0 && G + IVY[i - 1]!.y * u > stop + u * 0.03) continue;
    const px = x + v.dx * u;
    if (!started) {
      ctx.moveTo(px, y);
      started = true;
    } else ctx.lineTo(px, y);
  }
  if (!started) return;
  inkedLine(ctx, VINE_DARK, Math.max(1, u * 0.0032), lw * 0.55, INK);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < IVY.length; i++) {
      const v = IVY[i]!;
      const y = G + v.y * u;
      if (v.leaves === 0 || y - u * 0.02 > stop) continue;
      const rustle = Math.sin(s.t * 2 + i) * 0.15;
      const r = v.size * u;
      for (let k = 0; k < v.leaves; k++) {
        const side = k ? -v.side : v.side;
        const lx = x + v.dx * u + side * r * 1.1;
        const rot = side * 0.7 + rustle;
        if (pass === 0) oval(ctx, lx, y, r, r * 0.68, rot);
        else oval(ctx, lx - r * 0.25, y - r * 0.2, r * 0.38, r * 0.22, rot);
      }
    }
    if (pass === 0) {
      ink(ctx, lw * 1.4, INK);
      ctx.fillStyle = VINE;
      ctx.fill();
    } else {
      ctx.fillStyle = VINE_LIGHT;
      ctx.fill();
    }
  }
}

/**
 * Flowering vine swags hung under the corbels: two loops either side of the banner, a strand
 * trailing down each corner. Leaves and blooms sit along each curve, rustling a little.
 * Each swag: [x0, x1 (u from center), sag (u)].
 */
const SWAGS = [
  [-0.205, -0.075, 0.042],
  [0.075, 0.205, 0.042],
] as const;
/** Leaves per swag and the fraction along it of each bloom. */
const SWAG_LEAVES = 9;
const SWAG_BLOOMS = [0.18, 0.5, 0.82] as const;
/** Corner strands: x (u from center), length (u). */
const STRANDS = [
  [-0.198, 0.07],
  [0.198, 0.055],
] as const;

const PT = { x: 0, y: 0 };

/** The point a fraction f along a swag hung from x0 to x1 (u from cx) at y0, written to PT. */
function swagAt(cx: number, y0: number, u: number, x0: number, x1: number, sag: number, f: number): void {
  PT.x = cx + (x0 + (x1 - x0) * f) * u;
  PT.y = y0 + 4 * f * (1 - f) * sag * u;
}

function swags(ctx: Ctx, s: Scene, cx: number, y0: number, lw: number): void {
  const u = s.u;
  // Stems
  ctx.beginPath();
  for (const [x0, x1, sag] of SWAGS) {
    ctx.moveTo(cx + x0 * u, y0);
    ctx.quadraticCurveTo(cx + ((x0 + x1) / 2) * u, y0 + sag * 2 * u, cx + x1 * u, y0);
  }
  for (const [x, len] of STRANDS) {
    ctx.moveTo(cx + x * u, y0);
    ctx.quadraticCurveTo(cx + x * u + u * 0.01, y0 + len * u * 0.5, cx + x * u - u * 0.004, y0 + len * u);
  }
  inkedLine(ctx, VINE_DARK, Math.max(1, u * 0.004), lw * 0.55, INK);
  // Leaves along every stem (too small at phone size for a lit spot of their own).
  ctx.beginPath();
  for (let w = 0; w < SWAGS.length; w++) {
    const [x0, x1, sag] = SWAGS[w]!;
    for (let i = 0; i <= SWAG_LEAVES; i++) {
      swagAt(cx, y0, u, x0, x1, sag, i / SWAG_LEAVES);
      const side = i % 2 ? 1 : -1;
      const r = u * (0.0085 + 0.003 * hash(i + w * 20));
      const rot = side * 0.9 + Math.sin(s.t * 1.8 + i + w) * 0.18;
      oval(ctx, PT.x, PT.y + side * r * 0.6, r, r * 0.62, rot);
    }
  }
  for (let k = 0; k < STRANDS.length; k++) {
    const [x, len] = STRANDS[k]!;
    for (let i = 1; i <= 4; i++) {
      const f = i / 4;
      const side = i % 2 ? 1 : -1;
      const r = u * 0.008;
      const rot = side * 0.8 + Math.sin(s.t * 1.8 + i + k * 3) * 0.2;
      oval(ctx, cx + x * u + side * r * 0.9 + Math.sin(f * 3) * u * 0.004, y0 + len * u * f, r, r * 0.62, rot);
    }
  }
  ink(ctx, lw * 1.3, INK);
  ctx.fillStyle = VINE;
  ctx.fill();
  // Blooms, pink and white: all inked in one stroke (c = 2), then filled by color.
  for (let c = 2; c >= 0; c--) {
    ctx.beginPath();
    for (let w = 0; w < SWAGS.length; w++) {
      const [x0, x1, sag] = SWAGS[w]!;
      for (let b = 0; b < SWAG_BLOOMS.length; b++) {
        if (c < 2 && (b + w) % 2 !== c) continue;
        swagAt(cx, y0, u, x0, x1, sag, SWAG_BLOOMS[b]!);
        circle(ctx, PT.x, PT.y + u * 0.004, u * 0.0085);
      }
    }
    if (c === 2) {
      ink(ctx, lw * 1.2, INK);
      continue;
    }
    ctx.fillStyle = BLOOMS[c]!;
    ctx.fill();
  }
}

/** Sideways ripple of the banner cloth at fraction f down its length. */
function ripple(t: number, u: number, f: number): number {
  return Math.sin(t * 1.7 - f * 2.6) * u * 0.009 * f;
}

const BANNER_STEPS = 6;

/** The banner's cloth outline: straight top, rippling sides, a swallowtail notch. */
function clothPath(ctx: Ctx, t: number, u: number, cx: number, y0: number, hw: number, len: number, notch: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - hw, y0);
  for (let i = 1; i <= BANNER_STEPS; i++) {
    const f = i / BANNER_STEPS;
    ctx.lineTo(cx - hw + ripple(t, u, f) - f * u * 0.004, y0 + len * f);
  }
  ctx.lineTo(cx + ripple(t, u, 1) * 0.9, y0 + len - notch);
  for (let i = BANNER_STEPS; i >= 1; i--) {
    const f = i / BANNER_STEPS;
    ctx.lineTo(cx + hw + ripple(t, u, f) + f * u * 0.004, y0 + len * f);
  }
  ctx.lineTo(cx + hw, y0);
  ctx.closePath();
}

/** The heraldic banner hanging under the corbels: royal blue, gold trim, a crown, a swallowtail. */
function banner(ctx: Ctx, s: Scene, cx: number, y0: number, lw: number): void {
  const u = s.u;
  const hw = u * 0.052;
  const len = u * 0.165;
  const notch = u * 0.032;
  const t = s.t;
  const STEPS = BANNER_STEPS;

  clothPath(ctx, t, u, cx, y0, hw, len, notch);
  ctx.fillStyle = ROYAL;
  ctx.fill();
  // A fold of shade down the right, swaying with the cloth: from the fold line across to the
  // cloth's right edge, ending on the swallowtail's slant (built inside the cloth, no clip).
  const r1 = ripple(t, u, 1);
  const nx = cx + r1 * 0.9;
  const rx = cx + hw + r1 + u * 0.004;
  ctx.beginPath();
  ctx.moveTo(cx + hw * 0.35, y0);
  for (let i = 1; i <= STEPS; i++) {
    const f = i / STEPS;
    const fx = cx + hw * (0.35 + 0.2 * Math.sin(t * 1.7 - f * 2.6)) + ripple(t, u, f);
    const g = i < STEPS ? 1 : Math.min(1, Math.max(0, (fx - nx) / (rx - nx)));
    ctx.lineTo(fx, y0 + len * f - notch * (1 - g));
  }
  ctx.lineTo(rx, y0 + len);
  for (let i = STEPS - 1; i >= 1; i--) {
    const f = i / STEPS;
    ctx.lineTo(cx + hw + ripple(t, u, f) + f * u * 0.004, y0 + len * f);
  }
  ctx.lineTo(cx + hw, y0);
  ctx.closePath();
  ctx.fillStyle = ROYAL_SHADE;
  ctx.fill();
  // Gold trim down both edges (stopping above the swallowtail) and across the top.
  ctx.beginPath();
  for (const side of SIDES) {
    ctx.moveTo(cx + side * hw * 0.72, y0);
    for (let i = 1; i <= STEPS; i++) {
      const f = i / STEPS;
      ctx.lineTo(cx + side * (hw * 0.72 + f * u * 0.004) + ripple(t, u, f), y0 + (len - notch * 0.6) * f);
    }
  }
  ctx.moveTo(cx - hw * 0.96, y0 + u * 0.016);
  ctx.lineTo(cx + hw * 0.96, y0 + u * 0.016);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1.2, u * 0.006);
  ctx.stroke();
  clothPath(ctx, t, u, cx, y0, hw, len, notch);
  ink(ctx, lw, INK);

  // Crown emblem, riding the cloth.
  const ey = y0 + len * 0.45;
  const ex = cx + ripple(t, u, 0.45);
  const c = u * 0.036;
  ctx.beginPath();
  ctx.moveTo(ex - c, ey + c * 0.55);
  ctx.lineTo(ex - c, ey - c * 0.35);
  ctx.lineTo(ex - c * 0.5, ey + c * 0.05);
  ctx.lineTo(ex, ey - c * 0.62);
  ctx.lineTo(ex + c * 0.5, ey + c * 0.05);
  ctx.lineTo(ex + c, ey - c * 0.35);
  ctx.lineTo(ex + c, ey + c * 0.55);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, ex - c, ey - c * 0.48, c * 0.15);
  circle(ctx, ex, ey - c * 0.77, c * 0.15);
  circle(ctx, ex + c, ey - c * 0.48, c * 0.15);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = GOLD_SHADE;
  ctx.fillRect(ex - c, ey + c * 0.3, c * 2, c * 0.25);
  ctx.beginPath();
  circle(ctx, ex, ey + c * 0.05, c * 0.13);
  ctx.fillStyle = CRIMSON;
  ctx.fill();

  // The rod it hangs from, with gold knobs.
  ctx.beginPath();
  ctx.moveTo(cx - hw * 1.35, y0);
  ctx.lineTo(cx + hw * 1.35, y0);
  inkedLine(ctx, WOOD, Math.max(1.5, u * 0.008), lw * 0.7, INK);
  ctx.beginPath();
  circle(ctx, cx - hw * 1.42, y0, u * 0.009);
  circle(ctx, cx + hw * 1.42, y0, u * 0.009);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

// ---------------------------------------------------------------- walls and towers

/** Curtain walls from the keep out to the screen edges, stepping down past each tower. */
function walls(ctx: Ctx, s: Scene, stop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const G = s.groundY;
  const lw = inkW(s);
  for (const side of SIDES) {
    // Segments: keep → tower 1 → tower 2 → tower 3 → beyond, each a step lower.
    for (let seg = 0; seg < 4; seg++) {
      const inner = seg === 0 ? BODY - 0.01 : Math.abs(TOWERS[(seg - 1) * 2]![0]);
      const outer = seg < 3 ? Math.abs(TOWERS[seg * 2]![0]) : 3;
      const a = cx + side * inner * u;
      const b = cx + side * outer * u;
      const x0 = Math.min(a, b);
      const x1 = Math.max(a, b);
      if (x1 < 0 || x0 > s.cssW) continue;
      const top = G + (WALL_TOP + seg * 0.035) * u;
      if (top > stop) continue;
      const wx0 = Math.max(-u * 0.05, x0);
      const wx1 = Math.min(s.cssW + u * 0.05, x1);
      masonry(ctx, s, wx0, wx1, top + WALL_CRENEL * u, stop, COURSE * u * 0.9, 50 + seg * 13 + side * 7, WALL_STONE, WALL_LIGHT, lw * 0.7);
      ctx.beginPath();
      merlons(ctx, wx0, wx1, top, WALL_CRENEL * u, 0.042 * u, 0.026 * u, top + WALL_CRENEL * u + 1);
      ctx.fillStyle = WALL_STONE;
      ctx.fill();
      ctx.beginPath();
      merlonCaps(ctx, wx0, wx1, top, 0.042 * u, 0.026 * u, u * 0.009);
      ctx.fillStyle = WALL_LIGHT;
      ctx.fill();
      ctx.beginPath();
      merlons(ctx, wx0, wx1, top, WALL_CRENEL * u, 0.042 * u, 0.026 * u, stop + 2);
      ink(ctx, lw * 1.1, INK);
    }
  }
}

/** A tower's cone roof outline: apex, curved flanks, a sagging eave. */
function conePath(ctx: Ctx, x: number, apex: number, top: number, r: number, half: number, eave: number, u: number): void {
  ctx.beginPath();
  ctx.moveTo(x, apex);
  ctx.quadraticCurveTo(x + half * 0.35, top - r * 0.6, x + half, eave);
  ctx.quadraticCurveTo(x, eave + u * 0.012, x - half, eave);
  ctx.quadraticCurveTo(x - half * 0.35, top - r * 0.6, x, apex);
  ctx.closePath();
}

/** A round tower: shaded sandstone drum, a corbelled ring, a terracotta cone roof and a pennant. */
function tower(ctx: Ctx, s: Scene, x: number, top: number, r: number, stop: number, flag: string, seed: number): void {
  const u = s.u;
  const lw = inkW(s);
  if (top - r * (CONE + 1.2) > s.cssH || x + r * 2 < 0 || x - r * 2 > s.cssW) return;
  // Drum
  const ringH = u * 0.022;
  const y0 = top + ringH;
  if (stop > y0) {
    ctx.fillStyle = STONE;
    ctx.fillRect(x - r, y0, r * 2, stop - y0);
    ctx.fillStyle = STONE_LIGHT;
    ctx.fillRect(x - r * 0.8, y0, r * 0.45, stop - y0);
    ctx.fillStyle = SHADE;
    ctx.fillRect(x + r * 0.25, y0, r * 0.75, stop - y0);
    ctx.fillRect(x + r * 0.62, y0, r * 0.38, stop - y0);
    // Courses curve around the drum; joints bunch up toward the edges.
    ctx.beginPath();
    for (let n = 0, y = y0 + u * 0.034; y < stop; n++, y += u * 0.042) {
      ctx.moveTo(x - r, y);
      ctx.quadraticCurveTo(x, y + r * 0.22, x + r, y);
      for (let j = 0; j < 3; j++) {
        const f = Math.sin(((j + (n % 2) * 0.5 + 0.5) / 3.5) * Math.PI - Math.PI / 2);
        const jx = x + f * r;
        const jy = y + r * 0.22 * (1 - f * f) * 0.5 - u * 0.042;
        ctx.moveTo(jx, jy + 1);
        ctx.lineTo(jx, jy + u * 0.042 - 1);
      }
    }
    ink(ctx, lw * 0.65, JOINT);
    ctx.beginPath();
    ctx.moveTo(x - r, stop + 2);
    ctx.lineTo(x - r, y0);
    ctx.moveTo(x + r, y0);
    ctx.lineTo(x + r, stop + 2);
    ink(ctx, lw * 1.2, INK);
    // An arched window, high enough to show over the hedge at the wall foot.
    const wy = y0 + u * 0.032;
    if (wy - u * 0.04 < stop) {
      ctx.beginPath();
      const ww = r * 0.3;
      ctx.moveTo(x - ww, wy + u * 0.016);
      ctx.lineTo(x - ww, wy);
      ctx.arc(x, wy, ww, Math.PI, 0);
      ctx.lineTo(x + ww, wy + u * 0.016);
      ctx.closePath();
      ctx.fillStyle = HOLE;
      ctx.fill();
      ink(ctx, lw * 0.8, INK);
    }
  }
  // Corbelled ring under the roof
  roundRectPath(ctx, x - r * 1.12, top, r * 2.24, ringH, u * 0.004);
  ctx.fillStyle = STONE_SHADE;
  ctx.fill();
  ink(ctx, lw, INK);

  // Cone roof: lit left, shaded right, rows of shingles, a gold finial.
  const apex = top - r * CONE;
  const half = r * 1.28;
  const eave = top + u * 0.006;
  conePath(ctx, x, apex, top, r, half, eave, u);
  ctx.fillStyle = ROOF;
  ctx.fill();
  // Lit wedge down the left flank, shaded wedge down the right, both following the edges.
  const sag = u * 0.0055;
  ctx.beginPath();
  ctx.moveTo(x, apex);
  ctx.quadraticCurveTo(x - half * 0.35, top - r * 0.6, x - half, eave);
  ctx.lineTo(x - half * 0.3, eave + sag);
  ctx.closePath();
  ctx.fillStyle = ROOF_LIGHT;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, apex);
  ctx.lineTo(x + half * 0.45, eave + sag * 0.9);
  ctx.lineTo(x + half, eave);
  ctx.quadraticCurveTo(x + half * 0.35, top - r * 0.6, x, apex);
  ctx.closePath();
  ctx.fillStyle = ROOF_SHADE;
  ctx.fill();
  // Shingle scallops, kept inside the flanks.
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const f = i / 4.6;
    const y = apex + (eave - apex) * f;
    const w = half * f * 0.82;
    const n = 2 + i;
    for (let k = 0; k < n; k++) {
      const a = x - w + (k * 2 * w) / n;
      const b = a + (2 * w) / n;
      ctx.moveTo(a, y);
      ctx.quadraticCurveTo((a + b) / 2, y + u * 0.008, b, y);
    }
  }
  ctx.strokeStyle = SHINGLE;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  conePath(ctx, x, apex, top, r, half, eave, u);
  ink(ctx, lw * 1.1, INK);

  // Pole and pennant streaming in the wind, rippling.
  const poleTop = apex - u * 0.036;
  ctx.beginPath();
  ctx.moveTo(x, apex);
  ctx.lineTo(x, poleTop);
  inkedLine(ctx, WOOD, Math.max(1.2, u * 0.004), lw * 0.6, INK);
  const L = u * 0.062 * WIND;
  const H = u * 0.022;
  const t = s.t * 4.2 + seed;
  ctx.beginPath();
  ctx.moveTo(x, poleTop);
  const STEPS = 5;
  for (let i = 1; i <= STEPS; i++) {
    const f = i / STEPS;
    ctx.lineTo(x + L * f, poleTop + (H / 2) * f + Math.sin(t - f * 3.2) * u * 0.006 * f);
  }
  for (let i = STEPS - 1; i >= 0; i--) {
    const f = i / STEPS;
    ctx.lineTo(x + L * f, poleTop + H - (H / 2) * f + Math.sin(t - f * 3.2) * u * 0.006 * f);
  }
  ctx.closePath();
  ctx.fillStyle = flag;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, x, apex - u * 0.002, u * 0.008);
  circle(ctx, x, poleTop, u * 0.006);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

// ---------------------------------------------------------------- greenery at the foot

/** Bush lumps along the wall foot, per side: [x (u from center, toward the edge), radius (u)]. */
const BUSHES = Array.from({ length: 16 }, (_, i) => [0.2 + i * 0.105 + hash(i + 300) * 0.03, 0.034 + hash(i + 310) * 0.014] as const);

/** Flowering bushes along the foot of the walls either side of the keep. */
function bushes(ctx: Ctx, s: Scene, stop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const y = s.groundY + BUSH_TOP * u;
  if (y - u * 0.05 > stop) return;
  const lw = inkW(s);
  const sway = Math.sin(s.t * 0.9) * u * 0.0015;
  // One hedge: every bush's lobes plus a band under them, inked once so only the outer contour shows.
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (const side of SIDES) {
      for (let i = 0; i < BUSHES.length; i++) {
        const [bx, br] = BUSHES[i]!;
        const x = cx + side * bx * u;
        if (x < -br * u * 2 || x > s.cssW + br * u * 2) continue;
        const r = br * u;
        const yy = y + r * 0.7;
        if (pass === 0) {
          circle(ctx, x - r * 0.5 + sway, yy, r * 0.75);
          circle(ctx, x + sway, yy - r * 0.35, r);
          circle(ctx, x + r * 0.55 + sway, yy + r * 0.05, r * 0.72);
        } else {
          circle(ctx, x - r * 0.3 + sway, yy - r * 0.72, r * 0.36);
          circle(ctx, x - r * 0.75 + sway, yy - r * 0.2, r * 0.22);
        }
      }
    }
    if (pass === 0) {
      ctx.rect(-u * 0.05, y + u * HEDGE_BAND, s.cssW + u * 0.1, stop - y);
      ink(ctx, lw * 2, INK);
      ctx.fillStyle = GRASS;
      ctx.fill();
      // Shade low in the hedge.
      ctx.fillStyle = GRASS_DARK;
      ctx.fillRect(0, y + u * 0.045, s.cssW, stop - y);
    } else {
      ctx.fillStyle = GRASS_LIGHT;
      ctx.fill();
    }
  }
  // A scatter of blooms on the bushes: every bloom inked in one stroke, then filled by color
  // (c = 3 is the ink pass over all of them).
  for (let c = 3; c >= 0; c--) {
    ctx.beginPath();
    for (const side of SIDES) {
      for (let i = c === 3 ? 0 : c; i < BUSHES.length; i += c === 3 ? 1 : 3) {
        const [bx, br] = BUSHES[i]!;
        const x = cx + side * bx * u + (hash(i + 330 + side) - 0.5) * br * u;
        if (x < 0 || x > s.cssW) continue;
        circle(ctx, x + sway, y + br * u * (0.25 + hash(i + 340) * 0.5), u * 0.0075);
      }
    }
    if (c === 3) {
      ink(ctx, lw * 1.1, INK);
      continue;
    }
    ctx.fillStyle = BLOOMS[c === 2 ? 3 : c]!;
    ctx.fill();
  }
}

// ---------------------------------------------------------------- bailey life

/** A leafy tree in the bailey behind the left wall, with an owl in it. */
function baileyTree(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = s.cssW / 2 - 0.298 * u;
  const y = s.groundY + 0.135 * u;
  const r = u * 0.05;
  const lw = inkW(s);
  const sway = Math.sin(s.t * 0.9) * u * 0.002;
  ctx.beginPath();
  circle(ctx, x - r * 0.55 + sway, y + r * 0.1, r * 0.7);
  circle(ctx, x + sway, y - r * 0.35, r * 0.85);
  circle(ctx, x + r * 0.62 + sway, y + r * 0.15, r * 0.68);
  circle(ctx, x + sway * 0.5, y + r * 0.6, r * 0.8);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = LEAF[0];
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.35 + sway, y - r * 0.6, r * 0.38);
  circle(ctx, x - r * 0.75 + sway, y - r * 0.05, r * 0.28);
  ctx.fillStyle = mix(LEAF[0], "#e8ffb0", 0.4);
  ctx.fill();
  // Branch the owl sits on
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2, y + r * 0.25);
  ctx.lineTo(x + r * 0.9, y + r * 0.05);
  inkedLine(ctx, WOOD, Math.max(1.5, u * 0.006), lw * 0.6, INK);
  owl(ctx, s, x + r * 0.4, y + r * 0.13, u * 0.046, lw * 0.9);
}

function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

/** The squirrel's run along the right wall: dashes along, sits up, dashes back. */
function wallSquirrel(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const period = 9;
  const p = ((s.t % period) + period) % period;
  let f: number;
  let run = 0;
  let dir = 1;
  if (p < 1.3) {
    f = smoothstep(p / 1.3);
    run = 1;
  } else if (p < 4.5) {
    f = 1;
    dir = -1; // turned round, sitting up looking back
  } else if (p < 5.8) {
    f = 1 - smoothstep((p - 4.5) / 1.3);
    run = 1;
    dir = -1;
  } else {
    f = 0;
  }
  // Its run stops short of the near tower, so its tail never brushes the roof.
  const x = s.cssW / 2 + (0.235 + f * 0.055) * u;
  const y = s.groundY + WALL_TOP * u;
  squirrel(ctx, s, x, y, u * 0.04, dir, run, inkW(s) * 0.85);
}

// ---------------------------------------------------------------- layer

/** Everything of the castle behind the tower: drawn last in the ground layer. */
export function castle(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (s.groundY - u * 0.12 > s.cssH) return;
  // Nothing shows under the near grass cap, so the masonry stops there.
  const stop = Math.min(s.cssH, layerGround(s, 1.6) + u * 0.34);
  // The hedge's solid band hides the walls and towers below its top, so they stop there.
  const foot = Math.min(stop, s.groundY + (BUSH_TOP + HEDGE_BAND) * u + 1);
  baileyTree(ctx, s);
  walls(ctx, s, foot);
  for (let i = 0; i < TOWERS.length; i++) {
    const [tx, top, r] = TOWERS[i]!;
    tower(ctx, s, s.cssW / 2 + tx * u, s.groundY + top * u, r * u, foot, FLAGS[i]!, i * 1.7);
  }
  bushes(ctx, s, stop);
  wallSquirrel(ctx, s);
  keep(ctx, s, stop);
}

export const __parts = { keep, walls, tower, bushes, baileyTree, wallSquirrel, banner, masonry, TOWERS };

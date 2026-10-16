import { alpha, circle, hash, ink, inkedLine, oval, roundRectPath, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { INK, PALETTE, tone, type Tone } from "./colors";
import { addLeaf, LEAF_COLORS } from "./leaves";

// Harvest props on the stubble field, beside the tower: a scarecrow behind a stack of hay
// bales on the left, corn shocks behind a pile of pumpkins and gourds on the right, leaves
// lying about. Cartoon style: flat bright fills, a lit top, a shaded bottom, an ink outline.
//
// Props are placed by field depth so they sit on the field's own perspective: z = TOWER_DEPTH
// is the tower's line (groundY), smaller z is nearer (lower on screen, bigger, and dropping away
// faster on a climb). Paths are built in each prop's local units (1 = PROP * u at the tower's
// depth) and filled and inked in screen space. Drawn back to front.

const HAY = tone("#f6c64e", 0.42, 0.22);
const HAY_TOP = "#ffe596";
const HAY_SIDE = "#d9a23a";
const TWINE = "#c4452f";
const PUMPKIN = tone("#ff8a1f");
const PUMPKIN_GOLD = tone("#ffb22e");
const PUMPKIN_CREAM = tone("#fff0d4", 0.5, 0.16);
const PUMPKIN_GREEN = tone("#9fd043");
const STEM = "#7d9a30";
const VINE = "#9cc93f";
const GOURD = tone("#ffd84a");
const GOURD_NECK = "#8fc43c";
const STALKS: Tone = { base: "#ecc77e", light: "#f8e2ae", shade: "#cf9f55" };
const CORN_LEAF = tone("#d7bb62");
const TASSEL = "#ffe08a";
const EAR = tone("#ffd43a");
const HUSK = tone("#c9cf6a");
const WOOD = tone("#a8693a");
const DENIM = tone("#4f86e0");
const SHIRT = tone("#ee4b3d");
const BURLAP = tone("#f2d29a", 0.4, 0.2);
const HAT = tone("#f4c94e");
const STRAW = "#ffd860";
const CROW = tone("#54466a", 0.3, 0.3);
const BEAK = "#ffa22e";
const LEAF_PILE = tone("#e06a2a", 0.4, 0.22);
const STRAW_PILE = tone("#f0c04c", 0.4, 0.2);
const SHADOW = alpha(INK, 0.2);
const STUBBLE = alpha(PALETTE.fieldNear, 0.9);

/** Prop size relative to u at the tower's depth: small enough that the tower stays the hero. */
const PROP = 0.62;

/** Screen position and scale of field point X (u from screen center, at the tower's depth) at depth z. */
const at = { x: 0, y: 0, k: 1 };
function place(s: Scene, X: number, z: number): typeof at {
  at.k = TOWER_DEPTH / z;
  at.y = fieldY(s, z);
  at.x = s.cssW / 2 + X * s.u * at.k;
  return at;
}

/** Start a path in local prop units; call ctx.restore() before filling and inking in screen space. */
function local(ctx: Ctx, x: number, y: number, sc: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.beginPath();
}

/**
 * Fill the current path cel-shaded, then ink it: the body color, a lit band across the top and
 * a shaded band across the bottom (screen y, clipped to the shape).
 */
function cel(ctx: Ctx, t: Tone, top: number, bottom: number, lw: number, lit = 0.22, dark = 0.3): void {
  ctx.fillStyle = t.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const h = bottom - top;
  ctx.fillStyle = t.light;
  ctx.fillRect(-1e4, top - 2, 3e4, h * lit + 2);
  ctx.fillStyle = t.shade;
  ctx.fillRect(-1e4, bottom - h * dark, 3e4, h * dark + 2);
  ctx.restore();
  ink(ctx, lw, INK);
}

/** Fill flat and ink. */
function flat(ctx: Ctx, fill: string, lw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, lw, INK);
}

// ---------------------------------------------------------------------------------------------
// Hay

/** Straw texture dashes on a bale face, as fractions of its width/height. */
const STRAW_DASH = Array.from({ length: 7 }, (_, i) => [hash(i + 400) * 0.74 + 0.08, hash(i + 420) * 0.6 + 0.22] as const);
const TWINE_X = [-0.038, 0.038] as const;
const BALE_W = 0.14;
const BALE_H = 0.085;
const BALE_D = 0.03;
/**
 * The bale stack (two side by side, one on top): center X and depth. Near enough that its top
 * sits well under the tower's floor line, and narrow enough that it ends left of the base bar
 * with the left screen edge clear, so the tower never looks like it rests on the hay.
 */
const BALES_X = -0.246;
const BALES_Z = 2.1;

/** Square hay bale, base centered at (x, y). `lean` turns its top and side toward the vanishing point. */
function hayBale(ctx: Ctx, x: number, y: number, sc: number, lw: number, lean: number): void {
  const w = BALE_W;
  const h = BALE_H;
  const d = BALE_D;
  const dx = lean * d * 0.7;
  const sx = lean > 0 ? w / 2 : -w / 2; // the side that shows
  // Side face
  local(ctx, x, y, sc);
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, -h);
  ctx.lineTo(sx + dx, -h - d);
  ctx.lineTo(sx + dx, -d);
  ctx.closePath();
  ctx.restore();
  flat(ctx, HAY_SIDE, lw);
  // Top face
  local(ctx, x, y, sc);
  ctx.moveTo(-w / 2, -h);
  ctx.lineTo(-w / 2 + dx, -h - d);
  ctx.lineTo(w / 2 + dx, -h - d);
  ctx.lineTo(w / 2, -h);
  ctx.closePath();
  ctx.restore();
  flat(ctx, HAY_TOP, lw);
  // Front face
  local(ctx, x, y, sc);
  roundRectPath(ctx, -w / 2, -h, w, h, 0.01);
  ctx.restore();
  cel(ctx, HAY, y - h * sc, y, lw, 0.2, 0.3);

  local(ctx, x, y, sc);
  for (const [fx, fy] of STRAW_DASH) {
    const px = -w / 2 + fx * w;
    const py = -h + fy * h;
    ctx.moveTo(px, py);
    ctx.lineTo(px + w * 0.1, py - h * 0.08);
  }
  ctx.restore();
  ctx.strokeStyle = HAY.shade;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();

  local(ctx, x, y, sc);
  for (const tx of TWINE_X) {
    ctx.moveTo(tx, -0.004);
    ctx.lineTo(tx, -h);
    ctx.lineTo(tx + dx, -h - d);
  }
  ctx.restore();
  ctx.strokeStyle = TWINE;
  ctx.lineWidth = Math.max(1.2, lw * 0.9);
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// Pumpkins and gourds

/** Pumpkin of radius r (local units) sitting with its base at (x, y): three inked lobes, a stem, a vine curl. */
function pumpkin(ctx: Ctx, x: number, y: number, sc: number, lw: number, r: number, t: Tone, tilt: number): void {
  const ry = r * 0.72;
  const top = y - ry * 2 * sc;
  // Side lobes, then the middle lobe over them: the inked edges read as the ribs.
  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  oval(ctx, -r * 0.42, -ry, r * 0.58, ry * 0.94);
  oval(ctx, r * 0.42, -ry, r * 0.58, ry * 0.94);
  ctx.restore();
  cel(ctx, t, top, y, lw, 0.16, 0.34);
  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  oval(ctx, 0, -ry, r * 0.46, ry);
  ctx.restore();
  cel(ctx, t, top, y, lw, 0.28, 0.3);

  // Stem, and a curl of vine off it
  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  ctx.moveTo(-r * 0.04, -ry * 1.86);
  ctx.quadraticCurveTo(-r * 0.02, -ry * 2.3, r * 0.16, -ry * 2.42);
  ctx.restore();
  inkedLine(ctx, STEM, Math.max(2, r * sc * 0.2), lw * 0.8, INK);
  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  ctx.moveTo(r * 0.02, -ry * 2.05);
  ctx.bezierCurveTo(r * 0.36, -ry * 2.2, r * 0.5, -ry * 1.8, r * 0.3, -ry * 1.72);
  ctx.restore();
  inkedLine(ctx, VINE, Math.max(1, lw * 0.5), lw * 0.5, INK);
}

/** Crookneck squash standing up: a round bulb with a green neck curling over at the top. */
function gourd(ctx: Ctx, x: number, y: number, sc: number, lw: number): void {
  local(ctx, x, y, sc);
  ctx.moveTo(-0.042, -0.03);
  ctx.bezierCurveTo(-0.046, 0.006, 0.046, 0.006, 0.042, -0.03);
  ctx.bezierCurveTo(0.04, -0.058, 0.014, -0.066, 0.013, -0.092);
  ctx.quadraticCurveTo(0.014, -0.118, 0.036, -0.124);
  ctx.quadraticCurveTo(0.046, -0.136, 0.03, -0.14);
  ctx.quadraticCurveTo(-0.008, -0.136, -0.012, -0.094);
  ctx.bezierCurveTo(-0.014, -0.066, -0.04, -0.058, -0.042, -0.03);
  ctx.closePath();
  ctx.restore();
  cel(ctx, GOURD, y - 0.14 * sc, y, lw, 0.2, 0.32);
  // Green tip of the neck
  local(ctx, x, y, sc);
  ctx.moveTo(0.022, -0.137);
  ctx.quadraticCurveTo(0.044, -0.138, 0.042, -0.122);
  ctx.quadraticCurveTo(0.03, -0.118, 0.022, -0.124);
  ctx.closePath();
  ctx.restore();
  flat(ctx, GOURD_NECK, lw * 0.8);
}

// ---------------------------------------------------------------------------------------------
// Corn

/** Corn tassels: tip x, tip y, control x, control y (all from the tie). */
const TASSELS = [
  [-0.075, -0.34, -0.03, -0.4],
  [-0.04, -0.41, -0.02, -0.42],
  [0.0, -0.44, -0.006, -0.4],
  [0.045, -0.41, 0.022, -0.43],
  [0.078, -0.35, 0.035, -0.41],
] as const;
const STALK_FAN = [-0.6, -0.2, 0.2, 0.6] as const;
/** Dry leaves hanging off the bundle: root x, root y, side, length. */
const HANGING = [
  [-0.045, -0.2, -1, 0.07],
  [0.04, -0.23, 1, 0.065],
  [-0.07, -0.09, -1, 0.06],
  [0.066, -0.11, 1, 0.062],
] as const;

/** Corn shock: a teepee of dried stalks tied near the top, tassels fanning out, leaves hanging off. */
function cornShock(ctx: Ctx, x: number, y: number, sc: number, lw: number, phase: number): void {
  const stir = 0.006 * Math.sin(phase);
  local(ctx, x, y, sc);
  for (const [tx, ty, cx, cy] of TASSELS) {
    ctx.moveTo(0, -0.29);
    ctx.quadraticCurveTo(cx, cy, tx + stir, ty);
  }
  ctx.restore();
  inkedLine(ctx, TASSEL, Math.max(1.4, lw * 0.9), lw * 0.6, INK);

  local(ctx, x, y, sc);
  ctx.moveTo(-0.1, 0);
  ctx.quadraticCurveTo(-0.07, -0.15, -0.018, -0.3);
  ctx.lineTo(0.018, -0.3);
  ctx.quadraticCurveTo(0.07, -0.15, 0.1, 0);
  ctx.closePath();
  ctx.restore();
  cel(ctx, STALKS, y - 0.3 * sc, y, lw, 0.18, 0.24);

  local(ctx, x, y, sc);
  for (const f of STALK_FAN) {
    ctx.moveTo(f * 0.1, -0.004);
    ctx.quadraticCurveTo(f * 0.06, -0.16, f * 0.018, -0.29);
  }
  ctx.restore();
  ctx.strokeStyle = STALKS.shade;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();

  local(ctx, x, y, sc);
  for (const [rx, ry, side, len] of HANGING) {
    const tx = rx + side * len + stir;
    const ty = ry + len * 0.8;
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + side * len * 0.7, ry - len * 0.35, tx, ty);
    ctx.quadraticCurveTo(rx + side * len * 0.5, ry - len * 0.02, rx, ry + len * 0.18);
    ctx.closePath();
  }
  ctx.restore();
  flat(ctx, CORN_LEAF.base, lw * 0.8);

  local(ctx, x, y, sc);
  ctx.moveTo(-0.03, -0.285);
  ctx.lineTo(0.03, -0.285);
  ctx.restore();
  inkedLine(ctx, TWINE, Math.max(2, lw * 1.3), lw * 0.6, INK);
}

/** Ears of corn leaning on a shock: center x, center y, half-width, half-length, lean. */
const EARS = [
  [-0.022, -0.05, 0.018, 0.052, -0.35],
  [0.016, -0.046, 0.017, 0.048, 0.25],
] as const;
/** Kernel dots along each ear, as (across, along) fractions. */
const KERNELS = [
  [-0.4, -0.55],
  [0.4, -0.35],
  [-0.4, -0.1],
  [0.4, 0.15],
  [-0.4, 0.4],
  [0, -0.75],
  [0, -0.25],
  [0, 0.25],
] as const;

function cornEars(ctx: Ctx, x: number, y: number, sc: number, lw: number): void {
  // Husks peeled back at the foot of each ear
  local(ctx, x, y, sc);
  for (const [ex, ey, , ry, rot] of EARS) {
    const bx = ex - Math.sin(rot) * ry * 0.9;
    const by = ey + Math.cos(rot) * ry * 0.9;
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - 0.03, by - 0.01, bx - 0.04, by - 0.04);
    ctx.quadraticCurveTo(bx - 0.012, by - 0.03, bx, by);
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 0.03, by - 0.012, bx + 0.038, by - 0.045);
    ctx.quadraticCurveTo(bx + 0.012, by - 0.03, bx, by);
  }
  ctx.restore();
  flat(ctx, HUSK.base, lw * 0.8);

  local(ctx, x, y, sc);
  for (const [ex, ey, rx, ry, rot] of EARS) oval(ctx, ex, ey, rx, ry, rot);
  ctx.restore();
  cel(ctx, EAR, y - 0.1 * sc, y, lw * 0.9, 0.25, 0.25);

  local(ctx, x, y, sc);
  for (const [ex, ey, rx, ry, rot] of EARS) {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    for (const [a, b] of KERNELS) circle(ctx, ex + c * a * rx - sn * b * ry, ey + sn * a * rx + c * b * ry, 0.0045);
  }
  ctx.restore();
  ctx.fillStyle = EAR.shade;
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Scarecrow

const PLAID_X = [-0.11, -0.03, 0.03, 0.11] as const;
const SIDES = [-1, 1] as const;
const CUFF_FAN = [-0.55, 0, 0.55] as const;
const ANKLE_FAN = [-0.45, 0, 0.45] as const;
const EYES_X = [-0.018, 0.018] as const;

/** Scarecrow on a post, base where the post enters the straw at (x, y). */
function scarecrow(ctx: Ctx, x: number, y: number, sc: number, lw: number, t: number): void {
  const flutter = Math.sin(t * 2.3) * 0.004;
  const thin = lw * 0.8;
  // Post
  local(ctx, x, y, sc);
  ctx.rect(-0.01, -0.37, 0.02, 0.37);
  ctx.restore();
  cel(ctx, WOOD, y - 0.37 * sc, y, thin, 0.1, 0.2);

  // Straw poking out of the trouser legs
  local(ctx, x, y, sc);
  for (const side of SIDES) {
    for (const a of ANKLE_FAN) {
      ctx.moveTo(side * 0.032, -0.09);
      ctx.lineTo(side * 0.032 + 0.022 * Math.sin(a), -0.09 + 0.026 * Math.cos(a));
    }
  }
  ctx.restore();
  inkedLine(ctx, STRAW, Math.max(1.4, lw * 0.8), lw * 0.5, INK);

  // Overalls: two legs hanging from the waist, and a patch.
  local(ctx, x, y, sc);
  ctx.moveTo(-0.048, -0.205);
  ctx.lineTo(-0.052 - flutter, -0.088);
  ctx.lineTo(-0.012, -0.088);
  ctx.lineTo(0, -0.17);
  ctx.lineTo(0.012, -0.088);
  ctx.lineTo(0.052 + flutter, -0.088);
  ctx.lineTo(0.048, -0.205);
  ctx.closePath();
  ctx.restore();
  cel(ctx, DENIM, y - 0.205 * sc, y - 0.088 * sc, lw, 0.18, 0.3);
  local(ctx, x, y, sc);
  ctx.rect(0.018, -0.15, 0.022, 0.024);
  ctx.restore();
  flat(ctx, "#ffd23f", thin * 0.8);

  // Shirt with sleeves along the crossbar, ragged cuffs.
  local(ctx, x, y, sc);
  ctx.moveTo(-0.05, -0.318);
  ctx.lineTo(-0.15, -0.312);
  ctx.lineTo(-0.162, -0.3 + flutter);
  ctx.lineTo(-0.152, -0.29);
  ctx.lineTo(-0.16, -0.278 + flutter);
  ctx.lineTo(-0.145, -0.272);
  ctx.lineTo(-0.05, -0.265);
  ctx.lineTo(-0.048, -0.195);
  ctx.lineTo(0.048, -0.195);
  ctx.lineTo(0.05, -0.265);
  ctx.lineTo(0.145, -0.272);
  ctx.lineTo(0.16, -0.278 - flutter);
  ctx.lineTo(0.152, -0.29);
  ctx.lineTo(0.162, -0.3 - flutter);
  ctx.lineTo(0.15, -0.312);
  ctx.lineTo(0.05, -0.318);
  ctx.closePath();
  ctx.restore();
  cel(ctx, SHIRT, y - 0.318 * sc, y - 0.195 * sc, lw, 0.2, 0.28);

  // Plaid: darker stripes down the shirt and across the sleeves.
  local(ctx, x, y, sc);
  for (const px of PLAID_X) {
    ctx.moveTo(px, -0.31);
    ctx.lineTo(px, Math.abs(px) > 0.06 ? -0.276 : -0.2);
  }
  ctx.moveTo(-0.046, -0.24);
  ctx.lineTo(0.046, -0.24);
  ctx.moveTo(-0.14, -0.293);
  ctx.lineTo(-0.055, -0.29);
  ctx.moveTo(0.055, -0.29);
  ctx.lineTo(0.14, -0.293);
  ctx.restore();
  ctx.strokeStyle = SHIRT.shade;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();

  // Straw tufts at the cuffs and the collar
  local(ctx, x, y, sc);
  for (const side of SIDES) {
    for (const a of CUFF_FAN) {
      ctx.moveTo(side * 0.158, -0.292);
      ctx.lineTo(side * (0.158 + 0.026 * Math.cos(a)), -0.292 + 0.026 * Math.sin(a) + flutter);
    }
  }
  ctx.moveTo(-0.02, -0.316);
  ctx.lineTo(-0.032, -0.33);
  ctx.moveTo(0.02, -0.316);
  ctx.lineTo(0.032, -0.33);
  ctx.restore();
  inkedLine(ctx, STRAW, Math.max(1.4, lw * 0.8), lw * 0.5, INK);

  // Burlap head with a stitched face
  local(ctx, x, y, sc);
  oval(ctx, 0, -0.362, 0.046, 0.048);
  ctx.restore();
  cel(ctx, BURLAP, y - 0.41 * sc, y - 0.314 * sc, lw, 0.2, 0.25);
  local(ctx, x, y, sc);
  for (const ex of EYES_X) {
    ctx.moveTo(ex - 0.008, -0.376);
    ctx.lineTo(ex + 0.008, -0.362);
    ctx.moveTo(ex + 0.008, -0.376);
    ctx.lineTo(ex - 0.008, -0.362);
  }
  ctx.moveTo(-0.022, -0.342);
  ctx.quadraticCurveTo(0, -0.332, 0.022, -0.342);
  for (let i = 0; i < 4; i++) {
    const sx = -0.016 + i * 0.011;
    ctx.moveTo(sx, -0.345);
    ctx.lineTo(sx, -0.334);
  }
  ctx.restore();
  ink(ctx, Math.max(1.2, lw * 0.7), INK);
  local(ctx, x, y, sc);
  ctx.moveTo(-0.007, -0.358);
  ctx.lineTo(0.007, -0.358);
  ctx.lineTo(0, -0.348);
  ctx.closePath();
  ctx.restore();
  flat(ctx, BEAK, thin * 0.7);

  // Straw hat with a band
  local(ctx, x, y, sc);
  oval(ctx, 0.002, -0.398, 0.085, 0.015, -0.08);
  ctx.restore();
  cel(ctx, HAT, y - 0.413 * sc, y - 0.383 * sc, lw, 0.3, 0.35);
  local(ctx, x, y, sc);
  ctx.moveTo(-0.036, -0.398);
  ctx.lineTo(-0.026, -0.446);
  ctx.quadraticCurveTo(0, -0.46, 0.028, -0.444);
  ctx.lineTo(0.038, -0.402);
  ctx.quadraticCurveTo(0, -0.392, -0.036, -0.398);
  ctx.closePath();
  ctx.restore();
  cel(ctx, HAT, y - 0.46 * sc, y - 0.395 * sc, lw, 0.25, 0.2);
  local(ctx, x, y, sc);
  ctx.moveTo(-0.033, -0.412);
  ctx.quadraticCurveTo(0, -0.404, 0.035, -0.414);
  ctx.restore();
  ctx.strokeStyle = TWINE;
  ctx.lineWidth = Math.max(1.5, 0.008 * sc);
  ctx.stroke();

  // A crow perched on the left arm, beak and eye to the left.
  local(ctx, x, y, sc);
  ctx.moveTo(-0.106, -0.322);
  ctx.lineTo(-0.136, -0.314);
  ctx.lineTo(-0.132, -0.328);
  ctx.closePath();
  oval(ctx, -0.112, -0.335, 0.022, 0.014, 0.25);
  circle(ctx, -0.13, -0.35, 0.011);
  ctx.restore();
  cel(ctx, CROW, y - 0.361 * sc, y - 0.314 * sc, thin, 0.2, 0.3);
  local(ctx, x, y, sc);
  ctx.moveTo(-0.138, -0.354);
  ctx.lineTo(-0.156, -0.348);
  ctx.lineTo(-0.138, -0.344);
  ctx.closePath();
  ctx.restore();
  flat(ctx, BEAK, thin * 0.7);
  local(ctx, x, y, sc);
  circle(ctx, -0.132, -0.352, 0.0035);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Ground details

/** Low heap (leaves or straw) a cluster is sunk into: a row of bumps, w half-width in local units. */
function heap(ctx: Ctx, x: number, y: number, sc: number, lw: number, w: number, seed: number, t: Tone): void {
  const n = 6;
  local(ctx, x, y, sc);
  ctx.moveTo(-w, 0.004);
  for (let i = 1; i <= n; i++) {
    const fx = -w + (2 * w * i) / n;
    const peak = 0.016 + 0.012 * hash(seed + i);
    const arch = Math.sin((Math.PI * (i - 0.5)) / n);
    ctx.quadraticCurveTo(fx - w / n, -peak * 2 * arch, fx, i === n ? 0.004 : -0.006 * arch);
  }
  ctx.closePath();
  ctx.restore();
  cel(ctx, t, y - 0.035 * sc, y + 0.004 * sc, lw * 0.85, 0.3, 0.3);
}

/** Leaves lying on the field: [X, z, angle, color, oak]. */
const LITTER = [
  [-0.37, 2.05, 0.4, 0, 0],
  [-0.12, 2.25, -1.1, 1, 1],
  [-0.2, 1.95, 2.2, 2, 0],
  [0.05, 2.0, 0.9, 0, 0],
  [0.14, 2.45, -0.5, 3, 0],
  [0.25, 1.75, 1.9, 1, 1],
  [-0.05, 2.6, 2.6, 2, 0],
  [0.27, 2.62, -2.2, 0, 1],
  [-0.3, 2.55, 1.2, 3, 0],
  [-0.235, 1.82, -0.7, 1, 1],
  [0.2, 1.8, 2.9, 2, 1],
  [-0.02, 1.86, 1.5, 3, 0],
] as const;

function litter(ctx: Ctx, s: Scene, lw: number): void {
  for (let c = 0; c < LEAF_COLORS.length; c++) {
    ctx.beginPath();
    let any = false;
    for (const [X, z, ang, color, oak] of LITTER) {
      if (color !== c) continue;
      const p = place(s, X, z);
      if (p.y > s.cssH + s.u * 0.1) continue;
      const rock = Math.sin(s.t * 1.7 + ang * 5) * 0.1;
      addLeaf(ctx, oak === 1, p.x, p.y, s.u * 0.044 * p.k, ang + rock, 1, 0.68, false);
      any = true;
    }
    if (!any) continue;
    ctx.fillStyle = LEAF_COLORS[c]!;
    ctx.fill();
    ink(ctx, Math.max(1.1, lw * 0.55), INK);
  }
}

/** Stubble tufts across the field, behind and around the props: [X, z]. */
const TUFTS = Array.from({ length: 80 }, (_, i) => [(hash(i + 700) - 0.5) * 1.4, 1.75 + hash(i + 760) * hash(i + 790) * 9] as const);

function stubble(ctx: Ctx, s: Scene): void {
  const left = s.baseX - s.u * 0.05;
  const right = s.baseX + s.baseW + s.u * 0.05;
  ctx.beginPath();
  for (const [X, z] of TUFTS) {
    const p = place(s, X, z);
    const h = s.u * 0.014 * p.k;
    const w = h * 0.45;
    // Whole tufts only (none cut by the screen edges), and the tower's column clear above its
    // floor line.
    const reach = w * 1.4 + 1;
    if (p.y > s.cssH + 4 || p.x - reach < 0 || p.x + reach > s.cssW) continue;
    if (p.y - h < s.groundY && p.x > left && p.x < right) continue;
    ctx.moveTo(p.x - w, p.y);
    ctx.lineTo(p.x - w * 1.4, p.y - h * 0.8);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - h);
    ctx.moveTo(p.x + w, p.y);
    ctx.lineTo(p.x + w * 1.4, p.y - h * 0.8);
  }
  ctx.strokeStyle = STUBBLE;
  ctx.lineWidth = Math.max(1, s.u * 0.0032);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Soft contact shadows under each cluster: [X, z, half-width (local units)]. */
const SHADOWS = [
  [-0.39, 3.15, 0.07],
  [BALES_X, BALES_Z, 0.16],
  [-0.095, 2.05, 0.06],
  [0.537, 3.9, 0.12],
  [0.356, 3.2, 0.12],
  [0.24, 2.3, 0.22],
  [0.22, 2.0, 0.07],
  [0.322, 2.15, 0.05],
  [0.27, 1.92, 0.045],
] as const;

function shadows(ctx: Ctx, s: Scene, sc: number): void {
  ctx.beginPath();
  for (const [X, z, w] of SHADOWS) {
    const p = place(s, X, z);
    oval(ctx, p.x, p.y, w * sc * p.k, w * sc * p.k * 0.14);
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------

export function harvest(ctx: Ctx, s: Scene): void {
  // Stubble covers the whole field (each tuft culls itself).
  stubble(ctx, s);
  // Everything else is near the tower; once that part of the field has dropped away, skip it.
  if (fieldY(s, 4) - s.u * 0.3 > s.cssH) return;
  const sc = s.u * PROP;
  const lw = Math.max(1.5, s.u * 0.0055);

  // Flat things first: contact shadows and fallen leaves lie on the field, under every prop.
  shadows(ctx, s, sc);
  litter(ctx, s, lw);

  // Right, back: two corn shocks.
  let p = place(s, 0.537, 3.9);
  cornShock(ctx, p.x, p.y, sc * p.k, lw, s.t * 1.1);
  // Its hanging leaves just clear the tower's column.
  p = place(s, 0.356, 3.2);
  cornShock(ctx, p.x, p.y, sc * p.k, lw, s.t * 1.3 + 1);

  // Left, back: the scarecrow behind a stack of hay. The bales hide its post at the start; as
  // the field spreads out on a climb, the straw heaped round its foot shows.
  p = place(s, -0.39, 3.15);
  scarecrow(ctx, p.x, p.y, sc * p.k, lw, s.t);
  heap(ctx, p.x, p.y, sc * p.k, lw, 0.065, 19, STRAW_PILE);

  p = place(s, 0.3, 3.0);
  cornEars(ctx, p.x, p.y, sc * p.k, lw);

  // The bale stack: two side by side, one on top.
  const half = (BALE_W * PROP) / 2;
  p = place(s, BALES_X - half, BALES_Z);
  hayBale(ctx, p.x, p.y, sc * p.k, lw, 1);
  p = place(s, BALES_X + half, BALES_Z);
  hayBale(ctx, p.x, p.y, sc * p.k, lw, 1);
  p = place(s, BALES_X, BALES_Z);
  hayBale(ctx, p.x, p.y - BALE_H * sc * p.k, sc * p.k, lw, 1);

  // Right, front: a pile of pumpkins and gourds in a heap of leaves.
  p = place(s, 0.2752, 2.35);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.075, PUMPKIN, 0.05);
  p = place(s, 0.24, 2.3);
  heap(ctx, p.x, p.y, sc * p.k, lw, 0.2, 3, LEAF_PILE);
  p = place(s, 0.1655, 2.2);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.058, PUMPKIN_GOLD, -0.12);
  p = place(s, 0.322, 2.15);
  gourd(ctx, p.x, p.y, sc * p.k * 0.85, lw);
  p = place(s, 0.22, 2.0);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.045, PUMPKIN_CREAM, 0.1);
  p = place(s, 0.27, 1.92);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.034, PUMPKIN_GREEN, -0.15);

  // Left, front: a leaf heap at the bales' foot, and a lone pumpkin by the tower.
  p = place(s, BALES_X, BALES_Z - 0.02);
  heap(ctx, p.x, p.y, sc * p.k, lw, 0.15, 7, LEAF_PILE);
  p = place(s, -0.095, 2.05);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.05, PUMPKIN, -0.08);
}

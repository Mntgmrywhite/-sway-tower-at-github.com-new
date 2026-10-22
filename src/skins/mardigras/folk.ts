import { circle, oval, type Ctx } from "../../base/draw";
import { BLUSH, BONE, CHEEK, FEATHER, GOLD, GREEN, INK, MOUTH, PINK, PURPLE, SILVER, SUN_RAY, TEETH, WHITE, type Shades } from "./colors";
import { pose, rig, solve, type Build, type Pose, type Rig, type Vec } from "./rig";
import { maskEyes, maskPath, sparkle } from "./shapes";

// The folks of the street and the parade, painted as New Orleans carnival sculptures: papier-mâché
// figures with rounded, sculpted torsos (a broad chest, a nipped waist, the hips rounding out),
// limbs that taper from the shoulder and the hip, a big head with a mask-like painted face
// (almond eyes under painted lids, rosy cheeks, a wide grin with its teeth showing), and costumes
// in bright paint: lit on their upper left, shaded down their lower right, as every sculpture in
// the scene is lit, with a brushed highlight on the chest and the layered paper of their ruffs,
// frills and skirts. One ink weight round each part; the far limbs a shade darker than the near.
// Every figure stands on a rig (rig.ts): its joints come from the pose a behavior sets, and the
// painter only hangs the papier-mâché on them, so nothing is ever drawn detached.
//
// Loose things move after the body: skirts and coat-tails swing behind the stride, feathers and
// plumes tremble and lag, the points of a jester's hat flop with their bells, strings of beads
// bounce on the chest, braids and long hair swing.

/** A Carnival mask over the eyes. */
export type Mask = "none" | "feather" | "sequin" | "harlequin" | "sun" | "moon" | "cat";
/** Headwear. */
export type Hat = "none" | "cap" | "topHat" | "jester" | "beret" | "boater" | "crown" | "scarf" | "plumes" | "hood";
/** Hair under (or instead of) a hat. */
export type Hair = "short" | "curly" | "bun" | "long" | "afro" | "braids" | "bald";

/** A figure's costume and make, fixed for the figure. */
export interface Look {
  b: Build;
  skin: Shades;
  hair: string;
  hairDo: Hair;
  /** Shirt, coat or bodice; its sleeves (if they differ); trousers or stockings; shoes painted a color (black otherwise). */
  top: Shades;
  sleeve?: Shades;
  bottom: Shades;
  shoes?: string;
  /** A skirt (in two layers of paper: the skirt, its frill), its length from the waist (u). */
  skirt?: Shades;
  skirtLen?: number;
  frill?: Shades;
  /** A tailcoat's tails hanging behind (in the top's color). */
  tails?: boolean;
  /** A vest or a bib down the front, and a pattern on the top. */
  vest?: Shades;
  pattern?: "harlequin" | "stripes" | "ribs";
  patternColor?: Shades;
  /** A sash from the far shoulder to the near hip; a ruff or a bow tie at the collar. */
  sash?: Shades;
  collar?: "ruff" | "bow";
  collarColor?: Shades;
  /** Necklaces of beads. */
  beads?: readonly Shades[];
  /** An apron over the front. */
  apron?: string;
  hat: Hat;
  hatColor: Shades;
  hatTrim?: Shades;
  /** A plume in the hat. */
  plume?: Shades;
  mask: Mask;
  maskColor: Shades;
  /** The painted lids over the eyes. */
  lids: string;
  /** White gloves; a grinning skull for a head; bones painted down the limbs. */
  gloves?: boolean;
  skull?: boolean;
  bones?: boolean;
}

/** A figure in the scene: its look, its size, its id (its own timings come from it), and the pose and rig it is drawn from this frame. */
export interface Folk {
  look: Look;
  size: number;
  id: number;
  /** Facing: +1 right, -1 left. */
  m: number;
  /** Whether its legs show (a float's riders stand behind its side, seen from the waist up). */
  legs: boolean;
  /** How much of its fine detail to draw (1 by its size on screen; less for one half hidden behind others). */
  lod: number;
  pose: Pose;
  rig: Rig;
}

export function folk(look: Look, size: number, id: number, m = 1): Folk {
  return { look, size, id, m, legs: true, lod: 1, pose: pose(look.b), rig: rig() };
}


/** Where a point of the figure (its own frame) lands on screen. */
export function toScreen(f: Folk, p: Vec, x: number, y: number, u: number, out: Vec): Vec {
  const k = u * f.size;
  out.x = x + p.x * k * f.m;
  out.y = y + p.y * k;
  return out;
}

/** Where a screen point lies in the figure's own frame (for reaching to it). */
export function toFigure(f: Folk, sx: number, sy: number, x: number, y: number, u: number, out: Vec): Vec {
  const k = u * f.size;
  out.x = ((sx - x) / k) * f.m;
  out.y = (sy - y) / k;
  return out;
}

// ---------------------------------------------------------------- paths

/**
 * A limb of two tapered bones (r0 wide at a, r1 at the joint b, r2 at c) as one closed polygon,
 * wound as `circle` winds: down one side, across the end, back up the other. Its ends are flat
 * (the torso, a hand or a shoe covers them); the joint is beveled on its outer side, and on the
 * inner the outline folds back on itself inside the limb, where a fill covers it.
 */
function limb(ctx: Ctx, a: Vec, r0: number, b: Vec, r1: number, c: Vec, r2: number): void {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d = Math.hypot(dx, dy) || 1e-6;
  const n1x = -dy / d;
  const n1y = dx / d;
  dx = c.x - b.x;
  dy = c.y - b.y;
  d = Math.hypot(dx, dy) || 1e-6;
  const n2x = -dy / d;
  const n2y = dx / d;
  // The ends reach a little past the joints at a and c, so they tuck under what covers them.
  const ex = (dx / d) * r2 * 0.6;
  const ey = (dy / d) * r2 * 0.6;
  ctx.moveTo(a.x - n1x * r0, a.y - n1y * r0);
  ctx.lineTo(b.x - n1x * r1, b.y - n1y * r1);
  ctx.lineTo(b.x - n2x * r1, b.y - n2y * r1);
  ctx.lineTo(c.x - n2x * r2 + ex, c.y - n2y * r2 + ey);
  ctx.lineTo(c.x + n2x * r2 + ex, c.y + n2y * r2 + ey);
  ctx.lineTo(b.x + n2x * r1, b.y + n2y * r1);
  ctx.lineTo(b.x + n1x * r1, b.y + n1y * r1);
  ctx.lineTo(a.x + n1x * r0, a.y + n1y * r0);
  ctx.closePath();
}

/** A shoe round a foot's ball (x, y) pitched by p (heel up +): a rounded toe, the heel behind. */
function shoe(ctx: Ctx, b: Build, x: number, y: number, p: number, g = 0): void {
  const c = Math.cos(p);
  const s = Math.sin(p);
  const len = (b.heel + b.toe) * 0.5 + 0.003 + g;
  const d = (b.toe - b.heel) / 2;
  const mx = x + d * c;
  const my = y - d * s - b.ankle * 0.42;
  ctx.moveTo(mx + len * c, my - len * s);
  ctx.ellipse(mx, my, len, b.ankle * 0.62 + g, -p, 0, Math.PI * 2);
}

/** A hand: a round mitten with a thumb, at (x, y), the thumb toward `a`. */
function hand(ctx: Ctx, x: number, y: number, r: number, a: number): void {
  circle(ctx, x, y, r);
  circle(ctx, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.45);
}

/** A lens from (x0, y0) to (x1, y1) bulging `k` (of its length) to the right of the line, as its own subpath: a brushed highlight or a shadow. */
function lens(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, k: number): void {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx + nx * k, my + ny * k, x1, y1);
  ctx.quadraticCurveTo(mx + nx * k * 0.25, my + ny * k * 0.25, x0, y0);
  ctx.closePath();
}

/** A feather from its quill (bx, by) to its tip (tx, ty), `wide` across, curling to one side, as a subpath. */
export function feather(ctx: Ctx, bx: number, by: number, tx: number, ty: number, wide: number): void {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1e-6;
  const nx = (-dy / len) * wide;
  const ny = (dx / len) * wide;
  const mx = bx + dx * 0.55;
  const my = by + dy * 0.55;
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(mx + nx * 1.4, my + ny * 1.4, tx, ty);
  ctx.quadraticCurveTo(mx - nx * 0.9, my - ny * 0.9, bx, by);
  ctx.closePath();
}

// ---------------------------------------------------------------- the body

/** The torso's half width at s (0 the pelvis, 1 the base of the neck), in front (side +1, where the belly rounds out) or behind. */
function halfWidth(b: Build, s: number, side: number): number {
  const hip = b.hipW + (side > 0 ? b.belly * 0.6 : 0);
  const waist = b.waistW + (side > 0 ? b.belly : 0);
  const chest = side > 0 ? b.chestW + b.belly * 0.4 : b.chestW * 0.96;
  if (s < 0.45) return hip + (waist - hip) * (s / 0.45);
  if (s < 0.85) return waist + (chest - waist) * ((s - 0.45) / 0.4);
  return chest * (1 - (s - 0.85) * 1.6);
}

/** Scratch points. */
const A = { x: 0, y: 0 };
const B = { x: 0, y: 0 };
const C = { x: 0, y: 0 };

/** A point on the torso: s up the spine from the pelvis, `off` toward the front (u); the shoulders turned by `tw` (u). */
function onTorso(b: Build, r: Rig, s: number, off: number, out: Vec, tw = 0): Vec {
  const sh = s > 0.6 ? tw * ((s - 0.6) / 0.4) : 0;
  out.x = r.pelvis.x + r.up.x * b.spine * s - r.up.y * (off + sh);
  out.y = r.pelvis.y + r.up.y * b.spine * s + r.up.x * (off + sh);
  return out;
}

/**
 * The torso's outline, from the pelvis up the back to the shoulders and down the front: a broad
 * chest, a nipped waist, hips rounding out. `s0` and `s1` (0 the pelvis, 1 the base of the neck)
 * take a band of it (the trousers' part).
 */
function torsoPath(ctx: Ctx, b: Build, r: Rig, twist: number, s0: number, s1: number, g = 0): void {
  const tw = twist * b.chestW * 0.18;
  const sm = (s0 + s1) / 2;
  const L = b.spine;
  const ux = r.up.x;
  const uy = r.up.y;
  // Up the back, a curve through its middle.
  onTorso(b, r, s0, -halfWidth(b, s0, -1) - g, A, tw);
  onTorso(b, r, sm, -halfWidth(b, sm, -1) - g, B, tw);
  onTorso(b, r, s1, -halfWidth(b, s1, -1) - g, C, tw);
  const bx0 = A.x;
  const by0 = A.y;
  ctx.moveTo(A.x, A.y);
  ctx.quadraticCurveTo(2 * B.x - (A.x + C.x) / 2, 2 * B.y - (A.y + C.y) / 2, C.x, C.y);
  if (s1 >= 0.99) {
    // Round over the shoulders.
    const backX = C.x;
    const backY = C.y;
    onTorso(b, r, 1.06 + g / L, 0, A, tw);
    const tx = A.x;
    const ty = A.y;
    onTorso(b, r, 1, halfWidth(b, 1, 1) + g, C, tw);
    ctx.bezierCurveTo(backX + ux * L * 0.12, backY + uy * L * 0.12, tx + uy * b.chestW * 0.4, ty - ux * b.chestW * 0.4, tx, ty);
    ctx.bezierCurveTo(tx - uy * b.chestW * 0.4, ty + ux * b.chestW * 0.4, C.x + ux * L * 0.12, C.y + uy * L * 0.12, C.x, C.y);
  } else {
    onTorso(b, r, s1, halfWidth(b, s1, 1) + g, C, tw);
    ctx.lineTo(C.x, C.y);
  }
  // Down the front.
  onTorso(b, r, sm, halfWidth(b, sm, 1) + g, B, tw);
  onTorso(b, r, s0, halfWidth(b, s0, 1) + g, A, tw);
  ctx.quadraticCurveTo(2 * B.x - (A.x + C.x) / 2, 2 * B.y - (A.y + C.y) / 2, A.x, A.y);
  if (s0 <= 0.01) {
    // Under the hips, rounding down between the legs.
    const mx = (A.x + bx0) / 2 - ux * (L * 0.14 + g);
    const my = (A.y + by0) / 2 - uy * (L * 0.14 + g);
    ctx.quadraticCurveTo(A.x - ux * L * 0.14, A.y - uy * L * 0.14, mx, my);
    ctx.quadraticCurveTo(bx0 - ux * L * 0.12, by0 - uy * L * 0.12, bx0, by0);
  }
  ctx.closePath();
}

/** The skirt from the waist: a bell flaring to a scalloped hem that swings behind the stride; `tier` 1 the skirt, 0 its shorter frill over it. */
function skirtPath(ctx: Ctx, b: Build, r: Rig, len: number, swing: number, tier: number, g = 0): void {
  onTorso(b, r, 0.42, 0, A);
  const wx = A.x;
  const top = A.y - g;
  const hem = top + len * (0.55 + tier * 0.45) + g * 2;
  const flare = b.hipW * (1.25 + tier * 0.55) + g;
  const sw = -swing * 0.007 * (0.5 + tier);
  // Wound as `circle` winds: down the front, along the hem from front to back, up the back.
  ctx.moveTo(wx + b.waistW * 1.05 + b.belly + g, top);
  ctx.quadraticCurveTo(wx + flare * 0.95, (top + hem) / 2, wx + flare + sw, hem);
  const n = 4;
  for (let i = n - 1; i >= 0; i--) {
    const x0 = wx - flare + sw + ((2 * flare) / n) * i;
    const x1 = x0 + (2 * flare) / n;
    ctx.quadraticCurveTo((x0 + x1) / 2 + sw * 0.2, hem + flare * 0.18, x0, hem);
  }
  ctx.quadraticCurveTo(wx - flare * 0.9, (top + hem) / 2, wx - b.waistW * 1.05 - g, top);
  ctx.closePath();
}

/** A coat's tails hanging behind from the waist to the knees, swinging behind the stride. */
function tailsPath(ctx: Ctx, b: Build, r: Rig, swing: number, g = 0): void {
  onTorso(b, r, 0.3, -b.hipW * 0.6, A);
  const wx = A.x;
  const wy = A.y;
  const len = b.thigh * 1.05 + g;
  const sw = -0.006 - swing * 0.008;
  ctx.moveTo(wx + b.hipW * 1.2, wy + len * 0.3);
  ctx.quadraticCurveTo(wx + b.hipW * 0.3, wy + len * 0.5, wx + b.hipW * 0.1 + sw * 0.8 + g, wy + len * 0.92);
  ctx.lineTo(wx - b.hipW * 0.6 + sw - g, wy + len);
  ctx.quadraticCurveTo(wx - b.hipW * 0.5 + sw * 0.5 - g, wy + len * 0.5, wx + b.hipW * 0.8, wy - g);
  ctx.closePath();
}

/** The torso's paint: the pattern, the vest, the apron, a brushed highlight and a soft shadow, the sash, the collar. */
function torsoDress(ctx: Ctx, L: Look, r: Rig, w: number, sd: number, detail: boolean, small: boolean): void {
  const b = L.b;
  const at = (s: number, off: number, out: Vec): Vec => onTorso(b, r, s, off, out);
  if (L.pattern === "harlequin") {
    // Diamonds down the front, in the pattern's color.
    ctx.beginPath();
    const dw = b.chestW * 0.42;
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        if ((i + (side > 0 ? 1 : 0)) % 2) continue;
        at(0.38 + i * 0.22, side * dw * 0.55, B);
        ctx.moveTo(B.x, B.y - b.spine * 0.11);
        ctx.lineTo(B.x + dw * 0.55, B.y);
        ctx.lineTo(B.x, B.y + b.spine * 0.11);
        ctx.lineTo(B.x - dw * 0.55, B.y);
        ctx.closePath();
      }
    }
    ctx.fillStyle = (L.patternColor ?? GOLD).body;
    ctx.fill();
  } else if (L.pattern === "stripes") {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      at(0.4 + i * 0.2, -b.chestW, B);
      at(0.4 + i * 0.2 + 0.07, b.chestW, C);
      ctx.moveTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
    }
    ctx.lineWidth = b.spine * 0.07;
    ctx.strokeStyle = (L.patternColor ?? GOLD).body;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.lineCap = "round";
  } else if (L.pattern === "ribs") {
    // A skeleton's ribcage, bone white under the open coat, its ribs and breastbone in ink.
    ctx.beginPath();
    at(0.92, -b.chestW * 0.55, B);
    ctx.moveTo(B.x, B.y);
    at(0.92, b.chestW * 0.75, B);
    ctx.lineTo(B.x, B.y);
    at(0.66, b.chestW * 0.95, C);
    at(0.42, b.chestW * 0.55, B);
    ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
    at(0.42, -b.chestW * 0.4, B);
    ctx.lineTo(B.x, B.y);
    at(0.66, -b.chestW * 0.7, C);
    at(0.92, -b.chestW * 0.55, B);
    ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = BONE.body;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const s = 0.82 - i * 0.13;
      at(s - 0.04, -b.chestW * 0.45, B);
      ctx.moveTo(B.x, B.y);
      at(s + 0.04, b.chestW * 0.1, C);
      at(s - 0.04, b.chestW * 0.68, B);
      ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
    }
    at(0.9, b.chestW * 0.1, B);
    ctx.moveTo(B.x, B.y);
    at(0.5, b.chestW * 0.1, B);
    ctx.lineTo(B.x, B.y);
    ctx.lineWidth = w * (small ? 0.6 : 0.8);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  if (L.vest) {
    ctx.beginPath();
    at(0.95, b.chestW * 0.05, B);
    ctx.moveTo(B.x, B.y);
    at(0.35, b.waistW * 0.95, B);
    ctx.lineTo(B.x, B.y);
    at(0.32, b.waistW * 0.05, B);
    ctx.lineTo(B.x, B.y);
    at(0.6, -b.waistW * 0.35, C);
    at(0.95, -b.chestW * 0.25, B);
    ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = L.vest.body;
    ctx.fill();
  }
  if (L.apron) {
    ctx.beginPath();
    at(0.78, -b.chestW * 0.3, B);
    ctx.moveTo(B.x, B.y);
    at(0.78, b.chestW * 0.75, B);
    ctx.lineTo(B.x, B.y);
    at(-0.25, b.hipW * 1.2, B);
    ctx.lineTo(B.x, B.y);
    at(-0.25, -b.hipW * 0.35, B);
    ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = L.apron;
    ctx.fill();
  }
  // Light brushed down the lit side of the chest, a shadow down the shaded side.
  if (!small) {
    if (detail) {
      ctx.beginPath();
      at(0.9, -sd * b.chestW * 0.55, B);
      at(0.38, -sd * b.waistW * 0.7, C);
      lens(ctx, B.x, B.y, C.x, C.y, 0.18 * sd);
      ctx.fillStyle = L.top.light;
      ctx.fill();
    }
    ctx.beginPath();
    at(0.82, sd * b.chestW * 0.92, B);
    at(0.12, sd * b.hipW * 0.9, C);
    lens(ctx, B.x, B.y, C.x, C.y, -0.14 * sd);
    ctx.fillStyle = L.top.shade;
    ctx.fill();
  }
  if (L.sash) {
    ctx.beginPath();
    at(0.98, -b.chestW * 0.55, B);
    ctx.moveTo(B.x, B.y);
    at(1.0, -b.chestW * 0.1, B);
    ctx.lineTo(B.x, B.y);
    at(0.22, b.hipW * 1.0, B);
    ctx.lineTo(B.x, B.y);
    at(0.1, b.hipW * 0.55, B);
    ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = L.sash.body;
    ctx.fill();
  }
  if (L.collar === "ruff") {
    // A ruff of layered paper scallops, by turns in its color and gold, on one ink.
    for (let pass = -1; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        if (pass >= 0 && i % 2 !== pass) continue;
        const s = (i / 5) * 2 - 1;
        at(0.98 - Math.abs(s) * 0.05, s * b.chestW * 0.85, B);
        circle(ctx, B.x, B.y, b.chestW * 0.34 + (pass < 0 ? w : 0));
      }
      ctx.fillStyle = pass < 0 ? INK : pass ? GOLD.body : (L.collarColor ?? PURPLE).light;
      ctx.fill();
    }
  } else if (L.collar === "bow") {
    at(0.96, b.chestW * 0.2, B);
    const s = b.chestW * 0.3;
    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(B.x - s, B.y - s * 0.6);
    ctx.lineTo(B.x - s, B.y + s * 0.6);
    ctx.closePath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(B.x + s, B.y - s * 0.6);
    ctx.lineTo(B.x + s, B.y + s * 0.6);
    ctx.closePath();
    ctx.fillStyle = (L.collarColor ?? GOLD).body;
    ctx.fill();
  }
}

/** The beads' dash: a bead (a dot of a dash with round caps), then a gap; and no dash. */
const BEAD = [0.001, 1];
const NO_DASH: number[] = [];

/**
 * Strings of beads round the neck, hanging down the chest and bouncing a moment behind the body:
 * the strings in one ink, then each string's beads as round dots along it (the first string only
 * on a small figure).
 */
function neckBeads(ctx: Ctx, list: readonly Shades[], r: Rig, b: Build, p: Pose, w: number, small: boolean): void {
  const n = small ? 1 : list.length;
  const rad = b.arm2 * 0.42;
  const strand = (i: number) => {
    const depth = b.spine * (0.2 + i * 0.13) * (1 - p.bob * 0.1);
    const hw = b.chestW * (0.55 + i * 0.12);
    const mid = b.chestW * 0.22 + p.swing * b.chestW * 0.12;
    onTorso(b, r, 0.96, mid - hw, A);
    ctx.moveTo(A.x, A.y);
    onTorso(b, r, 0.96 - (depth * 2) / b.spine, mid, B);
    onTorso(b, r, 0.96, mid + hw, C);
    ctx.quadraticCurveTo(B.x, B.y, C.x, C.y);
  };
  ctx.beginPath();
  for (let i = 0; i < n; i++) strand(i);
  ctx.lineWidth = rad * 2 + w * 1.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  BEAD[1] = rad * 2.3;
  ctx.setLineDash(BEAD);
  ctx.lineWidth = rad * 2;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    strand(i);
    ctx.strokeStyle = list[i]!.light;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
}

/** Bones painted down the limbs of a skeleton suit: a pale stroke from joint to joint, a knob at the middle one. */
function bonesDown(ctx: Ctx, a: Vec, mid: Vec, c: Vec, b: Build): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineWidth = b.leg2 * 0.75;
  ctx.strokeStyle = BONE.body;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, mid.x, mid.y, b.leg2 * 0.6);
  ctx.fillStyle = BONE.body;
  ctx.fill();
}

// ---------------------------------------------------------------- the head

/**
 * The face, painted on the head in the head's frame (its center at 0, 0; facing +x; `turn` 0
 * toward us, 1 three-quarters ahead): almond eyes under painted lids, a nose, rosy cheeks, a
 * wide grin on its teeth (or a mouth pursed round a mouthpiece, cheeks puffed, for mouth < 0).
 * A mask leaves the eyes to it.
 */
function face(ctx: Ctx, f: Look, p: Pose, rx: number, ry: number, detail: boolean, small: boolean): void {
  const t = p.turn;
  const fx = t * rx * 0.36;
  const ex = rx * 0.34;
  const ey = -ry * 0.1;
  const ew = rx * 0.2;
  const eh = ry * 0.22;
  const wN = 1 - 0.32 * Math.max(0, -t);
  const wF = 1 - 0.32 * Math.max(0, t);
  const xF = fx - ex * (1 - 0.15 * Math.max(0, t));
  const xN = fx + ex * (1 - 0.15 * Math.max(0, -t));
  const masked = f.mask !== "none";
  // The cheeks, puffed when blowing.
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  const puff = p.mouth < 0 ? 1.5 : 1;
  oval(ctx, xF - rx * 0.04, ry * 0.3, rx * 0.17 * wF * puff, ry * 0.12 * puff);
  oval(ctx, xN + rx * 0.04, ry * 0.3, rx * 0.17 * wN * puff, ry * 0.12 * puff);
  ctx.fill();
  // The mouth: a grin open on its teeth, wider with `mouth`; or pursed round a mouthpiece.
  const my = ry * 0.44;
  const mx = fx + t * rx * 0.05;
  const mw = rx * (0.3 + Math.max(0, p.mouth) * 0.06);
  const mh = ry * (0.1 + Math.max(0, p.mouth) * 0.2);
  ctx.beginPath();
  if (p.mouth < 0) oval(ctx, mx + rx * 0.05, my - ry * 0.02, rx * 0.09, ry * 0.07);
  else {
    ctx.moveTo(mx - mw, my - ry * 0.02);
    ctx.quadraticCurveTo(mx, my + ry * 0.04, mx + mw, my - ry * 0.02);
    ctx.quadraticCurveTo(mx + mw * 0.6, my + mh * 1.6, mx, my + mh * 1.5);
    ctx.quadraticCurveTo(mx - mw * 0.6, my + mh * 1.6, mx - mw, my - ry * 0.02);
    ctx.closePath();
  }
  ctx.fillStyle = MOUTH;
  ctx.fill();
  if (small && !masked) {
    // Too small for painted lids: bright eyes as dots, and a brow line, in one go.
    ctx.beginPath();
    oval(ctx, xF + t * ew * 0.3, ey + eh * 0.1, ew * 0.62 * wF, eh * (0.75 - p.blink * 0.55));
    oval(ctx, xN + t * ew * 0.3, ey + eh * 0.1, ew * 0.62 * wN, eh * (0.75 - p.blink * 0.55));
    ctx.fillStyle = INK;
    ctx.fill();
    return;
  }
  if (small) return;
  // The whites of the eyes and the teeth, in one go.
  ctx.beginPath();
  if (!masked) {
    oval(ctx, xF, ey, ew * wF, eh);
    oval(ctx, xN, ey, ew * wN, eh);
  }
  if (detail && p.mouth >= 0) {
    ctx.moveTo(mx - mw * 0.82, my - ry * 0.005);
    ctx.quadraticCurveTo(mx, my + ry * 0.05, mx + mw * 0.82, my - ry * 0.005);
    ctx.quadraticCurveTo(mx, my + ry * 0.05 + mh * 0.55, mx - mw * 0.82, my - ry * 0.005);
    ctx.closePath();
  }
  ctx.fillStyle = TEETH;
  ctx.fill();
  if (masked) return;
  // Painted lids drooping with a blink, then the pupils and brows in ink.
  const lid = 0.35 + 0.65 * p.blink;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const x = i ? xN : xF;
    const ww = i ? wN : wF;
    const low = ey - eh + eh * 2 * lid;
    ctx.moveTo(x - ew * ww * 1.15, ey - eh * 0.1);
    ctx.quadraticCurveTo(x, ey - eh * 1.8, x + ew * ww * 1.15, ey - eh * 0.1);
    ctx.quadraticCurveTo(x, low + eh * 0.3, x - ew * ww * 1.15, ey - eh * 0.1);
    ctx.closePath();
  }
  ctx.fillStyle = f.lids;
  ctx.fill();
  ctx.beginPath();
  if (p.blink < 0.6) {
    const gx = t * ew * 0.35;
    circle(ctx, xF + gx, ey + eh * 0.25, ew * 0.48 * wF);
    circle(ctx, xN + gx, ey + eh * 0.25, ew * 0.48 * wN);
  }
  for (let i = 0; i < 2; i++) {
    const x = i ? xN : xF;
    const ww = i ? wN : wF;
    const by = ey - eh * 2.05;
    ctx.moveTo(x - ew * ww * 1.1, by + eh * 0.35);
    ctx.quadraticCurveTo(x, by - eh * 0.45, x + ew * ww * 1.1, by + eh * 0.3);
    ctx.quadraticCurveTo(x, by - eh * 0.05, x - ew * ww * 1.1, by + eh * 0.35);
    ctx.closePath();
  }
  ctx.fillStyle = INK;
  ctx.fill();
  if (detail && p.blink < 0.6) {
    ctx.beginPath();
    circle(ctx, xF + t * ew * 0.35 - ew * 0.18, ey + eh * 0.05, ew * 0.16);
    circle(ctx, xN + t * ew * 0.35 - ew * 0.18, ey + eh * 0.05, ew * 0.16);
    ctx.fillStyle = WHITE;
    ctx.fill();
  }
}

/** Hair behind the head (drawn before it): an afro's round, long hair to the shoulders, braids, a bun. */
function hairBehind(ctx: Ctx, f: Look, p: Pose, rx: number, ry: number): boolean {
  if (f.hairDo === "afro") {
    circle(ctx, -rx * 0.12, -ry * 0.22, rx * 1.28);
    return true;
  }
  if (f.hairDo === "long") {
    const sw = -p.swing * rx * 0.14;
    ctx.moveTo(rx * 0.5, -ry * 0.6);
    ctx.quadraticCurveTo(rx * 0.2, ry * 0.2, rx * 0.1 + sw, ry * 1.05);
    ctx.lineTo(-rx * 0.95 + sw * 1.5, ry * 1.25);
    ctx.quadraticCurveTo(-rx * 1.25 + sw, ry * 0.6, -rx * 0.9, -ry * 0.4);
    ctx.closePath();
    return true;
  }
  if (f.hairDo === "braids") {
    const sw = -p.swing * rx * 0.25;
    for (let s = 0; s < 2; s++) {
      const x = -rx * (0.55 + s * 0.35);
      ctx.moveTo(x + rx * 0.16, ry * 0.2);
      ctx.quadraticCurveTo(x + sw * 0.5, ry * 0.9, x + sw - rx * 0.05, ry * 1.35);
      ctx.lineTo(x + sw - rx * 0.2, ry * 1.3);
      ctx.quadraticCurveTo(x - rx * 0.1, ry * 0.8, x - rx * 0.16, ry * 0.2);
      ctx.closePath();
      circle(ctx, x + sw - rx * 0.12, ry * 1.38, rx * 0.16);
    }
    return true;
  }
  if (f.hairDo === "bun" && f.hat === "none") {
    circle(ctx, -rx * 0.62, -ry * 0.78, rx * 0.42);
    return true;
  }
  return false;
}

/** Hair over the top of the head, under a hat if there is one. */
function hairOn(ctx: Ctx, f: Look, rx: number, ry: number): boolean {
  if (f.hairDo === "bald" || f.hat === "hood") return false;
  const hatted = f.hat !== "none" && f.hat !== "crown";
  if (f.hairDo === "afro") {
    if (hatted) return false;
    ctx.moveTo(-rx * 1.05, -ry * 0.05);
    ctx.quadraticCurveTo(-rx * 0.9, -ry * 1.25, rx * 0.2, -ry * 1.2);
    ctx.quadraticCurveTo(rx * 1.05, -ry * 1.05, rx * 1.02, -ry * 0.25);
    ctx.quadraticCurveTo(rx * 0.4, -ry * 0.62, -rx * 1.05, -ry * 0.05);
    ctx.closePath();
    return true;
  }
  if (hatted) {
    // Only a lock at the nape below the hat.
    ctx.moveTo(-rx * 0.35, -ry * 0.4);
    ctx.quadraticCurveTo(-rx * 0.7, -ry * 0.05, -rx * 0.65, ry * 0.42);
    ctx.quadraticCurveTo(-rx * 1.1, ry * 0.25, -rx * 1.0, -ry * 0.35);
    ctx.closePath();
    return true;
  }
  ctx.moveTo(-rx * 1.04, -ry * 0.05);
  ctx.quadraticCurveTo(-rx * 1.08, -ry * 1.12, rx * 0.15, -ry * 1.1);
  ctx.quadraticCurveTo(rx * 0.95, -ry * 1.02, rx * 1.02, -ry * 0.32);
  // The fringe, swept across the brow.
  ctx.quadraticCurveTo(rx * 0.55, -ry * 0.72, rx * 0.05, -ry * 0.58);
  ctx.quadraticCurveTo(-rx * 0.45, -ry * 0.5, -rx * 0.62, -ry * 0.1);
  ctx.quadraticCurveTo(-rx * 0.8, ry * 0.1, -rx * 1.04, -ry * 0.05);
  ctx.closePath();
  if (f.hairDo === "curly") for (let i = 0; i < 4; i++) circle(ctx, -rx * 0.75 + i * rx * 0.48, -ry * (0.92 + (i % 2) * 0.12), rx * 0.28);
  return true;
}

/** A shape on its ink: `build` adds its path; drawn grown by (kx, ky) about (cx, cy) in ink, then itself in `color`. */
function painted(ctx: Ctx, color: string, cx: number, cy: number, kx: number, ky: number, build: () => void): void {
  ctx.beginPath();
  grown(ctx, cx, cy, kx, ky, build);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  build();
  ctx.fillStyle = color;
  ctx.fill();
}

/** The headwear, in the head's frame; its loose parts (points, plumes, a scarf's ends) swing and tremble. */
function hat(ctx: Ctx, f: Look, p: Pose, w: number, rx: number, ry: number, id: number, small: boolean): void {
  const c = f.hatColor;
  const trim = f.hatTrim ?? GOLD;
  const kind = f.hat;
  if (kind === "none") return;
  const g = (size: number) => 1 + (w * 2) / size;
  if (kind === "topHat") {
    const brim = -ry * 0.62;
    painted(ctx, c.body, rx * 0.05, brim - ry * 0.6, g(rx * 2.6), g(ry * 1.6), () => {
      oval(ctx, rx * 0.05, brim, rx * 1.32, ry * 0.2);
      ctx.moveTo(-rx * 0.78, brim);
      ctx.lineTo(-rx * 0.7, brim - ry * 1.3);
      ctx.quadraticCurveTo(rx * 0.08, brim - ry * 1.42, rx * 0.86, brim - ry * 1.3);
      ctx.lineTo(rx * 0.88, brim);
      ctx.closePath();
    });
    ctx.beginPath();
    ctx.moveTo(-rx * 0.76, brim - ry * 0.22);
    ctx.lineTo(rx * 0.88, brim - ry * 0.22);
    ctx.lineTo(rx * 0.87, brim - ry * 0.52);
    ctx.lineTo(-rx * 0.74, brim - ry * 0.52);
    ctx.closePath();
    ctx.fillStyle = trim.body;
    ctx.fill();
    if (!small) {
      ctx.beginPath();
      lens(ctx, -rx * 0.5, brim - ry * 1.18, -rx * 0.48, brim - ry * 0.62, 0.25);
      ctx.fillStyle = c.light;
      ctx.fill();
    }
    if (f.plume) plumeAt(ctx, f.plume, w, rx * 0.55, brim - ry * 0.35, ry * 0.72, p, id, 1);
  } else if (kind === "cap") {
    // A band cap: a round crown, a gold band, a short black peak.
    painted(ctx, c.body, rx * 0.2, -ry * 0.8, g(rx * 2.4), g(ry * 1.0), () => {
      ctx.moveTo(-rx * 1.0, -ry * 0.42);
      ctx.quadraticCurveTo(-rx * 1.12, -ry * 1.28, rx * 0.05, -ry * 1.3);
      ctx.quadraticCurveTo(rx * 1.15, -ry * 1.25, rx * 1.02, -ry * 0.42);
      ctx.closePath();
    });
    ctx.beginPath();
    ctx.rect(-rx * 1.0, -ry * 0.62, rx * 2.02, ry * 0.2);
    ctx.moveTo(rx * 0.35, -ry * 0.48);
    ctx.quadraticCurveTo(rx * 1.2, -ry * 0.55, rx * 1.48, -ry * 0.28);
    ctx.lineTo(rx * 0.4, -ry * 0.28);
    ctx.closePath();
    ctx.fillStyle = trim.body;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rx * 0.38, -ry * 0.44);
    ctx.quadraticCurveTo(rx * 1.2, -ry * 0.5, rx * 1.4, -ry * 0.31);
    ctx.lineTo(rx * 0.42, -ry * 0.32);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    if (!small) {
      ctx.beginPath();
      lens(ctx, -rx * 0.6, -ry * 1.05, rx * 0.2, -ry * 1.22, 0.2);
      ctx.fillStyle = c.light;
      ctx.fill();
    }
  } else if (kind === "jester") {
    // Three floppy points in the season's colors, each with a bell, flopping after the head.
    const flop = -p.swing * 0.35;
    const bob = -p.bob * 0.15;
    const tips: [number, number][] = [
      [-rx * 1.75 + flop * rx * 0.4, -ry * 0.55 + (flop + bob) * ry * 0.6],
      [rx * 0.05 + flop * rx * 0.7, -ry * 2.05 + bob * ry * 0.4],
      [rx * 1.75 + flop * rx * 0.4, -ry * 0.6 - (flop - bob) * ry * 0.6],
    ];
    const colors = [c, c === PURPLE ? GREEN : PURPLE, c === GOLD ? GREEN : GOLD];
    ctx.beginPath();
    grown(ctx, 0, -ry * 1.0, g(rx * 2.4), g(ry * 1.6), () => {
      for (let i = 0; i < 3; i++) jesterPoint(ctx, rx, ry, tips[i]!, i);
      ctx.rect(-rx * 1.04, -ry * 0.7, rx * 2.08, ry * 0.32);
    });
    for (const [tx, ty] of tips) circle(ctx, tx, ty, rx * 0.2 + w);
    ctx.fillStyle = INK;
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      jesterPoint(ctx, rx, ry, tips[i]!, i);
      ctx.fillStyle = colors[i]!.body;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.rect(-rx * 1.04, -ry * 0.7, rx * 2.08, ry * 0.32);
    ctx.fillStyle = trim.body;
    ctx.fill();
    ctx.beginPath();
    for (const [tx, ty] of tips) circle(ctx, tx, ty, rx * 0.2);
    ctx.fillStyle = GOLD.light;
    ctx.fill();
  } else if (kind === "beret") {
    painted(ctx, c.body, -rx * 0.12, -ry * 0.85, g(rx * 2.4), g(ry * 0.9), () => {
      oval(ctx, -rx * 0.12, -ry * 0.82, rx * 1.18, ry * 0.42, -0.12);
      circle(ctx, -rx * 0.1, -ry * 1.24, rx * 0.12);
    });
  } else if (kind === "boater") {
    painted(ctx, c.body, 0, -ry * 0.85, g(rx * 2.8), g(ry * 0.6), () => {
      oval(ctx, 0, -ry * 0.66, rx * 1.4, ry * 0.18);
      ctx.rect(-rx * 0.8, -ry * 1.12, rx * 1.6, ry * 0.46);
    });
    ctx.beginPath();
    ctx.rect(-rx * 0.8, -ry * 0.86, rx * 1.6, ry * 0.16);
    ctx.fillStyle = trim.body;
    ctx.fill();
  } else if (kind === "crown") {
    painted(ctx, GOLD.body, 0, -ry * 1.05, g(rx * 1.7), g(ry * 0.8), () => {
      ctx.moveTo(-rx * 0.8, -ry * 0.7);
      ctx.lineTo(-rx * 0.85, -ry * 1.35);
      ctx.lineTo(-rx * 0.42, -ry * 1.0);
      ctx.lineTo(0, -ry * 1.5);
      ctx.lineTo(rx * 0.42, -ry * 1.0);
      ctx.lineTo(rx * 0.85, -ry * 1.35);
      ctx.lineTo(rx * 0.8, -ry * 0.7);
      ctx.closePath();
    });
    ctx.beginPath();
    circle(ctx, 0, -ry * 0.92, rx * 0.13);
    ctx.fillStyle = PURPLE.body;
    ctx.fill();
  } else if (kind === "scarf") {
    // A headscarf knotted at the nape, its ends fluttering.
    const fl = Math.sin(p.t * 9 + id) * 0.25 - p.swing * 0.3;
    painted(ctx, c.body, -rx * 0.2, -ry * 0.55, g(rx * 2.6), g(ry * 1.4), () => {
      ctx.moveTo(-rx * 1.06, -ry * 0.1);
      ctx.quadraticCurveTo(-rx * 1.05, -ry * 1.2, rx * 0.15, -ry * 1.14);
      ctx.quadraticCurveTo(rx * 1.0, -ry * 1.05, rx * 1.05, -ry * 0.35);
      ctx.quadraticCurveTo(rx * 0.2, -ry * 0.62, -rx * 1.06, -ry * 0.1);
      ctx.closePath();
      ctx.moveTo(-rx * 1.0, -ry * 0.15);
      ctx.lineTo(-rx * 1.7, ry * (0.05 + fl));
      ctx.lineTo(-rx * 1.5, ry * (0.38 + fl));
      ctx.closePath();
    });
    if (!small) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) circle(ctx, -rx * 0.55 + i * rx * 0.48, -ry * 0.82 + (i % 2) * ry * 0.12, rx * 0.09);
      ctx.fillStyle = c.light;
      ctx.fill();
    }
  } else if (kind === "plumes") {
    // A feathered headdress: plumes fanning up, trembling, on a jeweled band.
    for (let i = 0; i < 2; i++) plumeAt(ctx, i ? c : f.plume ?? FEATHER, w, (i ? 0.3 : -0.35) * rx, -ry * 0.75, ry * 1.1, p, id + i * 3, i ? 1 : -1);
    painted(ctx, trim.body, 0, -ry * 0.65, g(rx * 2.0), g(ry * 0.26), () => ctx.rect(-rx * 1.0, -ry * 0.78, rx * 2.0, ry * 0.26));
    ctx.beginPath();
    circle(ctx, 0, -ry * 0.65, rx * 0.16);
    ctx.fillStyle = GREEN.body;
    ctx.fill();
  } else if (kind === "hood") {
    // A skeleton suit's hood over the head, a skull painted on its brow.
    painted(ctx, c.body, 0, -ry * 0.4, g(rx * 2.4), g(ry * 1.8), () => {
      ctx.moveTo(-rx * 1.12, ry * 0.55);
      ctx.quadraticCurveTo(-rx * 1.3, -ry * 1.3, rx * 0.1, -ry * 1.22);
      ctx.quadraticCurveTo(rx * 1.25, -ry * 1.15, rx * 1.12, ry * 0.3);
      ctx.quadraticCurveTo(rx * 0.3, -ry * 0.55, -rx * 1.12, ry * 0.55);
      ctx.closePath();
    });
    ctx.beginPath();
    oval(ctx, rx * 0.05, -ry * 0.88, rx * 0.5, ry * 0.26);
    ctx.fillStyle = BONE.body;
    ctx.fill();
    ctx.beginPath();
    oval(ctx, -rx * 0.12, -ry * 0.88, rx * 0.12, ry * 0.1);
    oval(ctx, rx * 0.24, -ry * 0.88, rx * 0.12, ry * 0.1);
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

function jesterPoint(ctx: Ctx, rx: number, ry: number, tip: readonly [number, number], i: number): void {
  const x0 = -rx * 1.02 + i * rx * 0.68;
  const x1 = x0 + rx * 0.68;
  const y = -ry * 0.6;
  const [tx, ty] = tip;
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo(x0 + (tx - x0) * 0.2 - rx * 0.2, y - ry * 0.9, tx, ty);
  ctx.quadraticCurveTo((x1 + tx) / 2 + rx * 0.15, y - ry * 0.45, x1, y);
  ctx.closePath();
}

/** A plume rising from (x, y) in the head's frame, curling back, trembling and lagging the head. */
function plumeAt(ctx: Ctx, c: Shades, w: number, x: number, y: number, ry: number, p: Pose, id: number, dir: number): void {
  const tr = Math.sin(p.t * 7 + id * 1.7) * 0.06 - p.swing * 0.12;
  const len = ry * 1.6;
  const a = -0.35 * dir - 0.25 + tr;
  const tx = x + Math.sin(a) * len;
  const ty = y - Math.cos(a) * len;
  ctx.beginPath();
  feather(ctx, x, y, tx + Math.sin(a) * w, ty - Math.cos(a) * w, ry * 0.3 + w);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  feather(ctx, x, y, tx, ty, ry * 0.3);
  ctx.fillStyle = c.body;
  ctx.fill();
}

/** The mask over the eyes (in the head's frame), and what rises from it: feathers, a plume, a cat's ears, a sun's rays. */
function maskOn(ctx: Ctx, f: Look, p: Pose, w: number, rx: number, ry: number, id: number, small: boolean): void {
  const kind = f.mask;
  if (kind === "none") return;
  const c = f.maskColor;
  const t = p.turn;
  const mx = t * rx * 0.36;
  const my = -ry * 0.12;
  const mw = rx * 2.05;
  if (kind === "sun") {
    // A gold sun's ten rays round the head, behind the mask.
    const k = 1 + (w * 1.4) / (rx * 3.6);
    painted(ctx, SUN_RAY.body, mx * 0.3, my, k, k, () => {
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2 + Math.sin(p.t * 2 + id) * 0.04;
        const len = i % 2 ? 1.5 : 1.85;
        ctx.moveTo(mx * 0.3 + Math.cos(a - 0.28) * rx * 1.05, my + Math.sin(a - 0.28) * rx * 1.05);
        ctx.lineTo(mx * 0.3 + Math.cos(a) * rx * len, my + Math.sin(a) * rx * len);
        ctx.lineTo(mx * 0.3 + Math.cos(a + 0.28) * rx * 1.05, my + Math.sin(a + 0.28) * rx * 1.05);
        ctx.closePath();
      }
    });
  } else if (kind === "feather") {
    // Three plumes from the brow, trembling: on one ink, the middle one gold.
    for (let pass = 0; pass < 3; pass++) {
      ctx.beginPath();
      const g = pass === 0 ? w * 0.8 : 0;
      for (let i = 0; i < 3; i++) {
        if (pass === 1 && i === 1) continue;
        if (pass === 2 && i !== 1) continue;
        const tr = Math.sin(p.t * 6 + id + i * 2.1) * 0.07 - p.swing * 0.1;
        const a = -0.55 + i * 0.5 + tr;
        const len = ry * (i === 1 ? 1.5 : 1.25) + g;
        const bx = mx + (i - 1) * rx * 0.3;
        const by = my - ry * 0.35;
        feather(ctx, bx, by, bx + Math.sin(a) * len, by - Math.cos(a) * len, rx * 0.3 + g);
      }
      ctx.fillStyle = pass === 0 ? INK : pass === 2 ? GOLD.body : FEATHER.body;
      ctx.fill();
    }
  } else if (kind === "sequin" && f.hat === "none") {
    const tr = Math.sin(p.t * 5.5 + id) * 0.08 - p.swing * 0.12;
    ctx.beginPath();
    feather(ctx, mx - rx * 0.55, my - ry * 0.3, mx - rx * 1.27 + tr * rx, my - ry * 1.95, rx * 0.3 + w * 0.8);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    feather(ctx, mx - rx * 0.55, my - ry * 0.3, mx - rx * 1.25 + tr * rx, my - ry * 1.9, rx * 0.3);
    ctx.fillStyle = FEATHER.body;
    ctx.fill();
  } else if (kind === "cat") {
    painted(ctx, c.body, mx, my - ry * 0.7, 1 + (w * 1.6) / (rx * 1.6), 1 + (w * 1.6) / (ry * 0.8), () => {
      ctx.moveTo(mx - rx * 0.75, my - ry * 0.35);
      ctx.lineTo(mx - rx * 0.7, my - ry * 1.15);
      ctx.lineTo(mx - rx * 0.15, my - ry * 0.55);
      ctx.closePath();
      ctx.moveTo(mx + rx * 0.2, my - ry * 0.55);
      ctx.lineTo(mx + rx * 0.75, my - ry * 1.12);
      ctx.lineTo(mx + rx * 0.85, my - ry * 0.3);
      ctx.closePath();
    });
    ctx.beginPath();
    ctx.moveTo(mx - rx * 0.62, my - ry * 0.48);
    ctx.lineTo(mx - rx * 0.62, my - ry * 0.92);
    ctx.lineTo(mx - rx * 0.32, my - ry * 0.6);
    ctx.closePath();
    ctx.moveTo(mx + rx * 0.36, my - ry * 0.6);
    ctx.lineTo(mx + rx * 0.7, my - ry * 0.9);
    ctx.lineTo(mx + rx * 0.72, my - ry * 0.46);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
  }
  // The mask itself, ringed in ink, its eye holes dark and trimmed in gold.
  const body = kind === "sun" ? GOLD : kind === "moon" ? SILVER : c;
  painted(ctx, body.body, mx, my, 1 + (w * 2) / mw, 1 + (w * 2) / (mw * 0.45), () => maskPath(ctx, mx, my, mw));
  if (kind === "harlequin") {
    // Split down the middle, the far half in a second color.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c === GOLD ? GREEN.body : GOLD.body;
    ctx.fillRect(mx - mw, my - mw, mw, mw * 2);
    ctx.restore();
  }
  if (!small) {
    ctx.beginPath();
    lens(ctx, mx - mw * 0.42, my - mw * 0.13, mx - mw * 0.05, my + mw * 0.02, -0.18);
    ctx.fillStyle = body.light;
    ctx.fill();
  }
  if (!small) {
    // A gold rim round each eye hole.
    ctx.beginPath();
    grown(ctx, mx, my, 1.18, 1.3, () => maskEyes(ctx, mx, my, mw));
    ctx.fillStyle = kind === "moon" || kind === "sun" ? GOLD.light : GOLD.body;
    ctx.fill();
  }
  ctx.beginPath();
  maskEyes(ctx, mx, my, mw);
  ctx.fillStyle = INK;
  ctx.fill();
  if (p.blink < 0.6 && !small) {
    ctx.beginPath();
    circle(ctx, mx - mw * 0.22, my + mw * 0.01, rx * 0.055);
    circle(ctx, mx + mw * 0.26, my + mw * 0.01, rx * 0.055);
    ctx.fillStyle = WHITE;
    ctx.fill();
  }
  if (small) return;
  if (kind === "sequin") {
    ctx.beginPath();
    sparkle(ctx, mx - mw * 0.38, my - mw * 0.1, rx * 0.3);
    sparkle(ctx, mx + mw * 0.42, my - mw * 0.12, rx * 0.26);
    ctx.fillStyle = WHITE;
    ctx.fill();
  } else if (kind === "moon") {
    ctx.beginPath();
    sparkle(ctx, mx + mw * 0.52, my - mw * 0.3, rx * 0.4);
    ctx.fillStyle = GOLD.body;
    ctx.fill();
  } else if (kind === "harlequin") {
    ctx.beginPath();
    circle(ctx, mx - mw * 0.5, my - mw * 0.24, rx * 0.18);
    circle(ctx, mx + mw * 0.5, my - mw * 0.24, rx * 0.18);
    ctx.fillStyle = GOLD.light;
    ctx.fill();
  }
}

/**
 * A grinning carnival skull for a head (the krewe's): a round bone-white cranium over a jaw that
 * drops as the grin widens, big round sockets each with a glint, rosy painted cheeks, a little
 * nose and a row of teeth. Friendly, never fierce.
 */
function skullHead(ctx: Ctx, p: Pose, w: number, rx: number, ry: number, detail: boolean): void {
  const t = p.turn;
  const fx = t * rx * 0.3;
  const drop = Math.max(0, p.mouth) * ry * 0.18;
  ctx.beginPath();
  lens(ctx, -rx * 0.75, -ry * 0.25, -rx * 0.1, -ry * 0.9, -0.22);
  ctx.fillStyle = BONE.light;
  ctx.fill();
  ctx.fillStyle = BLUSH;
  ctx.beginPath();
  oval(ctx, fx - rx * 0.62, ry * 0.32, rx * 0.16, ry * 0.1);
  oval(ctx, fx + rx * 0.62, ry * 0.32, rx * 0.16, ry * 0.1);
  ctx.fill();
  // Sockets and nose in ink, a glint in each socket.
  ctx.beginPath();
  oval(ctx, fx - rx * 0.36, -ry * 0.1, rx * 0.27, ry * 0.31);
  oval(ctx, fx + rx * 0.38, -ry * 0.1, rx * 0.28, ry * 0.32);
  ctx.moveTo(fx + rx * 0.02, ry * 0.12);
  ctx.lineTo(fx - rx * 0.1, ry * 0.3);
  ctx.lineTo(fx + rx * 0.14, ry * 0.3);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, fx - rx * 0.29, -ry * 0.2, rx * 0.09);
  circle(ctx, fx + rx * 0.46, -ry * 0.2, rx * 0.09);
  ctx.fillStyle = WHITE;
  ctx.fill();
  // The grin: a row of teeth in a wide smile, on its ink.
  const my = ry * 0.46 + drop * 0.5;
  painted(ctx, BONE.light, fx, my + ry * 0.08, 1 + (w * 2) / (rx * 1.1), 1 + (w * 2) / (ry * 0.3 + drop), () => {
    ctx.moveTo(fx - rx * 0.55, my - ry * 0.06);
    ctx.quadraticCurveTo(fx, my + ry * 0.14, fx + rx * 0.55, my - ry * 0.06);
    ctx.quadraticCurveTo(fx, my + ry * 0.36 + drop, fx - rx * 0.55, my - ry * 0.06);
    ctx.closePath();
  });
  if (detail) {
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      const x = fx - rx * 0.55 + (rx * 1.1 * i) / 5;
      ctx.moveTo(x, my + ry * 0.02);
      ctx.lineTo(x, my + ry * 0.16 + drop * 0.6);
    }
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
  }
}

/** The head's outline (and its neck), as subpaths: a broad brow over a softer jaw, sculpted; or a skull's cranium and jaw. */
function headPath(ctx: Ctx, L: Look, neck: boolean): void {
  const rx = L.b.headW;
  const ry = L.b.headH;
  const nk = L.b.neck * 0.7;
  if (neck) {
    ctx.moveTo(-rx * 0.3, ry * 0.4);
    ctx.lineTo(rx * 0.3, ry * 0.4);
    ctx.lineTo(rx * 0.32, ry * 0.5 + nk);
    ctx.lineTo(-rx * 0.28, ry * 0.5 + nk);
    ctx.closePath();
  }
  if (L.skull) {
    oval(ctx, 0, ry * 0.55, rx * 0.62, ry * 0.36);
    oval(ctx, 0, -ry * 0.08, rx * 1.02, ry * 0.96);
    return;
  }
  // Wound as `circle` winds (down the right, round the chin, up the left, over the brow).
  ctx.moveTo(rx, -ry * 0.1);
  ctx.bezierCurveTo(rx * 0.98, ry * 0.5, rx * 0.62, ry * 0.98, rx * 0.05, ry);
  ctx.bezierCurveTo(-rx * 0.5, ry * 0.98, -rx * 0.98, ry * 0.55, -rx, -ry * 0.05);
  ctx.bezierCurveTo(-rx * 1.03, -ry * 0.72, -rx * 0.6, -ry, 0, -ry);
  ctx.bezierCurveTo(rx * 0.55, -ry, rx * 1.02, -ry * 0.75, rx, -ry * 0.1);
  ctx.closePath();
}

/** The head's ink as subpaths (in its own frame): the head, its neck and its hair, grown by w. */
function headInk(ctx: Ctx, L: Look, p: Pose, w: number, neck: boolean): void {
  const rx = L.b.headW;
  const ry = L.b.headH;
  grown(ctx, 0, 0, 1 + w / rx, 1 + w / ry, () => {
    headPath(ctx, L, neck);
    hairBehind(ctx, L, p, rx, ry);
    hairOn(ctx, L, rx, ry);
  });
}

/**
 * A head in its own frame (its center at 0, 0, facing +x), over its inked silhouette: hair
 * behind, the sculpted head (or a skull) with its neck, its shading, hair, painted face, mask and
 * hat. `sd` is the shaded side (+1 right in this frame).
 */
function paintHead(ctx: Ctx, L: Look, p: Pose, w: number, id: number, sd: number, detail: boolean, small: boolean, neck = true): void {
  const b = L.b;
  const rx = b.headW;
  const ry = b.headH;
  // The head on its own ink, grown from its center (its chin crosses the collar).
  ctx.beginPath();
  headInk(ctx, L, p, w, neck);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  if (hairBehind(ctx, L, p, rx, ry)) {
    ctx.fillStyle = L.hair;
    ctx.fill();
  }
  ctx.beginPath();
  headPath(ctx, L, neck);
  ctx.fillStyle = L.skull ? BONE.body : L.skin.body;
  ctx.fill();
  if (L.skull) skullHead(ctx, p, w, rx, ry, detail);
  else {
    // Soft shading down the shaded side, the nose in it.
    ctx.beginPath();
    if (!small) lens(ctx, sd * rx * 0.55, -ry * 0.8, sd * rx * 0.25, ry * 0.95, sd * -0.5);
    oval(ctx, p.turn * rx * 0.36 + rx * 0.06 + p.turn * rx * 0.08, ry * 0.16, rx * 0.11, ry * 0.08);
    ctx.fillStyle = L.skin.shade;
    ctx.fill();
    ctx.beginPath();
    if (hairOn(ctx, L, rx, ry)) {
      ctx.fillStyle = L.hair;
      ctx.fill();
    }
    face(ctx, L, p, rx, ry, detail, small);
  }
  maskOn(ctx, L, p, w, rx, ry, id, small);
  hat(ctx, L, p, w, rx, ry, id, small);
}

/**
 * A giant papier-mâché head (a float's sculpture), painted as the folks' heads are: centered at
 * (x, y) on screen, R px across half its width, turned by `a`, facing `m`.
 */
export function bigHead(ctx: Ctx, L: Look, p: Pose, x: number, y: number, R: number, a: number, m: number, lw: number, id: number): void {
  const k = R / L.b.headW;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * m, k);
  ctx.rotate(a);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  paintHead(ctx, L, p, lw / k, id, m, true, false, false);
  ctx.restore();
}

// ---------------------------------------------------------------- the whole figure

/** Something a caller draws among the figure's parts, in screen space: before the near arm (an instrument held in front of the body). */
export type Hold = (ctx: Ctx) => void;

/** Below this head width on screen (px) the small touches (teeth, glints, a brushed sleeve) are left out. */
const DETAIL_PX = 10;

/** Below this head width on screen (px), a figure is small: its shading and fine touches are left out. */
const SMALL_PX = 8;

/** The ink under the figure's far side (its coat-tails, far arm and far leg), grown by the ink's width w, as subpaths of one path. */
function inkBehind(ctx: Ctx, L: Look, p: Pose, r: Rig, legs: boolean, hr: number, w: number): void {
  const b = L.b;
  if (L.tails) tailsPath(ctx, b, r, p.swing, w);
  limb(ctx, r.shF, b.arm0 + w, r.elF, b.arm1 + w, r.wrF, b.arm2 + w);
  circle(ctx, r.wrF.x, r.wrF.y, hr + w);
  if (legs) {
    limb(ctx, r.hipF, b.leg0 + w, r.kneeF, b.leg1 + w, r.ankleF, b.leg2 + w);
    shoe(ctx, b, r.ballF.x, r.ballF.y, r.pitchF, w);
  }
}

/** The ink under the figure's body: the near leg, the torso, the skirt. */
function inkBody(ctx: Ctx, L: Look, p: Pose, r: Rig, legs: boolean, w: number): void {
  const b = L.b;
  if (legs) {
    limb(ctx, r.hipN, b.leg0 + w, r.kneeN, b.leg1 + w, r.ankleN, b.leg2 + w);
    shoe(ctx, b, r.ballN.x, r.ballN.y, r.pitchN, w);
  }
  torsoPath(ctx, b, r, p.twist, 0, 1, w);
  if (L.skirt) skirtPath(ctx, b, r, L.skirtLen ?? b.thigh * 1.2, p.swing, 1, w);
}

/** Run `fn` with the path it adds grown by factor k about (cx, cy) (an ink underlay for a shape with no width to grow). */
function grown(ctx: Ctx, cx: number, cy: number, kx: number, ky: number, fn: () => void): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(kx, ky);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

function nearThumb(r: Rig): number {
  return Math.atan2(r.wrN.y - r.elN.y, r.wrN.x - r.elN.x) + 0.9;
}

/**
 * Draw figure `f` with its feet at (x, y) on screen, `u` px a unit, ink `lw` px: it solves its
 * rig from the pose its behavior set this frame, inks its whole silhouette at once (the ink's
 * fill is also its black shoes), then paints its parts back to front over it: the coat-tails,
 * the far arm and leg a shade darker, the torso and the near leg, the skirt, the head (hair,
 * face, mask, hat), the beads, `hold` (in screen space), and the near arm over all, inked again
 * where it crosses the body.
 */
export function draw(ctx: Ctx, f: Folk, x: number, y: number, u: number, lw: number, hold?: Hold): void {
  const L = f.look;
  const b = L.b;
  const p = f.pose;
  const r = solve(b, p, f.rig);
  const k = u * f.size;
  const w = (lw * 0.6) / k;
  const m = f.m;
  // Lit from the upper left of the screen: the shaded side, in the figure's own frame.
  const sd = m;
  const px = b.headW * k * f.lod;
  const detail = px > DETAIL_PX;
  const small = px < SMALL_PX;
  const legs = f.legs;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * m, k);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const sleeve = L.sleeve ?? L.top;
  const handC = L.gloves ? BONE : L.skin;
  const hr = b.hand * (L.gloves ? 1.25 : 1);

  // Back to front, each layer on its ink: the far side, the body, the head, the near arm.
  ctx.beginPath();
  inkBehind(ctx, L, p, r, legs, hr, w);
  ctx.fillStyle = INK;
  ctx.fill();
  if (L.tails) {
    ctx.beginPath();
    tailsPath(ctx, b, r, p.swing);
    ctx.fillStyle = L.top.shade;
    ctx.fill();
  }
  // The far arm and leg, a shade darker.
  ctx.beginPath();
  limb(ctx, r.shF, b.arm0, r.elF, b.arm1, r.wrF, b.arm2);
  ctx.fillStyle = sleeve.shade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, r.wrF.x, r.wrF.y, hr);
  ctx.fillStyle = handC.shade;
  ctx.fill();
  if (legs) {
    ctx.beginPath();
    limb(ctx, r.hipF, b.leg0, r.kneeF, b.leg1, r.ankleF, b.leg2);
    ctx.fillStyle = L.skirt ? L.skin.shade : L.bottom.shade;
    ctx.fill();
    if (L.shoes) {
      ctx.beginPath();
      shoe(ctx, b, r.ballF.x, r.ballF.y, r.pitchF);
      ctx.fillStyle = L.shoes;
      ctx.fill();
    }
  }
  if (L.bones) {
    if (legs) bonesDown(ctx, r.hipF, r.kneeF, r.ankleF, b);
    bonesDown(ctx, r.shF, r.elF, r.wrF, b);
  }
  ctx.beginPath();
  inkBody(ctx, L, p, r, legs, w);
  ctx.fillStyle = INK;
  ctx.fill();
  if (legs && (L.skirt || L.shoes)) {
    ctx.beginPath();
    if (L.skirt) limb(ctx, r.hipN, b.leg0, r.kneeN, b.leg1, r.ankleN, b.leg2);
    if (L.shoes) shoe(ctx, b, r.ballN.x, r.ballN.y, r.pitchN);
    ctx.fillStyle = L.skirt ? L.skin.body : L.shoes!;
    ctx.fill();
    if (L.skirt && L.shoes) {
      ctx.beginPath();
      shoe(ctx, b, r.ballN.x, r.ballN.y, r.pitchN);
      ctx.fillStyle = L.shoes;
      ctx.fill();
    }
  }

  // The torso; then the near leg and the trousers to the belt in one.
  ctx.beginPath();
  torsoPath(ctx, b, r, p.twist, 0, 1);
  ctx.fillStyle = L.top.body;
  ctx.fill();
  if (!L.skirt && (legs || L.bottom !== L.top)) {
    ctx.beginPath();
    if (legs) limb(ctx, r.hipN, b.leg0, r.kneeN, b.leg1, r.ankleN, b.leg2);
    if (L.bottom !== L.top) torsoPath(ctx, b, r, p.twist, 0, 0.3);
    ctx.fillStyle = L.bottom.body;
    ctx.fill();
    if (legs && L.bones) bonesDown(ctx, r.hipN, r.kneeN, r.ankleN, b);
  }
  torsoDress(ctx, L, r, w, sd, detail, small);
  if (L.skirt) {
    // A petticoat's ruffle peeking under the skirt, the skirt over it, a layer of paper each.
    const len = L.skirtLen ?? b.thigh * 1.2;
    ctx.beginPath();
    skirtPath(ctx, b, r, len, p.swing, 1);
    ctx.fillStyle = (L.frill ?? L.skirt).body;
    ctx.fill();
    if (!small) {
      ctx.beginPath();
      skirtPath(ctx, b, r, len * 0.82, p.swing * 1.2, 1, w * 0.8);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    ctx.beginPath();
    skirtPath(ctx, b, r, len * 0.82, p.swing * 1.2, 1);
    ctx.fillStyle = L.skirt.body;
    ctx.fill();
    if (!small) {
      ctx.beginPath();
      skirtPath(ctx, b, r, len * 0.36, p.swing, 0);
      ctx.fillStyle = L.skirt.light;
      ctx.fill();
    }
  }

  // The head on its neck.
  ctx.save();
  ctx.translate(r.head.x, r.head.y);
  ctx.rotate(r.headA);
  paintHead(ctx, L, p, w, f.id, sd, detail, small);
  ctx.restore();

  if (L.beads) neckBeads(ctx, L.beads, r, b, p, w, small);

  if (hold) {
    ctx.restore();
    hold(ctx);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k * m, k);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }

  // The near arm over everything, on its own ink.
  const ta = nearThumb(r);
  ctx.beginPath();
  limb(ctx, r.shN, b.arm0 + w, r.elN, b.arm1 + w, r.wrN, b.arm2 + w);
  hand(ctx, r.wrN.x, r.wrN.y, hr + w, ta);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  limb(ctx, r.shN, b.arm0, r.elN, b.arm1, r.wrN, b.arm2);
  ctx.fillStyle = sleeve.body;
  ctx.fill();
  ctx.beginPath();
  hand(ctx, r.wrN.x, r.wrN.y, hr, ta);
  ctx.fillStyle = handC.body;
  ctx.fill();
  if (L.bones) bonesDown(ctx, r.shN, r.elN, r.wrN, b);
  ctx.restore();
}

/** Solve a figure's rig without drawing it (for tests, and to place what it holds before drawing it). */
export function solveFolk(f: Folk): Rig {
  return solve(f.look.b, f.pose, f.rig);
}

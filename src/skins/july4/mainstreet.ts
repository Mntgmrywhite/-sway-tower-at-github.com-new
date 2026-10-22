import { circle, hash, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLOOMS, BUTTERFLY, DARK_BROWN, GLINT, GLOBE, GLOBE_LIT, IRON, LEAVES, PICKET } from "./colors";
import { usFlag } from "./flag";
import { mainLine, mainShows } from "./land";
import { blob, caps, poly, wash, type Lobe } from "./paint";
import { breeze } from "./life";
import { dot, scallops, swagBand } from "./shapes";
import type { Tone } from "./tone";

// Main Street, the far side of the town square: a nostalgic row of storefronts down both sides
// of the square, painted soft and drawn round with a fine warm line: red brick and painted
// clapboard in butter yellow, mint, powder blue, rose and cream, cream cornices and lintels. Every
// front has the same ground floor (STORY: a shop window, a door, a striped awning with a scalloped
// edge, the glass catching the sun now and then) and as many upper floors as its height holds,
// so the row steps up from one-story shops by the square to three-story blocks at the screen's
// sides, framing the scene. Flower boxes of red and white geraniums under the first upper
// windows, sign boards lettered with plain trades on the false fronts, little flags flying from
// the upper floors, a great flag hung down a brick front, an iron balcony draped with bunting,
// pleated fans of bunting along the cornices. In front, along the square: tall elms on the
// sidewalk, their leaves shifting in the breeze; vintage lampposts hung with patriotic banners;
// a white picket fence draped with bunting; flower beds with butterflies at play. The middle
// stays open, the square's lawn running back under a low clipped hedge to the treetops of the
// park beyond, so the town feels broad and the view behind the tower is calm (nothing moves
// there; the storefronts keep to the sides).
//
// Positions are in u from the screen's center (X), heights in u up from Main Street's line.

/** Main Street opens out behind the tower: the storefronts start this far out (u). */
const OPEN = 0.255;

/** A storefront: its width and height (u), its paint (Tone.fronts), its top (0 a cornice, 1 a false front, 2 a gable), its awning's stripe, a flag, flower boxes. */
interface Front {
  w: number;
  h: number;
  paint: number;
  top: 0 | 1 | 2;
  awning: number;
  flag: boolean;
  /** Its upper story's dress: a great flag hung down it (1) or an iron balcony draped with bunting (2). */
  dress?: 1 | 2;
}

/** Each side's storefronts, from the square outward. */
const LEFT: Front[] = [
  { w: 0.122, h: 0.19, paint: 0, top: 0, awning: 0, flag: false, dress: 1 },
  { w: 0.118, h: 0.29, paint: 1, top: 1, awning: 1, flag: true },
  { w: 0.13, h: 0.24, paint: 2, top: 2, awning: 2, flag: true },
  { w: 0.12, h: 0.32, paint: 0, top: 0, awning: 3, flag: false },
  { w: 0.125, h: 0.165, paint: 4, top: 1, awning: 0, flag: true },
  { w: 0.12, h: 0.18, paint: 5, top: 2, awning: 2, flag: false },
];
const RIGHT: Front[] = [
  { w: 0.12, h: 0.172, paint: 3, top: 1, awning: 2, flag: false },
  { w: 0.13, h: 0.27, paint: 0, top: 0, awning: 0, flag: false, dress: 2 },
  { w: 0.118, h: 0.25, paint: 5, top: 2, awning: 1, flag: true },
  { w: 0.124, h: 0.32, paint: 4, top: 0, awning: 3, flag: true },
  { w: 0.12, h: 0.17, paint: 1, top: 1, awning: 0, flag: false },
  { w: 0.126, h: 0.19, paint: 0, top: 0, awning: 2, flag: true },
];

/** The tallest storefront standing anywhere between X0 and X1 (u from the screen's center), u above Main Street's line, its cornice included. */
export function frontsTop(X0: number, X1: number): number {
  let top = 0;
  for (const [side, list] of [
    [-1, LEFT],
    [1, RIGHT],
  ] as const) {
    let d = OPEN;
    for (const f of list) {
      const a = side < 0 ? -(d + f.w) : d;
      const b = a + f.w;
      d += f.w;
      if (b > X0 && a < X1) top = Math.max(top, f.h + 0.012);
    }
  }
  return top;
}

/** How much of a front's height its body fills all the way across, by its top (a cornice, a false front's parapet, a gable): body() below. */
const SOLID = [1, 0.9, 0.78] as const;
/** Kept clear of the storefronts' side edges (u), for their anti-aliasing. */
const EDGE = 0.004;

/**
 * The least height (u above Main Street's line) to which the storefronts' bodies fill all of X0..X1
 * (u from the screen's center), or 0 where that stretch is not all storefront (the open middle).
 */
function frontsFloor(X0: number, X1: number): number {
  const side = X0 >= 0 ? 1 : X1 <= 0 ? -1 : 0;
  if (side === 0) return 0;
  const a = side > 0 ? X0 : -X1;
  const b = side > 0 ? X1 : -X0;
  let d = OPEN;
  if (a < d + EDGE) return 0;
  let floor = Infinity;
  for (const f of side > 0 ? RIGHT : LEFT) {
    const e = d + f.w;
    if (e > a && d < b) floor = Math.min(floor, f.h * SOLID[f.top]);
    d = e;
  }
  return b > d - EDGE || floor === Infinity ? 0 : floor;
}

/**
 * Whether Main Street hides a thing of the far rows spanning X0..X1 (u from the screen's center)
 * whose highest point is at screen y `top` (px): below Main Street's line the trim along its foot
 * and the square's lawn cover the whole width, and above it the storefronts' bodies cover their
 * stretch up to their lowest crown. The far rows are drawn before it, so they skip what it hides.
 */
export function hiddenByMain(s: Scene, X0: number, X1: number, top: number): boolean {
  if (!mainShows(s)) return false;
  const line = mainLine(s);
  const y = top - HIDE_MARGIN;
  if (y >= line - s.u * 0.004) return true;
  return y >= line - frontsFloor(X0, X1) * s.u;
}
/** Room kept above the covering edge (px): an outline's half width and its anti-aliasing. */
const HIDE_MARGIN = 3;

/** What the false fronts' sign boards say: plain trades, no shop's name. */
const TRADES = ["BAKERY", "SODAS", "HARDWARE", "TOYS", "BARBER", "DRY GOODS"] as const;

/** The fine line round Main Street's things, and the thinnest it gets. */
function lineW(s: Scene): number {
  return Math.max(0.8, s.u * 0.0026);
}

/** The storefronts' reference height (u): their ground floor (shop window, awning, door) and first upper floor are laid out on it, whatever their height. */
const STORY = 0.19;
/** A further upper floor's height (u), and the room kept under the cornice above the top row of windows. */
const FLOOR = 0.064;
const UNDER_CORNICE = 0.03;

/** The ground floor's reference height (px) for a front: its own height up to STORY. */
function storyOf(s: Scene, f: Front): number {
  return Math.min(f.h, STORY) * s.u;
}

/** Calls `each` with the top (px) of every row of upper windows on a front, the lowest first. */
function eachRow(s: Scene, f: Front, line: number, each: (top: number) => void): void {
  const u = s.u;
  const g = storyOf(s, f);
  const top = line - f.h * u + UNDER_CORNICE * u;
  for (let r = 0; ; r++) {
    const y = line - g * 0.73 - r * FLOOR * u;
    if (r > 0 && y < top) break;
    each(y);
  }
}

/** Walks the storefronts on screen: their left edge and width (px), and the front. */
function eachFront(s: Scene, each: (x: number, w: number, f: Front, side: -1 | 1, i: number) => void): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (const side of [-1, 1] as const) {
    let d = OPEN;
    const list = side < 0 ? LEFT : RIGHT;
    for (let i = 0; i < list.length; i++) {
      const f = list[i]!;
      const x = side < 0 ? cx - (d + f.w) * u : cx + d * u;
      d += f.w;
      if (x > s.cssW || x + f.w * u < 0) continue;
      each(x, f.w * u, f, side, i);
    }
  }
}

/** The outline of a storefront's body (its top by kind), as its own subpath. */
function body(ctx: Ctx, x: number, w: number, line: number, h: number, top: 0 | 1 | 2): void {
  const y = line - h;
  ctx.moveTo(x, line + 1);
  if (top === 1) {
    // A false front: a stepped parapet with a rounded crown.
    ctx.lineTo(x, y + h * 0.1);
    ctx.lineTo(x + w * 0.16, y + h * 0.1);
    ctx.lineTo(x + w * 0.16, y + h * 0.03);
    ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.08, x + w * 0.84, y + h * 0.03);
    ctx.lineTo(x + w * 0.84, y + h * 0.1);
    ctx.lineTo(x + w, y + h * 0.1);
  } else if (top === 2) {
    // A clapboard front under its gable.
    ctx.lineTo(x, y + h * 0.22);
    ctx.lineTo(x + w * 0.5, y - h * 0.06);
    ctx.lineTo(x + w, y + h * 0.22);
  } else {
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
  }
  ctx.lineTo(x + w, line + 1);
  ctx.closePath();
}

/** The storefronts: bodies, cornices, upper windows with flower boxes, awnings, shop windows, flags, bunting. */
function storefronts(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const lw = lineW(s);
  // The bodies, a fill for each paint; then a soft shade over the foot of them all.
  for (let c = 0; c < tone.fronts.length; c++) {
    ctx.fillStyle = tone.fronts[c]!;
    ctx.beginPath();
    eachFront(s, (x, w, f) => {
      if (f.paint === c) body(ctx, x, w, line, f.h * u, f.top);
    });
    ctx.fill();
  }
  ctx.fillStyle = tone.mainLine;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  eachFront(s, (x, w, f) => ctx.rect(x, line - storyOf(s, f) * 0.18, w, storyOf(s, f) * 0.18 + 1));
  ctx.fill();
  ctx.globalAlpha = 1;
  // Brick courses on the brick fronts: a few soft lighter lines.
  ctx.fillStyle = tone.trim;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  const course = Math.max(0.6, u * 0.0016);
  eachFront(s, (x, w, f) => {
    if (f.paint !== 0) return;
    for (let k = 0.12; k < 0.55; k += 0.065) ctx.rect(x + w * 0.04, line - f.h * u * (1 - k), w * 0.92, course);
  });
  ctx.fill();
  ctx.globalAlpha = 1;
  // Cornices and the gables' trim, the lintels over the upper windows, the sills.
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    const h = f.h * u;
    const y = line - h;
    if (f.top === 0) {
      ctx.rect(x - u * 0.004, y - u * 0.004, w + u * 0.008, u * 0.012);
      for (let k = 0.08; k < 0.95; k += 0.12) ctx.rect(x + w * k, y + u * 0.008, w * 0.05, u * 0.005);
    } else if (f.top === 1) {
      ctx.rect(x + w * 0.2, y + h * 0.05, w * 0.6, h * 0.12);
    }
    // Upper windows: two tall ones a floor, their lintels and sills.
    const g = storyOf(s, f);
    eachRow(s, f, line, (wy) => {
      for (const k of [0.2, 0.6]) {
        ctx.rect(x + w * k - u * 0.002, wy, w * 0.2 + u * 0.004, u * 0.006);
        ctx.rect(x + w * k - u * 0.002, wy + g * 0.2 + u * 0.004, w * 0.2 + u * 0.004, u * 0.004);
      }
    });
  });
  ctx.fill();
  // The sign boards on the false fronts take the awning's color, lettered in cream with the shop's trade.
  for (let a = 0; a < 4; a++) {
    ctx.fillStyle = tone.awnings[a]!;
    ctx.beginPath();
    eachFront(s, (x, w, f) => {
      if (f.top !== 1 || f.awning !== a) return;
      ctx.rect(x + w * 0.22, line - f.h * u + u * 0.012, w * 0.56, u * 0.019);
    });
    ctx.fill();
  }
  ctx.fillStyle = tone.trim;
  ctx.font = `${Math.max(5, Math.round(u * 0.0125))}px Rye, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  eachFront(s, (x, w, f, side, i) => {
    if (f.top !== 1) return;
    const trade = TRADES[(i * 2 + (side > 0 ? 1 : 0)) % TRADES.length]!;
    ctx.fillText(trade, x + w * 0.5, line - f.h * u + u * 0.022, w * 0.5);
  });
  ctx.textBaseline = "alphabetic";
  // Upper windows' glass, and the shop windows and doors.
  ctx.fillStyle = tone.glass;
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    const g = storyOf(s, f);
    eachRow(s, f, line, (wy) => {
      for (const k of [0.2, 0.6]) ctx.rect(x + w * k, wy + u * 0.006, w * 0.2, g * 0.2);
    });
    ctx.rect(x + w * 0.08, line - g * 0.36, w * 0.5, g * 0.3);
    ctx.rect(x + w * 0.68, line - g * 0.42, w * 0.2, g * 0.42);
  });
  ctx.fill();
  // The glass's reflection: two soft diagonal streaks on each shop window.
  ctx.fillStyle = GLINT;
  ctx.globalAlpha = 0.28 * (1 - tone.lamps);
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    const h = storyOf(s, f);
    const y0 = line - h * 0.36;
    const x0 = x + w * 0.08;
    ctx.moveTo(x0 + w * 0.08, y0);
    ctx.lineTo(x0 + w * 0.18, y0);
    ctx.lineTo(x0 + w * 0.06, y0 + h * 0.3);
    ctx.lineTo(x0, y0 + h * 0.3);
    ctx.lineTo(x0, y0 + h * 0.16);
    ctx.closePath();
    ctx.moveTo(x0 + w * 0.26, y0);
    ctx.lineTo(x0 + w * 0.3, y0);
    ctx.lineTo(x0 + w * 0.18, y0 + h * 0.3);
    ctx.lineTo(x0 + w * 0.14, y0 + h * 0.3);
    ctx.closePath();
  });
  ctx.fill();
  ctx.globalAlpha = 1;
  glints(ctx, s, line);
  // The fine line round each body.
  ctx.beginPath();
  eachFront(s, (x, w, f) => body(ctx, x, w, line, f.h * u, f.top));
  ink(ctx, lw, tone.mainLine);
  flowerBoxes(ctx, s, tone, line);
  awnings(ctx, s, tone, line);
  // Bunting fans along the cornices of the brick fronts (a band's color in one fill for them all), and the flags.
  const bandInks = [tone.red, tone.white, tone.blue];
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = bandInks[b]!;
    ctx.beginPath();
    eachFront(s, (x, w, f) => {
      if (f.top !== 0) return;
      const y = line - f.h * u + u * 0.009;
      for (let k = 0; k < 3; k++) fanBand(ctx, x + w * (0.2 + k * 0.3), y, w * 0.12, b);
    });
    ctx.fill();
  }
  eachFront(s, (x, w, f) => {
    const g = storyOf(s, f);
    if (f.dress === 1) hungFlag(ctx, s, tone, x + w * 0.5, line - f.h * u + u * 0.014, w * 0.56, f.h * u - g * 0.44 - u * 0.022);
    else if (f.dress === 2) balcony(ctx, s, tone, x + w * 0.1, x + w * 0.9, line - g * 0.5, line - g * 0.9);
  });
  eachFront(s, (x, w, f, side, i) => {
    if (!f.flag) return;
    // A short pole angled out from the first upper floor, the flag flying toward the square.
    const px = side < 0 ? x + w * 0.96 : x + w * 0.04;
    const py = line - storyOf(s, f) * 0.6;
    const dir = side < 0 ? 1 : -1;
    ctx.strokeStyle = tone.mainLine;
    ctx.lineWidth = Math.max(0.8, u * 0.0022);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dir * u * 0.012, py - u * 0.026);
    ctx.stroke();
    usFlag(ctx, px + dir * u * 0.012, py - u * 0.026, u * 0.034, u * 0.022, dir, u * 0.003 * (1 + breeze(s.t)), s.t * 4 + i, { red: tone.red, white: tone.white, blue: tone.blue });
  });
}

/**
 * A great flag hung down a front from a rod under its cornice, as towns dress Main Street on the
 * Fourth: the flag turned over its diagonal so its stripes hang upright and its union is at the
 * top on the viewer's left; its foot stirs a little in the breeze.
 */
function hungFlag(ctx: Ctx, s: Scene, tone: Tone, x: number, top: number, w: number, len: number): void {
  const u = s.u;
  ctx.save();
  // Flying "down" from the rod: x along the fly becomes y down the front.
  ctx.transform(0, 1, 1, 0, x - w / 2, top);
  usFlag(ctx, 0, 0, len, w, 1, u * 0.0015 * (1 + 2 * breeze(s.t)), s.t * 1.3, { red: tone.red, white: tone.white, blue: tone.blue });
  ctx.restore();
  ctx.fillStyle = tone.gold;
  ctx.beginPath();
  ctx.rect(x - w / 2 - u * 0.004, top - u * 0.003, w + u * 0.008, u * 0.004);
  circle(ctx, x - w / 2 - u * 0.005, top - u * 0.001, u * 0.003);
  circle(ctx, x + w / 2 + u * 0.005, top - u * 0.001, u * 0.003);
  ctx.fill();
}

/** An iron balcony across a front's upper story: its floor, railing and posts, a swag of bunting draped over its rail, a flag on a short pole at its end. */
function balcony(ctx: Ctx, s: Scene, tone: Tone, x0: number, x1: number, floor: number, top: number): void {
  const u = s.u;
  const rail = floor - u * 0.022;
  ctx.fillStyle = tone.mainLine;
  ctx.beginPath();
  ctx.rect(x0 - u * 0.004, floor, x1 - x0 + u * 0.008, u * 0.005);
  ctx.rect(x0, rail, x1 - x0, u * 0.003);
  for (let k = 0; k <= 8; k++) ctx.rect(x0 + ((x1 - x0) * k) / 8 - u * 0.0008, rail, u * 0.0016, floor - rail);
  ctx.fill();
  const b = breeze(s.t);
  const sag = u * (0.016 + 0.003 * Math.sin(s.t * 1.2) + 0.004 * b);
  fanSwag(ctx, tone, x0, x1, rail + u * 0.002, sag);
  const dir = x0 < s.cssW / 2 ? 1 : -1;
  const px = dir > 0 ? x1 : x0;
  ctx.strokeStyle = tone.mainLine;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.beginPath();
  ctx.moveTo(px, floor);
  ctx.lineTo(px, Math.max(top, rail - u * 0.05));
  ctx.stroke();
  usFlag(ctx, px, Math.max(top, rail - u * 0.05), u * 0.036, u * 0.024, (-dir) as 1 | -1, u * 0.003 * (1 + b), s.t * 3.6, { red: tone.red, white: tone.white, blue: tone.blue });
}

/** A swag of bunting from x0 to x1 along y, sagging `sag`: red outermost, then cream, then blue. */
function fanSwag(ctx: Ctx, tone: Tone, x0: number, x1: number, y: number, sag: number): void {
  const bands = [tone.red, tone.white, tone.blue];
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = bands[b]!;
    ctx.beginPath();
    swagBand(ctx, x0, x1, y, sag, b, 3);
    ctx.fill();
  }
}

/** Band `b` of a pleated fan of bunting hung from (x, y) (0 the red outermost), as its own subpath. */
function fanBand(ctx: Ctx, x: number, y: number, r: number, b: number): void {
  const r0 = r * (1 - b * 0.3);
  ctx.moveTo(x - r0, y);
  ctx.ellipse(x, y, r0, r0 * 0.75, 0, Math.PI, 0, true);
  ctx.closePath();
}

/** Flower boxes under the upper windows: a wooden box, leaves, red and white geraniums. */
function flowerBoxes(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  ctx.fillStyle = tone.awnings[1]!;
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    if (f.top === 1) return;
    const y = line - storyOf(s, f) * 0.53 + u * 0.01;
    for (const k of [0.2, 0.6]) ctx.rect(x + w * k - u * 0.003, y, w * 0.2 + u * 0.006, u * 0.008);
  });
  ctx.fill();
  for (let c = 0; c < 2; c++) {
    ctx.fillStyle = c ? tone.white : tone.red;
    ctx.beginPath();
    eachFront(s, (x, w, f) => {
      if (f.top === 1) return;
      const y = line - storyOf(s, f) * 0.53 + u * 0.008;
      for (const k of [0.2, 0.6]) for (let j = c; j < 4; j += 2) dot(ctx, x + w * (k + 0.03 + j * 0.047), y - u * 0.002, u * 0.0042);
    });
    ctx.fill();
  }
}

/** Striped awnings over the shop windows, scalloped along their edge, their stripes in the front's color and cream. */
function awnings(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const lw = lineW(s);
  const slope = (x: number, w: number, f: Front) => {
    const h = storyOf(s, f);
    return { x0: x + w * 0.04, x1: x + w * 0.96, y0: line - h * 0.44, y1: line - h * 0.34 };
  };
  // The cream underneath, the colored stripes over it, the scalloped valance.
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    const { x0, x1, y0, y1 } = slope(x, w, f);
    ctx.moveTo(x0 + u * 0.004, y0);
    ctx.lineTo(x1 - u * 0.004, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x0, y1);
    ctx.closePath();
  });
  ctx.fill();
  for (let a = 0; a < 4; a++) {
    ctx.fillStyle = tone.awnings[a]!;
    ctx.beginPath();
    eachFront(s, (x, w, f) => {
      if (f.awning !== a) return;
      const { x0, x1, y0, y1 } = slope(x, w, f);
      const n = 7;
      for (let j = 0; j < n; j += 2) {
        const k0 = j / n;
        const k1 = (j + 1) / n;
        ctx.moveTo(x0 + u * 0.004 + (x1 - x0 - u * 0.008) * k0, y0);
        ctx.lineTo(x0 + u * 0.004 + (x1 - x0 - u * 0.008) * k1, y0);
        ctx.lineTo(x0 + (x1 - x0) * k1, y1);
        ctx.lineTo(x0 + (x1 - x0) * k0, y1);
        ctx.closePath();
        // Its scallop below.
        const mx = x0 + (x1 - x0) * (k0 + k1) / 2;
        ctx.moveTo(x0 + (x1 - x0) * k0, y1);
        ctx.quadraticCurveTo(mx, y1 + u * 0.014, x0 + (x1 - x0) * k1, y1);
        ctx.closePath();
      }
    });
    ctx.fill();
  }
  ctx.beginPath();
  eachFront(s, (x, w, f) => {
    const { x0, x1, y0, y1 } = slope(x, w, f);
    ctx.moveTo(x0 + u * 0.004, y0);
    ctx.lineTo(x1 - u * 0.004, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x0, y1);
    ctx.closePath();
  });
  ink(ctx, lw, tone.mainLine);
}

/** Now and then the sun glints across a shop window: every GLINT_EVERY seconds, a different one, first at GLINT_AT. */
const GLINT_AT = 2.4;
const GLINT_EVERY = 4.7;
const GLINT_TIME = 0.7;

function glints(ctx: Ctx, s: Scene, line: number): void {
  const n = Math.floor((s.t - GLINT_AT) / GLINT_EVERY);
  if (s.t < GLINT_AT) return;
  const k = (s.t - GLINT_AT - n * GLINT_EVERY) / GLINT_TIME;
  if (k >= 1) return;
  const pick = Math.floor(hash(n + 7900) * 4);
  eachFront(s, (x, w, f, side, i) => {
    if (i !== pick % 2 || (side < 0) !== pick < 2) return;
    const h = storyOf(s, f);
    const y0 = line - h * 0.36;
    const gx = x + w * 0.08 + w * 0.5 * k;
    ctx.fillStyle = GLINT;
    ctx.globalAlpha = 0.7 * Math.sin(k * Math.PI);
    ctx.beginPath();
    ctx.moveTo(gx, y0);
    ctx.lineTo(Math.min(x + w * 0.58, gx + w * 0.06), y0);
    ctx.lineTo(Math.max(x + w * 0.08, gx - w * 0.04), y0 + h * 0.3);
    ctx.lineTo(Math.max(x + w * 0.08, gx - w * 0.1), y0 + h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ---------------------------------------------------------------- along the square

/** The big summer trees either side, on Main Street's sidewalk: X (u), and their crowns (u about the top of the trunk). */
const TREES = [-0.44, 0.44] as const;
/** The crowns' size (u to the unit of CROWN): held inside a phone's screen. */
const CROWN_K = 0.78;
/** The crowns are drawn narrow for their height: a tall elm's vase, so it hides less of the storefronts behind it. */
const CROWN_NARROW = 0.66;
const TREE_H = 0.15;
const CROWN: Lobe[] = [
  [-0.05, 0.0, 0.045],
  [0.045, 0.004, 0.044],
  [-0.02, -0.045, 0.05],
  [0.03, -0.04, 0.046],
  [0.0, -0.085, 0.042],
  [-0.055, -0.03, 0.032],
  [0.062, -0.03, 0.03],
  [0.0, 0.01, 0.04],
];

const CROWN_BLOB = blob(CROWN, 0.6, 0, 32);
/** The crown's middle and half width (its units), about which its outline is grown for the line round it. */
const CROWN_MID = (CROWN_BLOB.left + CROWN_BLOB.right) / 2;
const CROWN_MIDY = (CROWN_BLOB.top + CROWN_BLOB.bottom) / 2;
const CROWN_W = (CROWN_BLOB.right - CROWN_BLOB.left) / 2;
/** The big trees' tops (u above Main Street's line): what stands highest on Main Street's sidewalk. */
export const TREES_TOP = TREE_H - 0.01 - CROWN_BLOB.top * CROWN_K;

/** A big summer tree: trunk and limbs, a round crown with its shaded underside, lit caps shifting in the breeze, lined. */
function bigTree(ctx: Ctx, s: Scene, tone: Tone, x: number, foot: number, i: number): void {
  const u = s.u;
  const lw = lineW(s);
  const top = foot - TREE_H * u;
  ctx.fillStyle = tone.trunk;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.01, foot);
  ctx.quadraticCurveTo(x - u * 0.006, top + u * 0.04, x - u * 0.02, top + u * 0.01);
  ctx.lineTo(x - u * 0.012, top + u * 0.004);
  ctx.lineTo(x, top + u * 0.03);
  ctx.lineTo(x + u * 0.014, top + u * 0.004);
  ctx.lineTo(x + u * 0.02, top + u * 0.012);
  ctx.quadraticCurveTo(x + u * 0.006, top + u * 0.04, x + u * 0.01, foot);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lw, tone.mainLine);
  // The crown sways a hair with the breeze; its lit caps shift. Its fine line is the crown's
  // outline a little larger, laid under it (a fill costs less than a stroke round it).
  const b = breeze(s.t + i * 1.7);
  const sway = (Math.sin(s.t * 0.7 + i * 2) * 0.002 + b * 0.004) * u;
  const ky = u * CROWN_K;
  const k = ky * CROWN_NARROW;
  const gx = 1 + (lw * 2) / (CROWN_W * k);
  const gy = 1 + (lw * 2) / (CROWN_W * ky);
  ctx.fillStyle = tone.mainLine;
  ctx.beginPath();
  poly(ctx, CROWN_BLOB.outline, x + sway + CROWN_MID * k * (1 - gx), top + CROWN_MIDY * ky * (1 - gy), k * gx, 1, ky * gy);
  ctx.fill();
  ctx.fillStyle = tone.tree[0];
  ctx.beginPath();
  poly(ctx, CROWN_BLOB.outline, x + sway, top, k, 1, ky);
  ctx.fill();
  ctx.fillStyle = tone.tree[1];
  ctx.beginPath();
  poly(ctx, CROWN_BLOB.body, x + sway, top, k, 1, ky);
  ctx.fill();
  ctx.fillStyle = tone.tree[2];
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  const shift = (Math.sin(s.t * 1.9 + i) * 0.003 + b * 0.006) * u;
  caps(ctx, CROWN_BLOB, x + sway + shift, top, k, 1, ky);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The lampposts on the square's far side: X (u), their height (u). */
const LAMPS = [-0.29, 0.29] as const;
const LAMP_H = 0.13;

/** A vintage lamppost: a dark fluted post on a base, a white globe lamp (lit at dusk), an arm with a patriotic banner swaying from it. */
function lamppost(ctx: Ctx, s: Scene, tone: Tone, x: number, foot: number, i: number): void {
  const u = s.u;
  const lw = lineW(s);
  const top = foot - LAMP_H * u;
  const dark = IRON;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.rect(x - u * 0.0035, top + u * 0.01, u * 0.007, LAMP_H * u - u * 0.01);
  ctx.moveTo(x - u * 0.009, foot);
  ctx.lineTo(x - u * 0.006, foot - u * 0.016);
  ctx.lineTo(x + u * 0.006, foot - u * 0.016);
  ctx.lineTo(x + u * 0.009, foot);
  ctx.closePath();
  ctx.rect(x - u * 0.007, top + u * 0.008, u * 0.014, u * 0.004);
  ctx.fill();
  // The arm toward the square, its banner: navy with a cream star over red and cream stripes, swaying.
  const side = x < s.cssW / 2 ? 1 : -1;
  const ay = top + u * 0.03;
  ctx.fillRect(Math.min(x, x + side * u * 0.026), ay, u * 0.026, u * 0.003);
  const bx = x + side * u * 0.024;
  const swing = (Math.sin(s.t * 1.6 + i * 2.2) * 0.003 + breeze(s.t + i) * 0.006) * u;
  const bw = u * 0.016;
  const bh = u * 0.04;
  ctx.fillStyle = tone.blue;
  ctx.beginPath();
  ctx.moveTo(bx - bw / 2, ay + u * 0.003);
  ctx.lineTo(bx + bw / 2, ay + u * 0.003);
  ctx.lineTo(bx + bw / 2 + swing * 0.5, ay + bh * 0.42);
  ctx.lineTo(bx - bw / 2 + swing * 0.5, ay + bh * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(bx - bw / 2 + swing * 0.5, ay + bh * 0.42);
  ctx.lineTo(bx + bw / 2 + swing * 0.5, ay + bh * 0.42);
  ctx.lineTo(bx + bw / 2 + swing, ay + bh);
  ctx.lineTo(bx + swing, ay + bh * 0.82);
  ctx.lineTo(bx - bw / 2 + swing, ay + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  ctx.rect(bx - bw / 2 + swing * 0.6, ay + bh * 0.55, bw, bh * 0.09);
  circle(ctx, bx + swing * 0.25, ay + bh * 0.2, bw * 0.2);
  ctx.fill();
  // The globe: a soft white ball, glowing warm at dusk.
  ctx.fillStyle = tone.lamps > 0.05 ? GLOBE_LIT : GLOBE;
  ctx.beginPath();
  circle(ctx, x, top + u * 0.002, u * 0.011);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, top + u * 0.002, u * 0.011);
  ink(ctx, lw * 0.8, tone.mainLine);
}

/** The picket fence along the square's far side, either side of the open middle: rails, pointed pickets, bunting swags on top. */
function fence(ctx: Ctx, s: Scene, tone: Tone, foot: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const ph = u * 0.03;
  const pitch = u * 0.013;
  const pw = pitch * 0.55;
  const from = OPEN + 0.008;
  ctx.fillStyle = PICKET.shade;
  ctx.beginPath();
  ctx.rect(-1, foot - ph * 0.72, cx - from * u + 1, u * 0.004);
  ctx.rect(-1, foot - ph * 0.3, cx - from * u + 1, u * 0.004);
  ctx.rect(cx + from * u, foot - ph * 0.72, s.cssW, u * 0.004);
  ctx.rect(cx + from * u, foot - ph * 0.3, s.cssW, u * 0.004);
  ctx.fill();
  ctx.fillStyle = PICKET.light;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let d = from * u + pw; ; d += pitch) {
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
  // Bunting swags draped along the top rail, a swag every SWAG, swaying a little.
  const swag = u * 0.085;
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; ; i++) {
        const d0 = from * u + i * swag;
        if (d0 > s.cssW / 2 + swag) break;
        const x0 = cx + side * d0;
        const x1 = cx + side * (d0 + swag);
        const y = foot - ph * 0.85;
        const sag = u * (0.014 + 0.002 * Math.sin(s.t * 1.4 + i + side) + 0.004 * breeze(s.t + i * 0.3));
        swagBand(ctx, Math.min(x0, x1), Math.max(x0, x1), y, sag, band, 3);
      }
    }
    ctx.fill();
  }
}

/** The flower beds in front of the fence: a scalloped mound of leaves each side, and blooms in red, white, blue and gold. */
function flowerBeds(ctx: Ctx, s: Scene, foot: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const from = OPEN + 0.01;
  const x0 = cx + (from - 0.006) * u;
  ctx.fillStyle = LEAVES;
  ctx.beginPath();
  scallops(ctx, -u * 0.02, 2 * cx - x0, foot - u * 0.008, u * 0.018, u * 0.006, u * 0.014);
  scallops(ctx, x0, s.cssW + u * 0.02, foot - u * 0.008, u * 0.018, u * 0.006, u * 0.014);
  ctx.fill();
  for (let c = 0; c < BLOOMS.length; c++) {
    ctx.fillStyle = BLOOMS[c]!;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      let i = 0;
      for (let d = from; cx + side * d * u > u * 0.008 && cx + side * d * u < s.cssW - u * 0.008; d += 0.011, i++) {
        if (Math.floor(hash(i * 7 + (side > 0 ? 40 : 0) + 7950) * BLOOMS.length) !== c) continue;
        dot(ctx, cx + side * d * u, foot - u * (0.01 + hash(i + 7990 + side) * 0.01), u * 0.0045);
      }
    }
    ctx.fill();
  }
}

/** Butterflies over the flower beds: each flutters about its own spot on its own rhythm, wings opening and closing. */
const FLUTTERS = [
  { X: -0.31, every: 2.3, phase: 0.2, c: 0 },
  { X: -0.42, every: 3.1, phase: 1.5, c: 1 },
  { X: 0.35, every: 2.7, phase: 0.9, c: 2 },
  { X: 0.46, every: 3.4, phase: 2.2, c: 0 },
] as const;

export function butterflies(ctx: Ctx, s: Scene, foot: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (const f of FLUTTERS) {
    const t = s.t + f.phase;
    const x = cx + (f.X + Math.sin(t * 0.8) * 0.025 + Math.sin(t * 2.1) * 0.006) * u;
    if (x < u * 0.02 || x > s.cssW - u * 0.02) continue;
    const y = foot - u * (0.04 + Math.sin(t * 1.3) * 0.012 + Math.abs(Math.sin(t * 3.7)) * 0.008);
    const open = Math.abs(Math.sin(t * (Math.PI * 2 / f.every) * 4));
    const w = u * 0.008 * (0.25 + 0.75 * open);
    ctx.fillStyle = BUTTERFLY[f.c]!;
    ctx.beginPath();
    ctx.ellipse(x - w * 0.6, y - u * 0.002, w * 0.6, u * 0.006, -0.3, 0, Math.PI * 2);
    ctx.moveTo(x + w * 1.2, y - u * 0.002);
    ctx.ellipse(x + w * 0.6, y - u * 0.002, w * 0.6, u * 0.006, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DARK_BROWN;
    ctx.fillRect(x - u * 0.0008, y - u * 0.006, u * 0.0016, u * 0.009);
  }
}

/** The low clipped hedge across the open middle, under the lawn's far edge: calm, unlined. */
function hedge(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hw = (OPEN + 0.02) * u;
  ctx.fillStyle = wash(ctx, line - u * 0.02, line + u * 0.012, [tone.tree[1], tone.tree[0]]);
  ctx.beginPath();
  ctx.moveTo(cx - hw, line + u * 0.012);
  ctx.lineTo(cx - hw, line - u * 0.006);
  for (let x = -hw; x < hw; x += u * 0.03) ctx.quadraticCurveTo(cx + x + u * 0.015, line - u * 0.02, cx + x + u * 0.03, line - u * 0.006);
  ctx.lineTo(cx + hw, line + u * 0.012);
  ctx.closePath();
  ctx.fill();
}

/** The fence's foot, the flower beds' and the lampposts' (u below Main Street's line). */
export const FENCE_FOOT = 0.04;
const LAMP_FOOT = 0.06;

/** Main Street's row: the sidewalk along its feet and the storefronts. */
export function storeRow(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  const u = s.u;
  if (line - 0.36 * u > s.cssH) return;
  ctx.fillStyle = tone.trim;
  ctx.fillRect(0, line - u * 0.004, s.cssW, u * 0.016);
  storefronts(ctx, s, tone, line);
}

/** The big summer trees on Main Street's sidewalk. */
export function bigTrees(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  const u = s.u;
  if (line - 0.36 * u > s.cssH) return;
  const cx = s.cssW / 2;
  TREES.forEach((X, i) => bigTree(ctx, s, tone, cx + X * u, line + u * 0.01, i));
}

/** Main Street itself: the storefronts, and the big trees on the sidewalk in front of them. */
export function mainStreet(ctx: Ctx, s: Scene, tone: Tone): void {
  storeRow(ctx, s, tone);
  bigTrees(ctx, s, tone);
}

/** The low clipped hedge across the square's open middle. */
export function middleHedge(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  if (line > s.cssH) return;
  hedge(ctx, s, tone, line + s.u * 0.024);
}

/** The picket fence along the square's far side, either side of the open middle, with its flower beds. */
export function fenceAndBeds(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  const u = s.u;
  if (line > s.cssH) return;
  fence(ctx, s, tone, line + FENCE_FOOT * u);
  flowerBeds(ctx, s, line + FENCE_FOOT * u + u * 0.012);
}

/** The lampposts on the square's far side, their banners. */
export function lampPosts(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  const u = s.u;
  if (line > s.cssH) return;
  const cx = s.cssW / 2;
  LAMPS.forEach((X, i) => lamppost(ctx, s, tone, cx + X * u, line + LAMP_FOOT * u, i));
}

/** The square's far edge, on its lawn: the hedge across the middle, the fence and the flower beds at the sides, the lampposts, the butterflies. */
export function squareEdge(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = mainLine(s);
  const u = s.u;
  if (line > s.cssH) return;
  middleHedge(ctx, s, tone);
  fenceAndBeds(ctx, s, tone);
  lampPosts(ctx, s, tone);
  butterflies(ctx, s, line + FENCE_FOOT * u + u * 0.012);
}

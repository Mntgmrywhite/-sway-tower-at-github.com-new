import { circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import {
  AWNING_A,
  AWNING_B,
  BEAK,
  BERRY,
  BRASS,
  BRASS_LIGHT,
  BRICK,
  BRICK_MARK,
  BRICK_SHADE,
  DIM_PANE,
  DOOR_GREEN,
  DOOR_GREEN_LIGHT,
  DOOR_RED,
  FRAME,
  HOLLY,
  HOLLY_DARK,
  INK,
  IRON,
  LAMP,
  LAMP_CORE,
  LAMP_DEEP,
  POT,
  SHAWL,
  SIGN_GOLD,
  SIGN_GREEN,
  SIGN_RED,
  SMOKE,
  SNOW,
  SOOT,
  SOOT_MARK,
  SOOT_SHADE,
  STUCCO,
  STUCCO_SHADE,
} from "./colors";
import { glow, snowCap } from "./shapes";

// Two crooked Victorian townhouses framing the street, one on each side of the tower, as
// ink-outlined cartoons: on the left, Scrooge & Marley's sooty counting house (a stucco
// ground floor with its painted sign, one stingy candle in the office window, and Marley's
// face on the brass door knocker, which shimmers now and then); on the right, the poulterer's
// with a striped awning and a prize goose in the window, a wreath on its red door. Both have
// candlelit sash windows with snowy sills, snowy gables and smoking chimney pots.
//
// Each house is drawn in its own frame: origin at its bottom-left foot, x to the right and
// y UP in depth units (u at the tower's depth), scaled by U px per unit and skewed by `lean`
// so the whole facade leans a little. `Y(v)` flips a height to canvas y.

const Y = (v: number) => -v;

/** Rectangle from its bottom-left corner (x, y up), as its own subpath. */
function rect(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.rect(x, Y(y + h), w, h);
}

export interface HouseFrame {
  /** Screen x of the house's left foot, screen y of its ground line, px per unit. */
  x: number;
  y: number;
  U: number;
  /** Ink width in px. */
  lw: number;
  t: number;
}

// ---------------------------------------------------------------- shared parts

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 dark pane, 1 lit, 2 lit with drawn curtains, 3 dim with a single candle. */
  kind: number;
  /** Panes across and down. */
  cols: number;
  rows: number;
}

/** How far the gable's eaves, and the snow on them, reach past the walls. */
const EAVE = 0.009;
const SNOW_EAVE = 0.012;

/** Brick marks, as (x, y) fractions of the wall, precomputed: little two-brick clusters. */
const MARKS = Array.from({ length: 22 }, (_, i) => [hash(i + 9100), hash(i + 9200)] as const);

/** Walls and a front gable: outline from the left foot round to the right foot. */
function shellPath(ctx: Ctx, w: number, H: number, roof: number, eave: number): void {
  ctx.moveTo(0, 0);
  ctx.lineTo(0, Y(H));
  ctx.lineTo(-eave, Y(H));
  ctx.lineTo(w / 2, Y(H + roof));
  ctx.lineTo(w + eave, Y(H));
  ctx.lineTo(w, Y(H));
  ctx.lineTo(w, 0);
  ctx.closePath();
}

/** The brick body: lit face, a shaded strip on one side and under the eaves, brick marks. */
function shell(
  ctx: Ctx,
  w: number,
  H: number,
  roof: number,
  brick: string,
  shade: string,
  mark: string,
  shadeRight: boolean,
  lw: number,
): void {
  ctx.beginPath();
  shellPath(ctx, w, H, roof, EAVE);
  ctx.fillStyle = brick;
  ctx.fill();
  // Shade: a strip down the far side, and a band under the gable's eaves.
  ctx.beginPath();
  rect(ctx, shadeRight ? w - 0.024 : 0, 0, 0.024, H);
  ctx.moveTo(0, Y(H));
  ctx.lineTo(w / 2, Y(H + roof));
  ctx.lineTo(w, Y(H));
  ctx.lineTo(w, Y(H - 0.012));
  ctx.lineTo(w / 2, Y(H + roof - 0.022));
  ctx.lineTo(0, Y(H - 0.012));
  ctx.closePath();
  ctx.fillStyle = shade;
  ctx.fill();
  // Brick marks: short double dashes scattered over the wall.
  ctx.beginPath();
  for (const [fx, fy] of MARKS) {
    const x = 0.02 + fx * (w - 0.06);
    const y = 0.02 + fy * (H - 0.04);
    ctx.moveTo(x, Y(y));
    ctx.lineTo(x + 0.022, Y(y));
    ctx.moveTo(x + 0.011, Y(y + 0.011));
    ctx.lineTo(x + 0.033, Y(y + 0.011));
  }
  ctx.strokeStyle = mark;
  ctx.lineWidth = lw * 0.55;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** Ink round the walls and gable, drawn last over the body. */
function shellInk(ctx: Ctx, w: number, H: number, roof: number, lw: number): void {
  ctx.beginPath();
  shellPath(ctx, w, H, roof, EAVE);
  ink(ctx, lw, INK);
}

/**
 * Snow lying along both roof slopes behind the gable: a thick lumpy band from eave to peak
 * with a few drips, inked along its top.
 */
function roofSnow(ctx: Ctx, w: number, H: number, roof: number, lw: number, seed: number): void {
  const L = -SNOW_EAVE;
  const R = w + SNOW_EAVE;
  ctx.beginPath();
  roofSnowTop(ctx, w, H, roof);
  // Back along the gable edge, with drips hanging over the brick.
  const n = 8;
  for (let i = n; i >= 0; i--) {
    const x = L + ((R - L) * i) / n;
    const rise = 1 - Math.abs(x - w / 2) / (w / 2 - L);
    const drip = i > 0 && i < n && hash(seed + i) > 0.45 ? 0.008 + hash(seed + i + 9) * 0.012 : 0;
    ctx.lineTo(x, Y(H - 0.006 + roof * rise - drip));
  }
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.beginPath();
  roofSnowTop(ctx, w, H, roof);
  ink(ctx, lw, INK);
}

/** The lumpy top edge of the roof snow, eave to peak to eave. */
function roofSnowTop(ctx: Ctx, w: number, H: number, roof: number): void {
  const th = 0.022;
  ctx.moveTo(-SNOW_EAVE, Y(H - 0.004));
  ctx.quadraticCurveTo(w * 0.25, Y(H + roof * 0.5 + th * 1.4), w / 2, Y(H + roof + th));
  ctx.quadraticCurveTo(w * 0.75, Y(H + roof * 0.5 + th * 1.4), w + SNOW_EAVE, Y(H - 0.004));
}

/**
 * A chimney stack rising from behind the gable at x0..x0+w, its top at `top`, with pots,
 * snow caps and smoke puffing away (smoke drawn by the caller after everything else).
 */
function chimney(ctx: Ctx, x0: number, w: number, from: number, top: number, brick: string, shade: string, lw: number): void {
  ctx.beginPath();
  rect(ctx, x0, from, w, top - from);
  ctx.fillStyle = brick;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, x0 + w * 0.72, from, w * 0.28, top - from);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, x0, from, w, top - from);
  ink(ctx, lw, INK);
  // Capping course, then pots.
  ctx.beginPath();
  rect(ctx, x0 - 0.006, top, w + 0.012, 0.012);
  ctx.fillStyle = shade;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const px = x0 + w * (0.12 + i * 0.46);
    ctx.moveTo(px, Y(top + 0.012));
    ctx.lineTo(px - 0.003, Y(top + 0.04));
    ctx.lineTo(px + w * 0.36 + 0.003, Y(top + 0.04));
    ctx.lineTo(px + w * 0.36, Y(top + 0.012));
    ctx.closePath();
  }
  ctx.fillStyle = POT;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const px = x0 + w * (0.12 + i * 0.46);
    snowCap(ctx, px - 0.004, px + w * 0.36 + 0.004, Y(top + 0.04), 0.008);
  }
  snowCap(ctx, x0 - 0.008, x0 + w + 0.008, Y(top + 0.012), 0.006);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** Smoke from a pot at (x, y up): puffs rising, swelling, drifting and fading. */
function smoke(ctx: Ctx, x: number, y: number, t: number, seed: number): void {
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const p = (t * 0.16 + k / 5 + seed) % 1;
    const r = 0.008 + 0.02 * p;
    circle(ctx, x + Math.sin(p * 5 + seed * 9) * 0.008 + p * 0.05, Y(y + 0.012 + p * 0.13), r);
  }
  ctx.fillStyle = SMOKE;
  ctx.fill();
}

/**
 * Sash windows, batched: stone lintels and sills, cream frames, glowing panes with a deeper
 * lower sash, curtains, glazing bars, ink, snowy sills; candles in some.
 */
function windows(ctx: Ctx, list: readonly Win[], lw: number, t: number): void {
  const f = 0.008; // frame width
  // Lintels and sills (stone)
  ctx.beginPath();
  for (const w of list) {
    rect(ctx, w.x - f * 1.6, w.y + w.h + f, w.w + f * 3.2, 0.012);
    rect(ctx, w.x - f * 1.4, w.y - f - 0.008, w.w + f * 2.8, 0.009);
  }
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // Frames
  ctx.beginPath();
  for (const w of list) rect(ctx, w.x - f, w.y - f, w.w + f * 2, w.h + f * 2);
  ctx.fillStyle = FRAME;
  ctx.fill();
  // Panes: lit gold, dim amber or dark.
  ctx.beginPath();
  for (const w of list) if (w.kind === 1 || w.kind === 2) rect(ctx, w.x, w.y, w.w, w.h);
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  for (const w of list) if (w.kind === 1 || w.kind === 2) rect(ctx, w.x, w.y, w.w, w.h * 0.42);
  for (const w of list) if (w.kind === 3) rect(ctx, w.x, w.y, w.w, w.h);
  ctx.fillStyle = LAMP_DEEP;
  ctx.fill();
  ctx.beginPath();
  for (const w of list) if (w.kind === 0) rect(ctx, w.x, w.y, w.w, w.h);
  for (const w of list) if (w.kind === 3) rect(ctx, w.x, w.y + w.h * 0.45, w.w, w.h * 0.55);
  ctx.fillStyle = DIM_PANE;
  ctx.fill();
  // Curtains, tied back
  ctx.beginPath();
  for (const w of list) {
    if (w.kind !== 2) continue;
    const top = w.y + w.h;
    ctx.moveTo(w.x, Y(top));
    ctx.lineTo(w.x + w.w * 0.34, Y(top));
    ctx.quadraticCurveTo(w.x + w.w * 0.12, Y(w.y + w.h * 0.55), w.x + w.w * 0.18, Y(w.y));
    ctx.lineTo(w.x, Y(w.y));
    ctx.closePath();
    ctx.moveTo(w.x + w.w, Y(top));
    ctx.lineTo(w.x + w.w * 0.66, Y(top));
    ctx.quadraticCurveTo(w.x + w.w * 0.88, Y(w.y + w.h * 0.55), w.x + w.w * 0.82, Y(w.y));
    ctx.lineTo(w.x + w.w, Y(w.y));
    ctx.closePath();
  }
  ctx.fillStyle = SHAWL;
  ctx.fill();
  // Candles on the sill inside dim windows: a stub and a flickering flame.
  ctx.beginPath();
  for (const w of list) {
    if (w.kind !== 3) continue;
    const cx = w.x + w.w / 2;
    rect(ctx, cx - 0.004, w.y, 0.008, 0.02);
  }
  ctx.fillStyle = FRAME;
  ctx.fill();
  ctx.beginPath();
  for (const w of list) {
    if (w.kind !== 3) continue;
    const cx = w.x + w.w / 2;
    const fl = 1 + 0.18 * Math.sin(t * 11 + w.x * 50);
    const y0 = w.y + 0.021;
    ctx.moveTo(cx, Y(y0 + 0.016 * fl));
    ctx.quadraticCurveTo(cx + 0.006, Y(y0 + 0.004), cx, Y(y0));
    ctx.quadraticCurveTo(cx - 0.006, Y(y0 + 0.004), cx, Y(y0 + 0.016 * fl));
    ctx.closePath();
  }
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
  // Glazing bars and frame ink
  ctx.beginPath();
  for (const w of list) {
    for (let c = 1; c < w.cols; c++) {
      ctx.moveTo(w.x + (w.w * c) / w.cols, Y(w.y));
      ctx.lineTo(w.x + (w.w * c) / w.cols, Y(w.y + w.h));
    }
    for (let r = 1; r < w.rows; r++) {
      ctx.moveTo(w.x, Y(w.y + (w.h * r) / w.rows));
      ctx.lineTo(w.x + w.w, Y(w.y + (w.h * r) / w.rows));
    }
  }
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = Math.max(lw * 0.7, 0.006);
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.beginPath();
  for (const w of list) rect(ctx, w.x - f, w.y - f, w.w + f * 2, w.h + f * 2);
  ink(ctx, lw * 0.85, INK);
  // Snow on the sills and lintels
  ctx.beginPath();
  for (const w of list) {
    snowCap(ctx, w.x - f * 1.4, w.x + w.w + f * 1.4, Y(w.y - f + 0.001), 0.008);
    snowCap(ctx, w.x - f * 1.6, w.x + w.w + f * 1.6, Y(w.y + w.h + f + 0.012), 0.006);
  }
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** A holly wreath with a red bow, centered at (x, y up), radius r. */
export function wreath(ctx: Ctx, x: number, y: number, r: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.moveTo(x + r * 0.5, Y(y));
  ctx.arc(x, Y(y), r * 0.5, 0, Math.PI * 2, true);
  ctx.fillStyle = HOLLY;
  ctx.fill("evenodd");
  ink(ctx, lw * 0.8, INK);
  // Darker leaf tufts and berries round the ring
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    oval(ctx, x + Math.cos(a) * r * 0.75, Y(y) + Math.sin(a) * r * 0.75, r * 0.2, r * 0.11, a + 1.2);
  }
  ctx.fillStyle = HOLLY_DARK;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - 0.9;
    circle(ctx, x + Math.cos(a) * r * 0.75, Y(y) + Math.sin(a) * r * 0.75, r * 0.12);
  }
  ctx.fillStyle = BERRY;
  ctx.fill();
  // Bow at the bottom
  const by = Y(y) + r * 0.82;
  ctx.beginPath();
  ctx.moveTo(x, by);
  ctx.lineTo(x - r * 0.55, by - r * 0.3);
  ctx.lineTo(x - r * 0.55, by + r * 0.3);
  ctx.closePath();
  ctx.moveTo(x, by);
  ctx.lineTo(x + r * 0.55, by - r * 0.3);
  ctx.lineTo(x + r * 0.55, by + r * 0.3);
  ctx.closePath();
  ctx.moveTo(x - r * 0.08, by);
  ctx.lineTo(x - r * 0.3, by + r * 0.75);
  ctx.lineTo(x - r * 0.1, by + r * 0.7);
  ctx.closePath();
  ctx.moveTo(x + r * 0.08, by);
  ctx.lineTo(x + r * 0.3, by + r * 0.75);
  ctx.lineTo(x + r * 0.1, by + r * 0.7);
  ctx.closePath();
  ctx.fillStyle = BERRY;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
}

/** Stone steps under a door, with snow on each tread. */
function steps(ctx: Ctx, x: number, w: number, lw: number): void {
  ctx.beginPath();
  rect(ctx, x, 0, w, 0.011);
  rect(ctx, x + 0.008, 0.011, w - 0.016, 0.01);
  ctx.fillStyle = STUCCO_SHADE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  snowCap(ctx, x - 0.002, x + w * 0.45, Y(0.011), 0.006);
  snowCap(ctx, x + 0.008, x + w - 0.008, Y(0.021), 0.006);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** A panelled door with a glowing fanlight, from (x, y up) `w` by `h`. */
function door(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, panel: string, lw: number): void {
  // Fanlight above, glowing
  ctx.beginPath();
  ctx.moveTo(x - 0.006, Y(y + h));
  ctx.arc(x + w / 2, Y(y + h), w / 2 + 0.006, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = FRAME;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(x + 0.004, Y(y + h + 0.002));
  ctx.arc(x + w / 2, Y(y + h + 0.002), w / 2 - 0.004, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const a = Math.PI + (i * Math.PI) / 4;
    ctx.moveTo(x + w / 2, Y(y + h + 0.002));
    ctx.lineTo(x + w / 2 + Math.cos(a) * (w / 2 - 0.004), Y(y + h + 0.002) + Math.sin(a) * (w / 2 - 0.004));
  }
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = lw * 0.5;
  ctx.stroke();
  // Door leaf with four raised panels
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  const pw = w * 0.32;
  for (let c = 0; c < 2; c++) {
    const px = x + w * (0.12 + c * 0.44);
    rect(ctx, px, y + h * 0.08, pw, h * 0.36);
    rect(ctx, px, y + h * 0.54, pw, h * 0.36);
  }
  ctx.fillStyle = panel;
  ctx.fill();
  ink(ctx, lw * 0.45, INK);
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  ink(ctx, lw, INK);
}

// ---------------------------------------------------------------- signs

let signFontPx = -1;
let signFont = "";
const SIGN_FACE = "'Abril Fatface', Georgia, 'Times New Roman', serif";

/** Gold lettering centered at (x, y up) in the house frame, `px` tall on screen, squeezed to fit `maxW` units. */
function letters(ctx: Ctx, text: string, x: number, y: number, px: number, maxW: number, U: number): void {
  const size = Math.max(6, Math.round(px));
  if (size !== signFontPx) {
    signFontPx = size;
    signFont = `${size}px ${SIGN_FACE}`;
  }
  ctx.save();
  ctx.translate(x, Y(y));
  ctx.scale(1 / U, 1 / U);
  ctx.font = signFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = SIGN_GOLD;
  ctx.fillText(text, 0, size * 0.06, maxW * U);
  ctx.restore();
}

/** A painted signboard with a gold border, from (x, y up), `w` by `h`. */
function board(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, lw: number): void {
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  rect(ctx, x + 0.006, y + 0.006, w - 0.012, h - 0.012);
  ctx.strokeStyle = SIGN_GOLD;
  ctx.lineWidth = lw * 0.45;
  ctx.stroke();
  ctx.beginPath();
  snowCap(ctx, x - 0.004, x + w + 0.004, Y(y + h), 0.008);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

// ---------------------------------------------------------------- the counting house

const CH_W = 0.25;
const CH_GROUND = 0.172;
const CH_SIGN = 0.072;
const CH_H = 0.47;
const CH_ROOF = 0.095;
const CH_LEAN = -0.02;
const CH_DOOR = { x: 0.168, y: 0.021, w: 0.068, h: 0.112 };
/**
 * Windows keep clear of the outer wall (x < 0.09), where the gas lamp stands in front; the
 * facade leans outward, so the upper windows sit a little further in.
 */
const CH_WINDOWS: Win[] = [
  { x: 0.086, y: 0.04, w: 0.066, h: 0.085, kind: 3, cols: 2, rows: 3 },
  { x: 0.097, y: 0.266, w: 0.05, h: 0.082, kind: 1, cols: 2, rows: 3 },
  { x: 0.182, y: 0.266, w: 0.05, h: 0.082, kind: 2, cols: 2, rows: 3 },
  { x: 0.1, y: 0.382, w: 0.046, h: 0.062, kind: 1, cols: 2, rows: 2 },
  { x: 0.184, y: 0.382, w: 0.046, h: 0.062, kind: 0, cols: 2, rows: 2 },
];
const CH_CHIMNEY = { x: 0.042, w: 0.05 };
/** The signboard starts right of the lamp post. */
const CH_SIGN_X = 0.06;

/** 0..1: Marley's face shimmering in the knocker, now and then, briefly and gently. */
function marley(t: number): number {
  const p = (((t + 2) % 9.5) + 9.5) % 9.5;
  return p < 1.6 ? Math.sin((p / 1.6) * Math.PI) : 0;
}

const KNOCKER_GHOST = "#bdf2e6";

/** The brass knocker with Marley's face: a round plate, a kindly face, a ring in its mouth. */
function knocker(ctx: Ctx, x: number, y: number, r: number, lw: number, t: number, U: number): void {
  const g = marley(t);
  if (g > 0) glow(ctx, x, Y(y), r * 3.2, g * 0.8);
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.fillStyle = g > 0.5 ? KNOCKER_GHOST : BRASS;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  circle(ctx, x - r * 0.15, Y(y) - r * 0.2, r * 0.55);
  ctx.fillStyle = g > 0.5 ? "#ffffff" : BRASS_LIGHT;
  ctx.fill();
  // Face: brows, eyes, nose, and the ring hanging from its mouth.
  ctx.beginPath();
  circle(ctx, x - r * 0.35, Y(y) - r * 0.12, r * 0.13);
  circle(ctx, x + r * 0.35, Y(y) - r * 0.12, r * 0.13);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.58, Y(y) - r * 0.36);
  ctx.quadraticCurveTo(x - r * 0.36, Y(y) - r * 0.66, x - r * 0.14, Y(y) - r * 0.44);
  ctx.moveTo(x + r * 0.58, Y(y) - r * 0.36);
  ctx.quadraticCurveTo(x + r * 0.36, Y(y) - r * 0.66, x + r * 0.14, Y(y) - r * 0.44);
  ctx.moveTo(x, Y(y) - r * 0.05);
  ctx.lineTo(x - r * 0.08, Y(y) + r * 0.25);
  ctx.lineTo(x + r * 0.06, Y(y) + r * 0.28);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(lw * 0.5, 1.1 / U);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, Y(y) + r * 0.95, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = g > 0.5 ? KNOCKER_GHOST : BRASS;
  ctx.lineWidth = Math.max(lw * 0.9, 2 / U);
  ctx.stroke();
}

/** Scrooge & Marley's counting house, its left foot at (f.x, f.y). */
export function countingHouse(ctx: Ctx, f: HouseFrame): void {
  const { U, t } = f;
  const lw = f.lw / U;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -CH_LEAN, 1, 0, 0);

  // Chimney behind the gable, then the house.
  const slopeY = CH_H + CH_ROOF * ((CH_CHIMNEY.x + CH_CHIMNEY.w / 2) / (CH_W / 2));
  chimney(ctx, CH_CHIMNEY.x, CH_CHIMNEY.w, slopeY - 0.03, slopeY + 0.05, SOOT, SOOT_SHADE, lw);
  shell(ctx, CH_W, CH_H, CH_ROOF, SOOT, SOOT_SHADE, SOOT_MARK, false, lw);

  // Stucco ground floor with rusticated joints.
  ctx.beginPath();
  rect(ctx, 0, 0, CH_W, CH_GROUND);
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, 0, 0, 0.02, CH_GROUND);
  ctx.fillStyle = STUCCO_SHADE;
  ctx.fill();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(0, Y((CH_GROUND * i) / 4));
    ctx.lineTo(CH_W, Y((CH_GROUND * i) / 4));
  }
  ctx.strokeStyle = STUCCO_SHADE;
  ctx.lineWidth = lw * 0.5;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, 0, 0, CH_W, CH_GROUND);
  ink(ctx, lw, INK);

  // Drainpipe down the outer corner
  ctx.beginPath();
  ctx.moveTo(0.014, Y(CH_H - 0.01));
  ctx.lineTo(0.014, 0);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = lw * 1.6;
  ctx.stroke();

  // The sign: SCROOGE & MARLEY, on two lines.
  const sy = CH_GROUND + 0.006;
  const bx = CH_SIGN_X;
  const bw = CH_W - 0.012 - bx;
  board(ctx, bx, sy, bw, CH_SIGN - 0.012, SIGN_GREEN, lw);
  const px = (CH_SIGN - 0.012) * 0.36 * U;
  letters(ctx, "SCROOGE &", bx + bw / 2, sy + (CH_SIGN - 0.012) * 0.71, px, bw - 0.018, U);
  letters(ctx, "MARLEY", bx + bw / 2, sy + (CH_SIGN - 0.012) * 0.29, px, bw - 0.018, U);

  // Gable window: a small round one, lit.
  ctx.beginPath();
  circle(ctx, CH_W / 2, Y(CH_H + 0.035), 0.019);
  ctx.fillStyle = FRAME;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, CH_W / 2, Y(CH_H + 0.035), 0.012);
  ctx.fillStyle = LAMP;
  ctx.fill();

  windows(ctx, CH_WINDOWS, lw, t);
  steps(ctx, CH_DOOR.x - 0.012, CH_DOOR.w + 0.024, lw);
  door(ctx, CH_DOOR.x, CH_DOOR.y, CH_DOOR.w, CH_DOOR.h, DOOR_GREEN, DOOR_GREEN_LIGHT, lw);
  knocker(ctx, CH_DOOR.x + CH_DOOR.w / 2, CH_DOOR.y + CH_DOOR.h * 0.6, 0.019, lw, t, U);

  roofSnow(ctx, CH_W, CH_H, CH_ROOF, lw, 9300);
  shellInk(ctx, CH_W, CH_H, CH_ROOF, lw);
  smoke(ctx, CH_CHIMNEY.x + CH_CHIMNEY.w * 0.3, slopeY + 0.09, t, 0.2);
  ctx.restore();

  // A soft warm spill from the office window and fanlight onto the snow (screen space).
  const g = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  glow(ctx, f.x + (0.11 - CH_LEAN * 0.08) * U, f.y - 0.08 * U, 0.09 * U, 0.5 * g);
}

// ---------------------------------------------------------------- the poulterer's

const PO_W = 0.25;
const PO_GROUND = 0.17;
const PO_SIGN = 0.056;
const PO_H = 0.452;
const PO_ROOF = 0.09;
const PO_LEAN = 0.02;
/** Everything keeps clear of the outer wall (x > 0.205), where the gas lamp stands. */
const PO_DOOR = { x: 0.012, y: 0.021, w: 0.062, h: 0.124 };
const PO_SHOP = { x: 0.088, y: 0.032, w: 0.112, h: 0.11 };
const PO_SIGN_W = 0.2;
const PO_WINDOWS: Win[] = [
  { x: 0.022, y: 0.255, w: 0.05, h: 0.084, kind: 2, cols: 2, rows: 3 },
  { x: 0.114, y: 0.255, w: 0.05, h: 0.084, kind: 1, cols: 2, rows: 3 },
  { x: 0.024, y: 0.37, w: 0.046, h: 0.062, kind: 1, cols: 2, rows: 2 },
  { x: 0.116, y: 0.37, w: 0.046, h: 0.062, kind: 2, cols: 2, rows: 2 },
];
const PO_CHIMNEY = { x: 0.172, w: 0.05 };
const GOOSE = "#fbfaf6";
const GOOSE_SHADE = "#d9dbea";

/** The goose's plump body, tail up on the right, as its own subpath. */
function gooseBody(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x + s * 0.5, Y(y + s * 0.42));
  ctx.quadraticCurveTo(x + s * 0.56, Y(y + s * 0.04), x + s * 0.05, Y(y + s * 0.02));
  ctx.quadraticCurveTo(x - s * 0.42, Y(y + s * 0.02), x - s * 0.42, Y(y + s * 0.26));
  ctx.quadraticCurveTo(x - s * 0.38, Y(y + s * 0.5), x - s * 0.06, Y(y + s * 0.46));
  ctx.quadraticCurveTo(x + s * 0.3, Y(y + s * 0.42), x + s * 0.5, Y(y + s * 0.42));
  ctx.closePath();
}

/** The prize goose standing in the shop window, a red bow at its neck, at (x, y up), size s. */
function goose(ctx: Ctx, x: number, y: number, s: number, lw: number, t: number): void {
  const nod = Math.sin(t * 1.7) * 0.05;
  // Neck and head (one stroke tube), nodding, behind the body's front.
  const hx = x - s * 0.3 + nod * s;
  const hy = y + s * 0.98;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.24, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x - s * 0.36, Y(y + s * 0.7), hx, Y(hy - s * 0.06));
  ink(ctx, s * 0.22 + lw * 1.6, INK);
  ctx.strokeStyle = GOOSE;
  ctx.lineWidth = s * 0.22;
  ctx.stroke();
  ctx.beginPath();
  gooseBody(ctx, x, y, s);
  ctx.fillStyle = GOOSE;
  ctx.fill();
  // Folded wing
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x + s * 0.18, Y(y + s * 0.42), x + s * 0.44, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x + s * 0.18, Y(y + s * 0.12), x - s * 0.12, Y(y + s * 0.3));
  ctx.closePath();
  ctx.fillStyle = GOOSE_SHADE;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  gooseBody(ctx, x, y, s);
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  circle(ctx, hx, Y(hy), s * 0.15);
  ctx.fillStyle = GOOSE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // Beak and eye
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.1, Y(hy + s * 0.05));
  ctx.lineTo(hx - s * 0.36, Y(hy - s * 0.03));
  ctx.lineTo(hx - s * 0.1, Y(hy - s * 0.08));
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  circle(ctx, hx - s * 0.02, Y(hy + s * 0.04), s * 0.04);
  ctx.fillStyle = INK;
  ctx.fill();
  // Red bow at the base of the neck
  const bx = x - s * 0.27;
  const by = y + s * 0.5;
  ctx.beginPath();
  ctx.moveTo(bx, Y(by));
  ctx.lineTo(bx - s * 0.17, Y(by + s * 0.11));
  ctx.lineTo(bx - s * 0.17, Y(by - s * 0.11));
  ctx.closePath();
  ctx.moveTo(bx, Y(by));
  ctx.lineTo(bx + s * 0.17, Y(by + s * 0.11));
  ctx.lineTo(bx + s * 0.17, Y(by - s * 0.11));
  ctx.closePath();
  ctx.fillStyle = BERRY;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

/** The poulterer's shop, its left foot at (f.x, f.y). */
export function poulterer(ctx: Ctx, f: HouseFrame): void {
  const { U, t } = f;
  const lw = f.lw / U;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -PO_LEAN, 1, 0, 0);

  const slopeY = PO_H + PO_ROOF * ((PO_W - (PO_CHIMNEY.x + PO_CHIMNEY.w / 2)) / (PO_W / 2));
  chimney(ctx, PO_CHIMNEY.x, PO_CHIMNEY.w, slopeY - 0.03, slopeY + 0.055, BRICK, BRICK_SHADE, lw);
  shell(ctx, PO_W, PO_H, PO_ROOF, BRICK, BRICK_SHADE, BRICK_MARK, true, lw);

  // Shopfront: painted green with a stall riser under the window.
  ctx.beginPath();
  rect(ctx, 0, 0, PO_W - 0.03, PO_GROUND);
  ctx.fillStyle = SIGN_GREEN;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  rect(ctx, PO_SHOP.x - 0.004, 0.006, PO_SHOP.w + 0.008, PO_SHOP.y - 0.012);
  ctx.fillStyle = DOOR_GREEN_LIGHT;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);

  // The display window: warm light, holly swag, and the prize goose.
  const sh = PO_SHOP;
  ctx.beginPath();
  rect(ctx, sh.x - 0.007, sh.y - 0.007, sh.w + 0.014, sh.h + 0.014);
  ctx.fillStyle = FRAME;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, sh.h);
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, sh.h * 0.3);
  ctx.fillStyle = LAMP_DEEP;
  ctx.fill();
  // A red cloth on the display shelf, and the goose standing on it
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, 0.016);
  ctx.fillStyle = DOOR_RED;
  ctx.fill();
  goose(ctx, sh.x + sh.w * 0.54, sh.y + 0.014, 0.066, lw, t);
  // Holly sprigs in the bottom corners of the glass
  ctx.beginPath();
  for (let dir = 1; dir >= -1; dir -= 2) {
    const hx = dir > 0 ? sh.x + 0.012 : sh.x + sh.w - 0.012;
    oval(ctx, hx, Y(sh.y + 0.012), 0.012, 0.0065, dir * 0.5);
    oval(ctx, hx + dir * 0.012, Y(sh.y + 0.008), 0.011, 0.006, -dir * 0.3);
  }
  ctx.fillStyle = HOLLY;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  circle(ctx, sh.x + 0.018, Y(sh.y + 0.018), 0.0045);
  circle(ctx, sh.x + sh.w - 0.018, Y(sh.y + 0.018), 0.0045);
  ctx.fillStyle = BERRY;
  ctx.fill();
  // Glazing bars, ink and the snowy sill
  ctx.beginPath();
  ctx.moveTo(sh.x + sh.w / 2, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w / 2, Y(sh.y + sh.h));
  ctx.moveTo(sh.x, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w, Y(sh.y + sh.h * 0.6));
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, sh.x - 0.007, sh.y - 0.007, sh.w + 0.014, sh.h + 0.014);
  ink(ctx, lw * 0.85, INK);
  ctx.beginPath();
  snowCap(ctx, sh.x - 0.01, sh.x + sh.w + 0.01, Y(sh.y - 0.006), 0.008);
  ctx.fillStyle = SNOW;
  ctx.fill();

  // Striped awning over the window, with a scalloped hem.
  const ax0 = sh.x - 0.008;
  const ax1 = sh.x + sh.w + 0.008;
  const aTop = PO_GROUND - 0.002;
  const aBot = sh.y + sh.h + 0.002;
  const n = 6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (i % 2) continue;
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    ctx.moveTo(a + (sh.x - ax0) * 0.4 * (1 - i / n), Y(aTop));
    ctx.lineTo(b, Y(aTop));
    ctx.lineTo(b, Y(aBot));
    ctx.lineTo(a, Y(aBot));
    ctx.closePath();
  }
  ctx.fillStyle = AWNING_A;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (!(i % 2)) continue;
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    rect(ctx, a, aBot, b - a, aTop - aBot);
  }
  ctx.fillStyle = AWNING_B;
  ctx.fill();
  // Scallops
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    ctx.moveTo(a, Y(aBot));
    ctx.quadraticCurveTo((a + b) / 2, Y(aBot - 0.02), b, Y(aBot));
    ctx.closePath();
  }
  ctx.fillStyle = AWNING_A;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  rect(ctx, ax0, aBot, ax1 - ax0, aTop - aBot);
  ink(ctx, lw * 0.85, INK);
  ctx.beginPath();
  snowCap(ctx, ax0 - 0.004, ax1 + 0.004, Y(aTop), 0.009);
  ctx.fillStyle = SNOW;
  ctx.fill();

  // Sign: POULTERER
  const sy = PO_GROUND + 0.004;
  board(ctx, 0.008, sy, PO_SIGN_W, PO_SIGN - 0.01, SIGN_RED, lw);
  letters(ctx, "POULTERER", 0.008 + PO_SIGN_W / 2, sy + (PO_SIGN - 0.01) * 0.5, (PO_SIGN - 0.01) * 0.58 * U, PO_SIGN_W - 0.024, U);

  windows(ctx, PO_WINDOWS, lw, t);
  steps(ctx, PO_DOOR.x - 0.01, PO_DOOR.w + 0.02, lw);
  door(ctx, PO_DOOR.x, PO_DOOR.y, PO_DOOR.w, PO_DOOR.h, DOOR_RED, "#cf4a55", lw);
  wreath(ctx, PO_DOOR.x + PO_DOOR.w / 2, PO_DOOR.y + PO_DOOR.h * 0.66, 0.022, lw);
  // A wreath hung in the first-floor window too
  wreath(ctx, PO_WINDOWS[1]!.x + PO_WINDOWS[1]!.w / 2, PO_WINDOWS[1]!.y + PO_WINDOWS[1]!.h * 0.55, 0.019, lw);

  // Gable: a lit half-round window
  ctx.beginPath();
  ctx.moveTo(PO_W / 2 - 0.024, Y(PO_H + 0.012));
  ctx.arc(PO_W / 2, Y(PO_H + 0.012), 0.024, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);

  roofSnow(ctx, PO_W, PO_H, PO_ROOF, lw, 9400);
  shellInk(ctx, PO_W, PO_H, PO_ROOF, lw);
  smoke(ctx, PO_CHIMNEY.x + PO_CHIMNEY.w * 0.3, slopeY + 0.095, t, 0.6);
  ctx.restore();

  const g = 0.8 + 0.2 * Math.sin(t * 5.1) * Math.sin(t * 2.3);
  glow(ctx, f.x + (sh.x + sh.w / 2 + PO_LEAN * 0.08) * U, f.y - 0.06 * U, 0.12 * U, 0.6 * g);
}

/** Width of each house, in units. */
export const HOUSE_W = CH_W;

// ---------------------------------------------------------------- more of the street

interface Terrace {
  brick: string;
  shade: string;
  mark: string;
  H: number;
  lean: number;
  /** Door on the left (0) or right (1) of the ground floor; a wreath on it or not. */
  door: number;
  wreath: boolean;
  windows: Win[];
  chimney: number;
}

const TERRACE_BRICK = "#b8705a";

/** A few plain terrace houses for wide screens, laid out once. */
export const TERRACES: Terrace[] = [0, 1, 2, 3].map((i) => {
  const tall = i % 2 === 0;
  const H = tall ? 0.45 : 0.36;
  const door = i % 2;
  const windows: Win[] = [{ x: door ? 0.04 : 0.13, y: 0.04, w: 0.075, h: 0.085, kind: 1 + (i % 2), cols: 3, rows: 2 }];
  const rows = tall ? [0.2, 0.32] : [0.2];
  for (const [r, y] of rows.entries()) {
    windows.push(
      { x: 0.045, y, w: 0.05, h: 0.08, kind: (i + r) % 3 === 0 ? 0 : 1 + ((i + r) % 2), cols: 2, rows: 3 },
      { x: 0.155, y, w: 0.05, h: 0.08, kind: 1 + ((i + r + 1) % 2), cols: 2, rows: 3 },
    );
  }
  const colors = [
    [BRICK, BRICK_SHADE, BRICK_MARK],
    [SOOT, SOOT_SHADE, SOOT_MARK],
    [TERRACE_BRICK, mix(TERRACE_BRICK, INK, 0.25), mix(TERRACE_BRICK, INK, 0.32)],
  ] as const;
  const [brick, shade, mark] = colors[i % 3]!;
  return { brick, shade, mark, H, lean: (i % 2 ? 1 : -1) * 0.012, door, wreath: i !== 1, windows, chimney: door ? 0.04 : 0.17 };
});

/** One plain terrace house, its left foot at (f.x, f.y). */
export function terrace(ctx: Ctx, f: HouseFrame, h: Terrace): void {
  const { U, t } = f;
  const lw = f.lw / U;
  const w = CH_W;
  const roof = 0.085;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -h.lean, 1, 0, 0);
  const cx = h.chimney + 0.025;
  const slopeY = h.H + roof * (1 - Math.abs(cx - w / 2) / (w / 2));
  chimney(ctx, h.chimney, 0.05, slopeY - 0.03, slopeY + 0.045, h.brick, h.shade, lw);
  shell(ctx, w, h.H, roof, h.brick, h.shade, h.mark, h.door === 1, lw);
  windows(ctx, h.windows, lw, t);
  const dx = h.door ? 0.165 : 0.03;
  steps(ctx, dx - 0.01, 0.075, lw);
  door(ctx, dx, 0.021, 0.055, 0.11, h.door ? DOOR_GREEN : DOOR_RED, h.door ? DOOR_GREEN_LIGHT : "#cf4a55", lw);
  if (h.wreath) wreath(ctx, dx + 0.0275, 0.021 + 0.11 * 0.66, 0.019, lw);
  roofSnow(ctx, w, h.H, roof, lw, 9500 + h.chimney * 100);
  shellInk(ctx, w, h.H, roof, lw);
  smoke(ctx, h.chimney + 0.015, slopeY + 0.085, t, h.chimney * 3);
  ctx.restore();
}

/** How far a house's leaning, snowy outline reaches past its foot on each side, in units. */
export function terraceReach(h: Terrace): number {
  return Math.abs(h.lean) * h.H + 0.03;
}

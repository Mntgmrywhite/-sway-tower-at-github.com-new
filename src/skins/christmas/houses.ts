import { circle, oval, type Ctx } from "../../base/draw";
import {
  BEAK,
  BERRY,
  BRASS,
  BRICK,
  BRICK_SHADE,
  CREAM,
  DIM_PANE,
  DOOR_GREEN,
  DOOR_RED,
  HOLLY,
  KNOCKER_GHOST,
  LAMP,
  LAMP_CORE,
  LAMP_DEEP,
  NAVY,
  PAINTED,
  PAINTED_SHADE,
  ROSE,
  SHAWL,
  SIGN_GOLD,
  SIGN_GREEN,
  SIGN_RED,
  SLATE,
  SMOKE,
  SNOW,
  SNOW_SHADE,
  SOOT,
  SOOT_SHADE,
  STUCCO,
  STUCCO_SHADE,
  TEAL_DEEP,
} from "./colors";
import { glow, snowCap } from "./shapes";

// Two crooked Victorian townhouses framing the street, one on each side of the tower, drawn like
// the buildings in a 1950s picture book: tall flat facades in two tones (a lit face and a shaded
// side), steep slate roofs under thick slabs of snow, chimney stacks with their pots, and grids
// of glowing mustard windows; no outlines. On the left, Scrooge & Marley's sooty counting house
// (a cream stucco ground floor with its painted sign, one stingy candle in the office window, and
// Marley's face on the brass door knocker, which shimmers now and then); on the right, the
// poulterer's with a striped awning and the prize goose in the window, a wreath on its door.
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
  /** Line width in px (fine details). */
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

/** How far the roof's eaves, and the snow on them, reach past the walls. */
const EAVE = 0.012;
const SNOW_EAVE = 0.016;
/** The roof's slope is this much steeper than the old gables, for the card's tall, narrow houses. */
const PITCH = 1.35;
/** The shaded side of a facade, and its band under the eaves (units). */
const SIDE = 0.026;

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

/**
 * The house's body: a flat slate roof (the gable's eaves), the lit facade, a shaded strip down
 * one side, and a cream string course between the floors.
 */
function shell(ctx: Ctx, w: number, H: number, roof: number, face: string, shade: string, shadeRight: boolean, course: number): void {
  ctx.beginPath();
  shellPath(ctx, w, H, roof, EAVE);
  ctx.fillStyle = SLATE;
  ctx.fill();
  // The facade itself: the walls and the gable's face inside the eaves.
  const inset = 0.016;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, Y(H));
  ctx.lineTo(w / 2, Y(H + roof - inset * 1.6));
  ctx.lineTo(w, Y(H));
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fillStyle = face;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, shadeRight ? w - SIDE : 0, 0, SIDE, H);
  ctx.fillStyle = shade;
  ctx.fill();
  if (course > 0) {
    ctx.beginPath();
    rect(ctx, 0, course, w, 0.008);
    ctx.fillStyle = STUCCO_SHADE;
    ctx.fill();
  }
}

/** Snow lying along both roof slopes: a thick flat chevron from eave to peak, with a few short drips. */
function roofSnow(ctx: Ctx, w: number, H: number, roof: number): void {
  const L = -SNOW_EAVE;
  const R = w + SNOW_EAVE;
  const th = 0.024;
  ctx.beginPath();
  ctx.moveTo(L, Y(H - 0.004));
  ctx.lineTo(w / 2, Y(H + roof + th * 0.9));
  ctx.lineTo(R, Y(H - 0.004));
  ctx.lineTo(R - 0.012, Y(H - 0.012));
  ctx.lineTo(w / 2, Y(H + roof - th * 0.55));
  ctx.lineTo(L + 0.012, Y(H - 0.012));
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/**
 * A chimney stack rising from behind the gable at x0..x0+w, its top at `top`: a two-tone stack,
 * a capping course and two pots under caps of snow. Its smoke is drawn by the caller, last.
 */
function chimney(ctx: Ctx, x0: number, w: number, from: number, top: number, brick: string, shade: string): void {
  ctx.beginPath();
  rect(ctx, x0, from, w, top - from);
  ctx.fillStyle = brick;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, x0 + w * 0.7, from, w * 0.3, top - from);
  rect(ctx, x0 - 0.006, top, w + 0.012, 0.012);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 2; i++) rect(ctx, x0 + w * (0.12 + i * 0.46), top + 0.012, w * 0.36, 0.028);
  ctx.fillStyle = ROSE;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const px = x0 + w * (0.12 + i * 0.46);
    snowCap(ctx, px - 0.002, px + w * 0.36 + 0.002, Y(top + 0.04), 0.008);
  }
  snowCap(ctx, x0 - 0.008, x0 + w + 0.008, Y(top + 0.012), 0.007);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** Smoke from a pot at (x, y up): flat round puffs rising, swelling and drifting. */
function smoke(ctx: Ctx, x: number, y: number, t: number, seed: number): void {
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.16 + k / 4 + seed) % 1;
    const r = 0.009 + 0.018 * p;
    circle(ctx, x + Math.sin(p * 5 + seed * 9) * 0.008 + p * 0.05, Y(y + 0.012 + p * 0.13), r);
  }
  ctx.fillStyle = SMOKE;
  ctx.fill();
}

/**
 * Sash windows, batched: cream lintels and sills, glowing panes in a grid (lit mustard with a
 * deeper lower sash, or navy and dark), tied-back curtains, candles in the dim ones, cream
 * glazing bars and a slab of snow on every sill.
 */
function windows(ctx: Ctx, list: readonly Win[], lw: number, t: number): void {
  const f = 0.008; // frame width
  // Lintels, sills and frames (cream stone)
  ctx.beginPath();
  for (const w of list) {
    rect(ctx, w.x - f * 1.6, w.y + w.h + f * 0.5, w.w + f * 3.2, 0.012);
    rect(ctx, w.x - f * 1.4, w.y - f - 0.008, w.w + f * 2.8, 0.009);
    rect(ctx, w.x - f, w.y - f, w.w + f * 2, w.h + f * 2);
  }
  ctx.fillStyle = STUCCO;
  ctx.fill();
  // Panes: lit, the lower sash deeper; candlelit ones dim; dark ones navy.
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
  // Curtains, tied back: two flat triangles.
  ctx.beginPath();
  for (const w of list) {
    if (w.kind !== 2) continue;
    const top = w.y + w.h;
    ctx.moveTo(w.x, Y(top));
    ctx.lineTo(w.x + w.w * 0.36, Y(top));
    ctx.lineTo(w.x, Y(w.y + w.h * 0.2));
    ctx.closePath();
    ctx.moveTo(w.x + w.w, Y(top));
    ctx.lineTo(w.x + w.w * 0.64, Y(top));
    ctx.lineTo(w.x + w.w, Y(w.y + w.h * 0.2));
    ctx.closePath();
  }
  ctx.fillStyle = SHAWL;
  ctx.fill();
  // Candles on the sill inside dim windows: a stub and a flickering flame.
  ctx.beginPath();
  for (const w of list) if (w.kind === 3) rect(ctx, w.x + w.w / 2 - 0.004, w.y, 0.008, 0.02);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.beginPath();
  for (const w of list) {
    if (w.kind !== 3) continue;
    const cx = w.x + w.w / 2;
    const fl = 1 + 0.18 * Math.sin(t * 11 + w.x * 50);
    const y0 = w.y + 0.021;
    ctx.moveTo(cx, Y(y0 + 0.016 * fl));
    ctx.lineTo(cx + 0.005, Y(y0 + 0.004));
    ctx.lineTo(cx, Y(y0));
    ctx.lineTo(cx - 0.005, Y(y0 + 0.004));
    ctx.closePath();
  }
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
  // Glazing bars
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
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = Math.max(lw * 0.7, 0.005);
  ctx.lineCap = "butt";
  ctx.stroke();
  // Snow on the sills and lintels
  ctx.beginPath();
  for (const w of list) {
    snowCap(ctx, w.x - f * 1.4, w.x + w.w + f * 1.4, Y(w.y - f + 0.001), 0.008);
    snowCap(ctx, w.x - f * 1.6, w.x + w.w + f * 1.6, Y(w.y + w.h + f * 0.5 + 0.012), 0.006);
  }
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** A holly wreath with a cranberry bow, centered at (x, y up), radius r: a flat ring, berries, a bow. */
export function wreath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.moveTo(x + r * 0.5, Y(y));
  ctx.arc(x, Y(y), r * 0.5, 0, Math.PI * 2, true);
  ctx.fillStyle = HOLLY;
  ctx.fill("evenodd");
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - 0.9;
    circle(ctx, x + Math.cos(a) * r * 0.75, Y(y) + Math.sin(a) * r * 0.75, r * 0.13);
  }
  // The bow at the bottom: two triangles and two tails.
  const by = Y(y) + r * 0.82;
  ctx.moveTo(x, by);
  ctx.lineTo(x - r * 0.55, by - r * 0.32);
  ctx.lineTo(x - r * 0.55, by + r * 0.32);
  ctx.closePath();
  ctx.moveTo(x, by);
  ctx.lineTo(x + r * 0.55, by - r * 0.32);
  ctx.lineTo(x + r * 0.55, by + r * 0.32);
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
}

/** Stone steps under a door, with snow on each tread. */
function steps(ctx: Ctx, x: number, w: number): void {
  ctx.beginPath();
  rect(ctx, x, 0, w, 0.011);
  rect(ctx, x + 0.008, 0.011, w - 0.016, 0.01);
  ctx.fillStyle = STUCCO_SHADE;
  ctx.fill();
  ctx.beginPath();
  snowCap(ctx, x - 0.002, x + w * 0.45, Y(0.011), 0.006);
  snowCap(ctx, x + 0.008, x + w - 0.008, Y(0.021), 0.006);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** A panelled door with a glowing fanlight, from (x, y up) `w` by `h`. */
function door(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, panel: string): void {
  // Fanlight above: a cream arch round a glowing half-disc with its radiating bars.
  ctx.beginPath();
  ctx.moveTo(x - 0.006, Y(y + h));
  ctx.arc(x + w / 2, Y(y + h), w / 2 + 0.006, Math.PI, 0);
  ctx.closePath();
  rect(ctx, x - 0.006, y, w + 0.012, h);
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 0.004, Y(y + h + 0.002));
  ctx.arc(x + w / 2, Y(y + h + 0.002), w / 2 - 0.004, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();
  // Door leaf with four flat panels.
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

/** A painted signboard with a thin gold border, from (x, y up), `w` by `h`, snow on its top. */
function board(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, lw: number): void {
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  ctx.fillStyle = color;
  ctx.fill();
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
const CH_ROOF = 0.095 * PITCH;
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

/**
 * 0..1: Marley's face shimmering in the knocker, now and then, briefly and gently: first at
 * 7.5-9.1 s of s.t, then every 9.5 s.
 */
export function marley(t: number): number {
  const p = (((t + 2) % 9.5) + 9.5) % 9.5;
  return p < 1.6 ? Math.sin((p / 1.6) * Math.PI) : 0;
}


/** The brass knocker with Marley's face: a round plate, a kindly face, a ring in its mouth. */
function knocker(ctx: Ctx, x: number, y: number, r: number, lw: number, t: number, U: number): void {
  const g = marley(t);
  if (g > 0) glow(ctx, x, Y(y), r * 3.2, g);
  const ghost = g > 0.5;
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.fillStyle = ghost ? KNOCKER_GHOST : BRASS;
  ctx.fill();
  // The ring hanging from its mouth.
  ctx.beginPath();
  ctx.arc(x, Y(y) + r * 0.95, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = ghost ? KNOCKER_GHOST : BRASS;
  ctx.lineWidth = Math.max(lw * 0.9, 2 / U);
  ctx.stroke();
  // Face: dot eyes, arched brows and a nose.
  ctx.beginPath();
  circle(ctx, x - r * 0.35, Y(y) - r * 0.12, r * 0.13);
  circle(ctx, x + r * 0.35, Y(y) - r * 0.12, r * 0.13);
  ctx.fillStyle = ghost ? TEAL_DEEP : NAVY;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.58, Y(y) - r * 0.36);
  ctx.quadraticCurveTo(x - r * 0.36, Y(y) - r * 0.66, x - r * 0.14, Y(y) - r * 0.44);
  ctx.moveTo(x + r * 0.58, Y(y) - r * 0.36);
  ctx.quadraticCurveTo(x + r * 0.36, Y(y) - r * 0.66, x + r * 0.14, Y(y) - r * 0.44);
  ctx.moveTo(x, Y(y) - r * 0.05);
  ctx.lineTo(x - r * 0.08, Y(y) + r * 0.25);
  ctx.lineTo(x + r * 0.06, Y(y) + r * 0.28);
  ctx.strokeStyle = ghost ? TEAL_DEEP : NAVY;
  ctx.lineWidth = Math.max(lw * 0.5, 1.1 / U);
  ctx.lineCap = "round";
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
  chimney(ctx, CH_CHIMNEY.x, CH_CHIMNEY.w, slopeY - 0.04, slopeY + 0.05, SOOT, SOOT_SHADE);
  shell(ctx, CH_W, CH_H, CH_ROOF, SOOT, SOOT_SHADE, false, 0.36);

  // Stucco ground floor with rusticated joints.
  ctx.beginPath();
  rect(ctx, 0, 0, CH_W, CH_GROUND);
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, 0, 0, SIDE, CH_GROUND);
  for (let i = 1; i < 4; i++) rect(ctx, 0, (CH_GROUND * i) / 4, CH_W, 0.004);
  ctx.fillStyle = STUCCO_SHADE;
  ctx.fill();

  // Drainpipe down the outer corner
  ctx.beginPath();
  rect(ctx, 0.01, 0, 0.008, CH_H - 0.01);
  ctx.fillStyle = NAVY;
  ctx.fill();

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
  circle(ctx, CH_W / 2, Y(CH_H + 0.045), 0.02);
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, CH_W / 2, Y(CH_H + 0.045), 0.013);
  ctx.fillStyle = LAMP;
  ctx.fill();

  windows(ctx, CH_WINDOWS, lw, t);
  steps(ctx, CH_DOOR.x - 0.012, CH_DOOR.w + 0.024);
  door(ctx, CH_DOOR.x, CH_DOOR.y, CH_DOOR.w, CH_DOOR.h, DOOR_GREEN, TEAL_DEEP);
  knocker(ctx, CH_DOOR.x + CH_DOOR.w / 2, CH_DOOR.y + CH_DOOR.h * 0.6, 0.019, lw, t, U);

  roofSnow(ctx, CH_W, CH_H, CH_ROOF);
  smoke(ctx, CH_CHIMNEY.x + CH_CHIMNEY.w * 0.3, slopeY + 0.09, t, 0.2);
  ctx.restore();

  // A pool of warm light from the office window and fanlight onto the snow (screen space).
  const g = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  glow(ctx, f.x + (0.11 - CH_LEAN * 0.08) * U, f.y - 0.08 * U, 0.09 * U, 0.8 * g);
}

// ---------------------------------------------------------------- the poulterer's

const PO_W = 0.25;
const PO_GROUND = 0.17;
const PO_SIGN = 0.056;
const PO_H = 0.452;
const PO_ROOF = 0.09 * PITCH;
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
const GOOSE = SNOW;
const GOOSE_SHADE = SNOW_SHADE;

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
function goose(ctx: Ctx, x: number, y: number, s: number, t: number): void {
  const nod = Math.sin(t * 1.7) * 0.05;
  // Neck and head, nodding: a thick white stroke and a round head.
  const hx = x - s * 0.3 + nod * s;
  const hy = y + s * 0.98;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.24, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x - s * 0.36, Y(y + s * 0.7), hx, Y(hy - s * 0.06));
  ctx.strokeStyle = GOOSE;
  ctx.lineWidth = s * 0.24;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  gooseBody(ctx, x, y, s);
  circle(ctx, hx, Y(hy), s * 0.15);
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
  // Beak and eye
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.1, Y(hy + s * 0.05));
  ctx.lineTo(hx - s * 0.36, Y(hy - s * 0.03));
  ctx.lineTo(hx - s * 0.1, Y(hy - s * 0.08));
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx - s * 0.02, Y(hy + s * 0.04), s * 0.04);
  ctx.fillStyle = NAVY;
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
  chimney(ctx, PO_CHIMNEY.x, PO_CHIMNEY.w, slopeY - 0.04, slopeY + 0.055, BRICK, BRICK_SHADE);
  shell(ctx, PO_W, PO_H, PO_ROOF, BRICK, BRICK_SHADE, true, 0.355);

  // Shopfront: painted deep green, a lighter stall riser under the window.
  ctx.beginPath();
  rect(ctx, 0, 0, PO_W - 0.03, PO_GROUND);
  ctx.fillStyle = SIGN_GREEN;
  ctx.fill();
  const sh = PO_SHOP;
  ctx.beginPath();
  rect(ctx, sh.x - 0.004, 0.006, sh.w + 0.008, sh.y - 0.012);
  ctx.fillStyle = DOOR_GREEN;
  ctx.fill();

  // The display window: a cream frame, warm light, a red cloth with the prize goose, holly.
  ctx.beginPath();
  rect(ctx, sh.x - 0.007, sh.y - 0.007, sh.w + 0.014, sh.h + 0.014);
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, sh.h);
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, sh.h * 0.3);
  ctx.fillStyle = LAMP_DEEP;
  ctx.fill();
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, 0.016);
  ctx.fillStyle = DOOR_RED;
  ctx.fill();
  goose(ctx, sh.x + sh.w * 0.54, sh.y + 0.014, 0.066, t);
  // Holly sprigs in the bottom corners of the glass, with a berry each.
  ctx.beginPath();
  for (let dir = 1; dir >= -1; dir -= 2) {
    const hx = dir > 0 ? sh.x + 0.012 : sh.x + sh.w - 0.012;
    oval(ctx, hx, Y(sh.y + 0.012), 0.012, 0.0065, dir * 0.5);
    oval(ctx, hx + dir * 0.012, Y(sh.y + 0.008), 0.011, 0.006, -dir * 0.3);
  }
  ctx.fillStyle = HOLLY;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, sh.x + 0.018, Y(sh.y + 0.018), 0.0045);
  circle(ctx, sh.x + sh.w - 0.018, Y(sh.y + 0.018), 0.0045);
  ctx.fillStyle = BERRY;
  ctx.fill();
  // Glazing bars and the snowy sill
  ctx.beginPath();
  ctx.moveTo(sh.x + sh.w / 2, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w / 2, Y(sh.y + sh.h));
  ctx.moveTo(sh.x, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w, Y(sh.y + sh.h * 0.6));
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = lw * 0.7;
  ctx.lineCap = "butt";
  ctx.stroke();
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
  rect(ctx, ax0, aBot, ax1 - ax0, aTop - aBot);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    rect(ctx, a, aBot, b - a, aTop - aBot);
  }
  // Scallops along the hem
  for (let i = 0; i < n; i++) {
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    ctx.moveTo(a, Y(aBot));
    ctx.quadraticCurveTo((a + b) / 2, Y(aBot - 0.022), b, Y(aBot));
    ctx.closePath();
  }
  ctx.fillStyle = BRICK;
  ctx.fill();
  ctx.beginPath();
  snowCap(ctx, ax0 - 0.004, ax1 + 0.004, Y(aTop), 0.009);
  ctx.fillStyle = SNOW;
  ctx.fill();

  // Sign: POULTERER
  const sy = PO_GROUND + 0.004;
  board(ctx, 0.008, sy, PO_SIGN_W, PO_SIGN - 0.01, SIGN_RED, lw);
  letters(ctx, "POULTERER", 0.008 + PO_SIGN_W / 2, sy + (PO_SIGN - 0.01) * 0.5, (PO_SIGN - 0.01) * 0.58 * U, PO_SIGN_W - 0.024, U);

  windows(ctx, PO_WINDOWS, lw, t);
  steps(ctx, PO_DOOR.x - 0.01, PO_DOOR.w + 0.02);
  door(ctx, PO_DOOR.x, PO_DOOR.y, PO_DOOR.w, PO_DOOR.h, TEAL_DEEP, DOOR_GREEN);
  wreath(ctx, PO_DOOR.x + PO_DOOR.w / 2, PO_DOOR.y + PO_DOOR.h * 0.66, 0.022);
  // A wreath hung in the first-floor window too
  wreath(ctx, PO_WINDOWS[1]!.x + PO_WINDOWS[1]!.w / 2, PO_WINDOWS[1]!.y + PO_WINDOWS[1]!.h * 0.55, 0.019);

  // Gable: a lit half-round window
  ctx.beginPath();
  ctx.moveTo(PO_W / 2 - 0.026, Y(PO_H + 0.016));
  ctx.arc(PO_W / 2, Y(PO_H + 0.016), 0.026, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = STUCCO;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(PO_W / 2 - 0.018, Y(PO_H + 0.018));
  ctx.arc(PO_W / 2, Y(PO_H + 0.018), 0.018, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = LAMP;
  ctx.fill();

  roofSnow(ctx, PO_W, PO_H, PO_ROOF);
  smoke(ctx, PO_CHIMNEY.x + PO_CHIMNEY.w * 0.3, slopeY + 0.095, t, 0.6);
  ctx.restore();

  const g = 0.8 + 0.2 * Math.sin(t * 5.1) * Math.sin(t * 2.3);
  glow(ctx, f.x + (sh.x + sh.w / 2 + PO_LEAN * 0.08) * U, f.y - 0.06 * U, 0.12 * U, 0.8 * g);
}

/** Width of each house, in units. */
export const HOUSE_W = CH_W;

// ---------------------------------------------------------------- more of the street

interface Terrace {
  face: string;
  shade: string;
  H: number;
  lean: number;
  /** Door on the left (0) or right (1) of the ground floor; a wreath on it or not. */
  door: number;
  wreath: boolean;
  windows: Win[];
  chimney: number;
}

/** A few terrace houses for wide screens, laid out once: brick, sooty brick and painted brick by turns. */
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
    [PAINTED, PAINTED_SHADE],
    [SOOT, SOOT_SHADE],
    [BRICK, BRICK_SHADE],
  ] as const;
  const [face, shade] = colors[i % 3]!;
  return { face, shade, H, lean: (i % 2 ? 1 : -1) * 0.012, door, wreath: i !== 1, windows, chimney: door ? 0.04 : 0.17 };
});

/** One terrace house, its left foot at (f.x, f.y). */
export function terrace(ctx: Ctx, f: HouseFrame, h: Terrace): void {
  const { U, t } = f;
  const lw = f.lw / U;
  const w = CH_W;
  const roof = 0.085 * PITCH;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -h.lean, 1, 0, 0);
  const cx = h.chimney + 0.025;
  const slopeY = h.H + roof * (1 - Math.abs(cx - w / 2) / (w / 2));
  chimney(ctx, h.chimney, 0.05, slopeY - 0.04, slopeY + 0.045, h.face, h.shade);
  shell(ctx, w, h.H, roof, h.face, h.shade, h.door === 1, 0.17);
  windows(ctx, h.windows, lw, t);
  const dx = h.door ? 0.165 : 0.03;
  steps(ctx, dx - 0.01, 0.075);
  door(ctx, dx, 0.021, 0.055, 0.11, h.door ? DOOR_GREEN : NAVY, h.door ? TEAL_DEEP : SLATE);
  if (h.wreath) wreath(ctx, dx + 0.0275, 0.021 + 0.11 * 0.66, 0.019);
  roofSnow(ctx, w, h.H, roof);
  smoke(ctx, h.chimney + 0.015, slopeY + 0.085, t, h.chimney * 3);
  ctx.restore();
}

/** How far a house's leaning, snowy outline reaches past its foot on each side, in units. */
export function terraceReach(h: Terrace): number {
  return Math.abs(h.lean) * h.H + 0.03;
}

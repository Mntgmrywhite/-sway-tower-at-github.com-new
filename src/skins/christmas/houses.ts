import { circle, type Ctx } from "../../base/draw";
import {
  BEAK,
  BERRY,
  BRASS,
  BRICK,
  BRICK_LINE,
  BRICK_SHADE,
  CREAM,
  DIM_PANE,
  DOOR_GREEN,
  DOOR_RED,
  HOLLY,
  HOLLY_DARK,
  INK,
  KNOCKER_GHOST,
  LAMP,
  LAMP_CORE,
  LAMP_DEEP,
  NAVY,
  PAINTED,
  PAINTED_LINE,
  PAINTED_SHADE,
  ROSE,
  SHAWL,
  SIGN_GOLD,
  SIGN_GREEN,
  SIGN_RED,
  SLATE,
  SLATE_LINE,
  SMOKE,
  SNOW,
  SNOW_SHADE,
  SOOT,
  SOOT_LINE,
  SOOT_SHADE,
  STUCCO,
  STUCCO_SHADE,
  TEAL_DEEP,
  TEAL_HOUSE,
  TEAL_HOUSE_LINE,
  TEAL_HOUSE_SHADE,
} from "./colors";
import { glow, inked, INKW, puff, puffOval, snowCap } from "./shapes";

// Two crooked Victorian townhouses framing the street, one on each side of the tower, drawn like
// the buildings in a 1950s picture book: tall flat facades in two tones (a lit face and a shaded
// side) printed with rows of brick, steep slate roofs under thick slabs of snow, chimney stacks
// with their pots, and grids of glowing mustard windows, every part drawn round with a fine navy
// ink line so the street stands crisp in front of the city. On the left, Scrooge & Marley's sooty
// counting house (a cream stucco ground floor with its painted sign, one stingy candle in the
// office window and not a sprig of holly, and Marley's face on the brass door knocker, which
// shimmers now and then); on the right, the poulterer's, all dressed for Christmas: a garland
// swagged under its sign, a scalloped striped awning, the prize goose in the window, holly in the
// window boxes and a wreath on its door.
//
// Each house is drawn in its own frame: origin at its bottom-left foot, x to the right and
// y UP in depth units (u at the tower's depth), scaled by U px per unit and skewed by `lean`
// so the whole facade leans a little. `Y(v)` flips a height to canvas y. A house is printed in
// a few passes, each one fill (or stroke) for all its parts of one ink: its silhouette inked
// under (chimney, walls and roof snow in one line), the walls, the stone frames of every window
// and door inked together, the panes, the doors, and last all its snow at once.

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
  /** A window box of holly under the sill. */
  box?: boolean;
}

/** A door: its leaf from (x, y up), w by h, under a fanlight; the steps run from `step` for `stepW`. */
interface Door {
  x: number;
  y: number;
  w: number;
  h: number;
  step: number;
  stepW: number;
}

/** A chimney stack rising from behind the gable at x for w, from `from` to its top. */
interface Stack {
  x: number;
  w: number;
  from: number;
  top: number;
}

/** How far the roof's eaves, and the snow on them, reach past the walls. */
const EAVE = 0.012;
const SNOW_EAVE = 0.016;
/** How thick the snow lies on the roof slopes (units). */
const SNOW_TH = 0.026;
/** The roof's slope is this much steeper than the old gables, for the card's tall, narrow houses. */
const PITCH = 1.35;
/** The shaded side of a facade, and its band under the eaves (units). */
const SIDE = 0.026;
/** Brick courses printed on a facade: rows this far apart, bricks this long and this far apart (units). */
const COURSE = 0.024;
const BRICK_W = 0.019;
const BRICK_STEP = 0.042;
/** A window's stone frame (units). */
const FRAME = 0.008;

/** Fill the current path in `color`. */
function paint(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
}

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

/** The look of a facade: its lit face, its shaded side and the ink of its brick courses (or stucco joints). */
interface Facade {
  face: string;
  shade: string;
  line: string;
  /** Brick courses, or the long joints of painted stucco. */
  stucco: boolean;
}

/**
 * Brick courses across a facade from `from` up to the gable's peak: short flat bricks in a
 * staggered bond, a few left out so it reads printed, not built. In the gable they keep inside
 * its slopes.
 */
function courses(ctx: Ctx, w: number, H: number, roof: number, from: number, f: Facade): void {
  ctx.beginPath();
  for (let r = 0, y = from + COURSE * 0.6; y < H + roof - 0.05; r++, y += COURSE) {
    if (f.stucco) {
      if (y < H) rect(ctx, 0, y, w, 0.003);
      continue;
    }
    // Inside the gable the courses shorten with its slopes.
    const inset = y > H ? ((y - H) / roof) * (w / 2) + 0.012 : 0.004;
    for (let x = (r % 2 ? BRICK_STEP / 2 : 0) + inset; x + BRICK_W < w - inset; x += BRICK_STEP) {
      if ((r * 7 + Math.round(x * 100)) % 5 === 0) continue;
      rect(ctx, x, y, BRICK_W, 0.0042);
    }
  }
  paint(ctx, f.line);
}

/**
 * The house's body: a slate roof (the gable's eaves), the lit facade printed with its courses
 * from `from` up, a shaded strip down one side, the slates' line along the eaves and a cream
 * string course between the floors. (Its ink line is the silhouette's, inked under.)
 */
function shell(ctx: Ctx, w: number, H: number, roof: number, f: Facade, shadeRight: boolean, course: number, from: number, ink: number): void {
  ctx.beginPath();
  shellPath(ctx, w, H, roof, EAVE);
  paint(ctx, SLATE);
  // The facade itself: the walls and the gable's face inside the eaves.
  const inset = 0.016;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, Y(H));
  ctx.lineTo(w / 2, Y(H + roof - inset * 1.6));
  ctx.lineTo(w, Y(H));
  ctx.lineTo(w, 0);
  ctx.closePath();
  paint(ctx, f.face);
  courses(ctx, w, H, roof - inset * 1.6, from, f);
  ctx.beginPath();
  rect(ctx, shadeRight ? w - SIDE : 0, 0, SIDE, H);
  if (course > 0) rect(ctx, -0.004, course, w + 0.008, 0.01);
  paint(ctx, f.shade);
  // The slates along the eaves, a fine line.
  ctx.beginPath();
  ctx.moveTo(-EAVE * 0.5, Y(H + 0.004));
  ctx.lineTo(w / 2, Y(H + roof - 0.004));
  ctx.lineTo(w + EAVE * 0.5, Y(H + 0.004));
  ctx.strokeStyle = SLATE_LINE;
  ctx.lineWidth = ink;
  ctx.stroke();
}

/**
 * Snow lying along both roof slopes, as a subpath: a thick flat chevron from eave to peak, its
 * lower edge scalloped where it hangs over the eaves.
 */
function roofSnow(ctx: Ctx, w: number, H: number, roof: number): void {
  const L = -SNOW_EAVE;
  const R = w + SNOW_EAVE;
  const th = SNOW_TH;
  const n = 4;
  const lowY = (k: number) => H - 0.006 + (roof - th * 0.55 + 0.006) * (1 - k);
  ctx.moveTo(L, Y(H - 0.006));
  ctx.lineTo(w / 2, Y(H + roof + th * 0.9));
  ctx.lineTo(R, Y(H - 0.006));
  // Under the right slope a few scallops up to the peak, then down the left.
  for (let i = 0; i < n; i++) {
    const a = 1 - i / n;
    const b = 1 - (i + 1) / n;
    const bx = w / 2 + (R - w / 2) * b;
    ctx.quadraticCurveTo((w / 2 + (R - w / 2) * a + bx) / 2, Y((lowY(a) + lowY(b)) / 2 - 0.012), bx, Y(lowY(b)));
  }
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 1) / n;
    const bx = w / 2 + (L - w / 2) * b;
    ctx.quadraticCurveTo((w / 2 + (L - w / 2) * a + bx) / 2, Y((lowY(a) + lowY(b)) / 2 - 0.012), bx, Y(lowY(b)));
  }
  ctx.closePath();
}

/** Icicles hanging under both ends of the eaves. */
function icicles(ctx: Ctx, w: number, H: number): void {
  const L = -SNOW_EAVE;
  const R = w + SNOW_EAVE;
  ctx.beginPath();
  for (const x of [L + 0.01, L + 0.024, R - 0.012, R - 0.026]) {
    ctx.moveTo(x - 0.0045, Y(H - 0.008));
    ctx.lineTo(x, Y(H - 0.03 - (x > w / 2 ? 0.006 : 0)));
    ctx.lineTo(x + 0.0045, Y(H - 0.008));
    ctx.closePath();
  }
  paint(ctx, SNOW_SHADE);
}

/** The chimney stack in two tones, its capping course in shade and its rose pots. */
function chimney(ctx: Ctx, c: Stack, brick: string, shade: string): void {
  ctx.beginPath();
  rect(ctx, c.x, c.from, c.w, c.top - c.from);
  paint(ctx, brick);
  ctx.beginPath();
  rect(ctx, c.x + c.w * 0.7, c.from, c.w * 0.3, c.top - c.from);
  rect(ctx, c.x - 0.006, c.top, c.w + 0.012, 0.012);
  paint(ctx, shade);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) rect(ctx, c.x + c.w * (0.12 + i * 0.46), c.top + 0.012, c.w * 0.36, 0.028);
  paint(ctx, ROSE);
}

/** Snow on a chimney's pots and its capping course, as subpaths. */
function stackSnow(ctx: Ctx, c: Stack): void {
  for (let i = 0; i < 2; i++) {
    const px = c.x + c.w * (0.12 + i * 0.46);
    snowCap(ctx, px - 0.002, px + c.w * 0.36 + 0.002, Y(c.top + 0.04), 0.008);
  }
  snowCap(ctx, c.x - 0.008, c.x + c.w + 0.008, Y(c.top + 0.012), 0.007);
}

/**
 * The house's silhouette inked under: its chimney, walls and the snow-laden gable as one flat
 * shape in ink, `ink` larger all round than the house (only that rim shows round the fills that
 * follow). Polygons grown by hand: much cheaper than stroking the outline.
 */
function silhouette(ctx: Ctx, w: number, H: number, roof: number, c: Stack, ink: number): void {
  const i = ink;
  ctx.beginPath();
  rect(ctx, c.x - i, c.from, c.w + i * 2, c.top - c.from + i);
  rect(ctx, c.x - 0.006 - i, c.top - i, c.w + 0.012 + i * 2, 0.012 + i * 2);
  for (let k = 0; k < 2; k++) rect(ctx, c.x + c.w * (0.12 + k * 0.46) - i, c.top + 0.012, c.w * 0.36 + i * 2, 0.028 + i);
  rect(ctx, -i, -i, w + i * 2, H + i);
  // The roof snow's outer edge: a triangle from eave to eave over the peak, each side moved out by
  // `ink`, its sharp eave corners cut off square at the snow's tips (a mitred corner would reach
  // past the screen's edge beside the outer eave, which stands just inside it).
  const b = w / 2 + SNOW_EAVE;
  const hgt = roof + SNOW_TH * 0.9 + 0.006;
  const len = Math.hypot(b, hgt);
  const base = H - 0.006 - i;
  const out = b + (i * (len + b)) / hgt;
  const apex = H + roof + SNOW_TH * 0.9 + (i * len) / b;
  const cut = base + (apex - base) * (1 - b / out);
  ctx.moveTo(w / 2 - b, Y(base));
  ctx.lineTo(w / 2 - b, Y(cut));
  ctx.lineTo(w / 2, Y(apex));
  ctx.lineTo(w / 2 + b, Y(cut));
  ctx.lineTo(w / 2 + b, Y(base));
  ctx.closePath();
  paint(ctx, INK);
}

/** Chimney smoke: where its puffs start above the pot, how far they rise and how big they swell (units). */
const SMOKE_LIFT = 0.012;
const SMOKE_RISE = 0.13;
const SMOKE_R = 0.027;

/** Smoke from a pot at (x, y up): flat round puffs rising, swelling and drifting. */
function smoke(ctx: Ctx, x: number, y: number, t: number, seed: number): void {
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.16 + k / 4 + seed) % 1;
    const r = 0.009 + (SMOKE_R - 0.009) * p;
    circle(ctx, x + Math.sin(p * 5 + seed * 9) * 0.008 + p * 0.05, Y(y + SMOKE_LIFT + p * SMOKE_RISE), r);
  }
  paint(ctx, SMOKE);
}

/** A sprig of holly: two pointed leaves, rooted at (x, y up), `r` long, leaning `lean`, as subpaths. */
function sprig(ctx: Ctx, x: number, y: number, r: number, lean: number): void {
  for (const k of [-1, 1]) {
    const a = -Math.PI / 2 + k * 0.7 + lean;
    const tx = x + Math.cos(a) * r;
    const ty = Y(y) + Math.sin(a) * r;
    const nx = -Math.sin(a) * r * 0.32;
    const ny = Math.cos(a) * r * 0.32;
    ctx.moveTo(x, Y(y));
    ctx.lineTo((x + tx) / 2 + nx, (Y(y) + ty) / 2 + ny);
    ctx.lineTo(tx, ty);
    ctx.lineTo((x + tx) / 2 - nx, (Y(y) + ty) / 2 - ny);
    ctx.closePath();
  }
}

// ---------------------------------------------------------------- windows and doors, by pass

/** The windows' cream stone (lintels, sills and frames) as subpaths. */
function windowFrames(ctx: Ctx, list: readonly Win[]): void {
  for (const w of list) {
    rect(ctx, w.x - FRAME * 1.6, w.y + w.h + FRAME * 0.5, w.w + FRAME * 3.2, 0.012);
    rect(ctx, w.x - FRAME * 1.4, w.y - FRAME - 0.008, w.w + FRAME * 2.8, 0.009);
    rect(ctx, w.x - FRAME, w.y - FRAME, w.w + FRAME * 2, w.h + FRAME * 2);
  }
}

/** A door's cream surround: an arch over the fanlight and the frame, as subpaths. */
function doorFrame(ctx: Ctx, d: Door): void {
  ctx.moveTo(d.x - 0.006, Y(d.y + d.h));
  ctx.arc(d.x + d.w / 2, Y(d.y + d.h), d.w / 2 + 0.006, Math.PI, 0);
  ctx.closePath();
  rect(ctx, d.x - 0.006, d.y, d.w + 0.012, d.h);
}

/** Lit panes and a door's glowing fanlight, as subpaths. */
function litPanes(ctx: Ctx, list: readonly Win[], d: Door): void {
  for (const w of list) if (w.kind === 1 || w.kind === 2) rect(ctx, w.x, w.y, w.w, w.h);
  ctx.moveTo(d.x + 0.004, Y(d.y + d.h + 0.002));
  ctx.arc(d.x + d.w / 2, Y(d.y + d.h + 0.002), d.w / 2 - 0.004, Math.PI, 0);
  ctx.closePath();
}

/**
 * The panes after the lit ones: each lit window's deeper lower sash, the candlelit ones dim,
 * dark ones navy; then curtains, candles and their flames, and the glazing bars.
 */
function panes(ctx: Ctx, list: readonly Win[], lw: number, t: number): void {
  ctx.beginPath();
  for (const w of list) if (w.kind === 1 || w.kind === 2) rect(ctx, w.x, w.y, w.w, w.h * 0.42);
  for (const w of list) if (w.kind === 3) rect(ctx, w.x, w.y, w.w, w.h);
  paint(ctx, LAMP_DEEP);
  ctx.beginPath();
  for (const w of list) if (w.kind === 0) rect(ctx, w.x, w.y, w.w, w.h);
  for (const w of list) if (w.kind === 3) rect(ctx, w.x, w.y + w.h * 0.45, w.w, w.h * 0.55);
  paint(ctx, DIM_PANE);
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
  paint(ctx, SHAWL);
  // Candles on the sill inside dim windows: a stub and a flickering flame.
  if (list.some((w) => w.kind === 3)) {
    ctx.beginPath();
    for (const w of list) if (w.kind === 3) rect(ctx, w.x + w.w / 2 - 0.004, w.y, 0.008, 0.02);
    paint(ctx, CREAM);
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
    paint(ctx, LAMP_CORE);
  }
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
}

/** Snow on every sill and lintel, as subpaths. */
function windowSnow(ctx: Ctx, list: readonly Win[]): void {
  for (const w of list) {
    snowCap(ctx, w.x - FRAME * 1.4, w.x + w.w + FRAME * 1.4, Y(w.y - FRAME + 0.001), 0.008);
    snowCap(ctx, w.x - FRAME * 1.6, w.x + w.w + FRAME * 1.6, Y(w.y + w.h + FRAME * 0.5 + 0.012), 0.006);
  }
}

/** Window boxes: a cranberry box under the sill, inked, with holly and berries springing from it. */
function windowBoxes(ctx: Ctx, list: readonly Win[], ink: number): void {
  if (!list.some((w) => w.box)) return;
  ctx.beginPath();
  for (const w of list) if (w.box) rect(ctx, w.x - FRAME * 0.8, w.y - FRAME - 0.028, w.w + FRAME * 1.6, 0.017);
  paint(ctx, BERRY);
  inked(ctx, ink);
  ctx.beginPath();
  for (const w of list) {
    if (!w.box) continue;
    for (let k = 0; k < 4; k++) sprig(ctx, w.x + w.w * (0.08 + k * 0.28), w.y - FRAME - 0.012, 0.016, (k - 1.5) * 0.25);
  }
  paint(ctx, HOLLY);
  ctx.beginPath();
  for (const w of list) {
    if (!w.box) continue;
    for (let k = 0; k < 3; k++) puff(ctx, w.x + w.w * (0.22 + k * 0.28), Y(w.y - FRAME - 0.007), 0.0042);
  }
  paint(ctx, BERRY);
}

/** Stone steps under a door. */
function steps(ctx: Ctx, d: Door): void {
  ctx.beginPath();
  rect(ctx, d.step, 0, d.stepW, 0.011);
  rect(ctx, d.step + 0.008, 0.011, d.stepW - 0.016, 0.01);
  paint(ctx, STUCCO_SHADE);
}

/** Snow on each tread of a door's steps, as subpaths. */
function stepsSnow(ctx: Ctx, d: Door): void {
  snowCap(ctx, d.step - 0.002, d.step + d.stepW * 0.45, Y(0.011), 0.006);
  snowCap(ctx, d.step + 0.008, d.step + d.stepW - 0.008, Y(0.021), 0.006);
}

/** A panelled door leaf with a brass knob, and the fanlight's radiating bars. */
function door(ctx: Ctx, d: Door, color: string, panel: string, ink: number): void {
  const { x, y, w, h } = d;
  ctx.beginPath();
  for (const a of [0.25, 0.5, 0.75]) {
    ctx.moveTo(x + w / 2, Y(y + h + 0.002));
    ctx.lineTo(x + w / 2 - Math.cos(a * Math.PI) * (w / 2 - 0.004), Y(y + h + 0.002) - Math.sin(a * Math.PI) * (w / 2 - 0.004));
  }
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = ink * 0.8;
  ctx.stroke();
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  paint(ctx, color);
  ctx.beginPath();
  const pw = w * 0.32;
  for (let c = 0; c < 2; c++) {
    const px = x + w * (0.12 + c * 0.44);
    rect(ctx, px, y + h * 0.08, pw, h * 0.36);
    rect(ctx, px, y + h * 0.54, pw, h * 0.36);
  }
  paint(ctx, panel);
  ctx.beginPath();
  puff(ctx, x + w * 0.84, Y(y + h * 0.48), 0.0045);
  paint(ctx, BRASS);
}

/** A holly wreath with a cranberry bow, centered at (x, y up), radius r: a ring of leaves, berries, a bow, inked. */
function wreath(ctx: Ctx, x: number, y: number, r: number, ink: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.moveTo(x + r * 0.5, Y(y));
  ctx.arc(x, Y(y), r * 0.5, 0, Math.PI * 2, true);
  ctx.fillStyle = HOLLY;
  ctx.fill("evenodd");
  inked(ctx, ink);
  // Darker leaves notched round the ring.
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    puffOval(ctx, x + Math.cos(a) * r * 0.75, Y(y) + Math.sin(a) * r * 0.75, r * 0.2, r * 0.1, a + Math.PI / 2);
  }
  paint(ctx, HOLLY_DARK);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - 0.9;
    puff(ctx, x + Math.cos(a) * r * 0.75, Y(y) + Math.sin(a) * r * 0.75, r * 0.13);
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
  paint(ctx, BERRY);
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

/** A painted signboard with a thin gold border, from (x, y up), `w` by `h`, inked. (Its snow comes with the house's.) */
function board(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, lw: number, ink: number): void {
  ctx.beginPath();
  rect(ctx, x, y, w, h);
  paint(ctx, color);
  inked(ctx, ink);
  ctx.beginPath();
  rect(ctx, x + 0.006, y + 0.006, w - 0.012, h - 0.012);
  ctx.strokeStyle = SIGN_GOLD;
  ctx.lineWidth = lw * 0.45;
  ctx.stroke();
}

// ---------------------------------------------------------------- the counting house

const CH_W = 0.25;
const CH_GROUND = 0.172;
const CH_SIGN = 0.072;
const CH_H = 0.47;
const CH_ROOF = 0.095 * PITCH;
const CH_LEAN = -0.02;
const CH_DOOR: Door = { x: 0.168, y: 0.021, w: 0.068, h: 0.112, step: 0.156, stepW: 0.092 };
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
/** The stack stands on the gable's left slope. */
const CH_STACK: Stack = (() => {
  const x = 0.042;
  const w = 0.05;
  const slope = CH_H + CH_ROOF * ((x + w / 2) / (CH_W / 2));
  return { x, w, from: slope - 0.04, top: slope + 0.05 };
})();
/** Its smoke rises from this far above the stack's top (the pots' rims). */
const CH_SMOKE = 0.04;
/** How tall the counting house stands, its chimney's smoke included (units). */
export const CH_TOP = CH_STACK.top + CH_SMOKE + SMOKE_LIFT + SMOKE_RISE + SMOKE_R;
/** The signboard starts right of the lamp post. */
const CH_SIGN_X = 0.06;
const CH_FACADE: Facade = { face: SOOT, shade: SOOT_SHADE, line: SOOT_LINE, stucco: false };
/** The round gable window: its center (up) and the radii of its stone ring and its glass. */
const CH_GABLE = { y: CH_H + 0.045, r: 0.02, glass: 0.013 };

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
  paint(ctx, ghost ? KNOCKER_GHOST : BRASS);
  inked(ctx, lw * INKW * 0.8);
  // The ring hanging from its mouth.
  ctx.beginPath();
  ctx.arc(x, Y(y) + r * 0.95, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = ghost ? KNOCKER_GHOST : BRASS;
  ctx.lineWidth = Math.max(lw * 0.9, 2 / U);
  ctx.stroke();
  // Face: dot eyes, arched brows and a nose.
  ctx.beginPath();
  puff(ctx, x - r * 0.35, Y(y) - r * 0.12, r * 0.13);
  puff(ctx, x + r * 0.35, Y(y) - r * 0.12, r * 0.13);
  paint(ctx, ghost ? TEAL_DEEP : NAVY);
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
  const ink = lw * INKW;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -CH_LEAN, 1, 0, 0);

  // The silhouette inked under, the chimney behind the gable, then the house.
  silhouette(ctx, CH_W, CH_H, CH_ROOF, CH_STACK, ink);
  chimney(ctx, CH_STACK, SOOT, SOOT_SHADE);
  shell(ctx, CH_W, CH_H, CH_ROOF, CH_FACADE, false, 0.36, CH_GROUND + CH_SIGN, ink);

  // Stucco ground floor with rusticated joints, and the drainpipe down the outer corner.
  ctx.beginPath();
  rect(ctx, 0, 0, CH_W, CH_GROUND);
  paint(ctx, STUCCO);
  ctx.beginPath();
  rect(ctx, 0, 0, SIDE, CH_GROUND);
  for (let i = 1; i < 4; i++) rect(ctx, 0, (CH_GROUND * i) / 4, CH_W, 0.004);
  paint(ctx, STUCCO_SHADE);
  ctx.beginPath();
  rect(ctx, 0.01, 0, 0.008, CH_H - 0.01);
  rect(ctx, 0.006, CH_H - 0.026, 0.016, 0.014);
  paint(ctx, NAVY);

  // The stone: window frames, the door's surround and the gable's round window, inked together.
  ctx.beginPath();
  windowFrames(ctx, CH_WINDOWS);
  doorFrame(ctx, CH_DOOR);
  circle(ctx, CH_W / 2, Y(CH_GABLE.y), CH_GABLE.r);
  paint(ctx, STUCCO);
  inked(ctx, ink);

  // The sign: SCROOGE & MARLEY, on two lines.
  const sy = CH_GROUND + 0.006;
  const bx = CH_SIGN_X;
  const bw = CH_W - 0.012 - bx;
  const bh = CH_SIGN - 0.012;
  board(ctx, bx, sy, bw, bh, SIGN_GREEN, lw, ink);
  const px = bh * 0.36 * U;
  letters(ctx, "SCROOGE &", bx + bw / 2, sy + bh * 0.71, px, bw - 0.018, U);
  letters(ctx, "MARLEY", bx + bw / 2, sy + bh * 0.29, px, bw - 0.018, U);

  // Candlelight in the windows, the fanlight and the gable.
  ctx.beginPath();
  litPanes(ctx, CH_WINDOWS, CH_DOOR);
  circle(ctx, CH_W / 2, Y(CH_GABLE.y), CH_GABLE.glass);
  paint(ctx, LAMP);
  panes(ctx, CH_WINDOWS, lw, t);
  steps(ctx, CH_DOOR);
  door(ctx, CH_DOOR, DOOR_GREEN, TEAL_DEEP, ink);
  knocker(ctx, CH_DOOR.x + CH_DOOR.w / 2, CH_DOOR.y + CH_DOOR.h * 0.6, 0.019, lw, t, U);

  // All the snow at once: sills and lintels, the sign, the steps, the chimney and the roof.
  ctx.beginPath();
  windowSnow(ctx, CH_WINDOWS);
  snowCap(ctx, bx - 0.004, bx + bw + 0.004, Y(sy + bh), 0.008);
  stepsSnow(ctx, CH_DOOR);
  stackSnow(ctx, CH_STACK);
  roofSnow(ctx, CH_W, CH_H, CH_ROOF);
  paint(ctx, SNOW);
  icicles(ctx, CH_W, CH_H);
  smoke(ctx, CH_STACK.x + CH_STACK.w * 0.3, CH_STACK.top + CH_SMOKE, t, 0.2);
  ctx.restore();
}

// ---------------------------------------------------------------- the poulterer's

const PO_W = 0.25;
const PO_GROUND = 0.17;
const PO_SIGN = 0.056;
const PO_H = 0.452;
const PO_ROOF = 0.09 * PITCH;
const PO_LEAN = 0.02;
/** Everything keeps clear of the outer wall (x > 0.205), where the gas lamp stands. */
const PO_DOOR: Door = { x: 0.012, y: 0.021, w: 0.062, h: 0.124, step: 0.002, stepW: 0.082 };
const PO_SHOP = { x: 0.088, y: 0.032, w: 0.112, h: 0.11 };
const PO_SIGN_W = 0.2;
const PO_WINDOWS: Win[] = [
  { x: 0.022, y: 0.268, w: 0.05, h: 0.078, kind: 2, cols: 2, rows: 3, box: true },
  { x: 0.114, y: 0.268, w: 0.05, h: 0.078, kind: 1, cols: 2, rows: 3, box: true },
  { x: 0.024, y: 0.374, w: 0.046, h: 0.058, kind: 1, cols: 2, rows: 2 },
  { x: 0.116, y: 0.374, w: 0.046, h: 0.058, kind: 2, cols: 2, rows: 2 },
];
/** The stack stands on the gable's right slope. */
const PO_STACK: Stack = (() => {
  const x = 0.172;
  const w = 0.05;
  const slope = PO_H + PO_ROOF * ((PO_W - (x + w / 2)) / (PO_W / 2));
  return { x, w, from: slope - 0.04, top: slope + 0.055 };
})();
const PO_FACADE: Facade = { face: BRICK, shade: BRICK_SHADE, line: BRICK_LINE, stucco: false };
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

/** The prize goose standing in the shop window, a red bow at its neck, at (x, y up), size s, inked under. */
function goose(ctx: Ctx, x: number, y: number, s: number, t: number, ink: number): void {
  const nod = Math.sin(t * 1.7) * 0.05;
  const hx = x - s * 0.3 + nod * s;
  const hy = y + s * 0.98;
  const neck = (): void => {
    ctx.moveTo(x - s * 0.24, Y(y + s * 0.3));
    ctx.quadraticCurveTo(x - s * 0.36, Y(y + s * 0.7), hx, Y(hy - s * 0.06));
  };
  // Neck and head, nodding: a thick white stroke and a round head, with the body inked under.
  ctx.beginPath();
  neck();
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.24 + ink * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  gooseBody(ctx, x, y, s);
  circle(ctx, hx, Y(hy), s * 0.15);
  inked(ctx, ink * 2);
  paint(ctx, GOOSE);
  ctx.beginPath();
  neck();
  ctx.strokeStyle = GOOSE;
  ctx.lineWidth = s * 0.24;
  ctx.stroke();
  // Folded wing
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x + s * 0.18, Y(y + s * 0.42), x + s * 0.44, Y(y + s * 0.3));
  ctx.quadraticCurveTo(x + s * 0.18, Y(y + s * 0.12), x - s * 0.12, Y(y + s * 0.3));
  ctx.closePath();
  paint(ctx, GOOSE_SHADE);
  // Beak and eye
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.1, Y(hy + s * 0.05));
  ctx.lineTo(hx - s * 0.36, Y(hy - s * 0.03));
  ctx.lineTo(hx - s * 0.1, Y(hy - s * 0.08));
  ctx.closePath();
  paint(ctx, BEAK);
  ctx.beginPath();
  puff(ctx, hx - s * 0.02, Y(hy + s * 0.04), s * 0.04);
  paint(ctx, NAVY);
  // Red bow at the base of the neck, and the red cloth it stands on
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
  paint(ctx, BERRY);
}

/**
 * A garland swagged across the shop from x0 to x1 at height y (up), sagging `sag` between its
 * pins: an evergreen rope inked under, a cranberry bow at each pin.
 */
function garland(ctx: Ctx, x0: number, x1: number, y: number, sag: number, ink: number): void {
  const n = 3;
  const step = (x1 - x0) / n;
  ctx.beginPath();
  ctx.moveTo(x0, Y(y));
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(x0 + step * (i + 0.5), Y(y - sag * 2), x0 + step * (i + 1), Y(y));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.009 + ink * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = HOLLY;
  ctx.lineWidth = 0.009;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const bx = x0 + step * i;
    ctx.moveTo(bx, Y(y));
    ctx.lineTo(bx - 0.009, Y(y + 0.006));
    ctx.lineTo(bx - 0.009, Y(y - 0.006));
    ctx.closePath();
    ctx.moveTo(bx, Y(y));
    ctx.lineTo(bx + 0.009, Y(y + 0.006));
    ctx.lineTo(bx + 0.009, Y(y - 0.006));
    ctx.closePath();
  }
  paint(ctx, BERRY);
}

/** The awning over the shop window from ax0 to ax1, from its top down to its scalloped hem, as a subpath. */
function awning(ctx: Ctx, ax0: number, ax1: number, top: number, hem: number, n: number): void {
  ctx.moveTo(ax0, Y(top));
  ctx.lineTo(ax1, Y(top));
  ctx.lineTo(ax1, Y(hem));
  for (let i = n - 1; i >= 0; i--) {
    const a = ax0 + ((ax1 - ax0) * i) / n;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    ctx.quadraticCurveTo((a + b) / 2, Y(hem - 0.022), a, Y(hem));
  }
  ctx.closePath();
}

/** The poulterer's shop, its left foot at (f.x, f.y). */
export function poulterer(ctx: Ctx, f: HouseFrame): void {
  const { U, t } = f;
  const lw = f.lw / U;
  const ink = lw * INKW;
  const sh = PO_SHOP;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -PO_LEAN, 1, 0, 0);

  silhouette(ctx, PO_W, PO_H, PO_ROOF, PO_STACK, ink);
  chimney(ctx, PO_STACK, BRICK, BRICK_SHADE);
  shell(ctx, PO_W, PO_H, PO_ROOF, PO_FACADE, true, 0.355, PO_GROUND + PO_SIGN, ink);

  // Shopfront: painted deep green, inked, a lighter stall riser under the window.
  ctx.beginPath();
  rect(ctx, 0, 0, PO_W - 0.03, PO_GROUND);
  paint(ctx, SIGN_GREEN);
  inked(ctx, ink);
  ctx.beginPath();
  rect(ctx, sh.x - 0.004, 0.006, sh.w + 0.008, sh.y - 0.012);
  paint(ctx, DOOR_GREEN);

  // The stone: window frames, the door's surround, the shop window's frame and the gable's half-round window, inked together.
  const gy = PO_H + 0.016;
  ctx.beginPath();
  windowFrames(ctx, PO_WINDOWS);
  doorFrame(ctx, PO_DOOR);
  rect(ctx, sh.x - 0.007, sh.y - 0.007, sh.w + 0.014, sh.h + 0.014);
  ctx.moveTo(PO_W / 2 - 0.026, Y(gy));
  ctx.arc(PO_W / 2, Y(gy), 0.026, Math.PI, 0);
  ctx.closePath();
  paint(ctx, STUCCO);
  inked(ctx, ink);

  // Candlelight in the windows, the fanlight, the gable and the shop window.
  ctx.beginPath();
  litPanes(ctx, PO_WINDOWS, PO_DOOR);
  rect(ctx, sh.x, sh.y, sh.w, sh.h);
  ctx.moveTo(PO_W / 2 - 0.018, Y(gy + 0.002));
  ctx.arc(PO_W / 2, Y(gy + 0.002), 0.018, Math.PI, 0);
  ctx.closePath();
  paint(ctx, LAMP);
  panes(ctx, PO_WINDOWS, lw, t);

  // The display window: deeper light low down, a red cloth with the prize goose, holly.
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, sh.h * 0.3);
  paint(ctx, LAMP_DEEP);
  ctx.beginPath();
  rect(ctx, sh.x, sh.y, sh.w, 0.016);
  paint(ctx, DOOR_RED);
  goose(ctx, sh.x + sh.w * 0.54, sh.y + 0.014, 0.066, t, ink * 0.8);
  ctx.beginPath();
  for (let dir = 1; dir >= -1; dir -= 2) {
    const hx = dir > 0 ? sh.x + 0.012 : sh.x + sh.w - 0.012;
    puffOval(ctx, hx, Y(sh.y + 0.012), 0.012, 0.0065, dir * 0.5);
    puffOval(ctx, hx + dir * 0.012, Y(sh.y + 0.008), 0.011, 0.006, -dir * 0.3);
  }
  paint(ctx, HOLLY);
  ctx.beginPath();
  puff(ctx, sh.x + 0.018, Y(sh.y + 0.018), 0.0045);
  puff(ctx, sh.x + sh.w - 0.018, Y(sh.y + 0.018), 0.0045);
  paint(ctx, BERRY);
  // The shop window's glazing bars
  ctx.beginPath();
  ctx.moveTo(sh.x + sh.w / 2, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w / 2, Y(sh.y + sh.h));
  ctx.moveTo(sh.x, Y(sh.y + sh.h * 0.6));
  ctx.lineTo(sh.x + sh.w, Y(sh.y + sh.h * 0.6));
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = lw * 0.7;
  ctx.lineCap = "butt";
  ctx.stroke();

  // Striped awning over the window, with a scalloped hem: cream with cranberry stripes, inked.
  const ax0 = sh.x - 0.008;
  const ax1 = sh.x + sh.w + 0.008;
  const aTop = PO_GROUND - 0.002;
  const aBot = sh.y + sh.h + 0.002;
  const n = 6;
  ctx.beginPath();
  awning(ctx, ax0, ax1, aTop, aBot, n);
  paint(ctx, CREAM);
  inked(ctx, ink);
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const a = ax0 + ((ax1 - ax0) * i) / n + ink * 0.5;
    const b = ax0 + ((ax1 - ax0) * (i + 1)) / n;
    // Each stripe runs down into its own scallop.
    ctx.moveTo(a, Y(aTop - ink * 0.5));
    ctx.lineTo(b, Y(aTop - ink * 0.5));
    ctx.lineTo(b, Y(aBot));
    ctx.quadraticCurveTo((a + b) / 2, Y(aBot - 0.022 + ink * 0.5), a, Y(aBot));
    ctx.closePath();
  }
  paint(ctx, BRICK);

  // Sign: POULTERER.
  const sy = PO_GROUND + 0.004;
  const sw = PO_SIGN_W;
  const shh = PO_SIGN - 0.01;
  board(ctx, 0.008, sy, sw, shh, SIGN_RED, lw, ink);
  letters(ctx, "POULTERER", 0.008 + sw / 2, sy + shh * 0.5, shh * 0.58 * U, sw - 0.024, U);

  steps(ctx, PO_DOOR);
  door(ctx, PO_DOOR, TEAL_DEEP, DOOR_GREEN, ink);
  wreath(ctx, PO_DOOR.x + PO_DOOR.w / 2, PO_DOOR.y + PO_DOOR.h * 0.66, 0.022, ink);
  // A wreath hung in the first-floor window too.
  const ww = PO_WINDOWS[1]!;
  wreath(ctx, ww.x + ww.w / 2, ww.y + ww.h * 0.55, 0.019, ink);

  // All the snow at once: sills and lintels, the shop's sill and awning, the sign, the steps, the chimney and the roof.
  ctx.beginPath();
  windowSnow(ctx, PO_WINDOWS);
  snowCap(ctx, sh.x - 0.01, sh.x + sh.w + 0.01, Y(sh.y - 0.006), 0.008);
  snowCap(ctx, ax0 - 0.004, ax1 + 0.004, Y(aTop), 0.009);
  snowCap(ctx, 0.004, 0.012 + sw, Y(sy + shh), 0.008);
  stepsSnow(ctx, PO_DOOR);
  stackSnow(ctx, PO_STACK);
  roofSnow(ctx, PO_W, PO_H, PO_ROOF);
  paint(ctx, SNOW);
  icicles(ctx, PO_W, PO_H);
  // Dressed for Christmas: holly in the window boxes, a garland swagged over the sign.
  windowBoxes(ctx, PO_WINDOWS, ink);
  garland(ctx, 0.012, 0.204, sy + PO_SIGN - 0.004, 0.006, ink);
  smoke(ctx, PO_STACK.x + PO_STACK.w * 0.3, PO_STACK.top + 0.04, t, 0.6);
  ctx.restore();
}

/** Width of each house, in units. */
export const HOUSE_W = CH_W;

// ---------------------------------------------------------------- more of the street

interface Terrace {
  facade: Facade;
  H: number;
  lean: number;
  /** The door on the left or right of the ground floor; a wreath on it or not. */
  door: Door;
  doorRight: boolean;
  wreath: boolean;
  windows: Win[];
  stack: Stack;
}

const TERRACE_FACADES: Facade[] = [
  { face: PAINTED, shade: PAINTED_SHADE, line: PAINTED_LINE, stucco: false },
  { face: SOOT, shade: SOOT_SHADE, line: SOOT_LINE, stucco: false },
  { face: BRICK, shade: BRICK_SHADE, line: BRICK_LINE, stucco: false },
  { face: TEAL_HOUSE, shade: TEAL_HOUSE_SHADE, line: TEAL_HOUSE_LINE, stucco: true },
];
const TERRACE_ROOF = 0.085 * PITCH;

/** A few terrace houses for wide screens, laid out once: painted, sooty, red brick and teal stucco by turns. */
export const TERRACES: Terrace[] = [0, 1, 2, 3].map((i) => {
  const tall = i % 2 === 0;
  const H = tall ? 0.45 : 0.36;
  const right = i % 2 === 1;
  const windows: Win[] = [{ x: right ? 0.04 : 0.13, y: 0.04, w: 0.075, h: 0.085, kind: 1 + (i % 2), cols: 3, rows: 2 }];
  const rows = tall ? [0.2, 0.32] : [0.2];
  for (const [r, y] of rows.entries()) {
    windows.push(
      { x: 0.045, y, w: 0.05, h: 0.08, kind: (i + r) % 3 === 0 ? 0 : 1 + ((i + r) % 2), cols: 2, rows: 3, box: r === 0 && i !== 1 },
      { x: 0.155, y, w: 0.05, h: 0.08, kind: 1 + ((i + r + 1) % 2), cols: 2, rows: 3, box: r === 0 && i === 3 },
    );
  }
  const dx = right ? 0.165 : 0.03;
  const sx = right ? 0.04 : 0.17;
  const slope = H + TERRACE_ROOF * (1 - Math.abs(sx + 0.025 - CH_W / 2) / (CH_W / 2));
  return {
    facade: TERRACE_FACADES[i]!,
    H,
    lean: (right ? 1 : -1) * 0.012,
    door: { x: dx, y: 0.021, w: 0.055, h: 0.11, step: dx - 0.01, stepW: 0.075 },
    doorRight: right,
    wreath: i !== 1,
    windows,
    stack: { x: sx, w: 0.05, from: slope - 0.04, top: slope + 0.045 },
  };
});

/** One terrace house, its left foot at (f.x, f.y). */
export function terrace(ctx: Ctx, f: HouseFrame, h: Terrace): void {
  const { U, t } = f;
  const lw = f.lw / U;
  const ink = lw * INKW;
  const w = CH_W;
  const roof = TERRACE_ROOF;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(U, U);
  ctx.transform(1, 0, -h.lean, 1, 0, 0);
  silhouette(ctx, w, h.H, roof, h.stack, ink);
  chimney(ctx, h.stack, h.facade.face, h.facade.shade);
  shell(ctx, w, h.H, roof, h.facade, h.doorRight, 0.17, 0.02, ink);
  ctx.beginPath();
  windowFrames(ctx, h.windows);
  doorFrame(ctx, h.door);
  paint(ctx, STUCCO);
  inked(ctx, ink);
  ctx.beginPath();
  litPanes(ctx, h.windows, h.door);
  paint(ctx, LAMP);
  panes(ctx, h.windows, lw, t);
  steps(ctx, h.door);
  door(ctx, h.door, h.doorRight ? DOOR_GREEN : NAVY, h.doorRight ? TEAL_DEEP : SLATE, ink);
  if (h.wreath) wreath(ctx, h.door.x + h.door.w / 2, h.door.y + h.door.h * 0.66, 0.019, ink);
  ctx.beginPath();
  windowSnow(ctx, h.windows);
  stepsSnow(ctx, h.door);
  stackSnow(ctx, h.stack);
  roofSnow(ctx, w, h.H, roof);
  paint(ctx, SNOW);
  icicles(ctx, w, h.H);
  windowBoxes(ctx, h.windows, ink);
  smoke(ctx, h.stack.x + 0.015, h.stack.top + 0.04, t, h.stack.x * 3);
  ctx.restore();
}

/** How far a house's leaning, snowy outline reaches past its foot on each side, in units. */
export function terraceReach(h: Terrace): number {
  return Math.abs(h.lean) * h.H + 0.03;
}

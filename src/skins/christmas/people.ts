import { circle, roundRectPath, type Ctx } from "../../base/draw";
import {
  BONNET,
  BOOK,
  BRASS,
  CHEEK,
  COAT_MUSTARD,
  COAT_NAVY,
  COAT_RED,
  COAT_TEAL,
  CREAM,
  EVERGREEN,
  IRON,
  LAMP,
  LAMP_CORE,
  NAVY,
  SHAWL,
  SKIN,
  SNOW,
} from "./colors";
import { glow, inked, INKW, puff, puffOval, snowCap } from "./shapes";

// Victorian townsfolk in the street, simplified into the flat geometric figures of a 1950s
// picture book: A-line coats, round heads with rosy cheeks, tall hats as plain rectangles. Each
// figure is cut out whole and drawn round with the street's navy ink line (inked under its flat
// fills, so only its silhouette carries the line, like a paper cut-out). Three carolers sing from
// a carol book (a gentleman in a top hat, a lady in a bonnet and shawl, a child holding up a
// lantern) with notes drifting up from them, and the lamplighter in his cap and greatcoat
// reaches his long pole up to a gas lamp.
//
// Each figure is drawn in a frame with its origin at its feet, x right, y UP in depth units,
// scaled by U px per unit. `Y(v)` flips a height to canvas y.

const Y = (v: number) => -v;

export interface Frame {
  x: number;
  y: number;
  U: number;
  lw: number;
  t: number;
}

function begin(ctx: Ctx, f: Frame, x: number): number {
  ctx.save();
  ctx.translate(f.x + x * f.U, f.y);
  ctx.scale(f.U, f.U);
  return f.lw / f.U;
}

/** Fill the current path in `color`. */
function paint(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
}

/** Boots: two ovals at the hem, as subpaths. */
function boots(ctx: Ctx, w: number): void {
  puffOval(ctx, -w * 0.45, Y(0.004), w * 0.42, 0.006);
  puffOval(ctx, w * 0.45, Y(0.004), w * 0.42, 0.006);
}

/** A coat or dress as a subpath: an A-line trapezoid from the shoulders (y = top) to the hem, the shoulders rounded. */
function coat(ctx: Ctx, top: number, shoulder: number, hem: number): void {
  ctx.moveTo(-shoulder, Y(top - 0.01));
  ctx.quadraticCurveTo(-shoulder, Y(top), -shoulder * 0.5, Y(top));
  ctx.lineTo(shoulder * 0.5, Y(top));
  ctx.quadraticCurveTo(shoulder, Y(top), shoulder, Y(top - 0.01));
  ctx.lineTo(hem, Y(0.007));
  ctx.lineTo(-hem, Y(0.007));
  ctx.closePath();
}

/** A round face with rosy cheeks and closed, singing eyes; `open` 0..1 for the mouth. */
function face(ctx: Ctx, x: number, y: number, r: number, open: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  paint(ctx, SKIN);
  ctx.beginPath();
  puff(ctx, x - r * 0.55, Y(y - r * 0.22), r * 0.2);
  puff(ctx, x + r * 0.55, Y(y - r * 0.22), r * 0.2);
  paint(ctx, CHEEK);
  // Closed eyes: little upward arcs (happy singing).
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, Y(y + r * 0.1));
  ctx.quadraticCurveTo(x - r * 0.35, Y(y + r * 0.32), x - r * 0.15, Y(y + r * 0.1));
  ctx.moveTo(x + r * 0.15, Y(y + r * 0.1));
  ctx.quadraticCurveTo(x + r * 0.35, Y(y + r * 0.32), x + r * 0.55, Y(y + r * 0.1));
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = lw * 0.8;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  puffOval(ctx, x, Y(y - r * 0.42), r * 0.2, r * (0.1 + 0.16 * open));
  paint(ctx, NAVY);
}

/** An open carol book's covers held at (x, y up), `w` wide, as a subpath. */
function bookCovers(ctx: Ctx, x: number, y: number, w: number): void {
  const h = w * 0.62;
  ctx.moveTo(x, Y(y - h * 0.08));
  ctx.lineTo(x - w * 0.52, Y(y + h * 0.02));
  ctx.lineTo(x - w * 0.52, Y(y + h * 1.0));
  ctx.lineTo(x, Y(y + h * 0.92));
  ctx.lineTo(x + w * 0.52, Y(y + h * 1.0));
  ctx.lineTo(x + w * 0.52, Y(y + h * 0.02));
  ctx.closePath();
}

/** The open carol book: cranberry covers round two cream pages. */
function carolBook(ctx: Ctx, x: number, y: number, w: number): void {
  const h = w * 0.62;
  ctx.beginPath();
  bookCovers(ctx, x, y, w);
  paint(ctx, BOOK);
  ctx.beginPath();
  ctx.moveTo(x, Y(y));
  ctx.lineTo(x - w * 0.45, Y(y + h * 0.1));
  ctx.lineTo(x - w * 0.45, Y(y + h * 0.95));
  ctx.lineTo(x, Y(y + h * 0.86));
  ctx.lineTo(x + w * 0.45, Y(y + h * 0.95));
  ctx.lineTo(x + w * 0.45, Y(y + h * 0.1));
  ctx.closePath();
  paint(ctx, CREAM);
}

/** A hand-held lantern: ring, pointed cap, glowing glass, base, in its pool of light. Hangs from (x, y up). */
function lantern(ctx: Ctx, x: number, y: number, s: number, lw: number, t: number): void {
  const flick = 0.85 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 4.3);
  glow(ctx, x, Y(y - s * 0.9), s * 3, flick);
  ctx.beginPath();
  ctx.arc(x, Y(y - s * 0.12), s * 0.22, Math.PI, 0);
  ctx.strokeStyle = IRON;
  ctx.lineWidth = lw * 0.9;
  ctx.stroke();
  ctx.beginPath();
  roundRectPath(ctx, x - s * 0.38, -(y - s * 0.44), s * 0.76, s * 0.88, s * 0.06);
  ctx.fillStyle = LAMP;
  ctx.fill();
  inked(ctx, lw * INKW);
  ctx.beginPath();
  puffOval(ctx, x, Y(y - s * 0.9), s * 0.16, s * 0.24 * flick);
  paint(ctx, LAMP_CORE);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, Y(y - s * 0.44));
  ctx.lineTo(x, Y(y - s * 0.12));
  ctx.lineTo(x + s * 0.45, Y(y - s * 0.44));
  ctx.closePath();
  ctx.rect(x - s * 0.45, Y(y - s * 1.32), s * 0.9, s * 0.12);
  paint(ctx, IRON);
}

// ---------------------------------------------------------------- carolers

/** The gentleman: navy greatcoat, mustard scarf, a tall top hat, singing from the book. */
function gentleman(ctx: Ctx, lw: number, t: number, phase: number): void {
  const bob = Math.sin(t * 2.4 + phase) * 0.0025;
  const open = 0.5 + 0.5 * Math.sin(t * 3.1 + phase);
  const hy = 0.118 + bob;
  const scarf = (): void => {
    roundRectPath(ctx, -0.02, -(hy - 0.012), 0.04, 0.012, 0.005);
    ctx.moveTo(0.008, Y(hy - 0.022));
    ctx.lineTo(0.02, Y(hy - 0.022));
    ctx.lineTo(0.024, Y(hy - 0.055));
    ctx.lineTo(0.013, Y(hy - 0.055));
    ctx.closePath();
  };
  const hat = (): void => {
    ctx.rect(-0.015, Y(hy + 0.058), 0.03, 0.044);
    ctx.rect(-0.027, Y(hy + 0.019), 0.054, 0.007);
  };
  const mittens = (): void => {
    puff(ctx, -0.022, Y(0.066 + bob), 0.0065);
    puff(ctx, 0.014, Y(0.066 + bob), 0.0065);
  };
  // His silhouette, inked under.
  ctx.beginPath();
  boots(ctx, 0.016);
  coat(ctx, 0.098 + bob, 0.026, 0.03);
  circle(ctx, 0, Y(hy), 0.02);
  scarf();
  hat();
  bookCovers(ctx, -0.004, 0.064 + bob, 0.04);
  mittens();
  inked(ctx, lw * INKW * 2);

  ctx.beginPath();
  boots(ctx, 0.016);
  paint(ctx, NAVY);
  ctx.beginPath();
  coat(ctx, 0.098 + bob, 0.026, 0.03);
  paint(ctx, COAT_NAVY);
  // Brass buttons down the front, and the scarf: a band and a hanging end.
  ctx.beginPath();
  for (let i = 0; i < 3; i++) puff(ctx, 0.004, Y(0.08 - i * 0.02 + bob), 0.0028);
  scarf();
  paint(ctx, BRASS);
  face(ctx, 0, hy, 0.02, open, lw);
  // Top hat: a tall crown and a brim, a cranberry band, snow on top.
  ctx.beginPath();
  hat();
  paint(ctx, NAVY);
  ctx.beginPath();
  ctx.rect(-0.015, Y(hy + 0.028), 0.03, 0.007);
  paint(ctx, COAT_RED);
  ctx.beginPath();
  snowCap(ctx, -0.016, 0.016, Y(hy + 0.058), 0.005);
  paint(ctx, SNOW);
  // The carol book, held in both mittens.
  carolBook(ctx, -0.004, 0.064 + bob, 0.04);
  ctx.beginPath();
  mittens();
  paint(ctx, BRASS);
}

/** The lady: a long teal coat, a cranberry shawl, a pink bonnet tied with a bow, a white muff. */
function lady(ctx: Ctx, lw: number, t: number, phase: number): void {
  const bob = Math.sin(t * 2.4 + phase) * 0.0025;
  const open = 0.5 + 0.5 * Math.sin(t * 3.1 + phase + 0.6);
  const hy = 0.097 + bob;
  const shawl = (): void => {
    ctx.moveTo(-0.025, Y(0.072 + bob));
    ctx.lineTo(-0.018, Y(0.082 + bob));
    ctx.lineTo(0.018, Y(0.082 + bob));
    ctx.lineTo(0.025, Y(0.072 + bob));
    ctx.lineTo(0, Y(0.046 + bob));
    ctx.closePath();
  };
  const crown = (): void => {
    ctx.moveTo(-0.024, Y(hy + 0.006));
    ctx.quadraticCurveTo(0, Y(hy + 0.03), 0.024, Y(hy + 0.006));
    ctx.quadraticCurveTo(0, Y(hy + 0.016), -0.024, Y(hy + 0.006));
    ctx.closePath();
  };
  const muff = (): void => puffOval(ctx, 0, Y(0.05 + bob), 0.014, 0.009);
  // Her silhouette, inked under.
  ctx.beginPath();
  boots(ctx, 0.012);
  coat(ctx, 0.078 + bob, 0.022, 0.036);
  shawl();
  circle(ctx, 0, Y(hy + 0.004), 0.026);
  crown();
  muff();
  inked(ctx, lw * INKW * 2);

  ctx.beginPath();
  boots(ctx, 0.012);
  paint(ctx, NAVY);
  ctx.beginPath();
  coat(ctx, 0.078 + bob, 0.022, 0.036);
  paint(ctx, COAT_TEAL);
  // Shawl over the shoulders: a flat triangle.
  ctx.beginPath();
  shawl();
  paint(ctx, SHAWL);
  // Bonnet: a big round brim framing the face, behind it.
  ctx.beginPath();
  circle(ctx, 0, Y(hy + 0.004), 0.026);
  paint(ctx, BONNET);
  face(ctx, 0, hy - 0.002, 0.017, open, lw);
  // Its crown over the forehead, drawn round so it stands off the brim.
  ctx.beginPath();
  crown();
  paint(ctx, BONNET);
  inked(ctx, lw * INKW * 0.8);
  // The ribbon bow at the chin
  ctx.beginPath();
  const by = hy - 0.021;
  ctx.moveTo(0, Y(by));
  ctx.lineTo(-0.009, Y(by + 0.005));
  ctx.lineTo(-0.009, Y(by - 0.005));
  ctx.closePath();
  ctx.moveTo(0, Y(by));
  ctx.lineTo(0.009, Y(by + 0.005));
  ctx.lineTo(0.009, Y(by - 0.005));
  ctx.closePath();
  paint(ctx, COAT_RED);
  // Snow on the bonnet, and the white muff.
  ctx.beginPath();
  snowCap(ctx, -0.014, 0.014, Y(hy + 0.029), 0.004);
  muff();
  paint(ctx, SNOW);
}

/** The child: an evergreen coat, a red knitted cap with a pompom, holding the lantern up on a stick. */
function child(ctx: Ctx, lw: number, t: number, phase: number, lx: number, ly: number): void {
  const bob = Math.sin(t * 2.4 + phase) * 0.003;
  const open = 0.5 + 0.5 * Math.sin(t * 3.1 + phase + 1.2);
  const hx = -0.012;
  const hyy = 0.058 + bob;
  const hy = 0.068 + bob;
  const cap = (): void => {
    ctx.moveTo(-0.016, Y(hy + 0.004));
    ctx.quadraticCurveTo(-0.014, Y(hy + 0.026), 0.003, Y(hy + 0.026));
    ctx.quadraticCurveTo(0.02, Y(hy + 0.024), 0.02, Y(hy + 0.004));
    ctx.closePath();
  };
  // The child's silhouette, inked under.
  ctx.beginPath();
  boots(ctx, 0.01);
  coat(ctx, 0.05 + bob, 0.017, 0.022);
  circle(ctx, 0.002, Y(hy), 0.016);
  cap();
  roundRectPath(ctx, -0.018, -(hy + 0.009), 0.04, 0.008, 0.003);
  puff(ctx, 0.004, Y(hy + 0.031), 0.0065);
  inked(ctx, lw * INKW * 2);

  ctx.beginPath();
  boots(ctx, 0.01);
  paint(ctx, NAVY);
  ctx.beginPath();
  coat(ctx, 0.05 + bob, 0.017, 0.022);
  paint(ctx, EVERGREEN);
  // The lantern stick, from the raised mitten to the lantern ring.
  ctx.beginPath();
  ctx.moveTo(hx + 0.002, Y(hyy - 0.006));
  ctx.lineTo(lx, Y(ly));
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 0.0035;
  ctx.lineCap = "round";
  ctx.stroke();
  lantern(ctx, lx, ly, 0.016, lw, t);
  face(ctx, 0.002, hy, 0.016, open, lw);
  // Knitted cap: a red dome, a cream turned-up band, a white pompom; the red mitten on the stick.
  ctx.beginPath();
  cap();
  puff(ctx, hx, Y(hyy), 0.0055);
  paint(ctx, COAT_RED);
  inked(ctx, lw * INKW * 0.8);
  ctx.beginPath();
  roundRectPath(ctx, -0.018, -(hy + 0.009), 0.04, 0.008, 0.003);
  paint(ctx, CREAM);
  ctx.beginPath();
  puff(ctx, 0.004, Y(hy + 0.031), 0.0065);
  paint(ctx, SNOW);
}

/**
 * Notes drifting up from the singers: [x offset, phase, size]. They rise on the right of the
 * group, over the lady and the child, so they never drift across the poulterer's goose.
 */
const NOTES = [
  [0.1, 0, 0.9],
  [0.112, 0.5, 0.75],
] as const;

function notes(ctx: Ctx, f: Frame, lw: number): void {
  for (const [dx, ph, k] of NOTES) {
    const p = (f.t * 0.22 + ph) % 1;
    const a = p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1;
    const x = dx + Math.sin(p * 6 + ph * 10) * 0.01;
    const y = 0.17 + p * 0.09;
    const r = 0.0065 * k;
    ctx.globalAlpha = a;
    ctx.beginPath();
    puffOval(ctx, x, Y(y), r * 1.2, r * 0.9, -0.4);
    paint(ctx, CREAM);
    ctx.beginPath();
    ctx.moveTo(x + r * 1.05, Y(y + r * 0.2));
    ctx.lineTo(x + r * 1.05, Y(y + r * 4));
    ctx.lineTo(x + r * 2.3, Y(y + r * 2.8));
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = lw * 0.9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * The three carolers standing at (f.x, f.y), left to right: the gentleman, the lady and the
 * child with the lantern raised over them. About 0.16 units tall and 0.13 wide.
 */
export function carolers(ctx: Ctx, f: Frame): void {
  const lw = begin(ctx, f, 0);
  notes(ctx, f, lw);
  ctx.save();
  ctx.translate(0.1, 0);
  child(ctx, lw, f.t, 1.4, -0.028, 0.15);
  ctx.restore();
  ctx.save();
  ctx.translate(0.051, 0);
  lady(ctx, lw, f.t, 0.7);
  ctx.restore();
  gentleman(ctx, lw, f.t, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- lamplighter

/**
 * 0..1: how high the lamplighter's pole is raised (he reaches up now and then), eased: from
 * s.t = 0 he raises it (1.2 s), holds it to the burner and lowers it by 5.4 s; every 11 s.
 */
export function lighterReach(t: number): number {
  const p = ((t % 11) + 11) % 11;
  const r = p < 1.2 ? p / 1.2 : p < 4.2 ? 1 : p < 5.4 ? 1 - (p - 4.2) / 1.2 : 0;
  return r * r * (3 - 2 * r);
}

/**
 * The lamplighter at (f.x, f.y), facing left toward his lamp: a mustard greatcoat, a navy cap and
 * a cranberry scarf. `tipX`, `tipY` (screen px) is the lamp's burner, where his pole's tip
 * reaches; between times the pole rests against the lamp's ladder bar at `restX`, `restY`.
 */
export function lamplighter(ctx: Ctx, f: Frame, tipX: number, tipY: number, restX: number, restY: number): void {
  const e = lighterReach(f.t);
  const lw = begin(ctx, f, 0);
  const t = f.t;
  const hy = 0.112;
  const satchel = (): void => roundRectPath(ctx, 0.01, -0.05, 0.02, 0.018, 0.003);
  const cap = (): void => {
    // A flat cap with a peak pointing at the lamp.
    ctx.moveTo(-0.02, Y(hy + 0.008));
    ctx.quadraticCurveTo(-0.018, Y(hy + 0.03), 0.004, Y(hy + 0.03));
    ctx.quadraticCurveTo(0.024, Y(hy + 0.028), 0.021, Y(hy + 0.008));
    ctx.closePath();
    ctx.moveTo(-0.018, Y(hy + 0.01));
    ctx.lineTo(-0.034, Y(hy + 0.006));
    ctx.lineTo(-0.016, Y(hy + 0.002));
    ctx.closePath();
  };
  const scarf = (): void => roundRectPath(ctx, -0.019, -(hy - 0.013), 0.038, 0.011, 0.005);
  // His silhouette, inked under.
  ctx.beginPath();
  boots(ctx, 0.014);
  coat(ctx, 0.092, 0.024, 0.03);
  satchel();
  circle(ctx, -0.002, Y(hy), 0.019);
  cap();
  scarf();
  inked(ctx, lw * INKW * 2);

  ctx.beginPath();
  boots(ctx, 0.014);
  paint(ctx, NAVY);
  ctx.beginPath();
  coat(ctx, 0.092, 0.024, 0.03);
  paint(ctx, COAT_MUSTARD);
  // His belt.
  ctx.beginPath();
  ctx.rect(-0.026, Y(0.052), 0.052, 0.008);
  paint(ctx, NAVY);
  face(ctx, -0.002, hy, 0.019, 0.25 + 0.15 * Math.sin(t * 1.3), lw);
  ctx.beginPath();
  cap();
  paint(ctx, NAVY);
  ctx.beginPath();
  snowCap(ctx, -0.014, 0.018, Y(hy + 0.029), 0.004);
  paint(ctx, SNOW);
  // The scarf and the satchel at his hip.
  ctx.beginPath();
  scarf();
  satchel();
  paint(ctx, COAT_RED);
  ctx.restore();

  // The pole, in screen space: from his raised hands toward the lamp. At rest it leans on the
  // ladder bar; as he reaches, it lifts until its tip meets the burner.
  const U = f.U;
  const hx = f.x - 0.018 * U;
  const hyS = f.y - (0.07 + 0.02 * e) * U;
  const px = restX + (tipX - restX) * e;
  const py = restY + (tipY - restY) * e;
  // Extend the pole a little below the hands
  const dx = px - hx;
  const dy = py - hyS;
  ctx.beginPath();
  ctx.moveTo(hx - dx * 0.12, hyS - dy * 0.12);
  ctx.lineTo(px, py);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = Math.max(2, 0.0055 * U);
  ctx.lineCap = "round";
  ctx.stroke();
  // A little flame on the tip
  const fl = 1 + 0.25 * Math.sin(t * 13);
  glow(ctx, px, py, 0.03 * U, 0.9);
  ctx.beginPath();
  ctx.moveTo(px, py - 0.012 * U * fl);
  ctx.lineTo(px + 0.005 * U, py - 0.002 * U);
  ctx.lineTo(px, py + 0.003 * U);
  ctx.lineTo(px - 0.005 * U, py - 0.002 * U);
  ctx.closePath();
  paint(ctx, LAMP_CORE);
  // Mittens on the pole
  ctx.beginPath();
  puff(ctx, hx, hyS, 0.0065 * U);
  puff(ctx, hx + dx * 0.1, hyS + dy * 0.1, 0.0065 * U);
  ctx.fillStyle = COAT_RED;
  ctx.fill();
  inked(ctx, f.lw * INKW);
}

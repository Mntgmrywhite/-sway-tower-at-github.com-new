import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BULB_DAY, BULB_ON, GATOR, GATOR_BELLY, GATOR_EYE, GATOR_SCUTE, GOLD, GREEN, INK, LAMPLIT, LIDS, MOUTH, PEARL, PURPLE, ROUGE, TEETH, VIOLET, WHITE, type Shades } from "./colors";
import { floorRest } from "./far";
import { feather } from "./folk";
import { rightLaneRoom } from "./lane";
import { inkW } from "./place";
import { blinkAt } from "./rig";
import { fleurPath, sparkle } from "./shapes";
import { rightShowBox } from "./sky";
import { AFTERNOON, level, LOOP_START, smooth, storyLevel, type Tone } from "./tone";

// The night parade's second great float, across the tower from the Carnival Queen (queen.ts):
// the King Gator, the head of a grinning papier-mâché alligator rising out of the clouds in the
// right lane, his long snout raised to the fireworks bursting over him (sky.ts). Our own design:
// a cheerful painted green hide with a cream belly, a big friendly grin with rounded teeth and a
// rosy cheek, a sleepy-happy golden eye under a violet-painted lid, a gold crown set jauntily on
// his head (its band of marquee bulbs chasing round by night, a fleur-de-lis on its middle point)
// with a plume of purple, green and gold behind it, and a ruff of purple and gold tiers hung
// with strings of beads round his neck. He rocks his head to the music, opens his jaws in a
// grin now and then, blinks, and his plume trembles and his beads swing.
//
// He comes up out of the clouds a little after the Queen, once the night parade's fireworks are
// going (and, in the first pass, only once Sky Islands' island has gone below the clouds' top:
// he rises as it sinks, lane.ts), stands there all night, and sinks back with her before the dawn
// on every turn of the story's loop. Only height and what is in the lane decide how far up he is,
// so the loop comes round with no seam. He keeps to the right lane, under its fireworks, out of
// the tower's column with all his motion; one ink weight up close, a lit side and a shaded side.
//
// Units: R, about a third of his head's length; the origin is his head's pivot on the neck, y down.
// His head is drawn snout to the left (toward the tower) in its own frame, then raised by
// HEAD_UP to point at the sky.

/** His size (u), at most: the lane's width holds this. */
const R = 0.054;
/** Where his pivot stands across: u right of the screen's center, held in from the screen's right side on a wide screen. */
const X = 0.387;
/** His pivot stands this far (R) above the line the cloud floor rests on (far.ts) once he is all the way up. */
const UP = 2.15;
/** How far his head is raised from level (rad): his snout points up and toward the tower. */
const HEAD_UP = 0.85;

/** Everything he can cover, in R about his pivot, with all his motion: for tests and for keeping the lane clear. */
export const GATOR_REACH = { left: -2.32, right: 1.94, top: -2.95, bottom: 2.95 } as const;

/**
 * Rising after the Queen, at the night parade (story levels), and sinking with her in each loop's
 * night hold, before the dawn (tone.ts, queen.ts).
 */
const RISE_FROM = 64;
const RISE_TO = 74;
const SINK_FROM = -29;
const SINK_TO = -15;

/** How far he has come up out of the clouds at a level, by height alone: 0 down in them, 1 all the way up. */
export function gatorUp(lvl: number): number {
  const e = storyLevel(lvl);
  if (lvl >= LOOP_START && e < AFTERNOON) return 1 - smooth(SINK_FROM, SINK_TO, e);
  return smooth(RISE_FROM, RISE_TO, e);
}

/** Scratch: where he stands and how big. */
const AT = { x: 0, y: 0, r: 0, up: 0 };

/**
 * Where his pivot is on screen, his R (px) and how far up he is: as far as his height says and
 * the lane leaves him room (lane.ts). He stands on the line where the cloud floor comes to rest,
 * and as big as the lane holds, smaller where the screen is short for its width, to keep under
 * the right lane's fireworks.
 */
export function gatorAt(s: Scene): typeof AT {
  const u = s.u;
  const rest = floorRest(s);
  AT.r = Math.min(R * u, (rest - rightShowBox(s).b - u * 0.012) / (UP - GATOR_REACH.top));
  AT.x = Math.max(s.cssW / 2 + X * u, s.cssW - (0.5 - X) * u);
  const tall = (UP - GATOR_REACH.top) * AT.r;
  const want = gatorUp(level(s));
  AT.up = want <= 0 ? 0 : Math.min(want, rightLaneRoom(s, AT.x + GATOR_REACH.left * AT.r, AT.x + GATOR_REACH.right * AT.r, rest, tall));
  AT.y = rest - UP * AT.r + (1 - AT.up) * (tall + 0.3 * AT.r) + Math.sin(s.t * 0.6 + 2) * u * 0.003;
  return AT;
}

/** The head's rock to the music (rad), and how far his jaw is open (rad), by his clock. */
function rockAt(t: number): number {
  return Math.sin(t * 1.6) * 0.03 + Math.sin(t * 0.37 + 1) * 0.012;
}
function jawAt(t: number): number {
  return 0.05 + 0.08 * Math.max(0, Math.sin(t * 0.9 + 0.4)) ** 2;
}

/** The plume behind his crown: [angle from upright (rad), length (R), color]. */
const PLUME: readonly (readonly [number, number, Shades])[] = [
  [-0.5, 1.25, GOLD],
  [-0.26, 1.55, PURPLE],
  [-0.02, 1.7, GREEN],
  [0.22, 1.5, PURPLE],
  [0.44, 1.2, GOLD],
];
/** The crown: its width (R), its points [x, height] (crown widths), the dip between them, its marquee bulbs (crown widths). */
const CROWN_W = 1.18;
const TIPS = [
  [-0.46, 0.55],
  [-0.23, 0.45],
  [0, 0.66],
  [0.23, 0.45],
  [0.46, 0.55],
] as const;
const DIP = 0.32;
const BULBS = Array.from({ length: 5 }, (_, i) => -0.36 + (i * 0.72) / 4);
/** Where gold sequins glint (R, in his frame) and their clocks' offsets. */
const GLINTS = [
  [0.7, -1.45, 0.4],
  [1.15, -0.85, 2.2],
  [-0.3, 1.2, 3.6],
] as const;
/** His teeth along the upper jaw and the lower (local x, R). */
const TOP_TEETH = [-2.72, -2.42, -2.12, -1.82, -1.52, -1.22] as const;
const LOW_TEETH = [-2.55, -2.25, -1.95, -1.65, -1.35] as const;
/** Lighter scales dabbed along his snout, and the scutes down the back of his head: (local x, y, size). */
const DABS = [
  [-1.5, -0.74, 0.11],
  [-1.92, -0.72, 0.09],
  [-2.3, -0.72, 0.08],
  [-1.2, -0.56, 0.07],
] as const;
const SCUTES = [
  [0.36, -0.66],
  [0.48, -0.38],
  [0.55, -0.1],
] as const;
/** His eye's bump on top of his head, and the eye in it (local, R). */
const EYE = { x: -0.36, y: -1.12, r: 0.46, rx: 0.3, ry: 0.27 } as const;

/** The upper head in its own frame (snout to the left): the back of the head, the eye's bump, the chunky snout and its nostril bump, the rounded tip, the grinning mouth line back to the jowl. */
function headPath(ctx: Ctx, r: number): void {
  ctx.moveTo(0.58 * r, -0.32 * r);
  ctx.quadraticCurveTo(0.56 * r, -0.78 * r, 0.12 * r, -1.02 * r);
  ctx.arc(EYE.x * r, EYE.y * r, EYE.r * r, -0.28, Math.PI + 0.42, true);
  ctx.quadraticCurveTo(-0.98 * r, -0.94 * r, -1.25 * r, -0.92 * r);
  ctx.lineTo(-2.45 * r, -0.86 * r);
  ctx.quadraticCurveTo(-2.6 * r, -1.06 * r, -2.84 * r, -0.94 * r);
  ctx.quadraticCurveTo(-3.16 * r, -0.76 * r, -3.08 * r, -0.4 * r);
  ctx.quadraticCurveTo(-3.04 * r, -0.24 * r, -2.9 * r, -0.24 * r);
  ctx.quadraticCurveTo(-1.85 * r, -0.12 * r, -0.82 * r, -0.13 * r);
  ctx.quadraticCurveTo(-0.62 * r, -0.13 * r, -0.56 * r, -0.3 * r);
  ctx.quadraticCurveTo(-0.38 * r, 0.14 * r, 0.12 * r, 0.18 * r);
  ctx.quadraticCurveTo(0.56 * r, 0.14 * r, 0.6 * r, -0.12 * r);
  ctx.closePath();
}

/** The lower jaw in its own frame (before it opens about its hinge): its top edge, the rounded chin, its underside back to the throat. */
function jawPath(ctx: Ctx, r: number): void {
  ctx.moveTo(-0.62 * r, -0.12 * r);
  ctx.quadraticCurveTo(-1.8 * r, -0.16 * r, -2.8 * r, -0.2 * r);
  ctx.quadraticCurveTo(-3.02 * r, -0.14 * r, -2.94 * r, 0.04 * r);
  ctx.quadraticCurveTo(-2.4 * r, 0.3 * r, -1.2 * r, 0.42 * r);
  ctx.quadraticCurveTo(-0.4 * r, 0.48 * r, 0.08 * r, 0.26 * r);
  ctx.lineTo(-0.3 * r, -0.04 * r);
  ctx.closePath();
}
/** The jaw's hinge, in the head's frame. */
const HINGE = [-0.5, -0.06] as const;

/** The mouth's inside, shown between the jaws as they part: under the upper mouth line, down to the jaw's top edge. */
function mouthPath(ctx: Ctx, r: number): void {
  ctx.moveTo(-0.6 * r, -0.14 * r);
  ctx.quadraticCurveTo(-1.85 * r, -0.14 * r, -2.88 * r, -0.24 * r);
  ctx.lineTo(-2.84 * r, 0.12 * r);
  ctx.quadraticCurveTo(-1.8 * r, 0.2 * r, -0.62 * r, 0.12 * r);
  ctx.closePath();
}

/** The crown's outline at (0, y0), `w` wide: five points over a band. */
function crownPath(ctx: Ctx, y0: number, w: number): void {
  ctx.moveTo(-0.5 * w, y0);
  ctx.lineTo(-0.53 * w, y0 - DIP * w);
  for (let i = 0; i < TIPS.length; i++) {
    const [x, h] = TIPS[i]!;
    ctx.lineTo(x * w, y0 - h * w);
    if (i < TIPS.length - 1) ctx.lineTo(((x + TIPS[i + 1]![0]) / 2) * w, y0 - DIP * w);
  }
  ctx.lineTo(0.53 * w, y0 - DIP * w);
  ctx.lineTo(0.5 * w, y0);
  ctx.quadraticCurveTo(0, y0 + 0.06 * w, -0.5 * w, y0);
  ctx.closePath();
}

/** A scalloped tier of his ruff, `rx` wide and `ry` deep about (cx, y), as one subpath. */
function ruffPath(ctx: Ctx, cx: number, y: number, rx: number, ry: number, n: number): void {
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const px = cx + Math.cos(a) * rx;
    const py = y + Math.sin(a) * ry * 0.35;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const am = Math.PI + ((i - 0.5) / n) * Math.PI;
      ctx.quadraticCurveTo(cx + Math.cos(am) * rx * 1.12, y + Math.sin(am) * ry * 0.35 - ry * 0.28, px, py);
    }
  }
  ctx.lineTo(cx + rx * 0.9, y + ry);
  ctx.lineTo(cx - rx * 0.9, y + ry);
  ctx.closePath();
}

/** A point of the head's frame where it lands in his frame (head raised by `a` about the pivot): scratch. */
const PT = { x: 0, y: 0 };
function headToBody(x: number, y: number, a: number): typeof PT {
  const c = Math.cos(a);
  const s = Math.sin(a);
  PT.x = x * c - y * s;
  PT.y = x * s + y * c;
  return PT;
}

/** His neck, from under his head down into the clouds: the hide, its shaded back, the cream belly band in front with its scale lines, the scutes down the back. */
function neck(ctx: Ctx, r: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(-0.62 * r, -0.05 * r);
  ctx.quadraticCurveTo(-0.84 * r, 1.2 * r, -0.98 * r, 2.9 * r);
  ctx.lineTo(1.12 * r, 2.9 * r);
  ctx.quadraticCurveTo(1.0 * r, 1.1 * r, 0.72 * r, -0.1 * r);
  ctx.closePath();
  ctx.fillStyle = GATOR.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = GATOR.shade;
  ctx.beginPath();
  ctx.moveTo(0.46 * r, 0.05 * r);
  ctx.quadraticCurveTo(0.78 * r, 1.2 * r, 0.82 * r, 2.9 * r);
  ctx.lineTo(1.08 * r, 2.9 * r);
  ctx.quadraticCurveTo(0.96 * r, 1.1 * r, 0.7 * r, -0.06 * r);
  ctx.closePath();
  ctx.fill();
  // The belly band, its scales in lines across it.
  ctx.beginPath();
  ctx.moveTo(-0.56 * r, 0.1 * r);
  ctx.quadraticCurveTo(-0.76 * r, 1.2 * r, -0.9 * r, 2.9 * r);
  ctx.lineTo(-0.22 * r, 2.9 * r);
  ctx.quadraticCurveTo(-0.12 * r, 1.2 * r, -0.08 * r, 0.22 * r);
  ctx.closePath();
  ctx.fillStyle = GATOR_BELLY.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.strokeStyle = GATOR_BELLY.shade;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const y = (0.15 + i * 0.3) * r;
    const k = y / (2.9 * r);
    ctx.moveTo((-0.6 - 0.3 * k) * r, y);
    ctx.quadraticCurveTo((-0.38 - 0.2 * k) * r, y + 0.07 * r, (-0.1 - 0.12 * k) * r, y);
  }
  ctx.stroke();
  // The scutes down the back of his neck.
  ctx.fillStyle = GATOR_SCUTE;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, (0.8 + i * 0.05) * r, (0.25 + i * 0.36) * r, 0.11 * r);
  ctx.fill();
}

/** Where his crown sits on his head (local, R): on top of it, just behind the eye's bump; and how far it tips back with his head. */
const CROWN_AT = [0.3, -1.06] as const;
const CROWN_TIP = 0.36;

/**
 * The King Gator, up out of the cloud floor whose top edge is `floor`. Drawn before the cloud
 * floor, which covers his neck (and all of him while he is down).
 */
export function kingGator(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  const { x, y, r, up } = gatorAt(s);
  if (up <= 0.001 || y + GATOR_REACH.top * r > floor + s.u * 0.06) return;
  const lw = inkW(s) * 0.85;
  const t = s.t;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const a = HEAD_UP + rockAt(t);
  const crown = headToBody(CROWN_AT[0] * r, CROWN_AT[1] * r, a);
  const cx = crown.x;
  const cy = crown.y;
  // The plume rising behind the crown: one ink, the feathers, their lit vanes.
  ctx.beginPath();
  for (let i = 0; i < PLUME.length; i++) plumeAt(ctx, cx, cy, r, i, t, 0.2);
  ink(ctx, lw * 2, INK);
  for (let i = 0; i < PLUME.length; i++) {
    const c = PLUME[i]![2];
    ctx.fillStyle = c.body;
    ctx.beginPath();
    plumeAt(ctx, cx, cy, r, i, t, 0.2);
    ctx.fill();
    ctx.fillStyle = c.light;
    ctx.beginPath();
    plumeAt(ctx, cx, cy, r, i, t, 0.08);
    ctx.fill();
  }
  // His crown, set on the top of his head behind the eye's bump (which comes in front of it), tipped
  // back with the slope of his head: gold over a purple band, lit down its left, pearls on the
  // points, a fleur-de-lis on the middle one, its bulbs chasing by night.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a * CROWN_TIP);
  const cw = CROWN_W * r;
  ctx.beginPath();
  crownPath(ctx, 0, cw);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(-0.6 * cw, -0.8 * cw, 0.3 * cw, 0.9 * cw);
  ctx.fillStyle = GOLD.shade;
  ctx.fillRect(0.3 * cw, -0.8 * cw, 0.3 * cw, 0.9 * cw);
  ctx.fillStyle = PURPLE.body;
  ctx.fillRect(-0.6 * cw, -0.26 * cw, 1.2 * cw, 0.2 * cw);
  ctx.restore();
  ctx.beginPath();
  crownPath(ctx, 0, cw);
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < TIPS.length; i++) {
    if (i === 2) continue;
    const [px, ph] = TIPS[i]!;
    circle(ctx, px * cw, -ph * cw - 0.03 * cw, 0.055 * cw);
  }
  ctx.fillStyle = PEARL;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  fleurPath(ctx, 0, -0.78 * cw, 0.22 * cw);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  const chase = Math.floor(t * 4 + 2);
  const night = tone.lit > 0.2;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < BULBS.length; i++) {
      if ((pass === 1) !== ((i + chase) % 3 === 0)) continue;
      circle(ctx, BULBS[i]! * cw, -0.16 * cw, 0.04 * cw);
    }
    ctx.fillStyle = pass ? BULB_ON : night ? LAMPLIT : BULB_DAY;
    ctx.fill();
  }
  ctx.restore();
  neck(ctx, r, lw);
  // His ruff: a gold tier behind a purple one, strings of beads across it, swinging.
  ctx.beginPath();
  ruffPath(ctx, 0.1 * r, 1.05 * r, 1.2 * r, 0.62 * r, 8);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  ruffPath(ctx, 0.1 * r, 1.27 * r, 0.95 * r, 0.55 * r, 6);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  const swing = Math.sin(t * 1.3 + 1) * 0.05 * r;
  const strands: readonly (readonly [number, number, Shades])[] = [
    [0.52, 0.42, GOLD],
    [0.72, 0.58, GREEN],
    [0.9, 0.74, VIOLET],
  ];
  for (const [hw, d, c] of strands) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const k = i / 9;
      const ang = Math.PI * k;
      circle(ctx, 0.1 * r - hw * r * Math.cos(ang) + swing * Math.sin(ang), 0.88 * r + d * r * Math.sin(ang) * 0.62, 0.07 * r);
    }
    ctx.fillStyle = c.body;
    ctx.fill();
  }
  // The head, raised on its pivot: the jaw (opening on its hinge) behind, the mouth's inside, the upper head.
  ctx.save();
  ctx.rotate(a);
  const open = jawAt(t);
  ctx.beginPath();
  mouthPath(ctx, r);
  ctx.fillStyle = MOUTH;
  ctx.fill();
  ctx.save();
  ctx.translate(HINGE[0] * r, HINGE[1] * r);
  ctx.rotate(-open);
  ctx.translate(-HINGE[0] * r, -HINGE[1] * r);
  ctx.beginPath();
  jawPath(ctx, r);
  ctx.fillStyle = GATOR.body;
  ctx.fill();
  ctx.fillStyle = GATOR.shade;
  ctx.beginPath();
  ctx.moveTo(-2.75 * r, 0.12 * r);
  ctx.quadraticCurveTo(-2.3 * r, 0.32 * r, -1.2 * r, 0.42 * r);
  ctx.quadraticCurveTo(-0.4 * r, 0.48 * r, 0.08 * r, 0.26 * r);
  ctx.quadraticCurveTo(-0.5 * r, 0.3 * r, -1.2 * r, 0.28 * r);
  ctx.closePath();
  ctx.fill();
  // The lower teeth, pointing up from the jaw's edge.
  ctx.beginPath();
  for (const tx of LOW_TEETH) {
    const ty = -0.16 * r - ((tx + 0.62) / -2.16) * 0.04 * r;
    ctx.moveTo((tx - 0.08) * r, ty + 0.03 * r);
    ctx.quadraticCurveTo(tx * r, ty - 0.2 * r, (tx + 0.08) * r, ty + 0.03 * r);
    ctx.closePath();
  }
  ctx.fillStyle = TEETH;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  jawPath(ctx, r);
  ink(ctx, lw, INK);
  ctx.restore();
  // The upper head: the hide, its shaded jowl and lit top, the teeth hanging from the mouth line.
  ctx.beginPath();
  headPath(ctx, r);
  ctx.fillStyle = GATOR.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = GATOR.light;
  ctx.beginPath();
  ctx.moveTo(-1.2 * r, -1.02 * r);
  ctx.lineTo(-2.5 * r, -0.98 * r);
  ctx.quadraticCurveTo(-2.9 * r, -1.08 * r, -3.2 * r, -0.7 * r);
  ctx.lineTo(-3.2 * r, -0.62 * r);
  ctx.quadraticCurveTo(-1.8 * r, -0.64 * r, -1.0 * r, -0.74 * r);
  ctx.closePath();
  oval(ctx, (EYE.x - 0.12) * r, (EYE.y - 0.3) * r, 0.3 * r, 0.13 * r, -0.2);
  ctx.fill();
  ctx.fillStyle = GATOR.shade;
  ctx.beginPath();
  ctx.moveTo(-0.56 * r, -0.3 * r);
  ctx.quadraticCurveTo(-0.38 * r, 0.14 * r, 0.12 * r, 0.18 * r);
  ctx.quadraticCurveTo(0.56 * r, 0.14 * r, 0.6 * r, -0.12 * r);
  ctx.quadraticCurveTo(0.2 * r, 0.0, -0.2 * r, -0.06 * r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = GATOR.light;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  for (const [dx, dy, ds] of DABS) oval(ctx, dx * r, dy * r, ds * r * 1.4, ds * r * 0.7);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = GATOR_SCUTE;
  ctx.beginPath();
  for (const [dx, dy] of SCUTES) circle(ctx, dx * r, dy * r, 0.08 * r);
  ctx.fill();
  ctx.beginPath();
  for (const tx of TOP_TEETH) {
    const ty = -0.22 * r + ((tx + 0.82) / -2.08) * -0.06 * r;
    ctx.moveTo((tx - 0.09) * r, ty - 0.02 * r);
    ctx.quadraticCurveTo(tx * r, ty + 0.24 * r, (tx + 0.09) * r, ty - 0.02 * r);
    ctx.closePath();
  }
  ctx.fillStyle = TEETH;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  headPath(ctx, r);
  ink(ctx, lw, INK);
  // The nostril, the rosy cheek by the grin's corner.
  ctx.fillStyle = GATOR_SCUTE;
  ctx.beginPath();
  oval(ctx, -2.8 * r, -0.78 * r, 0.09 * r, 0.05 * r, -0.3);
  ctx.fill();
  ctx.fillStyle = ROUGE;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  oval(ctx, -0.98 * r, -0.4 * r, 0.22 * r, 0.12 * r, -0.1);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The eye on its bump: white, a gold iris looking up the snout, a round pupil, a glint; the
  // violet-painted lid half down, sleepy and pleased, and all the way down in a blink.
  const blink = blinkAt(t, 501);
  ctx.beginPath();
  oval(ctx, EYE.x * r, EYE.y * r, EYE.rx * r, EYE.ry * r);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.fillStyle = GATOR_EYE;
  ctx.beginPath();
  circle(ctx, (EYE.x - 0.1) * r, (EYE.y + 0.03) * r, 0.17 * r);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, (EYE.x - 0.14) * r, (EYE.y + 0.04) * r, 0.085 * r);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  circle(ctx, (EYE.x - 0.18) * r, (EYE.y - 0.02) * r, 0.035 * r);
  ctx.fill();
  const lid = 0.4 + 0.6 * blink;
  const lx0 = (EYE.x - EYE.rx) * r;
  const lx1 = (EYE.x + EYE.rx) * r;
  const ly = EYE.y * r;
  ctx.fillStyle = LIDS.violet;
  ctx.beginPath();
  ctx.moveTo(lx0, ly);
  ctx.bezierCurveTo(lx0 + 0.04 * r, ly - 0.36 * r, lx1 - 0.04 * r, ly - 0.36 * r, lx1, ly);
  ctx.quadraticCurveTo(EYE.x * r, ly + (-0.27 + lid * 0.6) * r, lx0, ly);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  oval(ctx, EYE.x * r, EYE.y * r, EYE.rx * r, EYE.ry * r);
  ink(ctx, lw * 0.7, INK);
  ctx.restore();
  // Sequins glinting now and then on his crown, his ruff and his plume.
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  for (const [gx, gy, off] of GLINTS) {
    const g = Math.sin(t * 1.7 + off * 2.3);
    if (g < 0.55) continue;
    sparkle(ctx, gx * r, gy * r, r * 0.16 * (g - 0.55) * 2.2);
  }
  ctx.fill();
  ctx.restore();
}

/** Plume feather `i` from the crown's back at (cx, cy), trembling on its own clock: a subpath, `wide` across (R). */
function plumeAt(ctx: Ctx, cx: number, cy: number, r: number, i: number, t: number, wide: number): void {
  const [a0, len] = PLUME[i]!;
  const a = a0 + Math.sin(t * 3.4 + i * 1.7) * 0.04 + Math.sin(t * 1.1 + i) * 0.03;
  const bx = cx + 0.2 * r;
  const by = cy - 0.35 * r;
  const tx = bx + Math.sin(a) * len * r;
  const ty = by - Math.cos(a) * len * r;
  if (wide > 0.1) feather(ctx, bx, by, tx, ty, wide * r);
  else feather(ctx, bx + (tx - bx) * 0.25, by + (ty - by) * 0.25, tx, ty, wide * r);
}

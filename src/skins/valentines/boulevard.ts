import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { couple } from "./couple";
import { landLine } from "./far";
import { archPath, block, heartPath } from "./shapes";
import type { Tone } from "./tone";

// The boulevard across the lawn, a row of candy-colored shop fronts standing on the land's line
// (far.ts: the horizon, then the cloud sea once it has gathered): on the left a chocolate shop
// with a brown awning and a window of our own bonbons on a doily; a tall pink townhouse with
// balconies in the middle; a flower stall under a striped awning, buckets of roses and tulips
// on its counter; and on the right the café, a red-and-white awning over its big window, the
// couple at a table on its terrace exchanging a card (couple.ts), and a lamp post at the row's
// end. The row stops short of the screen's left side: that is where the sun sets, into the
// cloud bank over low hills, and nothing may stand in its way.
// Strings of lights sag from front to front along the row to the lamp; they, the lantern and
// the windows come on at dusk. Mid-distance: flat two-tone fills
// in the hour's light (tone.ts), no outline. Nothing here moves but the couple, out in the
// right lane.
//
// Positions are in u from the screen center, heights in u above the horizon.

/** The shops: center X, half width, wall height (u). */
export const CHOC_X = -0.182;
const CHOC_HW = 0.08;
const CHOC_H = 0.17;
const HOUSE_X = 0;
const HOUSE_HW = 0.085;
const HOUSE_H = 0.215;
export const STALL_X = 0.18;
const STALL_HW = 0.072;
export const CAFE_X = 0.36;
export const CAFE_HW = 0.085;
const CAFE_H = 0.165;
/** The lamp post at the row's right end: where it stands (u from center), its height, its lantern's half width and height (u). */
export const LAMP_X = 0.472;
const LAMP_H = 0.14;
const LANTERN_HW = 0.013;
const LANTERN_H = 0.026;

/** The faint shadow under eaves and awnings. */
const SHADE = "rgba(60, 20, 70, 0.14)";

/** A scalloped awning over x0..x1, its top at `top`, `drop` deep, in stripes. */
function awning(ctx: Ctx, x0: number, x1: number, top: number, drop: number, a: string, b: string, u: number): void {
  const w = x1 - x0;
  const n = Math.max(3, Math.round(w / (u * 0.022)));
  const sw = w / n;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? b : a;
    ctx.beginPath();
    for (let i = pass; i < n; i += 2) {
      const x = x0 + i * sw;
      ctx.moveTo(x, top);
      ctx.lineTo(x + sw, top);
      ctx.lineTo(x + sw, top + drop - sw * 0.3);
      ctx.quadraticCurveTo(x + sw / 2, top + drop + sw * 0.35, x, top + drop - sw * 0.3);
      ctx.closePath();
    }
    ctx.fill();
  }
}

/** A window: dark glass (lit at night), a cream frame and cross bars. */
function window(ctx: Ctx, tone: Tone, x: number, y: number, w: number, h: number, u: number, frame: string): void {
  ctx.fillStyle = frame;
  ctx.fillRect(x - u * 0.004, y - u * 0.004, w + u * 0.008, h + u * 0.008);
  ctx.fillStyle = tone.windowLit;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = frame;
  ctx.fillRect(x + w / 2 - u * 0.0015, y, u * 0.003, h);
  ctx.fillRect(x, y + h * 0.45, w, u * 0.003);
}

/** The flower stall: a wooden counter on legs, buckets of roses and tulips, under a striped awning on two posts. */
function flowerStall(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + STALL_X * u;
  const hz = landLine(s);
  const hw = STALL_HW * u;
  // Posts and awning.
  ctx.fillStyle = tone.awningBrown;
  ctx.fillRect(cx - hw + u * 0.004, hz - u * 0.15, u * 0.008, u * 0.15);
  ctx.fillRect(cx + hw - u * 0.012, hz - u * 0.15, u * 0.008, u * 0.15);
  awning(ctx, cx - hw - u * 0.012, cx + hw + u * 0.012, hz - u * 0.165, u * 0.03, tone.awningGreen, tone.awningStripe, u);
  ctx.fillStyle = tone.awningGreen;
  ctx.beginPath();
  ctx.moveTo(cx - hw - u * 0.012, hz - u * 0.165);
  ctx.lineTo(cx, hz - u * 0.185);
  ctx.lineTo(cx + hw + u * 0.012, hz - u * 0.165);
  ctx.closePath();
  ctx.fill();
  // The counter: a plank top, a boarded front, and legs.
  ctx.fillStyle = tone.awningBrown;
  ctx.fillRect(cx - hw + u * 0.002, hz - u * 0.062, hw * 2 - u * 0.004, u * 0.062);
  ctx.fillStyle = tone.wallCream;
  ctx.fillRect(cx - hw + u * 0.008, hz - u * 0.052, hw * 2 - u * 0.016, u * 0.044);
  ctx.fillStyle = SHADE;
  ctx.fillRect(cx - hw + u * 0.008, hz - u * 0.052, hw * 2 - u * 0.016, u * 0.008);
  ctx.fillStyle = tone.awningBrown;
  for (let i = 1; i < 4; i++) ctx.fillRect(cx - hw + u * 0.008 + (hw * 2 - u * 0.016) * (i / 4), hz - u * 0.052, u * 0.002, u * 0.044);
  // A chalkboard sign with a heart on the counter's front.
  ctx.fillStyle = tone.roofPlum;
  ctx.beginPath();
  block(ctx, cx - u * 0.016, hz - u * 0.048, u * 0.032, u * 0.034, u * 0.003);
  ctx.fill();
  ctx.fillStyle = tone.tulipP;
  ctx.beginPath();
  heartPath(ctx, cx, hz - u * 0.03, u * 0.018);
  ctx.fill();
  // Buckets along the counter: three of them, roses, tulips, roses.
  const by = hz - u * 0.062;
  const bw = u * 0.034;
  for (let i = 0; i < 3; i++) {
    const bx = cx - hw + u * 0.028 + i * (hw * 2 - u * 0.056) * 0.5;
    ctx.fillStyle = tone.stone;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by - u * 0.03);
    ctx.lineTo(bx + bw * 0.5, by - u * 0.03);
    ctx.lineTo(bx + bw * 0.4, by);
    ctx.lineTo(bx - bw * 0.4, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.stoneShade;
    ctx.fillRect(bx - bw * 0.5, by - u * 0.03, bw, u * 0.004);
    // Stems and leaves, then the blooms.
    ctx.fillStyle = tone.leaf;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const fx = bx + (k - 2) * bw * 0.2;
      ctx.rect(fx - u * 0.001, by - u * 0.07 + Math.abs(k - 2) * u * 0.006, u * 0.002, u * 0.045);
      if (k % 2 === 0) oval(ctx, fx + u * 0.006, by - u * 0.045, u * 0.006, u * 0.003, -0.6);
    }
    ctx.fill();
    // The blooms, two colors a bucket, each color as one fill: tulips (a cup with two points) in the middle bucket, roses either side.
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.tulipP : i === 1 ? tone.tulipY : tone.rose;
      ctx.beginPath();
      for (let k = pass; k < 5; k += 2) {
        const fx = bx + (k - 2) * bw * 0.2;
        const fy = by - u * 0.072 + Math.abs(k - 2) * u * 0.006;
        if (i === 1) {
          ctx.moveTo(fx - u * 0.006, fy - u * 0.004);
          ctx.lineTo(fx - u * 0.005, fy - u * 0.014);
          ctx.lineTo(fx - u * 0.002, fy - u * 0.009);
          ctx.lineTo(fx, fy - u * 0.015);
          ctx.lineTo(fx + u * 0.002, fy - u * 0.009);
          ctx.lineTo(fx + u * 0.005, fy - u * 0.014);
          ctx.lineTo(fx + u * 0.006, fy - u * 0.004);
          ctx.quadraticCurveTo(fx, fy + u * 0.008, fx - u * 0.006, fy - u * 0.004);
          ctx.closePath();
        } else {
          circle(ctx, fx, fy - u * 0.004, u * 0.0075);
        }
      }
      ctx.fill();
    }
  }
}

/** A shop front: wall, a cornice along the top, a shade band under it. Returns nothing; details are the callers'. */
function front(ctx: Ctx, tone: Tone, x: number, hw: number, h: number, hz: number, u: number, wall: string, roof: string): void {
  ctx.fillStyle = wall;
  ctx.fillRect(x - hw, hz - h * u, hw * 2, h * u);
  ctx.fillStyle = SHADE;
  ctx.fillRect(x - hw, hz - h * u, hw * 2, u * 0.012);
  ctx.fillStyle = roof;
  ctx.fillRect(x - hw - u * 0.006, hz - h * u - u * 0.012, hw * 2 + u * 0.012, u * 0.014);
  ctx.fillStyle = tone.roofPlum;
  ctx.fillRect(x - hw - u * 0.006, hz - h * u + u * 0.002, hw * 2 + u * 0.012, u * 0.003);
}

/** The chocolate shop: a cream front with a brown awning, a window of bonbons in rows on a doily, a heart on its hanging sign. */
function chocolateShop(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + CHOC_X * u;
  const hz = landLine(s);
  const hw = CHOC_HW * u;
  front(ctx, tone, cx, hw, CHOC_H, hz, u, tone.wallCream, tone.roof);
  // Upstairs: two small windows with a flower box.
  for (let m = -1; m <= 1; m += 2) {
    window(ctx, tone, cx + m * hw * 0.45 - u * 0.016, hz - u * 0.15, u * 0.032, u * 0.036, u, tone.awningStripe);
    ctx.fillStyle = tone.rose;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) circle(ctx, cx + m * hw * 0.45 - u * 0.01 + k * u * 0.01, hz - u * 0.11, u * 0.0045);
    ctx.fill();
    ctx.fillStyle = tone.awningBrown;
    ctx.fillRect(cx + m * hw * 0.45 - u * 0.018, hz - u * 0.108, u * 0.036, u * 0.007);
  }
  // The awning over the shop window and door.
  awning(ctx, cx - hw - u * 0.004, cx + hw + u * 0.004, hz - u * 0.092, u * 0.022, tone.awningBrown, tone.awningStripe, u);
  // The shop window: bonbons in three rows on a doily, pink and brown by turns.
  const wx = cx - hw + u * 0.012;
  const ww = hw * 2 - u * 0.06;
  window(ctx, tone, wx, hz - u * 0.07, ww, u * 0.056, u, tone.awningBrown);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(wx + u * 0.004, hz - u * 0.066, ww - u * 0.008, u * 0.048);
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = row === 1 ? tone.bonbonPink : tone.bonbon;
    ctx.beginPath();
    const n = 5;
    for (let k = 0; k < n; k++) {
      const bx = wx + u * 0.012 + ((ww - u * 0.024) * (k + 0.5)) / n;
      const by = hz - u * 0.058 + row * u * 0.015;
      if ((k + row) % 2) circle(ctx, bx, by, u * 0.0045);
      else ctx.rect(bx - u * 0.0045, by - u * 0.004, u * 0.009, u * 0.008);
    }
    ctx.fill();
  }
  // The door, and the hanging sign with a heart.
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.04, hz, u * 0.028, u * 0.06);
  ctx.fill();
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.034, hz - u * 0.03, u * 0.016, u * 0.024);
  ctx.fill();
  ctx.fillStyle = tone.awningBrown;
  ctx.fillRect(cx + hw - u * 0.002, hz - u * 0.108, u * 0.03, u * 0.003);
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  block(ctx, cx + hw + u * 0.01, hz - u * 0.105, u * 0.026, u * 0.022, u * 0.003);
  ctx.fill();
  ctx.fillStyle = tone.bonbon;
  ctx.beginPath();
  heartPath(ctx, cx + hw + u * 0.023, hz - u * 0.093, u * 0.014);
  ctx.fill();
}

/** The townhouse: a tall pink front, a cream door under a fanlight, tall windows and iron balconies, a mansard roof. */
function townhouse(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + HOUSE_X * u;
  const hz = landLine(s);
  const hw = HOUSE_HW * u;
  front(ctx, tone, cx, hw, HOUSE_H, hz, u, tone.wallPink, tone.roofPlum);
  // The mansard: a dark slope with two dormers.
  ctx.fillStyle = tone.roofPlum;
  ctx.beginPath();
  ctx.moveTo(cx - hw - u * 0.006, hz - HOUSE_H * u - u * 0.01);
  ctx.lineTo(cx - hw + u * 0.012, hz - HOUSE_H * u - u * 0.04);
  ctx.lineTo(cx + hw - u * 0.012, hz - HOUSE_H * u - u * 0.04);
  ctx.lineTo(cx + hw + u * 0.006, hz - HOUSE_H * u - u * 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.roof;
  ctx.fillRect(cx - hw + u * 0.012, hz - HOUSE_H * u - u * 0.042, hw * 2 - u * 0.024, u * 0.004);
  for (let m = -1; m <= 1; m += 2) {
    ctx.fillStyle = tone.wallPink;
    ctx.fillRect(cx + m * hw * 0.4 - u * 0.012, hz - HOUSE_H * u - u * 0.034, u * 0.024, u * 0.024);
    ctx.fillStyle = tone.windowLit;
    ctx.fillRect(cx + m * hw * 0.4 - u * 0.007, hz - HOUSE_H * u - u * 0.03, u * 0.014, u * 0.017);
  }
  // Two floors of tall windows with balconies.
  for (let floor = 0; floor < 2; floor++) {
    const y = hz - u * (0.185 - floor * 0.075);
    for (let m = -1; m <= 1; m += 2) {
      const x = cx + m * hw * 0.5;
      window(ctx, tone, x - u * 0.016, y, u * 0.032, u * 0.05, u, tone.wallCream);
      ctx.fillStyle = tone.chair;
      ctx.fillRect(x - u * 0.024, y + u * 0.046, u * 0.048, u * 0.004);
      for (let k = -3; k <= 3; k++) ctx.fillRect(x + k * u * 0.007 - u * 0.0008, y + u * 0.032, u * 0.0016, u * 0.016);
      ctx.fillRect(x - u * 0.024, y + u * 0.03, u * 0.048, u * 0.0025);
    }
  }
  // The door: cream, under a fanlight, up two steps.
  ctx.fillStyle = tone.wallCream;
  ctx.beginPath();
  archPath(ctx, cx - u * 0.024, hz, u * 0.048, u * 0.07);
  ctx.fill();
  ctx.fillStyle = tone.door;
  ctx.fillRect(cx - u * 0.018, hz - u * 0.052, u * 0.036, u * 0.052);
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.017, hz - u * 0.053);
  ctx.arc(cx, hz - u * 0.053, u * 0.017, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stone;
  ctx.fillRect(cx - u * 0.03, hz - u * 0.006, u * 0.06, u * 0.006);
  ctx.fillStyle = tone.tulipY;
  ctx.beginPath();
  circle(ctx, cx + u * 0.011, hz - u * 0.026, u * 0.0025);
  ctx.fill();
}

/** The café: a peach front, a red-and-white awning over a big window and the door, a sign, two little bay trees, the terrace. */
function cafe(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + CAFE_X * u;
  const hz = landLine(s);
  const hw = CAFE_HW * u;
  front(ctx, tone, cx, hw, CAFE_H, hz, u, tone.wallPeach, tone.roof);
  for (let m = -1; m <= 1; m += 2) window(ctx, tone, cx + m * hw * 0.48 - u * 0.015, hz - u * 0.148, u * 0.03, u * 0.036, u, tone.awningStripe);
  // The sign board: a cream board with a heart and a cup.
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  block(ctx, cx - u * 0.032, hz - u * 0.142, u * 0.064, u * 0.024, u * 0.003);
  ctx.fill();
  ctx.fillStyle = tone.awningRed;
  ctx.beginPath();
  heartPath(ctx, cx - u * 0.012, hz - u * 0.13, u * 0.014);
  ctx.rect(cx + u * 0.004, hz - u * 0.136, u * 0.014, u * 0.011);
  ctx.fill();
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  ctx.rect(cx + u * 0.007, hz - u * 0.134, u * 0.008, u * 0.006);
  ctx.fill();
  awning(ctx, cx - hw - u * 0.006, cx + hw + u * 0.006, hz - u * 0.1, u * 0.024, tone.awningRed, tone.awningStripe, u);
  // The big window with its café curtain, and the door.
  const wx = cx - hw + u * 0.012;
  window(ctx, tone, wx, hz - u * 0.078, hw * 2 - u * 0.066, u * 0.062, u, tone.awningStripe);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(wx + u * 0.002, hz - u * 0.044, hw * 2 - u * 0.07, u * 0.026);
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.044, hz, u * 0.032, u * 0.072);
  ctx.fill();
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.037, hz - u * 0.034, u * 0.018, u * 0.03);
  ctx.fill();
  // Bay trees in pots flanking the door.
  ctx.fillStyle = tone.awningBrown;
  ctx.fillRect(cx + hw - u * 0.056, hz - u * 0.014, u * 0.01, u * 0.014);
  ctx.fillRect(cx + hw - u * 0.008, hz - u * 0.014, u * 0.01, u * 0.014);
  ctx.fillStyle = tone.leaf;
  ctx.beginPath();
  circle(ctx, cx + hw - u * 0.051, hz - u * 0.026, u * 0.009);
  circle(ctx, cx + hw - u * 0.003, hz - u * 0.026, u * 0.009);
  ctx.fill();
  couple(ctx, s, tone);
}

/** Where the strings of lights hang from, X (u from center) and height above the horizon, and the bulbs' three colors by turns. */
const HOOKS = [
  [CHOC_X - CHOC_HW, CHOC_H + 0.03],
  [HOUSE_X - HOUSE_HW, HOUSE_H + 0.03],
  [HOUSE_X + HOUSE_HW, HOUSE_H + 0.03],
  [STALL_X + STALL_HW + 0.008, 0.19],
  [CAFE_X + CAFE_HW, CAFE_H + 0.03],
  [LAMP_X - 0.004, LAMP_H - 0.008],
] as const;

/** The lamp post: a slim iron post on a stepped foot, a lantern with cream glass (lit at dusk) under a pointed cap. */
export function lamp(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + LAMP_X * u;
  const hz = landLine(s);
  const top = hz - LAMP_H * u;
  ctx.fillStyle = tone.chair;
  ctx.beginPath();
  ctx.rect(x - u * 0.012, hz - u * 0.01, u * 0.024, u * 0.01);
  ctx.rect(x - u * 0.008, hz - u * 0.022, u * 0.016, u * 0.013);
  ctx.rect(x - u * 0.0035, top + LANTERN_H * u, u * 0.007, hz - u * 0.022 - top - LANTERN_H * u);
  // The cap and the lantern's dark frame.
  ctx.moveTo(x - LANTERN_HW * u * 1.2, top + u * 0.004);
  ctx.lineTo(x, top - u * 0.012);
  ctx.lineTo(x + LANTERN_HW * u * 1.2, top + u * 0.004);
  ctx.closePath();
  ctx.rect(x - LANTERN_HW * u, top, LANTERN_HW * 2 * u, LANTERN_H * u);
  ctx.fill();
  ctx.fillStyle = tone.windowLit;
  ctx.fillRect(x - LANTERN_HW * u + u * 0.003, top + u * 0.003, LANTERN_HW * 2 * u - u * 0.006, LANTERN_H * u - u * 0.006);
  ctx.fillStyle = tone.tulipY;
  ctx.beginPath();
  circle(ctx, x, top - u * 0.014, u * 0.004);
  ctx.fill();
}

/** Strings of bulbs sagging from front to front along the row, lit at dusk. */
function stringLights(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  ctx.strokeStyle = tone.wire;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.beginPath();
  for (let i = 0; i < HOOKS.length - 1; i++) {
    const [x0, h0] = HOOKS[i]!;
    const [x1, h1] = HOOKS[i + 1]!;
    ctx.moveTo(cx + x0 * u, hz - h0 * u);
    ctx.quadraticCurveTo(cx + ((x0 + x1) / 2) * u, hz - ((h0 + h1) / 2 - 0.05) * u, cx + x1 * u, hz - h1 * u);
  }
  ctx.stroke();
  const colors = [tone.bulb, tone.bulbPink, tone.bulbCream];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = 0; i < HOOKS.length - 1; i++) {
      const [x0, h0] = HOOKS[i]!;
      const [x1, h1] = HOOKS[i + 1]!;
      const n = Math.round(((x1 - x0) * u) / (u * 0.02));
      for (let k = 1; k < n; k++) {
        if ((k + i) % 3 !== c) continue;
        const q = k / n;
        // A point on the quadratic curve, a bulb's length below the wire.
        const mx = (x0 + x1) / 2;
        const mh = (h0 + h1) / 2 - 0.05;
        const px = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1;
        const ph = (1 - q) * (1 - q) * h0 + 2 * (1 - q) * q * mh + q * q * h1;
        circle(ctx, cx + px * u, hz - ph * u + u * 0.006, u * 0.004);
      }
    }
    ctx.fill();
  }
}

/** The pavement the shops stand on, from the horizon down to the canal and the lawn. */
export const PAVE_DEPTH = 0.05;

/** The shops left to right, the lamp post, and the lights strung between them. */
export function shops(ctx: Ctx, s: Scene, tone: Tone): void {
  chocolateShop(ctx, s, tone);
  townhouse(ctx, s, tone);
  flowerStall(ctx, s, tone);
  cafe(ctx, s, tone);
  lamp(ctx, s, tone);
  stringLights(ctx, s, tone);
}

/** The boulevard: its pavement right across, then the shops. */
export function boulevard(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const hz = landLine(s);
  ctx.fillStyle = tone.pave;
  ctx.fillRect(0, hz - 1, s.cssW, PAVE_DEPTH * u + 1);
  ctx.fillStyle = tone.pave2;
  ctx.fillRect(0, hz + PAVE_DEPTH * u - u * 0.008, s.cssW, u * 0.008);
  shops(ctx, s, tone);
}

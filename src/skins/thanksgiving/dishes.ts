import { type Ctx } from "../../base/draw";
import { INK, tone } from "./colors";
import { C, cel, flat, L, len, line, M, O, Q, S } from "./pen";

// The supper's dishes, in the current pen's local units (u at the tower's depth; y up is
// negative), each at its base point: plates and cups, the roast turkey on its platter, a lattice
// apple pie, a cream pitcher of milk, and the stacks the family carries them in. Shared by the
// table and by the hands that carry them.

const CHINA = "#ffffff";
const RIM = "#5f8fd6";
const MUG = tone("#fff1d6", 0.5, 0.16);
const DISH = tone("#b9c6d8", 0.4, 0.2);
const CRUST = tone("#f0b552", 0.35, 0.22);
const FILLING = "#f7cf6a";
const ROAST = tone("#cf7a32", 0.38, 0.26);
const FRILL = "#ffffff";
const PARSLEY = "#5aa84a";
const BERRY = "#e2443a";
const TRAY = tone("#b9814c");
const STEAM = "rgba(255, 255, 255, 0.85)";
const FOOD = ["#e8b47e", "#f08a2e", "#6fae55"] as const;

const PLATE_RX = 0.0115;
const PLATE_RY = 0.0037;
const PLATE_H = 0.0017;
const CUP_W = 0.0072;
const CUP_H = 0.0082;

/** Where each part of a helping sits on its plate, and its size: dx, dy, rx, ry. */
const HELPING = [
  [-0.0042, -0.001, 0.0036, 0.0022],
  [0.0028, -0.0012, 0.0032, 0.0024],
  [0.0002, 0.0012, 0.0034, 0.0013],
] as const;

/**
 * The plates lying on the table, all at once (the china, the rims, then each part of the
 * helpings across them all, so a dozen plates cost a handful of fills): plate i at xs[i], ys[i]
 * if on[i], with food[i] on it (0 none .. 1 a full helping: turkey, sweet potato, green beans,
 * getting smaller as it is eaten).
 */
export function plates(ctx: Ctx, xs: readonly number[], ys: readonly number[], on: readonly boolean[], food: readonly number[], thin: number): void {
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) if (on[i]) O(ctx, xs[i]!, ys[i]!, PLATE_RX, PLATE_RY);
  flat(ctx, CHINA, thin);
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) if (on[i]) O(ctx, xs[i]!, ys[i]!, PLATE_RX * 0.68, PLATE_RY * 0.62);
  line(ctx, RIM, thin * 0.7);
  for (let c = 0; c < HELPING.length; c++) {
    const [dx, dy, rx, ry] = HELPING[c]!;
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < xs.length; i++) {
      if (!on[i] || food[i]! <= 0) continue;
      const k = 0.45 + 0.55 * food[i]!;
      O(ctx, xs[i]! + dx, ys[i]! + dy, rx * k, ry * k);
      any = true;
    }
    if (!any) continue;
    ctx.fillStyle = FOOD[c]!;
    ctx.fill();
  }
}

/** The cups standing on the table, all at once: cup i at xs[i], ys[i] if on[i]. */
export function cups(ctx: Ctx, xs: readonly number[], ys: readonly number[], on: readonly boolean[], thin: number): void {
  ctx.beginPath();
  let any = false;
  for (let i = 0; i < xs.length; i++) {
    if (!on[i]) continue;
    handlePath(ctx, xs[i]!, ys[i]!, CUP_H);
    any = true;
  }
  if (!any) return;
  line(ctx, INK, len(0.0018) + thin * 2);
  line(ctx, MUG.base, len(0.0018));
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) if (on[i]) bodyPath(ctx, xs[i]!, ys[i]!, CUP_H);
  flat(ctx, MUG.base, thin);
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) if (on[i]) rimPath(ctx, xs[i]!, ys[i]!, CUP_H);
  line(ctx, RIM, len(0.0014));
}

function handlePath(ctx: Ctx, x: number, y: number, h: number): void {
  M(ctx, x + CUP_W * 0.5, y - h * 0.75);
  Q(ctx, x + CUP_W * 1.15, y - h * 0.6, x + CUP_W * 0.5, y - h * 0.25);
}

function bodyPath(ctx: Ctx, x: number, y: number, h: number): void {
  M(ctx, x - CUP_W * 0.5, y - h);
  S(ctx, x - CUP_W * 0.45, y);
  Q(ctx, x, y + 0.0012, x + CUP_W * 0.45, y);
  S(ctx, x + CUP_W * 0.5, y - h);
  ctx.closePath();
}

function rimPath(ctx: Ctx, x: number, y: number, h: number): void {
  M(ctx, x - CUP_W * 0.48, y - h * 0.62);
  S(ctx, x + CUP_W * 0.48, y - h * 0.62);
}

/** A cup standing on its base at (x, y), `h` tall. (Flat: at a cup's size a cel band would hardly show.) */
function cup(ctx: Ctx, x: number, y: number, thin: number, h = CUP_H): void {
  ctx.beginPath();
  handlePath(ctx, x, y, h);
  line(ctx, INK, len(0.0018) + thin * 2);
  line(ctx, MUG.base, len(0.0018));
  ctx.beginPath();
  bodyPath(ctx, x, y, h);
  flat(ctx, MUG.base, thin);
  ctx.beginPath();
  rimPath(ctx, x, y, h);
  line(ctx, RIM, len(0.0014));
}

/** A stack of n plates. */
function plateStack(ctx: Ctx, x: number, y: number, n: number, thin: number): void {
  const top = y - n * PLATE_H;
  ctx.beginPath();
  M(ctx, x - PLATE_RX, top);
  S(ctx, x - PLATE_RX * 0.96, y);
  Q(ctx, x, y + PLATE_RY * 1.4, x + PLATE_RX * 0.96, y);
  S(ctx, x + PLATE_RX, top);
  ctx.closePath();
  flat(ctx, CHINA, thin);
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const yy = y - i * PLATE_H;
    M(ctx, x - PLATE_RX * 0.98, yy);
    Q(ctx, x, yy + PLATE_RY * 1.2, x + PLATE_RX * 0.98, yy);
  }
  line(ctx, RIM, thin * 0.6);
  ctx.beginPath();
  O(ctx, x, top, PLATE_RX, PLATE_RY);
  flat(ctx, CHINA, thin);
}

/** The girl's stack: n plates with up to two cups standing on the top one. */
export function dishStack(ctx: Ctx, x: number, y: number, n: number, onTop: number, thin: number): void {
  plateStack(ctx, x, y, n, thin);
  const top = y - n * PLATE_H + 0.0006;
  for (let k = 0; k < onTop; k++) cup(ctx, x + (onTop > 1 ? (k - 0.5) * CUP_W * 1.25 : 0) - 0.001, top, thin, CUP_H * 0.9);
}

/** The boy's little wooden tray: n cups (back row first) and the milk jug. */
export function cupTray(ctx: Ctx, x: number, y: number, n: number, jug: boolean, thin: number): void {
  ctx.beginPath();
  M(ctx, x - 0.017, y - 0.004);
  S(ctx, x + 0.017, y - 0.004);
  S(ctx, x + 0.015, y);
  S(ctx, x - 0.015, y);
  ctx.closePath();
  cel(ctx, TRAY, y - 0.004, y, thin, 0.3, 0.3);
  // The jug at the back right, two cups beside it, two in front.
  if (jug) pitcher(ctx, x + 0.009, y - 0.0042, thin, 0.6);
  for (let i = 0; i < n; i++) {
    const back = i < 2;
    const cx = back ? x - 0.011 + i * 0.0085 : x - 0.007 + (i - 2) * 0.0095;
    cup(ctx, cx, y - (back ? 0.0042 : 0.0026), thin, CUP_H * 0.9);
  }
}

/** The roast turkey on its platter, with steam rising (`steam` = seconds, or NaN for none). */
export function turkeyPlatter(ctx: Ctx, x: number, y: number, thin: number, steam: number): void {
  ctx.beginPath();
  O(ctx, x, y - 0.0025, 0.03, 0.0085);
  flat(ctx, CHINA, thin);
  ctx.beginPath();
  O(ctx, x, y - 0.0025, 0.024, 0.0058);
  line(ctx, RIM, thin * 0.7);
  // Parsley and cranberries round the bird.
  ctx.beginPath();
  for (const [dx, dy] of GARNISH) C(ctx, x + dx, y + dy, 0.0026);
  ctx.fillStyle = PARSLEY;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy] of BERRIES) C(ctx, x + dx, y + dy, 0.0017);
  ctx.fillStyle = BERRY;
  ctx.fill();
  // Drumsticks with paper frills, then the body over them.
  ctx.beginPath();
  O(ctx, x - 0.0145, y - 0.0085, 0.0085, 0.0052, 0.45);
  O(ctx, x + 0.0145, y - 0.0085, 0.0085, 0.0052, -0.45);
  cel(ctx, ROAST, y - 0.014, y - 0.003, thin, 0.25, 0.3);
  ctx.beginPath();
  C(ctx, x - 0.022, y - 0.0048, 0.0028);
  C(ctx, x + 0.022, y - 0.0048, 0.0028);
  flat(ctx, FRILL, thin * 0.8);
  ctx.beginPath();
  O(ctx, x, y - 0.0125, 0.0165, 0.0105);
  cel(ctx, ROAST, y - 0.023, y - 0.002, thin, 0.3, 0.28);
  ctx.beginPath();
  O(ctx, x - 0.004, y - 0.0175, 0.0055, 0.0025, -0.2);
  ctx.fillStyle = ROAST.light;
  ctx.fill();
  if (!Number.isNaN(steam)) wisps(ctx, x, y - 0.024, steam, thin);
}

const GARNISH = [
  [-0.024, -0.004],
  [0.025, -0.0035],
  [-0.008, 0.0015],
  [0.011, 0.0018],
] as const;
const BERRIES = [
  [-0.02, 0.0012],
  [0.019, 0.0012],
  [0.002, 0.0028],
] as const;

/** A lattice apple pie in its dish; `slice` takes a slice out of the front. */
export function pie(ctx: Ctx, x: number, y: number, thin: number, slice: boolean, steam: number): void {
  ctx.beginPath();
  O(ctx, x, y - 0.003, 0.021, 0.0072);
  cel(ctx, DISH, y - 0.0102, y + 0.0042, thin, 0.3, 0.3);
  ctx.beginPath();
  O(ctx, x, y - 0.0052, 0.0178, 0.0056);
  cel(ctx, CRUST, y - 0.0108, y + 0.0004, thin, 0.3, 0.25);
  ctx.beginPath();
  for (const d of LATTICE) {
    M(ctx, x + d - 0.004, y - 0.0094);
    S(ctx, x + d + 0.004, y - 0.0012);
    M(ctx, x + d + 0.004, y - 0.0094);
    S(ctx, x + d - 0.004, y - 0.0012);
  }
  line(ctx, CRUST.shade, thin);
  if (slice) {
    // The gap where a slice was: the filling's cut face and the empty dish.
    ctx.beginPath();
    M(ctx, x + 0.001, y - 0.0052);
    L(ctx, x + 0.015, y - 0.0022);
    Q(ctx, x + 0.009, y + 0.0006, x + 0.002, y + 0.0004);
    ctx.closePath();
    flat(ctx, DISH.light, thin);
    ctx.beginPath();
    M(ctx, x + 0.001, y - 0.0052);
    S(ctx, x + 0.001, y - 0.0025);
    S(ctx, x + 0.0142, y);
    S(ctx, x + 0.015, y - 0.0022);
    ctx.closePath();
    flat(ctx, FILLING, thin * 0.8);
  }
  if (!Number.isNaN(steam)) wisps(ctx, x + 0.002, y - 0.011, steam, thin);
}

const LATTICE = [-0.008, 0, 0.008] as const;

/** A cream pitcher of milk with a blue band, a spout to the left and a handle to the right; `k` scales it. */
export function pitcher(ctx: Ctx, x: number, y: number, thin: number, k = 1): void {
  ctx.beginPath();
  M(ctx, x + 0.0075 * k, y - 0.023 * k);
  Q(ctx, x + 0.017 * k, y - 0.02 * k, x + 0.0085 * k, y - 0.008 * k);
  line(ctx, INK, len(0.0028 * k) + thin * 2);
  line(ctx, MUG.base, len(0.0028 * k));
  ctx.beginPath();
  M(ctx, x - 0.007 * k, y);
  Q(ctx, x - 0.013 * k, y - 0.013 * k, x - 0.0065 * k, y - 0.023 * k);
  L(ctx, x - 0.0105 * k, y - 0.0275 * k);
  L(ctx, x + 0.0068 * k, y - 0.0262 * k);
  Q(ctx, x + 0.0125 * k, y - 0.013 * k, x + 0.0072 * k, y);
  Q(ctx, x, y + 0.0014 * k, x - 0.007 * k, y);
  ctx.closePath();
  cel(ctx, MUG, y - 0.0275 * k, y, thin, 0.22, 0.25);
  ctx.beginPath();
  M(ctx, x - 0.0102 * k, y - 0.012 * k);
  Q(ctx, x, y - 0.0105 * k, x + 0.0102 * k, y - 0.012 * k);
  line(ctx, RIM, len(0.0026 * k));
}

const STEAM_T = 2.5;
const WISPS = [
  [-0.005, 0],
  [0.006, 0.45],
] as const;

/** Wisps of steam curling up off something warm, each rising and fading in turn. */
function wisps(ctx: Ctx, x: number, y: number, t: number, thin: number): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = STEAM;
  ctx.lineWidth = Math.max(1.1, thin * 1.1);
  for (const [wx, ph] of WISPS) {
    const k = (t / STEAM_T + ph) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    const y0 = y - k * 0.008;
    ctx.beginPath();
    M(ctx, x + wx, y0);
    Q(ctx, x + wx - 0.005, y0 - 0.005, x + wx, y0 - 0.01);
    Q(ctx, x + wx + 0.005, y0 - 0.015, x + wx, y0 - 0.02);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

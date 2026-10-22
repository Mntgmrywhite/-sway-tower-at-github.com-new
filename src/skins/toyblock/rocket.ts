import { circle, mix, type Ctx } from "../../base/draw";
import { block } from "./shapes";
import { smooth, type FarToy, type Tone } from "./tone";

// The toy rocket: one rocket wherever it flies. It stands on its launch pad beside the launch
// tower, corkscrews up into its cloud and comes back down onto its pad (launch.ts), and it is the
// rocket that roars up the right lane among the stars at night (toys.ts): the same body, colors,
// fins, windows and flame, so the rocket you meet at height is the one you saw blast off. Also
// the smoke and the sparks both of them leave behind: round puffs of cloud, drawn in batches, and
// little comets of fire.

/** How squat the launch pad and all on it are drawn: the rocket too, wherever it flies. */
export const PAD_SQUASH = 0.95;

/** Half the rocket's width (u at full size: the rocket on its pad). */
export const ROCKET_HW = 0.027;
/** Nozzle to nose tip (u at full size). */
export const ROCKET_LEN = 0.36;
/** Its fins' reach out from its sides (u at full size). */
export const FIN = 0.024;
/** Its flame's length below the nozzle as it stands lit on its pad (u at full size). */
export const FLAME = 0.09;

// ---------------------------------------------------------------- its landing legs

/**
 * Its landing legs, two telescoping struts hinged on its sides LEG_HINGE above the nozzle, LEG
 * long when out (u at full size): they slide out of their hinges pointing up along the body
 * (fully out of them by LEG_GROW of the way), swing out and down through LEG_OUT radians (from
 * pointing straight up), lengthening, until their feet stand LEG_DROP below the nozzle, so it
 * lands on them, standing that much higher than on its fins; folding away, they go back into
 * their hinges, so they never pop in or out. Short as they swing past level, they never reach
 * out toward the tower's column.
 */
export const LEG_HINGE = 0.03;
const LEG = 0.06;
export const LEG_DROP = 0.022;
export const LEG_OUT = Math.acos(-(LEG_HINGE + LEG_DROP) / LEG);
const LEG_GROW = 0.3;

/** How far a leg has slid out of its hinge `d` of the way out (0 none of it, 1 all). */
function legGrown(d: number): number {
  return smooth(0, LEG_GROW, d);
}

/** A leg's length `d` of the way out (u at full size). */
export function legLength(d: number): number {
  return LEG * (0.5 + 0.5 * d) * legGrown(d);
}

// ---------------------------------------------------------------- its paint

/**
 * What the rocket is painted in: a cream body, a red nose, fins and band, blue windows and legs,
 * yellow feet, an orange flame with a yellow heart. The same paint everywhere, as the light of the
 * hour shows it at the rocket's depth.
 */
export interface RocketPaint {
  red: FarToy;
  yellow: FarToy;
  blue: FarToy;
  cream: FarToy;
  fire: string;
  heart: string;
  /**
   * Its smoke (shade, body, lit caps): the clouds' colors, and after dusk paler than the clouds
   * round it, lit by its flame; `hot` the smoke still in the flame's light, warmer.
   */
  smoke: readonly [string, string, string];
  hot: readonly [string, string, string];
}

/** The engine's fire, wherever the rocket is: its flame (an orange teardrop, a yellow heart) and its sparks (an orange-red comet, a yellow-hot core). */
export interface Flames {
  fire: string;
  heart: string;
  spark: string;
  core: string;
}

const FLAMES = new WeakMap<Tone, Flames>();

/**
 * The fire's colors in a light (tone): the toys' orange and yellow, made brighter, as fire is,
 * and glowing like the toys' lamps after dusk. Built once per light.
 */
export function flameColors(tone: Tone): Flames {
  let f = FLAMES.get(tone);
  if (!f) {
    const glow = 0.5 + 0.5 * tone.lamps;
    f = {
      fire: mix(tone.toys[4].body, "#ff8d2e", glow),
      heart: mix(tone.toys[1].light, "#ffe874", glow),
      spark: mix(tone.toys[4].shade, "#ff5a1e", glow),
      core: mix(tone.toys[1].light, "#ffe94d", glow),
    };
    FLAMES.set(tone, f);
  }
  return f;
}

const LAND_PAINT = new WeakMap<Tone, RocketPaint>();

/** The rocket at the land's depth, on its pad and on its round trip: the land's faded toy colors. Built once per light. */
export function landPaint(tone: Tone): RocketPaint {
  let p = LAND_PAINT.get(tone);
  if (!p) {
    const [red, yellow, blue] = tone.land;
    const { fire, heart } = flameColors(tone);
    const smoke = [tone.cloudShade, tone.cloud, tone.cloudLight] as const;
    p = { red, yellow, blue, cream: tone.landCream, fire, heart, smoke, hot: smoke };
    LAND_PAINT.set(tone, p);
  }
  return p;
}

const SKY_PAINT = new WeakMap<Tone, RocketPaint>();

/**
 * The rocket up the sky lanes: the lanes' toy colors (a little closer than the land, so moonlit
 * at night, as every toy up there), its smoke lit by its flame after dusk. Built once per light
 * (tone).
 */
export function skyPaint(tone: Tone): RocketPaint {
  let p = SKY_PAINT.get(tone);
  if (!p) {
    const [red, yellow, blue] = tone.toys;
    const lit = tone.lamps;
    const { fire, heart } = flameColors(tone);
    const smoke = [mix(tone.cloudShade, tone.cloud, lit), mix(tone.cloud, tone.cloudLight, lit), mix(tone.cloudLight, "#dfe4ff", 0.5 * lit)] as const;
    p = {
      red,
      yellow,
      blue,
      cream: tone.cream,
      fire,
      heart,
      smoke,
      hot: [mix(smoke[1], fire, 0.45 * lit), mix(smoke[2], heart, 0.5 * lit), mix(smoke[2], "#fffaf0", 0.7 * lit)],
    };
    SKY_PAINT.set(tone, p);
  }
  return p;
}

// ---------------------------------------------------------------- the rocket

function fill(ctx: Ctx, c: string): void {
  ctx.fillStyle = c;
  ctx.fill();
}

/** Its flame in its own frame (as rocketShape): an orange teardrop `flame` px long with a yellow heart. */
function flameShape(ctx: Ctx, u: number, paint: RocketPaint, flame: number): void {
  const hw = ROCKET_HW * u;
  ctx.beginPath();
  ctx.moveTo(-hw * 0.62, -u * 0.004);
  ctx.quadraticCurveTo(-hw * 0.62, flame * 0.62, 0, flame);
  ctx.quadraticCurveTo(hw * 0.62, flame * 0.62, hw * 0.62, -u * 0.004);
  ctx.closePath();
  fill(ctx, paint.fire);
  ctx.beginPath();
  ctx.moveTo(-hw * 0.34, -u * 0.004);
  ctx.quadraticCurveTo(-hw * 0.3, flame * 0.42, 0, flame * 0.66);
  ctx.quadraticCurveTo(hw * 0.3, flame * 0.42, hw * 0.34, -u * 0.004);
  ctx.closePath();
  fill(ctx, paint.heart);
}

/**
 * The toy rocket in its own frame: its nozzle's center at the origin, up is -y, `u` px to the u
 * of its full size; with `flame` (px) a flame below the nozzle and its landing legs `legs` of the
 * way out (0: folded away, not drawn). A cream body (shaded right side) with a red nose, fins and
 * band and two round windows; blue legs with yellow feet.
 */
function rocketShape(ctx: Ctx, u: number, paint: RocketPaint, flame: number, legs: number): void {
  const { red, yellow, blue, cream } = paint;
  const hw = ROCKET_HW * u;
  if (flame > 0) flameShape(ctx, u, paint, flame);
  // Fins.
  ctx.beginPath();
  ctx.moveTo(-hw, -0.085 * u);
  ctx.lineTo(-hw - FIN * u, 0);
  ctx.lineTo(-hw, 0);
  ctx.closePath();
  ctx.moveTo(hw, -0.085 * u);
  ctx.lineTo(hw + FIN * u, 0);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  fill(ctx, red.shade);
  // Body: shade, body, band.
  ctx.beginPath();
  block(ctx, -hw, -0.265 * u, hw * 2, 0.265 * u, hw * 0.5);
  fill(ctx, cream.shade);
  ctx.beginPath();
  block(ctx, -hw, -0.265 * u, hw * 1.45, 0.265 * u, hw * 0.5);
  fill(ctx, cream.body);
  ctx.fillStyle = red.body;
  ctx.fillRect(-hw, -0.065 * u, hw * 2, 0.014 * u);
  // Nose cone.
  ctx.beginPath();
  ctx.moveTo(-hw, -0.255 * u);
  ctx.quadraticCurveTo(-hw * 0.9, -0.335 * u, 0, -ROCKET_LEN * u);
  ctx.quadraticCurveTo(hw * 0.9, -0.335 * u, hw, -0.255 * u);
  ctx.closePath();
  fill(ctx, red.body);
  // Windows.
  ctx.beginPath();
  circle(ctx, 0, -0.2 * u, u * 0.012);
  circle(ctx, 0, -0.145 * u, u * 0.01);
  fill(ctx, blue.light);
  if (legs > 0.01) {
    // The landing legs, in front of the fins: struts sliding out of the body's sides and swinging
    // out and down, a round foot on each (all of it thinner while it is still in its hinge).
    const grown = legGrown(legs);
    const a = legs * LEG_OUT;
    const len = legLength(legs) * u;
    const fx = hw + Math.sin(a) * len;
    const fy = -LEG_HINGE * u - Math.cos(a) * len;
    ctx.strokeStyle = blue.shade;
    ctx.lineWidth = u * 0.009 * grown;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-hw, -LEG_HINGE * u);
    ctx.lineTo(-fx, fy);
    ctx.moveTo(hw, -LEG_HINGE * u);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath();
    circle(ctx, -fx, fy, u * 0.0075 * grown);
    circle(ctx, fx, fy, u * 0.0075 * grown);
    fill(ctx, yellow.body);
  }
}

/**
 * The toy rocket, its nozzle at (x, y) px, `u` px to the u of its full size, leaning `lean`
 * radians clockwise, standing `squash` of its height (1 at rest; less as it bounces on its legs),
 * with its flame `flame` (u at full size, 0 when off) and its legs `legs` of the way out. Squat
 * as the pad and all on it are drawn (PAD_SQUASH), wherever it is.
 */
export function toyRocket(ctx: Ctx, paint: RocketPaint, x: number, y: number, u: number, lean: number, squash: number, flame: number, legs: number): void {
  ctx.save();
  ctx.translate(x, y);
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(1, PAD_SQUASH * squash);
  rocketShape(ctx, u, paint, flame * u, legs);
  ctx.restore();
}

/** Only the toy rocket's flame, just where toyRocket (with the same arguments) draws it: so it can blaze through smoke drawn over the rocket. */
export function toyRocketFlame(ctx: Ctx, paint: RocketPaint, x: number, y: number, u: number, lean: number, squash: number, flame: number): void {
  if (flame <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(1, PAD_SQUASH * squash);
  flameShape(ctx, u, paint, flame * u);
  ctx.restore();
}

// ---------------------------------------------------------------- its smoke

/** A batch of smoke puffs to draw (x, y, r in px), so a frame allocates nothing. */
export interface Batch {
  n: number;
  x: Float64Array;
  y: Float64Array;
  r: Float64Array;
}

export function batch(size: number): Batch {
  return { n: 0, x: new Float64Array(size), y: new Float64Array(size), r: new Float64Array(size) };
}

export function add(b: Batch, x: number, y: number, r: number): void {
  if (b.n >= b.x.length) return;
  b.x[b.n] = x;
  b.y[b.n] = y;
  b.r[b.n] = r;
  b.n++;
}

/** A batch of puffs as one soft cloud: all the shaded undersides, then the bodies, then the lit caps. Three fills. */
export function puffs(ctx: Ctx, b: Batch, shade: string, body: string, light: string): void {
  if (b.n === 0) return;
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) circle(ctx, b.x[i]!, b.y[i]!, b.r[i]!);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    const r = b.r[i]!;
    circle(ctx, b.x[i]! - r * 0.07, b.y[i]! - r * 0.1, r * 0.86);
  }
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    const r = b.r[i]!;
    circle(ctx, b.x[i]! - r * 0.3, b.y[i]! - r * 0.36, r * 0.34);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- its sparks

/** A batch of sparks to draw: each a head (x, y), the streak it leaves behind it (dx, dy) and its head's radius (px). */
export interface Sparks {
  n: number;
  x: Float64Array;
  y: Float64Array;
  dx: Float64Array;
  dy: Float64Array;
  r: Float64Array;
}

export function sparkBatch(size: number): Sparks {
  return { n: 0, x: new Float64Array(size), y: new Float64Array(size), dx: new Float64Array(size), dy: new Float64Array(size), r: new Float64Array(size) };
}

export function addSpark(b: Sparks, x: number, y: number, dx: number, dy: number, r: number): void {
  if (b.n >= b.x.length) return;
  b.x[b.n] = x;
  b.y[b.n] = y;
  b.dx[b.n] = dx;
  b.dy[b.n] = dy;
  b.r[b.n] = r;
  b.n++;
}

/** A spark as its own subpath: a little comet, its head at (x, y) r wide, its tail tapering to (x - dx, y - dy). */
function comet(ctx: Ctx, x: number, y: number, dx: number, dy: number, r: number): void {
  const len = Math.hypot(dx, dy);
  if (len < r) {
    circle(ctx, x, y, r);
    return;
  }
  // Along the flight and across it, r long.
  const ax = (dx / len) * r;
  const ay = (dy / len) * r;
  ctx.moveTo(x + ax, y + ay);
  ctx.quadraticCurveTo(x + ax - ay, y + ay + ax, x - ay, y + ax);
  ctx.lineTo(x - dx, y - dy);
  ctx.lineTo(x + ay, y - ax);
  ctx.quadraticCurveTo(x + ax + ay, y + ay - ax, x + ax, y + ay);
  ctx.closePath();
}

/** A batch of sparks: orange comets with yellow-white hearts. Two fills. */
export function sparks(ctx: Ctx, b: Sparks, fire: string, heart: string): void {
  if (b.n === 0) return;
  ctx.fillStyle = fire;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) comet(ctx, b.x[i]!, b.y[i]!, b.dx[i]!, b.dy[i]!, b.r[i]!);
  ctx.fill();
  ctx.fillStyle = heart;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) comet(ctx, b.x[i]!, b.y[i]!, b.dx[i]! * 0.55, b.dy[i]! * 0.55, b.r[i]! * 0.5);
  ctx.fill();
}

import { circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { clamp01, GOLD, GOLD_DEEP, GOLD_LIGHT, INK, IVORY, TAU, TOWER } from "./colors";
import { marquee, songMidnight } from "./marquee";
import { cloudCover, raiseProfile, sideOf } from "./skyline";

// Manhattan's hero towers: five big Art Deco skyscrapers of our own design, black lacquer
// rimmed in gold, with grids of lit gold windows and gilded crowns — readable at phone size.
// Left of the tower column, the Sunburst: three setbacks under a gold fan crown and a needle
// spire. Right of it, the Times Tower: a clock face counting down to midnight and the New
// Year's ball sliding down its mast as you climb (at the top of the sky it is midnight and the
// gilding flashes), and a marquee above the clock that counts down with the song (marquee.ts). Behind the column, lower: a gilded ziggurat, a gold pyramid cap and a
// fluted tower with chevrons, kept under the cap so fireworks burst over them.
// Geometry is in u: x from each tower's center, y up from the horizon; built once at load.

interface Hero {
  /** Tower center (u from the screen center). */
  x: number;
  /** Silhouette, counter-clockwise from the bottom left: filled gold, it is the rim. */
  outline: number[];
  /** The lacquer body: the stepped tiers inset by the rim (crowns are gilded over). */
  inset: number[];
  /** Gilded parts: plain gold, lit gold, shaded gold (closed polygons). */
  gilt: number[][];
  lit: number[][];
  deep: number[][];
  /** Lit windows: bottom-left (x, y) of each. */
  win: Float32Array;
  /** Beacons on masts and finials. */
  beacons: number[];
  top: number;
  /** Half-width of the widest tier. */
  hw: number;
}

/** The gold rim around each tower (u). */
const RIM = 0.0034;
const WIN_W = 0.0085;
const WIN_H = 0.012;
const WIN_STEP = 0.021;

/** A stepped shaft: the left side up each tier, then (after `crown`) back down the right. */
function stepped(tiers: readonly (readonly [number, number])[], crown: (out: number[]) => void): number[] {
  const out: number[] = [];
  let y = 0;
  for (const [hw, top] of tiers) {
    out.push(-hw, y, -hw, top);
    y = top;
  }
  crown(out);
  for (let i = tiers.length - 1; i >= 0; i--) {
    const [hw, top] = tiers[i]!;
    out.push(hw, top, hw, i > 0 ? tiers[i - 1]![1] : 0);
  }
  return out;
}

/** The tiers inset by the rim, flat across the top tier. */
function insetTiers(tiers: readonly (readonly [number, number])[]): number[] {
  return stepped(
    tiers.map(([hw, top]) => [hw - RIM, top - RIM] as const),
    () => {},
  );
}

/** A rect as a closed polygon. */
function box(x0: number, y0: number, x1: number, y1: number): number[] {
  return [x0, y0, x0, y1, x1, y1, x1, y0];
}

/** An upward chevron band (a flat Λ) of half-width w and thickness t, its feet at y. */
function chevron(w: number, y: number, rise: number, t: number): number[] {
  return [-w, y, 0, y + rise, w, y, w, y + t, 0, y + rise + t, -w, y + t];
}

/** Window columns at the given x offsets, every WIN_STEP from y0 to y1, some dark. */
function windows(cols: readonly number[], y0: number, y1: number, seed: number, p: number, skip?: (x: number, y: number) => boolean): number[] {
  const out: number[] = [];
  for (const [c, x] of cols.entries()) {
    for (let r = 0, y = y0; y + WIN_H <= y1; r++, y += WIN_STEP) {
      if (hash(seed + c * 7.3 + r * 1.9) > p) continue;
      if (skip?.(x, y)) continue;
      out.push(x - WIN_W / 2, y);
    }
  }
  return out;
}

/** Two window columns in each bay between mullions at `mullions` (x offsets) inside ±hw. */
function bayColumns(hw: number, mullions: readonly number[], pierW: number): number[] {
  const edges = [-hw, ...mullions, hw];
  const out: number[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const a = edges[i]! + (i > 0 ? pierW / 2 : 0);
    const b = edges[i + 1]! - (i + 1 < edges.length - 1 ? pierW / 2 : 0);
    const c = (a + b) / 2;
    const gap = WIN_W * 0.65;
    out.push(c - gap, c + gap);
  }
  return out;
}

function finish(h: Omit<Hero, "top" | "hw">): Hero {
  let top = 0;
  let hw = 0;
  for (let i = 0; i < h.outline.length; i += 2) {
    hw = Math.max(hw, Math.abs(h.outline[i]!));
    top = Math.max(top, h.outline[i + 1]!);
  }
  return { ...h, top, hw };
}

/* ---------------------------------------------------------------- the Sunburst */

const SUN = { x: -0.315, tiers: [[0.062, 0.34], [0.05, 0.395], [0.037, 0.44]] as const, fanR: 0.037, needle: 0.62, needleW: 0.0065 };
const FAN_RAYS = 9;
const FAN_ARC = 3;

const sunburst: Hero = (() => {
  const [t0, t1, t2] = SUN.tiers;
  const cy = t2[1];
  const R = SUN.fanR;
  const outline = stepped(SUN.tiers, (out) => {
    // The fan crown as a half disc over the top tier, the needle rising from its crest.
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI - (i / n) * Math.PI;
      if (i === n / 2) {
        out.push(-SUN.needleW, cy + R, 0, SUN.needle, SUN.needleW, cy + R);
        continue;
      }
      out.push(Math.cos(a) * R, cy + Math.sin(a) * R);
    }
  });
  // Fan wedges, alternating gold and lit gold, around a shaded hub.
  const gilt: number[][] = [];
  const lit: number[][] = [];
  for (let r = 0; r < FAN_RAYS; r++) {
    const poly = [0, cy];
    for (let j = 0; j <= FAN_ARC; j++) {
      const a = Math.PI - ((r + j / FAN_ARC) / FAN_RAYS) * Math.PI;
      poly.push(Math.cos(a) * (R - RIM), cy + Math.sin(a) * (R - RIM));
    }
    (r % 2 ? lit : gilt).push(poly);
  }
  const hub: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    hub.push(Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32);
  }
  // Gilded cornices on every setback, and the needle in lit gold with a shaded right side.
  gilt.push(box(-t0[0], t0[1] - 0.009, t0[0], t0[1]), box(-t1[0], t1[1] - 0.008, t1[0], t1[1]), box(-t2[0], t2[1] - 0.007, t2[0], t2[1]));
  lit.push([-SUN.needleW * 0.8, cy + R * 0.95, 0, SUN.needle, 0, cy + R * 0.95]);
  const deep = [hub, [0, cy + R * 0.95, 0, SUN.needle, SUN.needleW * 0.8, cy + R * 0.95]];
  const win = [
    ...windows(bayColumns(t0[0], [-0.031, 0, 0.031], 0.01), 0.03, t0[1] - 0.012, 11, 0.56),
    ...windows([-0.033, -0.011, 0.011, 0.033], t0[1] + 0.008, t1[1] - 0.01, 12, 0.8),
    ...windows([-0.02, 0, 0.02], t1[1] + 0.008, t2[1] - 0.009, 13, 0.85),
  ];
  return finish({
    x: SUN.x,
    outline,
    inset: insetTiers(SUN.tiers),
    gilt,
    lit,
    deep,
    win: Float32Array.from(win),
    beacons: [0, SUN.needle],
  });
})();

/* ---------------------------------------------------------------- the Times Tower */

const TIMES = {
  x: 0.372,
  tiers: [[0.056, 0.36], [0.044, 0.4], [0.03, 0.43]] as const,
  mast: 0.6,
  mastW: 0.0035,
  clockY: 0.312,
  clockR: 0.03,
};
/** The ball's radius, and its run down the mast: from the top at the start to its foot. */
const BALL_R = 0.03;
const BALL_TOP = TIMES.mast - 0.012 - BALL_R;
const BALL_FOOT = TIMES.tiers[2][1] + BALL_R + 0.008;

const times: Hero = (() => {
  const [t0, t1, t2] = TIMES.tiers;
  const outline = stepped(TIMES.tiers, (out) => {
    out.push(-TIMES.mastW, t2[1], -TIMES.mastW, TIMES.mast, TIMES.mastW, TIMES.mast, TIMES.mastW, t2[1]);
  });
  const gilt = [
    box(-t0[0], t0[1] - 0.009, t0[0], t0[1]),
    box(-t1[0], t1[1] - 0.008, t1[0], t1[1]),
    box(-t2[0], t2[1] - 0.007, t2[0], t2[1]),
    chevron(t2[0] - 0.004, t1[1] + 0.003, 0.009, 0.0045),
    chevron(t1[0] - 0.005, t0[1] + 0.006, 0.014, 0.005),
  ];
  const lit = [box(-TIMES.mastW, t2[1], TIMES.mastW * 0.2, TIMES.mast)];
  const deep = [box(TIMES.mastW * 0.2, t2[1], TIMES.mastW, TIMES.mast)];
  const { clockY: cy, clockR: cr } = TIMES;
  const win = windows(bayColumns(t0[0], [-0.028, 0.028], 0.01), 0.03, t0[1] - 0.012, 21, 0.56, (x, y) => Math.abs(x) < 0.02 && y > cy - cr - 0.02);
  return finish({
    x: TIMES.x,
    outline,
    inset: insetTiers(TIMES.tiers),
    gilt,
    lit,
    deep,
    win: Float32Array.from(win),
    beacons: [],
  });
})();

/* ---------------------------------------------------------------- behind the column */

const ziggurat: Hero = (() => {
  const steps = [[0.042, 0.17], [0.034, 0.181], [0.026, 0.192], [0.018, 0.203], [0.01, 0.214]] as const;
  const ant = 0.232;
  const outline = stepped(steps, (out) => {
    out.push(-0.0025, 0.214, -0.0025, ant, 0.0025, ant, 0.0025, 0.214);
  });
  const gilt: number[][] = [];
  const lit: number[][] = [];
  for (let i = 1; i < steps.length; i++) {
    const [hw, top] = steps[i]!;
    (i % 2 ? gilt : lit).push(box(-hw, steps[i - 1]![1], hw, top));
  }
  gilt.push(box(-steps[0][0], 0.163, steps[0][0], 0.17));
  return finish({
    x: -0.148,
    outline,
    inset: insetTiers(steps),
    gilt,
    lit,
    deep: [],
    win: Float32Array.from(windows(bayColumns(0.042, [-0.014, 0.014], 0.008), 0.03, 0.155, 31, 0.6)),
    beacons: [0, ant],
  });
})();

const pyramid: Hero = (() => {
  const tiers = [[0.04, 0.18], [0.031, 0.198]] as const;
  const apex = 0.252;
  const fin = 0.268;
  const outline = stepped(tiers, (out) => {
    out.push(-0.0025, apex - 0.004, -0.0025, fin, 0.0025, fin, 0.0025, apex - 0.004);
  });
  return finish({
    x: 0.162,
    outline,
    inset: insetTiers(tiers),
    gilt: [box(-0.04, 0.173, 0.04, 0.18), box(-0.031, 0.192, 0.031, 0.198)],
    lit: [[-0.031, 0.198, 0, apex, 0, 0.198]],
    deep: [[0, 0.198, 0, apex, 0.031, 0.198]],
    win: Float32Array.from(windows(bayColumns(0.04, [-0.013, 0.013], 0.008), 0.03, 0.165, 41, 0.6)),
    beacons: [0, fin],
  });
})();

const fluted: Hero = (() => {
  const tiers = [[0.036, 0.148], [0.026, 0.166], [0.016, 0.182]] as const;
  const spire = 0.214;
  const outline = stepped(tiers, (out) => {
    out.push(-0.008, 0.182, 0, spire, 0.008, 0.182);
  });
  return finish({
    x: 0.002,
    outline,
    inset: insetTiers(tiers),
    gilt: [box(-0.036, 0.142, 0.036, 0.148), chevron(0.022, 0.15, 0.008, 0.004), chevron(0.013, 0.168, 0.006, 0.0035)],
    lit: [[-0.008, 0.182, 0, spire, 0, 0.182]],
    deep: [[0, 0.182, 0, spire, 0.008, 0.182]],
    win: Float32Array.from(windows(bayColumns(0.036, [-0.012, 0.012], 0.007), 0.03, 0.135, 51, 0.6)),
    beacons: [],
  });
})();

const HEROES: readonly Hero[] = [ziggurat, fluted, pyramid, sunburst, times];

/** Each hero's center and half-width (u): the bay mirrors their lights. */
export const HERO_SPANS: readonly (readonly [number, number])[] = HEROES.map((h) => {
  raiseProfile(h.x, h.outline);
  return [h.x, h.hw] as const;
});

/* ---------------------------------------------------------------- drawing */

const WINDOW = GOLD_LIGHT;
const BEACON = "#ff5a6e";
const BALL = mix(GOLD_LIGHT, IVORY, 0.4);
const BALL_SHADE = GOLD;
/** The ball's sunburst of rays. */
const BALL_RAYS = GOLD_LIGHT;
const RAYS = 16;
/** The ball's facet lines and the clock's hands: dark bronze, readable on ivory and gold. */
const BRONZE = mix(GOLD_DEEP, INK, 0.35);
const FACE = IVORY;
const FACE_LIT = "#fffbe8";
const MIDNIGHT_FLASH = IVORY;

/** A polygon in u at (ox, oy); points on the ground (y = 0) are raised to `floor`, the cloud
 *  bank's cover, since nothing under it ever shows. */
function poly(ctx: Ctx, pts: readonly number[], ox: number, oy: number, u: number, floor = 0): void {
  ctx.moveTo(ox + pts[0]! * u, oy - (pts[1]! || floor) * u);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i]! * u, oy - (pts[i + 1]! || floor) * u);
  ctx.closePath();
}

/** Scratch: each hero's cloud cover this frame (u over the horizon). */
const FLOOR = new Float32Array(5);

function polys(ctx: Ctx, s: Scene, pick: (h: Hero) => readonly number[][]): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY + 1;
  for (const h of HEROES) for (const p of pick(h)) poly(ctx, p, cx + h.x * u, hy, u);
}

const GILT = (h: Hero): readonly number[][] => h.gilt;
const LIT = (h: Hero): readonly number[][] => h.lit;
const DEEP = (h: Hero): readonly number[][] => h.deep;

/** 0 until the ball is nearly down, then 1: midnight. */
function midnight(s: Scene): number {
  return clamp01((altitude01(s) - 0.97) / 0.03);
}

/**
 * The five hero towers, batched by color so the whole layer is a dozen fills: gold
 * silhouettes (the rims), lacquer bodies, the ball's glow, gilding (with the clock's rim), the
 * clock face, lit windows and lit gold, shaded gold (with the clock's marks), then the ball and
 * the clock's hands. The hands close on twelve as the ball comes down the mast; at midnight
 * the gilding and the clock face flash.
 */
export function landmarks(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY + 1;
  const a = altitude01(s);
  const mid = midnight(s);
  const flash = mid > 0 && Math.sin(s.t * 7) > 0.3;
  // At the song's midnight only the clock face flashes, with the marquee: the gilding behind the
  // tower column stays still.
  const faceFlash = flash || (songMidnight(s) && Math.sin(s.t * 7) > 0.3);
  const tx = cx + TIMES.x * u;
  const clockY = hy - TIMES.clockY * u;
  const cr = TIMES.clockR * u;
  const by = hy - (BALL_TOP - a * (BALL_TOP - BALL_FOOT)) * u;
  const br = BALL_R * u;
  for (let k = 0; k < HEROES.length; k++) {
    const h = HEROES[k]!;
    const inner = h.x > 0 ? h.x - h.hw : h.x + h.hw;
    FLOOR[k] = Math.max(0, cloudCover(sideOf(s.cssW, cx + (h.x * inner > 0 ? inner : 0) * u)) - 0.006);
  }

  ctx.beginPath();
  for (let k = 0; k < HEROES.length; k++) poly(ctx, HEROES[k]!.outline, cx + HEROES[k]!.x * u, hy, u, FLOOR[k]);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < HEROES.length; k++) poly(ctx, HEROES[k]!.inset, cx + HEROES[k]!.x * u, hy, u, FLOOR[k]);
  ctx.fillStyle = TOWER;
  ctx.fill();

  // The ball's radiance: a slowly turning Deco sunburst of thin gold rays behind it (and behind
  // the mast), longer at midnight
  ctx.beginPath();
  const reach = br * (1.85 + 0.12 * Math.sin(s.t * 2.4) + mid * 0.6);
  const spin = s.t * 0.25;
  for (let i = 0; i < RAYS; i++) {
    const ra = spin + (i / RAYS) * TAU;
    const c = Math.cos(ra);
    const sn = Math.sin(ra);
    const w = br * (i % 2 ? 0.1 : 0.16);
    const len = i % 2 ? reach * 0.82 : reach;
    ctx.moveTo(tx + c * br * 0.9 - sn * w, by + sn * br * 0.9 + c * w);
    ctx.lineTo(tx + c * len, by + sn * len);
    ctx.lineTo(tx + c * br * 0.9 + sn * w, by + sn * br * 0.9 - c * w);
    ctx.closePath();
  }
  ctx.fillStyle = BALL_RAYS;
  ctx.fill();

  ctx.beginPath();
  polys(ctx, s, GILT);
  circle(ctx, tx, clockY, cr);
  ctx.fillStyle = flash ? GOLD_LIGHT : GOLD;
  ctx.fill();

  ctx.beginPath();
  circle(ctx, tx, clockY, cr * 0.78);
  ctx.fillStyle = faceFlash ? FACE_LIT : FACE;
  ctx.fill();

  // Lit windows (a few switch off and on now and then) and lit gold
  const ww = Math.max(1, WIN_W * u);
  const wh = Math.max(1, WIN_H * u);
  const slot = Math.floor(s.t * 0.3);
  ctx.beginPath();
  for (let k = 0; k < HEROES.length; k++) {
    const h = HEROES[k]!;
    const ox = cx + h.x * u;
    const hidden = FLOOR[k]! - WIN_H;
    for (let i = 0; i < h.win.length; i += 2) {
      if (h.win[i + 1]! < hidden || hash(i * 0.37 + k * 3.1 + slot * 7.1) < 0.07) continue;
      ctx.rect(ox + h.win[i]! * u, hy - h.win[i + 1]! * u - wh, ww, wh);
    }
  }
  if (!flash) polys(ctx, s, LIT);
  ctx.fillStyle = WINDOW;
  ctx.fill();
  if (flash) {
    ctx.beginPath();
    polys(ctx, s, LIT);
    ctx.fillStyle = MIDNIGHT_FLASH;
    ctx.fill();
  }

  // Shaded gold, and the clock's marks at twelve, three, six and nine
  ctx.beginPath();
  polys(ctx, s, DEEP);
  const m = Math.max(1, cr * 0.13);
  ctx.rect(tx - m / 2, clockY - cr * 0.72, m, cr * 0.2);
  ctx.rect(tx - m / 2, clockY + cr * 0.52, m, cr * 0.2);
  ctx.rect(tx + cr * 0.52, clockY - m / 2, cr * 0.2, m);
  ctx.rect(tx - cr * 0.72, clockY - m / 2, cr * 0.2, m);
  ctx.fillStyle = GOLD_DEEP;
  ctx.fill();

  // The ball: body, shaded lower right, then (in one bronze stroke) its outline, its facet
  // grid of two latitudes and a turning meridian, and the clock's hands — five to midnight at
  // the start, twelve when the ball is down.
  ctx.beginPath();
  circle(ctx, tx, by, br);
  ctx.fillStyle = BALL;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx + br, by);
  ctx.arc(tx, by, br, 0, Math.PI * 0.75);
  ctx.quadraticCurveTo(tx + br * 0.35, by + br * 0.35, tx + br, by);
  ctx.fillStyle = BALL_SHADE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, tx, by, br);
  ctx.moveTo(tx - br * 0.94, by - br * 0.33);
  ctx.quadraticCurveTo(tx, by - br * 0.18, tx + br * 0.94, by - br * 0.33);
  ctx.moveTo(tx - br * 0.94, by + br * 0.33);
  ctx.quadraticCurveTo(tx, by + br * 0.48, tx + br * 0.94, by + br * 0.33);
  const mer = Math.sin(s.t * 0.8) * br * 0.55;
  ctx.moveTo(tx + mer * 0.2, by - br);
  ctx.quadraticCurveTo(tx + mer, by, tx + mer * 0.2, by + br);
  const left = 1 - a;
  const minute = -Math.PI / 2 - left * (TAU / 12);
  const hour = -Math.PI / 2 - left * (TAU / 144);
  ctx.moveTo(tx, clockY);
  ctx.lineTo(tx + Math.cos(minute) * cr * 0.66, clockY + Math.sin(minute) * cr * 0.66);
  ctx.moveTo(tx, clockY);
  ctx.lineTo(tx + Math.cos(hour) * cr * 0.42, clockY + Math.sin(hour) * cr * 0.42);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = BRONZE;
  ctx.lineWidth = Math.max(1.3, cr * 0.12);
  ctx.stroke();
  ctx.lineCap = "butt";

  // Facets twinkling on the ball as it turns, and beacons blinking out of step
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    if (Math.sin(s.t * 4.2 + i * 1.9) < 0.25) continue;
    const fa = i * 1.26 + s.t * 0.8;
    circle(ctx, tx + Math.cos(fa) * br * 0.55, by + Math.sin(fa) * br * 0.45, br * 0.18);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < HEROES.length; k++) {
    const b = HEROES[k]!.beacons;
    if (b.length === 0 || Math.sin(s.t * 2.4 + k * 1.7) < -0.1) continue;
    circle(ctx, cx + (HEROES[k]!.x + b[0]!) * u, hy - b[1]! * u, Math.max(1.5, u * 0.0062));
  }
  ctx.fillStyle = BEACON;
  ctx.fill();

  marquee(ctx, s, TIMES.x);
}

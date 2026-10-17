import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MEADOW, MEADOW_LIGHT } from "./colors";
import { horizon } from "./place";
import { block } from "./shapes";
import type { FarToy, Tone } from "./tone";

// The far land, standing on its horizon (place.ts), back to front: a row of periwinkle block
// mountains; a toy town of block houses under triangle roofs and round towers under cones, low
// behind the tower and taller out to the sides; the two landmarks up the side lanes — on the
// left the King's castle (a curtain wall with a gate, two turrets under cone roofs, a yellow
// keep and a round tower flying the kingdom's flag, bunting between them), on the right the
// toy rocket on its launch pad beside a lattice launch tower with a beacon (the same rocket
// flies past at night, drift.ts); then the green railway hills, where a little train runs from
// one tunnel to the next and a block bridge crosses a pool; then the meadow the fort stands on.
// All of it built from the same rounded toy blocks as the tower, faded toward the sky and flat,
// with no outline; only the train, the flags and the beacon move (well clear of the column).
// A sea of block clouds billows up and covers it all as you climb (place.ts, sea.ts).
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up),
// except the landmarks', which are in u from their own center and up from the horizon.

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- hills

/** One slab of a hill: left and right edge (u), its top (u from the horizon), its height (u). */
type Slab = readonly [x0: number, x1: number, top: number, h: number];

/** A hill of slabs stacked on `base`, bottom first, each `h` tall, stepping in by `widths`. */
function hill(x: number, widths: readonly number[], base: number, h: number, lean = 0): Slab[] {
  return widths.map((w, i) => [x - w / 2 + lean * i, x + w / 2 + lean * i, base - h * (i + 1), h] as const);
}

/** The back row's slab height, base line, and the span its mountains repeat over (u). */
const BACK_STEP = 0.034;
const BACK_BASE = 0.02;
const BACK_SPAN = 1;
const BACK: Slab[] = [
  ...hill(-0.33, [0.36, 0.27, 0.18, 0.1], BACK_BASE, BACK_STEP, 0.012),
  ...hill(0.03, [0.3, 0.2, 0.11], BACK_BASE, BACK_STEP, -0.008),
  ...hill(0.35, [0.4, 0.3, 0.21, 0.13, 0.06], BACK_BASE, BACK_STEP, -0.01),
];

/** The front row: slab height, and its base (the meadow's far edge). */
const STEP = 0.032;
const FRONT_BASE = 0.066;
/** The ground course: a row of low slabs across the whole width, under everything in front. */
const COURSE = FRONT_BASE - STEP;
/** Track level: the top of the embankment. */
const TRACK = COURSE - STEP;
/** The tunnel hills' faces (where the track goes in), and the pool's banks. */
const TUNNEL_A = -0.44;
const TUNNEL_B = -0.3;
/** The pool sits just outside the tower's column, inside the right lane. */
const POOL = { x0: 0.268, x1: 0.345 } as const;
/** How far the bridge's plank deck reaches past the pool's banks (u). */
const DECK = 0.012;

const FRONT: Slab[] = [
  // The embankment the track runs along.
  [TUNNEL_A - 0.02, TUNNEL_B + 0.02, TRACK, STEP],
  // Tunnel hill A, at the left edge (and on out past it, on wide screens).
  [-1.1, TUNNEL_A, TRACK, STEP],
  [-1.04, TUNNEL_A, TRACK - STEP, STEP],
  [-0.98, TUNNEL_A - 0.008, TRACK - STEP * 2, STEP],
  [-0.6, TUNNEL_A - 0.06, TRACK - STEP * 3, STEP],
  [-0.92, -0.72, TRACK - STEP * 3, STEP],
  // Tunnel hill B, toward the middle.
  [TUNNEL_B, -0.12, TRACK, STEP],
  [TUNNEL_B, -0.14, TRACK - STEP, STEP],
  [TUNNEL_B + 0.012, -0.17, TRACK - STEP * 2, STEP],
  // A low hill behind the tower, right of tunnel hill B.
  [-0.11, 0.16, COURSE - STEP * 0.8, STEP * 0.8],
  [-0.04, 0.1, COURSE - STEP * 1.6, STEP * 0.8],
  // The banks either side of the pool.
  [0.17, POOL.x0, TRACK, STEP],
  [POOL.x1, 1.1, TRACK, STEP],
  [POOL.x1 + 0.03, 1.02, TRACK - STEP, STEP],
  [POOL.x1 + 0.075, 0.62, TRACK - STEP * 2, STEP],
  [0.74, 0.96, TRACK - STEP * 2, STEP],
];

/** Seams between the blocks of a slab: about every SEAM u, offset slab by slab like brickwork. */
const SEAM = 0.085;

/**
 * Fill a row of slabs: the shade (which shows along each slab's bottom), the body, a lit strip
 * along each top, and (optionally) seams between blocks. Three fills.
 */
function slabs(ctx: Ctx, s: Scene, list: readonly Slab[], ox: number, body: string, lit: string, shade: string, seams: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2 + ox;
  const hz = horizon(s);
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) block(ctx, cx + x0 * u, hz + top * u, (x1 - x0) * u, h * u, h * u * 0.36);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) block(ctx, cx + x0 * u, hz + top * u, (x1 - x0) * u, h * u * 0.76, h * u * 0.32);
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  for (const [x0, x1, top, h] of list) ctx.rect(cx + x0 * u + h * u * 0.36, hz + top * u + u * 0.003, (x1 - x0 - h * 0.72) * u, u * 0.005);
  if (seams) {
    for (let i = 0; i < list.length; i++) {
      const [x0, x1, top, h] = list[i]!;
      const n = Math.max(1, Math.round((x1 - x0) / SEAM));
      const w = (x1 - x0) / n;
      for (let k = 1; k < n + 1; k++) {
        const x = x0 + w * (k - (i % 2 ? 0.5 : 0));
        if (x < x0 + 0.02 || x > x1 - 0.02) continue;
        ctx.rect(cx + x * u, hz + top * u + u * 0.006, Math.max(1, u * 0.003), h * u * 0.62);
      }
    }
  }
  ctx.fill();
}

function backRow(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = horizon(s);
  ctx.fillStyle = tone.hillBack;
  ctx.fillRect(0, hz + BACK_BASE * u, s.cssW, bottom - hz - BACK_BASE * u);
  // The back row repeats across wide screens.
  const n = Math.ceil((s.cssW / 2 / u - BACK_SPAN / 2) / BACK_SPAN);
  for (let k = -n; k <= n; k++) slabs(ctx, s, BACK, k * BACK_SPAN * u, tone.hillBack, tone.hillBackLit, tone.hillBackShade, false);
}

/** The ground course: blocks across the whole screen, centered so both sides match. */
function course(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = horizon(s);
  const y = hz + COURSE * u;
  const h = STEP * u;
  ctx.fillStyle = tone.hillFrontShade;
  ctx.fillRect(0, y, s.cssW, bottom - y);
  ctx.fillStyle = tone.hillFront;
  ctx.fillRect(0, y, s.cssW, h * 0.76);
  ctx.fillStyle = tone.hillFrontLit;
  ctx.fillRect(0, y + u * 0.003, s.cssW, u * 0.005);
  ctx.fillStyle = tone.hillFrontShade;
  ctx.beginPath();
  const w = SEAM * 1.4 * u;
  for (let x = s.cssW / 2 - w * Math.ceil(s.cssW / 2 / w) + w * 0.3; x < s.cssW; x += w) ctx.rect(x, y + u * 0.006, Math.max(1, u * 0.003), h * 0.62);
  ctx.fill();
}

function frontRow(ctx: Ctx, s: Scene, tone: Tone): void {
  slabs(ctx, s, FRONT, 0, tone.hillFront, tone.hillFrontLit, tone.hillFrontShade, true);
}

// ---------------------------------------------------------------- the rainbow

/** The wooden rainbow's outer radius, its bands' width (u) and how far its feet sink below the horizon. */
const RAINBOW_R = 0.275;
const RAINBOW_BAND = 0.021;
const RAINBOW_FOOT = 0.03;
/** Its bands from the outside in: red, orange, yellow, green, blue, purple. */
const RAINBOW = [0, 4, 1, 3, 2, 5] as const;

/**
 * A wooden rainbow-stacker toy as big as the sky, arching over the toy town between the castle
 * and the launch tower: six chunky bands, each lit along its top edge. It stands still.
 */
function rainbow(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const cy = horizon(s) + RAINBOW_FOOT * u;
  for (let i = 0; i < RAINBOW.length; i++) {
    const c = tone.land[RAINBOW[i]!];
    const r1 = (RAINBOW_R - i * RAINBOW_BAND) * u;
    const r0 = r1 - RAINBOW_BAND * u;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, Math.PI, TAU);
    ctx.arc(cx, cy, r0, TAU, Math.PI, true);
    ctx.closePath();
    fill(ctx, c.body);
    ctx.beginPath();
    ctx.arc(cx, cy, r1 - u * 0.002, Math.PI * 1.04, Math.PI * 1.6);
    ctx.arc(cx, cy, r1 - u * 0.0065, Math.PI * 1.6, Math.PI * 1.04, true);
    ctx.closePath();
    fill(ctx, c.light);
  }
}

// ---------------------------------------------------------------- the toy town

/** A town building: kind (0 house, 1 round tower, 2 stacked blocks), left edge, width, wall height (u), body and roof colors. */
interface House {
  kind: number;
  x: number;
  w: number;
  h: number;
  body: number;
  roof: number;
}

/** Body colors (indexes into the faded land palette) and roof colors. */
const BODY = [1, 2, 6, 4] as const;
const ROOF = [0, 5, 4, 0] as const;
/** How far out the town runs either side (u): past the edge of the widest view. */
const TOWN_SPAN = 1.05;
/** The town stands on this line (u below the horizon: the railway hills hide its foot). */
const TOWN_BASE = 0.02;

const TOWN: House[] = (() => {
  const out: House[] = [];
  let x = -TOWN_SPAN;
  for (let i = 0; x < TOWN_SPAN; i++) {
    const r = hash(i * 7 + 6100);
    const kind = r < 0.55 ? 0 : r < 0.8 ? 1 : 2;
    const w = kind === 1 ? 0.03 + hash(i + 6200) * 0.01 : 0.045 + hash(i + 6200) * 0.025;
    const mid = x + w / 2;
    const out01 = Math.min(1, Math.abs(mid) / 0.5);
    // Low behind the tower, taller out toward the sides.
    const h = (kind === 1 ? 0.07 : 0.035) + (0.02 + hash(i + 6300) * 0.03) * (0.4 + out01);
    out.push({ kind, x, w, h, body: BODY[i % BODY.length]!, roof: ROOF[(i * 3 + 1) % ROOF.length]! });
    x += w + 0.004 + hash(i + 6400) * 0.012;
  }
  return out;
})();

/** Fill the current path in a color. */
function fill(ctx: Ctx, c: string): void {
  ctx.fillStyle = c;
  ctx.fill();
}

/** The town: walls by color, then roofs by color, then lit edges and windows. */
function town(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = horizon(s) + TOWN_BASE * u;
  const minX = -cx / u - 0.1;
  const maxX = cx / u + 0.1;
  for (const c of [1, 2, 6, 4] as const) {
    ctx.beginPath();
    for (const b of TOWN) {
      if (b.body !== c || b.x > maxX || b.x + b.w < minX) continue;
      const top = base - (b.h + TOWN_BASE) * u;
      if (b.kind === 2) {
        block(ctx, cx + b.x * u, top + b.h * 0.45 * u, b.w * u, (b.h * 0.55 + TOWN_BASE) * u, u * 0.004);
        block(ctx, cx + (b.x + b.w * 0.18) * u, top, b.w * 0.64 * u, b.h * 0.5 * u, u * 0.004);
      } else block(ctx, cx + b.x * u, top, b.w * u, (b.h + TOWN_BASE) * u, u * (b.kind === 1 ? 0.008 : 0.004));
    }
    fill(ctx, tone.land[c].body);
  }
  for (const c of [0, 5, 4] as const) {
    ctx.beginPath();
    for (const b of TOWN) {
      if (b.roof !== c || b.x > maxX || b.x + b.w < minX) continue;
      const top = base - (b.h + TOWN_BASE) * u;
      const l = cx + b.x * u;
      const r = l + b.w * u;
      if (b.kind === 0) {
        ctx.moveTo(l - u * 0.004, top + u * 0.002);
        ctx.lineTo((l + r) / 2, top - b.w * 0.55 * u);
        ctx.lineTo(r + u * 0.004, top + u * 0.002);
        ctx.closePath();
      } else if (b.kind === 1) {
        ctx.moveTo(l - u * 0.004, top + u * 0.004);
        ctx.lineTo((l + r) / 2, top - b.w * 1.4 * u);
        ctx.lineTo(r + u * 0.004, top + u * 0.004);
        ctx.closePath();
      } else {
        const tl = cx + (b.x + b.w * 0.18) * u;
        const tr = tl + b.w * 0.64 * u;
        ctx.moveTo(tl, top + u * 0.002);
        ctx.lineTo((tl + tr) / 2, top - b.w * 0.3 * u);
        ctx.lineTo(tr, top + u * 0.002);
        ctx.closePath();
      }
    }
    fill(ctx, tone.land[c].body);
  }
  // Windows: a door and a window or two on each house, a slit on each tower.
  ctx.beginPath();
  for (const b of TOWN) {
    if (b.x > maxX || b.x + b.w < minX) continue;
    const top = base - (b.h + TOWN_BASE) * u;
    const mid = cx + (b.x + b.w / 2) * u;
    const ww = u * 0.008;
    if (b.kind === 1) {
      block(ctx, mid - ww * 0.5, top + b.h * 0.25 * u, ww, u * 0.014, ww * 0.5);
    } else if (b.kind === 0) {
      block(ctx, mid - ww * 0.6, base - u * 0.024, ww * 1.2, u * 0.024, ww * 0.6);
      if (b.w > 0.052) {
        block(ctx, mid - b.w * 0.32 * u, top + u * 0.012, ww, ww, u * 0.002);
        block(ctx, mid + b.w * 0.32 * u - ww, top + u * 0.012, ww, ww, u * 0.002);
      } else block(ctx, mid - ww / 2, top + u * 0.012, ww, ww, u * 0.002);
    } else {
      block(ctx, mid - ww / 2, top + u * 0.01, ww, ww, u * 0.002);
    }
  }
  fill(ctx, tone.hole);
  // Lit left edges and a shaded right side on every wall: one light fill, one shade fill.
  ctx.beginPath();
  for (const b of TOWN) {
    if (b.x > maxX || b.x + b.w < minX) continue;
    const top = base - (b.h + TOWN_BASE) * u;
    ctx.rect(cx + b.x * u + u * 0.003, top + u * 0.004, u * 0.004, b.h * u * 0.8);
  }
  fill(ctx, "rgba(255, 255, 255, 0.28)");
  ctx.beginPath();
  for (const b of TOWN) {
    if (b.x > maxX || b.x + b.w < minX) continue;
    const top = base - (b.h + TOWN_BASE) * u;
    ctx.rect(cx + (b.x + b.w) * u - u * 0.009, top + u * 0.004, u * 0.009, (b.h + TOWN_BASE) * u);
  }
  fill(ctx, "rgba(30, 20, 70, 0.14)");
}

// ---------------------------------------------------------------- the landmarks

/** The castle's and the launch tower's centers (u from the screen center), and the castle's turrets (u out from its center). */
const CASTLE_X = -0.371;
const TURRET = 0.086;
/** The castle and the rocket are drawn a little squat (their heights below are scaled by these). */
const CASTLE_SQUASH = 0.88;
const PAD_SQUASH = 0.95;
const PAD_X = 0.37;

/** A block in a landmark (u from its center, up from the horizon), drawn body + lit top + shaded right. */
function farBlock(ctx: Ctx, s: Scene, ox: number, x0: number, y0: number, x1: number, y1: number, c: FarToy): void {
  const u = s.u;
  const hz = horizon(s);
  const l = ox + x0 * u;
  const w = (x1 - x0) * u;
  const t = hz - y1 * u;
  const h = (y1 - y0) * u;
  const r = Math.min(u * 0.005, w / 3, h / 3);
  ctx.beginPath();
  block(ctx, l, t, w, h, r);
  fill(ctx, c.shade);
  ctx.beginPath();
  block(ctx, l, t, w - Math.min(u * 0.008, w * 0.25), h - Math.min(u * 0.004, h * 0.2), r);
  fill(ctx, c.body);
  ctx.fillStyle = c.light;
  ctx.fillRect(l + r, t + u * 0.002, Math.max(0, w - r * 2 - u * 0.008), Math.min(u * 0.005, h * 0.3));
}

/** A cylinder (a round tower), lit stripe on the left, shade on the right. */
function cylinder(ctx: Ctx, s: Scene, ox: number, x: number, hw: number, y0: number, y1: number, c: FarToy): void {
  const u = s.u;
  const hz = horizon(s);
  const l = ox + (x - hw) * u;
  const t = hz - y1 * u;
  const h = (y1 - y0) * u;
  ctx.beginPath();
  block(ctx, l, t, hw * 2 * u, h, u * 0.004);
  fill(ctx, c.body);
  ctx.fillStyle = c.light;
  ctx.fillRect(l + hw * 0.35 * u, t, hw * 0.35 * u, h);
  ctx.fillStyle = c.shade;
  ctx.fillRect(l + hw * 1.45 * u, t, hw * 0.55 * u, h);
}

/** A cone roof standing on y0 (u up), half-width hw, h tall: lit left half, shaded right. */
function coneRoof(ctx: Ctx, s: Scene, ox: number, x: number, hw: number, y0: number, h: number, c: FarToy): void {
  const u = s.u;
  const hz = horizon(s);
  const cxp = ox + x * u;
  const base = hz - y0 * u;
  const tip = base - h * u;
  ctx.beginPath();
  ctx.moveTo(cxp - hw * u, base);
  ctx.lineTo(cxp, tip);
  ctx.lineTo(cxp + hw * u, base);
  ctx.closePath();
  fill(ctx, c.body);
  ctx.beginPath();
  ctx.moveTo(cxp + u * 0.001, tip + u * 0.004);
  ctx.lineTo(cxp + hw * u, base);
  ctx.lineTo(cxp + hw * 0.3 * u, base);
  ctx.closePath();
  fill(ctx, c.shade);
  ctx.beginPath();
  ctx.moveTo(cxp - u * 0.001, tip + u * 0.006);
  ctx.lineTo(cxp - hw * 0.62 * u, base);
  ctx.lineTo(cxp - hw * 0.35 * u, base);
  ctx.closePath();
  fill(ctx, c.light);
}

/** A flag on a pole: pole from y0 to y1 (u up) at x, a pennant `len` long (u) waving out to the left, away from the tower. */
function flag(ctx: Ctx, s: Scene, tone: Tone, ox: number, x: number, y0: number, y1: number, len0: number, c: FarToy, phase: number, square: boolean): void {
  const u = s.u;
  const hz = horizon(s);
  const px = ox + x * u;
  const len = -len0;
  ctx.fillStyle = tone.line;
  ctx.fillRect(px - u * 0.0015, hz - y1 * u, u * 0.003, (y1 - y0) * u);
  const top = hz - y1 * u + u * 0.002;
  const h = u * (square ? 0.024 : 0.016);
  const w1 = Math.sin(s.t * 2.1 + phase) * u * 0.003;
  const w2 = Math.sin(s.t * 2.1 + phase + 1.4) * u * 0.004;
  ctx.beginPath();
  ctx.moveTo(px, top);
  ctx.quadraticCurveTo(px + len * 0.5 * u, top + w1, px + len * u, top + (square ? 0 : h * 0.5) + w2);
  if (square) ctx.lineTo(px + len * u, top + h + w2);
  ctx.quadraticCurveTo(px + len * 0.5 * u, top + h + w1, px, top + h);
  ctx.closePath();
  fill(ctx, c.body);
  if (square) {
    // The kingdom's arms: a little crown-yellow star on the flag.
    ctx.beginPath();
    circle(ctx, px + len * 0.45 * u, top + h * 0.5 + w1 * 0.8, h * 0.22);
    fill(ctx, tone.land[1].light);
  }
}

/** A string of bunting from (x0, y0) to (x1, y1) (u), with little pennants in turn. */
function bunting(ctx: Ctx, s: Scene, tone: Tone, ox: number, x0: number, y0: number, x1: number, y1: number): void {
  const u = s.u;
  const hz = horizon(s);
  const ax = ox + x0 * u;
  const ay = hz - y0 * u;
  const bx = ox + x1 * u;
  const by = hz - y1 * u;
  const sag = u * 0.014;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag * 2, bx, by);
  ctx.stroke();
  const n = 5;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    for (let i = c; i < n; i += 3) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t + sag * 4 * t * (1 - t);
      ctx.moveTo(x - u * 0.005, y);
      ctx.lineTo(x + u * 0.005, y);
      ctx.lineTo(x, y + u * 0.011);
      ctx.closePath();
    }
    fill(ctx, tone.land[c === 0 ? 0 : c === 1 ? 1 : 2].body);
  }
}

/** An arch hole (doorway or window) standing on y0 (u up), w wide, h tall, at x (u from ox). */
function archHole(ctx: Ctx, s: Scene, ox: number, x: number, y0: number, w: number, h: number): void {
  const u = s.u;
  const hz = horizon(s);
  const l = ox + (x - w / 2) * u;
  const b = hz - y0 * u;
  const r = (w / 2) * u;
  ctx.moveTo(l, b);
  ctx.lineTo(l, b - h * u + r);
  ctx.arc(l + r, b - h * u + r, r, Math.PI, TAU);
  ctx.lineTo(l + w * u, b);
  ctx.closePath();
}

/**
 * The King's castle up the left lane: a blue curtain wall with merlons and a gate, purple
 * turrets under red cone roofs flying yellow pennants, a yellow keep with arched windows and a
 * row of red merlons, and on it a round teal tower under a red cone flying the kingdom's flag.
 */
export function castle(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const ox = s.cssW / 2 + CASTLE_X * u;
  const [red, yellow, blue, , orange, purple, teal] = tone.land;
  const T = TURRET;
  const hz0 = horizon(s);
  ctx.save();
  ctx.translate(0, hz0);
  ctx.scale(1, CASTLE_SQUASH);
  ctx.translate(0, -hz0);
  // Bunting from each turret's roof to the keep, behind everything else.
  bunting(ctx, s, tone, ox, -T, 0.215, -0.048, 0.25);
  bunting(ctx, s, tone, ox, 0.048, 0.25, T, 0.215);
  // The keep and its tower.
  farBlock(ctx, s, ox, -0.052, 0.09, 0.052, 0.25, yellow);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x0 = -0.052 + i * 0.03;
    farBlockPath(ctx, s, ox, x0, 0.25, x0 + 0.016, 0.267);
  }
  fill(ctx, red.body);
  cylinder(ctx, s, ox, 0, 0.024, 0.25, 0.33, teal);
  coneRoof(ctx, s, ox, 0, 0.034, 0.33, 0.06, red);
  flag(ctx, s, tone, ox, 0, 0.384, 0.43, 0.05, orange, 0.3, true);
  ctx.beginPath();
  archHole(ctx, s, ox, -0.024, 0.155, 0.017, 0.04);
  archHole(ctx, s, ox, 0.024, 0.155, 0.017, 0.04);
  archHole(ctx, s, ox, 0, 0.275, 0.013, 0.03);
  fill(ctx, tone.hole);
  // Turrets.
  for (const m of [-1, 1] as const) {
    const x = m * T;
    cylinder(ctx, s, ox, x, 0.022, 0, 0.21, purple);
    coneRoof(ctx, s, ox, x, 0.03, 0.21, 0.068, red);
    flag(ctx, s, tone, ox, x, 0.276, 0.302, 0.024, yellow, m + 2, false);
    ctx.beginPath();
    archHole(ctx, s, ox, x, 0.14, 0.013, 0.03);
    fill(ctx, tone.hole);
  }
  // The curtain wall between them, merlons on top, brick seams, the gate.
  const W = T - 0.016;
  farBlock(ctx, s, ox, -W, 0, W, 0.1, blue);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x0 = -W + 0.006 + i * ((W * 2 - 0.012) / 3.6);
    farBlockPath(ctx, s, ox, x0, 0.1, x0 + 0.02, 0.12);
  }
  fill(ctx, blue.body);
  const hz = horizon(s);
  ctx.fillStyle = blue.shade;
  ctx.beginPath();
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4; i++) {
      const x = -W + (i + (r % 2 ? 0.5 : 1)) * 0.038;
      if (x > W - 0.006) continue;
      ctx.rect(ox + x * u, hz - (0.03 + r * 0.03) * u, Math.max(1, u * 0.0025), 0.024 * u);
    }
    ctx.rect(ox - W * u, hz - (0.03 + r * 0.03) * u, W * 2 * u, Math.max(1, u * 0.0025));
  }
  ctx.fill();
  ctx.beginPath();
  archHole(ctx, s, ox, 0, -0.01, 0.044, 0.074);
  fill(ctx, tone.hole);
  ctx.beginPath();
  archHole(ctx, s, ox, 0, -0.01, 0.034, 0.065);
  fill(ctx, orange.shade);
  ctx.fillStyle = tone.hole;
  ctx.fillRect(ox - u * 0.001, hz - 0.065 * u, u * 0.002, 0.06 * u);
  ctx.restore();
}

/** A rounded block's path (u from ox, up from the horizon), no fill. */
function farBlockPath(ctx: Ctx, s: Scene, ox: number, x0: number, y0: number, x1: number, y1: number): void {
  const u = s.u;
  const hz = horizon(s);
  block(ctx, ox + x0 * u, hz - y1 * u, (x1 - x0) * u, (y1 - y0) * u, u * 0.003);
}

/** The launch tower's height and the rocket's (u up). */
const GANTRY_TOP = 0.36;

/**
 * The toy rocket on its launch pad up the right lane: a cream rocket with a red nose, fins and
 * band and two round windows, beside an orange lattice launch tower with a service arm reaching
 * over to it and a beacon on top that blinks.
 */
export function launchPad(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const ox = s.cssW / 2 + PAD_X * u;
  const hz = horizon(s);
  ctx.save();
  ctx.translate(0, hz);
  ctx.scale(1, PAD_SQUASH);
  ctx.translate(0, -hz);
  const [red, , blue, , orange] = tone.land;
  // The lattice tower: two posts, cross braces in every bay, a platform on top.
  const p0 = 0.038;
  const p1 = 0.084;
  ctx.fillStyle = orange.body;
  ctx.fillRect(ox + p0 * u, hz - GANTRY_TOP * u, 0.007 * u, (GANTRY_TOP - 0.02) * u);
  ctx.fillRect(ox + (p1 - 0.007) * u, hz - GANTRY_TOP * u, 0.007 * u, (GANTRY_TOP - 0.02) * u);
  ctx.strokeStyle = orange.shade;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.beginPath();
  const bay = 0.048;
  for (let y = 0.03; y + bay <= GANTRY_TOP + 0.001; y += bay) {
    ctx.moveTo(ox + (p0 + 0.006) * u, hz - y * u);
    ctx.lineTo(ox + (p1 - 0.006) * u, hz - (y + bay) * u);
    ctx.moveTo(ox + (p1 - 0.006) * u, hz - y * u);
    ctx.lineTo(ox + (p0 + 0.006) * u, hz - (y + bay) * u);
    ctx.moveTo(ox + p0 * u, hz - (y + bay) * u);
    ctx.lineTo(ox + p1 * u, hz - (y + bay) * u);
  }
  ctx.stroke();
  ctx.fillStyle = orange.light;
  ctx.fillRect(ox + (p0 - 0.004) * u, hz - (GANTRY_TOP + 0.008) * u, (p1 - p0 + 0.008) * u, 0.01 * u);
  // The service arm, over to the rocket's shoulder.
  ctx.fillStyle = orange.shade;
  ctx.fillRect(ox + 0.004 * u, hz - 0.29 * u, (p0 - 0.004) * u, 0.008 * u);
  // The beacon: blinks slowly.
  ctx.beginPath();
  circle(ctx, ox + ((p0 + p1) / 2) * u, hz - (GANTRY_TOP + 0.016) * u, u * 0.007);
  fill(ctx, Math.sin(s.t * 2.2) > 0 ? "#ff5a5a" : red.shade);
  // The rocket.
  const rx = -0.025;
  const hw = 0.027;
  const c = ox + rx * u;
  // Fins.
  ctx.beginPath();
  ctx.moveTo(c - hw * u, hz - 0.12 * u);
  ctx.lineTo(c - (hw + 0.024) * u, hz - 0.035 * u);
  ctx.lineTo(c - hw * u, hz - 0.035 * u);
  ctx.closePath();
  ctx.moveTo(c + hw * u, hz - 0.12 * u);
  ctx.lineTo(c + (hw + 0.024) * u, hz - 0.035 * u);
  ctx.lineTo(c + hw * u, hz - 0.035 * u);
  ctx.closePath();
  fill(ctx, red.shade);
  // Body: shade, body, band.
  ctx.beginPath();
  block(ctx, c - hw * u, hz - 0.3 * u, hw * 2 * u, 0.265 * u, hw * 0.5 * u);
  fill(ctx, tone.landCream.shade);
  ctx.beginPath();
  block(ctx, c - hw * u, hz - 0.3 * u, hw * 1.45 * u, 0.265 * u, hw * 0.5 * u);
  fill(ctx, tone.landCream.body);
  ctx.fillStyle = red.body;
  ctx.fillRect(c - hw * u, hz - 0.1 * u, hw * 2 * u, 0.014 * u);
  // Nose cone.
  ctx.beginPath();
  ctx.moveTo(c - hw * u, hz - 0.29 * u);
  ctx.quadraticCurveTo(c - hw * 0.9 * u, hz - 0.37 * u, c, hz - 0.395 * u);
  ctx.quadraticCurveTo(c + hw * 0.9 * u, hz - 0.37 * u, c + hw * u, hz - 0.29 * u);
  ctx.closePath();
  fill(ctx, red.body);
  // Windows.
  ctx.beginPath();
  circle(ctx, c, hz - 0.235 * u, u * 0.012);
  circle(ctx, c, hz - 0.18 * u, u * 0.01);
  fill(ctx, blue.light);
  // The pad: a wide low block under it all.
  farBlock(ctx, s, ox, -0.1, -0.005, 0.1, 0.036, blue);
  ctx.restore();
}

// ---------------------------------------------------------------- the railway

/** The train: engine and two cars, each [length, height, color index] in u; gaps between them. */
const CARS = [
  [0.032, 0.022, 0],
  [0.02, 0.017, 1],
  [0.02, 0.017, 2],
] as const;
const GAP = 0.004;
const TRAIN = CARS.reduce((a, c) => a + c[0], 0) + GAP * (CARS.length - 1);
/**
 * Speed (u per second), and how long it waits in the tunnel between runs (s). Its first run
 * starts as the scene does and is back underground in under 10 s (the owner's rule: any action
 * within the first 10 s, as players soon climb past); it runs again now and then after that.
 */
const TRAIN_SPEED = 0.026;
const TRAIN_WAIT = 7;

/** Where the train's tail is now (u from center), or NaN while it is inside a tunnel. */
export function trainX(t: number): number {
  const from = TUNNEL_A - TRAIN - 0.01;
  const to = TUNNEL_B + 0.01;
  const run = (to - from) / TRAIN_SPEED;
  const k = t % (run + TRAIN_WAIT);
  return k < run ? from + k * TRAIN_SPEED : NaN;
}

function train(ctx: Ctx, s: Scene, tone: Tone): void {
  const tail = trainX(s.t);
  if (Number.isNaN(tail)) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const rail = horizon(s) + TRACK * u;
  const wheel = u * 0.0055;
  const deck = rail - wheel * 1.5;
  let x = cx + tail * u;
  // Cars and engine, back to front (the train runs right).
  for (let i = CARS.length - 1; i >= 0; i--) {
    const [len, h, c] = CARS[i]!;
    const toy = tone.toys[c]!;
    const w = len * u;
    ctx.fillStyle = toy.body;
    ctx.beginPath();
    if (i === 0) {
      // The engine: a cab at the back, a boiler in front, a chimney on the boiler.
      block(ctx, x, deck - h * u, w * 0.42, h * u, u * 0.003);
      block(ctx, x + w * 0.38, deck - h * u * 0.62, w * 0.62, h * u * 0.62, u * 0.004);
      block(ctx, x + w * 0.72, deck - h * u * 0.95, w * 0.14, h * u * 0.36, u * 0.002);
    } else {
      block(ctx, x, deck - h * u, w, h * u, u * 0.003);
    }
    ctx.fill();
    ctx.fillStyle = toy.light;
    ctx.fillRect(x + u * 0.002, deck - h * u + u * 0.002, (i === 0 ? w * 0.42 : w) - u * 0.004, u * 0.004);
    ctx.fillStyle = tone.tunnel;
    ctx.beginPath();
    circle(ctx, x + w * 0.25, deck + wheel * 0.5, wheel);
    circle(ctx, x + w * 0.75, deck + wheel * 0.5, wheel);
    ctx.fill();
    x += w + GAP * u;
  }
}

/** Rails and sleepers along the embankment. */
function track(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const y = horizon(s) + TRACK * u;
  const x0 = cx + TUNNEL_A * u;
  const x1 = cx + TUNNEL_B * u;
  ctx.fillStyle = tone.farWood;
  ctx.beginPath();
  ctx.rect(x0, y - u * 0.004, x1 - x0, u * 0.004);
  for (let x = x0 + u * 0.004; x < x1 - u * 0.006; x += u * 0.014) ctx.rect(x, y - u * 0.005, u * 0.006, u * 0.008);
  ctx.fill();
}

/** Portal size (u). */
const PORTAL_W = 0.05;
const PORTAL_H = 0.054;

/** The tunnel mouths: an arch block in each hill's face, the dark tunnel through it. */
export function portals(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const y = horizon(s) + TRACK * u;
  const w = PORTAL_W * u;
  const h = PORTAL_H * u;
  const ax = cx + TUNNEL_A * u - w + u * 0.006;
  const bx = cx + TUNNEL_B * u - u * 0.006;
  const toy = tone.toys[4];
  ctx.fillStyle = toy.body;
  ctx.beginPath();
  archPath(ctx, ax, y, w, h);
  archPath(ctx, bx, y, w, h);
  ctx.fill();
  ctx.fillStyle = tone.tunnel;
  ctx.beginPath();
  archPath(ctx, ax + w * 0.2, y, w * 0.6, h * 0.72);
  archPath(ctx, bx + w * 0.2, y, w * 0.6, h * 0.72);
  ctx.fill();
}

/** An arch standing on y (left edge x, w wide, h tall) as its own subpath. */
function archPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + r);
  ctx.arc(x + r, y - h + r, r, Math.PI, Math.PI * 2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- the pool and its bridge

export function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = horizon(s);
  const x0 = cx + POOL.x0 * u;
  const x1 = cx + POOL.x1 * u;
  const deck = hz + TRACK * u;
  const water = hz + COURSE * u;
  // Water in the gap, down to the ground course, with a lit ripple line.
  ctx.fillStyle = tone.water;
  ctx.fillRect(x0 - 1, water - u * 0.014, x1 - x0 + 2, u * 0.016);
  ctx.fillStyle = tone.waterLit;
  ctx.fillRect(x0 + u * 0.012, water - u * 0.011, (x1 - x0) * 0.35, u * 0.003);
  // The arch block under the deck: a block with a round opening.
  const r = (x1 - x0) * 0.34;
  const mid = (x0 + x1) / 2;
  const toy = tone.toys[0];
  ctx.fillStyle = toy.body;
  ctx.beginPath();
  ctx.moveTo(x0, water);
  ctx.lineTo(x0, deck);
  ctx.lineTo(x1, deck);
  ctx.lineTo(x1, water);
  ctx.lineTo(mid + r, water);
  ctx.arc(mid, water, r, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // The plank deck on top, a little wider than the gap.
  const plank = tone.toys[1];
  ctx.fillStyle = plank.body;
  ctx.beginPath();
  block(ctx, x0 - u * DECK, deck - u * 0.014, x1 - x0 + u * DECK * 2, u * 0.016, u * 0.005);
  ctx.fill();
  ctx.fillStyle = plank.light;
  ctx.fillRect(x0 - u * (DECK - 0.005), deck - u * 0.012, x1 - x0 + u * (DECK - 0.005) * 2, u * 0.004);
}

// ---------------------------------------------------------------- lollipop trees far off

/** Far lollipop trees: x (u), the top they stand on (u from the horizon), canopy size (u). */
const FAR_TREES = [
  { x: -0.455, on: TRACK - STEP * 2, r: 0.017 },
  { x: -0.27, on: TRACK - STEP * 2, r: 0.013 },
  { x: 0.47, on: TRACK - STEP * 2, r: 0.015 },
] as const;

export function farTrees(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = horizon(s);
  ctx.fillStyle = tone.farWood;
  ctx.beginPath();
  for (const t of FAR_TREES) ctx.rect(cx + t.x * u - u * 0.002, hz + t.on * u - t.r * u * 2.2, u * 0.004, t.r * u * 2.2);
  ctx.fill();
  ctx.fillStyle = tone.farLeaf;
  ctx.beginPath();
  for (const t of FAR_TREES) circle(ctx, cx + t.x * u, hz + t.on * u - t.r * u * 2.4, t.r * u);
  ctx.fill();
  ctx.fillStyle = tone.farLeafLit;
  ctx.beginPath();
  for (const t of FAR_TREES) circle(ctx, cx + t.x * u - t.r * u * 0.3, hz + t.on * u - t.r * u * 2.75, t.r * u * 0.38);
  ctx.fill();
}

// ---------------------------------------------------------------- meadow

/** The meadow in front of the hills, in two flat bands: lighter far off, deeper near. */
function meadow(ctx: Ctx, s: Scene, bottom: number): void {
  const u = s.u;
  const hz = horizon(s);
  const y0 = hz + FRONT_BASE * u;
  const y1 = hz + 0.14 * u;
  ctx.fillStyle = MEADOW_LIGHT;
  ctx.fillRect(0, y0, s.cssW, Math.max(0, Math.min(bottom, y1) - y0));
  if (bottom > y1) {
    ctx.fillStyle = MEADOW;
    ctx.fillRect(0, y1, s.cssW, bottom - y1);
  }
}

/** Where the land stops being sky (its highest flat line): the sky is painted down to here. */
export function landSkyBottom(s: Scene): number {
  return horizon(s) + s.u * BACK_BASE + 1;
}

/** The land, back to front, down to `bottom` (the sea covers the rest). */
export function farLand(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  backRow(ctx, s, tone, bottom);
  rainbow(ctx, s, tone);
  town(ctx, s, tone);
  castle(ctx, s, tone);
  launchPad(ctx, s, tone);
  train(ctx, s, tone);
  course(ctx, s, tone, bottom);
  frontRow(ctx, s, tone);
  track(ctx, s, tone);
  portals(ctx, s, tone);
  bridge(ctx, s, tone);
  farTrees(ctx, s, tone);
  meadow(ctx, s, bottom);
}

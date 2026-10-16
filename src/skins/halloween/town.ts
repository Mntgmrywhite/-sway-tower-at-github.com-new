import { alpha, hash, mix, neonStroke, type Ctx } from "../../neon/draw";
import type { Scene } from "../skin";
import { AMBER, CANDLE, GREEN, INK, VIOLET } from "./common";

// The haunted town on the horizon: one continuous skyline of crooked houses, a church with a
// spire, a dead tree, and the haunted mansion with its tower. Every building stands on the
// horizon line (each outline is closed along it), filled dark and rimmed in violet neon, with
// flickering lit windows.
//
// Layout is precomputed once, in units of u measured from the screen center (y up from the horizon).

type Kind = "house" | "church" | "mansion";

interface Bldg {
  kind: Kind;
  x0: number;
  x1: number;
  /** Wall height and roof height. */
  h: number;
  roof: number;
  /** Sideways lean of the walls, and how far off center the peak sits (fraction of width). */
  lean: number;
  skew: number;
  /** Chimney: 0 for none, under 0.5 on the left roof slope, else on the right (see `chimSpot`). */
  chim: number;
  /** True when this building shares a wall with the one to its left. */
  joined: boolean;
}

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  green: boolean;
}

const WINDOWS: Win[] = [];

function house(x0: number, x1: number, h: number, roof: number, lean: number, chim: number, joined: boolean, seed: number): Bldg {
  const w = x1 - x0;
  const n = w > 0.065 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (hash(seed + 20 + i) < 0.3) continue;
    const fx = n === 1 ? 0.5 : 0.3 + i * 0.4;
    WINDOWS.push({
      x: x0 + w * fx + lean * 0.5,
      y: h * (0.4 + hash(seed + 30 + i) * 0.25),
      w: 0.016,
      h: 0.02,
      seed: seed * 3 + i,
      green: hash(seed + 40 + i) > 0.85,
    });
  }
  return { kind: "house", x0, x1, h, roof, lean, skew: (hash(seed + 7) - 0.5) * 0.25, chim, joined };
}

function landmark(kind: Kind, x0: number, x1: number, h: number, roof: number): Bldg {
  return { kind, x0, x1, h, roof, lean: 0, skew: 0, chim: 0, joined: false };
}

const CHURCH_X = -0.39;
const MANSION_X = 0.15;
const MANSION_W = 0.265;

// Hand-placed middle of the skyline (what a phone shows): the church left, the mansion right.
const MIDDLE: Bldg[] = [
  house(-0.53, -0.455, 0.085, 0.05, 0.012, 0.7, false, 1),
  house(-0.455, -0.405, 0.055, 0.035, -0.01, 0, true, 2),
  landmark("church", CHURCH_X, -0.27, 0.075, 0.045),
  house(-0.27, -0.205, 0.062, 0.04, 0.012, 0.28, true, 3),
  house(-0.105, -0.045, 0.045, 0.034, -0.01, 0, false, 4),
  house(-0.045, 0.028, 0.07, 0.046, 0.01, 0.74, true, 5),
  house(0.028, 0.085, 0.05, 0.032, -0.014, 0, true, 6),
  landmark("mansion", MANSION_X, MANSION_X + MANSION_W, 0.115, 0.055),
  house(0.43, 0.5, 0.075, 0.045, -0.012, 0.3, false, 7),
  house(0.5, 0.56, 0.05, 0.035, 0.01, 0, true, 8),
];

/** Hashed (deterministic) houses out to either side, for screens wider than a phone. */
function filler(dir: 1 | -1, start: number, neighbor: Bldg): Bldg[] {
  const out: Bldg[] = [];
  let edge = start;
  let next = neighbor;
  for (let i = 0; Math.abs(edge) < 1.7; i++) {
    const seed = 100 + i * 7 + (dir === 1 ? 500 : 0);
    const gap = hash(seed) < 0.35 ? 0.02 + hash(seed + 1) * 0.04 : 0;
    const w = 0.05 + hash(seed + 2) * 0.04;
    const h = 0.04 + hash(seed + 3) * 0.05;
    const chim = hash(seed + 4) > 0.6 ? 0.25 + hash(seed + 5) * 0.5 : 0;
    const lean = (hash(seed + 6) - 0.5) * 0.03;
    if (dir === 1) {
      out.push(house(edge + gap, edge + gap + w, h, w * 0.6, lean, chim, gap === 0, seed));
      edge += gap + w;
    } else {
      const b = house(edge - gap - w, edge - gap, h, w * 0.6, lean, chim, false, seed);
      next.joined = gap === 0;
      out.unshift(b);
      next = b;
      edge -= gap + w;
    }
  }
  return out;
}

const TOWN: Bldg[] = [
  ...filler(-1, -0.53, MIDDLE[0]!),
  ...MIDDLE,
  ...filler(1, 0.56, MIDDLE[MIDDLE.length - 1]!),
];

// Church windows: two in the nave, one up the tower.
WINDOWS.push(
  { x: -0.326, y: 0.03, w: 0.012, h: 0.03, seed: 61, green: false },
  { x: -0.29, y: 0.03, w: 0.012, h: 0.03, seed: 62, green: false },
  { x: -0.366, y: 0.1, w: 0.012, h: 0.022, seed: 63, green: false },
);
// Mansion windows: two floors, the gable, and three up the tower (the top one a mad-lab green).
for (const fx of [0.09, 0.22, 0.35, 0.48, 0.92]) {
  for (const [i, fy] of [0.025, 0.074].entries()) {
    WINDOWS.push({ x: MANSION_X + MANSION_W * fx, y: fy, w: 0.018, h: 0.026, seed: 70 + fx * 40 + i * 13, green: false });
  }
}
{
  const tm = MANSION_X + MANSION_W * 0.72;
  WINDOWS.push(
    { x: MANSION_X + MANSION_W * 0.38, y: 0.172, w: 0.012, h: 0.017, seed: 91, green: false },
    { x: tm, y: 0.05, w: 0.018, h: 0.028, seed: 92, green: false },
    { x: tm, y: 0.115, w: 0.018, h: 0.028, seed: 93, green: false },
    { x: tm, y: 0.182, w: 0.018, h: 0.028, seed: 94, green: true },
  );
}

// A gnarled dead tree between the church and the houses. Segments in u, y up from the horizon.
interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  level: number;
}
const TREE: Seg[] = [];
function grow(x: number, y: number, ang: number, len: number, depth: number, seed: number): void {
  const a = Math.max(-1.45, Math.min(1.45, ang));
  const x1 = x + Math.sin(a) * len;
  const y1 = y + Math.cos(a) * len;
  // A kink halfway makes every limb crooked.
  const mx = (x + x1) / 2 + (hash(seed + 11) - 0.5) * len * 0.35;
  const my = (y + y1) / 2;
  const level = depth >= 3 ? 0 : depth === 2 ? 1 : 2;
  TREE.push({ x0: x, y0: y, x1: mx, y1: my, level }, { x0: mx, y0: my, x1, y1, level });
  if (depth === 0) return;
  for (const side of [-1, 1]) {
    const spread = 0.35 + hash(seed * 3 + side) * 0.45;
    const nextLen = len * (0.62 + hash(seed + side + 9) * 0.18);
    grow(x1, y1, a + side * spread + (hash(seed + 5) - 0.5) * 0.3, nextLen, depth - 1, seed * 2 + side + 3);
  }
}
grow(0, 0, -0.06, 0.05, 4, 1);
const TREE_X = -0.155;
const TREE_WIDTH = [0.011, 0.006, 0.0032];
const TREE_GLOW = alpha(VIOLET, 0.16);

// ---------------------------------------------------------------- drawing

/** How far along its slope (eave to peak, or peak to eave) a chimney sits, kept off the ends. */
function chimSpot(chim: number): number {
  const f = chim < 0.5 ? chim * 2 : (chim - 0.5) * 2;
  return Math.min(0.7, Math.max(0.3, f));
}

/** Chimney poking up through a roof slope from (ax, ay) to (bx, by), `f` of the way along it. */
function chimney(ctx: Ctx, ax: number, ay: number, bx: number, by: number, f: number, u: number): void {
  const w = u * 0.014;
  const c = ax + (bx - ax) * f;
  const xa = c - w / 2;
  const xb = c + w / 2;
  if (xa <= Math.min(ax, bx) || xb >= Math.max(ax, bx)) return;
  const at = (x: number) => ay + ((by - ay) * (x - ax)) / (bx - ax);
  const top = Math.min(at(xa), at(xb)) - u * 0.028;
  ctx.lineTo(xa, at(xa));
  ctx.lineTo(xa, top);
  ctx.lineTo(xb, top);
  ctx.lineTo(xb, at(xb));
}

/** Roof line of one building, from its left wall top to its right wall top. */
function profile(ctx: Ctx, b: Bldg, cx: number, base: number, u: number): void {
  const x0 = cx + b.x0 * u;
  const x1 = cx + b.x1 * u;
  const w = x1 - x0;
  const top = base - b.h * u;

  if (b.kind === "house") {
    const lean = b.lean * u;
    const eave = u * 0.006;
    const lx = x0 + lean;
    const rx = x1 + lean;
    const peakX = x0 + w * (0.5 + b.skew) + lean * 1.6;
    const peakY = top - b.roof * u;
    const eaveY = top + eave * 0.4;
    ctx.lineTo(lx, top);
    ctx.lineTo(lx - eave, eaveY);
    if (b.chim > 0 && b.chim < 0.5) chimney(ctx, lx - eave, eaveY, peakX, peakY, chimSpot(b.chim), u);
    ctx.lineTo(peakX, peakY);
    if (b.chim >= 0.5) chimney(ctx, peakX, peakY, rx + eave, eaveY, chimSpot(b.chim), u);
    ctx.lineTo(rx + eave, eaveY);
    ctx.lineTo(rx, top);
    return;
  }

  if (b.kind === "church") {
    const tw = u * 0.048;
    const tTop = base - u * 0.15;
    const spire = u * 0.11;
    ctx.lineTo(x0, tTop);
    ctx.lineTo(x0 - u * 0.004, tTop);
    ctx.lineTo(x0 + tw / 2, tTop - spire);
    ctx.lineTo(x0 + tw + u * 0.004, tTop);
    ctx.lineTo(x0 + tw, tTop);
    ctx.lineTo(x0 + tw, top);
    ctx.lineTo(x0 + tw + (w - tw) / 2, top - b.roof * u);
    ctx.lineTo(x1 + u * 0.005, top + u * 0.002);
    ctx.lineTo(x1, top);
    return;
  }

  // Mansion: hipped roof with chimneys and a center gable; a tower with a witch-hat cone.
  const ridge = top - b.roof * u;
  const e = u * 0.008;
  const tx0 = x0 + w * 0.6;
  const tx1 = x0 + w * 0.84;
  const tTop = base - u * 0.235;
  const tm = (tx0 + tx1) / 2;
  const tip = tTop - u * 0.085;
  ctx.lineTo(x0, top);
  ctx.lineTo(x0 - e, top);
  ctx.lineTo(x0 + w * 0.1, ridge);
  ctx.lineTo(x0 + w * 0.17, ridge);
  ctx.lineTo(x0 + w * 0.17, ridge - u * 0.04);
  ctx.lineTo(x0 + w * 0.22, ridge - u * 0.04);
  ctx.lineTo(x0 + w * 0.22, ridge);
  ctx.lineTo(x0 + w * 0.3, ridge);
  ctx.lineTo(x0 + w * 0.38, ridge - u * 0.048);
  ctx.lineTo(x0 + w * 0.46, ridge);
  ctx.lineTo(tx0, ridge);
  ctx.lineTo(tx0, tTop);
  ctx.lineTo(tx0 - e, tTop);
  ctx.quadraticCurveTo(tm - u * 0.012, tTop - u * 0.03, tm, tip);
  ctx.lineTo(tm, tip - u * 0.03); // finial
  ctx.lineTo(tm, tip);
  ctx.quadraticCurveTo(tm + u * 0.012, tTop - u * 0.03, tx1 + e, tTop);
  ctx.lineTo(tx1, tTop);
  ctx.lineTo(tx1, ridge);
  ctx.lineTo(x0 + w * 0.88, ridge);
  ctx.lineTo(x0 + w * 0.88, ridge - u * 0.032);
  ctx.lineTo(x0 + w * 0.925, ridge - u * 0.032);
  ctx.lineTo(x0 + w * 0.925, ridge);
  ctx.lineTo(x1 - w * 0.05, ridge);
  ctx.lineTo(x1 + e, top);
  ctx.lineTo(x1, top);
}

/** Each window goes dark for a while now and then. */
function lit(w: Win, t: number): boolean {
  return Math.sin(t * 0.45 + w.seed * 2.7) >= -0.75;
}

/** Lit window panes (or their glow, when `grow` > 0) for one color, as one path. */
function windowRects(ctx: Ctx, cx: number, base: number, s: Scene, green: boolean, grow: number): void {
  const u = s.u;
  ctx.beginPath();
  for (const w of WINDOWS) {
    if (w.green !== green || !lit(w, s.t)) continue;
    const x = cx + w.x * u;
    if (x < -u * 0.05 || x > s.cssW + u * 0.05) continue;
    const ww = w.w * u;
    const wh = w.h * u;
    ctx.rect(x - ww / 2 - grow, base - w.y * u - wh - grow, ww + grow * 2, wh + grow * 2);
  }
}

export function town(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  if (hy - u * 0.45 > s.cssH) return;
  const base = hy + 1;
  const cx = s.cssW / 2;
  const t = s.t;
  const rim = Math.max(1.1, u * 0.0034);

  // The dead tree, behind the houses: fat violet stroke, then the dark branch on top.
  const tx = cx + TREE_X * u;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let pass = 0; pass < 3; pass++) {
    const extra = pass === 0 ? rim * 4 : pass === 1 ? rim * 2 : 0;
    ctx.strokeStyle = pass === 0 ? TREE_GLOW : pass === 1 ? VIOLET : INK;
    for (let level = 0; level < 3; level++) {
      ctx.beginPath();
      for (const sg of TREE) {
        if (sg.level !== level) continue;
        ctx.moveTo(tx + sg.x0 * u, base - sg.y0 * u);
        ctx.lineTo(tx + sg.x1 * u, base - sg.y1 * u);
      }
      ctx.lineWidth = (TREE_WIDTH[level] ?? 0.004) * u + extra;
      ctx.stroke();
    }
  }
  ctx.restore();

  // Skyline: one outline per run of joined buildings, closed along the horizon. The rim goes
  // down first and the dark fill on top, so only its outer half shows: a clean outline around
  // each run, with no seams inside where joined (differently leaning) houses overlap.
  ctx.beginPath();
  let open = false;
  let lastX = 0;
  for (const b of TOWN) {
    const x0 = cx + b.x0 * u;
    const x1 = cx + b.x1 * u;
    if (x1 < -u * 0.05 || x0 > s.cssW + u * 0.05) continue;
    if (open && !b.joined) {
      ctx.lineTo(lastX, base);
      ctx.closePath();
      open = false;
    }
    if (!open) {
      ctx.moveTo(x0, base);
      open = true;
    }
    profile(ctx, b, cx, base, u);
    lastX = x1;
  }
  if (open) {
    ctx.lineTo(lastX, base);
    ctx.closePath();
  }
  const fill = ctx.createLinearGradient(0, hy - u * 0.3, 0, hy);
  fill.addColorStop(0, "#170a2a");
  fill.addColorStop(1, INK);
  neonStroke(ctx, VIOLET, rim * 2, 1.5);
  ctx.fillStyle = fill;
  ctx.fill();

  // Cross on the church spire
  const sx = cx + (CHURCH_X + 0.024) * u;
  const sy = base - u * 0.26;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - u * 0.03);
  ctx.moveTo(sx - u * 0.01, sy - u * 0.019);
  ctx.lineTo(sx + u * 0.01, sy - u * 0.019);
  neonStroke(ctx, AMBER, Math.max(1, u * 0.003), 3);

  // Lit windows: a warm glow, the pane, then dark mullions. Some go dark for a while.
  const flick = 0.82 + 0.18 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  for (let g = 0; g < 2; g++) {
    const green = g === 1;
    const color = green ? GREEN : AMBER;
    windowRects(ctx, cx, base, s, green, u * 0.007);
    ctx.fillStyle = alpha(color, 0.22 * flick);
    ctx.fill();
    windowRects(ctx, cx, base, s, green, 0);
    ctx.fillStyle = alpha(mix(color, CANDLE, 0.35), 0.75 + 0.25 * flick);
    ctx.fill();
  }
  ctx.beginPath();
  for (const w of WINDOWS) {
    const x = cx + w.x * u;
    if (x < -u * 0.05 || x > s.cssW + u * 0.05 || w.w < 0.015 || !lit(w, t)) continue;
    const y = base - w.y * u;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - w.h * u);
    ctx.moveTo(x - (w.w * u) / 2, y - w.h * u * 0.55);
    ctx.lineTo(x + (w.w * u) / 2, y - w.h * u * 0.55);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.stroke();

  // Low mist along the foot of the town
  const mist = ctx.createLinearGradient(0, hy - u * 0.05, 0, hy);
  mist.addColorStop(0, alpha("#7a3bd0", 0));
  mist.addColorStop(1, alpha("#7a3bd0", 0.3));
  ctx.fillStyle = mist;
  ctx.fillRect(0, hy - u * 0.05, s.cssW, u * 0.05 + 1);
}

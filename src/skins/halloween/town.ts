import { hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PALETTE } from "./common";

// The haunted town on the horizon: one continuous skyline of crooked houses, a church with a
// spire, a gnarled dead tree, and the haunted mansion with its witch-hat tower. Everything is
// far away, so it is one faded flat color with no outline; only the lit windows are lighter.
// Every building stands on the horizon line (each outline is closed along it), and the cloud
// bank in front hides the foot of the town, so nothing ever floats.
//
// Layout is precomputed once, in units of u measured from the screen center (y up from the
// horizon). The mansion sits just right of the tower so its tower still peeks out beside the
// bars as they climb; the church and the dead tree are left of center, above the low clouds.

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

const CHURCH_X = -0.17;
const CHURCH_W = 0.13;
const MANSION_X = 0.03;
const MANSION_W = 0.3;
/** Mansion tower, as fractions of the mansion's width. */
const TOWER_L = 0.68;
const TOWER_R = 0.9;

// Hand-placed middle of the skyline (what a phone shows).
const MIDDLE: Bldg[] = [
  house(-0.5, -0.43, 0.085, 0.05, 0.012, 0.7, false, 1),
  house(-0.43, -0.37, 0.058, 0.036, -0.01, 0, true, 2),
  house(-0.37, -0.3, 0.07, 0.044, 0.01, 0.3, true, 9),
  landmark("church", CHURCH_X, CHURCH_X + CHURCH_W, 0.075, 0.045),
  house(-0.04, MANSION_X, 0.095, 0.05, 0.008, 0.74, true, 5),
  landmark("mansion", MANSION_X, MANSION_X + MANSION_W, 0.12, 0.055),
  house(0.36, 0.43, 0.075, 0.045, -0.012, 0.3, false, 7),
  house(0.43, 0.49, 0.05, 0.035, 0.01, 0, true, 8),
  house(0.49, 0.56, 0.068, 0.04, -0.01, 0.65, true, 10),
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

const TOWN: Bldg[] = [...filler(-1, -0.5, MIDDLE[0]!), ...MIDDLE, ...filler(1, 0.56, MIDDLE[MIDDLE.length - 1]!)];

// Church windows: two tall ones in the nave, one up the tower.
WINDOWS.push(
  { x: CHURCH_X + 0.068, y: 0.03, w: 0.012, h: 0.03, seed: 61, green: false },
  { x: CHURCH_X + 0.102, y: 0.03, w: 0.012, h: 0.03, seed: 62, green: false },
  { x: CHURCH_X + 0.024, y: 0.1, w: 0.012, h: 0.022, seed: 63, green: false },
);
// Mansion windows: two floors across the main house, and three up the tower (the top one a
// mad-lab green).
for (const fx of [0.1, 0.24, 0.38, 0.52]) {
  for (const [i, fy] of [0.025, 0.075].entries()) {
    WINDOWS.push({ x: MANSION_X + MANSION_W * fx, y: fy, w: 0.018, h: 0.026, seed: 70 + fx * 40 + i * 13, green: false });
  }
}
{
  const tm = MANSION_X + MANSION_W * ((TOWER_L + TOWER_R) / 2);
  WINDOWS.push(
    { x: MANSION_X + MANSION_W * 0.38, y: 0.178, w: 0.012, h: 0.017, seed: 91, green: false },
    { x: tm, y: 0.055, w: 0.018, h: 0.028, seed: 92, green: false },
    { x: tm, y: 0.125, w: 0.018, h: 0.028, seed: 93, green: false },
    { x: tm, y: 0.195, w: 0.018, h: 0.028, seed: 94, green: true },
  );
}

// A gnarled dead tree left of the church, under the moon. Segments in u, y up from the horizon.
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
grow(0, 0, -0.06, 0.095, 4, 1);
const TREE_X = -0.245;
const TREE_WIDTH = [0.018, 0.0095, 0.005];

const WINDOW = mix(PALETTE.far, "#ffd27a", 0.42);
const WINDOW_GREEN = mix(PALETTE.far, "#a8ff6a", 0.42);

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
  const tx0 = x0 + w * TOWER_L;
  const tx1 = x0 + w * TOWER_R;
  const tTop = base - u * 0.25;
  const tm = (tx0 + tx1) / 2;
  const tip = tTop - u * 0.09;
  ctx.lineTo(x0, top);
  ctx.lineTo(x0 - e, top);
  ctx.lineTo(x0 + w * 0.1, ridge);
  ctx.lineTo(x0 + w * 0.15, ridge);
  ctx.lineTo(x0 + w * 0.15, ridge - u * 0.04);
  ctx.lineTo(x0 + w * 0.2, ridge - u * 0.04);
  ctx.lineTo(x0 + w * 0.2, ridge);
  ctx.lineTo(x0 + w * 0.3, ridge);
  ctx.lineTo(x0 + w * 0.38, ridge - u * 0.05);
  ctx.lineTo(x0 + w * 0.46, ridge);
  ctx.lineTo(x0 + w * 0.56, ridge);
  ctx.lineTo(x0 + w * 0.56, ridge - u * 0.032);
  ctx.lineTo(x0 + w * 0.6, ridge - u * 0.032);
  ctx.lineTo(x0 + w * 0.6, ridge);
  ctx.lineTo(tx0, ridge);
  ctx.lineTo(tx0, tTop);
  ctx.lineTo(tx0 - e, tTop);
  ctx.quadraticCurveTo(tm - u * 0.012, tTop - u * 0.03, tm, tip);
  ctx.lineTo(tm, tip - u * 0.03); // finial
  ctx.lineTo(tm, tip);
  ctx.quadraticCurveTo(tm + u * 0.012, tTop - u * 0.03, tx1 + e, tTop);
  ctx.lineTo(tx1, tTop);
  ctx.lineTo(tx1, ridge);
  ctx.lineTo(x1 - w * 0.03, ridge);
  ctx.lineTo(x1 + e, top);
  ctx.lineTo(x1, top);
}

/** Each window goes dark for a while now and then. */
function lit(w: Win, t: number): boolean {
  return Math.sin(t * 0.45 + w.seed * 2.7) >= -0.75;
}

export function town(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const hy = s.horizonY;
  if (hy - u * 0.45 > s.cssH) return;
  const base = hy + 1;
  const cx = s.cssW / 2;
  const t = s.t;
  const far = PALETTE.far;

  // The dead tree, behind the houses
  const tx = cx + TREE_X * u;
  ctx.strokeStyle = far;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let level = 0; level < 3; level++) {
    ctx.beginPath();
    for (const sg of TREE) {
      if (sg.level !== level) continue;
      ctx.moveTo(tx + sg.x0 * u, base - sg.y0 * u);
      ctx.lineTo(tx + sg.x1 * u, base - sg.y1 * u);
    }
    ctx.lineWidth = Math.max(1, (TREE_WIDTH[level] ?? 0.004) * u);
    ctx.stroke();
  }

  // Skyline: one outline per run of joined buildings, closed along the horizon, one fill.
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
  // Cross on the church spire, in the same path
  const sx = cx + (CHURCH_X + 0.024) * u;
  const sy = base - u * 0.255;
  const bar = Math.max(1, u * 0.005);
  ctx.rect(sx - bar / 2, sy - u * 0.032, bar, u * 0.034);
  ctx.rect(sx - u * 0.011, sy - u * 0.022, u * 0.022, bar);
  ctx.fillStyle = far;
  ctx.fill();

  // Lit windows, a faded warm glow (and one green), some going dark for a while.
  for (let g = 0; g < 2; g++) {
    const green = g === 1;
    ctx.beginPath();
    for (const w of WINDOWS) {
      if (w.green !== green || !lit(w, t)) continue;
      const x = cx + w.x * u;
      if (x < -u * 0.05 || x > s.cssW + u * 0.05) continue;
      const ww = w.w * u;
      const wh = w.h * u;
      ctx.rect(x - ww / 2, base - w.y * u - wh, ww, wh);
    }
    ctx.fillStyle = green ? WINDOW_GREEN : WINDOW;
    ctx.fill();
  }
  // Mullions on the bigger panes
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
  ctx.strokeStyle = far;
  ctx.lineWidth = Math.max(0.8, u * 0.0024);
  ctx.lineCap = "butt";
  ctx.stroke();
}

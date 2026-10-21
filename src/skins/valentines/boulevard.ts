import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { couple } from "./couple";
import { landLine } from "./far";
import { archPath, block, dashes, heartPath, NO_DASH } from "./shapes";
import type { Tone } from "./tone";

// The boulevard across the lawn: one Haussmann block standing on the land's line (far.ts: the
// horizon, then the cloud sea once it has gathered), Paris in 1900, with its shops set into the
// ground floor. Honey limestone fronts with a fine plum contour, every floor's windows tall and
// framed in lit stone, blue with the sky by day and lit one by one at dusk; a continuous iron
// balcony along the first floor and the attic, little balconies at the second; a lit cornice;
// blue-grey zinc mansards with round-headed dormers and chimney stacks with terracotta pots, and
// geraniums in boxes along the first floor's balcony; a rounded corner at the block's left end,
// on the avenue, crowned with a little zinc dome. On the left, round the
// corner from the avenue (far.ts), the chocolatier: rose woodwork, a gold heart on its fascia, a
// striped awning over the window where our own bonbons stand in rows, a door under a fanlight of
// stained glass. Behind the tower a quiet front, its carriage arch, windows and lines all a shade
// off its own stone and no contour but a soft one, so the band behind the tower stays calm. Then
// the florist, whose stall stands out on the pavement under an arch of Guimard's green ironwork,
// a canopy of mint and cream gores, buckets of roses and tulips on its counter; and on the right
// the café in sage woodwork, a band of stained glass over its window, a glass marquise on curling
// iron brackets over its terrace, where the couple at a table exchange a card (couple.ts); at the
// block's end a lamp of our own in the Metro manner, its stem curling over to hang a glass bud.
// Strings of lights sag along the shopfronts to the lamp; they, the lamp, the windows and the
// stained glass come on at dusk (behind the tower only a few windows, softly). Nothing here moves but the couple, out in the right lane.
//
// The block stops short of the screen's left side, where the cherub stands in the garden in
// front of the avenue and the sun sets: nothing may stand in its way.
//
// Positions are in u from the screen center, heights in u above the land's line.

/** The block's ends (u from center) and the height its fronts hide the city behind up to (the cornice). */
export const BLOCK_X0 = -0.27;
export const BLOCK_X1 = 0.445;

/** The block's houses: their sides (u from center), window bays, whether it turns the block's corner (rounded, at its left end) and whether it is the quiet one behind the tower. */
interface House {
  x0: number;
  x1: number;
  bays: number;
  corner: boolean;
  quiet: boolean;
}
const HOUSES: readonly House[] = [
  { x0: BLOCK_X0, x1: -0.1, bays: 4, corner: true, quiet: false },
  { x0: -0.1, x1: 0.1, bays: 5, corner: false, quiet: true },
  { x0: 0.1, x1: 0.262, bays: 4, corner: false, quiet: false },
  { x0: 0.262, x1: BLOCK_X1, bays: 5, corner: false, quiet: false },
];
/** The floors: the shopfronts' top (the first floor's balcony runs along it), the first floor's top (little balconies at the second's windows), the second's (the attic's balcony), the cornice; the mansard over it, and the chimneys' tops. */
const GROUND = 0.088;
const FLOOR1 = GROUND + 0.046;
const FLOOR2 = FLOOR1 + 0.044;
export const CORNICE = FLOOR2 + 0.034;
const ROOF = CORNICE + 0.04;
const STACKS = ROOF + 0.02;
/** The rounded corner: its width, the top of its body, and its little dome's top and finial (u). */
const CORNER_W = 0.042;
const CORNER_TOP = CORNICE + 0.03;
const CORNER_DOME = CORNER_TOP + 0.044;
const CORNER_TIP = CORNER_DOME + 0.014;
/** The floors with windows: [foot, top] (u). */
const FLOORS = [
  [GROUND, FLOOR1],
  [FLOOR1, FLOOR2],
  [FLOOR2, CORNICE],
] as const;

/** The shops' places: the chocolatier's front (u from center), the florist's stall and the café. */
const CHOC_X0 = HOUSES[0]!.x0 + CORNER_W + 0.004;
const CHOC_X1 = HOUSES[0]!.x1 - 0.006;
export const STALL_X = 0.18;
const STALL_HW = 0.07;
/** The stall's iron arch: where its posts spring (u above the line) and its crown. */
const STALL_SPRING = 0.112;
const STALL_CROWN = 0.158;
const CAFE_X0 = HOUSES[3]!.x0 + 0.006;
const CAFE_X1 = HOUSES[3]!.x1 - 0.006;
/** The marquise over the café's terrace: its top and its scalloped lower edge (u above the line), its panes. */
const MARQUISE_TOP = 0.098;
const MARQUISE_LOW = 0.078;
const MARQUISE_PANES = 7;
/** The lamp at the row's end: its stem (u from center), how high it rises before it curls over, where the bud hangs and its size (u). */
export const LAMP_X = 0.478;
const LAMP_H = 0.126;
const BUD_X = 0.464;
const BUD_H = 0.11;
const BUD = 0.02;

/** The faint shadow under cornices and canopies. */
const SHADE = "rgba(60, 20, 70, 0.14)";

/** A house's bays (the corner's first): the x of each window's center (u from center) and its width (u), filled into `out`; how many. */
function bays(h: House, out: { x: number; w: number }[]): number {
  let x0 = h.x0;
  let n = 0;
  if (h.corner) {
    out[n]!.x = h.x0 + CORNER_W / 2;
    out[n++]!.w = CORNER_W;
    x0 += CORNER_W;
  }
  const rest = h.corner ? h.bays - 1 : h.bays;
  const bw = (h.x1 - x0) / rest;
  for (let i = 0; i < rest; i++) {
    out[n]!.x = x0 + bw * (i + 0.5);
    out[n++]!.w = bw;
  }
  return n;
}
const BAYS: { x: number; w: number }[] = Array.from({ length: 8 }, () => ({ x: 0, w: 0 }));

/** The colors a group of houses is drawn in: the lively fronts, or the quiet one behind the tower. */
interface Look {
  body: string;
  lit: string;
  shade: string;
  glass: string;
  roof: string;
  roofLit: string;
  roofShade: string;
  iron: string;
  edge: string;
  /** How strongly the lit windows glow (the quiet front's only softly). */
  glow: number;
}
const LIVELY: Look = { body: "", lit: "", shade: "", glass: "", roof: "", roofLit: "", roofShade: "", iron: "", edge: "", glow: 1 };
const QUIET: Look = { body: "", lit: "", shade: "", glass: "", roof: "", roofLit: "", roofShade: "", iron: "", edge: "", glow: 0.32 };

function looks(tone: Tone): void {
  LIVELY.body = tone.house;
  LIVELY.lit = tone.houseLit;
  LIVELY.shade = tone.houseShade;
  LIVELY.glass = tone.windowGlass;
  LIVELY.roof = tone.zinc;
  LIVELY.roofLit = tone.zincLit;
  LIVELY.roofShade = tone.zincShade;
  LIVELY.iron = tone.balcony;
  LIVELY.edge = tone.line;
  QUIET.body = tone.quiet;
  QUIET.lit = tone.quietLit;
  QUIET.shade = tone.quietLine;
  QUIET.glass = tone.quietGlass;
  QUIET.roof = tone.quietRoof;
  QUIET.roofLit = tone.quietRoof;
  QUIET.roofShade = tone.quietRoof;
  QUIET.iron = tone.quietLine;
  QUIET.edge = tone.quietEdge;
}

/** A house's outline (its front, the mansard over it, the corner's dome) as subpaths. */
function outline(ctx: Ctx, s: Scene, h: House): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const X = (x: number) => cx + x * u;
  const Y = (y: number) => hz - y * u;
  const inset = (ROOF - CORNICE) * u * 0.32;
  // The mansard, less the corner bay (which rises on its own).
  const r0 = h.corner ? X(h.x0 + CORNER_W) : X(h.x0);
  const r1 = X(h.x1);
  ctx.moveTo(X(h.x0), Y(0));
  ctx.lineTo(X(h.x0), Y(h.corner ? CORNER_TOP : CORNICE));
  if (h.corner) ctx.lineTo(r0, Y(CORNER_TOP));
  ctx.lineTo(r0 + (h.corner ? 0 : -u * 0.003), Y(CORNICE));
  ctx.lineTo(r0 + inset, Y(ROOF));
  ctx.lineTo(r1 - inset, Y(ROOF));
  ctx.lineTo(r1 + u * 0.003, Y(CORNICE));
  ctx.lineTo(X(h.x1), Y(0));
  ctx.closePath();
}

/** The corner bay's little dome (and its lantern) as a subpath. */
function cornerDome(ctx: Ctx, s: Scene, h: House): void {
  const u = s.u;
  const hz = landLine(s);
  const x = s.cssW / 2 + (h.x0 + CORNER_W / 2) * u;
  const w = CORNER_W * u * 0.5;
  const y = hz - CORNER_TOP * u;
  const top = hz - CORNER_DOME * u;
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.02, y - (y - top) * 0.6, x - w * 0.5, top, x, top);
  ctx.bezierCurveTo(x + w * 0.5, top, x + w * 1.02, y - (y - top) * 0.6, x + w, y);
  ctx.closePath();
  ctx.rect(x - u * 0.0018, hz - CORNER_TIP * u, u * 0.0036, (CORNER_TIP - CORNER_DOME) * u + 1);
}

/** The left edge (px) of a house's chimney stack: at its left party wall (past the corner bay), or (`k` 1) its right. */
function stackX(s: Scene, h: House, k: number): number {
  const u = s.u;
  const cx = s.cssW / 2;
  return k ? cx + h.x1 * u - u * 0.018 : cx + (h.x0 + (h.corner ? CORNER_W : 0) + 0.006) * u;
}

/**
 * The houses in `list` with the look `L`, batched color by color: the limestone fronts and the
 * corner bays, their shade (under the cornice, the corners' far halves, the returns), the lit
 * cornice, ledges and window surrounds, the windows (with the sky's glint), the balconies, the
 * mansards with their dormers and the corners' domes, the chimneys and their pots, the windows lit
 * at dusk, and the contour round each house.
 */
function houses(ctx: Ctx, s: Scene, tone: Tone, list: readonly House[], L: Look): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const X = (x: number) => cx + x * u;
  const Y = (y: number) => hz - y * u;
  // The fronts.
  ctx.fillStyle = L.body;
  ctx.beginPath();
  for (const h of list) outline(ctx, s, h);
  ctx.fill();
  // The mansards and the corners' domes, the lit slope at each roof's sunward end and its ridge.
  ctx.fillStyle = L.roof;
  ctx.beginPath();
  for (const h of list) {
    const r0 = h.corner ? X(h.x0 + CORNER_W) : X(h.x0) - u * 0.003;
    const r1 = X(h.x1) + u * 0.003;
    const inset = (ROOF - CORNICE) * u * 0.32;
    ctx.moveTo(r0, Y(CORNICE));
    ctx.lineTo(r0 + inset, Y(ROOF));
    ctx.lineTo(r1 - inset, Y(ROOF));
    ctx.lineTo(r1, Y(CORNICE));
    ctx.closePath();
    if (h.corner) cornerDome(ctx, s, h);
  }
  ctx.fill();
  ctx.fillStyle = L.roofLit;
  ctx.beginPath();
  for (const h of L.roofLit === L.roof ? NONE : list) {
    const r0 = h.corner ? X(h.x0 + CORNER_W) : X(h.x0) - u * 0.003;
    const r1 = X(h.x1) + u * 0.003;
    const inset = (ROOF - CORNICE) * u * 0.32;
    ctx.moveTo(r0, Y(CORNICE));
    ctx.lineTo(r0 + inset, Y(ROOF));
    ctx.lineTo(r0 + inset + u * 0.008, Y(ROOF));
    ctx.lineTo(r0 + u * 0.008, Y(CORNICE));
    ctx.closePath();
    ctx.rect(r0 + inset, Y(ROOF), r1 - r0 - inset * 2, Math.max(0.8, u * 0.0025));
    if (h.corner) {
      const x = cx + (h.x0 + CORNER_W / 2) * u;
      const w = CORNER_W * u * 0.5;
      const y = Y(CORNER_TOP);
      const top = Y(CORNER_DOME);
      ctx.moveTo(x - w, y);
      ctx.bezierCurveTo(x - w * 1.02, y - (y - top) * 0.6, x - w * 0.5, top, x, top);
      ctx.bezierCurveTo(x - w * 0.45, top + (y - top) * 0.2, x - w * 0.6, y - (y - top) * 0.3, x - w * 0.5, y);
      ctx.closePath();
    }
  }
  ctx.fill();
  // The shaded slope at each roof's far end.
  ctx.fillStyle = L.roofShade;
  ctx.beginPath();
  for (const h of L.roofShade === L.roof ? NONE : list) {
    const r1 = X(h.x1) + u * 0.003;
    const inset = (ROOF - CORNICE) * u * 0.32;
    ctx.moveTo(r1, Y(CORNICE));
    ctx.lineTo(r1 - inset, Y(ROOF));
    ctx.lineTo(r1 - inset - u * 0.007, Y(ROOF));
    ctx.lineTo(r1 - u * 0.007, Y(CORNICE));
    ctx.closePath();
  }
  ctx.fill();
  // Shade: under the cornice and the balconies' slabs, the corner bays' far halves (rounded), each house's right return.
  ctx.fillStyle = L.shade;
  ctx.beginPath();
  for (const h of list) {
    const w = (h.x1 - h.x0) * u;
    ctx.rect(X(h.x0), Y(CORNICE) + u * 0.004, w, u * 0.004);
    for (const f of [GROUND, FLOOR2]) ctx.rect(X(h.x0), Y(f) + u * 0.0035, w, u * 0.0025);
    if (h.corner) ctx.rect(X(h.x0 + CORNER_W * 0.62), Y(CORNER_TOP), CORNER_W * 0.38 * u, (CORNER_TOP - GROUND) * u);
    ctx.rect(X(h.x1) - u * 0.004, Y(CORNICE) + u * 0.008, u * 0.004, (CORNICE - GROUND) * u - u * 0.008);
  }
  ctx.fill();
  // Lit stone: the stone surround of a dormer in every bay of the mansard and the chimney stacks
  // at the party walls; the cornice's top and the balcony slabs, the corner bays' near edges, every
  // window's surround (on the quiet front all of them barely a shade off its stone).
  ctx.fillStyle = L.lit;
  ctx.beginPath();
  for (const h of list) {
    const n = bays(h, BAYS);
    for (let i = 0; i < n; i++) {
      const b = BAYS[i]!;
      if (b.w === CORNER_W && h.corner) continue;
      archPath(ctx, X(b.x) - u * 0.008, Y(CORNICE + 0.002), u * 0.016, (ROOF - CORNICE - 0.008) * u);
    }
    ctx.rect(stackX(s, h, 0), Y(STACKS), u * 0.012, (STACKS - ROOF + 0.006) * u);
    if (!h.corner) ctx.rect(stackX(s, h, 1), Y(STACKS), u * 0.012, (STACKS - ROOF + 0.006) * u);
  }
  for (const h of L.lit === L.body ? NONE : list) {
    const w = (h.x1 - h.x0) * u;
    ctx.rect(X(h.x0) - u * 0.003, Y(CORNICE) - u * 0.002, w + u * 0.006, u * 0.006);
    for (const f of [GROUND, FLOOR1, FLOOR2]) ctx.rect(X(h.x0) - u * 0.002, Y(f) - u * 0.0015, w + u * 0.004, u * 0.0045);
    if (h.corner) {
      ctx.rect(X(h.x0) + u * 0.002, Y(CORNER_TOP), CORNER_W * 0.16 * u, (CORNER_TOP - GROUND) * u);
      ctx.rect(X(h.x0) - u * 0.002, Y(CORNER_TOP) - u * 0.002, CORNER_W * u + u * 0.004, u * 0.005);
    }
    const n = bays(h, BAYS);
    for (let i = 0; i < n; i++) {
      const b = BAYS[i]!;
      const ww = Math.min(b.w * 0.5, 0.024);
      for (let f = 0; f < FLOORS.length; f++) {
        const [foot, top] = FLOORS[f]!;
        const y0 = Y(top) + (top - foot) * u * 0.14;
        const y1 = Y(foot) - u * 0.004;
        ctx.rect(X(b.x - ww / 2) - u * 0.003, y0 - u * 0.003, ww * u + u * 0.006, y1 - y0 + u * 0.003);
        // A little pediment over the first floor's windows.
        if (f === 0) {
          ctx.moveTo(X(b.x - ww / 2) - u * 0.004, y0 - u * 0.004);
          ctx.lineTo(X(b.x), y0 - u * 0.011);
          ctx.lineTo(X(b.x + ww / 2) + u * 0.004, y0 - u * 0.004);
          ctx.closePath();
        }
      }
    }
  }
  ctx.fill();
  if (L === LIVELY) {
    ctx.fillStyle = tone.pot;
    ctx.beginPath();
    for (const h of list) {
      for (let k = 0; k < (h.corner ? 1 : 2); k++) {
        const x = stackX(s, h, k);
        ctx.rect(x + u * 0.001, Y(STACKS) - u * 0.006, u * 0.004, u * 0.006);
        ctx.rect(x + u * 0.007, Y(STACKS) - u * 0.005, u * 0.004, u * 0.005);
      }
    }
    ctx.fill();
  }
  // The windows and the dormers' glass, and the glint of the sky on the windows.
  ctx.fillStyle = L.glass;
  ctx.beginPath();
  for (const h of list) {
    const n = bays(h, BAYS);
    for (let i = 0; i < n; i++) {
      const b = BAYS[i]!;
      const ww = Math.min(b.w * 0.5, 0.024);
      for (const [foot, top] of FLOORS) {
        const y0 = Y(top) + (top - foot) * u * 0.14;
        ctx.rect(X(b.x - ww / 2), y0, ww * u, Y(foot) - u * 0.004 - y0);
      }
      if (b.w !== CORNER_W || !h.corner) archPath(ctx, X(b.x) - u * 0.0045, Y(CORNICE + 0.004), u * 0.009, (ROOF - CORNICE - 0.014) * u);
    }
  }
  ctx.fill();
  if (L === LIVELY && tone.lights < 0.95) {
    ctx.fillStyle = L.roofLit;
    ctx.globalAlpha = 0.55 * (1 - tone.lights);
    ctx.beginPath();
    for (const h of list) {
      const n = bays(h, BAYS);
      for (let i = 0; i < n; i++) {
        const b = BAYS[i]!;
        const ww = Math.min(b.w * 0.5, 0.024);
        for (const [foot, top] of FLOORS) {
          const y0 = Y(top) + (top - foot) * u * 0.14;
          const x = X(b.x - ww / 2);
          ctx.moveTo(x, y0 + (Y(foot) - y0) * 0.55);
          ctx.lineTo(x + ww * u * 0.7, y0);
          ctx.lineTo(x + ww * u, y0);
          ctx.lineTo(x + ww * u, y0 + (Y(foot) - y0) * 0.12);
          ctx.lineTo(x, y0 + (Y(foot) - y0) * 0.85);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The windows lit at dusk (each its own moment; a few stay dark).
  if (tone.lights > 0.02) {
    ctx.fillStyle = tone.windowLit;
    ctx.globalAlpha = L.glow;
    ctx.beginPath();
    let k = 0;
    for (const h of list) {
      const n = bays(h, BAYS);
      for (let i = 0; i < n; i++) {
        const b = BAYS[i]!;
        const ww = Math.min(b.w * 0.5, 0.024);
        for (const [foot, top] of FLOORS) {
          const r = ((k++ * 0.618034) % 1) * 1.3;
          if (r > 1 || r > tone.lights * 1.05) continue;
          const y0 = Y(top) + (top - foot) * u * 0.14;
          ctx.rect(X(b.x - ww / 2), y0, ww * u, Y(foot) - u * 0.004 - y0);
        }
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The balconies: continuous along the first floor and the attic, little ones at the second
  // floor's windows: their rails, then their balusters as one dashed stroke.
  const rail = Math.max(0.8, u * 0.0028);
  ctx.fillStyle = L.iron;
  ctx.beginPath();
  for (const h of list) {
    for (const f of [GROUND, FLOOR2]) ctx.rect(X(h.x0) + u * 0.002, Y(f) - u * 0.018, (h.x1 - h.x0) * u - u * 0.004, rail);
    const n = bays(h, BAYS);
    for (let i = 0; i < n; i++) {
      const b = BAYS[i]!;
      const ww = Math.min(b.w * 0.5, 0.024) + 0.008;
      ctx.rect(X(b.x - ww / 2), Y(FLOOR1) - u * 0.014, ww * u, rail);
    }
  }
  ctx.fill();
  const post = Math.max(0.6, u * 0.0016);
  ctx.setLineDash(dashes(post, u * 0.0105 - post));
  ctx.lineCap = "butt";
  ctx.strokeStyle = L.iron;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (const h of list) {
      if (pass === 0) {
        for (const f of [GROUND, FLOOR2]) {
          const y = Y(f) - u * 0.018 + u * 0.00825;
          ctx.moveTo(X(h.x0) + u * 0.004, y);
          ctx.lineTo(X(h.x1) - u * 0.002, y);
        }
        continue;
      }
      const n = bays(h, BAYS);
      for (let i = 0; i < n; i++) {
        const b = BAYS[i]!;
        const ww = Math.min(b.w * 0.5, 0.024) + 0.008;
        const y = Y(FLOOR1) - u * 0.014 + u * 0.00625;
        ctx.moveTo(X(b.x - ww / 2) + u * 0.003, y);
        ctx.lineTo(X(b.x + ww / 2), y);
      }
    }
    ctx.lineWidth = u * (pass ? 0.0125 : 0.0165);
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  // Window boxes of red geraniums along the first floor's balcony, on the lively fronts: leaves,
  // then blooms (pin-points, squares as cheap to fill as they look round at this size).
  if (L === LIVELY) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.rose : tone.leaf;
      ctx.beginPath();
      for (const h of list) {
        const n = bays(h, BAYS);
        for (let i = 0; i < n; i++) {
          const b = BAYS[i]!;
          const ww = Math.min(b.w * 0.5, 0.024) + 0.006;
          const y = Y(GROUND) - u * 0.018;
          if (pass === 0) {
            ctx.rect(X(b.x - ww / 2), y - u * 0.005, ww * u, u * 0.0055);
            continue;
          }
          const r = u * 0.0026;
          for (let k = 0; k < 4; k++) {
            const fx = X(b.x - ww / 2) + ww * u * (0.14 + k * 0.24);
            const fy = y - u * (k % 2 ? 0.0062 : 0.0045);
            ctx.rect(fx - r, fy - r, r * 2, r * 2);
          }
        }
      }
      ctx.fill();
    }
  }
  // The fine contour round each house and its corner's dome.
  ctx.beginPath();
  for (const h of list) {
    outline(ctx, s, h);
    if (h.corner) cornerDome(ctx, s, h);
  }
  ctx.strokeStyle = L.edge;
  ctx.lineWidth = Math.max(1, u * 0.0034);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.lineJoin = "miter";
}

/**
 * A stained-glass fanlight: the half disc over (cx, spring) of radius r in `n` radiating panes,
 * rose, amber and mint by turns, leaded along its spokes and round its rim.
 */
function fanlight(ctx: Ctx, tone: Tone, cx: number, spring: number, r: number, n: number, u: number): void {
  const colors = [tone.glassRose, tone.glassAmber, tone.glassMint];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = c; i < n; i += 3) {
      ctx.moveTo(cx, spring);
      ctx.arc(cx, spring, r, Math.PI + (i / n) * Math.PI, Math.PI + ((i + 1) / n) * Math.PI);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.strokeStyle = tone.lead;
  ctx.lineWidth = Math.max(0.7, u * 0.0022);
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    ctx.moveTo(cx, spring);
    ctx.lineTo(cx + Math.cos(a) * r, spring + Math.sin(a) * r);
  }
  ctx.moveTo(cx - r, spring);
  ctx.arc(cx, spring, r, Math.PI, Math.PI * 2);
  ctx.lineTo(cx - r, spring);
  ctx.stroke();
}

/** A band of stained glass: `n` panes from x across w, rose, amber and mint by turns, leaded between. */
function glassBand(ctx: Ctx, tone: Tone, x: number, y: number, w: number, h: number, n: number, u: number): void {
  const panes = [tone.glassRose, tone.glassAmber, tone.glassMint];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = panes[c]!;
    ctx.beginPath();
    for (let i = c; i < n; i += 3) ctx.rect(x + (w * i) / n, y, w / n, h);
    ctx.fill();
  }
  ctx.fillStyle = tone.lead;
  ctx.beginPath();
  for (let i = 1; i < n; i++) ctx.rect(x + (w * i) / n - u * 0.001, y, u * 0.002, h);
  ctx.rect(x, y + h - u * 0.0015, w, u * 0.002);
  ctx.fill();
}

// ---------------------------------------------------------------- the chocolatier

/**
 * The chocolatier: rose woodwork across the ground floor, a fascia with a gold heart in a cream
 * cartouche, a striped awning with a scalloped valance over the display window, where our own
 * bonbons stand in rows on cream shelves, and a glazed door under a stained-glass fanlight; the
 * corner bay beside it in rusticated stone.
 */
function chocolatier(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const X = (x: number) => cx + x * u;
  const Y = (y: number) => hz - y * u;
  const x0 = X(CHOC_X0);
  const x1 = X(CHOC_X1);
  // Rustication on the corner bay's ground floor.
  ctx.fillStyle = tone.houseShade;
  ctx.beginPath();
  for (let k = 1; k < 4; k++) ctx.rect(X(HOUSES[0]!.x0) + u * 0.004, Y((GROUND * k) / 4), CORNER_W * u - u * 0.006, Math.max(0.8, u * 0.002));
  ctx.fill();
  // The woodwork, its lit edge, the fascia.
  ctx.fillStyle = tone.roseWood;
  ctx.beginPath();
  ctx.rect(x0, Y(GROUND - 0.002), x1 - x0, (GROUND - 0.002) * u);
  ctx.fill();
  ctx.fillStyle = tone.roseWoodLit;
  ctx.beginPath();
  ctx.rect(x0, Y(GROUND - 0.002), x1 - x0, u * 0.003);
  ctx.rect(x0, Y(GROUND - 0.002), u * 0.003, (GROUND - 0.002) * u);
  ctx.fill();
  const fy = Y(GROUND - 0.011);
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  oval(ctx, (x0 + x1) / 2, fy, u * 0.016, u * 0.0065);
  ctx.fill();
  ctx.fillStyle = tone.bonbon;
  ctx.beginPath();
  heartPath(ctx, (x0 + x1) / 2, fy + u * 0.0005, u * 0.01);
  ctx.fill();
  // The display window and the door.
  const wx0 = x0 + u * 0.006;
  const wx1 = x0 + (x1 - x0) * 0.66;
  const wt = Y(GROUND - 0.03);
  const wb = Y(0.008);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(wx0, wt, wx1 - wx0, wb - wt);
  ctx.fillStyle = tone.roseWood;
  ctx.fillRect(wx0, wb - u * 0.0035, wx1 - wx0, u * 0.0035);
  // Bonbons in rows on the shelves.
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = row === 1 ? tone.bonbonPink : tone.bonbon;
    ctx.beginPath();
    const n = 6;
    const by = wt + u * 0.008 + row * u * 0.0095;
    for (let k = 0; k < n; k++) {
      const bx = wx0 + ((wx1 - wx0) * (k + 0.5)) / n;
      if ((k + row) % 2) circle(ctx, bx, by, u * 0.0034);
      else ctx.rect(bx - u * 0.0034, by - u * 0.003, u * 0.0068, u * 0.006);
    }
    ctx.fill();
    ctx.fillStyle = tone.houseShade;
    ctx.fillRect(wx0, by + u * 0.0042, wx1 - wx0, Math.max(0.7, u * 0.0015));
  }
  // The door: dark rose panels, a glass light, the fanlight over it.
  const dx0 = wx1 + u * 0.007;
  const dx1 = x1 - u * 0.006;
  const dr = (dx1 - dx0) / 2;
  ctx.fillStyle = tone.door;
  ctx.fillRect(dx0, Y(GROUND - 0.034) + dr, dx1 - dx0, Y(0) - Y(GROUND - 0.034) - dr);
  ctx.fillStyle = tone.glassAmber;
  ctx.fillRect(dx0 + dr * 0.35, Y(GROUND - 0.034) + dr * 1.3, dr * 1.3, u * 0.018);
  fanlight(ctx, tone, (dx0 + dx1) / 2, Y(GROUND - 0.034) + dr, dr, 5, u);
  // The striped awning: a slope of stripes under the fascia, its scalloped valance.
  const ay0 = Y(GROUND - 0.018);
  const ay1 = Y(GROUND - 0.03);
  const ax0 = wx0 - u * 0.004;
  const ax1 = wx1 + u * 0.004;
  const stripes = 8;
  const sw = (ax1 - ax0) / stripes;
  for (let c = 0; c < 2; c++) {
    ctx.fillStyle = c ? tone.awning2 : tone.awning;
    ctx.beginPath();
    for (let i = c; i < stripes; i += 2) {
      ctx.moveTo(ax0 + sw * i, ay0);
      ctx.lineTo(ax0 + sw * (i + 1), ay0);
      ctx.lineTo(ax0 + sw * (i + 1), ay1);
      ctx.arc(ax0 + sw * (i + 0.5), ay1, sw / 2, 0, Math.PI);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(x0, Y(GROUND - 0.002), x1 - x0, (GROUND - 0.002) * u);
  ctx.moveTo(ax0, ay0);
  ctx.lineTo(ax1, ay0);
  ctx.lineTo(ax1, ay1);
  for (let i = stripes - 1; i >= 0; i--) ctx.arc(ax0 + sw * (i + 0.5), ay1, sw / 2, 0, Math.PI);
  ctx.closePath();
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.stroke();
}

// ---------------------------------------------------------------- the quiet front

/**
 * The quiet front behind the tower's ground floor: rusticated stone and a carriage arch with its
 * double doors, all a shade off the stone.
 */
function carriageArch(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const h = HOUSES[1]!;
  ctx.fillStyle = tone.quietLine;
  ctx.beginPath();
  for (let k = 1; k < 4; k++) ctx.rect(cx + h.x0 * u, hz - ((GROUND * k) / 4) * u, (h.x1 - h.x0) * u, Math.max(0.8, u * 0.002));
  archPath(ctx, cx - u * 0.026, hz, u * 0.052, u * 0.062);
  ctx.fill();
  ctx.fillStyle = tone.quietEdge;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.rect(cx - u * 0.001, hz - u * 0.036, u * 0.002, u * 0.036);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the florist

/**
 * The florist: green shop windows behind, and out on the pavement its stall, a counter of boards
 * with buckets of roses and tulips along it, under an arch of green ironwork that springs from two
 * posts with a curl at either side, a parasol canopy of mint and cream gores in its head,
 * scalloped along its hem.
 */
function florist(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + STALL_X * u;
  const hz = landLine(s);
  const h = HOUSES[2]!;
  // The shop behind: green woodwork, two windows lit at dusk.
  ctx.fillStyle = tone.iron;
  ctx.fillRect(s.cssW / 2 + (h.x0 + 0.006) * u, hz - (GROUND - 0.002) * u, (h.x1 - h.x0 - 0.012) * u, (GROUND - 0.002) * u);
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) ctx.rect(s.cssW / 2 + (h.x0 + 0.014 + i * 0.076) * u, hz - (GROUND - 0.012) * u, u * 0.062, (GROUND - 0.03) * u);
  ctx.fill();
  const hw = STALL_HW * u;
  const rx = hw - u * 0.006;
  const spring = hz - STALL_SPRING * u;
  const ry = (STALL_CROWN - STALL_SPRING) * u;
  // The canopy: gores radiating from the spring line's middle up to the arch.
  const gores = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.canopy2 : tone.canopy;
    ctx.beginPath();
    for (let i = pass; i < gores; i += 2) {
      ctx.moveTo(cx, spring);
      ctx.ellipse(cx, spring, rx, ry, 0, Math.PI + (i / gores) * Math.PI, Math.PI + ((i + 1) / gores) * Math.PI);
      ctx.closePath();
    }
    const sw = (rx * 2) / gores;
    for (let i = pass; i < gores; i += 2) circle(ctx, cx - rx + sw * (i + 0.5), spring, sw * 0.5);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx - rx, spring);
  ctx.ellipse(cx, spring, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.stroke();
  // The posts and the arch, with a curl where each post meets it.
  ctx.strokeStyle = tone.iron;
  ctx.lineWidth = u * 0.0055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - rx, hz);
  ctx.lineTo(cx - rx, spring);
  ctx.ellipse(cx, spring, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, hz);
  ctx.stroke();
  ctx.lineWidth = u * 0.0032;
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    const px = cx + m * rx;
    ctx.moveTo(px, spring + u * 0.012);
    ctx.bezierCurveTo(px + m * u * 0.014, spring + u * 0.012, px + m * u * 0.016, spring - u * 0.006, px + m * u * 0.006, spring - u * 0.006);
    ctx.quadraticCurveTo(px + m * u * 0.001, spring - u * 0.002, px + m * u * 0.006, spring + u * 0.003);
  }
  ctx.stroke();
  // The counter: a plank top, a boarded front, legs.
  ctx.fillStyle = tone.door;
  ctx.fillRect(cx - hw + u * 0.004, hz - u * 0.056, hw * 2 - u * 0.008, u * 0.056);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(cx - hw + u * 0.01, hz - u * 0.047, hw * 2 - u * 0.02, u * 0.039);
  ctx.fillStyle = SHADE;
  ctx.fillRect(cx - hw + u * 0.01, hz - u * 0.047, hw * 2 - u * 0.02, u * 0.008);
  // A chalkboard with a heart on the counter's front.
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  block(ctx, cx - u * 0.015, hz - u * 0.043, u * 0.03, u * 0.031, u * 0.006);
  ctx.fill();
  ctx.fillStyle = tone.tulipP;
  ctx.beginPath();
  heartPath(ctx, cx, hz - u * 0.027, u * 0.017);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - hw + u * 0.004, hz - u * 0.056, hw * 2 - u * 0.008, u * 0.056);
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.stroke();
  // Buckets along the counter: roses, tulips, roses.
  const by = hz - u * 0.056;
  const bw = u * 0.032;
  for (let i = 0; i < 3; i++) {
    const bx = cx - hw + u * 0.027 + i * (hw * 2 - u * 0.054) * 0.5;
    ctx.fillStyle = tone.stone;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by - u * 0.028);
    ctx.lineTo(bx + bw * 0.5, by - u * 0.028);
    ctx.lineTo(bx + bw * 0.4, by);
    ctx.lineTo(bx - bw * 0.4, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.stoneShade;
    ctx.fillRect(bx - bw * 0.5, by - u * 0.028, bw, u * 0.004);
    ctx.fillStyle = tone.leaf;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const fx = bx + (k - 2) * bw * 0.2;
      ctx.rect(fx - u * 0.001, by - u * 0.064 + Math.abs(k - 2) * u * 0.006, u * 0.002, u * 0.04);
      if (k % 2 === 0) oval(ctx, fx + u * 0.006, by - u * 0.041, u * 0.006, u * 0.003, -0.6);
    }
    ctx.fill();
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.tulipP : i === 1 ? tone.tulipY : tone.rose;
      ctx.beginPath();
      for (let k = pass; k < 5; k += 2) {
        const fx = bx + (k - 2) * bw * 0.2;
        const fy = by - u * 0.066 + Math.abs(k - 2) * u * 0.006;
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

// ---------------------------------------------------------------- the café

/**
 * The café: sage woodwork across the ground floor, its fascia with the sign (a heart and a cup in
 * a cream oval), the big window with a band of stained glass along its head and a café curtain,
 * the door with a glass head, bay trees in pots by it; then
 * the glass marquise over the terrace and (`terrace`) the couple at their table.
 */
function cafe(ctx: Ctx, s: Scene, tone: Tone, terrace: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const X = (x: number) => cx + x * u;
  const Y = (y: number) => hz - y * u;
  const x0 = X(CAFE_X0);
  const x1 = X(CAFE_X1);
  ctx.fillStyle = tone.sageWood;
  ctx.fillRect(x0, Y(GROUND - 0.002), x1 - x0, (GROUND - 0.002) * u);
  ctx.fillStyle = tone.sageWoodLit;
  ctx.beginPath();
  ctx.rect(x0, Y(GROUND - 0.002), x1 - x0, u * 0.003);
  ctx.rect(x0, Y(GROUND - 0.002), u * 0.003, (GROUND - 0.002) * u);
  ctx.fill();
  // The sign on the fascia.
  const sx = (x0 + x1) / 2 - u * 0.02;
  const sy = Y(GROUND - 0.011);
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  oval(ctx, sx, sy, u * 0.026, u * 0.0075);
  ctx.fill();
  ctx.fillStyle = tone.glassRose;
  ctx.beginPath();
  heartPath(ctx, sx - u * 0.01, sy + u * 0.0005, u * 0.01);
  ctx.rect(sx + u * 0.003, sy - u * 0.004, u * 0.011, u * 0.008);
  ctx.fill();
  ctx.fillStyle = tone.sign;
  ctx.fillRect(sx + u * 0.0055, sy - u * 0.0025, u * 0.006, u * 0.0045);
  // The big window: glass, the stained-glass band along its head, the curtain.
  const wx = x0 + u * 0.008;
  const ww = (x1 - x0) * 0.62;
  ctx.fillStyle = tone.windowLit;
  ctx.fillRect(wx, Y(GROUND - 0.02), ww, (GROUND - 0.028) * u);
  glassBand(ctx, tone, wx, Y(GROUND - 0.02), ww, u * 0.011, 7, u);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(wx, Y(0.03), ww, u * 0.022);
  ctx.fillStyle = tone.sageWood;
  ctx.fillRect(wx + ww / 2 - u * 0.0015, Y(GROUND - 0.02), u * 0.003, (GROUND - 0.028) * u);
  // The door, with a glass head; bay trees in pots by it.
  const dx = x1 - u * 0.044;
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  archPath(ctx, dx, hz, u * 0.03, u * 0.056);
  ctx.fill();
  ctx.fillStyle = tone.glassAmber;
  ctx.beginPath();
  archPath(ctx, dx + u * 0.006, hz - u * 0.028, u * 0.018, u * 0.022);
  ctx.fill();
  ctx.fillStyle = tone.pot;
  ctx.fillRect(dx - u * 0.012, hz - u * 0.013, u * 0.009, u * 0.013);
  ctx.fillRect(dx + u * 0.033, hz - u * 0.013, u * 0.009, u * 0.013);
  ctx.fillStyle = tone.leaf;
  ctx.beginPath();
  circle(ctx, dx - u * 0.0075, hz - u * 0.024, u * 0.0085);
  circle(ctx, dx + u * 0.0375, hz - u * 0.024, u * 0.0085);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0, Y(GROUND - 0.002), x1 - x0, (GROUND - 0.002) * u);
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.stroke();
  marquise(ctx, s, tone, (x0 + x1) / 2, (x1 - x0) / 2, hz);
  if (terrace) couple(ctx, s, tone);
}

/** The café's glass marquise: amber and rose panes between iron ribs, a scalloped edge, two curling brackets under it. */
function marquise(ctx: Ctx, s: Scene, tone: Tone, cx: number, hw: number, hz: number): void {
  const u = s.u;
  const x0 = cx - hw - u * 0.004;
  const x1 = cx + hw + u * 0.004;
  const y0 = hz - MARQUISE_TOP * u;
  const y1 = hz - MARQUISE_LOW * u;
  const pw = (x1 - x0) / MARQUISE_PANES;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.glassRose : tone.glassAmber;
    ctx.beginPath();
    for (let i = pass; i < MARQUISE_PANES; i += 2) {
      const a = x0 + i * pw;
      ctx.moveTo(a, y0);
      ctx.lineTo(a + pw, y0);
      ctx.lineTo(a + pw, y1 - pw * 0.2);
      ctx.quadraticCurveTo(a + pw / 2, y1 + pw * 0.3, a, y1 - pw * 0.2);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.strokeStyle = tone.iron;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, u * 0.0025);
  ctx.beginPath();
  for (let i = 0; i <= MARQUISE_PANES; i++) {
    ctx.moveTo(x0 + i * pw, y0);
    ctx.lineTo(x0 + i * pw, y1 - pw * 0.2);
  }
  ctx.stroke();
  ctx.lineWidth = u * 0.0045;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  for (let m = -1; m <= 1; m += 2) {
    const bx = cx + m * hw * 0.62;
    ctx.moveTo(bx, y1 - u * 0.004);
    ctx.bezierCurveTo(bx, hz - u * 0.062, bx - m * u * 0.016, hz - u * 0.06, bx - m * u * 0.016, hz - u * 0.068);
    ctx.quadraticCurveTo(bx - m * u * 0.015, hz - u * 0.074, bx - m * u * 0.009, hz - u * 0.071);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------- the lamp and the lights

/** Where the strings of lights hang from along the shopfronts, X (u from center) and height above the land's line. */
const HOOKS = [
  [CHOC_X0, GROUND + 0.002],
  [HOUSES[1]!.x0 + 0.004, GROUND + 0.004],
  [HOUSES[2]!.x0 + 0.004, GROUND + 0.004],
  [STALL_X + STALL_HW + 0.004, STALL_SPRING + 0.004],
  [CAFE_X1 + 0.004, MARQUISE_TOP + 0.006],
  [LAMP_X, LAMP_H - 0.004],
] as const;
/** The span of hooks across the quiet front behind the tower: no string there. */
const QUIET_SPAN = 1;
/** How far each string sags below its hooks (u). */
const SAG = 0.03;

/**
 * The lamp at the block's end, in the Metro manner: a flared foot, a slim green stem that rises
 * and curls over toward the café, and from the curl a glass bud hanging under a little cap, lit
 * at dusk.
 */
export function lamp(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + LAMP_X * u;
  const hz = landLine(s);
  const top = hz - LAMP_H * u;
  const bx = s.cssW / 2 + BUD_X * u;
  const by = hz - BUD_H * u;
  ctx.fillStyle = tone.iron;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.012, hz);
  ctx.quadraticCurveTo(x - u * 0.004, hz - u * 0.006, x - u * 0.003, hz - u * 0.026);
  ctx.lineTo(x + u * 0.003, hz - u * 0.026);
  ctx.quadraticCurveTo(x + u * 0.004, hz - u * 0.006, x + u * 0.012, hz);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.iron;
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.0055;
  ctx.beginPath();
  ctx.moveTo(x, hz - u * 0.024);
  ctx.lineTo(x, top + u * 0.01);
  ctx.bezierCurveTo(x, top - u * 0.008, bx, top - u * 0.01, bx, by - BUD * u * 0.55);
  ctx.stroke();
  ctx.fillStyle = tone.lamp;
  ctx.beginPath();
  const b = BUD * u;
  ctx.moveTo(bx, by - b * 0.5);
  ctx.bezierCurveTo(bx + b * 0.5, by - b * 0.45, bx + b * 0.42, by + b * 0.3, bx, by + b * 0.5);
  ctx.bezierCurveTo(bx - b * 0.42, by + b * 0.3, bx - b * 0.5, by - b * 0.45, bx, by - b * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.iron;
  ctx.beginPath();
  oval(ctx, bx, by - b * 0.48, b * 0.3, b * 0.12);
  ctx.fill();
}

/** Strings of bulbs sagging along the shopfronts to the lamp (none across the quiet front behind the tower), lit at dusk. */
function stringLights(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  ctx.strokeStyle = tone.wire;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.beginPath();
  for (let i = 0; i < HOOKS.length - 1; i++) {
    if (i === QUIET_SPAN) continue;
    const [x0, h0] = HOOKS[i]!;
    const [x1, h1] = HOOKS[i + 1]!;
    ctx.moveTo(cx + x0 * u, hz - h0 * u);
    ctx.quadraticCurveTo(cx + ((x0 + x1) / 2) * u, hz - ((h0 + h1) / 2 - SAG) * u, cx + x1 * u, hz - h1 * u);
  }
  ctx.stroke();
  // The bulbs hang a little under the wire, by turns in three colors: each color's bulbs along a
  // span are the dots of a dashed, round-capped stroke along it (as round as discs, and far
  // cheaper to fill), every third one, starting at its own bulb.
  const colors = [tone.bulb, tone.bulbPink, tone.bulbCream];
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.0072;
  for (let i = 0; i < HOOKS.length - 1; i++) {
    if (i === QUIET_SPAN) continue;
    const [x0, h0] = HOOKS[i]!;
    const [x1, h1] = HOOKS[i + 1]!;
    const ax = cx + x0 * u;
    const ay = hz - h0 * u + u * 0.005;
    const mx = cx + ((x0 + x1) / 2) * u;
    const my = hz - ((h0 + h1) / 2 - SAG) * u + u * 0.005;
    const bx = cx + x1 * u;
    const by = hz - h1 * u + u * 0.005;
    // The span's length along its curve, and the spacing that puts n - 1 bulbs between its hooks (a hair more, so none lands on the far hook).
    let length = 0;
    for (let k = 0, px = ax, py = ay; k < 8; k++) {
      const q = (k + 1) / 8;
      const qx = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx;
      const qy = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by;
      length += Math.hypot(qx - px, qy - py);
      px = qx;
      py = qy;
    }
    const n = Math.max(2, Math.round((x1 - x0) / 0.018));
    const step = (length / n) * 1.001;
    for (let c = 0; c < 3; c++) {
      const first = ((((c - i) % 3) + 3) % 3) || 3;
      ctx.setLineDash(dashes(0, step * 3));
      ctx.lineDashOffset = -first * step;
      ctx.strokeStyle = colors[c]!;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();
    }
  }
  ctx.setLineDash(NO_DASH);
  ctx.lineDashOffset = 0;
}

/** The pavement the block stands on, from the land's line down to the canal and the lawn. */
export const PAVE_DEPTH = 0.05;

/** The block and its shops left to right (the café with its terrace, unless `terrace` is false), the lamp, and the lights strung along them. */
export function shops(ctx: Ctx, s: Scene, tone: Tone, terrace = true): void {
  looks(tone);
  houses(ctx, s, tone, LIVE_HOUSES, LIVELY);
  houses(ctx, s, tone, QUIET_HOUSES, QUIET);
  chocolatier(ctx, s, tone);
  carriageArch(ctx, s, tone);
  florist(ctx, s, tone);
  cafe(ctx, s, tone, terrace);
  lamp(ctx, s, tone);
  stringLights(ctx, s, tone);
  ctx.lineCap = "butt";
}
const LIVE_HOUSES = HOUSES.filter((h) => !h.quiet);
const NONE: readonly House[] = [];
const QUIET_HOUSES = HOUSES.filter((h) => h.quiet);

/** The boulevard: its pavement right across, then the block; only the block while it stands in the cloud sea (`land` false: the sea covers the rest). */
export function boulevard(ctx: Ctx, s: Scene, tone: Tone, land: boolean): void {
  const u = s.u;
  const hz = landLine(s);
  if (land) {
    ctx.fillStyle = tone.pave;
    ctx.fillRect(0, hz - 1, s.cssW, PAVE_DEPTH * u + 1);
    ctx.fillStyle = tone.pave2;
    ctx.fillRect(0, hz + PAVE_DEPTH * u - u * 0.008, s.cssW, u * 0.008);
  }
  shops(ctx, s, tone, land);
}

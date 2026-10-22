import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { BONE, INK, IRON, LAMP, LAMP_CORE, LAMP_DEEP, alphaStep, mixed, MOSSGREY, ORANGE, ORANGE_DARK, ORANGE_LIGHT, PLUM, POOL, PURPLE, PURPLE_DARK, ROOF, ROOF_LIGHT, SLATE, STEM, TEALGREY } from "./common";
import { cage, fabric, flicker, lightsOut, sweetSign, swing } from "./ambient";
import { mistTop } from "./lines";
import { smoke } from "./smoke";
import { moonAt } from "./sky";
import { CORNER_Z, STREET_X } from "./street";

// The buildings facing the square either side of the tower, where Main Street begins: crooked,
// leaning Victorian shopfronts of our own in a Tim Burton style, every edge inked. Walls that
// bulge and lean in toward the street, upper floors overhanging the ground floor, roofs that
// sag and curl into spirals at their finials, thin crooked chimneys, black-and-white striped
// awnings, fans of orange and purple bunting, a stitched patch, a sign on a curly iron bracket,
// string lights along the eaves, shop windows glowing pumpkin orange with the wares in
// silhouette, lit windows upstairs, a gas lamp by the door, and jack-o'-lanterns lining the steps.
// On screens wide enough, spindly crooked tower-houses stand further out (only where they fit
// whole, and beside the moon, never across it). The sweet shop stands back from the street's corner,
// spindlier on a narrow phone, leaving the churchyard crow its stretch of the lane beside the tower.
//
// A building is drawn in its own units: x from the middle of its front, y up from its feet,
// sheared by its lean; px per unit is its depth's (U).

/** A dark window's pane. */
const DARK_PANE_ = "#2a1f3d";

/** Scratch frame of the building being drawn. */
const T = { x: 0, y: 0, U: 1, lean: 0, lw: 1, sx: 1 };
const X = (x: number, y: number) => T.x + (x * T.sx + T.lean * y) * T.U;
const Y = (y: number) => T.y - y * T.U;

function moveTo(ctx: Ctx, x: number, y: number): void {
  ctx.moveTo(X(x, y), Y(y));
}
function lineTo(ctx: Ctx, x: number, y: number): void {
  ctx.lineTo(X(x, y), Y(y));
}
function curveTo(ctx: Ctx, cx: number, cy: number, x: number, y: number): void {
  ctx.quadraticCurveTo(X(cx, cy), Y(cy), X(x, y), Y(y));
}
function quad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  moveTo(ctx, x0, y0);
  lineTo(ctx, x1, y0);
  lineTo(ctx, x1, y1);
  lineTo(ctx, x0, y1);
  ctx.closePath();
}
function inked(ctx: Ctx, fill: string, k = 1): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, T.lw * k, INK);
}
/** A wall from (x0, y0) to (x1, y1) whose sides bulge out by `b` and whose top sags by `sag`. */
function wonky(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, b: number, sag: number): void {
  const ym = (y0 + y1) / 2;
  moveTo(ctx, x0, y0);
  lineTo(ctx, x1, y0);
  curveTo(ctx, x1 + b, ym, x1, y1);
  curveTo(ctx, (x0 + x1) / 2, y1 - sag, x0, y1);
  curveTo(ctx, x0 - b, ym, x0, y0);
  ctx.closePath();
}

// ---------------------------------------------------------------- parts

/** A curl of iron or wood: a short stem ending in a spiral, from (x, y) toward `dir`. */
function curl(ctx: Ctx, x: number, y: number, r: number, dir: number): void {
  const cx = X(x, y) + dir * r * T.U;
  const cy = Y(y) - r * T.U;
  ctx.moveTo(X(x, y), Y(y));
  ctx.quadraticCurveTo(X(x, y), cy, cx, cy - r * T.U);
  ctx.arc(cx, cy, r * T.U, -Math.PI / 2, dir > 0 ? Math.PI * 1.2 : -Math.PI * 2.2, dir < 0);
}

/** Black-and-white (or orange-and-black) striped awning with a scalloped hem, from x0 to x1 at height y. */
function awning(ctx: Ctx, x0: number, x1: number, y: number, h: number, colors: readonly [string, string]): void {
  const n = Math.max(3, Math.round((x1 - x0) / 0.026));
  const sw = (x1 - x0) / n;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = pass; i < n; i += 2) {
      const a = x0 + i * sw;
      moveTo(ctx, a + sw * 0.15, y + h);
      lineTo(ctx, a + sw * 1.15, y + h);
      lineTo(ctx, a + sw, y);
      ctx.arc(X(a + sw / 2, y), Y(y), (sw / 2) * T.U, 0, Math.PI);
      ctx.closePath();
    }
    ctx.fillStyle = colors[pass]!;
    ctx.fill();
  }
  ctx.beginPath();
  moveTo(ctx, x0 + sw * 0.15, y + h);
  lineTo(ctx, x1 + sw * 0.15, y + h);
  lineTo(ctx, x1, y);
  for (let i = n - 1; i >= 0; i--) ctx.arc(X(x0 + i * sw + sw / 2, y), Y(y), (sw / 2) * T.U, 0, Math.PI);
  ctx.closePath();
  ink(ctx, T.lw * 0.8, INK);
}

/** A fan of bunting: a half rosette of pleats, orange and purple by turns, hanging from (x, y). */
function fan(ctx: Ctx, x: number, y: number, r: number): void {
  const cx = X(x, y);
  const cy = Y(y);
  const R = r * T.U;
  const n = 8;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = pass; i < n; i += 2) {
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (i / n) * Math.PI, ((i + 1) / n) * Math.PI);
      ctx.closePath();
    }
    ctx.fillStyle = pass ? PURPLE : ORANGE;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.arc(cx, cy, R, Math.PI, 0, true);
  ctx.closePath();
  ink(ctx, T.lw * 0.7, INK);
  ctx.beginPath();
  ctx.moveTo(cx + R * 0.22, cy);
  ctx.arc(cx, cy, R * 0.22, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  ink(ctx, T.lw * 0.6, INK);
}

/** The string lights queued while a building is drawn: wire points, and bulbs (x, y, color, twinkle). */
const WIRES: number[] = [];
const BULBS: number[] = [];
/** Per bulb: x, y, color, twinkle, radius (px: each shop has its own scale). */
const BULB_STRIDE = 5;
const BULB_COLORS = [LAMP, ORANGE_LIGHT, "#c58cff"] as const;
const BULB_GLOWS = BULB_COLORS.map((c) => alpha(c, 0.22));

/** String lights: a sagging wire from (x0, y0) to (x1, y1) with glowing bulbs in three colors (queued; see lightsUp). */
function stringLights(x0: number, y0: number, x1: number, y1: number, sag: number, n: number, t: number, seed: number): void {
  const at = (f: number, out: number[]) => {
    const x = x0 + (x1 - x0) * f;
    const y = y0 + (y1 - y0) * f - sag * 4 * f * (1 - f);
    out.push(X(x, y), Y(y));
  };
  WIRES.push(NaN, NaN);
  for (let i = 0; i <= 12; i++) at(i / 12, WIRES);
  for (let i = 0; i < n; i++) {
    at((i + 0.5) / n, BULBS);
    BULBS.push(i % 3, 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7 + seed), 0.008 * T.U);
  }
}

/** Draw the queued string lights: every wire in one stroke, then each color's glow and bulbs in one fill. */
function lightsUp(ctx: Ctx): void {
  if (WIRES.length === 0) return;
  ctx.beginPath();
  for (let i = 0; i < WIRES.length; i += 2) {
    if (Number.isNaN(WIRES[i]!)) {
      ctx.moveTo(WIRES[i + 2]!, WIRES[i + 3]!);
      i += 2;
      continue;
    }
    ctx.lineTo(WIRES[i]!, WIRES[i + 1]!);
  }
  ctx.strokeStyle = IRON;
  ctx.lineWidth = Math.max(0.8, T.lw * 0.5);
  ctx.stroke();
  // Each bulb: a soft round glow, and its bright little bulb (a rounded square: they are tiny).
  for (let c = 0; c < 3; c++) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 0; i < BULBS.length; i += BULB_STRIDE) {
        if (BULBS[i + 2] !== c) continue;
        const r = BULBS[i + 4]!;
        if (pass) {
          ctx.rect(BULBS[i]! - r * 0.8, BULBS[i + 1]! + r * 0.2, r * 1.6, r * 1.6);
          continue;
        }
        const R = r * 2.2 * BULBS[i + 3]!;
        ctx.moveTo(BULBS[i]! + R, BULBS[i + 1]! + r);
        ctx.arc(BULBS[i]!, BULBS[i + 1]! + r, R, 0, Math.PI * 2);
      }
      ctx.fillStyle = pass ? BULB_COLORS[c]! : BULB_GLOWS[c]!;
      ctx.fill();
    }
  }
  WIRES.length = 0;
  BULBS.length = 0;
}

// Windows are queued while a building is drawn and drawn together (windowsUp): the shutters in a
// fill per color and one ink, the panes in a fill per light (lit, dim, dark), the frames in one bone
// stroke and one ink, the mullions in one more. A window's points are kept in screen px.

/** Per window: kind (0 quad, 1 arch, 2 lancet), light (2 lit, 1 dim, 0 dark), shutters (-1 none, else SHUTTERS index), then its points. */
const WIN_STRIDE = 29;
const WQ = new Float64Array(WIN_STRIDE * 24);
let windowsQueued = 0;
const SHUTTERS = [IRON, PURPLE_DARK] as const;

function wpt(o: number, x: number, y: number): void {
  WQ[o] = X(x, y);
  WQ[o + 1] = Y(y);
}

/** Light level of a window from its flicker (0 dark, below 0.8 dim, else lit). */
function lightOf(flick: number): number {
  return flick <= 0 ? 0 : flick < 0.8 ? 1 : 2;
}

/** A lit window with a bone frame and a mullion cross; tilted a little; crooked shutters if asked (queued: windowsUp). */
function windowLit(_ctx: Ctx, x: number, y: number, w: number, h: number, flick: number, shutters: string | null, arch = false, tilt = 0, curtained = false): void {
  if (windowsQueued * WIN_STRIDE >= WQ.length) return;
  const o = windowsQueued++ * WIN_STRIDE;
  const tl = tilt * h;
  WQ[o] = arch ? 1 : curtained ? CURTAINED : 0;
  WQ[o + 1] = lightOf(flick);
  WQ[o + 2] = shutters ? SHUTTERS.indexOf(shutters as (typeof SHUTTERS)[number]) : -1;
  // Pane: four corners (an arch's top two are its shoulders), and an arch's control point.
  wpt(o + 3, x - w / 2, y);
  wpt(o + 5, x + w / 2, y + tl);
  if (arch) {
    wpt(o + 7, x + w / 2, y + h - w / 2 + tl);
    wpt(o + 9, x - w / 2, y + h - w / 2);
    wpt(o + 11, x, y + h + w * 0.2);
  } else {
    wpt(o + 7, x + w / 2, y + h + tl);
    wpt(o + 9, x - w / 2, y + h);
  }
  // Mullions.
  wpt(o + 13, x, y + tl / 2);
  wpt(o + 15, x, y + h * (arch ? 0.85 : 1) + tl / 2);
  wpt(o + 17, x - w / 2, y + h * 0.5);
  wpt(o + 19, x + w / 2, y + h * 0.5 + tl);
  // Shutters: the left one, and the right one hanging askew (four points each, packed as two quads).
  if (shutters) {
    wpt(o + 21, x - w / 2 - w * 0.5, y + tl);
    wpt(o + 23, x - w / 2 - w * 0.05, y);
    wpt(o + 25, x - w / 2 - w * 0.05, y + h);
    wpt(o + 27, x - w / 2 - w * 0.5, y + h + tl);
    SH_RIGHT[(o / WIN_STRIDE) * 8] = X(x + w / 2 + w * 0.05, y + h * 0.02);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 1] = Y(y + h * 0.02);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 2] = X(x + w / 2 + w * 0.55, y - h * 0.1);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 3] = Y(y - h * 0.1);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 4] = X(x + w / 2 + w * 0.5, y + h * 0.88);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 5] = Y(y + h * 0.88);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 6] = X(x + w / 2 + w * 0.05, y + h);
    SH_RIGHT[(o / WIN_STRIDE) * 8 + 7] = Y(y + h);
  }
}
const SH_RIGHT = new Float64Array(8 * 24);
/** A queued window's kind: a plain one whose pane the cast's curtains cover (a pane anchor's), drawn without mullions. */
const CURTAINED = 3;

/** A pointed lancet window, lit (or dark at 0), centered at x with its sill at y: a bone frame (queued: windowsUp). */
function lancet(_ctx: Ctx, x: number, y: number, w: number, h: number, lit: number): void {
  if (windowsQueued * WIN_STRIDE >= WQ.length) return;
  const o = windowsQueued++ * WIN_STRIDE;
  WQ[o] = 2;
  WQ[o + 1] = lightOf(lit);
  WQ[o + 2] = -1;
  wpt(o + 3, x - w / 2, y);
  wpt(o + 5, x + w / 2, y);
  wpt(o + 7, x + w / 2, y + h * 0.62);
  wpt(o + 9, x - w / 2, y + h * 0.62);
  wpt(o + 11, x + w * 0.45, y + h * 0.9);
  wpt(o + 13, x, y + h);
  wpt(o + 15, x - w * 0.45, y + h * 0.9);
}

/** One queued window's pane outline as a closed subpath. */
function paneOutline(ctx: Ctx, o: number): void {
  ctx.moveTo(WQ[o + 3]!, WQ[o + 4]!);
  ctx.lineTo(WQ[o + 5]!, WQ[o + 6]!);
  ctx.lineTo(WQ[o + 7]!, WQ[o + 8]!);
  if (WQ[o] === 1) ctx.quadraticCurveTo(WQ[o + 11]!, WQ[o + 12]!, WQ[o + 9]!, WQ[o + 10]!);
  else if (WQ[o] === 2) {
    ctx.quadraticCurveTo(WQ[o + 11]!, WQ[o + 12]!, WQ[o + 13]!, WQ[o + 14]!);
    ctx.quadraticCurveTo(WQ[o + 15]!, WQ[o + 16]!, WQ[o + 9]!, WQ[o + 10]!);
  } else ctx.lineTo(WQ[o + 9]!, WQ[o + 10]!);
  ctx.closePath();
}

const PANES = [DARK_PANE_, LAMP_DEEP, LAMP] as const;

/** Draw the queued windows, all together. */
function windowsUp(ctx: Ctx): void {
  if (windowsQueued === 0) return;
  const n = windowsQueued;
  // Shutters, by color, and their ink.
  for (let c = 0; c < SHUTTERS.length; c++) {
    let any = false;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const o = i * WIN_STRIDE;
      if (WQ[o + 2] !== c) continue;
      any = true;
      ctx.moveTo(WQ[o + 21]!, WQ[o + 22]!);
      ctx.lineTo(WQ[o + 23]!, WQ[o + 24]!);
      ctx.lineTo(WQ[o + 25]!, WQ[o + 26]!);
      ctx.lineTo(WQ[o + 27]!, WQ[o + 28]!);
      ctx.closePath();
      const r = i * 8;
      ctx.moveTo(SH_RIGHT[r]!, SH_RIGHT[r + 1]!);
      ctx.lineTo(SH_RIGHT[r + 2]!, SH_RIGHT[r + 3]!);
      ctx.lineTo(SH_RIGHT[r + 4]!, SH_RIGHT[r + 5]!);
      ctx.lineTo(SH_RIGHT[r + 6]!, SH_RIGHT[r + 7]!);
      ctx.closePath();
    }
    if (!any) continue;
    ctx.fillStyle = SHUTTERS[c]!;
    ctx.fill();
    ink(ctx, T.lw * 0.7, INK);
  }
  // Panes, by light.
  for (let l = 0; l < 3; l++) {
    let any = false;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const o = i * WIN_STRIDE;
      if (WQ[o + 1] !== l) continue;
      any = true;
      paneOutline(ctx, o);
    }
    if (!any) continue;
    ctx.fillStyle = PANES[l]!;
    ctx.fill();
  }
  // Frames: bone, then a thin ink.
  ctx.beginPath();
  for (let i = 0; i < n; i++) paneOutline(ctx, i * WIN_STRIDE);
  ink(ctx, T.lw * 1.4, BONE);
  ink(ctx, T.lw * 0.5, INK);
  // Mullions (not on the lancets, nor where the cast's curtains hang over the whole pane).
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const o = i * WIN_STRIDE;
    if (WQ[o] === 2 || WQ[o] === CURTAINED) continue;
    ctx.moveTo(WQ[o + 13]!, WQ[o + 14]!);
    ctx.lineTo(WQ[o + 15]!, WQ[o + 16]!);
    ctx.moveTo(WQ[o + 17]!, WQ[o + 18]!);
    ctx.lineTo(WQ[o + 19]!, WQ[o + 20]!);
  }
  ink(ctx, T.lw * 0.6, INK);
  windowsQueued = 0;
}

/** The small jack-o'-lanterns queued while a building is drawn: screen x, y of the body's middle, radius, flicker. */
const JACKS: number[] = [];

/** A small jack-o'-lantern sitting at (x, y), r units round (queued; see jacksUp). */
export function smallJack(_ctx: Ctx, x: number, y: number, r: number, flick: number): void {
  JACKS.push(X(x, y + r * 0.85), Y(y + r * 0.85), r * T.U, flick);
}

/** Draw the queued jack-o'-lanterns, all together: bodies, shade, ink, lit faces (each feature its own subpath), stems. */
function jacksUp(ctx: Ctx): void {
  if (JACKS.length === 0) return;
  const each = (draw: (cx: number, cy: number, R: number, flick: number) => void) => {
    for (let i = 0; i < JACKS.length; i += 4) draw(JACKS[i]!, JACKS[i + 1]!, JACKS[i + 2]!, JACKS[i + 3]!);
  };
  ctx.beginPath();
  each((cx, cy, R) => oval(ctx, cx, cy, R * 1.18, R * 0.9));
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  each((cx, cy, R) => {
    ctx.moveTo(cx + R * 1.12 * Math.cos(0.1), cy + R * 0.84 * Math.sin(0.1));
    ctx.ellipse(cx, cy, R * 1.12, R * 0.84, 0, 0.1, Math.PI - 0.1);
    ctx.closePath();
  });
  ctx.fill();
  ctx.beginPath();
  each((cx, cy, R) => oval(ctx, cx, cy, R * 1.18, R * 0.9));
  ink(ctx, T.lw * 0.7, INK);
  for (const bright of [true, false]) {
    ctx.beginPath();
    each((cx, cy, R, flick) => {
      if (flick > 0.5 !== bright) return;
      for (let side = -1; side <= 1; side += 2) {
        ctx.moveTo(cx + side * R * 0.62, cy);
        ctx.lineTo(cx + side * R * 0.14, cy);
        ctx.lineTo(cx + side * R * 0.4, cy - R * 0.46);
        ctx.closePath();
      }
      ctx.moveTo(cx - R * 0.62, cy + R * 0.22);
      ctx.lineTo(cx + R * 0.62, cy + R * 0.22);
      ctx.quadraticCurveTo(cx, cy + R * 0.85, cx - R * 0.62, cy + R * 0.22);
      ctx.closePath();
    });
    ctx.fillStyle = bright ? LAMP_CORE : LAMP;
    ctx.fill();
  }
  ctx.beginPath();
  each((cx, cy, R) => {
    ctx.moveTo(cx - R * 0.12, cy - R * 0.82);
    ctx.lineTo(cx - R * 0.06, cy - R * 1.2);
    ctx.lineTo(cx + R * 0.2, cy - R * 1.26);
    ctx.lineTo(cx + R * 0.12, cy - R * 0.82);
    ctx.closePath();
  });
  ctx.fillStyle = STEM;
  ctx.fill();
  ink(ctx, T.lw * 0.5, INK);
  JACKS.length = 0;
}

/** A gas lamp on a curly bracket off the wall at (x, y), reaching out toward `dir`. */
function wallLamp(ctx: Ctx, x: number, y: number, dir: number, flick: number): void {
  const hx = x + dir * 0.04;
  ctx.fillStyle = alphaStep(LAMP, 0.22 * flick);
  ctx.beginPath();
  circle(ctx, X(hx, y - 0.02), Y(y - 0.02), 0.042 * T.U);
  ctx.fill();
  ctx.beginPath();
  moveTo(ctx, x, y + 0.01);
  lineTo(ctx, hx, y + 0.01);
  curl(ctx, x + dir * 0.008, y - 0.012, 0.009, dir);
  ink(ctx, T.lw * 0.8, IRON);
  ctx.beginPath();
  moveTo(ctx, hx - 0.012, y);
  lineTo(ctx, hx + 0.012, y);
  lineTo(ctx, hx + 0.008, y - 0.04);
  lineTo(ctx, hx - 0.008, y - 0.04);
  ctx.closePath();
  inked(ctx, flick > 0.95 ? LAMP_CORE : LAMP, 0.7);
  ctx.beginPath();
  moveTo(ctx, hx - 0.016, y + 0.002);
  lineTo(ctx, hx, y + 0.018);
  lineTo(ctx, hx + 0.016, y + 0.002);
  ctx.closePath();
  inked(ctx, IRON, 0.6);
}

/** A patch sewn onto the wall with big cross-stitches, a Burton seam. */
function patch(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.beginPath();
  moveTo(ctx, x, y);
  lineTo(ctx, x + w, y + h * 0.08);
  lineTo(ctx, x + w * 0.96, y + h);
  lineTo(ctx, x + w * 0.04, y + h * 0.94);
  ctx.closePath();
  inked(ctx, fill, 0.7);
  ctx.beginPath();
  const n = 3;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    for (const [ex, ey] of [
      [x + w * 0.02, y + h * f],
      [x + w * 0.98, y + h * (f + 0.04)],
    ] as const) {
      moveTo(ctx, ex - 0.007, ey - 0.006);
      lineTo(ctx, ex + 0.007, ey + 0.006);
      moveTo(ctx, ex - 0.007, ey + 0.006);
      lineTo(ctx, ex + 0.007, ey - 0.006);
    }
  }
  ink(ctx, T.lw * 0.6, BONE);
}

// ---------------------------------------------------------------- shop parts

/** Shop windows glowing with the wares in silhouette: candy jars (0) or hats and a skull (1). */
function shopWindow(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, wares: 0 | 1, flick: number): void {
  ctx.beginPath();
  quad(ctx, x0, y0, x1, y1);
  ctx.fillStyle = flick > 0.5 ? LAMP : mixed(LAMP, LAMP_DEEP, 0.4);
  ctx.fill();
  ctx.beginPath();
  const n = 4;
  for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 0.5) / n) * (x1 - x0);
    const w = (x1 - x0) / n;
    if (wares === 0) {
      quad(ctx, cx - w * 0.28, y0 + 0.004, cx + w * 0.28, y0 + 0.032 + (i % 2) * 0.01);
      quad(ctx, cx - w * 0.16, y0 + 0.034 + (i % 2) * 0.01, cx + w * 0.16, y0 + 0.042 + (i % 2) * 0.01);
    } else if (i % 2) {
      moveTo(ctx, cx - w * 0.36, y0 + 0.02);
      lineTo(ctx, cx + w * 0.36, y0 + 0.02);
      lineTo(ctx, cx + w * 0.12, y0 + 0.028);
      lineTo(ctx, cx + w * 0.22, y0 + 0.07);
      lineTo(ctx, cx - w * 0.12, y0 + 0.028);
      ctx.closePath();
      quad(ctx, cx - 0.002, y0, cx + 0.002, y0 + 0.02);
    } else {
      quad(ctx, cx - w * 0.3, y0 + 0.002, cx + w * 0.3, y0 + 0.016);
      ctx.moveTo(X(cx, y0 + 0.032) + w * 0.24 * T.U, Y(y0 + 0.032));
      ctx.arc(X(cx, y0 + 0.032), Y(y0 + 0.032), w * 0.24 * T.U, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = mixed(LAMP_DEEP, INK, 0.55);
  ctx.fill();
  ctx.beginPath();
  quad(ctx, x0, y0, x1, y1);
  ink(ctx, T.lw * 1.5, BONE);
  ink(ctx, T.lw * 0.6, INK);
  ctx.beginPath();
  const mid = (x0 + x1) / 2;
  moveTo(ctx, mid, y0);
  lineTo(ctx, mid, y1);
  ink(ctx, T.lw * 0.7, INK);
}

/** The door: a panelled door under a lit fanlight, two steps, inked. */
function door(ctx: Ctx, x: number, w: number, h: number, color: string, flick: number): void {
  ctx.beginPath();
  quad(ctx, x - w / 2 - 0.012, 0, x + w / 2 + 0.012, 0.012);
  quad(ctx, x - w / 2 - 0.004, 0.012, x + w / 2 + 0.004, 0.022);
  inked(ctx, mixed(BONE, INK, 0.45), 0.7);
  ctx.beginPath();
  quad(ctx, x - w / 2, 0.022, x + w / 2, 0.022 + h);
  inked(ctx, color);
  ctx.beginPath();
  moveTo(ctx, x - w / 2, 0.022 + h);
  ctx.arc(X(x, 0.022 + h), Y(0.022 + h), (w / 2) * T.U, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = flick > 0.5 ? LAMP_CORE : LAMP;
  ctx.fill();
  ink(ctx, T.lw * 0.8, INK);
  ctx.beginPath();
  quad(ctx, x - w * 0.3, 0.05, x + w * 0.3, 0.022 + h * 0.45);
  quad(ctx, x - w * 0.3, 0.022 + h * 0.55, x + w * 0.3, 0.012 + h);
  ink(ctx, T.lw * 0.5, INK);
  ctx.fillStyle = BONE;
  ctx.beginPath();
  circle(ctx, X(x + w * 0.3, 0.022 + h * 0.5), Y(0.022 + h * 0.5), 0.005 * T.U);
  ctx.fill();
}

/** Walls in three planes: the face, a lit strip on the left, shade along the foot and the right (inside its bulging outline, no clip). */
function walls(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, color: string, b: number, sag: number): void {
  ctx.beginPath();
  wonky(ctx, x0, y0, x1, y1, b, sag);
  ctx.fillStyle = color;
  ctx.fill();
  const w = x1 - x0;
  ctx.fillStyle = mixed(color, "#ffffff", 0.13);
  ctx.beginPath();
  quad(ctx, x0, y0 + 0.022, x0 + w * 0.14, y1 - sag);
  ctx.fill();
  ctx.fillStyle = mixed(color, INK, 0.32);
  ctx.beginPath();
  quad(ctx, x0, y0, x1, y0 + 0.022);
  quad(ctx, x1 - w * 0.1, y0 + 0.022, x1, y1 - sag * 0.5);
  ctx.fill();
  ctx.beginPath();
  wonky(ctx, x0, y0, x1, y1, b, sag);
  ink(ctx, T.lw, INK);
}

// ---------------------------------------------------------------- the buildings

interface Shop {
  /** Front width (units), the ground floor's height and the upper floor's, its lean. */
  w: number;
  ground: number;
  upper: number;
  lean: number;
  wall: string;
  upperWall: string;
  awning: readonly [string, string];
  door: string;
  seed: number;
  /** Squeezed sideways by this (spindly), and the points its drawing reaches out to (x, y pairs, before the squeeze and lean). */
  squeeze: number;
  reach: readonly number[];
}

/** The sweet shop on the left and the curio shop on the right; they lean in toward the street. */
const SWEETS: Shop = {
  w: 0.28,
  ground: 0.15,
  upper: 0.13,
  lean: 0.075,
  wall: SLATE,
  upperWall: mix(SLATE, PLUM, 0.35),
  awning: [BONE, IRON],
  door: PURPLE_DARK,
  seed: 1,
  squeeze: 0.82,
  // Eaves (and their string lights), the overhanging upper floor, the foot of the walls, the wall lamp, the finial.
  reach: [-0.185, 0.258, 0.185, 0.258, -0.172, 0.15, 0.172, 0.28, -0.152, 0, 0.152, 0, 0.21, 0.11, 0.03, 0.47],
};
const CURIOS: Shop = {
  w: 0.28,
  ground: 0.145,
  upper: 0.12,
  lean: -0.07,
  wall: PLUM,
  upperWall: mix(PLUM, TEALGREY, 0.3),
  awning: [ORANGE, IRON],
  door: TEALGREY,
  seed: 2,
  squeeze: 0.82,
  // The mansard's eaves and lights, the overhang, the walls' foot, the turret and its cap, the cap's
  // curl, the cresting, the inner chimney and its cap, the cage (hook and tray, rocking).
  reach: [-0.18, 0.265, -0.172, 0.15, -0.152, 0, -0.03, 0.1, 0.18, 0.1, 0.18, 0.385, 0.198, 0.37, 0.172, 0.49, 0.17, 0.5, -0.15, 0.38, -0.126, 0.485, -0.088, 0.485, -0.17, 0.34, -0.166, 0.27],
};

/** How tall each corner shop stands above its feet (units, finials included): the sweet shop, the curio shop (its chimney and turret). */
export const SHOP_TOP = 0.47;
const CURIO_TALL = 0.5;
/** The upper floor overhangs the ground floor by this much each side (units). */
const JETTY = 0.014;

/** The sweet shop: a steep sagging gable with a lancet window and an attic vent, a curled finial, a tall crooked chimney, and its sign. */
function sweetShop(ctx: Ctx, s: Scene, sh: Shop, flick: number, t: number): void {
  const hw = sh.w / 2;
  const g = sh.ground;
  const h = g + sh.upper;
  const peak = h + 0.16;
  // The chimney behind the roof, tall and crooked, on the street side.
  ctx.beginPath();
  moveTo(ctx, 0.06, h + 0.06);
  lineTo(ctx, 0.088, h + 0.06);
  curveTo(ctx, 0.1, h + 0.12, 0.084, h + 0.175);
  lineTo(ctx, 0.058, h + 0.172);
  curveTo(ctx, 0.07, h + 0.12, 0.06, h + 0.06);
  ctx.closePath();
  quad(ctx, 0.052, h + 0.168, 0.092, h + 0.183);
  inked(ctx, mixed(SLATE, INK, 0.3), 0.8);
  // Ground floor, then the overhanging upper floor and its gable.
  walls(ctx, -hw, hw, 0, g, sh.wall, 0.006, 0.004);
  walls(ctx, -hw - JETTY, hw + JETTY, g, h, sh.upperWall, 0.01, 0.006);
  ctx.beginPath();
  moveTo(ctx, -hw - JETTY, h - 0.004);
  curveTo(ctx, -0.05, h + 0.06, 0, peak - 0.012);
  curveTo(ctx, 0.05, h + 0.06, hw + JETTY, h - 0.004);
  ctx.closePath();
  inked(ctx, sh.upperWall);
  hatch(ctx, -hw + 0.02, g + 0.012, hw - 0.02, h - 0.012, 3);
  // A band of bone trim under the overhang, with brackets.
  ctx.beginPath();
  quad(ctx, -hw - JETTY - 0.004, g - 0.006, hw + JETTY + 0.004, g + 0.008);
  inked(ctx, BONE, 0.7);
  // The roof: a thick sagging band over the gable, the eaves flaring out.
  ctx.beginPath();
  moveTo(ctx, -hw - 0.04, h - 0.02);
  curveTo(ctx, -0.07, h + 0.07, 0, peak + 0.012);
  curveTo(ctx, 0.07, h + 0.07, hw + 0.04, h - 0.02);
  lineTo(ctx, hw + 0.012, h - 0.024);
  curveTo(ctx, 0.05, h + 0.05, 0, peak - 0.026);
  curveTo(ctx, -0.05, h + 0.05, -hw - 0.012, h - 0.024);
  ctx.closePath();
  inked(ctx, ROOF);
  ctx.beginPath();
  moveTo(ctx, -hw - 0.026, h - 0.012);
  curveTo(ctx, -0.06, h + 0.07, 0, peak);
  ctx.strokeStyle = ROOF_LIGHT;
  ctx.lineWidth = T.lw * 1.2;
  ctx.stroke();
  ctx.beginPath();
  curl(ctx, 0, peak + 0.012, 0.014, 1);
  ink(ctx, T.lw * 1.1, INK);
  // The gable's lancet window, lit (someone passes behind its curtains now and then: the cast's),
  // and over it a little round attic vent, dark (where eyes may open).
  lancet(ctx, 0, h + GABLE_WIN[0], GABLE_WIN[1], GABLE_WIN[2], lightsOut(t, 11, 30) ? 0 : flicker(t, 11));
  ctx.beginPath();
  circle(ctx, X(0, h + VENT[0]), Y(h + VENT[0]), VENT[1] * T.U * T.sx);
  ctx.fillStyle = DARK_PANE;
  ctx.fill();
  ink(ctx, T.lw * 1.2, BONE);
  ink(ctx, T.lw * 0.5, INK);
  // String lights along the eaves, stopping short of the apex so the attic vent stays clear.
  stringLights(-hw - 0.02, h - 0.012, -0.04, h + 0.102, -0.009, 5, t, 1);
  stringLights(0.04, h + 0.102, hw + 0.02, h - 0.012, -0.009, 5, t, 2);
  // Upstairs: two lit windows with crooked shutters, a fan of bunting between them; and hanging
  // from an iron hook under the eave at the street end, the shop's sign, a big wrapped sweet,
  // swinging in the breeze.
  // (The outer one is wide, its curtains drawn: shadows pass behind them now and then, the cast's.)
  windowLit(ctx, SWEET_WIN[0], g + SWEET_WIN[1], SWEET_WIN[2], SWEET_WIN[3], flicker(t, 12), null, false, 0, true);
  windowLit(ctx, 0.07, g + 0.03, 0.05, 0.07, lightsOut(t, 13, 2.2) ? 0 : flicker(t, 13), PURPLE_DARK, false, -0.05);
  windowsUp(ctx);
  fan(ctx, 0, h - 0.002, 0.032);
  const land = s.sinceLand ?? Infinity;
  const a = swing(t, SIGN_SWING[1], SIGN_SWING[0], 1.3, land, 0.2, s.still === true);
  const hx = X(SIGN_HOOK[0], h + SIGN_HOOK[1]);
  const hy = Y(h + SIGN_HOOK[1]);
  sweetSign(ctx, X(hw - 0.004, h + SIGN_HOOK[1]), hx, hy, SIGN_SIZE * T.U * Math.max(0.8, T.sx), a, T.lw);
  // A stitched patch on the wall.
  patch(ctx, -hw + 0.01, 0.035, 0.032, 0.045, mixed(sh.wall, PLUM, 0.5));
  // Downstairs: the shop window under its striped awning, and the door with its lamp.
  shopWindow(ctx, -0.095, 0.03, 0.03, 0.112, 0, flick);
  awning(ctx, -0.112, 0.045, 0.114, 0.03, sh.awning);
  door(ctx, 0.09, 0.05, 0.095, sh.door, flick);
  wallLamp(ctx, 0.118, 0.13, 1, 0.9 + flick * 0.1);
  smallJack(ctx, 0.045, 0, 0.017, flick);
  smallJack(ctx, 0.128, 0, 0.015, 1 - flick);
  smallJack(ctx, -0.118, 0, 0.018, 1 - flick);
}

/** The sweet shop's wide upstairs window with its curtains (x, sill above the ground floor, width, height, units). */
const SWEET_WIN = [-0.072, 0.022, 0.116, 0.088] as const;
/** The sweet shop's gable window (y above the upper floor's top, width, height) and attic vent (y, radius), units. */
const GABLE_WIN = [0.026, 0.044, 0.07] as const;
const VENT = [0.118, 0.012] as const;
/** Its sign: the hook (x, and y from the upper floor's top, units: under the eave at the street end), the sign's size (units), its swing (rad, s). */
const SIGN_HOOK = [0.13, -0.026] as const;
const SIGN_SIZE = 0.075;
const SIGN_SWING = [0.1, 2.6] as const;

/** The curio shop's mansard top, its inner chimney (x from the inner wall, height above the top, units), the belvedere's rail and cap. */
const CURIO_TOP = 0.09;
const CHIMNEY = { x: 0.062, w: 0.026, top: 0.13 } as const;
const BELVEDERE = { rail: 0.05, cap: 0.118, w: 0.036 } as const;
/** The birdcage: its hook (x out past the inner wall, y below the mansard's top, units), its size (units), its rock (rad, s). */
const CAGE = { x: 0.01, y: -0.012, size: 0.095, rock: 0.12, period: 3.1 } as const;
/** The curio's wide upstairs window with its curtains (x, sill above the ground floor, width, height, units). */
const CURIO_WIN = [-0.008, 0.02, 0.092, 0.088] as const;
/** The big dormer's lancet window (x, its sill above the upper floor's top, width, height, units). */
const DORMER_WIN = [-0.04, 0.02, 0.036, 0.052] as const;

/**
 * The curio shop: a mansard with a big lancet dormer and a small one, iron cresting and a crooked
 * chimney at its inner end smoking away; a birdcage hanging off that end; the turret on its outer
 * corner (drawn over the cast: turretOver) behind whose open belvedere something peeks now and then.
 */
function curioShop(ctx: Ctx, s: Scene, sh: Shop, flick: number, t: number): void {
  const hw = sh.w / 2;
  const g = sh.ground;
  const h = g + sh.upper;
  const top = h + CURIO_TOP;
  // The belvedere's dark inside (its rail, posts and cap are drawn over the cast: turretOver).
  const tx = hw - 0.012;
  ctx.beginPath();
  quad(ctx, tx - BELVEDERE.w * 0.92, h + BELVEDERE.rail - 0.004, tx + BELVEDERE.w * 0.92, h + BELVEDERE.cap + 0.004);
  ctx.fillStyle = BELVEDERE_DARK;
  ctx.fill();
  // The crooked chimney at the mansard's inner end, leaning out over the street.
  const cx = -hw + CHIMNEY.x;
  ctx.beginPath();
  moveTo(ctx, cx - CHIMNEY.w / 2, top - 0.02);
  lineTo(ctx, cx + CHIMNEY.w / 2, top - 0.02);
  curveTo(ctx, cx + CHIMNEY.w * 0.4, top + CHIMNEY.top * 0.5, cx - 0.004, top + CHIMNEY.top - 0.012);
  lineTo(ctx, cx - CHIMNEY.w - 0.004, top + CHIMNEY.top - 0.012);
  curveTo(ctx, cx - CHIMNEY.w * 0.6, top + CHIMNEY.top * 0.5, cx - CHIMNEY.w / 2, top - 0.02);
  ctx.closePath();
  quad(ctx, cx - CHIMNEY.w - 0.012, top + CHIMNEY.top - 0.014, cx + 0.006, top + CHIMNEY.top);
  inked(ctx, mixed(PLUM, INK, 0.35), 0.8);
  ctx.beginPath();
  moveTo(ctx, cx - CHIMNEY.w * 0.2, top + 0.01);
  lineTo(ctx, cx - CHIMNEY.w * 0.35, top + CHIMNEY.top * 0.45);
  ctx.strokeStyle = mixed(PLUM, "#ffffff", 0.12);
  ctx.lineWidth = T.lw;
  ctx.stroke();
  // Ground floor, the overhanging upper floor.
  walls(ctx, -hw, hw - 0.04, 0, g, sh.wall, 0.006, 0.004);
  walls(ctx, -hw - JETTY, hw - 0.04, g, h, sh.upperWall, 0.01, 0.008);
  hatch(ctx, -hw + 0.02, g + 0.012, hw - 0.06, h - 0.012, 4);
  ctx.beginPath();
  quad(ctx, -hw - JETTY - 0.004, g - 0.006, hw - 0.036, g + 0.008);
  inked(ctx, BONE, 0.7);
  // The mansard: a steep sagging slope, iron cresting with curls along the top.
  ctx.beginPath();
  moveTo(ctx, -hw - 0.03, h - 0.004);
  lineTo(ctx, hw - 0.03, h - 0.004);
  lineTo(ctx, hw - 0.06, top);
  curveTo(ctx, -0.03, top - 0.012, -hw + 0.0, top);
  ctx.closePath();
  inked(ctx, ROOF);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const sx = -hw - 0.012 + i * 0.05;
    moveTo(ctx, sx, h + 0.012);
    lineTo(ctx, sx + 0.04, h + 0.012);
    moveTo(ctx, sx + 0.025, h + 0.05);
    lineTo(ctx, sx + 0.06, h + 0.05);
  }
  ctx.strokeStyle = ROOF_LIGHT;
  ctx.lineWidth = T.lw;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const cx2 = -hw + 0.05 + i * 0.05;
    const cy = top - 0.006 * Math.sin(((i + 0.5) / 4) * Math.PI);
    moveTo(ctx, cx2, cy);
    lineTo(ctx, cx2, cy + 0.016);
    curl(ctx, cx2, cy + 0.016, 0.006, i % 2 ? 1 : -1);
  }
  ink(ctx, T.lw * 0.9, IRON);
  // Two dormers on the slope, below its top: a big one with a lancet window, and a small one.
  for (let d = 0; d < 2; d++) {
    const dx = d === 0 ? DORMER_WIN[0] : 0.055;
    const hwD = d === 0 ? DORMER_WIN[2] * 0.5 + 0.008 : 0.018;
    const tall = d === 0 ? 0.084 : 0.06;
    ctx.beginPath();
    moveTo(ctx, dx - hwD, h + 0.008);
    lineTo(ctx, dx + hwD, h + 0.008);
    lineTo(ctx, dx + hwD, h + tall * 0.62);
    lineTo(ctx, dx, h + tall);
    lineTo(ctx, dx - hwD, h + tall * 0.62);
    ctx.closePath();
    inked(ctx, sh.upperWall);
    if (d === 0) lancet(ctx, dx, h + DORMER_WIN[1], DORMER_WIN[2], DORMER_WIN[3], flicker(t, 21));
    else windowLit(ctx, dx, h + 0.016, 0.02, 0.028, lightsOut(t, 22, 14) ? 0 : flicker(t, 22), null, true);
  }
  // String lights along the cornice.
  stringLights(-hw - 0.025, h - 0.008, hw - 0.035, h - 0.008, 0.02, 9, t, 3);
  // Upstairs: two tall arched windows, a fan of bunting.
  windowLit(ctx, -0.095, g + 0.025, 0.042, 0.08, flicker(t, 23), null, true, 0.05);
  windowLit(ctx, CURIO_WIN[0], g + CURIO_WIN[1], CURIO_WIN[2], CURIO_WIN[3], flicker(t, 24), null, false, 0, true);
  windowsUp(ctx);
  fan(ctx, 0.065, h - 0.012, 0.03);
  // Downstairs: a shop window with the wares, an orange-and-black awning, the door and its lamp.
  shopWindow(ctx, -0.13, -0.005, 0.03, 0.108, 1, flick);
  awning(ctx, -0.143, 0.008, 0.11, 0.03, sh.awning);
  door(ctx, 0.052, 0.048, 0.092, sh.door, flick);
  wallLamp(ctx, 0.017, 0.122, -1, 0.9 + (1 - flick) * 0.1);
  smallJack(ctx, 0.0, 0, 0.016, 1 - flick);
  smallJack(ctx, 0.095, 0, 0.018, flick);
  smallJack(ctx, -0.135, 0, 0.015, flick);
  // The birdcage's back (the cast's skeletal bird lives in it; its bars go over it: turretOver).
  const c = cageAt(s, t);
  cage(ctx, c.x, c.y, c.size, c.a, T.lw, false);
}

/** The curio's turret on its outer corner, its open belvedere, a torn banner off its rail, and the cage's bars: drawn over the cast. */
function turretOver(ctx: Ctx, s: Scene, sh: Shop, t: number): void {
  const hw = sh.w / 2;
  const g = sh.ground;
  const h = g + sh.upper;
  const tx = hw - 0.012;
  const bw = BELVEDERE.w;
  ctx.beginPath();
  wonky(ctx, tx - bw, 0.1, tx + bw, h + BELVEDERE.rail, 0.006, 0);
  inked(ctx, TURRET_WALL);
  hatch(ctx, tx - bw + 0.008, 0.12, tx + bw - 0.008, h + BELVEDERE.rail - 0.01, 2);
  windowLit(ctx, tx, h - 0.03, 0.026, 0.05, lightsOut(t, 31, 6.5) ? 0 : flicker(t, 31), null, true);
  windowLit(ctx, tx, g + 0.03, 0.026, 0.05, flicker(t, 32), null, true);
  windowsUp(ctx);
  // The belvedere: a rail across its open front, a post each side, and the witch-hat cap over it.
  ctx.beginPath();
  quad(ctx, tx - bw - 0.004, h + BELVEDERE.rail - 0.004, tx + bw + 0.004, h + BELVEDERE.rail + 0.008);
  quad(ctx, tx - bw, h + BELVEDERE.rail, tx - bw + 0.009, h + BELVEDERE.cap);
  quad(ctx, tx + bw - 0.009, h + BELVEDERE.rail, tx + bw, h + BELVEDERE.cap);
  inked(ctx, IRON, 0.7);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const bx = tx - bw + (2 * bw * i) / 4;
    moveTo(ctx, bx, h + BELVEDERE.rail - 0.002);
    lineTo(ctx, bx, h + BELVEDERE.rail - 0.022);
  }
  ink(ctx, T.lw * 0.6, IRON);
  ctx.beginPath();
  moveTo(ctx, tx - 0.05, h + BELVEDERE.cap);
  curveTo(ctx, tx - 0.008, h + BELVEDERE.cap + 0.065, tx + 0.03, h + BELVEDERE.cap + 0.1);
  curveTo(ctx, tx + 0.006, h + BELVEDERE.cap + 0.055, tx + 0.05, h + BELVEDERE.cap);
  ctx.closePath();
  inked(ctx, ROOF);
  ctx.beginPath();
  curl(ctx, tx + 0.03, h + BELVEDERE.cap + 0.1, 0.01, 1);
  ink(ctx, T.lw, INK);
  // A torn banner tied to the rail, streaming in toward the street.
  fabric(ctx, t, X(tx - bw, h + BELVEDERE.rail + 0.004), Y(h + BELVEDERE.rail + 0.004), 0.05 * T.U, 0.012 * T.U, -1, 1.3, BANNER, T.lw);
  const c = cageAt(s, t);
  cage(ctx, c.x, c.y, c.size, c.a, T.lw, true);
}

const BELVEDERE_DARK = "#2a2048";
const DARK_PANE = DARK_PANE_;
const TURRET_WALL = mix(PLUM, TEALGREY, 0.55);
const BANNER = "#cfc6e0";

/** Scratch: the cage's hook, size and rock this frame (set while the curio's frame T is current). */
const CG = { x: 0, y: 0, size: 0, a: 0 };
function cageAt(s: Scene, t: number): typeof CG {
  const hw = CURIOS.w / 2;
  const top = CURIOS.ground + CURIOS.upper + CURIO_TOP;
  CG.x = X(-hw + CAGE.x, top + CAGE.y);
  CG.y = Y(top + CAGE.y);
  CG.size = CAGE.size * T.U;
  CG.a = swing(t, CAGE.period, CAGE.rock, 4.1, s.sinceLand ?? Infinity, 0.25, s.still === true);
  return CG;
}

/**
 * A few hand-drawn hatch strokes on a wall (x0..x1, y0..y1, units), for a hand-made texture: short
 * diagonal pen strokes in the wall's shade, the same every frame.
 */
function hatch(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = x0 + (x1 - x0) * hash(seed * 31 + i);
    const y = y0 + (y1 - y0) * hash(seed * 37 + i + 9);
    moveTo(ctx, x, y);
    lineTo(ctx, x + 0.012, y + 0.016);
    moveTo(ctx, x + 0.006, y - 0.002);
    lineTo(ctx, x + 0.016, y + 0.012);
  }
  ctx.strokeStyle = HATCH;
  ctx.lineWidth = Math.max(0.6, T.lw * 0.45);
  ctx.stroke();
}
const HATCH = "rgba(14, 10, 22, 0.32)";

/**
 * A spindly crooked tower-house for wide screens: tall and narrow, a window to each of its
 * stories, a balcony, a witch-hat roof curling at its tip, a crooked chimney. Units as a shop's;
 * `stories` of 0.11 each.
 */
function towerHouse(ctx: Ctx, w: number, stories: number, color: string, flick: number): void {
  const hw = w / 2;
  const h = stories * 0.11;
  ctx.beginPath();
  moveTo(ctx, hw * 0.3, h);
  lineTo(ctx, hw * 0.3 + 0.02, h);
  lineTo(ctx, hw * 0.3 + 0.03, h + 0.12);
  lineTo(ctx, hw * 0.3 + 0.01, h + 0.12);
  ctx.closePath();
  inked(ctx, mixed(color, INK, 0.3), 0.8);
  walls(ctx, -hw, hw, 0, h, color, 0.008, 0.006);
  ctx.beginPath();
  moveTo(ctx, -hw - 0.025, h - 0.01);
  curveTo(ctx, -hw * 0.3, h + 0.08, hw * 0.4, h + 0.2);
  curveTo(ctx, hw * 0.2, h + 0.08, hw + 0.025, h - 0.01);
  ctx.closePath();
  inked(ctx, ROOF);
  ctx.beginPath();
  curl(ctx, hw * 0.4, h + 0.2, 0.012, 1);
  ink(ctx, T.lw, INK);
  for (let i = 0; i < stories; i++) {
    windowLit(ctx, (i % 2 ? 0.012 : -0.012) * (w / 0.1), i * 0.11 + 0.03, Math.min(0.04, w * 0.42), 0.055, (i + flick) % 2 > 1 ? 1 : 0.6, null, i === stories - 1, (i % 2 ? 0.06 : -0.06));
  }
  windowsUp(ctx);
  ctx.beginPath();
  quad(ctx, -hw - 0.012, 0.11 * Math.max(1, stories - 2), hw + 0.012, 0.11 * Math.max(1, stories - 2) + 0.008);
  inked(ctx, IRON, 0.6);
  ctx.beginPath();
  const by = 0.11 * Math.max(1, stories - 2);
  for (let i = 0; i <= 4; i++) {
    const bx = -hw - 0.008 + (i / 4) * (w + 0.016);
    moveTo(ctx, bx, by);
    lineTo(ctx, bx, by + 0.03);
  }
  moveTo(ctx, -hw - 0.012, by + 0.03);
  lineTo(ctx, hw + 0.012, by + 0.03);
  ink(ctx, T.lw * 0.8, IRON);
}

// ---------------------------------------------------------------- placing

/** The shops keep this far below the moon and in from the screen's sides (u), and shrink no further than this. */
const MOON_GAP = 0.014;
const SIDE_GAP = 0.012;
const MIN_SCALE = 0.5;
/**
 * The sweet shop keeps this far (u) left of the tower's column: the churchyard crow climbs that
 * stretch of the lane on its way up to the moon and back (flight.ts), on the tower's side of the
 * kids and the shop (the owner's beat), so the shop stands clear of it, spindlier where it must.
 */
export const CROW_LANE = 0.075;
/** The sweet shop is squeezed no thinner than this (times its own squeeze). */
const MIN_SQUEEZE = 0.6;

/** How far a shop's drawing reaches either side of its middle (units, squeezed by `sq` and leaned): [min, max]. */
function reachOf(sh: Shop, sq = sh.squeeze): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < sh.reach.length; i += 2) {
    const x = sh.reach[i]! * sq + sh.lean * sh.reach[i + 1]!;
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return [lo, hi];
}
const REACH = [reachOf(SWEETS), reachOf(CURIOS)] as const;

/** Scratch: the sweet shop's squeeze on this screen and its reach. */
const SQ = { w: NaN, h: NaN, u: NaN, baseX: NaN, sq: SWEETS.squeeze, lo: REACH[0][0], hi: REACH[0][1] };

/**
 * px per unit at the corner shops' depth: shrunk where the screen leaves them less room, under the
 * moon (the sweet shop's top always stays clear below it) or across the lane between the tower's
 * column and the screen's side. Measured in the view at rest, so a shop keeps its size as you climb.
 */
function cornerU(s: Scene): number {
  const U = (s.u * TOWER_DEPTH) / CORNER_Z;
  const ground = s.groundY - s.rise;
  const feet = ground - s.u * 0.3 + (s.u * 0.3 * TOWER_DEPTH) / CORNER_Z;
  const m = moonAt(s);
  const tall = (feet - (m.y0 + m.r0 + s.u * MOON_GAP)) / (SHOP_TOP * U);
  const lane = s.cssW / 2 - STREET_X * U - s.u * SIDE_GAP;
  const wide = Math.min(lane / (REACH[0][1] - REACH[0][0]), lane / (REACH[1][1] - REACH[1][0])) / U;
  return U * Math.max(MIN_SCALE, Math.min(1, tall, wide));
}

/** How much the corner shops are shrunk on this screen (1: full size): Main Street's walls follow suit. */
export function shopScale(s: Scene): number {
  return cornerU(s) / ((s.u * TOWER_DEPTH) / CORNER_Z);
}

/**
 * Where the corner shop on `side` stands: its middle's screen x (at its feet, before the lean),
 * its feet, px per unit. Its inner reach (eaves, lights) is on the street's wall line, just outside
 * the tower's column.
 */
function place(s: Scene, side: -1 | 1): { x: number; y: number; U: number } {
  const U = cornerU(s);
  const U0 = (s.u * TOWER_DEPTH) / CORNER_Z;
  if (side > 0) return { x: s.cssW / 2 + STREET_X * U0 - REACH[1][0] * U, y: fieldY(s, CORNER_Z), U };
  const sweets = sweetsFit(s, U);
  return { x: sweetsEdge(s) - sweets.hi * U, y: fieldY(s, CORNER_Z), U };
}

/** Where the sweet shop's inner reach may come to: the street's wall line, or short of the crow's stretch of the lane. */
function sweetsEdge(s: Scene): number {
  const U0 = (s.u * TOWER_DEPTH) / CORNER_Z;
  return Math.min(s.cssW / 2 - STREET_X * U0, s.baseX - s.u * (0.05 + CROW_LANE));
}

/**
 * The sweet shop's squeeze on this screen: its own, or thinner (down to MIN_SQUEEZE of it) until it
 * fits between the screen's side and the crow's stretch of the lane. Kept while the screen holds.
 */
function sweetsFit(s: Scene, U: number): typeof SQ {
  if (SQ.w === s.cssW && SQ.h === s.cssH && SQ.u === s.u && SQ.baseX === s.baseX) return SQ;
  const room = sweetsEdge(s) - s.u * SIDE_GAP;
  let sq = SWEETS.squeeze;
  let [lo, hi] = reachOf(SWEETS, sq);
  while ((hi - lo) * U > room && sq > SWEETS.squeeze * MIN_SQUEEZE) {
    sq = Math.max(SWEETS.squeeze * MIN_SQUEEZE, sq - 0.005);
    [lo, hi] = reachOf(SWEETS, sq);
  }
  SQ.w = s.cssW;
  SQ.h = s.cssH;
  SQ.u = s.u;
  SQ.baseX = s.baseX;
  SQ.sq = sq;
  SQ.lo = lo;
  SQ.hi = hi;
  return SQ;
}

/** Scratch box of a building on screen. */
const B = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box of the corner shop on `side` (-1 left of the tower, 1 right): eaves, turret and ink included. */
export function shopBox(s: Scene, side: -1 | 1): typeof B {
  const p = place(s, side);
  const [lo, hi] = side < 0 ? [SQ.lo, SQ.hi] : REACH[1];
  const lw = Math.max(1.1, s.u * 0.0052 * Math.sqrt(TOWER_DEPTH / CORNER_Z));
  B.x0 = p.x + lo * p.U - lw;
  B.x1 = p.x + hi * p.U + lw;
  B.y0 = p.y - (side < 0 ? SHOP_TOP : CURIO_TALL) * p.U - lw;
  B.y1 = p.y + lw;
  return B;
}

/** Light from the shop windows lying on the cobbles in front. */
function spill(ctx: Ctx, s: Scene): void {
  ctx.fillStyle = POOL;
  ctx.beginPath();
  for (const side of [-1, 1] as const) {
    const b = shopBox(s, side);
    const p = place(s, side);
    oval(ctx, (b.x0 + b.x1) / 2, p.y + 0.012 * p.U, (b.x1 - b.x0) * 0.42, 0.03 * p.U);
  }
  ctx.fill();
}

/** Outer tower-houses: which side, how many stories, width (units), color; the first ones stand nearest the screen's edges. */
const OUTER = [
  { side: -1, w: 0.08, stories: 5, color: TEALGREY },
  { side: 1, w: 0.1, stories: 4, color: MOSSGREY },
  { side: -1, w: 0.12, stories: 3, color: PLUM },
  { side: 1, w: 0.12, stories: 5, color: SLATE },
] as const;
/** A tower-house's reach either side of its middle and its height above its stories (units: eaves, roof, curl, chimney). */
const TOWER_EAVE = 0.04;
const TOWER_ROOF = 0.23;

/**
 * The outer tower-houses that fit this screen whole: from each screen edge in toward the corner
 * shop, clear of it, and never across the moon (wholly beside its disc, or wholly below it).
 */
function outer(ctx: Ctx, s: Scene, t: number): void {
  const U = cornerU(s);
  const y = fieldY(s, CORNER_Z);
  const m = moonAt(s);
  const clear = m.r * 1.03 + s.u * 0.006;
  const edge = [s.u * SIDE_GAP, s.cssW - s.u * SIDE_GAP];
  for (const o of OUTER) {
    const side = o.side as -1 | 1;
    const box = shopBox(s, side);
    // On the moon's side they stand no taller than the sweet shop: the crow circles the moon above that roofline.
    const stories = side < 0 ? Math.min(o.stories, Math.floor(((y - box.y0) / U - TOWER_ROOF) / 0.11)) : o.stories;
    if (stories < 2) continue;
    const half = (o.w / 2 + TOWER_EAVE + 0.05 * stories * 0.11) * U;
    const i = side < 0 ? 0 : 1;
    const x = side < 0 ? edge[0]! + half : edge[1]! - half;
    const top = y - (stories * 0.11 + TOWER_ROOF) * U;
    if (side < 0 ? x + half > box.x0 - s.u * 0.01 : x - half < box.x1 + s.u * 0.01) continue;
    if (x + half > m.x - clear && x - half < m.x + clear && top < m.y + clear) continue;
    edge[i] = side < 0 ? x + half + s.u * 0.01 : x - half - s.u * 0.01;
    T.x = x;
    T.y = y;
    T.U = U;
    T.lean = side * -0.05;
    T.sx = 1;
    towerHouse(ctx, o.w, stories, o.color, 0.5 + 0.5 * Math.sin(t * 2 + x));
  }
  T.lean = 0;
}

/** The corner shops facing the square, and their outer neighbors on wide screens. */
/** Whether the corner shops are out of sight: below the screen, or swallowed whole by the mist floor. */
function hidden(s: Scene): boolean {
  const U = cornerU(s);
  const top = fieldY(s, CORNER_Z) - (CURIO_TALL + 0.6) * U;
  return top > s.cssH || top > mistTop(s) + s.u * 0.01;
}

export function shops(ctx: Ctx, s: Scene): void {
  if (hidden(s)) return;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  T.lw = Math.max(1.1, s.u * 0.0052 * Math.sqrt(TOWER_DEPTH / CORNER_Z));
  outer(ctx, s, s.t);
  spill(ctx, s);
  for (const side of SIDES) {
    const sh = frame(s, side);
    const flick = 0.5 + 0.5 * Math.sin(s.t * 5 + sh.seed * 2) * Math.sin(s.t * 3.3 + sh.seed);
    if (side < 0) sweetShop(ctx, s, sh, flick, s.t);
    else curioShop(ctx, s, sh, flick, s.t);
  }
  // Both shops' little jack-o'-lanterns and string lights together (the shops stand at opposite
  // sides, so drawing the sweet shop's after the curio shop changes nothing; a fill each saved).
  jacksUp(ctx);
  lightsUp(ctx);
  T.lean = 0;
  T.sx = 1;
  chimneySmoke(ctx, s);
}
const SIDES = [-1, 1] as const;

/** Set the frame T for the corner shop on `side` (its spot, size, lean and squeeze) and return the shop. */
function frame(s: Scene, side: -1 | 1): Shop {
  const sh = side < 0 ? SWEETS : CURIOS;
  const p = place(s, side);
  T.x = p.x;
  T.y = p.y;
  T.U = p.U;
  T.lean = sh.lean;
  T.sx = side < 0 ? sweetsFit(s, p.U).sq : sh.squeeze;
  T.lw = Math.max(1.1, s.u * 0.0052 * Math.sqrt(TOWER_DEPTH / CORNER_Z));
  return sh;
}

/** The shops' fronts, drawn after the cast's NEAR slot: the curio's turret and belvedere, and the cage's bars. */
export function shopsOver(ctx: Ctx, s: Scene): void {
  if (hidden(s)) return;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const sh = frame(s, 1);
  turretOver(ctx, s, sh, s.t);
  T.lean = 0;
  T.sx = 1;
}

// ---------------------------------------------------------------- anchors (stage.ts)

/** Scratch point for the anchors below. */
const AP = { x: 0, y: 0, k: 0 };

/**
 * A point of a corner shop on screen: (x, y) in its own units (from the middle of its front, up from
 * its feet), and its px per u (k: the shop's size factor, 1 at the tower's line). For the cast's anchors.
 */
export function shopPoint(s: Scene, side: -1 | 1, x: number, y: number): typeof AP {
  frame(s, side);
  AP.x = X(x, y);
  AP.y = Y(y);
  AP.k = T.U / s.u;
  T.lean = 0;
  T.sx = 1;
  return AP;
}

/** Where things live on the corner shops, in their own units (see shopPoint). */
export const SHOP_SPOTS = {
  /** Under the sweet shop's outer eave (the spider's thread hangs from it). */
  eave: { x: -SWEETS.w / 2 + 0.004, y: SWEETS.ground + SWEETS.upper - 0.006 },
  /** Its gable window (bottom-left and top-right corners) and attic vent (center, radius). */
  gable: { x0: SWEET_WIN[0] - SWEET_WIN[2] / 2, y0: SWEETS.ground + SWEET_WIN[1], x1: SWEET_WIN[0] + SWEET_WIN[2] / 2, y1: SWEETS.ground + SWEET_WIN[1] + SWEET_WIN[3] },
  vent: { x: 0, y: SWEETS.ground + SWEETS.upper + VENT[0], r: VENT[1] },
  /** The curio's chimney top (the raven's perch), its ridge (the turret end, the inner end), the belvedere (its opening, the rail's top), the dormer window. */
  chimney: { x: -CURIOS.w / 2 + CHIMNEY.x - CHIMNEY.w / 2 - 0.003, y: CURIOS.ground + CURIOS.upper + CURIO_TOP + CHIMNEY.top },
  ridge: { hx: CURIOS.w / 2 - 0.012 - BELVEDERE.w, ex: -CURIOS.w / 2 + CHIMNEY.x + CHIMNEY.w, y: CURIOS.ground + CURIOS.upper + CURIO_TOP - 0.004 },
  belvedere: { x0: CURIOS.w / 2 - 0.012 - BELVEDERE.w + 0.009, x1: CURIOS.w / 2 - 0.012 + BELVEDERE.w - 0.009, y: CURIOS.ground + CURIOS.upper + BELVEDERE.rail + 0.008 },
  dormer: { x0: CURIO_WIN[0] - CURIO_WIN[2] / 2, y0: CURIOS.ground + CURIO_WIN[1], x1: CURIO_WIN[0] + CURIO_WIN[2] / 2, y1: CURIOS.ground + CURIO_WIN[1] + CURIO_WIN[3] },
} as const;

/** The cage's perch this frame (where the skeletal bird stands: the cage's floor, rocking with it), its size factor. */
export function cagePerch(s: Scene): typeof AP {
  frame(s, 1);
  const c = cageAt(s, s.t);
  const d = c.size * 0.96;
  AP.x = c.x - Math.sin(c.a) * d;
  AP.y = c.y + Math.cos(c.a) * d;
  AP.k = T.U / s.u;
  T.lean = 0;
  T.sx = 1;
  return AP;
}

/** The curio's chimney smoking: a puff every 1.1 s rising and curling away over the mansion. */
function chimneySmoke(ctx: Ctx, s: Scene): void {
  if (hidden(s)) return;
  const p = shopPoint(s, 1, SHOP_SPOTS.chimney.x, SHOP_SPOTS.chimney.y);
  smoke(ctx, s.t, p.x, p.y - s.u * 0.006, s.u * 0.012, s.u * 0.15, s.u * 0.05, 1.1, 0.32, 3);
}

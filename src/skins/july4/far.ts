import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { country, HILL_BASE } from "./country";
import { church, courthouse, POLE_TOP } from "./landmarks";
import { smooth } from "./shapes";
import { DAY_HIGH, level, type Tone } from "./tone";
import { rooftops, townLine, townRow, TOWN_TOP, trees } from "./town";

// The far layer, standing on the horizon, printed like a WPA poster: flat inks in layers of
// atmosphere, each a step paler further back, no outlines, everything lit from the left with a
// flat shadow plane on its right. Furthest, the poster cumulus: a low bank on the left, under
// the sun, and on the right a great tower of cumulus climbing the lane nearly to the top of the
// screen, printed scallops (the cloud sea's billows' shape) with lit caps and shaded undersides
// round a shaded core. Then the country beyond the town (country.ts), and (in front of the lane
// while the land shows, behind it once the cloud sea has it: july4.ts) the town itself (town.ts): two rows of rooftops stepping back from Main Street, Main Street
// with the faint block behind the tower, the church and the courthouse (landmarks.ts) and the
// big summer trees, all standing on the town's line a little in front of the hills (the far
// side of the square). Above the start a floor of cloud gathers below you and swallows the
// town; from then on its scalloped top is the horizon, piled up on the right under the cumulus
// tower, and only the steeple and the courthouse's tower, dome and flag stand out of it, with
// the cumulus beside them, towering by day and settling to low banks by night (from dusk the
// landmarks are printed as the poster's skyline silhouettes, one dark ink with the windows and
// the clock lit, the flag floodlit: tone.ts). Then the floor sinks with them to rest low on the
// screen, and there it stays for good, a sea of cloud printed in rows of billows at the sides
// (the column one calm ink), for the sun to set into and rise out of on every turn of the
// story's loop (tone.ts), and for the fireworks to light at the show's finale. Nothing here
// moves but the courthouse flag.
//
// Positions are in u from the screen center, heights in u up from the line things stand on.

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;
/** As it gathers, the floor's top climbs this far above the town's line (u): over the whole town but the landmarks, so nothing is cut when the town stops being drawn. */
export const COVER = TOWN_TOP + 0.015;
/** The level the floor begins to gather at (its top comes up from below the screen). */
const GATHER_FROM = 13;

/**
 * The line the cloud floor lies along once it has gathered: COVER above the town's line while
 * the land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const cover = townLine(s) - s.u * COVER;
  return cover + (s.cssH - s.u * FLOOR_REST - cover) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** Where the cloud floor's top edge is: below the screen at the start, over the town once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(GATHER_FROM, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  return below + (seaLine(s, lvl) - below) * k;
}

/** The land below (the town, the square) shows only until the cloud floor covers it. */
export function landShows(s: Scene): boolean {
  return level(s) < DAY_HIGH;
}

/**
 * The line the steeple and the courthouse stand on: the town's while the land shows, then,
 * as the floor sinks to its rest, they rise out of it until they stand on its line.
 */
export function landmarkLine(s: Scene): number {
  const lvl = level(s);
  return seaLine(s, lvl) + s.u * COVER * (1 - smooth(DAY_HIGH, FLOOR_SETTLED, lvl));
}

/** Below this (u under the floor's top) the cloud floor is solid. */
const FLOOR_SOLID = 0.06;

/** Where the sky stops: below this the hills and the lawn, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s) ? s.horizonY + s.u * HILL_BASE : top + s.u * FLOOR_SOLID;
}

/**
 * How high (u above the line) the far layer covers both lanes from the screen's sides in to the
 * column while the land shows: the far range and the ridge never dip below it out there
 * (country.ts), so nothing behind them below it is ever seen.
 */
const LANES_HIDDEN = 0.22;
/** Below this the cloud floor (drawn over everything at the end) is solid: whatever lies wholly under it need not be drawn. */
export function floorCover(s: Scene, top: number): number {
  return top + s.u * (FACE + 0.005);
}

/** Where the sunburst's rays may stop: the far layer covers the lanes below it, or the cloud sea's scalloped top (its dips) does. */
export function rayFoot(s: Scene, top: number, line: number): number {
  return landShows(s) ? line - s.u * LANES_HIDDEN : top + s.u * 0.012;
}

// ---------------------------------------------------------------- the poster cumulus

/**
 * The poster cumulus piled behind the town at either side, as a WPA poster stacks them: lobes of
 * [X (u from center), height of the lobe's center above the line (u), radius (u)]. On the left a
 * low bank, where the sun hangs above it (on an iPad or a wide window the sun's halo hangs only
 * 0.3 u over the country); on the right a great tower of cumulus climbing the lane nearly to the
 * top of the screen, narrowing as it rises. None behind the tower's column.
 */
const BANK = [
  [-0.86, 0.14, 0.1],
  [-0.72, 0.2, 0.09],
  [-0.6, 0.25, 0.075],
  [-0.5, 0.27, 0.065],
  [-0.42, 0.2, 0.06],
  [-0.36, 0.13, 0.05],
  [-0.235, 0.12, 0.04],
] as const;
const TOWER = [
  [0.31, 0.12, 0.1],
  [0.47, 0.1, 0.11],
  [0.66, 0.12, 0.12],
  [0.86, 0.11, 0.11],
  [0.35, 0.29, 0.09],
  [0.51, 0.29, 0.1],
  [0.7, 0.27, 0.1],
  [0.38, 0.45, 0.085],
  [0.53, 0.46, 0.09],
  [0.41, 0.6, 0.078],
  [0.535, 0.62, 0.075],
  [0.44, 0.74, 0.066],
  [0.465, 0.83, 0.058],
] as const;

/**
 * The tower's core (X u, height above the line u): an outline just inside its scallops' edges,
 * printed in the shade, so the crevices between the scallops are shade and the stack reads as one
 * towering mass (a core inside the lobes' centers left sky between them: a pile of loose buns).
 */
const CORE = [
  [0.3, 0.06],
  [0.285, 0.29],
  [0.315, 0.45],
  [0.35, 0.6],
  [0.39, 0.74],
  [0.43, 0.84],
  [0.5, 0.84],
  [0.56, 0.62],
  [0.6, 0.46],
  [0.76, 0.27],
  [0.92, 0.11],
  [0.92, 0.06],
] as const;

/** Over the cloud sea by day, the bank towers up to 1 + BANK_GROW times as high and the tower to 1 + TOWER_GROW (their lobes a share of that bigger), grown by BUILT levels above the town. */
const BANK_GROW = 1.0;
const TOWER_GROW = 0.2;
const LOBE_GROW = 0.4;
const BUILT = 10;
/** By night (tone.ts towers 0) the tower settles to this share of its height, a bank under the show. */
const TOWER_NIGHT = 0.5;

/** How many times its plain height a side's cumulus stands: the bank plain over the town and towering over the cloud sea by day, the tower its full height by day (a little more over the sea), and both settled by night. */
function stackScale(s: Scene, tone: Tone, side: number): number {
  const up = smooth(DAY_HIGH, DAY_HIGH + BUILT, level(s)) * tone.towers;
  return side < 0 ? 1 + BANK_GROW * up : (TOWER_NIGHT + (1 - TOWER_NIGHT) * tone.towers) * (1 + TOWER_GROW * up);
}

/** A billow's top stands this many of its radii above its center. */
const BILLOW_UP = 1.15;

/** The highest the cumulus reaches in a lane now (u above the line): the fireworks keep above it (fireworks.ts). */
export function stackTop(s: Scene, tone: Tone, side: -1 | 1): number {
  const k = stackScale(s, tone, side);
  const grow = 1 + LOBE_GROW * (k - 1);
  let top = 0;
  for (const [, h, r] of side < 0 ? BANK : TOWER) top = Math.max(top, h * k + r * grow * BILLOW_UP);
  return top;
}

/** Only the upper lobes (their centers this high above the line, u) get lit caps: the low ones' caps would hide behind the lobes above them. */
const CAPPED = 0.12;

/** Screen x of a stack lobe: from the center on a phone; on a wider screen the stacks keep to its sides. */
function stackX(s: Scene, X: number): number {
  const cx = s.cssW / 2;
  return X < 0 ? Math.min(cx + X * s.u, (X + 0.5) * s.u) : Math.max(cx + X * s.u, s.cssW - (0.5 - X) * s.u);
}

/**
 * The poster cumulus along the line at either side: the shade along the underside of every lobe,
 * the body over it, lit caps on the upper left. While the land shows, the far layer covers the
 * lanes up to LANES_HIDDEN, so the lobes and the underside below it are left out, as are the
 * lobes wholly below `cover` (where the cloud floor, drawn last, is solid).
 */
export function cumulus(ctx: Ctx, s: Scene, tone: Tone, line: number, cover = Infinity): void {
  const u = s.u;
  const hidden = landShows(s) ? LANES_HIDDEN : -1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const k = stackScale(s, tone, side);
      const grow = 1 + LOBE_GROW * (k - 1);
      for (const [X, h, r] of side < 0 ? BANK : TOWER) {
        const x = stackX(s, X);
        const R = r * u * grow;
        const y = line - h * u * k;
        if (x + R * 1.35 < 0 || x - R * 1.35 > s.cssW || h * k + r * grow * BILLOW_UP < hidden || y - R * BILLOW_UP > cover) continue;
        // Each a round printed billow, deep enough to meet the ones above and below it (so the stack
        // is one heaped mass, not a pile of buns): its shadow a step lower and to the right, the
        // body, a lit cap on its upper left.
        if (pass === 0) lobe(ctx, x + R * 0.1, y + R * 0.12, R * 1.28, R * 1.08, R * 0.7);
        else if (pass === 1) lobe(ctx, x - R * 0.03, y - R * 0.03, R * 1.22, R * 1.1, R * 0.6);
        else if (h >= CAPPED) lobe(ctx, x - R * 0.4, y - R * 0.5, R * 0.62, R * 0.48, R * 0.14);
      }
    }
    if (pass === 0) {
      // The tower's shaded core, so its scallops read as one towering mass, not shelves.
      const k = stackScale(s, tone, 1);
      for (let i = 0; i < CORE.length; i++) {
        const [X, h] = CORE[i]!;
        const y = line - h * u * k;
        if (i === 0) ctx.moveTo(stackX(s, X), y);
        else ctx.lineTo(stackX(s, X), y);
      }
      ctx.closePath();
    }
    if (pass === 0 && hidden < 0) {
      // The flat underside the stacks stand on, out to the screen's sides.
      ctx.rect(-1, line - u * 0.06, Math.max(0, stackX(s, -0.4) + u * 0.04) + 1, u * 0.07);
      ctx.rect(stackX(s, 0.3) - u * 0.04, line - u * 0.06, s.cssW, u * 0.07);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the cloud floor

/** Lobes along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Below this (u under the floor's top) the floor's face is solid. */
const FACE = 0.035;
/**
 * The cloud sea piles up on the right, under the cumulus tower: its top rises up to PILE u from
 * PILE_FROM out to PILE_TO (u from center), so it has covered the tall country on that side
 * (country.ts) by the time the land stops being drawn.
 */
const PILE = 0.27;
const PILE_FROM = 0.37;
const PILE_TO = 0.52;
/** The pile's top is heaped in lobes along its slope, one every HEAP_STEP (u). */
const HEAP_STEP = 0.045;

/** How far (u) the cloud sea's top rises above its line at X (u from center). */
export function pileAt(X: number): number {
  return X <= PILE_FROM ? 0 : PILE * smooth(PILE_FROM, PILE_TO, X);
}
/**
 * Rows of billows printed down the cloud sea's face at the sides, in perspective, a poster's sea
 * of cloud seen from above: each row a step nearer and lower, its billows bigger. Each row's
 * depth under the floor's top (u) and its billows' radius (u). A row's billows overlap along it
 * but never reach the next row, so the face shows between the rows as the shade under each (and
 * every row prints in the same fills). None comes in nearer the center than SEA_FROM (u): the
 * column stays the plain face.
 */
const ROWS = (() => {
  const rows: { d: number; r: number }[] = [];
  for (let d = 0.075; d < 3.4; ) {
    const r = 0.03 + 0.1 * d;
    rows.push({ d, r });
    d += r * 1.32;
  }
  return rows;
})();
/** Billows along a row (in their radii), and how near the center a row's innermost billow reaches (u). */
const BILLOW_STEP = 1.9;
const SEA_FROM = 0.27;
/** Billows this big (u) and up get a lit cap; smaller ones, far off, are only body. */
const CAP_MIN = 0.05;

/** The rows of billows at the sides of the cloud sea whose top is at `top`: their bodies, or (`caps`) the lit caps of the bigger ones. */
function billows(ctx: Ctx, s: Scene, top: number, caps: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let k = 0; k < ROWS.length; k++) {
    const row = ROWS[k]!;
    const r = row.r * u;
    const y = top + row.d * u;
    if (y - r > s.cssH) break;
    if (caps && r < u * CAP_MIN) continue;
    const st = r * BILLOW_STEP;
    const inner = SEA_FROM * u + r * 1.25 + (k % 2) * st * 0.5;
    for (const side of [-1, 1]) {
      // From the column out past the screen's side.
      for (let i = 0; ; i++) {
        const x = cx + side * (inner + i * st) + (hash(k * 131 + i * 7 + (side > 0 ? 5003 : 0)) - 0.5) * r * 0.4;
        if (side < 0 ? x + r * 1.3 < 0 : x - r * 1.3 > s.cssW) break;
        const by = side > 0 ? y - pileAt((x - cx) / u) * u : y;
        if (caps) lobe(ctx, x - r * 0.42, by - r * 0.44, r * 0.56, r * 0.26, r * 0.08);
        else lobe(ctx, x, by, r * 1.22, r * 0.82, r * 0.34);
      }
    }
  }
}

/**
 * The floor of cloud, printed flat: a scalloped edge of flattened lobes along its top (lit caps
 * over a lit body, the shade beneath), solid below in the cloud's shade ink, and at the sides
 * rows of billows rising out of it in perspective, lit bodies with lit caps, so the lanes read
 * as a deep poster sea of cloud while the column stays one plain ink. At the show's finale its
 * tops are warmed by the bursts (tone.ts).
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  const cx = s.cssW / 2;
  // The pile at a screen x: how far (px) the sea's top rises there.
  const pile = (x: number) => pileAt((x - cx) / u) * u;
  // The dips between the top edge's lobes: no deeper than the sun sets (sky.ts FLOOR_DIP), so the floor covers it whole.
  const valley = top + u * 0.015;
  // The face, solid from just under the top edge down, in the shade the billows rise out of, and the pile on the right.
  ctx.fillStyle = tone.cloudShade;
  ctx.fillRect(0, top + u * FACE, s.cssW, s.cssH - top - u * FACE);
  const pileFrom = cx + PILE_FROM * u;
  if (pileFrom < s.cssW) {
    ctx.beginPath();
    ctx.moveTo(pileFrom, top + u * FACE + 1);
    for (let x = pileFrom; x < s.cssW + step; x += step / 2) ctx.lineTo(x, top + u * FACE - pile(x));
    ctx.lineTo(s.cssW + step, top + u * FACE + 1);
    ctx.closePath();
    ctx.fill();
  }
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.floorCloud : tone.floorCap;
    ctx.beginPath();
    if (pass < 2) {
      // The top edge as one scalloped contour: a lobe a step, each its own height; the shade a little lower, filled deeper.
      const drop = pass === 0 ? 0.12 : 0;
      const foot = top + u * (FACE + (pass === 0 ? 0.05 : 0.01));
      const x0 = cx - (half + 0.5) * step;
      const x1 = cx + (half + 0.5) * step;
      ctx.moveTo(x0, foot);
      ctx.lineTo(x0, valley);
      for (let j = -half; j <= half; j++) {
        const x = cx + j * step;
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        const peak = top + p.dy * u - p.r * u * (0.65 - drop);
        ctx.quadraticCurveTo(x, peak * 2 - valley, x + step / 2, valley);
      }
      ctx.lineTo(x1, foot);
      ctx.closePath();
    } else {
      for (let j = -half; j <= half; j++) {
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        const r = p.r * u;
        lobe(ctx, cx + j * step - r * 0.28, top + p.dy * u - r * 0.25, r * 0.5, r * 0.22, r * 0.12);
      }
    }
    // The pile heaped up along its slope in lobes, over its face's edge.
    for (let X = PILE_FROM + 0.02; cx + (X - 0.1) * u < s.cssW; X += HEAP_STEP) {
      const hp = pileAt(X);
      const r = u * (0.04 + 0.05 * (hp / PILE));
      const x = cx + X * u;
      const y = top + u * (FACE + 0.006) - hp * u;
      if (pass === 0) lobe(ctx, x + r * 0.1, y + r * 0.14, r * 1.25, r * 0.9, r * 0.45);
      else if (pass === 1) lobe(ctx, x, y, r * 1.2, r * 0.95, r * 0.35);
      else lobe(ctx, x - r * 0.4, y - r * 0.46, r * 0.6, r * 0.42, r * 0.12);
    }
    // The billows print with the top edge's body and its caps (none of them reaches the edge's caps).
    if (pass > 0) billows(ctx, s, top, pass === 2);
    ctx.fill();
  }
}

/**
 * A flattened cloud lobe as its own subpath: a dome `rx` either side of x rising `up` above y
 * and a shallower belly `down` below it, each drawn as a pair of quadratic curves (a printed
 * scallop; cheaper to fill than an ellipse's arcs).
 */
function lobe(ctx: Ctx, x: number, y: number, rx: number, up: number, down: number): void {
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x - rx, y - up * 1.08, x, y - up);
  ctx.quadraticCurveTo(x + rx, y - up * 1.08, x + rx, y);
  if (down > 0) {
    ctx.quadraticCurveTo(x + rx, y + down * 1.08, x, y + down);
    ctx.quadraticCurveTo(x - rx, y + down * 1.08, x - rx, y);
  }
  ctx.closePath();
}

/** Whether the far layer shows: its landmarks stand above the cloud floor and above the bottom of the screen. */
function farShows(s: Scene, top: number, line: number): boolean {
  return line - s.u * POLE_TOP < s.cssH && top - s.u * 0.06 > line - s.u * POLE_TOP;
}

/**
 * The far layer behind the lane (drift.ts) and the show: the cumulus (unless `clouds` is false) and, while
 * the land shows, the country beyond the town, filled down to the lawn's edge (the lawn covers
 * everything below it).
 */
export function farBack(ctx: Ctx, s: Scene, tone: Tone, top: number, clouds = true): void {
  const line = landmarkLine(s);
  if (!farShows(s, top, line)) return;
  if (clouds) cumulus(ctx, s, tone, line, floorCover(s, top));
  if (landShows(s)) country(ctx, s, tone, Math.min(s.cssH, top + s.u * 0.12, townLine(s) + 2));
}

/** The far layer in front of the show (and of the lane while the land shows): the landmarks, and while the land shows the rooftops, Main Street and its trees. */
export function farFront(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const line = landmarkLine(s);
  if (!farShows(s, top, line)) return;
  const land = landShows(s);
  if (land) rooftops(ctx, s, tone, line);
  church(ctx, s, tone, line, land);
  courthouse(ctx, s, tone, line, land);
  if (land) {
    townRow(ctx, s, tone);
    trees(ctx, s, tone);
  }
}

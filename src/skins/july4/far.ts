import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { church, courthouse, POLE_TOP } from "./landmarks";
import { smooth } from "./shapes";
import { DAY_HIGH, level, type Tone } from "./tone";
import { rooftops, townLine, townRow, TOWN_TOP, trees, waterTower } from "./town";

// The far layer, standing on the horizon, printed like a WPA poster: flat inks in layers of
// atmosphere, each a step paler further back, no outlines, everything lit from the left with a
// flat shadow plane on its right. Furthest, great poster cumulus piled up at both sides, flat
// lobes with lit caps and a shaded underside (low on the left, under the sun; towering on the
// right). Then a pale blue ridge, two rows of rolling green hills faceted lit and shaded, woods
// along their crests and the park's tree line on the right; on the far hill the water tower,
// painted with the flag. Then the town (town.ts): two rows of rooftops stepping back from Main
// Street, Main Street itself with the faint block behind the tower, the church and the
// courthouse (landmarks.ts) and the big summer trees, all standing on the town's line a little
// in front of the hills (the far side of the square). Above the start a floor of cloud gathers
// below you and swallows the town; from then on its scalloped top is the horizon, and only the
// steeple and the courthouse's tower, dome and flag stand out of it, with the cumulus piled at
// the sides, towering by day (from dusk the landmarks are printed as the poster's skyline
// silhouettes, one dark ink with the windows and the clock lit, the flag floodlit: tone.ts).
// Then the floor sinks with them to rest low on the screen, and there it stays for good, a sea
// of cloud printed in rows of billows at the sides (the column one calm ink), for the sun to set into and rise out of on every
// turn of the story's loop (tone.ts), and for the fireworks to light at the show's finale.
// Nothing here moves but the courthouse flag.
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
/** The hills' base line, u below the horizon (the lawn covers it). */
const HILL_BASE = 0.03;

/** Where the sky stops: below this the hills and the lawn, or the cloud floor, cover everything. */
export function skyBottom(s: Scene, top: number): number {
  return landShows(s) ? s.horizonY + s.u * HILL_BASE : top + s.u * FLOOR_SOLID;
}

// ---------------------------------------------------------------- the poster cumulus

/**
 * Lobes of towering fair-weather cumulus piled behind the town at either side, as a WPA poster
 * stacks them: [X (u from center), height of the lobe's center above the line (u), radius (u)].
 * Low on the left, where the sun hangs above them (on an iPad or a wide window the sun's halo
 * hangs only 0.27 u over the horizon); towering on the right. None behind the tower's column.
 */
const STACKS = [
  [-0.86, 0.14, 0.1],
  [-0.72, 0.2, 0.09],
  [-0.6, 0.25, 0.075],
  [-0.5, 0.27, 0.065],
  [-0.42, 0.2, 0.06],
  [-0.36, 0.13, 0.05],
  [-0.235, 0.12, 0.04],
  [0.25, 0.1, 0.045],
  [0.36, 0.17, 0.065],
  [0.43, 0.29, 0.072],
  [0.47, 0.42, 0.064],
  [0.55, 0.31, 0.088],
  [0.66, 0.19, 0.11],
  [0.8, 0.12, 0.1],
] as const;

/** Over the cloud sea by day, the stacks tower up to 1 + STACK_GROW times as high (their lobes a share of that bigger), grown by BUILT levels above the town. */
const STACK_GROW = 1.0;
const LOBE_GROW = 0.4;
const BUILT = 10;

/** How many times its plain height the cumulus stands: plain over the town, towering over the cloud sea by day (tone.ts towers), plain again by night. */
function stackScale(s: Scene, tone: Tone): number {
  return 1 + STACK_GROW * smooth(DAY_HIGH, DAY_HIGH + BUILT, level(s)) * tone.towers;
}

/** The highest the cumulus reaches in a lane now (u above the line): the fireworks keep above it (fireworks.ts). */
export function stackTop(s: Scene, tone: Tone, side: -1 | 1): number {
  const k = stackScale(s, tone);
  const grow = 1 + LOBE_GROW * (k - 1);
  let top = 0;
  for (const [X, h, r] of STACKS) if (Math.sign(X) === side) top = Math.max(top, h * k + r * grow);
  return top;
}

/** Only the upper lobes (their centers this high above the line, u) get lit caps: the low ones' caps would hide behind the lobes above them. */
const CAPPED = 0.12;

/** Screen x of a stack lobe: from the center on a phone; on a wider screen the stacks keep to its sides. */
function stackX(s: Scene, X: number): number {
  const cx = s.cssW / 2;
  return X < 0 ? Math.min(cx + X * s.u, (X + 0.5) * s.u) : Math.max(cx + X * s.u, s.cssW - (0.5 - X) * s.u);
}

/** The poster cumulus along the line at either side: the shade along the underside of every lobe, the body over it, lit caps on the upper left. */
export function cumulus(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const k = stackScale(s, tone);
  const grow = 1 + LOBE_GROW * (k - 1);
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of STACKS) {
      const x = stackX(s, X);
      const R = r * u * grow;
      if (x + R * 1.2 < 0 || x - R * 1.2 > s.cssW) continue;
      const y = line - h * u * k;
      if (pass === 0) circle(ctx, x, y, R);
      else if (pass === 1) circle(ctx, x - R * 0.04, y - R * 0.17, R * 0.95);
      else if (h >= CAPPED) circle(ctx, x - R * 0.32, y - R * 0.46, R * 0.46);
    }
    if (pass === 0) {
      // The flat underside the stacks stand on, out to the screen's sides.
      ctx.rect(-1, line - u * 0.06, Math.max(0, stackX(s, -0.4) + u * 0.04) + 1, u * 0.07);
      ctx.rect(stackX(s, 0.37) - u * 0.04, line - u * 0.06, s.cssW, u * 0.07);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the ridge and the hills

/** The far blue ridge: low behind the column, higher toward the sides. */
function ridgeHeight(X: number): number {
  const a = Math.abs(X);
  return 0.055 + 0.07 * smooth(0.12, 0.6, a) + 0.022 * Math.sin(X * 7.3 + 0.4) + 0.01 * Math.sin(X * 17.1 + 1.3);
}

function backHeight(X: number): number {
  return 0.06 + 0.04 * Math.sin(X * 3.7 + 1.1) + 0.018 * Math.sin(X * 9.3 + 0.4);
}

function frontHeight(X: number): number {
  return 0.032 + 0.018 * Math.sin(X * 5.1 + 2.3) + 0.009 * Math.sin(X * 12.7 + 1.0);
}

/** Step (u) between the points a row of hills is drawn through. */
const HILL_STEP = 0.03;

/** A row of hills: the path along their tops, filled down to `bottom`. */
function hillPath(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * HILL_STEP) {
    ctx.lineTo(x, base - u * height((x - cx) / u));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
}

/** The shaded faces of a row of hills (every slope that falls away to the right, as the sun is on the left), each run down to the base. */
function hillShade(ctx: Ctx, s: Scene, base: number, height: (X: number) => number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const step = u * HILL_STEP;
  let open = false;
  let prev = height((-1 - cx) / u);
  for (let x = -1; x < s.cssW + step; x += step) {
    const h = height((x + step - cx) / u);
    const falling = h < prev;
    if (falling && !open) {
      ctx.moveTo(x, base + 1);
      ctx.lineTo(x, base - u * prev);
      open = true;
    }
    if (open) ctx.lineTo(x + step, base - u * h);
    if (open && (!falling || x + step >= s.cssW + step)) {
      ctx.lineTo(x + step, base + 1);
      ctx.closePath();
      open = false;
    }
    prev = h;
  }
}

/** The park's tree line on the right: round canopies along the hills, from PARK_FROM out past the edge. */
const PARK_FROM = 0.4;
const PARK_TREES = Array.from({ length: 14 }, (_, i) => ({
  x: PARK_FROM + i * 0.065 + hash(i + 3100) * 0.03,
  r: 0.028 + hash(i + 3200) * 0.018,
  h: 0.018 + hash(i + 3300) * 0.025,
}));
/** Woods along the far hill's crest at the left: little round crowns. */
const WOODS = Array.from({ length: 22 }, (_, i) => ({ x: -0.23 - i * 0.05 - hash(i + 3900) * 0.02, r: 0.012 + hash(i + 3950) * 0.01 }));

/** The ridge, the two rows of hills with their shade, the woods on the far one, the water tower, and the park's tree line, filled down to `bottom`. */
export function hills(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = s.horizonY + u * HILL_BASE;
  ctx.fillStyle = tone.ridge;
  ctx.beginPath();
  hillPath(ctx, s, base, ridgeHeight, bottom);
  ctx.fill();
  ctx.fillStyle = tone.hillFar;
  ctx.beginPath();
  hillPath(ctx, s, base, backHeight, bottom);
  ctx.fill();
  ctx.fillStyle = tone.woods;
  ctx.beginPath();
  for (const w of WOODS) {
    const x = cx + w.x * u;
    if (x + w.r * u < 0) break;
    circle(ctx, x, base - (backHeight(w.x) - w.r * 0.4) * u, w.r * u);
  }
  hillShade(ctx, s, base, backHeight);
  ctx.fill();
  waterTower(ctx, s, tone, s.horizonY);
  ctx.fillStyle = tone.hill;
  ctx.beginPath();
  hillPath(ctx, s, base, frontHeight, bottom);
  ctx.fill();
  ctx.fillStyle = tone.treeFar;
  ctx.beginPath();
  for (const t of PARK_TREES) {
    const x = cx + t.x * u;
    if (x - t.r * u > s.cssW) break;
    circle(ctx, x, base - (t.h + t.r) * u, t.r * u);
    ctx.rect(x - t.r * u * 0.5, base - (t.h + t.r) * u, t.r * u, (t.h + t.r) * u + 1);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the cloud floor

/** Lobes along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Below this (u under the floor's top) the floor's face is solid. */
const FACE = 0.035;
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
        if (caps) lobe(ctx, x - r * 0.42, y - r * 0.44, r * 0.56, r * 0.26, r * 0.08);
        else lobe(ctx, x, y, r * 1.22, r * 0.82, r * 0.34);
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
  // The dips between the top edge's lobes: no deeper than the sun sets (sky.ts FLOOR_DIP), so the floor covers it whole.
  const valley = top + u * 0.015;
  // The face, solid from just under the top edge down, in the shade the billows rise out of.
  ctx.fillStyle = tone.cloudShade;
  ctx.fillRect(0, top + u * FACE, s.cssW, s.cssH - top - u * FACE);
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.floorCloud : tone.floorCap;
    ctx.beginPath();
    if (pass < 2) {
      // The top edge as one scalloped contour: a lobe a step, each its own height; the shade a little lower, filled deeper.
      const drop = pass === 0 ? 0.12 : 0;
      ctx.moveTo(cx - (half + 0.5) * step, top + u * (FACE + (pass === 0 ? 0.05 : 0.01)));
      ctx.lineTo(cx - (half + 0.5) * step, valley);
      for (let j = -half; j <= half; j++) {
        const x = cx + j * step;
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        const peak = top + p.dy * u - p.r * u * (0.65 - drop);
        ctx.quadraticCurveTo(x, peak * 2 - valley, x + step / 2, valley);
      }
      ctx.lineTo(cx + (half + 0.5) * step, top + u * (FACE + (pass === 0 ? 0.05 : 0.01)));
      ctx.closePath();
    } else {
      for (let j = -half; j <= half; j++) {
        const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
        const r = p.r * u;
        lobe(ctx, cx + j * step - r * 0.28, top + p.dy * u - r * 0.25, r * 0.5, r * 0.22, r * 0.12);
      }
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

/** Everything of the far layer but the clouds: the hills and the town while the land shows, and the landmarks. */
export function farProps(ctx: Ctx, s: Scene, tone: Tone, top: number, line: number, land: boolean): void {
  if (land) {
    // The hills only down to the lawn's edge: the lawn covers everything below it.
    hills(ctx, s, tone, Math.min(s.cssH, top + s.u * 0.12, townLine(s) + 2));
    rooftops(ctx, s, tone, line);
  }
  church(ctx, s, tone, line, land);
  courthouse(ctx, s, tone, line, land);
  if (land) {
    townRow(ctx, s, tone);
    trees(ctx, s, tone);
  }
}

/** Whether the far layer shows: its landmarks stand above the cloud floor and above the bottom of the screen. */
export function farShows(s: Scene, top: number, line: number): boolean {
  return line - s.u * POLE_TOP < s.cssH && top - s.u * 0.06 > line - s.u * POLE_TOP;
}

/** The far layer: the cumulus and the landmarks (always, once they would show), and the hills and the town while the land shows. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const line = landmarkLine(s);
  if (!farShows(s, top, line)) return;
  cumulus(ctx, s, tone, line);
  farProps(ctx, s, tone, top, line, landShows(s));
}

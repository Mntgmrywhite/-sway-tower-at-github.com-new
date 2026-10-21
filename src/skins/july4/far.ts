import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { smooth, starPath, swagBand } from "./shapes";
import { DAY_HIGH, level, type Tone } from "./tone";

// The far layer, standing on the horizon, printed like a WPA poster: flat inks, no outlines, and
// every building lit from the left, a flat shadow plane on its right. Furthest, rolling summer
// hills in two rows (the far one hazy), with the town park's tree line on the right. On them,
// Main Street: the far side of the town square, a row of two-story brick, ochre and cream
// storefronts with striped awnings, every front hung with red, cream and blue bunting and little
// flags; a white clapboard church on the left with a tall steeple, a stone courthouse on the
// right with a pillared portico, a clock tower and a dome flying the flag; and big round summer
// trees. Behind the tower the block is printed faint (a quiet silhouette with no bunting or
// flags), so the column stays calm; the detail is at the sides. Above the start a floor of
// cloud gathers below you and swallows the town; from then on its scalloped top is the horizon,
// and only the steeple and the courthouse's dome and flag stand out of it (from dusk printed as
// the poster's skyline silhouettes, one dark ink with the windows and the clock lit: tone.ts). Then it sinks with
// them to rest low on the screen, and there it stays for good, a calm sea of cloud with the two
// landmarks standing out of it, for the sun to set into and rise out of on every turn of the
// story's loop (tone.ts), and for the fireworks to light at the show's finale. Nothing here
// moves but the courthouse flag.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

/** The flat shadow plane on every far building's right: navy printed thin over its own color. */
const SHADOW = "rgba(20, 28, 66, 0.24)";

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;
/** As it gathers, the floor's top climbs this far above the horizon (u): over every storefront and tree, so none is cut when the town stops being drawn. */
export const COVER = 0.18;
/** The level the floor begins to gather at (its top comes up from below the screen). */
const GATHER_FROM = 13;

/**
 * The line the cloud floor lies along once it has gathered: COVER above the horizon while the
 * land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const cover = s.horizonY - s.u * COVER;
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
 * The line the steeple and the courthouse stand on: the horizon while the land shows, then,
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

// ---------------------------------------------------------------- the cloud bank

/** Lobes of fair-weather cloud piled low behind the town at either side: [X (u from center), height above the line (u), radius (u)]. */
const BANK = [
  [-0.7, 0.12, 0.12],
  [-0.56, 0.17, 0.1],
  [-0.45, 0.12, 0.08],
  [-0.36, 0.08, 0.06],
  [0.4, 0.09, 0.07],
  [0.5, 0.15, 0.1],
  [0.62, 0.11, 0.12],
] as const;

/** Poster cumulus piled along the line at either side, behind the hills and the landmarks: flattened lobes, a flat shaded underside, lit caps. */
export function cloudBank(ctx: Ctx, s: Scene, tone: Tone, line: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (const [X, h, r] of BANK) {
      // On a wider screen the banks keep to its sides.
      const x = X < 0 ? Math.min(cx + X * u, (X + 0.5) * u) : Math.max(cx + X * u, s.cssW - (0.5 - X) * u);
      const y = line - h * u;
      const R = r * u;
      if (pass === 0) oval(ctx, x, y, R * 1.15, R);
      else if (pass === 1) oval(ctx, x - R * 0.06, y - R * 0.2, R * 1.08, R * 0.82);
      else oval(ctx, x - R * 0.3, y - R * 0.55, R * 0.5, R * 0.26);
    }
    if (pass === 0) {
      ctx.rect(-1, line - u * 0.05, Math.max(0, Math.min(cx - u * 0.3, u * 0.2)) + 1, u * 0.1);
      ctx.rect(Math.max(cx + u * 0.34, s.cssW - u * 0.16), line - u * 0.05, s.cssW, u * 0.1);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- hills

function backHeight(X: number): number {
  return 0.07 + 0.045 * Math.sin(X * 3.7 + 1.1) + 0.02 * Math.sin(X * 9.3 + 0.4);
}

function frontHeight(X: number): number {
  return 0.035 + 0.02 * Math.sin(X * 5.1 + 2.3) + 0.01 * Math.sin(X * 12.7 + 1.0);
}

/** A row of hills: the path along their tops, filled down to `bottom`. */
function hillPath(ctx: Ctx, s: Scene, base: number, height: (X: number) => number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * 0.04) {
    ctx.lineTo(x, base - u * height((x - cx) / u));
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
}

/** The park's tree line on the right: round canopies as part of the hills (plain, faded), from PARK_FROM out past the edge. */
const PARK_FROM = 0.4;
const PARK_TREES = Array.from({ length: 12 }, (_, i) => ({
  x: PARK_FROM + i * 0.07 + hash(i + 3100) * 0.03,
  r: 0.03 + hash(i + 3200) * 0.02,
  h: 0.02 + hash(i + 3300) * 0.03,
}));

/** The two rows of hills, the park's tree line, filled down to `bottom`. */
export function hills(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = s.horizonY + u * HILL_BASE;
  ctx.fillStyle = tone.hillFar;
  hillPath(ctx, s, base, backHeight, bottom);
  ctx.fill();
  ctx.fillStyle = tone.hill;
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

// ---------------------------------------------------------------- Main Street

/** One storefront: center X (u), half width, height, which tone, its awning color (or none), with a cornice. */
interface Shop {
  x: number;
  hw: number;
  h: number;
  wall: 0 | 1 | 2 | 3;
  awning: -1 | 0 | 1 | 2;
  cornice: boolean;
}

/** The center block, behind the tower: a general store, a hardware store and a diner, printed faint. */
const CENTER: readonly Shop[] = [
  { x: -0.07, hw: 0.065, h: 0.14, wall: 2, awning: 0, cornice: true },
  { x: 0.03, hw: 0.04, h: 0.16, wall: 0, awning: -1, cornice: true },
  { x: 0.115, hw: 0.046, h: 0.11, wall: 1, awning: 1, cornice: false },
];

/** The church on the left: its body's center and half width; the steeple's tower and spire. */
const CHURCH_X = -0.32;
const CHURCH_HW = 0.065;
const CHURCH_H = 0.1;
/** The steeple stands on the church's right: its foot clear of the setting sun's halo on a phone (sky.ts), its spire clear of the tower's column. */
const STEEPLE_X = -0.285;
const STEEPLE_HW = 0.022;
const STEEPLE_TOWER = 0.17;
/** The spire's tip (its cross reaches 0.02 higher, to STEEPLE_REACH): low enough to clear the sun's halo on a wide desktop window. */
export const STEEPLE_TOP = 0.3;
export const STEEPLE_REACH = STEEPLE_TOP + 0.02;
/** The run of storefronts left of the church, out past the screen's left edge (indexed from the church outward). */
const LEFT_RUN: readonly Shop[] = Array.from({ length: 14 }, (_, i) => {
  const hw = 0.04 + hash(i + 3400) * 0.02;
  return {
    x: 0,
    hw,
    h: 0.1 + hash(i + 3500) * 0.06,
    wall: ((i + 1) % 4) as 0 | 1 | 2 | 3,
    awning: (hash(i + 3600) < 0.3 ? -1 : i % 3) as -1 | 0 | 1 | 2,
    cornice: hash(i + 3700) > 0.4,
  };
}).reduce<Shop[]>((row, shop) => {
  const prev = row[row.length - 1];
  const edge = prev ? prev.x - prev.hw : CHURCH_X - CHURCH_HW;
  row.push({ ...shop, x: edge - shop.hw - 0.004 });
  return row;
}, []);

/** The courthouse on the right: body, portico, tower, dome and the flag. */
const COURT_X = 0.31;
const COURT_HW = 0.058;
const COURT_H = 0.14;
const TOWER_HW = 0.03;
const TOWER_H = 0.25;
const DOME_R = 0.038;
export const DOME_TOP = 0.34;
export const POLE_TOP = 0.405;
/** Big summer trees in front of the row: X, canopy radius, canopy center height (u). */
const TREES = [
  [-0.145, 0.052, 0.1],
  [0.165, 0.045, 0.09],
] as const;

function wallTone(tone: Tone, wall: number): string {
  return wall === 0 ? tone.brick : wall === 1 ? tone.tan : wall === 2 ? tone.cream : tone.sage;
}

/** Red, white and blue swags along a line from x0, `swags` of them over `w`, sagging `sag`. */
function bunting(ctx: Ctx, tone: Tone, x0: number, w: number, y: number, swags: number, sag: number): void {
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) swagBand(ctx, x0 + (i * w) / swags, x0 + ((i + 1) * w) / swags, y, sag, band, 3);
    ctx.fill();
  }
}

/**
 * One storefront: the wall with its shadow plane, the cornice, a row of sashes, the shopfront
 * under a striped awning, bunting and a flag. `quiet` prints it faint, behind the tower: one
 * pale ink for the wall, its windows a step darker, and nothing else.
 */
function shop(ctx: Ctx, s: Scene, tone: Tone, shp: Shop, hz: number, quiet: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x0 = cx + (shp.x - shp.hw) * u;
  const w = shp.hw * 2 * u;
  const h = shp.h * u;
  if (x0 + w < -1 || x0 > s.cssW + 1) return;
  ctx.fillStyle = quiet ? tone.quiet : wallTone(tone, shp.wall);
  ctx.fillRect(x0, hz - h, w, h + 1);
  if (shp.cornice) ctx.fillRect(x0 - u * 0.004, hz - h, w + u * 0.008, u * 0.012);
  else ctx.fillRect(x0 + w * 0.3, hz - h - u * 0.012, w * 0.4, u * 0.012);
  const window = quiet ? tone.quietWindow : tone.window;
  // Upper windows: a row of tall sashes; the shopfront: a wide window and the door.
  const n = Math.max(1, Math.round(w / (u * 0.03)));
  const sf = hz - u * 0.055;
  ctx.fillStyle = window;
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(x0 + ((i + 0.5) * w) / n - u * 0.0065, hz - h + u * 0.03, u * 0.013, u * 0.03);
  ctx.rect(x0 + w * 0.12, sf, w * 0.76, u * 0.04);
  ctx.fill();
  if (quiet) return;
  // The shadow plane down the wall's right side, and the cornice's lit top.
  ctx.fillStyle = SHADOW;
  ctx.fillRect(x0 + w * 0.84, hz - h, w * 0.16, h + 1);
  ctx.fillStyle = tone.trim;
  if (shp.cornice) ctx.fillRect(x0 - u * 0.004, hz - h, w + u * 0.008, u * 0.005);
  ctx.fillRect(x0 + w * 0.5 - u * 0.004, sf, u * 0.008, u * 0.04);
  // An awning in broad stripes over the shopfront, or bunting swags along the string course.
  if (shp.awning >= 0) {
    const ay = sf - u * 0.004;
    const k = Math.max(3, Math.round(w / (u * 0.016)) | 1);
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.trim : tone.awnings[shp.awning as 0 | 1 | 2];
      ctx.beginPath();
      for (let i = pass; i < k; i += 2) {
        const a = x0 + w * 0.03 + (i * w * 0.94) / k;
        const b = x0 + w * 0.03 + ((i + 1) * w * 0.94) / k;
        ctx.moveTo(a + w * 0.03 * (1 - (2 * i) / k), ay - u * 0.016);
        ctx.lineTo(b + w * 0.03 * (1 - (2 * (i + 1)) / k), ay - u * 0.016);
        ctx.lineTo(b, ay + u * 0.006);
        ctx.lineTo(a, ay + u * 0.006);
        ctx.closePath();
      }
      ctx.fill();
    }
  }
  bunting(ctx, tone, x0, w, hz - u * 0.068, Math.max(1, Math.round(w / (u * 0.04))), u * 0.012);
  // A little flag angled out from the facade.
  const fx = x0 + w * 0.5;
  const fy = hz - h + u * 0.018;
  ctx.fillStyle = tone.trim;
  ctx.fillRect(fx - u * 0.0015, fy - u * 0.012, u * 0.003, u * 0.022);
  ctx.fillStyle = tone.red;
  ctx.fillRect(fx + u * 0.0015, fy - u * 0.012, u * 0.012, u * 0.008);
  ctx.fillStyle = tone.blue;
  ctx.fillRect(fx + u * 0.0015, fy - u * 0.012, u * 0.005, u * 0.004);
}

/** Main Street: the left run, the quiet center block. */
export function townRow(ctx: Ctx, s: Scene, tone: Tone): void {
  const hz = s.horizonY;
  for (const shp of LEFT_RUN) shop(ctx, s, tone, shp, hz, false);
  for (const shp of CENTER) shop(ctx, s, tone, shp, hz, true);
}

/** A gable from x - hw to x + hw at y, peaking `rise` above it, as its own subpath. */
function gable(ctx: Ctx, x: number, hw: number, y: number, rise: number): void {
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x, y - rise);
  ctx.lineTo(x + hw, y);
  ctx.closePath();
}

/** The church: a white clapboard gable with red doors and a round window, the steeple tower, belfry and spire (standing on `line`). */
export function church(ctx: Ctx, s: Scene, tone: Tone, line: number, whole: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x = cx + CHURCH_X * u;
  const hw = CHURCH_HW * u;
  const tx = cx + STEEPLE_X * u;
  const thw = STEEPLE_HW * u;
  if (whole) {
    const eaves = line - CHURCH_H * u;
    ctx.fillStyle = tone.stone;
    ctx.beginPath();
    ctx.rect(x - hw, eaves, hw * 2, CHURCH_H * u + 1);
    gable(ctx, x, hw + u * 0.006, eaves, u * 0.05);
    ctx.fill();
    // The roof's slate edge, the right half of the front in shadow.
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    gable(ctx, x, hw + u * 0.006, eaves, u * 0.05);
    gable(ctx, x, hw - u * 0.004, eaves + u * 0.008, u * 0.042);
    ctx.fill("evenodd");
    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.moveTo(x, eaves - u * 0.042);
    ctx.lineTo(x + hw, eaves + u * 0.008);
    ctx.lineTo(x + hw, line + 1);
    ctx.lineTo(x, line + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.red;
    ctx.fillRect(x + u * 0.012, line - u * 0.04, u * 0.022, u * 0.04);
    ctx.fillStyle = tone.window;
    ctx.beginPath();
    circle(ctx, x + u * 0.023, line - u * 0.085, u * 0.012);
    ctx.rect(x - u * 0.045, line - u * 0.075, u * 0.012, u * 0.035);
    ctx.fill();
  }
  // The tower lit on the left and shaded on the right, a belfry, the spire with a tiny cross.
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(tx - thw, line - STEEPLE_TOWER * u, thw * 2, STEEPLE_TOWER * u + 1);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(tx + thw * 0.1, line - STEEPLE_TOWER * u, thw * 0.9, STEEPLE_TOWER * u + 1);
  ctx.fillStyle = tone.window;
  ctx.fillRect(tx - thw * 0.4, line - (STEEPLE_TOWER - 0.02) * u, thw * 0.8, u * 0.032);
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  gable(ctx, tx, thw + u * 0.006, line - STEEPLE_TOWER * u, (STEEPLE_TOP - STEEPLE_TOWER) * u);
  ctx.rect(tx - u * 0.0015, line - STEEPLE_REACH * u, u * 0.003, u * 0.022);
  ctx.rect(tx - u * 0.006, line - (STEEPLE_TOP + 0.014) * u, u * 0.012, u * 0.003);
  ctx.fill();
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.moveTo(tx, line - STEEPLE_TOP * u);
  ctx.lineTo(tx + thw + u * 0.006, line - STEEPLE_TOWER * u);
  ctx.lineTo(tx, line - STEEPLE_TOWER * u);
  ctx.closePath();
  ctx.fill();
}

/** Scratch for the flag's place (the courthouse flagpole's top), so placing it allocates nothing. */
const POLE = { x: 0, y: 0 };

export function poleTop(s: Scene, line: number): typeof POLE {
  POLE.x = s.cssW / 2 + COURT_X * s.u;
  POLE.y = line - POLE_TOP * s.u;
  return POLE;
}

/** The courthouse: a stone block with a pillared portico and pediment, the clock tower, the dome and the flag (standing on `line`). */
export function courthouse(ctx: Ctx, s: Scene, tone: Tone, line: number, whole: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x = cx + COURT_X * u;
  const hw = COURT_HW * u;
  const thw = TOWER_HW * u;
  if (whole) {
    const roof = line - COURT_H * u;
    ctx.fillStyle = tone.stone;
    ctx.fillRect(x - hw, roof, hw * 2, COURT_H * u + 1);
    // The windows either wing, the doors in the portico.
    const pw = hw * 0.62;
    ctx.fillStyle = tone.window;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      for (const side of [-1, 1]) {
        const wx = x + side * (hw * 0.55 + i * hw * 0.25) - u * 0.006;
        ctx.rect(wx, line - (COURT_H - 0.03) * u, u * 0.012, u * 0.028);
        ctx.rect(wx, line - u * 0.055, u * 0.012, u * 0.028);
      }
    }
    ctx.rect(x - u * 0.014, line - u * 0.05, u * 0.028, u * 0.05);
    ctx.fill();
    // The portico: four lit columns under a pediment edged in slate.
    ctx.fillStyle = tone.stoneLit;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) ctx.rect(x - pw + ((i + 0.5) * pw * 2) / 4 - u * 0.005, line - (COURT_H - 0.016) * u, u * 0.01, (COURT_H - 0.016) * u);
    gable(ctx, x, pw + u * 0.008, line - (COURT_H - 0.014) * u, u * 0.044);
    ctx.fill();
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    gable(ctx, x, pw + u * 0.008, line - (COURT_H - 0.014) * u, u * 0.044);
    gable(ctx, x, pw - u * 0.004, line - (COURT_H - 0.02) * u, u * 0.042);
    ctx.fill("evenodd");
    bunting(ctx, tone, x - pw, pw * 2, line - (COURT_H - 0.02) * u, 3, u * 0.012);
    ctx.fillStyle = SHADOW;
    ctx.fillRect(x + hw * 0.72, roof, hw * 0.28, COURT_H * u + 1);
  }
  // The clock tower: lit left, shaded right, a cornice, the clock, the drum under the dome.
  const top = line - TOWER_H * u;
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - thw, top, thw * 2, TOWER_H * u + 1);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x + thw * 0.2, top, thw * 0.8, TOWER_H * u + 1);
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x - thw - u * 0.005, top, thw * 2 + u * 0.01, u * 0.012);
  // The clock: a cream face on a slate rim, hands at ten past four, a summer afternoon.
  const cy = top + u * 0.05;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.024);
  ctx.fill();
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.019);
  ctx.fill();
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.011, cy + u * 0.006);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.005, cy - u * 0.015);
  ctx.stroke();
  // The dome on its drum, lit on the left and shaded on the right, and the flagpole on top.
  const dy = line - (DOME_TOP - DOME_R) * u;
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - thw * 0.8, dy, thw * 1.6, top - dy + 1);
  ctx.fillStyle = tone.stoneShade;
  ctx.fillRect(x + thw * 0.2, dy, thw * 0.6, top - dy + 1);
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - DOME_R * u, dy);
  ctx.arc(x, dy, DOME_R * u, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.moveTo(x, dy);
  ctx.arc(x, dy, DOME_R * u, -Math.PI / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x - u * 0.002, line - POLE_TOP * u, u * 0.004, (POLE_TOP - DOME_TOP) * u + 1);
  flag(ctx, s, tone, x + u * 0.002, line - POLE_TOP * u);
}

/** The courthouse flag flying from its pole top at (x, y) to the right, rippling. */
function flag(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number): void {
  const u = s.u;
  const w = u * 0.045;
  const h = u * 0.026;
  const ripple = (k: number) => Math.sin(s.t * 6 - k * 5) * u * 0.0025 * k;
  ctx.fillStyle = tone.red;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let k = 0; k <= 1; k += 0.25) ctx.lineTo(x + w * k, y + ripple(k));
  for (let k = 1; k >= 0; k -= 0.25) ctx.lineTo(x + w * k, y + h + ripple(k));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  for (let i = 1; i < 6; i += 2) {
    const y0 = y + (h * i) / 7;
    ctx.moveTo(x, y0);
    for (let k = 0; k <= 1; k += 0.25) ctx.lineTo(x + w * k, y0 + ripple(k));
    for (let k = 1; k >= 0; k -= 0.25) ctx.lineTo(x + w * k, y0 + h / 7 + ripple(k));
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.blue;
  ctx.fillRect(x, y, w * 0.42, h * 0.55);
  ctx.fillStyle = tone.white;
  ctx.beginPath();
  starPath(ctx, x + w * 0.21, y + h * 0.27, u * 0.005);
  ctx.fill();
}

/** The big summer trees in front of the row: a trunk, a flat canopy with a lit crown. Printed soft, as they stand by the tower's column. */
export function trees(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = s.horizonY;
  for (const [X, r, h] of TREES) {
    const x = cx + X * u;
    ctx.fillStyle = tone.trunk;
    ctx.fillRect(x - u * 0.008, hz - h * u, u * 0.016, h * u + 1);
    ctx.fillStyle = tone.tree;
    ctx.beginPath();
    circle(ctx, x, hz - h * u, r * u);
    circle(ctx, x - r * u * 0.7, hz - (h - r * 0.4) * u, r * u * 0.7);
    circle(ctx, x + r * u * 0.7, hz - (h - r * 0.35) * u, r * u * 0.72);
    ctx.fill();
    ctx.fillStyle = tone.treeLit;
    ctx.beginPath();
    circle(ctx, x - r * u * 0.25, hz - (h + r * 0.35) * u, r * u * 0.5);
    circle(ctx, x - r * u * 0.85, hz - (h - r * 0.25) * u, r * u * 0.32);
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
 * Lower tiers of the cloud sea piled forward at the sides, each nearer and bigger than the one
 * above it, down the whole face however tall the floor stands on screen (the column stays plain):
 * depth of each tier's base under the top (u), its lobes' radius (u), their spacing (u), and how
 * far out from the center the tier begins (u).
 */
const TIERS = [
  { d: 0.13, r: 0.045, step: 0.1, from: 0.3 },
  { d: 0.27, r: 0.065, step: 0.135, from: 0.33 },
  { d: 0.45, r: 0.085, step: 0.17, from: 0.36 },
  { d: 0.66, r: 0.105, step: 0.21, from: 0.38 },
  { d: 0.9, r: 0.125, step: 0.25, from: 0.4 },
  { d: 1.17, r: 0.145, step: 0.29, from: 0.42 },
] as const;

/**
 * The floor of cloud, printed flat: a scalloped edge of flattened lobes along its top (lit caps
 * over a lit body, the shade beneath), solid below, and lower tiers of lobes piled up the face at
 * the sides. At the show's finale its tops are warmed by the bursts (tone.ts).
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  const cx = s.cssW / 2;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.floorCloud : tone.floorCap;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = cx + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) oval(ctx, x, y, r * 1.2, r);
      else if (pass === 1) oval(ctx, x - r * 0.05, y - r * 0.16, r * 1.12, r * 0.84);
      else oval(ctx, x - r * 0.28, y - r * 0.6, r * 0.52, r * 0.24);
    }
    if (pass === 0) ctx.rect(0, top + u * FACE, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * FACE, s.cssW, u * 0.035);
    // The tiers at the sides: flat-bottomed domes, body then caps.
    for (const tier of TIERS) {
      const y = top + tier.d * u;
      if (pass === 0 || y - tier.r * u > s.cssH) continue;
      const r = tier.r * u;
      for (const side of [-1, 1]) {
        for (let k = 0; ; k++) {
          const x = cx + side * (tier.from + (k + 0.5) * tier.step) * u;
          if (x < -r * 1.3 || x > s.cssW + r * 1.3) break;
          if (pass === 1) {
            ctx.moveTo(x + r * 1.25, y);
            ctx.ellipse(x, y, r * 1.25, r, 0, 0, Math.PI, true);
            ctx.closePath();
          } else oval(ctx, x - r * 0.35, y - r * 0.62, r * 0.5, r * 0.22);
        }
      }
    }
    ctx.fill();
  }
}

/** The far layer: the cloud bank and the landmarks (always, once they would show), and the town while the land shows. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const line = landmarkLine(s);
  const land = landShows(s);
  if (line - u * POLE_TOP < s.cssH && top - u * 0.06 > line - u * POLE_TOP) {
    cloudBank(ctx, s, tone, line);
    if (land) hills(ctx, s, tone, Math.min(s.cssH, top + u * 0.12));
    church(ctx, s, tone, line, land);
    courthouse(ctx, s, tone, line, land);
    if (land) {
      townRow(ctx, s, tone);
      trees(ctx, s, tone);
    }
  }
}

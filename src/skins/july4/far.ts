import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { starPath, swagBand } from "./shapes";
import { smooth } from "./shapes";
import { DAY_HIGH, level, type Tone } from "./tone";

// The far layer, standing on the horizon, in three depths. Furthest, rolling summer hills in
// two rows (the far one hazy), with the town park's tree line on the right. On them, Main
// Street: the far side of the town square, a row of two-story brick, tan and cream storefronts
// with awnings and cornices, every front hung with red-white-and-blue bunting and little
// flags; a white clapboard church on the left with a tall steeple, a stone courthouse on the
// right with a pillared portico, a clock tower and a dome flying the flag; and big round summer
// trees between them. Above the start a floor of cloud gathers below you and swallows the
// town; from then on its puffy top is the horizon, and only the steeple and the courthouse's
// dome and flag stand out of it. Then it sinks with them to rest low on the screen, and there
// it stays for good, a calm sea of cloud with the two landmarks standing out of it, for the sun
// to set into and rise out of on every turn of the story's loop (tone.ts), and for the
// fireworks to light at the show's finale. All of it is faded and flat, with no outline, and
// nothing here moves but the courthouse flag.
//
// Positions are in u from the screen center, heights in u from the horizon (negative is up).

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

/** Puffs of fair-weather cloud piled low behind the town at either side: [X (u from center), height above the line (u), radius (u)]. */
const BANK = [
  [-0.7, 0.12, 0.12],
  [-0.56, 0.17, 0.1],
  [-0.45, 0.12, 0.08],
  [-0.36, 0.08, 0.06],
  [0.4, 0.09, 0.07],
  [0.5, 0.15, 0.1],
  [0.62, 0.11, 0.12],
] as const;

/** Soft white cumulus piled along the line at either side, behind the hills and the landmarks. */
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
      if (pass === 0) circle(ctx, x, y, r * u);
      else if (pass === 1) circle(ctx, x - r * u * 0.08, y - r * u * 0.1, r * u * 0.9);
      else circle(ctx, x - r * u * 0.3, y - r * u * 0.42, r * u * 0.4);
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

/** The center block, behind the tower: a general store, a hardware store and a diner. */
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

/** One storefront: the wall, its windows, the cornice or awning, the shopfront, bunting and flags. */
function shop(ctx: Ctx, s: Scene, tone: Tone, shp: Shop, hz: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const x0 = cx + (shp.x - shp.hw) * u;
  const w = shp.hw * 2 * u;
  const h = shp.h * u;
  if (x0 + w < -1 || x0 > s.cssW + 1) return;
  ctx.fillStyle = wallTone(tone, shp.wall);
  ctx.fillRect(x0, hz - h, w, h + 1);
  // The cornice (a lighter cap) or a parapet step.
  ctx.fillStyle = tone.trim;
  if (shp.cornice) ctx.fillRect(x0 - u * 0.004, hz - h, w + u * 0.008, u * 0.012);
  else ctx.fillRect(x0 + w * 0.3, hz - h - u * 0.012, w * 0.4, u * 0.012);
  // Upper windows: a row of tall sashes.
  const n = Math.max(1, Math.round(w / (u * 0.03)));
  const ww = u * 0.013;
  const wh = u * 0.03;
  ctx.fillStyle = tone.window;
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(x0 + ((i + 0.5) * w) / n - ww / 2, hz - h + u * 0.03, ww, wh);
  ctx.fill();
  // The shopfront: a wide window under a transom and the door, on a dark sill line.
  const sf = hz - u * 0.055;
  ctx.fillStyle = tone.window;
  ctx.fillRect(x0 + w * 0.12, sf, w * 0.76, u * 0.04);
  ctx.fillStyle = tone.trim;
  ctx.fillRect(x0 + w * 0.12, sf, w * 0.76, u * 0.004);
  ctx.fillRect(x0 + w * 0.5 - u * 0.004, sf, u * 0.008, u * 0.04);
  // An awning: a striped scallop over the shopfront, or bunting swags along the string course.
  if (shp.awning >= 0) {
    const ay = sf - u * 0.004;
    ctx.fillStyle = tone.awnings[shp.awning as 0 | 1 | 2];
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.06, ay - u * 0.016);
    ctx.lineTo(x0 + w * 0.94, ay - u * 0.016);
    ctx.lineTo(x0 + w * 0.97, ay + u * 0.004);
    ctx.lineTo(x0 + w * 0.03, ay + u * 0.004);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.trim;
    ctx.beginPath();
    const k = Math.max(2, Math.round(w / (u * 0.014)));
    for (let i = 0; i < k; i += 2) ctx.rect(x0 + w * 0.03 + ((i + 0.5) * w * 0.94) / k - u * 0.003, ay + u * 0.002, u * 0.006, u * 0.006);
    ctx.fill();
  }
  // Bunting along the string course between the stories: three swags of red, white and blue.
  const by = hz - u * 0.068;
  const swags = Math.max(1, Math.round(w / (u * 0.04)));
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) swagBand(ctx, x0 + (i * w) / swags, x0 + ((i + 1) * w) / swags, by, u * 0.012, band, 3);
    ctx.fill();
  }
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

/** Main Street: the left run, the center block. */
export function townRow(ctx: Ctx, s: Scene, tone: Tone): void {
  const hz = s.horizonY;
  for (const shp of LEFT_RUN) shop(ctx, s, tone, shp, hz);
  for (const shp of CENTER) shop(ctx, s, tone, shp, hz);
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
    ctx.fillStyle = tone.stone;
    ctx.beginPath();
    ctx.rect(x - hw, line - CHURCH_H * u, hw * 2, CHURCH_H * u + 1);
    ctx.fill();
    ctx.fillStyle = tone.stoneLit;
    ctx.beginPath();
    ctx.moveTo(x - hw - u * 0.006, line - CHURCH_H * u);
    ctx.lineTo(x, line - (CHURCH_H + 0.05) * u);
    ctx.lineTo(x + hw + u * 0.006, line - CHURCH_H * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    ctx.moveTo(x - hw - u * 0.006, line - CHURCH_H * u);
    ctx.lineTo(x, line - (CHURCH_H + 0.05) * u);
    ctx.lineTo(x + hw + u * 0.006, line - CHURCH_H * u);
    ctx.lineTo(x + hw + u * 0.006, line - (CHURCH_H - 0.008) * u);
    ctx.lineTo(x, line - (CHURCH_H + 0.042) * u);
    ctx.lineTo(x - hw - u * 0.006, line - (CHURCH_H - 0.008) * u);
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
  // The tower, a belfry with a louvred opening, and the spire with a tiny cross.
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.rect(tx - thw, line - STEEPLE_TOWER * u, thw * 2, STEEPLE_TOWER * u + 1);
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(tx - thw, line - STEEPLE_TOWER * u, thw * 0.5, STEEPLE_TOWER * u);
  ctx.fillStyle = tone.window;
  ctx.fillRect(tx - thw * 0.4, line - (STEEPLE_TOWER - 0.02) * u, thw * 0.8, u * 0.032);
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(tx - thw - u * 0.006, line - STEEPLE_TOWER * u);
  ctx.lineTo(tx, line - STEEPLE_TOP * u);
  ctx.lineTo(tx + thw + u * 0.006, line - STEEPLE_TOWER * u);
  ctx.closePath();
  ctx.rect(tx - u * 0.0015, line - STEEPLE_REACH * u, u * 0.003, u * 0.022);
  ctx.rect(tx - u * 0.006, line - (STEEPLE_TOP + 0.014) * u, u * 0.012, u * 0.003);
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
    ctx.fillStyle = tone.stone;
    ctx.fillRect(x - hw, line - COURT_H * u, hw * 2, COURT_H * u + 1);
    ctx.fillStyle = tone.stoneLit;
    ctx.fillRect(x - hw, line - COURT_H * u, hw * 2, u * 0.01);
    // The windows either wing.
    ctx.fillStyle = tone.window;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      for (const side of [-1, 1]) {
        const wx = x + side * (hw * 0.55 + i * hw * 0.25) - u * 0.006;
        ctx.rect(wx, line - (COURT_H - 0.03) * u, u * 0.012, u * 0.028);
        ctx.rect(wx, line - u * 0.055, u * 0.012, u * 0.028);
      }
    }
    ctx.fill();
    // The portico: four columns under a pediment, the doors between them.
    const pw = hw * 0.62;
    ctx.fillStyle = tone.window;
    ctx.fillRect(x - u * 0.014, line - u * 0.05, u * 0.028, u * 0.05);
    ctx.fillStyle = tone.stoneLit;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) ctx.rect(x - pw + ((i + 0.5) * pw * 2) / 4 - u * 0.005, line - (COURT_H - 0.016) * u, u * 0.01, (COURT_H - 0.016) * u);
    ctx.moveTo(x - pw - u * 0.008, line - (COURT_H - 0.014) * u);
    ctx.lineTo(x, line - (COURT_H + 0.03) * u);
    ctx.lineTo(x + pw + u * 0.008, line - (COURT_H - 0.014) * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.slate;
    ctx.beginPath();
    ctx.moveTo(x - pw - u * 0.008, line - (COURT_H - 0.014) * u);
    ctx.lineTo(x, line - (COURT_H + 0.03) * u);
    ctx.lineTo(x + pw + u * 0.008, line - (COURT_H - 0.014) * u);
    ctx.lineTo(x + pw + u * 0.008, line - (COURT_H - 0.02) * u);
    ctx.lineTo(x, line - (COURT_H + 0.022) * u);
    ctx.lineTo(x - pw - u * 0.008, line - (COURT_H - 0.02) * u);
    ctx.closePath();
    ctx.fill();
    // Bunting along the portico's architrave.
    for (let band = 0; band < 3; band++) {
      ctx.fillStyle = band === 0 ? tone.red : band === 1 ? tone.white : tone.blue;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) swagBand(ctx, x - pw + (i * pw * 2) / 3, x - pw + ((i + 1) * pw * 2) / 3, line - (COURT_H - 0.02) * u, u * 0.012, band, 3);
      ctx.fill();
    }
  }
  // The clock tower: a square stage with the clock, a lit cornice, the drum under the dome.
  const top = line - TOWER_H * u;
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - thw, top, thw * 2, TOWER_H * u + 1);
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x - thw, top, thw * 0.45, TOWER_H * u);
  ctx.fillRect(x - thw - u * 0.005, top, thw * 2 + u * 0.01, u * 0.01);
  ctx.fillStyle = tone.slate;
  ctx.fillRect(x - thw - u * 0.005, top + u * 0.01, thw * 2 + u * 0.01, u * 0.004);
  // The clock: a pale face with a dark rim and hands at ten past four, a summer afternoon.
  const cy = top + u * 0.05;
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.024);
  ctx.fill();
  ctx.fillStyle = tone.trim;
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.02);
  ctx.fill();
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.011, cy + u * 0.006);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.005, cy - u * 0.015);
  ctx.stroke();
  // The dome on its drum, with a lit left side, and the flagpole on top.
  const dy = line - (DOME_TOP - DOME_R) * u;
  ctx.fillStyle = tone.stone;
  ctx.fillRect(x - thw * 0.8, dy, thw * 1.6, top - dy + 1);
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  ctx.moveTo(x - DOME_R * u, dy);
  ctx.arc(x, dy, DOME_R * u, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.moveTo(x - DOME_R * u * 0.9, dy);
  ctx.arc(x - DOME_R * u * 0.25, dy, DOME_R * u * 0.65, Math.PI, Math.PI * 1.5);
  ctx.lineTo(x - DOME_R * u * 0.25, dy);
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

/** The big summer trees in front of the row: a trunk, a shaded canopy with a lit crown. */
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

/** Puffs along the floor's top edge, repeating every FLOOR_SPAN of them. */
const FLOOR_SPAN = 9;
const FLOOR = Array.from({ length: FLOOR_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 6200) * 0.035, dy: hash(i + 6300) * 0.025 }));
const FLOOR_STEP = 0.085;
/** Swells down the floor's face: x (fraction of a span), depth under the top (u), radius (u). */
const SWELLS = [
  { x: 0.1, d: 0.1, r: 0.05 },
  { x: 0.45, d: 0.16, r: 0.06 },
  { x: 0.8, d: 0.09, r: 0.045 },
] as const;
const SWELL_SPAN = 0.5;
const SWELL_ROWS = 4;

/**
 * The floor of cloud: a line of puffs along its top (lit on top, shaded beneath), solid below,
 * and swells down its face. At the show's finale its tops are warmed by the bursts (tone.ts).
 */
export function cloudFloor(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * FLOOR_STEP;
  const half = Math.ceil(s.cssW / 2 / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.floorCloud : tone.floorCap;
    ctx.beginPath();
    for (let j = -half; j <= half; j++) {
      const x = s.cssW / 2 + j * step;
      const p = FLOOR[((j % FLOOR_SPAN) + FLOOR_SPAN) % FLOOR_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.floorCap : tone.floorCloud;
    ctx.globalAlpha = pass ? 0.75 : 0.7;
    ctx.beginPath();
    for (let row = 0; row < SWELL_ROWS; row++) {
      const grow = 1 + row * 0.4;
      const span = u * SWELL_SPAN * grow;
      const reps = Math.ceil(s.cssW / 2 / span) + 1;
      for (let k = -reps; k < reps; k++) {
        for (const w of SWELLS) {
          const r = w.r * u * grow;
          const y = top + (w.d + row * 0.2 * grow) * u + u * 0.05;
          if (y - r > s.cssH) continue;
          const x = s.cssW / 2 + (k + w.x + row * 0.37) * span;
          const rx = r * (pass ? 1.2 : 2.2);
          const ry = r * (pass ? 0.22 : 0.5);
          const ex = x - (pass ? r * 0.35 : 0);
          const ey = y - (pass ? r * 0.2 : 0);
          ctx.moveTo(ex + rx, ey);
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI, true);
          ctx.closePath();
        }
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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

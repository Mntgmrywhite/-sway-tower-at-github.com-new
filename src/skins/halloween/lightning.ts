import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { HALO_REACH, moonAt } from "./sky";
import { bandOf, level, storyLevel, toneOfLevel } from "./tone";

// Distant lightning: now and then the sky out in the lanes blinks pale for a moment, twice (a flash
// and its echo), a thin forked bolt stabs down far away in a lane, and for that moment it shows what
// the dark hides: a castle on the horizon behind the crag that is not there between flashes (low
// down), a castle keep among the spires (the gothic skyline), a ghost castle and something huge
// striding behind the spires (the storm: the colossus is the cast's, cast/distant.ts). Subtle: the
// wash is a faint lavender, under the moon (its disc never changes), barely there behind the tower,
// and never with reduce motion on (Scene.still).
//
// When: a slot every SLOT seconds, each jittered by up to a second either way; a slot fires when its
// hash is under the stretch's rate (tone.bolt: about one in four on Main Street and in the calm
// night, one in two and a half among the spires, nearly every slot in the storm). The first flash is
// part of the opening: at FIRST seconds, as the cat looks up at the moon. Pure in the scene's clock.

/** Seconds between lightning slots, and when the first (always) flashes. */
export const SLOT = 6;
export const FIRST = 7.6;
/** A flash lasts this long: the flash, its echo ECHO later at ECHO_K of its strength. */
export const FLASH = 0.35;
const ECHO = 0.15;
const ECHO_K = 0.6;
/** The bolt shows this long. */
const BOLT = 0.12;
/** The wash's color, and its strongest opacity in the lanes and behind the tower. */
const WASH = [201, 195, 255] as const;
export const WASH_LANE = 0.1;
export const WASH_COLUMN = 0.03;

/** When slot k comes (seconds). Slot 0 never fires; slot 1 is the opening's flash. */
export function slotTime(k: number): number {
  if (k === 1) return FIRST;
  return SLOT * k + 2 * (hash(k * 13 + 911) - 0.5);
}

/** Whether slot k fires at a lightning rate (chance per slot). */
export function fires(k: number, rate: number): boolean {
  if (k <= 0) return false;
  if (k === 1) return true;
  return hash(k * 7 + 1) < rate;
}

/** One pulse of light `x` seconds after it struck: a snap on, a quick fade. */
function one(x: number): number {
  return x < 0 ? 0 : x < 0.025 ? x / 0.025 : Math.max(0, 1 - (x - 0.025) / 0.1);
}

/** A flash's strength `dt` seconds after it struck: the flash, then its echo. */
export function pulse(dt: number): number {
  return Math.min(1, one(dt) + ECHO_K * one(dt - ECHO));
}

/** The lightning rate at a level (chance a slot fires). */
export function boltRate(lvl: number): number {
  return toneOfLevel(lvl).bolt;
}

/** Scratch: the slot striking now, if any. */
const NOW = { k: -1, dt: 0 };

/** The slot whose flash is lighting the sky at time t at this rate (k -1 if none), and how long ago it struck. */
export function strikeAt(t: number, rate: number): typeof NOW {
  NOW.k = -1;
  NOW.dt = 0;
  const k0 = Math.floor(t / SLOT);
  for (let k = k0 + 1; k >= Math.max(1, k0 - 1); k--) {
    const dt = t - slotTime(k);
    if (dt >= 0 && dt < FLASH && fires(k, rate)) {
      NOW.k = k;
      NOW.dt = dt;
      return NOW;
    }
  }
  return NOW;
}

/** How bright the lightning is now, 0..1 (0 with reduce motion on). */
export function flashAt(s: Scene): number {
  if (s.still) return 0;
  const hit = strikeAt(s.t, boltRate(level(s)));
  return hit.k < 0 ? 0 : pulse(hit.dt);
}

// ---------------------------------------------------------------- the wash

/** The wash's horizontal gradient, kept while the screen and the column stay the same. */
const WASH_G = { w: NaN, a: NaN, b: NaN, g: null as CanvasGradient | null };

function rgba(a: number): string {
  return `rgba(${WASH[0]}, ${WASH[1]}, ${WASH[2]}, ${a})`;
}

/**
 * The sky's wash for a flash of strength L: a faint lavender over the lanes, fainter still behind
 * the tower, from the top of the screen down to `bottom` (the far land's line). Drawn before the
 * moon, so its disc never changes.
 */
export function wash(ctx: Ctx, s: Scene, L: number, bottom: number): void {
  if (L <= 0.003) return;
  const a = s.baseX - s.u * 0.05;
  const b = s.baseX + s.baseW + s.u * 0.05;
  if (WASH_G.w !== s.cssW || WASH_G.a !== a || WASH_G.b !== b) {
    const ramp = s.u * 0.06;
    const g = ctx.createLinearGradient(0, 0, s.cssW, 0);
    const f = (x: number) => Math.max(0, Math.min(1, x / s.cssW));
    g.addColorStop(0, rgba(WASH_LANE));
    g.addColorStop(f(a - ramp), rgba(WASH_LANE));
    g.addColorStop(f(a), rgba(WASH_COLUMN));
    g.addColorStop(f(b), rgba(WASH_COLUMN));
    g.addColorStop(f(b + ramp), rgba(WASH_LANE));
    g.addColorStop(1, rgba(WASH_LANE));
    WASH_G.w = s.cssW;
    WASH_G.a = a;
    WASH_G.b = b;
    WASH_G.g = g;
  }
  ctx.globalAlpha = L;
  ctx.fillStyle = WASH_G.g!;
  ctx.fillRect(0, 0, s.cssW, Math.max(0, bottom));
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the bolt and what it shows

const BOLT_COLOR = "#efeaff";
const REVEAL = "#0b0818";
/** The bolt's points (x, y as fractions of its box), made once per slot. */
const PTS = new Float64Array(2 * 12);
let ptsK = -2;

function boltShape(k: number): void {
  if (ptsK === k) return;
  ptsK = k;
  let x = 0.5;
  for (let i = 0; i < 9; i++) {
    PTS[i * 2] = x;
    PTS[i * 2 + 1] = i / 8;
    x = Math.max(0.1, Math.min(0.9, x + (hash(k * 31 + i * 7 + 3) - 0.5) * 0.45));
  }
  // The fork, off the fourth point.
  const fx = PTS[6]!;
  for (let i = 0; i < 3; i++) {
    PTS[18 + i * 2] = Math.max(0, Math.min(1, fx + (hash(k * 17 + 5) < 0.5 ? -1 : 1) * 0.16 * (i + 1)));
    PTS[18 + i * 2 + 1] = 0.375 + 0.12 * (i + 1);
  }
}

/** Scratch box of the bolt this frame (x0, y0, x1, y1), for tests; w 0 when none. */
export const BOLT_BOX = { x0: 0, y0: 0, x1: 0, y1: 0, on: false };

/**
 * The bolt far away out in a lane (the right one, or low in the left one below the moon's halo when
 * the slot's hash says so and there is room), and the stretch's reveal at the flash's strength.
 * `foot` is where the far land stands (the bolt strikes down to it).
 */
export function bolt(ctx: Ctx, s: Scene, L: number, foot: number): void {
  BOLT_BOX.on = false;
  if (L <= 0.003) return;
  const lvl = level(s);
  const hit = strikeAt(s.t, boltRate(lvl));
  if (hit.k < 0) return;
  const u = s.u;
  const col0 = s.baseX - u * 0.05;
  const col1 = s.baseX + s.baseW + u * 0.05;
  const m = moonAt(s);
  const halo = m.y + m.r * HALO_REACH + u * 0.02;
  const top = s.cssH * 0.22;
  let x0: number;
  let x1: number;
  let y0: number;
  const left = hash(hit.k * 5 + 2) < 0.3 && foot - halo > u * 0.12 && col0 > u * 0.12;
  if (left) {
    x0 = u * 0.03;
    x1 = Math.min(col0 - u * 0.03, x0 + u * 0.12);
    y0 = halo;
  } else {
    x0 = col1 + u * 0.03;
    x1 = Math.min(s.cssW - u * 0.03, x0 + u * 0.14);
    y0 = top;
  }
  const y1 = Math.min(foot, s.cssH);
  if (hit.dt < BOLT && x1 - x0 > u * 0.04 && y1 - y0 > u * 0.08) {
    boltShape(hit.k);
    const w = x1 - x0;
    const h = y1 - y0;
    ctx.beginPath();
    ctx.moveTo(x0 + PTS[0]! * w, y0 + PTS[1]! * h);
    for (let i = 1; i < 9; i++) ctx.lineTo(x0 + PTS[i * 2]! * w, y0 + PTS[i * 2 + 1]! * h);
    ctx.moveTo(x0 + PTS[6]! * w, y0 + PTS[7]! * h);
    for (let i = 0; i < 3; i++) ctx.lineTo(x0 + PTS[18 + i * 2]! * w, y0 + PTS[19 + i * 2]! * h);
    ctx.strokeStyle = BOLT_COLOR;
    ctx.globalAlpha = Math.min(1, L * 1.2);
    ctx.lineWidth = Math.max(1, u * 0.0034);
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.globalAlpha = 1;
    BOLT_BOX.x0 = x0;
    BOLT_BOX.x1 = x1;
    BOLT_BOX.y0 = y0;
    BOLT_BOX.y1 = y1;
    BOLT_BOX.on = true;
  }
  reveal(ctx, s, L, foot, bandOf(storyLevel(lvl)), col1);
}

/**
 * What the flash shows, in the right lane, dark against the pale sky: low down, a castle of three
 * thin spires on the horizon behind the crag; among the spires, a castle keep with a pennant; in
 * the storm, a ghost castle (and the colossus, the cast's).
 */
function reveal(ctx: Ctx, s: Scene, L: number, foot: number, band: number, col1: number): void {
  const u = s.u;
  const w = Math.min(s.cssW - u * 0.02 - col1, u * 0.2);
  if (w < u * 0.08) return;
  const x = col1 + (s.cssW - u * 0.02 - col1) * 0.55;
  const k = w / (u * 0.2);
  ctx.fillStyle = REVEAL;
  ctx.globalAlpha = L;
  ctx.beginPath();
  if (band <= 1) {
    // Three thin spires on a long wall: a castle on the horizon that is not there between flashes.
    const y = foot;
    const H = u * 0.13 * k;
    ctx.moveTo(x - w * 0.48, y);
    ctx.lineTo(x - w * 0.48, y - H * 0.28);
    ctx.lineTo(x + w * 0.46, y - H * 0.24);
    ctx.lineTo(x + w * 0.46, y);
    ctx.closePath();
    spire(ctx, x - w * 0.3, y - H * 0.26, w * 0.05, H * 0.9);
    spire(ctx, x + w * 0.02, y - H * 0.25, w * 0.065, H * 1.05);
    spire(ctx, x + w * 0.3, y - H * 0.24, w * 0.045, H * 0.7);
  } else if (band === 2) {
    // A square keep with a crooked turret and a pennant.
    const y = foot;
    const H = u * 0.2 * k;
    ctx.moveTo(x - w * 0.22, y);
    ctx.lineTo(x - w * 0.2, y - H * 0.7);
    for (let i = 0; i < 4; i++) {
      const cx = x - w * 0.2 + (w * 0.4 * (i + 0.5)) / 4;
      ctx.lineTo(cx - w * 0.03, y - H * 0.7);
      ctx.lineTo(cx - w * 0.03, y - H * 0.76);
      ctx.lineTo(cx + w * 0.03, y - H * 0.76);
      ctx.lineTo(cx + w * 0.03, y - H * 0.7);
    }
    ctx.lineTo(x + w * 0.2, y - H * 0.7);
    ctx.lineTo(x + w * 0.22, y);
    ctx.closePath();
    spire(ctx, x + w * 0.08, y - H * 0.74, w * 0.06, H * 0.32);
    ctx.moveTo(x + w * 0.08, y - H * 1.06);
    ctx.lineTo(x + w * 0.24, y - H * 1.0);
    ctx.lineTo(x + w * 0.08, y - H * 0.96);
    ctx.closePath();
  } else {
    // The ghost castle: towers of every height crowded on a crag, impossibly tall and thin.
    const y = foot;
    const H = u * 0.26 * k;
    ctx.moveTo(x - w * 0.46, y);
    ctx.lineTo(x - w * 0.3, y - H * 0.2);
    ctx.lineTo(x + w * 0.3, y - H * 0.22);
    ctx.lineTo(x + w * 0.46, y);
    ctx.closePath();
    for (let i = 0; i < 5; i++) {
      const tx = x - w * 0.32 + i * w * 0.16;
      const th = H * (0.45 + 0.55 * hash(i + 4040));
      const tw = w * (0.035 + 0.02 * hash(i + 4050));
      ctx.rect(tx - tw, y - H * 0.18 - th * 0.75, tw * 2, th * 0.75);
      spire(ctx, tx, y - H * 0.18 - th * 0.75, tw * 1.3, th * 0.3);
    }
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A thin pointed spire on a base at (x, y), half-width w, h tall, as a closed subpath. */
function spire(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w, y + 1);
  ctx.lineTo(x - w * 0.8, y - h * 0.55);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w * 0.8, y - h * 0.55);
  ctx.lineTo(x + w, y + 1);
  ctx.closePath();
}

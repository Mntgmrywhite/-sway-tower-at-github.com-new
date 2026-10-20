import { hash, mix, type Ctx } from "../../base/draw";
import { altitude01, fieldY, layerGround, puffs } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";
import { backyard } from "./ground";
import { hollow } from "./hollow";
import { bankPuffs, keepClear, type Puff } from "./shown";
import { celestial, driftingLeaves, moonSpot, sunSpot, type Body } from "./sky";
import { LOOP_LEVELS, loopTone } from "./story";

// Everything behind the tower, painted by the skin itself (`paintsBackdrop`): the base world's
// sky, cloud bank and field exactly as src/base/world.ts draws them, with the skin's layers in
// their places (the sun, the moon and the geese; the leaves; the hollow; the backyard). The
// one thing done differently is the small clouds you climb past: the base world's drift straight
// across the screen, over the sun and the moon at their heights, and nothing may pass over the
// sun or the moon (the owner's rule). Here a cloud nearing a body's light melts away into its
// middle and grows back past it, so the sun never tears behind one; and the clouds come round
// with the looping day, so the loop repeats exactly.

/** The base sky's night, which it deepens toward as you climb. */
const NIGHT = "#151640";

/** The base world's stars, generated the same way. */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.8,
  r: 0.8 + hash(i + 200) * 1.2,
  sparkle: hash(i + 300) > 0.85,
}));

/** The base sky (in the loop the celestial layer paints its own over all of it, so it is skipped). */
function sky(ctx: Ctx, s: Scene): void {
  const p = PALETTE;
  const a = altitude01(s);
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, s.horizonY));
  g.addColorStop(0, mix(p.skyTop, NIGHT, a * 0.5));
  g.addColorStop(0.6, mix(p.skyMid, NIGHT, a * 0.4));
  g.addColorStop(1, mix(p.skyBottom, NIGHT, a * 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  ctx.fillStyle = p.star;
  for (let i = 0; i < STARS.length; i++) {
    const st = STARS[i]!;
    const y = st.y * s.cssH;
    if (y > s.horizonY - s.u * 0.05 || st.y > 0.4 + a * 0.5) continue;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(s.t * 1.5 + i);
    const x = st.x * s.cssW;
    if (st.sparkle) {
      const r = st.r * 2.2;
      ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
      ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    } else {
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

/** The height clouds' puffs, reused so the backdrop allocates nothing per frame. */
const CLOUD: Puff[] = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, r: 0 }));

/** Puffy clouds along the horizon, piled high at the sides and low behind the tower (the base world's). */
export function cloudBank(ctx: Ctx, s: Scene): void {
  const bank = bankPuffs(s);
  if (bank.length) puffs(ctx, PALETTE, bank);
}

/** Parallax depth of the height clouds, and the height (world units) of the first. */
const HEIGHTS_P = 0.6;
const HEIGHTS_FIRST = 120;
/** How many height clouds pass in one loop of the day, and so how far apart they are. */
const HEIGHTS_PER_LOOP = 8;
const HEIGHTS_SPAN = (LOOP_LEVELS * BLOCK_HEIGHT) / HEIGHTS_PER_LOOP;
/** Clear sky kept between a cloud and a body's light, in u. */
const ROOM = 0.02;
/** A cloud shrunk below this share of its size fades out as it goes. */
const FADE_BELOW = 0.25;
/** Each cloud's puffs: offset from its center and size, in its radius. */
const PUFFS = [
  [-1.3, 0.2, 0.8],
  [0, -0.2, 1],
  [1.2, 0.1, 0.85],
  [0.4, 0.35, 0.8],
] as const;

/** Whether a cloud of radius r at (x, y), shrunk to f of its size about its middle, keeps ROOM clear of b's light. */
function clear(s: Scene, b: Body, x: number, y: number, r: number, f: number): boolean {
  const reach = b.reach + s.u * ROOM;
  for (const [dx, dy, dr] of PUFFS) {
    if (Math.hypot(x + dx * r * f - b.x, y + dy * r * f - b.y) < reach + dr * r * f) return false;
  }
  return true;
}

/** The largest share of its size (0..1) a cloud can have and keep clear of b's light. */
function room(s: Scene, b: Body, x: number, y: number, r: number): number {
  if (clear(s, b, x, y, r, 1)) return 1;
  if (!clear(s, b, x, y, r, 0)) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (clear(s, b, x, y, r, mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Small clouds at fixed heights, the scenery you climb past (the base world's, a cloud for every
 * eighth of the loop): each drifts across and comes round, and near the sun or the moon it melts
 * away, shrinking into its middle just fast enough to keep clear of their light, and grows back
 * past it.
 */
export function heightClouds(ctx: Ctx, s: Scene): void {
  const base = layerGround(s, HEIGHTS_P);
  const unit = s.scale * HEIGHTS_P;
  // (Each spot is its own reused object, read before either is asked for again.)
  const sun = sunSpot(s);
  const sunKeep = keepClear(s, sun);
  const moon = moonSpot(s);
  const moonKeep = keepClear(s, moon);
  const kMin = Math.max(0, Math.floor(((base - s.cssH - 200) / unit - HEIGHTS_FIRST) / HEIGHTS_SPAN));
  const kMax = Math.ceil(((base + 200) / unit - HEIGHTS_FIRST) / HEIGHTS_SPAN);
  for (let k = kMin; k <= kMax; k++) {
    const y = base - (HEIGHTS_FIRST + k * HEIGHTS_SPAN) * unit;
    if (y < -150 || y > s.cssH + 150) continue;
    const c = k % HEIGHTS_PER_LOOP;
    const dir = c % 2 ? 1 : -1;
    const span = s.cssW + 300;
    const x = ((((hash(c) * span + dir * s.t * (6 + hash(c + 9) * 8)) % span) + span) % span) - 150;
    const r = s.u * (0.045 + hash(c + 3) * 0.03);
    let f = 1;
    if (sunKeep > 0) f = Math.min(f, 1 - sunKeep * (1 - room(s, sun, x, y, r)));
    if (moonKeep > 0) f = Math.min(f, 1 - moonKeep * (1 - room(s, moon, x, y, r)));
    if (f <= 0.02) continue;
    for (let i = 0; i < PUFFS.length; i++) {
      const [dx, dy, dr] = PUFFS[i]!;
      const q = CLOUD[i]!;
      q.x = x + dx * r * f;
      q.y = y + dy * r * f;
      q.r = dr * r * f;
    }
    if (f < FADE_BELOW) ctx.globalAlpha = f / FADE_BELOW;
    puffs(ctx, PALETTE, CLOUD);
    ctx.globalAlpha = 1;
  }
}

/** The field from the horizon to the viewer, with soft mowing stripes in perspective (the base world's). */
function field(ctx: Ctx, s: Scene): void {
  const p = PALETTE;
  const hy = s.horizonY;
  if (hy >= s.cssH) return;
  const g = ctx.createLinearGradient(0, hy, 0, s.cssH);
  g.addColorStop(0, p.fieldFar);
  g.addColorStop(1, p.fieldNear);
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, s.cssW, s.cssH - hy);
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.beginPath();
  for (let z = 0.6, i = 0; z < 40; z += 0.5, i++) {
    if (i % 2) continue;
    const y0 = fieldY(s, z + 0.5);
    const y1 = fieldY(s, z);
    if (y0 > s.cssH) continue;
    if (y1 - y0 < 1) break;
    ctx.rect(0, y0, s.cssW, Math.min(y1, s.cssH) - y0);
  }
  ctx.fill();
  const haze = ctx.createLinearGradient(0, hy, 0, hy + s.u * 0.06);
  haze.addColorStop(0, HAZE);
  haze.addColorStop(1, p.fieldFar);
  ctx.fillStyle = haze;
  ctx.fillRect(0, hy, s.cssW, s.u * 0.06);
}

const HAZE = mix(PALETTE.fieldFar, PALETTE.cloudLight, 0.5);

/** The whole backdrop, back to front, as the base world would layer it. */
export function backdrop(ctx: Ctx, s: Scene): void {
  if (!loopTone(s)) sky(ctx, s);
  celestial(ctx, s);
  driftingLeaves(ctx, s);
  hollow(ctx, s);
  cloudBank(ctx, s);
  heightClouds(ctx, s);
  field(ctx, s);
  backyard(ctx, s);
}

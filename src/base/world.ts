import type { CartoonSkin, Palette, Scene } from "../skins/skin";
import { circle, hash, ink, mix, roundRectPath, type Ctx } from "./draw";

// The base world every skin sits on, in a bright 2D cartoon style (think a Flappy-Bird-like
// night scene): a periwinkle sky with stars and a moon, faded silhouettes in the distance,
// puffy cel-shaded clouds piled at the sides, a field running from the horizon to the viewer,
// and a grass lip over stone tiles in front. Skins recolor it through their palette and add
// props on each layer; they never replace the field or the foreground tiles.

/** Depth of the horizon layer (how much it moves as the camera climbs). */
export const HORIZON_P = 0.12;

/** Screen y of a parallax layer's ground line. p = 0 fixed, 1 = with the tower, > 1 = foreground. */
export function layerGround(s: Scene, p: number): number {
  return s.groundY - s.rise * (1 - p);
}

/** Where the horizon sits for a given ground line and climb. */
export function horizonFor(groundY: number, rise: number, u: number): number {
  return groundY - rise * (1 - HORIZON_P) - u * 0.3;
}

/** 0 at the ground, 1 once the tower is high in the night sky. */
export function altitude01(s: Scene): number {
  return Math.min(1, s.altitude / 600);
}

/** Depth of the tower's line on the field, for skins placing props in perspective. */
export const TOWER_DEPTH = 3;

/** Screen y of a field row at depth z (z = TOWER_DEPTH is the tower's line). */
export function fieldY(s: Scene, z: number): number {
  return s.horizonY + ((s.groundY - s.horizonY) * TOWER_DEPTH) / z;
}

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.8,
  r: 0.8 + hash(i + 200) * 1.2,
  sparkle: hash(i + 300) > 0.85,
}));

function sky(ctx: Ctx, s: Scene, p: Palette): void {
  const a = altitude01(s);
  // Deepens toward night as you climb, but stays a readable blue-violet.
  const night = "#151640";
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, s.horizonY));
  g.addColorStop(0, mix(p.skyTop, night, a * 0.5));
  g.addColorStop(0.6, mix(p.skyMid, night, a * 0.4));
  g.addColorStop(1, mix(p.skyBottom, night, a * 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  ctx.fillStyle = p.star;
  for (const [i, st] of STARS.entries()) {
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

/** The base moon: pale, softly glowing, with a few craters. Upper left, clear of the HUD. */
export function moon(ctx: Ctx, s: Scene, color: string): void {
  const a = altitude01(s);
  const mx = s.cssW * 0.2;
  const my = s.cssH * 0.1;
  const mr = s.u * (0.08 + a * 0.03);
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
  ctx.shadowBlur = mr * 0.8;
  ctx.fillStyle = color;
  ctx.beginPath();
  circle(ctx, mx, my, mr);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = mix(color, "#6a62c8", 0.18);
  ctx.beginPath();
  circle(ctx, mx - mr * 0.35, my - mr * 0.2, mr * 0.16);
  circle(ctx, mx + mr * 0.3, my + mr * 0.35, mr * 0.12);
  circle(ctx, mx + mr * 0.42, my - mr * 0.3, mr * 0.08);
  circle(ctx, mx - mr * 0.1, my + mr * 0.5, mr * 0.07);
  ctx.fill();
}

/** The base skyline: a faded city of flat-roofed towers with a few lit windows. */
function skyline(ctx: Ctx, s: Scene, color: string): void {
  const base = s.horizonY;
  if (base - s.u * 0.4 > s.cssH) return;
  const u = s.u;
  ctx.fillStyle = color;
  ctx.beginPath();
  let x = -u * 0.02;
  for (let i = 0; x < s.cssW; i++) {
    const w = u * (0.06 + hash(i + 400) * 0.07);
    const side = Math.abs(x / s.cssW - 0.5) * 2;
    const h = u * (0.08 + hash(i + 410) * 0.12) * (0.75 + side * 0.5);
    ctx.rect(x, base - h, w, h + 1);
    if (hash(i + 420) > 0.7) ctx.rect(x + w * 0.45, base - h - u * 0.03, Math.max(1, u * 0.004), u * 0.03);
    x += w * (0.9 + hash(i + 430) * 0.2);
  }
  ctx.fill();
  ctx.fillStyle = mix(color, "#ffffff", 0.22);
  for (let k = 0; k < 16; k++) {
    if (Math.sin(s.t * 0.5 + k * 2.3) < -0.4) continue;
    ctx.fillRect(hash(k + 500) * s.cssW, base - u * (0.02 + hash(k + 510) * 0.09), u * 0.01, u * 0.013);
  }
}

/** One cel-shaded puff cluster: shadow, body, then light caps. */
export function puffs(ctx: Ctx, p: Palette, list: readonly { x: number; y: number; r: number }[]): void {
  ctx.fillStyle = p.cloudShadow;
  ctx.beginPath();
  for (const q of list) circle(ctx, q.x, q.y, q.r);
  ctx.fill();
  ctx.fillStyle = p.cloudBase;
  ctx.beginPath();
  for (const q of list) circle(ctx, q.x - q.r * 0.06, q.y - q.r * 0.12, q.r * 0.9);
  ctx.fill();
  ctx.fillStyle = p.cloudLight;
  ctx.beginPath();
  for (const q of list) circle(ctx, q.x - q.r * 0.22, q.y - q.r * 0.38, q.r * 0.5);
  ctx.fill();
}

/** Puffy clouds along the horizon, piled high at the sides and low behind the tower. */
function cloudBank(ctx: Ctx, s: Scene, p: Palette): void {
  const base = s.horizonY + s.u * 0.02;
  if (base - s.u * 0.4 > s.cssH) return;
  const list: { x: number; y: number; r: number }[] = [];
  const step = s.u * 0.06;
  for (let i = 0, x = -step; x < s.cssW + step; i++, x += step) {
    const side = Math.abs(x / s.cssW - 0.5) * 2;
    const pile = 0.2 + 0.95 * side * side;
    const r = s.u * (0.05 + hash(i + 600) * 0.04) * (0.7 + pile);
    list.push({ x, y: base - s.u * 0.12 * pile - r * 0.2, r });
    if (side > 0.45) list.push({ x: x + step * 0.5, y: base - s.u * 0.25 * pile, r: r * 0.75 });
  }
  puffs(ctx, p, list);
}

/** Small clouds at fixed heights: the scenery you climb past. */
function heights(ctx: Ctx, s: Scene, p: Palette): void {
  const depth = 0.6;
  const base = layerGround(s, depth);
  const unit = s.scale * depth;
  const FIRST = 120;
  const SPAN = 110;
  const kMin = Math.max(0, Math.floor(((base - s.cssH - 200) / unit - FIRST) / SPAN));
  const kMax = Math.ceil(((base + 200) / unit - FIRST) / SPAN);
  for (let k = kMin; k <= kMax; k++) {
    const y = base - (FIRST + k * SPAN) * unit;
    if (y < -150 || y > s.cssH + 150) continue;
    const dir = k % 2 ? 1 : -1;
    const span = s.cssW + 300;
    const x = ((((hash(k) * span + dir * s.t * (6 + hash(k + 9) * 8)) % span) + span) % span) - 150;
    const r = s.u * (0.045 + hash(k + 3) * 0.03);
    puffs(ctx, p, [
      { x: x - r * 1.3, y: y + r * 0.2, r: r * 0.8 },
      { x, y: y - r * 0.2, r },
      { x: x + r * 1.2, y: y + r * 0.1, r: r * 0.85 },
      { x: x + r * 0.4, y: y + r * 0.35, r: r * 0.8 },
    ]);
  }
}

/** The field from the horizon to the viewer, with soft mowing stripes in perspective. */
function field(ctx: Ctx, s: Scene, p: Palette): void {
  const hy = s.horizonY;
  if (hy >= s.cssH) return;
  const g = ctx.createLinearGradient(0, hy, 0, s.cssH);
  g.addColorStop(0, p.fieldFar);
  g.addColorStop(1, p.fieldNear);
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, s.cssW, s.cssH - hy);

  // Alternate bands between rows at depths z and z + 0.5, so stripes widen toward you.
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
  // Soft haze where the field meets the clouds
  const haze = ctx.createLinearGradient(0, hy, 0, hy + s.u * 0.06);
  haze.addColorStop(0, mix(p.fieldFar, p.cloudLight, 0.5));
  haze.addColorStop(1, p.fieldFar);
  ctx.fillStyle = haze;
  ctx.fillRect(0, hy, s.cssW, s.u * 0.06);
}

/** Grass lip over rows of stone tiles, dropping away faster than the tower as you climb. */
function tiles(ctx: Ctx, s: Scene, p: Palette): void {
  const top = layerGround(s, 1.6) + s.u * 0.36;
  if (top - s.u * 0.04 > s.cssH) return;
  const u = s.u;
  const lw = Math.max(1.5, u * 0.006);
  const band = u * 0.025;

  ctx.fillStyle = mix(p.stone, p.ink, 0.35);
  ctx.fillRect(0, top + band, s.cssW, s.cssH - top);
  const rowH = u * 0.08;
  for (let row = 0, y = top + band; y < s.cssH; row++, y += rowH) {
    let x = row % 2 ? -u * 0.05 : -u * 0.01;
    for (let i = 0; x < s.cssW; i++) {
      const w = u * (0.12 + hash(row * 31 + i) * 0.08);
      roundRectPath(ctx, x + 2, y + 2, w - 4, rowH - 4, u * 0.012);
      ctx.fillStyle = p.stone;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = p.stoneLight;
      ctx.fillRect(x, y, w, rowH * 0.28);
      ctx.restore();
      roundRectPath(ctx, x + 2, y + 2, w - 4, rowH - 4, u * 0.012);
      ink(ctx, lw, p.ink);
      x += w;
    }
  }

  ctx.fillStyle = p.grass;
  ctx.fillRect(0, top, s.cssW, band);
  ctx.fillStyle = p.grassDark;
  ctx.beginPath();
  ctx.moveTo(0, top + 1);
  for (let x = 0, i = 0; x <= s.cssW + 8; x += u * 0.016, i++) {
    ctx.lineTo(x + u * 0.008, top - u * (0.008 + hash(i + 900) * 0.016));
    ctx.lineTo(x + u * 0.016, top + 1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, top + band);
  ctx.lineTo(s.cssW, top + band);
  ink(ctx, lw, p.ink);
}

/** Everything behind the tower. */
export function drawWorld(ctx: Ctx, s: Scene, skin: CartoonSkin): void {
  const p = skin.palette;
  sky(ctx, s, p);
  if (skin.celestial) skin.celestial(ctx, s);
  else moon(ctx, s, p.moon);
  skin.sky?.(ctx, s);
  if (skin.far) skin.far(ctx, s);
  else skyline(ctx, s, p.far);
  cloudBank(ctx, s, p);
  heights(ctx, s, p);
  field(ctx, s, p);
  skin.ground?.(ctx, s);
}

/** In front of the tower: the base grass and tiles, then the skin's own foreground. */
export function drawForeground(ctx: Ctx, s: Scene, skin: CartoonSkin): void {
  tiles(ctx, s, skin.palette);
  skin.foreground?.(ctx, s);
}

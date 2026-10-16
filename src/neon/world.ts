import type { Scene, Skin } from "../skins/skin";
import { alpha, hash, mix, neonStroke, type Ctx } from "./draw";

// The neon base world every skin sits on: dark sky, stars, a retro sun on the horizon,
// a glowing horizon band, and a perspective grid floor scrolling toward the viewer.
// Skins swap the palette and add props; they never replace the floor or the post pass.

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

const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100),
  r: 0.7 + hash(i + 200) * 1.3,
  sparkle: hash(i + 300) > 0.88,
}));

export function sky(ctx: Ctx, s: Scene, skin: Skin): void {
  const a = altitude01(s);
  const p = skin.palette;
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, s.horizonY));
  g.addColorStop(0, mix(p.skyTop, "#000000", a * 0.4));
  g.addColorStop(0.6, mix(p.skyMid, p.skyTop, a * 0.6));
  g.addColorStop(1, mix(p.skyBottom, p.skyMid, a * 0.5));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  // Stars: more come out the higher you climb.
  ctx.fillStyle = p.star;
  for (const [i, st] of STARS.entries()) {
    const y = st.y * s.cssH;
    if (y > s.horizonY - s.u * 0.05) continue;
    const reach = 0.45 + a * 0.55;
    if (st.y > reach) continue;
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(s.t * 1.6 + i * 1.7);
    const x = st.x * s.cssW;
    if (st.sparkle) {
      const r = st.r * 2.4;
      ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
      ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    } else {
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

/** The striped synthwave sun sitting on the horizon, behind the tower. */
export function retroSun(ctx: Ctx, s: Scene, top: string, bottom: string): void {
  const r = s.u * 0.26;
  const cx = s.cssW / 2;
  const cy = s.horizonY - r * 0.35;
  if (cy - r > s.cssH) return;

  // Halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2);
  halo.addColorStop(0, alpha(bottom, 0.35));
  halo.addColorStop(1, alpha(bottom, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  // Disc, cut by bands that thicken toward the horizon.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r, cy - r, r * 2, r * 1.05);
  let y = cy + r * 0.05;
  for (let i = 0; y < cy + r; i++) {
    const gap = r * (0.025 + i * 0.022);
    const band = r * 0.11;
    ctx.rect(cx - r, y + gap, r * 2, band);
    y += gap + band;
  }
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Wireframe neon mountains along the horizon, with a gap in the middle for the sun. */
export function mountains(ctx: Ctx, s: Scene, fill: string, rim: string): void {
  const hy = s.horizonY;
  if (hy - s.u * 0.3 > s.cssH) return;
  const peaks: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const fx = i / n;
    const side = Math.abs(fx - 0.5) * 2;
    const h = s.u * (0.05 + 0.2 * side * side + hash(i + 50) * 0.06);
    peaks.push([fx * s.cssW, hy - h]);
  }
  ctx.beginPath();
  ctx.moveTo(-10, hy);
  for (let i = 0; i < peaks.length; i++) {
    const [px, py] = peaks[i]!;
    const prev = peaks[i - 1];
    if (prev) ctx.lineTo((prev[0] + px) / 2, hy - (hy - Math.min(prev[1], py)) * 0.35);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(s.cssW + 10, hy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  neonStroke(ctx, rim, Math.max(1.2, s.u * 0.004));

  // Wireframe ribs from each peak down to the horizon.
  ctx.beginPath();
  for (const [px, py] of peaks) {
    ctx.moveTo(px, py);
    ctx.lineTo(px - s.u * 0.04, hy);
    ctx.moveTo(px, py);
    ctx.lineTo(px + s.u * 0.05, hy);
  }
  ctx.strokeStyle = alpha(rim, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Glow band and bright line along the horizon. */
function horizonGlow(ctx: Ctx, s: Scene, color: string): void {
  const hy = s.horizonY;
  if (hy > s.cssH + 10) return;
  const g = ctx.createLinearGradient(0, hy - s.u * 0.22, 0, hy);
  g.addColorStop(0, alpha(color, 0));
  g.addColorStop(1, alpha(color, 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, hy - s.u * 0.22, s.cssW, s.u * 0.22);
}

/** Perspective neon grid from the horizon to the bottom of the screen, scrolling toward you. */
function floor(ctx: Ctx, s: Scene, skin: Skin): void {
  const hy = s.horizonY;
  if (hy >= s.cssH) return;
  const p = skin.palette;
  const fill = ctx.createLinearGradient(0, hy, 0, s.cssH);
  fill.addColorStop(0, p.floorFar);
  fill.addColorStop(1, p.floorNear);
  ctx.fillStyle = fill;
  ctx.fillRect(0, hy, s.cssW, s.cssH - hy);

  // Projection: a floor line at depth z sits at  hy + H / z.  The tower stands at depth ZT,
  // so H grows as the ground drops below the horizon while you climb (lines spread out).
  const ZT = 3;
  const H = Math.max(s.u * 0.05, (s.groundY - hy) * ZT);
  const vx = s.cssW / 2;
  const cell = s.u * 0.12; // grid cell width at the tower's depth
  const zNear = H / Math.max(1, s.cssH - hy);
  const spacing = 0.5;
  const scroll = (s.t * 0.35) % spacing;

  ctx.beginPath();
  for (let z = Math.ceil(zNear / spacing) * spacing - scroll; z < 80; z += spacing) {
    if (z <= zNear * 0.98) continue;
    const y = hy + H / z;
    if (y - hy < 1.5) break;
    ctx.moveTo(0, y);
    ctx.lineTo(s.cssW, y);
  }
  const yBottom = s.cssH;
  const zBottom = H / Math.max(1, yBottom - hy);
  const xStep = (cell * ZT) / zBottom; // spacing of vertical lines at the bottom edge
  const count = Math.ceil(s.cssW / 2 / xStep) + 2;
  for (let j = -count; j <= count; j++) {
    ctx.moveTo(vx, hy);
    ctx.lineTo(vx + j * xStep, yBottom);
  }
  const lines = ctx.createLinearGradient(0, hy, 0, s.cssH);
  lines.addColorStop(0, alpha(p.grid, 0.15));
  lines.addColorStop(0.3, alpha(p.grid, 0.7));
  lines.addColorStop(1, p.grid);
  ctx.strokeStyle = alpha(p.grid, 0.16);
  ctx.lineWidth = Math.max(3, s.u * 0.012);
  ctx.stroke();
  ctx.strokeStyle = lines;
  ctx.lineWidth = Math.max(1, s.u * 0.0035);
  ctx.stroke();

  // Bright horizon line on top.
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(s.cssW, hy);
  neonStroke(ctx, p.horizon, Math.max(1.5, s.u * 0.005));
}

/** Everything behind the tower. */
export function drawWorld(ctx: Ctx, s: Scene, skin: Skin): void {
  sky(ctx, s, skin);
  if (skin.celestial) skin.celestial(ctx, s);
  else retroSun(ctx, s, skin.palette.sunTop, skin.palette.sunBottom);
  skin.sky?.(ctx, s);
  horizonGlow(ctx, s, skin.palette.horizon);
  if (skin.far) skin.far(ctx, s);
  else mountains(ctx, s, mix(skin.palette.skyBottom, "#000000", 0.55), skin.palette.grid);
  floor(ctx, s, skin);
  skin.ground?.(ctx, s);
}

/** In front of the tower, before the post pass. */
export function drawForeground(ctx: Ctx, s: Scene, skin: Skin): void {
  skin.foreground?.(ctx, s);
}

/** Scanlines and a vignette over the whole scene (under the HUD). */
export function drawPost(ctx: Ctx, s: Scene): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.09)";
  for (let y = 0; y < s.cssH; y += 3) ctx.fillRect(0, y, s.cssW, 1);
  const r = Math.hypot(s.cssW, s.cssH) / 2;
  const v = ctx.createRadialGradient(s.cssW / 2, s.cssH / 2, r * 0.45, s.cssW / 2, s.cssH / 2, r);
  v.addColorStop(0, "rgba(0, 0, 0, 0)");
  v.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, s.cssW, s.cssH);
}

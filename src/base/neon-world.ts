import type { NeonSkin, Scene } from "../skins/skin";
import { alpha, hash, mix, neonStroke, type Ctx } from "./draw";
import { altitude01 } from "./world";

// The pure neon world (the "Neon" style): dark sky, stars, a retro striped sun on the horizon,
// a glowing horizon band, a perspective grid floor scrolling toward the viewer, and a scanline
// + vignette pass. Used by skins with style: "neon".

const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100),
  r: 0.7 + hash(i + 200) * 1.3,
  sparkle: hash(i + 300) > 0.88,
}));

/**
 * The sky's gradient runs from the top of the screen down to the horizon, until the horizon has
 * sunk this many screen heights below the top (hundreds of levels up): from there it holds, so
 * the sky stops creeping darker and a skin's looping height story repeats exactly.
 */
const SKY_REACH = 2;

function sky(ctx: Ctx, s: Scene, skin: NeonSkin): void {
  const a = altitude01(s);
  const p = skin.palette;
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, Math.min(s.horizonY, s.cssH * SKY_REACH)));
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

/** The floor's depth scale (world.ts's TOWER_DEPTH): the tower stands on the line at depth 3. */
const ZT = 3;
/**
 * Deepest the floor may be at the screen's bottom edge (in the projection's depth units; about 1
 * at the start, where the bottom edge is a little nearer than the tower's line).
 *
 * As you climb, the ground drops away below the screen while the horizon sinks only slowly, so
 * in a true projection the visible strip of floor lies ever further off: its cells shrink, the
 * lines crowd into a fine mesh with a bare band under the horizon, and high up the floor is a
 * sliver holding thousands of converging lines (frames of several seconds, near level 160). So
 * the floor follows the true projection only until its bottom edge is this deep, and from there
 * on keeps that perspective: the same grid, the same number of lines, squeezed into whatever
 * strip of floor still shows. (By then the props planted on it stand at the bottom edge; they
 * keep the true projection, so they slide off the screen over the steady grid a few levels on.)
 */
const FLOOR_Z_MAX = 1.6;

/** Depth between the floor's cross lines, how fast they stream toward you (depth per second),
 *  and the farthest one drawn. */
const ROW_SPACING = 0.5;
const ROW_SPEED = 0.35;
const ROW_FAR = 80;
/** Grid cell width at the tower's depth (u). */
const CELL = 0.12;

/** Scratch result of `floorGrid` (no per-frame allocation): room for every cross line up to ROW_FAR. */
const GRID = {
  /** Screen y of each cross line, near to far, and how many there are. */
  rows: new Float64Array(Math.ceil(ROW_FAR / ROW_SPACING) + 2),
  count: 0,
  /** Spacing of the lines running to the vanishing point, at the bottom edge (px), and how many
   *  there are each side of the middle one. */
  xStep: 0,
  cols: 0,
  /** Depth at the bottom edge. */
  zNear: 0,
};

/** The floor grid's lines for a scene (empty when the floor is below the screen). */
export function floorGrid(s: Scene): typeof GRID {
  const hy = s.horizonY;
  GRID.count = 0;
  GRID.cols = 0;
  if (hy >= s.cssH) return GRID;
  // Projection: a floor line at depth z sits at  hy + H / z.  The tower stands at depth ZT,
  // so H grows as the ground drops below the horizon while you climb (lines spread out), up to
  // where the bottom edge is FLOOR_Z_MAX deep.
  const band = s.cssH - hy;
  const H = Math.min(Math.max(s.u * 0.05, (s.groundY - hy) * ZT), FLOOR_Z_MAX * band);
  const zNear = H / band;
  const scroll = (s.t * ROW_SPEED) % ROW_SPACING;
  for (let z = Math.ceil(zNear / ROW_SPACING) * ROW_SPACING - scroll; z < ROW_FAR; z += ROW_SPACING) {
    if (z <= zNear * 0.98) continue;
    const y = hy + H / z;
    if (y - hy < 1.5) break;
    GRID.rows[GRID.count++] = y;
  }
  // Spacing of the lines to the vanishing point at the bottom edge: at least CELL * ZT / FLOOR_Z_MAX.
  GRID.xStep = (CELL * s.u * ZT) / zNear;
  GRID.cols = Math.ceil(s.cssW / 2 / GRID.xStep) + 2;
  GRID.zNear = zNear;
  return GRID;
}

/** Perspective neon grid from the horizon to the bottom of the screen, scrolling toward you. */
function floor(ctx: Ctx, s: Scene, skin: NeonSkin): void {
  const hy = s.horizonY;
  if (hy >= s.cssH) return;
  const p = skin.palette;
  const fill = ctx.createLinearGradient(0, hy, 0, s.cssH);
  fill.addColorStop(0, p.floorFar);
  fill.addColorStop(1, p.floorNear);
  ctx.fillStyle = fill;
  ctx.fillRect(0, hy, s.cssW, s.cssH - hy);

  const grid = floorGrid(s);
  const vx = s.cssW / 2;
  ctx.beginPath();
  for (let i = 0; i < grid.count; i++) {
    ctx.moveTo(0, grid.rows[i]!);
    ctx.lineTo(s.cssW, grid.rows[i]!);
  }
  for (let j = -grid.cols; j <= grid.cols; j++) {
    ctx.moveTo(vx, hy);
    ctx.lineTo(vx + j * grid.xStep, s.cssH);
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

/** Everything behind the tower, neon style. */
export function drawNeonWorld(ctx: Ctx, s: Scene, skin: NeonSkin): void {
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
export function drawNeonForeground(ctx: Ctx, s: Scene, skin: NeonSkin): void {
  skin.foreground?.(ctx, s);
}

/** Scanlines and a vignette over the whole scene (under the HUD). */
function paintPost(ctx: Ctx | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.09)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  v.addColorStop(0, "rgba(0, 0, 0, 0)");
  v.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** The post pass only changes with the screen size, so the browser paints it once per size. */
let postCache: { key: string; image: OffscreenCanvas } | null = null;

export function drawNeonPost(ctx: Ctx, s: Scene): void {
  // Offline renders (npm run snap, tests) have no OffscreenCanvas: paint directly.
  if (typeof OffscreenCanvas === "undefined") {
    paintPost(ctx, s.cssW, s.cssH);
    return;
  }
  const scale = ctx.getTransform().a;
  const dw = Math.max(1, Math.round(s.cssW * scale));
  const dh = Math.max(1, Math.round(s.cssH * scale));
  // Keyed by the device pixels it covers: Hard's zoom changes the virtual screen and the transform
  // together every frame it eases, but not what lands on the screen.
  const key = `${dw}x${dh}`;
  if (postCache?.key !== key) {
    const image = new OffscreenCanvas(dw, dh);
    const g = image.getContext("2d")!;
    g.scale(scale, scale);
    paintPost(g, s.cssW, s.cssH);
    postCache = { key, image };
  }
  ctx.drawImage(postCache.image, 0, 0, s.cssW, s.cssH);
}

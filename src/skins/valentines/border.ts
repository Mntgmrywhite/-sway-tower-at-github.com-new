import type { Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { diamond, heartLeaf, roseHeart, rosette } from "./shapes";
import type { Tone } from "./tone";

// The frame down each side of the sky, the way a Mucha panel is framed: a strip of stained glass
// at the screen's edge (panes of rose and mint, leaded, a jewel set in each), and over it a
// climbing rose winding up in long whiplash curves (a stem that swells and slims as it winds,
// tapering shoots), heart-shaped leaves, a rose and a lily bud on curving shoots, and a tendril
// curling back on itself, a fine contour in the hour's plum round its leaves and flowers. It
// repeats every tile (TILE_WORLD) up the climb, so it scrolls past seamlessly for ever (and every
// turn of the story's loop shows it the same: a whole number of tiles fits in a turn); the right
// side runs half a tile out of step with the left, so the two never mirror.
//
// It belongs to the sky: painted after the sky and the stars and before everything else, so the
// sun and the moon sit in front of it like medallions set in the frame, whatever drifts down the
// lane passes in front of it, and the cloud bank, the land and the cloud sea stand in front of
// its foot (frame.test.ts: never over the sun or the moon). It keeps to the side lanes, outside
// the playfield the slider sweeps, so well clear of the tower's column (on a phone it fills most
// of each lane), and it never moves but with the camera. Drawn by the dozen every frame, so it is
// all Béziers and straight lines in a few fills, its contours filled under its shapes rather than
// stroked.
//
// Positions are in u across, inward from the screen's edge, and in tiles up, from the tile's foot.

/** How fast the frame scrolls as the camera climbs (1 moves with the tower). */
const P = 0.5;
/** One tile of the frame, in world units of its layer (a turn of the loop, 960, is a whole number of them). */
const TILE_WORLD = 320;

/** One tile of the frame on screen (px, its height): the layer scrolls P times as fast as the tower. */
function tileH(s: Scene): number {
  return TILE_WORLD * P * s.scale;
}

/** The stained-glass strip: its width; its panes, a tile's worth, and the jewel set in each. */
const MARGIN = 0.034;
const PANES = 6;
const JEWEL = 0.009;

/** The stem's middle line (u in from the edge) and how far it swings either side of it. */
const STEM_X = 0.05;
const STEM_SWING = 0.022;

/** The stem's line across the tile: X (u in from the edge) at height Y (in tiles) up it. */
function stemX(Y: number): number {
  return STEM_X + STEM_SWING * Math.sin(Y * Math.PI * 2);
}

/** A shoot off the stem: where it leaves (Y), its two control points and its end, [X, Y]: X in u, Y in tiles. */
interface Shoot {
  from: number;
  c1: readonly [number, number];
  c2: readonly [number, number];
  to: readonly [number, number];
}

/** The rose's shoot, the tendril's and the lily bud's. */
const ROSE: Shoot = { from: 0.125, c1: [0.11, 0.125], c2: [0.125, 0.21], to: [0.112, 0.295] };
const TENDRIL: Shoot = { from: 0.5, c1: [0.08, 0.56], c2: [0.118, 0.59], to: [0.105, 0.67] };
const LILY: Shoot = { from: 0.75, c1: [0.06, 0.82], c2: [0.098, 0.83], to: [0.094, 0.9] };
const SHOOTS = [ROSE, TENDRIL, LILY] as const;
/** The tendril's curl: its radius (u). */
const CURL = 0.016;
/** The rose's radius, the bud's length (u). */
const ROSE_R = 0.032;
const BUD = 0.036;
/**
 * Heart-shaped leaves on short stalks: where on the stem (Y, in tiles), which way they reach
 * (radians: 0 inward, pi out toward the edge, pi/2 up), size (u). The ones reaching out sit where
 * the stem swings in, so none reaches the screen's edge.
 */
const LEAVES = [
  [0.05, 2.2, 0.03],
  [0.21, 2.5, 0.032],
  [0.37, 0.6, 0.03],
  [0.59, 2.3, 0.026],
  [0.7, 0.4, 0.032],
  [0.82, 0.9, 0.03],
  [0.93, 2.1, 0.026],
] as const;
/** How much bigger the contour under a shape is than the shape (its fine plum line). */
const RIM = 1.14;

/** Scratch: the visible tiles' feet on screen and sides, filled each frame (at most a few per side). */
const FEET: { y: number; side: number }[] = Array.from({ length: 24 }, () => ({ y: 0, side: 1 }));
let feet = 0;

/** Screen x of a point X u in from the edge on `side` (-1 left, 1 right). */
function sx(s: Scene, side: number, X: number): number {
  return side < 0 ? X * s.u : s.cssW - X * s.u;
}

/** Note the tiles that show above `bottom` (down to which the sky is seen). */
function placeTiles(s: Scene, bottom: number): void {
  const tile = tileH(s);
  const ground = layerGround(s, P);
  feet = 0;
  for (let side = -1; side <= 1; side += 2) {
    const shift = side < 0 ? 0 : tile / 2;
    // A tile's foot is at ground - n * tile - shift; it reaches up to one tile above that.
    const nLo = Math.floor((ground - shift - bottom - tile * 0.1) / tile);
    const nHi = Math.ceil((ground - shift + tile * 0.1) / tile);
    for (let n = nLo; n <= nHi && feet < FEET.length; n++) {
      const y = ground - shift - n * tile;
      if (y - tile > bottom || y < -tile * 0.1) continue;
      const f = FEET[feet++]!;
      f.y = y;
      f.side = side;
    }
  }
}

/**
 * The strips of stained glass: panes of rose and mint by turns (translucent over the sky), the
 * leading between them. (Their jewels are set with the roses.)
 */
function margins(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const m = MARGIN * u;
  const pane = tileH(s) / PANES;
  const colors = [tone.paneRose, tone.paneMint];
  for (let c = 0; c < colors.length; c++) {
    ctx.beginPath();
    for (let i = 0; i < feet; i++) {
      const { y, side } = FEET[i]!;
      const x = side < 0 ? 0 : s.cssW - m;
      for (let k = 0; k < PANES; k++) if ((k + (side < 0 ? 0 : 1)) % colors.length === c) ctx.rect(x, y - (k + 1) * pane, m, pane);
    }
    ctx.fillStyle = colors[c]!;
    ctx.fill();
  }
  // The leading between the panes.
  const lead = Math.max(1, u * 0.0035);
  ctx.beginPath();
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    const x = side < 0 ? 0 : s.cssW - m;
    for (let k = 0; k < PANES; k++) ctx.rect(x, y - k * pane - lead / 2, m, lead);
  }
  ctx.fillStyle = tone.rule;
  ctx.fill();
}

/** The jewel set in each pane, as subpaths. */
function jewels(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const m = MARGIN * u;
  const pane = tileH(s) / PANES;
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    const x = side < 0 ? m / 2 : s.cssW - m / 2;
    for (let k = 0; k < PANES; k++) diamond(ctx, x, y - (k + 0.5) * pane, JEWEL * u);
  }
}

/**
 * The stem of every noted tile as a ribbon w wide (continues the path): each tile's wave in two
 * Béziers up its one side and back down the other, out and back across the stem's middle line,
 * so it is widest where it runs straight up and slimmer where it slants. The tiles' ribbons meet
 * (each runs a pixel into the next).
 */
function stems(ctx: Ctx, s: Scene, w: number): void {
  const half = tileH(s) / 2;
  // A half wave from the stem's middle line out to one side and back, as one cubic: its control
  // points a third of the way along, pulled out a little past the swing (a close fit to the sine).
  const pull = STEM_SWING * (4 / 3) * 1.18;
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    // Up the stem's one edge, out (the first half wave) and back (the second)...
    let mid = sx(s, side, STEM_X) - w / 2;
    let out = sx(s, side, STEM_X + pull) - w / 2;
    let back = sx(s, side, STEM_X - pull) - w / 2;
    ctx.moveTo(mid, y + 1);
    ctx.bezierCurveTo(out, y - half / 3, out, y - (half * 2) / 3, mid, y - half);
    ctx.bezierCurveTo(back, y - (half * 4) / 3, back, y - (half * 5) / 3, mid, y - half * 2 - 1);
    // ...and down its other edge.
    mid += w;
    out += w;
    back += w;
    ctx.lineTo(mid, y - half * 2 - 1);
    ctx.bezierCurveTo(back, y - (half * 5) / 3, back, y - (half * 4) / 3, mid, y - half);
    ctx.bezierCurveTo(out, y - (half * 2) / 3, out, y - half / 3, mid, y + 1);
    ctx.closePath();
  }
}

/**
 * The shoots of every noted tile, as tapering ribbons (continues the path): `w0` wide where they
 * leave the stem, `w1` at their ends. Each edge is the shoot's Bézier moved out along the normals
 * at its two ends.
 */
function shoots(ctx: Ctx, s: Scene, w0: number, w1: number): void {
  const t = tileH(s);
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    for (const sh of SHOOTS) {
      const x0 = sx(s, side, stemX(sh.from));
      const y0 = y - sh.from * t;
      const c1x = sx(s, side, sh.c1[0]);
      const c1y = y - sh.c1[1] * t;
      const c2x = sx(s, side, sh.c2[0]);
      const c2y = y - sh.c2[1] * t;
      const x1 = sx(s, side, sh.to[0]);
      const y1 = y - sh.to[1] * t;
      // The unit normals at the start and the end.
      let l = Math.hypot(c1x - x0, c1y - y0) || 1;
      const n0x = -(c1y - y0) / l;
      const n0y = (c1x - x0) / l;
      l = Math.hypot(x1 - c2x, y1 - c2y) || 1;
      const n1x = -(y1 - c2y) / l;
      const n1y = (x1 - c2x) / l;
      const a = w0 / 2;
      const b = w1 / 2;
      ctx.moveTo(x0 + n0x * a, y0 + n0y * a);
      ctx.bezierCurveTo(c1x + n0x * a, c1y + n0y * a, c2x + n1x * b, c2y + n1y * b, x1 + n1x * b, y1 + n1y * b);
      ctx.lineTo(x1 - n1x * b, y1 - n1y * b);
      ctx.bezierCurveTo(c2x - n1x * b, c2y - n1y * b, c1x - n0x * a, c1y - n0y * a, x0 - n0x * a, y0 - n0y * a);
      ctx.closePath();
    }
  }
}

/** The tendrils' curls, from the tendril shoots' ends on up and over toward the tower's side, down and round, narrowing (continues the path). */
function curls(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const c = CURL;
  const Xe = TENDRIL.to[0];
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    // (From the shoot's end, in u from here on.)
    const ye = y - TENDRIL.to[1] * tileH(s);
    ctx.moveTo(sx(s, side, Xe), ye);
    ctx.quadraticCurveTo(sx(s, side, Xe), ye - c * 1.1 * u, sx(s, side, Xe + c), ye - c * 1.1 * u);
    ctx.quadraticCurveTo(sx(s, side, Xe + c * 2.1), ye - c * u, sx(s, side, Xe + c * 1.7), ye + c * 0.1 * u);
    ctx.quadraticCurveTo(sx(s, side, Xe + c * 1.2), ye + c * 0.45 * u, sx(s, side, Xe + c * 0.95), ye - c * 0.2 * u);
  }
}

/** Every leaf of every noted tile: a heart on a short stalk, `k` times its size about its middle (continues the path). */
function leaves(ctx: Ctx, s: Scene, k: number): void {
  const u = s.u;
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    for (const [Y, a, size] of LEAVES) {
      const dx = Math.cos(a) * -side;
      const dy = -Math.sin(a);
      // The leaf runs from a quarter of its size off the stem; grown about its middle.
      const back = size * u * (0.25 + 0.55 * (1 - k));
      heartLeaf(ctx, sx(s, side, stemX(Y)) + dx * back, y - Y * tileH(s) + dy * back, size * u * k, dx, dy);
    }
  }
}

/** The roses at the rose shoots' ends, `k` times their size, turned by `rot` (continues the path). */
function roses(ctx: Ctx, s: Scene, k: number, rot: number): void {
  const u = s.u;
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    rosette(ctx, sx(s, side, ROSE.to[0]), y - ROSE.to[1] * tileH(s) - ROSE_R * u * 0.6, ROSE_R * u * k, rot);
  }
}

/** The lily buds at the lily shoots' ends: a slim pointed bud (`tip`: just its blush tip), `k` times its size (continues the path). */
function buds(ctx: Ctx, s: Scene, k: number, tip: boolean): void {
  const u = s.u;
  const L = BUD * u * k;
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    const x = sx(s, side, LILY.to[0]);
    const by = y - LILY.to[1] * tileH(s) + (k - 1) * BUD * u * 0.3;
    // Leaning a little outward from the shoot's end, its tip up.
    const tx = x + side * u * 0.006;
    if (!tip) {
      ctx.moveTo(x, by);
      ctx.bezierCurveTo(x - L * 0.42, by - L * 0.3, tx - L * 0.12, by - L * 0.8, tx, by - L);
      ctx.bezierCurveTo(tx + L * 0.12, by - L * 0.8, x + L * 0.42, by - L * 0.3, x, by);
    } else {
      ctx.moveTo(tx, by - L);
      ctx.bezierCurveTo(tx - L * 0.1, by - L * 0.8, tx - L * 0.14, by - L * 0.62, tx - L * 0.02, by - L * 0.55);
      ctx.bezierCurveTo(tx + L * 0.12, by - L * 0.62, tx + L * 0.1, by - L * 0.8, tx, by - L);
    }
    ctx.closePath();
  }
}

/**
 * The frame down both sides of the sky, from the top of the screen down to `bottom` (where the
 * land or the cloud sea covers the sky). The contours of its leaves, roses and buds are one fill
 * under them (each a little bigger); the stem and its shoots are ribbons in the deeper vine green.
 */
export function frame(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const h = Math.min(s.cssH, bottom);
  if (h <= 0) return;
  placeTiles(s, h);
  margins(ctx, s, tone);
  if (feet === 0) return;
  const lw = Math.max(0.8, u * 0.0028);
  const stem = u * 0.009;
  const shoot = u * 0.006;
  const tip = u * 0.0025;
  // The contour under the leaves, the roses and the buds.
  ctx.beginPath();
  leaves(ctx, s, RIM);
  roses(ctx, s, RIM, 0);
  buds(ctx, s, RIM, false);
  ctx.fillStyle = tone.vineLine;
  ctx.fill();
  // The stem and the shoots, then the leaves.
  ctx.beginPath();
  stems(ctx, s, stem);
  shoots(ctx, s, shoot, tip);
  ctx.fillStyle = tone.vine;
  ctx.fill();
  ctx.beginPath();
  leaves(ctx, s, 1);
  ctx.fillStyle = tone.vineLeaf;
  ctx.fill();
  // The roses (and the bud's blush tips and the panes' jewels in the same pink), their cups of deeper petals, the buds.
  ctx.beginPath();
  roses(ctx, s, 1, 0);
  buds(ctx, s, 1, true);
  jewels(ctx, s);
  ctx.fillStyle = tone.bloom;
  ctx.fill();
  ctx.beginPath();
  roses(ctx, s, 0.55, Math.PI / 5);
  ctx.fillStyle = tone.bloomDeep;
  ctx.fill();
  ctx.beginPath();
  buds(ctx, s, 1, false);
  ctx.fillStyle = tone.bud;
  ctx.fill();
  // The fine lines: the curl at each rose's heart, the tendrils' curls.
  ctx.beginPath();
  for (let i = 0; i < feet; i++) {
    const { y, side } = FEET[i]!;
    roseHeart(ctx, sx(s, side, ROSE.to[0]), y - ROSE.to[1] * tileH(s) - ROSE_R * u * 0.6, ROSE_R * u);
  }
  curls(ctx, s);
  ctx.strokeStyle = tone.vineLine;
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = "round";
  ctx.stroke();
  // (Back to the canvas's default, so the round caps don't leak into the medallions' rings.)
  ctx.lineCap = "butt";
}

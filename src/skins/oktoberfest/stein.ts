import { circle, ink, oval, type Ctx } from "../../base/draw";
import { AMBER, BARREL, FOAM, FOAM_SHADE, GLASS, INK, IRON } from "./colors";
import { block } from "./shapes";

// The festival's steins and barrels, near and inked, in screen pixels. A stein is the big
// dimpled glass mug of the beer tents: golden beer to the rim, a thick clear handle, and a white
// head of foam heaped over the top (about a third of the glass's height again) with a drip
// running down the front. The barrels ride on the parade's wagon, lying along it: honey oak
// staves bowing out between flat heads, bound with iron hoops. Cheerful scenery (the owner's 12+
// rating), always on a tray, a table, a counter or a wagon: nobody drinks. Nothing here allocates.

/** A stein's width, as a share of its glass's height. */
export const STEIN_W = 0.64;
/** The glass height (px) from which a stein shows its dimples and the foam's shading. */
const DETAIL = 11;

/**
 * A row of `n` steins standing on `foot`, the first centered at x and each next one `step`
 * further on (step at least a stein's width plus its foam's overhang, so no two glasses touch),
 * each glass `h` tall (the foam heaps about h / 3 higher), the handles on the side `m`
 * points to (+1 right, -1 left). A handle reaching toward the next stein tucks behind it. Every
 * part of the row goes in one fill or stroke, whatever n is.
 */
export function steins(ctx: Ctx, x: number, step: number, n: number, foot: number, h: number, lw: number, m = 1): void {
  const w = h * STEIN_W;
  const top = foot - h;
  // The handles: thick loops of clear glass, first, so the glasses' outlines cap their ends.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = x + i * step;
    ctx.moveTo(c + m * w * 0.36, top + h * 0.22);
    ctx.bezierCurveTo(c + m * w * 1.0, top + h * 0.12, c + m * w * 1.0, top + h * 0.82, c + m * w * 0.36, top + h * 0.74);
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = h * 0.15 + lw * 1.4;
  ctx.stroke();
  ctx.strokeStyle = GLASS;
  ctx.lineWidth = h * 0.15;
  ctx.stroke();
  // The glasses, full of beer: shaded down the right, lit down the left, a thick clear foot.
  ctx.beginPath();
  for (let i = 0; i < n; i++) block(ctx, x + i * step - w / 2, top, w, h, h * 0.1);
  ctx.fillStyle = AMBER.body;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(x + i * step + w * 0.22, top + h * 0.08, w * 0.2, h * 0.78);
  ctx.fillStyle = AMBER.shade;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = x + i * step - w / 2;
    ctx.rect(l + w * 0.13, top + h * 0.13, w * 0.13, h * 0.62);
    ctx.rect(l + w * 0.08, foot - h * 0.16, w * 0.84, h * 0.09);
  }
  ctx.fillStyle = GLASS;
  ctx.fill();
  // The dimples, two rows of little lit ovals (too small to show on a little stein).
  const fine = h >= DETAIL;
  if (fine) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) oval(ctx, x + i * step - w * 0.02 + c * w * 0.22, top + h * (0.34 + r * 0.26), w * 0.075, h * 0.09);
      }
    }
    ctx.fillStyle = AMBER.light;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) block(ctx, x + i * step - w / 2, top, w, h, h * 0.1);
  ink(ctx, lw * 0.8, INK);
  // The heads of foam heaped over the rims, a drip down each front: inked twice as wide, then
  // filled over, so only their outer edges keep the ink; a shaded underside.
  ctx.beginPath();
  for (let i = 0; i < n; i++) foamPath(ctx, x + i * step - w / 2, top, w, h);
  ink(ctx, lw * 1.4, INK);
  ctx.fillStyle = FOAM;
  ctx.fill();
  if (!fine) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) oval(ctx, x + i * step + w * 0.12, top + h * 0.02, w * 0.3, h * 0.045);
  ctx.fillStyle = FOAM_SHADE;
  ctx.fill();
}

/** The foam's puffs over a stein's rim (left edge l, rim at top, w wide, glass h tall), each its own subpath. */
function foamPath(ctx: Ctx, l: number, top: number, w: number, h: number): void {
  block(ctx, l - w * 0.06, top - h * 0.09, w * 1.12, h * 0.16, h * 0.08);
  circle(ctx, l + w * 0.2, top - h * 0.1, h * 0.15);
  circle(ctx, l + w * 0.52, top - h * 0.14, h * 0.17);
  circle(ctx, l + w * 0.82, top - h * 0.08, h * 0.13);
  oval(ctx, l + w * 0.3, top + h * 0.1, h * 0.06, h * 0.11);
}

/** A barrel's outline lying along: flat heads at the ends, its staves bowing out top and bottom by `bulge`. */
function barrelPath(ctx: Ctx, x: number, y: number, w: number, h: number, bulge: number): void {
  const r = h * 0.12;
  ctx.moveTo(x, y + bulge + r);
  ctx.quadraticCurveTo(x, y + bulge, x + r, y + bulge * 0.7);
  ctx.quadraticCurveTo(x + w / 2, y - bulge * 0.9, x + w - r, y + bulge * 0.7);
  ctx.quadraticCurveTo(x + w, y + bulge, x + w, y + bulge + r);
  ctx.lineTo(x + w, y + h - bulge - r);
  ctx.quadraticCurveTo(x + w, y + h - bulge, x + w - r, y + h - bulge * 0.7);
  ctx.quadraticCurveTo(x + w / 2, y + h + bulge * 0.9, x + r, y + h - bulge * 0.7);
  ctx.quadraticCurveTo(x, y + h - bulge, x, y + h - bulge - r);
  ctx.closePath();
}

/** Where a barrel's hoops are, as shares of its length. */
const HOOPS = [0.1, 0.22, 0.78, 0.9] as const;

/**
 * A row of `n` barrels lying along the wagon, the first in the box from (x, y), each next one
 * `step` further on (no two touching), each w long and h high: honey oak staves bowing out
 * between their flat heads, lit along the top, shaded underneath, the staves' seams curving with
 * them, four iron hoops, a bung in each belly. Every part of the row goes in one fill or stroke.
 */
export function barrels(ctx: Ctx, lw: number, x: number, step: number, n: number, y: number, w: number, h: number): void {
  const bulge = h * 0.12;
  ctx.beginPath();
  for (let i = 0; i < n; i++) barrelPath(ctx, x + i * step, y, w, h, bulge);
  ctx.fillStyle = BARREL.body;
  ctx.fill();
  // Lit along the top, shaded underneath: bands that bow with the staves (inside the outline: no clip).
  ctx.fillStyle = BARREL.light;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = x + i * step;
    ctx.moveTo(l + w * 0.06, y + bulge * 1.2);
    ctx.quadraticCurveTo(l + w / 2, y - bulge * 0.4, l + w * 0.94, y + bulge * 1.2);
    ctx.lineTo(l + w * 0.94, y + h * 0.3);
    ctx.quadraticCurveTo(l + w / 2, y + h * 0.3 - bulge * 1.6, l + w * 0.06, y + h * 0.3);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = BARREL.shade;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = x + i * step;
    ctx.moveTo(l + w * 0.04, y + h * 0.76);
    ctx.quadraticCurveTo(l + w / 2, y + h * 0.76 + bulge * 1.6, l + w * 0.96, y + h * 0.76);
    ctx.lineTo(l + w * 0.96, y + h - bulge * 1.4);
    ctx.quadraticCurveTo(l + w / 2, y + h + bulge * 0.4, l + w * 0.04, y + h - bulge * 1.4);
    ctx.closePath();
  }
  ctx.fill();
  // The staves' seams, bowing with them.
  ctx.strokeStyle = BARREL.shade;
  ctx.lineWidth = Math.max(0.8, h * 0.035);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = x + i * step;
    for (let k = 1; k < 3; k++) {
      const sy = y + (h * k) / 3;
      const bow = (bulge * 1.4 * (k * 2 - 3)) / 3;
      ctx.moveTo(l + w * 0.03, sy);
      ctx.quadraticCurveTo(l + w / 2, sy + bow, l + w * 0.97, sy);
    }
  }
  ctx.stroke();
  // The hoops: two near each head, thin bands of iron from stave to stave.
  ctx.strokeStyle = IRON.body;
  ctx.lineWidth = Math.max(1, h * 0.075);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    for (const k of HOOPS) {
      // The staves' edge here (the outline's curve between the heads' rounded corners).
      const edge = bulge * (0.7 - 3.2 * k * (1 - k));
      ctx.moveTo(x + i * step + w * k, y + edge);
      ctx.lineTo(x + i * step + w * k, y + h - edge);
    }
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < n; i++) barrelPath(ctx, x + i * step, y, w, h, bulge);
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < n; i++) circle(ctx, x + i * step + w * 0.5, y + h * 0.5, h * 0.08);
  ctx.fillStyle = IRON.shade;
  ctx.fill();
}

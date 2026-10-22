import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  ALUMINUM,
  BALLOON,
  BLOOMS,
  BRICK_WALK,
  CREAM,
  CURB,
  GINGHAM,
  GLINT,
  GOLD,
  HOOP,
  INK,
  JAR,
  LAWN,
  LAWN_LIGHT,
  LAWN_SHADE,
  LEAVES,
  LEAVES_LIGHT,
  LEMONADE,
  MORTAR,
  NAVY,
  PICKET,
  RED,
  STAVE,
  TABLE,
  WICKER,
} from "./colors";
import { dadInChair, picnicFamily, pitcherAt, pourAt, vendor, vendorHand } from "./cast";
import { breeze } from "./life";
import { dot, swagBand } from "./shapes";
import { bands, wash } from "./paint";
import { ROUTE } from "./parade";
import { LAWN_P, sidewalkTop } from "./square";

// The near edge we look over, a picnic lawn along the parade route: the brick sidewalk the
// parade's crowd stands on, a granite curb, and the lush picnic grass in front of it, where the
// town has set out its Fourth: on the left a red gingham blanket with a wicker picnic basket, a
// striped lawn chair, a little roadside sign on its stake, a flower bed with pinwheels spinning in
// it; on the right the lemonade stand under its striped canopy, its pitcher and glasses on the
// counter and a bunch of balloons tied to its canopy, bobbing and tugging (now and then one slips
// free and floats up the right side of the square, shrinking as it goes, gone before it reaches
// the tower's floor), a wooden barrel planted with flowers and a wagon wheel leaning on it. Along
// the bottom, the white picket fence we stand behind, swagged with red, white and blue bunting
// from post to post. Petals drift across in the breeze. The middle stays plain, so "tap to drop"
// reads (render.ts writes it at 0.9 of the screen's height). Everything keeps inside the band
// (below the sidewalk's top), so nothing here ever stands in front of the parade, and it all
// drops away faster than the tower as the camera climbs (parallax 1.6, like the base band), so
// it only frames the start.
//
// The picnic's folk are cast.ts's: dad in the lawn chair, mom and their little girl on the
// blanket, the girl who keeps the lemonade stand behind its counter.
//
// Positions are in u from the screen's center (X), depths in u below the sidewalk's top.

/** The sidewalk's depth (u), the curb's, and how far above its line the sidewalk is laid (over the base band's grass tips). */
const SIDEWALK_H = 0.05;
const CURB_H = 0.012;
const OVER = 0.012;

/** Where the picnic things are (X, u from center), and how deep below the band's top they stand (u, at most: a short band brings them up). */
export const BLANKET_X = -0.34;
export const STAND_X = 0.35;
/** The middle is kept plain grass out to this far (u) for "tap to drop". */
const PLAIN = 0.17;
/** The most anything on the lawn rises over the band's top (u): the lemonade stand's balloons. */
const THINGS_UP = 0.06;

/** The band's top (px): the sidewalk's top edge. */
function bandTop(s: Scene): number {
  return sidewalkTop(s);
}

/** Where the band's top stands before the camera climbs (px); from there it drops away at LAWN_P. */
function restTop(s: Scene, top: number): number {
  return top - s.rise * LAWN_P;
}

/**
 * Where a thing on the lawn stands (px): `d` u below the band's top, but kept `keep` u above the
 * screen's bottom, and with its lowest point (`low` u below where it stands) clear of the picket
 * fence along the bottom. Worked out where the lawn stands before the camera climbs, so
 * everything on it rides down with the lawn as it drops away (never left hanging on the screen).
 */
function depth(s: Scene, top: number, d: number, keep: number, low = 0): number {
  const u = s.u;
  const top0 = restTop(s, top);
  const room = Math.min(s.cssH - keep * u, fenceTop(s, top0) - (low + FENCE_CLEAR) * u) - top0;
  return top + Math.min(d * u, room);
}

/** The sidewalk, the curb and the picnic grass. */
function ground(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const curbY = top + SIDEWALK_H * u;
  // The grass under everything from the curb down.
  bands(ctx, "picnic", 0, s.cssW, curbY, curbY + u * 0.4, [LAWN_LIGHT, LAWN, LAWN_SHADE], [0, 0.35, 1], 4);
  if (curbY + u * 0.4 < s.cssH) {
    ctx.fillStyle = LAWN_SHADE;
    ctx.fillRect(0, curbY + u * 0.4, s.cssW, s.cssH - curbY - u * 0.4);
  }
  // Tufts and soft light patches in the grass, away from the plain middle.
  ctx.fillStyle = LAWN_LIGHT;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  const cx = s.cssW / 2;
  for (let i = 0; i < 14; i++) {
    const X = (hash(i + 8300) - 0.5) * 1.2;
    if (Math.abs(X) < PLAIN + 0.04) continue;
    const y = curbY + u * (0.03 + hash(i + 8310) * 0.3);
    if (y > s.cssH) continue;
    oval(ctx, cx + X * u, y, u * (0.03 + hash(i + 8320) * 0.03), u * 0.008);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // The brick sidewalk, laid from a little above its line, with its courses and joints.
  bands(ctx, "sidewalk", 0, s.cssW, top - OVER * u, curbY + 1, [BRICK_WALK.light, BRICK_WALK.body], [0, 1], 4);
  // The mortar: the courses and the joints as thin bands in one fill (cheaper than a stroke of them all).
  ctx.fillStyle = MORTAR;
  ctx.globalAlpha = 0.55;
  const mw = Math.max(0.8, u * 0.0022);
  ctx.beginPath();
  const rows = 3;
  const rh = (curbY - top + OVER * u) / rows;
  for (let r = 1; r < rows; r++) ctx.rect(0, top - OVER * u + r * rh - mw / 2, s.cssW, mw);
  const bw = u * 0.05;
  for (let r = 0; r < rows; r++) {
    const y0 = top - OVER * u + r * rh;
    for (let x = ((s.cssW / 2) % bw) - bw + (r % 2) * bw * 0.5; x < s.cssW; x += bw) ctx.rect(x - mw / 2, y0, mw, rh);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // The granite curb and its shadow on the grass.
  ctx.fillStyle = CURB.light;
  ctx.fillRect(0, curbY, s.cssW, CURB_H * u);
  ctx.fillStyle = CURB.shade;
  ctx.fillRect(0, curbY + CURB_H * u * 0.6, s.cssW, CURB_H * u * 0.4);
  ctx.fillStyle = LAWN_SHADE;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, curbY + CURB_H * u, s.cssW, u * 0.008);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the picnic, on the left

/** The blanket's depth from its far edge to its near one (u). */
const BLANKET_D = 0.06;

/** The gingham blanket in perspective: its near and far edges' half widths and its depth (u), and the basket on it. */
function blanket(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const kw = Math.max(1, u * 0.003);
  const cx = s.cssW / 2 + BLANKET_X * u;
  const y0 = depth(s, top, 0.13, 0.08, BLANKET_D);
  const y1 = y0 + u * BLANKET_D;
  const far = u * 0.1;
  const near = u * 0.125;
  const skew = u * 0.012;
  const corner = (k: number, side: number) => {
    const y = y0 + (y1 - y0) * k;
    const hw = far + (near - far) * k;
    return [cx + side * hw + skew * (1 - k), y] as const;
  };
  ctx.beginPath();
  const [ax, ay] = corner(0, -1);
  const [bx, by] = corner(0, 1);
  const [cx1, cy] = corner(1, 1);
  const [dx, dy] = corner(1, -1);
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx1, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ink(ctx, kw, INK);
  // Gingham: red bands across and along, see-through, so they cross darker.
  ctx.fillStyle = GINGHAM;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  const n = 6;
  for (let i = 0; i < n; i += 1) {
    const k0 = (i + 0.25) / n;
    const k1 = (i + 0.75) / n;
    const [p0x, p0y] = corner(k0, -1);
    const [p1x, p1y] = corner(k0, 1);
    const [p2x, p2y] = corner(k1, 1);
    const [p3x, p3y] = corner(k1, -1);
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.closePath();
  }
  const m = 8;
  for (let j = 0; j < m; j++) {
    const a = (j + 0.25) / m;
    const b = (j + 0.75) / m;
    const lerp = (p: readonly [number, number], q: readonly [number, number], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] as const;
    const f0 = lerp([ax, ay], [bx, by], a);
    const f1 = lerp([ax, ay], [bx, by], b);
    const n1 = lerp([dx, dy], [cx1, cy], b);
    const n0 = lerp([dx, dy], [cx1, cy], a);
    ctx.moveTo(f0[0], f0[1]);
    ctx.lineTo(f1[0], f1[1]);
    ctx.lineTo(n1[0], n1[1]);
    ctx.lineTo(n0[0], n0[1]);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  // Mom and their little girl on it.
  picnicFamily(ctx, s, cx - u * 0.008, y0 + u * 0.032, cx + u * 0.058, y0 + u * 0.014);
  // The wicker basket on its near left corner: a body in a golden wash, its weave, a lid and a handle.
  const kx = cx - u * 0.074;
  const ky = y0 + u * 0.035;
  const bw = u * 0.034;
  const bh = u * 0.026;
  ctx.beginPath();
  ctx.moveTo(kx - bw, ky - bh);
  ctx.lineTo(kx + bw, ky - bh);
  ctx.lineTo(kx + bw * 0.86, ky);
  ctx.lineTo(kx - bw * 0.86, ky);
  ctx.closePath();
  ctx.fillStyle = wash(ctx, ky - bh, ky, [WICKER.light, WICKER.body, WICKER.shade]);
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.strokeStyle = WICKER.shade;
  ctx.lineWidth = Math.max(0.6, u * 0.0016);
  ctx.beginPath();
  for (let k = 0.3; k < 1; k += 0.3) {
    ctx.moveTo(kx - bw * (1 - 0.14 * k), ky - bh * (1 - k));
    ctx.lineTo(kx + bw * (1 - 0.14 * k), ky - bh * (1 - k));
  }
  ctx.stroke();
  // The red-checked cloth peeking out, the lid, the handle.
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(kx - bw * 0.6, ky - bh);
  ctx.quadraticCurveTo(kx - bw * 0.3, ky - bh * 1.5, kx + bw * 0.1, ky - bh);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.rect(kx - bw * 1.05, ky - bh - u * 0.006, bw * 2.1, u * 0.007);
  ctx.fillStyle = WICKER.light;
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.beginPath();
  ctx.moveTo(kx - bw * 0.7, ky - bh - u * 0.006);
  ctx.quadraticCurveTo(kx, ky - bh - u * 0.04, kx + bw * 0.7, ky - bh - u * 0.006);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, u * 0.0062);
  ctx.stroke();
  ctx.strokeStyle = WICKER.body;
  ctx.lineWidth = Math.max(1, u * 0.0036);
  ctx.stroke();
}

/** The lawn chair's half width with its sitter (u), and the room the flower bed by the left edge takes with its pinwheels (u). */
const CHAIR_HW = 0.04;
const BED_W = 0.085;

/** The striped lawn chair behind the blanket, facing the parade: its frame, seat and back webbed red, cream and blue. */
function lawnChair(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const kw = Math.max(1, u * 0.003);
  const x = s.cssW / 2 + (BLANKET_X - 0.1) * u;
  const foot = depth(s, top, 0.12, 0.08);
  const sh = u * 0.05;
  // The back, leaning back, then the seat; each webbed in bands.
  const back = (k0: number, k1: number) => {
    ctx.moveTo(x - u * 0.022 + k0 * u * 0.044, foot - sh * 0.55);
    ctx.lineTo(x - u * 0.022 + k1 * u * 0.044, foot - sh * 0.55);
    ctx.lineTo(x - u * 0.016 + k1 * u * 0.044, foot - sh * 1.35);
    ctx.lineTo(x - u * 0.016 + k0 * u * 0.044, foot - sh * 1.35);
    ctx.closePath();
  };
  const inks = [RED, CREAM, NAVY];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = inks[c]!;
    ctx.beginPath();
    for (let j = c; j < 6; j += 3) back(j / 6, (j + 1) / 6);
    ctx.fill();
  }
  ctx.beginPath();
  back(0, 1);
  ink(ctx, kw, INK);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.024, foot - sh * 0.55);
  ctx.lineTo(x + u * 0.026, foot - sh * 0.55);
  ctx.lineTo(x + u * 0.032, foot - sh * 0.4);
  ctx.lineTo(x - u * 0.018, foot - sh * 0.4);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ink(ctx, kw, INK);
  // The aluminum frame: legs crossed under the seat.
  ctx.strokeStyle = ALUMINUM;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - u * 0.02, foot);
  ctx.lineTo(x + u * 0.028, foot - sh * 0.48);
  ctx.moveTo(x + u * 0.028, foot);
  ctx.lineTo(x - u * 0.02, foot - sh * 0.48);
  ctx.stroke();
  // Dad, sitting in it.
  dadInChair(ctx, s, x + u * 0.002, foot - u * 0.004, sh * 0.45);
}

/** The little roadside sign on its stake: a cream board with a red arrow pointing along the parade route and a blue star. */
function sign(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const kw = Math.max(1, u * 0.003);
  const x = s.cssW / 2 - 0.2 * u;
  const foot = depth(s, top, 0.115, 0.07);
  const bw = u * 0.04;
  const bh = u * 0.022;
  const by = foot - u * 0.06;
  ctx.fillStyle = TABLE.body;
  ctx.fillRect(x - u * 0.0025, by, u * 0.005, foot - by);
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, by - bh);
  ctx.lineTo(x + bw / 2, by - bh);
  ctx.lineTo(x + bw / 2 + u * 0.008, by - bh / 2);
  ctx.lineTo(x + bw / 2, by);
  ctx.lineTo(x - bw / 2, by);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.1, by - bh * 0.62);
  ctx.lineTo(x + bw * 0.22, by - bh * 0.62);
  ctx.lineTo(x + bw * 0.22, by - bh * 0.8);
  ctx.lineTo(x + bw * 0.42, by - bh * 0.5);
  ctx.lineTo(x + bw * 0.22, by - bh * 0.2);
  ctx.lineTo(x + bw * 0.22, by - bh * 0.38);
  ctx.lineTo(x - bw * 0.1, by - bh * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  star(ctx, x - bw * 0.3, by - bh * 0.5, bh * 0.32);
  ctx.fill();
}

/** A five-point star as its own subpath. */
function star(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** A pinwheel on its stick: four blades in two colors, spinning at its own pace (faster in the breeze). */
function pinwheel(ctx: Ctx, s: Scene, x: number, y: number, r: number, speed: number, a: string, b: string): void {
  const u = s.u;
  const kw = Math.max(0.8, u * 0.0024);
  ctx.strokeStyle = TABLE.light;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + r * 3.2);
  ctx.stroke();
  const turn = s.t * speed * (1 + 2.5 * breeze(s.t)) + speed;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? b : a;
    ctx.beginPath();
    for (let i = pass; i < 4; i += 2) {
      const ang = turn + (i * Math.PI) / 2;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      ctx.moveTo(x, y);
      ctx.lineTo(x + c * r, y + sn * r);
      ctx.quadraticCurveTo(x + (c - sn) * r * 0.9, y + (sn + c) * r * 0.9, x - sn * r * 0.55, y + c * r * 0.55);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const ang = turn + (i * Math.PI) / 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
  }
  ink(ctx, kw, INK);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  circle(ctx, x, y, r * 0.16);
  ctx.fill();
}

/** A flower bed: leaves and blooms in red, white, blue and gold, along a stretch at the screen's side. */
function bed(ctx: Ctx, s: Scene, x0: number, x1: number, y: number): void {
  const u = s.u;
  ctx.fillStyle = LEAVES;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += u * 0.016) dot(ctx, x, y - u * 0.008, u * 0.013);
  ctx.fill();
  ctx.fillStyle = LEAVES_LIGHT;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let x = x0 + u * 0.008; x <= x1; x += u * 0.032) dot(ctx, x - u * 0.003, y - u * 0.015, u * 0.006);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let c = 0; c < BLOOMS.length; c++) {
    ctx.fillStyle = BLOOMS[c]!;
    ctx.beginPath();
    let i = 0;
    for (let x = x0; x <= x1; x += u * 0.012, i++) {
      if (Math.floor(hash(i * 5 + 8400 + Math.round(x0)) * BLOOMS.length) !== c) continue;
      dot(ctx, x, y - u * (0.012 + hash(i + 8450) * 0.012), u * 0.0055);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the lemonade stand, on the right

/** The stand: its counter's half width and height, its canopy's height (u). */
const STAND_HW = 0.07;
const COUNTER_H = 0.048;
const CANOPY_H = 0.13;

/** Balloons tied to the stand's post: their colors and their own bob. */
const BUNCH = [
  { c: 0, dx: -0.017, h: 0.05, phase: 0 },
  { c: 2, dx: 0.018, h: 0.055, phase: 1.7 },
  { c: 3, dx: 0.0, h: 0.078, phase: 3.1 },
] as const;
/** Now and then a balloon slips free and floats away: first at FREE_AT, then every FREE_EVERY seconds, rising for FREE_TIME. */
export const FREE_AT = 6.5;
const FREE_EVERY = 24;
const FREE_TIME = 7;


/**
 * Where the pitcher rests on the counter and where the glass she pours into stands (shares of the
 * stand's half width from its middle): both off to her right (our left), so the pitcher, lifted
 * and tipped over the glass, never comes up in front of her face.
 */
const PITCHER_X = -0.62;
const GLASSES = [-0.33, 0.3] as const;

/** Where the pitcher's handle is now (px): the lemonade girl's hand holds it as she pours. */
const HANDLE: [number, number] = [0, 0];
function handleAt(s: Scene, x: number, cTop: number, hw: number): readonly [number, number] {
  const u = s.u;
  const [lift, slide, tip] = pitcherAt(pourAt(s.t));
  const px0 = x + hw * PITCHER_X + slide * hw;
  const py0 = cTop - lift * u;
  const hc = Math.cos(tip);
  const hs = Math.sin(tip);
  const ox = -hw * 0.43;
  const oy = u * 0.014;
  HANDLE[0] = px0 + hw * 0.16 + ox * hc - oy * hs;
  HANDLE[1] = cTop - lift * u - u * 0.03 + ox * hs + oy * hc;
  void py0;
  return HANDLE;
}

/** Where the stand stands (px): its center and its foot. */
const STAND = { x: 0, foot: 0 };
function standAt(s: Scene, top: number): typeof STAND {
  STAND.x = s.cssW / 2 + STAND_X * s.u;
  STAND.foot = depth(s, top, 0.18, 0.025);
  return STAND;
}

function lemonadeStand(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const kw = Math.max(1, u * 0.003);
  const { x, foot } = standAt(s, top);
  const hw = STAND_HW * u;
  const cTop = foot - COUNTER_H * u;
  const canopy = foot - CANOPY_H * u;
  // The posts at the back corners.
  ctx.fillStyle = TABLE.body;
  ctx.beginPath();
  ctx.rect(x - hw + u * 0.004, canopy, u * 0.006, cTop - canopy);
  ctx.rect(x + hw - u * 0.01, canopy, u * 0.006, cTop - canopy);
  ctx.fill();
  ink(ctx, kw * 0.8, INK);
  // The girl who keeps it, behind the counter (her pouring hand on the pitcher's handle).
  vendor(ctx, s, x, foot - u * 0.004, handleAt(s, x, cTop, hw));
  // The counter: a wooden box, its front painted with a cream sign board and red trim.
  ctx.beginPath();
  ctx.rect(x - hw, cTop, hw * 2, COUNTER_H * u);
  ctx.fillStyle = wash(ctx, cTop, foot, [TABLE.light, TABLE.body, TABLE.shade]);
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.beginPath();
  ctx.rect(x - hw * 0.8, cTop + u * 0.01, hw * 1.6, u * 0.022);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ink(ctx, kw * 0.8, INK);
  // The sign's word, small, in the skin's display face.
  ctx.fillStyle = RED;
  ctx.font = `${Math.max(6, Math.round(u * 0.016))}px Rye, 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LEMONADE", x, cTop + u * 0.021, hw * 1.5);
  ctx.textBaseline = "alphabetic";
  // On the counter: the big pitcher of lemonade (lifted and tipped over a glass when she pours) and two glasses, a few lemons.
  const py = cTop;
  const k = pourAt(s.t);
  const [lift, slide, tip] = pitcherAt(k);
  const glass = GLASSES;
  // The glass she pours into fills; the other stands full.
  const fill = k < 0 ? 1 : Math.min(1, Math.max(0.15, (k - 0.3) / 0.35));
  ctx.beginPath();
  for (const g of glass) ctx.rect(x + hw * g, py - u * 0.018, hw * 0.16, u * 0.018);
  ctx.fillStyle = JAR;
  ctx.fill();
  ctx.fillStyle = LEMONADE;
  ctx.fillRect(x + hw * glass[0], py - u * 0.018 * fill * 0.9, hw * 0.16, u * 0.018 * fill * 0.9);
  ctx.fillRect(x + hw * glass[1], py - u * 0.016, hw * 0.16, u * 0.016);
  ctx.beginPath();
  for (const g of glass) ctx.rect(x + hw * g, py - u * 0.018, hw * 0.16, u * 0.018);
  ink(ctx, kw * 0.7, INK);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  oval(ctx, x + hw * 0.66, py - u * 0.006, u * 0.008, u * 0.006);
  oval(ctx, x + hw * 0.8, py - u * 0.005, u * 0.007, u * 0.005);
  ctx.fill();
  // The pitcher: its foot slid toward the glass and raised, tipped about its spout.
  const px0 = x + hw * PITCHER_X + slide * hw;
  const py0 = py - lift * u;
  ctx.save();
  ctx.translate(px0 + hw * 0.16, py0 - u * 0.03);
  ctx.rotate(tip);
  ctx.translate(-(px0 + hw * 0.16), -(py0 - u * 0.03));
  ctx.beginPath();
  ctx.moveTo(px0 - hw * 0.18, py0);
  ctx.lineTo(px0 - hw * 0.16, py0 - u * 0.03);
  ctx.lineTo(px0 + hw * 0.16, py0 - u * 0.03);
  ctx.lineTo(px0 + hw * 0.18, py0);
  ctx.closePath();
  ctx.fillStyle = JAR;
  ctx.fill();
  ink(ctx, kw * 0.8, INK);
  ctx.fillStyle = LEMONADE;
  ctx.fillRect(px0 - hw * 0.14, py0 - u * 0.022, hw * 0.3, u * 0.021);
  // Its handle, on the side away from the glass.
  ctx.beginPath();
  ctx.moveTo(px0 - hw * 0.17, py0 - u * 0.024);
  ctx.quadraticCurveTo(px0 - hw * 0.34, py0 - u * 0.018, px0 - hw * 0.18, py0 - u * 0.006);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.stroke();
  ctx.restore();
  // The pour: a stream of lemonade from the spout down into the glass.
  if (tip > 0.6) {
    const sx = px0 + hw * 0.16 + Math.cos(tip) * hw * 0.02;
    const sy = py0 - u * 0.03 + Math.sin(tip) * hw * 0.02;
    ctx.strokeStyle = LEMONADE;
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + u * 0.004, sy + u * 0.01, x + hw * (glass[0] + 0.08), py - u * 0.018 * fill * 0.9);
    ctx.stroke();
  }
  vendorHand(ctx, s);
  // The canopy: red and cream stripes sloping forward, its scalloped valance.
  const cw = hw * 1.18;
  const n = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? CREAM : RED;
    ctx.beginPath();
    for (let j = pass; j < n; j += 2) {
      const k0 = j / n;
      const k1 = (j + 1) / n;
      const xa = x - cw + cw * 2 * k0;
      const xb = x - cw + cw * 2 * k1;
      ctx.moveTo(xa + (x - xa) * 0.08, canopy - u * 0.014);
      ctx.lineTo(xb + (x - xb) * 0.08, canopy - u * 0.014);
      ctx.lineTo(xb, canopy + u * 0.008);
      ctx.quadraticCurveTo((xa + xb) / 2, canopy + u * 0.02, xa, canopy + u * 0.008);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - cw * 0.92, canopy - u * 0.014);
  ctx.lineTo(x + cw * 0.92, canopy - u * 0.014);
  ctx.lineTo(x + cw, canopy + u * 0.008);
  for (let j = n; j > 0; j--) {
    const xa = x - cw + (cw * 2 * j) / n;
    const xb = x - cw + (cw * 2 * (j - 1)) / n;
    ctx.quadraticCurveTo((xa + xb) / 2, canopy + u * 0.02, xb, canopy + u * 0.008);
  }
  ctx.closePath();
  ink(ctx, kw, INK);
}

/** Which balloon of the bunch is on its way now (its index), and how far into its flight (0..1): -1 when none is. */
const LOOSE = { i: -1, k: 0 };
function loose(t: number): typeof LOOSE {
  LOOSE.i = -1;
  if (t < FREE_AT) return LOOSE;
  const n = Math.floor((t - FREE_AT) / FREE_EVERY);
  const k = (t - FREE_AT - n * FREE_EVERY) / FREE_TIME;
  if (k >= 1) return LOOSE;
  LOOSE.i = ((n % BUNCH.length) + BUNCH.length) % BUNCH.length;
  LOOSE.k = k;
  return LOOSE;
}

/** One balloon: its string from (sx, sy), a soft round body lit at its upper left, a little knot. */
function balloon(ctx: Ctx, s: Scene, bx: number, by: number, r: number, sx: number, sy: number, c: number, phase: number): void {
  const u = s.u;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.6, u * 0.0012);
  ctx.beginPath();
  ctx.moveTo(bx, by + r * 1.1);
  ctx.quadraticCurveTo((bx + sx) / 2 + Math.sin(s.t * 2.3 + phase) * u * 0.006, (by + sy) / 2, sx, sy);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, bx, by, r * 0.86, r);
  ctx.moveTo(bx - r * 0.16, by + r * 1.14);
  ctx.lineTo(bx + r * 0.16, by + r * 1.14);
  ctx.lineTo(bx, by + r * 0.95);
  ctx.closePath();
  ctx.fillStyle = BALLOON[c]!;
  ctx.fill();
  ink(ctx, Math.max(0.8, u * 0.0026), INK);
  const a = ctx.globalAlpha;
  ctx.fillStyle = GLINT;
  ctx.globalAlpha = a * 0.55;
  ctx.beginPath();
  oval(ctx, bx - r * 0.32, by - r * 0.4, r * 0.18, r * 0.3, -0.4);
  ctx.fill();
  ctx.globalAlpha = a;
}

/** The balloons' knot on the stand's canopy (scratch). */
const KNOT = { x: 0, y: 0 };
function knotAt(s: Scene, top: number): typeof KNOT {
  const { x, foot } = standAt(s, top);
  KNOT.x = x + STAND_HW * s.u * 0.6;
  KNOT.y = foot - CANOPY_H * s.u + s.u * 0.01;
  return KNOT;
}

/** The balloons tied to the stand's canopy, bobbing and tugging on their strings (but the one on its way, if one is). */
function balloons(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const { x: kx, y: ky } = knotAt(s, top);
  const b = breeze(s.t);
  const free = loose(s.t).i;
  const hk = stringsK(s, ky);
  for (let i = 0; i < BUNCH.length; i++) {
    if (i === free) continue;
    const bl = BUNCH[i]!;
    const tug = Math.sin(s.t * 1.3 + bl.phase) * 0.006 + b * 0.012;
    const bx = kx + (bl.dx + tug) * u;
    const by = ky - (bl.h * hk + Math.sin(s.t * 1.7 + bl.phase) * 0.004) * u;
    balloon(ctx, s, bx, by, u * BALLOON_R, kx, ky, bl.c, bl.phase);
  }
}

/** The balloon size (u) on the stand, and their strings' longest (u). */
const BALLOON_R = 0.017;
const STRING_MOST = 0.078;

/** How long the strings are let out on this screen: the bunch stays below the parade's feet, on a short screen too. */
function stringsK(s: Scene, ky: number): number {
  // Measured where the stand stands before the camera climbs, so the strings keep their length as the lawn drops away.
  const room = (ky - s.rise * (LAWN_P - 1) - s.groundY) / s.u - ROUTE - 0.016 - BALLOON_R - 0.006;
  return Math.max(0.3, Math.min(1, room / STRING_MOST));
}

/**
 * The balloon that slipped free, on its way (drawn last, over everything in front of the tower):
 * it floats up the right side of the square past the kids, bobbing and wobbling, trailing its
 * string, shrinking as it rises away and fading out before it reaches the tower's floor (so it
 * never floats in front of play). It keeps to the right lane, out of the column and in from the side.
 */
export function looseBalloon(ctx: Ctx, s: Scene): void {
  const { i, k } = loose(s.t);
  if (i < 0) return;
  const u = s.u;
  const { x: kx, y: ky } = knotAt(s, bandTop(s));
  const bl = BUNCH[i]!;
  const e = k;
  const rise = looseRise(s, ky, bl.h, e);
  const bx = kx + (bl.dx + Math.sin(e * 6 + bl.phase) * 0.014 + e * 0.02) * u;
  const by = ky - (bl.h * stringsK(s, ky) + rise) * u;
  const r = u * BALLOON_R * (1 - e * 0.6);
  // Still on its way up the screen as the lawn drops away below it: it goes only once it is off the screen.
  if (by - r > s.cssH) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, (1 - e) / 0.35));
  balloon(ctx, s, bx, by, r, bx + Math.sin(s.t * 3) * u * 0.006, by + r * 3, bl.c, bl.phase);
  ctx.globalAlpha = 1;
}

/** How far (u) the loose balloon has risen at `e` of its flight: never above the tower's floor, so it never floats in front of play. */
function looseRise(s: Scene, ky: number, h: number, e: number): number {
  const most = Math.max(0, (ky - s.groundY) / s.u - h - 0.03);
  return most * (e * 0.55 + e * e * 0.45);
}

/** Where the loose balloon is now (for the tests): its middle and radius, or null. */
export function looseAt(s: Scene): { x: number; y: number; r: number } | null {
  const { i, k } = loose(s.t);
  if (i < 0) return null;
  const u = s.u;
  const { x: kx, y: ky } = knotAt(s, bandTop(s));
  const bl = BUNCH[i]!;
  const rise = looseRise(s, ky, bl.h, k);
  return { x: kx + (bl.dx + Math.sin(k * 6 + bl.phase) * 0.014 + k * 0.02) * u, y: ky - (bl.h * stringsK(s, ky) + rise) * u, r: u * BALLOON_R * (1 - k * 0.6) };
}

/** The wooden barrel planted with flowers, and the wagon wheel leaning on it. */
function barrel(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const kw = Math.max(1, u * 0.003);
  const x = s.cssW / 2 + 0.205 * u;
  const foot = depth(s, top, 0.15, 0.03);
  const hw = u * 0.024;
  const h = u * 0.05;
  // The wheel behind it, leaning: rim, spokes, hub.
  const wx = x + u * 0.03;
  const wy = foot - u * 0.03;
  const wr = u * 0.03;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, u * 0.0075);
  ctx.beginPath();
  oval(ctx, wx, wy, wr * 0.82, wr);
  ctx.stroke();
  ctx.strokeStyle = STAVE.body;
  ctx.lineWidth = Math.max(1, u * 0.0045);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, u * 0.0025);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    ctx.moveTo(wx - Math.cos(a) * wr * 0.8, wy - Math.sin(a) * wr * 0.98);
    ctx.lineTo(wx + Math.cos(a) * wr * 0.8, wy + Math.sin(a) * wr * 0.98);
  }
  ctx.stroke();
  ctx.fillStyle = STAVE.shade;
  ctx.beginPath();
  circle(ctx, wx, wy, wr * 0.16);
  ctx.fill();
  // The barrel: staves in a wash (rounded by its light), two iron hoops.
  ctx.beginPath();
  ctx.moveTo(x - hw, foot - h);
  ctx.quadraticCurveTo(x - hw * 1.2, foot - h / 2, x - hw, foot);
  ctx.lineTo(x + hw, foot);
  ctx.quadraticCurveTo(x + hw * 1.2, foot - h / 2, x + hw, foot - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, STAVE.shade);
  g.addColorStop(0.35, STAVE.light);
  g.addColorStop(1, STAVE.shade);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, kw, INK);
  ctx.fillStyle = HOOP;
  ctx.fillRect(x - hw * 1.12, foot - h * 0.8, hw * 2.24, u * 0.005);
  ctx.fillRect(x - hw * 1.12, foot - h * 0.25, hw * 2.24, u * 0.005);
  ctx.strokeStyle = STAVE.shade;
  ctx.lineWidth = Math.max(0.6, u * 0.0015);
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) {
    ctx.moveTo(x + k * hw, foot - h);
    ctx.lineTo(x + k * hw * 1.05, foot);
  }
  ctx.stroke();
  // Flowers spilling over its top, and two pinwheels stuck in among them, each spinning at its own pace.
  pinwheel(ctx, s, x - hw * 0.45, foot - h - u * 0.036, u * 0.014, 1.7, RED, CREAM);
  pinwheel(ctx, s, x + hw * 0.55, foot - h - u * 0.024, u * 0.011, 2.9, NAVY, GOLD);
  bed(ctx, s, x - hw * 0.9, x + hw * 0.9, foot - h + u * 0.006);
}

// ---------------------------------------------------------------- petals on the breeze

/** Petals lifting off the beds and drifting across the corners: a few, each on its own path; more in a breeze. */
function petals(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const b = breeze(s.t);
  for (let i = 0; i < 6; i++) {
    const period = 7 + hash(i + 8500) * 5;
    const k = (((s.t + hash(i + 8510) * period) % period) + period) % period / period;
    const side = i % 2 ? 1 : -1;
    const X = side * (0.48 - k * 0.24 - b * 0.05);
    const y = top + u * (0.02 + hash(i + 8520) * 0.12 + Math.sin(k * 9 + i) * 0.015 - k * 0.04);
    if (restTop(s, y) > s.cssH - u * 0.01 || Math.abs(X) < PLAIN + 0.03) continue;
    ctx.fillStyle = BLOOMS[i % 2 ? 0 : 1]!;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.beginPath();
    oval(ctx, cx + X * u, y, u * 0.0045, u * 0.0025, s.t * 2 + i);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the bunting-covered fence

/** The white picket fence along the near edge of the picnic lawn: its height and its foot (u above the screen's bottom), a picket's pitch, a post's. */
const FENCE_H = 0.056;
const FENCE_FOOT = 0.014;
const PICKET_PITCH = 0.017;
const POST_PITCH = 0.16;
/** On a short screen the fence's foot stands at least this far below the band's top (u), under everything else on the lawn. */
const FENCE_LOW = 0.25;
/** How far the posts' gold caps rise over the pickets' tops (u), and the room kept between the fence and the things on the lawn (u). */
const CAPS = 0.0145;
const FENCE_CLEAR = 0.004;

/** The fence's foot (px) for a band whose top is at `top`: low on the screen, below everything else on the lawn, riding down with it. */
function fenceFoot(s: Scene, top: number): number {
  return Math.max(s.cssH - FENCE_FOOT * s.u, restTop(s, top) + FENCE_LOW * s.u) + s.rise * LAWN_P;
}

/** The top of the fence (its posts' caps, px) where the lawn stands before the camera climbs, or Infinity where the screen does not show it. */
function fenceTop(s: Scene, top0: number): number {
  const foot = Math.max(s.cssH - FENCE_FOOT * s.u, top0 + FENCE_LOW * s.u);
  return foot - FENCE_H * s.u > s.cssH ? Infinity : foot - (FENCE_H + CAPS) * s.u;
}

/**
 * The picket fence we stand behind, along the bottom of the screen: cream pickets lit on their
 * left, two rails, square posts with gold caps, and swags of red, white and blue bunting draped
 * along its top from post to post, swaying a little in the breeze. It rides with the picnic lawn
 * (its foot planted in the grass a little above the screen's bottom), so it drops away as you climb.
 */
export function bottomFence(ctx: Ctx, s: Scene, top = bandTop(s)): void {
  const u = s.u;
  // Where the lawn has room for it: low on the screen, below everything else on the lawn.
  const foot = fenceFoot(s, top);
  const y0 = foot - FENCE_H * u;
  if (y0 > s.cssH) return;
  const cx = s.cssW / 2;
  const pitch = PICKET_PITCH * u;
  const pw = pitch * 0.62;
  const half = s.cssW / 2 + pitch;
  // The rails behind the pickets.
  ctx.fillStyle = PICKET.shade;
  ctx.fillRect(0, y0 + FENCE_H * u * 0.3, s.cssW, u * 0.006);
  ctx.fillRect(0, y0 + FENCE_H * u * 0.72, s.cssW, u * 0.006);
  // The pickets: a pointed board each, its shaded right edge.
  ctx.fillStyle = PICKET.light;
  ctx.beginPath();
  for (let d = -half; d <= half; d += pitch) {
    const x = cx + d;
    ctx.moveTo(x - pw / 2, foot);
    ctx.lineTo(x - pw / 2, y0 + pw * 0.5);
    ctx.lineTo(x, y0);
    ctx.lineTo(x + pw / 2, y0 + pw * 0.5);
    ctx.lineTo(x + pw / 2, foot);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = PICKET.shade;
  ctx.beginPath();
  for (let d = -half; d <= half; d += pitch) ctx.rect(cx + d + pw * 0.18, y0 + pw * 0.5, pw * 0.32, foot - y0 - pw * 0.5);
  ctx.fill();
  // Posts with gold caps, every POST_PITCH from the middle out.
  const post = POST_PITCH * u;
  ctx.fillStyle = PICKET.body;
  ctx.beginPath();
  for (let d = 0; d <= half; d += post) for (const sd of d === 0 ? [0] : [-1, 1]) ctx.rect(cx + sd * d - u * 0.006, y0 - u * 0.006, u * 0.012, foot - y0 + u * 0.006);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  const capR = u * 0.0055;
  for (let d = 0; d <= half; d += post) for (const sd of d === 0 ? [0] : [-1, 1]) dot(ctx, cx + sd * d, y0 - u * CAPS + capR, capR);
  ctx.fill();
  // The bunting: a swag between each pair of posts.
  const b = breeze(s.t);
  const inks = [RED, CREAM, NAVY];
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = inks[band]!;
    ctx.beginPath();
    for (let i = -Math.ceil(half / post); i < Math.ceil(half / post); i++) {
      const x0 = cx + i * post + u * 0.006;
      const x1 = cx + (i + 1) * post - u * 0.006;
      const sag = u * (0.022 + 0.002 * Math.sin(s.t * 1.3 + i) + 0.004 * b);
      swagBand(ctx, x0, x1, y0 - u * 0.002, sag, band, 3);
    }
    ctx.fill();
  }
  // A gold rosette where each swag meets a post.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let d = 0; d <= half; d += post) for (const sd of d === 0 ? [0] : [-1, 1]) dot(ctx, cx + sd * d, y0 - u * 0.001, u * 0.007);
  ctx.fill();
}

/** The picnic lawn in front of the square, over the base band, and the balloon that slipped free. */
export function front(ctx: Ctx, s: Scene): void {
  picnic(ctx, s);
  looseBalloon(ctx, s);
}

/** The picnic lawn and everything on it (all of `front` but the balloon on its way). */
export function picnic(ctx: Ctx, s: Scene): void {
  const top = bandTop(s);
  // Until the last of it, the stand's balloons, has dropped below the screen.
  if (top - s.u * THINGS_UP > s.cssH) return;
  ground(ctx, s, top);
  lawnThings(ctx, s, top);
  bottomFence(ctx, s, top);
}

/** Everything standing on the picnic lawn, its folk with it (drawn alone by the tests); `top` is the band's top. */
export function lawnThings(ctx: Ctx, s: Scene, top = bandTop(s)): void {
  const u = s.u;
  // The left: the flower bed by the edge with its pinwheels (where the screen leaves room for it
  // beside the lawn chair: on a phone the chair stands there), the lawn chair, the blanket and
  // basket, the sign.
  const bedY = depth(s, top, 0.1, 0.1, 0.005);
  if (s.cssW / 2 + (BLANKET_X - 0.1 - CHAIR_HW) * u > u * BED_W) {
    bed(ctx, s, u * 0.018, u * 0.07, bedY);
    pinwheel(ctx, s, u * 0.03, bedY - u * 0.05, u * 0.014, 2.1, RED, CREAM);
    pinwheel(ctx, s, u * 0.065, bedY - u * 0.038, u * 0.011, 3.3, NAVY, GOLD);
  }
  lawnChair(ctx, s, top);
  blanket(ctx, s, top);
  sign(ctx, s, top);
  // The right: the barrel and wheel, the stand and its balloons, a pinwheel by the edge.
  barrel(ctx, s, top);
  lemonadeStand(ctx, s, top);
  balloons(ctx, s, top);
  pinwheel(ctx, s, s.cssW - u * 0.03, depth(s, top, 0.2, 0.06) - u * 0.04, u * 0.012, 2.7, GOLD, RED);
  petals(ctx, s, top);
}

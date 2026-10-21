import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { couple } from "./couple";
import { landLine } from "./far";
import { archPath, block, heartPath } from "./shapes";
import type { Tone } from "./tone";

// The boulevard across the lawn, a row of Art Nouveau fronts standing on the land's line (far.ts:
// the horizon, then the cloud sea once it has gathered), Paris in the 1890s: on the left the
// chocolate shop, dusty rose under a curved pediment with a heart in its cartouche, its tall
// arched window crowned with a stained-glass fanlight over a display of our own bonbons on a
// doily; behind the tower a quiet townhouse, pale and plain under a bell gable (only its arched
// windows and an oculus, a shade off the wall, so the band behind the tower stays calm); the
// flower stall under an arch of Guimard's green ironwork, its parasol canopy in mint and cream
// gores, buckets of roses and tulips on its counter; and on the right the café, sage green, a
// glass marquise on curling iron brackets over its terrace, where the couple at a table exchange
// a card (couple.ts); at the row's end a lamp of our own in the Metro manner, its stem curling
// over to hang a glass bud. The row stops short of the screen's left side: that is where the sun
// sets, into the cloud bank over low hills, and nothing may stand in its way. Strings of lights
// sag from front to front along the row to the lamp; they, the lamp, the windows and the stained
// glass come on at dusk. Mid-distance: flat fills in the hour's light (tone.ts), no outline but
// the slate coping along the fronts' curved tops. Nothing here moves but the couple, out in the
// right lane.
//
// Positions are in u from the screen center, heights in u above the land's line.

/** The shops: center X, half width, wall height (u). */
export const CHOC_X = -0.182;
const CHOC_HW = 0.08;
const CHOC_H = 0.17;
/** The chocolate shop's pediment: how far its curve rises over the wall (u). */
const CHOC_PED = 0.036;
const HOUSE_X = 0;
const HOUSE_HW = 0.085;
const HOUSE_H = 0.215;
/** The townhouse's bell gable: how far it rises over the wall (u); the feet of its two floors of windows (u above the line). */
const GABLE = 0.046;
const HOUSE_FLOORS = [0.08, 0.15] as const;
export const STALL_X = 0.18;
const STALL_HW = 0.072;
/** The stall's iron arch: where its posts spring (u above the line) and its crown. */
const STALL_SPRING = 0.13;
const STALL_CROWN = 0.19;
export const CAFE_X = 0.36;
export const CAFE_HW = 0.085;
const CAFE_H = 0.165;
/** The café's cornice: how far its segmental curve rises over the wall (u). */
const CAFE_ARC = 0.018;
/** The marquise over the terrace: its top and its scalloped lower edge (u above the line), its ribs. */
const MARQUISE_TOP = 0.102;
const MARQUISE_LOW = 0.08;
const MARQUISE_PANES = 7;
/** The lamp at the row's end: its stem (u from center), how high it rises before it curls over, where the bud hangs and its size (u). */
export const LAMP_X = 0.478;
const LAMP_H = 0.126;
const BUD_X = 0.464;
const BUD_H = 0.11;
const BUD = 0.02;

/** The faint shadow under cornices and canopies. */
const SHADE = "rgba(60, 20, 70, 0.12)";

/**
 * A wall with a curved top as its own subpath: from the foot at x0..x1 up to `top`, the top rising
 * `rise` in the middle along a bell curve (concave from each corner, then convex over the crown).
 */
function bellWall(ctx: Ctx, x0: number, x1: number, foot: number, top: number, rise: number): void {
  const w = x1 - x0;
  ctx.moveTo(x0, foot);
  ctx.lineTo(x0, top);
  ctx.bezierCurveTo(x0 + w * 0.22, top, x0 + w * 0.24, top - rise, x0 + w * 0.5, top - rise);
  ctx.bezierCurveTo(x1 - w * 0.24, top - rise, x1 - w * 0.22, top, x1, top);
  ctx.lineTo(x1, foot);
  ctx.closePath();
}

/** The same bell curve alone (for the coping stroked along it). */
function bellLine(ctx: Ctx, x0: number, x1: number, top: number, rise: number): void {
  const w = x1 - x0;
  ctx.moveTo(x0, top);
  ctx.bezierCurveTo(x0 + w * 0.22, top, x0 + w * 0.24, top - rise, x0 + w * 0.5, top - rise);
  ctx.bezierCurveTo(x1 - w * 0.24, top - rise, x1 - w * 0.22, top, x1, top);
}

/**
 * A stained-glass fanlight: the half disc over (cx, spring) of radius r in `n` radiating panes,
 * rose, amber and mint by turns, leaded along its spokes and round its rim and its little hub.
 */
function fanlight(ctx: Ctx, tone: Tone, cx: number, spring: number, r: number, n: number, u: number): void {
  const colors = [tone.glassRose, tone.glassAmber, tone.glassMint];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = c; i < n; i += 3) {
      const a0 = Math.PI + (i / n) * Math.PI;
      const a1 = Math.PI + ((i + 1) / n) * Math.PI;
      ctx.moveTo(cx, spring);
      ctx.arc(cx, spring, r, a0, a1);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.strokeStyle = tone.lead;
  ctx.lineWidth = Math.max(0.7, u * 0.0022);
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    ctx.moveTo(cx + Math.cos(a) * r * 0.28, spring + Math.sin(a) * r * 0.28);
    ctx.lineTo(cx + Math.cos(a) * r, spring + Math.sin(a) * r);
  }
  ctx.moveTo(cx - r, spring);
  ctx.arc(cx, spring, r, Math.PI, Math.PI * 2);
  ctx.lineTo(cx - r, spring);
  ctx.moveTo(cx + r * 0.28, spring);
  ctx.arc(cx, spring, r * 0.28, 0, Math.PI, true);
  ctx.stroke();
}

/** An arched window: its frame (a round-headed arch a little bigger), the glass (lit at night) and one lead across the spring. */
function archWindow(ctx: Ctx, tone: Tone, x: number, foot: number, w: number, h: number, u: number, frame: string): void {
  const f = u * 0.004;
  ctx.fillStyle = frame;
  ctx.beginPath();
  archPath(ctx, x - f, foot + f, w + f * 2, h + f * 2);
  ctx.fill();
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  archPath(ctx, x, foot, w, h);
  ctx.fill();
  ctx.fillStyle = frame;
  ctx.fillRect(x, foot - h + w / 2 - u * 0.0012, w, u * 0.0024);
  ctx.fillRect(x + w / 2 - u * 0.0012, foot - h + w / 2, u * 0.0024, h - w / 2);
}

// ---------------------------------------------------------------- the chocolate shop

/**
 * The chocolate shop: a dusty rose front under a curved pediment with a heart in its cartouche;
 * upstairs two arched windows over a box of roses; below, the tall arched shop window in an
 * iron frame, its fanlight of stained glass over the bonbons in rows on a doily; an arched door
 * with an amber light. (No hanging sign: the gap to the townhouse is too narrow for one, and the
 * townhouse would cut it.)
 */
function chocolateShop(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + CHOC_X * u;
  const hz = landLine(s);
  const hw = CHOC_HW * u;
  const top = hz - CHOC_H * u;
  // The wall under its pediment, with a fine contour, and the slate coping along the curve.
  ctx.beginPath();
  bellWall(ctx, cx - hw, cx + hw, hz, top, CHOC_PED * u);
  ctx.fillStyle = tone.wallRose;
  ctx.fill();
  ctx.beginPath();
  bellLine(ctx, cx - hw - u * 0.004, cx + hw + u * 0.004, top + u * 0.002, CHOC_PED * u);
  ctx.strokeStyle = tone.roof;
  ctx.lineWidth = u * 0.008;
  ctx.lineCap = "round";
  ctx.stroke();
  // The cartouche: a cream oval with a heart, under the crown.
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  oval(ctx, cx, top - CHOC_PED * u * 0.42, u * 0.013, u * 0.011);
  ctx.fill();
  ctx.fillStyle = tone.bonbon;
  ctx.beginPath();
  heartPath(ctx, cx, top - CHOC_PED * u * 0.42, u * 0.014);
  ctx.fill();
  // Upstairs: two arched windows over a box of roses.
  for (let m = -1; m <= 1; m += 2) {
    const wx = cx + m * hw * 0.5 - u * 0.015;
    archWindow(ctx, tone, wx, hz - u * 0.112, u * 0.03, u * 0.042, u, tone.wallCream);
    ctx.fillStyle = tone.roof;
    ctx.fillRect(wx - u * 0.003, hz - u * 0.11, u * 0.036, u * 0.006);
    ctx.fillStyle = tone.rose;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) circle(ctx, wx + u * 0.006 + k * u * 0.009, hz - u * 0.112, u * 0.0042);
    ctx.fill();
  }
  // The shop window: a tall arch in an iron frame, the fanlight in its head, the display below.
  const ww = u * 0.098;
  const wx = cx - hw + u * 0.012;
  const wf = hz - u * 0.012;
  const wh = u * 0.088;
  ctx.fillStyle = tone.iron;
  ctx.beginPath();
  archPath(ctx, wx - u * 0.004, wf + u * 0.004, ww + u * 0.008, wh + u * 0.008);
  ctx.fill();
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  archPath(ctx, wx, wf, ww, wh);
  ctx.fill();
  const spring = wf - wh + ww / 2;
  fanlight(ctx, tone, wx + ww / 2, spring, ww / 2 - u * 0.001, 6, u);
  ctx.fillStyle = tone.iron;
  ctx.fillRect(wx, spring - u * 0.0015, ww, u * 0.003);
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = row === 1 ? tone.bonbonPink : tone.bonbon;
    ctx.beginPath();
    const n = 5;
    for (let k = 0; k < n; k++) {
      const bx = wx + u * 0.008 + ((ww - u * 0.016) * (k + 0.5)) / n;
      const by = spring + u * 0.009 + row * u * 0.0115;
      if ((k + row) % 2) circle(ctx, bx, by, u * 0.0043);
      else ctx.rect(bx - u * 0.0043, by - u * 0.0038, u * 0.0086, u * 0.0076);
    }
    ctx.fill();
  }
  // The door, with an amber light.
  const dx = cx + hw - u * 0.038;
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  archPath(ctx, dx, hz, u * 0.026, u * 0.064);
  ctx.fill();
  ctx.fillStyle = tone.glassAmber;
  ctx.beginPath();
  oval(ctx, dx + u * 0.013, hz - u * 0.044, u * 0.0065, u * 0.01);
  ctx.fill();
}

// ---------------------------------------------------------------- the townhouse

/**
 * The townhouse behind the tower, kept quiet: a pale front under a bell gable with an oculus,
 * two floors of tall arched windows and an arched door, all a shade off the wall; no frames, no
 * contour (their windows only glow softly at night).
 */
function townhouse(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + HOUSE_X * u;
  const hz = landLine(s);
  const hw = HOUSE_HW * u;
  const top = hz - HOUSE_H * u;
  ctx.fillStyle = tone.wallPale;
  ctx.beginPath();
  bellWall(ctx, cx - hw, cx + hw, hz, top, GABLE * u);
  ctx.fill();
  ctx.fillStyle = tone.wallPaleLine;
  ctx.beginPath();
  circle(ctx, cx, top - GABLE * u * 0.35, u * 0.011);
  ctx.rect(cx - hw, top + u * 0.004, hw * 2, u * 0.004);
  for (const foot of HOUSE_FLOORS) {
    for (let m = -1; m <= 1; m += 2) archPath(ctx, cx + m * hw * 0.5 - u * 0.015, hz - foot * u, u * 0.03, u * 0.048);
  }
  archPath(ctx, cx - u * 0.016, hz, u * 0.032, u * 0.06);
  ctx.fill();
  // The windows' soft glow at night (the door stays dark).
  if (tone.lights > 0.02) {
    ctx.globalAlpha = tone.lights * 0.55;
    ctx.fillStyle = tone.windowLit;
    ctx.beginPath();
    for (const foot of HOUSE_FLOORS) {
      for (let m = -1; m <= 1; m += 2) archPath(ctx, cx + m * hw * 0.5 - u * 0.011, hz - foot * u - u * 0.004, u * 0.022, u * 0.04);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- the flower stall

/**
 * The flower stall: a counter of boards on legs, buckets of roses and tulips along it, under an
 * arch of green ironwork that springs from two posts with a curl at either side, a parasol canopy
 * of mint and cream gores in its head, scalloped along its hem.
 */
function flowerStall(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + STALL_X * u;
  const hz = landLine(s);
  const hw = STALL_HW * u;
  const rx = hw - u * 0.006;
  const spring = hz - STALL_SPRING * u;
  const ry = (STALL_CROWN - STALL_SPRING) * u;
  // The canopy: gores radiating from the spring line's middle up to the arch.
  const gores = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.canopy2 : tone.canopy;
    ctx.beginPath();
    for (let i = pass; i < gores; i += 2) {
      ctx.moveTo(cx, spring);
      ctx.ellipse(cx, spring, rx, ry, 0, Math.PI + (i / gores) * Math.PI, Math.PI + ((i + 1) / gores) * Math.PI);
      ctx.closePath();
    }
    // The hem: a scallop under each gore, in the gore's color.
    const sw = (rx * 2) / gores;
    for (let i = pass; i < gores; i += 2) circle(ctx, cx - rx + sw * (i + 0.5), spring, sw * 0.5);
    ctx.fill();
  }
  // The posts and the arch, with a curl where each post meets it.
  ctx.strokeStyle = tone.iron;
  ctx.lineWidth = u * 0.0055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - rx, hz);
  ctx.lineTo(cx - rx, spring);
  ctx.ellipse(cx, spring, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, hz);
  ctx.stroke();
  ctx.lineWidth = u * 0.0032;
  ctx.beginPath();
  for (let m = -1; m <= 1; m += 2) {
    const px = cx + m * rx;
    ctx.moveTo(px, spring + u * 0.012);
    ctx.bezierCurveTo(px + m * u * 0.014, spring + u * 0.012, px + m * u * 0.016, spring - u * 0.006, px + m * u * 0.006, spring - u * 0.006);
    ctx.quadraticCurveTo(px + m * u * 0.001, spring - u * 0.002, px + m * u * 0.006, spring + u * 0.003);
  }
  ctx.stroke();
  // The counter: a plank top, a boarded front, legs.
  ctx.fillStyle = tone.roof;
  ctx.fillRect(cx - hw + u * 0.004, hz - u * 0.062, hw * 2 - u * 0.008, u * 0.062);
  ctx.fillStyle = tone.wallCream;
  ctx.fillRect(cx - hw + u * 0.01, hz - u * 0.052, hw * 2 - u * 0.02, u * 0.044);
  ctx.fillStyle = SHADE;
  ctx.fillRect(cx - hw + u * 0.01, hz - u * 0.052, hw * 2 - u * 0.02, u * 0.008);
  // A chalkboard sign with a heart on the counter's front.
  ctx.fillStyle = tone.roof;
  ctx.beginPath();
  block(ctx, cx - u * 0.016, hz - u * 0.048, u * 0.032, u * 0.034, u * 0.006);
  ctx.fill();
  ctx.fillStyle = tone.tulipP;
  ctx.beginPath();
  heartPath(ctx, cx, hz - u * 0.03, u * 0.018);
  ctx.fill();
  // Buckets along the counter: roses, tulips, roses.
  const by = hz - u * 0.062;
  const bw = u * 0.034;
  for (let i = 0; i < 3; i++) {
    const bx = cx - hw + u * 0.028 + i * (hw * 2 - u * 0.056) * 0.5;
    ctx.fillStyle = tone.stone;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by - u * 0.03);
    ctx.lineTo(bx + bw * 0.5, by - u * 0.03);
    ctx.lineTo(bx + bw * 0.4, by);
    ctx.lineTo(bx - bw * 0.4, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.stoneShade;
    ctx.fillRect(bx - bw * 0.5, by - u * 0.03, bw, u * 0.004);
    // Stems and leaves, then the blooms.
    ctx.fillStyle = tone.leaf;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const fx = bx + (k - 2) * bw * 0.2;
      ctx.rect(fx - u * 0.001, by - u * 0.07 + Math.abs(k - 2) * u * 0.006, u * 0.002, u * 0.045);
      if (k % 2 === 0) oval(ctx, fx + u * 0.006, by - u * 0.045, u * 0.006, u * 0.003, -0.6);
    }
    ctx.fill();
    // The blooms, two colors a bucket, each color as one fill: tulips (a cup with two points) in the middle bucket, roses either side.
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? tone.tulipP : i === 1 ? tone.tulipY : tone.rose;
      ctx.beginPath();
      for (let k = pass; k < 5; k += 2) {
        const fx = bx + (k - 2) * bw * 0.2;
        const fy = by - u * 0.072 + Math.abs(k - 2) * u * 0.006;
        if (i === 1) {
          ctx.moveTo(fx - u * 0.006, fy - u * 0.004);
          ctx.lineTo(fx - u * 0.005, fy - u * 0.014);
          ctx.lineTo(fx - u * 0.002, fy - u * 0.009);
          ctx.lineTo(fx, fy - u * 0.015);
          ctx.lineTo(fx + u * 0.002, fy - u * 0.009);
          ctx.lineTo(fx + u * 0.005, fy - u * 0.014);
          ctx.lineTo(fx + u * 0.006, fy - u * 0.004);
          ctx.quadraticCurveTo(fx, fy + u * 0.008, fx - u * 0.006, fy - u * 0.004);
          ctx.closePath();
        } else {
          circle(ctx, fx, fy - u * 0.004, u * 0.0075);
        }
      }
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- the café

/**
 * The café: a sage front under a segmental cornice, two arched windows upstairs with the sign
 * board (a heart and a cup) between them; over the terrace a glass marquise in amber and rose
 * panes on iron ribs, scalloped along its edge, held out on two curling brackets; under it the
 * big window with a band of stained glass along its head and a café curtain, the door, two bay
 * trees in pots, and (`terrace`) the terrace with the couple.
 */
function cafe(ctx: Ctx, s: Scene, tone: Tone, terrace: boolean): void {
  const u = s.u;
  const cx = s.cssW / 2 + CAFE_X * u;
  const hz = landLine(s);
  const hw = CAFE_HW * u;
  const top = hz - CAFE_H * u;
  ctx.beginPath();
  ctx.moveTo(cx - hw, hz);
  ctx.lineTo(cx - hw, top);
  ctx.quadraticCurveTo(cx, top - CAFE_ARC * u * 2, cx + hw, top);
  ctx.lineTo(cx + hw, hz);
  ctx.closePath();
  ctx.fillStyle = tone.wallSage;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - hw - u * 0.004, top + u * 0.002);
  ctx.quadraticCurveTo(cx, top - CAFE_ARC * u * 2 + u * 0.002, cx + hw + u * 0.004, top + u * 0.002);
  ctx.strokeStyle = tone.roof;
  ctx.lineWidth = u * 0.008;
  ctx.lineCap = "round";
  ctx.stroke();
  for (let m = -1; m <= 1; m += 2) archWindow(ctx, tone, cx + m * hw * 0.55 - u * 0.014, hz - u * 0.11, u * 0.028, u * 0.038, u, tone.wallCream);
  // The sign board: a cream oval with a heart and a cup.
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  oval(ctx, cx, hz - u * 0.13, u * 0.03, u * 0.013);
  ctx.fill();
  ctx.fillStyle = tone.glassRose;
  ctx.beginPath();
  heartPath(ctx, cx - u * 0.012, hz - u * 0.13, u * 0.014);
  ctx.rect(cx + u * 0.004, hz - u * 0.136, u * 0.014, u * 0.011);
  ctx.fill();
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  ctx.rect(cx + u * 0.007, hz - u * 0.134, u * 0.008, u * 0.006);
  ctx.fill();
  // The big window: its frame, the glass, a band of stained glass along its head, the curtain.
  const wx = cx - hw + u * 0.012;
  const ww = hw * 2 - u * 0.066;
  ctx.fillStyle = tone.wallCream;
  ctx.fillRect(wx - u * 0.004, hz - u * 0.074, ww + u * 0.008, u * 0.062);
  ctx.fillStyle = tone.windowLit;
  ctx.fillRect(wx, hz - u * 0.07, ww, u * 0.054);
  const panes = [tone.glassRose, tone.glassAmber, tone.glassMint];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = panes[c]!;
    ctx.beginPath();
    for (let i = c; i < 6; i += 3) ctx.rect(wx + (ww * i) / 6, hz - u * 0.07, ww / 6, u * 0.014);
    ctx.fill();
  }
  ctx.fillStyle = tone.lead;
  for (let i = 1; i < 6; i++) ctx.fillRect(wx + (ww * i) / 6 - u * 0.001, hz - u * 0.07, u * 0.002, u * 0.014);
  ctx.fillRect(wx, hz - u * 0.056, ww, u * 0.002);
  ctx.fillStyle = tone.sign;
  ctx.fillRect(wx, hz - u * 0.04, ww, u * 0.024);
  // The door, with a glass head.
  ctx.fillStyle = tone.door;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.044, hz, u * 0.032, u * 0.07);
  ctx.fill();
  ctx.fillStyle = tone.glassAmber;
  ctx.beginPath();
  archPath(ctx, cx + hw - u * 0.038, hz - u * 0.034, u * 0.02, u * 0.03);
  ctx.fill();
  // Bay trees in pots flanking the door.
  ctx.fillStyle = tone.roof;
  ctx.fillRect(cx + hw - u * 0.056, hz - u * 0.014, u * 0.01, u * 0.014);
  ctx.fillRect(cx + hw - u * 0.008, hz - u * 0.014, u * 0.01, u * 0.014);
  ctx.fillStyle = tone.leaf;
  ctx.beginPath();
  circle(ctx, cx + hw - u * 0.051, hz - u * 0.026, u * 0.009);
  circle(ctx, cx + hw - u * 0.003, hz - u * 0.026, u * 0.009);
  ctx.fill();
  marquise(ctx, s, tone, cx, hw, hz);
  if (terrace) couple(ctx, s, tone);
}

/** The café's glass marquise: amber and rose panes between iron ribs, a scalloped edge, two curling brackets under it. */
function marquise(ctx: Ctx, s: Scene, tone: Tone, cx: number, hw: number, hz: number): void {
  const u = s.u;
  const x0 = cx - hw - u * 0.004;
  const x1 = cx + hw + u * 0.004;
  const y0 = hz - MARQUISE_TOP * u;
  const y1 = hz - MARQUISE_LOW * u;
  const pw = (x1 - x0) / MARQUISE_PANES;
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.glassRose : tone.glassAmber;
    ctx.beginPath();
    for (let i = pass; i < MARQUISE_PANES; i += 2) {
      const a = x0 + i * pw;
      ctx.moveTo(a, y0);
      ctx.lineTo(a + pw, y0);
      ctx.lineTo(a + pw, y1 - pw * 0.2);
      ctx.quadraticCurveTo(a + pw / 2, y1 + pw * 0.3, a, y1 - pw * 0.2);
      ctx.closePath();
    }
    ctx.fill();
  }
  // The ribs, the top rail, the brackets.
  ctx.strokeStyle = tone.iron;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, u * 0.0025);
  ctx.beginPath();
  for (let i = 0; i <= MARQUISE_PANES; i++) {
    ctx.moveTo(x0 + i * pw, y0);
    ctx.lineTo(x0 + i * pw, y1 - pw * 0.2);
  }
  ctx.stroke();
  ctx.lineWidth = u * 0.0045;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  for (let m = -1; m <= 1; m += 2) {
    const bx = cx + m * hw * 0.62;
    ctx.moveTo(bx, y1 - u * 0.004);
    ctx.bezierCurveTo(bx, hz - u * 0.066, bx - m * u * 0.016, hz - u * 0.064, bx - m * u * 0.016, hz - u * 0.072);
    ctx.quadraticCurveTo(bx - m * u * 0.015, hz - u * 0.078, bx - m * u * 0.009, hz - u * 0.075);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------- the lamp and the lights

/** Where the strings of lights hang from, X (u from center) and height above the land's line, and the bulbs' three colors by turns. */
const HOOKS = [
  [CHOC_X - CHOC_HW, CHOC_H + 0.03],
  [HOUSE_X - HOUSE_HW, HOUSE_H + 0.03],
  [HOUSE_X + HOUSE_HW, HOUSE_H + 0.03],
  [STALL_X + STALL_HW + 0.008, 0.19],
  [CAFE_X + CAFE_HW, CAFE_H + 0.03],
  [LAMP_X, LAMP_H - 0.004],
] as const;

/**
 * The lamp at the row's end, in the Metro manner: a flared foot, a slim green stem that rises and
 * curls over toward the café, and from the curl a glass bud hanging under a little cap, lit at dusk.
 */
export function lamp(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const x = s.cssW / 2 + LAMP_X * u;
  const hz = landLine(s);
  const top = hz - LAMP_H * u;
  const bx = s.cssW / 2 + BUD_X * u;
  const by = hz - BUD_H * u;
  // The foot.
  ctx.fillStyle = tone.iron;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.012, hz);
  ctx.quadraticCurveTo(x - u * 0.004, hz - u * 0.006, x - u * 0.003, hz - u * 0.026);
  ctx.lineTo(x + u * 0.003, hz - u * 0.026);
  ctx.quadraticCurveTo(x + u * 0.004, hz - u * 0.006, x + u * 0.012, hz);
  ctx.closePath();
  ctx.fill();
  // The stem and its curl over to the bud's cap.
  ctx.strokeStyle = tone.iron;
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.0055;
  ctx.beginPath();
  ctx.moveTo(x, hz - u * 0.024);
  ctx.lineTo(x, top + u * 0.01);
  ctx.bezierCurveTo(x, top - u * 0.008, bx, top - u * 0.01, bx, by - BUD * u * 0.55);
  ctx.stroke();
  // The bud: a drop of glass under a cap.
  ctx.fillStyle = tone.lamp;
  ctx.beginPath();
  const b = BUD * u;
  ctx.moveTo(bx, by - b * 0.5);
  ctx.bezierCurveTo(bx + b * 0.5, by - b * 0.45, bx + b * 0.42, by + b * 0.3, bx, by + b * 0.5);
  ctx.bezierCurveTo(bx - b * 0.42, by + b * 0.3, bx - b * 0.5, by - b * 0.45, bx, by - b * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.iron;
  ctx.beginPath();
  oval(ctx, bx, by - b * 0.48, b * 0.3, b * 0.12);
  ctx.fill();
}

/** Strings of bulbs sagging from front to front along the row, lit at dusk. */
function stringLights(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  ctx.strokeStyle = tone.wire;
  ctx.lineWidth = Math.max(0.8, u * 0.0022);
  ctx.beginPath();
  for (let i = 0; i < HOOKS.length - 1; i++) {
    const [x0, h0] = HOOKS[i]!;
    const [x1, h1] = HOOKS[i + 1]!;
    ctx.moveTo(cx + x0 * u, hz - h0 * u);
    ctx.quadraticCurveTo(cx + ((x0 + x1) / 2) * u, hz - ((h0 + h1) / 2 - 0.05) * u, cx + x1 * u, hz - h1 * u);
  }
  ctx.stroke();
  const colors = [tone.bulb, tone.bulbPink, tone.bulbCream];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = colors[c]!;
    ctx.beginPath();
    for (let i = 0; i < HOOKS.length - 1; i++) {
      const [x0, h0] = HOOKS[i]!;
      const [x1, h1] = HOOKS[i + 1]!;
      const n = Math.round(((x1 - x0) * u) / (u * 0.02));
      for (let k = 1; k < n; k++) {
        if ((k + i) % 3 !== c) continue;
        const q = k / n;
        // A point on the quadratic curve, a bulb's length below the wire.
        const mx = (x0 + x1) / 2;
        const mh = (h0 + h1) / 2 - 0.05;
        const px = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1;
        const ph = (1 - q) * (1 - q) * h0 + 2 * (1 - q) * q * mh + q * q * h1;
        circle(ctx, cx + px * u, hz - ph * u + u * 0.006, u * 0.004);
      }
    }
    ctx.fill();
  }
}

/** The pavement the shops stand on, from the land's line down to the canal and the lawn. */
export const PAVE_DEPTH = 0.05;

/** The shops left to right (the café with its terrace, unless `terrace` is false), the lamp, and the lights strung between them. */
export function shops(ctx: Ctx, s: Scene, tone: Tone, terrace = true): void {
  chocolateShop(ctx, s, tone);
  townhouse(ctx, s, tone);
  flowerStall(ctx, s, tone);
  cafe(ctx, s, tone, terrace);
  lamp(ctx, s, tone);
  stringLights(ctx, s, tone);
  ctx.lineCap = "butt";
}

/** The boulevard: its pavement right across, then the shops; only the shops while it stands in the cloud sea (`land` false: the sea covers the rest). */
export function boulevard(ctx: Ctx, s: Scene, tone: Tone, land: boolean): void {
  const u = s.u;
  const hz = landLine(s);
  if (land) {
    ctx.fillStyle = tone.pave;
    ctx.fillRect(0, hz - 1, s.cssW, PAVE_DEPTH * u + 1);
    ctx.fillStyle = tone.pave2;
    ctx.fillRect(0, hz + PAVE_DEPTH * u - u * 0.008, s.cssW, u * 0.008);
  }
  shops(ctx, s, tone, land);
}

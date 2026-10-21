import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PAVE_DEPTH } from "./boulevard";
import { landLine } from "./far";
import { archPath, heartPath } from "./shapes";
import type { Tone } from "./tone";

// The canal, in the right lane: a basin of water that comes out from under the boulevard's
// pavement between two stone quays, widening toward you, and ends at a quay wall on the lawn.
// Over it the kissing bridge, a little covered footbridge: a zinc bell roof with a heart of rose
// glass in its face, limestone walls with three little arched windows, on a stone arch. In front of it two swans
// glide together (swansPose): they set out from either bank, meet in the middle and curve their
// necks into a heart, and hold it, bobbing on the water; then they straighten up, turn away from
// each other a moment (close together: out by the banks, where the canal narrows toward its far
// end, a head turned out would poke over the quay onto the lawn), turn back, drift apart to the
// banks still facing each other, and do it all again, every SWAN_CYCLE seconds.
// Mid-distance: flat fills in the hour's light, no outline, little whiplash ripples on the
// water; the swans in the light of the hour on white. It stands on the land's line (far.ts), so once the cloud sea has gathered it lies
// under it with the lawn.
//
// Positions are in u from the screen center, depths in u below the land's line. The bridge and
// the swans keep above the slider's first lane in both modes, so the bar never sweeps over them
// (only over the flat water of the canal's near end, like the lawn).

/** The canal: its mouth (X from..to) under the pavement, and its near end at the quay wall. */
const MOUTH_L = 0.3;
const MOUTH_R = 0.42;
export const NEAR = 0.15;
const NEAR_L = 0.28;
const NEAR_R = 0.47;
/**
 * The bridge: its center and half span (bank to bank), the deck, the water under it and the
 * arch's radius, the house on it and its roof (its ridge kept a little below the café's terrace,
 * where the couple sit, so the two never touch).
 */
export const BRIDGE_X = 0.366;
const BRIDGE_HW = 0.08;
const DECK = 0.09;
const WATER = 0.113;
const ARCH = 0.028;
const HOUSE_HW = 0.06;
const HOUSE_TOP = 0.063;
const RIDGE = 0.043;
const EAVES_HW = 0.07;
/** The swans' water line and center, their size, and how far apart they set out and come together (u). */
export const SWAN_Y = 0.116;
export const SWAN_X = 0.37;
const SWAN = 0.027;
const APART = 0.1;
const TOGETHER = 0.048;

/** The left bank's X at depth `y`. */
export function bankL(y: number): number {
  return MOUTH_L + ((NEAR_L - MOUTH_L) * (y - PAVE_DEPTH)) / (NEAR - PAVE_DEPTH);
}

export function bankR(y: number): number {
  return MOUTH_R + ((NEAR_R - MOUTH_R) * (y - PAVE_DEPTH)) / (NEAR - PAVE_DEPTH);
}

/** The canal between its quays, the quay wall across its near end, and a few lit ripples. */
export function canal(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const y0 = hz + PAVE_DEPTH * u;
  const y1 = hz + NEAR * u;
  // The quays: a stone lip along each bank and across the near end, shaded on the water side.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.moveTo(cx + (MOUTH_L - 0.012) * u, y0);
  ctx.lineTo(cx + (MOUTH_R + 0.012) * u, y0);
  ctx.lineTo(cx + (NEAR_R + 0.014) * u, y1 + u * 0.012);
  ctx.lineTo(cx + (NEAR_L - 0.014) * u, y1 + u * 0.012);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.beginPath();
  ctx.moveTo(cx + (MOUTH_L - 0.012) * u, y0);
  ctx.lineTo(cx + (MOUTH_L - 0.004) * u, y0);
  ctx.lineTo(cx + (NEAR_L - 0.006) * u, y1);
  ctx.lineTo(cx + (NEAR_L - 0.014) * u, y1);
  ctx.closePath();
  ctx.moveTo(cx + (MOUTH_R + 0.004) * u, y0);
  ctx.lineTo(cx + (MOUTH_R + 0.012) * u, y0);
  ctx.lineTo(cx + (NEAR_R + 0.014) * u, y1);
  ctx.lineTo(cx + (NEAR_R + 0.006) * u, y1);
  ctx.closePath();
  ctx.rect(cx + (NEAR_L - 0.014) * u, y1 + u * 0.004, (NEAR_R - NEAR_L + 0.028) * u, u * 0.004);
  ctx.fill();
  // The water.
  ctx.fillStyle = tone.canal;
  ctx.beginPath();
  ctx.moveTo(cx + MOUTH_L * u, y0);
  ctx.lineTo(cx + MOUTH_R * u, y0);
  ctx.lineTo(cx + NEAR_R * u, y1);
  ctx.lineTo(cx + NEAR_L * u, y1);
  ctx.closePath();
  ctx.fill();
  // Ripples: little lit whiplash curves, wider toward you, none where the swans glide.
  ctx.strokeStyle = tone.canalLit;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const y = PAVE_DEPTH + 0.016 + i * 0.024;
    if (y > NEAR - 0.008 || (y > SWAN_Y - 0.03 && y < SWAN_Y + 0.03)) continue;
    const l = bankL(y);
    const r = bankR(y);
    const w = (r - l) * (0.14 + 0.08 * (i % 3));
    const x = l + (r - l) * (0.12 + 0.55 * ((i * 0.37) % 1));
    ctx.moveTo(cx + x * u, hz + y * u);
    ctx.bezierCurveTo(cx + (x + w * 0.3) * u, hz + (y - 0.006) * u, cx + (x + w * 0.6) * u, hz + (y + 0.005) * u, cx + (x + w) * u, hz + (y - 0.002) * u);
  }
  ctx.stroke();
}

/** The kissing bridge: a stone arch over the water, the covered walk on its deck, the roof with its heart. */
export function bridge(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = landLine(s);
  const x = cx + BRIDGE_X * u;
  const x0 = x - BRIDGE_HW * u;
  const x1 = x + BRIDGE_HW * u;
  const deck = hz + DECK * u;
  const water = hz + WATER * u;
  const r = u * ARCH;
  // The abutments and arch, the water showing through.
  ctx.fillStyle = tone.stone;
  ctx.beginPath();
  ctx.moveTo(x0, deck - u * 0.004);
  ctx.lineTo(x1, deck - u * 0.004);
  ctx.lineTo(x1, water);
  ctx.lineTo(x + r, water);
  ctx.arc(x, water, r, 0, Math.PI, true);
  ctx.lineTo(x0, water);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  ctx.arc(x, water, r, Math.PI, Math.PI * 2);
  ctx.arc(x, water, r * 0.82, Math.PI * 2, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.stoneLit;
  ctx.fillRect(x0, deck - u * 0.004, x1 - x0, u * 0.005);
  // The covered walk: board walls with three little arched windows, a slate sill.
  const hx0 = x - HOUSE_HW * u;
  const hx1 = x + HOUSE_HW * u;
  const top = hz + HOUSE_TOP * u;
  ctx.fillStyle = tone.house;
  ctx.fillRect(hx0, top, hx1 - hx0, deck - top);
  ctx.fillStyle = tone.houseShade;
  for (let i = 1; i < 6; i++) ctx.fillRect(hx0 + ((hx1 - hx0) * i) / 6 - u * 0.0008, top + u * 0.002, u * 0.0016, deck - top - u * 0.004);
  ctx.fillStyle = tone.windowLit;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) archPath(ctx, x + (i - 1) * u * 0.034 - u * 0.008, top + u * 0.022, u * 0.016, u * 0.016);
  ctx.fill();
  ctx.fillStyle = tone.zinc;
  ctx.fillRect(hx0, deck - u * 0.004, hx1 - hx0, u * 0.006);
  // The roof: a bell curve with deep eaves rising to a finial, a fine lit edge, a rose glass heart in its face.
  const ridge = hz + RIDGE * u;
  const ew = EAVES_HW * u;
  ctx.fillStyle = tone.zinc;
  ctx.beginPath();
  ctx.moveTo(x - ew, top + u * 0.004);
  ctx.bezierCurveTo(x - ew * 0.55, top + u * 0.002, x - ew * 0.3, ridge, x, ridge);
  ctx.bezierCurveTo(x + ew * 0.3, ridge, x + ew * 0.55, top + u * 0.002, x + ew, top + u * 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone.zincLit;
  ctx.lineWidth = Math.max(0.8, u * 0.0025);
  ctx.beginPath();
  ctx.moveTo(x - ew * 0.92, top + u * 0.002);
  ctx.bezierCurveTo(x - ew * 0.5, top, x - ew * 0.28, ridge + u * 0.002, x, ridge + u * 0.002);
  ctx.stroke();
  ctx.fillStyle = tone.glassRose;
  ctx.beginPath();
  heartPath(ctx, x, ridge + (top - ridge) * 0.6, u * 0.014);
  ctx.fill();
}

/** The swans' story, told again every SWAN_CYCLE seconds, and its moments (s into it). */
export const SWAN_CYCLE = 27;
/** They glide together, and their necks curve into a heart... */
const MEET = 6;
const HEART_FROM = 5.5;
const HEART_TO = 8;
/** ...and hold it; then they straighten up, turn away a moment and back, and drift apart to the banks. */
const PART = 18;
const TURN_AWAY = 19.5;
const TURN = 0.6;
const TURN_BACK = 21.6;
const DRIFT_FROM = 22.4;
const DRIFT_TO = 26.6;

/** Scratch pose of the swans: how far apart (u), the heart (0..1), and which way they face (1 each other, -1 away; through 0 as they turn). */
const SWANS = { gap: APART, heart: 0, face: 1 };

function ease01(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/**
 * The swans' story: apart at either bank as a tower starts, they glide together over the first
 * six seconds, and by eight their necks have curved into a heart. They hold it a while, then
 * straighten their necks, turn away from each other for a moment and back, and drift apart to
 * the banks facing each other, just in time for the next telling.
 */
export function swansPose(t: number): typeof SWANS {
  const k = t - Math.floor(t / SWAN_CYCLE) * SWAN_CYCLE;
  const together = ease01(k / MEET) * (1 - ease01((k - DRIFT_FROM) / (DRIFT_TO - DRIFT_FROM)));
  SWANS.gap = APART + (TOGETHER - APART) * together;
  SWANS.heart = ease01((k - HEART_FROM) / (HEART_TO - HEART_FROM)) * (1 - ease01((k - PART) / 1.2));
  SWANS.face = Math.cos(Math.PI * (ease01((k - TURN_AWAY) / TURN) - ease01((k - TURN_BACK) / TURN)));
  return SWANS;
}

/** Two swans facing each other on the water in front of the bridge, their necks making a heart. */
export function swans(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + SWAN_X * u;
  const hz = landLine(s);
  const pose = swansPose(s.t);
  const g = u * SWAN;
  ctx.fillStyle = tone.swan;
  ctx.strokeStyle = tone.swan;
  ctx.lineWidth = Math.max(1.5, g * 0.3);
  ctx.lineCap = "round";
  for (let m = -1; m <= 1; m += 2) {
    const bob = Math.sin(s.t * 1.1 + m * 1.3) * u * 0.0015;
    const bx = cx - (m * pose.gap * u) / 2;
    const by = hz + SWAN_Y * u + bob;
    // Which way this one faces (toward the other, or away while they part), foreshortened as it turns.
    const f = m * pose.face;
    const long = 0.8 + 0.2 * Math.abs(pose.face);
    // Reflection, then the body with its wing raised a little, the neck and head.
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    oval(ctx, bx, by + g * 0.42, g * 0.9 * long, g * 0.15);
    ctx.fill();
    ctx.globalAlpha = 1;
    // (Body and wing filled apart: as one path, the wing of whichever swan faces left winds
    // against the body and cut a hole in its back.)
    ctx.beginPath();
    oval(ctx, bx, by, g * long, g * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - f * g * 0.9, by);
    ctx.quadraticCurveTo(bx - f * g * 0.4, by - g * 0.9, bx + f * g * 0.5, by - g * 0.35);
    ctx.lineTo(bx + f * g * 0.5, by);
    ctx.closePath();
    ctx.fill();
    // The neck: up and leaning forward while gliding apart, held upright once they are close
    // (so their heads never pass through each other); in the heart each neck arches out away
    // from the other and bows in again, the two arches the heart's lobes, their chests its point
    // and their beaks touching in the dip between, never crossing.
    const k = pose.heart;
    const close = 1 - Math.min(1, Math.max(0, (pose.gap - TOGETHER) / (APART - TOGETHER)));
    const nx0 = bx + f * g * 0.7;
    const ny0 = by - g * 0.3;
    const straightX = nx0 + f * g * (0.45 - 0.8 * close);
    const straightY = by - g * 1.75;
    const heartX = cx - m * g * 0.28;
    const heartY = by - g * 1.45;
    const hx = straightX + (heartX - straightX) * k;
    const hy = straightY + (heartY - straightY) * k;
    const cxx = nx0 + f * g * (0.6 - 0.8 * close - (0.8 - 0.8 * close) * k - k);
    const cyy = by - g * (1.4 + 1.2 * k);
    ctx.beginPath();
    ctx.moveTo(nx0, ny0);
    ctx.quadraticCurveTo(cxx, cyy, hx, hy);
    ctx.stroke();
    ctx.beginPath();
    circle(ctx, hx, hy, g * 0.24);
    ctx.fill();
    // The beak: forward, or (in the heart) down and in to touch the other's.
    ctx.fillStyle = "#f08a3a";
    ctx.beginPath();
    ctx.moveTo(hx + f * g * 0.1, hy - g * 0.1);
    ctx.lineTo(hx + f * g * (0.5 - 0.2 * k), hy + g * (0.08 + 0.22 * k));
    ctx.lineTo(hx + f * g * 0.1, hy + g * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone.swan;
  }
}

/** The right lane's water: the canal, the bridge over it, the swans in front. */
export function waterway(ctx: Ctx, s: Scene, tone: Tone): void {
  canal(ctx, s, tone);
  bridge(ctx, s, tone);
  swans(ctx, s, tone);
}

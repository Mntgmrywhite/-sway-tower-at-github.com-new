import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { THREE } from "./colors";
import { floorTop } from "./far";
import { COLUMN, ROUTE } from "./place";
import { curbTop } from "./place";
import { sunAt, SUN_REACH } from "./sky";
import { level, toneOf } from "./tone";

// Confetti in the air over the street, always falling: bits in purple, green and gold that
// flutter down (each turning over as it falls, so it flashes thin and wide) on their own drift
// and their own clock. Over the parade route they fall the width of the street, in front of the
// stand and the parade (below the floor line, where anything may move); up in the side lanes a
// lighter flurry drifts down past the galleries and the café, and higher still the sky over the
// street is full of it too, with curling paper streamers among the bits: over the river and the
// bridge on the right, and on the left from under the sun (never across it) down to the corner
// house's roof; never into the tower's column, never up into the title. All of it is anchored to
// the street, so it drops away with it as the camera climbs.

/** Bits over the route: x (0..1 across the screen), fall speed (u/s), phase, size, color. */
const ROUTE_BITS = Array.from({ length: 34 }, (_, i) => ({
  x: hash(i + 8100),
  v: 0.05 + hash(i + 8110) * 0.04,
  ph: hash(i + 8120),
  k: 0.7 + hash(i + 8130) * 0.6,
  c: i % 3,
}));
/** Bits in the lanes: side (-1 left, 1 right), x across the lane (0..1), fall speed, phase, size, color. */
const LANE_BITS = Array.from({ length: 16 }, (_, i) => ({
  side: i % 2 ? 1 : -1,
  x: hash(i + 8200),
  v: 0.03 + hash(i + 8210) * 0.025,
  ph: hash(i + 8220),
  k: 0.7 + hash(i + 8230) * 0.5,
  c: (i >> 1) % 3,
}));

/** Bits in the sky over the street: side (-1 left, 1 right), x across the lane (0..1), fall speed, phase, size, color, and whether it is a streamer. */
const SKY_BITS = Array.from({ length: 40 }, (_, i) => ({
  side: i % 5 < 2 ? -1 : 1,
  x: hash(i + 8300),
  v: 0.025 + hash(i + 8310) * 0.025,
  ph: hash(i + 8320),
  k: 0.75 + hash(i + 8330) * 0.5,
  c: Math.floor(hash(i + 8340) * 3) % 3,
  streamer: i % 7 === 3 || i % 7 === 6,
}));
/** The sky flurry's height over the lanes' flurry (u), and how far it keeps under the title (fractions of the screen's height, and u) and the sun's halo (u). */
const SKY_UP = 0.46;
const HUD_H = 0.14;
const HUD_U = 0.15;
const SUN_GAP = 0.02;

/** A confetti bit at (x, y), turning over (`spin`), `w` long: as a thin rect that widens and narrows. */
function bit(ctx: Ctx, x: number, y: number, w: number, spin: number): void {
  const h = Math.max(1, w * 0.55 * Math.abs(Math.sin(spin)));
  ctx.rect(x - w / 2, y - h / 2, w, h);
}

/**
 * Confetti falling over the parade route: from just under the floor line to the curb, looping,
 * the width of the screen.
 */
export function routeConfetti(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const y0 = s.groundY + u * 0.02;
  const y1 = Math.min(curbTop(s) - u * 0.01, s.groundY + u * (ROUTE + 0.06));
  if (y0 > s.cssH || y1 <= y0) return;
  const span = y1 - y0;
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.body;
    ctx.beginPath();
    for (const b of ROUTE_BITS) {
      if (b.c !== c) continue;
      const f = (b.ph + (s.t * b.v * u) / span) % 1;
      const x = b.x * s.cssW + Math.sin(s.t * 1.3 + b.ph * 9) * u * 0.02;
      bit(ctx, x, y0 + f * span, u * 0.011 * b.k, s.t * 4 + b.ph * 7);
    }
    ctx.fill();
  }
}

/** A paper streamer at (x, y), `w` long, curling as it falls (`spin`): a little S of a stroke. */
function streamer(ctx: Ctx, x: number, y: number, w: number, spin: number): void {
  const c = Math.sin(spin) * w * 0.45;
  ctx.moveTo(x - w * 0.15, y - w * 0.5);
  ctx.bezierCurveTo(x + c, y - w * 0.2, x - c, y + w * 0.2, x + w * 0.15, y + w * 0.5);
}

/**
 * A flurry in the side lanes, drifting down past the houses: from the top of the corner house to
 * the far sidewalk, in each lane between the screen's side and the tower's column; and over it
 * the sky's flurry, bits and streamers, from under the title (on the left, from under the sun)
 * down to the roofs.
 */
export function laneConfetti(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const y1 = s.groundY - u * 0.15;
  const y0 = s.groundY - u * 0.62;
  if (y0 > s.cssH) return;
  const span = y1 - y0;
  const lane = Math.min(s.cssW / 2, u * 0.5) - COLUMN * u - u * 0.06;
  if (lane <= 0) return;
  skyConfetti(ctx, s, y0, lane);
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.body;
    ctx.beginPath();
    for (const b of LANE_BITS) {
      if (b.c !== c) continue;
      const f = (b.ph + (s.t * b.v * u) / span) % 1;
      const drift = Math.sin(s.t * 1.1 + b.ph * 11) * u * 0.012;
      const x = s.cssW / 2 + b.side * (COLUMN * u + u * 0.03 + b.x * lane) + drift;
      bit(ctx, x, y0 + f * span, u * 0.01 * b.k, s.t * 3.5 + b.ph * 5);
    }
    ctx.fill();
  }
}

/**
 * The sky's flurry over the lanes, from under the title down to `bottom` (the lanes' flurry goes on
 * below it): on the left only from under the sun's halo (the sun hangs there by day), so no bit ever
 * crosses it. `lane` is the lanes' width (px).
 */
function skyConfetti(ctx: Ctx, s: Scene, bottom: number, lane: number): void {
  const u = s.u;
  const hud = s.cssH * HUD_H + u * HUD_U;
  const top = Math.max(hud, bottom - u * SKY_UP);
  if (bottom - top < u * 0.04) return;
  const tone = toneOf(s);
  let left = top;
  if (tone.sunSet < 1) {
    const sun = sunAt(s, tone, floorTop(s, level(s)));
    left = Math.max(top, sun.y + sun.r * SUN_REACH + u * SUN_GAP);
  }
  ctx.lineWidth = Math.max(1, u * 0.0045);
  ctx.lineCap = "round";
  for (let c = 0; c < 3; c++) {
    for (const streamers of [false, true]) {
      ctx.beginPath();
      for (const b of SKY_BITS) {
        if (b.c !== c || b.streamer !== streamers) continue;
        const y0 = b.side < 0 ? left : top;
        const span = bottom - y0;
        if (span < u * 0.04) continue;
        const w = u * (streamers ? 0.026 : 0.01) * b.k;
        const f = (b.ph + (s.t * b.v * u) / span) % 1;
        const drift = Math.sin(s.t * 0.9 + b.ph * 13) * u * 0.014;
        // The whole bit keeps inside the band and the lane as it drifts.
        const x = s.cssW / 2 + b.side * (COLUMN * u + u * 0.045 + b.x * (lane - u * 0.03)) + drift;
        const y = y0 + w * 0.6 + f * (span - w * 1.2);
        if (streamers) streamer(ctx, x, y, w, s.t * 1.6 + b.ph * 6);
        else bit(ctx, x, y, w, s.t * 3.2 + b.ph * 5);
      }
      if (streamers) {
        ctx.strokeStyle = THREE[c]!.body;
        ctx.stroke();
      } else {
        ctx.fillStyle = THREE[c]!.body;
        ctx.fill();
      }
    }
  }
}

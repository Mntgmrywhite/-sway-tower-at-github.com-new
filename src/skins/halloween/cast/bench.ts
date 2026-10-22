import { createCanvas } from "@napi-rs/canvas";
import type { Scene } from "../../skin";
import { boneFeet, boneHand, boneSkull } from "../bones";
import { inkW, spot } from "../common";
import { crowFlying, crowPerched } from "../crow";
import { crowPose } from "../flight";
import { riderAt } from "../hollow";
import { horseman } from "../horseman";
import { kids } from "../kids";
import { sceneAt } from "../test-scene";
import { batBurst, batRing, batTrip } from "./bats";
import { bonebird, bonebirdAt, bonebirdV } from "./bonebird";
import { blackCat, catAt, CAT_LEN } from "./cat";
import { colossus, skyEel } from "./distant";
import { driftGhostAt, ghost, GHOST_H, graveGhostAt } from "./ghosts";
import { NIGHT, SILHOUETTE } from "./palette";
import { rat, ratAt, RAT_LEN } from "./rat";
import { carriage, CARRIAGE_LEN, glowingEyes, peeker, PEEKER_SIZE } from "./rare";
import { raven, ravenAt, RAVEN_SIZE, ravenSpot } from "./raven";
import { spider, spiderAt, SPIDER_SIZE } from "./spider";
import { BONEBIRD_SIZE } from "./bonebird";
import { curtain, curtainAt } from "./windows";

// The cast's frame cost, for the cost test and the scratch bench: each drawing at the start view
// on a phone (390 x 844 at 2x), at the moments it is out, the way the plan measures (the fastest of
// five runs per moment, then the median over the moments). Not a test file itself.

const W = 390;
const H = 844;
const ctx = createCanvas(W * 2, H * 2).getContext("2d") as unknown as CanvasRenderingContext2D;
ctx.scale(2, 2);

/** The median over moments of the fastest of `reps` runs, ms. */
export function median(times: readonly number[], draw: (s: Scene) => void, lvl = 0, reps = 5): number {
  const best = times.map(() => Infinity);
  for (let r = 0; r < reps; r++) {
    times.forEach((t, i) => {
      const s = sceneAt(W, H, lvl, t);
      const t0 = performance.now();
      draw(s);
      best[i] = Math.min(best[i]!, performance.now() - t0);
    });
  }
  const sorted = [...best].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** n moments spread over [a, b). */
export function moments(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.5)) / n);
}

const OPENING = moments(0, 12, 24);
const lw = (s: Scene, k = 1) => inkW(s, k);

/** Each start-view drawing, at moments it is out. */
export const START: [string, number[], (s: Scene) => void][] = [
  ["kids", OPENING, (s) => kids(ctx, s)],
  ["crow", OPENING, (s) => {
    const p = crowPose(s);
    const w = lw(s, 3 / p.z);
    if (p.perched) crowPerched(ctx, p.x, p.y, p.size, p.dir, p.caw, p.look, w);
    else crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, w);
  }],
  ["Horseman", moments(0, 4.5, 12), (s) => {
    const r = riderAt(s);
    horseman(ctx, r.x, r.y, r.size, s.t, r.tilt, Math.max(r.vis, 1), r.dir, r.charge);
  }],
  ["bones x3", OPENING, (s) => {
    const p = spot(s, 0, 2);
    const rx = 0.065 * s.u * p.k;
    const w = lw(s, p.k);
    ctx.save();
    ctx.translate(100, 700);
    boneHand(ctx, rx * 1.3, 1, s.t, 1, w);
    ctx.translate(100, 0);
    boneSkull(ctx, rx * 0.84, 1, s.t, w);
    ctx.translate(100, 0);
    boneFeet(ctx, rx * 1.1, 1, s.t, w);
    ctx.restore();
  }],
  ["cat", moments(5.7, 13.4, 16), (s) => blackCat(ctx, 330, 420, CAT_LEN * s.u, -1, catAt(s.t, 0, Infinity), 80, 250, lw(s))],
  ["raven", moments(2.3, 9.3, 16), (s) => {
    const p = ravenAt(s.t, 0, Infinity);
    const at = ravenSpot(p, 310, 380, 385, 330);
    raven(ctx, at.x, at.y, RAVEN_SIZE * s.u, at.dir, p, lw(s));
  }],
  ["spider", moments(0.8, 5.6, 12), (s) => spider(ctx, 25, 450, 40, SPIDER_SIZE * s.u, spiderAt(s.t, 0, Infinity), lw(s))],
  ["rat", moments(6.0, 8.2, 12), (s) => rat(ctx, 200, 690, RAT_LEN * s.u, -1, ratAt(s.t, 0, Infinity), lw(s))],
  ["grave ghost", moments(7.0, 9.8, 12), (s) => {
    const g = graveGhostAt(s.t, 0, Infinity);
    ghost(ctx, 40, 640, GHOST_H * s.u * 1.9, 1, g.rise, g.bob, g.wave, g.squash, g.vis, lw(s, 1.9));
  }],
  ["2 curtains", moments(2.6, 7.5, 16), (s) => {
    curtain(ctx, 340, 400, 16, 22, curtainAt(s.t, 0));
    curtain(ctx, 30, 390, 14, 20, curtainAt(s.t, 1));
  }],
  ["bat trip", moments(4.4, 7.4, 12), (s) => batTrip(ctx, 360, 250, 0.016 * s.u, (s.t - 4.4) / 3, 1, SILHOUETTE)],
  ["bat burst", moments(10.8, 13.3, 12), (s) => batBurst(ctx, 360, 250, 0.014 * s.u, (s.t - 10.8) / 2.5, 0, 1, SILHOUETTE)],
  ["cage bird", OPENING, (s) => bonebird(ctx, 107, 300, BONEBIRD_SIZE * s.u * 0.6, -1, bonebirdAt(s.t, 0, Infinity), lw(s, 0.6))],
];

/** The cast at height: the ring round the moon, a V of bone birds, a drifting ghost, the skyline's cat, raven and windows, the distant creatures and a rare event. */
export const HIGH: [string, number[], (s: Scene) => void][] = [
  ["bat ring", OPENING, (s) => batRing(ctx, 80, 300, 0.165 * s.u, s.t, 1, 0, SILHOUETTE)],
  ["bone V", OPENING, (s) => bonebirdV(ctx, { x0: 300, y0: 300, x1: 385, y1: 380 }, (s.t % 6) / 6, 5, BONEBIRD_SIZE * s.u * 0.5, 1, s.t, 1)],
  ["drift ghost", OPENING, (s) => {
    const d = driftGhostAt(s.t, 3);
    ghost(ctx, 320 + d.k * 40, 450, GHOST_H * s.u * 0.7, d.dir, 1, d.bob, 0, 0, 0.8, lw(s, 0.7));
  }],
  ["cat", moments(5.7, 13.4, 16), (s) => blackCat(ctx, 60, 520, CAT_LEN * s.u * 0.6, 1, catAt(s.t, 0, Infinity), 80, 300, lw(s, 0.6))],
  ["raven", moments(2.3, 9.3, 16), (s) => {
    const p = ravenAt(s.t, 0, Infinity);
    const at = ravenSpot(p, 340, 460, 385, 420);
    raven(ctx, at.x, at.y, RAVEN_SIZE * s.u * 0.6, at.dir, p, lw(s, 0.6));
  }],
  ["2 curtains", moments(2.6, 7.5, 16), (s) => {
    curtain(ctx, 350, 500, 10, 14, curtainAt(s.t, 0));
    curtain(ctx, 20, 560, 10, 14, curtainAt(s.t, 1));
  }],
  ["colossus", OPENING, (s) => colossus(ctx, 350, 600, 0.3 * s.u, s.t, SILHOUETTE, 0.8)],
  ["sky-eel", OPENING, (s) => skyEel(ctx, 340, 340, 0.4 * s.u * 0.4, s.t, NIGHT)],
  ["carriage", OPENING, (s) => carriage(ctx, 340, 520, CARRIAGE_LEN * s.u * 0.4, 1, s.t, 0.8, lw(s, 0.4))],
  ["eyes or peeker", OPENING, (s) => {
    glowingEyes(ctx, 30, 420, 0.03 * s.u, (s.t % 3) / 3, 1, 0);
    peeker(ctx, 360, 420, PEEKER_SIZE * s.u * 0.8, (s.t % 2.2) / 2.2, 1, lw(s, 0.8));
  }],
];

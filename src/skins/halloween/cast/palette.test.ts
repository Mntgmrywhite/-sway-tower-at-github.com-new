import { describe, expect, it } from "vitest";
import { boneFeet, boneHand, boneSkull, clods } from "../bones";
import { crowFly, crowFlying, crowPerched } from "../crow";
import { sheetGhost } from "../ghost";
import { horseman } from "../horseman";
import { kid, KIDS } from "../kids";
import { batBurst, batPath, batRing, batTrip } from "./bats";
import { bonebird, bonebirdAt, bonebirdV } from "./bonebird";
import { blackCat, catAt } from "./cat";
import { colossus, skyEel } from "./distant";
import { ghost } from "./ghosts";
import { CAST_PALETTE, NIGHT, PURPLE_DEEP, SILHOUETTE } from "./palette";
import { colorsOf } from "./probe";
import { rat, ratAt } from "./rat";
import { carriage, glowingEyes, moonShadow, peeker } from "./rare";
import { raven, ravenAt } from "./raven";
import { spider, spiderAt } from "./spider";
import { curtain, curtainAt } from "./windows";

// One Burton family: the whole cast paints only with the cast's palette (midnight blues, charcoal
// blacks, muted purples, ghostly greens, pumpkin oranges, bone and soft gold) and translucent
// versions of it. No candy pinks, no bright cartoon blues: a stray color fails here.

const ALLOWED = new Set(CAST_PALETTE.map((c) => c.toLowerCase()));
const RGB = new Set(
  CAST_PALETTE.map((c) => {
    const n = parseInt(c.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }),
);

function allowed(c: string): boolean {
  const s = c.toLowerCase().replace(/\s+/g, "");
  if (ALLOWED.has(s)) return true;
  const m = /^rgba\((\d+),(\d+),(\d+),[\d.]+\)$/.exec(s);
  return m !== null && RGB.has(`${m[1]},${m[2]},${m[3]}`);
}

type Draw = [string, (ctx: CanvasRenderingContext2D) => void];

const T = [0.4, 2.3, 3.1, 4.4, 5.9, 7.2, 8.4, 9.6, 11.1, 13.5];
const DRAWS: Draw[] = [
  ...KIDS.map((k, i): Draw => [k.costume, (ctx) => T.forEach((t) => kid(ctx, i, 100, 200, 80, t, 3, t > 5 ? 1 : 0))]),
  ["far crows", (ctx) => {
    ctx.fillStyle = SILHOUETTE;
    ctx.beginPath();
    crowFly(ctx, 100, 100, 20, 1, 0.5);
    ctx.fill();
  }],
  ["crow", (ctx) => T.forEach((t) => {
    crowFlying(ctx, 100, 100, 30, t > 6 ? 1 : -1, Math.sin(t), 0.2, t % 1, t % 1, 2);
    crowPerched(ctx, 100, 100, 40, -1, t % 1, 0, 2);
  })],
  ["Horseman", (ctx) => T.forEach((t) => horseman(ctx, 100, 200, 20, t, 0, 1, t > 6 ? -1 : 1, t > 6 ? 1 : 0))],
  ["bones", (ctx) => T.forEach((t) => {
    boneHand(ctx, 40, 1, t, 1, 2);
    boneSkull(ctx, 30, 1, t, 2);
    boneFeet(ctx, 40, 1, t, 2);
    clods(ctx, 30, 0.4, 1, PURPLE_DEEP, 2);
  })],
  ["sheet ghost", (ctx) => T.forEach((t) => sheetGhost(ctx, 100, 200, 60, t, 2, 1))],
  ["black cat", (ctx) => T.concat([24, 30, 33]).forEach((t) => blackCat(ctx, 100, 100, 30, -1, { ...catAt(t + 5, 0, t % 2 ? 0.1 : Infinity) }, 0, 0, 2))],
  ["raven", (ctx) => T.forEach((t) => raven(ctx, 100, 100, 30, -1, { ...ravenAt(t, 0, Infinity) }, 2))],
  ["spider", (ctx) => T.forEach((t) => spider(ctx, 100, 50, 80, 8, { ...spiderAt(t, 0, Infinity) }, 2))],
  ["rat", (ctx) => T.forEach((t) => rat(ctx, 100, 100, 20, 1, { ...ratAt(t + 3, 0, Infinity) }, 2))],
  ["bone bird", (ctx) => T.forEach((t) => {
    bonebird(ctx, 100, 100, 20, -1, { ...bonebirdAt(t, 0, Infinity) }, 2);
    bonebirdV(ctx, { x0: 0, y0: 0, x1: 200, y1: 100 }, t / 14, 5, 12, 1, t, 1);
  })],
  ["ghost", (ctx) => T.forEach((t) => ghost(ctx, 100, 150, 60, 1, 1, Math.sin(t), t % 1, t % 0.5, 1, 2))],
  ["curtain", (ctx) => T.forEach((t) => [0, 1, 2, 3].forEach((s) => curtain(ctx, 50, 50, 30, 40, { ...curtainAt(t, s) })))],
  ["bats", (ctx) => {
    ctx.fillStyle = SILHOUETTE;
    ctx.beginPath();
    batPath(ctx, 50, 50, 10, 0.3);
    ctx.fill();
    T.forEach((t) => {
      batRing(ctx, 100, 100, 40, t, 1, 0.3, SILHOUETTE);
      batTrip(ctx, 100, 100, 8, t / 14, 1, NIGHT);
      batBurst(ctx, 100, 100, 6, t / 14, 2, -1, NIGHT);
    });
  }],
  ["rare", (ctx) => T.forEach((t) => {
    glowingEyes(ctx, 100, 100, 30, t / 14, 1, t > 6 ? 1 : 0);
    peeker(ctx, 100, 100, 30, t / 14, 1, 2);
    carriage(ctx, 100, 100, 60, 1, t, 1, 2);
    moonShadow(ctx, 100, 100, 40, t / 14, t > 6 ? 1 : 0, t);
  })],
  ["distant", (ctx) => T.forEach((t) => {
    colossus(ctx, 100, 200, 120, t, SILHOUETTE, 1);
    skyEel(ctx, 100, 100, 100, t, NIGHT);
  })],
];

describe("halloween cast palette", () => {
  it.each(DRAWS)("%s paints only with the cast's palette", (_name, draw) => {
    const colors = colorsOf(draw);
    expect(colors.size).toBeGreaterThan(0);
    const stray = [...colors].filter((c) => !allowed(c));
    expect(stray, "colors outside the cast's palette").toEqual([]);
  });
});

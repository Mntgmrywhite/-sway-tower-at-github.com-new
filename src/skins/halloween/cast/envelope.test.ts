import { afterEach, describe, expect, it } from "vitest";
import { boneFeet, boneHand, boneSkull } from "../bones";
import { crowFly, crowFlying, crowPerched, flyingBox } from "../crow";
import { sheetGhost } from "../ghost";
import { CHARGE_RAISE, horseman } from "../horseman";
import { kid, KIDS } from "../kids";
import { batBurst, batBurstBox, batPath, batRing, batRingBox, batTrip, batTripBox } from "./bats";
import { bonebird, bonebirdAt, bonebirdBox, bonebirdV, bonebirdVBox } from "./bonebird";
import { blackCat, catAt, catBox } from "./cat";
import { colossus, colossusBox, skyEel, skyEelBox } from "./distant";
import { driftGhost, DRIFT_KINDS, ghost, ghostBox, graveGhostAt } from "./ghosts";
import { maskOf, paint } from "./probe";
import { rat, ratAt, ratBox } from "./rat";
import { carriage, carriageBox, eyesBox, glowingEyes, moonShadow, moonShadowBox, peeker, peekerBox } from "./rare";
import { raven, ravenAt, ravenBox, ravenSpot } from "./raven";
import { spider, spiderAt, spiderBox } from "./spider";
import { curtain, curtainAt } from "./windows";
import { breathe } from "../test-scene";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// Every drawing of the cast stays inside the box the stage plans it by (its own box function,
// or for the characters that were redrawn the footprint the cartoon versions had, which the
// layout around them was made for), plus its ink and a pixel, in every pose: walking, sitting,
// startled, flying, waving, at every moment of its schedule. And each one paints something, with
// finite numbers only (a NaN would silently draw nothing).

type Box = { x0: number; y0: number; x1: number; y1: number };

function check(name: string, draw: (ctx: CanvasRenderingContext2D) => void, box: Box, pad: number, min = 20, alpha = 24): void {
  const r = paint(draw, box, pad, alpha);
  expect(r.drawn, `${name}: drawn`).toBeGreaterThan(min);
  expect(r.out, `${name}: ${r.out} px outside its box (worst ${r.worst.toFixed(1)} px)`).toBe(0);
}

/** Sample times: `n` moments spread over [a, b). */
function times(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.37)) / n);
}

const LANDS = [Infinity, 0.05, 0.2, 0.45] as const;

describe("halloween cast: the redrawn characters keep their old footprints", () => {
  // Measured from the cartoon versions (preview/hw-c/measure-head.ts), in their own local units,
  // ink included at the same ratio (kids: lw 0.04 h; bones: 0.04 of their unit; crow: 0.05 s;
  // sheet ghost: 0.02 h).
  const KID_BOX: Record<string, Box> = {
    pumpkin: { x0: -0.37, y0: -1.235, x1: 0.555, y1: 0.035 },
    cat: { x0: -0.3, y0: -1.17, x1: 0.485, y1: 0.03 },
    hero: { x0: -0.495, y0: -1.125, x1: 0.345, y1: 0.03 },
    skeleton: { x0: -0.3, y0: -1.05, x1: 0.495, y1: 0.035 },
    witch: { x0: -0.515, y0: -1.495, x1: 0.35, y1: 0.03 },
  };
  const scaled = (b: Box, x: number, y: number, u: number): Box => ({ x0: x + b.x0 * u, y0: y + b.y0 * u, x1: x + b.x1 * u, y1: y + b.y1 * u });

  it("each trick-or-treater stays inside its cartoon footprint, hopping, swinging and glancing up", () => {
    const H = 100;
    for (let i = 0; i < KIDS.length; i++) {
      const box = scaled(KID_BOX[KIDS[i]!.costume]!, 150, 200, H);
      for (const t of times(0, 40, 50)) {
        for (const glance of [0, 1]) check(`${KIDS[i]!.costume} t=${t.toFixed(2)} glance ${glance}`, (ctx) => kid(ctx, i, 150, 200, H, t, H * 0.04, glance), box, 1, 500, 40);
      }
    }
  });

  it("the skeleton parts stay inside their old envelopes, and run on below the soil", () => {
    const U = 120;
    const lw = U * 0.04;
    const ENV: Record<string, Box> = {
      hand: { x0: -0.525, y0: -0.942, x1: 0.525, y1: 1.425 },
      skull: { x0: -0.625, y0: -1.367, x1: 0.625, y1: 2.017 },
      feet: { x0: -0.667, y0: -1.067, x1: 0.667, y1: 1.417 },
    };
    const parts: [string, (ctx: CanvasRenderingContext2D, up: number, t: number, side: 1 | -1) => void][] = [
      ["hand", (ctx, up, t, side) => boneHand(ctx, U, up, t, side, lw)],
      ["skull", (ctx, up, t) => boneSkull(ctx, U, up, t, lw)],
      ["feet", (ctx, up, t) => boneFeet(ctx, U, up, t, lw)],
    ];
    for (const [name, draw] of parts) {
      const box = scaled(ENV[name]!, 300, 300, U);
      for (const up of [0.1, 0.4, 0.7, 1]) {
        for (const t of times(0, 12, 8)) {
          for (const side of [1, -1] as const) {
            check(`${name} up ${up} t=${t.toFixed(2)}`, (ctx) => {
              ctx.translate(300, 300);
              draw(ctx, up, t, side);
            }, box, 1, 20, 40);
            // Whatever shows above the soil continues down into it: the clip cuts through bone.
            const m = maskOf((ctx) => {
              ctx.translate(300, 300);
              draw(ctx, up, t, side);
            }, 0, 0, 600, 600);
            // (It touches the soil line from above, and goes on down through it: never floating.)
            let shows = 0;
            let touches = 0;
            let under = 0;
            for (let y = 0; y < 600; y++) {
              for (let x = 0; x < 600; x++) {
                if (!m[y * 600 + x]) continue;
                if (y < 299) shows++;
                if (y >= 296 && y < 299) touches++;
                else if (y > 301 && y < 300 + U * 0.4) under++;
              }
            }
            if (shows > 0) {
              expect(touches, `${name} up ${up} t=${t.toFixed(2)}: rises from the soil line`).toBeGreaterThan(0);
              expect(under, `${name} up ${up} t=${t.toFixed(2)}: runs on below the soil`).toBeGreaterThan(U * 0.1);
            }
          }
        }
      }
    }
  });

  it("the perched crow keeps its old footprint; flying it stays inside its box, and the box inside its reach", () => {
    const S = 150;
    const P: Box = { x0: -0.58, y0: -1, x1: 0.727, y1: 0.027 };
    for (const dir of [1, -1]) {
      const box = dir > 0 ? scaled(P, 300, 400, S) : { x0: 300 - P.x1 * S, x1: 300 - P.x0 * S, y0: 400 + P.y0 * S, y1: 400 + P.y1 * S };
      for (const caw of [0, 0.5, 1]) for (const look of [-1, 0, 1]) check(`perched dir ${dir} caw ${caw} look ${look}`, (ctx) => crowPerched(ctx, 300, 400, S, dir, caw, look, S * 0.05), box, 1, 20, 40);
    }
    const s = 60;
    const lw = 3;
    for (const dir of [1, -1, 0.3, -0.5]) {
      for (const lift of [-1, -0.5, 0, 0.5, 1]) {
        for (const pitch of [-0.6, 0, 0.6]) {
          for (const legs of [0, 1]) {
            const b = { ...flyingBox(300, 300, s, dir, lift, pitch) };
            check(`flying dir ${dir} lift ${lift} pitch ${pitch} legs ${legs}`, (ctx) => crowFlying(ctx, 300, 300, s, dir, lift, pitch, legs, 1, lw), b, lw + 1);
            if (pitch === 0 && Math.abs(dir) === 1) {
              expect(Math.max(300 - b.x0, b.x1 - 300) / s, "reach sideways").toBeLessThanOrEqual(0.98 + 1e-9);
              expect(Math.max(300 - b.y0, b.y1 - 300) / s, "reach up and down").toBeLessThanOrEqual(1.15);
            }
          }
        }
      }
    }
    // The far flock's silhouettes: inside the boxes the flight test keeps them apart by.
    for (const lift of [-1, -0.4, 0, 0.6, 1]) {
      for (const dir of [1, -1]) {
        check(`far crow lift ${lift}`, (ctx) => {
          ctx.beginPath();
          crowFly(ctx, 300, 300, 80, dir, lift);
          ctx.fill();
        }, { x0: 220, x1: 380, y0: 300 - 0.72 * 80, y1: 300 + 0.64 * 80 }, 1);
      }
    }
  });

  it("the Horseman stays inside his reach, the pumpkin raised higher when he charges", () => {
    // hollow.ts's RIDER_REACH, in his size unit from the ground under his middle.
    const REACH = { x0: -1.9, x1: 1.45, y0: -3.95, y1: 0.2 };
    const S = 40;
    for (const t of times(0, 3, 40)) {
      for (const dir of [1, -1]) {
        for (const charge of [0, 1]) {
          const box = {
            x0: dir > 0 ? 300 + REACH.x0 * S : 300 - REACH.x1 * S,
            x1: dir > 0 ? 300 + REACH.x1 * S : 300 - REACH.x0 * S,
            y0: 400 + (REACH.y0 - CHARGE_RAISE * charge) * S,
            y1: 400 + REACH.y1 * S,
          };
          check(`Horseman t=${t.toFixed(2)} dir ${dir} charge ${charge}`, (ctx) => horseman(ctx, 300, 400, S, t, 0, 1, dir, charge), box, 1, 1000);
        }
      }
    }
  });

  it("the sheet ghost keeps its old footprint", () => {
    const H = 300;
    for (const t of times(0, 6, 30)) check(`sheet ghost t=${t.toFixed(2)}`, (ctx) => sheetGhost(ctx, 300, 450, H, t, H * 0.02, 1), scaled({ x0: -0.31, y0: -1.01, x1: 0.31, y1: 0.007 }, 300, 450, H), H * 0.02 * 0.5 + 1, 20, 40);
  });
});

describe("halloween cast: the new performers stay inside their boxes", () => {
  it("the black cat, through its visits, startled or not, both ways", () => {
    const size = 120;
    let shown = 0;
    for (const t of times(4, 46, 120)) {
      for (const land of LANDS) {
        const p = { ...catAt(t, 0, land) };
        if (p.vis <= 0.01) continue;
        shown++;
        for (const dir of [1, -1] as const) check(`cat t=${t.toFixed(2)} land ${land} dir ${dir}`, (ctx) => blackCat(ctx, 300, 300, size, dir, p, 60, 60, 3), catBox(300, 300, size, dir, p), 3 + 1);
      }
    }
    expect(shown, "poses seen").toBeGreaterThan(40);
  });

  it("the raven, gliding in, perched and flying off", () => {
    const size = 110;
    let shown = 0;
    for (const t of times(2, 40, 160)) {
      for (const land of LANDS) {
        const p = { ...ravenAt(t, 0, land) };
        if (p.vis <= 0.01) continue;
        shown++;
        const s = { ...ravenSpot(p, 300, 300, 520, 240) };
        check(`raven t=${t.toFixed(2)} land ${land}`, (ctx) => raven(ctx, s.x, s.y, size, s.dir, p, 3), { ...ravenBox(s.x, s.y, size, s.dir, p) }, 3 + 1);
      }
    }
    expect(shown, "poses seen").toBeGreaterThan(40);
  });

  it("the spider on its thread and the rat on its rail", () => {
    for (const t of times(0, 30, 120)) {
      for (const land of LANDS) {
        const sp = { ...spiderAt(t, 0, land) };
        check(`spider t=${t.toFixed(2)}`, (ctx) => spider(ctx, 300, 100, 300, 40, sp, 2), { ...spiderBox(300, 100, 300, 40, sp) }, 1, 5);
        const r = { ...ratAt(t + 5, 0, land) };
        if (r.vis <= 0.01) continue;
        for (const dir of [1, -1] as const) check(`rat t=${(t + 5).toFixed(2)} dir ${dir}`, (ctx) => rat(ctx, 300, 300, 140, dir, r, 3), { ...ratBox(300, 300, 140, dir, r) }, 3 + 1);
      }
    }
  });

  it("the skeletal birds, perched and in their V", () => {
    for (const t of times(0, 30, 100)) {
      for (const land of LANDS) {
        const p = { ...bonebirdAt(t, 0, land) };
        check(`bone bird t=${t.toFixed(2)}`, (ctx) => bonebird(ctx, 300, 300, 120, -1, p, 3), { ...bonebirdBox(300, 300, 120, -1, p) }, 3 + 1);
      }
    }
    const lane = { x0: 100, y0: 150, x1: 500, y1: 400 };
    for (const k of times(0, 1, 30)) {
      for (const n of [3, 4, 5]) {
        for (const dir of [1, -1] as const) {
          const v = { ...bonebirdVBox(lane, k, n, 40, dir) };
          check(`V k ${k.toFixed(2)} n ${n}`, (ctx) => bonebirdV(ctx, lane, k, n, 40, dir, k * 6, 2), v, 2 + 1);
          expect(v.x0 >= lane.x0 - 1 && v.x1 <= lane.x1 + 1 && v.y0 >= lane.y0 - 1 && v.y1 <= lane.y1 + 1, `V k ${k} n ${n}: inside its lane`).toBe(true);
        }
      }
    }
  });

  it("the ghosts, rising, waving, squashed, both ways", () => {
    const h = 160;
    let shown = 0;
    for (const t of times(6, 40, 160)) {
      for (const land of LANDS) {
        const p = { ...graveGhostAt(t, 0, land) };
        if (p.vis * p.rise <= 0.15) continue;
        shown++;
        for (const dir of [1, -1] as const) check(`ghost t=${t.toFixed(2)}`, (ctx) => ghost(ctx, 300, 300, h, dir, p.rise, p.bob, p.wave, p.squash, 1, 3), { ...ghostBox(300, 300, h, p.rise, p.bob) }, 1, 50);
      }
    }
    expect(shown, "poses seen").toBeGreaterThan(20);
  });

  it("the drifting ghosts of every look keep inside the sheet ghost's box, both ways", () => {
    const h = 160;
    for (const t of times(0, 20, 40)) {
      for (let kind = 0; kind < DRIFT_KINDS; kind++) {
        const bob = Math.sin(t * 1.9);
        for (const dir of [1, -1] as const) check(`drift ghost ${kind} t=${t.toFixed(2)}`, (ctx) => driftGhost(ctx, 300, 300, h, dir, kind, bob, 1, 3, t), { ...ghostBox(300, 300, h, 1, bob) }, 1, 50);
      }
    }
  });

  it("the curtains paint inside their panes only", () => {
    for (const t of times(2, 30, 120)) {
      for (const seed of [0, 1, 2, 3]) {
        const p = { ...curtainAt(t, seed) };
        check(`curtain t=${t.toFixed(2)} seed ${seed}`, (ctx) => curtain(ctx, 200, 200, 60, 90, p), { x0: 200, y0: 200, x1: 260, y1: 290 }, 0, 1000);
      }
    }
  });

  it("the bats: one bat, the ring, a trip, the burst", () => {
    for (const lift of [-1, -0.5, 0, 0.5, 1]) {
      check(`bat lift ${lift}`, (ctx) => {
        ctx.beginPath();
        batPath(ctx, 300, 300, 100, lift);
        ctx.fill();
      }, { x0: 200, x1: 400, y0: 300 - 46, y1: 300 + 46 }, 1);
    }
    for (const t of times(0, 12, 40)) {
      for (const scatter of [0, 0.5, 1]) {
        const r = paint((ctx) => batRing(ctx, 300, 300, 60, t, 1, scatter, "#0b0818"), { ...batRingBox(300, 300, 60, scatter) }, 1, 10, 100);
        expect(r.out, `ring t=${t.toFixed(2)} scatter ${scatter}`).toBe(0);
        if (scatter < 1) expect(r.drawn, `ring t=${t.toFixed(2)}: drawn`).toBeGreaterThan(50);
      }
    }
    for (const k of times(0.02, 0.95, 40)) {
      for (const side of [1, -1] as const) {
        check(`trip k ${k.toFixed(2)} side ${side}`, (ctx) => batTrip(ctx, 300, 400, 20, k, side, "#0b0818"), { ...batTripBox(300, 400, 20, side) }, 1, 5);
        check(`burst k ${k.toFixed(2)} side ${side}`, (ctx) => batBurst(ctx, 300, 450, 16, k, 3, side, "#0b0818"), { ...batBurstBox(300, 450, 16, k, side) }, 1, k < 0.8 ? 5 : -1);
      }
    }
  });

  it("the rare events and the distant creatures", () => {
    for (const k of times(0.05, 0.95, 30)) {
      check(`eyes k ${k.toFixed(2)}`, (ctx) => glowingEyes(ctx, 300, 300, 120, k, 2, k > 0.5 ? 1 : 0), { ...eyesBox(300, 300, 120) }, 1, -1);
      check(`peeker k ${k.toFixed(2)}`, (ctx) => peeker(ctx, 300, 300, 160, k, 1, 3, k > 0.5 ? 1 : -1), { ...peekerBox(300, 300, 160, k) }, 3 + 1);
      for (const dir of [1, -1] as const) check(`carriage k ${k.toFixed(2)}`, (ctx) => carriage(ctx, 300, 300, 300, dir, k * 6, 1, 3), { ...carriageBox(300, 300, 300) }, 1);
      for (const variant of [0, 1]) check(`moon shadow k ${k.toFixed(2)} variant ${variant}`, (ctx) => moonShadow(ctx, 300, 300, 150, k, variant, k * 2.4), { ...moonShadowBox(300, 300, 150, k, variant) }, 1, 0);
      check(`colossus t=${(k * 12).toFixed(2)}`, (ctx) => colossus(ctx, 300, 500, 400, k * 12, "#0b0818", 1), { ...colossusBox(300, 500, 400) }, 1);
      for (const dir of [1, -1] as const) check(`sky-eel t=${(k * 12).toFixed(2)}`, (ctx) => skyEel(ctx, 300, 300, 500, k * 12, "#2a2752", dir), { ...skyEelBox(300, 300, 500) }, 1);
    }
  });
});

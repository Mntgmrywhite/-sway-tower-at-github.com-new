import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import type { Scene } from "../skin";
import { ringRound, SEEN, shadowOver, type Seen } from "./cast";
import { batTripAt, bonebirdAt, catAt, curtainAt, driftGhostAt, DRIFT_KINDS, DRIFT_PATHS, graveGhostAt, rareAt, ratAt, ravenAt, spiderAt } from "./cast/index";
import { inkW } from "./common";
import { crowFlying } from "./crow";
import { crowPose } from "./flight";
import { riderAt } from "./hollow";
import { horseman } from "./horseman";
import { moonAt } from "./sky";
import { ANCHORS, stageAt } from "./stage";
import { breathe, castOnly, column, context, mask, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The cast on the stage (cast.ts), the way the owner's rules hold it:
// - every performer of the start view (the raven on the curio's chimney, the black cat on its ridge,
//   the spiders, the rat on the railing, the grave ghosts, the shadows behind the lit curtains, the
//   bats out of the mansion's belfry, the skeletal bird in the cage) has its first key moment by
//   10 s, then comes round again, and at that moment is drawn whole on screen, at its anchor, out
//   of the tower's column; the first rare event (the bats bursting out of the belfry) shows by 15 s;
// - every stretch of the height story has its performers out within 30 s, each in its lane;
// - no performer puts a pixel in the tower's column above its floor line (the great shadow over
//   the moon's own disc in the start view aside: the disc reaches into the column there);
// - the bat ring and the great shadow never share the moon's face with the Horseman or the crow,
//   nor with each other;
// - a floor landing on the tower startles the cast, and with reduce motion it does not.

const VIEWS = [...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const, [834, 1194, MIN_ZOOM] as const];
const OPENING = 10;
const DT = 0.05;

/** What the cast draws in a frame of the whole scene (world and foreground). */
function seen(s: Scene): Seen[] {
  const kit = kitFor(halloween);
  const ctx = context(8, 8);
  SEEN.on = true;
  SEEN.items = [];
  try {
    kit.world(ctx, s);
    kit.front(ctx, s);
    return SEEN.items.slice();
  } finally {
    SEEN.on = false;
    SEEN.items = [];
  }
}

/** The first moment in [from, to) that `test` holds, or Infinity. */
function first(test: (t: number) => boolean, from = 0, to = 60): number {
  for (let t = from; t < to; t += DT) if (test(t)) return t;
  return Infinity;
}

/** How many times `test` comes true (from false) in [0, to). */
function times(test: (t: number) => boolean, to: number): number {
  let n = 0;
  let was = false;
  for (let t = 0; t < to; t += DT) {
    const now = test(t);
    if (now && !was) n++;
    was = now;
  }
  return n;
}

/** Problems with where a performer's box is: off an edge, under the HUD, in the tower's column above its floor. */
function misplaced(s: Scene, b: Seen): string[] {
  const col = column(s);
  const out: string[] = [];
  const e = 0.5;
  if (b.x0 < -e || b.x1 > s.cssW + e || b.y0 < -e || b.y1 > s.cssH + e) out.push("off the screen's edge");
  if (b.y0 < s.cssH * 0.2 - e) out.push("up under the HUD");
  if (b.y0 < col.floor && b.x1 > col.x0 + e && b.x0 < col.x1 - e) out.push("in the tower's column");
  return out;
}

/** Solid pixels of a drawing inside a box. */
function inside(m: Uint8Array, w: number, b: Seen): number {
  let n = 0;
  for (let y = Math.max(0, Math.floor(b.y0)); y < Math.min(m.length / w, Math.ceil(b.y1)); y++) {
    for (let x = Math.max(0, Math.floor(b.x0)); x < Math.min(w, Math.ceil(b.x1)); x++) n += m[y * w + x]!;
  }
  return n;
}

/** The id of a stage anchor, by name. */
function id(name: string): number {
  const a = ANCHORS[name];
  if (!a) throw new Error(`no anchor ${name}`);
  return a.id;
}
const A = {
  curioChimney: id("curioChimney"),
  curioRidge: id("curioRidge"),
  sweetEave: id("sweetEave"),
  railWebL: id("railWebL"),
  railWebR: id("railWebR"),
  rail: id("rail"),
  cross: id("cross"),
  slab: id("slab"),
  sweetGable: id("sweetGable"),
  curioDormer: id("curioDormer"),
  belfry: id("belfry"),
  cageBird: id("cageBird"),
};
/** The start view's performers: their anchor, what the cast notes them as, and their key moment. */
const START: { name: string; what: string; id: number; key: (t: number) => boolean }[] = [
  { name: "the raven lands on the curio's chimney", what: "raven", id: A.curioChimney, key: (t) => { const p = ravenAt(t, A.curioChimney, Infinity); return p.vis === 1 && !p.flying; } },
  { name: "the black cat sits on the curio's ridge and looks up at the moon", what: "cat", id: A.curioRidge, key: (t) => catAt(t, A.curioRidge, Infinity).look > 0.5 },
  { name: "the spider drops from the sweet shop's eave", what: "spider", id: A.sweetEave, key: (t) => spiderAt(t, A.sweetEave, Infinity).drop > 0.5 },
  { name: "a spider drops on the railing's left web", what: "spider", id: A.railWebL, key: (t) => spiderAt(t, A.railWebL, Infinity).drop > 0.5 },
  { name: "a spider drops on the railing's right web", what: "spider", id: A.railWebR, key: (t) => spiderAt(t, A.railWebR, Infinity).drop > 0.5 },
  { name: "the rat stops on the railing to sniff", what: "rat", id: A.rail, key: (t) => ratAt(t, A.rail, Infinity).sniff > 0.5 },
  { name: "a ghost rises behind the cross", what: "ghost", id: A.cross, key: (t) => graveGhostAt(t, A.cross, Infinity).rise > 0.9 },
  { name: "a ghost rises behind the slab", what: "ghost", id: A.slab, key: (t) => graveGhostAt(t, A.slab, Infinity).rise > 0.9 },
  { name: "a shadow pauses behind the sweet shop's gable curtain", what: "curtain", id: A.sweetGable, key: (t) => curtainAt(t, A.sweetGable).act > 0.5 },
  { name: "a shadow pauses behind the curio's dormer curtain", what: "curtain", id: A.curioDormer, key: (t) => curtainAt(t, A.curioDormer).act > 0.5 },
  { name: "three bats loop out of the mansion's belfry", what: "trip", id: A.belfry, key: (t) => { const p = batTripAt(t, A.belfry); return p !== null && p.k > 0.25 && p.k < 0.6; } },
  { name: "the skeletal bird in the cage hops", what: "bird", id: A.cageBird, key: (t) => bonebirdAt(t, A.cageBird, Infinity).hop > 0.3 },
];

describe.each(VIEWS)("halloween's cast, %ix%i at zoom %s", (W, H, z) => {
  const at = (lvl: number, t: number) => sceneAt(W, H, lvl, t, z);

  it("every start-view performer has its first key moment by 10 s, whole on screen at its anchor, and comes round again", () => {
    for (const p of START) {
      const t = first(p.key);
      expect(t, `${p.name}: by 10 s`).toBeLessThan(OPENING);
      expect(times(p.key, 120), `${p.name}: again and again in two minutes`).toBeGreaterThanOrEqual(3);
      const s = at(0, t);
      const box = seen(s).find((b) => b.what === p.what && b.id === p.id);
      expect(box, `${p.name}: drawn at ${t.toFixed(2)} s`).toBeDefined();
      expect(misplaced(s, box!), `${p.name} at ${t.toFixed(2)} s`).toEqual([]);
      // At its anchor: the box reaches the anchor's point (a walk's span, a window's pane).
      stageAt(s);
      const anchor = ANCHORS[Object.keys(ANCHORS).find((k) => ANCHORS[k]!.id === p.id)!]! as unknown as Record<string, number>;
      const ax0 = anchor.x ?? Math.min(anchor.hx!, anchor.ex!);
      const ax1 = anchor.x !== undefined ? anchor.x + (anchor.w ?? 0) : Math.max(anchor.hx!, anchor.ex!);
      const ay0 = anchor.y ?? Math.min(anchor.hy!, anchor.ey!);
      const ay1 = anchor.y !== undefined ? anchor.y + (anchor.h ?? 0) : Math.max(anchor.hy!, anchor.ey!);
      const m = s.u * 0.01;
      expect(box!.x0 - m <= ax1 && ax0 <= box!.x1 + m && box!.y0 - m <= ay1 && ay0 <= box!.y1 + m, `${p.name}: at its anchor`).toBe(true);
      // And it shows: solid paint in its box.
      const w = Math.round(s.cssW);
      const paint = inside(mask(s.cssW, s.cssH, (ctx) => castOnly(ctx, s)), w, box!);
      expect(paint, `${p.name}: painted`).toBeGreaterThan(8);
    }
  });

  it("the first rare event shows by 15 s: a colony of bats bursts out of the mansion's belfry, in its lane", () => {
    let shown = 0;
    for (let t = 10.8; t < 13.3; t += 0.1) {
      const s = at(0, t);
      const b = seen(s).find((x) => x.what === "burst");
      if (!b) continue;
      expect(b.id, "out of the belfry").toBe(A.belfry);
      expect(misplaced(s, b), `t ${t.toFixed(2)}`).toEqual([]);
      shown++;
    }
    expect(shown, "bursting out for most of 10.8 to 13.3 s").toBeGreaterThan(20);
    const s = at(0, 11.4);
    const b = seen(s).find((x) => x.what === "burst")!;
    expect(inside(mask(s.cssW, s.cssH, (ctx) => castOnly(ctx, s)), Math.round(s.cssW), b), "the bats painted").toBeGreaterThan(30);
  });

  it("no performer puts a pixel in the tower's column above its floor line", async () => {
    // The start, over the rooftops, the skyline, the storm, the spiral sky and a turn of the loop;
    // at moments of the opening and of the rare events (the burst, the shadow, a peek, the carriage, the eyes).
    const levels = W > 600 ? [0, 20, 45, 70, 100, 130, 170, 210] : [0, 12, 20, 30, 45, 60, 70, 85, 100, 115, 130, 150, 170, 190, 210, 230];
    for (const lvl of levels) {
      // Let the masks' pixel reads be freed now and then (see breathe).
      await breathe();
      for (const t of [1, 3.6, 5.5, 8, 11.5, 21, 38.5, 92, 160]) {
        const s = at(lvl, t);
        const col = column(s);
        const w = Math.round(s.cssW);
        const m = mask(s.cssW, s.cssH, (ctx) => castOnly(ctx, s), 8);
        const moon = stageAt(s).moon;
        const start = stageAt(s).band === 0;
        let n = 0;
        for (let y = 0; y < Math.min(Math.round(s.cssH), Math.floor(col.floor)); y++) {
          for (let x = Math.ceil(col.x0); x <= Math.floor(col.x1) && x < w; x++) {
            if (!m[y * w + x]) continue;
            // The great shadow over the moon's own disc, in the start view.
            if (start && Math.hypot(x + 0.5 - moon.x, y + 0.5 - moon.y) < moon.r + 1) continue;
            n++;
          }
        }
        expect(n, `level ${lvl}, t ${t}: cast pixels in the column`).toBe(0);
      }
    }
  }, 120_000);
});

describe("halloween's cast reads on a phone", () => {
  // Readability first: the raven on its chimney pot, the cat on its ridge and the colony bursting
  // out of the belfry keep to far, small roofs, and drawn at their bare depth they were specks of
  // black on a dark roof. At their key moments each stands this big (in u, its box).
  it.each(SCREENS.filter(([W]) => W < 600))("%ix%i: the raven, the cat and the bats' burst are big enough to make out", (W, H) => {
    const box = (t: number, what: string, id: number) => {
      const s = sceneAt(W, H, 0, t);
      const b = seen(s).find((x) => x.what === what && x.id === id);
      expect(b, `the ${what} drawn at ${t.toFixed(2)} s`).toBeDefined();
      return { w: (b!.x1 - b!.x0) / s.u, h: (b!.y1 - b!.y0) / s.u };
    };
    const perched = first((t) => {
      const p = ravenAt(t, A.curioChimney, Infinity);
      return p.vis === 1 && !p.flying;
    });
    expect(box(perched, "raven", A.curioChimney).h, "the raven perched").toBeGreaterThan(0.045);
    expect(box(first((t) => catAt(t, A.curioRidge, Infinity).look > 0.5), "cat", A.curioRidge).w, "the cat looking at the moon").toBeGreaterThan(0.06);
    expect(box(11.6, "burst", A.belfry).h, "the bats bursting out").toBeGreaterThan(0.13);
  });

  it("the shadows behind the curtains, the spider, the caged bird and the bats' trips are big enough to make out (390x844)", () => {
    const [W, H] = [390, 844];
    const px = (t: number, what: string, id: number) => {
      const s = sceneAt(W, H, 0, t);
      const b = seen(s).find((x) => x.what === what && x.id === id);
      expect(b, `the ${what} drawn at ${t.toFixed(2)} s`).toBeDefined();
      return { w: b!.x1 - b!.x0, h: b!.y1 - b!.y0 };
    };
    // A window a shadow passes behind has at least 14 px of glass each way.
    for (const id of [A.sweetGable, A.curioDormer]) {
      const t = first((t) => curtainAt(t, id).vis > 0);
      const b = px(t, "curtain", id);
      expect(Math.min(b.w, b.h), `the curtained window ${id}`).toBeGreaterThanOrEqual(14);
    }
    const spider = px(first((t) => spiderAt(t, A.sweetEave, Infinity).drop > 0.5), "spider", A.sweetEave);
    expect(Math.min(spider.w, spider.h), "the spider on its thread").toBeGreaterThanOrEqual(8);
    expect(px(1, "bird", A.cageBird).w, "the skeletal bird in its cage").toBeGreaterThanOrEqual(9);
    // Three bats looping the belfry: their whole trip spans this much (each bat about a tenth of it).
    expect(px(first((t) => (batTripAt(t, A.belfry)?.vis ?? 0) > 0.5), "trip", A.belfry).w, "the bats' trip").toBeGreaterThanOrEqual(45);
  });
});

describe("halloween's drifting ghosts", () => {
  // Not one grey sheet over and over: each lane's ghosts come in turn as the plain sheet, a tall
  // long-armed one, a tattered one and one with a lantern, big and small, each its own way across
  // (rising, wandering, swooping, looping); the lanes' ghosts keep their own times and never the same
  // ghost twice running in a lane; and they keep off the lanes' scenery (stage.ts: the free sky).
  // (The lanes' free-sky anchors, stage.ts laneL and laneR; the high ghost of each is on its id + 7.)
  const LANE_L = 1101;
  const LANE_R = 1102;
  const LANES = [LANE_L, LANE_R, LANE_L + 7, LANE_R + 7];
  it("come in every look, size and way, never the same ghost twice running in a lane", () => {
    for (const seed of LANES) {
      const kinds = new Set<number>();
      const paths = new Set<number>();
      const sizes: number[] = [];
      let last = -1;
      let out = false;
      for (let t = 0; t < 600; t += 0.1) {
        const d = driftGhostAt(t, seed);
        const now = d.vis > 0;
        if (now && !out) {
          expect(d.kind, `lane ${seed} at ${t.toFixed(1)} s: the same ghost twice running`).not.toBe(last);
          last = d.kind;
          kinds.add(d.kind);
          paths.add(d.path);
          sizes.push(d.size);
        }
        out = now;
      }
      expect(sizes.length, `lane ${seed}: ghosts in ten minutes`).toBeGreaterThan(20);
      expect(kinds.size, `lane ${seed}: its looks`).toBe(DRIFT_KINDS);
      expect(paths.size, `lane ${seed}: its ways across`).toBe(DRIFT_PATHS);
      expect(Math.max(...sizes) - Math.min(...sizes), `lane ${seed}: big and small`).toBeGreaterThan(0.3);
    }
  });

  it("the two lanes keep their own times: seldom both out at once at the same point of their way", () => {
    let both = 0;
    let lockstep = 0;
    for (let t = 0; t < 600; t += 0.25) {
      const l = driftGhostAt(t, LANE_L);
      const lk = l.k;
      const lv = l.vis;
      const r = driftGhostAt(t, LANE_R);
      if (lv <= 0 || r.vis <= 0) continue;
      both++;
      if (Math.abs(lk - r.k) < 0.1) lockstep++;
    }
    expect(lockstep / Math.max(1, both), "in step").toBeLessThan(0.25);
  });
});

/** Which performers each stretch of the height story brings out within 30 s, on every screen. */
const BANDS: [number, string, string[]][] = [
  [20, "over the rooftops", ["cat", "raven", "spider", "ghost", "curtain", "bird", "trip"]],
  [45, "the gothic skyline", ["raven", "spider", "bird", "trip"]],
  [70, "the storm over the spires", ["raven", "spider", "trip", "drift", "curtain", "ring", "colossus"]],
  [100, "the spiral sky", ["colossus", "eel", "vflight", "drift", "trip"]],
  [130, "the floating isles", ["cat", "raven", "spider", "ghost", "curtain", "bird", "drift", "vflight", "colossus", "eel", "trip"]],
  [170, "the witching hour", ["ring", "curtain", "drift", "vflight", "eel", "trip"]],
  [210, "the storm in the loop", ["colossus", "raven", "drift", "vflight", "trip"]],
];

describe("halloween's cast up the height story", () => {
  it.each(VIEWS)("%ix%i at zoom %s: every stretch has its performers out within 30 s, each in its lane", (W, H, z) => {
    for (const [lvl, name, kinds] of BANDS) {
      const out = new Set<string>();
      for (let t = 0; t < 30; t += 0.25) {
        const s = sceneAt(W, H, lvl, t, z);
        for (const b of seen(s)) {
          out.add(b.what);
          // The ring and the shadow cross the moon (their own tests hold them): the rest keep to their lanes.
          if (b.what !== "ring" && b.what !== "shadow") expect(misplaced(s, b), `level ${lvl}, t ${t}: the ${b.what} #${b.id}`).toEqual([]);
        }
      }
      for (const k of kinds) expect(out.has(k), `level ${lvl} (${name}): the ${k}`).toBe(true);
    }
  }, 120_000);
});

/** Pixels of a drawing on the moon's disc. */
function onDisc(s: Scene, draw: (ctx: CanvasRenderingContext2D) => void): number {
  const { x, y, r } = moonAt(s);
  const side = Math.ceil(2 * r);
  const m = mask(side, side, (ctx) => {
    ctx.translate(-(x - r), -(y - r));
    draw(ctx);
  }, 8);
  let n = 0;
  for (let py = 0; py < side; py++) for (let px = 0; px < side; px++) if (m[py * side + px] && Math.hypot(px + 0.5 - r, py + 0.5 - r) < r) n++;
  return n;
}

describe("halloween's moon crossers", () => {
  it("the great shadow crosses the moon only while the Horseman and the crow are off it (the start view, six minutes)", () => {
    let crossed = 0;
    for (const [W, H] of SCREENS) {
      for (let t = 0; t < 360; t += 1 / 15) {
        const r = rareAt(t);
        if (!r || r.kind !== "shadow") continue;
        const s = sceneAt(W, H, 0, t);
        expect(stageAt(s).ring, "no ring in the start view").toBe(0);
        if (onDisc(s, (ctx) => shadowOver(ctx, s)) === 0) continue;
        crossed++;
        const h = { ...riderAt(s) };
        const p = { ...crowPose(s) };
        const rider = h.vis > 0.02 ? onDisc(s, (ctx) => horseman(ctx, h.x, h.y, h.size, s.t, h.tilt, 1, h.dir, h.charge)) : 0;
        const crow = p.perched ? 0 : onDisc(s, (ctx) => crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, inkW(s, 3 / p.z)));
        expect({ rider, crow }, `${W}x${H}, t ${t.toFixed(2)}: on the moon with the shadow`).toEqual({ rider: 0, crow: 0 });
      }
    }
    expect(crossed, "the shadow does cross the moon, again and again").toBeGreaterThan(300);
  });

  it("the bat ring scatters before the great shadow and is off the moon's face while it crosses", () => {
    let crossed = 0;
    let ringed = 0;
    for (const [W, H] of [SCREENS[0], SCREENS[2]]) {
      // The storm over the spires and the witching hour, when the ring is up.
      for (const lvl of [66, 84, 160, 178]) {
        for (let t = 0; t < 240; t += 1 / 10) {
          const r = rareAt(t);
          const s = sceneAt(W, H, lvl, t);
          if (!r || r.kind !== "shadow") {
            // Now and then away from a shadow, the ring is there on the moon's face.
            if (Math.round(t * 10) % 97 === 0 && onDisc(s, (ctx) => ringRound(ctx, s)) > 0) ringed++;
            continue;
          }
          if (onDisc(s, (ctx) => shadowOver(ctx, s)) === 0) continue;
          crossed++;
          expect(onDisc(s, (ctx) => ringRound(ctx, s)), `${W}x${H}, level ${lvl}, t ${t.toFixed(2)}: the ring on the moon with the shadow`).toBe(0);
        }
      }
    }
    expect(crossed, "the shadow crosses the moon at height").toBeGreaterThan(100);
    expect(ringed, "the ring circles the moon's face otherwise").toBeGreaterThan(5);
  }, 120_000);
});

describe("halloween's cast and a new floor", () => {
  it("a floor landing startles the cast; with reduce motion it does not", () => {
    // The cat sitting up on the ridge, the raven on the chimney, a ghost behind the cross, the
    // spiders; and at height the ring round the moon. (The skeletal bird's cage is the scenery's:
    // it swings with a landing, a third as far with reduce motion, and the bird with it.)
    for (const [lvl, t] of [[0, 8.6], [0, 6.5], [70, 3]] as const) {
      const base = sceneAt(390, 844, lvl, t);
      const w = Math.round(base.cssW);
      const draw = (s: Scene) => mask(s.cssW, s.cssH, (ctx) => castOnly(ctx, s), 8);
      const cage = [...seen({ ...base, sinceLand: 0.15 }), ...seen({ ...base, sinceLand: 0.15, still: true })].filter((b) => b.id === A.cageBird);
      const caged = (i: number) => {
        const x = i % w;
        const y = Math.floor(i / w);
        return cage.some((b) => x >= b.x0 - 4 && x <= b.x1 + 4 && y >= b.y0 - 4 && y <= b.y1 + 4);
      };
      const calm = draw(base);
      const jolt = draw({ ...base, sinceLand: 0.15 });
      const still = draw({ ...base, sinceLand: 0.15, still: true });
      let moved = 0;
      let stillMoved = 0;
      for (let i = 0; i < calm.length; i++) {
        if ((calm[i] === jolt[i] && calm[i] === still[i]) || caged(i)) continue;
        moved += calm[i]! ^ jolt[i]!;
        stillMoved += calm[i]! ^ still[i]!;
      }
      expect(moved, `level ${lvl}, t ${t}: pixels the landing changes`).toBeGreaterThan(30);
      expect(stillMoved, `level ${lvl}, t ${t}: with reduce motion`).toBe(0);
    }
  });
});

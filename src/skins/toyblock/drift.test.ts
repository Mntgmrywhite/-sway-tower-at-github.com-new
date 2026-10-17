import { describe, expect, it } from "vitest";
import { heavens, toyBlock } from "../toyblock";
import { drawDrifter, eachVisible, FAR_LANES, LANES, laneX, type Placed } from "./drift";
import { bridge, castle, farTrees, launchPad, portals } from "./far";
import { COLUMN, landShows, RISE1, seaTop } from "./place";
import { cloudSea } from "./sea";
import { lightsSpan, moon, stars, sun } from "./sky";
import { bandMasker, bandOverlap, context, masker, sceneAt, SIZES, VIEWS, type Band } from "./test-scene";
import { DAY_HIGH, LOOP, LOOP_START, toneOf } from "./tone";

// Everything drifting past in the side lanes, all the way up and twice round the loop, on a tall
// and a short phone and on Hard's most zoomed-out view: nothing enters the tower's column or
// touches a side of the screen, nothing in a lane overlaps anything else at its depth, nothing
// ever passes over the sun or the moon (the owner's rule: lane clouds sliding down across the
// sun sliced it in half), and nothing near comes down past the land's landmarks before the cloud
// sea has covered them.

const TOP = LOOP_START + 2 * LOOP + 10;
const LEVELS = Array.from({ length: Math.floor(TOP / 3) + 1 }, (_, i) => i * 3);
/** Masks are drawn at a reduced size to keep this quick. */
const K = 0.4;

interface Seen {
  p: Placed;
  m: Band;
}

/** How far above and below its center an item may reach (u): its mask covers this band. */
const REACH = 0.3;

/** Every item on screen, with its mask (a band of rows around it); checks it fits its band. */
function visible(s: ReturnType<typeof sceneAt>, mk: ReturnType<typeof bandMasker>): Seen[] {
  const tone = toneOf(s);
  const out: Seen[] = [];
  eachVisible(s, (p) => {
    const q = { ...p };
    const m = mk(q.y - s.u * REACH, q.y + s.u * REACH, (ctx) => drawDrifter(ctx, s, tone, q));
    out.push({ p: q, m });
  });
  for (const { p, m } of out) {
    const top = m.y0 > 0 ? m.m.subarray(0, m.w).some((v) => v) : false;
    const bottom = m.y0 + m.h < Math.round(s.cssH * K) ? m.m.subarray(m.m.length - m.w).some((v) => v) : false;
    expect(top || bottom, `${p.d.kind} at ${Math.round(p.at)} reaches past its mask's band`).toBe(false);
  }
  return out;
}

describe("toy kingdom drifters", () => {
  const cases = VIEWS.flatMap(([W, H, u]) => (W === VIEWS[0]![0] ? [0, 5.3] : [0]).map((t) => [W, H, u, t] as const));
  it.each(cases)("%ix%i (u %i) at t=%s: lanes stay clear twice round the loop", { timeout: 60_000 }, (W, H, u, t) => {
    const w = Math.round(W * K);
    const mk = bandMasker(W, H, K);
    const full = masker(W, H, K);
    const kinds = new Set<string>();
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t, u);
      const tone = toneOf(s);
      const items = visible(s, mk);
      const c0 = (s.cssW / 2 - s.u * COLUMN) * K;
      const c1 = (s.cssW / 2 + s.u * COLUMN) * K;
      const top = seaTop(s);
      const celestial: Band = {
        y0: 0,
        h: Math.round(H * K),
        w,
        m: full((ctx) => {
          sun(ctx, s, tone, top);
          moon(ctx, s, tone, top);
        }),
      };
      items.forEach(({ p, m }, i) => {
        kinds.add(p.d.kind);
        const far = p.lane < FAR_LANES;
        const what = `level ${lvl}: ${far ? "far " : ""}${p.d.kind} at ${Math.round(p.at)}`;
        let column = 0;
        let edge = 0;
        for (let k = 0; k < m.m.length; k++) {
          if (!m.m[k]) continue;
          const x = k % w;
          if (x >= c0 && x <= c1) column++;
          if (x === 0 || x === w - 1) edge++;
        }
        expect(column, `${what}: pixels in the tower's column`).toBe(0);
        expect(edge, `${what}: pixels on a side of the screen`).toBe(0);
        for (let j = i + 1; j < items.length; j++) {
          const o = items[j]!;
          if (o.p.lane < FAR_LANES !== far) continue;
          expect(bandOverlap(m, o.m), `${what} overlaps ${o.p.d.kind} at ${Math.round(o.p.at)}`).toBe(0);
        }
        expect(bandOverlap(m, celestial), `${what} crosses the sun or the moon`).toBe(0);
      });
    }
    // Every kind of drifter was on screen at some point on the way up.
    expect([...kinds].sort()).toEqual(
      ["airship", "balloons", "biplane", "cloud", "hotair", "kite", "paper", "parachute", "planet", "rocket", "satellite", "saucer"].sort(),
    );
  });
});

/**
 * The columns (px) the sun and the moon ever reach on this view: both drawn at every half level of
 * the story (rising, up, swelling and setting), the rays turning through a whole spoke.
 */
function lightsColumns(W: number, H: number, u: number): [number, number] {
  const mk = masker(W, H);
  let x0 = W;
  let x1 = -1;
  for (let lvl = 0; lvl <= LOOP_START + LOOP; lvl += 0.5) {
    const s = sceneAt(W, H, lvl, lvl * 1.7, u);
    const tone = toneOf(s);
    const m = mk((ctx) => {
      sun(ctx, s, tone, seaTop(s));
      moon(ctx, s, tone, seaTop(s));
    });
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      const x = i % W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  return [x0, x1];
}

/**
 * The whole backdrop and the shelf, and the same frame with only the sky, the sun, the moon and
 * the cloud sea (which they set into and rise out of), at a level and a moment: how many pixels of
 * the sun or the moon differ between the two (anything else covering them), and how many there are.
 */
function lightsCovered(W: number, H: number, u: number, lvl: number, t: number): { covered: number; shown: number } {
  const c = canvases(W, H);
  const s = sceneAt(W, H, lvl, t, u);
  const tone = toneOf(s);
  const top = seaTop(s);
  const lights = c.mk((ctx) => {
    sun(ctx, s, tone, top);
    moon(ctx, s, tone, top);
  });
  c.all.clearRect(0, 0, W, H);
  toyBlock.ground!(c.all, s);
  toyBlock.foreground!(c.all, s);
  c.sky.clearRect(0, 0, W, H);
  heavens(c.sky, s);
  cloudSea(c.sky, s, tone, top);
  const a = c.all.getImageData(0, 0, W, H).data;
  const b = c.sky.getImageData(0, 0, W, H).data;
  let covered = 0;
  let shown = 0;
  for (let i = 0; i < lights.length; i++) {
    if (!lights[i]) continue;
    shown++;
    const j = i * 4;
    if (Math.max(Math.abs(a[j]! - b[j]!), Math.abs(a[j + 1]! - b[j + 1]!), Math.abs(a[j + 2]! - b[j + 2]!)) > 6) covered++;
  }
  return { covered, shown };
}

/** One set of canvases per screen size, reused across levels. */
const CANVASES = new Map<string, { all: CanvasRenderingContext2D; sky: CanvasRenderingContext2D; mk: ReturnType<typeof masker> }>();
function canvases(W: number, H: number): { all: CanvasRenderingContext2D; sky: CanvasRenderingContext2D; mk: ReturnType<typeof masker> } {
  const key = `${W}x${H}`;
  let c = CANVASES.get(key);
  if (!c) {
    c = { all: context(W, H), sky: context(W, H), mk: masker(W, H) };
    CANVASES.set(key, c);
  }
  return c;
}

/** Squarer screens than a phone's (a tablet, a desktop browser): the land stands taller on them. */
const SQUARE: readonly (readonly [W: number, H: number])[] = [
  [768, 1024],
  [1440, 900],
];

describe("toy kingdom sun and moon", () => {
  // The owner's rule: nothing passes over the sun or the moon, at any height, on any screen.
  // Wherever the sun or the moon is drawn, the whole frame must match the frame with only the
  // sky, the sun, the moon and the cloud sea: nothing else (a lane's cloud or toy, the land, the
  // rocket's smoke, the meadow's toys, the shelf) ever covers a pixel of them. Every level from
  // the start to twice round the loop, the drifters at a different moment of their sway each time.
  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): nothing ever covers them", { timeout: 60_000 }, (W, H, u) => {
    let shown = 0;
    for (let lvl = 0; lvl <= LOOP_START + 2 * LOOP; lvl++) {
      const r = lightsCovered(W, H, u, lvl, (lvl * 0.37) % 30);
      expect(r.covered, `level ${lvl}: pixels of the sun or the moon covered`).toBe(0);
      shown += r.shown;
    }
    expect(shown, "sun and moon pixels checked").toBeGreaterThan(1000);
  });

  // On a squarer screen the land stands taller: the castle's flag must not poke into the sun as
  // the title shows it, nor while it sinks away below as the climb starts.
  it.each(SQUARE)("%ix%i: the castle's flag stays clear of the sun", { timeout: 30_000 }, (W, H) => {
    const u = Math.min(W, H * 0.6);
    for (let lvl = 0; lvl <= RISE1; lvl++) {
      for (const t of [0, 3.1, 6.7]) {
        const r = lightsCovered(W, H, u, lvl, t + lvl * 0.29);
        expect(r.shown, `level ${lvl}: the sun is up`).toBeGreaterThan(500);
        expect(r.covered, `level ${lvl}, t=${t}: pixels of the sun covered`).toBe(0);
      }
    }
  });

  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): lightsSpan holds everything they draw", { timeout: 30_000 }, (W, H, u) => {
    const [x0, x1] = lightsColumns(W, H, u);
    const span = lightsSpan(sceneAt(W, H, 0, 0, u));
    expect(x0).toBeGreaterThanOrEqual(Math.floor(span.x0));
    expect(x1).toBeLessThanOrEqual(Math.ceil(span.x1));
  });
});

describe("toy kingdom lane bounds", () => {
  // Where an item sits across the screen depends only on its lane and the screen, never on the
  // height, and it only sways, bobs and flaps in place: so every item of a lap is drawn at full
  // size at moments through one whole slow sway (by day and by night, when the lamps are lit),
  // and must keep clear of the screen's sides by SIDE px, stay out of the tower's column, and
  // stay out of the columns the sun and the moon ever reach (so, at any height, nothing can pass
  // over them). The far lane on their side has no room on a phone (it is not drawn there) but
  // spreads left of them on a wide view. (The lanes test above samples the climb at a few
  // moments and at a reduced size, which can miss a thin line at the far end of a sway.)
  const SWAY_PERIOD = (2 * Math.PI) / 0.13;
  const MOMENTS = 48;
  const SIDE = 2;
  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): every item keeps clear at every moment", { timeout: 60_000 }, (W, H, u) => {
    const mk = bandMasker(W, H);
    const c0 = Math.floor(W / 2 - u * COLUMN);
    const c1 = Math.ceil(W / 2 + u * COLUMN);
    const [l0, l1] = lightsColumns(W, H, u);
    const y = H / 2;
    const wide = W > SIZES[0][0];
    let leftDrawn = 0;
    for (const lvl of [DAY_HIGH + 6, LOOP_START + 10]) {
      const base = sceneAt(W, H, lvl, 0, u);
      const tone = toneOf(base);
      LANES.forEach((l, lane) => {
        for (const d of l.items) {
          const what = `level ${lvl}: ${lane < FAR_LANES ? "far " : ""}${d.kind} at lap level ${d.lvl.toFixed(1)}`;
          if (Number.isNaN(laneX(base, l, d))) {
            expect(d.m < 0 && l.spread && !wide, `${what} has a place on this view`).toBe(true);
            continue;
          }
          if (d.m < 0) leftDrawn++;
          let x0 = W;
          let x1 = -1;
          for (let i = 0; i < MOMENTS; i++) {
            const s = { ...base, t: (i / MOMENTS) * SWAY_PERIOD };
            const p: Placed = { d, at: 0, lane, x: laneX(s, l, d), y };
            const m = mk(y - u * REACH, y + u * REACH, (ctx) => drawDrifter(ctx, s, tone, p));
            expect(m.m.subarray(0, m.w).some((v) => v) || m.m.subarray(m.m.length - m.w).some((v) => v), `${what} reaches past its band`).toBe(false);
            for (let k = 0; k < m.m.length; k++) {
              if (!m.m[k]) continue;
              const x = k % m.w;
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
            }
          }
          expect(x1, `${what} is drawn`).toBeGreaterThan(0);
          expect(x0, `${what}: room to the left side`).toBeGreaterThanOrEqual(SIDE);
          expect(W - 1 - x1, `${what}: room to the right side`).toBeGreaterThanOrEqual(SIDE);
          expect(x1 < c0 || x0 > c1, `${what} reaches into the tower's column (x ${x0}..${x1})`).toBe(true);
          expect(x1 < l0 - SIDE || x0 > l1 + SIDE, `${what} reaches into the sun's and the moon's columns (x ${x0}..${x1}, theirs ${l0}..${l1})`).toBe(true);
        }
      });
    }
    // Nothing drifts down the left on a phone; on the wide view the far lane spreads left of the lights.
    if (wide) expect(leftDrawn, "far clouds left of the sun on the wide view").toBeGreaterThan(0);
    else expect(leftDrawn, "drifters on the left on a phone").toBe(0);
  });
});

describe("toy kingdom drifters over the land", () => {
  // While the land still shows (until the cloud sea covers it), nothing in the near lanes comes
  // down past the landmarks or the far props: the castle, the launch pad, the bridge, the tunnel
  // mouths and the lollipop trees. (The far lanes are behind the land.)
  it.each(VIEWS.flatMap(([W, H, u]) => [0, 5.3, 11].map((t) => [W, H, u, t] as const)))(
    "%ix%i (u %i) at t=%s: nothing near drifts over the land",
    { timeout: 30_000 },
    (W, H, u, t) => {
      const mk = masker(W, H, 0.5);
      const band = bandMasker(W, H, 0.5);
      let checked = 0;
      for (let lvl = 0; lvl < 70; lvl++) {
        const s = sceneAt(W, H, lvl, t, u);
        const tone = toneOf(s);
        if (!landShows(s, seaTop(s))) continue;
        const props: Band = {
          y0: 0,
          h: Math.round(H * 0.5),
          w: Math.round(W * 0.5),
          m: mk((ctx) => {
            castle(ctx, s, tone);
            launchPad(ctx, s, tone);
            bridge(ctx, s, tone);
            portals(ctx, s, tone);
            farTrees(ctx, s, tone);
          }),
        };
        eachVisible(
          s,
          (p) => {
            checked++;
            const q = { ...p };
            const m = band(q.y - s.u * REACH, q.y + s.u * REACH, (ctx) => drawDrifter(ctx, s, tone, q));
            expect(bandOverlap(m, props), `level ${lvl}: ${q.d.kind} at ${Math.round(q.at)} over the land`).toBe(0);
          },
          (lane) => lane >= FAR_LANES,
        );
      }
      expect(checked, "near drifters seen while the land shows").toBeGreaterThan(5);
    },
  );
});

describe("toy kingdom lanes", () => {
  it("every lap of a lane fits in the loop, lowest first", () => {
    for (const l of LANES) {
      for (let i = 0; i < l.items.length; i++) {
        const d = l.items[i]!;
        expect(d.lvl).toBeGreaterThanOrEqual(0);
        expect(d.lvl).toBeLessThan(LOOP);
        if (i > 0) expect(d.lvl).toBeGreaterThanOrEqual(l.items[i - 1]!.lvl);
      }
    }
  });
});

describe("toy kingdom stars", () => {
  // The night's stars are spread across the screen, kept in from its sides so no star is cut in
  // half by an edge, and out of the tower's column.
  it.each(SIZES.flatMap(([W, H]) => [100, 120, 240].map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: no star touches a side",
    (W, H, lvl) => {
      const s = sceneAt(W, H, lvl, 0);
      const tone = toneOf(s);
      const m = masker(W, H)((ctx) => stars(ctx, s, tone, seaTop(s)));
      let edge = 0;
      let drawn = 0;
      let column = 0;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        drawn++;
        const x = i % W;
        if (x <= 1 || x >= W - 2) edge++;
        if (Math.abs(x - W / 2) < s.u * COLUMN) column++;
      }
      expect(drawn, "stars are out").toBeGreaterThan(50);
      expect(edge, "star pixels on a side of the screen").toBe(0);
      expect(column, "star pixels in the tower's column").toBe(0);
    },
  );
});

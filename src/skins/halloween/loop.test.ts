import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import { balloonBoxes, BALLOON_FIRST, BALLOON_TOP } from "./balloon";
import { DUSK_GLOW, SKY_LOW, SKY_MID, SKY_TOP } from "./common";
import { SWARM_COUNT, swarmSpot } from "./flyers";
import { riderAt } from "./hollow";
import { ISLE_AT, isleAt, ISLES, isles } from "./isles";
import { drowned, ferryBox, mistLife, PIECE_AT, pieceAt, PIECES } from "./drowned";
import { mistTop, restLine } from "./lines";
import { mansionAt } from "./mansion";
import { HALO_REACH, moonAt } from "./sky";
import { breathe, column, context, mask, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import {
  bandOf,
  clockHours,
  HOLLOW_FADE,
  LOOP,
  LOOP_PERIOD,
  LOOP_START,
  MIDNIGHT,
  MIST_GATHER,
  MIST_SETTLED,
  NIGHTFALL,
  STEP,
  STRETCH,
  toneOf,
  toneOfLevel,
  type Tone,
} from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The height story loops: the first pass (dusk on Main Street; over the rooftops night falls and the
// moon eases up out of the way; the gothic skyline; the storm over the spires; the spiral sky), then
// the floating isles, the witching hour, the storm and the spiral calm, every LOOP_PERIOD levels from
// LOOP_START, forever, with no seam. The loop's things (the isles, the witching hour's swarm of bats,
// the balloon) keep to their side lanes over whole loops, and any height renders within the budget.

/** How far apart two tones are: the biggest change in any color channel or (scaled) number. */
function distance(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    const xs = Array.isArray(x) ? x : [x];
    const ys = Array.isArray(y) ? y : [y];
    xs.forEach((v, i) => {
      const w = ys[i]!;
      if (typeof v === "number" && typeof w === "number") d = Math.max(d, Math.abs(v - w) * (key === "moonR" ? 2000 : 60));
      else if (typeof v === "string" && typeof w === "string") {
        if (v.startsWith("#")) {
          for (let k = 1; k < 7; k += 2) d = Math.max(d, Math.abs(parseInt(v.slice(k, k + 2), 16) - parseInt(w.slice(k, k + 2), 16)));
        } else {
          const cv = v.match(/[\d.]+/g) ?? [];
          const cw = w.match(/[\d.]+/g) ?? [];
          cv.forEach((n, k) => (d = Math.max(d, Math.abs(Number(n) - Number(cw[k] ?? 0)) * (k === 3 ? 255 : 1))));
        }
      }
    });
  }
  return d;
}

/** Relative brightness of a #rrggbb color, 0..1 (enough to compare skies). */
function light(c: string): number {
  return (0.2126 * parseInt(c.slice(1, 3), 16) + 0.7152 * parseInt(c.slice(3, 5), 16) + 0.0722 * parseInt(c.slice(5, 7), 16)) / 255;
}

describe("halloween height story", () => {
  it("starts at dusk on Main Street and deepens steadily into night by NIGHTFALL", () => {
    const dusk = toneOfLevel(0);
    expect(dusk.sky).toEqual([SKY_TOP, SKY_MID, SKY_LOW]);
    expect(dusk.glow).toBe(DUSK_GLOW);
    expect(dusk.glowK).toBe(1);
    expect(dusk.hollow).toBe(1);
    let last = light(dusk.sky[2]) + 1;
    let glow = 2;
    for (let lvl = 0; lvl <= NIGHTFALL; lvl += STEP) {
      const t = toneOfLevel(lvl);
      expect(light(t.sky[2]), `level ${lvl}: the sky darkens`).toBeLessThanOrEqual(last + 1e-9);
      expect(t.glowK, `level ${lvl}: the dusk's ember fades`).toBeLessThanOrEqual(glow + 1e-9);
      last = light(t.sky[2]);
      glow = t.glowK;
      expect(t.swarm + t.extraStars + t.ring + t.storm + t.spiral, `level ${lvl}: none of the storm's or the loop's things yet`).toBe(0);
    }
    expect(light(toneOfLevel(NIGHTFALL).sky[2]), "night has fallen").toBeLessThan(light(SKY_LOW) * 0.8);
    expect(light(toneOfLevel(NIGHTFALL).sky[0]), "night has fallen overhead").toBeLessThan(light(SKY_TOP) * 0.7);
    // The hollow is all there through the night, then fades into the mist before the loop.
    expect(toneOfLevel(HOLLOW_FADE[0]).hollow).toBe(1);
    expect(toneOfLevel(HOLLOW_FADE[1]).hollow).toBe(0);
  });

  it("climbs through its stretches in order: the start view held, the storm in D, the spirals in E", () => {
    // The start view (every screen's start level is below B) is Main Street, the moon as it was.
    for (const [W, H] of SCREENS) expect(bandOf(sceneAt(W, H, 0, 0).altitude / 8), `${W}x${H}`).toBe(0);
    expect([0, 13, 31, 56, 96, 130].map(bandOf)).toEqual([0, 1, 2, 3, 4, 4]);
    const at = (lvl: number) => toneOfLevel(lvl);
    expect(at(STRETCH.B).moonUp, "the moon holds still in the start view").toBe(0);
    expect(at(STRETCH.B).moonR).toBeCloseTo(0.145, 6);
    expect(at(52).moonUp, "eased up by the skyline").toBe(1);
    expect(at(60).moonR).toBeCloseTo(0.165, 6);
    expect(at(75).storm, "the storm over the spires").toBe(1);
    expect(at(75).ring, "the bat ring round the moon in the storm").toBe(1);
    expect(at(45).storm + at(45).ring, "none in the skyline").toBe(0);
    expect(at(110).spiral, "the spiral sky").toBeGreaterThan(0.8);
    expect(at(75).bolt, "lightning often in the storm").toBeGreaterThan(at(45).bolt);
    expect(at(45).bolt).toBeGreaterThan(at(5).bolt);
  });

  it("the mist gathers from below the screen over the town, then settles low on the screen with the mansion on it", () => {
    for (const [W, H] of SCREENS) {
      const top = (lvl: number) => mistTop(sceneAt(W, H, lvl, 0));
      expect(top(0), `${W}x${H}: no mist at the start`).toBeGreaterThan(H);
      expect(top(MIST_GATHER[0]), `${W}x${H}`).toBeGreaterThan(H);
      const s = sceneAt(W, H, MIST_GATHER[1], 0);
      expect(top(MIST_GATHER[1])).toBeLessThan(s.horizonY);
      expect(top(MIST_GATHER[1])).toBeGreaterThan(s.horizonY - s.u * 0.1);
      let last = -Infinity;
      for (let lvl = MIST_GATHER[1]; lvl <= LOOP_START + 2 * LOOP_PERIOD; lvl += 1) {
        const y = top(lvl);
        expect(y, `${W}x${H} level ${lvl}: the mist rises again`).toBeGreaterThanOrEqual(last - 1e-6);
        last = y;
      }
      const rest = sceneAt(W, H, MIST_SETTLED, 0);
      expect(top(MIST_SETTLED)).toBeCloseTo(restLine(rest), 6);
      expect(mansionAt(rest).y, `${W}x${H}: the crag's top above the mist`).toBeLessThan(restLine(rest));
    }
  });

  it("repeats exactly every loop, forever: the colors, the moon, the mist, the mansion, its clock and the isles", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + 3 * LOOP_PERIOD; lvl += 0.37) {
      expect(toneOfLevel(lvl + LOOP_PERIOD), `level ${lvl}`).toEqual(toneOfLevel(lvl));
      expect(toneOfLevel(lvl + 11 * LOOP_PERIOD), `level ${lvl}`).toEqual(toneOfLevel(lvl));
      expect(clockHours(lvl + 7 * LOOP_PERIOD), `level ${lvl}: the clock`).toBeCloseTo(clockHours(lvl), 6);
    }
    // The loop's last stretch is the first pass's E: the same tones.
    for (let lvl = STRETCH.E + 1; lvl < LOOP_START; lvl += 0.5) {
      const a = { ...toneOfLevel(lvl), hollow: 0 };
      expect({ ...toneOfLevel(lvl + LOOP_PERIOD), hollow: 0 }, `level ${lvl}`).toEqual(a);
    }
    for (const [W, H] of SCREENS) {
      for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += 7) {
        const a = sceneAt(W, H, lvl, 3);
        const b = sceneAt(W, H, lvl + 2 * LOOP_PERIOD, 3);
        expect(mistTop(b), `${W}x${H} level ${lvl}: the mist`).toBeCloseTo(mistTop(a), 6);
        expect(mansionAt(b).y, `${W}x${H} level ${lvl}: the mansion`).toBeCloseTo(mansionAt(a).y, 6);
        const ma = { ...moonAt(a) };
        const mb = { ...moonAt(b) };
        expect([mb.x, mb.y, mb.r], `${W}x${H} level ${lvl}: the moon`).toEqual([ma.x, ma.y, ma.r]);
        for (let i = 0; i < ISLES.length; i++) {
          const sa = isleAt(a, i);
          const ya = ISLE_AT[i]!.y;
          const sb = isleAt(b, i);
          expect(sb, `${W}x${H} level ${lvl}: isle ${i} shown`).toBe(sa);
          if (sa) expect(ISLE_AT[i]!.y, `${W}x${H} level ${lvl}: isle ${i}`).toBeCloseTo(ya, 6);
        }
      }
    }
  });

  it("goes through the witching hour each time round: the moon burns orange, the bats circle it, the clock strikes twelve", () => {
    const seen = { swarm: 0, ring: 0, storm: 0, spiral: 0, orange: false, noBats: false };
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += STEP) {
      const t = toneOfLevel(lvl);
      seen.swarm = Math.max(seen.swarm, t.swarm);
      seen.ring = Math.max(seen.ring, t.ring);
      seen.storm = Math.max(seen.storm, t.storm);
      seen.spiral = Math.max(seen.spiral, t.spiral);
      seen.orange ||= parseInt(t.moon.slice(5, 7), 16) < 0x80;
      seen.noBats ||= t.bats === 0;
      // The bats round the spire roost before the swarm pours out of the belfry.
      expect(t.swarm > 0.01 && t.bats > 0.01, `level ${lvl}: both the bats and the swarm`).toBe(false);
    }
    expect(seen).toEqual({ swarm: 1, ring: 1, storm: 1, spiral: 1, orange: true, noBats: true });
    for (let k = 0; k < 4; k++) {
      const midnight = LOOP_START + (k + MIDNIGHT) * LOOP_PERIOD;
      expect(Math.min(clockHours(midnight), 12 - clockHours(midnight)), `loop ${k}: midnight`).toBeLessThan(1e-6);
      expect(toneOfLevel(midnight).swarm, `loop ${k}: the swarm is out at midnight`).toBeGreaterThan(0.5);
      expect(toneOfLevel(midnight).ring, `loop ${k}: the ring round the moon`).toBe(1);
      expect(toneOfLevel(midnight).moonR, `loop ${k}: the moon at its largest`).toBeCloseTo(0.175, 6);
    }
    expect(toneOfLevel(LOOP_START + LOOP.isles * LOOP_PERIOD).ring, "the isles' night is calm").toBe(0);
  });

  it("the clock's hands never jump, the loop's start included", () => {
    let last = clockHours(0);
    for (let lvl = 0.05; lvl < LOOP_START + 3 * LOOP_PERIOD; lvl += 0.05) {
      const h = clockHours(lvl);
      const d = Math.abs(h - last);
      expect(Math.min(d, 12 - d), `level ${lvl.toFixed(2)}`).toBeLessThan(0.02);
      last = h;
    }
  });

  it("has no seam: across the loop's start and end it changes no faster than anywhere else", () => {
    let most = 0;
    for (let lvl = LOOP_START + STEP; lvl + 2 * STEP < LOOP_START + LOOP_PERIOD; lvl += STEP) {
      most = Math.max(most, distance(toneOfLevel(lvl), toneOfLevel(lvl + STEP)));
    }
    expect(most, "the loop changes at all").toBeGreaterThan(1);
    for (const at of [STRETCH.E, LOOP_START, LOOP_START + LOOP_PERIOD, LOOP_START + 5 * LOOP_PERIOD]) {
      expect(distance(toneOfLevel(at - STEP), toneOfLevel(at)), `into level ${at}`).toBeLessThanOrEqual(most);
      expect(distance(toneOfLevel(at), toneOfLevel(at + STEP)), `out of level ${at}`).toBeLessThanOrEqual(most);
    }
    expect(distance(toneOfLevel(LOOP_START + LOOP_PERIOD - STEP), toneOfLevel(LOOP_START))).toBeLessThan(2);
  });

  it("paints the same frame either side of the loop's start, and a loop later", () => {
    for (const [W, H] of SCREENS) {
      const kit = kitFor(halloween);
      const frame = (lvl: number) => {
        const ctx = context(W, H);
        const s = sceneAt(W, H, lvl - 1, 4.2);
        kit.world(ctx, s);
        kit.front(ctx, s);
        return ctx.getImageData(0, 0, W, H).data;
      };
      const change = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
        let sum = 0;
        for (let i = 0; i < a.length; i += 4) sum += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
        return sum / (a.length / 4) / 3;
      };
      for (const seam of [STRETCH.E, LOOP_START]) {
        const at = frame(seam);
        // (A twentieth of a level's climb moves almost nothing here: anything popping in or out at
        // the seam, the size of the balloon, would change the frame by about a whole level per channel.)
        expect(change(frame(seam - 0.05), at), `${W}x${H}: mean change per channel across level ${seam}`).toBeLessThan(0.2);
      }
      const at = frame(LOOP_START);
      expect(change(frame(LOOP_START + LOOP_PERIOD), at), `${W}x${H}: a loop later`).toBeLessThan(0.05);
      expect(change(frame(LOOP_START + 7 * LOOP_PERIOD), at), `${W}x${H}: seven loops later`).toBeLessThan(0.05);
    }
  });

  it("leaves the hollow and the Horseman below for good", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 7) {
      expect(riderAt(sceneAt(390, 844, lvl, lvl * 0.31)).vis).toBe(0);
    }
  });
});

describe("halloween loop lanes", () => {
  const VIEWS = SCREENS.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const));

  it.each(VIEWS)("%ix%i at zoom %s: the witching hour's swarm keeps to the right-hand lane, over two loops", (W, H, z) => {
    let seen = 0;
    for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 0.5) {
      const s = sceneAt(W, H, lvl - 1, lvl * 0.53, z);
      if (toneOf(s).swarm <= 0.01) continue;
      const col = column(s);
      for (let i = 0; i < SWARM_COUNT; i++) {
        const b = swarmSpot(s, i);
        if (b.s < s.u * 0.006) continue;
        seen++;
        const box = { x0: b.x - b.s, x1: b.x + b.s, y0: b.y - b.s * 0.46, y1: b.y + b.s * 0.46 };
        expect(box.x0 > col.x1 && box.x1 < s.cssW, `level ${lvl}: bat ${i} out of its lane`).toBe(true);
        expect(box.y0 > s.cssH * 0.2 && box.y1 < s.cssH, `level ${lvl}: bat ${i} in the HUD or off the bottom`).toBe(true);
      }
    }
    expect(seen, "the swarm is out").toBeGreaterThan(500);
  });

  it.each(VIEWS)("%ix%i at zoom %s: the isles keep to their lanes, whole, clear of the moon, over two loops", async (W, H, z) => {
    let seen = 0;
    for (let lvl = STRETCH.E; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 2) {
      // Let the masks' pixel reads be freed now and then (only between turns of the event loop).
      if (lvl % 20 === 0) await breathe();
      const s = sceneAt(W, H, lvl - 1, 1 + lvl * 0.13, z);
      const w = Math.round(s.cssW);
      const h = Math.round(s.cssH);
      const m = moonAt(s);
      const col = column(s);
      for (const side of [-1, 1] as const) {
        const mk = mask(s.cssW, s.cssH, (ctx) => isles(ctx, s, side), 8);
        let inColumn = 0;
        let sides = 0;
        let onMoon = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!mk[y * w + x]) continue;
            seen++;
            if (x >= col.x0 && x <= col.x1 && y < col.floor) inColumn++;
            if (x === 0 || x === w - 1) sides++;
            if (Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y) < m.r * HALO_REACH) onMoon++;
          }
        }
        expect(inColumn, `level ${lvl}, side ${side}: an isle in the tower's column`).toBe(0);
        expect(sides, `level ${lvl}, side ${side}: an isle cut off by a side`).toBe(0);
        expect(onMoon, `level ${lvl}, side ${side}: an isle over the moon or its halo`).toBe(0);
      }
    }
    expect(seen, "the isles are drawn").toBeGreaterThan(5000);
  }, 120_000);

  it.each(VIEWS)("%ix%i at zoom %s: the drowned hollow keeps to the left lane, clear of the moon and the column, over two loops", async (W, H, z) => {
    // Its set pieces (the lighthouse's beam too) stand in the left lane below the moon's halo, never
    // in the tower's column nor cut by the screen's side; one at a time (at most two crossfading,
    // never in each other's way: one is in front of the other only while it fades); the life in the
    // mist (headstones, wisps, the ferry) keeps out of the column.
    let seen = 0;
    for (let lvl = 24; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 2) {
      if (lvl % 20 === 0) await breathe();
      const s = sceneAt(W, H, lvl - 1, 1 + lvl * 0.29, z);
      const w = Math.round(s.cssW);
      const h = Math.round(s.cssH);
      const m = moonAt(s);
      const col = column(s);
      const mk = mask(s.cssW, s.cssH, (ctx) => drowned(ctx, s, toneOf(s)), 8);
      let inColumn = 0;
      let sides = 0;
      let onMoon = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!mk[y * w + x]) continue;
          seen++;
          if (x >= col.x0 && x <= col.x1) inColumn++;
          if (x === 0 || x === w - 1) sides++;
          if (Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y) < m.r * HALO_REACH) onMoon++;
        }
      }
      expect(inColumn, `level ${lvl}: a drowned piece in the tower's column`).toBe(0);
      expect(sides, `level ${lvl}: a drowned piece cut off by a side`).toBe(0);
      expect(onMoon, `level ${lvl}: a drowned piece over the moon or its halo`).toBe(0);
      let shown = 0;
      for (let i = 0; i < PIECES.length; i++) if (pieceAt(s, i) && PIECE_AT[i]!.vis > 0.5) shown++;
      expect(shown, `level ${lvl}: more than one drowned piece in full view`).toBeLessThanOrEqual(1);
      const life = mask(s.cssW, s.cssH, (ctx) => mistLife(ctx, s, toneOf(s)), 8);
      let lifeInColumn = 0;
      for (let y = 0; y < h; y++) for (let x = Math.max(0, Math.ceil(col.x0)); x <= Math.min(w - 1, col.x1); x++) lifeInColumn += life[y * w + x]!;
      expect(lifeInColumn, `level ${lvl}: life in the mist in the tower's column`).toBe(0);
      const f = ferryBox(s);
      if (f) expect(f.x1 < col.x0 || f.x0 > col.x1, `level ${lvl}: the ferry in the column`).toBe(true);
    }
    expect(seen, "the drowned hollow is drawn").toBeGreaterThan(20000);
  }, 120_000);

  it.each(VIEWS)("%ix%i at zoom %s: the balloon keeps to the sky over the moon, clear of its halo, the corner and the column", (W, H, z) => {
    let seen = 0;
    let hovering = 0;
    for (let lvl = 0; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, lvl * 0.71, z);
      const col = column(s);
      const m = moonAt(s);
      for (const b of balloonBoxes(s)) {
        if (b.y1 < 0) continue;
        seen++;
        expect(b.x0 > 0 && b.x1 < col.x0, `level ${lvl}: out of the left lane`).toBe(true);
        if (b.hover) {
          hovering++;
          expect(b.y0, `level ${lvl}: into the corner`).toBeGreaterThanOrEqual(s.cssH * BALLOON_TOP - 0.5);
        }
        expect(b.y1, `level ${lvl}: down to the moon's halo`).toBeLessThan(m.y - m.r * HALO_REACH);
      }
    }
    expect(seen, "the balloon comes by on the first pass and in each loop").toBeGreaterThan(100);
    expect(hovering, "and keeps you company a while").toBeGreaterThan(seen * 0.5);
    expect(BALLOON_FIRST[0]).toBeGreaterThan(12);
  });
});

describe("halloween at any height", () => {
  it.each(SCREENS)("%ix%i: renders every height up to 2000 within the frame budget", (W, H) => {
    const kit = kitFor(halloween);
    const ctx = context(W, H);
    const times: number[] = [];
    for (let lvl = 0; lvl <= 2000; lvl += 13) {
      const s = sceneAt(W, H, lvl, lvl * 0.17);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    // Generous for a shared test machine; frames measure about 1-9 ms here (see the report).
    expect(times[Math.floor(times.length / 2)]!).toBeLessThan(40);
  });
});

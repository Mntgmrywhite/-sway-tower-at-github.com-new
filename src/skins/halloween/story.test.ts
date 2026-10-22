import { afterEach, describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { balloons } from "./balloon";
import { embers } from "./embers";
import { flyers } from "./flyers";
import { ISLE_AT, isleAt, ISLES, isles } from "./isles";
import { bellTower, bellTowerAt, CATHEDRAL_BOX, cathedral, cathedralAt, chimneyStack, chimneyStackAt, NEAR_AT, nearSpire, nearSpireAt, roofs, roofsAt, ROOFS_AT, STORM_AT } from "./skyline";
import { drowned, mistLife, PIECE_AT, pieceAt, PIECES } from "./drowned";
import { moonAt } from "./sky";
import { ribbons, spirals, stormClouds } from "./storm";
import { breathe, column, context, mask, MIN_ZOOM, sceneAt, SCREENS, SIZES } from "./test-scene";
import { mansion } from "./mansion";
import { LOOP_PERIOD, LOOP_START, toneOf } from "./tone";
import { cemetery, village } from "./village";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The height story (the owner's guide): as the tower grows the scenery evolves from the foggy
// village (its far houses and hill cemetery) into a gothic skyline (the cathedral, crooked roofs,
// a spire and chimneys close by), a storm over the spires (storm clouds, the bell tower, the crooked
// lighthouse turning its beam), and a surreal sky (huge spirals, the floating isles and their impossible things);
// each stretch draws its things out in the side lanes, never behind the tower. The moon eases up and
// swells smoothly (never a jump) and keeps exact time with the loop.

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;

/** What each stretch shows: a level well inside it, and the drawings it must show there. */
const STRETCHES: [string, number[], [string, Draw][]][] = [
  ["the far village", [20, 24], [["the village", (c, s) => village(c, s, toneOf(s))], ["the hill cemetery", (c, s) => cemetery(c, s)]]],
  ["the gothic skyline", [44, 58], [["the cathedral", (c, s) => cathedral(c, s, toneOf(s))], ["the crooked roofs", (c, s) => roofs(c, s)]]],
  ["things close by", [52, 62], [["the near spire", (c, s) => nearSpire(c, s)], ["the chimney stack", (c, s) => chimneyStack(c, s)]]],
  ["the storm", [72, 76], [["the storm clouds", (c, s) => stormClouds(c, s, toneOf(s))], ["the bell tower", (c, s) => bellTower(c, s)], ["the lighthouse", (c, s) => drowned(c, s, toneOf(s))]]],
  ["the drowned hollow", [36, 120, LOOP_START + 30, LOOP_START + 55, LOOP_START + 110], [["its set pieces", (c, s) => drowned(c, s, toneOf(s))], ["life in the mist", (c, s) => mistLife(c, s, toneOf(s))]]],
  ["the spiral sky", [108, LOOP_START + 108], [["the spirals", (c, s) => spirals(c, s, toneOf(s))]]],
  ["the isles", [LOOP_START + 10, LOOP_START + 30], [["the isles", (c, s) => { isles(c, s, -1); isles(c, s, 1); }]]],
  ["the ribbons round the moon", [0, 40, LOOP_START + 10], [["the ribbons", (c, s) => ribbons(c, s, toneOf(s))]]],
];

describe("halloween height story", () => {
  it.each(SCREENS)("%ix%i: each stretch draws its things, out in the lanes", (W, H) => {
    for (const [stretch, levels, draws] of STRETCHES) {
      for (const [name, draw] of draws) {
        let most = 0;
        for (const lvl of levels) {
          for (const t of [1, 4]) {
            const s = sceneAt(W, H, lvl, t);
            const m = mask(W, H, (ctx) => draw(ctx, s));
            const col = column(s);
            let inLanes = 0;
            for (let i = 0; i < m.length; i++) {
              if (!m[i]) continue;
              const x = i % W;
              if (x < col.x0 || x > col.x1) inLanes++;
            }
            most = Math.max(most, inLanes);
          }
        }
        expect(most, `${stretch}: ${name} drawn in the lanes`).toBeGreaterThan(300);
      }
    }
  }, 60_000);

  // The owner's guide at New Year's craft: from the gothic skyline on, every frame holds a big lit set
  // piece in each lane, standing out of the mist: about the lane's width (0.22u on a phone), its
  // windows, lamps or lanterns alight. (Left: the drowned hollow's pieces, the isles, the crooked
  // roofs; right: the mansion on its crag, with the isles, the cathedral, the spire and the bell
  // tower passing above it.)
  const PIECES_BY_LANE: Record<"-1" | "1", [string, Draw][]> = {
    "-1": [
      ["the drowned hollow", (c, s) => drowned(c, s, toneOf(s))],
      ["the isles", (c, s) => isles(c, s, -1)],
      ["the crooked roofs", (c, s) => roofs(c, s)],
    ],
    "1": [
      ["the mansion", (c, s) => mansion(c, s, toneOf(s).hill, false, toneOf(s).hollow, toneOf(s).swarm)],
      ["the isles", (c, s) => isles(c, s, 1)],
      ["the cathedral", (c, s) => cathedral(c, s, toneOf(s))],
      ["the bell tower", (c, s) => bellTower(c, s)],
    ],
  };

  /** The biggest lit piece drawn in a lane: its width (px, inside the lane) and how many of its pixels glow. */
  function biggestLit(W: number, H: number, s: Scene, side: -1 | 1): { width: number; tall: number; lit: number; what: string } {
    const col = column(s);
    let best = { width: 0, tall: 0, lit: 0, what: "" };
    for (const [what, draw] of PIECES_BY_LANE[side < 0 ? "-1" : "1"]) {
      const ctx = context(W, H);
      draw(ctx, s);
      const px = ctx.getImageData(0, 0, W, H).data;
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      let lit = 0;
      for (let y = 0; y < H; y++) {
        for (let x = side < 0 ? 0 : Math.ceil(col.x1); x < (side < 0 ? Math.floor(col.x0) : W); x++) {
          const i = (y * W + x) * 4;
          if (px[i + 3]! < 160) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          const r = px[i]!;
          const g = px[i + 1]!;
          const b = px[i + 2]!;
          // Lamp and window gold, or the lighthouse's ghost-green lamp.
          if ((r > 200 && g > 120 && b < 150) || (g > 190 && b > 140 && r < 200)) lit++;
        }
      }
      const width = x1 - x0 + 1;
      if (lit >= 12 && width > best.width) best = { width, tall: y1 - y0 + 1, lit, what };
    }
    return best;
  }

  it.each(SIZES)("%ix%i: from level 30 up a big lit set piece stands in each lane at every height (every 10 levels, two loops)", async (W, H) => {
    for (let lvl = 30; lvl <= LOOP_START + 2 * LOOP_PERIOD; lvl += 10) {
      await breathe();
      for (const t of [2, 6.5]) {
        const s = sceneAt(W, H, lvl, t);
        for (const side of [-1, 1] as const) {
          const b = biggestLit(W, H, s, side);
          expect(b.width, `level ${lvl}, t=${t}, ${side < 0 ? "left" : "right"} lane: its biggest lit piece (${b.what || "none"}) is ${b.width} px wide`).toBeGreaterThanOrEqual(0.2 * s.u);
          expect(b.tall, `level ${lvl}, t=${t}, ${side < 0 ? "left" : "right"} lane: ${b.what} stands ${b.tall} px tall`).toBeGreaterThanOrEqual(0.12 * s.u);
        }
      }
    }
  }, 120_000);

  it("on a tablet the lanes' pieces fill their wide lanes (they are scaled to the lane, not to u)", async () => {
    // (A tall piece on a tablet's short sky slides off the screen's bottom as you climb past it: most
    // of the time its widest part is in view, never is the lane left with a sliver.)
    const [W, H] = [834, 1194];
    const fills: number[] = [];
    for (let lvl = 30; lvl <= LOOP_START + LOOP_PERIOD; lvl += 5) {
      await breathe();
      const s = sceneAt(W, H, lvl, 2);
      const col = column(s);
      for (const side of [-1, 1] as const) {
        const b = biggestLit(W, H, s, side);
        const lane = side < 0 ? col.x0 : W - col.x1;
        fills.push(b.width / lane);
        expect(b.width / lane, `level ${lvl}, ${side < 0 ? "left" : "right"} lane: ${b.what} fills ${(b.width / lane).toFixed(2)} of it`).toBeGreaterThanOrEqual(0.3);
      }
    }
    fills.sort((a, b) => a - b);
    expect(fills[Math.floor(fills.length * 0.2)], "four in five of the lanes' frames: their piece fills most of the lane").toBeGreaterThanOrEqual(0.6);
  }, 120_000);

  it.each(SCREENS)("%ix%i: at most two tall pieces share a lane at once (the right lane: the mansion and one more)", (W, H) => {
    // The owner saw the near spire, the cathedral, the mansion and the bell tower piled up in the
    // right lane: they take turns, each fading in as the one before fades out (one in full view).
    for (let lvl = 14; lvl <= LOOP_START + 2 * LOOP_PERIOD; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, 3);
      const full = (v: number) => (v > 0.5 ? 1 : 0);
      cathedralAt(s);
      nearSpireAt(s);
      bellTowerAt(s);
      roofsAt(s);
      chimneyStackAt(s);
      let right = 1 + full(CATHEDRAL_BOX.vis) + full(NEAR_AT.spire.vis) + full(STORM_AT.bell.vis);
      let left = full(ROOFS_AT.vis) + full(NEAR_AT.pots.vis);
      for (let i = 0; i < ISLES.length; i++) {
        if (!isleAt(s, i)) continue;
        if (ISLES[i]!.side > 0) right += full(ISLE_AT[i]!.vis);
        else left += full(ISLE_AT[i]!.vis);
      }
      for (let i = 0; i < PIECES.length; i++) if (pieceAt(s, i)) left += full(PIECE_AT[i]!.vis);
      expect(right, `level ${lvl}: tall pieces in the right lane`).toBeLessThanOrEqual(2);
      expect(left, `level ${lvl}: tall pieces in the left lane`).toBeLessThanOrEqual(2);
    }
  });

  it("every isle comes by in each turn of the loop, one after another, drawn where it stands", () => {
    // Each isle on its own: placed on screen and its lane's drawing painted round its spot (its top
    // surface's middle), not just something somewhere in its lane.
    const seen = new Set<number>();
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += 1) {
      const s = sceneAt(390, 844, lvl, 2);
      for (const side of [-1, 1] as const) {
        const m = mask(390, 844, (ctx) => isles(ctx, s, side));
        for (let i = 0; i < ISLES.length; i++) {
          if (ISLES[i]!.side !== side || !isleAt(s, i) || ISLE_AT[i]!.vis < 0.5) continue;
          const { x, y } = ISLE_AT[i]!;
          let n = 0;
          for (let py = Math.max(0, Math.round(y - 8)); py < Math.min(844, Math.round(y + 8)); py++) {
            for (let px = Math.max(0, Math.round(x - 12)); px < Math.min(390, Math.round(x + 12)); px++) n += m[py * 390 + px]!;
          }
          if (n > 60) seen.add(i);
        }
      }
    }
    expect([...seen].sort((a, b) => a - b), "the isles seen").toEqual(ISLES.map((_, i) => i));
  });

  it.each(SCREENS)("%ix%i: each isle, with all that stands on it, fills its lane (0.2u and more on a phone)", (W, H) => {
    const most = ISLES.map(() => 0);
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += 1) {
      const s = sceneAt(W, H, lvl, 2);
      for (let i = 0; i < ISLES.length; i++) {
        if (!isleAt(s, i) || ISLE_AT[i]!.vis < 0.9 || ISLE_AT[i]!.top < 0 || ISLE_AT[i]!.bottom > H) continue;
        const it = ISLES[i]!;
        const col = column(s);
        const m = mask(W, H, (ctx) => isles(ctx, s, it.side), 60);
        let x0 = Infinity;
        let x1 = -Infinity;
        for (let y = Math.max(0, Math.round(ISLE_AT[i]!.top)); y < Math.min(H, Math.round(ISLE_AT[i]!.bottom)); y++) {
          for (let x = 0; x < W; x++) {
            if (!m[y * W + x] || (x >= col.x0 && x <= col.x1)) continue;
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
          }
        }
        const lane = it.side < 0 ? col.x0 : W - col.x1;
        most[i] = Math.max(most[i]!, (x1 - x0 + 1) / (W > 600 ? lane : s.u));
      }
    }
    for (let i = 0; i < ISLES.length; i++) {
      expect(most[i]!, `${W}x${H}: isle ${i} (${ISLES[i]!.kind}) across ${W > 600 ? "of its lane" : "in u"}`).toBeGreaterThanOrEqual(W > 600 ? 0.5 : 0.2);
    }
  });

  // The owner's rule (the Valentine's complaint): at height the interest belongs in the side lanes,
  // never behind the tower. Every piece of the story, and what flies or floats beside it, keeps out of
  // the tower's column (with its margin) above the floor line, at every height over two loops. (The
  // sky's own clouds, spirals and ribbons, the far city on the horizon and the blowing leaves may
  // pass behind it: the calm test holds them quiet there.)
  const LANE_PIECES: [string, Draw][] = [
    ["the far village", (c, s) => village(c, s, toneOf(s))],
    ["the hill cemetery", (c, s) => cemetery(c, s)],
    ["the cathedral", (c, s) => cathedral(c, s, toneOf(s))],
    ["the crooked roofs", (c, s) => roofs(c, s)],
    ["the near spire", (c, s) => nearSpire(c, s)],
    ["the chimney stack", (c, s) => chimneyStack(c, s)],
    ["the bell tower", (c, s) => bellTower(c, s)],
    ["the left isles", (c, s) => isles(c, s, -1)],
    ["the right isles", (c, s) => isles(c, s, 1)],
    ["the drowned hollow", (c, s) => drowned(c, s, toneOf(s))],
    ["the life in the mist", (c, s) => mistLife(c, s, toneOf(s))],
    ["the mansion", (c, s) => mansion(c, s, toneOf(s).hill, false, toneOf(s).hollow, toneOf(s).swarm)],
    ["the crows and bats", (c, s) => flyers(c, s, toneOf(s))],
    ["the balloon", (c, s) => balloons(c, s)],
    ["the fireflies", (c, s) => embers(c, s)],
  ];

  it.each([...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const])(
    "%ix%i at zoom %s: nothing of the story stands behind the tower: its pieces keep to the lanes at every height (two loops)",
    async (W, H, z) => {
      const inColumn = (s: Scene, draw: Draw): number => {
        const col = column(s);
        const w = Math.round(s.cssW);
        const m = mask(s.cssW, s.cssH, (ctx) => draw(ctx, s));
        let n = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const x = i % w;
          if (x >= col.x0 && x <= col.x1 && Math.floor(i / w) < col.floor) n++;
        }
        return n;
      };
      for (let lvl = 12; lvl <= LOOP_START + 2 * LOOP_PERIOD; lvl += 3) {
        if (lvl % 30 === 0) await breathe();
        for (const t of [2.3, 7.1]) {
          const s = sceneAt(W, H, lvl, t, z);
          // All of them at once; on a hit, each alone to name it.
          if (inColumn(s, (c, sc) => LANE_PIECES.forEach(([, d]) => d(c, sc))) === 0) continue;
          for (const [name, draw] of LANE_PIECES) expect(inColumn(s, draw), `level ${lvl}, t=${t}: ${name} in the tower's column`).toBe(0);
        }
      }
    },
    120_000,
  );

  it.each([...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const])(
    "%ix%i at zoom %s: the moon eases up and swells smoothly, never a jump, and keeps time with the loop",
    (W, H, z) => {
      let last = { ...moonAt(sceneAt(W, H, 0, 0, z)) };
      const start = { ...last };
      for (let lvl = 0.5; lvl <= 2000; lvl += 0.5) {
        const m = { ...moonAt(sceneAt(W, H, lvl, 0, z)) };
        expect(Math.abs(m.y - last.y), `level ${lvl}: the moon's height`).toBeLessThanOrEqual(1);
        expect(Math.abs(m.r - last.r), `level ${lvl}: its size`).toBeLessThanOrEqual(1);
        expect(m.x, `level ${lvl}: it stays left of the tower`).toBe(start.x);
        expect(m.x - m.r, `level ${lvl}: whole on screen`).toBeGreaterThan(0);
        last = m;
        if (lvl >= LOOP_START && lvl < LOOP_START + LOOP_PERIOD) {
          const n = { ...moonAt(sceneAt(W, H, lvl + 3 * LOOP_PERIOD, 0, z)) };
          expect(n.y, `level ${lvl}: a loop later`).toBeCloseTo(m.y, 6);
          expect(n.r, `level ${lvl}: a loop later`).toBeCloseTo(m.r, 6);
        }
      }
      // The start view's moon is where the opening's timings were laid out.
      for (let lvl = 0; lvl <= 12; lvl++) expect(moonAt(sceneAt(W, H, lvl, 0, z)).y, `level ${lvl}`).toBe(start.y);
    },
    60_000,
  );
});

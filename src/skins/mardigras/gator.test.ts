import { describe, expect, it } from "vitest";
import { mardiGras } from "../mardigras";
import type { Scene } from "../skin";
import { drawDrifter, eachVisible } from "./drift";
import { cloudFloor, floorTop } from "./far";
import { gatorAt, gatorUp, kingGator } from "./gator";
import { skyIsland } from "./island";
import { rightLaneClear } from "./lane";
import { queenUp } from "./queen";
import { fireworks, rightFireworks, rightShowBox } from "./sky";
import { context, mask, overlap, sceneAt, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, storyLevel, toneAtLevel, toneOf } from "./tone";

// The King Gator, the night parade's second great float, standing out of the clouds in the right
// lane across the tower from the Carnival Queen (gator.ts), and the right lane's fireworks over him
// (sky.ts): he rises after her at the night parade and sinks with her before every dawn, by height
// (and, in the first pass, as Sky Islands' island sinks below the clouds), so the story's loop
// comes round with no seam; whenever he is up he is whole on screen, out of the tower's column
// with all his motion, and under the right lane's fireworks; neither he nor the fireworks ever
// meet the island or anything drifting down the lane, on phones, tablets, a desktop window and
// zoomed out; and on a phone, a short phone and a tablet the lane's story is laid out so that only
// the island ever holds him back.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [834, 1194, 1],
  [1024, 1366, 1],
  [1440, 900, 1],
  [390, 844, 0.8],
  [390, 844, 0.6],
  [375, 667, 0.6],
] as const;
/** The screens a player has (full size): the lane's story is laid out for these. */
const DEVICES = [
  [390, 844],
  [375, 667],
  [834, 1194],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** Moments over his rock, his jaw, his blinks, his plume's trembling and the bulbs' chase. */
const TIMES = [0, 1.9, 4.4, 7.3, 11.6] as const;
const TOP = LOOP_START + LOOP * 2 + 10;
const K = 0.5;

/** The King Gator as he shows: drawn, then everything the cloud floor covers taken away. */
function visibleGator(s: Scene): Uint8Array {
  const tone = toneOf(s);
  const floor = floorTop(s, level(s));
  return mask(
    s.cssW,
    s.cssH,
    (ctx) => {
      kingGator(ctx, s, tone, floor);
      ctx.globalCompositeOperation = "destination-out";
      cloudFloor(ctx, s, tone, floor);
      ctx.globalCompositeOperation = "source-over";
    },
    K,
  );
}

describe("mardi gras king gator", () => {
  it("rises after the Queen at the night parade, stands all night, and sinks with her before every dawn: smoothly, and the same on every turn of the loop", () => {
    expect(gatorUp(40)).toBe(0);
    expect(gatorUp(80)).toBe(1);
    expect(gatorUp(LOOP_START - 1)).toBe(1);
    let up = 0;
    let down = 0;
    for (let lvl = 0; lvl < TOP; lvl += 0.25) {
      const a = gatorUp(lvl);
      const b = gatorUp(lvl + 0.25);
      expect(Math.abs(b - a), `level ${lvl}: no jump`).toBeLessThan(0.05);
      if (b > a) up++;
      if (b < a) down++;
      if (lvl >= LOOP_START) expect(gatorUp(lvl + LOOP), `level ${lvl}`).toBeCloseTo(a, 9);
      // He comes up after the Queen and is down before she is.
      expect(a, `level ${lvl}: up before the Queen`).toBeLessThanOrEqual(queenUp(lvl) + 1e-9);
      // Up only by night, once the right lane's fireworks are going or gone.
      if (a > 0) expect(toneAtLevel(lvl).sunSet, `level ${lvl}: up while the sun is`).toBe(1);
    }
    expect(up, "he rises").toBeGreaterThan(10);
    expect(down, "he sinks").toBeGreaterThan(10);
  });

  it.each(SCREENS)("%ix%i at zoom %s: whole on screen, out of the tower's column with all his motion, and under the right lane's fireworks", (W0, H0, z) => {
    let seen = 0;
    for (let lvl = 60; lvl < TOP; lvl += 3) {
      for (const t of TIMES) {
        const s = screenAt(W0, H0, z, lvl, t);
        if (gatorAt(s).up <= 0) continue;
        const m = visibleGator(s);
        const w = Math.round(s.cssW * K);
        const column = Math.ceil((s.baseX + s.baseW + s.u * 0.05) * K);
        const show = rightShowBox(s).b * K;
        let drawn = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          drawn++;
          const x = i % w;
          const y = Math.floor(i / w);
          const what = `level ${lvl}, t=${t}`;
          if (x <= column) expect.fail(`${what}: in the tower's column at x=${x / K}`);
          if (x >= w - 1) expect.fail(`${what}: touches the screen's side`);
          if (y <= show) expect.fail(`${what}: up among the right lane's fireworks at y=${y / K}`);
        }
        if (drawn > 0) seen++;
      }
    }
    expect(seen, "he is seen").toBeGreaterThan(30);
  }, 120_000);

  it.each(SCREENS)("%ix%i at zoom %s: never meets Sky Islands' island or anything drifting down the lane", (W0, H0, z) => {
    let checked = 0;
    for (let lvl = 40; lvl < TOP; lvl += 1) {
      const s = screenAt(W0, H0, z, lvl, (lvl * 1.37) % 13);
      if (gatorAt(s).up <= 0) continue;
      const tone = toneOf(s);
      const g = visibleGator(s);
      const island = mask(s.cssW, s.cssH, (ctx) => skyIsland(ctx, s, mardiGras.bars), K);
      expect(overlap(g, island), `level ${lvl}: he meets the island`).toBe(0);
      eachVisible(s, (d) => {
        const m = mask(s.cssW, s.cssH, (ctx) => drawDrifter(ctx, s, tone, d), K);
        expect(overlap(g, m), `level ${lvl}: he meets the ${d.kind} at ${Math.round(d.at)}`).toBe(0);
      });
      checked++;
    }
    expect(checked, "levels he is up at").toBeGreaterThan(100);
  }, 120_000);

  it.each(DEVICES)("%ix%i: the lane's story leaves him room: only the island holds him back, in the first pass", (W, H) => {
    for (let lvl = 40; lvl < TOP; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, 2.2);
      const g = gatorAt(s);
      if (lvl >= 82) expect(g.up, `level ${lvl}: held down`).toBeCloseTo(gatorUp(level(s)), 9);
      // The right lane's fireworks are held back only while the island passes, too.
      if (lvl >= 70 && toneOf(s).rightShow > 0) expect(rightLaneClear(s, rightShowBox(s)), `level ${lvl}: the right show held back`).toBe(1);
    }
    // And he is all the way up for the night once the island has gone, on every one of them.
    expect(gatorAt(sceneAt(W, H, 86, 0)).up).toBe(1);
  });
});

describe("mardi gras right lane's fireworks", () => {
  it.each(SCREENS)("%ix%i at zoom %s: they keep to the right lane, over the Gator, and never burst over the island or a throw", (W0, H0, z) => {
    // The night parade of the first pass (as the island passes, on a tall screen) and of the loop.
    let sparks = 0;
    for (const lvl of [58, 62, 66, 72, 78, 84, LOOP_START + LOOP + 60, LOOP_START + LOOP + 70, LOOP_START + LOOP + 82]) {
      const s0 = screenAt(W0, H0, z, lvl, 0);
      const tone = toneOf(s0);
      const clear = rightLaneClear(s0, rightShowBox(s0));
      const w = Math.round(s0.cssW * K);
      const column = Math.ceil((s0.baseX + s0.baseW + s0.u * 0.05) * K);
      const lowest = rightShowBox(s0).b * K + 1;
      const others = mask(
        s0.cssW,
        s0.cssH,
        (ctx) => {
          skyIsland(ctx, s0, mardiGras.bars);
          eachVisible(s0, (d) => drawDrifter(ctx, s0, tone, d));
        },
        K,
      );
      const g = gatorAt(s0);
      for (let n = 0; n < 60; n++) {
        const s = { ...s0, t: n * 0.37 };
        const m = mask(s.cssW, s.cssH, (ctx) => rightFireworks(ctx, s, tone, clear), K);
        expect(overlap(m, others), `level ${lvl}, t=${s.t.toFixed(2)}: a spark over the island or a throw`).toBe(0);
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          sparks++;
          const x = i % w;
          const y = Math.floor(i / w);
          const what = `level ${lvl}, t=${s.t.toFixed(2)}`;
          if (x <= column) expect.fail(`${what}: a spark in the tower's column at x=${x / K}`);
          if (x >= w - 1) expect.fail(`${what}: a spark on the screen's side`);
          if (y > lowest) expect.fail(`${what}: a spark below the show's reach at y=${y / K}`);
          if (g.up > 0 && y >= (g.y - 2.95 * g.r) * K) expect.fail(`${what}: a spark on the Gator`);
        }
      }
    }
    expect(sparks, "the right lane's fireworks burst").toBeGreaterThan(1000);
  }, 120_000);

  it("both shows build toward the finale: more shells, and fancier ones, as the night goes on", () => {
    const W = 390;
    const H = 844;
    const painted = (lvl: number, draw: (ctx: CanvasRenderingContext2D, s: Scene) => void) => {
      let n = 0;
      for (let k = 0; k < 120; k++) {
        const s = sceneAt(W, H, lvl, k * 0.29);
        const ctx = context(W, H, K);
        draw(ctx, s);
        const data = ctx.getImageData(0, 0, Math.round(W * K), Math.round(H * K)).data;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) n++;
      }
      return n;
    };
    const left = (ctx: CanvasRenderingContext2D, s: Scene) => fireworks(ctx, s, toneOf(s));
    const right = (ctx: CanvasRenderingContext2D, s: Scene) => rightFireworks(ctx, s, toneOf(s), 1);
    // Story levels: the show's start, and its height near the finale (tone.ts).
    const early = LOOP_START + LOOP + 59 - 10 + 40;
    const late = LOOP_START + LOOP + 76 - 10 + 40;
    expect(storyLevel(early)).toBe(59);
    expect(storyLevel(late)).toBe(76);
    expect(painted(late, left), "the left show at its finale").toBeGreaterThan(painted(early, left) * 1.5);
    expect(painted(late, right), "the right show at its finale").toBeGreaterThan(painted(early, right) * 1.5);
  }, 60_000);
});

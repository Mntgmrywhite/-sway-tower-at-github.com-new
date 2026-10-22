import { describe, expect, it } from "vitest";
import { cameoBounds } from "../cameo";
import { eachVisible } from "./drift";
import { floorTop } from "./far";
import { gatorAt, GATOR_REACH } from "./gator";
import { islandFrame } from "./island";
import { queenAt, QUEEN_REACH } from "./queen";
import { sunAt, SUN_REACH } from "./sky";
import { sceneAt } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// The owner wants the climb "more living and breathing", like New Year's and Christmas with "a
// ton of detail on higher stacks": from level 30 up through two whole turns of the story's loop,
// both side lanes show something of the Carnival at every height, on a phone, a short phone and a
// tablet. The left lane: the sun (until it has gone into the clouds), the masked moon (from as the
// sun goes down), the Carnival Queen standing out of the clouds, the night parade's fireworks. The
// right lane: the city below until the clouds cover it, Sky Islands' island drifting by, the
// throws and the birds drifting down it, the King Gator standing out of the clouds and the
// fireworks over him.

const TOP = LOOP_START + LOOP * 2;
const DEVICES = [
  [390, 844],
  [375, 667],
  [834, 1194],
] as const;

describe("mardi gras side lanes", () => {
  it.each(DEVICES)("%ix%i: both side lanes have Carnival life at every height from level 30 up through two turns of the loop", (W, H) => {
    const counts = { left: 0, right: 0 };
    for (let lvl = 30; lvl <= TOP; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, 3);
      const tone = toneOf(s);
      const floor = floorTop(s, level(s));
      const left: string[] = [];
      if (tone.sunSet < 1) {
        const sun = sunAt(s, tone, floor);
        if (sun.y - sun.r * SUN_REACH < floor - s.u * 0.02) left.push("the sun");
      }
      if (tone.moon > 0.1) left.push("the moon");
      const q = queenAt(s);
      if (q.up > 0 && q.y + QUEEN_REACH.top * q.r < floor - s.u * 0.05) left.push("the Queen");
      if (tone.fireworks > 0.3) left.push("the fireworks");
      const right: string[] = [];
      if (lvl < 36) right.push("the city");
      const island = cameoBounds(islandFrame(s));
      if (island.b > 0 && island.t < Math.min(H, floor)) right.push("the island");
      eachVisible(s, (d) => right.push(d.kind));
      const g = gatorAt(s);
      if (g.up > 0 && g.y + GATOR_REACH.top * g.r < floor - s.u * 0.05) right.push("the Gator");
      if (tone.rightShow > 0.3) right.push("the fireworks");
      expect(left.length, `level ${lvl}: nothing in the left lane`).toBeGreaterThan(0);
      expect(right.length, `level ${lvl}: nothing in the right lane`).toBeGreaterThan(0);
      counts.left += left.length;
      counts.right += right.length;
    }
    // And on average more than a single thing in each.
    const n = (TOP - 30) / 0.5 + 1;
    expect(counts.left / n, "things in the left lane, on average").toBeGreaterThan(1.3);
    expect(counts.right / n, "things in the right lane, on average").toBeGreaterThan(3);
  });
});

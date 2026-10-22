import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { mardiGras } from "../mardigras";
import { context, sceneAt } from "./test-scene";

// The skin draws from the scene alone: the same scene paints the same pixels, whatever was drawn
// before it. The figures keep their poses and rigs in module scratch (folk.ts), and helpers
// return scratch results; a field a behavior forgets to set this frame (a shoulder height taken
// before the pelvis is placed, a toss's number left from the last call) would carry the last
// drawn scene into this one. So each scene is drawn after several different others, and all its
// frames must match.

const kit = kitFor(mardiGras);
const [W, H] = [390, 844];

function frame(lvl: number, t: number): string {
  const s = sceneAt(W, H, lvl, t);
  const ctx = context(W, H);
  kit.world(ctx, s);
  kit.front(ctx, s);
  return createHash("sha1").update(ctx.getImageData(0, 0, W, H).data).digest("hex");
}

/** Scenes drawn just before: the start, late in a parade's pass, after a toss, mid-float. */
const BEFORE = [
  [0, 0],
  [0, 9.9],
  [0, 44.8],
  [14, 6.6],
] as const;
/** Scenes checked: before the first toss, the floats' riders throwing and dancing, the climb. */
const SCENES = [
  [0, 0.3],
  [3, 0.3],
  [0, 5.1],
  [0, 6.6],
  [0, 8.2],
  [14, 9.9],
  [70, 3.3],
] as const;

describe("mardi gras determinism", () => {
  it.each(SCENES)("level %i at t=%s paints the same pixels whatever was drawn before it", (lvl, t) => {
    const frames = BEFORE.map(([l, b]) => {
      frame(l, b);
      return frame(lvl, t);
    });
    for (let i = 1; i < frames.length; i++) expect(frames[i], `after level ${BEFORE[i]![0]} t=${BEFORE[i]![1]}`).toBe(frames[0]);
  });

  it("never asks for chance or the wall clock", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = [join(dir, "..", "mardigras.ts"), ...readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => join(dir, f))];
    for (const file of files) {
      const src = readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
      expect(/Math\.random|Date\.now|performance\.now|new Date\(/.test(src), file).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { BLOCK_HEIGHT } from "../../config";
import { mardiGras } from "../mardigras";
import { CLEAR, luminance } from "./colors";
import { moonAt, NIGHT_EDGE } from "./sky";
import { context, sceneAt, zoomedScene } from "./test-scene";
import { BLUE_HOUR_SKY, LOOP, LOOP_START, NIGHT_SKY, toneAtLevel, type Tone } from "./tone";

// The bars must read against whatever stands behind the tower, at every height (the owner, after
// the rebuild: the purple bars sank into a violet night from about level 45 to 120 and again past
// 150). A bar reads by its fill or by its plum ink outline: its "reads" is the better of the two
// WCAG contrast ratios against the backdrop. The night is now a midnight indigo and its clouds a
// moonlit silver-blue: the sky and the cloud floor stay out of the band of tones where the darkest
// bars (the purple mask and trumpet) and the ink both sink (colors.ts, CLEAR), the night coming
// down over the lit sky with a narrow soft edge (sky.ts).
//
// Two checks: the light's colors themselves, at every step of the first pass and of the loop;
// and the backdrop as painted, behind every bar of a tower at its true row (bar i wears bars[i %
// 12]), in strips just outside the base's column and in the middle of the column (what a
// narrowed tower stands in front of), from level 30 up through two turns of the loop, on two
// phones and a tablet, and zoomed out: the median pixel of every strip reads at READS or better
// (New Year's and Christmas, the owner's standard, read at about 2.2 to 2.45 by the same measure).

const READS = 2.4;
const INK_L = luminance(mardiGras.palette.ink);
const BARS_L = mardiGras.bars.map((b) => luminance(b.color));

function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function reads(bar: number, bg: number): number {
  return Math.max(ratio(bar, bg), ratio(INK_L, bg));
}
const outOfBand = (c: string) => luminance(c) <= CLEAR.below || luminance(c) >= CLEAR.above;
const lit = (c: string) => luminance(c) >= CLEAR.above;

/** Every step of the light: the first pass by half levels, then a whole turn of the loop. */
const STEPS: readonly number[] = Array.from({ length: Math.round((LOOP_START + LOOP) / 0.5) }, (_, i) => i * 0.5);

describe("mardi gras bars read against the night", () => {
  it("the band the bars sink into is the band between CLEAR's ends, for every bar", () => {
    for (const bar of BARS_L) {
      expect(reads(bar, CLEAR.below), "a bar on the darkest tone allowed").toBeGreaterThanOrEqual(READS);
      expect(reads(bar, CLEAR.above), "a bar on the lightest tone of the band's top").toBeGreaterThanOrEqual(READS);
    }
    // And inside the band the purple bars do sink: the band is no wider than it must be.
    expect(reads(Math.min(...BARS_L), Math.sqrt(CLEAR.below * CLEAR.above))).toBeLessThan(READS);
  });

  it("the night sky is midnight, the lit sky, the blue hour and the clouds stay lighter than the band, the far city out of it", () => {
    for (const c of NIGHT_SKY) expect(luminance(c), `night sky ${c}`).toBeLessThanOrEqual(CLEAR.below);
    expect(lit(BLUE_HOUR_SKY), "the blue hour").toBe(true);
    for (const lvl of STEPS) {
      const t: Tone = toneAtLevel(lvl);
      const at = `level ${lvl}`;
      // The lit sky below the night's edge (its top shows only while the night has not come down yet).
      t.sky.forEach((c, i) => {
        if (i > 0 || t.night < 0.02) expect(lit(c), `${at}: lit sky stop ${i} ${c}`).toBe(true);
      });
      for (const c of [t.cloudShade, t.cloud, t.cloudLight, t.flamCloud, t.flamLight, t.mistColor]) expect(lit(c), `${at}: cloud ${c}`).toBe(true);
      for (const c of [t.stone, t.stoneLit, t.stoneShade, t.slate, t.tower, t.towerLit]) expect(outOfBand(c), `${at}: far city ${c}`).toBe(true);
    }
  });

  const VIEWS = [
    [390, 844, 1],
    [375, 667, 1],
    [834, 1194, 1],
    [390, 844, 0.6],
  ] as const;

  it.each(VIEWS)("%ix%i at zoom %s: the moon comes and goes on the lit sky, never a faint grey disc on the night", (W0, H0, z) => {
    // It fades in at dusk and out at dawn by its alpha: on the midnight sky a half-faded moon is
    // a dull grey ghost. While it is part way, the night's edge (and its soft edge) is above it.
    let fading = 0;
    for (const lvl of STEPS) {
      const s = z === 1 ? sceneAt(W0, H0, lvl, 0) : zoomedScene(W0, H0, z, lvl, 0);
      const t = toneAtLevel(lvl);
      if (t.moon <= 0.03 || t.moon >= 0.9) continue;
      fading++;
      const moon = moonAt(s);
      expect((t.night + NIGHT_EDGE) * s.cssH, `level ${lvl}: the moon at ${t.moon.toFixed(2)} on the night sky`).toBeLessThan(moon.y - moon.r);
    }
    expect(fading, "steps with the moon coming or going").toBeGreaterThan(10);
  });

  const LEVELS = Array.from({ length: Math.floor((LOOP_START + LOOP * 2 - 30) / 4) + 1 }, (_, i) => 30 + i * 4);
  it.each(VIEWS)("%ix%i at zoom %s: every bar reads against the backdrop behind it, from level 30 up through two turns of the loop", (W0, H0, z) => {
    let rows = 0;
    for (const lvl of LEVELS) {
      const s = z === 1 ? sceneAt(W0, H0, lvl, 0) : zoomedScene(W0, H0, z, lvl, 0);
      const W = Math.round(s.cssW);
      const H = Math.round(s.cssH);
      const ctx = context(W, H);
      kitFor(mardiGras).world(ctx, s);
      const data = ctx.getImageData(0, 0, W, H).data;
      const barH = BLOCK_HEIGHT * s.scale;
      const strip = Math.max(6, s.u * 0.04);
      const spans = [
        [s.baseX - 2 - strip, s.baseX - 2, "left of the column"],
        [s.baseX + s.baseW + 2, s.baseX + s.baseW + 2 + strip, "right of the column"],
        [s.baseX + s.baseW * 0.3, s.baseX + s.baseW * 0.7, "in the column"],
      ] as const;
      for (let i = 0; i < lvl; i++) {
        const y0 = s.groundY - (i + 1) * barH;
        if (y0 + barH < 0 || y0 > H) continue;
        const bar = BARS_L[i % BARS_L.length]!;
        for (const [x0, x1, where] of spans) {
          const px: number[] = [];
          for (let y = Math.max(0, Math.floor(y0 + 1)); y < Math.min(H, Math.ceil(y0 + barH - 1)); y++) {
            for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
              const k = (y * W + x) * 4;
              px.push(reads(bar, LUM(data[k]!, data[k + 1]!, data[k + 2]!)));
            }
          }
          if (px.length < 8) continue;
          px.sort((a, b) => a - b);
          rows++;
          expect(px[px.length >> 1]!, `level ${lvl}: bar ${i} (${mardiGras.bars[i % BARS_L.length]!.color}) ${where}`).toBeGreaterThanOrEqual(READS);
        }
      }
    }
    expect(rows, "bars measured").toBeGreaterThan(1000);
  }, 120_000);
});

/** sRGB channel (0..255) to linear light, and a pixel's relative luminance. */
const LINEAR = Float64Array.from({ length: 256 }, (_, v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
});
function LUM(r: number, g: number, b: number): number {
  return 0.2126 * LINEAR[r]! + 0.7152 * LINEAR[g]! + 0.0722 * LINEAR[b]!;
}

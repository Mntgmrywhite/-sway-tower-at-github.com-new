import { describe, expect, it } from "vitest";
import { oktoberfest } from "../oktoberfest";
import { AMBER, BARREL, FOAM } from "./colors";
import { beerGarden, farLine } from "./far";
import { AWNING_UP, bandTop, COUNTER_UP, pretzelStall, sausageStall } from "./front";
import { ARMS, FIGURES_UP, inkW, RIBBON_DROP, RIBBON_FROM, RIBBON_W, tent, WREATH_UP } from "./ground";
import * as icon from "./icons";
import { halfWidth, parade, PARADE_LENGTH, PARADE_PASS, PARADE_SPEED, waitress, WAITRESS_PASS, waitressAt } from "./parade";
import { context, SIZES, startScene } from "./test-scene";
import { toneOf } from "./tone";

// The owner settled on a 12+ rating and wants the Oktoberfest "to be correct": steins, the beer
// tent and the barrel wagon are cheerful scenery. These checks keep them in the skin (an earlier
// pass for a 4+ rating took every one of them out): the stein among the bars, the waitress's
// tray of foaming steins, steins on the stalls' counters and on the tent's and the beer
// garden's tables, the barrels on tap in the tent and on the parade's wagon. And in good taste:
// the steins are always set down or carried on a tray, never raised by anyone.

/** Pixels within a small distance of a color (as #rrggbb) in a drawing made at `k` times the scene's size. */
function pixelsOf(W: number, H: number, hex: string, draw: (ctx: CanvasRenderingContext2D) => void, k = 2): { n: number; x: number; top: number; bottom: number } {
  const ctx = context(W, H, k);
  draw(ctx);
  const w = Math.round(W * k);
  const data = ctx.getImageData(0, 0, w, Math.round(H * k)).data;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  let n = 0;
  let sx = 0;
  let top = Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 250) continue;
    if (Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b) > 12) continue;
    const p = i / 4;
    const y = Math.floor(p / w) / k;
    n++;
    sx += (p % w) / k;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { n, x: n ? sx / n : NaN, top, bottom };
}

/** A color's hue in degrees. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("oktoberfest steins and barrels", () => {
  it("the stein is among the bars, which alternate warm and cool all the way round", () => {
    const bars = oktoberfest.bars;
    expect(bars.length).toBe(12);
    expect(bars.findIndex((b) => b.icon === icon.stein)).toBe(1);
    expect(new Set(bars.map((b) => b.icon)).size, "every bar its own symbol").toBe(bars.length);
    const warm = (hex: string) => hue(hex) < 70 || hue(hex) >= 330;
    bars.forEach((b, i) => {
      const next = bars[(i + 1) % bars.length]!;
      expect(warm(b.color), `bars ${i} and ${(i + 1) % bars.length} are both ${warm(b.color) ? "warm" : "cool"}`).not.toBe(warm(next.color));
    });
  });

  it.each(SIZES)("%ix%i: the waitress carries a tray of foaming steins, held out before her each way she goes", (W, H) => {
    for (const t of [WAITRESS_PASS, WAITRESS_PASS + 24]) {
      const s = startScene(W, H, t);
      const wa = waitressAt(t, halfWidth(s));
      expect(wa.shown).toBe(true);
      const beer = pixelsOf(W, H, AMBER.body, (ctx) => waitress(ctx, s));
      const foam = pixelsOf(W, H, FOAM, (ctx) => waitress(ctx, s));
      expect(beer.n, "beer in the steins").toBeGreaterThan(s.u * 0.3);
      expect(foam.n, "foam on top").toBeGreaterThan(s.u * 0.1);
      // Out in front of her, the way she walks, and the foam over the beer.
      const her = s.baseX + s.baseW / 2 + wa.x * s.u;
      expect((beer.x - her) * wa.m, "the steins are held out before her").toBeGreaterThan(s.u * 0.03);
      expect(foam.top).toBeLessThan(beer.top);
    }
  });

  it.each(SIZES)("%ix%i: both stalls set steins out on their counters, under the awnings", (W, H) => {
    const s = startScene(W, H, 0);
    const top = bandTop(s);
    const lw = inkW(s);
    for (const [name, draw] of [
      ["pretzel stall", pretzelStall],
      ["sausage stall", sausageStall],
    ] as const) {
      const beer = pixelsOf(W, H, AMBER.body, (ctx) => draw(ctx, s, top, lw, 0));
      const foam = pixelsOf(W, H, FOAM, (ctx) => draw(ctx, s, top, lw, 0));
      expect(beer.n, `${name}: steins on the counter`).toBeGreaterThan(s.u * 0.1);
      expect(foam.n, `${name}: their foam`).toBeGreaterThan(s.u * 0.03);
      // Standing on the counter, the foam clear below the awning's scalloped hem.
      expect(beer.bottom, `${name}: the steins stand on the counter`).toBeLessThanOrEqual(top - COUNTER_UP * s.u);
      expect(foam.top, `${name}: the foam keeps under the awning's hem`).toBeGreaterThan(top - AWNING_UP * s.u + s.u * 0.047);
    }
  });

  it.each(SIZES)("%ix%i: the beer tent has steins on its tables and a row of barrels on tap", (W, H) => {
    const s = startScene(W, H, 0);
    const beer = pixelsOf(W, H, AMBER.body, (ctx) => tent(ctx, s, toneOf(s)));
    const barrels = pixelsOf(W, H, BARREL.body, (ctx) => tent(ctx, s, toneOf(s)));
    expect(beer.n, "steins on the long tables").toBeGreaterThan(s.u * 0.15);
    expect(barrels.n, "barrels on tap").toBeGreaterThan(s.u * 0.5);
    // Inside, below the beam and above the floor line.
    expect(beer.bottom).toBeLessThan(s.groundY);
    expect(barrels.bottom).toBeLessThan(s.groundY);
  });

  it.each(SIZES)("%ix%i: the parade's draft horses pull a wagon of barrels", (W, H) => {
    // The wagon in the middle of the screen.
    const t = PARADE_PASS + (PARADE_LENGTH / 2) / PARADE_SPEED;
    const s = startScene(W, H, t);
    const barrels = pixelsOf(W, H, BARREL.body, (ctx) => parade(ctx, s));
    expect(barrels.n, "barrels on the wagon").toBeGreaterThan(s.u * 2);
    // Below the floor line, like everything that moves at the tower's foot.
    expect(barrels.top).toBeGreaterThan(s.groundY);
  });

  it.each(SIZES)("%ix%i: the beer garden far off has steins on its tables", (W, H) => {
    const s = startScene(W, H, 0);
    const tone = toneOf(s);
    const beer = pixelsOf(W, H, tone.beer, (ctx) => beerGarden(ctx, s, tone, farLine(s)), 4);
    expect(beer.n).toBeGreaterThan(40);
  });

  it.each(SIZES)("%ix%i: the maypole's trades (the brewer with his barrel among them) show whole under the wreath's ribbons", (W, H) => {
    // The ribbons are drawn over the arms: they end, round caps and ink included, above the
    // upper arm's figures.
    const s = startScene(W, H, 0);
    const u = s.u;
    const ribbonEnd = s.groundY - (WREATH_UP - RIBBON_FROM - RIBBON_DROP) * u + (RIBBON_W * u + inkW(s) * 1.2) / 2;
    const figuresTop = s.groundY - (ARMS[1] + FIGURES_UP) * u;
    expect(ribbonEnd).toBeLessThan(figuresTop - 1);
  });
});

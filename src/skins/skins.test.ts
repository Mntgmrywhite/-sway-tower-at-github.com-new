import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../preview/shots";
import { render } from "../render";
import { AUTO, resolveSkin, SKINS, skinForDate } from ".";

const day = (m: number, d: number) => new Date(2026, m - 1, d, 12);

describe("skin by date", () => {
  it.each([
    [10, 15, "halloween"],
    [10, 1, "halloween"],
    [11, 1, "halloween"],
    [11, 2, "thanksgiving"],
    [11, 26, "thanksgiving"],
    [12, 1, "christmas"],
    [12, 24, "christmas"],
    [12, 28, "newyear"],
    [12, 31, "newyear"],
    [1, 1, "newyear"],
    [1, 6, "newyear"],
    [1, 7, "classic"],
    [3, 3, "classic"],
    [9, 30, "classic"],
  ])("%i/%i → %s", (m, d, id) => {
    expect(skinForDate(day(m, d)).id).toBe(id);
  });

  it("auto uses the date; an id overrides it; unknown ids fall back to classic", () => {
    expect(resolveSkin(AUTO, day(12, 24)).id).toBe("christmas");
    expect(resolveSkin("halloween", day(12, 24)).id).toBe("halloween");
    expect(resolveSkin("nope", day(12, 24)).id).toBe("classic");
    expect(resolveSkin("neon", day(12, 24)).id).toBe("neon");
    // Retired neon skins show Synthwave.
    expect(resolveSkin("neon-glow", day(12, 24)).id).toBe("neon");
    expect(resolveSkin("neon-minimal", day(12, 24)).id).toBe("neon");
  });
});

describe("skin data", () => {
  const hex = /^#[0-9a-f]{6}$/i;

  it("ids are unique and classic is the first, undated fallback", () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(SKINS[0]?.id).toBe("classic");
    expect(SKINS[0]?.dates).toBeUndefined();
    expect(SKINS.find((s) => s.id === "neon")?.dates).toBeUndefined();
  });

  it.each(SKINS.map((s) => [s.id, s] as const))("%s: palette and bars are valid", (_, skin) => {
    for (const [key, value] of Object.entries(skin.palette)) {
      expect(value, `palette.${key}`).toMatch(hex);
    }
    expect(skin.bars.length).toBeGreaterThanOrEqual(8);
    expect(skin.bars.length).toBeLessThanOrEqual(12);
    for (const bar of skin.bars) expect(bar.color).toMatch(hex);
    for (const key of ["title", "ui", "accent", "life"] as const) expect(skin.hud[key]).toMatch(hex);
    // Neighboring bars must differ so every seam reads.
    skin.bars.forEach((bar, i) => {
      expect(bar.color).not.toBe(skin.bars[(i + 1) % skin.bars.length]!.color);
    });
  });
});

describe("render smoke test", () => {
  const moments = shots();
  it.each(SKINS.flatMap((skin) => moments.map((m) => [skin.id, m.name, skin, m] as const)))(
    "%s renders %s without errors",
    (_, __, skin, m) => {
      const W = 390;
      const H = 844;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      render(ctx as unknown as CanvasRenderingContext2D, W, H, m.state, m.view, m.best, skin);
      // Something visible was drawn: sample a column through the tower for varied pixels.
      const col = ctx.getImageData(W / 2, 0, 1, H).data;
      const seen = new Set<number>();
      for (let i = 0; i < col.length; i += 4 * 8) seen.add((col[i]! << 16) | (col[i + 1]! << 8) | col[i + 2]!);
      expect(seen.size).toBeGreaterThan(10);
    },
  );
});

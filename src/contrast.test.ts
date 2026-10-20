import { describe, expect, it } from "vitest";
import { SKINS } from "./skins";

// Color contrast of the DOM text that takes a skin's colors (src/options.css, credits.css,
// achievements.css, title.css): the sheets' headings and links in the skin's highlight, the
// chosen Motion segment and the switches on the skin's accent, and the title's cartoon buttons'
// white captions on the skin's UI color. WCAG AA: 4.5:1 for body text, 3:1 for large text. The
// HUD on the canvas has ink outlines and isn't measured here.

type Rgb = [number, number, number];

function hex(c: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) throw new Error(`not a #rrggbb color: ${c}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** color-mix(in srgb, a p%, b): a straight per-channel mix in sRGB. */
function mix(a: Rgb, p: number, b: Rgb): Rgb {
  return [0, 1, 2].map((i) => a[i]! * p + b[i]! * (1 - p)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
/** The sheets' glass, rgba(10, 4, 22, 0.97), over the dark scene it covers: as near as makes no difference. */
const SHEET: Rgb = [10, 4, 22];
/** The sheets' body text and their dimmed text, rgba(243, 233, 245, 0.72) over the glass. */
const TEXT: Rgb = [243, 233, 245];
const DIM = mix(TEXT, 0.72, SHEET);
const AA = 4.5;

describe("sheet text on every skin's colors", () => {
  it("body and dimmed text read on the glass", () => {
    expect(contrast(TEXT, SHEET)).toBeGreaterThanOrEqual(AA);
    expect(contrast(DIM, SHEET)).toBeGreaterThanOrEqual(AA);
  });

  it.each(SKINS.map((s) => [s.id, s] as const))("%s", (_id, skin) => {
    const accent = hex(skin.hud.ui); // the page's --accent
    const hl = hex(skin.hud.accent); // the sheets' --hl
    // Headings and link buttons: color-mix(--hl 70%, white) on the glass.
    expect(contrast(mix(hl, 0.7, WHITE), SHEET), "heading").toBeGreaterThanOrEqual(AA);
    // A switch that is on, a chosen mode or skin: white on color-mix(--accent 14%, transparent) over the glass.
    expect(contrast(WHITE, mix(accent, 0.14, SHEET)), "switch on").toBeGreaterThanOrEqual(AA);
    // The chosen Motion segment: white on color-mix(--accent 30%, #1a1030).
    expect(contrast(WHITE, mix(accent, 0.3, [26, 16, 48])), "segment").toBeGreaterThanOrEqual(AA);
    // The Medals sheet's values and Drop tags in --hl on the glass.
    expect(contrast(hl, SHEET), "highlight").toBeGreaterThanOrEqual(AA);
    if (skin.style !== "neon") {
      // The title's cartoon buttons (Skins, Medals, Sound, Menu): white captions on color-mix(--ui 90%, black).
      expect(contrast(WHITE, mix(accent, 0.9, [0, 0, 0])), "title button").toBeGreaterThanOrEqual(AA);
      // The mode not chosen: white at 75% on color-mix(--ui 55%, #20202a).
      const back = mix(accent, 0.55, [32, 32, 42]);
      expect(contrast(mix(WHITE, 0.75, back), back), "other mode").toBeGreaterThanOrEqual(AA);
    }
  });
});

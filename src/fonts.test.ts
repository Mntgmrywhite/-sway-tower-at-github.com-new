import { describe, expect, it } from "vitest";
import { BASE_FONTS, familyOf, FONT_FILES } from "./fonts";
import { SKINS } from "./skins";

/** The face a skin's title is set in: the first family of its display stack, unquoted. */
function titleFace(display: string): string {
  return display.split(",")[0]!.trim().replace(/^['"]|['"]$/g, "");
}

describe("bundled fonts", () => {
  it("covers every skin's fonts, so nothing is fetched from the network", () => {
    for (const skin of SKINS) {
      for (const entry of skin.fonts ?? []) expect(FONT_FILES[familyOf(entry)], `${skin.id}: ${entry}`).toBeDefined();
    }
    for (const family of BASE_FONTS) expect(FONT_FILES[family], family).toBeDefined();
  });

  it("inlines each face as woff2 data", () => {
    for (const faces of Object.values(FONT_FILES)) {
      for (const [, url] of faces) expect(url).toMatch(/^data:font\/woff2;base64,/);
    }
  });

  it("reads the family out of a Google-style entry", () => {
    expect(familyOf("Comfortaa:wght@700")).toBe("Comfortaa");
    expect(familyOf("Luckiest Guy")).toBe("Luckiest Guy");
  });

  it("sets every skin's title in a face it bundles and loads", () => {
    for (const skin of SKINS) {
      const face = titleFace(skin.hud.display);
      expect(FONT_FILES[face], `${skin.id}: ${face}`).toBeDefined();
      const loaded = [...BASE_FONTS, ...(skin.fonts ?? []).map(familyOf)];
      expect(loaded, `${skin.id} loads ${face}`).toContain(face);
    }
  });

  it("gives St. Patrick's a title face of its own (the owner: not Thanksgiving's)", () => {
    const stPatricks = SKINS.find((s) => s.id === "stpatricks")!;
    expect(titleFace(stPatricks.hud.display)).toBe("Uncial Antiqua");
    for (const skin of SKINS) {
      if (skin !== stPatricks) expect(titleFace(skin.hud.display), skin.id).not.toBe("Uncial Antiqua");
    }
  });
});

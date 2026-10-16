import { describe, expect, it } from "vitest";
import { BASE_FONTS, familyOf, FONT_FILES } from "./fonts";
import { SKINS } from "./skins";

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
});

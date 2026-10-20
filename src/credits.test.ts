import { describe, expect, it } from "vitest";
import { AUTHOR, FONT_NOTE, LIBRARIES, MUSIC_NOTES, fontCredits, fontLicenseText, licenseName } from "./credits";
import { FONT_FILES, FONT_LICENSES } from "./fonts";

describe("the credits", () => {
  it("name every sample library the music is rendered from (the provenance list's sources)", () => {
    const names = LIBRARIES.map((l) => l.name);
    for (const library of [
      "Versilian Community Sample Library (VCSL)",
      "Versilian Studios Chamber Orchestra 2 Community Edition (VSCO 2 CE)",
      "FreePats",
      "BigSoundBank (Joseph Sardin)",
      "Kenney",
    ]) {
      expect(names).toContain(library);
    }
    for (const lib of LIBRARIES) expect(lib.what.length, lib.name).toBeGreaterThan(0);
    // Our own theme, and our own synth; nobody else's tunes.
    expect(MUSIC_NOTES.join(" ")).toMatch(/own theme/);
    expect(MUSIC_NOTES.join(" ")).toMatch(/own synthesizer/);
    expect(AUTHOR.length).toBeGreaterThan(0);
  });

  it("list every bundled font family with its license", () => {
    const credits = fontCredits();
    const families = credits.map((f) => f.family);
    for (const family of Object.keys(FONT_FILES)) {
      expect(families).toContain(family);
      expect(FONT_LICENSES[family], family).toBeDefined();
    }
    expect(families).toEqual([...families].sort((a, b) => a.localeCompare(b)));
    for (const f of credits) expect(licenseName(f.license)).toMatch(/Open Font License|Apache/);
    expect(FONT_NOTE).toMatch(/Open Font License/);
  });

  it("ship the license text for every font, headed by family and license", () => {
    const text = fontLicenseText();
    expect(text.length).toBeGreaterThan(10_000);
    for (const f of fontCredits()) expect(text, f.family).toContain(`${f.family} (${f.license})`);
    expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(text).toContain("Apache License");
  });
});

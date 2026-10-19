// Web fonts ship inside the page (Vite ?inline data URLs), like the audio, so the iOS app and
// the single-file web build draw their titles without the network. The files are Fontsource's
// copies of the Google Fonts faces (latin subset, same weights the page used to request).
// Licenses: SIL OFL 1.1 (Fredoka, Monoton, Orbitron, Creepster, Abril Fatface, Limelight, Zen Dots,
// Uncial Antiqua, Rye, Alfa Slab One, Pacifico, Pirata One), except Luckiest Guy and Chewy
// (Apache 2.0); see public/font-licenses.txt.

import abrilFatface from "@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff2?inline";
import alfaSlabOne from "@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff2?inline";
import chewy from "@fontsource/chewy/files/chewy-latin-400-normal.woff2?inline";
import creepster from "@fontsource/creepster/files/creepster-latin-400-normal.woff2?inline";
import fredoka600 from "@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?inline";
import fredoka700 from "@fontsource/fredoka/files/fredoka-latin-700-normal.woff2?inline";
import limelight from "@fontsource/limelight/files/limelight-latin-400-normal.woff2?inline";
import luckiestGuy from "@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2?inline";
import monoton from "@fontsource/monoton/files/monoton-latin-400-normal.woff2?inline";
import orbitron600 from "@fontsource/orbitron/files/orbitron-latin-600-normal.woff2?inline";
import orbitron700 from "@fontsource/orbitron/files/orbitron-latin-700-normal.woff2?inline";
import pacifico from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2?inline";
import pirataOne from "@fontsource/pirata-one/files/pirata-one-latin-400-normal.woff2?inline";
import rye from "@fontsource/rye/files/rye-latin-400-normal.woff2?inline";
import uncialAntiqua from "@fontsource/uncial-antiqua/files/uncial-antiqua-latin-400-normal.woff2?inline";
import zenDots from "@fontsource/zen-dots/files/zen-dots-latin-400-normal.woff2?inline";

/** Every bundled face, by family: [CSS weight, woff2 data URL]. */
export const FONT_FILES: Record<string, [weight: string, url: string][]> = {
  Fredoka: [
    ["600", fredoka600],
    ["700", fredoka700],
  ],
  Monoton: [["400", monoton]],
  Orbitron: [
    ["600", orbitron600],
    ["700", orbitron700],
  ],
  "Luckiest Guy": [["400", luckiestGuy]],
  Chewy: [["400", chewy]],
  Creepster: [["400", creepster]],
  "Abril Fatface": [["400", abrilFatface]],
  Limelight: [["400", limelight]],
  "Zen Dots": [["400", zenDots]],
  "Uncial Antiqua": [["400", uncialAntiqua]],
  Rye: [["400", rye]],
  "Alfa Slab One": [["400", alfaSlabOne]],
  Pacifico: [["400", pacifico]],
  "Pirata One": [["400", pirataOne]],
};

/** Each family's license, as public/font-licenses.txt heads its text ("Fredoka (OFL-1.1)"). */
export type FontLicense = "OFL-1.1" | "Apache-2.0";

export const FONT_LICENSES: Record<string, FontLicense> = {
  Fredoka: "OFL-1.1",
  Monoton: "OFL-1.1",
  Orbitron: "OFL-1.1",
  "Luckiest Guy": "Apache-2.0",
  Chewy: "Apache-2.0",
  Creepster: "OFL-1.1",
  "Abril Fatface": "OFL-1.1",
  Limelight: "OFL-1.1",
  "Zen Dots": "OFL-1.1",
  "Uncial Antiqua": "OFL-1.1",
  Rye: "OFL-1.1",
  "Alfa Slab One": "OFL-1.1",
  Pacifico: "OFL-1.1",
  "Pirata One": "OFL-1.1",
};

/** The HUD and UI faces every skin uses (cartoon body, neon body, the options title). */
export const BASE_FONTS = ["Fredoka", "Monoton", "Orbitron"];

/** Family name from a skin's `fonts` entry ("Comfortaa:wght@700" → "Comfortaa"). */
export function familyOf(entry: string): string {
  return entry.split(":")[0]!.trim();
}

const added = new Set<string>();

/**
 * Register and decode these families (skin `fonts` entries). Canvas text only uses a face once
 * it has loaded, so each is loaded right away rather than on first use.
 */
export function loadFonts(entries: readonly string[]): void {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  for (const entry of entries) {
    const family = familyOf(entry);
    if (added.has(family)) continue;
    added.add(family);
    for (const [weight, url] of FONT_FILES[family] ?? []) {
      const face = new FontFace(family, `url(${url}) format("woff2")`, { weight, display: "swap" });
      document.fonts.add(face);
      face.load().catch(() => {});
    }
  }
}

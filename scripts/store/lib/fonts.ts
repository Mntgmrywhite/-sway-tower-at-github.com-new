import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import { ROOT } from "./paths";

// The real faces, so offline renders match the app: every family src/fonts.ts bundles, from the
// same Fontsource packages (the woff copies; napi-rs canvas reads those).

/** [CSS family, Fontsource file]. The same family twice registers another weight. */
const FILES: readonly [family: string, file: string][] = [
  ["Luckiest Guy", "luckiest-guy/files/luckiest-guy-latin-400-normal.woff"],
  ["Fredoka", "fredoka/files/fredoka-latin-600-normal.woff"],
  ["Fredoka", "fredoka/files/fredoka-latin-700-normal.woff"],
  ["Monoton", "monoton/files/monoton-latin-400-normal.woff"],
  ["Orbitron", "orbitron/files/orbitron-latin-600-normal.woff"],
  ["Orbitron", "orbitron/files/orbitron-latin-700-normal.woff"],
  ["Chewy", "chewy/files/chewy-latin-400-normal.woff"],
  ["Creepster", "creepster/files/creepster-latin-400-normal.woff"],
  ["Abril Fatface", "abril-fatface/files/abril-fatface-latin-400-normal.woff"],
  ["Limelight", "limelight/files/limelight-latin-400-normal.woff"],
  ["Zen Dots", "zen-dots/files/zen-dots-latin-400-normal.woff"],
  ["Uncial Antiqua", "uncial-antiqua/files/uncial-antiqua-latin-400-normal.woff"],
];

/**
 * The HUD's "★ N perfect" takes its star from the system font (the skins' body stacks end in
 * `system-ui`), which napi-rs canvas doesn't resolve by itself: the first of these macOS faces
 * that exists is registered as "system-ui" so the star draws instead of a missing-glyph box.
 */
const SYSTEM_UI = [
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
  "/System/Library/Fonts/Apple Symbols.ttf",
];

let registered = false;

/** Register every bundled face with the canvas (once). Throws if a file is missing. */
export function registerFonts(): void {
  if (registered) return;
  registered = true;
  for (const [family, file] of FILES) {
    const path = resolve(ROOT, "node_modules/@fontsource", file);
    if (!GlobalFonts.registerFromPath(path, family)) throw new Error(`could not register ${family} from ${path}`);
  }
  const system = SYSTEM_UI.find((path) => existsSync(path));
  if (!system) console.warn("fonts: no system face found for the HUD's star; it will draw as a box");
  else GlobalFonts.registerFromPath(system, "system-ui");
}

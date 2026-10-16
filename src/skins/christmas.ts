import { neon } from "./neon";
import type { Skin } from "./skin";

// Placeholder: replaced by the real Christmas skin.
export const christmas: Skin = {
  ...neon,
  id: "christmas",
  name: "Christmas",
  dates: [{ from: [12, 1], to: [12, 27] }],
};

import { neon } from "./neon";
import type { Skin } from "./skin";

// Placeholder: replaced by the real New Year's skin.
export const newYear: Skin = {
  ...neon,
  id: "newyear",
  name: "New Year's",
  dates: [{ from: [12, 28], to: [1, 6] }],
};

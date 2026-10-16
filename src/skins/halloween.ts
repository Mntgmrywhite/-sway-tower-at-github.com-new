import { neon } from "./neon";
import type { Skin } from "./skin";

// Placeholder: replaced by the real Halloween skin.
export const halloween: Skin = {
  ...neon,
  id: "halloween",
  name: "Halloween",
  dates: [{ from: [10, 1], to: [11, 1] }],
};

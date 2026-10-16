import { neon } from "./neon";
import type { Skin } from "./skin";

// Placeholder: replaced by the real Thanksgiving skin.
export const thanksgiving: Skin = {
  ...neon,
  id: "thanksgiving",
  name: "Thanksgiving",
  dates: [{ from: [11, 2], to: [11, 30] }],
};

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "ios"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
  { files: ["scripts/**"], languageOptions: { globals: { ...globals.node } } },
  // Game rules stay deterministic: no clock, no randomness.
  {
    files: ["src/game.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Game rules are deterministic, so tests and bots can replay a run." },
        { object: "Date", property: "now", message: "Game time comes from step(dt)." },
      ],
    },
  },
);

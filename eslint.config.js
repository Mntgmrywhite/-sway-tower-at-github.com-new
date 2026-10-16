import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "ios"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
  { files: ["scripts/**"], languageOptions: { globals: { ...globals.node } } },
  // Game rules stay deterministic: no clock, no randomness (seed comes in through newGame).
  {
    files: ["src/game.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use hash01(seed, ...) so runs are reproducible." },
        { object: "Date", property: "now", message: "Game time comes from step(dt)." },
      ],
    },
  },
);

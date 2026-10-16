import { defineConfig } from "vitest/config";

// Relative base so the build works from any path (web portals, Capacitor).
export default defineConfig({
  base: "./",
  // One script: build-artifact.mjs inlines a single bundle, and Capacitor plugins would
  // otherwise split their (web-only, lazily loaded) fallbacks into chunks of their own.
  build: { rolldownOptions: { output: { codeSplitting: false } } },
  test: {
    environment: "node",
  },
});

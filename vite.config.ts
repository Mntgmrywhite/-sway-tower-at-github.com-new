import { defineConfig } from "vitest/config";

// Relative base so the build works from any path (web portals, Capacitor).
export default defineConfig({
  base: "./",
  test: {
    environment: "node",
  },
});

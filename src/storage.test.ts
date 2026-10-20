import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS_KEY } from "./achievements";
import { RATE_KEY } from "./native/rate";
import { SETTINGS_KEY } from "./settings";
import { changes, PREFIX } from "./storage";

describe("durable saves", () => {
  it("mirrors every save the sheets write: they all share the prefix", () => {
    for (const key of [SETTINGS_KEY, RATE_KEY, ACHIEVEMENTS_KEY]) expect(key.startsWith(PREFIX), key).toBe(true);
  });

  it("mirrors new and changed keys, and never removes one", () => {
    const durable = { "sway-stack:best": "12", "sway-stack:old": "x", "sway-stack:audio": "{}" };
    const local = { "sway-stack:best": "15", "sway-stack:audio": "{}", "sway-stack:tuning": "{}" };
    expect(changes(durable, local)).toEqual({ "sway-stack:best": "15", "sway-stack:tuning": "{}" });
    expect(changes(local, local)).toEqual({});
    expect(changes(durable, {})).toEqual({});
  });
});

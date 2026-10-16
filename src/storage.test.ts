import { describe, expect, it } from "vitest";
import { changes } from "./storage";

describe("durable saves", () => {
  it("mirrors new and changed keys, and never removes one", () => {
    const durable = { "sway-stack:best": "12", "sway-stack:old": "x", "sway-stack:audio": "{}" };
    const local = { "sway-stack:best": "15", "sway-stack:audio": "{}", "sway-stack:tuning": "{}" };
    expect(changes(durable, local)).toEqual({ "sway-stack:best": "15", "sway-stack:tuning": "{}" });
    expect(changes(local, local)).toEqual({});
    expect(changes(durable, {})).toEqual({});
  });
});

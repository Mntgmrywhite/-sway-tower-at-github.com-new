import { describe, expect, it } from "vitest";
import { changes, lostKeys } from "./storage";

describe("durable saves", () => {
  it("finds saves the web copy lost", () => {
    expect(lostKeys({ "sway-stack:best": "12", "sway-stack:audio": "{}" }, { "sway-stack:audio": "{}" })).toEqual(["sway-stack:best"]);
    expect(lostKeys({ "sway-stack:best": "12" }, { "sway-stack:best": "3" })).toEqual([]);
  });

  it("mirrors new and changed keys, and never removes one", () => {
    const durable = { "sway-stack:best": "12", "sway-stack:old": "x", "sway-stack:audio": "{}" };
    const local = { "sway-stack:best": "15", "sway-stack:audio": "{}", "sway-stack:tuning": "{}" };
    expect(changes(durable, local)).toEqual({ "sway-stack:best": "15", "sway-stack:tuning": "{}" });
    expect(changes(local, local)).toEqual({});
    expect(changes(durable, {})).toEqual({});
  });
});

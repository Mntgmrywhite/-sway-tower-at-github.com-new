import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  MOTION_CHOICES,
  SETTINGS_KEY,
  applyMotion,
  loadSettings,
  parseSettings,
  reduceMotion,
  saveSettings,
  type KeyValue,
} from "./settings";

function fakeStore(initial: Record<string, string> = {}): KeyValue & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

describe("settings", () => {
  it("defaults to haptics on and motion following the device", () => {
    expect(DEFAULT_SETTINGS).toEqual({ haptics: true, motion: "auto" });
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(fakeStore())).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through storage under a mirrored sway-stack key", () => {
    const store = fakeStore();
    saveSettings({ haptics: false, motion: "on" }, store);
    expect(Object.keys(store.data)).toEqual([SETTINGS_KEY]);
    expect(SETTINGS_KEY.startsWith("sway-stack:")).toBe(true);
    expect(loadSettings(store)).toEqual({ haptics: false, motion: "on" });
  });

  it("keeps the valid parts of a damaged save and defaults the rest", () => {
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"haptics":"yes","motion":"sideways"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"haptics":false,"motion":"sideways"}')).toEqual({ haptics: false, motion: "auto" });
    expect(parseSettings('{"motion":"off"}')).toEqual({ haptics: true, motion: "off" });
  });

  it("survives a store that throws", () => {
    const broken: KeyValue = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ haptics: true, motion: "auto" }, broken)).not.toThrow();
  });
});

describe("reduce motion", () => {
  it("auto follows the device; on and off override it", () => {
    expect(MOTION_CHOICES).toEqual(["auto", "on", "off"]);
    expect(reduceMotion("auto", false)).toBe(false);
    expect(reduceMotion("auto", true)).toBe(true);
    expect(reduceMotion("on", false)).toBe(true);
    expect(reduceMotion("on", true)).toBe(true);
    expect(reduceMotion("off", true)).toBe(false);
    expect(reduceMotion("off", false)).toBe(false);
  });

  it("marks the page for the sheets' CSS", () => {
    const root = { dataset: {} as DOMStringMap };
    applyMotion(true, root);
    expect(root.dataset.motion).toBe("reduce");
    applyMotion(false, root);
    expect(root.dataset.motion).toBe("full");
  });
});

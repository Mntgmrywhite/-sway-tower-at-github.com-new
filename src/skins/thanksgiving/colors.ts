import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Thanksgiving colors, shared by every layer: a cozy late-November afternoon in a hollow, in
// flat warm comic-strip colors. A soft cornflower sky warming to gold at the hills, apricot
// clouds, lavender hills far off, an olive-gold lawn and a warm brick path in front.

export const PALETTE: Palette = {
  skyTop: "#6f97e2",
  skyMid: "#e9b6b2",
  skyBottom: "#ffdc9c",
  star: "#fff6dc",
  moon: "#fff1c8",
  cloudShadow: "#e3967a",
  cloudBase: "#ffc79f",
  cloudLight: "#ffecd2",
  far: "#a98cbc",
  fieldFar: "#dcc46a",
  fieldNear: "#98a743",
  grass: "#b6c94c",
  grassDark: "#74902f",
  stone: "#b4634a",
  stoneLight: "#d48b69",
  ink: "#3b2419",
};

export const INK = PALETTE.ink;

/** A cel-shaded material: flat body, lit top, shaded bottom. */
export interface Tone {
  base: string;
  light: string;
  shade: string;
}

export function tone(base: string, light = 0.36, shade = 0.24): Tone {
  return { base, light: mix(base, "#ffffff", light), shade: mix(base, INK, shade) };
}

// Shared materials.
export const WOOD = tone("#b9814c");
export const WOOD_DARK = tone("#8c5a35");
export const BARK = tone("#7d4e31", 0.25, 0.25);
export const PUMPKIN = tone("#f7862a");
export const STEM = "#6f8a2c";
export const LIT = "#ffd768";
export const LIT_HOT = "#fff1b0";
export const SHADOW = "rgba(59, 36, 25, 0.18)";

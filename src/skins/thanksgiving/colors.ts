import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Thanksgiving colors, shared by every layer: a warm autumn evening. Sunset amber under a
// dusky violet sky, rose-and-peach clouds, a golden stubble field and warm stone in front.

export const PALETTE: Palette = {
  skyTop: "#4a3a8e",
  skyMid: "#b5629a",
  skyBottom: "#ffb366",
  star: "#fff3d6",
  moon: "#ffd98a",
  cloudShadow: "#d0657e",
  cloudBase: "#f7948a",
  cloudLight: "#ffcfa6",
  far: "#b65e86",
  fieldFar: "#e8b552",
  fieldNear: "#b9772e",
  grass: "#f0c544",
  grassDark: "#b88a22",
  stone: "#86675c",
  stoneLight: "#a3816f",
  ink: "#3a1d2c",
};

export const INK = PALETTE.ink;

/** A cel-shaded material: flat body, lit top, shaded bottom. */
export interface Tone {
  base: string;
  light: string;
  shade: string;
}

export function tone(base: string, light = 0.38, shade = 0.26): Tone {
  return { base, light: mix(base, "#ffffff", light), shade: mix(base, INK, shade) };
}

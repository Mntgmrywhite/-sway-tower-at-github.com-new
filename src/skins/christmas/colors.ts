import { mix } from "../../base/draw";

// Christmas cartoon palette, shared by every Christmas layer.

/** Outline color for everything up close: a deep winter navy. */
export const INK = "#1c2348";

// Bright candy colors for the bars and the props.
export const RED = "#ff4f5e";
export const GREEN = "#4fd06b";
export const GOLD = "#ffd03f";
export const ICE = "#6fd5ff";
export const BLUE = "#5b8cff";
export const PINK = "#ff74b8";
export const LILAC = "#b28cff";
export const ORANGE = "#ff9a3d";
export const LIME = "#9fe04a";
export const TEAL = "#33d1a8";
export const COOKIE = "#f0a45a";
export const AMBER = "#ffbf3a";
export const WHITE = "#ffffff";

/** The sky, from the top down to the horizon: deep blue to icy periwinkle. */
export const SKY_TOP = "#2a3f94";
export const SKY_MID = "#5274d2";
export const SKY_BOTTOM = "#a3bcf2";

/** Faded silhouettes on the horizon (palette.far), their snow and their lit windows. */
export const FAR = "#5a6fc2";
export const FAR_BACK = mix(FAR, SKY_BOTTOM, 0.38);
export const FAR_SNOW = mix(FAR, "#ffffff", 0.5);
export const FAR_BACK_SNOW = mix(FAR_BACK, "#ffffff", 0.45);
export const FAR_LAMP = mix(FAR, "#ffe08a", 0.82);

/** The snowfield from the horizon to the viewer. */
export const FIELD_FAR = "#dbe8fa";
export const FIELD_NEAR = "#a9c4ec";

/** Snow up close: lit tops falling into soft blue shade. */
export const SNOW = "#fbfdff";
export const SNOW_SHADE = "#c9dcf5";
export const SNOW_DEEP = "#9fbbe6";

/** Fir greens for the Christmas tree: lit, body, shade. */
export const PINE_LIGHT = "#5fd27f";
export const PINE = "#2fae5c";
export const PINE_DARK = "#1f8248";

export const TRUNK = "#a0603a";
export const TWIG = "#8a5532";
export const CARROT = "#ff8a2b";

/** Colors for strings of lights, in chase order. */
export const LIGHTS = [RED, GOLD, ICE, PINK] as const;

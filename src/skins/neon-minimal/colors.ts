import { mix } from "../../base/draw";
import { Fade, Neon, Shade } from "./tube";

// The Minimal palette: five neon hues on neutral darks (warm charcoal, deep slate).

export const ORANGE = "#ff6a1f"; // west-side orange
export const GOLD = "#ffc23a"; // glossy gold
export const PINK = "#ff2a7a"; // deep hot pink
export const BLUE = "#2f7bff"; // vibrant blue
export const GREEN = "#22e07a"; // spectrum green
export const WARM_WHITE = "#f7e4c4";
/** The cove light along the foot of the wall (the neon world's horizon glow). */
export const COVE = "#80503a";

export const N_ORANGE = new Neon(ORANGE);
export const N_GOLD = new Neon(GOLD);
export const N_PINK = new Neon(PINK);
export const N_BLUE = new Neon(BLUE);
export const N_GREEN = new Neon(GREEN);

/** Dark silhouettes: the arch's backplate, the gallery panel, plinths. */
export const PLATE = new Shade("#121318", 0.7);
export const PANEL = new Shade("#1a1c23", 0.6);
export const PLINTH = new Shade("#202229", 0.75);
/** The steel pin a sculpture turns on. */
export const PIN = new Shade("#555a67", 0.5);
/** Lit top edges of the silhouettes. */
export const EDGE = "#3c3f49";
/** Plinth tops lit by the neon standing on them. */
export const LIT_BLUE = mix("#3c3f49", BLUE, 0.5);
export const LIT_PINK = mix("#3c3f49", PINK, 0.5);
/** Mounting hardware and the power lead. */
export const HARDWARE = "#868a96";
export const CABLE = "#2b2d34";
/** The gallery label on the panel, and its lines of print. */
export const LABEL = "#7d7871";
export const LABEL_TEXT = "#3a3733";

/** The cove light mirrored in the polished floor. */
export const COVE_SHEEN = new Fade(COVE, 0.3);
/** The base bar's dark orange glass (bars[0] is ORANGE), for its reflection in the floor. */
export const BASE_GLASS = new Shade(mix(ORANGE, "#000000", 0.78), 0.45);

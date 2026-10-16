import type { Ctx } from "../base/draw";
import type { NeonSkin, Scene } from "./skin";
import { deepCity, farSkyline, heroTowers, smogLine } from "./neon-cyber/city";
import { AMBER, BASE_BAR, BLUE, CYAN, PALETTE, PURPLE } from "./neon-cyber/colors";
import * as icon from "./neon-cyber/icons";
import { lanes } from "./neon-cyber/lanes";
import { ceilingVeil, moon, murk, searchlights, skyFill, smogBanks, stars } from "./neon-cyber/sky";
import { seaTop, smogSea, strata } from "./neon-cyber/smog";
import { streetFloor, streetProps } from "./neon-cyber/street";
import { toneIndex, toneOf } from "./neon-cyber/tone";
import { farRain, nearRain } from "./neon-cyber/weather";

// Neon Cyberpunk: tech noir in neon blue, electric purple and magenta on charcoal. A rainy
// megacity at night, and a climb out of it. On the street: wet asphalt mirroring the neon, a
// figure under a glowing umbrella beneath a street lamp, a steaming noodle stall, vending
// machines and a parked hover car, the megacity's towers rising from the far edge of the street
// with lit windows, glyph signs (our own abstract marks) and a holographic billboard, and a low
// ceiling of smog with searchlights sweeping into it. Climb, and you rise past the towers'
// faces, their rooftop gardens and antenna forests, while the city's lights spread out below
// and drones, sky docks, holo billboards and a sky garden hang in the lanes at the sides. The
// rain thins, you rise through the smog (a deep violet murk, strata of denser smog lit from
// below sliding down past you), and come out above it: the smog lies below as a sea of
// cloud tops glowing with the city's light, the far skyline's spires poke through, and the sky
// clears to a deep night with stars and a crisp moon.
// Calm by design: life keeps to the sides of the screen, and behind the tower nothing moves.
//
// The altitude story needs every layer of the backdrop, so the skin paints all of it in one
// pass (`backdrop`, in the ground hook). The celestial and far hooks are empty on purpose: they
// switch off the base sun and mountains, which the backdrop would only paint over.

function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const step = toneIndex(s);
  if (tone.above) {
    // Above the smog: the clear sky, the sea below, and what pokes out of it.
    const sea = seaTop(s, tone);
    skyFill(ctx, s, tone, step, sea + s.u * 0.05);
    stars(ctx, s, tone);
    moon(ctx, s, tone);
    farSkyline(ctx, s, tone);
    smogSea(ctx, s, tone, step, sea);
    heroTowers(ctx, s, tone);
  } else {
    // Under the smog: the city up to the smog's line, fading into the ceiling, and the street.
    const line = smogLine(s);
    skyFill(ctx, s, tone, step, s.horizonY + 1);
    farSkyline(ctx, s, tone);
    deepCity(ctx, s, tone);
    heroTowers(ctx, s, tone);
    ceilingVeil(ctx, s, line);
    moon(ctx, s, tone);
    searchlights(ctx, s, tone);
    smogBanks(ctx, s, tone, line);
    streetFloor(ctx, s, tone);
  }
  murk(ctx, s, tone);
  strata(ctx, s, tone);
  lanes(ctx, s, tone);
  streetProps(ctx, s);
  farRain(ctx, s, tone);
}

function front(ctx: Ctx, s: Scene): void {
  nearRain(ctx, s, toneOf(s));
}

function none(): void {}

export const neonCyber: NeonSkin = {
  id: "neon-cyber",
  style: "neon",
  name: "Neon Cyberpunk",
  fonts: ["Zen Dots"],
  palette: PALETTE,
  // Neighbors alternate warm / cool and light / deep so every seam reads.
  bars: [
    { color: BASE_BAR, icon: icon.circuit },
    { color: CYAN, icon: icon.chip },
    { color: PURPLE, icon: icon.eye },
    { color: "#ffe03a", icon: icon.lightning },
    { color: BLUE, icon: icon.hex },
    { color: "#39ffb0", icon: icon.dataStream },
    { color: "#ff3b6b", icon: icon.lock },
    { color: "#5ad8ff", icon: icon.antenna },
    { color: "#d64bff", icon: icon.skullMask },
    { color: "#c4d2ff", icon: icon.blade },
    { color: AMBER, icon: icon.satellite },
    { color: "#2ff5d2", icon: icon.umbrella },
  ],
  hud: {
    display: "'Zen Dots', Orbitron, 'Arial Black', sans-serif",
    title: "#e6f3ff",
    ui: "#a04dff",
    accent: "#38e8ff",
    life: "#ff2bd6",
  },
  celestial: none,
  far: none,
  ground: backdrop,
  foreground: front,
};

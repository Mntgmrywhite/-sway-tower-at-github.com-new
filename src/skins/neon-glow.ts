import type { NeonSkin } from "./skin";
import { PALETTE } from "./neon-glow/common";
import { partyFar } from "./neon-glow/far";
import { partyGround } from "./neon-glow/ground";
import * as icon from "./neon-glow/icons";
import { partySky, wallPaint } from "./neon-glow/sky";

// Neon Blacklight: a glow party under UV lights. A deep violet-black hall with a mirror ball
// and a blacklight tube overhead, laser fans sweeping up from light towers, the crowd packed
// along the horizon with glow sticks waving, dancers in face paint and glow bracelets, a DJ
// booth and a speaker stack splashed with dripping glow paint, and a dance floor that lights
// up on the beat. Everything stays dark and calm enough that the glowing bars outshine it.

export const neonGlow: NeonSkin = {
  id: "neon-glow",
  style: "neon",
  name: "Neon Blacklight",
  palette: PALETTE,
  // UV pigments; neighbors alternate hue and lightness so every seam reads.
  bars: [
    { color: "#fff23a", icon: icon.smiley },
    { color: "#ff3fd1", icon: icon.lightning },
    { color: "#8cff2e", icon: icon.star },
    { color: "#ff4d6d", icon: icon.heart },
    { color: "#e9e2ff", icon: icon.musicNote },
    { color: "#ff9a2a", icon: icon.glowStick },
    { color: "#3ff0ff", icon: icon.paintSplat },
    { color: "#d6ff3a", icon: icon.peace },
    { color: "#b46bff", icon: icon.eye },
    { color: "#3dffb0", icon: icon.sparkle },
    { color: "#ffd21f", icon: icon.crown },
    { color: "#ff5cf0", icon: icon.wave },
  ],
  hud: {
    display: "Monoton, Audiowide, 'Arial Black', sans-serif",
    title: "#f4eeff",
    ui: "#9b4dff",
    accent: "#8cff2e",
    life: "#ff3fd1",
  },
  celestial: wallPaint,
  sky: partySky,
  far: partyFar,
  ground: partyGround,
};

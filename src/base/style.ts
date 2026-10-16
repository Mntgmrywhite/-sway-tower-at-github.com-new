import type { Scene, Skin } from "../skins/skin";
import { BAR_RADIUS, drawBar } from "./blocks";
import { alpha, ink, inkedLine, neonStroke, neonText, outlined, outlinedText, roundRectPath, type Ctx } from "./draw";
import { drawNeonBar, NEON_BAR_RADIUS } from "./neon-blocks";
import { drawNeonForeground, drawNeonPost, drawNeonWorld } from "./neon-world";
import { drawForeground, drawWorld } from "./world";

// One place that knows how each visual style draws: the world, the bars, and the HUD pieces.
// The renderer asks for the kit of the active skin and never branches on style itself.

export interface StyleKit {
  /** Everything behind the tower. */
  world(ctx: Ctx, s: Scene): void;
  /** Everything in front of the tower, under the HUD (drawn with the camera's roll and shake). */
  front(ctx: Ctx, s: Scene): void;
  /** Optional screen-space pass over the whole scene, after the camera transform (neon's scanlines). */
  post?(ctx: Ctx, s: Scene): void;
  bar(ctx: Ctx, x: number, y: number, w: number, h: number, level: number): void;
  /** Bar corner radius as a fraction of bar height. */
  radius: number;
  /** Font stack for numbers and labels. */
  body: string;
  /** HUD text: fill plus this style's outline (and glow, for neon). */
  text(ctx: Ctx, t: string, x: number, y: number, fill: string, outline: number): void;
  /** A life marker: filled when `on`. */
  life(ctx: Ctx, x: number, y: number, r: number, on: boolean): void;
  /** The game-over card behind its text. */
  card(ctx: Ctx, x: number, y: number, w: number, h: number, u: number): void;

  // Balance telegraphing (src/fx): a few primitives so gauges, rails and pops read in every style.
  /** Signal colors, #rrggbb: ok (green), warn (amber), danger (red), calm (STEADY cyan), gold (rebuild), wind (streaks). */
  tones: Tones;
  /** Dark backing for HUD widgets (the gauge track, rings). */
  well: string;
  /** Fill the current path, then outline it: ink for cartoon, a neon tube in `rim` for neon. */
  plate(ctx: Ctx, fill: string | CanvasGradient, rim: string, width: number): void;
  /** Stroke the current path as a bright line of `color`, `width` px: ink-cased, or a neon tube. */
  beam(ctx: Ctx, color: string, width: number): void;
  /** A flat highlight stroke around the current path (no blur): a translucent band, or a neon glow. */
  halo(ctx: Ctx, color: string, width: number): void;
}

export interface Tones {
  ok: string;
  warn: string;
  danger: string;
  calm: string;
  gold: string;
  wind: string;
}

const kits = new WeakMap<Skin, StyleKit>();

export function kitFor(skin: Skin): StyleKit {
  let kit = kits.get(skin);
  if (!kit) {
    kit = skin.style === "neon" ? neonKit(skin) : cartoonKit(skin);
    kits.set(skin, kit);
  }
  return kit;
}

function cartoonKit(skin: Exclude<Skin, { style: "neon" }>): StyleKit {
  const hud = skin.hud;
  const inkColor = skin.palette.ink;
  return {
    world: (ctx, s) => drawWorld(ctx, s, skin),
    front: (ctx, s) => drawForeground(ctx, s, skin),
    bar: (ctx, x, y, w, h, level) => drawBar(ctx, x, y, w, h, level, skin),
    radius: BAR_RADIUS,
    body: "Fredoka, 'Trebuchet MS', system-ui, sans-serif",
    text: (ctx, t, x, y, fill, outline) => outlinedText(ctx, t, x, y, fill, "#000000", outline),
    life(ctx, x, y, r, on) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = on ? hud.life : "rgba(255, 255, 255, 0.3)";
      ctx.fill();
      ink(ctx, Math.max(1.5, r * 0.3), "#000000");
    },
    card(ctx, x, y, w, h, u) {
      roundRectPath(ctx, x + u * 0.012, y + u * 0.016, w, h, u * 0.045);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();
      roundRectPath(ctx, x, y, w, h, u * 0.045);
      ctx.fillStyle = hud.ui;
      ctx.fill();
      roundRectPath(ctx, x + u * 0.012, y + u * 0.012, w - u * 0.024, h - u * 0.024, u * 0.035);
      ctx.lineWidth = Math.max(1.5, u * 0.006);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();
      roundRectPath(ctx, x, y, w, h, u * 0.045);
      ink(ctx, Math.max(3, u * 0.012), "#000000");
    },
    // Wind is a light cyan (inked by `beam`), so streaks read over white clouds and snow.
    tones: { ok: "#5ee05a", warn: "#ffb11f", danger: "#ff3d3d", calm: "#5fe8ff", gold: "#ffd23f", wind: "#8ff0ff" },
    well: "#2a2350",
    plate: (ctx, fill, _rim, width) => outlined(ctx, fill, width, inkColor),
    beam: (ctx, color, width) => inkedLine(ctx, color, width, Math.max(1, width * 0.4), inkColor),
    halo(ctx, color, width) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = alpha(color, 0.85);
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    },
  };
}

function neonKit(skin: Extract<Skin, { style: "neon" }>): StyleKit {
  const hud = skin.hud;
  return {
    world: (ctx, s) => drawNeonWorld(ctx, s, skin),
    front: (ctx, s) => drawNeonForeground(ctx, s, skin),
    // Scanlines and vignette stay aligned to the screen while the camera rolls (and cost less).
    post: (ctx, s) => drawNeonPost(ctx, s),
    bar: (ctx, x, y, w, h, level) => drawNeonBar(ctx, x, y, w, h, level, skin),
    radius: NEON_BAR_RADIUS,
    body: "Orbitron, 'Trebuchet MS', system-ui, sans-serif",
    text: (ctx, t, x, y, fill, outline) => neonText(ctx, t, x, y, fill, hud.ui, outline),
    life(ctx, x, y, r, on) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (on) {
        ctx.fillStyle = hud.life;
        ctx.fill();
        neonStroke(ctx, hud.life, Math.max(1, r * 0.25), 3);
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = Math.max(1, r * 0.25);
        ctx.stroke();
      }
    },
    card(ctx, x, y, w, h, u) {
      roundRectPath(ctx, x, y, w, h, u * 0.03);
      ctx.fillStyle = "rgba(10, 4, 22, 0.92)";
      ctx.fill();
      neonStroke(ctx, hud.ui, Math.max(1.5, u * 0.006), 3.5);
    },
    tones: { ok: "#39ff88", warn: "#ffb21f", danger: "#ff2f4f", calm: "#22e3ff", gold: "#ffe24d", wind: "#a8f6ff" },
    well: "#0c0618",
    plate(ctx, fill, rim, width) {
      ctx.fillStyle = fill;
      ctx.fill();
      neonStroke(ctx, rim, Math.max(1, width * 0.8), 2.6);
    },
    beam: (ctx, color, width) => neonStroke(ctx, color, width, 2.6),
    halo: (ctx, color, width) => neonStroke(ctx, color, Math.max(1, width * 0.3), 3.2),
  };
}

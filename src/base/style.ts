import type { BarInfo, Scene, Skin } from "../skins/skin";
import { cartoonBlast, neonBlast, type BlastPainter } from "../fx/blast";
import { BAR_RADIUS, drawBar } from "./blocks";
import { ink, neonStroke, neonText, outlinedText, roundRectPath, type Ctx } from "./draw";
import { drawNeonBar, NEON_BAR_RADIUS } from "./neon-blocks";
import { drawNeonForeground, drawNeonPost, drawNeonWorld } from "./neon-world";
import { drawForeground, drawWorld } from "./world";

// One place that knows how each visual style draws: the world, the bars, and the HUD pieces.
// The renderer asks for the kit of the active skin and never branches on style itself.

export interface StyleKit {
  /** Everything behind the tower. */
  world(ctx: Ctx, s: Scene): void;
  /** Everything in front of the tower, under the HUD. */
  front(ctx: Ctx, s: Scene): void;
  /** A bar; `info` (time, role, the last landing) lets a skin's own painter animate it. */
  bar(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, info?: BarInfo): void;
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
  /** The game-over blast's burst, smoke, sparks and flash (src/fx/blast.ts; src/fx/topple.ts poses them). */
  blast: BlastPainter;
}

/** What a bar painter is told when the caller has no clock (the preview sheet, the blast's slabs). */
export const RESTING: BarInfo = Object.freeze({ t: 0, role: "tower", sinceLand: Infinity, still: true });

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
  return {
    world: (ctx, s) => drawWorld(ctx, s, skin),
    front: (ctx, s) => drawForeground(ctx, s, skin),
    bar: (ctx, x, y, w, h, level, info) =>
      skin.bar ? skin.bar(ctx, x, y, w, h, level, info ?? RESTING) : drawBar(ctx, x, y, w, h, level, skin),
    radius: BAR_RADIUS,
    blast: cartoonBlast(skin),
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
  };
}

function neonKit(skin: Extract<Skin, { style: "neon" }>): StyleKit {
  const hud = skin.hud;
  return {
    world: (ctx, s) => drawNeonWorld(ctx, s, skin),
    front(ctx, s) {
      drawNeonForeground(ctx, s, skin);
      drawNeonPost(ctx, s);
    },
    bar: (ctx, x, y, w, h, level) => drawNeonBar(ctx, x, y, w, h, level, skin),
    radius: NEON_BAR_RADIUS,
    blast: neonBlast(skin),
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
  };
}

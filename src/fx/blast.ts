import { alpha, circle, hash, ink, inkedLine, mix, type Ctx } from "../base/draw";
import type { CartoonSkin, NeonSkin } from "../skins/skin";

// How each style draws the game-over blast (src/fx/topple.ts poses it, in one of its variants; the
// style kit hands the renderer the painter for the active skin). The painter knows shapes, not
// variants: a burst, smoke, sparks, a bar flying as a streak, a shockwave ring, a firework's flare,
// confetti and streamers, and the flash over the scene. Cartoon: flat shapes in fire and party
// colors with an ink outline, puffy two-tone smoke, inked sparks and a white flash. Neon: glowing
// rays, rings and sparks, dim violet smoke with a faint rim, an accent flash; the glow is layered
// strokes, never shadowBlur. Bright on purpose: it is a feedback moment.

/** A smoke puff on screen: center and radius, px; tone 0 (shade), 1 (body), 2 (light); opacity. */
export interface SmokePuff {
  x: number;
  y: number;
  r: number;
  tone: 0 | 1 | 2;
  opacity: number;
}

/** A square of confetti on screen: center and size, px; rotation; how much of its width shows as it flips (0..1); a palette index; opacity. */
export interface ConfettiBit {
  x: number;
  y: number;
  size: number;
  angle: number;
  squash: number;
  color: number;
  opacity: number;
}

export interface BlastPainter {
  /** The burst centered at (x, y), px, `r` px across at its biggest; `k` 0 → 1 through its life. */
  burst(ctx: Ctx, x: number, y: number, r: number, k: number, dir: -1 | 1): void;
  /** The smoke, as one cloud. Puffs shrink away as they go (and thin out, where a style can show that). */
  smoke(ctx: Ctx, puffs: readonly SmokePuff[]): void;
  /** A spark streaking from its tail (x0, y0) to its head (x1, y1), `width` px, in the palette's `color` (0: the style's own). */
  spark(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, opacity: number, color?: number): void;
  /** A bar flying as a bright streak of its own color (the bar at `level`), from its tail to its head, `width` px. */
  streak(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, opacity: number, level: number): void;
  /** A shockwave ring centered at (x, y), `r` px, `width` px thick. */
  ring(ctx: Ctx, x: number, y: number, r: number, width: number, opacity: number): void;
  /** A firework bloom's flash at (x, y), `r` px, in the palette's `color`. */
  flare(ctx: Ctx, x: number, y: number, r: number, opacity: number, color: number): void;
  /** Confetti, as one shower. */
  confetti(ctx: Ctx, bits: readonly ConfettiBit[]): void;
  /** A streamer along `points` (head first), `width` px, in the palette's `color`. */
  streamer(ctx: Ctx, points: readonly { x: number; y: number }[], width: number, color: number, opacity: number): void;
  /** The flash over the whole scene, `w` x `h` px. */
  flash(ctx: Ctx, w: number, h: number, opacity: number): void;
}

/** Fire, from the burst's rim to its heart. */
const FIRE = ["#ff5522", "#ffa126", "#ffe04a", "#fffbe2"] as const;
/** Sparks and fireworks: gold, then the colors a bloom cycles through (red, white; a bloom's second pass starts a step along). */
const SPARK = ["#ffe04a", "#ff5a3c", "#ffffff", "#4fd2ff"] as const;
/** Confetti: a party's worth of bright paper. */
const PAPER = ["#ff4f6b", "#ffd33d", "#3dd68c", "#4f9cff", "#c26dff", "#ffffff"] as const;
const FLASH = "#fff8e2";

/** The palette's color for an index, wrapping. */
function pick<T>(colors: readonly T[], i: number): T {
  return colors[((i % colors.length) + colors.length) % colors.length]!;
}

/**
 * The burst's size through its life, as a share of its full radius: it pops up past full size, eases
 * back, holds, then collapses into the smoke.
 */
export function burstScale(k: number): number {
  if (k < 0.18) return 0.4 + 0.8 * (1 - (1 - k / 0.18) ** 2);
  if (k < 0.4) return 1.2 - 0.2 * ((k - 0.18) / 0.22);
  return Math.max(0, 1 - ((k - 0.4) / 0.6) ** 2);
}

/** A jagged star around (x, y): `points` spikes out to about `r`, valleys at `inner` of it, jittered by `seed`. */
function starPath(ctx: Ctx, x: number, y: number, r: number, inner: number, points: number, turn: number, seed: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = turn + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r * (0.8 + 0.2 * hash(seed + i)) : r * inner * (0.9 + 0.2 * hash(seed + i));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The current path as a polyline through `points`. */
function polyline(ctx: Ctx, points: readonly { x: number; y: number }[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

export function cartoonBlast(skin: CartoonSkin): BlastPainter {
  const p = skin.palette;
  const inkColor = p.ink;
  const barColor = (level: number) => pick(skin.bars, level).color;
  // Smoke reads as smoke on any sky: near-neutral greys, a touch of the skin's own clouds.
  const smoke = [mix("#a59dbb", p.cloudShadow, 0.25), mix("#d9d4e6", p.cloudBase, 0.2), mix("#ffffff", p.cloudLight, 0.2)];
  return {
    burst(ctx, x, y, r, k, dir) {
      const s = r * burstScale(k);
      if (s <= 0.5) return;
      const line = Math.max(2, r * 0.045);
      const turn = k * 0.5 * dir;
      ctx.save();
      // Each layer leans a little toward the side the tower went over.
      const layers: [number, number, number, number][] = [
        // size, valley depth, spikes, lean
        [1, 0.6, 13, 0],
        [0.74, 0.62, 11, 0.06],
        [0.48, 0.7, 9, 0.1],
      ];
      layers.forEach(([size, inner, points, lean], i) => {
        starPath(ctx, x + dir * lean * s, y, s * size, inner, points, turn + i * 0.4, 17 * (i + 1));
        ctx.fillStyle = FIRE[i]!;
        ctx.fill();
        ink(ctx, line, inkColor);
      });
      ctx.beginPath();
      circle(ctx, x + dir * 0.12 * s, y, s * 0.2);
      ctx.fillStyle = FIRE[3];
      ctx.fill();
      ctx.restore();
    },
    smoke(ctx, puffs) {
      // One cloud with one outline: every puff's ink first (twice as wide, so half shows outside),
      // then the bodies over it, back tones first, then a light cap on each. Flat and opaque: puffs
      // go by shrinking, not fading.
      const shown = puffs.filter((q) => q.r > 0.5).sort((a, b) => a.tone - b.tone);
      if (shown.length === 0) return;
      const line = Math.max(1.5, Math.max(...shown.map((q) => q.r)) * 0.09);
      ctx.save();
      ctx.beginPath();
      for (const q of shown) circle(ctx, q.x, q.y, q.r);
      ink(ctx, line * 2, inkColor);
      for (const q of shown) {
        ctx.beginPath();
        circle(ctx, q.x, q.y, q.r);
        ctx.fillStyle = smoke[q.tone]!;
        ctx.fill();
      }
      for (const q of shown) {
        if (q.tone === 0) continue;
        ctx.beginPath();
        circle(ctx, q.x - q.r * 0.22, q.y - q.r * 0.26, q.r * 0.55);
        ctx.fillStyle = mix(smoke[q.tone]!, "#ffffff", 0.5);
        ctx.fill();
      }
      ctx.restore();
    },
    spark(ctx, x0, y0, x1, y1, width, opacity, color = 0) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      inkedLine(ctx, pick(SPARK, color), width, Math.max(1, width * 0.35), inkColor);
      ctx.restore();
    },
    streak(ctx, x0, y0, x1, y1, width, opacity, level) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      // The bar's color, lit up, with a hot core.
      inkedLine(ctx, mix(barColor(level), "#ffffff", 0.3), width, Math.max(1, width * 0.3), inkColor);
      ctx.strokeStyle = FIRE[3];
      ctx.lineWidth = Math.max(1, width * 0.35);
      ctx.stroke();
      ctx.restore();
    },
    ring(ctx, x, y, r, width, opacity) {
      if (opacity <= 0 || r <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      circle(ctx, x, y, r);
      inkedLine(ctx, FLASH, width, Math.max(1, width * 0.25), inkColor);
      ctx.restore();
    },
    flare(ctx, x, y, r, opacity, color) {
      if (opacity <= 0 || r <= 0.5) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      circle(ctx, x, y, r);
      ctx.fillStyle = pick(SPARK, color);
      ctx.fill();
      ink(ctx, Math.max(1.5, r * 0.08), inkColor);
      ctx.beginPath();
      circle(ctx, x, y, r * 0.55);
      ctx.fillStyle = FIRE[3];
      ctx.fill();
      ctx.restore();
    },
    confetti(ctx, bits) {
      ctx.save();
      for (const b of bits) {
        if (b.opacity <= 0) continue;
        ctx.globalAlpha = b.opacity;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        const w = b.size;
        const h = b.size * b.squash;
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = pick(PAPER, b.color);
        ctx.fill();
        ink(ctx, Math.max(1, b.size * 0.16), inkColor);
        ctx.restore();
      }
      ctx.restore();
    },
    streamer(ctx, points, width, color, opacity) {
      if (opacity <= 0 || points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      polyline(ctx, points);
      inkedLine(ctx, pick(PAPER, color), width, Math.max(1, width * 0.35), inkColor);
      ctx.restore();
    },
    flash(ctx, w, h, opacity) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = FLASH;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
  };
}

/** Stroke the current path as a glowing tube: a wide faint halo, the colored core, a hot white center. */
function glow(ctx: Ctx, color: string, width: number, opacity: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = alpha(color, 0.22 * opacity);
  ctx.lineWidth = width * 3;
  ctx.stroke();
  ctx.strokeStyle = alpha(color, 0.9 * opacity);
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = alpha("#ffffff", 0.9 * opacity);
  ctx.lineWidth = Math.max(0.6, width * 0.35);
  ctx.stroke();
}

export function neonBlast(skin: NeonSkin): BlastPainter {
  const hot = skin.hud.accent;
  const rim = skin.hud.ui;
  const barColor = (level: number) => pick(skin.bars, level).color;
  const haze = [0.12, 0.2, 0.28].map((m) => mix(skin.palette.skyMid, rim, m));
  /** Sparks: the skin's hot accent, then its glow, white and its life color. */
  const sparks = [hot, rim, "#ffffff", skin.hud.life];
  /** Confetti: the skin's own neon, lit. */
  const paper = [hot, rim, "#ffffff", skin.hud.life, mix(hot, rim, 0.5), "#ffe04a"];
  return {
    burst(ctx, x, y, r, k, dir) {
      const s = r * burstScale(k);
      const fade = 1 - k * k;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // A soft halo and a white-hot heart.
      ctx.beginPath();
      circle(ctx, x, y, Math.max(0, s * 0.55));
      ctx.fillStyle = alpha(hot, 0.3 * fade);
      ctx.fill();
      ctx.beginPath();
      circle(ctx, x, y, Math.max(0, s * 0.26));
      ctx.fillStyle = alpha("#ffffff", 0.85 * fade);
      ctx.fill();
      // Rays, longer toward the side the tower went over.
      const rays = 16;
      for (let i = 0; i < rays; i++) {
        const a = (i * 2 * Math.PI) / rays + k * 0.4 * dir;
        const lean = 1 + 0.25 * Math.cos(a) * dir;
        const len = s * (0.62 + 0.45 * hash(31 + i)) * lean;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * s * 0.18, y + Math.sin(a) * s * 0.18);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        glow(ctx, i % 2 === 0 ? hot : rim, Math.max(1.2, r * 0.055), fade);
      }
      // The shock ring runs out past the rays as the burst goes.
      ctx.beginPath();
      circle(ctx, x, y, r * (0.35 + 0.85 * k));
      glow(ctx, rim, Math.max(1, r * 0.04 * (1 - k)), fade);
      ctx.restore();
    },
    smoke(ctx, puffs) {
      // A dim violet haze, each puff with a faint rim of the skin's glow.
      ctx.save();
      for (const q of puffs) {
        if (q.opacity <= 0 || q.r <= 0.5) continue;
        ctx.beginPath();
        circle(ctx, q.x, q.y, q.r);
        ctx.fillStyle = alpha(haze[q.tone]!, 0.6 * q.opacity);
        ctx.fill();
        ctx.strokeStyle = alpha(rim, 0.3 * q.opacity);
        ctx.lineWidth = Math.max(1, q.r * 0.05);
        ctx.stroke();
      }
      ctx.restore();
    },
    spark(ctx, x0, y0, x1, y1, width, opacity, color = 0) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      glow(ctx, pick(sparks, color), width, opacity);
      ctx.restore();
    },
    streak(ctx, x0, y0, x1, y1, width, opacity, level) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      glow(ctx, barColor(level), width, opacity);
      ctx.restore();
    },
    ring(ctx, x, y, r, width, opacity) {
      if (opacity <= 0 || r <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      circle(ctx, x, y, r);
      glow(ctx, rim, width, opacity);
      ctx.restore();
    },
    flare(ctx, x, y, r, opacity, color) {
      if (opacity <= 0 || r <= 0.5) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      circle(ctx, x, y, r);
      ctx.fillStyle = alpha(pick(sparks, color), 0.35 * opacity);
      ctx.fill();
      ctx.beginPath();
      circle(ctx, x, y, r * 0.45);
      ctx.fillStyle = alpha("#ffffff", 0.85 * opacity);
      ctx.fill();
      ctx.restore();
    },
    confetti(ctx, bits) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const b of bits) {
        if (b.opacity <= 0) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        const w = b.size;
        const h = b.size * b.squash;
        const c = pick(paper, b.color);
        // A faint halo, the lit square, a hot center.
        ctx.fillStyle = alpha(c, 0.25 * b.opacity);
        ctx.fillRect(-w, -h, w * 2, h * 2);
        ctx.fillStyle = alpha(c, 0.9 * b.opacity);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = alpha("#ffffff", 0.7 * b.opacity);
        ctx.fillRect(-w / 4, -h / 4, w / 2, h / 2);
        ctx.restore();
      }
      ctx.restore();
    },
    streamer(ctx, points, width, color, opacity) {
      if (opacity <= 0 || points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      polyline(ctx, points);
      glow(ctx, pick(paper, color), width * 0.7, opacity);
      ctx.restore();
    },
    flash(ctx, w, h, opacity) {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = alpha(rim, 0.45 * opacity);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = alpha("#ffffff", 0.3 * opacity);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
  };
}

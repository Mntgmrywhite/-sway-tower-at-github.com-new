import { alpha, mix, type Ctx } from "../../base/draw";

// Calm neon for the Minimal skin: thin tubes with a soft two-step halo and a pale core, so the
// scenery reads as delicate line art and the glowing bars stay the brightest thing on screen.
// Gradients are built once per canvas in unit space and placed with translate/scale, so a
// frame allocates nothing.

/** A gradient built lazily for one canvas and reused while that canvas draws. */
abstract class Cached {
  private owner: Ctx | null = null;
  private grad: CanvasGradient | null = null;

  get(ctx: Ctx): CanvasGradient {
    if (this.owner !== ctx || !this.grad) {
      this.grad = this.make(ctx);
      this.owner = ctx;
    }
    return this.grad;
  }

  protected abstract make(ctx: Ctx): CanvasGradient;
}

/** Radial glow on the unit disc: bright center fading to nothing at radius 1. */
export class Wash extends Cached {
  private readonly color: string;
  private readonly peak: number;

  constructor(color: string, peak: number) {
    super();
    this.color = color;
    this.peak = peak;
  }

  protected make(ctx: Ctx): CanvasGradient {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, alpha(this.color, this.peak));
    g.addColorStop(0.4, alpha(this.color, this.peak * 0.45));
    g.addColorStop(1, alpha(this.color, 0));
    return g;
  }
}

/** Vertical fade on y = 0..1: `peak` alpha at 0, clear at 1. */
export class Fade extends Cached {
  private readonly color: string;
  private readonly peak: number;

  constructor(color: string, peak: number) {
    super();
    this.color = color;
    this.peak = peak;
  }

  protected make(ctx: Ctx): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, 0, 1);
    g.addColorStop(0, alpha(this.color, this.peak));
    g.addColorStop(0.55, alpha(this.color, this.peak * 0.3));
    g.addColorStop(1, alpha(this.color, 0));
    return g;
  }
}

/** One neon color: stroke colors precomputed, plus its wall wash and reflection fades. */
export class Neon {
  readonly core: string;
  readonly hot: string;
  readonly haloWide: string;
  readonly haloNear: string;
  /** Faint full-strength line, for the unlit part of a shape (the moon's dark side). */
  readonly ghost: string;
  readonly wash: Wash;
  readonly pool: Wash;
  readonly fadeCore: Fade;

  constructor(color: string) {
    this.core = color;
    this.hot = mix(color, "#ffffff", 0.42);
    this.haloWide = alpha(color, 0.06);
    this.haloNear = alpha(color, 0.15);
    this.ghost = alpha(color, 0.16);
    this.wash = new Wash(color, 0.16);
    this.pool = new Wash(color, 0.2);
    this.fadeCore = new Fade(color, 0.4);
  }
}

/** A dark silhouette color with a fade for its reflection. */
export class Shade {
  readonly color: string;
  readonly fade: Fade;

  constructor(color: string, reflect: number) {
    this.color = color;
    this.fade = new Fade(color, reflect);
  }
}

/** Stroke the current path as a calm neon tube `w` px wide; `glow` (0..1) breathes the halo. */
export function tube(ctx: Ctx, n: Neon, w: number, glow: number): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = glow;
  ctx.strokeStyle = n.haloWide;
  ctx.lineWidth = w * 5.5;
  ctx.stroke();
  ctx.strokeStyle = n.haloNear;
  ctx.lineWidth = w * 2.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = n.core;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = n.hot;
  ctx.lineWidth = Math.max(0.6, w * 0.4);
  ctx.stroke();
}

/** Soft light spilled on a wall or floor: an ellipse of radii rx, ry around (x, y). */
export function glow(ctx: Ctx, g: Wash, x: number, y: number, rx: number, ry: number, a: number): void {
  if (a <= 0 || rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  ctx.fillStyle = g.get(ctx);
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

/**
 * Reflections in the polished floor. Shapes are drawn inside `mirrored(...)` with the same
 * path code as the real thing; strokes and fills fade out over `len` px below the floor line.
 * In mirrored space "down into the floor" is "up", hence the negative scale.
 */
const mirror = { y: 0, len: 1 };

export function beginMirror(ctx: Ctx, floorY: number, len: number): void {
  mirror.y = floorY;
  mirror.len = Math.max(1, len);
  ctx.save();
  ctx.translate(0, floorY * 2);
  ctx.scale(1, -1);
}

export function endMirror(ctx: Ctx): void {
  ctx.restore();
}

/** Inside a mirror: stroke the current path as a fading reflection of a tube (a soft, wider core). */
export function reflectTube(ctx: Ctx, n: Neon, w: number, a: number): void {
  const k = mirror.len;
  ctx.save();
  ctx.translate(0, mirror.y);
  ctx.scale(k, -k);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = a;
  ctx.strokeStyle = n.fadeCore.get(ctx);
  ctx.lineWidth = (w * 1.6) / k;
  ctx.stroke();
  ctx.restore();
}

/** Inside a mirror: fill the current path as a fading reflection of a silhouette. */
export function reflectFill(ctx: Ctx, sh: Shade): void {
  const k = mirror.len;
  ctx.save();
  ctx.translate(0, mirror.y);
  ctx.scale(k, -k);
  ctx.fillStyle = sh.fade.get(ctx);
  ctx.fill();
  ctx.restore();
}

/** How a shape is painted: for real, or as its reflection (inside beginMirror/endMirror). */
export interface Pass {
  fill(ctx: Ctx, sh: Shade): void;
  tube(ctx: Ctx, n: Neon, w: number, glow: number): void;
  readonly mirrored: boolean;
}

export const REAL: Pass = {
  fill(ctx, sh) {
    ctx.fillStyle = sh.color;
    ctx.fill();
  },
  tube,
  mirrored: false,
};

export const REFLECTION: Pass = {
  fill: reflectFill,
  tube: (ctx, n, w, g) => reflectTube(ctx, n, w, 0.55 + 0.45 * g),
  mirrored: true,
};

/** Slow breathing for a tube's halo, 0.78..1. */
export function breath(t: number, phase: number): number {
  return 0.89 + 0.11 * Math.sin(t * 0.55 + phase);
}

/** Everything a theme needs to paint the scene behind the tower, in CSS pixels. */
export interface Scene {
  cssW: number;
  cssH: number;
  /** Size unit: width of the portrait play area. */
  u: number;
  /** Pixels per world unit. */
  scale: number;
  /** Seconds of animation time (pauses with the game). */
  t: number;
  /** Pixels the camera has climbed since the start (0 at the ground). */
  rise: number;
  /** Camera height in world units; drives scenery that changes as you climb. */
  altitude: number;
  /** Screen y of the ground line the base sits on. */
  groundY: number;
  /** Screen x and width of the base block. */
  baseX: number;
  baseW: number;
}

export interface Theme {
  background(ctx: CanvasRenderingContext2D, scene: Scene): void;
  /** Optional layer drawn in front of the tower (before the HUD). */
  foreground?(ctx: CanvasRenderingContext2D, scene: Scene): void;
  /** Draw one block with its top-left at (x, y), w × h pixels. `level` picks its look. */
  block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number): void;
  hud: {
    /** Font family for titles and the PERFECT pop. */
    display: string;
    /** Font family for score, labels and hints. */
    body: string;
    /** Title color. */
    title: string;
    /** Outline color behind HUD text. */
    outline: string;
    score: string;
    muted: string;
    life: string;
    lifeLost: string;
    streak: string;
  };
}

/** Linear blend of two #rrggbb colors. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** Rounded-rectangle path, radius clamped so tiny slivers still draw. */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

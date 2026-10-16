// Shared drawing helpers for the neon base and every skin.
// Neon is built from strokes, not shadowBlur: a wide faint stroke for the glow, a colored
// core, and a thin hot center. That keeps it cheap enough for phones.

export type Ctx = CanvasRenderingContext2D;

/** Deterministic 0..1 noise from an integer. */
export function hash(i: number): number {
  const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return v - Math.floor(v);
}

function parseHex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear blend of two #rrggbb colors; returns #rrggbb so it can be mixed again. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const out = ca.map((v, i) => Math.round(v + ((cb[i] ?? 0) - v) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** #rrggbb with an alpha, as rgba(). */
export function alpha(c: string, a: number): string {
  const [r, g, b] = parseHex(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Closed circle as its own subpath, so several can share one fill without joining lines. */
export function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Closed ellipse as its own subpath. */
export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** Rounded-rectangle path, radius clamped so tiny slivers still draw. */
export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Stroke the current path as a neon tube: soft glow, colored core, hot center.
 * `width` is the core width in pixels.
 */
export function neonStroke(ctx: Ctx, color: string, width: number, glow = 3): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(color, 0.22);
  ctx.lineWidth = width * glow;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = mix(color, "#ffffff", 0.65);
  ctx.lineWidth = Math.max(0.6, width * 0.35);
  ctx.stroke();
  ctx.restore();
}

/** Fill the current path with a dark silhouette and rim it in neon. The standard skin prop look. */
export function neonShape(ctx: Ctx, fill: string, rim: string, width: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  neonStroke(ctx, rim, width);
}

/** Text with a black outline, a neon glow, and a solid fill. */
export function neonText(ctx: Ctx, text: string, x: number, y: number, fill: string, glow: string, outline: number): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = alpha(glow, 0.28);
  ctx.lineWidth = outline * 2.4;
  ctx.strokeText(text, x, y);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 0..1..0 envelope over a repeating cycle: rise, hold, sink, rest. */
export function emerge(t: number, period: number, offset: number): number {
  const p = ((((t + offset) % period) + period) % period) / period;
  if (p < 0.2) return easeOut(p / 0.2);
  if (p < 0.65) return 1;
  if (p < 0.8) return 1 - easeOut((p - 0.65) / 0.15);
  return 0;
}

export function easeOut(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

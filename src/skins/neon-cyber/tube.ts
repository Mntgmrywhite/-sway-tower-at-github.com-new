import { alpha, mix, type Ctx } from "../../base/draw";

// Light for the scenery: cached color strings, so a frame allocates none, and the skin's neon
// tube. Only pass `tint`/`whiten` a fixed set of amounts (each one is kept); for an opacity
// that changes every frame, use a fixed tint under ctx.globalAlpha instead.

const TINTS = new Map<string, Map<number, string>>();
const WHITENED = new Map<string, Map<number, string>>();

function shelf(store: Map<string, Map<number, string>>, color: string): Map<number, string> {
  let byK = store.get(color);
  if (!byK) {
    byK = new Map();
    store.set(color, byK);
  }
  return byK;
}

/** `color` (#rrggbb) at opacity `a`, as rgba(). */
export function tint(color: string, a: number): string {
  const byA = shelf(TINTS, color);
  let v = byA.get(a);
  if (v === undefined) {
    v = alpha(color, a);
    byA.set(a, v);
  }
  return v;
}

/** `color` (#rrggbb) blended toward white by `t`, as #rrggbb. */
export function whiten(color: string, t: number): string {
  const byT = shelf(WHITENED, color);
  let v = byT.get(t);
  if (v === undefined) {
    v = mix(color, "#ffffff", t);
    byT.set(t, v);
  }
  return v;
}

/**
 * Stroke the current path as a neon tube `width` px wide: a soft glow `glow` times wider, then
 * a hot core. The base neonStroke's look at two thirds of the cost (the scenery is full of
 * small tubes). Leaves round caps and joins set.
 */
export function tube(ctx: Ctx, color: string, width: number, glow = 2.4): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = tint(color, 0.22);
  ctx.lineWidth = width * glow;
  ctx.stroke();
  ctx.strokeStyle = whiten(color, 0.3);
  ctx.lineWidth = width;
  ctx.stroke();
}

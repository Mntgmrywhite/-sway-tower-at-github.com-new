import { circle, hash, ink, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { CLOUD, CLOUD_LIGHT, CLOUD_SHADE, INK } from "./colors";
import { inkW } from "./island";

// The near edge we look over: the tops of a bank of cloud, puffy and inked like everything up
// close, with a shaded underside. It covers the base band and drops away faster than the tower
// as the camera climbs (parallax 1.6, like the band), so it only frames the start.

/** Puffs along the lip, repeating: size (u) and a small rise (u). */
const LIP_SPAN = 7;
const LIP = Array.from({ length: LIP_SPAN }, (_, i) => ({ r: 0.042 + hash(i + 1500) * 0.016, up: hash(i + 1600) * 0.01 }));
const STEP = 0.064;

/** Puffs of the lip as subpaths: centers on `y`, scaled by k and shifted by dy (in radii). */
function puffRow(ctx: Ctx, s: Scene, y: number, k: number, dy: number): void {
  const u = s.u;
  const step = u * STEP;
  // Centered on the screen, so both edges match at any width.
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  for (let i = -n; i <= n; i++) {
    const p = LIP[((i % LIP_SPAN) + LIP_SPAN) % LIP_SPAN]!;
    const r = p.r * u;
    circle(ctx, s.cssW / 2 + i * step, y - p.up * u + dy * r, r * k);
  }
}

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  // The base band's top edge; its grass tips reach a little above it.
  const band = layerGround(s, 1.6) + u * 0.36;
  const y = band - u * 0.006;
  if (y - u * 0.08 > s.cssH) return;
  const lw = inkW(s);
  // Outline first (only its outer half survives the fill), then the shaded body, the lit
  // body shifted up inside it with a scalloped lower edge, and light caps.
  ctx.beginPath();
  puffRow(ctx, s, y, 1, 0);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = CLOUD_SHADE;
  ctx.fill();
  ctx.fillRect(0, y, s.cssW, s.cssH - y);
  ctx.beginPath();
  puffRow(ctx, s, y, 0.92, -0.14);
  ctx.rect(0, y - u * 0.01, s.cssW, u * 0.055);
  const step = u * 0.06;
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  for (let i = -n; i <= n; i++) circle(ctx, s.cssW / 2 + (i + 0.5) * step, y + u * 0.045, u * (0.026 + 0.008 * hash(i + 1700)));
  ctx.fillStyle = CLOUD;
  ctx.fill();
  ctx.beginPath();
  puffRow(ctx, s, y, 0.4, -0.62);
  ctx.fillStyle = CLOUD_LIGHT;
  ctx.fill();
}

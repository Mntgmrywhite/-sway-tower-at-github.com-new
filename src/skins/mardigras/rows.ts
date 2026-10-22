import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { streetLevel } from "./place";
import type { Tone } from "./tone";

// The row across the street, behind the tower: low Creole cottages and shotgun houses in faded
// pastels (rose, lilac, mint, butter), steep roofs with dormers and chimneys, shuttered doors in
// a row, a narrow townhouse with a gallery here and there. It stands a little back from the far
// sidewalk (ROW_F of the way from the horizon to the street), low enough that the rooftops, the
// river, the cathedral and the towers downtown show over it, so the Quarter steps back from the
// street instead of walling it in; and as you climb it drops away to show the cathedral's square
// behind it (square.ts). Mid-distance, so flat and a little faded, with no outline, and still: it
// lies right behind the tower. By night its windows light up.
//
// Positions are in u from the screen's center, heights in u up from the row's line.

/** How far the row stands from the horizon toward the street (0 the horizon, 1 the far sidewalk). */
export const ROW_F = 0.9;

/** One house of the row: left edge and width (u), wall height, its kind, its color (0..3), how many openings. */
interface House {
  x: number;
  w: number;
  h: number;
  /** 0 a cottage under a side-gabled roof with dormers, 1 a shotgun house with its gable to the street and a porch, 2 a narrow townhouse with a gallery under a parapet. */
  kind: number;
  color: number;
  doors: number;
}

const SPAN = 1.7;
const HOUSES: House[] = (() => {
  const out: House[] = [];
  let x = -SPAN;
  for (let i = 0; x < SPAN; i++) {
    const r = hash(i + 5100);
    const kind = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
    const w = kind === 0 ? 0.11 + hash(i + 5200) * 0.04 : kind === 1 ? 0.06 + hash(i + 5200) * 0.015 : 0.07 + hash(i + 5200) * 0.02;
    out.push({ x, w, h: kind === 2 ? 0.125 : 0.068 + hash(i + 5300) * 0.01, kind, color: i % 4, doors: kind === 0 ? 4 : 2 });
    x += w + 0.004;
  }
  return out;
})();

/** The row's line on screen. */
function rowLine(s: Scene): number {
  return s.horizonY + (streetLevel(s) - s.horizonY) * ROW_F;
}

/** The row of cottages across the street: walls, roofs, openings, chimneys; lit windows by night. */
export function cottages(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = rowLine(s) + 1;
  if (base - u * 0.16 > s.cssH) return;
  const half = s.cssW / 2 / u + 0.05;
  const visible = (h: House) => h.x < half && h.x + h.w > -half;
  // Walls, one fill per color.
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = tone.walls[c]!;
    ctx.beginPath();
    for (const h of HOUSES) {
      if (h.color !== c || !visible(h)) continue;
      const x0 = cx + h.x * u;
      const top = base - h.h * u;
      ctx.rect(x0, top, h.w * u, h.h * u);
      if (h.kind === 1) {
        // The shotgun's gable end, in the wall's color.
        ctx.moveTo(x0 - u * 0.004, top);
        ctx.lineTo(x0 + (h.w * u) / 2, top - u * 0.04);
        ctx.lineTo(x0 + h.w * u + u * 0.004, top);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
  // Roofs: the cottages' side-gabled roofs with dormers and chimneys, the shotguns' eaves and
  // porch roofs, the townhouses' parapets and gallery rails.
  ctx.fillStyle = tone.roofMid;
  ctx.beginPath();
  for (const h of HOUSES) {
    if (!visible(h)) continue;
    const x0 = cx + h.x * u;
    const x1 = x0 + h.w * u;
    const top = base - h.h * u;
    if (h.kind === 0) {
      const rh = u * 0.05;
      ctx.moveTo(x0 - u * 0.006, top + u * 0.004);
      ctx.lineTo(x0 + u * 0.012, top - rh);
      ctx.lineTo(x1 - u * 0.012, top - rh);
      ctx.lineTo(x1 + u * 0.006, top + u * 0.004);
      ctx.closePath();
      // Two dormers and a chimney.
      for (const f of [0.32, 0.68]) {
        const dx = x0 + (x1 - x0) * f;
        ctx.moveTo(dx - u * 0.012, top - rh * 0.25);
        ctx.lineTo(dx - u * 0.012, top - rh * 0.62);
        ctx.lineTo(dx, top - rh * 0.88);
        ctx.lineTo(dx + u * 0.012, top - rh * 0.62);
        ctx.lineTo(dx + u * 0.012, top - rh * 0.25);
        ctx.closePath();
      }
      ctx.rect(x0 + (x1 - x0) * 0.82, top - rh - u * 0.012, u * 0.01, u * 0.02);
    } else if (h.kind === 1) {
      // The eaves' trim along the gable, and a porch roof across the front.
      ctx.moveTo(x0 - u * 0.006, top + u * 0.002);
      ctx.lineTo(x0 + (x1 - x0) / 2, top - u * 0.046);
      ctx.lineTo(x1 + u * 0.006, top + u * 0.002);
      ctx.lineTo(x1, top + u * 0.002);
      ctx.lineTo(x0 + (x1 - x0) / 2, top - u * 0.038);
      ctx.lineTo(x0, top + u * 0.002);
      ctx.closePath();
      ctx.rect(x0 - u * 0.004, top + h.h * u * 0.3, x1 - x0 + u * 0.008, u * 0.008);
    } else {
      ctx.rect(x0 - u * 0.003, top - u * 0.012, x1 - x0 + u * 0.006, u * 0.014);
      ctx.rect(x0, top + h.h * u * 0.48, x1 - x0, u * 0.006);
      ctx.rect(x0, top + h.h * u * 0.42, x1 - x0, Math.max(1, u * 0.0025));
    }
  }
  ctx.fill();
  // The lit slope of each cottage roof.
  ctx.fillStyle = tone.roofMidLit;
  ctx.beginPath();
  for (const h of HOUSES) {
    if (h.kind !== 0 || !visible(h)) continue;
    const x0 = cx + h.x * u;
    const top = base - h.h * u;
    ctx.moveTo(x0 - u * 0.004, top + u * 0.002);
    ctx.lineTo(x0 + u * 0.012, top - u * 0.048);
    ctx.lineTo(x0 + u * 0.03, top - u * 0.048);
    ctx.lineTo(x0 + u * 0.014, top + u * 0.002);
    ctx.closePath();
  }
  ctx.fill();
  // Openings: tall shuttered doors in a row, dark by day; the dormers' windows.
  const lit = tone.lit > 0.3;
  for (let pass = 0; pass < (lit ? 2 : 1); pass++) {
    ctx.fillStyle = pass ? tone.glow : tone.slate;
    if (pass) ctx.globalAlpha = tone.lit;
    ctx.beginPath();
    for (let i = 0; i < HOUSES.length; i++) {
      const h = HOUSES[i]!;
      if (!visible(h)) continue;
      const x0 = cx + h.x * u;
      const top = base - h.h * u;
      const n = h.doors;
      for (let d = 0; d < n; d++) {
        if (pass && hash(i * 11 + d + 5400) < 0.4) continue;
        const dx = x0 + (h.w * u * (d + 0.5)) / n;
        const dh = h.kind === 2 ? h.h * u * 0.32 : h.h * u * 0.62;
        const dw = Math.min(u * 0.014, (h.w * u) / n - u * 0.008);
        ctx.rect(dx - dw / 2, base - dh, dw, dh - u * 0.004);
        if (h.kind === 2) ctx.rect(dx - dw / 2, top + h.h * u * 0.1, dw, h.h * u * 0.28);
      }
      if (h.kind === 0 && !pass) {
        for (const f of [0.32, 0.68]) {
          const dx = x0 + h.w * u * f;
          ctx.rect(dx - u * 0.005, top - u * 0.028, u * 0.01, u * 0.014);
        }
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

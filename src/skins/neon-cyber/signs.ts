import { alpha, circle, hash, neonStroke, oval, type Ctx } from "../../base/draw";
import { TAU } from "./colors";

// Signage for the megacity: tall vertical neon signs stacked with abstract glyphs (our own
// geometric marks, never real script or logos), short horizontal glyph boards, and holographic
// billboards: translucent panels with scanlines, cycling between an eye, a koi, a turning
// wireframe cube and an equalizer, glitching now and then.

/** A glyph centered at (x, y), about `g` across, added to the current path. */
type Glyph = (ctx: Ctx, x: number, y: number, g: number) => void;

const GLYPHS: Glyph[] = [
  // diamond with a dot
  (ctx, x, y, g) => {
    ctx.moveTo(x, y - g * 0.5);
    ctx.lineTo(x + g * 0.4, y);
    ctx.lineTo(x, y + g * 0.5);
    ctx.lineTo(x - g * 0.4, y);
    ctx.closePath();
    circle(ctx, x, y, g * 0.05);
  },
  // down triangle under a bar
  (ctx, x, y, g) => {
    ctx.moveTo(x - g * 0.45, y - g * 0.45);
    ctx.lineTo(x + g * 0.45, y - g * 0.45);
    ctx.moveTo(x - g * 0.35, y - g * 0.2);
    ctx.lineTo(x + g * 0.35, y - g * 0.2);
    ctx.lineTo(x, y + g * 0.45);
    ctx.closePath();
  },
  // ring with ticks above and below
  (ctx, x, y, g) => {
    circle(ctx, x, y, g * 0.28);
    ctx.moveTo(x, y - g * 0.5);
    ctx.lineTo(x, y - g * 0.3);
    ctx.moveTo(x, y + g * 0.3);
    ctx.lineTo(x, y + g * 0.5);
  },
  // box with a diagonal
  (ctx, x, y, g) => {
    ctx.rect(x - g * 0.38, y - g * 0.38, g * 0.76, g * 0.76);
    ctx.moveTo(x - g * 0.38, y + g * 0.38);
    ctx.lineTo(x + g * 0.38, y - g * 0.38);
  },
  // bars around a chevron
  (ctx, x, y, g) => {
    ctx.moveTo(x - g * 0.42, y - g * 0.45);
    ctx.lineTo(x - g * 0.42, y + g * 0.45);
    ctx.moveTo(x + g * 0.42, y - g * 0.45);
    ctx.lineTo(x + g * 0.42, y + g * 0.45);
    ctx.moveTo(x - g * 0.15, y - g * 0.3);
    ctx.lineTo(x + g * 0.15, y);
    ctx.lineTo(x - g * 0.15, y + g * 0.3);
  },
  // zigzag
  (ctx, x, y, g) => {
    ctx.moveTo(x - g * 0.3, y - g * 0.45);
    ctx.lineTo(x + g * 0.3, y - g * 0.15);
    ctx.lineTo(x - g * 0.3, y + g * 0.15);
    ctx.lineTo(x + g * 0.3, y + g * 0.45);
  },
  // nested squares, the inner one turned
  (ctx, x, y, g) => {
    ctx.rect(x - g * 0.42, y - g * 0.42, g * 0.84, g * 0.84);
    ctx.moveTo(x, y - g * 0.26);
    ctx.lineTo(x + g * 0.26, y);
    ctx.lineTo(x, y + g * 0.26);
    ctx.lineTo(x - g * 0.26, y);
    ctx.closePath();
  },
  // arch over a bar
  (ctx, x, y, g) => {
    ctx.moveTo(x - g * 0.38, y + g * 0.1);
    ctx.arc(x, y + g * 0.1, g * 0.38, Math.PI, 0);
    ctx.moveTo(x - g * 0.45, y + g * 0.42);
    ctx.lineTo(x + g * 0.45, y + g * 0.42);
  },
  // hexagon split by a bar
  (ctx, x, y, g) => {
    for (let i = 0; i <= 6; i++) {
      const a = (i * TAU) / 6;
      const px = x + Math.cos(a) * g * 0.45;
      const py = y + Math.sin(a) * g * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.moveTo(x - g * 0.22, y);
    ctx.lineTo(x + g * 0.22, y);
  },
  // three dots over a bar
  (ctx, x, y, g) => {
    circle(ctx, x, y - g * 0.3, g * 0.08);
    circle(ctx, x - g * 0.25, y + g * 0.05, g * 0.08);
    circle(ctx, x + g * 0.25, y + g * 0.05, g * 0.08);
    ctx.moveTo(x - g * 0.42, y + g * 0.42);
    ctx.lineTo(x + g * 0.42, y + g * 0.42);
  },
];

function glyph(seed: number, i: number): Glyph {
  return GLYPHS[Math.floor(hash(seed * 7.31 + i * 3.17) * GLYPHS.length)]!;
}

/** True for brief moments when a tired tube drops out. */
export function flickerOff(t: number, seed: number, rate = 9, odds = 0.06): boolean {
  return hash(Math.floor(t * rate) * 1.37 + seed * 91.7) < odds;
}

const PANEL = "#06050c";

/**
 * A dark panel at (x, y) top-left with a neon frame and a row (or column) of glyphs, frame and
 * glyphs in one tube. A tired sign drops out for a moment now and then; `glow` dims it all
 * for distance.
 */
function glyphPanel(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  seed: number,
  glow: number,
  vertical: boolean,
  off: boolean,
): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fillStyle = PANEL;
  ctx.fill();
  const across = vertical ? w : h;
  const along = vertical ? h : w;
  const n = Math.max(2, Math.round(along / (across * (vertical ? 1.05 : 0.95))));
  const cell = along / n;
  const g = Math.min(across * 0.6, cell * 0.66);
  for (let i = 0; i < n; i++) {
    const gx = vertical ? x + w / 2 : x + cell * (i + 0.5);
    const gy = vertical ? y + cell * (i + 0.5) : y + h / 2;
    glyph(seed, i)(ctx, gx, gy, g);
  }
  ctx.globalAlpha = glow * (off ? 0.3 : 1);
  neonStroke(ctx, color, Math.max(0.9, across * 0.065), 2.3);
  ctx.globalAlpha = 1;
}

/** A vertical sign hanging at (x, y) top-left, `w` wide and `h` tall: a column of glyphs. */
export function verticalSign(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number, t: number, glow = 1): void {
  glyphPanel(ctx, x, y, w, h, color, seed, glow, true, flickerOff(t, seed));
}

/** A short horizontal board of glyphs, (x, y) top-left. */
export function boardSign(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number, t: number, glow = 1): void {
  glyphPanel(ctx, x, y, w, h, color, seed, glow, false, flickerOff(t, seed, 7, 0.04));
}

// Wireframe cube corners and edges.
const CUBE = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
] as const;
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
] as const;
const PX = new Float64Array(8);
const PY = new Float64Array(8);

/** The current picture on a billboard, added to the path, centered in the panel. */
function holoContent(ctx: Ctx, kind: number, cx: number, cy: number, w: number, h: number, t: number): void {
  const m = Math.min(w, h);
  switch (kind) {
    case 0: {
      // A watching eye that glances side to side.
      const rx = m * 0.42;
      ctx.moveTo(cx - rx, cy);
      ctx.quadraticCurveTo(cx, cy - rx * 0.95, cx + rx, cy);
      ctx.quadraticCurveTo(cx, cy + rx * 0.95, cx - rx, cy);
      ctx.closePath();
      const look = Math.sin(t * 0.9) * rx * 0.3;
      circle(ctx, cx + look, cy, m * 0.16);
      circle(ctx, cx + look, cy, m * 0.06);
      break;
    }
    case 1: {
      // A koi swimming in place: body, forked tail, two fins.
      const sw = Math.sin(t * 2.4) * 0.18;
      const L = Math.min(w * 0.36, h * 0.7);
      oval(ctx, cx, cy, L * 0.55, L * 0.22, sw * 0.4);
      const tx = cx - Math.cos(sw * 0.4) * L * 0.55;
      const ty = cy - Math.sin(sw * 0.4) * L * 0.55;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - L * 0.32, ty - L * (0.24 + sw));
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - L * 0.32, ty + L * (0.24 - sw));
      ctx.moveTo(cx - L * 0.05, cy + L * 0.2);
      ctx.lineTo(cx - L * 0.2, cy + L * 0.4);
      ctx.moveTo(cx - L * 0.05, cy - L * 0.2);
      ctx.lineTo(cx - L * 0.2, cy - L * 0.4);
      circle(ctx, cx + L * 0.36, cy - L * 0.05, L * 0.04);
      break;
    }
    case 2: {
      // A wireframe cube turning.
      const a = t * 0.8;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const r = m * 0.24;
      for (let i = 0; i < 8; i++) {
        const [x, y, z] = CUBE[i]!;
        const rx = x * ca - z * sa;
        const rz = x * sa + z * ca;
        const ry = y * 0.94 + rz * 0.34;
        PX[i] = cx + rx * r;
        PY[i] = cy + ry * r;
      }
      for (const [a0, a1] of EDGES) {
        ctx.moveTo(PX[a0]!, PY[a0]!);
        ctx.lineTo(PX[a1]!, PY[a1]!);
      }
      break;
    }
    default: {
      // An equalizer: bars pumping to a beat.
      const n = 7;
      const bw = (w * 0.7) / n;
      for (let i = 0; i < n; i++) {
        const v = 0.25 + 0.75 * Math.abs(Math.sin(t * (2.1 + i * 0.37) + i * 1.3));
        const bx = cx - w * 0.35 + bw * (i + 0.5);
        ctx.moveTo(bx, cy + h * 0.32);
        ctx.lineTo(bx, cy + h * 0.32 - v * h * 0.6);
      }
    }
  }
}

/**
 * A holographic billboard, (x, y) top-left: a see-through panel with scanlines and corner
 * brackets, its picture changing every few seconds, with a glitch now and then. When `ex`/`ey`
 * are given, faint beams rise from an emitter there to the panel's lower corners.
 */
export function holoBillboard(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glitchColor: string,
  seed: number,
  t: number,
  ex = NaN,
  ey = NaN,
): void {
  const flick = 0.85 + 0.15 * Math.sin(t * 23 + seed) * Math.sin(t * 3.1 + seed * 2);
  const glitch = hash(Math.floor(t * 6) * 2.71 + seed * 17.3) > 0.86;

  if (!Number.isNaN(ex)) {
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(x + w * 0.08, y + h);
    ctx.lineTo(x + w * 0.92, y + h);
    ctx.closePath();
    ctx.fillStyle = alpha(color, 0.05 * flick);
    ctx.fill();
  }

  ctx.fillStyle = alpha(color, 0.09 * flick);
  ctx.fillRect(x, y, w, h);
  // Scanlines
  ctx.beginPath();
  const gap = Math.max(2.5, h / 16);
  for (let ly = y + gap / 2; ly < y + h; ly += gap) {
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
  }
  ctx.strokeStyle = alpha(color, 0.14 * flick);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Corner brackets
  const c = Math.min(w, h) * 0.18;
  ctx.beginPath();
  ctx.moveTo(x, y + c);
  ctx.lineTo(x, y);
  ctx.lineTo(x + c, y);
  ctx.moveTo(x + w - c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + c);
  ctx.moveTo(x + w, y + h - c);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - c, y + h);
  ctx.moveTo(x + c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.globalAlpha = 0.85 * flick;
  neonStroke(ctx, color, Math.max(1, Math.min(w, h) * 0.025), 2.2);

  const kind = Math.floor(t / 4.5 + seed * 1.7) % 4;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const lw = Math.max(1, Math.min(w, h) * 0.03);
  if (glitch) {
    // Split channel: the picture jumps sideways in the glitch color, then the main copy.
    ctx.beginPath();
    holoContent(ctx, kind, cx - w * 0.05, cy, w, h, t);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = glitchColor;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = alpha(glitchColor, 0.25);
    ctx.fillRect(x, y + h * hash(Math.floor(t * 6) + seed), w, h * 0.08);
  }
  ctx.beginPath();
  holoContent(ctx, kind, cx + (glitch ? w * 0.03 : 0), cy, w, h, t);
  ctx.globalAlpha = 0.8 * flick;
  neonStroke(ctx, color, lw, 2.2);
  ctx.globalAlpha = 1;
}

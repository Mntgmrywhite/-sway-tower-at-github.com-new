import { roundRectPath } from "./theme";

// Block drawers for the Halloween theme. Each draws a w × h slab with its top-left at (x, y)
// and repeats one small motif across it. Blocks are ~20px tall on a phone, so every motif is
// a bold silhouette rather than detail.

type Ctx = CanvasRenderingContext2D;

const NIGHT = "#0c0a12";
const GLOW = "#ffd860";

/** Fill a rounded slab, then clip to it so motifs never spill past the edges. Caller restores. */
function slab(ctx: Ctx, x: number, y: number, w: number, h: number, top: string, bottom: string, r = 0.3): void {
  roundRectPath(ctx, x, y, w, h, h * r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
}

/** Calls `draw(cx)` for evenly spaced motifs that fit across the block, centered. */
function motifs(x: number, w: number, step: number, draw: (cx: number) => void): void {
  const n = Math.max(1, Math.floor(w / step));
  const start = x + (w - n * step) / 2;
  for (let i = 0; i < n; i++) draw(start + step * (i + 0.5));
}

export function witches(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#7a3db0", "#4a2170");
  motifs(x, w, h * 1.3, (cx) => {
    // Pointed hat with a bent tip, green band, wide brim.
    ctx.fillStyle = NIGHT;
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.22, y + h * 0.8);
    ctx.lineTo(cx + h * 0.22, y + h * 0.8);
    ctx.lineTo(cx + h * 0.05, y + h * 0.28);
    ctx.lineTo(cx + h * 0.26, y + h * 0.08);
    ctx.lineTo(cx - h * 0.04, y + h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - h * 0.42, y + h * 0.78, h * 0.84, h * 0.1);
    ctx.fillStyle = "#7bd34a";
    ctx.fillRect(cx - h * 0.2, y + h * 0.64, h * 0.4, h * 0.09);
  });
  ctx.restore();
}

export function tombstones(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#2e2738", "#1b1622", 0.2);
  motifs(x, w, h * 0.95, (cx) => {
    const sw = h * 0.6;
    const r = sw / 2;
    ctx.fillStyle = "#9893ad";
    ctx.beginPath();
    ctx.moveTo(cx - r, y + h);
    ctx.lineTo(cx - r, y + h * 0.15 + r);
    ctx.arc(cx, y + h * 0.15 + r, r, Math.PI, 0);
    ctx.lineTo(cx + r, y + h);
    ctx.closePath();
    ctx.fill();
    // Engraved cross
    ctx.fillStyle = "#5d5873";
    ctx.fillRect(cx - h * 0.03, y + h * 0.3, h * 0.06, h * 0.4);
    ctx.fillRect(cx - h * 0.13, y + h * 0.4, h * 0.26, h * 0.06);
  });
  ctx.restore();
}

export function spiders(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#55506a", "#36324a");
  motifs(x, w, h * 1.6, (cx) => {
    // Web fanning down from the top edge.
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(0.75, h * 0.03);
    ctx.beginPath();
    for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + Math.sin(a) * h * 1.1, y + Math.cos(a) * h * 1.1);
    }
    ctx.stroke();
    for (const rr of [0.35, 0.7]) {
      ctx.beginPath();
      ctx.arc(cx, y, h * rr, 0.6, Math.PI - 0.6);
      ctx.stroke();
    }
    // Spider: two body segments and eight legs.
    const sy = y + h * 0.55;
    ctx.strokeStyle = NIGHT;
    ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const ly = sy - h * 0.12 + i * h * 0.08;
        ctx.moveTo(cx, ly);
        ctx.lineTo(cx + side * h * 0.22, ly - h * 0.1);
        ctx.lineTo(cx + side * h * 0.32, ly + h * 0.08);
      }
    }
    ctx.stroke();
    ctx.fillStyle = NIGHT;
    ctx.beginPath();
    ctx.arc(cx, sy + h * 0.06, h * 0.15, 0, Math.PI * 2);
    ctx.arc(cx, sy - h * 0.14, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4f4f";
    ctx.fillRect(cx - h * 0.05, sy - h * 0.16, h * 0.03, h * 0.03);
    ctx.fillRect(cx + h * 0.02, sy - h * 0.16, h * 0.03, h * 0.03);
  });
  ctx.restore();
}

export function hauntedHouses(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#2a3466", "#161c3a", 0.2);
  motifs(x, w, h * 1.25, (cx) => {
    ctx.fillStyle = NIGHT;
    // Roof and body
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.45, y + h * 0.5);
    ctx.lineTo(cx, y + h * 0.08);
    ctx.lineTo(cx + h * 0.45, y + h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - h * 0.34, y + h * 0.46, h * 0.68, h * 0.54);
    // Crooked chimney
    ctx.fillRect(cx + h * 0.18, y + h * 0.12, h * 0.1, h * 0.25);
    // Lit windows and a dark door
    ctx.fillStyle = GLOW;
    const s = h * 0.13;
    ctx.fillRect(cx - h * 0.24, y + h * 0.56, s, s);
    ctx.fillRect(cx + h * 0.11, y + h * 0.56, s, s);
    ctx.fillRect(cx - s / 2, y + h * 0.3, s, s * 0.9);
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(cx - h * 0.06, y + h * 0.76, h * 0.12, h * 0.24);
  });
  ctx.restore();
}

export function moons(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const bg = "#26306a";
  slab(ctx, x, y, w, h, bg, bg);
  const step = h * 1.1;
  motifs(x, w, step, (cx) => {
    ctx.fillStyle = "#f7e8b5";
    ctx.beginPath();
    ctx.arc(cx, y + h / 2, h * 0.33, 0, Math.PI * 2);
    ctx.fill();
    // Bite out of the moon in the slab color makes a crescent.
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx + h * 0.15, y + h * 0.42, h * 0.29, 0, Math.PI * 2);
    ctx.fill();
    // A star between moons
    ctx.fillStyle = "#ffffff";
    const sx = cx + step / 2;
    const r = Math.max(1, h * 0.06);
    ctx.fillRect(sx - r / 2, y + h * 0.3 - r * 1.5, r, r * 3);
    ctx.fillRect(sx - r * 1.5, y + h * 0.3 - r / 2, r * 3, r);
  });
  ctx.restore();
}

export function ghouls(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#8cc265", "#4f7f38", 0.4);
  motifs(x, w, h * 1.3, (cx) => {
    ctx.fillStyle = "#1c2a14";
    // Sunken eyes, slightly uneven
    ctx.beginPath();
    ctx.ellipse(cx - h * 0.18, y + h * 0.38, h * 0.12, h * 0.15, 0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + h * 0.18, y + h * 0.36, h * 0.13, h * 0.13, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5a3c";
    ctx.beginPath();
    ctx.arc(cx - h * 0.17, y + h * 0.4, h * 0.04, 0, Math.PI * 2);
    ctx.arc(cx + h * 0.19, y + h * 0.38, h * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Moaning mouth
    ctx.fillStyle = "#1c2a14";
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.74, h * 0.1, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function mummies(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#ece2c6", "#cbbd98", 0.25);
  // Diagonal bandage wraps
  ctx.strokeStyle = "rgba(120, 100, 60, 0.45)";
  ctx.lineWidth = Math.max(1, h * 0.06);
  ctx.beginPath();
  for (let lx = x - h; lx < x + w + h; lx += h * 0.38) {
    ctx.moveTo(lx, y);
    ctx.lineTo(lx + h * 0.5, y + h);
  }
  ctx.stroke();
  // Eyes peeking through a gap in the wraps
  const step = h * 2.2;
  motifs(x, w, step, (cx) => {
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(cx - h * 0.4, y + h * 0.3, h * 0.8, h * 0.28);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - h * 0.17, y + h * 0.44, h * 0.09, 0, Math.PI * 2);
    ctx.arc(cx + h * 0.17, y + h * 0.44, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NIGHT;
    ctx.beginPath();
    ctx.arc(cx - h * 0.15, y + h * 0.45, h * 0.04, 0, Math.PI * 2);
    ctx.arc(cx + h * 0.19, y + h * 0.45, h * 0.04, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function vampires(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  slab(ctx, x, y, w, h, "#1d1424", "#120c16", 0.25);
  // Red cape lining along the bottom
  ctx.fillStyle = "#b0142e";
  ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  motifs(x, w, h * 1.3, (cx) => {
    // Glowing red eyes
    ctx.fillStyle = "#ff2b45";
    ctx.beginPath();
    ctx.ellipse(cx - h * 0.16, y + h * 0.3, h * 0.08, h * 0.05, 0.25, 0, Math.PI * 2);
    ctx.ellipse(cx + h * 0.16, y + h * 0.3, h * 0.08, h * 0.05, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Grin with two fangs
    ctx.fillStyle = "#6b0b1a";
    ctx.fillRect(cx - h * 0.24, y + h * 0.5, h * 0.48, h * 0.07);
    ctx.fillStyle = "#ffffff";
    for (const side of [-1, 1]) {
      const fx = cx + side * h * 0.12;
      ctx.beginPath();
      ctx.moveTo(fx - h * 0.05, y + h * 0.52);
      ctx.lineTo(fx + h * 0.05, y + h * 0.52);
      ctx.lineTo(fx, y + h * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.restore();
}

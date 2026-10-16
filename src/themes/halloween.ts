import { roundRectPath, type Scene, type Theme } from "./theme";

// Palette
const SKY_TOP = "#2a1446";
const SKY_BOTTOM = "#0b0712";
const MOON = "#f7e8b5";
const GROUND = "#140d1d";
const GROUND_EDGE = "#2b1d3c";
const STONE = "#3b3350";
const STONE_DARK = "#2a2340";

const PUMPKIN_TOP = "#ff9b30";
const PUMPKIN_BOTTOM = "#d9600c";
const PUMPKIN_RIB = "rgba(110, 35, 0, 0.35)";
const GLOW = "#ffd860";

const CORN_WHITE = "#fff4dc";
const CORN_ORANGE = "#ff8a1f";
const CORN_YELLOW = "#ffc933";

const BAT = "#3a2656";
const BAT_EDGE = "#6a4a92";
const BAT_EYE = "#ff4f4f";

const BONE = "#ece3cc";
const BONE_SHADE = "#cfc3a5";
const SOCKET = "#2a2233";

type BlockDrawer = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;

function pumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  roundRectPath(ctx, x, y, w, h, h * 0.45);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, PUMPKIN_TOP);
  g.addColorStop(1, PUMPKIN_BOTTOM);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Ribs
  ctx.strokeStyle = PUMPKIN_RIB;
  ctx.lineWidth = Math.max(1, h * 0.07);
  const gap = h * 0.9;
  for (let rx = x + gap / 2; rx < x + w; rx += gap) {
    ctx.beginPath();
    ctx.moveTo(rx, y);
    ctx.quadraticCurveTo(rx + h * 0.12, y + h / 2, rx, y + h);
    ctx.stroke();
  }
  // Jack-o'-lantern face, only when there's room for it.
  if (w > h * 1.6) {
    const cx = x + w / 2;
    const e = h * 0.2;
    ctx.fillStyle = GLOW;
    for (const side of [-1, 1]) {
      const ex = cx + side * h * 0.3;
      ctx.beginPath();
      ctx.moveTo(ex - e / 2, y + h * 0.48);
      ctx.lineTo(ex + e / 2, y + h * 0.48);
      ctx.lineTo(ex, y + h * 0.22);
      ctx.closePath();
      ctx.fill();
    }
    // Zigzag grin
    const mw = h * 0.8;
    const my = y + h * 0.62;
    ctx.beginPath();
    ctx.moveTo(cx - mw / 2, my);
    for (let i = 1; i <= 4; i++) ctx.lineTo(cx - mw / 2 + (mw * i) / 4, my + (i % 2 ? h * 0.1 : 0));
    ctx.lineTo(cx + mw / 2 - h * 0.08, my + h * 0.2);
    ctx.lineTo(cx - mw / 2 + h * 0.08, my + h * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function candyCorn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, h * 0.35);
  ctx.clip();
  const third = h / 3;
  ctx.fillStyle = CORN_WHITE;
  ctx.fillRect(x, y, w, third + 0.5);
  ctx.fillStyle = CORN_ORANGE;
  ctx.fillRect(x, y + third, w, third + 0.5);
  ctx.fillStyle = CORN_YELLOW;
  ctx.fillRect(x, y + third * 2, w, third + 0.5);
  // Waxy shine
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + h * 0.3, y + h * 0.12, Math.max(0, w - h * 0.6), Math.max(1, h * 0.08));
  ctx.restore();
}

function bats(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  // Flat top, scalloped wing-edge bottom.
  const n = Math.max(1, Math.round(w / (h * 1.1)));
  const seg = w / n;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  for (let i = n; i >= 1; i--) {
    ctx.quadraticCurveTo(x + seg * (i - 0.5), y + h * 0.4, x + seg * (i - 1), y + h);
  }
  ctx.closePath();
  ctx.fillStyle = BAT;
  ctx.fill();
  ctx.fillStyle = BAT_EDGE;
  ctx.fillRect(x, y, w, Math.max(1.5, h * 0.12));

  // Pairs of glowing eyes, one per scallop.
  ctx.fillStyle = BAT_EYE;
  const r = Math.max(1, h * 0.07);
  for (let i = 0; i < n; i++) {
    const cx = x + seg * (i + 0.5);
    if (seg < h * 0.6) continue;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * h * 0.13, y + h * 0.32, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function skulls(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  roundRectPath(ctx, x, y, w, h, h * 0.3);
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = BONE_SHADE;
  ctx.fillRect(x, y + h * 0.78, w, h * 0.22);

  const step = h * 1.5;
  const n = Math.max(1, Math.floor(w / step));
  const start = x + (w - n * step) / 2;
  ctx.fillStyle = SOCKET;
  for (let i = 0; i < n; i++) {
    const cx = start + step * (i + 0.5);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * h * 0.19, y + h * 0.38, h * 0.13, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.52);
    ctx.lineTo(cx - h * 0.06, y + h * 0.66);
    ctx.lineTo(cx + h * 0.06, y + h * 0.66);
    ctx.closePath();
    ctx.fill();
    // Teeth
    ctx.fillRect(cx - h * 0.2, y + h * 0.78, h * 0.4, Math.max(1, h * 0.05));
    for (let k = -1; k <= 1; k++) ctx.fillRect(cx + k * h * 0.12, y + h * 0.78, Math.max(1, h * 0.04), h * 0.16);
  }
  ctx.restore();
}

/** The stack cycles pumpkin → candy corn → bats → skulls. */
const CYCLE: BlockDrawer[] = [pumpkin, candyCorn, bats, skulls];

// Fixed star field, as fractions of the screen.
const STARS = Array.from({ length: 45 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.678;
  return { x: a - Math.floor(a), y: (b - Math.floor(b)) * 0.7, r: 0.6 + ((i * 7) % 5) * 0.2 };
});

function flyingBat(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flap: number): void {
  const wing = Math.sin(flap) * size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - size * 0.5, y - wing - size * 0.2, x - size, y - wing);
  ctx.quadraticCurveTo(x - size * 0.6, y - wing * 0.3, x - size * 0.45, y + size * 0.1);
  ctx.quadraticCurveTo(x - size * 0.2, y, x, y + size * 0.15);
  ctx.quadraticCurveTo(x + size * 0.2, y, x + size * 0.45, y + size * 0.1);
  ctx.quadraticCurveTo(x + size * 0.6, y - wing * 0.3, x + size, y - wing);
  ctx.quadraticCurveTo(x + size * 0.5, y - wing - size * 0.2, x, y);
  ctx.fill();
}

function tombstone(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, groundY + 2);
  ctx.lineTo(x, groundY - h + w / 2);
  ctx.arc(x + w / 2, groundY - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, groundY + 2);
  ctx.closePath();
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.fillStyle = STONE_DARK;
  ctx.font = `700 ${Math.round(w * 0.32)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("RIP", x + w / 2, groundY - h * 0.45);
}

function background(ctx: CanvasRenderingContext2D, s: Scene): void {
  const sky = ctx.createLinearGradient(0, 0, 0, s.cssH);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, s.cssW, s.cssH);

  for (const [i, st] of STARS.entries()) {
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(s.t * 1.5 + i);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(st.x * s.cssW, st.y * s.cssH, st.r, st.r);
  }
  ctx.globalAlpha = 1;

  // Moon, top-left (the tuning button lives top-right).
  const mx = s.cssW * 0.18;
  const my = s.cssH * 0.1;
  const mr = s.u * 0.075;
  ctx.save();
  ctx.shadowColor = MOON;
  ctx.shadowBlur = mr * 1.2;
  ctx.fillStyle = MOON;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(180, 160, 110, 0.35)";
  ctx.beginPath();
  ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, Math.PI * 2);
  ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // A few bats crossing the sky.
  ctx.fillStyle = "#07040b";
  for (let i = 0; i < 3; i++) {
    const span = s.cssW + 120;
    const speed = 28 + i * 11;
    const x = ((s.t * speed + i * 170) % span) - 60;
    const y = s.cssH * (0.2 + i * 0.09) + Math.sin(s.t * 1.7 + i * 2) * 10;
    flyingBat(ctx, x, y, s.u * (0.035 - i * 0.006), s.t * (11 + i * 2));
  }

  // Graveyard ground the base stands on.
  if (s.groundY < s.cssH) {
    ctx.fillStyle = GROUND;
    ctx.beginPath();
    ctx.moveTo(0, s.groundY + s.u * 0.05);
    ctx.quadraticCurveTo(s.cssW / 2, s.groundY - s.u * 0.03, s.cssW, s.groundY + s.u * 0.05);
    ctx.lineTo(s.cssW, s.cssH);
    ctx.lineTo(0, s.cssH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = GROUND_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();

    const tw = s.u * 0.09;
    tombstone(ctx, s.baseX - tw * 2.1, s.groundY + s.u * 0.02, tw, tw * 1.35);
    tombstone(ctx, s.baseX + s.baseW + tw * 1.2, s.groundY + s.u * 0.025, tw * 0.85, tw * 1.15);
  }
}

export const halloween: Theme = {
  background,
  block(ctx, x, y, w, h, level) {
    const draw = CYCLE[((level % CYCLE.length) + CYCLE.length) % CYCLE.length];
    draw?.(ctx, x, y, w, h);
  },
  hud: {
    score: "#ffb347",
    muted: "rgba(255, 228, 190, 0.6)",
    life: "#ff8a1f",
    lifeLost: "rgba(255, 255, 255, 0.15)",
    streak: GLOW,
  },
};

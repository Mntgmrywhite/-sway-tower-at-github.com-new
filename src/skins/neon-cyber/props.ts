import { alpha, circle, mix, neonStroke, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { AMBER, BLUE, CYAN, MAGENTA, NEAR, NEAR_EDGE, NEAR_FACE, PURPLE, RED, STEAM, STEAM_LIT } from "./colors";
import { hoverCar } from "./car";
import { boardSign, flickerOff } from "./signs";

// Street props, each drawn standing at (x, y) on the floor at perspective size U (= u * k):
// a street lamp throwing a cone of light into the rain, a pair of vending machines, a noodle
// stall with lanterns and a glyph board, a pedestrian under a glowing umbrella and a steam vent.
// Dark silhouettes with a dim edge, lit by a few neon tubes. Local coordinates are in U, with
// the origin at the prop's foot.

const RED_LANTERN = mix(RED, "#ff6a3a", 0.35);

function edge(ctx: Ctx, U: number): void {
  ctx.strokeStyle = NEAR_EDGE;
  ctx.lineWidth = Math.max(1, U * 0.004);
  ctx.stroke();
}

/** A tall street lamp; its arm reaches toward the tower and the head shines `color` down. */
export function streetLamp(ctx: Ctx, x: number, y: number, U: number, dir: number, color: string): void {
  const top = y - U * 0.46;
  const hx = x + dir * U * 0.085;
  const hy = top + U * 0.035;

  // Cone of light, then a pool on the floor
  ctx.beginPath();
  ctx.moveTo(hx - U * 0.022, hy);
  ctx.lineTo(hx + U * 0.022, hy);
  ctx.lineTo(hx + U * 0.075, y);
  ctx.lineTo(hx - U * 0.075, y);
  ctx.closePath();
  ctx.fillStyle = alpha(color, 0.07);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, hx, y, U * 0.09, U * 0.018);
  ctx.fillStyle = alpha(color, 0.12);
  ctx.fill();

  // Pole, base and arm
  ctx.beginPath();
  ctx.rect(x - U * 0.007, top, U * 0.014, y - top);
  ctx.rect(x - U * 0.014, y - U * 0.05, U * 0.028, U * 0.05);
  ctx.moveTo(x, top + U * 0.012);
  ctx.quadraticCurveTo(x + dir * U * 0.01, top - U * 0.012, hx, top + U * 0.012);
  ctx.lineTo(hx, top + U * 0.022);
  ctx.quadraticCurveTo(x + dir * U * 0.012, top + U * 0.002, x, top + U * 0.028);
  ctx.closePath();
  ctx.fillStyle = NEAR;
  ctx.fill();
  edge(ctx, U);

  // Head: a slim housing with a glowing strip underneath
  ctx.beginPath();
  ctx.rect(hx - U * 0.03, hy - U * 0.016, U * 0.06, U * 0.014);
  ctx.fillStyle = NEAR;
  ctx.fill();
  edge(ctx, U);
  ctx.beginPath();
  ctx.moveTo(hx - U * 0.022, hy);
  ctx.lineTo(hx + U * 0.022, hy);
  neonStroke(ctx, color, Math.max(1, U * 0.006), 2.4);

  // A thin neon tube up the pole
  ctx.beginPath();
  ctx.moveTo(x, y - U * 0.07);
  ctx.lineTo(x, y - U * 0.3);
  ctx.globalAlpha = 0.7;
  neonStroke(ctx, PURPLE, Math.max(0.8, U * 0.003), 2.4);
  ctx.globalAlpha = 1;
}

const PRODUCT_ROWS = 4;
const PRODUCT_COLS = 3;

/** Two vending machines side by side, glowing `a` and `b`. */
export function vending(ctx: Ctx, x: number, y: number, U: number, a: string, b: string, t: number): void {
  const w = U * 0.045;
  const h = U * 0.13;
  for (let i = 0; i < 2; i++) {
    const color = i === 0 ? a : b;
    const mx = x - w + i * (w + U * 0.006);
    ctx.beginPath();
    ctx.rect(mx, y - h, w, h);
    ctx.fillStyle = NEAR_FACE;
    ctx.fill();
    edge(ctx, U);
    // Display window with rows of products
    const px = mx + w * 0.12;
    const py = y - h * 0.9;
    const pw = w * 0.6;
    const ph = h * 0.55;
    ctx.fillStyle = alpha(color, 0.2);
    ctx.fillRect(px, py, pw, ph);
    ctx.beginPath();
    for (let r = 0; r < PRODUCT_ROWS; r++) {
      for (let c = 0; c < PRODUCT_COLS; c++) {
        const cx = px + pw * ((c + 0.5) / PRODUCT_COLS);
        const cy = py + ph * ((r + 0.6) / PRODUCT_ROWS);
        ctx.rect(cx - pw * 0.09, cy - ph * 0.08, pw * 0.18, ph * 0.13);
      }
    }
    ctx.fillStyle = alpha(mix(color, "#ffffff", 0.3), 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.strokeStyle = alpha(color, 0.8);
    ctx.lineWidth = Math.max(0.8, U * 0.004);
    ctx.stroke();
    // Button column and the pickup slot
    ctx.beginPath();
    for (let r = 0; r < 4; r++) circle(ctx, mx + w * 0.86, py + ph * (0.15 + r * 0.22), Math.max(0.7, w * 0.04));
    ctx.fillStyle = alpha(i === 0 ? AMBER : CYAN, flickerOff(t, 40 + i, 2, 0.3) ? 0.35 : 0.9);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.fillRect(mx + w * 0.15, y - h * 0.22, w * 0.55, h * 0.07);
  }
}

/** Short curtains hanging from the awning: left edge and width, in fractions of the stall. */
const NOREN = [
  [0.04, 0.2],
  [0.27, 0.2],
  [0.5, 0.2],
  [0.73, 0.23],
] as const;
const NOREN_CLOTH = mix(NEAR_FACE, PURPLE, 0.3);

/**
 * A street-food stall: a box with a warm lit opening, a cook at work behind the counter, a
 * slanted awning trimmed in neon with short split curtains, paper lanterns at its corners, a
 * glyph board and a steaming flue on the roof, and stools in front.
 */
export function noodleStall(ctx: Ctx, s: Scene, x: number, y: number, U: number): void {
  const t = s.t;
  const w = U * 0.22;
  const left = x - w / 2;
  const roof = y - U * 0.19;
  const lip = roof + U * 0.035; // the awning's front edge
  const counter = y - U * 0.075;

  // Flue on the roof, steaming
  ctx.beginPath();
  ctx.rect(left + w * 0.8, roof - U * 0.05, U * 0.014, U * 0.05);
  ctx.fillStyle = NEAR;
  ctx.fill();
  edge(ctx, U);
  steam(ctx, t, left + w * 0.8 + U * 0.007, roof - U * 0.05, U * 0.26, 0.2);

  // Box and lit opening
  ctx.beginPath();
  ctx.rect(left, roof, w, y - roof);
  ctx.fillStyle = NEAR_FACE;
  ctx.fill();
  edge(ctx, U);
  ctx.fillStyle = alpha(AMBER, 0.24);
  ctx.fillRect(left + w * 0.05, lip, w * 0.9, counter - lip);

  // The cook, side-on, working at a pot
  const kx = left + w * 0.66;
  const bob = Math.sin(t * 3) * U * 0.002;
  ctx.beginPath();
  circle(ctx, kx, counter - U * 0.046 + bob, U * 0.011);
  ctx.moveTo(kx - U * 0.02, counter);
  ctx.quadraticCurveTo(kx - U * 0.018, counter - U * 0.034 + bob, kx, counter - U * 0.034 + bob);
  ctx.quadraticCurveTo(kx + U * 0.018, counter - U * 0.034 + bob, kx + U * 0.02, counter);
  ctx.closePath();
  ctx.rect(left + w * 0.24, counter - U * 0.016, U * 0.03, U * 0.016);
  ctx.fillStyle = NEAR;
  ctx.fill();

  // Counter with a warm strip light
  ctx.beginPath();
  ctx.rect(left - U * 0.006, counter, w + U * 0.012, y - counter);
  ctx.fillStyle = NEAR;
  ctx.fill();
  edge(ctx, U);
  ctx.beginPath();
  ctx.moveTo(left + U * 0.004, counter + U * 0.005);
  ctx.lineTo(left + w - U * 0.004, counter + U * 0.005);
  ctx.globalAlpha = 0.8;
  neonStroke(ctx, AMBER, Math.max(0.8, U * 0.004), 2.2);
  ctx.globalAlpha = 1;

  // Curtains under the awning
  ctx.beginPath();
  for (const [f, fw] of NOREN) ctx.rect(left + w * f, lip, w * fw, U * 0.03);
  ctx.fillStyle = NOREN_CLOTH;
  ctx.fill();

  // Awning: slants out over the counter, its front edge a magenta tube
  ctx.beginPath();
  ctx.moveTo(left - U * 0.012, roof - U * 0.012);
  ctx.lineTo(left + w + U * 0.012, roof - U * 0.012);
  ctx.lineTo(left + w + U * 0.03, lip);
  ctx.lineTo(left - U * 0.03, lip);
  ctx.closePath();
  ctx.fillStyle = NEAR;
  ctx.fill();
  edge(ctx, U);
  ctx.beginPath();
  ctx.moveTo(left - U * 0.03, lip);
  ctx.lineTo(left + w + U * 0.03, lip);
  neonStroke(ctx, MAGENTA, Math.max(1, U * 0.005), 2.4);

  // Paper lanterns hanging at the awning's corners
  for (let i = 0; i < 2; i++) {
    const lx = (i === 0 ? left - U * 0.018 : left + w + U * 0.018) + Math.sin(t * 1.4 + i * 2) * U * 0.002;
    const ly = lip + U * 0.03;
    ctx.beginPath();
    ctx.moveTo(lx, lip);
    ctx.lineTo(lx, ly - U * 0.014);
    ctx.strokeStyle = NEAR_EDGE;
    ctx.lineWidth = Math.max(0.6, U * 0.002);
    ctx.stroke();
    ctx.beginPath();
    oval(ctx, lx, ly, U * 0.011, U * 0.015);
    ctx.fillStyle = alpha(RED_LANTERN, 0.9);
    ctx.fill();
    ctx.beginPath();
    oval(ctx, lx, ly, U * 0.005, U * 0.011);
    ctx.fillStyle = alpha(AMBER, 0.75);
    ctx.fill();
    ctx.fillStyle = NEAR;
    ctx.fillRect(lx - U * 0.006, ly - U * 0.017, U * 0.012, U * 0.004);
    ctx.fillRect(lx - U * 0.006, ly + U * 0.013, U * 0.012, U * 0.004);
  }

  // Board on the roof
  boardSign(ctx, left + w * 0.04, roof - U * 0.058, w * 0.68, U * 0.04, CYAN, 21, t, 0.95);

  // Stools
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const sx = left + w * (0.2 + i * 0.3);
    ctx.rect(sx - U * 0.013, y - U * 0.045, U * 0.026, U * 0.007);
    ctx.rect(sx - U * 0.002, y - U * 0.045, U * 0.004, U * 0.045);
  }
  ctx.fillStyle = "#000000";
  ctx.fill();
}

const SCALLOPS = 4;

/**
 * A pedestrian in a long coat under a see-through umbrella lit by its glowing shaft (the
 * canopy glows `color`, its rim is a neon tube). The umbrella sways a little in the wind.
 */
export function umbrellaWalker(ctx: Ctx, x: number, y: number, U: number, color: string, t: number, seed: number): void {
  const sway = Math.sin(t * 1.3 + seed) * U * 0.004;
  // Legs, coat, head
  ctx.beginPath();
  ctx.rect(x - U * 0.012, y - U * 0.048, U * 0.008, U * 0.048);
  ctx.rect(x + U * 0.004, y - U * 0.048, U * 0.008, U * 0.048);
  ctx.moveTo(x - U * 0.016, y - U * 0.128);
  ctx.lineTo(x + U * 0.016, y - U * 0.128);
  ctx.lineTo(x + U * 0.026, y - U * 0.04);
  ctx.lineTo(x - U * 0.026, y - U * 0.04);
  ctx.closePath();
  circle(ctx, x, y - U * 0.142, U * 0.012);
  ctx.fillStyle = "#050409";
  ctx.fill();
  edge(ctx, U);

  const cx = x + sway;
  const rim = y - U * 0.185;
  const r = U * 0.064;
  const dome = U * 0.04;
  // Canopy lit from the shaft
  ctx.beginPath();
  ctx.moveTo(cx - r, rim);
  ctx.quadraticCurveTo(cx - r * 0.9, rim - dome * 1.1, cx, rim - dome);
  ctx.quadraticCurveTo(cx + r * 0.9, rim - dome * 1.1, cx + r, rim);
  for (let i = SCALLOPS; i > 0; i--) {
    const x1 = cx - r + ((i - 1) / SCALLOPS) * r * 2;
    ctx.quadraticCurveTo((x1 + cx - r + (i / SCALLOPS) * r * 2) / 2, rim - dome * 0.22, x1, rim);
  }
  ctx.closePath();
  ctx.fillStyle = alpha(color, 0.22);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  neonStroke(ctx, color, Math.max(0.8, U * 0.0035), 2.4);
  ctx.globalAlpha = 1;
  // Ribs
  ctx.beginPath();
  for (let i = 1; i < SCALLOPS; i++) {
    ctx.moveTo(cx, rim - dome);
    ctx.lineTo(cx - r + (i / SCALLOPS) * r * 2, rim);
  }
  ctx.strokeStyle = alpha(color, 0.45);
  ctx.lineWidth = Math.max(0.6, U * 0.002);
  ctx.stroke();
  // Arm and the glowing shaft
  ctx.beginPath();
  ctx.moveTo(x + U * 0.012, y - U * 0.118);
  ctx.lineTo(x + U * 0.004 + sway * 0.5, y - U * 0.1);
  ctx.strokeStyle = "#050409";
  ctx.lineWidth = Math.max(1, U * 0.007);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + U * 0.004, y - U * 0.088);
  ctx.lineTo(cx, rim - dome);
  neonStroke(ctx, mix(color, "#ffffff", 0.3), Math.max(0.8, U * 0.004), 2.4);
}

const WISPS = 3;
const WISP_STEPS = 9;
/** Wisp segments by height (fractions of the rise) and their opacity: thinning as it climbs. */
const WISP_BANDS = [
  [0, 0.4, 1],
  [0.4, 0.72, 0.6],
  [0.72, 1, 0.28],
] as const;

/**
 * Steam rising from (x, y) up to `rise` px: a few soft wavy wisps that widen and drift with
 * the wind, tinted by the neon near the source and thinning out as they climb. Each wisp is a
 * wide faint stroke around a narrower denser core.
 */
export function steam(ctx: Ctx, t: number, x: number, y: number, rise: number, a: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [b0, b1, fade] of WISP_BANDS) {
    ctx.beginPath();
    for (let w = 0; w < WISPS; w++) {
      const top = 0.75 + 0.25 * ((w * 0.37 + t * 0.05) % 1);
      for (let j = 0; j <= WISP_STEPS; j++) {
        const v = b0 + ((b1 - b0) * j) / WISP_STEPS;
        const px = x + (w - 1) * rise * 0.04 + Math.sin(t * 1.6 + w * 2.3 - v * 6) * rise * 0.07 * v - v * v * rise * 0.12;
        const py = y - v * rise * top;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = b0 === 0 ? STEAM_LIT : STEAM;
    ctx.globalAlpha = a * fade * 0.45;
    ctx.lineWidth = rise * (0.1 + b0 * 0.12);
    ctx.stroke();
    ctx.globalAlpha = a * fade;
    ctx.lineWidth = rise * (0.035 + b0 * 0.05);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A street grate venting steam. */
export function steamVent(ctx: Ctx, t: number, x: number, y: number, U: number): void {
  ctx.beginPath();
  oval(ctx, x, y, U * 0.05, U * 0.012);
  ctx.fillStyle = "#020205";
  ctx.fill();
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(x + i * U * 0.016, y - U * 0.009);
    ctx.lineTo(x + i * U * 0.016, y + U * 0.009);
  }
  ctx.strokeStyle = alpha(BLUE, 0.35);
  ctx.lineWidth = Math.max(1, U * 0.003);
  ctx.stroke();
  // A warm glow under the grate
  ctx.beginPath();
  oval(ctx, x, y, U * 0.035, U * 0.007);
  ctx.fillStyle = alpha(MAGENTA, 0.25);
  ctx.fill();
  steam(ctx, t, x, y, U * 0.34, 0.14);
}

/** A hover car parked low over the wet floor, its underglow pooling under it. */
export function parkedCar(ctx: Ctx, s: Scene, x: number, y: number, U: number): void {
  const L = U * 0.18;
  const bob = Math.sin(s.t * 1.6) * L * 0.012;
  ctx.beginPath();
  oval(ctx, x, y, L * 0.5, L * 0.07);
  ctx.fillStyle = alpha(MAGENTA, 0.16 + 0.04 * Math.sin(s.t * 1.6));
  ctx.fill();
  hoverCar(ctx, x, y - L * 0.2 + bob, L, -1, MAGENTA, false);
}

/** A puddle: a dark pool whose far rim catches the skyline's glow. */
export function puddle(ctx: Ctx, x: number, y: number, rx: number, ry: number, rim: string): void {
  ctx.beginPath();
  oval(ctx, x, y, rx, ry);
  ctx.fillStyle = "#030306";
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = alpha(rim, 0.45);
  ctx.lineWidth = Math.max(1, ry * 0.12);
  ctx.stroke();
}

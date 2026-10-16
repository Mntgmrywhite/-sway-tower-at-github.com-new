import { alpha, circle, mix, neonStroke, oval, type Ctx } from "../../base/draw";
import { beats, CYAN, glowLine, GREEN, ORANGE, PINK, pulse, RIM, SIL, SIL_LIGHT, UV, WHITE, YELLOW } from "./common";
import { dancer, HEAD, type DancerLook } from "./dancer";

// The DJ booth and the speaker stack, both dark silhouettes rimmed in UV and splashed with
// glowing paint that drips down their faces. `b` is the perspective unit (u * k) for each.

const DJ: DancerLook = { move: 4, phase: 0.1, paint: PINK, stick: GREEN };

/** A drip of paint running down from (x, y): grows over its cycle, then a drop falls. */
function drip(ctx: Ctx, t: number, x: number, y: number, w: number, len: number, period: number, offset: number, maxY: number): void {
  const c = (((t + offset) % period) + period) % period / period;
  const run = len * (0.45 + 0.55 * Math.min(1, c * 1.4));
  const end = Math.min(maxY - w, y + run);
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, end);
  ctx.arc(x, end, w / 2, Math.PI, 0, true);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  if (c > 0.72) {
    // A drop falls from the tip.
    const fy = end + w + (c - 0.72) * len * 2.2;
    if (fy < maxY - w) circle(ctx, x, fy, w * 0.45);
  }
}

/** A paint splat (blob, lobes, flecks) as clockwise subpaths of the current path. */
export function splatPath(ctx: Ctx, x: number, y: number, r: number, seed: number): void {
  circle(ctx, x, y, r * 0.62);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + seed * 1.7;
    const far = r * (0.55 + ((i * 37 + seed * 11) % 7) * 0.05);
    circle(ctx, x + Math.cos(a) * far, y + Math.sin(a) * far, r * (0.18 + ((i * 13 + seed * 5) % 5) * 0.035));
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + seed * 2.3 + 0.5;
    circle(ctx, x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.05, r * 0.09);
  }
}

/** The DJ behind the decks: booth front with paint splats and drips, decks, mixer LEDs. */
export function djBooth(ctx: Ctx, t: number, x: number, y: number, b: number): void {
  const w = b * 0.15;
  const ph = b * 0.088;
  const top = y - ph;
  const slab = b * 0.011;
  const p = pulse(t, 3);

  // The DJ stands behind the booth; only the top half shows over it.
  dancer(ctx, t, x + b * 0.012, top + b * 0.055, b * 0.15, DJ);
  // Headphones over the DJ's head.
  const hr = b * 0.15 * 0.078;
  ctx.beginPath();
  ctx.arc(HEAD.x, HEAD.y, hr * 1.25, Math.PI * 1.08, Math.PI * 1.92);
  oval(ctx, HEAD.x - hr * 1.12, HEAD.y + hr * 0.1, hr * 0.32, hr * 0.48);
  oval(ctx, HEAD.x + hr * 1.12, HEAD.y + hr * 0.1, hr * 0.32, hr * 0.48);
  glowLine(ctx, CYAN, Math.max(1, b * 0.0022), 2.4);

  // Table slab.
  ctx.beginPath();
  ctx.rect(x - w / 2 - b * 0.006, top - slab, w + b * 0.012, slab);
  ctx.fillStyle = SIL_LIGHT;
  ctx.fill();
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(1, b * 0.0025);
  ctx.stroke();

  // Decks on top: two platters spinning, a mixer between them with beat LEDs.
  const spin = t * 5.5;
  const py = top - slab - b * 0.006;
  ctx.beginPath();
  for (const [dx] of DECKS) oval(ctx, x + dx * b, py, b * 0.03, b * 0.009);
  ctx.fillStyle = "#1a0d33";
  ctx.fill();
  ctx.lineWidth = Math.max(1, b * 0.0025);
  for (const [dx, col] of DECKS) {
    ctx.beginPath();
    oval(ctx, x + dx * b, py, b * 0.03, b * 0.009);
    ctx.strokeStyle = col;
    ctx.stroke();
  }
  ctx.beginPath();
  for (const [dx] of DECKS) {
    oval(ctx, x + dx * b + Math.cos(spin + dx * 9) * b * 0.02, py + Math.sin(spin + dx * 9) * b * 0.006, b * 0.004, b * 0.002);
  }
  ctx.fillStyle = WHITE;
  ctx.fill();
  const beat = Math.floor(beats(t));
  ctx.beginPath();
  ctx.rect(x - b * 0.013, top - slab - b * 0.012, b * 0.026, b * 0.012);
  ctx.fillStyle = SIL;
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const on = (beat + i) % 3 === 0 ? 1 : 0.25;
    ctx.fillStyle = alpha(LEDS[i]!, on * (0.5 + p * 0.5));
    ctx.fillRect(x - b * 0.009 + i * b * 0.007, top - slab - b * 0.008, b * 0.004, b * 0.004);
  }

  // Front panel: dark, rimmed, splashed with glowing paint that drips down.
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top);
  ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w / 2 - b * 0.006, y);
  ctx.lineTo(x - w / 2 + b * 0.006, y);
  ctx.closePath();
  ctx.fillStyle = SIL;
  ctx.fill();
  // Paint splats kept inside the panel, drips running down to its foot.
  ctx.beginPath();
  splatPath(ctx, x - w * 0.2, top + ph * 0.4, b * 0.022, 1);
  drip(ctx, t, x - w * 0.26, top + ph * 0.47, b * 0.006, ph * 0.5, 5.5, 0, y - b * 0.004);
  drip(ctx, t, x - w * 0.12, top + ph * 0.5, b * 0.0045, ph * 0.38, 4.2, 1.9, y - b * 0.004);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  splatPath(ctx, x + w * 0.25, top + ph * 0.34, b * 0.015, 4);
  drip(ctx, t, x + w * 0.28, top + ph * 0.4, b * 0.0045, ph * 0.5, 6.1, 3.1, y - b * 0.004);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.beginPath();
  splatPath(ctx, x + w * 0.04, top + ph * 0.72, b * 0.009, 6);
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top);
  ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w / 2 - b * 0.006, y);
  ctx.lineTo(x - w / 2 + b * 0.006, y);
  ctx.closePath();
  neonStroke(ctx, UV, Math.max(1, b * 0.003), 2.4);
}

const DECKS = [
  [-0.046, GREEN],
  [0.046, PINK],
] as const;
const LEDS = [GREEN, YELLOW, PINK] as const;

/**
 * A speaker stack: a wide sub cabinet with two woofers under a smaller top box with one woofer
 * and a horn. The cones swell and brighten on the kick; paint is splashed on the faces.
 */
export function speakerStack(ctx: Ctx, t: number, x: number, y: number, b: number): void {
  const p = pulse(t, 3);
  const w1 = b * 0.15;
  const h1 = b * 0.072;
  const w2 = b * 0.11;
  const h2 = b * 0.06;
  const x2 = x + b * 0.008;
  const r1 = Math.min(h1 * 0.36, w1 / 4.8);
  const r2 = Math.min(h2 * 0.36, w2 / 2.4);
  // Woofer centers: two on the sub, one on the top box (left of the horn).
  const c0x = x - w1 / 4;
  const c1x = x + w1 / 4;
  const c2x = x2 - w2 * 0.12;
  const cy1 = y - h1 / 2;
  const cy2 = y - h1 - h2 / 2;

  // Cabinets and the horn, one fill and one neon rim.
  ctx.beginPath();
  ctx.rect(x - w1 / 2, y - h1, w1, h1);
  ctx.rect(x2 - w2 / 2, y - h1 - h2, w2, h2);
  ctx.rect(x2 + w2 * 0.26, y - h1 - h2 * 0.7, w2 * 0.16, h2 * 0.4);
  ctx.fillStyle = SIL;
  ctx.fill();
  neonStroke(ctx, RIM, Math.max(1, b * 0.0028), 2.2);

  // Woofer baskets.
  ctx.beginPath();
  circle(ctx, c0x, cy1, r1);
  circle(ctx, c1x, cy1, r1);
  circle(ctx, c2x, cy2, r2);
  ctx.fillStyle = "#14082c";
  ctx.fill();
  ctx.strokeStyle = UV;
  ctx.lineWidth = Math.max(1, b * 0.0032);
  ctx.stroke();
  // Cones: the inner ring swells and brightens with the kick.
  const k = 0.52 + p * 0.16;
  ctx.beginPath();
  circle(ctx, c0x, cy1, r1 * k);
  circle(ctx, c1x, cy1, r1 * k);
  circle(ctx, c2x, cy2, r2 * k);
  // The horn's throat glows too.
  ctx.moveTo(x2 + w2 * 0.3, y - h1 - h2 * 0.5);
  ctx.lineTo(x2 + w2 * 0.38, y - h1 - h2 * 0.5);
  glowLine(ctx, mix(CYAN, WHITE, p * 0.4), Math.max(1, b * (0.002 + p * 0.0015)), 2.6);
  ctx.beginPath();
  circle(ctx, c0x, cy1, r1 * 0.16);
  circle(ctx, c1x, cy1, r1 * 0.16);
  circle(ctx, c2x, cy2, r2 * 0.16);
  ctx.globalAlpha = 0.5 + p * 0.5;
  ctx.fillStyle = CYAN;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Paint thrown on the boxes, dripping down their faces (kept inside each face).
  ctx.beginPath();
  splatPath(ctx, x2 + w2 * 0.3, y - h1 - h2 * 0.24, b * 0.0055, 3);
  drip(ctx, t, x2 + w2 * 0.28, y - h1 - h2 * 0.2, b * 0.003, h2 * 0.3, 5, 0.7, y - h1);
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.beginPath();
  splatPath(ctx, x - w1 * 0.02, y - h1 * 0.7, b * 0.008, 5);
  drip(ctx, t, x - w1 * 0.0, y - h1 * 0.66, b * 0.0035, h1 * 0.55, 4.4, 2.2, y);
  ctx.fillStyle = ORANGE;
  ctx.fill();
}

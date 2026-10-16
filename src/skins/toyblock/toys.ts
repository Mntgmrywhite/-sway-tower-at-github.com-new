import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { block } from "./shapes";
import type { Tone } from "./tone";

// The toys that drift down the right lane (drift.ts), each drawn around (x, y) at size k (px):
// our own designs of classic toys, far off, so flat fills in the faded toy colors of the hour
// (tone.ts) with a lit side and a shaded side, and no outline. Lit windows and lamps follow the
// light: dark by day, warm at night. Each keeps within about ±3 k of its center sideways and
// moves only gently in place (a turning propeller, a flickering flame, a swinging parachute).

const TAU = Math.PI * 2;

function fill(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------------------------------------------------------------- kite

/**
 * A diamond kite that got loose: four panels in red and yellow on two spars, a tail with two
 * bows, and its string trailing down and fading out. `m` is the lane side; the string trails
 * toward the screen edge, away from the tower.
 */
export function kite(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, m: number, phase: number): void {
  const red = tone.toys[0];
  const yellow = tone.toys[1];
  const top = y - k * 1.15;
  const bottom = y + k * 1.25;
  const mid = y - k * 0.2;
  const w = k * 0.82;
  // The string, fading out in three steps as it trails away.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  let px = x;
  let py = mid;
  for (let i = 1; i <= 3; i++) {
    const nx = x + m * k * 0.32 * i + Math.sin(s.t * 0.5 + phase + i) * k * 0.08;
    const ny = mid + k * 1.3 * i;
    ctx.globalAlpha = 1 - (i - 1) * 0.33;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo((px + nx) / 2 - m * k * 0.15, (py + ny) / 2, nx, ny);
    ctx.stroke();
    px = nx;
    py = ny;
  }
  ctx.globalAlpha = 1;
  // Tail: a gentle wave from the bottom point, opposite the string, with two bows.
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  for (let i = 1; i <= 4; i++) ctx.lineTo(x - m * k * 0.12 * i + Math.sin(s.t * 1.6 - i + phase) * k * 0.12, bottom + i * k * 0.32);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 2; i <= 4; i += 2) {
    const bx = x - m * k * 0.12 * i + Math.sin(s.t * 1.6 - i + phase) * k * 0.12;
    const by = bottom + i * k * 0.32;
    const b = k * 0.16;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - b * 1.3, by - b);
    ctx.lineTo(bx - b * 1.3, by + b);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + b * 1.3, by - b);
    ctx.lineTo(bx + b * 1.3, by + b);
    ctx.closePath();
  }
  fill(ctx, tone.toys[2].body);
  // The sail: red top-left and bottom-right, yellow in between, each panel lit on its upper half.
  for (let q = 0; q < 4; q++) {
    const c = q === 0 || q === 3 ? red : yellow;
    ctx.beginPath();
    ctx.moveTo(x, mid);
    ctx.lineTo(x, q < 2 ? top : bottom);
    ctx.lineTo(q % 2 ? x + w : x - w, mid);
    ctx.closePath();
    fill(ctx, q < 2 ? c.body : c.shade);
  }
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, top + k * 0.3);
  ctx.lineTo(x - w * 0.55, mid - k * 0.1);
  ctx.lineTo(x - w * 0.42, mid - k * 0.1);
  ctx.closePath();
  fill(ctx, yellow.light);
  // The spars.
  ctx.strokeStyle = tone.toys[4].shade;
  ctx.lineWidth = Math.max(1, k * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, top + k * 0.08);
  ctx.lineTo(x, bottom - k * 0.08);
  ctx.moveTo(x - w + k * 0.08, mid);
  ctx.lineTo(x + w - k * 0.08, mid);
  ctx.stroke();
}

// ---------------------------------------------------------------- biplane

/**
 * A little red biplane nosing in toward the tower, its propeller a blur, a teddy at the
 * controls, trailing a string of bunting out toward the screen edge.
 */
export function biplane(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, m: number, phase: number): void {
  const f = -m;
  const red = tone.toys[0];
  const yellow = tone.toys[1];
  const tail = x - f * k * 1.3;
  // The bunting: a sagging string from the tail with pennants waving on it.
  const end = x - f * k * 3.2;
  const sag = k * 0.35;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.beginPath();
  ctx.moveTo(tail, y - k * 0.1);
  ctx.quadraticCurveTo((tail + end) / 2, y + sag, end, y + k * 0.05);
  ctx.stroke();
  const flags = [tone.toys[2], tone.toys[1], tone.toys[3], tone.toys[5]] as const;
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.7) / 4.4;
    const fx = tail + (end - tail) * t;
    const fy = y - k * 0.1 + (k * 0.15) * t + sag * 2 * t * (1 - t) * 0.95;
    const wave = Math.sin(s.t * 2.2 + phase + i * 0.9) * k * 0.06;
    ctx.beginPath();
    ctx.moveTo(fx - k * 0.17, fy);
    ctx.lineTo(fx + k * 0.17, fy);
    ctx.lineTo(fx - f * wave, fy + k * 0.42);
    ctx.closePath();
    fill(ctx, flags[i]!.body);
  }
  // Tail fin and tail plane.
  ctx.beginPath();
  ctx.moveTo(tail, y - k * 0.12);
  ctx.lineTo(x - f * k * 1.42, y - k * 0.72);
  ctx.lineTo(x - f * k * 1.1, y - k * 0.72);
  ctx.lineTo(x - f * k * 0.75, y - k * 0.12);
  ctx.closePath();
  fill(ctx, red.shade);
  // Lower wing (behind the fuselage), wheels and struts.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.07);
  ctx.beginPath();
  ctx.moveTo(x + f * k * 0.15, y + k * 0.3);
  ctx.lineTo(x + f * k * 0.35, y + k * 0.62);
  ctx.moveTo(x - f * k * 0.42, y - k * 0.62);
  ctx.lineTo(x - f * k * 0.42, y + k * 0.3);
  ctx.moveTo(x + f * k * 0.55, y - k * 0.62);
  ctx.lineTo(x + f * k * 0.55, y + k * 0.3);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x + f * k * 0.35, y + k * 0.7, k * 0.17);
  fill(ctx, tone.hole);
  ctx.beginPath();
  block(ctx, x - k * 0.85, y + k * 0.24, k * 1.7, k * 0.2, k * 0.08);
  fill(ctx, yellow.shade);
  // The teddy pilot: head and ear above the cockpit, a little muzzle.
  const hx = x - f * k * 0.05;
  const hy = y - k * 0.42;
  const bear = tone.toys[4];
  ctx.beginPath();
  circle(ctx, hx - f * k * 0.12, hy - k * 0.2, k * 0.1);
  circle(ctx, hx, hy, k * 0.21);
  fill(ctx, bear.shade);
  ctx.beginPath();
  circle(ctx, hx + f * k * 0.1, hy + k * 0.05, k * 0.09);
  fill(ctx, bear.light);
  // Fuselage: a rounded body, lit along its top.
  ctx.beginPath();
  ctx.moveTo(tail, y - k * 0.14);
  ctx.lineTo(x + f * k * 1.05, y - k * 0.28);
  ctx.quadraticCurveTo(x + f * k * 1.32, y - k * 0.26, x + f * k * 1.32, y);
  ctx.quadraticCurveTo(x + f * k * 1.32, y + k * 0.24, x + f * k * 1.05, y + k * 0.26);
  ctx.lineTo(tail, y + k * 0.08);
  ctx.closePath();
  fill(ctx, red.body);
  ctx.beginPath();
  ctx.moveTo(tail + f * k * 0.2, y - k * 0.13);
  ctx.lineTo(x + f * k * 1.0, y - k * 0.24);
  ctx.lineTo(x + f * k * 1.0, y - k * 0.12);
  ctx.lineTo(tail + f * k * 0.2, y - k * 0.04);
  ctx.closePath();
  fill(ctx, red.light);
  // Upper wing, with a lit edge.
  ctx.beginPath();
  block(ctx, x - k * 1.0 + f * k * 0.1, y - k * 0.78, k * 2.0, k * 0.22, k * 0.09);
  fill(ctx, yellow.body);
  ctx.fillStyle = yellow.light;
  ctx.fillRect(x - k * 0.85 + f * k * 0.1, y - k * 0.75, k * 1.7, k * 0.06);
  // The nose cap and the propeller: a pale blur and one blade turning edge-on.
  const nx = x + f * k * 1.36;
  ctx.beginPath();
  oval(ctx, nx, y, k * 0.1, k * 0.62);
  ctx.fillStyle = tone.cream.light;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  const blade = Math.cos(s.t * 9 + phase) * k * 0.58;
  ctx.beginPath();
  block(ctx, nx - k * 0.05, y - Math.abs(blade), k * 0.1, Math.max(k * 0.06, Math.abs(blade) * 2), k * 0.04);
  fill(ctx, tone.toys[4].shade);
  ctx.beginPath();
  circle(ctx, nx, y, k * 0.12);
  fill(ctx, yellow.body);
}

// ---------------------------------------------------------------- hot-air balloon

/** A patchwork hot-air balloon, a teddy looking out of its wicker basket. */
export function hotAir(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const red = tone.toys[0];
  const yellow = tone.toys[1];
  const R = k * 1.2;
  const cy = y - k * 0.55;
  const mouth = y + k * 0.82;
  const envelope = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - k * 0.3, mouth);
    ctx.quadraticCurveTo(x - k * 1.25, y + k * 0.15, x - R, cy);
    ctx.arc(x, cy, R, Math.PI, TAU);
    ctx.quadraticCurveTo(x + k * 1.25, y + k * 0.15, x + k * 0.3, mouth);
    ctx.closePath();
  };
  // Ropes down to the basket.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.28, mouth);
  ctx.lineTo(x - k * 0.34, y + k * 1.32);
  ctx.moveTo(x + k * 0.28, mouth);
  ctx.lineTo(x + k * 0.34, y + k * 1.32);
  ctx.stroke();
  // The teddy, peeking over the rim.
  const bear = tone.toys[4];
  const by = y + k * 1.26;
  ctx.beginPath();
  circle(ctx, x - k * 0.2, by - k * 0.17, k * 0.08);
  circle(ctx, x + k * 0.14, by - k * 0.17, k * 0.08);
  circle(ctx, x - k * 0.03, by, k * 0.19);
  fill(ctx, bear.shade);
  ctx.beginPath();
  circle(ctx, x - k * 0.03, by + k * 0.06, k * 0.08);
  fill(ctx, bear.light);
  // Basket: wicker with two darker weave bands, and a sandbag either side.
  ctx.beginPath();
  block(ctx, x - k * 0.4, y + k * 1.32, k * 0.8, k * 0.5, k * 0.08);
  fill(ctx, tone.toys[4].body);
  ctx.fillStyle = tone.toys[4].shade;
  ctx.fillRect(x - k * 0.36, y + k * 1.5, k * 0.72, k * 0.06);
  ctx.fillRect(x - k * 0.36, y + k * 1.66, k * 0.72, k * 0.06);
  ctx.beginPath();
  oval(ctx, x - k * 0.5, y + k * 1.62, k * 0.1, k * 0.13);
  oval(ctx, x + k * 0.5, y + k * 1.62, k * 0.1, k * 0.13);
  fill(ctx, tone.cream.shade);
  // Envelope: red, with yellow gores either side and a cream one down the middle.
  envelope();
  fill(ctx, red.body);
  ctx.save();
  envelope();
  ctx.clip();
  ctx.beginPath();
  oval(ctx, x - k * 0.66, cy + k * 0.2, k * 0.24, k * 1.7);
  oval(ctx, x + k * 0.66, cy + k * 0.2, k * 0.24, k * 1.7);
  fill(ctx, yellow.body);
  ctx.beginPath();
  oval(ctx, x, cy + k * 0.2, k * 0.2, k * 1.7);
  fill(ctx, tone.cream.body);
  // The shaded side (right), and the band near the mouth.
  ctx.beginPath();
  circle(ctx, x + R * 1.45, cy + k * 0.1, R * 0.95);
  ctx.fillStyle = "rgba(40, 20, 70, 0.18)";
  ctx.fill();
  ctx.fillStyle = tone.toys[2].body;
  ctx.fillRect(x - R, y + k * 0.42, R * 2, k * 0.16);
  ctx.restore();
  ctx.beginPath();
  oval(ctx, x - k * 0.5, cy - k * 0.55, k * 0.22, k * 0.13, -0.6);
  fill(ctx, red.light);
  void s;
}

// ---------------------------------------------------------------- airship

/**
 * A toy airship: a plump red envelope with a cream stripe and yellow fins at the back, a yellow
 * gondola hung under the middle with three windows (lit at dusk) and a little propeller.
 */
export function airship(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, m: number): void {
  const body = tone.toys[0];
  const gondola = tone.toys[1];
  // Fins at the back (away from the screen edge: the airship noses outward).
  const bx = x - m * k * 1.45;
  ctx.beginPath();
  ctx.moveTo(bx + m * k * 0.3, y - k * 0.2);
  ctx.lineTo(bx - m * k * 0.35, y - k * 0.82);
  ctx.lineTo(bx - m * k * 0.45, y - k * 0.12);
  ctx.closePath();
  ctx.moveTo(bx + m * k * 0.3, y + k * 0.2);
  ctx.lineTo(bx - m * k * 0.35, y + k * 0.82);
  ctx.lineTo(bx - m * k * 0.45, y + k * 0.12);
  ctx.closePath();
  fill(ctx, gondola.shade);
  // The gondola, hanging under the middle, with its windows and a propeller at the back.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.35, y + k * 0.4);
  ctx.lineTo(x - k * 0.3, y + k * 0.62);
  ctx.moveTo(x + k * 0.35, y + k * 0.4);
  ctx.lineTo(x + k * 0.3, y + k * 0.62);
  ctx.stroke();
  ctx.beginPath();
  block(ctx, x - k * 0.5, y + k * 0.58, k * 1.0, k * 0.4, k * 0.1);
  fill(ctx, gondola.body);
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) block(ctx, x + i * k * 0.3 - k * 0.08, y + k * 0.66, k * 0.16, k * 0.16, k * 0.04);
  fill(ctx, tone.lamp);
  const px = x - m * k * 0.62;
  const blade = Math.cos(s.t * 8) * k * 0.2;
  ctx.beginPath();
  block(ctx, px - k * 0.04, y + k * 0.78 - Math.abs(blade), k * 0.08, Math.max(k * 0.05, Math.abs(blade) * 2), k * 0.03);
  fill(ctx, tone.toys[4].shade);
  // Envelope: shade, body over it, a cream stripe, a lit streak along the top.
  ctx.beginPath();
  oval(ctx, x, y, k * 1.6, k * 0.62);
  fill(ctx, body.shade);
  ctx.beginPath();
  oval(ctx, x - m * k * 0.04, y - k * 0.05, k * 1.54, k * 0.54);
  fill(ctx, body.body);
  ctx.beginPath();
  oval(ctx, x, y + k * 0.04, k * 1.52, k * 0.11);
  fill(ctx, tone.cream.body);
  ctx.beginPath();
  oval(ctx, x + m * k * 0.2, y - k * 0.32, k * 0.9, k * 0.11);
  fill(ctx, body.light);
}

// ---------------------------------------------------------------- satellite

/** A toy satellite: a gold box with a dish, two striped blue panels, and a light that blinks. */
export function satellite(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const gold = tone.toys[1];
  const blue = tone.toys[2];
  // Struts and panels.
  ctx.fillStyle = tone.line;
  ctx.fillRect(x - k * 1.0, y - k * 0.04, k * 2.0, k * 0.08);
  for (const side of [-1, 1] as const) {
    const px = side < 0 ? x - k * 1.85 : x + k * 0.75;
    ctx.beginPath();
    block(ctx, px, y - k * 0.34, k * 1.1, k * 0.68, k * 0.06);
    fill(ctx, blue.body);
    ctx.fillStyle = blue.light;
    ctx.fillRect(px + k * 0.06, y - k * 0.3, k * 0.98, k * 0.1);
    ctx.fillStyle = blue.shade;
    ctx.fillRect(px + k * 0.36, y - k * 0.3, k * 0.05, k * 0.6);
    ctx.fillRect(px + k * 0.7, y - k * 0.3, k * 0.05, k * 0.6);
  }
  // The box, lit on top, shaded on its right.
  ctx.beginPath();
  block(ctx, x - k * 0.42, y - k * 0.42, k * 0.84, k * 0.84, k * 0.1);
  fill(ctx, gold.shade);
  ctx.beginPath();
  block(ctx, x - k * 0.42, y - k * 0.42, k * 0.7, k * 0.72, k * 0.1);
  fill(ctx, gold.body);
  ctx.fillStyle = gold.light;
  ctx.fillRect(x - k * 0.32, y - k * 0.38, k * 0.5, k * 0.1);
  // The dish on a stalk, and the blinking light.
  ctx.fillStyle = tone.line;
  ctx.fillRect(x - k * 0.03, y - k * 0.72, k * 0.06, k * 0.32);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.34, y - k * 0.78);
  ctx.quadraticCurveTo(x, y - k * 0.52, x + k * 0.34, y - k * 0.78);
  ctx.closePath();
  fill(ctx, tone.cream.body);
  if (Math.sin(s.t * 2.4 + phase) > 0.3) {
    ctx.beginPath();
    circle(ctx, x + k * 0.22, y + k * 0.22, k * 0.09);
    fill(ctx, "#ff5a5a");
  }
}

// ---------------------------------------------------------------- rocket

/**
 * The toy rocket from the launch tower, now flying: cream body with a red nose, fins and band, a
 * round blue window, a flickering flame and puffs of smoke falling away below it.
 */
export function rocket(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const red = tone.toys[0];
  const w = k * 0.76;
  const top = y - k * 1.2;
  const bottom = y + k * 0.9;
  // Smoke: three puffs drifting down and swelling as they fade.
  for (let i = 0; i < 3; i++) {
    const a = (s.t * 0.45 + i / 3) % 1;
    ctx.globalAlpha = 0.7 * (1 - a);
    ctx.beginPath();
    circle(ctx, x + Math.sin(i * 2.3) * k * 0.15, bottom + k * (0.75 + a * 1.4), k * (0.2 + a * 0.22));
    fill(ctx, tone.cloud);
  }
  ctx.globalAlpha = 1;
  // Flame: an outer orange teardrop and an inner yellow one, breathing.
  const f = k * (0.62 + 0.1 * Math.sin(s.t * 7));
  ctx.beginPath();
  ctx.moveTo(x - w * 0.32, bottom);
  ctx.quadraticCurveTo(x - w * 0.32, bottom + f * 0.6, x, bottom + f);
  ctx.quadraticCurveTo(x + w * 0.32, bottom + f * 0.6, x + w * 0.32, bottom);
  ctx.closePath();
  fill(ctx, tone.toys[4].body);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.18, bottom);
  ctx.quadraticCurveTo(x - w * 0.16, bottom + f * 0.4, x, bottom + f * 0.66);
  ctx.quadraticCurveTo(x + w * 0.16, bottom + f * 0.4, x + w * 0.18, bottom);
  ctx.closePath();
  fill(ctx, tone.toys[1].light);
  // Fins.
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, bottom - k * 0.65);
  ctx.lineTo(x - w * 0.98, bottom + k * 0.08);
  ctx.lineTo(x - w * 0.5, bottom);
  ctx.closePath();
  ctx.moveTo(x + w * 0.5, bottom - k * 0.65);
  ctx.lineTo(x + w * 0.98, bottom + k * 0.08);
  ctx.lineTo(x + w * 0.5, bottom);
  ctx.closePath();
  fill(ctx, red.shade);
  // Body: shaded right side, lit left.
  ctx.beginPath();
  block(ctx, x - w / 2, top + k * 0.45, w, bottom - top - k * 0.45, w * 0.3);
  fill(ctx, tone.cream.shade);
  ctx.beginPath();
  block(ctx, x - w / 2, top + k * 0.45, w * 0.72, bottom - top - k * 0.45, w * 0.3);
  fill(ctx, tone.cream.body);
  ctx.fillStyle = red.body;
  ctx.fillRect(x - w / 2, bottom - k * 0.42, w, k * 0.16);
  // Nose cone.
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top + k * 0.62);
  ctx.quadraticCurveTo(x - w * 0.45, top + k * 0.1, x, top);
  ctx.quadraticCurveTo(x + w * 0.45, top + k * 0.1, x + w / 2, top + k * 0.62);
  ctx.closePath();
  fill(ctx, red.body);
  ctx.beginPath();
  oval(ctx, x - w * 0.18, top + k * 0.3, w * 0.08, k * 0.18, 0.3);
  fill(ctx, red.light);
  // The window: a cream rim, blue glass and a glint.
  ctx.beginPath();
  circle(ctx, x, y - k * 0.12, w * 0.3);
  fill(ctx, tone.cream.light);
  ctx.beginPath();
  circle(ctx, x, y - k * 0.12, w * 0.22);
  fill(ctx, tone.toys[2].body);
  ctx.beginPath();
  circle(ctx, x - w * 0.07, y - k * 0.19, w * 0.07);
  fill(ctx, tone.toys[2].light);
}

// ---------------------------------------------------------------- planet

/**
 * A toy planet: a striped teal ball inside a tilted ring of two stacked colors, like the rings of
 * a stacking toy, and a little moon going round it.
 */
export function planet(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  const ball = tone.toys[6];
  const tilt = -0.32;
  const rx = k * 1.65;
  const ry = k * 0.42;
  const ring = (front: boolean) => {
    for (let b = 0; b < 2; b++) {
      ctx.strokeStyle = b ? tone.toys[1].body : tone.toys[4].body;
      ctx.lineWidth = k * 0.16;
      ctx.beginPath();
      const r = 1 - b * 0.16;
      if (front) ctx.ellipse(x, y, rx * r, ry * r, tilt, 0, Math.PI);
      else ctx.ellipse(x, y, rx * r, ry * r, tilt, Math.PI, TAU);
      ctx.stroke();
    }
  };
  planetMoon(ctx, s, tone, x, y, k, false);
  ring(false);
  ctx.beginPath();
  circle(ctx, x, y, k * 0.85);
  fill(ctx, ball.body);
  ctx.save();
  ctx.beginPath();
  circle(ctx, x, y, k * 0.85);
  ctx.clip();
  ctx.fillStyle = ball.light;
  ctx.fillRect(x - k, y - k * 0.42, k * 2, k * 0.16);
  ctx.fillRect(x - k, y + k * 0.18, k * 2, k * 0.12);
  ctx.beginPath();
  circle(ctx, x + k * 0.62, y + k * 0.58, k * 0.62);
  fill(ctx, ball.shade);
  ctx.restore();
  ctx.beginPath();
  oval(ctx, x - k * 0.36, y - k * 0.4, k * 0.2, k * 0.12, -0.6);
  fill(ctx, ball.light);
  ring(true);
  planetMoon(ctx, s, tone, x, y, k, true);
}

/** The planet's little moon on its orbit: drawn behind the planet on the far half, in front on the near one. */
function planetMoon(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, front: boolean): void {
  const a = s.t * 0.35;
  const inFront = Math.sin(a) > 0;
  if (inFront !== front) return;
  ctx.beginPath();
  circle(ctx, x + Math.cos(a) * k * 2.1, y + Math.sin(a) * k * 0.7 - k * 0.15, k * 0.17);
  fill(ctx, tone.cream.body);
}

// ---------------------------------------------------------------- saucer

/** A tin-toy flying saucer: a glass dome on a silver disc, its rim lights chasing round. */
export function saucer(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number): void {
  // The dome, with an antenna and a glint.
  ctx.fillStyle = tone.line;
  ctx.fillRect(x - k * 0.03, y - k * 0.98, k * 0.06, k * 0.3);
  ctx.beginPath();
  circle(ctx, x, y - k * 1.02, k * 0.1);
  fill(ctx, tone.toys[0].body);
  ctx.beginPath();
  ctx.arc(x, y - k * 0.12, k * 0.58, Math.PI, TAU);
  ctx.closePath();
  fill(ctx, tone.toys[6].light);
  ctx.beginPath();
  oval(ctx, x - k * 0.22, y - k * 0.42, k * 0.12, k * 0.08, -0.7);
  fill(ctx, tone.cream.light);
  // The disc: shade underneath, body, a lit rim.
  ctx.beginPath();
  oval(ctx, x, y, k * 1.35, k * 0.34);
  fill(ctx, tone.cream.shade);
  ctx.beginPath();
  oval(ctx, x, y - k * 0.06, k * 1.32, k * 0.24);
  fill(ctx, tone.cream.body);
  ctx.beginPath();
  oval(ctx, x - k * 0.2, y - k * 0.12, k * 0.9, k * 0.07);
  fill(ctx, tone.cream.light);
  // Rim lights: one bright one chasing round, the rest dim.
  const lit = Math.floor(s.t * 3) % 5;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + (i / 4) * 0.7);
    ctx.beginPath();
    circle(ctx, x - Math.cos(a) * k * 1.0, y + Math.sin(a) * k * 0.2, k * 0.09);
    fill(ctx, i === lit ? "#ffe066" : tone.toys[i % 2 ? 0 : 2].body);
  }
}

// ---------------------------------------------------------------- parachute

/** A wooden toy soldier floating down under a striped parachute, swinging gently. */
export function parachute(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, phase: number): void {
  const swing = Math.sin(s.t * 0.7 + phase) * 0.09;
  const top = y - k * 1.75;
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(swing);
  ctx.translate(-x, -top);
  // Canopy: a dome with a scalloped hem, red and cream gores.
  const cy = y - k * 0.95;
  const rx = k * 1.3;
  const dome = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - rx, cy);
    ctx.ellipse(x, cy, rx, k * 0.82, 0, Math.PI, TAU);
    for (let i = 0; i < 3; i++) {
      const x1 = x + rx - (i + 1) * ((rx * 2) / 3);
      ctx.quadraticCurveTo(x + rx - (i + 0.5) * ((rx * 2) / 3), cy + k * 0.22, x1, cy);
    }
    ctx.closePath();
  };
  dome();
  fill(ctx, tone.toys[0].body);
  ctx.save();
  dome();
  ctx.clip();
  ctx.beginPath();
  oval(ctx, x - k * 0.45, cy, k * 0.2, k * 1.0);
  oval(ctx, x + k * 0.45, cy, k * 0.2, k * 1.0);
  fill(ctx, tone.cream.body);
  ctx.beginPath();
  circle(ctx, x + rx * 0.9, cy + k * 0.3, rx * 0.7);
  ctx.fillStyle = "rgba(40, 20, 70, 0.16)";
  ctx.fill();
  ctx.restore();
  // Lines down to the soldier's hands.
  const hands = y + k * 0.28;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.04);
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.95, cy + k * 0.02);
  ctx.lineTo(x - k * 0.2, hands);
  ctx.moveTo(x - rx * 0.32, cy + k * 0.12);
  ctx.lineTo(x - k * 0.15, hands);
  ctx.moveTo(x + rx * 0.32, cy + k * 0.12);
  ctx.lineTo(x + k * 0.15, hands);
  ctx.moveTo(x + rx * 0.95, cy + k * 0.02);
  ctx.lineTo(x + k * 0.2, hands);
  ctx.stroke();
  soldier(ctx, tone, x, y + k * 0.2, k * 0.95, true);
  ctx.restore();
}

/**
 * A wooden toy soldier, `y` the top of his hat, about 1.65 k tall: a tall dark hat with a gold
 * badge, a round face, a red coat with white cross belts, blue trousers and black boots; with
 * `hanging`, his arms are up (holding a parachute's lines).
 */
function soldier(ctx: Ctx, tone: Tone, x: number, y: number, k: number, hanging: boolean): void {
  const red = tone.toys[0];
  const blue = tone.toys[2];
  const hat = tone.hole;
  // Arms up to the lines.
  if (hanging) {
    ctx.beginPath();
    block(ctx, x - k * 0.3, y + k * 0.06, k * 0.12, k * 0.52, k * 0.05);
    block(ctx, x + k * 0.18, y + k * 0.06, k * 0.12, k * 0.52, k * 0.05);
    fill(ctx, red.shade);
  }
  // Legs and boots.
  ctx.beginPath();
  block(ctx, x - k * 0.17, y + k * 1.12, k * 0.15, k * 0.5, k * 0.04);
  block(ctx, x + k * 0.02, y + k * 1.12, k * 0.15, k * 0.5, k * 0.04);
  fill(ctx, blue.body);
  ctx.fillStyle = hat;
  ctx.fillRect(x - k * 0.18, y + k * 1.5, k * 0.17, k * 0.14);
  ctx.fillRect(x + k * 0.01, y + k * 1.5, k * 0.17, k * 0.14);
  // Coat with white cross belts.
  ctx.beginPath();
  block(ctx, x - k * 0.24, y + k * 0.62, k * 0.48, k * 0.56, k * 0.08);
  fill(ctx, red.body);
  ctx.strokeStyle = tone.cream.light;
  ctx.lineWidth = k * 0.07;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.2, y + k * 0.66);
  ctx.lineTo(x + k * 0.2, y + k * 1.12);
  ctx.moveTo(x + k * 0.2, y + k * 0.66);
  ctx.lineTo(x - k * 0.2, y + k * 1.12);
  ctx.stroke();
  // Face and hat.
  ctx.beginPath();
  circle(ctx, x, y + k * 0.5, k * 0.16);
  fill(ctx, "#f2c8a0");
  ctx.beginPath();
  block(ctx, x - k * 0.17, y, k * 0.34, k * 0.4, k * 0.06);
  fill(ctx, hat);
  ctx.beginPath();
  circle(ctx, x, y + k * 0.18, k * 0.06);
  fill(ctx, tone.toys[1].body);
}

// ---------------------------------------------------------------- balloons

/** Balloon centers in units of the bunch's size, and their toy color (red, blue, yellow). */
const BALLOON_AT = [
  [-0.62, -0.25, 0],
  [0.62, -0.38, 2],
  [0.02, -1.05, 1],
] as const;

/** Three party balloons tied together, carrying a little toy block away. */
export function balloons(ctx: Ctx, tone: Tone, x: number, y: number, k: number): void {
  const knotY = y + k * 1.5;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, k * 0.06);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const [bx, by] = BALLOON_AT[i]!;
    ctx.moveTo(x + bx * k, y + (by + 0.8) * k);
    ctx.quadraticCurveTo(x + bx * k * 0.4, y + (by + 1.4) * k, x, knotY);
  }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const [bx, by, c] = BALLOON_AT[i]!;
    const toy = tone.toys[c]!;
    ctx.beginPath();
    oval(ctx, x + bx * k, y + by * k, k * 0.6, k * 0.78);
    ctx.moveTo(x + bx * k - k * 0.12, y + (by + 0.86) * k);
    ctx.lineTo(x + bx * k, y + (by + 0.72) * k);
    ctx.lineTo(x + bx * k + k * 0.12, y + (by + 0.86) * k);
    ctx.closePath();
    fill(ctx, toy.body);
    ctx.beginPath();
    oval(ctx, x + (bx + 0.2) * k, y + (by + 0.18) * k, k * 0.36, k * 0.56);
    fill(ctx, toy.shade);
    ctx.beginPath();
    oval(ctx, x + (bx - 0.08) * k, y + (by - 0.06) * k, k * 0.46, k * 0.66);
    fill(ctx, toy.body);
    ctx.beginPath();
    oval(ctx, x + (bx - 0.22) * k, y + (by - 0.32) * k, k * 0.14, k * 0.22, -0.4);
    fill(ctx, toy.light);
  }
  // The block on its string: a lettered toy block.
  const toy = tone.toys[3];
  const b = k * 0.66;
  const bt = knotY + k * 0.1;
  ctx.beginPath();
  block(ctx, x - b / 2, bt, b, b, b * 0.16);
  fill(ctx, toy.shade);
  ctx.beginPath();
  block(ctx, x - b / 2, bt, b * 0.86, b * 0.84, b * 0.16);
  fill(ctx, toy.body);
  ctx.fillStyle = toy.light;
  ctx.fillRect(x - b * 0.32, bt + b * 0.1, b * 0.5, b * 0.12);
  ctx.strokeStyle = toy.shade;
  ctx.lineWidth = Math.max(1, b * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - b * 0.2, bt + b * 0.7);
  ctx.lineTo(x - b * 0.07, bt + b * 0.3);
  ctx.lineTo(x + b * 0.06, bt + b * 0.7);
  ctx.stroke();
}

// ---------------------------------------------------------------- paper planes

/**
 * A dart's corners, nose-forward and down in units of its size, seen a little from above: the
 * nose, the near wing's tail, the far wing's tail peeking out above it, the fold's end and the
 * keel's tail.
 */
const NOSE = [1.25, 0.08] as const;
const TAIL_TOP = [-1.0, -0.66] as const;
const TAIL_FAR = [-0.72, -0.92] as const;
const FOLD = [-0.8, 0.04] as const;
const TAIL_LOW = [-0.88, 0.44] as const;

/** The two darts of a flight, the leader first: center offset (in k, along the flight and down) and size. */
const DARTS = [
  [0.7, 0.2, 1],
  [-1.45, -1.1, 0.74],
] as const;

/**
 * A flight of two folded paper darts gliding in toward the tower, the leader of plain paper and
 * a smaller teal one behind it and higher, pitching a little as they glide: the wing on top
 * (lit), the keel below it (shaded), a fold along the middle. `m` is the lane side: they nose in
 * toward the tower, away from the screen edge.
 */
export function paperPlanes(ctx: Ctx, s: Scene, tone: Tone, x: number, y: number, k: number, m: number, phase: number): void {
  const f = -m;
  for (let i = 0; i < DARTS.length; i++) {
    const [dx, dy, size] = DARTS[i]!;
    const paper = i === 0 ? tone.cream : tone.toys[6];
    const q = k * size;
    const cx = x + f * dx * k;
    const cy = y + dy * k;
    // Pitch: the nose dips and lifts a little as it glides.
    const pitch = Math.sin(s.t * 0.6 + phase + i * 1.7) * 0.06;
    const cos = Math.cos(pitch);
    const sin = Math.sin(pitch) * f;
    /** Screen x and y of a point of the dart, given nose-forward (ax) and down (ay) in its size. */
    const px = (ax: number, ay: number) => cx + (f * ax * cos - ay * sin) * q;
    const py = (ax: number, ay: number) => cy + (f * ax * sin + ay * cos) * q;
    const nx = px(...NOSE);
    const ny = py(...NOSE);
    const fx = px(...FOLD);
    const fy = py(...FOLD);
    // The far wing, the keel, then the near wing over them, then the fold.
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(px(...TAIL_FAR), py(...TAIL_FAR));
    ctx.lineTo(px(...TAIL_TOP), py(...TAIL_TOP));
    ctx.closePath();
    fill(ctx, paper.body);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(fx, fy);
    ctx.lineTo(px(...TAIL_LOW), py(...TAIL_LOW));
    ctx.closePath();
    fill(ctx, paper.shade);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(px(...TAIL_TOP), py(...TAIL_TOP));
    ctx.lineTo(fx, fy);
    ctx.closePath();
    fill(ctx, paper.light);
    ctx.strokeStyle = paper.shade;
    ctx.lineWidth = Math.max(1, q * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }
}

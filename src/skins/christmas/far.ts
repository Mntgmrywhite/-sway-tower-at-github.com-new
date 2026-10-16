import { alpha, circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FOG, SMOKE_FAR } from "./colors";
import { pigeonFlock } from "./sky";
import { toneOf, type Tone } from "./tone";

// London on the horizon, as faded flat silhouettes in the fog (no outlines): a hazy back row
// of rooftops bristling with chimney pots and a couple of thin spires, a fog veil, then two
// landmarks of our own design: a great domed cathedral left of center and a tiered church
// steeple right of center whose bell swings and rings out at dusk. Everything stands on
// horizonY; the base cloud bank in front hides the feet as rolling fog.
// Layout is in u from the screen center, y up from the horizon. Their colors follow the
// story's light (tone.ts): dusk lavender with lit windows, as on the street, until the loop's
// morning fades them to daylight grey-blue with the windows dark.

// ---------------------------------------------------------------- back row

/** Back rooftops: a closed outline as x, y pairs (y up), and the chimney pots on top. */
const { ROOFLINE, POTS, BACK_WINDOWS, BACK_SMOKE } = (() => {
  const line: number[] = [];
  const pots: number[] = [];
  const wins: number[] = [];
  const smoke: number[] = [];
  const lift = (x: number) => {
    const side = Math.min(1, Math.abs(x) / 0.55);
    return 1 + 1.3 * side * side;
  };
  let x = -1.7;
  line.push(x, 0);
  for (let i = 0; x < 1.7; i++) {
    const w = 0.045 + hash(i + 8000) * 0.05;
    const k = lift(x + w / 2);
    const h = (0.055 + hash(i + 8010) * 0.05) * k;
    const kind = hash(i + 8020);
    line.push(x, h);
    if (kind < 0.45) {
      // Gable
      line.push(x + w / 2, h + w * 0.45);
    } else if (kind < 0.75) {
      // Flat roof with a chimney stack and its pots
      const cx = x + w * (0.3 + hash(i + 8030) * 0.4);
      const sw = 0.016;
      const sh = 0.018 * Math.min(1.4, k);
      line.push(cx - sw / 2, h, cx - sw / 2, h + sh, cx + sw / 2, h + sh, cx + sw / 2, h);
      pots.push(cx - sw * 0.28, h + sh, cx + sw * 0.22, h + sh);
      if (hash(i + 8040) > 0.5) smoke.push(cx, h + sh + 0.008, hash(i + 8050));
    } else {
      // Mansard: steep sides, flat top
      line.push(x + w * 0.18, h + w * 0.3, x + w * 0.82, h + w * 0.3);
    }
    line.push(x + w, h);
    if (hash(i + 8060) > 0.45) wins.push(x + w * (0.3 + hash(i + 8070) * 0.4), h * (0.45 + hash(i + 8080) * 0.3));
    // Now and then a thin spire behind the roofs.
    if (hash(i + 8090) > 0.9 && Math.abs(x) > 0.3) {
      const sx = x + w / 2;
      const sk = Math.min(1.3, k);
      line.push(x + w, h, sx + 0.008, h, sx + 0.008, h + 0.06 * sk, sx, h + 0.11 * sk, sx - 0.008, h + 0.06 * sk, sx - 0.008, h);
    }
    x += w;
  }
  line.push(x, 0);
  return { ROOFLINE: line, POTS: pots, BACK_WINDOWS: wins, BACK_SMOKE: smoke };
})();

function backRow(ctx: Ctx, s: Scene, tone: Tone, cx: number, hy: number): void {
  const u = s.u;
  ctx.beginPath();
  ctx.moveTo(cx + ROOFLINE[0]! * u, hy + 1);
  for (let i = 2; i + 1 < ROOFLINE.length; i += 2) ctx.lineTo(cx + ROOFLINE[i]! * u, hy - ROOFLINE[i + 1]! * u);
  ctx.lineTo(cx + ROOFLINE[ROOFLINE.length - 2]! * u, hy + 1);
  ctx.closePath();
  // Chimney pots: little stubs on the stacks.
  const pw = u * 0.0045;
  const ph = u * 0.009;
  for (let i = 0; i + 1 < POTS.length; i += 2) ctx.rect(cx + POTS[i]! * u - pw / 2, hy - POTS[i + 1]! * u - ph, pw, ph + 1);
  ctx.fillStyle = tone.farBack;
  ctx.fill();

  // Snow along the roofs: a thin light line on every slope and flat.
  ctx.beginPath();
  ctx.moveTo(cx + ROOFLINE[2]! * u, hy - ROOFLINE[3]! * u);
  for (let i = 4; i + 1 < ROOFLINE.length - 2; i += 2) ctx.lineTo(cx + ROOFLINE[i]! * u, hy - ROOFLINE[i + 1]! * u);
  ctx.strokeStyle = tone.farBackSnow;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.lineJoin = "round";
  ctx.stroke();

  // A few lit windows twinkling on and off.
  const ww = u * 0.008;
  ctx.beginPath();
  for (let i = 0; i + 1 < BACK_WINDOWS.length; i += 2) {
    if (Math.sin(s.t * 0.3 + i * 1.7) < -0.7) continue;
    ctx.rect(cx + BACK_WINDOWS[i]! * u - ww / 2, hy - BACK_WINDOWS[i + 1]! * u - ww * 0.6, ww, ww * 1.2);
  }
  ctx.fillStyle = tone.farWindow;
  ctx.fill();

  // Thin smoke rising from some of the stacks.
  ctx.beginPath();
  for (let i = 0; i + 2 < BACK_SMOKE.length; i += 3) {
    const x0 = cx + BACK_SMOKE[i]! * u;
    const y0 = hy - BACK_SMOKE[i + 1]! * u;
    for (let k = 0; k < 3; k++) {
      const p = (s.t * 0.12 + k / 3 + BACK_SMOKE[i + 2]!) % 1;
      circle(ctx, x0 + p * u * 0.03, y0 - p * u * 0.05, u * (0.004 + 0.008 * p));
    }
  }
  ctx.fillStyle = SMOKE_FAR;
  ctx.fill();
}

// ---------------------------------------------------------------- fog veil

const VEIL_STOPS = [
  [0, alpha(FOG, 0)],
  [1, alpha(FOG, 0.75)],
] as const;
let veilCtx: Ctx | null = null;
let veilFill: CanvasGradient | null = null;

/** A soft band of fog over the feet of the back row, so the landmarks stand out in front. */
function veil(ctx: Ctx, s: Scene, hy: number): void {
  if (veilCtx !== ctx || !veilFill) {
    veilCtx = ctx;
    veilFill = ctx.createLinearGradient(0, 0, 0, 1);
    for (const [at, c] of VEIL_STOPS) veilFill.addColorStop(at, c);
  }
  const h = s.u * 0.16;
  ctx.save();
  ctx.translate(0, hy - h);
  ctx.scale(1, h);
  ctx.fillStyle = veilFill;
  ctx.fillRect(0, 0, s.cssW, 1.02);
  ctx.restore();
}

// ---------------------------------------------------------------- landmark frame

/** Origin and scale for the landmark drawing helpers below (set per landmark, no closures). */
let ox = 0;
let oy = 0;
let ou = 1;
/** Screen x of `v` u right of the landmark's center line. */
function X(v: number): number {
  return ox + v * ou;
}
/** Screen y of `v` u above the horizon. */
function Y(v: number): number {
  return oy - v * ou;
}

// ---------------------------------------------------------------- the dome

const DOME_X = -0.15;
/** Where the dome's ribs meet the drum, as fractions of its half width. */
const DOME_RIBS = [-0.6, -0.25, 0.25, 0.6] as const;

/** The cathedral: a long body, a colonnaded drum, a ribbed dome, a lantern, ball and cross. */
function dome(ctx: Ctx, s: Scene, tone: Tone, cx: number, hy: number): void {
  const u = s.u;
  const x = cx + DOME_X * u;
  ox = x;
  oy = hy;
  ou = u;

  ctx.beginPath();
  // Body and attic
  ctx.rect(X(-0.11), Y(0.07), 0.22 * u, 0.07 * u + 1);
  ctx.rect(X(-0.075), Y(0.088), 0.15 * u, 0.02 * u);
  // Pediments over the two ends
  ctx.moveTo(X(-0.11), Y(0.07));
  ctx.lineTo(X(-0.085), Y(0.088));
  ctx.lineTo(X(-0.06), Y(0.07));
  ctx.closePath();
  ctx.moveTo(X(0.06), Y(0.07));
  ctx.lineTo(X(0.085), Y(0.088));
  ctx.lineTo(X(0.11), Y(0.07));
  ctx.closePath();
  // Colonnade ring, drum, dome
  ctx.rect(X(-0.058), Y(0.122), 0.116 * u, 0.034 * u);
  ctx.rect(X(-0.05), Y(0.138), 0.1 * u, 0.018 * u);
  ctx.moveTo(X(-0.05), Y(0.137));
  ctx.ellipse(x, Y(0.137), 0.05 * u, 0.064 * u, 0, Math.PI, 0);
  ctx.closePath();
  // Lantern, its cap, ball and cross
  ctx.rect(X(-0.0095), Y(0.222), 0.019 * u, 0.025 * u);
  ctx.moveTo(X(-0.011), Y(0.222));
  ctx.ellipse(x, Y(0.222), 0.011 * u, 0.012 * u, 0, Math.PI, 0);
  ctx.closePath();
  circle(ctx, x, Y(0.238), u * 0.0045);
  ctx.rect(X(-0.0018), Y(0.262), 0.0036 * u, 0.022 * u);
  ctx.rect(X(-0.008), Y(0.253), 0.016 * u, 0.0034 * u);
  ctx.fillStyle = tone.far;
  ctx.fill();

  // Snow: on the dome's crown, the ledges and the body's roof.
  ctx.beginPath();
  oval(ctx, x, Y(0.192), 0.03 * u, 0.012 * u);
  ctx.rect(X(-0.061), Y(0.124), 0.122 * u, 0.0045 * u);
  ctx.rect(X(-0.053), Y(0.14), 0.106 * u, 0.0045 * u);
  ctx.rect(X(-0.077), Y(0.09), 0.154 * u, 0.004 * u);
  ctx.fillStyle = tone.farSnow;
  ctx.fill();

  // Lit slits between the columns, and the dome's ribs.
  ctx.beginPath();
  for (let i = 0; i < 7; i++) ctx.rect(X(-0.047 + i * 0.0155), Y(0.116), u * 0.0055, u * 0.02);
  for (let i = 0; i < 3; i++) ctx.rect(X(-0.088 + i * 0.012), Y(0.058), u * 0.006, u * 0.016);
  for (let i = 0; i < 3; i++) ctx.rect(X(0.064 + i * 0.012), Y(0.058), u * 0.006, u * 0.016);
  ctx.fillStyle = tone.farLight;
  ctx.fill();
  ctx.beginPath();
  for (const k of DOME_RIBS) {
    ctx.moveTo(X(k * 0.05), Y(0.14));
    ctx.quadraticCurveTo(X(k * 0.045), Y(0.185), x, Y(0.198));
  }
  ctx.strokeStyle = tone.farSnow;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the steeple

const STEEPLE_X = 0.17;
const BELL_PERIOD = 7; // seconds per peal cycle
const BELL_RING = 3.2; // seconds of each cycle the bell swings

/** The bell's 0..1 swing envelope and its angle, refilled every frame (no allocations). */
const BELL = { on: 0, angle: 0 };
function bellSwing(t: number): void {
  const p = ((t % BELL_PERIOD) + BELL_PERIOD) % BELL_PERIOD;
  BELL.on = p < BELL_RING ? Math.sin((p / BELL_RING) * Math.PI) : 0;
  BELL.angle = Math.sin(p * 5.2) * 0.55 * BELL.on;
}

/** A tiered steeple: tower with a clock, an open belfry with a swinging bell, tiers, spire. */
function steeple(ctx: Ctx, s: Scene, tone: Tone, cx: number, hy: number): void {
  const u = s.u;
  const x = cx + STEEPLE_X * u;
  ox = x;
  oy = hy;
  ou = u;

  ctx.beginPath();
  ctx.rect(X(-0.026), Y(0.15), 0.052 * u, 0.15 * u + 1);
  // Belfry with an arched opening cut out (drawn as two piers and a lintel)
  ctx.rect(X(-0.022), Y(0.198), 0.01 * u, 0.048 * u);
  ctx.rect(X(0.012), Y(0.198), 0.01 * u, 0.048 * u);
  ctx.rect(X(-0.022), Y(0.198), 0.044 * u, 0.01 * u);
  // Tiers and the spire
  ctx.rect(X(-0.016), Y(0.218), 0.032 * u, 0.021 * u);
  ctx.rect(X(-0.011), Y(0.234), 0.022 * u, 0.017 * u);
  ctx.moveTo(X(-0.008), Y(0.234));
  ctx.lineTo(x, Y(0.315));
  ctx.lineTo(X(0.008), Y(0.234));
  ctx.closePath();
  circle(ctx, x, Y(0.318), u * 0.004);
  ctx.fillStyle = tone.far;
  ctx.fill();

  // Inside the belfry: warm lamplight with the bell swinging in it.
  const openX = X(-0.012);
  const openY = Y(0.188);
  const openH = 0.038 * u;
  ctx.beginPath();
  ctx.rect(openX, openY, 0.024 * u, openH);
  ctx.fillStyle = tone.farLight;
  ctx.fill();
  bellSwing(s.t);
  const { on, angle } = BELL;
  ctx.save();
  ctx.translate(x, openY + u * 0.003);
  ctx.rotate(angle);
  ctx.beginPath();
  const b = u * 0.0105;
  ctx.moveTo(-b * 0.55, b * 0.3);
  ctx.quadraticCurveTo(-b * 0.6, b * 1.5, -b * 1.05, b * 2);
  ctx.lineTo(b * 1.05, b * 2);
  ctx.quadraticCurveTo(b * 0.6, b * 1.5, b * 0.55, b * 0.3);
  ctx.quadraticCurveTo(0, -b * 0.15, -b * 0.55, b * 0.3);
  ctx.closePath();
  circle(ctx, 0, b * 2.2, b * 0.3);
  ctx.fillStyle = tone.far;
  ctx.fill();
  ctx.restore();

  // Clock face on the tower, and lit lancet windows below it.
  const cy = Y(0.128);
  ctx.beginPath();
  circle(ctx, x, cy, u * 0.012);
  ctx.rect(X(-0.005), Y(0.085), u * 0.01, u * 0.024);
  ctx.rect(X(-0.005), Y(0.045), u * 0.01, u * 0.024);
  ctx.fillStyle = tone.farLight;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x, cy - u * 0.009);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + u * 0.006, cy + u * 0.002);
  ctx.strokeStyle = tone.far;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.lineCap = "round";
  ctx.stroke();

  // Snow on the ledges.
  ctx.beginPath();
  ctx.rect(X(-0.029), Y(0.152), 0.058 * u, 0.005 * u);
  ctx.rect(X(-0.025), Y(0.2), 0.05 * u, 0.0045 * u);
  ctx.rect(X(-0.018), Y(0.22), 0.036 * u, 0.004 * u);
  ctx.rect(X(-0.013), Y(0.236), 0.026 * u, 0.004 * u);
  ctx.fillStyle = tone.farSnow;
  ctx.fill();

  // While it swings, rings of sound spread from the belfry and fade.
  if (on > 0.02) {
    const by = openY + openH * 0.5;
    const p = (s.t * 0.9) % 1;
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const q = (p + k * 0.5) % 1;
      const r = u * (0.03 + q * 0.07);
      ctx.moveTo(x + Math.cos(-0.5) * r, by + Math.sin(-0.5) * r);
      ctx.arc(x, by, r, -0.5, 0.5);
      ctx.moveTo(x - Math.cos(-0.5) * r, by + Math.sin(-0.5) * r);
      ctx.arc(x, by, r, Math.PI + 0.5, Math.PI - 0.5, true);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.55 * on;
    ctx.lineWidth = Math.max(1.2, u * 0.004);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * The horizon: the hazy back row, a fog veil, the dome and the steeple, then the pigeons
 * passing over (in front of the skyline, behind the fog bank).
 */
export function far(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const cx = s.cssW / 2;
  if (hy - s.u * 0.4 <= s.cssH) {
    const tone = toneOf(s);
    backRow(ctx, s, tone, cx, hy);
    veil(ctx, s, hy);
    dome(ctx, s, tone, cx, hy);
    steeple(ctx, s, tone, cx, hy);
  }
  pigeonFlock(ctx, s);
}

import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { SMOKE } from "./colors";
import { toneOf, type Tone } from "./tone";

// London on the horizon, cut from flat paper like the far layer of a 1950s Christmas card (no
// outlines, no gradients): a range of snowy hills behind, piled high at the sides and low behind
// the tower; on them a row of steep rooftops bristling with chimney pots and a couple of thin
// spires, a few windows lit; then two landmarks of our own design, a great domed cathedral left
// of center and a tiered church steeple right of center whose bell swings and rings out; and
// strips of fog drifting across their feet. The landmarks stand at the edges of the tower's column,
// where they show between the townhouses at the start, so its middle stays open sky. Everything stands on horizonY; the snowy hills of
// hills.ts come up in front. Layout is in u from the screen center, y up from the horizon. Their
// colors follow the story's light (tone.ts): dusk teal with lit windows, as on the street, night
// navy higher up, and in the loop's morning daylight grey-blue with the windows dark.

// ---------------------------------------------------------------- the hills behind

/** The hills behind the city: [x (u from center), height (u)] along their top, sides high, middle low. */
const BACK_HILLS = (() => {
  const pts: number[] = [];
  for (let x = -1.2; x <= 1.2001; x += 0.04) {
    const side = Math.min(1, Math.abs(x) / 0.62);
    pts.push(x, 0.035 + 0.2 * side * side * (0.72 + 0.28 * Math.sin(x * 6.3 + 1.1)));
  }
  return pts;
})();

function backHills(ctx: Ctx, s: Scene, tone: Tone, cx: number, hy: number): void {
  const u = s.u;
  ctx.beginPath();
  ctx.moveTo(cx + BACK_HILLS[0]! * u, hy + 1);
  for (let i = 0; i + 1 < BACK_HILLS.length; i += 2) ctx.lineTo(cx + BACK_HILLS[i]! * u, hy - BACK_HILLS[i + 1]! * u);
  ctx.lineTo(cx + BACK_HILLS[BACK_HILLS.length - 2]! * u, hy + 1);
  ctx.closePath();
  ctx.fillStyle = tone.farBackSnow;
  ctx.fill();
}

// ---------------------------------------------------------------- back row

/** Back rooftops: a closed outline as x, y pairs (y up), the chimney pots, lit windows and smoking stacks. */
const { ROOFLINE, POTS, BACK_WINDOWS, BACK_SMOKE } = (() => {
  const line: number[] = [];
  const pots: number[] = [];
  const wins: number[] = [];
  const smoke: number[] = [];
  // Low in the middle, behind the tower (the fog all but hides them there), rising to the sides.
  const lift = (x: number) => {
    const side = Math.min(1, Math.abs(x) / 0.55);
    return 0.35 + 1.95 * side * side;
  };
  let x = -1.7;
  line.push(x, 0);
  for (let i = 0; x < 1.7; i++) {
    const w = 0.045 + hash(i + 8000) * 0.05;
    const k = lift(x + w / 2);
    const h = (0.05 + hash(i + 8010) * 0.05) * k;
    const kind = hash(i + 8020);
    line.push(x, h);
    if (kind < 0.45) {
      // A steep gable
      line.push(x + w / 2, h + w * 0.75);
    } else if (kind < 0.75) {
      // A flat roof with a chimney stack and its pots
      const cx = x + w * (0.3 + hash(i + 8030) * 0.4);
      const sw = 0.016;
      const sh = 0.02 * Math.min(1.4, k);
      line.push(cx - sw / 2, h, cx - sw / 2, h + sh, cx + sw / 2, h + sh, cx + sw / 2, h);
      pots.push(cx - sw * 0.28, h + sh, cx + sw * 0.22, h + sh);
      if (hash(i + 8040) > 0.5 && Math.abs(cx) > 0.2) smoke.push(cx, h + sh + 0.008, hash(i + 8050));
    } else {
      // A mansard: steep sides, flat top
      line.push(x + w * 0.16, h + w * 0.42, x + w * 0.84, h + w * 0.42);
    }
    line.push(x + w, h);
    if (hash(i + 8060) > 0.4 && Math.abs(x) > 0.15) wins.push(x + w * (0.3 + hash(i + 8070) * 0.4), h * (0.45 + hash(i + 8080) * 0.3));
    // Now and then a thin spire behind the roofs, out to the sides.
    if (hash(i + 8090) > 0.9 && Math.abs(x) > 0.3) {
      const sx = x + w / 2;
      const sk = Math.min(1.3, k);
      line.push(x + w, h, sx + 0.008, h, sx + 0.008, h + 0.06 * sk, sx, h + 0.12 * sk, sx - 0.008, h + 0.06 * sk, sx - 0.008, h);
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
  const ph = u * 0.01;
  for (let i = 0; i + 1 < POTS.length; i += 2) ctx.rect(cx + POTS[i]! * u - pw / 2, hy - POTS[i + 1]! * u - ph, pw, ph + 1);
  ctx.fillStyle = tone.farBack;
  ctx.fill();

  // Lit windows: small squares, twinkling on and off.
  const ww = u * 0.008;
  ctx.beginPath();
  for (let i = 0; i + 1 < BACK_WINDOWS.length; i += 2) {
    if (Math.sin(s.t * 0.3 + i * 1.7) < -0.7) continue;
    ctx.rect(cx + BACK_WINDOWS[i]! * u - ww / 2, hy - BACK_WINDOWS[i + 1]! * u - ww / 2, ww, ww);
  }
  ctx.fillStyle = tone.farWindow;
  ctx.fill();

  // Thin smoke rising from some of the stacks: flat puffs.
  ctx.beginPath();
  for (let i = 0; i + 2 < BACK_SMOKE.length; i += 3) {
    const x0 = cx + BACK_SMOKE[i]! * u;
    const y0 = hy - BACK_SMOKE[i + 1]! * u;
    for (let k = 0; k < 3; k++) {
      const p = (s.t * 0.12 + k / 3 + BACK_SMOKE[i + 2]!) % 1;
      circle(ctx, x0 + p * u * 0.03, y0 - p * u * 0.05, u * (0.004 + 0.007 * p));
    }
  }
  ctx.fillStyle = SMOKE;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- fog

/**
 * Strips of fog drifting across the city's feet, flat rounded bands of the dusk's haze:
 * [height above the horizon (u), thickness (u), length (u), drift (u per second), phase].
 * The first lies behind the landmarks, the others in front of their feet.
 */
const FOG_STRIPS = [
  [0.05, 0.016, 0.9, 0.008, 0.1],
  [0.022, 0.02, 1.15, -0.006, 0.55],
  [0.006, 0.014, 0.8, 0.01, 0.3],
] as const;

function fogStrip(ctx: Ctx, s: Scene, tone: Tone, hy: number, i: number): void {
  const [up, thick, len, drift, phase] = FOG_STRIPS[i]!;
  const u = s.u;
  const L = len * u;
  const span = s.cssW + L;
  const x = ((((phase * span + s.t * drift * u) % span) + span) % span) - L;
  const y = hy - up * u;
  const r = (thick * u) / 2;
  ctx.beginPath();
  // Two pieces a screen apart, so the strip wraps round smoothly.
  for (const x0 of [x, x - span]) {
    if (x0 > s.cssW || x0 + L < 0) continue;
    ctx.moveTo(x0 + r, y - r);
    ctx.lineTo(x0 + L - r, y - r);
    ctx.arc(x0 + L - r, y, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x0 + r, y + r);
    ctx.arc(x0 + r, y, r, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
  }
  ctx.fillStyle = tone.fog;
  ctx.fill();
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

const DOME_X = -0.2;

/** The cathedral: a long body with pediments, a colonnaded drum, a dome, a lantern, ball and cross. */
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
  ctx.lineTo(X(-0.085), Y(0.092));
  ctx.lineTo(X(-0.06), Y(0.07));
  ctx.closePath();
  ctx.moveTo(X(0.06), Y(0.07));
  ctx.lineTo(X(0.085), Y(0.092));
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

  // Snow: a flat cap on the dome's crown, and lines along the ledges and the body's roof.
  ctx.beginPath();
  oval(ctx, x, Y(0.19), 0.03 * u, 0.011 * u);
  ctx.rect(X(-0.061), Y(0.124), 0.122 * u, 0.0045 * u);
  ctx.rect(X(-0.053), Y(0.14), 0.106 * u, 0.0045 * u);
  ctx.rect(X(-0.077), Y(0.09), 0.154 * u, 0.004 * u);
  ctx.fillStyle = tone.farSnow;
  ctx.fill();

  // Lit slits between the columns, and windows in the body.
  ctx.beginPath();
  for (let i = 0; i < 7; i++) ctx.rect(X(-0.047 + i * 0.0155), Y(0.116), u * 0.0055, u * 0.02);
  for (let i = 0; i < 3; i++) ctx.rect(X(-0.088 + i * 0.012), Y(0.058), u * 0.006, u * 0.014);
  for (let i = 0; i < 3; i++) ctx.rect(X(0.064 + i * 0.012), Y(0.058), u * 0.006, u * 0.014);
  ctx.fillStyle = tone.farLight;
  ctx.fill();
}

// ---------------------------------------------------------------- the steeple

const STEEPLE_X = 0.215;
const BELL_PERIOD = 7; // seconds per peal cycle; the first peal starts at s.t = 0
const BELL_RING = 3.2; // seconds of each cycle the bell swings

/** 0..1: how hard the bell is swinging at time t (0 between peals). */
export function bellOn(t: number): number {
  const p = ((t % BELL_PERIOD) + BELL_PERIOD) % BELL_PERIOD;
  return p < BELL_RING ? Math.sin((p / BELL_RING) * Math.PI) : 0;
}

/** The bell's 0..1 swing envelope and its angle, refilled every frame (no allocations). */
const BELL = { on: 0, angle: 0 };
function bellSwing(t: number): void {
  const p = ((t % BELL_PERIOD) + BELL_PERIOD) % BELL_PERIOD;
  BELL.on = bellOn(t);
  BELL.angle = Math.sin(p * 5.2) * 0.55 * BELL.on;
}

/** A tiered steeple: a tower with a clock, an open belfry with a swinging bell, tiers, a needle spire. */
function steeple(ctx: Ctx, s: Scene, tone: Tone, cx: number, hy: number): void {
  const u = s.u;
  const x = cx + STEEPLE_X * u;
  ox = x;
  oy = hy;
  ou = u;

  ctx.beginPath();
  ctx.rect(X(-0.026), Y(0.15), 0.052 * u, 0.15 * u + 1);
  // Belfry with an opening (two piers and a lintel)
  ctx.rect(X(-0.022), Y(0.198), 0.01 * u, 0.048 * u);
  ctx.rect(X(0.012), Y(0.198), 0.01 * u, 0.048 * u);
  ctx.rect(X(-0.022), Y(0.198), 0.044 * u, 0.01 * u);
  // Tiers and the spire
  ctx.rect(X(-0.016), Y(0.218), 0.032 * u, 0.021 * u);
  ctx.rect(X(-0.011), Y(0.234), 0.022 * u, 0.017 * u);
  ctx.moveTo(X(-0.008), Y(0.234));
  ctx.lineTo(x, Y(0.325));
  ctx.lineTo(X(0.008), Y(0.234));
  ctx.closePath();
  ctx.fillStyle = tone.far;
  ctx.fill();

  // Inside the belfry: lamplight with the bell swinging in it.
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
  // A bell as a flat trapezoid with a rounded crown, and its clapper.
  ctx.moveTo(-b * 0.5, b * 0.35);
  ctx.lineTo(-b * 1.05, b * 2);
  ctx.lineTo(b * 1.05, b * 2);
  ctx.lineTo(b * 0.5, b * 0.35);
  ctx.quadraticCurveTo(0, -b * 0.2, -b * 0.5, b * 0.35);
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

  // While it swings, arcs of sound spread from the belfry and fade.
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
    ctx.strokeStyle = tone.farLight;
    ctx.globalAlpha = 0.6 * on;
    ctx.lineWidth = Math.max(1.2, u * 0.004);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** The horizon: the hills behind, the back row of rooftops, a strip of fog, the dome and the steeple with fog drifting across their feet. */
export function far(ctx: Ctx, s: Scene): void {
  const hy = s.horizonY;
  const cx = s.cssW / 2;
  if (hy - s.u * 0.4 <= s.cssH) {
    const tone = toneOf(s);
    backHills(ctx, s, tone, cx, hy);
    backRow(ctx, s, tone, cx, hy);
    fogStrip(ctx, s, tone, hy, 0);
    dome(ctx, s, tone, cx, hy);
    steeple(ctx, s, tone, cx, hy);
    fogStrip(ctx, s, tone, hy, 1);
    fogStrip(ctx, s, tone, hy, 2);
  }
}

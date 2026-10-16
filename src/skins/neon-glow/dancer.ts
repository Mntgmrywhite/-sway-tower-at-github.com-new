import { alpha, circle, oval, type Ctx } from "../../base/draw";
import { beats, glowLine, RIM, SIL } from "./common";

// A dancer under the blacklights: a dark silhouette with a thin UV rim, glowing face-paint
// stripes, a glow necklace, glow-stick bracelets and a glow stick in hand. Poses change on
// every beat and the body bounces into it, all from the scene clock.

export interface DancerLook {
  /** Dance move: 0 fist pump, 1 both arms up in a V, 2 arms out swinging, 3 point side to side, 4 DJ. */
  move: number;
  /** Beat offset so neighbors don't move in lockstep. */
  phase: number;
  /** Face paint and bracelet color. */
  paint: string;
  /** Necklace and held glow-stick color. */
  stick: string;
}

// Joint scratch: shoulders, elbows, hands, hips, knees, feet (x, y pairs), reused every call.
const J = new Float64Array(24);
const SHL = 0;
const SHR = 2;
const ELL = 4;
const ELR = 6;
const HAL = 8;
const HAR = 10;
const HIL = 12;
const HIR = 14;
const KNL = 16;
const KNR = 18;
const FTL = 20;
const FTR = 22;

function set(i: number, x: number, y: number): void {
  J[i] = x;
  J[i + 1] = y;
}

/** Joint positions for this moment of the dance; returns the head center via HEAD. */
function pose(t: number, x: number, y: number, h: number, look: DancerLook): void {
  const b = beats(t) + look.phase;
  const step = Math.floor(b);
  const f = b - step;
  const hit = Math.pow(1 - f, 2.5);
  const flip = step % 2 === 0 ? 1 : -1;
  const drop = h * 0.035 * hit;
  const sway = Math.sin(b * Math.PI) * h * 0.03;

  const hipY = y - h * 0.47 + drop;
  const shY = y - h * 0.76 + drop;
  const hx = x + sway;
  const sx = x + sway * 1.5;
  HEAD.x = sx + sway * 0.4;
  HEAD.y = y - h * 0.885 + drop;
  set(SHL, sx - h * 0.1, shY);
  set(SHR, sx + h * 0.1, shY);
  set(HIL, hx - h * 0.06, hipY);
  set(HIR, hx + h * 0.06, hipY);
  // Knees bend on the beat; feet stay planted, stepping on alternate beats.
  const kneeY = y - h * 0.24 + drop * 0.5;
  set(KNL, hx - h * 0.075 - drop * 0.5, kneeY);
  set(KNR, hx + h * 0.075 + drop * 0.5, kneeY);
  const stepOut = flip * h * 0.02;
  set(FTL, x - h * 0.085 + Math.min(0, stepOut), y);
  set(FTR, x + h * 0.085 + Math.max(0, stepOut), y);

  const up = 1 - hit * 0.5;
  switch (look.move) {
    case 0: {
      // Fist pump: one arm punches up on the beat, the other on the hip.
      const s = flip > 0 ? 1 : -1;
      const [a, ea, ha, o, eo, ho] = s > 0 ? RIGHT_LEADS : LEFT_LEADS;
      set(ea, J[a]! + s * h * 0.07, J[a + 1]! - h * 0.13 * up);
      set(ha, J[a]! + s * h * 0.06, J[a + 1]! - h * 0.3 * up);
      set(eo, J[o]! - s * h * 0.09, J[o + 1]! + h * 0.12);
      set(ho, J[o]! - s * h * 0.01, J[o + 1]! + h * 0.25);
      break;
    }
    case 1: {
      // V: both arms up, hands swaying together.
      const w = Math.sin(b * Math.PI) * h * 0.05;
      set(ELL, J[SHL]! - h * 0.09 + w, J[SHL + 1]! - h * 0.13);
      set(ELR, J[SHR]! + h * 0.09 + w, J[SHR + 1]! - h * 0.13);
      set(HAL, J[SHL]! - h * 0.16 + w * 1.6, J[SHL + 1]! - h * 0.28 * up);
      set(HAR, J[SHR]! + h * 0.16 + w * 1.6, J[SHR + 1]! - h * 0.28 * up);
      break;
    }
    case 2: {
      // Arms out, forearms swinging up and down in turn.
      const l = flip > 0 ? -0.14 : 0.08;
      set(ELL, J[SHL]! - h * 0.15, J[SHL + 1]! + h * 0.02);
      set(ELR, J[SHR]! + h * 0.15, J[SHR + 1]! + h * 0.02);
      set(HAL, J[SHL]! - h * 0.22, J[SHL + 1]! + h * l);
      set(HAR, J[SHR]! + h * 0.22, J[SHR + 1]! - h * l - h * 0.06);
      break;
    }
    case 4: {
      // DJ: the outer (left) fist pumps on every beat, the right hand rides the deck.
      set(ELL, J[SHL]! - h * 0.07, J[SHL + 1]! - h * 0.13 * up);
      set(HAL, J[SHL]! - h * 0.06, J[SHL + 1]! - h * 0.3 * up);
      set(ELR, J[SHR]! + h * 0.06, J[SHR + 1]! + h * 0.11);
      set(HAR, J[SHR]! + h * 0.13, J[SHR + 1]! + h * 0.17 + hit * h * 0.02);
      break;
    }
    default: {
      // Point: one arm points up and out, switching sides on every beat.
      const s = flip;
      const [a, ea, ha, o, eo, ho] = s > 0 ? RIGHT_LEADS : LEFT_LEADS;
      set(ea, J[a]! + s * h * 0.1, J[a + 1]! - h * 0.1);
      set(ha, J[a]! + s * h * 0.2, J[a + 1]! - h * 0.24 * up);
      set(eo, J[o]! - s * h * 0.05, J[o + 1]! + h * 0.13);
      set(ho, J[o]! + s * h * 0.05, J[o + 1]! + h * 0.2);
    }
  }
}

/** Head center of the dancer drawn last (for headphones and the like). */
export const HEAD = { x: 0, y: 0 };
const RIGHT_LEADS = [SHR, ELR, HAR, SHL, ELL, HAL] as const;
const LEFT_LEADS = [SHL, ELL, HAL, SHR, ELR, HAR] as const;
const LIMBS = [
  [SHL, ELL, HAL],
  [SHR, ELR, HAR],
  [HIL, KNL, FTL],
  [HIR, KNR, FTR],
] as const;
const RIM_GLOW = alpha(RIM, 0.28);

/** Arms and legs as one path (they share a width, so one stroke draws them all). */
function limbs(ctx: Ctx): void {
  ctx.beginPath();
  for (const [a, b, c] of LIMBS) {
    ctx.moveTo(J[a]!, J[a + 1]!);
    ctx.lineTo(J[b]!, J[b + 1]!);
    ctx.lineTo(J[c]!, J[c + 1]!);
  }
}

function torso(ctx: Ctx, h: number): void {
  ctx.beginPath();
  ctx.moveTo(J[SHL]! - h * 0.015, J[SHL + 1]! + h * 0.01);
  ctx.quadraticCurveTo((J[SHL]! + J[SHR]!) / 2, J[SHL + 1]! - h * 0.035, J[SHR]! + h * 0.015, J[SHR + 1]! + h * 0.01);
  ctx.lineTo(J[HIR]! + h * 0.03, J[HIR + 1]!);
  ctx.lineTo(J[HIL]! - h * 0.03, J[HIL + 1]!);
  ctx.closePath();
  // Neck and head.
  ctx.rect(HEAD.x - h * 0.025, HEAD.y, h * 0.05, J[SHL + 1]! - HEAD.y + h * 0.01);
  circle(ctx, HEAD.x, HEAD.y, h * 0.078);
}

/** Draw a dancer standing at (x, y), `h` pixels tall (to the top of the head). */
export function dancer(ctx: Ctx, t: number, x: number, y: number, h: number, look: DancerLook): void {
  pose(t, x, y, h, look);
  const limb = h * 0.068;
  const rim = Math.max(1, h * 0.022);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Rim first (soft glow, then the line), then the silhouette over it.
  for (let pass = 0; pass < 2; pass++) {
    const grow = pass === 0 ? rim * 3.2 : rim * 1.2;
    ctx.strokeStyle = pass === 0 ? RIM_GLOW : RIM;
    limbs(ctx);
    ctx.lineWidth = limb + grow;
    ctx.stroke();
    torso(ctx, h);
    ctx.lineWidth = grow;
    ctx.stroke();
  }
  ctx.strokeStyle = SIL;
  ctx.fillStyle = SIL;
  limbs(ctx);
  ctx.lineWidth = limb;
  ctx.stroke();
  torso(ctx, h);
  ctx.fill();

  // Glow accents: face paint stripes, bracelets, necklace, held stick.
  const hr = h * 0.078;
  ctx.beginPath();
  // Cheek stripes and a dot on the brow.
  ctx.moveTo(HEAD.x - hr * 0.72, HEAD.y + hr * 0.22);
  ctx.lineTo(HEAD.x - hr * 0.3, HEAD.y + hr * 0.22);
  ctx.moveTo(HEAD.x + hr * 0.3, HEAD.y + hr * 0.22);
  ctx.lineTo(HEAD.x + hr * 0.72, HEAD.y + hr * 0.22);
  ctx.moveTo(HEAD.x, HEAD.y - hr * 0.5);
  ctx.lineTo(HEAD.x, HEAD.y - hr * 0.42);
  oval(ctx, (J[ELL]! + J[HAL]! * 2) / 3, (J[ELL + 1]! + J[HAL + 1]! * 2) / 3, h * 0.034, h * 0.016);
  oval(ctx, (J[ELR]! + J[HAR]! * 2) / 3, (J[ELR + 1]! + J[HAR + 1]! * 2) / 3, h * 0.034, h * 0.016);
  glowLine(ctx, look.paint, Math.max(1, h * 0.016), 2.4);

  ctx.beginPath();
  oval(ctx, HEAD.x, J[SHL + 1]! - h * 0.005, h * 0.05, h * 0.022);
  // Glow stick in the higher hand, held upright.
  const hand = J[HAL + 1]! < J[HAR + 1]! ? HAL : HAR;
  const hx = J[hand]!;
  const hy = J[hand + 1]!;
  const tilt = (hx - HEAD.x) / h;
  ctx.moveTo(hx - tilt * h * 0.02, hy + h * 0.02);
  ctx.lineTo(hx + tilt * h * 0.25, hy - h * 0.1);
  glowLine(ctx, look.stick, Math.max(1.1, h * 0.02), 2.6);
}

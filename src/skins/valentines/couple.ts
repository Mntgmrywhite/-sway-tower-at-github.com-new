import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { landLine } from "./far";
import { heartPath } from "./shapes";
import type { Tone } from "./tone";

// The couple at the café's terrace table, across the canal in the right lane: she in a pink
// dress with her hair up, he in a blue jacket, at a little round table with a rose in a vase.
// Their story is told in the first seconds of every tower (the scene's clock starts at 0 with
// the title screen's tower and with every new run): he reaches into his jacket, brings out a
// card and holds it out across the table; she takes it, holds it up and reads it, and little
// hearts float up from her; she sets it down, and their hands meet over the table. Every
// CYCLE seconds they do it again, the other one giving the card this time. The rest of the time
// they sit holding hands, and she tilts her head toward him now and then. Far away: flat fills
// in the hour's light, no outline. Nothing here is allocated per frame.
//
// Positions are in u from the screen center, heights in u above the horizon.

/** The table's center and where they sit (u from the screen center); the terrace stands on the pavement this far below the horizon. */
export const TABLE_X = 0.36;
const SEAT = 0.044;
const TERRACE = 0.028;

/** One telling of the story, and the moments in it (s). */
export const CYCLE = 24;
const REACH = 0.4;
const OFFER = 1.2;
const TAKEN = 2.8;
const READ = 4.2;
const DOWN = 7;
const SET = 8.4;
const HOLD = 9.8;
/** When the two hearts rise from the reader, and how long each floats (s). */
const HEARTS = [4.6, 5.9] as const;
const FLOAT = 2.2;

export interface Pose {
  /** Who gives the card this time: 0 he (on the right), 1 she (on the left). */
  giver: number;
  /** Whether the card is out, how far across the table from the giver (0..1), and how high it is held (0 on the table, 1 up to read). */
  card: boolean;
  across: number;
  lift: number;
  /** The giver's reach into a pocket or bag (0..1), and the receiver's reach for the card. */
  reach: number;
  take: number;
  /** Hands meeting over the table (0..1). */
  hands: number;
  /** The two little hearts: how far each has floated (0 none, up to 1 gone). */
  heart0: number;
  heart1: number;
  /** Her head tilting toward him (0..1). */
  tilt: number;
}

const POSE: Pose = { giver: 0, card: false, across: 0, lift: 0, reach: 0, take: 0, hands: 0, heart0: 0, heart1: 0, tilt: 0 };

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** 0 -> 1 -> 0: up over `rise` seconds from t0, down over `fall` seconds to t1. */
function pulse(k: number, t0: number, t1: number, rise: number, fall: number): number {
  return ease((k - t0) / rise) * (1 - ease((k - t1 + fall) / fall));
}

/** What the couple is doing at scene time `t`. */
export function couplePlan(t: number): Pose {
  const n = Math.floor(t / CYCLE);
  const k = t - n * CYCLE;
  const p = POSE;
  p.giver = n % 2;
  p.reach = pulse(k, REACH, OFFER + 0.3, 0.5, 0.4);
  p.card = k >= OFFER && k < SET;
  p.across = ease((k - OFFER) / (TAKEN - OFFER));
  p.lift = k < TAKEN ? 0.35 * ease((k - OFFER) / 0.5) : k < DOWN ? 0.35 + 0.65 * ease((k - TAKEN) / (READ - TAKEN)) : (1 - ease((k - DOWN) / (SET - DOWN))) * 1;
  p.take = pulse(k, TAKEN - 0.6, SET + 0.2, 0.5, 0.6);
  p.hands = ease((k - SET) / (HOLD - SET)) * (1 - ease((k - CYCLE + 1.2) / 0.8));
  p.heart0 = clamp01((k - HEARTS[0]) / FLOAT);
  p.heart1 = clamp01((k - HEARTS[1]) / FLOAT);
  p.tilt = k > HOLD ? pulse(k, HOLD + 1.5, HOLD + 7, 1.2, 1.2) * 0.6 + pulse(k, HOLD + 9, HOLD + 13, 1, 1) * 0.6 : 0;
  return p;
}

/** A seated figure facing `m` (+1 right): a dress or jacket, a head, hair, an arm that reaches. */
function sitter(ctx: Ctx, tone: Tone, x: number, foot: number, u: number, m: number, her: boolean, reachOut: number, reachDown: number, tilt: number): void {
  const body = her ? tone.dress : tone.jacket;
  // The chair: a back and two legs behind the figure.
  ctx.fillStyle = tone.chair;
  ctx.fillRect(x - m * u * 0.018 - u * 0.002, foot - u * 0.052, u * 0.004, u * 0.052);
  ctx.fillRect(x - m * u * 0.016, foot - u * 0.052, m * u * 0.014, u * 0.004);
  ctx.fillRect(x + m * u * 0.006, foot - u * 0.03, u * 0.003, u * 0.03);
  // Body: a bell of dress or a jacket, seated.
  ctx.fillStyle = body;
  ctx.beginPath();
  if (her) {
    ctx.moveTo(x - u * 0.011, foot - u * 0.05);
    ctx.lineTo(x + u * 0.011, foot - u * 0.05);
    ctx.lineTo(x + u * 0.02, foot - u * 0.004);
    ctx.lineTo(x - u * 0.02, foot - u * 0.004);
    ctx.closePath();
  } else {
    ctx.rect(x - u * 0.012, foot - u * 0.05, u * 0.024, u * 0.03);
    ctx.rect(x - u * 0.013, foot - u * 0.022, u * 0.026, u * 0.018);
  }
  ctx.fill();
  if (!her) {
    ctx.fillStyle = tone.cap;
    ctx.fillRect(x - u * 0.013, foot - u * 0.022, u * 0.026, u * 0.018);
    ctx.fillStyle = tone.sign;
    ctx.fillRect(x - u * 0.003, foot - u * 0.05, u * 0.006, u * 0.02);
  }
  // Legs tucked under the table.
  ctx.fillStyle = her ? tone.skin : tone.cap;
  ctx.fillRect(x + m * u * 0.006, foot - u * 0.02, m * u * 0.012, u * 0.02);
  // The head, tilted toward the table a little when she leans.
  const hx = x + m * tilt * u * 0.006;
  const hy = foot - u * 0.066 + tilt * u * 0.003;
  ctx.fillStyle = tone.skin;
  ctx.beginPath();
  circle(ctx, hx, hy, u * 0.013);
  ctx.fill();
  ctx.fillStyle = tone.hair;
  ctx.beginPath();
  if (her) {
    ctx.moveTo(hx - u * 0.013, hy);
    ctx.arc(hx, hy, u * 0.013, Math.PI, 0);
    ctx.closePath();
    circle(ctx, hx - m * u * 0.006, hy - u * 0.014, u * 0.007);
  } else {
    ctx.moveTo(hx - u * 0.013, hy - u * 0.002);
    ctx.arc(hx, hy - u * 0.002, u * 0.013, Math.PI, 0);
    ctx.closePath();
  }
  ctx.fill();
  // The arm: at rest on the table's edge, out across it, or down to a pocket or bag.
  const ax = x + m * u * 0.01;
  const ay = foot - u * 0.04;
  const tx = ax + m * u * (0.012 + reachOut * 0.016);
  const ty = ay - reachOut * u * 0.004 + reachDown * u * 0.02;
  ctx.strokeStyle = body;
  ctx.lineWidth = u * 0.007;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = tone.skin;
  ctx.beginPath();
  circle(ctx, tx, ty, u * 0.0045);
  ctx.fill();
}

/** The card: a small pink rectangle with a heart, held upright when lifted. */
function card(ctx: Ctx, tone: Tone, x: number, y: number, u: number, lift: number): void {
  const w = u * 0.016;
  const h = u * (0.006 + lift * 0.012);
  ctx.fillStyle = tone.card;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = tone.rose;
  ctx.beginPath();
  heartPath(ctx, x, y - h * 0.5, Math.min(w, h) * 0.6);
  ctx.fill();
}

/**
 * The terrace: the table with its rose, the two of them in their chairs, the card where it is
 * in the story, their hands meeting, and the hearts floating up from whoever reads the card.
 */
export function couple(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2 + TABLE_X * u;
  const foot = landLine(s) + TERRACE * u;
  const p = couplePlan(s.t);
  const herX = cx - SEAT * u;
  const himX = cx + SEAT * u;
  // The table: a pedestal, a round top, a vase with a rose.
  ctx.fillStyle = tone.chair;
  ctx.fillRect(cx - u * 0.003, foot - u * 0.04, u * 0.006, u * 0.04);
  ctx.fillRect(cx - u * 0.012, foot - u * 0.004, u * 0.024, u * 0.004);
  ctx.fillStyle = tone.sign;
  ctx.beginPath();
  oval(ctx, cx, foot - u * 0.04, u * 0.03, u * 0.007);
  ctx.fill();
  ctx.fillStyle = tone.stone;
  ctx.fillRect(cx - u * 0.003, foot - u * 0.052, u * 0.006, u * 0.012);
  ctx.fillStyle = tone.rose;
  ctx.beginPath();
  circle(ctx, cx, foot - u * 0.056, u * 0.004);
  ctx.fill();
  // Who holds the card, and where it is: from the giver's side across to the other.
  const giverX = p.giver ? herX : himX;
  const takerX = p.giver ? himX : herX;
  const dir = p.giver ? 1 : -1;
  const sheGives = p.giver === 1;
  const giverOut = p.card ? 1 - ease((p.across - 0.6) / 0.4) : p.hands;
  const takerOut = p.take * 0.8 + p.hands * (1 - p.take * 0.8);
  sitter(ctx, tone, herX, foot, u, 1, true, sheGives ? giverOut : takerOut, sheGives ? p.reach : 0, p.tilt);
  sitter(ctx, tone, himX, foot, u, -1, false, sheGives ? takerOut : giverOut, sheGives ? 0 : p.reach, 0);
  if (p.card) {
    const from = giverX + dir * u * 0.022;
    const to = takerX - dir * u * 0.024;
    const x = from + (to - from) * p.across;
    card(ctx, tone, x, foot - u * 0.042 - p.lift * u * 0.012, u, p.lift);
  }
  // Hearts floating up from the reader, fading as they rise.
  const rx = takerX - dir * u * 0.004;
  const a0 = ctx.globalAlpha;
  for (const h of [p.heart0, p.heart1]) {
    if (h <= 0 || h >= 1) continue;
    ctx.globalAlpha = a0 * (1 - h * h);
    ctx.fillStyle = tone.heart;
    ctx.beginPath();
    heartPath(ctx, rx + Math.sin(h * 9) * u * 0.006, foot - u * 0.085 - h * u * 0.06, u * (0.012 + h * 0.008));
    ctx.fill();
    ctx.globalAlpha = a0;
  }
}

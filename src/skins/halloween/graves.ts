import { easeOut, hash, oval, type Ctx } from "../../base/draw";
import { boneFeet, boneHand, boneSkull, clods } from "./bones";
import { DIRT } from "./common";
import { GRAVE_RY, hole, holeFor, holeLip, mound, tuft } from "./dirt";

// Open graves where skeleton parts pop up out of the soil at random.
//
// The three graves always hold three different parts (a hand, a skull, a pair of feet). Every
// few seconds, at hashed and jittered moments, two graves picked at random swap parts; each
// grave comes up once between the swaps it takes part in, on its own hashed timing. So the
// part a grave shows is re-picked every time it comes up and never repeats twice running, no
// two graves ever show the same part at once, the timings are staggered and keep varying, and
// there is no moment when every grave changes together. Everything is hashed from the swap
// number and the grave; no Math.random().

const HAND = 0;
const SKULL = 1;
const FEET = 2;

/** Average seconds between swaps; each one lands up to 20% early or late. */
const SWAP = 2.9;
const JITTER = 0.2;
/** Shifts the schedule so the opening seconds already have parts up. */
const START = 24.5;
const RISE = 0.45;
const SINK = 0.6;
const BURST = 0.6;
/** Every grave stays down this long either side of a swap it takes part in. */
const MARGIN = 0.15;

/** When swap k happens: a jittered grid, so swaps keep their order. */
function swapTime(k: number): number {
  return (k + (hash(k * 7 + 3) - 0.5) * 2 * JITTER) * SWAP;
}

/** The pair of graves swap k exchanges: 0 = graves 0 and 1, 1 = graves 1 and 2, 2 = graves 0 and 2. */
function pairOf(k: number): number {
  return Math.floor(hash(k * 53 + 11) * 3) % 3;
}

function involves(k: number, g: number): boolean {
  const p = pairOf(k);
  return p === 0 ? g !== 2 : p === 1 ? g !== 0 : g !== 1;
}

/** Index of the last swap at or before time `t`. */
function swapAt(t: number): number {
  let k = Math.floor(t / SWAP);
  while (swapTime(k) > t) k--;
  while (swapTime(k + 1) <= t) k++;
  return k;
}

// Who holds which part after swap k. Each swap only depends on the one before, so this is
// memoized forward from the last answer (and rebuilt from zero if time runs backward). It is
// still a pure function of k: the same k always gives the same parts.
const HELD = [HAND, SKULL, FEET];
let heldK = -1;

function heldAfter(k: number): readonly number[] {
  if (k < heldK) {
    HELD[0] = HAND;
    HELD[1] = SKULL;
    HELD[2] = FEET;
    heldK = -1;
  }
  while (heldK < k) {
    heldK++;
    const p = pairOf(heldK);
    const a = p === 2 ? 0 : p;
    const b = p === 2 ? 2 : p + 1;
    const tmp = HELD[a]!;
    HELD[a] = HELD[b]!;
    HELD[b] = tmp;
  }
  return HELD;
}

function easeOutBack(x: number): number {
  const k = 1.9;
  const y = x - 1;
  return 1 + (k + 1) * y * y * y + k * y * y;
}

/** Scratch result of `graveState`, reused so nothing allocates per frame. */
const STATE = { part: HAND, up: 0, burst: 0, turn: 0 };

/** Which part grave `g` shows at time `t`, how far it is up (0..1, with a pop), and its burst. */
export function graveState(t: number, g: number): typeof STATE {
  const tt = t + START;
  // The swaps this grave took part in on either side of now: it comes up once in between.
  const now = swapAt(tt);
  let kp = now;
  while (kp >= 0 && !involves(kp, g)) kp--;
  let kn = now + 1;
  while (!involves(kn, g)) kn++;
  const from = swapTime(kp) + MARGIN;
  const room = swapTime(kn) - MARGIN - from - RISE - SINK;
  const hold = room * (0.35 + hash(kp * 71 + g * 613 + 3) * 0.4);
  const delay = (room - hold) * hash(kp * 131 + g * 977 + 7);
  const a = tt - from - delay;
  let up = 0;
  if (a > 0) {
    if (a < RISE) up = easeOutBack(a / RISE);
    else if (a < RISE + hold) up = 1;
    else if (a < RISE + hold + SINK) up = 1 - easeOut((a - RISE - hold) / SINK);
  }
  // No swap since kp touched this grave, so it still holds what it got then. Every grave asks
  // about the same latest swap, so the memo only ever steps forward.
  STATE.part = heldAfter(Math.max(0, now))[g]!;
  STATE.up = up;
  STATE.burst = a > 0 && a < BURST ? a / BURST : 0;
  STATE.turn = kp;
  return STATE;
}

/**
 * An open grave at (x, y): a mound with a dark hole in its top, and whatever is climbing out.
 * The part is clipped to the hole (the soil line) and the hole's front lip is inked over it,
 * so the only cut edge is hidden in the mound.
 */
export function grave(ctx: Ctx, t: number, x: number, y: number, rx: number, g: number, lw: number): void {
  const seed = 31 + g * 5;
  mound(ctx, x, y, rx, rx * GRAVE_RY, seed, lw);
  tuft(x + rx * 0.84, y + rx * 0.02, rx * 0.34, seed * 3);
  const h = holeFor(x, y, rx);
  const { x: hx, y: hy, rx: hrx, ry: hry } = h;
  hole(ctx, hx, hy, hrx, hry, lw);

  const st = graveState(t, g);
  if (st.up > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx - rx * 3, hy - rx * 4, rx * 6, rx * 4);
    oval(ctx, hx, hy, hrx - lw * 0.4, hry - lw * 0.4);
    ctx.clip();
    ctx.translate(hx, hy);
    const tt = t + g * 1.7;
    if (st.part === HAND) boneHand(ctx, rx * 1.3, st.up, tt, (st.turn + g) % 2 ? 1 : -1, lw);
    else if (st.part === SKULL) boneSkull(ctx, rx * 0.84, st.up, tt, lw);
    else if (st.part === FEET) boneFeet(ctx, rx * 1.1, st.up, tt, lw);
    ctx.restore();
  }
  holeLip(ctx, hx, hy, hrx, hry, lw);

  if (st.burst > 0) {
    ctx.save();
    ctx.translate(hx, hy);
    clods(ctx, rx, st.burst, st.turn * 3 + g, DIRT, lw);
    ctx.restore();
  }
}

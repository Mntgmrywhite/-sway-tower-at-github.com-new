import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { DECO_FACE, GOLD, GOLD_DEEP, GOLD_LIGHT, IVORY, LACQUER } from "./colors";
import { cycleTime, formatLeft, readingAt, YEAR, type Reading } from "./countdown";

// The Times Tower's screen: our own Art Deco news screen above the clock, wider than the
// shaft under it like a billboard on gilded brackets, in a gold frame with a row of bulbs along
// its top and bottom. It is always lit and always counting (countdown.ts keeps the time): the
// time left to midnight ("0:52", a tick a second, the bulbs ticking with it), then the last ten
// seconds big ("10" … "1", each one popping in, the bulbs chasing), then MIDNIGHT with every
// bulb flashing, then HAPPY and the coming year until the cycle restarts. Big enough to read
// on a phone (digits over 18 px tall on a 390 px screen), and right of the tower column, so
// nothing it does moves behind the bars.

/** The screen in u: x from the Times Tower's center, y up from the horizon. */
export const SIGN = {
  /** Half-width and bottom and top of the frame. */
  hw: 0.0875,
  y0: 0.362,
  y1: 0.482,
  /** The gold frame round it. */
  rim: 0.0035,
  /** The bulb rows along the top and bottom, inside the frame. */
  band: 0.0105,
  /** Lacquer between the frame's sides and the glass. */
  gap: 0.0015,
};
const BULB_R = 0.0034;
const BULB_STEP = 0.0125;

/** The glass, in u from the tower's center and the horizon. */
const GLASS = {
  hw: SIGN.hw - SIGN.rim - SIGN.gap,
  y0: SIGN.y0 + SIGN.rim + SIGN.band,
  y1: SIGN.y1 - SIGN.rim - SIGN.band,
};

/** Text sizes as cap height over glass height, and how much of the glass's width text may take. */
const LEFT_CAP = 0.56;
const COUNT_CAP = 0.82;
const WORD_CAP = 0.38;
const HAPPY_CAP = 0.3;
const YEAR_CAP = 0.5;
const FIT = 0.94;
/** Cap height of the Deco face (and its fallbacks), as a fraction of the font size. */
const CAP = 0.7;
/** Each big count pops in this much bigger and settles over POP seconds. */
const POP = 0.2;
const POP_SCALE = 0.2;
/** Bulb rates: the count's chase and midnight's flashing (per second), the greeting's sparkle. */
const CHASE = 8;
const FLASHES = 4;
const SPARKLE = 3;

const GLASS_FILL = "#0e1126";
const RULE = GOLD_DEEP;
const DIGITS = GOLD_LIGHT;
const BULB_OFF = GOLD_DEEP;
const BULB_ON = "#fffbe8";

/** Bulb centers (u from the tower's center): the top row left to right, then the bottom row
 *  right to left, so a chase runs round the screen. */
const BULBS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  const x0 = -SIGN.hw + SIGN.rim;
  const x1 = SIGN.hw - SIGN.rim;
  const n = Math.round((x1 - x0) / BULB_STEP);
  const step = (x1 - x0) / n;
  const yt = SIGN.y1 - SIGN.rim - SIGN.band / 2;
  const yb = SIGN.y0 + SIGN.rim + SIGN.band / 2;
  for (let i = 0; i < n; i++) out.push([x0 + step * (i + 0.5), yt]);
  for (let i = n - 1; i >= 0; i--) out.push([x0 + step * (i + 0.5), yb]);
  return out;
})();

const GREETING = "HAPPY";
const YEAR_TEXT = String(YEAR);

function setFont(ctx: Ctx, px: number): number {
  const size = Math.max(6, Math.round(px));
  ctx.font = `${size}px ${DECO_FACE}`;
  return size;
}

/** One line of text centered at (x, y) (y: the middle of its capitals), `cap` px tall and no
 *  wider than `maxW` (squeezed to fit). */
function line(ctx: Ctx, text: string, x: number, y: number, cap: number, maxW: number): void {
  const px = setFont(ctx, cap / CAP);
  ctx.fillText(text, x, y + (px * CAP) / 2, maxW);
}

function lit(r: Reading, p: number, i: number): boolean {
  switch (r.kind) {
    case "left":
      // Every other bulb, swapping with each tick.
      return (i + r.secs) % 2 === 0;
    case "count":
      return (((i - Math.floor(p * CHASE)) % 3) + 3) % 3 === 0;
    case "midnight":
      return (i + Math.floor(p * FLASHES)) % 2 === 0;
    case "year":
      return (((i - Math.floor(p * SPARKLE)) % 4) + 4) % 4 === 0;
  }
}

/** Draw the screen on the Times Tower, whose center is `x` u right of the screen center. */
export function marquee(ctx: Ctx, s: Scene, x: number): void {
  const u = s.u;
  const tx = s.cssW / 2 + x * u;
  const hy = s.horizonY + 1;
  const top = hy - SIGN.y1 * u;
  const h = (SIGN.y1 - SIGN.y0) * u;
  if (top > s.cssH || top + h < 0) return;
  const left = tx - SIGN.hw * u;
  const w = SIGN.hw * 2 * u;
  const p = cycleTime(s);
  const r = readingAt(p);

  // Frame, the bulbs' lacquer, the glass and its gilt rule
  ctx.fillStyle = r.kind === "midnight" ? GOLD_LIGHT : GOLD;
  ctx.fillRect(left, top, w, h);
  const rim = SIGN.rim * u;
  ctx.fillStyle = LACQUER;
  ctx.fillRect(left + rim, top + rim, w - 2 * rim, h - 2 * rim);
  const gx = tx - GLASS.hw * u;
  const gw = GLASS.hw * 2 * u;
  const gy = hy - GLASS.y1 * u;
  const gh = (GLASS.y1 - GLASS.y0) * u;
  const rule = Math.max(1, u * 0.0022);
  ctx.fillStyle = RULE;
  ctx.fillRect(gx - rule, gy - rule, gw + 2 * rule, gh + 2 * rule);
  ctx.fillStyle = GLASS_FILL;
  ctx.fillRect(gx, gy, gw, gh);

  const cx = tx;
  const cy = gy + gh / 2;
  const maxW = gw * FIT;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (r.kind === "left") {
    // A tick brightens the digits for a moment.
    ctx.fillStyle = r.into < 0.12 ? IVORY : DIGITS;
    line(ctx, formatLeft(r.secs), cx, cy, gh * LEFT_CAP, maxW);
  } else if (r.kind === "count") {
    const settle = Math.max(0, 1 - r.into / POP);
    const cap = gh * COUNT_CAP * (1 + POP_SCALE * settle * settle);
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();
    ctx.fillStyle = DIGITS;
    line(ctx, String(r.n), cx, cy, cap, gw * 0.98);
    ctx.restore();
  } else if (r.kind === "midnight") {
    ctx.fillStyle = Math.floor(p * FLASHES) % 2 ? GOLD_LIGHT : IVORY;
    line(ctx, "MIDNIGHT", cx, cy, gh * WORD_CAP, maxW);
  } else {
    const happy = gh * HAPPY_CAP;
    const year = gh * YEAR_CAP;
    const gap = (gh - happy - year) / 3;
    ctx.fillStyle = IVORY;
    line(ctx, GREETING, cx, gy + gap + happy / 2, happy, maxW);
    ctx.fillStyle = DIGITS;
    line(ctx, YEAR_TEXT, cx, gy + gh - gap - year / 2, year, maxW);
  }

  // Bulbs, lit ones last: one fill each
  const br = Math.max(1, BULB_R * u);
  for (const on of [false, true]) {
    ctx.beginPath();
    for (let i = 0; i < BULBS.length; i++) {
      if (lit(r, p, i) !== on) continue;
      const [bx, by] = BULBS[i]!;
      circle(ctx, tx + bx * u, hy - by * u, br);
    }
    ctx.fillStyle = on ? BULB_ON : BULB_OFF;
    ctx.fill();
  }
}

import manifest from "../../audio/music/manifest.json";
import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { DECO_FACE, GOLD, GOLD_DEEP, GOLD_LIGHT, IVORY } from "./colors";

// The Times Tower's marquee: our own Deco news screen hung on the tower above its clock, wider
// than the tier behind it like a billboard, gold-rimmed with a ring of bulbs. It keeps time with
// the song (Scene.songTime): dark between countdowns, then "10" … "1" with the crowd counting
// down, then HAPPY NEW YEAR scrolling past at midnight, its bulbs chasing on the band's eighths
// and flashing at midnight. The cues come from the song's manifest entry (scripts/music/songs/
// newyear.ts writes them), so a re-arranged song moves the countdown with it. Silent (no music,
// muted, hidden): the screen stays dark. It sits right of the tower column, so nothing it does
// moves behind the bars.

const CUES = (manifest as Record<string, { cues?: { countdownStart?: number; midnight?: number } }>).newyear?.cues;
/** Seconds into the song as written when the screen shows "10", and when it is midnight. */
export const COUNT_FROM = CUES?.countdownStart ?? NaN;
export const MIDNIGHT = CUES?.midnight ?? NaN;
/** Whole seconds counted down: "10" through "1". */
const COUNT = Math.round(MIDNIGHT - COUNT_FROM);
/** How long HAPPY NEW YEAR scrolls after midnight, and how long the clock face flashes. */
const SHOW = 8;
const CLOCK_FLASH = 4;
/** Each digit pops in this big and settles over POP seconds. */
const POP = 0.2;
const POP_SCALE = 0.3;
/** The screen flashes gold as each digit lands, fading over this long. */
const BLINK = 0.25;
const BLINK_ALPHA = 0.45;
/** Scroll speed (u per second) and the gap between repeats (in screen widths). */
const SCROLL = 0.1;
const SCROLL_GAP = 0.5;
const GREETING = "HAPPY NEW YEAR";
/** Bulb chase steps per second (the band's eighths at 240 bpm) and midnight flashes per second. */
const CHASE = 8;
const FLASHES = 4;

/** The sign in u: x from the Times Tower's center, y up from the horizon. */
export const SIGN = {
  hw: 0.062,
  y0: 0.346,
  y1: 0.404,
  /** Gold rim around the screen. */
  rim: 0.0045,
};
const BULB_R = 0.003;
const BULB_STEP = 0.0125;

const SCREEN_OFF = "#060a1a";
const SCREEN_ON = "#160f22";
const FAN = "#3a2a14";
const BULB_OFF = GOLD_DEEP;
const BULB_ON = "#fffbe8";

export type MarqueeState = { kind: "dark" } | { kind: "count"; n: number; into: number } | { kind: "midnight"; into: number };

const DARK: MarqueeState = { kind: "dark" };

/** What the screen shows this many seconds into the song (NaN: no music, so dark). */
export function marqueeAt(songTime: number): MarqueeState {
  if (!(songTime >= COUNT_FROM)) return DARK;
  const t = songTime - COUNT_FROM;
  if (t < COUNT) return { kind: "count", n: COUNT - Math.floor(t), into: t - Math.floor(t) };
  const m = songTime - MIDNIGHT;
  return m < SHOW ? { kind: "midnight", into: m } : DARK;
}

/** True for the first seconds after the song's midnight: the clock face flashes with the sign. */
export function songMidnight(s: Scene): boolean {
  const m = (s.songTime ?? NaN) - MIDNIGHT;
  return m >= 0 && m < CLOCK_FLASH;
}

/** Bulb centers (u, from the tower's center) clockwise round the rim from the top-left corner. */
const BULBS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  const x0 = -SIGN.hw + SIGN.rim / 2;
  const x1 = SIGN.hw - SIGN.rim / 2;
  const yb = SIGN.y0 + SIGN.rim / 2;
  const yt = SIGN.y1 - SIGN.rim / 2;
  const across = Math.round((x1 - x0) / BULB_STEP);
  const down = Math.max(1, Math.round((yt - yb) / BULB_STEP));
  for (let i = 0; i < across; i++) out.push([x0 + ((x1 - x0) * i) / across, yt]);
  for (let i = 0; i < down; i++) out.push([x1, yt - ((yt - yb) * i) / down]);
  for (let i = 0; i < across; i++) out.push([x1 - ((x1 - x0) * i) / across, yb]);
  for (let i = 0; i < down; i++) out.push([x0, yb + ((yt - yb) * i) / down]);
  return out;
})();

let fontPx = -1;
let font = "";
let greetingW = 0;

function setFont(ctx: Ctx, px: number): void {
  const size = Math.max(6, Math.round(px));
  if (size !== fontPx) {
    fontPx = size;
    font = `${size}px ${DECO_FACE}`;
    greetingW = -1;
  }
  ctx.font = font;
}

/** Draw the marquee on the Times Tower, centered `x` u right of the screen center. */
export function marquee(ctx: Ctx, s: Scene, x: number): void {
  const u = s.u;
  const tx = s.cssW / 2 + x * u;
  const hy = s.horizonY + 1;
  const left = tx - SIGN.hw * u;
  const w = SIGN.hw * 2 * u;
  const top = hy - SIGN.y1 * u;
  const h = (SIGN.y1 - SIGN.y0) * u;
  if (top > s.cssH || top + h < 0) return;
  const r = SIGN.rim * u;
  const sx = left + r;
  const sy = top + r;
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const songTime = s.songTime ?? NaN;
  const show = marqueeAt(songTime);

  // Rim and screen
  ctx.fillStyle = show.kind === "midnight" ? GOLD_LIGHT : GOLD;
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = show.kind === "dark" ? SCREEN_OFF : SCREEN_ON;
  ctx.fillRect(sx, sy, sw, sh);

  if (show.kind === "dark") {
    // Switched off: a faint Deco fan rising from the bottom of the glass
    ctx.beginPath();
    const fx = sx + sw / 2;
    const fy = sy + sh;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.2 + 0.15 * i);
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const spread = 0.05;
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - Math.cos(a - spread) * sh * 0.85, fy - Math.sin(a - spread) * sh * 0.85);
      ctx.lineTo(fx - c * sh * 0.95, fy - sn * sh * 0.95);
      ctx.lineTo(fx - Math.cos(a + spread) * sh * 0.85, fy - Math.sin(a + spread) * sh * 0.85);
      ctx.closePath();
    }
    ctx.fillStyle = FAN;
    ctx.fill();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    if (show.kind === "count") {
      if (show.into < BLINK) {
        ctx.globalAlpha = BLINK_ALPHA * (1 - show.into / BLINK);
        ctx.fillStyle = GOLD;
        ctx.fillRect(sx, sy, sw, sh);
        ctx.globalAlpha = 1;
      }
      const settle = Math.max(0, 1 - show.into / POP);
      const px = sh * 0.9 * (1 + POP_SCALE * settle * settle);
      setFont(ctx, px);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fillText(String(show.n), sx + sw / 2, sy + sh / 2 + fontPx * 0.36, sw * 0.92);
    } else {
      setFont(ctx, sh * 0.62);
      if (greetingW < 0) greetingW = ctx.measureText(GREETING).width;
      const period = greetingW + sw * SCROLL_GAP;
      const shift = (show.into * SCROLL * u) % period;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = Math.floor(songTime * FLASHES) % 2 ? GOLD_LIGHT : IVORY;
      const y = sy + sh / 2 + fontPx * 0.36;
      // Enters from the right edge; the copy before it may still be leaving on the left
      const gx = sx + sw - shift;
      ctx.fillText(GREETING, gx, y);
      if (gx - period + greetingW > sx) ctx.fillText(GREETING, gx - period, y);
    }
    ctx.restore();
  }

  // Bulbs: dim when the screen is dark, chasing round the rim on the count, flashing at midnight
  const step = Math.floor(songTime * (show.kind === "midnight" ? FLASHES : CHASE));
  const br = Math.max(0.8, BULB_R * u);
  for (const lit of [false, true]) {
    ctx.beginPath();
    for (let i = 0; i < BULBS.length; i++) {
      const on = show.kind === "count" ? (((i - step) % 3) + 3) % 3 === 0 : show.kind === "midnight" && (i + step) % 2 === 0;
      if (on !== lit) continue;
      const [bx, by] = BULBS[i]!;
      circle(ctx, tx + bx * u, hy - by * u, br);
    }
    ctx.fillStyle = lit ? BULB_ON : BULB_OFF;
    ctx.fill();
  }
}

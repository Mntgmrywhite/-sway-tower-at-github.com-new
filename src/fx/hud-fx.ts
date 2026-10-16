import { DANGER_FRAC, WARN_FRAC } from "../config";
import { drift, type GameState } from "../game";
import { alpha, circle, mix, roundRectPath } from "../base/draw";
import type { Tones } from "../base/style";
import { counterweightHelps, NUDGE_TIME, WIND_BANNER_TIME, type Fx } from "./fx";
import {
  arrowTextWidth,
  chevronPath,
  clamp01,
  easeBack,
  fitFont,
  heat,
  leanUi,
  textWithArrow,
  type Frame,
} from "./frame";
import { CARD_FADE, TOPPLE_FLASH, TOPPLE_SLAM } from "./topple";

// Telegraphing drawn in screen space, over the scene: the tilt gauge under the lives, the
// tier tag, hints and banners near the bottom, the danger vignette, and the topple overlay.

/** The gauge flashes green this long after SAVED!, seconds. */
const SAVED_FLASH = 0.7;
/** Gauge zones as fractions of the rail, and the ticks between them. */
const ZONES: readonly [number, number, keyof Tones][] = [
  [-1.2, -DANGER_FRAC, "danger"],
  [-DANGER_FRAC, -WARN_FRAC, "warn"],
  [-WARN_FRAC, WARN_FRAC, "ok"],
  [WARN_FRAC, DANGER_FRAC, "warn"],
  [DANGER_FRAC, 1.2, "danger"],
];
const TICKS: readonly number[] = [-DANGER_FRAC, -WARN_FRAC, WARN_FRAC, DANGER_FRAC];
/** The needle stops this far past the rail (in rails), so it shows "over the line". */
const NEEDLE_MAX = 1.12;

/**
 * Backing panel so banner and hint copy reads over the busy tower: a deep shade of the skin's
 * UI color (dark enough that red, amber and white copy all stand out), outlined in the style.
 */
function panel(f: Frame, cy0: number, cy1: number, w: number): void {
  const { ctx, kit, u } = f;
  const pad = u * 0.03;
  const pw = Math.min(f.cssW - 16, w + pad * 3);
  const x = (f.cssW - pw) / 2;
  const y = cy0 - pad;
  const h = cy1 - cy0 + pad * 2;
  const r = u * 0.035;
  const ui = f.skin.hud.ui;
  roundRectPath(ctx, x, y, pw, h, r);
  ctx.fillStyle = alpha(mix(ui, "#000000", 0.6), 0.95);
  ctx.fill();
  roundRectPath(ctx, x + u * 0.008, y + u * 0.008, pw - u * 0.016, h - u * 0.016, r * 0.75);
  ctx.strokeStyle = alpha(mix(ui, "#ffffff", 0.35), 0.6);
  ctx.lineWidth = Math.max(1.5, u * 0.005);
  ctx.stroke();
  roundRectPath(ctx, x, y, pw, h, r);
  kit.plate(ctx, "rgba(0, 0, 0, 0)", ui, Math.max(2.5, u * 0.01));
}

/** Widest copy that still fits inside a panel. */
const panelText = (f: Frame) => f.cssW - 16 - f.u * 0.1;

export function gaugeVisible(state: GameState): boolean {
  return leanUi() && state.phase === "playing" && state.score >= 1;
}

/** The tier tag under the gauge is showing (or fading out). */
export function tagVisible(fx: Fx): boolean {
  const tag = fx.tier === "steady" ? fx.lastTag : fx.tier;
  return fx.amber >= 0.03 && tag !== "lastChance" && fx.tier !== "lastChance";
}

/**
 * The tilt gauge: green / amber / red zones out to the rail at ±1, a needle at tilt/limit,
 * a ghost tick at the forecast on the topple side, and an armed "!" badge past its end.
 */
export function drawGauge(f: Frame, cy: number): void {
  const { ctx, kit, u, st, fx } = f;
  const t = kit.tones;
  const gw = Math.min(u * 0.58, f.cssW - u * 0.32);
  const gh = u * 0.042;
  const cx = f.cssW / 2;
  const x0 = cx - gw / 2;
  const y0 = cy - gh / 2;
  const r = gh / 2;
  const X = (v: number) => cx + Math.max(-NEEDLE_MAX, Math.min(NEEDLE_MAX, v)) * (gw / 2 - r * 0.3);
  const line = Math.max(1.5, u * 0.006);
  const hot = heat(f);
  ctx.save();

  // Amber (then red, pulsing) halo as the tower gets wobbly.
  if (fx.amber > 0.02) {
    const pulse = fx.red > 0.5 ? 0.75 + 0.25 * Math.sin(f.t * 9) : 1;
    roundRectPath(ctx, x0, y0, gw, gh, r);
    ctx.globalAlpha = fx.amber;
    kit.halo(ctx, hot, gh * 0.7 * pulse);
    ctx.globalAlpha = 1;
  }

  roundRectPath(ctx, x0, y0, gw, gh, r);
  ctx.fillStyle = kit.well;
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, x0, y0, gw, gh, r);
  ctx.clip();
  const pad = gh * 0.16;
  for (const [a, b, c] of ZONES) {
    ctx.fillStyle = t[c];
    ctx.fillRect(X(a), y0 + pad, X(b) - X(a), gh - pad * 2);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(x0, y0 + pad, gw, (gh - pad * 2) * 0.32);
  ctx.fillStyle = alpha(kit.well, 0.55);
  for (const v of TICKS) ctx.fillRect(X(v) - 0.75, y0, 1.5, gh);
  if (fx.savedAge < SAVED_FLASH) {
    ctx.fillStyle = alpha(t.ok, 0.9 * (1 - fx.savedAge / SAVED_FLASH));
    ctx.fillRect(x0, y0, gw, gh);
  }
  ctx.restore();
  roundRectPath(ctx, x0, y0, gw, gh, r);
  kit.plate(ctx, "rgba(0, 0, 0, 0)", fx.amber > 0.3 ? hot : f.skin.hud.ui, line);

  // Rails at both ends.
  for (const s of [-1, 1]) {
    const rx = s < 0 ? x0 + gh * 0.1 : x0 + gw - gh * 0.1;
    roundRectPath(ctx, rx - gh * 0.17, cy - gh * 0.85, gh * 0.34, gh * 1.7, gh * 0.12);
    kit.plate(ctx, t.danger, t.danger, line * 0.8);
  }

  // Ghost: where the forecast says the top can reach, on the side it can topple toward
  // (a gust's side on a balanced tower). Jumps at once on a drop.
  const gs = fx.side;
  if (gs !== 0 && st.forecastRatio > 0.02) {
    const gx = X(gs * st.forecastRatio);
    const ty = y0 + gh + gh * 0.12;
    ctx.beginPath();
    ctx.moveTo(gx, ty);
    ctx.lineTo(gx + gh * 0.36, ty + gh * 0.55);
    ctx.lineTo(gx - gh * 0.36, ty + gh * 0.55);
    ctx.closePath();
    kit.plate(ctx, st.forecastRatio >= WARN_FRAC ? hot : "#ffffff", "#ffffff", line * 0.8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillRect(gx - 1, y0 + pad, 2, gh - pad * 2);
  }

  // Needle at tilt / limit.
  const nx = X(st.tilt / st.limit);
  roundRectPath(ctx, nx - gh * 0.21, y0 - gh * 0.3, gh * 0.42, gh * 1.6, gh * 0.2);
  kit.plate(ctx, "#ffffff", "#ffffff", line);

  // Armed badge past the heavy end, clear of the needle's travel: flashes when the tower gets armed.
  if (f.state.armed) {
    const side = fx.side < 0 ? -1 : 1;
    const k = fx.armedAge / 0.7;
    const sc = k < 1 ? 1 + 0.7 * (1 - k) : 1 + 0.06 * Math.sin(f.t * 10);
    const flash = k < 1 && Math.floor(fx.armedAge * 12) % 2 === 1;
    const br = gh * 0.66 * sc;
    const want = side > 0 ? x0 + gw + gh * 2.3 : x0 - gh * 2.3;
    const bx = Math.max(br + 6, Math.min(f.cssW - br - 6, want));
    ctx.beginPath();
    circle(ctx, bx, cy, br);
    kit.plate(ctx, flash ? "#ffffff" : t.danger, t.danger, line);
    const size = Math.round(br * 1.5);
    ctx.font = `700 ${size}px ${kit.body}`;
    ctx.textAlign = "center";
    kit.text(ctx, "!", bx, cy + size * 0.36, flash ? t.danger : "#ffffff", Math.max(2, size * 0.14));
  }
  ctx.restore();
}

/** WOBBLY / DANGER / TIPPING! under the gauge, eased in and out. */
export function drawTag(f: Frame, y: number): void {
  const { ctx, kit, u, fx } = f;
  if (!tagVisible(fx)) return;
  const tag = fx.tier === "steady" ? fx.lastTag : fx.tier;
  const text = tag === "wobbly" ? "WOBBLY" : tag === "danger" ? "DANGER" : tag === "teeter" ? "TIPPING!" : "";
  if (!text) return;
  const color = tag === "wobbly" ? kit.tones.warn : kit.tones.danger;
  const size = Math.round(u * 0.044);
  ctx.save();
  ctx.globalAlpha = fx.amber;
  ctx.translate(f.cssW / 2, y);
  if (tag === "teeter") {
    const s = 1 + 0.12 * Math.abs(Math.sin(f.t * 9));
    ctx.scale(s, s);
  }
  ctx.font = `700 ${size}px ${kit.body}`;
  ctx.textAlign = "center";
  kit.text(ctx, text, 0, 0, color, Math.max(3, size * 0.2));
  ctx.restore();
}

/** Red wash on the screen edge the tower is tipping toward, in DANGER and up. */
export function drawVignette(f: Frame): void {
  const { ctx, fx } = f;
  if (fx.red < 0.02 || f.state.phase !== "playing" || fx.side === 0) return;
  const side = fx.side;
  const pulse = fx.tier === "teeter" ? 0.8 + 0.2 * Math.sin(f.t * 12) : 0.78 + 0.22 * Math.cos(f.state.swayAngle * 2);
  const w = f.cssW * 0.26;
  const edge = side > 0 ? f.cssW : 0;
  const g = ctx.createLinearGradient(edge, 0, edge - side * w, 0);
  g.addColorStop(0, alpha(f.kit.tones.danger, 0.55 * fx.red * pulse));
  g.addColorStop(1, alpha(f.kit.tones.danger, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(side > 0 ? f.cssW - w : 0, 0, w, f.cssH);
  ctx.restore();
}

export interface Hint {
  head: string;
  tone: "calm" | "warn" | "danger";
  /** May hold `{arrow}`, drawn pointing `dir`. */
  body: string;
  /** Optional smaller third line. */
  note?: string;
  dir: -1 | 1;
}

/**
 * What the hint panel says, if anything: how to get out of WOBBLY or TEETER, what ARMED means,
 * or what STEADY means. The arrow points away from the drift (the light side, where a
 * counterweight goes); when even the smallest slice there would overshoot, only a PERFECT is safe.
 */
export function hintFor(fx: Fx, state: GameState): Hint | null {
  if (state.phase !== "playing" || state.score < 1) return null;
  const d = drift(state);
  const dir: -1 | 1 = d > 0 ? -1 : 1;
  const counter = counterweightHelps(state);
  if (fx.nudge) return { head: "STEADY!", tone: "calm", body: "Now balance it {arrow}", dir: fx.nudge.dir };
  if (fx.tier === "teeter") {
    // The last moment a tap still saves it: a perfect disarms; a light-side slice buys LAST CHANCE.
    return {
      head: "TAP A PERFECT!",
      tone: state.armed ? "danger" : "warn",
      body: counter ? "or drop a little {arrow}" : "nothing else is safe",
      dir,
    };
  }
  if (fx.tier !== "wobbly" && fx.tier !== "danger") return null;
  if (state.armed) {
    return { head: "ARMED!", tone: "danger", body: "a PERFECT is always safe", note: "it falls if it reaches the red line", dir };
  }
  if (!counter) return { head: "SWINGING", tone: "warn", body: "only a PERFECT is safe", dir };
  return { head: "BALANCE IT", tone: "warn", body: "land a PERFECT, or drop a little {arrow}", dir };
}

/** The hint panel near the bottom (see hintFor). */
export function drawHints(f: Frame): void {
  const { ctx, kit, u, fx } = f;
  const hint = hintFor(fx, f.state);
  if (!hint) return;
  const a = fx.nudge ? clamp01((NUDGE_TIME - fx.nudge.age) / 0.4) * clamp01(fx.nudge.age / 0.15) : fx.amber;
  if (a < 0.03) return;
  const maxW = panelText(f);
  const y1 = f.cssH * 0.855;
  const y2 = y1 + u * 0.062;
  const y3 = y2 + u * 0.05;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  const headFont = `400 {px}px ${f.skin.hud.display}`;
  const hs = fitFont(ctx, hint.head, headFont, u * 0.068, maxW);
  const hw = ctx.measureText(hint.head).width;
  const bodyFont = `700 {px}px ${kit.body}`;
  let bs = Math.round(u * 0.043);
  ctx.font = bodyFont.replace("{px}", String(bs));
  const bw0 = arrowTextWidth(ctx, hint.body, bs);
  if (bw0 > maxW) bs = Math.floor((bs * maxW) / bw0);
  ctx.font = bodyFont.replace("{px}", String(bs));
  const bw = arrowTextWidth(ctx, hint.body, bs);
  const ns = hint.note ? fitFont(ctx, hint.note, `600 {px}px ${kit.body}`, u * 0.034, maxW) : 0;
  const nw = hint.note ? ctx.measureText(hint.note).width : 0;
  const bottom = hint.note ? y3 + ns * 0.3 : y2 + bs * 0.3;
  panel(f, y1 - hs * 0.9, bottom, Math.max(hw, bw, nw));
  ctx.font = headFont.replace("{px}", String(hs));
  kit.text(ctx, hint.head, f.cssW / 2, y1, kit.tones[hint.tone], Math.max(3, hs * 0.14));
  ctx.font = bodyFont.replace("{px}", String(bs));
  if (hint.body.includes("{arrow}")) {
    textWithArrow(f, hint.body, hint.dir, f.cssW / 2, y2, "#ffffff", kit.tones.ok, Math.max(3, bs * 0.2), bs);
  } else {
    kit.text(ctx, hint.body, f.cssW / 2, y2, "#ffffff", Math.max(3, bs * 0.2));
  }
  if (hint.note) {
    ctx.font = `600 ${ns}px ${kit.body}`;
    kit.text(ctx, hint.note, f.cssW / 2, y3, mix(kit.tones.danger, "#ffffff", 0.45), Math.max(3, ns * 0.2));
  }
  ctx.restore();
}

/** WIND ZONE on entering a windy band; LAST CHANCE with its countdown copy. */
export function drawBanners(f: Frame): void {
  const { ctx, kit, u, fx, state } = f;
  if (state.phase !== "playing") return;
  ctx.save();
  ctx.textAlign = "center";
  if (fx.tier === "lastChance" && fx.lastChance) {
    // Pops in when LAST CHANCE first shows; a dip back to TEETER doesn't replay it.
    const since = fx.lastChance.age;
    const sc = easeBack(since / 0.25);
    const flash = Math.floor(f.t * 5) % 2 === 0;
    const y = f.cssH * 0.7;
    const maxW = panelText(f);
    const title = "LAST CHANCE";
    const titleFont = `400 {px}px ${f.skin.hud.display}`;
    const size = fitFont(ctx, title, titleFont, u * 0.11, Math.min(f.cssW * 0.9, maxW));
    const tw = ctx.measureText(title).width;
    const counter = counterweightHelps(state);
    const d = drift(state);
    const light: -1 | 1 = d > 0 ? -1 : d < 0 ? 1 : fx.side > 0 ? -1 : 1;
    const tap = !counter ? "TAP!" : light < 0 ? "{arrow} TAP!" : "TAP! {arrow}";
    const ts = Math.round(u * 0.085);
    const tapFont = `400 ${ts}px ${f.skin.hud.display}`;
    ctx.font = tapFont;
    const tapW = arrowTextWidth(ctx, tap, ts);
    const sub = counter ? "a PERFECT or a counterweight saves it" : "a PERFECT saves it";
    const bs = fitFont(ctx, sub, `700 {px}px ${kit.body}`, u * 0.042, maxW);
    const subW = ctx.measureText(sub).width;
    ctx.save();
    ctx.globalAlpha = clamp01(since / 0.15);
    panel(f, y - size * 0.95, y + u * 0.18, Math.max(tw, tapW, subW));
    ctx.restore();
    ctx.save();
    ctx.translate(f.cssW / 2, y);
    ctx.scale(sc, sc);
    ctx.font = titleFont.replace("{px}", String(size));
    kit.text(ctx, title, 0, 0, flash ? kit.tones.danger : "#ffffff", Math.max(3, size * 0.13));
    ctx.restore();
    ctx.font = tapFont;
    if (counter) {
      textWithArrow(f, tap, light, f.cssW / 2, y + u * 0.1, "#ffffff", kit.tones.ok, Math.max(3, ts * 0.13), ts);
    } else {
      kit.text(ctx, tap, f.cssW / 2, y + u * 0.1, "#ffffff", Math.max(3, ts * 0.13));
    }
    ctx.font = `700 ${bs}px ${kit.body}`;
    kit.text(ctx, sub, f.cssW / 2, y + u * 0.165, "#ffffff", Math.max(3, bs * 0.2));
  } else if (fx.windAge < WIND_BANNER_TIME) {
    // No direction here: the next gust's comes from the run's seed when it starts, and its own
    // telegraph (GUST chevrons, streaks) shows it then.
    const k = fx.windAge / WIND_BANNER_TIME;
    ctx.globalAlpha = k > 0.75 ? clamp01((1 - k) / 0.25) : 1;
    const y = f.cssH * 0.74;
    const x = f.cssW / 2;
    const size = fitFont(ctx, "WIND ZONE", `400 {px}px ${f.skin.hud.display}`, u * 0.095, f.cssW * 0.7);
    const tw = ctx.measureText("WIND ZONE").width;
    ctx.save();
    ctx.translate(x, y);
    const sc = easeBack(fx.windAge / 0.3);
    ctx.scale(sc, sc);
    kit.text(ctx, "WIND ZONE", 0, 0, kit.tones.calm, Math.max(3, size * 0.13));
    // Chevrons on both sides, pointing outward: wind from either side.
    const cs = size * 0.6;
    for (const s of [-1, 1] as const) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        chevronPath(ctx, s * (tw / 2 + cs * (0.6 + i * 0.55)), -size * 0.35, cs, s);
        kit.beam(ctx, kit.tones.wind, Math.max(2.5, cs * 0.16));
      }
    }
    ctx.restore();
    const bs = Math.round(u * 0.04);
    ctx.font = `700 ${bs}px ${kit.body}`;
    kit.text(ctx, "gusts push the lean", x, y + u * 0.06, "#ffffff", Math.max(3, bs * 0.2));
  }
  ctx.restore();
}

/** Screen overlay for the topple: a white flash as it breaks, then TOPPLED! slams in. */
export function drawToppleOverlay(f: Frame, titleY: number, cardAt: number): void {
  const tf = f.fx.topple;
  if (!tf) return;
  const { ctx, u } = f;
  ctx.save();
  if (tf.age < TOPPLE_FLASH) {
    ctx.fillStyle = alpha("#ffffff", 0.6 * (1 - tf.age / TOPPLE_FLASH));
    ctx.fillRect(0, 0, f.cssW, f.cssH);
  }
  if (tf.age >= TOPPLE_SLAM) {
    const k = (tf.age - TOPPLE_SLAM) / 0.14;
    const sc = k < 1 ? 2.4 - 1.4 * k * k : 1;
    const fade = clamp01(1 - (tf.age - cardAt) / CARD_FADE);
    if (fade > 0) {
      ctx.globalAlpha = fade * clamp01(k * 2);
      ctx.textAlign = "center";
      const size = fitFont(ctx, "TOPPLED!", `400 {px}px ${f.skin.hud.display}`, u * 0.13, f.cssW * 0.86);
      // Scale about the word's middle; at scale 1 its baseline sits on the card title's.
      ctx.translate(f.cssW / 2, titleY - size * 0.35);
      ctx.scale(sc, sc);
      f.kit.text(ctx, "TOPPLED!", 0, size * 0.35, f.kit.tones.danger, Math.max(4, size * 0.14));
    }
  }
  ctx.restore();
}

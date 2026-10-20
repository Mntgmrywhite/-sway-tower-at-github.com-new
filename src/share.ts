// "Share your tower": the game-over card's Share button (src/title.ts) hands the final tower to the
// system share sheet as a picture and a line of text. The picture is a 1080×1920 card drawn
// offscreen by the renderer itself: the tower as it stood before it went over, with the HUD, and
// a footer band in the skin's own style and faces ("I stacked 24 / in Sway Tower / Drop · Sky
// Islands", each world under the name the store listing gives it). The text: "I stacked 24 bars
// in Sway Tower (Drop) — can you beat it?" plus the link once there is one. On iOS the app's plugin presents UIActivityViewController; on the web the
// Web Share API does, where it can share files; elsewhere the button is hidden. Pure apart from
// drawing: main.ts makes the canvas and does the sharing.

import { kitFor, type StyleKit } from "./base/style";
import { frameFor, TOP_ANCHOR } from "./camera";
import { BLOCK_HEIGHT } from "./config";
import type { GameState, Mode } from "./game";
import { GAME_NAME, newView, render, type View } from "./render";
import type { Skin } from "./skins/skin";

/** The card's size: a phone screen at 3x, portrait, as the stores and feeds like it. */
export const SHARE_W = 1080;
export const SHARE_H = 1920;

/**
 * Where the shared text points: the App Store page or the landing page, once there is one. Empty
 * until then, and then nothing is appended.
 */
export const SHARE_LINK = "";

/** What the player calls each mode (the ids stay "normal" and "hard"). */
export const MODE_NAMES: Readonly<Record<Mode, string>> = { normal: "Slide", hard: "Drop" };

/** "1 bar", "24 bars". */
export function bars(n: number): string {
  return `${n} ${n === 1 ? "bar" : "bars"}`;
}

/** The line that goes with the picture. */
export function shareText(score: number, mode: Mode, link: string = SHARE_LINK): string {
  const text = `I stacked ${bars(score)} in ${GAME_NAME} (${MODE_NAMES[mode]}) — can you beat it?`;
  return link ? `${text} ${link}` : text;
}

/** The footer band's lines: the headline, the name, and the mode with the skin. */
export interface ShareLines {
  headline: string;
  name: string;
  detail: string;
}

/**
 * The worlds the store listing names differently from the skin picker (the default is "Sky
 * Islands" there, the neon pair "Synthwave" and "Cyberpunk"); every other skin goes by its name.
 */
export const WORLD_NAMES: Readonly<Record<string, string>> = { classic: "Sky Islands", neon: "Synthwave", "neon-cyber": "Cyberpunk" };

/** The world a skin is, as a shared picture names it. */
export function worldName(skin: Pick<Skin, "id" | "name">): string {
  return WORLD_NAMES[skin.id] ?? skin.name;
}

export function shareLines(score: number, mode: Mode, skin: Pick<Skin, "id" | "name">): ShareLines {
  return { headline: `I stacked ${score}`, name: `in ${GAME_NAME}`, detail: `${MODE_NAMES[mode]} · ${worldName(skin)}` };
}

/** The file name the picture is shared under. */
export const SHARE_FILE = "sway-tower.png";

/** A PNG data URL's base64 payload (what the app's plugin takes). */
export function pngBase64(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/**
 * The picture as a file for the Web Share API, made without waiting (canvas.toBlob would): some
 * browsers only share inside the tap's own moment.
 */
export function pngFile(base64: string): File {
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return new File([bytes], SHARE_FILE, { type: "image/png" });
}

/** Where the slider is put for the card: far off it (world units), since it has nothing to do any more. */
export const SLIDER_AWAY = 1e6;

/**
 * The game as it stood at the end: the same tower, drawn as a run in progress (the HUD with the
 * score, no game-over card) and with the slider off the card.
 */
export function shareState(state: GameState): GameState {
  return { ...state, phase: "playing", fall: null, slider: { ...state.slider, x: SLIDER_AWAY } };
}

/**
 * On the card the tower's top sits this far down (a fraction of the height): just under the HUD,
 * in the room the slider's lane had, so the picture holds as much of the tower as it can.
 */
export const SHARE_TOP = 0.3;

/**
 * The view at the same moment, without the topple, the falling pieces or any flash, and framed for
 * the card: the tower's top at SHARE_TOP (a short tower stands on its ground, held low as in a run).
 */
export function shareView(view: View, state: GameState, w = SHARE_W, h = SHARE_H): View {
  const v = newView();
  const { scale } = frameFor(w, h, 0);
  v.cameraY = state.blocks.length * BLOCK_HEIGHT - ((TOP_ANCHOR - SHARE_TOP) * h) / scale;
  v.t = view.t;
  return v;
}

/**
 * The least room between two words of the band, in ems: a display face's own space can be too
 * narrow to read (Monoton's is a tenth of an em: "ISTACKED24").
 */
export const WORD_GAP = 0.24;

/** How wide `text` is with at least WORD_GAP between its words, in the current font. */
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, px: number): { widths: number[]; gap: number; total: number } {
  const widths = text.split(" ").map((word) => ctx.measureText(word).width);
  const gap = Math.max(ctx.measureText(" ").width, px * WORD_GAP);
  return { widths, gap, total: widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1) };
}

/**
 * Set `ctx.font` to `size` px of `template` (a CSS font shorthand with {px}), shrunk until `text`
 * (its words spaced as drawn) fits `maxWidth`.
 */
function fit(ctx: CanvasRenderingContext2D, text: string, template: string, size: number, maxWidth: number): number {
  let px = Math.round(size);
  ctx.font = template.replace("{px}", String(px));
  const w = spacedWidth(ctx, text, px).total;
  if (w > maxWidth) {
    px = Math.floor((px * maxWidth) / w);
    ctx.font = template.replace("{px}", String(px));
  }
  return px;
}

/** Draw `text` centered on `cx` in the style kit's HUD lettering, a word at a time with WORD_GAP at least between words. */
function spacedText(ctx: CanvasRenderingContext2D, kit: StyleKit, text: string, px: number, cx: number, y: number, fill: string, outline: number): void {
  const words = text.split(" ");
  const { widths, gap, total } = spacedWidth(ctx, text, px);
  ctx.save();
  ctx.textAlign = "left";
  let x = cx - total / 2;
  words.forEach((word, i) => {
    kit.text(ctx, word, x, y, fill, outline);
    x += widths[i]! + gap;
  });
  ctx.restore();
}

/** The footer band's box on the card, CSS px (u is the renderer's size unit at this size). */
export function shareBand(w: number, h: number, u: number): { x: number; y: number; w: number; h: number } {
  const margin = u * 0.05;
  const bw = Math.min(w - margin * 2, u * 0.9);
  const bh = u * 0.3;
  return { x: (w - bw) / 2, y: h - margin - bh, w: bw, h: bh };
}

/**
 * Draw the card: the final frame at `w`×`h` (the renderer, as a run in progress) and the footer
 * band over its foot. `best` and `songTime` as main.ts has them, so the HUD and the scenery match.
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  best: number,
  skin: Skin,
  songTime = NaN,
  w = SHARE_W,
  h = SHARE_H,
): void {
  const shot = shareState(state);
  render(ctx, w, h, shot, shareView(view, state, w, h), best, skin, songTime);
  const u = Math.min(w, h * 0.6);
  const kit = kitFor(skin);
  const lines = shareLines(state.score, state.mode, skin);
  const band = shareBand(w, h, u);
  ctx.save();
  kit.card(ctx, band.x, band.y, band.w, band.h, u);
  ctx.textAlign = "center";
  const cx = w / 2;
  const inner = band.w - u * 0.08;
  // "I stacked 24": the logo's face and color, as big as fits.
  let px = fit(ctx, lines.headline, `400 {px}px ${skin.hud.display}`, u * 0.1, inner);
  spacedText(ctx, kit, lines.headline, px, cx, band.y + band.h * 0.38, skin.hud.title, u * 0.012);
  // "in Sway Tower": the name in its own face, a size down.
  px = fit(ctx, lines.name, `400 {px}px ${skin.hud.display}`, u * 0.06, inner);
  spacedText(ctx, kit, lines.name, px, cx, band.y + band.h * 0.64, skin.hud.title, u * 0.009);
  // "Drop · Sky Islands": the HUD's body face in the accent.
  fit(ctx, lines.detail, `600 {px}px ${kit.body}`, u * 0.04, inner);
  kit.text(ctx, lines.detail, cx, band.y + band.h * 0.86, skin.hud.accent, u * 0.008);
  ctx.restore();
}

/** The bits of `navigator` the web share needs. */
export interface ShareNavigator {
  share?: (data: { files?: File[]; text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
}

/**
 * The page's permissions policy, where the browser shows it (Chromium's `document.featurePolicy`):
 * a frame that may not share (the Artifact page embeds the game in one) can still say it can.
 */
export interface PolicyDocument {
  featurePolicy?: { allowsFeature(feature: string): boolean };
}

/** Whether this browser can share a picture (the Web Share API, with files, and allowed in this frame). */
export function webShareAvailable(
  nav: ShareNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator,
  doc: PolicyDocument | undefined = typeof document === "undefined" ? undefined : (document as PolicyDocument),
): boolean {
  if (!nav || typeof nav.share !== "function" || typeof nav.canShare !== "function" || typeof File === "undefined") return false;
  try {
    if (doc?.featurePolicy && !doc.featurePolicy.allowsFeature("web-share")) return false;
    return nav.canShare({ files: [new File([new Uint8Array(1)], SHARE_FILE, { type: "image/png" })] });
  } catch {
    return false;
  }
}

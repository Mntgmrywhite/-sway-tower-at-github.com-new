import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { mix, outlinedText, roundRectPath } from "../../../src/base/draw";
import { kitFor } from "../../../src/base/style";
import { puffs } from "../../../src/base/world";
import type { Mode } from "../../../src/game";
import { GAME_NAME, render, titleLayout, type RenderOptions } from "../../../src/render";
import { classic } from "../../../src/skins/classic";
import { INK, PALETTE } from "../../../src/skins/classic/colors";
import type { Skin } from "../../../src/skins/skin";
import type { Device } from "./devices";
import type { Sim } from "./sim";

// Offline drawing for the store kit: a game moment at a device's CSS size, the title screen's DOM
// controls redrawn from src/title.css, the caption band every screenshot shares, and the grid of
// skins. Everything is drawn with the game's own helpers and colors (the Classic HUD: Luckiest Guy
// in the logo's yellow with an ink outline on the UI blue), so the set reads as the game.

/** The DOM context type the game's drawing helpers take. */
export type Ctx = CanvasRenderingContext2D;
/** napi-rs's context, as the game's helpers see it. */
export const dom = (ctx: SKRSContext2D): Ctx => ctx as unknown as Ctx;

/** A canvas of cssW x cssH CSS px at `scale` device px each, with its context scaled to CSS px. */
export function cssCanvas(cssW: number, cssH: number, scale: number): { canvas: Canvas; ctx: SKRSContext2D } {
  const canvas = createCanvas(Math.round(cssW * scale), Math.round(cssH * scale));
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/** A game moment: the sim's state and view, the skin it is drawn in, and what main.ts would pass. */
export interface Moment {
  sim: Sim;
  skin: Skin;
  best?: number;
  /** Seconds into the skin's song (for scenery keeping time with it); NaN when silent. */
  songTime?: number;
  opts?: RenderOptions;
}

/** Draw a moment at cssW x cssH into a context scaled to CSS px, exactly as render.ts draws a frame. */
export function drawMoment(ctx: SKRSContext2D, cssW: number, cssH: number, m: Moment): void {
  render(dom(ctx), cssW, cssH, m.sim.state, m.sim.view, m.best ?? 0, m.skin, m.songTime ?? NaN, m.opts ?? {});
}

// ---------------------------------------------------------------- the title's controls

/** Fill a rounded box the cartoon way (src/title.css): ink drop shadow, fill, light top, shaded bottom, ink border. */
function cartoonBox(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, u: number, fill: string | CanvasGradient, drop: number, line: number): void {
  roundRectPath(ctx, x, y + drop, w, h, r);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(x, y, w, u * 0.008);
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(x, y + h - u * 0.012, w, u * 0.012);
  ctx.restore();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

type IconKind = "skins" | "medals" | "sound";

/** The small buttons' icons (title.ts's SVGs, redrawn): a palette, a medal, a speaker, in a `size` square at (x, y). */
function smallIcon(ctx: Ctx, kind: IconKind, x: number, y: number, size: number): void {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "skins") {
    ctx.beginPath();
    ctx.arc(12, 12, 9, 0.35, Math.PI * 2 - 0.55);
    ctx.stroke();
    for (const [cx, cy] of [
      [7.5, 11],
      [10.5, 7.5],
      [15, 7.8],
      [17.6, 11.6],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "medals") {
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.lineTo(12, 10);
    ctx.lineTo(16, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 15.5, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 15.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(4, 9.5);
    ctx.lineTo(7.5, 9.5);
    ctx.lineTo(12, 5.5);
    ctx.lineTo(12, 18.5);
    ctx.lineTo(7.5, 14.5);
    ctx.lineTo(4, 14.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(13.5, 12, 4, -Math.PI / 2 + 0.3, Math.PI / 2 - 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(13.5, 12, 7.5, -Math.PI / 2 + 0.3, Math.PI / 2 - 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The title screen's DOM controls (src/title.ts, styled by src/title.css in the cartoon style),
 * drawn on the canvas over the title scene render.ts draws: the Slide / Drop cards with each
 * best, PLAY, and the Skins / Medals / Sound row, laid out from titleLayout like the page.
 */
export function drawTitleControls(ctx2: SKRSContext2D, cssW: number, cssH: number, skin: Skin, bests: Record<Mode, number>, mode: Mode): void {
  const ctx = dom(ctx2);
  const { u, top } = titleLayout(cssW, cssH);
  const hud = skin.hud;
  const body = kitFor(skin).body;
  const line = Math.max(2, u * 0.008);
  const colW = Math.min(u * 0.84, cssW - 32);
  const left = (cssW - colW) / 2;
  const gap = u * 0.045;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // The modes, side by side.
  const modeH = Math.max(48, u * 0.14);
  const modeW = (colW - u * 0.03) / 2;
  const modes: { value: Mode; title: string }[] = [
    { value: "normal", title: "SLIDE" },
    { value: "hard", title: "DROP" },
  ];
  modes.forEach((m, i) => {
    const x = left + i * (modeW + u * 0.03);
    const chosen = m.value === mode;
    const fill = chosen ? hud.ui : mix(hud.ui, "#20202a", 0.45);
    cartoonBox(ctx, x, top, modeW, modeH, u * 0.035, u, fill, u * 0.012, line);
    if (chosen) {
      roundRectPath(ctx, x - line * 0.7, top - line * 0.7, modeW + line * 1.4, modeH + line * 1.4, u * 0.035 + line * 0.7);
      ctx.lineWidth = line * 1.4;
      ctx.strokeStyle = hud.accent;
      ctx.stroke();
    }
    ctx.fillStyle = chosen ? "#ffffff" : "rgba(255, 255, 255, 0.75)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowOffsetY = u * 0.004;
    ctx.font = `700 ${Math.max(15, u * 0.048)}px ${body}`;
    ctx.fillText(m.title, x + modeW / 2, top + modeH / 2 - u * 0.022);
    ctx.font = `600 ${Math.max(12, u * 0.036)}px ${body}`;
    ctx.fillText(`best ${bests[m.value]}`, x + modeW / 2, top + modeH / 2 + u * 0.026);
    ctx.shadowColor = "transparent";
  });

  // PLAY.
  const playW = Math.min(u * 0.62, colW);
  const playH = Math.max(60, u * 0.19);
  const playY = top + modeH + gap;
  const playX = (cssW - playW) / 2;
  const grad = ctx.createLinearGradient(0, playY, 0, playY + playH);
  grad.addColorStop(0, mix(hud.accent, "#ffffff", 0.3));
  grad.addColorStop(0.45, hud.accent);
  grad.addColorStop(1, mix(hud.accent, "#b05a00", 0.2));
  cartoonBox(ctx, playX, playY, playW, playH, u * 0.05, u, grad, u * 0.016, line);
  ctx.font = `400 ${Math.max(30, u * 0.1)}px ${hud.display}`;
  ctx.shadowColor = INK;
  ctx.shadowOffsetY = u * 0.008;
  outlinedText(ctx, "PLAY", cssW / 2, playY + playH / 2 + u * 0.004, "#ffffff", INK, u * 0.012);
  ctx.shadowColor = "transparent";

  // The small buttons.
  const smallW = Math.max(60, u * 0.17);
  const smallH = Math.max(56, u * 0.155);
  const rowY = playY + playH + gap;
  const buttons: { kind: IconKind; caption: string }[] = [
    { kind: "skins", caption: "Skins" },
    { kind: "medals", caption: "Medals" },
    { kind: "sound", caption: "Sound" },
  ];
  const rowW = buttons.length * smallW + (buttons.length - 1) * gap;
  buttons.forEach((b, i) => {
    const x = (cssW - rowW) / 2 + i * (smallW + gap);
    cartoonBox(ctx, x, rowY, smallW, smallH, u * 0.035, u, hud.ui, u * 0.012, line);
    const icon = Math.max(22, u * 0.068);
    smallIcon(ctx, b.kind, x + (smallW - icon) / 2, rowY + smallH * 0.16, icon);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(11, u * 0.031)}px ${body}`;
    ctx.fillText(b.caption, x + smallW / 2, rowY + smallH * 0.16 + icon + u * 0.026);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the caption band

export interface Caption {
  headline: string;
  sub?: string;
}

/** The caption band takes this much of a screenshot's height; the game is rendered below it. */
export const BAND = 0.15;

/** Set ctx.font from `template` ("{px}" is the size) at `size`, shrunk until `text` fits `maxWidth`. */
function fitFont(ctx: Ctx, text: string, template: string, size: number, maxWidth: number): number {
  let px = Math.round(size);
  ctx.font = template.replace("{px}", String(px));
  const w = ctx.measureText(text).width;
  if (w > maxWidth) {
    px = Math.floor((px * maxWidth) / w);
    ctx.font = template.replace("{px}", String(px));
  }
  return px;
}

/**
 * The band across the top of every screenshot, `w` x `h` device px at (0, 0): the Classic UI
 * blue with the cartoon buttons' light top and shaded bottom, an ink line under it, the headline
 * in the logo's face and yellow with its ink outline, and a white Fredoka line under it.
 */
export function drawCaptionBand(ctx2: SKRSContext2D, w: number, h: number, c: Caption): void {
  const ctx = dom(ctx2);
  const hud = classic.hud;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = hud.ui;
  ctx.fillRect(0, 0, w, h);
  // A pair of the game's own clouds low in the corners, faint, so the band is the sky's blue.
  ctx.globalAlpha = 0.14;
  puffs(ctx, PALETTE, [
    { x: w * 0.06, y: h * 1.02, r: h * 0.34 },
    { x: w * 0.17, y: h * 1.12, r: h * 0.26 },
    { x: w * 0.94, y: h * 1.0, r: h * 0.36 },
    { x: w * 0.83, y: h * 1.12, r: h * 0.24 },
  ]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(0, 0, w, h * 0.03);
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, h * 0.95, w, h * 0.05);
  const line = Math.max(3, w * 0.005);
  ctx.fillStyle = INK;
  ctx.fillRect(0, h - line, w, line);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const size = fitFont(ctx, c.headline, `400 {px}px ${hud.display}`, w * 0.1, w * 0.9);
  const headY = c.sub ? h * 0.55 : h * 0.66;
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowOffsetY = size * 0.05;
  outlinedText(ctx, c.headline, w / 2, headY, hud.title, INK, size * 0.11);
  ctx.shadowColor = "transparent";
  if (c.sub) {
    const subSize = fitFont(ctx, c.sub, `700 {px}px ${kitFor(classic).body}`, w * 0.042, w * 0.92);
    outlinedText(ctx, c.sub, w / 2, h * 0.82, "#ffffff", INK, subSize * 0.14);
  }
  ctx.restore();
}

/**
 * A screenshot for `d`: the caption band on top and, under it, the game laid out at the device's
 * CSS width and the remaining height (so u, the size unit, is the device's own) and drawn by
 * `paint` into a context scaled to CSS px.
 */
export function composeScreenshot(d: Device, caption: Caption, paint: (ctx: SKRSContext2D, cssW: number, cssH: number) => void): Canvas {
  const canvas = createCanvas(d.w, d.h);
  const ctx = canvas.getContext("2d");
  const bandH = Math.round(d.h * BAND);
  const cssW = d.w / d.scale;
  const cssH = (d.h - bandH) / d.scale;
  ctx.save();
  ctx.translate(0, bandH);
  ctx.scale(d.scale, d.scale);
  paint(ctx, cssW, cssH);
  ctx.restore();
  drawCaptionBand(ctx, d.w, bandH, caption);
  return canvas;
}

// ---------------------------------------------------------------- the grid of skins

export interface Tile {
  moment: Moment;
  label: string;
}

/**
 * Tiles of the skins on the Classic day sky, `cols` across: each is that skin's title scene
 * (the logo in its own face, no HUD) rendered at the tile's CSS size, with the cartoon look's
 * rounded corners and ink outline, and its name on a small label at the bottom.
 */
export function drawSkinGrid(ctx2: SKRSContext2D, cssW: number, cssH: number, scale: number, tiles: readonly Tile[], cols: number): void {
  const ctx = dom(ctx2);
  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);
  const u = Math.min(cssW, cssH * 0.6);
  puffs(ctx, PALETTE, [
    { x: cssW * 0.02, y: cssH * 0.98, r: u * 0.16 },
    { x: cssW * 0.2, y: cssH * 1.05, r: u * 0.13 },
    { x: cssW * 0.98, y: cssH * 0.97, r: u * 0.17 },
    { x: cssW * 0.8, y: cssH * 1.05, r: u * 0.12 },
  ]);

  const rows = Math.ceil(tiles.length / cols);
  const gap = cssW * 0.035;
  const tileW = (cssW - gap * (cols + 1)) / cols;
  const tileH = (cssH - gap * (rows + 1)) / rows;
  const r = tileW * 0.06;
  const line = Math.max(2, u * 0.0075);
  tiles.forEach((tile, i) => {
    const x = gap + (i % cols) * (tileW + gap);
    const y = gap + Math.floor(i / cols) * (tileH + gap);
    const sub = cssCanvas(tileW, tileH, scale);
    drawMoment(sub.ctx, tileW, tileH, { ...tile.moment, opts: { title: true, ...tile.moment.opts } });
    // Drop shadow, the scene clipped to the rounded tile, the ink outline.
    roundRectPath(ctx, x + u * 0.008, y + u * 0.012, tileW, tileH, r);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fill();
    ctx.save();
    roundRectPath(ctx, x, y, tileW, tileH, r);
    ctx.clip();
    ctx2.drawImage(sub.canvas, x, y, tileW, tileH);
    ctx.restore();
    roundRectPath(ctx, x, y, tileW, tileH, r);
    ctx.lineWidth = line;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // The name on a label.
    const body = kitFor(classic).body;
    const size = Math.max(10, tileW * 0.085);
    ctx.font = `700 ${size}px ${body}`;
    const labelW = ctx.measureText(tile.label).width + size * 1.4;
    const labelH = size * 1.6;
    const lx = x + tileW / 2 - labelW / 2;
    const ly = y + tileH - labelH - tileH * 0.035;
    roundRectPath(ctx, lx, ly, labelW, labelH, labelH / 2);
    ctx.fillStyle = classic.hud.ui;
    ctx.fill();
    ctx.lineWidth = line * 0.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tile.label, x + tileW / 2, ly + labelH / 2 + size * 0.06);
  });
}

// ---------------------------------------------------------------- cards

/** The Classic day sky over the whole `w` x `h` area with clouds low at the sides (the launch image's backdrop, bright). */
export function drawSkyBackdrop(ctx2: SKRSContext2D, w: number, h: number): void {
  const ctx = dom(ctx2);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const u = Math.min(w, h * 0.6);
  puffs(ctx, PALETTE, [
    { x: w * 0.02, y: h * 0.9, r: u * 0.2 },
    { x: w * 0.22, y: h * 0.98, r: u * 0.16 },
    { x: w * 0.98, y: h * 0.88, r: u * 0.21 },
    { x: w * 0.78, y: h * 0.98, r: u * 0.15 },
  ]);
}

/** The game's name in the Classic logo's face and colors, centered at (x, y) at `size` px. */
export function drawLogo(ctx2: SKRSContext2D, x: number, y: number, size: number, maxWidth: number): number {
  const ctx = dom(ctx2);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const px = fitFont(ctx, GAME_NAME, `400 {px}px ${classic.hud.display}`, size, maxWidth);
  outlinedText(ctx, GAME_NAME, x, y, classic.hud.title, INK, Math.max(3, px * 0.12));
  ctx.restore();
  return px;
}

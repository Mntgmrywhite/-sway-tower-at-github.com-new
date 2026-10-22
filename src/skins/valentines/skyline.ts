import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { landLine } from "./far";
import { heartPath } from "./shapes";
import { sunPath } from "./sky";
import type { Tone } from "./tone";

// Paris above the clouds: once the cloud sea has covered the land, the landmarks of the city
// stand out of it in the side lanes, never behind the tower (the owner, 2026-10-21: "the tower
// blocks the interesting stuff at higher stacks"). Our own designs, each evoking the Paris of
// 1900 without copying a real building: on the left a gilded dome on a colonnaded drum over a
// stone front (under the sun and the moon), and, as far out as the screen reaches, an opera house
// under a low copper dome with gilded figures, and a white basilica with its three egg-shaped
// domes and a campanile; on the right, past the Ferris wheel and the lattice tower (far.ts), a
// Gothic chapel with tall stained-glass lancets under a slender gilded spire, and a pantheon's
// dome on its colonnaded drum. Each stands on the land's line, its foot in the cloud sea, among
// the lanes' rooftops (far.ts), and is left out where the screen is too narrow to show all of it
// (a phone shows the gilded dome; a wide window the whole sweep). By day honey stone, gilt, white
// and green copper in the haze; at night floodlit warm, the windows lit, the chapel's glass aglow.
// Far away: flat fills, light from the sun's side, no outline. Nothing here moves.
//
// The left lane is the sun's as it sets and rises (sky.ts): what stands in its path keeps out of
// its way, going into the mist before the sun comes down to it and coming out of it again once
// the sun is gone or high (tone.ts `sunSideShow`); the rest stands there from the moment the
// evening mist takes the city (far.ts `mist`) for good.
//
// Positions are in u from the screen's center, heights in u above the land's line.

/** A landmark: its axis (u from center), how to draw it and how much bigger than its drawing it stands, and on how high a hill (u). */
interface Landmark {
  name: string;
  x: number;
  size: number;
  hill: number;
  /** Its drawing's half width (u, at size 1). */
  hw0: number;
  /** Its half width and its top over the land's line, all told (u: the hill's, if wider). */
  hw: number;
  top: number;
  draw: (ctx: Ctx, at: At, tone: Tone) => void;
}

/** The hill a landmark stands on: its half width, in hill heights. */
const HILL_W = 1.5;

/** A landmark from its drawing's half width and top (u, at size 1). */
function mark(name: string, x: number, size: number, hw: number, top: number, draw: Landmark["draw"], hill = 0): Landmark {
  return { name, x, size, hill, hw0: hw, hw: Math.max(hw * size, hill * HILL_W), top: hill + top * size, draw };
}

/** Where a landmark is drawn: screen px of its axis and of the land's line, and u. */
interface At {
  x: number;
  y: number;
  u: number;
}

/** How far clear of the sun's path (u) a landmark must keep to stand there while the sun is low; how far in from the screen's sides it must stand whole. */
export const PATH_PAD = 0.02;
const EDGE = 0.012;

/** A pointed bulb of a dome standing on y (half width w, rising h), as its own subpath. */
function bulb(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.06, y - h * 0.58, x - w * 0.42, y - h * 0.9, x, y - h);
  ctx.bezierCurveTo(x + w * 0.42, y - h * 0.9, x + w * 1.06, y - h * 0.58, x + w, y);
  ctx.closePath();
}

/** A rounder dome standing on y (half width w, rising h), as its own subpath. */
function round(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w, y - h * 0.75, x - w * 0.55, y - h, x, y - h);
  ctx.bezierCurveTo(x + w * 0.55, y - h, x + w, y - h * 0.75, x + w, y);
  ctx.closePath();
}

/** The lit flank of a dome (its sunward side), as its own subpath: `pointed` follows `bulb`, else `round`. */
function flank(ctx: Ctx, x: number, y: number, w: number, h: number, pointed: boolean): void {
  ctx.moveTo(x - w, y);
  if (pointed) ctx.bezierCurveTo(x - w * 1.06, y - h * 0.58, x - w * 0.42, y - h * 0.9, x - w * 0.06, y - h * 0.99);
  else ctx.bezierCurveTo(x - w, y - h * 0.75, x - w * 0.55, y - h, x - w * 0.08, y - h);
  ctx.bezierCurveTo(x - w * 0.42, y - h * 0.7, x - w * 0.62, y - h * 0.3, x - w * 0.5, y);
  ctx.closePath();
}

/** A round-headed window standing on y (center x, w wide, h tall), as its own subpath. */
function arched(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r, y - h + r);
  ctx.arc(x, y - h + r, r, Math.PI, Math.PI * 2);
  ctx.lineTo(x + r, y);
  ctx.closePath();
}

/** A pointed (lancet) window standing on y, as its own subpath. */
function lancet(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w);
  ctx.quadraticCurveTo(x - w / 2, y - h + w * 0.2, x, y - h);
  ctx.quadraticCurveTo(x + w / 2, y - h + w * 0.2, x + w / 2, y - h + w);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
}

/** A spire from its foot at y up to its tip (half width w at the foot), as its own subpath. */
function spire(ctx: Ctx, x: number, y: number, w: number, tip: number): void {
  ctx.moveTo(x - w, y);
  ctx.lineTo(x, tip);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- the gilded dome

/**
 * The gilded dome on the left: a stone front with a pediment over a row of arched windows, a
 * stepped attic, a drum ringed with paired columns and windows between, a balustrade, the gilded
 * dome itself (ribbed, its oculi at the foot, lit on the sun's side), a lantern with its own little
 * cupola and a gilded spire.
 */
function gildedDome(ctx: Ctx, a: At, tone: Tone): void {
  const { x, u } = a;
  const X = (d: number) => x + d * u;
  const Y = (h: number) => a.y - h * u;
  // Stone: the front, the attic, the drum, the balustrade, the lantern.
  ctx.fillStyle = tone.skyStone;
  ctx.beginPath();
  ctx.rect(X(-0.086), Y(0.078), 0.172 * u, 0.15 * u);
  ctx.rect(X(-0.062), Y(0.094), 0.124 * u, 0.02 * u);
  ctx.moveTo(X(-0.04), Y(0.078));
  ctx.lineTo(X(0), Y(0.104));
  ctx.lineTo(X(0.04), Y(0.078));
  ctx.closePath();
  ctx.rect(X(-0.046), Y(0.168), 0.092 * u, 0.078 * u);
  ctx.rect(X(-0.012), Y(0.302), 0.024 * u, 0.034 * u);
  ctx.fill();
  // Shade: the right of each part, under the cornices, the drum's column grooves.
  ctx.fillStyle = tone.skyStoneShade;
  ctx.beginPath();
  ctx.rect(X(0.03), Y(0.078), 0.056 * u, 0.15 * u);
  ctx.rect(X(-0.086), Y(0.078) + 0.004 * u, 0.172 * u, 0.005 * u);
  ctx.rect(X(0.022), Y(0.094), 0.04 * u, 0.016 * u);
  ctx.rect(X(0.018), Y(0.168), 0.028 * u, 0.078 * u);
  ctx.rect(X(0.004), Y(0.302), 0.008 * u, 0.034 * u);
  for (let i = 0; i < 6; i++) ctx.rect(X(-0.04 + i * 0.016), Y(0.158), 0.0035 * u, 0.064 * u);
  ctx.fill();
  // Lit: the left edges and the cornices' tops, the pediment's rake.
  ctx.fillStyle = tone.skyStoneLit;
  ctx.beginPath();
  ctx.rect(X(-0.086), Y(0.078), 0.006 * u, 0.15 * u);
  ctx.rect(X(-0.09), Y(0.08), 0.18 * u, 0.004 * u);
  ctx.rect(X(-0.064), Y(0.096), 0.128 * u, 0.0035 * u);
  ctx.rect(X(-0.05), Y(0.172), 0.1 * u, 0.007 * u);
  ctx.rect(X(-0.046), Y(0.168), 0.005 * u, 0.078 * u);
  ctx.moveTo(X(-0.044), Y(0.078));
  ctx.lineTo(X(0), Y(0.107));
  ctx.lineTo(X(0), Y(0.101));
  ctx.lineTo(X(-0.036), Y(0.078));
  ctx.closePath();
  ctx.fill();
  // Windows: a row of tall arched ones in the front, one between each pair of the drum's columns.
  ctx.fillStyle = tone.skyWindow;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) arched(ctx, X(-0.072 + i * 0.024), Y(0.012), 0.011 * u, 0.05 * u);
  for (let i = 0; i < 5; i++) arched(ctx, X(-0.032 + i * 0.016), Y(0.104), 0.0075 * u, 0.04 * u);
  ctx.fill();
  // The dome, its lit flank and ribs; the lantern's cupola and the spire.
  const foot = Y(0.172);
  const w = 0.052 * u;
  const h = 0.104 * u;
  ctx.fillStyle = tone.skyGilt;
  ctx.beginPath();
  bulb(ctx, x, foot, w, h);
  bulb(ctx, x, Y(0.302), 0.014 * u, 0.016 * u);
  spire(ctx, x, Y(0.316), 0.003 * u, Y(0.37));
  ctx.fill();
  ctx.fillStyle = tone.skyGiltLit;
  ctx.beginPath();
  flank(ctx, x, foot, w, h, true);
  ctx.fill();
  ctx.strokeStyle = tone.skyGiltShade;
  ctx.lineWidth = Math.max(0.8, u * 0.0028);
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const k of [-0.62, -0.22, 0.22, 0.62]) {
    ctx.moveTo(x + k * w, foot - u * 0.004);
    ctx.quadraticCurveTo(x + k * w * 0.82, foot - h * 0.72, x, foot - h + u * 0.004);
  }
  ctx.moveTo(x - w * 0.98, foot - u * 0.006);
  ctx.lineTo(x + w * 0.98, foot - u * 0.006);
  ctx.stroke();
  // The oculi round the dome's foot: little dormers of stone with a window.
  ctx.fillStyle = tone.skyStoneLit;
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) arched(ctx, x + k * w, foot - u * 0.008, 0.012 * u, 0.018 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyWindow;
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) arched(ctx, x + k * w, foot - u * 0.01, 0.006 * u, 0.012 * u);
  ctx.fill();
}

// ---------------------------------------------------------------- the opera house

/**
 * An opera house: a wide stone front with an arcade of round arches below and a loggia of paired
 * columns above, an attic band with a gilded urn at each corner, and a low dome of green copper
 * crowned with a gilded heart.
 */
function opera(ctx: Ctx, a: At, tone: Tone): void {
  const { x, u } = a;
  const X = (d: number) => x + d * u;
  const Y = (h: number) => a.y - h * u;
  ctx.fillStyle = tone.skyStone;
  ctx.beginPath();
  ctx.rect(X(-0.1), Y(0.09), 0.2 * u, 0.16 * u);
  ctx.rect(X(-0.094), Y(0.106), 0.188 * u, 0.018 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyStoneShade;
  ctx.beginPath();
  ctx.rect(X(0.05), Y(0.09), 0.05 * u, 0.16 * u);
  ctx.rect(X(-0.1), Y(0.04), 0.2 * u, 0.004 * u);
  // The loggia's dark gaps between its paired columns.
  for (let i = 0; i < 7; i++) ctx.rect(X(-0.081 + i * 0.026), Y(0.08), 0.011 * u, 0.034 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyStoneLit;
  ctx.beginPath();
  ctx.rect(X(-0.104), Y(0.092), 0.208 * u, 0.005 * u);
  ctx.rect(X(-0.098), Y(0.108), 0.196 * u, 0.004 * u);
  ctx.rect(X(-0.1), Y(0.044), 0.2 * u, 0.004 * u);
  ctx.rect(X(-0.1), Y(0.09), 0.006 * u, 0.16 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyWindow;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) arched(ctx, X(-0.078 + i * 0.026), Y(0.004), 0.014 * u, 0.032 * u);
  for (let i = 0; i < 7; i++) ctx.rect(X(-0.0785 + i * 0.026), Y(0.074), 0.006 * u, 0.022 * u);
  ctx.fill();
  // The copper dome and its crown.
  const foot = Y(0.106);
  const w = 0.056 * u;
  const h = 0.05 * u;
  ctx.fillStyle = tone.copper;
  ctx.beginPath();
  round(ctx, x, foot, w, h);
  ctx.fill();
  ctx.fillStyle = tone.copperLit;
  ctx.beginPath();
  flank(ctx, x, foot, w, h, false);
  ctx.fill();
  ctx.strokeStyle = tone.copperShade;
  ctx.lineWidth = Math.max(0.8, u * 0.0026);
  ctx.beginPath();
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    ctx.moveTo(x + k * w, foot);
    ctx.quadraticCurveTo(x + k * w * 0.9, foot - h * 0.8, x, foot - h + u * 0.003);
  }
  ctx.stroke();
  // Gilded: the crown's heart on its stem, and an urn on a plinth at each corner of the attic.
  ctx.fillStyle = tone.skyGilt;
  ctx.beginPath();
  ctx.rect(X(-0.002), Y(0.168), 0.004 * u, 0.014 * u);
  heartPath(ctx, x, Y(0.176), 0.02 * u);
  for (const m of [-1, 1]) {
    const gx = X(m * 0.084);
    ctx.rect(gx - 0.008 * u, Y(0.114), 0.016 * u, 0.006 * u);
    ctx.moveTo(gx - 0.004 * u, Y(0.114));
    ctx.bezierCurveTo(gx - 0.013 * u, Y(0.118), gx - 0.012 * u, Y(0.13), gx - 0.006 * u, Y(0.132));
    ctx.lineTo(gx + 0.006 * u, Y(0.132));
    ctx.bezierCurveTo(gx + 0.012 * u, Y(0.13), gx + 0.013 * u, Y(0.118), gx + 0.004 * u, Y(0.114));
    ctx.closePath();
    ctx.rect(gx - 0.007 * u, Y(0.135), 0.014 * u, 0.003 * u);
    ctx.moveTo(gx - 0.003 * u, Y(0.135));
    ctx.lineTo(gx, Y(0.145));
    ctx.lineTo(gx + 0.003 * u, Y(0.135));
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = tone.skyGiltLit;
  ctx.beginPath();
  for (const m of [-1, 1]) {
    const gx = X(m * 0.084);
    ctx.rect(gx - 0.009 * u, Y(0.127), 0.004 * u, 0.008 * u);
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the white basilica

/**
 * A white basilica: a front with a porch of three arches, a tall egg-shaped dome on its drum
 * between two little domes, and a campanile behind it on the right with its own dome.
 */
function basilica(ctx: Ctx, a: At, tone: Tone): void {
  const { x, u } = a;
  const X = (d: number) => x + d * u;
  const Y = (h: number) => a.y - h * u;
  ctx.fillStyle = tone.skyWhite;
  ctx.beginPath();
  // The campanile, the front, the drums.
  ctx.rect(X(0.06), Y(0.21), 0.026 * u, 0.28 * u);
  bulb(ctx, X(0.073), Y(0.21), 0.016 * u, 0.03 * u);
  ctx.rect(X(-0.076), Y(0.072), 0.152 * u, 0.14 * u);
  ctx.rect(X(-0.03), Y(0.12), 0.06 * u, 0.05 * u);
  ctx.rect(X(-0.064), Y(0.098), 0.028 * u, 0.028 * u);
  ctx.rect(X(0.036), Y(0.098), 0.028 * u, 0.028 * u);
  // The domes and their tips.
  bulb(ctx, x, Y(0.118), 0.034 * u, 0.074 * u);
  bulb(ctx, X(-0.05), Y(0.096), 0.016 * u, 0.034 * u);
  bulb(ctx, X(0.05), Y(0.096), 0.016 * u, 0.034 * u);
  ctx.rect(X(-0.004), Y(0.212), 0.008 * u, 0.022 * u);
  spire(ctx, x, Y(0.21), 0.006 * u, Y(0.236));
  spire(ctx, X(-0.05), Y(0.128), 0.003 * u, Y(0.142));
  spire(ctx, X(0.05), Y(0.128), 0.003 * u, Y(0.142));
  spire(ctx, X(0.073), Y(0.238), 0.003 * u, Y(0.254));
  ctx.fill();
  ctx.fillStyle = tone.skyWhiteShade;
  ctx.beginPath();
  ctx.rect(X(0.074), Y(0.21), 0.012 * u, 0.28 * u);
  ctx.rect(X(0.04), Y(0.072), 0.036 * u, 0.14 * u);
  ctx.rect(X(0.012), Y(0.12), 0.018 * u, 0.05 * u);
  ctx.rect(X(-0.076), Y(0.072) + 0.004 * u, 0.152 * u, 0.004 * u);
  ctx.moveTo(X(0.034), Y(0.118));
  ctx.bezierCurveTo(X(0.036), Y(0.16), X(0.016), Y(0.184), x, Y(0.192));
  ctx.bezierCurveTo(X(0.012), Y(0.17), X(0.02), Y(0.14), X(0.014), Y(0.118));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.skyWindow;
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) arched(ctx, X(i * 0.03), Y(-0.01), 0.018 * u, 0.05 * u);
  for (let i = 0; i < 3; i++) arched(ctx, X(-0.016 + i * 0.016), Y(0.128), 0.006 * u, 0.026 * u);
  arched(ctx, X(0.073), Y(0.17), 0.009 * u, 0.03 * u);
  ctx.fill();
}

// ---------------------------------------------------------------- the Gothic chapel

/**
 * A Gothic chapel: a tall narrow body between buttresses topped with pinnacles, tall lancets of
 * stained glass (rose, amber and mint, aglow at night), a steep slate roof, and a slender spire
 * from its ridge with a gilded tip.
 */
function chapel(ctx: Ctx, a: At, tone: Tone): void {
  const { x, u } = a;
  const X = (d: number) => x + d * u;
  const Y = (h: number) => a.y - h * u;
  const roof = tone.rows[1]!;
  ctx.fillStyle = roof.zinc;
  ctx.beginPath();
  ctx.moveTo(X(-0.05), Y(0.14));
  ctx.lineTo(X(0), Y(0.205));
  ctx.lineTo(X(0.05), Y(0.14));
  ctx.closePath();
  spire(ctx, x, Y(0.19), 0.011 * u, Y(0.36));
  ctx.fill();
  ctx.fillStyle = roof.zincLit;
  ctx.beginPath();
  ctx.moveTo(X(-0.05), Y(0.14));
  ctx.lineTo(X(0), Y(0.205));
  ctx.lineTo(X(-0.006), Y(0.205));
  ctx.lineTo(X(-0.04), Y(0.14));
  ctx.closePath();
  spire(ctx, X(-0.004), Y(0.19), 0.006 * u, Y(0.36));
  ctx.fill();
  ctx.fillStyle = tone.skyStone;
  ctx.beginPath();
  ctx.rect(X(-0.048), Y(0.142), 0.096 * u, 0.21 * u);
  // Buttresses and their pinnacles.
  for (let i = 0; i < 4; i++) {
    const bx = X(-0.054 + i * 0.036);
    ctx.rect(bx, Y(0.15), 0.012 * u, 0.22 * u);
    spire(ctx, bx + 0.006 * u, Y(0.15), 0.008 * u, Y(0.178));
  }
  ctx.fill();
  ctx.fillStyle = tone.skyStoneShade;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(X(-0.047 + i * 0.036), Y(0.15), 0.005 * u, 0.22 * u);
  ctx.rect(X(-0.048), Y(0.142) + 0.002 * u, 0.096 * u, 0.004 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyGilt;
  ctx.beginPath();
  spire(ctx, x, Y(0.33), 0.004 * u, Y(0.375));
  ctx.fill();
  // The lancets: three tall panes, each of three glasses by turns, a little rose over them.
  const glass = [tone.glassRose, tone.glassAmber, tone.glassMint];
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = glass[c]!;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      if ((i + c) % 3 !== 0) continue;
      lancet(ctx, X(-0.024 + i * 0.024), Y(0.012), 0.014 * u, 0.11 * u);
    }
    ctx.fill();
  }
  ctx.strokeStyle = tone.lead;
  ctx.lineWidth = Math.max(0.6, u * 0.0016);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const lx = X(-0.024 + i * 0.024);
    for (const h of [0.04, 0.07]) {
      ctx.moveTo(lx - 0.007 * u, Y(h));
      ctx.lineTo(lx + 0.007 * u, Y(h));
    }
  }
  ctx.stroke();
}

// ---------------------------------------------------------------- the pantheon

/**
 * A pantheon: a front with a portico of columns under a pediment, a tall drum ringed with a
 * colonnade, and a round stone dome with a little lantern.
 */
function pantheon(ctx: Ctx, a: At, tone: Tone): void {
  const { x, u } = a;
  const X = (d: number) => x + d * u;
  const Y = (h: number) => a.y - h * u;
  ctx.fillStyle = tone.skyStone;
  ctx.beginPath();
  ctx.rect(X(-0.09), Y(0.07), 0.18 * u, 0.14 * u);
  ctx.moveTo(X(-0.06), Y(0.07));
  ctx.lineTo(X(0), Y(0.1));
  ctx.lineTo(X(0.06), Y(0.07));
  ctx.closePath();
  ctx.rect(X(-0.05), Y(0.104), 0.1 * u, 0.04 * u);
  ctx.rect(X(-0.04), Y(0.17), 0.08 * u, 0.07 * u);
  round(ctx, x, Y(0.174), 0.044 * u, 0.058 * u);
  ctx.rect(X(-0.008), Y(0.258), 0.016 * u, 0.028 * u);
  round(ctx, x, Y(0.256), 0.01 * u, 0.012 * u);
  ctx.fill();
  ctx.fillStyle = tone.skyStoneShade;
  ctx.beginPath();
  ctx.rect(X(0.05), Y(0.07), 0.04 * u, 0.14 * u);
  ctx.rect(X(0.016), Y(0.17), 0.024 * u, 0.07 * u);
  for (let i = 0; i < 7; i++) ctx.rect(X(-0.033 + i * 0.011), Y(0.16), 0.004 * u, 0.05 * u);
  for (let i = 0; i < 6; i++) ctx.rect(X(-0.048 + i * 0.019), Y(0.062), 0.006 * u, 0.062 * u);
  ctx.moveTo(X(0.044), Y(0.174));
  ctx.bezierCurveTo(X(0.044), Y(0.2), X(0.03), Y(0.226), x, Y(0.232));
  ctx.bezierCurveTo(X(0.022), Y(0.22), X(0.03), Y(0.2), X(0.026), Y(0.174));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.skyStoneLit;
  ctx.beginPath();
  ctx.rect(X(-0.094), Y(0.072), 0.188 * u, 0.004 * u);
  ctx.rect(X(-0.044), Y(0.174), 0.088 * u, 0.005 * u);
  ctx.moveTo(X(-0.064), Y(0.07));
  ctx.lineTo(X(0), Y(0.103));
  ctx.lineTo(X(0), Y(0.097));
  ctx.lineTo(X(-0.056), Y(0.07));
  ctx.closePath();
  flank(ctx, x, Y(0.174), 0.044 * u, 0.058 * u, false);
  ctx.fill();
  ctx.fillStyle = tone.skyWindow;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) arched(ctx, X(-0.0385 + i * 0.019), Y(0.012), 0.009 * u, 0.034 * u);
  ctx.fill();
}

// ---------------------------------------------------------------- the sweep

/** The landmarks, left to right. A phone shows the gilded dome; wider screens more of the sweep. */
export const LANDMARKS: readonly Landmark[] = [
  mark("basilica", -0.95, 1.4, 0.09, 0.254, basilica, 0.24),
  mark("opera", -0.69, 1.5, 0.104, 0.188, opera),
  mark("gilded dome", -0.37, 1.15, 0.09, 0.37, gildedDome),
  mark("chapel", 0.7, 1.6, 0.06, 0.375, chapel),
  mark("pantheon", 1.02, 1.5, 0.094, 0.286, pantheon),
];

/** Whether a landmark stands wholly on the screen (else it is left out). */
export function landmarkShows(s: Scene, m: Landmark): boolean {
  const x0 = s.cssW / 2 + (m.x - m.hw) * s.u;
  const x1 = s.cssW / 2 + (m.x + m.hw) * s.u;
  return x0 >= EDGE * s.u && x1 <= s.cssW - EDGE * s.u;
}

/** The highest point (screen y, px) of the landmarks on screen that stand between x0 and x1 (px); +Infinity where none does. */
export function landmarksTop(s: Scene, x0: number, x1: number): number {
  let top = Infinity;
  for (const m of LANDMARKS) {
    if (!landmarkShows(s, m)) continue;
    const x = s.cssW / 2 + m.x * s.u;
    if (x0 < x + m.hw * s.u && x1 > x - m.hw * s.u) top = Math.min(top, landLine(s) - m.top * s.u);
  }
  return top;
}

/** Whether a landmark stands in the band the sun sweeps as it sets and rises. */
export function inSunPath(s: Scene, m: Landmark): boolean {
  const p = sunPath(s);
  const x0 = s.cssW / 2 + (m.x - m.hw) * s.u;
  const x1 = s.cssW / 2 + (m.x + m.hw) * s.u;
  return x0 < p.x1 + PATH_PAD * s.u && x1 > p.x0 - PATH_PAD * s.u;
}

const AT: At = { x: 0, y: 0, u: 0 };

/**
 * The landmarks standing out of the cloud sea: those clear of the sun's path `open` far out of the
 * mist, those in it `sunSide` far. (`only` draws just the one landmark named, for the tests.)
 */
export function landmarks(ctx: Ctx, s: Scene, tone: Tone, open: number, sunSide: number, only?: string): void {
  for (const m of LANDMARKS) {
    if (only !== undefined && m.name !== only) continue;
    if (!landmarkShows(s, m)) continue;
    const alpha = inSunPath(s, m) ? sunSide : open;
    if (alpha <= 0.002) continue;
    AT.x = s.cssW / 2 + m.x * s.u;
    AT.y = landLine(s) - m.hill * s.u;
    AT.u = s.u * m.size;
    ctx.globalAlpha = alpha;
    m.draw(ctx, AT, tone);
    if (m.hill > 0) hill(ctx, s, tone, m);
  }
  ctx.globalAlpha = 1;
}

/**
 * The hill a landmark stands on (the basilica's), drawn over its foot: it rises from the land's
 * line to a little plateau the landmark crowns, its front's foot hidden in the hilltop. Flat and
 * faded, far away.
 */
function hill(ctx: Ctx, s: Scene, tone: Tone, m: Landmark): void {
  const x = s.cssW / 2 + m.x * s.u;
  const y = landLine(s) + s.u * 0.02;
  const top = landLine(s) - m.hill * s.u + s.u * 0.012;
  const w = m.hill * s.u * HILL_W;
  const p = m.hw0 * m.size * s.u * 1.1;
  ctx.fillStyle = tone.hillFar;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 0.6, y - (y - top) * 0.2, x - p * 1.4, top, x - p, top);
  ctx.lineTo(x + p, top);
  ctx.bezierCurveTo(x + p * 1.4, top, x + w * 0.6, y - (y - top) * 0.2, x + w, y);
  ctx.closePath();
  ctx.fill();
}

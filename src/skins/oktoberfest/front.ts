import { alpha, circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import {
  CANVAS_BLUE,
  CANVAS_BLUE_SHADE,
  CANVAS_WHITE,
  CANVAS_WHITE_SHADE,
  GINGER,
  GRASS,
  GRAVEL,
  GRAVEL_DARK,
  GRILL,
  ICING,
  ICING_PINK,
  INK,
  LANTERN_GLOW,
  PRETZEL,
  SALT,
  SAUSAGE,
  TRODDEN,
  WOOD,
  WOOD_DARK,
} from "./colors";
import { inkW } from "./ground";
import { block, heartPath, pretzelPath } from "./shapes";
import { toneOf } from "./tone";

// The near edge we look over: a festival stall at either side and a low wooden fence between
// them with a gap in the middle, where a gravel path runs out through the grass. On the left the
// pretzel stall: a counter under a blue-and-white scalloped awning, a canvas back, pretzels
// hanging on a rail and a row of iced gingerbread hearts; on the right the sausage stall: a
// grill with bratwurst on it under its awning, a thin smoke rising from its pipe. From the
// golden evening both are strung with lights. Each stall is a whole booth, both its ends on
// screen (on the narrowest phone too), standing on two posts planted in the grass behind its
// counter; every fence post is planted the same way, its foot sunk into the grass under a tuft
// (`FOOT`: layout.test.ts checks that everything here reaches it). The waitress and the parade
// (parade.ts) pass behind the stalls and the fence. It covers the base band and drops away
// faster than the tower as the camera climbs (parallax 1.6, like the band), so it only frames
// the start. The gap stays clear: render.ts writes "tap to drop" there at the start (at 0.9 of
// the screen height), which on a short phone falls across the fence's top and on a tall one
// across its rails.

/** How far the fence's top rail stands above the base band's top edge (u). */
const FENCE_UP = 0.03;
/** Half the gap's width (u; "tap to drop" is about 0.29 u wide). */
export const GATE = 0.17;
/** The stalls: their inner and outer edges (u from the screen's center), their counters' tops and their awnings' top edges above the band's top (u). */
export const STALL_IN = 0.3;
export const STALL_OUT = 0.485;
export const COUNTER_UP = 0.11;
export const AWNING_UP = 0.2;
const AWNING_H = 0.03;
/** A stall's corner posts: their width (u). */
export const POST_W = 0.014;
/** Where the grass begins in front (u below the band's top), and how far into it every post and counter is sunk. */
export const GRASS_AT = 0.04;
export const FOOT = 0.054;

/** The band's top edge on screen (it moves with the base band). */
export function bandTop(s: Scene): number {
  return layerGround(s, 1.6) + s.u * 0.36;
}

/** The top of the awnings: the highest thing in front. */
export function frontTop(s: Scene): number {
  return bandTop(s) - s.u * AWNING_UP;
}

/** The line everything in front stands on: the posts' and the counters' feet, sunk into the grass. */
export function frontFoot(s: Scene): number {
  return bandTop(s) + s.u * FOOT;
}

/** A tuft of grass at x on the line `y`, as its own subpath: three blades, the middle one tallest. */
function tuftPath(ctx: Ctx, x: number, y: number, k: number): void {
  ctx.moveTo(x - k * 1.1, y);
  ctx.quadraticCurveTo(x - k * 0.9, y - k * 0.5, x - k * 1.25, y - k * 1.0);
  ctx.quadraticCurveTo(x - k * 0.45, y - k * 0.75, x - k * 0.3, y - k * 0.35);
  ctx.quadraticCurveTo(x - k * 0.25, y - k * 1.05, x, y - k * 1.5);
  ctx.quadraticCurveTo(x + k * 0.3, y - k * 1.05, x + k * 0.3, y - k * 0.35);
  ctx.quadraticCurveTo(x + k * 0.45, y - k * 0.75, x + k * 1.25, y - k * 1.0);
  ctx.quadraticCurveTo(x + k * 0.9, y - k * 0.5, x + k * 1.1, y);
  ctx.closePath();
}

/** Tufts of grass over the feet at `xs` on the line `y`: a light fill with the ink outline. */
function tufts(ctx: Ctx, u: number, lw: number, y: number, xs: readonly number[]): void {
  const k = u * 0.012;
  ctx.beginPath();
  for (const x of xs) tuftPath(ctx, x, y + k * 0.2, k);
  ctx.fillStyle = GRASS.light;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** A scalloped awning hem from x0 to x1 at y, blue and white by turns, inked along the scallops. */
function awning(ctx: Ctx, u: number, lw: number, x0: number, x1: number, y: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / (u * 0.034)));
  const step = (x1 - x0) / n;
  const top = y - AWNING_H * u;
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x1, top);
  ctx.lineTo(x1, y);
  for (let i = n; i > 0; i--) ctx.arc(x0 + (i - 0.5) * step, y, step / 2, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ctx.fillStyle = CANVAS_BLUE;
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const x = x0 + i * step;
    ctx.moveTo(x, top);
    ctx.lineTo(x + step, top);
    ctx.lineTo(x + step, y);
    ctx.arc(x + step / 2, y, step / 2, 0, Math.PI, false);
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x1, top);
  ctx.lineTo(x1, y);
  for (let i = n; i > 0; i--) ctx.arc(x0 + (i - 0.5) * step, y, step / 2, 0, Math.PI, false);
  ctx.closePath();
  ink(ctx, lw, INK);
}

/** A string of lights along an awning's top, lit from the evening on. */
function lights(ctx: Ctx, u: number, x0: number, x1: number, y: number, on: number): void {
  if (on <= 0.01) return;
  ctx.globalAlpha = on;
  ctx.fillStyle = alpha(LANTERN_GLOW, 0.35);
  ctx.beginPath();
  for (let x = x0 + u * 0.02; x < x1 - u * 0.01; x += u * 0.028) circle(ctx, x, y, u * 0.009);
  ctx.fill();
  ctx.fillStyle = "#fff0b0";
  ctx.beginPath();
  for (let x = x0 + u * 0.02; x < x1 - u * 0.01; x += u * 0.028) circle(ctx, x, y, u * 0.0035);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A stall's two edges on screen, inner then outer; `side` -1 left, +1 right. */
function stallEdges(s: Scene, side: number): [number, number] {
  const cx = s.cssW / 2;
  return [cx + side * STALL_IN * s.u, cx + side * STALL_OUT * s.u];
}

/**
 * A stall's frame, a whole booth between its inner and outer edges: the canvas back, a post at
 * each end planted in the grass behind the counter, the counter (planks, a lit top) down to the
 * grass, tufts at its feet, the awning; `side` -1 left, +1 right.
 */
function stallFrame(ctx: Ctx, s: Scene, side: number, top: number, lw: number, on: number): void {
  const u = s.u;
  const [inner, outer] = stallEdges(s, side);
  const x0 = Math.min(inner, outer);
  const x1 = Math.max(inner, outer);
  const counter = top - COUNTER_UP * u;
  const awn = top - AWNING_UP * u;
  const foot = top + FOOT * u;
  // The back of the stall: a canvas panel from the awning down to the counter, white with a blue band along the top.
  ctx.beginPath();
  ctx.rect(x0 + POST_W * u * 0.5, awn, x1 - x0 - POST_W * u, counter - awn + u * 0.01);
  ctx.fillStyle = CANVAS_WHITE_SHADE;
  ctx.fill();
  ctx.fillStyle = CANVAS_BLUE_SHADE;
  ctx.fillRect(x0 + POST_W * u * 0.5, awn + u * 0.03, x1 - x0 - POST_W * u, u * 0.016);
  ink(ctx, lw * 0.8, INK);
  // The posts at its two ends, from the awning down into the grass (the counter covers their middles).
  ctx.beginPath();
  ctx.rect(x0, awn, POST_W * u, foot - awn);
  ctx.rect(x1 - POST_W * u, awn, POST_W * u, foot - awn);
  ctx.fillStyle = WOOD_DARK.body;
  ctx.fill();
  ctx.fillStyle = WOOD_DARK.light;
  ctx.fillRect(x0 + u * 0.003, awn, u * 0.004, foot - awn);
  ctx.fillRect(x1 - POST_W * u + u * 0.003, awn, u * 0.004, foot - awn);
  ctx.beginPath();
  ctx.rect(x0, awn, POST_W * u, foot - awn);
  ctx.rect(x1 - POST_W * u, awn, POST_W * u, foot - awn);
  ink(ctx, lw * 0.8, INK);
  // The counter's front between the posts: planks down to the grass, a lit top edge.
  const c0 = x0 + POST_W * u * 0.5;
  const c1 = x1 - POST_W * u * 0.5;
  ctx.beginPath();
  ctx.rect(c0, counter, c1 - c0, foot - counter);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ctx.fillStyle = WOOD.shade;
  ctx.beginPath();
  for (let x = c0 + u * 0.03; x < c1 - u * 0.01; x += u * 0.032) ctx.rect(x, counter + u * 0.012, Math.max(1, u * 0.004), foot - counter - u * 0.012);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(c0, counter, c1 - c0, foot - counter);
  ink(ctx, lw, INK);
  ctx.beginPath();
  block(ctx, x0 - u * 0.004, counter - u * 0.008, x1 - x0 + u * 0.008, u * 0.016, u * 0.004);
  ctx.fillStyle = WOOD.light;
  ctx.fill();
  ink(ctx, lw, INK);
  // Grass over the feet of the posts and the counter.
  tufts(ctx, u, lw, foot, [x0 + POST_W * u * 0.5, (x0 + x1) / 2, x1 - POST_W * u * 0.5]);
  // The awning (its top edge at `awn`), and its lights strung just under that edge.
  awning(ctx, u, lw, x0 - u * 0.006, x1 + u * 0.006, awn + AWNING_H * u);
  lights(ctx, u, x0, x1, awn + u * 0.009, on);
}

/** The pretzel stall on the left: pretzels hanging from a rail, gingerbread hearts on the counter's front. */
export function pretzelStall(ctx: Ctx, s: Scene, top: number, lw: number, on: number): void {
  const u = s.u;
  const [inner] = stallEdges(s, -1);
  const counter = top - COUNTER_UP * u;
  const awn = top - AWNING_UP * u;
  stallFrame(ctx, s, -1, top, lw, on);
  // The rail under the awning, and three pretzels hung on it.
  ctx.beginPath();
  ctx.rect(inner - u * 0.172, awn + u * 0.048, u * 0.16, u * 0.006);
  ctx.fillStyle = WOOD_DARK.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  for (let i = 0; i < 3; i++) {
    const x = inner - u * (0.045 + i * 0.048);
    const y = awn + u * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, awn + u * 0.052);
    ctx.lineTo(x, y - u * 0.012);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.beginPath();
    pretzelPath(ctx, x, y, u * 0.04);
    ctx.strokeStyle = INK;
    ctx.lineWidth = u * 0.0085 + lw * 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = PRETZEL.body;
    ctx.lineWidth = u * 0.0085;
    ctx.stroke();
    ctx.fillStyle = SALT;
    ctx.beginPath();
    circle(ctx, x - u * 0.01, y - u * 0.006, u * 0.0022);
    circle(ctx, x + u * 0.008, y - u * 0.012, u * 0.002);
    circle(ctx, x + u * 0.012, y + u * 0.006, u * 0.0022);
    ctx.fill();
  }
  // Gingerbread hearts on the counter's front, iced round the rim with a white dot pattern.
  for (let i = 0; i < 3; i++) {
    const x = inner - u * (0.044 + i * 0.05);
    const y = counter + u * 0.05;
    ctx.beginPath();
    heartPath(ctx, x, y, u * 0.04);
    ctx.fillStyle = GINGER.body;
    ctx.fill();
    ink(ctx, lw, INK);
    ctx.beginPath();
    heartPath(ctx, x, y + u * 0.001, u * 0.027);
    ctx.strokeStyle = i === 1 ? ICING_PINK : ICING;
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.stroke();
    ctx.fillStyle = ICING;
    ctx.beginPath();
    circle(ctx, x - u * 0.0055, y - u * 0.002, u * 0.002);
    circle(ctx, x + u * 0.0055, y - u * 0.002, u * 0.002);
    circle(ctx, x, y + u * 0.0055, u * 0.002);
    ctx.fill();
  }
}

/** Where the sausage stall's pipe stands (u out from the stall's inner edge). */
const PIPE = 0.163;

/** The thin smoke from the sausage stall's pipe: small puffs that rise and fade, kept low (drawn behind the stall). */
export function stallSmoke(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const [inner] = stallEdges(s, 1);
  const awn = top - AWNING_UP * u;
  const px = inner + u * PIPE;
  ctx.fillStyle = "#eef0f4";
  for (let i = 0; i < 3; i++) {
    const k = (s.t / 5 + i / 3) % 1;
    ctx.globalAlpha = 0.7 * Math.sin(k * Math.PI);
    ctx.beginPath();
    // Each puff drifts out (away from the dancers) as it rises.
    circle(ctx, px + k * u * 0.008 + Math.sin(k * 5 + i) * u * 0.003, awn - u * 0.008 - k * u * 0.07, u * (0.005 + k * 0.007));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The sausage stall on the right: a grill of bratwurst on the counter, a pipe up through the awning, a sign. */
export function sausageStall(ctx: Ctx, s: Scene, top: number, lw: number, on: number): void {
  const u = s.u;
  const [inner] = stallEdges(s, 1);
  const counter = top - COUNTER_UP * u;
  const awn = top - AWNING_UP * u;
  stallSmoke(ctx, s, top);
  stallFrame(ctx, s, 1, top, lw, on);
  // The grill on the counter: a dark box with a glowing bed and a grate of bars, sausages on it.
  const gx = inner + u * 0.028;
  const gw = u * 0.135;
  const gy = counter - u * 0.03;
  ctx.beginPath();
  block(ctx, gx, gy, gw, u * 0.034, u * 0.004);
  ctx.fillStyle = GRILL.body;
  ctx.fill();
  ctx.fillStyle = "#ff8c3a";
  ctx.fillRect(gx + u * 0.01, gy + u * 0.012, gw - u * 0.02, u * 0.012);
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.rect(gx - u * 0.004, gy - u * 0.004, gw + u * 0.008, u * 0.006);
  ctx.fillStyle = GRILL.light;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.strokeStyle = GRILL.shade;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.beginPath();
  for (let x = gx + u * 0.012; x < gx + gw; x += u * 0.012) {
    ctx.moveTo(x, gy - u * 0.004);
    ctx.lineTo(x, gy + u * 0.002);
  }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const x = gx + u * 0.022 + i * u * 0.034;
    ctx.beginPath();
    ctx.moveTo(x, gy - u * 0.006);
    ctx.quadraticCurveTo(x + u * 0.013, gy - u * 0.016, x + u * 0.026, gy - u * 0.006);
    ctx.strokeStyle = INK;
    ctx.lineWidth = u * 0.011 + lw * 1.4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = SAUSAGE.body;
    ctx.lineWidth = u * 0.011;
    ctx.stroke();
    ctx.strokeStyle = SAUSAGE.light;
    ctx.lineWidth = u * 0.003;
    ctx.beginPath();
    ctx.moveTo(x + u * 0.004, gy - u * 0.01);
    ctx.lineTo(x + u * 0.01, gy - u * 0.0125);
    ctx.stroke();
  }
  // The pipe up from the grill's back, inside the awning's top edge.
  const px = inner + u * PIPE;
  ctx.beginPath();
  ctx.rect(px - u * 0.007, awn + u * 0.002, u * 0.014, u * 0.022);
  ctx.fillStyle = GRILL.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // A sign on the counter: a little board with a sausage painted on it.
  ctx.beginPath();
  block(ctx, inner + u * 0.03, counter + u * 0.03, u * 0.07, u * 0.04, u * 0.004);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(inner + u * 0.045, counter + u * 0.052);
  ctx.quadraticCurveTo(inner + u * 0.065, counter + u * 0.064, inner + u * 0.085, counter + u * 0.052);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.009 + lw;
  ctx.stroke();
  ctx.strokeStyle = SAUSAGE.body;
  ctx.lineWidth = u * 0.009;
  ctx.stroke();
}

/** The fence's posts on one side (u from the screen's center, signed): at the gate, in the middle, and at the stall. */
export const FENCE_POSTS = [GATE + 0.01, (GATE + STALL_IN) / 2, STALL_IN - 0.02] as const;

/**
 * The fence between the stalls: two rails on each side of the gap, on posts planted in the
 * grass with a tuft at each foot (the rails run on under the stall's corner post).
 */
export function fence(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const railTop = top - FENCE_UP * u;
  const foot = top + FOOT * u;
  for (let side = -1; side <= 1; side += 2) {
    const a = cx + side * GATE * u;
    const b = cx + side * STALL_IN * u;
    const x0 = Math.min(a, b);
    const x1 = Math.max(a, b);
    // Two rails.
    ctx.beginPath();
    block(ctx, x0, railTop, x1 - x0, u * 0.012, u * 0.003);
    block(ctx, x0, railTop + u * 0.034, x1 - x0, u * 0.012, u * 0.003);
    ctx.fillStyle = WOOD.body;
    ctx.fill();
    ctx.fillStyle = WOOD.light;
    ctx.fillRect(x0 + u * 0.004, railTop + u * 0.002, x1 - x0 - u * 0.008, u * 0.004);
    ctx.fillRect(x0 + u * 0.004, railTop + u * 0.036, x1 - x0 - u * 0.008, u * 0.004);
    ink(ctx, lw, INK);
    // The posts, from just over the top rail down into the grass.
    const pw = u * 0.02;
    ctx.beginPath();
    for (const X of FENCE_POSTS) block(ctx, cx + side * X * u - pw / 2, railTop - u * 0.014, pw, foot - railTop + u * 0.014, u * 0.004);
    ctx.fillStyle = WOOD_DARK.body;
    ctx.fill();
    ctx.fillStyle = WOOD_DARK.light;
    for (const X of FENCE_POSTS) ctx.fillRect(cx + side * X * u - pw / 2 + u * 0.004, railTop - u * 0.01, u * 0.005, foot - railTop);
    ink(ctx, lw, INK);
    tufts(
      ctx,
      u,
      lw,
      foot,
      FENCE_POSTS.map((X) => cx + side * X * u),
    );
  }
}

/** The ground along the front: trodden sand over the base band's grass tips, the grass, the gravel path out through the gap, daisies. */
export function frontGround(ctx: Ctx, s: Scene, top: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.fillStyle = TRODDEN.body;
  ctx.fillRect(0, top - u * 0.04, s.cssW, s.cssH - top + u * 0.04);
  ctx.fillStyle = GRASS.body;
  ctx.fillRect(0, top + u * GRASS_AT, s.cssW, s.cssH - top);
  ctx.fillStyle = GRAVEL;
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.1, top - u * 0.04);
  ctx.lineTo(cx + u * 0.1, top - u * 0.04);
  ctx.quadraticCurveTo(cx + u * 0.14, top + u * 0.08, cx + u * 0.2, s.cssH);
  ctx.lineTo(cx - u * 0.2, s.cssH);
  ctx.quadraticCurveTo(cx - u * 0.14, top + u * 0.08, cx - u * 0.1, top - u * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GRAVEL_DARK;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const x = cx + (hash(i + 7300) - 0.5) * u * 0.24;
    const y = top + u * (0.02 + hash(i + 7310) * 0.3);
    if (y > s.cssH) continue;
    oval(ctx, x, y, u * 0.006, u * 0.003);
  }
  ctx.fill();
  // Daisies in the grass, out at the sides of the gap.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = cx + (i < 3 ? -1 : 1) * u * (0.19 + (i % 3) * 0.035);
    const y = top + u * (0.08 + hash(i + 7400) * 0.03);
    if (y > s.cssH) continue;
    circle(ctx, x, y, u * 0.004);
  }
  ctx.fill();
}

export function front(ctx: Ctx, s: Scene): void {
  const top = bandTop(s);
  if (frontTop(s) > s.cssH) return;
  const lw = inkW(s);
  const on = toneOf(s).lights;
  frontGround(ctx, s, top);
  fence(ctx, s, top, lw);
  pretzelStall(ctx, s, top, lw, on);
  sausageStall(ctx, s, top, lw, on);
}

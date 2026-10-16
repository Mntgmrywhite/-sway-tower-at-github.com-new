import { alpha, circle, hash, ink, oval, type Ctx } from "../../base/draw";
import { INK, MOSS, MOSS_DARK, STONE, STONE_CUT, STONE_LIGHT, STONE_SHADE } from "./common";
import { mound, tuft } from "./dirt";

// Weathered cartoon headstones: flat lavender-grey stone lit from the upper left, an ink
// outline, a chip knocked out, a crack, creeping moss and a worn "RIP" cut into the face.
// Each one is planted: its base runs on below the soil and a dirt mound covers it.

export type Stone = "round" | "slab" | "cross";

/** Light catching the lower lip of the cut lettering. */
const ENGRAVE_LIP = alpha("#ffffff", 0.45);

/** Most a stone leans either way, in radians. */
const MAX_TILT = 0.1;

/** Stone outline in local space: base point at the origin, top at -h, running on below the soil. */
function stonePath(ctx: Ctx, kind: Stone, w: number, h: number, seed: number): void {
  const r = w / 2;
  // Runs on a little under the mound, so a lean never lifts a corner into view; kept shallow so
  // the corner the lean pushes down stays inside the mound's front skirt too (it drops by
  // r * sin(MAX_TILT) ≈ 0.05w, and the skirt there is ≈ 0.1w deep).
  const sunk = w * 0.02;
  ctx.beginPath();
  if (kind === "round") {
    // Rounded top with a chip knocked out of it
    const cy = -h + r;
    const chip = Math.PI * (1.25 + hash(seed + 1) * 0.5);
    const a0 = chip - 0.2;
    const a1 = chip + 0.2;
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, cy);
    ctx.arc(0, cy, r, Math.PI, a0);
    ctx.lineTo(Math.cos(chip) * r * 0.74, cy + Math.sin(chip) * r * 0.74);
    ctx.arc(0, cy, r, a1, Math.PI * 2);
    ctx.lineTo(r, sunk);
  } else if (kind === "slab") {
    // Square shoulders and a pointed cap, one corner broken off
    ctx.moveTo(-r, sunk);
    ctx.lineTo(-r, -h * 0.74);
    ctx.lineTo(-r * 0.62, -h * 0.84);
    ctx.lineTo(-r * 0.2, -h);
    ctx.lineTo(r * 0.12, -h * 0.97);
    ctx.lineTo(r * 0.3, -h * 0.9);
    ctx.lineTo(r * 0.42, -h * 0.93);
    ctx.lineTo(r * 0.62, -h * 0.84);
    ctx.lineTo(r, -h * 0.74);
    ctx.lineTo(r, sunk);
  } else {
    // Cross, one arm worn short
    const pw = w * 0.19;
    const ay = -h * 0.7;
    const ah = w * 0.17;
    ctx.moveTo(-pw, sunk);
    ctx.lineTo(-pw, ay + ah);
    ctx.lineTo(-r, ay + ah);
    ctx.lineTo(-r, ay - ah);
    ctx.lineTo(-pw, ay - ah);
    ctx.lineTo(-pw, -h);
    ctx.lineTo(pw, -h);
    ctx.lineTo(pw, ay - ah);
    ctx.lineTo(r, ay - ah * 0.8);
    ctx.lineTo(r * 0.9, ay + ah);
    ctx.lineTo(pw, ay + ah);
    ctx.lineTo(pw, sunk);
  }
  ctx.closePath();
}

/** A weathered headstone: leaning, chipped, cracked, mossy, with a worn "RIP", planted in a mound. */
export function tombstone(ctx: Ctx, x: number, y: number, w: number, h: number, kind: Stone, seed: number, lw: number): void {
  const tilt = (hash(seed) - 0.5) * 2 * MAX_TILT;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  stonePath(ctx, kind, w, h, seed);
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Moonlight from the upper left: lit left face, shaded right face and foot.
  ctx.fillStyle = STONE_LIGHT;
  ctx.fillRect(-w / 2, -h, w * 0.24, h * 1.2);
  ctx.fillStyle = STONE_SHADE;
  ctx.fillRect(w * 0.3, -h, w * 0.2, h * 1.2);
  ctx.fillRect(-w / 2, -h * 0.12, w, h * 0.3);
  // Moss creeping up from the soil, and a patch higher up
  ctx.fillStyle = MOSS;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) circle(ctx, -w / 2 + (i / 5) * w, -h * 0.08, w * (0.08 + hash(seed + 30 + i) * 0.09));
  oval(ctx, -w * (0.1 + hash(seed + 41) * 0.2), -h * (0.45 + hash(seed + 42) * 0.25), w * 0.12, w * 0.07);
  ctx.fill();
  ctx.fillStyle = MOSS_DARK;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) circle(ctx, -w / 2 + ((i + 0.5) / 4) * w, -h * 0.02, w * 0.06);
  ctx.fill();
  ctx.restore();
  stonePath(ctx, kind, w, h, seed);
  ink(ctx, lw, INK);

  // Crack running down from the top edge
  ctx.beginPath();
  let cx = (hash(seed + 2) - 0.5) * w * (kind === "cross" ? 0.12 : 0.4);
  let cy = -h + (kind === "round" ? w * 0.5 - Math.sqrt(Math.max(0, (w * w) / 4 - cx * cx)) : h * 0.06);
  ctx.moveTo(cx, cy);
  for (let i = 0; i < 4; i++) {
    cx += (hash(seed + 60 + i) - 0.5) * w * 0.26;
    cy += h * 0.09;
    ctx.lineTo(cx, cy);
  }
  ink(ctx, Math.max(1, lw * 0.6), INK);

  // Worn lettering, cut into the stone: a dark groove with a lit lower lip.
  if (kind !== "cross") {
    ctx.font = `700 ${Math.round(w * 0.3)}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = ENGRAVE_LIP;
    ctx.fillText("RIP", 0, -h * 0.5 + Math.max(1, w * 0.025));
    ctx.fillStyle = STONE_CUT;
    ctx.fillText("RIP", 0, -h * 0.5);
  }
  ctx.restore();

  mound(ctx, x, y + w * 0.04, w * 0.9, w * 0.27, seed, lw);
  tuft(ctx, x - w * 0.66, y + w * 0.08, w * 0.3, seed * 7, lw);
}

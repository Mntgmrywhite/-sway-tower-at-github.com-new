import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, HAIRS, LIDS, PURPLE, SHIRTS, SHOES, SKINS } from "./colors";
import { draw, folk, toFigure, type Folk } from "./folk";
import { CATCH_AHEAD, CATCH_UP, catchReach, LOWER, SEAT_UP, SEATS, THROW_COUNT, throwAt, throwSeat } from "./parade";
import { curbTop, JUMPER } from "./place";
import { blinkAt, CHILD, dance, glance, pick, shoulderY, sit, smooth } from "./rig";

// The crowd at the near curb, in front of the parade (the characters' side of front.ts, which
// draws the curb and its props and calls these where the folk go), papier-mâché kids on their
// rigs: the two sitting on the parade ladder's seat box at the right (one in a cap, one in a
// skeleton suit), swinging their legs and looking about, reaching up for throws, and the kid in a
// jester's cap at the left, who dances on the curb and jumps for the string the skeleton krewe
// tosses her. Their timing is a function of the scene's clock: the ladder kids reach up on their
// own rhythm and whenever a float's beads are on their way to them.

/**
 * The ladder's kids: one in a cap, one in a skeleton suit with its skull hood up. His suit is
 * Carnival green, not the krewe's dark tailcoats: the skeletons' float passes right behind the
 * seat as they toss him his beads, and a dark suit there would vanish among them.
 */
const RIDERS: Folk[] = [
  folk({ b: CHILD, skin: SKINS[0]!, hair: HAIRS[1]!, hairDo: "short", top: SHIRTS[1]!, bottom: PURPLE, shoes: SHOES, hat: "cap", hatColor: GREEN, hatTrim: GOLD, mask: "none", maskColor: GOLD, lids: LIDS.blue }, 0.5, 301, 1),
  folk({ b: CHILD, skin: SKINS[2]!, hair: HAIRS[0]!, hairDo: "short", top: GREEN, bottom: GREEN, shoes: SHOES, pattern: "ribs", bones: true, hat: "hood", hatColor: GREEN, mask: "none", maskColor: GOLD, lids: LIDS.teal, gloves: true }, 0.5, 302, -1),
];
const KID: Folk = folk(
  { b: CHILD, skin: SKINS[1]!, hair: HAIRS[4]!, hairDo: "braids", top: SHIRTS[2]!, bottom: GREEN, shoes: SHOES, hat: "jester", hatColor: PURPLE, mask: "none", maskColor: GOLD, lids: LIDS.violet, collar: "ruff", collarColor: PURPLE },
  JUMPER.size,
  303,
  1,
);

/** Whether the kids reach up at time t (0 at ease, 1 arms up), on their own rhythm. */
export function reachAt(t: number): number {
  const k = ((t % 6) + 6) % 6;
  const up = k < 0.5 ? k / 0.5 : k < 2.2 ? 1 : k < 2.7 ? 1 - (k - 2.2) / 0.5 : 0;
  return up * up * (3 - 2 * up);
}

/** Whether ladder kid `seat` reaches up at time t: on their rhythm (the second a beat after the first, copying him), and whenever the float's beads are on their way to them. */
export function seatReach(t: number, seat: number): number {
  let r = reachAt(t - seat * 1.3);
  for (let i = 0; i < THROW_COUNT; i++) {
    if (throwSeat(i) !== seat) continue;
    const th = throwAt(t, i);
    if (th.wind >= 0) r = Math.max(r, th.wind);
    else if (th.flight >= 0) r = 1;
    else if (th.landed >= 0) r = Math.max(r, 1 - smooth(th.landed / LOWER));
  }
  return r;
}

const P = { x: 0, y: 0 };

/** The two kids on the ladder's seat box (`x` the ladder's center, `seat` the legs' top, `sh` the box's height): drawn before the box's front, so their legs hang behind it. */
export function ladderRiders(ctx: Ctx, s: Scene, x: number, seat: number, sh: number, lw: number): void {
  const u = s.u;
  const top = seat - sh;
  for (let i = 0; i < RIDERS.length; i++) {
    const f = RIDERS[i]!;
    const p = f.pose;
    const b = f.look.b;
    const reach = seatReach(s.t, i);
    const rx = x + (i ? u * 0.024 : -u * 0.024);
    p.t = s.t;
    // Sitting on the box's top (the figure's origin), legs swinging over its front; rising off
    // it to reach up for a throw.
    const kick = Math.sin(s.t * (2.6 + i * 0.5) + i * 1.7);
    sit(p, b, 0.004 + reach * 0.03, kick * (1 - reach));
    p.nearY = 0.03 + kick * 0.004 * (1 - reach);
    p.farY = 0.032 - kick * 0.004 * (1 - reach);
    p.lean = 0.05 * Math.sin(s.t * 1.7 + i) - reach * 0.08;
    p.twist = 0.4 * Math.sin(s.t * 1.7 + i);
    const lk = glance(s.t, f.id, 0.4, 0.7);
    p.turn = lk.turn * (1 - reach) + 0.6 * reach;
    p.tilt = lk.tilt * (1 - reach) - 0.3 * reach;
    p.blink = reach > 0.2 ? 0 : blinkAt(s.t, f.id);
    // Arms up to the throw's catch, or waving.
    toFigure(f, s.cssW / 2 + SEATS[i]! * u, curbTop(s) - u * SEAT_UP, rx, top, u, P);
    const sh0 = shoulderY(p, b);
    const wave = Math.sin(s.t * 4 + i * 2);
    p.handNX = 0.03 + (P.x + 0.006 - 0.03) * reach;
    p.handNY = sh0 + 0.04 + wave * 0.006 + (P.y - sh0 - 0.04) * reach;
    p.handFX = -0.02 + (P.x - 0.006 + 0.02) * reach;
    p.handFY = sh0 + 0.042 - wave * 0.006 + (P.y - sh0 - 0.042) * reach;
    p.elbowN = 1;
    p.elbowF = 1;
    p.mouth = 0.2 + reach * 0.7;
    p.swing = kick;
    draw(ctx, f, rx, top, u, lw);
  }
}

/** Whether the kid at the left of the curb reaches up at time t: on her own rhythm, and whenever the skeletons' beads are on their way to her. */
export function jumperReach(t: number): number {
  return Math.max(reachAt(t + 2.5), catchReach(t, "jumper", 0));
}

/** A kid in a jester's cap at the left of the curb (`top` the curb's top), dancing, and jumping with her arms up for the throws. */
export function jumper(ctx: Ctx, s: Scene, top: number, lw: number): void {
  const u = s.u;
  const f = KID;
  const p = f.pose;
  const b = f.look.b;
  const reach = jumperReach(s.t);
  p.t = s.t;
  dance(p, b, s.t * 1.15 + pick(f.id, 0, 1), 0.8);
  const lk = glance(s.t, f.id, 0.5, 0.6);
  p.turn = lk.turn * (1 - reach) + 0.4 * reach;
  p.tilt = lk.tilt * (1 - reach) - 0.3 * reach;
  p.blink = reach > 0.2 ? 0 : blinkAt(s.t, f.id);
  // Arms up, the hands meeting over her head where a throw comes down (CATCH_UP, CATCH_AHEAD); a hop.
  const sh = shoulderY(p, b);
  const sway = Math.sin(s.t * 2.3);
  p.handNX = 0.032 + (CATCH_AHEAD + 0.006 - 0.032) * reach;
  p.handNY = sh + 0.03 + sway * 0.01 + (-CATCH_UP - sh - 0.03) * reach;
  p.handFX = -0.03 + (CATCH_AHEAD - 0.006 + 0.03) * reach;
  p.handFY = sh + 0.034 - sway * 0.01 + (-CATCH_UP - sh - 0.034) * reach;
  p.elbowN = 1;
  p.elbowF = 1;
  const hop = reach * Math.max(0, Math.sin(s.t * 8)) * 0.02;
  p.hipY += hop;
  p.nearY -= hop;
  p.farY -= hop;
  p.mouth = 0.3 + reach * 0.6;
  draw(ctx, f, s.cssW / 2 + JUMPER.x * u, top + u * 0.004, u, lw);
}

/** For tests: the curb's kids, as last drawn. */
export function curbFolk(): readonly Folk[] {
  return [RIDERS[0]!, RIDERS[1]!, KID];
}

import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, HAIRS, LIDS, PURPLE, SHIRTS, SHOES, SKINS, TAILS, VIOLET, type Shades } from "./colors";
import { draw, folk, toFigure, toScreen, type Folk, type Look } from "./folk";
import { CATCH_AHEAD, CATCH_UP, catchReach, LOWER, THROW_COUNT, throwAt, throwKid } from "./parade";
import { inkW, KID_SPOTS, kidCatch, LITTLE, SIDEWALK, streetLevel } from "./place";
import { beadString } from "./props";
import { blinkAt, build, CHILD, dance, glance, now, pick, shoulderY, smooth } from "./rig";
import { deckY } from "./street";

// The family on the left house's gallery and the kids on the sidewalk below, papier-mâché folk
// on their rigs (folk.ts). Three of them stand at the rail: the mother in a sequined mask with a
// plume, the father in a feathered one, the little one in a jester's cap, sized to the house (the
// French doors are a grown-up's height). Between tosses they sway to the band, a hand on the
// rail, turning to watch the parade and each other; the father winds up and tosses a string of
// beads down to the kids, the mother another a few seconds later, and the little one waves and
// bounces, and reaches up to catch the string a skeleton tosses up to him from its float; each
// toss flings a handful of confetti after it. Below, two kids (one in a skeleton suit) bounce and
// look about, and jump with their arms up to catch what comes down, from the gallery or from the
// float as it passes. The first tosses land within the first seconds of a tower (the owner's
// rule), and they keep coming round every TOSS_EVERY seconds, for as long as you stand there.
// Everything is a function of the scene's clock. Positions are in u from the screen center.

/** Who stands where on the gallery (u from center), their size, and who they toss to. */
const FAMILY = [
  { x: -0.44, size: 0.49, tossTo: 1 },
  { x: -0.385, size: 0.5, tossTo: 0 },
  { x: LITTLE.x, size: LITTLE.size, tossTo: -1 },
] as const;

const LOOKS: readonly Look[] = [
  // The mother: a violet bodice over a green skirt with a gold frill, a green sequined mask and a pink plume, her hair up.
  { b: build({ waistW: 0.016, hipW: 0.02 }), skin: SKINS[1]!, hair: HAIRS[0]!, hairDo: "bun", top: VIOLET, bottom: VIOLET, shoes: SHOES, skirt: GREEN, frill: GOLD, skirtLen: 0.075, hat: "none", hatColor: GOLD, mask: "sequin", maskColor: GREEN, lids: LIDS.violet, beads: [GOLD, PURPLE] },
  // The father: a green shirt under a purple vest, a gold feathered mask.
  { b: build({ belly: 0.004 }), skin: SKINS[2]!, hair: HAIRS[3]!, hairDo: "short", top: GREEN, bottom: PURPLE, shoes: SHOES, vest: PURPLE, hat: "none", hatColor: GOLD, mask: "feather", maskColor: GOLD, lids: LIDS.gold, beads: [GREEN] },
  // The little one: gold with a green ruff, a purple jester's cap.
  { b: CHILD, skin: SKINS[0]!, hair: HAIRS[1]!, hairDo: "short", top: GOLD, bottom: PURPLE, shoes: SHOES, hat: "jester", hatColor: PURPLE, mask: "none", maskColor: GOLD, lids: LIDS.teal, collar: "ruff", collarColor: GREEN },
];
const FOLKS: Folk[] = FAMILY.map((p, i) => folk(LOOKS[i]!, p.size, 201 + i, p.tossTo === 0 ? -1 : 1));

/** The kids on the sidewalk: the first in a striped shirt and a cap of curls, the second in a skeleton suit with its hood up. */
const KIDS: Folk[] = [
  folk({ b: CHILD, skin: SKINS[3]!, hair: HAIRS[2]!, hairDo: "curly", top: SHIRTS[0]!, bottom: PURPLE, shoes: SHOES, pattern: "stripes", patternColor: GOLD, hat: "none", hatColor: GOLD, mask: "none", maskColor: GOLD, lids: LIDS.blue }, KID_SPOTS[0].size, 211, 1),
  folk({ b: CHILD, skin: SKINS[2]!, hair: HAIRS[3]!, hairDo: "short", top: TAILS, bottom: TAILS, shoes: SHOES, pattern: "ribs", bones: true, hat: "hood", hatColor: TAILS, mask: "none", maskColor: GOLD, lids: LIDS.rose, gloves: true }, KID_SPOTS[1].size, 212, -1),
];

/** When each tosser first winds up (s), and how often the tosses come round. */
export const TOSS_AT = [1.0, 3.4] as const;
export const TOSS_EVERY = 5;
/** A toss: the wind-up, the throw, and the beads' flight (s). */
const WIND = 0.4;
const THROW = 0.2;
const FLIGHT = 0.9;
/** How high the beads arc above a straight line from the hand to the catch (u). */
const ARC = 0.06;
/** A tosser's hand: holding the beads up by the shoulder, drawn back in the wind-up, out at the release (figure units, from the feet). */
const HOLD = { x: 0.026, y: -0.118 };
const WOUND = { x: -0.012, y: -0.17 };
const RELEASE = { x: 0.056, y: -0.155 };

/** Scratch result of `tossAt`. */
const TOSS = { k: -1, flight: -1, landed: -1, n: 0 };

/**
 * Where tosser `i` is in a toss at time t: `k` 0..1 through the wind-up and throw (or -1 at
 * rest), `flight` 0..1 while the beads fly (or -1), how long ago they were caught (within
 * LOWER of it, or -1), and which toss it is.
 */
export function tossAt(t: number, i: number): typeof TOSS {
  const at = TOSS_AT[i]!;
  TOSS.k = -1;
  TOSS.flight = -1;
  TOSS.landed = -1;
  // Before the first toss the string in hand is the first one's (and never the last call's).
  TOSS.n = 0;
  if (t < at) return TOSS;
  const n = Math.floor((t - at) / TOSS_EVERY);
  const e = t - at - n * TOSS_EVERY;
  TOSS.n = n;
  if (e < WIND + THROW) TOSS.k = e / (WIND + THROW);
  else if (e < WIND + THROW + FLIGHT) TOSS.flight = (e - WIND - THROW) / FLIGHT;
  else if (e < WIND + THROW + FLIGHT + LOWER) TOSS.landed = e - WIND - THROW - FLIGHT;
  return TOSS;
}

/** Whether kid `j` is reaching up for beads at time t (0 standing, 1 arms up and jumping): the family's tosses, and the float's throws as it passes. */
export function reachAt(t: number, j: number): number {
  let reach = 0;
  for (let i = 0; i < FAMILY.length; i++) {
    if (FAMILY[i]!.tossTo !== j) continue;
    const toss = tossAt(t, i);
    if (toss.flight >= 0) reach = Math.max(reach, smooth((toss.flight - 0.3) / 0.3));
    else if (toss.landed >= 0) reach = Math.max(reach, 1 - smooth(toss.landed / LOWER));
  }
  for (let i = 0; i < THROW_COUNT; i++) {
    if (throwKid(i) !== j) continue;
    const th = throwAt(t, i);
    if (th.flight >= 0) reach = Math.max(reach, smooth((th.flight - 0.2) / 0.3));
    else if (th.landed >= 0) reach = Math.max(reach, 1 - smooth(th.landed / LOWER));
  }
  return reach;
}

/** How much the little one on the gallery reaches up for the skeletons' beads at time t (0 waving, 1 both hands up together). */
export function littleReach(t: number): number {
  return catchReach(t, "gallery", 0, 0.1);
}

/** The bead colors the tosses come in, by toss. */
const BEAD_COLORS: readonly Shades[] = [PURPLE, GOLD, GREEN];

/** Scratch: where a toss's beads are now (screen px). */
const BEADS = { x: 0, y: 0, spin: 0 };
const P = { x: 0, y: 0 };

/** A grown-up at the rail between tosses: swaying to the band, the free hand on the rail, watching the parade go by and looking about. */
function atEase(f: Folk, t: number, railY: number): void {
  const p = f.pose;
  const b = f.look.b;
  dance(p, b, t * (0.9 + pick(f.id, 1, 1) * 0.2) + pick(f.id, 2, 1), 0.35);
  const lk = glance(t, f.id, 0.35, 0.75);
  p.turn = lk.turn;
  p.tilt = lk.tilt;
  p.blink = blinkAt(t, f.id);
  p.mouth = 0.25 + 0.2 * now(t, f.id, 5.5, 1.4);
  p.handFX = -0.006;
  p.handFY = railY;
  p.elbowF = 1;
}

/**
 * The family on the gallery, drawn before its rail (`deck` is the rail's foot): the two
 * tossers sway, wind up and throw; the little one waves, bounces and catches. The beads in flight
 * and the confetti are drawn over the rail by `beadsInFlight`.
 */
export function familyOnDeck(ctx: Ctx, s: Scene, deck: number): void {
  const u = s.u;
  const lw = inkW(s);
  for (let i = 0; i < FAMILY.length; i++) {
    const at = FAMILY[i]!;
    const f = FOLKS[i]!;
    const p = f.pose;
    const b = f.look.b;
    const x = s.cssW / 2 + at.x * u;
    p.t = s.t;
    // The rail's top in the figure's frame (it is RAIL_H tall).
    const railY = -(0.034 * u) / (u * f.size) + 0.004;
    if (at.tossTo < 0) {
      // The little one waves with both arms and bounces; when a skeleton tosses him a string,
      // his hands come up together over his head to catch it, and he hops.
      const r = littleReach(s.t);
      dance(p, b, s.t * 1.25, 0.6 + 0.4 * r);
      const w = Math.sin(s.t * 5.2);
      const sh = shoulderY(p, b);
      p.handNX = 0.04 + (CATCH_AHEAD + 0.006 - 0.04) * r;
      p.handNY = sh - 0.03 + w * 0.012 * (1 - r) + (-CATCH_UP - (sh - 0.03)) * r;
      p.handFX = -0.03 + (CATCH_AHEAD - 0.006 + 0.03) * r;
      p.handFY = sh - 0.026 - w * 0.012 * (1 - r) + (-CATCH_UP - (sh - 0.026)) * r;
      p.elbowN = 1;
      p.elbowF = 1;
      const hop = r * Math.max(0, Math.sin(s.t * 9)) * 0.012;
      p.hipY += hop;
      p.nearY -= hop;
      p.farY -= hop;
      p.mouth = 0.6 + r * 0.3;
      p.turn = 0.3 + 0.3 * Math.sin(s.t * 0.9);
      p.blink = blinkAt(s.t, f.id);
      p.swing = Math.sin(s.t * 5.2 - 1.2);
      p.bob = Math.sin(s.t * 9 - 1.1);
    } else {
      atEase(f, s.t, railY);
      const toss = tossAt(s.t, i);
      // At rest the near hand holds the beads up by the shoulder; the wind-up draws it back and
      // up, the throw swings it out and down, the body leaning into it.
      let hx = HOLD.x;
      let hy = HOLD.y;
      p.elbowN = 1;
      if (toss.k >= 0) {
        const wind = smooth(Math.min(1, toss.k / (WIND / (WIND + THROW))));
        const thr = smooth(Math.max(0, (toss.k - WIND / (WIND + THROW)) / (THROW / (WIND + THROW))));
        hx = HOLD.x + (WOUND.x - HOLD.x) * wind + (RELEASE.x - WOUND.x) * thr;
        hy = HOLD.y + (WOUND.y - HOLD.y) * wind + (RELEASE.y - WOUND.y) * thr;
        p.lean += -wind * 0.12 + thr * 0.3;
        p.mouth = 0.3 + thr * 0.6;
        p.turn = 0.8;
        p.elbowN = 1;
      } else if (toss.flight >= 0) {
        // Following the beads down with his eyes, the arm coming back.
        const back = smooth(toss.flight);
        hx = RELEASE.x + (HOLD.x - RELEASE.x) * back;
        hy = RELEASE.y + (HOLD.y + 0.05 - RELEASE.y) * back;
        p.turn = 0.9;
        p.tilt = 0.2;
        p.mouth = 0.7;
      }
      p.handNX = hx;
      p.handNY = hy;
    }
    draw(ctx, f, x, deck, u, lw);
    // The beads in hand, before they fly.
    if (at.tossTo >= 0 && tossAt(s.t, i).flight < 0) {
      const h = toScreen(f, f.rig.wrN, x, deck, u, P);
      beadString(ctx, h.x, h.y + u * 0.002, u * 0.016, BEAD_COLORS[(tossAt(s.t, i).n + i) % 3]!, lw * 0.5);
    }
  }
}

/** Where tosser `i`'s beads are in their flight (screen px), from the hand's release to the kid's hands. */
function beadsAt(s: Scene, i: number, flight: number): typeof BEADS {
  const p = FAMILY[i]!;
  const u = s.u;
  const deck = deckY(s, 1);
  const x0 = s.cssW / 2 + p.x * u + (p.tossTo === 0 ? -1 : 1) * RELEASE.x * u * p.size;
  const y0 = deck + RELEASE.y * u * p.size;
  const to = kidCatch(s, p.tossTo);
  BEADS.x = x0 + (to.x - x0) * flight;
  BEADS.y = y0 + (to.y - y0) * flight - ARC * u * 4 * flight * (1 - flight);
  BEADS.spin = flight * 7;
  return BEADS;
}

/** Confetti flung with each toss: bits that flutter down from the gallery, each on its own drift. */
const CONFETTI = Array.from({ length: 9 }, (_, i) => ({
  dx: (hash(i + 9500) - 0.5) * 0.08,
  sp: 0.6 + hash(i + 9510) * 0.5,
  ph: hash(i + 9520) * 6,
  c: i % 3,
}));
const CONFETTI_COLORS = [PURPLE.body, GREEN.body, GOLD.body];

/** The beads in flight and the confetti fluttering after them, drawn over the gallery's rail. */
export function beadsInFlight(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  for (let i = 0; i < FAMILY.length; i++) {
    const p = FAMILY[i]!;
    if (p.tossTo < 0) continue;
    const toss = tossAt(s.t, i);
    if (toss.flight < 0) continue;
    const b = beadsAt(s, i, toss.flight);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.spin);
    beadString(ctx, 0, -u * 0.012, u * 0.024, BEAD_COLORS[(toss.n + i) % 3]!, lw * 0.5);
    ctx.restore();
    // Confetti: thrown with the beads, fluttering down more slowly and fading.
    const x0 = s.cssW / 2 + p.x * u;
    const y0 = deckY(s, 1) - 0.1 * u * p.size;
    const fall = toss.flight * 1.3;
    for (const c of CONFETTI) {
      const d = Math.min(1, fall * c.sp);
      ctx.globalAlpha = 1 - d * d;
      ctx.fillStyle = CONFETTI_COLORS[c.c]!;
      const x = x0 + c.dx * u * (0.3 + d) + Math.sin(d * 9 + c.ph) * u * 0.012;
      const y = y0 + d * u * 0.12;
      ctx.beginPath();
      ctx.rect(x - u * 0.004, y - u * 0.0025, u * 0.008, u * 0.005);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** The kids on the sidewalk below the gallery: bouncing and looking about, jumping with their arms up as the beads come down. */
export function sidewalkKids(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const foot = streetLevel(s) + SIDEWALK * u;
  for (let j = 0; j < KIDS.length; j++) {
    const k = KID_SPOTS[j]!;
    const f = KIDS[j]!;
    const p = f.pose;
    const b = f.look.b;
    const x = s.cssW / 2 + k.x * u;
    p.t = s.t;
    const r = reachAt(s.t, j);
    dance(p, b, s.t * (1.1 + j * 0.23) + j * 0.4, 0.5 + r * 0.5);
    const lk = glance(s.t, f.id, 0.3, 0.8);
    p.turn = lk.turn * (1 - r) + 0.5 * r;
    p.tilt = lk.tilt * (1 - r) - 0.25 * r;
    p.blink = r > 0.2 ? 0 : blinkAt(s.t, f.id);
    // Arms up to the catch, hands meeting where the beads come down; a hop as they reach.
    const c = kidCatch(s, j);
    toFigure(f, c.x, c.y, x, foot, u, P);
    const sh = shoulderY(p, b);
    const idle = Math.sin(s.t * (3 + j) + j * 2);
    p.handNX = 0.03 + (P.x + 0.006 - 0.03) * r;
    p.handNY = sh + 0.045 + idle * 0.004 + (P.y - (sh + 0.045)) * r;
    p.handFX = -0.03 + (P.x - 0.006 + 0.03) * r;
    p.handFY = sh + 0.045 - idle * 0.004 + (P.y - (sh + 0.045)) * r;
    p.elbowN = 1;
    p.elbowF = 1;
    const hop = r * Math.max(0, Math.sin(s.t * 9 + j)) * 0.022;
    p.hipY += hop;
    p.nearY -= hop;
    p.farY -= hop;
    p.mouth = 0.2 + r * 0.7;
    draw(ctx, f, x, foot, u, lw);
  }
}

/** For tests: a figure on the gallery or the sidewalk as it was last drawn. */
export function familyFolk(i: number): Folk {
  return FOLKS[i]!;
}
export function sidewalkFolk(j: number): Folk {
  return KIDS[j]!;
}


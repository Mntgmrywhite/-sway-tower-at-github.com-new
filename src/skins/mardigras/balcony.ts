import { hash, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, HAIRS, INK, PURPLE, SHIRTS, SKINS, TAILS, VIOLET, type Shades } from "./colors";
import { figure, nearHand, standing, type Figure } from "./folk";
import { CATCH_AHEAD, CATCH_UP, catchReach, LOWER, THROW_COUNT, throwAt, throwKid } from "./parade";
import { inkW, KID_SPOTS, kidCatch, LITTLE, SIDEWALK, streetLevel } from "./place";
import { beadLoop } from "./shapes";
import { deckY } from "./street";

// The family on the left house's gallery and the kids on the sidewalk below. Three of them
// stand at the rail, the mother in a sequined mask with a plume, the father in a feathered one
// and the little one in a jester's hat, sized to the house (the French doors are a grown-up's
// height): the father winds up and tosses a string of beads down to the kids, the mother another
// a few seconds later, and the little one waves, and reaches up to catch the string a skeleton
// tosses up to him from its float; each toss flings a handful of confetti after it. Below, two
// kids (one in a skeleton suit) jump with their arms up to catch what comes down, from the
// gallery or from the float as it passes. The first tosses land within the first seconds of a tower (the owner's
// rule), and they keep coming round every TOSS_EVERY seconds, for as long as you stand there.
// Everything is a function of the scene's clock. Positions are in u from the screen center.

/** Who stands where on the gallery (u from center), their size, and who they toss to. */
const FAMILY = [
  { x: -0.44, size: 0.56, mask: "sequin" as const, maskColor: GREEN, skirt: true, tossTo: 1, top: VIOLET, bottom: GREEN, skin: 1, hair: 0 },
  { x: -0.385, size: 0.6, mask: "feather" as const, maskColor: GOLD, skirt: false, tossTo: 0, top: GREEN, bottom: PURPLE, skin: 2, hair: 3 },
  { x: LITTLE.x, size: LITTLE.size, mask: "none" as const, maskColor: GOLD, skirt: false, tossTo: -1, top: GOLD, bottom: PURPLE, skin: 0, hair: 1 },
] as const;
/** The kids on the sidewalk: where they stand and their size (place.ts), their shirt, skin and hair; the second in a skeleton suit. */
const KIDS = KID_SPOTS.map((k, j) => ({ ...k, ...[{ shirt: 0, skin: 3, hair: 2, bones: false }, { shirt: 3, skin: 2, hair: 3, bones: true }][j]! }));

/** When each tosser first winds up (s), and how often the tosses come round. */
export const TOSS_AT = [1.0, 3.4] as const;
export const TOSS_EVERY = 5;
/** A toss: the wind-up, the throw, and the beads' flight (s). */
const WIND = 0.4;
const THROW = 0.2;
const FLIGHT = 0.9;
/** How high the beads arc above a straight line from the hand to the catch (u). */
const ARC = 0.06;

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
    if (toss.flight >= 0) reach = Math.max(reach, smoothstep((toss.flight - 0.3) / 0.3));
    else if (toss.landed >= 0) reach = Math.max(reach, 1 - smoothstep(toss.landed / LOWER));
  }
  for (let i = 0; i < THROW_COUNT; i++) {
    if (throwKid(i) !== j) continue;
    const th = throwAt(t, i);
    if (th.flight >= 0) reach = Math.max(reach, smoothstep((th.flight - 0.2) / 0.3));
    else if (th.landed >= 0) reach = Math.max(reach, 1 - smoothstep(th.landed / LOWER));
  }
  return reach;
}

function smoothstep(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

const POSES: Figure[] = FAMILY.map((p) => {
  const f = standing(p.top, p.bottom, SKINS[p.skin]!, HAIRS[p.hair]!);
  f.size = p.size;
  f.mask = p.mask;
  f.maskColor = p.maskColor;
  if (p.tossTo < 0) {
    f.hat = "jester";
    f.hatColor = GOLD;
  }
  f.skirt = p.skirt;
  return f;
});
const KID_POSES: Figure[] = KIDS.map((k) => {
  const f = k.bones ? standing(TAILS, TAILS, SKINS[k.skin]!, HAIRS[k.hair]!) : standing(SHIRTS[k.shirt]!, PURPLE, SKINS[k.skin]!, HAIRS[k.hair]!);
  f.size = k.size;
  if (k.bones) {
    f.suit = "bones";
    f.skull = true;
  }
  return f;
});

/** How much the little one on the gallery reaches up for the skeletons' beads at time t (0 waving, 1 both hands up together). */
export function littleReach(t: number): number {
  return catchReach(t, "gallery", 0, 0.1);
}

/** The bead colors the tosses come in, by toss. */
const BEAD_COLORS: readonly Shades[] = [PURPLE, GOLD, GREEN];

/** Scratch: where a toss's beads are now (screen px). */
const BEADS = { x: 0, y: 0, spin: 0 };

/**
 * The family on the gallery, drawn before its rail (`deck` is the rail's foot): the two
 * tossers wind up and throw, the little one waves. Returns nothing; the beads in flight and the
 * confetti are drawn over the rail by `beadsInFlight`.
 */
export function familyOnDeck(ctx: Ctx, s: Scene, deck: number): void {
  const u = s.u;
  const lw = inkW(s);
  for (let i = 0; i < FAMILY.length; i++) {
    const p = FAMILY[i]!;
    const f = POSES[i]!;
    const x = s.cssW / 2 + p.x * u;
    f.m = p.tossTo === 0 ? -1 : 1;
    f.lean = 0;
    f.lift = 0;
    f.mouth = 0.2;
    if (p.tossTo < 0) {
      // The little one waves with both arms, bouncing; when a skeleton tosses him a string, his
      // hands come up together over his head to catch it (CATCH_UP, CATCH_AHEAD), and he hops.
      const w = Math.sin(s.t * 5);
      const r = littleReach(s.t);
      f.handLx = -0.02 + r * (CATCH_AHEAD - 0.008 + 0.02);
      f.handLy = -0.17 + w * 0.012 * (1 - r) - r * (CATCH_UP - 0.17);
      f.handRx = 0.03 + r * (CATCH_AHEAD + 0.008 - 0.03);
      f.handRy = -0.165 - w * 0.012 * (1 - r) - r * (CATCH_UP - 0.165);
      f.lift = Math.max(0, Math.sin(s.t * 2.5)) * 0.01 * (1 - r) + r * Math.max(0, Math.sin(s.t * 9)) * 0.012;
      f.mouth = 0.6 + r * 0.3;
    } else {
      const toss = tossAt(s.t, i);
      // At rest: the near hand holds the beads up by the shoulder; the wind-up draws it back and up, the throw swings it out and down.
      let hx = 0.035;
      let hy = -0.13;
      if (toss.k >= 0) {
        const wind = Math.min(1, toss.k / (WIND / (WIND + THROW)));
        const thr = Math.max(0, (toss.k - WIND / (WIND + THROW)) / (THROW / (WIND + THROW)));
        hx = 0.035 - wind * 0.045 + thr * 0.11;
        hy = -0.13 - wind * 0.04 + thr * 0.03;
        f.lean = -wind * 0.15 + thr * 0.35;
        f.mouth = thr * 0.8;
      }
      f.handRx = hx;
      f.handRy = hy;
      f.handLx = -0.03;
      f.handLy = -0.085;
    }
    figure(ctx, f, x, deck, u, lw);
    // The beads in hand, before they fly.
    if (p.tossTo >= 0 && tossAt(s.t, i).flight < 0) {
      const h = nearHand(f, x, deck, u);
      beadString(ctx, u, lw, h.x, h.y + u * 0.004, BEAD_COLORS[(tossAt(s.t, i).n + i) % 3]!, 0.6);
    }
  }
}

/** A string of beads hanging from (x, y), its loop `k` of full size. */
function beadString(ctx: Ctx, u: number, lw: number, x: number, y: number, c: Shades, k: number): void {
  ctx.beginPath();
  beadLoop(ctx, x, y, u * 0.012 * k, u * 0.03 * k, u * 0.0038 * k, 8);
  ctx.fillStyle = c.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fill();
}

/** Where tosser `i`'s beads are in their flight (screen px), from the hand's release to the kid's hands. */
function beadsAt(s: Scene, i: number, flight: number): typeof BEADS {
  const p = FAMILY[i]!;
  const u = s.u;
  const deck = deckY(s, 1);
  const x0 = s.cssW / 2 + p.x * u + (p.tossTo === 0 ? -1 : 1) * 0.145 * u * p.size;
  const y0 = deck - 0.1 * u * p.size;
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
    beadString(ctx, u, lw, 0, -u * 0.012, BEAD_COLORS[(toss.n + i) % 3]!, 0.8);
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

/** The kids on the sidewalk below the gallery, jumping with their arms up as the beads come down. */
export function sidewalkKids(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const foot = streetLevel(s) + SIDEWALK * u;
  for (let j = 0; j < KIDS.length; j++) {
    const k = KIDS[j]!;
    const f = KID_POSES[j]!;
    const r = reachAt(s.t, j);
    const idle = Math.sin(s.t * 3 + j * 2);
    f.m = j === 0 ? 1 : -1;
    f.handLx = -0.03 + r * 0.01;
    f.handLy = -0.07 - r * 0.11 + (1 - r) * idle * 0.006;
    f.handRx = 0.03 - r * 0.01;
    f.handRy = -0.07 - r * 0.11 - (1 - r) * idle * 0.006;
    f.lift = r * Math.max(0, Math.sin(s.t * 9)) * 0.015;
    f.mouth = r * 0.8;
    figure(ctx, f, s.cssW / 2 + k.x * u, foot, u, lw);
  }
}

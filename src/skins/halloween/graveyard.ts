import type { Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { cast, graveGhostUp } from "./cast";
import { inkW, smooth, spot } from "./common";
import { crowFlying, crowPerched } from "./crow";
import { drawTufts, tuft } from "./dirt";
import { crowPose, PERCH, type CrowPose } from "./flight";
import { sheetGhost } from "./ghost";
import { grave, gravePart } from "./graves";
import { kids } from "./kids";
import { mistTop } from "./lines";
import { centerpiece } from "./square";
import { SLOT } from "./slot";
import { tombstone, type Stone } from "./stones";

// The square around the tower, back to front: the giant jack-o'-lantern's flower bed behind the
// tower on the right, the trick-or-treaters (a huddle on the left, the superhero beside the bed on
// the right), and in front of the kerb the old churchyard: weathered tombstones planted in their
// mounds (a crow keeping watch on one) and open graves where skeleton parts pop up out of the soil
// at random. Every prop stands on a field row (see `spot`), is scaled by its depth and is drawn
// back to front.

// X is the sideways spot at the tower's depth, in u; z = 3 is the tower's line. Props behind
// that line keep to the sides, clear of the tower's column; nearer ones sit on the field
// below the tower's base and above the foreground. Sizes are in u at the tower's depth.
type Prop =
  | { kind: "stone"; X: number; z: number; w: number; h: number; stone: Stone; seed: number; ghost?: number }
  | { kind: "grave"; X: number; z: number; size: number; grave: number; under?: number }
  | { kind: "tuft"; X: number; z: number; size: number; seed: number };

// The headstone the crow sits on (PERCH, in flight.ts). It stands below the tower's base inside
// its column, so the stone is kept squat and the crow small enough that its head stays ~0.02u
// below the ground line at the start view (the field rows only drop further below it as you climb).

const FRONT: readonly Prop[] = ([
  // (`under`: the grave ghost whose headstone stands in front of it: the grave holds its part down while that ghost is up.)
  { kind: "grave", X: 0.26, z: 2.1, size: 0.065, grave: 1, under: 1 },
  { kind: "grave", X: -0.215, z: 2.0, size: 0.065, grave: 0, under: 0 },
  { kind: "grave", X: -0.06, z: 1.72, size: 0.06, grave: 2 },
  { kind: "tuft", X: 0.15, z: 1.7, size: 0.021, seed: 47 },
  PERCH,
  { kind: "tuft", X: -0.2, z: 1.62, size: 0.021, seed: 53 },
  { kind: "stone", X: -0.216, z: 1.58, w: 0.046, h: 0.078, stone: "cross", seed: 5, ghost: 0 },
  { kind: "stone", X: 0.206, z: 1.56, w: 0.042, h: 0.084, stone: "slab", seed: 2, ghost: 1 },
] as Prop[]).sort((a, b) => b.z - a.z);

/** The headstones a grave ghost rises behind (stage.ts STONE anchors): their props, by stone number. */
export const GHOST_STONES = FRONT.filter((p) => p.kind === "stone" && p.ghost !== undefined).sort(
  (a, b) => ((a as { ghost: number }).ghost - (b as { ghost: number }).ghost),
) as readonly Extract<Prop, { kind: "stone" }>[];

/**
 * Sheet ghosts on stakes out at the churchyard's sides: X, z, height (u at the tower's depth). Only
 * where a screen is wide enough to show one whole, clear of the graves (a tablet, a zoomed-out view).
 */
const GHOSTS = [
  { X: -0.35, z: 2.12, h: 0.11, seed: 1 },
  { X: 0.35, z: 2.12, h: 0.1, seed: 2 },
] as const;
/** A ghost's reach either side of its stake, in units of its height (its arms and fluttering hem). */
const GHOST_REACH = 0.34;

/** The churchyard in front of the tower: the graves, the headstones (the crow's among them), the ghosts and the tufts. */
export function churchyard(ctx: Ctx, s: Scene): void {
  const u = s.u;
  for (const g of GHOSTS) {
    const { x, y, k } = spot(s, g.X, g.z);
    const h = g.h * u * k;
    if (x - h * GHOST_REACH < u * 0.012 || x + h * GHOST_REACH > s.cssW - u * 0.012 || y - h > s.cssH) continue;
    sheetGhost(ctx, x, y, h, s.t, inkW(s, k), g.seed);
  }
  for (const prop of FRONT) {
    const { x, y, k } = spot(s, prop.X, prop.z);
    const reach = u * k * 0.16;
    if (y - reach > s.cssH || y + reach < 0) continue;
    const lw = inkW(s, k);
    switch (prop.kind) {
      case "stone":
        // A grave ghost rises behind its stone: the cast is called in just before it.
        if (prop.ghost !== undefined) cast(ctx, s, SLOT.stone, prop.ghost);
        tombstone(ctx, x, y, prop.w * u * k, prop.h * u * k, prop.stone, prop.seed, lw);
        break;
      case "grave":
        grave(ctx, s.t, x, y, prop.size * u * k, prop.grave, lw, held(s, prop.under));
        break;
      case "tuft":
        tuft(x, y, prop.size * u * k, prop.seed);
        break;
    }
  }
  drawTufts(ctx, inkW(s, 1.7));
}

/** The most of a grave's part let up: none while the ghost rising in front of it (`under`) is up. */
function held(s: Scene, under: number | undefined): number {
  return under === undefined ? 1 : 1 - smooth(0, 0.2, graveGhostUp(s, under));
}

/** Just the skeleton parts coming up out of the open graves, as the churchyard draws them (for the tests). */
export function graveParts(ctx: Ctx, s: Scene): void {
  for (const prop of FRONT) {
    if (prop.kind !== "grave") continue;
    const { x, y, k } = spot(s, prop.X, prop.z);
    gravePart(ctx, s.t, x, y, prop.size * s.u * k, prop.grave, inkW(s, k), held(s, prop.under));
  }
}

/** In flight the crow is drawn behind the graves (and in front of the kids) when farther than this. */
const BEHIND_GRAVES = 2.05;

/**
 * The crow keeping watch on the front headstone, cawing now and then, and every half minute
 * taking a turn round the moon (flight.ts). `far` draws it only if it is behind the graves now,
 * otherwise only if it is in front of them.
 */
function crow(ctx: Ctx, s: Scene, p: CrowPose, far: boolean): void {
  if (far !== (!p.perched && p.z > BEHIND_GRAVES)) return;
  if (p.y - p.size * 2 > s.cssH) return;
  const lw = inkW(s, 3 / p.z);
  if (p.perched) crowPerched(ctx, p.x, p.y, p.size, p.dir, p.caw, p.look, lw);
  else crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, lw);
}

/** The farthest field row anything here stands on: once it has sunk below the screen, so has the rest. */
const FAR_Z = 4;

/** Everything standing in the square and the churchyard (the centerpiece, the kids, the graves and their crow). */
export function graveyard(ctx: Ctx, s: Scene): void {
  const top = fieldY(s, FAR_Z) - s.u * 0.35;
  // Below the screen, or swallowed whole by the mist floor.
  if (top > s.cssH || top > mistTop(s) + s.u * 0.01) return;
  centerpiece(ctx, s);
  kids(ctx, s);
  const bird = crowPose(s);
  crow(ctx, s, bird, true);
  churchyard(ctx, s);
  crow(ctx, s, bird, false);
}

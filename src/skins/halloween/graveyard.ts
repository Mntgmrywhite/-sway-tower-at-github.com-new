import type { Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { inkW, spot } from "./common";
import { crowFlying, crowPerched } from "./crow";
import { crowPose, PERCH, type CrowPose } from "./flight";
import { grave } from "./graves";
import { drawTufts, tuft } from "./dirt";
import { kids } from "./kids";
import { blowing, fallen } from "./leaves";
import { jackOLantern } from "./pumpkin";
import { tombstone, type Stone } from "./stones";
import { town } from "./town";

// The ground around the tower, back to front: the town's porch houses across the street,
// fallen leaves on the grass, a big jack-o'-lantern glowing behind the tower, two little
// groups of trick-or-treaters, and in front the old churchyard: weathered tombstones planted
// in their mounds (a crow keeping watch on one) and open graves where skeleton parts pop up
// out of the soil at random. Leaves blow across it all on the wind. Every prop stands on a
// field row (see `spot`), is scaled by its depth and is drawn back to front.

// X is the sideways spot at the tower's depth, in u; z = 3 is the tower's line. Props behind
// that line keep to the sides, clear of the tower's column; nearer ones sit on the field
// below the tower's base and above the stone-tile foreground. Sizes are in u at the tower's
// depth. Sorted back (big z) to front once, here.
type Prop =
  | { kind: "stone"; X: number; z: number; w: number; h: number; stone: Stone; seed: number }
  | { kind: "grave"; X: number; z: number; size: number; grave: number }
  | { kind: "tuft"; X: number; z: number; size: number; seed: number };

/** The big jack-o'-lantern behind the tower, right of its column. */
const PUMPKIN = { X: 0.298 * (3.6 / 3), z: 3.6, size: 0.04 };

// The headstone the crow sits on (PERCH, in flight.ts). It stands below the tower's base inside
// its column, so the stone is kept squat and the crow small enough that its head stays ~0.02u
// below the ground line at the start view (the field rows only drop further below it as you climb).

const FRONT: readonly Prop[] = ([
  { kind: "grave", X: 0.26, z: 2.1, size: 0.065, grave: 1 },
  { kind: "grave", X: -0.215, z: 2.0, size: 0.065, grave: 0 },
  { kind: "grave", X: -0.06, z: 1.72, size: 0.06, grave: 2 },
  { kind: "tuft", X: 0.15, z: 1.7, size: 0.021, seed: 47 },
  PERCH,
  { kind: "tuft", X: -0.2, z: 1.62, size: 0.021, seed: 53 },
  { kind: "stone", X: -0.216, z: 1.58, w: 0.048, h: 0.06, stone: "cross", seed: 5 },
  { kind: "stone", X: 0.206, z: 1.56, w: 0.045, h: 0.06, stone: "slab", seed: 2 },
] as Prop[]).sort((a, b) => b.z - a.z);

/** The farthest field row anything stands on: once it has sunk below the screen, so has the rest. */
const FAR_Z = 8;

function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  for (const prop of FRONT) {
    const { x, y, k } = spot(s, prop.X, prop.z);
    const reach = u * k * 0.16;
    if (y - reach > s.cssH || y + reach < 0) continue;
    const lw = inkW(s, k);
    switch (prop.kind) {
      case "stone":
        tombstone(ctx, x, y, prop.w * u * k, prop.h * u * k, prop.stone, prop.seed, lw);
        break;
      case "grave":
        grave(ctx, s.t, x, y, prop.size * u * k, prop.grave, lw);
        break;
      case "tuft":
        tuft(x, y, prop.size * u * k, prop.seed);
        break;
    }
  }
  drawTufts(ctx, inkW(s, 1.7));
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

/** Everything standing on the field (the town, the kids, the churchyard and its crow). */
export function graveyard(ctx: Ctx, s: Scene): void {
  if (fieldY(s, FAR_Z) - s.u * 0.3 > s.cssH) return;
  town(ctx, s);
  fallen(ctx, s);
  {
    const { x, y, k } = spot(s, PUMPKIN.X, PUMPKIN.z);
    jackOLantern(ctx, s.t, x, y, PUMPKIN.size * s.u * k, inkW(s, k));
  }
  kids(ctx, s);
  const bird = crowPose(s);
  crow(ctx, s, bird, true);
  front(ctx, s);
  crow(ctx, s, bird, false);
}

/** The skin's ground layer: everything on the field, then the leaves blowing over it. */
export function ground(ctx: Ctx, s: Scene): void {
  graveyard(ctx, s);
  blowing(ctx, s);
}

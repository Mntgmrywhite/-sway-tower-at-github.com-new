import { type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { inkW, spot } from "./common";
import { fence, FENCE_Z } from "./fence";
import { grave } from "./graves";
import { tuft } from "./dirt";
import { jackOLantern } from "./pumpkin";
import { tombstone, type Stone } from "./stones";

// The graveyard on the field around the tower: weathered tombstones planted in dirt mounds,
// a jack-o'-lantern standing behind the tower, and open graves where skeleton parts pop up
// out of the soil at random. Every prop stands on a field row (see `spot`), is scaled by its
// depth, and is drawn back to front so nearer props overlap farther ones.

// X is the sideways spot at the tower's depth, in u; z = 3 is the tower's line. Props at or
// behind that line keep to the sides, clear of the tower's column; nearer ones sit on the
// field below the tower's base and above the stone-tile foreground. Sizes are in u at the
// tower's depth. Sorted back (big z) to front once, here.
type Prop =
  | { kind: "stone"; X: number; z: number; w: number; h: number; stone: Stone; seed: number }
  | { kind: "pumpkin"; X: number; z: number; size: number }
  | { kind: "grave"; X: number; z: number; size: number; grave: number }
  | { kind: "tuft"; X: number; z: number; size: number; seed: number };

const PROPS: readonly Prop[] = ([
  { kind: "stone", X: -0.66, z: 4.6, w: 0.075, h: 0.11, stone: "cross", seed: 5 },
  { kind: "stone", X: 0.65, z: 4.5, w: 0.075, h: 0.1, stone: "slab", seed: 2 },
  { kind: "pumpkin", X: 0.4, z: 3.7, size: 0.055 },
  { kind: "stone", X: -0.4, z: 3.6, w: 0.085, h: 0.115, stone: "round", seed: 1 },
  { kind: "grave", X: 0.26, z: 2.1, size: 0.065, grave: 1 },
  { kind: "grave", X: -0.215, z: 2.0, size: 0.065, grave: 0 },
  { kind: "tuft", X: 0.12, z: 2.35, size: 0.022, seed: 41 },
  { kind: "grave", X: -0.06, z: 1.72, size: 0.06, grave: 2 },
  { kind: "tuft", X: 0.2, z: 1.7, size: 0.021, seed: 47 },
  { kind: "stone", X: 0.09, z: 1.64, w: 0.06, h: 0.075, stone: "round", seed: 3 },
  { kind: "tuft", X: -0.2, z: 1.62, size: 0.021, seed: 53 },
] as Prop[]).sort((a, b) => b.z - a.z);

/** The farthest field row anything stands on: once it has sunk below the screen, so has the rest. */
const FAR_Z = Math.max(FENCE_Z, ...PROPS.map((p) => p.z));

export function graveyard(ctx: Ctx, s: Scene): void {
  if (fieldY(s, FAR_Z) - s.u * 0.2 > s.cssH) return;
  const u = s.u;
  fence(ctx, s);
  for (const prop of PROPS) {
    const { x, y, k } = spot(s, prop.X, prop.z);
    const reach = u * k * 0.16;
    if (y - reach > s.cssH || y + reach < 0) continue;
    const lw = inkW(s, k);
    switch (prop.kind) {
      case "stone":
        tombstone(ctx, x, y, prop.w * u * k, prop.h * u * k, prop.stone, prop.seed, lw);
        break;
      case "pumpkin":
        jackOLantern(ctx, s.t, x, y, prop.size * u * k, lw);
        break;
      case "grave":
        grave(ctx, s.t, x, y, prop.size * u * k, prop.grave, lw);
        break;
      case "tuft":
        tuft(ctx, x, y, prop.size * u * k, prop.seed, lw);
        break;
    }
  }
}

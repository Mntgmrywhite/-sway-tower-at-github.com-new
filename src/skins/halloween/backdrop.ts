import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { balloons } from "./balloon";
import { embers } from "./embers";
import { fogBands, fogBanks, mistFloor } from "./fog";
import { flyers } from "./flyers";
import { graveyard } from "./graveyard";
import { blowing, fallen } from "./leaves";
import { hollow, hollowBack } from "./hollow";
import { mansion } from "./mansion";
import { moon, skyFill, stars, swirls } from "./sky";
import { shops, shopScale } from "./shops";
import { street } from "./street";
import { toneOf } from "./tone";

// Everything behind the tower is painted here, back to front, in one pass (the skin sets
// paintsBackdrop, so the base world's sky, cloud bank and field are never painted under it): the
// sky, its stars and swirls, the moon; the hollow's back hills, the mansion on its crag with its
// flyers, the Horseman's hill and the covered bridge; the far fog bands, Main Street, the near fog
// band; the corner shops, the leaves on the ground, the square and the churchyard; the mist floor,
// the loop's fog banks, the balloon, the fireflies, and the leaves blowing over it all.

/** Everything behind the tower, back to front, in one pass. */
export function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  skyFill(ctx, s, tone);
  stars(ctx, s, tone);
  swirls(ctx, s, tone, tone.swirl);
  moon(ctx, s, tone);
  hollowBack(ctx, s, tone);
  mansion(ctx, s, tone.hill, true, tone.hollow, tone.swarm);
  flyers(ctx, s, tone);
  hollow(ctx, s, tone);
  fogBands(ctx, s, tone, 20, 100);
  street(ctx, s, tone, shopScale(s));
  fogBands(ctx, s, tone, 5, 20);
  shops(ctx, s);
  fallen(ctx, s);
  graveyard(ctx, s);
  mistFloor(ctx, s, tone);
  fogBanks(ctx, s, tone);
  balloons(ctx, s);
  embers(ctx, s);
  blowing(ctx, s);
}

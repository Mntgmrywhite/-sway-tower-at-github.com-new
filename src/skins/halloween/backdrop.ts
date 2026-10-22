import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { balloons } from "./balloon";
import { cast } from "./cast";
import { drowned, mistLife } from "./drowned";
import { embers } from "./embers";
import { fogBands, mistFloor } from "./fog";
import { flyers } from "./flyers";
import { graveyard } from "./graveyard";
import { blowing, fallen } from "./leaves";
import { hollow, hollowBack } from "./hollow";
import { bolt, flashAt, wash } from "./lightning";
import { mansion } from "./mansion";
import { isles } from "./isles";
import { landBottom, skyEnd } from "./lines";
import { moon, skyFill, stars, swirls } from "./sky";
import { shops, shopScale, shopsOver } from "./shops";
import { bellTower, cathedral, chimneyStack, farCity, nearSpire, roofs } from "./skyline";
import { SLOT } from "./slot";
import { cemetery, village } from "./village";
import { ribbons, spirals, stormClouds } from "./storm";
import { floorSpan, street } from "./street";
import { toneOf, type Tone } from "./tone";

// Everything behind the tower is painted here, back to front, in one pass (the skin sets
// paintsBackdrop, so the base world's sky, cloud bank and field are never painted under it), with
// the cast (cast.ts) called in at each of its slots (stage.ts SLOT):
//   the sky (and a lightning flash's wash), its stars | DEEP | the storm clouds and spirals, the
//   ribbons round the moon, the moon | MOON | a lightning bolt and what it reveals; the far city on
//   the horizon, the hollow's back hills | FAR | the right lane's far things (the cathedral, the
//   bell tower, the right isles) | MID | the mansion on its crag with its flyers, the Horseman's
//   hill and the covered bridge, the far village and the hill cemetery (STONE before its stones)
//   | HOLLOW | the left lane's things (the crooked roofs, the chimney stack, the left isles) and
//   the near spire; the far fog bands, Main Street, the near fog band | BEHIND_NEAR | the corner
//   shops | NEAR | the shops' fronts (the curio turret, the cage's bars); the leaves on the ground,
//   the square and the churchyard (STONE before each headstone) | the mist floor, the drowned
//   hollow's set pieces standing in it and the life in it (drowned.ts), the balloon, the fireflies
//   and the leaves blowing over it all | MIST.

/** Everything up to and including the moon: what the moon test compares the frame with. */
export function skyBack(ctx: Ctx, s: Scene, tone: Tone = toneOf(s), flash = flashAt(s)): void {
  skyFill(ctx, s, tone);
  wash(ctx, s, flash, Math.min(skyEnd(s), s.cssH));
  stars(ctx, s, tone);
  cast(ctx, s, SLOT.deep);
  stormClouds(ctx, s, tone);
  spirals(ctx, s, tone);
  swirls(ctx, s, tone, tone.swirl);
  ribbons(ctx, s, tone);
  moon(ctx, s, tone);
}

/** Everything behind the tower, back to front, in one pass. */
export function backdrop(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const flash = flashAt(s);
  skyBack(ctx, s, tone, flash);
  cast(ctx, s, SLOT.moon);
  bolt(ctx, s, flash, landBottom(s));
  farCity(ctx, s, tone);
  hollowBack(ctx, s, tone);
  cast(ctx, s, SLOT.far);
  cathedral(ctx, s, tone);
  bellTower(ctx, s);
  isles(ctx, s, 1);
  cast(ctx, s, SLOT.mid);
  mansion(ctx, s, tone.hill, true, tone.hollow, tone.swarm);
  flyers(ctx, s, tone);
  hollow(ctx, s, tone);
  village(ctx, s, tone);
  cemetery(ctx, s);
  cast(ctx, s, SLOT.hollow);
  roofs(ctx, s);
  chimneyStack(ctx, s);
  isles(ctx, s, -1);
  nearSpire(ctx, s);
  fogBands(ctx, s, tone, 20, 100, floorSpan(s));
  street(ctx, s, tone, shopScale(s));
  fogBands(ctx, s, tone, 5, 20);
  cast(ctx, s, SLOT.behindNear);
  shops(ctx, s);
  cast(ctx, s, SLOT.near);
  shopsOver(ctx, s);
  fallen(ctx, s);
  graveyard(ctx, s);
  mistFloor(ctx, s, tone);
  drowned(ctx, s, tone);
  mistLife(ctx, s, tone);
  balloons(ctx, s);
  embers(ctx, s);
  blowing(ctx, s);
  cast(ctx, s, SLOT.mist);
}

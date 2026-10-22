// The Halloween cast: every character and creature, their schedules and their boxes, in one place
// for the integrator's cast.ts. All pure and deterministic; the `...At` functions return reused
// scratch (copy with {...} to keep one). `seed` is the anchor's id. `sinceLand` is
// `Scene.sinceLand ?? Infinity`. A creature's size is its constant × s.u × the anchor's k (px); its
// ink is `inkW(s, k)`; `dir` is its screen facing.

/** A screen box, px. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export { CAST_PALETTE } from "./palette";
export { blackCat, catAt, catBox, CAT_LEN, type CatPose } from "./cat";
export { raven, ravenAt, ravenBox, ravenSpot, RAVEN_SIZE, type RavenPose } from "./raven";
export { spider, spiderAt, spiderBox, SPIDER_SIZE, type SpiderPose } from "./spider";
export { rat, ratAt, ratBox, RAT_LEN, type RatPose } from "./rat";
export { bonebird, bonebirdAt, bonebirdBox, bonebirdV, bonebirdVBox, boneVAt, BONEBIRD_SIZE, type BonebirdPose } from "./bonebird";
export { driftGhost, driftGhostAt, DRIFT_KINDS, DRIFT_PATHS, ghost, ghostBox, GHOST_H, graveGhostAt, type GhostPose } from "./ghosts";
export { curtain, curtainAt, type CurtainPose } from "./windows";
export { batBurst, batBurstBox, batPath, batRing, batRingBox, batTrip, batTripAt, batTripBox, TRIP_BACK, TRIP_OUT, TRIP_UP, ringTilt } from "./bats";
export {
  carriage,
  carriageBox,
  CARRIAGE_LEN,
  eyesBox,
  glowingEyes,
  moonFree,
  moonShadow,
  moonShadowBox,
  peeker,
  peekerBox,
  PEEKER_SIZE,
  RARE_FIRST,
  rareAt,
  shadowNear,
  type Rare,
  type RareKind,
} from "./rare";
export { colossus, colossusBox, skyEel, skyEelBox } from "./distant";
export { crowFly, crowFlying, crowPerched, flyingBox } from "../crow";
export { horseman, CHARGE_RAISE } from "../horseman";
export { glanceAt, HEIGHT as KID_HEIGHT, hopAt, kid, kids, KIDS } from "../kids";
export { boneFeet, boneHand, boneSkull, clods } from "../bones";
export { sheetGhost } from "../ghost";

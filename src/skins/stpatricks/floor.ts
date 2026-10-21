import type { Scene } from "../skin";
import { DAY_HIGH, level, smooth } from "./tone";

// Where the cloud floor lies. Above the start a floor of cloud gathers below you and covers the
// land: as you climb up through it into the shower its top swells up past the horizon, over the
// castle and the round tower on the headland and up the mountains to their tops, so the land is
// all under it when it is dropped (`landShows`: nothing on the land blinks out); then, as you
// rise above it, it settles back to the horizon, and only the mountain tops stand out of it.
// Then it sinks with them to rest low on the screen, and there it stays for good, for the sun to
// set into and rise out of on every turn of the story's loop (tone.ts). The far layers (far.ts,
// mountains.ts) all place themselves by these lines.

/** Once it has covered the land, the cloud floor sinks to rest this far above the screen's bottom (u)... */
const FLOOR_REST = 0.3;
/** ...by this level, and stays there: before the story's loop begins (tone.ts LOOP_START), so every turn of it looks the same. */
export const FLOOR_SETTLED = 88;

/**
 * The line the cloud floor lies along once it has gathered, and the mountains stand on: the
 * horizon while the land shows; above the clouds it eases down to its rest low on the screen.
 */
export function seaLine(s: Scene, lvl: number): number {
  const horizon = s.horizonY + s.u * 0.01;
  return horizon + (s.cssH - s.u * FLOOR_REST - horizon) * smooth(DAY_HIGH, FLOOR_SETTLED, lvl);
}

/** The floor comes up from below the screen from this level on, to its line by DAY_HIGH. */
const GATHER = 16;
/** As it gets there it swells this far (u) above its line, from SWELL_FROM, most at SWELL_PEAK, settling back by SWELL_END. */
const SWELL = 0.3;
const SWELL_FROM = 24;
const SWELL_PEAK = 34;
const SWELL_END = 52;
/** The land is dropped once the floor's top is this far above the horizon (u): over its highest point, the castle's finial, with the dips between the puffs along the top. */
const LAND_COVER = 0.25;

/** Where the cloud floor's top edge is: below the screen at the start, swelling up over the land, then at the horizon once you are above the clouds, then at rest. */
export function floorTop(s: Scene, lvl: number): number {
  const k = smooth(GATHER, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.16;
  const swell = smooth(SWELL_FROM, SWELL_PEAK, lvl) * (1 - smooth(SWELL_PEAK, SWELL_END, lvl));
  return below + (seaLine(s, lvl) - below) * k - s.u * SWELL * swell;
}

/**
 * The land below shows only until the cloud floor covers it (`top` is the floor's top edge);
 * once it has (on every screen before the swell is at its height), it stays covered as the floor
 * settles and sinks to its rest.
 */
export function landShows(s: Scene, top: number): boolean {
  return level(s) < SWELL_PEAK && top > s.horizonY - s.u * LAND_COVER;
}

/** The horizon the mountains stand on: the real one while the land shows, then the cloud floor's line as it sinks to rest. */
export function mountainHorizon(s: Scene): number {
  return seaLine(s, level(s)) - s.u * 0.01;
}

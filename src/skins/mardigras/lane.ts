import { cameoBounds } from "../cameo";
import type { Scene } from "../skin";
import { drifterBox, eachVisible, type Drifter } from "./drift";
import { islandFrame } from "./island";

// The right lane's traffic, for its two night pieces to keep clear of: Sky Islands' floating
// island coming down it around level 50 (island.ts) and the throws drifting down it (drift.ts).
// The King Gator rises out of the cloud floor there (gator.ts) and the right lane's fireworks
// burst over him (sky.ts). The lane's story is laid out so that, on a phone, a short phone and a
// tablet, nothing is passing while either is out (drift.ts) but the island in the first pass;
// these hold them back wherever something still is (the island, on every screen; a throw on a
// screen taller than those, zoomed out): the Gator stays down in the clouds until the island
// has gone below their top and rises as it sinks, and the fireworks fade rather than burst
// over anything. Positions are screen px.

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Scratch: the boxes of everything in the lane this frame (the island first). */
const BOXES: Box[] = Array.from({ length: 32 }, () => ({ l: 0, t: 0, r: 0, b: 0 }));
let count = 0;
const NOW = { s: null as unknown as Scene };

function addDrifter(d: Drifter): void {
  if (count >= BOXES.length) return;
  const b = drifterBox(NOW.s, d);
  const o = BOXES[count++]!;
  o.l = b.l;
  o.t = b.t;
  o.r = b.r;
  o.b = b.b;
}

/** Everything in the lane this frame (the island, the drifters on screen), as boxes; how many. */
function gather(s: Scene): number {
  count = 0;
  const island = cameoBounds(islandFrame(s), s.u * 0.01);
  if (island.b > 0 && island.t < s.cssH) {
    const o = BOXES[count++]!;
    o.l = island.l;
    o.t = island.t;
    o.r = island.r;
    o.b = island.b;
  }
  NOW.s = s;
  eachVisible(s, addDrifter);
  return count;
}

/** The gap kept between them (u). */
const MARGIN = 0.015;

/**
 * How far up (0..1) something standing in the right lane between `l` and `r` may rise out of
 * the cloud floor whose top is `rest`, `height` px when all the way up: under anything above it
 * (its top kept a margin below their bottom); not at all while anything stands across the floor's
 * top; and, once it has gone below the top, only as far as it has sunk (so it comes up as the
 * island sinks, never with a jump).
 */
export function rightLaneRoom(s: Scene, l: number, r: number, rest: number, height: number): number {
  const n = gather(s);
  const m = s.u * MARGIN;
  let room = 1;
  for (let i = 0; i < n; i++) {
    const b = BOXES[i]!;
    if (b.r < l - m || b.l > r + m) continue;
    const k = b.t < rest ? (rest - b.b - m) / height : (b.t - rest) / height;
    room = Math.min(room, k < 0 ? 0 : k);
  }
  return room;
}

/** How clear (0..1) a fixed box of the right lane is: 1 with nothing within a margin of it, falling to 0 as anything comes into it. */
export function rightLaneClear(s: Scene, box: Box): number {
  const n = gather(s);
  const m = s.u * MARGIN * 2;
  let clear = 1;
  for (let i = 0; i < n; i++) {
    const b = BOXES[i]!;
    if (b.r < box.l || b.l > box.r) continue;
    const gap = Math.max(b.t - box.b, box.t - b.b);
    clear = Math.min(clear, gap <= 0 ? 0 : gap >= m ? 1 : gap / m);
  }
  return clear;
}

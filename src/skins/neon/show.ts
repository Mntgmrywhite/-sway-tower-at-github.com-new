import { hash } from "../../base/draw";

// Synthwave's show, on a loop over each tower's scene (Scene.t from 0). FIRST seconds in, the
// arcade's door slides open and its regular steps out (an 80s driver of our own, driver.ts), walks
// across the floor in front of the tower to the chrome car (car.ts), opens its door and gets in.
// The car burns out in its spot, peels out into the distance, spins three donuts far out and zooms
// off toward the city, fading into the haze; a little later it comes back in through the bottom of
// the screen, as if it had looped round behind us, rolls up the floor and parks in its spot. The
// driver gets out, walks back and goes into the arcade, and its door slides shut. The next show
// starts GAP_MIN to GAP_MAX seconds after this one started (a different gap each time, from
// hash), and so on for the whole run. Everything here is a pure function of Scene.t.

/** The first show starts this far into a tower's scene (the arcade door opens). */
export const FIRST = 6;
/** Seconds from one show's start to the next. */
export const GAP_MIN = 30;
export const GAP_MAX = 45;

// The beats, in seconds into a show.

/** The arcade door slides open (taking DOOR_TIME) on the driver standing inside, against the
 *  light, and they step out toward us. */
export const STEP_OUT = 0.3;
export const OUT = 1.0;
/** Across the floor to the car's door; the arcade door slides shut behind them. */
export const AT_CAR = 5.0;
export const SHUT_ARCADE = 1.7;
/** The car door swings open, they get in, it shuts. */
export const OPEN_CAR = 5.0;
export const BOARD = 5.35;
export const SEATED = 6.05;
export const SHUT_CAR = 6.05;
/** The car's part (car.ts): burnout, peel-out, donuts far out, zoom off and gone in the haze. */
export const BURNOUT = 6.7;
export const LAUNCH = BURNOUT + 2.3;
/** The tail steps out as it slides into the donut spot. */
export const DONUTS = LAUNCH + 1.2;
/** When the pivot reaches the donut spot. */
export const ARRIVE = LAUNCH + 1.7;
export const DONUTS_END = LAUNCH + 4.6;
/** A beat out of the last spin, then it zooms off to the city, gone in the haze by GONE. */
export const ZOOM = DONUTS_END + 0.2;
export const GONE = ZOOM + 1.8;
/** In through the bottom edge, up the floor, parked in its spot again. */
export const RETURN = GONE + 1.7;
export const PARKED = RETURN + 2.8;
/** The car door opens, they get out, it shuts behind them. */
export const OPEN_AGAIN = PARKED + 0.35;
export const ALIGHT = PARKED + 0.75;
export const STOOD = ALIGHT + 0.7;
export const SHUT_AGAIN = STOOD;
/** Back across the floor; the arcade door opens for them, they go in, and it slides shut behind
 *  them as they walk on inside. */
export const HOME = STOOD + 4.0;
export const OPEN_ARCADE = HOME - 0.45;
export const INSIDE = HOME + 0.8;
export const SHUT_ARCADE_AGAIN = INSIDE;
/** Seconds a door takes to slide or swing (arcade) and the car door to swing open or slam. */
export const DOOR_TIME = 0.45;
export const CAR_DOOR_OPEN_TIME = 0.35;
export const CAR_DOOR_SHUT_TIME = 0.22;
/** Over: the arcade door is shut, everyone is back where the show found them. */
export const SHOW_LEN = SHUT_ARCADE_AGAIN + DOOR_TIME;

/** The gap from show n's start to the next one's (seconds). */
export function gapAfter(n: number): number {
  return GAP_MIN + (GAP_MAX - GAP_MIN) * hash(n * 7.31 + 2.9);
}

/** Show start times, worked out as far as asked (memo only: the answer is a pure function of t). */
const STARTS: number[] = [FIRST];

/** The show at scene time t: its number (-1 before the first), when it started and how far into
 *  it t is (seconds; negative before the first). */
const NOW = { n: -1, start: FIRST, tau: 0 };
export function showAt(t: number): typeof NOW {
  if (t < FIRST) {
    NOW.n = -1;
    NOW.start = FIRST;
    NOW.tau = t - FIRST;
    return NOW;
  }
  while (STARTS[STARTS.length - 1]! <= t) STARTS.push(STARTS[STARTS.length - 1]! + gapAfter(STARTS.length - 1));
  // The last start at or before t.
  let lo = 0;
  let hi = STARTS.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (STARTS[mid]! <= t) lo = mid;
    else hi = mid;
  }
  NOW.n = lo;
  NOW.start = STARTS[lo]!;
  NOW.tau = t - STARTS[lo]!;
  return NOW;
}

/** Seconds into the current show (negative before the first one). */
export function showTime(t: number): number {
  return showAt(t).tau;
}

function clamp01(k: number): number {
  return k < 0 ? 0 : k > 1 ? 1 : k;
}

/** 0 → 1 easing in and out. */
export function smooth(k: number): number {
  const x = clamp01(k);
  return x * x * (3 - 2 * x);
}

/** How far open the arcade door is (0 shut .. 1 open) at scene time t. */
export function arcadeDoorAt(t: number): number {
  const tau = showTime(t);
  if (tau < 0 || tau >= SHOW_LEN) return 0;
  const first = Math.min(smooth(tau / DOOR_TIME), 1 - smooth((tau - SHUT_ARCADE) / DOOR_TIME));
  const again = Math.min(smooth((tau - OPEN_ARCADE) / DOOR_TIME), 1 - smooth((tau - SHUT_ARCADE_AGAIN) / DOOR_TIME));
  return Math.max(first, again);
}

/** How far open the car's door is (0 shut .. 1 open) at show time tau. It swings open, and
 *  slams shut quicker, speeding up as it goes. */
export function carDoorIn(tau: number): number {
  const swing = (open: number, shut: number) => {
    if (tau < open || tau >= shut + CAR_DOOR_SHUT_TIME) return 0;
    if (tau < shut) return smooth((tau - open) / CAR_DOOR_OPEN_TIME);
    const k = (tau - shut) / CAR_DOOR_SHUT_TIME;
    return 1 - k * k;
  };
  return Math.max(swing(OPEN_CAR, SHUT_CAR), swing(OPEN_AGAIN, SHUT_AGAIN));
}

/** Is the driver in the car (seated, out of sight but for their head in the rear glass)? */
export function seatedIn(tau: number): boolean {
  return tau >= SEATED && tau < ALIGHT;
}

/** Seconds the driver's head takes to show in the rear glass once they sit down, and to go
 *  before they get out (so it eases in and out instead of popping). */
export const RIDER_FADE = 0.3;

/** How much of the driver shows in the rear glass (0..1) at show time tau. */
export function riderIn(tau: number): number {
  if (!seatedIn(tau)) return 0;
  return Math.min(smooth((tau - SEATED) / RIDER_FADE), 1 - smooth((tau - ALIGHT + RIDER_FADE) / RIDER_FADE));
}

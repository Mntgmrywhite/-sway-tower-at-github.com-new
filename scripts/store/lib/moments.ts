import { BLAST_AT } from "../../../src/fx/topple";
import type { Mode } from "../../../src/game";
import { SKINS } from "../../../src/skins";
import { MIDNIGHT } from "../../../src/skins/newyear/countdown";
import type { Skin } from "../../../src/skins/skin";
import type { Moment } from "./draw";
import { climb, dropAt, frame, settle, showSlider, sim, tapAt, until, type Sim } from "./sim";

// The game moments the screenshots and the preview video show, built deterministically from
// src/game.ts and the view (lib/sim.ts), each in the skin it belongs to. Times are seconds on the
// skin's own scene clock (Scene.t: 0 when a tower's scene starts), so each skin's opening action
// (every one lands by ~10 s) can be caught at its best.

/** The bests the HUD shows (a seasoned player's). */
export const BEST_SLIDE = 52;
export const BEST_DROP = 17;

export function skin(id: string): Skin {
  const s = SKINS.find((k) => k.id === id);
  if (!s) throw new Error(`unknown skin ${id}`);
  return s;
}

/** Run frames until the scene clock reaches `t` seconds. */
export function atTime(s: Sim, t: number): void {
  while (s.view.t < t - 1e-9) frame(s);
}

/** A tower of `n` bars, with slices on the way (the default pattern), settled a beat. */
export function tower(n: number, mode: Mode = "normal", pattern?: readonly number[]): Sim {
  const s = climb(n, mode, pattern);
  settle(s, 0.3);
  return s;
}

/** A pattern with more slices than the default: the top ends up narrow, the sway kicked. */
export const SLOPPY = [0, 0, 5, 0, -4, 0, 3, 0, 0, -5] as const;

/** Scene times of the skins' openings, chosen by looking (see store/README.md). */
export const SCENE_TIMES = {
  /** Synthwave: the car's burnout, a beat before it peels out (show.ts: BURNOUT at 12.7 s, LAUNCH at 15 s). The
   *  show plays in the near foreground, so the tower must be short (SHORT bars) for the floor to still be in view. */
  neonCar: 13.5,
  /** Halloween: the Headless Horseman galloping across the harvest moon's face (hollow.ts: his ride out, 0 to ~5 s). */
  horseman: 1.4,
  /** Toy Kingdom: the rocket clear of its launch tower, climbing on a column of smoke (launch.ts: lift-off at 11.2 s). */
  rocket: 13.2,
  /** Christmas: the carriage passing in front of the tower (2.1 s). */
  carriage: 2.1,
  /** Cyberpunk: the street racer launching through the puddle (peel.ts: GO at 1.0 s), the walker's umbrella down as a shield. */
  racer: 1.4,
  /** St. Patrick's: the pot of gold set at the rainbow's foot (by 4.5 s). */
  gold: 5.5,
  thanksgiving: 3,
  /** New Year's: seconds into the song, a beat after midnight, the finale's fireworks over the skyline. */
  midnightSong: MIDNIGHT + 1.4,
};

// ---------------------------------------------------------------- Slide moments (Classic)

/** A fresh run, a moment in: the name, "tap to drop", the slider coming in. */
export function start(skinId = "classic"): Moment {
  const s = sim();
  settle(s, 1.2);
  return { sim: s, skin: skin(skinId), best: BEST_SLIDE };
}

/** Where a still's slider sits: a little right of the top, a bar about to land. */
const SLIDER_SHOW = 4;

/** A mid tower up in the clouds, a sloppy drop's overhang just cut off and falling. */
export function build(): Moment {
  const s = tower(34);
  // The climb's last drop was a perfect: let its pop fade out, so the slice is the only event.
  settle(s, 1);
  dropAt(s, 5);
  settle(s, 0.2);
  return { sim: s, skin: skin("classic"), best: BEST_SLIDE };
}

/** A tall tower at sunset, just kicked by a sloppy drop: the cut piece falling, the top swinging. */
export function sway(): Moment {
  const s = climb(58, "normal", SLOPPY);
  // Long enough for the climb's last PERFECT pop to be gone, so the slice is the only event.
  settle(s, 1);
  dropAt(s, 6);
  settle(s, 0.25);
  return { sim: s, skin: skin("classic"), best: BEST_SLIDE };
}

/** Three perfect drops in a row: PERFECT ×3 popping over the gold-tinted bar, the seam flashing. */
export function perfect(): Moment {
  const s = climb(20);
  settle(s, 0.3);
  dropAt(s, 0);
  settle(s, 0.3);
  dropAt(s, 0);
  settle(s, 0.3);
  dropAt(s, 0);
  settle(s, 0.2);
  return { sim: s, skin: skin("classic"), best: BEST_SLIDE };
}

/** Far up in the night: stars, the aurora, lanterns in the lanes. */
export function night(): Moment {
  const s = climb(104);
  settle(s, 1);
  return { sim: s, skin: skin("classic"), best: BEST_SLIDE };
}

/** The last life: the top of the tower blowing up a beat after it went over. */
export function blast(skinId = "classic"): Moment {
  const s = climb(24, "normal", SLOPPY);
  settle(s, 0.3);
  s.state.lives = 1;
  dropAt(s, s.state.slider.w + 3);
  until(s, BLAST_AT + 0.05);
  return { sim: s, skin: skin(skinId), best: BEST_SLIDE };
}

// ---------------------------------------------------------------- Drop moments

/** Drop: a bar let go from the raised lane, half way down onto the swaying top. */
export function dropFall(skinId = "classic"): Moment {
  const s = climb(16, "hard", [0, 5, -4, 0, 6, -3]);
  settle(s, 0.6);
  tapAt(s, 4);
  for (let i = 0; i < 11; i++) frame(s);
  return { sim: s, skin: skin(skinId), best: BEST_DROP };
}

// ---------------------------------------------------------------- the skins' openings

/** A short tower in `skinId`, its scene `t` seconds in (and `songTime` seconds into its song, if it keeps time with it). */
export function scene(skinId: string, bars: number, t: number, songTime = NaN): Moment {
  const s = tower(bars);
  atTime(s, t);
  showSlider(s, SLIDER_SHOW);
  return { sim: s, skin: skin(skinId), best: BEST_SLIDE, songTime };
}

/** New Year's just after midnight: MIDNIGHT on the Times Tower's screen, the finale over the skyline. */
export function midnight(): Moment {
  return scene("newyear", 22, 4, SCENE_TIMES.midnightSong);
}

/** A tower short enough that the camera hasn't risen: the whole floor, where the skins' foreground actions play, is in view. */
export const SHORT = 4;

/** Synthwave: the chrome car's burnout in front of the arcade. */
export function synthwave(): Moment {
  return scene("neon", SHORT, SCENE_TIMES.neonCar);
}

/** Halloween: the Headless Horseman galloping past the harvest moon. */
export function horseman(): Moment {
  return scene("halloween", 10, SCENE_TIMES.horseman);
}

/** Toy Kingdom: the rocket climbing off its pad. */
export function rocket(): Moment {
  return scene("toyblock", 5, SCENE_TIMES.rocket);
}

/** The title scene of a skin (a fresh tower, no HUD), `t` seconds in. */
export function title(skinId: string, t: number, songTime = NaN): Moment {
  const s = sim();
  for (let k = 0; k < t * 60; k++) s.view.t += 1 / 60;
  return { sim: s, skin: skin(skinId), best: BEST_SLIDE, songTime, opts: { title: true } };
}

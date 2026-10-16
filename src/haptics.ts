// Haptic cues. In the iOS app they play on the Taptic Engine through Capacitor's Haptics plugin
// (navigator.vibrate does nothing there); in the browser they use navigator.vibrate where it
// exists (Android), and are silent elsewhere.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { Cue } from "./render";

/** Vibration patterns, ms: on, off, on, … (navigator.vibrate's format). */
export const HAPTICS: Record<Cue | "armed" | "saved" | "topple", number | number[]> = {
  creak: 8,
  whoa: [30, 40, 30],
  teeter: [15, 90, 15],
  armed: 60,
  saved: [25, 70, 25],
  topple: [90, 50, 180],
};
export type Haptic = keyof typeof HAPTICS;

/** A taptic tap is instant, so a pulse's length picks how hard it hits: below this, light. */
const LIGHT_BELOW_MS = 20;
/** At or above this, heavy; in between, medium. */
const HEAVY_FROM_MS = 60;

export interface Tap {
  /** Delay from the start of the pattern, ms. */
  at: number;
  style: ImpactStyle;
}

/** A vibration pattern as native taps: one impact at the start of each "on" pulse. */
export function taps(pattern: number | number[]): Tap[] {
  const steps = typeof pattern === "number" ? [pattern] : pattern;
  const out: Tap[] = [];
  let at = 0;
  steps.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) {
      const style = ms < LIGHT_BELOW_MS ? ImpactStyle.Light : ms < HEAVY_FROM_MS ? ImpactStyle.Medium : ImpactStyle.Heavy;
      out.push({ at, style });
    }
    at += ms;
  });
  return out;
}

const native = Capacitor.isNativePlatform();

export function buzz(kind: Haptic): void {
  if (native) {
    for (const t of taps(HAPTICS[kind])) {
      setTimeout(() => void Haptics.impact({ style: t.style }).catch(() => {}), t.at);
    }
    return;
  }
  // Browsers refuse (and log) vibration before the first real tap.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(HAPTICS[kind]);
  } catch {
    // Not allowed here (no user activation yet, or blocked); haptics are a bonus.
  }
}

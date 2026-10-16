// Haptic cues. In the iOS app they play on the Taptic Engine through Capacitor's Haptics plugin
// (navigator.vibrate does nothing there); in the browser they use navigator.vibrate where it
// exists (Android), and are silent elsewhere.
//
// The owner's rule: it hits when you line the bars up perfectly. Positive feedback only, so an
// ordinary landing and a miss are silent and the perfect stands out by contrast.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/** A perfect; a perfect that completes a run of STREAK_STEP; the last life going. */
export type Haptic = "perfect" | "streak" | "over";

/** Every this many perfects in a row, the perfect lands with an extra heavy tap. */
export const STREAK_STEP = 5;

/** Browser vibration patterns, ms: on, off, on, … (navigator.vibrate's format). */
export const VIBRATE: Record<Haptic, number | number[]> = {
  perfect: [20, 40, 20],
  streak: [20, 40, 20, 90, 60],
  over: 60,
};

/** One native step: iOS's Success notification (a crisp double-tap no impact can make), or an impact. */
export type NativeStep = { at: number; success: true } | { at: number; impact: ImpactStyle };

export const NATIVE: Record<Haptic, NativeStep[]> = {
  perfect: [{ at: 0, success: true }],
  streak: [
    { at: 0, success: true },
    { at: 160, impact: ImpactStyle.Heavy },
  ],
  over: [{ at: 0, impact: ImpactStyle.Heavy }],
};

/** The haptic for a drop, or null for none: `streak` is the run after the drop, `over` if it ended the game. */
export function dropHaptic(kind: "perfect" | "sliced" | "miss", streak: number, over: boolean): Haptic | null {
  if (over) return "over";
  if (kind !== "perfect") return null;
  return streak > 0 && streak % STREAK_STEP === 0 ? "streak" : "perfect";
}

const native = Capacitor.isNativePlatform();

export function buzz(kind: Haptic): void {
  if (native) {
    for (const step of NATIVE[kind]) {
      const play = () =>
        "success" in step ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: step.impact });
      setTimeout(() => void play().catch(() => {}), step.at);
    }
    return;
  }
  // Browsers refuse (and log) vibration before the first real tap.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(VIBRATE[kind]);
  } catch {
    // Not allowed here (no user activation yet, or blocked); haptics are a bonus.
  }
}

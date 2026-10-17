// Haptic cues. In the iOS app they play on the Taptic Engine through Capacitor's Haptics plugin
// (navigator.vibrate does nothing there); in the browser they use navigator.vibrate where it
// exists (Android), and are silent elsewhere.
//
// The owner's rule: it hits when you line the bars up perfectly. Positive feedback only, so an
// ordinary landing and a miss are silent and the perfect stands out by contrast. The one exception
// is the end of a run: the tower blowing up lands a heavy thump, with the debris rattling after it.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/** A perfect; a perfect that completes a run of STREAK_STEP; the toppling tower blowing up at game over. */
export type Haptic = "perfect" | "streak" | "blast";

/** Every this many perfects in a row, the perfect lands with an extra heavy tap. */
export const STREAK_STEP = 5;

/** Browser vibration patterns, ms: on, off, on, … (navigator.vibrate's format). */
export const VIBRATE: Record<Haptic, number | number[]> = {
  perfect: [20, 40, 20],
  streak: [20, 40, 20, 90, 60],
  blast: [70, 60, 30, 70, 15],
};

/** One native step: iOS's Success notification (a crisp double-tap no impact can make), or an impact. */
export type NativeStep = { at: number; success: true } | { at: number; impact: ImpactStyle };

export const NATIVE: Record<Haptic, NativeStep[]> = {
  perfect: [{ at: 0, success: true }],
  streak: [
    { at: 0, success: true },
    { at: 160, impact: ImpactStyle.Heavy },
  ],
  // The blast: one heavy thump, then the debris rattles down.
  blast: [
    { at: 0, impact: ImpactStyle.Heavy },
    { at: 130, impact: ImpactStyle.Medium },
    { at: 260, impact: ImpactStyle.Light },
  ],
};

/**
 * The haptic for a drop, or null for none: `streak` is the run after the drop. The miss that takes
 * the last life is silent too: its "blast" comes a moment later, when the toppling tower blows up.
 */
export function dropHaptic(kind: "perfect" | "sliced" | "miss", streak: number): Haptic | null {
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

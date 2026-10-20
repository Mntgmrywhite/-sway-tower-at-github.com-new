// When to ask for an App Store review (the iOS app only; StoreKit shows the prompt, and may not).
// The owner's game stays simple, so the ask is rare and never mid-play: on the game-over card,
// after a run that set a new best, from the third run on, at most once per app version. The
// count and the version last asked in are saved under a `sway-stack:*` key (mirrored on iOS like
// every save, src/storage.ts). Pure, so the policy is tested without a device.

export interface RateState {
  /** Runs played to their end, this one included. */
  runs: number;
  /** The app version the prompt was last requested in, or null. */
  askedIn: string | null;
}

export const RATE_KEY = "sway-stack:rate";

/** The run that ends the ask is this one or later. */
export const MIN_RUNS = 3;

export const EMPTY_RATE: Readonly<RateState> = { runs: 0, askedIn: null };

/** What makes a moment right for the ask. */
export interface RateMoment {
  /** The run that just ended set a new best. */
  newBest: boolean;
  /** The app version now (package.json). */
  version: string;
  /** Running as the iOS app (there is no prompt on the web). */
  native: boolean;
}

export function parseRateState(raw: string | null): RateState {
  const out: RateState = { ...EMPTY_RATE };
  if (!raw) return out;
  try {
    const saved = JSON.parse(raw) as unknown;
    if (!saved || typeof saved !== "object") return out;
    const s = saved as Record<string, unknown>;
    if (typeof s.runs === "number" && Number.isFinite(s.runs) && s.runs >= 0) out.runs = Math.floor(s.runs);
    if (typeof s.askedIn === "string") out.askedIn = s.askedIn;
  } catch {
    // Not JSON: start over.
  }
  return out;
}

export function serializeRateState(s: RateState): string {
  return JSON.stringify({ runs: s.runs, askedIn: s.askedIn });
}

/** A run ended (the game-over card is up). */
export function runEnded(s: RateState): RateState {
  return { ...s, runs: s.runs + 1 };
}

/** The prompt was requested in this version: not again until the next. */
export function asked(s: RateState, version: string): RateState {
  return { ...s, askedIn: version };
}

/** Ask now? `state` already counts the run that just ended. */
export function shouldAskForReview(state: RateState, at: RateMoment): boolean {
  if (!at.native || !at.newBest) return false;
  if (state.runs < MIN_RUNS) return false;
  return state.askedIn !== at.version;
}

/** The App Store page's "write a review" link for an app id, or null until the app has one. */
export function reviewUrl(appStoreId: string): string | null {
  return /^\d+$/.test(appStoreId) ? `https://apps.apple.com/app/id${appStoreId}?action=write-review` : null;
}

// Durable saves for the iOS app. The game reads and writes localStorage (synchronous, and all
// the web build needs), but iOS may clear a web view's localStorage when the device is low on
// space. So in the app every `sway-stack:*` key is mirrored to Capacitor Preferences
// (UserDefaults, which iOS keeps); GameViewController (ios/App/App/SceneDelegate.swift) puts
// any lost key back into localStorage before the page loads, so start-up reads it as usual.

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Every saved key starts with this (best score, tuning, audio settings, …). */
const PREFIX = "sway-stack:";
/** How often to mirror changed keys, ms. Cheap: a few short strings compared. */
const SYNC_EVERY_MS = 2000;

type Saves = Record<string, string>;

/** The game's keys currently in localStorage. */
function localSaves(): Saves {
  const out: Saves = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = key?.startsWith(PREFIX) ? localStorage.getItem(key) : null;
      if (key && value !== null) out[key] = value;
    }
  } catch {
    // Storage blocked: nothing to mirror.
  }
  return out;
}

/**
 * What to write to the durable copy so it holds the web copy's values. Nothing is ever removed
 * from it: the game never deletes a save, and a wipe of the web copy must not spread.
 */
export function changes(durable: Saves, local: Saves): Saves {
  const set: Saves = {};
  for (const [k, v] of Object.entries(local)) if (durable[k] !== v) set[k] = v;
  return set;
}

async function durableSaves(): Promise<Saves> {
  const out: Saves = {};
  const { keys } = await Preferences.keys();
  for (const key of keys) {
    if (!key.startsWith(PREFIX)) continue;
    const { value } = await Preferences.get({ key });
    if (value !== null) out[key] = value;
  }
  return out;
}

/** In the iOS app: keep mirroring the saves to Preferences. A no-op on the web. */
export async function keepSaves(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  let durable: Saves;
  try {
    durable = await durableSaves();
  } catch {
    return; // No durable copy to work with; localStorage alone still works.
  }
  let busy = false;
  const mirror = async (): Promise<void> => {
    if (busy) return;
    busy = true;
    try {
      for (const [key, value] of Object.entries(changes(durable, localSaves()))) {
        await Preferences.set({ key, value });
        durable[key] = value;
      }
    } catch {
      // Try again next time.
    } finally {
      busy = false;
    }
  };
  void mirror();
  setInterval(() => void mirror(), SYNC_EVERY_MS);
  // Mirror right away when the app goes to the background, where it may be closed.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void mirror();
  });
}

// The iOS app's own native plugin (ios/App/App/NativePlugin.swift), reached through Capacitor:
// the App Store review prompt, opening a page in the system browser, Game Center (the policy
// lives in src/native/gamecenter.ts) and the share sheet (src/share.ts). On the web (the
// claude.ai Artifact, a dev browser) everything here is a quiet no-op: nothing is asked of a
// platform that can't do it.

import { Capacitor, registerPlugin } from "@capacitor/core";
import { version } from "../../package.json";
import type { GameCenterPlugin } from "./gamecenter";
import { reviewUrl } from "./rate";

/**
 * The app's App Store id (the number in its App Store URL), once it has a record in App Store
 * Connect. Empty until then: "Rate Sway Tower" then only asks StoreKit for the in-app prompt,
 * which it may decline to show (it rate-limits itself).
 */
export const APP_STORE_ID = "";

/** The app version (package.json), shown in Settings and the key for "once per version". */
export const APP_VERSION: string = version;

/** A box in the page, CSS px (the Share button, to anchor the iPad popover). */
export interface PageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShareOptions {
  /** The picture, PNG, base64 without the data-URL prefix. */
  png: string;
  text: string;
  /** An https link to go with it, when there is one. */
  url?: string;
  rect?: PageRect;
}

interface NativePlugin extends GameCenterPlugin {
  /** Ask StoreKit for the review prompt; `requested` is false when there was no window to show it in. */
  requestReview(): Promise<{ requested: boolean }>;
  /** Open a URL outside the app (Safari, the App Store). */
  openUrl(options: { url: string }): Promise<void>;
  /** The system share sheet; `completed` is false when the player dismissed it. */
  share(options: ShareOptions): Promise<{ completed: boolean }>;
}

/** The plugin, as the page calls it. Only touched when `isNativeApp`. */
export const Native = registerPlugin<NativePlugin>("Native");

/** Running as the iOS app (not the web build). */
export const isNativeApp: boolean = Capacitor.isNativePlatform();

/** The Game Center side of the plugin in the app; null on the web (src/native/gamecenter.ts shows nothing then). */
export const gameCenterPlugin: GameCenterPlugin | null = isNativeApp ? Native : null;

/** Ask for the in-app review prompt. Resolves to whether it was requested (never whether it showed). */
export async function requestReview(): Promise<boolean> {
  if (!isNativeApp) return false;
  try {
    return (await Native.requestReview()).requested;
  } catch {
    return false;
  }
}

/**
 * "Rate Sway Tower": the App Store's review page when the app has an id, else the in-app prompt
 * (a deliberate tap deserves a page that always opens; StoreKit may not).
 */
export async function rateApp(): Promise<void> {
  if (!isNativeApp) return;
  const url = reviewUrl(APP_STORE_ID);
  if (!url) {
    await requestReview();
    return;
  }
  try {
    await Native.openUrl({ url });
  } catch {
    // Nothing to open with: the prompt is the fallback.
    await requestReview();
  }
}

/** The share sheet with a picture and a line. Resolves to whether the player shared (false on the web). */
export async function shareNative(options: ShareOptions): Promise<boolean> {
  if (!isNativeApp) return false;
  try {
    return (await Native.share(options)).completed;
  } catch {
    return false;
  }
}

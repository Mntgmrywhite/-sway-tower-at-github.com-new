// Game Center, in the iOS app: a leaderboard per mode (the tallest tower in Slide and in Drop)
// and the medals as achievements (src/achievements.ts; the ids are the same, so a medal is its
// achievement). The native side is the app's own plugin (ios/App/App/NativePlugin.swift, GameKit);
// this module owns the ids, the App Store Connect table, and the policy around the plugin:
//
// - Sign in quietly, once, after the first PLAY (never on launch before a gesture). GameKit may
//   put up its sign-in sheet then; the game pauses while it is up (`busy`). A player who dismisses
//   it is never asked again by the game: the decline is remembered (`sway-stack:gamecenter`) and
//   Settings offers "Sign in" instead. GameKit itself still signs a player in silently when the
//   device has an account.
// - On every sign-in, each mode's best and every medal in the save go up, so a player who signs
//   in after a week of playing finds everything there.
// - Every game over submits the score. The run's medals are reported (100%) with its game-over
//   card, so GameKit's banner lands on the card and never over the HUD mid-run (while stacking a
//   medal is a chime only: the owner's rule); the sync on sign-in reports without banners.
// - The access point (the player's Game Center bubble) shows on the title screen only.
//
// On the web there is no plugin: everything here is a no-op and `available` is false, so nothing
// Game Center-related shows. Pure where it can be (the plugin and the store are passed in), so the
// policy is tested with a fake plugin.

import { ACHIEVEMENTS, type Achievement, type AchievementSave, type KeyValue, type Tier } from "../achievements";
import type { Mode } from "../game";

// --- Ids (defined once; App Store Connect must match them exactly: store/IOS-CHECKLIST.md) ---

/** The leaderboards: the tallest tower per mode (ids "slide.best" and "drop.best"). */
export const LEADERBOARDS: Readonly<Record<Mode, string>> = { normal: "slide.best", hard: "drop.best" };

/** What each leaderboard is called in App Store Connect. */
export const LEADERBOARD_NAMES: Readonly<Record<Mode, string>> = { normal: "Tallest tower · Slide", hard: "Tallest tower · Drop" };

export function leaderboardId(mode: Mode): string {
  return LEADERBOARDS[mode];
}

/** A medal's Game Center achievement id: the medal id itself ("stack-25", "perfect-9"). */
export function achievementId(medal: Pick<Achievement, "id"> | string): string {
  return typeof medal === "string" ? medal : medal.id;
}

/** Points per achievement by metal (Apple: 1–100 each, 1000 at most in all). */
export const POINTS: Readonly<Record<Tier, number>> = { bronze: 10, silver: 20, gold: 40 };
export const MAX_POINTS_EACH = 100;
export const MAX_POINTS_TOTAL = 1000;

/** One achievement as App Store Connect wants it set up. */
export interface GameCenterAchievement {
  id: string;
  /** The reference name and the title: the medal's name. */
  title: string;
  /** Shown before it is earned. */
  description: string;
  /** Shown once earned. */
  earned: string;
  points: number;
  /** All visible: the Medals screen shows the whole ladder too. */
  hidden: boolean;
}

/** Every medal as an achievement, in ladder order (the stack ladder, then the perfect ladder). */
export const GAME_CENTER_ACHIEVEMENTS: readonly GameCenterAchievement[] = ACHIEVEMENTS.map((a) => ({
  id: achievementId(a),
  title: a.name,
  description: a.description,
  earned: a.kind === "stack" ? `Stacked ${a.goal} bars in one run` : `Landed ${a.goal} perfect drops in a row`,
  points: POINTS[a.tier],
  hidden: false,
}));

// --- The plugin (NativePlugin.swift), as the page sees it ---

export interface AuthResult {
  authenticated: boolean;
  /** The player's Game Center alias, when signed in. */
  playerAlias?: string;
  /** The player dismissed GameKit's sign-in sheet. */
  cancelled?: boolean;
  /** GameKit put its sign-in sheet up during this call. */
  shown?: boolean;
}

/**
 * What GameKit is doing: its sign-in sheet is up (the game pauses), or it is done. A "done"
 * carries the player's state when GameKit answered: also on its own, later (a player who signed
 * in under the Settings app and came back), when no ask was waiting.
 */
export interface GameCenterEvent {
  state: "presenting" | "done";
  authenticated?: boolean;
  playerAlias?: string;
}

export interface GameCenterPlugin {
  authenticate(): Promise<AuthResult>;
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>;
  /** Report these achievements at `percent` (100 completes them); `banner` shows GameKit's banner for each newly earned one. */
  reportAchievements(options: { ids: string[]; percent: number; banner: boolean }): Promise<void>;
  showLeaderboard(options: { leaderboardId: string }): Promise<void>;
  showAchievements(): Promise<void>;
  /** The access point, bottom-leading (clear of the logo and the title's controls), on or off. */
  setAccessPoint(options: { active: boolean }): Promise<void>;
  addListener(event: "gameCenter", listener: (e: GameCenterEvent) => void): Promise<unknown> | unknown;
}

// --- The save: whether the player declined the sign-in ---

export const GAME_CENTER_KEY = "sway-stack:gamecenter";

export interface GameCenterSave {
  /** The player dismissed the sign-in: the game never asks again on its own. */
  declined: boolean;
}

export function parseGameCenterSave(raw: string | null): GameCenterSave {
  const out: GameCenterSave = { declined: false };
  if (!raw) return out;
  try {
    const saved = JSON.parse(raw) as unknown;
    if (saved && typeof saved === "object" && typeof (saved as Record<string, unknown>).declined === "boolean") {
      out.declined = (saved as Record<string, unknown>).declined as boolean;
    }
  } catch {
    // Not JSON: as if never declined.
  }
  return out;
}

export function serializeGameCenterSave(s: GameCenterSave): string {
  return JSON.stringify({ declined: s.declined });
}

// --- The Settings row's words ---

/**
 * What the Settings sheet's Game Center row says for a status. `askedAndRefused`: a deliberate
 * Sign in that GameKit answered without its sheet and without signing in (a player who dismissed
 * it a few times is not shown it again that launch), so the row says where to go instead.
 */
export function gameCenterRow(status: GameCenterStatus, askedAndRefused: boolean): { name: string; note: string; action: string } {
  if (status.busy || status.asking) return { name: "Signing in…", note: "Game Center is asking for your account.", action: "Sign in" };
  if (status.authenticated) {
    return { name: status.alias || "Signed in", note: "Your tallest towers and medals are on Game Center.", action: "Leaderboard" };
  }
  return {
    name: "Not signed in",
    note: askedAndRefused
      ? "Sign in under Game Center in the Settings app, then come back."
      : "Put your tallest towers on the leaderboards and your medals on your profile.",
    action: "Sign in",
  };
}

// --- The controller ---

export interface GameCenterStatus {
  /** Game Center exists here (the iOS app). False on the web: show nothing. */
  available: boolean;
  authenticated: boolean;
  /** The player's alias, or "" until signed in. */
  alias: string;
  /** The player dismissed the sign-in once: the game only offers it in Settings now. */
  declined: boolean;
  /** GameKit's sign-in sheet is up: the game pauses. */
  busy: boolean;
  /** A sign-in is in flight (GameKit may take a few seconds to answer, sheet or not): Settings says so. */
  asking: boolean;
}

/** What the controller needs from the game. */
export interface GameCenterHost {
  /** The native plugin, or null on the web. */
  plugin: GameCenterPlugin | null;
  /** Where the decline is remembered (localStorage; null where it is blocked). */
  store: KeyValue | null;
  /** Each mode's best, to submit on sign-in. */
  bests(): Readonly<Record<Mode, number>>;
  /** The medal save, to report on sign-in. */
  medals(): AchievementSave;
  /** The status changed (signed in, the sheet up or down): the sheets re-render. */
  onChange?(): void;
}

export interface GameCenter {
  status(): GameCenterStatus;
  /**
   * The first PLAY: sign in quietly, once per launch, unless the player declined before. Resolves
   * when GameKit is done (at once on the web).
   */
  firstPlay(): Promise<void>;
  /** "Sign in" in Settings: a deliberate ask, which forgets an earlier decline if it succeeds. */
  signIn(): Promise<GameCenterStatus>;
  /** A run ended with `score` bars in `mode`: the leaderboard gets it (nothing for 0). */
  gameOver(mode: Mode, score: number): void;
  /** The medals a run earned (called with its game-over card): reported complete, with GameKit's banner. */
  earned(medals: readonly Pick<Achievement, "id">[]): void;
  showLeaderboard(mode: Mode): void;
  showAchievements(): void;
  /** The access point: on (the title screen, signed in) or off (a run, a sheet). Deduped. */
  setAccessPoint(active: boolean): void;
}

export function createGameCenter(host: GameCenterHost): GameCenter {
  const plugin = host.plugin;
  let save: GameCenterSave = { declined: false };
  try {
    save = parseGameCenterSave(host.store?.getItem(GAME_CENTER_KEY) ?? null);
  } catch {
    // Storage blocked: as if never declined.
  }
  let authenticated = false;
  let alias = "";
  let busy = false;
  /** An ask is waiting on GameKit. */
  let asking = false;
  /** Tried once this launch (the quiet one after the first PLAY). */
  let tried = false;
  let pending: Promise<GameCenterStatus> | null = null;
  /** Where the access point was last set (GameKit starts with it off). */
  let accessPoint = false;

  const status = (): GameCenterStatus => ({ available: plugin !== null, authenticated, alias, declined: save.declined, busy, asking });
  const changed = (): void => host.onChange?.();

  function remember(declined: boolean): void {
    if (save.declined === declined) return;
    save = { declined };
    try {
      host.store?.setItem(GAME_CENTER_KEY, serializeGameCenterSave(save));
    } catch {
      // Storage blocked: the ask may come again next launch.
    }
  }

  /** Swallow a plugin failure: Game Center is a bonus, never an error the player sees. */
  const quiet = (p: Promise<unknown> | undefined): void => void p?.catch(() => {});

  /** Signed in: everything earned so far goes up, so the boards and the medals are complete. */
  function sync(): void {
    if (!plugin || !authenticated) return;
    const bests = host.bests();
    for (const mode of Object.keys(LEADERBOARDS) as Mode[]) {
      if (bests[mode] > 0) quiet(plugin.submitScore({ leaderboardId: leaderboardId(mode), score: bests[mode] }));
    }
    const ids = ACHIEVEMENTS.filter((a) => host.medals().earned[a.id]).map(achievementId);
    // No banners: a player signing in after a week of medals would get one per medal.
    if (ids.length > 0) quiet(plugin.reportAchievements({ ids, percent: 100, banner: false }));
  }

  /** GameKit's word on the player: signed in (with the alias) or not; a fresh sign-in syncs. */
  function apply(r: { authenticated: boolean; playerAlias?: string }): void {
    const was = authenticated;
    authenticated = r.authenticated;
    alias = r.authenticated ? (r.playerAlias ?? "") : "";
    if (authenticated) remember(false);
    if (authenticated && !was) sync();
  }

  if (plugin) {
    void plugin.addListener("gameCenter", (e) => {
      busy = e.state === "presenting";
      if (e.state === "done" && typeof e.authenticated === "boolean") apply({ authenticated: e.authenticated, playerAlias: e.playerAlias });
      changed();
    });
  }

  /** Ask GameKit (one ask at a time; a second caller waits on the first). */
  function authenticate(): Promise<GameCenterStatus> {
    if (!plugin) return Promise.resolve(status());
    if (pending) return pending;
    const ask = (async () => {
      tried = true;
      // Settings says "Signing in…" while GameKit thinks (it can take seconds, sheet or not).
      asking = true;
      changed();
      try {
        const r = await plugin.authenticate();
        apply(r);
        if (!r.authenticated && r.cancelled) remember(true);
      } catch {
        // GameKit failed (no network, restrictions): not signed in, nothing remembered.
        authenticated = false;
        alias = "";
      } finally {
        busy = false;
        asking = false;
      }
      changed();
      return status();
    })();
    pending = ask;
    // Cleared once settled (not inside the ask, which a plugin failing at once settles before
    // `pending` is even set).
    void ask.then(() => {
      if (pending === ask) pending = null;
    });
    return ask;
  }

  return {
    status,
    async firstPlay() {
      if (!plugin || tried || save.declined) return;
      await authenticate();
    },
    // A deliberate ask goes ahead after a decline. GameKit may answer without its sheet (a player
    // who dismissed it a few times is not shown it again that launch): Settings then says where to go.
    signIn: authenticate,
    gameOver(mode, score) {
      if (!plugin || !authenticated || score <= 0) return;
      quiet(plugin.submitScore({ leaderboardId: leaderboardId(mode), score }));
    },
    earned(medals) {
      if (!plugin || !authenticated || medals.length === 0) return;
      quiet(plugin.reportAchievements({ ids: medals.map(achievementId), percent: 100, banner: true }));
    },
    showLeaderboard(mode) {
      if (plugin && authenticated) quiet(plugin.showLeaderboard({ leaderboardId: leaderboardId(mode) }));
    },
    showAchievements() {
      if (plugin && authenticated) quiet(plugin.showAchievements());
    },
    setAccessPoint(active) {
      if (!plugin) return;
      // Only a signed-in player has a bubble to show; an unsigned one would be asked to sign in by it.
      const on = active && authenticated;
      if (on === accessPoint) return;
      accessPoint = on;
      quiet(plugin.setAccessPoint({ active: on }));
    },
  };
}

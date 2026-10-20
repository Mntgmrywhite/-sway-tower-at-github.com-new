import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, PERFECT_MEDALS, STACK_MEDALS, emptySave, record, type AchievementSave, type KeyValue } from "../achievements";
import type { Mode } from "../game";
import {
  GAME_CENTER_ACHIEVEMENTS,
  GAME_CENTER_KEY,
  LEADERBOARDS,
  LEADERBOARD_NAMES,
  MAX_POINTS_EACH,
  MAX_POINTS_TOTAL,
  achievementId,
  createGameCenter,
  gameCenterRow,
  leaderboardId,
  parseGameCenterSave,
  serializeGameCenterSave,
  type AuthResult,
  type GameCenterEvent,
  type GameCenterPlugin,
} from "./gamecenter";

describe("the ids", () => {
  it("has a leaderboard per mode, named for the player's words", () => {
    expect(LEADERBOARDS).toEqual({ normal: "slide.best", hard: "drop.best" });
    expect(leaderboardId("normal")).toBe("slide.best");
    expect(leaderboardId("hard")).toBe("drop.best");
    expect(LEADERBOARD_NAMES.normal).toContain("Slide");
    expect(LEADERBOARD_NAMES.hard).toContain("Drop");
  });

  it("every medal is its own achievement, by the same id, in ladder order", () => {
    expect(GAME_CENTER_ACHIEVEMENTS.map((a) => a.id)).toEqual(ACHIEVEMENTS.map((a) => a.id));
    for (const a of ACHIEVEMENTS) expect(achievementId(a)).toBe(a.id);
    expect(achievementId("perfect-9")).toBe("perfect-9");
    expect(GAME_CENTER_ACHIEVEMENTS).toHaveLength(STACK_MEDALS.length + PERFECT_MEDALS.length);
    expect(GAME_CENTER_ACHIEVEMENTS).toHaveLength(30);
    // Stable, App Store Connect-safe ids: lowercase letters, digits and a dash.
    for (const a of GAME_CENTER_ACHIEVEMENTS) expect(a.id).toMatch(/^[a-z]+-\d+$/);
    expect(new Set(GAME_CENTER_ACHIEVEMENTS.map((a) => a.id)).size).toBe(30);
  });

  it("has titles and both descriptions, and points Apple accepts", () => {
    let total = 0;
    for (const a of GAME_CENTER_ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.title.length).toBeLessThanOrEqual(30);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.earned.length).toBeGreaterThan(0);
      expect(a.points).toBeGreaterThanOrEqual(1);
      expect(a.points).toBeLessThanOrEqual(MAX_POINTS_EACH);
      expect(a.hidden).toBe(false);
      total += a.points;
    }
    expect(total).toBeLessThanOrEqual(MAX_POINTS_TOTAL);
    // Gold is worth more than bronze up each ladder.
    const stack = GAME_CENTER_ACHIEVEMENTS.filter((a) => a.id.startsWith("stack-"));
    expect(stack.at(-1)!.points).toBeGreaterThan(stack[0]!.points);
    expect(GAME_CENTER_ACHIEVEMENTS.find((a) => a.id === "stack-25")).toMatchObject({
      title: "Stack 25",
      description: "Stack 25 bars in one run",
      earned: "Stacked 25 bars in one run",
    });
    expect(GAME_CENTER_ACHIEVEMENTS.find((a) => a.id === "perfect-9")).toMatchObject({ title: "Perfect ×9", description: "9 perfect drops in a row" });
  });

  it("remembers a decline under a mirrored sway-stack key and reads damaged saves safely", () => {
    expect(GAME_CENTER_KEY.startsWith("sway-stack:")).toBe(true);
    expect(parseGameCenterSave(serializeGameCenterSave({ declined: true }))).toEqual({ declined: true });
    expect(parseGameCenterSave(null)).toEqual({ declined: false });
    expect(parseGameCenterSave("nope")).toEqual({ declined: false });
    expect(parseGameCenterSave('{"declined":"yes"}')).toEqual({ declined: false });
  });
});

/** A Map-backed Storage stand-in. */
function store(init: Record<string, string> = {}): KeyValue & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** A fake plugin that logs every call and answers `authenticate` as told. */
function fakePlugin(answer: () => Promise<AuthResult>) {
  const calls: { method: string; args: unknown }[] = [];
  let listener: ((e: GameCenterEvent) => void) | null = null;
  const log = (method: string, args: unknown = undefined) => {
    calls.push({ method, args });
    return Promise.resolve();
  };
  const plugin: GameCenterPlugin = {
    authenticate() {
      calls.push({ method: "authenticate", args: undefined });
      return answer();
    },
    submitScore: (o) => log("submitScore", o),
    reportAchievements: (o) => log("reportAchievements", o),
    showLeaderboard: (o) => log("showLeaderboard", o),
    showAchievements: () => log("showAchievements"),
    setAccessPoint: (o) => log("setAccessPoint", o),
    addListener(_event, fn) {
      listener = fn;
      return Promise.resolve();
    },
  };
  return { plugin, calls, emit: (e: GameCenterEvent) => listener?.(e), of: (method: string) => calls.filter((c) => c.method === method) };
}

const signedIn = (): Promise<AuthResult> => Promise.resolve({ authenticated: true, playerAlias: "Monty" });
const dismissed = (): Promise<AuthResult> => Promise.resolve({ authenticated: false, cancelled: true, shown: true });

function saveWith(mode: Mode, score: number, streak: number): AchievementSave {
  const save = emptySave();
  record(save, mode, score, streak, 1);
  return save;
}

describe("the Settings row", () => {
  const base = { available: true, authenticated: false, alias: "", declined: false, busy: false, asking: false };

  it("offers Sign in until signed in, then names the player and offers the leaderboard", () => {
    expect(gameCenterRow(base, false)).toMatchObject({ name: "Not signed in", action: "Sign in" });
    expect(gameCenterRow({ ...base, authenticated: true, alias: "Monty" }, false)).toMatchObject({ name: "Monty", action: "Leaderboard" });
    expect(gameCenterRow({ ...base, authenticated: true }, false).name).toBe("Signed in");
    expect(gameCenterRow({ ...base, busy: true }, false).name).toBe("Signing in…");
    // GameKit thinking without its sheet (it can take seconds): the row says so too.
    expect(gameCenterRow({ ...base, asking: true }, false).name).toBe("Signing in…");
  });

  it("says where to sign in when GameKit would not ask any more", () => {
    expect(gameCenterRow(base, true).note).toContain("Settings app");
    expect(gameCenterRow(base, false).note).not.toContain("Settings app");
  });
});

describe("on the web", () => {
  it("has no Game Center: nothing is shown, nothing is called", async () => {
    const gc = createGameCenter({ plugin: null, store: store(), bests: () => ({ normal: 10, hard: 5 }), medals: () => saveWith("normal", 10, 3) });
    expect(gc.status()).toEqual({ available: false, authenticated: false, alias: "", declined: false, busy: false, asking: false });
    await gc.firstPlay();
    expect((await gc.signIn()).authenticated).toBe(false);
    gc.gameOver("normal", 12);
    gc.earned(STACK_MEDALS.slice(0, 2));
    gc.showLeaderboard("hard");
    gc.showAchievements();
    gc.setAccessPoint(true);
    expect(gc.status().available).toBe(false);
  });
});

describe("in the app", () => {
  it("signs in once after the first PLAY, then sends up the bests and every medal in the save, without banners", async () => {
    const f = fakePlugin(signedIn);
    const save = saveWith("hard", 12, 6);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 30, hard: 12 }), medals: () => save });
    expect(gc.status()).toMatchObject({ available: true, authenticated: false });
    expect(f.of("authenticate")).toHaveLength(0);
    await gc.firstPlay();
    expect(f.of("authenticate")).toHaveLength(1);
    expect(gc.status()).toMatchObject({ authenticated: true, alias: "Monty", declined: false, busy: false });
    expect(f.of("submitScore").map((c) => c.args)).toEqual([
      { leaderboardId: "slide.best", score: 30 },
      { leaderboardId: "drop.best", score: 12 },
    ]);
    const reported = f.of("reportAchievements");
    expect(reported).toHaveLength(1);
    expect(reported[0]!.args).toEqual({ ids: ["stack-5", "stack-10", "perfect-3", "perfect-6"], percent: 100, banner: false });
    // Once per launch.
    await gc.firstPlay();
    expect(f.of("authenticate")).toHaveLength(1);
  });

  it("submits nothing for a mode without a best and reports nothing for an empty save", async () => {
    const f = fakePlugin(signedIn);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await gc.firstPlay();
    expect(f.of("submitScore")).toHaveLength(0);
    expect(f.of("reportAchievements")).toHaveLength(0);
  });

  it("submits each game over to the mode's leaderboard and reports a run's medals with a banner", async () => {
    const f = fakePlugin(signedIn);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await gc.firstPlay();
    gc.gameOver("normal", 24);
    gc.gameOver("hard", 9);
    gc.gameOver("hard", 0);
    expect(f.of("submitScore").map((c) => c.args)).toEqual([
      { leaderboardId: "slide.best", score: 24 },
      { leaderboardId: "drop.best", score: 9 },
    ]);
    gc.earned([STACK_MEDALS[4]!, PERFECT_MEDALS[0]!]);
    gc.earned([]);
    expect(f.of("reportAchievements").map((c) => c.args)).toEqual([{ ids: ["stack-25", "perfect-3"], percent: 100, banner: true }]);
  });

  it("does nothing with the boards until signed in", async () => {
    const f = fakePlugin(dismissed);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 5, hard: 0 }), medals: () => saveWith("normal", 5, 0) });
    await gc.firstPlay();
    gc.gameOver("normal", 24);
    gc.earned([STACK_MEDALS[0]!]);
    gc.showLeaderboard("normal");
    gc.showAchievements();
    gc.setAccessPoint(true);
    expect(f.calls.map((c) => c.method)).toEqual(["authenticate"]);
  });

  it("remembers a dismissed sign-in and never asks again on its own; Settings can", async () => {
    const s = store();
    const f = fakePlugin(dismissed);
    const gc = createGameCenter({ plugin: f.plugin, store: s, bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await gc.firstPlay();
    expect(gc.status()).toMatchObject({ authenticated: false, declined: true });
    expect(s.data.get(GAME_CENTER_KEY)).toBe('{"declined":true}');

    // The next launch: the quiet ask is skipped.
    const g = fakePlugin(signedIn);
    const later = createGameCenter({ plugin: g.plugin, store: s, bests: () => ({ normal: 7, hard: 0 }), medals: emptySave });
    expect(later.status().declined).toBe(true);
    await later.firstPlay();
    expect(g.of("authenticate")).toHaveLength(0);
    // ...but "Sign in" in Settings goes ahead, and a success forgets the decline.
    const st = await later.signIn();
    expect(st).toMatchObject({ authenticated: true, alias: "Monty", declined: false });
    expect(s.data.get(GAME_CENTER_KEY)).toBe('{"declined":false}');
    expect(g.of("submitScore").map((c) => c.args)).toEqual([{ leaderboardId: "slide.best", score: 7 }]);
  });

  it("a sign-in GameKit answered without its sheet (not cancelled) is not a decline", async () => {
    const f = fakePlugin(() => Promise.resolve({ authenticated: false, shown: false }));
    const s = store();
    const gc = createGameCenter({ plugin: f.plugin, store: s, bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await gc.firstPlay();
    expect(gc.status()).toMatchObject({ authenticated: false, declined: false });
    expect(s.data.has(GAME_CENTER_KEY)).toBe(false);
  });

  it("a GameKit failure leaves the player signed out, quietly", async () => {
    const f = fakePlugin(() => Promise.reject(new Error("no network")));
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await expect(gc.firstPlay()).resolves.toBeUndefined();
    expect(gc.status()).toMatchObject({ authenticated: false, declined: false, busy: false, asking: false });
  });

  it("a plugin that fails at once still lets the next Sign in ask again", async () => {
    let calls = 0;
    const f = fakePlugin(() => {
      calls++;
      if (calls === 1) throw new Error("bridge not ready");
      return Promise.resolve({ authenticated: true, playerAlias: "Monty" });
    });
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    expect((await gc.signIn()).authenticated).toBe(false);
    expect((await gc.signIn()).authenticated).toBe(true);
    expect(f.of("authenticate")).toHaveLength(2);
  });

  it("is busy while GameKit's sheet is up, and tells the host when anything changes", async () => {
    let finish: (r: AuthResult) => void = () => {};
    const f = fakePlugin(() => new Promise<AuthResult>((resolve) => (finish = resolve)));
    let changes = 0;
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave, onChange: () => changes++ });
    const first = gc.firstPlay();
    // Asking: Settings hears at once (GameKit can take seconds to answer).
    expect(gc.status()).toMatchObject({ asking: true, busy: false });
    expect(changes).toBe(1);
    f.emit({ state: "presenting" });
    expect(gc.status().busy).toBe(true);
    expect(changes).toBe(2);
    // A second ask while one is in flight waits on it.
    const second = gc.signIn();
    expect(f.of("authenticate")).toHaveLength(1);
    f.emit({ state: "done" });
    finish({ authenticated: true, playerAlias: "Monty", shown: true });
    await first;
    expect((await second).authenticated).toBe(true);
    expect(gc.status()).toMatchObject({ busy: false, asking: false });
    expect(changes).toBeGreaterThanOrEqual(4);
  });

  it("takes GameKit's word later, unasked: a player who signed in under Settings and came back", async () => {
    const f = fakePlugin(() => Promise.resolve({ authenticated: false, shown: false }));
    let changes = 0;
    const s = store({ [GAME_CENTER_KEY]: '{"declined":true}' });
    const gc = createGameCenter({ plugin: f.plugin, store: s, bests: () => ({ normal: 9, hard: 0 }), medals: () => saveWith("normal", 9, 0), onChange: () => changes++ });
    const st = await gc.signIn();
    expect(st).toMatchObject({ authenticated: false, declined: true });
    expect(f.of("submitScore")).toHaveLength(0);
    // GameKit calls back on its own once the player is signed in: the game is signed in too,
    // the decline is forgotten, and everything earned goes up once.
    f.emit({ state: "done", authenticated: true, playerAlias: "Monty" });
    expect(gc.status()).toMatchObject({ authenticated: true, alias: "Monty", declined: false, busy: false });
    expect(s.data.get(GAME_CENTER_KEY)).toBe('{"declined":false}');
    expect(f.of("submitScore").map((c) => c.args)).toEqual([{ leaderboardId: "slide.best", score: 9 }]);
    expect(f.of("reportAchievements").map((c) => c.args)).toEqual([{ ids: ["stack-5"], percent: 100, banner: false }]);
    f.emit({ state: "done", authenticated: true, playerAlias: "Monty" });
    expect(f.of("submitScore")).toHaveLength(1);
    // Signed out again (GameKit says so): the boards wait until the next sign-in.
    f.emit({ state: "done", authenticated: false });
    expect(gc.status()).toMatchObject({ authenticated: false, alias: "", declined: false });
    gc.gameOver("normal", 30);
    expect(f.of("submitScore")).toHaveLength(1);
    // A bare "done" (the sheet went down) changes nothing about who is signed in.
    f.emit({ state: "presenting" });
    expect(gc.status().busy).toBe(true);
    f.emit({ state: "done" });
    expect(gc.status()).toMatchObject({ authenticated: false, busy: false });
    expect(changes).toBeGreaterThanOrEqual(5);
  });

  it("shows the access point only when signed in, and only switches it when it changes", async () => {
    const f = fakePlugin(signedIn);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    gc.setAccessPoint(true);
    gc.setAccessPoint(true);
    expect(f.of("setAccessPoint")).toHaveLength(0);
    await gc.firstPlay();
    gc.setAccessPoint(true);
    gc.setAccessPoint(true);
    gc.setAccessPoint(false);
    gc.setAccessPoint(false);
    expect(f.of("setAccessPoint").map((c) => c.args)).toEqual([{ active: true }, { active: false }]);
  });

  it("opens the mode's leaderboard and the achievements when signed in", async () => {
    const f = fakePlugin(signedIn);
    const gc = createGameCenter({ plugin: f.plugin, store: store(), bests: () => ({ normal: 0, hard: 0 }), medals: emptySave });
    await gc.firstPlay();
    gc.showLeaderboard("hard");
    gc.showAchievements();
    expect(f.of("showLeaderboard").map((c) => c.args)).toEqual([{ leaderboardId: "drop.best" }]);
    expect(f.of("showAchievements")).toHaveLength(1);
  });
});

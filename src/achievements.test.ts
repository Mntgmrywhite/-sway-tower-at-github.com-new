import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  PERFECT_MEDALS,
  STACK_MEDALS,
  achievement,
  creditBests,
  earnedCount,
  emptySave,
  loadAchievements,
  markSeen,
  medalsToShow,
  nextMedal,
  parseSave,
  record,
  saveAchievements,
  serializeSave,
  type Achievement,
  type KeyValue,
} from "./achievements";
import { drop, newGame, step, swayOffset, top, type GameState, type Mode } from "./game";

/** A Map-backed Storage stand-in; `broken` makes every call throw (storage blocked). */
function store(init: Record<string, string> = {}, broken = false): KeyValue & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem(k) {
      if (broken) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem(k, v) {
      if (broken) throw new Error("blocked");
      data.set(k, v);
    },
  };
}

const ids = (list: readonly Achievement[]) => list.map((a) => a.id);

describe("the ladders", () => {
  it("stack medals every 5 bars from 5 to 100, perfect streaks every 3 from 3 to 30", () => {
    expect(STACK_MEDALS.map((a) => a.goal)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
    expect(PERFECT_MEDALS.map((a) => a.goal)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
    expect(ACHIEVEMENTS).toHaveLength(30);
  });

  it("ids are stable and unique (they'll map to Game Center)", () => {
    expect(ids(STACK_MEDALS).slice(0, 3)).toEqual(["stack-5", "stack-10", "stack-15"]);
    expect(ids(PERFECT_MEDALS).slice(0, 3)).toEqual(["perfect-3", "perfect-6", "perfect-9"]);
    expect(new Set(ids(ACHIEVEMENTS)).size).toBe(ACHIEVEMENTS.length);
    expect(achievement("stack-25")?.name).toBe("Stack 25");
    expect(achievement("perfect-9")?.name).toBe("Perfect ×9");
    expect(achievement("stack-7")).toBeUndefined();
  });

  it("tiers climb bronze, silver, gold along each ladder", () => {
    for (const list of [STACK_MEDALS, PERFECT_MEDALS]) {
      const tiers = list.map((a) => a.tier);
      expect(tiers[0]).toBe("bronze");
      expect(tiers.at(-1)).toBe("gold");
      expect(tiers).toContain("silver");
      const rank = tiers.map((t) => ["bronze", "silver", "gold"].indexOf(t));
      expect(rank).toEqual([...rank].sort((a, b) => a - b));
    }
  });
});

describe("earning", () => {
  it("a stack medal at exactly its goal, not one bar before", () => {
    const save = emptySave();
    expect(record(save, "normal", 4, 0, 1).unlocked).toEqual([]);
    expect(ids(record(save, "normal", 5, 0, 2).unlocked)).toEqual(["stack-5"]);
    expect(ids(record(save, "normal", 9, 0, 3).unlocked)).toEqual([]);
    expect(ids(record(save, "normal", 10, 0, 4).unlocked)).toEqual(["stack-10"]);
    expect(save.earned["stack-5"]).toEqual({ mode: "normal", at: 2 });
  });

  it("each medal is earned once, ever", () => {
    const save = emptySave();
    record(save, "normal", 12, 0, 1);
    const again = record(save, "hard", 12, 0, 2);
    expect(again).toEqual({ unlocked: [], changed: false });
    expect(save.earned["stack-10"]!.mode).toBe("normal");
  });

  it("a jump past several goals earns all of them, in ladder order", () => {
    const save = emptySave();
    expect(ids(record(save, "normal", 23, 7, 1).unlocked)).toEqual(["stack-5", "stack-10", "stack-15", "stack-20", "perfect-3", "perfect-6"]);
  });

  it("either mode counts, and the mode that earned a medal first is kept", () => {
    const save = emptySave();
    record(save, "hard", 6, 3, 1);
    record(save, "normal", 11, 6, 2);
    expect(save.earned["stack-5"]!.mode).toBe("hard");
    expect(save.earned["perfect-3"]!.mode).toBe("hard");
    expect(save.earned["stack-10"]!.mode).toBe("normal");
    expect(save.earned["perfect-6"]!.mode).toBe("normal");
  });

  it("raises the bests (either mode) and says when there's something to save", () => {
    const save = emptySave();
    expect(record(save, "normal", 3, 2, 1)).toEqual({ unlocked: [], changed: true });
    expect(save.best).toEqual({ stack: 3, streak: 2 });
    expect(record(save, "hard", 2, 1, 2).changed).toBe(false);
    expect(save.best).toEqual({ stack: 3, streak: 2 });
  });

  it("new medals are NEW until the Achievements screen is opened", () => {
    const save = emptySave();
    record(save, "normal", 10, 3, 1);
    expect(save.fresh).toEqual(["stack-5", "stack-10", "perfect-3"]);
    expect(markSeen(save)).toBe(true);
    expect(save.fresh).toEqual([]);
    expect(markSeen(save)).toBe(false);
  });

  it("the whole ladder tops out at 100 bars and 30 in a row", () => {
    const save = emptySave();
    record(save, "normal", 250, 99, 1);
    expect(earnedCount(save)).toBe(30);
    expect(nextMedal(save, "stack")).toBeNull();
    expect(nextMedal(save, "perfect")).toBeNull();
  });

  it("the next medal to earn is the lowest still locked", () => {
    const save = emptySave();
    expect(nextMedal(save, "stack")?.id).toBe("stack-5");
    record(save, "normal", 37, 4, 1);
    expect(nextMedal(save, "stack")?.id).toBe("stack-40");
    expect(nextMedal(save, "perfect")?.id).toBe("perfect-6");
  });

  it("best scores from before achievements credit their stack medals (Normal's first)", () => {
    const save = emptySave();
    const got = creditBests(save, { normal: 17, hard: 26 }, 5);
    expect(ids(got.unlocked)).toEqual(["stack-5", "stack-10", "stack-15", "stack-20", "stack-25"]);
    expect(save.earned["stack-15"]!.mode).toBe("normal");
    expect(save.earned["stack-20"]!.mode).toBe("hard");
    expect(save.best).toEqual({ stack: 26, streak: 0 });
    expect(creditBests(save, { normal: 17, hard: 26 }, 6)).toEqual({ unlocked: [], changed: false });
  });
});

/** Play a real game, dropping on the tower top plus `offsets` (cycled), like a player would. */
function playRun(mode: Mode, offsets: number[], drops: number, save = emptySave()) {
  const state: GameState = newGame(mode);
  const unlocked: Achievement[] = [];
  for (let i = 0; i < drops && state.phase === "playing"; i++) {
    for (let t = 0; t < 0.3; t += 1 / 60) step(state, 1 / 60);
    const level = state.blocks.length - 1;
    state.slider.x = top(state).x + swayOffset(state, level) + offsets[i % offsets.length]!;
    drop(state);
    unlocked.push(...record(save, mode, state.score, state.streak, i).unlocked);
  }
  return { state, save, unlocked };
}

describe("in real runs", () => {
  it.each<Mode>(["normal", "hard"])("%s: perfect drops in a row earn the streak medals; a sloppy drop starts over", (mode) => {
    // 4 perfects, a sloppy drop, then 7 perfects: the longest streak is 7.
    const offsets = [0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
    const { save, unlocked, state } = playRun(mode, offsets, offsets.length);
    expect(state.phase).toBe("playing");
    expect(save.best.streak).toBe(7);
    expect(ids(unlocked.filter((a) => a.kind === "perfect"))).toEqual(["perfect-3", "perfect-6"]);
    expect(ids(unlocked.filter((a) => a.kind === "stack"))).toEqual(["stack-5", "stack-10"]);
    for (const a of unlocked) expect(save.earned[a.id]!.mode).toBe(mode);
  });

  it("a perfect run to 30 earns the whole perfect ladder and six stack medals", () => {
    const { save, state } = playRun("normal", [0], 30);
    expect(state.score).toBe(30);
    expect(state.streak).toBe(30);
    expect(PERFECT_MEDALS.every((a) => save.earned[a.id])).toBe(true);
    expect(ids(STACK_MEDALS.filter((a) => save.earned[a.id]))).toEqual(["stack-5", "stack-10", "stack-15", "stack-20", "stack-25", "stack-30"]);
  });

  it("Hard: the bar that topples the tower doesn't count toward a stack medal", () => {
    // Straight up to 4, then steps to the right: the tenth bar lands and tips the tower.
    const { state, save } = playRun("hard", [0, 0, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9], 12);
    expect(state.phase).toBe("over");
    expect(state.toppled).not.toBeNull();
    expect(state.blocks).toHaveLength(11); // the base and ten bars, the last one tipping
    expect(state.score).toBe(9);
    expect(save.best.stack).toBe(9);
    expect(ids(STACK_MEDALS.filter((a) => save.earned[a.id]))).toEqual(["stack-5"]);
  });
});

describe("saving", () => {
  it("round-trips through storage under a sway-stack: key", () => {
    expect(ACHIEVEMENTS_KEY.startsWith("sway-stack:")).toBe(true);
    const kv = store();
    const save = emptySave();
    record(save, "hard", 16, 9, 1234);
    saveAchievements(save, kv);
    expect(kv.data.has(ACHIEVEMENTS_KEY)).toBe(true);
    expect(loadAchievements(kv)).toEqual(save);
  });

  it("nothing saved yet: an empty save", () => {
    expect(loadAchievements(store())).toEqual(emptySave());
  });

  it("blocked storage: an empty save, and saving doesn't throw", () => {
    const kv = store({}, true);
    expect(loadAchievements(kv)).toEqual(emptySave());
    expect(() => saveAchievements(emptySave(), kv)).not.toThrow();
    expect(loadAchievements(null)).toEqual(emptySave());
    expect(() => saveAchievements(emptySave(), null)).not.toThrow();
  });

  it.each([
    ["not JSON", "{oops"],
    ["null", "null"],
    ["a number", "42"],
    ["an array", "[1,2]"],
    ["a string", '"stack-5"'],
    ["wrong shapes", '{"earned":[1],"best":"tall","fresh":{}}'],
  ])("corrupted (%s): an empty save", (_, raw) => {
    expect(parseSave(raw)).toEqual(emptySave());
  });

  it("keeps the valid parts of a damaged save", () => {
    const raw = JSON.stringify({
      earned: {
        "stack-5": { mode: "hard", at: 7 },
        "stack-10": { mode: "easy", at: 8 }, // no such mode
        "stack-15": "yes",
        "perfect-3": { mode: "normal" }, // no time: kept, time 0
        "stack-105": { mode: "normal", at: 9 }, // a later version's medal: kept as is
      },
      best: { stack: -4, streak: "lots" },
      fresh: ["stack-5", "stack-10", 3, "stack-5"],
    });
    const save = parseSave(raw);
    expect(Object.keys(save.earned).sort()).toEqual(["perfect-3", "stack-105", "stack-5"]);
    expect(save.earned["perfect-3"]).toEqual({ mode: "normal", at: 0 });
    // The bests never read lower than the medals earned.
    expect(save.best).toEqual({ stack: 5, streak: 3 });
    expect(save.fresh).toEqual(["stack-5"]);
    expect(earnedCount(save)).toBe(2);
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it("object-key names in a damaged save don't sneak in as medals or NEW marks", () => {
    const raw = '{"earned":{"__proto__":{"mode":"normal","at":1},"stack-5":{"mode":"hard","at":2}},"fresh":["constructor","toString","mode","stack-5"]}';
    const save = parseSave(raw);
    expect(Object.getPrototypeOf(save.earned)).toBe(Object.prototype);
    expect(Object.keys(save.earned)).toEqual(["stack-5"]);
    expect(save.fresh).toEqual(["stack-5"]);
    expect(JSON.parse(serializeSave(save)).fresh).toEqual(["stack-5"]);
  });
});

describe("the game-over card's pick", () => {
  const pick = (got: string[], max: number) => ids(medalsToShow(got.map((id) => achievement(id)!), max));

  it("shows them all when they fit, in ladder order", () => {
    expect(pick(["stack-5", "perfect-3"], 5)).toEqual(["stack-5", "perfect-3"]);
    expect(pick(["perfect-3", "perfect-6", "stack-20", "perfect-9"], 5)).toEqual(["stack-20", "perfect-3", "perfect-6", "perfect-9"]);
  });

  it("otherwise the highest of each kind, taking turns, in ladder order", () => {
    const got = ["stack-5", "stack-10", "stack-15", "stack-20", "stack-25", "stack-30", "perfect-3", "perfect-6"];
    expect(pick(got, 4)).toEqual(["stack-25", "stack-30", "perfect-3", "perfect-6"]);
    expect(pick(["stack-5", "stack-10", "stack-15", "stack-20", "stack-25", "stack-30"], 4)).toEqual(["stack-15", "stack-20", "stack-25", "stack-30"]);
    expect(pick(["perfect-3", "perfect-6", "perfect-9", "stack-5", "stack-10", "stack-15"], 3)).toEqual(["stack-10", "stack-15", "perfect-9"]);
  });
});

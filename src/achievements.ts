import type { Mode } from "./game";

// Achievements: medals for stacking tall (every STACK_STEP bars up to STACK_MAX) and for perfect
// streaks (every PERFECT_STEP perfect drops in a row, up to PERFECT_MAX). Either mode earns them;
// the save remembers which mode earned each first. Ids are stable ("stack-25", "perfect-9") so they
// can map to Game Center later.
//
// Pure: no DOM and no clock (callers pass `now`), so the unlock rules are unit-tested. main.ts
// records every drop, saves, and hands the run's new medals to the game-over card. Nothing shows
// while stacking.

export type MedalKind = "stack" | "perfect";
/** Bronze, silver and gold: the lower, middle and upper third of a kind's ladder. */
export type Tier = "bronze" | "silver" | "gold";

export interface Achievement {
  /** Stable id: "stack-25", "perfect-9". */
  id: string;
  kind: MedalKind;
  /** Bars stacked in one run (stack), or perfect drops in a row (perfect). */
  goal: number;
  /** Short name: "Stack 25", "Perfect ×9". */
  name: string;
  /** What it takes: "Stack 25 bars in one run". */
  description: string;
  tier: Tier;
}

/** Stack medals come every this many bars... */
export const STACK_STEP = 5;
/** ...up to this many. */
export const STACK_MAX = 100;
/** Perfect-streak medals come every this many perfect drops in a row... */
export const PERFECT_STEP = 3;
/** ...up to this many (raise it to add more; ids stay stable). */
export const PERFECT_MAX = 30;

/** Where everything is saved (src/storage.ts mirrors `sway-stack:*` keys in the iOS app). */
export const ACHIEVEMENTS_KEY = "sway-stack:achievements";
/** The save's format version. */
const VERSION = 1;

const TIERS: readonly Tier[] = ["bronze", "silver", "gold"];

function ladder(kind: MedalKind, step: number, max: number): Achievement[] {
  const n = Math.floor(max / step);
  return Array.from({ length: n }, (_, i) => {
    const goal = (i + 1) * step;
    const tier = TIERS[Math.floor((i * TIERS.length) / n)]!;
    return kind === "stack"
      ? { id: `stack-${goal}`, kind, goal, name: `Stack ${goal}`, description: `Stack ${goal} bars in one run`, tier }
      : { id: `perfect-${goal}`, kind, goal, name: `Perfect ×${goal}`, description: `${goal} perfect drops in a row`, tier };
  });
}

/** Every stack medal, lowest first. */
export const STACK_MEDALS: readonly Achievement[] = ladder("stack", STACK_STEP, STACK_MAX);
/** Every perfect-streak medal, lowest first. */
export const PERFECT_MEDALS: readonly Achievement[] = ladder("perfect", PERFECT_STEP, PERFECT_MAX);
/** Every achievement: the stack ladder, then the perfect ladder. */
export const ACHIEVEMENTS: readonly Achievement[] = [...STACK_MEDALS, ...PERFECT_MEDALS];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

/** How an achievement was earned: in which mode (first), and when (ms since 1970). */
export interface Earned {
  mode: Mode;
  at: number;
}

export interface AchievementSave {
  /** Earned achievements by id. Ids this version doesn't know are kept as they are. */
  earned: Record<string, Earned>;
  /** Progress, in either mode, ever: the tallest stack and the longest perfect streak. */
  best: { stack: number; streak: number };
  /** Earned since the Achievements screen was last opened, oldest first (shown as NEW). */
  fresh: string[];
}

export function emptySave(): AchievementSave {
  return { earned: {}, best: { stack: 0, streak: 0 }, fresh: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Read a save, keeping whatever is valid in it: a missing, corrupted or foreign value gives an
 * empty save, a bad entry is dropped. The bests never read lower than the medals earned.
 */
export function parseSave(raw: string | null): AchievementSave {
  const save = emptySave();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return save;
  }
  if (!isRecord(data)) return save;
  if (isRecord(data.earned)) {
    for (const [id, e] of Object.entries(data.earned)) {
      // "__proto__" would set the object's prototype, not add an entry.
      if (id === "__proto__" || !isRecord(e) || (e.mode !== "normal" && e.mode !== "hard")) continue;
      save.earned[id] = { mode: e.mode, at: typeof e.at === "number" && Number.isFinite(e.at) ? e.at : 0 };
    }
  }
  if (isRecord(data.best)) save.best = { stack: count(data.best.stack), streak: count(data.best.streak) };
  if (Array.isArray(data.fresh)) {
    // Own entries only: `in` would also let "constructor" or "toString" through.
    save.fresh = [...new Set(data.fresh.filter((id): id is string => typeof id === "string" && Object.hasOwn(save.earned, id)))];
  }
  for (const id of Object.keys(save.earned)) {
    const a = achievement(id);
    if (a?.kind === "stack") save.best.stack = Math.max(save.best.stack, a.goal);
    if (a?.kind === "perfect") save.best.streak = Math.max(save.best.streak, a.goal);
  }
  return save;
}

export function serializeSave(save: AchievementSave): string {
  return JSON.stringify({ v: VERSION, earned: save.earned, best: save.best, fresh: save.fresh });
}

/** The bits of Storage used here (localStorage in the game, a fake in tests). */
export type KeyValue = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or null where even touching it throws (some private modes). */
function local(): KeyValue | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadAchievements(store: KeyValue | null = local()): AchievementSave {
  try {
    return parseSave(store?.getItem(ACHIEVEMENTS_KEY) ?? null);
  } catch {
    return emptySave();
  }
}

export function saveAchievements(save: AchievementSave, store: KeyValue | null = local()): void {
  try {
    store?.setItem(ACHIEVEMENTS_KEY, serializeSave(save));
  } catch {
    // Storage blocked or full: medals just won't persist past this session.
  }
}

/** What earning changed: the achievements newly earned (ladder order), and whether to save. */
export interface Progress {
  unlocked: Achievement[];
  changed: boolean;
}

function earn(save: AchievementSave, a: Achievement, mode: Mode, now: number, out: Achievement[]): void {
  if (save.earned[a.id]) return;
  save.earned[a.id] = { mode, at: now };
  save.fresh.push(a.id);
  out.push(a);
}

/**
 * After a drop: `score` bars stacked in this run and `streak` perfect drops in a row so far, in
 * `mode`. Earns every medal they reach (each only once, ever) and raises the bests.
 */
export function record(save: AchievementSave, mode: Mode, score: number, streak: number, now: number): Progress {
  const unlocked: Achievement[] = [];
  const before = save.best;
  save.best = { stack: Math.max(before.stack, count(score)), streak: Math.max(before.streak, count(streak)) };
  for (const a of STACK_MEDALS) if (a.goal <= score) earn(save, a, mode, now, unlocked);
  for (const a of PERFECT_MEDALS) if (a.goal <= streak) earn(save, a, mode, now, unlocked);
  const changed = unlocked.length > 0 || save.best.stack !== before.stack || save.best.streak !== before.streak;
  return { unlocked, changed };
}

/**
 * Stack medals for best scores reached before achievements existed (sway-stack:best and
 * sway-stack:best:hard). Normal's is credited first; there's no record of perfect streaks then.
 */
export function creditBests(save: AchievementSave, bests: Readonly<Record<Mode, number>>, now: number): Progress {
  const a = record(save, "normal", bests.normal, 0, now);
  const b = record(save, "hard", bests.hard, 0, now);
  return { unlocked: [...a.unlocked, ...b.unlocked], changed: a.changed || b.changed };
}

/** The Achievements screen was opened: nothing is NEW any more. Returns whether anything was. */
export function markSeen(save: AchievementSave): boolean {
  if (save.fresh.length === 0) return false;
  save.fresh = [];
  return true;
}

/** How many of this version's achievements are earned. */
export function earnedCount(save: AchievementSave): number {
  return ACHIEVEMENTS.filter((a) => save.earned[a.id]).length;
}

/** The next medal of a kind still to earn, or null when the ladder is done. */
export function nextMedal(save: AchievementSave, kind: MedalKind): Achievement | null {
  const list = kind === "stack" ? STACK_MEDALS : PERFECT_MEDALS;
  return list.find((a) => !save.earned[a.id]) ?? null;
}

/**
 * Which of a run's new medals the game-over card shows, in ladder order (stacks, then streaks):
 * all of them when they fit, else the highest of each kind first, taking turns (stack first).
 */
export function medalsToShow(list: readonly Achievement[], max: number): Achievement[] {
  if (list.length <= max) return ACHIEVEMENTS.filter((a) => list.includes(a));
  const desc = (kind: MedalKind) => list.filter((a) => a.kind === kind).sort((a, b) => b.goal - a.goal);
  const queues = [desc("stack"), desc("perfect")];
  const picked: Achievement[] = [];
  for (let turn = 0; picked.length < max; turn++) {
    const q = queues[turn % 2]!.length ? queues[turn % 2]! : queues[(turn + 1) % 2]!;
    const next = q.shift();
    if (!next) break;
    picked.push(next);
  }
  return ACHIEVEMENTS.filter((a) => picked.includes(a));
}

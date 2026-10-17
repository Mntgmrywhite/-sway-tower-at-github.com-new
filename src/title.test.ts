import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { pickSong, SONGS } from "./audio/engine";
import { drop, fallTime, newGame, step, type GameState, type Mode, type Phase } from "./game";
import { newView, render, titleLayout, type RenderOptions } from "./render";
import { SKINS } from "./skins";
import { classic } from "./skins/classic";
import { flowStep, keyIntent, modeCards, skinSong, tapIntent, type Intent, type KeyPress, type Screen } from "./title";

const key = (code: string, k = "", repeat = false): KeyPress => ({ code, key: k, repeat });
const SPACE = key("Space", " ");
const ENTER = key("Enter", "Enter");
const ESCAPE = key("Escape", "Escape");

describe("keys", () => {
  it.each<[Screen, Phase, KeyPress, boolean, Intent | null]>([
    // Title: Space or Enter plays, unless the keyboard put the focus on a control (Skins, Sound, ⚙…).
    ["title", "playing", SPACE, false, "play"],
    ["title", "playing", ENTER, false, "play"],
    ["title", "playing", SPACE, true, null],
    ["title", "playing", ENTER, true, null],
    ["title", "playing", ESCAPE, false, null],
    ["title", "playing", key("KeyA", "a"), false, null],
    // Stacking: Space drops, as before the title screen; nothing else does anything.
    ["run", "playing", SPACE, false, "drop"],
    ["run", "playing", SPACE, true, "drop"],
    ["run", "playing", ENTER, false, null],
    ["run", "playing", ESCAPE, false, null],
    // Game over: Space or Enter plays again, Escape goes back to the title.
    ["run", "over", SPACE, false, "again"],
    ["run", "over", ENTER, false, "again"],
    ["run", "over", ESCAPE, false, "menu"],
    ["run", "over", ESCAPE, true, "menu"],
    // ...the focused Menu button keeps Space and Enter for itself.
    ["run", "over", SPACE, true, null],
    ["run", "over", ENTER, true, null],
  ])("%s / %s: %j (on a control: %s) → %s", (screen, phase, k, onControl, intent) => {
    expect(keyIntent(screen, phase, k, onControl)).toBe(intent);
  });

  it("a held key repeats nothing", () => {
    for (const [screen, phase] of [["title", "playing"], ["run", "playing"], ["run", "over"]] as const) {
      for (const k of [SPACE, ENTER, ESCAPE]) expect(keyIntent(screen, phase, { ...k, repeat: true }, false)).toBeNull();
    }
  });
});

describe("taps", () => {
  it("do nothing on the title (PLAY starts), drop while stacking, play again on the card", () => {
    expect(tapIntent("title", "playing")).toBeNull();
    expect(tapIntent("run", "playing")).toBe("drop");
    expect(tapIntent("run", "over")).toBe("again");
  });
});

/** main.ts's act(), on a bare game: the screen, the game and whether the card is past its guard. */
class Flow {
  screen: Screen = "title";
  game: GameState;
  cardReady = false;
  /** Past the run's short start guard (main.ts: a while after PLAY or playing again). */
  runReady = true;
  constructor(public mode: Mode = "normal") {
    this.game = newGame(mode);
  }
  act(intent: Intent): boolean {
    const next = flowStep(this.screen, this.game, intent, this.cardReady, this.runReady);
    if (!next) return false;
    if (next.fresh) {
      this.game = newGame(this.mode);
      this.cardReady = false;
    }
    this.screen = next.screen;
    if (intent === "drop") {
      drop(this.game);
      // Drop lets the bar go: main.ts's frames step it until it lands.
      if (this.game.fall) step(this.game, fallTime(this.game.mode));
    }
    return true;
  }
  /** Put the slider right over the tower top (the sway is still nothing this low). */
  aim(): void {
    this.game.slider.x = this.game.blocks[this.game.blocks.length - 1]!.x;
  }
  /** Miss until the run is over (the slider far off the tower). */
  missOut(): void {
    while (this.game.phase === "playing") {
      this.game.slider.x = 10_000;
      this.act("drop");
    }
  }
}

describe("title flow", () => {
  it("starts on the title with the tower standing still", () => {
    const f = new Flow();
    expect(f.screen).toBe("title");
    // Nothing on the title touches the run: no drop, no again, no menu.
    for (const intent of ["drop", "again", "menu"] as const) expect(f.act(intent)).toBe(false);
    expect(f.game.blocks.length).toBe(1);
    expect(f.screen).toBe("title");
  });

  it("PLAY goes straight into the run on the same tower; PLAY again does nothing", () => {
    const f = new Flow();
    const tower = f.game;
    expect(f.act("play")).toBe(true);
    expect(f.screen).toBe("run");
    expect(f.game).toBe(tower);
    expect(f.act("play")).toBe(false);
    f.aim();
    expect(f.act("drop")).toBe(true);
    expect(f.game.blocks.length).toBe(2);
  });

  it("a drop right after PLAY or playing again (a double tap) waits out the run's start guard", () => {
    const f = new Flow("hard");
    f.act("play");
    f.runReady = false;
    // The slider starts at its far end: a drop there would leave Drop's first bar a sliver.
    expect(f.act("drop")).toBe(false);
    expect(f.game.blocks.length).toBe(1);
    expect(f.game.phase).toBe("playing");
    f.runReady = true;
    f.aim();
    expect(f.act("drop")).toBe(true);
    expect(f.game.blocks.length).toBe(2);
    // The guard only holds drops: PLAY, play again and Menu don't wait for it.
    const fresh = { phase: "playing" as const, score: 0 };
    expect(flowStep("title", fresh, "play", false, false)).toEqual({ screen: "run", fresh: false });
    const over = { phase: "over" as const, score: 3 };
    expect(flowStep("run", over, "again", true, false)).toEqual({ screen: "run", fresh: true });
    expect(flowStep("run", over, "menu", true, false)).toEqual({ screen: "title", fresh: true });
  });

  it("PLAY on a tower that already moved on starts a fresh one", () => {
    const f = new Flow();
    f.game.phase = "over";
    expect(f.act("play")).toBe(true);
    expect(f.game.phase).toBe("playing");
    expect(f.game.score).toBe(0);
  });

  it("the game-over card waits out its guard, then plays again (staying in the run)", () => {
    const f = new Flow();
    f.act("play");
    f.missOut();
    expect(f.game.phase).toBe("over");
    // A drop on the card does nothing; play again and menu wait for the guard.
    expect(f.act("drop")).toBe(false);
    expect(f.act("again")).toBe(false);
    expect(f.act("menu")).toBe(false);
    f.cardReady = true;
    expect(f.act("again")).toBe(true);
    expect(f.screen).toBe("run");
    expect(f.game.phase).toBe("playing");
    expect(f.game.lives).toBe(3);
  });

  it("Menu on the game-over card goes back to the title with a fresh tower; PLAY runs it", () => {
    const f = new Flow("hard");
    f.act("play");
    f.missOut();
    f.cardReady = true;
    expect(f.act("menu")).toBe(true);
    expect(f.screen).toBe("title");
    expect(f.game.phase).toBe("playing");
    expect(f.game.score).toBe(0);
    expect(f.game.mode).toBe("hard");
    const fresh = f.game;
    // The title holds the tower still: main.ts doesn't step it, so PLAY keeps it.
    expect(f.act("play")).toBe(true);
    expect(f.game).toBe(fresh);
    step(f.game, 0.1);
    expect(f.act("drop")).toBe(true);
  });

  it("a key and a tap lead to the same intents through the whole loop", () => {
    const f = new Flow();
    expect(tapIntent(f.screen, f.game.phase)).toBeNull();
    f.act(keyIntent(f.screen, f.game.phase, ENTER, false)!);
    expect(f.screen).toBe("run");
    f.aim();
    f.act(tapIntent(f.screen, f.game.phase)!);
    f.aim();
    f.act(keyIntent(f.screen, f.game.phase, SPACE, false)!);
    expect(f.game.blocks.length).toBe(3);
    f.missOut();
    f.cardReady = true;
    f.act(keyIntent(f.screen, f.game.phase, ESCAPE, false)!);
    expect(f.screen).toBe("title");
  });
});

describe("mode cards", () => {
  it("show each mode's own best, the current mode checked", () => {
    expect(modeCards({ normal: 52, hard: 7 }, "normal")).toEqual([
      { value: "normal", title: "Slide", best: "best 52", checked: true },
      { value: "hard", title: "Drop", best: "best 7", checked: false },
    ]);
    const hard = modeCards({ normal: 0, hard: 13 }, "hard");
    expect(hard.map((c) => [c.best, c.checked])).toEqual([
      ["best 0", false],
      ["best 13", true],
    ]);
  });
});

describe("music per skin", () => {
  const byId = (id: string) => SKINS.find((s) => s.id === id)!;
  const song = (id: string, songs: readonly string[]) => pickSong(...skinSong(byId(id)), songs);

  it("each skin plays its own song when it has one", () => {
    const all = SKINS.map((s) => s.id);
    for (const skin of SKINS) expect(pickSong(...skinSong(skin), all)).toBe(skin.id);
  });

  it("until then a neon skin plays Synthwave's, any other Classic's", () => {
    const shipped = ["classic", "neon", "halloween", "christmas"];
    expect(song("neon-cyber", shipped)).toBe("neon");
    expect(song("toyblock", shipped)).toBe("classic");
    expect(song("thanksgiving", shipped)).toBe("classic");
    expect(song("halloween", shipped)).toBe("halloween");
    expect(song("neon", shipped)).toBe("neon");
    // Cyberpunk and Toy Kingdom get their own as soon as they are rendered.
    expect(song("neon-cyber", [...shipped, "neon-cyber"])).toBe("neon-cyber");
    expect(song("toyblock", [...shipped, "toyblock"])).toBe("toyblock");
    // Nothing for the fallback either: Classic.
    expect(pickSong("neon-cyber", "neon", ["classic"])).toBe("classic");
  });

  it("every skin has a song that ships", () => {
    for (const skin of SKINS) expect(SONGS).toContain(pickSong(...skinSong(skin)));
  });
});

describe("title render", () => {
  const W = 390;
  const H = 844;

  it.each(SKINS.map((s) => [s.id, s] as const))("%s draws its title scene without errors", (_, skin) => {
    const ctx = createCanvas(W, H).getContext("2d");
    render(ctx as unknown as CanvasRenderingContext2D, W, H, newGame(), newView(), 12, skin, NaN, { title: true });
  });

  it("the title shows the tower without the slider (between the logo and the foot of the screen)", () => {
    // Rows from under the HUD to above "tap to drop": only the slider differs there.
    const band = (opts: RenderOptions, game = newGame()) => {
      const ctx = createCanvas(W, H).getContext("2d");
      render(ctx as unknown as CanvasRenderingContext2D, W, H, game, newView(), 12, classic, NaN, opts);
      return Buffer.from(ctx.getImageData(0, 200, W, 500).data);
    };
    const offScreen = newGame();
    offScreen.slider.x = 1e5;
    expect(band({ title: true }).equals(band({}))).toBe(false);
    expect(band({ title: true }).equals(band({}, offScreen))).toBe(true);
  });

  it.each([
    [390, 844],
    [320, 568],
    [1280, 720],
  ])("lays the buttons under the logo and the Menu under the game-over card (%i×%i)", (w, h) => {
    const { u, top, menuTop } = titleLayout(w, h);
    expect(u).toBe(Math.min(w, h * 0.6));
    // Under the logo's baseline (0.14 of the height), within a line of it.
    expect(top).toBeGreaterThan(h * 0.14);
    expect(top).toBeLessThan(h * 0.14 + u * 0.13);
    // Under "tap to play again" (the card's bottom at 0.42 h + 0.31 u, the line 0.1 u lower).
    expect(menuTop).toBeGreaterThan(h * 0.42 + u * 0.41);
    expect(menuTop + Math.max(56, u * 0.155)).toBeLessThan(h);
  });
});

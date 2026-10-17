import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNT_FROM, CYCLE, MIDNIGHT } from "../skins/newyear/countdown";
import { cuedPosition, GameAudio, pickSong, songCue, SONGS, type SceneSync } from "./engine";
import manifest from "./music/manifest.json";

/** Stretching: a fake worker that returns an even stretch (silence) a moment later. */
vi.mock("./stretch.worker?worker&inline", () => ({
  default: class {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    postMessage(job: { id: number; rate: number; sampleRate: number; channels: Float32Array[] }) {
      const inLength = job.channels[0]!.length;
      const hop = Math.round(0.03 * job.sampleRate);
      const K = Math.round(inLength / job.rate / hop);
      const anchors = Float64Array.from({ length: K }, (_, k) => (k * hop * job.rate) % inLength);
      const reply = { id: job.id, ok: true, channels: job.channels.map(() => new Float32Array(K * hop)), map: { hop, anchors, inLength, outLength: K * hop } };
      setTimeout(() => this.onmessage?.({ data: reply }), 300);
    }
    terminate() {}
  },
}));

const COUNTDOWN = songCue("newyear", "countdownStart")!;
const info = (song: string) => (manifest as Record<string, { sr: number; L: number; PAD: number }>)[song]!;
const loopSeconds = (song: string) => info(song).L / info(song).sr;
const NEWYEAR_LOOP = loopSeconds("newyear");

describe("where a song that keeps time with the scene comes in", () => {
  it("a fresh scene: the cue, right at the top of its cycle", () => {
    expect(cuedPosition(52, 0, 60, 82)).toBe(52);
  });

  it("a late start: as far past the cue as the scene is into its cycle", () => {
    expect(cuedPosition(52, 5, 60, 82)).toBeCloseTo(57, 9);
    expect(cuedPosition(52, 20, 60, 82)).toBeCloseTo(72, 9);
    // A later minute counts like the first.
    expect(cuedPosition(52, 125, 60, 82)).toBeCloseTo(57, 9);
  });

  it("past the loop's end: the song's cue comes with the scene's next cycle instead", () => {
    const s = cuedPosition(52, 40, 60, 82);
    expect(s).toBeCloseTo(32, 9);
    // 20 s on the scene starts its next cycle, just as the song reaches its cue.
    expect(s + (60 - 40)).toBeCloseTo(52, 9);
  });

  it("always lands inside the loop", () => {
    expect(cuedPosition(70, 20, 60, 82)).toBeCloseTo(30, 9);
    // A song shorter than the cycle wraps around.
    expect(cuedPosition(5, 30, 60, 20)).toBeCloseTo(15, 9);
    for (let t = -90; t < 300; t += 0.7) {
      const s = cuedPosition(52, t, 60, 82);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(82);
    }
  });
});

describe("the New Year's song and screen count together", () => {
  it("the song's countdown is as long as the screen's, inside the loop", () => {
    const midnight = songCue("newyear", "midnight")!;
    expect(midnight - COUNTDOWN).toBeCloseTo(MIDNIGHT - COUNT_FROM, 6);
    expect(COUNTDOWN).toBeGreaterThan(0);
    expect(midnight).toBeLessThan(NEWYEAR_LOOP);
  });

  it("other songs have no countdown", () => {
    for (const song of SONGS.filter((s) => s !== "newyear")) expect(songCue(song, "countdownStart")).toBeUndefined();
  });
});

// ---------------------------------------------------------------- the engine, on a fake context

type Event = { kind: "set" | "linear" | "exp"; v: number; t: number };

/** An AudioParam that keeps its automation, so tests can read its value at any time. */
class FakeParam {
  events: Event[] = [];
  constructor(
    private readonly clock: { currentTime: number },
    private base: number,
  ) {}
  get value(): number {
    return this.at(this.clock.currentTime);
  }
  set value(v: number) {
    this.base = v;
  }
  setValueAtTime(v: number, t: number) {
    this.events.push({ kind: "set", v, t });
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push({ kind: "linear", v, t });
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push({ kind: "exp", v, t });
  }
  cancelScheduledValues(t: number) {
    this.events = this.events.filter((e) => e.t < t);
  }
  /** The value at time t (linear ramps exact; good enough for exponential ones here). */
  at(t: number): number {
    let v = this.base;
    let from = 0;
    for (const e of this.events) {
      if (e.t <= t) {
        v = e.v;
        from = e.t;
        continue;
      }
      if (e.kind === "set") break;
      return v + ((e.v - v) * (t - from)) / (e.t - from);
    }
    return v;
  }
}

interface FakeSource {
  buffer: { duration: number } | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  gain: FakeParam | null;
  when: number;
  offset: number;
  stopAt: number;
}

/** Decoded length of each song: the manifest's loop body plus its pads (the priming trimmed). */
const MUSIC_DIR = fileURLToPath(new URL("./music/", import.meta.url));
const SONG_BY_SIZE = new Map(SONGS.map((s) => [statSync(`${MUSIC_DIR}${s}.mp4`).size, s]));

function rig({ running = true, latency = 0, stretch = false } = {}) {
  const sources: FakeSource[] = [];
  const listeners: (() => void)[] = [];
  let ctx: FakeContext | null = null;
  class FakeContext {
    currentTime = 0;
    state = running ? "running" : "suspended";
    outputLatency = latency;
    baseLatency = 0;
    sampleRate = 48000;
    destination = {};
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      ctx = this;
    }
    private node<T extends object>(extra: T) {
      return { ...extra, connect: (n: unknown) => n };
    }
    createGain() {
      return this.node({ gain: new FakeParam(this, 1) });
    }
    createDynamicsCompressor() {
      return this.node({ threshold: { value: 0 }, ratio: { value: 1 } });
    }
    createBiquadFilter() {
      return this.node({ type: "", Q: { value: 1 }, frequency: new FakeParam(this, 350) });
    }
    createBufferSource() {
      const src: FakeSource = { buffer: null, loop: false, loopStart: 0, loopEnd: 0, gain: null, when: NaN, offset: NaN, stopAt: Infinity };
      sources.push(src);
      return {
        set buffer(b: { duration: number }) {
          src.buffer = b;
        },
        set loop(l: boolean) {
          src.loop = l;
        },
        set loopStart(s: number) {
          src.loopStart = s;
        },
        set loopEnd(s: number) {
          src.loopEnd = s;
        },
        connect(g: { gain: FakeParam }) {
          src.gain = g.gain;
          return g;
        },
        start(when: number, offset: number) {
          src.when = when;
          src.offset = offset;
        },
        stop(t: number) {
          src.stopAt = t;
        },
      };
    }
    createBuffer(channels: number, length: number, sampleRate: number) {
      return { sampleRate, length, duration: length / sampleRate, numberOfChannels: channels, getChannelData: () => new Float32Array(length) };
    }
    decodeAudioData(data: ArrayBuffer) {
      const song = SONG_BY_SIZE.get(data.byteLength);
      if (!song) return Promise.reject(new Error("not a song"));
      const { sr, L, PAD } = info(song);
      const length = L + 2 * PAD;
      return Promise.resolve({ sampleRate: sr, length, duration: length / sr, numberOfChannels: 2, getChannelData: () => new Float32Array(length) });
    }
    resume() {
      return Promise.resolve();
    }
    suspend() {
      return Promise.resolve();
    }
    addEventListener(type: string, f: () => void) {
      if (type === "statechange") listeners.push(f);
    }
  }
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
  vi.stubGlobal("window", { AudioContext: FakeContext });
  vi.stubGlobal("document", { hidden: false, addEventListener() {} });
  vi.stubGlobal("Worker", stretch ? class {} : undefined);

  const audio = new GameAudio();
  /** The tower's scene clock (main.ts: view.t). */
  const scene = { t: 0 };
  const sync: SceneSync = { cue: "countdownStart", cycle: CYCLE, time: () => scene.t - COUNT_FROM };
  const context = () => ctx!;
  /** Let decoding finish (promises), then any re-sync it starts. */
  const settle = () => new Promise<void>((r) => setImmediate(r));
  /** Run time on: the audio clock, the scene clock and the engine's timers together. */
  const run = (seconds: number) => {
    for (let left = seconds; left > 1e-9; left -= 0.01) {
      const dt = Math.min(0.01, left);
      context().currentTime += dt;
      scene.t += dt;
      vi.advanceTimersByTime(dt * 1000);
    }
  };
  /** Seconds into the song (as written) a source plays at context time t. */
  const songTime = (src: FakeSource, t: number, song = "newyear") => {
    const start = info(song).PAD / info(song).sr;
    const e = src.offset + Math.max(0, t - src.when);
    const len = loopSeconds(song);
    return (e < start + len ? e : start + ((e - start) % len)) - start;
  };
  const fireStateChange = () => listeners.forEach((f) => f());
  return { audio, scene, sync, sources, context, settle, run, songTime, fireStateChange };
}

describe("the engine keeps New Year's music in step with the scene", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a fresh tower: the song comes in at its countdown", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    expect(r.sources).toHaveLength(1);
    expect(r.songTime(r.sources[0]!, r.context().currentTime)).toBeCloseTo(COUNTDOWN, 6);
    r.run(3);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 3, 6);
  });

  it("started late (audio unlocks on PLAY): where the scene's minute is", async () => {
    const r = rig();
    r.scene.t = 7;
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 7, 6);
  });

  it("started late in a minute: the song's countdown waits for the screen's next one", async () => {
    const r = rig();
    r.scene.t = 45;
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(CYCLE - 45);
    // The screen shows "10" again; so does the song.
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN, 6);
  });

  it("heard in step with the screen, past the output latency", async () => {
    const r = rig({ latency: 0.03 });
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(0.5);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 0.5, 6);
  });

  it("waits for the audio clock to run, then comes in where the scene is by then", async () => {
    const r = rig({ running: false });
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    expect(r.sources).toHaveLength(0);
    r.scene.t = 2;
    r.context().state = "running";
    r.fireStateChange();
    expect(r.sources).toHaveLength(1);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 2, 6);
  });

  it("playing again: the music cuts to the countdown, cleanly, with its first hit whole", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(33.3);
    const old = r.sources[0]!;
    const now = r.context().currentTime;
    r.scene.t = 0; // restart(): a fresh tower
    r.audio.realign();
    expect(r.sources).toHaveLength(2);
    const next = r.sources[1]!;
    // On the next scheduling slot, a hair before the countdown...
    expect(next.when).toBeGreaterThan(now);
    expect(next.when - now).toBeLessThan(0.1);
    const lead = COUNTDOWN - r.songTime(next, next.when);
    expect(lead).toBeGreaterThan(0);
    expect(lead).toBeLessThan(0.05);
    // ...faded in from silence, at full level when the countdown's first hit plays.
    const hit = next.when + lead;
    expect(next.gain!.at(next.when)).toBe(0);
    expect(next.gain!.at(hit)).toBeCloseTo(1, 6);
    expect(r.songTime(next, hit)).toBeCloseTo(COUNTDOWN, 9);
    // The old place fades out (never cut off mid-wave) and stops once silent.
    expect(old.gain!.at(next.when)).toBe(1);
    for (let t = next.when; t < next.when + 0.2; t += 0.001) expect(Math.abs(old.gain!.at(t + 0.001) - old.gain!.at(t))).toBeLessThan(0.02);
    expect(old.gain!.at(old.stopAt)).toBe(0);
    // Then it plays on with the screen, a few hundredths behind it.
    r.run(5);
    const behind = COUNTDOWN + r.scene.t - r.audio.position();
    expect(behind).toBeGreaterThan(0);
    expect(behind).toBeLessThan(0.1);
  });

  it("a fresh tower during a crossfade: the cut waits for it, then lands where the scene is", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(0.2); // the song is still fading in
    r.scene.t = 0;
    r.audio.realign();
    expect(r.sources).toHaveLength(1);
    r.run(1);
    expect(r.sources).toHaveLength(2);
    r.run(2);
    expect(Math.abs(r.audio.position() - (COUNTDOWN + r.scene.t))).toBeLessThan(0.1);
  });

  it("while it plays, it never re-seeks", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(130);
    expect(r.sources).toHaveLength(1);
    expect(r.audio.position()).toBeCloseTo((COUNTDOWN + 130) % NEWYEAR_LOOP, 4);
  });

  it("switching to New Year's mid-run: it comes in where the scene is", async () => {
    const r = rig();
    r.audio.setMusic("classic");
    r.audio.unlock();
    await r.settle();
    r.run(4);
    r.audio.setMusic("newyear", "classic", r.sync);
    await r.settle();
    expect(r.sources).toHaveLength(2);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 4, 4);
  });

  it("music switched back on: it picks up where the scene is, heard in step past the output latency", async () => {
    const r = rig({ latency: 0.03 });
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(1);
    r.audio.setMusicOn(false);
    r.run(69); // the scene is 10 s into its second minute: midnight
    r.audio.setMusicOn(true);
    expect(r.sources).toHaveLength(2);
    r.run(1);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 11, 3);
  });

  it("music switched off and on while still in step: no cut", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(2);
    r.audio.setMusicOn(false);
    r.run(3);
    r.audio.setMusicOn(true);
    r.run(1);
    expect(r.sources).toHaveLength(1);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + 6, 6);
  });

  it("an overlay held the scene still (New Year's picked in the Options sheet): as the scene goes on, so does the count with it", async () => {
    const r = rig({ latency: 0.03 });
    r.audio.setMusic("classic");
    r.audio.unlock();
    await r.settle();
    r.run(3);
    // The sheet opens: the scene's clock stands still while the music plays on.
    const run = (seconds: number) => {
      const t = r.scene.t;
      r.run(seconds);
      r.scene.t = t;
    };
    run(1);
    r.audio.setMusic("newyear", "classic", r.sync);
    await r.settle();
    run(4);
    // Closed: main.ts realigns as the scene goes on (3 s in: the screen shows "7").
    r.audio.realign();
    r.run(1);
    expect(r.audio.position()).toBeCloseTo(COUNTDOWN + r.scene.t, 3);
  });

  it("a fresh tower while the music is sped up: the cut lands on the countdown at the tempo playing", async () => {
    const r = rig({ stretch: true });
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(20);
    r.audio.setTempo(1.06); // a step up: stretched, then switched on a bar line
    r.run(3);
    expect(r.sources).toHaveLength(2);
    const fast = r.sources[1]!.buffer;
    r.scene.t = 0;
    r.audio.realign();
    expect(r.sources).toHaveLength(3);
    expect(r.sources[2]!.buffer).toBe(fast);
    r.run(0.1);
    // In step with the screen at the countdown, a few hundredths behind as it starts.
    expect(COUNTDOWN + r.scene.t - r.audio.position()).toBeGreaterThan(0);
    expect(COUNTDOWN + r.scene.t - r.audio.position()).toBeLessThan(0.1);
  });

  it("other skins: their songs start at the top and a fresh tower leaves them alone", async () => {
    const r = rig();
    r.audio.setMusic("classic");
    r.audio.unlock();
    await r.settle();
    expect(r.songTime(r.sources[0]!, 0, "classic")).toBeCloseTo(0, 9);
    r.run(10);
    r.scene.t = 0;
    r.audio.realign();
    r.run(1);
    expect(r.sources).toHaveLength(1);
    expect(r.audio.position()).toBeCloseTo(11, 4);
  });

  it("a song played in place of a missing one keeps its own time", async () => {
    const r = rig();
    r.scene.t = 5;
    expect(pickSong("nosuch")).toBe("classic");
    r.audio.setMusic("nosuch", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    expect(r.songTime(r.sources[0]!, 0, "classic")).toBeCloseTo(0, 9);
    r.audio.realign();
    expect(r.sources).toHaveLength(1);
  });

  it("leaving New Year's for another skin: that song starts at its top", async () => {
    const r = rig();
    r.audio.setMusic("newyear", "classic", r.sync);
    r.audio.unlock();
    await r.settle();
    r.run(3);
    r.audio.setMusic("christmas", "classic");
    await r.settle();
    expect(r.sources).toHaveLength(2);
    expect(r.songTime(r.sources[1]!, r.sources[1]!.when, "christmas")).toBeCloseTo(0, 9);
  });
});

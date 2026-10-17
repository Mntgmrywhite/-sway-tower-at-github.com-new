// Game audio: looping music per skin and short sound effects, on one Web Audio context.
//
// The audio files ship inside the page (Vite ?inline data URLs), so they work in the single-file
// web build and in the iOS app without fetching. Browsers only allow sound after a user gesture,
// so main.ts calls unlock() from the first tap. Music loops sample-accurately using the loop
// points in manifest.json, crossfades on skin changes, and pauses while the page is hidden.
//
// While a run is played (either mode) the music speeds up with the bar at the same pitch
// (setTempo): the rate is rounded to a tempo step (tempo.ts), a Web Worker time-stretches the
// song's loop to that step (stretch.ts, seamless), and the engine switches to it on the next bar
// line with a short crossfade that keeps the musical position. Each song keeps at most its decoded original and one stretched
// version (plus, for the length of a crossfade, the version it is leaving). Without workers, or
// if a stretch fails, the music just stays as written.

import manifest from "./music/manifest.json";
import { loopPoints, type LoopInfo } from "./loop";
import { inToOut, outToIn, outToInSmooth, sharedFrame, type LoopMap, type StretchJob, type StretchReply } from "./stretch";
import StretchWorker from "./stretch.worker?worker&inline";
import { barSeconds, nextBar, TEMPO_STEPS, tempoStep } from "./tempo";

const MUSIC = import.meta.glob("./music/*.mp4", { query: "?inline", import: "default", eager: true }) as Record<string, string>;
const SFX = import.meta.glob("./sfx/*.mp4", { query: "?inline", import: "default", eager: true }) as Record<string, string>;
const LOOPS = manifest as Record<string, LoopInfo>;

export type Sound = "land" | "slice" | "miss" | "click" | "chime" | "boom";

const SETTINGS_KEY = "sway-stack:audio";
const MUSIC_LEVEL = 0.55;
const SFX_LEVEL = 0.9;
const CROSSFADE = 0.8; // seconds, between songs
/**
 * While playing, the music steps back behind the game: a gentle treble roll-off (it sounds a
 * little further away) and a few dB down. The title and game-over screens get the full band.
 */
const PLAY_MUSIC_GAIN = 0.62; // about -4 dB
const PLAY_MUSIC_TONE = 3200; // Hz, low-pass corner while playing
const OPEN_TONE = 20000;
const FOCUS_IN = 1.2; // seconds to step back when play starts
const FOCUS_OUT = 0.8; // seconds to come forward at game over
/** Crossfade between two tempos of one song, centred on the bar line (seconds). */
const TEMPO_FADE = 0.06;
/** Scheduling margin: a switch is never placed closer than this to now (seconds). */
const SWITCH_LEAD = 0.05;
/**
 * A tempo switch lands this close to its bar line at most (seconds as written, searched every
 * ms): on the nearest point both versions really play, so they are exactly in step there.
 */
const SHARED_REACH = 0.04;
/** A stretch that takes longer than this is given up and the music stays as written (ms). */
const STRETCH_TIMEOUT = 20000;
/** Shortest wait before re-checking a transition that has not finished (ms). */
const RECHECK_MS = 100;

/** Every song name that has rendered music. */
export const SONGS = Object.keys(MUSIC).map((p) => p.replace(/^.*\/|\.mp4$/g, ""));

/** The song that plays for `name`: its own when it has rendered music, else `fallback`, else Classic. */
export function pickSong(name: string, fallback = "classic", songs: readonly string[] = SONGS): string {
  if (songs.includes(name)) return name;
  return songs.includes(fallback) ? fallback : "classic";
}

function bytes(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/**
 * A song's file: inline (the app and the dev build) or, in the published Artifact, a file next to
 * the page that scripts/build-artifact.mjs moved it to (the songs together outgrow one page).
 */
function songBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("data:")) return Promise.resolve(bytes(url));
  return fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${url}`))));
}

interface Settings {
  music: boolean;
  sfx: boolean;
}

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
    return { music: s.music !== false, sfx: s.sfx !== false };
  } catch {
    return { music: true, sfx: true };
  }
}

/** One way to play a song: as written (no map) or stretched to a tempo step. */
interface Version {
  step: number;
  buffer: AudioBuffer;
  /** Stretched time -> time as written; null for the original. */
  map: LoopMap | null;
  /** The loop within `buffer`, seconds (the whole buffer for a stretch). */
  start: number;
  end: number;
  loops: boolean;
}

/** A decoded song and the one stretched version of it kept around. */
interface Song {
  name: string;
  original: Version;
  /** Seconds per bar as written. */
  bar: number;
  /** Has loop points that fit the decoded buffer, so it can be stretched. */
  stretchable: boolean;
  fast: Version | null;
}

/** A playing (or scheduled) source. */
interface Voice {
  song: Song;
  version: Version;
  src: AudioBufferSourceNode;
  gain: GainNode;
  /** Context time it starts, and the buffer time (s) it starts from. */
  t0: number;
  offset: number;
}

const mod = (x: number, n: number): number => ((x % n) + n) % n;

function makeSong(name: string, buffer: AudioBuffer): Song {
  const info = LOOPS[name];
  const sr = buffer.sampleRate;
  const loop = info ? loopPoints(info, buffer.length, sr) : null;
  const original: Version = { step: 0, buffer, map: null, start: loop?.start ?? 0, end: loop?.end ?? buffer.duration, loops: !!loop };
  const stretchable = !!loop && Math.round(loop.start * sr) + Math.round((loop.end - loop.start) * sr) <= buffer.length;
  return { name, original, bar: info ? barSeconds(info) : 2, stretchable, fast: null };
}

/** Buffer time (s) a voice plays at context time t. */
function bufferTime(v: Voice, t: number): number {
  const e = v.offset + Math.max(0, t - v.t0);
  const { start, end, loops } = v.version;
  return e < end || !loops ? e : start + mod(e - start, end - start);
}

/**
 * Seconds into the song as written at buffer time b of a version: exact (for lining up a switch)
 * or even (for the clock visuals read; a stretch plays each frame at 1× and skips between).
 */
function songAt(ver: Version, b: number, even = false): number {
  if (!ver.map) return b - ver.start;
  const sr = ver.buffer.sampleRate;
  return (even ? outToInSmooth(ver.map, b * sr) : outToIn(ver.map, b * sr)) / sr;
}

/** Buffer time (s) in a version where second s of the song (as written) plays. */
function bufferAt(ver: Version, s: number): number {
  return ver.map ? inToOut(ver.map, s * ver.buffer.sampleRate) / ver.buffer.sampleRate : ver.start + s;
}

/** The second of the song (as written) nearest `s`, within SHARED_REACH, that both versions play. */
function sharedPoint(a: Version, b: Version, s: number): number {
  const sr = a.buffer.sampleRate;
  return sharedFrame([a.map, b.map], s * sr, SHARED_REACH * sr, sr / 1000) / sr;
}

type StretchResult = { channels: Float32Array[]; map: LoopMap } | null;

/** The worker that stretches songs: one job at a time; any failure retires it for good. */
class Stretcher {
  alive = typeof Worker !== "undefined";
  private worker: Worker | null = null;
  private job: { id: number; song: string; step: number; timer: ReturnType<typeof setTimeout> } | null = null;
  private ids = 0;

  constructor(private readonly done: (song: string, step: number, result: StretchResult) => void) {}

  get busy(): boolean {
    return this.job !== null;
  }

  start(song: string, step: number, sampleRate: number, channels: Float32Array[]): void {
    if (!this.alive || this.job) return;
    try {
      this.worker ??= this.spawn();
      const id = ++this.ids;
      this.job = { id, song, step, timer: setTimeout(() => this.fail(), STRETCH_TIMEOUT) };
      const job: StretchJob = { id, rate: TEMPO_STEPS[step]!, sampleRate, channels };
      this.worker.postMessage(
        job,
        channels.map((c) => c.buffer as ArrayBuffer),
      );
    } catch {
      this.fail();
    }
  }

  private spawn(): Worker {
    const worker = new StretchWorker();
    worker.onmessage = (e: MessageEvent<StretchReply>) => {
      const job = this.job;
      const reply = e.data;
      if (!job || reply.id !== job.id) return;
      if (!reply.ok) {
        this.fail();
        return;
      }
      clearTimeout(job.timer);
      this.job = null;
      this.done(job.song, job.step, { channels: reply.channels, map: reply.map });
    };
    worker.onerror = () => this.fail();
    worker.onmessageerror = () => this.fail();
    return worker;
  }

  private fail(): void {
    const job = this.job;
    this.alive = false;
    this.job = null;
    if (job) clearTimeout(job.timer);
    this.worker?.terminate();
    this.worker = null;
    this.done(job?.song ?? "", job?.step ?? 0, null);
  }
}

class GameAudio {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private focusGain: GainNode | null = null;
  private focusTone: BiquadFilterNode | null = null;
  private playing = false;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private songs = new Map<string, Song>();
  private loading = new Set<string>();
  private failed = new Set<string>();
  private current: Voice | null = null;
  /** The voice fading out while `current` fades in, until `busyUntil`. */
  private previous: Voice | null = null;
  private busyUntil = 0;
  private recheck: ReturnType<typeof setTimeout> | null = null;
  private stretcher: Stretcher | null = null;
  private wanted = "";
  /** Tempo step asked for (index into TEMPO_STEPS). */
  private step = 0;
  private landTurn = 0;
  readonly settings: Settings = loadSettings();

  /** Create/resume the audio context. Call from a user gesture (tap, key). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const master = this.ctx.createGain();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.ratio.value = 12;
      master.connect(limiter).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = this.settings.music ? MUSIC_LEVEL : 0;
      this.sfxBus.gain.value = this.settings.sfx ? SFX_LEVEL : 0;
      // music -> focus (dip + tone) -> master
      this.focusGain = this.ctx.createGain();
      this.focusTone = this.ctx.createBiquadFilter();
      this.focusTone.type = "lowpass";
      this.focusTone.Q.value = 0.5;
      this.focusGain.gain.value = this.playing ? PLAY_MUSIC_GAIN : 1;
      this.focusTone.frequency.value = this.playing ? PLAY_MUSIC_TONE : OPEN_TONE;
      this.musicBus.connect(this.focusGain).connect(this.focusTone).connect(master);
      this.sfxBus.connect(master);
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
      this.sync();
    }
    if (this.ctx.state !== "running") void this.ctx.resume();
  }

  private decode(path: string, table: Record<string, string>): Promise<AudioBuffer> {
    let p = this.buffers.get(path);
    if (!p) {
      const url = table[path];
      if (!url || !this.ctx) return Promise.reject(new Error(`no audio ${path}`));
      p = this.ctx.decodeAudioData(bytes(url));
      this.buffers.set(path, p);
    }
    return p;
  }

  /**
   * Play this song (crossfading from the current one). A song with no music yet plays `fallback`
   * instead, or Classic if that has none either (pickSong).
   */
  setMusic(name: string, fallback = "classic"): void {
    const song = pickSong(name, fallback);
    if (song === this.wanted) return;
    this.wanted = song;
    this.sync();
  }

  /**
   * Play the music this many times faster (1 = as written) at the same pitch. main.ts
   * calls it every frame with the bar's speed; only a change of tempo step does any work.
   */
  setTempo(rate: number): void {
    const step = tempoStep(rate, this.step);
    if (step === this.step) return;
    this.step = step;
    this.sync();
  }

  /**
   * Seconds into the current song as written (in [0, loop length)), at the moment being heard
   * now; NaN when no music is sounding (not started, muted, suspended or hidden).
   */
  position(): number {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.settings.music) return NaN;
    const lag = Math.min(0.5, Math.max(0, (ctx.outputLatency || 0) + (ctx.baseLatency || 0)));
    const t = ctx.currentTime - lag;
    let v = this.current;
    const prev = this.previous;
    // Until a tempo switch reaches its bar line (or a new song starts), report the one leaving.
    if (v && prev && t < v.t0 + (prev.song === v.song ? TEMPO_FADE / 2 : 0)) v = prev;
    if (!v) return NaN;
    const b = bufferTime(v, t);
    if (!v.version.loops && b >= v.version.end) return NaN;
    return songAt(v.version, b, true);
  }

  /** The step to play a song at: as written when it can't be stretched or nobody hears it. */
  private targetStep(song: Song): number {
    return song.stretchable && this.settings.music ? this.step : 0;
  }

  /**
   * Bring what is playing in line with what is wanted (song, tempo step). Called whenever either
   * changes, a song finishes decoding, a stretch arrives or a crossfade ends; does nothing while a
   * crossfade is under way.
   */
  private sync(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.wanted) return;
    if (ctx.currentTime < this.busyUntil) {
      this.wake(this.busyUntil - ctx.currentTime);
      return;
    }
    this.previous = null;
    const song = this.songs.get(this.wanted);
    if (!song) {
      this.load(this.wanted);
      return;
    }
    // Only the wanted song keeps a stretched version (voices hold on to what they play).
    for (const other of this.songs.values()) if (other !== song) other.fast = null;
    const step = this.targetStep(song);
    let version: Version;
    if (step === 0) version = song.original;
    else if (song.fast?.step === step) version = song.fast;
    else if (this.stretcher?.alive ?? typeof Worker !== "undefined") {
      this.requestStretch(song, step);
      // Keep playing what we have (even the previous song) until the stretch is ready.
      if (this.current) return;
      version = song.original;
    } else version = song.original;

    const cur = this.current;
    if (!cur) this.begin(song, version);
    else if (cur.song !== song) this.changeSong(song, version);
    else if (cur.version !== version) this.changeTempo(version);
  }

  /** Re-run sync() after `seconds` (a crossfade's end); the context clock decides if it is done. */
  private wake(seconds: number): void {
    if (this.recheck !== null) clearTimeout(this.recheck);
    this.recheck = setTimeout(
      () => {
        this.recheck = null;
        this.sync();
      },
      Math.max(RECHECK_MS, seconds * 1000 + 20),
    );
  }

  private load(name: string): void {
    const ctx = this.ctx;
    if (!ctx || this.loading.has(name) || this.failed.has(name)) return;
    this.loading.add(name);
    const url = MUSIC[`./music/${name}.mp4`];
    void (url ? songBytes(url).then((data) => ctx.decodeAudioData(data)) : Promise.reject(new Error(`no music ${name}`)))
      .then(
        (buffer) => this.songs.set(name, makeSong(name, buffer)),
        () => this.failed.add(name),
      )
      .finally(() => {
        this.loading.delete(name);
        this.sync();
      });
  }

  private requestStretch(song: Song, step: number): void {
    const ctx = this.ctx;
    this.stretcher ??= new Stretcher((name, s, result) => this.stretched(name, s, result));
    if (!ctx || this.stretcher.busy || !song.stretchable) return;
    const { buffer, start, end } = song.original;
    const sr = buffer.sampleRate;
    const from = Math.round(start * sr);
    const frames = Math.round((end - start) * sr);
    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c).slice(from, from + frames));
    this.stretcher.start(song.name, step, sr, channels);
  }

  /** A stretch came back (null: the stretcher failed and is retired). */
  private stretched(name: string, step: number, result: StretchResult): void {
    const song = this.songs.get(name);
    const ctx = this.ctx;
    if (result && song && ctx && name === this.wanted && step === this.targetStep(song)) {
      try {
        const sr = song.original.buffer.sampleRate;
        const buffer = ctx.createBuffer(result.channels.length, result.map.outLength, sr);
        result.channels.forEach((c, i) => buffer.getChannelData(i).set(c));
        song.fast = { step, buffer, map: result.map, start: 0, end: result.map.outLength / sr, loops: true };
      } catch {
        // Out of memory or similar: stay as written.
        if (this.stretcher) this.stretcher.alive = false;
      }
    }
    this.sync();
  }

  /** Start a source for `version` at context time `at`, from buffer time `offset`. */
  private voice(song: Song, version: Version, at: number, offset: number): Voice {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = version.buffer;
    if (version.loops) {
      src.loop = true;
      // A stretch is exactly one loop (the default 0/0 loops the whole buffer, sample-exact).
      if (!version.map) {
        src.loopStart = version.start;
        src.loopEnd = version.end;
      }
    }
    const gain = ctx.createGain();
    src.connect(gain).connect(this.musicBus!);
    src.start(at, offset);
    return { song, version, src, gain, t0: at, offset };
  }

  /** First music: fade in from the top of the song. */
  private begin(song: Song, version: Version): void {
    const now = this.ctx!.currentTime;
    const v = this.voice(song, version, now, bufferAt(version, 0));
    v.gain.gain.setValueAtTime(0, now);
    v.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE);
    this.current = v;
    this.settle(now + CROSSFADE);
  }

  /** Another skin's song: crossfade to the top of it. */
  private changeSong(song: Song, version: Version): void {
    const now = this.ctx!.currentTime;
    const old = this.current!;
    const v = this.voice(song, version, now, bufferAt(version, 0));
    v.gain.gain.setValueAtTime(0, now);
    v.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE);
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE);
    old.src.stop(now + CROSSFADE + 0.05);
    this.previous = old;
    this.current = v;
    this.settle(now + CROSSFADE + 0.05);
  }

  /**
   * Same song, new tempo: switch on the next bar line. The new version starts at the same point
   * of the song, and the two crossfade briefly around the bar line, where they are in step.
   */
  private changeTempo(version: Version): void {
    const ctx = this.ctx!;
    const cur = this.current!;
    const song = cur.song;
    const half = TEMPO_FADE / 2;
    const length = song.original.end - song.original.start;
    const span = cur.version.end - cur.version.start;
    const from = ctx.currentTime + SWITCH_LEAD;
    const playing = bufferTime(cur, from);
    // A bar line far enough ahead that the crossfade can start after `from`, even once the switch
    // point moves up to SHARED_REACH earlier to where both versions play the same note.
    let bar = nextBar(songAt(cur.version, playing), song.bar, length, (half + 0.01 + SHARED_REACH) * TEMPO_STEPS.at(-1)!);
    let point = sharedPoint(cur.version, version, bar);
    let wait = mod(bufferAt(cur.version, point) - playing, span);
    for (let i = 0; i < 4 && wait < half + 0.005; i++) {
      bar = nextBar(bar, song.bar, length, song.bar / 2);
      point = sharedPoint(cur.version, version, bar);
      wait = mod(bufferAt(cur.version, point) - playing, span);
    }
    const at = from + wait; // context time the switch point (at the bar line) plays
    const offset = version.start + mod(bufferAt(version, point) - half - version.start, version.end - version.start);
    const next = this.voice(song, version, at - half, offset);
    next.gain.gain.setValueAtTime(0, at - half);
    next.gain.gain.linearRampToValueAtTime(1, at + half);
    cur.gain.gain.cancelScheduledValues(at - half);
    cur.gain.gain.setValueAtTime(1, at - half);
    cur.gain.gain.linearRampToValueAtTime(0, at + half);
    cur.src.stop(at + half + 0.05);
    this.previous = cur;
    this.current = next;
    this.settle(at + half + 0.05);
  }

  /** A crossfade runs until context time `until`; sync() waits for it. */
  private settle(until: number): void {
    this.busyUntil = until;
    this.wake(until - this.ctx!.currentTime);
  }

  /** Play a sound effect. `semitones` shifts the pitch (the perfect chime climbs a scale). */
  play(sound: Sound, opts: { semitones?: number; gain?: number } = {}): void {
    if (!this.ctx || !this.sfxBus || !this.settings.sfx) return;
    const file = sound === "land" ? `land${this.landTurn++ % 3}` : sound;
    const ctx = this.ctx;
    const bus = this.sfxBus;
    void this.decode(`./sfx/${file}.mp4`, SFX).then((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      // A little pitch jitter so repeats don't sound mechanical.
      const jitter = sound === "chime" ? 0 : (Math.random() - 0.5) * 0.06;
      src.playbackRate.value = Math.pow(2, (opts.semitones ?? 0) / 12) * (1 + jitter);
      const g = ctx.createGain();
      g.gain.value = opts.gain ?? 1;
      src.connect(g).connect(bus);
      src.start();
    });
  }

  /** True while a run is being played (music steps back), false on the title and game over. */
  setFocus(playing: boolean): void {
    if (playing === this.playing) return;
    this.playing = playing;
    if (!this.ctx || !this.focusGain || !this.focusTone) return;
    const now = this.ctx.currentTime;
    const time = playing ? FOCUS_IN : FOCUS_OUT;
    for (const [param, value] of [
      [this.focusGain.gain, playing ? PLAY_MUSIC_GAIN : 1],
      [this.focusTone.frequency, playing ? PLAY_MUSIC_TONE : OPEN_TONE],
    ] as const) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      // Exponential ramps sound even for both gain and frequency.
      param.exponentialRampToValueAtTime(value, now + time);
    }
  }

  setMusicOn(on: boolean): void {
    this.settings.music = on;
    this.save();
    this.ramp(this.musicBus, on ? MUSIC_LEVEL : 0);
    // Muted music is not worth stretching; it comes back at the right tempo.
    this.sync();
  }

  setSfxOn(on: boolean): void {
    this.settings.sfx = on;
    this.save();
    this.ramp(this.sfxBus, on ? SFX_LEVEL : 0);
  }

  private ramp(node: GainNode | null, value: number): void {
    if (!node || !this.ctx) return;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(value, now + 0.2);
  }

  private save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage blocked: settings just won't persist.
    }
  }
}

export const audio = new GameAudio();

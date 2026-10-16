// Game audio: looping music per skin and short sound effects, on one Web Audio context.
//
// The audio files ship inside the page (Vite ?inline data URLs), so they work in the single-file
// web build and in the iOS app without fetching. Browsers only allow sound after a user gesture,
// so main.ts calls unlock() from the first tap. Music loops sample-accurately using the loop
// points in manifest.json, crossfades on skin changes, and pauses while the page is hidden.

import manifest from "./music/manifest.json";
import { loopPoints, type LoopInfo } from "./loop";

const MUSIC = import.meta.glob("./music/*.mp4", { query: "?inline", import: "default", eager: true }) as Record<string, string>;
const SFX = import.meta.glob("./sfx/*.mp4", { query: "?inline", import: "default", eager: true }) as Record<string, string>;
const LOOPS = manifest as Record<string, LoopInfo>;

export type Sound = "land" | "slice" | "miss" | "click" | "chime";

const SETTINGS_KEY = "sway-stack:audio";
const MUSIC_LEVEL = 0.55;
const SFX_LEVEL = 0.9;
const CROSSFADE = 0.8; // seconds
/**
 * While playing, the music steps back behind the game: a gentle treble roll-off (it sounds a
 * little further away) and a few dB down. The title and game-over screens get the full band.
 */
const PLAY_MUSIC_GAIN = 0.62; // about -4 dB
const PLAY_MUSIC_TONE = 3200; // Hz, low-pass corner while playing
const OPEN_TONE = 20000;
const FOCUS_IN = 1.2; // seconds to step back when play starts
const FOCUS_OUT = 0.8; // seconds to come forward at game over

/** Every song name that has rendered music. */
export const SONGS = Object.keys(MUSIC).map((p) => p.replace(/^.*\/|\.mp4$/g, ""));

function bytes(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
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

class GameAudio {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private focusGain: GainNode | null = null;
  private focusTone: BiquadFilterNode | null = null;
  private playing = false;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private current: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wanted = "";
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
      if (this.wanted) this.setMusic(this.wanted);
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

  /** Play this song (crossfading from the current one). Falls back to "classic" if it has no music yet. */
  setMusic(name: string): void {
    const song = MUSIC[`./music/${name}.mp4`] ? name : "classic";
    this.wanted = song;
    if (!this.ctx || !this.musicBus || this.current?.name === song) return;
    const ctx = this.ctx;
    const bus = this.musicBus;
    void this.decode(`./music/${song}.mp4`, MUSIC).then((buf) => {
      if (this.wanted !== song || this.current?.name === song) return;
      const info = LOOPS[song];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      src.connect(gain).connect(bus);
      let offset = 0;
      if (info) {
        const p = loopPoints(info, buf.length, ctx.sampleRate);
        src.loop = true;
        src.loopStart = p.start;
        src.loopEnd = p.end;
        offset = p.start;
      }
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + CROSSFADE);
      src.start(now, offset);
      const old = this.current;
      if (old) {
        old.gain.gain.cancelScheduledValues(now);
        old.gain.gain.setValueAtTime(old.gain.gain.value, now);
        old.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE);
        old.src.stop(now + CROSSFADE + 0.05);
      }
      this.current = { name: song, src, gain };
    });
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

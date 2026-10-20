// Build the game's sound effects into short AAC files.
//   npm run sfx              every effect
//   npm run sfx -- boom ...  just these
// The game-over blasts (boom, firework, shockwave, confetti, popcorn: one per BlastVariant in
// src/fx/topple.ts) are synthesized here with our own synth, so nothing crackles or hisses: every
// noise layer is band-limited and short, and the bright parts are tones (a glockenspiel's glitter,
// a pop's ping) rather than noise.
// Sources are CC0 (Kenney impact/interface packs and the VCSL glockenspiel; see
// ~/APP/samples/PROVENANCE.json) and our own synthesis (synth.ts). Writes
// src/audio/sfx/<name>.mp4 (mono). Work files go to preview/sfx (or $SFX_TMP).

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BLAST_AT, POPCORN_POPS as POPCORN_POPS_AT } from "../../src/fx/topple";
import { instrument } from "./instruments";
import { midi, renderNotes, SAMPLES } from "./sampler";
import { renderSynth, type MembranePatch, type VoicePatch } from "./synth";
import { readWav, writeWav, type Audio } from "./wav";

const OUT = "src/audio/sfx";
const TMP = process.env.SFX_TMP ?? "preview/sfx";
const RATE = 48000;
const KENNEY = join(SAMPLES, "kenney");

/** Decode a Kenney OGG (or any Core Audio format) to an Audio buffer at 48 kHz. */
function load(rel: string): Audio {
  const out = join(TMP, rel.replace(/[/ ]/g, "_") + ".wav");
  execFileSync("afconvert", ["-f", "WAVE", "-d", `LEI16@${RATE}`, join(KENNEY, rel), out]);
  return readWav(out);
}

function silence(seconds: number): Audio {
  const n = Math.round(seconds * RATE);
  return { rate: RATE, left: new Float32Array(n), right: new Float32Array(n) };
}

/** Mix `src` into `dst` at `time` seconds with `gain`. */
function mixIn(dst: Audio, src: Audio, time: number, gain: number): void {
  const o = Math.round(time * RATE);
  for (let i = 0; i < src.left.length && o + i < dst.left.length; i++) {
    dst.left[o + i]! += src.left[i]! * gain;
    dst.right[o + i]! += src.right[i]! * gain;
  }
}

/** `a` played `ratio` times faster (pitched up by that much; linear interpolation). */
function speed(a: Audio, ratio: number): Audio {
  const n = Math.floor(a.left.length / ratio);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const j = Math.floor(x);
    const f = x - j;
    left[i] = a.left[j]! * (1 - f) + (a.left[j + 1] ?? 0) * f;
    right[i] = a.right[j]! * (1 - f) + (a.right[j + 1] ?? 0) * f;
  }
  return { rate: a.rate, left, right };
}

/** Seeded 0..1 numbers (Park-Miller), so an effect renders the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Trim trailing silence, short fade-out, normalize the peak to -3 dBFS. */
function finish(a: Audio): Audio {
  let end = a.left.length;
  while (end > 0 && Math.abs(a.left[end - 1]!) < 1e-4 && Math.abs(a.right[end - 1]!) < 1e-4) end--;
  const left = a.left.slice(0, end);
  const right = a.right.slice(0, end);
  const fade = Math.min(end, Math.round(0.01 * RATE));
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    left[end - 1 - i]! *= g;
    right[end - 1 - i]! *= g;
  }
  let peak = 0;
  for (let i = 0; i < end; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  const g = peak > 0 ? 0.708 / peak : 1;
  return { rate: RATE, left: left.map((v) => v * g), right: right.map((v) => v * g) };
}

function save(name: string, a: Audio): void {
  const wav = join(TMP, `${name}.wav`);
  writeWav(wav, finish(a));
  execFileSync("afconvert", [wav, "-o", join(OUT, `${name}.mp4`), "-f", "mp4f", "-d", `aac@${RATE}`, "-c", "1", "-b", "64000"]);
  console.log(`${name}.mp4`);
}

/**
 * The boom's body: a deep thump whose pitch falls from about 225 Hz to 50 (a phone speaker plays
 * the fall; headphones get the bottom too).
 */
const BOOM_BODY: MembranePatch = {
  kind: "membrane",
  freq: 50,
  sweep: 4.5,
  sweepTime: 0.07,
  hold: 0.02,
  decay: 0.6,
  click: 0.6,
  drive: 2.5,
};
/** ...its roar: a blast of noise that darkens as it dies away... */
const BOOM_ROAR: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "noise" }],
  filter: { slope: 12, cutoff: 5000 },
  ramp: { cutoff: -4.2, curve: 0.5 },
  amp: { attack: 0.002, decay: 1.1, sustain: 0, release: 0.3 },
  highpass: 50,
  range: ["C4", "C4"],
  home: "C4",
};
/** ...and its crack: a short bright blast of noise over a knock at 120 Hz. */
const BOOM_CRACK: MembranePatch = {
  kind: "membrane",
  freq: 120,
  sweep: 2.5,
  sweepTime: 0.02,
  decay: 0.3,
  mode2: [1.6, 0.4],
  noise: 2,
  noiseDecay: 0.25,
  noiseBand: [700, 7000],
  click: 1,
  drive: 3,
};
/** The debris: wooden knocks (the bars are wooden toy blocks), scattered after the blast. */
const DEBRIS = [
  "impactWood_light_000",
  "impactWood_light_001",
  "impactWood_light_003",
  "impactWood_light_004",
  "impactPlank_medium_002",
  "impactPlank_medium_003",
  "impactWood_medium_003",
  "impactWood_medium_004",
];
const DEBRIS_KNOCKS = 15;
/** The boom's layers' levels. */
const BOOM_LEVELS = { body: 0.8, roar: 3, crack: 0.6, debris: 2.6 };

/** A firework's whump: a softer, rounder thump than the boom's, falling from about 150 Hz to 48. */
const WHUMP: MembranePatch = {
  kind: "membrane",
  freq: 48,
  sweep: 3.2,
  sweepTime: 0.06,
  hold: 0.015,
  decay: 0.5,
  click: 0.3,
  drive: 2,
};
/** ...and its breath: a dark puff of air, no top end at all. */
const WHUMP_AIR: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "noise" }],
  filter: { slope: 24, cutoff: 2200 },
  ramp: { cutoff: -3.5, curve: 0.5 },
  amp: { attack: 0.004, decay: 0.7, sustain: 0, release: 0.2 },
  highpass: 60,
  range: ["C4", "C4"],
  home: "C4",
};
/** The glitter that follows a bloom: glockenspiel notes up a pentatonic, sprinkled over the tail. */
const GLITTER_NOTES = ["C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7", "G7"];

/** The shockwave's whoomp: a very deep thump that falls from about 180 Hz to 36 over a tenth of a second... */
const WHOOMP: MembranePatch = {
  kind: "membrane",
  freq: 36,
  sweep: 5,
  sweepTime: 0.1,
  hold: 0.04,
  decay: 1,
  click: 0.2,
  drive: 2.2,
};
/** ...a sub-bass swell under it (headphones feel it; a phone speaker gets the thump)... */
const WHOOMP_SUB: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "sine" }],
  filter: { slope: 12, cutoff: 200 },
  amp: { attack: 0.03, decay: 0.9, sustain: 0, release: 0.3 },
  range: ["C1", "C2"],
  home: "C1",
};
/** ...a dark rumble that dies away... */
const WHOOMP_RUMBLE: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "noise" }],
  filter: { slope: 24, cutoff: 1400 },
  ramp: { cutoff: -3, curve: 0.5 },
  amp: { attack: 0.003, decay: 0.9, sustain: 0, release: 0.3 },
  highpass: 40,
  range: ["C4", "C4"],
  home: "C4",
};
/** ...and a dull knock at the front, so it has an edge without any crack. */
const WHOOMP_KNOCK: MembranePatch = {
  kind: "membrane",
  freq: 90,
  sweep: 2,
  sweepTime: 0.02,
  decay: 0.25,
  mode2: [1.5, 0.3],
  click: 0.5,
  drive: 2.5,
};

/** The confetti's pop: a cork's, bright and short, with a quick puff of air behind it... */
const POP: MembranePatch = {
  kind: "membrane",
  freq: 320,
  sweep: 2.6,
  sweepTime: 0.012,
  decay: 0.14,
  mode2: [1.8, 0.3],
  noise: 0.8,
  noiseDecay: 0.06,
  noiseBand: [1200, 5000],
  click: 1.2,
  drive: 2.5,
};
/** ...a ping on top, so it reads as a party popper and not a gun... */
const POP_PING: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "sine" }, { wave: "sine", semi: 12, level: 0.3 }],
  amp: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
  range: ["C7", "C8"],
  home: "C7",
};
/** ...and the paper flutter: soft little puffs (a sheet flapping), tuned and spaced so they never run into a hiss. */
const FLUTTER: MembranePatch & { keyed: true } = {
  kind: "membrane",
  freq: 500,
  sweep: 1.2,
  sweepTime: 0.005,
  decay: 0.05,
  noise: 1.2,
  noiseDecay: 0.035,
  noiseBand: [600, 2600],
  drive: 1,
  keyed: true,
};
const FLUTTER_PUFFS = 11;

/** Popcorn's little pops, each a touch higher and lighter than the boom's crack... */
const KERNEL: MembranePatch & { keyed: true } = {
  kind: "membrane",
  freq: 240,
  sweep: 2.5,
  sweepTime: 0.012,
  decay: 0.11,
  mode2: [1.7, 0.25],
  noise: 0.5,
  noiseDecay: 0.04,
  noiseBand: [900, 4500],
  click: 1,
  drive: 2.2,
  keyed: true,
};
/**
 * ...at these times (seconds into the sound, which main.ts starts at the first pop: see blastCueAt
 * in src/fx/topple.ts), then the big one at POPCORN_BOOM_AT: the game's own pop and blast ages, so
 * the sound can't drift from the picture (0, 0.08, 0.16 and 0.24 at the shipped timings).
 */
const sinceFirstPop = (at: number) => Math.round((at - POPCORN_POPS_AT[0]!) * 1000) / 1000;
const POPCORN_POPS = POPCORN_POPS_AT.map(sinceFirstPop);
const POPCORN_BOOM_AT = sinceFirstPop(BLAST_AT);

const EFFECTS: Record<string, () => void> = {
  // Landing: three wooden knocks, picked in turn at runtime.
  land() {
    for (let i = 0; i < 3; i++) save(`land${i}`, load(`kenney_impact-sounds/Audio/impactWood_medium_00${i}.ogg`));
  },
  // Slice: a plank chop with a lighter knock on top.
  slice() {
    const a = silence(0.6);
    mixIn(a, load("kenney_impact-sounds/Audio/impactPlank_medium_001.ogg"), 0, 1);
    mixIn(a, load("kenney_impact-sounds/Audio/impactWood_light_002.ogg"), 0.015, 0.5);
    save("slice", a);
  },
  // Miss: a soft thud as the bar falls away.
  miss() {
    save("miss", load("kenney_impact-sounds/Audio/impactSoft_heavy_001.ogg"));
  },
  // UI click
  click() {
    save("click", load("kenney_ui-audio/Audio/click3.ogg"));
  },
  // Perfect: one glockenspiel strike (C6); the game raises its pitch along a streak.
  chime() {
    const a = silence(1.8);
    renderNotes(instrument("glockenspiel"), [{ time: 0, dur: 1.5, note: midi("C6"), vel: 0.85 }], a.left, a.right, RATE, 1, 0);
    save("chime", a);
  },
  // Game over, the starburst: the toppling tower blows up. A boom (synthesized: a falling thump,
  // a crack, a dark rumble), then the debris rattling down, a little quieter and further apart
  // as it goes.
  boom() {
    const a = silence(1.6);
    boomInto(a, 0, 1, DEBRIS_KNOCKS, 20261016);
    save("boom", a);
  },
  // Game over, the fireworks: a whump (rounder and softer than the boom: a shell bursting in the
  // air), then a soft tail of glockenspiel glitter sprinkling down; the second, smaller bloom
  // whumps in the middle of it.
  firework() {
    const a = silence(1.7);
    const rnd = seeded(20261019);
    const whump = (time: number, level: number) => {
      const hit = [{ time, dur: 0.8, note: 60, vel: 1 }];
      renderSynth(WHUMP, hit, a.left, a.right, RATE, 0.75 * level, 0);
      renderSynth(WHUMP_AIR, hit, a.left, a.right, RATE, 2 * level, 0);
    };
    const glitter = (from: number, span: number, count: number, level: number) => {
      const notes = [];
      for (let i = 0; i < count; i++) {
        const k = i / count;
        notes.push({ time: from + span * k + 0.02 * rnd(), dur: 0.5, note: midi(GLITTER_NOTES[Math.floor(rnd() * GLITTER_NOTES.length)]!), vel: level * (0.7 - 0.35 * k) });
      }
      renderNotes(instrument("glockenspiel"), notes, a.left, a.right, RATE, 2.6, 0);
    };
    whump(0, 1);
    glitter(0.1, 0.6, 12, 1);
    whump(0.3, 0.55);
    glitter(0.42, 0.5, 7, 0.7);
    save("firework", a);
  },
  // Game over, the shockwave: one deep whoomp (a sub-bass swell under a slow, falling thump and a
  // dark rumble), with a dull knock at its front and nothing bright anywhere.
  shockwave() {
    const a = silence(1.7);
    const hit = [{ time: 0, dur: 1, note: 60, vel: 1 }];
    renderSynth(WHOOMP, hit, a.left, a.right, RATE, 0.9, 0);
    renderSynth(WHOOMP_SUB, [{ time: 0, dur: 0.5, note: midi("C1"), vel: 1 }], a.left, a.right, RATE, 0.5, 0);
    renderSynth(WHOOMP_RUMBLE, hit, a.left, a.right, RATE, 2.4, 0);
    renderSynth(WHOOMP_KNOCK, hit, a.left, a.right, RATE, 0.5, 0);
    save("shockwave", a);
  },
  // Game over, the confetti: a bright pop (a party popper: a cork's pop with a ping on top), then
  // the paper fluttering down: soft little puffs, each a different pitch, slowing and fading.
  confetti() {
    const a = silence(1.3);
    const hit = [{ time: 0, dur: 0.3, note: 60, vel: 1 }];
    renderSynth(POP, hit, a.left, a.right, RATE, 0.9, 0);
    renderSynth(POP_PING, [{ time: 0, dur: 0.06, note: midi("E7"), vel: 1 }], a.left, a.right, RATE, 0.25, 0);
    const rnd = seeded(20261020);
    const puffs = [];
    let time = 0.07;
    for (let i = 0; i < FLUTTER_PUFFS; i++) {
      const k = i / FLUTTER_PUFFS;
      puffs.push({ time, dur: 0.05, note: 60 + Math.round(rnd() * 8 - 4), vel: 1 - 0.65 * k });
      time += 0.045 + 0.045 * k + 0.02 * rnd();
    }
    renderSynth(FLUTTER, puffs, a.left, a.right, RATE, 0.7, 0);
    save("confetti", a);
  },
  // Game over, the popcorn: pop, pop, pop (each a little higher, with a light wooden knock as its
  // chunk flies), then the BOOM with a shorter rattle of debris after it.
  popcorn() {
    const a = silence(1.8);
    const knock = load("kenney_impact-sounds/Audio/impactWood_light_002.ogg");
    POPCORN_POPS.forEach((time, i) => {
      renderSynth(KERNEL, [{ time, dur: 0.2, note: 60 + i * 3, vel: 0.9 }], a.left, a.right, RATE, 0.7, 0);
      mixIn(a, speed(knock, 1.3 + 0.12 * i), time + 0.01, 0.6);
    });
    boomInto(a, POPCORN_BOOM_AT, 0.95, 9, 20261021);
    save("popcorn", a);
  },
};

/**
 * The starburst's boom into `a` at `time`: its three layers at `level`, then `knocks` pieces of
 * debris rattling down after it, a little quieter and further apart as they go.
 */
function boomInto(a: Audio, time: number, level: number, knocks: number, seed: number): void {
  const hit = [{ time, dur: 0.9, note: 60, vel: 1 }];
  renderSynth(BOOM_BODY, hit, a.left, a.right, RATE, BOOM_LEVELS.body * level, 0);
  renderSynth(BOOM_ROAR, hit, a.left, a.right, RATE, BOOM_LEVELS.roar * level, 0);
  renderSynth(BOOM_CRACK, hit, a.left, a.right, RATE, BOOM_LEVELS.crack * level, 0);
  const pieces = DEBRIS.map((name) => load(`kenney_impact-sounds/Audio/${name}.ogg`));
  const rnd = seeded(seed);
  for (let i = 0; i < knocks; i++) {
    const k = i / knocks;
    const at = time + 0.08 + 0.8 * k ** 1.4 + 0.03 * rnd();
    const knock = pieces[Math.floor(rnd() * pieces.length)]!;
    // Smaller pieces knock higher; anywhere from three semitones down to five up.
    mixIn(a, speed(knock, 2 ** ((rnd() * 8 - 3) / 12)), at, BOOM_LEVELS.debris * level * (1 - 0.6 * k) * (0.7 + 0.3 * rnd()));
  }
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const wanted = process.argv.slice(2);
for (const name of wanted) if (!EFFECTS[name]) throw new Error(`no effect "${name}": ${Object.keys(EFFECTS).join(", ")}`);
for (const [name, make] of Object.entries(EFFECTS)) if (wanted.length === 0 || wanted.includes(name)) make();

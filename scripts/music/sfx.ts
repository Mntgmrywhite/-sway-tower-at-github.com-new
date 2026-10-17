// Build the game's sound effects into short AAC files.
//   npm run sfx              every effect
//   npm run sfx -- boom ...  just these
// Sources are CC0 (Kenney impact/interface packs and the VCSL glockenspiel; see
// ~/APP/samples/PROVENANCE.json) and our own synthesis (synth.ts). Writes
// src/audio/sfx/<name>.mp4 (mono). Work files go to preview/sfx (or $SFX_TMP).

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
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
  // Game over: the toppling tower blows up. A boom (synthesized: a falling thump, a crack, a dark
  // rumble), then the debris rattling down, a little quieter and further apart as it goes.
  boom() {
    const a = silence(1.6);
    const hit = [{ time: 0, dur: 0.9, note: 60, vel: 1 }];
    renderSynth(BOOM_BODY, hit, a.left, a.right, RATE, BOOM_LEVELS.body, 0);
    renderSynth(BOOM_ROAR, hit, a.left, a.right, RATE, BOOM_LEVELS.roar, 0);
    renderSynth(BOOM_CRACK, hit, a.left, a.right, RATE, BOOM_LEVELS.crack, 0);
    const knocks = DEBRIS.map((name) => load(`kenney_impact-sounds/Audio/${name}.ogg`));
    const rnd = seeded(20261016);
    for (let i = 0; i < DEBRIS_KNOCKS; i++) {
      const k = i / DEBRIS_KNOCKS;
      const time = 0.08 + 0.8 * k ** 1.4 + 0.03 * rnd();
      const knock = knocks[Math.floor(rnd() * knocks.length)]!;
      // Smaller pieces knock higher; anywhere from three semitones down to five up.
      mixIn(a, speed(knock, 2 ** ((rnd() * 8 - 3) / 12)), time, BOOM_LEVELS.debris * (1 - 0.6 * k) * (0.7 + 0.3 * rnd()));
    }
    save("boom", a);
  },
};

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const wanted = process.argv.slice(2);
for (const name of wanted) if (!EFFECTS[name]) throw new Error(`no effect "${name}": ${Object.keys(EFFECTS).join(", ")}`);
for (const [name, make] of Object.entries(EFFECTS)) if (wanted.length === 0 || wanted.includes(name)) make();

// Build the game's sound effects into short AAC files.
//   npm run sfx
// Sources are CC0 (Kenney impact/interface packs and the VCSL glockenspiel; see
// ~/APP/samples/PROVENANCE.json). Writes src/audio/sfx/<name>.mp4 (mono).

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { instrument } from "./instruments";
import { midi, renderNotes, SAMPLES } from "./sampler";
import { readWav, writeWav, type Audio } from "./wav";

const OUT = "src/audio/sfx";
const TMP = "preview/sfx";
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

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// Landing: three wooden knocks, picked in turn at runtime.
for (let i = 0; i < 3; i++) save(`land${i}`, load(`kenney_impact-sounds/Audio/impactWood_medium_00${i}.ogg`));
// Slice: a plank chop with a lighter knock on top.
{
  const a = silence(0.6);
  mixIn(a, load("kenney_impact-sounds/Audio/impactPlank_medium_001.ogg"), 0, 1);
  mixIn(a, load("kenney_impact-sounds/Audio/impactWood_light_002.ogg"), 0.015, 0.5);
  save("slice", a);
}
// Miss: a soft thud as the bar falls away.
save("miss", load("kenney_impact-sounds/Audio/impactSoft_heavy_001.ogg"));
// UI click
save("click", load("kenney_ui-audio/Audio/click3.ogg"));
// Perfect: one glockenspiel strike (C6); the game raises its pitch along a streak.
{
  const a = silence(1.8);
  renderNotes(instrument("glockenspiel"), [{ time: 0, dur: 1.5, note: midi("C6"), vel: 0.85 }], a.left, a.right, RATE, 1, 0);
  save("chime", a);
}

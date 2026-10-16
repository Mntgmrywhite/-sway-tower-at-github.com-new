// Arrangement report, for checking a mix without listening.
//   npx tsx scripts/music/mix.ts <song> [<song> ...]
//
// One row per part: tracks with the same `label` (euphonium() pairs, for instance), or else the
// same instrument and pan (a part split into tracks for levels), are summed. For each part: its
// note range against the instrument's recorded range, the worst stretch (how far a note sits
// from the recording the sampler actually plays for it, in its own velocity layer: past about
// 3 semitones it sounds fake), and how loud it sits in the mix: overall and per 4-bar phrase,
// in dB relative to the whole (dry) mix in that phrase. A part meant to be heard should sit
// within about 10 dB of the mix where it plays; a lead within about 6 dB. Synth parts show the
// register their patch is voiced for (its `range`) as "recorded", and their worst note is how
// far it lies outside that register. Dry here means without reverb and delay; a part is
// rendered as it plays in the song (pumped by its kick).

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { instrument } from "./instruments";
import { midi } from "./sampler";
import { renderLoop, type Song, type Track } from "./song";
import { isSynth, SYNTHS } from "./synth";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** Note name; song-local tuning makes notes fractional, so round first. */
function noteName(m: number): string {
  const r = Math.round(m);
  return `${NAMES[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`;
}
/** Semitones past the recorded range that still sound natural. */
const STRETCH_OK = 3;
const PHRASE_BARS = 4;

function dry(song: Song): Song {
  return { ...song, tracks: song.tracks.map((t) => ({ ...t, reverb: 0, delay: 0 })), reverb: { ...song.reverb, level: 0 } };
}

/** Mean power per phrase, both channels. */
function phrasePower(audio: { left: Float32Array; right: Float32Array }, phrases: number): number[] {
  const n = audio.left.length;
  const per = n / phrases;
  const out: number[] = [];
  for (let p = 0; p < phrases; p++) {
    let sum = 0;
    const a = Math.round(p * per);
    const b = Math.round((p + 1) * per);
    for (let i = a; i < b; i++) sum += audio.left[i]! ** 2 + audio.right[i]! ** 2;
    out.push(sum / (2 * Math.max(1, b - a)));
  }
  return out;
}

const db = (x: number) => (x > 0 ? 10 * Math.log10(x) : -Infinity);
const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(0).padStart(4) : "   ·");

async function report(name: string): Promise<boolean> {
  const mod = (await import(pathToFileURL(join(process.cwd(), "scripts/music/songs", `${name}.ts`)).href)) as { default: Song };
  const song = mod.default;
  const phrases = Math.max(1, Math.round(song.bars / PHRASE_BARS));
  const drySong = dry(song);
  const mix = phrasePower(renderLoop(drySong), phrases);
  const mixAll = mix.reduce((a, b) => a + b, 0) / phrases;
  let ok = true;

  const parts = new Map<string, Track[]>();
  const indices = new Map<string, number[]>();
  song.tracks.forEach((t, i) => {
    const key = t.label ?? `${t.inst}${t.pan ? ` (pan ${t.pan})` : ""}`;
    parts.set(key, [...(parts.get(key) ?? []), t]);
    indices.set(key, [...(indices.get(key) ?? []), i]);
  });

  console.log(`\n${name}: ${song.bars} bars at ${song.bpm} bpm, ${song.tracks.length} tracks in ${parts.size} parts; dB vs mix per ${PHRASE_BARS}-bar phrase`);
  console.log(`${"part".padEnd(28)} ${"range".padEnd(9)} ${"recorded".padEnd(9)} ${"worst".padStart(5)} ${"all".padStart(4)} | ${Array.from({ length: phrases }, (_, i) => String(i + 1).padStart(4)).join("")}`);
  for (const [key, tracks] of parts) {
    let nlo = Infinity;
    let nhi = -Infinity;
    let lo = Infinity;
    let hi = -Infinity;
    let worst = 0;
    let drum = true;
    for (const t of tracks) {
      if (isSynth(t.inst)) {
        const patch = t.patch ?? SYNTHS[t.inst];
        if (patch.kind !== "voice") continue;
        drum = false;
        const [a, b] = patch.range.map(midi) as [number, number];
        lo = Math.min(lo, a);
        hi = Math.max(hi, b);
        for (const n of t.notes) {
          const m = typeof n.n === "number" ? n.n : midi(n.n);
          nlo = Math.min(nlo, m);
          nhi = Math.max(nhi, m);
          const outside = m < a ? m - a : m > b ? m - b : 0;
          if (Math.abs(outside) > Math.abs(worst)) worst = outside;
        }
        continue;
      }
      const inst = instrument(t.inst);
      if (inst.opts.fixedNote !== undefined) continue;
      drum = false;
      for (const z of inst.zones) {
        lo = Math.min(lo, z.note);
        hi = Math.max(hi, z.note);
      }
      for (const n of t.notes) {
        const m = typeof n.n === "number" ? n.n : midi(n.n);
        nlo = Math.min(nlo, m);
        nhi = Math.max(nhi, m);
        const shift = m - inst.zoneFor(m, n.v ?? 0.7).note;
        if (Math.abs(shift) > Math.abs(worst)) worst = shift;
      }
    }
    const stretched = Math.abs(worst) > STRETCH_OK + 0.5;
    if (stretched) ok = false;
    const solo = phrasePower(renderLoop(drySong, new Set(indices.get(key))), phrases);
    const rel = solo.map((p, k) => db(p) - db(mix[k]!));
    const all = db(solo.reduce((a, b) => a + b, 0) / phrases) - db(mixAll);
    const label = `${key}${tracks.length > 1 ? ` ×${tracks.length}` : ""}`.slice(0, 28).padEnd(28);
    const range = drum ? "drum" : `${noteName(nlo)}-${noteName(nhi)}`;
    const rec = drum ? "" : `${noteName(lo)}-${noteName(hi)}`;
    const w = drum ? "" : `${worst > 0 ? "+" : ""}${worst.toFixed(0)}`;
    console.log(`${label} ${range.padEnd(9)} ${rec.padEnd(9)} ${w.padStart(5)} ${fmt(all)} | ${rel.map((r) => (r < -60 ? "   ·" : fmt(r))).join("")}${stretched ? "  STRETCHED" : ""}`);
  }
  return ok;
}

async function main(): Promise<void> {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error("usage: npx tsx scripts/music/mix.ts <song> [<song> ...]");
    process.exit(1);
  }
  let ok = true;
  for (const name of names) ok = (await report(name)) && ok;
  if (!ok) process.exitCode = 1;
}

void main();

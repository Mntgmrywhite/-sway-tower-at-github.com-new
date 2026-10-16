// Arrangement report, for checking a mix without listening.
//   npx tsx scripts/music/mix.ts <song> [<song> ...]
//
// For each track: its note range against the instrument's recorded range (notes far past the
// outermost recording are stretched and sound fake), and how loud it sits in the mix: overall
// and per 4-bar phrase, in dB relative to the whole (dry) mix in that phrase. A part meant to
// be heard should sit within about 10 dB of the mix where it plays; a lead within about 6 dB.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { instrument } from "./instruments";
import { midi } from "./sampler";
import { renderLoop, type Song, type Track } from "./song";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
/** Semitones past the recorded range that still sound natural. */
const STRETCH_OK = 3;
const PHRASE_BARS = 4;

function dry(song: Song, tracks: Track[]): Song {
  return { ...song, tracks: tracks.map((t) => ({ ...t, reverb: 0 })), reverb: { ...song.reverb, level: 0 } };
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
  const mix = phrasePower(renderLoop(dry(song, song.tracks)), phrases);
  const mixAll = mix.reduce((a, b) => a + b, 0) / phrases;
  let ok = true;

  console.log(`\n${name}: ${song.bars} bars at ${song.bpm} bpm, ${song.tracks.length} tracks; dB vs mix per ${PHRASE_BARS}-bar phrase`);
  console.log(`${"track".padEnd(22)} ${"range".padEnd(9)} ${"recorded".padEnd(9)} ${"all".padStart(4)} | ${Array.from({ length: phrases }, (_, i) => String(i + 1).padStart(4)).join("")}`);
  song.tracks.forEach((t, i) => {
    const inst = instrument(t.inst);
    const zones = inst.zones.map((z) => z.note);
    const lo = Math.min(...zones);
    const hi = Math.max(...zones);
    const midiNotes = t.notes.map((n) => (typeof n.n === "number" ? n.n : midi(n.n)));
    const nlo = Math.min(...midiNotes);
    const nhi = Math.max(...midiNotes);
    const fixed = "fixedNote" in inst.opts && inst.opts.fixedNote !== undefined;
    const below = fixed ? 0 : Math.max(0, lo - nlo);
    const above = fixed ? 0 : Math.max(0, nhi - hi);
    const stretched = below > STRETCH_OK || above > STRETCH_OK;
    if (stretched) ok = false;
    const solo = phrasePower(renderLoop(dry(song, [t])), phrases);
    const rel = solo.map((p, k) => db(p) - db(mix[k]!));
    const all = db(solo.reduce((a, b) => a + b, 0) / phrases) - db(mixAll);
    const label = `${i + 1}. ${t.inst}`.padEnd(22);
    const range = fixed ? "drum" : `${noteName(nlo)}-${noteName(nhi)}`;
    const rec = fixed ? "" : `${noteName(lo)}-${noteName(hi)}`;
    console.log(`${label} ${range.padEnd(9)} ${rec.padEnd(9)} ${fmt(all)} | ${rel.map((r) => (r < -60 ? "   ·" : fmt(r))).join("")}${stretched ? `  STRETCHED ${below ? `-${below}` : ""}${above ? ` +${above}` : ""} st` : ""}`);
  });
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

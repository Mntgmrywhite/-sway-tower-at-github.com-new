// Tuning report: every pitched note of a song, rendered alone as the song plays it (its take,
// its length, its release), and measured as heard (pitch.ts centsHeard: the median of its
// partials, like the sampler's autotune, on both channels).
//   npx tsx scripts/music/tuning.ts <song> [<song> ...] [--round] [--all]
//
// One row per part (as in mix.ts), with its worst note; then every note heard more than 5 cents
// off, grouped by take and length. Featured instruments (piano, saxes, horn, low brass) fail the
// run past 5 cents. Notes whose partials scatter too much to read a pitch (a messy attack, a
// bent pluck) are listed as "scattered" with their partials' median, and don't count. --round
// plays every note at its whole pitch (what a song's own cents corrections would be without
// them); --all lists every take and length, not only those off.
//
// Synth parts are heard the same way: each note rendered alone through its patch (its length,
// its velocity to the nearest 0.1, which opens the filter), read on its harmonics, or on its
// fundamental for a patch with inharmonic partials (a bell). Drums, noise and pitch sweeps
// (risers) have no pitch to hold and are skipped. Synths are never featured: an off note is listed, not failed.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { instrument, type InstrumentName } from "./instruments";
import { heldFor, measureHeard, renderNote, type Instrument, type PitchKind } from "./sampler";
import { RATE, trackEvents, type Song, type Track } from "./song";
import { isSynth, renderSynth, SYNTHS, type Patch, type SynthName, type VoicePatch } from "./synth";

const LIMIT = 5;
const FEATURED = new Set<string>(["piano", "sax", "saxShort", "sopranoSax", "sopranoSaxShort", "horn", "hornShort", "trombone", "tromboneShort", "tuba", "tubaShort"]);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;
/** Measuring needs the first ~0.8 s of a note; anything held longer is capped (and renders faster). */
const CAP = 1.2;

interface Heard {
  part: string;
  inst: InstrumentName | SynthName;
  note: number;
  held: number;
  take: string;
  cents: number;
  /** The partials agree enough to read a pitch. */
  usable: boolean;
}

/** A synth track's pitched patch, or null for drums, noise and pitch sweeps (a filter sweep keeps its pitch). */
function pitchedPatch(track: Track & { inst: SynthName }): VoicePatch | null {
  const p: Patch = track.patch ?? SYNTHS[track.inst];
  if (p.kind !== "voice" || p.ramp?.pitch || p.osc.every((o) => o.wave === "noise")) return null;
  return p;
}

/** Bells' partials are inharmonic: read their fundamental. Everything else on its harmonics. */
const synthKind = (p: VoicePatch): PitchKind => (p.osc.some((o) => Math.abs((o.semi ?? 0) - Math.round(o.semi ?? 0)) > 0.05) ? "fundamental" : "harmonic");

async function report(name: string, round: boolean, all: boolean): Promise<boolean> {
  const mod = (await import(pathToFileURL(join(process.cwd(), "scripts/music/songs", `${name}.ts`)).href)) as { default: Song };
  const song = mod.default;
  for (const t of song.tracks) if (!isSynth(t.inst)) instrument(t.inst).resetRoundRobin();
  const cache = new Map<string, { cents: number; usable: boolean }>();
  const heard: Heard[] = [];
  song.tracks.forEach((track, ti) => {
    const part = track.label ?? `${track.inst}${track.pan ? ` (pan ${track.pan})` : ""}`;
    if (isSynth(track.inst)) {
      const patch = pitchedPatch({ ...track, inst: track.inst });
      if (!patch) return;
      for (const ev of trackEvents(song, ti)) {
        const note = round ? Math.round(ev.note) : ev.note;
        const vel = Math.round(ev.vel * 10) / 10;
        const held = Math.min(ev.dur, ev.ring ?? Infinity, CAP);
        const key = `${track.inst}|${ti}|${note.toFixed(3)}|${vel}|${held.toFixed(3)}`;
        let read = cache.get(key);
        if (read === undefined) {
          const L = new Float32Array(RATE * 3);
          const R = new Float32Array(RATE * 3);
          renderSynth(patch, [{ time: 0, dur: held, note, vel }], L, R, RATE, 1, 0);
          read = measureHeard(L.map((v, i) => (v + R[i]!) / 2), RATE, Math.round(note), synthKind(patch));
          cache.set(key, read);
        }
        heard.push({ part, inst: track.inst, note: Math.round(note), held, take: `synth v${vel.toFixed(1)}`, ...read });
      }
      return;
    }
    const inst: Instrument = instrument(track.inst);
    if (inst.opts.fixedNote !== undefined) return;
    for (const ev of trackEvents(song, ti)) {
      if (round) ev.note = Math.round(ev.note);
      // Pick the take exactly as the render would (round robins advance in song order).
      const held = heldFor(inst, ev);
      const { zone, ratio } = inst.pick(ev.note, ev.vel, held);
      const key = `${track.inst}|${inst.zones.indexOf(zone)}|${ratio.toFixed(6)}|${Math.min(held, CAP).toFixed(3)}`;
      let read = cache.get(key);
      if (read === undefined) {
        const L = new Float32Array(RATE * 3);
        const R = new Float32Array(RATE * 3);
        renderNote(inst, { zone, ratio }, { ...ev, time: 0, dur: Math.min(ev.dur, CAP), ring: Math.min(held, CAP) }, L, R, RATE, 1, 0);
        read = measureHeard(L.map((v, i) => (v + R[i]!) / 2), RATE, Math.round(ev.note), inst.kind);
        cache.set(key, read);
      }
      heard.push({ part, inst: track.inst, note: Math.round(ev.note), held, take: `${zone.file} L${zone.layer}`, ...read });
    }
  });
  // Measuring played the notes through the sampler: start its round robins over.
  for (const t of song.tracks) if (!isSynth(t.inst)) instrument(t.inst).resetRoundRobin();

  let ok = true;
  console.log(`\n${name}${round ? " (whole pitches)" : ""}: cents heard, per part`);
  const parts = [...new Set(heard.map((h) => h.part))];
  for (const part of parts) {
    const notes = heard.filter((h) => h.part === part && h.usable);
    const scattered = heard.filter((h) => h.part === part && !h.usable);
    const worst = notes.reduce((w, h) => (Math.abs(h.cents) > Math.abs(w) ? h.cents : w), 0);
    const off = notes.filter((h) => Math.abs(h.cents) > LIMIT);
    const featured = FEATURED.has(notes[0]?.inst ?? heard.find((h) => h.part === part)!.inst);
    if (featured && off.length) ok = false;
    const flag = off.length ? (featured ? "  FAIL" : "  off") : "";
    console.log(`  ${part.slice(0, 32).padEnd(32)} ${String(notes.length).padStart(4)} notes  worst ${(worst >= 0 ? "+" : "") + worst.toFixed(1)}${scattered.length ? `  (${scattered.length} scattered)` : ""}${flag}`);
    const groups = new Map<string, Heard[]>();
    for (const h of [...(all ? notes : off), ...scattered]) {
      const k = `${noteName(h.note)} ${Number.isFinite(h.held) ? `${h.held.toFixed(2)}s` : "ring"} ${h.take}${h.usable ? "" : " scattered"}`;
      groups.set(k, [...(groups.get(k) ?? []), h]);
    }
    for (const [k, hs] of [...groups].sort((a, b) => a[1][0]!.note - b[1][0]!.note)) {
      const c = hs.map((h) => h.cents);
      const lo = Math.min(...c);
      const hi = Math.max(...c);
      const range = !Number.isFinite(lo) ? "no reading" : lo.toFixed(1) === hi.toFixed(1) ? `${lo >= 0 ? "+" : ""}${lo.toFixed(1)}` : `${lo.toFixed(1)}..${hi.toFixed(1)}`;
      console.log(`      ${k.padEnd(66)} ×${String(hs.length).padEnd(3)} ${range}`);
    }
  }
  return ok;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const names = args.filter((a) => !a.startsWith("--"));
  if (!names.length) {
    console.error("usage: npx tsx scripts/music/tuning.ts <song> [<song> ...] [--round] [--all]");
    process.exit(1);
  }
  let ok = true;
  for (const name of names) ok = (await report(name, args.includes("--round"), args.includes("--all"))) && ok;
  if (!ok) process.exitCode = 1;
}

void main();

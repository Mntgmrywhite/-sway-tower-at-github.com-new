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

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { instrument, type InstrumentName } from "./instruments";
import { heldFor, measureHeard, renderNote, type Instrument } from "./sampler";
import { RATE, trackEvents, type Song } from "./song";

const LIMIT = 5;
const FEATURED = new Set<InstrumentName>(["piano", "sax", "saxShort", "sopranoSax", "sopranoSaxShort", "horn", "hornShort", "trombone", "tromboneShort", "tuba", "tubaShort"]);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;
/** Measuring needs the first ~0.8 s of a note; anything held longer is capped (and renders faster). */
const CAP = 1.2;

interface Heard {
  part: string;
  inst: InstrumentName;
  note: number;
  held: number;
  take: string;
  cents: number;
  /** The partials agree enough to read a pitch. */
  usable: boolean;
}

async function report(name: string, round: boolean, all: boolean): Promise<boolean> {
  const mod = (await import(pathToFileURL(join(process.cwd(), "scripts/music/songs", `${name}.ts`)).href)) as { default: Song };
  const song = mod.default;
  for (const t of song.tracks) instrument(t.inst).resetRoundRobin();
  const cache = new Map<string, { cents: number; usable: boolean }>();
  const heard: Heard[] = [];
  song.tracks.forEach((track, ti) => {
    const inst: Instrument = instrument(track.inst);
    if (inst.opts.fixedNote !== undefined) return;
    const part = track.label ?? `${track.inst}${track.pan ? ` (pan ${track.pan})` : ""}`;
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
  for (const t of song.tracks) instrument(t.inst).resetRoundRobin();

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

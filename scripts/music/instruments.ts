// Every instrument the arrangements can use, mapped to CC0 recordings in ~/APP/samples
// (see ~/APP/samples/PROVENANCE.json). Loaded lazily and cached per render.

import { Instrument, type InstrumentOptions } from "./sampler";

/**
 * Most Versilian (VCSL / VSCO 2 CE) sets name notes with middle C = C3, so they sound one
 * octave above our labels (MIDI C4 = 60). Measured per instrument by pitch.test.ts; the
 * FreePats sets, the VSCO harp and the sustained solo violin already match.
 */
const OCT = 12;

const VCSL = "VCSL";
const VSCO = "VSCO-2-CE";
const FP = "freepats";

export const INSTRUMENTS = {
  // Keys
  piano: { dir: `${FP}/UprightPianoKW-SFZ-20220221/samples`, release: 0.35, gain: 0.9 },
  honkyTonk: { dir: `${FP}/PianoFB SFZ+WAV-20200401/samples`, release: 0.3, gain: 0.9 },
  harpsichord: { dir: `${VCSL}/Chordophones/Zithers/Harpsichord, Italian/Sustains/stop1`, release: 0.15, oneShot: true, transpose: OCT },

  // Plucked
  guitar: { dir: `${FP}/SpanishClassicalGuitar-SFZ+FLAC-20190618/samples`, release: 0.2, oneShot: true },
  ukulele: { dir: `${FP}/Ukulele SFZ+WAV-20260811/samples`, release: 0.15, oneShot: true },
  strumstick: { dir: `${VCSL}/Chordophones/Composite Chordophones/Strumstick/Finger`, match: /_Main_/, oneShot: true, transpose: OCT },
  harp: { dir: `${VSCO}/Strings/Harp`, oneShot: true },

  // Strings
  violinsPizz: { dir: `${VSCO}/Strings/Violin Section/Pizz`, oneShot: true, transpose: OCT },
  violasPizz: { dir: `${VSCO}/Strings/Viola Section/pizz`, oneShot: true, transpose: OCT },
  cellosPizz: { dir: `${VSCO}/Strings/Cello Section/pizzT`, oneShot: true, transpose: OCT },
  bassPizz: { dir: `${VSCO}/Strings/Solo Contrabass/Pizz`, oneShot: true, gain: 1.1, transpose: OCT },
  violins: { dir: `${VSCO}/Strings/Violin Section/susVib`, attack: 0.08, release: 0.4, gain: 0.8, transpose: OCT },
  cellos: { dir: `${VSCO}/Strings/Cello Section/susvib`, attack: 0.08, release: 0.4, gain: 0.8, transpose: OCT },
  fiddle: { dir: `${VSCO}/Strings/Solo Violin/Arco Vib`, attack: 0.03, release: 0.2 },
  fiddleShort: { dir: `${VSCO}/Strings/Solo Violin/spic`, oneShot: true, transpose: OCT },

  // Winds and brass
  flute: { dir: `${VSCO}/Woodwinds/Flute/susvib`, attack: 0.04, release: 0.2, gain: 0.8, transpose: OCT },
  fluteShort: { dir: `${VSCO}/Woodwinds/Flute/stac`, oneShot: true, transpose: OCT },
  clarinet: { dir: `${VSCO}/Woodwinds/Clarinet/susLong`, attack: 0.03, release: 0.2, gain: 0.8, transpose: OCT },
  clarinetShort: { dir: `${VSCO}/Woodwinds/Clarinet/stac`, oneShot: true, transpose: OCT },
  bassoonShort: { dir: `${VSCO}/Woodwinds/Bassoon/stac`, oneShot: true, transpose: OCT },
  horn: { dir: `${VSCO}/Brass/F Horn/sus`, attack: 0.05, release: 0.3, gain: 0.7, transpose: OCT },
  trumpetMute: { dir: `${VSCO}/Brass/Trumpet/harmonM-sus`, attack: 0.02, release: 0.15, gain: 0.8, transpose: OCT },
  trumpetShort: { dir: `${VSCO}/Brass/Trumpet/stac`, oneShot: true, gain: 0.8, transpose: OCT },
  tromboneShort: { dir: `${VSCO}/Brass/Tenor Trombone/stac`, oneShot: true, gain: 0.85, transpose: OCT },
  harmonica: { dir: `${VCSL}/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C/Sustains/Normal`, attack: 0.02, release: 0.15, transpose: OCT },

  // Mallets and bells
  glockenspiel: { dir: `${VCSL}/Idiophones/Struck Idiophones/Glockenspiel`, oneShot: true, gain: 0.7, transpose: OCT },
  vibraphone: { dir: `${VCSL}/Idiophones/Struck Idiophones/Vibraphone/Soft Mallets`, oneShot: true, transpose: OCT },
  xylophone: { dir: `${VCSL}/Idiophones/Struck Idiophones/Xylophone/Medium Mallets`, oneShot: true, gain: 0.8, transpose: OCT },
  tubularBells: { dir: `${VCSL}/Idiophones/Struck Idiophones/Tubular Bells 1`, oneShot: true, gain: 0.7, transpose: OCT },
  handChimes: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hand Chimes`, oneShot: true, gain: 0.8, transpose: OCT },

  // Drums and percussion (unpitched: played at their recorded pitch)
  kick: { dir: `${VCSL}/Membranophones/Struck Membranophones/Bass Drum 1`, fixedNote: "C2", oneShot: true },
  snare: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /HitNS/, fixedNote: "D2", oneShot: true },
  rim: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /Rim|Stick/i, fixedNote: "D2", oneShot: true },
  hatClosed: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hi-Hat Cymbal`, match: /Close|HitC/, fixedNote: "F#2", oneShot: true, gain: 0.6 },
  sleighBells: { dir: `${VCSL}/Idiophones/Struck Idiophones/Sleigh Bells`, match: /Hit/, fixedNote: "C4", oneShot: true, gain: 0.7 },
  woodblock: { dir: `${VCSL}/Idiophones/Struck Idiophones/Woodblock`, fixedNote: "C4", oneShot: true, gain: 0.7 },
  claps: { dir: `${VCSL}/Idiophones/Struck Idiophones/Claps`, fixedNote: "C4", oneShot: true, gain: 0.7 },
  shaker: { dir: `${VCSL}/Idiophones/Struck Idiophones/Shaker, Small`, fixedNote: "C4", oneShot: true, gain: 0.5 },
  tambourine: { dir: `${VCSL}/Idiophones/Struck Idiophones/Tambourine 1`, fixedNote: "C4", oneShot: true, gain: 0.5 },
  triangle: { dir: `${VCSL}/Idiophones/Struck Idiophones/Triangles`, fixedNote: "C4", oneShot: true, gain: 0.5 },
  timpani: { dir: `${VSCO}/Percussion/Timpani`, fixedNote: "C3", oneShot: true },
} satisfies Record<string, InstrumentOptions>;

export type InstrumentName = keyof typeof INSTRUMENTS;

const cache = new Map<InstrumentName, Instrument>();

export function instrument(name: InstrumentName): Instrument {
  let inst = cache.get(name);
  if (!inst) {
    inst = new Instrument(INSTRUMENTS[name]);
    cache.set(name, inst);
  }
  return inst;
}

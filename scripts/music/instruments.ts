// Every instrument the arrangements can use, mapped to CC0 recordings in ~/APP/samples
// (see ~/APP/samples/PROVENANCE.json). Loaded lazily and cached per render.

import { Instrument, type InstrumentOptions } from "./sampler";

/**
 * Most Versilian (VCSL / VSCO 2 CE) sets name notes with middle C = C3, so they sound one
 * octave above our labels (MIDI C4 = 60). Measured per instrument by pitch.test.ts; the
 * FreePats sets, the VSCO harp and the sustained solo violin already match.
 */
const OCT = 12;
// Fine tuning comes from measuring every recording's pitch (scripts/music/pitch.ts). Most sets
// drift note by note, so they are auto-tuned per recording: the mallets on their fundamental;
// brass, winds and strings on the median of their harmonics; the piano and harp on their
// fundamental (partials 2-4 in the bass). "heard" tunes what you hear in a note's first half
// second: the pizzicato sections start up to 19 cents sharp and settle, the horn, low brass and
// saxes scoop up into their notes. Shorter notes are tuned on the part of the take they play
// (sampler.ts detuneFor), so a song never corrects pitch itself. A few sets keep one measured
// `cents` correction; the honky-tonk piano's detune is its character and is left alone.

const VCSL = "VCSL";
const VSCO = "VSCO-2-CE";
const FP = "freepats";
const BSB = "bigsoundbank";

export const INSTRUMENTS = {
  // Keys
  piano: { dir: `${FP}/UprightPianoKW-SFZ-20220221/samples`, release: 0.35, gain: 0.9, autotune: "heard", stretched: true },
  honkyTonk: { dir: `${FP}/PianoFB SFZ+WAV-20200401/samples`, release: 0.3, gain: 0.9 },
  harpsichord: { dir: `${VCSL}/Chordophones/Zithers/Harpsichord, Italian/Sustains/stop1`, release: 0.15, oneShot: true, transpose: OCT, autotune: "heard", stretched: true },

  // Plucked
  guitar: { dir: `${FP}/SpanishClassicalGuitar-SFZ+FLAC-20190618/samples`, release: 0.2, oneShot: true, autotune: "heard", stretched: true },
  ukulele: { dir: `${FP}/Ukulele SFZ+WAV-20260811/samples`, release: 0.15, oneShot: true, autotune: "heard", stretched: true },
  strumstick: { dir: `${VCSL}/Chordophones/Composite Chordophones/Strumstick/Finger`, match: /_Main_/, oneShot: true, transpose: OCT, autotune: "heard", stretched: true },
  harp: { dir: `${VSCO}/Strings/Harp`, oneShot: true, autotune: "heard", stretched: true },

  // Strings
  violinsPizz: { dir: `${VSCO}/Strings/Violin Section/Pizz`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true, strictTuning: true },
  violasPizz: { dir: `${VSCO}/Strings/Viola Section/pizz`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true, strictTuning: true },
  cellosPizz: { dir: `${VSCO}/Strings/Cello Section/pizzT`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },
  // Strict: a few takes' partials scatter (the loud C2's first take by ±30 cents: no clear pitch).
  bassPizz: { dir: `${VSCO}/Strings/Solo Contrabass/Pizz`, oneShot: true, gain: 1.1, transpose: OCT, autotune: "heard", harmonic: true, strictTuning: true },
  violins: { dir: `${VSCO}/Strings/Violin Section/susVib`, attack: 0.08, release: 0.4, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  cellos: { dir: `${VSCO}/Strings/Cello Section/susvib`, attack: 0.08, release: 0.4, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  fiddle: { dir: `${VSCO}/Strings/Solo Violin/Arco Vib`, attack: 0.03, release: 0.2, autotune: "heard", harmonic: true },
  fiddleShort: { dir: `${VSCO}/Strings/Solo Violin/spic`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },

  // Winds and brass
  flute: { dir: `${VSCO}/Woodwinds/Flute/susvib`, attack: 0.04, release: 0.2, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  fluteShort: { dir: `${VSCO}/Woodwinds/Flute/stac`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },
  clarinet: { dir: `${VSCO}/Woodwinds/Clarinet/susLong`, attack: 0.03, release: 0.2, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  clarinetShort: { dir: `${VSCO}/Woodwinds/Clarinet/stac`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },
  bassoonShort: { dir: `${VSCO}/Woodwinds/Bassoon/stac`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },
  // Without the loud F3 take (VSCO's F2 v3): it starts 45 cents flat for its first 0.2 s.
  horn: { dir: `${VSCO}/Brass/F Horn/sus`, exclude: /_F2_v3_/, attack: 0.05, release: 0.3, gain: 0.7, transpose: OCT, autotune: "heard", harmonic: true },
  trumpetMute: { dir: `${VSCO}/Brass/Trumpet/harmonM-sus`, attack: 0.02, release: 0.15, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  trumpetShort: { dir: `${VSCO}/Brass/Trumpet/stac`, oneShot: true, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true, strictTuning: true },
  tromboneShort: { dir: `${VSCO}/Brass/Tenor Trombone/stac`, oneShot: true, gain: 0.85, transpose: OCT, autotune: "heard", harmonic: true },
  // The owner's favorites: French horn, saxophones and low brass. There is no CC0 euphonium,
  // so songs voice it as tuba + trombone on the same notes (a tenor tuba is what a euphonium is).
  // Gains put each at about -28 dB RMS for a mid-velocity note in its main range (like the horn).
  hornShort: { dir: `${VSCO}/Brass/F Horn/stac`, oneShot: true, gain: 0.5, transpose: OCT, even: true, autotune: "heard", harmonic: true, strictTuning: true },
  trombone: { dir: `${VSCO}/Brass/Tenor Trombone/sus`, attack: 0.05, release: 0.3, gain: 2.4, transpose: OCT, even: true, autotune: "heard", harmonic: true },
  tuba: { dir: `${VSCO}/Brass/Tuba/sus`, attack: 0.05, release: 0.3, gain: 0.62, transpose: OCT, even: true, autotune: "heard", harmonic: true },
  // Only the louder staccato layer: the soft one is played 40-60 cents flat. Short notes bend,
  // so the staccato sets keep only the takes whose pitch measures steady (strictTuning).
  tubaShort: { dir: `${VSCO}/Brass/Tuba/stac`, match: /_v2_/, oneShot: true, gain: 2.2, transpose: OCT, autotune: "heard", harmonic: true, even: true, strictTuning: true },
  sax: { dir: `${VCSL}/Aerophones/Reed Aerophones/Tenor Saxophone/Vibrato`, attack: 0.03, release: 0.2, gain: 1.3, transpose: OCT, autotune: "heard", harmonic: true, even: true },
  saxShort: { dir: `${VCSL}/Aerophones/Reed Aerophones/Tenor Saxophone/Staccato`, oneShot: true, gain: 1.55, transpose: OCT, even: true, autotune: "heard", harmonic: true, strictTuning: true },
  // Saxello: a curved soprano sax, an octave above the tenor.
  sopranoSax: { dir: `${VCSL}/Aerophones/Reed Aerophones/Saxello/Vibrato`, attack: 0.03, release: 0.2, gain: 0.45, transpose: OCT, even: true, autotune: "heard", harmonic: true },
  sopranoSaxShort: { dir: `${VCSL}/Aerophones/Reed Aerophones/Saxello/Staccato`, oneShot: true, gain: 0.7, transpose: OCT, even: true, autotune: "heard", harmonic: true, strictTuning: true },
  harmonica: { dir: `${VCSL}/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C/Sustains/Normal`, attack: 0.02, release: 0.15, transpose: OCT, autotune: "heard", harmonic: true },

  // Folk: a plucked psaltery that can stand in for a hammered dulcimer (Thanksgiving's first,
  // old-time-country arrangement used it; none does now); a button accordion and a soprano
  // recorder (as the tin whistle) for the Irish session of St. Patrick's Day.
  psaltery: { dir: `${VCSL}/Chordophones/Zithers/Psaltery, Bowed and Plucked/Pluck`, oneShot: true, transpose: OCT, autotune: "heard", stretched: true },
  // Its files are named an octave above the pitch they sound (the set's own SFZ maps B3.flac
  // to B2) and run 7-38 cents sharp; autotune takes out the cents.
  accordion: { dir: `${FP}/Button Accordion HN SFZ+FLAC-20240329`, attack: 0.02, release: 0.15, gain: 0.8, transpose: -12, autotune: "heard", harmonic: true },
  // MLK Day's reed organ (a church harmonium): the same free-reed recordings swelling in slowly,
  // low-passed by the song. The takes hold 1.3-2.5 s and stop dead, so chords are re-struck each
  // pulse and never held longer than a second; the 0.45 s release (-6 dB at 50 ms) carries each
  // chord down through the next one's attack, so the re-strikes crossfade instead of dipping.
  // Without the E5 take (E4): at its own pitch it is heard 9 cents sharp (a scoop its measured
  // tuning misses), so E4 plays on the D5 take, F4 on F#5.
  reedOrgan: { dir: `${FP}/Button Accordion HN SFZ+FLAC-20240329`, exclude: /E5\.flac/, attack: 0.09, release: 0.45, gain: 0.8, transpose: -12, autotune: "heard", harmonic: true },
  whistle: { dir: `${VCSL}/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder/Sustain`, attack: 0.02, release: 0.12, gain: 0.8, transpose: OCT, autotune: "heard", harmonic: true },
  whistleShort: { dir: `${VCSL}/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder/Staccato`, oneShot: true, transpose: OCT, autotune: "heard", harmonic: true },

  // Mallets and bells
  glockenspiel: { dir: `${VCSL}/Idiophones/Struck Idiophones/Glockenspiel`, oneShot: true, gain: 0.7, transpose: OCT, autotune: true },
  vibraphone: { dir: `${VCSL}/Idiophones/Struck Idiophones/Vibraphone/Soft Mallets`, oneShot: true, transpose: OCT, autotune: "heard" },
  xylophone: { dir: `${VCSL}/Idiophones/Struck Idiophones/Xylophone/Medium Mallets`, oneShot: true, gain: 0.8, transpose: OCT, autotune: true },
  tubularBells: { dir: `${VCSL}/Idiophones/Struck Idiophones/Tubular Bells 1`, oneShot: true, gain: 0.7, transpose: OCT },
  handChimes: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hand Chimes`, oneShot: true, gain: 0.8, transpose: OCT, autotune: "heard" },

  // Drums and percussion (unpitched: played at their recorded pitch)
  kick: { dir: `${VCSL}/Membranophones/Struck Membranophones/Bass Drum 1`, fixedNote: "C2", oneShot: true },
  snare: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /HitNS/, fixedNote: "D2", oneShot: true },
  rim: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /Rim|Stick/i, fixedNote: "D2", oneShot: true },
  // `snare` is the snares-off hit (a soft thud); `snareOn` is the bright, buzzy snare of a
  // drum kit or brass band, and `snareRoll` its roll (holds for the note's length).
  snareOn: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /HitSN/, fixedNote: "D2", oneShot: true },
  snareRoll: { dir: `${VCSL}/Membranophones/Struck Membranophones/Snare Drum, Modern 1`, match: /rollSN/, fixedNote: "D2", attack: 0.01, release: 0.12 },
  tomHigh: { dir: `${VCSL}/Membranophones/Struck Membranophones/Tom 1/Stick`, match: /HitS/, fixedNote: "A2", oneShot: true },
  tomLow: { dir: `${VCSL}/Membranophones/Struck Membranophones/Tom 2/Stick`, match: /HitS/, fixedNote: "F2", oneShot: true },
  // Closed hi-hat with the stick (four layers); the foot "chick" of a jazz 2 and 4 is hatPedal.
  hatClosed: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hi-Hat Cymbal`, match: /HitC_/, fixedNote: "F#2", oneShot: true, gain: 0.6 },
  hatPedal: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hi-Hat Cymbal`, match: /HiHat_Close_/, fixedNote: "G#2", oneShot: true, gain: 0.6 },
  hatOpen: { dir: `${VCSL}/Idiophones/Struck Idiophones/Hi-Hat Cymbal`, match: /HitO_/, fixedNote: "A#2", oneShot: true, gain: 0.5 },
  // Kit cymbals from the suspended cymbal: a stick tip for the ride, a full hit for the crash.
  ride: { dir: `${VCSL}/Idiophones/Struck Idiophones/Suspended Cymbal 1`, match: /hit_stick_(mp|f)1/, layerBy: [/_mp1/, /_f1/], fixedNote: "D#3", oneShot: true, gain: 0.45 },
  crash: { dir: `${VCSL}/Idiophones/Struck Idiophones/Suspended Cymbal 1`, match: /_hit_f1/, fixedNote: "C#3", oneShot: true, gain: 0.55 },
  // Thanksgiving's jazz trio: the ride's two softest stick tips (pianissimo, mezzo-piano: darker
  // than `ride`'s pair), and the cymbal's 1.5 s soft-mallet crescendo (it peaks ~1.1 s in).
  rideSoft: { dir: `${VCSL}/Idiophones/Struck Idiophones/Suspended Cymbal 1`, match: /hit_stick_(pp|mp)1/, layerBy: [/_pp1/, /_mp1/], fixedNote: "D#3", oneShot: true, gain: 0.45 },
  cymbalSwell: { dir: `${VCSL}/Idiophones/Struck Idiophones/Suspended Cymbal 1`, match: /cresc_1\.5s/, fixedNote: "C#3", oneShot: true, gain: 0.5 },
  // Orchestral clash cymbals (a pair, hand-held): the fanfare's big hit.
  cymbals: { dir: `${VCSL}/Idiophones/Struck Idiophones/Clash Cymbals 1`, match: /crash1_(mf|ff)/, layerBy: [/_mf\d/, /_ff\d/], fixedNote: "C#3", oneShot: true, gain: 0.5 },
  sleighBells: { dir: `${VCSL}/Idiophones/Struck Idiophones/Sleigh Bells`, match: /Hit/, fixedNote: "C4", oneShot: true, gain: 0.7 },
  woodblock: { dir: `${VCSL}/Idiophones/Struck Idiophones/Woodblock`, fixedNote: "C4", oneShot: true, gain: 0.7 },
  claps: { dir: `${VCSL}/Idiophones/Struck Idiophones/Claps`, fixedNote: "C4", oneShot: true, gain: 0.7 },
  shaker: { dir: `${VCSL}/Idiophones/Struck Idiophones/Shaker, Small`, fixedNote: "C4", oneShot: true, gain: 0.5 },
  tambourine: { dir: `${VCSL}/Idiophones/Struck Idiophones/Tambourine 1`, fixedNote: "C4", oneShot: true, gain: 0.5 },
  // The tambourine's two hits alone (two layers), for a backbeat: `tambourine` rotates its 10 s
  // rolls and shakes in with them.
  tambourineHit: { dir: `${VCSL}/Idiophones/Struck Idiophones/Tambourine 1`, match: /Tamb1_Hit_/, fixedNote: "C4", oneShot: true, gain: 0.5 },
  // Triangle: open strokes and fully muted "tk" strokes, all from one triangle so a part keeps
  // one pitch (no rolls: those are 23-39 s long).
  triangle: { dir: `${VCSL}/Idiophones/Struck Idiophones/Triangles`, match: /Triangle3_Hit_/, fixedNote: "C4", oneShot: true, gain: 0.5 },
  triangleMuted: { dir: `${VCSL}/Idiophones/Struck Idiophones/Triangles`, match: /Triangle3_HitFM_/i, fixedNote: "C4", oneShot: true, gain: 0.5 },
  timpani: { dir: `${VSCO}/Percussion/Timpani`, fixedNote: "C3", oneShot: true },
  // Toy Kingdom's wind-up key: single turns of a crank ratchet (four takes, round robin).
  ratchet: { dir: `${VCSL}/Idiophones/Struck Idiophones/Ratchet`, match: /Crank/, fixedNote: "C4", oneShot: true },

  // Bodhran: the VCSL frame drum (large: open hit and muted; small: a higher tap).
  bodhran: { dir: `${VCSL}/Membranophones/Struck Membranophones/Frame Drum`, match: /HDrumL_Hit_/, fixedNote: "D2", oneShot: true },
  bodhranMuted: { dir: `${VCSL}/Membranophones/Struck Membranophones/Frame Drum`, match: /HDrumL_HitMuted_/, fixedNote: "D2", oneShot: true },
  bodhranHigh: { dir: `${VCSL}/Membranophones/Struck Membranophones/Frame Drum`, match: /HDrumS_Hit_/, fixedNote: "A2", oneShot: true },

  // Sound effects (BigSoundBank, CC0), played at their recorded pitch on C4. Long ones (the
  // crowd, the clinking, thunder) ring through the loop: cap them with a track's `ring`.
  // New Year's party:
  crowd: { dir: BSB, match: /^3515-/, fixedNote: "C4", oneShot: true, trim: false },
  cheer: { dir: BSB, match: /^023[67]-/, fixedNote: "C4", oneShot: true },
  applause: { dir: BSB, match: /^2479-/, fixedNote: "C4", oneShot: true, trim: false },
  applauseBig: { dir: BSB, match: /^0019-/, fixedNote: "C4", oneShot: true, trim: false },
  clink: { dir: BSB, match: /^(1335|1337|2888)-/, fixedNote: "C4", oneShot: true },
  clinking: { dir: BSB, match: /^0472-/, fixedNote: "C4", oneShot: true, trim: false },
  cork: { dir: BSB, match: /^(0211|0648)-/, fixedNote: "C4", oneShot: true },
  // Halloween:
  creak: { dir: BSB, match: /^(3205|3207|0306)-/, fixedNote: "C4", oneShot: true },
  thunder: { dir: BSB, match: /^(3114|3181)-/, fixedNote: "C4", oneShot: true, trim: false },
  owl: { dir: BSB, match: /^(1763|0429)-/, fixedNote: "C4", oneShot: true },
  cackle: { dir: BSB, match: /^0489-/, fixedNote: "C4", oneShot: true },
  madLaugh: { dir: BSB, match: /^2103-/, fixedNote: "C4", oneShot: true },
  // Cyberpunk's rainy night: the long thunder roll (3181, 41 s) alone, so a song can let it go
  // where it likes (`ring`) and it dies away over a long release instead of stopping.
  thunderRoll: { dir: BSB, match: /^3181-/, fixedNote: "C4", oneShot: true, trim: false, release: 3 },
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

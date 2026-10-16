// Every pitched instrument must sound at the notes it's mapped to — octave included. Plays
// each recorded zone unshifted, measures its fundamental, and requires most zones to land
// within 60 cents of the label (after the instrument's transpose). This is what caught the
// Versilian "middle C = C3" octave offset. Skipped if the sample library isn't on this Mac.

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTRUMENTS, instrument, type InstrumentName } from "./instruments";
import { centsFrom, fundamental } from "./pitch";
import { SAMPLES } from "./sampler";

const UNPITCHED = new Set(Object.entries(INSTRUMENTS).filter(([, o]) => "fixedNote" in o).map(([k]) => k));
const PITCHED = (Object.keys(INSTRUMENTS) as InstrumentName[]).filter((k) => !UNPITCHED.has(k));
/** Bells and mallets have inharmonic overtones, so fewer zones measure cleanly. */
const INHARMONIC = new Set<InstrumentName>(["tubularBells", "handChimes", "glockenspiel", "xylophone", "vibraphone"]);
/** Weak fundamentals (harmon mute, horn) make some zones read an octave up; only require most zones near 0 or ±1200. */
const WEAK_FUNDAMENTAL = new Set<InstrumentName>(["trumpetMute", "horn"]);
/** Fundamentals measure reliably from G2 to D6; piano bass and top octave don't. */
const MEASURABLE = (note: number) => note >= 43 && note <= 86;

describe.skipIf(!existsSync(SAMPLES))("instrument tuning (octave-aware)", () => {
  it.each(PITCHED)("%s sounds at its mapped notes", (name) => {
    const inst = instrument(name);
    const all = inst.zones.filter((z) => z.rr === 1);
    const inRange = all.filter((z) => MEASURABLE(z.note));
    const zones = inRange.length >= 3 ? inRange : all;
    const offsets = zones.map((z) => centsFrom(fundamental(z.audio.left, z.audio.rate), z.note));
    const inTune = offsets.filter((c) => Math.abs(c) < 60).length;
    // Bells: an octave-error would show as most zones near ±1200, so also require that few are.
    const octaveOff = offsets.filter((c) => Math.abs(Math.abs(c) - 1200) < 60).length;
    const msg = `${name}: ${inTune}/${zones.length} zones in tune, ${octaveOff} read an octave off`;
    if (WEAK_FUNDAMENTAL.has(name)) {
      expect((inTune + octaveOff) / zones.length, msg).toBeGreaterThanOrEqual(0.8);
      expect(inTune, msg).toBeGreaterThan(0);
    } else {
      expect(inTune / zones.length, msg).toBeGreaterThanOrEqual(INHARMONIC.has(name) ? 0.25 : 0.6);
      expect(octaveOff, msg).toBeLessThan(inTune);
    }
  });
});

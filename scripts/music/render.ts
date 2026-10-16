// Render songs to seamless AAC loops for the game.
//   npm run music -- <song> [<song> ...]      (song = file name in scripts/music/songs/)
// Writes src/audio/music/<song>.mp4 + updates src/audio/music/manifest.json, and a two-loop
// WAV in preview/music/<song>.wav for listening (afplay preview/music/<song>.wav).
//
// Loop layout (so the game can loop sample-accurately despite AAC encoder delay):
//   file = [last PAD frames] + [loop body L] + [first PAD frames], then AAC adds 2112 frames
//   of priming. At runtime: loopStart = (priming? 2112 : 0)/sr + PAD/sr, loopEnd = loopStart + L/sr.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { master, RATE, renderLoop, type Song } from "./song";
import { writeWav } from "./wav";

const PAD = 12000;
const PRIMING = 2112;
const OUT = "src/audio/music";
const PREVIEW = "preview/music";

export interface LoopInfo {
  sr: number;
  /** Loop body length in frames. */
  L: number;
  PAD: number;
  priming: number;
  bpm: number;
  bars: number;
}

async function main(): Promise<void> {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error("usage: npm run music -- <song> [<song> ...]");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PREVIEW, { recursive: true });
  const manifestPath = join(OUT, "manifest.json");
  const manifest: Record<string, LoopInfo> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

  for (const name of names) {
    const mod = (await import(pathToFileURL(join(process.cwd(), "scripts/music/songs", `${name}.ts`)).href)) as { default: Song };
    const song = mod.default;
    const t0 = Date.now();
    const loop = master(renderLoop(song));
    const L = loop.left.length;

    // Padded file for the game
    const padded = (ch: Float32Array) => {
      const out = new Float32Array(L + PAD * 2);
      out.set(ch.subarray(L - PAD), 0);
      out.set(ch, PAD);
      out.set(ch.subarray(0, PAD), PAD + L);
      return out;
    };
    const wavPath = join(PREVIEW, `${name}-padded.wav`);
    writeWav(wavPath, { rate: RATE, left: padded(loop.left), right: padded(loop.right) });
    const mp4 = join(OUT, `${name}.mp4`);
    execFileSync("afconvert", [wavPath, "-o", mp4, "-f", "mp4f", "-d", `aac@${RATE}`, "-b", "128000", "-s", "2", "-q", "127"]);

    // Two loops back to back, to listen for the seam
    const twice = (ch: Float32Array) => {
      const out = new Float32Array(L * 2);
      out.set(ch, 0);
      out.set(ch, L);
      return out;
    };
    writeWav(join(PREVIEW, `${name}.wav`), { rate: RATE, left: twice(loop.left), right: twice(loop.right) });

    manifest[name] = { sr: RATE, L, PAD, priming: PRIMING, bpm: song.bpm, bars: song.bars };
    const kb = Math.round(readFileSync(mp4).length / 1024);
    console.log(`${name}: ${(L / RATE).toFixed(1)}s loop, ${kb} KB -> ${mp4} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

void main();

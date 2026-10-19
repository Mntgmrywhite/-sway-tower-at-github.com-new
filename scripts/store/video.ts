import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { roundRectPath } from "../../src/base/draw";
import { kitFor } from "../../src/base/style";
import { updateView } from "../../src/render";
import { classic } from "../../src/skins/classic";
import { INK } from "../../src/skins/classic/colors";
import { PREVIEW_DEVICES, PREVIEW_FPS, type Device } from "./lib/devices";
import { cssCanvas, dom, drawLogo, drawMoment, drawSkyBackdrop, drawTitleControls, type Moment } from "./lib/draw";
import { registerFonts } from "./lib/fonts";
import { atTime, BEST_DROP, BEST_SLIDE, SCENE_TIMES, SHORT, skin, tower, SLOPPY } from "./lib/moments";
import { APP_ICON, CLASSIC_SONG, OUT, ROOT } from "./lib/paths";
import { climb, missPlayer, play, settle, sim, targetPlayer, type Player, type Sim } from "./lib/sim";
import { FRAME } from "../../src/testing/bots";

// The App Store app preview: 25 s of the game, portrait, 30 fps, rendered frame by frame offline
// (two 60 Hz game steps a frame, bots tapping where a player would) and encoded by
// scripts/store/encode.swift (AVFoundation: H.264 High 4.0 at 11 Mbps, the Classic song as
// stereo AAC 256 kbps), at Apple's app-preview sizes. Storyboard:
//   logo card → the first drops of a run, with perfects → PERFECT ×2…×5 → the tower tall and
//   swaying → quick cuts of skins (New Year's midnight, Synthwave's car, Halloween's Horseman)
//   → Drop mode → the game-over topple and blast → end card with the icon.
// Output: store/out/preview/<device>/sway-tower-preview-<w>x<h>.mp4, plus frames read back from
// it under store/out/preview/<device>/check/ to look at.

interface Segment {
  name: string;
  seconds: number;
  /** Draw frame `k` of this segment (k from 0) at cssW x cssH, advancing the game as it goes. */
  paint(ctx: SKRSContext2D, cssW: number, cssH: number, k: number): void;
}

/** Two game steps a video frame (60 Hz game, 30 fps video). */
const STEPS = Math.round(1 / FRAME / PREVIEW_FPS);

/** A segment that runs `sim` under `player` and shows `moment` (sharing the sim). */
function playSegment(name: string, seconds: number, s: Sim, moment: Omit<Moment, "sim">, player: Player, songAt?: (t: number) => number): Segment {
  return {
    name,
    seconds,
    paint(ctx, cssW, cssH, k) {
      if (k > 0) for (let i = 0; i < STEPS; i++) play(s, player);
      const songTime = songAt ? songAt(k / PREVIEW_FPS) : moment.songTime;
      drawMoment(ctx, cssW, cssH, { ...moment, sim: s, songTime });
    },
  };
}

function fadeFromBlack(ctx: SKRSContext2D, cssW: number, cssH: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha)})`;
  ctx.fillRect(0, 0, cssW, cssH);
}

function storyboard(icon: Image): Segment[] {
  const sky = skin("classic");
  const bests = { normal: BEST_SLIDE, hard: BEST_DROP };

  // The title screen: the scene runs, the tower stands still (main.ts steps only the view).
  const title = sim();
  const logo: Segment = {
    name: "logo",
    seconds: 2,
    paint(ctx, cssW, cssH, k) {
      if (k > 0) for (let i = 0; i < STEPS; i++) updateView(title.view, title.state, FRAME);
      drawMoment(ctx, cssW, cssH, { sim: title, skin: sky, opts: { title: true } });
      drawTitleControls(ctx, cssW, cssH, sky, bests, "normal");
      fadeFromBlack(ctx, cssW, cssH, 1 - k / (0.35 * PREVIEW_FPS));
    },
  };

  // A fresh run: the first bars, two perfect, one sliced.
  const first = playSegment("first-drops", 3.6, sim(), { skin: sky, best: BEST_SLIDE }, targetPlayer([0, 0, 5, 0], 0.25));

  // A run of perfects: PERFECT ×2 … ×5, the pop growing.
  const streakSim = tower(14);
  const streak = playSegment("perfects", 3.6, streakSim, { skin: sky, best: BEST_SLIDE }, targetPlayer([0, 0, 0, 0], 0.2));

  // Tall, at sunset: sloppy drops kick the sway about.
  const tallSim = tower(66, "normal", SLOPPY);
  const tall = playSegment("tall-sway", 3.2, tallSim, { skin: sky, best: BEST_SLIDE }, targetPlayer([6, 0, -5, 0], 0.2));

  // The skins: New Year's midnight (the song a beat before it, the finale after), Synthwave's car, the Horseman.
  const nySim = tower(22);
  atTime(nySim, 4);
  const songFrom = SCENE_TIMES.midnightSong - 1.9;
  const newYear = playSegment("newyear", 1.9, nySim, { skin: skin("newyear"), best: BEST_SLIDE }, targetPlayer([0, 0], 0.2), (t) => songFrom + t);
  const neonSim = tower(SHORT);
  atTime(neonSim, SCENE_TIMES.neonCar - 0.3);
  const synth = playSegment("synthwave", 1.9, neonSim, { skin: skin("neon"), best: BEST_SLIDE }, targetPlayer([0, 0, 0], 0.2));
  const hallSim = tower(10);
  atTime(hallSim, SCENE_TIMES.horseman - 0.9);
  const halloween = playSegment("halloween", 1.9, hallSim, { skin: skin("halloween"), best: BEST_SLIDE }, targetPlayer([0, 0, 0], 0.2));

  // Drop: the bar let go from the raised lane falls onto the swaying top.
  const dropSim = climb(12, "hard", [0, 5, -4, 0, 3, 0, -6, 0, 2, 0]);
  settle(dropSim, 0.3);
  const dropMode = playSegment("drop", 2.6, dropSim, { skin: sky, best: BEST_DROP }, targetPlayer([0, 4, 0], 0.3));

  // The last life: a miss at the end of the slider's run, the top goes over and blows up, the card.
  const overSim = tower(24, "normal", [0, 6, -5, 0, 4, -4, 0, 3, 0, -6]);
  overSim.state.lives = 1;
  const over = playSegment("game-over", 2.4, overSim, { skin: sky, best: BEST_SLIDE }, missPlayer());

  // The end card: the icon on the day sky, the name, the line.
  const end: Segment = {
    name: "end-card",
    seconds: 2.3,
    paint(ctx, cssW, cssH, k) {
      drawSkyBackdrop(ctx, cssW, cssH);
      const u = Math.min(cssW, cssH * 0.6);
      const tile = u * 0.5;
      const x = (cssW - tile) / 2;
      const y = cssH * 0.42 - tile / 2 - u * 0.1;
      const c = dom(ctx);
      roundRectPath(c, x + u * 0.01, y + u * 0.018, tile, tile, tile * 0.2237);
      c.fillStyle = "rgba(0, 0, 0, 0.28)";
      c.fill();
      c.save();
      roundRectPath(c, x, y, tile, tile, tile * 0.2237);
      c.clip();
      ctx.drawImage(icon, x, y, tile, tile);
      c.restore();
      roundRectPath(c, x, y, tile, tile, tile * 0.2237);
      c.lineWidth = Math.max(2, u * 0.008);
      c.strokeStyle = INK;
      c.stroke();
      drawLogo(ctx, cssW / 2, y + tile + u * 0.2, u * 0.14, cssW * 0.88);
      c.font = `700 ${Math.round(u * 0.055)}px ${kitFor(classic).body}`;
      c.textAlign = "center";
      kitFor(classic).text(c, "Build as high as you can", cssW / 2, y + tile + u * 0.3, "#ffffff", u * 0.012);
      const fadeAt = (this.seconds - 0.4) * PREVIEW_FPS;
      fadeFromBlack(ctx, cssW, cssH, (k - fadeAt) / (0.4 * PREVIEW_FPS));
    },
  };

  return [logo, first, streak, tall, newYear, synth, halloween, dropMode, over, end];
}

/** Compile the encoder once (into the temp dir) and return its path. */
function encoder(): string {
  const src = resolve(ROOT, "scripts/store/encode.swift");
  const bin = join(tmpdir(), "sway-tower-store", "encode");
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(src).mtimeMs) {
    mkdirSync(dirname(bin), { recursive: true });
    console.log("compiling scripts/store/encode.swift");
    const r = spawnSync("swiftc", ["-O", "-swift-version", "5", "-suppress-warnings", src, "-o", bin], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("swiftc failed (Xcode's command line tools are needed to encode the preview)");
  }
  return bin;
}

export interface VideoOptions {
  devices?: readonly Device[];
  /** Keep the PNG frame sequence next to the video (for ffmpeg, or to look at). */
  keepFrames?: boolean;
  /** Only render the frames; don't encode. */
  skipEncode?: boolean;
}

/** Render and encode the preview for each device; returns the files written. */
export async function buildVideo({ devices = PREVIEW_DEVICES, keepFrames = false, skipEncode = false }: VideoOptions = {}): Promise<string[]> {
  registerFonts();
  const icon = await loadImage(APP_ICON);
  const files: string[] = [];
  for (const d of devices) {
    const dir = join(OUT, "preview", d.id);
    mkdirSync(dir, { recursive: true });
    const framesDir = keepFrames ? join(dir, "frames") : mkdtempSync(join(tmpdir(), "sway-tower-frames-"));
    if (keepFrames) {
      rmSync(framesDir, { recursive: true, force: true });
      mkdirSync(framesDir, { recursive: true });
    }
    const cssW = d.w / d.scale;
    const cssH = d.h / d.scale;
    const { canvas, ctx } = cssCanvas(cssW, cssH, d.scale);
    let n = 0;
    const segments = storyboard(icon);
    const total = segments.reduce((sum, s) => sum + Math.round(s.seconds * PREVIEW_FPS), 0);
    console.log(`${d.id}: ${total} frames at ${d.w}x${d.h}`);
    for (const seg of segments) {
      const count = Math.round(seg.seconds * PREVIEW_FPS);
      for (let k = 0; k < count; k++) {
        ctx.save();
        seg.paint(ctx, cssW, cssH, k);
        ctx.restore();
        writeFileSync(join(framesDir, `${String(n).padStart(6, "0")}.png`), canvas.toBuffer("image/png"));
        n++;
      }
      console.log(`  ${seg.name}: ${count} frames (to ${(n / PREVIEW_FPS).toFixed(2)} s)`);
    }
    if (skipEncode) {
      console.log(`  frames in ${framesDir}`);
      continue;
    }
    const out = join(dir, `sway-tower-preview-${d.w}x${d.h}.mp4`);
    const seconds = n / PREVIEW_FPS;
    const checkTimes = [1, 3.5, 6.5, 10, 12.5, 14.3, 16.2, 18.5, 21.2, 23.5].filter((t) => t < seconds);
    const r = spawnSync(
      encoder(),
      [
        "--frames", framesDir,
        "--fps", String(PREVIEW_FPS),
        "--out", out,
        "--audio", CLASSIC_SONG,
        "--audio-start", "0",
        "--fade-in", "0.4",
        "--fade-out", "2",
        // Apple targets 10–12 Mbps; the encoder undershoots a flat cartoon's average by about a fifth (11 M came out at 9.1 M).
        "--bitrate", "13500000",
        "--check", join(dir, "check"),
        "--check-times", checkTimes.join(","),
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) throw new Error(`encoding ${out} failed`);
    files.push(out);
    if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
    else console.log(`  frames kept in ${framesDir} (ffmpeg -framerate 30 -i %06d.png -i ${CLASSIC_SONG} -c:v libx264 -profile:v high -level 4.0 -b:v 11M -pix_fmt yuv420p -c:a aac -b:a 256k -shortest out.mp4)`);
  }
  return files;
}

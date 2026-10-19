import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { SCREENSHOT_DEVICES, type Device } from "./lib/devices";
import { composeScreenshot, drawMoment, drawSkinGrid, type Caption, type Moment, type Tile } from "./lib/draw";
import { registerFonts } from "./lib/fonts";
import * as moments from "./lib/moments";
import { OUT } from "./lib/paths";
import { opaquePng } from "./lib/png";

// The App Store screenshot set: ten per display size, each a real render of the game at that
// device's CSS size under one caption band (lib/draw.ts). Written to
// store/out/screenshots/<device>/NN-<slug>.png (opaque PNG, as App Store Connect requires) with a
// contact sheet per device to check the set at thumbnail size.

interface Shot {
  slug: string;
  caption: Caption;
  paint(ctx: SKRSContext2D, cssW: number, cssH: number, d: Device): void;
}

const show =
  (m: Moment) =>
  (ctx: SKRSContext2D, cssW: number, cssH: number): void =>
    drawMoment(ctx, cssW, cssH, m);

/** The seasons grid's tiles: six title scenes (also the press kit's "nine worlds" picture, site.ts). */
export function seasonTiles(): Tile[] {
  return [
    { moment: moments.title("halloween", moments.SCENE_TIMES.horseman), label: "Halloween" },
    { moment: moments.title("thanksgiving", moments.SCENE_TIMES.thanksgiving), label: "Thanksgiving" },
    { moment: moments.title("christmas", moments.SCENE_TIMES.carriage), label: "Christmas" },
    { moment: moments.title("newyear", 4, moments.SCENE_TIMES.midnightSong), label: "New Year's" },
    { moment: moments.title("stpatricks", moments.SCENE_TIMES.gold), label: "St. Patrick's" },
    // Cyberpunk, not Toy Kingdom (which has shot 8 to itself), so every one of the nine worlds is in the set.
    { moment: moments.title("neon-cyber", moments.SCENE_TIMES.racer), label: "Cyberpunk" },
  ];
}

/** The set, in App Store order. Moments are built once and drawn at every size. */
function shots(): Shot[] {
  const seasons = seasonTiles();
  return [
    { slug: "build", caption: { headline: "Build as high as you can", sub: "One tap drops the bar. Overhang gets sliced off." }, paint: show(moments.build()) },
    { slug: "sway", caption: { headline: "The tower sways", sub: "The taller it gets, the more it moves. Time both." }, paint: show(moments.sway()) },
    { slug: "perfect", caption: { headline: "PERFECT", sub: "Nail the seam: the tower calms and the sliver comes back" }, paint: show(moments.perfect()) },
    { slug: "drop", caption: { headline: "Slide or Drop", sub: "Drop lets the bar fall onto the swaying top" }, paint: show(moments.dropFall()) },
    {
      slug: "seasons",
      caption: { headline: "A new world every season", sub: "Nine hand-made worlds, each with its own song" },
      paint: (ctx, cssW, cssH, d) => drawSkinGrid(ctx, cssW, cssH, d.scale, seasons, 2),
    },
    { slug: "newyear", caption: { headline: "Count down to midnight", sub: "New Year's Eve: the ball drops, the fireworks fly" }, paint: show(moments.midnight()) },
    // Synthwave's song is our own synth (the real-instrument songs belong to the cartoon worlds): the line says neon, not strings.
    { slug: "synthwave", caption: { headline: "Ride the Synthwave", sub: "Neon nights, a chrome car and an electro beat" }, paint: show(moments.synthwave()) },
    { slug: "toykingdom", caption: { headline: "Blast off in Toy Kingdom", sub: "A rocket, a fort, a wind-up mouse and a toy-box march" }, paint: show(moments.rocket()) },
    { slug: "night", caption: { headline: "Climb into the night", sub: "Sky Islands: from a floating island up past the stars" }, paint: show(moments.night()) },
    { slug: "blast", caption: { headline: "Every run ends with a bang", sub: "Then tap to go again. No ads, no tracking, works offline." }, paint: show(moments.blast()) },
  ];
}

/** Write the set for these devices; returns the files written. */
export function buildScreenshots(devices: readonly Device[] = SCREENSHOT_DEVICES): string[] {
  registerFonts();
  const set = shots();
  const files: string[] = [];
  for (const d of devices) {
    const dir = join(OUT, "screenshots", d.id);
    mkdirSync(dir, { recursive: true });
    const thumbs: { file: string; buf: Canvas }[] = [];
    set.forEach((shot, i) => {
      const canvas = composeScreenshot(d, shot.caption, (ctx, cssW, cssH) => shot.paint(ctx, cssW, cssH, d));
      const file = join(dir, `${String(i + 1).padStart(2, "0")}-${shot.slug}.png`);
      writeFileSync(file, opaquePng(canvas));
      files.push(file);
      console.log(`${file}  ${d.w}x${d.h}`);
      thumbs.push({ file, buf: canvas });
    });
    // The contact sheet: the set at thumbnail size (about what the App Store shows in a search result).
    const thumbW = 240;
    const thumbH = Math.round((thumbW * d.h) / d.w);
    const gap = 12;
    const sheet = createCanvas(gap + thumbs.length * (thumbW + gap), thumbH + gap * 2);
    const sctx = sheet.getContext("2d");
    sctx.fillStyle = "#f2f2f7";
    sctx.fillRect(0, 0, sheet.width, sheet.height);
    thumbs.forEach((t, i) => sctx.drawImage(t.buf, gap + i * (thumbW + gap), gap, thumbW, thumbH));
    const sheetFile = join(OUT, "screenshots", `contact-${d.id}.png`);
    writeFileSync(sheetFile, opaquePng(sheet));
    files.push(sheetFile);
    console.log(sheetFile);
  }
  return files;
}

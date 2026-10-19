import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { PERFECT_MEDALS, STACK_MEDALS, type Achievement } from "../../src/achievements";
import { kitFor } from "../../src/base/style";
import { frameFor } from "../../src/camera";
import { BLOCK_HEIGHT } from "../../src/config";
import { drawMedal, MEDAL_H, MEDAL_W } from "../../src/medals";
import { GAME_NAME } from "../../src/render";
import { classic } from "../../src/skins/classic";
import { INK } from "../../src/skins/classic/colors";
import { SCREENSHOT_DEVICES } from "./lib/devices";
import { cssCanvas, dom, drawMoment, drawSkinGrid, type Moment } from "./lib/draw";
import { registerFonts } from "./lib/fonts";
import * as moments from "./lib/moments";
import { APP_ICON, OUT, ROOT } from "./lib/paths";
import { opaquePng } from "./lib/png";
import { seasonTiles } from "./screenshots";

// The landing page's assets and the press kit, from the same renders as the App Store kit:
//
//   store/out/site/           the page (a copy of store/site/index.html, so it opens locally) and
//     assets/                 everything it references: icon, logo, hero, the trailer (a web cut
//                             of the app preview, 720 px wide, about 8.5 MB), its poster, the
//                             "how it plays" crops, the medals, the nine worlds, six App Store shots
//   store/site/MANIFEST.json  every file the page references: relative path -> local path
//   store/out/presskit/       the press kit: icon, logo, screenshots, the trailer, FACTS.md
//
// Images for the page are 660 px wide WebP (phone screenshots at the 6.9" aspect); the press
// kit's are full-size opaque PNGs. Needs store/out/screenshots and store/out/preview from
// `npm run store -- --only screenshots,video` first.

/** Where the page's files go, and where index.html is kept. */
export const SITE_OUT = join(OUT, "site");
export const SITE_SRC = resolve(ROOT, "store/site");
export const PRESSKIT_OUT = join(OUT, "presskit");

/** The page's screenshots: the 6.9" CSS size at this scale, 660 px wide. */
const PAGE_W = 660;
const SHOT = SCREENSHOT_DEVICES.find((d) => d.id === "iphone-6.9")!;
const CSS_W = SHOT.w / SHOT.scale;
const CSS_H = SHOT.h / SHOT.scale;
const PAGE_SCALE = PAGE_W / CSS_W;
/** WebP quality for the page's images (flat art keeps its edges at this). */
const WEBP_Q = 84;

/** The trailer's web cut: width, video and audio bit rates, and the poster's time (the logo card). */
const TRAILER = { width: 720, bitrate: 2_800_000, audioBitrate: 128_000, posterTime: 1.0 };

/** The App Store preview the trailer is cut from. */
const PREVIEW = join(OUT, "preview/iphone/sway-tower-preview-886x1920.mp4");

/**
 * The nine worlds on the page, in the game's picker order, each at its scene's best moment
 * (lib/moments.ts: every skin's opening action lands by ~10 s).
 */
const WORLDS: { id: string; moment: () => Moment }[] = [
  { id: "classic", moment: () => moments.scene("classic", 6, 3) },
  { id: "toyblock", moment: () => moments.rocket() },
  { id: "neon", moment: () => moments.synthwave() },
  { id: "neon-cyber", moment: () => moments.scene("neon-cyber", moments.SHORT, moments.SCENE_TIMES.racer) },
  { id: "halloween", moment: () => moments.horseman() },
  { id: "thanksgiving", moment: () => moments.scene("thanksgiving", 8, moments.SCENE_TIMES.thanksgiving) },
  { id: "christmas", moment: () => moments.scene("christmas", 8, moments.SCENE_TIMES.carriage) },
  { id: "newyear", moment: () => moments.midnight() },
  { id: "stpatricks", moment: () => moments.scene("stpatricks", 8, moments.SCENE_TIMES.gold) },
];

/** The App Store screenshots shown on the page and in the press kit (store/out/screenshots/iphone-6.9). */
const BEST_SHOTS = ["01-build", "02-sway", "03-perfect", "05-seasons", "06-newyear", "09-night"];

/** The press kit's clean screenshots (no caption band): the same moments at the 6.9" size. */
const CLEAN_SHOTS: { slug: string; moment: () => Moment }[] = [
  { slug: "01-build", moment: moments.build },
  { slug: "02-sway", moment: moments.sway },
  { slug: "03-perfect", moment: moments.perfect },
  { slug: "04-drop", moment: () => moments.dropFall() },
  { slug: "06-newyear", moment: moments.midnight },
  { slug: "09-night", moment: moments.night },
];

/** The "how it plays" crops: the top of the tower with the bar over it, from just under the HUD. */
const PLAY_CROPS: { slug: string; moment: () => Moment }[] = [
  { slug: "slide", moment: moments.build },
  { slug: "sway", moment: moments.sway },
  { slug: "drop", moment: () => moments.dropFall() },
  { slug: "perfect", moment: moments.perfect },
];
/**
 * The crop in CSS px (660 x 480 on the page): the full width from under the HUD (its perfect line
 * ends at about 0.14 cssH + 0.19 u; render.ts) down past the tower's top, which the camera keeps
 * near 0.4 cssH, so the slider, a PERFECT pop and seven bars are in it and no HUD line is cut.
 */
const CROP = { top: 236, h: 320 };

// ---------------------------------------------------------------- drawing

function webp(canvas: Canvas): Buffer {
  return canvas.toBuffer("image/webp", WEBP_Q);
}

/** A moment drawn at the 6.9" CSS size at `scale`. */
function shot(m: Moment, scale: number): Canvas {
  const { canvas, ctx } = cssCanvas(CSS_W, CSS_H, scale);
  drawMoment(ctx, CSS_W, CSS_H, m);
  return canvas;
}

/** Screen y (CSS px) of the top of the tower in a moment, as the camera frames it now. */
function towerTopY(m: Moment): number {
  const f = frameFor(CSS_W, CSS_H, m.sim.view.cameraY);
  return f.anchorPx + (f.cameraY - m.sim.state.blocks.length * BLOCK_HEIGHT) * f.scale;
}

/** The CROP window of a moment at the page scale (checked: the tower's top is inside it). */
function playCrop(m: Moment): Canvas {
  const full = shot(m, PAGE_SCALE);
  const top = towerTopY(m);
  if (top < CROP.top + 40 || top > CROP.top + CROP.h - 40) throw new Error(`the tower's top (${top.toFixed(0)} px) is outside the crop`);
  const y = Math.round(CROP.top * PAGE_SCALE);
  const out = createCanvas(PAGE_W, Math.round(CROP.h * PAGE_SCALE));
  out.getContext("2d").drawImage(full, 0, y, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** A world's moment for a still: the climb's last PERFECT pop cleared, so nothing stale hangs over the tower. */
function world(w: { moment: () => Moment }): Moment {
  const m = w.moment();
  m.sim.view.pops = [];
  return m;
}

/** The wordmark in the Classic logo's face and colors on a transparent canvas `w` px wide. */
function logo(w: number): Canvas {
  const probe = createCanvas(8, 8).getContext("2d");
  const trial = 100;
  probe.font = `400 ${trial}px ${classic.hud.display}`;
  const m = probe.measureText(GAME_NAME);
  const outline = (px: number) => Math.max(3, px * 0.12);
  // The face's size so the word plus its outline fills the width.
  const px = Math.floor(((w - 2 * outline(trial) * (w / (m.width + 2 * outline(trial)))) * trial) / m.width);
  const k = px / trial;
  const line = outline(px);
  const ascent = m.actualBoundingBoxAscent * k;
  const descent = m.actualBoundingBoxDescent * k;
  const h = Math.ceil(ascent + descent + line * 2);
  const canvas = createCanvas(w, h);
  const ctx = dom(canvas.getContext("2d"));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 ${px}px ${classic.hud.display}`;
  ctx.lineJoin = "round";
  ctx.lineWidth = line * 2;
  ctx.strokeStyle = INK;
  ctx.strokeText(GAME_NAME, w / 2, line + ascent);
  ctx.fillStyle = classic.hud.title;
  ctx.fillText(GAME_NAME, w / 2, line + ascent);
  return canvas;
}

/** Six medals (the bottom, middle and top of each ladder) in a row on a transparent canvas. */
function medals(medalW: number): Canvas {
  const pick: Achievement[] = [STACK_MEDALS[0]!, STACK_MEDALS[9]!, STACK_MEDALS[19]!, PERFECT_MEDALS[0]!, PERFECT_MEDALS[4]!, PERFECT_MEDALS[9]!];
  const gap = medalW * 0.18;
  const medalH = (medalW * MEDAL_H) / MEDAL_W;
  const canvas = createCanvas(Math.ceil(pick.length * medalW + (pick.length - 1) * gap), Math.ceil(medalH));
  const ctx = dom(canvas.getContext("2d"));
  pick.forEach((a, i) => drawMedal(ctx, a, i * (medalW + gap), 0, medalW, kitFor(classic).body));
  return canvas;
}

/** `file` (an image) drawn `w` px wide. */
async function shrink(file: string, w: number): Promise<Canvas> {
  const image = await loadImage(readFileSync(file));
  const canvas = createCanvas(w, Math.round((image.height * w) / image.width));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Compile scripts/store/transcode.swift once (into the temp dir) and return its path. */
function transcoder(): string {
  const src = resolve(ROOT, "scripts/store/transcode.swift");
  const bin = join(tmpdir(), "sway-tower-store", "transcode");
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(src).mtimeMs) {
    mkdirSync(dirname(bin), { recursive: true });
    console.log("compiling scripts/store/transcode.swift");
    const r = spawnSync("swiftc", ["-O", "-swift-version", "5", "-suppress-warnings", src, "-o", bin], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("swiftc failed (Xcode's command line tools are needed to cut the trailer)");
  }
  return bin;
}

function need(file: string, hint: string): void {
  if (!existsSync(file)) throw new Error(`${file} is missing: run ${hint} first`);
}

function write(file: string, data: Buffer | string): string {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`${file}${Buffer.isBuffer(data) ? `  ${Math.round(data.length / 1024)} kB` : ""}`);
  return file;
}

// ---------------------------------------------------------------- the page's assets

export interface SiteOptions {
  /** Skip the trailer (the Swift transcode); the poster and the video are left as they are. */
  skipTrailer?: boolean;
}

/** Render the page's assets, copy index.html beside them, and write MANIFEST.json; returns the files written. */
export async function buildSite({ skipTrailer = false }: SiteOptions = {}): Promise<string[]> {
  registerFonts();
  const assets = join(SITE_OUT, "assets");
  mkdirSync(assets, { recursive: true });
  const files: string[] = [];

  // The icon and the wordmark.
  files.push(write(join(assets, "icon.webp"), (await shrink(APP_ICON, 512)).toBuffer("image/webp", 92)));
  files.push(write(join(assets, "logo.png"), logo(1400).toBuffer("image/png")));

  // The hero: the tower at sunset, swinging after a sloppy drop.
  files.push(write(join(assets, "hero.webp"), webp(shot(moments.sway(), PAGE_SCALE))));

  // How it plays.
  for (const c of PLAY_CROPS) files.push(write(join(assets, "play", `${c.slug}.webp`), webp(playCrop(c.moment()))));
  files.push(write(join(assets, "medals.png"), medals(200).toBuffer("image/png")));

  // The nine worlds.
  for (const w of WORLDS) files.push(write(join(assets, "worlds", `${w.id}.webp`), webp(shot(world(w), PAGE_SCALE))));

  // The press kit's App Store screenshots, small.
  const shotsDir = join(OUT, "screenshots", SHOT.id);
  for (const slug of BEST_SHOTS) {
    const src = join(shotsDir, `${slug}.png`);
    need(src, "npm run store -- --only screenshots");
    files.push(write(join(assets, "shots", `${slug}.webp`), webp(await shrink(src, PAGE_W))));
  }

  // The trailer: the iPhone app preview cut down for the web, and its poster.
  const trailer = join(assets, "trailer.mp4");
  const poster = join(assets, "trailer-poster.webp");
  if (!skipTrailer) {
    need(PREVIEW, "npm run store -- --only video");
    const posterPng = join(tmpdir(), "sway-tower-store", "trailer-poster.png");
    mkdirSync(dirname(posterPng), { recursive: true });
    const r = spawnSync(
      transcoder(),
      [
        "--in", PREVIEW,
        "--out", trailer,
        "--width", String(TRAILER.width),
        "--bitrate", String(TRAILER.bitrate),
        "--audio-bitrate", String(TRAILER.audioBitrate),
        "--poster", posterPng,
        "--poster-time", String(TRAILER.posterTime),
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) throw new Error("cutting the trailer failed");
    files.push(trailer);
    files.push(write(poster, webp(await shrink(posterPng, TRAILER.width))));
  }

  // The page itself, beside its assets, and the manifest of what it references.
  const page = join(SITE_SRC, "index.html");
  if (existsSync(page)) {
    const html = readFileSync(page, "utf8");
    // The Artifact wraps the page in its own <!doctype html> skeleton; the local copy gets one too,
    // so it lays out in standards mode like the published page (not quirks mode).
    files.push(write(join(SITE_OUT, "index.html"), `<!doctype html>\n${html}`));
    const refs = new Set<string>();
    for (const m of html.matchAll(/(?:src|href|poster)="(assets\/[^"]+)"/g)) refs.add(m[1]!);
    const manifest: Record<string, string> = {};
    for (const ref of [...refs].sort()) {
      const local = join(SITE_OUT, ref);
      if (!existsSync(local)) throw new Error(`index.html references ${ref}, which was not built`);
      manifest[ref] = local;
    }
    const total = Object.values(manifest).reduce((sum, f) => sum + statSync(f).size, 0) + Buffer.byteLength(html);
    // Kept beside index.html (not under store/out, so not in the kit's MANIFEST.txt).
    write(join(SITE_SRC, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(`${Object.keys(manifest).length} files referenced by the page, ${(total / 1048576).toFixed(1)} MB with the page`);
  } else {
    console.warn(`${page} not found: no manifest written`);
  }
  return files;
}

// ---------------------------------------------------------------- the press kit

/** Assemble store/out/presskit; returns the files written. */
export async function buildPressKit(): Promise<string[]> {
  registerFonts();
  mkdirSync(PRESSKIT_OUT, { recursive: true });
  const files: string[] = [];
  const copy = (src: string, dest: string): void => {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`${dest}  (copy)`);
    files.push(dest);
  };

  copy(APP_ICON, join(PRESSKIT_OUT, "sway-tower-icon-1024.png"));
  files.push(write(join(PRESSKIT_OUT, "sway-tower-logo.png"), logo(2400).toBuffer("image/png")));
  files.push(write(join(PRESSKIT_OUT, "sway-tower-medals.png"), medals(300).toBuffer("image/png")));

  // The App Store screenshots (with their caption bands) and the same moments clean, at the 6.9" size.
  const shotsDir = join(OUT, "screenshots", SHOT.id);
  for (const slug of BEST_SHOTS) {
    const src = join(shotsDir, `${slug}.png`);
    need(src, "npm run store -- --only screenshots");
    copy(src, join(PRESSKIT_OUT, "screenshots", `${slug}.png`));
  }
  for (const c of CLEAN_SHOTS) files.push(write(join(PRESSKIT_OUT, "screenshots-clean", `${c.slug}.png`), opaquePng(shot(c.moment(), SHOT.scale))));
  // The seasons grid without its band, for a "nine worlds" picture.
  {
    const { canvas, ctx } = cssCanvas(CSS_W, CSS_H, SHOT.scale);
    drawSkinGrid(ctx, CSS_W, CSS_H, SHOT.scale, seasonTiles(), 2);
    files.push(write(join(PRESSKIT_OUT, "screenshots-clean", "05-seasons.png"), opaquePng(canvas)));
  }
  // Every world, full size.
  for (const w of WORLDS) files.push(write(join(PRESSKIT_OUT, "worlds", `${w.id}.png`), opaquePng(shot(world(w), SHOT.scale))));

  // The trailer: the App Store preview as encoded, and the web cut if the site has been built.
  need(PREVIEW, "npm run store -- --only video");
  copy(PREVIEW, join(PRESSKIT_OUT, "sway-tower-trailer-886x1920.mp4"));
  const web = join(SITE_OUT, "assets", "trailer.mp4");
  if (existsSync(web)) copy(web, join(PRESSKIT_OUT, "sway-tower-trailer-web-720x1560.mp4"));

  copy(resolve(SITE_SRC, "../presskit/FACTS.md"), join(PRESSKIT_OUT, "FACTS.md"));
  return files;
}

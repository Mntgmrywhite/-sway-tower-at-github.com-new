import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { roundRectPath } from "../../src/base/draw";
import { dom } from "./lib/draw";
import { registerFonts } from "./lib/fonts";
import { APP_ICON, OUT } from "./lib/paths";
import { opaquePng } from "./lib/png";

// Checks the App Store icon the Xcode project ships against App Store Connect's rules (a
// 1024 x 1024 PNG or JPEG, no alpha channel or transparency, no rounded corners: iOS masks the
// corners itself) and draws it at the home screen's 180, 120 and 60 px on light and dark
// backgrounds, with iOS's corner mask, to look at. It reports; it never redraws the icon
// (npm run ios:art does that).

/** iOS's icon corner radius, as a fraction of the icon's side (the continuous-corner squircle, near enough). */
const CORNER = 0.2237;

export interface IconReport {
  file: string;
  width: number;
  height: number;
  /** The PNG's color type (2: RGB, 6: RGBA) and whether any pixel is not fully opaque. */
  colorType: number;
  hasAlphaChannel: boolean;
  transparentPixels: number;
  /** The corners are painted like the art next to them (no baked rounded corners). */
  cornersPainted: boolean;
  ok: boolean;
  notes: string[];
}

function pngColorType(png: Buffer): number {
  // IHDR: 8-byte signature, 4 length, 4 "IHDR", 4 width, 4 height, 1 depth, 1 color type.
  if (png.length < 26 || png.toString("ascii", 12, 16) !== "IHDR") return -1;
  return png[25]!;
}

export async function checkIcon(): Promise<IconReport> {
  registerFonts();
  const dir = join(OUT, "icon");
  mkdirSync(dir, { recursive: true });
  const png = readFileSync(APP_ICON);
  const image = await loadImage(png);
  const w = image.width;
  const h = image.height;
  const colorType = pngColorType(png);
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  const notes: string[] = [];

  // Every pixel opaque, and the corners painted (compare each corner pixel with one a little inside).
  const probe = createCanvas(w, h);
  const pctx = probe.getContext("2d");
  pctx.drawImage(image, 0, 0);
  const data = pctx.getImageData(0, 0, w, h).data;
  let transparentPixels = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) transparentPixels++;
  const px = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!] as const;
  };
  const close = (a: readonly [number, number, number], b: readonly [number, number, number]) => a.every((v, k) => Math.abs(v - b[k]!) < 48);
  const inset = Math.round(w * 0.06);
  const corners: [number, number][] = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  const cornersPainted = corners.every(([x, y]) => close(px(x, y), px(x < w / 2 ? inset : w - 1 - inset, y < h / 2 ? inset : h - 1 - inset)));

  if (w !== 1024 || h !== 1024) notes.push(`size is ${w}x${h}, not 1024x1024`);
  if (hasAlphaChannel) notes.push(`the PNG has an alpha channel (color type ${colorType}); App Store Connect rejects it`);
  if (transparentPixels > 0) notes.push(`${transparentPixels} pixels are not fully opaque`);
  if (!cornersPainted) notes.push("the corners differ from the art beside them: rounded corners may be baked in (iOS masks the corners itself)");
  const ok = notes.length === 0;

  // The home-screen sizes with iOS's mask, on light and dark.
  const sizes = [180, 120, 60];
  const pad = 36;
  const cell = 180 + pad;
  const sheetW = pad + sizes.length * cell;
  const rowH = 180 + pad * 2 + 24;
  const sheet = createCanvas(sheetW, rowH * 2);
  const ctx = sheet.getContext("2d");
  const backgrounds: [string, string][] = [
    ["#f2f2f7", "#1c1c1e"],
    ["#000000", "#e5e5ea"],
  ];
  backgrounds.forEach(([bg, fg], row) => {
    const y0 = row * rowH;
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, sheetW, rowH);
    sizes.forEach((size, i) => {
      const x = pad + i * cell + (180 - size) / 2;
      const y = y0 + pad + (180 - size) / 2;
      ctx.save();
      roundRectPath(dom(ctx), x, y, size, size, size * CORNER);
      ctx.clip();
      ctx.drawImage(image, x, y, size, size);
      ctx.restore();
      ctx.fillStyle = fg;
      ctx.font = "600 15px Fredoka";
      ctx.textAlign = "center";
      ctx.fillText(`${size} px`, pad + i * cell + 90, y0 + pad + 180 + 30);
    });
  });
  const sheetFile = join(dir, "icon-sizes.png");
  writeFileSync(sheetFile, opaquePng(sheet));

  const report: IconReport = { file: APP_ICON, width: w, height: h, colorType, hasAlphaChannel, transparentPixels, cornersPainted, ok, notes };
  const md = [
    "# App Store icon check",
    "",
    `File: \`${APP_ICON}\` (the asset catalog's 1024 x 1024 App Store icon; App Store Connect takes it from the uploaded build, nothing to upload by hand).`,
    "",
    `- Size: ${w} x ${h} ${w === 1024 && h === 1024 ? "(as required)" : "(must be 1024 x 1024)"}`,
    `- Alpha channel: ${hasAlphaChannel ? "YES (not allowed)" : `none (PNG color type ${colorType}, 8-bit RGB)`}`,
    `- Transparent pixels: ${transparentPixels}`,
    `- Corners: ${cornersPainted ? "painted to the edge (iOS applies its own rounded mask)" : "look masked: do not bake rounded corners in"}`,
    "",
    ok ? "Result: OK — meets App Store Connect's icon rules." : `Result: NOT OK — ${notes.join("; ")}.`,
    "",
    `Rendered at 180, 120 and 60 px with iOS's corner mask on light and dark: \`${sheetFile}\`.`,
    "",
  ].join("\n");
  writeFileSync(join(dir, "icon-report.md"), md);
  console.log(`${sheetFile}\n${join(dir, "icon-report.md")}  ${ok ? "OK" : "NOT OK: " + notes.join("; ")}`);
  return report;
}

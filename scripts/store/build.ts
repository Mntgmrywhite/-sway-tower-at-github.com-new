import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PREVIEW_DEVICES, SCREENSHOT_DEVICES } from "./lib/devices";
import { OUT } from "./lib/paths";
import { checkIcon } from "./icon";
import { buildScreenshots } from "./screenshots";
import { buildPressKit, buildSite } from "./site";
import { buildVideo } from "./video";

// Regenerates the App Store kit's assets under store/out (deterministic renders of the game):
//   npm run store                       everything: screenshots, the preview videos, the icon check,
//                                       the landing page's assets and the press kit
//   npm run store -- --only screenshots,icon
//   npm run store -- --only site        the page's assets + MANIFEST.json (from the screenshots and preview already built)
//   npm run store -- --only presskit    store/out/presskit
//   npm run store -- --skip-trailer     with site: leave the trailer's web cut as it is
//   npm run store -- --device iphone-6.9,ipad-13
//   npm run store -- --keep-frames      keep the preview's PNG frames beside the video
//   npm run store -- --skip-encode      render the preview's frames only (no Swift)
// See store/README.md for what each file is and where it goes.

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const only = new Set((option("--only") ?? "screenshots,video,icon,site,presskit").split(","));
const deviceIds = option("--device")?.split(",");
const pick = <T extends { id: string }>(all: readonly T[]) => (deviceIds ? all.filter((d) => deviceIds.includes(d.id)) : all);
const keepFrames = args.includes("--keep-frames");
const skipEncode = args.includes("--skip-encode");
const skipTrailer = args.includes("--skip-trailer");

mkdirSync(OUT, { recursive: true });
const written: string[] = [];
const started = Date.now();
if (only.has("screenshots")) written.push(...buildScreenshots(pick(SCREENSHOT_DEVICES)));
if (only.has("icon")) {
  const r = await checkIcon();
  written.push(join(OUT, "icon/icon-sizes.png"), join(OUT, "icon/icon-report.md"));
  if (!r.ok) process.exitCode = 1;
}
if (only.has("video")) written.push(...(await buildVideo({ devices: pick(PREVIEW_DEVICES), keepFrames, skipEncode })));
if (only.has("site")) written.push(...(await buildSite({ skipTrailer })));
if (only.has("presskit")) written.push(...(await buildPressKit()));
// The manifest lists every file a run has written and that still exists, so partial runs (--only, --device) add to it.
const manifest = join(OUT, "MANIFEST.txt");
const kept = existsSync(manifest) ? readFileSync(manifest, "utf8").split("\n").filter((f) => f && existsSync(join(OUT, f))) : [];
const listed = [...new Set([...kept, ...written.map((f) => f.slice(OUT.length + 1))])].sort();
writeFileSync(manifest, listed.join("\n") + "\n");
console.log(`${written.length} files under ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)} s`);

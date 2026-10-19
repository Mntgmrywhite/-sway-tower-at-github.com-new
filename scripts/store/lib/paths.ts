import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The project root (this file is scripts/store/lib/paths.ts). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
/** Everything `npm run store` generates goes here (gitignored). */
export const OUT = resolve(ROOT, "store/out");
/** The App Store icon as the Xcode project ships it. */
export const APP_ICON = resolve(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
/** The Classic song (an AAC loop): the app preview's soundtrack. */
export const CLASSIC_SONG = resolve(ROOT, "src/audio/music/classic.mp4");

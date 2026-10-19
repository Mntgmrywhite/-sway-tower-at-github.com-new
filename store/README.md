# App Store kit

Everything for Sway Tower's App Store listing, made from the game's own renderer so it matches
the app pixel for pixel. The copy and docs live here; the generated assets go under
`store/out/` (gitignored) and come back identical from:

```
npm run store                        # screenshots, app previews, icon check, the landing page's assets, the press kit (about 6 minutes: 30 s of screenshots, 2.5 min a video)
npm run store -- --only screenshots  # or video, icon, site, presskit (comma-separated; site and presskit need the screenshots and preview)
npm run store -- --skip-trailer      # with site: keep the trailer's web cut as it is (the Swift transcode is the slow part)
npm run store -- --device iphone-6.9 # one display size (ids below)
npm run store -- --keep-frames       # keep the preview's PNG frames beside the video
npm run store -- --skip-encode       # render the preview's frames only (no Swift)
```

`scripts/store/build.ts` drives it; the renders are deterministic (bots play `src/game.ts`
frame by frame, no clock, no randomness), so a rerun after a visual change refreshes the whole
kit. The preview's H.264 bytes can differ run to run (the encoder's choice); the frames don't.
Needs Node (`~/.local/node`) and, for the videos, Xcode's command line tools (`swiftc`); nothing
else is installed.

## What is where

| Path | What | Upload to |
| --- | --- | --- |
| `LISTING.md` | Name, subtitle, promotional text, description, keywords, what's new, category, age rating answers, privacy labels, URLs, copyright, Game Center ids, App Review notes | App Store Connect › App Information / the version page / App Privacy |
| `NOMINATION.md` | The featuring nomination text | App Store Connect › Featuring › Nominate your app |
| `out/screenshots/iphone-6.9/01…10-*.png` | 1320 × 2868, iPhone with Dynamic Island (large display): 6.9" and 6.7" | Version page › iPhone 6.9" Display (optional; scaled from 6.5" if absent) |
| `out/screenshots/iphone-6.1/01…10-*.png` | 1206 × 2622, iPhone with Dynamic Island (medium display): 6.3" and 6.1" | Version page › iPhone 6.3"/6.1" Display (**required**) |
| `out/screenshots/iphone-6.5/01…10-*.png` | 1284 × 2778, iPhone with Face ID (large display): 6.5" | Version page › iPhone 6.5" Display (required only if the 6.9" set is not uploaded) |
| `out/screenshots/ipad-13/01…10-*.png` | 2064 × 2752, iPad 13" (also serves 12.9" and 11") | Version page › iPad 13" Display (**required**, the app runs on iPad) |
| `out/screenshots/contact-<device>.png` | The ten at thumbnail size, to check the set reads at search-result size | (review only) |
| `out/preview/iphone/sway-tower-preview-886x1920.mp4` | 25.4 s app preview, portrait, H.264 High 4.0 at about 11 Mbps (the encoder is asked for 13.5 and undershoots flat art; Apple's target is 10–12), 30 fps, stereo AAC 256 kbps at 48 kHz | Version page › App Preview for every iPhone display size (6.9", 6.5", 6.3", 6.1", 5.8"; Apple accepts 886 × 1920 for all of them) |
| `out/preview/ipad-13/sway-tower-preview-1200x1600.mp4` | The same preview at the iPad size | Version page › App Preview for iPad 13" (and 12.9", 11") |
| `out/preview/<device>/check/at-*.png` | Frames read back out of the encoded file (AVAssetImageGenerator), to look at | (review only) |
| `out/icon/icon-report.md`, `out/icon/icon-sizes.png` | The App Store icon checked against the rules, and drawn at 180/120/60 px on light and dark with iOS's corner mask | (nothing: App Store Connect takes the 1024 icon from the build's asset catalog) |
| `out/site/` | The landing page (`site/index.html` copied beside its assets) and `assets/`: icon, wordmark, hero, the trailer's web cut (720 × 1560, about 8.5 MB) and poster, the "how it plays" crops, the medals, the nine worlds, six App Store shots, all 660 px wide WebP | Published as the claude.ai Artifact with `site/MANIFEST.json` (see `site/README.md`) |
| `out/presskit/` | The press kit: icon (1024, no alpha), wordmark (2400 px, transparent), medals, six App Store screenshots with and without captions, every world in play, the trailer (the preview and the web cut), `FACTS.md` | Zip and send; `FACTS.md` has the text |
| `out/MANIFEST.txt` | Every file a run has written that still exists (partial runs with `--only` / `--device` add to it) | |

Apple's current sizes (checked 2026-10-18, `scripts/store/lib/devices.ts`): screenshots are
required for the medium Dynamic Island iPhone and the 13" iPad; the large (6.9"/6.7") and
6.5" sets are optional and rendered so nothing is scaled. Up to ten screenshots and three
previews per display size, JPEG/PNG without alpha; previews 15–30 s, H.264 up to High Profile
Level 4.0, 30 fps, 10–12 Mbps, stereo AAC 256 kbps, 886 × 1920 (iPhone) and 1200 × 1600 (iPad).

## The screenshots

Ten per device, in App Store order, each a real render of the game at the device's CSS size
(e.g. 440 × 956 pt at 3× for 6.9") under one caption band: the Classic UI blue with the logo's
face (Luckiest Guy) in its yellow with an ink outline, and a Fredoka line beneath. The game's
own moments (`scripts/store/lib/moments.ts`):

1. **Build as high as you can** — a 35-bar tower in the clouds, a sloppy drop's overhang just sliced off.
2. **The tower sways** — 59 bars, sunset, the top swinging after a sloppy drop.
3. **PERFECT** — PERFECT ×3 popping over the gold-tinted bar, the seam flashing.
4. **Slide or Drop** — Drop mode: the bar let go from the raised lane, half way down.
5. **A new world every season** — six title scenes on the day sky (Halloween's Horseman on the moon, Thanksgiving, Christmas's carriage, New Year's midnight, St. Patrick's pot of gold, Cyberpunk's racer peeling out), so with 7 and 8 every one of the nine worlds is in the set.
6. **Count down to midnight** — New Year's a beat after midnight: MIDNIGHT on the screen, the finale's fireworks.
7. **Ride the Synthwave** — the chrome car's burnout outside the arcade (13.5 s into the scene); its line says electro, since the neon songs are our own synths, not real instruments.
8. **Blast off in Toy Kingdom** — the rocket clear of its tower (13.2 s).
9. **Climb into the night** — Sky Islands at 104 bars: stars, lanterns, the aurora.
10. **Every run ends with a bang** — the game-over blast.

The caption band takes the top 15 % of the image; the game is laid out at the device's width
and the remaining height, so its size unit `u` is the device's own and the HUD sits where it
does in the app. On the iPad the play area is letterboxed exactly as in the app. Stills of a
skin's opening put the slider over the tower (`showSlider`): it runs `SLIDE_RANGE` past a phone's
edges, and a bar caught half off-screen reads as a cropping mistake.

## The app preview

`scripts/store/video.ts` renders 25 s at 30 fps (two 60 Hz game steps a frame, bots that tap
where the slider passes the target) and `scripts/store/encode.swift` (AVFoundation) encodes it:

| Time | Scene |
| --- | --- |
| 0–2 s | Logo card: the title screen (Sky Islands, the logo, Slide / Drop, PLAY, Skins / Medals / Sound) |
| 2–5.6 s | A fresh run: the name, "tap to drop", the first bars, two perfect, one sliced |
| 5.6–9.2 s | A run of perfects: PERFECT ×2 … ×5 |
| 9.2–12.4 s | 66 bars at sunset, sloppy drops kicking the sway |
| 12.4–14.3 s | New Year's: the last second, MIDNIGHT, the fireworks finale |
| 14.3–16.2 s | Synthwave: the car's burnout and peel-out |
| 16.2–18.1 s | Halloween: the Headless Horseman past the harvest moon |
| 18.1–20.7 s | Drop mode: bars let go onto the swaying top |
| 20.7–23.1 s | The last life: the top of the tower goes over and blows up; the Game Over card |
| 23.1–25.4 s | End card: the icon, Sway Tower, "Build as high as you can" |

Soundtrack: the Classic song (`src/audio/music/classic.mp4`, the 6/8 waltz) from its start,
faded in over 0.4 s and out over the last 2 s. Apple's default poster frame is at 5 s (the first
run, a bar landing); pick another in App Store Connect if wanted.

If `swiftc` is missing, `npm run store -- --only video --keep-frames --skip-encode` leaves the
numbered frames in `out/preview/<device>/frames/`; with ffmpeg elsewhere:
`ffmpeg -framerate 30 -i %06d.png -i ../../../../src/audio/music/classic.mp4 -c:v libx264 -profile:v high -level 4.0 -b:v 11M -pix_fmt yuv420p -c:a aac -b:a 256k -shortest out.mp4`.

## The landing page and the press kit

`site/index.html` (+ `site/README.md`, `site/MANIFEST.json`) is the landing page: the Artifact
the marketing, support and privacy URLs in `LISTING.md` point at. `presskit/FACTS.md` is the
press kit's text; `npm run store -- --only presskit` assembles the kit under `out/presskit/`.

## Uploading

1. App Store Connect › My Apps › Sway Tower › the 1.0 version page.
2. Under **App Previews and Screenshots**, pick each display size and drag its ten PNGs in order
   (the file names sort right), then the preview video for that size. Set the video's poster
   frame. For iPad, the 13" size.
3. Fill **Promotional Text**, **Description**, **Keywords**, **Support URL**, **Marketing URL**
   and **What's New** from `LISTING.md`; **Copyright**, **Category** and **Age Rating** are under
   App Information; **App Privacy** gets "Data Not Collected".
4. Featuring › Nominate from `NOMINATION.md`, at least a few weeks before each date in its table.

## Files

```
scripts/store/build.ts        npm run store
scripts/store/screenshots.ts  the ten shots and contact sheets
scripts/store/video.ts        the preview's storyboard, frames and encoding
scripts/store/encode.swift    AVFoundation encoder (frames + song → H.264/AAC .mp4, reads frames back)
scripts/store/icon.ts         the icon check
scripts/store/site.ts         the landing page's assets (store/out/site, store/site/MANIFEST.json) and the press kit (store/out/presskit)
scripts/store/transcode.swift AVFoundation re-encoder (the preview → the web trailer: scaled, fast-start, a lower bit rate, a poster frame)
scripts/store/lib/devices.ts  Apple's sizes
scripts/store/lib/fonts.ts    the real faces, registered from node_modules/@fontsource (+ a system face for ★)
scripts/store/lib/sim.ts      deterministic play (taps, landings, the topple clock, target and miss players)
scripts/store/lib/moments.ts  the moments shown, by skin and scene time
scripts/store/lib/draw.ts     the caption band, the title's controls, the skin grid, the cards
scripts/store/lib/png.ts      opaque PNG writer (no alpha, as Apple requires)
```

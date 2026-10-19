# Landing page

`index.html` is Sway Tower's landing page and press page, published as a claude.ai Artifact
(the page runs in the Artifact viewer's frame: no libraries, Google Fonts only, every asset a
relative file beside it). Its assets are rendered from the game by `npm run store -- --only site`
(`scripts/store/site.ts`) into `store/out/site/assets/`, with a copy of `index.html` next to them
so the page opens locally from `store/out/site/index.html` (the fonts still come from Google).

`MANIFEST.json` (written by that run) maps every path the page references to the file on disk:

```json
{ "assets/hero.webp": "/…/store/out/site/assets/hero.webp", … }
```

Publish `index.html` with those files at those paths. The page is 37 kB; the files are 9.6 MB
together, almost all of it the trailer (`assets/trailer.mp4`, 8.5 MB: the App Store preview cut to
720 × 1560 at about 2.6 Mbps by `scripts/store/transcode.swift`). Everything else is a 660 px wide
WebP or a transparent PNG.

Sections: hero (icon, wordmark, the line, the tower swinging at sunset), the trailer with a
clickable list of its beats, How it plays (four crops of real moments and the medals), A world
for every season (the nine worlds in play, with their dates), Original music on real instruments
(one line per song, as CLAUDE.md states the references), Play it in your browser (the Artifact
link; "Coming to the App Store" as a plain label until there is a badge), Press kit (the facts,
the art, six App Store screenshots, where the kit's files are), Support and Privacy (`#support`,
`#privacy`: the URLs LISTING.md uses) and the footer.

Design: the game's own look. Luckiest Guy and Fredoka (the game's faces), the Sky Islands palette
(the day sky, cloud white, the UI blue, the logo yellow, the plum ink), the title screen's cartoon
boxes (ink outline, light top, shaded bottom, hard drop shadow), the cloud bank under the hero.
Dark mode is the game's night: the same page under the night sky. One column of full-width
bands; phone-first (the worlds become image-left cards under 560 px); the hero's phone sways
unless the viewer prefers reduced motion.

To change a world's shot, the crops or the trailer's size and bit rate, edit `WORLDS`,
`PLAY_CROPS`/`CROP` and `TRAILER` in `scripts/store/site.ts`. The copy lives in `index.html`.

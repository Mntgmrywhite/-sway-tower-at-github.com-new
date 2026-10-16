# Sway Tower

One-tap stacker for the browser (later wrapped for iOS with Capacitor). A block slides back and forth; tap to drop it; overhang is sliced off. The twist: the tower sways more as it gets taller, so a good drop means timing both the slider and the sway.

The prototype exists to answer one question: **does sway make it more fun, or just more random?**

## Commands

Node lives in `~/.local/node` (user install). If `node` is not on PATH: `export PATH="$HOME/.local/node/bin:$PATH"`.

- `npm run dev` — dev server (with `--host`, so a phone on the same Wi-Fi can open the LAN URL)
- `npm run test` — Vitest, run once
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run check` — typecheck + lint + test; run before every commit
- `npm run build` — typecheck, then static bundle to `dist/`
- `npm run preview` — serve the built bundle
- `npm run snap -- <skinId>` — render a skin offscreen to `preview/<skin>-{start,climb,high,over,bars}.png` (fallback fonts; look at them with an image viewer). Use this to check visual work.
- `npm run build:artifact` — build, then inline everything into `dist/sway-tower.html` for publishing as the claude.ai Artifact (https://claude.ai/artifact/1iy2tocHgvV3jfE1CLE9v3); republish that file to keep the same link

## Stack

Vite + TypeScript (strict) + Canvas 2D. No framework, no physics engine, no runtime dependencies.

## Architecture

- `src/game.ts` — pure game logic: state, `step(state, dt)`, `drop(state)`. No DOM, no canvas, no randomness, no `Date.now()`. Everything deterministic so it can be unit-tested and driven by a bot.
- `src/config.ts` — every tunable number lives here. Fixed values are `const`s; playtest knobs live in the mutable `tuning` object (defaults in `DEFAULT_TUNING`). Logic must read `tuning.*` at call time, never cache it. No magic numbers in logic or rendering.
- `src/panel.ts` — on-screen tuning panel (⚙ top-right). Edits `tuning` live, persists to localStorage, pauses the game while open.
- **Two styles + skins.** The default look is bright **2D cartoon** (reference: a Flappy-Bird-like night scene: periwinkle sky, faded distant silhouettes, puffy cel-shaded teal clouds piled at the sides, ink-outlined objects up close, grass lip over stone tiles). The pure **Neon** look (Far Cry Blood Dragon: grid floor, striped sun, glowing bars, scanlines) is kept as its own style — never delete it. Skins pick a style; holiday skins are cartoon.
  - `src/base/draw.ts` — shared helpers: `outlined` (fill + ink outline: the standard cartoon look), `ink`, `inkedLine` (bones, branches), `outlinedText`, `mix`/`alpha`, `circle`/`oval` (each starts its own subpath — never put several arcs in one path without them, or the canvas joins them with stray lines), `roundRectPath`, `hash`, `emerge`. The `neon*` helpers are for the Neon style only.
  - `src/base/world.ts` + `blocks.ts` — cartoon world (sky + stars, moon, faded skyline, cloud bank, height clouds, mown field from `horizonY`, grass-and-tiles foreground) and the cartoon bar (chunky toy block: bevels on all sides, ink outline, inked symbols — never a capsule). Exports `layerGround`, `fieldY(scene, z)` (z = `TOWER_DEPTH` is the tower's line), `altitude01`, `puffs`, `moon`.
  - `src/base/neon-world.ts` + `neon-blocks.ts` — the Neon style's world and bars.
  - `src/base/style.ts` — `kitFor(skin)`: the one place that maps a skin's style to its world, bars, HUD text, lives and game-over card. The renderer never branches on style.
  - `src/skins/skin.ts` — `Skin = CartoonSkin | NeonSkin` (discriminated by `style`). Cartoon palette: sky stops, star, moon, cloud shadow/base/light, far, field far/near, grass/grassDark, stone/stoneLight, ink. HUD: display font, title, ui, accent, life. Optional layers: `celestial`, `sky`, `far` (faded silhouettes standing on `horizonY`, behind the cloud bank), `ground` (props on the field), `foreground` (after the base tiles). `fonts` (Google Fonts, loaded on demand), `dates` for auto-pick.
  - `src/skins/index.ts` — registry (Classic first = fallback, then Neon, then holidays), `skinForDate`, `resolveSkin`. `tuning.skin` is "auto" or an id; Options button (top-left) and the ⚙ panel both pick it.
  - `src/skins/<id>.ts` (+ optional `src/skins/<id>/` folder) — `classic` (default cartoon), `neon`, `halloween`, `thanksgiving`, `christmas`, `newyear`. `src/skins/glyphs.ts` — geometric symbols shared by Classic and Neon.
  - `src/preview/shots.ts` — deterministic game moments shared by `npm run snap` and the render smoke test.
- **Cartoon art rules:** bright, saturated, high-contrast — readability first (the user found heavy neon impossible to see). Near things: flat fills, a light top / shaded bottom, ink outline (palette.ink). Far things: faded flat silhouettes, no outline. No glow-heavy effects, no dark muddy scenes. Bright flashes are for feedback moments (perfect drops), not the scenery.
- `src/render.ts` — draws a state to a canvas via the active theme. Cosmetic-only effects (falling sliced pieces, camera easing) live here, never in logic.
- `src/main.ts` — wiring: canvas sizing, input, RAF loop, best score.
- Tests sit next to code as `*.test.ts`. The bot test proves the game is beatable with perfect timing.

## Identity

- Name: **Sway Tower**. Sway is the hook and the reason the game exists; keep it front and center.
- Stay clearly distinct from Ketchapp's *Stack*: no isometric 3D blocks, no pastel gradient backgrounds, no thin minimal score font, and don't lean on "stack" in the name. Bright, flashy, high-contrast visuals (neon is the current base).

## Rules

- World units, not pixels: playfield is `WORLD_WIDTH` wide; the renderer scales to the screen.
- Sway must affect overlap in **world (screen) space**. The slider must not ride the swaying tower, or sway is cosmetic.
- Input is `pointerdown` (+ Space for desktop). No click delay, no scroll/zoom.
- `localStorage` access is wrapped in try/catch.
- Build in thin slices; one commit per working slice, with `npm run check` passing.

## Game rules (decided)

- Sway = base wave scaled by height (perfect drops add no energy, but taller towers move more at the top) + a damped-spring "kick".
- A sloppy drop kicks the tower toward the overhang side, proportional to the overhang; the sway calms after the chop. Kicks change velocity only, never position, so the tower never jumps.
- **Balance (lean, teeter, topple).** Every bar is weight: an off-center drop moves the top's center off the base's (`drift`), and the tower leans that way (`lean` eases to `leanGain * kickBend * drift`; the top `LEAN_SPAN` levels tilt for real via `leanShape`, so overlap is never visually misleading) and sways harder. `forecast` (an undamped bound on where the top will reach) vs `toppleLimit` (lower for narrow tops) gives the states STEADY / WOBBLY (>= 0.6) / DANGER (>= 0.85) / TEETER / LAST CHANCE. A sloppy drop that worsens the imbalance while WOBBLY **arms** the tower; an armed tower whose top stays past the rail for `teeterTime` (in slow motion) **topples** — game over regardless of lives. A tower that was steady when you dropped never falls from that one drop: past the rail it hangs in LAST CHANCE (3 s), and the next placed drop decides. Counterweights (drops on the light side) straighten it at once; perfects always disarm. Cut pieces fall visibly and tumble (cosmetic, renderer-only).
- Kick damping is capped at critical (an overdamped spring settles slower, so higher "decay" past that would feel worse).
- A perfect drop calms the tower: sway (base and kick) scales by `1 - perfectCalm * calm`, where `calm` eases to 1 for `CALM_TIME` then back to 0. Smooth, so no jumps. Shown with a seam flash and a gold tint on the block.
- Every slice is pushed onto `cuts`. **Perfects steady first, rebuild once calm:** a perfect on a swinging tower STEADIES it (instant brace on the swing velocity, damping toward critical while calm) and banks a rebuild; a perfect on a calm tower REBUILDS — it wins back cuts (plus everything banked) choosing the cut that pulls the top home, so a run of perfects still rebuilds a sliver to the exact original bar. Misses are not slices.
- **Gusts:** windy bands (levels 12–19, 28–35, …) send gusts ~every 3–5 blocks: 1.2 s of telegraph, then a 1.6 s push into the lean (never into the kick spring). Direction comes from the run's seed, never aimed at the lean. A balanced tower shrugs them off; a leaning one may not. A gust never starts on a tower in danger.
- With every balance switch off (`leanOn`, `toppleOn`, `gustsOn`, `regrowNeedsCalm`) and `perfectSteady = perfectBrace = 0`, the game is bit-identical to the pre-balance rules (`src/testing/shipped-game.ts`, A/B-tested in `sway.test.ts`). `src/game.ts` may not use `Math.random`/`Date.now` (lint rule); the seed comes in through `newGame(seed)`.
- A miss does not end the game: it costs one of `LIVES` (3); game over at 0.

## Skin requirements from playtesting (decided)

- All skins: no prop may be cut off — not by the foreground band, not by the screen edges, not by another prop. Keep props fully on screen (or let them leave the view only by parallax as the camera climbs), and space them so they don't cut into each other. The only allowed clip is a body part emerging from the soil, and that edge must be hidden behind its dirt mound.
- Halloween graveyard: skeleton parts pop out **at random**. Each grave spot re-picks which part comes up (hand, skull, or feet) every cycle, and spots run on staggered, varying timings, so no two spots show the same part in lockstep and no spot always shows the same part. Deterministic from `scene.t` + `hash()` (cycle index × spot), never `Math.random()`.
- Halloween: no zombies, no ghosts in the sky, tombstones planted (base sunk into a mound), the mansion sits on its ground line, the jack-o'-lantern stands behind the tower, faces drawn with `circle`/`oval` so features never join.

## Build order

1. Scaffold — done
2. Plain stacker (no sway): slide, drop, slice, score, game over, restart; tests + bot — done
3. Sway: world-space overlap, height-scaled sway, overhang kicks, lives — done
4. Tuning panel: sway on/off, base sway, period, kick strength, kick decay, slider speed — done → **playtest checkpoint**
5. Feel: perfect-drop snap + streak, falling pieces, sound, haptics
6. Mobile polish: orientation, best score persistence
7. Later: Capacitor iOS wrap (needs Xcode + Apple Developer account)

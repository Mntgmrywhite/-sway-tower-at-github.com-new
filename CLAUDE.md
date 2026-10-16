# Sway Stack

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
- `npm run build:artifact` — build, then inline everything into `dist/sway-stack.html` for publishing as the claude.ai Artifact (https://claude.ai/artifact/1iy2tocHgvV3jfE1CLE9v3); republish that file to keep the same link

## Stack

Vite + TypeScript (strict) + Canvas 2D. No framework, no physics engine, no runtime dependencies.

## Architecture

- `src/game.ts` — pure game logic: state, `step(state, dt)`, `drop(state)`. No DOM, no canvas, no randomness, no `Date.now()`. Everything deterministic so it can be unit-tested and driven by a bot.
- `src/config.ts` — every tunable number lives here. Fixed values are `const`s; playtest knobs live in the mutable `tuning` object (defaults in `DEFAULT_TUNING`). Logic must read `tuning.*` at call time, never cache it. No magic numbers in logic or rendering.
- `src/panel.ts` — on-screen tuning panel (⚙ top-right). Edits `tuning` live, persists to localStorage, pauses the game while open.
- `src/themes/` — visual themes (`classic`, `halloween`) behind a small `Theme` interface: background, optional foreground (drawn in front of the tower), block drawer, HUD colors. Purely cosmetic; switched by `tuning.halloween`.
  - `halloween.ts` — neon bars: dark tinted fill, glowing edge tube, bright end caps (edges must stay easy to read), a row of neon Halloween icons; 12 hues cycle so neighbors contrast.
  - `halloween-icons.ts` — stroke-built neon icons (pumpkin, witch hat, candy corn, ghost, bat, tombstone, mummy, moon, skull, fangs, spider, house).
  - `halloween-scene.ts` — parallax scenery: layer ground = `groundY - rise * (1 - p)`; far hills + mansion seated in the hill (p 0.12), dead trees (0.45), fog and clouds at fixed heights (0.6), graveyard with fence, weathered tombstones, jack-o'-lantern behind the tower, and skeleton parts (hands, a skull, feet) coming up out of the ground (1), grassy foreground rise (1.6). Witches and bats fly across the sky. Scenery objects get neon edges (`neonEdge` for simple shapes, `withGlow` for detailed silhouettes). Draw several circles in one path with `circle`/`oval` (each starts its own subpath), or the canvas joins them with stray lines. Sky darkens and stars come out with altitude.
- Camera: the ground starts at `GROUND_START` (70%) of the screen so the sky gets the room; the follow camera takes over once the tower is taller.
- HUD: title on the start screen (theme display font, Creepster for Halloween, loaded from Google Fonts), perfect counter appears after the first perfect, game-over card.
- `src/render.ts` — draws a state to a canvas via the active theme. Cosmetic-only effects (falling sliced pieces, camera easing) live here, never in logic.
- `src/main.ts` — wiring: canvas sizing, input, RAF loop, best score.
- Tests sit next to code as `*.test.ts`. The bot test proves the game is beatable with perfect timing.

## Rules

- World units, not pixels: playfield is `WORLD_WIDTH` wide; the renderer scales to the screen.
- Sway must affect overlap in **world (screen) space**. The slider must not ride the swaying tower, or sway is cosmetic.
- Input is `pointerdown` (+ Space for desktop). No click delay, no scroll/zoom.
- `localStorage` access is wrapped in try/catch.
- Build in thin slices; one commit per working slice, with `npm run check` passing.

## Game rules (decided)

- Sway = base wave scaled by height (perfect drops add no energy, but taller towers move more at the top) + a damped-spring "kick".
- A sloppy drop kicks the tower toward the overhang side, proportional to the overhang; the sway calms after the chop. Kicks change velocity only, never position, so the tower never jumps.
- Placed blocks never topple. Cut pieces fall visibly and tumble (cosmetic, renderer-only).
- Kick damping is capped at critical (an overdamped spring settles slower, so higher "decay" past that would feel worse).
- A perfect drop calms the tower: sway (base and kick) scales by `1 - perfectCalm * calm`, where `calm` eases to 1 for `CALM_TIME` then back to 0. Smooth, so no jumps. Shown with a seam flash and a gold tint on the block.
- A perfect drop wins back the most recent slice (`lastCut`), on the side it was cut from, once per slice. Misses are not slices.
- A miss does not end the game: it costs one of `LIVES` (3); game over at 0.

## Build order

1. Scaffold — done
2. Plain stacker (no sway): slide, drop, slice, score, game over, restart; tests + bot — done
3. Sway: world-space overlap, height-scaled sway, overhang kicks, lives — done
4. Tuning panel: sway on/off, base sway, period, kick strength, kick decay, slider speed — done → **playtest checkpoint**
5. Feel: perfect-drop snap + streak, falling pieces, sound, haptics
6. Mobile polish: orientation, best score persistence
7. Later: Capacitor iOS wrap (needs Xcode + Apple Developer account)

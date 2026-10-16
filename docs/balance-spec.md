# Balance mechanic spec: lean, teeter, topple

Sway Tower: Lean, Teeter, Topple. Final spec: lean from imbalance, gusts that push the lean, rebuild only once calm

> Status: the game logic below is implemented in `src/game.ts` (commit 495eeaa) and covered by
> `src/sway.test.ts` and `src/sim.test.ts`. The **Telegraphing** section is the renderer's to-do list.
> Produced by a judge panel (three designs, player and engineer judges, one synthesis with a
> working prototype).

## Pitch

Every bar you drop is weight. Land it off-center and the top of the tower moves off the base's center line, so the tower leans that way. The lean shows up the moment you drop (the lean target updates instantly) and eases fully in about a quarter second. The top 12 levels visibly tilt, and a dashed plumb line from the base shows what upright is. A leaning tower also sways harder, and the slice still kicks it into a swing.

Keep missing to the same side and the tilt gauge goes amber (WOBBLY). From then on, a sloppy drop to the heavy side arms the tower. If an armed tower's top reaches the red rail, it TEETERs in slow motion for 0.6 s and then topples: the slab above its weakest joint rotates off, bars peel away, and TOPPLED! slams in.

There are two ways back. You can drop a counterweight on the light side, which costs width but straightens the tower at once. Or you can land PERFECTs. A perfect on a swinging tower STEADIES it: it catches the swing, banks a rebuild and always disarms the tower. A perfect on a calm tower REBUILDS: it wins lost length back on the edge that pulls the top home and pays out every banked rebuild together.

The rule is simple. A tower that was steady when you dropped never falls from that one drop. It hangs at the rail in LAST CHANCE with a 3-second countdown, and your next placed drop decides it. Rail-scrapes you recover from pop SAVED!.

Windy bands (levels 12–19, 28–35, and so on) send telegraphed gusts that lean the tower for a moment. A balanced tower shrugs them off; for a tower already leaning they can be the last straw.

Stack's tower is a rigid slab: it asks "did it overlap?", and a streak always regrows. Sway Tower also asks "is it balanced, and is it calm?" That gives a reason to aim for balance, a reward that depends on calm instead of streaks, and a dramatic game-over the player caused and saw coming. The name is already "Sway Tower" (GAME_NAME and CLAUDE.md), and the visuals stay bright and flashy through the existing style kit (cartoon default plus neon): no isometric blocks, no pastels, no thin score font.

## Model


Files:
- config.ts and game.ts: drop-in replacements for the repo's files.
- game.test.ts: the repo's suite with a one-line edit.
- sway.test.ts: 38 new tests.
- bots.ts: test bots.
- sim.test.ts: population sims.
- shipped.ts: a frozen copy of the current game.ts, used by the A/B test.

Results: tsc --strict is clean and 74/74 tests pass in about 3 s. The 36 existing tests pass, including both bots; one of them needs a one-line edit.

## 0. Decisions

The base is the judges' convergent graft, not any single design. Both graft lists asked for a geometric rest point from drift, an O(1) undamped forecast, feel's fixed LAST CHANCE with a teeter that drains, physics' steady damping, banked rebuild and integer hash, feel's wind bands and danger hold-off, and minimal's discipline: change only velocities or eased values, keep Phase unchanged, the kick cap trims velocity only, and with everything off the game equals the shipped one.

Disagreements resolved:

(a) Lean source: geometric drift (feel/physics), not minimal's path-dependent accumulator. Counterweights now straighten the tower instantly.

(b) Lean shape: physics' leanShape lives in logic, so the top 12 levels tilt and no renderer slant is needed. The renderer never draws blocks off their logic positions.

(c) Gusts push the LEAN, not the kick spring. This departs from all three designs, for a measured reason. With a sin² push into the underdamped spring (ζ = 0.25), every additive O(1) bound ran about 2× the real peak mid-gust. The gust-in-spring prototype showed a forecast of 0.59 (one hundredth from WOBBLY) on a perfectly balanced tower, and block lengths from 1.6 s to 3.6 s did not help. A first-order lag provably stays inside the hull of its goals, so the bound becomes exact: forecast 0.27 against a true peak of 0.23. It is also the owner's "lighter version of the same idea".

(d) Calm keeps scaling the kick term as shipped (the CLAUDE.md rule is unchanged), but never the lean, and arming and the forecast use undamped values. This fixes minimal's blind arming and keeps the A/B bit-exact.

(e) No 'toppling' Phase and no newGame signature break. newGame(seed = 0) has an optional seed. A topple is phase 'over' with toppled set, and the fall is renderer-only.

(f) kickPerUnit stays at 1.2, so no localStorage migration is needed.

(g) Rebuild uses feel's 'newest cut on the side that pulls the top home'. It keeps the cuts stack and the exact-bar property, and the existing tests keep passing. Physics' split-toward-plumb was not used.

(h) Gust schedule: by placed blocks (minimal/physics), started in step() with feel's hold-off and bands.

## 1. Notation

- omega = 2π/tuning.swayPeriod.
- kb(l) = min(1, l/SWAY_KICK_FULL_LEVEL = 8). Extract it from swayOffset as exported kickBend.
- damp = 1 − perfectCalm·calm.
- n = topLevel = blocks.length − 1, which always equals score.
- base = blocks[0].
- World units: WORLD_WIDTH 100, BASE_WIDTH 60, BLOCK_HEIGHT 8.

## 2. New GameState fields (11)

newGame(seed = 0) sets the defaults shown.

| Field | Type | Default | Meaning |
|---|---|---|---|
| seed | number | arg | main passes a per-run value; game.ts never reads the clock or Math.random |
| lean | number | 0 | Structural lean at the top, world units, + = right. Eased toward leanGoal. |
| leanTop | number | 0 | Level the lean profile is anchored to. Eases toward n. |
| teeter | number | 0 | Game-seconds past the rail. 0 < teeter ≤ teeterTime is TEETER; above that is LAST CHANCE (only an unarmed tower gets there). |
| armed | boolean | false | See section 6. |
| banked | number | 0 | Rebuilds owed by STEADY perfects. Always ≤ cuts.length. |
| inDanger | boolean | false | Near-miss bookkeeping. |
| saves | number | 0 | Near-miss count. |
| toppled | {dir: 1\|-1; level: number} \| null | null | Set together with phase 'over'. |
| gust | {phase: 'idle'\|'warn'\|'blow'; t; dir: 1\|-1; amp} | {idle, 0, 1, 0} | t is seconds into the phase; amp is captured at start. |
| nextGust | number | GUST_START_LEVEL + 1 = 13 | Score at or after which the next gust may start. |

Existing fields are unchanged, and Phase stays 'playing' | 'over'.

## 3. Pure exported functions

- drift(s) = (top.x + top.w/2) − (base.x + base.w/2), tower-local. This is the moment arm.
- leanTarget(s) = (swayOn && leanOn) ? leanGain·kb(n)·drift(s) : 0. Short towers are stiff.
- gustPush(s) = gust.phase === 'blow' ? dir·amp·sin²(π·t/GUST_BLOW) : 0.
- leanGoal(s) = swayOn ? leanTarget(s) + kb(n)·gustPush(s) : 0.
- leanShape(s, l):
  - l ≤ 0 → 0;
  - l ≥ leanTop → 1;
  - otherwise b = max(0, leanTop − LEAN_SPAN), and the result is l ≤ b ? 0 : (l − b)/(leanTop − b).
  - So the base never moves, the top 12 levels ramp, and leanShape(n) is always 1.
- unrest(s) = kb(n)·kickAmplitude(s). This is the swing only; the lean is excluded. kickAmplitude keeps its shipped meaning, hypot(kick, kickVel/omega).
- tilt(s) = swayOn ? kick·kb(n)·damp + lean·leanShape(s, n) : 0. This is the non-wave displacement of the top, exactly as drawn. The ambient wave never topples.
- toppleLimit(s) = toppleLimit·(1 − thinTippy·(1 − min(1, top.w/BASE_WIDTH))). At defaults: 30 at width 60, 22.5 at 30, 18 at 12.
- forecast(s) = swayOn ? max(|lean|, |T|, |T + kb(n)·dir·ahead|) + kb(n)·kickAmplitude(s) : 0, where:
  - T = leanTarget(s);
  - ahead = 0 when idle, amp in warn or while blow t < GUST_BLOW/2, else |gustPush|.
  - Proof: the lean is a convex-combination lag, so it stays inside the hull of its start value and every goal it will see. Swing energy cannot grow, because damping is at least 0. The value is undamped, so a perfect cannot hide danger.
  - Guarantee: |tilt| ≤ forecast until the next drop or gust start. Measured over 600 random states × 8 s: 0 violations, worst peak/forecast 0.968.
- windStrength(level):
  - level < 12 → 0;
  - band = floor((level − 12)/8); an odd band → 0;
  - otherwise min(1, 0.5 + 0.25·band/2).
  - So levels 12–19 give 0.5, 28–35 give 0.75, and 44–51, 60–67 and later give 1.
- hash01(seed, n):
  ```
  x = Math.imul((seed|0) ^ 0x9e3779b9, 0x85ebca6b) ^ (n|0)
  x = Math.imul(x ^ (x>>>16), 0x7feb352d)
  x = Math.imul(x ^ (x>>>15), 0x846ca68b)
  x ^= x>>>16
  return (x>>>0)/2^32
  ```
  It is integer-exact in every engine.
- canRebuild(s) = cuts.length > 0 && (!regrowNeedsCalm || !swayOn || unrest ≤ regrowCalm).
- warning(s), checked in order:
  1. teeter > teeterTime → 'lastChance';
  2. teeter > 0 → 'teeter';
  3. |tilt| ≥ DANGER_FRAC(0.85)·limit → 'danger';
  4. forecast ≥ WARN_FRAC(0.6)·limit → 'wobbly';
  5. otherwise 'steady'.
- stability(s) = {level, tilt, lean, leanTarget, forecast, limit, ratio = |tilt|/limit, forecastRatio, side, teeter01 = min(1, teeter/teeterTime), lastChance01 = clamp((teeter − teeterTime)/LAST_CHANCE_TIME), armed, canRebuild, banked, saves}. side is sign(leanTarget) if |leanTarget| > 0.5, else sign(tilt).
- timeScale(s) = phase playing && 0 < teeter ≤ teeterTime ? teeterSlowmo : 1. Slow motion runs during TEETER only; LAST CHANCE runs at normal speed.
- topplePivot(s) = the narrowest block in levels [max(1, n − 12), n − 1], lowest index on ties.

## 4. How lean feeds swayOffset

```
swayOffset(s, l) = !swayOn ? 0
  : (sin(swayAngle)·swayBase·bend(l)·(1 + leanSway·min(1, |lean|/LEAN_SWAY_REF=30)) + kick·kb(l))·damp
    + lean·leanShape(s, l)
```

With lean = 0 this is bit-identical to the shipped function: the extra factor is exactly ·1 and the extra term is +0.

drop() keeps converting world to local with swayOffset(newLevel). leanShape is 1 at both the old top and the new level, so the lean cancels and placed blocks stay exactly where they were dropped. The existing test passes.

## 5. step(s, dt) order

Return immediately if not playing.

1. swayAngle (unchanged).
2. If swayOn:
   - maybeStartGust(s);
   - stepGust(s, dt): t += dt; warn → blow at t ≥ GUST_WARN (t −= GUST_WARN); blow → idle at t ≥ GUST_BLOW (t = 0);
   - stepKick(s, dt). The same 1/240 substeps, now with c0 = min(kickDecay, omega) and c = c0 + (omega − c0)·perfectSteady·calm, so calm raises damping toward critical. acc = −omega²·kick − 2c·kickVel. There is no gust in the spring.
3. lean += (leanGoal − lean)·(1 − e^(−LEAN_EASE·dt)), with LEAN_EASE = 4/s, which is 63% of the way in 0.25 s.
4. leanTop += (n − leanTop)·(1 − e^(−LEAN_TOP_EASE·dt)), with LEAN_TOP_EASE = 8/s.
5. calm (unchanged).
6. updateTopple(s, dt); return if the phase is now 'over'.
7. Slider (unchanged).

## 6. Topple and warning rule

updateTopple(s, dt), with lim = toppleLimit and r = |tilt|/lim:

- If toppleOn && swayOn && r ≥ 1:
  - teeter += dt;
  - fallAt = (lastChance && !armed) ? teeterTime + LAST_CHANCE_TIME : teeterTime;
  - if teeter ≥ fallAt: phase = 'over', toppled = {dir: tilt > 0 ? 1 : −1, level: n}, and return.
- Otherwise: teeter = max(0, teeter − TEETER_RECOVER(2)·dt).
- Then: if r ≥ 0.85 || teeter > 0, set inDanger = true. Otherwise, if inDanger && forecast < 0.85·lim, set inDanger = false and saves++. So SAVED! fires exactly when the bound proves the tower is out of danger.

Arming happens in drop(), for placed drops only. Read before anything changes:
- wasWobbly = forecast ≥ WARN_FRAC·limit;
- d0 = |drift|.

Then:
- A sliced drop sets armed = wasWobbly && |drift after placement| > d0. It must be both a WOBBLY tower and a drop that made the imbalance worse.
- A perfect sets armed = false. A perfect is always safe.
- A miss changes nothing: it neither arms nor decides.
- Every placed drop sets teeter = 0, so its consequence plays out from scratch.

Consequences:

1. No drop made while the tower was STEADY can topple it before teeterTime + LAST_CHANCE_TIME = 3.6 s game-time. Verified for single chops of 10–56 at L10, L20, L30 and L60: chops of 28 and up fell only after the countdown ran out, at 3.67–6.0 s.
2. An armed tower falls 0.6 game-s (1.2 s real with slow motion) after its top reaches the rail. A swing that crosses the rail and returns is a near-miss, because teeter drains at 2×.
3. In LAST CHANCE the next placed drop decides:
   - a same-side sloppy drop arms the tower and it topples 0.6 s later;
   - a counterweight or a perfect cannot topple it sooner than 3.6 s later.
   Verified across 11 tap timings from 0.2 s to 3.2 s after a chop of 28: counters of −10 or −14 usually save it outright; same-side +6 topples in 0.6–0.7 s; perfects every 1.2 s save it within 3 taps (REBUILT 28).
4. A topple ends the run regardless of lives.

## 7. Regrow tied to sway

Perfect branch of drop(), in order:

1. streak++, perfects++.
2. calmEnough = !regrowNeedsCalm || !swayOn || unrest ≤ regrowCalm(2.5). Read before the brace.
3. If swayOn: kickVel *= 1 − perfectBrace(0.5). This is velocity only.
4. calmTimer = CALM_TIME.
5. placed starts as the block below.
6. If calmEnough: repeat min(cuts.length, 1 + banked) times:
   - takeCut: want = leanOn ? (d > 0.5 ? −1 : d < −0.5 ? +1 : 0) : 0, where d is the drift of the current placed block;
   - splice the newest cut whose side === want, otherwise the newest cut;
   - extend left if side < 0, else right;
   - accumulate regained, rebuilt, grewLeft and grewRight.
   Then banked = 0.
7. Else: banked = min(banked + 1, cuts.length).
8. steadied = !calmEnough && cuts.length > 0. STEADY never shows when there is nothing to rebuild.

The full rebuild still restores the exact original bar, in any order.

In practice:
- A perfect within about 1 s of a chop of 4.5 or more STEADIES: it catches the swing, after which calm gives critical damping and the swing is gone within about 1 s.
- The next perfect REBUILDs ×k.
- Alternating perfect,+6 never rebuilds and topples (median 38). Alternating perfect,+4 rebuilds every time.

## 8. Gusts

maybeStartGust starts a gust only when all of these hold:
- gust idle, gustsOn, gustPush > 0;
- windStrength(score) > 0;
- (score − 12) % 8 ≥ 1, i.e. not on the first level of a band, so the WIND ZONE banner reads first;
- score ≥ nextGust;
- teeter == 0;
- forecast < DANGER_FRAC·limit. A gust never starts on a tower in danger.

On start:
- gust = {warn, t: 0, dir: hash01(seed, 2·score + 1) < 0.5 ? −1 : 1, amp: gustPush·windStrength(score)};
- nextGust = score + 3 + floor(hash01(seed, 2·score)·3), i.e. 3–5 blocks later.

Each gust is a 1.2 s warning followed by a 1.6 s sin² push into the lean. That works out to about 2 gusts per windy band, or 24 per 200 blocks. A gust already running always finishes, so toggling gusts off or leaving a band never cuts the force off abruptly.

Direction comes from the hash. It is never aimed at the lean, so half of all gusts help a leaning tower.

A balanced tower peaks at 6.8 for amp 8, a forecast ratio of 0.27. At any width the maximum is amp/(limit at width 0) = 8/15 = 0.53, which is below WOBBLY.

## 9. No-jump argument

- drop() changes only kickVel (addKick and brace), cuts, banked, armed, teeter, and pushes a block. lean, leanTop, calm and swayAngle are untouched, so swayOffset at every existing level is bit-identical before and after (tested).
- Everything else is eased or integrated.
- The kick cap now trims velocity only: if kickAmplitude > 30 after the impulse, kickVel = sign·omega·sqrt(max(0, 30² − kick²)). The shipped cap scaled kick, a position, which was a latent teleport.
- Toggling or tuning leanOn, leanGain, toppleOn, toppleLimit, thinTippy, teeterTime, gustsOn, gustPush, lastChance, perfectSteady, perfectBrace, regrowNeedsCalm or regrowCalm leaves every block in place that frame (tested).
- leanSway, like swayBase, rescales the wave; the game is paused while the panel is open.

## 10. DropResult

```
perfect: {kind, placed, regained, rebuilt, steadied, grewLeft, grewRight}
sliced:  {kind, placed, cut, armed}
miss:    unchanged
```

## 11. A/B

With leanOn, toppleOn, gustsOn and regrowNeedsCalm all false, and perfectSteady = perfectBrace = 0, the game is bit-identical to the shipped game.ts: every swayOffset and every block over 300 s of scripted play (tested against a frozen copy).

## 12. Hand check

Same-side chops of 6 on a tall tower (leanGain 2, thinTippy 0.5):

| Drop | Drift | Lean target | Width | Limit | Swing | Forecast | State |
|---|---|---|---|---|---|---|---|
| 1 | +3 | 6 | 54 | 28.5 | 7.2 | 13 = 0.46 | STEADY |
| 2 | +6 | 12 | 48 | 27 | ~9 | ~21 = 0.78 | WOBBLY |
| 3 | +9 | 18 | 42 | 25.5 | — | 1.05 | ARMED, swing peaks graze the rail |
| 4 | +12 | 24 | — | ≥ limit | — | — | Static lean at the rail: TEETER, then topple 0.6 s later |

The simulation matches: e=6 from a 20-block tower is WOBBLY after 2 sloppy drops and topples at 4.

## 13. Measured (40 seeds, cap 150; shipped game in brackets)

Perfect bot: 200 blocks on 10 seeds, width 60, 3 lives, max forecast ratio 0.267, never WOBBLY.

Same-side bots, 1.1 s apart, starting from a 20-block tower:

| Error | WOBBLY after (sloppy drops) | Topple at (sloppy drops) |
|---|---|---|
| 2 | 7 | 14 |
| 3 | 4 | 8 |
| 4 | 4 | 6 |
| 5 | 2 | 5 |
| 6 | 2 | 4 |
| 8 | 1 | 3 |
| 10 | 1 | 3 |

Starting from level 0 adds 1–2 drops of grace.

Populations:

| Bot | Median score | Topples | Other deaths |
|---|---|---|---|
| σ=1.5, 30% perfect | 150 | 0 | — |
| σ=2.5, 30% perfect | 150 (150) | 6 | 9 by lives |
| σ=4, 30% perfect | 67 (68) | 19 | 20 by lives (shipped: 0 topples, 37 by lives) |
| Bias μ=1.5, σ=2.5 | 49 (123) | 37/40 | — |
| Bias μ=2.5 | 28 | 40/40 | — |
| 40% perfect, error U(2,7), random side | 41 | 28 | — |
| Same, but always countering the drift | 56 | 0 | balance pays |
| 65% perfect | 150 | 4 | — |

Every topple came either from an armed drop made while forecast ≥ WARN_FRAC, or from a full LAST CHANCE countdown, and each showed at least teeterTime of red first.

STEADY share of rebuild-eligible perfects: 5% (σ=2.5), 12% (σ=4), 15% (40% perfect).

## 14. Files to touch

- **config.ts**: the constants in the tunables list, plus KICK_SUBSTEP = 1/240 (the existing literal, now named), and the 15 Tuning fields.
- **game.ts**: everything above. Export: kickBend, topLevel, drift, leanTarget, leanGoal, leanShape, gustPush, unrest, tilt, toppleLimit, forecast, windStrength, hash01, canRebuild, warning, stability, timeScale, topplePivot.
- **eslint.config.js**: for src/game.ts, add no-restricted-properties banning Math.random and Date.now.
- **panel.ts**:
  - BoolKey = 'swayOn' | 'leanOn' | 'toppleOn' | 'lastChance' | 'regrowNeedsCalm' | 'gustsOn', with matching checkboxes;
  - the 10 new SLIDERS;
  - format() shows 2 decimals when step < 0.1.
  - load() already fills missing keys from defaults, so no migration is needed.
- **main.ts**:
  - newGame(seed): main may use Date.now or Math.random to pick it.
  - Keep a `scale` eased toward timeScale(state) at 10/s, and call step(state, dt·scale) and updateView with dt·scale.
  - Detect the playing → over transition inside frame() and set overAt there, because a topple happens in step(), not drop(). Trigger topple haptics there too.
  - Restart guard: RESTART_GUARD_MS + (state.toppled ? TOPPLE_ANIM_MS = 1400 : 0).
  - Pops: STEADY, REBUILT, SAVED!, the lean arrow and the armed '!'. Compute leanTarget before and after each drop for the arrow.
- **render.ts**: the telegraphing section.
- **preview/shots.ts**: new shots.
- **game.test.ts**: one line.
- **New**: sway.test.ts, plus src/testing/{bots.ts, shipped-game.ts}.
- **CLAUDE.md "Game rules (decided)"**:
  - replace "Placed blocks never topple" with the lean, armed, teeter, LAST CHANCE and topple rules;
  - replace "each perfect drop pops the newest" with "perfects steady first (brace plus critical damping, bank a rebuild) and rebuild only once calm, choosing the cut that pulls the top home";
  - add the gusts rule;
  - keep the calm-scales-the-kick rule.
  - Merge with the uncommitted skin edits in the working tree.

## Telegraphing (what the renderer shows)

The renderer reads only stability(state), state.gust, gustPush, windStrength(score), topplePivot, canRebuild, state.toppled, state.banked and state.saves, plus the DropResult and the leanTarget before and after each drop, which main.ts computes. Everything is drawn through kitFor(skin), so it works in Cartoon (default) and Neon. It is bright, saturated and high-contrast, with flashes reserved for feedback moments. There is no shadowBlur in the new effects (it is costly on phones); use layered strokes or fills.

Blocks are always drawn at their logic positions. The lean's tilt is real, through leanShape, so overlap is never visually misleading. Label tiers use hysteresis and easing in the renderer (WOBBLY on at 0.6, off at 0.5, eased at about 8/s); the logic thresholds stay crisp.

## Always on (leanOn)

- **Plumb line:** a dashed vertical from the base center up past the top, as the "upright" reference.
- **Tilt gauge** (a chunky horizontal bar under the lives):
  - zones: green below 0.6, amber 0.6–0.85, red 0.85–1, and the rail at ±1;
  - the needle sits at tilt/limit;
  - a ghost tick sits at forecastRatio on the `side`;
  - an "armed" red '!' badge appears when stability.armed is true.
- **Gold glints** run along the top block's receding edge while canRebuild: "the next perfect rebuilds".

## Every sloppy drop (cause and effect)

- A lean arrow pops at the top toward the heavy side, sized by the change in leanTarget.
- The gauge ghost jumps at once to the new forecast, even though the lean eases in over about 0.25 s.
- If the drop armed the tower, the '!' badge flashes red, with the hint "HOLD ON!".

## WOBBLY (forecastRatio ≥ 0.6)

- The gauge and a "WOBBLY" tag turn amber.
- The heavy-side rail fades in: a vertical laser about 3 blocks tall at world x = column ± limit, where column = top.x + top.w/2 + swayOffset(top) − tilt. The column is the top's center minus its tilt, so the rail rides the ambient wave, and the top's center touching the rail means teeter. Alpha follows forecastRatio. Rails are hidden below 0.45.
- The top bars tint amber on the heavy side.
- A creak sound and haptic tick play at heavy-side swing peaks.
- Hint while not armed: "Balance it: land a PERFECT, or drop on the ← side." The arrow points away from `side`.

## DANGER (ratio ≥ 0.85)

- The rail turns red and pulses at the sway frequency.
- A red vignette appears on the heavy screen edge.
- "WHOA!" pops on entry, with a buzz.

## TEETER (0 < teeter ≤ teeterTime; timeScale gives slow motion)

- A ring around the top block fills with teeter01: red if armed, amber if not.
- Crack sparks show at the topplePivot seam.
- The camera rolls up to 2° toward the lean.
- The rail strobes and a heartbeat plays.
- Label: "TIPPING!".

## LAST CHANCE (teeter > teeterTime; normal speed)

- A big flashing "LAST CHANCE — TAP!", with an arrow toward the light side (−side).
- A countdown ring empties with lastChance01.
- Sub-copy: "a PERFECT or a counterweight saves it".

## SAVED! (saves increments)

- A big accent pop.
- The rail shatters into sparks and the gauge flashes green.
- Double haptic.

## Perfect drops

- **steadied = true:**
  - a cyan "STEADY" pop;
  - a lock-ring clamps around the top;
  - one bank chip per banked rebuild stacks beside the tower;
  - the chips glow "READY" once canRebuild is true.
- **rebuilt > 0:**
  - "REBUILT +n", or "REBUILT ×k" when the bank pays out;
  - a bright sweep runs over the regrown strip(s) (grewLeft on the left edge, grewRight on the right) for about 0.3 s, overlaid on the full logic block, never a fake width;
  - the gauge needle visibly swings back toward center.
- **STEADY while still tipping:** "STEADY! Now balance it ←".

## Gusts

- **Entering a windy band** (windStrength(score) goes from 0 to above 0): a "WIND ZONE" banner for 1.5 s, and ambient streak density that follows windStrength.
- **warn (1.2 s):**
  - streaks rush in from the upwind edge;
  - "≫ GUST" chevrons sit at the top's height, pointing downwind (gust.dir);
  - the gauge ghost already includes the push, because the forecast does.
- **blow (1.6 s):**
  - dense streaks with alpha = |gustPush|/amp;
  - particles flick off the top's downwind edge;
  - the top 12 levels visibly lean downwind, because the push is real lean.

## TOPPLED (phase 'over' && toppled; logic frozen, positions stable)

A renderer-only animation of TOPPLE_ANIM_MS = 1400 ms. At θ = 0 the picture is identical to the last frame, so nothing jumps.

- 0–0.25 s: white flash and a crack at topplePivot.
- 0.25–1.2 s: the slab above the pivot rotates about the pivot block's top corner on toppled.dir, θ = toppled.dir·½·3·t² rad. Bars peel off as Falling pieces (reuse addFalling with outward vx) once θ passes 0.6 rad. The camera shakes with decay.
- About 1.2 s: "TOPPLED!" slams in, in the display font.
- Then the game-over card, titled "TOPPLED" instead of "Game Over", showing height and saves. A miss-out keeps the plain "Game Over" card.

## Preview shots (npm run snap; render smoke test covers every skin)

- 'wobbly': climb(18), then two +6 drops 1.1 s apart.
- 'lastChance': a 20-block perfect tower, a 28 chop, then 1.0 s.
- 'gust': settle in the warn phase at level 13.
- 'toppled': 'wobbly' plus +6 drops until toppled, then advance the view 0.8 s.

## Tunables

| Name | Default | Range | Meaning |
|---|---|---|---|
| leanOn | true | bool (panel checkbox) | Off-center drops shift the top's center (drift) and lean the tower toward it. Off means leanTarget is 0, the lean eases back to 0, and regrow goes back to newest-first. |
| leanGain | 2 | 0–4, step 0.1 | Lean at the top, in world units, per unit of drift on a tower of level 8 or more. Scaled by kb(n), so short towers are stiff. The main difficulty dial. |
| leanSway | 0.5 | 0–2, step 0.1 | A leaning tower sways more: the base wave × (1 + leanSway·min(1, /lean//30)). Affects aiming only and never topples. |
| toppleOn | true | bool (panel checkbox) | The tower can teeter and topple. Off means the gauge, warnings and gusts still run but the run never ends by tilt (for A/B). |
| toppleLimit | 30 | 10–60, step 1 | Tilt (lean + drawn kick at the top, world units) where a full-width tower starts to teeter. 30 = BASE_WIDTH/2. |
| thinTippy | 0.5 | 0–0.9, step 0.05 | A narrow top lowers the rail: limit·(1 − thinTippy·(1 − w/60)), giving 22.5 at width 30 and 18 at width 12. Turns whittle-down deaths into topples; rebuilding raises it again. |
| teeterTime | 0.6 | 0.1–2, step 0.05 | Game-seconds an ARMED tower's top must stay past the rail before it topples. Teeter drains at 2× when back inside. |
| teeterSlowmo | 0.5 | 0.2–1, step 0.05 | Clock scale main.ts eases to (10/s) while TEETERing, so 0.6 game-s = 1.2 s real. LAST CHANCE runs at 1×. 1 = off. |
| lastChance | true | bool (panel checkbox) | An unarmed tower past the rail hangs for up to LAST_CHANCE_TIME after teeterTime; the next placed drop decides. Off means any tower topples at teeterTime. |
| perfectSteady | 1 | 0–1, step 0.1 | While calm (after a perfect), kick damping rises toward critical: c = c0 + (ω − c0)·perfectSteady·calm. Real steadying, not just display. |
| perfectBrace | 0.5 | 0–1, step 0.1 | Fraction of kick velocity a perfect removes instantly: the tactile 'catch'. Velocity only, no jump. |
| regrowNeedsCalm | true | bool (panel checkbox) | A perfect only rebuilds when unrest ≤ regrowCalm; otherwise it STEADIES and banks the rebuild. Off means every perfect with cuts rebuilds (shipped rule). |
| regrowCalm | 2.5 | 0–15, step 0.5 | Largest top swing (kb·kickAmplitude, world units; excludes lean) that counts as calm enough to rebuild. 4 is softer (alternating perfect,+6 never topples); 2 makes STEADY about 19% of perfects. |
| gustsOn | true | bool (panel checkbox) | Gusts in the windy height bands. A gust already running always finishes. |
| gustPush | 8 | 0–20, step 1 (0 = no gusts) | Peak lean, in world units, a full-strength gust adds at the top (sin² over GUST_BLOW). Bands blow at 50%, 75%, then 100%. |
| perfectCalm (existing, unchanged) | 0.6 | 0–1, step 0.1 | Still scales the drawn wave + kick by 1 − perfectCalm·calm (CLAUDE.md rule kept). Never scales the lean; forecast and arming ignore it. |
| kickPerUnit (existing, unchanged) | 1.2 | 0–4 | Kept at 1.2. The landing kick stays the visible 'juice', and no tuning-blob migration is needed. |
| LEAN_EASE (const) | 4 /s | const | Lean eases toward its goal at this rate: 63% in 0.25 s. The gauge ghost jumps instantly at the drop. |
| LEAN_SPAN / LEAN_TOP_EASE (const) | 12 levels / 8 /s | const | The lean tilts the top 12 levels (linear ramp, base never moves); the ramp follows a new top at 8/s. |
| LEAN_SWAY_REF (const) | 30 (BASE_WIDTH/2) | const | /lean/ at which leanSway is at full effect. A constant, so moving the toppleLimit slider never moves the wave. |
| WARN_FRAC / DANGER_FRAC (const) | 0.6 / 0.85 | const | WOBBLY when forecast ≥ 0.6·limit; a heavy-side sloppy drop then arms the tower. DANGER when /tilt/ ≥ 0.85·limit. Gusts hold off while forecast ≥ 0.85·limit. |
| TEETER_RECOVER (const) | 2 | const | Teeter drains twice as fast as it fills, so rail-scrapes are near-misses. |
| LAST_CHANCE_TIME (const) | 3 game-s | const | Longest an unarmed tower hangs past the rail; shown as a countdown ring. No drop made while STEADY can topple before teeterTime + this. |
| DRIFT_EPS (const) | 0.5 | const | Below this /drift/ a rebuild just takes the newest cut. |
| GUST_START_LEVEL / GUST_BAND (const) | 12 / 8 | const | Windy at levels 12–19, calm at 20–27, windy at 28–35, and so on. No gust on a band's first level. |
| GUST_STRENGTH_FIRST / GUST_STRENGTH_STEP (const) | 0.5 / 0.25 | const | Windy band k (0, 1, 2, ...) blows at min(1, 0.5 + 0.25k) × gustPush. |
| GUST_GAP_MIN / GUST_GAP_MAX (const) | 3 / 5 blocks | const | Placed blocks between gust starts, picked by hash01(seed, 2·score). About 2 gusts per band. |
| GUST_WARN / GUST_BLOW (const) | 1.2 s / 1.6 s | const | Telegraph before any push (the forecast already includes the gust), then the sin² push. |
| KICK_SUBSTEP (const) | 1/240 s | const | Names the existing spring substep literal. |
| SWAY_KICK_MAX (existing const) | 30 | unchanged | Kick amplitude cap. Now trims velocity only; the shipped cap scaled position. |
| TOPPLE_ANIM_MS (main/render const) | 1400 | 1000–2000 | Fall animation length; the restart guard adds it after a topple. |

## Tests

- Existing suite: all 36 pass with the new defaults, including both bot tests and the world-space placement test. The only edit is one line: 'each perfect wins back the next slice, newest first' sets tuning.regrowNeedsCalm = false. It fires perfects with no time passing, and it tests the cut stack, not the calm gate.
- Drift and lean: stack 20, aim +6 and drop. drift ≈ 3 (1 digit), leanTarget ≈ 6, and lean === 0 right after the drop. After 1 s of steps, lean ≈ 6·(1 − e^−4).
- Counterweight: on a 20-block stack, drop +6 then −6. |drift| < 0.5, |leanTarget| < 1, and the second result has armed === false.
- Short towers are stiff: leanTarget after a +6 drop at level 1 is less than a quarter of the same drop at level 21.
- leanShape: 40 levels with leanTop 40, lean 12 and swayAngle 0. swayOffset is ≈12 at level 40, ≈6 at level 34, ≈0 at level 28, and exactly 0 at the base.
- leanSway: swayAngle π/2, lean 15, top at 40. swayOffset(40) − 15 ≈ 14·1.25.
- Drops never move placed blocks: settled 20-block tower, then a sloppy +9 and then a perfect. swayOffset at every level is bit-identical (toBe) before and after each one; the brace changes velocity only.
- Continuity: over 30 s at dt 1/120 with random sloppy, counter and perfect drops and leanOn flipped mid-run, the max per-step change in swayOffset(top) is < 2.5, and at dt 1/240 it is < 0.7× that. A jump would not halve.
- Live tuning: changing all 13 non-wave knobs mid-game (leanOn, leanGain, toppleOn, toppleLimit, thinTippy, teeterTime, gustsOn, gustPush, lastChance, perfectSteady, perfectBrace, regrowNeedsCalm, regrowCalm) leaves every swayOffset bit-identical.
- Kick cap is velocity-only: kick = 25, then a 50-unit chop. kick is still exactly 25 and kickAmplitude ≤ 30.
- toppleLimit: 30 / 22.5 / 18 at widths 60 / 30 / 12, and 30 at any width with thinTippy = 0.
- Armed topple: a 40-level tower with drift 18 (lean 36 > 30), armed. At 0.58 s it is still playing, warning is 'teeter' and timeScale is teeterSlowmo. By 0.62 s phase is 'over', toppled equals {dir: 1, level: 40}, lives === LIVES, drop() returns null, timeScale is 1, and step() leaves the state byte-identical.
- Near-miss: lean 22, kick 9.5 at its peak, armed. Over 3 s it stays playing, 0 < max teeter < teeterTime, teeter ends at 0 and saves === 1.
- LAST CHANCE: the same tower unarmed. At 1 s it is still playing, warning is 'lastChance', lastChance01 > 0 and timeScale is 1. It is still playing at teeterTime + LAST_CHANCE_TIME − 0.05, and 'over' 0.1 s later. With lastChance = false it falls at teeterTime.
- The deciding tap, at 10 delays from 0.2 to 2.9 s after a 28 chop on a settled 20-block tower:
- A −14 counterweight is not toppled for teeterTime + LAST_CHANCE_TIME − 0.05.
- Perfects every 1.2 s regain 28 within 3 taps, then the tower is 'steady' after 6 s.
- Same-side +6 returns armed === true; still playing at teeterTime − 0.05, over within 0.8 s.
- Single chop from steady: at L10, L20 and L40, chops of 10, 16, 20, 24, 28, 32, 40, 48 and 56 with gusts off. Warning was 'steady' before the drop, and the tower is still playing at teeterTime + LAST_CHANCE_TIME − 0.01 after it.
- topplePivot: in a 30-level tower with widths of 20 at levels 25 and 22, it returns 22 (narrowest, lowest on ties).
- Steady first, then rebuild: stack 10, then a +10 chop, so unrest > regrowCalm. The next perfect gives regained 0, rebuilt 0, steadied true, banked 1 and cuts.length 1; kickVel is exactly ×(1 − perfectBrace) and swayOffset is unchanged. Unrest falls to ≤ regrowCalm within 1.5 s. The next perfect gives rebuilt 1, regained 10, width 60 and banked 0.
- No STEADY spam: a perfect with kickVel 40 and no cuts gives steadied === false.
- Bank pays together: two +8 chops, then a STEADY perfect (banked 1). After 2.5 s the next perfect gives rebuilt 2, regained 16 and width 60.
- Steady damping: kick amplitude 12 at level 20. After 1 s the calm game (calm 1, calmTimer 2) has less than 0.5× the amplitude of the uncalmed one.
- Regrow pulls home: regrowNeedsCalm = false, then +8 and −2 drops (drift +3). The perfect gives regained 8 and grewLeft 8, with |drift| < 1.5 afterwards; the next perfect restores exactly the base bar. With leanOn = false the first regain is 2 (newest first).
- windStrength over levels [11, 12, 19, 20, 27, 28, 35, 36, 44, 60, 76] is [0, .5, .5, 0, 0, .75, .75, 0, 1, 1, 1].
- hash01 is deterministic, and seeds 0–9 produce both gust directions. Two perfect-bot runs with seed 7 to 60 blocks give JSON-identical states.
- Gust telegraph: at level 13 with nextGust 13, one step starts 'warn' and forecast ≈ amp immediately. gustPush is 0 for ≈1.2 s. The per-step change in lean is ≤ amp·LEAN_EASE·dt for the whole gust.
- A gust alone never makes a balanced tower WOBBLY: at widths 60, 40, 20 and 8, a full-strength gust keeps max forecast/limit < WARN_FRAC and peak |tilt| ≤ gustPush.
- Hold-off: with drift 13 at level 13 (forecast 0.87), the gust stays idle for 10 s.
- gustsOn = false: a gust in progress finishes, then none restart.
- Forecast bound property: 600 seeded random states (levels 1–60, random cuts, lean ±25, kick ±15, kickVel ±30, calm 0–1, any gust phase, toppleOn off, restarts blocked). |tilt| ≤ forecast(t0) + 1e-6 at every step for 8 s.
- Fairness population: profiles (μ, σ, perfect%) = (0, 2.5, 30), (0, 4, 30), (0, 4, 0), (1.5, 2.5, 30) and (2.5, 2.5, 30), 20 seeds each. Every topple has either armedAtEnd with the forecast ratio at the last placed drop ≥ WARN_FRAC, or !armed with teeter ≥ teeterTime + LAST_CHANCE_TIME. Each shows ≥ teeterTime of danger, teeter or lastChance first. There are more than 30 topples in total.
- Perfect bot with gusts: seeds 0–2 reach 200 at width 60 with 3 lives and max forecast/limit < WARN_FRAC (measured 0.267).
- One-sided bot: from a settled 20-block tower, errors of +6 at least 1.1 s apart. It is non-steady after ≤ 3 sloppy drops, topples after ≤ 6, has ≥ 1 sloppy drop made while non-steady, and saw danger. Measured: 2 / 4.
- Sloppy players end early: 30 seeds with random side and |e| U(2, 8), no perfects. Every run ends below 100 and ≥ 9 end by topple.
- Balance pays: 40 seeds, 40% perfects, |e| U(2, 7). A bot that picks −sign(drift) has a higher median than the random-sign bot and ≤ 1/3 of its topples. Measured: 56 vs 41, 0 vs 28.
- A/B exactness: with leanOn, toppleOn, gustsOn and regrowNeedsCalm off and perfectSteady = perfectBrace = 0, 300 s of scripted drops give swayOffset === shipped at every 7th level every step, and identical blocks and score. Compare against a frozen copy at src/testing/shipped-game.ts.
- toppleOn = false: lean 50 armed for 5 s stays playing with teeter 0 and warning 'danger'.
- leanOn = false: the lean eases to under 0.01 within 3 s. swayOn = false: tilt, forecast and leanTarget are all 0, even mid-gust.
- Render smoke: shots 'wobbly', 'lastChance', 'gust' and 'toppled' render in every skin without throwing, and `npm run snap` writes the PNGs.

## Risks

- Difficulty shifts toward balance. One-sided ('biased') players drop hard: μ 1.5 median 49 vs 123 shipped, with 37 of 40 runs ending in a topple. Random-sided players barely change (σ 4 median 67 vs 68), but half their deaths become topples. This is intended (aim for balance); the dials are leanGain, toppleLimit, thinTippy and regrowCalm.
- regrowCalm 2.5 means a player who alternates perfect and sloppy never gets calm, so never rebuilds. Perfect,+6 topples with median 38 (it would be 150 at regrowCalm 4). That is the owner's request #3, but it is only fair if STEADY, the bank chips and the READY glint make 'wait for calm, then perfect' obvious. Raise regrowCalm to 3–4 if it feels stingy.
- The arming rule is invisible fairness. Players must connect 'I dropped sloppy on the heavy side while it was WOBBLY' to the fall. The amber state, the red '!' badge and the copy 'a PERFECT is always safe' must be loud.
- LAST CHANCE can read as the game freezing or cheating. It needs the countdown ring, 'TAP!' and the counterweight arrow. A miss does not decide (it only costs a life), so a near-dead sliver can still fall after the countdown even though the player tapped.
- One counterweight cannot fix a huge chop: at 32 or more, the counter narrows the top and thinTippy lowers the rail. The real save is perfects (STEADY, then REBUILT), so the HUD should offer both options.
- Slow motion also slows the slider. That helps saves, but players can mistime the first tap after it ends, so ease the scale in and out at 10/s. LAST CHANCE deliberately runs at 1×; 3 s of real time is enough for at least 2 slider passes at score 40.
- Gusts are random in direction (hash), so half of them help a leaning tower. They can still be the last straw for an armed WOBBLY tower. It is telegraphed (1.2 s warning, the ghost tick jumps at once, no gust starts at forecast ≥ 0.85), but playtest whether it feels caused by the player.
- The forecast is exact for the lean but conservative for the swing (energy bound). Right after a big chop the ghost can sit well above where the swing will actually reach. The worst measured case is tight (0.968), but WOBBLY needs hysteresis so it doesn't feel like crying wolf.
- Reach and framing at extreme lean. A lean near 30 plus swing plus wave can push the top past SLIDE_RANGE 55 on the heavy side, or toward the edge of VIEW_WIDTH 150. The counterweight side always stays reachable. Check on a phone.
- The leanSway and swayBase sliders rescale the wave instantly (the game is paused while the panel is open). Every other new knob is jump-free (tested).
- Determinism is per device: Math.exp and Math.sin are not bit-exact across engines. The gust schedule uses an integer hash, so it is identical everywhere.
- Integration hazards:
- Topples happen in step(), so main.ts must detect playing → over in frame() for overAt, haptics and the 1400 ms guard. Otherwise a frantic tap skips the fall.
- CLAUDE.md 'Game rules (decided)' must be rewritten in the same commit ('Placed blocks never topple', the newest-cut regrow), merged with the uncommitted skin edits in the working tree.
- Renderer paths are now src/base/*.
- Phone performance: rails, vignettes, streaks and pops compete for space and frame time. No shadowBlur in the new effects, rails hidden below forecast ratio 0.45, and particle counts capped.

# iOS launch checklist

What the owner must do by hand in Xcode and App Store Connect to ship Sway Tower. Everything the
repo can carry is already in place (see "Done in the repo" at the end); the rest needs the Apple
Developer account.

Build the bundle and sync it first: `npm run ios` (then `npm run ios:open` for Xcode).

## 1. Apple Developer account and the app record

- [ ] Join the Apple Developer Program (the account that will publish the app).
- [ ] App Store Connect → Apps → **+ New App**: platform iOS, name **Sway Tower**, primary
      language English, bundle id **com.montymac.swaytower** (register it first under
      Certificates, Identifiers & Profiles → Identifiers, with the **Game Center** capability
      ticked; Xcode's automatic signing ticks it too once the target has the capability), SKU e.g.
      `swaytower`, full access.
- [ ] Note the app's **Apple ID** (the number on the App Information page). Put it in
      `APP_STORE_ID` in `src/native/native.ts`: "Rate Sway Tower" in Settings then opens the App
      Store's review page instead of only asking StoreKit for the in-app prompt (which may not show).

## 2. Xcode: signing and versions

- [ ] Open `ios/App/App.xcodeproj`, target **App** → Signing & Capabilities: tick *Automatically
      manage signing* and pick the **Team**. Bundle Identifier stays `com.montymac.swaytower`.
- [ ] Same tab: the **Game Center** capability must show. The repo already carries it
      (`App/App.entitlements` with `com.apple.developer.game-center`, wired as
      `CODE_SIGN_ENTITLEMENTS` in both configurations), so Xcode lists it as soon as a team is
      set; if it doesn't, **+ Capability → Game Center** (it must not add a second entitlements
      file). With a team set, Xcode turns Game Center on for the App ID itself. Nothing else is
      needed (no push, iCloud or in-app purchase). Simulator builds with `CODE_SIGNING_ALLOWED=NO`
      keep working without a team.
- [ ] General → Identity: **Version** (MARKETING_VERSION, now 0.1.0, the same as `package.json`) and **Build**
      (CURRENT_PROJECT_VERSION, now 1). Keep `package.json`'s `version` in step with it: the
      Settings sheet shows that one, and the review ask is "once per version" by it
      (`src/version.test.ts` fails `npm run check` when the two differ). Bump the build number
      for every upload.
- [ ] Deployment target is iOS 15.0; device family iPhone + iPad, portrait only (iPad: portrait and
      upside down, as App Review wants for a portrait-locked app). Leave *Requires full screen* on.
- [ ] Build to a real device once (Product → Run) and play a full run: haptics, the game-over
      boom, the Settings sheet (Haptics and Motion switches), Credits → Font licenses, and
      "Rate Sway Tower" (the in-app prompt only shows on a device signed in to the App Store; in
      development builds it always shows, in TestFlight never, in the store at StoreKit's discretion).
- [ ] Settings → Accessibility → VoiceOver on: the title's buttons read their names, the canvas
      reads "Drop the bar" in a run, and each landing is spoken ("Twelve", "Perfect, thirteen").
      Settings → Accessibility → Motion → Reduce Motion: the blast shakes nothing and the sheets
      stop sliding (Motion = Auto in the game's Settings).
- [ ] Settings → Display → Text Size: the sheets' text grows a little with it (capped); the
      game's HUD does not (it scales with the screen).
- [ ] Game Center on the device (needs section 3b done first, so the ids exist): sign the
      device in under Settings → Game Center (a development build uses Apple's sandbox
      environment on its own). Launch the app: nothing Game Center-related shows on the title.
      Tap PLAY: the sign-in goes through quietly (the welcome banner drops in) and, back on the
      title after the run, the Game Center bubble (the access point) sits bottom-left; it is gone
      during a run and under the sheets. Finish a run: the score is on the mode's leaderboard
      (Settings → Game Center → Leaderboard, or the bubble); a medal earned shows GameKit's
      banner once the game-over card is up (never mid-run) and is in Medals → "See in Game
      Center"; the first sign-in sends every medal already in the save up without banners. Sign
      out in Settings → Game Center, launch
      and PLAY: the sign-in sheet comes up once; dismiss it, and the game never asks again
      (Settings → Game Center row says "Not signed in" with a **Sign in** button that does ask).
- [ ] Share: on the game-over card tap **Share**: the share sheet shows the tower as a
      1080×1920 picture with the line "I stacked 24 bars in Sway Tower (Drop) — can you beat
      it?"; on an iPad the sheet is a popover from the Share button. **Save Image** asks once
      for permission to add to Photos (the line under the question is ours:
      `NSPhotoLibraryAddUsageDescription` in `Info.plist`; without it iOS leaves Save Image out
      of the sheet). Look at the saved picture: the tower as it stood, the HUD, the footer band in
      the skin's faces ("I stacked 24 / in Sway Tower / Drop · Sky Islands").
- [ ] Game Center can't be tried in the Simulator: it needs a signed-in Game Center account and
      the app's record (section 3b); a Simulator build here answers "not signed in" and the
      game carries on quietly, which is the path a player without Game Center takes.

## 3. Archive and upload

- [ ] Product → Scheme → App, destination *Any iOS Device (arm64)*, Product → **Archive**.
- [ ] Organizer → Distribute App → App Store Connect → Upload (automatic signing). Export
      compliance is answered in the bundle (`ITSAppUsesNonExemptEncryption = NO`: HTTPS only, no
      custom crypto), so no prompt should come.
- [ ] TestFlight: install the build on an iPhone and an iPad; play on both.

## 3b. App Store Connect: Game Center

The ids are defined once in `src/native/gamecenter.ts` (`LEADERBOARDS`, `GAME_CENTER_ACHIEVEMENTS`)
and the achievement ids are the medal ids from `src/achievements.ts`; App Store Connect must match
them exactly, and an id can't be changed once created. Apple describes these ids as alphanumeric:
if the form refuses the dash in `stack-5`, create them as `stack_5` … `perfect_30` instead and
change only `achievementId()` in `src/native/gamecenter.ts` (one line; the medal ids in the saves
never change).

- [ ] App Store Connect → the app → **Services → Game Center** (left column) → enable Game
      Center for the app (the "Enable Game Center" toggle on the app, not on a version).
- [ ] **Leaderboards → +**, type *Classic*, two of them (no group, no limits, no reset):

      | Reference name | Leaderboard ID | Score format | Submission | Sort | Range |
      |---|---|---|---|---|---|
      | Tallest tower · Slide | `slide.best` | Integer | Best score | High to Low | none |
      | Tallest tower · Drop | `drop.best` | Integer | Best score | High to Low | none |

      Localization (English, US), the same for both: Name **Tallest tower (Slide)** /
      **Tallest tower (Drop)**, score format *Integer*, format suffix singular **bar**, plural
      **bars** (so the board reads "24 bars"), image optional (512×512 PNG, e.g. the app icon's
      tower). The app submits a score at every game over in that mode and each mode's best on
      sign-in; GameKit keeps the best, so "Best score" is right.
- [ ] **Achievements → +**, 30 of them, all *not hidden* (the Medals screen shows the whole
      ladder, so Game Center can too), *achievable once*. Points by metal: bronze 10, silver 20,
      gold 40 (670 of Apple's 1000 in all, each under its 100 cap). Reference name = the title.

      | Achievement ID | Title | Pre-earned description | Earned description | Points |
      |---|---|---|---|---|
      | `stack-5` | Stack 5 | Stack 5 bars in one run | Stacked 5 bars in one run | 10 |
      | `stack-10` | Stack 10 | Stack 10 bars in one run | Stacked 10 bars in one run | 10 |
      | `stack-15` | Stack 15 | Stack 15 bars in one run | Stacked 15 bars in one run | 10 |
      | `stack-20` | Stack 20 | Stack 20 bars in one run | Stacked 20 bars in one run | 10 |
      | `stack-25` | Stack 25 | Stack 25 bars in one run | Stacked 25 bars in one run | 10 |
      | `stack-30` | Stack 30 | Stack 30 bars in one run | Stacked 30 bars in one run | 10 |
      | `stack-35` | Stack 35 | Stack 35 bars in one run | Stacked 35 bars in one run | 10 |
      | `stack-40` | Stack 40 | Stack 40 bars in one run | Stacked 40 bars in one run | 20 |
      | `stack-45` | Stack 45 | Stack 45 bars in one run | Stacked 45 bars in one run | 20 |
      | `stack-50` | Stack 50 | Stack 50 bars in one run | Stacked 50 bars in one run | 20 |
      | `stack-55` | Stack 55 | Stack 55 bars in one run | Stacked 55 bars in one run | 20 |
      | `stack-60` | Stack 60 | Stack 60 bars in one run | Stacked 60 bars in one run | 20 |
      | `stack-65` | Stack 65 | Stack 65 bars in one run | Stacked 65 bars in one run | 20 |
      | `stack-70` | Stack 70 | Stack 70 bars in one run | Stacked 70 bars in one run | 20 |
      | `stack-75` | Stack 75 | Stack 75 bars in one run | Stacked 75 bars in one run | 40 |
      | `stack-80` | Stack 80 | Stack 80 bars in one run | Stacked 80 bars in one run | 40 |
      | `stack-85` | Stack 85 | Stack 85 bars in one run | Stacked 85 bars in one run | 40 |
      | `stack-90` | Stack 90 | Stack 90 bars in one run | Stacked 90 bars in one run | 40 |
      | `stack-95` | Stack 95 | Stack 95 bars in one run | Stacked 95 bars in one run | 40 |
      | `stack-100` | Stack 100 | Stack 100 bars in one run | Stacked 100 bars in one run | 40 |
      | `perfect-3` | Perfect ×3 | 3 perfect drops in a row | Landed 3 perfect drops in a row | 10 |
      | `perfect-6` | Perfect ×6 | 6 perfect drops in a row | Landed 6 perfect drops in a row | 10 |
      | `perfect-9` | Perfect ×9 | 9 perfect drops in a row | Landed 9 perfect drops in a row | 10 |
      | `perfect-12` | Perfect ×12 | 12 perfect drops in a row | Landed 12 perfect drops in a row | 10 |
      | `perfect-15` | Perfect ×15 | 15 perfect drops in a row | Landed 15 perfect drops in a row | 20 |
      | `perfect-18` | Perfect ×18 | 18 perfect drops in a row | Landed 18 perfect drops in a row | 20 |
      | `perfect-21` | Perfect ×21 | 21 perfect drops in a row | Landed 21 perfect drops in a row | 20 |
      | `perfect-24` | Perfect ×24 | 24 perfect drops in a row | Landed 24 perfect drops in a row | 40 |
      | `perfect-27` | Perfect ×27 | 27 perfect drops in a row | Landed 27 perfect drops in a row | 40 |
      | `perfect-30` | Perfect ×30 | 30 perfect drops in a row | Landed 30 perfect drops in a row | 40 |

      Each needs an English localization with those three texts and a 512×512 image (the
      medal art: `src/medals.ts` draws it; a 512×512 PNG per medal can be exported from the
      Medals screen's SVG, or one coin and one seal image reused across each ladder).
      `npx tsx -e` on `GAME_CENTER_ACHIEVEMENTS` prints this table if it ever changes
      (`src/native/gamecenter.test.ts` holds it to the medal ladders).
- [ ] The **version** page (section 4) → Game Center: tick it and add both leaderboards and all
      30 achievements to the version. They go live with the version; until then, the sandbox has
      them for development and TestFlight builds.
- [ ] Once there is an App Store page (or the landing page is up), put its https link in
      `SHARE_LINK` in `src/share.ts`: the shared line then ends with it.

## 4. App Store Connect: the listing

(The copy, screenshots and the landing page come from the store kit in `store/`.)

- [ ] App Information: name, subtitle, category **Games → Arcade** (secondary: Casual), content
      rights (does not contain third-party content: all music is our own arrangement of our own
      theme from CC0 recordings; fonts are OFL / Apache, credited in the app).
- [ ] Pricing: free (or the chosen price); availability.
- [ ] **App Privacy**: Data Not Collected. The app runs offline, has no analytics, ads, accounts
      or network calls of its own (`PrivacyInfo.xcprivacy` declares no tracking, no collected
      data, and UserDefaults access with reason CA92.1 for the saves). Game Center's scores and
      the player's alias go to Apple through GameKit, not to us; check the questionnaire's
      current wording on data only Apple collects, but nothing reaches the developer. Saving the
      share picture is add-only access to Photos (nothing read).
- [ ] Age rating: answer the questionnaire; expect **4+** (no violence, no gambling, no web
      access, no user content).
- [ ] Version page: screenshots for 6.9" and 6.5" iPhones and 13" iPad (portrait), promotional
      text, description, keywords, support URL, marketing URL (the landing page), copyright
      ("© 2026 Turk White" — confirm the name as it should appear; it is also in the Credits
      sheet, `AUTHOR` in `src/credits.ts`).
- [ ] Review notes: "Single-tap arcade game. No account of its own and no network of its own;
      Game Center (leaderboards, achievements) is optional and offered after the first PLAY.
      Tap anywhere to drop the bar." Pick the uploaded build, then **Submit for Review**.

## 5. After launch

- [ ] Set `APP_STORE_ID` (step 1) and `SHARE_LINK` (step 3b) if they weren't known before the
      first submission; ship them in the next build.

## Done in the repo

- `Info.plist`: display name "Sway Tower"; portrait only, iPad adds upside-down portrait;
  full screen, status bar hidden; `ITSAppUsesNonExemptEncryption = NO`; `arm64` required.
- `PrivacyInfo.xcprivacy` (in the App target's resources): no tracking, no collected data,
  UserDefaults CA92.1.
- `NativePlugin.swift`: the review prompt (`SKStoreReviewController` / `AppStore.requestReview`)
  and opening the store page; registered in `GameViewController.capacitorDidLoad`. The JS side is
  `src/native/native.ts`; the ask policy (`src/native/rate.ts`): on the game-over card, after a
  new best, from the third run on, once per version.
- Game Center (`NativePlugin.swift` with GameKit; policy in `src/native/gamecenter.ts`): sign-in
  once per launch after the first PLAY (never before a gesture; GameKit's sheet is presented over
  the game, which pauses), a dismissed sheet remembered under `sway-stack:gamecenter` so the game
  never asks again on its own (Settings → Game Center → Sign in does), each game over to
  `slide.best` / `drop.best`, a run's medals reported at 100% with its game-over card (GameKit's
  banner there, not mid-run) and the whole save, banner-free, on each sign-in, the access point
  bottom-leading on the title only, Game Center's leaderboard and
  achievements screens from Settings and Medals. `App.entitlements` carries
  `com.apple.developer.game-center`. On the web none of it shows.
- Share (`NativePlugin.swift` → `UIActivityViewController`, anchored to the Share button for the
  iPad popover; `src/share.ts` draws the 1080×1920 card through the renderer; the web uses the
  Web Share API with files where it exists and the page may use it, else the button is hidden).
  `Info.plist` carries `NSPhotoLibraryAddUsageDescription` ("Save a picture of your tower to
  Photos.") for the sheet's Save Image; it is add-only, nothing is read from Photos, so App
  Privacy stays "Data Not Collected".
- App icon (1024², opaque) and launch image (aspect-fill storyboard) from `npm run ios:art`.
- Offline: fonts, songs and effects are inlined in the bundle; the only `fetch` in the code is
  the web Artifact's song files (never reached in the app, where songs are data URLs). No
  analytics, no network.
- Saves (`sway-stack:*` keys, including the new `sway-stack:settings`, `sway-stack:rate` and
  `sway-stack:gamecenter`) are mirrored to Preferences and restored if iOS purges the web view's
  storage.

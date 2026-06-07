# Harborline Master Task List

Last updated: 2026-06-07

This is the canonical task spine for taking Harborline from the current
playable prototype to a polished desktop merchant-strategy game. The goal is a
Tradewinds-like trading run with fast decisions, systemic pressure, a beautiful
map, realistic moving ocean tech, strong save safety, and enough replay texture
that each run creates a new story.

## Major Goal

Ship Harborline as a premium local desktop game where a player can launch
without developer help, play a satisfying 20-60 minute merchant run, make
repeated route/trade/upgrade decisions that feel consequential, see the ocean
affect travel in a believable way, finish with a clear score, and immediately
want another run.

## Product Pillars

- Fast decisions: every screen should help the player answer "what should I do
  next?" within a few seconds.
- Addictive loop: buy, sail, sell, upgrade, take a risk, recover, chase the next
  bigger score.
- Living simulation: markets, weather, water, factions, contracts, crew, and
  ships should affect each other in readable ways.
- Premium feel: realistic ocean, minimalist isometric ships/ports, compact
  strategy UI, crisp feedback, and no decorative clutter.
- Durable desktop product: launchable, save-safe, testable, packaged, and
  recoverable through one-command verification and automated browser smoke.

## Sequenced Roadmap

This is the top-level order of operations. The detailed task board below owns
the exact task IDs, status, proof, and current blocker notes.

1. Validate the current vertical slice with fresh players.
   - Task spine: `Q-001` through `Q-009`, `M-026A` through `M-026C`, `B-003`.
   - Exit criteria: three qualified fresh-player scorecards prove a packaged
     player can launch, understand, play, finish or fail, and want another run;
     every `S0` finding is fixed or explicitly accepted.

2. Freeze and ship the first release candidate.
   - Task spine: `Q-010`, `Q-011`, `M-027`, `M-028`.
   - Exit criteria: scope is locked, no open `S0` blockers remain, package
     smoke passes, `npm run verify` passes, and release notes plus known issues
     are ready.

3. Expand the full-run game only after RC evidence.
   - Task spine: `M-029` through `M-033`.
   - Exit criteria: a defined 20-60 minute run structure supports more ports,
     goods, factions, ships, crew builds, consequences, and replay hooks without
     slowing the first decision or creating one dominant strategy.

4. Raise the production feel.
   - Task spine: `M-036` through `M-040`.
   - Exit criteria: final generated/runtime assets share one approved style,
     the ocean renderer meets the realistic water promise with benchmark proof,
     and audio reinforces feedback without making repeated trading noisy.

5. Harden the desktop release.
   - Task spine: `M-041` through `M-043`.
   - Exit criteria: accessibility, comfort, performance, GPU compatibility,
     save durability, packaging, signing/notarization decisions, distribution
     copy, and support paths are complete.

6. Ship, triage, and decide the next patch.
   - Task spine: `M-044`.
   - Exit criteria: launch feedback is collected, classified, and converted
     into hotfix, patch, or future-content tasks; no urgent launch/save/play
     blocker remains without an owner and recovery path.

## Status Legend

- `[x]` Complete and verified.
- `[~]` In progress or partially implemented.
- `[ ]` Not started or not production-ready.
- `Gate:` or `Exit criteria:` the proof required before the task can be checked
  off.

## Global Exit Criteria

Every implementation task must satisfy these unless a narrower task says
otherwise:

- Code is implemented in the smallest reasonable set of files.
- Persistent state has versioning, migration, and corrupted-save recovery when
  touched.
- Unit or integration tests cover the core rule and edge case.
- `npm run verify` passes.
- Browser smoke checks the actual local app after reload.
- Fresh browser console/runtime errors are zero.
- UI is scannable, compact, and consistent with the existing Harborline design.
- The task updates this file when it changes roadmap status.

## Master Task Board

Start here. This is the authoritative production board. The long historical
sections below remain useful for proof and context, but this board is the work
order. Work from the first open task downward unless a playtest, package smoke,
or verification run creates an `S0` release blocker; then that blocker moves to
the top until it is fixed or explicitly accepted in `RELEASE_BLOCKERS.md`.

### Operating Rules

- Validation before expansion: do not add major systems before `M-028` unless
  they close an `S0` blocker or directly improve the playtest intake path.
- Fresh-player evidence beats taste debate: confusing, boring, or unclear
  moments from scorecards become concrete tasks with reproduction and exit
  proof.
- Keep the run compact: new content must make the buy, sail, sell, upgrade,
  risk, recover loop faster, sharper, or more replayable.
- Keep the ocean promise scoped: `M-039B` is the production water upgrade, but
  it does not reopen the release candidate unless current playtests prove the
  existing water blocks comprehension, desire, or trust.
- Every closed task leaves evidence: tests, browser smoke, packaged smoke,
  report artifacts, scorecards, screenshots, or explicit known-issue notes.

### Success Metrics For The Major Goal

- Three fresh-player scorecards qualify for `M-026A`.
- Qualified scorecards average at least `4/5` on route-choice speed, trade
  clarity, risk readability, addictive pull, and replay desire.
- A fresh player can launch the packaged app, play without developer coaching,
  reach a finish or failure, understand why it happened, and want another run.
- `npm run verify`, browser smoke, package smoke, and ocean benchmark gates
  stay green at every release-candidate checkpoint.
- No open `S0` blockers remain in `RELEASE_BLOCKERS.md`.

### Immediate Execution Queue

This is the next work sequence. Each item should either collect real-player
evidence, close a release blocker, or protect the release-candidate path. Do
not pull work from later phases until this queue is clear unless the new work
directly closes an `S0` issue.

1. [x] `Q-001` Prepare the fresh-player handoff package.
   - Supports: `M-026A`, `B-003`.
   - Exit criteria: `release/playtest-handoff/` contains `Harborline.app`,
     README, observer checklist, collection ledger, scorecard template, and
     handoff manifest.
   - Exit criteria: `release/Harborline-playtest-handoff-0.1.0-arm64.zip`
     exists with adjacent manifest, SHA-256, version, required-session count,
     and score-gate metadata.
   - Current proof: `npm run playtest:handoff` rebuilt the packaged app and
     verified `release/playtest-handoff/` from generated timestamp
     `2026-06-07T06:02:56.478Z`. `npm run playtest:handoff:archive` wrote
     `release/Harborline-playtest-handoff-0.1.0-arm64.zip` and manifest
     timestamp `2026-06-07T06:04:01.098Z` with SHA-256
     `4fdd7b0f2c07eec3752e2581e265e1506e47733ca96a4c87e9c1e97a6a8fdddd`.
     `unzip -l` confirms the archive includes `Harborline.app`,
     `README.md`, `observer-checklist.md`, `collection-ledger.md`,
     `scorecard-template.md`, and `handoff-manifest.json`; extracted
     `app.asar` assets contain `Collect files`,
     `playtest-collection-files`, `harborline.playtestArtifact.latest`,
     `playtest.history.v1.json`, `Observer script read before launch`, and
     `Latest scorecard target`.

2. [x] `Q-002` Confirm the exact playtest protocol.
   - Supports: `M-026A`.
   - Exit criteria: `PLAYTEST_HANDOFF.md`, `PLAYTEST_SCORECARD.md`, and
     `release/playtest-handoff/observer-checklist.md` agree on what the
     observer says, what the observer must not explain, what counts as
     coaching, and which files must be collected after each session.
   - Exit criteria: the observer can explain collection in one sentence:
     save the edited scorecard in Settings, then collect `playtest.latest.md`
     or the assembled `playtest.history.v1.json`.
   - Current proof: `PLAYTEST_HANDOFF.md`, `PLAYTEST_SCORECARD.md`, current
     handoff README, observer checklist, collection ledger, scorecard template,
     and `scripts/playtest_handoff.mjs` now share the no-coaching script,
     allowed-help boundary, and `playtest.latest.md` /
     `playtest.history.v1.json` collection rule. `npx vitest run
     scripts/playtest_handoff.test.mjs` passed `5` tests, and `npm run
     playtest:handoff:verify` passed against `release/playtest-handoff/`.

3. [ ] `Q-003` Recruit three qualified fresh-player sessions.
   - Supports: `M-026A`.
   - Exit criteria: three unique testers are identified who have not built the
     game and can play from the packaged app without developer setup help.
   - Exit criteria: each session has an observer, a session slot in
     `collection-ledger.md`, and a known artifact-return path before play
     starts.
   - Current progress: `PLAYTEST_RECRUITMENT.md` now defines tester criteria,
     invite copy, scheduling checklist, pre-session send notes, the session
     start script, and artifact-return instructions. Actual tester names,
     observers, and scheduled slots still need to be filled before this can
     close. Settings now also exposes a `Collect files` strip in Playtest
     Evidence that names the exact `playtest.latest.md` and
     `playtest.history.v1.json` targets for the current runtime. Generated
     Playtest Evidence packets and Scorecard drafts embed those latest/history
     targets plus no-coaching protocol fields.
   - Current proof: `npx vitest run src/game/playtestEvidence.test.ts` passed
     `4` tests; `npm run build` passed; `npm run browser:smoke` passed at
     `http://127.0.0.1:56831` with browser collection-target and no-coaching
     draft assertions; `npm run desktop:package:mac` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app`; `npm run
     desktop:package-smoke` passed with Electron file-path assertions for the
     generated packet and scorecard; `npm run playtest:handoff:archive`
     refreshed `release/Harborline-playtest-handoff-0.1.0-arm64.zip` with
     SHA-256
     `4fdd7b0f2c07eec3752e2581e265e1506e47733ca96a4c87e9c1e97a6a8fdddd`;
     `npm run verify` passed `33` test files, `291` tests, storage smoke,
     asset verify, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:57250`.

4. [ ] `Q-004` Run fresh-player session 1.
   - Supports: `M-026A`.
   - Exit criteria: tester launches the packaged app, starts a run, makes the
     first route/trade decision, reaches a finish or failure, and answers the
     scorecard without coaching.
   - Exit criteria: Settings reports that the saved scorecard qualifies or the
     observer records the exact missing fields before the tester leaves.

5. [ ] `Q-005` Run fresh-player session 2.
   - Supports: `M-026A`.
   - Exit criteria: same proof as `Q-004`, with a different tester.
   - Exit criteria: any repeated confusion from session 1 is noted without
     changing the build mid-sequence unless it is a launch/save/blocking issue.

6. [ ] `Q-006` Run fresh-player session 3.
   - Supports: `M-026A`.
   - Exit criteria: same proof as `Q-004`, with a third unique tester.
   - Exit criteria: the three scorecards together cover route-choice speed,
     trade clarity, risk readability, addictive pull, replay desire, friction
     log, observer notes, and one strongest next change per session.

7. [ ] `Q-007` Assemble and audit the playtest collection.
   - Supports: `M-026A`, `M-026B`.
   - Exit criteria: either the collected `playtest.history.v1.json` is audited
     directly or the three returned `playtest.latest.md` files are assembled
     with `npm run playtest:collection:assemble`.
   - Exit criteria: `npm run playtest:collection:audit` writes the latest
     collection report and either passes `ready-for-m026b` or names the exact
     missing qualification, score-quality, or release-blocker issue.

8. [ ] `Q-008` Convert playtest findings into the production board.
   - Supports: `M-026B`.
   - Exit criteria: every finding from the collection report is classified as
     `S0`, `S1`, `S2`, or post-release backlog.
   - Exit criteria: every `S0` and `S1` has a surface, reproduction/evidence,
     and exit proof in `RELEASE_BLOCKERS.md`.

9. [ ] `Q-009` Close or accept all playtest `S0` blockers.
   - Supports: `M-026C`.
   - Exit criteria: each `S0` has a code/content/UX fix with focused proof, or
     a written known-issue acceptance that explicitly says why RC can continue.
   - Exit criteria: `npm run verify`, browser smoke, package smoke, and any
     affected report gate pass after the fixes.

10. [ ] `Q-010` Freeze the release-candidate scope.
    - Supports: `M-027`.
    - Exit criteria: `MASTER_TASK_LIST.md`, `RELEASE_BLOCKERS.md`, latest
      playtest triage, and known issues agree on what is in RC, what is
      deferred, and what would reopen the scope.
    - Exit criteria: production water v2, audio, full-game expansion, and
      additional art/content are explicitly deferred unless tied to a remaining
      `S0`.

11. [ ] `Q-011` Build and verify RC1.
    - Supports: `M-028`.
    - Exit criteria: fresh `npm run verify`, `npm run ocean:benchmark`,
      `npm run desktop:package:mac`, and `npm run desktop:package-smoke` pass.
    - Exit criteria: release notes, known issues, recovery instructions,
      version, handoff/feedback channel, and packaged artifact path are ready.

### Phase 1 - Prove The Current Game

1. [ ] `M-026A` Run three qualified fresh-player playtests.
   - Depends on: `M-025F`, `PLAYTEST_SCORECARD.md`, packaged app build.
   - Exit criteria: three archived scorecards from unique fresh-player testers
     are marked qualified by the in-app readiness gate.
   - Exit criteria: each session includes the evidence packet, unique tester,
     observer, first-time-player confirmation, required scores, required
     observer notes, and one single next change.
   - Exit criteria: each player launches the packaged app, makes the first
     route/trade decision, reaches a finish or failure, and answers whether
     they want another run without coaching.

2. [ ] `M-026B` Convert playtest evidence into tasks.
   - Depends on: `M-026A`.
   - Exit criteria: every scorecard finding is classified as release blocker,
     high-value polish, watchlist, or post-release backlog.
   - Exit criteria: repeated confusion, dead turns, unclear risk, weak trade
     desire, or low replay desire becomes a task with reproduction, affected
     surface, owner context, and closure proof.
   - Exit criteria: the triage report and `RELEASE_BLOCKERS.md` agree on all
     `S0` and `S1` findings.

3. [ ] `M-026C` Fix release-blocking playtest issues.
   - Depends on: `M-026B`.
   - Exit criteria: all new `S0` findings have code fixes, content fixes,
     UX/scope fixes, or explicit known-issue acceptance.
   - Exit criteria: each closed blocker has the narrowest useful regression
     proof: unit test, browser smoke, packaged smoke, scorecard replay, or
     documented manual verification.

4. [ ] `M-027` Freeze release-candidate scope.
   - Depends on: `M-026C`.
   - Exit criteria: `MASTER_TASK_LIST.md`, `RELEASE_BLOCKERS.md`, and the
     latest triage report agree on blockers, polish, watchlist, and deferred
     work.
   - Exit criteria: no new engine, content set, economy system, art pass, or UI
     surface can enter the RC without a linked blocker or written scope note.

5. [ ] `M-028` Produce the first release candidate.
   - Depends on: `M-027`.
   - Exit criteria: packaged desktop build installs and launches cleanly,
     preserves and recovers saves, imports/exports saves, quits cleanly, passes
     fresh `npm run verify`, passes browser smoke, passes package smoke, and
     has no open `S0` blockers.
   - Exit criteria: release notes, known issues, recovery instructions, version
     number, and feedback collection path are ready.

### Phase 2 - Expand The Addictive Run

6. [ ] `M-029` Define the full-run structure.
   - Depends on: `M-028`.
   - Exit criteria: target full-session length, run phases, win/loss rules,
     score ladder, challenge starts, replay principles, and explicit non-goals
     are written before adding more raw content.
   - Exit criteria: the design preserves the compact merchant fantasy and
     improves replay desire without permanent power creep.

7. [~] `M-030` Expand ports, routes, goods, and factions.
   - Depends on: `M-029`.
   - Exit criteria: expanded routes support safe, rich, storm, faction,
     contract, and comeback archetypes without slowing the first decision.
   - Exit criteria: new goods and faction pressures create distinct economic
     behavior, not more identical buy-low/sell-high rows.
   - Exit criteria: simulator and playtest evidence show no single dominant
     route family or autopilot strategy.
   - Current progress: added tactical faction favors to the Port Authority so
     standing can be spent on distinct political/economic edges: Charter
     Ledger Credit, Freeport Tide Runner Writ, Admiralty Patrol Cover, and
     League Stevedore Shift. These favors convert standing into cash/debt
     leverage, temporary route-risk relief, local price pressure, or export
     stock refresh instead of leaving politics as a passive modifier. Added
     rolling market quote history so every port/good remembers the last
     several effective prices; Market rows now show whether a quote is new,
     firming, softening, rangebound, rising fast, or falling fast. Added the
     Intel `Moving Markets` block and route/trade tape bias so recent quote
     movement now creates readable buy-the-dip and sell-strength edges instead
     of living only as row-level history. Added `Faction Watch`, a ranked
     political pressure read that aggregates standing and active edicts into
     route-risk and price effects; route picks and best-run reads now name
     political edge, convoy cover, tariff squeeze, inspection risk, and other
     faction pressure when it affects the lane.
   - Current proof: focused faction-favor and reducer tests passed `146`
     tests; `npm run build` passed; escalated `npm run browser:smoke` passed
     at `http://127.0.0.1:65514` with Port Authority favor metadata and effect
     assertions; escalated `npm run verify` passed `35` test files, `304`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:49216`. Market
     history proof: focused market-history, reducer, and economy tests passed
     `156` tests; `npm run build` passed; escalated `npm run browser:smoke`
     passed at `http://127.0.0.1:50755` with market-history label and metadata
     assertions; after one transient headless `pixi:webglcontextlost` smoke
     retry, escalated `npm run verify` passed `37` test files, `311` tests,
     desktop storage smoke, asset verification, production build, artifact
     smoke, and browser smoke at `http://127.0.0.1:52168`. Moving Markets
     proof: focused market-history and economy tests passed `14` tests;
     `npm run build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:52734` with Moving Markets assertions; escalated
     `npm run verify` passed `37` test files, `314` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:52923`. Faction Watch proof: focused
     faction-pressure and economy tests passed `12` tests; `npm run build`
     passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:53300` with Faction Watch assertions; escalated
     `npm run verify` passed `38` test files, `317` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:53465`.

8. [~] `M-031` Expand ships, refits, crew, and facilities.
   - Depends on: `M-030`.
   - Exit criteria: each new build changes at least two core choices across
     route, cargo, risk, crew, encounter, contract, or economy.
   - Exit criteria: Shipyard, Harbor, and planner UI explain tradeoffs without
     requiring raw-stat comparison.
   - Exit criteria: short, medium, and late-game upgrade targets exist without
     forcing one optimal build.
   - Current progress: added named build synergies that activate only when the
     hull, refits, and crew line up: Charter House Rig, Freeport Windknife,
     Admiralty Gunline, and League Freightline. Synergies now apply live stat
     effects through `deriveShipStats` and appear in Harbor as active or
     near-complete build progress, so upgrades point toward recognizable
     strategies instead of isolated stat pips.
   - Current proof: focused build-synergy, shipyard, and equipment-planner
     tests passed `16` tests; `npm run build` passed; escalated `npm run
     browser:smoke` passed at `http://127.0.0.1:49605` with Harbor Build
     Synergies UI and metadata assertions; escalated `npm run verify` passed
     `36` test files, `307` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:49930`.

9. [x] `M-032` Deepen encounters and consequences.
   - Exit criteria: customs, pirates, storms, faction pressure, rescues, and
     contract complications create recovery choices and memorable recap beats.
   - Exit criteria: defensive and encounter equipment matters while the game
     remains a merchant-strategy game rather than a combat game.

10. [x] `M-033` Add production replay systems.
    - Exit criteria: score comparison, build badges, route history, challenge
      starts, and replay prompts make another run feel intentional without
      unlock grinding.

### Phase 3 - Raise Production Feel

11. [~] `M-036` Finish final runtime art.
    - Depends on: style profile, generated asset pipeline, gameplay role briefs.
    - Exit criteria: ship, port/island, faction, character, storm, route, and
      UI cue assets share one approved style and improve readability on the
      actual map, Harbor, Contract, Intel, and recap surfaces.
    - Exit criteria: generated assets have prompt refs, processing metadata,
      QA gates, public/runtime copies, and no accidental placeholder reuse.

12. [x] `M-037` Prototype realistic ocean physics for production.
    - Exit criteria: route samples, water calibration, technology comparison,
      and production recommendation are recorded with report artifacts.

13. [x] `M-038` Integrate physics-backed sailing.
    - Exit criteria: ocean samples drive ETA, risk, hull wear, ship motion,
      wake, storm pressure, and player-facing route explanations from one
      shared model.

14. [x] `M-039` Lock ocean performance and compatibility.
    - Exit criteria: desktop and low-power modes meet FPS, canvas health,
      console health, fallback, and readability gates.

15. [~] `M-039B` Build the production water renderer v2.
    - Depends on: `M-039`, art-direction approval, benchmark harness.
    - Exit criteria: the ocean is an actual waving water surface with
      shader-driven swells, normals, foam, wake response, current fields, and
      buoyancy-style ship motion sourced from the shared ocean model.
    - Exit criteria: desktop, compact, and low-power benchmarks pass with
      nonblank varied pixels, readable routes, zero console/runtime errors, and
      side-by-side visual approval against the art references.
    - Current progress: the live map now reports `production-ocean-surface-v2`,
      `shader-mesh-v2`, and `shader-plus-sampled-surface-v2`; sampled water
      tiles expose current-ribbon, foam-coverage, normal-variance, and
      storm-coverage telemetry from the shared OceanField.

16. [~] `M-040` Implement audio.
    - Depends on: feedback taxonomy, Settings controls.
    - Exit criteria: waves, harbor ambience, UI actions, profit/loss, upgrades,
      storms, customs, pirates, and game-over feedback have tasteful cues with
      mute and volume controls.
    - Exit criteria: repeated trading remains quiet and decision-focused.
    - Current progress: added a procedural Web Audio layer with per-feedback
      cue specs for profit, loss, contracts, crew, customs, game-over, damage,
      insurance, market, pirate, rank-up, route, save, storm, and upgrades.
      The app now maintains scene ambience for harbor, open-water, and
      encounter states, plays cues from the live Feedback Pulse, and exposes
      compact mute, volume, and cue-test controls in Settings.
    - Current proof: focused audio and feedback tests passed `11` tests;
      `npm run build` passed; escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:65027` with audio Settings and current feedback cue
      assertions; escalated `npm run verify` passed `34` test files, `300`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:65236`.

### Phase 4 - Ship Like A Desktop Product

17. [ ] `M-041` Run accessibility and comfort release pass.
    - Depends on: RC UI freeze.
    - Exit criteria: keyboard flow, focus, reduced motion, text scaling,
      contrast, icon names, readable error states, and compact layout are
      verified in the packaged app.

18. [ ] `M-042` Run performance, compatibility, and save durability QA.
    - Depends on: `M-041`.
    - Exit criteria: supported OS, display, and GPU profiles launch, render,
      save, recover, import/export, update, uninstall/reinstall, and quit
      without data loss or console/runtime errors.

19. [ ] `M-043` Prepare distribution.
    - Depends on: `M-042`.
    - Exit criteria: final packaging, signing/notarization decision, installer
      or archive shape, release notes, known issues, support copy, versioning,
      and feedback channel are complete.

20. [ ] `M-044` Ship and triage post-release feedback.
    - Depends on: `M-043`.
    - Exit criteria: launch feedback is collected, classified, and converted
      into hotfix, patch, or future-content tasks.
    - Exit criteria: no urgent save, launch, or blocking play issue remains
      without an owner and recovery path.

## Master Production Sequence Archive

This section preserves the detailed implementation sequence and proof history.
It is useful for audits and context, but the active source of truth is the
`Master Task Board` above.

### Stage 1 - Content-Complete Vertical Slice

1. [x] `M-025A` Audit the current slice against the target.
   - Depends on: `M-003`, `VERTICAL_SLICE_TARGET.md`.
   - Exit criteria: ports, goods, ships, refits, crew, contracts, factions,
     events, ocean states, saves, score, and recap are checked against the
     slice promise.
   - Exit criteria: every missing or weak piece is filed as a concrete task in
     this list or explicitly deferred as post-slice.
   - Exit criteria: `B-004` has an updated evidence note showing what remains
     before scope freeze.
   - Current proof: `VERTICAL_SLICE_AUDIT.md` checks the slice promise and
     content scope against current code, tests, browser smoke, package/storage
     evidence, asset metadata, and release blockers. It identifies M-025F as
     the remaining internal gate, keeps B-003 open for external scorecards, and
     leaves W-001/W-002/W-003 as watchlist items rather than pretending they are
     release-candidate closure.

2. [~] `M-025B` Finish the ship, refit, and crew build ladder.
   - Depends on: `M-010`, `M-017`.
   - Exit criteria: at least five recognizable player builds are viable in a
     20-minute run: fast courier, balanced trader, storm sailor, armored
     hauler, and heavy cargo or market manipulator.
   - Exit criteria: each build has one ship target, two or more supporting
     refits or facilities, a crew interaction, a visible route/trade reason,
     and a meaningful downside.
   - Exit criteria: Shipyard and Harbor previews explain build deltas without
     making the player compare raw stats manually.
   - Current progress: added the League Carrier as a fifth playable ship and
     the first explicit Heavy Cargo hull path. It has League faction pricing,
     a heavy-freighter role label, cargo-first handling, Shipyard preview
    support, sprite metadata, generated/public asset files, and
     supporting refit fit bonuses for cargo hoist, reinforced ribs, ballast
     keel, crew quarters, and galley mess. Added the Heavy Cargo build
     archetype so build badges can distinguish bulk-margin play from armored
     hauling. Added pirate encounter tactics with a visible Fight/Warn/Run
     read; the new `Warn Off` action uses cannons, gunnery, signal guns, hull,
     navigation, and Admiralty standing so armed builds have a distinct
     low-damage option between paying, fleeing, and fighting. Added Broker
     Packet as a market-manipulator action: negotiation, standing, permits,
     and selected-route market reads now price a paid packet that creates a
     short-lived shortage or glut rumor plus a small stock nudge, giving
     broker/quartermaster builds an active way to create a timed trade edge.
   - Current proof: focused `shipyard` and `visuals` tests passed `7` tests,
     reducer/equipment tests passed `131` tests, `npm run assets:verify`
     passed with `5 ships, 6 ports, 13 total entries`, `npm run build` passed,
     escalated `npm run browser:smoke` passed at `http://127.0.0.1:59927`,
     and escalated `npm run verify` passed `195` tests, desktop storage smoke,
     asset verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:59955`. The follow-up encounter pass added
     `encounters.test.ts`; focused encounter/reducer tests passed `129` tests,
     escalated browser smoke passed at `http://127.0.0.1:60140`, and escalated
     full `npm run verify` passed `198` tests, desktop storage smoke, asset
     verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:60208`. Broker Packet proof: focused economy/reducer
     tests passed `135` tests, browser smoke passed at
     `http://127.0.0.1:61969`, and escalated full `npm run verify` passed
     `209` tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:62318`.

3. [~] `M-025C` Finalize the six-port map identity.
   - Depends on: `M-012`, `M-019`.
   - Exit criteria: each port has a distinct market identity, faction pressure,
     visual silhouette, and at least one route reason to visit it.
   - Exit criteria: the map makes route choice readable at a glance: safe lane,
     rich lane, storm lane, faction lane, and contract lane.
   - Exit criteria: browser smoke or a manual in-app check confirms no map UI
     overlap, blank art, clipped port labels, or unreadable route telemetry.
   - Current progress: added `portIdentity.ts` with explicit market, politics,
     route, map-tag, and visual-cue identity for all six ports: Grayhaven as
     Counting House, Saffron Quay as Spice Rush, Glassport as Contract
     Exchange, Stormhook as Hard-Water Arsenal, Orchid Roads as Luxury
     Roadstead, and Lowmarket as Labor Wharf. The live destination read now
     combines that identity with current freight pressure, route risk, days,
     logistics pressure, faction standing, and best cargo fit.
   - Current proof: focused port identity/economy/reducer tests passed `133`
     tests; browser smoke now asserts current and selected port identity hooks
     plus Route Command `Port` telemetry; escalated `npm run browser:smoke`
     passed at `http://127.0.0.1:60357`; escalated full `npm run verify`
     passed `201` tests, desktop storage smoke, asset verification, production
     build, artifact smoke, and browser smoke at `http://127.0.0.1:60468`.

4. [~] `M-025D` Tune the 20-minute run arc.
   - Depends on: `M-004` through `M-007`, `M-025B`.
   - Exit criteria: a normal run reliably produces a first win, a temptation,
     a setback or near miss, a recovery path, one upgrade, and a clear end
     state inside the target session length.
   - Exit criteria: simulator snapshots stay inside target bands for survival,
     bankruptcy, contracts, upgrades, score, and dominant goods.
   - Exit criteria: playtest trace shows no unexplained dead-turn streaks and
     at least five distinct "one more route" reasons.
   - Current progress: added `runGoals.ts` and a compact left-ledger Run Arc
     panel that derives live run milestones from actual state and logs:
     First Profit, Pressure Read, Recovery Line, Build Pivot, and Close Ledger.
     Goals become active or complete from real events such as profitable sales,
     contract completion, pirate/customs/storm pressure, repairs, borrowing,
     cargo insurance, shore leave, upgrades, crew, skills, ships, and late-run
     day pressure. This makes the 20-minute arc readable without adding a
     separate tutorial surface. Added a Market Pulse forecast layer that turns
     price fluctuation into a causal read from trends, stock depth, freight
     pressure, faction politics, rumors, and market access. The Market desk now
     shows per-good forecast labels, next-price bias, confidence, and drivers;
     the Intel panel ranks the strongest local market pulses.
   - Current proof: focused `runGoals` and reducer tests passed `129` tests;
     browser smoke now asserts the Run Arc and First Profit hooks; escalated
     `npm run browser:smoke` passed at `http://127.0.0.1:60588`; escalated
     full `npm run verify` passed `204` tests, desktop storage smoke, asset
     verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:60647`. Follow-up Market Pulse proof: focused
     economy/reducer tests passed `133` tests, browser smoke passed at
     `http://127.0.0.1:61316`, and escalated full `npm run verify` passed
     `207` tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:61366`.

5. [~] `M-025E` Polish end-state, recap, and replay hooks.
   - Depends on: `M-007`, `M-020`, `M-025D`.
   - Exit criteria: win, failure, bankruptcy, ship-loss, and retirement states
     explain why the run ended and what the player accomplished.
   - Exit criteria: recap names the player's build identity, best trade,
     worst mistake, faction/crew consequence, and next-run challenge.
   - Exit criteria: starting from a replay hook creates a meaningfully different
     opening without adding permanent power progression.
   - Current progress: added an explicit Run Story recap section derived from
     actual run evidence. It names Build Identity, Best Trade, Worst Mistake,
     Faction Wake, Crew Wake, and Next Challenge using build-fit scoring, score
     breakdown, logged profit/loss, failed-contract exposure, standing, crew
     rank/morale, and replay hooks. Replay hook cards now expose stable setup,
     target, and hook-id metadata, and browser smoke starts a replay-hook run
     from the recap to prove the next-run loop lands back in an actionable run.
   - Current proof: focused reducer recap tests passed `126` tests; `npm run
     build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:60930`; escalated full `npm run verify` passed `204`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:60993`. Follow-up
     replay-hook UI proof: reducer replay tests passed `127` tests, browser
     smoke passed at `http://127.0.0.1:62506`, and escalated full
     `npm run verify` passed `209` tests, desktop storage smoke, asset
     verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:62579`.

6. [x] `M-025F` Verify the content-complete vertical slice.
   - Depends on: `M-025A` through `M-025E`.
   - Exit criteria: `npm run verify`, `npm run ocean:benchmark`,
     `npm run desktop:package:mac`, and `npm run desktop:package-smoke` pass.
   - Exit criteria: a manual packaged-app run reaches an upgrade and a recap
     without developer tools or console errors.
   - Exit criteria: `B-004` can move from `Open` to `Needs Evidence` or
     `Closed`.
   - Current proof: fresh escalated `npm run verify` passed `21` test files,
     `209` tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser regression smoke at
     `http://127.0.0.1:62913`. Fresh escalated `npm run ocean:benchmark`
     passed and wrote `reports/ocean-benchmark-latest.json`: default desktop
     `balanced/shader-mesh-v1` averaged `39.4 FPS`, compact desktop averaged
     `55 FPS`, low-power averaged `28.5 FPS`, compact low-power averaged
     `28.8 FPS`, and all four cases reported `fallback none`. Fresh escalated
     `npm run desktop:package:mac` built
     `release/Harborline-darwin-arm64/Harborline.app`. Fresh escalated
     `npm run desktop:package-smoke` passed packaged launch/import/recover,
     installed-app persistence, abrupt-exit recovery, update replacement,
     uninstall/reinstall preservation, and a packaged vertical-slice proof that
     imports an upgrade-ready run, buys Weather Glass through the Harbor UI,
     saves the upgraded run to disk, imports a closed ledger, and verifies
     Run Recap, Run Story, and Replay Hooks without console/page errors.

### Stage 2 - External Playtest And Release Candidate

7. [ ] `M-026A` Run three fresh-player playtests.
   - Depends on: `M-025F`, `PLAYTEST_SCORECARD.md`.
   - Exit criteria: three people who did not build the game launch the packaged
     app, play without coaching, and fill out scorecards.
   - Exit criteria: each session captures route-choice speed, trade clarity,
     risk readability, addictive pull, replay desire, confusion, dead turns,
     and the single strongest next fix.
   - Current progress: added in-app Playtest Evidence and Playtest Scorecard
     generation in Settings. Observers can generate a raw evidence packet or a
     complete scorecard draft with build/runtime/storage context, current run
     state, route-choice recommendations, contracts, faction standing, runtime
     error count, recent ledger entries, auto-filled completed route-loop rows,
     scoring tables, friction log, balance checks, decision field, follow-up
     tasks, and the attached evidence packet from the packaged app. The
     generated artifact is editable in-app, then can be saved to app-owned
     storage as `playtest.latest.md` and archived in bounded history as
     `playtest.history.v1.json` for collection after the session. Save status
     reports the archive count so observers can tell that repeated sessions
     are being retained instead of silently overwritten. Route history is saved
     and normalized so completed crossings can prefill the first five
     loop-trace rows without relying on memory. Settings now reads the bounded
     playtest history and exposes an `M-026A` readiness card. Readiness now
     counts only unique qualified fresh-player testers with tester/observer
     fields, `First-time player: yes`, required core scores, required observer
     notes, and a single next change; blank generated drafts and duplicate
     tester scorecards remain archived but do not move the three-session gate.
     Settings and the generated triage report now also list the first missing
     qualification fields, so observers can fix an incomplete scorecard during
     the session instead of discovering it after collection. Settings now also
     has a pre-save `Check` action that rejects raw evidence packets and
     validates the editable scorecard against the same field rules before the
     observer archives it. A live Current Scorecard status card now shows
     whether the draft is empty, not a scorecard, incomplete, or qualified
     while the observer edits it. Save confirmations now tell observers whether
     an archived scorecard qualifies for `M-026A` or which fields still prevent
     it from counting. Added a repeatable `npm run playtest:handoff` command
     that rebuilds the packaged macOS app and writes
     `release/playtest-handoff/` with `Harborline.app`, a generated README,
     observer checklist, scorecard template, and manifest recording the build,
     three-session requirement, and `4/5` score-quality gate. The handoff now
     self-audits with `npm run playtest:handoff:verify`, which checks the app
     bundle, manifest schema/version, score gate, observer checklist, README,
     collection ledger, and scorecard template before the folder is used with
     testers.
     Added `npm run playtest:collection:audit` for post-session collection
     proof. It reads a collected `playtest.history.v1.json`, writes a markdown
     Collection Audit with readiness, score-quality, release-blocker count, and
     the generated triage report, and exits nonzero unless three unique
     qualified scorecards clear the `4/5` release score gate with no release
     blockers.
     Added `npm run playtest:collection:assemble` for the common case where
     three sessions return as separate `playtest.latest.md` scorecard files
     from different machines. It writes a canonical `playtest.history.v1.json`
     and can immediately produce the Collection Audit with `--audit-out`, so
     external scorecards can move into the same readiness and triage gate
     without manual JSON editing.
     Added `npm run playtest:handoff:archive` to turn the verified handoff
     folder into a distributable zip while preserving `Harborline.app` as a
     macOS bundle. The command writes an adjacent archive manifest with size,
     SHA-256, source handoff, build version, required session count, and score
     gate.
   - Current proof: focused `persistence` and `playtestEvidence` tests passed
     `9` tests; focused Electron storage tests passed `3` tests; focused
     `playtestEvidence` and `reducer` tests passed `131` tests; focused
     `playtestTrace` test passed; escalated full `npm run verify` passed `22`
     test files, `215` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:64392`; escalated `npm run desktop:package:mac` built
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed and asserts the packaged Electron
     Playtest Evidence packet, editable Playtest Scorecard draft,
     `playtest.latest.md` file write with edited observer text, lifecycle, and
     upgrade-to-recap smoke. Follow-up editable artifact proof: escalated full
     `npm run verify` passed with browser smoke at `http://127.0.0.1:64672`,
     and escalated `npm run desktop:package-smoke` passed with edited
     packaged-scorecard file assertions.
     Follow-up stricter smoke proof: escalated `npm run browser:smoke` passed
     at `http://127.0.0.1:63862` with assertions that save export includes
     `routeHistory` and the Playtest Evidence packet contains a nonblank
     completed route-loop row; escalated `npm run desktop:package-smoke`
     passed with route-loop packet assertions in Electron. Latest archive
     proof: focused `persistence` passed `5` tests, focused Electron storage
     passed `3` tests, `npm run build` passed, escalated full
     `npm run verify` passed `22` test files, `215` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:64905`; escalated
     `npm run desktop:package:mac` built
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed with assertions that edited
     scorecard text is written to both `playtest.latest.md` and
     `playtest.history.v1.json`. Readiness-card proof: focused
     `playtestReadiness`, `persistence`, and `playtestEvidence` tests passed
     `12` tests; `npm run build` passed; in-app browser check at
     `http://127.0.0.1:59013/?verify=playtest-readiness` showed Settings
     readiness advancing from `0/3 scorecards archived` to
     `1/3 scorecards archived`, status `collecting`, and Runtime Clean after
     saving a generated scorecard; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:59611`; escalated full `npm run verify` passed `29`
     test files, `264` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:59698`. Pre-save Check proof: focused
     playtest/storage tests passed `22` tests; `npm run build` passed;
     escalated `npm run browser:smoke` passed at `http://127.0.0.1:61991`
     with assertions that raw evidence is rejected by `Check` and incomplete
     scorecards report missing tester/observer before archive save; escalated
     full `npm run verify` passed `30` test files, `274` tests, desktop
     storage smoke, asset verification, production build, artifact smoke, and
     browser smoke at `http://127.0.0.1:62035`. Current-draft status proof:
     focused playtest/storage tests passed `22` tests; `npm run build` passed;
     escalated `npm run browser:smoke` passed at `http://127.0.0.1:62497`
     with assertions for the empty, non-scorecard, generated-incomplete, and
     edited-incomplete current-scorecard status panel states. Follow-up full
     verification passed after making contract-chain follow-up posting
     deterministic: focused reducer chain test passed, full reducer suite
     passed `138` tests, and escalated `npm run verify` passed `30` test
     files, `274` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:62784`. Qualification-aware Save proof: focused
     playtest/storage/reducer checks passed `19` tests, `npm run build`
     passed, and escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:63019` with assertions that saved incomplete scorecards
     report `does not qualify` in the Save confirmation. Escalated
     `npm run verify` passed `30` test files, `274` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:63153`. Packaged intake proof: escalated
     `npm run desktop:package:mac` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed with packaged assertions for the
     Current Scorecard status card, missing tester/observer fields, and
     `does not qualify` Save confirmation inside Electron app-owned storage.
     Unique-tester gate proof: focused playtest tests passed `24` tests;
     `npm run build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:64069`; escalated `npm run desktop:package:mac` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed; escalated `npm run verify` passed
     `30` test files, `276` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:64559`. Score-quality gate proof: focused playtest
     tests passed `26` tests; `npm run build` passed; escalated
     `npm run browser:smoke` passed at `http://127.0.0.1:65085`; escalated
     `npm run desktop:package:mac` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed; escalated `npm run verify` passed
     `30` test files, `278` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:65319`. Final score-gate wording proof: focused
     `playtestTriage` and `playtestReadiness` tests passed `15` tests;
     `npm run build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:49312`; escalated `npm run desktop:package:mac`
     rebuilt `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed; escalated `npm run verify` passed
     `30` test files, `278` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:49585`. Playtest handoff proof: focused
     `playtest_handoff` test passed; full `npm run test` passed `31` test
     files and `279` tests; escalated `npm run playtest:handoff` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app` and wrote
     `release/playtest-handoff/` with the app, README, observer checklist,
     scorecard template, and `handoff-manifest.json`; escalated
     `npm run verify` passed `31` test files, `279` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:50475`; escalated
     `npm run desktop:package-smoke` passed. Handoff audit proof: focused
     `playtest_handoff` tests passed `2` tests; `npm run
     playtest:handoff:verify` passed against the existing handoff; escalated
     `npm run playtest:handoff` rebuilt and verified `release/playtest-handoff/`.
     Full audit verification passed: `npm run test` passed `31` test files and
     `280` tests, escalated `npm run verify` passed `31` test files, `280`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:51155`, and
     escalated `npm run desktop:package-smoke` passed. Collection-ledger proof:
     focused `playtest_handoff` tests passed `3` tests; escalated `npm run
     playtest:handoff` rebuilt and self-verified schema `2`
     `release/playtest-handoff/` with `collection-ledger.md`; `npm run test`
     passed `31` test files and `281` tests; escalated `npm run verify` passed
     `31` test files, `281` tests, desktop storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:52065`; escalated `npm run desktop:package-smoke`
     passed. Collection audit proof: focused `playtestCollectionAudit`,
     `playtestTriage`, and `playtestReadiness` tests passed `21` tests;
     CLI smoke `npm run playtest:collection:audit -- --history
     /tmp/harborline-collection-audit/playtest.history.v1.json --out
     reports/playtest-collection-cli-smoke.md` passed with `ready-for-m026b`,
     `3/3 unique qualified testers`, score quality `passing`, and zero release
     blockers; `npm run test` passed `32` test files and `287` tests; `npm run
     build` passed; escalated `npm run verify` passed `32` test files, `287`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:53661`;
     escalated `npm run desktop:package-smoke` passed.
     Separate-scorecard assembly proof: focused `playtestCollectionAssembly`
     and `playtestCollectionAudit` tests passed `8` tests; CLI smoke `npm run
     playtest:collection:assemble -- --scorecard /tmp/harborline-collection-assemble/session-one.md --scorecard
     /tmp/harborline-collection-assemble/session-two.md --scorecard
     /tmp/harborline-collection-assemble/session-three.md --out
     reports/playtest-collection-assembled-smoke.history.json --audit-out
     reports/playtest-collection-assembled-smoke.md` passed with
     `ready-for-m026b`, `3/3 unique qualified testers`, and score quality
     `passing`; `npm run test` passed `33` test files and `289` tests; `npm run
     build` passed; escalated `npm run verify` passed `33` test files, `289`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:54488`;
     escalated `npm run desktop:package-smoke` passed.
     Handoff archive proof: focused `playtest_handoff` tests passed `5` tests;
     `npm run playtest:handoff:archive` verified `release/playtest-handoff/`,
     wrote `release/Harborline-playtest-handoff-0.1.0-arm64.zip`, wrote
     `release/Harborline-playtest-handoff-0.1.0-arm64.zip.manifest.json`, and
     recorded SHA-256
     `199a66d59fec2290e420f0504c7e68905fdb745cde0d7898ae2df4735dc6cdf7`;
     `unzip -l` confirmed the archive contains `playtest-handoff/`,
     `collection-ledger.md`, `README.md`, `observer-checklist.md`,
     `scorecard-template.md`, and `Harborline.app`; `npm run test` passed `33`
     test files and `291` tests; `npm run build` passed; escalated `npm run
     verify` passed `33` test files, `291` tests, desktop storage smoke, asset
     verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:55052`; escalated `npm run desktop:package-smoke`
     passed.
     Refreshed handoff archive proof: `npm run playtest:handoff` rebuilt and
     verified `release/playtest-handoff/` from generated timestamp
     `2026-06-07T05:54:18.984Z`; `npm run playtest:handoff:archive` wrote
     `release/Harborline-playtest-handoff-0.1.0-arm64.zip` with SHA-256
     `5faca3916636d6ecbe705a47c361d1a0ae82d4d5536f8ebf9ec791d3b67438a`;
     extracted `app.asar` assets contain `Collect files`,
     `playtest-collection-files`, `harborline.playtestArtifact.latest`, and
     `playtest.history.v1.json`.
     Latest handoff archive refresh: `npm run playtest:handoff` rebuilt and
     verified `release/playtest-handoff/` from generated timestamp
     `2026-06-07T06:02:56.478Z`; `npm run playtest:handoff:archive` wrote
     `release/Harborline-playtest-handoff-0.1.0-arm64.zip` with SHA-256
     `4fdd7b0f2c07eec3752e2581e265e1506e47733ca96a4c87e9c1e97a6a8fdddd`;
     generated Playtest Evidence and Scorecard drafts include latest/history
     collection targets plus no-coaching protocol fields; `npm run verify`
     passed `33` test files, `291` tests, storage smoke, asset verification,
     production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:57250`.

8. [ ] `M-026B` Triage playtest findings.
   - Depends on: `M-026A`.
   - Exit criteria: every playtest finding is assigned as release blocker,
     high-value polish, watchlist, or post-release backlog.
   - Exit criteria: any repeated confusion or fun failure becomes a task with a
     reproduction path and exit proof.
   - Exit criteria: no vague feedback remains unactioned if it blocks a fresh
     player from understanding, finishing, or wanting another run.
   - Current progress: added `playtestTriage.ts`, a deterministic archived
     scorecard parser that converts launch failures, runtime errors, low core
     scores, friction-log rows, single-next-change notes, and follow-up-task
     rows into release-blocker, high-value-polish, watchlist, or post-release
     candidates. Settings now has a `Triage` action that reads
     `playtest.history.v1.json` and writes a `Harborline Playtest Triage
     Report` into the Playtest Evidence editor with intake status, grouped
     findings, session index, and next action. Template `yes/no` placeholders
     are explicitly ignored so unedited drafts do not create false blockers.
     Follow-up hardening typed every archived playtest artifact as `scorecard`,
     `evidence`, `triage`, or `artifact`; `M-026A` readiness and `M-026B`
     triage now count only scorecards, so saving a raw evidence packet or a
     triage report cannot accidentally advance the three-session gate.
   - Current proof: focused `playtestTriage`, `playtestReadiness`,
     `persistence`, and `playtestEvidence` tests passed `16` tests; `npm run
     build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:60310` with assertions for the generated triage report,
     `1/3` archive readiness, and preserved `M-026A` collection gate; escalated
     full `npm run verify` passed `30` test files, `268` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:60378`. In-app browser spot-check at
     `http://127.0.0.1:59031/?verify=playtest-triage` confirmed Harborline
     loaded, Settings exposed the `Triage` button, readiness showed `0/3
     scorecards archived`, and Runtime Clean. Typed-artifact proof: focused
     playtest/storage tests passed `19` tests; `npm run build` passed;
     escalated `npm run browser:smoke` passed at `http://127.0.0.1:60762` and
     proves saving a triage report leaves readiness at `1/3 scorecards
     archived`; escalated full `npm run verify` passed `30` test files, `271`
     tests, desktop storage smoke, asset verification, production build,
     artifact smoke, and browser smoke at `http://127.0.0.1:60889`.
     Qualified-scorecard proof: focused playtest/storage tests passed `20`
     tests; `npm run build` passed; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:61152` and proves a saved blank generated scorecard
     leaves readiness at `0/3 qualified scorecards`; escalated full
     `npm run verify` passed `30` test files, `272` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:61223`. Missing-field proof: focused
     playtest/storage tests passed `21` tests; `npm run build` passed;
     escalated `npm run browser:smoke` passed at `http://127.0.0.1:61348` and
     asserts Settings names missing fields such as tester and observer while
     the triage report includes an Unqualified Scorecards table; escalated full
     `npm run verify` passed `30` test files, `273` tests, desktop storage
     smoke, asset verification, production build, artifact smoke, and browser
     smoke at `http://127.0.0.1:61398`. Packaged proof: escalated
     `npm run desktop:package:mac` rebuilt
     `release/Harborline-darwin-arm64/Harborline.app`; escalated
     `npm run desktop:package-smoke` passed with packaged assertions that a
     saved scorecard remains `0/3 qualified`, the missing tester/observer
     fields are visible, saving a triage report keeps the count at `1
     scorecard archived`, and `playtest.history.v1.json` contains exactly one
     `scorecard` and one `triage` artifact. Follow-up standard verification:
     escalated `npm run verify` passed `30` test files, `273` tests, desktop
     storage smoke, asset verification, production build, artifact smoke, and
     browser smoke at `http://127.0.0.1:61646`.

9. [ ] `M-026C` Fix release-blocking playtest issues.
   - Depends on: `M-026B`.
   - Exit criteria: all `S0` issues found in playtest are fixed, verified, or
     explicitly accepted as known limitations outside the release candidate.
   - Exit criteria: regression tests or browser/package smoke cover every
     closed blocker that can reasonably regress.

10. [ ] `M-027` Freeze release-candidate scope.
    - Depends on: `M-026C`.
    - Exit criteria: `MASTER_TASK_LIST.md` and `RELEASE_BLOCKERS.md` agree on
      blockers, high-value polish, watchlist, and post-release backlog.
    - Exit criteria: no new system, asset set, or engine migration can enter RC
      unless it closes an `S0` or directly improves the vertical-slice target.

11. [ ] `M-028` Produce the first release candidate.
    - Depends on: `M-027`.
    - Exit criteria: packaged desktop build installs cleanly, launches without
      terminal help, preserves saves, recovers from corruption, passes all
      verification gates from a fresh checkout, and has no open `S0` blockers.
    - Exit criteria: release notes, known issues, recovery instructions, and
      the next feedback channel are ready.

### Stage 3 - Full-Game Content And Retention

12. [ ] `M-029` Design the full-run structure.
    - Depends on: `M-028`.
    - Exit criteria: the target full-session length, win/loss rules, score
      ladder, run phases, and optional challenge starts are written down.
    - Exit criteria: the design increases replay desire without relying on
      shallow permanent power gains.

13. [~] `M-030` Expand ports, routes, goods, and factions.
    - Depends on: `M-029`.
    - Exit criteria: the expanded map supports multiple route archetypes and
      faction geographies without making the first screen slower.
    - Exit criteria: new goods create distinct economic behavior rather than
      more rows of identical buy-low/sell-high math.
    - Exit criteria: simulator and playtest evidence show no single dominant
      route family.
    - Current progress: added tactical faction favors to the Port Authority so
      standing can be spent on distinct political/economic edges: Charter
     Ledger Credit, Freeport Tide Runner Writ, Admiralty Patrol Cover, and
     League Stevedore Shift. These favors convert standing into cash/debt
     leverage, temporary route-risk relief, local price pressure, or export
     stock refresh instead of leaving politics as a passive modifier. Added
     rolling market quote history so every port/good remembers the last
      several effective prices; Market rows now show whether a quote is new,
      firming, softening, rangebound, rising fast, or falling fast. Added the
      Intel `Moving Markets` block and route/trade tape bias so recent quote
      movement now creates readable buy-the-dip and sell-strength edges instead
      of living only as row-level history. Added `Faction Watch`, a ranked
      political pressure read that aggregates standing and active edicts into
      route-risk and price effects; route picks and best-run reads now name
      political edge, convoy cover, tariff squeeze, inspection risk, and other
      faction pressure when it affects the lane.
    - Current proof: focused faction-favor and reducer tests passed `146`
      tests; `npm run build` passed; escalated `npm run browser:smoke` passed
      at `http://127.0.0.1:65514` with Port Authority favor metadata and effect
      assertions; escalated `npm run verify` passed `35` test files, `304`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:49216`. Market
      history proof: focused market-history, reducer, and economy tests passed
      `156` tests; `npm run build` passed; escalated `npm run browser:smoke`
      passed at `http://127.0.0.1:50755` with market-history label and metadata
      assertions; after one transient headless `pixi:webglcontextlost` smoke
      retry, escalated `npm run verify` passed `37` test files, `311` tests,
      desktop storage smoke, asset verification, production build, artifact
      smoke, and browser smoke at `http://127.0.0.1:52168`. Moving Markets
      proof: focused market-history and economy tests passed `14` tests;
      `npm run build` passed; escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:52734` with Moving Markets assertions; escalated
      `npm run verify` passed `37` test files, `314` tests, desktop storage
      smoke, asset verification, production build, artifact smoke, and browser
      smoke at `http://127.0.0.1:52923`. Faction Watch proof: focused
      faction-pressure and economy tests passed `12` tests; `npm run build`
      passed; escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:53300` with Faction Watch assertions; escalated
      `npm run verify` passed `38` test files, `317` tests, desktop storage
      smoke, asset verification, production build, artifact smoke, and browser
      smoke at `http://127.0.0.1:53465`.

14. [~] `M-031` Expand ships, refits, crew, and facilities.
    - Depends on: `M-030`.
    - Exit criteria: each new ship class changes at least two core choices:
      route, cargo, risk, crew, encounter, contract, or economy.
    - Exit criteria: cannons, quarters, cargo mods, smuggling gear, repair
      tools, market tools, and comfort upgrades have readable tradeoffs.
    - Exit criteria: the upgrade ladder creates short, medium, and late-game
      goals without forcing one optimal build.
    - Sequenced subtasks:
      - [x] `M-031A` Add a low-asset-risk refit expansion first: open-water
        control, customs or market manipulation, heavier guns, and crew
        endurance.
      - [x] `M-031B` Tune the equipment planner so those refits appear as
        sensible recommendations only when their route, market, faction, or
        encounter conditions make them valuable.
      - [x] `M-031C` Add one additional ship or facility only after the build
        role is proven in telemetry or playtest notes.
    - Subtask exit criteria: each added refit has a slot, price, stats, role
      description, hull-fit bonus where appropriate, planner coverage, reducer
      or outfitting tests, and visible player-facing tradeoff text.
    - Current progress: added four role-specific refits without requiring new
      art assets: Drogue Sea Anchor for hard-water control, Customs Ledger for
      politics and market manipulation, Long Nines for encounter pressure, and
      Watch Bunks for crew endurance. Each refit has a slot, faction yard,
      price, stat role, player-facing note, and hull-fit bonuses where the
      current ship class changes the build read. Watch Bunks now also acts as a
      real crew facility, reducing strain, improving shore leave recovery,
      training crew faster, and adding casualty protection. The equipment
      planner now adds contextual scoring and reason labels so Drogue Sea
      Anchor rises on hard-water route pressure, Customs Ledger rises under
      tariff/inspection/faction pressure, Long Nines rises on pirate-risk lanes
      or pirate history, and Watch Bunks rises under morale, strain, crew-cap,
      or rough-route endurance pressure. Follow-up consequence wiring makes
      those refits matter in live play: Customs Ledger discounts permits,
      improves permit-standing gains, lowers customs inspection chance/fines,
      and improves evasion; Long Nines improve pirate battle and warn-off
      tactical reads; Drogue Sea Anchor reduces sea-encounter hull threat; and
      Watch Bunks reduce sea-encounter morale threat. Added the Harbor Cutter
      as a sixth purchasable hull and the first explicit Patrol Cutter build:
      a compact Admiralty customs/patrol ship with small cargo, safer route
      handling, useful guns, and strong synergies with Customs Ledger, Long
      Nines, Drogue Sea Anchor, Signal Cannon, Gun Deck, and Watch Bunks.
      Its artwork has since been replaced with a distinct generated production
      candidate under `M-036A`. Follow-up captain-skill work added named level
      3 masteries so skill progression becomes a build identity instead of
      only stat pips: Navigation unlocks `Tradewind Plotter` for route current,
      delay, and risk reads; Seamanship unlocks `Storm Hand` for softer active
      sea reads; Brokerage unlocks `Market Maker` for cheaper, stronger broker
      packets; and Gunnery unlocks `Gun Drill Captain` for better pirate
      tactical reads and softer battle damage. Follow-up build-synergy work
      added Charter House Rig, Freeport Windknife, Admiralty Gunline, and
      League Freightline as named hull/refit/crew combinations with live stat
      effects and Harbor progress rows.
    - Current proof: focused `equipmentPlanner` and `reducer` tests passed
      `137` tests. Coverage proves the new refits are present in distinct
      slots, hull-specific fit labels apply to the League Carrier and Iron
      Barge, derived stats change for cargo, crew, open-water, negotiation, and
      cannons, Watch Bunks is a crew facility, Drogue Sea Anchor reduces
      hard-water route risk and hull wear, and each specialist refit receives a
      matching contextual recommendation reason from live route, politics,
      pirate, or crew pressure. Follow-up focused `encounters`, `reducer`, and
      `equipmentPlanner` tests passed `144` tests, covering Long Nines pirate
      deterrence, Customs Ledger permit/customs relief, Drogue Sea Anchor storm
      damage relief, and Watch Bunks morale-strain relief. Fresh full proof:
      focused `shipyard`, `visuals`, `equipmentPlanner`, and `reducer` tests
      passed `148` tests; `npm run assets:verify` passed with `6 ships, 6
      ports, 14 total entries`; `node scripts/asset_pipeline.mjs catalog`
      passed and refreshed the asset catalog; `npm run build` passed; escalated
      `npm run verify` passed `23` test files, `228` tests, desktop storage
      smoke, asset verification, production build, artifact smoke, and browser
      smoke at `http://127.0.0.1:51692`. Skill mastery proof: focused
      `reducer` tests passed `142` tests, covering named mastery labels,
      route-risk/delay effects, Storm Hand sea-read relief, Market Maker
      broker packet improvements, and Gun Drill pirate tactical reads; `npm
      run build` passed; `npm run browser:smoke` passed at
      `http://127.0.0.1:64343` with Harbor skill-row mastery copy assertions;
      full `npm run verify` passed `33` test files, `296` tests, desktop
      storage smoke, asset verification, production build, artifact smoke, and
      browser smoke at `http://127.0.0.1:64534`. Build-synergy proof: focused
      build-synergy, shipyard, and equipment-planner tests passed `16` tests;
      `npm run build` passed; escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:49605` with Harbor Build Synergies UI and metadata
      assertions; escalated `npm run verify` passed `36` test files, `307`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:49930`.

15. [x] `M-032` Deepen encounters and consequences.
    - Depends on: `M-031`.
    - Exit criteria: customs, pirates, storms, faction pressure, rescues, and
      contract complications produce choices, not just random damage.
    - Exit criteria: cannons and defensive equipment matter, but combat does
      not replace the merchant-strategy fantasy.
    - Exit criteria: failure stories create recovery decisions and memorable
      recap beats.
    - Sequenced subtasks:
      - [x] `M-032A` Add comeback work after bad outcomes so setbacks open a
        player-facing recovery decision instead of ending as silent damage.
      - [x] `M-032B` Add richer customs consequence choices: clean papers,
        seize-risk cargo, faction favors, and reputation tradeoffs.
      - [x] `M-032C` Add pirate consequence branches that reward patrol,
        escape, escort, and negotiation builds without turning the game into a
        combat-first loop.
      - [x] `M-032D` Add storm and rescue complications that connect ocean
        pressure, crew condition, cargo risk, and nearby port identity.
      - [x] `M-032E` Feed major encounter outcomes into recap beats so the run
        remembers the player's worst scrape, best recovery, and faction wake.
    - Subtask exit criteria: each new encounter consequence changes at least
      one next-route, contract, cargo, faction, crew, repair, or equipment
      decision; has focused reducer or encounter coverage; and is visible in
      the log or contract UI without extra tutorial text.
    - Current progress: added recovery contracts for storm damage, customs
      trouble, pirate bribes, failed pirate warning shots, failed fights, and
      failed escapes. Recovery work is generated at the arrival port, appears
      ahead of ordinary board offers, carries a short explanatory brief, uses
      low penalties and fast rewards, and is normalized through save/load.
      Storm recovery leans toward urgent repair cargo, pirate recovery posts
      escort work with route-risk relief, and customs recovery posts clean
      paper work. The contract board now displays these briefs when no chain
      hook is present, making the comeback job visible as a next decision.
      Follow-up customs work added three non-RNG inspection branches: File
      Manifest pays a reduced paperwork fee for a standing gain, Bond Cargo
      surrenders suspect freight for a low bond fee and recovery work, and
      Call Favor spends faction standing to avoid the full fine. The encounter
      UI now shows a compact customs tactical read with manifest, bond, and
      favor costs beside the existing permit, bribe, and evasion choices.
      Follow-up pirate work expanded pirate consequences without making combat
      the center of the game: active escort contracts now improve the tactical
      read and can turn a successful warning into follow-up patrol work, fast
      hulls get a clean-wake escape payoff, and brokerage/negotiation builds
      can parley for reduced black-flag passage with failure still risking
      cargo loss and recovery work. The pirate encounter UI now exposes
      escort duty and parley odds/costs beside fight, warn, pay, and run.
      Follow-up storm/rescue work added an Aid Signal choice to sea encounters:
      it reads the destination port identity, ocean pressure, crew morale,
      cargo exposure, and destination faction, then trades delay, hull wear,
      morale strain, and possible cargo loss for faction goodwill, rescue
      logs, captain/crew XP, and storm recovery work at the destination.
      Follow-up recap work added explicit `Worst Scrape` and `Best Recovery`
      run-story cards, plus an encounter-aware `Faction Wake` that can cite
      Aid Signal papers, customs favors, bribes, patrol credit, failed evasion,
      or black-flag politics from the actual run log and recovery contracts.
    - Current proof: focused `contracts`, `encounters`, and `reducer` tests
      passed `148` tests. Coverage proves storm voyages post recovery work at
      the arrival port, customs submissions post clean-paper recovery work and
      log the offer, failed warning shots post pirate recovery work, pirate
      bribes post patrol recovery work, and recovery metadata survives contract
      normalization. Fresh full proof: `npm run build` passed; escalated
      `npm run verify` passed `23` test files, `229` tests, desktop storage
      smoke, asset verification, production build, artifact smoke, and browser
      smoke at `http://127.0.0.1:52050`. In-app browser check passed at
      `http://127.0.0.1:4189/?verify=task-list-m032`: Harborline loaded, the
      Contract Board showed one actionable local offer, chain-note rendering
      stayed intact, and console error count was `0`. Follow-up focused
      `contracts`, `encounters`, and `reducer` tests passed `151` tests,
      covering reduced manifest fees, voluntary suspect-cargo bonds, and
      standing-spend customs favors. Fresh full proof: `npm run build`
      passed; escalated `npm run verify` passed `23` test files, `232`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:52326`.
      In-app browser seeded-save check passed at
      `http://127.0.0.1:4189/?verify=customs-ui`: `Admiralty Customs`
      rendered with manifest, cargo-bond, and favor choices enabled, Show
      Permit correctly disabled without a permit, and console error count was
      `0`. Follow-up focused `contracts`, `encounters`, and `reducer` tests
      passed `155` tests, covering escort-duty warning follow-up, brokerage
      parley success, failed parley cargo loss plus recovery work, and
      fast-hull clean-wake escape payoff. Fresh full proof: `npm run build`
      passed; escalated `npm run verify` passed `23` test files, `236`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:52719`.
      In-app browser seeded-save check passed at
      `http://127.0.0.1:4189/?verify=pirate-ui`: pirate tactical read showed
      active escort duty, Parley was visible and enabled with odds/cost, Fight
      and Warn remained available, and console error count was `0`. Follow-up
      focused `contracts`, `encounters`, and `reducer` tests passed `156`
      tests, covering Aid Signal rescue costs, cargo exposure, destination
      faction standing, storm recovery work, and port-identity rescue logs.
      Fresh full proof: `npm run build` passed; escalated `npm run verify`
      passed `23` test files, `237` tests, desktop storage smoke, asset
      verification, production build, artifact smoke, and browser smoke at
      `http://127.0.0.1:53191`. In-app browser seeded-save check passed at
      `http://127.0.0.1:4189/?verify=sea-rescue-ui`: `Storm Front` rendered,
      the `Hard-Water Arsenal rescue` panel targeted `stormhook`, cargo risk
      was `cargo exposed`, Aid Signal was enabled, and console error count was
      `0`. Follow-up focused `contracts`, `encounters`, and `reducer` tests
      passed `157` tests, covering encounter scrape extraction, completed
      storm recovery recap, and Aid Signal faction wake copy. Fresh full proof:
      `npm run build` passed; escalated `npm run verify` passed `23` test
      files, `238` tests, desktop storage smoke, asset verification,
      production build, artifact smoke, and browser smoke at
      `http://127.0.0.1:53709`. In-app browser seeded-save check passed at
      `http://127.0.0.1:4189/?verify=recap-encounters-ui`: the run recap
      rendered `Worst Scrape` as `Pirate parley`, `Best Recovery` as `Storm
      recovery closed`, `Faction Wake` with Aid Signal hard-water papers, and
      console error count was `0`.

16. [x] `M-033` Add production replay systems.
    - Depends on: `M-032`.
    - Exit criteria: challenge starts, score comparison, build badges, route
      history, and end-run prompts make repeated runs feel intentionally
      different.
    - Exit criteria: replay systems are optional; the base run remains fun
      without unlock grinding.
    - Current progress: the close-run recap now exposes a replay summary with
      score comparison, generated build badges, and route recap cards. The
      end-run log records new-best or best-chase evidence, imported closed
      saves prefer the logged final score for stable comparison copy, build
      badges come from actual ship/stat archetype fit, and route recap cards
      surface Best Lane, Hardest Water, and Last Crossing from completed route
      history. Existing replay-hook challenge starts remain optional and launch
      from the recap.
    - Current proof: focused `reducer` and `playtestEvidence` tests passed
      `142` tests, covering score comparison evidence, build badges, route
      recap cards, route-history replay copy, and day-60 best-chase logging.
      Fresh full proof: `npm run build` passed; escalated `npm run verify`
      passed `23` test files, `239` tests, desktop storage smoke, asset
      verification, production build, artifact smoke, and browser smoke at
      `http://127.0.0.1:54253`. In-app browser seeded-save check passed at
      `http://127.0.0.1:4189/?verify=replay-systems-ui`: score comparison
      rendered `Best chase` / `$500 off`, three build badges rendered, route
      recap rendered Best Lane, Hardest Water, and Last Crossing, three replay
      hooks remained available, and console error count was `0`.

### Stage 4 - Visual, Asset, And Ocean Production

17. [x] `M-034` Calibrate the final art direction.
    - Depends on: `M-025C`.
    - Exit criteria: approved style examples exist for minimalist isometric
      ships, readable character/faction tokens, distinct islands, and realistic
      teal-gray ocean water.
    - Exit criteria: the style rejects generic AI fantasy-map looks, parchment
      UI, toy colors, noisy clutter, and decoration that slows decisions.
    - Current progress: `src/game/artDirection.ts` now turns the art bible into
      an executable style profile with approved examples, prompt briefs,
      negative rules, and QA checklists for ships, ports, islands, ocean,
      identity tokens, map, and UI. The approved reference set now includes the
      existing isometric ship/port, ocean, and map concepts plus
      `assets/concepts/04-identity-token-style.svg` for captain, faction, crew,
      contract giver, and encounter token direction. `ART_DIRECTION.md` now
      points future generation and QA work at the typed profile.
    - Current proof: focused `artDirection`, `identityArt`, and `visuals` tests
      passed `12` tests. `npm run assets:verify` passed against `6` ships,
      `6` ports, and `14` total generated entries. `npm run build` passed.
      Fresh full proof: escalated `npm run verify` passed `24` test files,
      `245` tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser regression smoke at
      `http://127.0.0.1:55189`.

18. [x] `M-035` Productionize the asset pipeline.
    - Depends on: `M-034`.
    - Exit criteria: generated or hand-made assets have source prompts, source
      files, background-removal steps, transparent outputs when needed,
      dimensions, metadata, and QA checks.
    - Exit criteria: `npm run assets:verify` catches missing files, broken
      references, wrong dimensions, blank assets, and style-role mismatches.
    - Current progress: `scripts/asset_pipeline.mjs` now loads
      `src/game/artDirection.ts` directly and validates the production metadata
      against the approved style contract. Every runtime asset in
      `assets/generated/asset-production.json` declares its art family, approved
      reference examples, QA gate IDs, processing path, prompt reference, and
      background-removal step when a transparent sprite is required. The
      generated catalog now resolves each asset to its art-direction brief,
      approved examples, QA criteria, hashes, dimensions, alpha requirements,
      public mirrors, and provisional duplicate policy. `assets:sync` now
      writes the refreshed generated catalog before the final public mirror copy
      so `public/assets/generated/asset-catalog.json` cannot lag behind.
    - Current proof: focused `artDirection`, `identityArt`, and `visuals` tests
      passed `13` tests, including production metadata/style-contract coverage.
      `npm run assets:sync` passed and refreshed generated plus public catalogs.
      `npm run assets:verify` passed against `6` ships, `6` ports, and `14`
      total generated entries. `npm run build` passed. Fresh full proof:
      escalated `npm run verify` passed `24` test files, `246` tests, desktop
      storage smoke, asset verification, production build, artifact smoke, and
      browser regression smoke at `http://127.0.0.1:56101`.

19. [~] `M-036` Replace placeholder vertical-slice art with final assets.
    - Depends on: `M-035`.
    - Exit criteria: player ship, upgrade ships, ports/islands, priority
      characters, factions, storm cues, route cues, and UI icons use coherent
      production assets.
    - Exit criteria: assets improve readability on the actual game surface, not
      only in isolated image previews.
    - Sequenced subtasks:
      - [x] `M-036A` Replace copied ship placeholders. Regenerate Harbor Cutter
        and League Carrier as distinct production candidates, remove
        `provisional`/`copied_placeholder` metadata, refresh generated/public
        catalogs, and verify Shipyard readability on the live game surface.
      - [ ] `M-036B` Finalize priority character/faction art beyond compact
        identity tokens where generated bitmap portraits are worth the added
        visual weight.
      - [ ] `M-036C` Finalize storm, route-risk, faction, and UI cue assets so
        non-ship surfaces share the same production style.
      - [ ] `M-036D` Run a full map-surface art QA pass at desktop and compact
        widths after the remaining final assets land.
    - Current progress: targeted Gemini generation replaced
      `ship-harbor-cutter` and `ship-league-carrier`. Harbor Cutter now renders
      as a compact customs/patrol hull with red pennant, lean deck, and tiny
      chase guns; League Carrier now renders as a wide triple-hatch cargo hull
      with visible bales, low sails, and heavy-freighter mass. Both assets are
      marked `production_candidate`/`gemini` in
      `assets/generated/asset-production.json`, and no generated catalog entry
      remains `provisional` or `copied_placeholder`.
    - Current proof: the replacement clean sprite hashes are unique from their
      former copies: Harbor Cutter
      `73701dba4aad2728cb44df6428d8cb1d97631a725fdbde54289ca1f6dadf2a06`
      versus Clipper Kite
      `0290067a14d4a872622ba08f7a4a26512382c7eebe89ed7abe8bf9b02c281ad5`,
      and League Carrier
      `2b5ba5679d80f1d4dc1be9d5985bedf7e657ef085a87453a39d55f77a5d250ed`
      versus Iron Barge
      `2ff636c41b7e9acdb9bce37771318672eb907e084a9abbe161e77ae8eea45e30`.
      In-app browser check at
      `http://127.0.0.1:4189/?verify=m036-final-art` found Shipyard entries
      for Harbor Cutter and League Carrier, loaded the new sprite URLs, rendered
      them at `84x87` and `84x60` respectively, and showed `0` console errors.
      Focused `artDirection`, `visuals`, and `shipyard` tests passed `15`
      tests. `npm run assets:sync`, `npm run assets:verify`, and
      `npm run build` passed. Fresh full proof: escalated `npm run verify`
      passed `24` test files, `246` tests, desktop storage smoke, asset
      verification, production build, artifact smoke, and browser regression
      smoke at `http://127.0.0.1:56534`.

20. [x] `M-037` Prototype realistic ocean physics for production.
    - Depends on: `M-015`, `M-034`.
    - Exit criteria: a contained spike compares the current Pixi shader path
      against any needed water/physics technology with measurable proof:
      wave sampling, buoyancy response, wake behavior, current fields, route
      readability, GPU cost, and integration complexity.
    - Exit criteria: the result is a decision document, not an open-ended
      engine rewrite.
    - Sequenced subtasks:
      - [x] `M-037A` Route sea-state integration: route samples drive readable
        swell, beam-sea, following-sea, cargo-slam, ETA, wear, and route-risk
        effects.
      - [x] `M-037B` Water-quality calibration: compare the current Pixi water
        against approved realistic ocean references on the live map surface.
      - [x] `M-037C` Physics technology spike: test whether a water or physics
        package materially improves buoyancy, wake, and wave response without
        harming route readability or GPU budget.
      - [x] `M-037D` Production recommendation: decide Pixi-only, Pixi plus a
        narrow physics package, or renderer migration with evidence.
    - Subtask exit criteria: every ocean-physics decision has a report path,
      browser or benchmark proof, and a clear "continue", "defer", or
      "migrate" decision recorded here and in `OCEAN_ARCHITECTURE.md`.
    - Current progress: added shared route sea-state sampling to the existing
      ocean field. `sampleRouteOcean` now reports peak wave height, beam sea,
      following/against-sea set, and cargo-slam pressure. `routeConditions`,
      `routePhysicsProfile`, `routeWearEstimate`, and `shippingLanePressure`
      use those values so swell can affect ETA, route threat, hull wear,
      cargo risk, crew strain, freight pressure, and tactic labels from one
      model. Route Command and Route Board now expose a compact `Swell` read,
      and Physics Debug includes beam/slam/peak-wave values. Added
      `npm run ocean:physics-spike`, a repeatable report that samples the live
      ocean/route/economy systems and attaches latest GPU benchmark evidence.
      Cargo-slam coefficients were tuned after the report exposed saturation;
      route reads now distinguish against swell, beam sea, cargo slam,
      following swell, and settled swell. M-037B now adds a visual calibration
      gate: `src/game/oceanVisualCalibration.ts` ties the water palette to the
      approved art-direction ocean references, `src/MapScene.tsx` uses that
      exported palette in the Pixi shader, and the analytic foam model was
      tuned from average foam `0.680` to `0.307` so foam reads as restrained
      realistic trace detail instead of constant surface noise. M-037C/M-037D
      added `npm run ocean:technology-spike`, which scores the current
      Pixi/OceanField path, a targeted no-dependency OceanField extension, a
      2D rigid-body package class, a 3D reflective water renderer class, and a
      heavier fluid-simulation class against ship response, wake behavior,
      wave response, route readability, GPU budget, visual calibration, and
      integration safety.
    - Current proof: focused `oceanVisualCalibration`, `oceanSurface`,
      `oceanPhysicsSpike`, `physicsDebug`, and `renderProbe` tests passed `17`
      tests; `npm run build` passed; fresh escalated `npm run ocean:benchmark`
      passed and wrote `reports/ocean-benchmark-latest.json` with average FPS
      `37.5/55.5/28.6/28.8`; `npm run ocean:visual-calibration` passed and
      wrote `reports/ocean-visual-calibration-latest.json` with palette hue
      `191.4`, average saturation `0.664`, depth contrast `0.515`, average foam
      `0.307`, max storm `0.555`, route visual-risk spread `0.439`, live map
      surface `passed`, min average FPS `28.6`, and decision
      `calibrated-pixi-water`; `npm run ocean:physics-spike` passed and wrote
      `reports/ocean-physics-spike-latest.json` with `1,800` route/day samples,
      beam sea `0.388..1`, cargo slam `0.359..1`, following sea `-0.43..0.43`,
      peak wave `3.08..25.77`, GPU cost `passed`, and decision
      `continue-pixi-first`; `npm run ocean:technology-spike` passed and wrote
      `reports/ocean-technology-spike-latest.json` with all core gates passed,
      winner `narrow-oceanfield-extension` score `7.84`, current Pixi/OceanField
      score `7.839`, best external package class `fluid-solver-package` score
      `4.143`, external package material improvement `false`, margin `3.697`,
      and decision `extend-oceanfield-no-package`; focused
      `oceanTechnologySpike`, `oceanVisualCalibration`, and
      `oceanPhysicsSpike` tests passed `11` tests; `npm run build` passed;
      escalated full `npm run verify` passed `26` test files, `254` tests,
      desktop storage smoke, asset verification, production build, artifact
      smoke, and browser smoke at `http://127.0.0.1:57474`.

21. [x] `M-038` Integrate physics-backed sailing if the spike earns it.
    - Depends on: `M-037`.
    - Exit criteria: ocean samples drive route ETA, risk, hull wear, ship
      motion, wake, storm pressure, and player-facing route explanations from
      one coherent model.
    - Exit criteria: the game remains a fast merchant strategy game; realistic
      water never hides the decision the player needs to make.
    - Current proof: `src/game/ocean.ts` now exposes ship-aware sailing physics
      profiles and `sampleShipMotion` accepts `shipId` plus `cargoLoad`, so
      speed hulls, rough-water hulls, barges, and loaded freighters produce
      distinct bob, roll, yaw, drift, wake length, wake spread, wake turbulence,
      wake persistence, and hull response from the shared OceanField. The Pixi
      map uses those values for `ocean-response-v3` ship telemetry and
      heading-correct wake geometry; Physics Debug shows hull response and wake
      metrics from the same route samples. `npm run sailing:physics` passed and
      wrote `reports/sailing-physics-latest.json`: route
      `grayhaven->stormhook`, day `22`, `5` ship cases, wake length
      `0.963..1.451`, wake spread `1.139..1.518`, hull response
      `0.788..0.833`, Clipper wake advantage `0.488`, heavy-hull wake spread
      advantage `0.345`, and decision `integrated-oceanfield-sailing-v1`.
      Focused `sailingPhysicsReport`, `oceanSurface`, and `physicsDebug` tests
      passed `11` tests, and `npm run build` passed under the renderer chunk
      warning budget. Fresh escalated `npm run verify` passed `28` test files,
      `261` tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:59077`. In-app
      browser check at `http://127.0.0.1:4190/?verify=m038-sailing-physics`
      loaded Harborline, reported nonblank canvas, `production-ocean-surface-v1`,
      `ocean-response-v3`, selected the Saffron route with route curvature
      `0.002`, current assist `-0.145`, wake length `0.913`, wake spread
      `1.07`, wake turbulence `0.688`, hull response `0.677`, Runtime Clean,
      and `0` console errors. Fresh escalated `npm run ocean:benchmark` passed
      after the ship-aware wake changes with average FPS
      `37.5/55.5/28.6/28.8`; `npm run ocean:visual-calibration` passed with
      live surface `passed` and min average FPS `28.6`.

22. [x] `M-039` Lock ocean performance and compatibility.
    - Depends on: `M-038`.
    - Exit criteria: desktop and low-power modes meet the FPS, canvas health,
      console health, and readability gates on target machines.
    - Exit criteria: fallback water still looks intentional, not broken.
    - Current proof: `scripts/ocean_benchmark.mjs` now records runtime health,
      console error count, and page error count for every benchmark case.
      Added `npm run ocean:compatibility`, which reads
      `reports/ocean-benchmark-latest.json` plus
      `reports/ocean-visual-calibration-latest.json` and verifies desktop FPS,
      low-power FPS, canvas health, runtime/console health, intentional
      fallback cost, route readability, and visual calibration in one release
      gate. Fresh escalated `npm run ocean:benchmark` passed with average FPS
      `37.5/55.5/28.6/28.8`; `npm run ocean:visual-calibration` passed with
      min average FPS `28.6`; `npm run ocean:compatibility` passed and wrote
      `reports/ocean-compatibility-latest.json`: desktop FPS headroom
      `+7.5/+25.5`, low-power FPS headroom `+4.6/+4.8`, all four cases
      `nonblank/varied`, RuntimeClean, `0` console errors, `0` page errors,
      fallback scale reduction `0.22/0.22`, color reduction `10/5`, readability
      risk spread `0.439`, depth contrast `0.515`, fallback status
      `intentional`, and decision `ocean-compatible-v1`. Focused
      `oceanCompatibility`, `oceanVisualCalibration`, and `renderProbe` tests
      passed `10` tests; `npm run build` passed under the renderer chunk
      warning budget. Fresh escalated `npm run verify` passed `28` test files,
      `261` tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:59077`.

23. [~] `M-039B` Build the production water renderer v2.
    - Depends on: `M-039`, `M-034`.
    - Exit criteria: the ocean is an actual waving water surface with
      shader-driven swells, normals, foam, wake response, current fields, and
      buoyancy-style ship motion sourced from the shared ocean model.
    - Exit criteria: route readability, port/ship silhouettes, and decision UI
      remain clear over the moving water at desktop and compact sizes.
    - Exit criteria: desktop, compact, and low-power benchmarks pass with
      nonblank varied pixels, no console/runtime errors, and a documented
      fallback that still looks intentional.
    - Exit criteria: visual QA compares the live map against the approved art
      direction references and rejects decorative-only water that is not tied to
      the simulation.
    - Current progress: `src/MapScene.tsx` now keeps the shader mesh but layers
      in a sampled-water surface tied to `defaultOceanField` depth, wave normal,
      foam, current, storm, and drift samples. The map host reports
      `production-ocean-surface-v2`, `shader-mesh-v2`,
      `shader-plus-sampled-surface-v2`, sampled tile count, current ribbons,
      foam coverage, storm coverage, and normal variance. Low-power keeps an
      explicit `low-power-graphics-v2` fallback.
    - Current proof: focused ocean/compatibility/calibration/technology tests
      passed `17` tests; `npm run build` passed; `npm run browser:smoke`
      passed at `http://127.0.0.1:57965`; in-app browser proof at
      `http://127.0.0.1:57966/?verify=water-v2-iab` reported
      `production-ocean-surface-v2`, `shader-mesh-v2`, nonblank/varied canvas,
      `49` sampled water tiles, current ribbons `0.135`, foam coverage
      `0.717`, normal variance `0.987`, storm coverage `0.281`, and
      RuntimeClean. `npm run ocean:benchmark` passed with desktop
      `balanced/shader-mesh-v2` at `33 FPS`, compact `55.6 FPS`, low-power
      `low/low-power-graphics-v2` at `28.3 FPS`, and compact low-power
      `28.8 FPS`; `npm run ocean:visual-calibration` passed with decision
      `calibrated-pixi-water`; `npm run ocean:compatibility` passed with
      decision `ocean-compatible-v2`; `npm run verify` passed `33` test files,
      `292` tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:62878`.

### Stage 5 - Release-Quality Product

24. [~] `M-040` Implement audio.
    - Depends on: `M-020`, `M-028`.
    - Exit criteria: waves, harbor ambience, UI actions, profit/loss,
      upgrades, storms, customs, pirates, and game-over feedback have tasteful
      cues with mute/volume controls.
    - Exit criteria: audio reinforces decisions and tension without becoming
      noisy during repeated trading.
    - Current progress: added a procedural Web Audio layer with per-feedback
      cue specs for profit, loss, contracts, crew, customs, game-over, damage,
      insurance, market, pirate, rank-up, route, save, storm, and upgrades.
      The app now maintains scene ambience for harbor, open-water, and
      encounter states, plays cues from the live Feedback Pulse, and exposes
      compact mute, volume, and cue-test controls in Settings.
    - Current proof: focused audio and feedback tests passed `11` tests;
      `npm run build` passed; escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:65027` with audio Settings and current feedback cue
      assertions; escalated `npm run verify` passed `34` test files, `300`
      tests, desktop storage smoke, asset verification, production build,
      artifact smoke, and browser smoke at `http://127.0.0.1:65236`.

25. [ ] `M-041` Run accessibility and comfort release pass.
    - Depends on: `M-028`.
    - Exit criteria: keyboard, focus, reduced motion, text scaling, contrast,
      icon names, readable error states, and compact layout are verified in the
      packaged app.

26. [ ] `M-042` Run performance, compatibility, and save durability QA.
    - Depends on: `M-039`, `M-039B`, `M-041`.
    - Exit criteria: supported OS/display/GPU profiles can launch, render,
      save, recover, import/export, update, uninstall/reinstall, and quit
      without data loss or console/runtime errors.

27. [ ] `M-043` Prepare distribution.
    - Depends on: `M-042`.
    - Exit criteria: final packaging, signing/notarization if applicable,
      installer or archive shape, release notes, known issues, support copy,
      and versioning are complete.

28. [ ] `M-044` Ship and triage post-release feedback.
    - Depends on: `M-043`.
    - Exit criteria: launch feedback is collected, classified, and converted
      into hotfix, patch, or future-content tasks.
    - Exit criteria: no urgent save, launch, or blocking play issue remains
      without an owner and recovery path.

## Execution Milestones

Use these milestones to decide what to build next. The Master Production
Sequence above is the authoritative task list; the milestones are the
high-level sequence.

1. Stabilize direction and release control: `M-001` through `M-003`.
   - Exit criteria: we have a blocker ledger, a repeatable playtest scorecard,
     and a one-paragraph vertical-slice target that can reject distracting work.
   - Current status: complete and verified as planning artifacts.

2. Make the run addictive before adding more content: `M-004` through `M-007`.
   - Exit criteria: balance telemetry, replay hooks, and playtest traces show a
     20-minute run with clear recovery lines and no dead-turn streaks.
   - Current status: complete and verified.

3. Make the main surface fast and premium: `M-008` through `M-011`.
   - Exit criteria: route planning, contract work, shipyard builds, keyboard
     access, compact layout, and core actions are usable without hunting.
   - Current status: complete and verified.

4. Make the ocean and sailing feel production-grade: `M-012` through `M-015`.
   - Exit criteria: the Pixi ocean looks like moving water, ship behavior is
     visibly sampled from the same water model, performance evidence is
     recorded, and the Three.js question is closed or narrowly reopened.
   - Current status: complete. Pixi remains the vertical-slice renderer, and
     Three.js is deferred behind explicit future spike gates.

5. Add memorable personality and content depth: `M-016` through `M-020`.
   - Exit criteria: contracts, crew, events, factions, characters, and feedback
     create stories players can remember without slowing the route loop.
   - Current status: complete and verified through `M-020`.

6. Package Harborline as a real desktop game: `M-021` through `M-024`.
   - Exit criteria: a chosen shell launches without terminal help, saves live in
     the right app path, app identity exists, and distribution smoke is
     repeatable.
   - Current status: `M-021` is complete; Electron is selected for the first
     packaged vertical slice. `M-022`, `M-023`, and `M-024` are complete for
     the local macOS vertical slice.

7. Ship the vertical slice and release candidate: `M-025` through `M-028`.
   - Exit criteria: fresh players can launch, play, finish or fail clearly,
     produce scorecards, and the packaged release candidate has no known
     blockers.

8. Expand from slice to full game: `M-029` through `M-044`.
   - Exit criteria: full-run structure, expanded content, production art,
     realistic ocean physics if the spike earns it, audio, accessibility,
     performance, distribution, and post-release triage are complete.

## Immediate Work Queue

This is the next sequence to follow unless a playtest reveals a release blocker:

1. [x] `M-001` Add the release-blocker ledger.
   - Exit criteria: every known blocker has severity, reproduction, surface,
     owner/status, and proof required to close.
   - Current proof: `RELEASE_BLOCKERS.md` exists with severity/status rules,
     intake shape, known release blockers, high-value polish, watchlist items,
     and closure checklist.

2. [x] `M-002` Create the playtest scorecard template.
   - Exit criteria: every playtest can score fun spikes, confusion, dead turns,
     route-choice speed, UI friction, exploit routes, and replay desire.
   - Current proof: `PLAYTEST_SCORECARD.md` exists with session metadata,
     launch checks, core scores, loop trace, friction log, balance checks, end
     state, decision outcome, and follow-up task capture.

3. [x] `M-003` Define the vertical-slice target in one paragraph.
   - Exit criteria: the target names the player fantasy, 20-minute arc, win/loss
     state, content scope, visual bar, and explicit non-goals.
   - Current proof: `VERTICAL_SLICE_TARGET.md` defines the one-paragraph target,
     player fantasy, slice promise, content scope, design bar, non-goals,
     acceptance gates, and rejection test for new ideas.

4. [x] `M-012` Productionize the Pixi OceanSurface.
   - Exit criteria: default map water communicates swell, current, roughness,
     storm intensity, foam, route risk, and depth variation as a visual system.
   - Current proof: focused ocean/render tests passed, production build passed,
     the in-app browser at `http://127.0.0.1:4188/?verify=m012-ocean-surface`
     reported `production-ocean-surface-v1`, `shader-mesh-v1`, nonblank/varied
     canvas pixels, all water signal keys, current `0.197`, roughness `0.288`,
     foam `0.676`, storm `0.406`, depth contrast `0.518`, and Runtime Clean.
     After selecting Stormhook, the selected route showed `30% risk` and the
     map water signal reported route risk `0.297` with zero console errors.
     Escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:52838`.

5. [x] `M-013` Connect visible ship response more tightly to ocean samples.
   - Exit criteria: bob, roll, yaw, wake, drift, and route curvature visibly
     change with rough water, favorable current, and storm fronts.
   - Current proof: `src/game/ocean.ts` now exposes shared route-display,
     route-motion, and ship-response summaries from the same `OceanField` used
     by route math. `src/MapScene.tsx` uses that route-display helper for route
     curvature, scales ship bob/roll/yaw/drift from the sampled water, draws
     heading-correct wake curves that widen with foam/storm/current response,
     and exposes compact `data-ship-response` telemetry for live verification.
     Browser smoke now asserts ocean-driven ship response before and after a
     route is plotted. Focused tests passed `9/9`, production build passed with
     `MapScene` under the warning threshold at `499.84 kB`, browser smoke passed
     at `http://127.0.0.1:53281`, and full `npm run verify` passed `171` tests,
     asset verification, production build, artifact smoke, and browser smoke at
     `http://127.0.0.1:53316`.

6. [x] `M-014` Extend ocean performance evidence.
   - Exit criteria: desktop and compact benchmarks record renderer, FPS,
     fallback status, canvas pixel health, runtime health, and console health.
   - Current proof: `scripts/ocean_benchmark.mjs` now measures four production
     preview cases: default desktop, compact desktop, low-power desktop, and
     compact low-power. It records per-case viewport, renderer, render scale,
     FPS current/average/min/max/recent, sample count, stability, adaptive
     fallback, canvas pixel health, and page/console cleanliness. It also
     asserts low-power uses `low-power-graphics-v1`, lower render scale, and no
     higher pixel-color complexity than its matching shader case. `npm run
     ocean:benchmark` passed and wrote
     `reports/ocean-benchmark-latest.json`: default desktop `48 FPS`,
     compact desktop `55.8 FPS`, low-power `28.6 FPS`, compact low-power
     `28.5 FPS`; all stable, nonblank/varied, foreground, and no adaptive
     fallback.

7. [x] `M-015` Decide whether a Three.js spike is still needed.
   - Exit criteria: Pixi is confirmed as sufficient or the Three.js spike has a
     narrow, measurable proof target.
   - Current proof: `OCEAN_ARCHITECTURE.md` records the M-015 closeout:
     do not run a Three.js spike for the vertical slice. Current Pixi water and
     ship response meet the slice bar, `npm run verify` passed after the ocean
     response work, and `npm run ocean:benchmark` passed desktop/compact
     shader and low-power cases. Three.js remains deferred behind five future
     proof gates: reflection/refraction quality, input/layer sync, route
     readability, GPU cost, and migration cost.

8. [x] `M-016` Add memorable contract chains.
   - Exit criteria: at least three recognizable job arcs have named givers,
     escalation, rare rewards, faction consequences, and failure stories.
   - Current proof: added `charter_audit`, `freeport_lifeline`, and
     `admiralty_convoy` as three-stage chains with named givers, story hooks,
     escalating routes, rare final rewards, bonus cash, faction standing
     effects, policy rewards, and named failure text. Chain offers now render
     with giver/stage metadata in the Contract Board. Focused contract/reducer
     tests passed, full `npm run verify` passed `176` tests plus asset verify,
     production build, artifact smoke, and browser smoke. In-app browser
     verification at `http://127.0.0.1:4175/?verify=contract-chains` showed
     `Maribel Quill: Ledger Audit 1/3` with `data-chain-id=charter_audit`.

9. [x] `M-017` Deepen crew identity.
   - Exit criteria: crew traits, injuries, loyalties, rivalries, or demands
     affect route choices and retention while remaining readable in Harbor.
   - Current proof: added persistent `crewProfiles` with temperament,
     route preference, loyalty, strain, active demands, save normalization, and
     state version `2`. Hiring initializes crew identity; shore leave relieves
     strain and clears demands; voyages update loyalty/strain/demands from
     actual route physics; dismissal cost/morale now reflects loyalty and
     demands. Route recommendations and Route Command expose crew reads such
     as `+3 crew | Boatswain backs`, and Harbor crew rows show identity
     metadata. `npm run verify` passed `181` tests, asset verify, production
     build, artifact smoke, and browser smoke. In-app verification at
     `http://127.0.0.1:4175/?verify=crew-identity` showed `Identity: Safe
     water steady | strain low` and a route choice with `Boatswain backs`.

10. [x] `M-018` Expand event deck variety.
    - Exit criteria: repeated runs produce broader arrival, underway, harbor,
      faction, contract, and ocean events without feeling scripted.
    - Current proof: `src/game/eventDeck.ts` now adds authored harbor/world
      cards for contracts and crew identity pressure, arrival cards for
      contract handoffs, crew reputation, and faction dockside pressure, plus
      underway cards for contract signals, crew route reads, and storm-glass
      ocean pressure. `src/game/eventDeck.test.ts` covers the new harbor,
      arrival, and underway candidates. `npm run verify` passed `182` tests,
      asset verification, production build, artifact smoke, and browser smoke;
      in-app verification at `http://127.0.0.1:4175/?verify=event-variety`
      showed weighted `World Pulse`, `Arrival Pulse`, and `Underway Pulse`
      cards with Runtime Clean.

11. [x] `M-019` Add character and faction presentation.
    - Exit criteria: the most important captains, crew, customs, factions, and
      contract givers have readable portraits or icons that pass asset QA.
    - Current proof: added `src/game/identityArt.ts` with compact identity
      specs for the player captain, all factions, all crew roles, named contract
      givers, customs/sea/pirate encounters, and faction fallback handling.
      `src/App.tsx` now renders these identity tokens in the captain XP readout,
      current-port header, Shipyard, Contract Board, contract rows, Harbor crew
      rows, Port Authority, faction standing, politics, and encounter desks.
      `scripts/browser_smoke.mjs` asserts the player-facing identity metadata.
      `npm run verify` passed `185` tests, asset verification, production
      build, artifact smoke, and browser smoke at `http://127.0.0.1:55458`.
      In-app verification at `http://127.0.0.1:4175/?verify=identity-m019`
      showed captain `HC`, Charter `CB`, crew tokens, a contract-giver token,
      faction standing tokens, Runtime Clean, and zero fresh console errors.

12. [x] `M-020` Add animation and audio-ready feedback taxonomy.
    - Exit criteria: feedback events have stable categories and reduced-motion
      behavior remains calm.
    - Current proof: `src/game/feedback.ts` now exposes a locked taxonomy with
      category, audio cue, motion, and priority metadata for profit, loss,
      storm, damage, rank-up, contract, customs, pirate, upgrade, save,
      market, route, crew, insurance, and game-over feedback. `src/App.tsx`
      renders those hooks on `event-pulse` and forces motion to `calm` when
      reduced motion is enabled. Focused feedback tests passed, full
      `npm run verify` passed `187` tests, asset verification, production
      build, artifact smoke, and browser smoke at `http://127.0.0.1:56749`.
      In-app browser verification at
      `http://127.0.0.1:5579/?graphics=low&verify=debug-token` showed visible
      identity tokens, feedback category/audio/priority metadata, reduced
      motion calming feedback to `calm`, Runtime Clean, and zero fresh console
      errors.

13. [x] `M-021` Decide the desktop shell.
    - Exit criteria: Electron, Tauri, or local web packaging is selected with
      package size, GPU, save path, updates, platform support, and maintenance
      tradeoffs documented.
    - Current proof: `DESKTOP_SHELL_DECISION.md` accepts Electron for the first
      production desktop shell because it keeps the Pixi/WebGL ocean on the
      same Chromium runtime covered by current browser smoke and canvas-probe
      evidence. The decision records why Tauri is deferred, why web-only local
      packaging is rejected, the Electron save/log path contract, security
      posture, update story, macOS-first platform target, risks, and the
      `M-022` through `M-024` implementation sequence.

14. [x] `M-022` Move persistence to an app-appropriate path.
    - Exit criteria: versioned saves, backups, import/export, recovery, update,
      and corrupted-save behavior pass in the chosen shell.
    - Current proof: `src/game/persistence.ts` now has an app-storage driver
      boundary with browser fallback and a typed `window.harborlineDesktop`
      storage bridge contract. `electron/main.cjs`, `electron/preload.cjs`,
      and `electron/storage.cjs` implement the thin Electron host, safe preload
      bridge, allowlisted file names, app-owned `userData/harborline-game`
      saves, logs under Electron's logs path, atomic writes, and bounded runtime
      log rotation. `src/App.tsx` uses the async persistence API for best score,
      save, load, import, recover, delete, and runtime error logs. Focused
      persistence and Electron storage tests passed. Full `npm run verify`
      passed `194` tests, desktop storage smoke, asset verification, production
      build, artifact smoke, and browser regression smoke. `npm run
      desktop:smoke` launched Electron, loaded the production build, clicked the
      in-game Save button, confirmed `save.v2.json` in the Electron `userData`
      path, verified direct preload bridge read/write/log calls, and found no
      Electron console errors.
    - Current packaged proof: `npm run desktop:package:mac` builds
      `release/Harborline-darwin-arm64/Harborline.app`, and `npm run
      desktop:package-smoke` launches that app across three process lifecycles,
      verifies the desktop identity panel, clicks the in-game Save button,
      confirms Electron `userData` storage, exports/imports, deletes and
      recovers a save, recovers from a corrupted primary using backup, reloads
      the recovered save after restart, checks low-power renderer mode, and
      inspects runtime log writes. The same smoke stages the app into a
      temporary install location with `ditto`, proves load persistence from the
      installed app, kills the app after a save to prove abrupt-exit recovery,
      replaces the installed app to simulate an update, deletes/reinstalls the
      app bundle, and verifies the same Electron `userData` save survives each
      lifecycle step.

15. [x] `M-023` Add app identity and packaging.
    - Exit criteria: app name, icon, loading state, version/about panel, release
      notes link, crash recovery language, and first packaged build exist.
    - Current proof: Electron app name, window title, `productName`, package
      `main`, Games bundle category, generated `assets/app-icon.icns` and
      `assets/app-icon.png`, first-load boot screen, in-game desktop
      app/runtime/version/save/log panel, release-notes link, crash/recovery
      copy, `desktop:dev`, `desktop:smoke`, `desktop:package:mac`, and
      `desktop:package-smoke` exist. `npm run desktop:package:mac` produced
      `release/Harborline-darwin-arm64/Harborline.app`; bundle metadata shows
      `CFBundleName=Harborline`, `CFBundleIdentifier=com.harborline.game`,
      `CFBundleShortVersionString=0.1.0`, and
      `LSApplicationCategoryType=public.app-category.games`. `npm run
      desktop:package-smoke` passed against the packaged executable, and full
      `npm run verify` passed `194` tests, desktop storage smoke, asset verify,
      production build, artifact smoke, and browser regression smoke.

16. [x] `M-024` Create distribution verification.
    - Exit criteria: build, package, launch, save/load, import/export,
      uninstall/reinstall, update, low-power mode, and crash recovery smoke are
      documented and repeatable.
    - Current proof: `desktop:package-smoke` exists and launches the packaged
      macOS app with a temporary `userData` directory, verifies app identity,
      save-path metadata, log-path metadata, release notes, the real Save
      button, export/import, delete/recover, corrupted-primary backup recovery,
      restart/load persistence, low-power renderer mode, runtime log writes,
      installed-app launch, update replacement, uninstall/reinstall
      preservation, abrupt-exit recovery, direct preload bridge storage, and
      absence of Electron console errors. Full `npm run verify` also passed
      `194` tests, desktop storage smoke, asset verify, production build,
      artifact smoke, and browser regression smoke.

17. [ ] `M-025` Content-complete the vertical slice.
    - Exit criteria: selected ports, goods, ships, refits, crew, factions,
      contracts, events, ocean states, saves, score, and recap support a polished
      20-minute run.

18. [ ] `M-026` Run three external playtests.
    - Exit criteria: three fresh players can launch, understand, play, finish or
      fail clearly, and produce scorecards without developer coaching.

19. [ ] `M-027` Freeze release-candidate scope.
    - Exit criteria: remaining work is separated into blockers, high-value
      polish, and post-release backlog, with no unproven systems entering RC.

20. [ ] `M-028` Produce the first release candidate.
    - Exit criteria: packaged desktop build installs cleanly, runs without
      terminal help, preserves saves, passes verification from a fresh checkout,
      and has no known release blockers.

## Current Snapshot

- Stack: Vite, React, TypeScript, PixiJS.
- Current playable loop: port-to-port merchant run with market drift, trade
  recommendations, freight-pressure signals, route risk, route-window forecasts,
  contracts, ships, equipment, crew facilities, crew progression, insurance,
  persistent crew traits, customs, pirates, weighted harbor/world, arrival,
  and underway events, politics, saves, generated port/ship assets, route
  memory, route-physics arrival effects, and a shader/low-power ocean
  prototype.
- Current production risk: desktop shell, app-owned saves, app identity, and
  distribution smoke are closed for the local macOS vertical slice. The open
  release risks are content-completing the slice, validating it with fresh
  players, and later deciding whether truly realistic water physics belongs in
  the production renderer.
- Current UX risk: the game has a lot of systems, but some decisions still feel
  too dense. The next improvements should increase speed, clarity, and replay
  pull rather than add raw feature volume.

## Sequenced Master Backlog

This is the ordered task list. Work from the top unless a blocker, playtest
finding, or explicit product decision changes the order.

### P0 - Control The Build

1. [x] `M-001` Add a release-blocker ledger.
   - Depends on: current roadmap.
   - Exit criteria: a blocker list exists with severity, reproduction steps,
     owner/status, affected surface, and proof required to close.
   - Exit criteria: every future "this sucks" or "broken" finding can be
     captured as blocker, high-value polish, or backlog without losing it.
   - Current proof: `RELEASE_BLOCKERS.md` defines severity/status rules,
     intake requirements, known `S0` release blockers, `S1` polish items, `S2`
     watchlist items, and a closure checklist.

2. [x] `M-002` Create a playtest scorecard template.
   - Depends on: current core loop.
   - Exit criteria: one reusable scorecard captures fun spikes, confusion,
     dead turns, exploit routes, route-choice speed, UI friction, replay desire,
     and the single next change to make.
   - Exit criteria: scorecard results can be copied into this file as task
     updates without inventing a new format.
   - Current proof: `PLAYTEST_SCORECARD.md` covers launch/setup, core category
     scores, required observations, five-loop route trace, friction severity,
     exploit/balance checks, ending clarity, decision outcome, and follow-up
     task capture.

3. [x] `M-003` Define the vertical-slice target in one paragraph.
   - Depends on: major goal and product pillars.
   - Exit criteria: the target describes the exact 20-minute run we are trying
     to make great, including player fantasy, win condition, content scope,
     visual bar, and what is intentionally out of scope.
   - Exit criteria: future tasks can be accepted or rejected by whether they
     improve that slice.
   - Current proof: `VERTICAL_SLICE_TARGET.md` defines the one-paragraph target,
     player fantasy, slice promise, content scope, design bar, explicit
     non-goals, acceptance gates, and rejection test for new ideas.

### P1 - Make The Core Loop Hard To Put Down

4. [x] `M-004` Rebalance contract pressure.
   - Depends on: balance telemetry snapshots.
   - Why now: the latest quick snapshot shows contracts closed above target
     (`9`, target max `8`), which means contracts may be crowding out
     speculative trade.
   - Exit criteria: simulator and at least one manual smoke show contracts are
     valuable but not the dominant autopilot path.
   - Exit criteria: `averageCompletedContracts` returns to target band on a
     seeded snapshot, or the target band is explicitly revised with evidence.
   - Exit criteria: contract UI still makes deadlines, cargo cost, penalty, and
     route fit easy to read.
   - Current progress: neutral boards now keep one ordinary listing per port,
     the current harbor gains a second listing during the upgrade window,
     trusted mid/late faction boards can earn a second slot, and late-game
     gambles remain special extras. Contract payouts were raised so fewer jobs
     feel more meaningful instead of simply making the economy thinner. Focused
     tests cover board caps, trusted/local second slots, and active/recent
     contract preservation. Latest full balance proof: `npm run
     balance:snapshot -- --runs 1000 --seed 9000 --label
     repair-cost-pacing-1000` reported contracts closed `8`, inside the target
     band, while the automation captain now carries only one active deadline at
     a time before returning to speculative trade. Browser regression smoke now
     opens the Contract Board and proves the tuned starter board shows
     `1/1 listings`, current run pacing, and at least one actionable local
     contract offer. Current proof: `npm run verify` passed 156 tests, asset
     verification, production build, and artifact smoke before the sandbox-only
     local bind failure; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:50368`.

5. [x] `M-005` Tune survival and session pacing.
   - Depends on: `M-004`.
   - Why now: the latest quick snapshot shows days survived below target (`38`,
     target min `42`), so runs are closing before enough late-game decisions
     happen.
   - Exit criteria: average automated run reaches late-game choices more often
     without removing bankruptcy pressure.
   - Exit criteria: balance snapshot shows days survived inside target band or
     includes a recorded rationale for changing the target.
   - Exit criteria: the player gets at least one meaningful recovery line after
     a bad route, bad market, or failed contract.
   - Current gate: the simulator now classifies positive-score early hull losses
     separately from true 60-day ledger closes, exposing ship-loss as the real
     pacing issue. Captain's Orders now offers a direct `Repair` recovery action
     earlier, ordinary hull repair is cheaper, debt interest is slightly softer,
     and the automation captain repairs conservatively while preserving working
     capital. Latest 1,000-run snapshot (`repair-cost-pacing-1000`, seed
     `9000`) has every tracked metric inside target: win `49%`, average score
     `$2,103`, median `$1,485`, bankruptcy `16%`, days survived `53d`,
     contracts closed `8`, and upgrade rate `71%`.

6. [x] `M-006` Strengthen the "one more route" reward cadence.
   - Depends on: `M-004`, `M-005`.
   - Exit criteria: after every sail, the game produces at least one clear
     reason to continue: profit, urgent deal, contract progress, crew trait,
     rank-up, ship/refit target, rumor, or danger to exploit/avoid.
   - Exit criteria: no two consecutive normal actions feel like pure waiting in
     a 20-minute playtest unless the player intentionally chose a defensive
     posture.
   - Current proof: the post-sail feedback pulse now skips routine docking
     rows so the visible beat can remain the actual reward, such as a dockside
     lead, clean crossing, or hard-water standing story. Captain's Orders now
     turns fresh dockside shortage tips into plotted supply runs and fresh gluts
     into direct cargo loading orders, so ordinary sailing rewards become
     concrete next actions instead of buried log flavor. Captain's Orders also
     skips unaffordable cargo-insurance loops and exposes `Borrow` as a recovery
     action when cash is the only thing blocking an active job or a live trade
     route. `npm run playtest:trace -- --seed 12000 --decisions 90 --out
     reports/playtest-trace-latest.json` passed the 20-minute cadence proxy:
     `90/90` decisions, `15` voyages, `15` arrivals, max pure-wait streak `0`,
     and reasons seen across profit, danger, contract, build, progress, rumor,
     and recovery. Current verification: `npm run verify` passed 161 tests,
     asset verification, production build, and artifact smoke before the
     sandbox-only local bind failure; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:50848`.

7. [x] `M-007` Add replay hooks on the new-run surface.
   - Depends on: current end-of-run recap.
   - Exit criteria: run recap can start a new run with a visible challenge hook
     such as fastest ledger, storm sailor, contract house, low-profile smuggler,
     or high-risk trader.
   - Exit criteria: hooks are lightweight and do not require meta-progression
     for the base game to be fun.
   - Current proof: the closed-run recap now generates three visible replay
     hook cards from the prior ledger, with target, setup, tradeoff, and direct
     `Start` action. Hooked starts are lightweight opening variants rather than
     unlocks: `Clean Credit`, `Contract House`, `Storm Sailor`, `Fast Ledger`,
     and `Risk Trader` can adjust cash/debt, starting refit, faction pressure,
     local work, or opening cargo, then normal run logic takes over. Focused
     reducer tests cover hook generation and hooked opening state. In-app
     browser verification imported a closed-run save, rendered `Contract House`,
     `Fast Ledger`, and `Risk Trader`, clicked `Contract House`, confirmed the
     new run logged `Replay hook: Contract House`, and found zero console
     errors. Current verification: `npm run playtest:trace -- --seed 12000
     --decisions 90 --out reports/playtest-trace-latest.json` passed with max
     pure-wait streak `0`; `npm run verify` passed 162 tests, asset
     verification, production build, and artifact smoke before the sandbox-only
     local bind failure; escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:51000`.

### P1 - Make The Interface Feel Fast And Premium

8. [x] `M-008` Compress the main play surface around the next best action.
   - Depends on: current Route Command, Captain's Orders, Market, Harbor, and
     Contracts surfaces.
   - Exit criteria: a player can complete buy -> insure -> sail -> sell ->
     upgrade or contract delivery without hunting across unrelated tabs.
   - Exit criteria: map, route command, market, ship status, contracts, and key
     actions are scannable in a few seconds on desktop.
   - Exit criteria: compact widths have no text overflow, clipped controls, or
     incoherent overlap.
   - Completion notes: the runnable next-best command moved from the left ledger
     into the map column directly under the latest event pulse, so the primary
     play surface now reads as event -> next action -> route/contract command ->
     map -> log. The command panel exposes `data-target-kind` for smoke
     coverage, and browser smoke now asserts the main surface has an enabled
     next action at run start and after a sale. The compact breakpoint now gives
     the map column priority, keeps the event pulse in a two-column readout,
     hides the secondary log at compact widths, and sizes the route command/map
     so action controls remain visible.
   - Proof: focused reducer and playtest-trace tests passed (`119` tests),
     production build passed, and escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:51444`. In-app browser verification at
     `http://127.0.0.1:4188/?verify=m008-main-action` showed a runnable
     `Load Tools` action with target `buyMaxGood`, visible route choices, and
     zero console errors. Compact verification at `900x700` showed no clipped
     captain order, route command, event pulse, route choice grid, map canvas, or
     port panel, with zero console errors.

9. [x] `M-009` Redesign contract planning as route-first work.
   - Depends on: `M-004`, `M-008`.
   - Exit criteria: contract offers show route fit, required cargo cost,
     deadline slack, hold pressure, expected route risk, and destination upside
     before acceptance.
   - Exit criteria: active contracts are loadable and deliverable from the
     route surface when that is the natural next action.
   - Completion notes: contract planning now has a reusable route-fit summary
     model and a route-offer focus helper, so board rows and the route command
     read from the same facts. Local offers render route-plan cells for fit,
     cargo, slack, risk, hold, and upside before acceptance, with metadata hooks
     for smoke coverage. Plotting a destination now promotes a matching local
     offer in Route Command with a `Take Job`/`Take Risk` action; accepting from
     that route surface preserves the current port desk instead of forcing the
     Contracts tab. Once active, the same route surface switches to load or
     deliver contract work as appropriate.
   - Proof: `npm test -- src/game/contracts.test.ts src/game/reducer.test.ts`
     passed `128` tests, including route-offer fit selection and route-source
     acceptance. `npm run build` passed. In-app browser verification at
     `http://127.0.0.1:4188/?verify=m009-route-contract` plotted a local offer,
     showed a `Take Job` route command with fit/cost/slack/risk/hold/upside
     facts, accepted it from the Market surface, kept `Grayhaven Market`
     visible, converted the command to `Load Job`, and found zero console
     errors. Escalated `npm run browser:smoke` passed at
     `http://127.0.0.1:51823` with route-contract offer assertions.

10. [x] `M-010` Make shipyard/refit choices feel like builds.
    - Depends on: current ship identity, equipment, and crew facility systems.
    - Exit criteria: ship and equipment choices visibly support strategies such
      as fast courier, armored hauler, smuggler, contract runner, storm sailor,
      and market manipulator.
    - Exit criteria: the shipyard compares route-fit deltas, not only raw stats.
    - Completion notes: shipyard previews now score hulls and refits against
      named build archetypes: Fast Courier, Armored Hauler, Smuggler, Contract
      Runner, Storm Sailor, and Market Manipulator. Ship cards show build
      badges plus selected-lane deltas for days, risk, speed, and wear compared
      with the current command. Recommended refits and full equipment rows use
      the same build-fit model, so an install reads as both stat change and
      strategy direction. Tactical reasons such as lane fit, hold pressure,
      crew growth, and crew comfort still outrank generic build labels.
    - Proof: `npm test -- src/game/shipyard.test.ts
      src/game/equipmentPlanner.test.ts` passed `8` focused tests covering
      archetype classification, build deltas, ship route-fit previews, and
      refit build metadata. `npm run build` passed. In-app browser verification
      at `http://127.0.0.1:4188/?verify=m010-builds` plotted a route, opened
      Harbor, showed build badges and route deltas on every ship card,
      build-aware recommended refits and equipment rows, no badge/route text
      clipping, and zero console errors. Escalated `npm run browser:smoke`
      passed at `http://127.0.0.1:52069` with shipyard build assertions.

11. [x] `M-011` Run keyboard, focus, and accessibility pass.
    - Depends on: `M-008`.
    - Exit criteria: core actions are reachable by keyboard, focus order follows
      the game flow, icon-only controls have accessible names/tooltips, reduced
      motion is respected, and contrast issues are logged or fixed.
    - Completion notes: the app now has a stable focus-visible treatment for
      buttons, inputs, textareas, and programmatic panels. Port desk tabs expose
      `tablist`/`tab`/`tabpanel` semantics, `aria-selected`, `aria-controls`,
      and focus handoff into the active desk after tab changes. The map now has
      keyboard port-selection buttons with current/selected state, and route
      choice/sail-plan/graphics controls expose pressed state. Core action
      buttons such as Captain's Orders and Runtime Health have explicit
      accessible names. Reduced motion is written synchronously before the Pixi
      map remounts, and the map reports its reduced-motion state.
    - Proof: `npm test -- src/game/shipyard.test.ts
      src/game/equipmentPlanner.test.ts src/game/contracts.test.ts` passed `17`
      focused tests, and `npm run build` passed. In-app browser verification at
      `http://127.0.0.1:4188/?verify=m011-keyboard-port` confirmed Enter on the
      `Saffron Quay` map port button selected the route, updated
      `aria-pressed`, and produced zero console errors; earlier live checks
      confirmed desk focus moved to `#desk-content` and was labelled by the
      selected tab. Escalated `npm run browser:smoke` passed at
      `http://127.0.0.1:52451` with tab semantics, desk focus, map port
      controls, reduced-motion propagation, route-contract, shipyard-build,
      save/load, and canvas assertions.

### P1 - Make The Ocean Worth Looking At

12. [x] `M-012` Productionize the Pixi OceanSurface.
    - Depends on: resolved Pixi-first architecture.
    - Exit criteria: the default map water looks like realistic moving ocean,
      not a decorative wave overlay.
    - Exit criteria: water communicates swell, current, roughness, storm
      intensity, foam, route risk, and depth/color variation without relying
      only on text labels.
    - Exit criteria: the old analytic line-art water remains only as fallback
      or is removed.
    - Current proof: `src/MapScene.tsx` now draws a production signal layer with
      depth shelves, swell crests, current ribbons, rough-water foam, storm
      fronts, and selected-route risk heat over the shader/low-power base.
      `src/game/ocean.ts` exposes production signal keys, depth tone sampling,
      and visual summaries from the shared ocean field. `npm test --
      src/game/oceanSurface.test.ts src/game/physicsDebug.test.ts
      src/game/renderProbe.test.ts` passed `7` focused tests, and `npm run
      build` passed. In-app browser verification at
      `http://127.0.0.1:4188/?verify=m012-ocean-surface` showed
      `production-ocean-surface-v1`, shader water, nonblank/varied pixels, all
      signal keys, meaningful current/roughness/foam/storm/depth values,
      selected-route route risk `0.297` for a visible `30% risk` Stormhook
      route, Runtime Clean, and zero console errors. Escalated `npm run
      browser:smoke` passed at `http://127.0.0.1:52838`.

13. [x] `M-013` Connect visible ship response more tightly to ocean samples.
    - Depends on: `M-012`.
    - Exit criteria: ship bob, roll, yaw, wake, drift, and route curvature are
      visibly driven by the same sampled water used by route math.
    - Exit criteria: rough water, favorable current, and storm fronts look and
      feel different during travel.
    - Current proof: route drawing now uses the shared `oceanRouteDisplayPoint`
      helper from `src/game/ocean.ts`, so route curvature and ship heading come
      from the same ocean sample model. Ship rendering now samples the water at
      the sprite, scales bob/roll/yaw/drift with wave energy, storm intensity,
      and current assist, and draws heading-correct wake curves whose spread,
      reach, and foam respond to those samples. The map host reports
      `data-ship-motion="ocean-response-v3"` plus compact response telemetry
      for bob, roll, yaw, drift, wake deflection, wave energy, foam, storm,
      route curvature, current assist, wake length, wake spread, wake
      turbulence, and hull response. `src/game/oceanSurface.test.ts`
      covers ship-response signals, route curvature, and stronger rough-water
      inputs. `npm run verify` passed `171` tests, asset verification,
      production build, artifact smoke, and browser regression smoke at
      `http://127.0.0.1:53316`.

14. [x] `M-014` Extend ocean performance evidence.
    - Depends on: `M-012`, current `npm run ocean:benchmark`.
    - Exit criteria: desktop and compact benchmarks record FPS, renderer mode,
      fallback status, nonblank/varied pixel checks, runtime health, and fresh
      console cleanliness.
    - Exit criteria: low-power mode is proven materially cheaper and still
      readable.
    - Current proof: `scripts/ocean_benchmark.mjs` now runs desktop and compact
      shader cases plus desktop and compact low-power cases, with per-result
      viewport metadata. The benchmark asserts renderer mode, minimum average
      FPS, stable/non-unstable pacing, Runtime Clean, nonblank/varied canvas,
      zero page errors, zero console errors, and low-power material-cheaper
      evidence through lower render scale and no higher pixel-color complexity.
      Latest report: `reports/ocean-benchmark-latest.json`, generated
      2026-06-06T10:13:04.896Z. Default desktop `balanced/shader-mesh-v1`
      averaged `48 FPS`; compact desktop `balanced/shader-mesh-v1` averaged
      `55.8 FPS`; low-power desktop `low/low-power-graphics-v1` averaged
      `28.6 FPS`; compact low-power averaged `28.5 FPS`. All four cases were
      stable, foreground, nonblank/varied, and had no adaptive fallback.

15. [x] `M-015` Decide whether a Three.js spike is still needed.
    - Depends on: `M-012`, `M-014`.
    - Exit criteria: if Pixi meets the visual and performance target, Three.js
      stays deferred.
    - Exit criteria: if Pixi fails, the spike has a narrow proof target:
      reflection/refraction quality, input/layer sync, route readability, and
      GPU cost.
    - Current proof: `OCEAN_ARCHITECTURE.md` now includes an `M-015 Closeout`
      section. Decision: keep Harborline's vertical-slice map and ocean
      Pixi-first. Three.js is deferred because current Pixi water communicates
      swell/current/roughness/storm/foam/depth/risk, ship response is sampled
      from the same ocean field, the strategy map needs one renderer for ports,
      routes, labels, overlays, hit testing, keyboard controls, screenshots,
      and compact UI, and current verification/benchmark gates are green. Any
      future Three.js spike must prove reflection/refraction quality,
      input/layer sync, route readability, GPU cost, and migration cost against
      the current Pixi evidence.

### P2 - Add Memorable Systems Depth

16. [x] `M-016` Add memorable contract chains.
    - Depends on: `M-009`.
    - Exit criteria: at least three contracts have recognizable givers,
      escalating steps, rare rewards, faction consequences, and failure stories.
    - Exit criteria: chains add flavor without forcing a campaign structure.
    - Current proof: `src/game/contracts.ts` defines three optional contract
      chains: Maribel Quill's Ledger Audit, Toma Vey's Freeport Lifeline, and
      Commodore Rusk's Convoy Marks. `src/game/reducer.ts` applies chain bonus
      cash, extra standing, final policy rewards, next-stage follow-ups, and
      named failure penalties. `src/App.tsx` and `styles.css` make chain rows
      visibly authored without changing the compact board. `scripts/browser_smoke.mjs`
      now asserts chain giver/stage visibility. `npm test -- src/game/contracts.test.ts
      src/game/reducer.test.ts` passed `133` tests; `npm run verify` passed all
      `176` tests, asset verification, production build, artifact smoke, and
      browser regression smoke.

17. [x] `M-017` Deepen crew identity.
    - Depends on: current crew trait system.
    - Exit criteria: crew can gain injuries, loyalties, rivalries, demands, or
      route preferences that affect retention and route choices.
    - Exit criteria: traits remain readable in Harbor and never become hidden
      spreadsheet modifiers.
    - Current proof: crew now has persistent identity profiles beyond rank and
      traits: temperament, route preference, loyalty, strain, and active demand.
      Route recommendations score and display crew reads, voyages mutate
      loyalty/strain/demands from actual physics, shore leave resolves demands,
      and dismissal cost/morale reflects loyalty pressure. Harbor rows expose
      identity summaries and `data-crew-preference` metadata. Focused reducer
      and economy coverage passed, and full `npm run verify` passed `181`
      tests plus asset verify, production build, artifact smoke, and browser
      regression smoke.

18. [x] `M-018` Expand event deck variety.
    - Depends on: current event deck v2.
    - Exit criteria: repeated runs produce broader arrival, underway, harbor,
      faction, contract, and ocean events without feeling scripted.
    - Exit criteria: event weights are visible enough that players can make
      informed risk decisions.
    - Current proof: event candidates now draw from contracts, crew identity,
      route crew reads, destination faction standing, active contract chains,
      destination economics, and ocean pressure. The Intel desk surfaces
      weighted `World Pulse` and `Arrival Pulse` rows before sailing, and the
      Under Sail desk surfaces weighted `Underway Pulse` rows once underway.
      Focused event-deck tests passed `9/9`, `npm run browser:smoke` passed,
      full `npm run verify` passed `182` tests plus asset/build/artifact/browser
      verification, and the in-app browser at
      `http://127.0.0.1:4175/?verify=event-variety` showed weighted pulse cards
      across all three surfaces with Runtime Clean.

19. [x] `M-019` Add character and faction presentation.
    - Depends on: art direction lock.
    - Exit criteria: captains, crew, customs, factions, and contract givers have
      portraits or icons that add personality without clutter.
    - Exit criteria: generated assets pass the existing asset pipeline and
      small-scale readability checks.
    - Current proof: the vertical-slice presentation layer now uses asset-ready
      identity token specs rather than generated bitmap portraits: each spec has
      initials, role, cue, color, accent, shape, and stable metadata. The app
      renders tokens across captain, faction, crew, contract-giver, authority,
      and encounter surfaces without adding large portrait cards. Focused
      `identityArt` tests passed `3/3`; browser smoke asserts token metadata;
      full `npm run verify` passed `185` tests, assets, production build,
      artifact smoke, and browser smoke; and the in-app browser confirmed
      identity tokens plus Runtime Clean and zero fresh console errors.

20. [x] `M-020` Add animation and audio-ready feedback taxonomy.
    - Depends on: feedback pulse system.
    - Exit criteria: profit, loss, storm, damage, rank-up, contract, customs,
      pirate, upgrade, save, and game-over events expose stable categories for
      future sound and animation polish.
    - Exit criteria: reduced-motion mode remains calm and usable.
    - Current proof: feedback pulses now carry stable `category`, `audioCue`,
      `motion`, and `priority` fields backed by `feedbackTaxonomy`. The player
      surface exposes these as `data-feedback-*` QA hooks and CSS motion classes
      (`calm`, `pop`, `shake`, `surge`, `flash`, `drop`), with reduced motion
      coercing active feedback to `calm`. Focused feedback tests cover taxonomy
      shape and representative events across profit/loss, upgrades, damage,
      contracts, rank-ups, storms, customs, pirates, route moves, saves,
      game-over, and market shifts. Browser smoke asserts taxonomy metadata and
      reduced-motion behavior. Full `npm run verify` passed `187` tests, asset
      verification, production build, artifact smoke, and browser regression
      smoke at `http://127.0.0.1:56749`; in-app browser verification showed
      `data-feedback-category="market"`, `data-feedback-audio-cue="market-shift"`,
      `data-feedback-priority="ambient"`, reduced-motion `calm`, and zero
      fresh console errors.

### P2 - Package It Like A Desktop Game

21. [x] `M-021` Decide the desktop shell.
    - Depends on: vertical-slice target.
    - Exit criteria: Electron, Tauri, or web-only local app choice is documented
      with package size, GPU behavior, save path, update story, platform
      support, and maintenance tradeoffs.
    - Current proof: `DESKTOP_SHELL_DECISION.md` selects Electron for the
      vertical slice. The decision favors renderer predictability for the
      Pixi/WebGL ocean over Tauri's smaller package size, rejects web-only local
      packaging because it does not meet the no-terminal desktop launch goal,
      and defines the next storage, packaging, signing/update, and distribution
      verification gates.

22. [x] `M-022` Move persistence to an app-appropriate path.
    - Depends on: `M-021`.
    - Exit criteria: saves are versioned, backed up, recoverable, and survive
      app update flows in the chosen shell.
    - Exit criteria: import/export/recover/delete still work from Settings.
    - Current proof: app persistence is now routed through async storage
      drivers. Browser localStorage remains the development fallback, while the
      Electron main/preload bridge now writes allowlisted file slots under
      `app.getPath("userData")/harborline-game`: `save.v2.json`,
      `save.backup.v2.json`, `best.v2.json`, `settings.v1.json`, plus
      `runtime.v1.ndjson` under the Electron logs path. Runtime errors append
      to the desktop log bridge when present and fall back to a capped browser
      log. Focused storage tests, full `npm run verify`, and `npm run
      desktop:smoke` pass.
    - Current packaged proof: `npm run desktop:package-smoke` verifies packaged
      Save, Load after restart, export/import, delete/recover,
      corrupted-primary recovery from backup, low-power mode, runtime log
      inspection, abrupt-exit recovery, update replacement, and
      uninstall/reinstall preservation against a temporary Electron `userData`
      path.

23. [x] `M-023` Add app identity and packaging.
    - Depends on: `M-021`, `M-022`.
    - Exit criteria: app name, icon, loading state, about/version panel, release
      notes link, crash recovery language, and first packaged build exist.
    - Exit criteria: packaged app launches without terminal commands.
    - Current proof: `npm run desktop:package:mac` creates
      `release/Harborline-darwin-arm64/Harborline.app` with Harborline bundle
      name/id/version/category and generated ICNS icon assets. The in-game
      Settings panel displays app/runtime/version/save/log/recovery metadata
      and a release-notes link. `npm run desktop:package-smoke` passes against
      the packaged executable.

24. [x] `M-024` Create distribution verification.
    - Depends on: `M-023`.
    - Exit criteria: build, package, launch, save/load, import/export,
      uninstall/reinstall, update, low-power mode, and crash recovery smoke are
      documented and repeatable.
    - Current proof: package and packaged-launch smoke scripts exist and are
      passing for app launch, identity metadata, save write, restart/load,
      import/export, delete/recover, corrupted-save fallback, low-power
      graphics, storage bridge, log write, abrupt-exit recovery, installed-app
      launch, update replacement, uninstall/reinstall preservation, and
      Electron console cleanliness.

### P3 - Vertical Slice And Release Candidate

25. [ ] `M-025` Content-complete the vertical slice.
    - Depends on: `M-003`, `M-004` through `M-014`.
    - Exit criteria: selected ports, goods, ships, equipment, contracts, crew,
      events, factions, ocean states, saves, score, and recap support a polished
      20-minute run.

26. [ ] `M-026` Run three external playtests.
    - Depends on: `M-002`, `M-025`.
    - Exit criteria: three fresh players can launch, understand, play, finish or
      fail clearly, and produce scorecards without developer coaching.
    - Exit criteria: findings are converted into blocker, polish, or backlog
      tasks.

27. [ ] `M-027` Freeze release-candidate scope.
    - Depends on: `M-026`.
    - Exit criteria: remaining work is separated into release blockers,
      high-value polish, and post-release backlog.
    - Exit criteria: no new system can enter the release candidate unless it
      closes a blocker or directly improves the vertical-slice target.

28. [ ] `M-028` Produce the first release candidate.
    - Depends on: `M-024`, `M-027`.
    - Exit criteria: packaged desktop build installs cleanly, runs without
      terminal help, preserves saves, passes verification from a fresh checkout,
      and has no known release blockers.

## Active Sprint

1. [x] Create the end-of-run score and replay recap.
   - Gate: when the run ends, the player sees a clear score breakdown covering
     cash, cargo value, ship value, equipment, crew, hull, debt, contracts, and
     notable events.
   - Gate: the recap includes an obvious new-run action and at least one
     replay hook such as "try a faster run", "highest profit good", "best
     contract", or "risky crossings survived".
   - Gate: score helper tests prove the displayed total matches the reducer
     score and handles debt, cargo, crew XP, equipment, and spare ships.
   - Current gate: `scoreBreakdownFor` and `runRecapFor` now power a live score
     ledger and closed-run recap. The recap shows score components, contract
     outcomes, trouble/progress beats, ranked run label, replay prompt, and
     `Start New Run`. `npm run verify` passed with 117 tests; browser smoke on
     `http://127.0.0.1:4185/?graphics=low&verify=score-recap-clean` drove a
     real Wait-button run to game over and confirmed recap rendering, score
     breakdown, runtime clean, nonblank/varied canvas pixels, and zero
     current-page console errors.

2. [x] Automate a browser regression smoke.
   - Gate: a script launches the built or preview app, verifies the shell,
     route command strip, canvas nonblank/varied pixel probe, market Max/All,
     route selection, insurance, sailing, save/export/delete/recover/import,
     and runtime-clean state.
   - Gate: `npm run verify` invokes the browser smoke or a documented
     equivalent command.
   - Gate: the smoke fails on blank canvas, missing key controls, broken core
     actions, fresh console errors, or runtime health errors.
   - Current gate: `scripts/browser_smoke.mjs` now launches the production
     Vite preview, opens `/?graphics=low&verify=browser-smoke` in Chromium with
     software WebGL flags, clears saved state, verifies Runtime Clean and the
     nonblank/varied map pixel probe, drives Market `Max`, route choice,
     insurance, sailing, route memory, Market `All`, save, export, delete-save,
     recover, import, and fails on page errors or fresh console errors. `npm
     run verify` now invokes the smoke after tests, asset verification, build,
     and artifact smoke. Full verification passed with 124 tests and browser
     regression smoke at `http://127.0.0.1:61965`.

3. [x] Resolve the ocean renderer decision with hard evidence.
   - Gate: default desktop viewport has measured smoothness evidence from the
     local machine, not only visual inspection.
   - Gate: `OCEAN_ARCHITECTURE.md` records the final choice: Pixi-first shader,
     Pixi plus Three.js water layer, or renderer migration.
   - Gate: the chosen path has a clear low-power fallback and browser canvas
     regression checks.
   - Current gate: `OCEAN_ARCHITECTURE.md` now records the Pixi-first shader
     decision as resolved for the current product direction. `MapScene` exposes
     foreground render telemetry on the map host, and `npm run ocean:benchmark`
     measures the production preview at a 1440x920 desktop viewport. Latest
     report: `reports/ocean-benchmark-latest.json`, generated
     2026-06-06T05:50:40Z. Default desktop `balanced/shader-mesh-v1` averaged
     49.5 FPS across 8 foreground samples with stable pacing, nonblank/varied
     canvas, 24 color buckets, and no adaptive fallback. Low-power
     `low/low-power-graphics-v1` averaged 28.5 FPS with stable pacing,
     nonblank/varied canvas, 12 color buckets, and no adaptive fallback.

4. [ ] Tighten the main play surface for repeated sessions.
   - Gate: map, route command, market, ship status, contracts, and key actions
     can be scanned without long reading.
   - Gate: the player can complete buy -> insure -> sail -> sell -> upgrade or
     contract delivery without hunting across unrelated tabs.
   - Gate: mobile/compact and desktop widths have no text overflow or incoherent
     overlap.
   - Current progress: the sail posture control now supports four compact
     choices, including `Quiet` for low-profile customs-aware travel. Route
     command metrics now show the active posture advice directly. Route
     Command and Intel now surface remembered lane outcomes so repeated runs
     carry a little history without adding permanent punishment. Contracts now
     surface in Route Command when a plotted lane or current port has active
     work: the strip shows job cargo/deadline state, can load only the missing
     contract cargo, and can deliver ready work without opening the contract
     board. Captain's Orders now turns post-profit empty-hold moments into
     direct `Buy Refit` prompts, and the midgame upgrade window into direct
     `Buy Ship` prompts when the next hull is affordable. The Harbor desk now
     surfaces the active crew facility, and quarters refits visibly affect
     shore leave cost, morale recovery, hard-water strain, payday morale, crew
     XP gain, and crew casualty protection. Route Command now previews a
     shared physics profile such as steady water, delay risk, cargo water, or
     current push before sailing. Current proof: `npm run verify` passed with
     128 tests and browser regression smoke at `http://127.0.0.1:62723`;
     in-app browser verification imported a post-profit run, confirmed the
     `Buy Refit` Captain's Order, clicked it, and saw Galley Mess installed
     with Runtime Clean.

## Phase 0 - Project Control And Verification

1. [x] Maintain a single master roadmap.
   - Gate: this file defines the major goal, active sprint, sequenced tasks, and
     exit criteria.

2. [x] Keep one-command verification.
   - Gate: `npm run verify` runs unit/integration tests, TypeScript build,
     production Vite build, asset verification, artifact smoke, and automated
     browser regression smoke.
   - Current gate: renderer-specific performance evidence is covered by the
     separate `npm run ocean:benchmark` gate documented in `VERIFY.md`.

3. [x] Keep manual browser smoke documented.
   - Gate: `VERIFY.md` lists the live app checks for shell load, nonblank
     canvas, route command, market flow, voyage, save tools, runtime health, and
     console cleanliness.

4. [x] Promote browser smoke into automation.
   - Gate: covered by Active Sprint task 2.
   - Current gate: covered by `scripts/browser_smoke.mjs`, `npm run
     browser:smoke`, and the passing `npm run verify` gate recorded above.

5. [ ] Add release-blocker tracking.
   - Gate: this file or a dedicated release file identifies blocker severity,
     owner/status, reproduction steps, and exit proof for every known release
     blocker.

## Phase 1 - Prototype Stability And Save Safety

1. [x] Normalize save migrations.
   - Gate: saves have an explicit version, optional fields default safely,
     corrupted saves recover gracefully, and legacy prototype saves load without
     data loss.

2. [x] Capture runtime health.
   - Gate: global errors/rejections, reducer failures, save/load failures, Pixi
     setup/draw failures, and asset failures are visible in the Intel error log.

3. [x] Protect reducer invariants.
   - Gate: tests prove cash, cargo, hull, morale, debt, standing, permits,
     contracts, insurance, voyage, and encounter state cannot enter impossible
     values through normal actions.

4. [x] Remove build-noise distractions.
   - Gate: Tailwind parent-config leakage is neutralized, Pixi is lazy-loaded
     into a separate chunk, and build warnings are either gone or documented.

5. [x] Add save backup and recovery UX.
   - Gate: the player can export, import, delete, and recover from invalid saves
     without losing the current valid run unexpectedly.
   - Gate: save recovery status is human-readable and test-covered.
   - Current gate: active saves are versioned under `harborline.save.v2`, and
     the previous valid run is copied to `harborline.save.backup.v2` before
     save overwrite, import, or delete. Settings now exposes Export, Import,
     Recover, and Delete Save with visible backup/recovery status, and import
     or recovery preserves the current Settings desk so player feedback remains
     visible. Tests cover overwrite/import/delete backup behavior, corrupted
     import safety, backup clearing, and recovery. `npm run verify` passed with
     124 tests and browser regression smoke at `http://127.0.0.1:61965`.

## Phase 2 - Addictive Merchant Core

1. [x] Tighten buy-sail-sell.
   - Gate: each turn surfaces at least one profitable option, one risky
     high-upside option, and one defensive option without spreadsheet work.

2. [x] Surface trade opportunities.
   - Gate: market rows show best known destination, margin, days, risk, local
     stock/bid, and a concise reason.
   - Current gate: market rows now add a freight-pressure line for each good,
     and trade reasons can call out stockout demand, import squeeze, storm
     demand, or export surplus instead of generic spread language.

3. [x] Add fast market controls.
   - Gate: market rows support Buy, Max, Sell, and All without layout shifts.
   - Gate: batch sell logs revenue and profit/loss and grants trade XP.

4. [x] Add run pacing beats.
   - Gate: early, mid, and late run phases affect contract size, deadlines,
     rewards, ship upgrade timing, and high-risk late opportunities.

5. [x] Improve reward cadence.
   - Gate: voyages can produce profit, market tips, XP, morale movement,
     faction movement, rank-ups, or upgrade feedback.

6. [x] Add score pressure during the run.
   - Gate: the HUD or Intel surface shows current net worth, target pace, and
     whether the player is trending toward a weak, solid, or excellent run.
   - Gate: the player can understand the score without waiting until game over.
   - Current gate: the left ledger now includes a compact `Score Pace` panel
     with Ahead/On Pace/Building/Behind status against a Trade House target
     curve plus cargo, hull, crew, and debt score components. Browser smoke
     confirmed the score ledger rendered on a fresh run.

7. [x] Add end-of-run replay hooks.
   - Gate: covered by Active Sprint task 1.
   - Current gate: the game-over recap now includes a deterministic replay hook
     based on debt drag, failed contracts, trouble events, refit timing, or
     contract count.

## Phase 3 - Route Decisions And Ocean-Aware Play

1. [x] Build the compact route command surface.
   - Gate: selecting a route exposes transit, water, cargo, hold, ship, policy,
     authority, and action metrics in one place.

2. [x] Add route-window/tradewind timing.
   - Gate: route previews compare today against near-future forecast windows
     and label timing such as steady, fast, closing, or better later.

3. [x] Make routes respond visibly to water.
   - Gate: route preview and in-voyage travel show wind/current effects through
     path curvature, speed estimates, sail-plan labels, and risk deltas.

4. [x] Add buoyancy-style ship motion.
   - Gate: ship bob, roll, yaw, wake angle, and drift are sampled from the same
     ocean field the route math uses.

5. [x] Make sailing tactically richer.
   - Gate: before sailing, the player can choose between at least three route
     postures such as fast, balanced, safe, reefed, or smuggling-low-profile.
   - Gate: each posture changes time, risk, wear, inspection odds, cargo
     exposure, and reward potential in a visible way.
   - Current gate: sailing now has Reefed, Balanced, Hard Sail, and Quiet
     postures. The shared route model applies posture effects to speed, route
     risk, hull wear, sea-watch strain, and customs inspection odds; sailing
     logs include the chosen order. Focused tests cover Quiet speed/risk/wear
     behavior and prove Quiet can avoid an inspection that Balanced triggers
     under the same cargo, patrol, and standing pressure. Browser smoke on
     `http://127.0.0.1:4186/?graphics=low&verify=quiet-posture` confirmed the
     four-button control, active Quiet state, `Quiet order` route command,
     posture advice, runtime clean state, nonblank/varied canvas pixels, and no
     current-page console errors.

6. [x] Add route memory.
   - Gate: the game remembers recent route outcomes and can label lanes as
     lucky, dangerous, profitable, storm-torn, inspected, or pirate-heavy.
   - Gate: remembered route state affects player decisions without forcing
     permanent punishment.
   - Current gate: route memory now records directed lane trips, last crossing
     day, projected cargo swing, best/worst swing, wear, pirate trouble,
     customs trouble, heavy weather, and a compact label/detail for player
     recall. Route Command shows the selected lane memory, Intel lists the most
     recent remembered lanes, and saved route memory is normalized on load.
     Tests cover a profitable clean crossing, pirate-marked water, and malformed
     saved memory recovery. `npm run verify` passed with 120 tests; browser
     smoke on `http://127.0.0.1:4187/?graphics=low&verify=route-memory`
     sailed Grayhaven to Saffron Quay, confirmed the captain log route-memory
     note, confirmed Intel showed `Grayhaven -> Saffron Quay` as a proven money
     lane, and reported RuntimeClean, `low-power-graphics-v1`, nonblank/varied
     canvas probe, and zero current-page console errors.

## Phase 4 - Production Ocean And Physics

1. [x] Define the shared ocean engine boundary.
   - Gate: one `OceanField` contract serves gameplay, rendering, voyage events,
     route previews, ship motion, foam, and wake direction.

2. [x] Prototype shader-driven water.
   - Gate: moving water uses shader or mesh displacement, layered swells,
     normals/normal-like lighting, foam, current streaks, storm tint, and color
     depth.
   - Gate: it compiles in production preview and the canvas is nonblank and
     varied after reload.
   - Historical proof: the original shader path used `shader-mesh-v1`;
     production preview build and `npm run ocean:benchmark` proved
     nonblank/varied canvas output and stable foreground smoothness at a 49.5
     FPS average across 8 samples. Follow-up `M-039B` now tracks the active
     `shader-mesh-v2` sampled-water renderer.

3. [x] Replace the original analytic water overlay.
   - Gate: CPU-drawn fake wave lines are removable while water still
     communicates swell, current, roughness, storms, foam, and route risk.

4. [x] Decide final renderer architecture.
   - Gate: covered by Active Sprint task 3.
   - Current gate: Pixi-first shader/mesh water is the recorded architecture in
     `OCEAN_ARCHITECTURE.md`; Three.js is deferred unless Pixi fails a future
     visual target.

5. [~] Hit the ocean performance gate.
   - Gate: target 60 FPS on the development machine at default desktop viewport
     or a documented acceptable threshold if browser automation cannot report
     true FPS.
   - Gate: low-power mode is visually distinct, readable, and materially
     cheaper.
   - Gate: canvas pixel checks prove nonblank, varied water across desktop and
     compact layouts.
   - Current progress: `npm run ocean:benchmark` records a default desktop
     acceptable threshold of 30 FPS and measured 49.5 FPS average in the current
     headless foreground benchmark. Low-power measured 28.5 FPS average at its
     24 FPS threshold. Remaining proof: compare compact viewport behavior and
     capture stronger evidence that low-power is materially cheaper on real GPU
     hardware, not only lower-resolution and stable in headless Chromium.

6. [~] Upgrade from visual physics to gameplay physics.
   - Gate: water sampling affects not only route estimates but also in-voyage
     event probabilities, cargo damage, crew strain, sail posture, repairs,
     wake/ship response, and possibly current-assisted detours.
   - Gate: the player can predict these effects from route preview and logs.
   - Current progress: `routePhysicsProfile` now converts sampled wind,
     current, roughness, storm intensity, wave energy, sail posture, load, and
     ship skill into visible Route Command physics labels and reducer-readable
     delay/cargo/crew/current-assist probabilities. Voyage arrival can now add
     a current/weather delay, damage cargo with insurance handling, strain crew
     only on genuinely hard profiles, or grant a current-assisted crossing
     beat. Focused reducer tests prove posture/load affect the profile and that
     a real rough map route can produce delay, cargo loss, and crew strain.
     Current proof: `npm run verify` passes with 130 tests and browser
     regression smoke at `http://127.0.0.1:63276`; in-app browser verification
     confirmed the selected Route Command exposes `Physics` with
     delay/cargo/crew values and Runtime Clean. A hidden physics debug panel now
     exposes route/water/motion values for tuning. Remaining work: deeper repair
     impacts and broader real-time ship-response gameplay beyond the existing
     visual bob/roll/wake.

7. [x] Add physics debugging tools.
   - Gate: a dev/debug panel can show sampled wind, current, storm, roughness,
     wave energy, route speed factor, and ship-motion values for the selected
     route.
   - Gate: debug tools are hidden or harmless in production play.
   - Current gate: `routePhysicsDebugFor` now builds a route debug snapshot from
     the shared ocean field, route model, route physics profile, and ship-motion
     sampler. Intel shows `Physics Debug` only when `?debug=physics`,
     `?debug=all`, `?physicsDebug=1`, or `localStorage.harborline.debug.physics`
     is enabled. The panel reports selected-route wind/current vectors, storm,
     roughness, wave energy, speed factor, route profile, and P25/P50/P75 motion
     samples with bob/roll/yaw/hull response/wake values. Focused tests cover model parity
     with route conditions/profile/risk/wear and finite sampled ship motion.
     Current proof: `npm run verify` passed tests, assets, and build with 146
     tests before sandbox-only local bind failure; escalated
     `npm run browser:smoke` passed at `http://127.0.0.1:65329`; in-app browser
     verification on `http://127.0.0.1:65330/?debug=physics&verify=physics-debug-visible`
     confirmed the panel is hidden without the flag, visible with the flag, and
     includes Wind, Current, Water, Speed, P25 motion samples, and Runtime Clean.

## Phase 5 - Art Direction And Asset Pipeline

1. [~] Lock visual style references.
   - Gate: approved references exist for ships, ports/islands, characters,
     icons, ocean, storm state, UI ornaments, and reward/loss feedback.
   - Current status: ship, port, and ocean references exist; character, icon,
     storm, and UI ornament references remain open.

2. [x] Build generated asset pipeline.
   - Gate: scripts can generate, background-remove or chroma-key clean, preview,
     catalog, mirror to public runtime paths, and verify Gemini assets.
   - Gate: `npm run assets:verify` is part of `npm run verify`.

3. [~] Convert ships into production sprites.
   - Gate: every ship has transparent sprites, consistent scale, readable
     silhouette, selected/hover state, wake anchors, dock offsets, and route
     motion anchors.
   - Open issue: final art QA and player-facing ship preview states are not
     complete.

4. [~] Convert ports into production islands.
   - Gate: every port has unique island/harbor art, market identity, faction
     cues, hover/current/selected states, hit radius, labels, and readable
     gameplay footprint.
   - Open issue: final island silhouettes and stronger market/faction cues are
     not complete.

5. [x] Add character art where it matters.
   - Gate: captains, crew, customs, factions, and contract givers have portraits
     or icons that add personality without clutter.
   - Current proof: `identityArt.ts` defines compact token/icon specs for the
     captain, all factions, all crew roles, named contract givers, and encounter
     identities. The UI renders them in repeated operational rows and encounter
     desks, with focused tests, browser smoke metadata checks, full verify, and
     in-app Runtime Clean evidence. Future generated portraits can replace
     these token specs without changing the gameplay surfaces.

6. [~] Add animation polish.
   - Gate: ships, water, ports, route previews, rewards, losses, warnings, and
     contract completions have motion hooks that clarify state.
   - Gate: reduced-motion settings preserve usability.
   - Current status: feedback motion hooks and reduced-motion calming are now
     implemented for the core event pulse. Full final animation polish for
     ships, ports, route previews, and richer reward/loss effects remains open.

7. [x] Add audio-ready event taxonomy.
   - Gate: feedback events expose stable categories for future sound: profit,
     loss, storm, damage, rank-up, contract, customs, pirate, upgrade, save, and
     game over.
   - Current proof: `M-020` closed with stable feedback categories, audio-cue
     names, motion hooks, priority metadata, focused tests, browser smoke, full
     `npm run verify`, and in-app reduced-motion verification.

## Phase 6 - Interface And Player Experience

1. [~] Redesign the main play surface.
   - Gate: covered by Active Sprint task 4.
   - Current progress: route command, recommended refits, direct post-profit
     refit/hull orders, contract plan summaries, exact contract cargo loading,
     route-command delivery actions, market Max/All, Captain's Orders,
     feedback pulse, and settings controls exist. Harbor now includes a compact
     `Crew Facility` row so the player can read the active
     quarters/galley/cabins effect without opening a rulebook. Intel now exposes
     event-pressure previews through `World Pulse` and `Arrival Pulse` rows,
     turning hidden event weights into readable planning pressure. The under-sail
     desk now exposes `Underway Pulse` while a voyage is active, so crossing-time
     event pressure is visible on the surface the player is actually using.

2. [x] Add decision-focused route previews.
   - Gate: before sailing, the player sees days, risk, expected wear, water
     state, sail plan, cargo exposure, insurance, customs risk, destination
     authority, and likely upside in a compact view.

3. [x] Improve market ergonomics.
   - Gate: covered by Phase 2 task 3.

4. [x] Improve feedback and juice.
   - Gate: profit, rank-ups, damage, storms, inspections, missed deadlines, and
     upgrade wins produce immediate visual/audio-ready feedback hooks.

5. [x] Add onboarding by doing.
   - Gate: the first run guides trade, plotting, insurance, sailing, repair,
     crew, contracts, and free play through live contextual actions.

6. [x] Add end-of-run recap UX.
   - Gate: covered by Active Sprint task 1.
   - Current gate: the Port desk now swaps to a ranked run recap on game over,
     including score breakdown, outcomes, highlights, replay prompt, and a
     stable `Start New Run` action.

7. [ ] Add keyboard and accessibility pass.
   - Gate: core actions are reachable by keyboard, focus order is sane, contrast
     is acceptable, reduced motion is respected, and icon-only controls have
     labels/tooltips.

8. [ ] Add dense-mode polish.
   - Gate: desktop layout supports repeated play with fewer scrolls and clearer
     information hierarchy while compact widths remain readable.

## Phase 7 - Systems Depth

1. [x] Contracts v2.
   - Gate: contracts include multi-stop runs, urgent cargo, escorts,
     smuggling/legal ambiguity, partial delivery outcomes, and visible deadline
     pressure.

2. [x] Factions and politics v2.
   - Gate: standing affects tariffs, permits, inspection risk, contract quality,
     port services, and market access in predictable ways.

3. [x] Crew progression v2.
   - Gate: crew ranks grant visible specialties, wages scale fairly, rank-ups
     are logged, and losing/dismissing crew creates real tradeoffs.

4. [x] Ship identity v2.
   - Gate: each ship has distinct role, silhouette, upgrade path, resale
     profile, handling feel, and outfitting fit.

5. [x] Encounter redesign.
   - Gate: pirates, customs, storms, and sea watches each create at least two
     interesting choices rather than a random penalty.

6. [ ] Contracts v3: memorable jobs.
   - Gate: contract givers, job chains, rare rewards, faction consequences, and
     failure stories create recognizable mini-arcs.

7. [ ] Crew v3: relationships and identity.
   - Gate: crew can gain traits, injuries, loyalties, rivalries, or demands that
     affect route choices and retention.
   - Current progress: quarters refits now give crew facilities with distinct
     behavioral effects. `Crew Quarters`, `Officer Cabins`, and `Galley Mess`
     influence morale recovery, hard-water strain, payday morale, shore leave
     cost, crew XP speed, and casualty protection. Crew can now persistently
     gain `Loyal`, `Storm-Scarred`, and `Marketwise` traits from high-morale
     rank-ups, hard-water handling, and cargo/contract/trade work. Traits are
     normalized on load, displayed in Harbor crew rows, affect derived ship
     stats, change casualty protection, and alter dismissal/severance tradeoffs.
     Focused tests cover loyal trait gain and retention cost, storm-scar trait
     gain and open-water handling, malformed save normalization, galley shore
     leave economics, and officer-cabin XP acceleration. Current proof:
     `npm run verify` passed tests, assets, and build with 144 tests before
     sandbox-only local bind failure; escalated `npm run browser:smoke` passed
     at `http://127.0.0.1:65137`; in-app browser verification on
     `http://127.0.0.1:65138/?verify=crew-traits` confirmed Navigator and
     Boatswain trait rows plus Runtime Clean.

8. [ ] Fleet/shipyard v3: build identity.
   - Gate: ship and equipment choices enable distinct strategies such as fast
     courier, armored hauler, smuggler, contract runner, storm sailor, or market
     manipulator.
   - Current progress: the quarters slot now creates build identity beyond raw
     stat deltas: comfort/training facilities can be recommended by the refit
     planner when morale or crew pressure makes them valuable. Browser smoke
     verifies the production Harbor desk exposes the crew facility row.

9. [x] Event deck v2.
   - Gate: events are data-driven, weighted by route/port/faction/ocean state,
     and broad enough that repeated runs do not feel scripted.
   - Current progress: `eventDeck.ts` now builds a weighted world-event deck
     from freight-pressure signals, current-port politics, harbor logistics,
     rough approaches, ship stats, hull state, crew morale, and local export
     stock. Port downtime can now resolve events that add shortage/glut rumors,
     inspection or convoy politics, market stock movement, standing shifts, cash
     salvage, hull patching, or crew morale recovery. Clean dockings can now
     resolve arrival cards tied to carried cargo, hard-water physics, favorable
     current packets, tariff manifests, and remembered route lanes. Focused tests
     cover freight-pressure card construction, weighted drawing, wait-day
     integration, arrival candidate construction, clean-docking arrival
     integration, underway candidate construction, and an underway voyage-watch
     reducer event. Intel now previews the weighted `World Pulse` and selected
     route `Arrival Pulse` so the player can read likely event pressure before
     waiting or sailing. The under-sail desk now previews `Underway Pulse` cards
     tied to current seams, watch drills, cargo trim, wreckage marks, and market
     packets, with effects for distance, crew XP, captain XP, cash, morale, and
     rumors. Current proof: `npm run verify` passed tests, assets, and build with
     141 tests before sandbox-only local bind failure; escalated
     `npm run browser:smoke` passed at `http://127.0.0.1:64807`; in-app browser
     verification on `http://127.0.0.1:64808/?verify=underway-pulse-final`
     confirmed Under Sail, Underway Pulse, and the Runtime Clean marker.
     Follow-up variety pass: `M-018` added authored contract, crew, faction,
     harbor, arrival, underway, and storm-glass cards; focused event-deck tests
     passed `9/9`; `npm run verify` passed `182` tests plus asset/build/
     artifact/browser verification; and the in-app browser at
     `http://127.0.0.1:4175/?verify=event-variety` showed weighted World,
     Arrival, and Underway Pulse cards with Runtime Clean.

## Phase 8 - Balance, Simulation, And Playtest

1. [x] Add balance simulator.
   - Gate: `npm run simulate` runs at least 1,000 seeded reducer-driven runs and
     reports win rate, average/median score, bankruptcy rate, days survived,
     completed contracts, upgraded-run rate, profitable goods, and dead ends.

2. [x] Add balance telemetry snapshots.
   - Gate: simulator output can be saved and compared across changes.
   - Gate: tuning changes record before/after effects on score, bankruptcy,
     contract completion, upgrade timing, and dominant goods.
   - Current gate: `npm run simulate` now emits a schema-versioned balance
     snapshot with target-band status around the existing reducer-driven
     simulator report. `npm run balance:snapshot -- --runs <n> --seed <seed>
     --out reports/balance-snapshot-latest.json` saves snapshots, and
     `--compare <path> --compareOut reports/balance-comparison-latest.json`
     writes metric deltas for score, win rate, bankruptcy, days survived,
     contract completion, upgrade rate, seed changes, and dominant goods.
     Current artifacts: `reports/balance-snapshot-latest.json` and
     `reports/balance-comparison-latest.json`.

3. [x] Define target balance bands.
   - Gate: desired ranges exist for win rate, average score, bankruptcy rate,
     upgrade timing, final-day survival, and contract completion.
   - Current gate: `defaultBalanceTargets` defines desired ranges for win rate,
     average score, median score, bankruptcy rate, average days survived,
     completed contracts, and upgraded-run rate. Snapshots label each metric as
     below/within/above target and produce attention notes. Latest evidence:
     `reports/balance-snapshot-latest.json` (`repair-cost-pacing-1000`, 1,000
     runs, seed `9000`) has all tracked balance metrics inside target.

4. [ ] Create playtest scorecards.
   - Gate: each playtest records fun spikes, confusion, dead turns, exploit
     routes, UI friction, replay desire, and the next change to make.

5. [ ] Run first external playtest.
   - Gate: a fresh player can launch, play 20 minutes, and produce actionable
     notes without developer coaching.

6. [ ] Run hard critique pass.
   - Gate: the game is evaluated against fun, readability, speed, novelty,
     replayability, and production quality; failures become sequenced tasks.

## Phase 9 - Desktop Productization

1. [x] Decide desktop shell.
   - Gate: Electron, Tauri, or web-only local app choice is documented with
     package size, GPU behavior, save path, update story, platform support, and
     maintenance tradeoffs.
   - Current proof: `DESKTOP_SHELL_DECISION.md` chooses Electron for the first
     packaged vertical slice and documents the deferred Tauri path, app-data
     save/log contract, security posture, update stance, macOS-first target,
     and implementation gates.

2. [x] Package local desktop builds.
   - Gate: a clean install launches without terminal commands, preserves saves,
     uses a proper app name/icon, and has a clear app version.
   - Current status: `npm run desktop:package:mac` produces
     `release/Harborline-darwin-arm64/Harborline.app`; `npm run
     desktop:package-smoke` launches the packaged app and proves app-owned save
     writes, restart/load, import/export, delete/recover, corrupted-save
     fallback, low-power mode, log writes, installed-app launch, update
     replacement, and uninstall/reinstall preservation.

3. [~] Add settings.
   - Gate: graphics quality, reduced motion, save reset, import/export, audio
     volume, window/fullscreen behavior, and accessibility toggles exist.
   - Current status: graphics quality, reduced motion, and export/import/
     recover/delete save controls exist; audio and window/fullscreen depend on
     shell/audio choices.

4. [x] Add durable local persistence.
   - Gate: saves live in an app-appropriate path, can be backed up, survive
     updates, and can be recovered if corrupted.
   - Current status: browser-local saves are versioned, legacy-compatible, and
     backed up before overwrite/import/delete with tested recovery. The
     renderer now uses an async app-storage adapter with browser fallback and
     the Electron main/preload bridge writes saves, backups, best score,
     settings, and runtime logs to app-owned paths. Packaged smoke covers
     restart/load, import/export, delete/recover, corrupted-save fallback, and
     logs, abrupt-exit recovery, update replacement, and uninstall/reinstall
     preservation.

5. [x] Add app identity.
   - Gate: title, icon, splash/loading state, about/version panel, release notes
     link, and crash recovery language are in place.
   - Current proof: title, generated icon, boot screen, desktop metadata panel,
     release notes, and recovery copy are implemented and covered by browser and
     Electron smoke.

6. [x] Add distribution checklist.
   - Gate: build, sign/notarize if applicable, package, smoke install, launch,
     save/load, uninstall/reinstall, and update verification are documented.
   - Current status: `desktop:package:mac` and `desktop:package-smoke` document
     and automate package/launch/save/load/import/export/recover/delete,
     corrupted-save fallback, low-power, log smoke, installed-app launch,
     abrupt-exit recovery, update replacement, and uninstall/reinstall
     verification.

## Phase 10 - Vertical Slice

1. [x] Lock vertical-slice target.
   - Gate: one polished 20-minute run target includes final-ish art direction,
     production ocean path, tuned economy, meaningful upgrades, contracts,
     encounters, save/load, and end score.
   - Current status: covered by `M-003` and `VERTICAL_SLICE_TARGET.md`.

2. [ ] Content-complete the slice.
   - Gate: selected ports, goods, ships, equipment, contracts, crew, events, and
     factions are enough to support the 20-minute run without obvious gaps.

3. [ ] Ship the vertical slice locally.
   - Gate: a fresh player can launch, understand, play, finish, and want to
     replay without developer guidance.

4. [ ] Playtest the vertical slice.
   - Gate: at least three playtests produce tracked findings, fixes, and a
     decision on whether to expand content or improve the core loop first.

5. [ ] Freeze scope for release candidate.
   - Gate: remaining work is separated into blocker, high-value polish, and
     post-release backlog.

## Phase 11 - Full Game Production

1. [ ] Expand the content set.
   - Gate: the final map has enough ports, goods, factions, contracts, ships,
     equipment, crew roles, events, and route archetypes to support repeated
     runs without obvious repetition.

2. [ ] Add replay structure.
   - Gate: runs have score comparison, challenge modifiers, optional captain
     starts, end-of-run breakdowns, and a reason to start another run without
     relying on shallow meta-progression.

3. [~] Tune the full economy and risk model.
   - Gate: simulator and playtest data show profitable routes, risky gambles,
     defensive recovery lines, upgrade timing, bankruptcy pressure, and faction
     consequences without dominant exploits.
   - Current progress: `freightPressureSignalFor` combines port stock, import
     and export identity, inbound ocean/logistics pressure, rumors, trends, and
     political friction into readable market signals. Market rows and Intel now
     surface the top pressure pockets, and opportunity reasons use the same
     signal for stockout demand, import squeeze, storm demand, and export
     surplus. Balance telemetry now saves and compares simulator snapshots
     against target bands for score, bankruptcy, survival length, contracts,
     upgrades, and dominant goods. Contract pressure was tuned from always-full
     two-job boards to lean neutral boards, local upgrade-window choice, trusted
     second slots, and stronger payouts per job. Focused tests cover strained
     import lanes, export surplus, route-reason integration, contract board
     caps, trusted/local second slots, active/recent contract preservation,
     simulator end-state classification, direct repair recovery, repair/debt
     pacing constants, balance snapshot creation, snapshot comparison, and
     metric formatting. Current proof: `reports/balance-snapshot-latest.json`
     from `1,000` runs at seed `9000` reports every tracked balance metric
     inside target: win `49%`, average score `$2,103`, median `$1,485`,
     bankruptcy `16%`, days survived `53d`, contracts `8`, and upgrade rate
     `71%`. Remaining work: exploit checks and playtest tuning.

4. [ ] Productionize art and audio.
   - Gate: all final ships, ports, characters, icons, ocean states, feedback
     effects, and audio cues are complete, verified, and style-consistent.

5. [ ] Performance and compatibility pass.
   - Gate: target desktop machines can run the game smoothly; low-power mode is
     acceptable; save, render, and input behavior are stable across supported
     OS/display configurations.

6. [ ] Create release candidate.
   - Gate: packaged desktop build installs cleanly, runs without terminal,
     survives reload/update/save/import/export flows, has no known blocking
     bugs, and passes verification from a fresh checkout.

7. [ ] Ship and triage post-release feedback.
   - Gate: release notes, known issues, recovery instructions, feedback
     channels, and first post-release patch list are complete.

## Deferred But Important

- Audio design: waves, harbor ambience, UI clicks, coin/profit hits, storm
  warnings, sail creaks, cannon/inspection tension.
- Accessibility: color contrast, text scaling, reduced motion, keyboard
  operation, readable icon alternatives.
- Mod/content hooks: ports, goods, ships, contracts, factions, event decks, and
  balance tables loaded from stable schemas.
- Meta-progression: unlockable captains, route maps, ship classes, cosmetic
  flags, or challenge modifiers only after the base run is fun without them.
- Localization: only after UI copy and layout density stabilize.

## How To Close A Task

1. Implement the smallest code or content change that satisfies the task.
2. Add focused tests for rules, migrations, and edge cases.
3. Run `npm run verify`.
4. Run browser smoke against the local app and record any relevant URL or
   evidence.
5. Update this file by changing task status and adding a short current-status
   note only where it helps future decisions.

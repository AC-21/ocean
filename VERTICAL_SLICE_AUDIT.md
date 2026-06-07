# Harborline Vertical Slice Audit

Last updated: 2026-06-06

This audit checks the current Harborline implementation against
`VERTICAL_SLICE_TARGET.md`. It is the M-025A evidence artifact: what is covered,
what is still weak, and what remains before scope freeze.

## Summary

The vertical slice is close to content-complete for internal verification. The
core loop exists end to end: route read, trade or contract, sail posture,
ocean/encounter pressure, arrival, sale/delivery, upgrades, save safety, score,
recap, and replay hooks.

The slice is not release-candidate ready yet. It still needs the M-025F gate:
fresh `npm run verify`, `npm run ocean:benchmark`, packaged app build/smoke, and
a manual packaged-app run that reaches an upgrade and recap. External playtest
evidence is still absent and remains the main S0 blocker after internal gates.

## Promise Check

| Promise | Current Status | Evidence | Remaining Work |
| --- | --- | --- | --- |
| Clear first profitable trade or local contract | Covered | `flow-smoke.test.ts`, reducer first-trade tests, route contract smoke in `scripts/browser_smoke.mjs`, current Market desk buy/sell loop | Needs fresh-player scorecard proof that the first action is understood without coaching |
| Route choice where water, politics, and market upside disagree | Covered | `routeWindowForecast`, `routeTradePlanFor`, `destinationReadFor`, Port Authority panel, Market Pulse, browser smoke route telemetry | Needs external validation for readability speed |
| Sail posture with readable tradeoff | Covered | `routeConditions`, sail-plan reducer tests, route command telemetry, route physics debug | No internal gap for vertical slice |
| Arrival beat changes next decision | Covered | `eventDeck.ts` arrival cards, route memory, dockside reward tips, browser smoke World/Arrival/Underway Pulse checks | Needs playtest proof of perceived variety |
| Bad outcome or near miss with recovery path | Covered | pirates/customs/sea encounters, repair, borrow, insurance, shore leave, run goals recovery milestone | Needs manual playtest pressure on whether recovery is obvious |
| Meaningful upgrade target | Covered | shipyard build archetypes, equipment planner, five playable ships, Broker Packet market build action, crew facilities | Needs M-025F packaged run proof reaching upgrade without dev tools |
| Final score/recap and next-run hook | Covered | `runRecapFor`, Run Story, replay hook cards, browser smoke starts a replay hook from recap | No internal gap for vertical slice |

## Content Scope Check

| Surface | Current Status | Evidence | Remaining Work |
| --- | --- | --- | --- |
| Ports | Covered | Six ports in `data.ts`; identity layer in `portIdentity.ts`; visual specs in `visuals.ts`; browser smoke current/selected port identity checks | Final art can improve later, but current slice has distinct port identity and sprites |
| Goods and economy | Covered internally | `economy.ts` stock, trends, freight pressure, Market Pulse, Broker Packet; `economy.test.ts`; simulator/balance tests | `W-001` manual exploit-route pressure remains watchlist until scorecards or comparison snapshots |
| Ships | Covered mechanically | Six playable ships including Harbor Cutter and League Carrier; `shipyard.ts` build archetypes; `shipyard.test.ts`; asset manifest coverage; generated ship sprites are unique production candidates | Broader final-art pass for characters, storm cues, route cues, and UI icons remains under `M-036` |
| Equipment/refits | Covered | `equipmentCatalog`, `outfitting.ts`, `equipmentPlanner.ts`, refit sale/replacement reducer tests | No vertical-slice blocker; final balance may change after playtest |
| Crew | Covered | `crew.ts`, `crewIdentity.ts`, facilities, morale, traits, rank, casualty, dismissal; reducer and crew identity tests | Needs fresh-player validation of crew readability, not new code before M-025F |
| Contracts | Covered | Three named chains, route-first offers, multi-stop support, ordinary freight pacing; `contracts.test.ts`; browser smoke contract board flow | No internal gap for vertical slice |
| Factions/politics | Covered | standings, market permits, convoy writs, customs, tariffs/inspection/strike/convoy events; reducer tests | No internal gap for vertical slice |
| Events | Covered | harbor/world/arrival/underway event decks, weighted previews, resolver tests, browser smoke pulse checks | Needs playtest proof that variety is memorable |
| Ocean/tradewinds | Covered for vertical slice | `ocean.ts`, `routing.ts`, Pixi water telemetry, ship response, route windows, `oceanSurface.test.ts`, `ocean:benchmark` script | M-025F must rerun `npm run ocean:benchmark`; production-realistic water remains a later Stage 4/5 investment |
| Saves and error logging | Covered | persistence tests, Electron storage smoke, runtime error log tests, desktop package smoke history | M-025F must rerun packaged build/smoke and manual packaged flow |
| Score, recap, replay | Covered | `scoreBreakdownFor`, `runRecapFor`, Run Story, replay hook reducer tests, browser smoke replay-hook start path | No internal gap for vertical slice |
| Visual assets | Partial | Current generated runtime assets pass catalog/verify; asset-production metadata marks provenance and style QA; Harbor Cutter and League Carrier are no longer copied placeholders | Broader character, storm-cue, route-cue, and UI-icon final-art pass remains under `M-036` |
| Accessibility | Watchlist | Keyboard/reduced-motion smoke exists; reduced motion and tab/port semantics checked by browser smoke | Final contrast/text scaling/icon alternative pass remains `W-003` |

## Remaining Before Scope Freeze

1. Complete `M-025F`.
   - Run `npm run verify`.
   - Run `npm run ocean:benchmark`.
   - Run `npm run desktop:package:mac`.
   - Run `npm run desktop:package-smoke`.
   - Manually launch the packaged app and reach at least one upgrade and one
     recap without developer tools or console/runtime errors.

2. Move `B-004` from `Open` to `Needs Evidence` or `Closed` only after M-025F
   passes. The systems are implemented, but the final packaged verification is
   still missing.

3. Keep `B-003` open until three fresh-player scorecards exist. This is the
   only remaining S0 that cannot be closed by local code or automation alone.

4. Keep `W-001`, `W-002`, and `W-003` as watchlist items.
   - `W-001`: manual economy exploit pressure.
   - `M-036`: final generated art beyond the replaced ship placeholders.
   - `W-003`: release accessibility pass.

## Current Internal Proof Snapshot

Latest recorded full verify before this audit passed `209` tests plus desktop
storage smoke, asset verification, production build, artifact smoke, and browser
regression smoke at `http://127.0.0.1:62579`.

This audit is documentation-only and does not change runtime behavior.

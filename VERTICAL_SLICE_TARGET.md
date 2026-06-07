# Harborline Vertical Slice Target

Last updated: 2026-06-06

## One-Paragraph Target

Harborline's vertical slice is a polished 20-minute local desktop merchant run:
the player begins as a small harbor trader with a fragile ship, reads a compact
route board, buys cargo or accepts a fitted contract, chooses a sail posture
through believable tradewinds and political pressure, survives or exploits the
ocean, sells or delivers for a satisfying result, upgrades toward a recognizable
ship/crew build, and finishes with a clear score plus an appealing replay hook.
The slice should feel like a premium, tactile Tradewinds-like strategy loop:
fast decisions, realistic moving water, minimalist isometric ships and ports,
legible economy trends, meaningful upgrades, and enough contract/crew/faction
texture that the run creates a small story without needing campaign sprawl.

## Player Fantasy

You are not a pirate captain wandering randomly. You are an ambitious maritime
merchant building a trading house one risky crossing at a time. The fantasy is:
read the sea, read the markets, take the sharper deal, protect the ship, and
return richer, faster, or wiser than the last run.

## Slice Promise

Within 20 minutes, a fresh player should experience:

1. A clear first profitable trade or local contract.
2. A route choice where water, politics, and market upside visibly disagree.
3. A sail-posture decision with a readable tradeoff.
4. At least one arrival beat that changes the next decision.
5. A bad outcome or near miss with a recovery path.
6. A meaningful upgrade target: ship, refit, crew, quarters, cannons, or gear.
7. A final score/recap that explains the run and suggests a different next run.

## Content Scope

The slice is content-complete when these are polished enough for repeated runs:

- Ports: the current six-port map, each with distinct market identity, politics,
  and readable isometric island art.
- Goods: enough demand/supply movement to make at least three viable trading
  styles: steady arbitrage, storm/risk chasing, and contract support.
- Ships: starter ship plus several distinct upgrade targets with visible roles:
  fast courier, balanced trader, storm sailor, armored hauler, and heavy cargo.
- Equipment: refits that visibly support speed, open-water safety, smuggling,
  cannons/encounters, cargo protection, crew comfort, and market manipulation.
- Crew: traits and facilities that change route, repair, morale, hard-water,
  casualty, and retention decisions.
- Contracts: at least three memorable chains with named givers and failure
  stories, plus ordinary freight work that does not crowd out trade.
- Events: enough underway, arrival, harbor, faction, contract, and ocean events
  that two runs do not feel identical.
- Ocean: production Pixi water that visibly communicates swell, current,
  roughness, storm intensity, foam, depth, and route risk.
- Saves: safe local save/load/import/export/recover behavior in the eventual
  desktop shell.
- Recap: score breakdown, notable beats, build identity, and replay hooks.

## Design Bar

- UI: compact, operational, and built for repeated decisions, not marketing.
- Visuals: realistic moving teal-gray ocean; crisp minimalist isometric ships,
  ports, and portraits; no parchment-map fantasy, toy palette, or noisy clutter.
- Pacing: the player should rarely spend more than a few seconds wondering what
  to do next.
- Readability: every scary or lucrative route should explain why in the same
  place the player can act.
- Feedback: profit, loss, storm, customs, pirates, contract progress, damage,
  upgrades, crew growth, saves, and game over must produce immediate readable
  feedback.

## Explicit Non-Goals Before Slice Lock

These can wait unless they close a blocker:

- Full campaign story.
- Large world map expansion beyond the current route network.
- Meta-progression that makes the base run easier over time.
- Multiplayer, online services, cloud saves, or leaderboards.
- Full 3D sailing simulation.
- Audio implementation beyond locking audio-ready feedback categories.
- Mod tooling and localization.
- More generated ships or ports before their gameplay roles are defined.

## Acceptance Gates

The slice is ready for external release-candidate playtests when:

1. `npm run verify` passes from a fresh checkout.
2. `npm run ocean:benchmark` proves desktop and compact water performance.
3. The packaged app launches without terminal help.
4. Save/load/import/export/recover work in the packaged app path.
5. Three scorecards from fresh players show no launch blockers.
6. No `S0` entries remain open in `RELEASE_BLOCKERS.md`.
7. The latest playtest scorecards average at least `4/5` on route-choice speed,
   trade clarity, risk readability, addictive pull, and replay desire.
8. The final scope is frozen in `MASTER_TASK_LIST.md` with blockers, polish, and
   post-release backlog separated.

## Rejection Test For New Ideas

Before adding a new system, asset, or screen, answer yes to at least one:

- Does it make the next route decision faster or more interesting?
- Does it make the ocean, economy, politics, crew, or upgrades more legible?
- Does it create a memorable story beat inside a 20-minute run?
- Does it remove a release blocker or verified playtest friction?
- Does it improve desktop trust: launch, save, recover, performance, or errors?

If every answer is no, defer it.

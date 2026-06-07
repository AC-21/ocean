# Harborline Playtest Recruitment

Last updated: 2026-06-07

Use this to recruit the three `M-026A` fresh-player sessions. The goal is not
to find people who already understand the game; the goal is to learn whether
Harborline explains itself well enough to make a new player want one more run.

## Tester Criteria

A qualified tester should be:

- New to Harborline and not involved in building the game.
- Comfortable launching a downloaded macOS app from a zip.
- Able to play for 20-45 minutes with one observer present.
- Willing to think aloud and let the observer record quotes.
- Available to return the saved playtest artifact after the session.

Avoid testers who:

- Have watched a recent Harborline walkthrough.
- Need the observer to explain strategy before launch.
- Cannot run the packaged app on their machine.
- Are mainly evaluating code quality, not the player experience.

## Invite Copy

```text
Would you be willing to playtest Harborline, a desktop merchant-strategy game
about trading routes, ship upgrades, weather, politics, and risk?

I need a fresh-player session, so I will not explain the strategy first. The
test takes about 20-45 minutes. You will launch the packaged app, play a run,
talk aloud when useful, and answer a scorecard at the end. The useful feedback
is where you get confused, what feels fun, and whether you want another run.
```

## Scheduling Checklist

- Session slot: Session 1 / Session 2 / Session 3
- Tester alias:
- Observer:
- Date and time:
- Device/display:
- Input method:
- Artifact return path:
- Confirmed fresh player: yes/no
- Confirmed no pre-session strategy explanation: yes/no

## Pre-Session Send

Send the tester:

- `release/Harborline-playtest-handoff-0.1.0-arm64.zip`
- The short instruction to unzip and launch `Harborline.app`
- The note that macOS may ask for launch approval

Do not send strategy tips, route advice, upgrade recommendations, or a
walkthrough.

## Session Start Script

Read this before launch:

```text
Play as if I am not here. Talk aloud when useful. If you are unsure, say what
you are thinking and choose what you would try next. I can only help if the app
will not launch, input is broken, or you cannot continue because of a bug.
```

## Collection Reminder

End every session by opening Settings, saving the edited scorecard, and
collecting the artifact files from the Settings app-owned storage path.
The Playtest Evidence panel shows a `Collect files` strip with the exact
latest-scorecard and history targets for the current runtime.

The observer sentence is:

```text
Save the edited scorecard in Settings, then collect `playtest.latest.md`; if
multiple sessions used the same app profile, collect `playtest.history.v1.json`
too, otherwise collect each session's `playtest.latest.md` and assemble them.
```

Record the artifact path in `release/playtest-handoff/collection-ledger.md`
before considering the session complete.

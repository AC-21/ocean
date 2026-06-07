# Harborline Playtest Handoff

Last updated: 2026-06-07

Use this when preparing `M-026A` fresh-player sessions. The handoff bundle is
the folder an observer should use for a no-coaching playtest.

For recruiting testers before the session, use `PLAYTEST_RECRUITMENT.md`.

## Build The Handoff

```sh
npm run playtest:handoff
```

The command rebuilds the packaged macOS app, writes, and verifies
`release/playtest-handoff/` with:

- `Harborline.app`
- `README.md`
- `collection-ledger.md`
- `observer-checklist.md`
- `scorecard-template.md`
- `handoff-manifest.json`

To audit an existing handoff folder without rebuilding the app, run:

```sh
npm run playtest:handoff:verify
```

To create the distributable zip for testers, run:

```sh
npm run playtest:handoff:archive
```

Send the generated `release/Harborline-playtest-handoff-<version>-<arch>.zip`
and keep the adjacent `.manifest.json` as proof of size, SHA-256, build version,
required sessions, and score gate.

## Session Rule

Each tester should launch `Harborline.app` from the handoff folder without
developer coaching, start a run, reach a finish or failure, then answer the
scorecard from the packaged app's Settings flow.

## Observer Script And No-Coaching Rule

Before launch, say this and then let the player drive:

```text
Play as if I am not here. Talk aloud when useful. If you are unsure, say what
you are thinking and choose what you would try next. I can only help if the app
will not launch, input is broken, or you cannot continue because of a bug.
```

Coaching includes explaining market strategy, route safety, upgrades, politics,
contracts, recovery options, or which button is best. If the player asks what
to do, record the question and ask what they would try next. Allowed help is
limited to OS launch/security friction, broken input, crash/blocking bugs, and
clarifying scorecard fields after play ends.

## Qualification Rule

A session only counts for `M-026A` when Settings says the saved scorecard
qualifies. The three qualifying sessions must come from unique fresh-player
testers and must average at least `4/5` on route-choice speed, trade clarity,
risk readability, addictive pull, and replay desire.

## Collection Rule

After each session, open Settings, generate or review the Playtest Scorecard,
fill the required fields, click `Check`, then click `Save`. The Save
confirmation must say whether the scorecard qualifies for `M-026A`.

The observer collection sentence is:

```text
Save the edited scorecard in Settings, then collect `playtest.latest.md`; if
multiple sessions used the same app profile, collect `playtest.history.v1.json`
too, otherwise collect each session's `playtest.latest.md` and assemble them.
```

The files live under the app-owned storage path shown in Settings. Collect any
screenshots or video, runtime notes, and save files referenced by the observer.
The Playtest Evidence panel also shows a `Collect files` strip with the exact
latest-scorecard and history targets for the current runtime. Update
`collection-ledger.md` with the session slot, qualification result, artifact
path, score-gate concern, and blocker candidate IDs. After three qualified
sessions, generate the Playtest Triage Report and update `RELEASE_BLOCKERS.md`
with any `S0` or `S1` findings.

## Audit The Collection

After collecting `playtest.history.v1.json`, run:

```sh
npm run playtest:collection:audit -- --history path/to/playtest.history.v1.json --out reports/playtest-collection-latest.md
```

The audit writes a markdown report with the readiness count, score-quality gate,
release-blocker count, and generated triage report. It exits nonzero until the
collection is ready for `M-026B`; add `--allow-incomplete` when you want a
mid-collection report before all three scorecards are archived.

If each tester sends back a separate `playtest.latest.md`, assemble the files
before auditing:

```sh
npm run playtest:collection:assemble -- --scorecard session-1.md --scorecard session-2.md --scorecard session-3.md --out reports/playtest-collection-history.v1.json --audit-out reports/playtest-collection-latest.md
```

The assembled history can then be archived with the rest of the playtest
evidence.

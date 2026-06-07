import { activeContracts, contractSummary } from "./contracts";
import { crewCatalog, equipmentCatalog, factions } from "./data";
import { recommendRouteChoices } from "./economy";
import { money } from "./math";
import { desktopStorageFiles, playtestArtifactKey, playtestHistoryKey } from "./persistence";
import { maxDay, scoreBreakdownFor } from "./reducer";
import { cargoUnits, portById, routeConditions, routeDays, routeRisk, routeWearEstimate, sailPlanFor } from "./routing";
import { currentShip, deriveShipStats } from "./stats";
import { standingTier } from "./politics";
import type { GameState } from "./types";

export type PlaytestEvidenceContext = {
  build?: string;
  generatedAt?: string;
  graphicsMode?: string;
  logsPath?: string;
  playtestHistoryTarget?: string;
  playtestLatestTarget?: string;
  reducedMotion?: boolean;
  runtime?: string;
  storagePath?: string;
};

export function playtestEvidencePacketFor(state: GameState, context: PlaytestEvidenceContext = {}) {
  const now = context.generatedAt ?? new Date().toISOString();
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const ship = currentShip(state);
  const stats = deriveShipStats(state);
  const score = scoreBreakdownFor(state);
  const selectedRoute =
    current.id === selected.id
      ? "No route plotted"
      : `${current.name} -> ${selected.name} | ${routeDays(state, current.id, selected.id)}d | ${Math.round(
          routeRisk(state, current.id, selected.id) * 100
        )}% risk | ${routeWearEstimate(state, current.id, selected.id).hullWear} wear | ${
          routeConditions(state, current.id, selected.id).tacticLabel
        }`;
  const routeChoices = recommendRouteChoices(state, state.currentPort).slice(0, 5);
  const routeLoopRows = routeLoopRowsFor(state);
  const collectionTargets = playtestCollectionTargetsFor(context);
  const contractRows = activeContracts(state).map((contract) => {
    const summary = contractSummary(contract);
    return `| ${cell(summary.destinationName)} | ${cell(summary.goodName)} | ${contract.units} | ${money(contract.reward)} | ${
      contract.deadline - state.day
    }d |`;
  });

  return [
    "# Harborline Playtest Evidence Packet",
    "",
    "## Session Info",
    "",
    `- Generated: ${now}`,
    `- Build: ${context.build ?? "unknown"}`,
    `- Runtime: ${context.runtime ?? "unknown"}`,
    `- Graphics: ${context.graphicsMode ?? "unknown"}`,
    `- Reduced motion: ${context.reducedMotion ? "yes" : "no"}`,
    `- Storage path: ${context.storagePath ?? "browser/local storage"}`,
    `- Latest scorecard target: ${collectionTargets.latest}`,
    `- Scorecard history target: ${collectionTargets.history}`,
    `- Runtime log path: ${context.logsPath ?? "browser/runtime log"}`,
    "",
    "## Run Snapshot",
    "",
    `- Day: ${state.day}/${maxDay}`,
    `- Current port: ${current.name}`,
    `- Selected route: ${selectedRoute}`,
    `- Score: ${money(score.total)} (${money(score.cash)} cash, ${money(score.cargoValue)} cargo, ${money(score.debtPenalty)} debt drag)`,
    `- Ship: ${ship.name} (${stats.speed} speed, ${stats.cargoCap} cargo, ${stats.openWater} open water, ${stats.cannons} cannons)`,
    `- Hull: ${state.hull}/${stats.hullMax}`,
    `- Cargo: ${cargoUnits(state)}/${stats.cargoCap}`,
    `- Crew: ${state.crew.length}/${stats.crewCap}${state.crew.length ? ` | ${namesFor(state.crew, crewCatalog).join(", ")}` : ""}`,
    `- Equipment: ${state.equipment.length ? namesFor(state.equipment, equipmentCatalog).join(", ") : "none"}`,
    `- Runtime errors: ${state.errors.length}`,
    `- Last saved: ${state.lastSavedAt ?? "not saved this session"}`,
    "",
    "## Route Choice Read",
    "",
    "| Rank | Destination | Reason | Cargo/Contract | Risk |",
    "| --- | --- | --- | --- | --- |",
    ...(
      routeChoices.length
        ? routeChoices.map(
            (choice, index) =>
              `| ${index + 1} | ${cell(portById(choice.sellPortId).name)} | ${cell(choice.reason)} | ${cell(choice.goodName ?? choice.kind)} | ${
                Math.round(choice.risk * 100)
              }% |`
          )
        : ["|  |  | No actionable route choice surfaced |  |  |"]
    ),
    "",
    "## Active Contracts",
    "",
    "| Destination | Cargo | Units | Reward | Time Left |",
    "| --- | --- | --- | --- | --- |",
    ...(contractRows.length ? contractRows : ["|  |  | No active contracts |  |  |"]),
    "",
    "## Faction Standing",
    "",
    "| Faction | Standing | Tier |",
    "| --- | --- | --- |",
    ...factions.map((faction) => {
      const standing = state.factionStanding[faction.id] ?? 0;
      return `| ${cell(faction.name)} | ${standing.toFixed(1)} | ${cell(standingTier(standing).label)} |`;
    }),
    "",
    "## Required Observer Notes",
    "",
    "- First confusing moment:",
    "- First fun spike:",
    "- First one-more-route moment:",
    "- First dead turn or pure wait:",
    "- Most tempting upgrade:",
    "- Most ignored system:",
    "- Most trusted UI surface:",
    "- Most distrusted UI surface:",
    "- Single strongest next fix:",
    "",
    "## Route Loop Trace",
    "",
    "Auto-filled from completed route history when available; observer should still mark whether the tester wanted to continue.",
    "",
    "| Loop | Start port | Chosen destination | Main reason | Cargo/contract | Sail posture | Outcome | Continue? |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...routeLoopRows,
    "",
    "## Recent Ledger",
    "",
    ...(state.log.length ? state.log.slice(0, 12).map((entry) => `- Day ${entry.day}: ${entry.text}`) : ["- No ledger entries yet."]),
    "",
    "## Evidence Links",
    "",
    "- Screenshot/video:",
    "- Save export:",
    "- Console/runtime notes:",
    "- Related blocker IDs:",
    "",
  ].join("\n");
}

export function playtestScorecardDraftFor(state: GameState, context: PlaytestEvidenceContext = {}) {
  const now = context.generatedAt ?? new Date().toISOString();
  const score = scoreBreakdownFor(state);
  const routeLoopRows = routeLoopRowsFor(state);
  const collectionTargets = playtestCollectionTargetsFor(context);
  const evidencePacket = playtestEvidencePacketFor(state, { ...context, generatedAt: now });
  return [
    "# Harborline Playtest Scorecard Draft",
    "",
    "## Session Info",
    "",
    `- Date: ${now.slice(0, 10)}`,
    `- Build or URL: ${context.build ?? "unknown"}`,
    "- Tester:",
    "- Device/display:",
    "- Input method:",
    "- First-time player: yes/no",
    `- Session length: day ${state.day}/${maxDay}`,
    "- Seed or save file:",
    "- Observer:",
    "",
    "## Launch And Setup",
    "",
    "- Observer script read before launch: yes/no",
    "- Observer avoided coaching route, market, upgrade, politics, contract, and recovery choices: yes/no",
    "- Tester questions were recorded and answered with \"what would you try next\" unless the app was blocked: yes/no",
    "- Could the tester launch without help: yes/no",
    "- Could the tester start a run without help: yes/no",
    "- Any setup friction:",
    `- Fresh console/runtime errors: ${state.errors.length}`,
    "- Save/load/import/export checked during session: yes/no",
    "- Playtest Evidence packet generated from Settings: yes",
    "- Playtest Scorecard draft generated and edited in Settings: yes/no",
    `- Edited playtest artifact saved to app storage (${desktopStorageFiles.playtestArtifact}): yes/no`,
    `- Edited playtest artifact archived in app storage (${desktopStorageFiles.playtestHistory}): yes/no`,
    "- Current Scorecard status before save:",
    "- Settings Check run before saving the scorecard: yes/no",
    "- Save confirmation showed whether the scorecard qualified: yes/no",
    "- Settings M-026A readiness count after save:",
    `- Settings app-owned storage path: ${context.storagePath ?? "browser/local storage"}`,
    `- Collected ${desktopStorageFiles.playtestArtifact} path: ${collectionTargets.latest}`,
    `- Collected ${desktopStorageFiles.playtestHistory} path, or separate-scorecard assembly note: ${collectionTargets.history}`,
    "- Playtest Triage Report generated after archive save: yes/no",
    "- Score Quality Gate result after triage:",
    "- Saving a triage report did not increase the scorecard readiness count: yes/no",
    "- Scorecard qualified for readiness after required fields were filled: yes/no",
    "- If not qualified, missing fields shown by Settings:",
    "",
    "## Core Scores",
    "",
    "Score each from `1` to `5`.",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    "| Route-choice speed |  |  |",
    "| Trade clarity |  |  |",
    "| Risk readability |  |  |",
    "| Addictive pull |  |  |",
    "| Upgrade desire |  |  |",
    "| Ocean feel |  |  |",
    "| UI density |  |  |",
    "| Replay desire |  |  |",
    "",
    "## Required Observations",
    "",
    "- First confusing moment:",
    "- First fun spike:",
    "- First one-more-route moment:",
    "- First dead turn or pure wait:",
    "- Most tempting upgrade:",
    "- Most ignored system:",
    "- Most trusted UI surface:",
    "- Most distrusted UI surface:",
    "- Strongest visual moment:",
    "- Weakest visual moment:",
    "",
    "## Route Loop Trace",
    "",
    "Auto-filled from completed route history when available; observer should correct intent and mark whether the tester wanted to continue.",
    "",
    "| Loop | Start port | Chosen destination | Main reason | Cargo/contract | Sail posture | Outcome | Did they want to continue? |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...routeLoopRows,
    "",
    "## Friction Log",
    "",
    "| Time | Surface | What happened | Tester quote or behavior | Severity | Candidate task |",
    "| --- | --- | --- | --- | --- | --- |",
    "|  |  |  |  |  |  |",
    "|  |  |  |  |  |  |",
    "|  |  |  |  |  |  |",
    "",
    "## Exploit And Balance Checks",
    "",
    "- Did one route, cargo, contract, or posture look obviously dominant?",
    "- Did bankruptcy pressure feel fair?",
    "- Did recovery after a bad route feel possible?",
    "- Did upgrades arrive too early, too late, or about right?",
    "- Did contracts crowd out speculative trade?",
    "- Did politics/customs matter too much, too little, or about right?",
    "",
    "## End State",
    "",
    "- Finished, failed, or stopped early:",
    `- Final score or state: ${state.gameOver ? "run ended" : "in progress"}; ${money(score.total)} net worth`,
    "- Did the ending make sense?",
    "- Did the recap suggest an appealing next run?",
    "- Replay hook chosen or desired:",
    "",
    "## Decision",
    "",
    "- Promote / Fix blocker / Polish next / Rescope:",
    "",
    "## Single Next Change",
    "",
    "-",
    "",
    "## Follow-Up Tasks",
    "",
    "| Task | Type | Owner | Exit proof |",
    "| --- | --- | --- | --- |",
    "|  |  |  |  |",
    "|  |  |  |  |",
    "",
    "## Evidence Links",
    "",
    "- Screenshot/video:",
    "- Save file:",
    "- Browser URL:",
    "- Console/runtime notes:",
    "- Report path:",
    "- Related blocker IDs:",
    "",
    "## Attached Evidence Packet",
    "",
    evidencePacket,
  ].join("\n");
}

function namesFor<T extends { id: string; name: string }>(ids: string[], catalog: T[]) {
  return ids.map((id) => catalog.find((entry) => entry.id === id)?.name ?? id);
}

function playtestCollectionTargetsFor(context: PlaytestEvidenceContext) {
  return {
    latest: context.playtestLatestTarget ?? playtestCollectionTarget(context.storagePath, desktopStorageFiles.playtestArtifact, playtestArtifactKey),
    history: context.playtestHistoryTarget ?? playtestCollectionTarget(context.storagePath, desktopStorageFiles.playtestHistory, playtestHistoryKey),
  };
}

function playtestCollectionTarget(storagePath: string | undefined, fileName: string, browserKey: string) {
  return storagePath ? `${storagePath}/${fileName}` : `Browser local storage: ${browserKey}`;
}

function routeLoopRowsFor(state: GameState) {
  const historyRows = state.routeHistory.slice(0, 5).map((entry, index) => {
    const posture = sailPlanFor(entry.sailPlan).label;
    return `| ${index + 1} | ${cell(portById(entry.fromId).name)} | ${cell(portById(entry.toId).name)} | ${cell(entry.reason)} | ${cell(
      entry.cargoSummary
    )} | ${cell(posture)} | ${cell(`${entry.label}; ${entry.detail}`)} |  |`;
  });
  while (historyRows.length < 5) {
    const loop = historyRows.length + 1;
    historyRows.push(`| ${loop} |  |  |  |  |  |  |  |`);
  }
  return historyRows;
}

function cell(value: string | number) {
  return String(value).replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}

import { cargoUnits } from "./routing";
import { currentShip, deriveShipStats } from "./stats";
import { nextUpgradeTiming } from "./pacing";
import type { GameState } from "./types";

export type RunGoalStatus = "done" | "active" | "next";
export type RunGoalTone = "gain" | "progress" | "risk" | "neutral";
export type RunGoalId = "profit" | "risk" | "recover" | "upgrade" | "close";

export type RunGoal = {
  id: RunGoalId;
  label: string;
  detail: string;
  metric: string;
  status: RunGoalStatus;
  tone: RunGoalTone;
};

export function runGoalsFor(state: GameState): RunGoal[] {
  const stats = deriveShipStats(state);
  const cargo = cargoUnits(state);
  const hullRatio = state.hull / Math.max(1, stats.hullMax);
  const upgradeTarget = nextUpgradeTiming(state);
  const hasProfit = logMatches(state, /\bprofit \$[\d,]+/i) || state.contracts.some((contract) => contract.status === "completed");
  const hasTrouble = logMatches(state, /(storm|hard water|green water|pirate|customs|inspection|warned off|outran|foundered|breaking seas)/i);
  const hasRecovery = logMatches(state, /^(Repaired|Borrowed|Bought cargo policy|Shore leave|Submitted to|Paid .* debt|Warned off|Outran|Recovered)/i);
  const hasUpgrade =
    state.equipment.length > 0 ||
    currentShip(state).id !== "coastal_sloop" ||
    state.crew.length > 0 ||
    Object.values(state.captainSkills).some((level) => level > 0);

  return [
    {
      id: "profit",
      label: "First Profit",
      detail: hasProfit ? "A profitable sale or contract is on the books." : cargo > 0 ? "Sell the hold into a real bid." : "Load a route with positive expected value.",
      metric: hasProfit ? "closed" : cargo > 0 ? `${cargo}u held` : "open",
      status: hasProfit ? "done" : "active",
      tone: hasProfit ? "gain" : "progress",
    },
    {
      id: "risk",
      label: "Pressure Read",
      detail: hasTrouble
        ? "The run has met water, pirates, or customs pressure."
        : state.currentPort !== state.selectedPort
          ? "A plotted lane can teach the ship something."
          : "Plot a lane where profit, water, or politics disagree.",
      metric: hasTrouble ? "seen" : state.currentPort !== state.selectedPort ? "plotted" : "next",
      status: hasTrouble ? "done" : state.currentPort !== state.selectedPort ? "active" : "next",
      tone: hasTrouble ? "risk" : "progress",
    },
    {
      id: "recover",
      label: "Recovery Line",
      detail: hasRecovery
        ? "You used a repair, credit, policy, shore leave, or tactical escape."
        : hullRatio < 0.72
          ? "Damaged hull makes the next crossing expensive."
          : state.debt > state.cash + 450
            ? "Debt is outrunning cash; clean it before the close."
            : "Keep one answer ready for damage, debt, morale, or cargo loss.",
      metric: hasRecovery ? "used" : hullRatio < 0.72 ? `${Math.round(hullRatio * 100)}% hull` : "ready",
      status: hasRecovery ? "done" : hullRatio < 0.72 || state.debt > state.cash + 450 ? "active" : "next",
      tone: hasRecovery ? "gain" : hullRatio < 0.72 || state.debt > state.cash + 450 ? "risk" : "neutral",
    },
    {
      id: "upgrade",
      label: "Build Pivot",
      detail: hasUpgrade
        ? "The ship, crew, skills, or refits have changed the build."
        : upgradeTarget
          ? `${upgradeTarget.label}: ${upgradeTarget.name}.`
          : "Turn profit into a ship, refit, skill, or crew choice.",
      metric: hasUpgrade ? "live" : upgradeTarget ? (upgradeTarget.gap > 0 ? `$${upgradeTarget.gap} gap` : "ready") : "open",
      status: hasUpgrade ? "done" : upgradeTarget?.gap === 0 ? "active" : "next",
      tone: hasUpgrade ? "gain" : upgradeTarget?.gap === 0 ? "progress" : "neutral",
    },
    {
      id: "close",
      label: "Close Ledger",
      detail: state.gameOver ? "Run ended; compare the score and pick a replay hook." : "Reach the finish with cash, hull, and a reason to replay.",
      metric: state.gameOver ? "recap" : `day ${state.day}/60`,
      status: state.gameOver ? "done" : state.day >= 41 ? "active" : "next",
      tone: state.gameOver ? "gain" : state.day >= 41 ? "risk" : "neutral",
    },
  ];
}

export function currentRunGoalFor(state: GameState) {
  return runGoalsFor(state).find((goal) => goal.status !== "done") ?? runGoalsFor(state).at(-1)!;
}

function logMatches(state: GameState, pattern: RegExp) {
  return state.log.some((entry) => pattern.test(entry.text));
}

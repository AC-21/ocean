import { equipmentCatalog, goods, shipCatalog } from "./data";
import { marketStockLevel, priceFor, recommendRouteChoices, sellPriceFor } from "./economy";
import { clamp } from "./math";
import { nextUpgradeTiming } from "./pacing";
import { createInitialState, maxDay, reduceGame, repairCostFor, scoreNow } from "./reducer";
import { cargoUnits, routeDays } from "./routing";
import { yardPriceFor } from "./shipyard";
import { deriveShipStats } from "./stats";
import type { GameState } from "./types";

export type SimulatedRun = {
  seed: number;
  finalScore: number;
  initialScore: number;
  won: boolean;
  bankrupt: boolean;
  daysSurvived: number;
  voyages: number;
  completedContracts: number;
  upgradesBought: number;
  deadEndState: string;
  profitByGood: Record<string, number>;
};

export type SimulationReport = {
  runs: number;
  seedStart: number;
  winRate: number;
  averageFinalScore: number;
  medianFinalScore: number;
  bankruptcyRate: number;
  averageDaysSurvived: number;
  averageCompletedContracts: number;
  upgradedRunRate: number;
  mostProfitableGoods: Array<{ goodId: string; name: string; profit: number }>;
  deadEndStates: Record<string, number>;
};

type SimulationOptions = {
  seedStart?: number;
  maxSteps?: number;
};

export function simulateRuns(count = 1000, options: SimulationOptions = {}): SimulationReport {
  const seedStart = options.seedStart ?? 42000;
  const runs = Array.from({ length: count }, (_, index) => simulateRun(seedStart + index, options));
  const scores = runs.map((run) => run.finalScore).sort((left, right) => left - right);
  const profitByGood = mergeGoodProfit(runs);
  const deadEndStates = countBy(runs, (run) => run.deadEndState);

  return {
    runs: count,
    seedStart,
    winRate: ratio(runs.filter((run) => run.won).length, count),
    averageFinalScore: average(runs.map((run) => run.finalScore)),
    medianFinalScore: scores[Math.floor(scores.length / 2)] ?? 0,
    bankruptcyRate: ratio(runs.filter((run) => run.bankrupt).length, count),
    averageDaysSurvived: average(runs.map((run) => run.daysSurvived)),
    averageCompletedContracts: average(runs.map((run) => run.completedContracts)),
    upgradedRunRate: ratio(runs.filter((run) => run.upgradesBought > 0).length, count),
    mostProfitableGoods: Object.entries(profitByGood)
      .map(([goodId, profit]) => ({ goodId, name: goods.find((good) => good.id === goodId)?.name ?? goodId, profit }))
      .sort((left, right) => right.profit - left.profit)
      .slice(0, 5),
    deadEndStates,
  };
}

export function simulateRun(seed: number, options: SimulationOptions = {}): SimulatedRun {
  return withSeed(seed, () => {
    let state = createInitialState();
    const initialScore = scoreNow(state);
    const profitByGood: Record<string, number> = {};
    const maxSteps = options.maxSteps ?? 220;
    let voyages = 0;
    let completedContracts = 0;
    let upgradesBought = 0;
    let deadEndState = "running";

    for (let step = 0; step < maxSteps && !state.gameOver; step += 1) {
      if (state.encounter) {
        state = resolveEncounter(state);
        continue;
      }

      if (state.voyage) {
        state = reduceGame(state, { type: "tickVoyage", dt: 999 });
        continue;
      }

      const completedBefore = state.contracts.filter((contract) => contract.status === "completed").length;
      state = completeReadyContracts(state);
      completedContracts += state.contracts.filter((contract) => contract.status === "completed").length - completedBefore;

      state = sellCargoAtCurrentPort(state, profitByGood);
      state = payManageableDebt(state);
      state = repairDamagedHull(state);

      const upgradeResult = buyAffordableUpgrade(state);
      state = upgradeResult.state;
      upgradesBought += upgradeResult.bought;

      const contractResult = acceptAndLoadContract(state);
      if (contractResult.accepted) {
        state = contractResult.state;
        const started = startSelectedVoyage(state);
        state = started.state;
        voyages += started.started ? 1 : 0;
        continue;
      }

      const routeResult = loadAndStartRecommendedRoute(state);
      if (routeResult.started) {
        state = routeResult.state;
        voyages += 1;
        continue;
      }

      if (state.day >= maxDay) {
        state = reduceGame(state, { type: "waitDay" });
        break;
      }

      const beforeDay = state.day;
      state = reduceGame(state, { type: "waitDay" });
      if (state.day === beforeDay) {
        deadEndState = "blocked-in-port";
        break;
      }
    }

    const finalScore = scoreNow(state);
    deadEndState = classifyDeadEndState(state, finalScore, deadEndState);
    return {
      seed,
      finalScore,
      initialScore,
      won: finalScore >= initialScore + 500,
      bankrupt: finalScore <= 0 || state.debt >= Math.max(2400, state.cash + 1600),
      daysSurvived: clamp(state.day, 1, maxDay + 1),
      voyages,
      completedContracts,
      upgradesBought,
      deadEndState,
      profitByGood,
    };
  });
}

export function classifyDeadEndState(state: GameState, finalScore: number, fallback: string) {
  if (!state.gameOver) return state.day > maxDay ? "completed-window" : fallback === "blocked-in-port" ? fallback : "step-limit";
  if (finalScore <= 0) return "bankrupt";
  const finalLog = state.log[0]?.text ?? "";
  if (/60-day ledger closed/i.test(finalLog)) return "completed-window";
  if (/foundered|lost at sea|broke under|broke during/i.test(finalLog)) return "ship-loss";
  return "early-close";
}

function resolveEncounter(state: GameState) {
  if (!state.encounter) return state;
  if (state.encounter.kind === "sea") {
    const stats = deriveShipStats(state);
    if (state.encounter.cargoThreat && state.hull > stats.hullMax * 0.72 && cargoUnits(state) > stats.cargoCap * 0.35) return reduceGame(state, { type: "resolveSeaBold" });
    if (state.hull > stats.hullMax * 0.45) return reduceGame(state, { type: "resolveSeaSkill" });
    return reduceGame(state, { type: "resolveSeaSafe" });
  }
  if (state.encounter.kind === "inspection") {
    return reduceGame(state, state.cash >= state.encounter.bribe && state.encounter.bribe < (state.encounter.fine ?? 9999) ? { type: "bribe" } : { type: "submitInspection" });
  }
  const stats = deriveShipStats(state);
  if (stats.cannons >= 3 || state.hull >= stats.hullMax * 0.72) return reduceGame(state, { type: "fight" });
  if (state.cash >= state.encounter.bribe) return reduceGame(state, { type: "bribe" });
  return reduceGame(state, { type: "run" });
}

function completeReadyContracts(state: GameState) {
  let next = state;
  for (const contract of next.contracts.filter((entry) => entry.status === "active")) {
    if (contract.destinationPortId !== next.currentPort) continue;
    if ((next.cargo[contract.goodId] || 0) < contract.units) continue;
    next = reduceGame(next, { type: "completeContract", contractId: contract.id });
  }
  return next;
}

function sellCargoAtCurrentPort(state: GameState, profitByGood: Record<string, number>) {
  let next = state;
  for (const good of goods) {
    while ((next.cargo[good.id] || 0) > 0) {
      const basis = next.cargoBasis[good.id] ?? sellPriceFor(next, next.currentPort, good.id);
      const unitProfit = sellPriceFor(next, next.currentPort, good.id) - basis;
      if (unitProfit < 0 && cargoUnits(next) < deriveShipStats(next).cargoCap) break;
      profitByGood[good.id] = (profitByGood[good.id] ?? 0) + unitProfit;
      next = reduceGame(next, { type: "sellGood", goodId: good.id });
    }
  }
  return next;
}

function payManageableDebt(state: GameState) {
  let next = state;
  while (next.debt > 0 && next.cash > 1400) {
    const before = next.debt;
    next = reduceGame(next, { type: "payDebt" });
    if (next.debt >= before) break;
  }
  return next;
}

function repairDamagedHull(state: GameState) {
  let next = state;
  const stats = deriveShipStats(next);
  const urgent = next.hull < stats.hullMax * 0.42;
  const targetRatio = urgent ? 0.68 : 0.66;
  if (!urgent && next.hull >= stats.hullMax * 0.58) return next;

  while (next.hull < stats.hullMax * targetRatio) {
    const cost = repairCostFor(next);
    const reserve = urgent ? 380 : 760;
    if (cost <= 0 || next.cash < cost + reserve) break;
    const beforeHull = next.hull;
    next = reduceGame(next, { type: "repair" });
    if (next.hull <= beforeHull) break;
  }

  return next;
}

function buyAffordableUpgrade(state: GameState) {
  const timing = nextUpgradeTiming(state);
  const reserve = timing?.kind === "ship" ? 620 : 560;
  if (!timing || timing.gap > 0 || state.cash < timing.price + reserve) return { state, bought: 0 };
  const ship = shipCatalog.find((entry) => entry.name === timing.name);
  if (ship) {
    const next = reduceGame(state, { type: "buyShip", shipId: ship.id });
    return { state: next, bought: next.ownedShips.includes(ship.id) && state.currentShip !== next.currentShip ? 1 : 0 };
  }
  const equipment = equipmentCatalog.find((entry) => entry.name === timing.name);
  if (equipment) {
    const next = reduceGame(state, { type: "buyEquipment", equipmentId: equipment.id });
    return { state: next, bought: next.equipment.includes(equipment.id) && !state.equipment.includes(equipment.id) ? 1 : 0 };
  }
  return { state, bought: 0 };
}

function acceptAndLoadContract(state: GameState) {
  const stats = deriveShipStats(state);
  const activeCount = state.contracts.filter((contract) => contract.status === "active").length;
  if (activeCount >= 1) return { state, accepted: false };

  const contract = state.contracts
    .filter((entry) => entry.status === "available" && entry.originPortId === state.currentPort)
    .filter((entry) => entry.deadline - state.day >= routeDays(state, entry.originPortId, entry.destinationPortId))
    .filter((entry) => entry.units * (goods.find((good) => good.id === entry.goodId)?.cargo ?? 1) <= stats.cargoCap - cargoUnits(state))
    .filter((entry) => marketStockLevel(state, state.currentPort, entry.goodId).stock >= entry.units)
    .filter((entry) => priceFor(state, state.currentPort, entry.goodId) * entry.units <= state.cash)
    .sort((left, right) => right.reward / Math.max(1, right.units) - left.reward / Math.max(1, left.units))[0];

  if (!contract) return { state, accepted: false };
  let next = reduceGame(state, { type: "acceptContract", contractId: contract.id });
  for (let index = 0; index < contract.units; index += 1) {
    next = reduceGame(next, { type: "buyGood", goodId: contract.goodId });
  }
  return { state: next, accepted: true };
}

function loadAndStartRecommendedRoute(state: GameState) {
  const choices = recommendRouteChoices(state, state.currentPort);
  const choice =
    choices.find((entry) => entry.kind === "profit" && entry.expectedProfit > 0) ??
    choices.find((entry) => entry.kind === "gamble" && entry.grossUpside > 0) ??
    choices[0];
  if (!choice || choice.sellPortId === state.currentPort) return { state, started: false };

  let next = reduceGame(state, { type: "setSailPlan", plan: choice.sailPlan });
  next = reduceGame(next, { type: "selectPort", portId: choice.sellPortId });
  if (choice.goodId) next = reduceGame(next, { type: "buyMaxGood", goodId: choice.goodId });
  if (cargoUnits(next) <= 0 && !next.contracts.some((contract) => contract.status === "active")) return { state, started: false };
  return startSelectedVoyage(next);
}

function startSelectedVoyage(state: GameState) {
  const next = reduceGame(state, { type: "startVoyage" });
  return { state: next, started: Boolean(next.voyage && !state.voyage) };
}

function withSeed<T>(seed: number, run: () => T): T {
  const originalRandom = Math.random;
  let current = seed >>> 0;
  Math.random = () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 0x100000000;
  };
  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

function mergeGoodProfit(runs: SimulatedRun[]) {
  const result: Record<string, number> = {};
  for (const run of runs) {
    for (const [goodId, profit] of Object.entries(run.profitByGood)) {
      result[goodId] = (result[goodId] ?? 0) + profit;
    }
  }
  return result;
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFor(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function ratio(count: number, total: number) {
  if (total <= 0) return 0;
  return Number((count / total).toFixed(3));
}

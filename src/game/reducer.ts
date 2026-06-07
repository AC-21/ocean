import { captainSkillCatalog, crewCatalog, equipmentCatalog, factions, goods, ports, shipCatalog } from "./data";
import {
  contractChainPoliticalReward,
  contractDeliveredUnits,
  contractKindLabel,
  contractPlanSummary,
  contractStops,
  contractSummary,
  contractTotalUnits,
  createRecoveryContract,
  createNextContractChainOffer,
  currentContractStop,
  nextContractStop,
  refreshContracts,
  seedContracts,
} from "./contracts";
import { customsActionReadFor } from "./customs";
import {
  crewCasualtyProtection,
  crewFacilityDrillFor,
  crewProfileFor,
  crewDismissalCost,
  crewDismissalMoralePenalty,
  crewFacilityFor,
  crewFacilitySummary,
  crewPaydayInterval,
  crewRankFor,
  crewSpecialtyFor,
  crewTraitDefinitionFor,
  crewTraitsFor,
  crewWageFor,
  crewWeeklyWage,
  initialCrewMorale,
  isCrewTraitId,
  normalizeCrewProfiles,
  normalizeCrewMorale,
  shoreLeaveCost,
} from "./crew";
import { relieveCrewProfilesForShoreLeave, updateCrewProfilesForVoyage } from "./crewIdentity";
import {
  adjustMarketStock,
  applyMarketTradeImpact,
  brokerPacketQuoteFor,
  driftMarkets,
  generatePoliticalEvent,
  generateRumor,
  makeMarket,
  makeMarketStock,
  marketAccessForGood,
  makeTrends,
  normalizeMarketStock,
  priceFor,
  sellPriceFor,
} from "./economy";
import { pirateTacticalReadFor } from "./encounters";
import { drawArrivalWorldEvent, drawUnderwayWorldEvent, drawWorldEvent, type WorldEventEffect, type WorldEventResolution } from "./eventDeck";
import { factionFavorQuoteFor } from "./factionFavors";
import { insuranceQuoteFor, normalizeCargoInsurance } from "./insurance";
import type { CargoLoss } from "./insurance";
import { captainSkillMasteryFor, hasCaptainSkillMastery } from "./captainSkills";
import { clamp, cloneState, money, pick, randomBetween, uid } from "./math";
import { appendMarketHistoryPrice, makeMarketHistory, normalizeMarketHistory } from "./marketHistory";
import { defaultOceanField } from "./ocean";
import type { OceanPointSample } from "./ocean";
import { equipmentFitBonusFor, equipmentInSlot, installEquipmentIds, normalizeEquipmentIds } from "./outfitting";
import { inspectionChanceModifier, politicalActionCost, servicePriceModifier } from "./politics";
import {
  battleXpFor,
  contractXpFor,
  initialCaptainXpTarget,
  nextCaptainXpTarget,
  tradeXpForProfit,
  voyageXpFor,
} from "./progression";
import { normalizeRouteMemory, rememberRouteOutcome } from "./routeMemory";
import { cargoUnits, portById, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate, sailPlanFor } from "./routing";
import type { RoutePhysicsProfile } from "./routing";
import { seaRescueReadFor } from "./seaRescue";
import { previewShip, topBuildFitsForStats, yardPriceFor, yardResaleValueFor } from "./shipyard";
import { currentShip, deriveShipStats } from "./stats";
import type { CaptainSkillId, CaptainSkills, Contract, CrewTraitId, GameError, GameState, RumorEvent, SailPlanId, ShipStats, TabId, Voyage, VoyageWatchReport } from "./types";

export const maxDay = 60;
export const captainSkillLimit = 3;
export const debtInterestRate = 0.06;
export const repairCostPerHull = 7;
export const crewCreditPremium = 1.18;
export const dockCreditPremium = 1.1;
export const errorLogLimit = 12;
export const gameStateVersion = 2;
const voyageWatchThresholds = [0.34, 0.68];
export const politicalActionCosts = {
  convoyCash: 140,
  convoyStanding: 1.5,
  convoyMinimumStanding: 2,
  permitCash: 180,
};

export function skillTrainingCost(level: number) {
  return level + 1;
}

export type GameAction =
  | { type: "newRun"; best?: number; replayHookId?: ReplayHookId }
  | { type: "load"; state: Partial<GameState> }
  | { type: "selectPort"; portId: string }
  | { type: "setSailPlan"; plan: SailPlanId }
  | { type: "setTab"; tab: TabId }
  | { type: "buyGood"; goodId: string }
  | { type: "buyMaxGood"; goodId: string }
  | { type: "buyContractCargo"; contractId: string }
  | { type: "sellGood"; goodId: string }
  | { type: "sellAllGood"; goodId: string }
  | { type: "startVoyage" }
  | { type: "tickVoyage"; dt: number }
  | { type: "waitDay" }
  | { type: "repair" }
  | { type: "shoreLeave" }
  | { type: "crewDrill" }
  | { type: "buyInsurance" }
  | { type: "borrow" }
  | { type: "payDebt" }
  | { type: "buyShip"; shipId: string }
  | { type: "sellShip"; shipId: string }
  | { type: "buyEquipment"; equipmentId: string }
  | { type: "sellEquipment"; equipmentId: string }
  | { type: "hireCrew"; crewId: string }
  | { type: "dismissCrew"; crewId: string }
  | { type: "trainSkill"; skillId: CaptainSkillId }
  | { type: "acceptContract"; contractId: string; source?: "board" | "route" }
  | { type: "completeContract"; contractId: string }
  | { type: "requestConvoy" }
  | { type: "buyMarketPermit" }
  | { type: "callFactionFavor" }
  | { type: "commissionBrokerPacket" }
  | { type: "presentPermit" }
  | { type: "submitInspection" }
  | { type: "fileCustomsManifest" }
  | { type: "surrenderCustomsCargo" }
  | { type: "callCustomsFavor" }
  | { type: "resolveSeaSafe" }
  | { type: "resolveSeaSkill" }
  | { type: "resolveSeaBold" }
  | { type: "aidSeaSignal" }
  | { type: "fight" }
  | { type: "warnPirates" }
  | { type: "parleyPirates" }
  | { type: "bribe" }
  | { type: "run" }
  | { type: "recordError"; error: Omit<GameError, "id" | "day" | "time"> }
  | { type: "clearErrors" }
  | { type: "markSaved"; at: string }
  | { type: "setBest"; best: number };

export function createInitialState(best = 0, replayHookId?: ReplayHookId): GameState {
  const state: GameState = {
    version: gameStateVersion,
    day: 1,
    cash: 850,
    debt: 500,
    hull: 100,
    currentShip: "coastal_sloop",
    ownedShips: ["coastal_sloop"],
    equipment: [],
    crew: [],
    crewXp: {},
    crewTraits: {},
    crewProfiles: {},
    crewMorale: initialCrewMorale,
    captainSkills: blankCaptainSkills(),
    skillPoints: 1,
    captainXp: 0,
    captainXpTarget: initialCaptainXpTarget,
    currentPort: "grayhaven",
    selectedPort: "grayhaven",
    sailPlan: "balanced",
    tab: "market",
    cargo: {},
    cargoBasis: {},
    cargoInsurance: null,
    market: makeMarket(),
    marketStock: makeMarketStock(),
    marketHistory: {},
    trends: makeTrends(1),
    events: [],
    politicalEvents: [],
    contracts: [],
    routeMemory: {},
    routeHistory: [],
    factionStanding: Object.fromEntries(factions.map((faction) => [faction.id, 0])),
    log: [],
    errors: [],
    voyage: null,
    encounter: null,
    pendingArrival: null,
    gameOver: false,
    best,
    lastSavedAt: null,
  };
  state.marketHistory = makeMarketHistory(state.market, state.day);
  const rumor = generateRumor(state.day);
  state.events = [rumor];
  state.contracts = seedContracts(state);
  addLog(state, "A clean ledger, a tired ship, and sixty days.");
  addLog(state, rumorText(rumor));
  if (replayHookId) applyReplayHook(state, replayHookId);
  return state;
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  try {
    const result = reduceGameCore(state, action);
    return result === state ? state : normalizeReducerInvariants(result);
  } catch (error) {
    return normalizeReducerInvariants(stateWithReducerError(state, action, error));
  }
}

function reduceGameCore(state: GameState, action: GameAction): GameState {
  if (action.type === "newRun") return createInitialState(action.best ?? state.best, action.replayHookId);
  if (action.type === "load") return normalizeLoadedState(action.state, state.best);
  if (action.type === "tickVoyage" && (!state.voyage || state.encounter || state.gameOver)) return state;
  if (action.type === "waitDay" && (state.voyage || state.encounter || state.gameOver)) return state;

  const next = cloneState(state);

  switch (action.type) {
    case "selectPort": {
      if (next.voyage || next.encounter || next.gameOver) return state;
      next.selectedPort = action.portId;
      if (next.selectedPort !== next.currentPort) next.tab = "intel";
      return next;
    }
    case "setSailPlan": {
      if (next.voyage || next.encounter || next.gameOver) return state;
      next.sailPlan = action.plan;
      return next;
    }
    case "setTab": {
      next.tab = action.tab;
      return next;
    }
    case "buyGood":
      return buyGood(next, action.goodId);
    case "buyMaxGood":
      return buyMaxGood(next, action.goodId);
    case "buyContractCargo":
      return buyContractCargo(next, action.contractId);
    case "sellGood":
      return sellGood(next, action.goodId);
    case "sellAllGood":
      return sellAllGood(next, action.goodId);
    case "startVoyage":
      return startVoyage(next);
    case "tickVoyage":
      return tickVoyage(next, action.dt);
    case "waitDay":
      return waitDay(next);
    case "repair":
      return repair(next);
    case "shoreLeave":
      return shoreLeave(next);
    case "crewDrill":
      return crewDrill(next);
    case "buyInsurance":
      return buyInsurance(next);
    case "borrow":
      next.cash += 400;
      next.debt += 520;
      addLog(next, "Borrowed $400. The lender wrote down $520.");
      return next;
    case "payDebt": {
      if (next.cash <= 0 || next.debt <= 0 || next.gameOver) return state;
      const amount = Math.min(next.cash, next.debt, 300);
      next.cash -= amount;
      next.debt -= amount;
      addLog(next, `Paid ${money(amount)} against debt.`);
      return next;
    }
    case "buyShip":
      return buyShip(next, action.shipId);
    case "sellShip":
      return sellShip(next, action.shipId);
    case "buyEquipment":
      return buyEquipment(next, action.equipmentId);
    case "sellEquipment":
      return sellEquipment(next, action.equipmentId);
    case "hireCrew":
      return hireCrew(next, action.crewId);
    case "dismissCrew":
      return dismissCrew(next, action.crewId);
    case "trainSkill":
      return trainSkill(next, action.skillId);
    case "acceptContract":
      return acceptContract(next, action.contractId, action.source);
    case "completeContract":
      return completeContract(next, action.contractId);
    case "requestConvoy":
      return requestConvoy(next);
    case "buyMarketPermit":
      return buyMarketPermit(next);
    case "callFactionFavor":
      return callFactionFavor(next);
    case "commissionBrokerPacket":
      return commissionBrokerPacket(next);
    case "presentPermit":
      return presentPermit(next);
    case "submitInspection":
      return submitInspection(next);
    case "fileCustomsManifest":
      return fileCustomsManifest(next);
    case "surrenderCustomsCargo":
      return surrenderCustomsCargo(next);
    case "callCustomsFavor":
      return callCustomsFavor(next);
    case "resolveSeaSafe":
      return resolveSeaEncounter(next, "safe");
    case "resolveSeaSkill":
      return resolveSeaEncounter(next, "skill");
    case "resolveSeaBold":
      return resolveSeaEncounter(next, "bold");
    case "aidSeaSignal":
      return aidSeaSignal(next);
    case "fight":
      return fightPirates(next);
    case "warnPirates":
      return warnPirates(next);
    case "parleyPirates":
      return parleyPirates(next);
    case "bribe":
      return bribePirates(next);
    case "run":
      return runPirates(next);
    case "recordError": {
      recordGameError(next, action.error);
      return next;
    }
    case "clearErrors": {
      next.errors = [];
      return next;
    }
    case "markSaved":
      next.lastSavedAt = action.at;
      addLog(next, "Run saved to this device.");
      return next;
    case "setBest": {
      const best = Number.isFinite(action.best) ? Math.max(0, Math.round(action.best)) : 0;
      next.best = Math.max(next.best, best);
      return next;
    }
    default:
      return state;
  }
}

export type ScoreBreakdown = {
  cash: number;
  cargoValue: number;
  activeShipValue: number;
  spareShipValue: number;
  equipmentValue: number;
  crewValue: number;
  hullValue: number;
  debtPenalty: number;
  total: number;
  cargoUnits: number;
  spareShipCount: number;
  equipmentCount: number;
  crewCount: number;
};

export type RunContractRecap = {
  completed: number;
  failed: number;
  active: number;
  deliveredUnits: number;
  totalUnits: number;
  earnedReward: number;
  exposedPenalty: number;
};

export type RunEventRecap = {
  tradeProfit: number;
  tradeLoss: number;
  storms: number;
  pirates: number;
  customs: number;
  rankUps: number;
  upgrades: number;
};

export type RunHighlightTone = "gain" | "loss" | "risk" | "progress" | "neutral";

export type RunHighlight = {
  label: string;
  value: string;
  detail: string;
  tone: RunHighlightTone;
};

export type ReplayHookId = "clean_credit" | "contract_house" | "storm_sailor" | "fast_ledger" | "risk_trader";

export type ReplayHook = {
  id: ReplayHookId;
  label: string;
  title: string;
  detail: string;
  target: string;
  setup: string;
  tone: RunHighlightTone;
};

export type RunStoryBeat = {
  label: string;
  value: string;
  detail: string;
  tone: RunHighlightTone;
};

export type ScoreComparison = {
  label: string;
  value: string;
  detail: string;
  delta: number;
  tone: RunHighlightTone;
};

export type RunBuildBadge = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: RunHighlightTone;
};

export type RunRouteRecap = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: RunHighlightTone;
};

export type RunRank = {
  label: string;
  tone: RunHighlightTone;
  summary: string;
};

export type RunRecap = {
  score: ScoreBreakdown;
  rank: RunRank;
  contracts: RunContractRecap;
  events: RunEventRecap;
  comparison: ScoreComparison;
  buildBadges: RunBuildBadge[];
  routeRecap: RunRouteRecap[];
  highlights: RunHighlight[];
  story: RunStoryBeat[];
  replayPrompt: string;
  replayHooks: ReplayHook[];
};

export function scoreNow(state: GameState) {
  return scoreBreakdownFor(state).total;
}

export function scoreBreakdownFor(state: GameState): ScoreBreakdown {
  const cargoValue = goods.reduce((sum, good) => {
    return sum + (state.cargo[good.id] || 0) * sellPriceFor(state, state.currentPort, good.id);
  }, 0);
  const ship = currentShip(state);
  const activeShipValue = ship.price * 0.62;
  const equipmentValue = state.equipment.length * 460;
  const crewValue = state.crew.reduce((sum, id) => sum + 380 + Math.min(260, Math.round((state.crewXp?.[id] ?? 0) * 0.8)), 0);
  const spareShipValue = state.ownedShips
    .filter((id) => id !== state.currentShip)
    .map((id) => shipCatalog.find((entry) => entry.id === id)?.price ?? 0)
    .reduce((sum, value) => sum + value * 0.58, 0);
  const hullValue = state.hull * 7;
  const total = Math.round(state.cash + cargoValue + activeShipValue + spareShipValue + equipmentValue + crewValue + hullValue - state.debt);
  return {
    cash: state.cash,
    cargoValue,
    activeShipValue,
    spareShipValue,
    equipmentValue,
    crewValue,
    hullValue,
    debtPenalty: state.debt,
    total,
    cargoUnits: cargoUnits(state),
    spareShipCount: state.ownedShips.filter((id) => id !== state.currentShip).length,
    equipmentCount: state.equipment.length,
    crewCount: state.crew.length,
  };
}

export function runRecapFor(state: GameState): RunRecap {
  const score = scoreBreakdownFor(state);
  const contracts = runContractRecapFor(state);
  const events = runEventRecapFor(state);
  const rank = runRankFor(score.total);
  const replayPrompt = replayPromptFor(score, contracts, events);
  const replayHooks = replayHooksFor(score, contracts, events);
  return {
    score,
    rank,
    contracts,
    events,
    comparison: scoreComparisonFor(state, score),
    buildBadges: runBuildBadgesFor(state),
    routeRecap: runRouteRecapFor(state),
    highlights: runHighlightsFor(state, score, contracts, events),
    story: runStoryFor(state, score, contracts, events, replayPrompt, replayHooks),
    replayPrompt,
    replayHooks,
  };
}

function runRankFor(total: number): RunRank {
  if (total >= 9000) return { label: "Harbor Legend", tone: "gain", summary: "A house-making ledger. You bent the sea into a balance sheet." };
  if (total >= 6500) return { label: "Trade House", tone: "gain", summary: "A serious merchant run with enough capital to choose the next war." };
  if (total >= 4200) return { label: "Seasoned Broker", tone: "progress", summary: "Profitable, sturdy, and ready for bigger risks." };
  if (total >= 2200) return { label: "Solvent Captain", tone: "progress", summary: "The ship lives, the books close, and the next run has a target." };
  if (total >= 0) return { label: "Scrappy Ledger", tone: "risk", summary: "You survived, but the sea kept most of the upside." };
  return { label: "In The Red", tone: "loss", summary: "Debt and damage beat the cargo. The comeback line is still visible." };
}

function runContractRecapFor(state: GameState): RunContractRecap {
  const accepted = state.contracts.filter((contract) => contract.status !== "available" || typeof contract.acceptedDay === "number");
  return accepted.reduce<RunContractRecap>(
    (summary, contract) => {
      const delivered = contractDeliveredUnits(contract);
      const total = contractTotalUnits(contract);
      summary.deliveredUnits += delivered;
      summary.totalUnits += total;
      summary.earnedReward += contract.paidReward ?? 0;
      if (contract.status === "completed") summary.completed += 1;
      if (contract.status === "active") summary.active += 1;
      if (contract.status === "failed") {
        summary.failed += 1;
        const remainingRatio = Math.max(0, total - delivered) / Math.max(1, total);
        summary.exposedPenalty += Math.round(contract.penalty * remainingRatio);
      }
      return summary;
    },
    { completed: 0, failed: 0, active: 0, deliveredUnits: 0, totalUnits: 0, earnedReward: 0, exposedPenalty: 0 }
  );
}

function runEventRecapFor(state: GameState): RunEventRecap {
  const text = state.log.map((entry) => entry.text);
  return {
    tradeProfit: largestLoggedMoney(text, /\bprofit \$([\d,]+)/i),
    tradeLoss: largestLoggedMoney(text, /\bloss \$([\d,]+)/i),
    storms: countLogs(text, /(storm|heavy watch|green water|hard water|rough water|foundered|breaking seas)/i),
    pirates: countLogs(text, /(pirate|black flags|red ledger|glassknife|salt widow)/i),
    customs: countLogs(text, /(customs|inspection|permit cleared|evaded .* customs)/i),
    rankUps: countLogs(text, /(became .* after|captain advanced)/i),
    upgrades: countLogs(text, /^(Bought|Changed command to|Trained|Hired) /i),
  };
}

function scoreComparisonFor(state: GameState, score: ScoreBreakdown): ScoreComparison {
  const logs = state.log.map((entry) => entry.text);
  const finalScore = loggedFinalScore(logs) ?? score.total;
  const newBest = logs.map((entry) => /New best by \$([\d,]+) over \$([\d,]+)/i.exec(entry)).find(Boolean);
  if (newBest) {
    const delta = Number(newBest[1].replace(/,/g, ""));
    const previous = Number(newBest[2].replace(/,/g, ""));
    return {
      label: "New best",
      value: `+${money(delta)}`,
      detail: `${money(finalScore)} beat ${money(previous)}.`,
      delta,
      tone: "gain",
    };
  }

  const bestHeld = logs.map((entry) => /Best remains \$([\d,]+) \(\$([\d,]+) away\)/i.exec(entry)).find(Boolean);
  if (bestHeld) {
    const best = Number(bestHeld[1].replace(/,/g, ""));
    const gap = Number(bestHeld[2].replace(/,/g, ""));
    return {
      label: "Best chase",
      value: `${money(gap)} off`,
      detail: `${money(best)} remains the top ledger; current run closed at ${money(finalScore)}.`,
      delta: -gap,
      tone: gap <= Math.max(300, best * 0.12) ? "progress" : "risk",
    };
  }

  if (logs.some((entry) => /First score on the board/i.test(entry))) {
    return {
      label: "First ledger",
      value: money(score.total),
      detail: "This run sets the score to beat next.",
      delta: score.total,
      tone: score.total >= 0 ? "progress" : "risk",
    };
  }

  const best = Math.max(0, state.best || 0);
  if (best <= 0) {
    return {
      label: "First ledger",
      value: money(score.total),
      detail: "No saved best score exists yet.",
      delta: score.total,
      tone: score.total >= 0 ? "progress" : "risk",
    };
  }

  const delta = score.total - best;
  if (delta >= 0) {
    return {
      label: "Best held",
      value: money(score.total),
      detail: `${money(best)} is the saved score to match next run.`,
      delta,
      tone: "gain",
    };
  }

  return {
    label: "Best chase",
    value: `${money(Math.abs(delta))} off`,
    detail: `${money(best)} remains the saved score to beat.`,
    delta,
    tone: Math.abs(delta) <= Math.max(300, best * 0.12) ? "progress" : "risk",
  };
}

function runBuildBadgesFor(state: GameState): RunBuildBadge[] {
  const stats = deriveShipStats(state);
  const fits = topBuildFitsForStats(stats, state.currentShip, 3);
  const badges = fits.map<RunBuildBadge>((fit, index) => ({
    id: fit.id,
    label: fit.label,
    value: `${Math.round(fit.score)} fit`,
    detail: fit.summary,
    tone: index === 0 ? "gain" : "progress",
  }));

  if (!badges.length) {
    badges.push({
      id: "starter",
      label: currentShip(state).name,
      value: "Open build",
      detail: "No clear build identity emerged yet.",
      tone: "neutral",
    });
  }

  return badges;
}

function runRouteRecapFor(state: GameState): RunRouteRecap[] {
  const history = (state.routeHistory ?? []).slice(-30);
  if (!history.length) {
    return [
      {
        id: "no-route-history",
        label: "Route Log",
        value: "No completed lanes",
        detail: "Finish a crossing to seed route comparison next run.",
        tone: "neutral",
      },
    ];
  }

  const cards: RunRouteRecap[] = [];
  const push = (card: RunRouteRecap) => {
    if (!cards.some((entry) => entry.id === card.id)) cards.push(card);
  };
  const bestProfit = [...history].sort((left, right) => right.projectedProfit - left.projectedProfit || right.day - left.day)[0];
  const hardest = [...history].sort((left, right) => routePressureScore(right) - routePressureScore(left) || right.day - left.day)[0];
  const latest = history[history.length - 1];

  push(routeRecapCard("best-lane", "Best Lane", bestProfit));
  push(routeRecapCard("hardest-water", "Hardest Water", hardest));
  push(routeRecapCard("last-crossing", "Last Crossing", latest));

  return cards.slice(0, 3);
}

function routeRecapCard(id: string, label: string, entry: GameState["routeHistory"][number]): RunRouteRecap {
  return {
    id,
    label,
    value: `${portById(entry.fromId).name} -> ${portById(entry.toId).name}`,
    detail: `${money(entry.projectedProfit)} | ${Math.round(entry.risk * 100)}% | ${entry.wear} wear | ${entry.label}`,
    tone: routeHistoryTone(entry),
  };
}

function routePressureScore(entry: GameState["routeHistory"][number]) {
  const outcomePressure = entry.outcome === "pirate" ? 0.3 : entry.outcome === "inspection" ? 0.22 : entry.outcome === "heavy-weather" ? 0.18 : 0;
  return entry.risk + entry.wear * 0.025 + outcomePressure;
}

function routeHistoryTone(entry: GameState["routeHistory"][number]): RunHighlightTone {
  if (entry.outcome === "pirate" || entry.outcome === "inspection") return "risk";
  if (entry.outcome === "heavy-weather") return "risk";
  if (entry.projectedProfit >= 420) return "gain";
  if (entry.projectedProfit > 0) return "progress";
  return "neutral";
}

function runHighlightsFor(state: GameState, score: ScoreBreakdown, contracts: RunContractRecap, events: RunEventRecap): RunHighlight[] {
  const highlights: RunHighlight[] = [];
  highlights.push({
    label: "Final ledger",
    value: money(score.total),
    detail: `${money(score.cash)} cash, ${money(score.cargoValue)} cargo, ${money(score.debtPenalty)} debt drag`,
    tone: score.total >= 4200 ? "gain" : score.total >= 0 ? "progress" : "loss",
  });

  if (contracts.completed || contracts.failed || contracts.active) {
    highlights.push({
      label: "Contracts",
      value: `${contracts.completed} closed`,
      detail: `${contracts.deliveredUnits}/${Math.max(contracts.totalUnits, 1)} units delivered, ${money(contracts.earnedReward)} earned${
        contracts.failed ? `, ${contracts.failed} failed` : ""
      }`,
      tone: contracts.failed ? "risk" : contracts.completed ? "gain" : "progress",
    });
  }

  if (events.tradeProfit > 0) {
    highlights.push({
      label: "Best trade",
      value: money(events.tradeProfit),
      detail: events.tradeLoss > 0 ? `Largest loss was ${money(events.tradeLoss)}` : "No larger loss logged",
      tone: "gain",
    });
  }

  const trouble = events.storms + events.pirates + events.customs;
  if (trouble > 0) {
    highlights.push({
      label: "Trouble survived",
      value: String(trouble),
      detail: `${events.storms} water, ${events.pirates} pirate, ${events.customs} customs beats`,
      tone: "risk",
    });
  }

  if (score.crewCount || events.rankUps) {
    highlights.push({
      label: "Crew",
      value: score.crewCount ? `${score.crewCount} aboard` : `${events.rankUps} rank-ups`,
      detail: `${topRunCrewRankLabel(state)} top hand, ${events.rankUps} progression beats`,
      tone: events.rankUps ? "gain" : "progress",
    });
  }

  if (score.equipmentCount || score.spareShipCount || state.currentShip !== "coastal_sloop") {
    highlights.push({
      label: "Build",
      value: currentShip(state).name,
      detail: `${score.equipmentCount} refits, ${score.spareShipCount} spare hulls, ${money(score.activeShipValue + score.spareShipValue)} hull value`,
      tone: "progress",
    });
  }

  const bestStanding = bestStandingFor(state);
  if (bestStanding) {
    highlights.push({
      label: "Best standing",
      value: bestStanding.name,
      detail: `${bestStanding.value.toFixed(1)} standing with ${bestStanding.policy}`,
      tone: bestStanding.value >= 0 ? "gain" : "loss",
    });
  }

  if (score.debtPenalty > 0) {
    highlights.push({
      label: "Debt drag",
      value: money(score.debtPenalty),
      detail: score.debtPenalty > score.cash ? "Debt outweighed cash at close" : "Debt remained on the books",
      tone: score.debtPenalty > score.cash ? "loss" : "risk",
    });
  }

  return highlights.slice(0, 6);
}

function runStoryFor(
  state: GameState,
  score: ScoreBreakdown,
  contracts: RunContractRecap,
  events: RunEventRecap,
  replayPrompt: string,
  replayHooks: ReplayHook[]
): RunStoryBeat[] {
  const logs = state.log.map((entry) => entry.text);
  const stats = deriveShipStats(state);
  const buildFit = topBuildFitsForStats(stats, state.currentShip, 1)[0];
  const bestTrade = largestLoggedMoneyBeat(logs, /\bprofit \$([\d,]+)/i);
  const worstLoss = largestLoggedMoneyBeat(logs, /\bloss \$([\d,]+)/i);
  const faction = strongestStandingFor(state);
  const worstScrape = worstScrapeFor(logs, events);
  const bestRecovery = bestRecoveryFor(state, logs);
  const topCrew = topRunCrewRankLabel(state);
  const trouble = events.storms + events.pirates + events.customs;

  return [
    {
      label: "Build Identity",
      value: buildFit?.label ?? currentShip(state).name,
      detail: `${currentShip(state).name} | ${score.equipmentCount} refits | ${score.crewCount} crew | ${stats.cannons} guns`,
      tone: score.equipmentCount || score.crewCount || state.currentShip !== "coastal_sloop" ? "progress" : "neutral",
    },
    {
      label: "Best Trade",
      value: bestTrade ? money(bestTrade.amount) : "Unproven",
      detail: bestTrade?.text ?? (contracts.completed ? `${contracts.completed} contract close${contracts.completed === 1 ? "" : "s"} carried the ledger.` : "No profitable sale logged yet."),
      tone: bestTrade || contracts.completed ? "gain" : "neutral",
    },
    {
      label: "Worst Scrape",
      value: worstScrape.value,
      detail: worstScrape.detail,
      tone: worstScrape.tone,
    },
    {
      label: "Best Recovery",
      value: bestRecovery.value,
      detail: bestRecovery.detail,
      tone: bestRecovery.tone,
    },
    {
      label: "Worst Mistake",
      value: worstMistakeValue(score, contracts, events, worstLoss),
      detail: worstMistakeDetail(score, contracts, events, worstLoss),
      tone: worstLoss || contracts.failed || score.debtPenalty > score.cash || trouble >= 3 ? "risk" : "progress",
    },
    factionWakeFor(state, logs, faction),
    {
      label: "Crew Wake",
      value: score.crewCount ? `${score.crewCount} aboard` : "No crew",
      detail: `${topCrew} top hand | ${events.rankUps} rank beat${events.rankUps === 1 ? "" : "s"} | morale ${state.crew.length ? state.crewMorale : 0}`,
      tone: events.rankUps ? "gain" : score.crewCount ? "progress" : "neutral",
    },
    {
      label: "Next Challenge",
      value: replayHooks[0]?.label ?? "Clean Loop",
      detail: replayHooks[0]?.target ?? replayPrompt.replace(/^Replay hook:\s*/i, ""),
      tone: replayHooks[0]?.tone ?? "progress",
    },
  ];
}

type RunStoryCandidate = Omit<RunStoryBeat, "label"> & {
  priority: number;
};

function worstScrapeFor(logs: string[], events: RunEventRecap): Omit<RunStoryBeat, "label"> {
  const candidate = strongestStoryCandidate(logs.map(scrapeCandidateFor));
  if (candidate) return candidate;
  const trouble = events.storms + events.pirates + events.customs;
  if (trouble > 0) {
    return {
      value: `${trouble} trouble`,
      detail: `${events.storms} water, ${events.pirates} pirate, ${events.customs} customs beats without a single hard scrape.`,
      tone: "risk",
    };
  }
  return {
    value: "Clean water",
    detail: "No major encounter scrape defined the run.",
    tone: "progress",
  };
}

function bestRecoveryFor(state: GameState, logs: string[]): Omit<RunStoryBeat, "label"> {
  const completedRecovery = state.contracts
    .filter((contract) => contract.recoverySource && contract.status === "completed")
    .sort((left, right) => (right.completedDay ?? right.acceptedDay ?? 0) - (left.completedDay ?? left.acceptedDay ?? 0))[0];
  if (completedRecovery?.recoverySource) {
    return {
      value: `${recoverySourceLabel(completedRecovery.recoverySource)} closed`,
      detail: `${contractRouteText(completedRecovery)} for ${money(completedRecovery.paidReward ?? completedRecovery.reward)}.`,
      tone: "gain",
    };
  }

  const postedRecovery = state.contracts
    .filter((contract) => contract.recoverySource && contract.status !== "failed")
    .sort((left, right) => (right.acceptedDay ?? right.deadline) - (left.acceptedDay ?? left.deadline))[0];
  if (postedRecovery?.recoverySource) {
    return {
      value: `${recoverySourceLabel(postedRecovery.recoverySource)} posted`,
      detail: postedRecovery.brief ?? contractSummaryText(postedRecovery),
      tone: postedRecovery.status === "active" ? "progress" : "risk",
    };
  }

  const candidate = strongestStoryCandidate(logs.map(recoveryCandidateFor));
  if (candidate) return candidate;
  return {
    value: "None needed",
    detail: "No recovery job, clean escape, or repair-line comeback stood out.",
    tone: "neutral",
  };
}

function factionWakeFor(
  state: GameState,
  logs: string[],
  faction: ReturnType<typeof strongestStandingFor>
): RunStoryBeat {
  const encounterWake = strongestStoryCandidate(logs.map(factionWakeCandidateFor));
  if (encounterWake) {
    return {
      label: "Faction Wake",
      value: faction?.name ?? encounterWake.value,
      detail: faction ? `${encounterWake.detail} | ${faction.value.toFixed(1)} standing | ${faction.policy}` : encounterWake.detail,
      tone: faction ? (faction.value >= 0 ? encounterWake.tone : "loss") : encounterWake.tone,
    };
  }
  return {
    label: "Faction Wake",
    value: faction ? faction.name : "Neutral waters",
    detail: faction ? `${faction.value.toFixed(1)} standing | ${faction.policy}` : "No faction moved far enough to define the run.",
    tone: faction ? (faction.value >= 0 ? "gain" : "loss") : "neutral",
  };
}

function strongestStoryCandidate(candidates: Array<RunStoryCandidate | null>) {
  return candidates.reduce<RunStoryCandidate | null>((best, candidate) => {
    if (!candidate) return best;
    if (!best || candidate.priority >= best.priority) return candidate;
    return best;
  }, null);
}

function scrapeCandidateFor(text: string): RunStoryCandidate | null {
  const lower = text.toLowerCase();
  if (/(ship was lost|foundered|broke during|lost under pirate guns)/i.test(text)) {
    return storyCandidate("Ship loss", text, "loss", 100);
  }
  if (lower.includes("soured on the parley")) return storyCandidate("Pirate parley", text, "risk", 86);
  if (lower.includes("mauled the ship")) return storyCandidate("Pirate fight", text, "risk", 84);
  if (lower.includes("called the bluff")) return storyCandidate("Pirate bluff", text, "risk", 80);
  if (lower.includes("failed customs evasion")) return storyCandidate("Customs seizure", text, "risk", 78);
  if (lower.includes("failed to flee")) return storyCandidate("Hard escape", text, "risk", 76);
  if (lower.includes("pressed too hard through storm water")) return storyCandidate("Storm press", text, "risk", 74);
  if (lower.includes("rescue wake crossed")) return storyCandidate("Cargo lashings", text, "risk", 70);
  if (lower.includes("paid") && lower.includes("black flags")) return storyCandidate("Black-flag toll", text, "risk", 62);
  if (lower.includes("make") && lower.includes("customs look away")) return storyCandidate("Customs bribe", text, "risk", 60);
  if (lower.includes("bonded suspect cargo")) return storyCandidate("Customs bond", text, "risk", 58);
  if (lower.includes("aid signal:")) return storyCandidate("Aid signal", text, "risk", 52);
  if (lower.includes("storm delay")) return storyCandidate("Storm delay", text, "risk", 42);
  return null;
}

function recoveryCandidateFor(text: string): RunStoryCandidate | null {
  const lower = text.toLowerCase();
  if (lower.startsWith("recovery offer posted")) return storyCandidate("Recovery posted", text, "progress", 78);
  if (lower.includes("fast-water escape mapped")) return storyCandidate("Fast-water escape", text, "gain", 72);
  if (lower.startsWith("warned off")) return storyCandidate("Patrol answer", text, "gain", 70);
  if (lower.startsWith("defeated")) return storyCandidate("Pirate defeated", text, "gain", 68);
  if (lower.startsWith("parleyed with")) return storyCandidate("Black-flag passage", text, "progress", 66);
  if (lower.startsWith("filed clean")) return storyCandidate("Clean papers", text, "gain", 64);
  if (lower.includes("permit cleared customs")) return storyCandidate("Permit cleared", text, "gain", 62);
  if (lower.includes("clean storm handling")) return storyCandidate("Clean storm read", text, "gain", 60);
  if (lower.includes("ran with the storm and stole distance")) return storyCandidate("Storm run", text, "progress", 58);
  if (lower.includes("aid signal:")) return storyCandidate("Aid signal", text, "progress", 56);
  if (lower.startsWith("outran the pirates")) return storyCandidate("Clean escape", text, "progress", 54);
  return null;
}

function factionWakeCandidateFor(text: string): RunStoryCandidate | null {
  const lower = text.toLowerCase();
  if (lower.includes("marked the aid in your papers")) return storyCandidate("Aid papers", "Aid signal turned hard water into signed harbor papers.", "gain", 84);
  if (lower.startsWith("filed clean")) return storyCandidate("Clean papers", "Clean customs papers bought reputation instead of panic.", "gain", 78);
  if (lower.startsWith("called in a") && lower.includes("quay favor")) return storyCandidate("Favor spent", "A quay favor solved customs by spending political capital.", "risk", 76);
  if (lower.includes("customs look away")) return storyCandidate("Customs bribe", "A customs bribe left a reputation wake behind the ship.", "loss", 74);
  if (lower.includes("failed customs evasion")) return storyCandidate("Customs scar", "Failed customs evasion left the loudest political scar.", "loss", 72);
  if (lower.startsWith("defeated") || lower.startsWith("warned off")) return storyCandidate("Patrol credit", "Pirate pressure became Admiralty credit.", "gain", 70);
  if (lower.startsWith("parleyed with")) return storyCandidate("Freeport passage", "Black-flag passage nudged the run toward Freeport politics.", "progress", 68);
  if (lower.includes("paid") && lower.includes("black flags")) return storyCandidate("Patrol debt", "Paying black flags weakened the Admiralty wake.", "loss", 60);
  return null;
}

function storyCandidate(value: string, detail: string, tone: RunHighlightTone, priority: number): RunStoryCandidate {
  return { value, detail, tone, priority };
}

function recoverySourceLabel(source: NonNullable<Contract["recoverySource"]>) {
  if (source === "storm") return "Storm recovery";
  if (source === "pirate") return "Pirate recovery";
  return "Customs recovery";
}

function contractRouteText(contract: Contract) {
  return `${portById(contract.originPortId).name} -> ${portById(contract.destinationPortId).name}`;
}

function contractSummaryText(contract: Contract) {
  const summary = contractSummary(contract);
  return typeof summary === "string" ? summary : `${summary.goodName} to ${summary.destinationName}`;
}

function replayPromptFor(score: ScoreBreakdown, contracts: RunContractRecap, events: RunEventRecap) {
  if (score.debtPenalty > score.cash + score.cargoValue) return "Replay hook: run a cleaner credit line. Pay lenders before storm delays turn cash into drag.";
  if (contracts.failed > 0) return "Replay hook: beat the same board by treating deadlines like cargo. Load contracts before speculative trade.";
  if (events.storms + events.pirates + events.customs >= 4) return "Replay hook: try a safer captain build with convoy writs, reefed routes, and earlier repairs.";
  if (score.equipmentCount < 2 && score.total >= 2200) return "Replay hook: turn profit into machinery sooner. A sharper refit can make the next ledger snowball.";
  if (contracts.completed > 0) return `Replay hook: close ${contracts.completed + 1} contracts before day ${maxDay}, then compare the ledger.`;
  return "Replay hook: chase one clean loop: best cargo, best water window, one upgrade, then a bigger route.";
}

export function replayHooksFor(score: ScoreBreakdown, contracts: RunContractRecap, events: RunEventRecap): ReplayHook[] {
  const hooks: ReplayHook[] = [];
  const push = (id: ReplayHookId) => {
    const hook = replayHookCatalog.find((entry) => entry.id === id);
    if (hook && !hooks.some((entry) => entry.id === hook.id)) hooks.push(hook);
  };

  if (score.debtPenalty > score.cash + score.cargoValue || score.total < 0) push("clean_credit");
  if (contracts.failed > 0 || contracts.completed > 0) push("contract_house");
  if (events.storms + events.pirates + events.customs >= 3) push("storm_sailor");
  if (score.total >= 2200 && score.equipmentCount < 2) push("fast_ledger");
  if (events.tradeProfit > 0 && events.tradeLoss === 0) push("risk_trader");

  for (const fallback of ["contract_house", "storm_sailor", "fast_ledger", "clean_credit", "risk_trader"] as ReplayHookId[]) {
    push(fallback);
    if (hooks.length >= 3) break;
  }

  return hooks.slice(0, 3);
}

const replayHookCatalog: ReplayHook[] = [
  {
    id: "clean_credit",
    label: "Clean Credit",
    title: "Open with no lender",
    detail: "Start lighter but debt-free, then prove the first loop can fund itself.",
    target: "Finish with debt below cash.",
    setup: "$650 cash, $0 debt",
    tone: "progress",
  },
  {
    id: "contract_house",
    label: "Contract House",
    title: "Take a charter advance",
    detail: "Begin with a bank-friendly contract board and a little extra debt pressure.",
    target: "Close three jobs before day 35.",
    setup: "+Charter standing, one local house job, +$220 debt",
    tone: "gain",
  },
  {
    id: "storm_sailor",
    label: "Storm Sailor",
    title: "Rig for hard water",
    detail: "Start with storm sails installed, but the refit is financed.",
    target: "Survive three rough-water beats.",
    setup: "Storm Sails installed, +$360 debt",
    tone: "risk",
  },
  {
    id: "fast_ledger",
    label: "Fast Ledger",
    title: "Race the first upgrade",
    detail: "Open with more cash and a larger note, then turn it into machinery fast.",
    target: "Buy a refit or hull by day 18.",
    setup: "$1,050 cash, $820 debt",
    tone: "progress",
  },
  {
    id: "risk_trader",
    label: "Risk Trader",
    title: "Start hot and exposed",
    detail: "Begin with a richer hold, a plotted buyer, and no policy in place yet.",
    target: "Clear the opening cargo without losing hull.",
    setup: "Loaded Tea, route plotted to Glassport, +$300 debt",
    tone: "risk",
  },
];

function applyReplayHook(state: GameState, hookId: ReplayHookId) {
  const hook = replayHookCatalog.find((entry) => entry.id === hookId);
  if (!hook) return;

  if (hookId === "clean_credit") {
    state.cash = 650;
    state.debt = 0;
  } else if (hookId === "contract_house") {
    state.debt += 220;
    state.factionStanding.charter = (state.factionStanding.charter ?? 0) + 1.8;
    state.contracts.unshift(makeReplayContract(state, "replay-house-job", "standard", "charter", "tools", "glassport", 2, 340, 90, 10));
    state.tab = "contracts";
  } else if (hookId === "storm_sailor") {
    state.debt += 360;
    state.equipment = installEquipmentIds(state.equipment, equipmentCatalog.find((entry) => entry.id === "storm_sails")!);
    state.sailPlan = "cautious";
  } else if (hookId === "fast_ledger") {
    state.cash = 1050;
    state.debt = 820;
  } else if (hookId === "risk_trader") {
    state.debt += 300;
    state.cash = Math.max(0, state.cash - 180);
    state.cargo.tea = 6;
    state.cargoBasis.tea = priceFor(state, state.currentPort, "tea");
    adjustMarketStock(state, state.currentPort, "tea", -6);
    state.selectedPort = "glassport";
    state.sailPlan = "hard";
  }

  addLog(state, `Replay hook: ${hook.label}. ${hook.target} Setup: ${hook.setup}.`);
}

function makeReplayContract(
  state: GameState,
  id: string,
  kind: NonNullable<Contract["kind"]>,
  factionId: string,
  goodId: string,
  destinationPortId: string,
  units: number,
  reward: number,
  penalty: number,
  deadlineOffset: number
): Contract {
  return {
    id,
    kind,
    originPortId: state.currentPort,
    destinationPortId,
    factionId,
    goodId,
    units,
    deadline: state.day + deadlineOffset,
    reward,
    penalty,
    status: "available",
  };
}

function topRunCrewRankLabel(state: GameState) {
  if (!state.crew.length) return "No crew";
  const top = state.crew
    .map((crewId) => crewRankFor(state.crewXp?.[crewId] ?? 0))
    .sort((left, right) => right.minXp - left.minXp)[0];
  return top?.label ?? "Green";
}

function bestStandingFor(state: GameState) {
  const best = factions
    .map((faction) => ({
      name: faction.name,
      policy: faction.policy,
      value: state.factionStanding[faction.id] ?? 0,
    }))
    .sort((left, right) => right.value - left.value)[0];
  return best && Math.abs(best.value) >= 0.05 ? best : null;
}

function strongestStandingFor(state: GameState) {
  const strongest = factions
    .map((faction) => ({
      name: faction.name,
      policy: faction.policy,
      value: state.factionStanding[faction.id] ?? 0,
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))[0];
  return strongest && Math.abs(strongest.value) >= 0.05 ? strongest : null;
}

function countLogs(logs: string[], pattern: RegExp) {
  return logs.filter((entry) => pattern.test(entry)).length;
}

function largestLoggedMoney(logs: string[], pattern: RegExp) {
  return logs.reduce((largest, entry) => {
    const match = pattern.exec(entry);
    if (!match) return largest;
    return Math.max(largest, Number(match[1].replace(/,/g, "")));
  }, 0);
}

function largestLoggedMoneyBeat(logs: string[], pattern: RegExp) {
  return logs.reduce<{ amount: number; text: string } | null>((largest, entry) => {
    const match = pattern.exec(entry);
    if (!match) return largest;
    const amount = Number(match[1].replace(/,/g, ""));
    if (!largest || amount > largest.amount) return { amount, text: entry };
    return largest;
  }, null);
}

function loggedFinalScore(logs: string[]) {
  const match = logs.map((entry) => /Final net worth:\s*\$([\d,]+)/i.exec(entry)).find(Boolean);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function worstMistakeValue(score: ScoreBreakdown, contracts: RunContractRecap, events: RunEventRecap, worstLoss: { amount: number; text: string } | null) {
  if (contracts.failed) return `${contracts.failed} failed`;
  if (worstLoss) return money(worstLoss.amount);
  if (score.debtPenalty > score.cash) return money(score.debtPenalty);
  const trouble = events.storms + events.pirates + events.customs;
  if (trouble >= 3) return `${trouble} trouble`;
  return "Contained";
}

function worstMistakeDetail(score: ScoreBreakdown, contracts: RunContractRecap, events: RunEventRecap, worstLoss: { amount: number; text: string } | null) {
  if (contracts.failed) return `${contracts.exposedPenalty ? money(contracts.exposedPenalty) : "Penalty"} still exposed from missed work.`;
  if (worstLoss) return worstLoss.text;
  if (score.debtPenalty > score.cash) return `${money(score.debtPenalty)} debt outweighed ${money(score.cash)} cash at close.`;
  const trouble = events.storms + events.pirates + events.customs;
  if (trouble >= 3) return `${events.storms} water, ${events.pirates} pirate, ${events.customs} customs beats shaped the run.`;
  return "No major loss, failed contract, or debt spiral defined the close.";
}

type RouteSnapshot = {
  days: number;
  risk: number;
  wear: number;
  speedDelta: number;
  tacticLabel: string;
};

function buildChangeSummary(before: ShipStats, after: ShipStats, beforeRoute: RouteSnapshot | null, afterRoute: RouteSnapshot | null) {
  const stats = statDeltaText(before, after);
  const route = routeDeltaText(beforeRoute, afterRoute);
  return route ? `${stats}. ${route}` : `${stats}.`;
}

function statDeltaText(before: ShipStats, after: ShipStats) {
  const labels: Record<keyof ShipStats, string> = {
    cargoCap: "hold",
    cannons: "guns",
    speed: "speed",
    openWater: "water",
    crewCap: "crew",
    hullMax: "hull",
    navigation: "nav",
    negotiation: "trade",
  };
  const keys: Array<keyof ShipStats> = ["speed", "openWater", "navigation", "cargoCap", "crewCap", "cannons", "hullMax", "negotiation"];
  const parts = keys
    .map((key) => ({ key, delta: after[key] - before[key] }))
    .filter((entry) => entry.delta !== 0)
    .map((entry) => `${entry.delta > 0 ? "+" : ""}${entry.delta} ${labels[entry.key]}`);
  return parts.length ? `Build ${parts.join(" | ")}` : "Build unchanged";
}

function selectedRouteSnapshot(state: GameState): RouteSnapshot | null {
  if (state.currentPort === state.selectedPort) return null;
  const conditions = routeConditions(state, state.currentPort, state.selectedPort);
  const wear = routeWearEstimate(state, state.currentPort, state.selectedPort);
  return {
    days: routeDays(state, state.currentPort, state.selectedPort),
    risk: Math.round(routeRisk(state, state.currentPort, state.selectedPort) * 100),
    wear: wear.hullWear,
    speedDelta: conditions.speedDelta,
    tacticLabel: conditions.tacticLabel,
  };
}

function routeDeltaText(before: RouteSnapshot | null, after: RouteSnapshot | null) {
  if (!after) return "";
  const pieces: string[] = [];
  if (!before || before.days !== after.days) pieces.push(before ? `days ${before.days}->${after.days}` : `${after.days}d`);
  if (!before || before.risk !== after.risk) pieces.push(before ? `risk ${before.risk}%->${after.risk}%` : `${after.risk}% risk`);
  if (!before || before.wear !== after.wear) pieces.push(before ? `wear ${before.wear}->${after.wear}` : `${after.wear} wear`);
  if (!before || before.speedDelta !== after.speedDelta) {
    pieces.push(before ? `speed ${signedPercent(before.speedDelta)}->${signedPercent(after.speedDelta)}` : `${signedPercent(after.speedDelta)} speed`);
  }
  return pieces.length ? `Route ${after.tacticLabel}: ${pieces.slice(0, 4).join(" | ")}.` : `Route ${after.tacticLabel}: unchanged.`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export function dockFeeFor(state: GameState) {
  const stats = deriveShipStats(state);
  const port = portById(state.currentPort);
  const standing = state.factionStanding[port.faction] ?? 0;
  const base = 10 + stats.hullMax * 0.04 + cargoUnits(state) * 1.5 + crewWeeklyWage(state) / 14;
  return Math.max(8, Math.round(base * servicePriceModifier(standing, hasMarketPermit(state, port.faction))));
}

export function repairCostFor(state: GameState) {
  const stats = deriveShipStats(state);
  const missing = stats.hullMax - state.hull;
  const points = Math.min(15, missing);
  const port = portById(state.currentPort);
  const standing = state.factionStanding[port.faction] ?? 0;
  return Math.max(0, Math.round(points * repairCostPerHull * servicePriceModifier(standing, hasMarketPermit(state, port.faction))));
}

function buyGood(state: GameState, goodId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const good = goods.find((entry) => entry.id === goodId);
  if (!good) return state;
  const stats = deriveShipStats(state);
  const price = priceFor(state, state.currentPort, goodId);
  const access = marketAccessForGood(state, state.currentPort, goodId);
  if (!access.allowed || state.cash < price || access.availableStock <= 0 || cargoUnits(state) + good.cargo > stats.cargoCap) return state;
  state.cargoBasis ??= {};
  const previousQty = state.cargo[goodId] || 0;
  const previousBasis = state.cargoBasis[goodId] ?? price;
  state.cash -= price;
  state.cargo[goodId] = previousQty + 1;
  state.cargoBasis[goodId] = Math.round((previousBasis * previousQty + price) / state.cargo[goodId]);
  adjustMarketStock(state, state.currentPort, goodId, -1);
  applyMarketTradeImpact(state, state.currentPort, goodId, "buy");
  bumpStanding(state, portById(state.currentPort).faction, 0.35);
  addLog(state, `Bought ${good.name} for ${money(price)}; average basis ${money(state.cargoBasis[goodId])}.`);
  return state;
}

function buyMaxGood(state: GameState, goodId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const good = goods.find((entry) => entry.id === goodId);
  if (!good) return state;
  const stats = deriveShipStats(state);
  let units = 0;
  let spent = 0;
  state.cargoBasis ??= {};

  while (cargoUnits(state) + good.cargo <= stats.cargoCap) {
    const price = priceFor(state, state.currentPort, goodId);
    const access = marketAccessForGood(state, state.currentPort, goodId);
    if (!access.allowed || state.cash < price || access.availableStock <= 0) break;

    const previousQty = state.cargo[goodId] || 0;
    const previousBasis = state.cargoBasis[goodId] ?? price;
    state.cash -= price;
    state.cargo[goodId] = previousQty + 1;
    state.cargoBasis[goodId] = Math.round((previousBasis * previousQty + price) / state.cargo[goodId]);
    adjustMarketStock(state, state.currentPort, goodId, -1);
    applyMarketTradeImpact(state, state.currentPort, goodId, "buy");
    units += 1;
    spent += price;
  }

  if (!units) return state;
  bumpStanding(state, portById(state.currentPort).faction, 0.35 * units);
  addLog(state, `Loaded ${units} ${good.name} for ${money(spent)}; average basis ${money(state.cargoBasis[goodId])}.`);
  return state;
}

function buyContractCargo(state: GameState, contractId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract || contract.status !== "active") return state;
  const plan = contractPlanSummary(state, contract);
  if (plan.status !== "loadable" || plan.missing <= 0) return state;

  const good = goods.find((entry) => entry.id === plan.stop.goodId);
  if (!good) return state;
  const stats = deriveShipStats(state);
  const maxUnitsByHold = Math.floor(Math.max(0, stats.cargoCap - cargoUnits(state)) / good.cargo);
  const targetUnits = Math.min(plan.missing, maxUnitsByHold);
  if (targetUnits <= 0) return state;

  let units = 0;
  let spent = 0;
  state.cargoBasis ??= {};

  while (units < targetUnits) {
    const price = priceFor(state, state.currentPort, good.id);
    const access = marketAccessForGood(state, state.currentPort, good.id);
    if (!access.allowed || state.cash < price || access.availableStock <= 0) break;

    const previousQty = state.cargo[good.id] || 0;
    const previousBasis = state.cargoBasis[good.id] ?? price;
    state.cash -= price;
    state.cargo[good.id] = previousQty + 1;
    state.cargoBasis[good.id] = Math.round((previousBasis * previousQty + price) / state.cargo[good.id]);
    adjustMarketStock(state, state.currentPort, good.id, -1);
    applyMarketTradeImpact(state, state.currentPort, good.id, "buy");
    units += 1;
    spent += price;
  }

  if (!units) return state;
  bumpStanding(state, portById(state.currentPort).faction, 0.35 * units);
  const summary = contractSummary(contract);
  const remaining = Math.max(0, plan.missing - units);
  addLog(
    state,
    `Loaded ${units} ${good.name} for ${summary.factionName} contract; ${remaining ? `${remaining} still needed` : "job cargo ready"} (${money(spent)}).`
  );
  return state;
}

function sellGood(state: GameState, goodId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const qty = state.cargo[goodId] || 0;
  const good = goods.find((entry) => entry.id === goodId);
  if (!good || qty <= 0) return state;
  const price = sellPriceFor(state, state.currentPort, goodId);
  state.cargoBasis ??= {};
  const basis = state.cargoBasis[goodId] ?? price;
  const profit = price - basis;
  state.cargo[goodId] = qty - 1;
  if (state.cargo[goodId] <= 0) {
    delete state.cargo[goodId];
    delete state.cargoBasis[goodId];
  }
  state.cash += price;
  adjustMarketStock(state, state.currentPort, goodId, 1);
  applyMarketTradeImpact(state, state.currentPort, goodId, "sell");
  bumpStanding(state, portById(state.currentPort).faction, 0.5);
  addLog(state, `Sold ${good.name} for ${money(price)}; ${profit >= 0 ? "profit" : "loss"} ${money(Math.abs(profit))}.`);
  grantCaptainXp(state, tradeXpForProfit(profit), "Profitable trade");
  return state;
}

function sellAllGood(state: GameState, goodId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const quantity = state.cargo[goodId] || 0;
  const good = goods.find((entry) => entry.id === goodId);
  if (!good || quantity <= 0) return state;
  state.cargoBasis ??= {};
  const basis = state.cargoBasis[goodId] ?? sellPriceFor(state, state.currentPort, goodId);
  let units = 0;
  let revenue = 0;
  let profit = 0;

  while ((state.cargo[goodId] || 0) > 0) {
    const price = sellPriceFor(state, state.currentPort, goodId);
    state.cargo[goodId] -= 1;
    state.cash += price;
    revenue += price;
    profit += price - basis;
    units += 1;
    adjustMarketStock(state, state.currentPort, goodId, 1);
    applyMarketTradeImpact(state, state.currentPort, goodId, "sell");
  }

  delete state.cargo[goodId];
  delete state.cargoBasis[goodId];
  bumpStanding(state, portById(state.currentPort).faction, 0.5 * units);
  addLog(state, `Sold ${units} ${good.name} for ${money(revenue)}; ${profit >= 0 ? "profit" : "loss"} ${money(Math.abs(profit))}.`);
  grantCaptainXp(state, tradeXpForProfit(profit), "Profitable trade");
  return state;
}

function startVoyage(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  if (state.selectedPort === state.currentPort) return state;
  const from = portById(state.currentPort);
  const to = portById(state.selectedPort);
  if (state.cargoInsurance && state.cargoInsurance.destinationPortId !== to.id) {
    addLog(state, `Cargo policy to ${portById(state.cargoInsurance.destinationPortId).name} voided by a new sailing order.`);
    state.cargoInsurance = null;
  }
  const days = routeDays(state, from.id, to.id);
  const risk = routeRisk(state, from.id, to.id);
  const conditions = routeConditions(state, from.id, to.id);
  const wear = routeWearEstimate(state, from.id, to.id);
  state.voyage = {
    fromId: from.id,
    toId: to.id,
    days,
    risk,
    sailPlan: state.sailPlan,
    wear: wear.hullWear,
    wearLabel: wear.label,
    seaLabel: conditions.seaLabel,
    watchIndex: 0,
    watch: null,
    progress: 0,
    duration: 1.15 + days * 0.12,
  };
  addLog(state, `Sailed for ${to.name}: ${conditions.sailPlanLabel} order, ${days} days, ${conditions.windLabel}, ${conditions.seaLabel}, ${wear.label}.`);
  return state;
}

function tickVoyage(state: GameState, dt: number) {
  if (!state.voyage || state.encounter || state.gameOver) return state;
  const previousProgress = state.voyage.progress;
  state.voyage.progress = clamp(state.voyage.progress + dt / state.voyage.duration, 0, 1);
  resolveVoyageWatches(state, previousProgress);
  if (state.encounter) return state;
  if (state.gameOver) return state;
  if (state.voyage.progress < 1) return state;
  return finishVoyage(state);
}

function resolveVoyageWatches(state: GameState, previousProgress: number) {
  const voyage = state.voyage;
  if (!voyage) return;
  let watchIndex = voyage.watchIndex ?? 0;
  while (watchIndex < voyageWatchThresholds.length && state.voyage && !state.encounter && state.voyage.progress >= voyageWatchThresholds[watchIndex]) {
    const threshold = voyageWatchThresholds[watchIndex];
    if (previousProgress < threshold) resolveVoyageWatch(state, threshold);
    watchIndex += 1;
    if (state.voyage) state.voyage.watchIndex = watchIndex;
  }
}

function resolveVoyageWatch(state: GameState, progress: number) {
  if (!state.voyage) return;
  const voyage = state.voyage;
  const ocean = defaultOceanField.sampleRoutePoint({
    fromId: voyage.fromId,
    toId: voyage.toId,
    progress,
    day: state.day + voyage.days * progress,
    time: progress * 3.2,
  });
  const stats = deriveShipStats(state);
  const load = clamp(cargoUnits(state) / stats.cargoCap, 0, 1);
  const strain = clamp(
    ocean.roughness * 0.48 +
      ocean.stormIntensity * 0.36 +
      ocean.waveEnergy * 0.22 +
      Math.max(0, ocean.surfaceDrift.strength - 0.4) * 0.16 +
      load * 0.08 -
      stats.openWater * 0.065 -
      stats.navigation * 0.032 +
      sailPlanFor(voyage.sailPlan ?? state.sailPlan).watchModifier,
    0,
    1
  );

  if (strain >= 0.58 || ocean.stormIntensity >= 0.5) {
    openSeaDecision(state, progress, ocean, strain);
  } else if (strain >= 0.36) {
    adjustCrewMorale(state, -1);
    state.voyage.watch = makeWatchReport("Working Water", "Crew trimmed against a confused swell.", progress, ocean, "strain");
    addLog(state, `${state.voyage.watch.label}: ${state.voyage.watch.detail}`);
  } else {
    state.voyage.watch = makeWatchReport("Clean Watch", "The ship rode the visible current cleanly.", progress, ocean, "clean");
  }

  if (!state.encounter) maybeResolveUnderwayWorldEvent(state, progress);
  if (state.hull <= 0) endRun(state, "The ship foundered in breaking seas.");
}

function openSeaDecision(state: GameState, progress: number, ocean: OceanPointSample, strain: number) {
  if (!state.voyage) return;
  const storm = ocean.stormIntensity >= 0.5;
  const hasCargo = cargoUnits(state) > 0;
  const effect: VoyageWatchReport["effect"] = strain >= 0.76 && hasCargo ? "cargo" : strain >= 0.56 ? "damage" : "strain";
  const label = storm ? "Storm Front" : effect === "cargo" ? "Green Water" : effect === "damage" ? "Heavy Watch" : "Working Water";
  const hullThreat = Math.max(1, Math.round((storm ? 3 : 1) + strain * (storm ? 8 : 5)));
  const moraleThreat = Math.max(1, Math.round((storm ? 3 : 1) + strain * 8));
  const cargoThreat = hasCargo && (effect === "cargo" || storm) ? 1 : 0;
  const detail = storm
    ? "A storm line crosses the route; choose how hard to carry canvas."
    : effect === "cargo"
      ? "Breaking water is shifting cargo; choose what takes the hit."
      : "Cross seas are building; choose a watch response.";

  state.voyage.watch = makeWatchReport(label, detail, progress, ocean, effect);
  state.encounter = {
    kind: "sea",
    seaKind: storm ? "storm" : "watch",
    name: label,
    strength: Math.round(strain * 100),
    bribe: 0,
    bounty: 0,
    portName: portById(state.voyage.toId).name,
    progress,
    roughness: Number(ocean.roughness.toFixed(3)),
    stormIntensity: Number(ocean.stormIntensity.toFixed(3)),
    waveEnergy: Number(ocean.waveEnergy.toFixed(3)),
    effect,
    hullThreat,
    moraleThreat,
    cargoThreat,
  };
  addLog(state, `${label}: ${detail}`);
}

function makeWatchReport(
  label: string,
  detail: string,
  progress: number,
  ocean: OceanPointSample,
  effect: VoyageWatchReport["effect"]
): VoyageWatchReport {
  return {
    label,
    detail,
    progress,
    roughness: Number(ocean.roughness.toFixed(2)),
    stormIntensity: Number(ocean.stormIntensity.toFixed(2)),
    waveEnergy: Number(ocean.waveEnergy.toFixed(2)),
    effect,
  };
}

type SeaResponse = "safe" | "skill" | "bold";

function resolveSeaEncounter(state: GameState, response: SeaResponse) {
  if (state.encounter?.kind !== "sea" || !state.voyage) return state;
  const encounter = state.encounter;
  const storm = encounter.seaKind === "storm";
  const stats = deriveShipStats(state);
  const gearRelief = seaEncounterGearRelief(state, storm);
  const hullThreat = Math.max(1, Math.round((encounter.hullThreat ?? encounter.strength * 0.08) * gearRelief.hullModifier));
  const moraleThreat = Math.max(1, Math.round((encounter.moraleThreat ?? encounter.strength * 0.06) * gearRelief.moraleModifier));
  const label = encounter.name;

  if (response === "safe") {
    const hullLoss = Math.max(0, Math.ceil(hullThreat * (storm ? 0.42 : 0.32)));
    applySeaDamage(state, hullLoss, Math.ceil(moraleThreat * 0.45), `${storm ? "Heaved to under storm canvas" : "Reefed early"}; ${label.toLowerCase()} cost ${hullLoss} hull.`);
    if (storm) {
      state.voyage.days += 1;
      state.voyage.duration += 0.12;
      addLog(state, "Storm delay: +1 day, but the ship stayed orderly.");
    }
    grantCrewXp(state, storm ? 16 : 10, storm ? "Storm watch" : "Sea watch");
  } else if (response === "skill") {
    const stormHand = hasCaptainSkillMastery(state, "seamanship");
    const chance = clamp(
      0.5 +
        stats.openWater * 0.07 +
        stats.navigation * 0.045 +
        (stormHand ? 0.1 : 0) +
        (state.crew.length ? state.crewMorale * 0.001 : 0) -
        encounter.strength * 0.0018,
      0.26,
      0.94
    );
    if (Math.random() < chance) {
      const hullLoss = Math.max(0, Math.floor(hullThreat * (stormHand ? 0.14 : 0.22)));
      applySeaDamage(
        state,
        hullLoss,
        Math.ceil(moraleThreat * (stormHand ? 0.18 : 0.25)),
        `${stormHand ? "Storm Hand read" : `Clean ${storm ? "storm" : "watch"} handling`}; ${label.toLowerCase()} cost ${hullLoss} hull.`
      );
      grantCaptainXp(state, storm ? 18 : 12, storm ? "Storm handling" : "Sea handling");
      grantCrewXp(state, storm ? 20 : 14, storm ? "Storm handling" : "Sea handling");
    } else {
      const hullLoss = Math.max(1, Math.ceil(hullThreat * (stormHand ? 0.42 : 0.55)));
      applySeaDamage(
        state,
        hullLoss,
        Math.ceil(moraleThreat * (stormHand ? 0.48 : 0.62)),
        `${stormHand ? "Storm Hand softened a missed read" : "Missed the water read"}; ${label.toLowerCase()} cost ${hullLoss} hull.`
      );
      if (encounter.cargoThreat && Math.random() < 0.25) settleCargoInsuranceClaim(state, loseRandomCargo(state));
      grantCaptainXp(state, storm ? 10 : 7, "Hard water lesson");
    }
  } else if (storm) {
    const chance = clamp(0.24 + stats.speed * 0.075 + stats.openWater * 0.035 - (encounter.stormIntensity ?? 0.4) * 0.18, 0.1, 0.72);
    if (Math.random() < chance) {
      state.voyage.progress = clamp(state.voyage.progress + 0.08, 0, 1);
      applySeaDamage(state, Math.max(0, Math.floor(hullThreat * 0.28)), Math.ceil(moraleThreat * 0.35), "Ran with the storm and stole distance.");
      grantCaptainXp(state, 20, "Storm gamble");
      grantCrewXp(state, 18, "Storm gamble");
    } else {
      const hullLoss = Math.max(2, hullThreat + 2);
      applySeaDamage(state, hullLoss, moraleThreat + 2, `Pressed too hard through storm water; hull -${hullLoss}.`);
      settleCargoInsuranceClaim(state, loseRandomCargo(state));
      maybeLoseCrew(state, "storm knockdown", 0.1 + encounter.strength * 0.0012);
    }
  } else {
    const loss = encounter.cargoThreat && cargoUnits(state) > 0 ? loseRandomCargo(state) : null;
    settleCargoInsuranceClaim(state, loss);
    const hullLoss = Math.max(0, Math.floor(hullThreat * (loss ? 0.16 : 0.55)));
    applySeaDamage(state, hullLoss, Math.ceil(moraleThreat * 0.35), loss ? `Jettisoned freight to save the hull; ${label.toLowerCase()} cost ${hullLoss} hull.` : `Pushed through rough water; ${label.toLowerCase()} cost ${hullLoss} hull.`);
    state.voyage.progress = clamp(state.voyage.progress + 0.04, 0, 1);
    grantCrewXp(state, 10, "Emergency watch");
  }

  state.encounter = null;
  if (state.hull <= 0) return endRun(state, "The ship foundered in breaking seas.");
  return state.voyage && state.voyage.progress >= 1 ? finishVoyage(state) : state;
}

function aidSeaSignal(state: GameState) {
  if (state.encounter?.kind !== "sea" || !state.voyage) return state;
  const read = seaRescueReadFor(state);
  if (!read) return state;
  if (read.delayDays > 0) {
    state.voyage.days += read.delayDays;
    state.voyage.duration += read.delayDays * 0.12;
  }
  applySeaDamage(
    state,
    read.hullCost,
    read.moraleCost,
    `Aid signal: ${read.portIdentityLabel} boats marked the rescue; cost ${read.hullCost} hull, ${read.delayDays ? `+${read.delayDays} day` : "no delay"}.`
  );
  if (cargoUnits(state) > 0 && Math.random() < read.cargoLossChance) {
    addLog(state, "Rescue wake crossed the cargo lashings.");
    settleCargoInsuranceClaim(state, loseRandomCargo(state));
  }
  bumpStanding(state, read.destinationFactionId, read.standingGain);
  grantCaptainXp(state, Math.round(12 + read.pressure * 16), "Storm rescue");
  grantCrewXp(state, Math.round(10 + read.pressure * 14), "Rescue watch");
  addLog(state, `${read.destinationName} marked the aid in your papers; standing +${read.standingGain.toFixed(1)}.`);
  state.encounter = null;
  if (state.hull <= 0) return endRun(state, "The ship foundered during a rescue attempt.");
  postRecoveryContract(state, "storm", read.destinationId);
  return state.voyage.progress >= 1 ? finishVoyage(state) : state;
}

function applySeaDamage(state: GameState, hullLoss: number, moraleLoss: number, logText: string) {
  const stats = deriveShipStats(state);
  if (hullLoss > 0) state.hull = clamp(state.hull - hullLoss, 0, stats.hullMax);
  adjustCrewMorale(state, -Math.max(0, moraleLoss));
  addLog(state, logText);
}

function seaEncounterGearRelief(state: GameState, storm: boolean) {
  const drogue = state.equipment.includes("drogue_anchor");
  const watchBunks = state.equipment.includes("watch_bunks");
  const stormHand = hasCaptainSkillMastery(state, "seamanship");
  return {
    hullModifier: (drogue ? (storm ? 0.78 : 0.7) : 1) * (stormHand ? 0.9 : 1),
    moraleModifier: (drogue ? 0.9 : 1) * (watchBunks ? 0.78 : 1) * (stormHand ? 0.88 : 1),
  };
}

function waitDay(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const fee = dockFeeFor(state);
  const paid = Math.min(state.cash, fee);
  const shortfall = fee - paid;
  state.cash -= paid;
  if (shortfall > 0) {
    const credit = Math.ceil(shortfall * dockCreditPremium);
    state.debt += credit;
    addLog(state, `Waited for tide: paid ${money(paid)}, dock credit ${money(credit)}.`);
  } else {
    addLog(state, `Waited for tide; dockage ${money(fee)}.`);
  }
  advanceDay(state, 1);
  maybeResolveWorldEvent(state);
  return state;
}

function finishVoyage(state: GameState) {
  if (!state.voyage) return state;
  const voyage = state.voyage;
  const physics = routePhysicsProfile(state, voyage.fromId, voyage.toId);
  const delayDays = Math.random() < physics.delayRisk ? 1 : 0;
  const traveledVoyage = delayDays ? { ...voyage, days: voyage.days + delayDays } : voyage;
  const wear = voyageWear(state, voyage);
  state.voyage = null;
  advanceDay(state, traveledVoyage.days);
  if (state.gameOver) return state;

  applyVoyageWear(state, traveledVoyage, wear);
  if (state.gameOver) return state;

  wearCrewMorale(state, traveledVoyage, wear);
  resolveVoyagePhysicsEffects(state, traveledVoyage, physics, delayDays);
  grantCaptainXp(state, voyageXpFor(traveledVoyage.days, traveledVoyage.risk, wear.hullWear), "Crossing experience");
  grantCrewXp(state, 8 + traveledVoyage.days * 5 + Math.round(wear.hullWear * 1.4), "Sea watch");
  resolveVoyageRewardBeat(state, traveledVoyage, wear);
  const projectedProfit = routeCargoProjectedProfit(state, traveledVoyage.toId);
  const crewIdentityChanges = updateCrewProfilesForVoyage(state, traveledVoyage, {
    expectedProfit: projectedProfit,
    crewStrain: physics.crewStrain,
    hullWear: wear.hullWear,
  });
  if (crewIdentityChanges.length) addLog(state, `Crew read: ${crewIdentityChanges.slice(0, 2).join("; ")}.`);
  if (Math.random() < traveledVoyage.risk) {
    rememberVoyageRoute(state, traveledVoyage, wear, "pirate", projectedProfit);
    const to = portById(traveledVoyage.toId);
    const stats = deriveShipStats(state);
    const strength = Math.round(28 + state.day * 1.2 + traveledVoyage.risk * 70 + randomBetween(-10, 18));
    state.pendingArrival = traveledVoyage.toId;
    state.encounter = {
      kind: "pirate",
      name: pick(["The Red Ledger", "Glassknife", "Captain Venn", "The Salt Widow"]),
      strength,
      bribe: Math.round(110 + strength * (3.4 - stats.negotiation * 0.08)),
      bounty: Math.round(180 + strength * 5.8),
      portName: to.name,
    };
    addLog(state, `Pirate sails cut across the route to ${to.name}.`);
  } else if (openCustomsInspection(state, traveledVoyage.toId)) {
    rememberVoyageRoute(state, traveledVoyage, wear, "inspection", projectedProfit);
    return state;
  } else {
    const heavyWeather = wear.hullWear >= 8 || traveledVoyage.watch?.effect === "damage" || traveledVoyage.watch?.effect === "cargo";
    rememberVoyageRoute(state, traveledVoyage, wear, wear.hullWear >= 8 || traveledVoyage.watch?.effect === "damage" || traveledVoyage.watch?.effect === "cargo" ? "heavy-weather" : "clean", projectedProfit);
    arrive(state, traveledVoyage.toId);
    if (heavyWeather) postRecoveryContract(state, "storm", traveledVoyage.toId);
    maybeResolveArrivalWorldEvent(state, traveledVoyage, physics, projectedProfit);
  }
  return state;
}

function resolveVoyagePhysicsEffects(state: GameState, voyage: Voyage, physics: RoutePhysicsProfile, delayDays: number) {
  if (delayDays > 0) {
    addLog(state, `${physics.label}: contrary water cost +${delayDays} day on the run to ${portById(voyage.toId).name}.`);
  }

  if (physics.cargoRisk > 0 && cargoUnits(state) > 0 && Math.random() < physics.cargoRisk) {
    addLog(state, `${physics.label}: breaking seas worked into the freight lashings.`);
    settleCargoInsuranceClaim(state, loseRandomCargo(state));
  }

  const hardEnoughForCrewStrain = physics.pressure >= 0.48 || physics.delayRisk >= 0.08 || physics.cargoRisk >= 0.08;
  if (state.crew.length && physics.crewStrain > 0 && hardEnoughForCrewStrain) {
    const facility = crewFacilityFor(state);
    const moraleLoss = Math.max(0, physics.crewStrain - Math.floor(facility.moraleStrainRelief / 2));
    if (moraleLoss > 0) {
      adjustCrewMorale(state, -moraleLoss, `${physics.label} strained the crew to {morale}.`);
    }
  }

  const assistChance = clamp((physics.assist - 0.16) * 0.7, 0, 0.36);
  if (assistChance > 0 && Math.random() < assistChance) {
    if (state.crew.length) adjustCrewMorale(state, 2, "Current push lifted crew morale to {morale}.");
    grantCaptainXp(state, 8, "Current-assisted crossing");
    addLog(state, `Current push: the ship rode the set cleanly into ${portById(voyage.toId).name}.`);
  }
}

function routeCargoProjectedProfit(state: GameState, destinationId: string) {
  return goods.reduce((sum, good) => {
    const quantity = state.cargo[good.id] || 0;
    if (quantity <= 0) return sum;
    const basis = state.cargoBasis[good.id] ?? sellPriceFor(state, state.currentPort, good.id);
    return sum + (sellPriceFor(state, destinationId, good.id) - basis) * quantity;
  }, 0);
}

function rememberVoyageRoute(
  state: GameState,
  voyage: Voyage,
  wear: ReturnType<typeof routeWearEstimate>,
  event: "clean" | "heavy-weather" | "pirate" | "inspection",
  projectedProfit: number
) {
  const memory = rememberRouteOutcome(state, {
    fromId: voyage.fromId,
    toId: voyage.toId,
    day: state.day,
    projectedProfit,
    wear: wear.hullWear,
    risk: voyage.risk,
    sailPlan: voyage.sailPlan,
    event,
  });
  rememberRouteHistory(state, voyage, wear, event, projectedProfit, memory.lastLabel, memory.lastDetail);
  if (memory.trips === 1 || event !== "clean" || Math.abs(projectedProfit) >= 220) {
    addLog(state, `Route memory: ${portById(voyage.fromId).name} to ${portById(voyage.toId).name} marked ${memory.lastLabel.toLowerCase()}.`);
  }
}

function rememberRouteHistory(
  state: GameState,
  voyage: Voyage,
  wear: ReturnType<typeof routeWearEstimate>,
  outcome: "clean" | "heavy-weather" | "pirate" | "inspection",
  projectedProfit: number,
  label: string,
  detail: string
) {
  const entry: GameState["routeHistory"][number] = {
    day: state.day,
    fromId: voyage.fromId,
    toId: voyage.toId,
    sailPlan: sailPlanFor(voyage.sailPlan ?? state.sailPlan).id,
    projectedProfit: Math.round(projectedProfit),
    risk: Number(voyage.risk.toFixed(3)),
    wear: wear.hullWear,
    outcome,
    reason: routeHistoryReasonFor(state, voyage.toId, projectedProfit, voyage.risk, wear.hullWear),
    cargoSummary: routeHistoryCargoSummary(state, voyage.toId),
    label,
    detail,
  };
  state.routeHistory = [...(state.routeHistory ?? []), entry].slice(-30);
}

function routeHistoryReasonFor(state: GameState, destinationId: string, projectedProfit: number, risk: number, wear: number) {
  if (state.contracts.some((contract) => contract.status === "active" && contract.destinationPortId === destinationId)) return "contract delivery";
  if (projectedProfit >= 220) return `cargo swing ${signedMoney(projectedProfit)}`;
  if (projectedProfit <= -80) return `bad cargo swing ${signedMoney(projectedProfit)}`;
  if (risk >= 0.3) return "risk lane";
  if (wear >= 8) return "hard-water test";
  if (cargoUnits(state) > 0) return "speculative cargo";
  return "route scouting";
}

function routeHistoryCargoSummary(state: GameState, destinationId: string) {
  const cargo = goods
    .filter((good) => (state.cargo[good.id] ?? 0) > 0)
    .map((good) => `${state.cargo[good.id]} ${good.name}`);
  const contracts = state.contracts
    .filter((contract) => contract.status === "active" && contract.destinationPortId === destinationId)
    .map((contract) => {
      const good = goods.find((entry) => entry.id === contract.goodId);
      return `${contract.units} ${good?.name ?? contract.goodId} contract`;
    });
  return [...contracts, ...cargo].slice(0, 3).join(", ") || "empty hold";
}

function signedMoney(value: number) {
  return value < 0 ? `-${money(Math.abs(value))}` : `+${money(value)}`;
}

function resolveVoyageRewardBeat(state: GameState, voyage: Voyage, wear: ReturnType<typeof routeWearEstimate>) {
  const destination = portById(voyage.toId);
  const faction = factions.find((entry) => entry.id === destination.faction);

  if (voyage.risk >= 0.32 || wear.hullWear >= 8) {
    const gain = Number((0.45 + Math.min(0.75, voyage.risk) + Math.min(0.55, wear.hullWear / 24)).toFixed(2));
    bumpStanding(state, destination.faction, gain);
    addLog(state, `Reward: hard-water story spread in ${destination.name}; ${faction?.name ?? "harbor"} standing +${gain.toFixed(2)}.`);
    return;
  }

  if (state.crew.length && wear.hullWear <= 2) {
    const before = normalizeCrewMorale(state.crewMorale);
    state.crewMorale = normalizeCrewMorale(before + 4);
    if (state.crewMorale > before) {
      addLog(state, `Reward: clean crossing lifted crew morale to ${state.crewMorale}.`);
      return;
    }
  }

  const rumor = voyageRewardRumor(state, voyage);
  state.events.unshift(rumor);
  state.events = state.events.filter((event) => event.expires >= state.day).slice(0, 6);
  addLog(state, `Reward: dockside tip - ${rumorText(rumor)}`);
}

function voyageRewardRumor(state: GameState, voyage: Voyage): RumorEvent {
  const origin = portById(voyage.fromId);
  const destination = portById(voyage.toId);
  const candidates = [...destination.imports, ...origin.exports].filter((goodId, index, list) => list.indexOf(goodId) === index);
  const goodId = pick(candidates.length ? candidates : goods.map((good) => good.id));
  const shortage = destination.imports.includes(goodId) || !origin.exports.includes(goodId);
  return {
    id: uid("rumor"),
    portId: destination.id,
    goodId,
    multiplier: shortage ? randomBetween(1.34, 1.72) : randomBetween(0.54, 0.78),
    expires: state.day + clamp(4 + voyage.days, 6, 11),
    kind: shortage ? "shortage" : "glut",
  };
}

function voyageWear(state: GameState, voyage: Voyage) {
  if (typeof voyage.wear === "number" && voyage.wearLabel) {
    return {
      hullWear: voyage.wear,
      label: voyage.wearLabel,
      stress: 0,
    };
  }
  return routeWearEstimate(state, voyage.fromId, voyage.toId);
}

function applyVoyageWear(state: GameState, voyage: Voyage, wear: ReturnType<typeof routeWearEstimate>) {
  if (wear.hullWear <= 0) return;
  const stats = deriveShipStats(state);
  state.hull = clamp(state.hull - wear.hullWear, 0, stats.hullMax);
  addLog(state, `${capitalize(wear.label)} cost ${wear.hullWear} hull on the crossing to ${portById(voyage.toId).name}.`);
  if (state.hull <= 0) endRun(state, "The ship broke under heavy seas.");
}

function wearCrewMorale(state: GameState, voyage: Voyage, wear: ReturnType<typeof routeWearEstimate>) {
  const facility = crewFacilityFor(state);
  const roughPenalty = Math.max(0, Math.round(wear.hullWear * 0.42 + Math.max(0, voyage.days - 2) * 1.25) - facility.moraleStrainRelief);
  if (roughPenalty <= 0) return;
  adjustCrewMorale(state, -roughPenalty, `Hard water pulled crew morale to {morale}.`);
}

function advanceDay(state: GameState, count: number) {
  for (let index = 0; index < count; index += 1) {
    state.day += 1;
    Object.assign(state, driftMarkets(state));
    recordMarketSnapshot(state);
    expireContracts(state);
    decayStanding(state);
    if (state.day % 5 === 0) {
      const rumor = generateRumor(state.day);
      state.events.unshift(rumor);
      addLog(state, rumorText(rumor));
    }
    if (state.day % 7 === 0 || state.day % 11 === 0) {
      const event = generatePoliticalEvent(state.day);
      state.politicalEvents.unshift(event);
      addLog(state, event.text);
    }
    if (state.day % 10 === 0 && state.debt > 0) {
      const interest = Math.ceil(state.debt * debtInterestRate);
      state.debt += interest;
      addLog(state, `Interest posted: ${money(interest)}.`);
    }
    if (state.day % crewPaydayInterval === 0) payCrewWages(state);
    expireCargoInsurance(state);
  }
  state.events = state.events.filter((event) => event.expires >= state.day).slice(0, 6);
  state.politicalEvents = state.politicalEvents.filter((event) => event.expires >= state.day).slice(0, 6);
  state.contracts = refreshContracts(state);
  if (state.day > maxDay) endRun(state, "The 60-day ledger closed.");
}

function recordMarketSnapshot(state: GameState) {
  for (const port of ports) {
    for (const good of goods) {
      appendMarketHistoryPrice(state.marketHistory, state.day, port.id, good.id, priceFor(state, port.id, good.id));
    }
  }
}

function maybeResolveWorldEvent(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver || state.day < 4 || state.day % 4 !== 0) return false;
  const event = drawWorldEvent(state);
  if (!event) return false;
  applyWorldEventResolution(state, event, "World event");
  return true;
}

function maybeResolveArrivalWorldEvent(state: GameState, voyage: Voyage, physics: RoutePhysicsProfile, projectedProfit: number) {
  if (state.voyage || state.encounter || state.gameOver) return false;
  const carriedCargo = cargoUnits(state);
  const meaningfulArrival = carriedCargo > 0 || Math.abs(projectedProfit) >= 80 || voyage.risk >= 0.2 || physics.pressure >= 0.48;
  if (!meaningfulArrival) return false;
  const cargoPressure = Math.min(0.18, carriedCargo * 0.008);
  const profitPressure = Math.min(0.16, Math.max(0, projectedProfit) / 1800);
  const waterPressure = Math.min(0.18, physics.pressure * 0.2 + physics.delayRisk * 0.5 + physics.cargoRisk * 0.42);
  const chance = clamp(0.16 + cargoPressure + profitPressure + waterPressure + voyage.risk * 0.16, 0.14, 0.62);
  if (Math.random() >= chance) return false;
  const event = drawArrivalWorldEvent(state, { voyage, physics, projectedProfit });
  if (!event) return false;
  applyWorldEventResolution(state, event, "Arrival event");
  return true;
}

function maybeResolveUnderwayWorldEvent(state: GameState, progress: number) {
  if (!state.voyage || state.encounter || state.gameOver) return false;
  const voyage = state.voyage;
  const event = drawUnderwayWorldEvent(state, {
    voyage,
    physics: routePhysicsProfile(state, voyage.fromId, voyage.toId),
    progress,
    watchEffect: voyage.watch?.effect ?? null,
  });
  if (!event) return false;
  applyWorldEventResolution(state, event, "Underway event");
  return true;
}

function applyWorldEventResolution(state: GameState, event: WorldEventResolution, prefix: string) {
  for (const effect of event.effects) applyWorldEventEffect(state, effect);
  state.events = state.events.filter((entry) => entry.expires >= state.day).slice(0, 6);
  state.politicalEvents = state.politicalEvents.filter((entry) => entry.expires >= state.day).slice(0, 8);
  addLog(state, `${prefix}: ${event.text}`);
}

function applyWorldEventEffect(state: GameState, effect: WorldEventEffect) {
  if (effect.kind === "rumor") {
    state.events.unshift(effect.event);
    return;
  }
  if (effect.kind === "political") {
    upsertPoliticalEvent(state, effect.event);
    return;
  }
  if (effect.kind === "stock") {
    adjustMarketStock(state, effect.portId, effect.goodId, effect.delta);
    return;
  }
  if (effect.kind === "standing") {
    bumpStanding(state, effect.factionId, effect.delta);
    return;
  }
  if (effect.kind === "cash") {
    state.cash = Math.max(0, state.cash + effect.amount);
    return;
  }
  if (effect.kind === "hull") {
    const stats = deriveShipStats(state);
    state.hull = clamp(state.hull + effect.amount, 0, stats.hullMax);
    return;
  }
  if (effect.kind === "morale") {
    adjustCrewMorale(state, effect.amount);
    return;
  }
  if (effect.kind === "voyageProgress") {
    if (state.voyage) state.voyage.progress = clamp(state.voyage.progress + effect.amount, 0, 1);
    return;
  }
  if (effect.kind === "captainXp") {
    grantCaptainXp(state, effect.amount, effect.source);
    return;
  }
  if (effect.kind === "crewXp") {
    grantCrewXp(state, effect.amount, effect.source);
  }
}

function arrive(state: GameState, portId: string) {
  const insuranceDestination = state.cargoInsurance?.destinationPortId;
  state.currentPort = portId;
  state.selectedPort = portId;
  state.tab = hasCompletableContract(state, portId) ? "contracts" : "market";
  state.pendingArrival = null;
  state.encounter = null;
  addLog(state, `Docked at ${portById(portId).name}.`);
  if (insuranceDestination === portId) {
    addLog(state, `Cargo policy closed at ${portById(portId).name}.`);
    state.cargoInsurance = null;
  }
  state.contracts = refreshContracts(state);
}

function repair(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const stats = deriveShipStats(state);
  const missing = stats.hullMax - state.hull;
  const points = Math.min(15, missing);
  const cost = repairCostFor(state);
  if (points <= 0 || state.cash < cost) return state;
  state.cash -= cost;
  state.hull = clamp(state.hull + points, 0, stats.hullMax);
  addLog(state, `Repaired ${points} hull for ${money(cost)}.`);
  return state;
}

function shoreLeave(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver || state.crew.length <= 0) return state;
  const cost = shoreLeaveCost(state);
  if (state.cash < cost || normalizeCrewMorale(state.crewMorale) >= 100) return state;
  state.cash -= cost;
  const facility = crewFacilityFor(state);
  adjustCrewMorale(state, 19 + state.crew.length * 2 + facility.moraleRecoveryBonus, `Shore leave restored crew morale to {morale}.`);
  const relieved = relieveCrewProfilesForShoreLeave(state);
  if (relieved > 0) addLog(state, `Shore leave settled ${relieved} crew demand${relieved === 1 ? "" : "s"}.`);
  advanceDay(state, 1);
  maybeResolveWorldEvent(state);
  return state;
}

function crewDrill(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver || state.crew.length <= 0) return state;
  const drill = crewFacilityDrillFor(state);
  if (!drill.available) return state;
  state.cash -= drill.cost;
  addLog(state, `${drill.label}: ${drill.detail}; ${money(drill.cost)}.`);
  grantCrewXp(state, drill.crewXp, drill.source);
  adjustCrewMorale(state, drill.morale, `${drill.label} lifted crew morale to {morale}.`);
  const relieved = relieveCrewProfilesForDrill(state, drill.strainRelief, drill.facilityId);
  if (relieved > 0) addLog(state, `${drill.label} settled ${relieved} strained crew profile${relieved === 1 ? "" : "s"}.`);
  advanceDay(state, 1);
  maybeResolveWorldEvent(state);
  return state;
}

function buyInsurance(state: GameState) {
  const quote = insuranceQuoteFor(state);
  if (!quote || state.cash < quote.policy.premium) return state;
  state.cash -= quote.policy.premium;
  state.cargoInsurance = quote.policy;
  bumpStanding(state, quote.policy.providerFactionId, 0.5);
  addLog(
    state,
    `Bought cargo policy to ${portById(quote.policy.destinationPortId).name}: ${money(quote.policy.premium)} premium, ${money(
      quote.policy.coveredValue
    )} covered.`
  );
  return state;
}

function buyShip(state: GameState, shipId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const ship = shipCatalog.find((entry) => entry.id === shipId);
  const preview = previewShip(state, shipId);
  if (!ship || !preview) return state;
  if (preview.active) return state;
  if (preview.owned) {
    const beforeStats = deriveShipStats(state);
    const beforeRoute = selectedRouteSnapshot(state);
    state.currentShip = ship.id;
    state.hull = clamp(state.hull, 0, preview.stats.hullMax);
    const afterStats = deriveShipStats(state);
    addLog(state, `Changed command to ${ship.name}. ${buildChangeSummary(beforeStats, afterStats, beforeRoute, selectedRouteSnapshot(state))}`);
    return state;
  }
  const price = yardPriceFor(state, ship);
  if (state.cash < price || !preview.cargoFits) return state;
  const beforeStats = deriveShipStats(state);
  const beforeRoute = selectedRouteSnapshot(state);
  state.cash -= price;
  state.ownedShips.push(ship.id);
  state.currentShip = ship.id;
  state.hull = preview.stats.hullMax;
  bumpStanding(state, portById(state.currentPort).faction, 1.5);
  const afterStats = deriveShipStats(state);
  addLog(state, `Bought ${ship.name} for ${money(price)}. ${buildChangeSummary(beforeStats, afterStats, beforeRoute, selectedRouteSnapshot(state))}`);
  return state;
}

function sellShip(state: GameState, shipId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const ship = shipCatalog.find((entry) => entry.id === shipId);
  if (!ship || ship.price <= 0 || ship.id === state.currentShip || !state.ownedShips.includes(ship.id)) return state;
  if (state.ownedShips.length <= 1) return state;
  const resale = yardResaleValueFor(state, ship);
  state.ownedShips = state.ownedShips.filter((id) => id !== ship.id);
  state.cash += resale;
  addLog(state, `Sold ${ship.name} for ${money(resale)}.`);
  return state;
}

function buyEquipment(state: GameState, equipmentId: string) {
  if (state.voyage || state.encounter || state.gameOver || state.equipment.includes(equipmentId)) return state;
  const item = equipmentCatalog.find((entry) => entry.id === equipmentId);
  if (!item) return state;
  const price = yardPriceFor(state, item);
  if (state.cash < price) return state;
  const replaced = equipmentInSlot(state, item.slot);
  const nextEquipment = installEquipmentIds(state.equipment, item);
  const previewStats = deriveShipStats({ ...state, equipment: nextEquipment });
  if (cargoUnits(state) > previewStats.cargoCap || state.crew.length > previewStats.crewCap) return state;
  const before = deriveShipStats(state);
  const beforeRoute = selectedRouteSnapshot(state);
  state.cash -= price;
  state.equipment = nextEquipment;
  const after = deriveShipStats(state);
  state.hull = clamp(state.hull + Math.max(0, after.hullMax - before.hullMax), 0, after.hullMax);
  const fit = equipmentFitBonusFor(state.currentShip, item);
  const fitText = fit ? ` Fit: ${fit.label}.` : "";
  const facilityText = item.slot === "quarters" ? ` Crew facility: ${crewFacilitySummary({ equipment: state.equipment })}.` : "";
  addLog(
    state,
    `${replaced ? `Replaced ${replaced.name} with ${item.name}` : `Installed ${item.name}`}. ${buildChangeSummary(
      before,
      after,
      beforeRoute,
      selectedRouteSnapshot(state)
    )}${fitText}${facilityText}`
  );
  return state;
}

function sellEquipment(state: GameState, equipmentId: string) {
  if (state.voyage || state.encounter || state.gameOver || !state.equipment.includes(equipmentId)) return state;
  const item = equipmentCatalog.find((entry) => entry.id === equipmentId);
  if (!item) return state;
  const nextEquipment = state.equipment.filter((id) => id !== item.id);
  const previewStats = deriveShipStats({ ...state, equipment: nextEquipment });
  if (cargoUnits(state) > previewStats.cargoCap || state.crew.length > previewStats.crewCap) return state;
  const resale = yardResaleValueFor(state, item);
  state.equipment = nextEquipment;
  state.cash += resale;
  state.hull = clamp(state.hull, 0, previewStats.hullMax);
  addLog(state, `Sold ${item.name} for ${money(resale)}.`);
  return state;
}

function hireCrew(state: GameState, crewId: string) {
  if (state.voyage || state.encounter || state.gameOver || state.crew.includes(crewId)) return state;
  const crew = crewCatalog.find((entry) => entry.id === crewId);
  if (!crew) return state;
  const stats = deriveShipStats(state);
  if (state.cash < crew.cost || state.crew.length >= stats.crewCap) return state;
  state.cash -= crew.cost;
  state.crew.push(crew.id);
  state.crewXp ??= {};
  state.crewXp[crew.id] ??= 0;
  state.crewTraits ??= {};
  state.crewTraits[crew.id] ??= [];
  state.crewProfiles ??= {};
  state.crewProfiles[crew.id] = crewProfileFor(state, crew.id);
  adjustCrewMorale(state, 4);
  addLog(state, `Hired ${crew.name}. Payroll +${money(crew.wage)} weekly; ${crewProfileFor(state, crew.id).preference.replace("_", " ")} preference.`);
  return state;
}

function dismissCrew(state: GameState, crewId: string) {
  if (state.voyage || state.encounter || state.gameOver || !state.crew.includes(crewId)) return state;
  const crew = crewCatalog.find((entry) => entry.id === crewId);
  if (!crew) return state;
  const xp = state.crewXp?.[crewId] ?? 0;
  const rank = crewRankFor(xp);
  const cost = crewDismissalCost(state, crewId);
  if (state.cash < cost) return state;

  state.cash -= cost;
  state.crew = state.crew.filter((id) => id !== crewId);
  delete state.crewXp[crewId];
  const traits = crewTraitsFor(state, crewId);
  const profile = crewProfileFor(state, crewId);
  delete state.crewTraits[crewId];
  delete state.crewProfiles[crewId];
  const moralePenalty = crewDismissalMoralePenalty(xp, traits, profile);
  if (state.crew.length) state.crewMorale = normalizeCrewMorale(state.crewMorale - moralePenalty);
  addLog(state, `Dismissed ${rank.label} ${crew.name}; severance ${money(cost)}${state.crew.length ? `, morale -${moralePenalty}` : ""}.`);
  return state;
}

function relieveCrewProfilesForDrill(state: GameState, strainRelief: number, facilityId: ReturnType<typeof crewFacilityFor>["id"]) {
  if (!state.crew.length || strainRelief <= 0) return 0;
  state.crewProfiles ??= {};
  let relieved = 0;
  for (const crewId of state.crew) {
    const profile = crewProfileFor(state, crewId);
    const nextStrain = clamp(profile.strain - strainRelief, 0, 100);
    const next = {
      ...profile,
      loyalty: clamp(profile.loyalty + (facilityId === "galley_mess" ? 2 : 1), 0, 100),
      strain: nextStrain,
    };
    const drillSettlesDemand =
      nextStrain <= 44 &&
      (next.demand === "safer_orders" || next.demand === "action" || (facilityId === "galley_mess" && next.demand === "shore_leave"));
    if (drillSettlesDemand) {
      delete next.demand;
      delete next.demandExpires;
    }
    if (nextStrain !== profile.strain || next.loyalty !== profile.loyalty || next.demand !== profile.demand) relieved += 1;
    state.crewProfiles[crewId] = next;
  }
  return relieved;
}

function payCrewWages(state: GameState) {
  const wage = crewWeeklyWage(state);
  if (wage <= 0) return;
  const paid = Math.min(state.cash, wage);
  const shortfall = wage - paid;
  state.cash -= paid;
  if (shortfall > 0) {
    const credit = Math.ceil(shortfall * crewCreditPremium);
    state.debt += credit;
    adjustCrewMorale(state, -12);
    addLog(state, `Crew payday: paid ${money(paid)}, financed ${money(credit)}.`);
  } else {
    adjustCrewMorale(state, 5 + crewFacilityFor(state).paydayMoraleBonus);
    addLog(state, `Crew payday: paid ${money(wage)}.`);
  }
}

function trainSkill(state: GameState, skillId: CaptainSkillId) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const skill = captainSkillCatalog.find((entry) => entry.id === skillId);
  if (!skill) return state;
  const current = state.captainSkills[skillId] ?? 0;
  if (current >= captainSkillLimit) return state;
  const cost = skillTrainingCost(current);
  if (state.skillPoints < cost) return state;
  const beforeStats = deriveShipStats(state);
  const beforeRoute = selectedRouteSnapshot(state);
  state.skillPoints -= cost;
  state.captainSkills[skillId] = current + 1;
  const afterStats = deriveShipStats(state);
  const mastery = hasCaptainSkillMastery(state, skillId) ? captainSkillMasteryFor(skillId) : null;
  addLog(
    state,
    `Trained ${skill.name} to level ${current + 1}${mastery ? `; ${mastery.label} online` : ""}. ${buildChangeSummary(beforeStats, afterStats, beforeRoute, selectedRouteSnapshot(state))}`
  );
  return state;
}

function acceptContract(state: GameState, contractId: string, source: "board" | "route" = "board") {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const activeCount = state.contracts.filter((contract) => contract.status === "active").length;
  if (activeCount >= 4) return state;
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract || contract.status !== "available" || contract.originPortId !== state.currentPort) return state;
  contract.status = "active";
  contract.acceptedDay = state.day;
  state.selectedPort = nextContractStop(contract)?.portId ?? contract.destinationPortId;
  if (source !== "route") state.tab = "contracts";
  bumpStanding(state, contract.factionId, 0.4);
  const summary = contractSummary(contract);
  addLog(state, `Accepted ${contractKindLabel(contract)} ${summary.factionName} contract: ${contract.units} ${summary.goodName} to ${summary.destinationName}.`);
  return state;
}

function completeContract(state: GameState, contractId: string) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract || contract.status !== "active") return state;
  const stop = currentContractStop(state, contract);
  if (!stop) return state;
  const held = state.cargo[stop.goodId] || 0;
  if (held <= 0) return state;
  const missing = Math.max(0, stop.units - stop.delivered);
  const delivered = Math.min(held, missing);
  if (delivered <= 0) return state;
  state.cargo[stop.goodId] -= delivered;
  if (state.cargo[stop.goodId] <= 0) {
    delete state.cargo[stop.goodId];
    delete state.cargoBasis[stop.goodId];
  }

  recordContractDelivery(contract, stop.portId, stop.goodId, delivered);
  const totalUnits = contractTotalUnits(contract);
  const alreadyPaid = contract.paidReward ?? 0;
  const proportionalReward = Math.round(contract.reward * (delivered / Math.max(1, totalUnits)));
  const payout = Math.min(Math.max(0, contract.reward - alreadyPaid), proportionalReward);
  state.cash += payout;
  contract.paidReward = alreadyPaid + payout;

  const completed = contractDeliveredUnits(contract) >= totalUnits;
  if (completed) {
    const finalPayout = Math.max(0, contract.reward - (contract.paidReward ?? 0));
    if (finalPayout > 0) {
      state.cash += finalPayout;
      contract.paidReward = (contract.paidReward ?? 0) + finalPayout;
    }
    contract.status = "completed";
    contract.completedDay = state.day;
  }

  bumpStanding(state, contract.factionId, completed ? 3 + totalUnits * 0.25 : 0.8 + delivered * 0.18);
  if (completed) applyContractChainCompletion(state, contract);
  const summary = contractSummary(contract);
  const stopPort = portById(stop.portId).name;
  addLog(
    state,
    completed
      ? `Completed ${contractKindLabel(contract)} contract for ${summary.factionName}; earned ${money(contract.reward)}.`
      : `Partial delivery for ${summary.factionName}: ${delivered} ${goodName(stop.goodId)} at ${stopPort}, paid ${money(payout)}.`
  );
  grantCaptainXp(state, contractXpFor(payout || contract.reward, delivered, contract.deadline - state.day), "Contract work");
  grantCrewXp(state, 10 + delivered * 3, "Contract work");
  if (!completed) state.selectedPort = nextContractStop(contract)?.portId ?? contract.destinationPortId;
  if (completed) addContractChainFollowUp(state, contract);
  state.contracts = refreshContracts(state);
  return state;
}

function recordContractDelivery(contract: Contract, portId: string, goodId: string, delivered: number) {
  if (contract.stops?.length) {
    const stop = contract.stops.find((entry) => entry.portId === portId && entry.goodId === goodId && entry.delivered < entry.units);
    if (stop) stop.delivered = clamp((stop.delivered ?? 0) + delivered, 0, stop.units);
    return;
  }
  contract.deliveredUnits = clamp((contract.deliveredUnits ?? 0) + delivered, 0, contract.units);
}

function applyContractChainCompletion(state: GameState, contract: Contract) {
  if (!contract.chain) return;
  const bonus = contract.chain.rewardCash ?? 0;
  if (bonus > 0) state.cash += bonus;
  if (contract.chain.standingReward) bumpStanding(state, contract.factionId, contract.chain.standingReward);
  const politicalReward = contractChainPoliticalReward(contract);
  if (politicalReward) {
    upsertPoliticalEvent(state, {
      id: uid("chain-policy"),
      factionId: contract.factionId,
      kind: politicalReward.kind,
      riskModifier: politicalReward.riskModifier,
      priceModifier: politicalReward.priceModifier,
      expires: state.day + 8,
      text: politicalReward.text,
    });
  }
  const rewardText = [contract.chain.rareReward, bonus ? money(bonus) : ""].filter(Boolean).join(" + ");
  addLog(state, `${contract.chain.giver}: ${contract.chain.successText}${rewardText ? ` Reward: ${rewardText}.` : ""}`);
}

function addContractChainFollowUp(state: GameState, contract: Contract) {
  if (!contract.chain || contract.chain.stage >= contract.chain.stages) return;
  const followUp = createNextContractChainOffer(state, state.currentPort, contract.chain.id);
  if (!followUp) return;
  state.contracts = [followUp, ...state.contracts.filter((entry) => entry.id !== followUp.id)].slice(0, 30);
  addLog(state, `${followUp.chain?.giver ?? "Contract giver"} posted the next ${followUp.chain?.title ?? "chain"} stage at ${portById(followUp.originPortId).name}.`);
}

function goodName(goodId: string) {
  return goods.find((good) => good.id === goodId)?.name ?? goodId;
}

function requestConvoy(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const port = portById(state.currentPort);
  const faction = factions.find((entry) => entry.id === port.faction);
  const standing = state.factionStanding[port.faction] ?? 0;
  const cost = politicalActionCost(politicalActionCosts.convoyCash, standing, "convoy");
  if (!faction || state.cash < cost || standing < politicalActionCosts.convoyMinimumStanding) return state;

  state.cash -= cost;
  bumpStanding(state, port.faction, -politicalActionCosts.convoyStanding);
  upsertPoliticalEvent(state, {
    id: uid("politics"),
    factionId: port.faction,
    kind: "convoy",
    riskModifier: -0.12,
    priceModifier: 0.99,
    expires: state.day + 6,
    text: `${faction.name} convoy writ posted from ${port.name}.`,
  });
  state.tab = "intel";
  addLog(state, `Posted a ${faction.name} convoy writ for ${money(cost)}.`);
  return state;
}

function buyMarketPermit(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const port = portById(state.currentPort);
  const faction = factions.find((entry) => entry.id === port.faction);
  const standing = state.factionStanding[port.faction] ?? 0;
  const baseCost = politicalActionCost(politicalActionCosts.permitCash, standing, "permit");
  const cost = state.equipment.includes("customs_ledger") ? Math.max(20, Math.round((baseCost * 0.84) / 10) * 10) : baseCost;
  if (!faction || state.cash < cost) return state;

  state.cash -= cost;
  bumpStanding(state, port.faction, state.equipment.includes("customs_ledger") ? 1.45 : 1.1);
  upsertPoliticalEvent(state, {
    id: uid("politics"),
    factionId: port.faction,
    kind: "permit",
    riskModifier: 0,
    priceModifier: 0.92,
    expires: state.day + 7,
    text: `${faction.name} honored a market permit at its harbors.`,
  });
  state.tab = "intel";
  addLog(state, `Bought ${faction.name} market permit for ${money(cost)}${state.equipment.includes("customs_ledger") ? "; Customs Ledger found the favorable clause" : ""}.`);
  return state;
}

function callFactionFavor(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const quote = factionFavorQuoteFor(state);
  if (!quote?.available) return state;
  const port = portById(state.currentPort);

  state.cash -= quote.cost;
  bumpStanding(state, quote.factionId, -quote.standingCost);

  if (quote.kind === "ledger_credit") {
    state.cash += 520;
    state.debt += 540;
    addLog(state, `${quote.factionName} favor: ${quote.label} advanced $520; debt +$540, standing -${quote.standingCost.toFixed(1)}.`);
  } else if (quote.kind === "tide_runner_writ") {
    upsertPoliticalEvent(state, {
      id: uid("politics"),
      factionId: quote.factionId,
      kind: "convoy",
      riskModifier: -0.08,
      priceModifier: 0.95,
      expires: state.day + 5,
      text: `${quote.factionName} tide runners opened fast water from ${port.name}.`,
    });
    addLog(state, `${quote.factionName} favor: ${quote.label} opened fast water; standing -${quote.standingCost.toFixed(1)}.`);
  } else if (quote.kind === "patrol_cover") {
    upsertPoliticalEvent(state, {
      id: uid("politics"),
      factionId: quote.factionId,
      kind: "convoy",
      riskModifier: -0.18,
      priceModifier: 1,
      expires: state.day + 6,
      text: `${quote.factionName} patrol cover posted from ${port.name}.`,
    });
    addLog(state, `${quote.factionName} favor: ${quote.label} posted patrol cover; standing -${quote.standingCost.toFixed(1)}.`);
  } else if (quote.kind === "stevedore_shift") {
    const restocked = port.exports.map((goodId) => {
      const before = state.marketStock[port.id]?.[goodId] ?? 0;
      const after = adjustMarketStock(state, port.id, goodId, 8);
      return `${goodName(goodId)} +${Math.max(0, after - before)}`;
    });
    upsertPoliticalEvent(state, {
      id: uid("politics"),
      factionId: quote.factionId,
      kind: "permit",
      riskModifier: -0.02,
      priceModifier: 0.94,
      expires: state.day + 4,
      text: `${quote.factionName} stevedores pulled stock forward at ${port.name}.`,
    });
    addLog(state, `${quote.factionName} favor: ${quote.label} restocked ${restocked.join(", ")}; standing -${quote.standingCost.toFixed(1)}.`);
  }

  state.tab = "intel";
  return state;
}

function commissionBrokerPacket(state: GameState) {
  if (state.voyage || state.encounter || state.gameOver) return state;
  const quote = brokerPacketQuoteFor(state);
  if (!quote || state.cash < quote.cost) return state;
  const good = goods.find((entry) => entry.id === quote.goodId);
  const port = portById(quote.portId);

  state.cash -= quote.cost;
  state.events = [
    {
      id: uid("rumor"),
      portId: quote.portId,
      goodId: quote.goodId,
      multiplier: quote.rumorMultiplier,
      expires: quote.expires,
      kind: quote.rumorKind,
    },
    ...state.events.filter((event) => !(event.portId === quote.portId && event.goodId === quote.goodId)),
  ].slice(0, 6);
  adjustMarketStock(state, quote.portId, quote.goodId, quote.stockDelta);
  bumpStanding(state, port.faction, 0.45);
  state.tab = "intel";
  addLog(state, `${quote.label} commissioned for ${money(quote.cost)}; ${port.name} ${good?.name ?? quote.goodId} ${quote.rumorKind} runs to day ${quote.expires}.`);
  return state;
}

function openCustomsInspection(state: GameState, portId: string) {
  const profile = customsProfileFor(state, portId);
  if (!profile || Math.random() >= profile.chance) return false;
  const port = portById(portId);
  const faction = factions.find((entry) => entry.id === profile.factionId);
  state.pendingArrival = portId;
  state.encounter = {
    kind: "inspection",
    name: `${faction?.name ?? "Harbor"} Customs`,
    strength: profile.strength,
    bribe: profile.bribe,
    bounty: 0,
    portName: port.name,
    factionId: profile.factionId,
    fine: profile.fine,
    suspectGoodId: profile.suspectGoodId,
    seizedUnits: profile.seizedUnits,
  };
  addLog(state, `${faction?.name ?? "Harbor"} customs hailed the ship outside ${port.name}.`);
  return true;
}

function customsProfileFor(state: GameState, portId: string) {
  const port = portById(portId);
  const faction = factions.find((entry) => entry.id === port.faction);
  if (!faction) return null;

  const tariffCargo = faction.tariffGoods
    .map((goodId) => {
      const quantity = state.cargo[goodId] || 0;
      const value = quantity * sellPriceFor(state, portId, goodId);
      return { goodId, quantity, value };
    })
    .filter((entry) => entry.quantity > 0);
  const inspectionEvent = state.politicalEvents.some(
    (event) => event.factionId === faction.id && event.kind === "inspection" && event.expires >= state.day
  );
  const smugglingContracts = state.contracts.filter((contract) => {
    if (contract.status !== "active" || contract.kind !== "smuggling") return false;
    return contract.destinationPortId === portId || contractStops(contract).some((stop) => stop.portId === portId && stop.delivered < stop.units);
  });
  if (!tariffCargo.length && !inspectionEvent && !smugglingContracts.length) return null;

  const stats = deriveShipStats(state);
  const standing = state.factionStanding[faction.id] ?? 0;
  const tariffUnits = tariffCargo.reduce((sum, entry) => sum + entry.quantity, 0);
  const tariffValue = tariffCargo.reduce((sum, entry) => sum + entry.value, 0);
  const smugglingPressure = smugglingContracts.reduce((sum, contract) => sum + (contract.inspectionRisk ?? 0.16), 0);
  const smugglingFine = smugglingContracts.reduce((sum, contract) => sum + (contract.smugglingFine ?? Math.round(contract.penalty * 1.25)), 0);
  const smugglingCargo = smugglingContracts
    .flatMap((contract) => contractStops(contract).filter((stop) => (state.cargo[stop.goodId] || 0) > 0))
    .map((stop) => ({
      goodId: stop.goodId,
      quantity: state.cargo[stop.goodId] || 0,
      value: (state.cargo[stop.goodId] || 0) * sellPriceFor(state, portId, stop.goodId),
    }));
  const suspect = [...smugglingCargo, ...tariffCargo].sort((left, right) => right.value - left.value)[0];
  const hasPermit = hasMarketPermit(state, faction.id);
  const authorityInspection = inspectionChanceModifier(standing, hasPermit);
  const smugglerRelief = state.equipment.includes("smuggler_locker") ? 0.12 : 0;
  const customsLedgerRelief = state.equipment.includes("customs_ledger") ? 0.08 : 0;
  const postureInspection = sailPlanFor(state.voyage?.sailPlan ?? state.sailPlan).customsModifier;
  const chance = clamp(
    0.08 +
      tariffUnits * 0.035 +
      (inspectionEvent ? 0.22 : 0) +
      smugglingPressure +
      authorityInspection -
      stats.negotiation * 0.015 -
      smugglerRelief -
      customsLedgerRelief +
      postureInspection,
    0,
    0.62
  );
  const fineModifier = clamp((hasPermit ? 0.68 : 1) * (state.equipment.includes("customs_ledger") ? 0.84 : 1) * (1 - standing * 0.006), 0.54, 1.24);
  const fine = Math.max(35, Math.round((tariffValue * 0.2 + tariffUnits * 24 + smugglingFine * 0.3 + (inspectionEvent ? 35 : 0)) * fineModifier));
  const strength = Math.round(38 + chance * 120 + Math.max(0, -standing) * 1.5 + state.day * 0.7);
  const bribe = Math.max(40, Math.round(fine * 0.72 + strength * (1.6 - stats.negotiation * 0.045)));

  return {
    factionId: faction.id,
    chance,
    strength,
    fine,
    bribe,
    suspectGoodId: suspect?.goodId,
    seizedUnits: suspect ? Math.min(suspect.quantity, Math.max(1, Math.ceil(tariffUnits * 0.35))) : 0,
  };
}

function presentPermit(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  if (!hasMarketPermit(state, state.encounter.factionId)) return state;
  const ledger = state.equipment.includes("customs_ledger");
  bumpStanding(state, state.encounter.factionId, ledger ? 1.1 : 0.8);
  addLog(state, `${factionName(state.encounter.factionId)} permit cleared customs at ${state.encounter.portName}${ledger ? "; Customs Ledger matched the dock clause" : ""}.`);
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function submitInspection(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const fine = state.encounter.fine ?? 0;
  payFine(state, fine);
  bumpStanding(state, state.encounter.factionId, 0.6);
  addLog(state, `Submitted to ${factionName(state.encounter.factionId)} customs; fine ${money(fine)}.`);
  arrive(state, state.pendingArrival ?? state.currentPort);
  postRecoveryContract(state, "customs");
  return state;
}

function fileCustomsManifest(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const read = customsActionReadFor(state);
  if (!read) return state;
  payFine(state, read.manifestCost);
  bumpStanding(state, state.encounter.factionId, read.manifestStandingGain);
  addLog(
    state,
    `Filed clean ${factionName(state.encounter.factionId)} papers at ${state.encounter.portName}; manifest fees ${money(read.manifestCost)}${read.hasLedger ? ", ledger clause accepted" : ""}.`
  );
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function surrenderCustomsCargo(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const read = customsActionReadFor(state);
  if (!read?.cargoCandidate) return state;
  payFine(state, read.cargoBondFee);
  const surrendered = seizeCustomsCargo(state, state.encounter.factionId, read.cargoCandidate.goodId, read.cargoCandidate.units);
  bumpStanding(state, state.encounter.factionId, 0.25);
  addLog(
    state,
    `Bonded suspect cargo for ${factionName(state.encounter.factionId)} customs; surrendered ${surrendered}, fees ${money(read.cargoBondFee)}.`
  );
  arrive(state, state.pendingArrival ?? state.currentPort);
  postRecoveryContract(state, "customs");
  return state;
}

function callCustomsFavor(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const read = customsActionReadFor(state);
  if (!read?.favorAvailable) return state;
  payFine(state, read.favorFee);
  bumpStanding(state, state.encounter.factionId, -read.favorStandingCost);
  addLog(
    state,
    `Called in a ${factionName(state.encounter.factionId)} quay favor at ${state.encounter.portName}; standing -${read.favorStandingCost.toFixed(1)}, fees ${money(read.favorFee)}.`
  );
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function bribeInspection(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const cost = Math.min(state.cash, state.encounter.bribe);
  state.cash -= cost;
  bumpStanding(state, state.encounter.factionId, -2.2);
  addLog(state, `Paid ${money(cost)} to make ${factionName(state.encounter.factionId)} customs look away.`);
  arrive(state, state.pendingArrival ?? state.currentPort);
  postRecoveryContract(state, "customs");
  return state;
}

function evadeInspection(state: GameState) {
  if (state.encounter?.kind !== "inspection" || !state.encounter.factionId) return state;
  const stats = deriveShipStats(state);
  const escapeChance = clamp(
    0.26 +
      stats.speed * 0.09 +
      stats.navigation * 0.035 +
      (state.equipment.includes("smuggler_locker") ? 0.18 : 0) +
      (state.equipment.includes("customs_ledger") ? 0.08 : 0) -
      state.encounter.strength * 0.002,
    0.12,
    0.78
  );
  if (Math.random() < escapeChance) {
    bumpStanding(state, state.encounter.factionId, -1.4);
    addLog(state, `Evaded ${factionName(state.encounter.factionId)} customs before docking.`);
  } else {
    const fine = Math.round((state.encounter.fine ?? 45) * 1.55 + state.encounter.strength * 0.9);
    const seized = seizeCustomsCargo(state, state.encounter.factionId, state.encounter.suspectGoodId, state.encounter.seizedUnits ?? 1);
    payFine(state, fine);
    bumpStanding(state, state.encounter.factionId, -4.2);
    addLog(state, `Failed customs evasion: fine ${money(fine)}${seized ? `, seized ${seized}` : ""}.`);
    arrive(state, state.pendingArrival ?? state.currentPort);
    postRecoveryContract(state, "customs");
    return state;
  }
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function fightPirates(state: GameState) {
  if (!state.encounter || state.encounter.kind !== "pirate") return state;
  const enc = state.encounter;
  const stats = deriveShipStats(state);
  const gunDrill = hasCaptainSkillMastery(state, "gunnery");
  const player = stats.cannons * 34 + state.hull * 0.5 + stats.openWater * 4 + (gunDrill ? 16 : 0) + randomBetween(0, 40);
  const pirate = enc.strength + randomBetween(0, 34);
  if (player >= pirate) {
    const damage = Math.max(1, Math.round((randomBetween(8, 22) + enc.strength * 0.08) * (gunDrill ? 0.82 : 1)));
    state.hull = clamp(state.hull - damage, 0, stats.hullMax);
    state.cash += enc.bounty;
    bumpStanding(state, "admiralty", 2);
    addLog(state, `Defeated ${enc.name}; claimed ${money(enc.bounty)}${gunDrill ? "; Gun Drill kept the broadsides orderly" : ""}.`);
    adjustCrewMorale(state, 7);
    grantCaptainXp(state, battleXpFor(enc.strength, true), "Battle experience");
    grantCrewXp(state, 18 + Math.round(enc.strength * 0.1), "Battle stations");
  } else {
    const damage = Math.max(1, Math.round((randomBetween(22, 42) + enc.strength * 0.12) * (gunDrill ? 0.88 : 1)));
    const loss = Math.min(state.cash, Math.round(enc.bounty * 0.44));
    state.hull = clamp(state.hull - damage, 0, stats.hullMax);
    state.cash -= loss;
    settleCargoInsuranceClaim(state, loseRandomCargo(state));
    addLog(state, `${enc.name} mauled the ship. Lost ${money(loss)}.`);
    adjustCrewMorale(state, -13);
    grantCaptainXp(state, battleXpFor(enc.strength, false), "Hard lesson");
    grantCrewXp(state, 10 + Math.round(enc.strength * 0.06), "Battle stations");
    maybeLoseCrew(state, "pirate battle", 0.1 + enc.strength * 0.0012);
    if (state.hull > 0) {
      arrive(state, state.pendingArrival ?? state.currentPort);
      postRecoveryContract(state, "pirate");
      return state;
    }
  }
  if (state.hull <= 0) return endRun(state, "The ship was lost at sea.");
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function warnPirates(state: GameState) {
  if (!state.encounter || state.encounter.kind !== "pirate") return state;
  const enc = state.encounter;
  const stats = deriveShipStats(state);
  const read = pirateTacticalReadFor(state);
  const chance = read?.warnChance ?? 0.18;
  let escortFollowUp = false;
  if (Math.random() < chance) {
    const patrolBounty = Math.max(35, Math.round(enc.bounty * 0.34));
    const wear = Math.max(1, Math.round(randomBetween(2, 8) + enc.strength * 0.018));
    state.hull = clamp(state.hull - wear, 0, stats.hullMax);
    state.cash += patrolBounty;
    bumpStanding(state, "admiralty", read?.escortDuty ? 1.8 : 1.2);
    adjustCrewMorale(state, 4);
    addLog(state, `Warned off ${enc.name}; claimed ${money(patrolBounty)} patrol bounty${read?.escortDuty ? " and kept escort papers clean" : ""}.`);
    grantCaptainXp(state, Math.round(16 + enc.strength * 0.16), "Show of force");
    grantCrewXp(state, 12 + Math.round(enc.strength * 0.06), "Gun drill");
    escortFollowUp = Boolean(read?.escortDuty);
  } else {
    const damage = Math.round(randomBetween(12, 26) + enc.strength * 0.075);
    const loss = Math.min(state.cash, Math.round(enc.bribe * 0.42));
    state.hull = clamp(state.hull - damage, 0, stats.hullMax);
    state.cash -= loss;
    if (Math.random() < 0.45) settleCargoInsuranceClaim(state, loseRandomCargo(state));
    bumpStanding(state, "admiralty", -0.4);
    adjustCrewMorale(state, -7);
    addLog(state, `${enc.name} called the bluff. Lost ${money(loss)} in the scramble.`);
    grantCaptainXp(state, Math.round(10 + enc.strength * 0.1), "Failed warning");
    grantCrewXp(state, 8 + Math.round(enc.strength * 0.04), "Gun drill");
    maybeLoseCrew(state, "failed warning shot", 0.05 + enc.strength * 0.0006);
    if (state.hull > 0) {
      arrive(state, state.pendingArrival ?? state.currentPort);
      postRecoveryContract(state, "pirate");
      return state;
    }
  }
  if (state.hull <= 0) return endRun(state, "The ship was lost under pirate guns.");
  arrive(state, state.pendingArrival ?? state.currentPort);
  if (escortFollowUp) {
    addLog(state, "Escort papers turned the pirate hail into follow-up patrol work.");
    postRecoveryContract(state, "pirate");
  }
  return state;
}

function parleyPirates(state: GameState) {
  if (!state.encounter || state.encounter.kind !== "pirate") return state;
  const enc = state.encounter;
  const read = pirateTacticalReadFor(state);
  const ask = read?.parleyCost ?? Math.max(20, Math.round(enc.bribe * 0.62));
  const paid = Math.min(state.cash, ask);
  state.cash -= paid;
  if (Math.random() < (read?.parleyChance ?? 0.2)) {
    bumpStanding(state, "freeports", 0.55);
    adjustCrewMorale(state, -1);
    addLog(state, `Parleyed with ${enc.name}; paid ${money(paid)} for black-flag passage.`);
    grantCaptainXp(state, Math.round(14 + enc.strength * 0.08), "Pirate parley");
    arrive(state, state.pendingArrival ?? state.currentPort);
    return state;
  }

  const extra = Math.min(state.cash, Math.round(enc.bribe * 0.22));
  state.cash -= extra;
  const loss = loseRandomCargo(state);
  bumpStanding(state, "admiralty", -0.8);
  adjustCrewMorale(state, -6);
  addLog(state, `${enc.name} soured on the parley. Extra ${money(extra)} paid${loss ? ", cargo taken" : ""}.`);
  grantCaptainXp(state, Math.round(8 + enc.strength * 0.06), "Failed pirate parley");
  if (state.hull <= 0) return endRun(state, "The ship was lost under pirate guns.");
  arrive(state, state.pendingArrival ?? state.currentPort);
  postRecoveryContract(state, "pirate");
  return state;
}

function bribePirates(state: GameState) {
  if (!state.encounter) return state;
  if (state.encounter.kind === "inspection") return bribeInspection(state);
  if (state.encounter.kind !== "pirate") return state;
  const cost = Math.min(state.cash, state.encounter.bribe);
  state.cash -= cost;
  bumpStanding(state, "admiralty", -1);
  adjustCrewMorale(state, -4);
  addLog(state, `Paid ${money(cost)} to pass under black flags.`);
  arrive(state, state.pendingArrival ?? state.currentPort);
  postRecoveryContract(state, "pirate");
  return state;
}

function runPirates(state: GameState) {
  if (!state.encounter) return state;
  if (state.encounter.kind === "inspection") return evadeInspection(state);
  if (state.encounter.kind !== "pirate") return state;
  const stats = deriveShipStats(state);
  const escapeChance = clamp(0.34 + stats.speed * 0.14 + state.hull * 0.003 - state.encounter.strength * 0.002, 0.12, 0.84);
  if (Math.random() < escapeChance) {
    state.hull = clamp(state.hull - Math.round(randomBetween(4, 13)), 0, stats.hullMax);
    addLog(state, "Outran the pirates by burning canvas.");
    adjustCrewMorale(state, 3);
    grantCaptainXp(state, Math.round(18 + state.encounter.strength * 0.18), "Clean escape");
    grantCrewXp(state, 10 + Math.round(state.encounter.strength * 0.05), "Clean escape");
    if (escapeChance >= 0.58 || stats.speed >= 3) {
      adjustCrewMorale(state, 2);
      grantCaptainXp(state, 8, "Fast-water escape");
      addLog(state, "Fast-water escape mapped a clean wake for future hard exits.");
    }
  } else {
    state.hull = clamp(state.hull - Math.round(randomBetween(18, 34)), 0, stats.hullMax);
    settleCargoInsuranceClaim(state, loseRandomCargo(state));
    addLog(state, "Failed to flee cleanly. Cargo went overboard.");
    adjustCrewMorale(state, -8);
    grantCaptainXp(state, Math.round(10 + state.encounter.strength * 0.12), "Hard escape");
    grantCrewXp(state, 8 + Math.round(state.encounter.strength * 0.04), "Hard escape");
    maybeLoseCrew(state, "failed escape", 0.08 + state.encounter.strength * 0.0009);
    if (state.hull > 0) {
      arrive(state, state.pendingArrival ?? state.currentPort);
      postRecoveryContract(state, "pirate");
      return state;
    }
  }
  if (state.hull <= 0) return endRun(state, "The ship broke during the escape.");
  arrive(state, state.pendingArrival ?? state.currentPort);
  return state;
}

function postRecoveryContract(state: GameState, source: NonNullable<Contract["recoverySource"]>, portId = state.currentPort) {
  const contract = createRecoveryContract(state, source, portId);
  if (!contract) return null;
  state.contracts = [contract, ...state.contracts.filter((entry) => entry.id !== contract.id)].slice(0, 30);
  if (state.currentPort === portId) state.tab = "contracts";
  addLog(state, `Recovery offer posted at ${portById(portId).name}: ${contract.brief ?? "a short comeback job"}`);
  return contract;
}

function loseRandomCargo(state: GameState): CargoLoss | null {
  const carried = goods.filter((good) => (state.cargo[good.id] || 0) > 0);
  if (!carried.length) return null;
  const good = pick(carried);
  const amount = Math.min(state.cargo[good.id], Math.ceil(randomBetween(1, 3)));
  const value = amount * Math.max(1, state.cargoBasis[good.id] ?? sellPriceFor(state, state.currentPort, good.id));
  state.cargo[good.id] -= amount;
  if (state.cargo[good.id] <= 0) {
    delete state.cargo[good.id];
    delete state.cargoBasis[good.id];
  }
  addLog(state, `Lost ${amount} ${good.name}.`);
  return { goodId: good.id, amount, value };
}

function maybeLoseCrew(state: GameState, source: string, baseChance: number) {
  if (!state.crew.length) return false;
  const chance = clamp(baseChance - crewCasualtyProtection(state), 0, 0.38);
  if (Math.random() >= chance) return false;
  const crewId = pick(state.crew);
  loseCrewMember(state, crewId, source);
  return true;
}

function loseCrewMember(state: GameState, crewId: string, source: string) {
  const crew = crewCatalog.find((entry) => entry.id === crewId);
  if (!crew || !state.crew.includes(crewId)) return;
  const xp = state.crewXp?.[crewId] ?? 0;
  const rank = crewRankFor(xp);
  const specialty = crewSpecialtyFor(crewId, xp);
  const wage = crewWageFor(crewId, xp);
  state.crew = state.crew.filter((id) => id !== crewId);
  delete state.crewXp[crewId];
  const traits = crewTraitsFor(state, crewId);
  const profile = crewProfileFor(state, crewId);
  delete state.crewTraits[crewId];
  delete state.crewProfiles[crewId];
  const moralePenalty = crewDismissalMoralePenalty(xp, traits, profile) + 5;
  if (state.crew.length) state.crewMorale = normalizeCrewMorale(state.crewMorale - moralePenalty);
  addLog(state, `${rank.label} ${crew.name} lost after ${source}; ${specialty.label} gone, payroll -${money(wage)}/wk.`);
}

function settleCargoInsuranceClaim(state: GameState, loss: CargoLoss | null) {
  const policy = state.cargoInsurance;
  if (!policy || !loss) return;
  const destination = state.pendingArrival ?? state.voyage?.toId ?? state.currentPort;
  if (policy.destinationPortId !== destination || policy.expiresDay < state.day) return;
  const payout = Math.min(policy.remainingCoverage, Math.round(loss.value * (1 - policy.deductibleRate)));
  if (payout <= 0) return;
  state.cash += payout;
  policy.remainingCoverage = Math.max(0, policy.remainingCoverage - payout);
  addLog(state, `Cargo policy paid ${money(payout)} on lost freight.`);
  if (policy.remainingCoverage <= 0) state.cargoInsurance = null;
}

function expireCargoInsurance(state: GameState) {
  if (!state.cargoInsurance || state.cargoInsurance.expiresDay >= state.day) return;
  addLog(state, `Cargo policy to ${portById(state.cargoInsurance.destinationPortId).name} expired.`);
  state.cargoInsurance = null;
}

function seizeCustomsCargo(state: GameState, factionId: string, preferredGoodId?: string, units = 1) {
  const faction = factions.find((entry) => entry.id === factionId);
  if (!faction) return "";
  const candidates = [preferredGoodId, ...faction.tariffGoods]
    .filter((goodId): goodId is string => Boolean(goodId))
    .filter((goodId, index, source) => source.indexOf(goodId) === index)
    .filter((goodId) => (state.cargo[goodId] || 0) > 0)
    .sort((left, right) => {
      if (left === preferredGoodId) return -1;
      if (right === preferredGoodId) return 1;
      return (state.cargo[right] || 0) - (state.cargo[left] || 0);
    });
  const goodId = candidates[0];
  if (!goodId) return "";
  const amount = Math.min(state.cargo[goodId], Math.max(1, Math.round(units)));
  const good = goods.find((entry) => entry.id === goodId);
  state.cargo[goodId] -= amount;
  if (state.cargo[goodId] <= 0) {
    delete state.cargo[goodId];
    delete state.cargoBasis[goodId];
  }
  return `${amount} ${good?.name ?? goodId}`;
}

function payFine(state: GameState, amount: number) {
  const fine = Math.max(0, Math.round(amount));
  const paid = Math.min(state.cash, fine);
  state.cash -= paid;
  state.debt += fine - paid;
}

function hasMarketPermit(state: GameState, factionId: string) {
  return state.politicalEvents.some((event) => event.factionId === factionId && event.kind === "permit" && event.expires >= state.day);
}

function factionName(factionId: string) {
  return factions.find((entry) => entry.id === factionId)?.name ?? factionId;
}

function upsertPoliticalEvent(state: GameState, event: GameState["politicalEvents"][number]) {
  state.politicalEvents = [
    event,
    ...state.politicalEvents.filter((entry) => {
      return !(entry.factionId === event.factionId && entry.kind === event.kind && entry.expires >= state.day);
    }),
  ].slice(0, 8);
}

function expireContracts(state: GameState) {
  for (const contract of state.contracts) {
    if (contract.status !== "active" || contract.deadline >= state.day) continue;
    contract.status = "failed";
    contract.failedDay = state.day;
    const totalUnits = contractTotalUnits(contract);
    const remainingRatio = Math.max(0, totalUnits - contractDeliveredUnits(contract)) / Math.max(1, totalUnits);
    const penalty = Math.round(contract.penalty * remainingRatio);
    const paid = Math.min(state.cash, penalty);
    state.cash -= paid;
    state.debt += penalty - paid;
    bumpStanding(state, contract.factionId, -Math.max(1.2, 4 * remainingRatio));
    if (contract.chain?.failureStandingPenalty) bumpStanding(state, contract.factionId, -contract.chain.failureStandingPenalty);
    const summary = contractSummary(contract);
    addLog(
      state,
      contract.chain
        ? `${contract.chain.giver}: ${contract.chain.failureText} Penalty ${money(penalty)}.`
        : `Missed ${summary.factionName} contract deadline. Penalty ${money(penalty)}.`
    );
  }
}

function hasCompletableContract(state: GameState, portId: string) {
  return state.contracts.some((contract) => {
    if (contract.status !== "active") return false;
    const stop = contractStops(contract).find((entry) => entry.portId === portId && entry.delivered < entry.units);
    return Boolean(stop && (state.cargo[stop.goodId] || 0) > 0);
  });
}

function endRun(state: GameState, reason: string) {
  state.gameOver = true;
  state.voyage = null;
  state.encounter = null;
  const previousBest = Math.max(0, state.best || 0);
  const finalScore = scoreNow(state);
  state.best = Math.max(previousBest, finalScore);
  const comparison =
    previousBest <= 0
      ? " First score on the board."
      : finalScore > previousBest
        ? ` New best by ${money(finalScore - previousBest)} over ${money(previousBest)}.`
        : ` Best remains ${money(previousBest)} (${money(previousBest - finalScore)} away).`;
  addLog(state, `${reason} Final net worth: ${money(finalScore)}.${comparison}`);
  return state;
}

function bumpStanding(state: GameState, factionId: string, amount: number) {
  state.factionStanding[factionId] = clamp((state.factionStanding[factionId] ?? 0) + amount, -30, 45);
}

function decayStanding(state: GameState) {
  for (const faction of factions) {
    const current = state.factionStanding[faction.id] ?? 0;
    state.factionStanding[faction.id] = Math.abs(current) < 0.08 ? 0 : current * 0.996;
  }
}

function rumorText(event: { portId: string; goodId: string; kind: string; expires: number }) {
  const port = ports.find((entry) => entry.id === event.portId);
  const good = goods.find((entry) => entry.id === event.goodId);
  return `${port?.name ?? "Unknown"}: ${good?.name ?? event.goodId} ${event.kind} until day ${event.expires}.`;
}

function addLog(state: GameState, text: string) {
  state.log.unshift({ day: state.day, text });
  state.log = state.log.slice(0, 10);
}

function adjustCrewMorale(state: GameState, delta: number, logTemplate?: string) {
  if (!state.crew.length || delta === 0) return;
  const before = normalizeCrewMorale(state.crewMorale);
  const after = normalizeCrewMorale(before + delta);
  state.crewMorale = after;
  if (logTemplate && after !== before) addLog(state, logTemplate.replace("{morale}", String(after)));
}

function grantCaptainXp(state: GameState, amount: number, source: string) {
  const gain = Math.max(0, Math.round(amount));
  if (gain <= 0) return;
  state.captainXp += gain;
  addLog(state, `${source}: +${gain} XP.`);

  let earned = 0;
  while (state.captainXp >= state.captainXpTarget) {
    state.captainXp -= state.captainXpTarget;
    state.captainXpTarget = nextCaptainXpTarget(state.captainXpTarget);
    state.skillPoints += 1;
    earned += 1;
  }

  if (earned > 0) {
    addLog(state, earned === 1 ? "Captain advanced: +1 skill point." : `Captain advanced: +${earned} skill points.`);
  }
}

function grantCrewXp(state: GameState, amount: number, source: string) {
  if (!state.crew.length) return;
  const gain = Math.max(0, Math.round(amount * crewFacilityFor(state).xpMultiplier));
  if (gain <= 0) return;
  state.crewXp ??= {};
  state.crewTraits ??= {};
  for (const crewId of state.crew) {
    const before = state.crewXp[crewId] ?? 0;
    const beforeRank = crewRankFor(before);
    const after = before + gain;
    const afterRank = crewRankFor(after);
    state.crewXp[crewId] = after;
    maybeGrantCrewTrait(state, crewId, source, before, after);
    if (afterRank.id !== beforeRank.id) {
      const crew = crewCatalog.find((entry) => entry.id === crewId);
      const specialty = crewSpecialtyFor(crewId, after);
      addLog(state, `${crew?.name ?? crewId} became ${afterRank.label} ${specialty.label} after ${source}; ${specialty.perk}.`);
    }
  }
}

function maybeGrantCrewTrait(state: GameState, crewId: string, source: string, beforeXp: number, afterXp: number) {
  if (afterXp < 60) return;
  const lower = source.toLowerCase();
  if ((lower.includes("storm") || lower.includes("hard water") || lower.includes("emergency watch") || lower.includes("sea handling")) && grantCrewTrait(state, crewId, "storm_scarred", source)) {
    return;
  }
  if ((lower.includes("contract") || lower.includes("cargo") || lower.includes("trade")) && grantCrewTrait(state, crewId, "marketwise", source)) {
    return;
  }
  if (beforeXp < 60 && state.crewMorale >= 86) grantCrewTrait(state, crewId, "loyal", source);
}

function grantCrewTrait(state: GameState, crewId: string, traitId: CrewTraitId, source: string) {
  const crew = crewCatalog.find((entry) => entry.id === crewId);
  if (!crew || !state.crew.includes(crewId)) return false;
  state.crewTraits ??= {};
  const traits = crewTraitsFor(state, crewId);
  if (traits.includes(traitId)) return false;
  state.crewTraits[crewId] = [...traits, traitId];
  const trait = crewTraitDefinitionFor(traitId);
  addLog(state, `${crew.name} gained ${trait.label} after ${source}; ${trait.detail}.`);
  return true;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function blankCaptainSkills(): CaptainSkills {
  return Object.fromEntries(captainSkillCatalog.map((skill) => [skill.id, 0])) as CaptainSkills;
}

function normalizeLoadedState(state: Partial<GameState>, fallbackBest: number): GameState {
  const input = isRecord(state) ? state : {};
  const best = Math.max(finiteNumber(input.best, 0), fallbackBest);
  const next = cloneState(createInitialState(best));

  next.version = gameStateVersion;
  next.day = boundedInteger(input.day, next.day, 1, maxDay);
  next.cash = boundedInteger(input.cash, next.cash, 0, 9999999);
  next.debt = boundedInteger(input.debt, next.debt, 0, 9999999);
  next.currentPort = normalizePortId(input.currentPort, next.currentPort);
  next.selectedPort = normalizePortId(input.selectedPort, next.currentPort);
  next.tab = normalizeTabId(input.tab, next.tab);
  next.sailPlan = sailPlanFor(typeof input.sailPlan === "string" ? (input.sailPlan as SailPlanId) : next.sailPlan).id;

  const savedShip = normalizeShipId(input.currentShip);
  next.ownedShips = normalizeIdList(input.ownedShips, shipCatalog.map((ship) => ship.id), ["coastal_sloop"]);
  if (savedShip && !next.ownedShips.includes(savedShip)) next.ownedShips.push(savedShip);
  next.currentShip = savedShip ?? next.ownedShips[0];
  next.equipment = normalizeEquipmentIds(arrayOfStrings(input.equipment));
  next.crew = normalizeIdList(input.crew, crewCatalog.map((crew) => crew.id), []);

  next.market = normalizeMarket(input.market, next.market);
  next.marketStock = normalizeMarketStock(isRecord(input.marketStock) ? input.marketStock : undefined);
  next.marketHistory = normalizeMarketHistory(input.marketHistory, next.market, next.day);
  next.trends = normalizeTrends(input.trends, next.trends, next.day);
  next.events = normalizeRumorEvents(input.events, next.day);
  next.factionStanding = normalizeFactionStanding(input.factionStanding);
  next.politicalEvents = normalizePoliticalEvents(input.politicalEvents, next.day);
  next.routeMemory = normalizeRouteMemory(input.routeMemory, next.day);
  next.routeHistory = normalizeRouteHistory(input.routeHistory, next.day);

  next.cargo = normalizeCargo(input.cargo);
  next.cargoBasis = normalizeCargoBasis({ cargo: next.cargo, cargoBasis: isRecord(input.cargoBasis) ? input.cargoBasis : {} });
  next.cargoInsurance = normalizeCargoInsurance(input.cargoInsurance, next.day);

  next.crewXp = normalizeCrewXp({ crew: next.crew, crewXp: isRecord(input.crewXp) ? input.crewXp : {} });
  next.crewTraits = normalizeCrewTraits({ crew: next.crew, crewTraits: isRecord(input.crewTraits) ? input.crewTraits : {} });
  next.crewProfiles = normalizeCrewProfiles({ crew: next.crew, crewProfiles: isRecord(input.crewProfiles) ? input.crewProfiles : {}, day: next.day });
  next.crewMorale = normalizeCrewMorale(input.crewMorale);
  next.captainSkills = normalizeCaptainSkills(input.captainSkills);
  next.skillPoints = boundedInteger(input.skillPoints, 0, 0, captainSkillCatalog.length * captainSkillLimit);
  next.captainXp = boundedInteger(input.captainXp, 0, 0, 999999);
  next.captainXpTarget = Math.max(initialCaptainXpTarget, boundedInteger(input.captainXpTarget, initialCaptainXpTarget, 1, 999999));

  next.contracts = normalizeContracts(input.contracts, next.day);
  next.contracts = next.contracts.length ? next.contracts : seedContracts(next);
  next.contracts = refreshContracts(next);

  next.log = normalizeLog(input.log, next.log);
  next.errors = normalizeErrors(input.errors, next.day);
  next.voyage = normalizeVoyage(input.voyage, next);
  next.encounter = normalizeEncounter(input.encounter);
  next.pendingArrival = normalizeNullablePortId(input.pendingArrival);
  next.gameOver = typeof input.gameOver === "boolean" ? input.gameOver : false;
  next.lastSavedAt = typeof input.lastSavedAt === "string" ? input.lastSavedAt : null;

  const stats = deriveShipStats(next);
  next.hull = boundedInteger(input.hull, Math.min(next.hull, stats.hullMax), 0, stats.hullMax);
  if (next.currentPort === next.selectedPort && !next.voyage) next.selectedPort = next.currentPort;

  return next;
}

function normalizeReducerInvariants(state: GameState): GameState {
  const next = state;
  next.version = gameStateVersion;
  next.day = boundedInteger(next.day, 1, 1, maxDay + 1);
  next.cash = boundedInteger(next.cash, 0, 0, 9999999);
  next.debt = boundedInteger(next.debt, 0, 0, 9999999);
  next.best = boundedInteger(next.best, 0, 0, 99999999);
  next.currentPort = normalizePortId(next.currentPort, ports[0].id);
  next.selectedPort = normalizePortId(next.selectedPort, next.currentPort);
  next.tab = normalizeTabId(next.tab, "market");
  next.sailPlan = sailPlanFor(typeof next.sailPlan === "string" ? next.sailPlan : "balanced").id;

  const activeShip = normalizeShipId(next.currentShip) ?? "coastal_sloop";
  next.ownedShips = normalizeIdList(next.ownedShips, shipCatalog.map((ship) => ship.id), [activeShip]);
  if (!next.ownedShips.includes(activeShip)) next.ownedShips.unshift(activeShip);
  next.currentShip = activeShip;
  next.equipment = normalizeEquipmentIds(arrayOfStrings(next.equipment));
  next.crew = normalizeIdList(next.crew, crewCatalog.map((crew) => crew.id), []);
  let stats = deriveShipStats(next);
  if (next.crew.length > stats.crewCap) next.crew = next.crew.slice(0, stats.crewCap);

  next.crewXp = normalizeCrewXp({ crew: next.crew, crewXp: isRecord(next.crewXp) ? next.crewXp : {} });
  next.crewTraits = normalizeCrewTraits({ crew: next.crew, crewTraits: isRecord(next.crewTraits) ? next.crewTraits : {} });
  next.crewProfiles = normalizeCrewProfiles({ crew: next.crew, crewProfiles: isRecord(next.crewProfiles) ? next.crewProfiles : {}, day: next.day });
  next.crewMorale = normalizeCrewMorale(next.crewMorale);
  next.captainSkills = normalizeCaptainSkills(next.captainSkills);
  next.skillPoints = boundedInteger(next.skillPoints, 0, 0, captainSkillCatalog.length * captainSkillLimit);
  next.captainXp = boundedInteger(next.captainXp, 0, 0, 999999);
  next.captainXpTarget = boundedInteger(next.captainXpTarget, initialCaptainXpTarget, 1, 999999);

  next.market = normalizeMarket(next.market, makeMarket());
  next.marketStock = normalizeMarketStock(isRecord(next.marketStock) ? next.marketStock : undefined);
  next.marketHistory = normalizeMarketHistory(next.marketHistory, next.market, next.day);
  next.trends = normalizeTrends(next.trends, makeTrends(next.day), next.day);
  next.events = normalizeRumorEvents(next.events, next.day);
  next.factionStanding = normalizeFactionStanding(next.factionStanding);
  next.politicalEvents = normalizePoliticalEvents(next.politicalEvents, next.day);
  next.routeMemory = normalizeRouteMemory(next.routeMemory, next.day);
  next.routeHistory = normalizeRouteHistory(next.routeHistory, next.day);

  next.cargo = normalizeCargo(next.cargo);
  next.cargoBasis = normalizeCargoBasis({ cargo: next.cargo, cargoBasis: isRecord(next.cargoBasis) ? next.cargoBasis : {} });
  stats = deriveShipStats(next);
  trimCargoToCapacity(next, stats.cargoCap);
  next.hull = boundedInteger(next.hull, stats.hullMax, 0, stats.hullMax);
  next.cargoInsurance = normalizeCargoInsurance(next.cargoInsurance, next.day);
  if (
    next.cargoInsurance &&
    (next.cargoInsurance.originPortId === next.cargoInsurance.destinationPortId || cargoUnits(next) <= 0)
  ) {
    next.cargoInsurance = null;
  }

  next.contracts = normalizeContracts(next.contracts, next.day);
  for (const contract of next.contracts) {
    if (contract.status === "active" && contract.deadline < next.day) {
      contract.status = "failed";
      contract.failedDay ??= next.day;
    }
  }
  next.contracts = refreshContracts(next);

  next.log = normalizeLog(next.log, []);
  next.errors = normalizeErrors(next.errors, next.day);
  next.encounter = normalizeEncounter(next.encounter);
  next.voyage = normalizeVoyage(next.voyage, next);
  next.pendingArrival = normalizeNullablePortId(next.pendingArrival);
  if (next.encounter && next.voyage && next.encounter.kind !== "sea") next.voyage = null;
  if (next.encounter?.kind === "sea" && !next.voyage) next.encounter = null;
  if (next.voyage) {
    next.selectedPort = next.voyage.toId;
    next.pendingArrival = null;
  }
  if (next.encounter && next.encounter.kind !== "sea" && !next.pendingArrival) next.pendingArrival = next.selectedPort !== next.currentPort ? next.selectedPort : next.currentPort;
  if (!next.voyage && !next.encounter) next.pendingArrival = null;
  next.gameOver = typeof next.gameOver === "boolean" ? next.gameOver : false;
  if (next.gameOver) {
    next.voyage = null;
    next.encounter = null;
    next.pendingArrival = null;
  }
  next.lastSavedAt = typeof next.lastSavedAt === "string" ? next.lastSavedAt : null;

  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return clamp(finiteNumber(value, fallback), min, max);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(boundedNumber(value, fallback, min, max));
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function normalizeIdList(value: unknown, allowedIds: string[], fallback: string[]) {
  const allowed = new Set(allowedIds);
  const normalized: string[] = [];
  for (const id of arrayOfStrings(value)) {
    if (!allowed.has(id) || normalized.includes(id)) continue;
    normalized.push(id);
  }
  return normalized.length ? normalized : [...fallback];
}

function normalizePortId(value: unknown, fallback: string) {
  return typeof value === "string" && ports.some((port) => port.id === value) ? value : fallback;
}

function normalizeNullablePortId(value: unknown) {
  return typeof value === "string" && ports.some((port) => port.id === value) ? value : null;
}

function normalizeShipId(value: unknown) {
  return typeof value === "string" && shipCatalog.some((ship) => ship.id === value) ? value : null;
}

function normalizeTabId(value: unknown, fallback: TabId): TabId {
  return value === "market" || value === "harbor" || value === "contracts" || value === "intel" ? value : fallback;
}

function normalizeMarket(value: unknown, fallback: GameState["market"]) {
  const source = isRecord(value) ? value : {};
  const market = makeMarket();
  for (const port of ports) {
    const portValue = source[port.id];
    const portMarket = isRecord(portValue) ? portValue : {};
    for (const good of goods) {
      market[port.id][good.id] = Math.max(5, Math.round(finiteNumber(portMarket[good.id], fallback[port.id]?.[good.id] ?? good.base)));
    }
  }
  return market;
}

function normalizeTrends(value: unknown, fallback: GameState["trends"], day: number) {
  const source = isRecord(value) ? value : {};
  const trends = makeTrends(day);
  for (const good of goods) {
    const savedValue = source[good.id];
    const saved = isRecord(savedValue) ? savedValue : {};
    const base = fallback[good.id] ?? trends[good.id];
    trends[good.id] = {
      direction: saved.direction === -1 || saved.direction === 1 ? saved.direction : base.direction,
      momentum: Number(boundedNumber(saved.momentum, base.momentum, 0, 2).toFixed(3)),
      label: cleanLoadedText(saved.label, base.label, 48),
      expires: boundedInteger(saved.expires, Math.max(day + 1, base.expires), day, maxDay + 30),
    };
  }
  return trends;
}

function normalizeRumorEvents(value: unknown, day: number): GameState["events"] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const portId = normalizeNullablePortId(entry.portId);
      const goodId = normalizeGoodId(entry.goodId);
      const kind: GameState["events"][number]["kind"] | null = entry.kind === "shortage" || entry.kind === "glut" ? entry.kind : null;
      if (!portId || !goodId || !kind) return [];
      const savedExpires = optionalNumber(entry.expires);
      if (savedExpires !== null && savedExpires < day) return [];
      const expires = boundedInteger(entry.expires, day, day, maxDay + 30);
      const event: GameState["events"][number] = {
        id: cleanLoadedText(entry.id, uid("event"), 80),
        portId,
        goodId,
        multiplier: Number(boundedNumber(entry.multiplier, kind === "shortage" ? 1.42 : 0.74, 0.2, 3).toFixed(3)),
        expires,
        kind,
      };
      return [event];
    })
    .slice(0, 12);
}

function normalizePoliticalEvents(value: unknown, day: number): GameState["politicalEvents"] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const factionId = normalizeFactionId(entry.factionId);
      if (!factionId || !isPoliticalKind(entry.kind)) return [];
      const savedExpires = optionalNumber(entry.expires);
      if (savedExpires !== null && savedExpires < day) return [];
      return [
        {
          id: cleanLoadedText(entry.id, uid("policy"), 80),
          factionId,
          kind: entry.kind,
          ...(normalizeGoodId(entry.goodId) ? { goodId: normalizeGoodId(entry.goodId)! } : {}),
          riskModifier: Number(boundedNumber(entry.riskModifier, 0, -1, 1).toFixed(3)),
          priceModifier: Number(boundedNumber(entry.priceModifier, 1, 0.25, 4).toFixed(3)),
          expires: boundedInteger(entry.expires, day, day, maxDay + 30),
          text: cleanLoadedText(entry.text, "Policy event restored.", 160),
        },
      ];
    })
    .slice(0, 12);
}

function normalizeRouteHistory(value: unknown, day: number): GameState["routeHistory"] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const fromId = normalizeNullablePortId(entry.fromId);
      const toId = normalizeNullablePortId(entry.toId);
      if (!fromId || !toId || fromId === toId || !isRouteHistoryOutcome(entry.outcome)) return [];
      return [
        {
          day: boundedInteger(entry.day, day, 1, maxDay + 1),
          fromId,
          toId,
          sailPlan: sailPlanFor(typeof entry.sailPlan === "string" ? (entry.sailPlan as SailPlanId) : "balanced").id,
          projectedProfit: boundedInteger(entry.projectedProfit, 0, -999999, 999999),
          risk: Number(boundedNumber(entry.risk, 0, 0, 1).toFixed(3)),
          wear: boundedInteger(entry.wear, 0, 0, 999),
          outcome: entry.outcome,
          reason: cleanLoadedText(entry.reason, "route scouting", 80),
          cargoSummary: cleanLoadedText(entry.cargoSummary, "empty hold", 100),
          label: cleanLoadedText(entry.label, "Clean crossing", 60),
          detail: cleanLoadedText(entry.detail, "Crossing restored from save.", 140),
        },
      ];
    })
    .slice(-30);
}

function normalizeFactionStanding(value: unknown) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(factions.map((faction) => [faction.id, Number(boundedNumber(source[faction.id], 0, -100, 100).toFixed(3))]));
}

function normalizeCargo(value: unknown) {
  const source = isRecord(value) ? value : {};
  const cargo: GameState["cargo"] = {};
  for (const good of goods) {
    const quantity = boundedInteger(source[good.id], 0, 0, 999);
    if (quantity > 0) cargo[good.id] = quantity;
  }
  return cargo;
}

function trimCargoToCapacity(state: Pick<GameState, "cargo" | "cargoBasis">, capacity: number) {
  let used = goods.reduce((sum, good) => sum + (state.cargo[good.id] || 0) * good.cargo, 0);
  if (used <= capacity) return;
  for (const good of [...goods].reverse()) {
    while ((state.cargo[good.id] || 0) > 0 && used > capacity) {
      state.cargo[good.id] -= 1;
      used -= good.cargo;
    }
    if ((state.cargo[good.id] || 0) <= 0) {
      delete state.cargo[good.id];
      delete state.cargoBasis[good.id];
    }
    if (used <= capacity) break;
  }
}

function normalizeCaptainSkills(value: unknown): CaptainSkills {
  const source = isRecord(value) ? value : {};
  const skills = blankCaptainSkills();
  for (const skill of captainSkillCatalog) {
    skills[skill.id] = boundedInteger(source[skill.id], 0, 0, captainSkillLimit);
  }
  return skills;
}

function normalizeContracts(value: unknown, day: number): Contract[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const originPortId = normalizeNullablePortId(entry.originPortId);
      const destinationPortId = normalizeNullablePortId(entry.destinationPortId);
      const factionId = normalizeFactionId(entry.factionId);
      const goodId = normalizeGoodId(entry.goodId);
      if (!originPortId || !destinationPortId || originPortId === destinationPortId || !factionId || !goodId || !isContractStatus(entry.status)) return [];
      const contract: Contract = {
        id: cleanLoadedText(entry.id, uid("contract"), 80),
        kind: isContractKind(entry.kind) ? entry.kind : "standard",
        originPortId,
        destinationPortId,
        factionId,
        goodId,
        units: boundedInteger(entry.units, 1, 1, 999),
        deliveredUnits: boundedInteger(entry.deliveredUnits, 0, 0, 999),
        paidReward: boundedInteger(entry.paidReward, 0, 0, 999999),
        deadline: boundedInteger(entry.deadline, day + 4, 1, maxDay + 60),
        reward: boundedInteger(entry.reward, 10, 0, 999999),
        penalty: boundedInteger(entry.penalty, 0, 0, 999999),
        status: entry.status,
      };
      const stops = normalizeContractStops(entry.stops, contract);
      if (stops.length) {
        contract.stops = stops;
        contract.units = stops.reduce((sum, stop) => sum + stop.units, 0);
      }
      if (optionalNumber(entry.routeRiskModifier) !== null) contract.routeRiskModifier = Number(boundedNumber(entry.routeRiskModifier, 0, -0.3, 0.3).toFixed(3));
      if (optionalNumber(entry.inspectionRisk) !== null) contract.inspectionRisk = Number(boundedNumber(entry.inspectionRisk, 0, 0, 0.6).toFixed(3));
      if (optionalNumber(entry.smugglingFine) !== null) contract.smugglingFine = boundedInteger(entry.smugglingFine, 0, 0, 999999);
      if (isRecoverySource(entry.recoverySource)) contract.recoverySource = entry.recoverySource;
      if (typeof entry.brief === "string") contract.brief = cleanLoadedText(entry.brief, "", 180);
      const chain = normalizeContractChain(entry.chain);
      if (chain) contract.chain = chain;
      const acceptedDay = optionalDay(entry.acceptedDay);
      const completedDay = optionalDay(entry.completedDay);
      const failedDay = optionalDay(entry.failedDay);
      if (acceptedDay) contract.acceptedDay = acceptedDay;
      if (completedDay) contract.completedDay = completedDay;
      if (failedDay) contract.failedDay = failedDay;
      return [contract];
    })
    .slice(0, 30);
}

function normalizeLog(value: unknown, fallback: GameState["log"]) {
  if (!Array.isArray(value)) return fallback;
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const text = cleanLoadedText(entry.text, "", 180);
      return text ? [{ day: boundedInteger(entry.day, 1, 1, maxDay), text }] : [];
    })
    .slice(0, 10);
}

function normalizeVoyage(value: unknown, state: GameState): Voyage | null {
  if (!isRecord(value)) return null;
  const fromId = normalizePortId(value.fromId, state.currentPort);
  const toId = normalizePortId(value.toId, state.selectedPort);
  if (fromId === toId) return null;
  const plan = sailPlanFor(typeof value.sailPlan === "string" ? (value.sailPlan as SailPlanId) : state.sailPlan);
  const days = boundedInteger(value.days, routeDays(state, fromId, toId), 1, 30);
  const voyage: Voyage = {
    fromId,
    toId,
    days,
    risk: Number(boundedNumber(value.risk, routeRisk(state, fromId, toId), 0, 1).toFixed(3)),
    sailPlan: plan.id,
    progress: Number(boundedNumber(value.progress, 0, 0, 0.99).toFixed(3)),
    duration: Number(boundedNumber(value.duration, days, 0.1, 120).toFixed(3)),
    watchIndex: boundedInteger(value.watchIndex, 0, 0, voyageWatchThresholds.length),
    watch: normalizeVoyageWatch(value.watch),
  };
  const wear = optionalNumber(value.wear);
  if (wear !== null) voyage.wear = boundedInteger(wear, 0, 0, 999);
  if (typeof value.wearLabel === "string") voyage.wearLabel = cleanLoadedText(value.wearLabel, "", 60);
  if (typeof value.seaLabel === "string") voyage.seaLabel = cleanLoadedText(value.seaLabel, "", 60);
  return voyage;
}

function normalizeVoyageWatch(value: unknown): VoyageWatchReport | null {
  if (!isRecord(value) || !isWatchEffect(value.effect)) return null;
  return {
    label: cleanLoadedText(value.label, "Sea Watch", 60),
    detail: cleanLoadedText(value.detail, "Watch restored from save.", 160),
    progress: Number(boundedNumber(value.progress, 0, 0, 1).toFixed(3)),
    roughness: Number(boundedNumber(value.roughness, 0, 0, 1).toFixed(3)),
    stormIntensity: Number(boundedNumber(value.stormIntensity, 0, 0, 1).toFixed(3)),
    waveEnergy: Number(boundedNumber(value.waveEnergy, 0, 0, 1).toFixed(3)),
    effect: value.effect,
  };
}

function normalizeEncounter(value: unknown): GameState["encounter"] {
  if (!isRecord(value) || (value.kind !== "pirate" && value.kind !== "inspection" && value.kind !== "sea")) return null;
  const encounter: GameState["encounter"] = {
    kind: value.kind,
    name: cleanLoadedText(value.name, value.kind === "pirate" ? "Sea Raider" : value.kind === "sea" ? "Sea Watch" : "Customs Cutter", 80),
    strength: boundedInteger(value.strength, 10, 0, 999),
    bribe: boundedInteger(value.bribe, 0, 0, 999999),
    bounty: boundedInteger(value.bounty, 0, 0, 999999),
    portName: cleanLoadedText(value.portName, "Open water", 80),
  };
  const factionId = normalizeFactionId(value.factionId);
  const suspectGoodId = normalizeGoodId(value.suspectGoodId);
  if (factionId) encounter.factionId = factionId;
  if (optionalNumber(value.fine) !== null) encounter.fine = boundedInteger(value.fine, 0, 0, 999999);
  if (suspectGoodId) encounter.suspectGoodId = suspectGoodId;
  if (optionalNumber(value.seizedUnits) !== null) encounter.seizedUnits = boundedInteger(value.seizedUnits, 0, 0, 999);
  if (value.kind === "sea") {
    encounter.seaKind = value.seaKind === "storm" ? "storm" : "watch";
    encounter.progress = Number(boundedNumber(value.progress, 0, 0, 1).toFixed(3));
    encounter.roughness = Number(boundedNumber(value.roughness, 0, 0, 1).toFixed(3));
    encounter.stormIntensity = Number(boundedNumber(value.stormIntensity, 0, 0, 1).toFixed(3));
    encounter.waveEnergy = Number(boundedNumber(value.waveEnergy, 0, 0, 1).toFixed(3));
    if (value.effect === "clean" || value.effect === "strain" || value.effect === "damage" || value.effect === "cargo") encounter.effect = value.effect;
    encounter.hullThreat = boundedInteger(value.hullThreat, 1, 0, 99);
    encounter.moraleThreat = boundedInteger(value.moraleThreat, 1, 0, 99);
    encounter.cargoThreat = boundedInteger(value.cargoThreat, 0, 0, 9);
  }
  return encounter;
}

function normalizeGoodId(value: unknown) {
  return typeof value === "string" && goods.some((good) => good.id === value) ? value : null;
}

function normalizeFactionId(value: unknown) {
  return typeof value === "string" && factions.some((faction) => faction.id === value) ? value : null;
}

function isPoliticalKind(value: unknown): value is GameState["politicalEvents"][number]["kind"] {
  return value === "tariff" || value === "convoy" || value === "strike" || value === "inspection" || value === "permit";
}

function isContractStatus(value: unknown): value is Contract["status"] {
  return value === "available" || value === "active" || value === "completed" || value === "failed";
}

function isContractKind(value: unknown): value is NonNullable<Contract["kind"]> {
  return value === "standard" || value === "urgent" || value === "escort" || value === "smuggling" || value === "multi_stop";
}

function isRecoverySource(value: unknown): value is NonNullable<Contract["recoverySource"]> {
  return value === "storm" || value === "pirate" || value === "customs";
}

function isRouteHistoryOutcome(value: unknown): value is GameState["routeHistory"][number]["outcome"] {
  return value === "clean" || value === "heavy-weather" || value === "pirate" || value === "inspection";
}

function normalizeContractChain(value: unknown): Contract["chain"] | undefined {
  if (!isRecord(value) || !isContractChainId(value.id)) return undefined;
  const stage = boundedInteger(value.stage, 1, 1, 8);
  const stages = Math.max(stage, boundedInteger(value.stages, 3, stage, 8));
  return {
    id: value.id,
    giver: cleanLoadedText(value.giver, "Contract Giver", 60),
    title: cleanLoadedText(value.title, "Contract Chain", 80),
    stage,
    stages,
    hook: cleanLoadedText(value.hook, "", 220),
    successText: cleanLoadedText(value.successText, "", 220),
    failureText: cleanLoadedText(value.failureText, "", 220),
    ...(typeof value.rareReward === "string" ? { rareReward: cleanLoadedText(value.rareReward, "", 80) } : {}),
    ...(optionalNumber(value.rewardCash) !== null ? { rewardCash: boundedInteger(value.rewardCash, 0, 0, 9999) } : {}),
    ...(optionalNumber(value.standingReward) !== null ? { standingReward: Number(boundedNumber(value.standingReward, 0, -20, 20).toFixed(2)) } : {}),
    ...(optionalNumber(value.failureStandingPenalty) !== null
      ? { failureStandingPenalty: Number(boundedNumber(value.failureStandingPenalty, 0, 0, 20).toFixed(2)) }
      : {}),
  };
}

function isContractChainId(value: unknown): value is NonNullable<Contract["chain"]>["id"] {
  return value === "charter_audit" || value === "freeport_lifeline" || value === "admiralty_convoy";
}

function normalizeContractStops(value: unknown, contract: Contract) {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const portId = normalizeNullablePortId(entry.portId);
      const goodId = normalizeGoodId(entry.goodId);
      if (!portId || !goodId) return [];
      const units = boundedInteger(entry.units, 1, 1, 999);
      return [
        {
          portId,
          goodId,
          units,
          delivered: boundedInteger(entry.delivered, 0, 0, units),
          reward: boundedInteger(entry.reward, Math.max(0, Math.round(contract.reward / Math.max(1, value.length))), 0, 999999),
        },
      ];
    })
    .slice(0, 4);
}

function isWatchEffect(value: unknown): value is VoyageWatchReport["effect"] {
  return value === "clean" || value === "strain" || value === "damage" || value === "cargo";
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalDay(value: unknown) {
  const day = optionalNumber(value);
  return day === null ? null : boundedInteger(day, 1, 1, maxDay);
}

function cleanLoadedText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function stateWithReducerError(state: GameState, action: GameAction, error: unknown) {
  const next = cloneState(state);
  recordGameError(next, {
    message: `Action ${action.type} failed: ${runtimeErrorMessage(error, "Reducer action failed")}`,
    source: `reducer:${action.type}`,
    stack: runtimeErrorStack(error),
  });
  return next;
}

function recordGameError(state: GameState, error: Omit<GameError, "id" | "day" | "time">) {
  const message = cleanErrorText(error.message, "Unknown runtime error");
  const source = cleanErrorText(error.source, "runtime");
  const stack = cleanOptionalErrorText(error.stack, 360);
  state.errors = normalizeErrors(state.errors, state.day);
  state.errors.unshift({
    id: uid("error"),
    day: Math.max(1, Math.round(finiteNumber(state.day, 1))),
    message,
    source,
    time: new Date().toISOString(),
    ...(stack ? { stack } : {}),
  });
  state.errors = state.errors.slice(0, errorLogLimit);
}

function normalizeErrors(errors: unknown, fallbackDay: number): GameError[] {
  if (!Array.isArray(errors)) return [];
  return errors
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<GameError>;
      const message = cleanOptionalErrorText(candidate.message, 240);
      if (!message) return [];
      const source = cleanErrorText(candidate.source, "runtime");
      const id = cleanOptionalErrorText(candidate.id, 80) ?? uid("error");
      const day = Number.isFinite(candidate.day) ? Math.max(1, Math.round(Number(candidate.day))) : Math.max(1, Math.round(fallbackDay || 1));
      const time = cleanOptionalErrorText(candidate.time, 80) ?? new Date().toISOString();
      const stack = cleanOptionalErrorText(candidate.stack, 360);
      return [{ id, day, message, source, time, ...(stack ? { stack } : {}) }];
    })
    .slice(0, errorLogLimit);
}

function cleanErrorText(value: unknown, fallback: string) {
  return cleanOptionalErrorText(value, 240) ?? fallback;
}

function cleanOptionalErrorText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function runtimeErrorMessage(value: unknown, fallback: string) {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;
  if (value == null) return fallback;
  return String(value);
}

function runtimeErrorStack(value: unknown) {
  if (value instanceof Error) return value.stack;
  return undefined;
}

function normalizeCargoBasis(state: Pick<GameState, "cargo"> & { cargoBasis?: Record<string, unknown> | null }) {
  const basis: Record<string, number> = {};
  for (const [goodId, quantity] of Object.entries(state.cargo ?? {})) {
    if (quantity <= 0) continue;
    const value = state.cargoBasis?.[goodId];
    const number = optionalNumber(value);
    if (number !== null && number > 0) basis[goodId] = Math.round(number);
  }
  return basis;
}

function normalizeCrewXp(state: Pick<GameState, "crew"> & { crewXp?: Record<string, unknown> | null }) {
  const xp: Record<string, number> = {};
  for (const crewId of state.crew ?? []) {
    const value = state.crewXp?.[crewId] ?? 0;
    const number = optionalNumber(value);
    xp[crewId] = number !== null && number > 0 ? Math.round(number) : 0;
  }
  return xp;
}

function normalizeCrewTraits(state: Pick<GameState, "crew"> & { crewTraits?: Record<string, unknown> | null }) {
  const traits: Record<string, CrewTraitId[]> = {};
  for (const crewId of state.crew ?? []) {
    const values = arrayOfStrings(state.crewTraits?.[crewId]);
    const normalized: CrewTraitId[] = [];
    for (const value of values) {
      if (!isCrewTraitId(value) || normalized.includes(value)) continue;
      normalized.push(value);
    }
    traits[crewId] = normalized.slice(0, 3);
  }
  return traits;
}

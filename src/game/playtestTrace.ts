import { activeContracts } from "./contracts";
import { crewCatalog } from "./data";
import { recommendRouteChoices } from "./economy";
import { feedbackPulseFor, type FeedbackPulse } from "./feedback";
import { captainOrderFor, type CaptainOrder, type CaptainOrderTarget } from "./onboarding";
import { createInitialState, reduceGame, scoreNow, type GameAction } from "./reducer";
import { cargoUnits } from "./routing";
import { deriveShipStats } from "./stats";
import type { Contract, GameState, TabId } from "./types";

export type PlaytestTraceOptions = {
  decisionBudget?: number;
  maxSteps?: number;
};

export type PlaytestTraceStep = {
  step: number;
  decision: number;
  day: number;
  portId: string;
  orderId: string;
  orderTitle: string;
  orderDetail: string;
  pulseTitle: string;
  pulseKind: string;
  pulseDetail: string;
  action: string;
  reasons: string[];
  pureWait: boolean;
  defensive: boolean;
  cash: number;
  hull: number;
  cargoUnits: number;
};

export type PlaytestTraceViolation = {
  step: number;
  decision: number;
  kind: "arrival-without-reason" | "consecutive-pure-wait" | "decision-budget-missed";
  detail: string;
};

export type PlaytestTraceReport = {
  schemaVersion: 1;
  seed: number;
  estimatedMinutes: number;
  decisionBudget: number;
  decisions: number;
  daysCovered: number;
  finalScore: number;
  gameOver: boolean;
  voyagesCompleted: number;
  arrivalsChecked: number;
  maxPureWaitStreak: number;
  reasonsSeen: Record<string, number>;
  violations: PlaytestTraceViolation[];
  passed: boolean;
  trace: PlaytestTraceStep[];
};

export function runPlaytestTrace(seed = 12000, options: PlaytestTraceOptions = {}): PlaytestTraceReport {
  return withSeed(seed, () => {
    const decisionBudget = options.decisionBudget ?? 90;
    const maxSteps = options.maxSteps ?? decisionBudget * 8;
    const trace: PlaytestTraceStep[] = [];
    const violations: PlaytestTraceViolation[] = [];
    const reasonsSeen: Record<string, number> = {};
    let state = createInitialState();
    let decision = 0;
    let voyagesCompleted = 0;
    let arrivalsChecked = 0;
    let pureWaitStreak = 0;
    let maxPureWaitStreak = 0;

    for (let step = 0; step < maxSteps && decision < decisionBudget && !state.gameOver; step += 1) {
      if (state.encounter) {
        state = resolveTraceEncounter(state);
        continue;
      }

      if (state.voyage) {
        state = reduceGame(state, { type: "tickVoyage", dt: 999 });
        if (!state.voyage && !state.encounter) {
          voyagesCompleted += 1;
          arrivalsChecked += 1;
          const arrivalReasons = reasonTagsFor(state, captainOrderFor(state), feedbackPulseFor(state));
          recordReasons(reasonsSeen, arrivalReasons);
          if (!arrivalReasons.length) {
            violations.push({
              step,
              decision,
              kind: "arrival-without-reason",
              detail: `Arrival at ${state.currentPort} did not expose a profit, contract, reward, rumor, danger, repair, or build reason.`,
            });
          }
        }
        continue;
      }

      const order = captainOrderFor(state);
      const pulse = feedbackPulseFor(state);
      const reasons = reasonTagsFor(state, order, pulse);
      recordReasons(reasonsSeen, reasons);
      const defensive = isDefensivePosture(state);
      const pureWait = order.id === "freeplay" && !defensive && !reasons.length;
      pureWaitStreak = pureWait ? pureWaitStreak + 1 : 0;
      maxPureWaitStreak = Math.max(maxPureWaitStreak, pureWaitStreak);

      const actionResult = applyTraceOrder(state, order.target);
      trace.push({
        step,
        decision,
        day: state.day,
        portId: state.currentPort,
        orderId: order.id,
        orderTitle: order.title,
        orderDetail: order.detail,
        pulseTitle: pulse.title,
        pulseKind: pulse.kind,
        pulseDetail: pulse.detail,
        action: actionResult.action,
        reasons,
        pureWait,
        defensive,
        cash: state.cash,
        hull: state.hull,
        cargoUnits: cargoUnits(state),
      });

      if (pureWaitStreak >= 2) {
        violations.push({
          step,
          decision,
          kind: "consecutive-pure-wait",
          detail: `Two consecutive non-defensive decisions had no actionable route, reward, contract, build, rumor, or danger hook.`,
        });
      }

      state = actionResult.state;
      decision += 1;
    }

    if (decision < decisionBudget && !state.gameOver) {
      violations.push({
        step: trace.at(-1)?.step ?? 0,
        decision,
        kind: "decision-budget-missed",
        detail: `Trace stopped after ${decision} decisions before the ${decisionBudget}-decision 20-minute proxy budget.`,
      });
    }

    return {
      schemaVersion: 1,
      seed,
      estimatedMinutes: 20,
      decisionBudget,
      decisions: decision,
      daysCovered: state.day,
      finalScore: scoreNow(state),
      gameOver: state.gameOver,
      voyagesCompleted,
      arrivalsChecked,
      maxPureWaitStreak,
      reasonsSeen,
      violations,
      passed: arrivalsChecked > 0 && violations.length === 0,
      trace,
    };
  });
}

function applyTraceOrder(state: GameState, target: CaptainOrderTarget | null): { state: GameState; action: string } {
  if (!target) return { state, action: "observe" };
  if (target.kind === "buyMaxGood") return dispatch(state, { type: "buyMaxGood", goodId: target.goodId }, `load:${target.goodId}`);
  if (target.kind === "buyContractCargo") return dispatch(state, { type: "buyContractCargo", contractId: target.contractId }, `load-contract:${target.contractId}`);
  if (target.kind === "buyEquipment") return dispatch(state, { type: "buyEquipment", equipmentId: target.equipmentId }, `buy-equipment:${target.equipmentId}`);
  if (target.kind === "buyShip") return dispatch(state, { type: "buyShip", shipId: target.shipId }, `buy-ship:${target.shipId}`);
  if (target.kind === "sellAllGood") return dispatch(state, { type: "sellAllGood", goodId: target.goodId }, `sell:${target.goodId}`);
  if (target.kind === "startVoyage") return dispatch(state, { type: "startVoyage" }, "sail");
  if (target.kind === "repair") return dispatch(state, { type: "repair" }, "repair");
  if (target.kind === "borrow") return dispatch(state, { type: "borrow" }, "borrow");
  if (target.kind === "buyInsurance") return dispatch(state, { type: "buyInsurance" }, "insure");
  if (target.kind === "completeContract") return dispatch(state, { type: "completeContract", contractId: target.contractId }, `complete-contract:${target.contractId}`);
  if (target.kind === "plotRoute") {
    const planned = reduceGame(reduceGame(state, { type: "setSailPlan", plan: target.sailPlan }), { type: "selectPort", portId: target.portId });
    return { state: planned, action: `plot:${target.portId}:${target.sailPlan}` };
  }
  if (target.kind === "openTab") return applyOpenTabOrder(state, target.tab);
  return { state, action: "unknown" };
}

function applyOpenTabOrder(state: GameState, tab: TabId) {
  const opened = reduceGame(state, { type: "setTab", tab });
  if (tab === "contracts") {
    const contract = bestLocalContract(opened);
    if (contract) return dispatch(opened, { type: "acceptContract", contractId: contract.id }, `accept-contract:${contract.id}`);
  }
  if (tab === "harbor") {
    const crew = crewCatalog.find((entry) => !opened.crew.includes(entry.id) && opened.cash >= entry.cost && opened.crew.length < deriveShipStats(opened).crewCap);
    if (crew) return dispatch(opened, { type: "hireCrew", crewId: crew.id }, `hire:${crew.id}`);
  }

  const choice = recommendRouteChoices(opened, opened.currentPort).find((entry) => entry.goodId && entry.cargoUnits > 0);
  if (tab === "intel" && choice) {
    const planned = reduceGame(reduceGame(opened, { type: "setSailPlan", plan: choice.sailPlan }), { type: "selectPort", portId: choice.sellPortId });
    return { state: planned, action: `inspect-then-plot:${choice.sellPortId}:${choice.sailPlan}` };
  }

  return dispatch(opened, { type: "waitDay" }, `wait-from-${tab}`);
}

function bestLocalContract(state: GameState): Contract | null {
  return (
    state.contracts
      .filter((entry) => entry.status === "available" && entry.originPortId === state.currentPort)
      .sort((left, right) => {
        const leftSlack = left.deadline - state.day;
        const rightSlack = right.deadline - state.day;
        return right.reward / Math.max(1, right.units) - left.reward / Math.max(1, left.units) || leftSlack - rightSlack;
      })[0] ?? null
  );
}

function dispatch(state: GameState, action: GameAction, label: string) {
  return { state: reduceGame(state, action), action: label };
}

function resolveTraceEncounter(state: GameState) {
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

function reasonTagsFor(state: GameState, order: CaptainOrder, pulse: FeedbackPulse) {
  const tags = new Set<string>();
  if (order.id !== "freeplay") tags.add(orderReasonTag(order.id));
  if (pulse.kind === "profit") tags.add("profit");
  if (pulse.kind === "contract") tags.add("contract");
  if (pulse.kind === "upgrade") tags.add("build");
  if (pulse.kind === "encounter" || pulse.tone === "risk") tags.add("danger");
  if (pulse.kind === "progress" || pulse.title.includes("Crossing") || pulse.title.includes("Story")) tags.add("progress");
  if (pulse.title.includes("Dockside Lead") || currentPortRumors(state) > 0) tags.add("rumor");
  if (activeContracts(state).length) tags.add("contract");
  if (state.log.slice(0, 6).some((entry) => /Captain advanced|became|Reward:/i.test(entry.text))) tags.add("progress");
  return Array.from(tags).filter((tag) => tag !== "none").sort();
}

function orderReasonTag(orderId: string) {
  if (orderId.includes("contract")) return "contract";
  if (orderId.includes("borrow")) return "recovery";
  if (orderId.includes("refit") || orderId.includes("ship") || orderId.includes("crew") || orderId.includes("repair")) return "build";
  if (orderId.includes("insure")) return "danger";
  if (orderId.includes("rumor")) return "rumor";
  if (orderId.includes("sell") || orderId.includes("load") || orderId.includes("plot") || orderId.includes("sail")) return "profit";
  return "progress";
}

function currentPortRumors(state: GameState) {
  return state.events.filter((event) => event.expires >= state.day && event.portId === state.currentPort).length;
}

function isDefensivePosture(state: GameState) {
  const stats = deriveShipStats(state);
  return state.hull < stats.hullMax * 0.42 || state.cash < 120 || state.debt > Math.max(1800, state.cash + 1200);
}

function recordReasons(target: Record<string, number>, reasons: string[]) {
  for (const reason of reasons) target[reason] = (target[reason] ?? 0) + 1;
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

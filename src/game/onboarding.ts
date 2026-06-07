import { activeContracts, contractCargoStatus, routeContractFocus } from "./contracts";
import { crewCatalog, goods, ports, shipCatalog } from "./data";
import { equipmentRecommendationsFor } from "./equipmentPlanner";
import { cargoInsurableValue, insuranceQuoteFor } from "./insurance";
import { cargoArrivalOutcomeFor, marketAccessForGood, priceFor, recommendRouteChoices, routeTradePlanFor, tradeOpportunityForGood } from "./economy";
import { installEquipmentIds } from "./outfitting";
import { runPhaseForDay } from "./pacing";
import { previewShip, yardPriceFor } from "./shipyard";
import { deriveShipStats } from "./stats";
import { cargoUnits, routeRisk } from "./routing";
import type { GameState, SailPlanId, ShipStats, TabId } from "./types";

export type CaptainOrderTarget =
  | { kind: "buyMaxGood"; goodId: string }
  | { kind: "buyContractCargo"; contractId: string }
  | { kind: "buyEquipment"; equipmentId: string }
  | { kind: "buyShip"; shipId: string }
  | { kind: "sellAllGood"; goodId: string }
  | { kind: "plotRoute"; portId: string; sailPlan: SailPlanId }
  | { kind: "startVoyage" }
  | { kind: "repair" }
  | { kind: "borrow" }
  | { kind: "buyInsurance" }
  | { kind: "completeContract"; contractId: string }
  | { kind: "openTab"; tab: TabId };

export type CaptainOrder = {
  id: string;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  target: CaptainOrderTarget | null;
  done: boolean;
};

export function captainOrderFor(state: GameState): CaptainOrder {
  if (state.gameOver) {
    return order("closed", "Ledger", "Run closed", "Review the final score or start a new run.", "Review", { kind: "openTab", tab: "intel" }, true);
  }
  if (state.encounter) {
    return order("encounter", "Decision", "Resolve the encounter", "Choose the response that fits your hull, cargo, and crew.", "Review", null);
  }
  if (state.voyage) {
    return order("voyage", "Sailing", "Read the crossing", "Watch the sea report and be ready to answer hard water.", "Under Sail", null);
  }

  const readyContract = activeContracts(state).find((contract) => contractCargoStatus(state, contract).ready);
  if (readyContract) {
    return order("deliver-contract", "Contracts", "Deliver ready work", "A contract can be completed at this port.", "Deliver", { kind: "completeContract", contractId: readyContract.id });
  }

  const contractFocus = routeContractFocus(state);
  if (contractFocus?.plan.status === "loadable") {
    return order(
      "load-contract",
      "Contracts",
      "Load the deadline cargo",
      `${contractFocus.plan.missing} units can be loaded now for the active job before speculative trade.`,
      "Load Job",
      { kind: "buyContractCargo", contractId: contractFocus.contract.id }
    );
  }
  if (contractFocus?.plan.status === "blocked" && creditCanUnblockContract(state, contractFocus)) {
    return order(
      "borrow-contract",
      "Credit",
      "Fund the active job",
      `${contractFocus.plan.missing} deadline units are blocked by cash. Borrowing keeps the contract from becoming dead weight.`,
      "Borrow",
      { kind: "borrow" }
    );
  }

  const stats = deriveShipStats(state);
  const hullRatio = state.hull / Math.max(1, stats.hullMax);
  if (hullRatio < 0.72 && state.cash >= 80) {
    return order("repair", "Ship", "Repair before the next leg", "Damaged hull makes storms, pirates, and cargo losses nastier.", "Repair", { kind: "repair" });
  }

  const held = bestHeldCargoOrder(state);
  if (held) return held;

  if (cargoUnits(state) > 0 && state.selectedPort !== state.currentPort) {
    const risk = routeRisk(state, state.currentPort, state.selectedPort);
    const quote = insuranceQuoteFor(state);
    if (!state.cargoInsurance && quote && state.cash >= quote.policy.premium && (risk >= 0.22 || cargoInsurableValue(state) >= 260)) {
      return order("insure", "Risk", "Cover the hold", "This route has enough cargo exposure to make insurance worth considering.", "Insure", { kind: "buyInsurance" });
    }
    return order("sail", "Route", "Commit to the crossing", "The hold is loaded and the route is plotted.", "Sail", { kind: "startVoyage" });
  }

  const firstCrew = crewCatalog.find((crew) => !state.crew.includes(crew.id) && state.cash >= crew.cost);
  if (firstCrew && state.day >= 4 && !state.crew.length) {
    return order("hire-crew", "Crew", "Hire a specialist", "Crew turn routes, prices, repairs, and encounters into build choices.", "Open Yard", { kind: "openTab", tab: "harbor" });
  }

  const buildOrder = bestBuildOrder(state);
  if (buildOrder) return buildOrder;

  const recoveryCredit = workingCapitalOrder(state);
  if (recoveryCredit) return recoveryCredit;

  const localOffer = state.contracts.find((contract) => contract.status === "available" && contract.originPortId === state.currentPort);
  if (localOffer && state.day >= 4 && !activeContracts(state).length) {
    return order("contract", "Contracts", "Take local work", "Contracts add deadlines, faction movement, and a reason to sail beyond the obvious spread.", "Open Board", { kind: "openTab", tab: "contracts" });
  }

  const rumorOrder = recentDocksideTip(state) ? bestRumorOrder(state) : null;
  if (rumorOrder) return rumorOrder;

  const loadOrder = bestLoadOrder(state);
  if (loadOrder) return loadOrder;

  return order("freeplay", "Captain", "Choose with intent", "No clean cargo, contract, refit, or rumor is live. Inspect Intel, then wait only as a defensive market reset.", "Open Intel", { kind: "openTab", tab: "intel" });
}

function bestHeldCargoOrder(state: GameState): CaptainOrder | null {
  const heldGoods = Object.entries(state.cargo).filter(([, quantity]) => quantity > 0);
  if (!heldGoods.length) return null;
  if (state.selectedPort !== state.currentPort) return null;

  const localSale = heldGoods
    .map(([goodId, quantity]) => {
      const outcome = cargoArrivalOutcomeFor({ ...state, cargo: { [goodId]: quantity } }, state.currentPort);
      return { goodId, margin: outcome.margin };
    })
    .sort((left, right) => right.margin - left.margin)[0];

  if (localSale && localSale.margin > 0 && !recentlyLoadedCargo(state, localSale.goodId)) {
    return order("sell-cargo", "Trade", "Take the profit", `This hold can clear here for ${signedMoney(localSale.margin)}.`, "Sell All", { kind: "sellAllGood", goodId: localSale.goodId });
  }

  const bestRoute = recommendRouteChoices(state, state.currentPort).find((choice) => choice.cargoUnits > 0);
  if (bestRoute) {
    return order(
      "plot-cargo",
      "Route",
      "Plot a buyer",
      `${bestRoute.goodName} points toward ${portName(bestRoute.sellPortId)} via ${bestRoute.tacticLabel.toLowerCase()}.`,
      "Plot Route",
      { kind: "plotRoute", portId: bestRoute.sellPortId, sailPlan: bestRoute.sailPlan }
    );
  }

  return null;
}

function bestBuildOrder(state: GameState): CaptainOrder | null {
  if (cargoUnits(state) > 0) return null;
  if (!recentProgressBeat(state) && runPhaseForDay(state.day).id === "early") return null;

  const ship = nextShipCandidate(state);
  if (ship && (runPhaseForDay(state.day).id !== "early" || state.cash >= ship.price + 900)) {
    return order(
      "buy-ship",
      "Build",
      `Command ${ship.name}`,
      `${statDeltaSummary(deriveShipStats(state), ship.stats)}. ${ship.note}`,
      "Buy Ship",
      { kind: "buyShip", shipId: ship.id }
    );
  }

  const refit = equipmentRecommendationsFor(state, 3).find((recommendation) => recommendation.affordable);
  if (!refit) return null;
  if (runPhaseForDay(state.day).id === "early" && state.cash < refit.price + 260) return null;

  return order(
    "buy-refit",
    "Build",
    `Install ${refit.item.name}`,
    `${refit.reason}: ${statDeltaSummary(deriveShipStats(state), deriveShipStats({ ...state, equipment: installEquipmentIds(state.equipment, refit.item) }))}.`,
    refit.replacing ? "Replace" : "Buy Refit",
    { kind: "buyEquipment", equipmentId: refit.item.id }
  );
}

function nextShipCandidate(state: GameState) {
  return shipCatalog
    .flatMap((ship) => {
      if (ship.price <= 0 || state.ownedShips.includes(ship.id)) return [];
      const preview = previewShip(state, ship.id);
      return preview && preview.affordable && preview.cargoFits
        ? [{ id: ship.id, name: ship.name, note: ship.note, price: yardPriceFor(state, ship), stats: preview.stats }]
        : [];
    })
    .sort((left, right) => left.price - right.price || left.name.localeCompare(right.name))[0] ?? null;
}

function recentProgressBeat(state: GameState) {
  return state.log.slice(0, 6).some((entry) => /^(Sold .* profit|Completed .* contract|Partial delivery|Contract work|Captain advanced)/i.test(entry.text));
}

function statDeltaSummary(before: ShipStats, after: ShipStats) {
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
  const pieces = (Object.keys(labels) as Array<keyof ShipStats>)
    .map((key) => ({ key, delta: after[key] - before[key] }))
    .filter((entry) => entry.delta > 0)
    .map((entry) => `+${entry.delta} ${labels[entry.key]}`);
  return pieces.length ? pieces.slice(0, 3).join(" | ") : "Build depth";
}

function recentlyLoadedCargo(state: GameState, goodId: string) {
  const goodName = goodId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const latest = state.log[0]?.text ?? "";
  return latest.startsWith("Loaded ") && latest.includes(goodName);
}

function bestLoadOrder(state: GameState): CaptainOrder | null {
  const choice = recommendRouteChoices(state, state.currentPort).find((entry) => entry.goodId);
  if (!choice?.goodId) return null;
  const plan = routeTradePlanFor({ ...state, sailPlan: choice.sailPlan }, choice.sellPortId, state.currentPort);
  if (!plan || plan.maxBuy <= 0) return null;
  return order(
    "load-cargo",
    "Trade",
    "Load a real spread",
    `${plan.goodName} to ${portName(choice.sellPortId)} via ${choice.tacticLabel.toLowerCase()} has ${signedMoney(choice.expectedProfit)} expected value.`,
    `Load ${plan.goodName}`,
    { kind: "buyMaxGood", goodId: plan.goodId }
  );
}

function bestRumorOrder(state: GameState): CaptainOrder | null {
  const event = state.events.find((entry) => entry.expires >= state.day && entry.portId === state.currentPort);
  if (!event) return null;
  const good = goods.find((entry) => entry.id === event.goodId);
  if (!good) return null;
  const daysLeft = Math.max(1, event.expires - state.day);

  if (event.kind === "shortage") {
    const held = state.cargo[event.goodId] || 0;
    if (held > 0) {
      return order(
        "rumor-sell",
        "Tip",
        `Sell into ${good.name} demand`,
        `${portName(state.currentPort)} pays up for ${daysLeft}d; clear ${held} held unit${held === 1 ? "" : "s"} before the bid cools.`,
        "Sell All",
        { kind: "sellAllGood", goodId: event.goodId }
      );
    }

    const supply = bestSupplyPortForShortage(state, event.goodId);
    if (supply) {
      return order(
        "rumor-source",
        "Tip",
        `Feed the ${good.name} shortage`,
        `${portName(state.currentPort)} pays up for ${daysLeft}d; ${portName(supply.portId)} has stock around ${moneyText(supply.price)}.`,
        "Plot Supply",
        { kind: "plotRoute", portId: supply.portId, sailPlan: supply.sailPlan }
      );
    }
  }

  const access = marketAccessForGood(state, state.currentPort, event.goodId);
  const buyPrice = priceFor(state, state.currentPort, event.goodId);
  if (event.kind === "glut" && access.allowed && access.availableStock > 0 && state.cash >= buyPrice) {
    const buyer = tradeOpportunityForGood(state, event.goodId, state.currentPort);
    const buyerText =
      buyer && buyer.riskAdjustedMargin > 0
        ? ` ${portName(buyer.sellPortId)} is the clean buyer at ${signedMoney(buyer.riskAdjustedMargin)} per unit.`
        : " Load while the harbor is soft, then compare routes.";
    return order(
      "rumor-buy",
      "Tip",
      `Load cheap ${good.name}`,
      `Glut holds for ${daysLeft}d at ${portName(state.currentPort)}.${buyerText}`,
      `Load ${good.name}`,
      { kind: "buyMaxGood", goodId: event.goodId }
    );
  }

  return null;
}

function creditCanUnblockContract(state: GameState, focus: NonNullable<ReturnType<typeof routeContractFocus>>) {
  if (state.cash >= focus.plan.cargoCost) return false;
  if (state.debt >= 2600) return false;
  return focus.plan.missing > 0 && focus.plan.cargoFits && focus.plan.marketAvailable >= focus.plan.missing && focus.plan.cargoCost <= state.cash + 400;
}

function workingCapitalOrder(state: GameState): CaptainOrder | null {
  if (state.debt >= 2600 || state.cash >= 160 || cargoUnits(state) > 0) return null;
  const routeChoice = recommendRouteChoices({ ...state, cash: state.cash + 400 }, state.currentPort).find((entry) => entry.goodId && entry.cargoUnits > 0 && entry.expectedProfit > 0);
  if (!routeChoice) return null;
  return order(
    "borrow-capital",
    "Credit",
    "Raise working capital",
    `${portName(routeChoice.sellPortId)} has a live ${routeChoice.goodName} route, but the hold needs cash before it can move.`,
    "Borrow",
    { kind: "borrow" }
  );
}

function bestSupplyPortForShortage(state: GameState, goodId: string) {
  return ports
    .filter((port) => port.id !== state.currentPort && port.exports.includes(goodId))
    .flatMap((port) => {
      const access = marketAccessForGood(state, port.id, goodId);
      if (!access.allowed || access.availableStock <= 0) return [];
      const risk = routeRisk(state, state.currentPort, port.id);
      const price = priceFor(state, port.id, goodId);
      return [
        {
          portId: port.id,
          price,
          risk,
          sailPlan: (risk >= 0.26 ? "cautious" : "balanced") as SailPlanId,
          score: price + risk * 180,
        },
      ];
    })
    .sort((left, right) => left.score - right.score)[0] ?? null;
}

function recentDocksideTip(state: GameState) {
  return state.log.slice(0, 6).some((entry) => entry.text.startsWith("Reward: dockside tip"));
}

function order(id: string, label: string, title: string, detail: string, actionLabel: string, target: CaptainOrderTarget | null, done = false): CaptainOrder {
  return { id, label, title, detail, actionLabel, target, done };
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function moneyText(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString("en-US")}`;
}

function portName(portId: string) {
  return ports.find((port) => port.id === portId)?.name ?? "the next port";
}

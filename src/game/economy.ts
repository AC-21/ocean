import { factions, goods, ports } from "./data";
import { crewRouteReadFor, type CrewRouteRead } from "./crewIdentity";
import { hasCaptainSkillMastery } from "./captainSkills";
import { clamp, pick, randomBetween, uid } from "./math";
import { routeFactionPressureFor, type FactionPressureSignal } from "./factionPressure";
import { marketHistoryTradeBiasFor, type MarketHistoryTradeBias } from "./marketHistory";
import { marketAccessForStanding, servicePriceModifier, standingBenefits, type MarketAccessQuote } from "./politics";
import { cargoUnits, routeConditions, routeDays, routeRisk, routeWearEstimate, shippingLanePressure } from "./routing";
import { deriveShipStats } from "./stats";
import type { GameState, Market, MarketStock, PoliticalEvent, RumorEvent, SailPlanId, Trend } from "./types";

const trendLabels = {
  up: ["merchant rush", "winter buying", "naval contracts", "scarcity premium"],
  down: ["warehouse overflow", "peace dividend", "harvest flood", "credit freeze"],
};

export type TradeOpportunity = {
  goodId: string;
  buyPortId: string;
  sellPortId: string;
  buyPrice: number;
  sellPrice: number;
  grossMargin: number;
  riskAdjustedMargin: number;
  marginPerHold: number;
  days: number;
  risk: number;
  trendLabel: string;
  reason: string;
  routeWindow: RouteWindowForecast;
  historyBias: MarketHistoryTradeBias;
  politicalRead: FactionPressureSignal | null;
};

export type RouteChoiceKind = "profit" | "gamble" | "shelter";

export type RouteTradePlan = {
  goodId: string;
  goodName: string;
  buyPortId: string;
  sellPortId: string;
  buyPrice: number;
  sellPrice: number;
  maxBuy: number;
  grossMargin: number;
  riskAdjustedMargin: number;
  marginPerHold: number;
  historyBias: MarketHistoryTradeBias;
};

export type CargoArrivalOutcome = {
  units: number;
  margin: number;
};

export type RouteChoice = {
  kind: RouteChoiceKind;
  buyPortId: string;
  sellPortId: string;
  sailPlan: SailPlanId;
  goodId: string | null;
  goodName: string;
  expectedProfit: number;
  grossUpside: number;
  cargoUnits: number;
  days: number;
  risk: number;
  wear: number;
  speedDelta: number;
  tacticLabel: string;
  crewRead: CrewRouteRead;
  crewScore: number;
  reason: string;
  routeWindow: RouteWindowForecast;
  historyBias: MarketHistoryTradeBias | null;
  politicalRead: FactionPressureSignal | null;
};

export type RouteWindowDay = {
  offset: number;
  day: number;
  days: number;
  risk: number;
  riskPercent: number;
  wear: number;
  speedDelta: number;
  tacticLabel: string;
  seaLabel: string;
  stormLabel: string;
  score: number;
};

export type RouteWindowForecast = {
  windows: RouteWindowDay[];
  today: RouteWindowDay;
  next: RouteWindowDay | null;
  best: RouteWindowDay;
  deltaDays: number;
  deltaRisk: number;
  deltaWear: number;
  deltaSpeed: number;
  label: string;
  advice: string;
};

export type PortLogisticsPressure = {
  portId: string;
  pressure: number;
  label: string;
  importModifier: number;
  exportModifier: number;
};

export type FreightPressureKind = "import-pressure" | "export-surplus" | "political-friction" | "stockout" | "quiet";

export type FreightPressureSignal = {
  portId: string;
  goodId: string;
  kind: FreightPressureKind;
  label: string;
  detail: string;
  score: number;
  importDemand: number;
  exportSurplus: number;
  politicalFriction: number;
};

export type MarketForecastKind = "climbing" | "cooling" | "buy-window" | "squeeze" | "steady";

export type MarketForecastSignal = {
  portId: string;
  goodId: string;
  kind: MarketForecastKind;
  label: string;
  detail: string;
  confidence: number;
  currentPrice: number;
  expectedPrice: number;
  expectedDelta: number;
  expectedDeltaPercent: number;
  drivers: string[];
};

export type BrokerPacketKind = "destination-shortage" | "local-glut";

export type BrokerPacketQuote = {
  affordable: boolean;
  cost: number;
  kind: BrokerPacketKind;
  goodId: string;
  portId: string;
  label: string;
  detail: string;
  expires: number;
  stockDelta: number;
  rumorMultiplier: number;
  rumorKind: RumorEvent["kind"];
};

export type MarketStockLevel = {
  stock: number;
  capacity: number;
  fill: number;
  label: "empty" | "thin" | "normal" | "deep" | "glut";
  priceModifier: number;
};

export type GoodMarketAccess = MarketAccessQuote & {
  stock: number;
  availableStock: number;
};

export function makeMarket(): Market {
  const market: Market = {};
  for (const port of ports) {
    market[port.id] = {};
    for (const good of goods) {
      let multiplier = randomBetween(0.82, 1.22);
      if (port.exports.includes(good.id)) multiplier *= randomBetween(0.58, 0.82);
      if (port.imports.includes(good.id)) multiplier *= randomBetween(1.18, 1.56);
      market[port.id][good.id] = Math.max(8, Math.round(good.base * multiplier));
    }
  }
  return market;
}

export function makeMarketStock(): MarketStock {
  const marketStock: MarketStock = {};
  for (const port of ports) {
    marketStock[port.id] = {};
    for (const good of goods) {
      const capacity = marketStockCapacity(port.id, good.id);
      const target = marketStockTarget(port.id, good.id);
      const spread = port.exports.includes(good.id) ? 0.24 : port.imports.includes(good.id) ? 0.18 : 0.22;
      marketStock[port.id][good.id] = clampStock(Math.round(target * randomBetween(1 - spread, 1 + spread)), capacity);
    }
  }
  return marketStock;
}

export function normalizeMarketStock(stock?: Partial<MarketStock> | null): MarketStock {
  const normalized: MarketStock = {};
  for (const port of ports) {
    normalized[port.id] = {};
    for (const good of goods) {
      const capacity = marketStockCapacity(port.id, good.id);
      const fallback = marketStockTarget(port.id, good.id);
      const value = stock?.[port.id]?.[good.id] ?? fallback;
      normalized[port.id][good.id] = clampStock(Math.round(value), capacity);
    }
  }
  return normalized;
}

export function marketStockCapacity(portId: string, goodId: string) {
  const port = ports.find((entry) => entry.id === portId);
  const good = goods.find((entry) => entry.id === goodId);
  const cargoDrag = good?.cargo === 2 ? -2 : 0;
  const exportBoost = port?.exports.includes(goodId) ? 7 : 0;
  const importConstraint = port?.imports.includes(goodId) ? -4 : 0;
  return Math.max(4, 11 + cargoDrag + exportBoost + importConstraint);
}

export function marketStockLevel(state: Pick<GameState, "marketStock">, portId: string, goodId: string): MarketStockLevel {
  const capacity = marketStockCapacity(portId, goodId);
  const fallback = marketStockTarget(portId, goodId);
  const rawStock = state.marketStock?.[portId]?.[goodId] ?? fallback;
  const stock = clampStock(Math.round(rawStock), capacity);
  const fill = stock / capacity;
  const label =
    stock <= 0 ? "empty" : fill <= 0.26 ? "thin" : fill >= 1.04 ? "glut" : fill >= 0.76 ? "deep" : "normal";
  const scarcity = clamp(0.58 - fill, -0.54, 0.58);
  return {
    stock,
    capacity,
    fill: Number(fill.toFixed(2)),
    label,
    priceModifier: clamp(1 + scarcity * 0.24, 0.86, 1.14),
  };
}

export function marketStockText(level: MarketStockLevel) {
  return `${level.label} ${level.stock}/${level.capacity}`;
}

export function marketAccessForGood(state: Pick<GameState, "day" | "politicalEvents" | "factionStanding" | "marketStock">, portId: string, goodId: string): GoodMarketAccess {
  const port = ports.find((entry) => entry.id === portId);
  const faction = factions.find((entry) => entry.id === port?.faction);
  const stock = marketStockLevel(state, portId, goodId).stock;
  if (!port || !faction) {
    return {
      level: "restricted",
      label: "Unknown access",
      allowed: false,
      priceModifier: 1,
      tariffModifier: 1,
      stockModifier: 0,
      inspectionModifier: 0,
      reason: "unknown port",
      stock,
      availableStock: 0,
    };
  }

  const access = marketAccessForStanding(state.factionStanding[port.faction] ?? 0, {
    hasPermit: hasActiveMarketPermit(state, port.faction),
    isExport: port.exports.includes(goodId),
    isImport: port.imports.includes(goodId),
    isTariffed: faction.tariffGoods.includes(goodId),
  });
  const availableStock =
    access.allowed && stock > 0 ? Math.min(stock, Math.max(1, Math.floor(stock * access.stockModifier))) : 0;
  return { ...access, stock, availableStock };
}

export function adjustMarketStock(state: GameState, portId: string, goodId: string, delta: number) {
  state.marketStock = normalizeMarketStock(state.marketStock);
  const capacity = marketStockCapacity(portId, goodId);
  const current = state.marketStock[portId]?.[goodId] ?? marketStockTarget(portId, goodId);
  state.marketStock[portId][goodId] = clampStock(current + delta, capacity);
  return state.marketStock[portId][goodId];
}

export function applyMarketTradeImpact(state: GameState, portId: string, goodId: string, direction: "buy" | "sell") {
  const good = goods.find((entry) => entry.id === goodId);
  if (!good) return;
  const current = state.market[portId]?.[goodId] ?? good.base;
  const impulse = good.volatility * 1.7 + 0.014;
  const multiplier = direction === "buy" ? 1 + impulse : 1 - impulse * 0.8;
  state.market[portId][goodId] = Math.max(6, Math.round(current * multiplier));
}

export function makeTrends(day = 1) {
  return Object.fromEntries(goods.map((good) => [good.id, makeTrend(good.id, day)]));
}

export function makeTrend(goodId: string, day: number): Trend {
  const direction: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  return {
    direction,
    momentum: randomBetween(0.45, 1.15),
    label: pick(direction > 0 ? trendLabels.up : trendLabels.down),
    expires: day + Math.floor(randomBetween(9, 17)),
  };
}

export function priceFor(state: GameState, portId: string, goodId: string) {
  const good = goods.find((entry) => entry.id === goodId);
  const port = ports.find((entry) => entry.id === portId);
  if (!good || !port) return 0;

  let price = state.market[portId]?.[goodId] ?? good.base;
  const trend = state.trends[goodId];
  if (trend) price *= 1 + trend.direction * trend.momentum * good.volatility * 1.8;

  for (const event of state.events) {
    if (event.portId === portId && event.goodId === goodId && event.expires >= state.day) {
      price *= event.multiplier;
    }
  }

  for (const event of state.politicalEvents) {
    if (event.expires < state.day) continue;
    if (event.factionId !== port.faction) continue;
    if (!event.goodId || event.goodId === goodId) price *= event.priceModifier;
  }

  const logistics = portLogisticsPressure(state, portId);
  if (port.imports.includes(goodId)) price *= logistics.importModifier;
  if (port.exports.includes(goodId)) price *= logistics.exportModifier;
  price *= marketStockLevel(state, portId, goodId).priceModifier;

  const standing = state.factionStanding[port.faction] ?? 0;
  const politics = standingBenefits(standing);
  const access = marketAccessForGood(state, portId, goodId);
  const negotiationDiscount = 1 - deriveShipStats(state).negotiation * 0.012 - clamp(standing, -25, 40) * 0.001;
  return Math.max(5, Math.round(price * access.priceModifier * politics.priceModifier * clamp(negotiationDiscount, 0.88, 1.08)));
}

export function sellPriceFor(state: GameState, portId: string, goodId: string) {
  const brokerSkill = deriveShipStats(state).negotiation;
  const bidRate = clamp(0.86 + brokerSkill * 0.008, 0.86, 0.94);
  return Math.max(4, Math.round(priceFor(state, portId, goodId) * bidRate));
}

export function tradeOpportunityForGood(state: GameState, goodId: string, buyPortId = state.currentPort): TradeOpportunity | null {
  const good = goods.find((entry) => entry.id === goodId);
  if (!good) return null;

  const buyPrice = priceFor(state, buyPortId, goodId);
  const options = ports
    .filter((port) => port.id !== buyPortId)
    .map((port) => {
      const sellPrice = sellPriceFor(state, port.id, goodId);
      const days = routeDays(state, buyPortId, port.id);
      const risk = routeRisk(state, buyPortId, port.id);
      const grossMargin = sellPrice - buyPrice;
      const riskReserve = Math.round(sellPrice * risk * 0.18 + days * 2.4);
      const riskAdjustedMargin = grossMargin - riskReserve;
      const marginPerHold = Math.round(riskAdjustedMargin / good.cargo);
      const historyBias = marketHistoryTradeBiasFor(state, buyPortId, port.id, goodId);
      const politicalRead = routeFactionPressureFor(state, buyPortId, port.id);
      return {
        goodId,
        buyPortId,
        sellPortId: port.id,
        buyPrice,
        sellPrice,
        grossMargin,
        riskAdjustedMargin,
        marginPerHold,
        days,
        risk,
        trendLabel: trendText(state, goodId),
        reason: tradeOpportunityReason(state, goodId, buyPortId, port.id, grossMargin, risk),
        routeWindow: routeWindowForecast(state, buyPortId, port.id),
        historyBias,
        politicalRead,
      };
    })
    .sort((left, right) => {
      return (
        right.riskAdjustedMargin + right.historyBias.score - (left.riskAdjustedMargin + left.historyBias.score) ||
        right.grossMargin - left.grossMargin ||
        left.days - right.days
      );
    });

  return options[0] ?? null;
}

export function topTradeOpportunities(state: GameState, buyPortId = state.currentPort, limit = 4) {
  return goods
    .map((good) => tradeOpportunityForGood(state, good.id, buyPortId))
    .filter((entry): entry is TradeOpportunity => Boolean(entry))
    .sort((left, right) => {
      return (
        right.marginPerHold + right.historyBias.score - (left.marginPerHold + left.historyBias.score) ||
        right.riskAdjustedMargin + right.historyBias.score - (left.riskAdjustedMargin + left.historyBias.score) ||
        left.days - right.days
      );
    })
    .slice(0, limit);
}

export function tradeOpportunityReason(
  state: GameState,
  goodId: string,
  buyPortId: string,
  sellPortId: string,
  grossMargin = sellPriceFor(state, sellPortId, goodId) - priceFor(state, buyPortId, goodId),
  risk = routeRisk(state, buyPortId, sellPortId)
) {
  const buyPort = ports.find((port) => port.id === buyPortId);
  const sellPort = ports.find((port) => port.id === sellPortId);
  const sellEvent = state.events.find((event) => event.expires >= state.day && event.portId === sellPortId && event.goodId === goodId);
  const buyStock = marketStockLevel(state, buyPortId, goodId);
  const trend = state.trends[goodId];

  if (sellEvent?.kind === "shortage") return "shortage";
  const access = marketAccessForGood(state, buyPortId, goodId);
  if (!access.allowed) return access.reason;
  if (access.level === "inside" || access.level === "priority") return access.reason;
  if (access.reason === "tariff relief" || access.reason === "tariff watch") return access.reason;
  const sellSignal = freightPressureSignalFor(state, sellPortId, goodId);
  const buySignal = freightPressureSignalFor(state, buyPortId, goodId);
  if (sellSignal.kind === "stockout") return "stockout demand";
  const historyBias = marketHistoryTradeBiasFor(state, buyPortId, sellPortId, goodId);
  if (historyBias.favorable) return historyBias.label.toLowerCase();
  if (sellSignal.kind === "import-pressure") return sellSignal.label.toLowerCase();
  if (buySignal.kind === "export-surplus") return buySignal.label.toLowerCase();
  if (sellPort?.imports.includes(goodId)) return "import demand";
  if (buyPort?.exports.includes(goodId) && buyStock.label === "deep") return "deep export";
  if (buyStock.label === "glut") return "glut buy";
  if (trend?.direction && trend.direction > 0) return "rising trend";
  if (risk <= 0.16) return "safe lane";
  if (grossMargin > 0) return "strong bid";
  return "thin spread";
}

export function routeTradePlanFor(state: GameState, destinationId: string, buyPortId = state.currentPort): RouteTradePlan | null {
  const stats = deriveShipStats(state);
  const holdRoom = stats.cargoCap - cargoUnits(state);
  if (holdRoom <= 0 || destinationId === buyPortId) return null;

  const days = routeDays(state, buyPortId, destinationId);
  const risk = routeRisk(state, buyPortId, destinationId);
  const options = goods.map((good) => {
    const buyPrice = priceFor(state, buyPortId, good.id);
    const sellPrice = sellPriceFor(state, destinationId, good.id);
    const access = marketAccessForGood(state, buyPortId, good.id);
    const maxByHold = Math.floor(holdRoom / good.cargo);
    const maxByCash = Math.floor(state.cash / Math.max(1, buyPrice));
    const maxBuy = Math.max(0, Math.min(access.availableStock, maxByHold, maxByCash));
    const grossMargin = sellPrice - buyPrice;
    const riskReserve = Math.round(sellPrice * risk * 0.18 + days * 2.4);
    const riskAdjustedMargin = grossMargin - riskReserve;
    const historyBias = marketHistoryTradeBiasFor(state, buyPortId, destinationId, good.id);
    return {
      goodId: good.id,
      goodName: good.name,
      buyPortId,
      sellPortId: destinationId,
      buyPrice,
      sellPrice,
      maxBuy,
      grossMargin,
      riskAdjustedMargin,
      marginPerHold: Math.round(riskAdjustedMargin / good.cargo),
      historyBias,
    };
  });

  return options.sort((left, right) => {
    return (
      right.marginPerHold + right.historyBias.score - (left.marginPerHold + left.historyBias.score) ||
      right.riskAdjustedMargin + right.historyBias.score - (left.riskAdjustedMargin + left.historyBias.score) ||
      right.grossMargin - left.grossMargin
    );
  })[0] ?? null;
}

export function cargoArrivalOutcomeFor(state: GameState, destinationId: string, originId = state.currentPort): CargoArrivalOutcome {
  let units = 0;
  let margin = 0;
  for (const good of goods) {
    const quantity = state.cargo[good.id] || 0;
    if (quantity <= 0) continue;
    const basis = state.cargoBasis[good.id] ?? sellPriceFor(state, originId, good.id);
    units += quantity;
    margin += (sellPriceFor(state, destinationId, good.id) - basis) * quantity;
  }
  return { units, margin };
}

export function recommendRouteChoices(state: GameState, buyPortId = state.currentPort): RouteChoice[] {
  const candidates = routeChoiceCandidates(state, buyPortId);
  const used = new Set<string>();
  const choices: RouteChoice[] = [];
  const pushChoice = (kind: RouteChoiceKind, pool: RouteChoice[], fallback: RouteChoice[]) => {
    const distinct = pool.find((choice) => !used.has(routeChoiceKey(choice)));
    const picked = distinct ?? pool[0] ?? fallback.find((choice) => !used.has(routeChoiceKey(choice))) ?? fallback[0];
    if (!picked) return;
    const choice = { ...picked, kind, reason: routeChoiceReason(kind, picked) };
    choices.push(choice);
    used.add(routeChoiceKey(choice));
  };

  const actionable = candidates.filter((choice) => choice.cargoUnits > 0);
  const profitable = actionable
    .filter((choice) => choice.expectedProfit > 0)
    .sort((left, right) => right.expectedProfit + right.crewScore * 22 - (left.expectedProfit + left.crewScore * 22) || right.grossUpside - left.grossUpside || left.risk - right.risk);
  const gambles = actionable
    .filter((choice) => choice.grossUpside > 0)
    .sort((left, right) => gambleScore(right) - gambleScore(left) || right.expectedProfit + right.crewScore * 16 - (left.expectedProfit + left.crewScore * 16));
  const shelters = actionable
    .filter((choice) => choice.expectedProfit >= 0)
    .sort((left, right) => left.risk - right.risk || left.wear - right.wear || right.crewScore - left.crewScore || left.days - right.days || right.expectedProfit - left.expectedProfit);
  const fallback = candidates.sort((left, right) => right.expectedProfit + right.crewScore * 12 - (left.expectedProfit + left.crewScore * 12) || left.risk - right.risk);

  pushChoice("profit", profitable, fallback);
  pushChoice("gamble", gambles, fallback);
  pushChoice("shelter", shelters, fallback);

  return choices;
}

const routeChoicePlans: SailPlanId[] = ["balanced", "hard", "cautious", "quiet"];

function routeChoiceCandidates(state: GameState, buyPortId: string): RouteChoice[] {
  return ports
    .filter((port) => port.id !== buyPortId)
    .flatMap((destination) => {
      return routeChoicePlans.map((sailPlan) => {
        const routeState = { ...state, sailPlan };
        const tradePlan = routeTradePlanFor(routeState, destination.id, buyPortId);
        const heldCargo = cargoArrivalOutcomeFor(routeState, destination.id, buyPortId);
        const plannedUnits = tradePlan && tradePlan.maxBuy > 0 ? tradePlan.maxBuy : 0;
        const plannedProfit = plannedUnits * (tradePlan?.riskAdjustedMargin ?? 0);
        const plannedUpside = plannedUnits * (tradePlan?.grossMargin ?? 0);
        const days = routeDays(routeState, buyPortId, destination.id);
        const risk = routeRisk(routeState, buyPortId, destination.id);
        const wear = routeWearEstimate(routeState, buyPortId, destination.id).hullWear;
        const conditions = routeConditions(routeState, buyPortId, destination.id);
        const routeWindow = routeWindowForecast(routeState, buyPortId, destination.id);
        const politicalRead = routeFactionPressureFor(routeState, buyPortId, destination.id);
        const expectedProfit = heldCargo.margin + plannedProfit;
        const grossUpside = heldCargo.margin + plannedUpside;
        const totalCargoUnits = heldCargo.units + plannedUnits;
        const crewRead = crewRouteReadFor(routeState, buyPortId, destination.id, {
          cargoUnits: totalCargoUnits,
          expectedProfit,
        });
        return {
          kind: "profit" as RouteChoiceKind,
          buyPortId,
          sellPortId: destination.id,
          sailPlan,
          goodId: tradePlan?.goodId ?? bestHeldCargoGoodId(routeState, destination.id, buyPortId),
          goodName: tradePlan?.goodName ?? bestHeldCargoGoodName(routeState, destination.id, buyPortId),
          expectedProfit,
          grossUpside,
          cargoUnits: totalCargoUnits,
          days,
          risk,
          wear,
          speedDelta: conditions.speedDelta,
          tacticLabel: conditions.tacticLabel,
          crewRead,
          crewScore: crewRead.score,
          reason: "",
          routeWindow,
          historyBias: tradePlan?.historyBias ?? null,
          politicalRead,
        };
      });
    });
}

function bestHeldCargoGoodId(state: GameState, destinationId: string, originId: string) {
  return bestHeldCargoGood(state, destinationId, originId)?.id ?? null;
}

function bestHeldCargoGoodName(state: GameState, destinationId: string, originId: string) {
  return bestHeldCargoGood(state, destinationId, originId)?.name ?? "Position";
}

function bestHeldCargoGood(state: GameState, destinationId: string, originId: string) {
  return goods
    .filter((good) => (state.cargo[good.id] || 0) > 0)
    .map((good) => {
      const quantity = state.cargo[good.id] || 0;
      const basis = state.cargoBasis[good.id] ?? sellPriceFor(state, originId, good.id);
      return {
        ...good,
        margin: quantity > 0 ? (sellPriceFor(state, destinationId, good.id) - basis) * quantity : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((left, right) => right.margin - left.margin)[0];
}

function routeChoiceKey(choice: RouteChoice) {
  return `${choice.sellPortId}:${choice.goodId ?? "position"}`;
}

function gambleScore(choice: RouteChoice) {
  const sailPressure = choice.sailPlan === "hard" ? 140 : choice.sailPlan === "balanced" ? 44 : choice.sailPlan === "quiet" ? -36 : 0;
  return choice.grossUpside * (1 + choice.risk * 0.82) + choice.risk * 220 + sailPressure - choice.wear * 3;
}

function routeChoiceReason(kind: RouteChoiceKind, choice: RouteChoice) {
  const crew = choice.crewRead.entries.length ? `, ${choice.crewRead.compact}` : "";
  const tape = choice.historyBias?.favorable ? `, ${choice.historyBias.label.toLowerCase()}` : "";
  const politics = choice.politicalRead ? `, ${choice.politicalRead.label.toLowerCase()}` : "";
  if (kind === "profit") return `${choice.goodName} spread, ${choice.tacticLabel}, ${signedPercent(choice.speedDelta)}, ${choice.routeWindow.label}${tape}${politics}${crew}`;
  if (kind === "gamble") return `${choice.goodName} upside, ${choice.tacticLabel}, ${Math.round(choice.risk * 100)}% risk, ${choice.routeWindow.label}${tape}${politics}${crew}`;
  return `${choice.tacticLabel}, ${Math.round(choice.risk * 100)}% risk, ${choice.wear} hull, ${choice.routeWindow.label}${politics}${crew}`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export function routeWindowForecast(state: GameState, fromId: string, toId: string, horizon = 3): RouteWindowForecast {
  const windows = Array.from({ length: Math.max(1, horizon + 1) }, (_, offset) => {
    const forecastState = { ...state, day: state.day + offset };
    const conditions = routeConditions(forecastState, fromId, toId);
    const wear = routeWearEstimate(forecastState, fromId, toId).hullWear;
    const risk = routeRisk(forecastState, fromId, toId);
    const riskPercent = Math.round(risk * 100);
    const days = routeDays(forecastState, fromId, toId);
    const score = routeWindowScore({ days, riskPercent, wear, speedDelta: conditions.speedDelta });
    return {
      offset,
      day: forecastState.day,
      days,
      risk,
      riskPercent,
      wear,
      speedDelta: conditions.speedDelta,
      tacticLabel: conditions.tacticLabel,
      seaLabel: conditions.seaLabel,
      stormLabel: conditions.stormLabel,
      score,
    };
  });
  const today = windows[0];
  const next = windows[1] ?? null;
  const best = [...windows].sort((left, right) => left.score - right.score || left.offset - right.offset)[0] ?? today;
  const deltaDays = best.days - today.days;
  const deltaRisk = best.riskPercent - today.riskPercent;
  const deltaWear = best.wear - today.wear;
  const deltaSpeed = best.speedDelta - today.speedDelta;
  const improvement = today.score - best.score;
  const nextPenalty = next ? next.score - today.score : 0;
  const meaningfulChange = improvement >= 5 || Math.abs(deltaRisk) >= 4 || Math.abs(deltaSpeed) >= 6 || Math.abs(deltaWear) >= 2 || deltaDays !== 0;
  const label =
    best.offset > 0 && meaningfulChange
      ? `Better in ${best.offset}d`
      : nextPenalty >= 5
        ? "Closing window"
        : today.speedDelta >= 10 && today.riskPercent <= 28
          ? "Fast window"
          : today.riskPercent >= 40 || today.wear >= 9
            ? "Rough window"
            : "Steady window";

  return {
    windows,
    today,
    next,
    best,
    deltaDays,
    deltaRisk,
    deltaWear,
    deltaSpeed,
    label,
    advice: routeWindowAdvice({ label, today, next, best, horizon: windows.length - 1, deltaDays, deltaRisk, deltaWear, deltaSpeed }),
  };
}

function routeWindowScore({ days, riskPercent, wear, speedDelta }: Pick<RouteWindowDay, "days" | "riskPercent" | "wear" | "speedDelta">) {
  return Number((days * 20 + riskPercent * 0.74 + wear * 3.5 - speedDelta * 0.48).toFixed(2));
}

function routeWindowAdvice({
  label,
  today,
  next,
  best,
  horizon,
  deltaDays,
  deltaRisk,
  deltaWear,
  deltaSpeed,
}: {
  label: string;
  today: RouteWindowDay;
  next: RouteWindowDay | null;
  best: RouteWindowDay;
  horizon: number;
  deltaDays: number;
  deltaRisk: number;
  deltaWear: number;
  deltaSpeed: number;
}) {
  if (best.offset > 0 && label.startsWith("Better")) return `Wait ${best.offset}d: ${routeWindowDeltaText(deltaDays, deltaRisk, deltaWear, deltaSpeed)}`;
  if (label === "Closing window" && next) {
    return `Sail now: tomorrow ${routeWindowDeltaText(next.days - today.days, next.riskPercent - today.riskPercent, next.wear - today.wear, next.speedDelta - today.speedDelta)}`;
  }
  if (label === "Fast window") return `Tradewinds favor ${today.tacticLabel.toLowerCase()}`;
  if (label === "Rough window") return `Price should pay for ${today.wear} wear`;
  return `No better set next ${horizon}d`;
}

function routeWindowDeltaText(days: number, risk: number, wear: number, speed: number) {
  const parts: string[] = [];
  if (days !== 0) parts.push(`${days > 0 ? "+" : ""}${days}d`);
  if (risk !== 0) parts.push(`${risk > 0 ? "+" : ""}${risk}pt risk`);
  if (wear !== 0) parts.push(`${wear > 0 ? "+" : ""}${wear} wear`);
  if (speed !== 0) parts.push(`${speed > 0 ? "+" : ""}${speed}% speed`);
  return parts.length ? parts.slice(0, 3).join(" | ") : "similar water";
}

export function portLogisticsPressure(state: GameState, portId: string): PortLogisticsPressure {
  const port = ports.find((entry) => entry.id === portId);
  if (!port) {
    return { portId, pressure: 0, label: "unknown harbor", importModifier: 1, exportModifier: 1 };
  }

  const inbound = ports.filter((entry) => entry.id !== portId);
  const seaPressure = inbound.length
    ? inbound.reduce((sum, origin) => sum + shippingLanePressure(state.day, origin.id, portId), 0) / inbound.length
    : 0;
  const politicalPressure = state.politicalEvents
    .filter((event) => event.expires >= state.day && event.factionId === port.faction)
    .reduce((sum, event) => {
      if (event.kind === "strike") return sum + 0.13;
      if (event.kind === "inspection") return sum + 0.08;
      if (event.kind === "tariff") return sum + 0.04;
      if (event.kind === "convoy") return sum - 0.08;
      if (event.kind === "permit") return sum - 0.03;
      return sum;
    }, 0);
  const pressure = clamp(seaPressure + politicalPressure, 0, 1);

  return {
    portId,
    pressure: Number(pressure.toFixed(3)),
    label: pressure > 0.68 ? "strained freight" : pressure > 0.42 ? "costly freight" : pressure > 0.22 ? "moving freight" : "easy freight",
    importModifier: 1 + pressure * 0.14,
    exportModifier: 1 - pressure * 0.045,
  };
}

export function freightPressureSignalFor(state: GameState, portId: string, goodId: string): FreightPressureSignal {
  const port = ports.find((entry) => entry.id === portId);
  const good = goods.find((entry) => entry.id === goodId);
  if (!port || !good) {
    return {
      portId,
      goodId,
      kind: "quiet",
      label: "Unknown freight",
      detail: "no market signal",
      score: 0,
      importDemand: 0,
      exportSurplus: 0,
      politicalFriction: 0,
    };
  }

  const stock = marketStockLevel(state, portId, goodId);
  const logistics = portLogisticsPressure(state, portId);
  const trend = state.trends[goodId];
  const rumor = state.events.find((event) => event.expires >= state.day && event.portId === portId && event.goodId === goodId);
  const politics = state.politicalEvents.filter((event) => {
    return event.expires >= state.day && event.factionId === port.faction && (!event.goodId || event.goodId === goodId);
  });
  const politicalFriction = clamp(
    politics.reduce((sum, event) => {
      if (event.kind === "strike") return sum + 0.28;
      if (event.kind === "inspection") return sum + 0.2;
      if (event.kind === "tariff") return sum + 0.16;
      if (event.kind === "convoy") return sum - 0.1;
      if (event.kind === "permit") return sum - 0.05;
      return sum;
    }, 0),
    0,
    0.6
  );

  const importDemand = clamp(
    (port.imports.includes(goodId) ? logistics.pressure * 0.55 + Math.max(0, 0.56 - stock.fill) * 0.62 : Math.max(0, 0.3 - stock.fill) * 0.3) +
      (rumor?.kind === "shortage" ? 0.28 : 0) +
      (trend?.direction && trend.direction > 0 ? trend.momentum * good.volatility * 1.15 : 0) +
      politicalFriction * 0.18,
    0,
    1
  );
  const exportSurplus = clamp(
    (port.exports.includes(goodId) ? Math.max(0, stock.fill - 0.64) * 0.78 + Math.max(0, 0.36 - logistics.pressure) * 0.22 : 0) +
      (rumor?.kind === "glut" ? 0.25 : 0) +
      (trend?.direction && trend.direction < 0 ? trend.momentum * good.volatility * 0.95 : 0),
    0,
    1
  );
  const score = Number(Math.max(importDemand, exportSurplus, politicalFriction).toFixed(3));
  const kind: FreightPressureKind =
    stock.stock <= 0 && (port.imports.includes(goodId) || rumor?.kind === "shortage")
      ? "stockout"
      : importDemand >= 0.44 && importDemand >= exportSurplus
        ? "import-pressure"
        : exportSurplus >= 0.4
          ? "export-surplus"
          : politicalFriction >= 0.24
            ? "political-friction"
            : "quiet";
  const label = freightPressureLabel(kind, logistics.pressure, politicalFriction);
  const detailParts = [marketStockText(stock), logistics.label];
  if (politics.length) detailParts.push(politics.map((event) => event.kind).slice(0, 2).join("/"));
  if (rumor) detailParts.push(rumor.kind);

  return {
    portId,
    goodId,
    kind,
    label,
    detail: detailParts.join(" | "),
    score,
    importDemand: Number(importDemand.toFixed(3)),
    exportSurplus: Number(exportSurplus.toFixed(3)),
    politicalFriction: Number(politicalFriction.toFixed(3)),
  };
}

export function topFreightPressureSignals(state: GameState, limit = 5): FreightPressureSignal[] {
  return ports
    .flatMap((port) => goods.map((good) => freightPressureSignalFor(state, port.id, good.id)))
    .sort((left, right) => right.score - left.score || signalPriority(right.kind) - signalPriority(left.kind) || portByName(left.portId).localeCompare(portByName(right.portId)))
    .slice(0, limit);
}

export function marketForecastFor(state: GameState, portId: string, goodId: string): MarketForecastSignal {
  const port = ports.find((entry) => entry.id === portId);
  const good = goods.find((entry) => entry.id === goodId);
  if (!port || !good) {
    return {
      portId,
      goodId,
      kind: "steady",
      label: "Unknown market",
      detail: "no forecast",
      confidence: 0,
      currentPrice: 0,
      expectedPrice: 0,
      expectedDelta: 0,
      expectedDeltaPercent: 0,
      drivers: [],
    };
  }

  const currentPrice = priceFor(state, portId, goodId);
  const trend = state.trends[goodId];
  const stock = marketStockLevel(state, portId, goodId);
  const pressure = freightPressureSignalFor(state, portId, goodId);
  const logistics = portLogisticsPressure(state, portId);
  const access = marketAccessForGood(state, portId, goodId);
  const rumor = state.events.find((event) => event.expires >= state.day && event.portId === portId && event.goodId === goodId);
  const politicalEvents = state.politicalEvents.filter((event) => {
    return event.expires >= state.day && event.factionId === port.faction && (!event.goodId || event.goodId === goodId);
  });

  const trendBias = trend ? trend.direction * trend.momentum * good.volatility * 1.18 : 0;
  const stockBias = clamp((0.58 - stock.fill) * 0.18, -0.09, 0.11);
  const freightBias = port.imports.includes(goodId)
    ? logistics.pressure * 0.12
    : port.exports.includes(goodId)
      ? -Math.max(0, 0.42 - logistics.pressure) * 0.08
      : logistics.pressure * 0.035;
  const politicalBias = clamp(
    politicalEvents.reduce((sum, event) => sum + (event.priceModifier - 1) * (event.kind === "convoy" || event.kind === "permit" ? 0.7 : 1), 0),
    -0.1,
    0.16
  );
  const rumorBias = rumor ? clamp((rumor.multiplier - 1) * 0.28, -0.16, 0.22) : 0;
  const accessBias = clamp((access.priceModifier - 1) * 0.5, -0.12, 0.15);
  const netBias = clamp(trendBias + stockBias + freightBias + politicalBias + rumorBias + accessBias, -0.28, 0.34);

  const expectedPrice = Math.max(4, Math.round(currentPrice * (1 + netBias)));
  const expectedDelta = expectedPrice - currentPrice;
  const expectedDeltaPercent = Math.round((expectedDelta / Math.max(1, currentPrice)) * 100);
  const kind = marketForecastKind({
    expectedDeltaPercent,
    politicalBias,
    accessBias,
    stock,
    portIsExporter: port.exports.includes(goodId),
  });
  const drivers = forecastDrivers({ trend, stock, pressure, logistics, access, rumor, politicalEvents, expectedDeltaPercent });
  const confidence = Number(
    clamp(
      0.38 +
        Math.abs(netBias) * 1.5 +
        (drivers.length >= 3 ? 0.08 : 0) +
        (rumor ? 0.08 : 0) +
        (politicalEvents.length ? 0.07 : 0) +
        (pressure.kind !== "quiet" ? 0.06 : 0),
      0.32,
      0.94
    ).toFixed(2)
  );

  return {
    portId,
    goodId,
    kind,
    label: marketForecastLabel(kind),
    detail: `${signedForecastPercent(expectedDeltaPercent)} next | ${drivers.slice(0, 3).join(" | ") || "balanced books"}`,
    confidence,
    currentPrice,
    expectedPrice,
    expectedDelta,
    expectedDeltaPercent,
    drivers,
  };
}

export function topMarketForecasts(state: GameState, portId = state.currentPort, limit = 5): MarketForecastSignal[] {
  return goods
    .map((good) => marketForecastFor(state, portId, good.id))
    .sort((left, right) => forecastPriority(right) - forecastPriority(left) || Math.abs(right.expectedDeltaPercent) - Math.abs(left.expectedDeltaPercent))
    .slice(0, limit);
}

export function brokerPacketQuoteFor(state: GameState): BrokerPacketQuote | null {
  const current = ports.find((port) => port.id === state.currentPort);
  if (!current) return null;
  const stats = deriveShipStats(state);
  const standing = state.factionStanding[current.faction] ?? 0;
  const hasPermit = hasActiveMarketPermit(state, current.faction);
  const marketMaker = hasCaptainSkillMastery(state, "brokerage");
  const cost = Math.max(
    45,
    Math.round((170 - stats.negotiation * 13 - clamp(standing, -12, 24) * 2.2) * servicePriceModifier(standing, hasPermit) * (marketMaker ? 0.86 : 1))
  );

  const routeQuote = destinationBrokerPacketQuote(state, cost);
  if (routeQuote) return routeQuote;

  const localQuote = localBrokerPacketQuote(state, cost);
  if (localQuote) return localQuote;
  return null;
}

export function driftMarkets(state: GameState): GameState {
  const next = {
    ...state,
    market: { ...state.market },
    marketStock: normalizeMarketStock(state.marketStock),
    trends: { ...state.trends },
  };
  for (const good of goods) {
    if (!next.trends[good.id] || next.trends[good.id].expires <= next.day) {
      next.trends[good.id] = makeTrend(good.id, next.day);
    }
  }

  for (const port of ports) {
    next.market[port.id] = { ...state.market[port.id] };
    next.marketStock[port.id] = { ...next.marketStock[port.id] };
    for (const good of goods) {
      const current = state.market[port.id][good.id];
      const trend = next.trends[good.id];
      const trendPull = trend.direction * trend.momentum * good.volatility * 0.52;
      const localShock = randomBetween(-good.volatility, good.volatility);
      const anchor =
        good.base * (port.exports.includes(good.id) ? 0.72 : port.imports.includes(good.id) ? 1.34 : 1);
      const nextPrice = current * (1 + trendPull + localShock) + (anchor - current) * 0.032;
      next.market[port.id][good.id] = Math.max(6, Math.round(nextPrice));
      next.marketStock[port.id][good.id] = driftMarketStock(state, port.id, good.id, next.marketStock[port.id][good.id]);
    }
  }
  return next;
}

export function trendText(state: GameState, goodId: string) {
  const trend = state.trends[goodId];
  if (!trend) return "flat";
  return `${trend.direction > 0 ? "up" : "down"} | ${trend.label}`;
}

export function generateRumor(day: number): RumorEvent {
  const port = pick(ports);
  const good = pick(goods);
  const shortage = Math.random() < 0.7;
  return {
    id: uid("rumor"),
    portId: port.id,
    goodId: good.id,
    multiplier: shortage ? randomBetween(1.42, 1.9) : randomBetween(0.48, 0.72),
    expires: day + Math.floor(randomBetween(7, 13)),
    kind: shortage ? "shortage" : "glut",
  };
}

export function generatePoliticalEvent(day: number): PoliticalEvent {
  const faction = pick(factions);
  const goodId = pick(faction.tariffGoods);
  type GeneratedPoliticalKind = "tariff" | "convoy" | "strike" | "inspection";
  const event = pick(["tariff", "convoy", "strike", "inspection"] as GeneratedPoliticalKind[]);
  const templates: Record<GeneratedPoliticalKind, Omit<PoliticalEvent, "id" | "factionId" | "expires">> = {
    tariff: {
      kind: "tariff",
      goodId,
      riskModifier: 0.02,
      priceModifier: 1.18,
      text: `${faction.name} raised tariff ledgers on ${goodName(goodId)}.`,
    },
    convoy: {
      kind: "convoy",
      riskModifier: -0.08,
      priceModifier: 0.97,
      text: `${faction.name} posted convoy escorts near its harbors.`,
    },
    strike: {
      kind: "strike",
      riskModifier: 0.03,
      priceModifier: 1.14,
      text: `${faction.name} docks are slowed by labor action.`,
    },
    inspection: {
      kind: "inspection",
      goodId,
      riskModifier: 0.05,
      priceModifier: 1.08,
      text: `${faction.name} inspectors are searching ${goodName(goodId)} holds.`,
    },
  };

  return {
    ...templates[event],
    id: uid("politics"),
    factionId: faction.id,
    expires: day + Math.floor(randomBetween(6, 11)),
  };
}

function goodName(id: string) {
  return goods.find((good) => good.id === id)?.name ?? id;
}

function freightPressureLabel(kind: FreightPressureKind, freightPressure: number, politicalFriction: number) {
  if (kind === "stockout") return "Stockout demand";
  if (kind === "import-pressure") return freightPressure >= 0.46 ? "Storm demand" : "Import squeeze";
  if (kind === "export-surplus") return "Export surplus";
  if (kind === "political-friction") return politicalFriction >= 0.34 ? "Faction squeeze" : "Permit friction";
  return "Quiet freight";
}

function marketForecastKind({
  expectedDeltaPercent,
  politicalBias,
  accessBias,
  stock,
  portIsExporter,
}: {
  expectedDeltaPercent: number;
  politicalBias: number;
  accessBias: number;
  stock: MarketStockLevel;
  portIsExporter: boolean;
}): MarketForecastKind {
  if (politicalBias + accessBias >= 0.07) return "squeeze";
  if (expectedDeltaPercent >= 5) return "climbing";
  if (expectedDeltaPercent <= -5 && (portIsExporter || stock.label === "deep" || stock.label === "glut")) return "buy-window";
  if (expectedDeltaPercent <= -4) return "cooling";
  return "steady";
}

function marketForecastLabel(kind: MarketForecastKind) {
  if (kind === "climbing") return "Price climbing";
  if (kind === "cooling") return "Cooling price";
  if (kind === "buy-window") return "Buy window";
  if (kind === "squeeze") return "Faction squeeze";
  return "Steady quote";
}

function destinationBrokerPacketQuote(state: GameState, cost: number): BrokerPacketQuote | null {
  if (state.selectedPort === state.currentPort) return null;
  const plan = routeTradePlanFor(state, state.selectedPort, state.currentPort);
  if (!plan || !plan.goodId) return null;
  const destination = ports.find((port) => port.id === state.selectedPort);
  const good = goods.find((entry) => entry.id === plan.goodId);
  if (!destination || !good) return null;
  const negotiation = deriveShipStats(state).negotiation;
  const marketMaker = hasCaptainSkillMastery(state, "brokerage");
  const forecast = marketForecastFor(state, destination.id, good.id);
  const edgeScore = plan.riskAdjustedMargin + Math.max(0, forecast.expectedDelta) + plan.maxBuy * 3;
  if (plan.maxBuy <= 0 && edgeScore < 8) return null;
  const confidence = clamp(0.42 + negotiation * 0.045 + Math.max(0, forecast.expectedDeltaPercent) * 0.01, 0.42, 0.86);
  return {
    affordable: state.cash >= cost,
    cost,
    kind: "destination-shortage",
    goodId: good.id,
    portId: destination.id,
    label: `Broker Packet: ${good.name} bid`,
    detail: `${destination.name} buyers primed | ${forecast.label.toLowerCase()} | ${plan.maxBuy} loadable${marketMaker ? " | market maker" : ""}`,
    expires: Math.min(state.day + (marketMaker ? 10 : 8), state.day + 5 + Math.floor(negotiation / 2) + (marketMaker ? 1 : 0)),
    stockDelta: marketMaker ? -3 : -2,
    rumorMultiplier: Number(clamp(1.16 + confidence * (marketMaker ? 0.22 : 0.18), 1.18, marketMaker ? 1.4 : 1.34).toFixed(3)),
    rumorKind: "shortage",
  };
}

function localBrokerPacketQuote(state: GameState, cost: number): BrokerPacketQuote | null {
  const forecasts = topMarketForecasts(state, state.currentPort, 5);
  const forecast = forecasts.find((entry) => entry.kind === "buy-window" || entry.kind === "cooling") ?? forecasts[0];
  if (!forecast) return null;
  const good = goods.find((entry) => entry.id === forecast.goodId);
  const port = ports.find((entry) => entry.id === state.currentPort);
  if (!good || !port) return null;
  const negotiation = deriveShipStats(state).negotiation;
  const marketMaker = hasCaptainSkillMastery(state, "brokerage");
  const stock = marketStockLevel(state, port.id, good.id);
  const confidence = clamp(0.4 + negotiation * 0.04 + Math.max(0, -forecast.expectedDeltaPercent) * 0.012, 0.4, 0.84);
  return {
    affordable: state.cash >= cost,
    cost,
    kind: "local-glut",
    goodId: good.id,
    portId: port.id,
    label: `Broker Packet: ${good.name} lot`,
    detail: `${port.name} sellers loosen terms | ${forecast.label.toLowerCase()} | ${marketStockText(stock)}${marketMaker ? " | market maker" : ""}`,
    expires: Math.min(state.day + (marketMaker ? 10 : 8), state.day + 4 + Math.floor(negotiation / 3) + (marketMaker ? 1 : 0)),
    stockDelta: marketMaker ? 3 : 2,
    rumorMultiplier: Number(clamp(0.86 - confidence * (marketMaker ? 0.2 : 0.16), marketMaker ? 0.68 : 0.72, 0.84).toFixed(3)),
    rumorKind: "glut",
  };
}

function forecastDrivers({
  trend,
  stock,
  pressure,
  logistics,
  access,
  rumor,
  politicalEvents,
  expectedDeltaPercent,
}: {
  trend: Trend | undefined;
  stock: MarketStockLevel;
  pressure: FreightPressureSignal;
  logistics: PortLogisticsPressure;
  access: GoodMarketAccess;
  rumor: RumorEvent | undefined;
  politicalEvents: PoliticalEvent[];
  expectedDeltaPercent: number;
}) {
  const drivers: string[] = [];
  if (trend) drivers.push(`${trend.direction > 0 ? "rising" : "falling"} ${trend.label}`);
  if (rumor) drivers.push(rumor.kind);
  if (pressure.kind !== "quiet") drivers.push(pressure.label.toLowerCase());
  if (stock.label === "thin" || stock.label === "empty") drivers.push("thin stock");
  if (stock.label === "deep" || stock.label === "glut") drivers.push(`${stock.label} stock`);
  if (logistics.pressure >= 0.42) drivers.push(logistics.label);
  if (politicalEvents.length) drivers.push(politicalEvents.map((event) => event.kind).slice(0, 2).join("/"));
  if (access.reason !== "open trade" && access.reason !== "favored access") drivers.push(access.reason);
  if (!drivers.length && Math.abs(expectedDeltaPercent) <= 3) drivers.push("balanced stock");
  return [...new Set(drivers)];
}

function forecastPriority(forecast: MarketForecastSignal) {
  const priority: Record<MarketForecastKind, number> = {
    squeeze: 5,
    climbing: 4,
    "buy-window": 4,
    cooling: 2,
    steady: 1,
  };
  return priority[forecast.kind] * 100 + Math.abs(forecast.expectedDeltaPercent) + forecast.confidence * 10;
}

function signedForecastPercent(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function signalPriority(kind: FreightPressureKind) {
  const priority: Record<FreightPressureKind, number> = {
    stockout: 5,
    "import-pressure": 4,
    "export-surplus": 3,
    "political-friction": 2,
    quiet: 1,
  };
  return priority[kind];
}

function portByName(portId: string) {
  return ports.find((port) => port.id === portId)?.name ?? portId;
}

function hasActiveMarketPermit(state: Pick<GameState, "day" | "politicalEvents">, factionId: string) {
  return state.politicalEvents.some((event) => event.factionId === factionId && event.kind === "permit" && event.expires >= state.day);
}

function marketStockTarget(portId: string, goodId: string) {
  const port = ports.find((entry) => entry.id === portId);
  const capacity = marketStockCapacity(portId, goodId);
  if (port?.exports.includes(goodId)) return Math.round(capacity * 0.78);
  if (port?.imports.includes(goodId)) return Math.round(capacity * 0.34);
  return Math.round(capacity * 0.56);
}

function driftMarketStock(state: GameState, portId: string, goodId: string, stock: number) {
  const capacity = marketStockCapacity(portId, goodId);
  const target = marketStockTarget(portId, goodId);
  let nextStock = stock;
  if (stock < target) nextStock += Math.max(1, Math.round((target - stock) * 0.22));
  if (stock > target) nextStock -= Math.max(1, Math.round((stock - target) * 0.18));

  const rumor = state.events.find((event) => event.expires >= state.day && event.portId === portId && event.goodId === goodId);
  if (rumor?.kind === "shortage") nextStock -= 1;
  if (rumor?.kind === "glut") nextStock += 2;

  const port = ports.find((entry) => entry.id === portId);
  const stalled = state.politicalEvents.some((event) => {
    return event.expires >= state.day && event.factionId === port?.faction && (event.kind === "strike" || event.kind === "inspection");
  });
  if (stalled && port?.exports.includes(goodId)) nextStock -= 1;

  return clampStock(nextStock, capacity);
}

function clampStock(value: number, capacity: number) {
  return clamp(Math.round(value), 0, capacity + 5);
}

import { factions, goods, ports } from "./data";
import { crewDemandLabel, crewProfileFor, crewPreferenceLabel } from "./crew";
import { crewRouteReadFor } from "./crewIdentity";
import {
  marketStockLevel,
  portLogisticsPressure,
  sellPriceFor,
  topFreightPressureSignals,
  type FreightPressureSignal,
} from "./economy";
import { clamp, money, randomBetween, uid } from "./math";
import { routeMemoryFor, routeMemorySummary } from "./routeMemory";
import { cargoUnits, portById, shippingLanePressure } from "./routing";
import type { RoutePhysicsProfile } from "./routing";
import { deriveShipStats } from "./stats";
import type { GameState, PoliticalEvent, RumorEvent, Voyage } from "./types";

export type WorldEventEffect =
  | { kind: "rumor"; event: RumorEvent }
  | { kind: "political"; event: PoliticalEvent }
  | { kind: "stock"; portId: string; goodId: string; delta: number }
  | { kind: "standing"; factionId: string; delta: number }
  | { kind: "cash"; amount: number }
  | { kind: "hull"; amount: number }
  | { kind: "morale"; amount: number }
  | { kind: "voyageProgress"; amount: number }
  | { kind: "captainXp"; amount: number; source: string }
  | { kind: "crewXp"; amount: number; source: string };

export type WorldEventResolution = {
  id: string;
  cardId: string;
  title: string;
  text: string;
  weight: number;
  effects: WorldEventEffect[];
};

export type WorldEventCandidate = {
  id: string;
  title: string;
  weight: number;
  detail?: string;
  effectPreview?: string[];
  resolve: () => WorldEventResolution;
};

export type EventPressurePreview = {
  id: string;
  title: string;
  detail: string;
  effects: string[];
  weight: number;
  share: number;
  label: string;
};

export type ArrivalWorldEventContext = {
  voyage: Voyage;
  physics: RoutePhysicsProfile;
  projectedProfit: number;
};

export type UnderwayWorldEventContext = {
  voyage: Voyage;
  physics: RoutePhysicsProfile;
  progress: number;
  watchEffect?: "clean" | "strain" | "damage" | "cargo" | null;
};

export function worldEventCandidates(state: GameState): WorldEventCandidate[] {
  return [
    ...freightPressureCandidates(state),
    ...politicalCandidates(state),
    ...contractHarborCandidates(state),
    ...crewIdentityHarborCandidates(state),
    ...harborDowntimeCandidates(state),
  ].filter((candidate) => candidate.weight > 0);
}

export function drawWorldEvent(state: GameState): WorldEventResolution | null {
  return drawWeightedEvent(worldEventCandidates(state));
}

export function worldEventPreviews(state: GameState, limit = 4): EventPressurePreview[] {
  return eventCandidatePreviews(worldEventCandidates(state), limit);
}

export function arrivalWorldEventCandidates(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate[] {
  return [
    cargoBrokerArrivalEvent(state, context),
    hardWaterArrivalEvent(state, context),
    currentPacketArrivalEvent(state, context),
    manifestGossipArrivalEvent(state, context),
    knownLaneArrivalEvent(state, context),
    contractHandoffArrivalEvent(state, context),
    crewReputationArrivalEvent(state, context),
    factionDocksideArrivalEvent(state, context),
  ].filter((candidate): candidate is WorldEventCandidate => Boolean(candidate && candidate.weight > 0));
}

export function drawArrivalWorldEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventResolution | null {
  return drawWeightedEvent(arrivalWorldEventCandidates(state, context));
}

export function arrivalEventPreviews(state: GameState, context: ArrivalWorldEventContext, limit = 4): EventPressurePreview[] {
  return eventCandidatePreviews(arrivalWorldEventCandidates(state, context), limit);
}

export function underwayWorldEventCandidates(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate[] {
  return [
    currentSeamUnderwayEvent(state, context),
    deckDrillUnderwayEvent(state, context),
    cargoTrimUnderwayEvent(state, context),
    wreckageMarkUnderwayEvent(state, context),
    marketPacketUnderwayEvent(state, context),
    contractSignalUnderwayEvent(state, context),
    crewPreferenceUnderwayEvent(state, context),
    stormGlassUnderwayEvent(state, context),
  ].filter((candidate): candidate is WorldEventCandidate => Boolean(candidate && candidate.weight > 0));
}

export function drawUnderwayWorldEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventResolution | null {
  const candidates = underwayWorldEventCandidates(state, context);
  if (!candidates.length) return null;
  const chance = underwayEventChance(state, context);
  const roll = deterministicUnit(`${state.day}:${context.voyage.fromId}:${context.voyage.toId}:${context.voyage.days}:${Math.round(context.progress * 1000)}:underway`);
  if (roll >= chance) return null;
  return drawWeightedEvent(candidates, deterministicUnit(`${state.day}:${context.voyage.fromId}:${context.voyage.toId}:${Math.round(context.progress * 1000)}:pick`));
}

export function underwayEventPreviews(state: GameState, context: UnderwayWorldEventContext, limit = 4): EventPressurePreview[] {
  return eventCandidatePreviews(underwayWorldEventCandidates(state, context), limit);
}

function drawWeightedEvent(candidates: WorldEventCandidate[], cursorRatio?: number): WorldEventResolution | null {
  if (!candidates.length) return null;
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let cursor = (cursorRatio ?? Math.random()) * total;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) return candidate.resolve();
  }
  return candidates[candidates.length - 1].resolve();
}

function eventCandidatePreviews(candidates: WorldEventCandidate[], limit: number): EventPressurePreview[] {
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (total <= 0) return [];
  return [...candidates]
    .sort((left, right) => right.weight - left.weight || left.title.localeCompare(right.title))
    .slice(0, limit)
    .map((candidate) => {
      const share = candidate.weight / total;
      return {
        id: candidate.id,
        title: candidate.title,
        detail: candidate.detail ?? "weighted by current run state",
        effects: candidate.effectPreview ?? ["run beat"],
        weight: Number(candidate.weight.toFixed(2)),
        share: Number(share.toFixed(3)),
        label: eventPressureLabel(share),
      };
    });
}

function eventPressureLabel(share: number) {
  if (share >= 0.34) return "Likely";
  if (share >= 0.2) return "Rising";
  if (share >= 0.1) return "Possible";
  return "Faint";
}

function underwayEventChance(state: GameState, context: UnderwayWorldEventContext) {
  const carriedCargo = cargoUnits(state);
  const meaningful =
    carriedCargo > 0 ||
    state.crew.length > 0 ||
    context.voyage.risk >= 0.18 ||
    context.physics.pressure >= 0.4 ||
    context.physics.assist >= 0.18 ||
    context.watchEffect === "strain";
  if (!meaningful) return 0;
  return clamp(
    0.16 +
      Math.min(0.16, carriedCargo * 0.006) +
      Math.min(0.16, state.crew.length * 0.035) +
      context.voyage.risk * 0.16 +
      context.physics.pressure * 0.14 +
      Math.max(0, context.physics.assist) * 0.12 +
      (context.watchEffect === "strain" ? 0.08 : 0),
    0,
    0.72
  );
}

function deterministicPick<T>(items: T[], key: string): T {
  return items[Math.floor(deterministicUnit(key) * items.length)] ?? items[0];
}

function deterministicUnit(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function currentSeamUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  if (context.physics.assist < 0.14 && context.watchEffect !== "clean") return null;
  const destination = portById(context.voyage.toId);
  const weight = 8 + Math.max(0, context.physics.assist) * 54 + (context.watchEffect === "clean" ? 6 : 0);
  return {
    id: `underway-current-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Current seam",
    weight,
    detail: `${destination.name} run | ${Math.round(context.physics.assist * 100)}% assist`,
    effectPreview: ["distance", "crew XP"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: "underway-current-seam",
      title: "Current seam",
      weight,
      text: `Current seam: the watch found a faster set toward ${destination.name}.`,
      effects: [
        { kind: "voyageProgress", amount: 0.035 },
        { kind: "crewXp", amount: 6, source: "Current seam" },
      ],
    }),
  };
}

function deckDrillUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  if (!state.crew.length || context.watchEffect === "damage" || context.watchEffect === "cargo") return null;
  const destination = portById(context.voyage.toId);
  const moraleNeed = Math.max(0, 76 - state.crewMorale);
  const weight = 7 + state.crew.length * 5 + moraleNeed * 0.35 + (context.watchEffect === "strain" ? 6 : 0);
  return {
    id: `underway-drill-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Watch drill",
    weight,
    detail: `${destination.name} run | ${state.crew.length} crew | morale ${state.crewMorale}`,
    effectPreview: ["crew XP", "morale"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: "underway-watch-drill",
      title: "Watch drill",
      weight,
      text: `Watch drill: the crew turned the ${destination.name} crossing into practice instead of dead time.`,
      effects: [
        { kind: "crewXp", amount: 8 + state.crew.length * 2, source: "Watch drill" },
        { kind: "morale", amount: state.crewMorale < 96 ? 1 : 0 },
      ],
    }),
  };
}

function cargoTrimUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  const load = cargoUnits(state);
  if (load <= 0 || (context.physics.cargoRisk < 0.04 && context.physics.pressure < 0.4 && context.watchEffect !== "strain")) return null;
  const destination = portById(context.voyage.toId);
  const weight = 8 + Math.min(18, load * 0.7) + context.physics.cargoRisk * 54 + context.physics.pressure * 12;
  return {
    id: `underway-cargo-trim-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Cargo trim",
    weight,
    detail: `${destination.name} run | ${load} hold | ${Math.round(context.physics.cargoRisk * 100)}% cargo risk`,
    effectPreview: ["crew XP", "cargo discipline"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: "underway-cargo-trim",
      title: "Cargo trim",
      weight,
      text: `Cargo trim: the hold was re-lashed before the next ugly roll toward ${destination.name}.`,
      effects: [
        { kind: "crewXp", amount: 9, source: "Cargo trim" },
        { kind: "captainXp", amount: 4, source: "Cargo trim" },
      ],
    }),
  };
}

function wreckageMarkUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  const pressure = Math.max(context.physics.pressure, context.voyage.risk, context.physics.delayRisk * 2);
  if (pressure < 0.28) return null;
  const destination = portById(context.voyage.toId);
  const weight = 5 + pressure * 38;
  return {
    id: `underway-wreckage-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Wreckage mark",
    weight,
    detail: `${destination.name} run | ${Math.round(pressure * 100)}% route pressure`,
    effectPreview: ["cash salvage", "captain XP"],
    resolve: () => {
      const payout = Math.round(28 + pressure * 80 + deriveShipStats(state).navigation * 6);
      return {
        id: uid("underway-world"),
        cardId: "underway-wreckage-mark",
        title: "Wreckage mark",
        weight,
        text: `Wreckage mark: a hard-water scrap line paid ${money(payout)} for a chart note.`,
        effects: [
          { kind: "cash", amount: payout },
          { kind: "captainXp", amount: 6, source: "Wreckage mark" },
        ],
      };
    },
  };
}

function marketPacketUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  const pressure = Math.max(0, context.physics.assist) + Math.max(0, context.physics.pressure - 0.3);
  if (pressure < 0.18) return null;
  const goodId = deterministicPick(
    destination.imports.length ? destination.imports : goods.map((good) => good.id),
    `underway-market:${state.day}:${context.voyage.fromId}:${context.voyage.toId}`
  );
  const weight = 5 + pressure * 24;
  return {
    id: `underway-market-packet-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Market packet",
    weight,
    detail: `${destination.name} | ${goodName(goodId)}`,
    effectPreview: ["shortage tip"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: "underway-market-packet",
      title: "Market packet",
      weight,
      text: `Market packet: a passing cutter traded fresh ${goodName(goodId)} quotes for weather marks.`,
      effects: [
        {
          kind: "rumor",
          event: {
            id: uid("underway"),
            portId: destination.id,
            goodId,
            multiplier: Number((1.16 + Math.min(0.22, pressure * 0.14)).toFixed(2)),
            expires: state.day + Math.floor(randomBetween(4, 7)),
            kind: "shortage",
          },
        },
      ],
    }),
  };
}

function contractSignalUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  const contract = routeContractFor(state, context.voyage.toId);
  if (!contract) return null;
  const destination = portById(context.voyage.toId);
  const deadlinePressure = Math.max(0, context.voyage.days + 3 - (contract.deadline - state.day));
  const chainPressure = contract.chain ? 6 : 0;
  const weight = 7 + deadlinePressure * 4 + chainPressure + Math.min(8, contract.reward / 120);
  return {
    id: `underway-contract-${context.voyage.fromId}-${context.voyage.toId}-${contract.id}`,
    title: contract.chain ? "Patron signal" : "Contract signal",
    weight,
    detail: `${destination.name} | ${contract.chain?.giver ?? goodName(contract.goodId)} | day ${contract.deadline}`,
    effectPreview: ["contract tempo", "crew XP"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: contract.chain ? "underway-patron-signal" : "underway-contract-signal",
      title: contract.chain ? "Patron signal" : "Contract signal",
      weight,
      text: contract.chain
        ? `Patron signal: ${contract.chain.giver}'s marks helped the watch keep the ${contract.chain.title} run in mind.`
        : `Contract signal: the watch found a cleaner line toward the ${goodName(contract.goodId)} delivery at ${destination.name}.`,
      effects: [
        { kind: "voyageProgress", amount: 0.025 },
        { kind: "crewXp", amount: 5, source: "Contract signal" },
        { kind: "captainXp", amount: 3, source: "Contract signal" },
      ],
    }),
  };
}

function crewPreferenceUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  if (!state.crew.length) return null;
  const read = crewRouteReadFor(state, context.voyage.fromId, context.voyage.toId, {
    cargoUnits: cargoUnits(state),
    expectedProfit: 0,
    sailPlan: context.voyage.sailPlan ?? state.sailPlan,
  });
  const primary = read.entries[0];
  if (!primary || (Math.abs(read.score) < 2 && !state.crew.some((crewId) => crewProfileFor(state, crewId).demand))) return null;
  const destination = portById(context.voyage.toId);
  const weight = 6 + Math.abs(read.score) * 5 + (primary.stance === "objects" ? 6 : 2) + Math.max(0, 72 - state.crewMorale) * 0.18;
  return {
    id: `underway-crew-read-${context.voyage.fromId}-${context.voyage.toId}`,
    title: primary.stance === "objects" ? "Crew objection" : "Crew backing",
    weight,
    detail: `${destination.name} | ${read.compact}`,
    effectPreview: primary.stance === "objects" ? ["morale pressure", "crew XP"] : ["morale", "crew XP"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: primary.stance === "objects" ? "underway-crew-objection" : "underway-crew-backing",
      title: primary.stance === "objects" ? "Crew objection" : "Crew backing",
      weight,
      text:
        primary.stance === "objects"
          ? `Crew objection: ${primary.name} pushed back on the ${destination.name} line; ${primary.reason}.`
          : `Crew backing: ${primary.name} liked the ${destination.name} line; ${primary.reason}.`,
      effects: [
        { kind: "crewXp", amount: 6, source: "Crew route read" },
        { kind: "morale", amount: primary.stance === "objects" ? -1 : 2 },
      ],
    }),
  };
}

function stormGlassUnderwayEvent(state: GameState, context: UnderwayWorldEventContext): WorldEventCandidate | null {
  const pressure = Math.max(context.physics.pressure, context.physics.delayRisk * 2, context.physics.crewStrain / 10);
  if (pressure < 0.5 && context.watchEffect !== "strain") return null;
  const destination = portById(context.voyage.toId);
  const weight = 6 + pressure * 34 + (context.watchEffect === "strain" ? 5 : 0);
  return {
    id: `underway-storm-glass-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Storm glass",
    weight,
    detail: `${destination.name} | ${context.physics.label} | ${Math.round(pressure * 100)}% pressure`,
    effectPreview: ["captain XP", "crew XP"],
    resolve: () => ({
      id: uid("underway-world"),
      cardId: "underway-storm-glass",
      title: "Storm glass",
      weight,
      text: `Storm glass: the barometer trembled before ${destination.name}, and the crew wrote the pattern down.`,
      effects: [
        { kind: "captainXp", amount: 7, source: "Storm glass" },
        { kind: "crewXp", amount: 6, source: "Storm glass" },
      ],
    }),
  };
}

function cargoBrokerArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  const carried = bestArrivalCargo(state, context.voyage);
  if (!carried) return null;
  const importFit = destination.imports.includes(carried.goodId);
  const marginPressure = Math.max(0, carried.margin);
  const weight = 8 + Math.min(42, marginPressure / 10) + (importFit ? 12 : 0) + Math.min(16, Math.max(0, context.projectedProfit) / 30);
  return {
    id: `arrival-cargo-${destination.id}-${carried.goodId}`,
    title: "Arrival broker",
    weight,
    detail: `${destination.name} | ${goodName(carried.goodId)} ${money(Math.max(0, carried.margin))} swing`,
    effectPreview: ["shortage tip", "stock draw", "standing"],
    resolve: () => {
      const event: RumorEvent = {
        id: uid("arrival"),
        portId: destination.id,
        goodId: carried.goodId,
        multiplier: Number((1.24 + Math.min(0.48, marginPressure / 900) + randomBetween(0, 0.08)).toFixed(2)),
        expires: state.day + Math.floor(randomBetween(4, 8)),
        kind: "shortage",
      };
      return {
        id: uid("arrival-world"),
        cardId: "arrival-cargo-broker",
        title: "Arrival broker",
        weight,
        text: `Arrival broker: ${destination.name} factors marked your ${goodName(carried.goodId)} cargo as priority freight.`,
        effects: [
          { kind: "rumor", event },
          { kind: "stock", portId: destination.id, goodId: carried.goodId, delta: -Math.min(2, Math.max(1, carried.quantity)) },
          { kind: "standing", factionId: destination.faction, delta: 0.25 },
        ],
      };
    },
  };
}

function hardWaterArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  const pressure = Math.max(context.physics.pressure, context.physics.delayRisk * 1.8, context.physics.cargoRisk * 1.45);
  if (pressure < 0.46 && context.voyage.risk < 0.28) return null;
  const weight = 10 + pressure * 46 + context.voyage.risk * 24;
  return {
    id: `arrival-hard-water-${destination.id}`,
    title: "Hard-water berth",
    weight,
    detail: `${destination.name} | ${context.physics.label} | ${Math.round(pressure * 100)}% pressure`,
    effectPreview: ["cash salvage", "standing"],
    resolve: () => {
      const payout = Math.round(randomBetween(34, 76) + deriveShipStats(state).openWater * 8 + pressure * 45);
      return {
        id: uid("arrival-world"),
        cardId: "arrival-hard-water",
        title: "Hard-water berth",
        weight,
        text: `Hard-water berth: ${destination.name} pilots paid ${money(payout)} for the route read after ${context.physics.label.toLowerCase()}.`,
        effects: [
          { kind: "cash", amount: payout },
          { kind: "standing", factionId: destination.faction, delta: 0.35 },
        ],
      };
    },
  };
}

function currentPacketArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  if (context.physics.assist < 0.18) return null;
  const goodId = deterministicPick(
    destination.imports.length ? destination.imports : goods.map((good) => good.id),
    `arrival-current:${state.day}:${context.voyage.fromId}:${context.voyage.toId}`
  );
  const weight = 8 + context.physics.assist * 42;
  return {
    id: `arrival-current-packet-${destination.id}`,
    title: "Current packet",
    weight,
    detail: `${destination.name} | ${Math.round(context.physics.assist * 100)}% assist`,
    effectPreview: ["fresh quote", state.crew.length ? "morale" : "run beat"],
    resolve: () => {
      const event: RumorEvent = {
        id: uid("arrival"),
        portId: destination.id,
        goodId,
        multiplier: Number((1.18 + context.physics.assist * 0.3 + randomBetween(0, 0.06)).toFixed(2)),
        expires: state.day + Math.floor(randomBetween(4, 7)),
        kind: "shortage",
      };
      return {
        id: uid("arrival-world"),
        cardId: "arrival-current-packet",
        title: "Current packet",
        weight,
        text: `Current packet: your fast landfall carried fresh quotes into ${destination.name}.`,
        effects: [
          { kind: "rumor", event },
          { kind: "morale", amount: state.crew.length ? 2 : 0 },
        ],
      };
    },
  };
}

function manifestGossipArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  const faction = factions.find((entry) => entry.id === destination.faction);
  const tariffGoodId = faction?.tariffGoods.find((goodId) => (state.cargo[goodId] || 0) > 0);
  if (!faction || !tariffGoodId) return null;
  const quantity = state.cargo[tariffGoodId] || 0;
  const weight = 8 + quantity * 5 + context.physics.cargoRisk * 28 + context.physics.delayRisk * 22;
  return {
    id: `arrival-manifest-${destination.id}-${tariffGoodId}`,
    title: "Manifest gossip",
    weight,
    detail: `${faction.name} | ${goodName(tariffGoodId)} x${quantity}`,
    effectPreview: ["inspection pressure", "standing risk"],
    resolve: () => {
      const event: PoliticalEvent = {
        id: uid("arrival-politics"),
        factionId: faction.id,
        kind: "inspection",
        goodId: tariffGoodId,
        riskModifier: 0.035,
        priceModifier: 1.06,
        expires: state.day + Math.floor(randomBetween(4, 7)),
        text: `${faction.name} clerks heard manifest gossip about ${goodName(tariffGoodId)} at ${destination.name}.`,
      };
      return {
        id: uid("arrival-world"),
        cardId: "arrival-manifest-gossip",
        title: "Manifest gossip",
        weight,
        text: `Manifest gossip: ${faction.name} clerks started asking about ${goodName(tariffGoodId)} before the ink dried.`,
        effects: [
          { kind: "political", event },
          { kind: "standing", factionId: faction.id, delta: -0.25 },
        ],
      };
    },
  };
}

function knownLaneArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const memory = routeMemoryFor(state, context.voyage.fromId, context.voyage.toId);
  if (!memory || (memory.trips < 2 && Math.abs(context.projectedProfit) < 220)) return null;
  const destination = portById(context.voyage.toId);
  const summary = routeMemorySummary(memory);
  const weight = 7 + Math.min(28, memory.trips * 4) + Math.min(18, Math.max(0, context.projectedProfit) / 36);
  return {
    id: `arrival-known-lane-${context.voyage.fromId}-${context.voyage.toId}`,
    title: "Lane broker",
    weight,
    detail: `${summary.label} | ${memory.trips} crossings`,
    effectPreview: ["cash note", "standing"],
    resolve: () => {
      const fee = context.projectedProfit > 0 ? Math.round(18 + Math.min(95, context.projectedProfit * 0.05)) : 0;
      return {
        id: uid("arrival-world"),
        cardId: "arrival-known-lane",
        title: "Lane broker",
        weight,
        text: `Lane broker: ${destination.name} marked this as ${summary.label.toLowerCase()} and paid for your notes.`,
        effects: [
          { kind: "cash", amount: fee },
          { kind: "standing", factionId: destination.faction, delta: 0.2 },
        ],
      };
    },
  };
}

function contractHandoffArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const contract = routeContractFor(state, context.voyage.toId);
  if (!contract) return null;
  const destination = portById(context.voyage.toId);
  const slack = contract.deadline - state.day;
  const chainWeight = contract.chain ? 8 : 0;
  const weight = 9 + Math.max(0, 7 - slack) * 3 + chainWeight + Math.min(10, contract.reward / 100);
  return {
    id: `arrival-contract-${destination.id}-${contract.id}`,
    title: contract.chain ? "Patron handoff" : "Contract handoff",
    weight,
    detail: `${destination.name} | ${contract.chain?.giver ?? goodName(contract.goodId)} | ${slack}d slack`,
    effectPreview: ["standing", "captain XP"],
    resolve: () => ({
      id: uid("arrival-world"),
      cardId: contract.chain ? "arrival-patron-handoff" : "arrival-contract-handoff",
      title: contract.chain ? "Patron handoff" : "Contract handoff",
      weight,
      text: contract.chain
        ? `Patron handoff: ${contract.chain.giver}'s dock runner met you before the ${contract.chain.title} cargo hit the pier.`
        : `Contract handoff: ${destination.name} clerks had the ${goodName(contract.goodId)} manifests ready before docking lines cooled.`,
      effects: [
        { kind: "standing", factionId: contract.factionId, delta: contract.chain ? 0.35 : 0.2 },
        { kind: "captainXp", amount: contract.chain ? 5 : 3, source: "Contract handoff" },
      ],
    }),
  };
}

function crewReputationArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  if (!state.crew.length) return null;
  const destination = portById(context.voyage.toId);
  const read = crewRouteReadFor(state, context.voyage.fromId, context.voyage.toId, {
    cargoUnits: cargoUnits(state),
    expectedProfit: context.projectedProfit,
    sailPlan: context.voyage.sailPlan ?? state.sailPlan,
  });
  const primary = read.entries[0];
  const pressure = Math.max(Math.abs(read.score) / 6, context.physics.crewStrain / 8, context.physics.pressure - 0.32);
  if (!primary || pressure < 0.26) return null;
  const weight = 6 + pressure * 34 + state.crew.length * 2;
  return {
    id: `arrival-crew-reputation-${destination.id}`,
    title: primary.stance === "objects" ? "Crew grievance" : "Crew reputation",
    weight,
    detail: `${destination.name} | ${read.compact}`,
    effectPreview: primary.stance === "objects" ? ["morale pressure", "crew XP"] : ["morale", "crew XP"],
    resolve: () => ({
      id: uid("arrival-world"),
      cardId: primary.stance === "objects" ? "arrival-crew-grievance" : "arrival-crew-reputation",
      title: primary.stance === "objects" ? "Crew grievance" : "Crew reputation",
      weight,
      text:
        primary.stance === "objects"
          ? `Crew grievance: ${primary.name}'s doubts about the ${destination.name} run followed you onto the pier.`
          : `Crew reputation: ${primary.name}'s read on the ${destination.name} run got repeated in the taverns.`,
      effects: [
        { kind: "crewXp", amount: 6, source: "Crew reputation" },
        { kind: "morale", amount: primary.stance === "objects" ? -1 : 2 },
      ],
    }),
  };
}

function factionDocksideArrivalEvent(state: GameState, context: ArrivalWorldEventContext): WorldEventCandidate | null {
  const destination = portById(context.voyage.toId);
  const faction = factions.find((entry) => entry.id === destination.faction) ?? factions[0];
  const standing = state.factionStanding[faction.id] ?? 0;
  const activePolicy = state.politicalEvents.find((event) => event.factionId === faction.id && event.expires >= state.day);
  const pressure = Math.max(Math.abs(standing) / 24, activePolicy ? 0.35 : 0, context.voyage.risk - 0.18);
  if (pressure < 0.28) return null;
  const tariffGood = activePolicy?.goodId ?? deterministicPick(faction.tariffGoods.length ? faction.tariffGoods : destination.imports, `arrival-faction:${state.day}:${destination.id}`);
  const weight = 5 + pressure * 32 + (activePolicy ? 6 : 0);
  return {
    id: `arrival-faction-dockside-${destination.id}`,
    title: standing < -2 || activePolicy?.kind === "inspection" ? "Dockside watch" : "Faction welcome",
    weight,
    detail: `${faction.name} | ${goodName(tariffGood)} | standing ${standing.toFixed(1)}`,
    effectPreview: standing < -2 ? ["standing risk", "inspection pressure"] : ["standing", "market note"],
    resolve: () => {
      const event: PoliticalEvent = {
        id: uid("arrival-politics"),
        factionId: faction.id,
        kind: standing < -2 || activePolicy?.kind === "inspection" ? "inspection" : "permit",
        goodId: tariffGood,
        riskModifier: standing < -2 ? 0.035 : -0.015,
        priceModifier: standing < -2 ? 1.04 : 0.98,
        expires: state.day + Math.floor(randomBetween(4, 7)),
        text:
          standing < -2
            ? `${faction.name} dockside watchers marked ${goodName(tariffGood)} papers at ${destination.name}.`
            : `${faction.name} dockside clerks smoothed ${goodName(tariffGood)} papers at ${destination.name}.`,
      };
      return {
        id: uid("arrival-world"),
        cardId: standing < -2 ? "arrival-dockside-watch" : "arrival-faction-welcome",
        title: standing < -2 ? "Dockside watch" : "Faction welcome",
        weight,
        text:
          standing < -2
            ? `Dockside watch: ${faction.name} clerks had questions waiting at ${destination.name}.`
            : `Faction welcome: ${faction.name} clerks made space for your berth at ${destination.name}.`,
        effects: [
          { kind: "political", event },
          { kind: "standing", factionId: faction.id, delta: standing < -2 ? -0.15 : 0.2 },
        ],
      };
    },
  };
}

function freightPressureCandidates(state: GameState): WorldEventCandidate[] {
  return topFreightPressureSignals(state, 18).flatMap((signal) => {
    if (signal.kind === "stockout" || signal.kind === "import-pressure") {
      return [importPressureEvent(state, signal)];
    }
    if (signal.kind === "export-surplus") {
      return [exportSurplusEvent(state, signal)];
    }
    return [];
  });
}

function importPressureEvent(state: GameState, signal: FreightPressureSignal): WorldEventCandidate {
  const port = portName(signal.portId);
  const good = goodName(signal.goodId);
  return {
    id: `import-${signal.portId}-${signal.goodId}`,
    title: signal.label,
    weight: 12 + signal.score * 72,
    detail: `${port} | ${good} | ${signal.detail}`,
    effectPreview: ["shortage tip", "stock draw"],
    resolve: () => {
      const multiplier = Number((1.28 + signal.score * 0.58 + randomBetween(0, 0.08)).toFixed(2));
      const event: RumorEvent = {
        id: uid("deck"),
        portId: signal.portId,
        goodId: signal.goodId,
        multiplier,
        expires: state.day + Math.floor(randomBetween(5, 9)),
        kind: "shortage",
      };
      return {
        id: uid("world"),
        cardId: "import-pressure",
        title: signal.label,
        weight: 12 + signal.score * 72,
        text: `${signal.label}: ${port} buyers bid up ${good}; ${signal.detail}.`,
        effects: [
          { kind: "rumor", event },
          { kind: "stock", portId: signal.portId, goodId: signal.goodId, delta: -1 },
        ],
      };
    },
  };
}

function exportSurplusEvent(state: GameState, signal: FreightPressureSignal): WorldEventCandidate {
  const port = portName(signal.portId);
  const good = goodName(signal.goodId);
  return {
    id: `export-${signal.portId}-${signal.goodId}`,
    title: "Export surplus",
    weight: 10 + signal.score * 58,
    detail: `${port} | ${good} | ${signal.detail}`,
    effectPreview: ["glut tip", "stock swell"],
    resolve: () => {
      const multiplier = Number((0.74 - signal.score * 0.24 - randomBetween(0, 0.05)).toFixed(2));
      const event: RumorEvent = {
        id: uid("deck"),
        portId: signal.portId,
        goodId: signal.goodId,
        multiplier: clamp(multiplier, 0.46, 0.82),
        expires: state.day + Math.floor(randomBetween(5, 10)),
        kind: "glut",
      };
      return {
        id: uid("world"),
        cardId: "export-surplus",
        title: "Export surplus",
        weight: 10 + signal.score * 58,
        text: `Export surplus: ${port} warehouses overhang ${good}; ${signal.detail}.`,
        effects: [
          { kind: "rumor", event },
          { kind: "stock", portId: signal.portId, goodId: signal.goodId, delta: 2 },
        ],
      };
    },
  };
}

function politicalCandidates(state: GameState): WorldEventCandidate[] {
  const port = ports.find((entry) => entry.id === state.currentPort) ?? ports[0];
  const faction = factions.find((entry) => entry.id === port.faction) ?? factions[0];
  const standing = state.factionStanding[faction.id] ?? 0;
  const friction = state.politicalEvents.filter((event) => event.factionId === faction.id && event.expires >= state.day).length;
  const watchedWeight = standing < -4 ? Math.abs(standing) * 2.4 : 0;
  const tariffGood = deterministicPick(
    faction.tariffGoods.length ? faction.tariffGoods : goods.map((good) => good.id),
    `politics:${state.day}:${port.id}:${faction.id}`
  );
  const candidates: WorldEventCandidate[] = [];

  candidates.push({
    id: `faction-sweep-${faction.id}`,
    title: "Harbor sweep",
    weight: watchedWeight + friction * 8,
    detail: `${faction.name} | ${goodName(tariffGood)}`,
    effectPreview: ["inspection pressure", "standing risk"],
    resolve: () => {
      const event: PoliticalEvent = {
        id: uid("deck-politics"),
        factionId: faction.id,
        kind: "inspection",
        goodId: tariffGood,
        riskModifier: 0.04,
        priceModifier: 1.07,
        expires: state.day + Math.floor(randomBetween(4, 8)),
        text: `${faction.name} clerks opened a surprise ledger sweep on ${goodName(tariffGood)}.`,
      };
      return {
        id: uid("world"),
        cardId: "harbor-sweep",
        title: "Harbor sweep",
        weight: watchedWeight + friction * 8,
        text: `Harbor sweep: ${faction.name} inspectors tightened ${goodName(tariffGood)} paperwork at ${port.name}.`,
        effects: [
          { kind: "political", event },
          { kind: "standing", factionId: faction.id, delta: -0.35 },
        ],
      };
    },
  });

  const convoyWeight = Math.max(0, standing + 2) * 1.5 + portLogisticsPressure(state, port.id).pressure * 12;
  candidates.push({
    id: `convoy-auction-${faction.id}`,
    title: "Convoy auction",
    weight: convoyWeight,
    detail: `${faction.name} | ${port.name}`,
    effectPreview: ["convoy politics", "standing"],
    resolve: () => {
      const event: PoliticalEvent = {
        id: uid("deck-politics"),
        factionId: faction.id,
        kind: "convoy",
        riskModifier: -0.06,
        priceModifier: 0.98,
        expires: state.day + Math.floor(randomBetween(4, 7)),
        text: `${faction.name} captains pooled escorts out of ${port.name}.`,
      };
      return {
        id: uid("world"),
        cardId: "convoy-auction",
        title: "Convoy auction",
        weight: convoyWeight,
        text: `Convoy auction: ${faction.name} posted escort berths near ${port.name}.`,
        effects: [
          { kind: "political", event },
          { kind: "standing", factionId: faction.id, delta: 0.2 },
        ],
      };
    },
  });

  return candidates;
}

function contractHarborCandidates(state: GameState): WorldEventCandidate[] {
  const port = ports.find((entry) => entry.id === state.currentPort) ?? ports[0];
  const localChain = state.contracts.find((contract) => contract.status === "available" && contract.originPortId === port.id && contract.chain);
  const activeLocal = state.contracts.find((contract) => {
    return contract.status === "active" && contractTouchesPort(contract, port.id);
  });
  const candidates: WorldEventCandidate[] = [];

  if (localChain) {
    const weight = 9 + (localChain.chain?.stage ?? 1) * 5 + Math.min(8, localChain.reward / 120);
    candidates.push({
      id: `patron-note-${localChain.chain!.id}-${port.id}`,
      title: "Patron note",
      weight,
      detail: `${port.name} | ${localChain.chain!.giver} | stage ${localChain.chain!.stage}/${localChain.chain!.stages}`,
      effectPreview: ["contract hook", "captain XP"],
      resolve: () => ({
        id: uid("world"),
        cardId: "harbor-patron-note",
        title: "Patron note",
        weight,
        text: `Patron note: ${localChain.chain!.giver} left a fresh mark for ${localChain.chain!.title} at ${port.name}.`,
        effects: [
          { kind: "captainXp", amount: 3, source: "Patron note" },
          { kind: "standing", factionId: localChain.factionId, delta: 0.15 },
        ],
      }),
    });
  }

  if (activeLocal) {
    const slack = activeLocal.deadline - state.day;
    const pressure = Math.max(0, 7 - slack);
    const weight = 7 + pressure * 4 + (activeLocal.chain ? 5 : 0);
    candidates.push({
      id: `contract-clerk-${activeLocal.id}-${port.id}`,
      title: activeLocal.chain ? "Patron clerk" : "Contract clerk",
      weight,
      detail: `${port.name} | ${activeLocal.chain?.giver ?? goodName(activeLocal.goodId)} | ${slack}d slack`,
      effectPreview: ["contract focus", "standing"],
      resolve: () => ({
        id: uid("world"),
        cardId: activeLocal.chain ? "harbor-patron-clerk" : "harbor-contract-clerk",
        title: activeLocal.chain ? "Patron clerk" : "Contract clerk",
        weight,
        text: activeLocal.chain
          ? `Patron clerk: ${activeLocal.chain.giver}'s runner checked your ${activeLocal.chain.title} timing at ${port.name}.`
          : `Contract clerk: ${port.name} factors reminded the watch about ${goodName(activeLocal.goodId)} timing.`,
        effects: [
          { kind: "captainXp", amount: 3, source: "Contract clerk" },
          { kind: "standing", factionId: activeLocal.factionId, delta: slack >= 0 ? 0.12 : -0.2 },
        ],
      }),
    });
  }

  return candidates;
}

function crewIdentityHarborCandidates(state: GameState): WorldEventCandidate[] {
  if (!state.crew.length) return [];
  const port = ports.find((entry) => entry.id === state.currentPort) ?? ports[0];
  const candidates: WorldEventCandidate[] = [];
  for (const crewId of state.crew) {
      const profile = crewProfileFor(state, crewId);
      const crewName = crewDisplayName(crewId);
      const demandWeight = profile.demand ? 14 : 0;
      const strainWeight = Math.max(0, profile.strain - 38) * 0.32;
      const loyaltyWeight = profile.loyalty >= 72 ? 5 : 0;
      const weight = demandWeight + strainWeight + loyaltyWeight;
      if (weight <= 0) continue;
      candidates.push({
        id: `crew-petition-${crewId}-${port.id}`,
        title: profile.demand ? "Crew petition" : "Crew counsel",
        weight,
        detail: `${port.name} | ${crewName} | ${profile.demand ? crewDemandLabel(profile.demand) : crewPreferenceLabel(profile.preference)}`,
        effectPreview: profile.demand ? ["morale", "crew XP"] : ["crew XP", "morale"],
        resolve: () => ({
          id: uid("world"),
          cardId: profile.demand ? "harbor-crew-petition" : "harbor-crew-counsel",
          title: profile.demand ? "Crew petition" : "Crew counsel",
          weight,
          text: profile.demand
            ? `Crew petition: ${crewName} asked for ${crewDemandLabel(profile.demand)} before the next sailing.`
            : `Crew counsel: ${crewName} turned ${crewPreferenceLabel(profile.preference).toLowerCase()} into practical advice at ${port.name}.`,
          effects: [
            { kind: "crewXp", amount: 5, source: profile.demand ? "Crew petition" : "Crew counsel" },
            { kind: "morale", amount: profile.demand ? 1 : 2 },
          ],
        }),
      });
  }
  return candidates;
}

function harborDowntimeCandidates(state: GameState): WorldEventCandidate[] {
  const port = ports.find((entry) => entry.id === state.currentPort) ?? ports[0];
  const stats = deriveShipStats(state);
  const missingHull = Math.max(0, stats.hullMax - state.hull);
  const logistics = portLogisticsPressure(state, port.id);
  const bestLocalExport = port.exports
    .map((goodId) => ({ goodId, stock: marketStockLevel(state, port.id, goodId) }))
    .sort((left, right) => right.stock.fill - left.stock.fill)[0];
  const roughApproaches = ports
    .filter((entry) => entry.id !== port.id)
    .reduce((sum, origin) => sum + shippingLanePressure(state.day, origin.id, port.id), 0);

  return [
    {
      id: `dockyard-lull-${port.id}`,
      title: "Dockyard lull",
      weight: missingHull > 0 && logistics.pressure < 0.34 ? 8 + Math.min(18, missingHull * 0.8) : 0,
      detail: `${port.name} | ${missingHull} hull missing`,
      effectPreview: ["hull patch"],
      resolve: () => {
        const patch = Math.min(missingHull, Math.max(2, Math.round(randomBetween(3, 7))));
        return {
          id: uid("world"),
          cardId: "dockyard-lull",
          title: "Dockyard lull",
          weight: 8 + Math.min(18, missingHull * 0.8),
          text: `Dockyard lull: ${port.name} caulkers patched ${patch} hull during slack tide.`,
          effects: [{ kind: "hull", amount: patch }],
        };
      },
    },
    {
      id: `crew-gossip-${port.id}`,
      title: "Crew gossip",
      weight: state.crew.length && state.crewMorale < 76 ? 10 + (76 - state.crewMorale) * 0.45 : 0,
      detail: `${port.name} | morale ${state.crewMorale}`,
      effectPreview: ["morale"],
      resolve: () => ({
        id: uid("world"),
        cardId: "crew-gossip",
        title: "Crew gossip",
        weight: 10 + (76 - state.crewMorale) * 0.45,
        text: `Crew gossip: ${port.name} tavern talk turned the watch toward the next run.`,
        effects: [{ kind: "morale", amount: 4 }],
      }),
    },
    {
      id: `salvage-ledger-${port.id}`,
      title: "Salvage ledger",
      weight: roughApproaches > 1.4 ? 8 + Math.min(18, roughApproaches * 3) : 0,
      detail: `${port.name} | rough approaches`,
      effectPreview: ["cash salvage", "standing"],
      resolve: () => {
        const payout = Math.round(randomBetween(42, 86) + stats.openWater * 7 + stats.navigation * 5);
        return {
          id: uid("world"),
          cardId: "salvage-ledger",
          title: "Salvage ledger",
          weight: 8 + Math.min(18, roughApproaches * 3),
          text: `Salvage ledger: wreckage reports off ${port.name} paid ${money(payout)} for a clean water read.`,
          effects: [
            { kind: "cash", amount: payout },
            { kind: "standing", factionId: port.faction, delta: 0.25 },
          ],
        };
      },
    },
    {
      id: `warehouse-tip-${port.id}`,
      title: "Warehouse tip",
      weight: bestLocalExport && bestLocalExport.stock.fill >= 0.72 ? 10 + bestLocalExport.stock.fill * 12 : 0,
      detail: `${port.name} | ${goodName(bestLocalExport?.goodId ?? port.exports[0] ?? goods[0].id)}`,
      effectPreview: ["glut tip"],
      resolve: () => {
        const goodId = bestLocalExport?.goodId ?? port.exports[0] ?? goods[0].id;
        const event: RumorEvent = {
          id: uid("deck"),
          portId: port.id,
          goodId,
          multiplier: 0.68,
          expires: state.day + Math.floor(randomBetween(4, 8)),
          kind: "glut",
        };
        return {
          id: uid("world"),
          cardId: "warehouse-tip",
          title: "Warehouse tip",
          weight: bestLocalExport ? 10 + bestLocalExport.stock.fill * 12 : 0,
          text: `Warehouse tip: ${port.name} factors whispered about cheap ${goodName(goodId)} on the quay.`,
          effects: [{ kind: "rumor", event }],
        };
      },
    },
  ];
}

function routeContractFor(state: GameState, toId: string) {
  return state.contracts
    .filter((contract) => contract.status === "active" && contractTouchesPort(contract, toId))
    .sort((left, right) => {
      const leftChain = left.chain ? 1 : 0;
      const rightChain = right.chain ? 1 : 0;
      return rightChain - leftChain || left.deadline - right.deadline || right.reward - left.reward;
    })[0] ?? null;
}

function contractTouchesPort(contract: GameState["contracts"][number], portId: string) {
  return contract.destinationPortId === portId || contract.originPortId === portId || Boolean(contract.stops?.some((stop) => stop.portId === portId && stop.delivered < stop.units));
}

function crewDisplayName(crewId: string) {
  return crewId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function portName(id: string) {
  return ports.find((port) => port.id === id)?.name ?? id;
}

function goodName(id: string) {
  return goods.find((good) => good.id === id)?.name ?? id;
}

function bestArrivalCargo(state: GameState, voyage: Voyage) {
  return goods
    .map((good) => {
      const quantity = state.cargo[good.id] || 0;
      const basis = state.cargoBasis[good.id] ?? sellPriceFor(state, voyage.fromId, good.id);
      return {
        goodId: good.id,
        quantity,
        margin: quantity > 0 ? (sellPriceFor(state, voyage.toId, good.id) - basis) * quantity : Number.NEGATIVE_INFINITY,
      };
    })
    .filter((entry) => entry.quantity > 0)
    .sort((left, right) => right.margin - left.margin || right.quantity - left.quantity)[0];
}

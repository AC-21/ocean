import { factions, goods, ports } from "./data";
import { marketAccessForGood, priceFor, sellPriceFor } from "./economy";
import { clamp, money, pick, randomBetween, uid } from "./math";
import { contractPacingForDay, runPhaseForDay } from "./pacing";
import { contractQualityForStanding } from "./politics";
import { cargoUnits, distanceBetween, routeDays, routeRisk, routeWearEstimate } from "./routing";
import { deriveShipStats } from "./stats";
import type { Contract, ContractChain, ContractChainId, ContractKind, ContractStop, GameState, PoliticalEvent, RecoverySource } from "./types";

export type ContractUrgency = "ready" | "urgent" | "due-soon" | "normal";

export type ContractPlanSummary = {
  cargoCost: number;
  cargoFits: boolean;
  deadlineSlack: number;
  destinationImport: boolean;
  destinationMargin: number;
  held: number;
  holdAfter: number;
  holdCapacity: number;
  marketAvailable: number;
  missing: number;
  netValue: number;
  purchasable: boolean;
  requiredUnits: number;
  rewardShare: number;
  routeDays: number;
  routeRisk: number;
  routeWear: number;
  status: "ready" | "loadable" | "blocked" | "in-transit";
  stop: ContractStop;
};

export type ContractRouteFitSummary = {
  cargoCost: number;
  deadlineSlack: number;
  destinationUpside: number;
  destinationUpsidePerUnit: number;
  expectedNet: number;
  holdAfter: number;
  holdCapacity: number;
  label: "Clean route" | "Workable route" | "Tight route" | "Blocked fit" | "Late route";
  requiredCargo: number;
  routeDays: number;
  routeRisk: number;
  routeWear: number;
  score: number;
  tone: "gain" | "progress" | "risk" | "loss";
};

export type RouteContractFocus = {
  contract: Contract;
  plan: ContractPlanSummary;
  status: ReturnType<typeof contractCargoStatus>;
};

export type RouteContractOfferFocus = {
  contract: Contract;
  fit: ContractRouteFitSummary;
  plan: ContractPlanSummary;
};

export type ContractChainPoliticalReward = {
  kind: PoliticalEvent["kind"];
  priceModifier: number;
  riskModifier: number;
  text: string;
};

type ContractChainStageSpec = {
  deadlineFlex: number;
  destinationPortId: string;
  failureStandingPenalty: number;
  failureText: string;
  factionId: string;
  goodId: string;
  hook: string;
  kind: ContractKind;
  originPortId: string;
  penaltyMultiplier: number;
  politicalReward?: ContractChainPoliticalReward;
  rareReward?: string;
  rewardCash?: number;
  rewardMultiplier: number;
  standingReward: number;
  successText: string;
  units: number;
};

type ContractChainTemplate = {
  id: ContractChainId;
  giver: string;
  title: string;
  stages: ContractChainStageSpec[];
};

export const contractChainTemplates: ContractChainTemplate[] = [
  {
    id: "charter_audit",
    giver: "Maribel Quill",
    title: "Ledger Audit",
    stages: [
      {
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        kind: "standard",
        units: 2,
        deadlineFlex: 6,
        rewardMultiplier: 1.24,
        penaltyMultiplier: 0.32,
        standingReward: 1.2,
        failureStandingPenalty: 1.6,
        hook: "Maribel Quill needs clean invoices carried before rival clerks rewrite the books.",
        successText: "Quill's audit trail held together; Charter Bank marked your ledger as reliable.",
        failureText: "Quill's audit collapsed into missing receipts; Charter Bank priced you as careless.",
      },
      {
        originPortId: "glassport",
        destinationPortId: "orchid",
        factionId: "charter",
        goodId: "glass",
        kind: "urgent",
        units: 3,
        deadlineFlex: 5,
        rewardMultiplier: 1.34,
        penaltyMultiplier: 0.38,
        standingReward: 1.7,
        failureStandingPenalty: 2.2,
        hook: "Quill's second packet names a warehouse leak; Orchid Roads wants proof before prices move.",
        successText: "The warehouse leak was sealed quietly; Quill upgraded your account standing.",
        failureText: "The leak reached Orchid buyers first; Charter clerks blamed your late packet.",
      },
      {
        originPortId: "orchid",
        destinationPortId: "grayhaven",
        factionId: "charter",
        goodId: "medicine",
        kind: "multi_stop",
        units: 4,
        deadlineFlex: 7,
        rewardMultiplier: 1.48,
        penaltyMultiplier: 0.42,
        standingReward: 2.5,
        failureStandingPenalty: 3.2,
        rewardCash: 180,
        rareReward: "Charter credit note",
        politicalReward: {
          kind: "permit",
          riskModifier: 0,
          priceModifier: 0.9,
          text: "Charter Bank credit note trims market fees at its harbors.",
        },
        hook: "Quill's final audit needs medicine manifests and a signed credit note returned to Grayhaven.",
        successText: "Quill closed the audit and issued a Charter credit note in your name.",
        failureText: "The final audit went public without your manifests; Charter Bank froze the note.",
      },
    ],
  },
  {
    id: "freeport_lifeline",
    giver: "Toma Vey",
    title: "Freeport Lifeline",
    stages: [
      {
        originPortId: "saffron",
        destinationPortId: "lowmarket",
        factionId: "freeports",
        goodId: "spice",
        kind: "urgent",
        units: 2,
        deadlineFlex: 5,
        rewardMultiplier: 1.28,
        penaltyMultiplier: 0.3,
        standingReward: 1.1,
        failureStandingPenalty: 1.4,
        hook: "Toma Vey is trying to keep a Lowmarket soup line open before the spice warehouses squeeze supply.",
        successText: "Toma's relief run landed before the warehouses locked their doors.",
        failureText: "The relief run missed the ration bell; Freeport brokers called it another empty promise.",
      },
      {
        originPortId: "lowmarket",
        destinationPortId: "saffron",
        factionId: "freeports",
        goodId: "tools",
        kind: "standard",
        units: 3,
        deadlineFlex: 6,
        rewardMultiplier: 1.3,
        penaltyMultiplier: 0.34,
        standingReward: 1.5,
        failureStandingPenalty: 2,
        hook: "Toma needs repair tools returned to Saffron Quay so the relief boats can sail again.",
        successText: "The relief boats were patched overnight; Toma put your name on the quay board.",
        failureText: "The repair crew waited idle, and Toma had to borrow at ugly dock rates.",
      },
      {
        originPortId: "saffron",
        destinationPortId: "orchid",
        factionId: "freeports",
        goodId: "tea",
        kind: "smuggling",
        units: 3,
        deadlineFlex: 6,
        rewardMultiplier: 1.52,
        penaltyMultiplier: 0.44,
        standingReward: 2.6,
        failureStandingPenalty: 3.4,
        rewardCash: 160,
        rareReward: "Freeport dock pass",
        politicalReward: {
          kind: "permit",
          riskModifier: -0.02,
          priceModifier: 0.91,
          text: "Freeport dock pass opens friendlier prices and quieter inspections.",
        },
        hook: "Toma's last favor is delicate tea under a quiet bill of lading for Orchid Roads.",
        successText: "Toma's dock pass arrived with the tea; Freeport handlers now wave you through faster.",
        failureText: "The quiet bill surfaced at customs, and Toma burned favors covering your wake.",
      },
    ],
  },
  {
    id: "admiralty_convoy",
    giver: "Commodore Rusk",
    title: "Convoy Marks",
    stages: [
      {
        originPortId: "stormhook",
        destinationPortId: "grayhaven",
        factionId: "admiralty",
        goodId: "iron",
        kind: "escort",
        units: 2,
        deadlineFlex: 6,
        rewardMultiplier: 1.2,
        penaltyMultiplier: 0.34,
        standingReward: 1.2,
        failureStandingPenalty: 1.8,
        hook: "Commodore Rusk wants iron ballast moved under escort papers to test your nerve.",
        successText: "Rusk's escort marks stayed clean through the crossing.",
        failureText: "Rusk's escort papers came back late and salt-stained; the Admiralty noticed.",
      },
      {
        originPortId: "grayhaven",
        destinationPortId: "stormhook",
        factionId: "admiralty",
        goodId: "medicine",
        kind: "urgent",
        units: 3,
        deadlineFlex: 5,
        rewardMultiplier: 1.36,
        penaltyMultiplier: 0.38,
        standingReward: 1.8,
        failureStandingPenalty: 2.4,
        hook: "Rusk's patrol surgeon needs medicine back at Stormhook before the next convoy bell.",
        successText: "The surgeon signed your manifest in red wax; Rusk called you dependable.",
        failureText: "The surgeon borrowed medicine from rivals, and Rusk entered your name in the wrong column.",
      },
      {
        originPortId: "stormhook",
        destinationPortId: "orchid",
        factionId: "admiralty",
        goodId: "silk",
        kind: "escort",
        units: 3,
        deadlineFlex: 7,
        rewardMultiplier: 1.56,
        penaltyMultiplier: 0.46,
        standingReward: 2.8,
        failureStandingPenalty: 3.6,
        rewardCash: 220,
        rareReward: "Admiralty convoy writ",
        politicalReward: {
          kind: "convoy",
          riskModifier: -0.13,
          priceModifier: 0.98,
          text: "Admiralty convoy writ lowers route risk near its patrol harbors.",
        },
        hook: "Rusk's final convoy carries silk decoys and sealed patrol marks through Orchid Roads.",
        successText: "Rusk stamped a convoy writ for your captain's desk.",
        failureText: "The decoy convoy scattered, and Rusk revoked the promised patrol marks.",
      },
    ],
  },
];

export function generateContract(state: GameState, originPortId = state.currentPort): Contract {
  const chain = createNextContractChainOffer(state, originPortId);
  if (chain && Math.random() < 0.42) return chain;
  const origin = ports.find((port) => port.id === originPortId) ?? ports[0];
  const pacing = contractPacingForDay(state.day);
  const destinations = destinationPoolForPhase(state, origin.id);
  const destination = pick(destinations);
  const faction = factions.find((entry) => entry.id === destination.faction) ?? factions[0];
  const standing = state.factionStanding[faction.id] ?? 0;
  const quality = contractQualityForStanding(standing);
  const kind = pickContractKind(state, standing);
  const candidates = goodsForPhase(state, origin.id, destination.id);
  const good = pick(kind === "smuggling" ? smugglingGoodsFor(destination.id, candidates) : candidates.length ? candidates : goods);
  const routePressure = distanceBetween(origin.id, destination.id) / 210;
  const units = Math.max(1, Math.round(randomBetween(pacing.minUnits, pacing.maxUnits + routePressure * pacing.routeUnitPressure) * quality.unitModifier));
  const travelDays = routeDays(state, origin.id, destination.id);
  const deadline = state.day + travelDays + Math.floor(randomBetween(pacing.deadlineMin, pacing.deadlineMax)) + quality.deadlineFlex - (kind === "urgent" ? 2 : 0);
  const kindReward =
    kind === "urgent" ? 1.24 : kind === "smuggling" ? 1.38 : kind === "escort" ? 1.1 : kind === "multi_stop" ? 1.18 : 1;
  const rareWorkReward = kind === "standard" ? 1 : 1 + quality.rareWorkModifier * 0.35;
  const baseReward =
    good.base * units * (1.35 + routePressure * 0.28) * quality.rewardModifier * pacing.rewardMultiplier * kindReward * rareWorkReward;
  const reward = Math.round(baseReward / 10) * 10;
  const penalty = Math.round(baseReward * pacing.penaltyMultiplier * (kind === "smuggling" ? 1.25 : kind === "urgent" ? 1.12 : 1) / 10) * 10;
  const stops = kind === "multi_stop" ? makeMultiStopContractStops(state, origin.id, destination.id, good.id, units, reward) : undefined;

  return {
    id: uid("contract"),
    kind,
    originPortId: origin.id,
    destinationPortId: destination.id,
    factionId: faction.id,
    goodId: good.id,
    units: stops ? stops.reduce((sum, stop) => sum + stop.units, 0) : units,
    deadline: Math.max(state.day + travelDays + 1, deadline),
    reward,
    penalty,
    ...(stops ? { stops } : {}),
    ...(kind === "escort" ? { routeRiskModifier: -0.08 } : {}),
    ...(kind === "smuggling" ? { inspectionRisk: 0.16, smugglingFine: Math.round(penalty * 1.35) } : {}),
    status: "available",
  };
}

export function generateLateGambleContract(state: GameState, originPortId = state.currentPort): Contract {
  const origin = ports.find((port) => port.id === originPortId) ?? ports[0];
  const destination = [...ports]
    .filter((port) => port.id !== origin.id)
    .sort((left, right) => {
      return distanceBetween(origin.id, right.id) * (1 + right.risk) - distanceBetween(origin.id, left.id) * (1 + left.risk);
    })[0] ?? ports[0];
  const faction = factions.find((entry) => entry.id === destination.faction) ?? factions[0];
  const imported = goods
    .filter((good) => destination.imports.includes(good.id))
    .sort((left, right) => right.base - left.base);
  const good = imported[0] ?? [...goods].sort((left, right) => right.base - left.base)[0];
  const routePressure = distanceBetween(origin.id, destination.id) / 210;
  const units = Math.max(6, Math.round(5 + routePressure * 1.4));
  const travelDays = routeDays(state, origin.id, destination.id);
  const standing = state.factionStanding[faction.id] ?? 0;
  const quality = contractQualityForStanding(standing);
  const baseReward = good.base * units * (2.05 + routePressure * 0.42) * quality.rewardModifier;

  return {
    id: uid("contract"),
    kind: "urgent",
    originPortId: origin.id,
    destinationPortId: destination.id,
    factionId: faction.id,
    goodId: good.id,
    units,
    deadline: state.day + travelDays + 2,
    reward: Math.round(baseReward / 10) * 10,
    penalty: Math.round(baseReward * 0.62 / 10) * 10,
    status: "available",
  };
}

export function createRecoveryContract(state: GameState, source: RecoverySource, originPortId = state.currentPort): Contract | null {
  const origin = ports.find((port) => port.id === originPortId);
  if (!origin) return null;
  if (state.contracts.some((contract) => contract.status === "available" && contract.originPortId === origin.id && contract.recoverySource === source)) return null;

  const destination = recoveryDestinationFor(state, origin.id, source);
  const faction = factions.find((entry) => entry.id === origin.faction) ?? factions[0];
  const good = recoveryGoodFor(origin.id, destination.id, source);
  const routePressure = distanceBetween(origin.id, destination.id) / 210;
  const travelDays = routeDays(state, origin.id, destination.id);
  const units = source === "storm" ? 2 : source === "pirate" ? 2 : 1;
  const kind: ContractKind = source === "pirate" ? "escort" : source === "customs" ? "standard" : "urgent";
  const sourceBonus = source === "storm" ? 1.42 : source === "pirate" ? 1.34 : 1.28;
  const reward = Math.round((good.base * units * (1.65 + routePressure * 0.22) * sourceBonus) / 10) * 10;
  return {
    id: uid(`recovery-${source}`),
    kind,
    originPortId: origin.id,
    destinationPortId: destination.id,
    factionId: faction.id,
    goodId: good.id,
    units,
    deadline: state.day + travelDays + (source === "storm" ? 5 : 4),
    reward,
    penalty: Math.round((reward * 0.18) / 10) * 10,
    ...(source === "pirate" ? { routeRiskModifier: -0.07 } : {}),
    recoverySource: source,
    brief: recoveryBriefFor(source, origin.name, destination.name, good.name),
    status: "available",
  };
}

export function createNextContractChainOffer(state: GameState, originPortId = state.currentPort, chainId?: ContractChainId): Contract | null {
  const templates = chainId ? contractChainTemplates.filter((template) => template.id === chainId) : contractChainTemplates;
  for (const template of templates) {
    const nextStage = nextContractChainStage(state, template.id);
    if (!nextStage) continue;
    const stage = template.stages[nextStage - 1];
    if (!stage || stage.originPortId !== originPortId) continue;
    return makeContractChainOffer(state, template, nextStage);
  }
  return null;
}

export function contractChainLabel(contract: Contract) {
  if (!contract.chain) return null;
  return `${contract.chain.giver}: ${contract.chain.title} ${contract.chain.stage}/${contract.chain.stages}`;
}

export function contractChainRewardText(contract: Contract) {
  if (!contract.chain) return "";
  const parts = [
    contract.chain.rareReward,
    contract.chain.rewardCash ? `bonus ${money(contract.chain.rewardCash)}` : "",
    contract.chain.standingReward ? `standing +${contract.chain.standingReward}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "relationship work";
}

function nextContractChainStage(state: GameState, chainId: ContractChainId) {
  if (state.contracts.some((contract) => contract.chain?.id === chainId && (contract.status === "available" || contract.status === "active"))) return null;
  const completed = state.contracts
    .filter((contract) => contract.chain?.id === chainId && contract.status === "completed")
    .reduce((highest, contract) => Math.max(highest, contract.chain?.stage ?? 0), 0);
  const template = contractChainTemplates.find((entry) => entry.id === chainId);
  const next = completed + 1;
  return template && next <= template.stages.length ? next : null;
}

function makeContractChainOffer(state: GameState, template: ContractChainTemplate, stageNumber: number): Contract {
  const stage = template.stages[stageNumber - 1];
  const origin = ports.find((port) => port.id === stage.originPortId) ?? ports[0];
  const destination = ports.find((port) => port.id === stage.destinationPortId) ?? ports[0];
  const good = goods.find((entry) => entry.id === stage.goodId) ?? goods[0];
  const routePressure = distanceBetween(origin.id, destination.id) / 210;
  const travelDays = routeDays(state, origin.id, destination.id);
  const baseReward = good.base * stage.units * (1.46 + routePressure * 0.32) * stage.rewardMultiplier;
  const reward = Math.round(baseReward / 10) * 10;
  const penalty = Math.round(baseReward * stage.penaltyMultiplier / 10) * 10;
  const stops =
    stage.kind === "multi_stop"
      ? makeMultiStopContractStops(state, origin.id, destination.id, good.id, stage.units, reward)
      : undefined;
  const chain: ContractChain = {
    id: template.id,
    giver: template.giver,
    title: template.title,
    stage: stageNumber,
    stages: template.stages.length,
    hook: stage.hook,
    successText: stage.successText,
    failureText: stage.failureText,
    ...(stage.rareReward ? { rareReward: stage.rareReward } : {}),
    ...(stage.rewardCash ? { rewardCash: stage.rewardCash } : {}),
    standingReward: stage.standingReward,
    failureStandingPenalty: stage.failureStandingPenalty,
  };

  return {
    id: uid("chain"),
    kind: stage.kind,
    originPortId: origin.id,
    destinationPortId: destination.id,
    factionId: stage.factionId,
    goodId: good.id,
    units: stops ? stops.reduce((sum, stop) => sum + stop.units, 0) : stage.units,
    deadline: state.day + travelDays + stage.deadlineFlex,
    reward,
    penalty,
    ...(stops ? { stops } : {}),
    ...(stage.kind === "escort" ? { routeRiskModifier: -0.1 } : {}),
    ...(stage.kind === "smuggling" ? { inspectionRisk: 0.18, smugglingFine: Math.round(penalty * 1.35) } : {}),
    chain,
    status: "available",
  };
}

export function contractChainPoliticalReward(contract: Contract): ContractChainPoliticalReward | null {
  if (!contract.chain) return null;
  const template = contractChainTemplates.find((entry) => entry.id === contract.chain?.id);
  const stage = template?.stages[contract.chain.stage - 1];
  return stage?.politicalReward ?? null;
}

export function seedContracts(state: GameState, count = ports.length) {
  const contracts: Contract[] = [];
  const shuffledOrigins = [...ports].sort(() => Math.random() - 0.5);
  for (let index = 0; index < count; index += 1) {
    const originId = shuffledOrigins[index % shuffledOrigins.length].id;
    contracts.push(createNextContractChainOffer({ ...state, contracts }, originId) ?? generateContract({ ...state, contracts }, originId));
  }
  return contracts;
}

export function contractBoardSlotsForPort(state: GameState, portId: string) {
  const phase = runPhaseForDay(state.day).id;
  const port = ports.find((entry) => entry.id === portId) ?? ports[0];
  const standing = state.factionStanding[port.faction] ?? 0;
  const localUpgradeBoard = phase === "mid" && portId === state.currentPort;
  const trustedBoard = phase !== "early" && standing >= 14;
  return localUpgradeBoard || trustedBoard ? 2 : 1;
}

export function refreshContracts(state: GameState) {
  const activeContracts = state.contracts.filter((contract) => contract.status === "active");
  const recentHistory = state.contracts.filter((contract) => contract.status === "completed" || contract.status === "failed").slice(0, 10);
  const currentAvailable = capAvailableContracts(
    state,
    state.contracts.filter((contract) => contract.status === "available" && contract.deadline >= state.day)
  );
  const byPort = new Map<string, number>();
  for (const contract of currentAvailable) {
    byPort.set(contract.originPortId, (byPort.get(contract.originPortId) ?? 0) + 1);
  }

  const additions: Contract[] = [];
  for (const port of ports) {
    const needed = Math.max(0, contractBoardSlotsForPort(state, port.id) - (byPort.get(port.id) ?? 0));
    for (let index = 0; index < needed; index += 1) {
      const withPending = { ...state, contracts: [...activeContracts, ...recentHistory, ...currentAvailable, ...additions] };
      additions.push(createNextContractChainOffer(withPending, port.id) ?? generateContract(withPending, port.id));
    }
  }

  const lateGamble =
    runPhaseForDay(state.day).id === "late" &&
    ![...activeContracts, ...currentAvailable, ...additions].some((contract) => isLateGambleContract(state, contract))
      ? [generateLateGambleContract(state)]
      : [];

  return [...activeContracts, ...recentHistory, ...currentAvailable, ...lateGamble, ...additions].slice(0, 30);
}

function capAvailableContracts(state: GameState, contracts: Contract[]) {
  const byPort = new Map<string, Contract[]>();
  for (const contract of contracts) {
    const list = byPort.get(contract.originPortId) ?? [];
    list.push(contract);
    byPort.set(contract.originPortId, list);
  }

  return ports.flatMap((port) => {
    const slots = contractBoardSlotsForPort(state, port.id);
    return (byPort.get(port.id) ?? [])
      .sort((left, right) => {
        if (left.recoverySource && !right.recoverySource) return -1;
        if (!left.recoverySource && right.recoverySource) return 1;
        const leftRouteDays = routeDays(state, left.originPortId, left.destinationPortId);
        const rightRouteDays = routeDays(state, right.originPortId, right.destinationPortId);
        const leftSlack = left.deadline - state.day - leftRouteDays;
        const rightSlack = right.deadline - state.day - rightRouteDays;
        return leftSlack - rightSlack || right.reward / Math.max(1, right.units) - left.reward / Math.max(1, left.units);
      })
      .slice(0, slots);
  });
}

function recoveryDestinationFor(state: GameState, originId: string, source: RecoverySource) {
  return [...ports]
    .filter((port) => port.id !== originId)
    .sort((left, right) => {
      const leftRisk = routeRisk(state, originId, left.id);
      const rightRisk = routeRisk(state, originId, right.id);
      if (source === "pirate") return right.risk + rightRisk - (left.risk + leftRisk);
      if (source === "customs") return (state.factionStanding[right.faction] ?? 0) - (state.factionStanding[left.faction] ?? 0) || leftRisk - rightRisk;
      return leftRisk - rightRisk || routeWearEstimate(state, originId, left.id).hullWear - routeWearEstimate(state, originId, right.id).hullWear;
    })[0] ?? ports[0];
}

function recoveryGoodFor(originId: string, destinationId: string, source: RecoverySource) {
  const origin = ports.find((port) => port.id === originId) ?? ports[0];
  const destination = ports.find((port) => port.id === destinationId) ?? ports[0];
  const preferred =
    source === "storm"
      ? ["tools", "medicine"]
      : source === "pirate"
        ? ["iron", "tools"]
        : ["tea", "glass"];
  const goodId =
    preferred.find((id) => origin.exports.includes(id) || destination.imports.includes(id)) ??
    origin.exports.find((id) => destination.imports.includes(id)) ??
    origin.exports[0] ??
    destination.imports[0] ??
    goods[0].id;
  return goods.find((good) => good.id === goodId) ?? goods[0];
}

function recoveryBriefFor(source: RecoverySource, originName: string, destinationName: string, goodName: string) {
  if (source === "storm") return `Recovery work: ${originName} dockhands need ${goodName} moved after the hard-water damage. Low penalty, quick cash.`;
  if (source === "pirate") return `Recovery work: patrol clerks posted an escort after the pirate hail. Carry ${goodName} to ${destinationName} and rebuild standing.`;
  return `Recovery work: brokers want clean ${goodName} papers after the customs trouble. Small job, useful goodwill.`;
}

export function isLateGambleContract(state: GameState, contract: Contract) {
  if (runPhaseForDay(state.day).id !== "late") return false;
  const good = goods.find((entry) => entry.id === contract.goodId);
  const travelDays = routeDays(state, contract.originPortId, contract.destinationPortId);
  const timePressure = contract.deadline - state.day <= travelDays + 3;
  const rewardPerUnit = contract.reward / Math.max(1, contract.units);
  return Boolean(good && contract.units >= 6 && timePressure && rewardPerUnit >= good.base * 1.85);
}

export function contractPacingLabel(state: GameState, contract: Contract) {
  if (isLateGambleContract(state, contract)) return "late gamble";
  return contractPacingForDay(state.day).label;
}

export function contractKindLabel(contract: Contract) {
  const kind = contract.kind ?? "standard";
  if (kind === "multi_stop") return "multi-stop";
  if (kind === "urgent") return "urgent";
  if (kind === "escort") return "escort";
  if (kind === "smuggling") return "gray cargo";
  return "freight";
}

export function contractStops(contract: Contract): ContractStop[] {
  if (contract.stops?.length) {
    return contract.stops.map((stop) => ({
      portId: stop.portId,
      goodId: stop.goodId,
      units: Math.max(1, Math.round(stop.units)),
      delivered: clamp(Math.round(stop.delivered ?? 0), 0, Math.max(1, Math.round(stop.units))),
      reward: Math.max(0, Math.round(stop.reward ?? contract.reward / contract.stops!.length)),
    }));
  }

  return [
    {
      portId: contract.destinationPortId,
      goodId: contract.goodId,
      units: Math.max(1, Math.round(contract.units)),
      delivered: clamp(Math.round(contract.deliveredUnits ?? 0), 0, Math.max(1, Math.round(contract.units))),
      reward: Math.max(0, Math.round(contract.reward)),
    },
  ];
}

export function contractTotalUnits(contract: Contract) {
  return contractStops(contract).reduce((sum, stop) => sum + stop.units, 0);
}

export function contractDeliveredUnits(contract: Contract) {
  return contractStops(contract).reduce((sum, stop) => sum + clamp(stop.delivered, 0, stop.units), 0);
}

export function currentContractStop(state: GameState, contract: Contract) {
  return contractStops(contract).find((stop) => stop.portId === state.currentPort && stop.delivered < stop.units) ?? null;
}

export function nextContractStop(contract: Contract) {
  return contractStops(contract).find((stop) => stop.delivered < stop.units) ?? null;
}

export function contractRouteRiskModifier(state: GameState, toId: string) {
  return state.contracts
    .filter((contract) => contract.status === "active")
    .filter((contract) => contract.destinationPortId === toId || contractStops(contract).some((stop) => stop.portId === toId && stop.delivered < stop.units))
    .reduce((sum, contract) => {
      const kind = contract.kind ?? "standard";
      if (kind === "escort") return sum + (contract.routeRiskModifier ?? -0.08);
      if (kind === "smuggling") return sum + (contract.inspectionRisk ?? 0.12) * 0.35;
      return sum;
    }, 0);
}

export function activeContracts(state: GameState) {
  return state.contracts
    .filter((contract) => contract.status === "active")
    .sort((left, right) => {
      const leftStatus = contractCargoStatus(state, left);
      const rightStatus = contractCargoStatus(state, right);
      if (leftStatus.ready !== rightStatus.ready) return leftStatus.ready ? -1 : 1;
      return leftStatus.daysLeft - rightStatus.daysLeft || rightStatus.missing - leftStatus.missing;
    });
}

export function routeContractFocus(state: GameState, stopPortId?: string): RouteContractFocus | null {
  const candidates = activeContracts(state)
    .map((contract) => ({
      contract,
      plan: contractPlanSummary(state, contract),
      status: contractCargoStatus(state, contract),
    }))
    .filter((focus) => !stopPortId || focus.plan.stop.portId === stopPortId);

  return candidates.sort(contractFocusSort)[0] ?? null;
}

export function routeContractOfferFocus(state: GameState, stopPortId?: string): RouteContractOfferFocus | null {
  const candidates = state.contracts
    .filter((contract) => contract.status === "available" && contract.originPortId === state.currentPort)
    .map((contract) => ({
      contract,
      fit: contractRouteFitSummary(state, contract),
      plan: contractPlanSummary(state, contract),
    }))
    .filter((focus) => !stopPortId || focus.plan.stop.portId === stopPortId);

  return candidates.sort(contractOfferSort)[0] ?? null;
}

function contractOfferSort(left: RouteContractOfferFocus, right: RouteContractOfferFocus) {
  const statusRank = (focus: RouteContractOfferFocus) => {
    if (focus.plan.status === "loadable") return 0;
    if (focus.plan.status === "in-transit" || focus.plan.status === "ready") return 1;
    return 2;
  };

  return (
    statusRank(left) - statusRank(right) ||
    right.fit.score - left.fit.score ||
    left.plan.deadlineSlack - right.plan.deadlineSlack ||
    right.plan.netValue - left.plan.netValue
  );
}

function contractFocusSort(left: RouteContractFocus, right: RouteContractFocus) {
  const statusRank = (focus: RouteContractFocus) => {
    if (focus.status.ready) return 0;
    if (focus.plan.status === "loadable") return 1;
    if (focus.plan.status === "in-transit") return 2;
    return 3;
  };
  return (
    statusRank(left) - statusRank(right) ||
    left.plan.deadlineSlack - right.plan.deadlineSlack ||
    right.plan.netValue - left.plan.netValue
  );
}

export function contractCargoStatus(state: GameState, contract: Contract) {
  const stop = currentContractStop(state, contract);
  const totalUnits = contractTotalUnits(contract);
  const delivered = contractDeliveredUnits(contract);
  const remaining = Math.max(0, totalUnits - delivered);
  const held = stop ? state.cargo[stop.goodId] || 0 : state.cargo[contract.goodId] || 0;
  const missing = stop ? Math.max(0, stop.units - stop.delivered) : remaining;
  const daysLeft = contract.deadline - state.day;
  return {
    held,
    missing,
    delivered,
    remaining,
    totalUnits,
    daysLeft,
    atDestination: Boolean(stop) || state.currentPort === contract.destinationPortId,
    ready: Boolean(stop && held > 0),
  };
}

export function contractPlanSummary(state: GameState, contract: Contract): ContractPlanSummary {
  const stop = currentContractStop(state, contract) ?? nextContractStop(contract) ?? contractStops(contract)[0];
  const good = goods.find((entry) => entry.id === stop.goodId) ?? goods[0];
  const held = state.cargo[stop.goodId] || 0;
  const requiredUnits = Math.max(0, stop.units - stop.delivered);
  const missing = Math.max(0, requiredUnits - held);
  const buyPrice = priceFor(state, state.currentPort, stop.goodId);
  const sellPrice = sellPriceFor(state, stop.portId, stop.goodId);
  const cargoCost = missing * buyPrice;
  const routeDayCount = state.currentPort === stop.portId ? 0 : routeDays(state, state.currentPort, stop.portId);
  const risk = state.currentPort === stop.portId ? 0 : routeRisk(state, state.currentPort, stop.portId);
  const wear = state.currentPort === stop.portId ? 0 : routeWearEstimate(state, state.currentPort, stop.portId).hullWear;
  const totalUnits = contractTotalUnits(contract);
  const rewardShare = Math.round(contract.reward * (requiredUnits / Math.max(1, totalUnits)));
  const access = marketAccessForGood(state, state.currentPort, stop.goodId);
  const stats = deriveShipStats(state);
  const loadedCargoUnits = cargoUnits(state) + missing * good.cargo;
  const cargoFits = loadedCargoUnits <= stats.cargoCap;
  const marketAvailable = Math.min(access.availableStock, access.stock);
  const purchasable = missing <= 0 || (access.allowed && marketAvailable >= missing && cargoCost <= state.cash && cargoFits);
  const ready = state.currentPort === stop.portId && held > 0 && requiredUnits > 0;
  const status = ready ? "ready" : missing <= 0 ? "in-transit" : purchasable ? "loadable" : "blocked";
  const destination = ports.find((entry) => entry.id === stop.portId) ?? ports[0];

  return {
    cargoCost,
    cargoFits,
    deadlineSlack: contract.deadline - state.day - routeDayCount,
    destinationImport: destination.imports.includes(stop.goodId),
    destinationMargin: sellPrice - buyPrice,
    held,
    holdAfter: loadedCargoUnits,
    holdCapacity: stats.cargoCap,
    marketAvailable,
    missing,
    netValue: rewardShare - cargoCost,
    purchasable,
    requiredUnits,
    rewardShare,
    routeDays: routeDayCount,
    routeRisk: risk,
    routeWear: wear,
    status,
    stop,
  };
}

export function contractRouteFitSummary(state: GameState, contract: Contract): ContractRouteFitSummary {
  const plan = contractPlanSummary(state, contract);
  const requiredCargo = plan.missing;
  const destinationUpside = plan.destinationMargin * Math.max(1, plan.requiredUnits);
  const score = Math.round(
    plan.netValue +
      plan.deadlineSlack * 45 +
      Math.max(-160, plan.destinationMargin) * Math.max(1, plan.requiredUnits) * 0.35 +
      (plan.destinationImport ? 70 : 0) -
      plan.routeRisk * 440 -
      plan.routeWear * 18 -
      (plan.cargoFits ? 0 : 260) -
      (plan.purchasable ? 0 : 160)
  );
  const label =
    plan.status === "blocked"
      ? "Blocked fit"
      : plan.deadlineSlack < 0
        ? "Late route"
        : plan.deadlineSlack <= 1 || plan.routeRisk >= 0.38 || !plan.cargoFits
          ? "Tight route"
          : score >= 280
            ? "Clean route"
            : "Workable route";
  const tone = label === "Clean route" ? "gain" : label === "Workable route" ? "progress" : label === "Tight route" || label === "Blocked fit" ? "risk" : "loss";

  return {
    cargoCost: plan.cargoCost,
    deadlineSlack: plan.deadlineSlack,
    destinationUpside,
    destinationUpsidePerUnit: plan.destinationMargin,
    expectedNet: plan.netValue,
    holdAfter: plan.holdAfter,
    holdCapacity: plan.holdCapacity,
    label,
    requiredCargo,
    routeDays: plan.routeDays,
    routeRisk: plan.routeRisk,
    routeWear: plan.routeWear,
    score,
    tone,
  };
}

export function contractUrgency(state: GameState, contract: Contract): ContractUrgency {
  const status = contractCargoStatus(state, contract);
  if (status.ready) return "ready";
  if (status.daysLeft <= 2) return "urgent";
  if (status.daysLeft <= 5) return "due-soon";
  return "normal";
}

export function contractPressureLabel(state: GameState, contract: Contract) {
  const status = contractCargoStatus(state, contract);
  if (status.ready) return "ready";
  if (status.delivered > 0 && status.remaining > 0) return `${status.delivered}/${status.totalUnits}`;
  if (status.missing > 0) return `need ${status.missing}`;
  return `${status.daysLeft}d`;
}

export function contractSummary(contract: Contract) {
  const origin = ports.find((port) => port.id === contract.originPortId);
  const destination = ports.find((port) => port.id === contract.destinationPortId);
  const good = goods.find((entry) => entry.id === contract.goodId);
  const faction = factions.find((entry) => entry.id === contract.factionId);
  return {
    originName: origin?.name ?? contract.originPortId,
    destinationName: destination?.name ?? contract.destinationPortId,
    goodName: good?.name ?? contract.goodId,
    factionName: faction?.name ?? contract.factionId,
  };
}

export function contractRouteSummary(contract: Contract) {
  return contractStops(contract)
    .map((stop) => {
      const port = ports.find((entry) => entry.id === stop.portId);
      const good = goods.find((entry) => entry.id === stop.goodId);
      return `${port?.name ?? stop.portId}: ${Math.max(0, stop.units - stop.delivered)} ${good?.name ?? stop.goodId}`;
    })
    .join(" -> ");
}

function pickContractKind(state: GameState, standing = 0): ContractKind {
  const phase = runPhaseForDay(state.day).id;
  const roll = Math.random();
  const rareBias = contractQualityForStanding(standing).rareWorkModifier;
  if (phase === "early") {
    const urgentLimit = clamp(0.18 + Math.max(0, -rareBias) * 0.18, 0.12, 0.26);
    return roll < urgentLimit ? "urgent" : "standard";
  }
  if (phase === "late") {
    const smugglingLimit = clamp(0.24 - Math.max(0, rareBias) * 0.36 + Math.max(0, -rareBias) * 0.22, 0.14, 0.34);
    const multiLimit = clamp(smugglingLimit + 0.22 + Math.max(0, rareBias) * 0.18, smugglingLimit + 0.16, smugglingLimit + 0.3);
    const urgentLimit = clamp(multiLimit + 0.2, multiLimit + 0.14, multiLimit + 0.25);
    const escortLimit = clamp(urgentLimit + 0.16 + Math.max(0, rareBias) * 0.16, urgentLimit + 0.12, 0.9);
    if (roll < smugglingLimit) return "smuggling";
    if (roll < multiLimit) return "multi_stop";
    if (roll < urgentLimit) return "urgent";
    if (roll < escortLimit) return "escort";
    return "standard";
  }
  const multiLimit = clamp(0.18 + Math.max(0, rareBias) * 0.22, 0.12, 0.26);
  const escortLimit = clamp(multiLimit + 0.16 + Math.max(0, rareBias) * 0.16, multiLimit + 0.12, multiLimit + 0.24);
  const smugglingLimit = clamp(escortLimit + 0.14 - Math.max(0, rareBias) * 0.18 + Math.max(0, -rareBias) * 0.22, escortLimit + 0.08, escortLimit + 0.2);
  const urgentLimit = clamp(smugglingLimit + 0.16 + Math.max(0, -rareBias) * 0.12, smugglingLimit + 0.12, 0.74);
  if (roll < multiLimit) return "multi_stop";
  if (roll < escortLimit) return "escort";
  if (roll < smugglingLimit) return "smuggling";
  if (roll < urgentLimit) return "urgent";
  return "standard";
}

function makeMultiStopContractStops(state: GameState, originId: string, destinationId: string, goodId: string, units: number, reward: number) {
  const intermediate = ports
    .filter((port) => port.id !== originId && port.id !== destinationId)
    .sort((left, right) => distanceBetween(originId, left.id) + distanceBetween(left.id, destinationId) - (distanceBetween(originId, right.id) + distanceBetween(right.id, destinationId)))[0];
  if (!intermediate) return undefined;
  const firstUnits = Math.max(1, Math.floor(units / 2));
  const secondUnits = Math.max(1, units - firstUnits);
  const intermediateCandidates = goodsForPhase(state, originId, intermediate.id);
  const intermediateGood = pick(intermediateCandidates.length ? intermediateCandidates : goods);
  const firstReward = Math.round(reward * (firstUnits / Math.max(1, firstUnits + secondUnits)));
  return [
    { portId: intermediate.id, goodId: intermediateGood.id, units: firstUnits, delivered: 0, reward: firstReward },
    { portId: destinationId, goodId, units: secondUnits, delivered: 0, reward: Math.max(0, reward - firstReward) },
  ];
}

function smugglingGoodsFor(destinationId: string, fallback: typeof goods) {
  const destination = ports.find((port) => port.id === destinationId);
  const tariffGoods = factions.find((faction) => faction.id === destination?.faction)?.tariffGoods ?? [];
  const candidates = goods.filter((good) => tariffGoods.includes(good.id) || destination?.imports.includes(good.id));
  return candidates.length ? candidates : fallback;
}

function destinationPoolForPhase(state: GameState, originId: string) {
  const phase = runPhaseForDay(state.day).id;
  const destinations = ports.filter((port) => port.id !== originId);
  if (phase === "early") {
    return [...destinations]
      .sort((left, right) => {
        return distanceBetween(originId, left.id) + left.risk * 240 - (distanceBetween(originId, right.id) + right.risk * 240);
      })
      .slice(0, 3);
  }
  if (phase === "late") {
    return [...destinations]
      .sort((left, right) => {
        return distanceBetween(originId, right.id) * (1 + right.risk) - distanceBetween(originId, left.id) * (1 + left.risk);
      })
      .slice(0, 4);
  }
  return destinations;
}

function goodsForPhase(state: GameState, originId: string, destinationId: string) {
  const phase = runPhaseForDay(state.day).id;
  const origin = ports.find((port) => port.id === originId) ?? ports[0];
  const destination = ports.find((port) => port.id === destinationId) ?? ports[0];
  const tradeFit = goods.filter((entry) => !origin.exports.includes(entry.id) || destination.imports.includes(entry.id));
  if (phase === "early") {
    return tradeFit.filter((entry) => entry.base <= 74 || origin.exports.includes(entry.id));
  }
  if (phase === "late") {
    const highValue = tradeFit.filter((entry) => entry.base >= 68 || destination.imports.includes(entry.id));
    return highValue.length ? highValue : tradeFit;
  }
  return tradeFit;
}

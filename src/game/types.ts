export type TabId = "market" | "harbor" | "contracts" | "intel";
export type SailPlanId = "cautious" | "balanced" | "hard" | "quiet";

export type Cargo = Record<string, number>;
export type Market = Record<string, Record<string, number>>;
export type MarketStock = Record<string, Record<string, number>>;
export type MarketPricePoint = {
  day: number;
  price: number;
};
export type MarketPriceHistory = Record<string, Record<string, MarketPricePoint[]>>;
export type FactionStanding = Record<string, number>;
export type CaptainSkillId = "navigation" | "seamanship" | "brokerage" | "gunnery";
export type CaptainSkills = Record<CaptainSkillId, number>;
export type EquipmentSlot = "deck" | "instrument" | "hardpoint" | "quarters";
export type CrewRankId = "green" | "seasoned" | "veteran" | "master";
export type CrewTraitId = "loyal" | "storm_scarred" | "marketwise";
export type CrewTemperamentId = "steady" | "bold" | "cautious" | "mercantile";
export type CrewRoutePreferenceId = "safe_water" | "fast_water" | "profitable_cargo" | "armed_routes";
export type CrewDemandId = "shore_leave" | "safer_orders" | "profit_share" | "action";

export type Good = {
  id: string;
  name: string;
  base: number;
  cargo: number;
  note: string;
  volatility: number;
};

export type Port = {
  id: string;
  name: string;
  x: number;
  y: number;
  risk: number;
  flavor: string;
  faction: string;
  exports: string[];
  imports: string[];
  asset?: string;
};

export type Faction = {
  id: string;
  name: string;
  policy: string;
  tariffGoods: string[];
  color: string;
};

export type ShipRoleId = "starter" | "balanced" | "clipper" | "patrol" | "barge" | "freighter";

export type ShipHandling = {
  windAffinity: number;
  currentAffinity: number;
  roughWaterRelief: number;
  cargoDragModifier: number;
  cargoRiskModifier: number;
  riskModifier: number;
  wearModifier: number;
  resaleModifier: number;
};

export type ShipSpec = {
  id: string;
  name: string;
  asset?: string;
  factionId?: string;
  role: ShipRoleId;
  silhouette: string;
  upgradePath: string;
  handling: ShipHandling;
  price: number;
  cargoCap: number;
  cannons: number;
  speed: number;
  openWater: number;
  crewCap: number;
  hullMax: number;
  note: string;
};

export type UpgradeSpec = {
  id: string;
  name: string;
  factionId?: string;
  cost: number;
  slot: EquipmentSlot;
  effects: Partial<ShipStats>;
  note: string;
};

export type CrewSpec = {
  id: string;
  name: string;
  cost: number;
  wage: number;
  effects: Partial<ShipStats>;
  note: string;
};

export type CrewProfile = {
  temperament: CrewTemperamentId;
  preference: CrewRoutePreferenceId;
  loyalty: number;
  strain: number;
  demand?: CrewDemandId;
  demandExpires?: number;
  lastRoute?: string;
};

export type CaptainSkillSpec = {
  id: CaptainSkillId;
  name: string;
  effects: Partial<ShipStats>;
  note: string;
};

export type ShipStats = {
  cargoCap: number;
  cannons: number;
  speed: number;
  openWater: number;
  crewCap: number;
  hullMax: number;
  navigation: number;
  negotiation: number;
};

export type Trend = {
  direction: -1 | 1;
  momentum: number;
  label: string;
  expires: number;
};

export type RumorEvent = {
  id: string;
  portId: string;
  goodId: string;
  multiplier: number;
  expires: number;
  kind: "shortage" | "glut";
};

export type PoliticalEvent = {
  id: string;
  factionId: string;
  kind: "tariff" | "convoy" | "strike" | "inspection" | "permit";
  goodId?: string;
  riskModifier: number;
  priceModifier: number;
  expires: number;
  text: string;
};

export type ContractStatus = "available" | "active" | "completed" | "failed";
export type ContractKind = "standard" | "urgent" | "escort" | "smuggling" | "multi_stop";
export type ContractChainId = "charter_audit" | "freeport_lifeline" | "admiralty_convoy";
export type RecoverySource = "storm" | "pirate" | "customs";

export type ContractStop = {
  portId: string;
  goodId: string;
  units: number;
  delivered: number;
  reward: number;
};

export type ContractChain = {
  id: ContractChainId;
  giver: string;
  title: string;
  stage: number;
  stages: number;
  hook: string;
  successText: string;
  failureText: string;
  rareReward?: string;
  rewardCash?: number;
  standingReward?: number;
  failureStandingPenalty?: number;
};

export type Contract = {
  id: string;
  kind?: ContractKind;
  originPortId: string;
  destinationPortId: string;
  factionId: string;
  goodId: string;
  units: number;
  deliveredUnits?: number;
  paidReward?: number;
  deadline: number;
  reward: number;
  penalty: number;
  stops?: ContractStop[];
  routeRiskModifier?: number;
  inspectionRisk?: number;
  smugglingFine?: number;
  recoverySource?: RecoverySource;
  brief?: string;
  chain?: ContractChain;
  status: ContractStatus;
  acceptedDay?: number;
  completedDay?: number;
  failedDay?: number;
};

export type Voyage = {
  fromId: string;
  toId: string;
  days: number;
  risk: number;
  sailPlan?: SailPlanId;
  wear?: number;
  wearLabel?: string;
  seaLabel?: string;
  watchIndex?: number;
  watch?: VoyageWatchReport | null;
  progress: number;
  duration: number;
};

export type VoyageWatchReport = {
  label: string;
  detail: string;
  progress: number;
  roughness: number;
  stormIntensity: number;
  waveEnergy: number;
  effect: "clean" | "strain" | "damage" | "cargo";
};

export type Encounter = {
  kind: "pirate" | "inspection" | "sea";
  name: string;
  strength: number;
  bribe: number;
  bounty: number;
  portName: string;
  seaKind?: "watch" | "storm";
  progress?: number;
  roughness?: number;
  stormIntensity?: number;
  waveEnergy?: number;
  effect?: VoyageWatchReport["effect"];
  hullThreat?: number;
  moraleThreat?: number;
  cargoThreat?: number;
  factionId?: string;
  fine?: number;
  suspectGoodId?: string;
  seizedUnits?: number;
};

export type GameError = {
  id: string;
  day: number;
  message: string;
  source: string;
  time: string;
  stack?: string;
};

export type CargoInsurance = {
  providerFactionId: string;
  originPortId: string;
  destinationPortId: string;
  coveredValue: number;
  remainingCoverage: number;
  premium: number;
  deductibleRate: number;
  expiresDay: number;
};

export type RouteMemoryTone = "gain" | "loss" | "risk" | "progress" | "neutral";

export type RouteMemory = {
  fromId: string;
  toId: string;
  trips: number;
  lastDay: number;
  totalProjectedProfit: number;
  bestProjectedProfit: number;
  worstProjectedProfit: number;
  totalWear: number;
  worstWear: number;
  pirateTrouble: number;
  inspectionTrouble: number;
  heavyWeather: number;
  lastLabel: string;
  lastDetail: string;
  tone: RouteMemoryTone;
};

export type RouteMemoryMap = Record<string, RouteMemory>;

export type RouteHistoryOutcome = "clean" | "heavy-weather" | "pirate" | "inspection";

export type RouteHistoryEntry = {
  day: number;
  fromId: string;
  toId: string;
  sailPlan: SailPlanId;
  projectedProfit: number;
  risk: number;
  wear: number;
  outcome: RouteHistoryOutcome;
  reason: string;
  cargoSummary: string;
  label: string;
  detail: string;
};

export type GameState = {
  version: number;
  day: number;
  cash: number;
  debt: number;
  hull: number;
  currentShip: string;
  ownedShips: string[];
  equipment: string[];
  crew: string[];
  crewXp: Record<string, number>;
  crewTraits: Record<string, CrewTraitId[]>;
  crewProfiles: Record<string, CrewProfile>;
  crewMorale: number;
  captainSkills: CaptainSkills;
  skillPoints: number;
  captainXp: number;
  captainXpTarget: number;
  currentPort: string;
  selectedPort: string;
  sailPlan: SailPlanId;
  tab: TabId;
  cargo: Cargo;
  cargoBasis: Record<string, number>;
  cargoInsurance: CargoInsurance | null;
  market: Market;
  marketStock: MarketStock;
  marketHistory: MarketPriceHistory;
  trends: Record<string, Trend>;
  events: RumorEvent[];
  politicalEvents: PoliticalEvent[];
  contracts: Contract[];
  routeMemory: RouteMemoryMap;
  routeHistory: RouteHistoryEntry[];
  factionStanding: FactionStanding;
  log: Array<{ day: number; text: string }>;
  errors: GameError[];
  voyage: Voyage | null;
  encounter: Encounter | null;
  pendingArrival: string | null;
  gameOver: boolean;
  best: number;
  lastSavedAt: string | null;
};

export type RouteConditions = {
  route: { x: number; y: number; length: number };
  wind: { x: number; y: number; strength?: number };
  current: { x: number; y: number; strength: number };
  surfaceDrift: { x: number; y: number; strength: number };
  windScore: number;
  currentScore: number;
  crosswind: number;
  roughness: number;
  stormIntensity: number;
  waveEnergy: number;
  seaState: {
    beamSea: number;
    cargoSlam: number;
    followingSea: number;
    peakWaveHeight: number;
  };
  speedMultiplier: number;
  threatModifier: number;
  windLabel: string;
  currentLabel: string;
  seaLabel: string;
  seaStateLabel: string;
  stormLabel: string;
  speedDelta: number;
  speedFactors: {
    wind: number;
    current: number;
    sea: number;
    storm: number;
    skill: number;
    plan: number;
    net: number;
    threat: number;
  };
  tacticLabel: string;
  tacticDetail: string;
  planAdvice: string;
  sailPlan: SailPlanId;
  sailPlanLabel: string;
  handlingLabel: string;
};

export type RouteWearEstimate = {
  hullWear: number;
  stress: number;
  label: string;
};

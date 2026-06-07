import { clamp } from "./math";

export type PoliticalActionKind = "permit" | "convoy";

export type StandingTier = {
  id: "sanctioned" | "watched" | "neutral" | "familiar" | "trusted" | "patron";
  label: string;
  threshold: number;
  priceModifier: number;
  contractRewardModifier: number;
  routeRiskModifier: number;
  permitCostModifier: number;
  convoyCostModifier: number;
  tariffModifier: number;
  inspectionModifier: number;
  serviceModifier: number;
  contractUnitModifier: number;
  deadlineFlex: number;
};

export type MarketAccessLevel = "restricted" | "watched" | "open" | "priority" | "inside";

export type MarketAccessInput = {
  hasPermit?: boolean;
  isExport?: boolean;
  isImport?: boolean;
  isTariffed?: boolean;
};

export type MarketAccessQuote = {
  level: MarketAccessLevel;
  label: string;
  allowed: boolean;
  priceModifier: number;
  tariffModifier: number;
  stockModifier: number;
  inspectionModifier: number;
  reason: string;
};

const standingTiers: StandingTier[] = [
  {
    id: "sanctioned",
    label: "Sanctioned",
    threshold: -12,
    priceModifier: 1.08,
    contractRewardModifier: 0.86,
    routeRiskModifier: 0.045,
    permitCostModifier: 1.22,
    convoyCostModifier: 1.18,
    tariffModifier: 1.22,
    inspectionModifier: 0.15,
    serviceModifier: 1.18,
    contractUnitModifier: 0.82,
    deadlineFlex: -1,
  },
  {
    id: "watched",
    label: "Watched",
    threshold: -4,
    priceModifier: 1.035,
    contractRewardModifier: 0.94,
    routeRiskModifier: 0.02,
    permitCostModifier: 1.1,
    convoyCostModifier: 1.08,
    tariffModifier: 1.12,
    inspectionModifier: 0.08,
    serviceModifier: 1.08,
    contractUnitModifier: 0.92,
    deadlineFlex: 0,
  },
  {
    id: "neutral",
    label: "Neutral",
    threshold: 0,
    priceModifier: 1,
    contractRewardModifier: 1,
    routeRiskModifier: 0,
    permitCostModifier: 1,
    convoyCostModifier: 1,
    tariffModifier: 1,
    inspectionModifier: 0,
    serviceModifier: 1,
    contractUnitModifier: 1,
    deadlineFlex: 0,
  },
  {
    id: "familiar",
    label: "Familiar",
    threshold: 4,
    priceModifier: 0.985,
    contractRewardModifier: 1.03,
    routeRiskModifier: -0.012,
    permitCostModifier: 0.94,
    convoyCostModifier: 0.9,
    tariffModifier: 0.96,
    inspectionModifier: -0.04,
    serviceModifier: 0.96,
    contractUnitModifier: 1.06,
    deadlineFlex: 1,
  },
  {
    id: "trusted",
    label: "Trusted",
    threshold: 10,
    priceModifier: 0.965,
    contractRewardModifier: 1.07,
    routeRiskModifier: -0.026,
    permitCostModifier: 0.84,
    convoyCostModifier: 0.76,
    tariffModifier: 0.9,
    inspectionModifier: -0.08,
    serviceModifier: 0.9,
    contractUnitModifier: 1.12,
    deadlineFlex: 1,
  },
  {
    id: "patron",
    label: "Patron",
    threshold: 20,
    priceModifier: 0.94,
    contractRewardModifier: 1.12,
    routeRiskModifier: -0.045,
    permitCostModifier: 0.72,
    convoyCostModifier: 0.62,
    tariffModifier: 0.82,
    inspectionModifier: -0.13,
    serviceModifier: 0.82,
    contractUnitModifier: 1.22,
    deadlineFlex: 2,
  },
];

export function standingTier(standing: number) {
  if (standing <= standingTiers[0].threshold) return standingTiers[0];
  if (standing <= standingTiers[1].threshold) return standingTiers[1];
  return [...standingTiers].reverse().find((tier) => standing >= tier.threshold) ?? standingTiers[2];
}

export function standingBenefits(standing: number) {
  const tier = standingTier(standing);
  const loyaltyLean = clamp(standing, -24, 36) * 0.001;
  return {
    ...tier,
    priceModifier: clamp(tier.priceModifier - loyaltyLean, 0.88, 1.14),
    contractRewardModifier: clamp(tier.contractRewardModifier + loyaltyLean * 0.8, 0.78, 1.18),
    routeRiskModifier: clamp(tier.routeRiskModifier - loyaltyLean * 0.34, -0.06, 0.06),
    tariffModifier: clamp(tier.tariffModifier - loyaltyLean * 1.35, 0.72, 1.28),
    inspectionModifier: clamp(tier.inspectionModifier - loyaltyLean * 1.2, -0.18, 0.2),
    serviceModifier: clamp(tier.serviceModifier - loyaltyLean * 0.9, 0.78, 1.22),
    contractUnitModifier: clamp(tier.contractUnitModifier + loyaltyLean * 0.9, 0.76, 1.3),
  };
}

export function politicalActionCost(baseCost: number, standing: number, kind: PoliticalActionKind) {
  const benefits = standingBenefits(standing);
  const modifier = kind === "permit" ? benefits.permitCostModifier : benefits.convoyCostModifier;
  return Math.max(20, Math.round((baseCost * modifier) / 10) * 10);
}

export function standingSummary(standing: number) {
  const benefits = standingBenefits(standing);
  const priceDelta = Math.round((1 - benefits.priceModifier) * 100);
  const contractDelta = Math.round((benefits.contractRewardModifier - 1) * 100);
  const riskDelta = Math.round(benefits.routeRiskModifier * 100);
  return `${benefits.label} | prices ${signedPercent(priceDelta)} | contracts ${signedPercent(contractDelta)} | routes ${signedRisk(riskDelta)}`;
}

export function factionAccessLevel(standing: number, hasPermit = false): MarketAccessLevel {
  if (hasPermit && standing <= -12) return "watched";
  if (hasPermit && standing < 10) return "open";
  if (standing <= -12) return "restricted";
  if (standing <= -4) return "watched";
  if (standing >= 20) return "inside";
  if (standing >= 10) return "priority";
  return "open";
}

export function marketAccessForStanding(standing: number, input: MarketAccessInput = {}): MarketAccessQuote {
  const hasPermit = Boolean(input.hasPermit);
  const isExport = Boolean(input.isExport);
  const isImport = Boolean(input.isImport);
  const isTariffed = Boolean(input.isTariffed);
  const benefits = standingBenefits(standing);
  const level = factionAccessLevel(standing, hasPermit);
  const restricted = level === "restricted";
  const allowed = !restricted || isExport;
  const permitTariffRelief = hasPermit ? 0.88 : 1;
  const permitInspectionRelief = hasPermit ? -0.1 : 0;
  const tariffModifier = isTariffed ? benefits.tariffModifier * permitTariffRelief : 1;
  const accessSurcharge = restricted && !isExport ? 1.18 : level === "watched" && isImport ? 1.04 : 1;
  const priorityDiscount = level === "priority" && (isExport || isImport) ? 0.98 : level === "inside" ? 0.95 : 1;
  const stockModifier = level === "inside" ? 1.22 : level === "priority" ? 1.12 : level === "watched" ? 0.9 : restricted ? 0.72 : 1;
  const inspectionModifier = benefits.inspectionModifier + (isTariffed ? 0.04 : 0) + permitInspectionRelief;

  return {
    level,
    label: accessLabel(level, hasPermit),
    allowed,
    priceModifier: clamp(tariffModifier * accessSurcharge * priorityDiscount, 0.68, 1.34),
    tariffModifier: clamp(tariffModifier, 0.68, 1.34),
    stockModifier,
    inspectionModifier: clamp(inspectionModifier, -0.22, 0.24),
    reason: accessReason(level, hasPermit, isExport, isTariffed),
  };
}

export function servicePriceModifier(standing: number, hasPermit = false) {
  const permitRelief = hasPermit ? 0.94 : 1;
  return clamp(standingBenefits(standing).serviceModifier * permitRelief, 0.74, 1.24);
}

export function inspectionChanceModifier(standing: number, hasPermit = false) {
  return marketAccessForStanding(standing, { hasPermit }).inspectionModifier;
}

export function contractQualityForStanding(standing: number) {
  const benefits = standingBenefits(standing);
  return {
    label: contractQualityLabel(standing),
    rewardModifier: benefits.contractRewardModifier,
    unitModifier: benefits.contractUnitModifier,
    deadlineFlex: benefits.deadlineFlex,
    rareWorkModifier: standing >= 20 ? 0.2 : standing >= 10 ? 0.12 : standing <= -12 ? -0.16 : standing <= -4 ? -0.08 : 0,
  };
}

export function contractQualityLabel(standing: number) {
  const tier = standingTier(standing);
  if (tier.id === "patron") return "patron board";
  if (tier.id === "trusted") return "priority board";
  if (tier.id === "familiar") return "warm board";
  if (tier.id === "watched") return "thin board";
  if (tier.id === "sanctioned") return "restricted board";
  return "open board";
}

export function authoritySummary(standing: number, hasPermit = false) {
  const benefits = standingBenefits(standing);
  const access = marketAccessForStanding(standing, { hasPermit });
  const tariffDelta = Math.round((access.tariffModifier - 1) * 100);
  const inspectionDelta = Math.round(access.inspectionModifier * 100);
  const serviceDelta = Math.round((1 - servicePriceModifier(standing, hasPermit)) * 100);
  return `${access.label} | tariffs ${signedCost(tariffDelta)} | inspections ${signedRisk(inspectionDelta)} | services ${signedPercent(serviceDelta)}`;
}

function signedPercent(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "-" : "+"}${Math.abs(value)}%`;
}

function signedRisk(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}pt`;
}

function signedCost(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function accessLabel(level: MarketAccessLevel, hasPermit: boolean) {
  if (level === "inside") return "Inside access";
  if (level === "priority") return "Priority access";
  if (level === "open") return hasPermit ? "Permitted access" : "Open access";
  if (level === "watched") return hasPermit ? "Permit watch" : "Watched access";
  return "Restricted access";
}

function accessReason(level: MarketAccessLevel, hasPermit: boolean, isExport: boolean, isTariffed: boolean) {
  if (level === "restricted" && !isExport) return "permit needed";
  if (level === "restricted") return "exports only";
  if (isTariffed && hasPermit) return "tariff relief";
  if (isTariffed) return "tariff watch";
  if (level === "inside") return "inside stock";
  if (level === "priority") return "priority allotment";
  if (hasPermit) return "permit terms";
  return "open trade";
}

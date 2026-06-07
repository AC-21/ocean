import { describe, expect, it, vi } from "vitest";
import {
  createInitialState,
  crewCreditPremium,
  debtInterestRate,
  dockCreditPremium,
  dockFeeFor,
  errorLogLimit,
  gameStateVersion,
  maxDay,
  politicalActionCosts,
  reduceGame,
  repairCostFor,
  repairCostPerHull,
  runRecapFor,
  scoreBreakdownFor,
  scoreNow,
} from "./reducer";
import { gameAssetManifest } from "./assets";
import {
  activeContracts,
  contractCargoStatus,
  contractKindLabel,
  contractPacingLabel,
  contractPlanSummary,
  contractPressureLabel,
  contractRouteSummary,
  contractStops,
  contractUrgency,
  createNextContractChainOffer,
  generateContract,
  generateLateGambleContract,
  isLateGambleContract,
  refreshContracts,
} from "./contracts";
import { customsActionReadFor } from "./customs";
import {
  crewCasualtyProtection,
  crewDismissalCost,
  crewFacilityDrillFor,
  crewFacilityFor,
  crewFacilitySummary,
  crewMoraleTier,
  crewProfileFor,
  crewProfileSummary,
  crewRankFor,
  crewSpecialtyFor,
  crewTraitSummary,
  crewTraitsFor,
  crewWageFor,
  crewWeeklyWage,
  initialCrewMorale,
  shoreLeaveCost,
} from "./crew";
import { crewRouteReadFor } from "./crewIdentity";
import {
  brokerPacketQuoteFor,
  driftMarkets,
  marketAccessForGood,
  marketStockCapacity,
  marketStockLevel,
  normalizeMarketStock,
  portLogisticsPressure,
  priceFor,
  recommendRouteChoices,
  routeWindowForecast,
  routeTradePlanFor,
  sellPriceFor,
  topTradeOpportunities,
  tradeOpportunityForGood,
} from "./economy";
import { crewCatalog, equipmentCatalog, factions, goods, ports, shipCatalog } from "./data";
import { captainSkillMasteryFor, captainSkillProgressLabel, hasCaptainSkillMastery } from "./captainSkills";
import { pirateTacticalReadFor } from "./encounters";
import { factionFavorQuoteFor } from "./factionFavors";
import { cargoInsurableValue, insuranceQuoteFor } from "./insurance";
import { marketHistorySignalFor } from "./marketHistory";
import { captainOrderFor } from "./onboarding";
import {
  backupSaveKey,
  clearSaveBackup,
  clearSavedGame,
  currentSaveVersion,
  hasRecoverableSave,
  importGameSave,
  legacySaveKeys,
  loadGame,
  recoverSavedGame,
  saveGame,
  saveKey,
  serializeGameSave,
} from "./persistence";
import { contractPacingForDay, nextUpgradeTiming, runPhaseForDay } from "./pacing";
import { contractQualityForStanding, politicalActionCost, standingBenefits } from "./politics";
import { initialCaptainXpTarget } from "./progression";
import { defaultOceanField, sampleOceanPoint, sampleRouteOcean, sampleShipMotion } from "./ocean";
import { equipmentFitBonusFor } from "./outfitting";
import { routeMemoryKey, routeMemorySummary } from "./routeMemory";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate, sampleRouteEnvironment, shippingLanePressure, stormFrontsForDay, stormIntensityAt } from "./routing";
import { seaRescueReadFor } from "./seaRescue";
import { previewShip, yardPriceFor, yardResaleValueFor, yardSourceLabel } from "./shipyard";
import { shipHandlingLabel, shipIdentitySummary, shipResaleProfile, shipUpgradePath } from "./ships";
import { deriveShipStats } from "./stats";
import type { Contract, GameState } from "./types";

describe("Harborline systems", () => {
  it("creates a playable initial state", () => {
    const state = createInitialState(100);
    expect(state.currentPort).toBe("grayhaven");
    expect(state.ownedShips).toContain("coastal_sloop");
    expect(state.events.length).toBeGreaterThan(0);
    expect(state.captainXp).toBe(0);
    expect(state.captainXpTarget).toBe(initialCaptainXpTarget);
    expect(state.crewMorale).toBe(initialCrewMorale);
    expect(state.cargoInsurance).toBeNull();
    expect(state.errors).toEqual([]);
    expect(routeDays(state, "grayhaven", "saffron")).toBeGreaterThanOrEqual(2);
    expect(state.marketHistory.grayhaven.tea).toHaveLength(1);
  });

  it("records rolling market quote history as days advance", () => {
    let state = createInitialState();
    const firstQuote = state.marketHistory.grayhaven.tea[0];

    state = reduceGame(state, { type: "waitDay" });
    state = reduceGame(state, { type: "waitDay" });

    const history = state.marketHistory.grayhaven.tea;
    const signal = marketHistorySignalFor(state, "grayhaven", "tea");
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0]).toEqual(firstQuote);
    expect(history[history.length - 1].day).toBe(state.day);
    expect(signal.sampleCount).toBe(history.length);
    expect(signal.detail).toContain("quotes");
  });

  it("keeps route risk bounded after physics and politics", () => {
    const state = createInitialState();
    const risk = routeRisk(state, "stormhook", "orchid");
    expect(risk).toBeGreaterThanOrEqual(0.04);
    expect(risk).toBeLessThanOrEqual(0.72);
  });

  it("lets sail plans trade speed for safety and wear", () => {
    const balanced = createInitialState();
    balanced.currentPort = "grayhaven";
    balanced.selectedPort = "stormhook";

    const hard = reduceGame(balanced, { type: "setSailPlan", plan: "hard" });
    const cautious = reduceGame(balanced, { type: "setSailPlan", plan: "cautious" });
    const quiet = reduceGame(balanced, { type: "setSailPlan", plan: "quiet" });

    expect(routeConditions(hard, "grayhaven", "stormhook").speedMultiplier).toBeGreaterThan(
      routeConditions(balanced, "grayhaven", "stormhook").speedMultiplier
    );
    expect(routeConditions(cautious, "grayhaven", "stormhook").speedMultiplier).toBeLessThan(
      routeConditions(balanced, "grayhaven", "stormhook").speedMultiplier
    );
    expect(routeConditions(quiet, "grayhaven", "stormhook").speedMultiplier).toBeLessThan(
      routeConditions(balanced, "grayhaven", "stormhook").speedMultiplier
    );
    expect(routeRisk(hard, "grayhaven", "stormhook")).toBeGreaterThan(routeRisk(balanced, "grayhaven", "stormhook"));
    expect(routeRisk(cautious, "grayhaven", "stormhook")).toBeLessThan(routeRisk(balanced, "grayhaven", "stormhook"));
    expect(routeRisk(quiet, "grayhaven", "stormhook")).toBeLessThan(routeRisk(balanced, "grayhaven", "stormhook"));
    expect(routeWearEstimate(hard, "grayhaven", "stormhook").stress).toBeGreaterThan(
      routeWearEstimate(balanced, "grayhaven", "stormhook").stress
    );
    expect(routeWearEstimate(cautious, "grayhaven", "stormhook").stress).toBeLessThan(
      routeWearEstimate(balanced, "grayhaven", "stormhook").stress
    );
    expect(["Low customs profile", "Quiet, safer, slow"]).toContain(routeConditions(quiet, "grayhaven", "stormhook").planAdvice);
    const hardConditions = routeConditions(hard, "grayhaven", "stormhook");
    expect(hardConditions.speedFactors.net).toBe(hardConditions.speedDelta);
    expect(hardConditions.speedFactors.plan).toBeGreaterThan(0);
    expect(hardConditions.tacticLabel.length).toBeGreaterThan(0);
    expect(hardConditions.tacticDetail).toContain("water");
    expect(hardConditions.planAdvice.length).toBeGreaterThan(0);

    const underway = reduceGame(hard, { type: "startVoyage" });
    expect(underway.voyage?.sailPlan).toBe("hard");

    const quietUnderway = reduceGame(quiet, { type: "startVoyage" });
    expect(quietUnderway.voyage?.sailPlan).toBe("quiet");
    expect(quietUnderway.log[0].text).toContain("Quiet order");
  });

  it("turns maxed captain skills into named mastery perks with live route effects", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "stormhook";
    const beforePhysics = routePhysicsProfile(state, "grayhaven", "stormhook");
    const beforeRisk = routeRisk(state, "grayhaven", "stormhook");

    expect(captainSkillMasteryFor("navigation").label).toBe("Tradewind Plotter");
    expect(captainSkillProgressLabel(state, "navigation")).toContain("3 levels to Tradewind Plotter");
    state.captainSkills.navigation = 2;
    state.skillPoints = 3;
    state = reduceGame(state, { type: "trainSkill", skillId: "navigation" });

    const afterPhysics = routePhysicsProfile(state, "grayhaven", "stormhook");
    expect(hasCaptainSkillMastery(state, "navigation")).toBe(true);
    expect(captainSkillProgressLabel(state, "navigation")).toBe("Tradewind Plotter active");
    expect(state.log[0].text).toContain("Tradewind Plotter online");
    expect(afterPhysics.delayRisk).toBeLessThanOrEqual(beforePhysics.delayRisk);
    expect(routeRisk(state, "grayhaven", "stormhook")).toBeLessThan(beforeRisk);
  });

  it("previews route physics pressure from the same ocean model used for voyages", () => {
    const loaded = createInitialState();
    loaded.currentPort = "grayhaven";
    loaded.selectedPort = "stormhook";
    loaded.cargo.tea = 10;
    loaded.cargoBasis.tea = 38;

    const hard = reduceGame(loaded, { type: "setSailPlan", plan: "hard" });
    const reefed = reduceGame(loaded, { type: "setSailPlan", plan: "cautious" });
    const emptyHard = reduceGame({ ...loaded, cargo: {}, cargoBasis: {} }, { type: "setSailPlan", plan: "hard" });

    const hardProfile = routePhysicsProfile(hard, "grayhaven", "stormhook");
    const reefedProfile = routePhysicsProfile(reefed, "grayhaven", "stormhook");
    const emptyProfile = routePhysicsProfile(emptyHard, "grayhaven", "stormhook");

    expect(hardProfile.pressure).toBeGreaterThanOrEqual(reefedProfile.pressure);
    expect(hardProfile.cargoRisk).toBeGreaterThanOrEqual(emptyProfile.cargoRisk);
    expect(hardProfile.seaState.cargoSlam).toBeGreaterThanOrEqual(0);
    expect(hardProfile.detail).toContain("delay");
    expect(hardProfile.detail).toContain("cargo");
    expect(hardProfile.detail).toContain("swell");
    expect(routeConditions(hard, "grayhaven", "stormhook").seaStateLabel.length).toBeGreaterThan(0);
  });

  it("makes loaded ships lose speed and take more pressure in cargo-slam water", () => {
    let candidate: { empty: GameState; loaded: GameState; fromId: string; toId: string } | null = null;

    for (let day = 1; day <= 60 && !candidate; day += 1) {
      for (const from of ports) {
        for (const to of ports) {
          if (from.id === to.id) continue;
          const empty = createInitialState();
          empty.day = day;
          empty.currentPort = from.id;
          empty.selectedPort = to.id;
          empty.sailPlan = "hard";
          const emptyConditions = routeConditions(empty, from.id, to.id);
          if (emptyConditions.seaState.cargoSlam < 0.24) continue;

          const loaded = {
            ...empty,
            cargo: { tools: 8 },
            cargoBasis: { tools: 60 },
          };
          candidate = { empty, loaded, fromId: from.id, toId: to.id };
          break;
        }
        if (candidate) break;
      }
    }

    expect(candidate).toBeTruthy();
    const emptyConditions = routeConditions(candidate!.empty, candidate!.fromId, candidate!.toId);
    const loadedConditions = routeConditions(candidate!.loaded, candidate!.fromId, candidate!.toId);
    const emptyProfile = routePhysicsProfile(candidate!.empty, candidate!.fromId, candidate!.toId);
    const loadedProfile = routePhysicsProfile(candidate!.loaded, candidate!.fromId, candidate!.toId);

    expect(loadedConditions.speedMultiplier).toBeLessThanOrEqual(emptyConditions.speedMultiplier);
    expect(loadedProfile.pressure).toBeGreaterThanOrEqual(emptyProfile.pressure);
    expect(loadedProfile.cargoRisk).toBeGreaterThan(emptyProfile.cargoRisk);
  });

  it("keeps freight lane pressure bounded across the map", () => {
    for (let day = 1; day <= 20; day += 1) {
      for (const from of ports) {
        for (const to of ports) {
          if (from.id === to.id) continue;
          const pressure = shippingLanePressure(day, from.id, to.id);
          expect(pressure).toBeGreaterThanOrEqual(0);
          expect(pressure).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("remembers profitable clean route crossings", () => {
    const state = createInitialState();
    seedReadableTradeMarket(state);
    state.currentPort = "grayhaven";
    state.selectedPort = "saffron";
    state.cargo.tools = 3;
    state.cargoBasis.tools = 1;
    state.voyage = {
      fromId: "grayhaven",
      toId: "saffron",
      days: 1,
      risk: 0,
      sailPlan: "balanced",
      wear: 1,
      wearLabel: "light wear",
      progress: 0.99,
      duration: 1,
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      const arrived = reduceGame(state, { type: "tickVoyage", dt: 1 });
      const memory = arrived.routeMemory[routeMemoryKey("grayhaven", "saffron")];
      const summary = routeMemorySummary(memory);

      expect(arrived.currentPort).toBe("saffron");
      expect(memory.trips).toBe(1);
      expect(memory.totalProjectedProfit).toBeGreaterThan(220);
      expect(memory.worstWear).toBe(1);
      expect(summary.tone).toBe("gain");
      expect(["Proven money lane", "Rich lane"]).toContain(summary.label);
      expect(arrived.routeHistory).toHaveLength(1);
      expect(arrived.routeHistory[0]).toMatchObject({
        fromId: "grayhaven",
        toId: "saffron",
        sailPlan: "balanced",
        outcome: "clean",
        cargoSummary: "3 Tools",
      });
      expect(arrived.routeHistory[0].reason).toContain("cargo swing");
      expect(arrived.log.some((entry) => entry.text.includes("Route memory: Grayhaven to Saffron Quay"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("marks lanes with pirate trouble when a crossing is intercepted", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "stormhook";
    state.voyage = {
      fromId: "grayhaven",
      toId: "stormhook",
      days: 1,
      risk: 1,
      sailPlan: "hard",
      wear: 4,
      wearLabel: "spray wear",
      progress: 0.99,
      duration: 1,
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const intercepted = reduceGame(state, { type: "tickVoyage", dt: 1 });
      const memory = intercepted.routeMemory[routeMemoryKey("grayhaven", "stormhook")];
      const summary = routeMemorySummary(memory);

      expect(intercepted.encounter?.kind).toBe("pirate");
      expect(memory.pirateTrouble).toBe(1);
      expect(memory.lastLabel).toBe("Pirates sighted");
      expect(intercepted.routeHistory[0]).toMatchObject({
        fromId: "grayhaven",
        toId: "stormhook",
        sailPlan: "hard",
        outcome: "pirate",
        label: "Pirates sighted",
      });
      expect(summary.label).toBe("Pirate water");
      expect(summary.tone).toBe("risk");
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("normalizes saved route memory while loading", () => {
    const loaded = reduceGame(createInitialState(), {
      type: "load",
      state: {
        routeMemory: {
          [routeMemoryKey("grayhaven", "saffron")]: {
            fromId: "grayhaven",
            toId: "saffron",
            trips: 2,
            lastDay: 12,
            totalProjectedProfit: 480,
            bestProjectedProfit: 330,
            worstProjectedProfit: 150,
            totalWear: 5,
            worstWear: 4,
            pirateTrouble: 0,
            inspectionTrouble: 1,
            heavyWeather: 0,
            lastLabel: "Customs hail",
            lastDetail: "quiet order | +$150 cargo swing | 4 wear | 22% risk",
            tone: "risk",
          },
          "fake->saffron": {
            fromId: "fake",
            toId: "saffron",
            trips: 99,
          },
        } as unknown as GameState["routeMemory"],
      },
    });

    expect(Object.keys(loaded.routeMemory)).toEqual([routeMemoryKey("grayhaven", "saffron")]);
    expect(loaded.routeMemory[routeMemoryKey("grayhaven", "saffron")].inspectionTrouble).toBe(1);
    expect(routeMemorySummary(loaded.routeMemory[routeMemoryKey("grayhaven", "saffron")]).label).toBe("Customs watched");
  });

  it("normalizes saved route history while loading", () => {
    const loaded = reduceGame(createInitialState(), {
      type: "load",
      state: {
        routeHistory: [
          {
            day: 7,
            fromId: "grayhaven",
            toId: "saffron",
            sailPlan: "quiet",
            projectedProfit: 180,
            risk: 0.22,
            wear: 3,
            outcome: "inspection",
            reason: "contract delivery",
            cargoSummary: "2 Tea contract",
            label: "Customs hail",
            detail: "quiet order | +$180 cargo swing | 3 wear | 22% risk",
          },
          {
            day: 999,
            fromId: "fake",
            toId: "saffron",
            sailPlan: "loud",
            outcome: "clean",
          },
        ] as unknown as GameState["routeHistory"],
      },
    });

    expect(loaded.routeHistory).toHaveLength(1);
    expect(loaded.routeHistory[0]).toMatchObject({
      day: 7,
      fromId: "grayhaven",
      toId: "saffron",
      sailPlan: "quiet",
      projectedProfit: 180,
      outcome: "inspection",
      cargoSummary: "2 Tea contract",
    });
  });

  it("keeps moving storm fronts bounded and route-visible", () => {
    for (let day = 1; day <= 60; day += 3) {
      const fronts = stormFrontsForDay(day);
      expect(fronts.length).toBeGreaterThan(0);
      for (const front of fronts) {
        expect(front.x).toBeGreaterThanOrEqual(0);
        expect(front.x).toBeLessThanOrEqual(1);
        expect(front.y).toBeGreaterThanOrEqual(0);
        expect(front.y).toBeLessThanOrEqual(1);
        expect(front.radius).toBeGreaterThan(0);
        expect(front.intensity).toBeGreaterThanOrEqual(0);
        expect(front.intensity).toBeLessThanOrEqual(1);
        expect(stormIntensityAt(front.x, front.y, day)).toBeGreaterThan(0.18);
      }
    }
  });

  it("samples a bounded ocean field for rendering and ship motion", () => {
    for (let day = 1; day <= 60; day += 7) {
      for (const point of [
        [0.18, 0.34],
        [0.53, 0.58],
        [0.78, 0.24],
        [0.42, 0.84],
      ]) {
        const ocean = sampleOceanPoint(point[0], point[1], day, 1.5);
        expect(ocean.roughness).toBeGreaterThanOrEqual(0.06);
        expect(ocean.roughness).toBeLessThanOrEqual(1);
        expect(ocean.stormIntensity).toBeGreaterThanOrEqual(0);
        expect(ocean.stormIntensity).toBeLessThanOrEqual(1);
        expect(ocean.waveEnergy).toBeGreaterThanOrEqual(0);
        expect(ocean.waveEnergy).toBeLessThanOrEqual(1);
        expect(ocean.foam).toBeGreaterThanOrEqual(0);
        expect(ocean.foam).toBeLessThanOrEqual(1);
        expect(Number.isFinite(ocean.wave.height)).toBe(true);
        expect(Number.isFinite(ocean.surfaceDrift.strength)).toBe(true);
      }
    }

    const motion = sampleShipMotion(0.5, 0.5, 12, 2.25, Math.PI / 3);
    expect(Math.abs(motion.roll)).toBeLessThanOrEqual(0.22);
    expect(Math.abs(motion.yaw)).toBeLessThanOrEqual(0.16);
    expect(Number.isFinite(motion.bob)).toBe(true);
    expect(Number.isFinite(motion.yaw)).toBe(true);
    expect(Number.isFinite(motion.wakeAngle)).toBe(true);

    const yawSamples = [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI].map((heading) => sampleShipMotion(0.53, 0.58, 18, 2.4, heading).yaw);
    expect(Math.max(...yawSamples.map((yaw) => Math.abs(yaw)))).toBeGreaterThan(0.01);
  });

  it("exposes a renderer-ready ocean field contract", () => {
    const frame = defaultOceanField.frame({ day: 12, time: 1.25, width: 960, height: 540 });
    expect(frame.width).toBe(960);
    expect(frame.height).toBe(540);
    expect(frame.waveLayers.length).toBeGreaterThan(0);
    expect(frame.stormFronts.length).toBeGreaterThan(0);
    expect(frame.wind.strength).toBeGreaterThan(0);
    expect(defaultOceanField.id).toBe("analytic-tradewinds-v1");

    const point = defaultOceanField.samplePoint({ normX: 0.5, normY: 0.5, day: frame.day, time: frame.time, width: frame.width, height: frame.height });
    const route = defaultOceanField.sampleRoute({ day: frame.day, fromId: "grayhaven", toId: "saffron" });
    const routePoint = defaultOceanField.sampleRoutePoint({ day: frame.day, fromId: "grayhaven", toId: "saffron", progress: 0.5, time: frame.time, width: frame.width, height: frame.height });
    const motion = defaultOceanField.sampleShipMotion({ normX: 0.5, normY: 0.5, day: frame.day, time: frame.time, heading: Math.PI / 4 });

    expect(point.waveEnergy).toBeGreaterThanOrEqual(0);
    expect(point.waveEnergy).toBeLessThanOrEqual(1);
    expect(point.foam).toBeGreaterThanOrEqual(0);
    expect(route.roughness).toBeGreaterThanOrEqual(0.06);
    expect(route.waveEnergy).toBeGreaterThanOrEqual(0);
    expect(route.surfaceDrift.strength).toBeGreaterThanOrEqual(0);
    expect(routePoint.progress).toBe(0.5);
    expect(routePoint.normX).toBeGreaterThan(0);
    expect(routePoint.normY).toBeGreaterThan(0);
    expect(routePoint.waveEnergy).toBeGreaterThanOrEqual(0);
    expect(Math.abs(motion.roll)).toBeLessThanOrEqual(0.22);
    expect(Math.abs(motion.yaw)).toBeLessThanOrEqual(0.16);
    expect(Number.isFinite(motion.wakeAngle)).toBe(true);
  });

  it("shares route ocean samples with gameplay route physics", () => {
    const ocean = sampleRouteOcean(18, "grayhaven", "stormhook");
    const route = sampleRouteEnvironment(18, "grayhaven", "stormhook");

    expect(route.roughness).toBeCloseTo(ocean.roughness);
    expect(route.stormIntensity).toBeCloseTo(ocean.stormIntensity);
    expect(route.currentScore).toBeCloseTo(ocean.currentScore);
    expect(route.waveEnergy).toBeCloseTo(ocean.waveEnergy);
    expect(route.surfaceDrift.strength).toBeCloseTo(ocean.surfaceDrift.strength);
  });

  it("feeds storm fronts into route physics and freight pressure", () => {
    const state = createInitialState();
    let calm = { day: 1, storm: Infinity, pressure: 0 };
    let stormy = { day: 1, storm: -Infinity, pressure: 0 };

    for (let day = 1; day <= 60; day += 1) {
      const environment = sampleRouteEnvironment(day, "grayhaven", "stormhook");
      const pressure = shippingLanePressure(day, "grayhaven", "stormhook");
      if (environment.stormIntensity < calm.storm) calm = { day, storm: environment.stormIntensity, pressure };
      if (environment.stormIntensity > stormy.storm) stormy = { day, storm: environment.stormIntensity, pressure };
    }

    const calmState = { ...state, day: calm.day };
    const stormyState = { ...state, day: stormy.day };
    const calmConditions = routeConditions(calmState, "grayhaven", "stormhook");
    const stormyConditions = routeConditions(stormyState, "grayhaven", "stormhook");

    expect(stormy.storm).toBeGreaterThan(calm.storm + 0.18);
    expect(stormy.pressure).toBeGreaterThan(calm.pressure);
    expect(stormyConditions.stormIntensity).toBeGreaterThan(calmConditions.stormIntensity);
    expect(routeWearEstimate(stormyState, "grayhaven", "stormhook").stress).toBeGreaterThan(
      routeWearEstimate(calmState, "grayhaven", "stormhook").stress
    );
  });

  it("feeds freight weather into import and export prices", () => {
    const baseline = createNeutralPriceState();
    const portId = "stormhook";
    let low = { day: 1, pressure: Infinity };
    let high = { day: 1, pressure: -Infinity };

    for (let day = 1; day <= 60; day += 1) {
      const state = { ...baseline, day };
      const pressure = portLogisticsPressure(state, portId).pressure;
      if (pressure < low.pressure) low = { day, pressure };
      if (pressure > high.pressure) high = { day, pressure };
    }

    const easy = createNeutralPriceState(low.day);
    const strained = createNeutralPriceState(high.day);

    expect(high.pressure).toBeGreaterThan(low.pressure);
    expect(priceFor(strained, portId, "tea")).toBeGreaterThan(priceFor(easy, portId, "tea"));
    expect(priceFor(strained, portId, "iron")).toBeLessThan(priceFor(easy, portId, "iron"));
  });

  it("estimates route wear from sea state and seamanship", () => {
    const rough = createInitialState();
    rough.currentPort = "grayhaven";
    rough.selectedPort = "stormhook";
    rough.hull = 40;
    rough.cargo.iron = 7;

    const expert = {
      ...rough,
      captainSkills: { ...rough.captainSkills, seamanship: 3 },
    };

    const baseWear = routeWearEstimate(rough, "grayhaven", "stormhook");
    const expertWear = routeWearEstimate(expert, "grayhaven", "stormhook");

    expect(baseWear.hullWear).toBeGreaterThan(0);
    expect(expertWear.hullWear).toBeLessThan(baseWear.hullWear);
  });

  it("lets purchases change cargo and score-relevant state", () => {
    let state = createInitialState();
    state.marketStock.grayhaven.iron = 2;
    const price = priceFor(state, state.currentPort, "iron");
    const baseBefore = state.market.grayhaven.iron;
    state = reduceGame(state, { type: "buyGood", goodId: "iron" });
    expect(state.cash).toBe(850 - price);
    expect(state.cargo.iron).toBe(1);
    expect(state.marketStock.grayhaven.iron).toBe(1);
    expect(state.market.grayhaven.iron).toBeGreaterThan(baseBefore);
  });

  it("loads the maximum affordable cargo for a selected good", () => {
    let state = createInitialState();
    const stats = deriveShipStats(state);
    state.cash = 5000;
    state.marketStock.grayhaven.tea = 20;
    const startingStock = marketStockLevel(state, "grayhaven", "tea").stock;
    const expectedUnits = Math.min(stats.cargoCap, startingStock);

    state = reduceGame(state, { type: "buyMaxGood", goodId: "tea" });

    expect(state.cargo.tea).toBe(expectedUnits);
    expect(cargoUnits(state)).toBe(expectedUnits);
    expect(state.marketStock.grayhaven.tea).toBe(startingStock - expectedUnits);
    expect(state.cash).toBeLessThan(5000);
    expect(state.log.some((entry) => entry.text.includes(`Loaded ${expectedUnits} Tea`))).toBe(true);
  });

  it("blocks buying when a local good is out of stock", () => {
    let state = createInitialState();
    state.cash = 5000;
    state.marketStock.grayhaven.iron = 0;
    state = reduceGame(state, { type: "buyGood", goodId: "iron" });
    expect(state.cargo.iron ?? 0).toBe(0);
    expect(state.cash).toBe(5000);
  });

  it("lets sales deepen local supply and soften the next price", () => {
    let state = createInitialState();
    state.cargo.iron = 1;
    state.marketStock.grayhaven.iron = 1;
    const stockBefore = state.marketStock.grayhaven.iron;
    const priceBefore = priceFor(state, "grayhaven", "iron");
    state = reduceGame(state, { type: "sellGood", goodId: "iron" });
    expect(state.cargo.iron ?? 0).toBe(0);
    expect(state.marketStock.grayhaven.iron).toBe(stockBefore + 1);
    expect(priceFor(state, "grayhaven", "iron")).toBeLessThan(priceBefore);
  });

  it("sells all held units of a good as one market action", () => {
    let state = createInitialState();
    state.cash = 100;
    state.cargo.tea = 3;
    state.cargoBasis.tea = 1;
    state.marketStock.grayhaven.tea = 2;
    const stockBefore = state.marketStock.grayhaven.tea;

    state = reduceGame(state, { type: "sellAllGood", goodId: "tea" });

    expect(state.cargo.tea ?? 0).toBe(0);
    expect(state.cargoBasis.tea).toBeUndefined();
    expect(state.marketStock.grayhaven.tea).toBe(stockBefore + 3);
    expect(state.cash).toBeGreaterThan(100);
    expect(state.captainXp).toBeGreaterThan(0);
    expect(state.log.some((entry) => entry.text.includes("Sold 3 Tea"))).toBe(true);
  });

  it("uses a bid-ask spread so same-port round trips cannot print cash", () => {
    let state = createInitialState();
    state.cash = 5000;
    state.marketStock.grayhaven.tea = 5;
    const cashBefore = state.cash;
    const ask = priceFor(state, "grayhaven", "tea");

    state = reduceGame(state, { type: "buyGood", goodId: "tea" });
    const bidAfterBuy = sellPriceFor(state, "grayhaven", "tea");
    state = reduceGame(state, { type: "sellGood", goodId: "tea" });

    expect(bidAfterBuy).toBeLessThan(ask);
    expect(state.cash).toBeLessThan(cashBefore);
    expect(state.cargo.tea ?? 0).toBe(0);
  });

  it("guides the first trade through cargo, plotting, and sailing decisions", () => {
    let state = createInitialState();
    state.cash = 5000;
    seedReadableTradeMarket(state);

    let order = captainOrderFor(state);
    expect(order.id).toBe("load-cargo");
    expect(order.target?.kind).toBe("buyMaxGood");
    if (order.target?.kind === "buyMaxGood") state = reduceGame(state, { type: "buyMaxGood", goodId: order.target.goodId });

    order = captainOrderFor(state);
    expect(order.id).toBe("plot-cargo");
    expect(order.target?.kind).toBe("plotRoute");
    if (order.target?.kind === "plotRoute") {
      state = reduceGame(state, { type: "setSailPlan", plan: order.target.sailPlan });
      state = reduceGame(state, { type: "selectPort", portId: order.target.portId });
    }

    order = captainOrderFor(state);
    expect(["insure", "sail"]).toContain(order.id);
    if (order.target?.kind === "buyInsurance") {
      state = reduceGame(state, { type: "buyInsurance" });
      order = captainOrderFor(state);
    }
    expect(order.id).toBe("sail");
    expect(order.target?.kind).toBe("startVoyage");
  });

  it("does not trap route flow on unaffordable cargo insurance", () => {
    const state = createInitialState();
    state.cash = 0;
    state.cargo.tea = 6;
    state.cargoBasis.tea = 30;
    state.selectedPort = "saffron";

    const order = captainOrderFor(state);

    expect(order.id).toBe("sail");
    expect(order.target?.kind).toBe("startVoyage");
  });

  it("surfaces borrowing when cash is the only thing blocking an active job", () => {
    let state = createInitialState();
    state.cash = 0;
    state.debt = 500;
    state.contracts = [
      {
        id: "cash-blocked-job",
        kind: "standard",
        originPortId: state.currentPort,
        destinationPortId: "saffron",
        factionId: "freeports",
        goodId: "tea",
        units: 1,
        deadline: state.day + 8,
        reward: 180,
        penalty: 60,
        status: "active",
        acceptedDay: state.day,
      },
    ];

    const order = captainOrderFor(state);

    expect(order.id).toBe("borrow-contract");
    expect(order.target?.kind).toBe("borrow");
    state = reduceGame(state, { type: "borrow" });
    expect(state.cash).toBe(400);
  });

  it("surfaces repair, crew, and contract onboarding when those decisions matter", () => {
    let state = createInitialState();
    state.cash = 2000;
    state.hull = 40;
    let order = captainOrderFor(state);
    expect(order.id).toBe("repair");
    expect(order.target?.kind).toBe("repair");
    state = reduceGame(state, { type: "repair" });
    expect(state.hull).toBeGreaterThan(40);

    state.hull = deriveShipStats(state).hullMax;
    state.day = 4;
    expect(captainOrderFor(state).id).toBe("hire-crew");

    state.crew = ["boatswain"];
    state.cash = 200;
    state.contracts.unshift({
      id: "local-offer",
      kind: "standard",
      originPortId: state.currentPort,
      destinationPortId: "saffron",
      factionId: "charter",
      goodId: "tea",
      units: 1,
      deadline: state.day + 7,
      reward: 120,
      penalty: 40,
      status: "available",
    });
    expect(captainOrderFor(state).id).toBe("contract");
  });

  it("turns fresh dockside shortage tips into a plotted supply run", () => {
    const state = createInitialState();
    seedReadableTradeMarket(state);
    state.day = 6;
    state.cash = 900;
    state.crew = ["boatswain"];
    state.currentPort = "saffron";
    state.selectedPort = "saffron";
    state.contracts = [];
    state.market.stormhook.iron = state.market.grayhaven.iron + 80;
    state.events = [
      {
        id: "iron-shortage",
        portId: "saffron",
        goodId: "iron",
        multiplier: 1.55,
        expires: 12,
        kind: "shortage",
      },
    ];
    state.log.unshift({ day: state.day, text: "Reward: dockside tip - Iron shortage until day 12." });

    const order = captainOrderFor(state);

    expect(order.id).toBe("rumor-source");
    expect(order.title).toBe("Feed the Iron shortage");
    expect(order.target).toEqual({ kind: "plotRoute", portId: "grayhaven", sailPlan: "cautious" });
  });

  it("prices ordinary hull repair from the repair balance constant", () => {
    const state = createInitialState();
    state.hull = deriveShipStats(state).hullMax - 15;

    expect(repairCostFor(state)).toBe(15 * repairCostPerHull);
  });

  it("turns post-profit cash into a direct refit order", () => {
    let state = createInitialState();
    state.day = 8;
    state.cash = 1800;
    state.crew = ["boatswain"];
    state.log.unshift({ day: state.day, text: "Sold Tea for $300; profit $120." });

    const order = captainOrderFor(state);

    expect(order.id).toBe("buy-refit");
    expect(order.target?.kind).toBe("buyEquipment");
    if (order.target?.kind === "buyEquipment") {
      state = reduceGame(state, { type: "buyEquipment", equipmentId: order.target.equipmentId });
      expect(state.equipment).toContain(order.target.equipmentId);
    }
  });

  it("surfaces the next hull as a direct midgame build order", () => {
    let state = createInitialState();
    state.day = 24;
    state.cash = 3600;
    state.crew = ["boatswain"];

    const order = captainOrderFor(state);

    expect(order.id).toBe("buy-ship");
    expect(order.target).toEqual({ kind: "buyShip", shipId: "ledger_brig" });
    if (order.target?.kind === "buyShip") {
      state = reduceGame(state, { type: "buyShip", shipId: order.target.shipId });
      expect(state.currentShip).toBe("ledger_brig");
      expect(state.ownedShips).toContain("ledger_brig");
    }
  });

  it("tracks cargo basis and turns profitable sales into captain XP", () => {
    let state = createNeutralPriceState();
    state.cash = 5000;
    state.skillPoints = 0;
    state.captainXp = 0;
    state.captainXpTarget = 20;
    state.market.grayhaven.tea = 20;
    state.marketStock.grayhaven.tea = 4;

    const basis = priceFor(state, "grayhaven", "tea");
    state = reduceGame(state, { type: "buyGood", goodId: "tea" });

    expect(state.cargo.tea).toBe(1);
    expect(state.cargoBasis.tea).toBe(basis);

    state.currentPort = "stormhook";
    state.selectedPort = "stormhook";
    state.market.stormhook.tea = 120;
    state.marketStock.stormhook.tea = 2;
    expect(sellPriceFor(state, "stormhook", "tea")).toBeGreaterThan(state.cargoBasis.tea);

    state = reduceGame(state, { type: "sellGood", goodId: "tea" });

    expect(state.cargo.tea ?? 0).toBe(0);
    expect(state.cargoBasis.tea).toBeUndefined();
    expect(state.skillPoints).toBe(1);
    expect(state.captainXp).toBeGreaterThanOrEqual(0);
    expect(state.log.some((entry) => entry.text.includes("Captain advanced"))).toBe(true);
  });

  it("replenishes thin market stock toward local targets as days drift", () => {
    const state = createInitialState();
    state.marketStock.grayhaven.iron = 0;
    const drifted = driftMarkets(state);
    expect(drifted.marketStock.grayhaven.iron).toBeGreaterThan(0);
    expect(marketStockLevel(drifted, "grayhaven", "iron").label).not.toBe("empty");
  });

  it("waits in port by charging dockage and advancing daily market drift", () => {
    let state = createInitialState();
    state.cash = 1000;
    state.marketStock.grayhaven.iron = 0;
    const dockFee = dockFeeFor(state);

    state = reduceGame(state, { type: "waitDay" });

    expect(state.day).toBe(2);
    expect(state.cash).toBe(1000 - dockFee);
    expect(state.marketStock.grayhaven.iron).toBeGreaterThan(0);
    expect(state.log.some((entry) => entry.text.includes("Waited for tide"))).toBe(true);
  });

  it("finances dockage shortfalls when waiting", () => {
    let state = createInitialState();
    state.cash = 3;
    const shortfall = dockFeeFor(state) - state.cash;

    state = reduceGame(state, { type: "waitDay" });

    expect(state.day).toBe(2);
    expect(state.cash).toBe(0);
    expect(state.debt).toBe(500 + Math.ceil(shortfall * dockCreditPremium));
  });

  it("posts debt interest on ten-day ledger marks", () => {
    let state = createInitialState();
    state.day = 9;
    state.cash = 1000;
    state.debt = 500;
    const dockFee = dockFeeFor(state);

    state = reduceGame(state, { type: "waitDay" });

    expect(state.day).toBe(10);
    expect(state.cash).toBe(1000 - dockFee);
    expect(state.debt).toBe(500 + Math.ceil(500 * debtInterestRate));
    expect(state.log.some((entry) => entry.text.includes("Interest posted"))).toBe(true);
  });

  it("does not wait while already under sail", () => {
    let state = createInitialState();
    state.voyage = {
      fromId: "grayhaven",
      toId: "stormhook",
      days: 3,
      risk: 0,
      progress: 0.3,
      duration: 1,
    };

    const before = state;
    state = reduceGame(state, { type: "waitDay" });

    expect(state).toBe(before);
  });

  it("stores route wear on voyages and applies it on arrival", () => {
    let state = createInitialState();
    state.selectedPort = "stormhook";
    const expected = routeWearEstimate(state, "grayhaven", "stormhook");

    state = reduceGame(state, { type: "startVoyage" });
    expect(state.voyage?.wear).toBe(expected.hullWear);
    expect(state.voyage?.wearLabel).toBe(expected.label);
    expect(state.voyage?.watchIndex).toBe(0);

    const hullBefore = state.hull;
    state.voyage = {
      ...state.voyage!,
      risk: 0,
      wear: 9,
      wearLabel: "heavy wear",
      progress: 0.99,
      duration: 1,
    };

    state = reduceGame(state, { type: "tickVoyage", dt: 1 });

    expect(state.currentPort).toBe("stormhook");
    expect(state.hull).toBe(hullBefore - 9);
    expect(state.captainXp).toBeGreaterThan(0);
    expect(state.log.some((entry) => entry.text.includes("cost 9 hull"))).toBe(true);
    expect(state.contracts.some((contract) => contract.recoverySource === "storm" && contract.originPortId === "stormhook")).toBe(true);
  });

  it("samples sea watches during active voyages before arrival", () => {
    let state = createInitialState();
    state.selectedPort = "stormhook";
    state = reduceGame(state, { type: "startVoyage" });

    state = reduceGame(state, { type: "tickVoyage", dt: state.voyage!.duration * 0.36 });

    expect(state.currentPort).toBe("grayhaven");
    expect(state.voyage?.watchIndex).toBe(1);
    expect(state.voyage?.watch?.progress).toBeCloseTo(0.34);
    expect(state.voyage?.watch?.roughness).toBeGreaterThanOrEqual(0.06);
    expect(state.voyage?.watch?.waveEnergy).toBeGreaterThanOrEqual(0);
  });

  it("opens hard ocean watches as decisions before applying damage", () => {
    let hardWatch: GameState | null = null;

    for (let day = 1; day <= 60 && !hardWatch; day += 1) {
      for (const from of ports) {
        for (const to of ports) {
          if (from.id === to.id) continue;
          let state = createInitialState();
          state.day = day;
          state.currentPort = from.id;
          state.selectedPort = to.id;
          state.cargo.silk = 10;
          state.cargoBasis.silk = 90;
          state = reduceGame(state, { type: "startVoyage" });
          const hullBefore = state.hull;
          state = reduceGame(state, { type: "tickVoyage", dt: state.voyage!.duration * 0.7 });
          if (state.encounter?.kind === "sea" && state.voyage?.watch && state.hull === hullBefore) {
            hardWatch = state;
            break;
          }
        }
      }
    }

    expect(hardWatch).toBeTruthy();
    expect(["strain", "damage", "cargo"]).toContain(hardWatch!.voyage?.watch?.effect);
    expect(hardWatch!.currentPort).toBe(hardWatch!.voyage?.fromId);
    expect(hardWatch!.log.some((entry) => entry.text.includes("Watch") || entry.text.includes("Water") || entry.text.includes("Storm"))).toBe(true);

    const beforeResolveHull = hardWatch!.hull;
    const resolved = reduceGame(hardWatch!, { type: "resolveSeaSafe" });
    expect(resolved.encounter).toBeNull();
    expect(resolved.voyage).toBeTruthy();
    expect(resolved.hull).toBeLessThanOrEqual(beforeResolveHull);
    expect(resolved.log.some((entry) => entry.text.includes("Reefed") || entry.text.includes("Heaved"))).toBe(true);
  });

  it("applies route physics to arrival delays, cargo, and crew strain", () => {
    let candidate: GameState | null = null;
    let candidateProfile: ReturnType<typeof routePhysicsProfile> | null = null;

    for (let day = 1; day <= 60 && !candidate; day += 1) {
      for (const from of ports) {
        for (const to of ports) {
          if (from.id === to.id) continue;
          const state = createInitialState();
          state.day = day;
          state.currentPort = from.id;
          state.selectedPort = to.id;
          state.sailPlan = "hard";
          state.cargo.tea = 10;
          state.cargoBasis.tea = 38;
          state.crew = ["boatswain"];
          state.crewXp = { boatswain: 0 };
          state.crewMorale = 80;
          const profile = routePhysicsProfile(state, from.id, to.id);
          if (profile.delayRisk > 0.02 && profile.cargoRisk > 0.02 && profile.crewStrain > 0) {
            candidate = state;
            candidateProfile = profile;
            break;
          }
        }
      }
    }

    expect(candidate).toBeTruthy();
    expect(candidateProfile).toBeTruthy();
    const voyageDays = routeDays(candidate!, candidate!.currentPort, candidate!.selectedPort);
    const beforeCargo = cargoUnits(candidate!);
    const beforeMorale = candidate!.crewMorale;
    const destination = candidate!.selectedPort;
    candidate!.voyage = {
      fromId: candidate!.currentPort,
      toId: destination,
      days: voyageDays,
      risk: 0,
      sailPlan: "hard",
      progress: 0.99,
      duration: 1,
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const arrived = reduceGame(candidate!, { type: "tickVoyage", dt: 1 });
      expect(arrived.currentPort).toBe(destination);
      expect(arrived.day).toBe(candidate!.day + voyageDays + 1);
      expect(cargoUnits(arrived)).toBeLessThan(beforeCargo);
      expect(arrived.crewMorale).toBeLessThan(beforeMorale);
      expect(arrived.log.some((entry) => entry.text.includes("breaking seas worked into the freight"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("resolves storm encounters with distinct safe, skill, and bold choices", () => {
    const base = createInitialState();
    base.crew = ["navigator"];
    base.crewXp = { navigator: 80 };
    base.crewMorale = 80;
    base.voyage = {
      fromId: "grayhaven",
      toId: "stormhook",
      days: 3,
      risk: 0,
      progress: 0.5,
      duration: 1,
    };
    base.encounter = {
      kind: "sea",
      seaKind: "storm",
      name: "Storm Front",
      strength: 68,
      bribe: 0,
      bounty: 0,
      portName: "Stormhook",
      roughness: 0.5,
      stormIntensity: 0.7,
      waveEnergy: 0.6,
      effect: "damage",
      hullThreat: 8,
      moraleThreat: 7,
      cargoThreat: 1,
    };

    const safe = reduceGame(base, { type: "resolveSeaSafe" });
    expect(safe.encounter).toBeNull();
    expect(safe.voyage?.days).toBe(4);
    expect(safe.log.some((entry) => entry.text.includes("Storm delay"))).toBe(true);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const skill = reduceGame(base, { type: "resolveSeaSkill" });
      expect(skill.encounter).toBeNull();
      expect(skill.hull).toBeGreaterThanOrEqual(safe.hull);
      expect(skill.log.some((entry) => entry.text.includes("Clean storm handling"))).toBe(true);

      const bold = reduceGame(base, { type: "resolveSeaBold" });
      expect(bold.encounter).toBeNull();
      expect(bold.voyage?.progress).toBeGreaterThan(base.voyage.progress);
      expect(bold.log.some((entry) => entry.text.includes("stole distance"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("turns hard-water rescue signals into destination goodwill and recovery work", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      let state = createInitialState();
      state.crew = ["navigator"];
      state.crewXp = { navigator: 40 };
      state.crewMorale = 52;
      state.cargo.silk = 3;
      state.cargoBasis.silk = 90;
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 3,
        risk: 0,
        progress: 0.5,
        duration: 1,
      };
      state.encounter = {
        kind: "sea",
        seaKind: "storm",
        name: "Storm Front",
        strength: 76,
        bribe: 0,
        bounty: 0,
        portName: "Stormhook",
        roughness: 0.65,
        stormIntensity: 0.76,
        waveEnergy: 0.72,
        effect: "cargo",
        hullThreat: 9,
        moraleThreat: 8,
        cargoThreat: 1,
      };
      const read = seaRescueReadFor(state)!;
      const hullBefore = state.hull;
      const moraleBefore = state.crewMorale;
      const cargoBefore = cargoUnits(state);

      state = reduceGame(state, { type: "aidSeaSignal" });

      expect(read.portIdentityLabel).toBe("Hard-Water Arsenal");
      expect(state.encounter).toBeNull();
      expect(state.voyage?.days).toBe(3 + read.delayDays);
      expect(state.hull).toBe(hullBefore - read.hullCost);
      expect(state.crewMorale).toBe(moraleBefore - read.moraleCost);
      expect(cargoUnits(state)).toBeLessThan(cargoBefore);
      expect(state.factionStanding.admiralty).toBeCloseTo(read.standingGain);
      expect(state.contracts.some((contract) => contract.recoverySource === "storm" && contract.originPortId === "stormhook")).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Aid signal: Hard-Water Arsenal"))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Stormhook marked the aid"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets Drogue Sea Anchor and Watch Bunks reduce sea encounter damage and strain", () => {
    const makeStorm = () => {
      const state = createInitialState();
      state.crew = ["navigator"];
      state.crewXp = { navigator: 80 };
      state.crewMorale = 80;
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 3,
        risk: 0,
        progress: 0.5,
        duration: 1,
      };
      state.encounter = {
        kind: "sea" as const,
        seaKind: "storm" as const,
        name: "Storm Front",
        strength: 80,
        bribe: 0,
        bounty: 0,
        portName: "Stormhook",
        roughness: 0.62,
        stormIntensity: 0.75,
        waveEnergy: 0.7,
        effect: "damage" as const,
        hullThreat: 10,
        moraleThreat: 10,
        cargoThreat: 1,
      };
      return state;
    };

    const plain = reduceGame(makeStorm(), { type: "resolveSeaSafe" });
    const gearedState = makeStorm();
    gearedState.equipment = ["drogue_anchor", "watch_bunks"];
    const geared = reduceGame(gearedState, { type: "resolveSeaSafe" });

    expect(geared.hull).toBeGreaterThan(plain.hull);
    expect(geared.crewMorale).toBeGreaterThan(plain.crewMorale);
  });

  it("lets Seamanship mastery soften active sea reads", () => {
    const makeStorm = (mastered = false) => {
      const state = createInitialState();
      state.currentPort = "grayhaven";
      state.selectedPort = "stormhook";
      state.crew = ["navigator"];
      state.crewXp = { navigator: 0 };
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 3,
        risk: 0.2,
        progress: 0.5,
        duration: 1,
      };
      state.encounter = {
        kind: "sea",
        name: "Breaking Watch",
        strength: 80,
        bribe: 0,
        bounty: 0,
        portName: "Stormhook",
        seaKind: "storm",
        hullThreat: 18,
        moraleThreat: 12,
      };
      if (mastered) state.captainSkills.seamanship = 3;
      return state;
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const plain = reduceGame(makeStorm(), { type: "resolveSeaSkill" });
    const mastered = reduceGame(makeStorm(true), { type: "resolveSeaSkill" });
    randomSpy.mockRestore();

    expect(mastered.hull).toBeGreaterThan(plain.hull);
    expect(mastered.crewMorale).toBeGreaterThan(plain.crewMorale);
    expect(mastered.log.some((entry) => entry.text.includes("Storm Hand"))).toBe(true);
  });

  it("trains captain skills that feed into derived stats and prices", () => {
    let state = createInitialState();
    state.market[state.currentPort].iron = 220;
    const priceBefore = priceFor(state, state.currentPort, "iron");
    expect(state.skillPoints).toBe(1);

    state = reduceGame(state, { type: "trainSkill", skillId: "brokerage" });

    expect(state.skillPoints).toBe(0);
    expect(state.captainSkills.brokerage).toBe(1);
    expect(deriveShipStats(state).negotiation).toBe(1);
    expect(priceFor(state, state.currentPort, "iron")).toBeLessThan(priceBefore);
  });

  it("migrates older loaded runs with missing modern systems", () => {
    const legacy = createInitialState() as Partial<GameState>;
    delete legacy.captainSkills;
    delete legacy.skillPoints;
    delete legacy.captainXp;
    delete legacy.captainXpTarget;
    delete legacy.crewXp;
    delete legacy.crewMorale;
    delete legacy.cargoBasis;
    delete legacy.cargoInsurance;
    delete legacy.contracts;
    delete legacy.politicalEvents;
    legacy.best = 10;

    const state = reduceGame(createInitialState(800), { type: "load", state: legacy as GameState });

    expect(state.best).toBe(800);
    expect(state.captainSkills.brokerage).toBe(0);
    expect(state.skillPoints).toBe(0);
    expect(state.captainXp).toBe(0);
    expect(state.captainXpTarget).toBe(initialCaptainXpTarget);
    expect(state.crewXp).toEqual({});
    expect(state.crewMorale).toBe(initialCrewMorale);
    expect(state.cargoBasis).toEqual({});
    expect(state.cargoInsurance).toBeNull();
    expect(state.contracts.length).toBeGreaterThan(0);
    expect(state.politicalEvents).toEqual([]);
  });

  it("keeps runtime errors bounded, sanitized, and clearable", () => {
    let state = createInitialState();

    for (let index = 0; index < errorLogLimit + 3; index += 1) {
      state = reduceGame(state, {
        type: "recordError",
        error: {
          message: `  Render failed ${index}\nwith whitespace  `,
          source: "  app/runtime  ",
          stack: `Stack ${index} ${"x".repeat(500)}`,
        },
      });
    }

    expect(state.errors).toHaveLength(errorLogLimit);
    expect(state.errors[0].message).toBe(`Render failed ${errorLogLimit + 2} with whitespace`);
    expect(state.errors[0].source).toBe("app/runtime");
    expect(state.errors[0].stack?.length).toBeLessThanOrEqual(360);
    expect(state.errors.some((error) => error.message.includes("Render failed 0"))).toBe(false);

    state = reduceGame(state, { type: "clearErrors" });
    expect(state.errors).toEqual([]);
  });

  it("captures reducer exceptions with action context", () => {
    const brokenState = { ...createInitialState(), market: null } as unknown as GameState;

    const state = reduceGame(brokenState, { type: "buyGood", goodId: "tea" });

    expect(state.errors[0].source).toBe("reducer:buyGood");
    expect(state.errors[0].message).toContain("Action buyGood failed");
    expect(state.errors[0].stack).toBeTruthy();
  });

  it("keeps a named asset manifest for runtime preload checks", () => {
    const ids = gameAssetManifest.map((asset) => asset.id);

    expect(ids).toContain("background.ocean");
    expect(ids).toContain("ship.fallback");
    for (const ship of shipCatalog) expect(ids).toContain(`ship.${ship.id}`);
    for (const port of ports) expect(ids).toContain(`port.${port.id}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(gameAssetManifest.every((asset) => asset.url && !asset.url.includes("undefined"))).toBe(true);
  });

  it("protects money, cargo, hull, crew, and standing invariants after actions", () => {
    const corrupted = createInitialState() as unknown as GameState;
    corrupted.cash = -25;
    corrupted.debt = Number.NaN;
    corrupted.hull = 9999;
    corrupted.ownedShips = ["coastal_sloop", "fake_ship", "coastal_sloop"];
    corrupted.currentShip = "coastal_sloop";
    corrupted.equipment = ["cargo_hoist", "cargo_hoist", "crew_quarters", "unknown"];
    corrupted.crew = ["navigator", "navigator", "quartermaster", "boatswain", "ghost"];
    corrupted.crewXp = { navigator: 42, ghost: 999, boatswain: -10 };
    corrupted.crewMorale = 140;
    corrupted.captainSkills = { navigation: 9, seamanship: -4, brokerage: 2, gunnery: Number.NaN };
    corrupted.skillPoints = Number.NaN;
    corrupted.cargo = { tea: 99, iron: -5, tools: 20, fake: 4 };
    corrupted.cargoBasis = { tea: 44, iron: 40, tools: -1, fake: 3 };
    corrupted.factionStanding = { charter: 500, freeports: -500, fake: 12 } as unknown as GameState["factionStanding"];

    const state = reduceGame(corrupted, { type: "borrow" });

    expectCoreInvariants(state);
    expect(state.cash).toBeGreaterThanOrEqual(0);
    expect(state.debt).toBe(520);
    expect(state.crew).toEqual(["navigator", "quartermaster", "boatswain"]);
    expect(state.crewXp).toEqual({ navigator: 42, quartermaster: 0, boatswain: 0 });
    expect(state.factionStanding.charter).toBe(100);
    expect(state.factionStanding.freeports).toBe(-100);
  });

  it("protects contract, permit, insurance, and voyage invariants after actions", () => {
    const corrupted = createInitialState() as unknown as GameState;
    corrupted.day = 12;
    corrupted.currentPort = "grayhaven";
    corrupted.selectedPort = "saffron";
    corrupted.cargo = { tea: 2 };
    corrupted.cargoBasis = { tea: 31 };
    corrupted.cargoInsurance = {
      providerFactionId: "charter",
      originPortId: "grayhaven",
      destinationPortId: "grayhaven",
      coveredValue: 100,
      remainingCoverage: 500,
      premium: 20,
      deductibleRate: 2,
      expiresDay: 30,
    };
    corrupted.contracts = [
      {
        id: "expired-active",
        originPortId: "grayhaven",
        destinationPortId: "saffron",
        factionId: "charter",
        goodId: "tea",
        units: 1,
        deadline: 5,
        reward: 100,
        penalty: 20,
        status: "active",
      },
      { id: "bad", originPortId: "grayhaven", destinationPortId: "grayhaven", factionId: "nope", goodId: "fake", units: -2, deadline: -1, reward: -1, penalty: -1, status: "available" },
    ] as unknown as GameState["contracts"];
    corrupted.politicalEvents = [
      {
        id: "expired-permit",
        factionId: "charter",
        kind: "permit",
        riskModifier: 0,
        priceModifier: 0.9,
        expires: 4,
        text: "Expired permit",
      },
      {
        id: "valid-permit",
        factionId: "league",
        kind: "permit",
        riskModifier: 0,
        priceModifier: 0.9,
        expires: 15,
        text: "Valid permit",
      },
      { id: "bad-permit", factionId: "fake", kind: "permit", riskModifier: 9, priceModifier: -2, expires: 20, text: "Bad" },
    ] as unknown as GameState["politicalEvents"];
    corrupted.voyage = {
      fromId: "grayhaven",
      toId: "saffron",
      days: -2,
      risk: 4,
      progress: 2,
      duration: 0,
    };
    corrupted.encounter = {
      kind: "pirate",
      name: "Impossible Raider",
      strength: 20,
      bribe: 40,
      bounty: 80,
      portName: "Saffron Quay",
    };
    corrupted.pendingArrival = "missing";

    const state = reduceGame(corrupted, { type: "recordError", error: { message: "Invariant probe", source: "test" } });

    expectCoreInvariants(state);
    expect(state.cargoInsurance).toBeNull();
    expect(state.contracts.find((contract) => contract.id === "expired-active")?.status).toBe("failed");
    expect(state.politicalEvents.some((event) => event.id === "expired-permit")).toBe(false);
    expect(state.politicalEvents.some((event) => event.id === "valid-permit" && event.kind === "permit")).toBe(true);
    expect(state.voyage).toBeNull();
    expect(state.encounter?.kind).toBe("pirate");
    expect(state.pendingArrival).toBe("saffron");
  });

  it("normalizes saved runtime errors during load", () => {
    const legacy = createInitialState() as unknown as Omit<Partial<GameState>, "errors"> & { errors: unknown[] };
    legacy.day = 9;
    legacy.errors = [
      "bad record",
      { message: "", source: "empty" },
      { id: "persisted", message: "  Canvas crashed\nhard  ", source: "  pixi renderer  ", day: -2, time: "2026-06-05T12:00:00.000Z", stack: "frame one\nframe two" },
    ];

    const state = reduceGame(createInitialState(), { type: "load", state: legacy as GameState });

    expect(state.errors).toHaveLength(1);
    expect(state.errors[0]).toMatchObject({
      id: "persisted",
      day: 1,
      message: "Canvas crashed hard",
      source: "pixi renderer",
      time: "2026-06-05T12:00:00.000Z",
      stack: "frame one frame two",
    });
  });

  it("round-trips saves and ignores corrupted save data", () => {
    const store = installLocalStorage();

    let state = createInitialState();
    state = reduceGame(state, { type: "trainSkill", skillId: "navigation" });
    state.marketStock.grayhaven.iron = 3;
    state.cargo.iron = 1;
    state.cargoBasis.iron = 44;
    state.captainXp = 77;
    state.captainXpTarget = 180;
    state.crewMorale = 91;
    state.errors = [
      {
        id: "error-test",
        day: 3,
        message: "Saved runtime fault",
        source: "test harness",
        time: "2026-06-05T11:59:00.000Z",
        stack: "stack frame",
      },
    ];
    state.cargoInsurance = {
      providerFactionId: "charter",
      originPortId: "grayhaven",
      destinationPortId: "stormhook",
      coveredValue: 400,
      remainingCoverage: 300,
      premium: 64,
      deductibleRate: 0.18,
      expiresDay: state.day + 4,
    };
    saveGame({ ...state, lastSavedAt: "2026-06-05T12:00:00.000Z" });
    expect(JSON.parse(store[saveKey]).version).toBe(currentSaveVersion);

    const loaded = loadGame();
    expect(loaded?.captainSkills.navigation).toBe(1);
    expect(loaded?.marketStock.grayhaven.iron).toBe(3);
    expect(loaded?.cargoBasis.iron).toBe(44);
    expect(loaded?.captainXp).toBe(77);
    expect(loaded?.captainXpTarget).toBe(180);
    expect(loaded?.crewMorale).toBe(91);
    expect(loaded?.errors[0].message).toBe("Saved runtime fault");
    expect(loaded?.errors[0].stack).toBe("stack frame");
    expect(loaded?.cargoInsurance?.remainingCoverage).toBe(300);
    expect(loaded?.lastSavedAt).toBe("2026-06-05T12:00:00.000Z");

    store[saveKey] = "{bad json";
    expect(loadGame()).toBeNull();
  });

  it("loads v1 and raw prototype saves through current migrations", () => {
    const store = installLocalStorage();
    const legacy = createInitialState() as Partial<GameState>;
    legacy.day = 11;
    legacy.cash = 4321;
    legacy.currentShip = "ledger_brig";
    legacy.ownedShips = ["coastal_sloop", "ledger_brig"];
    legacy.equipment = ["cargo_hoist"];
    legacy.crew = ["boatswain"];
    legacy.crewXp = { boatswain: 130 };
    legacy.currentPort = "grayhaven";
    legacy.selectedPort = "saffron";
    legacy.cargo = { tea: 3 };
    legacy.cargoBasis = { tea: 31 };
    legacy.market = { ...legacy.market!, grayhaven: { ...legacy.market!.grayhaven, tea: 37 } };
    delete legacy.captainSkills;
    delete legacy.skillPoints;
    delete legacy.captainXp;
    delete legacy.captainXpTarget;

    store[legacySaveKeys[0]] = JSON.stringify({ version: 1, state: legacy });
    const loadedV1 = loadGame();
    const migratedV1 = reduceGame(createInitialState(2000), { type: "load", state: loadedV1! });

    expect(migratedV1.day).toBe(11);
    expect(migratedV1.cash).toBe(4321);
    expect(migratedV1.best).toBe(2000);
    expect(migratedV1.currentShip).toBe("ledger_brig");
    expect(migratedV1.equipment).toContain("cargo_hoist");
    expect(migratedV1.crewXp.boatswain).toBe(130);
    expect(migratedV1.cargo.tea).toBe(3);
    expect(migratedV1.cargoBasis.tea).toBe(31);
    expect(migratedV1.market.grayhaven.tea).toBe(37);
    expect(migratedV1.captainSkills.navigation).toBe(0);
    expect(migratedV1.captainXpTarget).toBe(initialCaptainXpTarget);

    store[legacySaveKeys[0]] = "";
    store[saveKey] = JSON.stringify({ ...legacy, day: 12, cash: 5432 });
    const migratedRaw = reduceGame(createInitialState(), { type: "load", state: loadGame()! });
    expect(migratedRaw.day).toBe(12);
    expect(migratedRaw.cash).toBe(5432);

    store[saveKey] = JSON.stringify({ version: 999, state: legacy });
    expect(loadGame()).toBeNull();
  });

  it("exports, imports, and clears save bundles", () => {
    const store = installLocalStorage();
    const state = createInitialState();
    state.day = 18;
    state.cash = 2345;
    state.currentPort = "stormhook";
    state.cargo.tea = 4;
    state.cargoBasis.tea = 51;

    const exported = serializeGameSave(state);
    expect(JSON.parse(exported).version).toBe(currentSaveVersion);

    const imported = importGameSave(exported);
    expect(imported?.day).toBe(18);
    expect(imported?.cash).toBe(2345);
    expect(imported?.cargo?.tea).toBe(4);
    expect(JSON.parse(store[saveKey]).state.currentPort).toBe("stormhook");

    store[legacySaveKeys[0]] = JSON.stringify({ version: 1, state });
    clearSavedGame();
    expect(store[saveKey]).toBeUndefined();
    expect(store[legacySaveKeys[0]]).toBeUndefined();
    expect(importGameSave("{bad json")).toBeNull();
  });

  it("keeps a recoverable backup before save overwrite, import, and delete", () => {
    const store = installLocalStorage();
    const first = createInitialState();
    first.day = 8;
    first.cash = 1111;
    first.currentPort = "saffron";

    saveGame({ ...first, lastSavedAt: "2026-06-05T12:00:00.000Z" });
    expect(hasRecoverableSave()).toBe(false);

    const second = createInitialState();
    second.day = 22;
    second.cash = 2222;
    second.currentPort = "stormhook";
    saveGame({ ...second, lastSavedAt: "2026-06-05T13:00:00.000Z" });

    expect(hasRecoverableSave()).toBe(true);
    expect(JSON.parse(store[backupSaveKey]).state.currentPort).toBe("saffron");
    expect(loadGame()?.currentPort).toBe("stormhook");

    const recoveredFirst = recoverSavedGame();
    expect(recoveredFirst?.currentPort).toBe("saffron");
    expect(loadGame()?.currentPort).toBe("saffron");

    const importedState = createInitialState();
    importedState.day = 33;
    importedState.cash = 3333;
    importedState.currentPort = "orchid";
    expect(importGameSave(serializeGameSave(importedState))?.currentPort).toBe("orchid");
    expect(JSON.parse(store[backupSaveKey]).state.currentPort).toBe("saffron");

    expect(importGameSave("{bad json")).toBeNull();
    expect(loadGame()?.currentPort).toBe("orchid");
    expect(hasRecoverableSave()).toBe(true);

    clearSavedGame();
    expect(store[saveKey]).toBeUndefined();
    expect(hasRecoverableSave()).toBe(true);
    expect(recoverSavedGame()?.currentPort).toBe("orchid");
    expect(loadGame()?.currentPort).toBe("orchid");

    clearSaveBackup();
    expect(hasRecoverableSave()).toBe(false);
  });

  it("recovers damaged save fields without breaking valid progress", () => {
    const damaged = {
      version: "old",
      day: "not a day",
      cash: "no cash",
      debt: -200,
      hull: 9999,
      currentPort: "missing-port",
      selectedPort: "saffron",
      currentShip: "ledger_brig",
      ownedShips: ["bad_ship", "ledger_brig", "ledger_brig"],
      equipment: ["cargo_hoist", "unknown", "cargo_hoist"],
      crew: ["boatswain", "ghost"],
      crewXp: { boatswain: "48" },
      crewMorale: 140,
      captainSkills: { navigation: 2, brokerage: "2", gunnery: 99, fake: 4 },
      skillPoints: "3",
      captainXp: "77",
      captainXpTarget: "bad",
      cargo: { tea: "2", iron: -4, glass: 1.7 },
      cargoBasis: { tea: "44", glass: 63 },
      market: { grayhaven: { tea: "61" } },
      marketStock: { grayhaven: { tea: "bad" } },
      factionStanding: { charter: "12", league: -150 },
      contracts: [
        {
          id: "legacy-contract",
          originPortId: "grayhaven",
          destinationPortId: "saffron",
          factionId: "freeports",
          goodId: "tea",
          units: "2",
          deadline: "15",
          reward: "220",
          penalty: "80",
          status: "active",
          acceptedDay: "9",
        },
        { id: "bad-contract", status: "available" },
      ],
      log: [{ day: "8", text: "  Saved log entry  " }, { day: 2, text: "" }],
      errors: [{ message: "  Render\nfault  ", source: "  pixi  ", day: "4", time: "2026-06-05T12:30:00.000Z" }],
      voyage: {
        fromId: "grayhaven",
        toId: "saffron",
        days: "2",
        risk: "0.3",
        sailPlan: "hard",
        progress: 1.5,
        duration: "2",
        watchIndex: 7,
      },
      encounter: {
        kind: "inspection",
        name: "  Customs  ",
        strength: "12",
        bribe: "100",
        bounty: "0",
        portName: "Saffron Quay",
        factionId: "freeports",
        fine: "60",
        suspectGoodId: "tea",
      },
      pendingArrival: "saffron",
      gameOver: "no",
      lastSavedAt: 123,
    };

    const state = reduceGame(createInitialState(), { type: "load", state: damaged as unknown as Partial<GameState> });

    expect(state.version).toBe(gameStateVersion);
    expect(state.day).toBe(1);
    expect(state.cash).toBe(850);
    expect(state.debt).toBe(0);
    expect(state.currentPort).toBe("grayhaven");
    expect(state.selectedPort).toBe("saffron");
    expect(state.currentShip).toBe("ledger_brig");
    expect(state.ownedShips).toEqual(["ledger_brig"]);
    expect(state.equipment).toEqual(["cargo_hoist"]);
    expect(state.crew).toEqual(["boatswain"]);
    expect(state.crewXp.boatswain).toBe(48);
    expect(state.crewMorale).toBe(100);
    expect(state.captainSkills).toMatchObject({ navigation: 2, brokerage: 2, gunnery: 3, seamanship: 0 });
    expect(state.skillPoints).toBe(3);
    expect(state.captainXp).toBe(77);
    expect(state.captainXpTarget).toBe(initialCaptainXpTarget);
    expect(state.hull).toBeLessThanOrEqual(deriveShipStats(state).hullMax);
    expect(state.cargo).toEqual({ tea: 2, glass: 2 });
    expect(state.cargoBasis).toEqual({ tea: 44, glass: 63 });
    expect(state.market.grayhaven.tea).toBe(61);
    expect(state.factionStanding.charter).toBe(12);
    expect(state.factionStanding.league).toBe(-100);
    expect(state.contracts.some((contract) => contract.id === "legacy-contract" && contract.status === "active")).toBe(true);
    expect(state.log).toEqual([{ day: 8, text: "Saved log entry" }]);
    expect(state.errors[0].message).toBe("Render fault");
    expect(state.voyage).toBeNull();
    expect(state.encounter?.kind).toBe("inspection");
    expect(state.pendingArrival).toBe("saffron");
    expect(state.gameOver).toBe(false);
    expect(state.lastSavedAt).toBeNull();
  });

  it("ranks trade opportunities by risk-adjusted margin", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    state.events = [];
    state.politicalEvents = [];
    for (const good of goods) {
      state.trends[good.id] = { direction: 1, momentum: 0, label: "flat test", expires: 99 };
      for (const port of ports) {
        state.market[port.id][good.id] = good.base;
      }
    }
    state.market.grayhaven.tea = 20;
    state.market.saffron.tea = 42;
    state.market.stormhook.tea = 90;

    const teaRun = tradeOpportunityForGood(state, "tea");
    expect(teaRun?.sellPortId).toBe("stormhook");
    expect(teaRun?.grossMargin).toBeGreaterThan(teaRun?.riskAdjustedMargin ?? 0);
    expect(teaRun?.riskAdjustedMargin).toBeGreaterThan(0);
    expect(teaRun?.days).toBeGreaterThanOrEqual(2);
    expect(teaRun?.risk).toBeGreaterThan(0);
    expect(teaRun?.reason).toBe("storm demand");
    expect(teaRun?.routeWindow.label.length).toBeGreaterThan(0);
    expect(teaRun?.routeWindow.windows).toHaveLength(4);

    const topRun = topTradeOpportunities(state, "grayhaven", 1)[0];
    expect(topRun.goodId).toBe("tea");
    expect(topRun.sellPortId).toBe("stormhook");
    expect(topRun.reason).toBe("storm demand");
    expect(topRun.routeWindow.advice.length).toBeGreaterThan(0);
  });

  it("forecasts tradewind route windows across future days", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "stormhook";
    state.sailPlan = "balanced";

    const forecast = routeWindowForecast(state, "grayhaven", "stormhook", 4);

    expect(forecast.windows).toHaveLength(5);
    expect(forecast.today.offset).toBe(0);
    expect(forecast.next?.offset).toBe(1);
    expect(forecast.best.score).toBe(Math.min(...forecast.windows.map((window) => window.score)));
    expect(forecast.label.length).toBeGreaterThan(0);
    expect(forecast.advice.length).toBeGreaterThan(0);
    for (const window of forecast.windows) {
      expect(window.day).toBe(state.day + window.offset);
      expect(window.days).toBeGreaterThanOrEqual(2);
      expect(window.riskPercent).toBeGreaterThan(0);
      expect(Number.isFinite(window.speedDelta)).toBe(true);
      expect(window.tacticLabel.length).toBeGreaterThan(0);
    }
  });

  it("recommends profit, gamble, and shelter routes from every harbor", () => {
    for (const current of ports) {
      const state = createInitialState();
      seedReadableTradeMarket(state);
      state.currentPort = current.id;
      state.selectedPort = current.id;
      state.cash = 3000;
      state.cargo = {};
      state.cargoBasis = {};
      state.hull = deriveShipStats(state).hullMax;

      const choices = recommendRouteChoices(state, current.id);
      expect(choices.map((choice) => choice.kind)).toEqual(["profit", "gamble", "shelter"]);

      const profit = choices.find((choice) => choice.kind === "profit");
      const gamble = choices.find((choice) => choice.kind === "gamble");
      const shelter = choices.find((choice) => choice.kind === "shelter");
      expect(profit?.expectedProfit).toBeGreaterThan(0);
      expect(profit?.cargoUnits).toBeGreaterThan(0);
      expect(routeTradePlanFor({ ...state, sailPlan: profit!.sailPlan }, profit!.sellPortId, current.id)?.maxBuy).toBeGreaterThan(0);
      expect(gamble?.grossUpside).toBeGreaterThan(0);
      expect(gamble?.sailPlan).toBe("hard");
      expect(["cautious", "quiet"]).toContain(shelter?.sailPlan);
      expect(shelter!.risk).toBeLessThanOrEqual(Math.max(profit!.risk, gamble!.risk));
      for (const choice of choices) {
        expect(choice.tacticLabel.length).toBeGreaterThan(0);
        expect(choice.reason).toContain(choice.tacticLabel);
        expect(Number.isFinite(choice.speedDelta)).toBe(true);
        expect(choice.routeWindow.label.length).toBeGreaterThan(0);
        expect(choice.routeWindow.advice.length).toBeGreaterThan(0);
      }
    }
  });

  it("prices cargo insurance from plotted route risk and cargo value", () => {
    let state = createInitialState();
    state.cash = 5000;
    state.cargo.tea = 2;
    state.cargoBasis.tea = 120;
    state.selectedPort = "stormhook";

    const quote = insuranceQuoteFor(state);
    expect(cargoInsurableValue(state)).toBe(240);
    expect(quote?.policy.destinationPortId).toBe("stormhook");
    expect(quote?.policy.coveredValue).toBe(240);
    expect(quote?.policy.premium).toBeGreaterThan(0);

    state = reduceGame(state, { type: "buyInsurance" });

    expect(state.cash).toBe(5000 - quote!.policy.premium);
    expect(state.cargoInsurance?.destinationPortId).toBe("stormhook");
    expect(state.factionStanding.charter).toBeCloseTo(0.5);
    expect(state.log.some((entry) => entry.text.includes("Bought cargo policy"))).toBe(true);
  });

  it("blocks cargo insurance until cargo has a plotted route", () => {
    let state = createInitialState();
    state.cash = 5000;
    state.cargo.tea = 1;
    state.cargoBasis.tea = 100;

    expect(insuranceQuoteFor(state)).toBeNull();
    state = reduceGame(state, { type: "buyInsurance" });
    expect(state.cargoInsurance).toBeNull();

    state.selectedPort = "stormhook";
    state.cargo = {};
    state.cargoBasis = {};
    expect(insuranceQuoteFor(state)).toBeNull();
  });

  it("pays an insurance claim for pirate cargo losses and closes at destination", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.cash = 5000;
      state.cargo.tea = 3;
      state.cargoBasis.tea = 100;
      state.selectedPort = "stormhook";
      const quote = insuranceQuoteFor(state)!;
      state = reduceGame(state, { type: "buyInsurance" });
      const cashBeforeEncounter = state.cash;
      state.pendingArrival = "stormhook";
      state.encounter = {
        kind: "pirate",
        name: "Test Corsair",
        strength: 180,
        bribe: 400,
        bounty: 500,
        portName: "Stormhook",
      };

      state = reduceGame(state, { type: "run" });

      expect(state.cash).toBeGreaterThan(cashBeforeEncounter);
      expect(state.cash).toBe(cashBeforeEncounter + Math.round(300 * (1 - quote.policy.deductibleRate)));
      expect(state.cargo.tea ?? 0).toBe(0);
      expect(state.currentPort).toBe("stormhook");
      expect(state.cargoInsurance).toBeNull();
      expect(state.log.some((entry) => entry.text.includes("Cargo policy paid"))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Cargo policy closed"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("triggers customs inspections for tariff cargo under inspection pressure", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createInitialState();
      state.cargo.silk = 2;
      state.cargoBasis.silk = 90;
      state.politicalEvents.unshift({
        id: "inspection-test",
        factionId: "admiralty",
        kind: "inspection",
        riskModifier: 0.08,
        priceModifier: 1.03,
        expires: 20,
        text: "Admiralty inspection patrols are active.",
      });
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 1,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.encounter?.kind).toBe("inspection");
      expect(state.encounter?.factionId).toBe("admiralty");
      expect(state.encounter?.fine).toBeGreaterThan(0);
      expect(state.pendingArrival).toBe("stormhook");
      expect(state.currentPort).toBe("grayhaven");
      expect(state.log.some((entry) => entry.text.includes("customs hailed"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets Customs Ledger soften customs inspection fines and bribes", () => {
    const makeInspectionRun = (withLedger: boolean) => {
      let state = createInitialState();
      state.cargo.silk = 10;
      state.cargoBasis.silk = 90;
      state.equipment = withLedger ? ["customs_ledger"] : [];
      state.politicalEvents.unshift({
        id: `inspection-test-${withLedger ? "ledger" : "plain"}`,
        factionId: "admiralty",
        kind: "inspection",
        riskModifier: 0.08,
        priceModifier: 1.03,
        expires: 20,
        text: "Admiralty inspection patrols are active.",
      });
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 1,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };
      return reduceGame(state, { type: "tickVoyage", dt: 1 });
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      const plain = makeInspectionRun(false);
      const ledger = makeInspectionRun(true);

      expect(plain.encounter?.kind).toBe("inspection");
      expect(ledger.encounter?.kind).toBe("inspection");
      expect(ledger.encounter?.fine ?? Infinity).toBeLessThan(plain.encounter?.fine ?? 0);
      expect(ledger.encounter?.bribe ?? Infinity).toBeLessThan(plain.encounter?.bribe ?? 0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("submits to customs by paying the fine and docking", () => {
    let state = createInitialState();
    state.cash = 200;
    state.pendingArrival = "stormhook";
    state.encounter = {
      kind: "inspection",
      name: "Admiralty Customs",
      strength: 80,
      bribe: 120,
      bounty: 0,
      portName: "Stormhook",
      factionId: "admiralty",
      fine: 90,
      suspectGoodId: "silk",
      seizedUnits: 1,
    };

    state = reduceGame(state, { type: "submitInspection" });

    expect(state.cash).toBe(110);
    expect(state.currentPort).toBe("stormhook");
    expect(state.encounter).toBeNull();
    expect(state.pendingArrival).toBeNull();
    expect(state.factionStanding.admiralty).toBeCloseTo(0.6);
    expect(state.log.some((entry) => entry.text.includes("Submitted to Admiralty Court customs"))).toBe(true);
    expect(state.contracts.some((contract) => contract.recoverySource === "customs" && contract.originPortId === "stormhook")).toBe(true);
    expect(state.log.some((entry) => entry.text.includes("Recovery offer posted at Stormhook"))).toBe(true);
  });

  it("honors market permits during customs", () => {
    let state = createInitialState();
    state.cash = 200;
    state.pendingArrival = "stormhook";
    state.politicalEvents.unshift({
      id: "permit-test",
      factionId: "admiralty",
      kind: "permit",
      riskModifier: 0,
      priceModifier: 0.92,
      expires: 12,
      text: "Admiralty Court honored a market permit at its harbors.",
    });
    state.encounter = {
      kind: "inspection",
      name: "Admiralty Customs",
      strength: 80,
      bribe: 120,
      bounty: 0,
      portName: "Stormhook",
      factionId: "admiralty",
      fine: 90,
      suspectGoodId: "silk",
      seizedUnits: 1,
    };

    state = reduceGame(state, { type: "presentPermit" });

    expect(state.cash).toBe(200);
    expect(state.currentPort).toBe("stormhook");
    expect(state.encounter).toBeNull();
    expect(state.factionStanding.admiralty).toBeCloseTo(0.8);
    expect(state.log.some((entry) => entry.text.includes("permit cleared customs"))).toBe(true);
  });

  it("files clean customs manifests for a reduced fee and reputation gain", () => {
    let state = createInitialState();
    state.cash = 240;
    state.pendingArrival = "stormhook";
    state.encounter = {
      kind: "inspection",
      name: "Admiralty Customs",
      strength: 80,
      bribe: 120,
      bounty: 0,
      portName: "Stormhook",
      factionId: "admiralty",
      fine: 100,
      suspectGoodId: "silk",
      seizedUnits: 1,
    };
    const read = customsActionReadFor(state)!;

    state = reduceGame(state, { type: "fileCustomsManifest" });

    expect(read.manifestCost).toBeLessThan(100);
    expect(state.cash).toBe(240 - read.manifestCost);
    expect(state.currentPort).toBe("stormhook");
    expect(state.encounter).toBeNull();
    expect(state.factionStanding.admiralty).toBeCloseTo(read.manifestStandingGain);
    expect(state.log.some((entry) => entry.text.includes("Filed clean Admiralty Court papers"))).toBe(true);
  });

  it("bonds suspect customs cargo to avoid the full fine and create recovery work", () => {
    let state = createInitialState();
    state.cash = 500;
    state.cargo.silk = 3;
    state.cargoBasis.silk = 90;
    state.pendingArrival = "stormhook";
    state.encounter = {
      kind: "inspection",
      name: "Admiralty Customs",
      strength: 90,
      bribe: 130,
      bounty: 0,
      portName: "Stormhook",
      factionId: "admiralty",
      fine: 110,
      suspectGoodId: "silk",
      seizedUnits: 2,
    };
    const read = customsActionReadFor(state)!;

    state = reduceGame(state, { type: "surrenderCustomsCargo" });

    expect(read.cargoCandidate?.goodId).toBe("silk");
    expect(read.cargoBondFee).toBeLessThan(110);
    expect(state.cargo.silk).toBe(1);
    expect(state.cash).toBe(500 - read.cargoBondFee);
    expect(state.currentPort).toBe("stormhook");
    expect(state.factionStanding.admiralty).toBeCloseTo(0.25);
    expect(state.contracts.some((contract) => contract.recoverySource === "customs" && contract.originPortId === "stormhook")).toBe(true);
    expect(state.log.some((entry) => entry.text.includes("Bonded suspect cargo"))).toBe(true);
  });

  it("calls in customs favors by spending standing instead of taking the full fine", () => {
    let state = createInitialState();
    state.cash = 420;
    state.factionStanding.admiralty = 6;
    state.pendingArrival = "stormhook";
    state.encounter = {
      kind: "inspection",
      name: "Admiralty Customs",
      strength: 75,
      bribe: 130,
      bounty: 0,
      portName: "Stormhook",
      factionId: "admiralty",
      fine: 120,
      suspectGoodId: "silk",
      seizedUnits: 1,
    };
    const read = customsActionReadFor(state)!;

    state = reduceGame(state, { type: "callCustomsFavor" });

    expect(read.favorAvailable).toBe(true);
    expect(read.favorFee).toBeLessThan(120);
    expect(state.cash).toBe(420 - read.favorFee);
    expect(state.currentPort).toBe("stormhook");
    expect(state.encounter).toBeNull();
    expect(state.factionStanding.admiralty).toBeCloseTo(6 - read.favorStandingCost);
    expect(state.log.some((entry) => entry.text.includes("quay favor"))).toBe(true);
  });

  it("failed customs evasion seizes tariff cargo and damages standing", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.cash = 500;
      state.cargo.silk = 3;
      state.cargoBasis.silk = 90;
      state.pendingArrival = "stormhook";
      state.encounter = {
        kind: "inspection",
        name: "Admiralty Customs",
        strength: 120,
        bribe: 130,
        bounty: 0,
        portName: "Stormhook",
        factionId: "admiralty",
        fine: 100,
        suspectGoodId: "silk",
        seizedUnits: 2,
      };

      state = reduceGame(state, { type: "run" });

      expect(state.cargo.silk).toBe(1);
      expect(state.cash).toBeLessThan(500);
      expect(state.currentPort).toBe("stormhook");
      expect(state.encounter).toBeNull();
      expect(state.factionStanding.admiralty).toBeLessThan(-4);
      expect(state.log.some((entry) => entry.text.includes("Failed customs evasion"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("can buy and command a larger ship when cargo fits", () => {
    let state = createInitialState();
    state.cash = 6000;
    state = reduceGame(state, { type: "buyShip", shipId: "ledger_brig" });
    expect(state.currentShip).toBe("ledger_brig");
    expect(state.ownedShips).toContain("ledger_brig");
    expect(scoreNow(state)).toBe(5358);
  });

  it("explains net worth with score components that match the reducer score", () => {
    const state = createInitialState();
    state.cash = 3210;
    state.debt = 777;
    state.hull = 84;
    state.currentShip = "ledger_brig";
    state.ownedShips = ["coastal_sloop", "ledger_brig"];
    state.equipment = ["cargo_hoist", "weather_glass"];
    state.crew = ["boatswain"];
    state.crewXp = { boatswain: 180 };
    state.cargo = { tea: 3, iron: 2 };

    const breakdown = scoreBreakdownFor(state);

    expect(breakdown.total).toBe(scoreNow(state));
    expect(breakdown.total).toBe(
      Math.round(
        breakdown.cash +
          breakdown.cargoValue +
          breakdown.activeShipValue +
          breakdown.spareShipValue +
          breakdown.equipmentValue +
          breakdown.crewValue +
          breakdown.hullValue -
          breakdown.debtPenalty
      )
    );
    expect(breakdown.cargoUnits).toBe(cargoUnits(state));
    expect(breakdown.equipmentValue).toBe(920);
    expect(breakdown.crewValue).toBe(524);
    expect(breakdown.spareShipCount).toBe(1);
    expect(breakdown.debtPenalty).toBe(777);
  });

  it("builds an end-run recap with contracts, notable events, and replay guidance", () => {
    const state = createInitialState();
    const completed: Contract = {
      id: "test-complete",
      kind: "standard",
      originPortId: "grayhaven",
      destinationPortId: "saffron",
      factionId: "charter",
      goodId: "tea",
      units: 4,
      deliveredUnits: 4,
      paidReward: 240,
      deadline: 12,
      reward: 240,
      penalty: 90,
      status: "completed",
      acceptedDay: 2,
      completedDay: 8,
    };
    const failed: Contract = {
      id: "test-failed",
      kind: "urgent",
      originPortId: "grayhaven",
      destinationPortId: "stormhook",
      factionId: "admiralty",
      goodId: "medicine",
      units: 3,
      deliveredUnits: 1,
      paidReward: 80,
      deadline: 10,
      reward: 240,
      penalty: 150,
      status: "failed",
      acceptedDay: 3,
      failedDay: 11,
    };
    state.contracts = [completed, failed];
    state.cash = 4500;
    state.debt = 300;
    state.equipment = ["cargo_hoist"];
    state.crew = ["boatswain"];
    state.crewXp = { boatswain: 220 };
    state.factionStanding.charter = 5.4;
    state.best = 5000;
    state.routeHistory = [
      {
        day: 6,
        fromId: "grayhaven",
        toId: "saffron",
        sailPlan: "balanced",
        projectedProfit: 520,
        risk: 0.18,
        wear: 2,
        outcome: "clean",
        reason: "cargo swing",
        cargoSummary: "3 Tea",
        label: "Clean crossing",
        detail: "Tea made the lane pay.",
      },
      {
        day: 9,
        fromId: "saffron",
        toId: "stormhook",
        sailPlan: "hard",
        projectedProfit: 180,
        risk: 0.42,
        wear: 7,
        outcome: "heavy-weather",
        reason: "hard-water test",
        cargoSummary: "2 Iron",
        label: "Hard-water lane",
        detail: "Worst crossing cost 7 hull.",
      },
    ];
    state.log = [
      { day: 4, text: "Sold 3 Tea for $330; profit $126." },
      { day: 7, text: "Storm Front: Crew trimmed against a confused swell." },
      { day: 8, text: "Completed standard contract for Charter; earned $240." },
      { day: 9, text: "Captain advanced: +1 skill point." },
      { day: 60, text: "Retired at day 60. Final net worth: $4,500. Best remains $5,000 ($500 away)." },
    ];

    const recap = runRecapFor(state);

    expect(recap.score.total).toBe(scoreNow(state));
    expect(recap.contracts.completed).toBe(1);
    expect(recap.contracts.failed).toBe(1);
    expect(recap.contracts.deliveredUnits).toBe(5);
    expect(recap.contracts.exposedPenalty).toBe(100);
    expect(recap.events.tradeProfit).toBe(126);
    expect(recap.events.storms).toBe(1);
    expect(recap.events.rankUps).toBe(1);
    expect(recap.comparison.label).toBe("Best chase");
    expect(recap.comparison.value).toBe("$500 off");
    expect(recap.comparison.detail).toContain("$5,000");
    expect(recap.buildBadges).toHaveLength(3);
    expect(recap.buildBadges[0].id).toBeTruthy();
    expect(recap.routeRecap.map((route) => route.id)).toEqual(["best-lane", "hardest-water", "last-crossing"]);
    expect(recap.routeRecap.find((route) => route.id === "best-lane")?.value).toBe("Grayhaven -> Saffron Quay");
    expect(recap.routeRecap.find((route) => route.id === "hardest-water")?.detail).toContain("42%");
    expect(recap.highlights.some((highlight) => highlight.label === "Contracts")).toBe(true);
    expect(recap.story.map((beat) => beat.label)).toEqual([
      "Build Identity",
      "Best Trade",
      "Worst Scrape",
      "Best Recovery",
      "Worst Mistake",
      "Faction Wake",
      "Crew Wake",
      "Next Challenge",
    ]);
    expect(recap.story.find((beat) => beat.label === "Best Trade")?.value).toBe("$126");
    expect(recap.story.find((beat) => beat.label === "Worst Scrape")?.value).toBe("1 trouble");
    expect(recap.story.find((beat) => beat.label === "Best Recovery")?.value).toBe("None needed");
    expect(recap.story.find((beat) => beat.label === "Worst Mistake")?.value).toBe("1 failed");
    expect(recap.story.find((beat) => beat.label === "Crew Wake")?.detail).toContain("Veteran");
    expect(recap.replayPrompt).toContain("Replay hook");
    expect(recap.replayHooks).toHaveLength(3);
    expect(recap.replayHooks.map((hook) => hook.id)).toContain("contract_house");
    expect(recap.replayHooks.every((hook) => hook.target && hook.setup)).toBe(true);
  });

  it("feeds encounter scrapes, recovery jobs, and faction wakes into the run recap", () => {
    const state = createInitialState();
    state.cash = 3200;
    state.currentPort = "stormhook";
    state.selectedPort = "stormhook";
    state.factionStanding.admiralty = 1.5;
    state.factionStanding.freeports = -0.6;
    state.contracts = [
      {
        id: "storm-recovery-closed",
        kind: "urgent",
        originPortId: "stormhook",
        destinationPortId: "grayhaven",
        factionId: "admiralty",
        goodId: "medicine",
        units: 2,
        deliveredUnits: 2,
        paidReward: 260,
        deadline: 24,
        reward: 260,
        penalty: 50,
        status: "completed",
        acceptedDay: 17,
        completedDay: 19,
        recoverySource: "storm",
        brief: "Recovery work: Stormhook dockhands need Medicine moved after the hard-water damage. Low penalty, quick cash.",
      },
    ];
    state.log = [
      { day: 16, text: "Aid signal: Hard-Water Arsenal boats marked the rescue; cost 3 hull, +1 day." },
      { day: 16, text: "Rescue wake crossed the cargo lashings." },
      { day: 16, text: "Stormhook marked the aid in your papers; standing +1.5." },
      { day: 17, text: "Red Ledger soured on the parley. Extra $34 paid, cargo taken." },
      { day: 18, text: "Recovery offer posted at Stormhook: Recovery work: Stormhook dockhands need Medicine moved after the hard-water damage. Low penalty, quick cash." },
    ];

    const recap = runRecapFor(state);
    const story = Object.fromEntries(recap.story.map((beat) => [beat.label, beat]));

    expect(story["Worst Scrape"].value).toBe("Pirate parley");
    expect(story["Worst Scrape"].detail).toContain("soured on the parley");
    expect(story["Best Recovery"].value).toBe("Storm recovery closed");
    expect(story["Best Recovery"].detail).toContain("Stormhook -> Grayhaven");
    expect(story["Faction Wake"].value).toBe("Admiralty Court");
    expect(story["Faction Wake"].detail).toContain("Aid signal turned hard water");
    expect(story["Faction Wake"].detail).toContain("1.5 standing");
  });

  it("records score comparison evidence when the 60-day ledger closes", () => {
    const state = createInitialState(100000);
    state.day = maxDay;

    const closed = reduceGame(state, { type: "waitDay" });
    const recap = runRecapFor(closed);

    expect(closed.gameOver).toBe(true);
    expect(closed.log.some((entry) => entry.text.includes("Best remains $100,000"))).toBe(true);
    expect(recap.comparison.label).toBe("Best chase");
    expect(recap.comparison.delta).toBeLessThan(0);
  });

  it("starts replay-hook runs with visible opening setup tradeoffs", () => {
    const storm = createInitialState(0, "storm_sailor");
    expect(storm.equipment).toContain("storm_sails");
    expect(storm.debt).toBe(860);
    expect(storm.sailPlan).toBe("cautious");
    expect(storm.log[0].text).toContain("Replay hook: Storm Sailor");

    const contract = createInitialState(0, "contract_house");
    expect(contract.factionStanding.charter).toBeGreaterThan(1);
    expect(contract.contracts.some((entry) => entry.id === "replay-house-job")).toBe(true);
    expect(contract.tab).toBe("contracts");

    const base = createInitialState(4400);
    const risk = reduceGame(base, { type: "newRun", best: base.best, replayHookId: "risk_trader" });
    expect(risk.best).toBe(4400);
    expect(risk.cargo.tea).toBe(6);
    expect(risk.selectedPort).toBe("glassport");
    expect(risk.sailPlan).toBe("hard");
  });

  it("resells inactive owned hulls through the current yard", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.currentShip = "coastal_sloop";
    state.ownedShips = ["coastal_sloop", "ledger_brig"];
    state.cash = 100;
    const ledger = shipCatalog.find((ship) => ship.id === "ledger_brig")!;
    const resale = yardResaleValueFor(state, ledger);

    state = reduceGame(state, { type: "sellShip", shipId: "ledger_brig" });

    expect(state.cash).toBe(100 + resale);
    expect(state.ownedShips).not.toContain("ledger_brig");
    expect(state.currentShip).toBe("coastal_sloop");
    expect(state.log.some((entry) => entry.text.includes("Sold Ledger Brig"))).toBe(true);
  });

  it("blocks selling the active hull", () => {
    let state = createInitialState();
    state.currentShip = "ledger_brig";
    state.ownedShips = ["coastal_sloop", "ledger_brig"];
    state.cash = 100;

    state = reduceGame(state, { type: "sellShip", shipId: "ledger_brig" });

    expect(state.cash).toBe(100);
    expect(state.ownedShips).toContain("ledger_brig");
  });

  it("prices shipyard hulls and equipment from faction yards", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    const ledger = shipCatalog.find((ship) => ship.id === "ledger_brig")!;
    const clipper = shipCatalog.find((ship) => ship.id === "clipper_kite")!;
    const glass = equipmentCatalog.find((item) => item.id === "weather_glass")!;

    expect(yardPriceFor(state, ledger)).toBe(ledger.price);
    expect(yardPriceFor(state, clipper)).toBeGreaterThan(clipper.price);
    expect(yardPriceFor(state, glass)).toBe(glass.cost);
    expect(yardSourceLabel(state, clipper)).toContain("order");

    const favored = createInitialState();
    favored.currentPort = "saffron";
    favored.factionStanding.freeports = 20;
    const strained = createInitialState();
    strained.currentPort = "saffron";
    strained.factionStanding.freeports = -12;

    expect(yardPriceFor(favored, clipper)).toBeLessThan(clipper.price);
    expect(yardPriceFor(strained, clipper)).toBeGreaterThan(clipper.price);
  });

  it("gives each ship a distinct identity, upgrade path, and resale profile", () => {
    const labels = shipCatalog.map((ship) => shipIdentitySummary(ship));
    expect(new Set(labels).size).toBe(shipCatalog.length);
    expect(labels).toContain("Route Hunter | long narrow wind knife");
    expect(shipUpgradePath(shipCatalog.find((ship) => ship.id === "iron_barge")!)).toContain("gun deck");
    expect(shipHandlingLabel("clipper_kite")).toContain("Route Hunter");
    expect(shipResaleProfile(shipCatalog.find((ship) => ship.id === "iron_barge")!)).toBe("strong resale");
    expect(shipResaleProfile(shipCatalog.find((ship) => ship.id === "coastal_sloop")!)).toBe("soft resale");
  });

  it("makes ship handling change route speed, risk, wear, and resale value", () => {
    const clipperState = createNeutralPriceState();
    clipperState.currentShip = "clipper_kite";
    clipperState.ownedShips = ["coastal_sloop", "clipper_kite"];
    clipperState.currentPort = "grayhaven";
    clipperState.selectedPort = "stormhook";

    const bargeState = createNeutralPriceState();
    bargeState.currentShip = "iron_barge";
    bargeState.ownedShips = ["coastal_sloop", "iron_barge"];
    bargeState.currentPort = "grayhaven";
    bargeState.selectedPort = "stormhook";

    const clipperConditions = routeConditions(clipperState, "grayhaven", "stormhook");
    const bargeConditions = routeConditions(bargeState, "grayhaven", "stormhook");
    expect(clipperConditions.handlingLabel).toContain("Route Hunter");
    expect(bargeConditions.handlingLabel).toContain("Convoy Barge");
    expect(routeDays(clipperState, "grayhaven", "stormhook")).toBeLessThanOrEqual(routeDays(bargeState, "grayhaven", "stormhook"));
    expect(routeRisk(bargeState, "grayhaven", "stormhook")).toBeLessThan(routeRisk(clipperState, "grayhaven", "stormhook"));

    const emptyClipperStress = routeWearEstimate(clipperState, "grayhaven", "stormhook").stress;
    const emptyBargeStress = routeWearEstimate(bargeState, "grayhaven", "stormhook").stress;
    clipperState.cargo.tools = 8;
    bargeState.cargo.tools = 8;
    const clipperLoadStrain = routeWearEstimate(clipperState, "grayhaven", "stormhook").stress - emptyClipperStress;
    const bargeLoadStrain = routeWearEstimate(bargeState, "grayhaven", "stormhook").stress - emptyBargeStress;
    expect(bargeLoadStrain).toBeLessThan(clipperLoadStrain);

    const clipper = shipCatalog.find((ship) => ship.id === "clipper_kite")!;
    const barge = shipCatalog.find((ship) => ship.id === "iron_barge")!;
    const clipperResaleRate = yardResaleValueFor({ currentPort: "saffron", factionStanding: { freeports: 0 } }, clipper) / clipper.price;
    const bargeResaleRate = yardResaleValueFor({ currentPort: "stormhook", factionStanding: { admiralty: 0 } }, barge) / barge.price;
    expect(bargeResaleRate).toBeGreaterThan(clipperResaleRate);
  });

  it("uses yard-adjusted prices when buying equipment", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    const rigging = equipmentCatalog.find((item) => item.id === "deep_rigging")!;
    const yardPrice = yardPriceFor(state, rigging);
    state.cash = yardPrice;

    state = reduceGame(state, { type: "buyEquipment", equipmentId: "deep_rigging" });

    expect(state.cash).toBe(0);
    expect(state.equipment).toContain("deep_rigging");
  });

  it("applies hull-class fit bonuses to refit builds", () => {
    const starter = createInitialState();
    starter.equipment = ["deep_rigging"];
    const clipper = createInitialState();
    clipper.currentShip = "clipper_kite";
    clipper.ownedShips.push("clipper_kite");
    clipper.equipment = ["deep_rigging"];
    const barge = createInitialState();
    barge.currentShip = "iron_barge";
    barge.ownedShips.push("iron_barge");
    barge.equipment = ["cargo_hoist", "gun_deck", "crew_quarters"];

    expect(equipmentFitBonusFor("clipper_kite", "deep_rigging")?.label).toBe("Route hunter trim");
    expect(deriveShipStats(starter).speed).toBe(2);
    expect(deriveShipStats(starter).openWater).toBe(3);
    expect(deriveShipStats(clipper).speed).toBe(6);
    expect(deriveShipStats(barge).cargoCap).toBe(64);
    expect(deriveShipStats(barge).cannons).toBe(6);
    expect(deriveShipStats(barge).hullMax).toBe(138);
  });

  it("offers multiple refit choices per slot with distinct hull fits", () => {
    const slotCounts = equipmentCatalog.reduce<Record<string, number>>((counts, item) => {
      counts[item.slot] = (counts[item.slot] ?? 0) + 1;
      return counts;
    }, {});
    expect(slotCounts.deck).toBeGreaterThanOrEqual(3);
    expect(slotCounts.instrument).toBeGreaterThanOrEqual(3);
    expect(slotCounts.hardpoint).toBeGreaterThanOrEqual(4);
    expect(slotCounts.quarters).toBeGreaterThanOrEqual(3);

    const clipper = createInitialState();
    clipper.currentShip = "clipper_kite";
    clipper.ownedShips.push("clipper_kite");
    clipper.equipment = ["storm_sails", "chart_table"];
    const brig = createInitialState();
    brig.currentShip = "ledger_brig";
    brig.ownedShips.push("ledger_brig");
    brig.equipment = ["chart_table", "officer_cabins", "signal_cannon"];
    const barge = createInitialState();
    barge.currentShip = "iron_barge";
    barge.ownedShips.push("iron_barge");
    barge.equipment = ["ballast_keel", "galley_mess"];

    expect(equipmentFitBonusFor("clipper_kite", "storm_sails")?.label).toBe("Knife-edge canvas");
    expect(deriveShipStats(clipper).speed).toBe(7);
    expect(deriveShipStats(clipper).navigation).toBe(3);
    expect(deriveShipStats(brig).navigation).toBe(6);
    expect(deriveShipStats(brig).negotiation).toBe(1);
    expect(deriveShipStats(barge).openWater).toBe(5);
    expect(deriveShipStats(barge).crewCap).toBe(6);
    expect(deriveShipStats(barge).hullMax).toBe(139);
  });

  it("applies hull fit capacity when installing structural refits", () => {
    let state = createInitialState();
    state.cash = 2000;
    state.hull = 60;
    state.selectedPort = "stormhook";

    state = reduceGame(state, { type: "buyEquipment", equipmentId: "reinforced_ribs" });

    expect(state.equipment).toContain("reinforced_ribs");
    expect(deriveShipStats(state).hullMax).toBe(121);
    expect(state.hull).toBe(81);
    expect(state.log[0].text).toContain("Build +21 hull");
    expect(state.log[0].text).toContain("Route");
    expect(state.log[0].text).toContain("Fit: Cutter knees");
  });

  it("logs route-aware build feedback when buying ships and training skills", () => {
    let state = createInitialState();
    state.cash = 6000;
    state.selectedPort = "stormhook";

    state = reduceGame(state, { type: "buyShip", shipId: "ledger_brig" });
    expect(state.currentShip).toBe("ledger_brig");
    expect(state.log[0].text).toContain("Bought Ledger Brig");
    expect(state.log[0].text).toContain("Build");
    expect(state.log[0].text).toContain("Route");

    state.skillPoints = 1;
    state = reduceGame(state, { type: "trainSkill", skillId: "navigation" });
    expect(state.captainSkills.navigation).toBe(1);
    expect(state.log[0].text).toContain("Trained Navigation to level 1");
    expect(state.log[0].text).toContain("Build +1 nav");
    expect(state.log[0].text).toContain("Route");
  });

  it("resells installed equipment and clamps hull to the remaining fit", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.equipment = ["reinforced_ribs"];
    state.hull = 115;
    state.cash = 0;
    const ribs = equipmentCatalog.find((item) => item.id === "reinforced_ribs")!;
    const resale = yardResaleValueFor(state, ribs);

    state = reduceGame(state, { type: "sellEquipment", equipmentId: "reinforced_ribs" });

    expect(state.cash).toBe(resale);
    expect(state.equipment).not.toContain("reinforced_ribs");
    expect(state.hull).toBe(100);
  });

  it("blocks equipment resale when cargo or crew would no longer fit", () => {
    let state = createInitialState();
    state.equipment = ["cargo_hoist"];
    state.cargo.tools = 12;
    state.cash = 0;

    state = reduceGame(state, { type: "sellEquipment", equipmentId: "cargo_hoist" });

    expect(state.cash).toBe(0);
    expect(state.equipment).toContain("cargo_hoist");
  });

  it("previews ship route fit and lets transferred cargo upgrades count when buying hulls", () => {
    let state = createInitialState();
    state.currentShip = "ledger_brig";
    state.ownedShips.push("ledger_brig");
    state.equipment.push("cargo_hoist");
    state.cash = 5000;
    state.cargo.tools = 15;
    state.selectedPort = "stormhook";

    const sloopPreview = previewShip(state, "coastal_sloop");
    const clipperPreview = previewShip(state, "clipper_kite");

    expect(sloopPreview?.route).toBeTruthy();
    expect(clipperPreview?.identity).toContain("Route Hunter");
    expect(clipperPreview?.upgradePath).toContain("deep rigging");
    expect(clipperPreview?.resaleProfile).toBe("standard resale");
    expect(clipperPreview?.route?.handlingLabel).toContain("Route Hunter");
    expect(clipperPreview?.route?.days).toBeLessThanOrEqual(sloopPreview?.route?.days ?? 99);
    expect(clipperPreview?.cargoFits).toBe(true);

    state = reduceGame(state, { type: "buyShip", shipId: "clipper_kite" });

    expect(state.currentShip).toBe("clipper_kite");
    expect(state.ownedShips).toContain("clipper_kite");
    expect(deriveShipStats(state).cargoCap).toBeGreaterThan(28);
    expect(state.hull).toBe(deriveShipStats(state).hullMax);
  });

  it("charges crew payroll on weekly paydays during voyages", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.crew = ["navigator", "boatswain"];
      state.cash = 300;
      state.crewMorale = 70;
      state.day = 6;
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 1,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };
      const wage = crewWeeklyWage(state);

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.day).toBe(7);
      expect(state.cash).toBe(300 - wage);
      expect(state.debt).toBe(500);
      expect(state.crewMorale).toBeGreaterThanOrEqual(74);
      expect(state.crewMorale).toBeLessThanOrEqual(76);
      expect(state.log.some((entry) => entry.text.includes(`Crew payday: paid $${wage}`))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Reward: clean crossing lifted crew morale"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("finances crew payroll shortfalls into debt", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.crew = ["navigator", "boatswain"];
      state.cash = 10;
      state.crewMorale = 70;
      state.day = 6;
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 1,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };
      const shortfall = crewWeeklyWage(state) - state.cash;

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.cash).toBe(0);
      expect(state.debt).toBe(500 + Math.ceil(shortfall * crewCreditPremium));
      expect(state.crewMorale).toBeGreaterThanOrEqual(57);
      expect(state.crewMorale).toBeLessThanOrEqual(59);
      expect(state.log.some((entry) => entry.text.includes("Crew payday: paid $10"))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Reward: clean crossing lifted crew morale"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets shore leave trade cash and time for crew morale", () => {
    let state = createInitialState();
    state.cash = 1000;
    state.crew = ["boatswain"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 54,
        strain: 70,
        demand: "shore_leave",
        demandExpires: state.day + 4,
      },
    };
    state.crewMorale = 45;
    const cost = shoreLeaveCost(state);

    state = reduceGame(state, { type: "shoreLeave" });

    expect(state.day).toBe(2);
    expect(state.cash).toBe(1000 - cost);
    expect(state.crewMorale).toBeGreaterThan(45);
    expect(state.crewProfiles.boatswain.strain).toBeLessThan(70);
    expect(state.crewProfiles.boatswain.demand).toBeUndefined();
    expect(crewMoraleTier(state.crewMorale).label).toBe("Steady");
    expect(state.log.some((entry) => entry.text.includes("Shore leave restored"))).toBe(true);
    expect(state.log.some((entry) => entry.text.includes("settled 1 crew demand"))).toBe(true);
  });

  it("initializes hired crew with readable identity preferences", () => {
    let state = createInitialState();
    state.cash = 2000;

    state = reduceGame(state, { type: "hireCrew", crewId: "navigator" });

    expect(state.crewProfiles.navigator).toMatchObject({
      temperament: "bold",
      preference: "fast_water",
    });
    expect(crewProfileSummary(state.crewProfiles.navigator)).toContain("Fast water");
    expect(state.log.some((entry) => entry.text.includes("fast water preference"))).toBe(true);
  });

  it("makes crew facilities change shore leave economics and morale recovery", () => {
    let plain = createInitialState();
    plain.cash = 1000;
    plain.crew = ["boatswain"];
    plain.crewXp = { boatswain: 0 };
    plain.crewMorale = 40;

    let galley = createInitialState();
    galley.cash = 1000;
    galley.crew = ["boatswain"];
    galley.crewXp = { boatswain: 0 };
    galley.crewMorale = 40;
    galley.equipment = ["galley_mess"];

    const plainCost = shoreLeaveCost(plain);
    const galleyCost = shoreLeaveCost(galley);
    plain = reduceGame(plain, { type: "shoreLeave" });
    galley = reduceGame(galley, { type: "shoreLeave" });

    expect(crewFacilityFor(galley).label).toBe("Galley Mess");
    expect(crewFacilitySummary(galley)).toContain("cheaper leave");
    expect(galleyCost).toBeLessThan(plainCost);
    expect(galley.cash).toBe(1000 - galleyCost);
    expect(galley.crewMorale).toBeGreaterThan(plain.crewMorale);
  });

  it("lets crew facilities run active drills for XP, morale, and strain relief", () => {
    let state = createInitialState();
    state.cash = 1000;
    state.crew = ["boatswain"];
    state.crewXp = { boatswain: 0 };
    state.crewMorale = 52;
    state.equipment = ["watch_bunks"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 54,
        strain: 58,
        demand: "safer_orders",
        demandExpires: state.day + 5,
      },
    };
    const drill = crewFacilityDrillFor(state);

    state = reduceGame(state, { type: "crewDrill" });

    expect(state.day).toBe(2);
    expect(state.cash).toBe(1000 - drill.cost);
    expect(state.crewXp.boatswain).toBe(Math.round(drill.crewXp * crewFacilityFor(state).xpMultiplier));
    expect(state.crewMorale).toBe(52 + drill.morale);
    expect(state.crewProfiles.boatswain.strain).toBe(58 - drill.strainRelief);
    expect(state.crewProfiles.boatswain.demand).toBeUndefined();
    expect(state.log.some((entry) => entry.text.includes("Rotating Watch Drill"))).toBe(true);
  });

  it("blocks shore leave without crew or enough cash", () => {
    let state = createInitialState();
    state.cash = 1000;
    state = reduceGame(state, { type: "shoreLeave" });
    expect(state.day).toBe(1);
    expect(state.cash).toBe(1000);

    state.crew = ["boatswain"];
    state.cash = shoreLeaveCost(state) - 1;
    state.crewMorale = 40;
    const before = state.cash;
    state = reduceGame(state, { type: "shoreLeave" });
    expect(state.day).toBe(1);
    expect(state.cash).toBe(before);
    expect(state.crewMorale).toBe(40);
  });

  it("feeds morale into derived ship performance", () => {
    const inspired = createInitialState();
    inspired.crew = ["boatswain"];
    inspired.crewXp.boatswain = 0;
    inspired.crewMorale = 90;

    const ragged = createInitialState();
    ragged.crew = ["boatswain"];
    ragged.crewXp.boatswain = 0;
    ragged.crewMorale = 20;

    expect(deriveShipStats(inspired).openWater).toBeGreaterThan(deriveShipStats(ragged).openWater);
    expect(deriveShipStats(inspired).navigation).toBeGreaterThan(deriveShipStats(ragged).navigation);
    expect(deriveShipStats(ragged).speed).toBeLessThan(deriveShipStats(inspired).speed);
  });

  it("turns crew rank into visible specialties and fair wage growth", () => {
    const green = crewSpecialtyFor("navigator", 0);
    const seasoned = crewSpecialtyFor("navigator", 60);
    const masterWage = crewWageFor("navigator", 320);
    const greenWage = crewWageFor("navigator", 0);

    expect(green.text).toContain("Wayfinder");
    expect(seasoned.text).toContain("Seasoned");
    expect(seasoned.perk).toContain("nav");
    expect(masterWage).toBeGreaterThan(greenWage);
    expect(masterWage).toBeLessThan(Math.round(greenWage * 1.35));

    const protectedCrew = createInitialState();
    protectedCrew.crew = ["boatswain", "gunner"];
    protectedCrew.crewXp = { boatswain: 320, gunner: 320 };
    protectedCrew.crewMorale = 92;
    expect(crewCasualtyProtection(protectedCrew)).toBeGreaterThan(0.2);
  });

  it("levels crew through voyages and applies rank bonuses", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.cash = 2000;
      state = reduceGame(state, { type: "hireCrew", crewId: "navigator" });
      state.crewXp.navigator = 55;
      const wageBefore = crewWeeklyWage(state);
      const navigationBefore = deriveShipStats(state).navigation;
      state.selectedPort = "stormhook";
      state = reduceGame(state, { type: "startVoyage" });
      state.voyage = {
        ...state.voyage!,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(crewRankFor(state.crewXp.navigator).label).toBe("Seasoned");
      expect(deriveShipStats(state).navigation).toBeGreaterThan(navigationBefore);
      expect(crewWeeklyWage(state)).toBeGreaterThan(wageBefore);
      expect(state.log.some((entry) => entry.text.includes("Navigator became Seasoned"))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Wayfinder"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets crew route preferences object to mismatched route choices", () => {
    const state = createInitialState();
    state.crew = ["boatswain"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 52,
        strain: 78,
        demand: "safer_orders",
        demandExpires: state.day + 6,
      },
    };
    state.sailPlan = "hard";

    const read = crewRouteReadFor(state, "grayhaven", "stormhook");

    expect(read.score).toBeLessThan(0);
    expect(read.compact).toContain("Boatswain");
    expect(read.entries[0].stance).toBe("objects");
  });

  it("updates crew loyalty, strain, and demands after route outcomes", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.crew = ["boatswain"];
      state.crewXp = { boatswain: 0 };
      state.crewProfiles = {
        boatswain: {
          temperament: "cautious",
          preference: "safe_water",
          loyalty: 52,
          strain: 54,
        },
      };
      state.sailPlan = "hard";
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 3,
        risk: 0,
        sailPlan: "hard",
        wear: 10,
        wearLabel: "heavy wear",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.crewProfiles.boatswain.strain).toBeGreaterThan(54);
      expect(state.crewProfiles.boatswain.demand).toBeTruthy();
      expect(state.crewProfiles.boatswain.loyalty).toBeLessThanOrEqual(52);
      expect(state.log.some((entry) => entry.text.includes("Crew read:"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("turns high-morale rank-ups into loyal crew with retention tradeoffs", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.crew = ["boatswain"];
      state.crewXp = { boatswain: 55 };
      state.crewTraits = { boatswain: [] };
      state.crewMorale = 90;
      state.voyage = {
        fromId: "grayhaven",
        toId: "saffron",
        days: 2,
        risk: 0,
        sailPlan: "balanced",
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.crewTraits.boatswain).toContain("loyal");
      expect(crewTraitSummary(crewTraitsFor(state, "boatswain"))).toContain("Loyal");
      expect(crewDismissalCost(state, "boatswain")).toBeGreaterThan(
        crewDismissalCost({ crew: ["boatswain"], crewXp: { boatswain: state.crewXp.boatswain }, crewTraits: { boatswain: [] } }, "boatswain")
      );
      expect(state.log.some((entry) => entry.text.includes("Boatswain gained Loyal"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets hard-water crew gain storm scars that affect ship handling", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      let state = createInitialState();
      state.crew = ["navigator"];
      state.crewXp = { navigator: 55 };
      state.crewTraits = { navigator: [] };
      state.crewMorale = 70;
      const openWaterBefore = deriveShipStats(state).openWater;
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 4,
        risk: 0.22,
        sailPlan: "balanced",
        progress: 0.5,
        duration: 1,
      };
      state.encounter = {
        kind: "sea",
        seaKind: "storm",
        name: "Storm Front",
        strength: 60,
        bribe: 0,
        bounty: 0,
        portName: "Stormhook",
        progress: 0.5,
        roughness: 0.62,
        stormIntensity: 0.7,
        waveEnergy: 0.76,
        effect: "damage",
        hullThreat: 4,
        moraleThreat: 5,
        cargoThreat: 0,
      };

      state = reduceGame(state, { type: "resolveSeaSkill" });

      expect(state.crewTraits.navigator).toContain("storm_scarred");
      expect(deriveShipStats(state).openWater).toBeGreaterThan(openWaterBefore);
      expect(crewCasualtyProtection(state)).toBeGreaterThan(crewCasualtyProtection({ crew: ["navigator"], crewXp: state.crewXp, crewTraits: { navigator: [] }, crewMorale: state.crewMorale }));
      expect(state.log.some((entry) => entry.text.includes("Navigator gained Storm-Scarred"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("normalizes crew traits on loaded saves", () => {
    const state = reduceGame(createInitialState(), {
      type: "load",
      state: {
        crew: ["navigator"],
        crewXp: { navigator: 20 },
        crewTraits: {
          navigator: ["loyal", "storm_scarred", "loyal", "ghost"],
          boatswain: ["marketwise"],
        } as unknown as GameState["crewTraits"],
      },
    });

    expect(state.crewTraits).toEqual({ navigator: ["loyal", "storm_scarred"] });
  });

  it("normalizes crew profiles on loaded saves", () => {
    const state = reduceGame(createInitialState(), {
      type: "load",
      state: {
        crew: ["navigator", "boatswain"],
        crewProfiles: {
          navigator: {
            temperament: "fake",
            preference: "profitable_cargo",
            loyalty: 500,
            strain: -20,
            demand: "profit_share",
            demandExpires: 12,
          },
          boatswain: {
            temperament: "cautious",
            preference: "safe_water",
            loyalty: 64,
            strain: 30,
            demand: "ghost",
          },
          gunner: {
            temperament: "bold",
            preference: "armed_routes",
            loyalty: 50,
            strain: 0,
          },
        } as unknown as GameState["crewProfiles"],
      },
    });

    expect(state.crewProfiles.navigator.temperament).toBe("bold");
    expect(state.crewProfiles.navigator.preference).toBe("profitable_cargo");
    expect(state.crewProfiles.navigator.loyalty).toBe(100);
    expect(state.crewProfiles.navigator.strain).toBe(0);
    expect(state.crewProfiles.navigator.demand).toBe("profit_share");
    expect(state.crewProfiles.boatswain.demand).toBeUndefined();
    expect(state.crewProfiles.gunner).toBeUndefined();
    expect(crewProfileFor(state, "boatswain").preference).toBe("safe_water");
  });

  it("uses officer cabins to accelerate crew experience", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let plain = createInitialState();
      plain.crew = ["navigator"];
      plain.crewXp = { navigator: 38 };
      plain.voyage = {
        fromId: "grayhaven",
        toId: "saffron",
        days: 2,
        risk: 0,
        sailPlan: "balanced",
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };

      let cabins = createInitialState();
      cabins.crew = ["navigator"];
      cabins.crewXp = { navigator: 38 };
      cabins.equipment = ["officer_cabins"];
      cabins.voyage = { ...plain.voyage! };

      plain = reduceGame(plain, { type: "tickVoyage", dt: 1 });
      cabins = reduceGame(cabins, { type: "tickVoyage", dt: 1 });

      expect(crewRankFor(plain.crewXp.navigator).label).toBe("Green");
      expect(crewRankFor(cabins.crewXp.navigator).label).toBe("Seasoned");
      expect(cabins.crewXp.navigator).toBeGreaterThan(plain.crewXp.navigator);
      expect(cabins.log.some((entry) => entry.text.includes("Navigator became Seasoned"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets dismissal trade severance and morale for roster flexibility", () => {
    let state = createInitialState();
    state.cash = 1200;
    state.crew = ["navigator", "boatswain"];
    state.crewXp = { navigator: 170, boatswain: 0 };
    state.crewMorale = 82;
    const severance = crewDismissalCost(state, "navigator");
    const navigationBefore = deriveShipStats(state).navigation;

    state = reduceGame(state, { type: "dismissCrew", crewId: "navigator" });

    expect(state.crew).toEqual(["boatswain"]);
    expect(state.crewXp.navigator).toBeUndefined();
    expect(state.cash).toBe(1200 - severance);
    expect(state.crewMorale).toBeLessThan(82);
    expect(deriveShipStats(state).navigation).toBeLessThan(navigationBefore);
    expect(state.log.some((entry) => entry.text.includes("Dismissed Veteran Navigator"))).toBe(true);
  });

  it("can lose crew in a failed fight and logs the lost specialty", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createInitialState();
      state.crew = ["navigator"];
      state.crewXp = { navigator: 80 };
      state.crewMorale = 70;
      state.encounter = {
        kind: "pirate",
        name: "The Red Ledger",
        strength: 240,
        bribe: 600,
        bounty: 500,
        portName: "Stormhook",
      };
      state.pendingArrival = "stormhook";

      state = reduceGame(state, { type: "fight" });

      expect(state.crew).toEqual([]);
      expect(state.crewXp.navigator).toBeUndefined();
      expect(state.log.some((entry) => entry.text.includes("Wayfinder gone"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets Gunnery mastery improve pirate tactical reads before a fight", () => {
    const makePirateState = (level: 2 | 3) => {
      const state = createInitialState();
      state.captainSkills.gunnery = level;
      state.encounter = {
        kind: "pirate",
        name: "The Red Ledger",
        strength: 150,
        bribe: 500,
        bounty: 420,
        portName: "Stormhook",
      };
      state.pendingArrival = "stormhook";
      return state;
    };

    const ordinary = pirateTacticalReadFor(makePirateState(2))!;
    const mastered = pirateTacticalReadFor(makePirateState(3))!;

    expect(hasCaptainSkillMastery(makePirateState(3), "gunnery")).toBe(true);
    expect(mastered.battleRating).toBeGreaterThan(ordinary.battleRating);
    expect(mastered.fightChance).toBeGreaterThan(ordinary.fightChance);
    expect(mastered.warnChance).toBeGreaterThan(ordinary.warnChance);
  });

  it("turns ordinary voyages into actionable dockside reward tips", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.events = [];
      state.currentPort = "grayhaven";
      state.voyage = {
        fromId: "grayhaven",
        toId: "saffron",
        days: 2,
        risk: 0,
        wear: 3,
        wearLabel: "spray wear",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.currentPort).toBe("saffron");
      expect(state.events.some((event) => event.portId === "saffron")).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Reward: dockside tip"))).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Crossing experience"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("rewards clean crewed crossings with morale", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.crew = ["boatswain"];
      state.crewXp = { boatswain: 0 };
      state.crewMorale = 70;
      state.day = 43;
      state.voyage = {
        fromId: "grayhaven",
        toId: "saffron",
        days: 2,
        risk: 0,
        wear: 0,
        wearLabel: "clean crossing",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.crewMorale).toBe(74);
      expect(state.log.some((entry) => entry.text.includes("Reward: clean crossing lifted crew morale"))).toBe(true);
      expect(state.crewXp.boatswain).toBeGreaterThan(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("rewards hard risky crossings with faction story value", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createInitialState();
      state.factionStanding.freeports = 0;
      state.voyage = {
        fromId: "grayhaven",
        toId: "saffron",
        days: 2,
        risk: 0.4,
        wear: 8,
        wearLabel: "heavy wear",
        progress: 0.99,
        duration: 1,
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 1 });

      expect(state.factionStanding.freeports).toBeGreaterThan(0);
      expect(state.log.some((entry) => entry.text.includes("Reward: hard-water story spread"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("replaces equipment within loadout slots and recalculates stats", () => {
    let state = createInitialState();
    state.cash = 3000;

    state = reduceGame(state, { type: "buyEquipment", equipmentId: "deep_rigging" });
    expect(state.equipment).toContain("deep_rigging");
    expect(deriveShipStats(state).speed).toBe(2);

    state = reduceGame(state, { type: "buyEquipment", equipmentId: "cargo_hoist" });

    expect(state.equipment).not.toContain("deep_rigging");
    expect(state.equipment).toContain("cargo_hoist");
    expect(deriveShipStats(state).speed).toBe(1);
    expect(deriveShipStats(state).cargoCap).toBe(28);
    expect(state.log[0].text).toContain("Replaced Deep-Water Rigging with Cargo Hoist");
  });

  it("blocks equipment replacement that would overfill cargo", () => {
    let state = createInitialState();
    state.cash = 3000;
    state = reduceGame(state, { type: "buyEquipment", equipmentId: "cargo_hoist" });
    state.cargo.tools = 12;

    const beforeCash = state.cash;
    state = reduceGame(state, { type: "buyEquipment", equipmentId: "deep_rigging" });

    expect(state.equipment).toContain("cargo_hoist");
    expect(state.equipment).not.toContain("deep_rigging");
    expect(state.cash).toBe(beforeCash);
  });

  it("paces contracts from starter routes into upgrade stakes", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.34);
    try {
      const early = createInitialState();
      early.day = 1;
      const mid = createInitialState();
      mid.day = 28;

      const earlyContract = generateContract(early, "grayhaven");
      const midContract = generateContract(mid, "grayhaven");

      expect(runPhaseForDay(early.day).id).toBe("early");
      expect(contractPacingForDay(early.day).label).toBe("starter run");
      expect(contractPacingLabel(early, earlyContract)).toBe("starter run");
      expect(earlyContract.units).toBeLessThan(midContract.units);
      expect(earlyContract.deadline - early.day).toBeGreaterThan(routeDays(early, earlyContract.originPortId, earlyContract.destinationPortId) + 5);

      expect(runPhaseForDay(mid.day).id).toBe("mid");
      expect(contractPacingForDay(mid.day).label).toBe("upgrade stake");
      expect(contractPacingLabel(mid, midContract)).toBe("upgrade stake");
      expect(midContract.reward).toBeGreaterThan(earlyContract.reward);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("guarantees a late-game gamble contract when the board refreshes", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    try {
      const state = createInitialState();
      state.day = 48;
      state.currentPort = "grayhaven";
      state.contracts = [];

      const refreshed = refreshContracts(state);
      const gamble = refreshed.find((contract) => isLateGambleContract({ ...state, contracts: refreshed }, contract));
      const direct = generateLateGambleContract(state, "grayhaven");

      expect(runPhaseForDay(state.day).id).toBe("late");
      expect(gamble).toBeTruthy();
      expect(gamble && contractPacingLabel({ ...state, contracts: refreshed }, gamble)).toBe("late gamble");
      expect(direct.deadline - state.day).toBe(routeDays(state, direct.originPortId, direct.destinationPortId) + 2);
      expect(direct.reward).toBeGreaterThan(direct.penalty);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("surfaces an upgrade target when the run enters the mid-game window", () => {
    const state = createInitialState();
    state.day = 24;
    state.cash = 2100;
    state.currentPort = "grayhaven";
    state.ownedShips = ["coastal_sloop"];
    state.equipment = [];

    const target = nextUpgradeTiming(state);

    expect(runPhaseForDay(state.day).label).toBe("Upgrade Window");
    expect(target?.name).toBe("Ledger Brig");
    expect(target?.kind).toBe("ship");
    expect(target?.gap).toBeGreaterThan(0);
    expect(target?.label).toBe("Upgrade target");
  });

  it("can accept a local contract and plot its destination", () => {
    let state = createInitialState();
    const contract = state.contracts.find((entry) => entry.originPortId === state.currentPort && entry.status === "available");
    expect(contract).toBeTruthy();
    state = reduceGame(state, { type: "acceptContract", contractId: contract!.id });
    const accepted = state.contracts.find((entry) => entry.id === contract!.id);
    expect(accepted?.status).toBe("active");
    expect(state.selectedPort).toBe(contract!.destinationPortId);
  });

  it("accepts plotted route contracts without leaving the route-first surface", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "glassport";
    state.tab = "market";
    state.contracts = [
      {
        id: "route-offer",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: 10,
        reward: 320,
        penalty: 120,
        status: "available",
      },
    ];

    state = reduceGame(state, { type: "acceptContract", contractId: "route-offer", source: "route" });

    expect(state.contracts[0].status).toBe("active");
    expect(state.selectedPort).toBe("glassport");
    expect(state.tab).toBe("market");
  });

  it("summarizes active contract pressure for the map and desk", () => {
    let state = createInitialState();
    const contract = state.contracts.find((entry) => entry.originPortId === state.currentPort && entry.status === "available")!;
    state = reduceGame(state, { type: "acceptContract", contractId: contract.id });
    const active = activeContracts(state)[0];

    expect(active.id).toBe(contract.id);
    expect(contractCargoStatus(state, active).missing).toBe(active.units);
    expect(contractPressureLabel(state, active)).toBe(`need ${active.units}`);

    active.deadline = state.day + 2;
    expect(contractUrgency(state, active)).toBe("urgent");

    state.currentPort = active.destinationPortId;
    state.cargo[active.goodId] = active.units;
    expect(contractCargoStatus(state, active).ready).toBe(true);
    expect(contractPressureLabel(state, active)).toBe("ready");
  });

  it("loads only the missing cargo for an active contract", () => {
    let state = createInitialState();
    state.cash = 1000;
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    state.market.grayhaven.tea = 30;
    state.marketStock.grayhaven.tea = 9;
    state.contracts = [
      {
        id: "focused-tea",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: 10,
        reward: 320,
        penalty: 140,
        status: "active",
        acceptedDay: 1,
      },
    ];

    const beforeCash = state.cash;
    state = reduceGame(state, { type: "buyContractCargo", contractId: "focused-tea" });

    const active = state.contracts.find((contract) => contract.id === "focused-tea")!;
    expect(state.cargo.tea).toBe(2);
    expect(contractPlanSummary(state, active).status).toBe("in-transit");
    expect(state.cash).toBeLessThan(beforeCash);
    expect(state.marketStock.grayhaven.tea).toBe(7);
    expect(state.log[0].text).toContain("job cargo ready");

    const afterExactLoad = state;
    state = reduceGame(state, { type: "buyContractCargo", contractId: "focused-tea" });
    expect(state.cargo.tea).toBe(2);
    expect(state.cash).toBe(afterExactLoad.cash);
  });

  it("generates visible v2 contract variants", () => {
    const randomSpy = vi.spyOn(Math, "random");
    try {
      const escortState = createInitialState();
      escortState.day = 24;
      randomSpy.mockReset();
      randomSpy
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.4)
        .mockReturnValueOnce(0.4)
        .mockReturnValue(0.4);
      const escort = generateContract(escortState, "grayhaven");
      expect(escort.kind).toBe("escort");
      expect(contractKindLabel(escort)).toBe("escort");
      expect(escort.routeRiskModifier).toBeLessThan(0);

      const smugglingState = createInitialState();
      smugglingState.day = 24;
      randomSpy.mockReset();
      randomSpy
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.42)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.4)
        .mockReturnValueOnce(0.4)
        .mockReturnValue(0.4);
      const smuggling = generateContract(smugglingState, "grayhaven");
      expect(smuggling.kind).toBe("smuggling");
      expect(contractKindLabel(smuggling)).toBe("gray cargo");
      expect(smuggling.inspectionRisk).toBeGreaterThan(0);
      expect(smuggling.smugglingFine).toBeGreaterThan(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("supports multi-stop and partial contract delivery outcomes", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.cash = 100;
    state.contracts = [
      {
        id: "multi-test",
        kind: "multi_stop",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 3,
        deadline: 12,
        reward: 300,
        penalty: 120,
        status: "active",
        stops: [
          { portId: "saffron", goodId: "tea", units: 1, delivered: 0, reward: 100 },
          { portId: "glassport", goodId: "spice", units: 2, delivered: 0, reward: 200 },
        ],
      },
    ];

    state.currentPort = "saffron";
    state.cargo.tea = 1;
    state = reduceGame(state, { type: "completeContract", contractId: "multi-test" });
    const partial = state.contracts.find((contract) => contract.id === "multi-test")!;
    expect(partial.status).toBe("active");
    expect(contractStops(partial)[0].delivered).toBe(1);
    expect(partial.paidReward).toBeGreaterThan(0);
    expect(state.cash).toBeGreaterThan(100);
    expect(state.selectedPort).toBe("glassport");
    expect(state.log.some((entry) => entry.text.includes("Partial delivery"))).toBe(true);

    state.currentPort = "glassport";
    state.cargo.spice = 2;
    state = reduceGame(state, { type: "completeContract", contractId: "multi-test" });
    const completed = state.contracts.find((contract) => contract.id === "multi-test")!;
    expect(completed.status).toBe("completed");
    expect(completed.paidReward).toBe(300);
    expect(contractRouteSummary(completed)).toContain("Glassport");
  });

  it("lets escort and smuggling contracts modify route risk", () => {
    const escort = createInitialState();
    escort.currentPort = "grayhaven";
    escort.selectedPort = "saffron";
    escort.contracts = [
      {
        id: "escort-test",
        kind: "escort",
        originPortId: "grayhaven",
        destinationPortId: "saffron",
        factionId: "freeports",
        goodId: "tools",
        units: 1,
        deadline: 9,
        reward: 120,
        penalty: 40,
        routeRiskModifier: -0.08,
        status: "active",
      },
    ];
    const neutral = { ...escort, contracts: [] };

    const smuggling = createInitialState();
    smuggling.currentPort = "grayhaven";
    smuggling.selectedPort = "saffron";
    smuggling.contracts = [
      {
        id: "smuggling-test",
        kind: "smuggling",
        originPortId: "grayhaven",
        destinationPortId: "saffron",
        factionId: "freeports",
        goodId: "tools",
        units: 1,
        deadline: 9,
        reward: 180,
        penalty: 90,
        inspectionRisk: 0.18,
        smugglingFine: 130,
        status: "active",
      },
    ];

    expect(routeRisk(escort, "grayhaven", "saffron")).toBeLessThan(routeRisk(neutral, "grayhaven", "saffron"));
    expect(routeRisk(smuggling, "grayhaven", "saffron")).toBeGreaterThan(routeRisk(neutral, "grayhaven", "saffron"));
  });

  it("migrates v2 contract fields through damaged saves", () => {
    const loaded = reduceGame(createInitialState(), {
      type: "load",
      state: {
        contracts: [
          {
            id: "saved-v2",
            kind: "smuggling",
            originPortId: "grayhaven",
            destinationPortId: "saffron",
            factionId: "freeports",
            goodId: "tools",
            units: 2,
            deliveredUnits: 1,
            paidReward: 75,
            deadline: 9,
            reward: 200,
            penalty: 100,
            inspectionRisk: 0.2,
            smugglingFine: 140,
            status: "active",
            stops: [{ portId: "saffron", goodId: "tools", units: 2, delivered: 1, reward: 200 }],
          },
        ],
      },
    });

    const contract = loaded.contracts.find((entry) => entry.id === "saved-v2");
    expect(contract?.kind).toBe("smuggling");
    expect(contract?.inspectionRisk).toBe(0.2);
    expect(contract?.smugglingFine).toBe(140);
    expect(contract?.paidReward).toBe(75);
    expect(contract && contractStops(contract)[0].delivered).toBe(1);
  });

  it("uses permits to unlock restricted market access and soften port services", () => {
    let state = createNeutralPriceState();
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    state.cash = 1200;
    state.hull = 70;
    state.factionStanding.charter = -12;
    state.marketStock.grayhaven.tea = 5;

    const restricted = marketAccessForGood(state, "grayhaven", "tea");
    const repairBefore = repairCostFor(state);
    const dockBefore = dockFeeFor(state);
    state = reduceGame(state, { type: "buyGood", goodId: "tea" });
    expect(restricted.allowed).toBe(false);
    expect(state.cargo.tea ?? 0).toBe(0);
    expect(state.cash).toBe(1200);

    state = reduceGame(state, { type: "buyMarketPermit" });
    const permitted = marketAccessForGood(state, "grayhaven", "tea");
    expect(permitted.allowed).toBe(true);
    expect(repairCostFor(state)).toBeLessThan(repairBefore);
    expect(dockFeeFor(state)).toBeLessThan(dockBefore);

    state = reduceGame(state, { type: "buyGood", goodId: "tea" });
    expect(state.cargo.tea).toBe(1);
  });

  it("makes faction standing change contract board quality", () => {
    const neutral = createNeutralPriceState();
    neutral.day = 24;

    const trusted = createNeutralPriceState();
    trusted.day = 24;
    trusted.factionStanding.freeports = 20;

    const sanctioned = createNeutralPriceState();
    sanctioned.day = 24;
    sanctioned.factionStanding.freeports = -12;

    expect(contractQualityForStanding(20).label).toBe("patron board");
    expect(contractQualityForStanding(-12).label).toBe("restricted board");

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.18);
    try {
      const trustedContract = generateContract(trusted, "grayhaven");
      const neutralContract = generateContract(neutral, "grayhaven");
      const sanctionedContract = generateContract(sanctioned, "grayhaven");
      expect(trustedContract.units).toBeGreaterThanOrEqual(neutralContract.units);
      expect(trustedContract.reward).toBeGreaterThan(neutralContract.reward);
      expect(sanctionedContract.reward).toBeLessThan(neutralContract.reward);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("makes permits, trusted standing, and quiet sailing reduce customs inspection pressure", () => {
    const makeInspectionRun = (standing: number, permit: boolean, sailPlan: GameState["sailPlan"] = "balanced") => {
      const state = createInitialState();
      state.currentPort = "grayhaven";
      state.selectedPort = "stormhook";
      state.sailPlan = sailPlan;
      state.factionStanding.admiralty = standing;
      state.cargo.spice = 2;
      state.cargoBasis.spice = 50;
      state.politicalEvents = [
        {
          id: "inspection-pressure",
          factionId: "admiralty",
          kind: "inspection",
          goodId: "spice",
          riskModifier: 0.05,
          priceModifier: 1.08,
          expires: 8,
          text: "Admiralty inspectors are searching Spice holds.",
        },
        ...(permit
          ? [
              {
                id: "permit-pressure",
                factionId: "admiralty",
                kind: "permit" as const,
                riskModifier: 0,
                priceModifier: 0.92,
                expires: 8,
                text: "Admiralty Court honored a market permit.",
              },
            ]
          : []),
      ];
      state.voyage = {
        fromId: "grayhaven",
        toId: "stormhook",
        days: 1,
        risk: 0,
        sailPlan,
        progress: 0.99,
        duration: 1,
      };
      return state;
    };

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.32);
    try {
      const watched = reduceGame(makeInspectionRun(-12, false), { type: "tickVoyage", dt: 1 });
      const quiet = reduceGame(makeInspectionRun(-12, false, "quiet"), { type: "tickVoyage", dt: 1 });
      const trusted = reduceGame(makeInspectionRun(20, true), { type: "tickVoyage", dt: 1 });
      expect(watched.encounter?.kind).toBe("inspection");
      expect(quiet.encounter).toBeNull();
      expect(quiet.currentPort).toBe("stormhook");
      expect(trusted.encounter).toBeNull();
      expect(trusted.currentPort).toBe("stormhook");
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lets a port authority permit lower faction market prices", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    state.cash = 1000;
    const permitCost = politicalActionCost(politicalActionCosts.permitCash, 0, "permit");
    const before = priceFor(state, "grayhaven", "iron");
    state = reduceGame(state, { type: "buyMarketPermit" });
    const after = priceFor(state, "grayhaven", "iron");

    expect(state.cash).toBe(1000 - permitCost);
    expect(state.politicalEvents[0].kind).toBe("permit");
    expect(state.politicalEvents[0].factionId).toBe("charter");
    expect(after).toBeLessThan(before);
  });

  it("lets Customs Ledger find cheaper permit clauses", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    state.cash = 1000;
    state.equipment = ["customs_ledger"];
    const permitCost = politicalActionCost(politicalActionCosts.permitCash, 0, "permit");
    const ledgerCost = Math.max(20, Math.round((permitCost * 0.84) / 10) * 10);

    state = reduceGame(state, { type: "buyMarketPermit" });

    expect(state.cash).toBe(1000 - ledgerCost);
    expect(ledgerCost).toBeLessThan(permitCost);
    expect(state.log[0].text).toContain("Customs Ledger");
  });

  it("lets trusted Charter standing buy a cheaper letter of credit", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.cash = 200;
    state.debt = 500;
    state.factionStanding.charter = 7;

    const quote = factionFavorQuoteFor(state)!;
    state = reduceGame(state, { type: "callFactionFavor" });

    expect(quote.kind).toBe("ledger_credit");
    expect(state.cash).toBe(200 - quote.cost + 520);
    expect(state.debt).toBe(1040);
    expect(state.factionStanding.charter).toBeCloseTo(7 - quote.standingCost, 3);
    expect(state.log[0].text).toContain("Ledger Credit");
  });

  it("lets faction favors create distinct route and stock advantages", () => {
    let admiralty = createInitialState();
    admiralty.currentPort = "stormhook";
    admiralty.selectedPort = "grayhaven";
    admiralty.cash = 1000;
    admiralty.factionStanding.admiralty = 8;
    const riskBefore = routeRisk(admiralty, "stormhook", "grayhaven");
    admiralty = reduceGame(admiralty, { type: "callFactionFavor" });
    const riskAfter = routeRisk(admiralty, "stormhook", "grayhaven");

    expect(admiralty.politicalEvents[0]).toMatchObject({
      factionId: "admiralty",
      kind: "convoy",
      riskModifier: -0.18,
    });
    expect(riskAfter).toBeLessThan(riskBefore);
    expect(admiralty.log[0].text).toContain("Patrol Cover");

    let league = createInitialState();
    league.currentPort = "lowmarket";
    league.cash = 1000;
    league.factionStanding.league = 8;
    league.marketStock.lowmarket.tools = 1;
    league.marketStock.lowmarket.tea = 1;
    league = reduceGame(league, { type: "callFactionFavor" });

    expect(league.marketStock.lowmarket.tools).toBeGreaterThan(1);
    expect(league.marketStock.lowmarket.tea).toBeGreaterThan(1);
    expect(league.politicalEvents[0]).toMatchObject({
      factionId: "league",
      kind: "permit",
      priceModifier: 0.94,
    });
    expect(league.log[0].text).toContain("Stevedore Shift");
  });

  it("commissions broker packets that create a timed market edge", () => {
    let state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.currentPort = "grayhaven";
    state.selectedPort = "saffron";
    state.cash = 1000;
    state.captainSkills.brokerage = 2;
    state.market.grayhaven.iron = 34;
    state.market.saffron.iron = 130;
    state.marketStock.grayhaven.iron = 10;
    state.marketStock.saffron.iron = 1;

    const quote = brokerPacketQuoteFor(state)!;
    const stockBefore = state.marketStock[quote.portId][quote.goodId];
    const cashBefore = state.cash;

    state = reduceGame(state, { type: "commissionBrokerPacket" });

    expect(state.cash).toBe(cashBefore - quote.cost);
    expect(state.tab).toBe("intel");
    expect(state.events[0]).toMatchObject({
      portId: quote.portId,
      goodId: quote.goodId,
      kind: quote.rumorKind,
      expires: quote.expires,
    });
    if (quote.stockDelta < 0) expect(state.marketStock[quote.portId][quote.goodId]).toBeLessThan(stockBefore);
    if (quote.stockDelta > 0) expect(state.marketStock[quote.portId][quote.goodId]).toBeGreaterThan(stockBefore);
    expect(state.log.some((entry) => entry.text.includes("Broker Packet"))).toBe(true);
  });

  it("lets Brokerage mastery turn broker packets into stronger market moves", () => {
    const makeBrokerState = (level: 2 | 3) => {
      const state = createInitialState();
      state.events = [];
      state.politicalEvents = [];
      state.currentPort = "grayhaven";
      state.selectedPort = "saffron";
      state.cash = 1000;
      state.captainSkills.brokerage = level;
      state.market.grayhaven.iron = 34;
      state.market.saffron.iron = 130;
      state.marketStock.grayhaven.iron = 10;
      state.marketStock.saffron.iron = 1;
      return state;
    };

    const ordinary = brokerPacketQuoteFor(makeBrokerState(2))!;
    const mastered = brokerPacketQuoteFor(makeBrokerState(3))!;

    expect(hasCaptainSkillMastery(makeBrokerState(3), "brokerage")).toBe(true);
    expect(mastered.cost).toBeLessThan(ordinary.cost);
    expect(Math.abs(mastered.stockDelta)).toBeGreaterThan(Math.abs(ordinary.stockDelta));
    expect(mastered.expires).toBeGreaterThanOrEqual(ordinary.expires);
    expect(mastered.detail).toContain("market maker");
  });

  it("lets standing buy a convoy writ that lowers route risk", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "glassport";
    state.cash = 1000;
    state.factionStanding.charter = 4;
    const convoyCost = politicalActionCost(politicalActionCosts.convoyCash, state.factionStanding.charter, "convoy");
    const before = routeRisk(state, "grayhaven", "glassport");
    state = reduceGame(state, { type: "requestConvoy" });
    const after = routeRisk(state, "grayhaven", "glassport");

    expect(state.cash).toBe(1000 - convoyCost);
    expect(state.factionStanding.charter).toBeCloseTo(4 - politicalActionCosts.convoyStanding);
    expect(state.politicalEvents[0].kind).toBe("convoy");
    expect(after).toBeLessThan(before);
  });

  it("turns faction standing tiers into prices, rewards, action costs, and route pressure", () => {
    const neutral = createNeutralPriceState();
    neutral.currentPort = "grayhaven";
    neutral.selectedPort = "glassport";
    neutral.cash = 1000;

    const trusted = createNeutralPriceState();
    trusted.currentPort = "grayhaven";
    trusted.selectedPort = "glassport";
    trusted.factionStanding = Object.fromEntries(Object.keys(trusted.factionStanding).map((id) => [id, 20]));

    const sanctioned = createNeutralPriceState();
    sanctioned.currentPort = "grayhaven";
    sanctioned.selectedPort = "glassport";
    sanctioned.factionStanding = Object.fromEntries(Object.keys(sanctioned.factionStanding).map((id) => [id, -12]));

    expect(standingBenefits(trusted.factionStanding.charter).contractRewardModifier).toBeGreaterThan(1);
    expect(priceFor(trusted, "grayhaven", "iron")).toBeLessThan(priceFor(neutral, "grayhaven", "iron"));
    expect(priceFor(sanctioned, "grayhaven", "iron")).toBeGreaterThan(priceFor(neutral, "grayhaven", "iron"));
    expect(routeRisk(trusted, "grayhaven", "glassport")).toBeLessThan(routeRisk(neutral, "grayhaven", "glassport"));
    expect(routeRisk(sanctioned, "grayhaven", "glassport")).toBeGreaterThan(routeRisk(neutral, "grayhaven", "glassport"));
    expect(politicalActionCost(politicalActionCosts.permitCash, trusted.factionStanding.charter, "permit")).toBeLessThan(
      politicalActionCosts.permitCash
    );

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    try {
      expect(generateContract(trusted, "grayhaven").reward).toBeGreaterThan(generateContract(neutral, "grayhaven").reward);
      expect(generateContract(sanctioned, "grayhaven").reward).toBeLessThan(generateContract(neutral, "grayhaven").reward);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("completes a contract at its destination when cargo is aboard", () => {
    let state = createInitialState();
    const contract = state.contracts.find((entry) => entry.originPortId === state.currentPort && entry.status === "available")!;
    state = reduceGame(state, { type: "acceptContract", contractId: contract.id });
    state.currentPort = contract.destinationPortId;
    state.selectedPort = contract.destinationPortId;
    state.cargo[contract.goodId] = contract.units;
    state.cargoBasis[contract.goodId] = 42;
    const cashBefore = state.cash;
    state.skillPoints = 0;
    state.captainXp = 0;
    state.captainXpTarget = 35;
    const targetBefore = state.captainXpTarget;
    state = reduceGame(state, { type: "completeContract", contractId: contract.id });
    const completed = state.contracts.find((entry) => entry.id === contract.id);
    expect(completed?.status).toBe("completed");
    expect(state.cargo[contract.goodId] ?? 0).toBe(0);
    expect(state.cargoBasis[contract.goodId]).toBeUndefined();
    expect(state.cash).toBe(cashBefore + contract.reward);
    expect(state.skillPoints).toBeGreaterThanOrEqual(1);
    expect(state.captainXpTarget).toBeGreaterThan(targetBefore);
    expect(state.log.some((entry) => entry.text.includes("Contract work"))).toBe(true);
  });

  it("fails overdue active contracts and applies a penalty", () => {
    let state = createInitialState();
    const contract = state.contracts.find((entry) => entry.originPortId === state.currentPort && entry.status === "available")!;
    state = reduceGame(state, { type: "acceptContract", contractId: contract.id });
    const active = state.contracts.find((entry) => entry.id === contract.id)!;
    active.deadline = state.day;
    state.voyage = {
      fromId: state.currentPort,
      toId: active.destinationPortId,
      days: 1,
      risk: 0,
      progress: 0.99,
      duration: 1,
    };
    const cashBefore = state.cash;
    state = reduceGame(state, { type: "tickVoyage", dt: 1 });
    const failed = state.contracts.find((entry) => entry.id === contract.id);
    expect(failed?.status).toBe("failed");
    expect(state.cash).toBeLessThan(cashBefore);
  });

  it("waiting can burn contract deadlines", () => {
    let state = createInitialState();
    state.cash = 1000;
    const contract = state.contracts.find((entry) => entry.originPortId === state.currentPort && entry.status === "available")!;
    state = reduceGame(state, { type: "acceptContract", contractId: contract.id });
    const active = state.contracts.find((entry) => entry.id === contract.id)!;
    active.deadline = state.day;

    state = reduceGame(state, { type: "waitDay" });

    const failed = state.contracts.find((entry) => entry.id === contract.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.failedDay).toBe(2);
    expect(state.log.some((entry) => entry.text.includes("Penalty"))).toBe(true);
  });

  it("completes a chain stage and posts the next named stage at the arrival port", () => {
    let state = createInitialState();
    state.contracts = [];
    state.currentPort = "grayhaven";
    state.selectedPort = "grayhaven";
    const offer = createNextContractChainOffer(state, "grayhaven", "charter_audit")!;

    state.contracts = [offer];
    state = reduceGame(state, { type: "acceptContract", contractId: offer.id });
    const active = state.contracts.find((entry) => entry.id === offer.id)!;
    state.currentPort = active.destinationPortId;
    state.selectedPort = active.destinationPortId;
    state.cargo[active.goodId] = active.units;
    state.cargoBasis[active.goodId] = 1;

    state = reduceGame(state, { type: "completeContract", contractId: active.id });

    expect(state.contracts.find((entry) => entry.id === active.id)?.status).toBe("completed");
    const followUp = state.contracts.find((entry) => entry.chain?.id === "charter_audit" && entry.status === "available");
    expect(followUp?.chain).toMatchObject({
      giver: "Maribel Quill",
      title: "Ledger Audit",
      stage: 2,
    });
    expect(followUp?.originPortId).toBe("glassport");
    expect(state.log.some((entry) => entry.text.includes("Maribel Quill") && entry.text.includes("next Ledger Audit stage"))).toBe(true);
  });

  it("pays final chain bonuses and installs the promised political reward", () => {
    let state = createInitialState();
    state.contracts = [];
    const first = createNextContractChainOffer(state, "stormhook", "admiralty_convoy")!;
    const completedFirst: Contract = { ...first, status: "completed", completedDay: state.day };
    const second = createNextContractChainOffer({ ...state, contracts: [completedFirst] }, "grayhaven", "admiralty_convoy")!;
    const completedSecond: Contract = { ...second, status: "completed", completedDay: state.day + 1 };
    const final = createNextContractChainOffer(
      { ...state, contracts: [completedFirst, completedSecond] },
      "stormhook",
      "admiralty_convoy"
    )!;
    const activeFinal: Contract = { ...final, status: "active", acceptedDay: state.day };
    const cashBefore = state.cash;
    const standingBefore = state.factionStanding.admiralty;

    state.currentPort = activeFinal.destinationPortId;
    state.selectedPort = activeFinal.destinationPortId;
    state.contracts = [completedFirst, completedSecond, activeFinal];
    state.cargo[activeFinal.goodId] = activeFinal.units;
    state.cargoBasis[activeFinal.goodId] = 1;

    state = reduceGame(state, { type: "completeContract", contractId: activeFinal.id });

    expect(state.contracts.find((entry) => entry.id === activeFinal.id)?.status).toBe("completed");
    expect(state.cash).toBeGreaterThanOrEqual(cashBefore + activeFinal.reward + (activeFinal.chain?.rewardCash ?? 0));
    expect(state.factionStanding.admiralty).toBeGreaterThan(standingBefore + 5);
    expect(state.politicalEvents.some((event) => event.factionId === "admiralty" && event.kind === "convoy")).toBe(true);
    expect(state.log.some((entry) => entry.text.includes("Admiralty convoy writ"))).toBe(true);
  });

  it("fails overdue chain contracts with the named failure story and extra standing penalty", () => {
    let state = createInitialState();
    state.contracts = [];
    state.cash = 1000;
    state.currentPort = "grayhaven";
    const offer = createNextContractChainOffer(state, "grayhaven", "charter_audit")!;
    const active: Contract = { ...offer, status: "active", acceptedDay: state.day, deadline: state.day };
    const standingBefore = state.factionStanding.charter;
    state.contracts = [active];

    state = reduceGame(state, { type: "waitDay" });

    const failed = state.contracts.find((entry) => entry.id === active.id);
    expect(failed?.status).toBe("failed");
    expect(state.factionStanding.charter).toBeLessThan(standingBefore - 2);
    expect(state.log.some((entry) => entry.text.includes("Maribel Quill") && entry.text.includes("audit collapsed"))).toBe(true);
  });
});

function createNeutralPriceState(day = 1) {
  const state = createInitialState();
  state.day = day;
  state.events = [];
  state.politicalEvents = [];
  state.factionStanding = Object.fromEntries(Object.keys(state.factionStanding).map((id) => [id, 0]));
  state.marketStock = normalizeMarketStock();
  for (const good of goods) {
    state.trends[good.id] = { direction: 1, momentum: 0, label: "flat test", expires: 99 };
    for (const port of ports) {
      state.market[port.id][good.id] = 500;
    }
  }
  return state;
}

function expectCoreInvariants(state: GameState) {
  const stats = deriveShipStats(state);
  const goodIds = new Set(goods.map((good) => good.id));
  const portIds = new Set(ports.map((port) => port.id));
  const factionIds = new Set(factions.map((faction) => faction.id));
  const crewIds = new Set(crewCatalog.map((crew) => crew.id));
  const shipIds = new Set(shipCatalog.map((ship) => ship.id));
  const equipmentIds = new Set(equipmentCatalog.map((item) => item.id));

  expect(Number.isFinite(state.cash)).toBe(true);
  expect(Number.isFinite(state.debt)).toBe(true);
  expect(state.cash).toBeGreaterThanOrEqual(0);
  expect(state.debt).toBeGreaterThanOrEqual(0);
  expect(state.hull).toBeGreaterThanOrEqual(0);
  expect(state.hull).toBeLessThanOrEqual(stats.hullMax);
  expect(state.crewMorale).toBeGreaterThanOrEqual(0);
  expect(state.crewMorale).toBeLessThanOrEqual(100);

  expect(shipIds.has(state.currentShip)).toBe(true);
  expect(state.ownedShips.length).toBe(new Set(state.ownedShips).size);
  expect(state.ownedShips.every((id) => shipIds.has(id))).toBe(true);
  expect(state.ownedShips).toContain(state.currentShip);
  expect(state.equipment.every((id) => equipmentIds.has(id))).toBe(true);

  expect(state.crew.length).toBe(new Set(state.crew).size);
  expect(state.crew.every((id) => crewIds.has(id))).toBe(true);
  expect(state.crew.length).toBeLessThanOrEqual(stats.crewCap);
  expect(Object.keys(state.crewXp).sort()).toEqual([...state.crew].sort());
  expect(Object.values(state.crewXp).every((xp) => Number.isFinite(xp) && xp >= 0)).toBe(true);

  expect(cargoUnits(state)).toBeLessThanOrEqual(stats.cargoCap);
  for (const [goodId, quantity] of Object.entries(state.cargo)) {
    expect(goodIds.has(goodId)).toBe(true);
    expect(Number.isInteger(quantity)).toBe(true);
    expect(quantity).toBeGreaterThan(0);
  }
  for (const [goodId, basis] of Object.entries(state.cargoBasis)) {
    expect(state.cargo[goodId]).toBeGreaterThan(0);
    expect(Number.isFinite(basis)).toBe(true);
    expect(basis).toBeGreaterThan(0);
  }

  expect(Object.keys(state.factionStanding).sort()).toEqual([...factionIds].sort());
  for (const standing of Object.values(state.factionStanding)) {
    expect(Number.isFinite(standing)).toBe(true);
    expect(standing).toBeGreaterThanOrEqual(-100);
    expect(standing).toBeLessThanOrEqual(100);
  }

  for (const event of state.politicalEvents) {
    expect(factionIds.has(event.factionId)).toBe(true);
    expect(event.expires).toBeGreaterThanOrEqual(state.day);
    expect(event.priceModifier).toBeGreaterThan(0);
  }

  for (const contract of state.contracts) {
    expect(portIds.has(contract.originPortId)).toBe(true);
    expect(portIds.has(contract.destinationPortId)).toBe(true);
    expect(contract.originPortId).not.toBe(contract.destinationPortId);
    expect(factionIds.has(contract.factionId)).toBe(true);
    expect(goodIds.has(contract.goodId)).toBe(true);
    expect(contract.units).toBeGreaterThan(0);
    expect(contract.reward).toBeGreaterThanOrEqual(0);
    expect(contract.penalty).toBeGreaterThanOrEqual(0);
    if (contract.status === "active") expect(contract.deadline).toBeGreaterThanOrEqual(state.day);
  }

  if (state.cargoInsurance) {
    expect(portIds.has(state.cargoInsurance.originPortId)).toBe(true);
    expect(portIds.has(state.cargoInsurance.destinationPortId)).toBe(true);
    expect(state.cargoInsurance.originPortId).not.toBe(state.cargoInsurance.destinationPortId);
    expect(state.cargoInsurance.coveredValue).toBeGreaterThan(0);
    expect(state.cargoInsurance.remainingCoverage).toBeGreaterThan(0);
    expect(state.cargoInsurance.remainingCoverage).toBeLessThanOrEqual(state.cargoInsurance.coveredValue);
    expect(state.cargoInsurance.expiresDay).toBeGreaterThanOrEqual(state.day);
    expect(cargoUnits(state)).toBeGreaterThan(0);
  }

  if (state.voyage) {
    if (state.encounter) expect(state.encounter.kind).toBe("sea");
    expect(portIds.has(state.voyage.fromId)).toBe(true);
    expect(portIds.has(state.voyage.toId)).toBe(true);
    expect(state.voyage.fromId).not.toBe(state.voyage.toId);
    expect(state.voyage.progress).toBeGreaterThanOrEqual(0);
    expect(state.voyage.progress).toBeLessThan(1);
    expect(state.voyage.duration).toBeGreaterThan(0);
    expect(state.voyage.risk).toBeGreaterThanOrEqual(0);
    expect(state.voyage.risk).toBeLessThanOrEqual(1);
  }

  if (state.encounter) {
    if (state.encounter.kind === "sea") expect(state.voyage).toBeTruthy();
    else expect(state.voyage).toBeNull();
    expect(state.pendingArrival === null || portIds.has(state.pendingArrival)).toBe(true);
  }

  if (state.gameOver) {
    expect(state.voyage).toBeNull();
    expect(state.encounter).toBeNull();
    expect(state.pendingArrival).toBeNull();
  }
}

function seedReadableTradeMarket(state: GameState) {
  state.events = [];
  state.politicalEvents = [];
  for (const good of goods) {
    state.trends[good.id] = { direction: 1, momentum: 0, label: "flat test", expires: 99 };
    for (const port of ports) {
      const exportsGood = port.exports.includes(good.id);
      const importsGood = port.imports.includes(good.id);
      state.market[port.id][good.id] = Math.round(good.base * (exportsGood ? 0.64 : importsGood ? 1.46 : 1));
      const capacity = marketStockCapacity(port.id, good.id);
      state.marketStock[port.id][good.id] = Math.round(capacity * (exportsGood ? 0.92 : importsGood ? 0.18 : 0.56));
    }
  }
}

function installLocalStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    },
  });
  return store;
}

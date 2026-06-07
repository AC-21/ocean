import { describe, expect, it } from "vitest";
import { ports } from "./data";
import {
  brokerPacketQuoteFor,
  freightPressureSignalFor,
  marketForecastFor,
  marketStockCapacity,
  portLogisticsPressure,
  recommendRouteChoices,
  topMarketForecasts,
  topFreightPressureSignals,
  tradeOpportunityForGood,
  tradeOpportunityReason,
} from "./economy";
import { createInitialState } from "./reducer";

describe("freight pressure intelligence", () => {
  it("turns strained import lanes into a readable market signal", () => {
    let candidate: ReturnType<typeof createInitialState> | null = null;
    let signal: ReturnType<typeof freightPressureSignalFor> | null = null;

    for (let day = 1; day <= 80 && !candidate; day += 1) {
      for (const port of ports) {
        for (const goodId of port.imports) {
          const state = createInitialState();
          state.day = day;
          state.marketStock[port.id][goodId] = 1;
          const logistics = portLogisticsPressure(state, port.id);
          const nextSignal = freightPressureSignalFor(state, port.id, goodId);
          if (logistics.pressure >= 0.34 && nextSignal.kind === "import-pressure") {
            candidate = state;
            signal = nextSignal;
            break;
          }
        }
        if (candidate) break;
      }
    }

    expect(candidate).toBeTruthy();
    expect(signal).toBeTruthy();
    expect(signal!.importDemand).toBeGreaterThan(signal!.exportSurplus);
    expect(signal!.detail).toContain("freight");
    expect(["Storm demand", "Import squeeze"]).toContain(signal!.label);
  });

  it("surfaces deep export stock as surplus the player can chase", () => {
    const state = createInitialState();
    state.trends.iron = {
      direction: -1,
      momentum: 1.1,
      label: "warehouse overflow",
      expires: state.day + 12,
    };
    state.marketStock.grayhaven.iron = marketStockCapacity("grayhaven", "iron") + 5;

    const signal = freightPressureSignalFor(state, "grayhaven", "iron");
    const topSignals = topFreightPressureSignals(state, 12);

    expect(signal.kind).toBe("export-surplus");
    expect(signal.label).toBe("Export surplus");
    expect(signal.exportSurplus).toBeGreaterThan(signal.importDemand);
    expect(signal.detail).toContain("glut");
    expect(topSignals.some((entry) => entry.portId === "grayhaven" && entry.goodId === "iron")).toBe(true);
  });

  it("feeds freight pressure into route opportunity reasons", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.events = [];
    state.marketStock.saffron.iron = 0;

    expect(freightPressureSignalFor(state, "saffron", "iron").kind).toBe("stockout");
    expect(tradeOpportunityReason(state, "iron", "grayhaven", "saffron", 120, 0.12)).toBe("stockout demand");
  });

  it("carries market tape into trade opportunities", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.events = [];
    state.politicalEvents = [];
    state.market.grayhaven.iron = 34;
    state.market.saffron.iron = 132;
    state.marketHistory.grayhaven.iron = [
      { day: 1, price: 48 },
      { day: 3, price: 34 },
    ];
    state.marketHistory.saffron.iron = [
      { day: 1, price: 96 },
      { day: 3, price: 132 },
    ];

    const opportunity = tradeOpportunityForGood(state, "iron", "grayhaven");

    expect(opportunity?.sellPortId).toBe("saffron");
    expect(opportunity?.historyBias.label).toBe("Tape edge");
    expect(opportunity?.historyBias.favorable).toBe(true);
    expect(opportunity?.reason).toBe("tape edge");
  });

  it("carries crew route reads into route recommendations", () => {
    const state = createInitialState();
    state.cash = 1400;
    state.crew = ["boatswain"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 58,
        strain: 70,
        demand: "safer_orders",
        demandExpires: state.day + 6,
      },
    };

    const choices = recommendRouteChoices(state);

    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((choice) => choice.crewRead.entries.length === 1)).toBe(true);
    expect(choices.some((choice) => choice.reason.includes("crew"))).toBe(true);
    expect(choices.some((choice) => choice.crewRead.compact.includes("Boatswain"))).toBe(true);
  });

  it("carries faction pressure into route recommendations", () => {
    const state = createInitialState();
    state.cash = 1600;
    state.currentPort = "grayhaven";
    state.factionStanding.charter = 22;

    const choices = recommendRouteChoices(state, "grayhaven");

    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((choice) => choice.politicalRead?.factionId === "charter")).toBe(true);
    expect(choices.some((choice) => choice.reason.includes("political edge"))).toBe(true);
  });

  it("explains climbing import prices from stock pressure and trend", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.saffron.iron = 0;
    state.trends.iron = {
      direction: 1,
      momentum: 1.2,
      label: "naval contracts",
      expires: state.day + 10,
    };

    const forecast = marketForecastFor(state, "saffron", "iron");

    expect(forecast.kind).toBe("climbing");
    expect(forecast.expectedPrice).toBeGreaterThan(forecast.currentPrice);
    expect(forecast.detail).toContain("+");
    expect(forecast.drivers.join(" ")).toContain("naval contracts");
    expect(forecast.drivers).toContain("thin stock");
  });

  it("marks deep exporter stock as a buy window when the broader trend is falling", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.grayhaven.iron = marketStockCapacity("grayhaven", "iron") + 5;
    state.trends.iron = {
      direction: -1,
      momentum: 1.2,
      label: "warehouse overflow",
      expires: state.day + 10,
    };

    const forecast = marketForecastFor(state, "grayhaven", "iron");
    const ranked = topMarketForecasts(state, "grayhaven", 3);

    expect(forecast.kind).toBe("buy-window");
    expect(forecast.expectedPrice).toBeLessThan(forecast.currentPrice);
    expect(forecast.drivers.join(" ")).toContain("warehouse overflow");
    expect(ranked.some((entry) => entry.goodId === "iron" && entry.kind === "buy-window")).toBe(true);
  });

  it("surfaces faction squeezes when politics and access make a quote worse", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [
      {
        id: "politics-test",
        factionId: "charter",
        kind: "tariff",
        goodId: "iron",
        riskModifier: 0.02,
        priceModifier: 1.18,
        expires: state.day + 6,
        text: "Charter Bank tightened iron tariff ledgers.",
      },
    ];

    const forecast = marketForecastFor(state, "grayhaven", "iron");

    expect(forecast.kind).toBe("squeeze");
    expect(forecast.label).toBe("Faction squeeze");
    expect(forecast.drivers).toContain("tariff");
    expect(forecast.expectedDeltaPercent).toBeGreaterThan(0);
  });

  it("prices broker packets from route or local market pressure", () => {
    const state = createInitialState();
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

    const quote = brokerPacketQuoteFor(state);

    expect(quote).toBeTruthy();
    expect(quote!.kind).toBe("destination-shortage");
    expect(quote!.rumorKind).toBe("shortage");
    expect(quote!.portId).toBe("saffron");
    expect(quote!.cost).toBeGreaterThan(40);
    expect(quote!.cost).toBeLessThan(170);
    expect(quote!.detail).toContain("buyers primed");
  });
});

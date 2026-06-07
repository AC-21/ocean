import { describe, expect, it } from "vitest";
import {
  appendMarketHistoryPrice,
  makeMarketHistory,
  marketHistoryTradeBiasFor,
  marketHistoryLimit,
  marketHistorySignalFor,
  normalizeMarketHistory,
  topMarketHistorySignals,
} from "./marketHistory";
import { makeMarket } from "./economy";

describe("market history", () => {
  it("creates a one-quote baseline for every port and good", () => {
    const market = makeMarket();
    const history = makeMarketHistory(market, 1);

    expect(history.grayhaven.tea).toHaveLength(1);
    expect(history.grayhaven.tea[0]).toMatchObject({
      day: 1,
      price: market.grayhaven.tea,
    });
  });

  it("keeps a bounded rolling quote history and labels direction", () => {
    const market = makeMarket();
    const history = makeMarketHistory(market, 1);
    for (let day = 2; day <= 14; day += 1) {
      appendMarketHistoryPrice(history, day, "grayhaven", "tea", 40 + day * 3);
    }

    const signal = marketHistorySignalFor({ market, marketHistory: history }, "grayhaven", "tea");

    expect(history.grayhaven.tea).toHaveLength(marketHistoryLimit);
    expect(history.grayhaven.tea[0].day).toBe(7);
    expect(signal.direction).toBe("up");
    expect(signal.label).toBe("Rising fast");
    expect(signal.detail).toContain("quotes");
  });

  it("normalizes missing or damaged history back to current market quotes", () => {
    const market = makeMarket();
    const history = normalizeMarketHistory(
      {
        grayhaven: {
          tea: [{ day: 2, price: 55 }, { day: "bad", price: 0 }],
        },
      },
      market,
      5
    );

    expect(history.grayhaven.tea).toEqual([{ day: 2, price: 55 }]);
    expect(history.saffron.tea).toEqual([{ day: 5, price: market.saffron.tea }]);
  });

  it("ranks the strongest moving quotes across the map", () => {
    const market = makeMarket();
    const history = makeMarketHistory(market, 1);
    history.grayhaven.iron = [
      { day: 1, price: 100 },
      { day: 4, price: 72 },
    ];
    history.saffron.tea = [
      { day: 1, price: 60 },
      { day: 4, price: 72 },
    ];

    const signals = topMarketHistorySignals({ market, marketHistory: history }, 2);

    expect(signals[0]).toMatchObject({
      portId: "grayhaven",
      goodId: "iron",
      direction: "down",
      label: "Falling fast",
    });
    expect(signals[0].score).toBeGreaterThan(signals[1].score);
  });

  it("turns buy-side dips and sell-side strength into a trade bias", () => {
    const market = makeMarket();
    const history = makeMarketHistory(market, 1);
    history.grayhaven.iron = [
      { day: 1, price: 90 },
      { day: 3, price: 72 },
    ];
    history.saffron.iron = [
      { day: 1, price: 80 },
      { day: 3, price: 96 },
    ];

    const bias = marketHistoryTradeBiasFor({ market, marketHistory: history }, "grayhaven", "saffron", "iron");

    expect(bias.label).toBe("Tape edge");
    expect(bias.favorable).toBe(true);
    expect(bias.score).toBeGreaterThan(20);
    expect(bias.detail).toContain("Grayhaven");
    expect(bias.detail).toContain("Saffron");
  });
});

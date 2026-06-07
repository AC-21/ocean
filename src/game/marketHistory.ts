import { goods, ports } from "./data";
import { money } from "./math";
import type { GameState, Market, MarketPriceHistory, MarketPricePoint } from "./types";

export const marketHistoryLimit = 8;

export type MarketHistorySignal = {
  detail: string;
  direction: "up" | "down" | "flat" | "new";
  firstPrice: number;
  label: string;
  lastPrice: number;
  percent: number;
  sampleCount: number;
};

export type MarketHistoryMovementSignal = MarketHistorySignal & {
  goodId: string;
  portId: string;
  score: number;
};

export type MarketHistoryTradeBias = {
  buySignal: MarketHistorySignal;
  detail: string;
  favorable: boolean;
  label: string;
  score: number;
  sellSignal: MarketHistorySignal;
};

export function makeMarketHistory(market: Market, day: number): MarketPriceHistory {
  const history = emptyMarketHistory();
  for (const port of ports) {
    for (const good of goods) {
      history[port.id][good.id] = [marketPricePoint(day, market[port.id]?.[good.id] ?? good.base)];
    }
  }
  return history;
}

export function normalizeMarketHistory(value: unknown, market: Market, day: number): MarketPriceHistory {
  const source = isRecord(value) ? value : {};
  const history = emptyMarketHistory();
  for (const port of ports) {
    const portValue = source[port.id];
    const portHistory = isRecord(portValue) ? portValue : {};
    for (const good of goods) {
      const rawHistoryValue = portHistory[good.id];
      const rawEntries: unknown[] = Array.isArray(rawHistoryValue) ? rawHistoryValue : [];
      const entries = rawEntries.flatMap((entry): MarketPricePoint[] => {
        if (!isRecord(entry)) return [];
        const entryDay = Math.round(Number(entry.day));
        const price = Math.round(Number(entry.price));
        if (!Number.isFinite(entryDay) || !Number.isFinite(price) || entryDay < 1 || price < 1) return [];
        return [{ day: Math.min(Math.max(1, entryDay), day), price: Math.max(1, price) }];
      });
      history[port.id][good.id] = coalesceMarketHistoryEntries(entries.length ? entries : [marketPricePoint(day, market[port.id]?.[good.id] ?? good.base)]);
    }
  }
  return history;
}

export function appendMarketHistoryPrice(history: MarketPriceHistory, day: number, portId: string, goodId: string, price: number) {
  history[portId] ??= {};
  const entries = history[portId][goodId] ?? [];
  history[portId][goodId] = coalesceMarketHistoryEntries([...entries, marketPricePoint(day, price)]);
}

export function marketHistoryEntriesFor(state: Pick<GameState, "market" | "marketHistory">, portId: string, goodId: string) {
  const good = goods.find((entry) => entry.id === goodId);
  const fallback = good ? [marketPricePoint(1, state.market[portId]?.[goodId] ?? good.base)] : [];
  return coalesceMarketHistoryEntries(state.marketHistory?.[portId]?.[goodId] ?? fallback);
}

export function marketHistorySignalFor(state: Pick<GameState, "market" | "marketHistory">, portId: string, goodId: string): MarketHistorySignal {
  const entries = marketHistoryEntriesFor(state, portId, goodId);
  const last = entries[entries.length - 1] ?? marketPricePoint(1, state.market[portId]?.[goodId] ?? 1);
  const first = entries[0] ?? last;
  const percent = first.price ? Math.round(((last.price - first.price) / first.price) * 100) : 0;
  const direction = entries.length < 2 ? "new" : percent >= 4 ? "up" : percent <= -4 ? "down" : "flat";
  return {
    detail: marketHistoryDetail(direction, entries.length, first, last, percent),
    direction,
    firstPrice: first.price,
    label: marketHistoryLabel(direction, percent),
    lastPrice: last.price,
    percent,
    sampleCount: entries.length,
  };
}

export function topMarketHistorySignals(state: Pick<GameState, "market" | "marketHistory">, limit = 5): MarketHistoryMovementSignal[] {
  return ports
    .flatMap((port) =>
      goods.map((good) => {
        const signal = marketHistorySignalFor(state, port.id, good.id);
        return {
          ...signal,
          goodId: good.id,
          portId: port.id,
          score: marketHistorySignalScore(signal),
        };
      })
    )
    .sort((left, right) => {
      return (
        right.score - left.score ||
        Math.abs(right.percent) - Math.abs(left.percent) ||
        right.sampleCount - left.sampleCount ||
        portName(left.portId).localeCompare(portName(right.portId)) ||
        goodName(left.goodId).localeCompare(goodName(right.goodId))
      );
    })
    .slice(0, limit);
}

export function marketHistoryTradeBiasFor(
  state: Pick<GameState, "market" | "marketHistory">,
  buyPortId: string,
  sellPortId: string,
  goodId: string
): MarketHistoryTradeBias {
  const buySignal = marketHistorySignalFor(state, buyPortId, goodId);
  const sellSignal = marketHistorySignalFor(state, sellPortId, goodId);
  const buyScore = buyTapeScore(buySignal);
  const sellScore = sellTapeScore(sellSignal);
  const score = Math.round(buyScore + sellScore);
  const label = tradeBiasLabel(buyScore, sellScore, score, buySignal, sellSignal);
  return {
    buySignal,
    detail: `${portName(buyPortId)} ${buySignal.label.toLowerCase()} | ${portName(sellPortId)} ${sellSignal.label.toLowerCase()} | ${score >= 0 ? "+" : ""}${score} tape`,
    favorable: score >= 6,
    label,
    score,
    sellSignal,
  };
}

function emptyMarketHistory(): MarketPriceHistory {
  return Object.fromEntries(ports.map((port) => [port.id, Object.fromEntries(goods.map((good) => [good.id, []]))])) as MarketPriceHistory;
}

function marketPricePoint(day: number, price: number): MarketPricePoint {
  return {
    day: Math.max(1, Math.round(day || 1)),
    price: Math.max(1, Math.round(price || 1)),
  };
}

function coalesceMarketHistoryEntries(entries: MarketPricePoint[]) {
  const byDay = new Map<number, MarketPricePoint>();
  for (const entry of entries) byDay.set(entry.day, marketPricePoint(entry.day, entry.price));
  return [...byDay.values()].sort((left, right) => left.day - right.day).slice(-marketHistoryLimit);
}

function marketHistoryLabel(direction: MarketHistorySignal["direction"], percent: number) {
  if (direction === "new") return "New quote";
  if (direction === "up") return percent >= 10 ? "Rising fast" : "Firming";
  if (direction === "down") return percent <= -10 ? "Falling fast" : "Softening";
  return "Rangebound";
}

function marketHistoryDetail(
  direction: MarketHistorySignal["direction"],
  sampleCount: number,
  first: MarketPricePoint,
  last: MarketPricePoint,
  percent: number
) {
  if (direction === "new") return `1 quote | day ${last.day} ${money(last.price)}`;
  const sign = percent > 0 ? "+" : "";
  return `${sampleCount} quotes | ${sign}${percent}% since day ${first.day} | last ${money(last.price)}`;
}

function marketHistorySignalScore(signal: MarketHistorySignal) {
  if (signal.sampleCount < 2) return 0;
  const directionBonus = signal.direction === "up" || signal.direction === "down" ? 6 : 0;
  const sampleBonus = Math.min(4, Math.max(0, signal.sampleCount - 1) * 0.5);
  return Number((Math.abs(signal.percent) + directionBonus + sampleBonus).toFixed(1));
}

function buyTapeScore(signal: MarketHistorySignal) {
  if (signal.sampleCount < 2) return 0;
  if (signal.direction === "down") return Math.min(18, Math.abs(signal.percent));
  if (signal.direction === "up") return -Math.min(12, Math.round(signal.percent * 0.65));
  return 0;
}

function sellTapeScore(signal: MarketHistorySignal) {
  if (signal.sampleCount < 2) return 0;
  if (signal.direction === "up") return Math.min(18, signal.percent);
  if (signal.direction === "down") return -Math.min(12, Math.round(Math.abs(signal.percent) * 0.65));
  return 0;
}

function tradeBiasLabel(
  buyScore: number,
  sellScore: number,
  score: number,
  buySignal: MarketHistorySignal,
  sellSignal: MarketHistorySignal
) {
  if (buyScore > 0 && sellScore > 0) return "Tape edge";
  if (buyScore > 0) return "Buy the dip";
  if (sellScore > 0) return "Sell strength";
  if (score <= -8) return "Tape warning";
  if (score < 0) return "Tape caution";
  if (buySignal.sampleCount < 2 || sellSignal.sampleCount < 2) return "Fresh tape";
  return "Flat tape";
}

function portName(portId: string) {
  return ports.find((port) => port.id === portId)?.name ?? portId;
}

function goodName(goodId: string) {
  return goods.find((good) => good.id === goodId)?.name ?? goodId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

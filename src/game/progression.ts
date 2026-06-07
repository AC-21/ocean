import { clamp } from "./math";

export const initialCaptainXpTarget = 120;

export function nextCaptainXpTarget(currentTarget: number) {
  return Math.round(currentTarget * 1.28 + 40);
}

export function tradeXpForProfit(profit: number) {
  if (profit <= 0) return 0;
  return Math.max(3, Math.round(8 + Math.sqrt(profit) * 3 + profit * 0.045));
}

export function contractXpFor(reward: number, units: number, daysLeft: number) {
  return Math.max(35, Math.round(32 + reward * 0.12 + units * 7 + Math.max(0, daysLeft) * 5));
}

export function voyageXpFor(days: number, risk: number, wear: number) {
  return Math.max(0, Math.round(days * 10 + clamp(risk, 0, 1) * 70 + wear * 2));
}

export function battleXpFor(strength: number, won: boolean) {
  return Math.max(won ? 55 : 18, Math.round(strength * (won ? 0.9 : 0.28)));
}

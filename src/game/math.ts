export const tau = Math.PI * 2;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

let uidCounter = 0;

export function uid(prefix: string) {
  uidCounter = (uidCounter + 1) % 1679616;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, length };
}

export function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x;
}

export function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

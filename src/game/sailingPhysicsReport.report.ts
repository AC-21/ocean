import { createSailingPhysicsReport } from "./sailingPhysicsReport";

declare const process: {
  env: Record<string, string | undefined>;
};

const report = createSailingPhysicsReport({
  day: positiveInteger(process.env.HARBORLINE_SAILING_PHYSICS_DAY, 22),
  fromId: process.env.HARBORLINE_SAILING_PHYSICS_FROM,
  toId: process.env.HARBORLINE_SAILING_PHYSICS_TO,
});

console.log(JSON.stringify(report, null, 2));

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

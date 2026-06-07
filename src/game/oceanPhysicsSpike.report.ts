import { createOceanPhysicsSpikeReport } from "./oceanPhysicsSpike";

declare const process: {
  env: Record<string, string | undefined>;
};

const days = positiveInteger(process.env.HARBORLINE_OCEAN_PHYSICS_DAYS, 60);
const report = createOceanPhysicsSpikeReport({ days });

console.log(JSON.stringify(report, null, 2));

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

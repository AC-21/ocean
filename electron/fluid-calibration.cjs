function calibratedFluidCalibrationFromProfile(profile, expectedAppVersion) {
  if (calibrationProfileFailures(profile, expectedAppVersion).length > 0) return undefined;
  const tier = validFluidTier(profile?.selectedTier);
  const runtimeGrid = validCalibrationRuntimeGrid(profile?.runtimeGrid);
  return tier ? { fingerprint: profile.capability.fingerprint, runtimeGrid, tier } : undefined;
}

function calibrationProfileFailures(profile, expectedAppVersion) {
  const selectedTier = validFluidTier(profile?.selectedTier);
  const capability = profile?.capability;
  return [
    ...(profile?.schema === "ocean-fluid-calibration-profile-v1" ? [] : ["profile schema was invalid"]),
    ...(profile?.pass === true ? [] : ["profile did not pass"]),
    ...(profile?.sourceGate === "G-FG-23" ? [] : ["profile source gate was invalid"]),
    ...(profile?.source?.adaptiveGate === "G-FG-23" ? [] : ["profile adaptive source gate was invalid"]),
    ...(typeof profile?.source?.adaptiveGeneratedAt === "string" && profile.source.adaptiveGeneratedAt.length > 0 ? [] : ["profile adaptive source timestamp was missing"]),
    ...(profile?.source?.selectedTier === profile?.selectedTier ? [] : ["profile source tier did not match selected tier"]),
    ...(selectedTier ? [] : ["profile selected tier was invalid"]),
    ...(profile?.appVersion === expectedAppVersion ? [] : ["profile app version did not match runtime"]),
    ...(capability?.sourceGate === "G-FG-01" ? [] : ["profile capability source gate was invalid"]),
    ...(capability?.status === "webgpu-ready" ? [] : ["profile capability status was invalid"]),
    ...(capability?.backend === "webgpu-compute" ? [] : ["profile capability backend was invalid"]),
    ...(typeof capability?.adapterInfo === "string" && capability.adapterInfo.length > 0 ? [] : ["profile capability adapter was missing"]),
    ...(Array.isArray(capability?.features) && capability.features.length > 0 ? [] : ["profile capability features were missing"]),
    ...(capability?.limits?.maxStorageBufferBindingSize !== undefined && capability.limits.maxStorageBufferBindingSize !== null
      ? []
      : ["profile capability storage limit was missing"]),
    ...(capability?.fingerprint === capabilityFingerprint(capability) ? [] : ["profile capability fingerprint did not match provenance"]),
    ...calibrationRuntimeGridFailures(profile?.runtimeGrid),
  ];
}

function validFluidTier(value) {
  return value === "low" || value === "standard" || value === "high" || value === "ultra" ? value : undefined;
}

function validExperimentalFluidGrid(value) {
  return value === "1024x576" || value === "1280x720" ? value : undefined;
}

function validCalibrationRuntimeGrid(runtimeGrid) {
  if (runtimeGrid === undefined || runtimeGrid === null) return undefined;
  return calibrationRuntimeGridFailures(runtimeGrid).length === 0 ? `${runtimeGrid.cellsX}x${runtimeGrid.cellsY}` : undefined;
}

function calibrationRuntimeGridFailures(runtimeGrid) {
  if (runtimeGrid === undefined || runtimeGrid === null) return [];
  return [
    ...(runtimeGrid.sourceGate === "G-FG-40" ? [] : ["profile runtime grid source gate was invalid"]),
    ...(typeof runtimeGrid.sourceGeneratedAt === "string" && runtimeGrid.sourceGeneratedAt.length > 0
      ? []
      : ["profile runtime grid source timestamp was missing"]),
    ...(runtimeGrid.capabilityGrid === "768x432" ? [] : ["profile runtime grid capability grid was invalid"]),
    ...(runtimeGrid.liveGrid === "1024x576" ? [] : ["profile runtime grid live grid was invalid"]),
    ...(runtimeGrid.cellsX === 1024 && runtimeGrid.cellsY === 576 ? [] : ["profile runtime grid dimensions were invalid"]),
  ];
}

function capabilityFingerprint(capability) {
  if (!capability) return undefined;
  const limitKeys = [
    "maxBufferSize",
    "maxComputeInvocationsPerWorkgroup",
    "maxComputeWorkgroupSizeX",
    "maxComputeWorkgroupSizeY",
    "maxComputeWorkgroupsPerDimension",
    "maxStorageBufferBindingSize",
  ];
  const features = Array.from(new Set(Array.isArray(capability.features) ? capability.features.filter((value) => typeof value === "string" && value.length > 0) : [])).sort().join(",");
  const limits = limitKeys.map((key) => `${key}:${capability.limits?.[key] ?? "null"}`).join(",");
  return [`adapter:${capability.adapterInfo ?? ""}`, `backend:${capability.backend}`, `features:${features}`, `limits:${limits}`, `status:${capability.status}`].join("|");
}

module.exports = {
  calibratedFluidCalibrationFromProfile,
  calibrationProfileFailures,
  calibrationRuntimeGridFailures,
  capabilityFingerprint,
  validCalibrationRuntimeGrid,
  validExperimentalFluidGrid,
  validFluidTier,
};

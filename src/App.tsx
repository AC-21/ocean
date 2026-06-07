import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties, Dispatch, KeyboardEvent, ReactNode } from "react";
import { gameAssetManifest } from "./game/assets";
import { buildSynergyLabelForEffects, topBuildSynergyProgressFor } from "./game/buildSynergies";
import {
  activeContracts as getActiveContracts,
  contractBoardSlotsForPort,
  contractCargoStatus,
  contractChainLabel,
  contractChainRewardText,
  contractKindLabel,
  contractPacingLabel,
  contractPlanSummary,
  contractPressureLabel,
  contractRouteFitSummary,
  routeContractFocus,
  routeContractOfferFocus,
  contractRouteSummary,
  contractSummary,
  contractUrgency,
  type RouteContractFocus,
  type RouteContractOfferFocus,
} from "./game/contracts";
import { customsActionReadFor } from "./game/customs";
import {
  crewDismissalCost,
  crewFacilityDrillFor,
  crewFacilityFor,
  crewFacilitySummary,
  crewMoraleTier,
  crewProfileDetail,
  crewProfileFor,
  crewProfileSummary,
  crewRankFor,
  crewSpecialtyFor,
  crewTraitDetail,
  crewTraitsFor,
  crewTraitSummary,
  crewWageFor,
  crewWeeklyWage,
  crewXpToNext,
  nextCrewPayday,
  shoreLeaveCost,
} from "./game/crew";
import { crewRouteReadFor } from "./game/crewIdentity";
import { captainSkillCatalog, crewCatalog, equipmentCatalog, factions, goods, ports, shipCatalog } from "./game/data";
import {
  cargoArrivalOutcomeFor,
  brokerPacketQuoteFor,
  freightPressureSignalFor,
  marketAccessForGood,
  marketForecastFor,
  marketStockLevel,
  marketStockText,
  portLogisticsPressure,
  priceFor,
  recommendRouteChoices,
  routeWindowForecast,
  routeTradePlanFor,
  sellPriceFor,
  topFreightPressureSignals,
  topMarketForecasts,
  topTradeOpportunities,
  tradeOpportunityForGood,
  trendText,
  type RouteChoice,
  type RouteChoiceKind,
} from "./game/economy";
import { pirateTacticalReadFor } from "./game/encounters";
import { arrivalEventPreviews, underwayEventPreviews, worldEventPreviews, type EventPressurePreview } from "./game/eventDeck";
import { feedbackPulseFor, type FeedbackPulse } from "./game/feedback";
import { factionFavorQuoteFor } from "./game/factionFavors";
import { topFactionPressureSignals } from "./game/factionPressure";
import {
  audioCueLabel,
  audioStatusLabel,
  audioVolumePercent,
  createHarborlineAudioEngine,
  defaultAudioPreferences,
  normalizeAudioPreferences,
  readAudioPreferences,
  writeAudioPreferences,
  type AudioPreferences,
  type AudioScene,
  type HarborlineAudioEngine,
} from "./game/audio";
import {
  captainIdentityFor,
  contractIdentityFor,
  crewIdentityArtFor,
  encounterIdentityFor,
  factionIdentityFor,
  factionIdentityForPortFaction,
  type IdentityArtSpec,
} from "./game/identityArt";
import { cargoInsurableValue, insuranceQuoteFor, insuranceStatusText } from "./game/insurance";
import { marketHistorySignalFor, topMarketHistorySignals } from "./game/marketHistory";
import { money } from "./game/math";
import { captainOrderFor, type CaptainOrderTarget } from "./game/onboarding";
import { equipmentRecommendationFor, equipmentRecommendationsFor, type EquipmentRecommendation } from "./game/equipmentPlanner";
import { equipmentFitBonusFor, equipmentInSlot, equipmentSlotLabels, installEquipmentIds } from "./game/outfitting";
import {
  appendRuntimeErrorAsync,
  clearSavedGameAsync,
  desktopStorageFiles,
  hasRecoverableSave,
  hasRecoverableSaveAsync,
  importGameSaveAsync,
  loadGameAsync,
  playtestArtifactKindFor,
  playtestArtifactKey,
  playtestHistoryKey,
  readBest,
  readBestAsync,
  readDesktopStorageInfoAsync,
  readPlaytestHistoryAsync,
  recoverSavedGameAsync,
  saveGameAsync,
  serializeGameSave,
  writePlaytestArtifactAsync,
  writeBestAsync,
  type HarborlineDesktopStorageInfo,
} from "./game/persistence";
import { nextUpgradeTiming, runPhaseForDay } from "./game/pacing";
import { routePhysicsDebugFor, type RoutePhysicsDebug } from "./game/physicsDebug";
import { playtestEvidencePacketFor, playtestScorecardDraftFor } from "./game/playtestEvidence";
import { playtestReadinessFor, scorecardQualificationFor, type PlaytestReadiness, type PlaytestScorecardQualification } from "./game/playtestReadiness";
import { playtestTriageMarkdownFor } from "./game/playtestTriage";
import { captainSkillMasteryFor, captainSkillProgressLabel, hasCaptainSkillMastery } from "./game/captainSkills";
import { destinationReadFor, portIdentityFor, portIdentityLine } from "./game/portIdentity";
import { authoritySummary, contractQualityLabel, politicalActionCost, standingSummary, standingTier } from "./game/politics";
import { routeMemoryFor, routeMemorySummary } from "./game/routeMemory";
import { cargoUnits, portById, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate, sailPlans, stormFrontsForDay } from "./game/routing";
import { seaRescueReadFor } from "./game/seaRescue";
import { runGoalsFor, type RunGoal } from "./game/runGoals";
import { previewShip, topBuildFitsForStats, yardPriceFor, yardResaleValueFor, yardSourceLabel, type RouteFitDelta } from "./game/shipyard";
import { shipIdentitySummary } from "./game/ships";
import {
  captainSkillLimit,
  createInitialState,
  dockFeeFor,
  maxDay,
  politicalActionCosts,
  reduceGame,
  repairCostFor,
  runRecapFor,
  scoreBreakdownFor,
  skillTrainingCost,
  type ScoreBreakdown,
} from "./game/reducer";
import { currentShip, deriveShipStats } from "./game/stats";
import type { GameError, GameState, TabId } from "./game/types";

const sailPlanOptions = Object.values(sailPlans);
const graphicsPreferenceKey = "harborline.graphics";
const reducedMotionPreferenceKey = "harborline.reducedMotion";
const graphicsModes = ["high", "balanced", "low"] as const;
type GraphicsMode = (typeof graphicsModes)[number];
type PlaytestScorecardCheck = {
  detail: string;
  label: string;
  missing: string[];
  status: "empty" | "missing" | "not-scorecard" | "qualified";
};
type GameSettings = {
  audioCue: FeedbackPulse["audioCue"];
  audioPreferences: AudioPreferences;
  audioScene: AudioScene;
  audioStatus: string;
  desktopInfo: HarborlineDesktopStorageInfo | null;
  graphicsMode: GraphicsMode;
  playtestPacketText: string;
  playtestReadiness: PlaytestReadiness;
  playtestScorecardCheck: PlaytestScorecardCheck;
  reducedMotion: boolean;
  saveTransferText: string;
  settingsStatus: string;
  canRecoverSave: boolean;
  setAudioMuted: (muted: boolean) => void;
  setAudioVolume: (volume: number) => void;
  setGraphicsMode: (mode: GraphicsMode) => void;
  testAudioCue: () => void;
  generatePlaytestPacket: () => void;
  generatePlaytestScorecard: () => void;
  generatePlaytestTriage: () => void;
  validatePlaytestScorecard: () => void;
  savePlaytestArtifact: () => void;
  setPlaytestPacketText: (value: string) => void;
  setReducedMotion: (enabled: boolean) => void;
  setSaveTransferText: (value: string) => void;
  exportSave: () => void;
  importSave: () => void;
  clearSave: () => void;
  recoverSave: () => void;
};
const MapScene = lazy(() => import("./MapScene").then((module) => ({ default: module.MapScene })));

export default function App() {
  const [state, dispatch] = useReducer(reduceGame, undefined, () => createInitialState(readBest()));
  const [audioPreferences, setAudioPreferencesState] = useState<AudioPreferences>(() => readAudioPreferences());
  const [graphicsMode, setGraphicsModeState] = useState<GraphicsMode>(() => readGraphicsPreference());
  const [reducedMotion, setReducedMotionState] = useState(() => readReducedMotionPreference());
  const [saveTransferText, setSaveTransferText] = useState("");
  const [playtestPacketText, setPlaytestPacketText] = useState("");
  const [playtestReadiness, setPlaytestReadiness] = useState(() => playtestReadinessFor({ schema: 1, entries: [] }));
  const [settingsStatus, setSettingsStatus] = useState("Ready");
  const [canRecoverSave, setCanRecoverSave] = useState(() => hasRecoverableSave());
  const [desktopInfo, setDesktopInfo] = useState<HarborlineDesktopStorageInfo | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const stateRef = useRef(state);
  const audioEngineRef = useRef<HarborlineAudioEngine | null>(null);
  const lastAudioPulseIdRef = useRef<string | null>(null);
  const deskContentRef = useRef<HTMLElement | null>(null);
  const didMountDeskFocusRef = useRef(false);
  const loggedErrorIdsRef = useRef<Set<string>>(new Set());
  stateRef.current = state;
  const recordRuntimeError = useCallback((error: Omit<GameError, "id" | "day" | "time">) => {
    dispatch({ type: "recordError", error });
  }, []);

  const stats = useMemo(() => deriveShipStats(state), [state]);
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const currentPortIdentity = portIdentityFor(current.id);
  const selectedPortRead = destinationReadFor(state, current.id, selected.id);
  const currentFaction = factions.find((faction) => faction.id === current.faction) ?? factions[0];
  const captainIdentity = captainIdentityFor();
  const selectedCurrent = current.id === selected.id;
  const conditions = selectedCurrent ? null : routeConditions(state, current.id, selected.id);
  const routeWear = selectedCurrent ? null : routeWearEstimate(state, current.id, selected.id);
  const routeText = selectedCurrent
    ? "Choose a destination"
    : `${routeDays(state, current.id, selected.id)}d | ${Math.round(routeRisk(state, current.id, selected.id) * 100)}% risk | ${
        routeWear?.hullWear ?? 0
      } wear | ${conditions?.tacticLabel} ${signedPercent(conditions?.speedDelta ?? 0)}`;
  const xpPercent = Math.min(100, Math.round((state.captainXp / Math.max(1, state.captainXpTarget)) * 100));
  const moraleTier = crewMoraleTier(state.crewMorale);
  const captainOrder = useMemo(() => captainOrderFor(state), [state]);
  const feedbackPulse = useMemo(() => feedbackPulseFor(state), [state]);
  const audioScene: AudioScene = state.gameOver ? "silent" : state.encounter ? "encounter" : state.voyage ? "open-water" : "harbor";
  const audioStatus = useMemo(
    () => audioStatusLabel(audioPreferences, audioScene, feedbackPulse.audioCue),
    [audioPreferences, audioScene, feedbackPulse.audioCue]
  );
  const scoreBreakdown = useMemo(() => scoreBreakdownFor(state), [state]);
  const playtestScorecardCheck = useMemo(() => scorecardCheckFor(playtestPacketText), [playtestPacketText]);

  const getAudioEngine = useCallback(() => {
    audioEngineRef.current ??= createHarborlineAudioEngine(audioPreferences);
    return audioEngineRef.current;
  }, [audioPreferences]);

  const primeAudio = useCallback(() => {
    void getAudioEngine().prime();
  }, [getAudioEngine]);

  useEffect(() => {
    let cancelled = false;
    void readBestAsync()
      .then((best) => {
        if (!cancelled) dispatch({ type: "setBest", best });
      })
      .catch((error) => {
        if (cancelled) return;
        recordRuntimeError({
          message: errorMessageFor(error, "Best score load failed"),
          source: "save/best-load",
          stack: errorStackFor(error),
        });
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recordRuntimeError]);

  useEffect(() => {
    if (!storageReady) return;
    void writeBestAsync(state.best).catch((error) => {
      recordRuntimeError({
        message: errorMessageFor(error, "Best score write failed"),
        source: "save/best-write",
        stack: errorStackFor(error),
      });
    });
  }, [recordRuntimeError, state.best, storageReady]);

  useEffect(() => {
    let cancelled = false;
    void readDesktopStorageInfoAsync()
      .then((info) => {
        if (!cancelled) setDesktopInfo(info);
      })
      .catch((error) => {
        if (cancelled) return;
        recordRuntimeError({
          message: errorMessageFor(error, "Desktop info load failed"),
          source: "desktop/info",
          stack: errorStackFor(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [recordRuntimeError, storageReady]);

  useEffect(() => {
    let cancelled = false;
    void hasRecoverableSaveAsync()
      .then((recoverable) => {
        if (!cancelled) setCanRecoverSave(recoverable);
      })
      .catch((error) => {
        if (cancelled) return;
        recordRuntimeError({
          message: errorMessageFor(error, "Save recovery status failed"),
          source: "save/recover-status",
          stack: errorStackFor(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [recordRuntimeError, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    void readPlaytestHistoryAsync()
      .then((history) => {
        if (!cancelled) setPlaytestReadiness(playtestReadinessFor(history));
      })
      .catch((error) => {
        if (cancelled) return;
        recordRuntimeError({
          message: errorMessageFor(error, "Playtest history load failed"),
          source: "playtest/history-load",
          stack: errorStackFor(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [recordRuntimeError, storageReady]);

  useEffect(() => {
    window.localStorage.setItem(graphicsPreferenceKey, graphicsMode);
  }, [graphicsMode]);

  useEffect(() => {
    writeAudioPreferences(audioPreferences);
    getAudioEngine().setPreferences(audioPreferences);
  }, [audioPreferences, getAudioEngine]);

  useEffect(() => {
    getAudioEngine().setScene(audioScene);
  }, [audioScene, getAudioEngine]);

  useEffect(() => {
    if (lastAudioPulseIdRef.current === null) {
      lastAudioPulseIdRef.current = feedbackPulse.id;
      return;
    }
    if (lastAudioPulseIdRef.current === feedbackPulse.id) return;
    lastAudioPulseIdRef.current = feedbackPulse.id;
    getAudioEngine().playCue(feedbackPulse.audioCue, feedbackPulse.priority);
  }, [feedbackPulse.audioCue, feedbackPulse.id, feedbackPulse.priority, getAudioEngine]);

  useEffect(() => () => audioEngineRef.current?.stop(), []);

  useEffect(() => {
    window.localStorage.setItem(reducedMotionPreferenceKey, reducedMotion ? "true" : "false");
    document.documentElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
  }, [reducedMotion]);

  useEffect(() => {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.12);
      last = now;
      if (stateRef.current.voyage && !stateRef.current.encounter && !stateRef.current.gameOver) {
        dispatch({ type: "tickVoyage", dt });
      }
    };
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!didMountDeskFocusRef.current) {
      didMountDeskFocusRef.current = true;
      return;
    }
    deskContentRef.current?.focus({ preventScroll: true });
  }, [state.tab, state.gameOver, Boolean(state.encounter), Boolean(state.voyage)]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      recordRuntimeError({
        message: event.message || "Unknown runtime error",
        source: errorEventSource(event),
        stack: errorStackFor(event.error),
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      recordRuntimeError({
        message: errorMessageFor(event.reason, "Unhandled promise rejection"),
        source: "unhandledrejection",
        stack: errorStackFor(event.reason),
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [recordRuntimeError]);

  useEffect(() => {
    for (const error of state.errors) {
      if (loggedErrorIdsRef.current.has(error.id)) continue;
      loggedErrorIdsRef.current.add(error.id);
      void appendRuntimeErrorAsync(error).catch(() => undefined);
    }
  }, [state.errors]);

  useEffect(() => {
    let cancelled = false;
    for (const asset of gameAssetManifest) {
      const image = new Image();
      image.decoding = "async";
      image.onerror = () => {
        if (cancelled) return;
        recordRuntimeError({
          message: `Asset failed to load: ${asset.id}`,
          source: `asset:${asset.id}`,
          stack: asset.url,
        });
      };
      image.src = asset.url;
    }
    return () => {
      cancelled = true;
    };
  }, [recordRuntimeError]);

  const handleSave = useCallback(async () => {
    try {
      const at = new Date().toISOString();
      await saveGameAsync({ ...stateRef.current, lastSavedAt: at });
      setCanRecoverSave(await hasRecoverableSaveAsync());
      dispatch({ type: "markSaved", at });
    } catch (error) {
      recordRuntimeError({
        message: errorMessageFor(error, "Save failed"),
        source: "save/write",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError]);

  const handleLoad = useCallback(async () => {
    try {
      const loaded = await loadGameAsync();
      if (loaded) dispatch({ type: "load", state: loaded });
      else recordRuntimeError({ message: "No valid saved run found.", source: "save/load" });
    } catch (error) {
      recordRuntimeError({
        message: errorMessageFor(error, "Load failed"),
        source: "save/load",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError]);

  const setGraphicsMode = useCallback((mode: GraphicsMode) => {
    setGraphicsModeState(mode);
    setSettingsStatus(`Graphics: ${mode}`);
  }, []);

  const setAudioMuted = useCallback((muted: boolean) => {
    setAudioPreferencesState((currentPreferences) => normalizeAudioPreferences({ ...currentPreferences, muted }));
    setSettingsStatus(muted ? "Audio muted" : "Audio on");
  }, []);

  const setAudioVolume = useCallback((volume: number) => {
    const nextPreferences = normalizeAudioPreferences({ ...defaultAudioPreferences, ...audioPreferences, volume });
    setAudioPreferencesState(nextPreferences);
    setSettingsStatus(`Audio volume ${audioVolumePercent(nextPreferences)}%`);
  }, [audioPreferences]);

  const testAudioCue = useCallback(() => {
    const engine = getAudioEngine();
    void engine.prime().then(() => engine.playCue(feedbackPulse.audioCue, feedbackPulse.priority));
    setSettingsStatus(`Audio cue: ${audioCueLabel(feedbackPulse.audioCue)}`);
  }, [feedbackPulse.audioCue, feedbackPulse.priority, getAudioEngine]);

  const setReducedMotion = useCallback((enabled: boolean) => {
    window.localStorage.setItem(reducedMotionPreferenceKey, enabled ? "true" : "false");
    document.documentElement.dataset.reducedMotion = enabled ? "true" : "false";
    setReducedMotionState(enabled);
    setSettingsStatus(enabled ? "Reduced motion on" : "Reduced motion off");
  }, []);

  const exportSave = useCallback(() => {
    setSaveTransferText(serializeGameSave(stateRef.current));
    setSettingsStatus("Run exported");
  }, []);

  const generatePlaytestPacket = useCallback(() => {
    const runtime = desktopInfo?.kind === "electron" ? "Electron" : "Browser";
    const packet = playtestEvidencePacketFor(stateRef.current, {
      build: desktopInfo?.version ?? import.meta.env.VITE_APP_VERSION ?? "dev",
      generatedAt: new Date().toISOString(),
      graphicsMode,
      logsPath: desktopInfo?.logsPath,
      reducedMotion,
      runtime,
      storagePath: desktopInfo?.basePath,
    });
    setPlaytestPacketText(packet);
    setSettingsStatus("Playtest packet generated");
  }, [desktopInfo, graphicsMode, reducedMotion]);

  const generatePlaytestScorecard = useCallback(() => {
    const runtime = desktopInfo?.kind === "electron" ? "Electron" : "Browser";
    const scorecard = playtestScorecardDraftFor(stateRef.current, {
      build: desktopInfo?.version ?? import.meta.env.VITE_APP_VERSION ?? "dev",
      generatedAt: new Date().toISOString(),
      graphicsMode,
      logsPath: desktopInfo?.logsPath,
      reducedMotion,
      runtime,
      storagePath: desktopInfo?.basePath,
    });
    setPlaytestPacketText(scorecard);
    setSettingsStatus("Playtest scorecard generated");
  }, [desktopInfo, graphicsMode, reducedMotion]);

  const generatePlaytestTriage = useCallback(async () => {
    try {
      const history = await readPlaytestHistoryAsync();
      setPlaytestReadiness(playtestReadinessFor(history));
      setPlaytestPacketText(playtestTriageMarkdownFor(history, new Date().toISOString()));
      setSettingsStatus("Playtest triage generated");
    } catch (error) {
      setSettingsStatus("Playtest triage failed");
      recordRuntimeError({
        message: errorMessageFor(error, "Playtest triage failed"),
        source: "playtest/triage",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError]);

  const validatePlaytestScorecard = useCallback(() => {
    if (playtestScorecardCheck.status === "empty") setSettingsStatus("Generate or paste a scorecard first");
    else if (playtestScorecardCheck.status === "not-scorecard") setSettingsStatus("Current playtest text is not a scorecard");
    else if (playtestScorecardCheck.status === "qualified") {
      setSettingsStatus("Current scorecard qualifies for M-026A");
    } else {
      setSettingsStatus(`Scorecard missing: ${playtestScorecardCheck.missing.slice(0, 4).join(", ")}`);
    }
  }, [playtestScorecardCheck]);

  const savePlaytestArtifact = useCallback(async () => {
    try {
      const artifact = playtestPacketText.trim()
        ? playtestPacketText
        : playtestScorecardDraftFor(stateRef.current, {
            build: desktopInfo?.version ?? import.meta.env.VITE_APP_VERSION ?? "dev",
            generatedAt: new Date().toISOString(),
            graphicsMode,
            logsPath: desktopInfo?.logsPath,
            reducedMotion,
            runtime: desktopInfo?.kind === "electron" ? "Electron" : "Browser",
            storagePath: desktopInfo?.basePath,
          });
      const result = await writePlaytestArtifactAsync(artifact);
      const readiness = playtestReadinessFor(result.history);
      setPlaytestReadiness(readiness);
      setPlaytestPacketText(result.value);
      const savedEntry = [...result.history.entries].reverse().find((entry) => entry.markdown === result.value);
      const savedQualification = readiness.qualifications.find((entry) => entry.entryId === savedEntry?.id);
      const archiveStatus = [
        `${result.scorecardCount} scorecard${result.scorecardCount === 1 ? "" : "s"} archived`,
        result.artifactKind === "scorecard" ? scorecardSaveQualityText(result.value, savedQualification) : "",
      ].filter(Boolean).join("; ");
      const artifactLabel = result.artifactKind === "scorecard" ? "scorecard" : result.artifactKind === "triage" ? "triage report" : "artifact";
      setSettingsStatus(
        result.kind === "desktop"
          ? `Playtest ${artifactLabel} saved: ${desktopInfo?.basePath ? `${desktopInfo.basePath}/${result.fileName}` : result.fileName} (${archiveStatus})`
          : `Playtest ${artifactLabel} saved locally (${archiveStatus})`
      );
    } catch (error) {
      setSettingsStatus("Playtest artifact save failed");
      recordRuntimeError({
        message: errorMessageFor(error, "Playtest artifact save failed"),
        source: "playtest/artifact-save",
        stack: errorStackFor(error),
      });
    }
  }, [desktopInfo, graphicsMode, playtestPacketText, recordRuntimeError, reducedMotion]);

  const importSave = useCallback(async () => {
    try {
      const imported = await importGameSaveAsync(saveTransferText);
      if (!imported) {
        setCanRecoverSave(await hasRecoverableSaveAsync());
        setSettingsStatus("Import failed");
        recordRuntimeError({ message: "Save import failed.", source: "save/import" });
        return;
      }
      setCanRecoverSave(await hasRecoverableSaveAsync());
      dispatch({ type: "load", state: { ...imported, tab: stateRef.current.tab } });
      setSettingsStatus("Run imported");
    } catch (error) {
      setSettingsStatus("Import failed");
      recordRuntimeError({
        message: errorMessageFor(error, "Save import failed"),
        source: "save/import",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError, saveTransferText]);

  const clearSave = useCallback(async () => {
    try {
      await clearSavedGameAsync();
      const recoverable = await hasRecoverableSaveAsync();
      setCanRecoverSave(recoverable);
      setSettingsStatus(recoverable ? "Saved run deleted; backup ready" : "Saved run deleted");
    } catch (error) {
      setSettingsStatus("Delete failed");
      recordRuntimeError({
        message: errorMessageFor(error, "Save delete failed"),
        source: "save/delete",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError]);

  const recoverSave = useCallback(async () => {
    try {
      const recovered = await recoverSavedGameAsync();
      setCanRecoverSave(await hasRecoverableSaveAsync());
      if (!recovered) {
        setSettingsStatus("No backup found");
        recordRuntimeError({ message: "Save recovery failed.", source: "save/recover" });
        return;
      }
      dispatch({ type: "load", state: { ...recovered, tab: stateRef.current.tab } });
      setSettingsStatus("Backup recovered");
    } catch (error) {
      setSettingsStatus("Recovery failed");
      recordRuntimeError({
        message: errorMessageFor(error, "Save recovery failed"),
        source: "save/recover",
        stack: errorStackFor(error),
      });
    }
  }, [recordRuntimeError]);

  const runCaptainOrder = useCallback((target: CaptainOrderTarget | null) => {
    if (!target) return;
    if (target.kind === "buyMaxGood") dispatch({ type: "buyMaxGood", goodId: target.goodId });
    if (target.kind === "buyContractCargo") dispatch({ type: "buyContractCargo", contractId: target.contractId });
    if (target.kind === "buyEquipment") dispatch({ type: "buyEquipment", equipmentId: target.equipmentId });
    if (target.kind === "buyShip") dispatch({ type: "buyShip", shipId: target.shipId });
    if (target.kind === "sellAllGood") dispatch({ type: "sellAllGood", goodId: target.goodId });
    if (target.kind === "plotRoute") {
      dispatch({ type: "setSailPlan", plan: target.sailPlan });
      dispatch({ type: "selectPort", portId: target.portId });
    }
    if (target.kind === "startVoyage") dispatch({ type: "startVoyage" });
    if (target.kind === "repair") dispatch({ type: "repair" });
    if (target.kind === "borrow") dispatch({ type: "borrow" });
    if (target.kind === "buyInsurance") dispatch({ type: "buyInsurance" });
    if (target.kind === "completeContract") dispatch({ type: "completeContract", contractId: target.contractId });
    if (target.kind === "openTab") dispatch({ type: "setTab", tab: target.tab });
  }, []);

  const settings = useMemo<GameSettings>(
    () => ({
      audioCue: feedbackPulse.audioCue,
      audioPreferences,
      audioScene,
      audioStatus,
      desktopInfo,
      graphicsMode,
      playtestPacketText,
      playtestReadiness,
      playtestScorecardCheck,
      reducedMotion,
      saveTransferText,
      settingsStatus,
      canRecoverSave,
      setAudioMuted,
      setAudioVolume,
      setGraphicsMode,
      testAudioCue,
      generatePlaytestPacket,
      generatePlaytestScorecard,
      generatePlaytestTriage,
      validatePlaytestScorecard,
      savePlaytestArtifact,
      setPlaytestPacketText,
      setReducedMotion,
      setSaveTransferText,
      exportSave,
      importSave,
      clearSave,
      recoverSave,
    }),
    [
      audioPreferences,
      audioScene,
      audioStatus,
      canRecoverSave,
      clearSave,
      desktopInfo,
      feedbackPulse.audioCue,
      exportSave,
      generatePlaytestPacket,
      generatePlaytestScorecard,
      generatePlaytestTriage,
      graphicsMode,
      importSave,
      playtestPacketText,
      playtestReadiness,
      playtestScorecardCheck,
      recoverSave,
      reducedMotion,
      savePlaytestArtifact,
      saveTransferText,
      setAudioMuted,
      setAudioVolume,
      setGraphicsMode,
      setReducedMotion,
      settingsStatus,
      testAudioCue,
      validatePlaytestScorecard,
    ]
  );

  return (
    <main className="app-shell" onKeyDown={primeAudio} onPointerDown={primeAudio}>
      <aside className="ledger-panel" aria-label="Ship ledger">
        <div className="title-block">
          <p className="eyebrow">60-day trade run</p>
          <h1>Harborline</h1>
        </div>

        <section className="stat-grid" aria-label="Run totals">
          <Stat label="Net Worth" value={money(scoreBreakdown.total)} primary />
          <Stat label="Cash" value={money(state.cash)} />
          <Stat label="Debt" value={money(state.debt)} />
          <Stat label="Day" value={`${Math.min(state.day, maxDay)} / ${maxDay}`} />
          <Stat label="Best" value={money(state.best)} />
          <Stat label="Skill Pts" value={String(state.skillPoints)} />
        </section>

        <ScorePressurePanel state={state} breakdown={scoreBreakdown} />

        <RunGoalsPanel state={state} />

        <section className="xp-readout" aria-label="Captain progression">
          <IdentityToken identity={captainIdentity} size="small" testId="captain-identity-token" />
          <div>
            <span>Captain XP</span>
            <strong>{state.captainXp} / {state.captainXpTarget}</strong>
          </div>
          <div className="xp-meter">
            <span style={{ width: `${xpPercent}%` }} />
          </div>
        </section>

        <section className="ship-readout" aria-label="Ship status">
          <div className="meter-row">
            <span>Hull</span>
            <div className="meter">
              <span style={{ width: `${Math.min(100, (state.hull / stats.hullMax) * 100)}%` }} />
            </div>
          </div>
          <div className="meter-row">
            <span>Cargo</span>
            <div className="meter amber">
              <span style={{ width: `${Math.min(100, (cargoUnits(state) / stats.cargoCap) * 100)}%` }} />
            </div>
          </div>
          <div className="meter-row">
            <span>Morale</span>
            <div className={`meter morale ${moraleTier.tone}`}>
              <span style={{ width: `${state.crew.length ? state.crewMorale : 0}%` }} />
            </div>
          </div>
          <div className="ship-lines">
            <p><span>Ship</span><strong>{currentShip(state).name}</strong></p>
            <p><span>Role</span><strong>{shipIdentitySummary(currentShip(state))}</strong></p>
            <p><span>Hold</span><strong>{cargoUnits(state)} / {stats.cargoCap}</strong></p>
            <p><span>Cannons</span><strong>{stats.cannons}</strong></p>
            <p><span>Speed</span><strong>{stats.speed}</strong></p>
            <p><span>Open Water</span><strong>{stats.openWater}</strong></p>
            <p><span>Crew</span><strong>{state.crew.length} / {stats.crewCap}</strong></p>
            <p><span>Morale</span><strong>{state.crew.length ? moraleTier.label : "No Crew"}</strong></p>
            <p><span>Payroll</span><strong>{money(crewWeeklyWage(state))}/wk</strong></p>
            <p><span>Top Crew</span><strong>{topCrewRankLabel(state)}</strong></p>
          </div>
        </section>

        <section className="cargo-list" aria-label="Cargo manifest">
          <p className="panel-label">Manifest</p>
          <div id="cargo-list">
            {goods.filter((good) => (state.cargo[good.id] || 0) > 0).length ? (
              goods
                .filter((good) => (state.cargo[good.id] || 0) > 0)
                .map((good) => {
                  const quantity = state.cargo[good.id] || 0;
                  const basis = state.cargoBasis[good.id] ?? sellPriceFor(state, state.currentPort, good.id);
                  const localMargin = (sellPriceFor(state, state.currentPort, good.id) - basis) * quantity;
                  return <CargoRow key={good.id} name={good.name} value={`${quantity} | ${marginText(localMargin)}`} />;
                })
            ) : (
              <CargoRow name="Empty hold" value="buy low" />
            )}
          </div>
        </section>

        <div className="ledger-actions">
          <button type="button" onClick={() => dispatch({ type: "newRun", best: state.best })}>New Run</button>
          <button type="button" onClick={() => dispatch({ type: "payDebt" })}>Pay Debt</button>
          <button data-testid="save-run" type="button" onClick={handleSave}>Save</button>
          <button data-testid="load-run" type="button" onClick={handleLoad}>Load</button>
        </div>
        <p className="save-status" aria-live="polite">{formatSaveStatus(state.lastSavedAt)}</p>
        <button
          aria-label={state.errors.length ? `${state.errors.length} runtime issues captured` : "Runtime clean"}
          className={`runtime-health ${state.errors.length ? "dirty" : "clean"}`}
          data-testid="runtime-health"
          type="button"
          onClick={() => dispatch({ type: "setTab", tab: "intel" })}
        >
          <span>Runtime</span>
          <strong>{state.errors.length ? `${state.errors.length} issue${state.errors.length === 1 ? "" : "s"}` : "Clean"}</strong>
        </button>
      </aside>

      <section className="map-panel" aria-label="Sea map">
        <header className="map-header">
          <div className="port-heading">
            <IdentityToken identity={factionIdentityForPortFaction(currentFaction)} size="small" testId="current-port-faction-token" />
            <div>
            <p className="eyebrow">Current Port</p>
            <h2>{current.name}</h2>
            <span className="port-identity-line" data-testid="current-port-identity">{currentPortIdentity.mapTag} | {currentPortIdentity.routeHook}</span>
            </div>
          </div>
          <div className="route-summary">
            <div className="sail-plan-toggle" aria-label="Sail plan">
              {sailPlanOptions.map((plan) => (
                <button
                  aria-pressed={state.sailPlan === plan.id}
                  className={state.sailPlan === plan.id ? "active" : ""}
                  data-testid={`sail-plan-${plan.id}`}
                  disabled={Boolean(state.voyage || state.encounter || state.gameOver)}
                  key={plan.id}
                  title={plan.note}
                  type="button"
                  onClick={() => dispatch({ type: "setSailPlan", plan: plan.id })}
                >
                  {plan.label}
                </button>
              ))}
            </div>
            <span
              id="selected-route"
              title={conditions ? `${conditions.currentLabel}, ${conditions.seaLabel}, ${routeWear?.label}` : routeText}
            >
              {routeText}
            </span>
            <button
              aria-describedby="selected-route"
              aria-label={`Sail to ${selected.name}`}
              type="button"
              disabled={selectedCurrent || Boolean(state.voyage || state.encounter || state.gameOver)}
              onClick={() => dispatch({ type: "startVoyage" })}
            >
              Sail
            </button>
          </div>
        </header>

        <FeedbackPulsePanel pulse={feedbackPulse} reducedMotion={reducedMotion} />

        <CaptainOrderPanel order={captainOrder} onRun={runCaptainOrder} />

        <div className="map-stack">
          <RouteCommand state={state} dispatch={dispatch} />
          <ContractStrip state={state} dispatch={dispatch} />
          <MapPortNav state={state} dispatch={dispatch} />
          <Suspense fallback={<div className="pixi-map" aria-label="Loading sea map" />}>
            <MapScene
              graphicsMode={graphicsMode}
              key={`${graphicsMode}-${reducedMotion ? "reduced" : "full"}`}
              state={state}
              onRuntimeError={recordRuntimeError}
              onSelectPort={(portId) => dispatch({ type: "selectPort", portId })}
            />
          </Suspense>
        </div>

        <section className="captain-log" aria-live="polite" aria-label="Captain log" data-testid="captain-log">
          <div id="captain-log">
            {state.log.map((item, index) => (
              <div className="log-row" key={`${item.day}-${index}`}>
                <strong>Day {item.day}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="port-panel" aria-label="Port desk">
        <header className="port-header">
          <p className="eyebrow">{state.encounter ? "Encounter" : state.voyage ? "Under sail" : selectedCurrent ? "Market desk" : "Route preview"}</p>
          <h2>{selected.name}</h2>
          <p>{selected.flavor}</p>
          <div className="port-identity-strip" data-testid="selected-port-identity">
            <span>{selectedPortRead.label}</span>
            <strong>{selectedPortRead.compact}</strong>
            <em>{selectedPortRead.detail}</em>
          </div>
        </header>

        <nav className="tabs" aria-label="Port sections" role="tablist">
          {(["market", "harbor", "contracts", "intel"] as TabId[]).map((tab) => (
            <button
              aria-controls="desk-content"
              aria-selected={state.tab === tab}
              className={`tab ${state.tab === tab ? "active" : ""}`}
              data-testid={`tab-${tab}`}
              id={`tab-${tab}`}
              key={tab}
              role="tab"
              type="button"
              onClick={() => dispatch({ type: "setTab", tab })}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <section
          id="desk-content"
          aria-labelledby={`tab-${state.tab}`}
          className="desk-content"
          ref={deskContentRef}
          role="tabpanel"
          tabIndex={-1}
        >
          <Desk state={state} dispatch={dispatch} settings={settings} />
        </section>
      </aside>
    </main>
  );
}

function Desk({ state, dispatch, settings }: { state: GameState; dispatch: Dispatch<ReactReducerAction>; settings: GameSettings }) {
  if (state.gameOver) {
    return <RunRecapDesk state={state} dispatch={dispatch} />;
  }

  if (state.encounter) return <EncounterDesk state={state} dispatch={dispatch} />;
  if (state.voyage) return <VoyageDesk state={state} />;
  if (state.tab === "harbor") return <HarborDesk state={state} dispatch={dispatch} />;
  if (state.tab === "contracts") return <ContractsDesk state={state} dispatch={dispatch} />;
  if (state.tab === "intel") return <IntelDesk state={state} dispatch={dispatch} settings={settings} />;
  return <MarketDesk state={state} dispatch={dispatch} />;
}

type ReactReducerAction = Parameters<typeof reduceGame>[1];

function ScorePressurePanel({ state, breakdown }: { state: GameState; breakdown: ScoreBreakdown }) {
  const pace = scorePaceFor(state, breakdown.total);
  return (
    <section className={`score-pressure tone-${pace.tone}`} aria-label="Score ledger" data-testid="score-ledger">
      <div className="score-pressure-title">
        <span>Score Pace</span>
        <strong>{pace.label}</strong>
        <em>{pace.detail}</em>
      </div>
      <div className="score-mini-grid">
        <ScoreMini label="Cargo" value={money(breakdown.cargoValue)} />
        <ScoreMini label="Hull" value={money(breakdown.activeShipValue + breakdown.spareShipValue + breakdown.hullValue)} />
        <ScoreMini label="Crew" value={money(breakdown.crewValue)} />
        <ScoreMini label="Debt" value={`-${money(breakdown.debtPenalty)}`} />
      </div>
    </section>
  );
}

function ScoreMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RunGoalsPanel({ state }: { state: GameState }) {
  const goals = runGoalsFor(state);
  return (
    <section className="run-goals" aria-label="Run goals" data-testid="run-goals">
      <div className="run-goals-title">
        <span>Run Arc</span>
        <strong>{goals.filter((goal) => goal.status === "done").length}/{goals.length}</strong>
      </div>
      <div className="run-goal-list">
        {goals.map((goal) => (
          <RunGoalRow goal={goal} key={goal.id} />
        ))}
      </div>
    </section>
  );
}

function RunGoalRow({ goal }: { goal: RunGoal }) {
  return (
    <div
      className={`run-goal status-${goal.status} tone-${goal.tone}`}
      data-goal-id={goal.id}
      data-goal-status={goal.status}
      title={goal.detail}
    >
      <span>{goal.label}</span>
      <strong>{goal.metric}</strong>
    </div>
  );
}

function RunRecapDesk({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const recap = runRecapFor(state);
  return (
    <div className="desk-stack run-recap" data-testid="run-recap">
      <section className={`run-recap-hero tone-${recap.rank.tone}`}>
        <span>Run Closed</span>
        <strong>{recap.rank.label}</strong>
        <p>{recap.rank.summary}</p>
        <em>{recap.replayPrompt}</em>
      </section>

      <ScoreBreakdownPanel breakdown={recap.score} />

      <section className="desk-block recap-ledger" aria-label="Run outcomes">
        <h3>Run Outcomes</h3>
        <CargoRow
          name={recap.comparison.label}
          value={`${recap.comparison.value} | ${recap.comparison.detail}`}
        />
        <CargoRow
          name="Contracts"
          value={`${recap.contracts.completed} closed | ${recap.contracts.failed} failed | ${recap.contracts.active} open`}
        />
        <CargoRow
          name="Delivery"
          value={`${recap.contracts.deliveredUnits}/${recap.contracts.totalUnits} units | ${money(recap.contracts.earnedReward)} earned`}
        />
        <CargoRow
          name="Trouble"
          value={`${recap.events.storms} water | ${recap.events.pirates} pirates | ${recap.events.customs} customs`}
        />
        <CargoRow
          name="Progress"
          value={`${recap.events.rankUps} rank beats | ${recap.events.upgrades} build beats`}
        />
      </section>

      <section className="replay-summary" aria-label="Replay summary" data-testid="replay-summary">
        <article className={`replay-summary-card tone-${recap.comparison.tone}`} data-testid="score-comparison">
          <span>{recap.comparison.label}</span>
          <strong>{recap.comparison.value}</strong>
          <em>{recap.comparison.detail}</em>
        </article>
        {recap.buildBadges.map((badge) => (
          <article className={`replay-summary-card tone-${badge.tone}`} data-build-badge-id={badge.id} data-testid={`build-badge-${badge.id}`} key={badge.id}>
            <span>{badge.label}</span>
            <strong>{badge.value}</strong>
            <em>{badge.detail}</em>
          </article>
        ))}
      </section>

      <section className="run-story" aria-label="Run story" data-testid="run-story">
        {recap.story.map((beat) => (
          <article className={`run-story-beat tone-${beat.tone}`} key={beat.label}>
            <span>{beat.label}</span>
            <strong>{beat.value}</strong>
            <em>{beat.detail}</em>
          </article>
        ))}
      </section>

      <section className="route-recap" aria-label="Route recap" data-testid="route-recap">
        {recap.routeRecap.map((route) => (
          <article className={`route-recap-card tone-${route.tone}`} data-route-recap-id={route.id} data-testid={`route-recap-${route.id}`} key={route.id}>
            <span>{route.label}</span>
            <strong>{route.value}</strong>
            <em>{route.detail}</em>
          </article>
        ))}
      </section>

      <section className="recap-highlights" aria-label="Run highlights">
        {recap.highlights.map((highlight) => (
          <div className={`recap-highlight tone-${highlight.tone}`} key={`${highlight.label}-${highlight.value}`}>
            <span>{highlight.label}</span>
            <strong>{highlight.value}</strong>
            <em>{highlight.detail}</em>
          </div>
        ))}
      </section>

      <section className="replay-hooks" aria-label="Replay hooks" data-testid="replay-hooks">
        {recap.replayHooks.map((hook) => (
          <article
            className={`replay-hook tone-${hook.tone}`}
            data-replay-hook-id={hook.id}
            data-replay-hook-setup={hook.setup}
            data-replay-hook-target={hook.target}
            data-testid={`replay-hook-${hook.id}`}
            key={hook.id}
          >
            <div>
              <span>{hook.label}</span>
              <strong>{hook.title}</strong>
              <em>{hook.detail}</em>
            </div>
            <p>{hook.target}</p>
            <p>{hook.setup}</p>
            <button
              data-testid={`start-hook-${hook.id}`}
              type="button"
              onClick={() => dispatch({ type: "newRun", best: state.best, replayHookId: hook.id })}
            >
              Start
            </button>
          </article>
        ))}
      </section>

      <div className="recap-actions">
        <button data-testid="start-new-run" type="button" onClick={() => dispatch({ type: "newRun", best: state.best })}>
          Start New Run
        </button>
      </div>
    </div>
  );
}

function ScoreBreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <section className="desk-block score-breakdown" aria-label="Score breakdown" data-testid="score-breakdown">
      <h3>Score Breakdown</h3>
      <ScoreLine label="Cash" value={money(breakdown.cash)} />
      <ScoreLine label={`Cargo (${breakdown.cargoUnits})`} value={money(breakdown.cargoValue)} />
      <ScoreLine label="Active Hull" value={money(breakdown.activeShipValue)} />
      <ScoreLine label={`Spare Hulls (${breakdown.spareShipCount})`} value={money(breakdown.spareShipValue)} />
      <ScoreLine label={`Refits (${breakdown.equipmentCount})`} value={money(breakdown.equipmentValue)} />
      <ScoreLine label={`Crew (${breakdown.crewCount})`} value={money(breakdown.crewValue)} />
      <ScoreLine label="Hull Condition" value={money(breakdown.hullValue)} />
      <ScoreLine label="Debt" value={`-${money(breakdown.debtPenalty)}`} danger />
      <div className="score-total">
        <span>Total</span>
        <strong>{money(breakdown.total)}</strong>
      </div>
    </section>
  );
}

function ScoreLine({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`score-line ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ContractStrip({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const contracts = getActiveContracts(state).slice(0, 4);
  if (!contracts.length) return null;

  return (
    <section className="contract-strip" aria-label="Active contract pressure" data-active-contracts={contracts.length}>
      {contracts.map((contract) => {
        const summary = contractSummary(contract);
        const status = contractCargoStatus(state, contract);
        const urgency = contractUrgency(state, contract);
        return (
          <button
            className={`contract-chip urgency-${urgency}`}
            data-testid={`contract-chip-${contract.id}`}
            key={contract.id}
            type="button"
            onClick={() => dispatch({ type: "selectPort", portId: contract.destinationPortId })}
          >
            <span>{summary.destinationName}</span>
            <strong>{contractPressureLabel(state, contract)}</strong>
            <em>{status.held}/{contract.units} {summary.goodName}</em>
          </button>
        );
      })}
    </section>
  );
}

function MapPortNav({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const busy = Boolean(state.voyage || state.encounter || state.gameOver);
  const selectPort = (portId: string) => dispatch({ type: "selectPort", portId });
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, portId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectPort(portId);
  };
  return (
    <nav className="map-port-nav" aria-label="Map port selection" data-testid="map-port-nav">
      {ports.map((port) => {
        const current = port.id === state.currentPort;
        const selected = port.id === state.selectedPort;
        const identity = portIdentityFor(port.id);
        return (
          <button
            aria-current={current ? "location" : undefined}
            aria-pressed={selected}
            className={`${current ? "current" : ""} ${selected ? "selected" : ""}`}
            data-testid={`map-port-${port.id}`}
            disabled={busy}
            key={port.id}
            title={`${portIdentityLine(port.id)} | ${identity.politics} | ${identity.visualCue}`}
            type="button"
            onClick={() => selectPort(port.id)}
            onKeyDown={(event) => handleKeyDown(event, port.id)}
          >
            <span>{port.name}</span>
            <em>{current ? "current" : selected ? "selected" : `${Math.round(port.risk * 100)}% | ${identity.mapTag}`}</em>
          </button>
        );
      })}
    </nav>
  );
}

function RouteCommand({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const busy = Boolean(state.voyage || state.encounter || state.gameOver);
  const selectedCurrent = current.id === selected.id;
  const routeChoices = recommendRouteChoices(state, current.id);
  const profitChoice = routeChoices.find((choice) => choice.kind === "profit");

  if (selectedCurrent) {
    const contractFocus = routeContractFocus(state, current.id);
    return (
      <section className="route-command idle" aria-label="Route command" data-testid="route-command">
        <div className="route-command-title">
          <span>Route Command</span>
          <strong>{contractFocus ? routeContractTitle(contractFocus) : "Pick a destination"}</strong>
          <em>{contractFocus ? routeContractDetail(contractFocus) : profitChoice ? `Profit pick: ${profitChoice.goodName} to ${portById(profitChoice.sellPortId).name} ${marginText(profitChoice.expectedProfit)}` : "No clean lane yet"}</em>
        </div>
        <div className="route-choice-grid" data-testid="route-choice-grid">
          {routeChoices.map((choice) => <RouteChoiceButton choice={choice} dispatch={dispatch} disabled={busy} key={choice.kind} selectedPortId={state.selectedPort} />)}
        </div>
        <div className="route-command-actions">
          <button
            data-testid="route-contract-action"
            type="button"
            disabled={!contractFocus || routeContractActionDisabled(contractFocus, busy)}
            title={contractFocus ? routeContractActionTitle(contractFocus) : "No contract cargo ready here"}
            onClick={() => contractFocus && runRouteContractAction(contractFocus, dispatch)}
          >
            {contractFocus ? routeContractActionLabel(contractFocus) : "Load"}
          </button>
          <button type="button" disabled={!contractFocus} onClick={() => dispatch({ type: "setTab", tab: "contracts" })}>Board</button>
          <button type="button" disabled>Sail</button>
        </div>
      </section>
    );
  }

  const conditions = routeConditions(state, current.id, selected.id);
  const wear = routeWearEstimate(state, current.id, selected.id);
  const days = routeDays(state, current.id, selected.id);
  const risk = routeRisk(state, current.id, selected.id);
  const cargoPlan = routeTradePlanFor(state, selected.id);
  const cargoOutcome = cargoArrivalOutcomeFor(state, selected.id);
  const plannedRouteProfit = cargoOutcome.margin + (cargoPlan ? cargoPlan.maxBuy * cargoPlan.riskAdjustedMargin : 0);
  const plannedRouteUnits = cargoOutcome.units + (cargoPlan?.maxBuy ?? 0);
  const crewRead = crewRouteReadFor(state, current.id, selected.id, {
    cargoUnits: plannedRouteUnits,
    expectedProfit: plannedRouteProfit,
  });
  const quote = insuranceQuoteFor(state);
  const policy = state.cargoInsurance;
  const routeWindow = routeWindowForecast(state, current.id, selected.id);
  const destinationRead = destinationReadFor(state, current.id, selected.id);
  const memory = routeMemorySummary(routeMemoryFor(state, current.id, selected.id));
  const contractFocus = routeContractFocus(state, selected.id);
  const offerFocus = contractFocus ? null : routeContractOfferFocus(state, selected.id);
  const physics = routePhysicsProfile(state, current.id, selected.id);
  const canLoad = Boolean(!contractFocus && !offerFocus && cargoPlan && cargoPlan.maxBuy > 0 && cargoPlan.riskAdjustedMargin > 0 && !busy);
  const canInsure = Boolean(quote && state.cash >= quote.policy.premium && !busy);

  return (
    <section className="route-command" aria-label="Route command" data-testid="route-command">
      <div className="route-command-title">
        <span>{conditions.sailPlanLabel} order</span>
        <strong>{current.name}{" -> "}{selected.name}</strong>
        <em>{conditions.tacticLabel} | {compactWindowText(routeWindow)} | {destinationRead.compact}</em>
      </div>
      <div className="route-command-grid">
        <RouteCommandMetric label="Transit" value={`${days}d ${Math.round(risk * 100)}%`} />
        <RouteCommandMetric label="Port" value={destinationRead.detail} />
        <RouteCommandMetric label="Water" value={`${compactWaterLabel(conditions.seaLabel)} ${signedPercent(conditions.speedDelta)}`} />
        <RouteCommandMetric label="Swell" value={`${conditions.seaStateLabel} ${Math.round(conditions.seaState.cargoSlam * 100)}%`} />
        <RouteCommandMetric label="Physics" value={physics.detail} />
        <RouteCommandMetric label="Crew" value={crewRead.compact} />
        <RouteCommandMetric label="Window" value={compactWindowText(routeWindow)} />
        <RouteCommandMetric label="Cargo" value={cargoPlan ? `${cargoPlan.goodName} ${marginText(cargoPlan.riskAdjustedMargin)}/u` : "No fit"} />
        {contractFocus ? <RouteCommandMetric label="Job" value={routeContractMetric(contractFocus)} /> : null}
        {offerFocus ? <RouteCommandMetric label="Offer" value={routeContractOfferMetric(offerFocus)} /> : null}
        <RouteCommandMetric label="Hold" value={cargoOutcome.units ? `${cargoOutcome.units}u @ ${Math.round(risk * 100)}% | ${marginText(cargoOutcome.margin)}` : "empty"} />
        <RouteCommandMetric label="Set" value={`${conditions.windLabel}/${conditions.currentLabel}`} />
        <RouteCommandMetric label="Posture" value={conditions.planAdvice} />
        <RouteCommandMetric label="Policy" value={policy ? insuranceStatusText(policy) : quote ? `${money(quote.policy.premium)} / ${money(quote.value)}` : "none"} />
        <RouteCommandMetric label="Authority" value={routeAuthorityLabel(state, selected.id)} />
        <RouteCommandMetric label="Memory" value={memory.compact} />
      </div>
      <div className="route-command-actions">
        <button
          data-testid={contractFocus ? "route-contract-action" : offerFocus ? "route-accept-contract" : "route-buy-best"}
          type="button"
          disabled={contractFocus ? routeContractActionDisabled(contractFocus, busy) : offerFocus ? routeContractOfferActionDisabled(state, busy) : !canLoad}
          title={
            contractFocus
              ? routeContractActionTitle(contractFocus)
              : offerFocus
                ? routeContractOfferActionTitle(offerFocus)
                : cargoPlan
                  ? `${cargoPlan.maxBuy} units fit by cash, stock, and hold`
                  : "No cargo recommendation"
          }
          onClick={() =>
            contractFocus
              ? runRouteContractAction(contractFocus, dispatch)
              : offerFocus
                ? dispatch({ type: "acceptContract", contractId: offerFocus.contract.id, source: "route" })
                : cargoPlan && dispatch({ type: "buyMaxGood", goodId: cargoPlan.goodId })
          }
        >
          {contractFocus ? routeContractActionLabel(contractFocus) : offerFocus ? routeContractOfferActionLabel(offerFocus) : "Load"}
        </button>
        <button data-testid="route-insure" type="button" disabled={!canInsure} onClick={() => dispatch({ type: "buyInsurance" })}>
          Insure
        </button>
        <button
          data-testid="route-sail"
          type="button"
          disabled={busy}
          onClick={() => dispatch({ type: "startVoyage" })}
        >
          Sail
        </button>
      </div>
    </section>
  );
}

function MarketDesk({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const stats = deriveShipStats(state);
  const atSelected = state.selectedPort === state.currentPort;
  const quote = insuranceQuoteFor(state);
  const brokerPacket = brokerPacketQuoteFor(state);
  const policy = state.cargoInsurance;
  const insuredValue = cargoInsurableValue(state);
  return (
    <div className="desk-stack">
      <div className="desk-block">
        <h3>{portById(state.currentPort).name} Market</h3>
        <p>Prices follow local supply, long trends, rumors, and faction politics.</p>
        <div className="upgrade-row">
          <span>Tide wait | {money(dockFeeFor(state))}</span>
          <button
            data-testid="wait-day"
            type="button"
            disabled={Boolean(state.voyage || state.encounter || state.gameOver)}
            onClick={() => dispatch({ type: "waitDay" })}
          >
            Wait
          </button>
        </div>
        <div className="upgrade-row">
          <span>
            {policy
              ? `Cargo policy | ${insuranceStatusText(policy)}`
              : quote
                ? `Cargo policy | ${money(quote.policy.premium)} | ${money(quote.value)} to ${portById(quote.policy.destinationPortId).name}`
                : `Cargo policy | ${insuredValue > 0 ? "plot a route" : "load cargo"}`}
          </span>
          <button
            data-testid="buy-insurance"
            type="button"
            disabled={!quote || state.cash < quote.policy.premium}
            onClick={() => dispatch({ type: "buyInsurance" })}
          >
            {policy ? "Covered" : "Insure"}
          </button>
        </div>
        <div className="upgrade-row">
          <span>
            {brokerPacket
              ? `${brokerPacket.label} | ${money(brokerPacket.cost)} | ${brokerPacket.detail}`
              : "Broker packet | plot a route or wait for a local buy window"}
          </span>
          <button
            data-testid="commission-broker-packet"
            type="button"
            disabled={!brokerPacket?.affordable || Boolean(state.voyage || state.encounter || state.gameOver)}
            onClick={() => dispatch({ type: "commissionBrokerPacket" })}
          >
            Packet
          </button>
        </div>
      </div>
      <div className="market-table">
        {goods.map((good) => {
          const price = priceFor(state, state.currentPort, good.id);
          const sellPrice = sellPriceFor(state, state.currentPort, good.id);
          const qty = state.cargo[good.id] || 0;
          const opportunity = tradeOpportunityForGood(state, good.id);
          const stock = marketStockLevel(state, state.currentPort, good.id);
          const pressure = freightPressureSignalFor(state, state.currentPort, good.id);
          const forecast = marketForecastFor(state, state.currentPort, good.id);
          const history = marketHistorySignalFor(state, state.currentPort, good.id);
          const access = marketAccessForGood(state, state.currentPort, good.id);
          const holdRoom = Math.max(0, stats.cargoCap - cargoUnits(state));
          const maxBuyUnits = Math.max(0, Math.min(access.availableStock, Math.floor(holdRoom / good.cargo), Math.floor(state.cash / Math.max(1, price))));
          const basis = state.cargoBasis[good.id] ?? sellPrice;
          const heldMargin = (sellPrice - basis) * qty;
          const canBuy = atSelected && access.allowed && access.availableStock > 0 && state.cash >= price && cargoUnits(state) + good.cargo <= stats.cargoCap;
          const canBuyMax = atSelected && maxBuyUnits > 0;
          const canSell = atSelected && qty > 0;
          return (
            <div className="market-row" data-testid={`market-row-${good.id}`} key={good.id}>
              <div className="good-name">
                <strong>{good.name}</strong>
                <span>{good.note} | {trendText(state, good.id)} | {marketStockText(stock)} | {access.label}</span>
                <em
                  className={`market-pulse market-pulse-${forecast.kind}`}
                  data-market-forecast-kind={forecast.kind}
                  data-market-forecast-delta={forecast.expectedDeltaPercent}
                  data-market-forecast-confidence={forecast.confidence}
                  data-testid={`market-pulse-${good.id}`}
                >
                  {forecast.label} | {forecast.detail} | conf {Math.round(forecast.confidence * 100)}%
                </em>
                <em>{opportunityLabel(opportunity)} | local bid {money(sellPrice)}</em>
                <em
                  data-market-history-direction={history.direction}
                  data-market-history-percent={history.percent}
                  data-market-history-samples={history.sampleCount}
                  data-testid={`market-history-${good.id}`}
                >
                  {history.label} | {history.detail}
                </em>
                <em>{pressure.label} | {pressure.detail}</em>
                <em>{access.reason}{access.availableStock !== stock.stock ? ` | allotment ${access.availableStock}` : ""}</em>
                {qty > 0 ? <em>Held basis {money(basis)} | mark {marginText(heldMargin)}</em> : null}
              </div>
              <div className="market-actions">
                <div className="price">{money(price)}</div>
                <div className="owned">{qty}</div>
                <button data-testid={`buy-${good.id}`} type="button" disabled={!canBuy} onClick={() => dispatch({ type: "buyGood", goodId: good.id })}>Buy</button>
                <button
                  data-testid={`buy-max-${good.id}`}
                  type="button"
                  disabled={!canBuyMax}
                  title={`${maxBuyUnits} by cash, stock, and hold`}
                  onClick={() => dispatch({ type: "buyMaxGood", goodId: good.id })}
                >
                  Max
                </button>
                <button data-testid={`sell-${good.id}`} type="button" disabled={!canSell} onClick={() => dispatch({ type: "sellGood", goodId: good.id })}>Sell</button>
                <button data-testid={`sell-all-${good.id}`} type="button" disabled={!canSell} onClick={() => dispatch({ type: "sellAllGood", goodId: good.id })}>All</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HarborDesk({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const stats = deriveShipStats(state);
  const repairCost = repairCostFor(state);
  const payroll = crewWeeklyWage(state);
  const moraleTier = crewMoraleTier(state.crewMorale);
  const leaveCost = shoreLeaveCost(state);
  const crewFacility = crewFacilityFor(state);
  const crewDrill = crewFacilityDrillFor(state);
  const canShoreLeave = state.crew.length > 0 && state.crewMorale < 100 && state.cash >= leaveCost;
  const localFaction = factions.find((faction) => faction.id === portById(state.currentPort).faction) ?? factions[0];
  const localStanding = state.factionStanding[localFaction.id] ?? 0;
  const upgradeTiming = nextUpgradeTiming(state);
  const refitRecommendations = equipmentRecommendationsFor(state, 3);
  const activeBuildFits = topBuildFitsForStats(stats, state.currentShip, 2);
  return (
    <div className="desk-stack">
      <div className="desk-block">
        <div className="desk-heading-token">
          <IdentityToken identity={factionIdentityForPortFaction(localFaction)} size="small" testId="shipyard-faction-token" />
          <h3>Shipyard</h3>
        </div>
        <p>
          {localFaction.name} yard. {authoritySummary(localStanding, hasMarketPermitForFaction(state, localFaction.id))}. Build: {buildFitText(activeBuildFits)}. Payroll {money(payroll)} on day {nextCrewPayday(state.day)}.
          {" "}Facility: {crewFacility.label}.
        </p>
        <div className="upgrade-row">
          <span>Repair 15 hull | {money(repairCost)}</span>
          <button type="button" disabled={repairCost <= 0 || state.cash < repairCost} onClick={() => dispatch({ type: "repair" })}>Repair</button>
        </div>
        <div className="upgrade-row">
          <span>Shore leave | {money(leaveCost)} | {state.crew.length ? `${moraleTier.label} ${state.crewMorale}` : "no crew"} | {crewFacility.label}</span>
          <button
            data-testid="shore-leave"
            type="button"
            disabled={!canShoreLeave}
            onClick={() => dispatch({ type: "shoreLeave" })}
          >
            Leave
          </button>
        </div>
        <div className="upgrade-row" data-testid="upgrade-timing">
          <span>
            {upgradeTiming
              ? `${upgradeTiming.label} | ${upgradeTiming.name} | ${upgradeTiming.gap ? `${money(upgradeTiming.gap)} short` : upgradeTiming.detail}`
              : "Fleet complete | spend on crew and permits"}
          </span>
          <span className="price">{upgradeTiming ? money(upgradeTiming.price) : "ready"}</span>
        </div>
        <div
          className="upgrade-row"
          data-drill-facility={crewDrill.facilityId}
          data-drill-xp={crewDrill.crewXp}
          data-testid="crew-facility"
        >
          <span>{crewFacility.label} | {crewFacilitySummary(state)}</span>
          <span className="price">{crewDrill.available ? money(crewDrill.cost) : crewDrill.reason}</span>
          <button
            data-testid="crew-drill"
            disabled={!crewDrill.available}
            title={`${crewDrill.label}: ${crewDrill.detail}`}
            type="button"
            onClick={() => dispatch({ type: "crewDrill" })}
          >
            Drill
          </button>
        </div>
      </div>

      <BuildSynergiesBlock state={state} />

      <CatalogBlock title="Captain Skills">
        {captainSkillCatalog.map((skill) => {
          const level = state.captainSkills[skill.id] ?? 0;
          const maxed = level >= captainSkillLimit;
          const cost = skillTrainingCost(level);
          const mastery = captainSkillMasteryFor(skill.id);
          const masteryActive = hasCaptainSkillMastery(state, skill.id);
          return (
            <div className="catalog-row" key={skill.id}>
              <div>
                <strong>{skill.name}</strong>
                <span>{skill.note}</span>
                <span>{masteryActive ? `${mastery.label}: ${mastery.liveEffect}` : captainSkillProgressLabel(state, skill.id)}</span>
              </div>
              <span>{maxed ? `Lv ${level} | mastery` : `Lv ${level} | ${cost} pt`}</span>
              <button
                data-testid={`train-skill-${skill.id}`}
                type="button"
                disabled={maxed || state.skillPoints < cost}
                onClick={() => dispatch({ type: "trainSkill", skillId: skill.id })}
              >
                {maxed ? "Max" : "Train"}
              </button>
            </div>
          );
        })}
      </CatalogBlock>

      <CatalogBlock title="Ships">
        <div className="ship-grid">
          {shipCatalog.map((ship) => {
            const preview = previewShip(state, ship.id);
            if (!preview) return null;
            const disabled = preview.active || !preview.affordable || !preview.cargoFits;
            const yardPrice = yardPriceFor(state, ship);
            const resaleValue = yardResaleValueFor(state, ship);
            const canSellShip = preview.owned && !preview.active && ship.price > 0;
            return (
              <div className={`ship-card ${preview.active ? "active" : ""}`} data-testid={`ship-card-${ship.id}`} key={ship.id}>
                <div className="ship-card-art">
                  {ship.asset ? <img src={ship.asset} alt="" /> : null}
                  <span>{preview.active ? "Active" : preview.owned ? "Owned" : money(yardPrice)}</span>
                </div>
                <div className="ship-card-body">
                  <div className="ship-card-title">
                    <strong>{ship.name}</strong>
                    <span>{yardSourceLabel(state, ship)}</span>
                    <span>{preview.identity}</span>
                    <span>{ship.note}</span>
                    <span>{preview.upgradePath}</span>
                    <span>{preview.handlingLabel} | {preview.resaleProfile}</span>
                  </div>
                  <div className="ship-stat-strip">
                    <span><strong>{preview.stats.cargoCap}</strong> hold</span>
                    <span><strong>{preview.stats.speed}</strong> speed</span>
                    <span><strong>{preview.stats.openWater}</strong> water</span>
                    <span><strong>{preview.stats.cannons}</strong> guns</span>
                  </div>
                  <BuildBadgeStrip fits={preview.buildFits} deltas={preview.buildDelta} testId={`ship-build-${ship.id}`} />
                  {preview.route ? (
                    <p className="ship-route-fit">
                      Selected lane: {preview.route.days}d | {Math.round(preview.route.risk * 100)}% | {preview.route.wear.hullWear} wear | {preview.route.speedDelta >= 0 ? "+" : ""}{preview.route.speedDelta}% | {routeDeltaText(preview.routeDelta)}
                    </p>
                  ) : (
                    <p className="ship-route-fit">Select a lane to compare route fit.</p>
                  )}
                  <div className="ship-card-actions">
                    <span>{!preview.cargoFits ? "Unload cargo" : canSellShip ? `Sale ${money(resaleValue)}` : preview.owned ? "Ready" : money(yardPrice)}</span>
                    <button
                      data-testid={`ship-action-${ship.id}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => dispatch({ type: "buyShip", shipId: ship.id })}
                    >
                      {preview.active ? "Active" : preview.owned ? "Command" : "Buy"}
                    </button>
                    {canSellShip ? (
                      <button
                        data-testid={`sell-ship-${ship.id}`}
                        type="button"
                        onClick={() => dispatch({ type: "sellShip", shipId: ship.id })}
                      >
                        Sell
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CatalogBlock>

      <CatalogBlock title="Recommended Refit">
        <div className="refit-recommendations" data-testid="recommended-refits">
          {refitRecommendations.map((recommendation) => {
            const disabled = !recommendation.affordable || !recommendation.cargoFits || !recommendation.crewFits;
            const reason = recommendation.affordable ? recommendation.reason : `${money(recommendation.gap)} short`;
            return (
              <div className="equipment-card recommended" data-testid={`recommended-refit-${recommendation.item.id}`} key={recommendation.item.id}>
                <div>
                  <strong>{recommendation.item.name}</strong>
                  <span>{reason} | {equipmentSlotLabels[recommendation.item.slot]} slot | score {recommendation.score}</span>
                  <em>{effectText(recommendation.delta)}{recommendation.fitLabel ? ` | ${recommendation.fitLabel}` : ""}</em>
                  <BuildBadgeStrip fits={recommendation.buildFits} deltas={recommendation.buildDelta} testId={`recommended-build-${recommendation.item.id}`} />
                  <em>{refitRouteDeltaText(recommendation.routeDelta)}</em>
                  <em>{recommendation.replacing ? `Replaces ${recommendation.replacing.name}` : recommendation.item.note}</em>
                </div>
                <span>{recommendation.affordable ? money(recommendation.price) : `${money(recommendation.gap)} short`}</span>
                <button
                  data-testid={`recommended-refit-action-${recommendation.item.id}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => dispatch({ type: "buyEquipment", equipmentId: recommendation.item.id })}
                >
                  {recommendation.replacing ? "Replace" : "Buy"}
                </button>
              </div>
            );
          })}
        </div>
      </CatalogBlock>

      <CatalogBlock title="Equipment">
        {equipmentCatalog.map((item) => {
          const owned = state.equipment.includes(item.id);
          const occupying = equipmentInSlot(state, item.slot);
          const replacing = Boolean(occupying && occupying.id !== item.id);
          const nextEquipment = installEquipmentIds(state.equipment, item);
          const removedEquipment = state.equipment.filter((id) => id !== item.id);
          const nextStats = deriveShipStats({ ...state, equipment: nextEquipment });
          const removedStats = deriveShipStats({ ...state, equipment: removedEquipment });
          const cargoFits = cargoUnits(state) <= nextStats.cargoCap;
          const crewFits = state.crew.length <= nextStats.crewCap;
          const removalFits = cargoUnits(state) <= removedStats.cargoCap && state.crew.length <= removedStats.crewCap;
          const yardPrice = yardPriceFor(state, item);
          const resaleValue = yardResaleValueFor(state, item);
          const fitBonus = equipmentFitBonusFor(state.currentShip, item);
          const facilityPreview = item.slot === "quarters" ? crewFacilitySummary({ equipment: nextEquipment }) : null;
          const refitPreview = equipmentRecommendationFor(state, item);
          const disabled = owned ? !removalFits : state.cash < yardPrice || !cargoFits || !crewFits;
          return (
            <div className={`equipment-card ${owned ? "active" : ""}`} data-testid={`equipment-card-${item.id}`} key={item.id}>
              <div className="crew-copy">
                <strong>{item.name}</strong>
                <span>{equipmentSlotLabels[item.slot]} slot | {yardSourceLabel(state, item)}</span>
                <em>{effectText(item.effects)}</em>
                <em>{fitBonus ? `${fitBonus.label}: ${effectText(fitBonus.effects)}` : "Standard hull fit"}</em>
                <BuildBadgeStrip fits={refitPreview.buildFits} deltas={refitPreview.buildDelta} testId={`equipment-build-${item.id}`} />
                <em>{refitRouteDeltaText(refitPreview.routeDelta)}</em>
                {facilityPreview ? <em>Crew facility: {facilityPreview}</em> : null}
                <em>{item.note}</em>
              </div>
              <span>{owned ? `Sale ${money(resaleValue)}` : replacing ? `Replaces ${occupying?.name}` : money(yardPrice)}</span>
              <button
                data-testid={`equipment-action-${item.id}`}
                type="button"
                disabled={disabled}
                onClick={() => dispatch(owned ? { type: "sellEquipment", equipmentId: item.id } : { type: "buyEquipment", equipmentId: item.id })}
              >
                {owned ? "Sell" : replacing ? "Replace" : "Buy"}
              </button>
            </div>
          );
        })}
      </CatalogBlock>

      <CatalogBlock title="Crew">
        {crewCatalog.map((crew) => {
          const hired = state.crew.includes(crew.id);
          const identity = crewIdentityArtFor(crew.id);
          const xp = state.crewXp?.[crew.id] ?? 0;
          const rank = crewRankFor(xp);
          const specialty = crewSpecialtyFor(crew.id, xp);
          const traits = crewTraitsFor(state, crew.id);
          const profile = crewProfileFor(state, crew.id);
          const nextXp = crewXpToNext(xp);
          const wage = crewWageFor(crew.id, xp);
          const dismissalCost = crewDismissalCost(state, crew.id);
          return (
            <div
              className="catalog-row crew-row"
              data-crew-demand={hired ? profile.demand : undefined}
              data-crew-preference={hired ? profile.preference : undefined}
              data-crew-strain={hired ? profile.strain : undefined}
              key={crew.id}
            >
              <IdentityToken identity={identity} size="medium" testId={`crew-token-${crew.id}`} />
              <div>
                <strong>{crew.name}</strong>
                <span>{crew.note}</span>
                <em>
                  {specialty.text} | {effectText(crew.effects)}
                </em>
                {hired ? (
                  <em title={crewTraitDetail(traits)}>
                    Traits: {crewTraitSummary(traits)}
                  </em>
                ) : null}
                {hired ? (
                  <em data-testid={`crew-identity-${crew.id}`} title={crewProfileDetail(profile)}>
                    Identity: {crewProfileSummary(profile)}
                  </em>
                ) : null}
                <em>
                  {hired
                    ? `${xp} XP${nextXp ? ` | ${nextXp} next` : ""} | payroll ${money(wage)}/wk | severance ${money(dismissalCost)}`
                    : `${specialty.detail} | ${money(crew.wage)}/wk`}
                </em>
              </div>
              <span>{hired ? `${rank.label}` : money(crew.cost)}</span>
              <div className="crew-actions">
                {hired ? (
                  <button
                    data-testid={`dismiss-crew-${crew.id}`}
                    type="button"
                    disabled={state.cash < dismissalCost}
                    onClick={() => dispatch({ type: "dismissCrew", crewId: crew.id })}
                  >
                    Dismiss
                  </button>
                ) : (
                  <button
                    data-testid={`hire-crew-${crew.id}`}
                    type="button"
                    disabled={state.cash < crew.cost || state.crew.length >= stats.crewCap}
                    onClick={() => dispatch({ type: "hireCrew", crewId: crew.id })}
                  >
                    Hire
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </CatalogBlock>

      <div className="desk-block">
        <h3>Broker</h3>
        <p>Borrowing keeps you moving, but interest hits every ten days.</p>
        <button data-testid="borrow-credit" type="button" onClick={() => dispatch({ type: "borrow" })}>Borrow $400</button>
      </div>
    </div>
  );
}

function BuildSynergiesBlock({ state }: { state: GameState }) {
  const progress = topBuildSynergyProgressFor(state, 4);
  return (
    <CatalogBlock title="Build Synergies">
      {progress.map((synergy) => (
        <div
          className={`catalog-row build-synergy-row ${synergy.active ? "active" : ""}`}
          data-build-synergy-active={synergy.active ? "true" : "false"}
          data-build-synergy-id={synergy.id}
          data-testid={`build-synergy-${synergy.id}`}
          key={synergy.id}
          title={synergy.detail}
        >
          <div>
            <strong>{synergy.label}</strong>
            <span>{synergy.summary} | {buildSynergyLabelForEffects(synergy.effects)}</span>
            <em>{synergy.active ? synergy.detail : `Missing: ${synergy.missing.slice(0, 2).join(", ")}`}</em>
          </div>
          <span>{synergy.active ? "Active" : `${synergy.progress}/${synergy.requirementCount}`}</span>
        </div>
      ))}
    </CatalogBlock>
  );
}

function ContractsDesk({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const activeContracts = getActiveContracts(state);
  const availableContracts = state.contracts.filter(
    (contract) => contract.status === "available" && contract.originPortId === state.currentPort
  );
  const recentContracts = state.contracts
    .filter((contract) => contract.status === "completed" || contract.status === "failed")
    .slice(0, 4);
  const phase = runPhaseForDay(state.day);
  const localFaction = factions.find((faction) => faction.id === portById(state.currentPort).faction) ?? factions[0];
  const localStanding = state.factionStanding[localFaction.id] ?? 0;
  const localSlots = contractBoardSlotsForPort(state, state.currentPort);

  return (
    <div className="desk-stack">
      <div className="desk-block">
        <div className="desk-heading-token">
          <IdentityToken identity={factionIdentityForPortFaction(localFaction)} size="small" testId="contract-board-faction-token" />
          <h3>Contract Board</h3>
        </div>
        <p data-testid="run-pacing">{phase.label}: {phase.summary}.</p>
        <p>{localFaction.name} {contractQualityLabel(localStanding)} | {availableContracts.length}/{localSlots} listings | {standingSummary(localStanding)}</p>
      </div>

      <CatalogBlock title="Active">
        {activeContracts.length ? (
          activeContracts.map((contract) => (
            <ContractRow key={contract.id} state={state} contractId={contract.id} dispatch={dispatch} mode="active" />
          ))
        ) : (
          <CargoRow name="No active contracts" value="take work below" />
        )}
      </CatalogBlock>

      <CatalogBlock title={`${portById(state.currentPort).name} Offers`}>
        {availableContracts.length ? (
          availableContracts.map((contract) => (
            <ContractRow key={contract.id} state={state} contractId={contract.id} dispatch={dispatch} mode="available" />
          ))
        ) : (
          <CargoRow name="No local offers" value="sail or wait" />
        )}
      </CatalogBlock>

      <CatalogBlock title="Recent">
        {recentContracts.length ? (
          recentContracts.map((contract) => {
            const summary = contractSummary(contract);
            return (
              <CargoRow
                key={contract.id}
                name={`${summary.destinationName} ${summary.goodName}`}
                value={contract.status === "completed" ? `paid ${money(contract.reward)}` : `failed ${money(contract.penalty)}`}
              />
            );
          })
        ) : (
          <CargoRow name="No completed work" value="yet" />
        )}
      </CatalogBlock>
    </div>
  );
}

function ContractRow({
  state,
  contractId,
  dispatch,
  mode,
}: {
  state: GameState;
  contractId: string;
  dispatch: Dispatch<ReactReducerAction>;
  mode: "active" | "available";
}) {
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract) return null;
  const summary = contractSummary(contract);
  const cargoStatus = contractCargoStatus(state, contract);
  const urgency = contractUrgency(state, contract);
  const pacing = contractPacingLabel(state, contract);
  const kind = contractKindLabel(contract);
  const routeSummary = contractRouteSummary(contract);
  const plan = contractPlanSummary(state, contract);
  const fit = contractRouteFitSummary(state, contract);
  const deadlinePressure = deadlinePressureText(cargoStatus.daysLeft);
  const chainLabel = contractChainLabel(contract);
  const chainReward = contractChainRewardText(contract);
  const headline = chainLabel ?? summary.factionName;
  const identity = contractIdentityFor(contract);
  const detail =
    mode === "available"
      ? `${kind} | ${routeSummary} | by day ${contract.deadline} | ${pacing}`
      : `${kind} | ${routeSummary} | delivered ${cargoStatus.delivered}/${cargoStatus.totalUnits}; reward ${money(contract.reward)} | ${pacing}`;
  const valueText = mode === "available" ? `${money(contract.reward)} | ${fit.label}` : contractPressureLabel(state, contract);

  return (
    <div
      className={`contract-row kind-${contract.kind ?? "standard"} urgency-${urgency} ${contract.chain ? "chain-contract" : ""}`}
      data-contract-id={contract.id}
      data-chain-id={contract.chain?.id}
      data-chain-stage={contract.chain ? `${contract.chain.stage}/${contract.chain.stages}` : undefined}
      data-contract-chain={contract.chain?.id}
      data-contract-giver={contract.chain?.giver}
      data-contract-stage={contract.chain ? `${contract.chain.stage}/${contract.chain.stages}` : undefined}
      data-cargo-cost={fit.cargoCost}
      data-deadline-slack={fit.deadlineSlack}
      data-destination-upside={fit.destinationUpsidePerUnit}
      data-hold-after={fit.holdAfter}
      data-route-fit={fit.label}
      data-route-risk={fit.routeRisk.toFixed(3)}
      data-testid={`contract-row-${contract.id}`}
    >
      <IdentityToken
        identity={identity}
        size="medium"
        testId={contract.chain ? `contract-giver-token-${contract.chain.id}` : `contract-faction-token-${contract.factionId}`}
      />
      <div className="contract-copy">
        <strong>{headline}</strong>
        <span>{detail}</span>
        {contract.chain ? <em className="contract-chain-note">{contract.chain.hook} {chainReward ? `Reward: ${chainReward}.` : ""}</em> : null}
        {!contract.chain && contract.brief ? <em className="contract-chain-note">{contract.brief}</em> : null}
        <em>{contractPlanText(plan)}</em>
        <ContractPlanGrid contractId={contract.id} fit={fit} plan={plan} />
      </div>
      <span className="contract-value">{valueText}</span>
      <div className="contract-actions">
        {mode === "available" ? (
          <button
            data-testid={`accept-contract-${contract.id}`}
            type="button"
            onClick={() => dispatch({ type: "acceptContract", contractId: contract.id })}
          >
            Accept
          </button>
        ) : (
          <button
            data-testid={`complete-contract-${contract.id}`}
            type="button"
            disabled={!cargoStatus.ready}
            onClick={() => dispatch({ type: "completeContract", contractId: contract.id })}
          >
            Complete
          </button>
        )}
        <button
          data-testid={`plot-contract-${contract.id}`}
          type="button"
          onClick={() => dispatch({ type: "selectPort", portId: contract.destinationPortId })}
        >
          Plot
        </button>
      </div>
    </div>
  );
}

function ContractPlanGrid({
  contractId,
  fit,
  plan,
}: {
  contractId: string;
  fit: ReturnType<typeof contractRouteFitSummary>;
  plan: ReturnType<typeof contractPlanSummary>;
}) {
  const slackText = fit.deadlineSlack >= 0 ? `${fit.deadlineSlack}d slack` : `${Math.abs(fit.deadlineSlack)}d late`;
  const riskText = `${fit.routeDays}d | ${Math.round(fit.routeRisk * 100)}% | ${fit.routeWear} wear`;
  const cargoText = fit.requiredCargo > 0 ? `${fit.requiredCargo} ${goodName(plan.stop.goodId)} | ${money(fit.cargoCost)}` : "cargo aboard";
  const upsideText = plan.destinationImport ? `import +${money(Math.max(0, fit.destinationUpsidePerUnit))}/u` : `${marginText(fit.destinationUpsidePerUnit)}/u`;

  return (
    <div className="contract-plan-grid" data-testid={`contract-route-plan-${contractId}`}>
      <ContractPlanCell label="Fit" value={fit.label} />
      <ContractPlanCell label="Cargo" value={cargoText} />
      <ContractPlanCell label="Slack" value={slackText} />
      <ContractPlanCell label="Risk" value={riskText} />
      <ContractPlanCell label="Hold" value={`${fit.holdAfter}/${fit.holdCapacity}`} />
      <ContractPlanCell label="Upside" value={upsideText} />
    </div>
  );
}

function ContractPlanCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="contract-plan-cell">
      <b>{label}</b>
      <small>{value}</small>
    </span>
  );
}

function BuildBadgeStrip({
  deltas = [],
  fits,
  testId,
}: {
  deltas?: Array<{ delta: number; id: string; label: string; score: number }>;
  fits: Array<{ id?: string; label: string; score: number }>;
  testId: string;
}) {
  const deltaById = new Map(deltas.map((entry) => [entry.id, entry.delta]));
  return (
    <div className="build-badge-strip" data-testid={testId}>
      {fits.map((fit) => {
        const delta = (fit.id ? deltaById.get(fit.id) : undefined) ?? deltas.find((entry) => entry.label === fit.label)?.delta ?? 0;
        return (
          <span className={delta > 0 ? "positive" : delta < 0 ? "negative" : ""} key={fit.label}>
            <b>{fit.label}</b>
            <small>{delta ? `${delta > 0 ? "+" : ""}${delta}` : fit.score}</small>
          </span>
        );
      })}
    </div>
  );
}

function DesktopInfoGrid({ info }: { info: HarborlineDesktopStorageInfo | null }) {
  const runtime = info?.kind === "electron" ? "Electron" : "Browser";
  const savePath = info?.basePath || "Browser local storage";
  const logsPath = info?.logsPath || "Browser runtime log";
  return (
    <div className="desktop-info-grid" data-testid="desktop-info">
      <span>
        <b>App</b>
        <small data-testid="desktop-info-app">{info?.appName || "Harborline"}</small>
      </span>
      <span>
        <b>Runtime</b>
        <small data-testid="desktop-info-runtime">{runtime}</small>
      </span>
      <span>
        <b>Version</b>
        <small data-testid="desktop-info-version">{info?.version || "dev"}</small>
      </span>
      <span>
        <b>Recovery</b>
        <small data-testid="desktop-info-recovery">Backed up before risky saves</small>
      </span>
      <span>
        <b>Notes</b>
        <small><a data-testid="release-notes-link" href="#release-notes">0.1.0 slice notes</a></small>
      </span>
      <span className="wide">
        <b>Saves</b>
        <small data-testid="desktop-info-save-path" title={savePath}>{savePath}</small>
      </span>
      <span className="wide">
        <b>Logs</b>
        <small data-testid="desktop-info-log-path" title={logsPath}>{logsPath}</small>
      </span>
    </div>
  );
}

function PlaytestCollectionFiles({ info }: { info: HarborlineDesktopStorageInfo | null }) {
  const latestTarget = playtestCollectionTarget(info, desktopStorageFiles.playtestArtifact, playtestArtifactKey);
  const historyTarget = playtestCollectionTarget(info, desktopStorageFiles.playtestHistory, playtestHistoryKey);
  return (
    <div className="playtest-collection-files" data-testid="playtest-collection-files">
      <span>Collect files</span>
      <small data-testid="playtest-latest-file" title={latestTarget}>Latest: {latestTarget}</small>
      <small data-testid="playtest-history-file" title={historyTarget}>History: {historyTarget}</small>
    </div>
  );
}

function playtestCollectionTarget(info: HarborlineDesktopStorageInfo | null, fileName: string, browserKey: string) {
  return info?.basePath ? `${info.basePath}/${fileName}` : `Browser local storage: ${browserKey}`;
}

function IntelDesk({ state, dispatch, settings }: { state: GameState; dispatch: Dispatch<ReactReducerAction>; settings: GameSettings }) {
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const conditions = current.id === selected.id ? null : routeConditions(state, current.id, selected.id);
  const routeWear = conditions ? routeWearEstimate(state, current.id, selected.id) : null;
  const routeWindow = conditions ? routeWindowForecast(state, current.id, selected.id) : null;
  const routeForecast = routeWindow?.windows ?? [];
  const physicsDebug = conditions && readPhysicsDebugPreference() ? routePhysicsDebugFor(state, current.id, selected.id) : null;
  const worldPulse = worldEventPreviews(state, 4);
  const arrivalPulse = conditions
    ? arrivalEventPreviews(
        state,
        {
          voyage: {
            fromId: current.id,
            toId: selected.id,
            days: routeDays(state, current.id, selected.id),
            risk: routeRisk(state, current.id, selected.id),
            sailPlan: state.sailPlan,
            progress: 1,
            duration: 1,
          },
          physics: routePhysicsProfile(state, current.id, selected.id),
          projectedProfit: cargoArrivalOutcomeFor(state, selected.id, current.id).margin,
        },
        4
      )
    : [];
  const stormFronts = stormFrontsForDay(state.day);
  const routeChoices = recommendRouteChoices(state, state.currentPort);
  const opportunities = topTradeOpportunities(state, state.currentPort, 4);
  const movingMarkets = topMarketHistorySignals(state, 5);
  const factionWatch = topFactionPressureSignals(state, 4);
  const rememberedRoutes = Object.values(state.routeMemory)
    .sort((left, right) => right.lastDay - left.lastDay)
    .slice(0, 5);
  const currentFaction = factions.find((faction) => faction.id === current.faction) ?? factions[0];
  const standing = state.factionStanding[currentFaction.id] ?? 0;
  const hasPermit = hasMarketPermitForFaction(state, currentFaction.id);
  const permitCost = politicalActionCost(politicalActionCosts.permitCash, standing, "permit");
  const convoyCost = politicalActionCost(politicalActionCosts.convoyCash, standing, "convoy");
  const canBuyPermit = state.cash >= permitCost && !state.voyage && !state.encounter && !state.gameOver;
  const canRequestConvoy =
    state.cash >= convoyCost &&
    standing >= politicalActionCosts.convoyMinimumStanding &&
    !state.voyage &&
    !state.encounter &&
    !state.gameOver;
  const factionFavor = factionFavorQuoteFor(state);
  return (
    <div className="desk-stack">
      <div className="desk-block">
        <h3>Route Board</h3>
        {conditions ? (
          <>
            <p>{current.name} to {selected.name}: {routeDays(state, current.id, selected.id)} days, {Math.round(routeRisk(state, current.id, selected.id) * 100)}% pirate risk.</p>
            <div className="route-metrics">
              <Metric label="Wind" value={conditions.windLabel} />
              <Metric label="Current" value={conditions.currentLabel} />
              <Metric label="Sea" value={conditions.seaLabel} />
              <Metric label="Swell" value={`${conditions.seaStateLabel} | ${Math.round(conditions.seaState.cargoSlam * 100)}% slam`} />
              <Metric label="Storm" value={`${conditions.stormLabel} ${Math.round(conditions.stormIntensity * 100)}%`} />
              <Metric label="Wear" value={`${routeWear?.hullWear ?? 0} hull`} />
              <Metric label="Speed" value={signedPercent(conditions.speedDelta)} />
              <Metric label="Tactic" value={conditions.tacticLabel} />
              <Metric label="Forces" value={conditions.tacticDetail} />
              <Metric label="Window" value={routeWindow?.advice ?? "No forecast"} />
              <Metric label="Hull" value={conditions.handlingLabel} />
            </div>
          </>
        ) : (
          <p>Select a destination on the map to preview travel risk.</p>
        )}
      </div>

      {routeForecast.length ? (
        <CatalogBlock title="Route Forecast">
          {routeForecast.map((forecast) => (
            <CargoRow
              key={forecast.day}
              name={`Day ${forecast.day}`}
              value={`${forecast.days}d | ${forecast.riskPercent}% | ${forecast.wear} wear | ${forecast.stormLabel} | ${forecast.speedDelta >= 0 ? "+" : ""}${forecast.speedDelta}% | ${forecast.tacticLabel}`}
            />
          ))}
        </CatalogBlock>
      ) : null}

      {physicsDebug ? <PhysicsDebugPanel debug={physicsDebug} /> : null}

      <CatalogBlock title="Route Memory">
        {rememberedRoutes.length ? (
          rememberedRoutes.map((memory) => {
            const summary = routeMemorySummary(memory);
            return (
              <CargoRow
                key={`${memory.fromId}-${memory.toId}`}
                name={`${portById(memory.fromId).name} -> ${portById(memory.toId).name}`}
                value={`${summary.label} | ${summary.detail}`}
              />
            );
          })
        ) : (
          <CargoRow name="Unwritten water" value="sail a lane to mark the chart" />
        )}
      </CatalogBlock>

      <CatalogBlock title="Storm Fronts">
        {stormFronts.map((front) => (
          <CargoRow
            key={front.id}
            name={front.name}
            value={`${Math.round(front.intensity * 100)}% | radius ${Math.round(front.radius * 100)}%`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Freight Weather">
        {ports.map((port) => {
          const pressure = portLogisticsPressure(state, port.id);
          return (
            <CargoRow
              key={port.id}
              name={port.name}
              value={`${pressure.label} | imports +${Math.round((pressure.importModifier - 1) * 100)}%`}
            />
          );
        })}
      </CatalogBlock>

      <CatalogBlock title="Port Authority">
        <IdentityCargoRow
          identity={factionIdentityForPortFaction(currentFaction)}
          name={`${currentFaction.name} access`}
          testId={`port-authority-${currentFaction.id}`}
          value={standingSummary(standing)}
        />
        <IdentityCargoRow
          identity={factionIdentityForPortFaction(currentFaction)}
          name="Authority posture"
          value={authoritySummary(standing, hasPermit)}
        />
        <div className="politics-action">
          <IdentityToken identity={factionIdentityForPortFaction(currentFaction)} size="small" />
          <div>
            <strong>Market Permit</strong>
            <span>{hasPermit ? `active to day ${permitExpiryForFaction(state, currentFaction.id)}` : `access, tariff, inspection, service relief`} | standing {standing.toFixed(1)}</span>
          </div>
          <span>{money(permitCost)}</span>
          <button
            data-testid="buy-market-permit"
            type="button"
            disabled={!canBuyPermit}
            onClick={() => dispatch({ type: "buyMarketPermit" })}
          >
            Buy
          </button>
        </div>
        <div className="politics-action">
          <IdentityToken identity={factionIdentityForPortFaction(currentFaction)} size="small" />
          <div>
            <strong>Convoy Writ</strong>
            <span>-12 route risk | requires {politicalActionCosts.convoyMinimumStanding} standing</span>
          </div>
          <span>{money(convoyCost)}</span>
          <button
            data-testid="request-convoy"
            type="button"
            disabled={!canRequestConvoy}
            onClick={() => dispatch({ type: "requestConvoy" })}
          >
            Post
          </button>
        </div>
        {factionFavor ? (
          <div
            className="politics-action"
            data-favor-available={factionFavor.available ? "true" : "false"}
            data-favor-kind={factionFavor.kind}
            data-faction-id={factionFavor.factionId}
            data-testid="faction-favor"
          >
            <IdentityToken identity={factionIdentityForPortFaction(currentFaction)} size="small" />
            <div>
              <strong>{factionFavor.label}</strong>
              <span>
                {factionFavor.detail} | {factionFavor.effect} | {factionFavor.reason}
              </span>
            </div>
            <span>{money(factionFavor.cost)} | -{factionFavor.standingCost.toFixed(1)}</span>
            <button
              data-testid="call-faction-favor"
              type="button"
              disabled={!factionFavor.available}
              onClick={() => dispatch({ type: "callFactionFavor" })}
            >
              {factionFavor.actionLabel}
            </button>
          </div>
        ) : null}
      </CatalogBlock>

      <CatalogBlock title="Route Picks">
        {routeChoices.map((choice) => (
          <CargoRow
            key={choice.kind}
            name={`${routeChoiceKindLabel(choice.kind)} to ${portById(choice.sellPortId).name}`}
            value={`${marginText(choice.expectedProfit)} | ${choice.days}d | ${choice.reason}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Best Runs">
        {opportunities.map((opportunity) => (
          <CargoRow
            key={`${opportunity.goodId}-${opportunity.sellPortId}`}
            name={`${goodName(opportunity.goodId)} to ${portById(opportunity.sellPortId).name}`}
            value={`${marginText(opportunity.riskAdjustedMargin)} | ${opportunity.days}d | ${Math.round(opportunity.risk * 100)}% | ${opportunity.routeWindow.label} | ${opportunity.reason}${opportunity.politicalRead ? ` | ${opportunity.politicalRead.label}` : ""}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Freight Pressure">
        {topFreightPressureSignals(state, 5).map((signal) => (
          <CargoRow
            key={`${signal.portId}-${signal.goodId}`}
            name={`${goodName(signal.goodId)} @ ${portById(signal.portId).name}`}
            value={`${signal.label} | ${signal.detail}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="World Pulse">
        {worldPulse.length ? (
          worldPulse.map((preview) => <CargoRow key={preview.id} name={`${preview.title} ${preview.label}`} value={eventPreviewText(preview)} />)
        ) : (
          <CargoRow name="Quiet docks" value="no strong world pressure" />
        )}
      </CatalogBlock>

      {conditions ? (
        <CatalogBlock title="Arrival Pulse">
          {arrivalPulse.length ? (
            arrivalPulse.map((preview) => <CargoRow key={preview.id} name={`${preview.title} ${preview.label}`} value={eventPreviewText(preview)} />)
          ) : (
            <CargoRow name={selected.name} value="no strong arrival pressure" />
          )}
        </CatalogBlock>
      ) : null}

      <CatalogBlock title="Moving Markets">
        {movingMarkets.map((signal) => (
          <CargoRow
            key={`${signal.portId}-${signal.goodId}`}
            name={`${goodName(signal.goodId)} @ ${portById(signal.portId).name}`}
            testId={`moving-market-${signal.portId}-${signal.goodId}`}
            value={`${signal.label} | ${signal.detail}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Market Pulse">
        {topMarketForecasts(state, state.currentPort, 5).map((forecast) => (
          <CargoRow
            key={forecast.goodId}
            name={goodName(forecast.goodId)}
            value={`${forecast.label} | ${forecast.detail} | ${money(forecast.currentPrice)} to ${money(forecast.expectedPrice)}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Faction Watch">
        {factionWatch.map((signal) => (
          <CargoRow
            key={signal.factionId}
            name={signal.factionName}
            testId={`faction-watch-${signal.factionId}`}
            value={`${signal.label} | ${signal.detail}`}
          />
        ))}
      </CatalogBlock>

      <CatalogBlock title="Politics">
        {state.politicalEvents.length ? (
          state.politicalEvents.map((event) => (
            <IdentityCargoRow
              identity={factionIdentityFor(event.factionId)}
              key={event.id}
              name={factionName(event.factionId)}
              value={`${event.kind} to day ${event.expires}`}
            />
          ))
        ) : (
          <CargoRow name="Quiet docks" value="for now" />
        )}
      </CatalogBlock>

      <CatalogBlock title="Contract Pressure">
        {getActiveContracts(state).length ? (
          getActiveContracts(state)
            .map((contract) => {
              const summary = contractSummary(contract);
              return <CargoRow key={contract.id} name={summary.destinationName} value={`${contractPressureLabel(state, contract)} | ${summary.goodName}`} />;
            })
        ) : (
          <CargoRow name="No obligations" value="clean slate" />
        )}
      </CatalogBlock>

      <CatalogBlock title="Faction Standing">
        {factions.map((faction) => {
          const value = state.factionStanding[faction.id] ?? 0;
          return (
            <IdentityCargoRow
              identity={factionIdentityFor(faction.id)}
              key={faction.id}
              name={faction.name}
              testId={`faction-standing-${faction.id}`}
              value={`${standingTier(value).label} | ${value.toFixed(1)}`}
            />
          );
        })}
      </CatalogBlock>

      <CatalogBlock title="Settings">
        <div className="settings-stack" data-testid="settings-panel">
          <DesktopInfoGrid info={settings.desktopInfo} />
          <div className="settings-row">
            <span>Graphics</span>
            <div className="segmented-control" aria-label="Graphics quality">
              {graphicsModes.map((mode) => (
                <button
                  aria-pressed={settings.graphicsMode === mode}
                  className={settings.graphicsMode === mode ? "active" : ""}
                  data-testid={`graphics-${mode}`}
                  key={mode}
                  type="button"
                  onClick={() => settings.setGraphicsMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle">
            <input
              checked={settings.reducedMotion}
              data-testid="reduced-motion"
              type="checkbox"
              onChange={(event) => settings.setReducedMotion(event.currentTarget.checked)}
            />
            <span>Reduced Motion</span>
          </label>
          <div
            className="audio-settings-row"
            data-audio-cue={settings.audioCue}
            data-audio-muted={settings.audioPreferences.muted ? "true" : "false"}
            data-audio-scene={settings.audioScene}
            data-audio-volume={audioVolumePercent(settings.audioPreferences)}
            data-testid="audio-settings"
          >
            <div className="audio-settings-title">
              <span>Audio</span>
              <small data-testid="audio-status">{settings.audioStatus}</small>
            </div>
            <div className="audio-control-strip">
              <label className="settings-toggle audio-mute-toggle">
                <input
                  checked={settings.audioPreferences.muted}
                  data-testid="audio-muted"
                  type="checkbox"
                  onChange={(event) => settings.setAudioMuted(event.currentTarget.checked)}
                />
                <span>Muted</span>
              </label>
              <input
                aria-label="Audio volume"
                data-testid="audio-volume"
                max="100"
                min="0"
                step="5"
                type="range"
                value={audioVolumePercent(settings.audioPreferences)}
                onChange={(event) => settings.setAudioVolume(Number(event.currentTarget.value) / 100)}
              />
              <button data-testid="test-audio-cue" type="button" onClick={settings.testAudioCue}>
                Cue
              </button>
            </div>
          </div>
          <textarea
            aria-label="Save transfer"
            data-testid="save-transfer"
            spellCheck={false}
            value={settings.saveTransferText}
            onChange={(event) => settings.setSaveTransferText(event.currentTarget.value)}
          />
          <div className="settings-actions">
            <button data-testid="export-save" type="button" onClick={settings.exportSave}>Export</button>
            <button data-testid="import-save" type="button" disabled={!settings.saveTransferText.trim()} onClick={settings.importSave}>Import</button>
            <button data-testid="recover-save" type="button" disabled={!settings.canRecoverSave} onClick={settings.recoverSave}>Recover</button>
            <button data-testid="clear-save" type="button" onClick={settings.clearSave}>Delete Save</button>
          </div>
          <span className="settings-status" data-testid="save-recovery-status">
            {settings.canRecoverSave ? "Backup available" : "No backup yet"}
          </span>
          <span className="settings-status" data-testid="settings-status">{settings.settingsStatus}</span>
          <div className="playtest-evidence" data-testid="playtest-evidence">
            <div className="playtest-evidence-header">
              <span>Playtest Evidence</span>
              <div className="playtest-evidence-actions">
                <button data-testid="generate-playtest-packet" type="button" onClick={settings.generatePlaytestPacket}>
                  Packet
                </button>
                <button data-testid="generate-playtest-scorecard" type="button" onClick={settings.generatePlaytestScorecard}>
                  Scorecard
                </button>
                <button data-testid="validate-playtest-scorecard" type="button" onClick={settings.validatePlaytestScorecard}>
                  Check
                </button>
                <button data-testid="generate-playtest-triage" type="button" onClick={settings.generatePlaytestTriage}>
                  Triage
                </button>
                <button data-testid="save-playtest-artifact" type="button" onClick={settings.savePlaytestArtifact}>
                  Save
                </button>
              </div>
            </div>
            <div
              className="playtest-readiness"
              data-playtest-readiness={settings.playtestReadiness.status}
              data-testid="playtest-readiness"
            >
              <span>{settings.playtestReadiness.label}</span>
              <span>{settings.playtestReadiness.detail}</span>
              {settings.playtestReadiness.qualifications.find((entry) => !entry.qualified) ? (
                <span data-testid="playtest-readiness-missing">
                  Missing: {settings.playtestReadiness.qualifications.find((entry) => !entry.qualified)?.missing.slice(0, 4).join(", ")}
                </span>
              ) : null}
              {settings.playtestReadiness.latestTitle ? <span>Latest: {settings.playtestReadiness.latestTitle}</span> : null}
              <span data-testid="playtest-score-quality">
                {settings.playtestReadiness.scoreQualityLabel}: {settings.playtestReadiness.scoreQualityDetail}
              </span>
            </div>
            <div
              aria-live="polite"
              className="playtest-scorecard-check"
              data-playtest-scorecard-check={settings.playtestScorecardCheck.status}
              data-testid="playtest-scorecard-check"
            >
              <span>{settings.playtestScorecardCheck.label}</span>
              <span>{settings.playtestScorecardCheck.detail}</span>
              {settings.playtestScorecardCheck.missing.length ? (
                <span data-testid="playtest-scorecard-check-missing">
                  Missing: {settings.playtestScorecardCheck.missing.slice(0, 4).join(", ")}
                </span>
              ) : null}
            </div>
            <PlaytestCollectionFiles info={settings.desktopInfo} />
            <textarea
              aria-label="Playtest evidence packet or scorecard"
              data-testid="playtest-packet"
              spellCheck={false}
              value={settings.playtestPacketText}
              onChange={(event) => settings.setPlaytestPacketText(event.currentTarget.value)}
            />
          </div>
          <div className="release-notes" data-testid="release-notes" id="release-notes">
            0.1.0: desktop shell, app-owned saves, recovery logs, packaged macOS smoke.
          </div>
        </div>
      </CatalogBlock>

      <CatalogBlock title="Error Log">
        <div className="error-log-header">
          <span data-testid="error-count">{state.errors.length ? `${state.errors.length} captured` : "Runtime clean"}</span>
          <div className="error-log-actions">
            {import.meta.env.DEV ? (
              <button
                data-testid="probe-error"
                type="button"
                onClick={() => dispatch({ type: "recordError", error: { message: "Runtime probe captured", source: "dev probe" } })}
              >
                Probe
              </button>
            ) : null}
            <button data-testid="clear-errors" type="button" disabled={!state.errors.length} onClick={() => dispatch({ type: "clearErrors" })}>
              Clear
            </button>
          </div>
        </div>
        <div className="error-list" data-testid="error-log">
          {state.errors.length ? state.errors.map((error) => <ErrorLogRow key={error.id} error={error} />) : <CargoRow name="Runtime" value="clean" />}
        </div>
      </CatalogBlock>
    </div>
  );
}

function EncounterDesk({ state, dispatch }: { state: GameState; dispatch: Dispatch<ReactReducerAction> }) {
  const enc = state.encounter;
  if (!enc) return null;
  const identity = encounterIdentityFor(enc);
  if (enc.kind === "sea") {
    const storm = enc.seaKind === "storm";
    const safeLabel = storm ? "Heave To" : "Reef";
    const skillLabel = storm ? "Read Breaks" : "Brace";
    const boldLabel = storm ? "Run With It" : "Jettison";
    const rescueRead = seaRescueReadFor(state);
    return (
      <div className="desk-stack">
        <div className="desk-block encounter">
          <div className="encounter-heading">
            <IdentityToken identity={identity} size="medium" testId={`encounter-token-${identity.id}`} />
            <div>
              <h3>{enc.name}</h3>
              <span>{identity.role} | {identity.cue}</span>
            </div>
          </div>
          <p>
            {storm ? "A storm line cuts across the route" : "The sea watch calls hard water"} near {enc.portName}. Sea {Math.round((enc.roughness ?? 0) * 100)}%, storm {Math.round((enc.stormIntensity ?? 0) * 100)}%.
          </p>
          <SeaRescuePlan state={state} />
          <div className="encounter-actions">
            <button data-testid="resolve-sea-safe" type="button" onClick={() => dispatch({ type: "resolveSeaSafe" })}>{safeLabel}</button>
            <button data-testid="resolve-sea-skill" type="button" onClick={() => dispatch({ type: "resolveSeaSkill" })}>{skillLabel}</button>
            <button data-testid="resolve-sea-bold" type="button" onClick={() => dispatch({ type: "resolveSeaBold" })}>{boldLabel}</button>
            <button data-testid="aid-sea-signal" type="button" disabled={!rescueRead} onClick={() => dispatch({ type: "aidSeaSignal" })}>Aid Signal</button>
          </div>
          <p className="danger-text">
            {storm
              ? "Heaving to trades time for safety. Reading breaks favors water skill. Running can steal distance. Aid Signal risks strain for goodwill."
              : "Reefing protects the ship. Bracing favors crew and navigation. Jettisoning cargo can save the hull. Aid Signal creates rescue work."}
          </p>
        </div>
      </div>
    );
  }
  if (enc.kind === "inspection") {
    const faction = enc.factionId ? factionName(enc.factionId) : "Harbor";
    const hasPermit = Boolean(
      enc.factionId && state.politicalEvents.some((event) => event.factionId === enc.factionId && event.kind === "permit" && event.expires >= state.day)
    );
    const customsRead = customsActionReadFor(state);
    return (
      <div className="desk-stack">
        <div className="desk-block encounter">
          <div className="encounter-heading">
            <IdentityToken identity={identity} size="medium" testId={`encounter-token-${identity.id}`} />
            <div>
              <h3>{enc.name}</h3>
              <span>{identity.role} | {identity.cue}</span>
            </div>
          </div>
          <CustomsEncounterPlan state={state} />
          <p>{faction} customs boards outside {enc.portName}. Fine {money(enc.fine ?? 0)}. Bribe {money(enc.bribe)}.</p>
          <div className="encounter-actions">
            <button data-testid="submit-inspection" type="button" onClick={() => dispatch({ type: "submitInspection" })}>Submit Fine</button>
            <button data-testid="file-customs-manifest" type="button" onClick={() => dispatch({ type: "fileCustomsManifest" })}>File {money(customsRead?.manifestCost ?? 0)}</button>
            <button data-testid="surrender-customs-cargo" type="button" disabled={!customsRead?.cargoBondAvailable} onClick={() => dispatch({ type: "surrenderCustomsCargo" })}>Bond Cargo</button>
            <button data-testid="call-customs-favor" type="button" disabled={!customsRead?.favorAvailable} onClick={() => dispatch({ type: "callCustomsFavor" })}>Call Favor</button>
            <button data-testid="present-permit" type="button" disabled={!hasPermit} onClick={() => dispatch({ type: "presentPermit" })}>Show Permit</button>
            <button type="button" disabled={state.cash <= 0} onClick={() => dispatch({ type: "bribe" })}>Bribe {money(enc.bribe)}</button>
            <button type="button" onClick={() => dispatch({ type: "run" })}>Evade</button>
          </div>
          <p className="danger-text">Clean papers buy reputation. Cargo bonds trade freight for cash relief. Favors spend standing. Evasion still risks seizure.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="desk-stack">
      <div className="desk-block encounter">
        <div className="encounter-heading">
          <IdentityToken identity={identity} size="medium" testId={`encounter-token-${identity.id}`} />
          <div>
            <h3>{enc.name}</h3>
            <span>{identity.role} | {identity.cue}</span>
          </div>
        </div>
        <PirateEncounterPlan state={state} />
        <p>A pirate sloop blocks the approach to {enc.portName}. Strength {enc.strength}. Bounty {money(enc.bounty)}.</p>
        <div className="encounter-actions">
          <button data-testid="fight-pirates" type="button" onClick={() => dispatch({ type: "fight" })}>Fight for {money(enc.bounty)}</button>
          <button data-testid="warn-pirates" type="button" onClick={() => dispatch({ type: "warnPirates" })}>Warn Off</button>
          <button data-testid="parley-pirates" type="button" disabled={state.cash <= 0} onClick={() => dispatch({ type: "parleyPirates" })}>Parley</button>
          <button type="button" disabled={state.cash <= 0} onClick={() => dispatch({ type: "bribe" })}>Pay {money(enc.bribe)}</button>
          <button type="button" onClick={() => dispatch({ type: "run" })}>Run Canvas</button>
        </div>
        <p className="danger-text">Warn Off favors patrol builds. Parley favors brokerage. Running favors fast hulls. Fighting is the loud answer.</p>
      </div>
    </div>
  );
}

function SeaRescuePlan({ state }: { state: GameState }) {
  const read = seaRescueReadFor(state);
  if (!read) return null;
  return (
    <div
      className="encounter-plan"
      data-testid="sea-rescue-read"
      data-cargo-risk={read.cargoRiskLabel}
      data-destination={read.destinationId}
    >
      <span>{read.label}</span>
      <strong>{read.hullCost} hull | {read.delayDays ? `+${read.delayDays}d` : "no delay"} | {read.cargoRiskLabel}</strong>
      <em>{read.destinationName} {read.crewRiskLabel} | standing +{read.standingGain.toFixed(1)}</em>
    </div>
  );
}

function CustomsEncounterPlan({ state }: { state: GameState }) {
  const read = customsActionReadFor(state);
  if (!read) return null;
  const cargoText = read.cargoCandidate
    ? `${read.cargoCandidate.units} ${read.cargoCandidate.goodName} | ${money(read.cargoBondFee)} bond`
    : "no suspect cargo";
  const favorText = read.favorAvailable
    ? `standing -${read.favorStandingCost.toFixed(1)} | ${money(read.favorFee)}`
    : `need ${read.favorStandingCost.toFixed(1)} standing`;
  return (
    <div
      className="encounter-plan"
      data-testid="customs-tactical-read"
      data-cargo-bond={read.cargoBondAvailable ? "available" : "none"}
      data-favor={read.favorAvailable ? "available" : "locked"}
    >
      <span>{read.hasLedger ? "Ledger read" : "Manifest read"}</span>
      <strong>Papers {money(read.manifestCost)} | Bond {cargoText}</strong>
      <em>Favor {favorText}</em>
    </div>
  );
}

function PirateEncounterPlan({ state }: { state: GameState }) {
  const read = pirateTacticalReadFor(state);
  if (!read) return null;
  return (
    <div
      className="encounter-plan"
      data-testid="pirate-tactical-read"
      data-escort-duty={read.escortDuty ? "active" : "none"}
      data-recommendation={read.recommendation}
    >
      <span>{read.escortDuty ? "Escort papers active" : read.recommendationLabel}</span>
      <strong>{read.riskLabel}</strong>
      <em>Power {read.battleRating} vs threat {read.pirateRating} | {read.parleyLabel}</em>
    </div>
  );
}

function deadlinePressureText(daysLeft: number) {
  if (daysLeft <= 2) return "urgent";
  if (daysLeft <= 5) return "due soon";
  return `${daysLeft}d`;
}

function contractPlanText(plan: ReturnType<typeof contractPlanSummary>) {
  const loadText =
    plan.missing > 0
      ? `${plan.status === "blocked" ? "Blocked" : "Load"} ${plan.missing} ${goodName(plan.stop.goodId)} for ${money(plan.cargoCost)}`
      : plan.status === "ready"
        ? "Ready to deliver"
        : "Cargo aboard";
  const holdText = `hold ${plan.holdAfter}${plan.cargoFits ? "" : " over cap"}`;
  const routeText = plan.routeDays > 0 ? `${plan.routeDays}d ${Math.round(plan.routeRisk * 100)}% ${plan.routeWear} wear` : "at stop";
  const slackText = plan.deadlineSlack >= 0 ? `${plan.deadlineSlack}d slack` : `${Math.abs(plan.deadlineSlack)}d late`;
  const marketText = plan.destinationImport
    ? `import +${money(Math.max(0, plan.destinationMargin))}/u`
    : `${marginText(plan.destinationMargin)}/u resale`;
  return `${loadText} | ${holdText} | ${routeText} | ${slackText} | net ${money(plan.netValue)} | ${marketText}`;
}

function routeContractTitle(focus: RouteContractFocus) {
  const summary = contractSummary(focus.contract);
  if (focus.status.ready) return `Deliver ${summary.goodName}`;
  if (focus.plan.status === "loadable") return `Load ${summary.goodName} job`;
  return `${summary.destinationName} job`;
}

function routeContractDetail(focus: RouteContractFocus) {
  const summary = contractSummary(focus.contract);
  const stopName = portById(focus.plan.stop.portId).name;
  const slackText = focus.plan.deadlineSlack >= 0 ? `${focus.plan.deadlineSlack}d slack` : `${Math.abs(focus.plan.deadlineSlack)}d late`;
  if (focus.status.ready) return `${summary.factionName}: ${focus.status.held}/${focus.plan.requiredUnits} ${goodName(focus.plan.stop.goodId)} ready at ${stopName}.`;
  if (focus.plan.status === "loadable") return `${summary.factionName}: load ${focus.plan.missing} ${goodName(focus.plan.stop.goodId)} for ${money(focus.plan.cargoCost)}; ${slackText}.`;
  if (focus.plan.status === "in-transit") return `${summary.factionName}: cargo aboard for ${stopName}; ${slackText}.`;
  return `${summary.factionName}: blocked, need ${focus.plan.missing} ${goodName(focus.plan.stop.goodId)}; ${slackText}.`;
}

function routeContractMetric(focus: RouteContractFocus) {
  const good = goodName(focus.plan.stop.goodId);
  const stopName = portById(focus.plan.stop.portId).name;
  const slackText = focus.plan.deadlineSlack >= 0 ? `${focus.plan.deadlineSlack}d` : `${Math.abs(focus.plan.deadlineSlack)}d late`;
  if (focus.status.ready) return `deliver ${focus.status.held} ${good}`;
  if (focus.plan.status === "loadable") return `load ${focus.plan.missing} ${good} | ${slackText}`;
  if (focus.plan.status === "in-transit") return `${stopName} | ${slackText}`;
  return `blocked ${focus.plan.missing} ${good}`;
}

function routeContractOfferMetric(focus: RouteContractOfferFocus) {
  const good = goodName(focus.plan.stop.goodId);
  const stopName = portById(focus.plan.stop.portId).name;
  const slackText = focus.fit.deadlineSlack >= 0 ? `${focus.fit.deadlineSlack}d` : `${Math.abs(focus.fit.deadlineSlack)}d late`;
  return `${focus.fit.label}: ${good} to ${stopName} | ${slackText} | net ${money(focus.fit.expectedNet)}`;
}

function routeContractActionLabel(focus: RouteContractFocus) {
  if (focus.status.ready) return "Deliver";
  if (focus.plan.status === "loadable") return "Load Job";
  if (focus.plan.status === "in-transit") return "Job Set";
  return "Blocked";
}

function routeContractOfferActionLabel(focus: RouteContractOfferFocus) {
  if (focus.plan.status === "blocked") return "Take Risk";
  return "Take Job";
}

function routeContractActionTitle(focus: RouteContractFocus) {
  const summary = contractSummary(focus.contract);
  if (focus.status.ready) return `Complete ${summary.factionName} contract at this port`;
  if (focus.plan.status === "loadable") return `Load only the ${focus.plan.missing} missing contract units`;
  if (focus.plan.status === "in-transit") return "Contract cargo is already aboard";
  return "Contract cargo is blocked by cash, stock, access, or hold capacity";
}

function routeContractOfferActionTitle(focus: RouteContractOfferFocus) {
  const summary = contractSummary(focus.contract);
  const slackText = focus.fit.deadlineSlack >= 0 ? `${focus.fit.deadlineSlack} days of slack` : `${Math.abs(focus.fit.deadlineSlack)} days late`;
  return `${focus.fit.label}: accept ${summary.factionName} work with ${slackText}, ${Math.round(focus.fit.routeRisk * 100)}% route risk, and ${money(focus.fit.cargoCost)} cargo cost`;
}

function routeContractActionDisabled(focus: RouteContractFocus, busy: boolean) {
  return busy || (!focus.status.ready && focus.plan.status !== "loadable");
}

function routeContractOfferActionDisabled(state: GameState, busy: boolean) {
  return busy || state.contracts.filter((contract) => contract.status === "active").length >= 4;
}

function runRouteContractAction(focus: RouteContractFocus, dispatch: Dispatch<ReactReducerAction>) {
  if (focus.status.ready) dispatch({ type: "completeContract", contractId: focus.contract.id });
  else if (focus.plan.status === "loadable") dispatch({ type: "buyContractCargo", contractId: focus.contract.id });
}

function VoyageDesk({ state }: { state: GameState }) {
  const to = state.voyage ? portById(state.voyage.toId) : portById(state.currentPort);
  const wearText = state.voyage?.wearLabel ? `${state.voyage.wear ?? 0} hull | ${state.voyage.wearLabel}` : "calculating";
  const watch = state.voyage?.watch;
  const underwayPulse = state.voyage
    ? underwayEventPreviews(
        state,
        {
          voyage: state.voyage,
          physics: routePhysicsProfile(state, state.voyage.fromId, state.voyage.toId),
          progress: state.voyage.progress,
          watchEffect: state.voyage.watch?.effect ?? null,
        },
        4
      )
    : [];
  return (
    <div className="desk-stack">
      <div className="desk-block">
        <h3>Under Sail</h3>
        <p>Destination: {to.name}. The route is resolving now.</p>
        <p>Expected wear: {wearText}.</p>
        {watch ? (
          <p>
            {watch.label}: {watch.detail} Sea {Math.round(watch.roughness * 100)}%, storm {Math.round(watch.stormIntensity * 100)}%.
          </p>
        ) : (
          <p>Sea watch: reading the water.</p>
        )}
        <span className="tag">{Math.round((state.voyage?.progress ?? 0) * 100)}% crossing</span>
      </div>

      {state.voyage ? (
        <CatalogBlock title="Underway Pulse">
          {underwayPulse.length ? (
            underwayPulse.map((preview) => <CargoRow key={preview.id} name={`${preview.title} ${preview.label}`} value={eventPreviewText(preview)} />)
          ) : (
            <CargoRow name={to.name} value="no strong underway pressure" />
          )}
        </CatalogBlock>
      ) : null}
    </div>
  );
}

function PhysicsDebugPanel({ debug }: { debug: RoutePhysicsDebug }) {
  return (
    <CatalogBlock title="Physics Debug">
      <CargoRow
        name="Route"
        value={`${debug.fromId} -> ${debug.toId} | day ${debug.day} | ${debug.sailPlan} | heading ${debug.headingDegrees}deg | ${debug.days}d ${debugPercent(debug.risk)}`}
      />
      <CargoRow
        name="Wind"
        value={`vec ${debugVector(debug.wind)} | score ${debug.wind.score} | cross ${debug.wind.crosswind}`}
      />
      <CargoRow
        name="Current"
        value={`vec ${debugVector(debug.current)} | score ${debug.current.score} | drift ${debugVector(debug.surfaceDrift)}`}
      />
      <CargoRow
        name="Water"
        value={`rough ${debugPercent(debug.water.roughness)} | storm ${debugPercent(debug.water.stormIntensity)} | wave ${debugPercent(debug.water.waveEnergy)} | beam ${debugPercent(debug.water.seaState.beamSea)} | slam ${debugPercent(debug.water.seaState.cargoSlam)} | peak ${debug.water.seaState.peakWaveHeight} | wear ${debug.wear}`}
      />
      <CargoRow
        name="Speed"
        value={`factor ${debug.speedMultiplier} | net ${signedPercent(debug.speedDelta)} | wind ${signedPercent(debug.speedFactors.wind)} | current ${signedPercent(debug.speedFactors.current)} | sea ${signedPercent(debug.speedFactors.sea + debug.speedFactors.storm)}`}
      />
      <CargoRow
        name="Profile"
        value={`${debug.profile.label} | pressure ${debugPercent(debug.profile.pressure)} | assist ${debug.profile.assist} | ${debug.profile.detail}`}
      />
      {debug.samples.map((sample) => (
        <CargoRow
          key={sample.progress}
          name={`P${Math.round(sample.progress * 100)}`}
          value={`xy ${sample.normX}/${sample.normY} | rough ${debugPercent(sample.roughness)} | storm ${debugPercent(sample.stormIntensity)} | wave ${debugPercent(sample.waveEnergy)} | foam ${debugPercent(sample.foam)} | motion bob ${sample.bob} roll ${sample.roll} yaw ${sample.yaw} | hull ${debugPercent(sample.hullResponse)} | wake ${sample.wakeLength}/${sample.wakeSpread}`}
        />
      ))}
    </CatalogBlock>
  );
}

function Stat({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={`stat ${primary ? "primary" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CaptainOrderPanel({
  order,
  onRun,
}: {
  order: ReturnType<typeof captainOrderFor>;
  onRun: (target: CaptainOrderTarget | null) => void;
}) {
  return (
    <section
      className="captain-order"
      aria-label="Captain orders"
      data-testid="captain-order"
      data-order-id={order.id}
      data-target-kind={order.target?.kind ?? "none"}
    >
      <div>
        <span>{order.label}</span>
        <strong>{order.title}</strong>
        <em>{order.detail}</em>
      </div>
      <button
        aria-label={order.target ? `${order.actionLabel}: ${order.title}` : "No captain order available"}
        data-testid="captain-order-action"
        type="button"
        disabled={!order.target}
        onClick={() => onRun(order.target)}
      >
        {order.actionLabel}
      </button>
    </section>
  );
}

function FeedbackPulsePanel({ pulse, reducedMotion }: { pulse: FeedbackPulse; reducedMotion: boolean }) {
  const effectiveMotion = reducedMotion ? "calm" : pulse.motion;
  return (
    <section
      aria-label="Latest run event"
      aria-live="polite"
      className={`event-pulse tone-${pulse.tone} category-${pulse.category} motion-${effectiveMotion} priority-${pulse.priority}`}
      data-feedback-audio-cue={pulse.audioCue}
      data-feedback-category={pulse.category}
      data-feedback-kind={pulse.kind}
      data-feedback-motion={effectiveMotion}
      data-feedback-priority={pulse.priority}
      data-feedback-tone={pulse.tone}
      data-testid="event-pulse"
    >
      <div>
        <span>{pulse.label}</span>
        <strong>{pulse.title}</strong>
        <em>{pulse.detail}</em>
      </div>
      <strong>{pulse.metric}</strong>
    </section>
  );
}

function CargoRow({ name, value, testId }: { name: string; value: string; testId?: string }) {
  return (
    <div className="cargo-row" data-testid={testId}>
      <strong>{name}</strong>
      <span>{value}</span>
    </div>
  );
}

function IdentityCargoRow({ identity, name, value, testId }: { identity: IdentityArtSpec; name: string; value: string; testId?: string }) {
  return (
    <div
      className="cargo-row identity-cargo-row"
      data-identity-cue={identity.cue}
      data-identity-id={identity.id}
      data-identity-kind={identity.kind}
      data-identity-role={identity.role}
      data-testid={testId}
    >
      <IdentityToken identity={identity} size="small" />
      <div>
        <strong>{name}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function IdentityToken({
  identity,
  size = "small",
  testId,
}: {
  identity: IdentityArtSpec;
  size?: "small" | "medium" | "large";
  testId?: string;
}) {
  const style = {
    "--identity-color": identity.color,
    "--identity-accent": identity.accent,
  } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={`identity-token identity-${identity.kind} shape-${identity.shape} size-${size}`}
      data-identity-cue={identity.cue}
      data-identity-id={identity.id}
      data-identity-kind={identity.kind}
      data-identity-role={identity.role}
      data-testid={testId}
      style={style}
      title={`${identity.name}: ${identity.role} | ${identity.cue}`}
    >
      <span>{identity.initials}</span>
    </span>
  );
}

function ErrorLogRow({ error }: { error: GameError }) {
  return (
    <div className="error-row">
      <div>
        <strong>{error.source}</strong>
        <span>{error.message}</span>
        {error.stack ? <code>{error.stack}</code> : null}
      </div>
      <em>{formatErrorTime(error)}</em>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="route-metric">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function RouteCommandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="route-command-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RouteChoiceButton({
  choice,
  disabled,
  dispatch,
  selectedPortId,
}: {
  choice: RouteChoice;
  disabled: boolean;
  dispatch: Dispatch<ReactReducerAction>;
  selectedPortId: string;
}) {
  const destination = portById(choice.sellPortId);
  return (
    <button
      aria-label={`${routeChoiceKindLabel(choice.kind)} route to ${destination.name}: ${choice.goodName} ${marginText(choice.expectedProfit)}, ${choice.tacticLabel}, ${choice.routeWindow.label}, ${choice.crewRead.compact}`}
      aria-pressed={selectedPortId === choice.sellPortId}
      className={`route-choice choice-${choice.kind}`}
      data-testid={`route-choice-${choice.kind}`}
      disabled={disabled}
      title={`${routeChoiceKindLabel(choice.kind)}: ${choice.reason}`}
      type="button"
      onClick={() => {
        dispatch({ type: "setSailPlan", plan: choice.sailPlan });
        dispatch({ type: "selectPort", portId: choice.sellPortId });
      }}
    >
      <span>{routeChoiceKindLabel(choice.kind)}</span>
      <strong>{destination.name}</strong>
      <em>{choice.goodName} {marginText(choice.expectedProfit)} | {choice.tacticLabel} {signedPercent(choice.speedDelta)} | {choice.routeWindow.label} | {choice.crewRead.compact}</em>
    </button>
  );
}

function CatalogBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="desk-block">
      <h3>{title}</h3>
      <div className="catalog-list">{children}</div>
    </div>
  );
}

function factionName(factionId: string) {
  return factions.find((faction) => faction.id === factionId)?.name ?? factionId;
}

function hasMarketPermitForFaction(state: GameState, factionId: string) {
  return state.politicalEvents.some((event) => event.factionId === factionId && event.kind === "permit" && event.expires >= state.day);
}

function permitExpiryForFaction(state: GameState, factionId: string) {
  return Math.max(
    state.day,
    ...state.politicalEvents
      .filter((event) => event.factionId === factionId && event.kind === "permit" && event.expires >= state.day)
      .map((event) => event.expires)
  );
}

function goodName(goodId: string) {
  return goods.find((good) => good.id === goodId)?.name ?? goodId;
}

function buildFitText(fits: Array<{ label: string; score: number }>) {
  return fits.map((fit) => `${fit.label} ${fit.score}`).join(" | ");
}

function routeDeltaText(delta: RouteFitDelta | EquipmentRecommendation["routeDelta"] | null) {
  if (!delta) return "Select a lane for route impact.";
  const parts = [
    delta.days > 0 ? `-${delta.days}d` : "",
    delta.risk > 0 ? `-${Math.round(delta.risk * 100)}% risk` : "",
    delta.wear > 0 ? `-${delta.wear} wear` : "",
    delta.speed > 0 ? `+${Math.round(delta.speed)}% speed` : "",
  ].filter(Boolean);
  return parts.length ? `Route ${parts.join(" | ")}` : "Route stable";
}

function refitRouteDeltaText(delta: EquipmentRecommendation["routeDelta"]) {
  return routeDeltaText(delta);
}

function effectText(effects: Partial<ReturnType<typeof deriveShipStats>>) {
  const labels: Record<string, string> = {
    cargoCap: "hold",
    cannons: "guns",
    speed: "speed",
    openWater: "water",
    crewCap: "crew",
    hullMax: "hull",
    navigation: "nav",
    negotiation: "trade",
  };
  const parts = Object.entries(effects).map(([key, value]) => `${value && value > 0 ? "+" : ""}${value} ${labels[key] ?? key}`);
  return parts.length ? parts.join(" | ") : "special fit";
}

function routeAuthorityLabel(state: GameState, destinationId: string) {
  const port = portById(destinationId);
  const faction = factions.find((entry) => entry.id === port.faction);
  const standing = state.factionStanding[port.faction] ?? 0;
  const tariffed = faction?.tariffGoods.length ? faction.tariffGoods.map(goodName).slice(0, 2).join("/") : "none";
  return `${standingTier(standing).label} | ${tariffed}`;
}

function routeChoiceKindLabel(kind: RouteChoiceKind) {
  if (kind === "profit") return "Profit";
  if (kind === "gamble") return "Gamble";
  return "Shelter";
}

function topCrewRankLabel(state: GameState) {
  if (!state.crew.length) return "None";
  const top = state.crew
    .map((crewId) => crewRankFor(state.crewXp?.[crewId] ?? 0))
    .sort((left, right) => right.minXp - left.minXp)[0];
  return top?.label ?? "Green";
}

function opportunityLabel(opportunity: ReturnType<typeof tradeOpportunityForGood>) {
  if (!opportunity) return "no lane";
  const destination = portById(opportunity.sellPortId).name;
  const margin = marginText(opportunity.riskAdjustedMargin);
  return `${destination} | ${margin}/u | ${opportunity.days}d | ${Math.round(opportunity.risk * 100)}% | ${opportunity.routeWindow.label}`;
}

function eventPreviewText(preview: EventPressurePreview) {
  return `${Math.round(preview.share * 100)}% | ${preview.detail} | ${preview.effects.slice(0, 2).join("/")}`;
}

function debugPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function debugVector(vector: { x: number; y: number; strength: number }) {
  return `${vector.x}/${vector.y} @ ${vector.strength}`;
}

function compactWindowText(routeWindow: ReturnType<typeof routeWindowForecast>) {
  if (routeWindow.label.startsWith("Better in ")) return routeWindow.label.replace("Better in ", "Better d");
  if (routeWindow.label === "Closing window") return "Closing";
  if (routeWindow.label === "Fast window") return "Fast";
  if (routeWindow.label === "Rough window") return "Rough";
  return "Steady";
}

function compactWaterLabel(label: string) {
  return label.replace(" water", "").replace(" swell", "");
}

function marginText(value: number) {
  if (value < 0) return `-${money(Math.abs(value))}`;
  return `+${money(value)}`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function scorePaceFor(state: GameState, total: number) {
  const day = Math.min(maxDay, Math.max(1, state.day));
  const progress = day / maxDay;
  const target = Math.round(1800 + (6500 - 1800) * Math.pow(progress, 1.18));
  const delta = total - target;
  if (delta >= 1400) return { label: "Ahead", detail: `${marginText(delta)} vs Trade House pace`, tone: "gain" as const };
  if (delta >= 0) return { label: "On Pace", detail: `${marginText(delta)} vs Trade House pace`, tone: "progress" as const };
  if (delta >= -1100) return { label: "Building", detail: `${marginText(delta)} vs Trade House pace`, tone: "risk" as const };
  return { label: "Behind", detail: `${marginText(delta)} vs Trade House pace`, tone: "loss" as const };
}

function scorecardCheckFor(markdown: string): PlaytestScorecardCheck {
  const value = markdown.trim();
  if (!value) {
    return {
      detail: "No scorecard draft loaded.",
      label: "No Current Scorecard",
      missing: [],
      status: "empty",
    };
  }
  if (playtestArtifactKindFor(value) !== "scorecard") {
    return {
      detail: "Current text is evidence or notes, not a scorecard.",
      label: "Not A Scorecard",
      missing: [],
      status: "not-scorecard",
    };
  }
  const qualification = scorecardQualificationFor({
    id: "current-scorecard",
    markdown: value,
    title: "Current scorecard",
  });
  if (qualification.qualified) {
    return {
      detail: "Ready to count after archive save.",
      label: "Qualifies For M-026A",
      missing: [],
      status: "qualified",
    };
  }
  return {
    detail: `${qualification.missing.length} missing field${qualification.missing.length === 1 ? "" : "s"}.`,
    label: "Current Scorecard Incomplete",
    missing: qualification.missing,
    status: "missing",
  };
}

function scorecardSaveQualityText(markdown: string, savedQualification?: PlaytestScorecardQualification) {
  const qualification =
    savedQualification ??
    scorecardQualificationFor({
      id: "saved-scorecard",
      markdown,
      title: "Saved scorecard",
    });
  if (qualification.qualified) return "qualifies for M-026A";
  return `does not qualify: ${qualification.missing.slice(0, 4).join(", ")}`;
}

function readGraphicsPreference(): GraphicsMode {
  if (typeof window === "undefined") return "balanced";
  const requested = new URLSearchParams(window.location.search).get("graphics") ?? window.localStorage.getItem(graphicsPreferenceKey);
  return isGraphicsMode(requested) ? requested : "balanced";
}

function readReducedMotionPreference() {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(reducedMotionPreferenceKey);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function readPhysicsDebugPreference() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const debug = params.get("debug");
  if (debug === "physics" || debug === "all") return true;
  if (params.get("physicsDebug") === "1") return true;
  return window.localStorage.getItem("harborline.debug.physics") === "true";
}

function isGraphicsMode(value: unknown): value is GraphicsMode {
  return value === "high" || value === "balanced" || value === "low";
}

function formatSaveStatus(value: string | null) {
  if (!value) return "Not saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Save time unknown";
  return `Saved ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatErrorTime(error: GameError) {
  const date = new Date(error.time);
  const time = Number.isNaN(date.getTime()) ? "time unknown" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `Day ${error.day} | ${time}`;
}

function errorEventSource(event: ErrorEvent) {
  if (!event.filename) return "window.onerror";
  const file = event.filename.split("/").pop() || event.filename;
  return event.lineno ? `${file}:${event.lineno}` : file;
}

function errorMessageFor(value: unknown, fallback: string) {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;
  if (value == null) return fallback;
  return String(value);
}

function errorStackFor(value: unknown) {
  if (value instanceof Error) return value.stack;
  return undefined;
}

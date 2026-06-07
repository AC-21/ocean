import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const smokeTimeoutMs = Number(process.env.HARBORLINE_BROWSER_SMOKE_TIMEOUT_MS || 45_000);

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  throw new Error(
    `Playwright is required for browser smoke. Run npm install first. Original error: ${error instanceof Error ? error.message : String(error)}`
  );
}

await smokeBuiltPreview();

async function smokeBuiltPreview() {
  await assertBuiltAppExists();

  const previewPort = Number(process.env.HARBORLINE_VERIFY_PORT || 0) || await findFreePort();
  const previewUrl = `http://127.0.0.1:${previewPort}`;
  const viteBin = process.platform === "win32" ? "node_modules/.bin/vite.cmd" : "node_modules/.bin/vite";
  const server = spawn(viteBin, ["preview", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  try {
    await waitForServer(previewUrl, 12_000);
    await runBrowserSmoke(previewUrl);
  } finally {
    server.kill("SIGTERM");
    await onceExit(server, 2_000).catch(() => server.kill("SIGKILL"));
  }

  if (server.exitCode && server.exitCode !== 0 && !output.includes("SIGTERM")) {
    throw new Error(`Preview server exited unexpectedly:\n${output}`);
  }
}

async function runBrowserSmoke(previewUrl) {
  const launchOptions = {
    headless: process.env.HARBORLINE_BROWSER_SMOKE_HEADED !== "1",
    executablePath: await browserExecutablePath(),
    args: ["--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  };
  const browser = await chromium.launch({
    ...launchOptions,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    window.localStorage.clear();
    const deterministic = [0.97, 0.93, 0.91, 0.89, 0.95, 0.92, 0.96, 0.94];
    let index = 0;
    Math.random = () => deterministic[index++ % deterministic.length];
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(`${previewUrl}/?graphics=low&verify=browser-smoke`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("route-command").waitFor({ state: "visible", timeout: 15_000 });
    await assertMainActionReady(page, /Load|Open|Borrow|Repair|Sell|Deliver|Plot/i);
    await assertAccessibilityBaseline(page);
    await assertRuntimeClean(page);
    await assertFeedbackTaxonomy(page);
    await assertIdentityTokens(page);
    await assertText(page.getByTestId("current-port-identity"), "credit hub");
    await assertText(page.getByTestId("selected-port-identity"), "Counting House");
    await assertText(page.getByTestId("run-goals"), "Run Arc");
    await assertText(page.getByTestId("run-goals"), "First Profit");
    await assertCanvasProbe(page);
    await assertOceanSurfaceSignals(page);
    await assertShipOceanResponse(page, { routeRequired: false });

    await clickUnique(page.getByTestId("tab-contracts"), "Contracts tab");
    await assertDeskFocused(page);
    await assertIdentityToken(page.getByTestId("contract-board-faction-token"), "faction", "contract board faction token");
    await page.getByRole("heading", { name: "Contract Board", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
    const contractBoardText = await page.locator(".desk-block").filter({ hasText: "Contract Board" }).first().innerText();
    assert.match(contractBoardText, /Starter Ledger/i, "contract board should show the current run phase");
    assert.match(contractBoardText, /\b1\/1 listings\b/, "starter contract board should show the tuned listing capacity");
    assert.ok((await page.locator('[data-testid^="accept-contract-"]').count()) >= 1, "contract board should expose at least one local offer action");
    const chainOfferRows = page.locator("[data-chain-id]");
    assert.ok((await chainOfferRows.count()) >= 1, "contract board should surface at least one named chain offer");
    assert.ok((await page.locator('[data-testid^="contract-giver-token-"]').count()) >= 1, "contract board should expose named giver identity tokens");
    const chainOfferText = await chainOfferRows.first().innerText();
    assert.match(chainOfferText, /Maribel Quill|Toma Vey|Commodore Rusk/, "chain offer should name its giver");
    assert.match(chainOfferText, /\b[123]\/3\b/, "chain offer should show stage progress");
    assert.ok(await chainOfferRows.first().getAttribute("data-contract-giver"), "chain offer should expose giver metadata");
    const firstOffer = page.locator('[data-testid^="accept-contract-"]').first();
    const firstOfferTestId = await firstOffer.getAttribute("data-testid");
    assert.ok(firstOfferTestId, "contract offer should expose a stable accept test id");
    const firstOfferId = firstOfferTestId.replace("accept-contract-", "");
    const firstOfferRow = page.getByTestId(`contract-row-${firstOfferId}`);
    await firstOfferRow.waitFor({ state: "visible", timeout: 8_000 });
    const firstOfferText = await firstOfferRow.innerText();
    assert.match(firstOfferText, /Fit/i, "contract offer should show route fit");
    assert.match(firstOfferText, /Cargo/i, "contract offer should show required cargo cost");
    assert.match(firstOfferText, /Slack/i, "contract offer should show deadline slack");
    assert.match(firstOfferText, /Risk/i, "contract offer should show route risk");
    assert.match(firstOfferText, /Hold/i, "contract offer should show hold pressure");
    assert.match(firstOfferText, /Upside/i, "contract offer should show destination upside");
    assert.ok(await firstOfferRow.getAttribute("data-route-fit"), "contract offer should expose route fit metadata");
    assert.ok(await firstOfferRow.getAttribute("data-cargo-cost"), "contract offer should expose cargo cost metadata");
    assert.ok(await firstOfferRow.getAttribute("data-deadline-slack"), "contract offer should expose deadline slack metadata");
    assert.ok(await firstOfferRow.getAttribute("data-route-risk"), "contract offer should expose route risk metadata");
    assert.ok(await firstOfferRow.getAttribute("data-hold-after"), "contract offer should expose hold pressure metadata");
    assert.ok(await firstOfferRow.getAttribute("data-destination-upside"), "contract offer should expose destination upside metadata");
    await clickUnique(page.getByTestId(`plot-contract-${firstOfferId}`), "plot contract offer");
    await page.getByTestId("route-accept-contract").waitFor({ state: "visible", timeout: 8_000 });
    assert.equal(await page.getByTestId("route-accept-contract").isEnabled(), true, "plotted contract offer should be acceptable from the route surface");
    await clickUnique(page.getByTestId("tab-market"), "Market tab before route contract acceptance");
    await page.getByRole("heading", { name: "Grayhaven Market", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
    await clickEnabled(page.getByTestId("route-accept-contract"), "route contract accept button");
    await page.getByTestId("route-contract-action").waitFor({ state: "visible", timeout: 8_000 });
    await page.getByRole("heading", { name: "Grayhaven Market", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
    await clickUnique(page.getByRole("button", { name: "New Run", exact: true }), "New Run after route contract check");
    await page.getByTestId("route-command").waitFor({ state: "visible", timeout: 8_000 });
    await assertMainActionReady(page, /Load|Open|Borrow|Repair|Sell|Deliver|Plot/i);
    await clickUnique(page.getByTestId("route-choice-profit"), "profit route choice before shipyard build check");
    await page.waitForFunction(() => document.querySelector('[data-testid="route-command"]')?.textContent?.includes("Transit"));
    await assertShipOceanResponse(page, { routeRequired: true });
    await clickUnique(page.getByTestId("tab-harbor"), "Harbor tab for build check");
    const captainSkillText = await page.locator(".desk-block").filter({ hasText: "Captain Skills" }).first().innerText();
    assert.match(captainSkillText, /Tradewind Plotter/, "captain skill rows should expose mastery target copy");
    assert.match(captainSkillText, /Market Maker/, "captain skill rows should expose brokerage mastery target copy");
    const buildSynergyText = await page.locator(".desk-block").filter({ hasText: "Build Synergies" }).first().innerText();
    assert.match(
      buildSynergyText,
      /(Charter House Rig|Freeport Windknife|Admiralty Gunline|League Freightline)/,
      "Harbor should expose named build synergy progress"
    );
    assert.ok(await page.getByTestId("build-synergy-charter_house").getAttribute("data-build-synergy-active"), "build synergy row should expose active metadata");
    await assertShipyardBuilds(page);
    await clickUnique(page.getByRole("button", { name: "New Run", exact: true }), "New Run after shipyard build check");
    await page.getByTestId("route-command").waitFor({ state: "visible", timeout: 8_000 });
    await assertMainActionReady(page, /Load|Open|Borrow|Repair|Sell|Deliver|Plot/i);

    await clickUnique(page.getByTestId("tab-harbor"), "Harbor tab");
    await assertText(page.getByTestId("crew-facility"), "No Facility");
    await clickEnabled(page.getByTestId("hire-crew-boatswain"), "hire Boatswain");
    await assertIdentityToken(page.getByTestId("crew-token-boatswain"), "crew", "Boatswain identity token");
    await assertText(page.getByTestId("crew-identity-boatswain"), "Safe water");
    assert.ok((await page.locator('[data-crew-preference="safe_water"]').count()) >= 1, "hired crew row should expose route preference metadata");
    await clickEnabled(page.getByTestId("borrow-credit"), "Broker borrow after crew hire");
    await clickEnabled(page.getByTestId("borrow-credit"), "second broker borrow after crew hire");
    await assertCrewDrill(page);

    await clickUnique(page.getByTestId("tab-market"), "Market tab");
    await page.getByTestId("market-row-iron").waitFor({ state: "visible", timeout: 10_000 });
    await assertMarketPulse(page, "iron");
    await assertMarketHistory(page, "iron");
    await page.getByTestId("commission-broker-packet").waitFor({ state: "visible", timeout: 8_000 });
    assert.equal(await page.getByTestId("commission-broker-packet").isEnabled(), true, "broker packet should be available from the market desk");
    await clickEnabled(page.getByTestId("buy-max-iron"), "Iron Max button");
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="market-row-iron"] .owned')?.textContent ?? "0") > 0);
    await assertText(page.getByTestId("captain-log"), "Loaded");

    await clickUnique(page.getByTestId("route-choice-profit"), "profit route choice");
    await page.waitForFunction(() => {
      const text = document.querySelector('[data-testid="route-command"]')?.textContent ?? "";
      return text.includes("Transit") && text.includes("Port") && text.includes("Crew") && text.includes("Policy") && text.includes("Authority") && text.includes("Memory");
    });
    await clickUnique(page.getByTestId("tab-intel"), "Intel tab for event pulse check");
    await assertIdentityToken(page.getByTestId("faction-standing-charter"), "faction", "Charter standing identity row");
    await assertMovingMarkets(page);
    await assertFactionWatch(page);
    const marketPulseText = await page.locator(".desk-block").filter({ hasText: "Market Pulse" }).first().innerText();
    assert.match(marketPulseText, /Price climbing|Cooling price|Buy window|Faction squeeze|Steady quote/, "Market Pulse should expose causal market forecasts");
    const worldPulseText = await page.locator(".desk-block").filter({ hasText: "World Pulse" }).first().innerText();
    const arrivalPulseText = await page.locator(".desk-block").filter({ hasText: "Arrival Pulse" }).first().innerText();
    assert.match(worldPulseText, /Likely|Rising|Possible|Faint/, "World Pulse should expose weighted event cards");
    assert.match(arrivalPulseText, /Likely|Rising|Possible|Faint/, "Arrival Pulse should expose weighted event cards");
    await clickEnabled(page.getByTestId("route-insure"), "route insurance button");
    await page.waitForFunction(() => document.querySelector('[data-testid="route-command"]')?.textContent?.includes(" cover"));

    const startPort = await page.locator(".map-header h2").innerText();
    await clickEnabled(page.getByTestId("route-sail"), "route Sail button");
    await page.getByRole("heading", { name: "Under Sail", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
    const underwayPulseText = await page.locator(".desk-block").filter({ hasText: "Underway Pulse" }).first().innerText();
    assert.match(underwayPulseText, /Likely|Rising|Possible|Faint/, "Underway Pulse should expose weighted event cards");
    const arrivalPort = await resolveVoyage(page, startPort);
    assert.notEqual(arrivalPort, startPort, "voyage should arrive at a different port");
    await assertText(page.getByTestId("captain-log"), "Route memory:");

    await clickUnique(page.getByTestId("tab-market"), "Market tab after arrival");
    await clickEnabled(page.getByTestId("sell-all-iron"), "Iron All button");
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="market-row-iron"] .owned')?.textContent ?? "1") === 0);
    await assertText(page.getByTestId("captain-log"), "Sold");
    await assertFeedbackCategory(page, ["profit", "loss", "rank-up"]);
    await assertMainActionReady(page, /Load|Buy|Open|Borrow|Repair|Deliver|Sail|Plot/i);

    await clickUnique(page.getByTestId("save-run"), "Save button");
    await assertFeedbackCategory(page, ["save"]);
    await clickUnique(page.getByTestId("tab-intel"), "Intel tab");
    await assertDeskFocused(page);
    await page.getByTestId("settings-panel").waitFor({ state: "visible", timeout: 8_000 });
    const factionFavorText = await page.getByTestId("faction-favor").innerText();
    assert.match(factionFavorText, /(Ledger Credit|Tide Runner Writ|Patrol Cover|Stevedore Shift)/, "Port Authority should name the current faction favor");
    assert.match(factionFavorText, /(route risk|cash|stock|debt)/, "Faction favor should expose a concrete effect");
    assert.match(
      await page.getByTestId("faction-favor").getAttribute("data-favor-kind"),
      /^(ledger_credit|tide_runner_writ|patrol_cover|stevedore_shift)$/,
      "Port Authority should expose a current faction favor"
    );
    await assertText(page.getByTestId("desktop-info-app"), "Harborline");
    await assertText(page.getByTestId("desktop-info-runtime"), "Browser");
    await assertText(page.getByTestId("desktop-info-recovery"), "Backed up");
    await assertText(page.getByTestId("release-notes"), "0.1.0");
    assert.match(await page.getByTestId("release-notes-link").getAttribute("href"), /#release-notes/, "release notes link should target the in-app notes block");
    await assertText(page.getByTestId("audio-settings"), "Audio");
    await assertText(page.getByTestId("audio-status"), "Harbor");
    assert.equal(
      await page.getByTestId("audio-settings").getAttribute("data-audio-cue"),
      await page.getByTestId("event-pulse").getAttribute("data-feedback-audio-cue"),
      "audio settings should follow the current feedback pulse cue"
    );
    assert.match(await page.getByTestId("audio-settings").getAttribute("data-audio-scene"), /^(harbor|open-water|encounter|silent)$/);
    await clickUnique(page.getByTestId("test-audio-cue"), "Test audio cue button");
    await assertText(page.getByTestId("settings-status"), "Audio cue:");
    await assertReducedMotionToggle(page);
    await clickUnique(page.getByTestId("export-save"), "Export save button");
    const exportedSave = await page.getByTestId("save-transfer").inputValue();
    assert.match(exportedSave, /"version":\s*2/, "exported save should include the current save envelope");
    assert.match(exportedSave, /"currentPort"/, "exported save should include game state");
    assert.match(exportedSave, /"routeHistory"/, "exported save should include completed route history");

    await clickUnique(page.getByTestId("clear-save"), "Delete Save button");
    await assertText(page.getByTestId("settings-status"), "Saved run deleted");
    await assertText(page.getByTestId("save-recovery-status"), "Backup available");
    await clickEnabled(page.getByTestId("recover-save"), "Recover save button");
    await assertText(page.getByTestId("settings-status"), "Backup recovered");
    await clickEnabled(page.getByTestId("import-save"), "Import save button");
    await assertText(page.getByTestId("settings-status"), "Run imported");
    await assertText(page.getByTestId("playtest-readiness"), "0/3 unique qualified testers");
    await assertText(page.getByTestId("playtest-score-quality"), "Score Gate Pending");
    await assertText(page.getByTestId("playtest-scorecard-check"), "No Current Scorecard");
    await assertText(page.getByTestId("playtest-collection-files"), "Collect files");
    await assertText(page.getByTestId("playtest-latest-file"), "Browser local storage: harborline.playtestArtifact.latest");
    await assertText(page.getByTestId("playtest-history-file"), "Browser local storage: harborline.playtestArtifact.history.v1");
    await clickUnique(page.getByTestId("generate-playtest-packet"), "Generate playtest packet");
    await assertText(page.getByTestId("settings-status"), "Playtest packet generated");
    await assertText(page.getByTestId("playtest-scorecard-check"), "Not A Scorecard");
    const playtestPacket = await page.getByTestId("playtest-packet").inputValue();
    assert.match(playtestPacket, /Harborline Playtest Evidence Packet/, "playtest packet should include a title");
    assert.match(playtestPacket, /Route Choice Read/, "playtest packet should include route-choice evidence");
    assert.match(playtestPacket, /Route Loop Trace/, "playtest packet should include route-loop evidence");
    assert.match(playtestPacket, /Auto-filled from completed route history/, "playtest packet should explain route-loop autofill");
    assert.match(playtestPacket, /Latest scorecard target: Browser local storage: harborline\.playtestArtifact\.latest/, "playtest packet should include latest collection target");
    assert.match(playtestPacket, /Scorecard history target: Browser local storage: harborline\.playtestArtifact\.history\.v1/, "playtest packet should include history collection target");
    assert.match(playtestPacket, /\| 1 \| [A-Za-z][^|]* \| [A-Za-z][^|]* \|/, "playtest packet should prefill a completed route loop");
    assert.match(playtestPacket, /Required Observer Notes/, "playtest packet should include observer prompts");
    assert.match(playtestPacket, /Runtime errors:/, "playtest packet should include runtime error count");
    await clickUnique(page.getByTestId("validate-playtest-scorecard"), "Reject non-scorecard playtest text");
    await assertText(page.getByTestId("settings-status"), "Current playtest text is not a scorecard");
    await clickUnique(page.getByTestId("generate-playtest-scorecard"), "Generate playtest scorecard");
    await assertText(page.getByTestId("settings-status"), "Playtest scorecard generated");
    await assertText(page.getByTestId("playtest-scorecard-check"), "Current Scorecard Incomplete");
    await assertText(page.getByTestId("playtest-scorecard-check-missing"), "tester");
    const playtestScorecard = await page.getByTestId("playtest-packet").inputValue();
    assert.match(playtestScorecard, /Harborline Playtest Scorecard Draft/, "playtest scorecard should include a title");
    assert.match(playtestScorecard, /Core Scores/, "playtest scorecard should include scoring table");
    assert.match(playtestScorecard, /Observer script read before launch: yes\/no/, "playtest scorecard should include no-coaching protocol fields");
    assert.match(playtestScorecard, /Collected playtest\.latest\.md path: Browser local storage: harborline\.playtestArtifact\.latest/, "playtest scorecard should include latest collection target");
    assert.match(playtestScorecard, /Collected playtest\.history\.v1\.json path, or separate-scorecard assembly note: Browser local storage: harborline\.playtestArtifact\.history\.v1/, "playtest scorecard should include history collection target");
    assert.match(playtestScorecard, /Friction Log/, "playtest scorecard should include friction log");
    assert.match(playtestScorecard, /Attached Evidence Packet/, "playtest scorecard should attach evidence packet");
    assert.match(playtestScorecard, /\| 1 \| [A-Za-z][^|]* \| [A-Za-z][^|]* \|/, "playtest scorecard should prefill a completed route loop");
    const editedScorecard = `${playtestScorecard.trim()}\n\nObserver smoke note: editable scorecard saved.`;
    await page.getByTestId("playtest-packet").fill(editedScorecard);
    await assertText(page.getByTestId("playtest-scorecard-check"), "Current Scorecard Incomplete");
    await assertText(page.getByTestId("playtest-scorecard-check-missing"), "observer");
    await clickUnique(page.getByTestId("validate-playtest-scorecard"), "Validate incomplete scorecard before save");
    await assertText(page.getByTestId("settings-status"), "Scorecard missing: tester, observer");
    await clickUnique(page.getByTestId("save-playtest-artifact"), "Save playtest artifact");
    await assertText(page.getByTestId("settings-status"), "Playtest scorecard saved");
    await assertText(page.getByTestId("settings-status"), "1 scorecard archived");
    await assertText(page.getByTestId("settings-status"), "does not qualify: tester, observer");
    await assertText(page.getByTestId("playtest-readiness"), "0/3 unique qualified testers");
    await assertText(page.getByTestId("playtest-score-quality"), "Score Gate Pending");
    await assertText(page.getByTestId("playtest-readiness"), "M-026A");
    await assertText(page.getByTestId("playtest-readiness-missing"), "tester");
    await assertText(page.getByTestId("playtest-readiness-missing"), "observer");
    assert.match(await page.getByTestId("playtest-packet").inputValue(), /Observer smoke note: editable scorecard saved\./);
    await clickUnique(page.getByTestId("generate-playtest-triage"), "Generate playtest triage");
    await assertText(page.getByTestId("settings-status"), "Playtest triage generated");
    const playtestTriage = await page.getByTestId("playtest-packet").inputValue();
    assert.match(playtestTriage, /Harborline Playtest Triage Report/, "playtest triage should include a title");
    assert.match(playtestTriage, /0\/3 unique qualified testers/, "playtest triage should include qualified readiness");
    assert.match(playtestTriage, /Score Quality Gate/, "playtest triage should include the score gate section");
    assert.match(playtestTriage, /Score quality: pending/, "playtest triage should report pending score quality before enough sessions");
    assert.match(playtestTriage, /Unqualified scorecards ignored: 1/, "playtest triage should ignore blank generated scorecards");
    assert.match(playtestTriage, /Unqualified Scorecards/, "playtest triage should include unqualified scorecard details");
    assert.match(playtestTriage, /tester, observer, first-time player yes/, "playtest triage should explain why the saved draft does not qualify");
    assert.match(playtestTriage, /Collect more fresh-player scorecards for M-026A/, "playtest triage should preserve the external-session gate");
    await clickUnique(page.getByTestId("save-playtest-artifact"), "Save playtest triage artifact");
    await assertText(page.getByTestId("settings-status"), "Playtest triage report saved");
    await assertText(page.getByTestId("settings-status"), "1 scorecard archived");
    await assertText(page.getByTestId("playtest-readiness"), "0/3 unique qualified testers");

    const closedEnvelope = JSON.parse(exportedSave);
    closedEnvelope.state.gameOver = true;
    closedEnvelope.state.cash = Math.max(closedEnvelope.state.cash ?? 0, 3600);
    closedEnvelope.state.debt = Math.min(closedEnvelope.state.debt ?? 0, 420);
    closedEnvelope.state.equipment = Array.from(new Set([...(closedEnvelope.state.equipment ?? []), "weather_glass"]));
    closedEnvelope.state.log = [
      { day: closedEnvelope.state.day ?? 18, text: "Sold 3 Tea for $420; profit $144." },
      { day: closedEnvelope.state.day ?? 18, text: "Storm Front: Crew trimmed against a confused swell." },
      ...(closedEnvelope.state.log ?? []),
    ];
    await page.getByTestId("save-transfer").fill(JSON.stringify(closedEnvelope, null, 2));
    await clickEnabled(page.getByTestId("import-save"), "Import closed-run save");
    await page.getByTestId("run-recap").waitFor({ state: "visible", timeout: 8_000 });
    await assertText(page.getByTestId("run-story"), "Build Identity");
    await assertText(page.getByTestId("run-story"), "Best Trade");
    await assertText(page.getByTestId("run-story"), "Next Challenge");
    await assertReplayHooksAndStart(page);

    await assertRuntimeClean(page);
    await assertCanvasProbe(page);
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
    assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
  } finally {
    await browser.close();
  }

  console.log(`\nBrowser regression smoke passed at ${previewUrl}.`);
}

async function browserExecutablePath() {
  const candidates = [
    process.env.HARBORLINE_BROWSER_EXECUTABLE,
    chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  throw new Error(`No browser executable found for smoke test. Checked:\n${candidates.join("\n")}`);
}

async function resolveVoyage(page, startPort) {
  const start = Date.now();
  while (Date.now() - start < smokeTimeoutMs) {
    if (await clickIfVisible(page.getByTestId("resolve-sea-safe"), "safe sea resolution")) {
      await page.waitForTimeout(150);
      continue;
    }
    if (await clickIfVisible(page.getByTestId("submit-inspection"), "inspection fine")) {
      await page.waitForTimeout(150);
      continue;
    }
    const piratePay = page.locator(".encounter-actions button").filter({ hasText: /^Pay / });
    if (await clickIfVisible(piratePay, "pirate payoff")) {
      await page.waitForTimeout(150);
      continue;
    }

    const currentPort = await page.locator(".map-header h2").innerText();
    const underSail = await page.getByRole("heading", { name: "Under Sail", exact: true }).isVisible().catch(() => false);
    if (currentPort !== startPort && !underSail) return currentPort;
    await page.waitForTimeout(250);
  }
  throw new Error("Timed out waiting for voyage to finish.");
}

async function assertRuntimeClean(page) {
  const health = await page.getByTestId("runtime-health").innerText();
  if (!/Runtime\s+Clean/i.test(health)) {
    throw new Error(`Runtime health should be clean, got: ${health}\n${await runtimeDiagnostics(page)}`);
  }
  const errorCount = await page.getByTestId("error-count").innerText().catch(() => "Runtime clean");
  if (!/Runtime clean/i.test(errorCount)) {
    throw new Error(`Intel error log should be clean, got: ${errorCount}\n${await runtimeDiagnostics(page)}`);
  }
}

async function assertMainActionReady(page, labelPattern) {
  const order = page.getByTestId("captain-order");
  await order.waitFor({ state: "visible", timeout: 8_000 });
  const targetKind = await order.getAttribute("data-target-kind");
  assert.notEqual(targetKind, "none", "main play surface should expose a runnable next action");
  const button = page.getByTestId("captain-order-action");
  assert.equal(await button.isEnabled(), true, "captain order action should be enabled on the main surface");
  const label = await button.innerText();
  assert.match(label, labelPattern, `unexpected captain order action label: ${label}`);
}

async function assertFeedbackTaxonomy(page) {
  const pulse = await page.getByTestId("event-pulse");
  await pulse.waitFor({ state: "visible", timeout: 8_000 });
  const metadata = await pulse.evaluate((element) => ({
    audioCue: element.getAttribute("data-feedback-audio-cue"),
    category: element.getAttribute("data-feedback-category"),
    kind: element.getAttribute("data-feedback-kind"),
    motion: element.getAttribute("data-feedback-motion"),
    priority: element.getAttribute("data-feedback-priority"),
    tone: element.getAttribute("data-feedback-tone"),
  }));
  assert.match(metadata.audioCue ?? "", /^[a-z]+(?:-[a-z]+)*$/, "feedback pulse should expose an audio cue");
  assert.match(metadata.category ?? "", /^(contract|crew|customs|damage|game-over|insurance|market|pirate|profit|loss|rank-up|route|save|storm|upgrade)$/, "feedback pulse should expose a stable category");
  assert.match(metadata.kind ?? "", /^(contract|damage|economy|encounter|progress|profit|route|save|upgrade)$/, "feedback pulse should expose the legacy kind");
  assert.match(metadata.motion ?? "", /^(calm|pop|shake|surge|flash|drop)$/, "feedback pulse should expose a motion hook");
  assert.match(metadata.priority ?? "", /^(ambient|normal|high|critical)$/, "feedback pulse should expose priority");
  assert.match(metadata.tone ?? "", /^(gain|loss|risk|progress|neutral)$/, "feedback pulse should expose tone");
}

async function assertFeedbackCategory(page, expectedCategories) {
  await assertFeedbackTaxonomy(page);
  const category = await page.getByTestId("event-pulse").getAttribute("data-feedback-category");
  assert.ok(expectedCategories.includes(category), `feedback category should be one of ${expectedCategories.join(", ")}, got ${category}`);
}

async function assertMarketPulse(page, goodId) {
  const pulse = page.getByTestId(`market-pulse-${goodId}`);
  await pulse.waitFor({ state: "visible", timeout: 8_000 });
  const metadata = await pulse.evaluate((element) => ({
    confidence: Number(element.getAttribute("data-market-forecast-confidence") ?? 0),
    delta: Number(element.getAttribute("data-market-forecast-delta") ?? 0),
    kind: element.getAttribute("data-market-forecast-kind") ?? "",
    text: element.textContent ?? "",
  }));
  assert.match(metadata.kind, /^(climbing|cooling|buy-window|squeeze|steady)$/, "market pulse should expose a stable forecast kind");
  assert.ok(Number.isFinite(metadata.delta), "market pulse should expose numeric forecast delta");
  assert.ok(metadata.confidence >= 0.32 && metadata.confidence <= 0.94, "market pulse should expose bounded confidence");
  assert.match(metadata.text, /Price climbing|Cooling price|Buy window|Faction squeeze|Steady quote/, "market pulse should show a readable forecast label");
}

async function assertMarketHistory(page, goodId) {
  const history = page.getByTestId(`market-history-${goodId}`);
  await history.waitFor({ state: "visible", timeout: 8_000 });
  const metadata = await history.evaluate((element) => ({
    direction: element.getAttribute("data-market-history-direction") ?? "",
    percent: Number(element.getAttribute("data-market-history-percent") ?? 0),
    samples: Number(element.getAttribute("data-market-history-samples") ?? 0),
    text: element.textContent ?? "",
  }));
  assert.match(metadata.direction, /^(up|down|flat|new)$/, "market history should expose a stable direction");
  assert.ok(Number.isFinite(metadata.percent), "market history should expose numeric percent change");
  assert.ok(metadata.samples >= 1 && metadata.samples <= 8, "market history should expose bounded sample count");
  assert.match(metadata.text, /(New quote|Firming|Softening|Rangebound|Rising fast|Falling fast)/, "market history should show a readable trend label");
}

async function assertMovingMarkets(page) {
  const movingMarketRows = page.locator('[data-testid^="moving-market-"]');
  const count = await movingMarketRows.count();
  assert.ok(count >= 1, "Intel should expose moving market rows");
  const text = await page.locator(".desk-block").filter({ hasText: "Moving Markets" }).first().innerText();
  assert.match(text, /(New quote|Firming|Softening|Rangebound|Rising fast|Falling fast)/, "Moving Markets should show readable quote history labels");
  assert.match(text, /\$\d+/, "Moving Markets should include last quote prices");
}

async function assertFactionWatch(page) {
  const factionRows = page.locator('[data-testid^="faction-watch-"]');
  const count = await factionRows.count();
  assert.ok(count >= 1, "Intel should expose faction watch rows");
  const text = await page.locator(".desk-block").filter({ hasText: "Faction Watch" }).first().innerText();
  assert.match(text, /(Political edge|Convoy cover|Permit edge|Tariff squeeze|Dock squeeze|Faction squeeze|Inspection risk|Route risk|Watched docks|Neutral water)/, "Faction Watch should show readable political pressure labels");
  assert.match(text, /routes .* prices /, "Faction Watch should expose route and price effects");
}

async function assertCrewDrill(page) {
  const facility = page.getByTestId("crew-facility");
  await facility.waitFor({ state: "visible", timeout: 8_000 });
  const metadata = await facility.evaluate((element) => ({
    facilityId: element.getAttribute("data-drill-facility") ?? "",
    text: element.textContent ?? "",
    xp: Number(element.getAttribute("data-drill-xp") ?? 0),
  }));
  assert.match(metadata.facilityId, /^(none|crew_quarters|officer_cabins|galley_mess|watch_bunks)$/, "crew facility should expose drill facility metadata");
  assert.ok(metadata.xp > 0, "crew facility drill should expose XP metadata");
  assert.match(metadata.text, /(No Facility|Crew Quarters|Officer Cabins|Galley Mess|Watch Bunks)/, "crew facility should show the active facility");
  assert.match(metadata.text, /Drill/, "crew facility should expose an active drill action");
  assert.equal(await page.getByTestId("crew-drill").isEnabled(), true, "crew drill should be available after cash and crew are present");
}

async function assertReplayHooksAndStart(page) {
  const hooks = page.locator('[data-testid^="replay-hook-"]');
  await page.getByTestId("replay-hooks").waitFor({ state: "visible", timeout: 8_000 });
  assert.ok((await hooks.count()) >= 3, "run recap should expose three replay hook cards");
  const firstHook = hooks.first();
  const metadata = await firstHook.evaluate((element) => ({
    id: element.getAttribute("data-replay-hook-id") ?? "",
    setup: element.getAttribute("data-replay-hook-setup") ?? "",
    target: element.getAttribute("data-replay-hook-target") ?? "",
    text: element.textContent ?? "",
  }));
  assert.match(metadata.id, /^(clean_credit|contract_house|storm_sailor|fast_ledger|risk_trader)$/, "replay hook should expose a stable hook id");
  assert.ok(metadata.setup.length > 8, "replay hook should expose setup metadata");
  assert.ok(metadata.target.length > 8, "replay hook should expose target metadata");
  assert.match(metadata.text, /Start/, "replay hook card should expose a start action");
  await clickEnabled(page.getByTestId(`start-hook-${metadata.id}`), `start ${metadata.id} replay hook`);
  await page.getByTestId("route-command").waitFor({ state: "visible", timeout: 8_000 });
  await assertText(page.getByTestId("captain-log"), "Replay hook:");
  await assertMainActionReady(page, /Load|Open|Borrow|Repair|Sell|Deliver|Plot/i);
}

async function assertIdentityTokens(page) {
  await assertIdentityToken(page.getByTestId("captain-identity-token"), "captain", "captain identity token");
  await assertIdentityToken(page.getByTestId("current-port-faction-token"), "faction", "current port faction token");
}

async function assertIdentityToken(locator, expectedKind, label) {
  await locator.waitFor({ state: "visible", timeout: 8_000 });
  assert.equal(await locator.getAttribute("data-identity-kind"), expectedKind, `${label} should expose identity kind`);
  assert.ok(await locator.getAttribute("data-identity-id"), `${label} should expose identity id`);
  assert.ok(await locator.getAttribute("data-identity-role"), `${label} should expose identity role`);
  assert.ok(await locator.getAttribute("data-identity-cue"), `${label} should expose identity cue`);
}

async function runtimeDiagnostics(page) {
  await clickUnique(page.getByTestId("runtime-health"), "runtime health button").catch(() => undefined);
  const errorText = await page.getByTestId("error-log").textContent().catch(() => "");
  return `Runtime diagnostics:\n${errorText || "No error log details visible."}`;
}

async function assertCanvasProbe(page) {
  await page.waitForFunction(() => {
    const map = document.querySelector('[data-testid="map-canvas"]');
    return map?.getAttribute("data-canvas-pixel-status") === "nonblank" && map?.getAttribute("data-canvas-pixel-variety") === "varied";
  }, null, { timeout: 12_000 });

  const probe = await page.getByTestId("map-canvas").evaluate((map) => ({
    pixelStatus: map.getAttribute("data-canvas-pixel-status"),
    pixelVariety: map.getAttribute("data-canvas-pixel-variety"),
    samples: Number(map.getAttribute("data-canvas-pixel-samples") ?? 0),
    colors: Number(map.getAttribute("data-canvas-pixel-colors") ?? 0),
    waterRenderer: map.getAttribute("data-water-renderer"),
  }));
  assert.equal(probe.pixelStatus, "nonblank");
  assert.equal(probe.pixelVariety, "varied");
  assert.ok(probe.samples > 0, "canvas probe should report sampled pixels");
  assert.ok(probe.colors > 1, "canvas probe should report color variety");
  assert.ok(probe.waterRenderer, "map should report the active water renderer");
}

async function assertOceanSurfaceSignals(page) {
  const surface = await page.getByTestId("map-canvas").evaluate((map) => ({
    current: Number(map.getAttribute("data-water-signal-current") ?? 0),
    depthContrast: Number(map.getAttribute("data-ocean-depth-contrast") ?? 0),
    foam: Number(map.getAttribute("data-water-signal-foam") ?? 0),
    foamCoverage: Number(map.getAttribute("data-water-surface-foam-coverage") ?? 0),
    currentRibbons: Number(map.getAttribute("data-water-surface-current-ribbons") ?? 0),
    normalVariance: Number(map.getAttribute("data-water-surface-normal-variance") ?? 0),
    renderer: map.getAttribute("data-water-renderer"),
    roughness: Number(map.getAttribute("data-water-signal-roughness") ?? 0),
    routeRisk: Number(map.getAttribute("data-water-signal-route-risk") ?? 0),
    signals: map.getAttribute("data-water-signals") ?? "",
    storm: Number(map.getAttribute("data-water-signal-storm") ?? 0),
    stormCoverage: Number(map.getAttribute("data-water-surface-storm-coverage") ?? 0),
    surface: map.getAttribute("data-water-surface"),
    tiles: Number(map.getAttribute("data-water-surface-tiles") ?? 0),
  }));
  assert.equal(surface.surface, "production-ocean-surface-v2", "map should expose production ocean surface v2");
  assert.match(surface.signals, /swell/);
  assert.match(surface.signals, /current/);
  assert.match(surface.signals, /roughness/);
  assert.match(surface.signals, /storm/);
  assert.match(surface.signals, /foam/);
  assert.match(surface.signals, /route-risk/);
  assert.match(surface.signals, /depth/);
  assert.ok(surface.renderer === "shader-mesh-v2" || surface.renderer === "low-power-graphics-v2", "map should report a concrete water renderer");
  assert.ok(surface.current > 0.02, "ocean current signal should be nonzero");
  assert.ok(surface.roughness > 0.08, "ocean roughness signal should be nonzero");
  assert.ok(surface.depthContrast > 0.12, "ocean depth contrast should be visible");
  assert.ok(Number.isFinite(surface.foam), "ocean foam signal should be numeric");
  assert.ok(Number.isFinite(surface.storm), "ocean storm signal should be numeric");
  assert.ok(Number.isFinite(surface.routeRisk), "selected route risk signal should be numeric");
  assert.ok(surface.tiles >= 9, "sampled water surface should report tile samples");
  assert.ok(surface.currentRibbons > 0.02, "sampled water surface should report current-ribbon strength");
  assert.ok(surface.normalVariance > 0.06, "sampled water surface should report wave-normal variance");
  assert.ok(surface.foamCoverage >= 0, "sampled water surface should report foam coverage");
  assert.ok(surface.stormCoverage >= 0, "sampled water surface should report storm coverage");
}

async function assertShipOceanResponse(page, { routeRequired }) {
  await page.waitForFunction(
    ({ routeRequired: needsRoute }) => {
      const map = document.querySelector('[data-testid="map-canvas"]');
      if (!map) return false;
      if (map.getAttribute("data-ship-motion") !== "ocean-response-v3") return false;
      const values = (map.getAttribute("data-ship-response") ?? "").split(",").map(Number);
      const waveEnergy = values[5] ?? 0;
      const drift = values[3] ?? 0;
      const curvature = values[8] ?? 0;
      const wakeLength = values[10] ?? 0;
      const hullResponse = values[13] ?? 0;
      return waveEnergy > 0.04 && drift > 0.01 && wakeLength > 0.4 && hullResponse >= 0 && (!needsRoute || curvature > 0);
    },
    { routeRequired },
    { timeout: 8_000 }
  );
  const response = await page.getByTestId("map-canvas").evaluate((map) => {
    const values = (map.getAttribute("data-ship-response") ?? "").split(",").map(Number);
    return {
      bob: values[0] ?? 0,
      curvature: values[8] ?? 0,
      currentAssist: values[9] ?? 0,
      drift: values[3] ?? 0,
      foam: values[6] ?? 0,
      hullResponse: values[13] ?? 0,
      motion: map.getAttribute("data-ship-motion"),
      roll: values[1] ?? 0,
      storm: values[7] ?? 0,
      wakeDeflection: values[4] ?? 0,
      wakeLength: values[10] ?? 0,
      wakeSpread: values[11] ?? 0,
      wakeTurbulence: values[12] ?? 0,
      waveEnergy: values[5] ?? 0,
      yaw: values[2] ?? 0,
    };
  });
  assert.equal(response.motion, "ocean-response-v3", "map should expose ship-aware ocean response");
  assert.ok(response.waveEnergy > 0.04, "ship wave-energy response should be nonzero");
  assert.ok(response.drift > 0.01, "ship drift response should be nonzero");
  assert.ok(Number.isFinite(response.bob), "ship bob response should be numeric");
  assert.ok(Number.isFinite(response.roll), "ship roll response should be numeric");
  assert.ok(Number.isFinite(response.yaw), "ship yaw response should be numeric");
  assert.ok(Number.isFinite(response.wakeDeflection), "ship wake-deflection response should be numeric");
  assert.ok(Number.isFinite(response.foam), "ship foam response should be numeric");
  assert.ok(Number.isFinite(response.storm), "ship storm response should be numeric");
  assert.ok(Number.isFinite(response.currentAssist), "ship current-assist response should be numeric");
  assert.ok(response.wakeLength > 0.4, "ship wake-length response should be nonzero");
  assert.ok(response.wakeSpread > 0.4, "ship wake-spread response should be nonzero");
  assert.ok(Number.isFinite(response.wakeTurbulence), "ship wake turbulence should be numeric");
  assert.ok(Number.isFinite(response.hullResponse), "ship hull response should be numeric");
  if (routeRequired) assert.ok(response.curvature > 0, "plotted route should expose ocean-driven route curvature");
}

async function assertAccessibilityBaseline(page) {
  const result = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const selectedTabs = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
    const portButtons = [...document.querySelectorAll('button[data-testid^="map-port-"]')];
    const selectedPorts = portButtons.filter((button) => button.getAttribute("aria-pressed") === "true");
    const currentPorts = portButtons.filter((button) => button.getAttribute("aria-current") === "location");
    const routeChoices = [...document.querySelectorAll('button[data-testid^="route-choice-"]')];
    const map = document.querySelector('[data-testid="map-canvas"]');
    return {
      tablist: Boolean(document.querySelector('[role="tablist"]')),
      tabs: tabs.length,
      selectedTabs: selectedTabs.length,
      tabControls: tabs.every((tab) => tab.getAttribute("aria-controls") === "desk-content"),
      portButtons: portButtons.length,
      selectedPorts: selectedPorts.length,
      currentPorts: currentPorts.length,
      routeChoices: routeChoices.length,
      routeChoicesPressed: routeChoices.every((button) => button.hasAttribute("aria-pressed")),
      mapRole: map?.getAttribute("role"),
      mapReducedMotion: map?.getAttribute("data-reduced-motion"),
    };
  });
  assert.equal(result.tablist, true, "port desk tabs should expose a tablist role");
  assert.equal(result.tabs, 4, "port desk should expose four tab buttons");
  assert.equal(result.selectedTabs, 1, "exactly one port desk tab should be selected");
  assert.equal(result.tabControls, true, "tabs should control the desk content panel");
  assert.ok(result.portButtons >= 6, "map should expose keyboard port buttons");
  assert.equal(result.selectedPorts, 1, "exactly one map port button should be selected");
  assert.equal(result.currentPorts, 1, "exactly one map port button should mark current location");
  assert.ok(result.routeChoices >= 3, "route choices should be keyboard buttons");
  assert.equal(result.routeChoicesPressed, true, "route choices should expose pressed state");
  assert.equal(result.mapRole, "img", "canvas map should expose image semantics");
  assert.match(result.mapReducedMotion ?? "", /^(true|false)$/, "map should expose reduced motion state");
}

async function assertDeskFocused(page) {
  await page.waitForFunction(() => document.activeElement?.id === "desk-content", null, { timeout: 4_000 });
}

async function assertReducedMotionToggle(page) {
  const toggle = page.getByTestId("reduced-motion");
  await assertUnique(toggle, "Reduced Motion toggle");
  const before = await toggle.isChecked();
  await toggle.setChecked(!before);
  const expected = String(!before);
  await page.waitForFunction(
    (expected) =>
      document.documentElement.dataset.reducedMotion === expected &&
      document.querySelector('[data-testid="map-canvas"]')?.getAttribute("data-reduced-motion") === expected,
    expected,
    { timeout: 8_000 }
  );
  await assertFeedbackTaxonomy(page);
  const feedbackMotion = await page.getByTestId("event-pulse").getAttribute("data-feedback-motion");
  if (expected === "true") assert.equal(feedbackMotion, "calm", "reduced motion should calm feedback pulse motion");
}

async function assertShipyardBuilds(page) {
  const shipBuilds = page.locator('[data-testid^="ship-build-"]');
  const recommendedBuilds = page.locator('[data-testid^="recommended-build-"]');
  assert.ok((await shipBuilds.count()) >= 4, "shipyard should expose build badges for every hull");
  assert.ok((await recommendedBuilds.count()) >= 1, "recommended refits should expose build badges");

  const shipyardText = await page.getByTestId("tab-harbor").evaluate(() => document.body.textContent ?? "");
  assert.match(shipyardText, /Fast Courier|Armored Hauler|Storm Sailor|Contract Runner|Smuggler|Market Manipulator/, "shipyard should name build archetypes");
  assert.match(shipyardText, /Selected lane:.*Route /s, "ship cards should compare route-fit deltas on a selected lane");
  assert.match(await page.getByTestId("recommended-refits").innerText(), /Route (stable|-|\+)/, "recommended refits should show selected-lane route impact");
}

async function assertText(locator, expected) {
  try {
    await locator.waitFor({ state: "visible", timeout: 8_000 });
  } catch (error) {
    throw new Error(`Expected locator to be visible before checking "${expected}". ${await locatorSnapshot(locator)}\n${errorMessage(error)}`);
  }
  const start = Date.now();
  while (Date.now() - start < 8_000) {
    const text = await locator.textContent();
    if (text?.includes(expected)) return;
    await delay(100);
  }
  throw new Error(`Expected locator text to include "${expected}". ${await locatorSnapshot(locator)}`);
}

async function locatorSnapshot(locator) {
  const count = await locator.count().catch(() => -1);
  const nodes = [];
  const limit = Math.max(0, Math.min(count, 3));
  for (let index = 0; index < limit; index += 1) {
    const current = locator.nth(index);
    nodes.push({
      text: await current.textContent().catch(() => null),
      visible: await current.isVisible().catch(() => false),
      box: await current.boundingBox().catch(() => null),
    });
  }
  return `Locator snapshot: ${JSON.stringify({ count, nodes })}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function clickEnabled(locator, label) {
  await assertUnique(locator, label);
  const enabled = await locator.isEnabled();
  assert.ok(enabled, `${label} should be enabled`);
  await locator.click();
}

async function clickUnique(locator, label) {
  await assertUnique(locator, label);
  await locator.click();
}

async function clickIfVisible(locator, label) {
  const count = await locator.count();
  if (count === 0) return false;
  assert.equal(count, 1, `${label} should resolve to one element`);
  if (!(await locator.isVisible())) return false;
  if (!(await locator.isEnabled())) return false;
  await locator.click();
  return true;
}

async function assertUnique(locator, label) {
  const count = await locator.count();
  assert.equal(count, 1, `${label} should resolve to one element, found ${count}`);
  await locator.waitFor({ state: "visible", timeout: 8_000 });
}

async function assertBuiltAppExists() {
  const htmlPath = path.resolve("dist/index.html");
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /<div id="root">/, "dist/index.html should contain the React root");
  assert.match(html, /data-testid="boot-screen"/, "dist/index.html should contain the loading state");
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a local preview port.")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for process exit.")), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

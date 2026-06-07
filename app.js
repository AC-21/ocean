const canvas = document.querySelector("#map-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  netWorth: document.querySelector("#net-worth"),
  cash: document.querySelector("#cash"),
  debt: document.querySelector("#debt"),
  day: document.querySelector("#day"),
  best: document.querySelector("#best"),
  hull: document.querySelector("#hull-meter"),
  cargo: document.querySelector("#cargo-meter"),
  hold: document.querySelector("#hold"),
  cannons: document.querySelector("#cannons"),
  speed: document.querySelector("#speed"),
  cargoList: document.querySelector("#cargo-list"),
  currentPort: document.querySelector("#current-port"),
  selectedRoute: document.querySelector("#selected-route"),
  sailButton: document.querySelector("#sail-button"),
  selectedPort: document.querySelector("#selected-port"),
  portTag: document.querySelector("#port-tag"),
  portFlavor: document.querySelector("#port-flavor"),
  deskContent: document.querySelector("#desk-content"),
  captainLog: document.querySelector("#captain-log"),
  newRun: document.querySelector("#new-run"),
  settleDebt: document.querySelector("#settle-debt"),
  saveRun: document.querySelector("#save-run"),
  loadRun: document.querySelector("#load-run"),
  tabs: [...document.querySelectorAll(".tab")],
};

const palette = {
  ink: "#111716",
  sea: "#e4f1ef",
  coast: "#d8d4b8",
  green: "#4fa36c",
  blue: "#367c9a",
  gold: "#d6a43a",
  red: "#c8503e",
  violet: "#7367b2",
  white: "#fffaf0",
};

const assetSources = {
  ocean: "assets/generated/backgrounds/ocean-map.jpg",
  ship: "assets/generated/sprites/merchant-boat-clean.png",
  ports: {
    grayhaven: "assets/generated/sprites/port-grayhaven-clean.png",
    saffron: null,
    glassport: "assets/generated/sprites/port-glassport-clean.png",
    stormhook: "assets/generated/sprites/port-stormhook-clean.png",
    orchid: "assets/generated/sprites/port-orchid-clean.png",
    lowmarket: "assets/generated/sprites/port-lowmarket-clean.png",
  },
};

const assets = {
  ocean: null,
  ship: null,
  ports: {},
  loaded: 0,
  total: 0,
};

const ports = [
  {
    id: "grayhaven",
    name: "Grayhaven",
    x: 0.18,
    y: 0.63,
    risk: 0.16,
    flavor: "A foggy exchange where clerks price risk with ink-stained fingers.",
    faction: "charter",
    exports: ["iron", "tools"],
    imports: ["silk", "medicine"],
  },
  {
    id: "saffron",
    name: "Saffron Quay",
    x: 0.34,
    y: 0.28,
    risk: 0.23,
    flavor: "A spice harbor with fast talkers, faster ships, and very real shortages.",
    faction: "freeports",
    exports: ["spice", "tea"],
    imports: ["iron", "tools"],
  },
  {
    id: "glassport",
    name: "Glassport",
    x: 0.57,
    y: 0.48,
    risk: 0.2,
    flavor: "Tall warehouses, careful bankers, and contracts written in tiny print.",
    faction: "charter",
    exports: ["glass", "medicine"],
    imports: ["tea", "spice"],
  },
  {
    id: "stormhook",
    name: "Stormhook",
    x: 0.78,
    y: 0.22,
    risk: 0.34,
    flavor: "A hard northern port where sailors buy cannons before coats.",
    faction: "admiralty",
    exports: ["iron", "medicine"],
    imports: ["silk", "tea"],
  },
  {
    id: "orchid",
    name: "Orchid Roads",
    x: 0.82,
    y: 0.68,
    risk: 0.27,
    flavor: "Quiet docks, deep pockets, and silk buyers who never blink first.",
    faction: "freeports",
    exports: ["silk", "glass"],
    imports: ["tools", "spice"],
  },
  {
    id: "lowmarket",
    name: "Lowmarket",
    x: 0.47,
    y: 0.76,
    risk: 0.18,
    flavor: "A practical harbor where every crate gets weighed twice.",
    faction: "league",
    exports: ["tools", "tea"],
    imports: ["medicine", "glass"],
  },
];

const goods = [
  { id: "tea", name: "Tea", base: 42, cargo: 1, note: "steady", volatility: 0.032 },
  { id: "spice", name: "Spice", base: 68, cargo: 1, note: "volatile", volatility: 0.065 },
  { id: "silk", name: "Silk", base: 96, cargo: 1, note: "luxury", volatility: 0.052 },
  { id: "iron", name: "Iron", base: 50, cargo: 2, note: "heavy", volatility: 0.038 },
  { id: "tools", name: "Tools", base: 74, cargo: 2, note: "industrial", volatility: 0.042 },
  { id: "medicine", name: "Medicine", base: 88, cargo: 1, note: "scarce", volatility: 0.058 },
  { id: "glass", name: "Glass", base: 58, cargo: 1, note: "fragile", volatility: 0.046 },
];

const tau = Math.PI * 2;

const factions = [
  {
    id: "charter",
    name: "Charter Bank",
    policy: "credit and tariffs",
    tariffGoods: ["silk", "medicine"],
    color: palette.blue,
  },
  {
    id: "freeports",
    name: "Freeport Compact",
    policy: "speed and open docks",
    tariffGoods: ["iron", "tools"],
    color: palette.green,
  },
  {
    id: "admiralty",
    name: "Admiralty Court",
    policy: "convoys and patrol law",
    tariffGoods: ["spice", "silk"],
    color: palette.red,
  },
  {
    id: "league",
    name: "Dockworkers League",
    policy: "labor leverage",
    tariffGoods: ["glass", "medicine"],
    color: palette.gold,
  },
];

const shipCatalog = [
  {
    id: "coastal_sloop",
    name: "Coastal Sloop",
    price: 0,
    cargoCap: 20,
    cannons: 1,
    speed: 1,
    openWater: 1,
    crewCap: 2,
    hullMax: 100,
    note: "cheap, quick to repair",
  },
  {
    id: "ledger_brig",
    name: "Ledger Brig",
    price: 2400,
    cargoCap: 32,
    cannons: 2,
    speed: 2,
    openWater: 2,
    crewCap: 3,
    hullMax: 110,
    note: "balanced trader",
  },
  {
    id: "clipper_kite",
    name: "Clipper Kite",
    price: 4200,
    cargoCap: 28,
    cannons: 1,
    speed: 4,
    openWater: 3,
    crewCap: 3,
    hullMax: 96,
    note: "fast route hunter",
  },
  {
    id: "iron_barge",
    name: "Iron Barge",
    price: 5200,
    cargoCap: 48,
    cannons: 3,
    speed: 1,
    openWater: 2,
    crewCap: 4,
    hullMax: 125,
    note: "heavy profit wall",
  },
];

const equipmentCatalog = [
  {
    id: "deep_rigging",
    name: "Deep-Water Rigging",
    cost: 980,
    effects: { speed: 1, openWater: 1 },
    note: "better angles in rough water",
  },
  {
    id: "cargo_hoist",
    name: "Cargo Hoist",
    cost: 820,
    effects: { cargoCap: 8 },
    note: "loads more freight without slowing turns",
  },
  {
    id: "weather_glass",
    name: "Weather Glass",
    cost: 760,
    effects: { navigation: 1, openWater: 1 },
    note: "reads trends before they punish you",
  },
  {
    id: "reinforced_ribs",
    name: "Reinforced Ribs",
    cost: 1120,
    effects: { hullMax: 15 },
    note: "survives bad crossings",
  },
  {
    id: "gun_deck",
    name: "Gun Deck",
    cost: 1340,
    effects: { cannons: 2 },
    note: "turns pirates into income",
  },
  {
    id: "smuggler_locker",
    name: "Smuggler Locker",
    cost: 900,
    effects: { negotiation: 1, cargoCap: 3 },
    note: "softens tariffs and inspections",
  },
];

const crewCatalog = [
  {
    id: "navigator",
    name: "Navigator",
    cost: 920,
    effects: { navigation: 2, speed: 1 },
    note: "shorter routes, fewer bad guesses",
  },
  {
    id: "quartermaster",
    name: "Quartermaster",
    cost: 860,
    effects: { negotiation: 2, cargoCap: 4 },
    note: "better prices and cleaner loading",
  },
  {
    id: "boatswain",
    name: "Boatswain",
    cost: 780,
    effects: { openWater: 1, hullMax: 8 },
    note: "keeps the ship together",
  },
  {
    id: "gunner",
    name: "Gunner",
    cost: 1100,
    effects: { cannons: 1 },
    note: "makes encounters less humiliating",
  },
];

const waveLayers = [
  { amp: 7.4, length: 280, speed: 0.78, dirX: 0.92, dirY: -0.38, phase: 0.1 },
  { amp: 4.8, length: 172, speed: -1.05, dirX: 0.47, dirY: 0.88, phase: 1.7 },
  { amp: 3.2, length: 94, speed: 1.56, dirX: -0.74, dirY: 0.67, phase: 2.9 },
  { amp: 1.7, length: 46, speed: -2.2, dirX: 0.98, dirY: 0.18, phase: 4.4 },
];

const currentZones = [
  { x: 0.18, y: 0.34, radius: 0.35, vx: 0.95, vy: -0.12 },
  { x: 0.53, y: 0.58, radius: 0.31, vx: 0.38, vy: 0.72 },
  { x: 0.8, y: 0.38, radius: 0.33, vx: -0.7, vy: 0.3 },
  { x: 0.42, y: 0.84, radius: 0.28, vx: 0.72, vy: -0.5 },
];

const bestKey = "harborline.bestNetWorth";
const maxDay = 60;

const state = {
  width: 1000,
  height: 700,
  dpr: 1,
  day: 1,
  cash: 850,
  debt: 500,
  hull: 100,
  cargoCap: 20,
  cannons: 1,
  speed: 1,
  currentPort: "grayhaven",
  selectedPort: "grayhaven",
  tab: "market",
  cargo: {},
  market: {},
  events: [],
  log: [],
  voyage: null,
  encounter: null,
  pendingArrival: null,
  gameOver: false,
  best: Number(localStorage.getItem(bestKey) || 0),
  lastTime: performance.now(),
  lastFrameWall: performance.now(),
  lastDrawTime: 0,
  oceanTime: 0,
};

function money(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function loadImage(src) {
  assets.total += 1;
  const image = new Image();
  image.onload = () => {
    assets.loaded += 1;
    drawMap();
  };
  image.onerror = () => {
    assets.loaded += 1;
    console.warn(`Could not load image asset: ${src}`);
  };
  image.src = src;
  return image;
}

function loadAssets() {
  assets.ocean = loadImage(assetSources.ocean);
  assets.ship = loadImage(assetSources.ship);
  for (const [id, src] of Object.entries(assetSources.ports)) {
    if (!src) continue;
    assets.ports[id] = loadImage(src);
  }
}

function portById(id) {
  return ports.find((port) => port.id === id);
}

function goodById(id) {
  return goods.find((good) => good.id === id);
}

function cargoUnits() {
  return goods.reduce((sum, good) => sum + (state.cargo[good.id] || 0) * good.cargo, 0);
}

function distanceBetween(a, b) {
  const dx = (a.x - b.x) * state.width;
  const dy = (a.y - b.y) * state.height;
  return Math.hypot(dx, dy);
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, length };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function prevailingWind(day = state.day) {
  const angle = -0.34 + Math.sin(day * 0.17) * 0.22 + Math.sin(day * 0.061) * 0.14;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function sampleCurrentField(normX, normY, moment = state.day * 0.19) {
  let vx = 0.14 * Math.cos(moment * 0.8 + normY * 6.1);
  let vy = 0.11 * Math.sin(moment * 0.7 + normX * 5.4);

  for (const zone of currentZones) {
    const dx = normX - zone.x;
    const dy = normY - zone.y;
    const dist = Math.hypot(dx, dy);
    const falloff = Math.max(0, 1 - dist / zone.radius) ** 2;
    const pulse = 0.86 + Math.sin(moment + zone.x * 9 + zone.y * 5) * 0.14;
    vx += zone.vx * falloff * pulse;
    vy += zone.vy * falloff * pulse;
  }

  return { x: vx, y: vy, strength: Math.hypot(vx, vy) };
}

function seaRoughnessAt(normX, normY, day = state.day) {
  const northernShelf = Math.max(0, 1 - Math.hypot(normX - 0.78, normY - 0.24) / 0.38);
  const southernChop = Math.max(0, 1 - Math.hypot(normX - 0.47, normY - 0.78) / 0.42);
  const crossingNoise = Math.sin(normX * 9.7 + normY * 6.2 + day * 0.31) * 0.09;
  return clamp(0.18 + northernShelf * 0.34 + southernChop * 0.2 + crossingNoise, 0.08, 0.78);
}

function routePhysics(fromId, toId) {
  const from = portById(fromId);
  const to = portById(toId);
  if (!from || !to || from.id === to.id) {
    return {
      route: { x: 1, y: 0, length: 1 },
      wind: prevailingWind(),
      current: { x: 0, y: 0, strength: 0 },
      windScore: 0,
      currentScore: 0,
      crosswind: 0,
      roughness: 0.18,
      speedMultiplier: 1,
      threatModifier: 0,
    };
  }

  const route = normalizeVector(to.x - from.x, to.y - from.y);
  const wind = prevailingWind();
  const windScore = dot(route, wind);
  const crosswind = Math.abs(cross(route, wind));

  let vx = 0;
  let vy = 0;
  let roughness = 0;
  const samples = 8;
  for (let index = 1; index <= samples; index += 1) {
    const progress = index / (samples + 1);
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    const current = sampleCurrentField(x, y);
    vx += current.x;
    vy += current.y;
    roughness += seaRoughnessAt(x, y);
  }

  const current = { x: vx / samples, y: vy / samples };
  current.strength = Math.hypot(current.x, current.y);
  roughness /= samples;

  const currentScore = dot(route, current);
  const windAssist = windScore * 0.15 + crosswind * 0.045;
  const currentAssist = currentScore * 0.2;
  const speedMultiplier = clamp(1 + windAssist + currentAssist - roughness * 0.07, 0.66, 1.36);
  const threatModifier =
    roughness * 0.08 + Math.max(0, -windScore) * 0.035 + Math.max(0, -currentScore) * 0.045;

  return {
    route,
    wind,
    current,
    windScore,
    currentScore,
    crosswind,
    roughness,
    speedMultiplier,
    threatModifier,
  };
}

function routeDays(fromId, toId) {
  const from = portById(fromId);
  const to = portById(toId);
  const physics = routePhysics(fromId, toId);
  const rawDays = distanceBetween(from, to) / (165 + state.speed * 38);
  return clamp(Math.ceil(rawDays / physics.speedMultiplier), 2, 8);
}

function routeRisk(fromId, toId) {
  const from = portById(fromId);
  const to = portById(toId);
  const physics = routePhysics(fromId, toId);
  const cargoPressure = cargoUnits() / state.cargoCap;
  const hullPenalty = state.hull < 45 ? 0.1 : 0;
  const cannonRelief = state.cannons * 0.025;
  return clamp(
    (from.risk + to.risk) / 2 + cargoPressure * 0.12 + hullPenalty + physics.threatModifier - cannonRelief,
    0.06,
    0.68
  );
}

function routeConditionSummary(fromId, toId) {
  const physics = routePhysics(fromId, toId);
  const wind =
    physics.windScore > 0.32
      ? "tailwind"
      : physics.windScore < -0.28
        ? "headwind"
        : physics.crosswind > 0.74
          ? "beam wind"
          : "crosswind";
  const current =
    physics.currentScore > 0.18
      ? "following current"
      : physics.currentScore < -0.14
        ? "contrary current"
        : "slack tide";
  const sea =
    physics.roughness > 0.56 ? "heavy swell" : physics.roughness > 0.38 ? "rolling swell" : "soft water";
  const speedDelta = Math.round((physics.speedMultiplier - 1) * 100);
  return { ...physics, wind, current, sea, speedDelta };
}

function scoreNow() {
  const current = portById(state.currentPort);
  const cargoValue = goods.reduce((sum, good) => {
    return sum + (state.cargo[good.id] || 0) * priceFor(current.id, good.id);
  }, 0);
  const shipValue = state.cargoCap * 36 + state.cannons * 520 + state.speed * 650 + state.hull * 7;
  return Math.round(state.cash + cargoValue + shipValue - state.debt);
}

function makeMarket() {
  const market = {};
  for (const port of ports) {
    market[port.id] = {};
    for (const good of goods) {
      let multiplier = randomBetween(0.82, 1.22);
      if (port.exports.includes(good.id)) multiplier *= randomBetween(0.58, 0.82);
      if (port.imports.includes(good.id)) multiplier *= randomBetween(1.18, 1.56);
      market[port.id][good.id] = Math.max(8, Math.round(good.base * multiplier));
    }
  }
  return market;
}

function priceFor(portId, goodId) {
  let price = state.market[portId]?.[goodId] || goodById(goodId).base;
  for (const event of state.events) {
    if (event.portId === portId && event.goodId === goodId && event.expires >= state.day) {
      price *= event.multiplier;
    }
  }
  return Math.max(5, Math.round(price));
}

function addLog(text) {
  state.log.unshift({ day: state.day, text });
  state.log = state.log.slice(0, 8);
}

function generateRumor() {
  const port = pick(ports);
  const good = pick(goods);
  const shortage = Math.random() < 0.72;
  const event = {
    portId: port.id,
    goodId: good.id,
    multiplier: shortage ? randomBetween(1.42, 1.86) : randomBetween(0.48, 0.72),
    expires: state.day + Math.floor(randomBetween(7, 13)),
    kind: shortage ? "shortage" : "glut",
  };
  state.events.unshift(event);
  state.events = state.events.slice(0, 5);
  addLog(`${port.name}: ${good.name} ${event.kind} until day ${event.expires}.`);
}

function driftMarkets() {
  for (const port of ports) {
    for (const good of goods) {
      const current = state.market[port.id][good.id];
      const drift = randomBetween(-0.045, 0.05);
      const anchor = good.base * (port.exports.includes(good.id) ? 0.72 : port.imports.includes(good.id) ? 1.34 : 1);
      const next = current * (1 + drift) + (anchor - current) * 0.035;
      state.market[port.id][good.id] = Math.max(6, Math.round(next));
    }
  }
}

function advanceDay(count) {
  for (let index = 0; index < count; index += 1) {
    state.day += 1;
    driftMarkets();
    if (state.day % 5 === 0) generateRumor();
    if (state.day % 10 === 0 && state.debt > 0) {
      const interest = Math.ceil(state.debt * 0.08);
      state.debt += interest;
      addLog(`Interest posted: ${money(interest)}.`);
    }
  }
  state.events = state.events.filter((event) => event.expires >= state.day);
  if (state.day > maxDay) endRun("The 60-day ledger closed.");
}

function newRun() {
  state.day = 1;
  state.cash = 850;
  state.debt = 500;
  state.hull = 100;
  state.cargoCap = 20;
  state.cannons = 1;
  state.speed = 1;
  state.currentPort = "grayhaven";
  state.selectedPort = "grayhaven";
  state.tab = "market";
  state.cargo = {};
  state.market = makeMarket();
  state.events = [];
  state.log = [];
  state.voyage = null;
  state.encounter = null;
  state.pendingArrival = null;
  state.gameOver = false;
  generateRumor();
  addLog("A clean ledger, a tired ship, and sixty days.");
  render();
}

function buyGood(goodId) {
  if (state.voyage || state.encounter || state.gameOver) return;
  const good = goodById(goodId);
  const price = priceFor(state.currentPort, goodId);
  if (state.cash < price || cargoUnits() + good.cargo > state.cargoCap) return;
  state.cash -= price;
  state.cargo[goodId] = (state.cargo[goodId] || 0) + 1;
  addLog(`Bought ${good.name} for ${money(price)}.`);
  render();
}

function sellGood(goodId) {
  if (state.voyage || state.encounter || state.gameOver) return;
  const qty = state.cargo[goodId] || 0;
  if (qty <= 0) return;
  const good = goodById(goodId);
  const price = priceFor(state.currentPort, goodId);
  state.cargo[goodId] = qty - 1;
  state.cash += price;
  addLog(`Sold ${good.name} for ${money(price)}.`);
  render();
}

function startVoyage() {
  if (state.voyage || state.encounter || state.gameOver) return;
  if (state.selectedPort === state.currentPort) return;
  const from = portById(state.currentPort);
  const to = portById(state.selectedPort);
  const days = routeDays(from.id, to.id);
  const risk = routeRisk(from.id, to.id);
  const conditions = routeConditionSummary(from.id, to.id);
  state.voyage = {
    fromId: from.id,
    toId: to.id,
    days,
    risk,
    progress: 0,
    duration: 1.15 + days * 0.12,
  };
  addLog(`Sailed for ${to.name}: ${days} days, ${conditions.wind}, ${conditions.sea}.`);
  render();
}

function finishVoyage() {
  const voyage = state.voyage;
  state.voyage = null;
  advanceDay(voyage.days);
  if (state.gameOver) return;

  const pirateRoll = Math.random();
  if (pirateRoll < voyage.risk) {
    const to = portById(voyage.toId);
    const strength = Math.round(28 + state.day * 1.2 + voyage.risk * 70 + randomBetween(-10, 18));
    state.pendingArrival = voyage.toId;
    state.encounter = {
      name: pick(["The Red Ledger", "Glassknife", "Captain Venn", "The Salt Widow"]),
      strength,
      bribe: Math.round(110 + strength * 3.4),
      bounty: Math.round(180 + strength * 5.8),
      portName: to.name,
    };
    addLog(`Pirate sails cut across the route to ${to.name}.`);
  } else {
    arrive(voyage.toId);
  }
  render();
}

function arrive(portId) {
  state.currentPort = portId;
  state.selectedPort = portId;
  state.tab = "market";
  state.pendingArrival = null;
  state.encounter = null;
  addLog(`Docked at ${portById(portId).name}.`);
  render();
}

function fightPirates() {
  if (!state.encounter) return;
  const enc = state.encounter;
  const player = state.cannons * 34 + state.hull * 0.5 + randomBetween(0, 40);
  const pirate = enc.strength + randomBetween(0, 34);
  if (player >= pirate) {
    const damage = Math.round(randomBetween(8, 22) + enc.strength * 0.08);
    state.hull = clamp(state.hull - damage, 0, 100);
    state.cash += enc.bounty;
    addLog(`Defeated ${enc.name}; claimed ${money(enc.bounty)}.`);
  } else {
    const damage = Math.round(randomBetween(22, 42) + enc.strength * 0.12);
    const loss = Math.min(state.cash, Math.round(enc.bounty * 0.44));
    state.hull = clamp(state.hull - damage, 0, 100);
    state.cash -= loss;
    loseRandomCargo();
    addLog(`${enc.name} mauled the ship. Lost ${money(loss)}.`);
  }
  if (state.hull <= 0) {
    endRun("The ship was lost at sea.");
    return;
  }
  arrive(state.pendingArrival);
}

function bribePirates() {
  if (!state.encounter) return;
  const cost = Math.min(state.cash, state.encounter.bribe);
  state.cash -= cost;
  addLog(`Paid ${money(cost)} to pass under black flags.`);
  arrive(state.pendingArrival);
}

function runPirates() {
  if (!state.encounter) return;
  const escapeChance = clamp(0.34 + state.speed * 0.14 + state.hull * 0.003 - state.encounter.strength * 0.002, 0.12, 0.82);
  if (Math.random() < escapeChance) {
    state.hull = clamp(state.hull - Math.round(randomBetween(4, 13)), 0, 100);
    addLog("Outran the pirates by burning canvas.");
  } else {
    const damage = Math.round(randomBetween(18, 34));
    state.hull = clamp(state.hull - damage, 0, 100);
    loseRandomCargo();
    addLog("Failed to flee cleanly. Cargo went overboard.");
  }
  if (state.hull <= 0) {
    endRun("The ship broke during the escape.");
    return;
  }
  arrive(state.pendingArrival);
}

function loseRandomCargo() {
  const carried = goods.filter((good) => (state.cargo[good.id] || 0) > 0);
  if (!carried.length) return;
  const good = pick(carried);
  const amount = Math.min(state.cargo[good.id], Math.ceil(randomBetween(1, 3)));
  state.cargo[good.id] -= amount;
  addLog(`Lost ${amount} ${good.name}.`);
}

function repairShip() {
  if (state.voyage || state.encounter || state.gameOver) return;
  const missing = 100 - state.hull;
  if (missing <= 0) return;
  const points = Math.min(15, missing);
  const cost = points * 9;
  if (state.cash < cost) return;
  state.cash -= cost;
  state.hull += points;
  addLog(`Repaired ${points} hull for ${money(cost)}.`);
  render();
}

function buyUpgrade(type) {
  if (state.voyage || state.encounter || state.gameOver) return;
  const costs = {
    hold: 760 + state.cargoCap * 18,
    cannon: 720 + state.cannons * 420,
    speed: 940 + state.speed * 520,
  };
  const cost = costs[type];
  if (state.cash < cost) return;
  state.cash -= cost;
  if (type === "hold") state.cargoCap += 8;
  if (type === "cannon") state.cannons += 1;
  if (type === "speed") state.speed += 1;
  addLog(`Upgraded ${type} for ${money(cost)}.`);
  render();
}

function borrowCash() {
  if (state.gameOver) return;
  state.cash += 400;
  state.debt += 520;
  addLog("Borrowed $400. The lender wrote down $520.");
  render();
}

function payDebt() {
  if (state.cash <= 0 || state.debt <= 0 || state.gameOver) return;
  const amount = Math.min(state.cash, state.debt, 300);
  state.cash -= amount;
  state.debt -= amount;
  addLog(`Paid ${money(amount)} against debt.`);
  render();
}

function endRun(reason) {
  state.gameOver = true;
  state.voyage = null;
  state.encounter = null;
  const finalScore = scoreNow();
  state.best = Math.max(state.best, finalScore);
  localStorage.setItem(bestKey, String(state.best));
  addLog(`${reason} Final net worth: ${money(finalScore)}.`);
  render();
}

function render() {
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const used = cargoUnits();
  const net = scoreNow();

  ui.netWorth.textContent = money(net);
  ui.cash.textContent = money(state.cash);
  ui.debt.textContent = money(state.debt);
  ui.day.textContent = `${Math.min(state.day, maxDay)} / ${maxDay}`;
  ui.best.textContent = money(state.best);
  ui.hull.style.width = `${state.hull}%`;
  ui.cargo.style.width = `${clamp((used / state.cargoCap) * 100, 0, 100)}%`;
  ui.hold.textContent = `${used} / ${state.cargoCap}`;
  ui.cannons.textContent = state.cannons;
  ui.speed.textContent = state.speed;
  ui.currentPort.textContent = current.name;
  ui.selectedPort.textContent = selected.name;
  ui.portFlavor.textContent = selected.flavor;
  ui.portTag.textContent = state.encounter ? "Encounter" : selected.id === current.id ? "Market desk" : "Route preview";

  const selectedCurrent = selected.id === current.id;
  const conditions = selectedCurrent ? null : routeConditionSummary(current.id, selected.id);
  const routeText = selectedCurrent
    ? "Choose a destination"
    : `${routeDays(current.id, selected.id)}d | ${Math.round(routeRisk(current.id, selected.id) * 100)}% risk | ${
        conditions.wind
      } ${conditions.speedDelta >= 0 ? "+" : ""}${conditions.speedDelta}%`;
  ui.selectedRoute.textContent = routeText;
  ui.selectedRoute.title = selectedCurrent
    ? routeText
    : `${current.name} to ${selected.name}: ${conditions.current}, ${conditions.sea}`;
  ui.sailButton.disabled = selectedCurrent || Boolean(state.voyage || state.encounter || state.gameOver);

  renderCargo();
  renderLog();
  renderDesk();
  drawMap();
}

function renderCargo() {
  const rows = goods
    .filter((good) => (state.cargo[good.id] || 0) > 0)
    .map((good) => {
      return `<div class="cargo-row"><strong>${good.name}</strong><span>${state.cargo[good.id]}</span></div>`;
    });
  ui.cargoList.innerHTML = rows.length ? rows.join("") : `<div class="cargo-row"><strong>Empty hold</strong><span>buy low</span></div>`;
}

function renderLog() {
  ui.captainLog.innerHTML = state.log
    .map((item) => `<div class="log-row"><strong>Day ${item.day}</strong><span>${item.text}</span></div>`)
    .join("");
}

function renderDesk() {
  ui.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.tab));

  if (state.gameOver) {
    ui.deskContent.innerHTML = `
      <div class="desk-stack">
        <div class="desk-block">
          <h3>Run Closed</h3>
          <p>Final net worth: ${money(scoreNow())}. Best: ${money(state.best)}.</p>
          <button type="button" data-action="new-run">Start New Run</button>
        </div>
      </div>
    `;
    return;
  }

  if (state.encounter) {
    renderEncounter();
    return;
  }

  if (state.voyage) {
    const to = portById(state.voyage.toId);
    ui.deskContent.innerHTML = `
      <div class="desk-stack">
        <div class="desk-block">
          <h3>Under Sail</h3>
          <p>Destination: ${to.name}. The route is resolving now.</p>
          <span class="tag">${Math.round(state.voyage.progress * 100)}% crossing</span>
        </div>
      </div>
    `;
    return;
  }

  if (state.tab === "market") renderMarket();
  if (state.tab === "harbor") renderHarbor();
  if (state.tab === "intel") renderIntel();
}

function renderMarket() {
  const atSelected = state.selectedPort === state.currentPort;
  const rows = goods
    .map((good) => {
      const price = priceFor(state.currentPort, good.id);
      const qty = state.cargo[good.id] || 0;
      const canBuy = atSelected && state.cash >= price && cargoUnits() + good.cargo <= state.cargoCap;
      const canSell = atSelected && qty > 0;
      return `
        <div class="market-row">
          <div class="good-name"><strong>${good.name}</strong><span>${good.note} | ${good.cargo} hold</span></div>
          <div class="price">${money(price)}</div>
          <div class="owned">${qty}</div>
          <button type="button" data-buy="${good.id}" ${canBuy ? "" : "disabled"}>Buy</button>
          <button type="button" data-sell="${good.id}" ${canSell ? "" : "disabled"}>Sell</button>
        </div>
      `;
    })
    .join("");

  ui.deskContent.innerHTML = `
    <div class="desk-stack">
      <div class="desk-block">
        <h3>${portById(state.currentPort).name} Market</h3>
        <p>Prices are local. Remote ports are previews, not storefronts.</p>
      </div>
      <div class="market-table">${rows}</div>
    </div>
  `;
}

function renderHarbor() {
  const holdCost = 760 + state.cargoCap * 18;
  const cannonCost = 720 + state.cannons * 420;
  const speedCost = 940 + state.speed * 520;
  const repairCost = Math.min(15, 100 - state.hull) * 9;

  ui.deskContent.innerHTML = `
    <div class="desk-stack">
      <div class="desk-block">
        <h3>Shipyard</h3>
        <p>Upgrade for route safety, bigger arbitrage, or pirate bounties.</p>
        <div class="upgrade-row"><span>Repair 15 hull | ${money(repairCost)}</span><button type="button" data-action="repair" ${repairCost > 0 && state.cash >= repairCost ? "" : "disabled"}>Repair</button></div>
        <div class="upgrade-row"><span>Hold +8 | ${money(holdCost)}</span><button type="button" data-upgrade="hold" ${state.cash >= holdCost ? "" : "disabled"}>Buy</button></div>
        <div class="upgrade-row"><span>Cannon +1 | ${money(cannonCost)}</span><button type="button" data-upgrade="cannon" ${state.cash >= cannonCost ? "" : "disabled"}>Buy</button></div>
        <div class="upgrade-row"><span>Speed +1 | ${money(speedCost)}</span><button type="button" data-upgrade="speed" ${state.cash >= speedCost ? "" : "disabled"}>Buy</button></div>
      </div>
      <div class="desk-block">
        <h3>Broker</h3>
        <p>Borrowing keeps you moving, but interest hits every ten days.</p>
        <button type="button" data-action="borrow">Borrow $400</button>
      </div>
    </div>
  `;
}

function renderIntel() {
  const rumorRows = state.events.length
    ? state.events
        .map((event) => {
          const port = portById(event.portId);
          const good = goodById(event.goodId);
          const direction = event.kind === "shortage" ? "high demand" : "cheap supply";
          return `<div class="rumor-row"><strong>${port.name}</strong><span>${good.name}: ${direction} through day ${event.expires}</span></div>`;
        })
        .join("")
    : `<div class="rumor-row"><strong>No rumors</strong><span>check back after sailing</span></div>`;

  const selected = portById(state.selectedPort);
  const current = portById(state.currentPort);
  const route = selected.id === current.id ? `<p>Select a destination on the map to preview travel risk.</p>` : (() => {
    const conditions = routeConditionSummary(current.id, selected.id);
    return `
      <p>${current.name} to ${selected.name}: ${routeDays(current.id, selected.id)} days, ${Math.round(
        routeRisk(current.id, selected.id) * 100
      )}% pirate risk.</p>
      <div class="route-metrics">
        <div class="route-metric"><strong>Wind</strong><span>${conditions.wind}</span></div>
        <div class="route-metric"><strong>Current</strong><span>${conditions.current}</span></div>
        <div class="route-metric"><strong>Sea</strong><span>${conditions.sea}</span></div>
        <div class="route-metric"><strong>Speed</strong><span>${conditions.speedDelta >= 0 ? "+" : ""}${
          conditions.speedDelta
        }%</span></div>
      </div>
    `;
  })();

  ui.deskContent.innerHTML = `
    <div class="desk-stack">
      <div class="desk-block">
        <h3>Route Board</h3>
        ${route}
      </div>
      <div class="desk-block">
        <h3>Rumors</h3>
        ${rumorRows}
      </div>
    </div>
  `;
}

function renderEncounter() {
  const enc = state.encounter;
  ui.deskContent.innerHTML = `
    <div class="desk-stack">
      <div class="desk-block encounter">
        <h3>${enc.name}</h3>
        <p>A pirate sloop blocks the approach to ${enc.portName}. Strength ${enc.strength}. Bounty ${money(enc.bounty)}.</p>
        <div class="encounter-actions">
          <button type="button" data-action="fight">Fight</button>
          <button type="button" data-action="bribe" ${state.cash > 0 ? "" : "disabled"}>Bribe</button>
          <button type="button" data-action="run">Run</button>
        </div>
        <p class="danger-text">Bribe: ${money(enc.bribe)}. Running favors speed. Fighting favors cannons and hull.</p>
      </div>
    </div>
  `;
}

function drawImageCover(image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawOceanBackground(w, h) {
  if (assets.ocean?.complete && assets.ocean.naturalWidth > 0) {
    drawImageCover(assets.ocean, 0, 0, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#dcecea");
    bg.addColorStop(0.52, "#b9d2d2");
    bg.addColorStop(1, "#e7daca");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  ctx.fillStyle = "rgba(22, 52, 58, 0.18)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function sampleWave(x, y, t = state.oceanTime) {
  let height = 0;
  let slopeX = 0;
  let slopeY = 0;

  for (const layer of waveLayers) {
    const k = tau / layer.length;
    const phase = (x * layer.dirX + y * layer.dirY) * k + t * layer.speed + layer.phase;
    const wave = Math.sin(phase);
    const slope = Math.cos(phase) * layer.amp * k;
    height += wave * layer.amp;
    slopeX += slope * layer.dirX;
    slopeY += slope * layer.dirY;
  }

  return { height, slopeX, slopeY };
}

function seededUnit(seed) {
  return Math.sin(seed * 128.67) * 43758.5453 - Math.floor(Math.sin(seed * 128.67) * 43758.5453);
}

function drawWaveLines(w, h, options) {
  const { spacing, offset, alpha, width, lift, color, stride } = options;
  const t = state.oceanTime;
  for (let yBase = -spacing + offset; yBase <= h + spacing; yBase += spacing) {
    ctx.beginPath();
    for (let x = -50; x <= w + 50; x += stride) {
      const sample = sampleWave(x, yBase, t);
      const y = yBase + sample.height * lift + Math.sin(x * 0.012 + t * 0.45 + offset) * 4;
      if (x === -50) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color(alpha + Math.sin(yBase * 0.03 + t * 0.75) * alpha * 0.25);
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function drawCurrentVectors(w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let y = 62; y < h - 24; y += 82) {
    for (let x = 58; x < w - 24; x += 92) {
      const current = sampleCurrentField(x / w, y / h, state.day * 0.19 + state.oceanTime * 0.045);
      if (current.strength < 0.08) continue;
      const angle = Math.atan2(current.y, current.x);
      const length = 8 + Math.min(current.strength, 1.1) * 12;
      const wobble = Math.sin(state.oceanTime * 1.35 + x * 0.021 + y * 0.017) * 4;

      ctx.save();
      ctx.translate(x + Math.cos(angle) * wobble, y + Math.sin(angle) * wobble);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(214, 244, 239, ${0.08 + Math.min(current.strength, 1) * 0.1})`;
      ctx.fillStyle = `rgba(214, 244, 239, ${0.08 + Math.min(current.strength, 1) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-length * 0.5, 0);
      ctx.lineTo(length * 0.5, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(length * 0.5 + 3, 0);
      ctx.lineTo(length * 0.5 - 3, -3);
      ctx.lineTo(length * 0.5 - 3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawAnimatedWater(w, h) {
  const t = state.oceanTime;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  drawWaveLines(w, h, {
    spacing: 30,
    offset: (t * 12) % 30,
    alpha: 0.052,
    width: 5,
    lift: 0.72,
    stride: 18,
    color: (alpha) => `rgba(13, 59, 75, ${alpha})`,
  });
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  drawWaveLines(w, h, {
    spacing: 23,
    offset: (t * -18) % 23,
    alpha: 0.075,
    width: 1.15,
    lift: 1.15,
    stride: 14,
    color: (alpha) => `rgba(233, 250, 247, ${alpha})`,
  });
  drawWaveLines(w, h, {
    spacing: 41,
    offset: (t * 9) % 41,
    alpha: 0.045,
    width: 2,
    lift: 0.55,
    stride: 18,
    color: (alpha) => `rgba(151, 224, 218, ${alpha})`,
  });

  for (let index = 0; index < 78; index += 1) {
    const seed = index + 3.17;
    const drift = 14 + (index % 6) * 2.8;
    const x = (seededUnit(seed) * w + t * drift) % (w + 90) - 45;
    const y = seededUnit(seed * 1.73) * h;
    const wave = sampleWave(x, y, t);
    const shimmer = clamp((wave.height + 10) / 22, 0, 1) * (0.45 + seededUnit(seed * 2.41) * 0.55);
    if (shimmer < 0.38) continue;
    ctx.globalAlpha = shimmer * 0.16;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 9 + shimmer * 12, y - 2 - shimmer * 2);
    ctx.stroke();
  }
  ctx.restore();

  drawCurrentVectors(w, h);
}

function drawShallows() {
  for (const port of ports) {
    const point = portPoint(port);
    const radius = Math.min(state.width, state.height) * 0.11;
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, "rgba(176, 233, 219, 0.28)");
    gradient.addColorStop(0.45, "rgba(122, 208, 194, 0.11)");
    gradient.addColorStop(1, "rgba(122, 208, 194, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMap() {
  resizeCanvas();
  const w = state.width;
  const h = state.height;
  ctx.clearRect(0, 0, w, h);

  drawOceanBackground(w, h);
  drawAnimatedWater(w, h);
  drawShallows();
  drawGrid(w, h);
  drawRoutes();
  for (const port of ports) drawPort(port);
  drawShip();
}

function drawGrid(w, h) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 64; x < w; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 5, h);
    ctx.stroke();
  }
  for (let y = 58; y < h; y += 58) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + Math.cos(y) * 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoutes() {
  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const from = state.voyage ? portById(state.voyage.fromId) : current;
  const to = state.voyage ? portById(state.voyage.toId) : selected;

  if (from.id === to.id) return;
  const a = portPoint(from);
  const b = portPoint(to);
  const conditions = routeConditionSummary(from.id, to.id);
  ctx.save();
  ctx.shadowColor = "rgba(8, 28, 32, 0.32)";
  ctx.shadowBlur = 8;
  ctx.setLineDash([9, 8]);
  ctx.lineWidth = state.voyage ? 3 : 2;
  ctx.strokeStyle = state.voyage
    ? "rgba(255, 224, 139, 0.9)"
    : conditions.speedDelta >= 0
      ? "rgba(229, 255, 237, 0.82)"
      : "rgba(255, 218, 200, 0.78)";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.setLineDash([]);
  ctx.strokeStyle = state.voyage
    ? "rgba(125, 85, 20, 0.5)"
    : conditions.sea === "heavy swell"
      ? "rgba(200, 80, 62, 0.34)"
      : "rgba(28, 83, 100, 0.32)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y + 2);
  ctx.lineTo(b.x, b.y + 2);
  ctx.stroke();
  ctx.restore();
}

function drawPort(port) {
  const point = portPoint(port);
  const current = port.id === state.currentPort;
  const selected = port.id === state.selectedPort;
  const image = assets.ports[port.id];
  const base = Math.min(state.width, state.height);
  const spriteWidth = clamp(base * (port.id === "stormhook" ? 0.22 : 0.18), 62, 128);
  const spriteHeight =
    image?.naturalWidth && image?.naturalHeight
      ? spriteWidth * (image.naturalHeight / image.naturalWidth)
      : spriteWidth * 0.72;

  ctx.save();
  if (selected || current) {
    ctx.strokeStyle = selected ? "rgba(214, 164, 58, 0.82)" : "rgba(79, 163, 108, 0.82)";
    ctx.lineWidth = current ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + spriteHeight * 0.21, spriteWidth * 0.58, spriteHeight * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (image?.complete && image.naturalWidth > 0) {
    ctx.shadowColor = "rgba(8, 24, 26, 0.28)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(
      image,
      point.x - spriteWidth / 2,
      point.y - spriteHeight * 0.7,
      spriteWidth,
      spriteHeight
    );
    ctx.shadowColor = "transparent";
  } else {
    drawFallbackPort(point, selected, current);
  }

  const labelY = point.y + spriteHeight * 0.36;
  drawPortLabel(port.name, point.x, labelY, selected || current);
  ctx.restore();
}

function drawFallbackPort(point, selected, current) {
  ctx.save();
  ctx.shadowColor = "rgba(17, 23, 22, 0.18)";
  ctx.shadowBlur = selected ? 18 : 8;
  ctx.fillStyle = current ? palette.green : selected ? palette.gold : palette.white;
  ctx.beginPath();
  ctx.arc(point.x, point.y, selected ? 12 : 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = current ? 4 : 2;
  ctx.strokeStyle = current ? palette.green : palette.blue;
  ctx.stroke();
  ctx.restore();
}

function drawPortLabel(name, x, y, emphasized) {
  ctx.save();
  ctx.font = "900 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(name).width + 14;
  ctx.fillStyle = emphasized ? "rgba(248, 251, 247, 0.92)" : "rgba(248, 251, 247, 0.72)";
  roundedRect(ctx, x - width / 2, y - 10, width, 20, 6);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.fillText(name, x, y + 1);
  ctx.restore();
}

function drawShipWake(x, y, angle, shipWidth) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";

  for (let side = -1; side <= 1; side += 2) {
    for (let line = 0; line < 3; line += 1) {
      const spread = shipWidth * (0.16 + line * 0.1);
      const reach = shipWidth * (0.7 + line * 0.28);
      const pulse = Math.sin(state.oceanTime * 4.4 + line * 1.7 + side) * 2.4;
      ctx.strokeStyle = `rgba(243, 255, 250, ${0.2 - line * 0.045})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-shipWidth * 0.24, side * (shipWidth * 0.13));
      ctx.bezierCurveTo(-reach * 0.45, side * spread + pulse, -reach * 0.8, side * spread * 0.8, -reach, side * spread * 0.54);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-shipWidth * 0.46, 0, shipWidth * 0.2, shipWidth * 0.06, 0, 0, tau);
  ctx.fill();
  ctx.restore();
}

function drawShip() {
  let x;
  let y;
  let angle = -Math.PI / 2;
  let underway = false;
  if (state.voyage) {
    const from = portPoint(portById(state.voyage.fromId));
    const to = portPoint(portById(state.voyage.toId));
    x = from.x + (to.x - from.x) * state.voyage.progress;
    y = from.y + (to.y - from.y) * state.voyage.progress;
    angle = Math.atan2(to.y - from.y, to.x - from.x);
    underway = true;
  } else {
    const point = portPoint(portById(state.currentPort));
    x = point.x;
    y = point.y - 28;
  }

  const base = Math.min(state.width, state.height);
  const shipWidth = clamp(base * 0.1, 36, 70);
  const wave = sampleWave(x, y);
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const sway = underway ? Math.sin(state.oceanTime * 2.15 + state.voyage.progress * tau * 2) * 3.4 : 0;
  x += normal.x * sway;
  y += normal.y * sway + wave.height * (underway ? 0.34 : 0.2);
  const roll = clamp((wave.slopeX * normal.x + wave.slopeY * normal.y) * 8, -0.16, 0.16);

  if (underway) drawShipWake(x, y, angle, shipWidth);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(underway ? angle + Math.PI / 2 + roll : roll * 0.45);
  ctx.fillStyle = "rgba(8, 24, 26, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, shipWidth * 0.18, shipWidth * 0.46, shipWidth * 0.16, 0, 0, tau);
  ctx.fill();

  const image = assets.ship;
  if (image?.complete && image.naturalWidth > 0) {
    const shipHeight = shipWidth * (image.naturalHeight / image.naturalWidth);
    ctx.shadowColor = "rgba(8, 24, 26, 0.34)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(image, -shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
  } else {
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function portPoint(port) {
  return {
    x: port.x * state.width,
    y: port.y * state.height,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = 1;
  state.width = Math.max(520, rect.width);
  state.height = Math.max(420, rect.height);
  const nextWidth = Math.round(state.width * state.dpr);
  const nextHeight = Math.round(state.height * state.dpr);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function step(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.12);
  state.lastTime = now;
  state.oceanTime += dt;
  if (state.voyage && !state.encounter && !state.gameOver) {
    state.voyage.progress = clamp(state.voyage.progress + dt / state.voyage.duration, 0, 1);
    if (state.voyage.progress >= 1) finishVoyage();
    else {
      renderDesk();
    }
  }
  if (now - state.lastDrawTime >= 33 || state.voyage) {
    state.lastDrawTime = now;
    drawMap();
  }
}

function update(now) {
  state.lastFrameWall = performance.now();
  step(now);
  requestAnimationFrame(update);
}

function selectNearestPort(event) {
  if (state.voyage || state.encounter) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const port of ports) {
    const point = portPoint(port);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < nearestDistance) {
      nearest = port;
      nearestDistance = distance;
    }
  }
  if (nearest && nearestDistance < 54) {
    state.selectedPort = nearest.id;
    if (state.selectedPort !== state.currentPort) state.tab = "intel";
    render();
  }
}

function bindEvents() {
  window.addEventListener("resize", render);
  canvas.addEventListener("click", selectNearestPort);
  ui.sailButton.addEventListener("click", startVoyage);
  ui.newRun.addEventListener("click", newRun);
  ui.settleDebt.addEventListener("click", payDebt);

  ui.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      render();
    });
  });

  ui.deskContent.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.buy) buyGood(button.dataset.buy);
    if (button.dataset.sell) sellGood(button.dataset.sell);
    if (button.dataset.upgrade) buyUpgrade(button.dataset.upgrade);
    if (button.dataset.action === "repair") repairShip();
    if (button.dataset.action === "borrow") borrowCash();
    if (button.dataset.action === "fight") fightPirates();
    if (button.dataset.action === "bribe") bribePirates();
    if (button.dataset.action === "run") runPirates();
    if (button.dataset.action === "new-run") newRun();
  });
}

loadAssets();
bindEvents();
newRun();
requestAnimationFrame(update);
window.setInterval(() => {
  const now = performance.now();
  if (now - state.lastFrameWall > 150) {
    state.lastFrameWall = now;
    step(now);
  }
}, 120);

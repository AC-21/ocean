const asset = (path: string) => new URL(path, import.meta.url).href;

export const assetUrls = {
  ocean: asset("../../assets/generated/backgrounds/ocean-map.jpg"),
  ship: asset("../../assets/generated/sprites/merchant-boat-clean.png"),
  ships: {
    coastal_sloop: asset("../../assets/generated/sprites/ship-coastal-sloop-clean.png"),
    ledger_brig: asset("../../assets/generated/sprites/ship-ledger-brig-clean.png"),
    clipper_kite: asset("../../assets/generated/sprites/ship-clipper-kite-clean.png"),
    harbor_cutter: asset("../../assets/generated/sprites/ship-harbor-cutter-clean.png"),
    iron_barge: asset("../../assets/generated/sprites/ship-iron-barge-clean.png"),
    league_carrier: asset("../../assets/generated/sprites/ship-league-carrier-clean.png"),
  },
  ports: {
    grayhaven: asset("../../assets/generated/sprites/port-grayhaven-clean.png"),
    saffron: asset("../../assets/generated/sprites/port-saffron-clean.png"),
    glassport: asset("../../assets/generated/sprites/port-glassport-clean.png"),
    stormhook: asset("../../assets/generated/sprites/port-stormhook-clean.png"),
    orchid: asset("../../assets/generated/sprites/port-orchid-clean.png"),
    lowmarket: asset("../../assets/generated/sprites/port-lowmarket-clean.png"),
  },
};

export type GameAssetManifestEntry = {
  id: string;
  url: string;
};

export const gameAssetManifest: GameAssetManifestEntry[] = [
  { id: "background.ocean", url: assetUrls.ocean },
  { id: "ship.fallback", url: assetUrls.ship },
  ...Object.entries(assetUrls.ships).map(([id, url]) => ({ id: `ship.${id}`, url })),
  ...Object.entries(assetUrls.ports).map(([id, url]) => ({ id: `port.${id}`, url })),
];

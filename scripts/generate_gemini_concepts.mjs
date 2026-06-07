import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envPath = "/Users/sasha/OS/finance-os/.env.local";
const outDir = path.resolve("assets/concepts");
const model = "gemini-3-pro-image";

function parseEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const prompts = [
  {
    slug: "01-isometric-ocean-map",
    prompt: `Create a 16:9 visual style frame for Harborline, a premium desktop merchant trading game.
Scene: a realistic teal-gray ocean surface with subtle wave texture and light wind ripples, viewed from a clean isometric game-map angle.
Subject: one elegant minimalist isometric merchant boat sailing between two small island ports. The boat has a dark ink hull, cream sail, brass cargo lantern, and a slightly unusual silhouette. The ports are low-poly/minimal but refined, with tiny warehouses, dock posts, and a market hall.
Style: sophisticated minimalist isometric game asset art blended with a realistic ocean, crisp silhouettes, restrained details, high-end indie game look.
Composition: boat lower center, islands upper left and upper right, a faint dotted route line, no text, no UI, no watermark.
Avoid: cute cartoon, fantasy pirates, skulls, noisy painterly chaos, plastic toy render, labels.`,
  },
  {
    slug: "02-boat-and-port-assets",
    prompt: `Create a 16:9 asset concept sheet for Harborline.
Scene: neutral warm off-white background with a small realistic ocean swatch strip along the bottom.
Subject: three unique minimalist isometric merchant boats and four island/port destination assets. Boats should feel collectible and readable at game-map scale: dark hulls, cream sails, cargo crates, brass details. Ports should include a foggy finance port, spice quay, glass warehouse port, and stormy cannon port.
Style: refined isometric game assets, minimal geometry, crisp shadows, muted maritime colors, premium board-game-map aesthetic.
Composition: organized rows, generous spacing, no text labels, no UI, no watermark.
Avoid: childish icons, fantasy exaggeration, plastic toy sheen, busy backgrounds.`,
  },
  {
    slug: "03-realistic-ocean-with-minimal-islands",
    prompt: `Create a 16:9 mood frame for Harborline's main map.
Scene: realistic ocean between small stylized isometric islands, with natural wave patterns, soft cloudy daylight, and slight coastal shallows around each island.
Subject: six tiny destination islands arranged as a strategic trading route network, plus one small minimalist merchant ship on the water. Islands have distinct silhouettes: fog harbor, spice market quay, glass warehouse, storm fort, orchid trade island, lowmarket dock.
Style: realistic ocean foundation with minimalist isometric islands and ship assets; elegant, calm, strategic, not cartoonish.
Composition: no interface, no text, no labels; leave breathing room in the center for a game route overlay.
Avoid: fantasy map parchment, pirate skulls, excessive saturation, photorealistic full-scale cities, watermarks.`,
  },
];

await mkdir(outDir, { recursive: true });
const env = parseEnv(await readFile(envPath, "utf8"));
const apiKey = env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GEMINI_API_KEY was not found in the configured env file.");
}

for (const item of prompts) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: item.prompt }] }],
      }),
    }
  );

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(json)}`);
  }

  const part = json.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData);
  if (!part?.inlineData?.data) {
    throw new Error(`No image returned for ${item.slug}: ${JSON.stringify(json)}`);
  }

  const ext = part.inlineData.mimeType?.includes("jpeg") ? "jpg" : "png";
  const filePath = path.join(outDir, `${item.slug}.${ext}`);
  await writeFile(filePath, Buffer.from(part.inlineData.data, "base64"));
  console.log(filePath);
}

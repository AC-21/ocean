import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envPath = "/Users/sasha/OS/finance-os/.env.local";
const rawDir = path.resolve("assets/generated/raw");
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

const chroma = "#ff00ff";

const spriteRules = `Create a single isolated game sprite on a perfectly flat solid ${chroma} chroma-key background.
The background must be one uniform color with no shadows, gradients, texture, floor plane, reflections, horizon, or lighting variation.
Keep the subject fully separated from the background with crisp edges and generous padding.
Do not use ${chroma} anywhere in the subject. No cast shadow, no contact shadow, no watermark, no text, no labels.
Camera: isometric three-quarter top-down, consistent with a premium tabletop strategy game.
Style: unique minimalist isometric asset, refined geometry, muted maritime palette, crisp silhouette, readable at small game-map scale, not cartoonish, not plastic.`;

const jobs = [
  {
    slug: "ocean-map",
    prompt: `Create a 16:9 empty ocean background for Harborline, a premium desktop merchant trading game.
Scene: realistic teal-gray ocean seen from a clean isometric game-map camera angle, soft daylight, subtle wave texture, natural ripples, tiny foam traces, gentle shallow-water hints around invisible future islands.
Style: realistic ocean foundation with refined minimalist game-map composition, calm but alive, elegant, strategic, high-end indie game look.
Composition: leave clear open water across the center for route lines and sprites; no ships, no islands, no labels, no UI, no text, no watermark.
Avoid: fantasy parchment map, satellite photo, stormy drama, heavy blur, painterly chaos, oversaturated turquoise.`,
  },
  {
    slug: "merchant-boat",
    prompt: `${spriteRules}
Subject: a unique compact merchant sailing boat with a dark ink hull, warm cream triangular sail, brass cargo lantern near the stern, two visible cargo crates, and a slightly unusual elegant silhouette. Make it feel like the hero piece from concept A/B: minimal but personality-rich.`,
  },
  {
    slug: "port-grayhaven",
    prompt: `${spriteRules}
Subject: Grayhaven, a foggy finance harbor island. Include a small stone counting house, one modest warehouse, pale docks, a lighthouse, and low mist hugging the island edge. Readable as a serious banking/trading port.`,
  },
  {
    slug: "port-saffron",
    prompt: `${spriteRules}
Subject: Saffron Quay, a warm spice market island. Include small awnings, stacked spice baskets, terracotta roofs, palm details, and a tiny dock. Warm but restrained, not cute.`,
  },
  {
    slug: "port-glassport",
    prompt: `${spriteRules}
Subject: Glassport, an island port with minimal glass warehouses and crystalline crates. Include angular glass roofs, cool blue highlights, a tiny crane, and clean dock geometry.`,
  },
  {
    slug: "port-stormhook",
    prompt: `${spriteRules}
Subject: Stormhook, a storm fort island. Include a dark stone fort, small cannon battery, rugged rocks, tiny flag, and dramatic but compact storm-cloud motif contained in the asset silhouette.`,
  },
  {
    slug: "port-orchid",
    prompt: `${spriteRules}
Subject: Orchid Roads, an elegant island port with a small orchid grove, refined market pavilion, pale dock, and subtle purple flowers. Sophisticated, minimal, not decorative clutter.`,
  },
  {
    slug: "port-lowmarket",
    prompt: `${spriteRules}
Subject: Lowmarket, a practical dockyard trade island. Include cargo scales, low warehouses, stacked crates, work lamps, and a sturdy modest pier. Utilitarian and readable.`,
  },
];

await mkdir(rawDir, { recursive: true });
const env = parseEnv(await readFile(envPath, "utf8"));
const apiKey = env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GEMINI_API_KEY was not found in the configured env file.");
}

for (const job of jobs) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: job.prompt }] }],
      }),
    }
  );

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(json)}`);
  }

  const part = json.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData);
  if (!part?.inlineData?.data) {
    throw new Error(`No image returned for ${job.slug}: ${JSON.stringify(json)}`);
  }

  const ext = part.inlineData.mimeType?.includes("jpeg") ? "jpg" : "png";
  const filePath = path.join(rawDir, `${job.slug}.${ext}`);
  await writeFile(filePath, Buffer.from(part.inlineData.data, "base64"));
  console.log(filePath);
}

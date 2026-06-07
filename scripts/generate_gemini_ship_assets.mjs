import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const run = promisify(execFile);
const envPath = "/Users/sasha/OS/finance-os/.env.local";
const rawDir = path.resolve("assets/generated/raw");
const spriteDir = path.resolve("assets/generated/sprites");
const previewDir = path.resolve("assets/generated/previews");
const magick = "/opt/homebrew/bin/magick";
const model = "gemini-3-pro-image";
const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const requestedShip = argValue("--only") ?? argValue("--ship");

function argValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a ship id or generated slug.`);
  }
  return value;
}

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

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const chroma = "#ff00ff";

const spriteRules = `Create a single isolated game sprite on a perfectly flat solid ${chroma} chroma-key background.
The background must be one uniform color with no shadows, gradients, texture, floor plane, reflections, horizon, or lighting variation.
Keep the subject fully separated from the background with crisp edges and generous padding.
Do not use ${chroma} anywhere in the subject. No cast shadow, no contact shadow, no watermark, no text, no labels.
Camera: isometric three-quarter top-down, consistent with a premium tabletop strategy game.
Style: unique minimalist isometric asset, refined geometry, muted maritime palette, crisp silhouette, readable at small game-map scale, not cartoonish, not plastic.
Match Harborline's current style: personality-rich but restrained, realistic material hints, clean game sprite silhouette.`;

const jobs = [
  {
    slug: "ship-coastal-sloop",
    prompt: `${spriteRules}
Subject: Coastal Sloop, a compact starter merchant sailboat. Dark ink hull, warm cream triangular sail, two small crates, one brass stern lantern, nimble narrow silhouette. It should feel like the existing hero boat but cleaner and more production-ready.`,
  },
  {
    slug: "ship-ledger-brig",
    prompt: `${spriteRules}
Subject: Ledger Brig, a balanced merchant brig. Slightly larger hull than the sloop, two cream sails, low cargo deck with strapped crates, small banker-blue pennant, sturdy but not bulky. It should read as a reliable mid-game trader.`,
  },
  {
    slug: "ship-clipper-kite",
    prompt: `${spriteRules}
Subject: Clipper Kite, a fast elegant trading clipper. Long narrow dark hull, tall angled cream sails like a kite, minimal brass trim, little cargo visible, sharp forward motion silhouette. It should read as speed and tailwind mastery.`,
  },
  {
    slug: "ship-harbor-cutter",
    id: "harbor_cutter",
    prompt: `${spriteRules}
Subject: Harbor Cutter, a compact customs and patrol cutter. Small dark hull, two cream fore-and-aft sails, lean boarding deck, two tiny brass chase guns, admiralty red signal pennant, rolled inspection papers near the stern, very little cargo. It should read as patrol authority, customs pressure, pirate deterrence, fast response, and compact cargo space, not as a pirate vessel.`,
  },
  {
    slug: "ship-iron-barge",
    id: "iron_barge",
    prompt: `${spriteRules}
Subject: Iron Barge, a broad heavy fortified trading ship. Wide dark iron-ribbed hull, squat cream sails, visible cargo crates, two tiny cannon ports, reinforced bow, sturdy rectangular silhouette. It should read as slow cargo capacity and durability.`,
  },
  {
    slug: "ship-league-carrier",
    id: "league_carrier",
    prompt: `${spriteRules}
Subject: League Carrier, a heavy cargo league freighter. Wide triple-hatch cargo carrier, high-sided dark hull, broad open deck packed with tied cargo bales, low cream lug sails, ballast keel, one tiny stern cannon, dockworker ochre and league green accents. It should read as huge holds, slow turns, steady profit from staying loaded, not as a warship or pirate vessel.`,
  },
];

for (const job of jobs) {
  job.id ??= job.slug.replace(/^ship-/, "").replaceAll("-", "_");
}

const selectedJobs = requestedShip
  ? jobs.filter((job) => [job.id, job.slug, job.slug.replace(/^ship-/, "")].includes(requestedShip))
  : jobs;

if (!selectedJobs.length) {
  throw new Error(
    `Unknown ship selector "${requestedShip}". Available: ${jobs.map((job) => `${job.id}/${job.slug}`).join(", ")}`
  );
}

if (dryRun) {
  for (const job of selectedJobs) {
    console.log(`${job.id} (${job.slug})`);
    console.log(job.prompt);
    console.log("");
  }
  process.exit(0);
}

await mkdir(rawDir, { recursive: true });
await mkdir(spriteDir, { recursive: true });
await mkdir(previewDir, { recursive: true });

const env = parseEnv(await readFile(envPath, "utf8"));
const apiKey = env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GEMINI_API_KEY was not found in the configured env file.");
}

for (const job of selectedJobs) {
  const rawPath = path.join(rawDir, `${job.slug}.jpg`);
  const spritePath = path.join(spriteDir, `${job.slug}.png`);
  const cleanPath = path.join(spriteDir, `${job.slug}-clean.png`);
  const previewPath = path.join(previewDir, `${job.slug}-preview.png`);

  if (force || !(await exists(rawPath))) {
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

    await writeFile(rawPath, Buffer.from(part.inlineData.data, "base64"));
  }

  await run(magick, [
    rawPath,
    "-alpha",
    "set",
    "-fuzz",
    "20%",
    "-transparent",
    chroma,
    "-trim",
    "+repage",
    spritePath,
  ]);

  await run(magick, [
    spritePath,
    "(",
    spritePath,
    "-alpha",
    "extract",
    "-morphology",
    "Erode",
    "Diamond:1",
    ")",
    "-compose",
    "CopyOpacity",
    "-composite",
    cleanPath,
  ]);

  await run(magick, [
    cleanPath,
    "-background",
    "#d7ebe7",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-resize",
    "360x240",
    previewPath,
  ]);

  console.log(cleanPath);
}

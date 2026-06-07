export type CanvasPixelProbeStatus = "blank" | "nonblank";
export type CanvasPixelProbeVariety = "flat" | "varied";

export type CanvasPixelProbeSummary = {
  averageAlpha: number;
  averageLuma: number;
  colorBuckets: number;
  lumaSpread: number;
  opaqueSamples: number;
  samples: number;
  status: CanvasPixelProbeStatus;
  variety: CanvasPixelProbeVariety;
};

export function summarizeCanvasPixels(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  maxSamples = 144
): CanvasPixelProbeSummary {
  const pixelCount = Math.floor(pixels.length / 4);
  const dimensions = normalizedPixelDimensions(pixelCount, width, height);
  const samplesPerAxis = Math.max(2, Math.floor(Math.sqrt(maxSamples)));
  const xStep = Math.max(1, Math.floor(dimensions.width / samplesPerAxis));
  const yStep = Math.max(1, Math.floor(dimensions.height / samplesPerAxis));
  const colorBuckets = new Set<string>();
  let alphaTotal = 0;
  let lumaTotal = 0;
  let maxAlpha = 0;
  let maxLuma = 0;
  let minLuma = 255;
  let opaqueSamples = 0;
  let samples = 0;

  for (let y = Math.floor(yStep / 2); y < dimensions.height; y += yStep) {
    for (let x = Math.floor(xStep / 2); x < dimensions.width; x += xStep) {
      const pixelIndex = y * dimensions.width + x;
      if (pixelIndex >= pixelCount) continue;

      const offset = pixelIndex * 4;
      const red = pixels[offset] ?? 0;
      const green = pixels[offset + 1] ?? 0;
      const blue = pixels[offset + 2] ?? 0;
      const alpha = pixels[offset + 3] ?? 0;
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      samples += 1;
      alphaTotal += alpha;
      lumaTotal += luma;
      maxAlpha = Math.max(maxAlpha, alpha);
      maxLuma = Math.max(maxLuma, luma);
      minLuma = Math.min(minLuma, luma);

      if (alpha > 8 || luma > 6) opaqueSamples += 1;
      if (alpha > 8 || luma > 6) {
        colorBuckets.add(`${Math.floor(red / 24)}:${Math.floor(green / 24)}:${Math.floor(blue / 24)}:${Math.floor(alpha / 48)}`);
      }
    }
  }

  const averageAlpha = samples ? alphaTotal / samples : 0;
  const averageLuma = samples ? lumaTotal / samples : 0;
  const lumaSpread = samples ? maxLuma - minLuma : 0;
  const status = samples > 0 && (opaqueSamples >= Math.max(1, samples * 0.05) || maxAlpha > 16 || maxLuma > 12) ? "nonblank" : "blank";
  const variety = status === "nonblank" && (colorBuckets.size >= 3 || lumaSpread >= 18) ? "varied" : "flat";

  return {
    averageAlpha: roundProbeMetric(averageAlpha),
    averageLuma: roundProbeMetric(averageLuma),
    colorBuckets: colorBuckets.size,
    lumaSpread: roundProbeMetric(lumaSpread),
    opaqueSamples,
    samples,
    status,
    variety,
  };
}

function normalizedPixelDimensions(pixelCount: number, width: number, height: number) {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  if (pixelCount <= 0 || safeWidth * safeHeight === pixelCount) {
    return { width: safeWidth, height: safeHeight };
  }

  const aspect = safeWidth / safeHeight;
  const inferredHeight = Math.max(1, Math.round(Math.sqrt(pixelCount / aspect)));
  const inferredWidth = Math.max(1, Math.floor(pixelCount / inferredHeight));
  return { width: inferredWidth, height: Math.max(1, Math.floor(pixelCount / inferredWidth)) };
}

function roundProbeMetric(value: number) {
  return Math.round(value * 10) / 10;
}

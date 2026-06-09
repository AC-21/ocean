import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";

export type FluidVisualPixelProbe = {
  averageLuma: number;
  colorBuckets: number;
  height: number;
  opaqueSamples: number;
  samples: number;
  status: "blank" | "nonblank";
  variety: "flat" | "varied";
  width: number;
};

export function summarizePngPixels(buffer: Buffer): FluidVisualPixelProbe {
  const image = decodePngRgba(buffer);
  const stepX = Math.max(1, Math.floor(image.width / 80));
  const stepY = Math.max(1, Math.floor(image.height / 52));
  let samples = 0;
  let opaqueSamples = 0;
  let lumaTotal = 0;
  const buckets = new Set<string>();
  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const a = image.data[index + 3];
      samples += 1;
      if (a > 8) opaqueSamples += 1;
      lumaTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      buckets.add(`${Math.floor(r / 24)}-${Math.floor(g / 24)}-${Math.floor(b / 24)}-${Math.floor(a / 64)}`);
    }
  }
  const averageLuma = lumaTotal / Math.max(1, samples);
  return {
    averageLuma,
    colorBuckets: buckets.size,
    height: image.height,
    opaqueSamples,
    samples,
    status: opaqueSamples > samples * 0.92 && averageLuma > 10 ? "nonblank" : "blank",
    variety: buckets.size >= 18 ? "varied" : "flat",
    width: image.width,
  };
}

function decodePngRgba(buffer: Buffer): { data: Buffer; height: number; width: number } {
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", "expected PNG signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      assert.equal(data[8], 8, "only 8-bit PNG screenshots are supported");
      assert.ok(colorType === 2 || colorType === 6, "only RGB/RGBA PNG screenshots are supported");
    } else if (type === "IDAT") {
      chunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const inflated = inflateSync(Buffer.concat(chunks));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const outputBytesPerPixel = 4;
  const stride = width * sourceBytesPerPixel;
  const unfiltered = Buffer.alloc(width * height * sourceBytesPerPixel);
  const output = Buffer.alloc(width * height * outputBytesPerPixel);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const previousStart = (y - 1) * stride;
    const outputStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = row[x];
      const left = x >= sourceBytesPerPixel ? unfiltered[outputStart + x - sourceBytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[previousStart + x] : 0;
      const upLeft = y > 0 && x >= sourceBytesPerPixel ? unfiltered[previousStart + x - sourceBytesPerPixel] : 0;
      unfiltered[outputStart + x] = unfilter(filter, raw, left, up, upLeft);
    }
    for (let x = 0; x < width; x += 1) {
      const source = outputStart + x * sourceBytesPerPixel;
      const target = (y * width + x) * outputBytesPerPixel;
      output[target] = unfiltered[source];
      output[target + 1] = unfiltered[source + 1];
      output[target + 2] = unfiltered[source + 2];
      output[target + 3] = colorType === 6 ? unfiltered[source + 3] : 255;
    }
  }
  return { data: output, height, width };
}

function unfilter(filter: number, raw: number, left: number, up: number, upLeft: number): number {
  if (filter === 0) return raw;
  if (filter === 1) return (raw + left) & 255;
  if (filter === 2) return (raw + up) & 255;
  if (filter === 3) return (raw + Math.floor((left + up) / 2)) & 255;
  if (filter === 4) return (raw + paeth(left, up, upLeft)) & 255;
  throw new Error(`Unsupported PNG filter ${filter}`);
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

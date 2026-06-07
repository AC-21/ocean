import { describe, expect, it } from "vitest";
import { summarizeCanvasPixels } from "./renderProbe";

describe("canvas pixel probe", () => {
  it("classifies transparent pixels as blank", () => {
    const pixels = new Uint8Array(24 * 24 * 4);

    expect(summarizeCanvasPixels(pixels, 24, 24)).toMatchObject({
      colorBuckets: 0,
      status: "blank",
      variety: "flat",
    });
  });

  it("classifies a solid rendered fill as nonblank but flat", () => {
    const pixels = new Uint8Array(24 * 24 * 4);
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 8;
      pixels[index + 1] = 46;
      pixels[index + 2] = 62;
      pixels[index + 3] = 255;
    }

    expect(summarizeCanvasPixels(pixels, 24, 24)).toMatchObject({
      status: "nonblank",
      variety: "flat",
    });
  });

  it("classifies water-like color movement as nonblank and varied", () => {
    const width = 36;
    const height = 36;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 5 + ((x * 3 + y) % 32);
        pixels[offset + 1] = 42 + ((x + y * 5) % 92);
        pixels[offset + 2] = 58 + ((x * 7 + y * 2) % 78);
        pixels[offset + 3] = 255;
      }
    }

    const summary = summarizeCanvasPixels(pixels, width, height);

    expect(summary.status).toBe("nonblank");
    expect(summary.variety).toBe("varied");
    expect(summary.colorBuckets).toBeGreaterThan(2);
  });
});

// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_ART_DIMENSION, readCardArt, sniffImageMimeType } from "./cardArtOptimizer";

// Smallest valid GIF (1x1) - enough to check it is passed through untouched.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "card-art-"));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("readCardArt", () => {
  it("shrinks a legacy image and replaces the original on disk", async () => {
    const original = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 40 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const file = path.join(dir, "legacy.jpg");
    await writeFile(file, original);

    const served = await readCardArt(file);
    const meta = await sharp(served).metadata();

    expect(sniffImageMimeType(served)).toBe("image/webp");
    expect(meta.width).toBe(MAX_ART_DIMENSION);
    expect(served.length).toBeLessThan(original.length);
    expect((await readFile(file)).equals(served)).toBe(true);
    expect((await readCardArt(file)).equals(served)).toBe(true);
  });

  it("leaves GIFs untouched", async () => {
    const file = path.join(dir, "anim.gif");
    await writeFile(file, GIF);

    expect((await readCardArt(file)).equals(GIF)).toBe(true);
    expect((await readFile(file)).equals(GIF)).toBe(true);
  });
});

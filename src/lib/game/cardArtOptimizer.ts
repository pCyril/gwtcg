import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

// Card art is shown at most ~600 CSS px wide; 1280 keeps it sharp on 2x screens.
export const MAX_ART_DIMENSION = 1280;
const WEBP_QUALITY = 80;

/**
 * Identifies the actual image format from its magic bytes - the browser-
 * supplied `file.type` is just a client-asserted multipart header and is
 * trivially spoofable (e.g. an HTML/JS payload declared as "image/jpeg"),
 * so it must never be trusted for validation or for picking the stored
 * file's extension/content-type.
 */
export function sniffImageMimeType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) {
    return "image/gif";
  }
  return null;
}

/**
 * Downscales a still image to MAX_ART_DIMENSION and re-encodes it as WebP.
 * Returns the original bytes when that would not make the file smaller.
 * Never call this on a GIF: it would flatten the animation to one frame.
 */
export async function optimizeCardArt(bytes: Buffer): Promise<Buffer> {
  const optimized = await sharp(bytes)
    .rotate() // bake in the EXIF orientation before the metadata is dropped
    .resize({ width: MAX_ART_DIMENSION, height: MAX_ART_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return optimized.length < bytes.length ? optimized : bytes;
}

async function isAlreadyOptimized(bytes: Buffer): Promise<boolean> {
  if (sniffImageMimeType(bytes) !== "image/webp") return false;
  const { width = 0, height = 0 } = await sharp(bytes).metadata();
  return width <= MAX_ART_DIMENSION && height <= MAX_ART_DIMENSION;
}

// Files already checked by this process, and optimizations currently running
// (so concurrent requests for the same legacy file share one encode).
const settled = new Set<string>();
const inFlight = new Map<string, Promise<Buffer>>();

async function optimizeInPlace(filePath: string, original: Buffer): Promise<Buffer> {
  try {
    if (await isAlreadyOptimized(original)) return original;
    const optimized = await optimizeCardArt(original);
    if (optimized === original) return original;
    // Replace the original atomically, under its existing name: the URL stored
    // in the DB keeps working, the file just holds WebP data from now on (the
    // serving route derives Content-Type from the bytes, not the extension).
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmpPath, optimized);
      await rename(tmpPath, filePath);
    } catch (err) {
      await unlink(tmpPath).catch(() => {});
      throw err;
    }
    return optimized;
  } catch (err) {
    // Unreadable image or read-only disk: keep serving what we have.
    console.error(`[card-art] could not optimize ${filePath}`, err);
    return original;
  }
}

/**
 * Reads an uploaded card illustration, shrinking it on disk first if it
 * predates upload-time optimization. GIFs are returned untouched.
 */
export async function readCardArt(filePath: string): Promise<Buffer> {
  const bytes = await readFile(filePath);
  if (settled.has(filePath) || sniffImageMimeType(bytes) === "image/gif") return bytes;

  let pending = inFlight.get(filePath);
  if (!pending) {
    pending = optimizeInPlace(filePath, bytes).finally(() => {
      settled.add(filePath);
      inFlight.delete(filePath);
    });
    inFlight.set(filePath, pending);
  }
  return pending;
}

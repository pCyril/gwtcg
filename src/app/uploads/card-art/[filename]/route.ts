import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Next's production server snapshots the public/ directory listing once at
// boot (see next/dist/server/lib/router-utils/filesystem.js), so files
// createArtSubmission writes at runtime under public/uploads/card-art never
// show up via plain static serving until the process restarts. This route
// reads them from disk per-request instead, at the same URL shape the DB
// already stores (/uploads/card-art/<filename>).
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "card-art");
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const FILENAME_PATTERN = /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/;

export async function GET(_request: Request, ctx: RouteContext<"/uploads/card-art/[filename]">) {
  const { filename } = await ctx.params;
  if (!FILENAME_PATTERN.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readFile(path.join(UPLOAD_DIR, filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        // Uploaded content is only sniffed for its actual image format at
        // submission time (see sniffImageMimeType in artSubmission.ts) - this
        // stops a browser from second-guessing that and rendering a file as
        // something other than the declared image type.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

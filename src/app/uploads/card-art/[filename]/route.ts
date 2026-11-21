import { NextResponse } from "next/server";
import path from "node:path";
import { readCardArt, sniffImageMimeType } from "@/lib/game/cardArtOptimizer";

// Next's production server snapshots the public/ directory listing once at
// boot (see next/dist/server/lib/router-utils/filesystem.js), so files
// createArtSubmission writes at runtime under public/uploads/card-art never
// show up via plain static serving until the process restarts. This route
// reads them from disk per-request instead, at the same URL shape the DB
// already stores (/uploads/card-art/<filename>).
//
// Illustrations uploaded before upload-time optimization are shrunk on their
// first request (readCardArt) and the original is replaced on disk, under the
// same name - so a legacy .jpg/.png may hold WebP data, which is why the
// Content-Type comes from the bytes rather than the extension.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "card-art");
const FILENAME_PATTERN = /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/;

export async function GET(_request: Request, ctx: RouteContext<"/uploads/card-art/[filename]">) {
  const { filename } = await ctx.params;
  if (!FILENAME_PATTERN.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readCardArt(path.join(UPLOAD_DIR, filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": sniffImageMimeType(data) ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        // Stops a browser from second-guessing the sniffed type and rendering
        // a file as something other than the declared image type.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PENDING_PER_USER = 10;
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "card-art");

export async function createArtSubmission(
  submitterId: string,
  wikiPageId: string,
  file: File,
  certifiedOriginal: boolean,
  autoApprove = false,
) {
  if (!certifiedOriginal) throw new Error("CONSENT_REQUIRED");

  const extension = ALLOWED_MIME_TYPES[file.type];
  if (!extension) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("FILE_TOO_LARGE");

  const wikiPage = await prisma.wikiPage.findUnique({ where: { id: wikiPageId } });
  if (!wikiPage) throw new Error("WIKI_PAGE_NOT_FOUND");

  if (!autoApprove) {
    const pendingCount = await prisma.artSubmission.count({
      where: { submitterId, status: "PENDING" },
    });
    if (pendingCount >= MAX_PENDING_PER_USER) throw new Error("TOO_MANY_PENDING");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  const imageUrl = `/uploads/card-art/${filename}`;

  // Admins skip the moderation queue entirely - their submission goes
  // straight into WikiPage.imageUrls in the same transaction, same as
  // approveArtSubmission does for everyone else's after review.
  if (autoApprove) {
    return prisma.$transaction(async (tx) => {
      await tx.wikiPage.update({ where: { id: wikiPageId }, data: { imageUrls: { push: imageUrl } } });
      return tx.artSubmission.create({
        data: { wikiPageId, submitterId, imageUrl, status: "APPROVED", reviewedAt: new Date() },
      });
    });
  }

  return prisma.artSubmission.create({ data: { wikiPageId, submitterId, imageUrl } });
}

/**
 * Maps each wikiPageId to { imageUrl -> submitter pseudo }, for approved
 * submissions only - so cards can credit the community artist next to their
 * illustration without a schema change (WikiPage.imageUrls stays a plain
 * string array; the submitter link is recovered by matching the URL back to
 * the ArtSubmission row, which is never deleted on approval).
 */
export async function getImageCreditsByWikiPage(wikiPageIds: string[]): Promise<Map<string, Record<string, string>>> {
  const uniqueIds = [...new Set(wikiPageIds)];
  if (uniqueIds.length === 0) return new Map();

  const approved = await prisma.artSubmission.findMany({
    where: { wikiPageId: { in: uniqueIds }, status: "APPROVED" },
    select: { wikiPageId: true, imageUrl: true, submitter: { select: { pseudo: true } } },
  });

  const byPage = new Map<string, Record<string, string>>();
  for (const s of approved) {
    const forPage = byPage.get(s.wikiPageId) ?? {};
    forPage[s.imageUrl] = s.submitter.pseudo;
    byPage.set(s.wikiPageId, forPage);
  }
  return byPage;
}

export async function listPendingArtSubmissions() {
  return prisma.artSubmission.findMany({
    where: { status: "PENDING" },
    include: { wikiPage: true, submitter: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function approveArtSubmission(submissionId: string) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.artSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    if (submission.status !== "PENDING") throw new Error("SUBMISSION_NOT_PENDING");

    await tx.wikiPage.update({
      where: { id: submission.wikiPageId },
      data: { imageUrls: { push: submission.imageUrl } },
    });

    await tx.artSubmission.update({
      where: { id: submissionId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
  });
}

export async function rejectArtSubmission(submissionId: string, reviewNote?: string) {
  const submission = await prisma.artSubmission.findUniqueOrThrow({ where: { id: submissionId } });
  if (submission.status !== "PENDING") throw new Error("SUBMISSION_NOT_PENDING");

  await prisma.artSubmission.update({
    where: { id: submissionId },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewNote },
  });

  // Best-effort cleanup - a stray file on disk is harmless, so don't fail the request over it.
  await unlink(path.join(process.cwd(), "public", submission.imageUrl.replace(/^\//, ""))).catch(() => {});
}

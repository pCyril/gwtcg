import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CardFamily } from "@prisma/client";

// Matches the fixed family order shown in the collection filters.
const FAMILY_ORDER: CardFamily[] = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PENDING_PER_USER = 25;
// Rolling 24h cap on uploads per user (any status), to stop one account flooding the disk.
export const MAX_UPLOADS_PER_DAY = 300;
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "card-art");

/**
 * Identifies the actual image format from its magic bytes - the browser-
 * supplied `file.type` is just a client-asserted multipart header and is
 * trivially spoofable (e.g. an HTML/JS payload declared as "image/jpeg"),
 * so it must never be trusted for validation or for picking the stored
 * file's extension/content-type.
 */
function sniffImageMimeType(bytes: Buffer): string | null {
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
  return null;
}

export async function createArtSubmission(
  submitterId: string,
  wikiPageId: string,
  file: File,
  certifiedOriginal: boolean,
  autoApprove = false,
) {
  if (!certifiedOriginal) throw new Error("CONSENT_REQUIRED");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("FILE_TOO_LARGE");

  if (!autoApprove) {
    const uploadsLast24h = await prisma.artSubmission.count({
      where: { submitterId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (uploadsLast24h >= MAX_UPLOADS_PER_DAY) throw new Error("DAILY_UPLOAD_LIMIT");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffedType = sniffImageMimeType(bytes);
  const extension = sniffedType ? ALLOWED_MIME_TYPES[sniffedType] : undefined;
  if (!extension) throw new Error("UNSUPPORTED_FILE_TYPE");

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

export interface ArtLeaderboardEntry {
  pseudo: string;
  count: number;
}

const LEADERBOARD_SIZE = 10;

/**
 * Top submitters by approved illustration count - only counts submissions
 * that actually made it onto a card (not pending/rejected), so it rewards
 * quality over raw volume. "last24h" ranks by createdAt (when they actually
 * submitted), not reviewedAt, so a fresh submission counts toward today's
 * board even before an admin gets to review it and it becomes reflected here.
 */
export async function getArtLeaderboard(): Promise<{ allTime: ArtLeaderboardEntry[]; last24h: ArtLeaderboardEntry[] }> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [allTimeGroups, last24hGroups] = await Promise.all([
    prisma.artSubmission.groupBy({
      by: ["submitterId"],
      where: { status: "APPROVED" },
      _count: { _all: true },
      orderBy: { _count: { submitterId: "desc" } },
      take: LEADERBOARD_SIZE,
    }),
    prisma.artSubmission.groupBy({
      by: ["submitterId"],
      where: { status: "APPROVED", createdAt: { gte: since24h } },
      _count: { _all: true },
      orderBy: { _count: { submitterId: "desc" } },
      take: LEADERBOARD_SIZE,
    }),
  ]);

  const submitterIds = [...new Set([...allTimeGroups, ...last24hGroups].map((g) => g.submitterId))];
  const users = await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, pseudo: true } });
  const pseudoById = new Map(users.map((u) => [u.id, u.pseudo]));

  const toEntries = (groups: typeof allTimeGroups): ArtLeaderboardEntry[] =>
    groups.map((g) => ({ pseudo: pseudoById.get(g.submitterId) ?? "?", count: g._count._all }));

  return { allTime: toEntries(allTimeGroups), last24h: toEntries(last24hGroups) };
}

export interface ArtCompletionByFamily {
  family: CardFamily;
  illustratedCards: number;
  totalCards: number;
  percent: number;
}

/** Share of the card corpus that already has at least one community illustration, overall and per family. */
export async function getArtCompletionStats(): Promise<{
  illustratedCards: number;
  totalCards: number;
  percent: number;
  byFamily: ArtCompletionByFamily[];
}> {
  const [illustratedCards, totalCards, illustratedByFamily, totalByFamily] = await Promise.all([
    prisma.card.count({ where: { wikiPage: { imageUrls: { isEmpty: false } } } }),
    prisma.card.count(),
    prisma.card.groupBy({
      by: ["family"],
      where: { wikiPage: { imageUrls: { isEmpty: false } } },
      _count: { _all: true },
    }),
    prisma.card.groupBy({ by: ["family"], _count: { _all: true } }),
  ]);

  const illustratedByFamilyMap = new Map(illustratedByFamily.map((r) => [r.family, r._count._all]));
  const byFamily = totalByFamily
    .map((r) => {
      const illustrated = illustratedByFamilyMap.get(r.family) ?? 0;
      const total = r._count._all;
      return {
        family: r.family,
        illustratedCards: illustrated,
        totalCards: total,
        percent: total === 0 ? 0 : Math.round((illustrated / total) * 1000) / 10,
      };
    })
    .sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family));

  return {
    illustratedCards,
    totalCards,
    percent: totalCards === 0 ? 0 : Math.round((illustratedCards / totalCards) * 1000) / 10,
    byFamily,
  };
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

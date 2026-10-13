/* =========================================================
   RAG ringan (pgvector): embedding materi + pencarian top-K.
   Retrieval memakai chunk (paragraf) bila tersedia, dengan
   fallback ke vektor tingkat dokumen. Degradasi aman: bila
   AI/pgvector tidak siap, kembalikan kosong sehingga explainer
   tetap memakai narasi parser.
   ========================================================= */

import { embedText, isAIConfigured } from "@/lib/ai/gemini";
import {
  chunkText,
  dedupeByMaterial,
  filterBySimilarity,
  materialEmbeddingText,
  type RagChunk,
  vectorLiteral,
} from "@/lib/ai/rag-core";
import { prisma } from "@/lib/db/prisma";

export {
  buildReference,
  chunkText,
  dedupeByMaterial,
  filterBySimilarity,
  materialEmbeddingText,
  RAG_MIN_SIMILARITY,
  type RagChunk,
  type RagCitation,
  toCitations,
} from "@/lib/ai/rag-core";

/**
 * Hitung ulang embedding sebuah materi: vektor dokumen + chunk paragraf.
 * Aman dipanggil walau AI/DB tak siap. Mengembalikan true bila vektor dokumen tersimpan.
 */
export async function reindexMaterial(
  id: string,
  title: string,
  content: string,
): Promise<boolean> {
  if (!isAIConfigured()) return false;
  try {
    const docVec = await embedText(materialEmbeddingText(title, content));
    if (!docVec) return false;
    await prisma.$executeRaw`UPDATE "MaterialItem" SET "embedding" = ${vectorLiteral(docVec)}::vector WHERE "id" = ${id}`;

    const chunks = chunkText(content);
    await prisma.$executeRaw`DELETE FROM "MaterialChunk" WHERE "materialId" = ${id}`;
    for (const [ord, chunk] of chunks.entries()) {
      const vec = await embedText(materialEmbeddingText(title, chunk));
      if (!vec) continue;
      await prisma.$executeRaw`
        INSERT INTO "MaterialChunk" ("id", "materialId", "ord", "content", "embedding")
        VALUES (${`${id}::c${ord}`}, ${id}, ${ord}, ${chunk}, ${vectorLiteral(vec)}::vector)`;
    }
    return true;
  } catch (err) {
    console.warn(
      "[rag] gagal menyimpan embedding materi:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

interface SearchOptions {
  topicId?: string | null;
  limit?: number;
  minSimilarity?: number;
}

/** Cari chunk materi paling relevan (fallback ke vektor dokumen bila belum ada chunk). */
export async function searchMaterials(
  query: string,
  options: SearchOptions = {},
): Promise<RagChunk[]> {
  const clean = query.trim();
  if (!clean || !isAIConfigured()) return [];
  const vec = await embedText(clean);
  if (!vec) return [];
  const literal = vectorLiteral(vec);
  const limit = Math.min(Math.max(options.limit ?? 4, 1), 10);
  const topicId = options.topicId ?? null;

  try {
    const chunks = await searchChunkRows(literal, topicId, limit);
    const rows = chunks.length > 0 ? chunks : await searchDocumentRows(literal, topicId, limit);
    return dedupeByMaterial(filterBySimilarity(rows, options.minSimilarity)).slice(0, limit);
  } catch (err) {
    console.warn("[rag] pencarian materi gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}

function searchChunkRows(literal: string, topicId: string | null, limit: number) {
  const cap = limit * 4;
  return topicId
    ? prisma.$queryRaw<RagChunk[]>`
        SELECT m."id" AS "id", m."title" AS "title", c."content" AS "content",
               m."topicId" AS "topicId", t."title" AS "topicTitle",
               1 - (c."embedding" <=> ${literal}::vector) AS "similarity"
        FROM "MaterialChunk" c
        JOIN "MaterialItem" m ON m."id" = c."materialId"
        LEFT JOIN "Topic" t ON t."id" = m."topicId"
        WHERE c."embedding" IS NOT NULL AND m."topicId" = ${topicId}
        ORDER BY c."embedding" <=> ${literal}::vector
        LIMIT ${cap}`
    : prisma.$queryRaw<RagChunk[]>`
        SELECT m."id" AS "id", m."title" AS "title", c."content" AS "content",
               m."topicId" AS "topicId", t."title" AS "topicTitle",
               1 - (c."embedding" <=> ${literal}::vector) AS "similarity"
        FROM "MaterialChunk" c
        JOIN "MaterialItem" m ON m."id" = c."materialId"
        LEFT JOIN "Topic" t ON t."id" = m."topicId"
        WHERE c."embedding" IS NOT NULL
        ORDER BY c."embedding" <=> ${literal}::vector
        LIMIT ${cap}`;
}

function searchDocumentRows(literal: string, topicId: string | null, limit: number) {
  return topicId
    ? prisma.$queryRaw<RagChunk[]>`
        SELECT m."id", m."title", m."content", m."topicId", t."title" AS "topicTitle",
               1 - (m."embedding" <=> ${literal}::vector) AS "similarity"
        FROM "MaterialItem" m
        LEFT JOIN "Topic" t ON t."id" = m."topicId"
        WHERE m."embedding" IS NOT NULL AND m."topicId" = ${topicId}
        ORDER BY m."embedding" <=> ${literal}::vector
        LIMIT ${limit}`
    : prisma.$queryRaw<RagChunk[]>`
        SELECT m."id", m."title", m."content", m."topicId", t."title" AS "topicTitle",
               1 - (m."embedding" <=> ${literal}::vector) AS "similarity"
        FROM "MaterialItem" m
        LEFT JOIN "Topic" t ON t."id" = m."topicId"
        WHERE m."embedding" IS NOT NULL
        ORDER BY m."embedding" <=> ${literal}::vector
        LIMIT ${limit}`;
}

export interface EmbeddingStatus {
  total: number;
  embedded: number;
  missing: number;
  chunks: number;
  aiConfigured: boolean;
}

/** Ringkasan berapa materi yang sudah punya embedding (dokumen & chunk). */
export async function embeddingStatus(): Promise<EmbeddingStatus> {
  try {
    const rows = await prisma.$queryRaw<Array<{ total: number; embedded: number; chunks: number }>>`
      SELECT (SELECT COUNT(*)::int FROM "MaterialItem") AS "total",
             (SELECT COUNT("embedding")::int FROM "MaterialItem") AS "embedded",
             (SELECT COUNT(*)::int FROM "MaterialChunk") AS "chunks"`;
    const total = rows[0]?.total ?? 0;
    const embedded = rows[0]?.embedded ?? 0;
    return {
      total,
      embedded,
      missing: Math.max(0, total - embedded),
      chunks: rows[0]?.chunks ?? 0,
      aiConfigured: isAIConfigured(),
    };
  } catch (err) {
    console.warn("[rag] status embedding gagal:", err instanceof Error ? err.message : err);
    return { total: 0, embedded: 0, missing: 0, chunks: 0, aiConfigured: isAIConfigured() };
  }
}

export interface BackfillSummary {
  total: number;
  processed: number;
  embedded: number;
  failed: number;
  skipped: number;
  aiConfigured: boolean;
}

/** Hitung ulang embedding untuk materi. Default hanya yang belum punya embedding. */
export async function backfillMaterialEmbeddings(
  options: { onlyMissing?: boolean } = {},
): Promise<BackfillSummary> {
  const onlyMissing = options.onlyMissing ?? true;
  const base: BackfillSummary = {
    total: 0,
    processed: 0,
    embedded: 0,
    failed: 0,
    skipped: 0,
    aiConfigured: isAIConfigured(),
  };
  if (!base.aiConfigured) return base;

  let rows: Array<{ id: string; title: string; content: string; embedded: boolean }>;
  try {
    rows = await prisma.$queryRaw<
      Array<{ id: string; title: string; content: string; embedded: boolean }>
    >`
      SELECT "id", "title", "content", ("embedding" IS NOT NULL) AS "embedded"
      FROM "MaterialItem"
      ORDER BY "updatedAt" ASC`;
  } catch (err) {
    console.warn("[rag] backfill gagal memuat materi:", err instanceof Error ? err.message : err);
    return base;
  }

  for (const row of rows) {
    if (onlyMissing && row.embedded) {
      base.skipped += 1;
      continue;
    }
    base.processed += 1;
    const ok = await reindexMaterial(row.id, row.title, row.content);
    if (ok) base.embedded += 1;
    else base.failed += 1;
  }
  return { ...base, total: rows.length };
}

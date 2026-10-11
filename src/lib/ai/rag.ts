/* =========================================================
   RAG ringan (pgvector): embedding materi + pencarian top-K.
   Degradasi aman: bila AI/pgvector tidak siap, kembalikan kosong
   sehingga explainer tetap memakai narasi parser.
   ========================================================= */

import { embedText, isAIConfigured } from "@/lib/ai/gemini";
import {
  filterBySimilarity,
  materialEmbeddingText,
  type RagChunk,
  vectorLiteral,
} from "@/lib/ai/rag-core";
import { prisma } from "@/lib/db/prisma";

export {
  buildReference,
  filterBySimilarity,
  materialEmbeddingText,
  RAG_MIN_SIMILARITY,
  type RagChunk,
  type RagCitation,
  toCitations,
} from "@/lib/ai/rag-core";

/** Hitung & simpan embedding sebuah materi. Aman dipanggil walau AI/DB tak siap. */
export async function upsertMaterialEmbedding(id: string, text: string): Promise<boolean> {
  if (!isAIConfigured()) return false;
  try {
    const vec = await embedText(text);
    if (!vec) return false;
    await prisma.$executeRaw`UPDATE "MaterialItem" SET "embedding" = ${vectorLiteral(vec)}::vector WHERE "id" = ${id}`;
    return true;
  } catch (err) {
    console.warn(
      "[rag] gagal menyimpan embedding materi:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Cari materi paling relevan terhadap query (cosine similarity). */
export async function searchMaterials(
  query: string,
  options: { topicId?: string | null; limit?: number; minSimilarity?: number } = {},
): Promise<RagChunk[]> {
  const clean = query.trim();
  if (!clean || !isAIConfigured()) return [];
  const vec = await embedText(clean);
  if (!vec) return [];
  const literal = vectorLiteral(vec);
  const limit = Math.min(Math.max(options.limit ?? 4, 1), 10);

  try {
    const rows = options.topicId
      ? await prisma.$queryRaw<RagChunk[]>`
          SELECT m."id", m."title", m."content", m."topicId", t."title" AS "topicTitle",
                 1 - (m."embedding" <=> ${literal}::vector) AS "similarity"
          FROM "MaterialItem" m
          LEFT JOIN "Topic" t ON t."id" = m."topicId"
          WHERE m."embedding" IS NOT NULL AND m."topicId" = ${options.topicId}
          ORDER BY m."embedding" <=> ${literal}::vector
          LIMIT ${limit}`
      : await prisma.$queryRaw<RagChunk[]>`
          SELECT m."id", m."title", m."content", m."topicId", t."title" AS "topicTitle",
                 1 - (m."embedding" <=> ${literal}::vector) AS "similarity"
          FROM "MaterialItem" m
          LEFT JOIN "Topic" t ON t."id" = m."topicId"
          WHERE m."embedding" IS NOT NULL
          ORDER BY m."embedding" <=> ${literal}::vector
          LIMIT ${limit}`;
    return filterBySimilarity(rows, options.minSimilarity);
  } catch (err) {
    console.warn("[rag] pencarian materi gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}

export interface EmbeddingStatus {
  total: number;
  embedded: number;
  missing: number;
  aiConfigured: boolean;
}

/** Ringkasan berapa materi yang sudah punya embedding. */
export async function embeddingStatus(): Promise<EmbeddingStatus> {
  try {
    const rows = await prisma.$queryRaw<Array<{ total: number; embedded: number }>>`
      SELECT COUNT(*)::int AS "total", COUNT("embedding")::int AS "embedded" FROM "MaterialItem"`;
    const total = rows[0]?.total ?? 0;
    const embedded = rows[0]?.embedded ?? 0;
    return {
      total,
      embedded,
      missing: Math.max(0, total - embedded),
      aiConfigured: isAIConfigured(),
    };
  } catch (err) {
    console.warn("[rag] status embedding gagal:", err instanceof Error ? err.message : err);
    return { total: 0, embedded: 0, missing: 0, aiConfigured: isAIConfigured() };
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
    const ok = await upsertMaterialEmbedding(row.id, materialEmbeddingText(row.title, row.content));
    if (ok) base.embedded += 1;
    else base.failed += 1;
  }
  return { ...base, total: rows.length };
}

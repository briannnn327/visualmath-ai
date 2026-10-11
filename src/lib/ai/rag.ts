/* =========================================================
   RAG ringan (pgvector): embedding materi + pencarian top-K.
   Degradasi aman: bila AI/pgvector tidak siap, kembalikan kosong
   sehingga explainer tetap memakai narasi parser.
   ========================================================= */
import { embedText, isAIConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db/prisma";

export interface RagChunk {
  id: string;
  title: string;
  content: string;
  topicId: string | null;
  similarity: number;
}

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Bangun teks sumber embedding dari sebuah materi. */
export function materialEmbeddingText(title: string, content: string): string {
  return `${title}\n\n${content}`.trim();
}

/** Hitung & simpan embedding sebuah materi. Aman dipanggil walau AI/DB tak siap. */
export async function upsertMaterialEmbedding(id: string, text: string): Promise<boolean> {
  try {
    if (!isAIConfigured()) return false;
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
  options: { topicId?: string | null; limit?: number } = {},
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
          SELECT "id", "title", "content", "topicId",
                 1 - ("embedding" <=> ${literal}::vector) AS "similarity"
          FROM "MaterialItem"
          WHERE "embedding" IS NOT NULL AND "topicId" = ${options.topicId}
          ORDER BY "embedding" <=> ${literal}::vector
          LIMIT ${limit}`
      : await prisma.$queryRaw<RagChunk[]>`
          SELECT "id", "title", "content", "topicId",
                 1 - ("embedding" <=> ${literal}::vector) AS "similarity"
          FROM "MaterialItem"
          WHERE "embedding" IS NOT NULL
          ORDER BY "embedding" <=> ${literal}::vector
          LIMIT ${limit}`;
    return rows;
  } catch (err) {
    console.warn("[rag] pencarian materi gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Gabungkan hasil retrieval menjadi blok referensi untuk prompt. */
export function buildReference(chunks: RagChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] ${c.title}\n${truncate(c.content, 600)}`).join("\n\n");
}

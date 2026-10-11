/* =========================================================
   RAG — helper MURNI (tanpa DB/AI) agar mudah diuji.
   Dipakai oleh rag.ts (yang menyentuh PostgreSQL/pgvector).
   ========================================================= */
import type { RagCitation } from "@/lib/types";

export interface RagChunk {
  id: string;
  title: string;
  content: string;
  topicId: string | null;
  topicTitle: string | null;
  similarity: number;
}

export type { RagCitation };

/** Ambang minimal kesamaan kosinus agar sebuah materi dianggap relevan. */
export const RAG_MIN_SIMILARITY = 0.35;

/** Format array angka menjadi literal vektor pgvector: "[0.1,0.2,...]". */
export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Bangun teks sumber embedding dari sebuah materi. */
export function materialEmbeddingText(title: string, content: string): string {
  return `${title.trim()}\n\n${content.trim()}`.trim();
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Saring chunk yang skornya di bawah ambang relevansi. */
export function filterBySimilarity(chunks: RagChunk[], min = RAG_MIN_SIMILARITY): RagChunk[] {
  return chunks.filter((c) => Number.isFinite(c.similarity) && c.similarity >= min);
}

/** Ubah chunk retrieval menjadi daftar sitasi ringkas (untuk ditampilkan ke pengguna). */
export function toCitations(chunks: RagChunk[]): RagCitation[] {
  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    topicId: c.topicId,
    topicTitle: c.topicTitle,
    similarity: Math.round(c.similarity * 1000) / 1000,
  }));
}

/** Gabungkan hasil retrieval menjadi blok referensi untuk prompt. */
export function buildReference(chunks: RagChunk[]): string {
  return chunks
    .map((c, i) => {
      const source = c.topicTitle ? ` (${c.topicTitle})` : "";
      return `[${i + 1}] ${c.title}${source}\n${truncate(c.content, 600)}`;
    })
    .join("\n\n");
}

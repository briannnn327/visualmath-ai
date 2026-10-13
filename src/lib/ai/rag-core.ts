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

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
  minChars?: number;
}

const CHUNK_DEFAULTS: Required<ChunkOptions> = { maxChars: 800, overlap: 120, minChars: 160 };

function hardSplit(text: string, maxChars: number, overlap: number): string[] {
  const parts: string[] = [];
  const step = Math.max(1, maxChars - overlap);
  for (let i = 0; i < text.length; i += step) {
    parts.push(text.slice(i, i + maxChars));
    if (i + maxChars >= text.length) break;
  }
  return parts;
}

/**
 * Pecah konten materi menjadi potongan (per paragraf, dengan panjang maksimum)
 * untuk embedding tingkat chunk. Paragraf raksasa dipotong dengan tumpang tindih.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? CHUNK_DEFAULTS.maxChars;
  const overlap = options.overlap ?? CHUNK_DEFAULTS.overlap;
  const minChars = options.minChars ?? CHUNK_DEFAULTS.minChars;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = "";
  };

  for (const para of paragraphs) {
    const pieces = para.length > maxChars ? hardSplit(para, maxChars, overlap) : [para];
    for (const piece of pieces) {
      if (!buffer) buffer = piece;
      else if (buffer.length + 2 + piece.length <= maxChars) buffer = `${buffer}\n\n${piece}`;
      else {
        flush();
        buffer = piece;
      }
    }
  }
  flush();

  const merged: string[] = [];
  for (const chunk of chunks) {
    if (merged.length > 0 && chunk.length < minChars) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${chunk}`;
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

/** Simpan hanya chunk terbaik per materi (dipakai saat retrieval tingkat paragraf). */
export function dedupeByMaterial(chunks: RagChunk[]): RagChunk[] {
  const best = new Map<string, RagChunk>();
  for (const chunk of chunks) {
    const current = best.get(chunk.id);
    if (!current || chunk.similarity > current.similarity) best.set(chunk.id, chunk);
  }
  return [...best.values()].sort((a, b) => b.similarity - a.similarity);
}

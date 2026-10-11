import { describe, expect, it } from "vitest";
import {
  buildReference,
  filterBySimilarity,
  materialEmbeddingText,
  RAG_MIN_SIMILARITY,
  type RagChunk,
  toCitations,
  vectorLiteral,
} from "@/lib/ai/rag-core";

function chunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    id: "m1",
    title: "Turunan Parsial",
    content: "Isi materi turunan parsial.",
    topicId: "t1",
    topicTitle: "Turunan",
    similarity: 0.8,
    ...overrides,
  };
}

describe("rag-core — helper murni", () => {
  it("membangun teks embedding dari judul + konten", () => {
    expect(materialEmbeddingText("Judul", "Isi")).toBe("Judul\n\nIsi");
    expect(materialEmbeddingText("  Judul  ", "  Isi  ")).toBe("Judul\n\nIsi");
  });

  it("membuat literal vektor pgvector", () => {
    expect(vectorLiteral([0.1, 2, -3])).toBe("[0.1,2,-3]");
  });

  it("menyaring chunk di bawah ambang relevansi", () => {
    const chunks = [chunk({ id: "a", similarity: 0.9 }), chunk({ id: "b", similarity: 0.1 })];
    const kept = filterBySimilarity(chunks);
    expect(kept.map((c) => c.id)).toEqual(["a"]);
    expect(RAG_MIN_SIMILARITY).toBeGreaterThan(0);
  });

  it("membuang nilai similarity bukan angka", () => {
    const kept = filterBySimilarity([chunk({ similarity: Number.NaN })]);
    expect(kept).toHaveLength(0);
  });

  it("memetakan chunk menjadi sitasi dengan pembulatan skor", () => {
    const citations = toCitations([chunk({ similarity: 0.12345 })]);
    expect(citations[0]).toEqual({
      id: "m1",
      title: "Turunan Parsial",
      topicId: "t1",
      topicTitle: "Turunan",
      similarity: 0.123,
    });
  });

  it("membangun blok referensi bernomor beserta judul topik", () => {
    const ref = buildReference([chunk(), chunk({ id: "m2", title: "Integral", topicTitle: null })]);
    expect(ref).toContain("[1] Turunan Parsial (Turunan)");
    expect(ref).toContain("[2] Integral");
  });

  it("memotong konten yang terlalu panjang", () => {
    const ref = buildReference([chunk({ content: "a".repeat(700) })]);
    expect(ref).toContain("…");
  });
});

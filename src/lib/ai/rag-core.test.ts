import { describe, expect, it } from "vitest";
import {
  buildReference,
  chunkText,
  dedupeByMaterial,
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
    materialId: "m1",
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
      materialId: "m1",
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

describe("rag-core — chunking materi", () => {
  it("mengembalikan [] untuk teks kosong", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("tidak memecah teks pendek dan memangkas spasi", () => {
    expect(chunkText("  hai  ", { maxChars: 800 })).toEqual(["hai"]);
  });

  it("memecah paragraf menjadi chunk dengan batas panjang", () => {
    const text = ["A".repeat(300), "B".repeat(300), "C".repeat(300)].join("\n\n");
    const chunks = chunkText(text, { maxChars: 400, overlap: 50, minChars: 0 });
    expect(chunks).toHaveLength(3);
    expect(chunks.every((c) => c.length <= 400)).toBe(true);
  });

  it("memotong paragraf raksasa dengan tumpang tindih", () => {
    const chunks = chunkText("x".repeat(1000), { maxChars: 300, overlap: 100, minChars: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
  });

  it("menggabungkan chunk yang terlalu pendek ke chunk sebelumnya", () => {
    const text = ["A".repeat(200), "kecil", "B".repeat(200)].join("\n\n");
    const chunks = chunkText(text, { maxChars: 250, overlap: 50, minChars: 50 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain("kecil");
  });
});

describe("rag-core — dedupe per materi", () => {
  it("menyimpan skor tertinggi per materi dan mengurutkan menurun", () => {
    const deduped = dedupeByMaterial([
      chunk({ id: "c1", materialId: "m1", similarity: 0.4, content: "rendah" }),
      chunk({ id: "c2", materialId: "m1", similarity: 0.7, content: "terbaik" }),
      chunk({ id: "c3", materialId: "m2", similarity: 0.9 }),
    ]);
    expect(deduped.map((c) => c.materialId)).toEqual(["m2", "m1"]);
    expect(deduped.find((c) => c.materialId === "m1")?.similarity).toBe(0.7);
    expect(deduped.find((c) => c.materialId === "m1")?.content).toBe("terbaik");
  });
});

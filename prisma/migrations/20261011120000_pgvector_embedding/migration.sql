-- RAG: aktifkan pgvector + kolom embedding materi (768 dim, gemini-embedding-001)
-- Prasyarat: ekstensi pgvector tersedia pada server Postgres.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "MaterialItem" ADD COLUMN "embedding" vector(768);

CREATE INDEX IF NOT EXISTS "MaterialItem_embedding_idx"
  ON "MaterialItem" USING hnsw ("embedding" vector_cosine_ops);

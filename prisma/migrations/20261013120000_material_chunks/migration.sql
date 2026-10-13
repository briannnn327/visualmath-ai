-- RAG chunking: tabel chunk materi (embedding per paragraf, 768 dim)
-- Memungkinkan retrieval tingkat paragraf selain vektor dokumen di MaterialItem.

CREATE TABLE "MaterialChunk" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "ord" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(768),

    CONSTRAINT "MaterialChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaterialChunk_materialId_idx" ON "MaterialChunk"("materialId");

CREATE INDEX "MaterialChunk_embedding_idx"
  ON "MaterialChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "MaterialChunk"
  ADD CONSTRAINT "MaterialChunk_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "MaterialItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

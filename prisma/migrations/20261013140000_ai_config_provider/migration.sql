-- Tambah kolom provider pada AIConfig (gemini | groq) untuk memilih mesin bahasa.
ALTER TABLE "AIConfig" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'gemini';

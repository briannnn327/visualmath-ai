/* =========================================================
   Hitung ulang embedding materi (RAG) dari CLI.
   Jalankan: npm run embeddings:backfill
   Opsi:    npm run embeddings:backfill -- --all
   ========================================================= */
import { config } from "dotenv";

config({ path: [".env", ".env.local"] });

async function main() {
  const onlyMissing = !process.argv.includes("--all");
  const { backfillMaterialEmbeddings } = await import("@/lib/ai/rag");
  const summary = await backfillMaterialEmbeddings({ onlyMissing });

  if (!summary.aiConfigured) {
    console.error("GAGAL: GOOGLE_GENERATIVE_AI_API_KEY belum diisi (.env.local).");
    process.exit(1);
  }

  console.log(
    `Backfill embedding (${onlyMissing ? "hanya yang kosong" : "semua"}) — ` +
      `total ${summary.total}, berhasil ${summary.embedded}, gagal ${summary.failed}, dilewati ${summary.skipped}.`,
  );
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Gagal menjalankan backfill:", err instanceof Error ? err.message : err);
  process.exit(1);
});

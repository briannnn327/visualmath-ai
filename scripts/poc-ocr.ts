/* =========================================================
   POC OCR multimodal — baca gambar soal matematika via Gemini vision.

   Jalankan : npx tsx scripts/poc-ocr.ts   (atau: npm run poc:ocr)
   Gambar   : scripts/poc-ocr/img/*.png
              Buat dulu dengan: python scripts/poc-ocr/gen_images.py
   ========================================================= */
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { config } from "dotenv";
import { isAIConfigured, ocrMathImage, type OcrTopicOption } from "@/lib/ai/gemini";
import type { AIConfig } from "@/lib/types";

config({ path: [".env", ".env.local"] });

/** Model Gemini yang dipakai; override lewat env bila model bawaan sedang padat. */
const MODEL = process.env.VMA_POC_MODEL || undefined;

const IMG_DIR = join(__dirname, "poc-ocr", "img");
const FILES = (process.env.VMA_POC_FILES || "polinom.png,turunan.png,integral.png").split(",");

const TOPICS: OcrTopicOption[] = [
  { slug: "aljabar-dasar", title: "Aljabar Dasar", subtitle: "Ekspresi polinomial" },
  { slug: "turunan", title: "Turunan", subtitle: "Kalkulus diferensial" },
  { slug: "integral", title: "Integral", subtitle: "Integral tentu" },
  { slug: "grafik-fungsi", title: "Grafik Fungsi", subtitle: "Kurva fungsi" },
];

function toDataUrl(path: string): string {
  const buf = readFileSync(path);
  const ext = path.split(".").pop()?.toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  if (!isAIConfigured()) {
    console.error("GAGAL: GOOGLE_GENERATIVE_AI_API_KEY belum diisi (.env.local).");
    process.exit(1);
  }

  for (const file of FILES) {
    const path = join(IMG_DIR, file);
    const cfg = MODEL ? ({ model: MODEL, maxTokens: 1024 } as unknown as AIConfig) : null;
    process.stdout.write(`\n[${basename(file)}] `);
    try {
      const res = await ocrMathImage(toDataUrl(path), TOPICS, cfg);
      if (!res) {
        console.log("OCR gagal (null) — gambar tidak terbaca / AI tidak terkonfigurasi.");
        continue;
      }
      console.log(`model=${res.model}`);
      console.log(`  expression : ${res.expression}`);
      console.log(`  latex      : ${res.latex}`);
      console.log(`  topicSlug  : ${res.topicSlug ?? "-"}`);
      console.log(`  confidence : ${res.confidence ?? "-"}`);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Gagal menjalankan POC:", err instanceof Error ? err.message : err);
    process.exit(1);
  });

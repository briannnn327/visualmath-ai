/* =========================================================
   Lapisan AI — adapter Google Gemini (server-only)
   - explainer & bantuan latihan (teks): geminiExplainAnalysis / geminiExerciseHelp
   - OCR foto soal (vision): ocrMathImage
   - embedding RAG: embedText
   Prompt/konteks/parse dipakai bersama di "@/lib/ai/shared".
   ========================================================= */
import { GoogleGenAI } from "@google/genai";
import {
  type AIExerciseHelpResult,
  type AIExplainResult,
  BASE_SYSTEM,
  buildContext,
  buildHelpContext,
  clamp,
  EXPLAIN_SYSTEM,
  type ExerciseHelpInput,
  extractJson,
  HINT_SYSTEM,
  parseExplainPayload,
  withRetry,
} from "@/lib/ai/shared";
import type { AIConfig, FormulaAnalysis } from "@/lib/types";

const DEFAULT_MODEL = "gemini-3.8-flash";

/**
 * Model khusus OCR (vision). Sebagian model Gemini teks-saja (mis. gemini-3.8-flash
 * menolak gambar), jadi OCR tidak memakai model teks yang dikonfigurasi admin,
 * melainkan daftar model yang mendukung input gambar — dicoba berurutan.
 */
const VISION_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3-flash-preview"];

function apiKey(): string {
  return (process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "").trim();
}

/** True bila API key Gemini tersedia di lingkungan server. */
export function isAIConfigured(): boolean {
  return apiKey().length > 0;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

/** Hanya pakai nama model Gemini yang valid; selain itu fallback ke default. */
function resolveModel(configModel?: string | null): string {
  if (configModel && /^gemini-[a-z0-9.-]+$/i.test(configModel)) return configModel;
  return DEFAULT_MODEL;
}

/* =========================================================
   Embedding RAG
   ========================================================= */

export async function embedText(text: string): Promise<number[] | null> {
  const clean = text.trim();
  if (!clean || !isAIConfigured()) return null;
  const res = await withRetry(() =>
    getClient().models.embedContent({
      model: "gemini-embedding-001",
      contents: clean,
      config: { outputDimensionality: 768 },
    }),
  );
  const values = res.embeddings?.[0]?.values;
  return values && values.length > 0 ? values : null;
}

/* =========================================================
   Explainer — narasi langkah dari hasil mesin
   ========================================================= */

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description: "Narasi konseptual dalam Bahasa Indonesia, 2-4 paragraf, tanpa mengubah angka.",
    },
    keyPoints: {
      type: "array",
      description: "2-4 poin kunci singkat yang harus dipahami mahasiswa.",
      items: { type: "string" },
    },
  },
  required: ["explanation"],
} as const;

/**
 * Minta penjelasan konseptual dari Gemini berdasarkan hasil parser.
 * Mengembalikan null bila AI tidak dikonfigurasi; melempar error bila panggilan gagal.
 */
export async function geminiExplainAnalysis(
  analysis: FormulaAnalysis,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExplainResult | null> {
  if (!isAIConfigured()) return null;

  const model = resolveModel(config?.model);
  const systemPrompt = [BASE_SYSTEM, config?.systemPrompt?.trim()].filter(Boolean).join("\n\n");

  const response = await withRetry(() =>
    getClient().models.generateContent({
      model,
      contents: buildContext(analysis, reference),
      config: {
        systemInstruction: systemPrompt,
        temperature: clamp(config?.temperature ?? 0.4, 0, 2),
        maxOutputTokens: clamp(config?.maxTokens ?? 2048, 256, 8192),
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  );

  const parsed = parseExplainPayload(response.text, "Gemini");
  if (!parsed) return null;
  return { explanation: parsed.explanation, keyPoints: parsed.keyPoints, model };
}

/* =========================================================
   Latihan soal — hint & pembahasan berbasis RAG
   ========================================================= */

const HELP_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description:
        "Penjelasan/petunjuk dalam Bahasa Indonesia, tanpa mengubah angka dari data yang diberikan.",
    },
    keyPoints: {
      type: "array",
      description: "0-3 poin kunci singkat (opsional).",
      items: { type: "string" },
    },
  },
  required: ["explanation"],
} as const;

/**
 * Hasilkan petunjuk ("hint") atau pembahasan ("explain") untuk soal latihan.
 * Mengembalikan null bila AI tidak dikonfigurasi; melempar error bila panggilan gagal.
 */
export async function geminiExerciseHelp(
  input: ExerciseHelpInput,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExerciseHelpResult | null> {
  if (!isAIConfigured()) return null;

  const model = resolveModel(config?.model);
  const systemPrompt = [
    input.mode === "hint" ? HINT_SYSTEM : EXPLAIN_SYSTEM,
    config?.systemPrompt?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await withRetry(() =>
    getClient().models.generateContent({
      model,
      contents: buildHelpContext(input, reference),
      config: {
        systemInstruction: systemPrompt,
        temperature: clamp(config?.temperature ?? 0.4, 0, 2),
        maxOutputTokens: clamp(config?.maxTokens ?? 1024, 256, 4096),
        responseMimeType: "application/json",
        responseJsonSchema: HELP_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  );

  const parsed = parseExplainPayload(response.text, "Gemini");
  if (!parsed) return null;
  return { text: parsed.explanation, keyPoints: parsed.keyPoints, model };
}

/* =========================================================
   OCR / Vision — baca soal dari foto
   ========================================================= */

export interface AIOcrResult {
  /** Ekspresi dalam notasi teks yang bisa diurai parser.ts (mis. "3x^2 + 2x - 1"). */
  expression: string;
  /** Representasi LaTeX bila model menyediakannya. */
  latex: string;
  /** Slug topik yang paling cocok dari daftar yang diberikan, atau null. */
  topicSlug: string | null;
  /** Tingkat keyakinan 0-100. */
  confidence: number;
  /** Catatan singkat hasil pembacaan gambar. */
  note: string;
  model: string;
}

export interface OcrTopicOption {
  slug: string;
  title: string;
  subtitle: string;
}

const OCR_SCHEMA = {
  type: "object",
  properties: {
    expression: {
      type: "string",
      description:
        "Ekspresi matematika utama sebagai fungsi satu variabel dalam notasi teks biasa, mis. '3x^2 + 2x - 1'. Gunakan ^ untuk pangkat. Hanya berisi angka, huruf, + - * / ^ ( ) dan fungsi (sin, cos, ln, exp, sqrt). Kosongkan bila tidak ada ekspresi jelas.",
    },
    latex: { type: "string", description: "Ekspresi yang sama dalam LaTeX (opsional)." },
    topicSlug: {
      type: "string",
      description:
        "Slug topik yang paling cocok dari daftar topik yang diberikan, atau string kosong.",
    },
    confidence: { type: "number", description: "Keyakinan pembacaan 0-100." },
    note: { type: "string", description: "Catatan singkat bahasa Indonesia tentang isi soal." },
  },
  required: ["expression"],
} as const;

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function buildOcrPrompt(topics: OcrTopicOption[]): string {
  const list = topics.map((t) => `- ${t.slug}: ${t.title} — ${t.subtitle}`).join("\n");
  return [
    "Baca gambar soal matematika berikut.",
    "Ekstrak ekspresi matematika UTAMA menjadi notasi teks satu variabel yang dapat dihitung secara simbolik.",
    "PENTING: tulis perkalian dengan tanda '*' secara eksplisit, mis. '3*x^2 + 2*x - 1' (bukan '3x^2 + 2x - 1').",
    "Jangan menyelesaikan soal; cukup tuliskan ekspresinya.",
    "Pilih topik paling relevan dari daftar berikut (jawab dengan slug-nya):",
    list || "(tidak ada daftar topik)",
    "Jawab dalam Bahasa Indonesia pada bagian catatan.",
  ].join("\n");
}

interface RawOcr {
  expression?: unknown;
  latex?: unknown;
  topicSlug?: unknown;
  confidence?: unknown;
  note?: unknown;
}

function parseOcr(text: string | undefined): Omit<AIOcrResult, "model"> | null {
  if (!text) {
    console.warn("[ai] respons OCR kosong");
    return null;
  }
  const json = extractJson(text);
  if (!json) {
    console.warn("[ai] tidak ada JSON pada respons OCR");
    return null;
  }
  let data: RawOcr;
  try {
    data = JSON.parse(json) as RawOcr;
  } catch {
    console.warn("[ai] gagal parse JSON OCR:", json.slice(0, 200));
    return null;
  }
  const expression = typeof data.expression === "string" ? data.expression.trim() : "";
  const latex = typeof data.latex === "string" ? data.latex.trim() : "";
  const topicSlug =
    typeof data.topicSlug === "string" && data.topicSlug.trim().length > 0
      ? data.topicSlug.trim()
      : null;
  const confidence =
    typeof data.confidence === "number" && Number.isFinite(data.confidence)
      ? Math.min(100, Math.max(0, Math.round(data.confidence)))
      : 0;
  const note = typeof data.note === "string" ? data.note.trim() : "";
  return { expression, latex, topicSlug, confidence, note };
}

/**
 * Baca ekspresi matematika dari gambar (data URL) memakai Gemini vision.
 * Mengembalikan null bila AI tidak dikonfigurasi / gambar tidak terbaca.
 */
export async function ocrMathImage(
  imageDataUrl: string,
  topics: OcrTopicOption[],
  config: AIConfig | null,
): Promise<AIOcrResult | null> {
  if (!isAIConfigured()) return null;
  const image = parseDataUrl(imageDataUrl);
  if (!image) throw new Error("Format gambar tidak didukung");

  let lastError: unknown;
  for (const model of VISION_MODELS) {
    try {
      const response = await withRetry(() =>
        getClient().models.generateContent({
          model,
          contents: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: buildOcrPrompt(topics) },
          ],
          config: {
            systemInstruction:
              "Kamu adalah pembaca soal matematika. Ekstrak ekspresi dengan teliti, jangan menghitung.",
            temperature: 0,
            maxOutputTokens: clamp(config?.maxTokens ?? 1024, 256, 4096),
            responseMimeType: "application/json",
            responseJsonSchema: OCR_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      );

      const parsed = parseOcr(response.text);
      if (parsed) return { ...parsed, model };
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return null;
}

/* =========================================================
   Lapisan AI — Google Gemini (server-only)
   - explainAnalysis(): narasi langkah dari hasil mesin matematika
   - Mode aman: bila API key kosong / gagal, pemanggil memakai
     hasil deterministik parser.ts (fallback).
   ========================================================= */
import { GoogleGenAI } from "@google/genai";
import type { AIConfig, FormulaAnalysis } from "@/lib/types";

const DEFAULT_MODEL = "gemini-3.8-flash";

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;

/** Hitung embedding teks (untuk RAG). Mengembalikan null bila AI tak dikonfigurasi. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!isAIConfigured()) return null;
  const clean = text.trim();
  if (!clean) return null;
  const response = await withRetry(() =>
    getClient().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: clean,
      config: { outputDimensionality: EMBEDDING_DIM },
    }),
  );
  const values = response.embeddings?.[0]?.values;
  return values && values.length > 0 ? values : null;
}

export interface AIExplainResult {
  explanation: string;
  keyPoints: string[];
  model: string;
}

const BASE_SYSTEM = [
  "Kamu adalah tutor kalkulus peubah banyak untuk mahasiswa S1 Indonesia.",
  "ATURAN PENTING: hasil turunan, akar, ekstrem, dan integral sudah dihitung oleh mesin simbolik.",
  "JANGAN menghitung ulang dan JANGAN mengubah angka apa pun dari data yang diberikan.",
  "Tugasmu hanya MENJELASKAN konsep dan alasan di balik langkah-langkah tersebut.",
  "Gunakan Bahasa Indonesia yang jelas, ramah, dan ringkas (maksimal ~4 paragraf).",
  "Hindari sapaan pembuka berlebihan; langsung ke inti penjelasan.",
  "Kembalikan jawaban sebagai JSON sesuai skema.",
].join(" ");

/** Ringkas hasil mesin menjadi konteks teks untuk model. */
function buildContext(analysis: FormulaAnalysis, reference?: string | null): string {
  const lines: string[] = [];
  lines.push(`Fungsi: f(${analysis.variable}) = ${analysis.pretty}`);
  lines.push(`Turunan: f′(${analysis.variable}) = ${analysis.derivativePretty}`);
  if (analysis.rulesUsed.length > 0) {
    lines.push(`Aturan turunan yang terdeteksi: ${analysis.rulesUsed.join(", ")}.`);
  }
  if (analysis.roots.length > 0) {
    lines.push(
      `Akar (pembuat nol): ${analysis.roots.map((r) => `x ≈ ${r.x.toFixed(3)}`).join(", ")}.`,
    );
  }
  if (analysis.extrema.length > 0) {
    lines.push(
      `Titik ekstrem: ${analysis.extrema
        .map((e) => `${e.kind === "min" ? "minimum" : "maksimum"} di x ≈ ${e.x.toFixed(3)}`)
        .join(", ")}.`,
    );
  }
  lines.push(`Integral numerik: ${analysis.integralText}`);
  if (analysis.steps.length > 0) {
    lines.push("Langkah penyelesaian dari mesin (jangan diubah, cukup dijelaskan):");
    for (const [i, s] of analysis.steps.entries()) {
      lines.push(`${i + 1}. ${s.title} — ${s.math} :: ${s.description}`);
    }
  }
  if (reference && reference.trim().length > 0) {
    lines.push(
      "REFERENSI MATERI KULIAH (gunakan istilah & pendekatan sesuai ini, jangan mengarang di luar referensi):",
      reference.trim(),
    );
  }
  return lines.join("\n");
}

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

interface RawExplain {
  explanation?: unknown;
  keyPoints?: unknown;
}

/** Ambil objek JSON pertama walau model menambah teks pembungkus. */
function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function parseResult(text: string | undefined): AIExplainResult | null {
  if (!text) {
    console.warn("[ai] respons Gemini kosong");
    return null;
  }
  const json = extractJson(text);
  if (!json) {
    console.warn("[ai] tidak ada objek JSON pada respons");
    return null;
  }
  let data: RawExplain;
  try {
    data = JSON.parse(json) as RawExplain;
  } catch {
    console.warn("[ai] gagal parse JSON:", json.slice(0, 200));
    return null;
  }
  const explanation = typeof data.explanation === "string" ? data.explanation.trim() : "";
  if (!explanation) return null;
  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  return { explanation, keyPoints, model: "" };
}

/** Status HTTP yang layak dicoba ulang (overload / rate limit sesaat). */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

/**
 * Minta penjelasan konseptual dari Gemini berdasarkan hasil parser.
 * Mengembalikan null bila AI tidak dikonfigurasi; melempar error bila panggilan gagal
 * (pemanggil bertanggung jawab menyediakan fallback deterministik).
 */
export async function explainAnalysis(
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

  const parsed = parseResult(response.text);
  if (!parsed) return null;
  return { ...parsed, model };
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

  const model = resolveModel(config?.model);
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
  if (!parsed) return null;
  return { ...parsed, model };
}

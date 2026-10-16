/* =========================================================
   Bagian AI yang dipakai bersama antar-provider (Gemini & Groq):
   prompt sistem, penyusun konteks, util retry/parse JSON.
   ========================================================= */
import type { FormulaAnalysis } from "@/lib/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ---------- Tipe bersama ---------- */

export interface ExerciseHelpInput {
  mode: "hint" | "explain";
  prompt: string;
  latex?: string | null;
  type?: string;
  expectedAnswer: string;
  explanation: string;
}

export interface AIExplainResult {
  explanation: string;
  keyPoints: string[];
  model: string;
}

export interface AIExerciseHelpResult {
  text: string;
  keyPoints: string[];
  model: string;
}

/* ---------- Prompt sistem ---------- */

export const BASE_SYSTEM = [
  "Kamu adalah tutor kalkulus peubah banyak untuk mahasiswa S1 Indonesia.",
  "ATURAN PENTING: hasil turunan, akar, ekstrem, dan integral sudah dihitung oleh mesin simbolik.",
  "JANGAN menghitung ulang dan JANGAN mengubah angka apa pun dari data yang diberikan.",
  "Tugasmu hanya MENJELASKAN konsep dan alasan di balik langkah-langkah tersebut.",
  "Gunakan Bahasa Indonesia yang jelas, ramah, dan ringkas (maksimal ~4 paragraf).",
  "Hindari sapaan pembuka berlebihan; langsung ke inti penjelasan.",
  "Kembalikan jawaban sebagai JSON sesuai skema.",
].join(" ");

export const HINT_SYSTEM = [
  "Kamu adalah tutor kalkulus yang membimbing mahasiswa S1 Indonesia.",
  "Beri PETUNJUK bertahap: petakan konsep/rumus/aturan yang perlu dipakai agar mahasiswa bisa mengerjakan sendiri.",
  "JANGAN menuliskan jawaban akhir atau angka hasil akhirnya.",
  "Maksimal ~3 kalimat, bahasa jelas dan memotivasi.",
  "Bila ada REFERENSI MATERI KULIAH, gunakan istilah & pendekatan sesuai referensi itu.",
  "Kembalikan jawaban sebagai JSON sesuai skema.",
].join(" ");

export const EXPLAIN_SYSTEM = [
  "Kamu adalah tutor kalkulus untuk mahasiswa S1 Indonesia.",
  "Jelaskan langkah penyelesaian soal dengan mengacu pada pembahasan inti yang diberikan.",
  "JANGAN menghitung ulang dan JANGAN mengubah angka apa pun dari data yang diberikan.",
  "Gunakan Bahasa Indonesia yang jelas dan ringkas (maksimal ~3 paragraf).",
  "Bila ada REFERENSI MATERI KULIAH, kaitkan penjelasan dengan referensi itu.",
  "Kembalikan jawaban sebagai JSON sesuai skema.",
].join(" ");

/* ---------- Konteks ---------- */

/** Ringkas hasil mesin menjadi konteks teks untuk model. */
export function buildContext(analysis: FormulaAnalysis, reference?: string | null): string {
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

export function buildHelpContext(input: ExerciseHelpInput, reference?: string | null): string {
  const lines: string[] = [];
  lines.push(`Soal: ${input.prompt}`);
  if (input.latex) lines.push(`LaTeX: ${input.latex}`);
  lines.push(`Tipe soal: ${input.type ?? "numeric"}`);
  lines.push(`Jawaban benar (fakta, jangan diubah): ${input.expectedAnswer}`);
  lines.push(`Pembahasan inti dari bank soal (fakta, jangan diubah): ${input.explanation}`);
  if (reference && reference.trim().length > 0) {
    lines.push(
      "REFERENSI MATERI KULIAH (pakai istilah & pendekatan sesuai ini, jangan mengarang di luar referensi):",
      reference.trim(),
    );
  }
  return lines.join("\n");
}

/* ---------- Parsing & retry ---------- */

/** Ambil objek JSON pertama walau model menambah teks pembungkus. */
export function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

interface RawExplain {
  explanation?: unknown;
  keyPoints?: unknown;
}

/** Parse payload {explanation, keyPoints} dari teks respons model. */
export function parseExplainPayload(
  text: string | undefined,
  tag: string,
): { explanation: string; keyPoints: string[] } | null {
  if (!text) {
    console.warn(`[ai] respons ${tag} kosong`);
    return null;
  }
  const json = extractJson(text);
  if (!json) {
    console.warn(`[ai] tidak ada objek JSON pada respons ${tag}`);
    return null;
  }
  let data: RawExplain;
  try {
    data = JSON.parse(json) as RawExplain;
  } catch {
    console.warn(`[ai] gagal parse JSON ${tag}:`, json.slice(0, 200));
    return null;
  }
  const explanation = typeof data.explanation === "string" ? data.explanation.trim() : "";
  if (!explanation) return null;
  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  return { explanation, keyPoints };
}

/** Status HTTP yang layak dicoba ulang (overload / rate limit sesaat). */
export function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 408 || status === 500 || status === 502 || status === 503;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
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

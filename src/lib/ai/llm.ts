/* =========================================================
   Dispatcher mesin bahasa (LLM teks) untuk explainer & bantuan
   latihan. Memilih provider sesuai AIConfig.provider (panel Admin),
   dengan fallback env AI_TEXT_PROVIDER.
   - Gemini: teks + vision + embedding
   - Groq: teks saja (gratis, kuota lebih lega)
   Proxy lain (OCR/embedding) tetap memakai Gemini.
   ========================================================= */
import { geminiExerciseHelp, geminiExplainAnalysis, isAIConfigured } from "@/lib/ai/gemini";
import { groqExerciseHelp, groqExplainAnalysis, isGroqConfigured } from "@/lib/ai/groq";
import type { AIExerciseHelpResult, AIExplainResult, ExerciseHelpInput } from "@/lib/ai/shared";
import type { AIConfig, AIProvider, FormulaAnalysis } from "@/lib/types";

/** Tentukan provider teks dari config (kolom provider) atau env. */
export function resolveProvider(config: AIConfig | null): AIProvider {
  if (config?.provider === "groq") return "groq";
  if (config?.provider === "gemini") return "gemini";
  const env = (process.env.AI_TEXT_PROVIDER ?? "").trim().toLowerCase();
  return env === "groq" ? "groq" : "gemini";
}

/** True bila provider teks terpilih sudah punya API key. */
export function isTextAIReady(config: AIConfig | null): boolean {
  return resolveProvider(config) === "groq" ? isGroqConfigured() : isAIConfigured();
}

/** Narasi langkah explainer memakai provider terpilih. */
export async function explainAnalysis(
  analysis: FormulaAnalysis,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExplainResult | null> {
  return resolveProvider(config) === "groq"
    ? groqExplainAnalysis(analysis, config, reference)
    : geminiExplainAnalysis(analysis, config, reference);
}

/** Hint/pembahasan latihan memakai provider terpilih. */
export async function exerciseHelp(
  input: ExerciseHelpInput,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExerciseHelpResult | null> {
  return resolveProvider(config) === "groq"
    ? groqExerciseHelp(input, config, reference)
    : geminiExerciseHelp(input, config, reference);
}

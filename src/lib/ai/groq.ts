/* =========================================================
   Lapisan AI — adapter Groq (server-only, API kompatibel OpenAI)
   - explainer & bantuan latihan (teks) saja.
   - Groq tidak menyediakan embedding/vision → itu tetap di Gemini.
   - Mode aman: tanpa GROQ_API_KEY, kembalikan null (fallback deterministik).
   ========================================================= */
import { AI_MODELS, defaultModelFor } from "@/lib/ai/models";
import {
  type AIExerciseHelpResult,
  type AIExplainResult,
  BASE_SYSTEM,
  buildContext,
  buildHelpContext,
  clamp,
  EXPLAIN_SYSTEM,
  type ExerciseHelpInput,
  HINT_SYSTEM,
  parseExplainPayload,
  withRetry,
} from "@/lib/ai/shared";
import type { AIConfig, FormulaAnalysis } from "@/lib/types";

const DEFAULT_MODEL = defaultModelFor("groq");
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function apiKey(): string {
  return (process.env.GROQ_API_KEY ?? "").trim();
}

/** True bila API key Groq tersedia di lingkungan server. */
export function isGroqConfigured(): boolean {
  return apiKey().length > 0;
}

/** Hanya pakai nama model Groq yang berasal dari daftar resmi. */
function resolveModel(configModel?: string | null): string {
  if (configModel && AI_MODELS.groq.includes(configModel)) return configModel;
  return DEFAULT_MODEL;
}

const JSON_INSTRUCTION =
  'Balas HANYA dengan JSON valid berbentuk {"explanation": string, "keyPoints": string[]} tanpa teks lain.';

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function chatJson(
  system: string,
  user: string,
  config: AIConfig | null,
): Promise<string | undefined> {
  const response = await withRetry(async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel(config?.model),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: clamp(config?.temperature ?? 0.4, 0, 2),
        max_tokens: clamp(config?.maxTokens ?? 2048, 256, 8192),
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = new Error(`Groq HTTP ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res;
  });
  const data = (await response.json()) as GroqChatResponse;
  return data.choices?.[0]?.message?.content;
}

/**
 * Minta penjelasan konseptual dari Groq berdasarkan hasil parser.
 * Mengembalikan null bila Groq tidak dikonfigurasi; melempar error bila gagal.
 */
export async function groqExplainAnalysis(
  analysis: FormulaAnalysis,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExplainResult | null> {
  if (!isGroqConfigured()) return null;

  const model = resolveModel(config?.model);
  const system = [BASE_SYSTEM, JSON_INSTRUCTION, config?.systemPrompt?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const text = await chatJson(system, buildContext(analysis, reference), config);
  const parsed = parseExplainPayload(text, "Groq");
  if (!parsed) return null;
  return { explanation: parsed.explanation, keyPoints: parsed.keyPoints, model };
}

/** Petunjuk/pembahasan latihan via Groq. Null bila tidak dikonfigurasi. */
export async function groqExerciseHelp(
  input: ExerciseHelpInput,
  config: AIConfig | null,
  reference?: string | null,
): Promise<AIExerciseHelpResult | null> {
  if (!isGroqConfigured()) return null;

  const model = resolveModel(config?.model);
  const base = input.mode === "hint" ? HINT_SYSTEM : EXPLAIN_SYSTEM;
  const system = [base, JSON_INSTRUCTION, config?.systemPrompt?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const text = await chatJson(system, buildHelpContext(input, reference), config);
  const parsed = parseExplainPayload(text, "Groq");
  if (!parsed) return null;
  return { text: parsed.explanation, keyPoints: parsed.keyPoints, model };
}

/* =========================================================
   Registri provider & model LLM (aman untuk klien maupun server).
   Dipakai panel Admin untuk memilih mesin bahasa, dan oleh
   adapter ai/gemini.ts & ai/groq.ts untuk validasi nama model.
   ========================================================= */
import type { AIProvider } from "@/lib/types";

export const AI_PROVIDERS: readonly AIProvider[] = ["gemini", "groq"];

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: "Google Gemini",
  groq: "Groq (gratis)",
};

/** Model yang boleh dipakai per provider (urutan pertama = default). */
export const AI_MODELS: Record<AIProvider, readonly string[]> = {
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.1-8b-instant"],
};

/** Model default sebuah provider. */
export function defaultModelFor(provider: AIProvider): string {
  return AI_MODELS[provider][0];
}

/** True bila nama model termasuk daftar resmi provider tersebut. */
export function isModelForProvider(provider: AIProvider, model: string): boolean {
  return AI_MODELS[provider].includes(model);
}

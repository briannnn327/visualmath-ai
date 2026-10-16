import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exerciseHelp, isTextAIReady, resolveProvider } from "@/lib/ai/llm";
import type { AIConfig } from "@/lib/types";

const GEMINI_KEY = "GOOGLE_GENERATIVE_AI_API_KEY";
const GROQ_KEY = "GROQ_API_KEY";
const ENV_KEY = "AI_TEXT_PROVIDER";

let prevGemini: string | undefined;
let prevGroq: string | undefined;
let prevEnv: string | undefined;

function config(provider: "gemini" | "groq"): AIConfig {
  return {
    id: "cfg-1" as AIConfig["id"],
    provider,
    model: provider === "groq" ? "openai/gpt-oss-120b" : "gemini-3.8-flash",
    temperature: 0.4,
    maxTokens: 1024,
    features: { stepExplain: true, adaptiveQuiz: true, graphSimulation: true },
    systemPrompt: "Panduan sistem uji.",
    updatedAt: new Date().toISOString(),
  };
}

describe("llm — pemilihan provider teks", () => {
  beforeEach(() => {
    prevGemini = process.env[GEMINI_KEY];
    prevGroq = process.env[GROQ_KEY];
    prevEnv = process.env[ENV_KEY];
    delete process.env[GEMINI_KEY];
    delete process.env[GROQ_KEY];
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    const restore: Array<[string, string | undefined]> = [
      [GEMINI_KEY, prevGemini],
      [GROQ_KEY, prevGroq],
      [ENV_KEY, prevEnv],
    ];
    for (const [key, value] of restore) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("memakai config.provider bila diisi", () => {
    expect(resolveProvider(config("groq"))).toBe("groq");
    expect(resolveProvider(config("gemini"))).toBe("gemini");
  });

  it("jatuh ke env AI_TEXT_PROVIDER bila config null", () => {
    process.env[ENV_KEY] = "groq";
    expect(resolveProvider(null)).toBe("groq");
    delete process.env[ENV_KEY];
    expect(resolveProvider(null)).toBe("gemini");
  });

  it("isTextAIReady mengikuti API key provider terpilih", () => {
    expect(isTextAIReady(config("groq"))).toBe(false);
    process.env[GROQ_KEY] = "dummy";
    expect(isTextAIReady(config("groq"))).toBe(true);
    delete process.env[GROQ_KEY];

    expect(isTextAIReady(config("gemini"))).toBe(false);
    process.env[GEMINI_KEY] = "dummy";
    expect(isTextAIReady(config("gemini"))).toBe(true);
  });

  it("exerciseHelp mengembalikan null bila provider Groq tanpa API key", async () => {
    const result = await exerciseHelp(
      { mode: "hint", prompt: "x^2", expectedAnswer: "2*x", explanation: "aturan pangkat" },
      config("groq"),
    );
    expect(result).toBeNull();
  });

  it("exerciseHelp mengembalikan null bila provider Gemini tanpa API key", async () => {
    const result = await exerciseHelp(
      { mode: "explain", prompt: "x^2", expectedAnswer: "2*x", explanation: "aturan pangkat" },
      config("gemini"),
    );
    expect(result).toBeNull();
  });
});

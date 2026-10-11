import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exerciseHelp, isAIConfigured } from "@/lib/ai/gemini";

const KEY = "GOOGLE_GENERATIVE_AI_API_KEY";
const ALT = "GEMINI_API_KEY";

let prevKey: string | undefined;
let prevAlt: string | undefined;

describe("gemini — konfigurasi & fallback", () => {
  beforeEach(() => {
    prevKey = process.env[KEY];
    prevAlt = process.env[ALT];
    delete process.env[KEY];
    delete process.env[ALT];
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env[KEY];
    else process.env[KEY] = prevKey;
    if (prevAlt === undefined) delete process.env[ALT];
    else process.env[ALT] = prevAlt;
  });

  it("menganggap AI tidak dikonfigurasi bila kedua variabel kosong", () => {
    expect(isAIConfigured()).toBe(false);
  });

  it("mengenali GOOGLE_GENERATIVE_AI_API_KEY", () => {
    process.env[KEY] = "dummy-key";
    expect(isAIConfigured()).toBe(true);
  });

  it("mengenali fallback GEMINI_API_KEY", () => {
    process.env[ALT] = "dummy-key";
    expect(isAIConfigured()).toBe(true);
  });

  it("exerciseHelp mengembalikan null tanpa API key (tanpa panggilan jaringan)", async () => {
    const result = await exerciseHelp(
      {
        mode: "hint",
        prompt: "Turunkan f(x) = x^2",
        expectedAnswer: "2*x",
        explanation: "Gunakan aturan pangkat.",
      },
      null,
    );
    expect(result).toBeNull();
  });
});

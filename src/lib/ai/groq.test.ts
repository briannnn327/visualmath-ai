import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { groqExerciseHelp, isGroqConfigured } from "@/lib/ai/groq";

const KEY = "GROQ_API_KEY";
let prev: string | undefined;

describe("groq — konfigurasi & fallback", () => {
  beforeEach(() => {
    prev = process.env[KEY];
    delete process.env[KEY];
  });

  afterEach(() => {
    if (prev === undefined) delete process.env[KEY];
    else process.env[KEY] = prev;
  });

  it("menganggap Groq tidak dikonfigurasi tanpa GROQ_API_KEY", () => {
    expect(isGroqConfigured()).toBe(false);
  });

  it("mengenali GROQ_API_KEY", () => {
    process.env[KEY] = "dummy-key";
    expect(isGroqConfigured()).toBe(true);
  });

  it("groqExerciseHelp mengembalikan null tanpa API key (tanpa panggilan jaringan)", async () => {
    const result = await groqExerciseHelp(
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

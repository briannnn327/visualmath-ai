import { describe, expect, it } from "vitest";
import {
  ApiValidationError,
  exerciseAnswerSchema,
  formulaInputSchema,
  materialSchema,
  parseBody,
  scanInputSchema,
} from "@/lib/schemas";

describe("schemas — validasi input", () => {
  it("menerima ekspresi formula yang valid", () => {
    const parsed = formulaInputSchema.parse({ expression: "3*x^2 + 2*x - 1" });
    expect(parsed.expression).toBe("3*x^2 + 2*x - 1");
    expect(parsed.variable).toBe("x");
  });

  it("menolak karakter ekspresi yang tidak diizinkan", () => {
    expect(formulaInputSchema.safeParse({ expression: "x#2" }).success).toBe(false);
  });

  it("menerima data URL gambar pada scan", () => {
    const img = `data:image/png;base64,${"A".repeat(40)}`;
    expect(scanInputSchema.safeParse({ image: img }).success).toBe(true);
  });

  it("menolak scan yang bukan data URL gambar", () => {
    expect(scanInputSchema.safeParse({ image: "https://contoh/gambar.png" }).success).toBe(false);
  });

  it("membatasi jawaban latihan maksimal 200 karakter", () => {
    const base = { questionId: "q1", topicId: "t1", sessionId: "sesi-1234" };
    expect(exerciseAnswerSchema.safeParse({ ...base, answer: "ok" }).success).toBe(true);
    expect(exerciseAnswerSchema.safeParse({ ...base, answer: "ok", sessionId: "" }).success).toBe(
      false,
    );
    expect(exerciseAnswerSchema.safeParse({ ...base, answer: "a".repeat(201) }).success).toBe(
      false,
    );
    expect(exerciseAnswerSchema.safeParse({ ...base, answer: "ok", timeMs: -1 }).success).toBe(
      false,
    );
  });

  it("menolak materi dengan judul/konten terlalu pendek", () => {
    const valid = {
      kelasId: "k1",
      topicId: "t1",
      type: "materi" as const,
      title: "Turunan",
      content: "Isi materi yang cukup panjang.",
    };
    expect(materialSchema.safeParse(valid).success).toBe(true);
    expect(materialSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(materialSchema.safeParse({ ...valid, content: "pendek" }).success).toBe(false);
  });

  it("parseBody melempar ApiValidationError dengan pesan isu pertama", () => {
    expect(() => parseBody({ expression: "" }, formulaInputSchema)).toThrow(ApiValidationError);
  });
});

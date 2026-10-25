import { describe, expect, it } from "vitest";
import {
  answerMatches,
  NUMERIC_TOLERANCE,
  numericAnswersMatch,
  parseNumberList,
} from "@/lib/math/answer";

describe("answer — pencocokan jawaban", () => {
  it("menerima angka tunggal dengan toleransi", () => {
    expect(numericAnswersMatch("6.4031", "6.4031")).toBe(true);
    expect(numericAnswersMatch("6,4031", "6.4031")).toBe(true);
    expect(numericAnswersMatch("6.4", "6.4031")).toBe(true);
    expect(numericAnswersMatch("6.5", "6.4031")).toBe(false);
    expect(NUMERIC_TOLERANCE).toBeGreaterThan(0);
  });

  it("menerima vektor dengan pemisah titik koma, koma, atau spasi", () => {
    expect(numericAnswersMatch("2;1", "2;1")).toBe(true);
    expect(numericAnswersMatch("2, 1", "2;1")).toBe(true);
    expect(numericAnswersMatch("2 1", "2;1")).toBe(true);
    expect(numericAnswersMatch("2;1.2", "2;1")).toBe(false);
    expect(numericAnswersMatch("2", "2;1")).toBe(false);
  });

  it("menolak nilai yang bukan angka", () => {
    expect(numericAnswersMatch("abc", "1")).toBe(false);
    expect(parseNumberList("abc;1")).toBeNull();
    expect(parseNumberList("1")).toBeNull();
    expect(parseNumberList("1, 2", false)).toBeNull();
  });

  it("mencocokkan tipe pilihan secara case-insensitive", () => {
    expect(answerMatches("choice", " x ", "X")).toBe(true);
    expect(answerMatches("truefalse", "Benar", "benar")).toBe(true);
    expect(answerMatches("choice", "salah", "benar")).toBe(false);
  });

  it("memakai pencocokan numerik untuk tipe numeric", () => {
    expect(answerMatches("numeric", "3,14", "3.14")).toBe(true);
    expect(answerMatches("numeric", "3,2", "3.14")).toBe(false);
  });
});

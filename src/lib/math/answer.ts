/* =========================================================
   Pencocokan jawaban latihan.
   - Numerik tunggal: toleransi absolut (default 0.05), koma desimal diterima.
   - Vektor/daftar: pemisah `;`, koma, atau spasi (contoh "2;1" vs "2, 1").
   ========================================================= */
import type { QuestionType } from "@/lib/types";

export const NUMERIC_TOLERANCE = 0.05;

/** Pecah daftar angka. Pemisah koma hanya dipakai untuk jawaban pengguna. */
export function parseNumberList(input: string, allowComma = true): number[] | null {
  const pattern = allowComma ? /[;,\s]+/ : /[;\s]+/;
  const parts = input
    .trim()
    .split(pattern)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) ? numbers : null;
}

function parseSingle(input: string): number {
  return Number(input.trim().replace(/,/g, "."));
}

/** Cocokkan jawaban numerik, termasuk jawaban berbentuk daftar/vektor. */
export function numericAnswersMatch(
  userAnswer: string,
  expectedAnswer: string,
  tolerance = NUMERIC_TOLERANCE,
): boolean {
  const expectedList = parseNumberList(expectedAnswer, false);
  const userList = parseNumberList(userAnswer);
  if (expectedList && userList && expectedList.length === userList.length) {
    return expectedList.every((expected, i) => Math.abs(expected - userList[i]) <= tolerance);
  }

  const user = parseSingle(userAnswer);
  const expected = parseSingle(expectedAnswer);
  return (
    Number.isFinite(user) && Number.isFinite(expected) && Math.abs(user - expected) <= tolerance
  );
}

/** Cocokkan jawaban sesuai tipe soal. */
export function answerMatches(
  type: QuestionType,
  userAnswer: string,
  expectedAnswer: string,
): boolean {
  if (type === "numeric") return numericAnswersMatch(userAnswer, expectedAnswer);
  return userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
}

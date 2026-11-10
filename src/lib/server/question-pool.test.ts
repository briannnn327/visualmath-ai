import { describe, expect, it } from "vitest";
import type { Difficulty } from "@/lib/types";
import { questions } from "../../../prisma/questions";
import { questionCandidates } from "./question-pool";

const DIFFICULTIES: Difficulty[] = ["mudah", "sedang", "sulit"];

/** 15 soal per topik: 5 mudah, 5 sedang, 5 sulit. */
function bankFor(topicId: string) {
  return Array.from({ length: 15 }, (_, i) => ({
    id: `q-${topicId}-${i + 1}`,
    topicId,
    difficulty: DIFFICULTIES[Math.floor(i / 5)],
  }));
}

describe("questionCandidates", () => {
  const bank = bankFor("t0");

  it("mengutamakan soal unseen pada level saat ini", () => {
    const result = questionCandidates(bank, {
      topicId: "t0",
      difficulty: "mudah",
      excluded: new Set(["q-t0-1"]),
    });
    expect(result).toHaveLength(4);
    expect(result.every((q) => q.difficulty === "mudah")).toBe(true);
    expect(result.some((q) => q.id === "q-t0-1")).toBe(false);
  });

  it("jatuh ke level lain di topik yang sama saat level kini habis", () => {
    const excluded = new Set(bank.slice(0, 5).map((q) => q.id));
    const result = questionCandidates(bank, {
      topicId: "t0",
      difficulty: "mudah",
      excluded,
    });
    expect(result).toHaveLength(10);
    expect(result.every((q) => q.difficulty !== "mudah")).toBe(true);
  });

  it("menghasilkan 15 soal unik berturut-turut meski level tidak berubah", () => {
    const excluded = new Set<string>();
    const picked: string[] = [];

    for (let i = 0; i < 15; i += 1) {
      const candidates = questionCandidates(bank, {
        topicId: "t0",
        difficulty: "mudah",
        excluded,
      });
      expect(candidates.length).toBeGreaterThan(0);
      const chosen = candidates[0];
      expect(excluded.has(chosen.id)).toBe(false);
      excluded.add(chosen.id);
      picked.push(chosen.id);
    }

    expect(new Set(picked).size).toBe(15);
  });

  it("mengizinkan pengulangan hanya setelah seluruh topik habis", () => {
    const excluded = new Set(bank.map((q) => q.id));
    const result = questionCandidates(bank, {
      topicId: "t0",
      difficulty: "mudah",
      excluded,
    });
    expect(result).toHaveLength(5);
    expect(result.every((q) => q.difficulty === "mudah")).toBe(true);
  });

  it("tidak mencampur soal dari topik lain", () => {
    const mixed = [...bank, ...bankFor("t1")];
    const result = questionCandidates(mixed, {
      topicId: "t0",
      difficulty: "mudah",
      excluded: new Set(),
    });
    expect(result.every((q) => q.topicId === "t0")).toBe(true);
  });

  it("mengembalikan kosong bila topik tidak punya soal", () => {
    const result = questionCandidates(bank, {
      topicId: "t9",
      difficulty: "mudah",
      excluded: new Set(),
    });
    expect(result).toEqual([]);
  });

  it("bank soal nyata: setiap topik menghasilkan 15 soal unik", () => {
    for (const topicId of ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"]) {
      const excluded = new Set<string>();
      const picked = new Set<string>();

      for (let i = 0; i < 15; i += 1) {
        const candidates = questionCandidates(questions, {
          topicId,
          difficulty: "mudah",
          excluded,
        });
        expect(candidates.length).toBeGreaterThan(0);
        const chosen = candidates[0];
        expect(excluded.has(chosen.id)).toBe(false);
        excluded.add(chosen.id);
        picked.add(chosen.id);
      }

      expect(picked.size, `topik ${topicId}`).toBe(15);
    }
  });
});

/* =========================================================
   Sesi latihan adaptif (Zustand) — aktifkan soal, catat hasil
   ========================================================= */

import { create } from "zustand";
import type { Difficulty } from "@/lib/types";

interface ExerciseState {
  active: boolean;
  topicId: string | null;
  topicTitle: string;
  difficulty: Difficulty;
  total: number;
  correct: number;
  xp: number;
  start: (input: { topicId: string; topicTitle: string }) => void;
  record: (correct: boolean, xpEarned: number, nextDifficulty: Difficulty) => void;
  reset: () => void;
}

export const useExerciseStore = create<ExerciseState>((set) => ({
  active: false,
  topicId: null,
  topicTitle: "",
  difficulty: "mudah",
  total: 0,
  correct: 0,
  xp: 0,

  start: ({ topicId, topicTitle }) =>
    set({
      active: true,
      topicId,
      topicTitle,
      difficulty: "mudah",
      total: 0,
      correct: 0,
      xp: 0,
    }),

  record: (correct, xpEarned, nextDifficulty) =>
    set((s) => ({
      total: s.total + 1,
      correct: s.correct + (correct ? 1 : 0),
      xp: s.xp + xpEarned,
      difficulty: nextDifficulty,
    })),

  reset: () =>
    set({
      active: false,
      topicId: null,
      topicTitle: "",
      difficulty: "mudah",
      total: 0,
      correct: 0,
      xp: 0,
    }),
}));

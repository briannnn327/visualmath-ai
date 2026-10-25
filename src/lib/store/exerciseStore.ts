/* =========================================================
   Sesi latihan adaptif (Zustand + persist).
   - Bertahan setelah refresh (localStorage) agar progres tidak hilang.
   - Menyimpan daftar soal yang sudah dijawab untuk mencegah pengulangan.
   - Menyimpan waktu mulai sesi & soal untuk timer yang nyata.
   ========================================================= */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Difficulty } from "@/lib/types";
import { uid } from "@/lib/utils";

/** Sesi lebih lama dari ini dianggap kedaluwarsa saat halaman dibuka lagi. */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

/** Sesi tanpa waktu mulai atau lebih tua dari TTL dianggap kedaluwarsa. */
export function isSessionExpired(startedAt: string | null, now = Date.now()): boolean {
  if (!startedAt) return true;
  return now - new Date(startedAt).getTime() > SESSION_TTL_MS;
}

export interface ExerciseState {
  active: boolean;
  topicId: string | null;
  topicTitle: string;
  difficulty: Difficulty;
  total: number;
  correct: number;
  xp: number;
  /** ID sesi yang dipakai server untuk rekap & anti-farming. */
  sessionId: string | null;
  startedAt: string | null;
  questionStartedAt: string | null;
  answeredQuestionIds: string[];
  hydrated: boolean;
  start: (input: { topicId: string; topicTitle: string }) => void;
  record: (input: {
    questionId: string;
    correct: boolean;
    xpEarned: number;
    nextDifficulty: Difficulty;
  }) => void;
  markHydrated: () => void;
  reset: () => void;
}

const emptySession = {
  active: false,
  topicId: null,
  topicTitle: "",
  difficulty: "mudah" as Difficulty,
  total: 0,
  correct: 0,
  xp: 0,
  sessionId: null,
  startedAt: null,
  questionStartedAt: null,
  answeredQuestionIds: [] as string[],
};

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      ...emptySession,
      hydrated: false,

      start: ({ topicId, topicTitle }) => {
        const now = new Date().toISOString();
        set({
          active: true,
          topicId,
          topicTitle,
          difficulty: "mudah",
          total: 0,
          correct: 0,
          xp: 0,
          sessionId: uid("ex-"),
          startedAt: now,
          questionStartedAt: now,
          answeredQuestionIds: [],
          hydrated: true,
        });
      },

      record: ({ questionId, correct, xpEarned, nextDifficulty }) =>
        set((s) => ({
          total: s.total + 1,
          correct: s.correct + (correct ? 1 : 0),
          xp: s.xp + xpEarned,
          difficulty: nextDifficulty,
          questionStartedAt: new Date().toISOString(),
          answeredQuestionIds: s.answeredQuestionIds.includes(questionId)
            ? s.answeredQuestionIds
            : [...s.answeredQuestionIds, questionId].slice(-60),
        })),

      markHydrated: () => set({ hydrated: true }),

      reset: () => set({ ...emptySession, hydrated: true }),
    }),
    {
      name: "vma-exercise-session",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.active && isSessionExpired(state.startedAt)) {
          state.reset();
          return;
        }
        state.markHydrated();
      },
    },
  ),
);

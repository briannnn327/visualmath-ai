// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { isSessionExpired, SESSION_TTL_MS, useExerciseStore } from "@/lib/store/exerciseStore";

describe("exerciseStore — sesi latihan", () => {
  beforeEach(() => {
    useExerciseStore.getState().reset();
    localStorage.clear();
  });

  it("memulai sesi dengan ID & waktu", () => {
    useExerciseStore.getState().start({ topicId: "t-1", topicTitle: "Turunan" });
    const state = useExerciseStore.getState();
    expect(state.active).toBe(true);
    expect(state.topicId).toBe("t-1");
    expect(state.difficulty).toBe("mudah");
    expect(state.sessionId).toMatch(/^ex-/);
    expect(state.startedAt).toBeTruthy();
    expect(state.answeredQuestionIds).toEqual([]);
    expect(state.hydrated).toBe(true);
  });

  it("mencatat hasil, XP, kesulitan, dan soal yang sudah dijawab", () => {
    useExerciseStore.getState().start({ topicId: "t-1", topicTitle: "Turunan" });
    useExerciseStore.getState().record({
      questionId: "q-1",
      correct: true,
      xpEarned: 25,
      nextDifficulty: "sedang",
    });
    let state = useExerciseStore.getState();
    expect(state.total).toBe(1);
    expect(state.correct).toBe(1);
    expect(state.xp).toBe(25);
    expect(state.difficulty).toBe("sedang");
    expect(state.answeredQuestionIds).toEqual(["q-1"]);

    useExerciseStore.getState().record({
      questionId: "q-1",
      correct: false,
      xpEarned: 0,
      nextDifficulty: "mudah",
    });
    state = useExerciseStore.getState();
    expect(state.total).toBe(2);
    expect(state.correct).toBe(1);
    expect(state.answeredQuestionIds).toEqual(["q-1"]);
  });

  it("membatasi daftar soal yang disimpan", () => {
    useExerciseStore.getState().start({ topicId: "t-1", topicTitle: "Turunan" });
    for (let i = 0; i < 65; i++) {
      useExerciseStore.getState().record({
        questionId: `q-${i}`,
        correct: i % 2 === 0,
        xpEarned: 1,
        nextDifficulty: "mudah",
      });
    }
    expect(useExerciseStore.getState().answeredQuestionIds).toHaveLength(60);
  });

  it("reset mengosongkan sesi", () => {
    useExerciseStore.getState().start({ topicId: "t-1", topicTitle: "Turunan" });
    useExerciseStore.getState().reset();
    const state = useExerciseStore.getState();
    expect(state.active).toBe(false);
    expect(state.topicId).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.hydrated).toBe(true);
  });

  it("mendeteksi sesi kedaluwarsa", () => {
    const now = Date.now();
    expect(isSessionExpired(null, now)).toBe(true);
    expect(isSessionExpired(new Date(now).toISOString(), now)).toBe(false);
    expect(isSessionExpired(new Date(now - SESSION_TTL_MS - 1).toISOString(), now)).toBe(true);
  });

  it("dapat menyimpan & memuat ulang state", async () => {
    useExerciseStore.getState().start({ topicId: "t-9", topicTitle: "Integral" });
    useExerciseStore.getState().record({
      questionId: "q-9",
      correct: true,
      xpEarned: 10,
      nextDifficulty: "sedang",
    });
    await useExerciseStore.persist.rehydrate();
    expect(useExerciseStore.getState().topicId).toBe("t-9");
    expect(useExerciseStore.getState().total).toBe(1);
    expect(useExerciseStore.getState().answeredQuestionIds).toEqual(["q-9"]);
  });
});

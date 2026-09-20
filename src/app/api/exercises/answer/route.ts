import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db, ensureSeeded, progressOf, upsertProgress } from "@/lib/db/store";
import { difficultyPoint, exerciseAnswerSchema } from "@/lib/schemas";
import { apiUser, badRequest, notFound, unauthorized } from "@/lib/server/api-auth";
import type { AnswerResult, Difficulty, Progress, UserId } from "@/lib/types";

const DIFF_ORDER: Difficulty[] = ["mudah", "sedang", "sulit"];

function nextDifficulty(d: Difficulty, correct: boolean, adaptive: boolean): Difficulty {
  if (!adaptive) return d;
  const idx = DIFF_ORDER.indexOf(d);
  return correct ? DIFF_ORDER[Math.min(idx + 1, 2)] : DIFF_ORDER[Math.max(idx - 1, 0)];
}

export async function POST(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = exerciseAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data jawaban tidak valid");
  }

  const question = db.questions.find(
    (q) => q.id === parsed.data.questionId && q.topicId === parsed.data.topicId,
  );
  if (!question) return notFound("Soal tidak ditemukan");

  /* Periksa jawaban */
  let correct = false;
  const userAnswer = parsed.data.answer.trim();
  if (question.type === "numeric") {
    const a = Number(userAnswer.replace(/,/g, "."));
    const e = Number(question.expectedAnswer);
    if (Number.isFinite(a) && Number.isFinite(e)) correct = Math.abs(a - e) <= 0.05;
  } else {
    correct = userAnswer.toLowerCase() === question.expectedAnswer.trim().toLowerCase();
  }

  const cfg = db.aiConfig;
  const adaptive = cfg?.features.adaptiveQuiz ?? true;

  const xpEarned = correct ? difficultyPoint[question.difficulty] : 0;

  /* Update progres mastery & XP */
  const prev = progressOf(user.id, question.topicId);
  const masteryDelta = correct
    ? question.difficulty === "mudah"
      ? 8
      : question.difficulty === "sedang"
        ? 10
        : 14
    : -8;
  const next = prev ?? ({} as Partial<Progress>);
  const mastery = Math.max(0, Math.min(100, (next.mastery ?? 0) + masteryDelta));

  const updated: Progress = {
    userId: user.id as UserId,
    topicId: question.topicId,
    mastery,
    attempts: (next.attempts ?? 0) + 1,
    solved: (next.solved ?? 0) + (correct ? 1 : 0),
    xp: (next.xp ?? 0) + xpEarned,
    updatedAt: new Date().toISOString(),
  };
  upsertProgress(updated);

  const result: AnswerResult = {
    questionId: question.id,
    correct,
    expectedAnswer: question.expectedAnswer,
    userAnswer,
    explanation: question.explanation,
    nextDifficulty: nextDifficulty(question.difficulty, correct, adaptive),
    xpEarned,
    mastery,
  };

  return NextResponse.json({ result, mastery });
}

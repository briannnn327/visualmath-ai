import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAIConfig,
  hasCorrectAttempt,
  hasSessionAttempt,
  listQuestions,
  progressOf,
  recordQuestionAttempt,
  upsertProgress,
} from "@/lib/db/store";
import { answerMatches } from "@/lib/math/answer";
import { difficultyPoint, exerciseAnswerSchema } from "@/lib/schemas";
import { apiUser, badRequest, notFound, unauthorized } from "@/lib/server/api-auth";
import type { AnswerResult, Difficulty, Progress, UserId } from "@/lib/types";
import { uid } from "@/lib/utils";

const DIFF_ORDER: Difficulty[] = ["mudah", "sedang", "sulit"];

function nextDifficulty(d: Difficulty, correct: boolean, adaptive: boolean): Difficulty {
  if (!adaptive) return d;
  const idx = DIFF_ORDER.indexOf(d);
  return correct ? DIFF_ORDER[Math.min(idx + 1, 2)] : DIFF_ORDER[Math.max(idx - 1, 0)];
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
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

  const questions = await listQuestions();
  const question = questions.find(
    (q) => q.id === parsed.data.questionId && q.topicId === parsed.data.topicId,
  );
  if (!question) return notFound("Soal tidak ditemukan");

  if (await hasSessionAttempt(parsed.data.sessionId, question.id)) {
    return NextResponse.json({ error: "Soal ini sudah dijawab pada sesi ini" }, { status: 409 });
  }

  /* Periksa jawaban */
  const userAnswer = parsed.data.answer.trim();
  const correct = answerMatches(question.type, userAnswer, question.expectedAnswer);
  const alreadyCorrect = correct && (await hasCorrectAttempt(user.id, question.id));

  const cfg = await getAIConfig();
  const adaptive = cfg?.features.adaptiveQuiz ?? true;

  /* XP hanya diberikan sekali per soal per mahasiswa (anti-farming). */
  const xpEarned =
    correct && !alreadyCorrect ? difficultyPoint[question.difficulty as Difficulty] : 0;

  /* Update progres mastery & XP */
  const prev = await progressOf(user.id, question.topicId);
  const masteryDelta = correct
    ? alreadyCorrect
      ? 0
      : question.difficulty === "mudah"
        ? 8
        : question.difficulty === "sedang"
          ? 10
          : 14
    : -8;
  const p: Progress = prev ?? {
    userId: user.id as UserId,
    topicId: question.topicId,
    mastery: 0,
    attempts: 0,
    solved: 0,
    xp: 0,
    updatedAt: new Date().toISOString(),
  };
  const mastery = Math.max(0, Math.min(100, p.mastery + masteryDelta));

  const updated: Progress = {
    userId: user.id as UserId,
    topicId: question.topicId,
    mastery,
    attempts: p.attempts + 1,
    solved: p.solved + (correct ? 1 : 0),
    xp: p.xp + xpEarned,
    updatedAt: new Date().toISOString(),
  };
  await upsertProgress(updated);
  await recordQuestionAttempt({
    id: uid("qa-"),
    userId: user.id,
    sessionId: parsed.data.sessionId,
    questionId: question.id,
    topicId: question.topicId,
    difficulty: question.difficulty,
    correct,
    xpEarned,
    timeMs: parsed.data.timeMs ?? 0,
  });

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

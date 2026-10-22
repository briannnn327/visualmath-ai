import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTopicById, listQuestions } from "@/lib/db/store";
import { difficultySchema } from "@/lib/schemas";
import { apiUser, unauthorized } from "@/lib/server/api-auth";
import type { Difficulty } from "@/lib/types";
import { randomInt } from "@/lib/utils";

const DIFF_ORDER: Difficulty[] = ["mudah", "sedang", "sulit"];

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const topicId =
    request.nextUrl.searchParams.get("topicId") ?? request.nextUrl.searchParams.get("topic");
  const diffRaw = request.nextUrl.searchParams.get("difficulty") ?? "mudah";
  const diff = difficultySchema.safeParse(diffRaw).success ? (diffRaw as Difficulty) : "mudah";

  const questions = await listQuestions();
  const pool = questions.filter(
    (q) => (!topicId || q.topicId === topicId) && q.difficulty === diff,
  );
  if (pool.length === 0) {
    return NextResponse.json(
      { question: null, error: "Belum ada soal untuk filter ini" },
      { status: 200 },
    );
  }

  const question = pool[randomInt(pool.length)];
  const topic = await getTopicById(question.topicId);
  const { expectedAnswer: _ea, ...safeQuestion } = question;

  return NextResponse.json({
    question: { ...safeQuestion, topicTitle: topic?.title ?? "" },
    difficultyOrder: DIFF_ORDER,
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { difficultySchema } from "@/lib/schemas";
import { db, ensureSeeded, getTopicById } from "@/lib/db/store";
import { apiUser, unauthorized } from "@/lib/server/api-auth";
import type { Difficulty } from "@/lib/types";

const DIFF_ORDER: Difficulty[] = ["mudah", "sedang", "sulit"];

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();

  const topicId = request.nextUrl.searchParams.get("topicId") ?? request.nextUrl.searchParams.get("topic");
  const diffRaw = request.nextUrl.searchParams.get("difficulty") ?? "mudah";
  const diff = difficultySchema.safeParse(diffRaw).success ? (diffRaw as Difficulty) : "mudah";

  const pool = db.questions.filter(
    (q) => (!topicId || q.topicId === topicId) && q.difficulty === diff
  );
  if (pool.length === 0) {
    return NextResponse.json({ question: null, error: "Belum ada soal untuk filter ini" }, { status: 200 });
  }

  const question = pool[Math.floor(Math.random() * pool.length)];
  const topic = getTopicById(question.topicId);
  const safeQuestion: Omit<typeof question, "expectedAnswer"> = { ...question };

  return NextResponse.json({
    question: { ...safeQuestion, topicTitle: topic?.title ?? "" },
    difficultyOrder: DIFF_ORDER,
  });
}
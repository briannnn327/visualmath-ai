import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listQuestions } from "@/lib/db/store";
import { exerciseHelpSchema } from "@/lib/schemas";
import { apiUser, badRequest, notFound, unauthorized } from "@/lib/server/api-auth";
import { helpForQuestion } from "@/lib/server/exercise-ai";

/** Petunjuk (hint) berbasis AI + materi topik, untuk soal latihan. */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = exerciseHelpSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  const questions = await listQuestions();
  const question = questions.find(
    (q) => q.id === parsed.data.questionId && q.topicId === parsed.data.topicId,
  );
  if (!question) return notFound("Soal tidak ditemukan");

  const help = await helpForQuestion(question, "hint");
  return NextResponse.json({ help });
}

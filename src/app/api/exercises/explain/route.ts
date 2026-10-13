import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listQuestions } from "@/lib/db/store";
import { exerciseHelpSchema } from "@/lib/schemas";
import {
  apiUser,
  badRequest,
  notFound,
  tooManyRequests,
  unauthorized,
} from "@/lib/server/api-auth";
import { helpForQuestion } from "@/lib/server/exercise-ai";
import { checkAiRateLimit } from "@/lib/server/rate-limit";

/** Pembahasan (explain) berbasis AI + materi topik, setelah menjawab soal. */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const quota = checkAiRateLimit("help", user.id);
  if (!quota.allowed) {
    return tooManyRequests(
      "Terlalu banyak permintaan bantuan. Coba lagi nanti.",
      quota.retryAfterMs / 1000,
    );
  }

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

  const help = await helpForQuestion(question, "explain");
  return NextResponse.json({ help });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createQuestion, deleteQuestion, listQuestions, updateQuestion } from "@/lib/db/store";
import { type QuestionAdminInput, questionAdminSchema } from "@/lib/schemas";
import { apiUser, badRequest, forbidden, unauthorized } from "@/lib/server/api-auth";
import type { Difficulty, QuestionType } from "@/lib/types";
import { uid } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "dosen") return forbidden();

  const topicId = request.nextUrl.searchParams.get("topicId");
  const all = await listQuestions();
  const questions = topicId ? all.filter((q) => q.topicId === topicId) : all;
  return NextResponse.json({ questions });
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const parsed = questionAdminSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data soal tidak valid");
  }
  const input: QuestionAdminInput = parsed.data;
  const question = await createQuestion({
    id: uid("q-"),
    topicId: input.topicId,
    difficulty: input.difficulty,
    type: input.type,
    prompt: input.prompt,
    latex: input.latex ?? null,
    options: input.options ?? [],
    expectedAnswer: input.expectedAnswer,
    explanation: input.explanation,
    hint: input.hint ?? null,
  });
  return NextResponse.json({ question }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const id = (body as { id?: string })?.id;
  if (!id) return badRequest("ID soal wajib diisi");
  const parsed = questionAdminSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data soal tidak valid");
  }
  const input = parsed.data;
  const question = await updateQuestion(id, {
    topicId: input.topicId,
    difficulty: input.difficulty as Difficulty,
    type: input.type as QuestionType,
    prompt: input.prompt,
    latex: input.latex ?? null,
    options: input.options ?? [],
    expectedAnswer: input.expectedAnswer,
    explanation: input.explanation,
    hint: input.hint ?? null,
  });
  return NextResponse.json({ question });
}

export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const id = (body as { id?: string })?.id;
  if (!id) return badRequest("ID soal wajib diisi");
  await deleteQuestion(id);
  return NextResponse.json({ ok: true });
}

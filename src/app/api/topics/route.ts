import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createTopic, deleteTopic, listQuestions, listTopics, updateTopic } from "@/lib/db/store";
import { type TopicAdminInput, topicAdminSchema } from "@/lib/schemas";
import { apiUser, badRequest, forbidden, notFound, unauthorized } from "@/lib/server/api-auth";
import { uid } from "@/lib/utils";

export async function GET(_request: NextRequest) {
  const user = await apiUser(_request);
  if (!user) return unauthorized();

  const [topics, questions] = await Promise.all([listTopics(), listQuestions()]);
  const result = topics
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      const counts = {
        mudah: questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "mudah").length,
        sedang: questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "sedang").length,
        sulit: questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "sulit").length,
      };
      return { ...t, counts };
    });

  return NextResponse.json({ topics: result });
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
  const parsed = topicAdminSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data topik tidak valid");
  }
  const input: TopicAdminInput = parsed.data;
  const topic = await createTopic({
    id: uid("t-"),
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    icon: input.icon,
    color: input.color,
    order: input.order,
  });
  return NextResponse.json({ topic }, { status: 201 });
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
  if (!id) return badRequest("ID topik wajib diisi");
  const parsed = topicAdminSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data topik tidak valid");
  }
  const topic = await updateTopic(id, parsed.data);
  if (!topic) return notFound("Topik tidak ditemukan");
  return NextResponse.json({ topic });
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
  if (!id) return badRequest("ID topik wajib diisi");
  await deleteTopic(id);
  return NextResponse.json({ ok: true });
}

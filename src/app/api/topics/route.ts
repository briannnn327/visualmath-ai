import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listQuestions, listTopics } from "@/lib/db/store";
import { apiUser, unauthorized } from "@/lib/server/api-auth";

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

import { NextResponse } from "next/server";
import { ensureSeeded, db } from "@/lib/db/store";
import type { NextRequest } from "next/server";
import { apiUser, unauthorized } from "@/lib/server/api-auth";

export async function GET(_request: NextRequest) {
  ensureSeeded();
  const user = apiUser(_request);
  if (!user) return unauthorized();

  const topics = [...db.topics]
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      const counts = {
        mudah: db.questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "mudah").length,
        sedang: db.questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "sedang").length,
        sulit: db.questions.filter((qs) => qs.topicId === t.id && qs.difficulty === "sulit").length,
      };
      return { ...t, counts };
    });

  return NextResponse.json({ topics });
}
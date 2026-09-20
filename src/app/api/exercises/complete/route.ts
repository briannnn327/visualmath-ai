import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addHistory, ensureSeeded, getTopicById, recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";

const schema = z.object({
  topicId: z.string().min(1),
  total: z.number().int().min(1).max(50),
  correct: z.number().int().min(0).max(50),
  xp: z.number().int().min(0).max(2000),
  finishReason: z.enum(["selesai", "quit"]).optional(),
});

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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data sesi tidak valid");
  }

  const topic = getTopicById(parsed.data.topicId);
  const score = Math.round((parsed.data.correct / parsed.data.total) * 100);

  const rec = addHistory({
    userId: user.id,
    kind: "quiz",
    title: `Kuis adaptif: ${topic?.title ?? "Latihan"}`,
    summary: `Skor ${score} · ${parsed.data.correct} dari ${parsed.data.total} benar · +${parsed.data.xp} XP${parsed.data.finishReason === "quit" ? " (dihentikan)" : ""}.`,
    score,
    xp: parsed.data.xp,
  });

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "quiz.submit",
    target: topic?.title ?? "Latihan",
    severity: "info",
  });

  return NextResponse.json({ history: rec, score });
}

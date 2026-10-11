import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { backfillMaterialEmbeddings, embeddingStatus } from "@/lib/ai/rag";
import { recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, forbidden, unauthorized } from "@/lib/server/api-auth";

/** Status embedding materi (dosen & admin). */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const status = await embeddingStatus();
  return NextResponse.json({ status });
}

/** Hitung ulang embedding materi yang belum ada (dosen & admin). */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const onlyMissing = (body as { onlyMissing?: unknown }).onlyMissing !== false;

  const summary = await backfillMaterialEmbeddings({ onlyMissing });
  if (!summary.aiConfigured) {
    return badRequest("Fitur embedding memerlukan konfigurasi AI (GOOGLE_GENERATIVE_AI_API_KEY).");
  }

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "material.embed",
    target: `${summary.embedded} materi (${summary.processed} diproses)`,
    severity: summary.failed > 0 ? "warning" : "info",
  });

  return NextResponse.json({ summary });
}

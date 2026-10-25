import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { backfillMaterialEmbeddings, embeddingStatus } from "@/lib/ai/rag";
import { recordActivity } from "@/lib/db/store";
import {
  apiUser,
  badRequest,
  forbidden,
  tooManyRequests,
  unauthorized,
} from "@/lib/server/api-auth";
import { materialScope, ragKelasIds } from "@/lib/server/material-scope";
import { checkAiRateLimit } from "@/lib/server/rate-limit";

/** Status embedding materi (dosen & admin), dibatasi ke kelas yang diampu. */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const scope = await materialScope(user);
  const status = await embeddingStatus(ragKelasIds(scope));
  return NextResponse.json({ status });
}

/** Hitung ulang embedding materi yang belum ada (dosen & admin). */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const quota = await checkAiRateLimit("embedding", user.id);
  if (!quota.allowed) {
    return tooManyRequests(
      "Terlalu banyak backfill embedding. Coba lagi nanti.",
      quota.retryAfterMs / 1000,
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const onlyMissing = (body as { onlyMissing?: unknown }).onlyMissing !== false;

  const scope = await materialScope(user);
  const summary = await backfillMaterialEmbeddings({
    onlyMissing,
    kelasIds: ragKelasIds(scope),
  });
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

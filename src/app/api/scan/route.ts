import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAIConfigured, ocrMathImage } from "@/lib/ai/gemini";
import { getAIConfig, listTopics, recordActivity } from "@/lib/db/store";
import { analyzeExpression, ParseError } from "@/lib/math/parser";
import { parseBody, type ScanInput, scanInputSchema } from "@/lib/schemas";
import { apiUser, badRequest, tooManyRequests, unauthorized } from "@/lib/server/api-auth";
import { checkAiRateLimit } from "@/lib/server/rate-limit";

/** Scan foto soal: OCR + deteksi topik memakai Gemini vision. */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const quota = await checkAiRateLimit("scan", user.id);
  if (!quota.allowed) {
    return tooManyRequests("Terlalu banyak scan foto. Coba lagi nanti.", quota.retryAfterMs / 1000);
  }

  if (!isAIConfigured()) {
    return badRequest("Fitur scan foto memerlukan konfigurasi AI (GOOGLE_GENERATIVE_AI_API_KEY).");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  let input: ScanInput;
  try {
    input = parseBody<ScanInput>(body, scanInputSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }

  const [topics, cfg] = await Promise.all([listTopics(), getAIConfig()]);
  const options = topics.map((t) => ({ slug: t.slug, title: t.title, subtitle: t.subtitle }));

  let result: Awaited<ReturnType<typeof ocrMathImage>>;
  try {
    result = await ocrMathImage(input.image, options, cfg);
  } catch (err) {
    console.warn("[scan] OCR gagal:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Gagal memproses gambar. Coba lagi." }, { status: 502 });
  }
  if (!result) {
    return badRequest("Soal tidak dapat dibaca dari gambar. Coba foto yang lebih jelas.");
  }

  const topic = result.topicSlug ? (topics.find((t) => t.slug === result.topicSlug) ?? null) : null;

  let analyzable = false;
  if (result.expression) {
    try {
      analyzeExpression(result.expression, "x");
      analyzable = true;
    } catch (err) {
      analyzable = !(err instanceof ParseError);
    }
  }

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "ai.scan",
    target: result.expression || "gambar",
    severity: "info",
  });

  return NextResponse.json({
    scan: {
      expression: result.expression,
      latex: result.latex,
      note: result.note,
      confidence: result.confidence,
      topicId: topic?.id ?? null,
      topicSlug: topic?.slug ?? null,
      topicTitle: topic?.title ?? null,
      model: result.model,
      analyzable,
    },
  });
}

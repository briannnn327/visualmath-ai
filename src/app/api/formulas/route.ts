import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { explainAnalysis } from "@/lib/ai/llm";
import { buildReference, searchMaterials, toCitations } from "@/lib/ai/rag";
import {
  addHistory,
  createFormula,
  getAIConfig,
  listFormulasByUser,
  recordActivity,
} from "@/lib/db/store";
import { analyzeExpression, ParseError } from "@/lib/math/parser";
import { type FormulaInput, formulaInputSchema } from "@/lib/schemas";
import { apiUser, badRequest, tooManyRequests, unauthorized } from "@/lib/server/api-auth";
import { checkAiRateLimit } from "@/lib/server/rate-limit";
import type { FormulaAnalysis, FormulaRecord } from "@/lib/types";
import { uid } from "@/lib/utils";

function toAnalysis(source: string, variable?: string): FormulaAnalysis {
  const r = analyzeExpression(source, variable ?? "x");
  return {
    source: r.text.normalized,
    normalized: r.text.normalized,
    pretty: r.text.pretty,
    derivativePretty: r.text.derivativePretty,
    segments: r.numbers.segments,
    derivativeSegments: r.numbers.derivativeSegments,
    extrema: r.numbers.extrema.map((e) => ({ kind: e.kind, x: e.x, y: e.y })),
    roots: r.numbers.roots.map((p) => ({ kind: "akar" as const, x: p.x, y: p.y })),
    integral: r.text.integral,
    integralText: r.text.integralText,
    steps: r.text.steps,
    explanation: r.text.explanation,
    rulesUsed: r.text.rulesUsed,
    variable: r.text.variable,
    points: r.numbers.points,
    derivativePoints: r.numbers.derivativePoints,
    explanationSource: "mesin",
  };
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const quota = checkAiRateLimit("formula", user.id);
  if (!quota.allowed) {
    return tooManyRequests(
      "Terlalu banyak analisis formula. Coba lagi nanti.",
      quota.retryAfterMs / 1000,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = formulaInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Ekspresi tidak valid");
  }
  const input: FormulaInput = parsed.data;

  let analysis: FormulaAnalysis;
  try {
    analysis = toAnalysis(input.expression, input.variable);
  } catch (err) {
    if (err instanceof ParseError) return badRequest(err.message);
    return badRequest("Gagal mengurai ekspresi matematika");
  }

  const cfg = await getAIConfig();
  const stepExplain = cfg?.features.stepExplain ?? true;
  if (!stepExplain) {
    analysis.steps = [
      {
        title: "Fitur penjelasan langkah dinonaktifkan",
        math: analysis.derivativePretty,
        description:
          "Admin menonaktifkan penjelasan langkah-demi-langkah. Hasil turunan tetap ditampilkan.",
      },
    ];
  }

  if (stepExplain) {
    try {
      const query = `${analysis.pretty} — aturan: ${analysis.rulesUsed.join(", ")}`;
      const chunks = await searchMaterials(query, {
        topicId: input.topicId ?? null,
        limit: 4,
      });
      const reference = chunks.length > 0 ? buildReference(chunks) : null;
      if (chunks.length > 0) analysis.references = toCitations(chunks);
      const ai = await explainAnalysis(analysis, cfg, reference);
      if (ai) {
        analysis.explanation = ai.explanation;
        analysis.keyPoints = ai.keyPoints;
        analysis.explanationSource = "ai";
        analysis.aiModel = ai.model;
      }
    } catch (err) {
      console.warn(
        "[ai] Penjelasan LLM gagal; memakai narasi mesin lokal:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const record: FormulaRecord = await createFormula({
    id: uid("f-"),
    userId: user.id,
    expression: input.expression,
    display: analysis.pretty,
    topicId: input.topicId,
  });

  await addHistory({
    userId: user.id,
    kind: "formula",
    title: `Analisis: f(x) = ${analysis.pretty}`,
    summary: `AI Step Explainer: ${analysis.steps.length} langkah, ${analysis.roots.length} akar, ${analysis.extrema.length} titik ekstrem.`,
    xp: 25,
  });
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "ai.explain",
    target: analysis.pretty,
    severity: "info",
  });

  return NextResponse.json({ analysis, record });
}

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  const records = await listFormulasByUser(user.id);
  return NextResponse.json({ records: records.slice(0, 8) });
}

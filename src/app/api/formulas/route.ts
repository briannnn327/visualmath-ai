import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addHistory, db, ensureSeeded, recordActivity } from "@/lib/db/store";
import { analyzeExpression, ParseError } from "@/lib/math/parser";
import { type FormulaInput, formulaInputSchema } from "@/lib/schemas";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";
import type { FormulaAnalysis, FormulaId, FormulaRecord } from "@/lib/types";
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
  };
}

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

  /* Penghambat fitur dari konfigurasi AI (admin) */
  const cfg = db.aiConfig;
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

  const record: FormulaRecord = {
    id: uid("f-") as FormulaId,
    userId: user.id,
    expression: input.expression,
    display: analysis.pretty,
    topicId: input.topicId as FormulaRecord["topicId"],
    createdAt: new Date().toISOString(),
  };
  db.formulas.push(record);
  if (db.formulas.length > 60) db.formulas.shift();

  addHistory({
    userId: user.id,
    kind: "formula",
    title: `Analisis: f(x) = ${analysis.pretty}`,
    summary: `AI Step Explainer: ${analysis.steps.length} langkah, ${analysis.roots.length} akar, ${analysis.extrema.length} titik ekstrem.`,
    xp: 25,
  });
  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "ai.explain",
    target: analysis.pretty,
    severity: "info",
  });

  return NextResponse.json({ analysis, record });
}

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  const records = db.formulas
    .filter((f) => f.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return NextResponse.json({ records });
}

"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { MathPlot } from "@/components/math-plot";
import { ScanSoalCard } from "@/components/scan-soal";
import { useFormulaAnalyze, useFormulaHistory, useTopics } from "@/lib/hooks/queries";
import { useToastStore } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { FormulaAnalysis } from "@/lib/types";

const presets = [
  { label: "x²", value: "x^2" },
  { label: "3x² + 2x − 1", value: "3x^2 + 2x - 1" },
  { label: "sin(x)", value: "sin(x)" },
  { label: "1/x", value: "1/x" },
  { label: "e^x", value: "e^x" },
  { label: "ln(x)", value: "ln(x)" },
];

export default function AIExplainerPage() {
  const analyze = useFormulaAnalyze();
  const history = useFormulaHistory();
  const topics = useTopics();
  const pushToast = useToastStore((s) => s.push);
  const searchParams = useSearchParams();

  const [expression, setExpression] = useState(presets[2].value);
  const [variable, setVariable] = useState("x");
  const [topicId, setTopicId] = useState(() => searchParams.get("topicId") ?? "");
  const [result, setResult] = useState<FormulaAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { analysis } = await analyze.mutateAsync({
        expression,
        variable,
        topicId: topicId || undefined,
      });
      setResult(analysis);
      setExpression(analysis.source);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menganalisis fungsi";
      setError(message);
      pushToast("error", message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">AI Step Explainer</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Masukkan fungsi, lalu AI menghitung turunan, akar, ekstrem, integral numerik, dan langkah penyelesaiannya.
        </p>
      </div>

      <ScanSoalCard />

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Field label="Ekspresi fungsi" htmlFor="expr" className="flex-1" hint="Contoh: 3x^2 + 2x - 1, sin(x), 1/x, e^x, ln(x)">
                <div className="flex gap-2">
                  <Input
                    id="expr"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    placeholder="f(x) = 3x^2 + 2x - 1"
                    className="math-mono"
                    spellCheck={false}
                  />
                  <Button type="submit" loading={analyze.isPending} icon="sparkle">
                    <span className="hidden sm:inline">Analisis</span>
                  </Button>
                </div>
              </Field>
              <div className="flex gap-3">
                <Field label="Peubah" htmlFor="var" className="w-24">
                  <Select id="var" value={variable} onChange={(e) => setVariable(e.target.value)}>
                    {["x", "y", "z", "t"].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Topik (opsional)" htmlFor="topic" className="w-full sm:w-52">
                  <Select id="topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                    <option value="">Tanpa topik</option>
                    {topics.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="me-1 self-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Cepat:</span>
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setExpression(p.value)}
                  className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {analyze.isPending && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container/60 p-5 lg:col-span-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container/60 p-5 lg:col-span-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )}

      {result && !analyze.isPending && (
        <>
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Grafik Fungsi</CardTitle>
                  <CardDescription className="math-mono">f(x) = {result.pretty} · f′(x) = {result.derivativePretty}</CardDescription>
                </div>
                <Badge variant="primary">Interaktif</Badge>
              </CardHeader>
              <CardContent className="pt-5">
                <MathPlot
                  segments={result.segments}
                  derivativeSegments={result.derivativeSegments}
                  points={result.points}
                  derivativePoints={result.derivativePoints}
                  roots={result.roots}
                  extrema={result.extrema}
                  expressionLabel={`f(${result.variable}) = ${result.pretty}`}
                  showDerivative
                  height={380}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ringkasan Hasil</CardTitle>
                <CardDescription>Informasi kunci dari analisis otomatis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="rounded-2xl border border-outline-variant bg-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Aturan yang dipakai</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.rulesUsed.length === 0 && <Badge variant="outline">Konstanta</Badge>}
                    {result.rulesUsed.map((r) => (
                      <Badge key={r} variant="tertiary">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ResultStat label="Integral numerik" value={result.integral === null ? "—" : result.integralText} tone="text-primary" />
                  <ResultStat label="Akar" value={`${result.roots.length} titik`} tone="text-secondary" />
                  <ResultStat label="Ekstrem" value={`${result.extrema.length} titik`} tone="text-tertiary" />
                  <ResultStat label="Variabel" value={result.variable} tone="text-on-surface-variant" />
                </div>

                <div className="space-y-2">
                  {result.roots.map((r, i) => (
                    <p key={`r${i}`} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Icon name="check-circle" size={15} className="text-secondary" />
                      Akar di <span className="math-mono font-semibold text-on-surface">x ≈ {r.x.toFixed(3)}</span> (f = {r.y.toFixed(3)})
                    </p>
                  ))}
                  {result.extrema.map((e, i) => (
                    <p key={`e${i}`} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Icon name="award" size={15} className="text-tertiary" />
                      {e.kind === "min" ? "Minimum" : "Maksimum"} lokal di x ≈{" "}
                      <span className="math-mono font-semibold text-on-surface">{e.x.toFixed(3)}</span>
                    </p>
                  ))}
                  {result.roots.length === 0 && result.extrema.length === 0 && (
                    <p className="text-sm text-on-surface-variant">Tidak ada akar atau ekstrem dalam rentang plot.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary-container text-on-secondary-container">
                  <Icon name="route" size={17} />
                </span>
                <div>
                  <CardTitle>Langkah Penyelesaian Turunan</CardTitle>
                  <CardDescription>AI menjelaskan tiap aturan secara berurutan.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <ol className="space-y-3">
                  {result.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 rounded-2xl border border-outline-variant bg-surface p-4">
                        <p className="text-sm font-bold text-on-surface">{step.title}</p>
                        <p className="mt-1 font-mono text-[13px] text-primary">{step.math}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Penjelasan</CardTitle>
                  <CardDescription>Deskripsi konsep dari mesin analisis.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm leading-relaxed text-on-surface-variant">{result.explanation}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Riwayat Analisis</CardTitle>
                    <CardDescription>Ekspresi yang pernah kamu analisis.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => history.refetch()} aria-label="Muat ulang">
                    <Icon name="refresh" size={16} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-1 pt-5">
                  {(history.data ?? []).slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setExpression(r.expression)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left transition-colors hover:bg-surface-container"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-on-surface">{r.display}</span>
                      <span className="shrink-0 text-[11px] text-on-surface-variant">{formatDate(r.createdAt)}</span>
                    </button>
                  ))}
                  {(history.data ?? []).length === 0 && (
                    <p className="text-sm text-on-surface-variant">Belum ada riwayat. Coba analisis pertama kamu!</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {!result && !analyze.isPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
              <Icon name="sparkle" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Analisis pertamamu menunggu</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Ketik ekspresi fungsi di atas (mis. <span className="math-mono">3x^2 + 2x - 1</span>) lalu tekan Analisis untuk melihat
              turunan, langkah penyelesaian, dan grafiknya.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}
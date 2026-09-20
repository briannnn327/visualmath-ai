"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { MathPlot } from "@/components/math-plot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { useFormulaAnalyze } from "@/lib/hooks/queries";
import type { FormulaAnalysis } from "@/lib/types";

const presets = [
  { label: "Parabola", value: "x^2" },
  { label: "Kubik", value: "x^3 - 3x" },
  { label: "Fungsi timbal balik", value: "1/x" },
  { label: "Sinus", value: "sin(x)" },
  { label: "Eksponensial", value: "e^x" },
  { label: "Akar", value: "sqrt(x)" },
  { label: "Tangen", value: "tan(x)" },
];

export default function GrafikPage() {
  const analyze = useFormulaAnalyze();
  const pushToast = useToastStore((s) => s.push);

  const [expression, setExpression] = useState(presets[1].value);
  const [showDerivative, setShowDerivative] = useState(true);
  const [result, setResult] = useState<FormulaAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function run() {
    setError(null);
    try {
      const { analysis } = await analyze.mutateAsync({ expression });
      setResult(analysis);
      setExpression(analysis.source);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menggambar fungsi";
      setError(message);
      pushToast("error", message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await run();
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Grafik Interaktif</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Jelajahi bentuk kurva dan turunannya. Arahkan kursor pada grafik untuk membaca koordinat.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="plot-expr"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Ekspresi fungsi
              </label>
              <div className="flex gap-2">
                <Input
                  id="plot-expr"
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  className="math-mono"
                  spellCheck={false}
                  placeholder="f(x) = x^3 - 3x"
                />
                <Button type="submit" loading={analyze.isPending} icon="monitoring">
                  <span className="hidden sm:inline">Gambar</span>
                </Button>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-outline-variant px-3 py-2.5 text-sm font-semibold text-on-surface select-none">
              <input
                type="checkbox"
                checked={showDerivative}
                onChange={(e) => setShowDerivative(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Tampilkan f′(x)
            </label>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
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
            <p
              role="alert"
              className="mt-3 rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container"
            >
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && !analyze.isPending ? (
        <>
          <Card>
            <CardContent className="p-5">
              <MathPlot
                segments={result.segments}
                derivativeSegments={result.derivativeSegments}
                points={result.points}
                derivativePoints={result.derivativePoints}
                roots={result.roots}
                extrema={result.extrema}
                expressionLabel={`f(${result.variable}) = ${result.pretty}`}
                showDerivative={showDerivative}
                height={460}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Turunan" value={result.derivativePretty} mono />
            <MiniStat
              label="Integral (rentang auto)"
              value={result.integral === null ? "—" : result.integralText}
            />
            <MiniStat
              label="Akar"
              value={result.roots.map((r) => r.x.toFixed(2)).join(", ") || "—"}
            />
            <MiniStat
              label="Ekstrem"
              value={
                result.extrema
                  .map((e) => `${e.kind === "min" ? "min" : "maks"}@${e.x.toFixed(2)}`)
                  .join(", ") || "—"
              }
            />
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="monitoring" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Menyiapkan grafik…</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Proses sampling & analisis sedang berjalan. Grafik akan muncul sesaat.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <p
          className={`mt-1 truncate text-sm font-bold text-on-surface ${mono ? "math-mono" : ""}`}
          title={value}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

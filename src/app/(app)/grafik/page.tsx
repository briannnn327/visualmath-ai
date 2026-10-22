"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { MathPlot } from "@/components/math-plot";
import { MultivariablePlot } from "@/components/multivariable-plot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { useFormulaAnalyze } from "@/lib/hooks/queries";
import { analyzeMultivariableExpression } from "@/lib/math/parser";
import type { FormulaAnalysis, MultivariableAnalysis } from "@/lib/types";

const presets1D = [
  { label: "Parabola", value: "x^2" },
  { label: "Kubik", value: "x^3 - 3x" },
  { label: "Fungsi timbal balik", value: "1/x" },
  { label: "Sinus", value: "sin(x)" },
  { label: "Eksponensial", value: "e^x" },
  { label: "Akar", value: "sqrt(x)" },
  { label: "Tangen", value: "tan(x)" },
];

const presets2D = [
  { label: "Paraboloid Eliptik", value: "x^2 + y^2" },
  { label: "Pelana (Saddle)", value: "x^2 - y^2" },
  { label: "Gelombang Sinus", value: "sin(x)*cos(y)" },
  { label: "Kerucut Melingkar", value: "sqrt(x^2 + y^2)" },
  { label: "Lonceng Gauss 2D", value: "exp(-(x^2 + y^2)/2)" },
  { label: "Monkey Saddle", value: "x^3 - 3*x*y^2" },
];

export default function GrafikPage() {
  const analyze = useFormulaAnalyze();
  const pushToast = useToastStore((s) => s.push);

  const [dimensionMode, setDimensionMode] = useState<"1d" | "2d">("1d");
  const [expression1D, setExpression1D] = useState(presets1D[1].value);
  const [expression2D, setExpression2D] = useState(presets2D[0].value);
  const [showDerivative, setShowDerivative] = useState(true);

  const [result1D, setResult1D] = useState<FormulaAnalysis | null>(null);
  const [result2D, setResult2D] = useState<MultivariableAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const graphOff = result1D?.graphEnabled === false;

  async function run1D(exprToRun = expression1D) {
    setError(null);
    try {
      const { analysis } = await analyze.mutateAsync({ expression: exprToRun });
      setResult1D(analysis);
      setExpression1D(analysis.source);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menggambar fungsi";
      setError(message);
      pushToast("error", message);
    }
  }

  function run2D(exprToRun = expression2D) {
    setError(null);
    try {
      const analysis = analyzeMultivariableExpression(exprToRun, "x", "y");
      setResult2D(analysis);
      setExpression2D(analysis.normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memproses fungsi 2 peubah";
      setError(message);
      pushToast("error", message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (dimensionMode === "1d") {
      await run1D();
    } else {
      run2D();
    }
  }

  function handleModeChange(mode: "1d" | "2d") {
    setDimensionMode(mode);
    setError(null);
    if (mode === "2d" && !result2D) {
      run2D(expression2D);
    } else if (mode === "1d" && !result1D) {
      void run1D(expression1D);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: efek sekali-jalan saat mount
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run1D();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">
            Grafik Interaktif
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Jelajahi visualisasi kurva 2D dan permukaan kalkulus multivariabel 3D secara interaktif.
          </p>
        </div>

        {/* Tab Pemilih Dimensi (1 Peubah vs Multivariabel) */}
        <div className="inline-flex rounded-xl border border-outline-variant bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => handleModeChange("1d")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              dimensionMode === "1d"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon name="monitoring" size={15} />1 Peubah: y = f(x)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("2d")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              dimensionMode === "2d"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon name="sparkle" size={15} />
            Multivariabel: z = f(x, y)
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="plot-expr"
                className="mb-1.5 flex items-center justify-between text-sm font-semibold text-on-surface"
              >
                <span>
                  {dimensionMode === "1d"
                    ? "Ekspresi fungsi f(x)"
                    : "Ekspresi fungsi multivariabel z = f(x, y)"}
                </span>
                <span className="text-xs text-on-surface-variant font-normal">
                  {dimensionMode === "1d"
                    ? "Peubah: x"
                    : "Peubah: x, y (gunakan * untuk perkalian)"}
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="plot-expr"
                  value={dimensionMode === "1d" ? expression1D : expression2D}
                  onChange={(e) =>
                    dimensionMode === "1d"
                      ? setExpression1D(e.target.value)
                      : setExpression2D(e.target.value)
                  }
                  className="math-mono"
                  spellCheck={false}
                  placeholder={dimensionMode === "1d" ? "x^3 - 3*x" : "x^2 + y^2"}
                />
                <Button
                  type="submit"
                  loading={dimensionMode === "1d" && analyze.isPending}
                  icon="monitoring"
                >
                  <span className="hidden sm:inline">Gambar</span>
                </Button>
              </div>
            </div>

            {dimensionMode === "1d" && (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-outline-variant px-3 py-2.5 text-sm font-semibold text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={showDerivative}
                  onChange={(e) => setShowDerivative(e.target.checked)}
                  disabled={graphOff}
                  className="h-4 w-4 accent-[var(--color-primary)] disabled:opacity-50"
                />
                Tampilkan f′(x)
              </label>
            )}
          </form>

          {/* Preset Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-on-surface-variant mr-1">Contoh:</span>
            {dimensionMode === "1d"
              ? presets1D.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setExpression1D(p.value);
                      void run1D(p.value);
                    }}
                    className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))
              : presets2D.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setExpression2D(p.value);
                      run2D(p.value);
                    }}
                    className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-3 flex items-center justify-between rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container"
            >
              <span>{error}</span>
              {error.includes("lebih dari satu variabel") && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleModeChange("2d")}
                  className="ml-2 h-7 text-xs font-bold"
                >
                  Beralih ke Multivariabel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render Mode: 1D Single Variable */}
      {dimensionMode === "1d" &&
        (result1D && !analyze.isPending ? (
          <>
            <Card>
              <CardContent className="p-5">
                {graphOff ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-container-high text-on-surface-variant">
                      <Icon name="warning" size={26} />
                    </span>
                    <h3 className="font-display text-lg font-bold text-on-surface">
                      Simulasi grafik dinonaktifkan
                    </h3>
                    <p className="max-w-md text-sm text-on-surface-variant">
                      Admin menonaktifkan fitur simulasi grafik. Turunan, akar, dan titik ekstrem
                      tetap dihitung dan ditampilkan di bawah.
                    </p>
                  </div>
                ) : (
                  <MathPlot
                    segments={result1D.segments}
                    derivativeSegments={result1D.derivativeSegments}
                    points={result1D.points}
                    derivativePoints={result1D.derivativePoints}
                    roots={result1D.roots}
                    extrema={result1D.extrema}
                    expressionLabel={`f(${result1D.variable}) = ${result1D.pretty}`}
                    showDerivative={showDerivative}
                    height={460}
                  />
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Turunan" value={result1D.derivativePretty} mono />
              <MiniStat
                label="Integral (rentang auto)"
                value={result1D.integral === null ? "—" : result1D.integralText}
              />
              <MiniStat
                label="Akar"
                value={result1D.roots.map((r) => r.x.toFixed(2)).join(", ") || "—"}
              />
              <MiniStat
                label="Ekstrem"
                value={
                  result1D.extrema
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
        ))}

      {/* Render Mode: 2D Multivariable */}
      {dimensionMode === "2d" && result2D && <MultivariablePlot data={result2D} />}
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

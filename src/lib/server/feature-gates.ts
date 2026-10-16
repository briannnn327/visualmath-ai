/* =========================================================
   Gerbang fitur mesin analisis (AIConfig.features).
   Fitur yang dinonaktifkan admin diterapkan di sisi server agar
   perilakunya konsisten untuk seluruh klien:
   - stepExplain   : menyusun/melewati langkah & narasi AI
   - graphSimulation: menyertakan/mengosongkan data plot grafik
   ========================================================= */
import type { AIConfig, FormulaAnalysis } from "@/lib/types";

export interface FormulaFeatureFlags {
  stepExplain: boolean;
  graphSimulation: boolean;
}

/** Baca fitur relevan dari konfigurasi AI; default aktif bila konfigurasi belum ada. */
export function resolveFormulaFlags(cfg: AIConfig | null | undefined): FormulaFeatureFlags {
  return {
    stepExplain: cfg?.features.stepExplain ?? true,
    graphSimulation: cfg?.features.graphSimulation ?? true,
  };
}

/**
 * Terapkan fitur graphSimulation pada hasil analisis.
 * Bila nonaktif, data plot dikosongkan (segments/points) namun data tekstual
 * (turunan, akar, ekstrem, integral) tetap tersedia, dan `graphEnabled = false`
 * diberi tanda agar klien menampilkan pemberitahuan alih-alih grafik.
 */
export function applyGraphGate(analysis: FormulaAnalysis, enabled: boolean): FormulaAnalysis {
  if (enabled) return { ...analysis, graphEnabled: true };
  return {
    ...analysis,
    graphEnabled: false,
    segments: [],
    derivativeSegments: [],
    points: [],
    derivativePoints: [],
  };
}

/** Langkah pengganti ketika penjelasan langkah dinonaktifkan admin. */
export function disabledStepExplain(analysis: FormulaAnalysis): FormulaAnalysis["steps"] {
  return [
    {
      title: "Fitur penjelasan langkah dinonaktifkan",
      math: analysis.derivativePretty,
      description:
        "Admin menonaktifkan penjelasan langkah-demi-langkah. Hasil turunan tetap ditampilkan.",
    },
  ];
}

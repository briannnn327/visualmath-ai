import { describe, expect, it } from "vitest";
import {
  applyGraphGate,
  disabledStepExplain,
  resolveFormulaFlags,
} from "@/lib/server/feature-gates";
import type { AIConfig, FormulaAnalysis } from "@/lib/types";

function makeConfig(features: Partial<AIConfig["features"]>): AIConfig {
  return {
    id: "cfg-1",
    provider: "gemini",
    model: "gemini-flash-latest",
    temperature: 0.4,
    maxTokens: 1024,
    features: {
      stepExplain: features.stepExplain ?? true,
      adaptiveQuiz: features.adaptiveQuiz ?? true,
      graphSimulation: features.graphSimulation ?? true,
    },
    systemPrompt: "prompt",
    updatedAt: new Date(0).toISOString(),
  } as unknown as AIConfig;
}

function makeAnalysis(): FormulaAnalysis {
  return {
    source: "x^2",
    normalized: "x^2",
    pretty: "x^2",
    derivativePretty: "2x",
    segments: [{ points: [[0, 0]], color: "#000" }],
    derivativeSegments: [{ points: [[0, 0]], color: "#111" }],
    extrema: [{ kind: "min", x: 0, y: 0 }],
    roots: [],
    integral: 0,
    integralText: "0",
    steps: [{ title: "Aturan pangkat", math: "2x", description: "turunkan" }],
    explanation: "penjelasan",
    rulesUsed: ["power"],
    variable: "x",
    points: [{ x: 0, y: 0 }],
    derivativePoints: [{ x: 0, y: 0 }],
  } as unknown as FormulaAnalysis;
}

describe("resolveFormulaFlags", () => {
  it("default aktif bila konfigurasi belum ada", () => {
    expect(resolveFormulaFlags(null)).toEqual({ stepExplain: true, graphSimulation: true });
    expect(resolveFormulaFlags(undefined)).toEqual({ stepExplain: true, graphSimulation: true });
  });

  it("mengikuti nilai fitur dari konfigurasi", () => {
    const cfg = makeConfig({ stepExplain: false, graphSimulation: false });
    expect(resolveFormulaFlags(cfg)).toEqual({ stepExplain: false, graphSimulation: false });
  });
});

describe("applyGraphGate", () => {
  it("menandai graphEnabled=true dan mempertahankan data saat aktif", () => {
    const out = applyGraphGate(makeAnalysis(), true);
    expect(out.graphEnabled).toBe(true);
    expect(out.segments.length).toBe(1);
    expect(out.points.length).toBe(1);
  });

  it("mengosongkan data plot namun mempertahankan teks saat nonaktif", () => {
    const out = applyGraphGate(makeAnalysis(), false);
    expect(out.graphEnabled).toBe(false);
    expect(out.segments).toEqual([]);
    expect(out.derivativeSegments).toEqual([]);
    expect(out.points).toEqual([]);
    expect(out.derivativePoints).toEqual([]);
    // data tekstual tetap ada
    expect(out.derivativePretty).toBe("2x");
    expect(out.extrema).toHaveLength(1);
    expect(out.steps).toHaveLength(1);
  });
});

describe("disabledStepExplain", () => {
  it("mengembalikan satu langkah pengganti dengan math turunan", () => {
    const steps = disabledStepExplain(makeAnalysis());
    expect(steps).toHaveLength(1);
    expect(steps[0].math).toBe("2x");
    expect(steps[0].title).toMatch(/dinonaktifkan/i);
  });
});

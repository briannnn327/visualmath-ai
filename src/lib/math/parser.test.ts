import { describe, expect, it } from "vitest";
import {
  analyzeExpression,
  analyzeMultivariableExpression,
  diff,
  makeFunction,
  makeFunction2D,
  ParseError,
  pretty,
} from "@/lib/math/parser";

describe("math parser — analisis ekspresi", () => {
  it("menghitung nilai fungsi pada titik tertentu", () => {
    const { node } = analyzeExpression("3*x^2 + 2*x - 1");
    const f = makeFunction(node, "x");
    expect(f(0)).toBeCloseTo(-1, 6);
    expect(f(2)).toBeCloseTo(15, 6);
  });

  it("menghasilkan turunan simbolik yang benar secara numerik", () => {
    const { node } = analyzeExpression("3*x^2 + 2*x - 1");
    const d = diff(node, "x");
    if (!d) throw new Error("turunan tidak boleh null");
    const df = makeFunction(d, "x");
    expect(df(3)).toBeCloseTo(20, 5); // 6*3 + 2
  });

  it("mendeteksi aturan yang dipakai (power + linearity)", () => {
    const { text } = analyzeExpression("3*x^2 + 2*x - 1");
    expect(text.rulesUsed).toContain("power");
    expect(text.rulesUsed).toContain("linearity");
  });

  it("menemukan dua akar dan satu minimum lokal", () => {
    const { numbers } = analyzeExpression("3*x^2 + 2*x - 1");
    expect(numbers.roots.length).toBe(2);
    expect(numbers.extrema.length).toBe(1);
    expect(numbers.extrema[0].kind).toBe("min");
  });

  it("menghitung integral numerik mendekati nilai eksak", () => {
    const { text } = analyzeExpression("x^2");
    // ∫_{-6}^{6} x^2 dx = 144
    if (text.integral === null) throw new Error("integral tidak boleh null");
    expect(text.integral).toBeCloseTo(144, 1);
  });

  it("mendukung perkalian implisit antarfungsi", () => {
    const { text } = analyzeExpression("sin(x)cos(x)");
    expect(text.rulesUsed).toContain("product");
    expect(text.rulesUsed).toContain("chain");
  });

  it("menghasilkan pretty print dengan superscript & perkalian juxtaposisi", () => {
    expect(analyzeExpression("x^2").text.pretty).toBe("x²");
    expect(analyzeExpression("2*x").text.pretty).toBe("2x");
  });

  it("menolak operator menggantung", () => {
    expect(() => analyzeExpression("x ** 2")).toThrow(ParseError);
  });

  it("menolak lebih dari satu variabel", () => {
    expect(() => analyzeExpression("x + y", "x")).toThrow(/satu variabel/);
  });

  it("pretty print node konstanta pi", () => {
    expect(pretty({ kind: "const", name: "pi" })).toBe("π");
  });

  it("menganalisis fungsi multivariabel z = f(x, y) dan turunan parsial", () => {
    const res = analyzeMultivariableExpression("x^2 + y^2", "x", "y");
    expect(res.varX).toBe("x");
    expect(res.varY).toBe("y");
    expect(res.partialX.pretty).toBe("2x");
    expect(res.partialY.pretty).toBe("2y");
    expect(res.secondPartialXX).toBe("2");
    expect(res.secondPartialYY).toBe("2");
    expect(res.secondPartialXY).toBe("0");
    expect(res.gradientPretty).toContain("2x");
    expect(res.gradientPretty).toContain("2y");
    expect(res.grid.values.length).toBe(25);
    expect(res.grid.values[0].length).toBe(25);
  });

  it("mengevaluasi makeFunction2D dengan benar", () => {
    const res = analyzeMultivariableExpression("x^2 - y^2", "x", "y");
    const pX = res.partialX.node;
    if (!pX) throw new Error("turunan parsial X tidak boleh null");
    const f2d = makeFunction2D(pX, "x", "y");
    expect(f2d(3, 5)).toBeCloseTo(6, 4); // 2*3 = 6
  });
});

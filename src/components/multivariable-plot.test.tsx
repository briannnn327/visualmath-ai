// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MultivariablePlot } from "@/components/multivariable-plot";
import type { MultivariableAnalysis } from "@/lib/types";

/* z = x^2 + y^2 pada grid 3x3 (x dan y = -1, 0, 1) */
const data: MultivariableAnalysis = {
  source: "x^2 + y^2",
  normalized: "x^2+y^2",
  pretty: "x\u00B2 + y\u00B2",
  varX: "x",
  varY: "y",
  variables: ["x", "y"],
  partialX: { pretty: "2x", steps: [] },
  partialY: { pretty: "2y", steps: [] },
  gradientPretty: "(2x, 2y)",
  secondPartialXX: "2",
  secondPartialYY: "2",
  secondPartialXY: "0",
  hessianDeterminant: "4",
  grid: {
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [0, 2],
    xSteps: [-1, 0, 1],
    ySteps: [-1, 0, 1],
    values: [
      [2, 1, 2],
      [1, 0, 1],
      [2, 1, 2],
    ],
  },
};

/** Palsukan ukuran SVG peta kontur agar pemetaan pointer -> sel bisa diuji di jsdom. */
function stubContourSize(svg: HTMLElement) {
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 360,
    height: 360,
    right: 360,
    bottom: 360,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

async function switchToContour() {
  const user = userEvent.setup();
  render(<MultivariablePlot data={data} />);
  await user.click(screen.getByRole("button", { name: /kontur/i }));
  return user;
}

/**
 * Fokuskan peta kontur.
 * jsdom tidak mem-dispatch event "focusin" saat element.focus() dipanggil
 * (browser asli melakukannya), jadi focusin dipicu manual agar handler onFocus React jalan.
 */
function focusContourMap() {
  const map = screen.getByRole("application");
  act(() => {
    map.focus();
    fireEvent.focusIn(map);
  });
  return map;
}

describe("MultivariablePlot", () => {
  it("merender judul fungsi dan ringkasan turunan", () => {
    render(<MultivariablePlot data={data} />);

    expect(screen.getByText("z = x\u00B2 + y\u00B2")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("2y")).toBeInTheDocument();
    expect(screen.getByTitle("(2x, 2y)")).toBeInTheDocument();
    expect(screen.getByTitle("4")).toBeInTheDocument();
  });

  it("menampilkan permukaan 3D secara default", () => {
    render(<MultivariablePlot data={data} />);

    const svg = screen.getByRole("img", { name: /permukaan 3d/i });
    expect(svg).toBeInTheDocument();
    /* Grid 3x3 menghasilkan 2x2 quad permukaan */
    expect(svg.querySelectorAll("path")).toHaveLength(4);
  });

  it("berpindah ke mode kontur dan menampilkan sel heatmap", async () => {
    await switchToContour();

    const svg = screen.getByRole("img", { name: /peta kontur/i });
    expect(svg).toBeInTheDocument();
    expect(svg.querySelectorAll("rect")).toHaveLength(9);
    expect(screen.getByRole("application")).toBeInTheDocument();
  });

  it("menampilkan nilai z saat kursor bergerak di peta kontur", async () => {
    await switchToContour();

    const svg = screen.getByRole("img", { name: /peta kontur/i });
    stubContourSize(svg);

    /* Sel tengah kolom (x = 0) pada baris terbawah (y = -1) -> z = 1 */
    fireEvent.mouseMove(screen.getByRole("application"), { clientX: 120, clientY: 240 });

    expect(screen.getByText("x = 0.00")).toBeInTheDocument();
    expect(screen.getByText("y = -1.00")).toBeInTheDocument();
    expect(screen.getByText("z = 1.000")).toBeInTheDocument();
  });

  it("menjelajahi sel peta kontur dengan keyboard", async () => {
    const user = await switchToContour();

    focusContourMap();

    /* Fokus awal: sel kiri-bawah (x = -1, y = 1, z = 2) */
    expect(screen.getByText("x = -1.00")).toBeInTheDocument();
    expect(screen.getByText("y = 1.00")).toBeInTheDocument();
    expect(screen.getByText("z = 2.000")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("x = 0.00")).toBeInTheDocument();
    expect(screen.getByText("z = 1.000")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("y = 0.00")).toBeInTheDocument();
    expect(screen.getByText("z = 0.000")).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(screen.getByText("x = 1.00")).toBeInTheDocument();
  });

  it("menandai sel aktif pada peta kontur saat keyboard dipakai", async () => {
    await switchToContour();

    const svg = screen.getByRole("img", { name: /peta kontur/i });
    expect(svg.querySelectorAll('rect[stroke="#ffffff"]')).toHaveLength(0);

    focusContourMap();

    expect(svg.querySelectorAll('rect[stroke="#ffffff"]')).toHaveLength(1);
  });

  it("mengubah sudut yaw dan pitch pada permukaan 3D", () => {
    render(<MultivariablePlot data={data} />);

    const [yaw, pitch] = screen.getAllByRole("slider");
    expect(screen.getByText(/Putar \(Yaw\): 45/)).toBeInTheDocument();
    expect(screen.getByText(/Kemiringan \(Pitch\): 30/)).toBeInTheDocument();

    fireEvent.change(yaw, { target: { value: "90" } });
    expect(screen.getByText(/Putar \(Yaw\): 90/)).toBeInTheDocument();

    fireEvent.change(pitch, { target: { value: "45" } });
    expect(screen.getByText(/Kemiringan \(Pitch\): 45/)).toBeInTheDocument();
  });
});

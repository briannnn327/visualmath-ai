"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { MultivariableAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MultivariablePlotProps {
  data: MultivariableAnalysis;
  className?: string;
}

/** Hitung warna gradien elevasi (biru/indigo -> toska -> kuning -> merah muda) */
function elevationColor(normZ: number): string {
  const t = Math.max(0, Math.min(1, normZ));
  if (t < 0.25) {
    // 0.0 - 0.25: deep indigo -> cyan
    const r = Math.round(53 + (0 - 53) * (t / 0.25));
    const g = Math.round(37 + (180 - 37) * (t / 0.25));
    const b = Math.round(205 + (220 - 205) * (t / 0.25));
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.5) {
    // 0.25 - 0.5: cyan -> emerald
    const sub = (t - 0.25) / 0.25;
    const r = Math.round(0 + (16 - 0) * sub);
    const g = Math.round(180 + (185 - 180) * sub);
    const b = Math.round(220 + (129 - 220) * sub);
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.75) {
    // 0.5 - 0.75: emerald -> amber
    const sub = (t - 0.5) / 0.25;
    const r = Math.round(16 + (245 - 16) * sub);
    const g = Math.round(185 + (158 - 185) * sub);
    const b = Math.round(129 + (11 - 129) * sub);
    return `rgb(${r},${g},${b})`;
  }
  // 0.75 - 1.0: amber -> rose
  const sub = (t - 0.75) / 0.25;
  const r = Math.round(245 + (225 - 245) * sub);
  const g = Math.round(158 + (29 - 158) * sub);
  const b = Math.round(11 + (72 - 11) * sub);
  return `rgb(${r},${g},${b})`;
}

export function MultivariablePlot({ data, className }: MultivariablePlotProps) {
  const [viewMode, setViewMode] = useState<"3d" | "contour">("3d");
  const [yaw, setYaw] = useState(45); // Sudut rotasi horizontal (derajat)
  const [pitch, setPitch] = useState(30); // Sudut elevasi / kemiringan (derajat)
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const filterId = useId();

  /* Kontur 2D: pemetaan pointer -> sel grid + navigasi keyboard */
  const contourSvgRef = useRef<SVGSVGElement>(null);
  const [focusCell, setFocusCell] = useState<{ i: number; j: number } | null>(null);

  const cellAt = (i: number, j: number) => {
    if (i < 0 || i >= xSteps.length || j < 0 || j >= ySteps.length) return null;
    return { x: xSteps[i], y: ySteps[j], z: values[j][i] };
  };

  const handleContourMove = (e: React.MouseEvent) => {
    const svg = contourSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cellWidth = rect.width / xSteps.length;
    const cellHeight = rect.height / ySteps.length;
    const i = Math.floor((e.clientX - rect.left) / cellWidth);
    /* Baris paling atas di layar = indeks data tertinggi (sumbu y ke atas) */
    const j = ySteps.length - 1 - Math.floor((e.clientY - rect.top) / cellHeight);
    setHoveredCell(cellAt(i, j));
  };

  const handleContourKeyDown = (e: React.KeyboardEvent) => {
    const current = focusCell ?? { i: 0, j: ySteps.length - 1 };
    let { i, j } = current;
    if (e.key === "ArrowLeft") i -= 1;
    else if (e.key === "ArrowRight") i += 1;
    else if (e.key === "ArrowUp") j += 1;
    else if (e.key === "ArrowDown") j -= 1;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = xSteps.length - 1;
    else return;
    e.preventDefault();
    i = Math.max(0, Math.min(xSteps.length - 1, i));
    j = Math.max(0, Math.min(ySteps.length - 1, j));
    setFocusCell({ i, j });
    setHoveredCell(cellAt(i, j));
  };

  const { grid, pretty, gradientPretty, partialX, partialY, hessianDeterminant } = data;
  const { xSteps, ySteps, values, zRange } = grid;
  const zMin = zRange[0];
  const zMax = zRange[1];
  const zSpan = zMax - zMin > 1e-6 ? zMax - zMin : 1;

  /* Proyeksi Isometrik 3D ke 2D Canvas SVG */
  const svgWidth = 600;
  const svgHeight = 420;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 30;

  const radYaw = (yaw * Math.PI) / 180;
  const radPitch = (pitch * Math.PI) / 180;
  const cosY = Math.cos(radYaw);
  const sinY = Math.sin(radYaw);
  const cosP = Math.cos(radPitch);
  const sinP = Math.sin(radPitch);

  const scaleXY = 42;
  const scaleZ = 45;

  const projectedMesh = useMemo(() => {
    if (viewMode !== "3d") return [];

    const ny = ySteps.length;
    const nx = xSteps.length;
    const quads: Array<{
      d: string;
      color: string;
      depth: number;
    }> = [];

    // Hitung koordinat proyeksi setiap titik grid
    const points2D: Array<Array<{ sx: number; sy: number; depth: number; normZ: number }>> = [];

    for (let j = 0; j < ny; j++) {
      const row: Array<{ sx: number; sy: number; depth: number; normZ: number }> = [];
      const y = ySteps[j];
      for (let i = 0; i < nx; i++) {
        const x = xSteps[i];
        const rawZ = values[j][i];
        const z = Number.isNaN(rawZ) ? zMin : rawZ;
        const normZ = (z - zMin) / zSpan;

        // Rotasi Yaw (sumbu Z)
        const rotX = x * cosY - y * sinY;
        const rotY = x * sinY + y * cosY;

        // Rotasi Pitch (sumbu X)
        const projY = -rotY * sinP + (normZ * 2 - 1) * cosP;
        const depth = rotY * cosP + (normZ * 2 - 1) * sinP;

        const sx = centerX + rotX * scaleXY;
        const sy = centerY - (projY * scaleZ + (normZ - 0.5) * scaleZ);

        row.push({ sx, sy, depth, normZ });
      }
      points2D.push(row);
    }

    // Bangun poligon quad permukaan
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const p00 = points2D[j][i];
        const p10 = points2D[j][i + 1];
        const p11 = points2D[j + 1][i + 1];
        const p01 = points2D[j + 1][i];

        const avgNormZ = (p00.normZ + p10.normZ + p11.normZ + p01.normZ) / 4;
        const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
        const d = `M ${p00.sx.toFixed(1)} ${p00.sy.toFixed(1)} L ${p10.sx.toFixed(1)} ${p10.sy.toFixed(1)} L ${p11.sx.toFixed(1)} ${p11.sy.toFixed(1)} L ${p01.sx.toFixed(1)} ${p01.sy.toFixed(1)} Z`;

        quads.push({
          d,
          color: elevationColor(avgNormZ),
          depth: avgDepth,
        });
      }
    }

    // Urutkan kuad dari belakang ke depan (Painter's Algorithm)
    quads.sort((a, b) => a.depth - b.depth);
    return quads;
  }, [viewMode, xSteps, ySteps, values, cosY, sinY, cosP, sinP, zMin, zSpan, centerX, centerY]);

  return (
    <Card className={cn("overflow-hidden border border-outline-variant bg-surface", className)}>
      {/* Header bar controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container/40 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-container text-on-primary-container">
            <Icon name="sparkle" size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-on-surface">z = {pretty}</h3>
            <p className="text-xs text-on-surface-variant font-mono">
              z ∈ [{zMin.toFixed(2)}, {zMax.toFixed(2)}]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-outline-variant bg-surface p-0.5">
            <Button
              type="button"
              variant={viewMode === "3d" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("3d")}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              <Icon name="monitoring" size={13} className="mr-1" />
              Permukaan 3D
            </Button>
            <Button
              type="button"
              variant={viewMode === "contour" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("contour")}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              <Icon name="target" size={13} className="mr-1" />
              Kontur & Medan Gradien
            </Button>
          </div>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="relative flex min-h-[380px] w-full items-center justify-center bg-surface-container/20 p-2 select-none">
        {viewMode === "3d" ? (
          <div className="relative w-full max-w-[620px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[420px] drop-shadow-sm"
              role="img"
              aria-label="Permukaan 3D fungsi z(x, y)"
            >
              <defs>
                <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Grid quads */}
              <g filter={`url(#${filterId})`}>
                {projectedMesh.map((q, idx) => (
                  <path
                    key={`q-${idx}`}
                    d={q.d}
                    fill={q.color}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.6"
                    opacity={0.92}
                  />
                ))}
              </g>

              {/* Orientation Axis indicator */}
              <g transform="translate(45, 380)">
                <line
                  x1="0"
                  y1="0"
                  x2={30 * cosY}
                  y2={-30 * sinY * sinP}
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <text
                  x={36 * cosY}
                  y={-36 * sinY * sinP}
                  fill="#ef4444"
                  fontSize="10"
                  fontWeight="bold"
                >
                  x
                </text>
                <line
                  x1="0"
                  y1="0"
                  x2={-30 * sinY}
                  y2={-30 * cosY * sinP}
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <text
                  x={-36 * sinY}
                  y={-36 * cosY * sinP}
                  fill="#10b981"
                  fontSize="10"
                  fontWeight="bold"
                >
                  y
                </text>
                <line x1="0" y1="0" x2="0" y2="-30" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="-36" fill="#3b82f6" fontSize="10" fontWeight="bold">
                  z
                </text>
              </g>
            </svg>

            {/* Rotasi & Kemiringan Controls */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4 px-3 text-xs text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Putar (Yaw): {yaw}°</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={yaw}
                  onChange={(e) => setYaw(Number(e.target.value))}
                  className="h-1.5 w-24 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">Kemiringan (Pitch): {pitch}°</span>
                <input
                  type="range"
                  min="10"
                  max="75"
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="h-1.5 w-24 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          /* 2D Contour Heatmap & Medan Gradien */
          <div className="flex flex-col items-center gap-3 p-2">
            <div
              className="relative rounded-xl border border-outline-variant bg-surface shadow-inner p-1"
              role="application"
              /* biome-ignore lint/a11y/noNoninteractiveTabindex: peta kontur menerima input keyboard panah */
              tabIndex={0}
              aria-label="Peta kontur elevasi z(x, y). Gunakan panah kiri/kanan/atas/bawah untuk menjelajahi titik data."
              onMouseMove={handleContourMove}
              onMouseLeave={() => setHoveredCell(null)}
              onKeyDown={handleContourKeyDown}
              onFocus={() => {
                if (!focusCell) {
                  const start = { i: 0, j: ySteps.length - 1 };
                  setFocusCell(start);
                  setHoveredCell(cellAt(start.i, start.j));
                }
              }}
            >
              <svg
                ref={contourSvgRef}
                width={360}
                height={360}
                viewBox="0 0 360 360"
                className="cursor-crosshair overflow-hidden rounded-lg"
                role="img"
                aria-label="Peta kontur elevasi z(x, y)"
              >
                {/* Heatmap Grid Cells */}
                {ySteps.map((_yVal, j) => {
                  const cellHeight = 360 / ySteps.length;
                  const sy = 360 - (j + 1) * cellHeight;
                  return xSteps.map((_xVal, i) => {
                    const cellWidth = 360 / xSteps.length;
                    const sx = i * cellWidth;
                    const z = values[j][i];
                    const normZ = (z - zMin) / zSpan;
                    return (
                      <rect
                        key={`cell-${j}-${i}`}
                        x={sx}
                        y={sy}
                        width={cellWidth + 0.5}
                        height={cellHeight + 0.5}
                        fill={Number.isNaN(z) ? "#1e293b" : elevationColor(normZ)}
                      />
                    );
                  });
                })}

                {/* Penanda sel aktif (keyboard) */}
                {focusCell && (
                  <rect
                    x={focusCell.i * (360 / xSteps.length)}
                    y={360 - (focusCell.j + 1) * (360 / ySteps.length)}
                    width={360 / xSteps.length}
                    height={360 / ySteps.length}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    pointerEvents="none"
                  />
                )}

                {/* Sumbu koordinat tengah (x=0, y=0) */}
                <line
                  x1="180"
                  y1="0"
                  x2="180"
                  y2="360"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="180"
                  x2="360"
                  y2="180"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Tanda label sumbu */}
                <text x="345" y="174" fill="white" fontSize="10" fontWeight="bold">
                  x
                </text>
                <text x="186" y="14" fill="white" fontSize="10" fontWeight="bold">
                  y
                </text>
              </svg>
            </div>

            {/* Hover Indicator Box */}
            <div className="min-h-[32px] text-center" aria-live="polite">
              {hoveredCell ? (
                <div className="inline-flex items-center gap-3 rounded-full bg-surface-container px-4 py-1 text-xs font-mono font-semibold text-on-surface shadow-sm">
                  <span>x = {hoveredCell.x.toFixed(2)}</span>
                  <span>y = {hoveredCell.y.toFixed(2)}</span>
                  <span className="text-primary font-bold">z = {hoveredCell.z.toFixed(3)}</span>
                </div>
              ) : (
                <span className="text-xs text-on-surface-variant">
                  Arahkan kursor atau gunakan panah keyboard pada peta untuk membaca nilai elevasi
                  z(x, y).
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Kartu Informasi Multivariabel (Turunan Parsial, Gradien, Hessian) */}
      <div className="grid gap-3 border-t border-outline-variant bg-surface-container/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-surface p-3 border border-outline-variant">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Turunan Parsial ∂z/∂x
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-on-surface truncate">
            {partialX.pretty}
          </p>
        </div>

        <div className="rounded-xl bg-surface p-3 border border-outline-variant">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Turunan Parsial ∂z/∂y
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-on-surface truncate">
            {partialY.pretty}
          </p>
        </div>

        <div className="rounded-xl bg-surface p-3 border border-outline-variant">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Vektor Gradien ∇f
          </p>
          <p
            className="mt-1 font-mono text-sm font-bold text-primary truncate"
            title={gradientPretty}
          >
            {gradientPretty}
          </p>
        </div>

        <div className="rounded-xl bg-surface p-3 border border-outline-variant">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Determinan Hessian (D)
          </p>
          <p
            className="mt-1 font-mono text-sm font-bold text-on-surface truncate"
            title={hessianDeterminant}
          >
            {hessianDeterminant}
          </p>
        </div>
      </div>
    </Card>
  );
}

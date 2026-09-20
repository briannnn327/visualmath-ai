"use client";

import { useMemo, useRef, useState } from "react";
import type { MathPoint, MathSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------- utilitas skala ---------- */

function niceStep(range: number, target = 8): number {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function ticks(min: number, max: number, target?: number): number[] {
  const step = niceStep(max - min, target);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

function fmtTick(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

interface MathPlotProps {
  segments: MathSegment[];
  derivativeSegments?: MathSegment[];
  points?: MathPoint[];
  derivativePoints?: MathPoint[];
  roots?: MathPoint[];
  extrema?: Array<{ kind: "akar" | "min" | "maks"; x: number; y: number }>;
  expressionLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  height?: number;
  showDerivative?: boolean;
  interactive?: boolean;
  className?: string;
}

const M = 38;
const B = 30;
const T = 14;
const R = 18;

export function MathPlot({
  segments,
  derivativeSegments,
  points,
  roots,
  extrema,
  expressionLabel,
  xDomain,
  yDomain,
  height = 360,
  showDerivative = false,
  interactive = true,
  className,
}: MathPlotProps) {
  const W = 720;

  const { xMin, xMax, yMin, yMax, xTicks, yTicks, plotW, plotH } = useMemo(() => {
    const flat = points ?? segments.flatMap((s) => s.points);
    let x0 = xDomain?.[0] ?? (flat.length ? Math.min(...flat.map((p) => p.x)) : -8);
    let x1 = xDomain?.[1] ?? (flat.length ? Math.max(...flat.map((p) => p.x)) : 8);
    if (x1 - x0 < 1e-6) {
      x0 -= 1;
      x1 += 1;
    }
    const allY = flat.filter((p) => Number.isFinite(p.y)).map((p) => p.y);
    let y0 = yDomain?.[0] ?? (allY.length ? Math.min(...allY) : -10);
    let y1 = yDomain?.[1] ?? (allY.length ? Math.max(...allY) : 10);
    const padY = Math.max(1, (y1 - y0) * 0.12);
    y0 -= padY;
    y1 += padY;
    const plotW = W - M - R;
    const plotH = height - T - B;
    return {
      xMin: x0,
      xMax: x1,
      yMin: y0,
      yMax: y1,
      xTicks: ticks(x0, x1),
      yTicks: ticks(y0, y1, 6),
      plotW,
      plotH,
    };
  }, [segments, points, xDomain, yDomain, height]);

  const sx = (x: number) => M + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => T + ((yMax - y) / (yMax - yMin)) * plotH;

  /* center kursor */
  const svgWrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!interactive || !svgWrap.current) return;
    const rect = svgWrap.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    const x = xMin + ((px - M) / plotW) * (xMax - xMin);
    const y = yMax - ((py - T) / plotH) * (yMax - yMin);
    setHover({ x, y });
  };

  const lineFor = (p: MathPoint[]) => {
    const parts: string[] = [];
    for (const { x, y } of p) {
      if (!Number.isFinite(y) || Math.abs(y) > 1e9) continue;
      parts.push(`${sx(x)},${sy(y)}`);
    }
    return parts.join(" ");
  };

  const xZero = sx(0);
  const yZero = sy(0);
  const showXAxis = xMin <= 0 && xMax >= 0;
  const showYAxis = yMin <= 0 && yMax >= 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !points || points.length === 0) return;
    const [left, right] =
      e.key === "ArrowLeft"
        ? [-1, undefined]
        : e.key === "ArrowRight"
          ? [undefined, 1]
          : [undefined, undefined];
    const idx =
      left !== undefined || right !== undefined
        ? points.findIndex((p) => Math.abs(p.x - (hover?.x ?? Number.NEGATIVE_INFINITY)) < 1e-9)
        : -1;
    const step = (left ?? right ?? 0) as 1 | -1;
    const target = idx === -1 ? 0 : Math.min(points.length - 1, Math.max(0, idx + step));
    e.preventDefault();
    setHover({ x: points[target].x, y: points[target].y });
  };

  const hoverNearest = useMemo(() => {
    if (!hover || !points || points.length === 0) return null;
    let best = points[0];
    let dist = Infinity;
    for (const p of points) {
      const d = Math.abs(p.x - hover.x);
      if (d < dist) {
        dist = d;
        best = p;
      }
    }
    return { x: best.x, y: best.y, isPoint: Math.abs(best.x - hover.x) < 0.05 };
  }, [hover, points]);

  return (
    <div
      ref={svgWrap}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-outline-variant bg-surface",
        className,
      )}
      style={{ width: "100%" }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      /* biome-ignore lint/a11y/noNoninteractiveTabindex: widget menerima input keyboard panah */
      tabIndex={0}
      role="application"
      aria-label="Grafik interaktif. Gunakan panah kiri/kanan untuk menjelajahi titik."
    >
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block w-full"
        role="img"
        aria-label={expressionLabel ?? "Grafik fungsi matematika"}
      >
        {/* grid */}
        {yTicks.map((v) => (
          <line
            key={`gy${v}`}
            x1={M}
            x2={W - R}
            y1={sy(v)}
            y2={sy(v)}
            stroke="var(--color-outline-variant)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}
        {xTicks.map((v) => (
          <line
            key={`gx${v}`}
            x1={sx(v)}
            x2={sx(v)}
            y1={T}
            y2={T + plotH}
            stroke="var(--color-outline-variant)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}

        {/* sumbu */}
        {showYAxis && (
          <line
            x1={xZero}
            x2={xZero}
            y1={T}
            y2={T + plotH}
            stroke="var(--color-on-surface-variant)"
            strokeWidth={1.4}
          />
        )}
        {showXAxis && (
          <line
            x1={M}
            x2={W - R}
            y1={yZero}
            y2={yZero}
            stroke="var(--color-on-surface-variant)"
            strokeWidth={1.4}
          />
        )}

        {/* label tick */}
        {xTicks.map((v) => {
          const nearZero = Math.abs(v) < 1e-9;
          return (
            <text
              key={`tx${v}`}
              x={sx(v)}
              y={height - 10}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-on-surface-variant)"
            >
              {nearZero ? "0" : fmtTick(v)}
            </text>
          );
        })}
        {yTicks.map((v) => {
          const nearZero = Math.abs(v) < 1e-9;
          return (
            <text
              key={`ty${v}`}
              x={M - 8}
              y={sy(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-on-surface-variant)"
            >
              {nearZero ? "0" : fmtTick(v)}
            </text>
          );
        })}

        {/* kurva turunan (garis putus) */}
        {showDerivative &&
          (derivativeSegments ?? []).map((seg, i) => (
            <polyline
              key={`d${i}`}
              points={lineFor(seg.points)}
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth={2}
              strokeDasharray="5 5"
              opacity={0.8}
            />
          ))}

        {/* kurva fungsi */}
        {segments.map((seg, i) => (
          <polyline
            key={`f${i}`}
            points={lineFor(seg.points)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
        ))}

        {/* akar */}
        {(roots ?? []).map((r, i) => (
          <g key={`r${i}`}>
            <circle
              cx={sx(r.x)}
              cy={sy(r.y)}
              r={5}
              fill="var(--color-surface)"
              stroke="var(--color-secondary)"
              strokeWidth={2}
            />
          </g>
        ))}

        {/* ekstrem */}
        {(extrema ?? []).map((e, i) => (
          <g key={`e${i}`}>
            <circle
              cx={sx(e.x)}
              cy={sy(e.y)}
              r={5.5}
              fill="var(--color-tertiary)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
            <text
              x={sx(e.x) + 8}
              y={sy(e.y) - 8}
              fontSize={11}
              fontWeight={700}
              fill="var(--color-tertiary)"
            >
              {e.kind === "min" ? "min" : e.kind === "maks" ? "maks" : "akar"}
            </text>
          </g>
        ))}

        {/* crosshair interaktif */}
        {interactive && hover && hoverNearest && (
          <g pointerEvents="none">
            <line
              x1={sx(hoverNearest.x)}
              x2={sx(hoverNearest.x)}
              y1={T}
              y2={T + plotH}
              stroke="var(--color-on-surface-variant)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <circle
              cx={sx(hoverNearest.x)}
              cy={sy(hoverNearest.y)}
              r={4.5}
              fill="var(--color-primary)"
              stroke="var(--color-surface)"
              strokeWidth={1.6}
            />
            <g
              transform={`translate(${Math.min(Math.max(sx(hoverNearest.x) + 10, M), W - R - 120)}, ${Math.max(sy(hoverNearest.y) - 46, T)})`}
            >
              <rect
                width={118}
                height={38}
                rx={10}
                fill="var(--color-surface)"
                stroke="var(--color-outline-variant)"
              />
              <text x={12} y={17} fontSize={11} fill="var(--color-on-surface-variant)">
                x = {hoverNearest.x.toFixed(3)}
              </text>
              <text x={12} y={32} fontSize={11} fontWeight={700} fill="var(--color-on-surface)">
                y = {Number.isFinite(hoverNearest.y) ? hoverNearest.y.toFixed(3) : "—"}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* legenda */}
      <div className="absolute left-3 top-2 flex flex-wrap items-center gap-3 text-[11px] font-medium text-on-surface-variant">
        {expressionLabel && (
          <span className="rounded-full bg-surface-container-high px-2.5 py-1 math-mono">
            {expressionLabel}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-primary" /> f(x)
        </span>
        {showDerivative && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded border-t-2 border-dashed border-secondary" /> f′(x)
          </span>
        )}
        {(roots?.length ?? 0) > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-secondary bg-surface" />{" "}
            akar
          </span>
        )}
        {(extrema?.length ?? 0) > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-tertiary" /> ekstrem
          </span>
        )}
      </div>
    </div>
  );
}

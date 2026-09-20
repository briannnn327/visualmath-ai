"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useSystemLogs, useSystemMetrics } from "@/lib/hooks/queries";

const SEVERITY_OPTIONS = ["Semua", "Info", "Warning", "Error"] as const;
type SeverityLabel = (typeof SEVERITY_OPTIONS)[number];

const SEVERITY_MAP: Record<SeverityLabel, string | undefined> = {
  Semua: undefined,
  Info: "info",
  Warning: "warning",
  Error: "error",
};

const LOG_DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  timeStyle: "short",
  dateStyle: "short",
});

function formatUptime(pct: number): string {
  const totalMinutes = Math.round(pct * 14.4);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}

function StatCard({ icon, label, value, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}>
          <Icon name={icon} size={22} className="text-on-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-on-surface-variant">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-16" />
          ) : (
            <p className="mt-0.5 truncate font-display text-2xl font-extrabold tabular text-on-surface">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "ai.configure": "Konfigurasi AI",
  "auth.login": "Login",
  "auth.logout": "Logout",
  "formula.analyze": "Analisis Formula",
  "exercise.complete": "Selesai Latihan",
  "material.create": "Buat Materi",
  "material.update": "Edit Materi",
  "material.delete": "Hapus Materi",
  "user.create": "Buat Pengguna",
  "user.update": "Edit Pengguna",
  "user.delete": "Hapus Pengguna",
  "class.create": "Buat Kelas",
  "class.update": "Edit Kelas",
  "class.delete": "Hapus Kelas",
  "system.seed": "Seed Database",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

const severityVariant: Record<string, "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  error: "error",
};

export default function AdminMonitoringPage() {
  const [severityLabel, setSeverityLabel] = useState<SeverityLabel>("Semua");
  const { data: metrics, isLoading: metricsLoading } = useSystemMetrics();
  const { data: logs, isLoading: logsLoading } = useSystemLogs(SEVERITY_MAP[severityLabel]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Monitoring Sistem</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Pantau metrik performa dan log aktivitas sistem secara real-time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="users"
          label="Total Pengguna"
          value={metrics?.totalUsers ?? 0}
          color="bg-primary"
          loading={metricsLoading}
        />
        <StatCard
          icon="trend_up"
          label="Aktif Hari Ini"
          value={metrics?.activeToday ?? 0}
          color="bg-tertiary"
          loading={metricsLoading}
        />
        <StatCard
          icon="database"
          label="Request Hari Ini"
          value={metrics?.requestsToday ?? 0}
          color="bg-secondary"
          loading={metricsLoading}
        />
        <StatCard
          icon="warning"
          label="Error Hari Ini"
          value={metrics?.errorsToday ?? 0}
          color="bg-error"
          loading={metricsLoading}
        />
        <StatCard
          icon="bell"
          label="Peringatan Hari Ini"
          value={metrics?.warningsToday ?? 0}
          color="bg-warning"
          loading={metricsLoading}
        />
        <StatCard
          icon="gauge"
          label="Rata-rata Response"
          value={metricsLoading ? "—" : `${metrics?.avgResponseMs ?? 0} ms`}
          color="bg-primary"
          loading={metricsLoading}
        />
        <StatCard
          icon="monitoring"
          label="Uptime"
          value={metricsLoading ? "—" : formatUptime(metrics?.uptime ?? 0)}
          color="bg-success"
          loading={metricsLoading}
        />
        <StatCard
          icon="database"
          label="Model"
          value={metrics?.models ?? 0}
          color="bg-secondary"
          loading={metricsLoading}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display text-lg font-bold text-on-surface">Log Aktivitas</h3>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((label) => (
                <Button
                  key={label}
                  variant={severityLabel === label ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setSeverityLabel(label)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Icon name="info" size={40} className="text-on-surface-variant/40" />
              <p className="text-sm text-on-surface-variant">
                Tidak ada log ditemukan untuk filter ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container">
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Waktu</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Pelaku</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Aksi</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Target</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                        {LOG_DATE_FMT.format(new Date(log.createdAt))}
                      </td>
                      <td className="px-4 py-3 font-medium text-on-surface">{log.actorName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{actionLabel(log.action)}</Badge>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-on-surface-variant">
                        {log.target}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant[log.severity]}>{log.severity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { getAdminData, getCurrentPublicUser } from "@/lib/server/data";
import { homeFor } from "@/components/layout/nav";
import { roleLabel } from "@/lib/schemas";
import { cn, formatNumber } from "@/lib/utils";
import type { ActivityLog, Role } from "@/lib/types";

const logDateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatLogTime(iso: string): string {
  return logDateFormat.format(new Date(iso));
}

const severityVariant: Record<ActivityLog["severity"], "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  error: "error",
};

const severityIcon: Record<ActivityLog["severity"], IconName> = {
  info: "info",
  warning: "warning",
  error: "shield",
};

const severityBg: Record<ActivityLog["severity"], string> = {
  info: "bg-info-container text-on-info-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
};

const userStatCards: Array<{ role: Role; icon: IconName; color: string }> = [
  { role: "mahasiswa", icon: "users", color: "text-primary" },
  { role: "dosen", icon: "school", color: "text-secondary" },
  { role: "admin", icon: "shield", color: "text-tertiary" },
];

export default async function AdminDashboardPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(homeFor(user.role));

  const data = await getAdminData();
  const { metrics, trend, logs } = data;

  const TW = 560;
  const TH = 190;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 26;
  const PAD_LEFT = 30;
  const PAD_RIGHT = 10;
  const INNER_W = TW - PAD_LEFT - PAD_RIGHT;
  const INNER_H = TH - PAD_TOP - PAD_BOTTOM;
  const maxY = Math.max(1, ...trend.map((p) => p.requests));
  const slot = INNER_W / trend.length;
  const barW = Math.min(40, slot * 0.55);

  const linePoints = trend.map((p, i) => {
    const x = PAD_LEFT + slot * i + slot / 2;
    const y = PAD_TOP + INNER_H - Math.min(p.correct, 100) * (INNER_H / 100);
    return { x, y, key: p.label };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Dashboard Admin</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ringkasan pengguna, konten, dan aktivitas platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {userStatCards.map(({ role, icon, color }) => (
          <Card key={role}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <Icon name={icon} size={18} className={color} />
                {roleLabel[role]}
              </div>
              <span className="font-display text-3xl font-extrabold tabular text-on-surface">
                {formatNumber(metrics.userCounts[role])}
              </span>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="route" size={18} className="text-info" />
              Kelas
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(metrics.classCount)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="database" size={18} className="text-primary" />
              Topik & Soal
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-extrabold tabular text-on-surface">
                {formatNumber(metrics.topicCount)}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                + {formatNumber(metrics.questionCount)} soal
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="sparkle" size={18} className="text-secondary" />
              AI Requests Hari Ini
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(metrics.aiRequestsToday)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="clock" size={18} className="text-success" />
              Pengguna Aktif Hari Ini
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(metrics.activeUsersToday)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="star" size={18} className="text-warning" />
              Rata-rata XP Hari Ini
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(metrics.avgXpToday)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktivitas 7 Hari Terakhir</CardTitle>
            <CardDescription>Permintaan AI per hari dan tingkat jawaban benar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
                Permintaan AI
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-secondary)" }}
                />
                Tingkat Benar
              </span>
            </div>
            <svg
              viewBox={`0 0 ${TW} ${TH}`}
              role="img"
              aria-label="Grafik aktivitas 7 hari terakhir"
              className="h-auto w-full"
            >
              {trend.map((p, i) => {
                const x = PAD_LEFT + slot * i + slot / 2;
                const h = (p.requests / maxY) * INNER_H;
                const y = PAD_TOP + INNER_H - h;
                return (
                  <g key={p.label}>
                    <rect
                      x={x - barW / 2}
                      y={y}
                      width={barW}
                      height={h}
                      rx={4}
                      fill="var(--color-primary)"
                    />
                    <text
                      x={x}
                      y={y - 5}
                      textAnchor="middle"
                      className="fill-on-surface-variant text-[10px] font-semibold tabular"
                    >
                      {formatNumber(p.requests)}
                    </text>
                    <text
                      x={x}
                      y={TH - 8}
                      textAnchor="middle"
                      className="fill-on-surface-variant text-[10px] font-medium"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
              <polyline
                points={linePoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
                fill="none"
                stroke="var(--color-secondary)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {linePoints.map((p) => (
                <circle
                  key={`${p.key}-dot`}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill="var(--color-secondary)"
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Log aktivitas sistem terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-5">
            {logs.length === 0 && (
              <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                Belum ada aktivitas tercatat.
              </p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    severityBg[log.severity]
                  )}
                >
                  <Icon name={severityIcon[log.severity]} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-on-surface">
                      {log.actorName}
                    </span>
                    <Badge variant={severityVariant[log.severity]}>{log.action}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">{log.target}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-on-surface-variant/80">
                    <Icon name="clock" size={11} />
                    {formatLogTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
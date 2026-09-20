import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatNumber } from "@/lib/utils";
import { getCurrentUser, getDosenStats } from "@/lib/server/data";
import type { ActivityKind } from "@/lib/types";

const kindIcon: Record<ActivityKind, IconName> = {
  formula: "sparkle",
  quiz: "target",
  lesson: "book",
  graph: "monitoring",
  auth: "lock",
  system: "gauge",
};

export default async function DosenDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getDosenStats(user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">
          Halo, {firstName}!
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ringkasan kelas dan aktivitas mahasiswa Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="school" size={18} className="text-primary" />
              Total Kelas
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(data.stats.classes)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="users" size={18} className="text-secondary" />
              Total Mahasiswa
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(data.stats.students)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="menu_book" size={18} className="text-tertiary" />
              Materi Tersedia
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {formatNumber(data.stats.materials)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <Icon name="trend_up" size={18} className="text-success" />
              Rata-rata Mastery
            </div>
            <span className="font-display text-3xl font-extrabold tabular text-on-surface">
              {data.stats.avgMastery}%
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daftar Kelas</CardTitle>
            <CardDescription>Kelas yang Andaampu beserta statistiknya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {data.classes.length === 0 && (
              <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                Belum ada kelas yang diampu.
              </p>
            )}
            {data.classes.map((k) => (
              <Link
                key={k.id}
                href="/dosen/progres"
                className="group block rounded-2xl border border-outline-variant bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{k.nama}</p>
                    <p className="truncate text-xs text-on-surface-variant">{k.kode}</p>
                  </div>
                  <Badge variant="neutral">{k.studentCount} mahasiswa</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={k.avgMastery}
                    color={k.avgMastery >= 70 ? "success" : k.avgMastery >= 40 ? "primary" : "warning"}
                    showLabel
                  />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Kegiatan mahasiswa terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-5">
            {data.recent.length === 0 && (
              <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                Belum ada aktivitas dari mahasiswa.
              </p>
            )}
            {data.recent.map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary-container text-on-secondary-container">
                  <Icon name={kindIcon[h.kind]} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-on-surface">{h.title}</p>
                  <p className="line-clamp-2 text-xs text-on-surface-variant">{h.summary}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant/80">
                    <Icon name="clock" size={11} />
                    {formatDate(h.createdAt)}
                    {h.xp ? ` · +${h.xp} XP` : ""}
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

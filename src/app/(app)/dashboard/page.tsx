import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { formatDate, topicIcon } from "@/lib/utils";
import { getCurrentPublicUser, getStudentData } from "@/lib/server/data";
import { homeFor } from "@/components/layout/nav";
import type { ActivityKind } from "@/lib/types";

const statCards: Array<{ label: string; icon: IconName; get: (d: Awaited<ReturnType<typeof getStudentData>>) => string | number; tone: string }> = [
  { label: "Total XP", icon: "star", get: (d) => d.stats.totalXp, tone: "text-warning" },
  { label: "Topik Inti", icon: "trophy", get: (d) => d.stats.core, tone: "text-primary" },
  { label: "Soal Terpecahkan", icon: "check-circle", get: (d) => d.stats.solvedTotal, tone: "text-success" },
  { label: "Streak", icon: "flame", get: (d) => `${d.stats.streak} hari`, tone: "text-tertiary" },
];

const kindIcon: Record<ActivityKind, IconName> = {
  formula: "sparkle",
  quiz: "target",
  lesson: "book",
  graph: "monitoring",
  auth: "lock",
  system: "gauge",
};

export default async function DashboardPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const data = await getStudentData(user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Sapaan */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Halo, {firstName}! 👋</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            {data.kelasName && (
              <Badge variant="secondary">
                <Icon name="school" size={12} />
                {data.kelasName}
              </Badge>
            )}
            {data.classRank !== undefined && (
              <Badge variant="info">Peringkat #{data.classRank} di kelas</Badge>
            )}
          </p>
        </div>
        <Link href="/latihan">
          <Button icon="play">Mulai Latihan</Button>
        </Link>
      </div>

      {/* Rekomendasi */}
      {data.recommendation && (
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-on-primary shadow-soft">
          <div className="absolute inset-0 bg-hero-grid opacity-30" aria-hidden />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
              <Icon name="lightbulb" size={22} />
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">Rekomendasi untukmu</p>
              <p className="font-display font-bold">
                Latih topik <span className="underline decoration-white/50">{data.recommendation.title}</span>
              </p>
              <p className="mt-0.5 text-sm text-white/90">{data.recommendation.reason}</p>
            </div>
            <Link href={`/latihan?topic=${data.recommendation.topicId}`} className="shrink-0">
              <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                Mulai
                <Icon name="arrow-right" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <Icon name={s.icon} size={18} className={s.tone} />
                {s.label}
              </div>
              <span className="font-display text-3xl font-extrabold tabular text-on-surface">{s.get(data)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Penguasaan topik */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Penguasaan Topik</CardTitle>
              <CardDescription>Persentase penguasaan per topik berdasarkan latihan.</CardDescription>
            </div>
            <Badge variant="primary">{data.topics.filter((t) => t.progress.attempts > 0).length}/{data.topics.length} dimulai</Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {data.topics.map(({ topic, progress }) => (
              <div key={topic.id} className="group rounded-2xl border border-outline-variant bg-surface p-4 transition-colors hover:border-primary/40">
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                    <Icon name={topicIcon(topic.icon)} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{topic.title}</p>
                    <p className="truncate text-xs text-on-surface-variant">{topic.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular text-on-surface-variant">
                    {progress.attempts > 0 ? `${progress.mastery}%` : "—"}
                  </span>
                  <Link href={`/latihan?topic=${topic.id}`}>
                    <Button variant="ghost" size="sm" icon="play" aria-label={`Latihan ${topic.title}`} />
                  </Link>
                </div>
                <Progress
                  value={progress.mastery}
                  color={progress.mastery >= 70 ? "success" : progress.mastery >= 40 ? "primary" : "warning"}
                  showLabel={false}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Aktivitas terbaru */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Lima kegiatan belajarmu terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-5">
            {data.recent.length === 0 && (
              <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                Belum ada aktivitas. Mulai latihan pertamamu sekarang!
              </p>
            )}
            {data.recent.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container">
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

      {/* Rata-rata dan saran */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex items-center justify-center gap-6 p-6">
            <Ring value={data.stats.avgMastery} size={132} label={`${data.stats.avgMastery}%`} sublabel="Penguasaan" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-on-surface">Rata-rata mastery</p>
              <p className="text-on-surface-variant">Dari topik yang sudah kamu kerjakan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tips Belajar</CardTitle>
            <CardDescription>Panduan singkat memaksimalkan VisualMath AI.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
            {[
              { icon: "route" as IconName, text: "Mulai dari topik dengan penguasaan terendah lalu naik bertahap." },
              { icon: "eye" as IconName, text: "Gunakan Grafik Interaktif untuk memahami bentuk fungsi sebelum menghitung." },
              { icon: "target" as IconName, text: "Kerjakan 5 soal per sesi agar algoritma adaptif dapat menyesuaikan level." },
              { icon: "flame" as IconName, text: "Pertahankan streak harian untuk XP dan rekomendasi yang lebih akurat." },
            ].map((t) => (
              <div key={t.text} className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container/50 p-3.5">
                <Icon name={t.icon} size={18} className="mt-0.5 text-primary" />
                <p className="text-sm text-on-surface-variant">{t.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
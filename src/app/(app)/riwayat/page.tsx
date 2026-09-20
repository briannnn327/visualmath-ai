import { redirect } from "next/navigation";
import { homeFor } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { getCurrentPublicUser, getStudentHistory } from "@/lib/server/data";
import type { ActivityKind, HistoryRecord } from "@/lib/types";
import { activityKindLabel } from "@/lib/utils";

const kindIcon: Record<ActivityKind, IconName> = {
  formula: "auto_awesome",
  quiz: "quiz",
  lesson: "menu_book",
  graph: "monitoring",
  auth: "login",
  system: "memory",
};

const kindBadge: Record<
  ActivityKind,
  "primary" | "success" | "info" | "warning" | "neutral" | "error"
> = {
  formula: "primary",
  quiz: "success",
  lesson: "info",
  graph: "warning",
  auth: "neutral",
  system: "error",
};

function dateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86400000);
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default async function RiwayatPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const history = await getStudentHistory(user.id);
  const grouped = new Map<string, HistoryRecord[]>();
  for (const h of history) {
    const label = dateLabel(h.createdAt);
    const list = grouped.get(label) ?? [];
    list.push(h);
    grouped.set(label, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Riwayat Aktivitas</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Semua aktivitas belajarmu di VisualMath AI.
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="history" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada aktivitas</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Mulai kerjakan latihan atau coba AI Explainer untuk memunculkan riwayat di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        [...grouped.entries()].map(([label, items]) => (
          <section key={label}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {label}
            </h3>
            <div className="space-y-2">
              {items.map((h) => (
                <Card key={h.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
                      <Icon name={kindIcon[h.kind]} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-on-surface">{h.title}</p>
                        <Badge variant={kindBadge[h.kind]}>
                          {activityKindLabel[h.kind] ?? h.kind}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">
                        {h.summary}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {h.score !== undefined && (
                        <p className="font-display text-sm font-extrabold tabular text-on-surface">
                          {h.score}
                        </p>
                      )}
                      {h.xp !== undefined && h.xp > 0 && (
                        <Badge variant="success">
                          <Icon name="star" size={11} /> +{h.xp}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

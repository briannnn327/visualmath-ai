"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useClasses, useClassRoster } from "@/lib/hooks/queries";
import { formatDate, formatNumber } from "@/lib/utils";
import type { RosterRowPublic } from "@/lib/hooks/queries";
import type { Topic } from "@/lib/types";

function masteryColor(m: number): "success" | "warning" | "error" {
  if (m >= 70) return "success";
  if (m >= 40) return "warning";
  return "error";
}

export default function DosenProgresPage() {
  const { data: classes, isLoading } = useClasses();
  const [kelasId, setKelasId] = useState<string>("");
  const rosterQuery = useClassRoster(kelasId || null);
  const roster = useMemo(() => rosterQuery.data ?? [], [rosterQuery.data]);

  const topics = useMemo<Topic[]>(() => {
    const seen = new Map<string, Topic>();
    for (const row of roster) {
      for (const t of row.rows) {
        if (!seen.has(t.topic.id)) seen.set(t.topic.id, t.topic);
      }
    }
    return [...seen.values()];
  }, [roster]);

  const summary = useMemo(() => {
    if (roster.length === 0)
      return { students: 0, avg: 0, xp: 0, activeTopics: 0 };
    return {
      students: roster.length,
      avg: Math.round((roster.reduce((s, r) => s + r.avg, 0) / roster.length) * 10) / 10,
      xp: roster.reduce((s, r) => s + r.xp, 0),
      activeTopics: topics.length,
    };
  }, [roster, topics]);

  if (isLoading) return <SkeletonCard />;

  const classesList = classes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Progres Mahasiswa</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Pantau penguasaan topik setiap mahasiswa di kelasmu.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <label htmlFor="kelas" className="mb-1.5 block text-sm font-semibold text-on-surface">
            Pilih kelas
          </label>
          <Select id="kelas" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            <option value="">— Pilih kelas —</option>
            {classesList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} ({k.kode}) — {k.studentCount} siswa
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {!kelasId && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="users" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Pilih kelas terlebih dahulu</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Roster dan penguasaan topik mahasiswa akan tampil di sini.
            </p>
          </CardContent>
        </Card>
      )}

      {kelasId && rosterQuery.isFetching && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {kelasId && !rosterQuery.isFetching && roster.length === 0 && (
        <Card>
          <CardContent className="p-5 text-sm text-on-surface-variant">
            Belum ada mahasiswa dengan data progres di kelas ini.
          </CardContent>
        </Card>
      )}

      {kelasId && roster.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Siswa", value: formatNumber(summary.students), icon: "users" },
              { label: "Rata-rata Mastery", value: `${summary.avg}%`, icon: "target" },
              { label: "Total XP", value: formatNumber(summary.xp), icon: "star" },
              { label: "Topik Dipelajari", value: formatNumber(summary.activeTopics), icon: "route" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    <Icon name={s.icon as never} size={13} />
                    {s.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold tabular text-on-surface">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container">
                    <th className="px-5 py-3 text-left font-semibold text-on-surface">Siswa</th>
                    {topics.map((t) => (
                      <th key={t.id} className="px-4 py-3 text-left font-semibold text-on-surface">
                        {t.title}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Rata-rata</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">XP</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Terakhir Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {roster
                    .slice()
                    .sort((a, b) => b.avg - a.avg)
                    .map((row: RosterRowPublic) => (
                      <tr
                        key={row.user.id}
                        className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: row.user.color }}
                            >
                              {row.user.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join("")}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-on-surface">{row.user.name}</p>
                              {row.user.nim && (
                                <p className="text-xs text-on-surface-variant">{row.user.nim}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {topics.map((t) => {
                          const cell = row.rows.find((r) => r.topic.id === t.id);
                          return (
                            <td key={t.id} className="px-4 py-3">
                              {cell ? (
                                <div className="w-32">
                                  <Progress value={cell.mastery} color={masteryColor(cell.mastery)} />
                                </div>
                              ) : (
                                <span className="text-on-surface-variant/40">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <Badge variant={row.avg >= 70 ? "success" : row.avg >= 40 ? "warning" : "error"}>
                            {row.avg}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold tabular text-on-surface">
                          {formatNumber(row.xp)}
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">
                          {formatDate(row.lastActive)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
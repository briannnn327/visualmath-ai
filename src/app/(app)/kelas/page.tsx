import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getKelasById, getUserById } from "@/lib/db/store";
import { getCurrentUser, getKelasRoster } from "@/lib/server/data";
import { formatNumber } from "@/lib/utils";

export const metadata = {
  title: "Kelas Saya | VisualMath AI",
  description: "Informasi kelas, dosen pengampu, dan daftar anggota kelas.",
};

export default async function KelasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect("/dashboard");

  if (!user.kelasId) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Kelas</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">Kelas Saya</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kamu belum tergabung ke kelas manapun.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="users" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum bergabung kelas</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Minta kode kelas ke dosen pengampu, lalu gabung melalui halaman Profil.
            </p>
            <Link href="/profil">
              <Button icon="user">Ke Halaman Profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kelas = await getKelasById(user.kelasId);
  if (!kelas) redirect("/profil");

  const [dosen, roster] = await Promise.all([getUserById(kelas.dosenId), getKelasRoster(kelas)]);

  const sortedRoster = [...roster].sort((a, b) => {
    if (b.avg !== a.avg) return b.avg - a.avg;
    return a.user.name.localeCompare(b.user.name);
  });

  const classAvg =
    roster.length > 0
      ? Math.round((roster.reduce((sum, r) => sum + r.avg, 0) / roster.length) * 10) / 10
      : 0;

  const totalXp = roster.reduce((sum, r) => sum + r.xp, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Kelas</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">Kelas Saya</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Informasi kelas, dosen pengampu, dan rekap anggota kelas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detail Kelas</CardTitle>
            <CardDescription>Identitas kelas tempat kamu belajar saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Nama Kelas
              </p>
              <p className="mt-1 font-display text-lg font-bold text-on-surface">{kelas.nama}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Kode Kelas
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-[0.4em] text-primary">
                {kelas.kode}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Dosen Pengampu
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-on-primary"
                  style={{ backgroundColor: dosen?.color ?? "var(--color-primary)" }}
                >
                  {(dosen?.name ?? "D")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join("")}
                </span>
                <div>
                  <p className="font-semibold text-on-surface">
                    {dosen?.name ?? "Belum terdaftar"}
                  </p>
                  <p className="text-sm text-on-surface-variant">{dosen?.email ?? "-"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistik Kelas</CardTitle>
            <CardDescription>Ringkasan performa keseluruhan anggota.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Jumlah Mahasiswa
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-on-surface">
                  {formatNumber(roster.length)}
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon name="users" size={18} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Rata-rata Penguasaan
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-on-surface">
                  {classAvg}%
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-success-container text-on-success-container">
                <Icon name="chart-line" size={18} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Total XP Kelas
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-on-surface">
                  {formatNumber(totalXp)}
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning-container text-on-warning-container">
                <Icon name="award" size={18} />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Anggota Kelas</CardTitle>
            <CardDescription>Daftar mahasiswa berdasarkan rata-rata penguasaan.</CardDescription>
          </div>
          <Badge variant="outline">{roster.length} Anggota</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-outline-variant">
            {sortedRoster.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Icon name="users" size={22} />
                <p className="text-sm text-on-surface-variant">Belum ada anggota lain di kelas ini.</p>
              </div>
            ) : (
              sortedRoster.map((row, index) => {
                const isMe = row.user.id === user.id;
                return (
                  <div key={row.user.id} className="flex items-center gap-3 p-4">
                    <span className="w-6 text-center text-sm font-semibold text-on-surface-variant">
                      {index + 1}
                    </span>
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-on-primary"
                      style={{ backgroundColor: row.user.color }}
                    >
                      {row.user.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-on-surface">
                          {isMe ? "Kamu" : row.user.name}
                        </p>
                        {isMe && <Badge variant="primary">Kamu</Badge>}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {row.user.nim ? `NIM: ${row.user.nim}` : row.user.email}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-on-surface">{row.xp} XP</p>
                      <p className="text-xs text-on-surface-variant">Total XP</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-on-surface">{row.avg}%</p>
                      <p className="text-xs text-on-surface-variant">Rata-rata</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

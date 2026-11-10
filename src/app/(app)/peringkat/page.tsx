import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getClassLeaderboard, getCurrentPublicUser, getGlobalLeaderboard } from "@/lib/server/data";

export const metadata = {
  title: "Peringkat | VisualMath AI",
  description: "Peringkat mahasiswa berdasarkan performa belajar.",
};

type Scope = "global" | "class";

export default async function PeringkatPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const { scope: rawScope } = await searchParams;
  const scope: Scope = rawScope === "class" ? "class" : "global";

  const entries =
    scope === "class" && user.kelasId
      ? await getClassLeaderboard(user.kelasId)
      : scope === "global"
        ? await getGlobalLeaderboard()
        : [];

  const noClass = scope === "class" && !user.kelasId;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Peringkat</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">Peringkat</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Peringkat mahasiswa berdasarkan rata-rata penguasaan topik dan total XP.
        </p>
      </div>

      {/* Filter scope */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/peringkat?scope=global"
          className={
            scope === "global"
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              : "inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40"
          }
        >
          <Icon name="users" size={14} />
          Global
        </Link>
        <Link
          href="/peringkat?scope=class"
          className={
            scope === "class"
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              : "inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40"
          }
        >
          <Icon name="users" size={14} />
          Kelas Saya
        </Link>
      </div>

      {noClass ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="users" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">
              Belum bergabung kelas
            </h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Untuk melihat peringkat per kelas, gabung ke kelas terlebih dahulu melalui halaman
              Profil.
            </p>
            <Link href="/profil">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Ke Halaman Profil
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-warning-container text-on-warning-container">
              <Icon name="award" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada data</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              {scope === "class"
                ? "Belum ada anggota kelas dengan progres latihan."
                : "Belum ada mahasiswa dengan progres latihan."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{scope === "class" ? "Peringkat Kelas" : "Peringkat Global"}</CardTitle>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                {entries.length} mahasiswa · diurutkan berdasarkan penguasaan lalu XP
              </p>
            </div>
            <Badge variant="outline">{entries.length} peserta</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-outline-variant">
              {entries.map((e) => {
                const isMe = e.userId === user.id;
                const medal =
                  e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : null;
                return (
                  <div
                    key={e.userId}
                    className={
                      isMe
                        ? "flex items-center gap-3 bg-primary/5 p-4"
                        : "flex items-center gap-3 p-4"
                    }
                  >
                    <span className="w-8 text-center font-display text-sm font-extrabold text-on-surface-variant">
                      {medal ?? `#${e.rank}`}
                    </span>
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-on-primary"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-on-surface">
                          {isMe ? "Kamu" : e.name}
                        </p>
                        {isMe && <Badge variant="primary">Kamu</Badge>}
                        {e.rank <= 3 && !isMe && <Badge variant="warning">Top {e.rank}</Badge>}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {e.nim ? `NIM: ${e.nim}` : "Tanpa NIM"}
                        {scope === "global" && e.kelasNama ? ` · ${e.kelasNama}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-on-surface">{e.totalXp} XP</p>
                      <p className="text-xs text-on-surface-variant">{e.topicCount} topik</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-on-surface">{e.avgMastery}%</p>
                      <p className="text-xs text-on-surface-variant">Penguasaan</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCurrentPublicUser, getStudentMaterials } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";

export default async function MateriPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const materials = await getStudentMaterials(user);
  const kelasName = materials[0]?.kelasName;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Materi Kuliah</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Materi & contoh soal dari kelasmu. Sumber yang sama dipakai AI sebagai referensi.
          </p>
        </div>
        {kelasName && (
          <Badge variant="primary">
            <Icon name="school" size={12} />
            {kelasName}
          </Badge>
        )}
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
              <Icon name="book" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada materi</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              {kelasName
                ? "Dosen belum menambahkan materi untuk kelasmu. Cek lagi nanti."
                : "Gabung ke kelas terlebih dahulu agar materi dosen muncul di sini."}
            </p>
            {!kelasName && (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Gabung kelas dari beranda
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {materials.map((material) => (
            <Link key={material.id} href={`/materi/${material.id}`} className="block">
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                      <Icon name={material.type === "soal" ? "target" : "book"} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={material.type === "soal" ? "warning" : "info"}>
                          {material.type === "soal" ? "Contoh Soal" : "Materi"}
                        </Badge>
                        {material.topicTitle && (
                          <Badge variant="neutral">{material.topicTitle}</Badge>
                        )}
                      </div>
                      <h3 className="mt-2 font-display text-lg font-bold text-on-surface">
                        {material.title}
                      </h3>
                    </div>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
                    {material.content}
                  </p>
                  <p className="mt-auto pt-1 text-xs text-on-surface-variant">
                    Diperbarui {formatDate(material.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

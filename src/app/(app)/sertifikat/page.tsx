import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { listCertificatesForUser } from "@/lib/db/store";
import { getCurrentPublicUser } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";

export default async function CertificatesPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");

  const certificates = await listCertificatesForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Sertifikat Saya</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Sertifikat otomatis dari kuis adaptif yang berhasil kamu tuntaskan (skor ≥ 70).
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="award" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada sertifikat</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Selesaikan kuis adaptif dengan skor minimal 70 untuk mendapatkan sertifikat otomatis.
            </p>
            <Link
              href="/latihan"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
            >
              <Icon name="play" size={16} />
              Mulai Latihan
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-container text-on-warning-container">
                    <Icon name="award" size={20} />
                  </span>
                  <Badge variant="success">{c.score}/100</Badge>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-on-surface">
                  {c.topicTitle}
                </h3>
                <p className="text-xs text-on-surface-variant">Kode: {c.code}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Icon name="clock" size={12} />
                  {formatDate(c.issuedAt.toISOString())}
                </p>
                <Link
                  href={`/sertifikat/${c.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <Icon name="document" size={15} />
                  Lihat sertifikat
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

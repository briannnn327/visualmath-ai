import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCertificateById } from "@/lib/db/store";
import { getCurrentPublicUser } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const cert = await getCertificateById(id);
  if (!cert || (cert.userId !== user.id && user.role !== "admin")) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">
            Sertifikat Pencapaian
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Bukti kelulusan kuis adaptif untuk topik {cert.topicTitle}.
          </p>
        </div>
        <a href={`/api/certificates/${cert.id}`} target="_blank" rel="noreferrer">
          <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90">
            <Icon name="document" size={16} />
            Buka PDF
          </span>
        </a>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-brand-gradient p-8 text-on-primary">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">VisualMath AI</p>
          <p className="mt-4 font-display text-3xl font-extrabold">Sertifikat Pencapaian</p>
        </div>
        <CardContent className="space-y-5 p-8">
          <div>
            <p className="text-sm text-on-surface-variant">Diberikan kepada</p>
            <p className="font-display text-2xl font-extrabold text-primary">
              {cert.recipientName}
            </p>
            {cert.identity && (
              <p className="text-sm text-on-surface-variant">Identitas: {cert.identity}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-container/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Topik
              </p>
              <p className="mt-1 font-semibold text-on-surface">{cert.topicTitle}</p>
            </div>
            <div className="rounded-2xl bg-surface-container/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Skor
              </p>
              <p className="mt-1 font-display text-xl font-extrabold text-success">
                {cert.score}/100
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                XP
              </p>
              <p className="mt-1 font-display text-xl font-extrabold text-warning">{cert.xp}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
            <Badge variant="primary">Kode: {cert.code}</Badge>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={14} />
              Diterbitkan {formatDate(cert.issuedAt.toISOString())}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

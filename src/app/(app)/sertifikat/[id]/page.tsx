import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CertificateActions } from "@/components/certificate/certificate-actions";
import { CertificateTemplate } from "@/components/certificate/certificate-template";
import { Icon } from "@/components/ui/icon";
import { certificateVerificationUrl, formatCertificateDate } from "@/lib/certificate";
import { getCertificateById } from "@/lib/db/store";
import { createCertificateQrMatrix } from "@/lib/server/certificate-qr";
import { getCurrentPublicUser } from "@/lib/server/data";
import { appBaseUrl } from "@/lib/server/email";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const cert = await getCertificateById(id);
  if (!cert || (cert.userId !== user.id && user.role !== "admin")) notFound();

  const verificationUrl = certificateVerificationUrl(appBaseUrl(), cert.code);
  const qr = createCertificateQrMatrix(verificationUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Sertifikat digital
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">
            Sertifikat Pencapaian
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Bukti kelulusan kuis adaptif untuk topik {cert.topicTitle}. Preview dan file unduhan
            memakai template serta data yang sama.
          </p>
        </div>
        <CertificateActions certificateId={cert.id} />
      </div>

      <section
        aria-label="Preview sertifikat"
        className="rounded-3xl border border-[#1c3c70] bg-[#07152F] p-2 shadow-float sm:p-4"
      >
        <div className="overflow-x-auto pb-1">
          <div className="mx-auto min-w-[760px] max-w-[1400px]">
            <CertificateTemplate
              recipientName={cert.recipientName}
              topicTitle={cert.topicTitle}
              score={cert.score}
              xp={cert.xp}
              code={cert.code}
              issuedAt={cert.issuedAt}
              verificationUrl={verificationUrl}
              qr={qr}
            />
          </div>
        </div>
      </section>
      <p className="text-xs text-on-surface-variant sm:hidden">
        Geser sertifikat ke kanan/kiri untuk melihat seluruh bagian.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-outline-variant bg-surface-container/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Penerima
          </p>
          <p className="mt-1 font-semibold text-on-surface">{cert.recipientName}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Skor akhir
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-success">{cert.score}/100</p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Diterbitkan
          </p>
          <p className="mt-1 font-semibold text-on-surface">
            {formatCertificateDate(cert.issuedAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            ID sertifikat
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-primary">{cert.code}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary-lighter/40 p-4">
        <p className="flex items-start gap-2 text-sm text-on-surface-variant">
          <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-primary" />
          Halaman verifikasi publik hanya menampilkan nama penerima, topik, skor, tanggal, dan kode
          sertifikat.
        </p>
        <Link
          href={verificationUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Buka halaman verifikasi
          <Icon name="arrow-right" size={15} />
        </Link>
      </div>
    </div>
  );
}

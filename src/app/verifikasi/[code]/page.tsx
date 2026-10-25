import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { formatCertificateDate, isCertificateCode } from "@/lib/certificate";
import { getCertificateByCode } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifikasi Sertifikat",
  description: "Halaman verifikasi sertifikat pencapaian VisualMath AI.",
  robots: { index: false, follow: false },
};

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  if (!isCertificateCode(normalized)) notFound();

  const cert = await getCertificateByCode(normalized);
  if (!cert) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07152F] px-4 py-8 text-[#F5F8FF] sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-[34rem] w-[34rem] rounded-full bg-[#2589FF]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-[36rem] w-[36rem] rounded-full bg-[#A58BFF]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#57D9FF_1px,transparent_1px),linear-gradient(90deg,#57D9FF_1px,transparent_1px)] [background-size:52px_52px]"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2589FF] to-[#0B1F46] ring-1 ring-[#57D9FF]/40">
              <Icon name="functions" size={24} />
            </span>
            <span>
              <span className="block font-display text-base font-extrabold tracking-wide text-[#F5F8FF]">
                VISUALMATH AI
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#57D9FF]">
                Learning System
              </span>
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[#57D9FF]/30 px-4 py-2 text-sm font-semibold text-[#F5F8FF] transition-colors hover:bg-[#57D9FF]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57D9FF]"
          >
            Masuk
          </Link>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-[#E8CB83]/35 bg-[#0B1F46]/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="h-1.5 bg-gradient-to-r from-[#2589FF] via-[#57D9FF] to-[#E8CB83]" />
          <div className="p-6 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-[#57D9FF]/40 bg-[#57D9FF]/10 text-[#57D9FF]">
                <Icon name="check-circle" size={32} />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#57D9FF]">
                Sertifikat terverifikasi
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#F5F8FF] sm:text-4xl">
                Sertifikat ini valid
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#F5F8FF]/65">
                Dokumen diterbitkan oleh VisualMath AI Learning System untuk pencapaian pembelajaran
                matematika berikut.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-[#F5F8FF]/10 bg-[#07152F]/55 p-5 sm:p-7">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.26em] text-[#F5F8FF]/45">
                Diberikan kepada
              </p>
              <p className="mt-2 text-center font-display text-2xl font-extrabold text-[#E8CB83] sm:text-3xl">
                {cert.recipientName}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#F5F8FF]/10 bg-[#F5F8FF]/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F8FF]/45">
                    Topik
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-[#F5F8FF]">
                    {cert.topicTitle}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#F5F8FF]/10 bg-[#F5F8FF]/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F8FF]/45">
                    Skor akhir
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-[#57D9FF]">
                    {cert.score}/100
                  </p>
                </div>
                <div className="rounded-2xl border border-[#F5F8FF]/10 bg-[#F5F8FF]/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F8FF]/45">
                    Diterbitkan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#F5F8FF]">
                    {formatCertificateDate(cert.issuedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#57D9FF]/20 bg-[#57D9FF]/5 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F8FF]/45">
                  ID sertifikat
                </span>
                <span className="font-mono text-sm font-bold tracking-wider text-[#57D9FF]">
                  {cert.code}
                </span>
              </div>
            </div>

            <p className="mt-5 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-[#F5F8FF]/45">
              <Icon name="shield" size={15} className="mt-0.5 shrink-0" />
              Demi privasi, halaman ini tidak menampilkan email, NIM, atau data akun penerima.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#2589FF] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#57D9FF] hover:text-[#07152F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57D9FF]"
          >
            <Icon name="arrow-left" size={16} />
            Kembali ke VisualMath AI
          </Link>
          <span className="text-[#F5F8FF]/35">VisualMath AI Learning System</span>
        </div>
      </div>
    </main>
  );
}

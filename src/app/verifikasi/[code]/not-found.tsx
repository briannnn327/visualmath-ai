import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function CertificateNotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#07152F] px-4 py-10 text-[#F5F8FF]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-[#2589FF]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#A58BFF]/15 blur-3xl"
      />
      <div className="relative w-full max-w-lg rounded-[2rem] border border-[#F5F8FF]/12 bg-[#0B1F46]/80 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#E8CB83]/35 bg-[#E8CB83]/10 text-[#E8CB83]">
          <Icon name="shield" size={30} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Sertifikat tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#F5F8FF]/60">
          Kode verifikasi tidak valid, salah ketik, atau sertifikat sudah tidak tersedia. Periksa
          kembali QR code pada sertifikat asli.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#2589FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#57D9FF] hover:text-[#07152F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57D9FF]"
          >
            <Icon name="arrow-left" size={16} />
            Ke halaman utama
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#57D9FF]/30 px-5 py-2.5 text-sm font-semibold text-[#F5F8FF] transition-colors hover:bg-[#57D9FF]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57D9FF]"
          >
            Masuk
          </Link>
        </div>
      </div>
    </main>
  );
}

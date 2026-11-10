"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/components/ui/toast";

export function EmailVerificationBanner({ verified }: { verified: boolean }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  if (verified) return null;

  async function resend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Gagal mengirim ulang.");
      setSent(true);
      pushToast("success", "Tautan verifikasi baru telah dikirim ke emailmu.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal mengirim ulang.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-container/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning-container text-on-warning-container">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-on-surface">Email belum terverifikasi</p>
          <p className="text-sm text-on-surface-variant">
            Verifikasi alamat emailmu agar akunmu aman dan notifikasi terkirim.{" "}
            {sent ? "Tautan baru sudah dikirim." : "Belum menerima email?"}
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" loading={sending} onClick={resend} disabled={sent}>
        Kirim ulang tautan
      </Button>
    </div>
  );
}

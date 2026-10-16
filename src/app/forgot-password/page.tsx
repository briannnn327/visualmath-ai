"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/services/api";

interface ForgotResponse {
  message: string;
  expiresAt?: string;
  token?: string;
  resetPath?: string;
}

export default function ForgotPasswordPage() {
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgotResponse | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<ForgotResponse>("/api/auth/forgot-password", { email });
      setResult(res);
      pushToast("success", "Permintaan reset diproses");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Gagal memproses permintaan";
      setError(message);
      pushToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-surface">
      <div className="absolute inset-0 bg-hero-grid" aria-hidden />
      <header className="relative z-10 flex h-16 items-center px-6 lg:px-10">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-extrabold text-on-surface">
              Lupa kata sandi?
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Masukkan email akunmu. Kami akan membuat tautan untuk mengatur ulang kata sandi.
            </p>
          </div>

          {result ? (
            <div className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 shadow-card">
              <div className="flex items-start gap-3 rounded-2xl bg-secondary-container/60 p-4 text-on-surface">
                <Icon name="mail" size={20} className="mt-0.5 shrink-0 text-secondary" />
                <p className="text-sm">{result.message}</p>
              </div>

              {result.resetPath && (
                <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Mode demo — tautan reset
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Layanan email belum aktif pada demo ini, jadi tautan ditampilkan langsung.
                  </p>
                  <Link
                    href={result.resetPath}
                    className="mt-3 inline-flex items-center gap-1.5 break-all font-semibold text-primary hover:underline"
                  >
                    <Icon name="refresh" size={16} />
                    Atur ulang kata sandi sekarang
                  </Link>
                </div>
              )}

              <Link
                href="/login"
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 shadow-card"
            >
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="nama@students.uns.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container"
                >
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {!loading && <Icon name="send" size={18} />}
                Kirim tautan reset
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Ingat kata sandimu?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { Logo } from "@/components/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { PASSWORD_MIN_LENGTH } from "@/lib/schemas";
import { ApiError, api } from "@/lib/services/api";
import { cn } from "@/lib/utils";

interface ResetResponse {
  message: string;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const pushToast = useToastStore((s) => s.push);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ResetResponse>("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      setDone(true);
      pushToast("success", res.message);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Gagal mengatur ulang kata sandi";
      setError(message);
      pushToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error-container text-on-error-container">
          <Icon name="warning" size={26} />
        </span>
        <h2 className="font-display text-xl font-bold text-on-surface">
          Token reset tidak ditemukan
        </h2>
        <p className="text-sm text-on-surface-variant">
          Buka tautan reset dari email, atau minta tautan baru.
        </p>
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
        >
          <Icon name="mail" size={18} />
          Minta tautan baru
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
          <Icon name="check-circle" size={26} />
        </span>
        <h2 className="font-display text-xl font-bold text-on-surface">Kata sandi diperbarui</h2>
        <p className="text-sm text-on-surface-variant">
          Kata sandi akunmu berhasil diubah. Silakan masuk memakai kata sandi baru.
        </p>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
        >
          <Icon name="login" size={18} />
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 shadow-card"
    >
      <Field
        label="Kata sandi baru"
        htmlFor="password"
        required
        hint={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
      >
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            <Icon name={show ? "eye-off" : "eye"} size={18} />
          </button>
        </div>
      </Field>

      <Field label="Konfirmasi kata sandi" htmlFor="confirmPassword" required>
        <Input
          id="confirmPassword"
          type={show ? "text" : "password"}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {!loading && <Icon name="save" size={18} />}
        Simpan kata sandi baru
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
              Atur ulang kata sandi
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Buat kata sandi baru untuk akunmu.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="rounded-3xl border border-outline-variant bg-surface p-6 text-center text-sm text-on-surface-variant shadow-card">
                Memuat…
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Kembali ke{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              halaman masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

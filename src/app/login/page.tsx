"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/brand";
import { homeFor } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/store/authStore";
import type { Role } from "@/lib/types";

const demos: Array<{ label: string; role: Role; email: string; password: string }> = [
  {
    label: "Mahasiswa",
    role: "mahasiswa",
    email: "maria@students.uns.ac.id",
    password: "maria123",
  },
  { label: "Dosen", role: "dosen", email: "dosen@visualmath.ai", password: "dosen123" },
  { label: "Admin", role: "admin", email: "admin@visualmath.ai", password: "admin123" },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(homeFor(user.role));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal masuk";
      setError(message);
      pushToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  function fill(demo: (typeof demos)[number]) {
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
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
              Masuk ke akunmu
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Lanjutkan perjalanan belajar kalkulusmu bersama VisualMath AI.
            </p>
          </div>

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

            <Field label="Kata Sandi" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
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
              Masuk
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container/60 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <Icon name="sparkle" size={14} className="text-primary" />
              Akun demo — klik untuk mengisi
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demos.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fill(d)}
                  className="rounded-xl border border-outline-variant bg-surface px-2 py-2 text-center transition-colors hover:border-primary hover:bg-primary-lighter"
                >
                  <span className="block text-sm font-bold text-primary">{d.label}</span>
                  <span className="block truncate text-[11px] text-on-surface-variant">
                    {d.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Daftar sebagai mahasiswa
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

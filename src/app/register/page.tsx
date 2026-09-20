"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Field } from "@/components/ui/input";
import { useAuthStore, type RegisterPayload } from "@/lib/store/authStore";
import { useToastStore } from "@/components/ui/toast";
import { homeFor } from "@/components/layout/nav";
import type { Role } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const pushToast = useToastStore((s) => s.push);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nim, setNim] = useState("");
  const [prodi, setProdi] = useState("");
  const [role, setRole] = useState<Role>("mahasiswa");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        name,
        email,
        password,
        confirmPassword: confirm,
        role,
        nim: role === "mahasiswa" ? nim || undefined : undefined,
        prodi: prodi || undefined,
      };
      const user = await register(payload);
      pushToast("success", "Akun berhasil dibuat. Selamat datang!");
      router.push(homeFor(user.role));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mendaftar";
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
            <h1 className="font-display text-3xl font-extrabold text-on-surface">Buat akun baru</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Bergabung sebagai mahasiswa atau tenaga pengajar.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-outline-variant bg-surface p-6 shadow-card">
            <Field label="Nama Lengkap" htmlFor="name" required>
              <Input
                id="name"
                placeholder="Nama sesuai identitas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
              />
            </Field>

            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                placeholder="nama@kampus.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Peran" hint="Dosen mengelola kelas dan materi; mahasiswa belajar & berlatih.">
              <div className="grid grid-cols-2 gap-2">
                {(["mahasiswa", "dosen"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={
                      role === r
                        ? "flex items-center justify-center gap-2 rounded-xl bg-primary-container px-3 py-2.5 text-sm font-bold text-on-primary-container ring-1 ring-inset ring-primary/40"
                        : "flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                    }
                  >
                    <Icon name={r === "dosen" ? "school" : "user"} size={16} />
                    {r === "dosen" ? "Dosen" : "Mahasiswa"}
                  </button>
                ))}
              </div>
            </Field>

            {(role === "mahasiswa" || nim || true) && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="NIM" htmlFor="nim">
                  <Input id="nim" placeholder="V3925xxx" value={nim} onChange={(e) => setNim(e.target.value)} />
                </Field>
                <Field label="Program Studi" htmlFor="prodi">
                  <Input id="prodi" placeholder="D3 Teknik Informatika" value={prodi} onChange={(e) => setProdi(e.target.value)} />
                </Field>
              </div>
            )}

            <Field label="Kata Sandi" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  placeholder="Minimal 4 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
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

            <Field label="Ulangi Kata Sandi" htmlFor="confirm" required>
              <Input
                id="confirm"
                type={show ? "text" : "password"}
                placeholder="Ulangi kata sandi"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>

            {error && (
              <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {!loading && <Icon name="check-circle" size={18} />}
              Daftar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
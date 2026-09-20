"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useProfile, useUpdateProfile } from "@/lib/hooks/queries";
import { useToastStore } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";
import { roleLabel } from "@/lib/schemas";
import type { PublicUser } from "@/lib/types";

function initials(user: PublicUser) {
  return user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export default function ProfilPage() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const pushToast = useToastStore((s) => s.push);

  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [prodi, setProdi] = useState("");
  const [password, setPassword] = useState("");
  const [dirty, setDirty] = useState(false);

  const user = profile.data?.user;

  function fill(u: PublicUser) {
    setName(u.name);
    setNim(u.nim ?? "");
    setProdi(u.prodi ?? "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) {
      pushToast("info", "Tidak ada perubahan");
      return;
    }
    try {
      await update.mutateAsync({ name, nim: nim || undefined, prodi: prodi || undefined, password: password || undefined });
      setPassword("");
      setDirty(false);
      pushToast("success", "Profil berhasil diperbarui");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal memperbarui profil");
    }
  }

  if (profile.isPending) return <SkeletonCard />;
  if (profile.isError || !user) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-error">{profile.error?.message ?? "Gagal memuat profil"}</CardContent>
      </Card>
    );
  }

  if (!dirty && (name !== user.name || nim !== (user.nim ?? "") || prodi !== (user.prodi ?? ""))) fill(user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-on-surface">Profil</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Kelola identitas dan kata sandi akunmu.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl font-display text-2xl font-extrabold text-white"
            style={{ backgroundColor: user.color }}
          >
            {initials(user)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-extrabold text-on-surface">{user.name}</h3>
              <Badge variant="primary">{roleLabel[user.role]}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-on-surface-variant">{user.email}</p>
            {profile.data?.kelas && (
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {profile.data.kelas.nama} · {profile.data.kelas.kode}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [profile.data.stats.totalXp, "XP Total", "star"],
          [profile.data.stats.topicsStarted, "Topik Dimulai", "route"],
          [profile.data.stats.solved, "Soal Terjawab", "task_alt"],
          [profile.data.stats.quizzes, "Kuis Selesai", "quiz"],
        ].map(([value, label, icon]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                <Icon name={icon as never} size={13} />
                {label as string}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular text-on-surface">
                {formatNumber(value as number)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {profile.data.kelasProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Peringkat Kelas</CardTitle>
            <CardDescription>Berdasarkan rata-rata penguasaan topik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {[...profile.data.kelasProgress]
              .sort((a, b) => b.avg - a.avg)
              .map((row, i) => {
                const me = row.userId === user.id;
                return (
                  <div
                    key={row.userId}
                    className={
                      me
                        ? "rounded-xl bg-primary-container px-3 py-2"
                        : "rounded-xl px-3 py-2"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-on-surface">
                        {i + 1}. {me ? "Kamu" : "—"}
                        {me && <Badge className="ms-2" variant="primary">Kamu</Badge>}
                      </span>
                      <span className="font-display text-sm font-bold tabular text-on-surface">{row.avg}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-container-high">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, row.avg)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit Profil</CardTitle>
          <CardDescription>Perubahan disimpan ke akunmu.</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nama lengkap">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            {user.role === "mahasiswa" && (
              <>
                <Field label="NIM" hint="Nomor Induk Mahasiswa">
                  <Input
                    value={nim}
                    onChange={(e) => {
                      setNim(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="materi/13/2023"
                  />
                </Field>
                <Field label="Prodi">
                  <Input
                    value={prodi}
                    onChange={(e) => {
                      setProdi(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Pendidikan Matematika"
                  />
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              <Field label="Kata sandi baru" hint="Kosongkan jika tidak ingin mengganti">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setDirty(true);
                  }}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" loading={update.isPending} icon="save">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
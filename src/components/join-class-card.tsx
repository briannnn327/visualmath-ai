"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { useToastStore } from "@/components/ui/toast";
import { useJoinClass } from "@/lib/hooks/queries";

/** Kartu untuk mahasiswa bergabung ke kelas memakai kode yang diberikan dosen. */
export function JoinClassCard({ kelasName }: { kelasName?: string }) {
  const join = useJoinClass();
  const pushToast = useToastStore((s) => s.push);
  const [kode, setKode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { kelas } = await join.mutateAsync({ kode });
      pushToast("success", `Berhasil bergabung ke kelas ${kelas.nama}.`);
      setKode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal bergabung ke kelas");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gabung Kelas</CardTitle>
        <CardDescription>
          {kelasName
            ? `Kamu terdaftar di ${kelasName}. Masukkan kode lain untuk berpindah kelas.`
            : "Masukkan kode kelas dari dosenmu untuk terhubung."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Kode kelas" htmlFor="join-kode" error={error ?? undefined}>
              <Input
                id="join-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="MISAL: MA-101"
                autoComplete="off"
              />
            </Field>
          </div>
          <Button type="submit" icon="users" loading={join.isPending}>
            Gabung
          </Button>
        </form>
        {!kelasName && (
          <p className="mt-3 flex items-start gap-2 text-xs text-on-surface-variant">
            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
            Belum punya kode? Hubungi dosen atau admin untuk mendapatkan kode kelas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import { useRevokeSession, useSessions } from "@/lib/hooks/queries";
import { formatDate } from "@/lib/utils";

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Perangkat tidak dikenal";
  const ua = userAgent.toLowerCase();
  const os = ua.includes("windows")
    ? "Windows"
    : ua.includes("mac")
      ? "macOS"
      : ua.includes("android")
        ? "Android"
        : ua.includes("iphone") || ua.includes("ipad")
          ? "iOS"
          : ua.includes("linux")
            ? "Linux"
            : "Perangkat lain";
  const browser = ua.includes("edg")
    ? "Edge"
    : ua.includes("chrome")
      ? "Chrome"
      : ua.includes("firefox")
        ? "Firefox"
        : ua.includes("safari")
          ? "Safari"
          : "Browser";
  return `${browser} · ${os}`;
}

/** Manajemen sesi login aktif — pengguna dapat mencabut sesi lain. */
export function SessionManager() {
  const { data: sessions, isLoading } = useSessions();
  const revoke = useRevokeSession();
  const pushToast = useToastStore((s) => s.push);
  const router = useRouter();

  async function revokeOne(id: string) {
    try {
      await revoke.mutateAsync({ id });
      pushToast("success", "Sesi dicabut.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal mencabut sesi.");
    }
  }

  async function revokeAll() {
    if (!window.confirm("Cabut semua sesi (termasuk sesi ini)? Kamu perlu masuk kembali.")) return;
    try {
      await revoke.mutateAsync({ all: true });
      pushToast("success", "Semua sesi dicabut. Silakan masuk kembali.");
      router.push("/login");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal mencabut sesi.");
    }
  }

  const list = sessions ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Perangkat & Sesi Aktif</CardTitle>
          <CardDescription>Sesi yang sedang masuk ke akunmu.</CardDescription>
        </div>
        {list.filter((s) => !s.current).length > 1 && (
          <Button variant="outline" size="sm" onClick={revokeAll} disabled={revoke.isPending}>
            Cabut semua
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {isLoading && <SkeletonCard />}
        {!isLoading && list.length === 0 && (
          <p className="text-sm text-on-surface-variant">Tidak ada sesi aktif.</p>
        )}
        {list.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-2xl border border-outline-variant p-3.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-container text-on-surface-variant">
              <Icon name="shield" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                {deviceLabel(s.userAgent)}
                {s.current && <span className="text-xs font-bold text-success">· sesi ini</span>}
              </p>
              <p className="text-xs text-on-surface-variant">
                {s.ip ? `${s.ip} · ` : ""}
                Masuk {formatDate(s.createdAt)}
              </p>
            </div>
            {!s.current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revokeOne(s.id)}
                disabled={revoke.isPending}
              >
                Cabut
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/components/ui/toast";
import { useLeaveClass } from "@/lib/hooks/queries";

export function LeaveClassButton() {
  const leave = useLeaveClass();
  const router = useRouter();
  const pushToast = useToastStore((s) => s.push);

  async function handle() {
    if (!confirm("Yakin ingin keluar dari kelas? Kamu bisa bergabung lagi dengan kode kelas.")) {
      return;
    }
    try {
      await leave.mutateAsync();
      pushToast("success", "Berhasil keluar dari kelas.");
      router.push("/profil");
      router.refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal keluar dari kelas.");
    }
  }

  return (
    <Button variant="outline" size="sm" loading={leave.isPending} onClick={handle}>
      Keluar Kelas
    </Button>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  findEmailVerificationByHash,
  markEmailVerificationUsed,
  markUserEmailVerified,
} from "@/lib/db/store";
import { hashResetToken } from "@/lib/server/password";

export const metadata = {
  title: "Verifikasi Email | VisualMath AI",
  description: "Verifikasi alamat email akun VisualMath AI.",
};

export default async function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let status: "success" | "invalid" | "expired" | "used" | "missing" = "missing";
  if (token) {
    try {
      const record = await findEmailVerificationByHash(hashResetToken(token));
      if (!record) {
        status = "invalid";
      } else if (record.usedAt) {
        status = "used";
      } else {
        // eslint-disable-next-line react-hooks/purity
        const expired = record.expiresAt.getTime() < Date.now();
        if (expired) status = "expired";
        else {
          await markEmailVerificationUsed(record.id);
          await markUserEmailVerified(record.userId);
          status = "success";
        }
      }
    } catch {
      status = "invalid";
    }
  }

  const success = status === "success" || status === "used";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span
            className={
              success
                ? "grid h-14 w-14 place-items-center rounded-2xl bg-success-container text-on-success-container"
                : "grid h-14 w-14 place-items-center rounded-2xl bg-error-container text-on-error-container"
            }
          >
            <Icon name={success ? "check-circle" : "x"} size={28} />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-on-surface">
            {status === "success"
              ? "Email terverifikasi"
              : status === "used"
                ? "Email sudah terverifikasi"
                : status === "expired"
                  ? "Tautan kedaluwarsa"
                  : status === "invalid"
                    ? "Tautan tidak valid"
                    : "Token tidak ditemukan"}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {status === "success" || status === "used"
              ? "Alamat emailmu sudah terverifikasi. Kamu bisa masuk ke akun."
              : status === "expired"
                ? "Tautan verifikasi sudah kedaluwarsa. Minta tautan baru dari halaman akun."
                : "Tautan verifikasi tidak valid atau sudah dipakai."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/login">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Ke Halaman Masuk
              </button>
            </Link>
            <Link href="/dashboard">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface"
              >
                Ke Beranda
              </button>
            </Link>
          </div>
          {status === "success" && <Badge variant="success">Terverifikasi</Badge>}
        </CardContent>
      </Card>
    </div>
  );
}

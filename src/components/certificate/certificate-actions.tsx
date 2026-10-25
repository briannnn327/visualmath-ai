"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CertificateFormat = "pdf" | "png";

function filenameFromResponse(response: Response, format: CertificateFormat): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  return match?.[1] ?? `sertifikat.${format}`;
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = "Sertifikat gagal diunduh. Silakan coba lagi.";
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export function CertificateActions({
  certificateId,
  compact = false,
}: {
  certificateId: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<CertificateFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: CertificateFormat) {
    setPending(format);
    setError(null);
    try {
      const response = await fetch(`/api/certificates/${certificateId}?format=${format}`, {
        headers: { Accept: format === "png" ? "image/png" : "application/pdf" },
      });
      if (!response.ok) throw new Error(await errorMessage(response));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromResponse(response, format);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Sertifikat gagal diunduh. Silakan coba lagi.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size={compact ? "sm" : "md"}
          icon="document"
          loading={pending === "pdf"}
          disabled={pending !== null}
          aria-busy={pending === "pdf"}
          onClick={() => void download("pdf")}
        >
          {pending === "pdf" ? "Menyiapkan PDF…" : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "md"}
          icon="save"
          loading={pending === "png"}
          disabled={pending !== null}
          aria-busy={pending === "png"}
          onClick={() => void download("png")}
        >
          {pending === "png" ? "Menyiapkan PNG…" : "Download PNG"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

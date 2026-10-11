"use client";

/* eslint-disable @next/next/no-img-element -- pratinjau blob/data-URL; next/image tidak mendukung blob dinamis */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { useScanSoal, useTopics } from "@/lib/hooks/queries";
import type { Topic } from "@/lib/types";

type Phase = "idle" | "preview" | "detecting" | "done" | "error";

/** Scan foto soal: unggah/kamera → OCR + deteksi topik → arahkan ke latihan/AI. */
export function ScanSoalCard() {
  const router = useRouter();
  const topics = useTopics();
  const scan = useScanSoal();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [detected, setDetected] = useState<Topic | null>(null);
  const [manualId, setManualId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [expression, setExpression] = useState("");
  const [note, setNote] = useState("");

  const finalTopic = manualId ? (topics.data?.find((t) => t.id === manualId) ?? null) : detected;

  function pickFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar (JPG/PNG) yang berisi soal.");
      return;
    }
    setError(null);
    setPhase("preview");
    setDetected(null);
    setManualId("");
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function startDetect() {
    if (!preview) return;
    setPhase("detecting");
    setError(null);
    try {
      const { scan: result } = await scan.mutateAsync({ image: preview });
      const topic = result.topicId
        ? ((topics.data ?? []).find((t) => t.id === result.topicId) ?? null)
        : null;
      setDetected(topic);
      setManualId("");
      setConfidence(result.confidence);
      setExpression(result.analyzable ? result.expression : "");
      setNote(result.note);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses gambar. Coba lagi.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setPreview(null);
    setDetected(null);
    setManualId("");
    setConfidence(0);
    setExpression("");
    setNote("");
    setError(null);
  }

  return (
    <Card className="border-dashed bg-gradient-to-br from-primary-lighter/60 via-surface to-secondary-container/40">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-soft">
          <Icon name="camera" size={26} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-extrabold text-on-surface">Scan Foto Soal</h3>
            <Badge variant="tertiary">Baru</Badge>
          </div>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Foto soal Kalkulus II-mu (kamera atau galeri), sistem menebak topiknya lalu langsung
            arahkan ke latihan atau analisis.
          </p>
        </div>

        {phase === "idle" && (
          <div className="shrink-0">
            <Button icon="camera" onClick={() => inputRef.current?.click()}>
              Ambil / Pilih Foto
            </Button>
          </div>
        )}
      </CardContent>

      {phase !== "idle" && (
        <CardContent className="border-t border-outline-variant/60 p-5">
          {phase === "preview" && preview && (
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              {/* biome-ignore lint/performance/noImgElement: pratinjau blob URL lokal, bukan remote. */}
              <img
                src={preview}
                alt="Pratinjau foto soal"
                className="max-h-52 w-full max-w-72 rounded-2xl border border-outline-variant object-contain bg-surface shadow-soft"
              />
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-on-surface-variant">
                  Foto diterima. Tekan{" "}
                  <span className="font-semibold text-on-surface">Deteksi Topik</span> untuk menebak
                  materi soal dari katalog VisualMath.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button icon="scan" onClick={startDetect}>
                    Deteksi Topik
                  </Button>
                  <Button variant="ghost" icon="close" onClick={reset}>
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === "detecting" && (
            <div className="flex items-center gap-4">
              {preview && (
                // biome-ignore lint/performance/noImgElement: pratinjau blob URL lokal.
                <img
                  src={preview}
                  alt="Pratinjau foto soal"
                  className="max-h-36 w-48 rounded-2xl border border-outline-variant object-contain bg-surface shadow-soft"
                />
              )}
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Mengenali soal…</p>
                  <p className="text-xs text-on-surface-variant">
                    Membaca soal dengan AI dan mencocokkan katalog topik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {phase === "error" && (
            <p
              role="alert"
              className="rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container"
            >
              {error}
            </p>
          )}

          {phase === "done" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {preview && (
                  // biome-ignore lint/performance/noImgElement: pratinjau blob URL lokal.
                  <img
                    src={preview}
                    alt="Pratinjau foto soal"
                    className="max-h-40 w-52 rounded-2xl border border-outline-variant object-contain bg-surface shadow-soft"
                  />
                )}
                <div className="flex-1 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-outline-variant">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon name="check-circle" size={18} className="text-secondary" />
                    <p className="font-display text-xl font-extrabold text-on-surface">
                      {finalTopic ? "Topik Terdeteksi" : "Soal Terbaca"}
                    </p>
                  </div>
                  <h4 className="mt-2 font-display text-lg font-bold text-on-surface">
                    {finalTopic ? finalTopic.title : "Pilih topik secara manual"}
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    {finalTopic ? finalTopic.subtitle : "AI tidak yakin dengan topiknya."}
                  </p>
                  {expression && (
                    <p className="mt-2 rounded-lg bg-surface-variant px-3 py-2 font-mono text-sm text-on-surface">
                      {expression}
                    </p>
                  )}
                  {note && !expression && (
                    <p className="mt-2 text-sm text-on-surface-variant">{note}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {finalTopic && confidence > 0 && (
                      <Badge
                        variant={
                          confidence >= 90 ? "success" : confidence >= 70 ? "warning" : "info"
                        }
                        className="gap-1"
                      >
                        <Icon name="target" size={12} />
                        {confidence}% yakin
                      </Badge>
                    )}
                    {finalTopic && (
                      <span className="text-xs text-on-surface-variant">
                        {finalTopic.formulaCount} formula · {finalTopic.questionCount} soal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label htmlFor="manual-topik" className="block min-w-0 flex-1">
                  <span className="mb-1 block text-sm font-semibold text-on-surface">
                    Salah tebak? Pilih topik manual
                  </span>
                  <Select
                    id="manual-topik"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                  >
                    <option value="">Pakai hasil deteksi otomatis</option>
                    {(topics.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  icon="route"
                  onClick={() =>
                    router.push(finalTopic ? `/latihan?topic=${finalTopic.slug}` : "/latihan")
                  }
                >
                  Kerjakan Latihan Topik Ini
                </Button>
                <Button
                  variant="secondary"
                  icon="sparkle"
                  onClick={() =>
                    router.push(
                      expression
                        ? `/ai-explainer?expr=${encodeURIComponent(expression)}`
                        : finalTopic
                          ? `/ai-explainer?topicId=${finalTopic.id}`
                          : "/ai-explainer",
                    )
                  }
                >
                  Analisis di AI Explainer
                </Button>
                <Button variant="ghost" icon="refresh" onClick={reset}>
                  Scan Ulang
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

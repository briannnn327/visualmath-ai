"use client";

import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import { useAIConfig, useUpdateAIConfig } from "@/lib/hooks/queries";
import { type AIConfigInput, aiConfigSchema } from "@/lib/schemas";
import type { AIConfig } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const MODEL_OPTIONS = ["gemini-2.5-flash", "gpt-4o-mini", "claude-haiku", "llama-3.1-8b"];

interface FeatureDef {
  key: keyof AIConfigInput["features"];
  label: string;
  hint: string;
  icon: IconName;
}

const FEATURES: FeatureDef[] = [
  {
    key: "stepExplain",
    label: "Penjelasan Langkah",
    hint: "Uraikan langkah penyelesaian turunan secara berurutan.",
    icon: "lightbulb",
  },
  {
    key: "adaptiveQuiz",
    label: "Kuis Adaptif",
    hint: "Sesuaikan tingkat kesulitan soal latihan secara otomatis.",
    icon: "target",
  },
  {
    key: "graphSimulation",
    label: "Simulasi Grafik",
    hint: "Gambarkan fungsi, turunan, titik ekstrem, dan integral.",
    icon: "monitoring",
  },
];

function toInput(config: AIConfig): AIConfigInput {
  return {
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    features: { ...config.features },
    systemPrompt: config.systemPrompt,
  };
}

export default function AdminKonfigurasiPage() {
  const { data: config, isError, error, refetch } = useAIConfig();
  const update = useUpdateAIConfig();
  const pushToast = useToastStore((s) => s.push);

  const [draft, setDraft] = useState<AIConfigInput | null>(null);

  const form: AIConfigInput | null = config ? (draft ?? toInput(config)) : null;

  function updateForm(updater: (f: AIConfigInput) => AIConfigInput) {
    if (form) setDraft(updater(form));
  }

  const modelOptions =
    config && !MODEL_OPTIONS.includes(config.model)
      ? [config.model, ...MODEL_OPTIONS]
      : MODEL_OPTIONS;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    const parsed = aiConfigSchema.safeParse(form);
    if (!parsed.success) {
      pushToast("error", parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }

    try {
      const { config: saved } = await update.mutateAsync(parsed.data);
      setDraft(toInput(saved));
      pushToast("success", "Konfigurasi mesin analisis berhasil disimpan");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan konfigurasi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">
            Konfigurasi Mesin Analisis
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Atur parameter mesin analisis matematika VisualMath. Mesin bekerja berbasis aturan
            (rule-based) dan deterministik — tidak memanggil model bahasa eksternal.
          </p>
        </div>
        {config && (
          <Badge variant="neutral">
            <Icon name="clock" size={12} />
            Terakhir diperbarui: {formatDate(config.updatedAt)}
          </Badge>
        )}
      </div>

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-error">
              <Icon name="warning" size={16} />
              {error?.message ?? "Gagal memuat konfigurasi"}
            </p>
            <Button variant="outline" icon="refresh" onClick={() => void refetch()}>
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {form === null && !isError && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
        </div>
      )}

      {form && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Model &amp; Parameter</CardTitle>
                <CardDescription>
                  Profil analisis dan ambang keluaran mesin penalaran.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <Field
                  label="Model / Profil Analisis"
                  hint="Pilih profil yang tersedia, atau gunakan kustom bila diatur manual."
                >
                  <Select
                    value={form.model}
                    onChange={(e) => updateForm((f) => ({ ...f, model: e.target.value }))}
                  >
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-on-surface">Temperatur</span>
                    <Badge variant="neutral">{form.temperature.toFixed(2)}</Badge>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.temperature}
                    onChange={(e) =>
                      updateForm((f) => ({
                        ...f,
                        temperature: Math.round(Number(e.target.value) * 100) / 100,
                      }))
                    }
                    aria-label="Temperatur"
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-on-surface-variant/80">
                    Mengontrol variasi penyajian hasil mesin (0 = konsisten, 1 = bervariasi).
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-on-surface">Batas Output</span>
                    <Badge variant="neutral">{formatNumber(form.maxTokens)} token</Badge>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={8192}
                    step={50}
                    value={form.maxTokens}
                    onChange={(e) =>
                      updateForm((f) => ({ ...f, maxTokens: Math.round(Number(e.target.value)) }))
                    }
                    aria-label="Batas output"
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-on-surface-variant/80">
                    Batas panjang keluaran analisis dalam token (100–8192).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fitur Mesin</CardTitle>
                <CardDescription>Aktifkan modul analisis yang tersedia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {FEATURES.map((f) => {
                  const active = form.features[f.key];
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={f.label}
                      onClick={() =>
                        updateForm((v) => ({
                          ...v,
                          features: { ...v.features, [f.key]: !v.features[f.key] },
                        }))
                      }
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors",
                        active
                          ? "bg-primary-container text-on-primary-container ring-1 ring-inset ring-primary/30"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                          active ? "bg-on-primary-container/10" : "bg-surface-container",
                        )}
                      >
                        <Icon name={f.icon} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">{f.label}</span>
                          <span
                            className={cn(
                              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                              active ? "bg-primary" : "bg-outline-variant",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                                active ? "left-[18px]" : "left-0.5",
                              )}
                            />
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs opacity-80">{f.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Panduan Sistem</CardTitle>
              <CardDescription>
                Pedoman umum yang dipakai mesin saat menyusun penjelasan dan langkah.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <textarea
                value={form.systemPrompt}
                onChange={(e) => updateForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="Tuliskan panduan sistem di sini…"
                rows={8}
                maxLength={2000}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              <p className="mt-1.5 text-xs text-on-surface-variant/80">
                Minimal 5 karakter, maksimal 2000 karakter.
              </p>
            </CardContent>
          </Card>

          <CardFooter className="justify-between gap-3 p-5">
            <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Icon name="info" size={14} />
              Perubahan berlaku langsung untuk seluruh pengguna.
            </p>
            <Button type="submit" loading={update.isPending} icon="save">
              Simpan Konfigurasi
            </Button>
          </CardFooter>
        </form>
      )}
    </div>
  );
}

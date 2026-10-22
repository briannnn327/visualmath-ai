/* =========================================================
   Layanan email yang dapat dikonfigurasi (tanpa dependensi baru).

   Transport dipilih lewat env `VMA_EMAIL_TRANSPORT`:
   - "console" (default): cetak email ke log server. Aman untuk demo/pengujian.
   - "resend"           : kirim lewat HTTP API Resend (butuh RESEND_API_KEY).

   Selalu mengembalikan { delivered, transport } dan TIDAK pernah melempar —
   kegagalan email tidak boleh menggagalkan alur utama (login, reset, kuis).
   ========================================================= */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  delivered: boolean;
  transport: string;
  error?: string;
}

type Transport = "console" | "resend";

function getTransport(): Transport {
  const raw = (process.env.VMA_EMAIL_TRANSPORT || "console").toLowerCase();
  if (raw === "resend" && process.env.RESEND_API_KEY) return "resend";
  return "console";
}

export function emailFrom(): string {
  return process.env.VMA_EMAIL_FROM || "VisualMath AI <no-reply@visualmath.ai>";
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VMA_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendViaResend(msg: EmailMessage): Promise<EmailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      delivered: false,
      transport: "resend",
      error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
    };
  }
  return { delivered: true, transport: "resend" };
}

/** Kirim satu email. Tidak melempar; kegagalan dilaporkan lewat hasil. */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const transport = getTransport();
  try {
    if (transport === "resend") return await sendViaResend(msg);
    console.info(`[email:console] → ${msg.to} | ${msg.subject}\n${msg.text}\n---`);
    return { delivered: true, transport: "console" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[email] gagal mengirim:", message);
    return { delivered: false, transport, error: message };
  }
}

/** Template email reset kata sandi. */
export function passwordResetEmail(resetUrl: string, name: string): Omit<EmailMessage, "to"> {
  const safeName = name || "Pengguna";
  return {
    subject: "Reset kata sandi VisualMath AI",
    text: `Halo ${safeName},\n\nKami menerima permintaan reset kata sandi. Buka tautan berikut untuk membuat kata sandi baru:\n\n${resetUrl}\n\nTautan berlaku 30 menit. Jika kamu tidak meminta ini, abaikan email ini.\n\nSalam,\nVisualMath AI`,
    html: `<p>Halo <strong>${safeName}</strong>,</p><p>Kami menerima permintaan reset kata sandi. Klik tombol di bawah untuk membuat kata sandi baru:</p><p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#6750A4;color:#fff;text-decoration:none;font-weight:600">Reset Kata Sandi</a></p><p>Tautan berlaku 30 menit. Jika kamu tidak meminta ini, abaikan email ini.</p><p>Salam,<br/>VisualMath AI</p>`,
  };
}

/** Template email pemberitahuan umum (mis. hasil kuis / sertifikat). */
export function notificationEmail(
  title: string,
  body: string,
  href?: string,
): Omit<EmailMessage, "to"> {
  const link = href ? `${appBaseUrl()}${href}` : undefined;
  return {
    subject: `VisualMath AI — ${title}`,
    text: `${title}\n\n${body}${link ? `\n\n${link}` : ""}\n\nSalam,\nVisualMath AI`,
    html: `<h2>${title}</h2><p>${body}</p>${
      link
        ? `<p><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#6750A4;color:#fff;text-decoration:none;font-weight:600">Buka</a></p>`
        : ""
    }<p>Salam,<br/>VisualMath AI</p>`,
  };
}

/* =========================================================
   Helper notifikasi: tulis notifikasi in-app + (opsional) kirim email.
   Dibuat idempoten & tidak melempar agar aman dipanggil dari route handler.
   ========================================================= */
import { createNotification, getUserById } from "@/lib/db/store";
import { notificationEmail, sendEmail } from "@/lib/server/email";
import { uid } from "@/lib/utils";

export interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  kind?: "info" | "success" | "warning" | "error";
  href?: string;
  /** Kirim juga lewat email (default: false). */
  email?: boolean;
}

/** Buat notifikasi in-app untuk seorang pengguna; opsional dikirim via email. */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    await createNotification({
      id: uid("ntf-"),
      userId: input.userId,
      kind: input.kind ?? "info",
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    });

    if (input.email) {
      const user = await getUserById(input.userId);
      if (user?.email) {
        const template = notificationEmail(input.title, input.body, input.href);
        await sendEmail({ to: user.email, ...template });
      }
    }
  } catch (err) {
    console.warn("[notify] gagal membuat notifikasi:", err instanceof Error ? err.message : err);
  }
}

/** Kirim notifikasi ke banyak pengguna sekaligus. */
export async function notifyUsers(
  userIds: string[],
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  await Promise.all(userIds.map((userId) => notifyUser({ ...input, userId })));
}

/* =========================================================
   Utilitas hash & verifikasi kata sandi (bcrypt)
   + token reset kata sandi (acak + hash SHA-256).
   ========================================================= */
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/** Token reset acak (hex, 32 byte = 64 karakter) — hanya dikirim sekali ke pemilik email. */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash token untuk disimpan di DB (SHA-256); token mentah tidak pernah disimpan. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

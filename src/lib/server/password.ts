/* =========================================================
   Utilitas hash & verifikasi kata sandi (bcrypt).
   ========================================================= */
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

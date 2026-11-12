/* =========================================================
   Singleton Prisma Client (Prisma 7 + driver adapter pg).
   Gunakan hanya di server (route handler / RSC).
   ========================================================= */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * URL database produksi. Mendukung beberapa nama env dari integrasi
 * Vercel Postgres / Neon, dengan `DATABASE_URL` sebagai prioritas.
 */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL
  );
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

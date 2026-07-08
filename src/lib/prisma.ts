import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// better-sqlite3's native bindings aren't supported under Bun (oven-sh/bun#4290),
// so this uses Bun's built-in bun:sqlite via a driver adapter instead.
const adapter = new PrismaBunSqlite({ url: process.env.DATABASE_URL ?? "file:./dev.db" });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

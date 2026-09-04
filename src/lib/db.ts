import { PrismaClient } from "@prisma/client";

// Чтобы в режиме разработки (dev, с hot-reload) не создавалось множество
// подключений к базе данных, храним единственный экземпляр Prisma Client
// в глобальном объекте.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

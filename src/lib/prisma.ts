import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

let prismaSingleton: PrismaClient | undefined = global.__prisma;

function shouldUseTurso(databaseUrl: string | undefined): boolean {
  if (process.env.TURSO_DATABASE_URL) {
    return true;
  }

  if (databaseUrl?.startsWith("libsql://") || databaseUrl?.startsWith("https://")) {
    return true;
  }

  return false;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (shouldUseTurso(databaseUrl)) {
    const url = process.env.TURSO_DATABASE_URL ?? databaseUrl;
    if (!url) {
      throw new Error("TURSO_DATABASE_URL or DATABASE_URL (libsql/https) must be configured");
    }

    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = createPrismaClient();

    if (process.env.NODE_ENV !== "production") {
      global.__prisma = prismaSingleton;
    }
  }

  return prismaSingleton;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
}) as PrismaClient;

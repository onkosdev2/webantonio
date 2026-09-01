import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

function runtimeDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value || process.env.NODE_ENV !== "production") return value;

  try {
    const url = new URL(value);
    if (!url.protocol.startsWith("postgres")) return value;

    // Next.js can load the server bundle in more than one build worker. Keep
    // every Prisma pool deliberately small so their combined total stays
    // below the restricted Supabase runtime role limit.
    url.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "1");
    url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT_SECONDS || "30");
    return url.toString();
  } catch {
    return value;
  }
}

const databaseUrl = runtimeDatabaseUrl();

export const db =
  global.__prisma__ ??
  new PrismaClient({
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

// Reuse one client per Node.js process in development, production and build
// workers. Module duplication must not create additional pools.
global.__prisma__ = db;

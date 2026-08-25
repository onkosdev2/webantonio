import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "../prisma/generated/sqlite-client/index.js";

const sourceUrl = process.env.SQLITE_SOURCE_URL ?? "";
const targetUrl = process.env.DATABASE_URL ?? "";

if (!sourceUrl.startsWith("file:")) {
  throw new Error("SQLITE_SOURCE_URL debe apuntar a una base SQLite con file:.");
}

if (!targetUrl.startsWith("postgresql://") && !targetUrl.startsWith("postgres://")) {
  throw new Error("DATABASE_URL debe apuntar a PostgreSQL.");
}

const sqlite = new SqliteClient();
const postgres = new PostgresClient();

const modelOrder = [
  "user",
  "content",
  "oncologyMetadata",
  "caseVisualPlan",
  "caseFigure",
  "mediaAsset",
  "importLog",
  "aiTask"
];

function summarize(snapshot) {
  return Object.fromEntries(modelOrder.map((name) => [name, snapshot[name].length]));
}

async function readSnapshot() {
  const entries = await Promise.all(
    modelOrder.map(async (name) => [name, await sqlite[name].findMany()])
  );

  return Object.fromEntries(entries);
}

async function readTargetCounts() {
  const entries = await Promise.all(
    modelOrder.map(async (name) => [name, await postgres[name].count()])
  );

  return Object.fromEntries(entries);
}

async function main() {
  const snapshot = await readSnapshot();
  const sourceCounts = summarize(snapshot);
  const initialTargetCounts = await readTargetCounts();
  const occupiedModels = Object.entries(initialTargetCounts).filter(([, count]) => count > 0);

  console.log("SQLite:", sourceCounts);

  if (occupiedModels.length > 0) {
    throw new Error(
      "PostgreSQL no está vacío. Migración cancelada para evitar sobrescritura: " +
      occupiedModels.map(([name, count]) => `${name}=${count}`).join(", ")
    );
  }

  await postgres.$transaction(async (tx) => {
    for (const name of modelOrder) {
      const data = snapshot[name];
      if (data.length > 0) {
        await tx[name].createMany({ data });
      }
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  const finalTargetCounts = await readTargetCounts();
  for (const name of modelOrder) {
    if (finalTargetCounts[name] !== sourceCounts[name]) {
      throw new Error(
        `Conteo inválido para ${name}: SQLite=${sourceCounts[name]}, PostgreSQL=${finalTargetCounts[name]}`
      );
    }
  }

  console.log("PostgreSQL:", finalTargetCounts);
  console.log("Migración SQLite → PostgreSQL completada y verificada.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([sqlite.$disconnect(), postgres.$disconnect()]);
  });

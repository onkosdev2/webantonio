import { createHash } from "node:crypto";
import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "../prisma/generated/sqlite-client/index.js";

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

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])])
    );
  }
  return value;
}

function fingerprint(records) {
  return createHash("sha256").update(JSON.stringify(normalize(records))).digest("hex");
}

async function main() {
  for (const name of modelOrder) {
    const [source, target] = await Promise.all([
      sqlite[name].findMany({ orderBy: { id: "asc" } }),
      postgres[name].findMany({ orderBy: { id: "asc" } })
    ]);
    const sourceHash = fingerprint(source);
    const targetHash = fingerprint(target);

    if (sourceHash !== targetHash) {
      throw new Error(
        `Diferencia detectada en ${name}: SQLite=${source.length}, PostgreSQL=${target.length}`
      );
    }

    console.log(`${name}: ${source.length} registros · ${sourceHash.slice(0, 12)}`);
  }

  console.log("Verificación completa: SQLite y PostgreSQL contienen los mismos datos.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([sqlite.$disconnect(), postgres.$disconnect()]);
  });

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

function parseEnvFile(path: string) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
          return undefined;
        }

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^["']|["']$/g, "");
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
}

function isPostgresUrl(url: string | undefined) {
  return /^postgres(?:ql)?:\/\//.test(url ?? "");
}

const databaseUrl = resolvePrismaDatabaseUrl();
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

function resolvePrismaDatabaseUrl() {
  const localEnv = parseEnvFile(resolve(process.cwd(), ".env.local"));

  const candidates = [
    process.env.PRISMA_DATABASE_URL,
    process.env.DATABASE_URL,
    localEnv.PRISMA_DATABASE_URL,
    localEnv.DATABASE_URL,
  ];

  return candidates.find(isPostgresUrl) ?? process.env.DATABASE_URL ?? "";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});

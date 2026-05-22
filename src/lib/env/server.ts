import { resolveProductionAppSecret } from "@/lib/env/app-secret";

type ServerEnv = {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  APP_SECRET?: string;
  INTERVIEW_AGENT_SECRET?: string;
};

export function validateServerEnv(env: ServerEnv = process.env) {
  if (env.NODE_ENV !== "production") return;

  if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string in production");
  }

  resolveProductionAppSecret(env);
}

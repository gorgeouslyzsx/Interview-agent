type ServerEnv = {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  APP_SECRET?: string;
};

function isPlaceholderSecret(secret: string) {
  return secret === "replace-with-a-long-random-secret" || secret === "change-me" || secret.length < 32;
}

export function validateServerEnv(env: ServerEnv = process.env) {
  if (env.NODE_ENV !== "production") return;

  if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string in production");
  }

  if (!env.APP_SECRET || isPlaceholderSecret(env.APP_SECRET)) {
    throw new Error("APP_SECRET must be a strong non-placeholder secret in production");
  }
}

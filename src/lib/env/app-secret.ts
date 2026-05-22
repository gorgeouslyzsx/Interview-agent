export type AppSecretEnv = {
  NODE_ENV?: string;
  APP_SECRET?: string;
  INTERVIEW_AGENT_SECRET?: string;
};

export const LOCAL_DEVELOPMENT_SECRET = "interview-agent-local-development-secret";

const PLACEHOLDER_SECRETS = new Set(["replace-with-a-long-random-secret", "change-me"]);

export function isWeakAppSecret(secret: string) {
  return PLACEHOLDER_SECRETS.has(secret) || secret.length < 32;
}

export function resolveAppSecret(explicitSecret?: string, env: AppSecretEnv = process.env) {
  return explicitSecret || env.APP_SECRET || env.INTERVIEW_AGENT_SECRET || LOCAL_DEVELOPMENT_SECRET;
}

export function resolveProductionAppSecret(env: AppSecretEnv = process.env) {
  const secret = env.APP_SECRET || env.INTERVIEW_AGENT_SECRET;

  if (!secret || isWeakAppSecret(secret)) {
    throw new Error("APP_SECRET or INTERVIEW_AGENT_SECRET must be a strong non-placeholder secret in production");
  }

  return secret;
}

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { LLM_PROVIDER_PRESETS } from "@/lib/llm/provider-presets";

const TOKEN_VERSION = "v1";
export const IDENTITY_ACCESS_COOKIE = "interview_identity_access";

function getTokenSecret(explicitSecret?: string) {
  return (
    explicitSecret ||
    process.env.APP_SECRET ||
    process.env.INTERVIEW_AGENT_SECRET ||
    "interview-agent-local-development-secret"
  );
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string, secret?: string) {
  return createHmac("sha256", getTokenSecret(secret)).update(payload).digest("base64url");
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createIdentityAccessToken(identityId: string, secret?: string) {
  const issuedAt = Date.now().toString(36);
  const nonce = randomBytes(12).toString("base64url");
  const payload = base64Url(JSON.stringify({ identityId, issuedAt, nonce }));
  return `${TOKEN_VERSION}.${payload}.${sign(`${TOKEN_VERSION}.${payload}`, secret)}`;
}

export function verifyIdentityAccessToken(token: string | null | undefined, identityId: string, secret?: string) {
  if (!token) return false;

  const [version, payload, signature] = token.split(".");
  if (version !== TOKEN_VERSION || !payload || !signature) return false;

  const expected = sign(`${version}.${payload}`, secret);
  if (!safeEqualText(signature, expected)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      identityId?: string;
    };
    return parsed.identityId === identityId;
  } catch {
    return false;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  return false;
}

export function isAllowedLLMBaseUrl(baseUrl: string | null | undefined) {
  if (!baseUrl) return false;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:") return false;
    if (isPrivateHostname(url.hostname)) return false;

    const normalized = normalizeBaseUrl(url.toString());
    return LLM_PROVIDER_PRESETS.some((provider) => normalizeBaseUrl(provider.baseUrl) === normalized);
  } catch {
    return false;
  }
}

export function resolveSafeLLMBaseUrl(candidate: string | null | undefined, fallback: string) {
  return isAllowedLLMBaseUrl(candidate) ? normalizeBaseUrl(candidate!) : normalizeBaseUrl(fallback);
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      return separatorIndex === -1
        ? [part, ""]
        : [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))];
    })
    .find(([cookieName]) => cookieName === name)?.[1];
}

export function hasIdentityAccess(cookieHeader: string | null | undefined, identityId: string) {
  return verifyIdentityAccessToken(readCookieValue(cookieHeader, IDENTITY_ACCESS_COOKIE), identityId);
}

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const AUTH_SESSION_COOKIE = "interview_auth_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = DEFAULT_TTL_MS / 1000;

type SessionPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

type TokenOptions = {
  now?: Date;
  secret?: string;
  ttlMs?: number;
};

function getSessionSecret(explicitSecret?: string) {
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
  return createHmac("sha256", getSessionSecret(secret)).update(payload).digest("base64url");
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readCookieValue(cookieHeader: string | null | undefined, name: string) {
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

export function createUserSessionToken(userId: string, options: TokenOptions = {}) {
  const now = options.now?.getTime() ?? Date.now();
  const payload = base64Url(
    JSON.stringify({
      userId,
      issuedAt: now,
      expiresAt: now + (options.ttlMs ?? DEFAULT_TTL_MS),
      nonce: randomBytes(12).toString("base64url"),
    } satisfies SessionPayload),
  );

  return `${TOKEN_VERSION}.${payload}.${sign(`${TOKEN_VERSION}.${payload}`, options.secret)}`;
}

export function verifyUserSessionToken(token: string | null | undefined, options: TokenOptions = {}) {
  if (!token) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== TOKEN_VERSION || !payload || !signature) return null;

  const expected = sign(`${version}.${payload}`, options.secret);
  if (!safeEqualText(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const now = options.now?.getTime() ?? Date.now();
    if (!parsed.userId || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now) {
      return null;
    }

    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export function readUserSessionFromCookie(cookieHeader: string | null | undefined, options: TokenOptions = {}) {
  return verifyUserSessionToken(readCookieValue(cookieHeader, AUTH_SESSION_COOKIE), options);
}

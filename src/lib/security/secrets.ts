import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { resolveAppSecret, resolveProductionAppSecret } from "@/lib/env/app-secret";

function getEncryptionKey() {
  const secret = process.env.NODE_ENV === "production" ? resolveProductionAppSecret() : resolveAppSecret();
  return createHash("sha256").update(secret).digest();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return { passwordHash, passwordSalt: salt };
}

export function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const candidate = Buffer.from(scryptSync(password, passwordSalt, 64).toString("hex"), "hex");
  const expected = Buffer.from(passwordHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(encryptedSecret: string | null | undefined) {
  if (!encryptedSecret) return undefined;

  const [ivText, tagText, encryptedText] = encryptedSecret.split(".");
  if (!ivText || !tagText || !encryptedText) return undefined;

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

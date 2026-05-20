ALTER TABLE "Identity" ADD COLUMN "username" TEXT;
ALTER TABLE "Identity" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Identity" ADD COLUMN "passwordSalt" TEXT;
ALTER TABLE "Identity" ADD COLUMN "llmProvider" TEXT;
ALTER TABLE "Identity" ADD COLUMN "llmBaseUrl" TEXT;
ALTER TABLE "Identity" ADD COLUMN "llmModel" TEXT;
ALTER TABLE "Identity" ADD COLUMN "llmApiKeyEncrypted" TEXT;

-- CreateTable
CREATE TABLE "LlmUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cachedTokens" INTEGER NOT NULL,
    "estimatedSavedPromptTokens" INTEGER NOT NULL,
    "cacheHitRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

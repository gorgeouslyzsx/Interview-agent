-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JdProfile" ADD CONSTRAINT "JdProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionItem" ADD CONSTRAINT "QuestionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Identity_userId_username_key" ON "Identity"("userId", "username");
CREATE INDEX "Identity_userId_mode_updatedAt_idx" ON "Identity"("userId", "mode", "updatedAt");
CREATE INDEX "Identity_jdId_idx" ON "Identity"("jdId");
CREATE INDEX "JdProfile_userId_createdAt_idx" ON "JdProfile"("userId", "createdAt");
CREATE INDEX "QuestionItem_userId_difficulty_idx" ON "QuestionItem"("userId", "difficulty");
CREATE INDEX "QuestionItem_userId_createdAt_idx" ON "QuestionItem"("userId", "createdAt");
CREATE INDEX "InterviewSession_userId_updatedAt_idx" ON "InterviewSession"("userId", "updatedAt");
CREATE INDEX "InterviewSession_identityId_updatedAt_idx" ON "InterviewSession"("identityId", "updatedAt");
CREATE INDEX "InterviewSession_jdId_idx" ON "InterviewSession"("jdId");
CREATE INDEX "InterviewSession_status_updatedAt_idx" ON "InterviewSession"("status", "updatedAt");
CREATE INDEX "Message_sessionId_createdAt_idx" ON "Message"("sessionId", "createdAt");
CREATE INDEX "LlmUsage_sessionId_createdAt_idx" ON "LlmUsage"("sessionId", "createdAt");

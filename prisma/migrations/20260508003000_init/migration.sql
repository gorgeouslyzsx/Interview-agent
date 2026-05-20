-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "memorySummary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "JdProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "title" TEXT,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "responsibilitiesJson" TEXT NOT NULL DEFAULT '[]',
    "seniority" TEXT,
    "focusAreasJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuestionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "skillTagsJson" TEXT NOT NULL DEFAULT '[]',
    "difficulty" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceAnswer" TEXT,
    "evaluationPointsJson" TEXT NOT NULL DEFAULT '[]',
    "embeddingJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "aiRole" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "jdId" TEXT,
    "style" TEXT,
    "difficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "reportJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewSession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InterviewSession_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JdProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


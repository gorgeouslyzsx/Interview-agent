-- Add persisted interview planning state to keep stable plan context cacheable
-- and dynamic next-step context small between turns.
ALTER TABLE "InterviewSession" ADD COLUMN "initialPlanJson" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "currentStageId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "lastNextStepPlanJson" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "followUpCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InterviewSession" ADD COLUMN "turnCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InterviewSession" ADD COLUMN "evidenceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InterviewSession" ADD COLUMN "riskFlagsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "InterviewSession" ADD COLUMN "skillCoverageJson" TEXT NOT NULL DEFAULT '{}';

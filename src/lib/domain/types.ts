export type UserRole = "candidate" | "interviewer";
export type AiRole = "interviewer" | "candidate";
export type IdentityMode = "candidate_practice" | "interviewer_practice";
export type InterviewStyle = "friendly" | "normal" | "technical" | "pressure";
export type Difficulty = "easy" | "medium" | "hard";

export type Identity = {
  id: string;
  userId: string;
  mode: IdentityMode;
  name: string;
  profile: string;
  memorySummary: string;
  createdAt: string;
  updatedAt: string;
};

export type JDProfile = {
  id: string;
  userId: string;
  rawText: string;
  title?: string;
  skills: string[];
  responsibilities: string[];
  seniority?: string;
  focusAreas: string[];
  createdAt: string;
};

export type QuestionType = "behavioral" | "technical" | "system_design" | "coding" | "project";

export type QuestionItem = {
  id: string;
  userId: string;
  question: string;
  skillTags: string[];
  difficulty: Difficulty;
  type: QuestionType;
  referenceAnswer?: string;
  evaluationPoints: string[];
  createdAt: string;
};

export type InterviewMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type InterviewSession = {
  id: string;
  userId: string;
  userRole: UserRole;
  aiRole: AiRole;
  identityId: string;
  jdId?: string;
  style?: InterviewStyle;
  difficulty?: Difficulty;
  status: "active" | "completed";
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillScore = {
  skill: string;
  score: number;
  evidence: string;
  suggestion: string;
};

export type InterviewReport = {
  overallScore: number;
  result: string;
  summary: string;
  skillScores: SkillScore[];
  strengths: string[];
  weaknesses: string[];
  nextPractice: string[];
};

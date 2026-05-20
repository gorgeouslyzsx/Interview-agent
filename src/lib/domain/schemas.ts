import { z } from "zod";
import { LLM_PROVIDER_PRESETS } from "@/lib/llm/provider-presets";

const providerIds = LLM_PROVIDER_PRESETS.map((provider) => provider.id) as [
  (typeof LLM_PROVIDER_PRESETS)[number]["id"],
  ...(typeof LLM_PROVIDER_PRESETS)[number]["id"][],
];

export const identitySchema = z.object({
  mode: z.enum(["candidate_practice", "interviewer_practice"]),
  username: z.string().min(3).max(40),
  password: z.string().min(6).max(120),
  name: z.string().min(1).max(80),
  jdRawText: z.string().min(20).max(20000),
  resumeText: z.string().max(30000).optional(),
  llmProvider: z.enum(providerIds),
  llmBaseUrl: z.string().url().max(300),
  llmModel: z.string().min(1).max(120),
  llmApiKey: z.string().min(1).max(2000),
  profile: z.string().max(2000).optional(),
});

export const authRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(120),
  name: z.string().trim().min(1).max(80).optional(),
});

export const authLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(120),
});

export const jdUploadSchema = z.object({
  rawText: z.string().min(20).max(20000),
});

export const questionUploadSchema = z.object({
  rawText: z.string().min(10).max(50000),
});

export const createSessionSchema = z.object({
  userRole: z.enum(["candidate", "interviewer"]),
  identityId: z.string().min(1),
  jdId: z.string().optional(),
  resumeText: z.string().max(30000).optional(),
  style: z.enum(["friendly", "normal", "technical", "pressure"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const enterIdentitySchema = z.object({
  style: z.enum(["friendly", "normal", "technical", "pressure"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  password: z.string().max(120).optional(),
});

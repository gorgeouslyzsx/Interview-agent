import { z } from "zod";

export const identitySchema = z.object({
  mode: z.enum(["candidate_practice", "interviewer_practice"]),
  name: z.string().min(1).max(80),
  profile: z.string().min(1).max(2000),
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
  style: z.enum(["friendly", "normal", "technical", "pressure"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(8000),
});

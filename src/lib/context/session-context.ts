import { reviewUploadedContent } from "@/lib/guardrails/guardrail";

export const SESSION_STATIC_CONTEXT_CHAR_LIMIT = 12000;

export function prepareSessionContextText(text: string | null | undefined): string {
  return reviewUploadedContent(text ?? "").sanitizedText.trim().slice(0, SESSION_STATIC_CONTEXT_CHAR_LIMIT);
}

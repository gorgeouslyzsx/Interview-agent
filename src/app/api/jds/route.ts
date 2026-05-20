import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { jdUploadSchema } from "@/lib/domain/schemas";
import { parseJD } from "@/lib/jd/parser";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";
import { getRequestUserId } from "@/lib/auth/request";

export async function POST(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { rawText } = jdUploadSchema.parse(await request.json());
  const review = reviewUploadedContent(rawText, "JD");
  const safeRawText = review.sanitizedText;

  const parsed = parseJD(safeRawText);
  const prisma = getPrisma();
  const jd = await prisma.jdProfile.create({
    data: {
      id: nanoid(),
      userId,
      rawText: safeRawText,
      title: parsed.title,
      skillsJson: JSON.stringify(parsed.skills),
      responsibilitiesJson: JSON.stringify(parsed.responsibilities),
      seniority: parsed.seniority,
      focusAreasJson: JSON.stringify(parsed.focusAreas),
    },
  });

  return NextResponse.json({ jd, parsed, warnings: review.findings, notice: review.notice });
}

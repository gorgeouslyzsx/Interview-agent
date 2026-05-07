import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { jdUploadSchema } from "@/lib/domain/schemas";
import { parseJD } from "@/lib/jd/parser";
import { validateUploadedContent } from "@/lib/guardrails/guardrail";

const DEMO_USER_ID = "demo-user";

export async function POST(request: Request) {
  const { rawText } = jdUploadSchema.parse(await request.json());
  const guard = validateUploadedContent(rawText);

  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 400 });
  }

  const parsed = parseJD(rawText);
  const prisma = getPrisma();
  const jd = await prisma.jdProfile.create({
    data: {
      id: nanoid(),
      userId: DEMO_USER_ID,
      rawText,
      title: parsed.title,
      skillsJson: JSON.stringify(parsed.skills),
      responsibilitiesJson: JSON.stringify(parsed.responsibilities),
      seniority: parsed.seniority,
      focusAreasJson: JSON.stringify(parsed.focusAreas),
    },
  });

  return NextResponse.json({ jd, parsed });
}

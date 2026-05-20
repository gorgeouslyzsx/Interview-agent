import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/request";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(
    pathToFileURL(join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "esm", "pdf.worker.mjs")).href,
  );

  const parser = new PDFParse({ data: buffer });
  try {
    return await parser.getText();
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  if (!getRequestUserId(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "文件不能超过 8MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    try {
      const result = await extractPdfText(buffer);
      const text = result.text.trim();

      if (!text) {
        return NextResponse.json(
          { error: "PDF 未识别到可复制文字，请上传文本型 PDF，或直接粘贴简历内容。" },
          { status: 422 },
        );
      }

      return NextResponse.json({ text: text.slice(0, 30000), name: file.name });
    } catch (error) {
      console.error("PDF text extraction failed", error);
      return NextResponse.json(
        { error: "PDF 解析失败，请确认文件未加密、未损坏，或直接粘贴简历内容。" },
        { status: 422 },
      );
    }
  }

  if (file.type.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return NextResponse.json({ text: buffer.toString("utf8").slice(0, 30000), name: file.name });
  }

  return NextResponse.json({ error: "仅支持 PDF、TXT、Markdown 文件" }, { status: 400 });
}

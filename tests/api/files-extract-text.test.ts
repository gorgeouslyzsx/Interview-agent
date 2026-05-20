import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/files/extract-text/route";
import { AUTH_SESSION_COOKIE, createUserSessionToken } from "@/lib/auth/session";

let workerConfigured = false;

const destroy = vi.fn();
const getText = vi.fn(async () => {
  if (!workerConfigured) {
    throw new Error('Setting up fake worker failed: "Cannot find module pdf.worker.mjs".');
  }

  return { text: "Java 后端简历\n熟悉 Spring Boot、MySQL、Redis。" };
});
const setWorker = vi.fn((workerSrc?: string) => {
  workerConfigured = Boolean(workerSrc);
  return workerSrc ?? "";
});

vi.mock("pdf-parse", () => ({
  PDFParse: class PDFParse {
    static setWorker = setWorker;

    getText = getText;
    destroy = destroy;
  },
}));

function requestWithFile(file: File, authenticated = true) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (authenticated) {
    headers.set(
      "cookie",
      `${AUTH_SESSION_COOKIE}=${encodeURIComponent(
        createUserSessionToken("user-1", {
          secret: "interview-agent-local-development-secret",
        }),
      )}`,
    );
  }

  return new Request("http://localhost/api/files/extract-text", {
    method: "POST",
    headers,
    body: formData,
  });
}

describe("POST /api/files/extract-text", () => {
  beforeEach(() => {
    workerConfigured = false;
    destroy.mockClear();
    getText.mockClear();
    setWorker.mockClear();
  });

  it("configures the bundled pdf worker before extracting text from a PDF", async () => {
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });

    const response = await POST(requestWithFile(file));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(setWorker).toHaveBeenCalledWith(expect.stringMatching(/pdf\.worker\.mjs$/));
    expect(getText).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(data).toEqual({
      name: "resume.pdf",
      text: "Java 后端简历\n熟悉 Spring Boot、MySQL、Redis。",
    });
  });

  it("rejects unauthenticated file extraction requests", async () => {
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });

    const response = await POST(requestWithFile(file, false));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("请先登录");
    expect(getText).not.toHaveBeenCalled();
  });

  it("returns a JSON error when PDF text extraction fails", async () => {
    getText.mockRejectedValueOnce(new Error("DOMMatrix is not defined"));
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });

    const response = await POST(requestWithFile(file));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain("PDF 解析失败");
    expect(destroy).toHaveBeenCalledOnce();
  });
});

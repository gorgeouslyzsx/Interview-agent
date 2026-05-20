import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_COOKIE } from "@/lib/auth/session";
import { hashPassword } from "@/lib/security/secrets";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";

const userFindUnique = vi.fn();
const userCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    user: {
      findUnique: userFindUnique,
      create: userCreate,
    },
  }),
}));

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auth API", () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userCreate.mockReset();
  });

  it("registers a user, normalizes email, and sets a signed auth cookie", async () => {
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({
      id: "user-1",
      email: "lin@example.com",
      name: "林一",
      passwordHash: "hidden",
      passwordSalt: "hidden",
    });

    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        email: " LIN@example.com ",
        password: "secret123",
        name: "林一",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(AUTH_SESSION_COOKIE);
    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "lin@example.com",
        name: "林一",
      }),
      select: expect.any(Object),
    });
    expect(data.user).toEqual({ id: "user-1", email: "lin@example.com", name: "林一" });
  });

  it("logs in with a valid password without returning password material", async () => {
    const { passwordHash, passwordSalt } = hashPassword("secret123");
    userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "lin@example.com",
      name: "林一",
      passwordHash,
      passwordSalt,
    });

    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "lin@example.com",
        password: "secret123",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(AUTH_SESSION_COOKIE);
    expect(data.user).toEqual({ id: "user-1", email: "lin@example.com", name: "林一" });
  });
});

import { describe, expect, it } from "vitest";
import { parseJD } from "@/lib/jd/parser";

describe("parseJD", () => {
  it("extracts title and skills from a JD", () => {
    const result = parseJD(`
      岗位：Java 后端工程师
      要求：熟悉 Java、Spring Boot、MySQL、Redis，了解消息队列。
      职责：负责业务系统开发，参与接口设计和性能优化。
      年限：3 年以上经验。
    `);

    expect(result.title).toBe("Java 后端工程师");
    expect(result.skills).toEqual(expect.arrayContaining(["Java", "Spring Boot", "MySQL", "Redis"]));
    expect(result.responsibilities.join(" ")).toContain("业务系统开发");
    expect(result.seniority).toContain("3 年");
  });
});

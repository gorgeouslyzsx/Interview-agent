import { describe, expect, it } from "vitest";
import { parseJsonArray, stringifyJsonArray } from "@/lib/domain/json";

describe("json helpers", () => {
  it("parses valid arrays", () => {
    expect(parseJsonArray<string>('["Java","Redis"]')).toEqual(["Java", "Redis"]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseJsonArray<string>("not json")).toEqual([]);
  });

  it("stringifies arrays", () => {
    expect(stringifyJsonArray(["a", "b"])).toBe('["a","b"]');
  });
});

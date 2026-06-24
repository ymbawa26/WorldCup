import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  deterministicUuid,
  isoDateFromOfficial,
  normalizeWhitespace,
  splitClub,
} from "@/domain/data-ingestion/identity";

describe("data normalization", () => {
  it("normalizes official identity fields without inventing values", () => {
    expect(normalizeWhitespace("  João\u0000   Félix ")).toBe("João Félix");
    expect(isoDateFromOfficial("10/11/1999")).toBe("1999-11-10");
    expect(ageOnDate("2000-06-12", "2026-06-11")).toBe(25);
    expect(splitClub("Manchester City FC (ENG)")).toEqual({
      clubName: "Manchester City FC",
      clubCountryCode: "ENG",
    });
  });

  it("creates stable UUID identities", () => {
    const first = deterministicUuid("player:example");
    expect(deterministicUuid("player:example")).toBe(first);
    expect(deterministicUuid("player:different")).not.toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });
});

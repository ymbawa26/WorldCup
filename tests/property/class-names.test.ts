import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("class-name composition", () => {
  it("is deterministic for arbitrary class tokens", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (tokens) => {
        expect(cn(tokens)).toBe(cn(tokens));
      }),
    );
  });
});

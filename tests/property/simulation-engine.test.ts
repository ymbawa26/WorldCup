import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { simulateMatch } from "@/domain/simulation/engine";
import { validateMatchSimulation } from "@/domain/simulation/validation";

const teams = [
  "argentina",
  "brazil",
  "england",
  "spain",
  "mexico",
  "united-states",
] as const;

describe("simulation properties", () => {
  it("preserves match invariants across seeds and team pairs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.integer({ min: 0, max: teams.length - 1 }),
        fc.integer({ min: 0, max: teams.length - 1 }),
        (seed, homeIndex, awayIndex) => {
          fc.pre(homeIndex !== awayIndex);
          const result = simulateMatch({
            seed,
            fixtureId: `property-${homeIndex}-${awayIndex}`,
            homeTeamId: teams[homeIndex],
            awayTeamId: teams[awayIndex],
          });

          expect(validateMatchSimulation(result).passed).toBe(true);
          expect(result.finalScore.home).toBeGreaterThanOrEqual(0);
          expect(result.finalScore.away).toBeGreaterThanOrEqual(0);
          expect(result.events.at(-1)?.type).toBe("MATCH_END");
        },
      ),
      { numRuns: 40 },
    );
  });
});

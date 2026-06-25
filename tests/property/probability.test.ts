import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  liveProbability,
  prematchProbability,
} from "@/domain/probability/model";

const teams = [
  "argentina",
  "brazil",
  "england",
  "spain",
  "mexico",
  "united-states",
] as const;

describe("probability properties", () => {
  it("keeps outcome probabilities bounded and normalized", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: teams.length - 1 }),
        fc.integer({ min: 0, max: teams.length - 1 }),
        fc.integer({ min: 0, max: 89 }),
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        (homeIndex, awayIndex, minute, homeScore, awayScore) => {
          fc.pre(homeIndex !== awayIndex);
          const prematch = prematchProbability(
            teams[homeIndex],
            teams[awayIndex],
          );
          const live = liveProbability({
            homeTeamId: teams[homeIndex],
            awayTeamId: teams[awayIndex],
            minute,
            currentScore: { home: homeScore, away: awayScore },
          });
          for (const outcomes of [prematch.outcomes, live.outcomes]) {
            const total = outcomes.homeWin + outcomes.draw + outcomes.awayWin;
            expect(total).toBeCloseTo(1, 5);
            expect(
              Object.values(outcomes).every(
                (value) => value >= 0 && value <= 1,
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 40 },
    );
  });
});

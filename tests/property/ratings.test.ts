import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { squadDataset } from "@/domain/data-ingestion/data";
import { buildPlayerRating } from "@/domain/ratings/model";
import { tournamentSnapshot } from "@/domain/tournament/data";

const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

describe("rating model properties", () => {
  it("keeps generated values inside the 1-99 scale", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: squadDataset.players.length - 1 }),
        fc.integer({ min: 0, max: 180 }),
        fc.integer({ min: 0, max: 90 }),
        fc.integer({ min: 160, max: 205 }),
        (index, internationalCaps, internationalGoals, heightCm) => {
          const player = {
            ...squadDataset.players[index],
            internationalCaps,
            internationalGoals,
            heightCm,
          };
          const rating = buildPlayerRating(
            player,
            teamsById.get(player.teamId)!,
          );
          const allValues = [
            ...Object.values(rating.attributes),
            ...Object.values(rating.roleRatings),
            rating.overallEstimate,
          ];

          expect(allValues.every((value) => value >= 1 && value <= 99)).toBe(
            true,
          );
          expect(rating.uncertainty).toBeCloseTo(1 - rating.confidenceScore, 3);
        },
      ),
    );
  });
});

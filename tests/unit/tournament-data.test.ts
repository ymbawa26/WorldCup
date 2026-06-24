import { describe, expect, it } from "vitest";

import { tournamentSnapshot } from "@/domain/tournament/data";
import { validateTournamentData } from "@/domain/tournament/validation";

describe("official tournament snapshot", () => {
  it("contains the complete pre-opening structure", () => {
    expect(validateTournamentData()).toEqual({
      teams: 48,
      groups: 12,
      groupFixtures: 72,
      venues: 16,
      knockoutMatches: 32,
      thirdPlaceCombinations: 495,
    });
  });

  it("contains no real-world result state", () => {
    expect(tournamentSnapshot.resultsIncluded).toBe(false);
    for (const fixture of tournamentSnapshot.fixtures) {
      expect(fixture).not.toHaveProperty("homeScore");
      expect(fixture).not.toHaveProperty("awayScore");
      expect(fixture).not.toHaveProperty("winnerTeamId");
    }
  });
});

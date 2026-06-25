import { describe, expect, it } from "vitest";

import { squadDataset } from "@/domain/data-ingestion/data";
import { ratingDataset } from "@/domain/ratings/data";
import { validateRatingDataset } from "@/domain/ratings/validation";
import { tournamentSnapshot } from "@/domain/tournament/data";

describe("rating dataset", () => {
  it("validates all generated ratings against known squads and teams", () => {
    const report = validateRatingDataset(ratingDataset);

    expect(report).toMatchObject({
      passed: true,
      totals: {
        playerRatings: squadDataset.players.length,
        teamRatings: tournamentSnapshot.teams.length,
        estimatedPlayerRatings: squadDataset.players.length,
        estimatedTeamRatings: tournamentSnapshot.teams.length,
      },
      failures: [],
    });
  });

  it("keeps every team lineup inside its own 26-player squad", () => {
    const teamPlayerIds = new Map<string, Set<string>>();
    for (const player of squadDataset.players) {
      const ids = teamPlayerIds.get(player.teamId) ?? new Set<string>();
      ids.add(player.id);
      teamPlayerIds.set(player.teamId, ids);
    }

    for (const team of ratingDataset.teams) {
      const ids = teamPlayerIds.get(team.teamId)!;
      expect(team.lineup.every((entry) => ids.has(entry.playerId))).toBe(true);
    }
  });
});

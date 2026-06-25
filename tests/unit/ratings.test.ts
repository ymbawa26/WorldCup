import { describe, expect, it } from "vitest";

import { squadDataset } from "@/domain/data-ingestion/data";
import { buildPlayerRating, buildTeamRating } from "@/domain/ratings/model";
import { ratingDataset } from "@/domain/ratings/data";
import { tournamentSnapshot } from "@/domain/tournament/data";

const playersById = new Map(
  squadDataset.players.map((player) => [player.id, player]),
);
const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

describe("ratings model", () => {
  it("keeps position-specific role strengths sensible", () => {
    const goalkeeper = ratingDataset.players.find(
      (rating) => rating.primaryPosition === "GK",
    )!;
    const defender = ratingDataset.players.find(
      (rating) => rating.primaryPosition === "DF",
    )!;
    const forward = ratingDataset.players.find(
      (rating) => rating.primaryPosition === "FW",
    )!;

    expect(goalkeeper.roleRatings.GK).toBeGreaterThan(
      goalkeeper.roleRatings.ST,
    );
    expect(defender.roleRatings.CB).toBeGreaterThan(defender.roleRatings.ST);
    expect(forward.roleRatings.ST).toBeGreaterThan(forward.roleRatings.CB);
  });

  it("uses the team-strength vector rather than a single overall-only output", () => {
    const team = ratingDataset.teams[0];

    expect(Object.keys(team.strengths).sort()).toEqual([
      "attack",
      "defense",
      "depth",
      "goalkeeping",
      "midfield",
      "overall",
      "setPieces",
    ]);
    expect(team.lineup).toHaveLength(11);
    expect(new Set(team.lineup.map((entry) => entry.playerId)).size).toBe(11);
  });

  it("golden-checks a stable known player and team rating", () => {
    const argentina = ratingDataset.teams.find(
      (rating) => rating.teamId === "argentina",
    )!;
    const firstLineupPlayer = playersById.get(argentina.lineup[0].playerId)!;

    expect(argentina.defaultFormation).toBe("4-3-3");
    expect(argentina.strengths.overall).toBe(72);
    expect(argentina.lineup[0]).toMatchObject({
      role: "GK",
      roleRating: 78,
      roleFit: 1,
    });
    expect(firstLineupPlayer.primaryPosition).toBe("GK");
  });

  it("recomputes team strength when lineup candidates change", () => {
    const team = teamsById.get("argentina")!;
    const argentinaRatings = ratingDataset.players.filter(
      (rating) => rating.teamId === "argentina",
    );
    const baseline = buildTeamRating(team, argentinaRatings);
    const degraded = buildTeamRating(
      team,
      argentinaRatings.map((rating, index) =>
        index < 11
          ? {
              ...rating,
              overallEstimate: 30,
              roleRatings: Object.fromEntries(
                Object.keys(rating.roleRatings).map((role) => [role, 30]),
              ) as typeof rating.roleRatings,
            }
          : rating,
      ),
    );

    expect(degraded.strengths.overall).toBeLessThanOrEqual(
      baseline.strengths.overall,
    );
  });

  it("rewards additional experience monotonically for a fixed player profile", () => {
    const player = squadDataset.players.find(
      (candidate) => candidate.primaryPosition === "MF",
    )!;
    const team = teamsById.get(player.teamId)!;
    const baseline = buildPlayerRating(player, team);
    const experienced = buildPlayerRating(
      { ...player, internationalCaps: player.internationalCaps + 50 },
      team,
    );

    expect(experienced.attributes.mentality).toBeGreaterThanOrEqual(
      baseline.attributes.mentality,
    );
    expect(experienced.attributes.passing).toBeGreaterThanOrEqual(
      baseline.attributes.passing,
    );
  });
});

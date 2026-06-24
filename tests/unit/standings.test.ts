import { describe, expect, it } from "vitest";

import {
  buildGroupStandings,
  rankThirdPlacedTeams,
  UnresolvedOfficialTieError,
  type CompletedGroupMatch,
  type TeamStanding,
} from "@/domain/tournament/standings";

const rankings = { A: [1], B: [2], C: [3], D: [4] };

function match(
  matchNumber: number,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
  conduct: [number, number] = [0, 0],
): CompletedGroupMatch {
  return {
    matchNumber,
    group: "A",
    homeTeamId,
    awayTeamId,
    homeGoals,
    awayGoals,
    homeConductScore: conduct[0],
    awayConductScore: conduct[1],
  };
}

function standing(
  teamId: string,
  group: TeamStanding["group"],
  points: number,
  goalDifference: number,
  goalsFor: number,
  conduct: number,
  rank: number,
): TeamStanding {
  return {
    teamId,
    group,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points,
    teamConductScore: conduct,
    fifaRankingHistory: [rank],
  };
}

describe("official standings rules", () => {
  it("uses head-to-head points before overall goal difference", () => {
    const matches = [
      match(1, "A", "B", 1, 0),
      match(2, "A", "C", 0, 4),
      match(3, "A", "D", 1, 0),
      match(4, "B", "C", 1, 0),
      match(5, "B", "D", 5, 0),
      match(6, "C", "D", 0, 0),
    ];

    const table = buildGroupStandings({
      group: "A",
      teamIds: ["A", "B", "C", "D"],
      fifaRankingHistory: rankings,
      matches,
    });

    expect(table.map(({ teamId }) => teamId)).toEqual(["A", "B", "C", "D"]);
    expect(table[1].goalDifference).toBeGreaterThan(table[0].goalDifference);
  });

  it("reapplies head-to-head criteria to the remaining tied subset", () => {
    const matches = [
      match(1, "A", "B", 1, 0),
      match(2, "B", "C", 2, 0),
      match(3, "C", "A", 3, 0),
      match(4, "A", "D", 1, 0),
      match(5, "B", "D", 2, 0),
      match(6, "C", "D", 3, 0),
    ];

    const table = buildGroupStandings({
      group: "A",
      teamIds: ["A", "B", "C", "D"],
      fifaRankingHistory: rankings,
      matches,
    });

    expect(table.map(({ teamId }) => teamId)).toEqual(["B", "C", "A", "D"]);
  });

  it("falls through conduct score and then ranking history", () => {
    const matches = [
      match(1, "A", "B", 0, 0, [0, -1]),
      match(2, "A", "C", 0, 0),
      match(3, "A", "D", 0, 0),
      match(4, "B", "C", 0, 0),
      match(5, "B", "D", 0, 0),
      match(6, "C", "D", 0, 0),
    ];

    const table = buildGroupStandings({
      group: "A",
      teamIds: ["A", "B", "C", "D"],
      fifaRankingHistory: rankings,
      matches,
    });

    expect(table.map(({ teamId }) => teamId)).toEqual(["A", "C", "D", "B"]);
  });

  it("rejects a tie that official ranking history cannot resolve", () => {
    const matches = [
      match(1, "A", "B", 0, 0),
      match(2, "A", "C", 0, 0),
      match(3, "A", "D", 0, 0),
      match(4, "B", "C", 0, 0),
      match(5, "B", "D", 0, 0),
      match(6, "C", "D", 0, 0),
    ];

    expect(() =>
      buildGroupStandings({
        group: "A",
        teamIds: ["A", "B", "C", "D"],
        fifaRankingHistory: { A: [1], B: [1], C: [1], D: [1] },
        matches,
      }),
    ).toThrow(UnresolvedOfficialTieError);
  });

  it("ranks third-placed teams without head-to-head criteria", () => {
    const teams = [
      standing("A3", "A", 4, 0, 3, 0, 20),
      standing("B3", "B", 4, 0, 3, -1, 1),
      standing("C3", "C", 4, 0, 2, 0, 2),
      standing("D3", "D", 3, 8, 8, 0, 1),
    ];

    expect(rankThirdPlacedTeams(teams).map(({ teamId }) => teamId)).toEqual([
      "A3",
      "B3",
      "C3",
      "D3",
    ]);
  });
});

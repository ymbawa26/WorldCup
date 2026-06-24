import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { resolveTournamentBracket } from "@/domain/tournament/bracket";
import type { GroupStandings } from "@/domain/tournament/qualification";
import { GROUP_IDS } from "@/domain/tournament/schema";
import type { TeamStanding } from "@/domain/tournament/standings";

function standings(): GroupStandings {
  return Object.fromEntries(
    GROUP_IDS.map((group, groupIndex) => [
      group,
      [0, 1, 2, 3].map(
        (position): TeamStanding => ({
          teamId: `${group}${position + 1}`,
          group,
          played: 3,
          wins: 3 - position,
          draws: 0,
          losses: position,
          goalsFor: 6 - position,
          goalsAgainst: position,
          goalDifference: 6 - position * 2,
          points: position === 2 ? 20 - groupIndex : 9 - position * 3,
          teamConductScore: 0,
          fifaRankingHistory: [groupIndex * 4 + position + 1],
        }),
      ),
    ]),
  ) as GroupStandings;
}

describe("complete knockout progression", () => {
  it("always produces 32 unique entrants and one champion", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 32, maxLength: 32 }),
        (homeWins) => {
          let index = 0;
          const tournament = resolveTournamentBracket({
            standingsByGroup: standings(),
            selectWinner: (match) =>
              homeWins[index++] ? match.homeTeamId : match.awayTeamId,
          });
          const opening = tournament.matches.slice(0, 16);
          const entrants = opening.flatMap((match) => [
            match.homeTeamId,
            match.awayTeamId,
          ]);

          expect(opening).toHaveLength(16);
          expect(new Set(entrants).size).toBe(32);
          expect(tournament.matches).toHaveLength(32);
          expect(tournament.matches.at(-1)?.winnerTeamId).toBe(
            tournament.championTeamId,
          );
        },
      ),
    );
  });
});

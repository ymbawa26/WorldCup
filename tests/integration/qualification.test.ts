import { describe, expect, it } from "vitest";

import {
  knockoutBracket,
  thirdPlaceAllocation,
} from "@/domain/tournament/data";
import { allocateThirdPlacedTeams } from "@/domain/tournament/qualification";
import { GROUP_IDS, type GroupId } from "@/domain/tournament/schema";
import type { TeamStanding } from "@/domain/tournament/standings";

function third(group: GroupId): TeamStanding {
  return {
    teamId: `${group}3`,
    group,
    played: 3,
    wins: 1,
    draws: 1,
    losses: 1,
    goalsFor: 3,
    goalsAgainst: 3,
    goalDifference: 0,
    points: 4,
    teamConductScore: 0,
    fifaRankingHistory: [GROUP_IDS.indexOf(group) + 1],
  };
}

describe("Annex C third-place allocation", () => {
  it("allocates every one of the 495 qualifying combinations one-to-one", () => {
    const allowed = new Map<GroupId, Set<GroupId>>();
    for (const match of knockoutBracket.matches) {
      if (!match.awaySlot.startsWith("3:")) continue;
      allowed.set(
        match.homeSlot.slice(1) as GroupId,
        new Set(match.awaySlot.slice(2).split("") as GroupId[]),
      );
    }

    for (const [key, option] of Object.entries(
      thirdPlaceAllocation.combinations,
    )) {
      const entrants = key.split("").map((group) => third(group as GroupId));
      const allocation = allocateThirdPlacedTeams(entrants);

      expect(allocation.size, `option ${option.option}`).toBe(8);
      expect(new Set(allocation.values()).size, `option ${option.option}`).toBe(
        8,
      );
      expect(
        [...allocation.values()]
          .map(({ group }) => group)
          .sort()
          .join(""),
      ).toBe(key);
      for (const [winner, opponent] of allocation) {
        expect(allowed.get(winner)?.has(opponent.group)).toBe(true);
      }
    }
  });

  it("preserves the first and final official matrix options", () => {
    expect(thirdPlaceAllocation.combinations.EFGHIJKL.option).toBe(1);
    expect(thirdPlaceAllocation.combinations.ABCDEFGH.option).toBe(495);
  });
});

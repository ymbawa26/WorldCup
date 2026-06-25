import { describe, expect, it } from "vitest";

import {
  calculateSelectedLineupRating,
  defaultSelectedLineupInput,
} from "@/domain/lineups/rating";
import { playerRatingsById } from "@/domain/ratings/data";

function weakestAvailableRolePlayer(
  teamId: string,
  role: "CB" | "ST",
  excludedIds: Set<string>,
) {
  return [...playerRatingsById.values()]
    .filter(
      (player) => player.teamId === teamId && !excludedIds.has(player.playerId),
    )
    .sort(
      (left, right) => left.roleRatings[role] - right.roleRatings[role],
    )[0]!;
}

describe("selected lineup ratings", () => {
  it("builds active ratings from exactly the selected starters and bench", () => {
    const input = defaultSelectedLineupInput("brazil");
    const rating = calculateSelectedLineupRating(input);

    expect(rating.teamId).toBe("brazil");
    expect(rating.starters).toHaveLength(11);
    expect(rating.benchPlayerIds.length).toBeGreaterThan(0);
    expect(rating.formationFit).toBeGreaterThan(0.7);
    expect(Object.keys(rating.strengths).sort()).toEqual([
      "attack",
      "benchStrength",
      "counterattacking",
      "defense",
      "depth",
      "discipline",
      "goalkeeping",
      "midfield",
      "overall",
      "pressing",
      "setPieces",
    ]);
  });

  it("changes the active attack rating when a weaker starter is selected", () => {
    const input = defaultSelectedLineupInput("brazil");
    const baseline = calculateSelectedLineupRating(input);
    const targetIndex = input.starters.findIndex(
      (starter) => starter.role === "ST",
    );
    const originalStarter = input.starters[targetIndex]!;
    const weakForward = weakestAvailableRolePlayer(
      input.teamId,
      "ST",
      new Set(input.starters.map((starter) => starter.playerId)),
    );
    const degraded = calculateSelectedLineupRating({
      ...input,
      starters: input.starters.map((starter, index) =>
        index === targetIndex
          ? { playerId: weakForward.playerId, role: originalStarter.role }
          : starter,
      ),
      benchPlayerIds: input.benchPlayerIds
        .filter((playerId) => playerId !== weakForward.playerId)
        .concat(originalStarter.playerId),
    });

    expect(degraded.strengths.attack).toBeLessThan(baseline.strengths.attack);
  });

  it("lets a weak starter matter more than the same weak player on the bench", () => {
    const input = defaultSelectedLineupInput("argentina");
    const baseline = calculateSelectedLineupRating(input);
    const targetIndex = input.starters.findIndex(
      (starter) => starter.role === "CB",
    );
    const originalStarter = input.starters[targetIndex]!;
    const weakDefender = weakestAvailableRolePlayer(
      input.teamId,
      "CB",
      new Set(input.starters.map((starter) => starter.playerId)),
    );
    const weakBench = calculateSelectedLineupRating({
      ...input,
      benchPlayerIds: [weakDefender.playerId],
    });
    const weakStarter = calculateSelectedLineupRating({
      ...input,
      starters: input.starters.map((starter, index) =>
        index === targetIndex
          ? { playerId: weakDefender.playerId, role: originalStarter.role }
          : starter,
      ),
      benchPlayerIds: [originalStarter.playerId],
    });
    const benchImpact =
      baseline.strengths.defense - weakBench.strengths.defense;
    const starterImpact =
      baseline.strengths.defense - weakStarter.strengths.defense;

    expect(starterImpact).toBeGreaterThan(benchImpact);
  });

  it("rejects duplicate selected players", () => {
    const input = defaultSelectedLineupInput("france");

    expect(() =>
      calculateSelectedLineupRating({
        ...input,
        starters: input.starters.map((starter, index) =>
          index === 1 ? input.starters[0]! : starter,
        ),
      }),
    ).toThrow(/duplicate player IDs/);
  });

  it("requires exactly one goalkeeper", () => {
    const input = defaultSelectedLineupInput("france");

    expect(() =>
      calculateSelectedLineupRating({
        ...input,
        starters: input.starters.map((starter) =>
          starter.role === "GK" ? { ...starter, role: "CB" } : starter,
        ),
      }),
    ).toThrow(/exactly one goalkeeper/);
  });
});

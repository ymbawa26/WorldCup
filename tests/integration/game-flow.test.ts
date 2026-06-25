import { describe, expect, it } from "vitest";

import {
  accelerateTournament,
  createTournamentGame,
  simulateGroupStage,
  validateLegalLineup,
} from "@/domain/game/engine";

describe("core game flow", () => {
  it("creates a tournament and validates the selected country", () => {
    const state = createTournamentGame({
      seed: "integration-create",
      userTeamId: "united-states",
    });

    expect(state.status).toBe("CREATED");
    expect(validateLegalLineup(state.userTeamId)).toEqual({
      passed: true,
      issues: [],
    });
  });

  it("resolves simultaneous group fixtures in tracked batches", () => {
    const state = createTournamentGame({
      seed: "integration-groups",
      userTeamId: "japan",
    });
    const groupStage = simulateGroupStage(state);

    expect(groupStage.groupMatches).toHaveLength(72);
    expect(groupStage.simultaneousBatches.length).toBeGreaterThan(0);
  });

  it("accelerates the tournament to exactly one champion", () => {
    const result = accelerateTournament("integration-full-run", "mexico");

    expect(result.state.status).toBe("COMPLETE");
    expect(result.state.groupMatches).toHaveLength(72);
    expect(result.state.knockoutMatches).toHaveLength(32);
    expect(result.state.championTeamId).toBeTruthy();
    expect(
      result.state.knockoutMatches.filter(
        (match) => match.matchNumber === 104 && match.winnerTeamId,
      ),
    ).toHaveLength(1);
  });
});

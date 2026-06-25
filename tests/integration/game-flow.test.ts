import { describe, expect, it } from "vitest";

import {
  advanceToNextUserMatch,
  accelerateTournament,
  createTournamentGame,
  gamePresentation,
  nextUserMatchPreview,
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

  it("advances at the selected country's pace and hides the random seed from the flow", () => {
    const created = createTournamentGame({ userTeamId: "brazil" });
    const opener = nextUserMatchPreview(created);

    expect(created.seed).toMatch(/^world-stage-/);
    expect(opener).toMatchObject({
      matchNumber: 7,
      homeTeamId: "brazil",
      awayTeamId: "morocco",
    });
    expect(opener!.odds.homeWin).toBeGreaterThan(opener!.odds.awayWin);

    const afterOpener = advanceToNextUserMatch(created);
    expect(afterOpener.state.status).toBe("IN_PROGRESS");
    expect(
      afterOpener.state.groupMatches.some((match) => match.matchNumber === 7),
    ).toBe(true);
    expect(afterOpener.state.groupMatches).toHaveLength(28);
    expect(afterOpener.nextMatch).toMatchObject({
      matchNumber: 29,
      homeTeamId: "brazil",
      awayTeamId: "haiti",
    });
    expect(afterOpener.state.groupMatches[0]!.modelFactors).toHaveLength(10);
  });

  it("builds player-facing group tables, results, and knockout bracket presentation", () => {
    const created = createTournamentGame({
      seed: "integration-presentation",
      userTeamId: "mexico",
    });
    const afterOpener = advanceToNextUserMatch(created);
    const groupPresentation = gamePresentation(afterOpener.state);

    expect(groupPresentation.groupResults.A).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ matchNumber: 1, homeTeamId: "mexico" }),
      ]),
    );
    expect(groupPresentation.standingsByGroup.A).toHaveLength(4);
    expect(
      groupPresentation.standingsByGroup.A.find(
        (standing) => standing.teamId === "mexico",
      )?.played,
    ).toBe(1);
    expect(groupPresentation.showBracket).toBe(false);

    const complete = accelerateTournament(
      "integration-presentation-complete",
      "mexico",
    );
    const completePresentation = gamePresentation(complete.state);

    expect(completePresentation.showBracket).toBe(true);
    expect(completePresentation.knockoutRounds.ROUND_OF_32).toHaveLength(16);
    expect(completePresentation.knockoutRounds.FINAL).toEqual([
      expect.objectContaining({
        matchNumber: 104,
        winnerTeamId: complete.state.championTeamId,
      }),
    ]);
  });
});

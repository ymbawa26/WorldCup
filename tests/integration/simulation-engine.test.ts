import { describe, expect, it } from "vitest";

import { tournamentSnapshot } from "@/domain/tournament/data";
import { simulateMatch } from "@/domain/simulation/engine";
import { validateMatchSimulation } from "@/domain/simulation/validation";

describe("simulation integration", () => {
  it("simulates the first group fixture from repository data", () => {
    const fixture = tournamentSnapshot.fixtures[0]!;
    const result = simulateMatch({
      seed: "integration-opening-fixture",
      fixtureId: `match-${fixture.matchNumber}`,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
    });

    expect(result.homeTeamId).toBe(fixture.homeTeamId);
    expect(result.awayTeamId).toBe(fixture.awayTeamId);
    expect(result.events[0]).toMatchObject({ type: "KICKOFF", minute: 0 });
    expect(result.events.at(-1)).toMatchObject({ type: "MATCH_END" });
    expect(validateMatchSimulation(result).passed).toBe(true);
  });

  it("supports knockout extra time and shootout resolution", () => {
    const result = simulateMatch({
      seed: "integration-knockout-fixture",
      fixtureId: "round-of-32-test",
      homeTeamId: "argentina",
      awayTeamId: "spain",
      knockout: true,
      allowExtraTime: true,
      allowShootout: true,
    });

    expect(validateMatchSimulation(result).passed).toBe(true);
    if (result.shootout) {
      expect(
        result.events.some((event) => event.type === "SHOOTOUT_KICK"),
      ).toBe(true);
    }
  });

  it("runs tournament-sized batches without UI dependencies", () => {
    const start = performance.now();
    const results = Array.from({ length: 104 }, (_, index) =>
      simulateMatch({
        seed: `batch-${index}`,
        fixtureId: `batch-${index}`,
        homeTeamId: index % 2 === 0 ? "argentina" : "brazil",
        awayTeamId: index % 2 === 0 ? "spain" : "england",
      }),
    );
    const durationMs = performance.now() - start;

    expect(results).toHaveLength(104);
    expect(
      results.every((result) => validateMatchSimulation(result).passed),
    ).toBe(true);
    expect(durationMs).toBeLessThan(1_500);
  });
});

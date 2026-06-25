import { describe, expect, it } from "vitest";

import { simulateMatch } from "@/domain/simulation/engine";
import { validateMatchSimulation } from "@/domain/simulation/validation";

const baseInput = {
  seed: "unit-stable-seed",
  fixtureId: "unit-fixture",
  homeTeamId: "argentina",
  awayTeamId: "spain",
};

describe("headless simulation engine", () => {
  it("reproduces the exact same event log from the same seed and state", () => {
    const first = simulateMatch(baseInput);
    const second = simulateMatch(baseInput);

    expect(second).toEqual(first);
  });

  it("changes the event log when the seed changes", () => {
    const first = simulateMatch(baseInput);
    const second = simulateMatch({ ...baseInput, seed: "different-seed" });

    expect(second.events).not.toEqual(first.events);
  });

  it("passes core event and statistics invariants", () => {
    const result = simulateMatch(baseInput);

    expect(validateMatchSimulation(result)).toEqual({
      passed: true,
      failures: [],
    });
    expect(result.stats.home.shotsOnTarget).toBeLessThanOrEqual(
      result.stats.home.shots,
    );
    expect(result.stats.away.shotsOnTarget).toBeLessThanOrEqual(
      result.stats.away.shots,
    );
  });

  it("keeps simulation clock data independent from animation timing", () => {
    const result = simulateMatch(baseInput);
    const kickoff = result.events[0]!;

    expect(kickoff.data).toMatchObject({
      engineClock: "simulation",
      animationClock: "external",
    });
    expect(result.events.every((event) => Number.isInteger(event.minute))).toBe(
      true,
    );
  });
});

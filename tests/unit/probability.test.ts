import { describe, expect, it } from "vitest";

import {
  estimateExpectedGoals,
  liveProbability,
  prematchProbability,
} from "@/domain/probability/model";
import { teamRatingsById } from "@/domain/ratings/data";

function total(outcomes: { homeWin: number; draw: number; awayWin: number }) {
  return outcomes.homeWin + outcomes.draw + outcomes.awayWin;
}

describe("probability model", () => {
  it("creates bounded prematch probabilities and a normalized score matrix", () => {
    const probability = prematchProbability("argentina", "spain");
    const matrixTotal = probability.scoreMatrix.reduce(
      (sum, cell) => sum + cell.probability,
      0,
    );

    expect(total(probability.outcomes)).toBeCloseTo(1, 5);
    expect(matrixTotal).toBeCloseTo(1, 5);
    expect(probability.scoreMatrix.every((cell) => cell.probability >= 0)).toBe(
      true,
    );
  });

  it("moves live probability monotonically toward a team that leads late", () => {
    const level = liveProbability({
      homeTeamId: "argentina",
      awayTeamId: "spain",
      minute: 75,
      currentScore: { home: 0, away: 0 },
    });
    const leading = liveProbability({
      homeTeamId: "argentina",
      awayTeamId: "spain",
      minute: 75,
      currentScore: { home: 1, away: 0 },
    });

    expect(leading.outcomes.homeWin).toBeGreaterThan(level.outcomes.homeWin);
    expect(leading.outcomes.awayWin).toBeLessThan(level.outcomes.awayWin);
  });

  it("applies red-card player-impact adjustments in the expected direction", () => {
    const home = teamRatingsById.get("argentina")!;
    const away = teamRatingsById.get("spain")!;
    const even = estimateExpectedGoals(home, away);
    const homeRed = estimateExpectedGoals(home, away, { homeRedCards: 1 });
    const awayRed = estimateExpectedGoals(home, away, { awayRedCards: 1 });

    expect(homeRed.home).toBeLessThan(even.home);
    expect(homeRed.away).toBeGreaterThan(even.away);
    expect(awayRed.home).toBeGreaterThan(even.home);
    expect(awayRed.away).toBeLessThan(even.away);
  });
});

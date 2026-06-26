import { describe, expect, it } from "vitest";

import {
  activeTeamRatingFromSetup,
  defaultPrematchTeamSetup,
  listFormations,
  setupWithFormation,
  validatePrematchTeamSetup,
} from "@/domain/formations/service";
import { prematchProbabilityFromRatings } from "@/domain/probability/model";

describe("formation and prematch setup model", () => {
  it("loads the required formation catalog", () => {
    const formations = listFormations();

    expect(formations.map((formation) => formation.id).sort()).toEqual([
      "3-4-2-1",
      "3-4-3",
      "3-5-2",
      "4-1-4-1",
      "4-2-3-1",
      "4-3-2-1",
      "4-3-3",
      "4-4-2",
      "5-3-2",
      "5-4-1",
    ]);
    expect(formations.every((formation) => formation.slots.length === 11)).toBe(
      true,
    );
  });

  it("creates and validates an automatic legal matchday setup", () => {
    const setup = defaultPrematchTeamSetup("brazil", "4-2-3-1");
    const validation = validatePrematchTeamSetup(setup);

    expect(setup.starterIds).toHaveLength(11);
    expect(setup.benchPlayerIds?.length).toBeGreaterThan(0);
    expect(setup.setPieces?.captainId).toBeTruthy();
    expect(validation.passed).toBe(true);
  });

  it("rejects duplicate starters and invalid set-piece assignments", () => {
    const setup = defaultPrematchTeamSetup("france", "4-3-3");
    const validation = validatePrematchTeamSetup({
      ...setup,
      starterIds: setup.starterIds?.map((playerId, index) =>
        index === 1 ? setup.starterIds![0]! : playerId,
      ),
      setPieces: {
        ...setup.setPieces!,
        captainId: setup.benchPlayerIds![0]!,
      },
    });

    expect(validation.passed).toBe(false);
    expect(validation.issues.join(" ")).toMatch(/duplicates|captainId/);
  });

  it("keeps formation and tactic effects bounded", () => {
    const setup = defaultPrematchTeamSetup("argentina", "5-4-1");
    const active = activeTeamRatingFromSetup(
      {
        ...setup,
        tactics: {
          mentality: "DEFENSIVE",
          pressing: "LOW",
          defensiveLine: "DEEP",
          tempo: "SLOW",
          width: "NARROW",
        },
      },
      "3-4-3",
    );

    expect(Object.values(active.strengths).every((value) => value >= 1)).toBe(
      true,
    );
    expect(Object.values(active.strengths).every((value) => value <= 99)).toBe(
      true,
    );
  });

  it("recalculates prematch odds when formation or tactics change", () => {
    const homeSetup = defaultPrematchTeamSetup("brazil", "4-3-3");
    const awaySetup = defaultPrematchTeamSetup("morocco", "4-3-3");
    const baseline = prematchProbabilityFromRatings(
      activeTeamRatingFromSetup(homeSetup, awaySetup.formationId),
      activeTeamRatingFromSetup(awaySetup, homeSetup.formationId),
    );
    const aggressiveHome = setupWithFormation(homeSetup, "3-4-3");
    const adjusted = prematchProbabilityFromRatings(
      activeTeamRatingFromSetup(
        {
          ...aggressiveHome,
          tactics: {
            mentality: "ATTACKING",
            pressing: "HIGH",
            defensiveLine: "HIGH",
            tempo: "FAST",
            width: "WIDE",
          },
        },
        awaySetup.formationId,
      ),
      activeTeamRatingFromSetup(awaySetup, aggressiveHome.formationId),
    );

    expect(adjusted.outcomes.homeWin).not.toBe(baseline.outcomes.homeWin);
  });
});

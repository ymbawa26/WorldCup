import { describe, expect, it } from "vitest";

import { squadDataset, squadQualityReport } from "@/domain/data-ingestion/data";
import { buildSquadSeedPlan } from "@/domain/data-ingestion/seed-plan";
import { validateSquadDataset } from "@/domain/data-ingestion/validation";

describe("official squad dataset", () => {
  it("passes the complete 48-team quality gate", () => {
    expect(squadQualityReport.passed).toBe(true);
    expect(squadQualityReport.totals).toMatchObject({
      teams: 48,
      players: 1248,
      duplicatePlayers: 0,
      estimatedFields: 0,
    });
    expect(squadQualityReport.squads).toHaveLength(48);
    expect(squadQualityReport.squads.every((squad) => squad.passed)).toBe(true);
  });

  it("builds a deterministic, duplicate-free seed plan", () => {
    const first = buildSquadSeedPlan(squadDataset);
    const second = buildSquadSeedPlan(squadDataset);
    expect(second).toEqual(first);
    expect(first.players).toHaveLength(1248);
    expect(new Set(first.players.map((player) => player.id)).size).toBe(1248);
    expect(new Set(first.clubs.map((club) => club.id)).size).toBe(
      first.clubs.length,
    );
  });

  it("fails closed when a squad member is removed", () => {
    const report = validateSquadDataset(
      { ...squadDataset, players: squadDataset.players.slice(1) },
      squadDataset.source.retrievedAt,
    );
    expect(report.passed).toBe(false);
    expect(
      report.failures.some((failure) =>
        failure.includes("expected 26 players"),
      ),
    ).toBe(true);
  });

  it("retains normalized provenance references for every imported field", () => {
    for (const player of squadDataset.players) {
      expect(Object.keys(player.fieldProvenance)).toHaveLength(12);
      expect(new Set(Object.values(player.fieldProvenance))).toEqual(
        new Set([squadDataset.source.sourceId]),
      );
      expect(player.preferredFoot).toBeNull();
      expect(player.secondaryPositions).toEqual([]);
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  buildMissingPlayerDataReport,
  getTeamRoster,
  listRosterTeams,
  validateRosterServices,
} from "@/domain/rosters/service";

describe("roster backend services", () => {
  it("lists all tournament teams with roster counts and ratings", () => {
    const teams = listRosterTeams();

    expect(teams).toHaveLength(48);
    expect(teams.every((team) => team.playerCount === 26)).toBe(true);
    expect(teams.every((team) => team.goalkeeperCount >= 2)).toBe(true);
    expect(teams.every((team) => team.ratings?.attack)).toBe(true);
  });

  it("returns a stable team roster without duplicate players or shirt numbers", () => {
    const roster = getTeamRoster("brazil");
    const playerIds = new Set(roster.players.map((player) => player.id));
    const squadNumbers = new Set(
      roster.players.map((player) => player.squadNumber),
    );

    expect(roster.team.name).toBe("Brazil");
    expect(roster.players).toHaveLength(26);
    expect(playerIds.size).toBe(26);
    expect(squadNumbers.size).toBe(26);
    expect(
      roster.players.filter((player) => player.primaryPosition === "GK").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("validates the roster service contract and missing-data report", () => {
    const report = validateRosterServices();
    const missing = buildMissingPlayerDataReport();

    expect(report).toMatchObject({
      passed: true,
      teams: 48,
      players: 1248,
      failures: [],
    });
    expect(missing.fallbackPlayers).toEqual([]);
    expect(missing.unresolvedTeams).toEqual([]);
  });
});

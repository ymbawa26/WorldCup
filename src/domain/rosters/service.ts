import {
  squadByTeamId,
  squadDataset,
  squadQualityReport,
} from "../data-ingestion/data";
import type { Player } from "../data-ingestion/schema";
import { teamRatingsById } from "../ratings/data";
import { tournamentSnapshot } from "../tournament/data";

export type RosterTeamSummary = {
  id: string;
  name: string;
  shortName: string;
  fifaCode: string;
  flagCode: string;
  group: string;
  playerCount: number;
  goalkeeperCount: number;
  ratings: {
    attack: number;
    midfield: number;
    defense: number;
    goalkeeping: number;
    depth: number;
    setPieces: number;
    overall: number;
  } | null;
};

export type MissingPlayerDataReport = {
  schemaVersion: 1;
  generatedAt: string;
  dataVersion: string;
  fallbackPlayers: Array<{
    playerId: string;
    teamId: string;
    squadNumber: number;
    displayName: string;
    reason: string;
  }>;
  unresolvedTeams: string[];
};

export type RosterValidationReport = {
  passed: boolean;
  teams: number;
  players: number;
  failures: string[];
  missingPlayerData: MissingPlayerDataReport;
};

function teamSummary(teamId: string): RosterTeamSummary {
  const team = tournamentSnapshot.teams.find(
    (candidate) => candidate.id === teamId,
  );
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  const players = squadByTeamId.get(teamId) ?? [];
  const rating = teamRatingsById.get(teamId);
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    fifaCode: team.fifaCode,
    flagCode: team.flagCode,
    group: team.group,
    playerCount: players.length,
    goalkeeperCount: players.filter((player) => player.primaryPosition === "GK")
      .length,
    ratings: rating ? { ...rating.strengths } : null,
  };
}

function isFallbackPlayer(player: Player) {
  return (
    /^Player \d+$/i.test(player.displayName) ||
    /^Player \d+$/i.test(player.fullName)
  );
}

export function listRosterTeams() {
  return tournamentSnapshot.teams.map((team) => teamSummary(team.id));
}

export function getRosterTeam(teamId: string) {
  return teamSummary(teamId);
}

export function getTeamPlayers(teamId: string) {
  if (!tournamentSnapshot.teams.some((team) => team.id === teamId)) {
    throw new Error(`Unknown team: ${teamId}`);
  }
  return squadByTeamId.get(teamId) ?? [];
}

export function getTeamRoster(teamId: string) {
  return {
    team: getRosterTeam(teamId),
    players: getTeamPlayers(teamId),
  };
}

export function buildMissingPlayerDataReport(
  generatedAt = "2026-06-25T10:00:00-04:00",
): MissingPlayerDataReport {
  const fallbackPlayers = squadDataset.players
    .filter(isFallbackPlayer)
    .map((player) => ({
      playerId: player.id,
      teamId: player.teamId,
      squadNumber: player.squadNumber,
      displayName: player.displayName,
      reason: "Fallback identity is present in normalized squad data.",
    }));
  const teamsWithPlayers = new Set(
    squadDataset.players.map((player) => player.teamId),
  );
  const unresolvedTeams = tournamentSnapshot.teams
    .filter((team) => !teamsWithPlayers.has(team.id))
    .map((team) => team.id);

  return {
    schemaVersion: 1,
    generatedAt,
    dataVersion: squadDataset.dataVersion,
    fallbackPlayers,
    unresolvedTeams,
  };
}

export function validateRosterServices(
  generatedAt = "2026-06-25T10:00:00-04:00",
): RosterValidationReport {
  const failures = [...squadQualityReport.failures];
  const seenPlayerIds = new Set<string>();
  const playerTeamPairs = new Set<string>();

  for (const player of squadDataset.players) {
    if (seenPlayerIds.has(player.id)) {
      failures.push(`Duplicate player id ${player.id}`);
    }
    seenPlayerIds.add(player.id);
    const pair = `${player.teamId}:${player.id}`;
    if (playerTeamPairs.has(pair)) {
      failures.push(`Duplicate team/player pair ${pair}`);
    }
    playerTeamPairs.add(pair);
  }

  for (const team of tournamentSnapshot.teams) {
    const players = getTeamPlayers(team.id);
    const shirtNumbers = new Set(players.map((player) => player.squadNumber));
    const goalkeepers = players.filter(
      (player) => player.primaryPosition === "GK",
    );
    if (players.length < 11)
      failures.push(`${team.fifaCode}: fewer than 11 players`);
    if (goalkeepers.length < 2)
      failures.push(`${team.fifaCode}: fewer than 2 goalkeepers`);
    if (shirtNumbers.size !== players.length) {
      failures.push(`${team.fifaCode}: duplicate squad numbers`);
    }
  }

  const missingPlayerData = buildMissingPlayerDataReport(generatedAt);
  if (missingPlayerData.unresolvedTeams.length > 0) {
    failures.push(
      `Unresolved teams: ${missingPlayerData.unresolvedTeams.join(", ")}`,
    );
  }

  return {
    passed:
      failures.length === 0 &&
      tournamentSnapshot.teams.length === 48 &&
      squadDataset.players.length >= 48 * 11,
    teams: tournamentSnapshot.teams.length,
    players: squadDataset.players.length,
    failures,
    missingPlayerData,
  };
}

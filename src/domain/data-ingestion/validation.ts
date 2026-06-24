import { tournamentSnapshot } from "@/domain/tournament/data";

import {
  DataQualityReportSchema,
  SquadDatasetSchema,
  type DataQualityReport,
  type SquadDataset,
} from "./schema";

export function validateSquadDataset(
  input: SquadDataset,
  generatedAt = new Date().toISOString(),
): DataQualityReport {
  const dataset = SquadDatasetSchema.parse(input);
  const knownTeams = new Set(tournamentSnapshot.teams.map((team) => team.id));
  const failures: string[] = [];
  const identities = new Map<string, number>();

  for (const player of dataset.players) {
    identities.set(
      player.externalIdentity,
      (identities.get(player.externalIdentity) ?? 0) + 1,
    );
    if (!knownTeams.has(player.teamId)) {
      failures.push(
        `${player.fullName} references unknown team ${player.teamId}`,
      );
    }
    const provenanceReferences = Object.values(player.fieldProvenance);
    if (
      provenanceReferences.length !== 12 ||
      provenanceReferences.some(
        (sourceId) => sourceId !== dataset.source.sourceId,
      )
    ) {
      failures.push(`${player.fullName} has incomplete field provenance`);
    }
  }

  const duplicatePlayers = [...identities.values()].filter(
    (count) => count > 1,
  ).length;
  if (duplicatePlayers > 0)
    failures.push(`${duplicatePlayers} duplicate player identities`);

  const squads = tournamentSnapshot.teams.map((team) => {
    const players = dataset.players.filter(
      (player) => player.teamId === team.id,
    );
    const goalkeeperCount = players.filter(
      (player) => player.primaryPosition === "GK",
    ).length;
    const uniqueSquadNumbers = new Set(
      players.map((player) => player.squadNumber),
    ).size;
    const issues: string[] = [];
    if (players.length !== 26)
      issues.push(`expected 26 players, received ${players.length}`);
    if (goalkeeperCount < 3)
      issues.push(
        `expected at least 3 goalkeepers, received ${goalkeeperCount}`,
      );
    if (uniqueSquadNumbers !== players.length)
      issues.push("duplicate squad numbers");
    failures.push(...issues.map((issue) => `${team.fifaCode}: ${issue}`));
    return {
      teamId: team.id,
      fifaCode: team.fifaCode,
      playerCount: players.length,
      goalkeeperCount,
      uniqueSquadNumbers,
      passed: issues.length === 0,
      issues,
    };
  });

  const estimatedFields = dataset.players.reduce(
    (total, player) =>
      total +
      Object.values(player.fieldProvenance).filter(
        (sourceId) =>
          sourceId === dataset.source.sourceId && dataset.source.isEstimated,
      ).length,
    0,
  );
  const missingOptionalFields = dataset.players.reduce(
    (total, player) =>
      total +
      Number(player.preferredFoot === null) +
      Number(player.secondaryPositions.length === 0),
    0,
  );

  return DataQualityReportSchema.parse({
    schemaVersion: 1,
    dataVersion: dataset.dataVersion,
    generatedAt,
    passed:
      failures.length === 0 &&
      dataset.players.length === 1248 &&
      squads.length === 48,
    totals: {
      teams: squads.length,
      players: dataset.players.length,
      duplicatePlayers,
      estimatedFields,
      missingOptionalFields,
    },
    squads,
    failures,
  });
}

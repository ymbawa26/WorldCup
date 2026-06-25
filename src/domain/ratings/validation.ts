import { squadDataset } from "../data-ingestion/data";
import { tournamentSnapshot } from "../tournament/data";

import { validateLineupHasNoDuplicatePlayers } from "./model";
import type { RatingDataset } from "./schema";

export function validateRatingDataset(dataset: RatingDataset) {
  const failures: string[] = [];
  const playerIds = new Set(squadDataset.players.map((player) => player.id));
  const teamIds = new Set(tournamentSnapshot.teams.map((team) => team.id));

  if (dataset.players.length !== squadDataset.players.length) {
    failures.push(
      `Expected ${squadDataset.players.length} player ratings; found ${dataset.players.length}`,
    );
  }
  if (dataset.teams.length !== tournamentSnapshot.teams.length) {
    failures.push(
      `Expected ${tournamentSnapshot.teams.length} team ratings; found ${dataset.teams.length}`,
    );
  }

  for (const rating of dataset.players) {
    if (!playerIds.has(rating.playerId)) {
      failures.push(`Rating references unknown player ${rating.playerId}`);
    }
    if (!teamIds.has(rating.teamId)) {
      failures.push(`Rating references unknown team ${rating.teamId}`);
    }
    if (!rating.isEstimated) {
      failures.push(`Player rating ${rating.playerId} must be estimated`);
    }
    const attributeValues = Object.values(rating.attributes);
    if (attributeValues.some((value) => value < 1 || value > 99)) {
      failures.push(
        `Player rating ${rating.playerId} has out-of-range attribute`,
      );
    }
    if (
      rating.overallEstimate !== Math.max(...Object.values(rating.roleRatings))
    ) {
      failures.push(
        `Player rating ${rating.playerId} overall is not derived from role ratings`,
      );
    }
  }

  for (const rating of dataset.teams) {
    if (!teamIds.has(rating.teamId)) {
      failures.push(`Team rating references unknown team ${rating.teamId}`);
    }
    if (!validateLineupHasNoDuplicatePlayers(rating)) {
      failures.push(
        `Team rating ${rating.teamId} has duplicate lineup players`,
      );
    }
    if (!rating.isEstimated) {
      failures.push(`Team rating ${rating.teamId} must be estimated`);
    }
  }

  return {
    passed: failures.length === 0,
    totals: {
      playerRatings: dataset.players.length,
      teamRatings: dataset.teams.length,
      estimatedPlayerRatings: dataset.players.filter(
        (rating) => rating.isEstimated,
      ).length,
      estimatedTeamRatings: dataset.teams.filter((rating) => rating.isEstimated)
        .length,
    },
    failures,
  };
}

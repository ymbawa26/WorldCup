import type { GroupId } from "./schema";

export type CompletedGroupMatch = {
  matchNumber: number;
  group: GroupId;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  homeConductScore?: number;
  awayConductScore?: number;
};

export type TeamStanding = {
  teamId: string;
  group: GroupId;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  teamConductScore: number;
  fifaRankingHistory: number[];
};

type MiniStanding = Pick<
  TeamStanding,
  "teamId" | "points" | "goalsFor" | "goalsAgainst" | "goalDifference"
>;

export class UnresolvedOfficialTieError extends Error {
  constructor(teamIds: string[]) {
    super(
      `Official ranking history is insufficient to resolve the tie between: ${teamIds.join(", ")}`,
    );
    this.name = "UnresolvedOfficialTieError";
  }
}

function emptyStanding(
  teamId: string,
  group: GroupId,
  fifaRankingHistory: number[],
): TeamStanding {
  return {
    teamId,
    group,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    teamConductScore: 0,
    fifaRankingHistory,
  };
}

function applyResult(
  standing: TeamStanding,
  goalsFor: number,
  goalsAgainst: number,
  conductScore: number,
) {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
  standing.teamConductScore += conductScore;

  if (goalsFor > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }
}

function miniTable(
  teamIds: string[],
  matches: CompletedGroupMatch[],
): Map<string, MiniStanding> {
  const selected = new Set(teamIds);
  const table = new Map(
    teamIds.map((teamId) => [
      teamId,
      {
        teamId,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      },
    ]),
  );

  for (const match of matches) {
    if (!selected.has(match.homeTeamId) || !selected.has(match.awayTeamId)) {
      continue;
    }

    const home = table.get(match.homeTeamId)!;
    const away = table.get(match.awayTeamId)!;
    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (match.homeGoals > match.awayGoals) {
      home.points += 3;
    } else if (match.homeGoals < match.awayGoals) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return table;
}

function partitionByValue(
  teamIds: string[],
  value: (teamId: string) => number,
  direction: "ASC" | "DESC" = "DESC",
): string[][] {
  const sorted = [...teamIds].sort((left, right) => {
    const difference = value(left) - value(right);
    return direction === "ASC" ? difference : -difference;
  });
  const partitions: string[][] = [];

  for (const teamId of sorted) {
    const current = partitions.at(-1);
    if (!current || value(current[0]) !== value(teamId)) {
      partitions.push([teamId]);
    } else {
      current.push(teamId);
    }
  }

  return partitions;
}

function headToHeadBuckets(
  teamIds: string[],
  matches: CompletedGroupMatch[],
): string[][] {
  if (teamIds.length < 2) return [teamIds];

  const table = miniTable(teamIds, matches);
  const criteria: Array<(standing: MiniStanding) => number> = [
    (standing) => standing.points,
    (standing) => standing.goalDifference,
    (standing) => standing.goalsFor,
  ];

  for (const criterion of criteria) {
    const partitions = partitionByValue(teamIds, (teamId) =>
      criterion(table.get(teamId)!),
    );

    if (partitions.length > 1) {
      return partitions.flatMap((partition) =>
        partition.length === 1
          ? [partition]
          : headToHeadBuckets(partition, matches),
      );
    }
  }

  return [teamIds];
}

function refineBuckets(
  buckets: string[][],
  value: (teamId: string) => number,
  direction: "ASC" | "DESC" = "DESC",
) {
  return buckets.flatMap((bucket) =>
    bucket.length === 1 ? [bucket] : partitionByValue(bucket, value, direction),
  );
}

function finishWithOverallCriteria(
  buckets: string[][],
  standings: Map<string, TeamStanding>,
): string[] {
  let refined = buckets;
  const criteria: Array<{
    direction: "ASC" | "DESC";
    value: (teamId: string) => number;
  }> = [
    {
      direction: "DESC",
      value: (teamId) => standings.get(teamId)!.goalDifference,
    },
    {
      direction: "DESC",
      value: (teamId) => standings.get(teamId)!.goalsFor,
    },
    {
      direction: "DESC",
      value: (teamId) => standings.get(teamId)!.teamConductScore,
    },
  ];

  for (const criterion of criteria) {
    refined = refineBuckets(refined, criterion.value, criterion.direction);
  }

  const rankingDepth = Math.max(
    ...[...standings.values()].map(
      (standing) => standing.fifaRankingHistory.length,
    ),
  );
  for (let index = 0; index < rankingDepth; index += 1) {
    refined = refineBuckets(
      refined,
      (teamId) => standings.get(teamId)!.fifaRankingHistory[index] ?? Infinity,
      "ASC",
    );
  }

  const unresolved = refined.find((bucket) => bucket.length > 1);
  if (unresolved) throw new UnresolvedOfficialTieError(unresolved);

  return refined.flat();
}

export function buildGroupStandings({
  fifaRankingHistory,
  group,
  matches,
  teamIds,
}: {
  fifaRankingHistory: Record<string, number[]>;
  group: GroupId;
  matches: CompletedGroupMatch[];
  teamIds: string[];
}): TeamStanding[] {
  const standings = new Map(
    teamIds.map((teamId) => [
      teamId,
      emptyStanding(teamId, group, fifaRankingHistory[teamId] ?? []),
    ]),
  );

  for (const match of matches) {
    if (match.group !== group) continue;
    const home = standings.get(match.homeTeamId);
    const away = standings.get(match.awayTeamId);
    if (!home || !away) {
      throw new Error(
        `Match ${match.matchNumber} contains a team outside Group ${group}`,
      );
    }
    if (match.homeGoals < 0 || match.awayGoals < 0) {
      throw new Error("Goals cannot be negative");
    }

    applyResult(
      home,
      match.homeGoals,
      match.awayGoals,
      match.homeConductScore ?? 0,
    );
    applyResult(
      away,
      match.awayGoals,
      match.homeGoals,
      match.awayConductScore ?? 0,
    );
  }

  const pointBuckets = partitionByValue(
    teamIds,
    (teamId) => standings.get(teamId)!.points,
  );
  const rankedIds = pointBuckets.flatMap((bucket) => {
    if (bucket.length === 1) return bucket;
    const headToHead = headToHeadBuckets(bucket, matches);
    return finishWithOverallCriteria(headToHead, standings);
  });

  return rankedIds.map((teamId) => standings.get(teamId)!);
}

export function rankThirdPlacedTeams(
  standings: TeamStanding[],
): TeamStanding[] {
  const byId = new Map(
    standings.map((standing) => [standing.teamId, standing]),
  );
  let buckets = partitionByValue(
    standings.map((standing) => standing.teamId),
    (teamId) => byId.get(teamId)!.points,
  );

  for (const value of [
    (teamId: string) => byId.get(teamId)!.goalDifference,
    (teamId: string) => byId.get(teamId)!.goalsFor,
    (teamId: string) => byId.get(teamId)!.teamConductScore,
  ]) {
    buckets = refineBuckets(buckets, value, "DESC");
  }

  const rankingDepth = Math.max(
    ...standings.map((standing) => standing.fifaRankingHistory.length),
  );
  for (let index = 0; index < rankingDepth; index += 1) {
    buckets = refineBuckets(
      buckets,
      (teamId) => byId.get(teamId)!.fifaRankingHistory[index] ?? Infinity,
      "ASC",
    );
  }

  const unresolved = buckets.find((bucket) => bucket.length > 1);
  if (unresolved) throw new UnresolvedOfficialTieError(unresolved);

  return buckets.flat().map((teamId) => byId.get(teamId)!);
}

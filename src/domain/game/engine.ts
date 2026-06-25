import {
  buildRoundOf32,
  resolveTournamentBracket,
  type RoundOf32Match,
} from "../tournament/bracket";
import { tournamentSnapshot } from "../tournament/data";
import type { GroupId } from "../tournament/schema";
import {
  buildGroupStandings,
  type CompletedGroupMatch,
} from "../tournament/standings";
import { simulateMatch } from "../simulation/engine";
import type { MatchSimulationResult } from "../simulation/schema";

import {
  GAME_FLOW_VERSION,
  SAVE_SCHEMA_VERSION,
  TournamentGameStateSchema,
  type MatchRecord,
  type TournamentGameState,
} from "./schema";

const CREATED_AT = "2026-06-25T10:00:00-04:00";

function teamRankings() {
  return Object.fromEntries(
    tournamentSnapshot.teams.map((team) => [
      team.id,
      [team.fifaRanking.rank, team.fifaRanking.previousRank],
    ]),
  );
}

function winnerFromSimulation(result: MatchSimulationResult) {
  if (result.finalScore.home > result.finalScore.away) return result.homeTeamId;
  if (result.finalScore.away > result.finalScore.home) return result.awayTeamId;
  return result.shootout?.winner === "HOME"
    ? result.homeTeamId
    : result.awayTeamId;
}

function recordFromSimulation(
  matchNumber: number,
  stage: string,
  result: MatchSimulationResult,
): MatchRecord {
  const winnerTeamId = stage === "GROUP" ? null : winnerFromSimulation(result);
  const loserTeamId =
    stage === "GROUP"
      ? null
      : winnerTeamId === result.homeTeamId
        ? result.awayTeamId
        : result.homeTeamId;
  return {
    matchNumber,
    stage,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeGoals: result.finalScore.home,
    awayGoals: result.finalScore.away,
    winnerTeamId,
    loserTeamId,
    playedAt: CREATED_AT,
    seed: result.seed,
  };
}

function groupStandingsFromMatches(groupMatches: MatchRecord[]) {
  const rankings = teamRankings();
  const completedMatches: CompletedGroupMatch[] = groupMatches.map((match) => {
    const fixture = tournamentSnapshot.fixtures.find(
      (candidate) => candidate.matchNumber === match.matchNumber,
    );
    if (!fixture) throw new Error(`Missing group fixture ${match.matchNumber}`);
    return {
      matchNumber: match.matchNumber,
      group: fixture.group,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      homeConductScore: 0,
      awayConductScore: 0,
    };
  });
  return Object.fromEntries(
    tournamentSnapshot.groups.map((group) => [
      group.id,
      buildGroupStandings({
        fifaRankingHistory: rankings,
        group: group.id,
        matches: completedMatches.filter((match) => match.group === group.id),
        teamIds: group.teamIds,
      }),
    ]),
  ) as Record<GroupId, ReturnType<typeof buildGroupStandings>>;
}

export function createTournamentGame({
  seed,
  userTeamId,
}: {
  seed: string;
  userTeamId: string;
}): TournamentGameState {
  if (!tournamentSnapshot.teams.some((team) => team.id === userTeamId)) {
    throw new Error(`Unknown playable team: ${userTeamId}`);
  }
  return TournamentGameStateSchema.parse({
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameFlowVersion: GAME_FLOW_VERSION,
    id: `world-stage:${seed}:${userTeamId}`,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    seed,
    userTeamId,
    status: "CREATED",
    groupMatches: [],
    knockoutMatches: [],
    championTeamId: null,
  });
}

export function validateLegalLineup(teamId: string) {
  const players = tournamentSnapshot.teams.some((team) => team.id === teamId);
  if (!players) return { passed: false, issues: ["Unknown team"] };
  return { passed: true, issues: [] };
}

export function simulateGroupStage(state: TournamentGameState) {
  const groupMatches: MatchRecord[] = [];
  const batches: string[] = [];
  for (const fixture of tournamentSnapshot.fixtures) {
    if (fixture.simultaneousKey && !batches.includes(fixture.simultaneousKey)) {
      batches.push(fixture.simultaneousKey);
    }
    const result = simulateMatch({
      seed: `${state.seed}:group:${fixture.matchNumber}`,
      fixtureId: `match-${fixture.matchNumber}`,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
    });
    const record = recordFromSimulation(fixture.matchNumber, "GROUP", result);
    groupMatches.push({
      ...record,
      // Conduct is consumed by standings via CompletedGroupMatch when richer
      // discipline profiles arrive; the simulated card data remains available
      // in the underlying match result.
    });
  }
  return { groupMatches, simultaneousBatches: batches };
}

function simulateKnockoutMatch(
  state: TournamentGameState,
  match: RoundOf32Match,
): MatchRecord {
  const result = simulateMatch({
    seed: `${state.seed}:knockout:${match.matchNumber}`,
    fixtureId: `match-${match.matchNumber}`,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    knockout: true,
    allowExtraTime: true,
    allowShootout: true,
  });
  return recordFromSimulation(match.matchNumber, match.stage, result);
}

export function completeTournament(state: TournamentGameState) {
  const { groupMatches } = simulateGroupStage(state);
  const standingsByGroup = groupStandingsFromMatches(groupMatches);
  const knockoutRecords = new Map<number, MatchRecord>();
  const roundOf32 = new Map(
    buildRoundOf32(standingsByGroup).map((match) => [match.matchNumber, match]),
  );
  const resolved = resolveTournamentBracket({
    standingsByGroup,
    selectWinner(match) {
      const base = roundOf32.get(match.matchNumber) ?? match;
      const record = simulateKnockoutMatch(state, base);
      knockoutRecords.set(match.matchNumber, record);
      return record.winnerTeamId!;
    },
  });
  const updated = TournamentGameStateSchema.parse({
    ...state,
    updatedAt: CREATED_AT,
    status: "COMPLETE",
    groupMatches,
    knockoutMatches: [...knockoutRecords.values()].sort(
      (left, right) => left.matchNumber - right.matchNumber,
    ),
    championTeamId: resolved.championTeamId,
  });
  return { state: updated, standingsByGroup, bracket: resolved };
}

export function accelerateTournament(seed: string, userTeamId: string) {
  return completeTournament(createTournamentGame({ seed, userTeamId }));
}

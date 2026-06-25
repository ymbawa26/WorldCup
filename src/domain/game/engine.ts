import {
  buildRoundOf32,
  resolveTournamentBracket,
  type RoundOf32Match,
  type ResolvedKnockoutMatch,
} from "../tournament/bracket";
import { knockoutBracket, tournamentSnapshot } from "../tournament/data";
import type { GroupFixture, GroupId } from "../tournament/schema";
import {
  buildGroupStandings,
  type CompletedGroupMatch,
} from "../tournament/standings";
import { prematchProbability } from "../probability/model";
import { NamedRandomStreams } from "../simulation/random";

import {
  GAME_FLOW_VERSION,
  SAVE_SCHEMA_VERSION,
  TournamentGameStateSchema,
  type MatchRecord,
  type TournamentGameState,
} from "./schema";

const CREATED_AT = "2026-06-25T10:00:00-04:00";
const MATCHUP_FACTORS = [
  "attack",
  "midfield",
  "defense",
  "goalkeeping",
  "depth",
  "setPieces",
  "overall",
  "fifaRankingPoints",
  "rankingMomentum",
  "ratingConfidence",
] as const;

function teamRankings() {
  return Object.fromEntries(
    tournamentSnapshot.teams.map((team) => [
      team.id,
      [team.fifaRanking.rank, team.fifaRanking.previousRank],
    ]),
  );
}

function weightedRecordFromProbability(input: {
  matchNumber: number;
  stage: string;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  knockout?: boolean;
}): MatchRecord {
  const probability = prematchProbability(input.homeTeamId, input.awayTeamId);
  const random = new NamedRandomStreams(input.seed);
  const roll = random.next("scoreline");
  let cumulative = 0;
  const score =
    probability.scoreMatrix.find((cell) => {
      cumulative += cell.probability;
      return roll <= cumulative;
    }) ?? probability.scoreMatrix.at(-1)!;
  let winnerTeamId: string | null = null;
  let loserTeamId: string | null = null;
  if (input.knockout) {
    if (score.homeGoals > score.awayGoals) winnerTeamId = input.homeTeamId;
    else if (score.awayGoals > score.homeGoals) winnerTeamId = input.awayTeamId;
    else {
      const decisiveTotal =
        probability.outcomes.homeWin + probability.outcomes.awayWin;
      winnerTeamId = random.chance(
        "knockout-decider",
        probability.outcomes.homeWin / decisiveTotal,
      )
        ? input.homeTeamId
        : input.awayTeamId;
    }
    loserTeamId =
      winnerTeamId === input.homeTeamId ? input.awayTeamId : input.homeTeamId;
  }
  return {
    matchNumber: input.matchNumber,
    stage: input.stage,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeGoals: score.homeGoals,
    awayGoals: score.awayGoals,
    winnerTeamId,
    loserTeamId,
    playedAt: CREATED_AT,
    seed: input.seed,
    prematchOdds: probability.outcomes,
    modelFactors: [...MATCHUP_FACTORS],
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

function groupForMatch(matchNumber: number) {
  const fixture = tournamentSnapshot.fixtures.find(
    (candidate) => candidate.matchNumber === matchNumber,
  );
  if (!fixture) throw new Error(`Missing group fixture ${matchNumber}`);
  return fixture.group;
}

export function createTournamentGame({
  seed = `world-stage-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`,
  userTeamId,
}: {
  seed?: string;
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
    groupMatches.push(groupMatchRecord(state, fixture));
  }
  return { groupMatches, simultaneousBatches: batches };
}

function simulateKnockoutMatch(
  state: TournamentGameState,
  match: RoundOf32Match,
): MatchRecord {
  return weightedRecordFromProbability({
    seed: `${state.seed}:knockout:${match.matchNumber}`,
    matchNumber: match.matchNumber,
    stage: match.stage,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    knockout: true,
  });
}

function hasTeam(
  match: { homeTeamId: string; awayTeamId: string },
  teamId: string,
) {
  return match.homeTeamId === teamId || match.awayTeamId === teamId;
}

function groupMatchRecord(state: TournamentGameState, fixture: GroupFixture) {
  return weightedRecordFromProbability({
    seed: `${state.seed}:group:${fixture.matchNumber}`,
    matchNumber: fixture.matchNumber,
    stage: "GROUP",
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
  });
}

function addGroupRecord(records: MatchRecord[], record: MatchRecord) {
  if (records.some((match) => match.matchNumber === record.matchNumber)) {
    return records;
  }
  return [...records, record].sort(
    (left, right) => left.matchNumber - right.matchNumber,
  );
}

function completedKnockoutByNumber(state: TournamentGameState) {
  return new Map(
    state.knockoutMatches.map((match) => [
      match.matchNumber,
      {
        ...match,
        date: "",
        venueId: "",
        homeSlot: "",
        awaySlot: "",
      } as ResolvedKnockoutMatch,
    ]),
  );
}

export function gamePresentation(state: TournamentGameState) {
  const standingsByGroup = groupStandingsFromMatches(state.groupMatches);
  const knockoutRecords = new Map(
    state.knockoutMatches.map((match) => [match.matchNumber, match]),
  );
  const resolvedKnockout = completedKnockoutByNumber(state);
  const knockoutParticipants = groupStageComplete(state)
    ? resolveKnockoutParticipants(state, resolvedKnockout)
    : [];

  return {
    groupResults: Object.fromEntries(
      tournamentSnapshot.groups.map((group) => [
        group.id,
        state.groupMatches
          .filter((match) => groupForMatch(match.matchNumber) === group.id)
          .sort((left, right) => left.matchNumber - right.matchNumber),
      ]),
    ) as Record<GroupId, MatchRecord[]>,
    standingsByGroup,
    knockoutRounds: knockoutBracket.matches.reduce(
      (rounds, bracketMatch) => {
        const participantMatch = knockoutParticipants.find(
          (match) => match?.matchNumber === bracketMatch.matchNumber,
        );
        const record = knockoutRecords.get(bracketMatch.matchNumber) ?? null;
        const match = {
          matchNumber: bracketMatch.matchNumber,
          stage: bracketMatch.stage,
          homeTeamId:
            record?.homeTeamId ?? participantMatch?.homeTeamId ?? null,
          awayTeamId:
            record?.awayTeamId ?? participantMatch?.awayTeamId ?? null,
          homeGoals: record?.homeGoals ?? null,
          awayGoals: record?.awayGoals ?? null,
          winnerTeamId: record?.winnerTeamId ?? null,
        };
        return {
          ...rounds,
          [bracketMatch.stage]: [...(rounds[bracketMatch.stage] ?? []), match],
        };
      },
      {} as Record<
        string,
        Array<{
          matchNumber: number;
          stage: string;
          homeTeamId: string | null;
          awayTeamId: string | null;
          homeGoals: number | null;
          awayGoals: number | null;
          winnerTeamId: string | null;
        }>
      >,
    ),
    showBracket: groupStageComplete(state) || state.knockoutMatches.length > 0,
  };
}

function groupStageComplete(state: TournamentGameState) {
  return state.groupMatches.length === tournamentSnapshot.fixtures.length;
}

function userStillAlive(state: TournamentGameState) {
  return !state.knockoutMatches.some(
    (match) =>
      hasTeam(match, state.userTeamId) &&
      match.loserTeamId === state.userTeamId,
  );
}

function standingsForState(state: TournamentGameState) {
  if (!groupStageComplete(state)) return null;
  return groupStandingsFromMatches(state.groupMatches);
}

function roundOf32ForState(state: TournamentGameState) {
  const standingsByGroup = standingsForState(state);
  return standingsByGroup ? buildRoundOf32(standingsByGroup) : [];
}

function resolveKnockoutParticipants(
  state: TournamentGameState,
  resolved: Map<number, ResolvedKnockoutMatch>,
) {
  const roundOf32 = new Map(
    roundOf32ForState(state).map((match) => [match.matchNumber, match]),
  );
  return knockoutBracket.matches.map((match) => {
    const base = roundOf32.get(match.matchNumber);
    const resolveProgressionSlot = (slot: string) => {
      const sourceMatch = Number(slot.slice(1));
      const source = resolved.get(sourceMatch);
      if (!source) return null;
      return slot.startsWith("W") ? source.winnerTeamId : source.loserTeamId;
    };
    const homeTeamId =
      base?.homeTeamId ?? resolveProgressionSlot(match.homeSlot);
    const awayTeamId =
      base?.awayTeamId ?? resolveProgressionSlot(match.awaySlot);
    if (!homeTeamId || !awayTeamId) return null;
    return { ...match, homeTeamId, awayTeamId };
  });
}

function upsertKnockoutRecord(records: MatchRecord[], record: MatchRecord) {
  if (records.some((match) => match.matchNumber === record.matchNumber)) {
    return records;
  }
  return [...records, record].sort(
    (left, right) => left.matchNumber - right.matchNumber,
  );
}

export function nextUserMatchPreview(state: TournamentGameState) {
  if (state.status === "COMPLETE") return null;
  const playedGroupNumbers = new Set(
    state.groupMatches.map((match) => match.matchNumber),
  );
  const nextGroupFixture = tournamentSnapshot.fixtures.find(
    (fixture) =>
      hasTeam(fixture, state.userTeamId) &&
      !playedGroupNumbers.has(fixture.matchNumber),
  );
  if (nextGroupFixture) {
    return {
      matchNumber: nextGroupFixture.matchNumber,
      stage: "GROUP",
      homeTeamId: nextGroupFixture.homeTeamId,
      awayTeamId: nextGroupFixture.awayTeamId,
      odds: prematchProbability(
        nextGroupFixture.homeTeamId,
        nextGroupFixture.awayTeamId,
      ).outcomes,
    };
  }

  if (!groupStageComplete(state)) return null;
  if (!userStillAlive(state)) return null;

  const resolved = completedKnockoutByNumber(state);
  const nextKnockout = resolveKnockoutParticipants(state, resolved).find(
    (match) =>
      match &&
      !state.knockoutMatches.some(
        (record) => record.matchNumber === match.matchNumber,
      ) &&
      hasTeam(match, state.userTeamId),
  );
  if (!nextKnockout) return null;
  return {
    matchNumber: nextKnockout.matchNumber,
    stage: nextKnockout.stage,
    homeTeamId: nextKnockout.homeTeamId,
    awayTeamId: nextKnockout.awayTeamId,
    odds: prematchProbability(nextKnockout.homeTeamId, nextKnockout.awayTeamId)
      .outcomes,
  };
}

export function advanceToNextUserMatch(state: TournamentGameState) {
  let nextState = state;
  const playedGroupNumbers = new Set(
    nextState.groupMatches.map((match) => match.matchNumber),
  );
  const nextUserFixture = tournamentSnapshot.fixtures.find(
    (fixture) =>
      hasTeam(fixture, nextState.userTeamId) &&
      !playedGroupNumbers.has(fixture.matchNumber),
  );

  if (nextUserFixture) {
    let groupMatches = addGroupRecord(
      nextState.groupMatches,
      groupMatchRecord(nextState, nextUserFixture),
    );
    const followingUserFixture = tournamentSnapshot.fixtures.find(
      (fixture) =>
        fixture.matchNumber > nextUserFixture.matchNumber &&
        hasTeam(fixture, nextState.userTeamId),
    );
    const boundary = followingUserFixture?.matchNumber ?? Infinity;
    for (const fixture of tournamentSnapshot.fixtures) {
      if (fixture.matchNumber >= boundary) break;
      if (hasTeam(fixture, nextState.userTeamId)) continue;
      if (
        groupMatches.some((match) => match.matchNumber === fixture.matchNumber)
      ) {
        continue;
      }
      groupMatches = addGroupRecord(
        groupMatches,
        groupMatchRecord({ ...nextState, groupMatches }, fixture),
      );
    }
    nextState = TournamentGameStateSchema.parse({
      ...nextState,
      updatedAt: CREATED_AT,
      status: "IN_PROGRESS",
      groupMatches,
    });
    return { state: nextState, nextMatch: nextUserMatchPreview(nextState) };
  }

  if (!groupStageComplete(nextState)) {
    let groupMatches = nextState.groupMatches;
    for (const fixture of tournamentSnapshot.fixtures) {
      if (
        groupMatches.some((match) => match.matchNumber === fixture.matchNumber)
      ) {
        continue;
      }
      groupMatches = addGroupRecord(
        groupMatches,
        groupMatchRecord({ ...nextState, groupMatches }, fixture),
      );
    }
    nextState = TournamentGameStateSchema.parse({
      ...nextState,
      updatedAt: CREATED_AT,
      status: "IN_PROGRESS",
      groupMatches,
    });
  }

  const roundOf32 = roundOf32ForState(nextState);
  if (!roundOf32.some((match) => hasTeam(match, nextState.userTeamId))) {
    const finished = completeRemainingTournament(nextState).state;
    return { state: finished, nextMatch: null };
  }

  let knockoutMatches = nextState.knockoutMatches;
  let resolved = completedKnockoutByNumber({ ...nextState, knockoutMatches });
  let playedUserMatchThisAdvance = false;
  while (true) {
    const match = resolveKnockoutParticipants(nextState, resolved).find(
      (candidate) =>
        candidate &&
        !knockoutMatches.some(
          (record) => record.matchNumber === candidate.matchNumber,
        ),
    );
    if (!match) break;
    if (
      knockoutMatches.some((record) => record.matchNumber === match.matchNumber)
    ) {
      break;
    }
    const involvesUser = hasTeam(match, nextState.userTeamId);
    if (involvesUser && playedUserMatchThisAdvance) break;
    const record = simulateKnockoutMatch(nextState, match);
    knockoutMatches = upsertKnockoutRecord(knockoutMatches, record);
    resolved = completedKnockoutByNumber({ ...nextState, knockoutMatches });
    if (involvesUser) {
      playedUserMatchThisAdvance = true;
      if (record.loserTeamId === nextState.userTeamId) {
        const finished = completeRemainingTournament({
          ...nextState,
          knockoutMatches,
        }).state;
        return { state: finished, nextMatch: null };
      }
    }
  }

  const championTeamId =
    knockoutMatches.find((match) => match.matchNumber === 104)?.winnerTeamId ??
    null;
  nextState = TournamentGameStateSchema.parse({
    ...nextState,
    updatedAt: CREATED_AT,
    status: championTeamId ? "COMPLETE" : "IN_PROGRESS",
    knockoutMatches,
    championTeamId,
  });
  return { state: nextState, nextMatch: nextUserMatchPreview(nextState) };
}

export function completeRemainingTournament(state: TournamentGameState) {
  let groupMatches = state.groupMatches;
  if (groupMatches.length < tournamentSnapshot.fixtures.length) {
    for (const fixture of tournamentSnapshot.fixtures) {
      if (
        groupMatches.some((match) => match.matchNumber === fixture.matchNumber)
      ) {
        continue;
      }
      groupMatches = addGroupRecord(
        groupMatches,
        groupMatchRecord({ ...state, groupMatches }, fixture),
      );
    }
  }

  const standingsByGroup = groupStandingsFromMatches(groupMatches);
  let knockoutMatches = state.knockoutMatches;
  let resolved = completedKnockoutByNumber({ ...state, knockoutMatches });

  while (knockoutMatches.length < knockoutBracket.matches.length) {
    const match = resolveKnockoutParticipants(
      { ...state, groupMatches, knockoutMatches },
      resolved,
    ).find(
      (candidate) =>
        candidate &&
        !knockoutMatches.some(
          (record) => record.matchNumber === candidate.matchNumber,
        ),
    );
    if (!match) break;
    const record = simulateKnockoutMatch(
      { ...state, groupMatches, knockoutMatches },
      match,
    );
    knockoutMatches = upsertKnockoutRecord(knockoutMatches, record);
    resolved = completedKnockoutByNumber({ ...state, knockoutMatches });
  }

  const championTeamId =
    knockoutMatches.find((match) => match.matchNumber === 104)?.winnerTeamId ??
    null;
  return {
    state: TournamentGameStateSchema.parse({
      ...state,
      updatedAt: CREATED_AT,
      status: "COMPLETE",
      groupMatches,
      knockoutMatches,
      championTeamId,
    }),
    standingsByGroup,
    bracket: {
      championTeamId,
      matches: [...resolved.values()],
    },
  };
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

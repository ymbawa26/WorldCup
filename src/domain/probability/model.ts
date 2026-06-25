import { teamRatingsById } from "../ratings/data";
import type { TeamRating } from "../ratings/schema";
import type { MatchSimulationResult } from "../simulation/schema";
import { tournamentSnapshot } from "../tournament/data";

import {
  PROBABILITY_MODEL_VERSION,
  type LiveProbability,
  type OutcomeProbability,
  type PrematchProbability,
} from "./schema";

const MAX_GOALS = 10;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 6) {
  return Number(value.toFixed(digits));
}

function poisson(lambda: number, goals: number) {
  if (goals === 0) return Math.exp(-lambda);
  let factorial = 1;
  for (let value = 2; value <= goals; value += 1) factorial *= value;
  return (Math.exp(-lambda) * lambda ** goals) / factorial;
}

function normalize(outcomes: OutcomeProbability): OutcomeProbability {
  const total = outcomes.homeWin + outcomes.draw + outcomes.awayWin;
  return {
    homeWin: round(outcomes.homeWin / total),
    draw: round(outcomes.draw / total),
    awayWin: round(outcomes.awayWin / total),
  };
}

function getTeam(teamId: string) {
  const team = teamRatingsById.get(teamId);
  if (!team) throw new Error(`Unknown team rating for probability: ${teamId}`);
  return team;
}

function getTournamentTeam(teamId: string) {
  const team = tournamentSnapshot.teams.find(
    (candidate) => candidate.id === teamId,
  );
  if (!team)
    throw new Error(`Unknown tournament team for probability: ${teamId}`);
  return team;
}

function weightedQuality(team: TeamRating) {
  const tournamentTeam = getTournamentTeam(team.teamId);
  const ratingQuality =
    team.strengths.attack * 0.16 +
    team.strengths.midfield * 0.13 +
    team.strengths.defense * 0.13 +
    team.strengths.goalkeeping * 0.1 +
    team.strengths.depth * 0.08 +
    team.strengths.setPieces * 0.06 +
    team.strengths.overall * 0.14;
  const fifaPointsQuality = tournamentTeam.fifaRanking.points / 24;
  const rankQuality = (220 - tournamentTeam.fifaRanking.rank) / 3.2;
  const momentum =
    (tournamentTeam.fifaRanking.previousPoints -
      tournamentTeam.fifaRanking.points) /
    -18;
  const confidence = team.confidenceScore * 7 - team.uncertainty * 3;

  return (
    ratingQuality + fifaPointsQuality + rankQuality + momentum + confidence
  );
}

export function estimateExpectedGoals(
  home: TeamRating,
  away: TeamRating,
  options: {
    minutesRemaining?: number;
    homeRedCards?: number;
    awayRedCards?: number;
  } = {},
) {
  const minutesFactor = (options.minutesRemaining ?? 90) / 90;
  const qualityGap = weightedQuality(home) - weightedQuality(away);
  const homeAttack =
    home.strengths.attack * 0.28 +
    home.strengths.midfield * 0.12 +
    home.strengths.setPieces * 0.08 +
    home.strengths.depth * 0.05;
  const awayAttack =
    away.strengths.attack * 0.28 +
    away.strengths.midfield * 0.12 +
    away.strengths.setPieces * 0.08 +
    away.strengths.depth * 0.05;
  const homeDefense =
    home.strengths.defense * 0.28 +
    home.strengths.goalkeeping * 0.18 +
    home.strengths.midfield * 0.08;
  const awayDefense =
    away.strengths.defense * 0.28 +
    away.strengths.goalkeeping * 0.18 +
    away.strengths.midfield * 0.08;
  const homeManpower = clamp(1 - (options.homeRedCards ?? 0) * 0.18, 0.52, 1);
  const awayManpower = clamp(1 - (options.awayRedCards ?? 0) * 0.18, 0.52, 1);
  const homeLambda =
    (1.28 + (homeAttack - awayDefense) / 95 + qualityGap / 28) *
    homeManpower *
    (1 + (1 - awayManpower) * 0.42);
  const awayLambda =
    (1.12 + (awayAttack - homeDefense) / 95 - qualityGap / 28) *
    awayManpower *
    (1 + (1 - homeManpower) * 0.42);

  return {
    home: round(clamp(homeLambda * minutesFactor, 0.08, 5.4)),
    away: round(clamp(awayLambda * minutesFactor, 0.08, 5.4)),
  };
}

export function buildScoreMatrix(homeLambda: number, awayLambda: number) {
  const cells: PrematchProbability["scoreMatrix"] = [];
  let total = 0;
  for (let homeGoals = 0; homeGoals <= MAX_GOALS; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= MAX_GOALS; awayGoals += 1) {
      const probability =
        poisson(homeLambda, homeGoals) * poisson(awayLambda, awayGoals);
      cells.push({ homeGoals, awayGoals, probability });
      total += probability;
    }
  }
  return cells.map((cell) => ({
    ...cell,
    probability: round(cell.probability / total),
  }));
}

export function outcomesFromMatrix(
  scoreMatrix: PrematchProbability["scoreMatrix"],
  currentScore = { home: 0, away: 0 },
): OutcomeProbability {
  const outcomes = scoreMatrix.reduce(
    (totals, cell) => {
      const home = currentScore.home + cell.homeGoals;
      const away = currentScore.away + cell.awayGoals;
      if (home > away) totals.homeWin += cell.probability;
      else if (home === away) totals.draw += cell.probability;
      else totals.awayWin += cell.probability;
      return totals;
    },
    { homeWin: 0, draw: 0, awayWin: 0 },
  );
  return normalize(outcomes);
}

export function prematchProbability(
  homeTeamId: string,
  awayTeamId: string,
): PrematchProbability {
  const home = getTeam(homeTeamId);
  const away = getTeam(awayTeamId);
  const expectedGoals = estimateExpectedGoals(home, away);
  const scoreMatrix = buildScoreMatrix(expectedGoals.home, expectedGoals.away);
  return {
    modelVersion: PROBABILITY_MODEL_VERSION,
    homeTeamId,
    awayTeamId,
    expectedGoals,
    outcomes: outcomesFromMatrix(scoreMatrix),
    scoreMatrix,
  };
}

export function liveProbability(input: {
  homeTeamId: string;
  awayTeamId: string;
  minute: number;
  currentScore: { home: number; away: number };
  redCards?: { home: number; away: number };
}): LiveProbability {
  const home = getTeam(input.homeTeamId);
  const away = getTeam(input.awayTeamId);
  const redCards = input.redCards ?? { home: 0, away: 0 };
  const minutesRemaining = clamp(90 - input.minute, 0, 90);
  const remainingExpectedGoals = estimateExpectedGoals(home, away, {
    minutesRemaining,
    homeRedCards: redCards.home,
    awayRedCards: redCards.away,
  });
  const scoreMatrix = buildScoreMatrix(
    remainingExpectedGoals.home,
    remainingExpectedGoals.away,
  );
  return {
    modelVersion: PROBABILITY_MODEL_VERSION,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    minute: input.minute,
    currentScore: input.currentScore,
    redCards,
    expectedGoals: estimateExpectedGoals(home, away),
    remainingExpectedGoals,
    outcomes: outcomesFromMatrix(scoreMatrix, input.currentScore),
    scoreMatrix,
  };
}

export function probabilityFromSimulationResult(result: MatchSimulationResult) {
  return liveProbability({
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    minute: result.events.at(-1)?.minute ?? 90,
    currentScore: result.finalScore,
    redCards: {
      home: result.stats.home.redCards,
      away: result.stats.away.redCards,
    },
  });
}

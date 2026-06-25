import type { Player } from "../data-ingestion/schema";
import type { TournamentTeam } from "../tournament/schema";

import {
  RATING_MODEL_VERSION,
  type PlayerRating,
  type RatingAttribute,
  type RatingDataset,
  type TacticalRole,
  type TeamRating,
} from "./schema";

export const RATING_DATA_VERSION = "2026.06.24-rating-model-v1" as const;
export const RATING_CREATED_AT = "2026-06-24T20:00:00-04:00" as const;
export const DEFAULT_FORMATION = "4-3-3" as const;

export const RATING_ATTRIBUTES: RatingAttribute[] = [
  "pace",
  "shooting",
  "passing",
  "defending",
  "goalkeeping",
  "physical",
  "mentality",
  "form",
];

export const TACTICAL_ROLES: TacticalRole[] = [
  "GK",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
];

const roleWeights: Record<TacticalRole, Record<RatingAttribute, number>> = {
  GK: {
    goalkeeping: 0.5,
    mentality: 0.16,
    physical: 0.12,
    passing: 0.08,
    defending: 0.06,
    pace: 0.04,
    form: 0.04,
    shooting: 0,
  },
  CB: {
    defending: 0.34,
    physical: 0.2,
    mentality: 0.16,
    passing: 0.12,
    pace: 0.08,
    form: 0.06,
    goalkeeping: 0,
    shooting: 0.04,
  },
  FB: {
    pace: 0.22,
    defending: 0.22,
    physical: 0.14,
    passing: 0.14,
    mentality: 0.12,
    form: 0.08,
    shooting: 0.08,
    goalkeeping: 0,
  },
  DM: {
    defending: 0.25,
    passing: 0.22,
    mentality: 0.18,
    physical: 0.14,
    form: 0.08,
    pace: 0.07,
    shooting: 0.06,
    goalkeeping: 0,
  },
  CM: {
    passing: 0.27,
    mentality: 0.18,
    physical: 0.13,
    defending: 0.13,
    form: 0.11,
    shooting: 0.1,
    pace: 0.08,
    goalkeeping: 0,
  },
  AM: {
    passing: 0.26,
    shooting: 0.2,
    mentality: 0.15,
    pace: 0.13,
    form: 0.11,
    physical: 0.08,
    defending: 0.07,
    goalkeeping: 0,
  },
  WG: {
    pace: 0.27,
    shooting: 0.2,
    passing: 0.18,
    form: 0.12,
    mentality: 0.1,
    physical: 0.08,
    defending: 0.05,
    goalkeeping: 0,
  },
  ST: {
    shooting: 0.34,
    physical: 0.16,
    pace: 0.14,
    mentality: 0.14,
    form: 0.1,
    passing: 0.08,
    defending: 0.04,
    goalkeeping: 0,
  },
};

export const ROLE_FIT_BY_POSITION: Record<
  Player["primaryPosition"],
  Record<TacticalRole, number>
> = {
  GK: {
    GK: 1,
    CB: 0.1,
    FB: 0.1,
    DM: 0.1,
    CM: 0.1,
    AM: 0.08,
    WG: 0.08,
    ST: 0.08,
  },
  DF: {
    GK: 0.05,
    CB: 1,
    FB: 0.92,
    DM: 0.76,
    CM: 0.48,
    AM: 0.34,
    WG: 0.4,
    ST: 0.28,
  },
  MF: {
    GK: 0.05,
    CB: 0.52,
    FB: 0.62,
    DM: 1,
    CM: 1,
    AM: 0.94,
    WG: 0.78,
    ST: 0.58,
  },
  FW: {
    GK: 0.05,
    CB: 0.18,
    FB: 0.36,
    DM: 0.38,
    CM: 0.55,
    AM: 0.78,
    WG: 1,
    ST: 1,
  },
};

const lineupRoles: TacticalRole[] = [
  "GK",
  "FB",
  "CB",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
  "WG",
];

function clamp(value: number, min = 1, max = 99) {
  return Math.max(min, Math.min(max, value));
}

function rating(value: number) {
  return Math.round(clamp(value));
}

function boundedLog(value: number, divisor: number, max: number) {
  return Math.min(max, Math.log1p(value) / divisor);
}

function ageCurve(age: number, peak: number, spread: number) {
  return clamp(1 - Math.abs(age - peak) / spread, 0, 1);
}

function teamContext(team: TournamentTeam) {
  const rankScore = 1 - (team.fifaRanking.rank - 1) / 210;
  const pointsScore = clamp((team.fifaRanking.points - 900) / 1100, 0, 1);
  return clamp(0.68 * rankScore + 0.32 * pointsScore, 0, 1);
}

function positionBaseline(position: Player["primaryPosition"]) {
  switch (position) {
    case "GK":
      return {
        pace: 43,
        shooting: 18,
        passing: 51,
        defending: 43,
        goalkeeping: 58,
        physical: 58,
        mentality: 54,
        form: 50,
      };
    case "DF":
      return {
        pace: 56,
        shooting: 34,
        passing: 52,
        defending: 59,
        goalkeeping: 10,
        physical: 60,
        mentality: 54,
        form: 50,
      };
    case "MF":
      return {
        pace: 58,
        shooting: 48,
        passing: 59,
        defending: 50,
        goalkeeping: 10,
        physical: 56,
        mentality: 57,
        form: 50,
      };
    case "FW":
      return {
        pace: 62,
        shooting: 60,
        passing: 51,
        defending: 31,
        goalkeeping: 10,
        physical: 57,
        mentality: 55,
        form: 50,
      };
  }
}

export function buildPlayerRating(
  player: Player,
  team: TournamentTeam,
): PlayerRating {
  const context = teamContext(team);
  const caps = boundedLog(player.internationalCaps, Math.log(101), 1);
  const goals = boundedLog(player.internationalGoals, Math.log(51), 1);
  const goalRate = player.internationalCaps
    ? clamp(player.internationalGoals / player.internationalCaps, 0, 1)
    : 0;
  const ageOutfield = ageCurve(player.ageAtTournamentStart, 27, 12);
  const ageKeeper = ageCurve(player.ageAtTournamentStart, 30, 14);
  const height = clamp((player.heightCm - 165) / 35, 0, 1);
  const baseline = positionBaseline(player.primaryPosition);
  const common = 10 * context + 9 * caps;
  const age = player.primaryPosition === "GK" ? ageKeeper : ageOutfield;

  const attributes: PlayerRating["attributes"] = {
    pace: rating(
      baseline.pace +
        8 * age +
        4 * context -
        Math.max(0, player.ageAtTournamentStart - 30) * 0.9,
    ),
    shooting: rating(
      baseline.shooting + 10 * goals + 6 * goalRate + 5 * context + 2 * caps,
    ),
    passing: rating(baseline.passing + common + 4 * age),
    defending: rating(
      baseline.defending +
        common * 0.9 +
        (player.primaryPosition === "DF" ? 5 * height : 0),
    ),
    goalkeeping: rating(
      baseline.goalkeeping +
        (player.primaryPosition === "GK"
          ? common + 7 * height + 5 * ageKeeper
          : 0),
    ),
    physical: rating(baseline.physical + 10 * height + 5 * age + 3 * context),
    mentality: rating(baseline.mentality + 13 * caps + 7 * context + 3 * age),
    form: rating(48 + 12 * context + 6 * caps + 3 * age),
  };

  const roleRatings = Object.fromEntries(
    TACTICAL_ROLES.map((role) => {
      const weighted = Object.entries(roleWeights[role]).reduce(
        (sum, [attribute, weight]) =>
          sum + attributes[attribute as RatingAttribute] * weight,
        0,
      );
      const fit = ROLE_FIT_BY_POSITION[player.primaryPosition][role];
      return [role, rating(weighted * (0.86 + fit * 0.14))];
    }),
  ) as PlayerRating["roleRatings"];

  const bestRole = TACTICAL_ROLES.reduce((best, role) =>
    roleRatings[role] > roleRatings[best] ? role : best,
  );
  const overallEstimate = rating(
    TACTICAL_ROLES.reduce((max, role) => Math.max(max, roleRatings[role]), 1),
  );
  const missingOptionalInputs =
    Number(player.preferredFoot === null) +
    Number(player.secondaryPositions.length === 0);
  const confidenceScore = clamp(
    0.54 +
      0.12 * context +
      0.1 * Math.min(1, player.internationalCaps / 25) -
      0.03 * missingOptionalInputs,
    0.45,
    0.78,
  );

  return {
    playerId: player.id,
    teamId: player.teamId,
    fifaCode: player.fifaCode,
    modelVersion: RATING_MODEL_VERSION,
    ageAtTournamentStart: player.ageAtTournamentStart,
    primaryPosition: player.primaryPosition,
    attributes,
    roleRatings,
    bestRole,
    overallEstimate,
    confidenceScore: Number(confidenceScore.toFixed(3)),
    uncertainty: Number((1 - confidenceScore).toFixed(3)),
    isEstimated: true,
    notes: [
      "Estimated from official squad facts, FIFA team ranking context, and documented Phase 4 formulas.",
      "Preferred foot, detailed league quality, and fine-grained positions are not present in the official squad source.",
    ],
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTeamRating(
  team: TournamentTeam,
  playerRatings: PlayerRating[],
): TeamRating {
  const available = [...playerRatings];
  const lineup = lineupRoles.map((role) => {
    const selected = available
      .map((player) => ({
        player,
        score:
          player.roleRatings[role] *
          ROLE_FIT_BY_POSITION[player.primaryPosition][role],
      }))
      .sort((left, right) => right.score - left.score)[0];
    if (!selected) throw new Error(`Unable to fill ${team.id} ${role}`);
    available.splice(available.indexOf(selected.player), 1);
    return {
      playerId: selected.player.playerId,
      role,
      roleRating: selected.player.roleRatings[role],
      roleFit: Number(
        ROLE_FIT_BY_POSITION[selected.player.primaryPosition][role].toFixed(2),
      ),
    };
  });

  const byRole = (role: TacticalRole) =>
    lineup
      .filter((entry) => entry.role === role)
      .map((entry) => entry.roleRating * (0.9 + entry.roleFit * 0.1));
  const depth = mean(
    available
      .map((player) => player.overallEstimate)
      .sort((left, right) => right - left)
      .slice(0, 7),
  );
  const attack = mean([...byRole("WG"), ...byRole("ST"), ...byRole("AM")]);
  const midfield = mean([...byRole("DM"), ...byRole("CM"), ...byRole("AM")]);
  const defense = mean([...byRole("CB"), ...byRole("FB"), ...byRole("DM")]);
  const goalkeeping = byRole("GK")[0] ?? 50;
  const setPieces = mean([defense, attack, goalkeeping]);
  const strengths = {
    attack: rating(attack),
    midfield: rating(midfield),
    defense: rating(defense),
    goalkeeping: rating(goalkeeping),
    depth: rating(depth),
    setPieces: rating(setPieces),
    overall: rating(
      attack * 0.23 +
        midfield * 0.22 +
        defense * 0.22 +
        goalkeeping * 0.13 +
        depth * 0.12 +
        setPieces * 0.08,
    ),
  };
  const confidenceScore = Number(
    mean(playerRatings.map((player) => player.confidenceScore)).toFixed(3),
  );

  return {
    teamId: team.id,
    fifaCode: team.fifaCode,
    modelVersion: RATING_MODEL_VERSION,
    defaultFormation: DEFAULT_FORMATION,
    lineup,
    strengths,
    confidenceScore,
    uncertainty: Number((1 - confidenceScore).toFixed(3)),
    isEstimated: true,
  };
}

export function buildRatingDataset(
  players: Player[],
  teams: TournamentTeam[],
): RatingDataset {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const playerRatings = players
    .map((player) => {
      const team = teamsById.get(player.teamId);
      if (!team) throw new Error(`Unknown team for rating: ${player.teamId}`);
      return buildPlayerRating(player, team);
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  const ratingsByTeam = new Map<string, PlayerRating[]>();
  for (const rating of playerRatings) {
    const ratings = ratingsByTeam.get(rating.teamId) ?? [];
    ratings.push(rating);
    ratingsByTeam.set(rating.teamId, ratings);
  }
  const teamRatings = teams
    .map((team) => buildTeamRating(team, ratingsByTeam.get(team.id) ?? []))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));

  return {
    schemaVersion: 1,
    dataVersion: RATING_DATA_VERSION,
    tournamentStartDate: "2026-06-11",
    source: {
      id: RATING_MODEL_VERSION,
      name: "World Stage independent estimated rating model",
      createdAt: RATING_CREATED_AT,
      inputs: [
        "data/normalized/official-squads.json",
        "data/tournament/snapshot.json",
      ],
      licenseNote:
        "Independent formula using factual official squad records and FIFA ranking context; no proprietary game ratings copied.",
      confidenceScore: 0.62,
      isEstimated: true,
    },
    players: playerRatings,
    teams: teamRatings,
  };
}

export function validateLineupHasNoDuplicatePlayers(teamRating: TeamRating) {
  return new Set(teamRating.lineup.map((entry) => entry.playerId)).size === 11;
}

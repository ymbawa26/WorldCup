import { z } from "zod";

import { playerRatingsById, teamRatingsById } from "@/domain/ratings/data";
import { ROLE_FIT_BY_POSITION } from "@/domain/ratings/model";
import type { PlayerRating, TacticalRole } from "@/domain/ratings/schema";

const tacticalRoleValues = [
  "GK",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
] as const satisfies readonly TacticalRole[];

export const SelectedLineupPlayerSchema = z.object({
  playerId: z.string().min(1),
  role: z.enum(tacticalRoleValues),
});

export const SelectedLineupRatingInputSchema = z.object({
  teamId: z.string().min(1),
  starters: z.array(SelectedLineupPlayerSchema).length(11),
  benchPlayerIds: z.array(z.string().min(1)).max(15).default([]),
});

export type SelectedLineupPlayer = z.infer<typeof SelectedLineupPlayerSchema>;
export type SelectedLineupRatingInput = z.input<
  typeof SelectedLineupRatingInputSchema
>;

export type ActiveLineupStrengths = {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
  depth: number;
  setPieces: number;
  overall: number;
  benchStrength: number;
  pressing: number;
  counterattacking: number;
  discipline: number;
};

export type SelectedLineupRating = {
  teamId: string;
  modelVersion: "selected-lineup-rating-v1";
  starters: Array<
    SelectedLineupPlayer & {
      roleRating: number;
      roleFit: number;
      effectiveRating: number;
    }
  >;
  benchPlayerIds: string[];
  strengths: ActiveLineupStrengths;
  formationFit: number;
  confidenceScore: number;
  uncertainty: number;
  isEstimated: true;
};

function clamp(value: number, min = 1, max = 99) {
  return Math.max(min, Math.min(max, value));
}

function rating(value: number) {
  return Math.round(clamp(value));
}

function mean(values: number[], fallback = 50) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedMean(
  values: Array<{ value: number; weight: number }>,
  fallback = 50,
) {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return fallback;
  return (
    values.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight
  );
}

function getRating(playerId: string, teamId: string): PlayerRating {
  const ratingRecord = playerRatingsById.get(playerId);
  if (!ratingRecord) {
    throw new Error(`Unknown rated player: ${playerId}`);
  }
  if (ratingRecord.teamId !== teamId) {
    throw new Error(`${playerId} is not available for ${teamId}`);
  }
  return ratingRecord;
}

function roleWeights(
  starters: SelectedLineupRating["starters"],
  roles: TacticalRole[],
) {
  return starters
    .filter((starter) => roles.includes(starter.role))
    .map((starter) => ({
      value: starter.effectiveRating,
      weight: starter.role === "GK" ? 0.8 : 1,
    }));
}

function assertUnique(ids: string[], label: string) {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${label} contains duplicate player IDs: ${duplicates[0]}`);
  }
}

export function calculateSelectedLineupRating(
  input: SelectedLineupRatingInput,
): SelectedLineupRating {
  const parsed = SelectedLineupRatingInputSchema.parse(input);
  if (!teamRatingsById.has(parsed.teamId)) {
    throw new Error(`Unknown rated team: ${parsed.teamId}`);
  }

  const starterIds = parsed.starters.map((starter) => starter.playerId);
  assertUnique(starterIds, "Starting lineup");
  assertUnique(parsed.benchPlayerIds, "Bench");

  const overlappingBenchPlayer = parsed.benchPlayerIds.find((playerId) =>
    starterIds.includes(playerId),
  );
  if (overlappingBenchPlayer) {
    throw new Error(
      `${overlappingBenchPlayer} cannot be both starter and bench`,
    );
  }

  const goalkeeperCount = parsed.starters.filter(
    (starter) => starter.role === "GK",
  ).length;
  if (goalkeeperCount !== 1) {
    throw new Error("Selected lineup must contain exactly one goalkeeper");
  }

  const starters = parsed.starters.map((starter) => {
    const player = getRating(starter.playerId, parsed.teamId);
    const fit = ROLE_FIT_BY_POSITION[player.primaryPosition][starter.role];
    const roleRating = player.roleRatings[starter.role];
    return {
      ...starter,
      roleRating,
      roleFit: Number(fit.toFixed(2)),
      effectiveRating: rating(roleRating * (0.9 + fit * 0.1)),
    };
  });

  const benchRatings = parsed.benchPlayerIds.map((playerId) =>
    getRating(playerId, parsed.teamId),
  );
  const topBench = benchRatings
    .map((player) => player.overallEstimate)
    .sort((left, right) => right - left)
    .slice(0, 7);
  const benchStrength = rating(mean(topBench, 50));

  const attack = rating(
    weightedMean(roleWeights(starters, ["WG", "ST", "AM"])) * 0.92 +
      benchStrength * 0.08,
  );
  const midfield = rating(
    weightedMean(roleWeights(starters, ["DM", "CM", "AM"])) * 0.93 +
      benchStrength * 0.07,
  );
  const defense = rating(
    weightedMean(roleWeights(starters, ["CB", "FB", "DM"])) * 0.94 +
      benchStrength * 0.06,
  );
  const goalkeeping = rating(
    weightedMean(roleWeights(starters, ["GK"])) * 0.96 + benchStrength * 0.04,
  );
  const setPieces = rating(
    attack * 0.28 + defense * 0.24 + goalkeeping * 0.18 + midfield * 0.3,
  );
  const pressing = rating(
    mean(
      starters.map((starter) => {
        const player = getRating(starter.playerId, parsed.teamId);
        return (
          player.attributes.physical * 0.3 +
          player.attributes.mentality * 0.3 +
          player.attributes.form * 0.2 +
          starter.effectiveRating * 0.2
        );
      }),
    ),
  );
  const counterattacking = rating(
    mean(
      starters
        .filter((starter) =>
          (["FB", "CM", "AM", "WG", "ST"] as TacticalRole[]).includes(
            starter.role,
          ),
        )
        .map((starter) => {
          const player = getRating(starter.playerId, parsed.teamId);
          return (
            player.attributes.pace * 0.36 +
            player.attributes.passing * 0.24 +
            player.attributes.shooting * 0.2 +
            starter.effectiveRating * 0.2
          );
        }),
    ),
  );
  const discipline = rating(
    mean(
      starters.map((starter) => {
        const player = getRating(starter.playerId, parsed.teamId);
        return player.attributes.mentality * 0.7 + starter.roleFit * 30;
      }),
    ),
  );
  const formationFit = Number(
    (
      starters.reduce((sum, starter) => sum + starter.roleFit, 0) /
      starters.length
    ).toFixed(3),
  );

  const strengths: ActiveLineupStrengths = {
    attack,
    midfield,
    defense,
    goalkeeping,
    depth: benchStrength,
    benchStrength,
    pressing,
    counterattacking,
    setPieces,
    discipline,
    overall: rating(
      attack * 0.2 +
        midfield * 0.18 +
        defense * 0.18 +
        goalkeeping * 0.12 +
        benchStrength * 0.08 +
        pressing * 0.08 +
        counterattacking * 0.07 +
        setPieces * 0.05 +
        discipline * 0.04,
    ),
  };
  const confidenceScore = Number(
    mean(
      [...starterIds, ...parsed.benchPlayerIds].map(
        (playerId) => playerRatingsById.get(playerId)?.confidenceScore ?? 0.5,
      ),
    ).toFixed(3),
  );

  return {
    teamId: parsed.teamId,
    modelVersion: "selected-lineup-rating-v1",
    starters,
    benchPlayerIds: parsed.benchPlayerIds,
    strengths,
    formationFit,
    confidenceScore,
    uncertainty: Number((1 - confidenceScore).toFixed(3)),
    isEstimated: true,
  };
}

export function defaultSelectedLineupInput(teamId: string) {
  const teamRating = teamRatingsById.get(teamId);
  if (!teamRating) throw new Error(`Unknown rated team: ${teamId}`);
  const starterIds = new Set(teamRating.lineup.map((entry) => entry.playerId));
  const benchPlayerIds = [...playerRatingsById.values()]
    .filter(
      (player) => player.teamId === teamId && !starterIds.has(player.playerId),
    )
    .sort((left, right) => right.overallEstimate - left.overallEstimate)
    .slice(0, 15)
    .map((player) => player.playerId);

  return {
    teamId,
    starters: teamRating.lineup.map(({ playerId, role }) => ({
      playerId,
      role,
    })),
    benchPlayerIds,
  } satisfies SelectedLineupRatingInput;
}

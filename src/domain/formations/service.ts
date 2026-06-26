import { squadByTeamId } from "@/domain/data-ingestion/data";
import { calculateSelectedLineupRating } from "@/domain/lineups/rating";
import { playerRatingsById } from "@/domain/ratings/data";
import type { TacticalRole } from "@/domain/ratings/schema";

import { formationMatchupDataset, formationsById } from "./data";
import type {
  FormationDefinition,
  FormationId,
  FormationModifier,
  ParsedPrematchTeamSetup,
  PrematchTeamSetup,
} from "./schema";
import { PrematchTeamSetupSchema } from "./schema";

const DEFAULT_TACTICS = {
  mentality: "BALANCED",
  pressing: "MEDIUM",
  defensiveLine: "STANDARD",
  tempo: "BALANCED",
  width: "BALANCED",
} as const;

function clampRating(value: number) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function unique(ids: string[]) {
  return new Set(ids).size === ids.length;
}

function selectedIdsForFormation(
  teamId: string,
  formation: FormationDefinition,
) {
  const used = new Set<string>();
  return formation.slots.map((slot) => {
    const selected = [...playerRatingsById.values()]
      .filter(
        (player) => player.teamId === teamId && !used.has(player.playerId),
      )
      .map((player) => ({
        player,
        score: player.roleRatings[slot.role],
      }))
      .sort((left, right) => right.score - left.score)[0];
    if (!selected) throw new Error(`Unable to fill ${teamId} ${slot.label}`);
    used.add(selected.player.playerId);
    return selected.player.playerId;
  });
}

export function defaultPrematchTeamSetup(
  teamId: string,
  formationId: FormationId = "4-3-3",
): ParsedPrematchTeamSetup {
  const formation = formationsById.get(formationId);
  if (!formation) throw new Error(`Unknown formation: ${formationId}`);
  const starterIds = selectedIdsForFormation(teamId, formation);
  const starterSet = new Set(starterIds);
  const benchPlayerIds = [...playerRatingsById.values()]
    .filter(
      (player) => player.teamId === teamId && !starterSet.has(player.playerId),
    )
    .sort((left, right) => right.overallEstimate - left.overallEstimate)
    .slice(0, 15)
    .map((player) => player.playerId);
  const captainId =
    starterIds
      .map((playerId) => playerRatingsById.get(playerId)!)
      .sort(
        (left, right) =>
          right.attributes.mentality - left.attributes.mentality ||
          right.overallEstimate - left.overallEstimate,
      )[0]?.playerId ?? starterIds[0]!;
  const penaltyTakerId =
    starterIds
      .map((playerId) => playerRatingsById.get(playerId)!)
      .sort(
        (left, right) =>
          right.attributes.shooting - left.attributes.shooting ||
          right.overallEstimate - left.overallEstimate,
      )[0]?.playerId ?? starterIds[0]!;
  const freeKickTakerId =
    starterIds
      .map((playerId) => playerRatingsById.get(playerId)!)
      .sort(
        (left, right) =>
          right.attributes.passing +
          right.attributes.shooting -
          (left.attributes.passing + left.attributes.shooting),
      )[0]?.playerId ?? starterIds[0]!;
  const cornerTakerId =
    starterIds
      .map((playerId) => playerRatingsById.get(playerId)!)
      .sort(
        (left, right) =>
          right.attributes.passing - left.attributes.passing ||
          right.attributes.form - left.attributes.form,
      )[0]?.playerId ?? starterIds[0]!;

  return PrematchTeamSetupSchema.parse({
    teamId,
    formationId,
    starterIds,
    benchPlayerIds,
    tactics: DEFAULT_TACTICS,
    setPieces: {
      captainId,
      penaltyTakerId,
      freeKickTakerId,
      cornerTakerId,
    },
  });
}

export function setupWithFormation(
  setup: PrematchTeamSetup,
  formationId: FormationId,
): ParsedPrematchTeamSetup {
  const parsed = PrematchTeamSetupSchema.parse(setup);
  const next = defaultPrematchTeamSetup(parsed.teamId, formationId);
  return {
    ...next,
    tactics: parsed.tactics,
  };
}

export type LineupValidationReport = {
  passed: boolean;
  issues: string[];
  warnings: string[];
};

export function validatePrematchTeamSetup(
  setup: PrematchTeamSetup,
): LineupValidationReport {
  const parsed = PrematchTeamSetupSchema.parse(setup);
  const formation = formationsById.get(parsed.formationId);
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!formation) issues.push(`Unknown formation ${parsed.formationId}`);

  const starterIds = parsed.starterIds ?? [];
  const benchIds = parsed.benchPlayerIds ?? [];
  if (starterIds.length !== 11) issues.push("Lineup must have 11 starters");
  if (!unique(starterIds)) issues.push("Lineup cannot contain duplicates");
  if (!unique(benchIds)) issues.push("Bench cannot contain duplicates");
  if (benchIds.some((playerId) => starterIds.includes(playerId))) {
    issues.push("A player cannot be both starter and bench");
  }

  const players = squadByTeamId.get(parsed.teamId) ?? [];
  const rosterIds = new Set(players.map((player) => player.id));
  for (const playerId of [...starterIds, ...benchIds]) {
    if (!rosterIds.has(playerId)) {
      issues.push(`${playerId} is not available for ${parsed.teamId}`);
    }
  }

  const starterRatings = starterIds
    .map((playerId) => playerRatingsById.get(playerId))
    .filter(Boolean);
  if (
    starterRatings.filter((player) => player?.primaryPosition === "GK")
      .length !== 1
  ) {
    issues.push("Lineup must contain exactly one goalkeeper");
  }

  if (formation) {
    parsed.starterIds?.forEach((playerId, index) => {
      const slot = formation.slots[index];
      const rating = playerRatingsById.get(playerId);
      if (!slot || !rating) return;
      const roleRating = rating.roleRatings[slot.role as TacticalRole];
      const bestRating = Math.max(...Object.values(rating.roleRatings));
      if (bestRating - roleRating >= 8) {
        warnings.push(
          `${playerId} is a weak fit at ${slot.label} in ${formation.name}`,
        );
      }
    });
  }

  if (parsed.setPieces) {
    for (const [assignment, playerId] of Object.entries(parsed.setPieces)) {
      if (!starterIds.includes(playerId)) {
        issues.push(`${assignment} must be assigned to a starter`);
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}

function tacticModifier(setup: ParsedPrematchTeamSetup): FormationModifier {
  const mentality =
    setup.tactics.mentality === "ATTACKING"
      ? { attack: 2, defense: -1, midfield: 0 }
      : setup.tactics.mentality === "DEFENSIVE"
        ? { attack: -1, defense: 2, midfield: 0 }
        : { attack: 0, defense: 0, midfield: 0 };
  const pressing =
    setup.tactics.pressing === "HIGH"
      ? { pressing: 2, defense: -1 }
      : setup.tactics.pressing === "LOW"
        ? { pressing: -1, defense: 1 }
        : { pressing: 0, defense: 0 };
  const line =
    setup.tactics.defensiveLine === "HIGH"
      ? { defense: -1, counterattacking: 1 }
      : setup.tactics.defensiveLine === "DEEP"
        ? { defense: 1, counterattacking: -1 }
        : { defense: 0, counterattacking: 0 };
  const tempo =
    setup.tactics.tempo === "FAST"
      ? { attack: 1, counterattacking: 1 }
      : setup.tactics.tempo === "SLOW"
        ? { midfield: 1, attack: -1, counterattacking: -1 }
        : { attack: 0, midfield: 0, counterattacking: 0 };
  const width =
    setup.tactics.width === "WIDE"
      ? { attack: 1, setPieces: 1, midfield: -1 }
      : setup.tactics.width === "NARROW"
        ? { midfield: 1, defense: 1, attack: -1 }
        : { attack: 0, midfield: 0, defense: 0, setPieces: 0 };

  return {
    attack: mentality.attack + tempo.attack + width.attack,
    midfield: mentality.midfield + (tempo.midfield ?? 0) + width.midfield,
    defense:
      mentality.defense +
      pressing.defense +
      line.defense +
      (width.defense ?? 0),
    goalkeeping: 0,
    setPieces: width.setPieces ?? 0,
    pressing: pressing.pressing,
    counterattacking: line.counterattacking + tempo.counterattacking,
  };
}

function matchupModifier(
  formationId: FormationId,
  opponentFormationId: FormationId,
) {
  const opponent = formationsById.get(opponentFormationId);
  if (!opponent) return formationMatchupDataset.defaultModifier;
  return (
    formationMatchupDataset.modifiers.find(
      (modifier) =>
        modifier.formationId === formationId &&
        modifier.againstFamily === opponent.family,
    ) ?? formationMatchupDataset.defaultModifier
  );
}

function addModifiers(...modifiers: FormationModifier[]) {
  return modifiers.reduce(
    (total, modifier) => ({
      attack: total.attack + modifier.attack,
      midfield: total.midfield + modifier.midfield,
      defense: total.defense + modifier.defense,
      goalkeeping: total.goalkeeping + modifier.goalkeeping,
      setPieces: total.setPieces + modifier.setPieces,
      pressing: total.pressing + modifier.pressing,
      counterattacking: total.counterattacking + modifier.counterattacking,
    }),
    { ...formationMatchupDataset.defaultModifier },
  );
}

export function activeTeamRatingFromSetup(
  setup: PrematchTeamSetup,
  opponentFormationId: FormationId = "4-3-3",
) {
  const parsed = PrematchTeamSetupSchema.parse(setup);
  const formation = formationsById.get(parsed.formationId);
  if (!formation) throw new Error(`Unknown formation ${parsed.formationId}`);
  const validation = validatePrematchTeamSetup(parsed);
  if (!validation.passed) {
    throw new Error(`Invalid prematch setup: ${validation.issues.join("; ")}`);
  }

  const lineupRating = calculateSelectedLineupRating({
    teamId: parsed.teamId,
    starters: formation.slots.map((slot, index) => ({
      playerId: parsed.starterIds![index]!,
      role: slot.role,
    })),
    benchPlayerIds: parsed.benchPlayerIds ?? [],
  });
  const modifier = addModifiers(
    matchupModifier(parsed.formationId, opponentFormationId),
    tacticModifier(parsed),
  );
  const strengths = {
    attack: clampRating(lineupRating.strengths.attack + modifier.attack),
    midfield: clampRating(lineupRating.strengths.midfield + modifier.midfield),
    defense: clampRating(lineupRating.strengths.defense + modifier.defense),
    goalkeeping: clampRating(
      lineupRating.strengths.goalkeeping + modifier.goalkeeping,
    ),
    depth: lineupRating.strengths.depth,
    setPieces: clampRating(
      lineupRating.strengths.setPieces + modifier.setPieces,
    ),
    overall: lineupRating.strengths.overall,
  };
  strengths.overall = clampRating(
    strengths.attack * 0.2 +
      strengths.midfield * 0.18 +
      strengths.defense * 0.18 +
      strengths.goalkeeping * 0.12 +
      strengths.depth * 0.08 +
      strengths.setPieces * 0.05 +
      clampRating(lineupRating.strengths.pressing + modifier.pressing) * 0.09 +
      clampRating(
        lineupRating.strengths.counterattacking + modifier.counterattacking,
      ) *
        0.07 +
      lineupRating.strengths.discipline * 0.03,
  );

  return {
    teamId: parsed.teamId,
    fifaCode: playerRatingsById.get(parsed.starterIds![0]!)?.fifaCode ?? "UNK",
    modelVersion: "selected-lineup-rating-v1",
    defaultFormation: parsed.formationId,
    lineup: lineupRating.starters.map(
      ({ playerId, role, roleRating, roleFit }) => ({
        playerId,
        role,
        roleRating,
        roleFit,
      }),
    ),
    strengths,
    confidenceScore: lineupRating.confidenceScore,
    uncertainty: lineupRating.uncertainty,
    isEstimated: true,
  };
}

export function listFormations() {
  return [...formationsById.values()];
}

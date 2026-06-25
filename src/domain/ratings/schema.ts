import { z } from "zod";

export const RATING_MODEL_VERSION = "rating-model-2026.06.24-v1" as const;

export const RatingAttributeSchema = z.enum([
  "pace",
  "shooting",
  "passing",
  "defending",
  "goalkeeping",
  "physical",
  "mentality",
  "form",
]);

export const TacticalRoleSchema = z.enum([
  "GK",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
]);

export const TeamStrengthSchema = z.enum([
  "attack",
  "midfield",
  "defense",
  "goalkeeping",
  "depth",
  "setPieces",
  "overall",
]);

export const RatingSourceSchema = z.object({
  id: z.literal(RATING_MODEL_VERSION),
  name: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  inputs: z.array(z.string().min(1)).min(1),
  licenseNote: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  isEstimated: z.literal(true),
});

export const PlayerRatingSchema = z.object({
  playerId: z.uuid(),
  teamId: z.string().min(1),
  fifaCode: z.string().length(3),
  modelVersion: z.literal(RATING_MODEL_VERSION),
  ageAtTournamentStart: z.number().int().min(15).max(50),
  primaryPosition: z.enum(["GK", "DF", "MF", "FW"]),
  attributes: z.record(RatingAttributeSchema, z.number().int().min(1).max(99)),
  roleRatings: z.record(TacticalRoleSchema, z.number().int().min(1).max(99)),
  bestRole: TacticalRoleSchema,
  overallEstimate: z.number().int().min(1).max(99),
  confidenceScore: z.number().min(0).max(1),
  uncertainty: z.number().min(0).max(1),
  isEstimated: z.literal(true),
  notes: z.array(z.string().min(1)),
});

export const LineupPlayerSchema = z.object({
  playerId: z.uuid(),
  role: TacticalRoleSchema,
  roleRating: z.number().int().min(1).max(99),
  roleFit: z.number().min(0).max(1),
});

export const TeamRatingSchema = z.object({
  teamId: z.string().min(1),
  fifaCode: z.string().length(3),
  modelVersion: z.literal(RATING_MODEL_VERSION),
  defaultFormation: z.literal("4-3-3"),
  lineup: z.array(LineupPlayerSchema).length(11),
  strengths: z.record(TeamStrengthSchema, z.number().int().min(1).max(99)),
  confidenceScore: z.number().min(0).max(1),
  uncertainty: z.number().min(0).max(1),
  isEstimated: z.literal(true),
});

export const RatingDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.literal("2026.06.24-rating-model-v1"),
  tournamentStartDate: z.iso.date(),
  source: RatingSourceSchema,
  players: z.array(PlayerRatingSchema),
  teams: z.array(TeamRatingSchema),
});

export type RatingAttribute = z.infer<typeof RatingAttributeSchema>;
export type TacticalRole = z.infer<typeof TacticalRoleSchema>;
export type TeamStrength = z.infer<typeof TeamStrengthSchema>;
export type LineupPlayer = z.infer<typeof LineupPlayerSchema>;
export type PlayerRating = z.infer<typeof PlayerRatingSchema>;
export type TeamRating = z.infer<typeof TeamRatingSchema>;
export type RatingDataset = z.infer<typeof RatingDatasetSchema>;

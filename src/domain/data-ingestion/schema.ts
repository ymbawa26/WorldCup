import { z } from "zod";

export const PositionSchema = z.enum(["GK", "DF", "MF", "FW"]);
export type PlayerPosition = z.infer<typeof PositionSchema>;

export const FieldProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  retrievedAt: z.iso.datetime({ offset: true }),
  licenseNote: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  isEstimated: z.boolean(),
});

export type FieldProvenance = z.infer<typeof FieldProvenanceSchema>;

export const RawPlayerSchema = z.object({
  squadNumber: z.number().int().min(1).max(99),
  position: PositionSchema,
  playerName: z.string().min(1),
  firstNames: z.string().min(1),
  lastNames: z.string().min(1),
  shirtName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  club: z.string().min(1),
  heightCm: z.number().int().min(140).max(220),
  caps: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
});

export const RawSquadSchema = z.object({
  teamName: z.string().min(1),
  fifaCode: z.string().length(3),
  players: z.array(RawPlayerSchema),
});

export const RawSquadDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  sourceSha256: z.string().length(64),
  extractedAt: z.iso.datetime({ offset: true }),
  squads: z.array(RawSquadSchema),
});

const ProvenanceFieldSchema = z.enum([
  "officialSquadMembership",
  "squadNumber",
  "position",
  "fullName",
  "firstNames",
  "lastNames",
  "shirtName",
  "dateOfBirth",
  "club",
  "heightCm",
  "caps",
  "goals",
]);

export const PlayerSchema = z.object({
  id: z.uuid(),
  externalIdentity: z.string().min(1),
  teamId: z.string().min(1),
  fifaCode: z.string().length(3),
  squadNumber: z.number().int().min(1).max(99),
  primaryPosition: PositionSchema,
  fullName: z.string().min(1),
  displayName: z.string().min(1),
  firstNames: z.string().min(1),
  lastNames: z.string().min(1),
  shirtName: z.string().min(1),
  dateOfBirth: z.iso.date(),
  ageAtTournamentStart: z.number().int().min(15).max(50),
  clubName: z.string().min(1),
  clubCountryCode: z.string().length(3).nullable(),
  heightCm: z.number().int().min(140).max(220),
  internationalCaps: z.number().int().nonnegative(),
  internationalGoals: z.number().int().nonnegative(),
  secondaryPositions: z.array(PositionSchema),
  preferredFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).nullable(),
  fieldProvenance: z.record(ProvenanceFieldSchema, z.string().min(1)),
});

export type Player = z.infer<typeof PlayerSchema>;

export const SquadDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  tournamentStartDate: z.iso.date(),
  source: FieldProvenanceSchema.extend({
    sha256: z.string().length(64),
    publishedAt: z.iso.date(),
  }),
  players: z.array(PlayerSchema),
});

export type SquadDataset = z.infer<typeof SquadDatasetSchema>;

export const DataQualityReportSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  generatedAt: z.iso.datetime({ offset: true }),
  passed: z.boolean(),
  totals: z.object({
    teams: z.number().int().nonnegative(),
    players: z.number().int().nonnegative(),
    duplicatePlayers: z.number().int().nonnegative(),
    estimatedFields: z.number().int().nonnegative(),
    missingOptionalFields: z.number().int().nonnegative(),
  }),
  squads: z.array(
    z.object({
      teamId: z.string().min(1),
      fifaCode: z.string().length(3),
      playerCount: z.number().int().nonnegative(),
      goalkeeperCount: z.number().int().nonnegative(),
      uniqueSquadNumbers: z.number().int().nonnegative(),
      passed: z.boolean(),
      issues: z.array(z.string()),
    }),
  ),
  failures: z.array(z.string()),
});

export type DataQualityReport = z.infer<typeof DataQualityReportSchema>;

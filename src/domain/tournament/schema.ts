import { z } from "zod";

export const GROUP_IDS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export const GroupIdSchema = z.enum(GROUP_IDS);
export type GroupId = z.infer<typeof GroupIdSchema>;

export const TeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  fifaCode: z.string().length(3),
  flagCode: z.string().min(2),
  confederation: z.enum(["AFC", "CAF", "CONCACAF", "CONMEBOL", "OFC", "UEFA"]),
  group: GroupIdSchema,
  groupPosition: z.number().int().min(1).max(4),
  fifaRanking: z.object({
    rank: z.number().int().positive(),
    previousRank: z.number().int().positive(),
    points: z.number().positive(),
    previousPoints: z.number().positive(),
    asOf: z.iso.date(),
  }),
  sourceExternalId: z.string().min(1),
});

export const FixtureSchema = z.object({
  matchNumber: z.number().int().min(1).max(72),
  stage: z.literal("GROUP"),
  group: GroupIdSchema,
  matchday: z.number().int().min(1).max(3),
  date: z.iso.date(),
  venueId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  simultaneousKey: z.string().nullable(),
});

export const TournamentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  stateAt: z.iso.datetime({ offset: true }),
  resultsIncluded: z.literal(false),
  sourceIds: z.array(z.string().min(1)).min(1),
  groups: z.array(
    z.object({
      id: GroupIdSchema,
      teamIds: z.array(z.string().min(1)).length(4),
    }),
  ),
  teams: z.array(TeamSchema),
  venues: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      city: z.string().min(1),
      country: z.string().min(1),
    }),
  ),
  fixtures: z.array(FixtureSchema),
});

const GroupSlotSchema = z.string().regex(/^[12][A-L]$/);
const ThirdPlaceSlotSchema = z.string().regex(/^3:[A-L]{5}$/);
const ProgressionSlotSchema = z.string().regex(/^[WL](?:[7-9][0-9]|10[0-2])$/);

export const KnockoutMatchSchema = z.object({
  matchNumber: z.number().int().min(73).max(104),
  stage: z.enum([
    "ROUND_OF_32",
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "THIRD_PLACE",
    "FINAL",
  ]),
  date: z.iso.date(),
  venueId: z.string().min(1),
  homeSlot: z.union([
    GroupSlotSchema,
    ThirdPlaceSlotSchema,
    ProgressionSlotSchema,
  ]),
  awaySlot: z.union([
    GroupSlotSchema,
    ThirdPlaceSlotSchema,
    ProgressionSlotSchema,
  ]),
});

export const KnockoutBracketSchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  matches: z.array(KnockoutMatchSchema).length(32),
});

export const AllocationSchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  sourcePages: z.string().min(1),
  winnerOrder: z.array(GroupIdSchema).length(8),
  keyFormat: z.string().min(1),
  combinations: z.record(
    z.string().length(8),
    z.object({
      option: z.number().int().min(1).max(495),
      assignments: z.record(z.string().length(1), GroupIdSchema),
    }),
  ),
});

export type TournamentTeam = z.infer<typeof TeamSchema>;
export type GroupFixture = z.infer<typeof FixtureSchema>;
export type TournamentSnapshot = z.infer<typeof TournamentSnapshotSchema>;
export type KnockoutMatch = z.infer<typeof KnockoutMatchSchema>;

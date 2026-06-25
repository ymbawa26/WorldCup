import { z } from "zod";

export const GAME_FLOW_VERSION = "game-flow-2026.06.25-v2" as const;
export const SAVE_SCHEMA_VERSION = 2 as const;

export const OutcomeOddsSchema = z.object({
  homeWin: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  awayWin: z.number().min(0).max(1),
});

export const MatchRecordSchema = z.object({
  matchNumber: z.number().int().min(1).max(104),
  stage: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  homeGoals: z.number().int().nonnegative(),
  awayGoals: z.number().int().nonnegative(),
  winnerTeamId: z.string().min(1).nullable(),
  loserTeamId: z.string().min(1).nullable(),
  playedAt: z.iso.datetime({ offset: true }),
  seed: z.string().min(1),
  prematchOdds: OutcomeOddsSchema,
  modelFactors: z.array(z.string().min(1)).min(10),
});

export const TournamentGameStateSchema = z.object({
  schemaVersion: z.literal(SAVE_SCHEMA_VERSION),
  gameFlowVersion: z.literal(GAME_FLOW_VERSION),
  id: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  seed: z.string().min(1),
  userTeamId: z.string().min(1),
  status: z.enum(["CREATED", "IN_PROGRESS", "COMPLETE"]),
  groupMatches: z.array(MatchRecordSchema),
  knockoutMatches: z.array(MatchRecordSchema),
  championTeamId: z.string().min(1).nullable(),
});

export const ExportedSaveSchema = z.object({
  exportedAt: z.iso.datetime({ offset: true }),
  save: TournamentGameStateSchema,
});

export type MatchRecord = z.infer<typeof MatchRecordSchema>;
export type OutcomeOdds = z.infer<typeof OutcomeOddsSchema>;
export type TournamentGameState = z.infer<typeof TournamentGameStateSchema>;
export type ExportedSave = z.infer<typeof ExportedSaveSchema>;

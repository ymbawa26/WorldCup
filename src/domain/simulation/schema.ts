import { z } from "zod";

export const SIMULATION_ENGINE_VERSION = "match-engine-2026.06.25-v1" as const;

export const MatchSideSchema = z.enum(["HOME", "AWAY"]);
export const EventTypeSchema = z.enum([
  "KICKOFF",
  "POSSESSION",
  "SHOT",
  "GOAL",
  "CARD",
  "INJURY",
  "SUBSTITUTION",
  "TACTICAL_CHANGE",
  "HALF_TIME",
  "FULL_TIME",
  "EXTRA_TIME_START",
  "SHOOTOUT_KICK",
  "MATCH_END",
]);

export const MatchPhaseSchema = z.enum([
  "REGULATION",
  "EXTRA_TIME",
  "SHOOTOUT",
  "COMPLETE",
]);

export const TacticalIntentSchema = z.enum([
  "BALANCED",
  "PROTECT_LEAD",
  "CHASE_GOAL",
]);

export const MatchEventSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  minute: z.number().int().min(0).max(130),
  stoppageMinute: z.number().int().nonnegative().default(0),
  phase: MatchPhaseSchema,
  type: EventTypeSchema,
  side: MatchSideSchema.nullable(),
  teamId: z.string().min(1).nullable(),
  playerId: z.uuid().nullable(),
  relatedPlayerId: z.uuid().nullable(),
  xg: z.number().min(0).max(1).nullable(),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  commentary: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const MatchStatsSchema = z.object({
  teamId: z.string().min(1),
  goals: z.number().int().nonnegative(),
  shots: z.number().int().nonnegative(),
  shotsOnTarget: z.number().int().nonnegative(),
  xg: z.number().nonnegative(),
  possessionShare: z.number().min(0).max(1),
  yellowCards: z.number().int().nonnegative(),
  redCards: z.number().int().nonnegative(),
  injuries: z.number().int().nonnegative(),
  substitutions: z.number().int().nonnegative(),
});

export const MatchSimulationInputSchema = z.object({
  seed: z.string().min(1),
  fixtureId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  knockout: z.boolean().default(false),
  allowExtraTime: z.boolean().default(false),
  allowShootout: z.boolean().default(false),
});

export const MatchSimulationResultSchema = z.object({
  engineVersion: z.literal(SIMULATION_ENGINE_VERSION),
  seed: z.string().min(1),
  fixtureId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  events: z.array(MatchEventSchema),
  stats: z.object({
    home: MatchStatsSchema,
    away: MatchStatsSchema,
  }),
  finalScore: z.object({
    home: z.number().int().nonnegative(),
    away: z.number().int().nonnegative(),
  }),
  shootout: z
    .object({
      home: z.number().int().nonnegative(),
      away: z.number().int().nonnegative(),
      winner: MatchSideSchema,
    })
    .nullable(),
});

export type MatchSide = z.infer<typeof MatchSideSchema>;
export type MatchPhase = z.infer<typeof MatchPhaseSchema>;
export type TacticalIntent = z.infer<typeof TacticalIntentSchema>;
export type MatchEvent = z.infer<typeof MatchEventSchema>;
export type MatchSimulationInput = z.input<typeof MatchSimulationInputSchema>;
export type MatchSimulationResult = z.infer<typeof MatchSimulationResultSchema>;
export type MatchStats = z.infer<typeof MatchStatsSchema>;

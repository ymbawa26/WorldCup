import { z } from "zod";

export const PROBABILITY_MODEL_VERSION =
  "probability-model-2026.06.25-v1" as const;

export const OutcomeProbabilitySchema = z.object({
  homeWin: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  awayWin: z.number().min(0).max(1),
});

export const ScoreCellSchema = z.object({
  homeGoals: z.number().int().nonnegative(),
  awayGoals: z.number().int().nonnegative(),
  probability: z.number().min(0).max(1),
});

export const ExpectedGoalsSchema = z.object({
  home: z.number().nonnegative(),
  away: z.number().nonnegative(),
});

export const PrematchProbabilitySchema = z.object({
  modelVersion: z.literal(PROBABILITY_MODEL_VERSION),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  expectedGoals: ExpectedGoalsSchema,
  outcomes: OutcomeProbabilitySchema,
  scoreMatrix: z.array(ScoreCellSchema),
});

export const LiveProbabilitySchema = PrematchProbabilitySchema.extend({
  minute: z.number().int().min(0).max(130),
  currentScore: z.object({
    home: z.number().int().nonnegative(),
    away: z.number().int().nonnegative(),
  }),
  redCards: z.object({
    home: z.number().int().nonnegative(),
    away: z.number().int().nonnegative(),
  }),
  remainingExpectedGoals: ExpectedGoalsSchema,
});

export const CalibrationBandSchema = z.object({
  label: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  analytical: OutcomeProbabilitySchema,
  simulated: OutcomeProbabilitySchema,
  meanAbsoluteError: z.number().nonnegative(),
  samples: z.number().int().positive(),
});

export const CalibrationReportSchema = z.object({
  schemaVersion: z.literal(1),
  modelVersion: z.literal(PROBABILITY_MODEL_VERSION),
  generatedAt: z.iso.datetime({ offset: true }),
  sourceNotes: z.array(z.string().min(1)),
  limitations: z.array(z.string().min(1)),
  tolerance: z.number().positive(),
  passed: z.boolean(),
  bands: z.array(CalibrationBandSchema),
});

export type OutcomeProbability = z.infer<typeof OutcomeProbabilitySchema>;
export type PrematchProbability = z.infer<typeof PrematchProbabilitySchema>;
export type LiveProbability = z.infer<typeof LiveProbabilitySchema>;
export type CalibrationReport = z.infer<typeof CalibrationReportSchema>;

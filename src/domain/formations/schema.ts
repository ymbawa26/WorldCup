import { z } from "zod";

import { TacticalRoleSchema } from "@/domain/ratings/schema";

export const FormationIdSchema = z.enum([
  "4-3-3",
  "4-2-3-1",
  "4-4-2",
  "4-1-4-1",
  "4-3-2-1",
  "3-4-3",
  "3-4-2-1",
  "3-5-2",
  "5-3-2",
  "5-4-1",
]);

export const FormationFamilySchema = z.enum([
  "balanced",
  "control",
  "direct",
  "aggressive",
  "defensive",
]);

export const FormationLineSchema = z.enum([
  "goalkeeper",
  "defense",
  "midfield",
  "attack",
]);

export const FormationSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: TacticalRoleSchema,
  line: FormationLineSchema,
});

export const FormationDefinitionSchema = z.object({
  id: FormationIdSchema,
  name: z.string().min(1),
  family: FormationFamilySchema,
  description: z.string().min(1),
  slots: z.array(FormationSlotSchema).length(11),
});

export const FormationDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  formations: z.array(FormationDefinitionSchema).length(10),
});

export const TacticalSetupSchema = z.object({
  mentality: z.enum(["DEFENSIVE", "BALANCED", "ATTACKING"]).default("BALANCED"),
  pressing: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  defensiveLine: z.enum(["DEEP", "STANDARD", "HIGH"]).default("STANDARD"),
  tempo: z.enum(["SLOW", "BALANCED", "FAST"]).default("BALANCED"),
  width: z.enum(["NARROW", "BALANCED", "WIDE"]).default("BALANCED"),
});

export const SetPieceAssignmentsSchema = z.object({
  captainId: z.string().min(1),
  penaltyTakerId: z.string().min(1),
  freeKickTakerId: z.string().min(1),
  cornerTakerId: z.string().min(1),
});

export const PrematchTeamSetupSchema = z.object({
  teamId: z.string().min(1),
  formationId: FormationIdSchema,
  starterIds: z.array(z.string().min(1)).length(11).optional(),
  benchPlayerIds: z.array(z.string().min(1)).max(15).optional(),
  tactics: TacticalSetupSchema.default({
    mentality: "BALANCED",
    pressing: "MEDIUM",
    defensiveLine: "STANDARD",
    tempo: "BALANCED",
    width: "BALANCED",
  }),
  setPieces: SetPieceAssignmentsSchema.optional(),
});

export const FormationModifierSchema = z.object({
  attack: z.number().min(-5).max(5),
  midfield: z.number().min(-5).max(5),
  defense: z.number().min(-5).max(5),
  goalkeeping: z.number().min(-5).max(5),
  setPieces: z.number().min(-5).max(5),
  pressing: z.number().min(-5).max(5),
  counterattacking: z.number().min(-5).max(5),
});

export const FormationMatchupModifierSchema = FormationModifierSchema.extend({
  formationId: FormationIdSchema,
  againstFamily: FormationFamilySchema,
});

export const FormationMatchupDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  defaultModifier: FormationModifierSchema,
  modifiers: z.array(FormationMatchupModifierSchema),
});

export type FormationId = z.infer<typeof FormationIdSchema>;
export type FormationDefinition = z.infer<typeof FormationDefinitionSchema>;
export type TacticalSetup = z.infer<typeof TacticalSetupSchema>;
export type PrematchTeamSetup = z.input<typeof PrematchTeamSetupSchema>;
export type ParsedPrematchTeamSetup = z.output<typeof PrematchTeamSetupSchema>;
export type FormationModifier = z.infer<typeof FormationModifierSchema>;

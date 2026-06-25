import {
  ExportedSaveSchema,
  SAVE_SCHEMA_VERSION,
  TournamentGameStateSchema,
  type ExportedSave,
  type TournamentGameState,
} from "./schema";

export function serializeSave(save: TournamentGameState) {
  return JSON.stringify(
    {
      exportedAt: "2026-06-25T10:00:00-04:00",
      save,
    } satisfies ExportedSave,
    null,
    2,
  );
}

export function migrateSave(input: unknown): TournamentGameState {
  const candidate =
    typeof input === "object" && input !== null && "save" in input
      ? (input as { save: unknown }).save
      : input;
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "schemaVersion" in candidate &&
    (candidate as { schemaVersion: unknown }).schemaVersion === 0
  ) {
    const legacy = candidate as {
      id?: unknown;
      createdAt?: unknown;
      seed?: unknown;
      selectedTeamId?: unknown;
      status?: unknown;
    };
    return TournamentGameStateSchema.parse({
      schemaVersion: SAVE_SCHEMA_VERSION,
      gameFlowVersion: "game-flow-2026.06.25-v1",
      id: typeof legacy.id === "string" ? legacy.id : "migrated-save",
      createdAt:
        typeof legacy.createdAt === "string"
          ? legacy.createdAt
          : "2026-06-25T10:00:00-04:00",
      updatedAt: "2026-06-25T10:00:00-04:00",
      seed: typeof legacy.seed === "string" ? legacy.seed : "migrated-seed",
      userTeamId:
        typeof legacy.selectedTeamId === "string"
          ? legacy.selectedTeamId
          : "united-states",
      status: legacy.status === "COMPLETE" ? "COMPLETE" : "CREATED",
      groupMatches: [],
      knockoutMatches: [],
      championTeamId: null,
    });
  }
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "schemaVersion" in candidate &&
    (candidate as { schemaVersion: unknown }).schemaVersion ===
      SAVE_SCHEMA_VERSION
  ) {
    return TournamentGameStateSchema.parse(candidate);
  }
  throw new Error("Unsupported or invalid save schema");
}

export function parseImportedSave(text: string): TournamentGameState {
  const json = JSON.parse(text) as unknown;
  const exported = ExportedSaveSchema.safeParse(json);
  if (exported.success) return exported.data.save;
  return migrateSave(json);
}

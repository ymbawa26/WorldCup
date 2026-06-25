import {
  GAME_FLOW_VERSION,
  ExportedSaveSchema,
  SAVE_SCHEMA_VERSION,
  TournamentGameStateSchema,
  type ExportedSave,
  type TournamentGameState,
} from "./schema";
import { prematchProbability } from "../probability/model";

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
      gameFlowVersion: GAME_FLOW_VERSION,
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
    (candidate as { schemaVersion: unknown }).schemaVersion === 1
  ) {
    const legacy = candidate as {
      id?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
      seed?: unknown;
      userTeamId?: unknown;
      status?: unknown;
      groupMatches?: unknown;
      knockoutMatches?: unknown;
      championTeamId?: unknown;
    };
    const upgradeMatches = (matches: unknown) =>
      Array.isArray(matches)
        ? matches.map((match) => {
            const record = match as {
              homeTeamId: string;
              awayTeamId: string;
              prematchOdds?: unknown;
              modelFactors?: unknown;
            };
            return {
              ...record,
              prematchOdds:
                "prematchOdds" in record
                  ? record.prematchOdds
                  : prematchProbability(record.homeTeamId, record.awayTeamId)
                      .outcomes,
              modelFactors:
                "modelFactors" in record
                  ? record.modelFactors
                  : [
                      "attack",
                      "midfield",
                      "defense",
                      "goalkeeping",
                      "depth",
                      "setPieces",
                      "overall",
                      "fifaRankingPoints",
                      "rankingMomentum",
                      "ratingConfidence",
                    ],
            };
          })
        : [];
    return TournamentGameStateSchema.parse({
      schemaVersion: SAVE_SCHEMA_VERSION,
      gameFlowVersion: GAME_FLOW_VERSION,
      id: legacy.id,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      seed: legacy.seed,
      userTeamId: legacy.userTeamId,
      status:
        legacy.status === "COMPLETE" || legacy.status === "IN_PROGRESS"
          ? legacy.status
          : "CREATED",
      groupMatches: upgradeMatches(legacy.groupMatches),
      knockoutMatches: upgradeMatches(legacy.knockoutMatches),
      championTeamId: legacy.championTeamId ?? null,
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

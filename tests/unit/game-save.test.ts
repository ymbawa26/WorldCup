import { describe, expect, it } from "vitest";

import { createTournamentGame } from "@/domain/game/engine";
import { parseImportedSave, serializeSave } from "@/domain/game/save";

describe("game save serialization", () => {
  it("round-trips a current save export", () => {
    const state = createTournamentGame({
      seed: "save-round-trip",
      userTeamId: "mexico",
    });

    expect(parseImportedSave(serializeSave(state))).toEqual(state);
  });

  it("rejects invalid imports", () => {
    expect(() => parseImportedSave('{"schemaVersion":999}')).toThrow(
      /unsupported|invalid/i,
    );
    expect(() => parseImportedSave("not json")).toThrow();
  });

  it("migrates a legacy v0 save shape", () => {
    const migrated = parseImportedSave(
      JSON.stringify({
        schemaVersion: 0,
        id: "legacy",
        seed: "legacy-seed",
        selectedTeamId: "canada",
        status: "CREATED",
      }),
    );

    expect(migrated).toMatchObject({
      schemaVersion: 2,
      id: "legacy",
      seed: "legacy-seed",
      userTeamId: "canada",
      status: "CREATED",
    });
  });
});

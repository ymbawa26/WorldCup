import { readFile, writeFile } from "node:fs/promises";

import source from "../../data/sources/official-squads.json";
import {
  ageOnDate,
  deterministicUuid,
  isoDateFromOfficial,
  normalizeWhitespace,
  splitClub,
} from "../../src/domain/data-ingestion/identity";
import {
  RawSquadDatasetSchema,
  SquadDatasetSchema,
  type FieldProvenance,
} from "../../src/domain/data-ingestion/schema";
import { tournamentSnapshot } from "../../src/domain/tournament/data";

import {
  DATA_VERSION,
  NORMALIZED_SQUADS,
  RAW_EXTRACT,
  TOURNAMENT_START_DATE,
} from "./config";

const importedFields = [
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
] as const;

async function main() {
  const raw = RawSquadDatasetSchema.parse(
    JSON.parse(await readFile(RAW_EXTRACT, "utf8")),
  );
  const teamByCode = new Map(
    tournamentSnapshot.teams.map((team) => [team.fifaCode, team]),
  );
  const provenance: FieldProvenance = {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    retrievedAt: source.retrievedAt,
    licenseNote: source.licenseNote,
    confidenceScore: source.confidenceScore,
    isEstimated: source.isEstimated,
  };

  const players = raw.squads.flatMap((squad) => {
    const team = teamByCode.get(squad.fifaCode);
    if (!team) throw new Error(`Unknown FIFA team code ${squad.fifaCode}`);
    return squad.players.map((rawPlayer) => {
      const dateOfBirth = isoDateFromOfficial(rawPlayer.dateOfBirth);
      const firstNames = normalizeWhitespace(rawPlayer.firstNames);
      const lastNames = normalizeWhitespace(rawPlayer.lastNames);
      const fullName = normalizeWhitespace(`${firstNames} ${lastNames}`);
      const externalIdentity = [
        source.id,
        squad.fifaCode,
        dateOfBirth,
        fullName.toLocaleLowerCase("en"),
      ].join(":");
      const club = splitClub(rawPlayer.club);
      return {
        id: deterministicUuid(externalIdentity),
        externalIdentity,
        teamId: team.id,
        fifaCode: squad.fifaCode,
        squadNumber: rawPlayer.squadNumber,
        primaryPosition: rawPlayer.position,
        fullName,
        displayName: normalizeWhitespace(rawPlayer.playerName),
        firstNames,
        lastNames,
        shirtName: normalizeWhitespace(rawPlayer.shirtName),
        dateOfBirth,
        ageAtTournamentStart: ageOnDate(dateOfBirth, TOURNAMENT_START_DATE),
        clubName: club.clubName,
        clubCountryCode: club.clubCountryCode,
        heightCm: rawPlayer.heightCm,
        internationalCaps: rawPlayer.caps,
        internationalGoals: rawPlayer.goals,
        secondaryPositions: [],
        preferredFoot: null,
        fieldProvenance: Object.fromEntries(
          importedFields.map((field) => [field, provenance.sourceId]),
        ),
      };
    });
  });

  const dataset = SquadDatasetSchema.parse({
    schemaVersion: 1,
    dataVersion: DATA_VERSION,
    tournamentStartDate: TOURNAMENT_START_DATE,
    source: {
      ...provenance,
      sha256: source.sha256,
      publishedAt: source.publishedAt,
    },
    players,
  });
  await writeFile(NORMALIZED_SQUADS, `${JSON.stringify(dataset, null, 2)}\n`);
  console.info(`Normalized ${dataset.players.length} stable player identities`);
}

void main();

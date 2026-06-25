import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import sourceManifest from "../../data/sources/official-squads.json";
import {
  DataQualityReportSchema,
  SquadDatasetSchema,
} from "../../src/domain/data-ingestion/schema";
import { ratingDataset } from "../../src/domain/ratings/data";
import {
  RATING_ATTRIBUTES,
  TACTICAL_ROLES,
} from "../../src/domain/ratings/model";
import {
  knockoutBracket,
  tournamentSnapshot,
} from "../../src/domain/tournament/data";

import {
  NORMALIZED_SQUADS,
  QUALITY_REPORT,
  ROOT,
  WORKBOOK_PATH,
} from "./config";

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: unknown[][]) {
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

async function writeCsv(name: string, headers: string[], rows: unknown[][]) {
  await writeFile(path.join(ROOT, "data", name), csv(headers, rows));
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: unknown[][],
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  const header = sheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10193D" },
  };
  header.alignment = { vertical: "middle" };
  for (let index = 1; index <= headers.length; index += 1) {
    const values = [
      headers[index - 1],
      ...rows.slice(0, 250).map((row) => row[index - 1]),
    ];
    sheet.getColumn(index).width = Math.min(
      44,
      Math.max(11, ...values.map((value) => String(value ?? "").length + 2)),
    );
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F6FC" },
      };
    }
  });
  return sheet;
}

const playersHeaders = [
  "id",
  "external_identity",
  "team_id",
  "fifa_code",
  "squad_number",
  "primary_position",
  "full_name",
  "display_name",
  "first_names",
  "last_names",
  "shirt_name",
  "date_of_birth",
  "age_at_tournament_start",
  "club_name",
  "club_country_code",
  "height_cm",
  "international_caps",
  "international_goals",
  "secondary_positions",
  "preferred_foot",
  "source_name",
  "source_url",
  "retrieved_at",
  "license_note",
  "confidence_score",
  "is_estimated",
];

const playerRatingHeaders = [
  "player_id",
  "team_id",
  "fifa_code",
  "model_version",
  "primary_position",
  "best_role",
  "overall_estimate",
  ...RATING_ATTRIBUTES,
  ...TACTICAL_ROLES.map((role) => `role_${role.toLowerCase()}`),
  "confidence_score",
  "uncertainty",
  "is_estimated",
  "notes",
];

const teamRatingHeaders = [
  "team_id",
  "fifa_code",
  "model_version",
  "default_formation",
  "attack",
  "midfield",
  "defense",
  "goalkeeping",
  "depth",
  "set_pieces",
  "overall",
  "lineup_player_ids",
  "lineup_roles",
  "confidence_score",
  "uncertainty",
  "is_estimated",
];

async function main() {
  const dataset = SquadDatasetSchema.parse(
    JSON.parse(await readFile(NORMALIZED_SQUADS, "utf8")),
  );
  const quality = DataQualityReportSchema.parse(
    JSON.parse(await readFile(QUALITY_REPORT, "utf8")),
  );
  if (!quality.passed) throw new Error("Cannot export a failed squad dataset");

  const playerRows = dataset.players.map((player) => [
    player.id,
    player.externalIdentity,
    player.teamId,
    player.fifaCode,
    player.squadNumber,
    player.primaryPosition,
    player.fullName,
    player.displayName,
    player.firstNames,
    player.lastNames,
    player.shirtName,
    player.dateOfBirth,
    player.ageAtTournamentStart,
    player.clubName,
    player.clubCountryCode,
    player.heightCm,
    player.internationalCaps,
    player.internationalGoals,
    player.secondaryPositions.join("|"),
    player.preferredFoot,
    dataset.source.sourceName,
    dataset.source.sourceUrl,
    dataset.source.retrievedAt,
    dataset.source.licenseNote,
    dataset.source.confidenceScore,
    dataset.source.isEstimated,
  ]);
  await writeCsv("players.csv", playersHeaders, playerRows);

  const playerRatingRows = ratingDataset.players.map((rating) => [
    rating.playerId,
    rating.teamId,
    rating.fifaCode,
    rating.modelVersion,
    rating.primaryPosition,
    rating.bestRole,
    rating.overallEstimate,
    ...RATING_ATTRIBUTES.map((attribute) => rating.attributes[attribute]),
    ...TACTICAL_ROLES.map((role) => rating.roleRatings[role]),
    rating.confidenceScore,
    rating.uncertainty,
    rating.isEstimated,
    rating.notes.join(" | "),
  ]);
  await writeCsv(
    "player_attributes.csv",
    playerRatingHeaders,
    playerRatingRows,
  );

  const teamRatingRows = ratingDataset.teams.map((rating) => [
    rating.teamId,
    rating.fifaCode,
    rating.modelVersion,
    rating.defaultFormation,
    rating.strengths.attack,
    rating.strengths.midfield,
    rating.strengths.defense,
    rating.strengths.goalkeeping,
    rating.strengths.depth,
    rating.strengths.setPieces,
    rating.strengths.overall,
    rating.lineup.map((entry) => entry.playerId).join("|"),
    rating.lineup.map((entry) => entry.role).join("|"),
    rating.confidenceScore,
    rating.uncertainty,
    rating.isEstimated,
  ]);
  await writeCsv("team_attributes.csv", teamRatingHeaders, teamRatingRows);

  const futureProducts: Array<[string, string[]]> = [
    [
      "tactical_profiles.csv",
      ["team_id", "model_version", "profile_key", "value", "is_estimated"],
    ],
    [
      "discipline_profiles.csv",
      [
        "entity_type",
        "entity_id",
        "model_version",
        "profile_key",
        "value",
        "is_estimated",
      ],
    ],
    [
      "injury_profiles.csv",
      ["player_id", "model_version", "profile_key", "value", "is_estimated"],
    ],
  ];
  for (const [name, headers] of futureProducts)
    await writeCsv(name, headers, []);

  const sourceHeaders = [
    "id",
    "name",
    "url",
    "announcement_url",
    "published_at",
    "retrieved_at",
    "sha256",
    "license_note",
    "confidence_score",
    "is_estimated",
  ];
  const sourceRows = [
    [
      sourceManifest.id,
      sourceManifest.name,
      sourceManifest.url,
      sourceManifest.announcementUrl,
      sourceManifest.publishedAt,
      sourceManifest.retrievedAt,
      sourceManifest.sha256,
      sourceManifest.licenseNote,
      sourceManifest.confidenceScore,
      sourceManifest.isEstimated,
    ],
  ];
  await writeCsv("data_sources.csv", sourceHeaders, sourceRows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "World Stage data pipeline";
  workbook.created = new Date("2026-06-02T04:00:00Z");
  workbook.modified = workbook.created;
  workbook.calcProperties.fullCalcOnLoad = true;

  addSheet(
    workbook,
    "Teams",
    [
      "id",
      "name",
      "fifa_code",
      "confederation",
      "group",
      "group_position",
      "fifa_rank",
    ],
    tournamentSnapshot.teams.map((team) => [
      team.id,
      team.name,
      team.fifaCode,
      team.confederation,
      team.group,
      team.groupPosition,
      team.fifaRanking.rank,
    ]),
  );
  const playersSheet = addSheet(
    workbook,
    "Players",
    playersHeaders,
    playerRows,
  );
  for (let row = 2; row <= playerRows.length + 1; row += 1) {
    playersSheet.getCell(row, 6).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"GK,DF,MF,FW"'],
    };
  }
  addSheet(workbook, "Player Ratings", playerRatingHeaders, playerRatingRows);
  addSheet(workbook, "Team Ratings", teamRatingHeaders, teamRatingRows);
  addSheet(
    workbook,
    "Groups",
    ["group", "position", "team_id"],
    tournamentSnapshot.groups.flatMap((group) =>
      group.teamIds.map((teamId, index) => [group.id, index + 1, teamId]),
    ),
  );
  addSheet(
    workbook,
    "Fixtures",
    ["match_number", "stage", "group", "date", "venue_id", "home", "away"],
    [
      ...tournamentSnapshot.fixtures.map((fixture) => [
        fixture.matchNumber,
        fixture.stage,
        fixture.group,
        fixture.date,
        fixture.venueId,
        fixture.homeTeamId,
        fixture.awayTeamId,
      ]),
      ...knockoutBracket.matches.map((fixture) => [
        fixture.matchNumber,
        fixture.stage,
        "",
        fixture.date,
        fixture.venueId,
        fixture.homeSlot,
        fixture.awaySlot,
      ]),
    ],
  );
  addSheet(workbook, "Tactical Profiles", futureProducts[0][1], []);
  addSheet(workbook, "Discipline Profiles", futureProducts[1][1], []);
  addSheet(workbook, "Injury Profiles", futureProducts[2][1], []);
  addSheet(
    workbook,
    "Data Dictionary",
    ["product", "field", "definition", "status"],
    [
      [
        "Players",
        "age_at_tournament_start",
        "Full years between date_of_birth and 2026-06-11",
        "derived factual",
      ],
      [
        "Players",
        "preferred_foot",
        "Not present in official source; retained as blank",
        "not populated",
      ],
      [
        "Players",
        "secondary_positions",
        "Not present in official source; retained as blank",
        "not populated",
      ],
      [
        "Player Ratings",
        "all fields",
        "Independent estimated player attributes and role ratings",
        "Phase 4 generated",
      ],
      [
        "Team Ratings",
        "all fields",
        "Default lineup and team-strength estimates derived from player ratings",
        "Phase 4 generated",
      ],
      [
        "Profiles",
        "all fields",
        "Owned by later rating/simulation phases",
        "schema only",
      ],
    ],
  );
  addSheet(workbook, "Sources", sourceHeaders, sourceRows);
  addSheet(
    workbook,
    "Model Parameters",
    ["parameter", "value", "owner", "notes"],
    [
      [
        "tournament_data_version",
        tournamentSnapshot.dataVersion,
        "Phase 2",
        "Pre-opening tournament facts",
      ],
      [
        "squad_data_version",
        dataset.dataVersion,
        "Phase 3",
        "Official membership and biographical facts",
      ],
      [
        "rating_model_version",
        ratingDataset.source.id,
        "Phase 4",
        ratingDataset.source.licenseNote,
      ],
      [
        "rating_data_version",
        ratingDataset.dataVersion,
        "Phase 4",
        "Generated from official squads and tournament ranking context",
      ],
    ],
  );

  await mkdir(path.dirname(WORKBOOK_PATH), { recursive: true });
  await workbook.xlsx.writeFile(WORKBOOK_PATH);
  console.info(`Exported ${playerRows.length} players and 12 workbook sheets`);
}

void main();

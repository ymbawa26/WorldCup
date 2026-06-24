import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { format } from "prettier";

import { SquadDatasetSchema } from "../../src/domain/data-ingestion/schema";
import { validateSquadDataset } from "../../src/domain/data-ingestion/validation";

import {
  NORMALIZED_SQUADS,
  QUALITY_REPORT,
  QUALITY_REPORT_MARKDOWN,
} from "./config";

async function main() {
  const dataset = SquadDatasetSchema.parse(
    JSON.parse(await readFile(NORMALIZED_SQUADS, "utf8")),
  );
  const report = validateSquadDataset(dataset, dataset.source.retrievedAt);
  await mkdir(path.dirname(QUALITY_REPORT), { recursive: true });
  await writeFile(QUALITY_REPORT, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# Official Squad Data-Quality Report",
    "",
    `**Data version:** ${report.dataVersion}`,
    "",
    `**Result:** ${report.passed ? "PASS" : "FAIL"}`,
    "",
    `- Teams: ${report.totals.teams}`,
    `- Players: ${report.totals.players}`,
    `- Duplicate identities: ${report.totals.duplicatePlayers}`,
    `- Estimated imported fields: ${report.totals.estimatedFields}`,
    `- Missing optional fields: ${report.totals.missingOptionalFields}`,
    "",
    "| Team | Players | Goalkeepers | Unique numbers | Result |",
    "| --- | ---: | ---: | ---: | --- |",
    ...report.squads.map(
      (squad) =>
        `| ${squad.fifaCode} | ${squad.playerCount} | ${squad.goalkeeperCount} | ${squad.uniqueSquadNumbers} | ${squad.passed ? "PASS" : "FAIL"} |`,
    ),
    "",
    "Preferred foot and secondary positions are absent from the official squad",
    "document and remain null/empty rather than being invented. They account for",
    "the reported optional-field gaps and do not fail official membership validation.",
    "",
  ];
  await writeFile(
    QUALITY_REPORT_MARKDOWN,
    await format(lines.join("\n"), { parser: "markdown" }),
  );

  if (!report.passed) {
    throw new Error(`Squad validation failed:\n${report.failures.join("\n")}`);
  }
  console.info(
    `Squad validation passed: ${report.totals.teams} teams, ${report.totals.players} players, ${report.totals.duplicatePlayers} duplicates`,
  );
}

void main();

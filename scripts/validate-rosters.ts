import { mkdir, writeFile } from "node:fs/promises";

import {
  buildMissingPlayerDataReport,
  validateRosterServices,
} from "../src/domain/rosters/service";

async function main() {
  const report = validateRosterServices(new Date().toISOString());
  const missing = buildMissingPlayerDataReport(
    report.missingPlayerData.generatedAt,
  );

  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/missing-player-data.json",
    `${JSON.stringify(missing, null, 2)}\n`,
  );

  if (!report.passed) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(
    `Roster validation passed: ${JSON.stringify({
      teams: report.teams,
      players: report.players,
      fallbackPlayers: missing.fallbackPlayers.length,
      unresolvedTeams: missing.unresolvedTeams.length,
    })}`,
  );
}

void main();

import { validateTournamentData } from "../src/domain/tournament/validation";

async function main() {
  const report = validateTournamentData();
  console.info(`Tournament data validation passed: ${JSON.stringify(report)}`);
}

void main();

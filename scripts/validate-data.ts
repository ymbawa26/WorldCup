import { validateTournamentData } from "../src/domain/tournament/validation";
import { squadDataset } from "../src/domain/data-ingestion/data";
import { validateSquadDataset } from "../src/domain/data-ingestion/validation";

async function main() {
  const report = validateTournamentData();
  const squads = validateSquadDataset(
    squadDataset,
    squadDataset.source.retrievedAt,
  );
  if (!squads.passed) {
    throw new Error(`Squad validation failed: ${squads.failures.join(", ")}`);
  }
  console.info(`Tournament data validation passed: ${JSON.stringify(report)}`);
  console.info(
    `Squad data validation passed: ${JSON.stringify(squads.totals)}`,
  );
}

void main();

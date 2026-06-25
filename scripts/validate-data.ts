import { validateTournamentData } from "../src/domain/tournament/validation";
import { squadDataset } from "../src/domain/data-ingestion/data";
import { validateSquadDataset } from "../src/domain/data-ingestion/validation";
import { ratingDataset } from "../src/domain/ratings/data";
import { validateRatingDataset } from "../src/domain/ratings/validation";
import { sampleMatchSimulation } from "../src/domain/simulation/data";
import { validateMatchSimulation } from "../src/domain/simulation/validation";

async function main() {
  const report = validateTournamentData();
  const squads = validateSquadDataset(
    squadDataset,
    squadDataset.source.retrievedAt,
  );
  if (!squads.passed) {
    throw new Error(`Squad validation failed: ${squads.failures.join(", ")}`);
  }
  const ratings = validateRatingDataset(ratingDataset);
  if (!ratings.passed) {
    throw new Error(`Rating validation failed: ${ratings.failures.join(", ")}`);
  }
  const simulation = validateMatchSimulation(sampleMatchSimulation);
  if (!simulation.passed) {
    throw new Error(
      `Simulation validation failed: ${simulation.failures.join(", ")}`,
    );
  }
  console.info(`Tournament data validation passed: ${JSON.stringify(report)}`);
  console.info(
    `Squad data validation passed: ${JSON.stringify(squads.totals)}`,
  );
  console.info(
    `Rating data validation passed: ${JSON.stringify(ratings.totals)}`,
  );
  console.info("Simulation sample validation passed");
}

void main();

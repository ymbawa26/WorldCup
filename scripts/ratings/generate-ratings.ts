import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { squadDataset } from "../../src/domain/data-ingestion/data";
import { buildRatingDataset } from "../../src/domain/ratings/model";
import { RatingDatasetSchema } from "../../src/domain/ratings/schema";
import { tournamentSnapshot } from "../../src/domain/tournament/data";

const outputPath = path.join(process.cwd(), "data", "ratings", "ratings.json");

async function main() {
  const dataset = RatingDatasetSchema.parse(
    buildRatingDataset(squadDataset.players, tournamentSnapshot.teams),
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
  console.info(
    `Generated ${dataset.players.length} player ratings and ${dataset.teams.length} team ratings`,
  );
}

void main();

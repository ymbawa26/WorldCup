import qualityJson from "../../../data/reports/squad-data-quality.json";
import squadsJson from "../../../data/normalized/official-squads.json";

import { DataQualityReportSchema, SquadDatasetSchema } from "./schema";

export const squadDataset = SquadDatasetSchema.parse(squadsJson);
export const squadQualityReport = DataQualityReportSchema.parse(qualityJson);

export const squadByTeamId = new Map(
  [...new Set(squadDataset.players.map((player) => player.teamId))].map(
    (teamId) => [
      teamId,
      squadDataset.players
        .filter((player) => player.teamId === teamId)
        .sort((left, right) => left.squadNumber - right.squadNumber),
    ],
  ),
);

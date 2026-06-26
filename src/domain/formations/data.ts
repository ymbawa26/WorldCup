import formationMatchupsJson from "../../../data/formation-matchups.json";
import formationsJson from "../../../data/formations.json";

import {
  FormationDatasetSchema,
  FormationMatchupDatasetSchema,
} from "./schema";

export const formationDataset = FormationDatasetSchema.parse(formationsJson);
export const formationMatchupDataset = FormationMatchupDatasetSchema.parse(
  formationMatchupsJson,
);

export const formationsById = new Map(
  formationDataset.formations.map((formation) => [formation.id, formation]),
);

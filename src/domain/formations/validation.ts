import { formationDataset, formationMatchupDataset } from "./data";
import type { FormationId } from "./schema";

const REQUIRED_FORMATIONS: FormationId[] = [
  "4-3-3",
  "4-2-3-1",
  "4-4-2",
  "4-1-4-1",
  "4-3-2-1",
  "3-4-3",
  "3-4-2-1",
  "3-5-2",
  "5-3-2",
  "5-4-1",
];

export function validateFormationDataset() {
  const failures: string[] = [];
  const ids = new Set(
    formationDataset.formations.map((formation) => formation.id),
  );
  for (const required of REQUIRED_FORMATIONS) {
    if (!ids.has(required)) failures.push(`Missing formation ${required}`);
  }
  for (const formation of formationDataset.formations) {
    const slotIds = new Set(formation.slots.map((slot) => slot.id));
    if (slotIds.size !== formation.slots.length) {
      failures.push(`${formation.id}: duplicate slot ids`);
    }
    if (formation.slots.filter((slot) => slot.role === "GK").length !== 1) {
      failures.push(`${formation.id}: must have exactly one GK slot`);
    }
    if (formation.slots.length !== 11) {
      failures.push(`${formation.id}: must have exactly 11 slots`);
    }
  }
  for (const modifier of formationMatchupDataset.modifiers) {
    if (!ids.has(modifier.formationId)) {
      failures.push(`Modifier references unknown ${modifier.formationId}`);
    }
  }
  return {
    passed: failures.length === 0,
    totals: {
      formations: formationDataset.formations.length,
      matchupModifiers: formationMatchupDataset.modifiers.length,
    },
    failures,
  };
}

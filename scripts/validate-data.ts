import { access } from "node:fs/promises";
import path from "node:path";

const requiredPhaseTwoFiles = [
  "data/groups.csv",
  "data/teams.csv",
  "data/fixtures.csv",
  "data/tournament/third-place-allocation.json",
];

async function exists(filePath: string) {
  try {
    await access(path.resolve(filePath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const presentFiles = (
    await Promise.all(
      requiredPhaseTwoFiles.map(async (filePath) => ({
        exists: await exists(filePath),
        filePath,
      })),
    )
  ).filter((entry) => entry.exists);

  if (
    presentFiles.length > 0 &&
    presentFiles.length < requiredPhaseTwoFiles.length
  ) {
    const missingFiles = requiredPhaseTwoFiles.filter(
      (filePath) => !presentFiles.some((entry) => entry.filePath === filePath),
    );

    throw new Error(
      `Partial tournament dataset detected. Missing: ${missingFiles.join(", ")}`,
    );
  }

  if (presentFiles.length === 0) {
    console.info(
      "Data validation passed for Phase 1: tournament datasets are intentionally not present.",
    );
  } else {
    console.info(
      "Tournament dataset foundation detected. Schema-level validation begins in Phase 2.",
    );
  }
}

void main();

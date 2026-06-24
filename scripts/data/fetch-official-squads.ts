import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";

import source from "../../data/sources/official-squads.json";

import { RAW_DIRECTORY, RAW_SQUAD_PDF } from "./config";

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

async function verifyCache() {
  try {
    const contents = await readFile(RAW_SQUAD_PDF);
    return sha256(contents) === source.sha256;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(RAW_DIRECTORY, { recursive: true });
  if (await verifyCache()) {
    console.info(
      `Official squad source already cached and verified: ${source.sha256}`,
    );
    return;
  }

  const response = await fetch(source.url, {
    headers: {
      "user-agent": "WorldStageDataPipeline/1.0 (+local educational project)",
    },
  });
  if (!response.ok) {
    throw new Error(`FIFA squad source returned HTTP ${response.status}`);
  }
  const contents = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(contents);
  if (actualHash !== source.sha256) {
    throw new Error(
      `Official squad source changed: expected ${source.sha256}, received ${actualHash}. Review and version the source before importing it.`,
    );
  }

  const temporaryPath = `${RAW_SQUAD_PDF}.tmp`;
  await writeFile(temporaryPath, contents);
  await rm(RAW_SQUAD_PDF, { force: true });
  await rename(temporaryPath, RAW_SQUAD_PDF);
  console.info(`Cached and verified official squad source: ${actualHash}`);
}

void main();

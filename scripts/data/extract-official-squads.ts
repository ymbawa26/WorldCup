import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import source from "../../data/sources/official-squads.json";
import { normalizeWhitespace } from "../../src/domain/data-ingestion/identity";
import { RawSquadDatasetSchema } from "../../src/domain/data-ingestion/schema";

import { RAW_EXTRACT, RAW_SQUAD_PDF } from "./config";

type PositionedText = { str: string; transform: number[] };

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const pdf = new Uint8Array(await readFile(RAW_SQUAD_PDF));
  const actualHash = sha256(pdf);
  if (actualHash !== source.sha256) {
    throw new Error(`Cached squad PDF checksum mismatch: ${actualHash}`);
  }

  const document = await getDocument({ data: pdf }).promise;
  const squads = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PositionedText[] = content.items.flatMap((item) =>
      "str" in item ? [{ str: item.str, transform: [...item.transform] }] : [],
    );
    const title = items.find((item) => /^.+ \([A-Z]{3}\)$/.test(item.str))?.str;
    if (!title) throw new Error(`Page ${pageNumber} has no team heading`);
    const titleMatch = title.match(/^(.*) \(([A-Z]{3})\)$/)!;
    const numberItems = items
      .filter(
        (item) =>
          item.transform[4] < 16 &&
          item.transform[5] > 140 &&
          /^\d{1,2}$/.test(item.str),
      )
      .sort((left, right) => right.transform[5] - left.transform[5]);

    const players = numberItems.map((numberItem) => {
      const row = items
        .filter(
          (item) =>
            item !== numberItem &&
            item.str.trim() !== "" &&
            Math.abs(item.transform[5] - numberItem.transform[5]) < 0.4,
        )
        .sort((left, right) => left.transform[4] - right.transform[4]);
      if (row.length !== 10) {
        throw new Error(
          `Page ${pageNumber}, player ${numberItem.str}: expected 10 cells, received ${row.length}`,
        );
      }
      const values = row.map((item) => normalizeWhitespace(item.str));
      return {
        squadNumber: Number(numberItem.str),
        position: values[0],
        playerName: values[1],
        firstNames: values[2],
        lastNames: values[3],
        shirtName: values[4],
        dateOfBirth: values[5],
        club: values[6],
        heightCm: Number.parseInt(values[7], 10),
        caps: Number.parseInt(values[8], 10),
        goals: Number.parseInt(values[9], 10),
      };
    });

    squads.push({
      teamName: normalizeWhitespace(titleMatch[1]),
      fifaCode: titleMatch[2],
      players,
    });
  }

  const dataset = RawSquadDatasetSchema.parse({
    schemaVersion: 1,
    sourceId: source.id,
    sourceSha256: actualHash,
    extractedAt: source.retrievedAt,
    squads,
  });
  await mkdir(path.dirname(RAW_EXTRACT), { recursive: true });
  await writeFile(RAW_EXTRACT, `${JSON.stringify(dataset, null, 2)}\n`);
  console.info(
    `Extracted ${dataset.squads.length} squads and ${dataset.squads.reduce((total, squad) => total + squad.players.length, 0)} players`,
  );
}

void main();

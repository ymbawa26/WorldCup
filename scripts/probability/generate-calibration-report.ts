import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { format } from "prettier";

import { buildCalibrationReport } from "../../src/domain/probability/calibration";
import { CalibrationReportSchema } from "../../src/domain/probability/schema";

const jsonPath = path.join(
  process.cwd(),
  "data",
  "reports",
  "probability-calibration.json",
);
const markdownPath = path.join(
  process.cwd(),
  "data",
  "reports",
  "probability-calibration.md",
);

async function main() {
  const report = CalibrationReportSchema.parse(buildCalibrationReport());
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# Probability Calibration Report",
    "",
    `**Model version:** ${report.modelVersion}`,
    "",
    `**Result:** ${report.passed ? "PASS" : "FAIL"}`,
    "",
    "This Phase 6 report compares analytical prematch probabilities with the",
    "deterministic Phase 5 simulation engine. It is an internal model-fit artifact,",
    "not a public betting-odds surface.",
    "",
    "| Band | Matchup | Analytical H/D/A | Simulated H/D/A | MAE | Samples |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...report.bands.map(
      (band) =>
        `| ${band.label} | ${band.homeTeamId} v ${band.awayTeamId} | ${band.analytical.homeWin}/${band.analytical.draw}/${band.analytical.awayWin} | ${band.simulated.homeWin}/${band.simulated.draw}/${band.simulated.awayWin} | ${band.meanAbsoluteError} | ${band.samples} |`,
    ),
    "",
    "## Limitations",
    "",
    ...report.limitations.map((limitation) => `- ${limitation}`),
    "",
  ];
  await writeFile(
    markdownPath,
    await format(lines.join("\n"), { parser: "markdown" }),
  );
  if (!report.passed) {
    throw new Error("Probability calibration report exceeded tolerance");
  }
  console.info(
    `Probability calibration passed: ${report.bands.length} bands, tolerance ${report.tolerance}`,
  );
}

void main();

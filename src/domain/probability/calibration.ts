import { simulateMatch } from "../simulation/engine";

import {
  PROBABILITY_MODEL_VERSION,
  type CalibrationReport,
  type OutcomeProbability,
} from "./schema";
import { prematchProbability } from "./model";

const GENERATED_AT = "2026-06-25T09:00:00-04:00";
const DEFAULT_SAMPLES = 180;
const DEFAULT_TOLERANCE = 0.22;

const bands = [
  ["elite-v-elite", "argentina", "spain"],
  ["elite-v-strong", "brazil", "england"],
  ["host-v-mid", "mexico", "south-africa"],
  ["balanced-mid", "japan", "morocco"],
  ["underdog-away", "new-zealand", "france"],
] as const;

function round(value: number, digits = 6) {
  return Number(value.toFixed(digits));
}

function simulatedOutcomes(
  homeTeamId: string,
  awayTeamId: string,
  samples: number,
): OutcomeProbability {
  const totals = { homeWin: 0, draw: 0, awayWin: 0 };
  for (let sample = 0; sample < samples; sample += 1) {
    const result = simulateMatch({
      seed: `phase-6-calibration:${homeTeamId}:${awayTeamId}:${sample}`,
      fixtureId: `calibration-${homeTeamId}-${awayTeamId}-${sample}`,
      homeTeamId,
      awayTeamId,
    });
    if (result.finalScore.home > result.finalScore.away) totals.homeWin += 1;
    else if (result.finalScore.home === result.finalScore.away)
      totals.draw += 1;
    else totals.awayWin += 1;
  }
  return {
    homeWin: round(totals.homeWin / samples),
    draw: round(totals.draw / samples),
    awayWin: round(totals.awayWin / samples),
  };
}

function meanAbsoluteError(
  analytical: OutcomeProbability,
  simulated: OutcomeProbability,
) {
  return round(
    (Math.abs(analytical.homeWin - simulated.homeWin) +
      Math.abs(analytical.draw - simulated.draw) +
      Math.abs(analytical.awayWin - simulated.awayWin)) /
      3,
  );
}

export function buildCalibrationReport(
  options: { samples?: number } = {},
): CalibrationReport {
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const reportBands = bands.map(([label, homeTeamId, awayTeamId]) => {
    const analytical = prematchProbability(homeTeamId, awayTeamId).outcomes;
    const simulated = simulatedOutcomes(homeTeamId, awayTeamId, samples);
    return {
      label,
      homeTeamId,
      awayTeamId,
      analytical,
      simulated,
      meanAbsoluteError: meanAbsoluteError(analytical, simulated),
      samples,
    };
  });
  return {
    schemaVersion: 1,
    modelVersion: PROBABILITY_MODEL_VERSION,
    generatedAt: GENERATED_AT,
    sourceNotes: [
      "Internal consistency report comparing analytical Poisson probabilities with the Phase 5 simulation engine.",
      "No external historical match-result corpus is bundled in this phase.",
    ],
    limitations: [
      "This is an engine-consistency calibration, not a historical validation.",
      "The Phase 5 match engine is intentionally simple and will be recalibrated after tactical, fatigue, injury, and discipline profiles mature.",
      "Raw calibration bands are backend/report artifacts and are not intended as public user-facing odds.",
    ],
    tolerance: DEFAULT_TOLERANCE,
    passed: reportBands.every(
      (band) => band.meanAbsoluteError <= DEFAULT_TOLERANCE,
    ),
    bands: reportBands,
  };
}

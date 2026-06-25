import { tournamentSnapshot } from "../tournament/data";

import { simulateMatch } from "./engine";

const openingFixture = tournamentSnapshot.fixtures[0]!;

export const sampleMatchSimulation = simulateMatch({
  seed: "phase-5-sample-opening-match",
  fixtureId: `match-${openingFixture.matchNumber}`,
  homeTeamId: openingFixture.homeTeamId,
  awayTeamId: openingFixture.awayTeamId,
  knockout: false,
  allowExtraTime: false,
  allowShootout: false,
});

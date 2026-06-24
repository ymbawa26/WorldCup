import allocationJson from "../../../data/tournament/third-place-allocation.json";
import bracketJson from "../../../data/tournament/knockout-bracket.json";
import rulesJson from "../../../data/tournament/rules.json";
import snapshotJson from "../../../data/tournament/snapshot.json";

import {
  AllocationSchema,
  KnockoutBracketSchema,
  TournamentSnapshotSchema,
} from "./schema";

export const tournamentSnapshot = TournamentSnapshotSchema.parse(snapshotJson);
export const knockoutBracket = KnockoutBracketSchema.parse(bracketJson);
export const thirdPlaceAllocation = AllocationSchema.parse(allocationJson);

export const tournamentRules = rulesJson;

export const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

export const fixturesByMatchNumber = new Map(
  tournamentSnapshot.fixtures.map((fixture) => [fixture.matchNumber, fixture]),
);

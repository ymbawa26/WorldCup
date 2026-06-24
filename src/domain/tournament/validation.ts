import {
  knockoutBracket,
  thirdPlaceAllocation,
  tournamentSnapshot,
} from "./data";
import { GROUP_IDS, type GroupId } from "./schema";

function combinations<T>(values: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (values.length < size) return [];
  const [first, ...rest] = values;
  return [
    ...combinations(rest, size - 1).map((combination) => [
      first,
      ...combination,
    ]),
    ...combinations(rest, size),
  ];
}

export type TournamentValidationReport = {
  teams: number;
  groups: number;
  groupFixtures: number;
  venues: number;
  knockoutMatches: number;
  thirdPlaceCombinations: number;
};

export function validateTournamentData(): TournamentValidationReport {
  const teamIds = tournamentSnapshot.teams.map((team) => team.id);
  const fifaCodes = tournamentSnapshot.teams.map((team) => team.fifaCode);
  const fixtureNumbers = tournamentSnapshot.fixtures.map(
    (fixture) => fixture.matchNumber,
  );
  const venueIds = new Set(tournamentSnapshot.venues.map((venue) => venue.id));

  if (teamIds.length !== 48 || new Set(teamIds).size !== 48) {
    throw new Error("Tournament snapshot must contain 48 unique teams");
  }
  if (new Set(fifaCodes).size !== 48) {
    throw new Error("FIFA team codes must be unique");
  }
  if (
    tournamentSnapshot.groups.length !== 12 ||
    tournamentSnapshot.groups.some((group) => group.teamIds.length !== 4)
  ) {
    throw new Error("Tournament snapshot must contain 12 groups of four");
  }
  if (
    fixtureNumbers.length !== 72 ||
    fixtureNumbers.some((matchNumber, index) => matchNumber !== index + 1)
  ) {
    throw new Error("Group fixture numbers must be the complete range 1-72");
  }

  const appearances = new Map(teamIds.map((teamId) => [teamId, 0]));
  for (const fixture of tournamentSnapshot.fixtures) {
    if (fixture.homeTeamId === fixture.awayTeamId) {
      throw new Error(`Match ${fixture.matchNumber} has the same team twice`);
    }
    if (
      !appearances.has(fixture.homeTeamId) ||
      !appearances.has(fixture.awayTeamId)
    ) {
      throw new Error(
        `Match ${fixture.matchNumber} references an unknown team`,
      );
    }
    if (!venueIds.has(fixture.venueId)) {
      throw new Error(
        `Match ${fixture.matchNumber} references an unknown venue`,
      );
    }
    appearances.set(
      fixture.homeTeamId,
      appearances.get(fixture.homeTeamId)! + 1,
    );
    appearances.set(
      fixture.awayTeamId,
      appearances.get(fixture.awayTeamId)! + 1,
    );
  }
  if ([...appearances.values()].some((appearances) => appearances !== 3)) {
    throw new Error("Every team must play exactly three group fixtures");
  }

  const finalFixtures = tournamentSnapshot.fixtures.filter(
    (fixture) => fixture.matchday === 3,
  );
  for (const group of GROUP_IDS) {
    const groupFinals = finalFixtures.filter(
      (fixture) => fixture.group === group,
    );
    if (
      groupFinals.length !== 2 ||
      new Set(groupFinals.map((fixture) => fixture.simultaneousKey)).size !== 1
    ) {
      throw new Error(
        `Group ${group} final fixtures are not marked simultaneous`,
      );
    }
  }

  const knockoutNumbers = knockoutBracket.matches.map(
    (match) => match.matchNumber,
  );
  if (
    knockoutNumbers.length !== 32 ||
    knockoutNumbers.some((matchNumber, index) => matchNumber !== index + 73)
  ) {
    throw new Error(
      "Knockout fixture numbers must be the complete range 73-104",
    );
  }
  for (const match of knockoutBracket.matches) {
    if (!venueIds.has(match.venueId)) {
      throw new Error(
        `Knockout Match ${match.matchNumber} has an unknown venue`,
      );
    }
  }

  const expectedKeys = combinations([...GROUP_IDS], 8)
    .map((groups) => groups.join(""))
    .sort();
  const actualKeys = Object.keys(thirdPlaceAllocation.combinations).sort();
  if (
    expectedKeys.length !== 495 ||
    actualKeys.length !== 495 ||
    expectedKeys.some((key, index) => key !== actualKeys[index])
  ) {
    throw new Error(
      "Annex C must cover every one of the 495 eight-group combinations",
    );
  }

  const allowedByWinner = new Map<GroupId, Set<GroupId>>();
  for (const match of knockoutBracket.matches.filter(
    (candidate) => candidate.stage === "ROUND_OF_32",
  )) {
    if (!match.awaySlot.startsWith("3:")) continue;
    allowedByWinner.set(
      match.homeSlot.slice(1) as GroupId,
      new Set(match.awaySlot.slice(2).split("") as GroupId[]),
    );
  }

  for (const [key, combination] of Object.entries(
    thirdPlaceAllocation.combinations,
  )) {
    const assignedGroups = Object.values(combination.assignments);
    if (
      assignedGroups.length !== 8 ||
      new Set(assignedGroups).size !== 8 ||
      [...assignedGroups].sort().join("") !== key
    ) {
      throw new Error(`Annex C option ${combination.option} is not one-to-one`);
    }

    for (const [winner, opponent] of Object.entries(combination.assignments)) {
      if (!allowedByWinner.get(winner as GroupId)?.has(opponent)) {
        throw new Error(
          `Annex C option ${combination.option} assigns 1${winner} an invalid 3${opponent}`,
        );
      }
      if (winner === opponent) {
        throw new Error(
          `Annex C option ${combination.option} creates a same-group rematch`,
        );
      }
    }
  }

  return {
    teams: tournamentSnapshot.teams.length,
    groups: tournamentSnapshot.groups.length,
    groupFixtures: tournamentSnapshot.fixtures.length,
    venues: tournamentSnapshot.venues.length,
    knockoutMatches: knockoutBracket.matches.length,
    thirdPlaceCombinations: actualKeys.length,
  };
}

import { thirdPlaceAllocation } from "./data";
import type { GroupId } from "./schema";
import { rankThirdPlacedTeams, type TeamStanding } from "./standings";

export type GroupStandings = Record<GroupId, TeamStanding[]>;

export type QualificationResult = {
  groupWinners: TeamStanding[];
  groupRunnersUp: TeamStanding[];
  rankedThirdPlacedTeams: TeamStanding[];
  qualifyingThirdPlacedTeams: TeamStanding[];
  eliminatedThirdPlacedTeams: TeamStanding[];
};

export function qualifyFromGroups(
  standingsByGroup: GroupStandings,
): QualificationResult {
  const groups = Object.values(standingsByGroup);
  if (
    groups.length !== 12 ||
    groups.some((standings) => standings.length !== 4)
  ) {
    throw new Error("Qualification requires 12 complete groups of four teams");
  }

  const rankedThirdPlacedTeams = rankThirdPlacedTeams(
    groups.map((standings) => standings[2]),
  );

  return {
    groupWinners: groups.map((standings) => standings[0]),
    groupRunnersUp: groups.map((standings) => standings[1]),
    rankedThirdPlacedTeams,
    qualifyingThirdPlacedTeams: rankedThirdPlacedTeams.slice(0, 8),
    eliminatedThirdPlacedTeams: rankedThirdPlacedTeams.slice(8),
  };
}

export function allocateThirdPlacedTeams(
  qualifyingThirdPlacedTeams: TeamStanding[],
): Map<GroupId, TeamStanding> {
  if (qualifyingThirdPlacedTeams.length !== 8) {
    throw new Error("Exactly eight third-placed teams must be allocated");
  }

  const teamByGroup = new Map(
    qualifyingThirdPlacedTeams.map((standing) => [standing.group, standing]),
  );
  if (teamByGroup.size !== 8) {
    throw new Error(
      "Qualifying third-placed teams must come from eight unique groups",
    );
  }

  const key = [...teamByGroup.keys()].sort().join("");
  const combination = thirdPlaceAllocation.combinations[key];
  if (!combination) {
    throw new Error(`No official Annex C allocation exists for ${key}`);
  }

  const allocation = new Map<GroupId, TeamStanding>();
  for (const [winnerGroup, thirdPlacedGroup] of Object.entries(
    combination.assignments,
  )) {
    const standing = teamByGroup.get(thirdPlacedGroup as GroupId);
    if (!standing) {
      throw new Error(
        `Annex C option ${combination.option} references non-qualifying Group ${thirdPlacedGroup}`,
      );
    }
    allocation.set(winnerGroup as GroupId, standing);
  }

  if (allocation.size !== 8 || new Set(allocation.values()).size !== 8) {
    throw new Error(`Annex C option ${combination.option} is not one-to-one`);
  }

  return allocation;
}

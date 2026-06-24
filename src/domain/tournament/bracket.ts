import { knockoutBracket } from "./data";
import {
  allocateThirdPlacedTeams,
  qualifyFromGroups,
  type GroupStandings,
} from "./qualification";
import type { GroupId, KnockoutMatch } from "./schema";

export type RoundOf32Match = KnockoutMatch & {
  homeTeamId: string;
  awayTeamId: string;
};

export type ResolvedKnockoutMatch = RoundOf32Match & {
  winnerTeamId: string;
  loserTeamId: string;
};

function groupFromSlot(slot: string): GroupId {
  return slot.at(-1) as GroupId;
}

export function buildRoundOf32(
  standingsByGroup: GroupStandings,
): RoundOf32Match[] {
  const qualification = qualifyFromGroups(standingsByGroup);
  const thirdPlaceByWinnerGroup = allocateThirdPlacedTeams(
    qualification.qualifyingThirdPlacedTeams,
  );
  const matches = knockoutBracket.matches
    .filter((match) => match.stage === "ROUND_OF_32")
    .map((match) => {
      const resolveGroupSlot = (slot: string) => {
        const position = Number(slot[0]);
        const group = groupFromSlot(slot);
        return standingsByGroup[group][position - 1].teamId;
      };

      const homeTeamId = resolveGroupSlot(match.homeSlot);
      const awayTeamId = match.awaySlot.startsWith("3:")
        ? thirdPlaceByWinnerGroup.get(groupFromSlot(match.homeSlot))?.teamId
        : resolveGroupSlot(match.awaySlot);

      if (!awayTeamId) {
        throw new Error(`Unable to resolve Match ${match.matchNumber}`);
      }

      return { ...match, homeTeamId, awayTeamId };
    });

  const participants = matches.flatMap((match) => [
    match.homeTeamId,
    match.awayTeamId,
  ]);
  if (matches.length !== 16 || participants.length !== 32) {
    throw new Error(
      "The Round of 32 must contain 16 matches and 32 participants",
    );
  }
  if (new Set(participants).size !== 32) {
    throw new Error("A team appears more than once in the Round of 32");
  }

  return matches;
}

export function resolveTournamentBracket({
  selectWinner,
  standingsByGroup,
}: {
  selectWinner: (match: RoundOf32Match) => string;
  standingsByGroup: GroupStandings;
}) {
  const resolved = new Map<number, ResolvedKnockoutMatch>();
  const roundOf32 = new Map(
    buildRoundOf32(standingsByGroup).map((match) => [match.matchNumber, match]),
  );

  for (const match of knockoutBracket.matches) {
    const resolveProgressionSlot = (slot: string) => {
      const sourceMatch = Number(slot.slice(1));
      const source = resolved.get(sourceMatch);
      if (!source)
        throw new Error(`Match ${sourceMatch} has not been resolved`);
      return slot.startsWith("W") ? source.winnerTeamId : source.loserTeamId;
    };

    const base = roundOf32.get(match.matchNumber);
    const homeTeamId =
      base?.homeTeamId ?? resolveProgressionSlot(match.homeSlot);
    const awayTeamId =
      base?.awayTeamId ?? resolveProgressionSlot(match.awaySlot);
    if (homeTeamId === awayTeamId) {
      throw new Error(
        `Match ${match.matchNumber} contains the same team twice`,
      );
    }

    const selectableMatch = { ...match, homeTeamId, awayTeamId };
    const winnerTeamId = selectWinner(selectableMatch);
    if (winnerTeamId !== homeTeamId && winnerTeamId !== awayTeamId) {
      throw new Error(
        `Winner for Match ${match.matchNumber} is not a participant`,
      );
    }

    resolved.set(match.matchNumber, {
      ...selectableMatch,
      winnerTeamId,
      loserTeamId: winnerTeamId === homeTeamId ? awayTeamId : homeTeamId,
    });
  }

  const final = resolved.get(104);
  if (!final || resolved.size !== 32) {
    throw new Error("The knockout bracket did not produce a final champion");
  }

  return {
    championTeamId: final.winnerTeamId,
    matches: [...resolved.values()],
  };
}

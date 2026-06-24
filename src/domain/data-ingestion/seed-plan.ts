import { deterministicUuid } from "./identity";
import type { SquadDataset } from "./schema";

export function buildSquadSeedPlan(dataset: SquadDataset) {
  const clubs = [
    ...new Map(
      dataset.players.map((player) => {
        if (!player.clubCountryCode) {
          throw new Error(`${player.fullName} has no normalized club country`);
        }
        const identity = `${player.clubName}:${player.clubCountryCode}`;
        return [
          identity,
          {
            id: deterministicUuid(`club:${identity}`),
            name: player.clubName,
            countryCode: player.clubCountryCode,
          },
        ];
      }),
    ).values(),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const clubByIdentity = new Map(
    clubs.map((club) => [`${club.name}:${club.countryCode}`, club]),
  );

  const players = [...dataset.players]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((player) => ({
      ...player,
      clubId: clubByIdentity.get(
        `${player.clubName}:${player.clubCountryCode}`,
      )!.id,
      playerClubId: deterministicUuid(
        `player-club:${player.id}:${dataset.dataVersion}`,
      ),
      squadEntryId: deterministicUuid(
        `tournament-squad:${player.id}:${dataset.dataVersion}`,
      ),
    }));

  return { clubs, players };
}

import { PrismaPg } from "@prisma/adapter-pg";
import { pathToFileURL } from "node:url";

import sourcesJson from "../data/tournament/sources.json";
import squadSource from "../data/sources/official-squads.json";
import { squadDataset } from "../src/domain/data-ingestion/data";
import { deterministicUuid } from "../src/domain/data-ingestion/identity";
import { buildSquadSeedPlan } from "../src/domain/data-ingestion/seed-plan";
import {
  knockoutBracket,
  tournamentSnapshot,
} from "../src/domain/tournament/data";
import { PrismaClient } from "../src/generated/prisma/client";

const tournamentId = deterministicUuid(
  `tournament:${tournamentSnapshot.dataVersion}`,
);

export async function seedDatabase(prisma: PrismaClient) {
  const sources = [...sourcesJson.sources, squadSource];
  for (const source of sources) {
    await prisma.dataSource.upsert({
      where: { id: source.id },
      create: {
        id: source.id,
        name: source.name,
        url: source.url,
        retrievedAt: new Date(source.retrievedAt),
        publishedAt: "publishedAt" in source ? source.publishedAt : null,
        sha256: "sha256" in source ? source.sha256 : null,
        licenseNote: source.licenseNote,
      },
      update: {
        name: source.name,
        url: source.url,
        retrievedAt: new Date(source.retrievedAt),
        publishedAt: "publishedAt" in source ? source.publishedAt : null,
        sha256: "sha256" in source ? source.sha256 : null,
        licenseNote: source.licenseNote,
      },
    });
  }

  await prisma.tournament.upsert({
    where: { dataVersion: tournamentSnapshot.dataVersion },
    create: {
      id: tournamentId,
      slug: "world-stage-2026",
      name: "World Stage 2026",
      dataVersion: tournamentSnapshot.dataVersion,
      startsAt: new Date(tournamentSnapshot.stateAt),
      resultsIncluded: false,
    },
    update: { resultsIncluded: false },
  });
  for (const source of sources) {
    await prisma.tournamentSource.upsert({
      where: { tournamentId_sourceId: { tournamentId, sourceId: source.id } },
      create: { tournamentId, sourceId: source.id },
      update: {},
    });
  }

  const teamDatabaseId = new Map<string, string>();
  const tournamentTeamId = new Map<string, string>();
  for (const team of tournamentSnapshot.teams) {
    const teamId = deterministicUuid(`team:${team.id}`);
    const entryId = deterministicUuid(
      `tournament-team:${tournamentId}:${team.id}`,
    );
    await prisma.team.upsert({
      where: { slug: team.id },
      create: {
        id: teamId,
        slug: team.id,
        name: team.name,
        shortName: team.shortName,
        fifaCode: team.fifaCode,
        flagCode: team.flagCode,
        confederation: team.confederation,
        sourceExternalId: team.sourceExternalId,
      },
      update: {
        name: team.name,
        shortName: team.shortName,
        flagCode: team.flagCode,
        confederation: team.confederation,
      },
    });
    await prisma.tournamentTeam.upsert({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      create: {
        id: entryId,
        tournamentId,
        teamId,
        fifaRank: team.fifaRanking.rank,
        previousFifaRank: team.fifaRanking.previousRank,
        fifaPoints: team.fifaRanking.points,
      },
      update: {
        fifaRank: team.fifaRanking.rank,
        previousFifaRank: team.fifaRanking.previousRank,
        fifaPoints: team.fifaRanking.points,
      },
    });
    teamDatabaseId.set(team.id, teamId);
    tournamentTeamId.set(team.id, entryId);
  }

  const groupDatabaseId = new Map<string, string>();
  for (const group of tournamentSnapshot.groups) {
    const groupId = deterministicUuid(
      `tournament-group:${tournamentId}:${group.id}`,
    );
    await prisma.tournamentGroup.upsert({
      where: { tournamentId_code: { tournamentId, code: group.id } },
      create: { id: groupId, tournamentId, code: group.id },
      update: {},
    });
    groupDatabaseId.set(group.id, groupId);
    for (const [index, teamId] of group.teamIds.entries()) {
      const entryId = tournamentTeamId.get(teamId)!;
      await prisma.groupMembership.upsert({
        where: {
          groupId_tournamentTeamId: { groupId, tournamentTeamId: entryId },
        },
        create: {
          id: deterministicUuid(`group-membership:${groupId}:${entryId}`),
          groupId,
          tournamentTeamId: entryId,
          drawPosition: index + 1,
        },
        update: { drawPosition: index + 1 },
      });
    }
  }

  const stadiumDatabaseId = new Map<string, string>();
  for (const stadium of tournamentSnapshot.venues) {
    const id = deterministicUuid(`stadium:${stadium.id}`);
    await prisma.stadium.upsert({
      where: { slug: stadium.id },
      create: {
        id,
        slug: stadium.id,
        name: stadium.name,
        city: stadium.city,
        country: stadium.country,
      },
      update: {
        name: stadium.name,
        city: stadium.city,
        country: stadium.country,
      },
    });
    stadiumDatabaseId.set(stadium.id, id);
  }

  const fixtures = [
    ...tournamentSnapshot.fixtures.map((fixture) => ({
      ...fixture,
      homeSlot: null,
      awaySlot: null,
    })),
    ...knockoutBracket.matches.map((fixture) => ({
      ...fixture,
      group: null,
      simultaneousKey: null,
      homeTeamId: null,
      awayTeamId: null,
    })),
  ];
  for (const fixture of fixtures) {
    await prisma.fixture.upsert({
      where: {
        tournamentId_matchNumber: {
          tournamentId,
          matchNumber: fixture.matchNumber,
        },
      },
      create: {
        id: deterministicUuid(`fixture:${tournamentId}:${fixture.matchNumber}`),
        tournamentId,
        matchNumber: fixture.matchNumber,
        stage: fixture.stage,
        scheduledDate: new Date(`${fixture.date}T12:00:00Z`),
        simultaneousKey: fixture.simultaneousKey,
        groupId: fixture.group ? groupDatabaseId.get(fixture.group) : null,
        stadiumId: stadiumDatabaseId.get(fixture.venueId)!,
        homeTournamentTeamId: fixture.homeTeamId
          ? tournamentTeamId.get(fixture.homeTeamId)
          : null,
        awayTournamentTeamId: fixture.awayTeamId
          ? tournamentTeamId.get(fixture.awayTeamId)
          : null,
        homeSlot: fixture.homeSlot,
        awaySlot: fixture.awaySlot,
      },
      update: {
        scheduledDate: new Date(`${fixture.date}T12:00:00Z`),
        stadiumId: stadiumDatabaseId.get(fixture.venueId)!,
      },
    });
  }

  const plan = buildSquadSeedPlan(squadDataset);
  for (const club of plan.clubs) {
    await prisma.club.upsert({
      where: {
        name_countryCode: { name: club.name, countryCode: club.countryCode },
      },
      create: club,
      update: {},
    });
  }
  for (const player of plan.players) {
    const nationalTeamId = teamDatabaseId.get(player.teamId)!;
    const squadTeamId = tournamentTeamId.get(player.teamId)!;
    await prisma.player.upsert({
      where: { externalIdentity: player.externalIdentity },
      create: {
        id: player.id,
        externalIdentity: player.externalIdentity,
        nationalTeamId,
        fullName: player.fullName,
        displayName: player.displayName,
        firstNames: player.firstNames,
        lastNames: player.lastNames,
        shirtName: player.shirtName,
        dateOfBirth: new Date(`${player.dateOfBirth}T00:00:00Z`),
        heightCm: player.heightCm,
        primaryPosition: player.primaryPosition,
        preferredFoot: player.preferredFoot,
      },
      update: {
        fullName: player.fullName,
        displayName: player.displayName,
        shirtName: player.shirtName,
        heightCm: player.heightCm,
        primaryPosition: player.primaryPosition,
      },
    });
    await prisma.playerClub.upsert({
      where: {
        playerId_dataVersion: {
          playerId: player.id,
          dataVersion: squadDataset.dataVersion,
        },
      },
      create: {
        id: player.playerClubId,
        playerId: player.id,
        clubId: player.clubId,
        dataVersion: squadDataset.dataVersion,
      },
      update: { clubId: player.clubId, isCurrent: true },
    });
    await prisma.playerDataSource.upsert({
      where: {
        playerId_sourceId: {
          playerId: player.id,
          sourceId: squadDataset.source.sourceId,
        },
      },
      create: {
        playerId: player.id,
        sourceId: squadDataset.source.sourceId,
        fields: Object.keys(player.fieldProvenance),
        confidenceScore: squadDataset.source.confidenceScore,
        isEstimated: squadDataset.source.isEstimated,
      },
      update: {
        fields: Object.keys(player.fieldProvenance),
        confidenceScore: squadDataset.source.confidenceScore,
        isEstimated: squadDataset.source.isEstimated,
      },
    });
    await prisma.tournamentSquadPlayer.upsert({
      where: {
        tournamentTeamId_playerId: {
          tournamentTeamId: squadTeamId,
          playerId: player.id,
        },
      },
      create: {
        id: player.squadEntryId,
        tournamentTeamId: squadTeamId,
        playerId: player.id,
        sourceId: squadDataset.source.sourceId,
        squadNumber: player.squadNumber,
        registeredPosition: player.primaryPosition,
        internationalCaps: player.internationalCaps,
        internationalGoals: player.internationalGoals,
      },
      update: {
        squadNumber: player.squadNumber,
        registeredPosition: player.primaryPosition,
        internationalCaps: player.internationalCaps,
        internationalGoals: player.internationalGoals,
      },
    });
  }

  const counts = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.tournamentSquadPlayer.count(),
    prisma.club.count(),
  ]);
  if (counts[0] !== 48 || counts[1] !== 1248 || counts[2] !== 1248) {
    throw new Error(`Unexpected seed counts: ${counts.join(",")}`);
  }
  console.info(
    `Seed complete: ${counts[0]} teams, ${counts[1]} players, ${counts[2]} squad entries, ${counts[3]} clubs`,
  );
}

async function runCli() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed PostgreSQL");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  await seedDatabase(prisma).finally(async () => prisma.$disconnect());
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runCli();
}

import { readdir, readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";

import { seedDatabase } from "../../prisma/seed";
import { PrismaClient } from "../../src/generated/prisma/client";

const PORT = 54_331;

async function main() {
  const database = await PGlite.create();
  const migrationDirectories = (await readdir("prisma/migrations"))
    .filter((entry) => entry !== "migration_lock.toml")
    .sort();
  for (const directory of migrationDirectories) {
    const migration = await readFile(
      `prisma/migrations/${directory}/migration.sql`,
      "utf8",
    );
    await database.exec(migration);
  }
  const server = new PGLiteSocketServer({
    db: database,
    host: "127.0.0.1",
    port: PORT,
    maxConnections: 10,
  });
  await server.start();

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable`,
      max: 5,
    }),
  });
  try {
    await seedDatabase(prisma);
    await seedDatabase(prisma);
    const counts = {
      teams: await prisma.team.count(),
      players: await prisma.player.count(),
      squadEntries: await prisma.tournamentSquadPlayer.count(),
      clubs: await prisma.club.count(),
      playerRatings: await prisma.playerRating.count(),
      teamRatings: await prisma.teamRating.count(),
      lineupSlots: await prisma.teamLineupPlayer.count(),
    };
    if (
      counts.teams !== 48 ||
      counts.players !== 1248 ||
      counts.squadEntries !== 1248 ||
      counts.clubs !== 450 ||
      counts.playerRatings !== 1248 ||
      counts.teamRatings !== 48 ||
      counts.lineupSlots !== 528
    ) {
      throw new Error(
        `Unexpected idempotency counts: ${JSON.stringify(counts)}`,
      );
    }
    console.info(
      `PostgreSQL seed smoke passed twice: ${JSON.stringify(counts)}`,
    );
  } finally {
    await prisma.$disconnect();
    await server.stop();
    await database.close();
  }
}

void main();

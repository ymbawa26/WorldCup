-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TournamentStage" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'DF', 'MF', 'FW');

-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TEXT,
    "sha256" TEXT,
    "licenseNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "resultsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSource" (
    "tournamentId" UUID NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "TournamentSource_pkey" PRIMARY KEY ("tournamentId","sourceId")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "fifaCode" CHAR(3) NOT NULL,
    "flagCode" TEXT NOT NULL,
    "confederation" TEXT NOT NULL,
    "sourceExternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "fifaRank" INTEGER NOT NULL,
    "previousFifaRank" INTEGER NOT NULL,
    "fifaPoints" DECIMAL(10,6) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "code" CHAR(1) NOT NULL,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "tournamentTeamId" UUID NOT NULL,
    "drawPosition" INTEGER NOT NULL,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stadium" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stadium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "externalIdentity" TEXT NOT NULL,
    "nationalTeamId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstNames" TEXT NOT NULL,
    "lastNames" TEXT NOT NULL,
    "shirtName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "primaryPosition" "PlayerPosition" NOT NULL,
    "preferredFoot" "PreferredFoot",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerClub" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlayerClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSquadPlayer" (
    "id" UUID NOT NULL,
    "tournamentTeamId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "sourceId" TEXT NOT NULL,
    "squadNumber" INTEGER NOT NULL,
    "registeredPosition" "PlayerPosition" NOT NULL,
    "internationalCaps" INTEGER NOT NULL,
    "internationalGoals" INTEGER NOT NULL,

    CONSTRAINT "TournamentSquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDataSource" (
    "playerId" UUID NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlayerDataSource_pkey" PRIMARY KEY ("playerId","sourceId")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "stage" "TournamentStage" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "simultaneousKey" TEXT,
    "groupId" UUID,
    "stadiumId" UUID NOT NULL,
    "homeTournamentTeamId" UUID,
    "awayTournamentTeamId" UUID,
    "homeSlot" TEXT,
    "awaySlot" TEXT,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_dataVersion_key" ON "Tournament"("dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_fifaCode_key" ON "Team"("fifaCode");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sourceExternalId_key" ON "Team"("sourceExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_teamId_key" ON "TournamentTeam"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGroup_tournamentId_code_key" ON "TournamentGroup"("tournamentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_drawPosition_key" ON "GroupMembership"("groupId", "drawPosition");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_tournamentTeamId_key" ON "GroupMembership"("groupId", "tournamentTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Stadium_slug_key" ON "Stadium"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Player_externalIdentity_key" ON "Player"("externalIdentity");

-- CreateIndex
CREATE INDEX "Player_nationalTeamId_idx" ON "Player"("nationalTeamId");

-- CreateIndex
CREATE INDEX "Player_fullName_idx" ON "Player"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_countryCode_key" ON "Club"("name", "countryCode");

-- CreateIndex
CREATE INDEX "PlayerClub_clubId_idx" ON "PlayerClub"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerClub_playerId_dataVersion_key" ON "PlayerClub"("playerId", "dataVersion");

-- CreateIndex
CREATE INDEX "TournamentSquadPlayer_playerId_idx" ON "TournamentSquadPlayer"("playerId");

-- CreateIndex
CREATE INDEX "TournamentSquadPlayer_sourceId_idx" ON "TournamentSquadPlayer"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSquadPlayer_tournamentTeamId_playerId_key" ON "TournamentSquadPlayer"("tournamentTeamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSquadPlayer_tournamentTeamId_squadNumber_key" ON "TournamentSquadPlayer"("tournamentTeamId", "squadNumber");

-- CreateIndex
CREATE INDEX "PlayerDataSource_sourceId_idx" ON "PlayerDataSource"("sourceId");

-- CreateIndex
CREATE INDEX "Fixture_groupId_idx" ON "Fixture"("groupId");

-- CreateIndex
CREATE INDEX "Fixture_stadiumId_idx" ON "Fixture"("stadiumId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_tournamentId_matchNumber_key" ON "Fixture"("tournamentId", "matchNumber");

-- AddForeignKey
ALTER TABLE "TournamentSource" ADD CONSTRAINT "TournamentSource_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSource" ADD CONSTRAINT "TournamentSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_tournamentTeamId_fkey" FOREIGN KEY ("tournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_nationalTeamId_fkey" FOREIGN KEY ("nationalTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClub" ADD CONSTRAINT "PlayerClub_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClub" ADD CONSTRAINT "PlayerClub_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_tournamentTeamId_fkey" FOREIGN KEY ("tournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDataSource" ADD CONSTRAINT "PlayerDataSource_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDataSource" ADD CONSTRAINT "PlayerDataSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "Stadium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTournamentTeamId_fkey" FOREIGN KEY ("homeTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTournamentTeamId_fkey" FOREIGN KEY ("awayTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

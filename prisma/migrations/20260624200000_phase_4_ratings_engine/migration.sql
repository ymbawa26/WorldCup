CREATE TYPE "TacticalRole" AS ENUM ('GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WG', 'ST');

CREATE TABLE "RatingModelVersion" (
    "id" TEXT NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "inputs" JSONB NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RatingModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerRating" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fifaCode" CHAR(3) NOT NULL,
    "ageAtTournamentStart" INTEGER NOT NULL,
    "primaryPosition" "PlayerPosition" NOT NULL,
    "attributes" JSONB NOT NULL,
    "roleRatings" JSONB NOT NULL,
    "bestRole" "TacticalRole" NOT NULL,
    "overallEstimate" INTEGER NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "uncertainty" DECIMAL(4,3) NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT true,
    "notes" JSONB NOT NULL,

    CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamRating" (
    "id" UUID NOT NULL,
    "tournamentTeamId" UUID NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fifaCode" CHAR(3) NOT NULL,
    "defaultFormation" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "uncertainty" DECIMAL(4,3) NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamLineupPlayer" (
    "id" UUID NOT NULL,
    "teamRatingId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "role" "TacticalRole" NOT NULL,
    "roleRating" INTEGER NOT NULL,
    "roleFit" DECIMAL(4,3) NOT NULL,

    CONSTRAINT "TeamLineupPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RatingModelVersion_dataVersion_key" ON "RatingModelVersion"("dataVersion");
CREATE UNIQUE INDEX "PlayerRating_playerId_modelVersionId_key" ON "PlayerRating"("playerId", "modelVersionId");
CREATE INDEX "PlayerRating_teamId_idx" ON "PlayerRating"("teamId");
CREATE INDEX "PlayerRating_fifaCode_idx" ON "PlayerRating"("fifaCode");
CREATE UNIQUE INDEX "TeamRating_tournamentTeamId_modelVersionId_key" ON "TeamRating"("tournamentTeamId", "modelVersionId");
CREATE INDEX "TeamRating_teamId_idx" ON "TeamRating"("teamId");
CREATE INDEX "TeamRating_fifaCode_idx" ON "TeamRating"("fifaCode");
CREATE UNIQUE INDEX "TeamLineupPlayer_teamRatingId_slotIndex_key" ON "TeamLineupPlayer"("teamRatingId", "slotIndex");
CREATE UNIQUE INDEX "TeamLineupPlayer_teamRatingId_playerId_key" ON "TeamLineupPlayer"("teamRatingId", "playerId");
CREATE INDEX "TeamLineupPlayer_playerId_idx" ON "TeamLineupPlayer"("playerId");

ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "RatingModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamRating" ADD CONSTRAINT "TeamRating_tournamentTeamId_fkey" FOREIGN KEY ("tournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamRating" ADD CONSTRAINT "TeamRating_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "RatingModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamLineupPlayer" ADD CONSTRAINT "TeamLineupPlayer_teamRatingId_fkey" FOREIGN KEY ("teamRatingId") REFERENCES "TeamRating"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamLineupPlayer" ADD CONSTRAINT "TeamLineupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

import ratingJson from "../../../data/ratings/ratings.json";

import { RatingDatasetSchema } from "./schema";

export const ratingDataset = RatingDatasetSchema.parse(ratingJson);

export const playerRatingsById = new Map(
  ratingDataset.players.map((rating) => [rating.playerId, rating]),
);

export const teamRatingsById = new Map(
  ratingDataset.teams.map((rating) => [rating.teamId, rating]),
);

import {
  BadgeCheck,
  BarChart3,
  CircleGauge,
  ShieldQuestion,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";

import { squadDataset } from "@/domain/data-ingestion/data";
import { ratingDataset } from "@/domain/ratings/data";
import { tournamentSnapshot } from "@/domain/tournament/data";

export const metadata: Metadata = {
  title: "Ratings engine",
  description:
    "Inspect the independent estimated player and team rating model.",
};

const playersById = new Map(
  squadDataset.players.map((player) => [player.id, player]),
);
const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

const topTeams = [...ratingDataset.teams]
  .sort((left, right) => right.strengths.overall - left.strengths.overall)
  .slice(0, 8);

const topPlayers = [...ratingDataset.players]
  .sort((left, right) => right.overallEstimate - left.overallEstimate)
  .slice(0, 10);

const argentina = ratingDataset.teams.find(
  (team) => team.teamId === "argentina",
)!;

const metrics = [
  {
    icon: UsersRound,
    label: "Player ratings",
    value: ratingDataset.players.length.toLocaleString("en-US"),
  },
  {
    icon: BarChart3,
    label: "Team ratings",
    value: String(ratingDataset.teams.length),
  },
  {
    icon: CircleGauge,
    label: "Role ratings",
    value: "8/player",
  },
  {
    icon: ShieldQuestion,
    label: "Estimated values",
    value: "100%",
  },
];

export default function RatingsPage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
      <div className="hero-glow absolute inset-0 -z-20" />
      <div className="pitch-grid absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Phase 4 · ratings engine</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Independent ratings, built to be questioned.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              The model estimates player attributes, position-specific role
              ratings, default lineups, and team strengths from official squad
              facts plus team ranking context. Every value is versioned,
              deterministic, and marked as estimated.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-black tracking-wider text-emerald-200 uppercase">
            <BadgeCheck aria-hidden="true" className="size-5" />
            Rating gate ready
          </div>
        </div>

        <section
          aria-label="Ratings metrics"
          className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map(({ icon: Icon, label, value }) => (
            <article
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              key={label}
            >
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <strong className="mt-5 block text-3xl font-black text-white">
                {value}
              </strong>
              <span className="mt-1 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                {label}
              </span>
            </article>
          ))}
        </section>

        <section className="mt-18 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Team strength table</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Top estimated squads
            </h2>
            <div className="mt-7 space-y-3">
              {topTeams.map((rating, index) => {
                const team = teamsById.get(rating.teamId)!;
                return (
                  <div
                    className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    key={rating.teamId}
                  >
                    <span className="text-sm font-black text-cyan-300">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {team.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Attack {rating.strengths.attack} · Midfield{" "}
                        {rating.strengths.midfield} · Defense{" "}
                        {rating.strengths.defense}
                      </p>
                    </div>
                    <strong className="text-2xl font-black text-white">
                      {rating.strengths.overall}
                    </strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Player role estimates</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Top player estimates
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {topPlayers.map((rating) => {
                const player = playersById.get(rating.playerId)!;
                return (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    key={rating.playerId}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-white">
                          {player.fullName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {rating.fifaCode} · {rating.bestRole} · confidence{" "}
                          {Math.round(rating.confidenceScore * 100)}%
                        </p>
                      </div>
                      <strong className="text-2xl font-black text-cyan-200">
                        {rating.overallEstimate}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-20 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a102b]/90">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="eyebrow">Lineup recomputation sample</p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Argentina · default 4-3-3
              </h2>
            </div>
            <ol className="grid divide-y divide-white/7 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-white/7">
              {[argentina.lineup.slice(0, 6), argentina.lineup.slice(6)].map(
                (column, columnIndex) => (
                  <div key={columnIndex}>
                    {column.map((entry) => {
                      const player = playersById.get(entry.playerId)!;
                      return (
                        <li
                          className="flex items-center gap-3 py-3"
                          key={`${entry.role}-${entry.playerId}`}
                        >
                          <span className="grid size-9 place-items-center rounded-xl bg-cyan-300/10 text-xs font-black text-cyan-200">
                            {entry.role}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                            {player.fullName}
                          </span>
                          <span className="rounded-md bg-white/5 px-2 py-1 text-xs font-black text-slate-300">
                            {entry.roleRating}
                          </span>
                        </li>
                      );
                    })}
                  </div>
                ),
              )}
            </ol>
          </article>

          <aside className="rounded-3xl border border-cyan-300/20 bg-cyan-300/7 p-6 sm:p-8">
            <p className="eyebrow">Model contract</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              No black boxes. No copied game ratings.
            </h2>
            <dl className="mt-7 space-y-5 text-sm">
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Model version
                </dt>
                <dd className="mt-1 break-all text-slate-100">
                  {ratingDataset.source.id}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Data version
                </dt>
                <dd className="mt-1 break-all text-slate-100">
                  {ratingDataset.dataVersion}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">Inputs</dt>
                <dd className="mt-1 leading-6 text-slate-300">
                  Official squad facts, age at tournament start, team FIFA
                  ranking context, and transparent formula weights.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Match-engine contract
                </dt>
                <dd className="mt-1 leading-6 text-slate-300">
                  Team strength is a vector of attack, midfield, defense,
                  goalkeeping, depth, and set pieces. Overall is displayed for
                  review, not used as the sole match input.
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </div>
  );
}

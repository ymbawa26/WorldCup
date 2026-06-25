import { Activity, Clock3, ListTree, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { squadDataset } from "@/domain/data-ingestion/data";
import { sampleMatchSimulation } from "@/domain/simulation/data";
import { validateMatchSimulation } from "@/domain/simulation/validation";
import { tournamentSnapshot } from "@/domain/tournament/data";

export const metadata: Metadata = {
  title: "Headless match engine",
  description:
    "Inspect the deterministic event log, match clock, and derived statistics.",
};

const playersById = new Map(
  squadDataset.players.map((player) => [player.id, player]),
);
const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);
const report = validateMatchSimulation(sampleMatchSimulation);
const homeTeam = teamsById.get(sampleMatchSimulation.homeTeamId)!;
const awayTeam = teamsById.get(sampleMatchSimulation.awayTeamId)!;
const visibleEvents = sampleMatchSimulation.events
  .filter((event) =>
    [
      "KICKOFF",
      "GOAL",
      "SHOT",
      "CARD",
      "INJURY",
      "SUBSTITUTION",
      "TACTICAL_CHANGE",
      "HALF_TIME",
      "FULL_TIME",
      "MATCH_END",
    ].includes(event.type),
  )
  .slice(0, 18);

const metrics = [
  {
    icon: ListTree,
    label: "Events",
    value: sampleMatchSimulation.events.length.toLocaleString("en-US"),
  },
  {
    icon: Activity,
    label: "Shots",
    value: String(
      sampleMatchSimulation.stats.home.shots +
        sampleMatchSimulation.stats.away.shots,
    ),
  },
  {
    icon: Clock3,
    label: "Engine clock",
    value: "90",
  },
  {
    icon: ShieldCheck,
    label: "Invariant gate",
    value: report.passed ? "PASS" : "FAIL",
  },
];

export default function MatchEnginePage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
      <div className="hero-glow absolute inset-0 -z-20" />
      <div className="pitch-grid absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Phase 5 · headless engine</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              A match log first. Animation later.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              The simulation advances its own deterministic clock and emits an
              immutable event log. UI rendering can replay this log, but it
              never decides what happened.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-black tracking-wider text-emerald-200 uppercase">
            <ShieldCheck aria-hidden="true" className="size-5" />
            Engine gate {report.passed ? "passed" : "failed"}
          </div>
        </div>

        <section
          aria-label="Match engine metrics"
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

        <section className="mt-18 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Sample deterministic fixture</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {homeTeam.name} {sampleMatchSimulation.finalScore.home} ·{" "}
              {sampleMatchSimulation.finalScore.away} {awayTeam.name}
            </h2>
            <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4">
                <dt className="font-bold text-slate-500 uppercase">Seed</dt>
                <dd className="mt-1 break-all text-slate-200">
                  {sampleMatchSimulation.seed}
                </dd>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <dt className="font-bold text-slate-500 uppercase">Version</dt>
                <dd className="mt-1 break-all text-slate-200">
                  {sampleMatchSimulation.engineVersion}
                </dd>
              </div>
            </dl>
            <div className="mt-7 grid gap-3">
              {[
                [
                  "Possession",
                  sampleMatchSimulation.stats.home.possessionShare,
                  sampleMatchSimulation.stats.away.possessionShare,
                ],
                [
                  "xG",
                  sampleMatchSimulation.stats.home.xg,
                  sampleMatchSimulation.stats.away.xg,
                ],
                [
                  "Shots",
                  sampleMatchSimulation.stats.home.shots,
                  sampleMatchSimulation.stats.away.shots,
                ],
                [
                  "Cards",
                  sampleMatchSimulation.stats.home.yellowCards +
                    sampleMatchSimulation.stats.home.redCards,
                  sampleMatchSimulation.stats.away.yellowCards +
                    sampleMatchSimulation.stats.away.redCards,
                ],
              ].map(([label, homeValue, awayValue]) => (
                <div
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm"
                  key={label}
                >
                  <span className="text-right font-black text-cyan-200">
                    {String(homeValue)}
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    {label}
                  </span>
                  <span className="font-black text-amber-200">
                    {String(awayValue)}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Immutable event log</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              First notable events
            </h2>
            <ol className="mt-7 space-y-3">
              {visibleEvents.map((event) => {
                const player = event.playerId
                  ? playersById.get(event.playerId)
                  : null;
                return (
                  <li
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    key={event.id}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-200">
                        {event.minute}&apos;
                      </span>
                      <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                        {event.type.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {event.homeScore}-{event.awayScore}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-100">
                      {event.commentary}
                    </p>
                    {player ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {player.fullName}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </article>
        </section>
      </div>
    </div>
  );
}

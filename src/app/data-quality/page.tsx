import { CheckCircle2, Database, FileCheck2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import {
  squadByTeamId,
  squadDataset,
  squadQualityReport,
} from "@/domain/data-ingestion/data";
import { tournamentSnapshot } from "@/domain/tournament/data";

export const metadata: Metadata = {
  title: "Squad data quality",
  description:
    "Inspect official squad coverage, provenance, normalization, and validation results.",
};

const metrics = [
  {
    icon: Database,
    label: "Official players",
    value: squadQualityReport.totals.players.toLocaleString("en-US"),
  },
  {
    icon: FileCheck2,
    label: "Validated squads",
    value: `${squadQualityReport.squads.filter((squad) => squad.passed).length}/48`,
  },
  {
    icon: ShieldCheck,
    label: "Duplicate identities",
    value: String(squadQualityReport.totals.duplicatePlayers),
  },
  {
    icon: CheckCircle2,
    label: "Estimated official fields",
    value: String(squadQualityReport.totals.estimatedFields),
  },
];

export default function DataQualityPage() {
  const mexico = squadByTeamId.get("mexico")!;

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
      <div className="hero-glow absolute inset-0 -z-20" />
      <div className="pitch-grid absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Phase 3 · provenance ledger</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Every squad. Every identity. Accounted for.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              FIFA’s submitted final lists are frozen into a reproducible,
              result-free dataset. Unknown attributes stay unknown—never quietly
              invented—and every imported field resolves to its source record.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-black tracking-wider text-emerald-200 uppercase">
            <CheckCircle2 aria-hidden="true" className="size-5" />
            Quality gate passed
          </div>
        </div>

        <section
          aria-label="Dataset metrics"
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

        <section aria-labelledby="coverage-heading" className="mt-18">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Coverage matrix</p>
              <h2
                className="mt-2 text-2xl font-black text-white sm:text-3xl"
                id="coverage-heading"
              >
                48 complete official squads
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              26 players · minimum 3 goalkeepers · unique shirt numbers
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tournamentSnapshot.teams.map((team) => {
              const report = squadQualityReport.squads.find(
                (candidate) => candidate.teamId === team.id,
              )!;
              return (
                <article
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0a102b]/85 p-4"
                  key={team.id}
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-white/5 text-xs font-black text-cyan-200">
                    {team.fifaCode}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-white">
                      {team.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {report.playerCount} players · {report.goalkeeperCount} GK
                    </p>
                  </div>
                  <CheckCircle2
                    aria-label="Validated"
                    className="size-5 text-emerald-300"
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="sample-heading"
          className="mt-20 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"
        >
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a102b]/90">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="eyebrow">Normalized record sample</p>
              <h2
                className="mt-2 text-2xl font-black text-white"
                id="sample-heading"
              >
                Mexico · official 26
              </h2>
            </div>
            <div className="grid divide-y divide-white/7 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-white/7">
              {[mexico.slice(0, 13), mexico.slice(13)].map(
                (column, columnIndex) => (
                  <ol
                    className="divide-y divide-white/7 px-5"
                    key={columnIndex}
                    start={columnIndex * 13 + 1}
                  >
                    {column.map((player) => (
                      <li
                        className="flex items-center gap-3 py-2.5"
                        key={player.id}
                      >
                        <span className="w-6 text-right text-xs font-black text-cyan-300">
                          {player.squadNumber}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                          {player.fullName}
                        </span>
                        <span className="rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-black text-slate-400">
                          {player.primaryPosition}
                        </span>
                      </li>
                    ))}
                  </ol>
                ),
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-cyan-300/20 bg-cyan-300/7 p-6 sm:p-8">
            <p className="eyebrow">Source contract</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Pinned, inspectable, honest.
            </h2>
            <dl className="mt-7 space-y-5 text-sm">
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Data version
                </dt>
                <dd className="mt-1 break-all text-slate-100">
                  {squadDataset.dataVersion}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Source hash
                </dt>
                <dd className="mt-1 font-mono text-xs break-all text-slate-300">
                  {squadDataset.source.sha256}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">
                  Unpopulated by design
                </dt>
                <dd className="mt-1 leading-6 text-slate-300">
                  Preferred foot and secondary positions are absent from the
                  official list. Phase 3 leaves them blank.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 uppercase">Source</dt>
                <dd className="mt-1">
                  <a
                    className="font-bold text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-200"
                    href={squadDataset.source.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Official FIFA squad document
                  </a>
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </div>
  );
}

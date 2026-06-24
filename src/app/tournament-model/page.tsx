import type { Metadata } from "next";

import {
  knockoutBracket,
  teamsById,
  tournamentSnapshot,
} from "@/domain/tournament/data";

export const metadata: Metadata = {
  title: "Tournament model",
  description:
    "Inspect the verified 48-team groups, official 104-match structure, and qualification model.",
};

function flag(code: string) {
  const subdivisionFlags: Record<string, string> = {
    "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  };
  if (subdivisionFlags[code]) return subdivisionFlags[code];

  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

const roundOf32 = knockoutBracket.matches.filter(
  (match) => match.stage === "ROUND_OF_32",
);

export default function TournamentModelPage() {
  return (
    <div className="relative isolate overflow-hidden px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
      <div className="hero-glow absolute inset-0 -z-20" />
      <div className="pitch-grid absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-[1440px]">
        <p className="eyebrow">Phase 2 · verified structure</p>
        <div className="mt-3 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              The tournament, wired correctly.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              A frozen pre-opening snapshot of all 48 teams, 12 groups, 104
              fixtures, and every official path available to the eight best
              third-placed teams. Real-world results are deliberately absent.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-90 lg:justify-end">
            {[
              ["48", "teams"],
              ["72", "group fixtures"],
              ["495", "Annex C paths"],
            ].map(([value, label]) => (
              <div
                className="min-w-25 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                key={label}
              >
                <strong className="block text-xl font-black text-cyan-200">
                  {value}
                </strong>
                <span className="text-[0.65rem] font-bold tracking-wider text-slate-400 uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <section aria-labelledby="groups-heading" className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Opening stage</p>
              <h2
                className="mt-2 text-2xl font-black text-white sm:text-3xl"
                id="groups-heading"
              >
                Twelve groups. Four teams each.
              </h2>
            </div>
            <p className="hidden text-sm text-slate-400 sm:block">
              FIFA rank as of 11 Jun 2026
            </p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tournamentSnapshot.groups.map((group) => (
              <article
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a102b]/85 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                key={group.id}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-white/4 px-5 py-4">
                  <h3 className="font-black tracking-[0.16em] text-white uppercase">
                    Group {group.id}
                  </h3>
                  <span className="text-[0.65rem] font-bold tracking-wider text-cyan-300 uppercase">
                    6 matches
                  </span>
                </div>
                <ol className="divide-y divide-white/7 px-5">
                  {group.teamIds.map((teamId) => {
                    const team = teamsById.get(teamId)!;
                    return (
                      <li
                        className="flex items-center gap-3 py-3"
                        key={team.id}
                      >
                        <span aria-hidden="true" className="text-xl">
                          {flag(team.flagCode)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                          {team.name}
                        </span>
                        <span
                          aria-label={`FIFA rank ${team.fifaRanking.rank}`}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] font-bold text-slate-400"
                        >
                          #{team.fifaRanking.rank}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="bracket-heading" className="mt-20">
          <p className="eyebrow">Corrected official bracket</p>
          <h2
            className="mt-2 text-2xl font-black text-white sm:text-3xl"
            id="bracket-heading"
          >
            Round of 32 entry map
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-400">
            Slot notation follows the regulations: 1A is the Group A winner, 2A
            its runner-up, and a 3: slot lists the eligible third-place groups
            resolved by the complete Annex C matrix.
          </p>
          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {roundOf32.map((match) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                key={match.matchNumber}
              >
                <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wider uppercase">
                  <span className="text-cyan-300">
                    Match {match.matchNumber}
                  </span>
                  <span className="text-slate-500">{match.date.slice(5)}</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <strong className="rounded-lg bg-[#080d25] px-3 py-3 text-center text-sm text-white">
                    {match.homeSlot}
                  </strong>
                  <span className="text-xs font-black text-slate-500">V</span>
                  <strong className="rounded-lg bg-[#080d25] px-3 py-3 text-center text-sm text-white">
                    {match.awaySlot}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="mt-16 rounded-3xl border border-emerald-300/20 bg-emerald-300/7 p-6 sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-emerald-300 uppercase">
            Snapshot integrity
          </p>
          <p className="mt-3 max-w-4xl text-lg leading-8 font-semibold text-white">
            Version {tournamentSnapshot.dataVersion} is source-pinned and
            result-free. The rules engine proves 32 unique knockout entrants for
            every possible eight-group third-place combination.
          </p>
        </aside>
      </div>
    </div>
  );
}

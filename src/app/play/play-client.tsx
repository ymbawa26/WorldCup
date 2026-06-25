"use client";

import {
  CheckCircle2,
  Download,
  Play,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  advanceToNextUserMatch,
  createTournamentGame,
  gamePresentation,
  nextUserMatchPreview,
} from "@/domain/game/engine";
import type { TournamentGameState } from "@/domain/game/schema";
import {
  exportSave,
  importSave,
  loadGame,
  resetSave,
  saveGame,
} from "@/domain/game/storage";
import { tournamentSnapshot } from "@/domain/tournament/data";

type NextMatchPreview = NonNullable<ReturnType<typeof nextUserMatchPreview>>;
type GamePresentation = ReturnType<typeof gamePresentation>;

const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

function teamName(teamId: string | null | undefined) {
  return teamId ? (teamsById.get(teamId)?.name ?? teamId) : "—";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function scoreline(match: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
}) {
  if (!match.homeTeamId || !match.awayTeamId) return "TBD";
  if (match.homeGoals === null || match.awayGoals === null) {
    return `${teamName(match.homeTeamId)} vs ${teamName(match.awayTeamId)}`;
  }
  return `${teamName(match.homeTeamId)} ${match.homeGoals}–${match.awayGoals} ${teamName(match.awayTeamId)}`;
}

function stageLabel(stage: string) {
  return stage
    .replace("ROUND_OF_32", "Round of 32")
    .replace("ROUND_OF_16", "Round of 16")
    .replace("QUARTER_FINAL", "Quarter-finals")
    .replace("SEMI_FINAL", "Semi-finals")
    .replace("THIRD_PLACE", "Third place")
    .replace("FINAL", "Final");
}

function randomTournamentSeed() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `world-stage-${crypto.randomUUID()}`;
  }
  return `world-stage-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function PlayClient() {
  const [selectedTeamId, setSelectedTeamId] = useState("united-states");
  const [currentState, setCurrentState] = useState<TournamentGameState | null>(
    null,
  );
  const [savedState, setSavedState] = useState<TournamentGameState | null>(
    null,
  );
  const [nextMatch, setNextMatch] = useState<NextMatchPreview | null>(null);
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("Choose a nation to begin.");

  useEffect(() => {
    void loadGame().then((save) => {
      if (!save) return;
      setSavedState(save);
      setCurrentState(save);
      setSelectedTeamId(save.userTeamId);
      setNextMatch(nextUserMatchPreview(save));
      setMessage("Saved tournament found. Continue or start fresh.");
    });
  }, []);

  const userTeam = useMemo(
    () => teamsById.get(selectedTeamId),
    [selectedTeamId],
  );
  const champion = currentState?.championTeamId;
  const userKnockoutRecord = currentState?.knockoutMatches.find(
    (match) =>
      match.homeTeamId === selectedTeamId ||
      match.awayTeamId === selectedTeamId,
  );
  const latestUserMatch = [
    ...(currentState?.groupMatches ?? []),
    ...(currentState?.knockoutMatches ?? []),
  ]
    .filter(
      (match) =>
        match.homeTeamId === selectedTeamId ||
        match.awayTeamId === selectedTeamId,
    )
    .at(-1);
  const matchesPlayed =
    (currentState?.groupMatches.length ?? 0) +
    (currentState?.knockoutMatches.length ?? 0);
  const presentation = useMemo(
    () => (currentState ? gamePresentation(currentState) : null),
    [currentState],
  );

  async function persistNext(next: ReturnType<typeof advanceToNextUserMatch>) {
    setCurrentState(next.state);
    setSavedState(next.state);
    setSelectedTeamId(next.state.userTeamId);
    setNextMatch(next.nextMatch);
    await saveGame(next.state);
    setMessage(
      next.state.status === "COMPLETE"
        ? "Tournament complete. Autosave updated."
        : "Your match was played. The rest of the world caught up.",
    );
  }

  async function startTournament(teamId = selectedTeamId) {
    const created = createTournamentGame({
      seed: randomTournamentSeed(),
      userTeamId: teamId,
    });
    await persistNext(advanceToNextUserMatch(created));
  }

  async function continueSaved() {
    const state = currentState ?? savedState;
    if (!state) return;
    await persistNext(advanceToNextUserMatch(state));
  }

  async function manualSave() {
    if (!currentState) return;
    await saveGame(currentState);
    setSavedState(currentState);
    setMessage("Manual save complete.");
  }

  function exportCurrentSave() {
    const state = currentState ?? savedState;
    if (!state) return;
    setExportText(exportSave(state));
    setMessage("Export generated.");
  }

  async function importCurrentSave() {
    try {
      const state = await importSave(importText);
      setSavedState(state);
      setCurrentState(state);
      setSelectedTeamId(state.userTeamId);
      setNextMatch(nextUserMatchPreview(state));
      setMessage("Save imported. Continue when ready.");
    } catch {
      setMessage("Import rejected: invalid or unsupported save.");
    }
  }

  async function resetCurrentSave() {
    await resetSave();
    setSavedState(null);
    setCurrentState(null);
    setNextMatch(null);
    setExportText("");
    setImportText("");
    setMessage("Save reset. Start a new tournament when ready.");
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
      <div className="hero-glow absolute inset-0 -z-20" />
      <div className="pitch-grid absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">New tournament</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Choose your nation. Simulate the world.
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              Your tournament now moves at your team&apos;s pace: play your next
              match, then the rest of the world catches up in the background.
              Randomness is generated privately for every run.
            </p>

            <label className="mt-8 block">
              <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                Country
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                onChange={(event) => setSelectedTeamId(event.target.value)}
                value={selectedTeamId}
              >
                {tournamentSnapshot.teams.map((team) => (
                  <option
                    className="bg-[#0a102b]"
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => void startTournament()} size="large">
                <Play aria-hidden="true" className="size-4" />
                New tournament
              </Button>
              <Button
                disabled={!currentState && !savedState}
                onClick={() => void continueSaved()}
                size="large"
                variant="secondary"
              >
                Play next match
              </Button>
            </div>
            <p aria-live="polite" className="mt-4 text-sm text-cyan-200">
              {message}
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Tournament result</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {champion
                ? `${teamName(champion)} are champions`
                : nextMatch
                  ? `Next: ${teamName(nextMatch.homeTeamId)} vs ${teamName(
                      nextMatch.awayTeamId,
                    )}`
                  : "Awaiting kickoff"}
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                ["Your nation", userTeam?.name ?? "—"],
                ["Champion", teamName(champion)],
                ["Matches played", String(matchesPlayed)],
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-white/5 p-4" key={label}>
                  <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {nextMatch ? (
              <div className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                <p className="text-xs font-black tracking-wider text-cyan-100 uppercase">
                  Match {nextMatch.matchNumber} ·{" "}
                  {nextMatch.stage.replaceAll("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {teamName(nextMatch.homeTeamId)} vs{" "}
                  {teamName(nextMatch.awayTeamId)}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">
                      {teamName(nextMatch.homeTeamId)}
                    </p>
                    <p className="text-2xl font-black text-white">
                      {percent(nextMatch.odds.homeWin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Draw</p>
                    <p className="text-2xl font-black text-white">
                      {percent(nextMatch.odds.draw)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      {teamName(nextMatch.awayTeamId)}
                    </p>
                    <p className="text-2xl font-black text-white">
                      {percent(nextMatch.odds.awayWin)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {latestUserMatch ? (
              <div className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <div className="flex items-center gap-3 text-emerald-200">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                  <strong>
                    Match {latestUserMatch.matchNumber} autosaved ·{" "}
                    {teamName(latestUserMatch.homeTeamId)}{" "}
                    {latestUserMatch.homeGoals}–{latestUserMatch.awayGoals}{" "}
                    {teamName(latestUserMatch.awayTeamId)}
                  </strong>
                </div>
                <p className="mt-3 leading-7 text-slate-300">
                  {currentState?.status === "COMPLETE"
                    ? champion === selectedTeamId
                      ? `${teamName(selectedTeamId)} won the tournament.`
                      : userKnockoutRecord
                        ? `${teamName(
                            selectedTeamId,
                          )} were knocked out in Match ${
                            userKnockoutRecord.matchNumber
                          }.`
                        : `${teamName(
                            selectedTeamId,
                          )} did not reach the knockout rounds.`
                    : "Background fixtures were simulated up to your next match."}
                </p>
              </div>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                disabled={!currentState}
                onClick={() => void manualSave()}
              >
                <Save aria-hidden="true" className="size-4" />
                Manual save
              </Button>
              <Button
                disabled={!currentState && !savedState}
                onClick={exportCurrentSave}
                variant="secondary"
              >
                <Download aria-hidden="true" className="size-4" />
                Export
              </Button>
              <Button
                onClick={() => void resetCurrentSave()}
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Reset
              </Button>
            </div>
          </section>
        </div>

        {presentation ? (
          <TournamentProgress
            presentation={presentation}
            selectedTeamId={selectedTeamId}
          />
        ) : null}

        <details className="mt-8 rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6">
          <summary className="cursor-pointer text-xl font-black text-white">
            Save transfer
          </summary>
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article>
              <h2 className="text-xl font-black text-white">Exported save</h2>
              <textarea
                className="mt-4 min-h-52 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-200"
                readOnly
                value={exportText}
              />
            </article>
            <article>
              <h2 className="text-xl font-black text-white">Import save</h2>
              <textarea
                className="mt-4 min-h-52 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-200"
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste exported save JSON here"
                value={importText}
              />
              <Button className="mt-4" onClick={() => void importCurrentSave()}>
                <Upload aria-hidden="true" className="size-4" />
                Import
              </Button>
            </article>
          </section>
        </details>
      </div>
    </div>
  );
}

function TournamentProgress({
  presentation,
  selectedTeamId,
}: {
  presentation: GamePresentation;
  selectedTeamId: string;
}) {
  return (
    <section className="mt-8 space-y-8">
      <div>
        <p className="eyebrow">Group stage</p>
        <h2 className="mt-2 text-3xl font-black text-white">
          Updated tables and results
        </h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {tournamentSnapshot.groups.map((group) => (
          <article
            className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-5"
            key={group.id}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black text-white">
                Group {group.id}
              </h3>
              <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                {presentation.groupResults[group.id].length}/6 played
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3">Team</th>
                    <th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">GD</th>
                    <th className="px-2 py-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {presentation.standingsByGroup[group.id].map((standing) => (
                    <tr
                      className={
                        standing.teamId === selectedTeamId
                          ? "bg-cyan-300/10 text-cyan-100"
                          : "border-t border-white/5 text-slate-200"
                      }
                      key={standing.teamId}
                    >
                      <td className="py-2 pr-3 font-bold">
                        {teamName(standing.teamId)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {standing.played}
                      </td>
                      <td className="px-2 py-2 text-center">{standing.wins}</td>
                      <td className="px-2 py-2 text-center">
                        {standing.draws}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {standing.losses}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {standing.goalDifference}
                      </td>
                      <td className="px-2 py-2 text-center font-black text-white">
                        {standing.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-2">
              {presentation.groupResults[group.id].length > 0 ? (
                presentation.groupResults[group.id].map((match) => (
                  <p
                    className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-200"
                    key={match.matchNumber}
                  >
                    <span className="text-slate-500">
                      Match {match.matchNumber}
                    </span>{" "}
                    {scoreline(match)}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-500">
                  No matches played yet.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {presentation.showBracket ? (
        <section>
          <p className="eyebrow">Knockout stage</p>
          <h2 className="mt-2 text-3xl font-black text-white">
            Bracket and results
          </h2>
          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            {[
              "ROUND_OF_32",
              "ROUND_OF_16",
              "QUARTER_FINAL",
              "SEMI_FINAL",
              "THIRD_PLACE",
              "FINAL",
            ].map((stage) => (
              <article
                className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-5"
                key={stage}
              >
                <h3 className="text-lg font-black text-white">
                  {stageLabel(stage)}
                </h3>
                <div className="mt-4 space-y-2">
                  {(presentation.knockoutRounds[stage] ?? []).map((match) => (
                    <div
                      className={
                        match.homeTeamId === selectedTeamId ||
                        match.awayTeamId === selectedTeamId
                          ? "rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3"
                          : "rounded-2xl bg-white/5 p-3"
                      }
                      key={match.matchNumber}
                    >
                      <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                        Match {match.matchNumber}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-100">
                        {scoreline(match)}
                      </p>
                      {match.winnerTeamId ? (
                        <p className="mt-1 text-xs text-emerald-200">
                          Winner: {teamName(match.winnerTeamId)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

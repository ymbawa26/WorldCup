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
import { accelerateTournament } from "@/domain/game/engine";
import type { TournamentGameState } from "@/domain/game/schema";
import {
  exportSave,
  importSave,
  loadGame,
  resetSave,
  saveGame,
} from "@/domain/game/storage";
import { tournamentSnapshot } from "@/domain/tournament/data";

const defaultSeed = "world-stage-user-run";

type TournamentResult = ReturnType<typeof accelerateTournament>;

const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);

function teamName(teamId: string | null | undefined) {
  return teamId ? (teamsById.get(teamId)?.name ?? teamId) : "—";
}

export function PlayClient() {
  const [selectedTeamId, setSelectedTeamId] = useState("united-states");
  const [seed, setSeed] = useState(defaultSeed);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [savedState, setSavedState] = useState<TournamentGameState | null>(
    null,
  );
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("Choose a nation to begin.");

  useEffect(() => {
    void loadGame().then((save) => {
      if (!save) return;
      setSavedState(save);
      setSelectedTeamId(save.userTeamId);
      setSeed(save.seed);
      setMessage("Saved tournament found. Continue or start fresh.");
    });
  }, []);

  const userTeam = useMemo(
    () => teamsById.get(selectedTeamId),
    [selectedTeamId],
  );
  const champion = result?.state.championTeamId;
  const userKnockoutRecord = result?.state.knockoutMatches.find(
    (match) =>
      match.homeTeamId === selectedTeamId ||
      match.awayTeamId === selectedTeamId,
  );

  async function runTournament(teamId = selectedTeamId, activeSeed = seed) {
    const next = accelerateTournament(activeSeed, teamId);
    setResult(next);
    setSavedState(next.state);
    await saveGame(next.state);
    setMessage("Tournament complete. Autosave updated.");
  }

  async function continueSaved() {
    if (!savedState) return;
    await runTournament(savedState.userTeamId, savedState.seed);
  }

  async function manualSave() {
    if (!result) return;
    await saveGame(result.state);
    setSavedState(result.state);
    setMessage("Manual save complete.");
  }

  function exportCurrentSave() {
    const state = result?.state ?? savedState;
    if (!state) return;
    setExportText(exportSave(state));
    setMessage("Export generated.");
  }

  async function importCurrentSave() {
    try {
      const state = await importSave(importText);
      setSavedState(state);
      setSelectedTeamId(state.userTeamId);
      setSeed(state.seed);
      setResult(null);
      setMessage("Save imported. Continue to simulate it.");
    } catch {
      setMessage("Import rejected: invalid or unsupported save.");
    }
  }

  async function resetCurrentSave() {
    await resetSave();
    setSavedState(null);
    setResult(null);
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
              This accelerated flow plays the full tournament using the headless
              engine. Deeper tactics and match-center controls come next; this
              phase proves the core game loop and saves.
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

            <label className="mt-5 block">
              <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                Seed
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                onChange={(event) => setSeed(event.target.value)}
                value={seed}
              />
            </label>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => void runTournament()} size="large">
                <Play aria-hidden="true" className="size-4" />
                New tournament
              </Button>
              <Button
                disabled={!savedState}
                onClick={() => void continueSaved()}
                size="large"
                variant="secondary"
              >
                Continue
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
                : "Awaiting kickoff"}
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                ["Your nation", userTeam?.name ?? "—"],
                ["Champion", teamName(champion)],
                ["Matches played", result ? "104" : "0"],
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-white/5 p-4" key={label}>
                  <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            {result ? (
              <div className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <div className="flex items-center gap-3 text-emerald-200">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                  <strong>Tournament completed and autosaved</strong>
                </div>
                <p className="mt-3 leading-7 text-slate-300">
                  {teamName(selectedTeamId)}{" "}
                  {champion === selectedTeamId
                    ? "won the tournament."
                    : userKnockoutRecord
                      ? `were knocked out in Match ${userKnockoutRecord.matchNumber}.`
                      : "did not reach the knockout rounds."}
                </p>
              </div>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Button disabled={!result} onClick={() => void manualSave()}>
                <Save aria-hidden="true" className="size-4" />
                Manual save
              </Button>
              <Button
                disabled={!result && !savedState}
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

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6">
            <h2 className="text-xl font-black text-white">Exported save</h2>
            <textarea
              className="mt-4 min-h-52 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-200"
              readOnly
              value={exportText}
            />
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6">
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
      </div>
    </div>
  );
}

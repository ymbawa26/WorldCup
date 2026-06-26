"use client";

import {
  CheckCircle2,
  Download,
  Play,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { squadByTeamId } from "@/domain/data-ingestion/data";
import {
  activeTeamRatingFromSetup,
  defaultPrematchTeamSetup,
  listFormations,
  setupWithFormation,
  validatePrematchTeamSetup,
} from "@/domain/formations/service";
import type {
  FormationId,
  ParsedPrematchTeamSetup,
} from "@/domain/formations/schema";
import {
  advanceToNextUserMatch,
  createTournamentGame,
  gamePresentation,
  nextUserMatchPreview,
} from "@/domain/game/engine";
import type { TournamentGameState } from "@/domain/game/schema";
import type { MatchRecord } from "@/domain/game/schema";
import {
  exportSave,
  importSave,
  loadGame,
  resetSave,
  saveGame,
} from "@/domain/game/storage";
import { prematchProbabilityFromRatings } from "@/domain/probability/model";
import { tournamentSnapshot } from "@/domain/tournament/data";

type NextMatchPreview = NonNullable<ReturnType<typeof nextUserMatchPreview>>;
type GamePresentation = ReturnType<typeof gamePresentation>;
type AdvanceResult = ReturnType<typeof advanceToNextUserMatch>;
type LiveMatchState = {
  baseState: TournamentGameState;
  pending: AdvanceResult;
  preview: NextMatchPreview;
  result: MatchRecord | null;
  minute: number;
  speed: 0.5 | 1 | 2;
  status: "RUNNING" | "PAUSED" | "FULLTIME";
  startedAtMs: number;
  elapsedBeforePauseMs: number;
};

const teamsById = new Map(
  tournamentSnapshot.teams.map((team) => [team.id, team]),
);
const playersById = new Map(
  [...squadByTeamId.values()].flat().map((player) => [player.id, player]),
);
const formations = listFormations();

function teamName(teamId: string | null | undefined) {
  return teamId ? (teamsById.get(teamId)?.name ?? teamId) : "—";
}

function teamFlag(teamId: string | null | undefined) {
  const flagCode = teamId ? teamsById.get(teamId)?.flagCode : null;
  if (!flagCode || flagCode.length !== 2) return "";
  return flagCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function teamLabel(teamId: string | null | undefined) {
  const flag = teamFlag(teamId);
  return `${flag ? `${flag} ` : ""}${teamName(teamId)}`;
}

function playerName(playerId: string | null | undefined) {
  return playerId ? (playersById.get(playerId)?.displayName ?? playerId) : "—";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function adjustedOddsForNextMatch(
  nextMatch: NextMatchPreview | null,
  setup: ParsedPrematchTeamSetup,
) {
  if (
    !nextMatch ||
    (nextMatch.homeTeamId !== setup.teamId &&
      nextMatch.awayTeamId !== setup.teamId)
  ) {
    return nextMatch?.odds ?? null;
  }
  const opponentTeamId =
    nextMatch.homeTeamId === setup.teamId
      ? nextMatch.awayTeamId
      : nextMatch.homeTeamId;
  const opponentSetup = defaultPrematchTeamSetup(opponentTeamId, "4-3-3");
  const userRating = activeTeamRatingFromSetup(
    setup,
    opponentSetup.formationId,
  );
  const opponentRating = activeTeamRatingFromSetup(
    opponentSetup,
    setup.formationId,
  );
  return nextMatch.homeTeamId === setup.teamId
    ? prematchProbabilityFromRatings(userRating, opponentRating).outcomes
    : prematchProbabilityFromRatings(opponentRating, userRating).outcomes;
}

function setupForTeamWithSamePlan(
  teamId: string,
  setup: ParsedPrematchTeamSetup,
) {
  return {
    ...defaultPrematchTeamSetup(teamId, setup.formationId),
    tactics: setup.tactics,
  };
}

function findNewUserMatch(
  before: TournamentGameState,
  after: TournamentGameState,
) {
  const beforeKeys = new Set(
    [...before.groupMatches, ...before.knockoutMatches].map(
      (match) => `${match.stage}:${match.matchNumber}`,
    ),
  );
  return [...after.groupMatches, ...after.knockoutMatches].find(
    (match) =>
      !beforeKeys.has(`${match.stage}:${match.matchNumber}`) &&
      (match.homeTeamId === after.userTeamId ||
        match.awayTeamId === after.userTeamId),
  );
}

function liveEventsForMinute(
  result: MatchRecord | null,
  minute: number,
  preview: NextMatchPreview,
) {
  const events = [
    {
      minute: 0,
      text: `${teamName(preview.homeTeamId)} vs ${teamName(preview.awayTeamId)} kicks off.`,
    },
    {
      minute: 15,
      text: "Both teams are settling into the tactical battle.",
    },
    {
      minute: 30,
      text: "The manager's setup is shaping the rhythm of the match.",
    },
    {
      minute: 45,
      text: "Half-time. The second half starts automatically in this preview build.",
    },
    {
      minute: 60,
      text: "The game opens up as legs get heavier.",
    },
    {
      minute: 75,
      text: "Final adjustments and late pressure now matter.",
    },
  ];
  if (result) {
    events.push({
      minute: 90,
      text: `Full-time: ${teamName(result.homeTeamId)} ${result.homeGoals}–${result.awayGoals} ${teamName(result.awayTeamId)}.`,
    });
  }
  return events
    .filter((event) => event.minute <= minute)
    .slice(-5)
    .reverse();
}

function scoreline(match: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
}) {
  if (!match.homeTeamId || !match.awayTeamId) return "TBD";
  if (match.homeGoals === null || match.awayGoals === null) {
    return `${teamLabel(match.homeTeamId)} vs ${teamLabel(match.awayTeamId)}`;
  }
  return `${teamLabel(match.homeTeamId)} ${match.homeGoals}–${match.awayGoals} ${teamLabel(match.awayTeamId)}`;
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

function userResultLabel(
  match: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeGoals: number | null;
    awayGoals: number | null;
    winnerTeamId?: string | null;
    loserTeamId?: string | null;
  },
  selectedTeamId: string,
) {
  const involvesUser =
    match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId;
  if (!involvesUser) return null;
  if (match.homeGoals === null || match.awayGoals === null) return "Your match";
  if (match.winnerTeamId === selectedTeamId) return "You won";
  if (match.loserTeamId === selectedTeamId) return "You lost";
  if (match.homeGoals === match.awayGoals) return "You drew";
  if (match.homeTeamId === selectedTeamId) {
    return match.homeGoals > match.awayGoals ? "You won" : "You lost";
  }
  if (match.awayTeamId === selectedTeamId) {
    return match.awayGoals > match.homeGoals ? "You won" : "You lost";
  }
  return "Your result";
}

function userResultClass(label: string) {
  if (label === "You won") return "bg-emerald-300/15 text-emerald-100";
  if (label === "You lost") return "bg-rose-300/15 text-rose-100";
  if (label === "You drew") return "bg-amber-300/15 text-amber-100";
  return "bg-cyan-300/15 text-cyan-100";
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
  const userSelectedTeamRef = useRef(false);
  const [currentState, setCurrentState] = useState<TournamentGameState | null>(
    null,
  );
  const [savedState, setSavedState] = useState<TournamentGameState | null>(
    null,
  );
  const [nextMatch, setNextMatch] = useState<NextMatchPreview | null>(null);
  const [prematchSetup, setPrematchSetup] = useState<ParsedPrematchTeamSetup>(
    () => defaultPrematchTeamSetup("united-states"),
  );
  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("Choose a nation to begin.");

  useEffect(() => {
    void loadGame().then((save) => {
      if (!save) return;
      setSavedState(save);
      setCurrentState(save);
      if (!userSelectedTeamRef.current) {
        setSelectedTeamId(save.userTeamId);
        setPrematchSetup(defaultPrematchTeamSetup(save.userTeamId));
      }
      setNextMatch(nextUserMatchPreview(save));
      setMessage("Saved tournament found. Continue or start fresh.");
    });
  }, []);

  useEffect(() => {
    if (!liveMatch || liveMatch.status !== "RUNNING") return;
    const timer = window.setInterval(() => {
      setLiveMatch((match) => {
        if (!match || match.status !== "RUNNING") return match;
        const elapsedMs =
          match.elapsedBeforePauseMs + (Date.now() - match.startedAtMs);
        const minute = Math.min(90, (elapsedMs / 1000) * match.speed);
        return {
          ...match,
          minute,
          status: minute >= 90 ? "FULLTIME" : "RUNNING",
        };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [liveMatch]);

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
  const adjustedOdds = useMemo(
    () => adjustedOddsForNextMatch(nextMatch, prematchSetup),
    [nextMatch, prematchSetup],
  );
  const setupValidation = useMemo(
    () => validatePrematchTeamSetup(prematchSetup),
    [prematchSetup],
  );

  const persistNext = useCallback(async (next: AdvanceResult) => {
    setCurrentState(next.state);
    setSavedState(next.state);
    setSelectedTeamId(next.state.userTeamId);
    setNextMatch(next.nextMatch);
    setPrematchSetup((setup) =>
      setupForTeamWithSamePlan(next.state.userTeamId, setup),
    );
    await saveGame(next.state);
    setMessage(
      next.state.status === "COMPLETE"
        ? "Tournament complete. Autosave updated."
        : "Your match was played. The rest of the world caught up.",
    );
  }, []);

  const finishLiveMatchNow = useCallback(async () => {
    const match = liveMatch;
    if (!match) return;
    setLiveMatch(null);
    await persistNext(match.pending);
  }, [liveMatch, persistNext]);

  useEffect(() => {
    if (liveMatch?.status !== "FULLTIME") return;
    const timer = window.setTimeout(() => {
      void finishLiveMatchNow();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [finishLiveMatchNow, liveMatch?.status]);

  async function startTournament(teamId = selectedTeamId) {
    const created = createTournamentGame({
      seed: randomTournamentSeed(),
      userTeamId: teamId,
    });
    startLiveMatch(created, prematchSetup);
  }

  async function continueSaved() {
    const state = currentState ?? savedState;
    if (!state) return;
    startLiveMatch(state, prematchSetup);
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
      setPrematchSetup(defaultPrematchTeamSetup(state.userTeamId));
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
    setPrematchSetup(defaultPrematchTeamSetup(selectedTeamId));
    setExportText("");
    setImportText("");
    setMessage("Save reset. Start a new tournament when ready.");
  }

  function selectTeam(teamId: string) {
    userSelectedTeamRef.current = true;
    setSelectedTeamId(teamId);
    setPrematchSetup(defaultPrematchTeamSetup(teamId));
  }

  function startLiveMatch(
    baseState: TournamentGameState,
    setup: ParsedPrematchTeamSetup,
  ) {
    const matchPreview = nextUserMatchPreview(baseState);
    if (!matchPreview) {
      void persistNext(advanceToNextUserMatch(baseState, setup));
      return;
    }
    const pending = advanceToNextUserMatch(baseState, setup);
    const result = findNewUserMatch(baseState, pending.state) ?? null;
    setLiveMatch({
      baseState,
      pending,
      preview: matchPreview,
      result,
      minute: 0,
      speed: 1,
      status: "RUNNING",
      startedAtMs: Date.now(),
      elapsedBeforePauseMs: 0,
    });
    setMessage("Live match started. The tournament will update at full-time.");
  }

  function pauseLiveMatch() {
    setLiveMatch((match) => {
      if (!match || match.status !== "RUNNING") return match;
      return {
        ...match,
        status: "PAUSED",
        elapsedBeforePauseMs:
          match.elapsedBeforePauseMs + (Date.now() - match.startedAtMs),
      };
    });
  }

  function resumeLiveMatch() {
    setLiveMatch((match) =>
      match && match.status === "PAUSED"
        ? { ...match, status: "RUNNING", startedAtMs: Date.now() }
        : match,
    );
  }

  function setLiveSpeed(speed: LiveMatchState["speed"]) {
    setLiveMatch((match) => {
      if (!match) return match;
      const elapsedBeforePauseMs =
        match.status === "RUNNING"
          ? match.elapsedBeforePauseMs + (Date.now() - match.startedAtMs)
          : match.elapsedBeforePauseMs;
      return {
        ...match,
        speed,
        startedAtMs: Date.now(),
        elapsedBeforePauseMs,
      };
    });
  }

  function updateFormation(formationId: FormationId) {
    setPrematchSetup((setup) => setupWithFormation(setup, formationId));
  }

  function updateTactic<K extends keyof ParsedPrematchTeamSetup["tactics"]>(
    key: K,
    value: ParsedPrematchTeamSetup["tactics"][K],
  ) {
    setPrematchSetup((setup) => ({
      ...setup,
      tactics: {
        ...setup.tactics,
        [key]: value,
      },
    }));
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
                onChange={(event) => selectTeam(event.target.value)}
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

            <PrematchSetupPanel
              onFormationChange={updateFormation}
              onTacticChange={updateTactic}
              setup={prematchSetup}
              validation={setupValidation}
            />

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                disabled={!setupValidation.passed || Boolean(liveMatch)}
                onClick={() => void startTournament()}
                size="large"
              >
                <Play aria-hidden="true" className="size-4" />
                New tournament
              </Button>
              <Button
                disabled={
                  (!currentState && !savedState) ||
                  !setupValidation.passed ||
                  Boolean(liveMatch)
                }
                onClick={() => void continueSaved()}
                size="large"
                variant="secondary"
              >
                Start live match
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
                      {percent(adjustedOdds?.homeWin ?? nextMatch.odds.homeWin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Draw</p>
                    <p className="text-2xl font-black text-white">
                      {percent(adjustedOdds?.draw ?? nextMatch.odds.draw)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      {teamName(nextMatch.awayTeamId)}
                    </p>
                    <p className="text-2xl font-black text-white">
                      {percent(adjustedOdds?.awayWin ?? nextMatch.odds.awayWin)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-cyan-100/80">
                  Odds include your current formation and tactical setup.
                </p>
              </div>
            ) : null}

            {liveMatch ? (
              <LiveMatchPanel
                liveMatch={liveMatch}
                onFinish={() => void finishLiveMatchNow()}
                onPause={pauseLiveMatch}
                onResume={resumeLiveMatch}
                onSpeedChange={setLiveSpeed}
              />
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

function PrematchSetupPanel({
  onFormationChange,
  onTacticChange,
  setup,
  validation,
}: {
  onFormationChange: (formationId: FormationId) => void;
  onTacticChange: <K extends keyof ParsedPrematchTeamSetup["tactics"]>(
    key: K,
    value: ParsedPrematchTeamSetup["tactics"][K],
  ) => void;
  setup: ParsedPrematchTeamSetup;
  validation: ReturnType<typeof validatePrematchTeamSetup>;
}) {
  const formation = formations.find(
    (candidate) => candidate.id === setup.formationId,
  );
  const starters = setup.starterIds ?? [];
  const setPieces = setup.setPieces;

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <p className="eyebrow">Prematch setup</p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Formation and tactics
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          These choices affect your next match odds and simulation. The engine
          keeps the formulas in the background.
        </p>
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
          Formation
        </span>
        <select
          className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a102b] px-4 py-3 text-white"
          onChange={(event) =>
            onFormationChange(event.target.value as FormationId)
          }
          value={setup.formationId}
        >
          {formations.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {option.description}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <TacticSelect
          label="Mentality"
          onChange={(value) =>
            onTacticChange(
              "mentality",
              value as ParsedPrematchTeamSetup["tactics"]["mentality"],
            )
          }
          options={["DEFENSIVE", "BALANCED", "ATTACKING"]}
          value={setup.tactics.mentality}
        />
        <TacticSelect
          label="Pressing"
          onChange={(value) =>
            onTacticChange(
              "pressing",
              value as ParsedPrematchTeamSetup["tactics"]["pressing"],
            )
          }
          options={["LOW", "MEDIUM", "HIGH"]}
          value={setup.tactics.pressing}
        />
        <TacticSelect
          label="Defensive line"
          onChange={(value) =>
            onTacticChange(
              "defensiveLine",
              value as ParsedPrematchTeamSetup["tactics"]["defensiveLine"],
            )
          }
          options={["DEEP", "STANDARD", "HIGH"]}
          value={setup.tactics.defensiveLine}
        />
        <TacticSelect
          label="Tempo"
          onChange={(value) =>
            onTacticChange(
              "tempo",
              value as ParsedPrematchTeamSetup["tactics"]["tempo"],
            )
          }
          options={["SLOW", "BALANCED", "FAST"]}
          value={setup.tactics.tempo}
        />
        <TacticSelect
          label="Width"
          onChange={(value) =>
            onTacticChange(
              "width",
              value as ParsedPrematchTeamSetup["tactics"]["width"],
            )
          }
          options={["NARROW", "BALANCED", "WIDE"]}
          value={setup.tactics.width}
        />
      </div>

      {formation ? (
        <div className="mt-5 rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
            Auto-selected XI
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {formation.slots.map((slot, index) => (
              <p className="text-sm text-slate-200" key={slot.id}>
                <span className="mr-2 rounded-full bg-cyan-300/10 px-2 py-1 text-[0.65rem] font-black text-cyan-100">
                  {slot.label}
                </span>
                {playerName(starters[index])}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {setPieces ? (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Captain", setPieces.captainId],
            ["Penalty taker", setPieces.penaltyTakerId],
            ["Free kicks", setPieces.freeKickTakerId],
            ["Corners", setPieces.cornerTakerId],
          ].map(([label, playerId]) => (
            <div className="rounded-2xl bg-white/5 p-3" key={label}>
              <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                {label}
              </p>
              <p className="mt-1 font-bold text-slate-100">
                {playerName(playerId)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!validation.passed || validation.warnings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {validation.issues.map((issue) => (
            <p
              className="rounded-2xl bg-rose-300/10 px-3 py-2 text-sm text-rose-100"
              key={issue}
            >
              {issue}
            </p>
          ))}
          {validation.warnings.slice(0, 3).map((warning) => (
            <p
              className="rounded-2xl bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LiveMatchPanel({
  liveMatch,
  onFinish,
  onPause,
  onResume,
  onSpeedChange,
}: {
  liveMatch: LiveMatchState;
  onFinish: () => void;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: LiveMatchState["speed"]) => void;
}) {
  const visibleMinute = Math.floor(liveMatch.minute);
  const events = liveEventsForMinute(
    liveMatch.result,
    visibleMinute,
    liveMatch.preview,
  );
  const progress = Math.min(100, (liveMatch.minute / 90) * 100);

  return (
    <section className="mt-7 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Live match simulation</p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {teamLabel(liveMatch.preview.homeTeamId)} vs{" "}
            {teamLabel(liveMatch.preview.awayTeamId)}
          </h3>
          <p className="mt-1 text-sm text-emerald-100/80">
            90 match minutes run in 90 real seconds at 1x.
          </p>
        </div>
        <div className="rounded-2xl bg-black/20 px-4 py-3 text-right">
          <p className="text-xs font-black tracking-wider text-emerald-100/70 uppercase">
            Minute
          </p>
          <p className="text-4xl font-black text-white">
            {Math.min(90, visibleMinute)}
            <span className="text-xl">′</span>
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-300 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">
            {teamName(liveMatch.preview.homeTeamId)}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {liveMatch.status === "FULLTIME" && liveMatch.result
              ? liveMatch.result.homeGoals
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">State</p>
          <p className="mt-2 text-lg font-black text-white">
            {liveMatch.status.toLowerCase()}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">
            {teamName(liveMatch.preview.awayTeamId)}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {liveMatch.status === "FULLTIME" && liveMatch.result
              ? liveMatch.result.awayGoals
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {liveMatch.status === "PAUSED" ? (
          <Button onClick={onResume} variant="secondary">
            Resume
          </Button>
        ) : (
          <Button
            disabled={liveMatch.status !== "RUNNING"}
            onClick={onPause}
            variant="secondary"
          >
            Pause
          </Button>
        )}
        {[0.5, 1, 2].map((speed) => (
          <Button
            key={speed}
            onClick={() => onSpeedChange(speed as LiveMatchState["speed"])}
            variant={liveMatch.speed === speed ? "primary" : "secondary"}
          >
            {speed}x
          </Button>
        ))}
        <Button onClick={onFinish} variant="secondary">
          Finish match now
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {events.map((event) => (
          <p
            className="rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-100"
            key={`${event.minute}:${event.text}`}
          >
            <span className="mr-2 font-black text-emerald-200">
              {event.minute}′
            </span>
            {event.text}
          </p>
        ))}
      </div>
    </section>
  );
}

function TacticSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
        {label}
      </span>
      <select
        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a102b] px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.toLowerCase().replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
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
      {presentation.showBracket ? (
        <KnockoutBracket
          presentation={presentation}
          selectedTeamId={selectedTeamId}
        />
      ) : null}

      <GroupStageTables
        isArchive={presentation.showBracket}
        presentation={presentation}
        selectedTeamId={selectedTeamId}
      />
    </section>
  );
}

function GroupStageTables({
  isArchive,
  presentation,
  selectedTeamId,
}: {
  isArchive: boolean;
  presentation: GamePresentation;
  selectedTeamId: string;
}) {
  return (
    <section className={isArchive ? "opacity-80" : undefined}>
      <div>
        <p className="eyebrow">
          {isArchive ? "Group stage archive" : "Group stage"}
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">
          {isArchive ? "Final group tables" : "Updated tables and results"}
        </h2>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3">Team</th>
                    <th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">GF</th>
                    <th className="px-2 py-2 text-center">GA</th>
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
                        <span className="mr-2" aria-hidden="true">
                          {teamFlag(standing.teamId)}
                        </span>
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
                        {standing.goalsFor}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {standing.goalsAgainst}
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
                presentation.groupResults[group.id].map((match) => {
                  const resultLabel = userResultLabel(match, selectedTeamId);
                  return (
                    <div
                      className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-200"
                      key={match.matchNumber}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p>
                          <span className="text-slate-500">
                            Match {match.matchNumber}
                          </span>{" "}
                          {scoreline(match)}
                        </p>
                        {resultLabel ? (
                          <span
                            className={`rounded-full px-2 py-1 text-[0.65rem] font-black tracking-wider uppercase ${userResultClass(resultLabel)}`}
                          >
                            {resultLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-500">
                  No matches played yet.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function KnockoutBracket({
  presentation,
  selectedTeamId,
}: {
  presentation: GamePresentation;
  selectedTeamId: string;
}) {
  const stages = [
    "ROUND_OF_32",
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "THIRD_PLACE",
    "FINAL",
  ];

  return (
    <section>
      <p className="eyebrow">Knockout stage</p>
      <h2 className="mt-2 text-3xl font-black text-white">
        Tournament bracket
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Groups are now decided, so the bracket takes priority. Scroll sideways
        to follow each round from the Round of 32 through the Final.
      </p>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-[#080d23]/80 p-4">
        <div className="grid min-w-[1320px] grid-cols-6 items-start gap-4">
          {stages.map((stage) => (
            <div className="relative" key={stage}>
              <div className="sticky top-0 z-10 rounded-2xl border border-white/10 bg-[#11183a] px-4 py-3">
                <h3 className="text-sm font-black tracking-wider text-white uppercase">
                  {stageLabel(stage)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {(presentation.knockoutRounds[stage] ?? []).length} matches
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {(presentation.knockoutRounds[stage] ?? []).map((match) => {
                  const resultLabel = userResultLabel(match, selectedTeamId);
                  const involvesUser = Boolean(resultLabel);
                  return (
                    <div
                      className={
                        involvesUser
                          ? "relative rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 shadow-[0_0_28px_rgba(103,232,249,0.12)]"
                          : "relative rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                      }
                      key={match.matchNumber}
                    >
                      <div className="absolute top-1/2 -right-4 hidden h-px w-4 bg-white/15 xl:block" />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black tracking-wider text-slate-500 uppercase">
                          Match {match.matchNumber}
                        </p>
                        {resultLabel ? (
                          <span
                            className={`rounded-full px-2 py-1 text-[0.65rem] font-black tracking-wider uppercase ${userResultClass(resultLabel)}`}
                          >
                            {resultLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 font-bold text-slate-100">
                        {scoreline(match)}
                      </p>
                      {match.winnerTeamId ? (
                        <p className="mt-2 text-xs text-emerald-200">
                          Winner: {teamLabel(match.winnerTeamId)}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          Awaiting result
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

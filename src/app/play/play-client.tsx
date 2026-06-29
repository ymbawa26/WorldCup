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
import { NamedRandomStreams } from "@/domain/simulation/random";
import { knockoutBracket, tournamentSnapshot } from "@/domain/tournament/data";

type NextMatchPreview = NonNullable<ReturnType<typeof nextUserMatchPreview>>;
type GamePresentation = ReturnType<typeof gamePresentation>;
type AdvanceResult = ReturnType<typeof advanceToNextUserMatch>;
type LiveMatchState = {
  baseState: TournamentGameState;
  pending: AdvanceResult;
  preview: NextMatchPreview;
  result: MatchRecord | null;
  setup: ParsedPrematchTeamSetup;
  minute: number;
  maxMinute: 90 | 120;
  speed: 0.5 | 1 | 2;
  status: "RUNNING" | "PAUSED" | "BREAK" | "FULLTIME";
  breakType: "HYDRATION" | "HALFTIME" | null;
  breakEndsAtMs: number | null;
  handledHydration: boolean;
  handledHalftime: boolean;
  hydrationChoiceMade: boolean;
  halftimeLevelChosen: boolean;
  halftimeStrategyChosen: boolean;
  hydrationLevel: 1 | 2 | 3 | 4 | 5;
  halftimeLevel: 1 | 2 | 3 | 4 | 5;
  halftimeStrategy:
    | "BALANCED"
    | "COUNTER_ATTACK"
    | "HIGH_PRESS"
    | "LONG_BALL"
    | "POSSESSION";
  startedAtMs: number;
  elapsedBeforePauseMs: number;
};
type LiveTimelineEvent = {
  minute: number;
  type:
    | "KICKOFF"
    | "TACTICAL"
    | "GOAL"
    | "MISSED_SHOT"
    | "CORNER"
    | "FOUL"
    | "PENALTY"
    | "YELLOW_CARD"
    | "RED_CARD"
    | "HYDRATION_BREAK"
    | "HALF_TIME"
    | "EXTRA_TIME_START"
    | "FULL_TIME";
  side: "HOME" | "AWAY" | null;
  text: string;
  homeScore: number;
  awayScore: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function defensiveRedCardMultiplier(setup: ParsedPrematchTeamSetup) {
  const formation = formations.find((item) => item.id === setup.formationId);
  const isDefensiveShape = formation?.family === "defensive";
  const isDefensivePlan =
    setup.tactics.mentality === "DEFENSIVE" ||
    setup.tactics.defensiveLine === "DEEP" ||
    setup.tactics.pressing === "LOW";
  return isDefensiveShape || isDefensivePlan ? 1.15 : 1;
}

function eventMinute(
  random: NamedRandomStreams,
  stream: string,
  index: number,
  total: number,
) {
  const windowStart = 8 + Math.floor((index / Math.max(total, 1)) * 70);
  return Math.min(
    88,
    windowStart + Math.floor(random.next(`${stream}:${index}`) * 13),
  );
}

function attackLevelModifier(level: LiveMatchState["hydrationLevel"]) {
  return ({ 1: 0.8, 2: 0.9, 3: 1, 4: 1.1, 5: 1.2 } as const)[level];
}

function strategyModifier(strategy: LiveMatchState["halftimeStrategy"]) {
  return (
    {
      BALANCED: {
        goals: 1,
        against: 1,
        corners: 1,
        shots: 1,
        fouls: 1,
        label: "balanced structure",
      },
      COUNTER_ATTACK: {
        goals: 1.12,
        against: 1.08,
        corners: 0.92,
        shots: 0.95,
        fouls: 1.04,
        label: "counter attacks",
      },
      HIGH_PRESS: {
        goals: 1.1,
        against: 1.12,
        corners: 1.12,
        shots: 1.08,
        fouls: 1.15,
        label: "high pressing",
      },
      LONG_BALL: {
        goals: 1.08,
        against: 1.06,
        corners: 1.15,
        shots: 1.03,
        fouls: 1.06,
        label: "long balls",
      },
      POSSESSION: {
        goals: 1.06,
        against: 0.9,
        corners: 1.05,
        shots: 0.96,
        fouls: 0.92,
        label: "possession control",
      },
    } as const
  )[strategy];
}

function tacticalInfluenceText(level: LiveMatchState["hydrationLevel"]) {
  if (level === 1) return "Protect the box and slow the tempo.";
  if (level === 2) return "Stay compact but keep an outlet forward.";
  if (level === 4) return "Push higher and hunt the next chance.";
  if (level === 5) return "Commit numbers forward and accept the risk.";
  return "Keep the shape balanced.";
}

function baseHomePossession({
  awayTeamId,
  halftimeStrategy,
  homeTeamId,
  odds,
  setup,
}: {
  awayTeamId: string | null;
  halftimeStrategy: LiveMatchState["halftimeStrategy"];
  homeTeamId: string | null;
  odds: { homeWin: number; draw: number; awayWin: number };
  setup: ParsedPrematchTeamSetup;
}) {
  const userIsHome = setup.teamId === homeTeamId;
  const userIsAway = setup.teamId === awayTeamId;
  if (!userIsHome && !userIsAway) return 0.5;

  const userStrength = userIsHome ? odds.homeWin : odds.awayWin;
  const opponentStrength = userIsHome ? odds.awayWin : odds.homeWin;
  const strategyShift =
    halftimeStrategy === "POSSESSION"
      ? 0.08
      : halftimeStrategy === "HIGH_PRESS"
        ? 0.03
        : halftimeStrategy === "LONG_BALL"
          ? -0.04
          : halftimeStrategy === "COUNTER_ATTACK"
            ? -0.05
            : 0;
  const mentalityShift =
    setup.tactics.mentality === "ATTACKING"
      ? 0.02
      : setup.tactics.mentality === "DEFENSIVE"
        ? -0.03
        : 0;
  const userPossession = clamp(
    0.5 +
      (userStrength - opponentStrength) * 0.22 +
      strategyShift +
      mentalityShift,
    0.34,
    0.66,
  );
  return userIsHome ? userPossession : 1 - userPossession;
}

function livePossessionAtMinute(match: LiveMatchState, minute: number) {
  const odds = match.result?.prematchOdds ?? match.preview.odds;
  const baseHome = baseHomePossession({
    awayTeamId: match.preview.awayTeamId,
    halftimeStrategy: match.halftimeStrategy,
    homeTeamId: match.preview.homeTeamId,
    odds,
    setup: match.setup,
  });
  const phase = ((match.preview.matchNumber % 11) + 1) * 0.37;
  const tacticalPulse = Math.sin(minute / 8 + phase) * 0.035;
  const latePush =
    minute > 70 && match.setup.tactics.mentality === "ATTACKING" ? 0.018 : 0;
  const home = clamp(baseHome + tacticalPulse + latePush, 0.32, 0.68);
  return { away: 1 - home, home };
}

function possessionImpact(share: number) {
  return clamp(1 + (share - 0.5) * 0.6, 0.85, 1.15);
}

function createLiveMatchEvents({
  preview,
  result,
  setup,
  hydrationLevel,
  halftimeLevel,
  halftimeStrategy,
}: {
  preview: NextMatchPreview;
  result: MatchRecord | null;
  setup: ParsedPrematchTeamSetup;
  hydrationLevel: LiveMatchState["hydrationLevel"];
  halftimeLevel: LiveMatchState["halftimeLevel"];
  halftimeStrategy: LiveMatchState["halftimeStrategy"];
}) {
  const random = new NamedRandomStreams(
    `${result?.seed ?? preview.matchNumber}:${setup.formationId}:${JSON.stringify(setup.tactics)}:${hydrationLevel}:${halftimeLevel}:${halftimeStrategy}`,
  );
  const maxMinute =
    result?.winnerTeamId && result.homeGoals === result.awayGoals ? 120 : 90;
  const hydrationGoalModifier = attackLevelModifier(hydrationLevel);
  const halftimeGoalModifier = attackLevelModifier(halftimeLevel);
  const strategy = strategyModifier(halftimeStrategy);
  const events: LiveTimelineEvent[] = [
    {
      minute: 0,
      type: "KICKOFF",
      side: null,
      text: `${teamName(preview.homeTeamId)} vs ${teamName(preview.awayTeamId)} kicks off.`,
      homeScore: 0,
      awayScore: 0,
    },
    {
      minute: 14,
      type: "TACTICAL",
      side: null,
      text: `${setup.formationId} shape, ${setup.tactics.mentality.toLowerCase()} mentality, ${setup.tactics.pressing.toLowerCase()} press.`,
      homeScore: 0,
      awayScore: 0,
    },
    {
      minute: 30,
      type: "HYDRATION_BREAK",
      side: null,
      text: `Hydration break. ${tacticalInfluenceText(hydrationLevel)}.`,
      homeScore: 0,
      awayScore: 0,
    },
    {
      minute: 45,
      type: "HALF_TIME",
      side: null,
      text: `Half-time. ${tacticalInfluenceText(halftimeLevel)} with ${strategy.label}.`,
      homeScore: 0,
      awayScore: 0,
    },
  ];
  if (maxMinute === 120) {
    events.push({
      minute: 90,
      type: "EXTRA_TIME_START",
      side: null,
      text: "Level after 90 minutes. Extra time begins.",
      homeScore: result?.homeGoals ?? 0,
      awayScore: result?.awayGoals ?? 0,
    });
  }
  if (!result) return events;

  const goalSides = [
    ...Array.from({ length: result.homeGoals }, () => "HOME" as const),
    ...Array.from({ length: result.awayGoals }, () => "AWAY" as const),
  ].sort(
    (left, right) =>
      random.next(`goal-order:${left}`) - random.next(`goal-order:${right}`),
  );
  let homeScore = 0;
  let awayScore = 0;
  goalSides.forEach((side, index) => {
    if (side === "HOME") homeScore += 1;
    else awayScore += 1;
    const teamId = side === "HOME" ? result.homeTeamId : result.awayTeamId;
    events.push({
      minute:
        maxMinute === 120 && index === goalSides.length - 1
          ? 96 + Math.floor(random.next(`extra-goal:${index}`) * 20)
          : eventMinute(random, "goal", index, goalSides.length),
      type: "GOAL",
      side,
      text: `${teamLabel(teamId)} score. ${homeScore}–${awayScore}.`,
      homeScore,
      awayScore,
    });
  });

  const userSide =
    result.homeTeamId === setup.teamId
      ? ("HOME" as const)
      : result.awayTeamId === setup.teamId
        ? ("AWAY" as const)
        : null;
  const redMultiplier = defensiveRedCardMultiplier(setup);
  const underdogPressure =
    setup.teamId === result.homeTeamId
      ? result.prematchOdds.awayWin - result.prematchOdds.homeWin
      : result.prematchOdds.homeWin - result.prematchOdds.awayWin;
  const yellowChance = Math.min(
    0.9,
    0.42 + Math.max(0, underdogPressure) * 0.35,
  );
  const redChance = Math.min(0.18, 0.045 * redMultiplier);
  if (userSide && random.chance("user-yellow", yellowChance)) {
    events.push({
      minute: 22 + Math.floor(random.next("user-yellow-minute") * 55),
      type: "YELLOW_CARD",
      side: userSide,
      text: `${teamLabel(setup.teamId)} receive a yellow card after sustained pressure.`,
      homeScore,
      awayScore,
    });
  }
  if (userSide && random.chance("user-red", redChance)) {
    events.push({
      minute: 35 + Math.floor(random.next("user-red-minute") * 42),
      type: "RED_CARD",
      side: userSide,
      text: `${teamLabel(setup.teamId)} are down to ten after a late challenge.`,
      homeScore,
      awayScore,
    });
  }
  if (random.chance("opponent-yellow", 0.38)) {
    const opponentSide = userSide === "HOME" ? "AWAY" : "HOME";
    const opponentId =
      opponentSide === "HOME" ? result.homeTeamId : result.awayTeamId;
    events.push({
      minute: 18 + Math.floor(random.next("opponent-yellow-minute") * 60),
      type: "YELLOW_CARD",
      side: opponentSide,
      text: `${teamLabel(opponentId)} receive a yellow card.`,
      homeScore,
      awayScore,
    });
  }

  const userSideStrength =
    setup.teamId === result.homeTeamId
      ? result.prematchOdds.homeWin
      : result.prematchOdds.awayWin;
  const opponentStrength =
    setup.teamId === result.homeTeamId
      ? result.prematchOdds.awayWin
      : result.prematchOdds.homeWin;
  const userSideForEvents =
    result.homeTeamId === setup.teamId ? ("HOME" as const) : ("AWAY" as const);
  const opponentSideForEvents =
    userSideForEvents === "HOME" ? ("AWAY" as const) : ("HOME" as const);
  const homePossession = baseHomePossession({
    awayTeamId: result.awayTeamId,
    halftimeStrategy,
    homeTeamId: result.homeTeamId,
    odds: result.prematchOdds,
    setup,
  });
  const userPossessionShare =
    userSideForEvents === "HOME" ? homePossession : 1 - homePossession;
  const opponentPossessionShare = 1 - userPossessionShare;
  const userPossessionImpact = possessionImpact(userPossessionShare);
  const opponentPossessionImpact = possessionImpact(opponentPossessionShare);
  const attackModifier =
    hydrationGoalModifier * 0.35 +
    halftimeGoalModifier * 0.35 +
    strategy.goals * 0.3;
  const userCorners = Math.max(
    1,
    Math.round(
      (1 + userSideStrength * 5) *
        strategy.corners *
        attackModifier *
        userPossessionImpact,
    ),
  );
  const opponentCorners = Math.max(
    0,
    Math.round(
      ((1 + opponentStrength * 4) * opponentPossessionImpact) /
        Math.max(0.8, attackModifier),
    ),
  );
  const userGoals =
    result.homeTeamId === setup.teamId ? result.homeGoals : result.awayGoals;
  const opponentGoals =
    result.homeTeamId === setup.teamId ? result.awayGoals : result.homeGoals;
  const userShots = Math.max(
    userGoals,
    Math.round(
      (3 + userSideStrength * 7) *
        strategy.shots *
        attackModifier *
        userPossessionImpact,
    ),
  );
  const opponentShots = Math.max(
    opponentGoals,
    Math.round(
      (3 + opponentStrength * 7) * strategy.against * opponentPossessionImpact,
    ),
  );
  const fouls = Math.round((7 + (1 - userSideStrength) * 6) * strategy.fouls);

  Array.from({ length: userCorners }).forEach((_, index) => {
    events.push({
      minute: eventMinute(random, "user-corner", index, userCorners),
      type: "CORNER",
      side: userSideForEvents,
      text: `${teamLabel(setup.teamId)} win a corner after attacking pressure.`,
      homeScore,
      awayScore,
    });
  });
  Array.from({ length: opponentCorners }).forEach((_, index) => {
    const opponentId =
      opponentSideForEvents === "HOME" ? result.homeTeamId : result.awayTeamId;
    events.push({
      minute: eventMinute(random, "opponent-corner", index, opponentCorners),
      type: "CORNER",
      side: opponentSideForEvents,
      text: `${teamLabel(opponentId)} win a corner.`,
      homeScore,
      awayScore,
    });
  });
  Array.from({ length: Math.max(0, userShots - userGoals) }).forEach(
    (_, index) => {
      events.push({
        minute: eventMinute(random, "user-shot", index, userShots),
        type: "MISSED_SHOT",
        side: userSideForEvents,
        text: `${teamLabel(setup.teamId)} miss a chance from open play.`,
        homeScore,
        awayScore,
      });
    },
  );
  Array.from({ length: Math.max(0, opponentShots - opponentGoals) }).forEach(
    (_, index) => {
      const opponentId =
        opponentSideForEvents === "HOME"
          ? result.homeTeamId
          : result.awayTeamId;
      events.push({
        minute: eventMinute(random, "opponent-shot", index, opponentShots),
        type: "MISSED_SHOT",
        side: opponentSideForEvents,
        text: `${teamLabel(opponentId)} fire wide.`,
        homeScore,
        awayScore,
      });
    },
  );

  if (random.chance("penalty-drama", 0.08 + fouls * 0.003)) {
    const side = random.chance("penalty-side", userPossessionShare)
      ? userSideForEvents
      : opponentSideForEvents;
    const teamId = side === "HOME" ? result.homeTeamId : result.awayTeamId;
    events.push({
      minute: 24 + Math.floor(random.next("penalty-minute") * 58),
      type: "PENALTY",
      side,
      text: `${teamLabel(teamId)} step up from the spot, but the keeper saves it.`,
      homeScore,
      awayScore,
    });
  }

  Array.from({ length: fouls }).forEach((_, index) => {
    const side = random.chance(`foul-side:${index}`, 0.56)
      ? userSideForEvents
      : opponentSideForEvents;
    const teamId = side === "HOME" ? result.homeTeamId : result.awayTeamId;
    events.push({
      minute: eventMinute(random, "foul", index, fouls),
      type: "FOUL",
      side,
      text: `${teamLabel(teamId)} commit a foul while contesting midfield.`,
      homeScore,
      awayScore,
    });
  });

  events.push({
    minute: maxMinute,
    type: "FULL_TIME",
    side: null,
    text: `Full-time: ${teamName(result.homeTeamId)} ${result.homeGoals}–${result.awayGoals} ${teamName(result.awayTeamId)}.`,
    homeScore: result.homeGoals,
    awayScore: result.awayGoals,
  });

  return events.sort(
    (left, right) =>
      left.minute - right.minute ||
      [
        "KICKOFF",
        "TACTICAL",
        "CORNER",
        "MISSED_SHOT",
        "PENALTY",
        "FOUL",
        "YELLOW_CARD",
        "RED_CARD",
        "HYDRATION_BREAK",
        "GOAL",
        "HALF_TIME",
        "EXTRA_TIME_START",
        "FULL_TIME",
      ].indexOf(left.type) -
        [
          "KICKOFF",
          "TACTICAL",
          "CORNER",
          "MISSED_SHOT",
          "PENALTY",
          "FOUL",
          "YELLOW_CARD",
          "RED_CARD",
          "HYDRATION_BREAK",
          "GOAL",
          "HALF_TIME",
          "EXTRA_TIME_START",
          "FULL_TIME",
        ].indexOf(right.type),
  );
}

function liveScoreAtMinute(events: LiveTimelineEvent[], minute: number) {
  const scoreEvent = events
    .filter((event) => event.minute <= minute)
    .filter((event) => event.type === "GOAL" || event.type === "FULL_TIME")
    .at(-1);
  return {
    home: scoreEvent?.homeScore ?? 0,
    away: scoreEvent?.awayScore ?? 0,
  };
}

function liveEventsForMinute(events: LiveTimelineEvent[], minute: number) {
  return events
    .filter((event) => event.minute <= minute)
    .slice(-6)
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
  const [nowMs, setNowMs] = useState(() => Date.now());
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
        const minute = Math.min(
          match.maxMinute,
          (elapsedMs / 1000) * match.speed,
        );
        if (!match.handledHydration && minute >= 30) {
          return {
            ...match,
            minute: 30,
            status: "BREAK",
            breakType: "HYDRATION",
            breakEndsAtMs: Date.now() + 10_000,
            handledHydration: true,
            hydrationChoiceMade: false,
            elapsedBeforePauseMs: elapsedMs,
          };
        }
        if (!match.handledHalftime && minute >= 45) {
          return {
            ...match,
            minute: 45,
            status: "BREAK",
            breakType: "HALFTIME",
            breakEndsAtMs: Date.now() + 15_000,
            handledHalftime: true,
            halftimeLevelChosen: false,
            halftimeStrategyChosen: false,
            elapsedBeforePauseMs: elapsedMs,
          };
        }
        return {
          ...match,
          minute,
          status: minute >= match.maxMinute ? "FULLTIME" : "RUNNING",
        };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [liveMatch]);

  useEffect(() => {
    if (liveMatch?.status !== "BREAK" || !liveMatch.breakEndsAtMs) return;
    const remainingMs = Math.max(0, liveMatch.breakEndsAtMs - Date.now());
    const timer = window.setTimeout(() => {
      setLiveMatch((match) =>
        match?.status === "BREAK"
          ? {
              ...match,
              status: "RUNNING",
              breakType: null,
              breakEndsAtMs: null,
              startedAtMs: Date.now(),
            }
          : match,
      );
    }, remainingMs);
    return () => window.clearTimeout(timer);
  }, [liveMatch?.breakEndsAtMs, liveMatch?.status]);

  useEffect(() => {
    if (liveMatch?.status !== "BREAK") return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [liveMatch?.status]);

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
        ? "Tournament complete. Your save is up to date."
        : "Result confirmed. The next fixture is ready.",
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
    setMessage("Saved.");
  }

  function exportCurrentSave() {
    const state = currentState ?? savedState;
    if (!state) return;
    setExportText(exportSave(state));
    setMessage("Save code ready.");
  }

  async function importCurrentSave() {
    try {
      const state = await importSave(importText);
      setSavedState(state);
      setCurrentState(state);
      setSelectedTeamId(state.userTeamId);
      setPrematchSetup(defaultPrematchTeamSetup(state.userTeamId));
      setNextMatch(nextUserMatchPreview(state));
      setMessage("Save loaded. Continue when ready.");
    } catch {
      setMessage("That save code could not be loaded.");
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
    setMessage("Save cleared. Start a new tournament when ready.");
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
    const maxMinute =
      result?.winnerTeamId && result.homeGoals === result.awayGoals ? 120 : 90;
    setLiveMatch({
      baseState,
      pending,
      preview: matchPreview,
      result,
      setup,
      minute: 0,
      maxMinute,
      speed: 1,
      status: "RUNNING",
      breakType: null,
      breakEndsAtMs: null,
      handledHydration: false,
      handledHalftime: false,
      hydrationChoiceMade: false,
      halftimeLevelChosen: false,
      halftimeStrategyChosen: false,
      hydrationLevel: 3,
      halftimeLevel: 3,
      halftimeStrategy: "BALANCED",
      startedAtMs: Date.now(),
      elapsedBeforePauseMs: 0,
    });
    setMessage("Match started. Your tournament updates after full-time.");
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

  function setHydrationLevel(level: LiveMatchState["hydrationLevel"]) {
    setLiveMatch((match) => {
      if (!match) return match;
      const next = {
        ...match,
        hydrationChoiceMade: true,
        hydrationLevel: level,
      };
      return match.status === "BREAK" && match.breakType === "HYDRATION"
        ? {
            ...next,
            status: "RUNNING",
            breakType: null,
            breakEndsAtMs: null,
            startedAtMs: Date.now(),
          }
        : next;
    });
  }

  function setHalftimeLevel(level: LiveMatchState["halftimeLevel"]) {
    setLiveMatch((match) => {
      if (!match) return match;
      const next = {
        ...match,
        halftimeLevel: level,
        halftimeLevelChosen: true,
      };
      return match.status === "BREAK" &&
        match.breakType === "HALFTIME" &&
        next.halftimeStrategyChosen
        ? {
            ...next,
            status: "RUNNING",
            breakType: null,
            breakEndsAtMs: null,
            startedAtMs: Date.now(),
          }
        : next;
    });
  }

  function setHalftimeStrategy(strategy: LiveMatchState["halftimeStrategy"]) {
    setLiveMatch((match) => {
      if (!match) return match;
      const next = {
        ...match,
        halftimeStrategy: strategy,
        halftimeStrategyChosen: true,
      };
      return match.status === "BREAK" &&
        match.breakType === "HALFTIME" &&
        next.halftimeLevelChosen
        ? {
            ...next,
            status: "RUNNING",
            breakType: null,
            breakEndsAtMs: null,
            startedAtMs: Date.now(),
          }
        : next;
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
              Choose your nation. Chase the World Cup.
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              Take charge of one country, set the match plan, and play from
              fixture to fixture. Every run has its own tournament story.
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
                Continue tournament
              </Button>
            </div>
            <p aria-live="polite" className="mt-4 text-sm text-cyan-200">
              {message}
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0a102b]/90 p-6 sm:p-8">
            <p className="eyebrow">Tournament status</p>
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
                  Your match plan is already reflected in these chances.
                </p>
              </div>
            ) : null}

            {liveMatch ? (
              <LiveMatchPanel
                liveMatch={liveMatch}
                nowMs={nowMs}
                onFinish={() => void finishLiveMatchNow()}
                onHalftimeLevelChange={setHalftimeLevel}
                onHalftimeStrategyChange={setHalftimeStrategy}
                onHydrationLevelChange={setHydrationLevel}
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
                    Match {latestUserMatch.matchNumber} saved ·{" "}
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
                    : "The schedule has advanced to your next fixture."}
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
            Move your save
          </summary>
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article>
              <h2 className="text-xl font-black text-white">Copy save code</h2>
              <textarea
                className="mt-4 min-h-52 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-200"
                readOnly
                value={exportText}
              />
            </article>
            <article>
              <h2 className="text-xl font-black text-white">Load save code</h2>
              <textarea
                className="mt-4 min-h-52 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-200"
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste your save code here"
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
          Pick the shape, tempo, and set-piece roles you want to trust in the
          next match.
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
  nowMs,
  onFinish,
  onHalftimeLevelChange,
  onHalftimeStrategyChange,
  onHydrationLevelChange,
  onPause,
  onResume,
  onSpeedChange,
}: {
  liveMatch: LiveMatchState;
  nowMs: number;
  onFinish: () => void;
  onHalftimeLevelChange: (level: LiveMatchState["halftimeLevel"]) => void;
  onHalftimeStrategyChange: (
    strategy: LiveMatchState["halftimeStrategy"],
  ) => void;
  onHydrationLevelChange: (level: LiveMatchState["hydrationLevel"]) => void;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: LiveMatchState["speed"]) => void;
}) {
  const visibleMinute = Math.floor(liveMatch.minute);
  const allEvents = createLiveMatchEvents({
    preview: liveMatch.preview,
    result: liveMatch.result,
    setup: liveMatch.setup,
    hydrationLevel: liveMatch.hydrationLevel,
    halftimeLevel: liveMatch.halftimeLevel,
    halftimeStrategy: liveMatch.halftimeStrategy,
  });
  const events = liveEventsForMinute(allEvents, visibleMinute);
  const liveScore = liveScoreAtMinute(allEvents, visibleMinute);
  const latestImpact = allEvents
    .filter((event) => event.minute <= visibleMinute)
    .filter((event) =>
      [
        "GOAL",
        "RED_CARD",
        "YELLOW_CARD",
        "CORNER",
        "MISSED_SHOT",
        "PENALTY",
      ].includes(event.type),
    )
    .at(-1);
  const yellowCards = allEvents.filter(
    (event) => event.type === "YELLOW_CARD" && event.minute <= visibleMinute,
  ).length;
  const redCards = allEvents.filter(
    (event) => event.type === "RED_CARD" && event.minute <= visibleMinute,
  ).length;
  const corners = allEvents.filter(
    (event) => event.type === "CORNER" && event.minute <= visibleMinute,
  ).length;
  const shots = allEvents.filter(
    (event) =>
      (event.type === "MISSED_SHOT" ||
        event.type === "GOAL" ||
        event.type === "PENALTY") &&
      event.minute <= visibleMinute,
  ).length;
  const fouls = allEvents.filter(
    (event) => event.type === "FOUL" && event.minute <= visibleMinute,
  ).length;
  const progress = Math.min(
    100,
    (liveMatch.minute / liveMatch.maxMinute) * 100,
  );
  const possession = livePossessionAtMinute(liveMatch, visibleMinute);

  return (
    <section className="mt-7 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Live match</p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {teamLabel(liveMatch.preview.homeTeamId)} vs{" "}
            {teamLabel(liveMatch.preview.awayTeamId)}
          </h3>
          <p className="mt-1 text-sm text-emerald-100/80">
            At 1x, match minutes move one-for-one with real seconds. Breaks
            pause the clock.
          </p>
        </div>
        <div className="rounded-2xl bg-black/20 px-4 py-3 text-right">
          <p className="text-xs font-black tracking-wider text-emerald-100/70 uppercase">
            Minute
          </p>
          <p className="text-4xl font-black text-white">
            {Math.min(liveMatch.maxMinute, visibleMinute)}
            <span className="text-xl">′</span>
          </p>
        </div>
      </div>

      <MatchPitchScreen
        event={latestImpact}
        homePossession={possession.home}
        liveScore={liveScore}
        liveStatus={liveMatch.status}
        minute={visibleMinute}
        preview={liveMatch.preview}
      />

      {latestImpact ? (
        <MatchMoment
          event={latestImpact}
          homeTeamId={liveMatch.preview.homeTeamId}
          userTeamId={liveMatch.pending.state.userTeamId}
        />
      ) : null}

      {liveMatch.status === "BREAK" ? (
        <BreakControls
          liveMatch={liveMatch}
          nowMs={nowMs}
          onHalftimeLevelChange={onHalftimeLevelChange}
          onHalftimeStrategyChange={onHalftimeStrategyChange}
          onHydrationLevelChange={onHydrationLevelChange}
        />
      ) : null}

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
            {liveScore.home}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">State</p>
          <p className="mt-2 text-lg font-black text-white">
            {liveMatch.status.toLowerCase()}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            🟨 {yellowCards} · 🟥 {redCards}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Shots {shots} · Corners {corners} · Fouls {fouls}
          </p>
          <p className="mt-1 text-xs text-cyan-100">
            Possession {percent(possession.home)} · {percent(possession.away)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">
            {teamName(liveMatch.preview.awayTeamId)}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {liveScore.away}
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
            className={
              event.type === "GOAL"
                ? "rounded-2xl bg-emerald-300/15 px-3 py-2 text-sm text-emerald-50"
                : event.type === "PENALTY"
                  ? "rounded-2xl bg-amber-300/15 px-3 py-2 text-sm text-amber-50"
                  : event.type === "RED_CARD"
                    ? "rounded-2xl bg-rose-300/15 px-3 py-2 text-sm text-rose-50"
                    : event.type === "YELLOW_CARD"
                      ? "rounded-2xl bg-amber-300/15 px-3 py-2 text-sm text-amber-50"
                      : "rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-100"
            }
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

function MatchPitchScreen({
  event,
  homePossession,
  liveScore,
  liveStatus,
  minute,
  preview,
}: {
  event: LiveTimelineEvent | undefined;
  homePossession: number;
  liveScore: { home: number; away: number };
  liveStatus: LiveMatchState["status"];
  minute: number;
  preview: NextMatchPreview;
}) {
  const awayPossession = 1 - homePossession;
  const side = event?.side ?? "HOME";
  const isHomeAction = side === "HOME";
  const ballLeft =
    event?.type === "GOAL" || event?.type === "PENALTY"
      ? isHomeAction
        ? 84
        : 16
      : event?.type === "CORNER"
        ? isHomeAction
          ? 92
          : 8
        : event?.type === "FOUL"
          ? 50
          : isHomeAction
            ? 64
            : 36;
  const ballTop =
    event?.type === "CORNER"
      ? 18
      : event?.type === "YELLOW_CARD" || event?.type === "RED_CARD"
        ? 54
        : event?.type === "PENALTY"
          ? 50
          : 42;
  const actionLabel =
    event?.type === "GOAL"
      ? "Goal sequence"
      : event?.type === "PENALTY"
        ? "Penalty shot"
        : event?.type === "RED_CARD"
          ? "Red-card stoppage"
          : event?.type === "YELLOW_CARD"
            ? "Card shown"
            : event?.type === "CORNER"
              ? "Corner pressure"
              : event?.type === "MISSED_SHOT"
                ? "Shot attempt"
                : "Live phase";
  const glow =
    event?.type === "GOAL"
      ? "shadow-[0_0_50px_rgba(52,211,153,0.45)]"
      : event?.type === "PENALTY"
        ? "shadow-[0_0_50px_rgba(251,191,36,0.45)]"
        : event?.type === "RED_CARD"
          ? "shadow-[0_0_50px_rgba(251,113,133,0.4)]"
          : "shadow-[0_0_36px_rgba(103,232,249,0.2)]";

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#07111f]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-emerald-200 uppercase">
            Match screen · {actionLabel}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {minute}′ · {liveStatus.toLowerCase()} ·{" "}
            {event?.text ?? "Both teams are feeling each other out."}
          </p>
        </div>
        <p className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white">
          {teamFlag(preview.homeTeamId)} {liveScore.home}–{liveScore.away}{" "}
          {teamFlag(preview.awayTeamId)}
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
        <div className="relative h-72 overflow-hidden rounded-3xl border border-emerald-100/20 bg-[linear-gradient(90deg,rgba(22,101,52,.9),rgba(21,128,61,.75),rgba(22,101,52,.9))]">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
          <div className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
          <div className="absolute top-1/2 left-0 h-32 w-20 -translate-y-1/2 rounded-r-3xl border border-l-0 border-white/35" />
          <div className="absolute top-1/2 right-0 h-32 w-20 -translate-y-1/2 rounded-l-3xl border border-r-0 border-white/35" />
          <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10" />
          <div className="absolute top-0 right-[25%] bottom-0 w-px bg-white/10" />

          {[18, 34, 49, 66, 82].map((left, index) => (
            <div
              className="absolute size-3 rounded-full bg-cyan-100/80 ring-4 ring-cyan-300/20"
              key={`home-dot-${left}`}
              style={{ left: `${left}%`, top: `${28 + (index % 3) * 18}%` }}
            />
          ))}
          {[18, 34, 51, 66, 82].map((right, index) => (
            <div
              className="absolute size-3 rounded-full bg-rose-100/80 ring-4 ring-rose-300/20"
              key={`away-dot-${right}`}
              style={{ right: `${right}%`, top: `${34 + (index % 3) * 16}%` }}
            />
          ))}

          <div
            className={`absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white text-center text-lg leading-7 transition-all duration-500 ${glow}`}
            style={{ left: `${ballLeft}%`, top: `${ballTop}%` }}
          >
            ⚽
          </div>
          {event?.type === "GOAL" ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-emerald-300/90 px-3 py-1 text-xs font-black text-emerald-950"
              style={{ [isHomeAction ? "right" : "left"]: "18px" }}
            >
              GOAL
            </div>
          ) : null}
          {event?.type === "YELLOW_CARD" || event?.type === "RED_CARD" ? (
            <div
              className={`absolute top-[48%] left-1/2 h-12 w-8 -translate-x-1/2 rounded-md ${
                event.type === "RED_CARD" ? "bg-rose-500" : "bg-amber-300"
              }`}
            />
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black tracking-wider text-slate-400 uppercase">
            Possession
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>{teamLabel(preview.homeTeamId)}</span>
                <span>{percent(homePossession)}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-all"
                  style={{ width: percent(homePossession) }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>{teamLabel(preview.awayTeamId)}</span>
                <span>{percent(awayPossession)}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-rose-300 transition-all"
                  style={{ width: percent(awayPossession) }}
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Possession shifts with momentum, pressure, and your tactical
            choices.
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchMoment({
  event,
  homeTeamId,
  userTeamId,
}: {
  event: LiveTimelineEvent;
  homeTeamId: string | null;
  userTeamId: string;
}) {
  const eventTeam =
    event.side === "HOME"
      ? homeTeamId
      : event.side === "AWAY"
        ? homeTeamId === userTeamId
          ? null
          : userTeamId
        : null;
  const isUserMoment = eventTeam === userTeamId;
  const style =
    event.type === "GOAL"
      ? isUserMoment
        ? "border-emerald-300/40 bg-emerald-300/20"
        : "border-rose-300/40 bg-rose-300/20"
      : event.type === "RED_CARD"
        ? "border-rose-300/40 bg-rose-300/20"
        : event.type === "YELLOW_CARD"
          ? "border-amber-300/40 bg-amber-300/20"
          : "border-cyan-300/30 bg-cyan-300/10";
  const title =
    event.type === "GOAL"
      ? isUserMoment
        ? "GOAL FOR YOU"
        : "OPPONENT GOAL"
      : event.type === "RED_CARD"
        ? "RED CARD"
        : event.type === "YELLOW_CARD"
          ? "YELLOW CARD"
          : event.type === "CORNER"
            ? "CORNER"
            : event.type === "PENALTY"
              ? "PENALTY SHOT"
              : "CHANCE";

  return (
    <div className={`mt-5 rounded-3xl border p-5 ${style}`}>
      <p className="text-xs font-black tracking-[0.25em] text-white/70 uppercase">
        {event.minute}′ · {title}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{event.text}</p>
      <div className="mt-4 h-20 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.18),transparent_55%),linear-gradient(90deg,rgba(34,197,94,.18),rgba(14,165,233,.12),rgba(244,63,94,.18))]" />
    </div>
  );
}

function BreakControls({
  liveMatch,
  nowMs,
  onHalftimeLevelChange,
  onHalftimeStrategyChange,
  onHydrationLevelChange,
}: {
  liveMatch: LiveMatchState;
  nowMs: number;
  onHalftimeLevelChange: (level: LiveMatchState["halftimeLevel"]) => void;
  onHalftimeStrategyChange: (
    strategy: LiveMatchState["halftimeStrategy"],
  ) => void;
  onHydrationLevelChange: (level: LiveMatchState["hydrationLevel"]) => void;
}) {
  const isHalftime = liveMatch.breakType === "HALFTIME";
  const breakSeconds = isHalftime ? 15 : 10;
  const remainingSeconds = liveMatch.breakEndsAtMs
    ? Math.max(0, Math.ceil((liveMatch.breakEndsAtMs - nowMs) / 1000))
    : breakSeconds;
  const level = isHalftime ? liveMatch.halftimeLevel : liveMatch.hydrationLevel;
  const halftimeReady =
    liveMatch.halftimeLevelChosen && liveMatch.halftimeStrategyChosen;

  return (
    <div className="mt-5 rounded-3xl border border-cyan-300/25 bg-cyan-300/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {isHalftime ? "Half-time team talk" : "Hydration break"}
          </p>
          <h4 className="mt-2 text-2xl font-black text-white">
            Choose the next phase
          </h4>
          <p className="mt-2 text-sm text-cyan-50/80">
            {isHalftime
              ? "You have 15 seconds for the team talk, or less if you choose quickly."
              : "You have 10 seconds to adjust the tempo, or less if you choose quickly."}{" "}
            {tacticalInfluenceText(level)}
          </p>
        </div>
        <div className="text-right">
          <p className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white">
            {remainingSeconds}s left
          </p>
          <p className="mt-2 text-xs text-cyan-100/75">
            {isHalftime
              ? halftimeReady
                ? "Restarting now"
                : "Pick tempo + strategy"
              : liveMatch.hydrationChoiceMade
                ? "Restarting now"
                : "Pick a posture"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs font-black tracking-wider text-slate-300 uppercase">
          <span>1 Full defense</span>
          <span>3 Neutral</span>
          <span>5 Full attack</span>
        </div>
        <input
          className="mt-3 w-full accent-cyan-300"
          max={5}
          min={1}
          onChange={(event) =>
            isHalftime
              ? onHalftimeLevelChange(
                  Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                )
              : onHydrationLevelChange(
                  Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                )
          }
          step={1}
          type="range"
          value={level}
        />
      </div>

      {isHalftime ? (
        <label className="mt-5 block">
          <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
            Strategy
          </span>
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a102b] px-4 py-3 text-white"
            onChange={(event) =>
              onHalftimeStrategyChange(
                event.target.value as LiveMatchState["halftimeStrategy"],
              )
            }
            value={liveMatch.halftimeStrategy}
          >
            <option value="BALANCED">Balanced — keep your match plan</option>
            <option value="COUNTER_ATTACK">
              Counter attack — break quickly when space opens
            </option>
            <option value="HIGH_PRESS">
              High press — squeeze the opponent high up the pitch
            </option>
            <option value="LONG_BALL">
              Long ball — go direct and force second-ball pressure
            </option>
            <option value="POSSESSION">
              Possession — control rhythm and reduce chaos
            </option>
          </select>
        </label>
      ) : null}
    </div>
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
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3">Team</th>
                    <th className="px-2 py-2 text-center">Pts</th>
                    <th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">GF</th>
                    <th className="px-2 py-2 text-center">GA</th>
                    <th className="px-2 py-2 text-center">GD</th>
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
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-black text-white sm:hidden">
                          {standing.points} pts
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-black text-white">
                        {standing.points}
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

type BracketPresentationMatch =
  GamePresentation["knockoutRounds"][string][number];

function allKnockoutMatches(presentation: GamePresentation) {
  return Object.values(presentation.knockoutRounds).flat();
}

function presentedKnockoutMatch(
  presentation: GamePresentation,
  matchNumber: number,
) {
  return allKnockoutMatches(presentation).find(
    (match) => match.matchNumber === matchNumber,
  );
}

function slotLabel(slot: string, presentation: GamePresentation) {
  if (slot.startsWith("W") || slot.startsWith("L")) {
    const sourceNumber = Number(slot.slice(1));
    const source = presentedKnockoutMatch(presentation, sourceNumber);
    if (!source) {
      return slot.startsWith("W")
        ? `Winner M${sourceNumber}`
        : `Loser M${sourceNumber}`;
    }
    if (slot.startsWith("W") && source.winnerTeamId) {
      return teamLabel(source.winnerTeamId);
    }
    if (slot.startsWith("L") && source.winnerTeamId) {
      const loserTeamId =
        source.winnerTeamId === source.homeTeamId
          ? source.awayTeamId
          : source.homeTeamId;
      return teamLabel(loserTeamId);
    }
    if (source.homeTeamId && source.awayTeamId) {
      return `${teamLabel(source.homeTeamId)} / ${teamLabel(source.awayTeamId)}`;
    }
    return slot.startsWith("W")
      ? `Winner of Match ${sourceNumber}`
      : `Loser of Match ${sourceNumber}`;
  }
  return slot;
}

function nextWinnerRoute(
  match: BracketPresentationMatch,
  presentation: GamePresentation,
) {
  const sourceSlot = `W${match.matchNumber}`;
  const nextTemplate = knockoutBracket.matches.find(
    (item) => item.homeSlot === sourceSlot || item.awaySlot === sourceSlot,
  );
  if (!nextTemplate) return null;
  const nextMatch = presentedKnockoutMatch(
    presentation,
    nextTemplate.matchNumber,
  );
  const opponentSlot =
    nextTemplate.homeSlot === sourceSlot
      ? nextTemplate.awaySlot
      : nextTemplate.homeSlot;
  return {
    matchNumber: nextTemplate.matchNumber,
    opponent: slotLabel(opponentSlot, presentation),
    stage: stageLabel(nextTemplate.stage),
    targetScoreline: nextMatch ? scoreline(nextMatch) : null,
  };
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
    "FINAL",
  ];
  const champion = presentation.knockoutRounds.FINAL?.[0]?.winnerTeamId;
  const stageOffsets: Record<string, string> = {
    ROUND_OF_32: "pt-0",
    ROUND_OF_16: "pt-10",
    QUARTER_FINAL: "pt-24",
    SEMI_FINAL: "pt-44",
    FINAL: "pt-64",
  };
  const stageGaps: Record<string, string> = {
    ROUND_OF_32: "space-y-3",
    ROUND_OF_16: "space-y-10",
    QUARTER_FINAL: "space-y-24",
    SEMI_FINAL: "space-y-44",
    FINAL: "space-y-0",
  };

  return (
    <section>
      <p className="eyebrow">Knockout stage</p>
      <h2 className="mt-2 text-3xl font-black text-white">
        Tournament bracket
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Follow the winner lines from left to right to see who can meet in the
        next round.
      </p>

      {champion ? (
        <div className="mt-5 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
          <p className="eyebrow text-amber-100">Champion path</p>
          <h3 className="mt-2 text-2xl font-black text-white">
            🏆 {teamLabel(champion)}
          </h3>
          <p className="mt-2 text-sm text-amber-100/80">
            The winning path is highlighted through the bracket.
          </p>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-[#080d23]/80 p-4">
        <div className="relative grid min-w-[1320px] grid-cols-5 items-start gap-8">
          {stages.map((stage) => (
            <div className="relative" key={stage}>
              {stage !== "FINAL" ? (
                <div className="pointer-events-none absolute top-28 -right-4 bottom-14 hidden w-px bg-cyan-100/20 xl:block" />
              ) : null}
              <div className="sticky top-0 z-10 rounded-2xl border border-white/10 bg-[#11183a] px-4 py-3">
                <h3 className="text-sm font-black tracking-wider text-white uppercase">
                  {stageLabel(stage)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {(presentation.knockoutRounds[stage] ?? []).length} matches
                </p>
              </div>

              <div
                className={`mt-4 ${stageOffsets[stage]} ${stageGaps[stage]}`}
              >
                {(presentation.knockoutRounds[stage] ?? []).map((match) => {
                  const resultLabel = userResultLabel(match, selectedTeamId);
                  const involvesUser = Boolean(resultLabel);
                  return (
                    <BracketMatchCard
                      involvesUser={involvesUser}
                      key={match.matchNumber}
                      match={match}
                      nextInfo={nextWinnerRoute(match, presentation)}
                      resultLabel={resultLabel}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-black tracking-wider text-white uppercase">
            Third place
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(presentation.knockoutRounds.THIRD_PLACE ?? []).map((match) => (
              <BracketMatchCard
                involvesUser={Boolean(userResultLabel(match, selectedTeamId))}
                key={match.matchNumber}
                match={match}
                nextInfo={null}
                resultLabel={userResultLabel(match, selectedTeamId)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BracketMatchCard({
  involvesUser,
  match,
  nextInfo,
  resultLabel,
}: {
  involvesUser: boolean;
  match: BracketPresentationMatch;
  nextInfo: ReturnType<typeof nextWinnerRoute> | null;
  resultLabel: string | null;
}) {
  return (
    <div
      className={
        involvesUser
          ? "relative rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-3 shadow-[0_0_28px_rgba(103,232,249,0.12)]"
          : "relative rounded-3xl border border-white/10 bg-white/[0.04] p-3"
      }
    >
      {nextInfo ? (
        <>
          <div className="absolute top-1/2 -right-8 hidden h-px w-8 bg-cyan-100/40 xl:block" />
          <div className="absolute top-1/2 -right-8 hidden size-2 -translate-y-1/2 rounded-full bg-cyan-200 xl:block" />
        </>
      ) : null}
      <div className="absolute top-1/2 -left-8 hidden h-px w-8 bg-cyan-100/10 xl:block" />
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

      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
        <BracketTeamRow
          goals={match.homeGoals}
          isWinner={match.winnerTeamId === match.homeTeamId}
          teamId={match.homeTeamId}
        />
        <BracketTeamRow
          goals={match.awayGoals}
          isWinner={match.winnerTeamId === match.awayTeamId}
          teamId={match.awayTeamId}
        />
      </div>

      {match.winnerTeamId ? (
        <p className="mt-2 text-xs font-bold text-emerald-200">
          {teamLabel(match.winnerTeamId)} advances →
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Awaiting result</p>
      )}

      {nextInfo ? (
        <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2">
          <p className="text-[0.65rem] font-black tracking-wider text-cyan-100 uppercase">
            Winner line → Match {nextInfo.matchNumber} · {nextInfo.stage}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Possible next opponent: {nextInfo.opponent}
          </p>
          {nextInfo.targetScoreline ? (
            <p className="mt-1 text-[0.7rem] text-slate-500">
              Next slot: {nextInfo.targetScoreline}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BracketTeamRow({
  goals,
  isWinner,
  teamId,
}: {
  goals: number | null;
  isWinner: boolean;
  teamId: string | null;
}) {
  return (
    <div
      className={
        isWinner
          ? "flex items-center justify-between gap-3 bg-emerald-300/15 px-3 py-2 text-emerald-50"
          : "flex items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-3 py-2 text-slate-300 first:border-t-0"
      }
    >
      <span className="truncate text-sm font-bold">{teamLabel(teamId)}</span>
      <span className="font-black text-white">{goals ?? "—"}</span>
    </div>
  );
}

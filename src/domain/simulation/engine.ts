import { squadDataset } from "../data-ingestion/data";
import { playerRatingsById, teamRatingsById } from "../ratings/data";
import type { LineupPlayer, TeamRating } from "../ratings/schema";

import { NamedRandomStreams } from "./random";
import {
  MatchSimulationInputSchema,
  SIMULATION_ENGINE_VERSION,
  type MatchEvent,
  type MatchPhase,
  type MatchSide,
  type MatchSimulationInput,
  type MatchSimulationResult,
  type MatchStats,
  type TacticalIntent,
} from "./schema";

type MutableStats = Omit<MatchStats, "xg" | "possessionShare"> & {
  xg: number;
  possessionTicks: number;
};

type SideState = {
  side: MatchSide;
  team: TeamRating;
  lineup: LineupPlayer[];
  bench: string[];
  unavailable: Set<string>;
  yellowed: Set<string>;
  redCarded: Set<string>;
  substitutionsUsed: number;
  intent: TacticalIntent;
  stats: MutableStats;
};

type EngineState = {
  sequence: number;
  homeScore: number;
  awayScore: number;
  possession: MatchSide;
  events: MatchEvent[];
};

function other(side: MatchSide): MatchSide {
  return side === "HOME" ? "AWAY" : "HOME";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function createStats(teamId: string): MutableStats {
  return {
    teamId,
    goals: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    possessionTicks: 0,
    yellowCards: 0,
    redCards: 0,
    injuries: 0,
    substitutions: 0,
  };
}

function event(
  state: EngineState,
  minute: number,
  phase: MatchPhase,
  type: MatchEvent["type"],
  side: MatchSide | null,
  teamId: string | null,
  commentary: string,
  data: Record<string, unknown> = {},
  playerId: string | null = null,
  relatedPlayerId: string | null = null,
  xg: number | null = null,
) {
  state.events.push({
    id: `${state.sequence.toString().padStart(4, "0")}-${type.toLowerCase()}`,
    sequence: state.sequence,
    minute,
    stoppageMinute: 0,
    phase,
    type,
    side,
    teamId,
    playerId,
    relatedPlayerId,
    xg,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    commentary,
    data,
  });
  state.sequence += 1;
}

function activePlayers(side: SideState) {
  return side.lineup.filter(
    (entry) =>
      !side.unavailable.has(entry.playerId) &&
      !side.redCarded.has(entry.playerId),
  );
}

function roleAverage(side: SideState, roles: string[]) {
  const entries = activePlayers(side).filter((entry) =>
    roles.includes(entry.role),
  );
  if (entries.length === 0) return 45;
  return (
    entries.reduce((sum, entry) => sum + entry.roleRating * entry.roleFit, 0) /
    entries.length
  );
}

function tacticalMultiplier(
  intent: TacticalIntent,
  area: "attack" | "defense",
) {
  if (intent === "CHASE_GOAL") return area === "attack" ? 1.1 : 0.93;
  if (intent === "PROTECT_LEAD") return area === "attack" ? 0.92 : 1.08;
  return 1;
}

function attackScore(side: SideState) {
  return (
    (side.team.strengths.attack * 0.42 +
      side.team.strengths.midfield * 0.2 +
      roleAverage(side, ["WG", "ST", "AM"]) * 0.38) *
    tacticalMultiplier(side.intent, "attack")
  );
}

function defenseScore(side: SideState) {
  const redPenalty = side.redCarded.size * 4.5;
  return (
    (side.team.strengths.defense * 0.44 +
      side.team.strengths.goalkeeping * 0.2 +
      roleAverage(side, ["CB", "FB", "DM"]) * 0.36 -
      redPenalty) *
    tacticalMultiplier(side.intent, "defense")
  );
}

function midfieldScore(side: SideState) {
  return (
    side.team.strengths.midfield * 0.55 +
    roleAverage(side, ["DM", "CM", "AM"]) * 0.45
  );
}

function chooseShooter(
  random: NamedRandomStreams,
  side: SideState,
  minute: number,
) {
  const candidates = activePlayers(side)
    .map((entry) => ({
      entry,
      shooting:
        (playerRatingsById.get(entry.playerId)?.attributes.shooting ?? 50) +
        (entry.role === "ST" || entry.role === "WG" || entry.role === "AM"
          ? 8
          : 0),
    }))
    .sort((left, right) => right.shooting - left.shooting)
    .slice(0, 5);
  return random.pick(`shooter:${side.side}:${minute}`, candidates).entry;
}

function chooseCardedPlayer(
  random: NamedRandomStreams,
  side: SideState,
  minute: number,
) {
  return random.pick(`card:${side.side}:${minute}`, activePlayers(side));
}

function chooseReplacement(side: SideState, outgoing: LineupPlayer) {
  const candidate = side.bench
    .filter((playerId) => !side.unavailable.has(playerId))
    .map((playerId) => {
      const rating = playerRatingsById.get(playerId);
      return {
        playerId,
        score:
          rating?.roleRatings[outgoing.role] ?? rating?.overallEstimate ?? 50,
      };
    })
    .sort((left, right) => right.score - left.score)[0];
  if (!candidate) return null;
  const rating = playerRatingsById.get(candidate.playerId);
  return {
    playerId: candidate.playerId,
    role: outgoing.role,
    roleRating: rating?.roleRatings[outgoing.role] ?? outgoing.roleRating,
    roleFit: outgoing.roleFit,
  };
}

function makeSubstitution(
  state: EngineState,
  minute: number,
  phase: MatchPhase,
  side: SideState,
  reason: "AI_MANAGER" | "INJURY",
  random: NamedRandomStreams,
) {
  if (side.substitutionsUsed >= 5) return false;
  const candidates = activePlayers(side).filter((entry) => entry.role !== "GK");
  if (candidates.length === 0) return false;
  const outgoing =
    reason === "INJURY"
      ? random.pick(`injury-sub:${side.side}:${minute}`, candidates)
      : candidates
          .map((entry) => ({
            entry,
            rating:
              playerRatingsById.get(entry.playerId)?.overallEstimate ?? 50,
          }))
          .sort((left, right) => left.rating - right.rating)[0]!.entry;
  const replacement = chooseReplacement(side, outgoing);
  if (!replacement) return false;
  side.bench = side.bench.filter(
    (playerId) => playerId !== replacement.playerId,
  );
  side.lineup = side.lineup.map((entry) =>
    entry.playerId === outgoing.playerId ? replacement : entry,
  );
  side.substitutionsUsed += 1;
  side.stats.substitutions += 1;
  event(
    state,
    minute,
    phase,
    "SUBSTITUTION",
    side.side,
    side.team.teamId,
    `${side.team.fifaCode} make a ${reason === "INJURY" ? "forced" : "planned"} change.`,
    { reason, substitutionsUsed: side.substitutionsUsed },
    replacement.playerId,
    outgoing.playerId,
  );
  return true;
}

function maybeManagerChange(
  state: EngineState,
  minute: number,
  phase: MatchPhase,
  side: SideState,
) {
  const scoreDiff =
    side.side === "HOME"
      ? state.homeScore - state.awayScore
      : state.awayScore - state.homeScore;
  const nextIntent: TacticalIntent =
    minute >= 70 && scoreDiff < 0
      ? "CHASE_GOAL"
      : minute >= 75 && scoreDiff > 0
        ? "PROTECT_LEAD"
        : "BALANCED";
  if (nextIntent === side.intent) return;
  side.intent = nextIntent;
  event(
    state,
    minute,
    phase,
    "TACTICAL_CHANGE",
    side.side,
    side.team.teamId,
    `${side.team.fifaCode} switch to ${nextIntent.toLowerCase().replaceAll("_", " ")}.`,
    { intent: nextIntent, scoreDiff },
  );
}

function tick(
  state: EngineState,
  minute: number,
  phase: MatchPhase,
  home: SideState,
  away: SideState,
  random: NamedRandomStreams,
) {
  const inPossession = state.possession === "HOME" ? home : away;
  const defending = state.possession === "HOME" ? away : home;
  inPossession.stats.possessionTicks += 1;

  const keepProbability = clamp(
    0.44 + (midfieldScore(inPossession) - midfieldScore(defending)) / 220,
    0.34,
    0.58,
  );
  if (!random.chance(`possession:${minute}`, keepProbability)) {
    state.possession = other(state.possession);
    event(
      state,
      minute,
      phase,
      "POSSESSION",
      state.possession,
      state.possession === "HOME" ? home.team.teamId : away.team.teamId,
      `${state.possession === "HOME" ? home.team.fifaCode : away.team.fifaCode} recover possession.`,
      { keepProbability: round(keepProbability) },
    );
    return;
  }

  const shotProbability = clamp(
    0.055 + (attackScore(inPossession) - defenseScore(defending)) / 900,
    0.025,
    0.12,
  );
  if (random.chance(`shot:${minute}:${state.possession}`, shotProbability)) {
    const shooter = chooseShooter(random, inPossession, minute);
    const xg = clamp(
      0.05 +
        (attackScore(inPossession) - defenseScore(defending)) / 650 +
        random.next(`xg:${minute}`) * 0.18,
      0.02,
      0.42,
    );
    const onTarget = random.chance(
      `on-target:${minute}`,
      clamp(0.28 + xg, 0.25, 0.72),
    );
    const goal = onTarget && random.chance(`goal:${minute}`, xg);
    inPossession.stats.shots += 1;
    inPossession.stats.xg += xg;
    if (onTarget) inPossession.stats.shotsOnTarget += 1;
    if (goal) {
      inPossession.stats.goals += 1;
      if (inPossession.side === "HOME") state.homeScore += 1;
      else state.awayScore += 1;
    }
    event(
      state,
      minute,
      phase,
      goal ? "GOAL" : "SHOT",
      inPossession.side,
      inPossession.team.teamId,
      goal
        ? `${inPossession.team.fifaCode} score through a ${shooter.role} chance.`
        : `${inPossession.team.fifaCode} create a ${onTarget ? "shot on target" : "shot"}.`,
      { onTarget, role: shooter.role },
      shooter.playerId,
      null,
      round(xg),
    );
  }

  if (random.chance(`card:${minute}`, 0.018)) {
    const side = random.chance(`card-side:${minute}`, 0.5) ? home : away;
    const player = chooseCardedPlayer(random, side, minute);
    const secondYellow = side.yellowed.has(player.playerId);
    if (secondYellow || random.chance(`red:${minute}`, 0.08)) {
      side.redCarded.add(player.playerId);
      side.stats.redCards += 1;
    } else {
      side.yellowed.add(player.playerId);
      side.stats.yellowCards += 1;
    }
    event(
      state,
      minute,
      phase,
      "CARD",
      side.side,
      side.team.teamId,
      `${side.team.fifaCode} receive ${secondYellow ? "a second yellow" : side.redCarded.has(player.playerId) ? "a red card" : "a yellow card"}.`,
      { card: side.redCarded.has(player.playerId) ? "RED" : "YELLOW" },
      player.playerId,
    );
  }

  if (random.chance(`injury:${minute}`, 0.006)) {
    const side = random.chance(`injury-side:${minute}`, 0.5) ? home : away;
    const player = random.pick(
      `injured:${minute}:${side.side}`,
      activePlayers(side),
    );
    side.unavailable.add(player.playerId);
    side.stats.injuries += 1;
    event(
      state,
      minute,
      phase,
      "INJURY",
      side.side,
      side.team.teamId,
      `${side.team.fifaCode} have an injury interruption.`,
      {
        severity: random.chance(`injury-severity:${minute}`, 0.15)
          ? "MAJOR"
          : "MINOR",
      },
      player.playerId,
    );
    makeSubstitution(state, minute, phase, side, "INJURY", random);
  }

  if (
    (minute === 62 || minute === 76 || minute === 91 || minute === 106) &&
    phase !== "SHOOTOUT"
  ) {
    makeSubstitution(state, minute, phase, home, "AI_MANAGER", random);
    makeSubstitution(state, minute, phase, away, "AI_MANAGER", random);
  }
  if (minute === 70 || minute === 78 || minute === 90 || minute === 105) {
    maybeManagerChange(state, minute, phase, home);
    maybeManagerChange(state, minute, phase, away);
  }
}

function makeSide(side: MatchSide, teamId: string): SideState {
  const team = teamRatingsById.get(teamId);
  if (!team) throw new Error(`Unknown team rating: ${teamId}`);
  const lineupIds = new Set(team.lineup.map((entry) => entry.playerId));
  return {
    side,
    team,
    lineup: team.lineup.map((entry) => ({ ...entry })),
    bench: squadDataset.players
      .filter((player) => player.teamId === teamId && !lineupIds.has(player.id))
      .map((player) => player.id),
    unavailable: new Set(),
    yellowed: new Set(),
    redCarded: new Set(),
    substitutionsUsed: 0,
    intent: "BALANCED",
    stats: createStats(teamId),
  };
}

function normalizeStats(stats: MutableStats, totalTicks: number): MatchStats {
  const rest = {
    teamId: stats.teamId,
    goals: stats.goals,
    shots: stats.shots,
    shotsOnTarget: stats.shotsOnTarget,
    yellowCards: stats.yellowCards,
    redCards: stats.redCards,
    injuries: stats.injuries,
    substitutions: stats.substitutions,
  };
  return {
    ...rest,
    xg: round(stats.xg),
    possessionShare: round(stats.possessionTicks / totalTicks),
  };
}

function runShootout(
  state: EngineState,
  home: SideState,
  away: SideState,
  random: NamedRandomStreams,
): NonNullable<MatchSimulationResult["shootout"]> {
  let homeShootout = 0;
  let awayShootout = 0;
  let kick = 1;
  const take = (side: SideState) => {
    const taker = random.pick(
      `shootout-taker:${side.side}:${kick}`,
      activePlayers(side).slice(0, 10),
    );
    const rating = playerRatingsById.get(taker.playerId);
    const probability = clamp(
      0.68 + ((rating?.attributes.mentality ?? 60) - 60) / 250,
      0.58,
      0.86,
    );
    const scored = random.chance(`shootout:${side.side}:${kick}`, probability);
    if (scored && side.side === "HOME") homeShootout += 1;
    if (scored && side.side === "AWAY") awayShootout += 1;
    event(
      state,
      120,
      "SHOOTOUT",
      "SHOOTOUT_KICK",
      side.side,
      side.team.teamId,
      `${side.team.fifaCode} ${scored ? "score" : "miss"} from the spot.`,
      { kick, scored, homeShootout, awayShootout },
      taker.playerId,
    );
  };
  while (kick <= 5 || homeShootout === awayShootout) {
    take(home);
    take(away);
    kick += 1;
  }
  return {
    home: homeShootout,
    away: awayShootout,
    winner: homeShootout > awayShootout ? "HOME" : "AWAY",
  };
}

export function simulateMatch(
  input: MatchSimulationInput,
): MatchSimulationResult {
  const parsed = MatchSimulationInputSchema.parse(input);
  if (parsed.homeTeamId === parsed.awayTeamId) {
    throw new Error("A match requires two different teams");
  }
  const random = new NamedRandomStreams(parsed.seed);
  const home = makeSide("HOME", parsed.homeTeamId);
  const away = makeSide("AWAY", parsed.awayTeamId);
  const state: EngineState = {
    sequence: 0,
    homeScore: 0,
    awayScore: 0,
    possession: random.chance("initial-possession", 0.5) ? "HOME" : "AWAY",
    events: [],
  };

  event(
    state,
    0,
    "REGULATION",
    "KICKOFF",
    state.possession,
    state.possession === "HOME" ? home.team.teamId : away.team.teamId,
    "The match clock starts from the headless engine.",
    { engineClock: "simulation", animationClock: "external" },
  );
  for (let minute = 1; minute <= 90; minute += 1) {
    tick(state, minute, "REGULATION", home, away, random);
    if (minute === 45) {
      event(
        state,
        minute,
        "REGULATION",
        "HALF_TIME",
        null,
        null,
        "Half-time.",
        {},
      );
    }
  }
  event(
    state,
    90,
    "REGULATION",
    "FULL_TIME",
    null,
    null,
    "Full-time in regulation.",
    {},
  );

  if (parsed.allowExtraTime && state.homeScore === state.awayScore) {
    event(
      state,
      90,
      "EXTRA_TIME",
      "EXTRA_TIME_START",
      null,
      null,
      "Extra time starts.",
      {},
    );
    for (let minute = 91; minute <= 120; minute += 1) {
      tick(state, minute, "EXTRA_TIME", home, away, random);
    }
  }

  const totalTicks =
    parsed.allowExtraTime && state.homeScore === state.awayScore ? 120 : 90;
  let shootout: MatchSimulationResult["shootout"] = null;
  if (parsed.allowShootout && state.homeScore === state.awayScore) {
    shootout = runShootout(state, home, away, random);
  }
  event(
    state,
    shootout ? 120 : totalTicks,
    "COMPLETE",
    "MATCH_END",
    null,
    null,
    "The immutable match event log is complete.",
    {
      winner:
        shootout?.winner ??
        (state.homeScore === state.awayScore
          ? "DRAW"
          : state.homeScore > state.awayScore
            ? "HOME"
            : "AWAY"),
    },
  );

  return {
    engineVersion: SIMULATION_ENGINE_VERSION,
    seed: parsed.seed,
    fixtureId: parsed.fixtureId,
    homeTeamId: parsed.homeTeamId,
    awayTeamId: parsed.awayTeamId,
    events: state.events,
    stats: {
      home: normalizeStats(home.stats, totalTicks),
      away: normalizeStats(away.stats, totalTicks),
    },
    finalScore: { home: state.homeScore, away: state.awayScore },
    shootout,
  };
}

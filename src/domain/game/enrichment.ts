import { squadByTeamId } from "../data-ingestion/data";
import { NamedRandomStreams } from "../simulation/random";
import { tournamentSnapshot } from "../tournament/data";

import type { MatchRecord, TournamentGameState } from "./schema";

export type TeamIdentityProfile = {
  teamId: string;
  title: string;
  temperament: string;
  attackingBias: number;
  possessionBias: number;
  pressingBias: number;
  riskBias: number;
  strengths: string[];
};

const identityProfiles: Record<string, Omit<TeamIdentityProfile, "teamId">> = {
  mexico: {
    title: "front-foot hosts",
    temperament: "Wide attacks, emotional momentum, and aggressive restarts.",
    attackingBias: 1.04,
    possessionBias: 1.02,
    pressingBias: 1.05,
    riskBias: 1.04,
    strengths: ["wide overloads", "set-piece pressure", "home rhythm"],
  },
  "south-africa": {
    title: "direct transition side",
    temperament: "Fast breaks and physical midfield duels.",
    attackingBias: 0.98,
    possessionBias: 0.94,
    pressingBias: 1.03,
    riskBias: 1.05,
    strengths: ["pace in space", "duels", "quick counters"],
  },
  "korea-republic": {
    title: "relentless pressers",
    temperament: "High running volume with quick vertical combinations.",
    attackingBias: 1.02,
    possessionBias: 1,
    pressingBias: 1.09,
    riskBias: 1.02,
    strengths: ["pressing", "stamina", "late runs"],
  },
  czechia: {
    title: "structured set-piece threat",
    temperament: "Compact blocks, aerial pressure, and patient possession.",
    attackingBias: 0.99,
    possessionBias: 1.01,
    pressingBias: 0.98,
    riskBias: 0.96,
    strengths: ["shape", "aerials", "dead balls"],
  },
  canada: {
    title: "vertical runners",
    temperament: "Direct speed, wing carries, and open-field pressure.",
    attackingBias: 1.03,
    possessionBias: 0.96,
    pressingBias: 1.04,
    riskBias: 1.06,
    strengths: ["pace", "wide breaks", "recovery speed"],
  },
  "bosnia-and-herzegovina": {
    title: "technical spine",
    temperament: "Central combinations and measured attacking phases.",
    attackingBias: 1,
    possessionBias: 1.03,
    pressingBias: 0.96,
    riskBias: 0.99,
    strengths: ["central craft", "tempo control", "box entries"],
  },
  qatar: {
    title: "compact underdogs",
    temperament: "Deep shape, narrow distances, and selective counters.",
    attackingBias: 0.92,
    possessionBias: 0.92,
    pressingBias: 0.94,
    riskBias: 0.95,
    strengths: ["low block", "discipline", "counter chances"],
  },
  switzerland: {
    title: "balanced tournament team",
    temperament:
      "Stable possession, disciplined defending, and clean restarts.",
    attackingBias: 1.01,
    possessionBias: 1.04,
    pressingBias: 1,
    riskBias: 0.96,
    strengths: ["balance", "experience", "game management"],
  },
  brazil: {
    title: "flair attack",
    temperament:
      "Inventive final-third play, quick combinations, and pressure through talent.",
    attackingBias: 1.12,
    possessionBias: 1.07,
    pressingBias: 1.03,
    riskBias: 1.04,
    strengths: ["flair", "1v1s", "chance creation"],
  },
  morocco: {
    title: "compact counter side",
    temperament:
      "Disciplined defensive spacing with dangerous breaks into the channels.",
    attackingBias: 1.01,
    possessionBias: 0.97,
    pressingBias: 1.02,
    riskBias: 0.94,
    strengths: ["compact block", "transition", "defensive duels"],
  },
  haiti: {
    title: "resilient outsiders",
    temperament:
      "Low-block survival, direct outlets, and opportunistic attacks.",
    attackingBias: 0.91,
    possessionBias: 0.9,
    pressingBias: 0.93,
    riskBias: 1,
    strengths: ["resilience", "counters", "scramble defending"],
  },
  scotland: {
    title: "physical crossing team",
    temperament: "Aggressive duels, early crosses, and crowd-feeding momentum.",
    attackingBias: 0.99,
    possessionBias: 0.96,
    pressingBias: 1.04,
    riskBias: 1.05,
    strengths: ["duels", "crosses", "second balls"],
  },
  "united-states": {
    title: "athletic press",
    temperament: "High-energy midfield pressure and vertical attacks.",
    attackingBias: 1.02,
    possessionBias: 0.99,
    pressingBias: 1.08,
    riskBias: 1.04,
    strengths: ["athleticism", "pressing", "transitions"],
  },
  paraguay: {
    title: "rugged game managers",
    temperament:
      "Physical defending, fouls in smart areas, and direct counters.",
    attackingBias: 0.96,
    possessionBias: 0.93,
    pressingBias: 1,
    riskBias: 0.98,
    strengths: ["physicality", "defensive blocks", "set plays"],
  },
  australia: {
    title: "direct battlers",
    temperament:
      "Aerial duels, territorial pressure, and disciplined defending.",
    attackingBias: 0.98,
    possessionBias: 0.94,
    pressingBias: 1.01,
    riskBias: 0.98,
    strengths: ["aerials", "shape", "direct pressure"],
  },
  turkiye: {
    title: "volatile creators",
    temperament: "Creative midfield surges with emotional swings.",
    attackingBias: 1.04,
    possessionBias: 1.02,
    pressingBias: 1,
    riskBias: 1.08,
    strengths: ["creativity", "long shots", "tempo changes"],
  },
  germany: {
    title: "structured machine",
    temperament:
      "Positional discipline, efficient chance creation, and repeatable patterns.",
    attackingBias: 1.06,
    possessionBias: 1.08,
    pressingBias: 1.04,
    riskBias: 0.97,
    strengths: ["structure", "press resistance", "shot volume"],
  },
  curacao: {
    title: "technical underdogs",
    temperament: "Patient touches, compact spells, and opportunistic breaks.",
    attackingBias: 0.93,
    possessionBias: 0.96,
    pressingBias: 0.93,
    riskBias: 1.01,
    strengths: ["technique", "compactness", "counter windows"],
  },
  "cote-divoire": {
    title: "power runners",
    temperament: "Ball-carrying power, direct attacks, and physical defending.",
    attackingBias: 1.03,
    possessionBias: 0.98,
    pressingBias: 1.02,
    riskBias: 1.03,
    strengths: ["power", "carries", "box pressure"],
  },
  ecuador: {
    title: "high-energy disruptors",
    temperament: "Athletic midfield pressure and fast wide attacks.",
    attackingBias: 1.01,
    possessionBias: 0.98,
    pressingBias: 1.06,
    riskBias: 1.02,
    strengths: ["duels", "pressing", "wide speed"],
  },
  netherlands: {
    title: "positional control",
    temperament:
      "Structured build-up, wide rotations, and calm chance creation.",
    attackingBias: 1.06,
    possessionBias: 1.09,
    pressingBias: 1.03,
    riskBias: 0.97,
    strengths: ["positional play", "build-up", "control"],
  },
  japan: {
    title: "technical accelerators",
    temperament:
      "Clean passing, sudden tempo changes, and disciplined pressing.",
    attackingBias: 1.03,
    possessionBias: 1.05,
    pressingBias: 1.07,
    riskBias: 0.98,
    strengths: ["technique", "pressing", "combination play"],
  },
  sweden: {
    title: "organized power",
    temperament: "Compact defending, aerial threat, and careful transitions.",
    attackingBias: 0.99,
    possessionBias: 0.98,
    pressingBias: 1,
    riskBias: 0.95,
    strengths: ["organization", "aerials", "defensive control"],
  },
  tunisia: {
    title: "compact spoilers",
    temperament: "Low-risk defending and patient counters.",
    attackingBias: 0.95,
    possessionBias: 0.94,
    pressingBias: 0.97,
    riskBias: 0.94,
    strengths: ["defensive spacing", "patience", "set pieces"],
  },
  belgium: {
    title: "technical chance makers",
    temperament:
      "Creative passing, experienced forwards, and controlled possession.",
    attackingBias: 1.05,
    possessionBias: 1.05,
    pressingBias: 0.99,
    riskBias: 1,
    strengths: ["creativity", "final pass", "experience"],
  },
  egypt: {
    title: "star-led counters",
    temperament: "Compact defending with fast breaks through elite attackers.",
    attackingBias: 1,
    possessionBias: 0.95,
    pressingBias: 0.97,
    riskBias: 0.96,
    strengths: ["counter threat", "wide breaks", "discipline"],
  },
  iran: {
    title: "deep-block battlers",
    temperament: "Compact defending, aerial duels, and direct release balls.",
    attackingBias: 0.96,
    possessionBias: 0.92,
    pressingBias: 0.96,
    riskBias: 0.93,
    strengths: ["low block", "aerials", "direct counters"],
  },
  "new-zealand": {
    title: "set-piece outsiders",
    temperament: "Direct play, second balls, and disciplined defensive work.",
    attackingBias: 0.91,
    possessionBias: 0.9,
    pressingBias: 0.92,
    riskBias: 0.95,
    strengths: ["set pieces", "work rate", "aerial duels"],
  },
  spain: {
    title: "possession artists",
    temperament:
      "High control, positional patience, and chance creation by overload.",
    attackingBias: 1.07,
    possessionBias: 1.13,
    pressingBias: 1.05,
    riskBias: 0.96,
    strengths: ["possession", "press resistance", "overloads"],
  },
  "cabo-verde": {
    title: "compact dreamers",
    temperament: "Defensive patience and sharp breaks when space appears.",
    attackingBias: 0.93,
    possessionBias: 0.91,
    pressingBias: 0.92,
    riskBias: 0.98,
    strengths: ["compactness", "spirit", "counters"],
  },
  "saudi-arabia": {
    title: "tempo disruptors",
    temperament: "Quick possession spells and brave defensive stepping.",
    attackingBias: 0.97,
    possessionBias: 0.99,
    pressingBias: 1,
    riskBias: 1.03,
    strengths: ["tempo", "pressing waves", "bravery"],
  },
  uruguay: {
    title: "ruthless competitors",
    temperament: "Aggressive duels, transition quality, and tournament edge.",
    attackingBias: 1.04,
    possessionBias: 0.99,
    pressingBias: 1.05,
    riskBias: 1.02,
    strengths: ["duels", "transition", "mentality"],
  },
  france: {
    title: "elite transition force",
    temperament: "Explosive attacks, deep squad quality, and clinical moments.",
    attackingBias: 1.11,
    possessionBias: 1.04,
    pressingBias: 1.03,
    riskBias: 1,
    strengths: ["pace", "depth", "finishing"],
  },
  senegal: {
    title: "powerful transition team",
    temperament: "Physical midfield control and fast attacks into space.",
    attackingBias: 1.02,
    possessionBias: 0.98,
    pressingBias: 1.03,
    riskBias: 1,
    strengths: ["power", "transitions", "defensive duels"],
  },
  iraq: {
    title: "organized challengers",
    temperament: "Compact shape, emotional pressure, and direct counters.",
    attackingBias: 0.94,
    possessionBias: 0.91,
    pressingBias: 0.96,
    riskBias: 1.01,
    strengths: ["organization", "counters", "set pieces"],
  },
  norway: {
    title: "vertical power",
    temperament: "Direct supply, box presence, and early forward passes.",
    attackingBias: 1.03,
    possessionBias: 0.96,
    pressingBias: 0.99,
    riskBias: 1,
    strengths: ["verticality", "box threat", "direct supply"],
  },
  argentina: {
    title: "champion control",
    temperament:
      "Game intelligence, compact possession, and decisive star moments.",
    attackingBias: 1.09,
    possessionBias: 1.08,
    pressingBias: 1.02,
    riskBias: 0.95,
    strengths: ["control", "final-third craft", "game management"],
  },
  algeria: {
    title: "flair transitions",
    temperament: "Technical counters and brave attacking carries.",
    attackingBias: 1.01,
    possessionBias: 0.99,
    pressingBias: 0.99,
    riskBias: 1.03,
    strengths: ["flair", "carries", "transition shots"],
  },
  austria: {
    title: "pressing machine",
    temperament:
      "Coordinated pressure, compact distances, and repeatable attacks.",
    attackingBias: 1.02,
    possessionBias: 1.01,
    pressingBias: 1.09,
    riskBias: 0.99,
    strengths: ["pressing", "structure", "counter-press"],
  },
  jordan: {
    title: "compact runners",
    temperament: "Disciplined defending and quick runners from deep.",
    attackingBias: 0.93,
    possessionBias: 0.9,
    pressingBias: 0.94,
    riskBias: 0.99,
    strengths: ["discipline", "pace", "counters"],
  },
  portugal: {
    title: "technical finishers",
    temperament: "Creative possession, elite attackers, and flexible tempo.",
    attackingBias: 1.08,
    possessionBias: 1.07,
    pressingBias: 1.02,
    riskBias: 0.99,
    strengths: ["finishing", "creativity", "wide talent"],
  },
  "congo-dr": {
    title: "physical breakers",
    temperament: "Power carries, transition attacks, and duel-heavy phases.",
    attackingBias: 0.98,
    possessionBias: 0.92,
    pressingBias: 0.98,
    riskBias: 1.06,
    strengths: ["power", "duels", "transition runs"],
  },
  uzbekistan: {
    title: "disciplined risers",
    temperament: "Compact possession and patient progression.",
    attackingBias: 0.96,
    possessionBias: 0.98,
    pressingBias: 0.96,
    riskBias: 0.96,
    strengths: ["discipline", "patience", "spacing"],
  },
  colombia: {
    title: "rhythm attackers",
    temperament: "Creative rhythm, wide flair, and pressure through momentum.",
    attackingBias: 1.05,
    possessionBias: 1.03,
    pressingBias: 1.01,
    riskBias: 1.02,
    strengths: ["rhythm", "wide flair", "chance creation"],
  },
  england: {
    title: "balanced contenders",
    temperament: "Control, set-piece threat, and deep attacking options.",
    attackingBias: 1.07,
    possessionBias: 1.05,
    pressingBias: 1.02,
    riskBias: 0.98,
    strengths: ["depth", "set pieces", "control"],
  },
  croatia: {
    title: "midfield chess side",
    temperament:
      "Tempo control, experienced possession, and knockout patience.",
    attackingBias: 1.01,
    possessionBias: 1.07,
    pressingBias: 0.97,
    riskBias: 0.94,
    strengths: ["midfield control", "experience", "composure"],
  },
  ghana: {
    title: "chaos runners",
    temperament: "Athletic breaks, emotional momentum, and open games.",
    attackingBias: 1,
    possessionBias: 0.94,
    pressingBias: 1.01,
    riskBias: 1.08,
    strengths: ["pace", "transitions", "duels"],
  },
  panama: {
    title: "stubborn outsiders",
    temperament: "Physical defending, direct play, and set-piece belief.",
    attackingBias: 0.92,
    possessionBias: 0.89,
    pressingBias: 0.94,
    riskBias: 1,
    strengths: ["physicality", "set pieces", "resilience"],
  },
};

function teamName(teamId: string | null | undefined) {
  return teamId
    ? (tournamentSnapshot.teams.find((team) => team.id === teamId)?.name ??
        teamId)
    : "TBD";
}

export function getTeamIdentity(teamId: string): TeamIdentityProfile {
  const profile = identityProfiles[teamId] ?? {
    title: "balanced side",
    temperament: "A balanced match plan that adapts to the opponent.",
    attackingBias: 1,
    possessionBias: 1,
    pressingBias: 1,
    riskBias: 1,
    strengths: ["balance", "discipline", "adaptability"],
  };
  return { teamId, ...profile };
}

export function squadCondition(state: TournamentGameState, teamId: string) {
  const matchesPlayed = [
    ...state.groupMatches,
    ...state.knockoutMatches,
  ].filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  ).length;
  const identity = getTeamIdentity(teamId);
  const random = new NamedRandomStreams(`${state.seed}:condition:${teamId}`);
  const fatigue = Math.min(
    0.42,
    matchesPlayed * 0.045 * (identity.pressingBias > 1.05 ? 1.12 : 1),
  );
  const injuryRisk = Math.min(
    0.36,
    matchesPlayed * 0.025 * identity.riskBias + random.next("injury") * 0.08,
  );
  const squad = squadByTeamId.get(teamId) ?? [];
  const injuries =
    injuryRisk > 0.16 && squad.length
      ? [
          squad[
            Math.floor(random.next("injured-player") * squad.length) %
              squad.length
          ].displayName,
        ]
      : [];
  return {
    fatigue,
    injuryRisk,
    injuries,
    label:
      fatigue > 0.28
        ? "Heavy legs"
        : fatigue > 0.14
          ? "Managed minutes"
          : "Fresh",
  };
}

export function penaltyShootoutForMatch(match: MatchRecord) {
  const isKnockout = match.stage !== "GROUP";
  if (
    !match.winnerTeamId ||
    match.homeGoals !== match.awayGoals ||
    !isKnockout
  ) {
    return null;
  }
  const random = new NamedRandomStreams(`${match.seed}:shootout`);
  const kicks = Array.from({ length: 10 }).map((_, index) => {
    const side = index % 2 === 0 ? "HOME" : "AWAY";
    const teamId = side === "HOME" ? match.homeTeamId : match.awayTeamId;
    const scored = random.chance(`kick:${index}`, 0.74);
    return { index: index + 1, scored, teamId };
  });
  return {
    kicks,
    winnerTeamId: match.winnerTeamId,
    summary: `${teamName(match.winnerTeamId)} advance on penalties.`,
  };
}

export function postMatchReview(
  match: MatchRecord,
  userTeamId: string,
  nextMatch: { homeTeamId: string | null; awayTeamId: string | null } | null,
) {
  const isUserHome = match.homeTeamId === userTeamId;
  const userGoals = isUserHome ? match.homeGoals : match.awayGoals;
  const opponentGoals = isUserHome ? match.awayGoals : match.homeGoals;
  const userWin =
    match.winnerTeamId === userTeamId ||
    (!match.winnerTeamId && userGoals > opponentGoals);
  const userLoss =
    match.loserTeamId === userTeamId ||
    (!match.winnerTeamId && userGoals < opponentGoals);
  const odds = isUserHome
    ? match.prematchOdds.homeWin
    : match.prematchOdds.awayWin;
  const rating = Math.max(
    4.8,
    Math.min(
      9.8,
      6.2 +
        (userGoals - opponentGoals) * 0.9 +
        (userWin ? 1.1 : 0) -
        (userLoss ? 0.8 : 0) +
        (odds < 0.35 && userWin ? 0.8 : 0),
    ),
  );
  const opponentId = isUserHome ? match.awayTeamId : match.homeTeamId;
  const nextOpponent =
    nextMatch?.homeTeamId === userTeamId
      ? nextMatch.awayTeamId
      : nextMatch?.awayTeamId === userTeamId
        ? nextMatch.homeTeamId
        : null;

  return {
    rating,
    headline: userWin
      ? `${teamName(userTeamId)} got the job done.`
      : userLoss
        ? `${teamName(userTeamId)} were punished in the key moments.`
        : `${teamName(userTeamId)} leave with a point.`,
    keyMoments: [
      `${teamName(userTeamId)} finished with ${userGoals} goal${userGoals === 1 ? "" : "s"}.`,
      `${teamName(opponentId)} created enough pressure to score ${opponentGoals}.`,
      odds < 0.38
        ? "The result came against the pre-match balance."
        : "The result stayed close to the pre-match balance.",
    ],
    why: userWin
      ? "You protected the decisive phases and converted enough pressure into goals."
      : userLoss
        ? "The opponent won the most valuable moments: box entries, transitions, or late pressure."
        : "Neither side separated clearly enough in chance quality.",
    nextOpponentText: nextOpponent
      ? `Next up: ${teamName(nextOpponent)}.`
      : "No next fixture is available yet.",
  };
}

export function tournamentNews(state: TournamentGameState, limit = 6) {
  const matches = [...state.groupMatches, ...state.knockoutMatches].slice(-18);
  const items = matches
    .map((match) => {
      const shootout = penaltyShootoutForMatch(match);
      if (shootout) return shootout.summary;
      const homeOdds = match.prematchOdds.homeWin;
      const awayOdds = match.prematchOdds.awayWin;
      const homeWon =
        match.winnerTeamId === match.homeTeamId ||
        (!match.winnerTeamId && match.homeGoals > match.awayGoals);
      const awayWon =
        match.winnerTeamId === match.awayTeamId ||
        (!match.winnerTeamId && match.awayGoals > match.homeGoals);
      if (homeWon && homeOdds < 0.33) {
        return `${teamName(match.homeTeamId)} stun ${teamName(match.awayTeamId)}.`;
      }
      if (awayWon && awayOdds < 0.33) {
        return `${teamName(match.awayTeamId)} upset ${teamName(match.homeTeamId)}.`;
      }
      if (Math.abs(match.homeGoals - match.awayGoals) >= 3) {
        const winner =
          match.homeGoals > match.awayGoals
            ? match.homeTeamId
            : match.awayTeamId;
        return `${teamName(winner)} make a statement with a heavy win.`;
      }
      if (match.homeGoals === match.awayGoals) {
        return `${teamName(match.homeTeamId)} and ${teamName(match.awayTeamId)} cancel each other out.`;
      }
      const winner =
        match.homeGoals > match.awayGoals ? match.homeTeamId : match.awayTeamId;
      return `${teamName(winner)} edge a tense match.`;
    })
    .reverse();
  return [...new Set(items)].slice(0, limit);
}

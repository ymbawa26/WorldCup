import type { MatchSimulationResult } from "./schema";

export function validateMatchSimulation(result: MatchSimulationResult) {
  const failures: string[] = [];
  result.events.forEach((event, index) => {
    if (event.sequence !== index) {
      failures.push(`Event ${event.id} has non-contiguous sequence`);
    }
    if (index > 0 && event.minute < result.events[index - 1]!.minute) {
      failures.push(`Event ${event.id} moves time backwards`);
    }
  });
  const goalEvents = result.events.filter((event) => event.type === "GOAL");
  if (goalEvents.length !== result.finalScore.home + result.finalScore.away) {
    failures.push("Final score does not match goal events");
  }
  if (result.stats.home.shotsOnTarget > result.stats.home.shots) {
    failures.push("Home shots on target exceed shots");
  }
  if (result.stats.away.shotsOnTarget > result.stats.away.shots) {
    failures.push("Away shots on target exceed shots");
  }
  const possessionTotal =
    result.stats.home.possessionShare + result.stats.away.possessionShare;
  if (Math.abs(possessionTotal - 1) > 0.02) {
    failures.push(`Possession shares do not sum to one: ${possessionTotal}`);
  }
  const substitutions = result.events.filter(
    (event) => event.type === "SUBSTITUTION",
  );
  for (const side of ["HOME", "AWAY"] as const) {
    if (substitutions.filter((event) => event.side === side).length > 5) {
      failures.push(`${side} used more than five substitutions`);
    }
  }
  if (result.shootout && result.finalScore.home !== result.finalScore.away) {
    failures.push("Shootout exists for a non-drawn match score");
  }
  return { passed: failures.length === 0, failures };
}

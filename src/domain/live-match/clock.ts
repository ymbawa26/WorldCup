export type MatchClockSpeed = 0.5 | 1 | 2;

export type MatchPresentationState =
  | "RUNNING"
  | "USER_PAUSED"
  | "EVENT_PAUSED"
  | "HALFTIME"
  | "FULLTIME";

export type MatchClockSnapshot = {
  simulatedMinute: number;
  speed: MatchClockSpeed;
  presentationState: MatchPresentationState;
};

export type MatchClock = {
  snapshot: () => MatchClockSnapshot;
  start: (nowMs: number) => void;
  pause: (nowMs: number) => void;
  resume: (nowMs: number) => void;
  setSpeed: (speed: MatchClockSpeed, nowMs: number) => void;
  tick: (nowMs: number) => MatchClockSnapshot;
  enqueueEventPause: (durationMs: number, nowMs: number) => void;
};

export function createMatchClock(): MatchClock {
  throw new Error(
    "Stage 2 target: implement wall-clock-driven match timing with pause, speed, and event queues.",
  );
}

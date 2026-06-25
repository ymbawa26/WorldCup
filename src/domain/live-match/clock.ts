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

function assertFiniteTime(nowMs: number) {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error("Match clock time must be a non-negative finite number");
  }
}

function assertMonotonic(nowMs: number, lastNowMs: number) {
  if (nowMs < lastNowMs) {
    throw new Error("Match clock cannot move backwards");
  }
}

function roundMinute(value: number) {
  return Number(value.toFixed(6));
}

function clampFullTime(value: number) {
  return Math.min(value, 90);
}

export function createMatchClock(): MatchClock {
  let simulatedMinute = 0;
  let speed: MatchClockSpeed = 1;
  let presentationState: MatchPresentationState = "USER_PAUSED";
  let lastNowMs = 0;
  let started = false;
  const eventPauseQueue: number[] = [];
  let activeEventPauseRemainingMs = 0;

  const snapshot = (): MatchClockSnapshot => ({
    simulatedMinute: roundMinute(simulatedMinute),
    speed,
    presentationState,
  });

  const advanceRunningTime = (nowMs: number) => {
    const realElapsedMs = nowMs - lastNowMs;
    if (realElapsedMs <= 0) return;
    simulatedMinute = clampFullTime(
      simulatedMinute + (realElapsedMs * speed) / 1000,
    );
    lastNowMs = nowMs;
    if (simulatedMinute >= 90) {
      presentationState = "FULLTIME";
    }
  };

  const startNextEventPause = () => {
    if (simulatedMinute >= 90) {
      presentationState = "FULLTIME";
      return;
    }
    const nextDuration = eventPauseQueue.shift();
    if (nextDuration === undefined) {
      presentationState = "RUNNING";
      return;
    }
    activeEventPauseRemainingMs = nextDuration;
    presentationState = "EVENT_PAUSED";
  };

  const consumeEventPauseTime = (nowMs: number) => {
    let elapsedMs = nowMs - lastNowMs;
    if (elapsedMs <= 0) return;

    while (elapsedMs > 0 && presentationState === "EVENT_PAUSED") {
      if (elapsedMs < activeEventPauseRemainingMs) {
        activeEventPauseRemainingMs -= elapsedMs;
        lastNowMs = nowMs;
        return;
      }

      elapsedMs -= activeEventPauseRemainingMs;
      lastNowMs = nowMs - elapsedMs;
      activeEventPauseRemainingMs = 0;
      startNextEventPause();
    }

    if (elapsedMs > 0 && presentationState === "RUNNING") {
      advanceRunningTime(nowMs);
    }
  };

  const tick = (nowMs: number) => {
    assertFiniteTime(nowMs);
    assertMonotonic(nowMs, lastNowMs);

    if (!started) {
      lastNowMs = nowMs;
      return snapshot();
    }

    if (presentationState === "RUNNING") {
      advanceRunningTime(nowMs);
    } else if (presentationState === "EVENT_PAUSED") {
      consumeEventPauseTime(nowMs);
    } else {
      lastNowMs = nowMs;
    }

    return snapshot();
  };

  return {
    snapshot,
    start(nowMs) {
      assertFiniteTime(nowMs);
      assertMonotonic(nowMs, lastNowMs);
      started = true;
      lastNowMs = nowMs;
      presentationState =
        eventPauseQueue.length > 0 ? "EVENT_PAUSED" : "RUNNING";
      if (
        presentationState === "EVENT_PAUSED" &&
        activeEventPauseRemainingMs === 0
      ) {
        startNextEventPause();
      }
    },
    pause(nowMs) {
      tick(nowMs);
      if (presentationState === "FULLTIME") return;
      presentationState = "USER_PAUSED";
    },
    resume(nowMs) {
      assertFiniteTime(nowMs);
      assertMonotonic(nowMs, lastNowMs);
      lastNowMs = nowMs;
      if (presentationState === "FULLTIME") return;
      if (simulatedMinute >= 90) {
        presentationState = "FULLTIME";
        return;
      }
      if (activeEventPauseRemainingMs > 0 || eventPauseQueue.length > 0) {
        if (activeEventPauseRemainingMs === 0) startNextEventPause();
        else presentationState = "EVENT_PAUSED";
        return;
      }
      presentationState = "RUNNING";
      started = true;
    },
    setSpeed(nextSpeed, nowMs) {
      tick(nowMs);
      speed = nextSpeed;
    },
    tick,
    enqueueEventPause(durationMs, nowMs) {
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new Error(
          "Event pause duration must be a positive finite number",
        );
      }
      tick(nowMs);
      eventPauseQueue.push(durationMs);
      if (presentationState === "RUNNING") {
        startNextEventPause();
        lastNowMs = nowMs;
      }
    },
  };
}

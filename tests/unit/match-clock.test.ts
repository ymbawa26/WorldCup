import { describe, expect, it } from "vitest";

import { createMatchClock } from "@/domain/live-match/clock";

describe("live match clock contract", () => {
  it("advances one simulated minute for each real second at 1x", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.tick(15_000);

    expect(clock.snapshot().simulatedMinute).toBeCloseTo(15, 3);
  });

  it("scales elapsed real time by speed", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.setSpeed(2, 0);
    clock.tick(45_000);

    expect(clock.snapshot().simulatedMinute).toBeCloseTo(90, 3);
  });

  it("runs half speed without relying on interval drift", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.setSpeed(0.5, 0);
    clock.tick(180_000);

    expect(clock.snapshot().simulatedMinute).toBeCloseTo(90, 3);
  });

  it("does not advance while user-paused", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.tick(20_000);
    clock.pause(20_000);
    clock.tick(70_000);

    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 20,
      presentationState: "USER_PAUSED",
    });
  });

  it("processes event pauses without skipping simulated time", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.tick(10_000);
    clock.enqueueEventPause(2_000, 10_000);
    clock.tick(11_000);
    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 10,
      presentationState: "EVENT_PAUSED",
    });

    clock.tick(12_000);
    clock.tick(13_000);
    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 11,
      presentationState: "RUNNING",
    });
  });

  it("queues overlapping event pauses instead of stacking broken timers", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.tick(5_000);
    clock.enqueueEventPause(2_000, 5_000);
    clock.enqueueEventPause(2_000, 5_100);
    clock.tick(7_000);
    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 5,
      presentationState: "EVENT_PAUSED",
    });

    clock.tick(9_000);
    clock.tick(10_000);
    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 6,
      presentationState: "RUNNING",
    });
  });

  it("caps a regulation clock at full time", () => {
    const clock = createMatchClock();

    clock.start(0);
    clock.tick(120_000);

    expect(clock.snapshot()).toMatchObject({
      simulatedMinute: 90,
      presentationState: "FULLTIME",
    });
  });
});

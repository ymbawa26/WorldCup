import { describe, expect, it } from "vitest";

import { buildCalibrationReport } from "@/domain/probability/calibration";
import { probabilityCalibrationReport } from "@/domain/probability/data";

describe("probability calibration report", () => {
  it("loads the generated internal calibration report", () => {
    expect(probabilityCalibrationReport.passed).toBe(true);
    expect(probabilityCalibrationReport.bands).toHaveLength(5);
    expect(
      probabilityCalibrationReport.bands.every(
        (band) =>
          band.meanAbsoluteError <= probabilityCalibrationReport.tolerance,
      ),
    ).toBe(true);
  });

  it("can regenerate a smaller report deterministically for test speed", () => {
    const first = buildCalibrationReport({ samples: 24 });
    const second = buildCalibrationReport({ samples: 24 });

    expect(second).toEqual(first);
    expect(first.bands.every((band) => band.samples === 24)).toBe(true);
  });
});

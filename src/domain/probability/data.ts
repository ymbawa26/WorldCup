import calibrationJson from "../../../data/reports/probability-calibration.json";

import { CalibrationReportSchema } from "./schema";

export const probabilityCalibrationReport =
  CalibrationReportSchema.parse(calibrationJson);

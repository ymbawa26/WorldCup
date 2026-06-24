import path from "node:path";

export const ROOT = process.cwd();
export const RAW_DIRECTORY = path.join(ROOT, "data/raw");
export const RAW_SQUAD_PDF = path.join(
  RAW_DIRECTORY,
  "fifa-official-squads-2026-06-02-v1.pdf",
);
export const RAW_EXTRACT = path.join(
  ROOT,
  "data/normalized/official-squads-raw.json",
);
export const NORMALIZED_SQUADS = path.join(
  ROOT,
  "data/normalized/official-squads.json",
);
export const QUALITY_REPORT = path.join(
  ROOT,
  "data/reports/squad-data-quality.json",
);
export const QUALITY_REPORT_MARKDOWN = path.join(
  ROOT,
  "data/reports/squad-data-quality.md",
);
export const WORKBOOK_PATH = path.join(
  ROOT,
  "exports/world-cup-simulation-data.xlsx",
);

export const TOURNAMENT_START_DATE = "2026-06-11";
export const DATA_VERSION = "2026.06.02-official-squads-v1";

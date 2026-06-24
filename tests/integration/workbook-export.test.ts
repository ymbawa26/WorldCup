import path from "node:path";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

describe("Excel data product", () => {
  it("contains the required formatted sheets and complete player export", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.resolve("exports/world-cup-simulation-data.xlsx"),
    );
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Teams",
      "Players",
      "Player Ratings",
      "Team Ratings",
      "Groups",
      "Fixtures",
      "Tactical Profiles",
      "Discipline Profiles",
      "Injury Profiles",
      "Data Dictionary",
      "Sources",
      "Model Parameters",
    ]);
    const players = workbook.getWorksheet("Players")!;
    expect(players.rowCount).toBe(1249);
    expect(players.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(players.autoFilter).toBeTruthy();
    expect(players.getCell("F2").dataValidation).toMatchObject({
      type: "list",
    });
    expect(workbook.getWorksheet("Fixtures")!.rowCount).toBe(105);
  });
});

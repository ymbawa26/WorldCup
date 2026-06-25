import { NextResponse } from "next/server";

import { listRosterTeams } from "@/domain/rosters/service";

export function GET() {
  return NextResponse.json({
    teams: listRosterTeams(),
  });
}

import { NextResponse } from "next/server";

import { getTeamRoster } from "@/domain/rosters/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    return NextResponse.json(getTeamRoster(teamId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown team" },
      { status: 404 },
    );
  }
}

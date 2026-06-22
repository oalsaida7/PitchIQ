import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();

    // Mock analytical engine data mapping perfectly to the frontend requirements
    const data: Record<string, any> = {
      prediction: "2–1",
      homeWin: 48,
      draw: 22,
      awayWin: 30,
      homeScorerPred: `• ${match.home}: Primary Striker (Expected 34', Assist: Winger)`,
      awayScorerPred: `• ${match.away}: Attacking Midfield (Expected 61', Penalty)`,
      reasoning: `Analytical tracking models predict structural vulnerabilities in defensive transition matrices. Low block shapes are highly favored to neutralize counter-attack sequences.`,
      reviewText: `Match concluded. Heavy emphasis on tactical pressing in central channels resulted in an optimal conversion distribution.`,
      manOfMatch: `${match.home} Captain`,
    };

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Prediction matrix failure" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Search for Teams/Clubs matching the query
    const teamRes = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { "x-rapidapi-key": apiKey!, "x-rapidapi-host": "v3.football.api-sports.io" }
    });
    const teamData = await teamRes.json();

    // 2. Format the results cleanly for the PitchIQ UI
    const formattedTeams = (teamData.response || []).map((item: any) => ({
      name: item.team.name,
      type: "club",
      sub: `${item.team.country} · ${item.venue.name || "Global Stadium"}`,
      id: item.team.id,
      logo: item.team.logo
    }));

    return NextResponse.json({ results: formattedTeams });
  } catch (error) {
    return NextResponse.json({ results: [] });
  }
}
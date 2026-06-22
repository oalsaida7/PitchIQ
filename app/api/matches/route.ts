import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Get date from query string (e.g., ?date=2026-06-22) or default to today
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key configuration" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
      next: { revalidate: 15 }, // Automatically caches for 15 seconds, then updates live!
    });

    const rawData = await res.json();

    // Map the complex API response to a clean layout for our custom frontend
    const cleanMatches = (rawData.response || []).map((f: any) => ({
      id: f.fixture.id,
      status: f.fixture.status.short.toLowerCase() === "ft" ? "final" : f.fixture.status.elapsed ? "live" : "scheduled",
      liveMin: f.fixture.status.elapsed,
      kick: `KO · ${new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      league: f.league.name,
      leagueId: f.league.id,
      leagueName: f.league.name,
      leagueLogo: f.league.logo, // Actual league image banner!
      home: f.teams.home.name,
      homeAbbr: f.teams.home.name.slice(0, 3).toUpperCase(),
      homeLogo: f.teams.home.logo, // Actual club crest!
      away: f.teams.away.name,
      awayAbbr: f.teams.away.name.slice(0, 3).toUpperCase(),
      awayLogo: f.teams.away.logo, // Actual club crest!
      score: {
        home: f.goals.home ?? 0,
        away: f.goals.away ?? 0
      }
    }));

    return NextResponse.json({ matches: cleanMatches });
  } catch (error) {
    return NextResponse.json({ error: "Failed fetching live match data" }, { status: 500 });
  }
}
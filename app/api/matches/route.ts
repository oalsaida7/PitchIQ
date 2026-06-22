import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const apiKey = process.env.THESPORTSDB_KEY;

  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${dateStr}&s=Soccer`, {
      next: { revalidate: 30 }
    });
    const rawData = await res.json();

    if (!rawData.events) {
      return NextResponse.json({ matches: [] });
    }

    const cleanMatches = rawData.events.map((f: any) => ({
      id: f.idEvent,
      status: f.strStatus === "Match Finished" ? "final" : f.strStatus === "Not Started" ? "scheduled" : "live",
      liveMin: 45, 
      kick: `KO · ${f.strTime.substring(0, 5)}`,
      league: f.strLeague,
      leagueId: f.idLeague,
      leagueName: f.strLeague,
      leagueLogo: f.strLeagueBadge || "", 
      home: f.strHomeTeam,
      homeAbbr: f.strHomeTeam.slice(0, 3).toUpperCase(),
      homeLogo: f.strHomeTeamBadge || "",
      away: f.strAwayTeam,
      awayAbbr: f.strAwayTeam.slice(0, 3).toUpperCase(),
      awayLogo: f.strAwayTeamBadge || "",
      score: {
        home: f.intHomeScore ?? 0,
        away: f.intAwayScore ?? 0
      },
      ytLink: f.strVideo || null
    }));

    return NextResponse.json({ matches: cleanMatches });
  } catch (error) {
    return NextResponse.json({ error: "Failed fetching TheSportsDB data" }, { status: 500 });
  }
}
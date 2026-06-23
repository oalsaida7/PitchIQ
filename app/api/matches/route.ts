import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const apiKey = process.env.THESPORTSDB_KEY;

  try {
    // Using TheSportsDB Premium endpoint for daily events (includes live updates)
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${dateStr}&s=Soccer`, {
      next: { revalidate: 15 } // 15s cache for near real-time live polling
    });
    
    const rawData = await res.json();

    if (!rawData.events) {
      return NextResponse.json({ matches: [] });
    }

    const cleanMatches = rawData.events.map((f: any) => {
      // Premium API provides detailed status strings
      const isFinished = f.strStatus === "Match Finished" || f.strStatus === "FT";
      const isNotStarted = f.strStatus === "Not Started" || f.strStatus === "NS";
      const status = isFinished ? "final" : isNotStarted ? "scheduled" : "live";
      
      return {
        id: f.idEvent,
        status,
        liveMin: f.strProgress || "45", // Premium live minute telemetry
        kick: `KO · ${f.strTime ? f.strTime.substring(0, 5) : "TBD"}`,
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
          home: f.intHomeScore ? parseInt(f.intHomeScore) : 0,
          away: f.intAwayScore ? parseInt(f.intAwayScore) : 0
        },
        prob: { home: 45, draw: 25, away: 30 }, // Fallback probabilities before AI analysis
        ytLink: f.strVideo || null
      };
    });

    return NextResponse.json({ matches: cleanMatches });
  } catch (error) {
    console.error("TheSportsDB Error:", error);
    return NextResponse.json({ error: "Failed fetching TheSportsDB data" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const apiKey = process.env.THESPORTSDB_KEY;

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${dateStr}&s=Soccer`,
      { next: { revalidate: 30 } }
    );
    const rawData = await res.json();

    if (!rawData.events) {
      return NextResponse.json({ matches: [] });
    }

    const cleanMatches = rawData.events.map((f: Record<string, string | number | null>) => {
      const strStatus = String(f.strStatus || "");
      const strProgress = String(f.strProgress || "");

      let status: "scheduled" | "live" | "final" = "scheduled";
      if (strStatus === "Match Finished" || strStatus === "FT" || strStatus === "AET" || strStatus === "PEN") {
        status = "final";
      } else if (
        strStatus === "In Progress" || strStatus === "HT" ||
        strStatus === "1H" || strStatus === "2H" ||
        (strProgress && strProgress !== "" && strProgress !== "0")
      ) {
        status = "live";
      }

      let liveMin = "";
      if (status === "live") {
        if (strStatus === "HT") liveMin = "HT";
        else if (strProgress && strProgress !== "" && strProgress !== "0") liveMin = String(strProgress);
        else liveMin = "LIVE";
      }

      const homeScore = f.intHomeScore !== null && f.intHomeScore !== "" ? Number(f.intHomeScore) : null;
      const awayScore = f.intAwayScore !== null && f.intAwayScore !== "" ? Number(f.intAwayScore) : null;

      return {
        id: f.idEvent,
        status,
        liveMin,
        kick: f.strTime ? String(f.strTime).substring(0, 5) : "TBD",
        league: f.strLeague,
        leagueId: f.idLeague,
        leagueName: f.strLeague,
        leagueLogo: f.strLeagueBadge || "",
        leagueCountry: f.strCountry || "",
        home: f.strHomeTeam,
        homeAbbr: String(f.strHomeTeam || "").slice(0, 3).toUpperCase(),
        homeLogo: f.strHomeTeamBadge || "",
        away: f.strAwayTeam,
        awayAbbr: String(f.strAwayTeam || "").slice(0, 3).toUpperCase(),
        awayLogo: f.strAwayTeamBadge || "",
        score: {
          home: homeScore ?? 0,
          away: awayScore ?? 0,
        },
        hasScore: homeScore !== null && awayScore !== null,
        venue: f.strVenue || "",
        ytLink: f.strVideo || null,
      };
    });

    return NextResponse.json({ matches: cleanMatches });
  } catch {
    return NextResponse.json({ error: "Failed fetching TheSportsDB data" }, { status: 500 });
  }
}
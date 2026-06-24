import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  
  // Ensure we are using your exact Vercel environment variable
  const apiKey = process.env.THESPORTSDB_KEY;

  try {
    // We MUST use eventsday.php. This pulls the whole calendar so the tabs work!
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${dateStr}&s=Soccer`,
      { next: { revalidate: 30 } }
    );
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    
    const rawData = await res.json();

    if (!rawData.events) {
      return NextResponse.json({ matches: [] });
    }

    const cleanMatches = rawData.events.map((f: any) => {
      const strStatus = String(f.strStatus || "");
      const strProgress = String(f.strProgress || "");

      let status = "scheduled";
      if (strStatus === "Match Finished" || strStatus === "FT" || strStatus === "AET" || strStatus === "PEN") {
        status = "final";
      } else if (
        strStatus === "In Progress" || strStatus === "HT" ||
        strStatus === "1H" || strStatus === "2H" ||
        (strProgress && strProgress !== "0" && strProgress !== "")
      ) {
        status = "live";
      }

      let liveMin = "";
      if (status === "live") {
        if (strStatus === "HT") liveMin = "HT";
        else if (strProgress && strProgress !== "0") liveMin = strProgress;
        else liveMin = "LIVE";
      }

      const homeScore = f.intHomeScore !== null && f.intHomeScore !== "" ? Number(f.intHomeScore) : null;
      const awayScore = f.intAwayScore !== null && f.intAwayScore !== "" ? Number(f.intAwayScore) : null;

      // Extract raw goal scorers to feed the new timeline UI
      const timeline: any[] = [];
      const parseGoal = (goalStr: string, team: string) => {
        // Regex extracts name and minute (e.g. "Lionel Messi 45'")
        const match = goalStr.match(/([a-zA-Z\s.\-]+).*?(\d+)/);
        if (match) timeline.push({ type: "goal", team, playerName: match[1].trim(), min: match[2] });
        else timeline.push({ type: "goal", team, playerName: goalStr.replace(/'/g, "").replace(/:/g, "").trim(), min: "" });
      };

      if (f.strHomeGoalDetails) {
        f.strHomeGoalDetails.split(";").filter(Boolean).forEach((g: string) => parseGoal(g, "home"));
      }
      if (f.strAwayGoalDetails) {
        f.strAwayGoalDetails.split(";").filter(Boolean).forEach((g: string) => parseGoal(g, "away"));
      }

      return {
        id: f.idEvent,
        status,
        liveMin,
        kick: f.strTime ? String(f.strTime).substring(0, 5) : "TBD",
        league: f.strLeague,
        leagueId: f.idLeague,
        leagueName: f.strLeague,
        leagueLogo: f.strLeagueBadge || "",
        home: f.strHomeTeam,
        homeAbbr: String(f.strHomeTeam || "").slice(0, 3).toUpperCase(),
        homeLogo: f.strHomeTeamBadge || "",
        away: f.strAwayTeam,
        awayAbbr: String(f.strAwayTeam || "").slice(0, 3).toUpperCase(),
        awayLogo: f.strAwayTeamBadge || "",
        score: { home: homeScore ?? 0, away: awayScore ?? 0 },
        hasScore: homeScore !== null && awayScore !== null,
        venue: f.strVenue || "",
        timeline
      };
    });

    return NextResponse.json({ matches: cleanMatches });
  } catch (err) {
    console.error("Match fetch error:", err);
    return NextResponse.json({ matches: [] }); 
  }
}
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { match, type } = await request.json();
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const headers = { "x-rapidapi-key": rapidApiKey!, "x-rapidapi-host": "v3.football.api-sports.io" };
    let data: any = {};

    // Helper to safely pull specific stats from API-Football's array
    const getStat = (statsArray: any[], typeName: string) => {
      const stat = statsArray?.find((s: any) => s.type === typeName);
      if (!stat || stat.value === null) return 0;
      if (typeof stat.value === 'string' && stat.value.includes('%')) return parseInt(stat.value);
      return stat.value;
    };

    // 1. LIVE STATS ROUTE
    if (type === "stats") {
      const res = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.id}`, { headers });
      const json = await res.json();
      const homeStats = json.response?.[0]?.statistics || [];
      const awayStats = json.response?.[1]?.statistics || [];

      data = {
        possession: { home: getStat(homeStats, "Ball Possession") || 50, away: getStat(awayStats, "Ball Possession") || 50 },
        shots: { home: getStat(homeStats, "Total Shots"), away: getStat(awayStats, "Total Shots") },
        shotsOnTarget: { home: getStat(homeStats, "Shots on Goal"), away: getStat(awayStats, "Shots on Goal") },
        fouls: { home: getStat(homeStats, "Fouls"), away: getStat(awayStats, "Fouls") },
        corners: { home: getStat(homeStats, "Corner Kicks"), away: getStat(awayStats, "Corner Kicks") },
        offsides: { home: getStat(homeStats, "Offsides"), away: getStat(awayStats, "Offsides") },
        yellowCards: { home: getStat(homeStats, "Yellow Cards"), away: getStat(awayStats, "Yellow Cards") },
        redCards: { home: getStat(homeStats, "Red Cards"), away: getStat(awayStats, "Red Cards") },
        passes: { home: getStat(homeStats, "Total passes"), away: getStat(awayStats, "Total passes") },
        passAccuracy: { home: getStat(homeStats, "Passes %"), away: getStat(awayStats, "Passes %") },
      };
    }

    // 2. LIVE LINEUPS ROUTE
    else if (type === "lineup") {
      const res = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${match.id}`, { headers });
      const json = await res.json();
      const home = json.response?.[0];
      const away = json.response?.[1];

      const mapPlayer = (p: any) => ({ num: p.player.number, name: p.player.name, role: p.player.pos, pred: "" });

      data = {
        homeFormation: home?.formation || "TBD",
        awayFormation: away?.formation || "TBD",
        homeLineup: home?.startXI?.map(mapPlayer) || [],
        awayLineup: away?.startXI?.map(mapPlayer) || []
      };
    }

    // 3. LIVE LEAGUE TABLE ROUTE
    else if (type === "table") {
      // Find the current season year automatically
      const season = new Date().getFullYear(); 
      const res = await fetch(`https://v3.football.api-sports.io/standings?league=${match.leagueId}&season=${season}`, { headers });
      const json = await res.json();
      const standings = json.response?.[0]?.league?.standings?.[0] || [];

      data.teams = standings.map((t: any) => ({
        pos: t.rank,
        name: t.team.name,
        played: t.all.played,
        won: t.all.win,
        drawn: t.all.draw,
        lost: t.all.lose,
        pts: t.points
      }));
    }

    // 4. CLAUDE AI ANALYSIS ROUTE (Preview / Review)
    else if (type === "preview" || type === "review") {
      const prompt = type === "preview"
        ? `Analyze the upcoming football match between ${match.home} and ${match.away} in the ${match.league}. Provide a JSON response with exactly these keys: prediction (e.g. '2-1'), homeWin (number %), draw (number %), awayWin (number %), homeScorerPred (string predicting home scorer), awayScorerPred (string predicting away scorer), reasoning (string, 2 sentences tactical insight).`
        : `Analyze the finished football match between ${match.home} and ${match.away} (Score: ${match.score?.home}-${match.score?.away}). Provide a JSON response with exactly these keys: manOfMatch (string player name), reviewText (string, 3 sentences tactical review of how the game was played and how the losing team could improve).`;

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307", // Fast model for live UI
          max_tokens: 400,
          messages: [{ role: "user", content: prompt + " Respond ONLY with raw valid JSON. Do not include markdown formatting." }]
        })
      });

      const aiJson = await anthropicRes.json();
      const aiText = aiJson.content?.[0]?.text || "{}";
      
      // Safely extract the JSON out of Claude's response
      const cleanJsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const parsedAI = JSON.parse(cleanJsonStr);

      data = { ...data, ...parsedAI };
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Backend integration failure" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const apiKey = process.env.THESPORTSDB_KEY;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [playerRes, teamRes] = await Promise.all([
      fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(query)}`),
      fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(query)}`),
    ]);
    const [playerData, teamData] = await Promise.all([playerRes.json(), teamRes.json()]);

    const results: Array<{
      name: string; type: string; sub: string; id: string; logo: string;
      detail: Record<string, unknown>;
    }> = [];

    if (playerData.player) {
      playerData.player.slice(0, 4).forEach((p: Record<string, string>) => {
        results.push({
          name: p.strPlayer,
          type: "player",
          sub: `${p.strTeam || "Free Agent"} · ${p.strPosition || "Player"} · ${p.strNationality || ""}`,
          id: p.idPlayer,
          logo: p.strThumb || p.strCutout || "",
          detail: {
            position: p.strPosition,
            club: p.strTeam,
            nationality: p.strNationality,
            age: p.dateBorn ? String(new Date().getFullYear() - new Date(p.dateBorn).getFullYear()) : "—",
            height: p.strHeight,
            weight: p.strWeight,
            description: p.strDescriptionEN ? p.strDescriptionEN.slice(0, 300) + "..." : "",
            wage: p.strWage,
            signing: p.strSigning,
            thumb: p.strThumb || "",
          },
        });
      });
    }

    if (teamData.teams) {
      teamData.teams.slice(0, 4).forEach((t: Record<string, string>) => {
        results.push({
          name: t.strTeam,
          type: t.strSport === "Soccer" && t.strCountry && !t.strLeague?.toLowerCase().includes("national") ? "club" : "club",
          sub: `${t.strCountry || ""} · ${t.strLeague || ""}`,
          id: t.idTeam,
          logo: t.strTeamBadge || "",
          detail: {
            stadium: t.strStadium,
            capacity: t.intStadiumCapacity,
            founded: t.intFormedYear,
            manager: t.strManager,
            league: t.strLeague,
            country: t.strCountry,
            description: t.strDescriptionEN ? t.strDescriptionEN.slice(0, 300) + "..." : "",
            website: t.strWebsite,
            banner: t.strTeamBanner || "",
          },
        });
      });
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
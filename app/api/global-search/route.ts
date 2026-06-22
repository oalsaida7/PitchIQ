import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const apiKey = process.env.THESPORTSDB_KEY;

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.teams) {
      return NextResponse.json({ results: [] });
    }

    const formattedTeams = data.teams.map((item: any) => ({
      name: item.strTeam,
      type: "club",
      sub: `${item.strCountry} · ${item.strStadium || "Global Stadium"}`,
      id: item.idTeam,
      logo: item.strTeamBadge
    }));

    return NextResponse.json({ results: formattedTeams });
  } catch (error) {
    return NextResponse.json({ results: [] });
  }
}
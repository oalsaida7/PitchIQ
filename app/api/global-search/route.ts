import { NextResponse } from "next/server";

interface TSDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strTeam?: string;
  strTeam2?: string;
  strPosition?: string;
  strNationality?: string;
  dateBorn?: string;
  strHeight?: string;
  strWeight?: string;
  strDescriptionEN?: string;
  strThumb?: string;
  strCutout?: string;
  strWage?: string;
  strBirthLocation?: string;
  strAgent?: string;
  strNumber?: string;
  strSigning?: string;
  strOutfitter?: string;
  intLoved?: string;
  strSport?: string;
}

interface TSDBTeam {
  idTeam: string;
  strTeam: string;
  strAlternate?: string;
  strSport?: string;
  strLeague?: string;
  idLeague?: string;
  strStadium?: string;
  strStadiumThumb?: string;
  intStadiumCapacity?: string;
  strWebsite?: string;
  strDescriptionEN?: string;
  strTeamBadge?: string;
  strTeamJersey?: string;
  strTeamBanner?: string;
  strCountry?: string;
  intFormedYear?: string;
  strManager?: string;
  strRSS?: string;
  strFacebook?: string;
  strTwitter?: string;
  strInstagram?: string;
  strYoutube?: string;
  strKeywords?: string;
}

function calcAge(dateBorn: string | undefined): string {
  if (!dateBorn) return "—";
  const birth = new Date(dateBorn);
  if (isNaN(birth.getTime())) return "—";
  return String(new Date().getFullYear() - birth.getFullYear());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const apiKey = process.env.THESPORTSDB_KEY;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [playerRes, teamRes] = await Promise.all([
      fetch(
        `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(query)}`,
        { next: { revalidate: 60 } }
      ),
      fetch(
        `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(query)}`,
        { next: { revalidate: 60 } }
      ),
    ]);

    const [playerData, teamData] = await Promise.all([playerRes.json(), teamRes.json()]);

    const results: Array<{
      name: string;
      type: string;
      sub: string;
      id: string;
      logo: string;
      detail: Record<string, unknown>;
    }> = [];

    // ── PLAYERS ──────────────────────────────────────────────────────────────
    if (playerData.player) {
      (playerData.player as TSDBPlayer[]).slice(0, 4).forEach((p) => {
        if (p.strSport && p.strSport.toLowerCase() !== "soccer" && p.strSport.toLowerCase() !== "football") return;
        results.push({
          name: p.strPlayer,
          type: "player",
          sub: [p.strTeam, p.strPosition, p.strNationality].filter(Boolean).join(" · "),
          id: p.idPlayer,
          logo: p.strThumb || p.strCutout || "",
          detail: {
            // Raw TSDB fields — no fabrication
            position: p.strPosition || "—",
            club: p.strTeam || "—",
            formerClub: p.strTeam2 || "",
            nationality: p.strNationality || "—",
            age: calcAge(p.dateBorn),
            dateBorn: p.dateBorn || "",
            birthLocation: p.strBirthLocation || "",
            height: p.strHeight || "",
            weight: p.strWeight || "",
            number: p.strNumber || "",
            wage: p.strWage || "",
            signing: p.strSigning || "",
            agent: p.strAgent || "",
            description: p.strDescriptionEN
              ? p.strDescriptionEN.replace(/<[^>]*>/g, "").slice(0, 400)
              : "",
            thumb: p.strThumb || "",
          },
        });
      });
    }

    // ── TEAMS / CLUBS ─────────────────────────────────────────────────────────
    if (teamData.teams) {
      (teamData.teams as TSDBTeam[]).slice(0, 4).forEach((t) => {
        if (t.strSport && !["soccer", "football"].includes(t.strSport.toLowerCase())) return;
        results.push({
          name: t.strTeam,
          type: "club",
          sub: [t.strCountry, t.strLeague].filter(Boolean).join(" · "),
          id: t.idTeam,
          logo: t.strTeamBadge || "",
          detail: {
            stadium: t.strStadium || "—",
            capacity: t.intStadiumCapacity || "—",
            founded: t.intFormedYear || "—",
            manager: t.strManager || "—",
            league: t.strLeague || "—",
            country: t.strCountry || "—",
            website: t.strWebsite || "",
            description: t.strDescriptionEN
              ? t.strDescriptionEN.replace(/<[^>]*>/g, "").slice(0, 400)
              : "",
            banner: t.strTeamBanner || "",
            jersey: t.strTeamJersey || "",
          },
        });
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("global-search error:", err);
    return NextResponse.json({ results: [] });
  }
}
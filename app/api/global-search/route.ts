import { NextResponse } from "next/server";
import { slugifySearch, tsdbFetchV2, unwrapList } from "@/lib/tsdb";

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
  intStadiumCapacity?: string;
  strWebsite?: string;
  strDescriptionEN?: string;
  strTeamBadge?: string;
  strTeamBanner?: string;
  strCountry?: string;
  intFormedYear?: string;
  strManager?: string;
}

function calcAge(dateBorn: string | undefined): string {
  if (!dateBorn) return "—";
  const birth = new Date(dateBorn);
  if (isNaN(birth.getTime())) return "—";
  return String(new Date().getFullYear() - birth.getFullYear());
}

function isSoccer(sport: string | undefined): boolean {
  if (!sport) return true;
  const s = sport.toLowerCase();
  return s === "soccer" || s === "football";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const playerSlug = slugifySearch(query);
    const teamSlug = slugifySearch(query);

    const [playerData, teamData] = await Promise.all([
      tsdbFetchV2(`search/player/${playerSlug}`),
      tsdbFetchV2(`search/team/${teamSlug}`),
    ]);

    const players = unwrapList(playerData, ["search", "player", "lookup", "list"]) as TSDBPlayer[];
    const teams = unwrapList(teamData, ["search", "teams", "lookup", "list"]) as TSDBTeam[];

    const results: Array<{
      name: string;
      type: string;
      sub: string;
      id: string;
      logo: string;
      detail: Record<string, unknown>;
    }> = [];

    players
      .filter((p) => isSoccer(p.strSport))
      .slice(0, 5)
      .forEach((p) => {
        results.push({
          name: p.strPlayer,
          type: "player",
          sub: [p.strTeam, p.strPosition, p.strNationality].filter(Boolean).join(" · "),
          id: p.idPlayer,
          logo: p.strThumb || p.strCutout || "",
          detail: {
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
            cutout: p.strCutout || "",
          },
        });
      });

    teams
      .filter((t) => isSoccer(t.strSport))
      .slice(0, 5)
      .forEach((t) => {
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
            leagueId: t.idLeague || "",
            country: t.strCountry || "—",
            website: t.strWebsite || "",
            description: t.strDescriptionEN
              ? t.strDescriptionEN.replace(/<[^>]*>/g, "").slice(0, 400)
              : "",
            banner: t.strTeamBanner || "",
          },
        });
      });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("global-search error:", err);
    return NextResponse.json({ results: [] });
  }
}

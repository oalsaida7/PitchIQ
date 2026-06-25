import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CLAUDE_MODEL,
  decodeHtmlEntities,
  slugifySearch,
  tsdbFetchV2,
  unwrapList,
} from "@/lib/tsdb";

const client = new Anthropic();

interface TSDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strSport?: string;
  strTeam?: string;
  strPosition?: string;
  strNationality?: string;
  dateBorn?: string;
  strHeight?: string;
  strWeight?: string;
  strThumb?: string;
  strCutout?: string;
  strNumber?: string;
  strFoot?: string;
}

function calcAge(dateBorn: string | undefined): number | null {
  if (!dateBorn) return null;
  const birth = new Date(dateBorn);
  if (isNaN(birth.getTime())) return null;
  return new Date().getFullYear() - birth.getFullYear();
}

function defaultRatings(position: string) {
  const p = (position || "").toLowerCase();
  if (p.includes("forward") || p.includes("striker") || p.includes("wing")) {
    return { pace: 82, technical: 80, physical: 74, mental: 76, defending: 42, shooting: 84 };
  }
  if (p.includes("mid")) {
    return { pace: 74, technical: 82, physical: 72, mental: 80, defending: 62, shooting: 68 };
  }
  if (p.includes("def") || p.includes("back")) {
    return { pace: 70, technical: 68, physical: 78, mental: 76, defending: 84, shooting: 45 };
  }
  if (p.includes("goal")) {
    return { pace: 58, technical: 72, physical: 76, mental: 82, defending: 48, shooting: 38 };
  }
  return { pace: 75, technical: 78, physical: 74, mental: 76, defending: 55, shooting: 70 };
}

function hasValidRatings(ratings: unknown): ratings is Record<string, number> {
  if (!ratings || typeof ratings !== "object") return false;
  return Object.values(ratings as Record<string, number>).some(
    (v) => typeof v === "number" && v > 0
  );
}

async function searchPlayerV2(name: string): Promise<TSDBPlayer | null> {
  const slug = slugifySearch(name);
  const data = await tsdbFetchV2(`search/player/${slug}`);
  const players = unwrapList(data, ["search", "player", "lookup", "list"]) as TSDBPlayer[];
  if (!players.length) return null;

  const exact = players.find(
    (p) => p.strPlayer?.toLowerCase() === name.toLowerCase()
  );
  const soccer = players.find((p) =>
    /soccer|football/i.test(String(p.strSport || "soccer"))
  );
  return exact || soccer || players[0];
}

async function fetchPlayerStats(playerId: string) {
  const data = await tsdbFetchV2(`lookup/player_stats/${playerId}`);
  return unwrapList(data, ["stats", "playerstats", "lookup", "list"]) as Array<
    Record<string, string>
  >;
}

async function fetchYouTubeHighlight(playerName: string) {
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) return { url: null, title: null, thumb: null };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const q = encodeURIComponent(`${playerName} football highlights`);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${q}&type=video&key=${ytKey}&videoEmbeddable=true&relevanceLanguage=en`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return { url: null, title: null, thumb: null };

    const data = await res.json();
    const items = data.items || [];
    const best =
      items.find((it: { snippet: { title: string } }) =>
        /highlight|skill|goal/i.test(it.snippet.title)
      ) || items[0];

    if (!best?.id?.videoId) return { url: null, title: null, thumb: null };

    return {
      url: `https://www.youtube.com/watch?v=${best.id.videoId}`,
      title: decodeHtmlEntities(best.snippet.title),
      thumb: best.snippet.thumbnails?.default?.url || null,
    };
  } catch {
    return { url: null, title: null, thumb: null };
  }
}

async function askHaikuAnalysis(
  playerLabel: string,
  profile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are an elite football scout. Analyze ${playerLabel}.
Verified profile (use for facts, do not contradict):
${JSON.stringify(profile)}

Return ONLY raw JSON. No markdown. No backticks.
{
  "overall": 88,
  "hidden_gem": false,
  "ratings": {"pace": 90, "technical": 92, "physical": 78, "mental": 85, "defending": 40, "shooting": 86},
  "seasonStats": {"goals": 18, "assists": 12, "apps": 35, "avgRating": 7.8},
  "pastSeasonStats": [{"year": "2024/25", "club": "Club Name", "goals": 10, "assists": 8, "apps": 30}],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "style": "Two sentences on playing style.",
  "verdict": "Two sentences scout verdict on potential and market value."
}`,
        },
      ],
    });

    const rawText = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Scout AI error:", err);
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const query = name.trim();
    const realPlayer = await searchPlayerV2(query);

    let seasonStats = { goals: 0, assists: 0, apps: 0, avgRating: 0 };
    const pastSeasonStats: Array<Record<string, unknown>> = [];

    if (realPlayer?.idPlayer) {
      const statsRows = await fetchPlayerStats(realPlayer.idPlayer);
      if (statsRows.length) {
        const latest = statsRows[0];
        seasonStats = {
          goals: Number(latest.intGoals || latest.strGoals || 0),
          assists: Number(latest.intAssists || latest.strAssists || 0),
          apps: Number(latest.intAppearances || latest.strAppearances || 0),
          avgRating: Number(latest.strRating || 0) || 7.0,
        };
        statsRows.slice(0, 3).forEach((row, i) => {
          pastSeasonStats.push({
            year: String(row.strSeason || row.strYear || `Season ${i + 1}`),
            club: String(row.strTeam || realPlayer.strTeam || "—"),
            goals: Number(row.intGoals || 0),
            assists: Number(row.intAssists || 0),
            apps: Number(row.intAppearances || 0),
          });
        });
      }
    }

    const profile = {
      name: realPlayer?.strPlayer || query,
      club: realPlayer?.strTeam || "—",
      league: "",
      nationality: realPlayer?.strNationality || "—",
      position: realPlayer?.strPosition || "—",
      age: calcAge(realPlayer?.dateBorn),
      height: realPlayer?.strHeight || "—",
      weight: realPlayer?.strWeight || "—",
      preferredFoot: realPlayer?.strFoot || "—",
      number: realPlayer?.strNumber || "—",
      playerThumb: realPlayer?.strThumb || "",
      playerCutout: realPlayer?.strCutout || "",
      seasonStats,
      pastSeasonStats,
    };

    let ytLink: string | null = null;
    let ytTitle: string | null = null;
    let ytThumb: string | null = null;

    try {
      const yt = await fetchYouTubeHighlight(profile.name);
      ytLink = yt.url;
      ytTitle = yt.title;
      ytThumb = yt.thumb;
    } catch {
      ytLink = null;
    }

    const ai = await askHaikuAnalysis(profile.name, profile);
    const ratings = hasValidRatings(ai.ratings)
      ? (ai.ratings as Record<string, number>)
      : defaultRatings(profile.position);

    const report = {
      ...profile,
      overall:
        typeof ai.overall === "number" && ai.overall > 0
          ? ai.overall
          : Math.round(
              Object.values(ratings).reduce((a, b) => a + b, 0) /
                Object.values(ratings).length
            ),
      hidden_gem: Boolean(ai.hidden_gem),
      ratings,
      seasonStats:
        ai.seasonStats &&
        typeof ai.seasonStats === "object" &&
        (ai.seasonStats as { apps?: number }).apps !== undefined
          ? ai.seasonStats
          : profile.seasonStats,
      pastSeasonStats:
        Array.isArray(ai.pastSeasonStats) && ai.pastSeasonStats.length
          ? ai.pastSeasonStats
          : profile.pastSeasonStats,
      strengths:
        Array.isArray(ai.strengths) && ai.strengths.length
          ? ai.strengths
          : ["Technical quality", "Game intelligence", "Work rate"],
      weaknesses:
        Array.isArray(ai.weaknesses) && ai.weaknesses.length
          ? ai.weaknesses
          : ["Physical duels", "Consistency"],
      style:
        typeof ai.style === "string" && ai.style.length > 10
          ? ai.style
          : `${profile.name} is a ${profile.position} known for technical ability and tactical awareness at ${profile.club}.`,
      verdict:
        typeof ai.verdict === "string" && ai.verdict.length > 10
          ? ai.verdict
          : `Strong ${profile.position} profile with upside at the top level. Market value reflects current form and age.`,
      ytLink,
      ytTitle,
      ytThumb,
      hasHighlight: !!ytLink,
      aiGenerated: Object.keys(ai).length > 0,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CLAUDE_MODEL,
  decodeHtmlEntities,
  slugifySearch,
  tsdbFetchV1,
  tsdbFetchV2,
  unwrapList,
} from "@/lib/tsdb";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  strSide?: string;
  strFoot?: string;
  strDescriptionEN?: string;
}

interface SeasonStats {
  goals: number;
  assists: number;
  apps: number;
  avgRating: number;
}

function calcAge(dateBorn: string | undefined): number | null {
  if (!dateBorn) return null;
  const birth = new Date(dateBorn);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
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

function pickBestPlayer(players: TSDBPlayer[], query: string): TSDBPlayer | null {
  if (!players.length) return null;
  const soccerOnly = players.filter((p) =>
    /soccer|football/i.test(String(p.strSport || "Soccer"))
  );
  const pool = soccerOnly.length ? soccerOnly : players;
  const exact = pool.find(
    (p) => p.strPlayer?.toLowerCase() === query.toLowerCase()
  );
  const withTeam = pool.find((p) => p.strTeam && p.strTeam !== "_Retired Soccer");
  return exact || withTeam || pool[0];
}

async function searchPlayer(name: string): Promise<TSDBPlayer | null> {
  // Step 1 of the hybrid engine: real factual data from TheSportsDB (v2 first).
  const v2Data = await tsdbFetchV2(`search/player/${slugifySearch(name)}`);
  const v2Players = unwrapList(v2Data, ["search", "player", "lookup", "list"]) as TSDBPlayer[];
  const v2Pick = pickBestPlayer(v2Players, name);
  if (v2Pick) return v2Pick;

  // v1 fallback (uses the same premium key embedded in the URL).
  const v1Data = await tsdbFetchV1(
    `searchplayers.php?p=${encodeURIComponent(name)}`
  );
  const v1Players = unwrapList(v1Data, ["player", "players", "list"]) as TSDBPlayer[];
  return pickBestPlayer(v1Players, name);
}

async function fetchPlayerSeasonStats(playerId: string): Promise<{
  seasonStats: SeasonStats | null;
  pastSeasonStats: Array<Record<string, unknown>>;
}> {
  const data = await tsdbFetchV2(`lookup/player_stats/${playerId}`);
  const rows = unwrapList(data, ["stats", "playerstats", "lookup", "list"]) as Array<
    Record<string, string>
  >;
  if (!rows.length) return { seasonStats: null, pastSeasonStats: [] };

  const latest = rows[0];
  const seasonStats: SeasonStats = {
    goals: Number(latest.intGoals || latest.strGoals || 0) || 0,
    assists: Number(latest.intAssists || latest.strAssists || 0) || 0,
    apps: Number(latest.intAppearances || latest.strAppearances || 0) || 0,
    avgRating: Number(latest.strRating || 0) || 0,
  };

  const pastSeasonStats = rows.slice(0, 4).map((row, i) => ({
    year: String(row.strSeason || row.strYear || `Season ${i + 1}`),
    club: String(row.strTeam || "—"),
    goals: Number(row.intGoals || 0) || 0,
    assists: Number(row.intAssists || 0) || 0,
    apps: Number(row.intAppearances || 0) || 0,
  }));

  return { seasonStats, pastSeasonStats };
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

async function askClaudeAnalysis(
  factualProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Steps 2 & 3: hand Claude the verified SportsDB payload and ask for
  // analysis layered on top of it, never contradicting the facts.
  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are an elite football scout. Below is the VERIFIED factual profile of a player, fetched from TheSportsDB. These facts (club, country, position, height, weight, foot, statistics) are ground truth — repeat them exactly, never invent replacements for them.

VERIFIED_PROFILE:
${JSON.stringify(factualProfile, null, 2)}

Return ONLY a raw JSON object. No markdown, no backticks, no commentary. Use exactly this shape:
{
  "overall": <integer 40-99, your honest rating of the player's current level>,
  "hidden_gem": <true if under-24 and undervalued relative to ability, else false>,
  "ratings": {"pace": <1-99>, "technical": <1-99>, "physical": <1-99>, "mental": <1-99>, "defending": <1-99>, "shooting": <1-99>},
  "seasonStats": <copy VERIFIED_PROFILE.seasonStats exactly if its "apps" is greater than 0; otherwise provide your best real-world estimate for the current season>,
  "pastSeasonStats": <copy VERIFIED_PROFILE.pastSeasonStats exactly if non-empty; otherwise provide up to 3 real historical seasons you are confident about>,
  "strengths": ["<specific strength>", "<specific strength>", "<specific strength>"],
  "weaknesses": ["<specific weakness>", "<specific weakness>"],
  "style": "<two sentences describing the player's playing style>",
  "verdict": "<two sentences: scout verdict on potential, level, and market value>"
}`,
        },
      ],
    });

    const rawText = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Step 4: regex-extract the JSON body so stray prose never crashes the parse.
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
    const realPlayer = await searchPlayer(query);

    let seasonStats: SeasonStats = { goals: 0, assists: 0, apps: 0, avgRating: 0 };
    let pastSeasonStats: Array<Record<string, unknown>> = [];
    let hasRealStats = false;

    if (realPlayer?.idPlayer) {
      const stats = await fetchPlayerSeasonStats(realPlayer.idPlayer);
      if (stats.seasonStats && stats.seasonStats.apps > 0) {
        seasonStats = stats.seasonStats;
        pastSeasonStats = stats.pastSeasonStats;
        hasRealStats = true;
      }
    }

    const profile = {
      name: realPlayer?.strPlayer || query,
      club: realPlayer?.strTeam || "—",
      nationality: realPlayer?.strNationality || "—",
      position: realPlayer?.strPosition || "—",
      age: calcAge(realPlayer?.dateBorn),
      dateBorn: realPlayer?.dateBorn || "—",
      height: realPlayer?.strHeight || "—",
      weight: realPlayer?.strWeight || "—",
      preferredFoot: realPlayer?.strFoot || realPlayer?.strSide || "—",
      number: realPlayer?.strNumber || "—",
      playerThumb: realPlayer?.strThumb || "",
      playerCutout: realPlayer?.strCutout || "",
      seasonStats,
      pastSeasonStats,
    };

    const [yt, ai] = await Promise.all([
      fetchYouTubeHighlight(profile.name),
      askClaudeAnalysis({
        name: profile.name,
        club: profile.club,
        nationality: profile.nationality,
        position: profile.position,
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        preferredFoot: profile.preferredFoot,
        seasonStats: profile.seasonStats,
        pastSeasonStats: profile.pastSeasonStats,
      }),
    ]);

    const ratings = hasValidRatings(ai.ratings)
      ? (ai.ratings as Record<string, number>)
      : defaultRatings(profile.position);

    const aiSeasonStats = ai.seasonStats as SeasonStats | undefined;
    const aiPastSeasons = Array.isArray(ai.pastSeasonStats)
      ? (ai.pastSeasonStats as Array<Record<string, unknown>>)
      : [];

    const report = {
      // Real SportsDB facts always win over anything the model returned.
      ...profile,
      seasonStats: hasRealStats
        ? profile.seasonStats
        : aiSeasonStats && typeof aiSeasonStats.apps === "number"
        ? aiSeasonStats
        : profile.seasonStats,
      pastSeasonStats: hasRealStats
        ? profile.pastSeasonStats
        : aiPastSeasons.length
        ? aiPastSeasons
        : profile.pastSeasonStats,
      statsSource: hasRealStats ? "thesportsdb" : "ai-estimate",
      overall:
        typeof ai.overall === "number" && ai.overall > 0
          ? Math.round(ai.overall)
          : Math.round(
              Object.values(ratings).reduce((a, b) => a + b, 0) /
                Object.values(ratings).length
            ),
      hidden_gem: Boolean(ai.hidden_gem),
      ratings,
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
          : `Solid ${profile.position} profile. Market value reflects current form and age.`,
      ytLink: yt.url,
      ytTitle: yt.title,
      ytThumb: yt.thumb,
      hasHighlight: !!yt.url,
      isRealPlayer: !!realPlayer,
      aiGenerated: Object.keys(ai).length > 0,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}

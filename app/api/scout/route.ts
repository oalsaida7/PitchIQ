import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

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
  strSigning?: string;
  strNumber?: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { default: { url: string } };
  };
}

async function fetchYouTubeHighlight(
  playerName: string
): Promise<{ url: string | null; title: string | null; thumb: string | null }> {
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) return { url: null, title: null, thumb: null };

  try {
    const q = encodeURIComponent(`${playerName} football highlights`);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${q}&type=video&key=${ytKey}&videoEmbeddable=true&relevanceLanguage=en`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return { url: null, title: null, thumb: null };

    const data = await res.json();
    const items: YouTubeSearchItem[] = data.items || [];
    const best =
      items.find(
        (it) =>
          it.snippet.title.toLowerCase().includes("highlight") ||
          it.snippet.title.toLowerCase().includes("skill") ||
          it.snippet.title.toLowerCase().includes("goals")
      ) || items[0];

    if (!best?.id?.videoId) return { url: null, title: null, thumb: null };

    return {
      url: `https://www.youtube.com/watch?v=${best.id.videoId}`,
      title: best.snippet.title,
      thumb: best.snippet.thumbnails?.default?.url || null,
    };
  } catch {
    return { url: null, title: null, thumb: null };
  }
}

async function askHaikuJSON(prompt: string): Promise<Record<string, unknown>> {
  const msg = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });
  const rawText = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");
  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const apiKey = process.env.THESPORTSDB_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Data service unavailable" }, { status: 503 });
    }

    const dbRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(name)}`,
      { next: { revalidate: 300 } }
    );
    if (!dbRes.ok) {
      return NextResponse.json({ error: "Player lookup failed" }, { status: 502 });
    }

    const dbData = await dbRes.json();
    const realPlayer: TSDBPlayer | null = dbData.player?.[0] ?? null;
    const playerLabel = realPlayer?.strPlayer || name.trim();

    let ytLink: string | null = null;
    let ytTitle: string | null = null;
    let ytThumb: string | null = null;

    try {
      const ytResult = await fetchYouTubeHighlight(playerLabel);
      ytLink = ytResult.url;
      ytTitle = ytResult.title;
      ytThumb = ytResult.thumb;
    } catch {
      ytLink = null;
      ytTitle = null;
      ytThumb = null;
    }

    const report = await askHaikuJSON(`You are an elite global football scout. You must scout: ${name}.

Here is their verified database profile (use this for current club, position, nationality — do not contradict it):
${JSON.stringify(realPlayer || {})}

Based on this real profile plus your deep football knowledge, produce a scouting report.
Respond ONLY with a raw valid JSON object. No markdown. No backticks. No explanation outside the JSON.
Schema:
{
  "name": "string — exact name from DB profile",
  "club": "string — current club from DB or best known",
  "league": "string",
  "nationality": "string — from DB",
  "position": "string — from DB",
  "age": number,
  "overall": number between 60-99,
  "hidden_gem": boolean,
  "ratings": {
    "pace": number,
    "technical": number,
    "physical": number,
    "mental": number,
    "defending": number,
    "shooting": number
  },
  "seasonStats": {
    "goals": number,
    "assists": number,
    "apps": number,
    "avgRating": number
  },
  "pastSeasonStats": [
    {"year": "2024/25", "club": "string", "goals": number, "assists": number, "apps": number},
    {"year": "2023/24", "club": "string", "goals": number, "assists": number, "apps": number}
  ],
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "style": "2-sentence description of playing style",
  "verdict": "2-sentence scout verdict on potential and market value"
}`);

    report.ytLink = ytLink;
    report.ytTitle = ytTitle;
    report.ytThumb = ytThumb;
    report.hasHighlight = !!ytLink;

    if (realPlayer?.strThumb) report.playerThumb = realPlayer.strThumb;
    if (realPlayer?.strCutout) report.playerCutout = realPlayer.strCutout;

    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CLAUDE_MODEL, fetchJsonSafe, tsdbBase } from "@/lib/tsdb";

const client = new Anthropic();

interface TSDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strSport?: string;
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
  strFoot?: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { default: { url: string } };
  };
}

function calcAge(dateBorn: string | undefined): number | null {
  if (!dateBorn) return null;
  const birth = new Date(dateBorn);
  if (isNaN(birth.getTime())) return null;
  return new Date().getFullYear() - birth.getFullYear();
}

function buildPlayerProfile(player: TSDBPlayer | null, query: string) {
  return {
    name: player?.strPlayer || query,
    club: player?.strTeam || "—",
    league: "",
    nationality: player?.strNationality || "—",
    position: player?.strPosition || "—",
    age: calcAge(player?.dateBorn),
    height: player?.strHeight || "—",
    weight: player?.strWeight || "—",
    preferredFoot: player?.strFoot || "—",
    number: player?.strNumber || "—",
    birthLocation: player?.strBirthLocation || "—",
    playerThumb: player?.strThumb || "",
    playerCutout: player?.strCutout || "",
  };
}

async function fetchYouTubeHighlight(
  playerName: string
): Promise<{ url: string | null; title: string | null; thumb: string | null }> {
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
    const items: YouTubeSearchItem[] = data.items || [];
    const best =
      items.find((it) =>
        /highlight|skill|goal/i.test(it.snippet.title)
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

async function askHaikuAnalysis(
  playerLabel: string,
  profile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are an elite football scout analyzing ${playerLabel}.
Use ONLY this verified profile for factual fields — do not contradict it:
${JSON.stringify(profile)}

Return ONLY subjective scouting analysis as raw JSON. No markdown. No backticks.
{"overall":number,"hidden_gem":boolean,"ratings":{"pace":number,"technical":number,"physical":number,"mental":number,"defending":number,"shooting":number},"seasonStats":{"goals":number,"assists":number,"apps":number,"avgRating":number},"pastSeasonStats":[{"year":"2024/25","club":"string","goals":number,"assists":number,"apps":number},{"year":"2023/24","club":"string","goals":number,"assists":number,"apps":number}],"strengths":["string","string","string"],"weaknesses":["string","string"],"style":"2 sentences","verdict":"2 sentences"}`,
        },
      ],
    });
    clearTimeout(timer);

    const rawText = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Scout AI overlay error:", err);
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
    const data = await fetchJsonSafe(
      `${tsdbBase()}/searchplayers.php?p=${encodeURIComponent(query)}`
    );
    const players = (data.player as TSDBPlayer[]) || [];
    const realPlayer = players.find((p) =>
      /soccer|football/i.test(String(p.strSport || "soccer"))
    ) || players[0] || null;

    const profile = buildPlayerProfile(realPlayer, query);

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
      ytTitle = null;
      ytThumb = null;
    }

    const aiOverlay = await askHaikuAnalysis(profile.name, profile);

    const report = {
      ...profile,
      ...aiOverlay,
      name: profile.name,
      club: aiOverlay.club || profile.club,
      nationality: profile.nationality,
      position: profile.position,
      age: aiOverlay.age ?? profile.age,
      ytLink,
      ytTitle,
      ytThumb,
      hasHighlight: !!ytLink,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}

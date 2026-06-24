import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    // 1. Fetch Real Player Profile from your paid TheSportsDB API
    const sportsDbKey = process.env.THESPORTSDB_KEY;
    const dbRes = await fetch(`https://www.thesportsdb.com/api/v1/json/${sportsDbKey}/searchplayers.php?p=${encodeURIComponent(name)}`);
    const dbData = await dbRes.json();
    
    // Extract the verified data if the player exists in the database
    const realPlayerContext = dbData.player && dbData.player.length > 0 
      ? dbData.player[0] 
      : null;

    // 2. Fetch Direct Highlight Video from YouTube API
    let directYtLink = null;
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(name + " football skills highlights")}&type=video&key=${process.env.YOUTUBE_API_KEY}`);
        const ytData = await ytRes.json();
        
        // If a video is found, construct the direct watch URL
        if (ytData.items && ytData.items.length > 0) {
          directYtLink = `https://www.youtube.com/watch?v=${ytData.items[0].id.videoId}`;
        }
      } catch (e) {
        console.error("YouTube API error:", e);
      }
    }

    // 3. Build the LLM Prompt grounded in real data
    const prompt = `Act as an elite global football scout. Scout the player: ${name}.
    Here is their verified real-time database profile for context (use this for their current club, position, and nationality):
    ${JSON.stringify(realPlayerContext)}
    
    Based on this database profile and your deep historic knowledge, respond ONLY in a raw, valid JSON block with these exact keys. Do not use markdown wrappers:
    {
      "name": "Full Name",
      "club": "Current Club",
      "league": "League Name",
      "nationality": "Nationality",
      "position": "Position",
      "age": 25,
      "overall": 82,
      "hidden_gem": false,
      "ratings": {"pace": 80, "technical": 83, "physical": 70, "mental": 78, "defending": 45, "shooting": 81},
      "seasonStats": {"goals": 14, "assists": 7, "apps": 28, "avgRating": 7.4},
      "pastSeasonStats": [
        {"year": "2024/25", "club": "Club", "goals": 19, "assists": 11, "apps": 34},
        {"year": "2023/24", "club": "Club", "goals": 11, "assists": 5, "apps": 30}
      ],
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1"],
      "style": "Description.",
      "verdict": "Verdict text."
    }`;

    // 4. Call Claude Haiku (Cheaper, Faster, Great at JSON)
    const message = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON fail");
    const report = JSON.parse(jsonMatch[0]);

    // 5. Inject our verified direct YouTube link into the final report
    report.ytLink = directYtLink;
    report.hasHighlight = !!directYtLink;

    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}
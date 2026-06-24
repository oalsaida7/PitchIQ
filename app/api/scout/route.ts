import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const prompt = `Act as an elite global football scout with knowledge of all leagues worldwide including lower leagues. Scout the player: ${name}. Include hidden gem status if they're underrated or from a smaller league.Respond ONLY in valid JSON no backticks no markdown:{"name":"Full Name","club":"Current Club","league":"Their League","nationality":"Nationality","position":"Position","age":24,"overall":84,"hidden_gem":false,"ratings":{"pace":85,"technical":83,"physical":74,"mental":80,"defending":42,"shooting":76},"seasonStats":{"goals":18,"assists":9,"apps":32,"avgRating":7.6},"strengths":["Strength 1","Strength 2","Strength 3"],"weaknesses":["Weakness 1","Weakness 2"],"style":"Two-sentence playing style description.","verdict":"Two-sentence scout verdict on potential and value.","ytQuery":"${name} football skills highlights 2025"}`;
    
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const report = JSON.parse(raw);
    report.ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(report.ytQuery || report.name + " football highlights")}`;
    
    return NextResponse.json({ report });
  } catch (err) {
    console.error("scout error:", err);
    return NextResponse.json({ error: "Scout engine error" }, { status: 500 });
  }
}
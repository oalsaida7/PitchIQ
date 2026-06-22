import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const prompt = `Elite global football scout. Scouting report for: ${name}. Include lower-league and hidden gem players with full detail.
Respond ONLY valid JSON no backticks:
{"name":"Full Name","position":"Position","club":"Current Club","league":"Their League","nationality":"Nationality","age":24,"hidden_gem":false,"overall":84,"ratings":{"pace":85,"technical":83,"physical":74,"mental":80,"defending":42,"shooting":76},"seasonStats":{"goals":18,"assists":9,"apps":32,"avgRating":7.6},"strengths":["Strength 1","Strength 2","Strength 3"],"weaknesses":["Weakness 1","Weakness 2"],"style":"Two-sentence playing style description.","verdict":"Two-sentence scout verdict on potential and value.","ytQuery":"${name} football skills highlights 2025"}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("").replace(/```json|```/g, "").trim();
    return NextResponse.json({ report: JSON.parse(raw) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Scout request failed" }, { status: 500 });
  }
}
